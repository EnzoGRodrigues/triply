import type { Metadata } from "next";
import { NewTripView } from "@/components/NewTripView";

export const metadata: Metadata = { title: "Nova viagem" };

export default function NewTripPage() {
  return <NewTripView />;
}
