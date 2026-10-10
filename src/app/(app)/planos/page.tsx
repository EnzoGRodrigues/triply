import type { Metadata } from "next";
import { PlansView } from "@/components/PlansView";

export const metadata: Metadata = { title: "Planos de viagem" };

export default function PlansPage() {
  return <PlansView />;
}
