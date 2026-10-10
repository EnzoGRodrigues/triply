# Deploy do Triply via CLI (Vercel + Neon) — sequência de comandos

Pesquisa em **2026-10-09**. Versões testadas: Vercel CLI **63.1.2** (`npx vercel@latest`), neonctl **8.3.5** (`npx neonctl@latest`).

**Como foi validado:** só a ajuda da CLI (`--help`, exemplos, listas de subcomandos). **Não fiz login, não criei projeto nem banco**, então nenhum comando autenticado foi executado. Cada passo abaixo está marcado:

- **[V]** verificado na ajuda da CLI (flag/subcomando existe nesta versão).
- **[D]** documentado/inferido, **não executado** (depende de login ou de ambiente real). Conferir antes de confiar.
- **[USUÁRIO]** exige navegador ou confirmação humana.

Uso de `npx vercel@latest` em vez de instalar global. Para não repetir o download a cada linha, depois de conferir pode-se usar `npm i -g vercel neonctl` — mas isso muda o ambiente, então fica como opção do usuário.

Observações de ambiente: `vercel whoami` retornou **"Logged out"**. Chamadas com `--help` no meio de subcomandos (ex.: `vercel env add --help`) não funcionam nesta versão; use a ajuda do pai (`vercel env`, `vercel integration`, `vercel storage`). `vercel install` e `vercel integration discover` **ficam aguardando entrada** sem login — não rodar sem TTY/login.

---

## 1. Login — [USUÁRIO]

```bash
# Rodar no seu terminal (o `!` do Claude Code também funciona)
npx vercel@latest login
```
- [V] `vercel login [email or team id]` existe. [D] o fluxo é **device/browser**: a CLI mostra uma URL + código; você confirma no navegador. Não consigo fazer isso por aqui.
- Alternativa sem navegador para automação: token pessoal em `vercel.com/account/tokens` e `--token <TOKEN>` (flag global, [V]) ou `VERCEL_TOKEN` no ambiente. Token é segredo: não colar no repo.

Neon (ver §6) também tem login por navegador: `npx neonctl@latest login` [V].

## 2. Criar/linkar o projeto — sem prompts

```bash
cd /Users/enzo-rodrigues/dev/facul/triply
npx vercel@latest project list                       # [V] lista projetos do escopo atual
npx vercel@latest project create triply              # [V] "project create name" existe
npx vercel@latest link --yes --project triply --team <TEAM_SLUG_OU_ID>   # [V]
```
- [V] `link --yes --team <id> --project <name>` é o modo CI/agente da própria ajuda (sem perguntas).
- Escopo: se a conta for pessoal, omitir `--team`. Descobrir o slug com `npx vercel@latest teams ls` [V existe; não executado].
- `project create` [V] falha se o nome já existir: nesse caso pular e só fazer o `link`.
- Gera `.vercel/project.json` (não versionar: confirmar que está no `.gitignore`).

## 3. Postgres Neon — via integração Vercel

**Caminho A (integração Marketplace, pela CLI):**

```bash
npx vercel@latest integration add <integrationSlug>/<productSlug>   # [V] formato "acme/acme-redis" na ajuda
```
- [V] `integration add` instala um produto do Marketplace. [V] o slug de exemplo na ajuda é `acme/acme-redis`; o slug real da Neon **não consegui descobrir** (`integration discover neon` trava sem login). Obter com: `npx vercel@latest integration discover neon` após login, ou pelo marketplace `vercel.com/marketplace/neon`. [D] provavelmente `neon/neon` — **confirmar**.
- [V] `integration accept-terms` existe e **exige terminal interativo e confirmação humana** → [USUÁRIO] se o Marketplace pedir termos.
- [V] `integration resource connect <nome>` conecta um recurso ao projeto atual (ex.: depois de criar no painel). [D] a criação do recurso Neon (plano/região) pode exigir o navegador.
- [V] `storage status` mostra quais variáveis estão conectadas; é a forma de checar depois.
- Variáveis esperadas (doc Neon, ver `deploy-vercel.md`): `DATABASE_URL` (pooled) e `DATABASE_URL_UNPOOLED`. [D] Podem também vir `PG*`. **Conferir com** `npx vercel@latest env ls`.

**Caminho B (recomendado se A travar): Neon direto com neonctl** — §6. Mais previsível, e as URLs vão para o Vercel com `env add`.

Não consegui confirmar `vercel storage create --type ...` para Neon (a ajuda só mostra `--type blob` como exemplo). Não usar para Postgres.

## 4. Variáveis de ambiente — `env add` / `env pull`

```bash
# JWT_SECRET (gerar localmente, não imprimir no log)
JWT=$(openssl rand -hex 32)
printf '%s' "$JWT" | npx vercel@latest env add JWT_SECRET production --yes   # [D] valor via stdin
printf '%s' "$JWT" | npx vercel@latest env add JWT_SECRET preview --yes      # [D]
printf '%s' "$JWT" | npx vercel@latest env add JWT_SECRET development --yes  # [D]
```
- [V] `vercel env add name [environment]`; [V] a ajuda traz `vercel env add API_URL production,preview,development` (várias envs de uma vez, separadas por vírgula). Pode-se usar: `printf '%s' "$JWT" | npx vercel@latest env add JWT_SECRET production,preview,development`. [D] o valor via **stdin** (pipe) é o caminho sem prompt; **não testado**. Se pedir interação, usar `--value`? → **não confirmado** que existe; testar antes.
- [V] `env ls` (`env list`) para conferir. [V] `env pull` gera `.env.local` (default) com as variáveis do projeto:
  ```bash
  npx vercel@latest env pull .env.local --yes   # [V] pull [filename]; --yes não confirmado para pull
  ```
