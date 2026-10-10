# Triply — Especificação do Web App

Trabalho da disciplina **DSW3 – Desenvolvimento Web 3**. Requisitos da disciplina:
1. **APIs próprias** para o front se comunicar com o back (REST/JSON em `/api/*`).
2. **Consumo de API externa** (gratuita) — feito pelo back-end, exposto ao front por rotas próprias.
3. Hospedagem na **Vercel** para a apresentação.

O protótipo original é **mobile** (Figma). Aqui adaptamos para **web app responsivo**: desktop primeiro, funcionando bem no celular.
Referências visuais: `docs/figma/*.png` (capturas das 8 telas).

---

## 1. Stack

| Camada | Escolha |
|---|---|
| Framework | Next.js 16.4 (App Router, `src/`), React 19.3, TypeScript |
| Estilo | Tailwind CSS v4 (tokens em `src/app/globals.css` via `@theme`) |
| Ícones | `lucide-react` |
| Toasts | `sonner` |
| Banco (parte 1) | **Em memória** — repositórios com `Map` no servidor (`src/db/memory`), populados com os dados de demonstração ao subir. Padrão: `DB_DRIVER=memory` |
| Banco (parte 2) | PostgreSQL + Drizzle ORM (`src/db/postgres`, `drizzle-orm/node-postgres` + `pg`, migrações com `drizzle-kit`) — já implementado, ligado com `DB_DRIVER=postgres` + `DATABASE_URL` |
| Validação | `zod` (v4) |
| Auth | e-mail + senha, `bcryptjs` para hash, JWT (`jose`, HS256) em cookie httpOnly `triply_session` (7 dias) |
| Datas | `date-fns` (locale pt-BR) |
| Deploy | Vercel |

> ⚠️ Next.js 16 tem breaking changes (ex.: `middleware.ts` virou `proxy.ts`, `cacheComponents` está ligado no `next.config.ts`). **Leia `node_modules/next/dist/docs/` antes de escrever código de framework.**

Variáveis de ambiente (`.env.local`, já criado; modelo em `.env.example`): `JWT_SECRET` (obrigatória); `DB_DRIVER` (`memory` padrão | `postgres`); `DATABASE_URL` / `DATABASE_URL_UNPOOLED` só no modo `postgres`.

> **Banco em memória (parte 1 do trabalho).** Os serviços (`src/server/**`) só falam com as interfaces de repositório (`src/db/repositories.ts`); a implementação é escolhida por `DB_DRIVER`. Em memória, os dados voltam ao estado inicial (seed) sempre que o servidor reinicia — na Vercel isso acontece em deploy, cold start ou quando a requisição cai em outra instância. A Sarah e as viagens do seed têm UUIDs fixos, então o login dela e os links continuam válidos depois de um reinício.

---

## 2. Produto e fluxos

O usuário **planeja viagens** (Planos de Viagem), depois **registra as que fez** (Registrar viagem → "Realizado") contando como foi. O **perfil** mostra as viagens realizadas e estatísticas (cidades e países).

Uma única entidade `trip` com `status`: `planejada` → `realizada`.

### Rotas (páginas)

| Rota | Tela do Figma | Acesso |
|---|---|---|
| `/` | — redireciona para `/perfil` (logado) ou `/login` | — |
| `/login` | Tela de login – inicial | público (logado → `/perfil`) |
| `/cadastro` | Tela de cadastro | público (logado → `/perfil`) |
| `/perfil` | Tela de perfil – principal (home) | protegido |
| `/viagens/[id]` | Tela de detalhamento de card (realizada) | protegido |
| `/planos` | Tela de planos de viagem | protegido |
| `/planos/novo` | Tela de planejar viagem – CRUD | protegido |
| `/planos/[id]` | Tela de editar plano de viagem | protegido |
| `/registrar` | Tela de registrar uma viagem (realizou) | protegido |
| `/sobre` | (extra) Sobre o projeto: arquitetura, endpoints, APIs externas — útil na apresentação | público |

Proteção de rotas em `src/proxy.ts` (verifica o JWT do cookie). Rotas `/api/*` fazem a própria checagem e respondem 401 em JSON.

### Detalhe de cada tela (adaptação web)

