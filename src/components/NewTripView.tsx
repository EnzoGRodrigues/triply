"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createTrip } from "@/lib/api-client";
import type { TripInput } from "@/types/api";
import { TripForm } from "./TripForm";
import { BackLink } from "./ui/BackLink";
import { PageHeader } from "./ui/PageHeader";

/** Tela "Planeje sua nova viagem". */
export function NewTripView() {
  const router = useRouter();
  // Com Cache Components a rota fica "viva" em segundo plano: trocar a key zera o formulário.
  const [formKey, setFormKey] = useState(0);

  async function handleSubmit(input: TripInput) {
    await createTrip(input);
    toast.success("Plano de viagem criado!");
    setFormKey((k) => k + 1);
    router.push("/planos");
  }

  return (
    <div className="space-y-6">
      <BackLink href="/planos" label="Planos de viagem" />
      <PageHeader title="Planeje sua nova viagem" />
      <TripForm key={formKey} onSubmit={handleSubmit} />
    </div>
  );
}
