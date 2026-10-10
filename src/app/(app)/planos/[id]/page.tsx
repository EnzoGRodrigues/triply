import { Suspense } from "react";
import type { Metadata } from "next";
import { EditTripView } from "@/components/EditTripView";
import { Skeleton } from "@/components/ui/Skeleton";

export const metadata: Metadata = { title: "Editar plano" };

export default function EditTripPage({ params }: PageProps<"/planos/[id]">) {
  return (
    // `params` é dado de requisição: precisa ser lido dentro de Suspense (Cache Components).
    <Suspense fallback={<Skeleton className="h-[34rem] rounded-2xl" />}>
      <EditTripContent params={params} />
    </Suspense>
  );
}

async function EditTripContent({ params }: { params: PageProps<"/planos/[id]">["params"] }) {
  const { id } = await params;
  return <EditTripView id={id} />;
}
