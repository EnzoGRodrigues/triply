import { Suspense } from "react";
import type { Metadata } from "next";
import { TripDetail } from "@/components/TripDetail";
import { Skeleton } from "@/components/ui/Skeleton";

export const metadata: Metadata = { title: "Detalhe da viagem" };

export default function TripDetailPage({ params }: PageProps<"/viagens/[id]">) {
  return (
    <Suspense fallback={<Skeleton className="h-[30rem] rounded-2xl" />}>
      <TripDetailContent params={params} />
    </Suspense>
  );
}

async function TripDetailContent({ params }: { params: PageProps<"/viagens/[id]">["params"] }) {
  const { id } = await params;
  return <TripDetail id={id} />;
}
