import { EXTERNAL_APIS } from "@/lib/about-data";
import { ExternalSource } from "./ExternalSource";

/** Tabela das APIs externas consumidas pelo back-end (desktop) / cartões (celular). */
export function ExternalApisTable() {
  return (
    <>
      <div className="hidden overflow-hidden rounded-2xl bg-surface shadow-card md:block">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">APIs externas consumidas pelo back-end</caption>
          <thead className="bg-primary-faint text-xs uppercase tracking-wide text-text-muted">
            <tr>
              <th scope="col" className="px-5 py-3 font-medium">
                Serviço
              </th>
              <th scope="col" className="px-5 py-3 font-medium">
                Para quê
              </th>
              <th scope="col" className="px-5 py-3 font-medium">
                Endpoint
              </th>
              <th scope="col" className="px-5 py-3 font-medium">
                Cache
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/50">
            {EXTERNAL_APIS.map((api) => (
              <tr key={api.name} className="align-top transition-colors hover:bg-primary-faint/60">
                <td className="whitespace-nowrap px-5 py-3 font-medium">
                  <ExternalSource name={api.name} href={api.href} />
                </td>
                <td className="px-5 py-3 text-text-muted">{api.purpose}</td>
                <td className="break-all px-5 py-3 font-mono text-xs text-text">{api.endpoint}</td>
                <td className="whitespace-nowrap px-5 py-3 text-text-muted">{api.cache}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="space-y-3 md:hidden">
        {EXTERNAL_APIS.map((api) => (
          <li key={api.name} className="rounded-xl bg-surface p-4 shadow-card">
            <p className="font-medium">
              <ExternalSource name={api.name} href={api.href} />
            </p>
            <p className="mt-1 text-sm text-text-muted">{api.purpose}</p>
            <p className="mt-2 break-all font-mono text-xs text-text">{api.endpoint}</p>
            <p className="mt-1 text-xs text-text-muted">Cache: {api.cache}</p>
          </li>
        ))}
      </ul>
    </>
  );
}