**Layout autenticado:** navbar no topo (logo "Triply" à esquerda; links "Meu perfil", "Planos de viagem", "Registrar viagem"; à direita nome do usuário + botão sair `LogOut`). No mobile: navbar compacta com menu (ou bottom nav). Conteúdo com `max-w-6xl` centralizado. Fundo `--color-bg`.

**Login / Cadastro:** desktop em duas colunas — à esquerda um painel de marca (cor primária, "Triply" grande, frase tipo "Planeje, viva e registre suas viagens", colagem/foto de destino); à direita o formulário. Mobile: só o formulário, centralizado, como no Figma.
- Login: campos E-mail ("Login" no Figma) e Senha; botão **Entrar**; link "Crie sua conta".
- Cadastro: Nome completo, E-mail, Senha, Confirmar senha; botão **Cadastrar**; seta voltar → `/login`.
- Erros de validação exibidos embaixo de cada campo (texto vermelho pequeno); erro geral em toast.

**Perfil (`/perfil`):** cabeçalho com avatar (círculo branco com ícone de usuário na cor primária, como no Figma), nome do usuário e o **card de estatísticas** (fundo primário, ícones `MapPin` e `Earth`/`Globe` brancos: "62 Cidades", "2 Países"). Desktop: avatar+nome à esquerda e estatísticas à direita numa faixa/hero. Abaixo, seção "Minhas viagens" com grid de **cards de viagem realizada** (3 colunas desktop / 1 mobile) → clique abre `/viagens/[id]`. Botões de ação "Registrar viagem" e "Planos de viagem". Estado vazio amigável ("Você ainda não registrou viagens…").

**Detalhe (`/viagens/[id]`):** desktop em duas colunas: imagem grande (capa) à esquerda; à direita: título do destino, tags (companhia com ícone `Users` — ex. "Família"; transporte com `Plane`/`Car`/`Bus`), avaliação em estrelas (preenchidas na cor primária). Seção **"Detalhe da viagem"** em lista de pares rótulo/valor: Hospedagem, Atividades, Período (ida – volta), Cotação da moeda ("1 EUR = R$ 6,27"), Temperatura média, Gastos ("R$ 16.000,27"). Seção **"Minha experiência"** (texto). Ações: "Editar relato" (abre o mesmo diálogo do registrar) e **Excluir** (com confirmação). Seta voltar → `/perfil`.

**Planos (`/planos`):** título "Planos de Viagem" (cor primária) + botão "+ Nova viagem" (no mobile vira o FAB redondo do Figma). Grid de **cards de viagem planejada** com ícone de lápis (`Pencil`) no canto inferior direito; mostrar também as datas (ex. "10/06 – 21/06/2027"). Clique → `/planos/[id]`. Estado vazio com CTA.

**Planejar (`/planos/novo`) e Editar (`/planos/[id]`):** títulos "Planeje sua nova viagem" / "Edite seu plano de viagem". Desktop em duas colunas:
- Esquerda — formulário: **Destino** (autocomplete que consulta `/api/destinations/search`), **Ida** e **Volta** (date inputs lado a lado), **Hospedagem**, **Atividades planejadas** (textarea), **Transporte** (controle segmentado Avião | Carro | Ônibus).
- Direita — painel "Sobre o destino" alimentado por `/api/destinations/insights` assim que o destino (e as datas) forem escolhidos: imagem de capa sugerida, bandeira/país, **Moeda e cotação** ("1 MXN = R$ 0,29"), **Temperatura média** ("≈ 20 °C"). Indicar a fonte (ex.: "Fonte: Open-Meteo") — é o que mostra o consumo da API externa na apresentação. Skeleton enquanto carrega; se uma parte falhar, mostra "Indisponível".
- **Imagem – capa:** "Inserir imagem" (upload; redimensionar no cliente para máx. 1280 px JPEG ~0,8 e enviar como data URL) ou usar a imagem sugerida.
- Botões: **Salvar** (`Check`) e, só na edição, **Excluir** (vermelho, `Trash2`, com confirmação).
- Mobile: tudo empilhado, como no Figma.

