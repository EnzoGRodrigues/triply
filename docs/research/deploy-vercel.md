# Deploy na Vercel (Hobby) + Postgres — pesquisa

Pesquisa em **2026-10-09**. Fontes oficiais lidas: `neon.com/faqs/postgres-nextjs-vercel-integration` (200), `vercel.com/docs/functions/limitations` (200), `vercel.com/docs/limits` (200), doc do drizzle-kit via Context7. **Não criei conta na Neon nem na Vercel**, então nada aqui foi testado contra um banco real de produção.

## 1. Postgres gratuito via Marketplace (integração Neon)

Instalar a integração em `vercel.com/marketplace/neon`, conectar o projeto, escolher região e plano.

**Variáveis injetadas (segundo a doc da Neon):**

- `DATABASE_URL` — conexão **pooled** (PgBouncer, hostname com `-pooler`).
- `DATABASE_URL_UNPOOLED` — conexão **direta**.
- `PGHOST`, `PGUSER`, `PGPASSWORD`, `PGDATABASE` etc. (variáveis `PG*`).

**`POSTGRES_URL`:** as fontes divergem. A doc atual da Neon **não lista** `POSTGRES_URL` como injetada por padrão (só como legado); um guia de terceiros diz que ela ainda aparece. **Verificar na aba Settings → Environment Variables do projeto depois de instalar.** Tutoriais antigos do drizzle usam `POSTGRES_URL`; não seguir esses.

**Preview:** com *preview branching* ligado, a Neon cria um branch por deploy de preview e injeta a string nesse deploy. Produção fica isolada.

## 2. `pg` ou `@neondatabase/serverless`?

O projeto já tem `pg ^8.23.1` no `package.json`.

**Recomendação: manter `pg`**, com a `DATABASE_URL` **pooled**, nas rotas em **runtime Node.js** (padrão do App Router no Vercel). Pontos de atenção:

- **Pool pequeno por instância:** `new Pool({ connectionString, max: 1–5 })`. Cada instância de função abre suas conexões; o pooler da Neon absorve o resto.
- **Fechar conexões ociosas antes da instância suspender:** a Vercel recomenda o helper `attachDatabasePool` (guia "connection pooling with functions"). Citado pela doc da Neon; **não li o código do helper**.
- **Usar `@neondatabase/serverless` só se a rota rodar em Edge runtime.** Não é o caso padrão aqui, e o Drizzle funciona com ambos.

Não testei `pg` contra a Neon (sem conta). Essa recomendação é de doc, não de teste.

## 3. Limites do plano Hobby (doc oficial, `vercel.com/docs/functions/limitations`)

| Item | Hobby | Impacto no Triply |
|---|---|---|
| **Payload (request OU response) de função** | **4,5 MB** — acima disso: `413 FUNCTION_PAYLOAD_TOO_LARGE` | **Crítico** para `POST /api/trips/{id}/cover` (upload de imagem). Redimensionar/comprimir no cliente (ex.: JPEG ≤ 1600 px, ≤ 3 MB) antes do envio, ou usar upload direto (Blob) |
| Duração máxima de função | **300 s** (default e máximo) | Sobra para as chamadas externas (timeout ~5 s do SPEC §6) |
| Memória máxima | 2 GB | Folgado |
| Tamanho descompactado | 250 MB | Folgado |

Os limites de *builds por hora* e *deploys por dia* existem para Hobby (em `vercel.com/docs/limits`), mas não os verifiquei na tabela.

## 4. Migrações com drizzle-kit contra produção

Config (padrão da doc do drizzle, validado via Context7):

```ts
// drizzle.config.ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/server/db/schema.ts', // ajustar ao caminho real
  out: './drizzle',
  dbCredentials: { url: process.env.DATABASE_URL_UNPOOLED! },
});
```

Rodar **uma vez, do seu computador**, com a URL de produção **só no ambiente da sessão** (nunca no repo):

```bash
DATABASE_URL_UNPOOLED='postgres://...' npx drizzle-kit migrate
```

Recomendações:

- Usar a **URL unpooled** para DDL/migrações (evita problemas de sessão e lock com o pooler). É a recomendação da Neon para migrações, e a mesma que eu adotaria aqui. Não testei o efeito do PgBouncer em migração.
- Não rodar `migrate` no *build* da Vercel. Migração manual evita que um deploy quebre o banco.
- O `drizzle.config.ts` atual do repo **não foi lido** nesta pesquisa; conferir se já existe antes de criar outro.
- `DATABASE_URL_UNPOOLED` e `DATABASE_URL` nunca em arquivo versionado. `.env.example` deve listar só os nomes.

## Resumo para decisão

1. Instalar Neon pelo Marketplace; confirmar as variáveis no painel (`DATABASE_URL`, `DATABASE_URL_UNPOOLED`; `POSTGRES_URL` pode não existir).
2. Manter `pg` com `DATABASE_URL` pooled, runtime Node, pool `max` baixo.
3. Redimensionar a capa no cliente para caber em 4,5 MB (limite do plano Hobby).
4. Migrar com `drizzle-kit migrate` usando `DATABASE_URL_UNPOOLED` a partir da máquina local.
