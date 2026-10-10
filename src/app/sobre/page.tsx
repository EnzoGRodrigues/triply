import type { ReactNode } from "react";
import type { Metadata } from "next";
import { BookOpen, Cloud, Code2, FileJson, Layers, Rocket, ShieldCheck } from "lucide-react";
import { ArchitectureDiagram } from "@/components/ArchitectureDiagram";
import { EndpointsTable } from "@/components/EndpointsTable";
import { ExternalApisTable } from "@/components/ExternalApisTable";
import { ExternalSource } from "@/components/ExternalSource";
import { PublicHeader } from "@/components/PublicHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { PROTECTIONS, STACK } from "@/lib/about-data";

export const metadata: Metadata = {
  title: "Sobre o projeto",
  description:
    "Arquitetura do Triply: front React, API REST própria, serviços, banco em memória e as APIs externas consumidas.",
};

interface SectionProps {
  id: string;
  eyebrow: string;
  title: string;
  intro?: ReactNode;
  children: ReactNode;
}

function Section({ id, eyebrow, title, intro, children }: SectionProps) {
  return (
    <section aria-labelledby={id} className="scroll-mt-24">
      <p className="text-xs font-bold uppercase tracking-widest text-primary/70">{eyebrow}</p>
      <h2 id={id} className="mt-1 font-display text-2xl font-normal text-primary sm:text-3xl">
        {title}
      </h2>
      {intro ? <p className="mt-2 max-w-3xl text-pretty text-text-muted">{intro}</p> : null}
      <div className="mt-6">{children}</div>
    </section>
  );
}

const REQUIREMENTS = [
  {
    icon: Code2,
    title: "APIs próprias",
    text: "O front só conversa com a API REST do próprio projeto (/api/*), em JSON, com erros padronizados.",
  },
  {
    icon: Cloud,
    title: "Consumo de API externa",
    text: "O back-end consome 6 provedores gratuitos (clima, câmbio, geocodificação, imagens) e expõe os dados por rotas próprias.",
  },
  {
    icon: Rocket,
    title: "Hospedagem na Vercel",
    text: "Deploy na Vercel. Na parte 1 os dados ficam em memória no servidor: voltam ao estado inicial quando ele reinicia e, na Vercel, cada instância tem a sua própria memória. Na parte 2 entra o PostgreSQL.",
  },
] as const;

const FLOW = [
  {
    title: "Digita o destino",
    text: "Depois de ~300 ms sem digitar, o front chama GET /api/destinations/search. O back consulta o Open-Meteo Geocoding.",
  },
  {
    title: "Escolhe uma sugestão",
    text: "O front chama GET /api/destinations/insights. O back consulta, em paralelo, país, cotação, clima e imagem — cada bloco falha sozinho.",
  },
  {
    title: "Salva o plano",
    text: "POST /api/trips grava no banco em memória. Se faltar moeda, temperatura ou capa, o serviço de enriquecimento completa sem travar o salvamento.",
  },
] as const;