- `.env.local` contém segredos: manter no `.gitignore` (já deve estar).
- Repetir `env add` para `DATABASE_URL` / `DATABASE_URL_UNPOOLED` **só se não vierem da integração** (caminho B).

## 5. Deploy de produção e URL

```bash
npx vercel@latest deploy --prod --yes           # [V] --prod e --yes existem
# URL: o comando imprime a URL no stdout. Para capturar:
URL=$(npx vercel@latest deploy --prod --yes)     # [D] stdout contém a URL; conferir na 1ª vez
# alternativa com saída estruturada:
npx vercel@latest deploy --prod --yes --json     # [V] --json existe; [D] chave do URL no JSON não confirmada
npx vercel@latest inspect "$URL"                 # [V] mostra detalhes do deployment
```
- [V] `--no-wait` existe se não quiser esperar o build.
- [V] o exemplo da ajuda mostra `vercel > deployment-url.txt` para gravar a URL em arquivo.
- O build roda **na Vercel** (Next.js 16). Não é preciso rodar `npm run build` localmente (regra do projeto).
- Se o projeto não estiver linkado, `deploy` pergunta — por isso o `link --yes` do §2 vem antes.

## 6. Alternativa: Neon direto com neonctl (sem integração)

```bash
npx neonctl@latest login                                          # [USUÁRIO] navegador [V]
npx neonctl@latest projects create --name triply --region-id aws-us-east-1 --pg-version 17 --no-secrets   # [V] flags existem; --no-secrets [V] (default inclui segredos)
```
- [V] `--region-id` aceita: aws-us-west-2, aws-ap-southeast-1, aws-ap-southeast-2, aws-eu-central-1, aws-us-east-2, aws-us-east-1, azure-eastus2. Escolher `aws-us-east-1` (ou `aws-sa-east-1` se existir — **não está na lista da ajuda**, não usar sem checar; a lista é a fonte).
- [V] `--pg-version` 14–19. Usar 17 (ou 16).
- Pegar o `project-id` com `npx neonctl@latest projects list` [V].
- Connection strings (usar `--project-id` explícito):
  ```bash
  PID=<project-id>
  DATABASE_URL=$(npx neonctl@latest cs main --project-id $PID --pooled --database-name neondb --role-name neondb_owner)   # [V] flags --pooled, --database-name, --role-name
  DATABASE_URL_UNPOOLED=$(npx neonctl@latest cs main --project-id $PID --database-name neondb --role-name neondb_owner)  # [V]
  ```
  - [V] `cs`/`connection-string [branch]`; default do branch é `main` [D] (confirmar com `neonctl branches list`).
  - [V] `--ssl` default `require`. Manter.
- Levar para o Vercel (nunca imprimir o valor):
  ```bash
  printf '%s' "$DATABASE_URL" | npx vercel@latest env add DATABASE_URL production,preview,development --yes
  printf '%s' "$DATABASE_URL_UNPOOLED" | npx vercel@latest env add DATABASE_URL_UNPOOLED production,preview,development --yes
  ```
  [D] Preview com branch isolado é recurso da integração; no caminho B, a preview usa a mesma URL de produção — **decidir** se é aceitável para o trabalho (provavelmente não; criar `neon branches create --name preview` e usar a URL dela em preview).
- Não há `--secrets` na saída: pegar a string diretamente pelo `cs`, não pelo JSON do `projects create`.

**Chave de API para automação (sem navegador depois):** `npx neonctl@latest api-keys create` [V] — "a chave é mostrada uma vez". [USUÁRIO] o primeiro login ainda é navegador.

## 7. Migrações e seed (depois do banco pronto)

Ver `deploy-vercel.md` §4. Em resumo, localmente:
```bash
DATABASE_URL_UNPOOLED="$(npx neonctl@latest cs main --project-id $PID --database-name neondb --role-name neondb_owner)" npx drizzle-kit migrate
```
Não colocar a URL em arquivo versionado.

---

## Quem precisa fazer o quê

| Passo | Quem | Obs |
|---|---|---|
| Login Vercel (`vercel login`) | **USUÁRIO** (navegador) | ou token em `VERCEL_TOKEN` |
| Login Neon (`neonctl login`) | **USUÁRIO** (navegador) | ou API key via `--api-key` / `NEON_API_KEY` |
| Aceitar termos do Marketplace (`integration accept-terms`) | **USUÁRIO** (TTY + confirmação) | só se o caminho A for usado |
| Criar projeto + link | Agente | `project create` + `link --yes` |
| Neon (caminho B) criar projeto/branch/strings | Agente, após login | `neonctl projects create`, `cs` |
| `env add` JWT_SECRET e DATABASE_URL* | Agente | valor via stdin, não imprimir |
| `deploy --prod --yes` | Agente | URL do stdout |

**Recomendação:** caminho B (neonctl) — menos passos de navegador, e cada comando acima é de fato [V] ou marcado [D] para conferir na 1ª execução. O caminho A depende de slug e termos que não consegui confirmar.

## Pendências não verificadas

1. Slug exato da integração Neon no Marketplace (`integration discover neon`).
2. Se `env add` aceita o valor por stdin sem prompt, em modo não interativo.
3. Chave do URL no `deploy --json`.
4. Lista de regiões do neonctl não inclui `sa-east-1`; avaliar latência para o Brasil (usuários no BR) com as opções disponíveis.
