import { Bus, Car, Plane } from "lucide-react";
import type { Transport } from "@/types/api";

const ICONS = { aviao: Plane, carro: Car, onibus: Bus } as const;

/** Ícone do meio de transporte (avião, carro, ônibus). */
export function TransportIcon({ transport, className }: { transport: Transport; className?: string }) {
  const Icon = ICONS[transport];
  return <Icon className={className} aria-hidden />;
}
