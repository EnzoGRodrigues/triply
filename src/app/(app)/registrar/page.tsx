import type { Metadata } from "next";
import { RegisterTripsView } from "@/components/RegisterTripsView";

export const metadata: Metadata = { title: "Registrar viagem" };

export default function RegisterTripsPage() {
  return <RegisterTripsView />;
}
