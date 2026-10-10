import { redirect } from "next/navigation";

/** `/` → perfil. Visitantes sem sessão são levados ao /login pelo proxy (rota protegida). */
export default function Home() {
  redirect("/perfil");
}
