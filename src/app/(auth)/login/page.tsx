import { Suspense } from "react";
import type { Metadata } from "next";
import { LoginForm } from "@/components/LoginForm";

export const metadata: Metadata = { title: "Entrar" };

export default function LoginPage() {
  return (
    // `useSearchParams` (destino pós-login) exige Suspense com Cache Components.
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
