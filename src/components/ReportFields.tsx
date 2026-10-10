"use client";

import { useState, type FormEvent } from "react";
import { Briefcase, Heart, House, UserRound, Users } from "lucide-react";
import { COMPANION_OPTIONS } from "@/lib/format";
import type { Companions, TripReportInput } from "@/types/api";
import { Chip } from "./ui/Chip";
import { MoneyField } from "./ui/MoneyField";
import { StarRating } from "./ui/StarRating";
import { Textarea } from "./ui/Textarea";

const COMPANION_ICONS: Record<Companions, typeof Users> = {
  sozinho: UserRound,
  casal: Heart,
  familia: House,
  amigos: Users,
  trabalho: Briefcase,
};

interface ReportFieldsProps {
  /** `id` do <form> — o botão "Salvar" do rodapé do diálogo o dispara via atributo `form`. */
  formId: string;
  initial?: TripReportInput;
  onSubmit: (report: TripReportInput) => void;
}

/** Campos do relato: avaliação, companhia, gastos (R$) e "Minha experiência". */
export function ReportFields({ formId, initial, onSubmit }: ReportFieldsProps) {
  const [rating, setRating] = useState<number | null>(initial?.rating ?? null);
  const [companions, setCompanions] = useState<Companions | null>(initial?.companions ?? null);
  const [expenses, setExpenses] = useState<number | null>(initial?.expenses ?? null);
  const [experience, setExperience] = useState(initial?.experience ?? "");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onSubmit({
      rating,
      companions,
      expenses,
      experience: experience.trim() || null,
    });
  }

  return (
    <form id={formId} onSubmit={handleSubmit} className="space-y-5 pb-1">
      <StarRating label="Como você avalia a viagem?" value={rating} onChange={setRating} size={34} />

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-text">Com quem você foi?</legend>
        <div className="flex flex-wrap gap-2">
          {COMPANION_OPTIONS.map((option) => {
            const Icon = COMPANION_ICONS[option.value];
            return (
              <Chip
                key={option.value}
                selected={companions === option.value}
                onClick={() => setCompanions((c) => (c === option.value ? null : option.value))}
                icon={<Icon aria-hidden />}
              >
                {option.label}
              </Chip>
            );
          })}
        </div>
      </fieldset>

      <MoneyField label="Gastos" value={expenses} onChange={setExpenses} hint="Total gasto na viagem, em reais." />

      <Textarea
        label="Minha experiência"
        value={experience}
        onChange={setExperience}
        rows={4}
        maxLength={4000}
        placeholder="Conte como foi, o que mais marcou…"
      />
    </form>
  );
}