**Registrar (`/registrar`):** título "Registre uma viagem". Lista de viagens **planejadas** como cards selecionáveis com checkbox à direita (seleção múltipla). Botão **Realizado** (desabilitado sem seleção) → abre diálogo "Como foi sua viagem?" para cada viagem selecionada (passo a passo se mais de uma): avaliação (1–5 estrelas), companhia (chips: Sozinho, Casal, Família, Amigos, Trabalho), gastos (R$, máscara monetária) e "Minha experiência" (textarea). Botões "Pular" e "Salvar". Ao final chama `POST /api/trips/complete`, mostra toast e vai para `/perfil`.

---

## 3. Design system (extraído do Figma)

Estilo Material 3, cor primária azul-violeta elétrica.

| Token | Valor | Uso |
|---|---|---|
| `--color-primary` | `#3300FF` | botões, títulos de página, ícones, card de stats, estrelas |
| `--color-primary-hover` | `#2900CC` | hover/active |
| `--color-primary-soft` | `#E8DEF8` | opções não selecionadas do segmentado, chips |
| `--color-bg` | `#EFEDF1` | fundo das páginas |
| `--color-surface` | `#FFFFFF` | cards/painéis |
| `--color-field` | `#E6E0E9` | fundo dos inputs (filled) |
| `--color-field-line` | `#49454F` | borda inferior dos inputs |
| `--color-text` | `#1D1B20` | texto principal |
| `--color-text-muted` | `#49454F` | rótulos, textos de apoio |
| `--color-danger` | `#E8170F` | Excluir, erros |

- **Fontes:** `Lexend` (marca, títulos, botões) e `Roboto` (corpo, inputs) via `next/font/google`.
- **Botão primário:** fundo primário, texto branco (Lexend), raio 8px, hover mais escuro, estado loading.
- **Input (filled M3):** fundo `--color-field`, cantos superiores 4px, borda inferior 1px `--color-field-line` (2px primária no foco), rótulo acima, botão de limpar à direita (ícone `CircleX`) quando houver valor, mensagem de erro abaixo.
- **Card de destino:** foto de capa ocupando o card, raio 14px, sobreposição clara/esbranquiçada (o Figma usa a foto "lavada"), título do destino em texto escuro (Lexend ~22–24px) alinhado à esquerda e centralizado verticalmente; lápis no canto inferior direito nos planos. Hover: leve elevação/zoom na imagem. Sem imagem → gradiente com a cor primária suave.
- **Segmentado (Transporte):** pílula; selecionado = fundo primário + texto branco; demais = `--color-primary-soft`.
- **Estrelas:** `Star` preenchida na cor primária; vazias só contorno.
- **Títulos de página:** Lexend, cor primária, ~28–32px no desktop.
- Datas exibidas em pt-BR (`dd/MM/yyyy`), moeda com `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`.
- Acessibilidade: labels associados, foco visível, `alt` nas imagens, contraste suficiente sobre as fotos.

---

## 4. Modelo de dados (registros em memória / tabelas Postgres)

Os mesmos campos valem para os dois drivers: em memória são objetos TS (`src/db/types.ts`); no Postgres, as tabelas abaixo.

**users**: `id uuid pk default gen_random_uuid()`, `name text not null`, `email text not null unique` (sempre minúsculo), `password_hash text not null`, `created_at timestamptz default now()`.

**trips**:
- `id uuid pk`, `user_id uuid not null → users.id on delete cascade`
- `status trip_status ('planejada','realizada') default 'planejada'`
- `destination text not null`, `city text`, `region text`, `country text`, `country_code varchar(2)`, `latitude double precision`, `longitude double precision`
- `start_date date`, `end_date date` (check `end_date >= start_date`)
- `accommodation text`, `activities text`, `transport transport ('aviao','carro','onibus') default 'aviao'`
- `currency_code varchar(3)`, `exchange_rate numeric(14,6)`, `exchange_rate_at timestamptz`
- `temp_min numeric(4,1)`, `temp_max numeric(4,1)`
- `cover_image text` (URL externa **ou** data URL do upload), `cover_image_source cover_source ('upload','wikipedia','externa')`
- `completed_at timestamptz`, `rating smallint` (1–5), `companions companions ('sozinho','casal','familia','amigos','trabalho')`, `expenses numeric(12,2)`, `experience text`
- `created_at`, `updated_at timestamptz default now()`
- índice em `(user_id, status)`

