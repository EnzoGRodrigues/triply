import type { ReactNode } from "react";
import { ArrowDown, ArrowRight, Cloud, Cog, Database, Monitor, Waypoints } from "lucide-react";
import { cn } from "@/lib/cn";

interface LayerProps {
  step?: string;
  icon: ReactNode;
  title: string;
  subtitle: string;
  items: string[];
  tone?: "primary" | "plain";
  className?: string;
}

function Layer({ step, icon, title, subtitle, items, tone = "plain", className }: LayerProps) {
  const primary = tone === "primary";
  return (
    <div
      className={cn(
        "flex flex-col rounded-2xl p-5 shadow-card",
        primary ? "bg-primary text-white" : "bg-surface text-text",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "grid size-10 shrink-0 place-items-center rounded-xl [&_svg]:size-5",
            primary ? "bg-white/15" : "bg-primary-soft text-primary",
          )}
        >
          {icon}
        </span>
        <div className="min-w-0">
          {step ? (
            <p
              className={cn(
                "text-[0.65rem] font-bold uppercase tracking-widest",
                primary ? "text-white/70" : "text-primary",
              )}
            >
              {step}
            </p>
          ) : null}
          <h3 className="font-display text-lg font-medium leading-tight">{title}</h3>
        </div>
      </div>
      <p className={cn("mt-3 text-sm font-medium", primary ? "text-white/90" : "text-text-muted")}>
        {subtitle}
      </p>
      <ul className={cn("mt-2 space-y-1 text-sm", primary ? "text-white/80" : "text-text-muted")}>
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-current opacity-60" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Connector({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-1 text-primary lg:flex-col lg:py-0" aria-hidden>
      <ArrowDown className="size-6 lg:hidden" />
      <ArrowRight className="hidden size-6 lg:block" />
      <span className="text-[0.65rem] font-medium uppercase tracking-wide text-text-muted lg:max-w-16 lg:text-center">
        {label}
      </span>
    </div>
  );
}

/** Diagrama: Front React → API REST própria → serviços → banco + APIs externas. */
export function ArchitectureDiagram() {
  return (
    <figure>
      <div
        role="img"
        aria-label="Arquitetura: o front-end React chama a API REST própria em /api, que usa serviços do servidor; os serviços acessam o banco em memória por repositórios (PostgreSQL na parte 2) e consultam as APIs externas."
        className="grid gap-1 lg:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1.1fr] lg:items-center lg:gap-3"
      >
        <Layer
          step="1 · Navegador"
          tone="primary"
          icon={<Monitor />}
          title="Front-end React"
          subtitle="Next.js 16 · React 19"
          items={[
            "Telas, formulários e componentes",
            "api-client tipado (fetch same-origin)",
            "Tailwind v4 · Material 3",
          ]}
          className="h-full"
        />
        <Connector label="HTTPS · JSON" />
        <Layer
          step="2 · Servidor"
          icon={<Waypoints />}
          title="API REST própria"
          subtitle="Route Handlers em /api/*"
          items={["Contrato de tipos compartilhado", "Validação com Zod", "Sessão: cookie httpOnly com JWT"]}
          className="h-full"
        />
        <Connector label="chama" />
        <Layer
          step="3 · Servidor"
          icon={<Cog />}
          title="Serviços"
          subtitle="Regras de negócio (src/server)"
          items={[
            "auth · trips · destinations",
            "Enriquecimento automático da viagem",
            "Cache, timeout e fallback",
          ]}
          className="h-full"
        />
        <Connector label="consulta" />
        <div className="flex flex-col gap-3">
          <Layer
            step="4a · Dados"
            icon={<Database />}
            title="Banco em memória"
            subtitle="Repositórios · PostgreSQL na parte 2"
            items={["users e trips", "Volta ao estado inicial ao reiniciar"]}
          />
          <Layer
            step="4b · Externo"
            icon={<Cloud />}
            title="APIs externas"
            subtitle="Dados consultados só pelo back-end"
            items={["Open-Meteo · AwesomeAPI", "ExchangeRate-API · Frankfurter", "Wikipédia / Commons"]}
          />
        </div>
      </div>
      <figcaption className="mt-4 text-center text-sm text-text-muted">
        Os dados das APIs externas passam sempre pela API própria, que cuida de cache, timeout e falhas. Só as
        imagens (Wikimedia) e as bandeiras (FlagCDN) são carregadas direto pelo navegador, a partir das URLs
        que o back devolve.
      </figcaption>
    </figure>
  );
}
