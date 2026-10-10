import { Lock, LockOpen } from "lucide-react";
import { ENDPOINTS } from "@/lib/about-data";
import { MethodBadge } from "./MethodBadge";

/** Tabela de endpoints (desktop) / lista de cartões (celular). */
export function EndpointsTable() {
  return (
    <>
      <div className="hidden overflow-hidden rounded-2xl bg-surface shadow-card md:block">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Endpoints da API REST do Triply</caption>
          <thead className="bg-primary-faint text-xs uppercase tracking-wide text-text-muted">
            <tr>
              <th scope="col" className="px-5 py-3 font-medium">
                Método
              </th>
              <th scope="col" className="px-5 py-3 font-medium">
                Rota
              </th>
              <th scope="col" className="px-5 py-3 font-medium">
                Descrição
              </th>
              <th scope="col" className="px-5 py-3 font-medium">
                Acesso
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/50">
            {ENDPOINTS.map((e) => (
              <tr key={`${e.method} ${e.path}`} className="transition-colors hover:bg-primary-faint/60">
                <td className="px-5 py-3">
                  <MethodBadge method={e.method} />
                </td>
                <td className="px-5 py-3 font-mono text-[0.8rem] text-text">{e.path}</td>
                <td className="px-5 py-3 text-text-muted">{e.description}</td>
                <td className="px-5 py-3">
                  <span className="inline-flex items-center gap-1.5 text-xs text-text-muted">
                    {e.auth ? <Lock className="size-3.5" aria-hidden /> : <LockOpen className="size-3.5" aria-hidden />}
                    {e.auth ? "Sessão" : "Pública"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="space-y-3 md:hidden">
        {ENDPOINTS.map((e) => (
          <li key={`${e.method} ${e.path}`} className="rounded-xl bg-surface p-4 shadow-card">
            <div className="flex items-center justify-between gap-3">
              <MethodBadge method={e.method} />
              <span className="inline-flex items-center gap-1.5 text-xs text-text-muted">
                {e.auth ? <Lock className="size-3.5" aria-hidden /> : <LockOpen className="size-3.5" aria-hidden />}
                {e.auth ? "Sessão" : "Pública"}
              </span>
            </div>
            <p className="mt-2 break-all font-mono text-[0.8rem] text-text">{e.path}</p>
            <p className="mt-1 text-sm text-text-muted">{e.description}</p>
          </li>
        ))}
      </ul>
    </>
  );
}
