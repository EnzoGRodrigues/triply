@AGENTS.md

# Triply — regras do projeto

Web app de viagens (trabalho de DSW3). **Leia `docs/SPEC.md` antes de começar** — telas, design system, modelo de dados e API estão lá. O contrato front ↔ back é `src/types/api.ts` (não altere sem falar com o orquestrador).

## Time (Maestri)
- O orquestrador é o terminal **"Claude Code"**. Rode `maestri list` para ver quem está conectado.
- Ao terminar uma tarefa (ou se ficar bloqueado), reporte com `maestri ask "Claude Code" "<resumo>"`.
- Respeite a tabela de donos de arquivos em `docs/SPEC.md` §7.

## Ambiente
- O servidor de desenvolvimento **já roda** em http://localhost:3000 (terminal "Motor" no canvas). **Não inicie outro `next dev`** e não rode `npm run build` (o orquestrador faz o build de integração). Logs do servidor: `tail -n 100 .dev.log`.
- Banco: **em memória** por padrão (`DB_DRIVER=memory`, parte 1 do trabalho) — reiniciar o servidor volta os dados ao seed. O Postgres local (banco `triply`, `DATABASE_URL` em `.env.local`) só é usado com `DB_DRIVER=postgres` (parte 2).
- Antes de reportar: `npx tsc --noEmit` e `npm run lint` sem erros nos seus arquivos.
- Dependência nova: `npm install <pacote>` (nunca `npm install` sem argumentos, nunca apague o `package-lock.json`).
- **Não faça commits** — o orquestrador versiona.

## Convenções
- TypeScript estrito, sem `any` solto. Componentes React em PascalCase, um por arquivo.
- Todo texto visível ao usuário em **português do Brasil**.
- Imports com alias `@/` (`@/types/api`, `@/components/...`).
- Next.js 16: antes de usar uma API do framework, confira em `node_modules/next/dist/docs/`.