export default function AboutPage() {
  return (
    <div className="min-h-dvh">
      <PublicHeader />
      <main className="mx-auto w-full max-w-6xl space-y-16 px-4 pb-16 pt-8 sm:px-6 lg:space-y-20 lg:pt-12">
        {/* Hero */}
        <section
          aria-labelledby="about-title"
          className="relative isolate overflow-hidden rounded-3xl bg-primary px-6 py-12 text-white sm:px-12 sm:py-16"
        >
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-[radial-gradient(50rem_30rem_at_100%_0%,#6a4dff_0%,transparent_60%),radial-gradient(30rem_20rem_at_0%_100%,#1f00b3_0%,transparent_70%)]"
          />
          <div
            aria-hidden
            className="absolute inset-0 -z-10 opacity-20 [background-image:radial-gradient(#fff_1px,transparent_1px)] [background-size:26px_26px] [mask-image:linear-gradient(160deg,black,transparent_70%)]"
          />
          <p className="text-xs font-bold uppercase tracking-widest text-white/70">
            Sobre o projeto · DSW3 – Desenvolvimento Web 3
          </p>
          <h1
            id="about-title"
            className="mt-3 max-w-3xl text-balance font-display text-4xl font-light leading-tight sm:text-5xl"
          >
            Triply: planeje, viva e registre suas viagens.
          </h1>
          <p className="mt-5 max-w-2xl text-pretty text-lg text-white/85">
            Um web app de viagens: o usuário planeja destinos (com moeda, clima e foto sugeridos por APIs
            externas), registra como foi cada viagem e acompanha as cidades e países que já conheceu.
          </p>
          <ul className="mt-7 flex flex-wrap gap-2" aria-label="Tecnologias">
            {STACK.map((tech) => (
              <li
                key={tech}
                className="rounded-full bg-white/15 px-3 py-1 text-sm font-medium backdrop-blur-sm"
              >
                {tech}
              </li>
            ))}
          </ul>
        </section>

        <Section id="requisitos" eyebrow="O que a disciplina pede" title="Requisitos do trabalho">
          <ul className="grid gap-4 md:grid-cols-3">
            {REQUIREMENTS.map(({ icon: Icon, title, text }) => (
              <li key={title} className="rounded-2xl bg-surface p-6 shadow-card">
                <span className="grid size-11 place-items-center rounded-xl bg-primary-soft text-primary">
                  <Icon className="size-6" aria-hidden />
                </span>
                <h3 className="mt-4 font-display text-lg font-medium">{title}</h3>
                <p className="mt-1.5 text-text-muted">{text}</p>
              </li>
            ))}
          </ul>
        </Section>

        <Section
          id="arquitetura"
          eyebrow="Como as peças se conectam"
          title="Arquitetura"
          intro="Quatro camadas: o front React fala só com a API REST própria; os serviços do servidor acessam o banco e as APIs externas."
        >
          <ArchitectureDiagram />
          <aside className="mt-6 flex gap-4 rounded-2xl bg-primary-faint p-5 ring-1 ring-primary/10 sm:p-6">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
              <Layers className="size-5" aria-hidden />
            </span>
            <div>
              <h3 className="font-display text-lg font-medium text-primary">Camada de repositórios</h3>
              <p className="mt-1 text-text-muted">
                Os serviços acessam os dados só por repositórios. Na parte 1 a implementação guarda tudo em
                memória — é o padrão,{" "}
                <code className="rounded bg-white px-1.5 py-0.5 font-mono text-[0.8rem]">
                  DB_DRIVER=memory
                </code>
                . Na parte 2 basta trocar a implementação para PostgreSQL: rotas e front não mudam.
              </p>
            </div>
          </aside>
        </Section>

        <Section
          id="fluxo"
          eyebrow="Na prática"
          title="Exemplo: planejando uma viagem"
          intro="Um fluxo que atravessa todas as camadas e mostra o consumo de API externa."
        >
          <ol className="grid gap-4 md:grid-cols-3">
            {FLOW.map((step, index) => (
              <li key={step.title} className="relative rounded-2xl bg-surface p-6 shadow-card">
                <span className="grid size-9 place-items-center rounded-full bg-primary font-display text-base text-white">
                  {index + 1}
                </span>
                <h3 className="mt-4 font-display text-lg font-medium">{step.title}</h3>
                <p className="mt-1.5 text-text-muted">{step.text}</p>
              </li>
            ))}
          </ol>
        </Section>

        <Section
          id="endpoints"
          eyebrow="API REST própria"
          title="Endpoints"
          intro="Todas as rotas respondem JSON em português. Rotas de viagem só enxergam as viagens do usuário logado."
        >
          <EndpointsTable />
          <div className="mt-5 flex flex-wrap gap-3">
            <ButtonLink
              href="/api-docs"
              icon={<BookOpen className="size-[18px] shrink-0" aria-hidden />}
              className="h-auto min-h-11 max-w-full whitespace-normal py-2 text-center"
            >
              Documentação interativa (OpenAPI)
            </ButtonLink>
            <ButtonLink
              href="/api/openapi.json"
              variant="outline"
              icon={<FileJson className="size-[18px]" aria-hidden />}
              prefetch={false}
            >
              openapi.json
            </ButtonLink>
          </div>
        </Section>

        <Section
          id="apis-externas"
          eyebrow="Consumidas pelo back-end"
          title="APIs externas"
          intro="Seis provedores gratuitos e sem chave — Open-Meteo, AwesomeAPI, ExchangeRate-API, Frankfurter, Wikipédia e Wikimedia Commons —, mais as bandeiras do FlagCDN e um dataset local de países. As telas mostram a fonte de cada dado exibido."
        >
          <ExternalApisTable />

          <div className="mt-6 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <div className="rounded-2xl bg-surface p-6 shadow-card">
              <h3 className="flex items-center gap-2 font-display text-lg font-medium">
                <ShieldCheck className="size-5 text-primary" aria-hidden />
                Como o back se protege delas
              </h3>
              <ul className="mt-3 space-y-2 text-text-muted">
                {PROTECTIONS.map((item) => (
                  <li key={item} className="flex gap-2.5">
                    <span aria-hidden className="mt-2.5 size-1.5 shrink-0 rounded-full bg-primary" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl bg-primary-faint p-6 ring-1 ring-primary/10">
              <h3 className="font-display text-lg font-medium text-primary">Atribuições</h3>
              <ul className="mt-3 space-y-2 text-sm text-text-muted">
                <li>
                  Dados meteorológicos: <ExternalSource name="Open-Meteo" href="https://open-meteo.com/" />{" "}
                  (CC BY 4.0).
                </li>
                <li>
                  Cotações por{" "}
                  <ExternalSource name="ExchangeRate-API" href="https://www.exchangerate-api.com" /> quando
                  for a fonte.
                </li>
                <li>Imagens da Wikipédia/Wikimedia Commons, com autor, licença (CC BY / CC BY-SA) e link.</li>
              </ul>
            </div>
          </div>
        </Section>
      </main>
      <SiteFooter />
    </div>
  );
}