Estatísticas: `cities` = distintos `lower(coalesce(city, destination))` entre realizadas; `countries` = distintos `country_code` (não nulos) entre realizadas.

---

## 5. API REST (contrato em `src/types/api.ts`)

Todas as rotas em `src/app/api/**/route.ts`, JSON, mensagens em pt-BR. Erros sempre no formato `ApiError` (`{ error: { code, message, fields? } }`) com status HTTP coerente. Rotas de viagem só enxergam viagens do usuário logado (viagem de outro usuário → 404).

| Método | Rota | Body | Resposta |
|---|---|---|---|
| POST | `/api/auth/register` | `RegisterInput` | 201 `AuthResponse` + cookie · 409 `EMAIL_IN_USE` |
| POST | `/api/auth/login` | `LoginInput` | 200 `AuthResponse` + cookie · 401 `INVALID_CREDENTIALS` |
| POST | `/api/auth/logout` | — | 204, limpa cookie |
| GET | `/api/auth/me` | — | 200 `AuthResponse` · 401 |
| GET | `/api/profile` | — | 200 `ProfileResponse` |
| GET | `/api/trips?status=planejada\|realizada` | — | 200 `TripListResponse` (planejadas por `start_date` asc, nulos no fim; realizadas por `completed_at` desc) |
| POST | `/api/trips` | `TripInput` | 201 `TripResponse` |
| GET | `/api/trips/{id}` | — | 200 `TripResponse` · 404 |
| PATCH | `/api/trips/{id}` | `TripUpdateInput` | 200 `TripResponse` |
| DELETE | `/api/trips/{id}` | — | 204 |
| POST | `/api/trips/complete` | `CompleteTripsInput` | 200 `TripListResponse` (marca como realizada, `completed_at = now()`) |
| GET | `/api/trips/{id}/cover` | — | binário da imagem enviada por upload (com `Content-Type` e cache) · 404 |
| GET | `/api/destinations/search?q=` | — | 200 `DestinationSearchResponse` (q ≥ 2 chars) |
| GET | `/api/destinations/insights?name=&countryCode=&lat=&lon=&start=&end=` | — | 200 `DestinationInsightsResponse` |

**Enriquecimento no back:** ao criar/editar uma viagem com destino geolocalizado, se `currencyCode/exchangeRate`, `tempMin/tempMax` ou `coverImage` vierem vazios (ou se destino/datas mudarem), o back preenche usando o mesmo serviço de insights. Falha de API externa nunca impede salvar a viagem.

---

## 6. APIs externas (todas gratuitas, consumidas pelo back)

Detalhes, exemplos reais de request/response e limites em `docs/research/apis-externas.md` (pesquisa validada com curl em 09/10/2026).

### Decisões finais (orquestrador, após a pesquisa)

| Para quê | Fonte | Detalhes |
|---|---|---|
| Autocomplete de destino | **Open-Meteo Geocoding** `geocoding-api.open-meteo.com/v1/search?name=&count=8&language=pt` | Reordenar: itens com `population` primeiro (desc), mantendo a ordem original no empate — resolve "Bali" (Índia vs Indonésia). Montar `label` conforme `src/types/api.ts`. Guardar `admin2` internamente (fallback de imagem). |
| País → nome pt, moeda | **Dataset estático `world-countries`** (npm, já instalado — mesma base da antiga REST Countries) | ⚠️ REST Countries v3.1 foi **desativada** (v5 exige chave). Não chamar em runtime. Nome: `translations.por.common`; moeda: 1ª chave de `currencies`. |
| Bandeira | `https://flagcdn.com/w320/{cca2 minúsculo}.png` | |
| Cotação → BRL | **AwesomeAPI** `/json/last/{MOEDA}-BRL` (usar `bid`) → fallback **ExchangeRate-API open access** `open.er-api.com/v6/latest/{MOEDA}` (`rates.BRL`; atribuição obrigatória: "Cotações por ExchangeRate-API" com link) → fallback **Frankfurter** `api.frankfurter.dev/v1/latest?base={MOEDA}&symbols=BRL` | AwesomeAPI não tem IDR (Indonésia cai no fallback). Moeda BRL → `rateToBRL = 1`, label "R$ 1,00", sem chamada externa. Preencher `source` e `sourceUrl`. |
| Temperatura média | **Open-Meteo Forecast** se todo o período estiver nos próximos 16 dias; senão **Open-Meteo Archive** com as mesmas datas do ano anterior | Ignorar valores `null`. Limitar o período consultado a no máx. 31 dias. Sem datas → usar os próximos 7 dias (forecast). `source: "previsao" \| "historico"`. Atribuição: "Dados meteorológicos: Open-Meteo (CC BY 4.0)". |
| Imagem de capa | **Wikipedia/MediaWiki** `pt.wikipedia.org/w/api.php?action=query&prop=pageimages&piprop=thumbnail\|original&pithumbsize=1280&redirects=1&titles=...` | Ordem de tentativa: nome da cidade → nome do município (`admin2`) → país; pt.wikipedia e depois en.wikipedia. Descartar SVG. Autor/licença via Commons (`prop=imageinfo&iiprop=extmetadata`) quando possível. |

