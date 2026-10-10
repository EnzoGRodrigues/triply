# Relatório de QA — Triply

**Responsável:** Lince (QA) · **Data:** 09/10/2026 · **Build testado:** servidor de desenvolvimento em `http://localhost:3000` (Next.js 16.4, Turbopack), branch `feat/web-app-triply`
**Método:** navegador (portal Maestri "QA Browser", WebKit) em 1440×900, 768×1024, 390×844 e 320×640 + `curl` contra a API + consultas `psql` para conferir persistência. Nenhum código de aplicação foi alterado.

> **Atualização — reteste (2ª rodada, 09/10/2026):** dos 16 bugs abaixo, **13 foram corrigidos, 2 ficaram mitigados/parciais (BUG-11 e BUG-16), 0 não corrigidos e o BUG-06 foi aceito como limitação**; nenhuma regressão encontrada. Veja a seção **[7. Reteste](#7-reteste-2ª-rodada)** no final. As seções 1 a 6 abaixo registram a 1ª rodada, como foram escritas.
>
> **Atualização — banco em memória (3ª rodada, 10/10/2026):** a camada de dados passou a ser em memória por padrão. Resultado: **aprovado com ressalvas** (0 P1, 1 P2 de risco de implantação, 4 P3). Veja a seção **[8. Reteste — banco em memória](#8-reteste--banco-em-memória)** no final.

---

## 1. Resumo

O app está **sólido e pronto para a apresentação**. Os fluxos principais (cadastro, login, planejar, editar, excluir, registrar, detalhe, perfil) funcionam de ponta a ponta no desktop e no mobile, a fidelidade ao Figma é alta e a API passou em todos os testes de autorização e validação (401, IDOR, mass-assignment, XSS, SQLi, uploads inválidos, payloads grandes).

**Não encontrei nenhum bug P1.** Os dois pontos que mais merecem atenção antes de apresentar:

| Sev. | Qtde | Bugs |
|---|---|---|
| **P1** (crítico) | **0** | — |
| **P2** (importante) | **2** | BUG-01, BUG-02 |
| **P3** (menor) | **14** | BUG-03 a BUG-16 |
| **Total** | **16** | |

**P2 em uma linha cada**
- **BUG-01 (front):** no mobile, a tela de detalhe da viagem quebra por completo se o relato tiver um texto longo sem espaços (um link do Google Maps de 86 caracteres já basta): a página passa de 390 px para 749–3188 px e o conteúdo some da tela.
- **BUG-02 (back):** o autocomplete põe lugarejos homônimos antes da cidade famosa: digitar "Bangkok" lista uma vila da Indonésia primeiro; "Madri" lista Afeganistão e Índia antes de Madrid; "New York" nem encontra Nova York.

**Pontos fortes:** segurança da API (nenhuma falha de autorização), validação consistente com mensagens em pt-BR, enriquecimento por APIs externas coerente (moeda/cotação/clima/imagem corretos para todos os 7 destinos testados, com fontes e licenças exibidas), estados vazios, diálogos de confirmação, responsividade e acessibilidade básica (labels, `aria-invalid`, foco inicial seguro em "Cancelar").

**Observação sobre a Sarah:** durante a sessão criei por engano **um** plano ("Lisboa, Portugal") logado como Sarah, contrariando a orientação de usar usuários próprios. Usei-o para testar edição/exclusão com confirmação e o removi pela UI; o hash do conjunto de viagens dela ficou **idêntico ao snapshot inicial** (7 viagens, `9c5cb0fb…`). Depois disso, toda escrita foi feita só em usuários `qa+…`.

---

## 2. Matriz de testes

Legenda: ✅ passou · ❌ falhou (ver bug) · ⚠️ passou com ressalva (ver bug) · ⏭ não testado / não foi possível

### 2.1 Autenticação e proteção de rotas

| # | Caso | Resultado | Evidência |
|---|---|---|---|
| A1 | Login: campos vazios → erro por campo ("Informe seu e-mail." / "Informe sua senha.") com `aria-invalid` | ✅ | `img/login-vazio-desktop.jpg` |
| A2 | Login: e-mail inválido → "Informe um e-mail válido." | ✅ | — |
| A3 | Login: credenciais erradas → toast "E-mail ou senha incorretos.", e-mail preservado | ✅ | `img/login-credencial-errada-desktop.jpg` |
| A4 | Login correto → `/perfil`; `?next=/planos` volta para `/planos` | ✅ | — |
| A5 | Open redirect: `?next=//evil.com`, `?next=https://evil.com`, `?next=/\evil.com` → sempre `/perfil` | ✅ | — |
| A6 | Logado acessando `/login` ou `/cadastro` → `/perfil` | ✅ | — |
| A7 | Cadastro: vazio, e-mail inválido, senhas diferentes, senha curta, nome de 1 letra, e-mail já usado (inclusive com outra caixa) | ✅ | `img/cadastro-email-em-uso-desktop.jpg` |
| A8 | Cadastro: "Confirmar senha" vazio não é sinalizado | ⚠️ | BUG-04 · `img/cadastro-vazio-desktop.jpg` |
| A9 | Cadastro válido → loga e vai para `/perfil` | ✅ | — |
| A10 | Logout pela UI → `/login`, `GET /api/auth/me` → 401 | ✅ | — |
| A11 | Voltar do navegador após logout exibe o perfil em cache | ❌ | BUG-03 · `img/bug-voltar-apos-logout-desktop.jpg` |
| A12 | Sem sessão: `/perfil`, `/planos`, `/planos/novo`, `/planos/{id}`, `/registrar`, `/viagens/{id}` → 307 `/login?next=…` | ✅ | — |
| A13 | Cookie de usuário removido do banco → UI redireciona para `/login?next=…`, API responde 401 | ✅ | — |
| A14 | Rate limit / bloqueio em tentativas repetidas de login | ❌ | BUG-10 |

### 2.2 Perfil, planos, registro e detalhe (UI)

| # | Caso | Resultado | Evidência |
|---|---|---|---|
| P1 | Perfil da Sarah: 2 cidades / 2 países / 2 realizadas / 5 planejadas = banco | ✅ | `img/perfil-sarah-desktop.jpg` |
| P2 | Stats após registrar/excluir (0 → 2 → 1; plural/singular "1 Cidade", "1 País") | ✅ | `img/perfil-apos-registro-desktop.jpg` |
| P3 | Regra de stats via API: cidades distintas sem diferenciar caixa, países por `countryCode`, destino livre conta como cidade e não como país | ✅ | — |
| P4 | Estado vazio do usuário novo: perfil, planos e registrar | ✅ | `img/perfil-vazio-desktop.jpg` |
| P5 | Planejar: 7 destinos via autocomplete (Lisboa, Bali, Buenos Aires, Tóquio, Bangkok, Gramado, Paris) — ver 2.4 | ✅ | `img/planos-qa-7-desktop.jpg` |
| P6 | Datas: volta antes da ida → erro "A volta não pode ser antes da ida." ao salvar, nada gravado | ✅ | `img/planos-novo-erro-datas-desktop.jpg` |
| P7 | Datas: painel de insights fica desatualizado/inconsistente enquanto as datas são inválidas | ⚠️ | BUG-05 · `img/planos-novo-volta-antes-ida-desktop.jpg` |
| P8 | Upload de capa (PNG 2400×1600, 4 MB → JPEG 1280×853 no cliente → gravado como `upload`, servido por `/api/trips/{id}/cover`) | ✅ | `img/upload-capa-previa-desktop.jpg`, `img/planos-com-capa-upload-desktop.jpg` |
| P9 | Upload inválido: `.txt`, `.pdf`, PNG corrompido rejeitados com mensagem pt-BR; SVG é rasterizado para JPEG (sem script) | ✅ | `img/upload-invalido-desktop.jpg` |
| P10 | Editar plano: datas/hospedagem/transporte persistem; clima recalculado quando as datas mudam (jun 18–32 °C → dez 8–13 °C) | ✅ | `img/planos-editar-lisboa-desktop.jpg` |
| P11 | Editar plano: trocar o destino atualiza país, moeda, cotação, clima e capa (Bali → Madrid) | ✅ | — |
| P12 | Editar plano: novo destino sem foto mantém a foto do destino antigo | ❌ | BUG-07 |
| P13 | Destino digitado à mão (sem escolher sugestão) → salva sem geodados; editar o texto depois de escolher invalida a seleção | ✅ | `img/texto-livre-sem-resultado-desktop.jpg` |
| P14 | Excluir plano: diálogo de confirmação com foco em "Cancelar"; Esc fecha sem excluir; confirmar exclui | ✅ | `img/excluir-confirmacao-desktop.jpg` |
| P15 | Duplo clique em Salvar (40 ms de intervalo) cria 1 plano só | ✅ | — |
| P16 | Registrar: lista de planejadas ordenada, botão "Realizado" desabilitado sem seleção | ✅ | `img/registrar-lista-desktop.jpg` |
| P17 | Registrar 1 e depois 2 viagens: estrelas, companhia, máscara de gastos (`R$ 12.345,67`, letras ignoradas, teto R$ 9.999.999.999,99), experiência; "Salvar e continuar"; "Pular" | ✅ | `img/registrar-dialogo-preenchido-desktop.jpg` |
| P18 | Fechar o diálogo na 2ª de 2 viagens descarta tudo sem aviso | ⚠️ | BUG-14 |
| P19 | Registrar permite marcar como "Realizada" viagem com datas futuras | ⚠️ | BUG-15 |
| P20 | Detalhe: hospedagem, atividades, período, cotação, temperatura, gastos, experiência, estrelas, companhia/transporte; sem relato mostra texto orientando "Editar relato" | ✅ | `img/detalhe-espanha-desktop.jpg`, `img/detalhe-paris-sem-relato-desktop.jpg` |
| P21 | Editar relato: pré-preenchido, salva, limpar gastos/companhia funciona | ✅ | `img/editar-relato-dialogo-desktop.jpg` |
| P22 | Excluir viagem realizada: confirmação, stats atualizam | ✅ | `img/excluir-viagem-realizada-desktop.jpg` |
| P23 | XSS em campo de texto (`<img src=x onerror=alert(1)>`, `<script>`) exibido como texto, nada executa | ✅ | `img/detalhe-toquio-xss-desktop.jpg` |
| P24 | Detalhe/edição com ID inexistente, malformado ou de outro usuário → tela "não encontrada" sem vazar dados | ✅ | — |
| P25 | Essas telas respondem HTTP 200 em vez de 404 | ⚠️ | BUG-06 |
| P26 | Página 404 própria, em pt-BR | ✅ | `img/404-desktop.jpg` |
| P27 | Detalhe no mobile com texto longo sem espaços | ❌ | BUG-01 · `img/texto-longo-detalhe-mobile.jpg` |

### 2.3 Autocomplete e teclado

| # | Caso | Resultado | Evidência |
|---|---|---|---|
| T1 | Setas ↑/↓ movem a opção ativa (`aria-activedescendant`), Enter seleciona, Esc fecha, ↓ reabre; região `aria-live` anuncia "N sugestões" / "Nenhum destino encontrado" | ✅ | — |
| T2 | Ranking das sugestões | ❌ | BUG-02 · `img/bug-ranking-madri-desktop.jpg`, `img/ac-bangkok-desktop.jpg` |
| T3 | Foco visível: regra global `:focus-visible` (outline 2 px primária, offset 2 px) existe no CSS | ✅ (código) | Não foi possível simular Tab real — ver §5 |

### 2.4 Qualidade dos dados externos por destino (UI e API conferidas entre si)

| Destino escolhido | País / bandeira | Moeda e cotação (fonte) | Clima (período) | Imagem + crédito | Veredito |
|---|---|---|---|---|---|
| Lisboa, Portugal | Portugal ✔ | 1 EUR = R$ 5,58 (AwesomeAPI) | ≈ 18 a 32 °C (jun, histórico) | Lisboa, Deensel · CC BY 2.0 | ✅ |
| Bali, Indonésia | Indonésia ✔ | 1 IDR = R$ 0,00028 (ExchangeRate-API) | ≈ 17 a 27 °C (jul) | Tanah Lot, CEphoto/Uwe Aranas · CC BY-SA 3.0 | ✅ (resolve o homônimo da Índia) |
| Buenos Aires, Argentina | Argentina ✔ | 1 ARS = R$ 0,0033 (AwesomeAPI) | ≈ 7 a 14 °C (jun, inverno) | Puerto Madero, Deensel · CC BY 2.0 | ✅ |
| Tóquio, Japão | Japão ✔ | 1 JPY = R$ 0,032 (AwesomeAPI) | ≈ 11 a 19 °C (abr) | Shinjuku, Morio · CC BY-SA 3.0 | ✅ |
| Banguecoque, Tailândia | Tailândia ✔ | 1 THB = R$ 0,15 (AwesomeAPI) | ≈ 23 a 32 °C (dez) | Bangkok, Ninara · CC BY 2.0 | ✅ (mas ver BUG-02 para chegar até ela digitando "Bangkok") |
| Gramado - Rio Grande do Sul | Brasil ✔ | "R$ 1,00 (moeda local)", sem chamada externa | ≈ 4 a 14 °C (jul) | Gramado, Felipe Valduga · CC BY 2.0 | ✅ |
| Paris, França | França ✔ | 1 EUR = R$ 5,58 (AwesomeAPI) | ≈ 18 a 30 °C (ago) | Torre Eiffel, Jeremy Segrott · CC BY 2.0 | ✅ |

Capturas do painel de cada um: `img/painel-lisboa-desktop.jpg`, `painel-bali-…`, `painel-buenosaires-…`, `painel-toquio-…`, `painel-bangkok-…`, `painel-gramado-…`, `painel-paris-…`.
Todos mostram fonte e link (AwesomeAPI/ExchangeRate-API, Open-Meteo CC BY 4.0, autor + licença da foto, Wikipedia) e o texto "média das mesmas datas no ano anterior" / "previsão do tempo" conforme o caso. Valores persistidos no banco conferem com o painel.
Quando a Wikimedia limitou as requisições (HTTP 429), o painel mostrou "Indisponível" para a imagem sem quebrar o resto (ver BUG-11).

### 2.5 API / segurança (`curl`)

| # | Caso | Resultado |
|---|---|---|
| S1 | 12 rotas privadas sem sessão → **401** JSON `UNAUTHORIZED`; cookie lixo e JWT `alg:none` → 401 | ✅ |
| S2 | **IDOR** — usuário B em viagem de A: `GET`, `PATCH`, `DELETE`, `GET /cover`, `POST /complete` → **404** `NOT_FOUND` (e `GET` em viagem da Sarah → 404); B continua vendo a lista vazia; dados de A íntegros | ✅ |
| S3 | `POST /complete` com um ID alheio no meio → 404 e **nada alterado** (transação atômica) | ✅ |
| S4 | Mass-assignment: `status`, `userId`, `rating` no `POST /trips` e `status` no `PATCH` ignorados | ✅ |
| S5 | Validação 400 com `fields` em pt-BR: vazio, só espaços, 161 chars, volta<ida, data inexistente (`2027-02-30`), formato de data, transporte inválido, latitude 999, tMin>tMax, cotação negativa, rating 0/6, gastos negativos/1e15, relato 5001 chars, lista vazia/duplicada/UUID inválido no `complete`, array no body, tipos errados | ✅ |
| S6 | Corpo vazio / JSON malformado / 10 MB → 400 com mensagem (50 ms, sem estourar) | ✅ |
| S7 | `coverImage`: `http://`, `javascript:`, SVG, HTML, base64 inválido, 2,4 MB, 1 MB de bytes aleatórios com MIME png → 400 (valida também a assinatura do arquivo) | ✅ |
| S8 | XSS armazenado (`<img onerror>`, `<script>`, `"><svg onload>`) gravado literal e devolvido como texto/JSON | ✅ |
| S9 | SQLi inofensiva (`' OR 1=1 --`, `'; DROP TABLE trips; --`) em login, busca, IDs e campos de texto: sem efeito, tabelas intactas | ✅ |
| S10 | Login: mensagem idêntica para e-mail inexistente e senha errada; tempos equivalentes (≈ 0,1 s em 5 amostras cada) | ✅ |
| S11 | Senha > 72 caracteres → 400 (limite do bcrypt); e-mail normalizado (caixa) | ✅ |
| S12 | Cookie `triply_session`: `HttpOnly; SameSite=lax; Path=/; Max-Age=604800` (o `Secure` só em produção — conferir na Vercel) | ✅ |
| S13 | `/cover`: `Content-Type` real, `Content-Security-Policy: default-src 'none'`, `private, max-age=31536000, immutable` com `?v=`, `no-cache` sem `?v=` | ✅ |
| S14 | Respostas de dados com `Cache-Control: private, no-store`; métodos errados → 405; sem `Access-Control-Allow-Origin` para `Origin` malicioso | ✅ |
| S15 | `POST /api/trips` aceita `Content-Type: text/plain` | ❌ BUG-09 |
| S16 | Cabeçalhos de segurança ausentes | ❌ BUG-08 |
| S17 | Busca/insights: validação de `q` (2–100), `lat` sem `lon`, datas invertidas, `name` com URL/SSRF-like → 200 com blocos `null` (nada é requisitado) | ✅ |

### 2.6 Responsividade, visual (Figma) e conteúdo

| # | Caso | Resultado | Evidência |
|---|---|---|---|
| V1 | Sem scroll horizontal em 390 px nas 9 telas principais (exceto BUG-01); 768 px ok; 320 px ok exceto `/sobre` | ⚠️ | BUG-01, BUG-13 |
| V2 | Mobile: bottom nav (Perfil/Planos/Registrar), FAB "+", diálogo vira *bottom sheet*, formulários empilhados, botão "Salvar" fora da bottom nav | ✅ | `img/perfil-mobile.jpg`, `img/planos-mobile.jpg`, `img/registrar-dialogo-mobile.jpg`, `img/novo-fundo-mobile.jpg` |
| V3 | Login/Cadastro: desktop em duas colunas com painel de marca; mobile só o formulário (como no Figma) | ✅ | `img/login-mobile.jpg`, `img/cadastro-mobile.jpg` |
| V4 | Fidelidade ao Figma (tokens, Lexend/Roboto, botões, input *filled*, cards com foto "lavada", segmentado de transporte, stats, estrelas, checkbox, "Realizado") | ✅ | comparação com `docs/figma/*.png` |
| V5 | Card sem capa usa gradiente suave com pin; títulos longos quebram em 2 linhas sem estourar (em listas) | ✅ | `img/planos-sem-capa-desktop.jpg` |
| V6 | Contraste de placeholder e de mensagens de erro | ⚠️ | BUG-12 |
| V7 | Textos em pt-BR sem erros de ortografia nas telas do app; `<html lang="pt-BR">`; `<title>` por página | ✅ | exceto BUG-16 |
| V8 | `/sobre` e `/api-docs` (Scalar + `/api/openapi.json` 200) funcionam e são públicas | ✅ | `img/sobre-desktop.jpg`, `img/api-docs-desktop.jpg` |

---

## 3. Bugs

### P2 — importantes

#### BUG-01 · P2 · **Front (Aquarela)** — Detalhe da viagem quebra no mobile com texto longo sem espaços
**Passos**
1. Em 390 px de largura, abra `/viagens/{id}` de uma viagem realizada cujo "Minha experiência" contenha um link, ex.: `Fotos aqui: https://www.google.com/maps/place/Torre+Eiffel/@48.8583701,2.2922926,17z/data=!3m1!4b1 ótimo!` (também ocorre com 300 letras seguidas, ou com título/destino de uma palavra de ~85 letras).
**Esperado:** o texto quebra dentro do cartão e a página continua com a largura da tela.
**Obtido:** a página passa a ter `scrollWidth` de **749 px** (link do Maps), **3188 px** (300 letras) ou **1587 px** (destino de 85 letras) com viewport de 390 px. A coluna de conteúdo vira uma faixa larguíssima: a imagem/placeholder da capa fica gigante e ocupa a tela toda e o texto fica fora da área visível. Como o `body` tem `overflow-x: hidden`, não há nem barra de rolagem horizontal para chegar ao conteúdo.
**Isolado:** só "Minha experiência" (`<p class="whitespace-pre-line break-words">`) e o `<h1>` do título causam; hospedagem (200 chars) e atividades (400 chars) não (os `<dd>` têm `min-w-0`). No desktop não ocorre; os cards em `/perfil`, `/planos` e `/registrar` aguentam o mesmo texto.
**Sugestão:** `min-w-0` no contêiner da coluna de texto (item de grid/flex) e `overflow-wrap: anywhere` (ou `break-all`) no relato e no título — `break-words` sozinho não reduz o min-content.
**Evidência:** `img/texto-longo-detalhe-mobile.jpg`

#### BUG-02 · P2 · **Back (Alicerce)** — Ranking do autocomplete põe lugarejos antes de cidades famosas
**Passos:** em `/planos/novo` (ou `GET /api/destinations/search?q=…`) digite:
| Digitado | Resultado obtido (ordem) | Esperado |
|---|---|---|
| `Bangkok` | 1º **Bangkok, Java Oriental, Indonésia**; 2º Banguecoque, Tailândia | Banguecoque, Tailândia primeiro |
| `Madri` | 1º Madrī (Afeganistão), 2º Mādri (Índia), 3º Madri (Índia), 4º **Madrid, Espanha** | Madrid primeiro |
| `Tokyo` | Tokyo (Papua Nova Guiné), Tokyo (Nepal), Tōkyō Zan…, **Tóquio, Japão em 7º** | Tóquio primeiro |
| `New York` | New York (Reino Unido/Jamaica/Missouri)… **Nova York/NYC não aparece** | Nova Iorque, EUA |
**Por quê:** a regra "nome igual ao digitado → começa com → demais; mais populosos primeiro dentro de cada grupo" favorece qualquer lugar cujo nome seja *idêntico* ao texto, mesmo sem população, sobre a cidade real que o geocoder devolve com o nome em português ("Banguecoque", "Nova Iorque"). Quem digita o nome internacional (muito comum) escolhe sem querer o destino errado e recebe moeda/clima/foto errados (ex.: IDR/Java em vez de THB/Tailândia).
**Extra (ruído):** a lista traz aeroportos e POIs ("Santorini Airport", "Aeroporto Internacional de Foz do Iguaçu / Cataratas") e resultados aproximados pouco úteis ("Frei Paulo", "Diamante" ao buscar "São Paulo").
**Sugestão:** ordenar por `population` desc antes do critério de igualdade de nome (ou dar peso às duas coisas), filtrar `feature_code` de aeroporto/POI e/ou buscar também por `name` em inglês (`language=en`) e mesclar.
**Evidência:** `img/ac-bangkok-desktop.jpg`, `img/bug-ranking-madri-desktop.jpg`; saída de `curl` descrita acima.

### P3 — menores

| ID | Dono | Problema | Passos → esperado × obtido | Evidência |
|---|---|---|---|---|
| **BUG-03** | Front | Voltar do navegador após logout mostra o perfil em cache | Logado em `/perfil` → clicar "Sair" (vai para `/login`) → botão **Voltar** do navegador. **Esperado:** `/login` (ou redirecionamento). **Obtido:** `/perfil` com nome, estatísticas e viagens do usuário anterior e o botão "Sair" travado em *spinner*; `GET /api/auth/me` já devolve 401 e um *reload* redireciona corretamente. Em computador compartilhado expõe dados do usuário anterior (sobe para P2 nesse cenário). **Sugestão:** navegação "hard" (`window.location.assign('/login')`) no logout, ou `router.refresh()` + `Cache-Control: no-store` nas páginas autenticadas. | `img/bug-voltar-apos-logout-desktop.jpg` |
| **BUG-04** | Front | "Confirmar senha" vazio não recebe erro | `/cadastro` → clicar **Cadastrar** com tudo vazio. **Esperado:** erro nos 4 campos (o back devolve "Confirme a senha."). **Obtido:** só nome, e-mail e senha ficam em vermelho; confirmar senha fica sem erro (`aria-invalid` ausente). | `img/cadastro-vazio-desktop.jpg` |
| **BUG-05** | Front | Datas inválidas deixam o painel inconsistente | `/planos/novo` → escolher destino → Ida 10/06/2027 e Volta 01/06/2027. **Esperado:** erro imediato e `min` na Volta. **Obtido:** nenhum erro até clicar Salvar (que então bloqueia corretamente); enquanto isso o painel mostra "Para o período 10/06 – 01/06/2027" com a temperatura da *previsão dos próximos 7 dias* (dado antigo), pois a chamada de insights recebe 400. | `img/planos-novo-volta-antes-ida-desktop.jpg` |
| **BUG-06** | Front | Telas "não encontrada" respondem HTTP 200 | Logado, `GET /viagens/00000000-0000-0000-0000-000000000000` (ou `/planos/abc`) → **200** com a mensagem "Viagem não encontrada" (só `/naoexiste` dá 404). Esperado: 404 (`notFound()`), sobretudo para links/monitoramento. | — |
| **BUG-07** | Back/Front | Capa antiga fica quando o novo destino não tem foto | Editar plano "Bali" → trocar destino para "Madrī, Afeganistão" (sem foto na Wikipedia) → Salvar. **Obtido:** `country/currency/temp` atualizados, mas `cover_image` continua a foto de **Tanah Lot (Bali)** com `cover_image_source=wikipedia`. (Com destino que tem foto, ex. Madrid, a capa troca corretamente; o formulário mostra a capa antiga em "Capa atual do plano" até salvar.) **Esperado:** limpar a capa automática (fallback com gradiente). | — |
| **BUG-08** | Back (config) | Sem cabeçalhos de segurança | `curl -I /login`: ausentes `X-Frame-Options`/CSP `frame-ancestors` (páginas podem ser embutidas em iframe → clickjacking), `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`; `X-Powered-By: Next.js` exposto. **Sugestão:** `headers()` no `next.config.ts` e `poweredByHeader: false`. | — |
| **BUG-09** | Back | API aceita JSON com `Content-Type: text/plain` | `curl -X POST /api/trips -H 'Content-Type: text/plain' -H 'Origin: https://evil.com' -b cookie -d '{"destination":"CSRF"}'` → **201** (criou a viagem). Hoje o CSRF só é barrado pelo `SameSite=Lax` do cookie; ficaria exposto a requisições *same-site* de outro subdomínio. **Sugestão:** exigir `Content-Type: application/json` nos métodos de escrita e/ou checar `Origin`. (`application/x-www-form-urlencoded` já responde 400.) | — |
| **BUG-10** | Back | Sem limite de tentativas no login | Rajada de **50** `POST /api/auth/login` seguidos com senha errada para o mesmo e-mail: **50 × 401**, nenhum 429, sem atraso progressivo; logo depois a senha correta entra (200). Força bruta possível. Aceitável para o trabalho; documentar como limitação ou limitar por IP/e-mail. | — |
| **BUG-11** | Back | Wikimedia 429 faz a imagem sumir sem nova tentativa | Com várias consultas seguidas a `pt/en.wikipedia.org` retornaram **HTTP 429** (4 ocorrências no `.dev.log`); `GET /api/destinations/insights` devolveu `image: null` para Paris, Gramado, Londres e Nova Iorque (que têm foto) e o painel mostra "Indisponível" (para o Afeganistão, que não tem foto, também; a falha fica em cache por 30 s, segundo `docs/API.md`). Minutos depois, as mesmas buscas voltaram a trazer imagem. Em produção as chamadas saem de IPs compartilhados da Vercel — **risco para a demonstração**: ensaiar com antecedência (o cache de 1 dia ajuda), e/ou pré-aquecer os destinos da apresentação. O app degrada corretamente (200 + bloco `null`). | `.dev.log` |
| **BUG-12** | Front | Contraste abaixo de 4,5:1 | Placeholder (`text-muted/55` sobre `#E6E0E9`) ≈ **2,6:1**; mensagens de erro (`#E8170F` 12 px sobre `#EFEDF1`) = **3,96:1**. Sugestão: placeholder ≥ 70% e um vermelho um pouco mais escuro só para o texto de erro. | `img/cadastro-vazio-desktop.jpg` |
| **BUG-13** | Front | `/sobre` em 320 px: cabeçalho estoura | Largura 320 px: `scrollWidth` 366 px; o botão "Acessar o app" fica cortado à direita. | `img/sobre-320px-header.jpg` |
| **BUG-14** | Front | Fechar o diálogo no meio do registro múltiplo descarta tudo sem aviso | `/registrar` → marcar 2 viagens → Realizado → preencher a 1ª e "Salvar e continuar" → clicar **X** na 2ª. **Obtido:** diálogo fecha, nenhuma das duas é salva (o POST só ocorre no final), sem confirmação nem mensagem. Esperado: confirmar o descarte ou salvar o que já foi preenchido. | — |
| **BUG-15** | Back/Regra | Dá para registrar como "Realizada" uma viagem com datas futuras | Plano com Ida/Volta em 2027 marcado como realizado hoje (09/10/2026): detalhe mostra "Registrada em 09/10/2026" com período 2027. Se não for intencional, bloquear ou avisar quando `endDate` > hoje. | — |
| **BUG-16** | Front/Docs | Textos | (a) "**Toque** em um plano para editar." também no desktop (usar "Clique"/texto neutro); (b) `/sobre` diz que "o navegador nunca fala direto com as APIs externas", mas ele carrega bandeiras do `flagcdn.com` e fotos do `upload/thumb.wikimedia.org` diretamente (só dados vêm via back); (c) interface do Scalar em `/api-docs` está em inglês ("Server", "Authentication", "Client Libraries") e a tabela "Convenções" quebra palavra no meio ("Autentic·ação"). | `img/api-docs-desktop.jpg` |

### Já corrigido durante a sessão (só para confirmar no build de integração)
- Erro do Next no `.dev.log`: *"Route '/planos/[id]': Next.js encountered URL data `usePathname()` in a Client Component outside of `<Suspense>`"* (`Navbar.tsx:15`, `BottomNav.tsx:10`) — bloquearia o *prerender*/`next build` com Cache Components. Apareceu 4 vezes no primeiro acesso a `/planos/[id]` e **não se repetiu**; o front já criou `src/components/WithPathname.tsx` e hoje `usePathname` só existe nele. **Recomendo conferir no `npm run build` de integração** (eu não rodei build, conforme combinado).

---

## 4. Observações sem bug

- Reabrir o autocomplete com ↓ depois de Esc já avança uma opção (mantém o índice ativo) — comportamento aceitável.
- Realizadas concluídas na mesma chamada têm o mesmo `completed_at`; a ordem entre elas é a inversa da enviada.
- Marcar o texto "Cidade Inventada ZZ" (destino livre sem capa) sobrepõe levemente o ícone de pin decorativo do card — cosmético.
- `PATCH {}` devolve 200 e muda `updatedAt` (muda também o `?v=` da capa enviada, invalidando o cache do navegador) — inofensivo.
- Em `PATCH {"status":"realizada"}` o campo é ignorado em silêncio (200); poderia responder 400. Ignorar é seguro.
- Na tela de edição de plano o DOM tem um 2º `<form>` invisível (largura 0, sem `offsetParent`). Pelo comportamento, é a rota anterior preservada pelo Cache Components do Next 16 (hipótese minha, não confirmei no código); não aparece nem recebe foco, sem impacto visível.

## 5. Limitações do teste (o que **não** foi coberto)

- **Navegação real por Tab** e leitor de tela: a janela do portal fica oculta/sem foco, então Tab não move o foco e `:focus-visible` não ativa; validei o estilo de foco só lendo o CSS (`src/app/globals.css`) e conferi `aria-*` no DOM.
- **Enter para enviar formulário** não foi exercitado (limitação do portal, conforme aviso); usei clique no botão.
- **Erro 502 do geocoder e estados de falha das APIs externas** (além do 429 acidental da Wikimedia) e a **página de erro global `error.tsx`**: não consegui forçar.
- Só WebKit (portal); sem Chrome/Firefox/Safari iOS reais; sem rede lenta/offline; sem teste de produção (Vercel/Neon, flag `Secure` do cookie, HTTPS).
- Carga/concorrência e expiração de JWT (7 dias) não testadas.
- Artefatos da ferramenta (não são bugs do app): `fill` em `input[type=email]` não atualiza o estado do React (usei o setter nativo + evento `input`); animações de entrada e *timers* de toast não avançam com o portal oculto.

## 6. Dados de teste e limpeza

- Usuários criados: `qa+apia@teste.com`, `qa+apib@teste.com` (API), `qa+ui1@teste.com` (UI), mais efêmeros `qa+del@…`/`qa+orfao@…` (removidos durante o teste). Senha `123456`.
- Ao final: `delete from users where email like 'qa+%'` (cascata remove as viagens) e conferência de que a Sarah segue com 7 viagens e hash idêntico ao inicial.
- Evidências: `docs/qa/img/*.jpg` (59 arquivos, ~6 MB, PNG convertidos para JPEG).

---

## 7. Reteste (2ª rodada)

**Data:** 09/10/2026 (noite) · **Ambiente:** dev server reiniciado pelo orquestrador, mesmos navegadores/viewports da 1ª rodada (1440×900 e 390×844; 320×640 para o BUG-13) · **Escopo combinado:** reverificar BUG-01 a 16 (exceto 06), smoke de regressão dos fluxos principais em desktop e mobile, e os novos comportamentos da API. Evidências desta rodada em `docs/qa/img/reteste/`.

### 7.1 Veredito por bug

| Bug | Sev. | Dono | Resultado | Como verifiquei / evidência |
|---|---|---|---|---|
| **BUG-01** Detalhe quebra no mobile com texto longo | P2 | Front | ✅ **Corrigido** | 390 px, `/viagens/{id}` com: link do Google Maps (86+ chars, o mesmo caso de antes), 300 letras sem espaço, link do Tripadvisor (110), URL de 180 chars sem hífens e destino de 85 letras. `scrollWidth` ficou em **373 px** (= largura útil sem a barra de rolagem; antes 749 / 3188 / 1587 px) e o texto quebra dentro do cartão. Cards de `/perfil`, `/planos` e `/registrar` seguem ok. `img/reteste/bug01-detalhe-link-longo-mobile.jpg`, `bug01-detalhe-titulo-longo-mobile.jpg` |
| **BUG-02** Ranking do autocomplete | P2 | Back | ✅ **Corrigido** | API e UI (desktop e mobile), escolhendo a 1ª sugestão: **Bangkok → Banguecoque, Tailândia** (a vila da Indonésia caiu para 2º); **Madri → Madrid, Espanha** (Afeganistão/Índia viraram 7º/8º); **New York → Nova Iorque, EUA** (agora aparece, em 1º); **Tokyo → Tóquio, Japão** (1º). Aeroportos/POIs ("Santorini Airport", "Aeroporto de Foz…") sumiram. Painel e moeda/clima/foto corretos nos 4 casos. *Ruído residual menor (aceitável):* "York" e "Florence" ainda aparecem para "New York" e "Frei Paulo" para "São Paulo". `img/reteste/ac-bangkok.jpg`, `ac-madri.jpg`, `ac-newyork.jpg`, `ac-tokyo.jpg`, `painel-*.jpg` |
| **BUG-03** Voltar após logout mostra perfil em cache | P3 | Front | ✅ **Corrigido** | Logado em `/perfil` (e também a partir de `/viagens/{id}`) → "Sair" → Voltar: agora cai em `/login?next=%2Fperfil` sem nenhum dado do usuário; `GET /api/auth/me` = 401; Avançar volta ao `/login`. `img/reteste/bug03-voltar-apos-logout-desktop.jpg` |
| **BUG-04** "Confirmar senha" vazio sem erro | P3 | Front | ✅ **Corrigido** | Cadastro vazio mostra os 4 erros (inclui "Confirme a senha." com `aria-invalid`), também no mobile. `img/reteste/bug04-cadastro-vazio-desktop.jpg`, `m-cadastro-vazio.jpg` |
| **BUG-05** Datas inválidas / painel inconsistente | P3 | Front | ✅ **Corrigido** | A **Volta ganha `min` = Ida**; com Volta < Ida o erro "A volta não pode ser antes da ida." aparece **na hora** (sem precisar salvar), o painel deixa de mostrar clima antigo e exibe "A volta está antes da ida. Corrija as datas para atualizar moeda, clima e imagem do destino."; ao corrigir, o clima do período volta; Salvar continua bloqueado enquanto inválido. `img/reteste/bug05-datas-invertidas-desktop.jpg` |
| **BUG-06** Telas "não encontrada" com HTTP 200 | P3 | Front | ⏭ **Limitação aceita** (fora do reteste) | Só confirmei o estado: `/viagens/000…`, `/planos/abc` seguem 200 com a tela "não encontrada"; `/naoexiste` segue 404. Sem vazamento de dados. |
| **BUG-07** Capa antiga fica ao trocar para destino sem foto | P3 | Back/Front | ✅ **Corrigido** | API: plano "Bali" (capa automática Tanah Lot) → `PATCH` para "Madrī, Afeganistão" → `coverImageUrl = null`, `coverImageSource = null`. UI idem: no banco `cover_image = NULL` e o card cai no gradiente com pin. Trocar para destino com foto (Madrid) continua atualizando a capa. *Observação:* no formulário, até salvar, o preview "Capa atual do plano" ainda mostra a foto antiga (e o painel diz "Imagem sugerida: Indisponível"); ao salvar fica certo. `img/reteste/bug07-bali-para-afeganistao-form-desktop.jpg` |
| **BUG-08** Sem cabeçalhos de segurança | P3 | Back | ✅ **Corrigido** | Em páginas (`/login`, `/perfil`, `/sobre`, `/api-docs`, 404) e API (`/api/profile`, `/api/openapi.json`): `X-Frame-Options: DENY`, `Content-Security-Policy: frame-ancestors 'none'`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()`. `X-Powered-By` **removido**. (HSTS fica por conta da Vercel.) O Scalar em `/api-docs` continua funcionando com os cabeçalhos. |
| **BUG-09** API aceita `text/plain` / sem proteção de Origin | P3 | Back | ✅ **Corrigido** | Ver §7.3: `400` para `text/plain`, `form-urlencoded` e sem `Content-Type` (POST/PATCH, inclusive login/registro/complete); `403 FORBIDDEN` com `Origin` estranho (POST/PATCH/DELETE, login e logout); `application/json; charset=utf-8` e mesma origem continuam ok. O "try it" do `/api-docs` funciona (GET `/api/auth/me` → 200; POST `/api/auth/logout` → 204; POST `/api/auth/login` → 200). `img/reteste/tryit-me-resposta-desktop.jpg` |
| **BUG-10** Sem limite de tentativas de login | P3 | Back | ✅ **Corrigido** | **10 falhas → 11ª = 429** `TOO_MANY_REQUESTS` com `Retry-After: 900` e mensagem "Muitas tentativas de login. Tente novamente em 15 minutos."; na UI aparece como toast e o e-mail digitado é preservado. Ver §7.3 para o escopo. `img/reteste/bug10-login-429-desktop.jpg` |
| **BUG-11** Wikimedia 429 faz a imagem sumir | P3 | Back | ⚠️ **Mitigado** (não verificável por completo) | O back agora usa o Data Cache persistente do Next (geocoding/Wikipedia 7 dias; Commons/arquivo climático 30 dias — `src/server/external/cache.ts`), então ensaiar uma vez "aquece" os destinos. Verifiquei: Paris, Gramado, Londres, Roma, Madrid, Sydney voltaram com imagem (respostas de 7–20 ms quando em cache). Ainda vi **2 respostas 429** da Wikimedia em chamadas "frias" (ex.: `insights` de "Nova Iorque" voltou `image: null` na 1ª vez; pela UI, minutos depois, a mesma busca trouxe a foto) — o app degrada sem erro. **Não consegui provar** a persistência entre deploys/instâncias (só em dev). **Recomendação:** antes de apresentar, abrir uma vez cada destino que será mostrado. |
| **BUG-12** Contraste do placeholder e dos erros | P3 | Front | ✅ **Corrigido** | Placeholder passou a `--color-placeholder: #5F5B66` sobre `#E6E0E9` = **5,10:1** (antes ≈ 2,6:1); texto de erro passou a `--color-danger-text: #B9120B` = **5,72:1** sobre o fundo (antes 3,96:1). `img/reteste/bug12-login-erro-contraste-desktop.jpg` |
| **BUG-13** `/sobre` em 320 px estoura | P3 | Front | ✅ **Corrigido** | Em 320 px o `scrollWidth` é 303 (= largura útil), o botão "Acessar o app" termina em x=287 (antes cortado em 328). Perfil, planos, novo plano, registrar, login, cadastro e api-docs também sem overflow em 320 px. `img/reteste/bug13-sobre-320px-header.jpg` |
| **BUG-14** Fechar no meio descarta tudo | P3 | Front | ✅ **Corrigido** | Marcar 2 viagens → preencher e "Salvar e continuar" a 1ª → **X** na 2ª: a 1ª é **salva** (Tóquio realizada, 5★ no banco), a 2ª continua planejada e marcada na lista, e um toast explica: "1 viagem registrada. A outra continua nos seus planos." (desktop e mobile). Fechar já na 1ª descarta o passo atual (equivale a cancelar; sem toast). `img/reteste/bug14-fechar-no-meio-desktop.jpg` |
| **BUG-15** Registrar viagem com data futura | P3 | Back/Regra | ✅ **Corrigido (como aviso, de propósito)** | O diálogo mostra um aviso amarelo: "Esta viagem está marcada para 01/04 – 10/04/2027. Você pode registrá-la mesmo assim." e permite salvar (desktop e mobile). `img/reteste/bug15-registrar-dialogo-aviso-desktop.jpg`, `m-registrar-dialogo.jpg` |
| **BUG-16** Textos | P3 | Front/Docs | ⚠️ **Parcial** | (a) ✅ `/planos` agora diz "**Selecione** um plano para editar." (desktop e mobile). (b) ✅ `/sobre` agora diz "6 provedores" (Open-Meteo, AwesomeAPI, ExchangeRate-API, Frankfurter, Wikipédia e Commons) e que, no FlagCDN, "o navegador carrega a imagem direto da URL". (c) ✅ a tabela "Convenções" do `/api-docs` virou lista (sem a quebra "Autentic·ação"). ❌ **Resta:** a interface do Scalar continua em inglês ("Server", "Authentication", "Client Libraries", "Download OpenAPI Document", "Search", "Introduction", "Powered by Scalar") — é limitação da biblioteca; só vale como nota, não atrapalha a apresentação. `img/reteste/bug16-api-docs-desktop.jpg`, `bug16-tabela-convencoes-desktop.jpg` |

**Placar:** 13 corrigidos (BUG-01, 02, 03, 04, 05, 07, 08, 09, 10, 12, 13, 14, 15) · 2 mitigados/parciais (BUG-11, BUG-16) · 0 não corrigidos · 1 aceito como limitação (BUG-06). **P2 abertos: 0.**

### 7.2 Smoke de regressão (todos ✅, nenhuma regressão)

| Fluxo | Desktop 1440 | Mobile 390 | Notas |
|---|---|---|---|
| Cadastro (vazio, senhas diferentes, e-mail inválido, e-mail em uso, sucesso) | ✅ | ✅ (só validação do envio vazio e layout) | Usuário novo cai em `/perfil` com estado vazio |
| Login (vazio, credenciais erradas, correto, `?next=`) | ✅ | ✅ | 429 exibido como toast (ver BUG-10) |
| Logout + Voltar | ✅ | — | BUG-03 |
| Perfil / estatísticas | ✅ | ✅ | Após registrar/excluir: 0→1→4→3 viagens realizadas, cidades/países conferem com o banco e plural correto |
| Criar plano com autocomplete | ✅ | ✅ | Bangkok, Madri, New York e Tokyo (1ª sugestão correta nos 4); painel com país, moeda/cotação, clima, foto e fontes; planos de Lisboa, Bali, Madrid, Nova Iorque, Banguecoque e Tóquio salvos com moeda/cotação/clima/capa no banco |
| Datas inválidas | ✅ | — | BUG-05 |
| Editar plano (datas/transporte/hospedagem; trocar destino) | ✅ | — | Clima recalculado (jun 18–32 °C → dez 8–13 °C); trocar destino atualiza país/moeda/capa |
| Upload de capa (PNG 2400×1600 → JPEG 1280×853, `.txt` e PNG corrompido rejeitados) | ✅ | — | Servida por `/api/trips/{id}/cover`; outro usuário recebe 404 |
| Excluir plano (Esc cancela, foco inicial em "Cancelar", confirma) | ✅ | — | Toast "Plano excluído." |
| Registrar 1 viagem (4★, casal, máscara de gastos `R$ 2.500,00`, relato com link) | ✅ | — | |
| Registrar 2 viagens (dados na 1ª + "Pular" na 2ª) e fechar no meio | ✅ | ✅ | BUG-14; mobile em *bottom sheet* |
| Detalhe da viagem / editar relato / excluir realizada | ✅ | ✅ (só o detalhe) | Estrelas, companhia, gastos e relato persistem; stats atualizam. Editar relato e excluir foram repetidos só no desktop |
| Texto longo / links no relato | ✅ | ✅ | BUG-01 |
| `/sobre`, `/api-docs` ("try it": leitura e escrita), 404 | ✅ | ✅ (só layout/overflow; o "try it" foi exercitado no desktop) | Sem overflow horizontal em nenhuma tela em 390 px (e em 320 px) |
| API: 401 sem sessão (9 rotas), IDOR (GET/PATCH/DELETE/cover/complete → 404), validação 400, XSS armazenado como texto, cover do dono 200 | ✅ | — | Mesmos resultados da 1ª rodada |
| Dados da Sarah | ✅ | — | Hash das viagens **idêntico** ao snapshot inicial (7 viagens) antes e depois do reteste |
| `.dev.log` | ✅ | — | Nenhum 5xx, nenhum erro de hidratação/`usePathname` desde o reinício |

### 7.3 Novos comportamentos da API (testados com `curl`; usuários `qa+rta/rtb/rtrl`)

| Caso | Resultado |
|---|---|
| `POST /api/trips` com `Content-Type: application/json` e `application/json; charset=utf-8` | ✅ 201 |
| `POST /api/trips`, `/auth/login`, `/auth/register`, `/trips/complete` e `PATCH` com `text/plain` | ✅ **400** `VALIDATION_ERROR` — `Envie o corpo como JSON, com o cabeçalho "Content-Type: application/json".` |
| `application/x-www-form-urlencoded` e requisição sem `Content-Type` | ✅ 400 (mesma mensagem) |
| `Origin: https://evil.com` em `POST /trips`, `PATCH`, `DELETE`, `POST /auth/login`, `POST /auth/logout` | ✅ **403** `FORBIDDEN` — `Requisição de origem não permitida.` (nenhum registro criado) |
| `Origin: null` | ✅ 403 |
| `Origin` igual ao host (`http://localhost:3000`) e sem `Origin` (clientes não-navegador) | ✅ permitido (201/200) |
| `GET /api/profile` com `Origin` estranho (leitura) | ✅ 200 (só escritas são checadas) |
| **429**: 10 senhas erradas seguidas no mesmo e-mail | ✅ 1ª–10ª: 401; **11ª em diante: 429** com `Retry-After: 900` |
| Senha **correta** durante o bloqueio do e-mail | ✅ 429 (bloqueio vale até o tempo acabar, como documentado) |
| E-mail em outra caixa (`QA+RTRL@…`) | ✅ também 429 (normalizado) |
| Outro e-mail e a **Sarah**, mesmo IP, senha correta | ✅ 200 — o bloqueio por e-mail/IP **não derrubou a demo** (limites: 10 por e-mail+IP, 30 por IP, 30 por e-mail) |
| Só falhas contam; sucesso zera o par e-mail+IP; tabela `login_attempts` guarda apenas HMAC de e-mail/IP | ✅ (0 linhas antes dos testes; 10–12 depois; HMAC de 32 hex) |
| Cabeçalhos de segurança em páginas e API | ✅ (ver BUG-08) |
| Contrato: `TOO_MANY_REQUESTS` em `src/types/api.ts` e `docs/API.md` | ✅ documentado |

### 7.4 Observações novas (sem severidade)

- **`X-Forwarded-For` forjado contorna o limite de 10 por e-mail+IP** (o 429 deixou de aparecer ao trocar o cabeçalho), mas o teto de **30 por e-mail de qualquer IP** continua valendo. O código só confia nesse cabeçalho porque, na Vercel, `x-vercel-forwarded-for`/`x-forwarded-for` são definidos pela plataforma; em outro proxy/host seria forjável. Sem ação necessária para a apresentação.
- Requisições de escrita **sem `Origin`** (cURL, apps) e o cabeçalho `Sec-Fetch-Site` sozinho não são bloqueados; navegadores sempre enviam `Origin` em POST cross-site, então o CSRF fica coberto junto com `SameSite=Lax`.
- `Cache-Control: no-store` agora vale também para páginas públicas (`/login`, `/sobre`, `/api-docs`) — correto para as privadas; só um pouco mais custoso nas públicas.
- O ruído residual do autocomplete ("York", "Florence", "Frei Paulo") é o geocoder devolvendo correspondências aproximadas; não atrapalha porque o item certo vem primeiro.

### 7.5 Dados de teste e limpeza do reteste

- Usuários criados e **apagados** ao final: `qa+rta`, `qa+rtb`, `qa+rtrl` (API) e `qa+rtui` (UI), senha `123456` — `delete from users where email like 'qa+%'` (cascata remove as viagens; 0 viagens órfãs).
- `delete from login_attempts` executado ao final (**0 linhas**), e confirmei que Sarah e novos logins entram normalmente.
- Estado final: só `sarah@triply.app`, 7 viagens, hash `9c5cb0fb…` idêntico ao snapshot inicial.

---

## 8. Reteste — banco em memória

**Data:** 10/10/2026 (manhã) · **Ambiente:** dev server reiniciado pelo orquestrador com `DB_DRIVER` ausente (= `memory`, estado inicial do seed); portal "QA Browser" em 1440×900, 375×812 e 390 px; API com `curl`/Python. Evidências em `docs/qa/img/memoria/`.

### 8.1 Veredito

**APROVADO COM RESSALVAS.** O contrato da API não mudou e **nenhum fluxo regrediu**: perfil/stats, detalhe por URL direta com os IDs fixos do seed, planos, criação com autocomplete/insights/capa (Wikipedia e upload), edição, registro de várias viagens de uma vez, exclusão, logout/login, cadastro de usuário novo e isolamento entre contas (IDOR → 404) passaram. Os arredondamentos seguem a regra do `NUMERIC` do Postgres (com 1 exceção de borda), o rate limit funciona em memória (11ª falha → 429) e o store aguentou concorrência (40 `POST` paralelos, 12 cadastros simultâneos do mesmo e-mail etc.) sem corromper dados. O `.dev.log` ficou sem 5xx, sem erro de hidratação e sem nenhum reinício/recompilação durante toda a sessão (o store em `globalThis` sobreviveu).

| Sev. | Qtde | Bugs |
|---|---|---|
| **P1** | **0** | — |
| **P2** | **1** | BUG-21 (risco de implantação na Vercel: o store em memória é **por instância**) |
| **P3** | **4** | BUG-17, BUG-18, BUG-19, BUG-20 |

### 8.2 Como testei (e o que mudou no método)

Sem `psql` útil (os dados não estão mais no Postgres) e sem poder reiniciar o servidor, **tudo foi feito por API e navegador**. Antes de começar tirei um **snapshot JSON completo** das 7 viagens da Sarah (`GET /api/trips`, inclui `updatedAt`) e as stats (2 cidades, 2 países, 2 realizadas, 5 planejadas). Toda escrita na conta dela foi feita **só em registros que eu mesmo criei** (nunca editei nem apaguei as viagens do seed) e, no fim de cada bloco, apaguei os meus pela API e comparei com o snapshot: o resultado foi **idêntico** (7 viagens, mesmos `updatedAt`, mesmas stats) nas quatro verificações, inclusive na última, depois de todos os testes.

### 8.3 Resultados

**(1) Regressão ponta a ponta com a Sarah (1440 px; leitura também em 375 px)**

| Caso | Resultado | Evidência |
|---|---|---|
| Login pela UI e perfil: 2 cidades, 2 países, "2 viagens realizadas · 5 planejadas", "Viajante desde outubro de 2026" | ✅ | `perfil-sarah-desktop.jpg` |
| Detalhe das realizadas **abrindo a URL direta** (hard load) dos IDs fixos: Espanha `4c342300-…` (família, avião, EUR 6,27, 18–33 °C, R$ 16.000,27, relato do Figma, foto Plaza Mayor) e França `c49664be-…` (casal, R$ 21.450,00, relato) | ✅ | `detalhe-espanha-direto-desktop.jpg`, `m375-detalhe-espanha-direto.jpg` |
| URL direta **sem sessão** → `/login?next=%2Fviagens%2F4c34…`; após o login volta ao detalhe da Espanha | ✅ | — |
| Lista de planos (5 do seed ordenados por data, capas carregando) | ✅ | `planos-sarah-desktop.jpg` |
| Edição de um plano do seed por URL direta (México `83988c25-…`: destino, datas, hospedagem, atividades pré-preenchidos) | ✅ (só leitura; ver BUG-17) | `bug17-mexico-imagem-indisponivel-desktop.jpg` |
| Criar plano com autocomplete: Gramado, Lisboa, Tóquio (digitando "Tokyo") — 1ª sugestão correta, painel com país, moeda/cotação, clima do período, foto e fontes; salvo com moeda, cotação (6 casas), temperaturas (1 casa) e capa da Wikipedia | ✅ | `plano-gramado.jpg`, `plano-lisboa.jpg`, `plano-tokyo.jpg` |
| Escolher o **país** "México" na busca (1ª opção) mostra foto sugerida (Gobierno CDMX · CC0) | ✅ | `painel-pais-mexico.jpg` |
| Editar plano (datas, hospedagem, atividades, transporte → clima recalculado dez 8–13 °C) + **upload de capa** (PNG 4 MB → JPEG 1280×853, servido por `/api/trips/{id}/cover`) | ✅ | `plano-lisboa-editado-planos-desktop.jpg` |
| **Registrar 3 viagens de uma vez** (estrelas 5/3/4, companhia, gastos `R$ 1.234,56` / `0,99` / `10.000.000,00` digitados na máscara, experiência com `<b>`, aspas e acentos): toast "3 viagens registradas!", stats 5 cidades / 5 países / 5 realizadas / 6 planejadas | ✅ | `registrar-3-selecionadas-desktop.jpg`, `perfil-apos-registrar-3-desktop.jpg` |
| Detalhe da registrada: relato com HTML aparece **como texto** (0 elementos `<b>` injetados) | ✅ | `detalhe-toquio-registrada-desktop.jpg` |
| Editar relato (pré-preenchido; 2★, gastos `R$ 505,05`, novo texto) | ✅ | — |
| Excluir viagem realizada (foco em "Cancelar", Esc fecha) e excluir plano; stats e lista atualizam | ✅ | — |
| Logout → `/login`, `GET /api/auth/me` 401, Voltar não mostra dados, login novamente | ✅ | — |
| Mobile 375 px (leitura): perfil, detalhes por URL direta, planos, edição, novo plano, registrar (diálogo), `/sobre`, `/api-docs` — sem overflow horizontal (`scrollWidth` 358 = 375 − barra de rolagem) | ✅ | `m375-perfil.jpg`, `m375-registrar-dialogo.jpg` |

**(2) Usuário novo (`qa+memui`) e isolamento**

| Caso | Resultado | Evidência |
|---|---|---|
| Cadastro com o e-mail da Sarah em outra caixa (`SARAH@Triply.app`) → "Este e-mail já está cadastrado." | ✅ | — |
| Cadastro válido → `/perfil` vazio (0/0, "Você ainda não registrou viagens"), `/planos` e `/registrar` vazios | ✅ | `novo-usuario-perfil-vazio-desktop.jpg` |
| Criar plano (Paris, 1ª sugestão) e registrar com relato; stats "1 viagem realizada · 1 Cidade · 1 País" | ✅ | `novo-usuario-plano-paris.jpg` |
| Logado como esse usuário, as páginas dos IDs do seed (`/viagens/{Espanha}`, `/viagens/{França}`, `/planos/{México}`, `/planos/{Maragogi}`) mostram "Viagem/Plano não encontrada…" **sem vazar nada** (nenhum Madrid/Espanha/Hostal/16.000 no texto) | ✅ | `idor-viagem-seed-novo-usuario-desktop.jpg` |
| API, usuário B (`qa+mema`): lista vazia e stats zeradas; `GET` e `/cover` nos 3 IDs fixos do seed → **404**; contra uma viagem-vítima criada pela Sarah: `GET`, `/cover`, `PATCH`, `POST /complete`, `DELETE` → **404** e a vítima fica íntegra | ✅ | — |
| A Sarah continua vendo só as 7 do seed e as mesmas stats depois de o usuário novo criar/registrar | ✅ | — |

**(3) Pontos novos do modo memória**

| Ponto | Resultado |
|---|---|
| **IDs fixos do seed**: os 7 IDs são os do `seed-data.ts`; abrir por URL direta funciona (logado), pede login com `?next=` (sem sessão) e devolve "não encontrada" a outro usuário | ✅ |
| **Isolamento** — `PATCH` + `complete` numa viagem não alteram as irmãs (idênticas) nem nenhuma do seed (comparação campo a campo); objeto devolvido pela API não vira referência do store (editar A não muda B) | ✅ |
| **Concorrência** — 40 `POST /api/trips` paralelos → 40 × 201, 40 IDs únicos, lista cresce 40; 20 `PATCH` paralelos → estado final de **um único** PATCH (acomodação e atividades coerentes); 10 `complete` paralelos → mesmo `completedAt` (idempotente); **12 cadastros paralelos do mesmo e-mail → 1 × 201 + 11 × 409** e login único | ✅ |
| **Ciclo de vida da capa**: upload → `?v=` novo ao trocar, PNG servido com `Content-Type` correto; trocar por URL externa → `/cover` 404; voltar ao upload → 200; `coverImage:null` → 404; excluir a viagem → capa 404 | ✅ |
| **Ordenação**: planejadas por `startDate` crescente com sem-data por último; realizadas por `completedAt` decrescente (Espanha antes de França) | ✅ |
| Respostas sem campos internos (`passwordHash`, `userId`) e com as mesmas 28 chaves do snapshot/contrato | ✅ |
| **Rate limit**: 10 falhas → **11ª = 429** `TOO_MANY_REQUESTS`, `Retry-After: 899`; senha **correta** e e-mail em outra caixa (`QA+MEMRL@…`) também 429 durante o bloqueio; **Sarah e outro usuário, mesmo IP, entram normalmente (200)**; e-mail inexistente continua 401 | ✅ |

*Arredondamentos (enviado → devolvido pela API; `GET` por id e lista sempre iguais ao `POST`/`PATCH`):*

| Campo (escala) | Enviado → devolvido |
|---|---|
| Cotação (6 casas) | `0.1234567`→`0.123457` · `1.0000005`→`1.000001` · `2.6750005`→`2.675001` · `1234567.8901234`→`1234567.890123` · `6.27`→`6.27` · **`0.0000005`→`0`** ❌ (BUG-20) · `0.0000004`→`0` |
| Temperaturas (1 casa) | `18.25`→`18.3` · `30.04`→`30` · `-0.25`→`-0.3` · `0.05`→`0.1` · `-0.05`→`-0.1` · `17.95`→`18` · `10.15`→`10.2` · `10.35`→`10.4` · `2.675`→`2.7` · `-89.95`→`-90` · `59.95`→`60` · `0.04`→`0` (sem "−0"); limites −90…60 e `min ≤ max` conferidos antes de arredondar |
| Gastos (2 casas) | `1.005`→`1.01` · `2.675`→`2.68` · `0.125`→`0.13` · `1234.565`→`1234.57` · `1234.564`→`1234.56` · `0.005`→`0.01` · `0.004`→`0` · `19.999`→`20` · `0.1+0.2`→`0.3` · `9999999999.99` ok · `9999999999.994`/`.995` → 400 "alto demais" |
| Latitude/longitude | sem arredondar (`-23.5475123456789`) |
| `PATCH` | também arredonda (`3.1415926`→`3.141593`, `1.25`→`1.3`, `2.35`→`2.4`) |

*Números na UI × enviados (tela de detalhe das viagens registradas):*

| Enviado | Armazenado (API) | Exibido na UI |
|---|---|---|
| gastos `1234.565` | `1234.57` | `R$ 1.234,57` ✅ |
| gastos `0.005` / `1.005` / `2.675` / `19.999` | `0.01` / `1.01` / `2.68` / `20` | `R$ 0,01` / `R$ 1,01` / `R$ 2,68` / `R$ 20,00` ✅ |
| gastos `9999999999.99` | idem | `R$ 9.999.999.999,99` ✅ |
| temp `18.25 / 30.04` | `18.3 / 30` | `≈ 18 a 30 °C` ✅ · `7.6 / 13` → `≈ 8 a 13 °C` ✅ · `-0.3 / 0.1` → `≈ 0 °C` ✅ · `-90 / 60` → `≈ -90 a 60 °C` ✅ · `20 / 20` → `≈ 20 °C` ✅ |
| cotação `6.27` / BRL `1` / `1234567.890123` | idem | `1 USD = R$ 6,27` ✅ · `R$ 1,00` ✅ · `1 EUR = R$ 1.234.567,89` ✅ |
| cotação `0.0315` | `0.0315` | `1 EUR = R$ 0,0315` ✅ |
| cotação **`0.123457`** | `0.123457` | `1 EUR = R$ 0,12` ⚠️ (BUG-18) |
| cotação **`0.00028`** (IDR) | `0.00028` | `1 EUR = R$ 0,0003` ⚠️ (o painel do plano mostra `R$ 0,00028`) (BUG-18) |
| cotação `0.000001` | `0.000001` | `1 EUR = R$ 0,00` ⚠️ (BUG-18) |
| cotação `0.0000005` (→ `0`) | `0` | `—` |

**(4) Página `/sobre` — coerência, ortografia e layout (1440 px e 375 px)**

- **Texto:** coerente com o modo memória e sem erros de ortografia. Selo "Banco em memória (parte 1)" e "PostgreSQL + Drizzle (parte 2)" na capa; card "Hospedagem na Vercel" explica que na parte 1 os dados voltam ao estado inicial quando o servidor reinicia; camada 4A "Banco em memória / Repositórios · PostgreSQL na parte 2 / users e trips / Volta ao estado inicial ao reiniciar"; bloco "Camada de repositórios" (`DB_DRIVER=memory` é o padrão; na parte 2 basta trocar a implementação); passo 3 do exemplo: "POST /api/trips grava no banco em memória". Conferi também que o debounce de "~300 ms" existe no código (`useDebouncedValue` = 300) e que a lista de endpoints (15 linhas) bate com as 15 operações do OpenAPI. **Ressalvas:** a coluna "Cache" da tabela de APIs externas está desatualizada (BUG-19) e o texto não avisa que, na Vercel, o store é por instância (BUG-21).
- **Layout 1440 px:** sem overflow (`scrollWidth` 1423 = largura útil), hero, cards de requisitos, diagrama de 4 camadas, tabelas e botões alinhados (`sobre-1440-00…05.jpg`).
- **Layout 375 px:** sem overflow horizontal (358 = 375 − barra); as tabelas viram cartões legíveis (endpoints com selo do método e "Sessão/Pública", APIs externas com link e "Cache: …"), as 4 camadas empilham com as setas "CHAMA/CONSULTA", sem texto cortado (`sobre-375-00…12.jpg`).

**(5) `/api-docs` e `/api/openapi.json`**

| Caso | Resultado |
|---|---|
| `/api/openapi.json` 200, `application/json`, `cache-control: public, max-age=300`, cabeçalhos de segurança; OpenAPI 3.1.0 "Triply API" v1.0.0 com **15 operações** (todas as rotas reais), 26 *schemas*, códigos 403/429 documentados e `TOO_MANY_REQUESTS` presente | ✅ |
| `/api-docs` (Scalar) carrega, sem overflow, 1440 e 375 px | ✅ |
| "Try it" em modo memória: `POST /api/auth/login` (corpo de exemplo = Sarah) → 200; `GET /api/trips?status=planejada` → 200 com as viagens do seed (Maragogi, México, …) — escrita e leitura passam pela checagem de Origin | ✅ `tryit-trips-memoria-desktop.jpg` |
| Interface do Scalar segue em inglês (limitação já registrada no BUG-16) | ⚠️ conhecido |

### 8.4 Bugs

#### BUG-21 · **P2** · Back/Implantação (risco, não reproduzível localmente) — o banco em memória é **por instância** na Vercel
O store vive em `globalThis` (`src/db/memory/store.ts`, comentário: "na Vercel vale por instância de função"). Em ambiente *serverless* cada instância tem a sua cópia e instâncias novas (cold start, escala, deploy) começam do seed. **Efeito esperado em produção:** cadastros e viagens criados podem "sumir" ou o usuário ser deslogado do nada (o JWT é válido, mas a outra instância não conhece o usuário → 401/redirecionamento ao login). Só o usuário seed (Sarah) é igual em todas as instâncias. Não consegui reproduzir (só tenho o servidor local), por isso a classificação é por impacto potencial na demonstração.
**Recomendações:** (a) apresentar com a Sarah e evitar depender de dados criados na hora (ou mostrar a criação logo antes de usar e não recarregar muito depois); (b) deixar explícito em `/sobre` e no README que, na Vercel, os dados em memória são por instância além de "voltarem ao estado inicial ao reiniciar"; (c) se for crítico, fazer a demonstração local (`next start`) ou antecipar o Postgres da parte 2.

#### BUG-17 · P3 · Back/seed — "Imagem sugerida: Indisponível" em planos cujo destino é um país com coordenadas de cidade
**Passos:** Sarah → `/planos/83988c25-a2c9-4eff-80f4-f8424cb2f325` (México) ou `/planos/b7821cb8-78d6-4664-ab68-7377133463fb` (Indonésia). **Esperado:** foto sugerida (as capas existem e carregam). **Obtido:** o painel mostra "Imagem sugerida · Indisponível" nesses dois; Maragogi, Barra Grande e Natal mostram a foto. **Causa observada:** a tela chama `insights?name=México&countryCode=MX&lat=20.21173&lon=-87.46325&…` e essa combinação devolve `image: null`; sem `lat/lon` (`name=México&countryCode=MX`) devolve a foto (Cidade do México), e com `name=Tulum, México` devolve a de Tulum. Escolher o **país** "México" na busca (que usa coordenadas do país) funciona. Não afeta o salvamento nem a capa já existente; é só a sugestão no painel de edição do seed.
**Evidência:** `bug17-mexico-imagem-indisponivel-desktop.jpg`.

#### BUG-18 · P3 · Front — cotação exibida com menos casas que a armazenada
Na tela de detalhe (viagens realizadas) a cotação usa um formatador próprio: `0.123457` → "R$ 0,12", **`0.00028` (IDR) → "R$ 0,0003"** (+7% de erro aparente; o painel do plano, que usa o `label` da API, mostra "R$ 0,00028") e `0.000001` → "R$ 0,00". Cotações como 6,27 (2 casas) e 0,0315 (4 casas) saem corretas; o problema são as pequenas (< 0,001: IDR, e outras moedas de baixo valor) e o corte de 6 para 2 casas em 0,123457. **Esperado:** mesma precisão do `label` do insights (mais casas para cotações pequenas).

#### BUG-19 · P3 · Front/Docs — tabela de cache de `/sobre` desatualizada
`/sobre` (tabela "APIs externas consumidas" e lista "Como o back se protege") mostra Geocoding **1 dia**, Forecast **6 h**, Archive **6 h**, Wikipédia **1 dia**, Commons **1 dia** e fala só em "Cache em memória com TTL". `docs/API.md` e `src/server/external/cache.ts` documentam **duas camadas** e validades de **7 dias / 3 h / 30 dias / 7 dias / 30 dias** (Data Cache persistente do Next). Alinhar o `/sobre` (e dizer que o Data Cache é o que "aquece" a demonstração).

#### BUG-20 · P3 · Back (paridade com o Postgres, parte 2) — cotação ≤ 5×10⁻⁷ vira 0
`POST /api/trips` com `exchangeRate: 0.0000005` devolve/guarda **`0`**; o `NUMERIC(14,6)` do Postgres guardaria `0.000001`. Causa provável: `roundTo` (`src/db/memory/numeric.ts`) cai no `toFixed` quando `String(n)` vem em notação científica (`5e-7`). Valores menores (`4e-7`) também viram `0` mesmo passando na validação "maior que zero" (a UI então mostra "—"). Caso de borda sem moeda real afetada, mas é uma diferença de comportamento entre os dois drivers que pode aparecer na parte 2.

### 8.5 Observações (sem severidade)

- Dos 4 usuários e das viagens criadas por mim, **nenhum pode ser removido** (não há API/UI para isso e o servidor não deve ser reiniciado): ver §8.6.
- Cadastro não tem limite/rate limit e o store não tem teto de usuários/viagens por instância (crescimento ilimitado de memória) — aceitável para o trabalho; **não testei** em volume para não deixar lixo no store.
- O México do seed mostra "1 MXN = R$ 0,27" no painel (cotação ao vivo) enquanto a viagem guarda 0,29 do Figma — esperado (o painel consulta a API; o detalhe usa o valor salvo).
- Nenhum toast, foco ou diálogo regrediu; "Plano de viagem criado!" aparece por poucos segundos (visto a 0,4–1,5 s).
- A tela de detalhe mantém a ordem de empate (mesmo `completedAt`) inversa à enviada — sem impacto.

### 8.6 Estado residual (o que ficou no servidor, em memória)

- **Sarah:** inalterada — 7 viagens, snapshot JSON idêntico (inclui `updatedAt`), stats 2/2/2/5; login testado no final (200).
- **Usuários de teste ainda no store até o próximo reinício** (senha `123456`): `qa+mema@teste.com` (vazio), `qa+memui@teste.com` (1 viagem realizada, Paris), `qa+memrl@teste.com` (**bloqueado por rate limit até ≈ 12:06** de 10/10/2026), `qa+memrace@teste.com` (vazio). Não aparecem para a Sarah.
- **Contador de falhas de login do IP local:** 10 falhas registradas a partir de ≈ 11:51 (limite do IP: 30 em 15 min); começam a expirar às ≈ 12:06. Evitem uma sequência de logins errados antes disso na demonstração local (a Sarah entra normalmente, testado depois do bloqueio).
- Reiniciar o servidor zera tudo isso (usuários `qa+…`, bloqueio e contador).
