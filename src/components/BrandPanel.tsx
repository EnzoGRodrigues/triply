import { Compass, NotebookPen, Plane, Sparkles } from "lucide-react";
import { Logo } from "./Logo";

const FEATURES = [
  { icon: Compass, text: "Planeje destinos com moeda, clima e fotos sugeridos automaticamente." },
  { icon: NotebookPen, text: "Registre como foi: estrelas, companhia, gastos e a sua experiência." },
  { icon: Sparkles, text: "Veja no perfil quantas cidades e países você já conheceu." },
];

const DESTINATIONS = [
  { name: "Maragogi - Alagoas", gradient: "from-[#7fe0d4] via-[#9ad9ee] to-[#f2e3b8]", className: "left-0 top-0 -rotate-3" },
  { name: "Indonésia", gradient: "from-[#b6e3a8] via-[#d9e8b0] to-[#f5cf9a]", className: "left-14 top-[5.25rem] rotate-2" },
  { name: "Espanha", gradient: "from-[#a9c8f5] via-[#d6d9f2] to-[#f7d4c0]", className: "left-4 top-[10.5rem] -rotate-1" },
];

/** Painel de marca das telas de login/cadastro (somente desktop). */
export function BrandPanel() {
  return (
    <aside className="relative isolate hidden overflow-hidden bg-primary text-white lg:flex lg:flex-col lg:justify-between lg:p-14 xl:p-16">
      {/* Fundo: brilhos e malha pontilhada */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[radial-gradient(60rem_40rem_at_100%_0%,#6a4dff_0%,transparent_60%),radial-gradient(40rem_30rem_at_0%_100%,#1f00b3_0%,transparent_70%)]"
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-[0.18] [background-image:radial-gradient(#fff_1px,transparent_1px)] [background-size:26px_26px] [mask-image:linear-gradient(160deg,black,transparent_70%)]"
      />

      <Logo tone="white" className="text-5xl xl:text-6xl" />

      <div className="relative">
        <h2 className="max-w-md text-balance font-display text-3xl font-light leading-tight xl:text-4xl">
          Planeje, viva e registre suas viagens.
        </h2>
        <ul className="mt-8 max-w-md space-y-4">
          {FEATURES.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-start gap-3 text-white/90">
              <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-white/15">
                <Icon className="size-[18px]" aria-hidden />
              </span>
              <span className="pt-1 text-[0.95rem] leading-snug">{text}</span>
            </li>
          ))}
        </ul>

        {/* Colagem decorativa de cartões de destino */}
        <div aria-hidden className="relative mt-12 hidden h-60 xl:block">
          <svg
            viewBox="0 0 360 240"
            fill="none"
            className="absolute -right-2 top-0 h-60 w-[22rem] text-white/60"
          >
            <path
              d="M10 210C80 200 90 120 170 125s90 -80 170 -95"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray="2 9"
              strokeLinecap="round"
            />
            <circle cx="340" cy="30" r="9" fill="#fff" />
            <circle cx="340" cy="30" r="3.5" fill="#3300ff" />
          </svg>
          <Plane
            className="absolute right-12 top-3 size-9 rotate-[18deg] text-white drop-shadow-lg motion-safe:animate-[rise_900ms_ease-out_both]"
            strokeWidth={1.6}
          />
          {DESTINATIONS.map((d) => (
            <div
              key={d.name}
              className={`absolute flex h-[4.25rem] w-72 items-center overflow-hidden rounded-card bg-gradient-to-br px-5 shadow-xl shadow-black/20 ${d.gradient} ${d.className}`}
            >
              <div className="absolute inset-0 bg-white/40" />
              <span className="relative font-display text-xl text-text">{d.name}</span>
            </div>
          ))}
        </div>
      </div>

      <p className="text-sm text-white/65">Trabalho da disciplina DSW3 · Desenvolvimento Web 3</p>
    </aside>
  );
}