- `User-Agent` em todas as chamadas: `Triply/1.0 (projeto academico DSW3)` (sem e-mail pessoal).
- Serviços em `src/server/external/*` com timeout (~5 s), cache (`fetch` com `next: { revalidate }` ou memória — cotação ~1 h, clima ~6 h, geocoding/imagem ~1 dia) e erro → `null` (nunca lança).
- Hosts de imagem para liberar no front (`next.config.ts`): `upload.wikimedia.org`, `thumb.wikimedia.org`, `flagcdn.com`.
- Seed: usar as URLs (todas validadas com HTTP 200) e créditos de `docs/research/seed-imagens.md`.
- Upload de capa: limite de body da Vercel Hobby é 4,5 MB → front redimensiona para máx. 1280 px JPEG; back aceita data URL de até ~2 MB.
- Parte 2 — produção com Postgres (Neon via Vercel Marketplace, `DB_DRIVER=postgres`): `DATABASE_URL` (pooled) no app; migrações com a URL direta (`DATABASE_URL_UNPOOLED`) rodadas manualmente. Pool `pg` com `max` baixo (≤ 5). Ver `docs/research/deploy-vercel.md`.

---

## 7. Organização do código e responsabilidades

| Área | Dono | Caminhos |
|---|---|---|
| Contrato da API, spec, docs gerais | Orquestrador | `src/types/api.ts`, `docs/SPEC.md`, `CLAUDE.md` |
| Back-end | **Alicerce** | `src/db/**`, `drizzle/**`, `drizzle.config.ts`, `src/server/**`, `src/app/api/**`, `src/proxy.ts`, `scripts/**`, `docs/API.md` |
| Front-end | **Aquarela** | `src/app/(auth)/**`, `src/app/(app)/**`, `src/app/sobre/**`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`, `src/components/**`, `src/lib/**` (exceto o que o back criar em `src/server`), `src/hooks/**`, `public/**`, `next.config.ts` |
| Pesquisa | **Bússola** | `docs/research/**` |

Se precisar mexer em arquivo de outro dono, peça ao orquestrador.

### Dados de demonstração (seed)
Os dados ficam em `src/db/seed-data.ts` (UUIDs fixos). No modo memória são carregados automaticamente ao subir; no modo postgres, `npm run db:seed` os grava. Cria o usuário **Sarah Alves Soares** — `enzo@triply.app` / `triply123` — com:
- realizadas: **Espanha** (Madrid; hospedagem "Madrid Downtown Hostel"; atividades "Museu Nacional Centro de Arte Reina Sofía"; EUR 6,27; gastos R$ 16.000,27; 4 estrelas; família; avião; experiência do Figma) e **França** (Paris);
- planejadas (datas futuras, 2027): **Maragogi - Alagoas**, **Indonésia** (Bali), **Barra Grande - Piauí**, **Natal - Rio Grande do Norte**, **México** (Tulum, hospedagem "Hostal Mulut Tulum", atividades "Mergulhar em um cenote e passear por Tulum").
Capas com URLs do Wikimedia.
