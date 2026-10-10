# Triply — Documentação da API

API REST/JSON do Triply (Next.js 16 · route handlers em `src/app/api`). O contrato de tipos (front ↔ back) está em [`src/types/api.ts`](../src/types/api.ts); este documento descreve cada endpoint com exemplos reais.

> **Documentação interativa (OpenAPI 3.1):** com o app rodando, abra **`/api-docs`** (interface com "Try it", usa o cookie da sessão da mesma origem). A especificação em JSON está em **`GET /api/openapi.json`** (pública; importável no Postman/Insomnia). Ela é conferida contra as rotas e os schemas zod com `npm run docs:check`.

- [Convenções](#convenções)
- [Autenticação](#autenticação) — `register`, `login`, `logout`, `me`
- [Perfil](#perfil)
- [Viagens](#viagens) — CRUD, `complete`, `cover`
- [Destinos (APIs externas)](#destinos-apis-externas) — `search`, `insights`
- [Enriquecimento automático](#enriquecimento-automático-de-viagens)
- [APIs externas consumidas](#apis-externas-consumidas)
- [Como testar](#como-testar)

---

## Banco de dados

A API não depende do banco usado: os serviços falam só com repositórios (`src/db`), e a variável `DB_DRIVER` escolhe a implementação — **as respostas são idênticas nos dois modos**.

| `DB_DRIVER` | Banco | Observações |
|---|---|---|
| `memory` (padrão, quando ausente) | **Em memória** (parte 1) | Não exige `DATABASE_URL`. Nasce com a usuária demo e as 7 viagens (ids fixos). Os dados voltam ao estado inicial quando o servidor reinicia — e, na Vercel, também a cada novo deploy, *cold start* ou outra instância. |
| `postgres` | PostgreSQL + Drizzle (parte 2) | Exige `DATABASE_URL`; tabelas criadas com `npm run db:migrate`, dados de demonstração com `npm run db:seed`. |

Ao subir, o log indica o modo ativo: `[db] banco em memória — os dados voltam ao estado inicial quando o servidor reinicia` ou `[db] PostgreSQL (...) — os dados são persistentes`.

Comportamento comum aos dois: ordenação das listas, viagem de outro usuário → `404`, e-mail único (normalizado), `updatedAt` atualizado em toda alteração, capas enviadas guardadas como bytes e servidas com o mesmo `Content-Type`, e o mesmo limite de tentativas de login.

## Convenções

| Item | Regra |
|---|---|
| Base URL | `http://localhost:3000` (dev) · domínio da Vercel (produção) |
| Formato | JSON, UTF-8. Métodos de escrita **exigem** `Content-Type: application/json` (outro tipo → `400`) |
| Autenticação | Cookie `triply_session` (JWT HS256, 7 dias, `httpOnly`, `sameSite=lax`, `secure` em produção). Obtido em `register`/`login`. |
| Datas de calendário | `"YYYY-MM-DD"` (ida/volta) |
| Timestamps | ISO 8601 UTC (`"2026-10-10T00:59:36.434Z"`) |
| Números | Sempre `number` no JSON (inclusive os `NUMERIC` do Postgres — o banco em memória arredonda do mesmo jeito: cotação 6 casas, temperaturas 1, gastos 2); valores monetários em **reais (BRL)** |
| Idioma | Mensagens de erro em português do Brasil, prontas para exibir |
| Cache | Respostas de dados do usuário saem com `Cache-Control: private, no-store` |

### Formato de erro (`ApiError`)

Todo erro tem o mesmo formato, com o status HTTP correspondente:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Dados inválidos. Revise os campos informados.",
    "fields": { "email": "Informe um e-mail válido." }
  }
}
```

`fields` só aparece nos erros de validação (chave = nome do campo do body/query; itens de lista usam `trips.0.id`).

| `code` | HTTP | Quando |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Body/query inválido (inclui JSON malformado, corpo vazio ou grande demais) |
| `UNAUTHORIZED` | 401 | Sem sessão, sessão inválida/expirada ou usuário inexistente (nos dois últimos casos a resposta também **expira o cookie** `triply_session`) |
| `INVALID_CREDENTIALS` | 401 | E-mail ou senha incorretos no login |
| `FORBIDDEN` | 403 | Em métodos de escrita, o cabeçalho `Origin` enviado pelo navegador não é o host da aplicação (proteção contra CSRF) |
| `NOT_FOUND` | 404 | Recurso inexistente **ou de outro usuário** (nunca revelamos que existe) |
| `EMAIL_IN_USE` | 409 | E-mail já cadastrado |
| `TOO_MANY_REQUESTS` | 429 | Muitas tentativas de login falhas (vem com `Retry-After`) |
| `EXTERNAL_API_ERROR` | 502 | Serviço externo essencial fora do ar (só em `destinations/search`) |
| `INTERNAL_ERROR` | 500 | Erro inesperado (detalhes só no log do servidor) |

### Segurança

- Senhas com **bcrypt** (custo 10); `password_hash` nunca sai em nenhuma resposta.
- E-mail sempre normalizado (`trim` + minúsculas) — `Sarah@Triply.app` e `sarah@triply.app` são a mesma conta.
- Login não revela qual dos dois estava errado (e gasta o mesmo tempo para e-mail inexistente).
- Toda consulta de viagem filtra por `user_id` da sessão: viagem de outro usuário responde **404**.
- Páginas protegidas são barradas em `src/proxy.ts`; a API faz a própria checagem (401 em JSON). Se o cookie trouxer um JWT válido de um usuário que não existe mais (ex.: depois de um novo seed) ou um token inválido/expirado, o 401 já vem com `Set-Cookie: triply_session=; Max-Age=0`, o que evita o ciclo `/login` → `/perfil` → 401.
- **Limite de tentativas de login:** mais de **10 falhas em 15 minutos** para o mesmo e-mail a partir do mesmo IP (ou 30 para o mesmo IP, em qualquer e-mail, ou 30 para o mesmo e-mail, de qualquer IP) bloqueiam o login com `429 TOO_MANY_REQUESTS` e `Retry-After` — inclusive com a senha certa, até o tempo acabar. O estado fica no repositório de tentativas: no **Postgres** (tabela `login_attempts`) vale para todas as instâncias, então funciona em *serverless*; no **banco em memória** vale só para a instância e some ao reiniciar. Em ambos, e-mail e IP são guardados só como HMAC e as entradas antigas (> 24 h) são apagadas.
- **CSRF:** além do `SameSite=Lax` do cookie, métodos de escrita exigem `Content-Type: application/json` e, quando o navegador manda `Origin`, ele deve coincidir com o host (`403 FORBIDDEN` caso contrário). Requisições sem `Origin` (curl, servidor a servidor) não são afetadas.
- **Cabeçalhos de segurança** em todas as respostas (`next.config.ts`): `X-Frame-Options: DENY` e `Content-Security-Policy: frame-ancestors 'none'` (anti-clickjacking), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` restritiva; `X-Powered-By` removido.
- O parâmetro `?next=` que o proxy coloca em `/login` só contém caminhos internos (`/x`); valores forjados (`//host`, URL absoluta) são removidos antes de a página carregar. O helper `safeNextPath` (`src/server/auth/next-path.ts`) pode ser reutilizado pelo front.

---

## Autenticação

Nos exemplos, `-c cookies.txt` guarda o cookie de sessão e `-b cookies.txt` o envia.

### `POST /api/auth/register`

Cria a conta e já abre a sessão.

| Campo | Regra |
|---|---|
| `name` | 2–100 caracteres |
| `email` | e-mail válido (normalizado) |
| `password` | 6–72 caracteres |
| `confirmPassword` | igual a `password` |

```bash
curl -i -c cookies.txt -X POST http://localhost:3000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"Usuário Teste","email":"teste@triply.app","password":"123456","confirmPassword":"123456"}'
```

`201 Created` + `Set-Cookie: triply_session=…`

```json
{ "user": { "id": "faa822f4-d828-4afd-810e-e8aad00916d8", "name": "Usuário Teste", "email": "teste@triply.app", "createdAt": "2026-10-10T00:59:55.817Z" } }
```

Erros: `400 VALIDATION_ERROR` (ex.: `fields.confirmPassword = "As senhas não coincidem."`) · `409 EMAIL_IN_USE`:

```json
{ "error": { "code": "EMAIL_IN_USE", "message": "Este e-mail já está cadastrado. Tente entrar na sua conta.", "fields": { "email": "Este e-mail já está cadastrado." } } }
```

### `POST /api/auth/login`

```bash
curl -i -c cookies.txt -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"sarah@triply.app","password":"triply123"}'
```

`200 OK` + cookie → `{ "user": { … } }` (mesmo formato do register).
Erros: `400 VALIDATION_ERROR` · `401 INVALID_CREDENTIALS` (`"E-mail ou senha incorretos."`) · `429 TOO_MANY_REQUESTS` depois de 10 falhas em 15 minutos:

```json
{ "error": { "code": "TOO_MANY_REQUESTS", "message": "Muitas tentativas de login. Tente novamente em 15 minutos." } }
```

(a resposta traz `Retry-After: 900`, em segundos).

### `POST /api/auth/logout`

```bash
curl -i -b cookies.txt -c cookies.txt -X POST http://localhost:3000/api/auth/logout
```

`204 No Content` e o cookie é expirado (`Max-Age=0`). Idempotente (funciona mesmo sem sessão).

### `GET /api/auth/me`

```bash
curl -b cookies.txt http://localhost:3000/api/auth/me
```

`200 OK` → `{ "user": { "id": "…", "name": "Sarah Alves Soares", "email": "sarah@triply.app", "createdAt": "…" } }`
Sem sessão: `401 UNAUTHORIZED` (`"Faça login para continuar."`).

---

## Perfil

### `GET /api/profile`

Usuário + estatísticas. `cities` = cidades distintas (`lower(coalesce(city, destination))`) e `countries` = países distintos (`countryCode`) entre as viagens **realizadas**.

```bash
curl -b cookies.txt http://localhost:3000/api/profile
```

```json
{
  "user": { "id": "12670cfe-04b1-45de-a8ed-5aaf9a0c928e", "name": "Sarah Alves Soares", "email": "sarah@triply.app", "createdAt": "2026-10-10T00:59:36.434Z" },
  "stats": { "cities": 2, "countries": 2, "completedTrips": 2, "plannedTrips": 5 }
}
```

---

## Viagens

Todas exigem sessão (`401` sem ela). Uma única entidade `trip` com `status`: `planejada` → `realizada`.

Objeto `Trip` (exemplo — viagem realizada do seed):

```json
{
  "id": "20b8d434-99f3-48a7-bd64-2fac54d25dd3",
  "status": "realizada",
  "destination": "Espanha",
  "city": "Madrid", "region": "Comunidade de Madri", "country": "Espanha", "countryCode": "ES",
  "latitude": 40.4165, "longitude": -3.70256,
  "startDate": "2025-07-05", "endDate": "2025-07-19",
  "accommodation": "Madrid Downtown Hostel",
  "activities": "Museu Nacional Centro de Arte Reina Sofía",
  "transport": "aviao",
  "currencyCode": "EUR", "exchangeRate": 6.27, "exchangeRateAt": "2026-10-10T00:59:36.347Z",
  "tempMin": 18, "tempMax": 33,
  "coverImageUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/58/Plaza_Mayor_de_Madrid_-_01.jpg/1280px-Plaza_Mayor_de_Madrid_-_01.jpg",
  "coverImageSource": "externa",
  "completedAt": "2025-07-25T15:00:00.000Z",
  "rating": 4, "companions": "familia", "expenses": 16000.27,
  "experience": "Minha viagem foi simplesmente incrível! …",
  "createdAt": "2026-10-10T00:59:36.434Z", "updatedAt": "2026-10-10T00:59:36.434Z"
}
```

`coverImageUrl` **nunca** é data URL: é a URL https externa ou `"/api/trips/{id}/cover?v=<updatedAt em ms>"` para imagens enviadas por upload.

### `GET /api/trips?status=planejada|realizada`

Lista as viagens do usuário. Ordenação: **planejadas** por `startDate` crescente (sem data no fim); **realizadas** por `completedAt` decrescente. Sem `status`, vêm as planejadas primeiro e depois as realizadas.

```bash
curl -b cookies.txt 'http://localhost:3000/api/trips?status=planejada'
```

`200 OK` → `{ "trips": [ Trip, … ] }`. Status inválido: `400` com `fields.status`.

### `POST /api/trips`

Cria uma viagem **planejada**. Só `destination` é obrigatório.

| Campo | Regra |
|---|---|
| `destination` | 1–160 caracteres (obrigatório) |
| `city`, `region`, `country` | texto até 120; vazio vira `null` |
| `countryCode` | 2 letras (vira maiúsculas) |
| `latitude` / `longitude` | −90..90 / −180..180 |
| `startDate`, `endDate` | `YYYY-MM-DD` real; **volta ≥ ida** |
| `accommodation` / `activities` | até 200 / 2000 caracteres |
| `transport` | `aviao` (padrão) \| `carro` \| `onibus` |
| `currencyCode` | 3 letras (ISO 4217) |
| `exchangeRate` | número > 0 |
| `tempMin` / `tempMax` | −90..60; máx. ≥ mín. |
| `coverImage` | data URL `image/png\|jpeg\|webp\|gif` de até **2 MB** (upload) **ou** URL https; `null` = sem capa; omitido = capa automática |
| `coverImageSource` | `upload` \| `wikipedia` \| `externa` (o back deduz: data URL → `upload`) |

```bash
curl -b cookies.txt -X POST http://localhost:3000/api/trips \
  -H 'Content-Type: application/json' \
  -d '{
    "destination": "Tulum, México", "city": "Tulum", "region": "Quintana Roo",
    "countryCode": "MX", "latitude": 20.21173, "longitude": -87.46325,
    "startDate": "2027-06-10", "endDate": "2027-06-21",
    "accommodation": "Hostal Mulut Tulum", "transport": "aviao"
  }'
```

`201 Created` → `{ "trip": Trip }`. Como o destino é geolocalizado e vieram campos vazios, o back completa moeda, cotação, temperatura e capa — ver [Enriquecimento automático](#enriquecimento-automático-de-viagens):

```json
{ "trip": { "destination": "Tulum, México", "country": "México", "currencyCode": "MXN", "exchangeRate": 0.270836,
            "tempMin": 26.3, "tempMax": 30.5, "coverImageSource": "wikipedia", "coverImageUrl": "https://thumb.wikimedia.org/…/Tulum_2.jpg/1280px-Tulum_2.jpg", "…": "…" } }
```

Erro de validação (`400`):

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Dados inválidos. Revise os campos informados.",
             "fields": { "destination": "Informe o destino.", "endDate": "A volta deve ser no mesmo dia ou depois da ida." } } }
```

### `GET /api/trips/{id}`

```bash
curl -b cookies.txt http://localhost:3000/api/trips/20b8d434-99f3-48a7-bd64-2fac54d25dd3
```

`200 OK` → `{ "trip": Trip }` · `404 NOT_FOUND` (`"Viagem não encontrada."`) se não existir, se o id for malformado ou se for de outro usuário.

### `PATCH /api/trips/{id}`

Atualiza qualquer subconjunto dos campos de `POST /api/trips` **e** do relato (`rating` 1–5, `companions` `sozinho|casal|familia|amigos|trabalho`, `expenses` ≥ 0, `experience` até 5000). Campo omitido = mantém; `null` = limpa.

```bash
curl -b cookies.txt -X PATCH http://localhost:3000/api/trips/20b8d434-99f3-48a7-bd64-2fac54d25dd3 \
  -H 'Content-Type: application/json' \
  -d '{"rating": 5, "experience": "Melhor viagem da vida!"}'
```

`200 OK` → `{ "trip": Trip }`. Regras extras:
- ida/volta e temperaturas são validadas **junto com o que já está salvo** (ex.: mandar só `endDate` anterior à ida salva → `400`);
- relato (`rating`, `companions`, `expenses`, `experience` não nulos) só vale para viagens `realizada` — numa planejada: `400 "Marque a viagem como realizada para registrar o relato."`;
- `coverImage` com data URL troca a capa por upload; com URL https usa a externa; `null` remove.
- Se o **destino mudar** e a capa atual for automática (Wikipedia ou URL), o back busca a foto do novo destino; **se não houver foto, a capa antiga é removida** (não fica a foto do destino anterior). Upload do usuário nunca é tocado.

### `DELETE /api/trips/{id}`

```bash
curl -b cookies.txt -X DELETE http://localhost:3000/api/trips/<id>   # 204 No Content
```

`404` se não existir/for de outro usuário.

### `POST /api/trips/complete`

Marca várias viagens como **realizadas** (`completedAt = agora`) com o relato de cada uma, **em transação**: se qualquer id não existir (ou for de outro usuário), nada é alterado (`404`). Retorna as viagens atualizadas na ordem enviada. Viagem que já era realizada mantém o `completedAt` original.

```bash
curl -b cookies.txt -X POST http://localhost:3000/api/trips/complete \
  -H 'Content-Type: application/json' \
  -d '{"trips":[{"id":"<uuid>","rating":5,"companions":"amigos","expenses":3500.5,"experience":"Linda!"},{"id":"<uuid2>"}]}'
```

`200 OK` → `{ "trips": [ Trip, … ] }`. Lista de 1 a 50 itens, ids em UUID e sem repetição (senão `400`, ex.: `fields["trips.0.id"]`). "Pular" o relato = enviar só o `id`.

### `GET /api/trips/{id}/cover`

Binário da imagem enviada por upload (somente o dono). Responde com o `Content-Type` real (`image/jpeg`, `image/png`, `image/webp`, `image/gif`), `X-Content-Type-Options: nosniff` e cache **privado**: com `?v=` (que o `coverImageUrl` já traz) → `private, max-age=31536000, immutable`; sem ele → `private, no-cache`.

```bash
curl -b cookies.txt -o capa.png 'http://localhost:3000/api/trips/<id>/cover?v=1791594012452'
```

`404` se a viagem não existir, for de outro usuário ou não tiver capa enviada (capa externa não passa por aqui — use a URL direta).

---

## Destinos (APIs externas)

Exigem sessão (protege a cota das APIs gratuitas). São as rotas que expõem ao front o consumo das APIs externas (ver [APIs externas consumidas](#apis-externas-consumidas)).

### `GET /api/destinations/search?q=`

Autocomplete de destinos (até 8 resultados), `q` com 2 a 100 caracteres. O back pede até 40 resultados à Open-Meteo e devolve os 8 melhores segundo uma pontuação que soma a **relevância do nome** (igual ao digitado › começa com ele › contém › nome alternativo, como "Banguecoque" para "Bangkok") e a **importância do lugar** (`log10(população)` + bônus por tipo: país, capital, sede de estado/município, ilha). Cidades famosas vêm antes de lugarejos homônimos: "Bangkok" → Banguecoque, "Madri" → Madrid, "Tokyo" → Tóquio, "Nova York"/"New York" → Nova Iorque (a Open-Meteo só acha a cidade por "NYC", que o back consulta junto), "Bali" → a ilha da Indonésia. Aeroportos, parques, montes e outros pontos de interesse são descartados. `label` já vem pronto para usar como `destination`:
Brasil → `"Barra Grande - Piauí"` · exterior → `"Tulum, México"` · país → `"México"`.

```bash
curl -b cookies.txt 'http://localhost:3000/api/destinations/search?q=Maragogi'
```

```json
{ "results": [
  { "id": "3395458", "name": "Maragogi", "region": "Alagoas", "country": "Brasil", "countryCode": "BR", "latitude": -9.01222, "longitude": -35.2225, "label": "Maragogi - Alagoas" },
  { "id": "3457850", "name": "Maragogipe", "region": "Bahia", "country": "Brasil", "countryCode": "BR", "latitude": -12.77778, "longitude": -38.91944, "label": "Maragogipe - Bahia" }
] }
```

Erros: `400` (`q` ausente/curto) · `502 EXTERNAL_API_ERROR` se o serviço de geocodificação estiver fora do ar (aqui o erro é honesto: lista vazia seria enganosa).

### `GET /api/destinations/insights?name=&countryCode=&lat=&lon=&start=&end=`

Informações do destino para o painel "Sobre o destino". Informe ao menos `name`, `countryCode` ou `lat`+`lon`; `start`/`end` (`YYYY-MM-DD`) são opcionais e definem o período do clima. `name` aceita o nome da cidade ou o `label` da busca.

```bash
curl -b cookies.txt 'http://localhost:3000/api/destinations/insights?name=Tulum&countryCode=MX&lat=20.21173&lon=-87.46325&start=2027-06-10&end=2027-06-21'
```

```json
{
  "country":  { "code": "MX", "name": "México", "flagUrl": "https://flagcdn.com/w320/mx.png" },
  "currency": { "code": "MXN", "name": "Peso mexicano", "symbol": "MX$", "rateToBRL": 0.270836, "label": "1 MXN = R$ 0,27",
                "updatedAt": "2026-10-09T21:03:56.000Z", "source": "AwesomeAPI", "sourceUrl": "https://docs.awesomeapi.com.br/api-de-moedas" },
  "climate":  { "min": 26.3, "max": 30.5, "label": "≈ 26 a 31 °C", "source": "historico" },
  "image":    { "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/85/Tulum_2.jpg/1280px-Tulum_2.jpg", "source": "Wikipedia",
                "attribution": "Popo le Chien", "license": "CC BY-SA 3.0", "pageUrl": "https://commons.wikimedia.org/wiki/File:Tulum_2.jpg" }
}
```

**Cada bloco falha sozinho:** se uma API externa estiver fora do ar, aquele bloco vem `null` e a resposta continua `200`. Detalhes:

- `currency`: para BRL, `rateToBRL = 1`, `label = "R$ 1,00"` e nenhuma chamada externa. Cotações muito pequenas ganham mais casas (`1 IDR = R$ 0,00028`). `sourceUrl` é o link de atribuição (obrigatório para a ExchangeRate-API: exibir "Cotações por ExchangeRate-API").
- `climate.source`: `previsao` (todo o período nos próximos 16 dias, ou sem datas → próximos 7 dias) ou `historico` (mesmas datas de um ano anterior já completo, ou as datas reais se o período já passou). Período limitado a 31 dias; dias sem dado são ignorados. `label` = `"≈ 20 °C"` ou `"≈ 25 a 30 °C"`. Atribuição: "Dados meteorológicos: Open-Meteo (CC BY 4.0)".
- `image`: foto da Wikipédia (1280 px; SVG descartado). `attribution`/`license`/`pageUrl` vêm do Wikimedia Commons — exibir os créditos é exigido pela licença.

Erros: `400` (nenhum identificador do destino, `lat` sem `lon`, datas inválidas ou volta antes da ida).

---

## Enriquecimento automático de viagens

`POST /api/trips` e `PATCH /api/trips/{id}` usam o mesmo serviço de insights para completar a viagem, **sem nunca impedir o salvamento** (erro ou lentidão de API externa = campo fica vazio; orçamento total de 8 s).

Só ocorre quando o destino é **geolocalizado** (`latitude`+`longitude` ou `countryCode`). Valores enviados pelo cliente sempre vencem; `null` e campos omitidos são considerados "vazios".

| Campo | Criação (`POST`) | Edição (`PATCH`) |
|---|---|---|
| `country` | preenchido a partir do `countryCode` (offline) | idem, se estiver vazio |
| `currencyCode`, `exchangeRate`, `exchangeRateAt` | se cotação/moeda vazias (moeda padrão do país; se o cliente mandou só o código, busca a cotação dele) | se o destino mudou, se a cotação estava vazia, ou se o cliente mandou outro `currencyCode` sem cotação |
| `tempMin`, `tempMax` | se ambos vazios e houver `latitude`/`longitude` | se destino **ou datas** mudaram, ou se estavam vazios — exceto se o cliente mandou as temperaturas |
| `coverImage` (`coverImageSource = "wikipedia"`) | se `coverImage` foi **omitido** (`null` = "sem capa", respeitado) | só se o destino mudou e a capa atual **não é upload** (Wikipedia, URL ou inexistente): troca pela foto do novo destino ou, se não houver, **remove** a capa; **nunca** toca em upload |

---

## APIs externas consumidas

Todas **gratuitas e consumidas só pelo back-end** (o navegador nunca chama diretamente), em `src/server/external/*`.

| Serviço | Para quê | Endpoint | Chave | Cache |
|---|---|---|---|---|
| **Open-Meteo Geocoding** | Autocomplete de destinos (cidade, estado, país, lat/lon) e desambiguação de homônimos | `geocoding-api.open-meteo.com/v1/search?name=&count=40&language=pt` | não | 7 dias |
| **Open-Meteo Forecast** | Temperatura prevista (período todo em ≤ 16 dias) | `api.open-meteo.com/v1/forecast` | não | 3 h |
| **Open-Meteo Archive** | Temperatura histórica (mesmas datas de um ano anterior) | `archive-api.open-meteo.com/v1/archive` | não | 30 dias |
| **AwesomeAPI** | Cotação moeda → BRL (usa `bid`) — fonte primária | `economia.awesomeapi.com.br/json/last/{MOEDA}-BRL` | não | 1 h |
| **ExchangeRate-API** (open access) | Cotação — 1º fallback (cobre IDR e mais; atribuição obrigatória) | `open.er-api.com/v6/latest/{MOEDA}` | não | 1 h |
| **Frankfurter** (BCE) | Cotação — 2º fallback | `api.frankfurter.dev/v1/latest?base={MOEDA}&symbols=BRL` | não | 1 h |
| **Wikipédia (MediaWiki)** | Imagem de capa sugerida (`prop=pageimages`, 1280 px), em pt e depois en | `{pt,en}.wikipedia.org/w/api.php` | não | 7 dias |
| **Wikimedia Commons** | Autor e licença da imagem (`prop=imageinfo&iiprop=extmetadata`) | `commons.wikimedia.org/w/api.php` | não | 30 dias |
| **flagcdn** | Bandeira do país (só gera a URL; o navegador carrega a imagem) | `flagcdn.com/w320/{cca2}.png` | não | — |
| **`world-countries`** (npm, dataset estático) | País → nome em português e moeda principal (a REST Countries v3.1 foi desativada) | sem rede | — | — |

**Como o back se protege das APIs externas** (`src/server/external/http.ts` e `cache.ts`):

- **Timeout de 5 s** por chamada e `User-Agent: Triply/1.0 (projeto academico DSW3)` em todas.
- **Erro nunca vira exceção:** falha, timeout ou resposta inesperada devolvem `null`; a rota responde normalmente com aquele bloco `null`.
- **Cache em duas camadas** (coluna *Cache* = validade no Data Cache): (1) memória, para resposta rápida e junção de chamadas simultâneas iguais; (2) **Data Cache do Next** (`fetch` com `next.revalidate`), **persistente e compartilhado entre instâncias e deploys**. Só respostas bem-sucedidas (2xx) entram no Data Cache — falhas (429, 5xx, timeout) nunca são guardadas; na memória uma falha fica só 30 s para não martelar um serviço fora do ar. Efeito prático: depois de ensaiar a demonstração uma vez, fotos, cotações e buscas ficam "aquecidas" mesmo em outras instâncias da Vercel (e as chamadas deixam de competir pelo limite de requisições da Wikimedia, que compartilha IPs entre projetos).
- **Respeita `429 Too Many Requests`:** o host entra em pausa pelo `Retry-After` (a Wikimedia limita rajadas de requisições).
- **Cadeia de fallback da cotação:** AwesomeAPI → ExchangeRate-API → Frankfurter → `null`.

Atribuições exibidas na interface: "Dados meteorológicos: Open-Meteo (CC BY 4.0)", "Cotações por ExchangeRate-API" (quando for a fonte), e autor/licença/link de cada imagem (CC BY / CC BY-SA do Commons).

---

## Como testar

```bash
# Parte 1 (padrão): banco em memória — não há o que migrar nem semear; basta `npm run dev`.
# Modo Postgres (DB_DRIVER=postgres + DATABASE_URL):
npm run db:migrate   # aplica as migrações (drizzle/)
npm run db:seed      # recria a usuária demo (idempotente)
```

Usuária demo: **`sarah@triply.app` / `triply123`** — 2 viagens realizadas (Espanha, França) e 5 planejadas (Maragogi, México, Indonésia, Barra Grande, Natal).

```bash
BASE=http://localhost:3000
curl -s -c c.txt -X POST $BASE/api/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"sarah@triply.app","password":"triply123"}'
curl -s -b c.txt $BASE/api/profile
curl -s -b c.txt "$BASE/api/trips?status=realizada"
curl -s -b c.txt "$BASE/api/destinations/search?q=Bali"
```

Scripts `db:*` (só no modo Postgres): `db:generate` (gera migração a partir de `src/db/postgres/schema.ts`), `db:migrate`, `db:seed`, `db:studio`.

Mapa do código do back-end: `src/db` (camada de dados: interfaces de repositório, `memory/` e `postgres/`, dados de demonstração) · `src/server/auth` (bcrypt, JWT, cookie, `requireUser`) · `src/server/http` (erros `ApiError`, respostas, validação zod) · `src/server/trips` e `src/server/users` (schemas, serializers, serviços) · `src/server/external` (clientes das APIs externas) · `src/server/destinations` (insights) · `src/app/api/**/route.ts` (rotas) · `src/proxy.ts` (proteção de páginas).
