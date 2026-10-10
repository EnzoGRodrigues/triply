/** Texto (Markdown) da descrição geral da API, exibido no topo da documentação. */
export const apiDescription = `
API REST/JSON do **Triply** — app web para planejar viagens, descobrir moeda e clima do destino e registrar como foi cada aventura.
Projeto da disciplina **DSW3 – Desenvolvimento Web 3**, feito com Next.js 16 (route handlers) e zod. Os dados ficam, na parte 1, em um **banco em memória** (volta ao estado inicial quando o servidor reinicia); o PostgreSQL com Drizzle ORM já está no projeto para a parte 2 — as respostas da API são as mesmas nos dois modos.

> O contrato de tipos usado pelo front-end está em \`src/types/api.ts\`; esta documentação é fiel a ele.

## Como testar aqui

1. Abra **Autenticação → Entrar** e execute \`POST /api/auth/login\` com a usuária de demonstração
   \`sarah@triply.app\` / \`triply123\`.
2. O navegador guarda o cookie \`triply_session\` e o envia sozinho nas próximas requisições (mesma origem).
3. Experimente \`GET /api/trips\`, \`GET /api/profile\` e \`GET /api/destinations/search?q=Bali\`.

## Convenções

- **Autenticação:** cookie \`triply_session\` (JWT HS256, 7 dias, \`HttpOnly\`, \`SameSite=Lax\`) obtido em \`register\`/\`login\`.
- **Corpo das requisições:** JSON com \`Content-Type: application/json\` (outro tipo responde \`400\`).
- **Datas de calendário:** \`YYYY-MM-DD\` (ida e volta).
- **Timestamps:** ISO 8601 em UTC.
- **Números:** sempre \`number\` no JSON (inclusive os NUMERIC do Postgres); valores monetários em **reais (BRL)**.
- **Idioma:** mensagens de erro em português do Brasil, prontas para exibir.
- **Isolamento:** toda consulta filtra pelo usuário da sessão; recurso de outro usuário responde \`404\`.
- **Erros:** sempre no formato \`ApiError\` (\`{ "error": { "code", "message", "fields?" } }\`).

## APIs externas consumidas

Todas **gratuitas e sem chave**, consumidas **somente pelo back-end** (o navegador nunca as chama diretamente) e expostas ao front pelas rotas \`/api/destinations/*\` e pelo enriquecimento automático de \`/api/trips\`.

- [Open-Meteo Geocoding](https://open-meteo.com/en/docs/geocoding-api) — autocomplete de destinos (cidade, estado, país, coordenadas). *CC BY 4.0.*
- [Open-Meteo Forecast](https://open-meteo.com/en/docs) — temperatura prevista (período todo em até 16 dias). *CC BY 4.0 — "Dados meteorológicos: Open-Meteo".*
- [Open-Meteo Archive](https://open-meteo.com/en/docs/historical-weather-api) — temperatura histórica (mesmas datas de um ano anterior). *CC BY 4.0.*
- [AwesomeAPI](https://docs.awesomeapi.com.br/api-de-moedas) — cotação moeda → R$ (fonte primária). *Uso gratuito.*
- [ExchangeRate-API](https://www.exchangerate-api.com) (open access) — cotação, 1º fallback (cobre moedas que a AwesomeAPI não tem, como IDR). *Exibir "Cotações por ExchangeRate-API".*
- [Frankfurter](https://frankfurter.dev) (dados do BCE) — cotação, 2º fallback. *Uso gratuito.*
- [Wikipedia / MediaWiki](https://www.mediawiki.org/wiki/API:Main_page) — foto de capa sugerida do destino. *Texto CC BY-SA.*
- [Wikimedia Commons](https://commons.wikimedia.org) — autor e licença de cada foto. *CC BY / CC BY-SA (crédito obrigatório).*
- [flagcdn](https://flagcdn.com) — bandeira do país.
- [world-countries](https://www.npmjs.com/package/world-countries) — nome do país em português e moeda principal (dataset estático, sem rede). *ODbL 1.0.*

**Como o back se protege das APIs externas:** timeout de 5 s por chamada, \`User-Agent\` identificando o projeto, cache em duas camadas — memória (resposta rápida) e **Data Cache do Next**, persistente e compartilhado entre instâncias (cotação 1 h, previsão 3 h, geocoding e fotos 7 dias, clima histórico e créditos 30 dias; só respostas bem-sucedidas são guardadas), pausa automática quando um serviço responde \`429\` (\`Retry-After\`) e **erro nunca vira exceção** — uma API fora do ar resulta em \`null\` naquele bloco, sem derrubar a rota.

## Enriquecimento automático de viagens

\`POST /api/trips\` e \`PATCH /api/trips/{id}\` usam o mesmo serviço de insights para completar a viagem quando o destino é geolocalizado:
moeda e cotação, temperatura média do período e capa (Wikipedia). Valores enviados pelo cliente sempre vencem, e **falha de API externa nunca impede salvar**.

## Erros

- \`VALIDATION_ERROR\` (**400**) — Body/query inválido (inclui JSON malformado, corpo vazio ou grande demais)
- \`UNAUTHORIZED\` (**401**) — Sem sessão, sessão inválida/expirada ou usuário inexistente (nos dois últimos casos a resposta também expira o cookie \`triply_session\`)
- \`INVALID_CREDENTIALS\` (**401**) — E-mail ou senha incorretos no login
- \`FORBIDDEN\` (**403**) — \`Origin\` da requisição diferente do host da aplicação (proteção contra CSRF)
- \`NOT_FOUND\` (**404**) — Recurso inexistente **ou de outro usuário**
- \`EMAIL_IN_USE\` (**409**) — E-mail já cadastrado
- \`TOO_MANY_REQUESTS\` (**429**) — Muitas tentativas de login falhas (com \`Retry-After\`)
- \`INTERNAL_ERROR\` (**500**) — Erro inesperado (detalhes só no log do servidor)
- \`EXTERNAL_API_ERROR\` (**502**) — Serviço externo essencial fora do ar (só em \`destinations/search\`)

## Segurança

Senhas com **bcrypt**; o hash nunca sai em nenhuma resposta. E-mail sempre normalizado (\`trim\` + minúsculas). O login não revela qual campo estava errado e é limitado: **mais de 10 falhas em 15 minutos** (por e-mail+IP; também por IP e por e-mail) respondem \`429\` com \`Retry-After\`. O estado do limite fica no banco da aplicação — no Postgres vale para todas as instâncias (funciona em serverless); no banco em memória vale só para a instância — e e-mail/IP são guardados só como HMAC.
Métodos de escrita exigem \`Content-Type: application/json\` e, quando o navegador envia \`Origin\`, ele precisa ser o próprio host (\`403\` caso contrário).
Capas enviadas por upload são validadas pelo tipo declarado **e** pelos bytes iniciais do arquivo (PNG/JPEG/WebP/GIF, até 2 MB) e servidas com \`X-Content-Type-Options: nosniff\`.
`.trim();
