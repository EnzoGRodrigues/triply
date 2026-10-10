"use client";

import { useEffect, useId, useState, type FocusEvent, type KeyboardEvent } from "react";
import { LoaderCircle, MapPin, SearchX, TriangleAlert } from "lucide-react";
import { isAbortError, searchDestinations } from "@/lib/api-client";
import { cn } from "@/lib/cn";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import type { DestinationResult } from "@/types/api";
import { TextField } from "./ui/TextField";

interface DestinationAutocompleteProps {
  /** Texto do destino (digitado ou escolhido). */
  value: string;
  /** Digitação livre — o pai deve descartar a geolocalização antiga. */
  onChange: (text: string) => void;
  /** Sugestão escolhida na lista. */
  onSelect: (result: DestinationResult) => void;
  error?: string;
  label?: string;
  id?: string;
}

interface Fetched {
  q: string;
  status: "ready" | "error";
  results: DestinationResult[];
}

const MIN_CHARS = 2;

/**
 * Campo de destino com autocomplete (padrão ARIA combobox 1.2).
 * Debounce de 300 ms em `/api/destinations/search`; setas, Enter e Esc funcionam.
 */
export function DestinationAutocomplete({
  value,
  onChange,
  onSelect,
  error,
  label = "Destino",
  id,
}: DestinationAutocompleteProps) {
  const uid = useId();
  const inputId = id ?? `${uid}-input`;
  const listId = `${uid}-list`;

  const [typed, setTyped] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [fetched, setFetched] = useState<Fetched | null>(null);

  const query = value.trim();
  const debouncedQuery = useDebouncedValue(query, 300);
  const searchEnabled = typed && debouncedQuery.length >= MIN_CHARS;

  useEffect(() => {
    if (!searchEnabled) return;
    const controller = new AbortController();
    searchDestinations(debouncedQuery, controller.signal).then(
      (res) => setFetched({ q: debouncedQuery, status: "ready", results: res.results }),
      (err: unknown) => {
        if (!isAbortError(err)) setFetched({ q: debouncedQuery, status: "error", results: [] });
      },
    );
    return () => controller.abort();
  }, [searchEnabled, debouncedQuery]);

  const settled = fetched && fetched.q === query ? fetched : null;
  const results = settled?.results ?? [];
  const loading = typed && query.length >= MIN_CHARS && !settled;
  const showList = open && typed && query.length >= MIN_CHARS;
  const active = activeIndex >= 0 && activeIndex < results.length ? activeIndex : -1;
  const optionId = (index: number) => `${uid}-opt-${index}`;

  function choose(result: DestinationResult) {
    onSelect(result);
    setTyped(false);
    setOpen(false);
    setActiveIndex(-1);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!showList) setOpen(true);
      if (results.length) setActiveIndex((i) => (i + 1) % results.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (results.length) setActiveIndex((i) => (i <= 0 ? results.length - 1 : i - 1));
    } else if (event.key === "Enter" && showList && active >= 0) {
      event.preventDefault();
      choose(results[active]);
    } else if (event.key === "Escape" && showList) {
      event.preventDefault();
      setOpen(false);
    }
  }

  function handleBlur(event: FocusEvent<HTMLDivElement>) {
    if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
  }

  let status: string;
  if (!showList) status = "";
  else if (loading) status = "Buscando destinos";
  else if (settled?.status === "error") status = "Não foi possível buscar destinos agora";
  else if (results.length === 0) status = "Nenhum destino encontrado";
  else status = `${results.length} ${results.length === 1 ? "sugestão disponível" : "sugestões disponíveis"}`;

  return (
    <div className="relative" onBlur={handleBlur}>
      <TextField
        id={inputId}
        label={label}
        value={value}
        onChange={(text) => {
          onChange(text);
          setTyped(true);
          setOpen(true);
          setActiveIndex(-1);
        }}
        onClear={() => {
          onChange("");
          setTyped(false);
          setOpen(false);
        }}
        onFocus={() => {
          if (typed && query.length >= MIN_CHARS) setOpen(true);
        }}
        onKeyDown={handleKeyDown}
        error={error}
        placeholder="Cidade, estado ou país"
        autoComplete="off"
        spellCheck={false}
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList && active >= 0 ? optionId(active) : undefined}
      />

      <p className="sr-only" role="status" aria-live="polite">
        {status}
      </p>

      {showList ? (
        <ul
          id={listId}
          role="listbox"
          aria-label="Sugestões de destino"
          className="scrollbar-thin absolute left-0 right-0 top-full z-20 mt-1 max-h-72 animate-rise overflow-auto rounded-xl border border-line/60 bg-surface py-1.5 shadow-xl"
        >
          {loading ? (
            <li role="presentation" className="flex items-center gap-2.5 px-4 py-3 text-sm text-text-muted">
              <LoaderCircle className="size-4 animate-spin" aria-hidden /> Buscando destinos…
            </li>
          ) : settled?.status === "error" ? (
            <li role="presentation" className="flex items-center gap-2.5 px-4 py-3 text-sm text-danger-text">
              <TriangleAlert className="size-4 shrink-0" aria-hidden /> Não foi possível buscar agora. Continue digitando
              ou tente de novo.
            </li>
          ) : results.length === 0 ? (
            <li role="presentation" className="flex items-center gap-2.5 px-4 py-3 text-sm text-text-muted">
              <SearchX className="size-4 shrink-0" aria-hidden /> Nenhum destino encontrado para “{query}”.
            </li>
          ) : (
            results.map((result, index) => {
              const detail = [result.region, result.country].filter(Boolean).join(", ");
              return (
                <li
                  key={result.id}
                  id={optionId(index)}
                  role="option"
                  aria-selected={index === active}
                  // Evita que o input perca o foco antes do clique registrar.
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => choose(result)}
                  onMouseMove={() => setActiveIndex(index)}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 px-4 py-2.5 transition-colors",
                    index === active ? "bg-primary-faint" : "hover:bg-primary-faint/60",
                  )}
                >
                  <MapPin className="size-[18px] shrink-0 text-primary" aria-hidden />
                  <span className="min-w-0">
                    <span className="block truncate text-[0.95rem] font-medium text-text">{result.name}</span>
                    {detail ? <span className="block truncate text-xs text-text-muted">{detail}</span> : null}
                  </span>
                </li>
              );
            })
          )}
        </ul>
      ) : null}
    </div>
  );
}
