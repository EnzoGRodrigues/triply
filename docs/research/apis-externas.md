# APIs externas — validação prática (Triply)

> **⚠️ Decisões finais do orquestrador (fontes, fallbacks, labels, cache): ver `docs/SPEC.md` §6 — elas prevalecem sobre as recomendações abaixo.** Países: usar o pacote `world-countries` (já instalado), não REST Countries.


Pesquisa feita em **2026-10-09** (hora local; UTC já 10-10) com `curl` real. Nada aqui é suposição sem marcação: o que não foi testado está escrito como "não testado".

Resumo do que mudou em relação à proposta inicial da SPEC §6:

- **REST Countries v3.1 está morto.** Todas as versões antigas (v1–v4) e a v3.1 devolvem erro "API version has been deprecated". A v5 exige chave (`Authorization: Bearer`) e tem formato de resposta diferente. Ver §b.
- **AwesomeAPI não tem IDR-BRL** (404 `CoinNotExists`). Indonésia precisa de outra fonte. Ver §c.
- **Frankfurter** agora é `api.frankfurter.dev/v1` (o `.app` redireciona para 301 e não serve mais). Não tem ARS.
- **Imagens Wikipedia:** o endpoint de busca devolve thumb de 60px; para ~1280px usar `prop=pageimages&pithumbsize=1280` ou reescrever a URL da thumbnail.

---

## a) Open-Meteo Geocoding — `https://geocoding-api.open-meteo.com/v1/search`

**Status:** no ar, sem chave, rápido (< 2 ms de geração no servidor).

**Request exato:**
```
GET https://geocoding-api.open-meteo.com/v1/search?name=Maragogi&count=5&language=pt&format=json
```

**Campos que importam** (de `results[]`): `id`, `name`, `latitude`, `longitude`, `feature_code`, `country_code`, `country` (traduzido com `language=pt`), `admin1` (estado, traduzido), `admin2`, `timezone`, `population` (ausente em muitos itens).

**Resultados reais:**

| Busca | 1º resultado (o que o usuário quer) | Observação |
|---|---|---|
| `Maragogi` | Maragogi, Alagoas, BR · lat -9.01222 lon -35.2225 · pop 33232 · PPL | 1º certo. 2º é "Maragogipe" (BA) — confusão clássica |
| `Tulum` | Tulum, Quintana Roo, **México** (MX) · lat 20.21173 lon -87.46325 · pop 18233 · `PPLA2` | 1º certo. Há Tulum na Turquia e PNG na lista |
| `Paris` | Paris, Ilha de França, **França** · pop 2138551 · `PPLC` | 1º certo (capital). Lista traz Paris TX, KY, TN |
| `Bali` | **Bāli, Índia** (`PPL`, sem pop) ← 1º | **Armadilha:** Bali (Indonésia, `ISL`, pop 4225384) aparece em 2º. Precisa filtrar/ordenar |
| `Natal` | Natal, Rio Grande do Norte, BR · pop 896708 · `PPLA` | 1º certo. Natal (Indonésia) aparece em 4º |
| `México` | México (país), MX · `PCLI` · pop 126190788 | 1º é o país. Com `language=pt` o nome vem "México" |

**Barra Grande (PI) — teste pedido:**

- `name=Barra Grande - Piauí` → **zero resultados** (`{"generationtime_ms":...}` sem `results`). Confirmado: o texto com hífen não casa.
- `name=Barra Grande, Piauí` → **casa**: 1º = Barra Grande, Piauí, BR, lat -2.91137 lon -41.40985, `America/Fortaleza`, admin2 "Cajueiro da Praia".
- Há 5 "Barra Grande" no Brasil (PE, PI, MA, PR ×2). Por isso o autocomplete é necessário: o usuário escolhe, não digitamos.

**Conclusão:** usar **autocomplete** (`q ≥ 2 chars`, `count=5`). Na UI, mostrar `name, admin1, country` (ex.: "Barra Grande, Piauí, Brasil"). Ordenar por `population` quando existir (ajuda em Bali/Índia). Gravar `latitude`/`longitude`/`country_code`/`timezone`.

**Limites / termos (Open-Meteo, uso gratuito não comercial):** < 10.000 chamadas/dia, 5.000/hora, 600/minuto. Fonte: `open-meteo.com/en/terms`. Licença de dados CC BY 4.0 (atribuição exigida se exibir dados de temperatura; **não testei a página de licença completa**, só o trecho de limites).

**Armadilhas:** sem `language=pt`, nomes/admin vêm em inglês. `population` não existe em todos os itens (tratar como opcional). Sem `count`, o default é 10.

---

## b) REST Countries — **DEPRECIADO**

**Status: fora de uso para v1–v4 e v3.1.** Testado:

```
GET https://restcountries.com/v3.1/alpha/MX?fields=name,translations,currencies,flags
→ 301 → https://files-03.restcountries.com/countries.00/legacy.json
→ 200, mas body:
{"success": false, "data": null, "errors": [{"message": "This API version has been deprecated. Please visit https://restcountries.com/docs/countries/legacy-api-deprecation to migrate to our new version (v5)."}]}
```

Mesmo resultado para `/v4/`, `/v5/alpha/MX` sem chave (HTTP 200 com erro) e `/v3.1/all`. Não existe mais payload útil nas versões antigas.

**v5 (novo):** o caminho real é `https://restcountries.com/countries/v5?q=...` (não `/v5/alpha/`). Sem header → **HTTP 401** `authKeyMissing`. Com chave: `Authorization: Bearer <KEY>`. A doc diz que o plano gratuito existe ("Get an API key", "The free tier covers…"), mas **não consegui extrair os números do plano gratuito** nem o limite de taxa exato (a doc de rate limit devolveu 404). Segundo a doc: 429 se passar de 20 req / 10 s no edge. Mudou o formato: campos aninhados (`names.common`, `names.translations`, `codes.alpha_2`, `flag.emoji`…). Não testei com chave real (não tenho uma), então o shape exato de moeda e bandeira na v5 **não está validado**.

**Testado que funciona (alternativa):**

- **Wikidata SPARQL** (sem chave): `https://query.wikidata.org/sparql` retornou nome em português para MX ("México", `xml:lang=pt`), via `wdt:P297 "MX"`. Testei só o nome; **moeda (P38) não foi validada** na query (o retorno trouxe só o país).
- **Bandeira:** `https://flagcdn.com/w320/mx.png` → HTTP 200 `image/png` (testado). Padrão: `https://flagcdn.com/w320/{cca2 minúsculo}.png`.

**Recomendação:** não depender de API de país em runtime. Gerar **um JSON estático** (≈250 países: código ISO-2, nome pt, moeda ISO-4217) uma vez, a partir da REST Countries v5 com chave gratuita ou do Wikidata, e commitar em `src/server/data/` (ou `docs/`). Bandeira via `flagcdn.com`. Isso elimina o ponto de falha e o problema de chave.

---

## c) Cotação → BRL

Testado em 2026-10-09.

**AwesomeAPI** — `https://economia.awesomeapi.com.br/json/last/{PAR}`
- Sem chave: **funciona** (HTTP 200).
- Pares testados: `MXN-BRL` ✅, `EUR-BRL` ✅, `USD-BRL` ✅, `ARS-BRL` ✅, `JPY-BRL` ✅, `THB-BRL` ✅, **`IDR-BRL` ❌ 404** `{"status":404,"code":"CoinNotExists","message":"moeda nao encontrada IDR-BRL"}`.
- Resposta (exemplo real, MXN-BRL): `{"MXNBRL":{"code":"MXN","codein":"BRL","name":"Peso Mexicano/Real Brasileiro","bid":"0.2708362","ask":"0.2711391","pctChange":"-1.870092","timestamp":"1791579836","create_date":"2026-10-09 18:03:56"}}`. Usar **`bid`** como cotação.
- Nome dos pares vem em português.
- Limites: **não testei** (sem doc de limite validada nesta pesquisa). Não há chave necessária para o uso básico.

**open.er-api.com** — `https://open.er-api.com/v6/latest/{BASE}`
- Sem chave: **funciona**. Base MXN devolveu `"result":"success"` com **166 moedas**.
- Cobre tudo que pedimos, **inclusive IDR**: `BRL 0.275641`, `IDR 976.244476`, `EUR 0.04868`, `USD 0.05452`, `ARS 82.874541`, `JPY 8.629817`, `THB 1.837576` (base MXN). Cotação de MXN→BRL pode ser derivada por `rates.BRL / rates.MXN`, ou pedir `latest/BRL` direto.
- **Atribuição obrigatória:** o JSON traz `"provider":"https://www.exchangerate-api.com"` e termos em `https://www.exchangerate-api.com/terms`. Exibir "Cotações por ExchangeRate-API" com link.
- Atualiza ~1×/dia (`time_next_update_utc` = +24 h). Não é tempo real.

**Frankfurter** — `https://api.frankfurter.dev/v1/latest?base=EUR&symbols=BRL,IDR,MXN,USD,ARS,JPY,THB`
- Sem chave: **funciona** (HTTP 200). Dados do BCE (ECB), dia útil.
- **Cobre:** BRL, IDR, MXN, EUR, USD, JPY, THB ✅. **Não cobre ARS** (`ARS-BRL` → 404 `not found`). Total de 30 moedas.
- Exemplo real: `{"amount":1.0,"base":"IDR","date":"2026-10-09","rates":{"BRL":0.00028}}`.
- Histórico funciona (`/v1/2026-10-01..2026-10-09?base=MXN&symbols=BRL`).
- `api.frankfurter.app` → **301** (não usar).

**Qual cobre mais moedas (das pedidas: IDR, MXN, EUR, USD, ARS, JPY, THB):**

| Moeda | AwesomeAPI | open.er-api | Frankfurter |
|---|---|---|---|
| IDR | ❌ | ✅ | ✅ |
| MXN | ✅ | ✅ | ✅ |
| EUR | ✅ | ✅ | ✅ |
| USD | ✅ | ✅ | ✅ |
| ARS | ✅ | ✅ | ❌ |
| JPY | ✅ | ✅ | ✅ |
| THB | ✅ | ✅ | ✅ |
| **Total** | **6/7** | **7/7** (166 moedas no total) | **6/7** (30 moedas) |

**open.er-api cobre mais** (7/7 e 166 moedas). Frankfurter é o mais estável e documentado, mas sem ARS.

**Recomendação de cadeia de câmbio:**
1. **Primária:** AwesomeAPI (`/json/last/{MOEDA}-BRL`) — cotação em tempo real, nomes pt, sem chave; usar `bid`.
2. **Fallback 1 (cobre IDR e o resto):** open.er-api (`/v6/latest/{MOEDA}` → `rates.BRL`). Exibir atribuição.
3. **Fallback 2:** Frankfurter (`/v1/latest?base={MOEDA}&symbols=BRL`) — dado do BCE, diário.
4. Se tudo falhar: `null` (conforme SPEC §5, nunca quebrar o save).

---

## d) Temperatura média do período — Open-Meteo Forecast e Archive

**Forecast** — `https://api.open-meteo.com/v1/forecast`

Request real (Tulum, lat 20.2117 lon -87.4632):
```
GET https://api.open-meteo.com/v1/forecast?latitude=20.2117&longitude=-87.4632&daily=temperature_2m_max,temperature_2m_min&timezone=America%2FCancun&start_date=2026-10-20&end_date=2026-10-25
```
Resposta real (trecho):
```json
"daily":{"time":["2026-10-20","2026-10-21","2026-10-22","2026-10-23","2026-10-24","2026-10-25"],
"temperature_2m_max":[30.8,30.8,30.4,29.9,29.8,null],
"temperature_2m_min":[24.7,24.5,24.2,24.5,23.1,null]}
```
- **Alcance:** até **16 dias** à frente. Testado: `forecast_days=16` → 200; `forecast_days=17` → 400 `Forecast days is invalid. Allowed range 0 to 16`. Com `start_date` fora do intervalo → 400 `out of allowed range from 2026-07-09 to 2026-10-25`. Ou seja, hoje (09/10) o limite é 25/10.
- **Pontos `null`:** o último dia (25/10) veio `null` — o dia fora de alcance de previsão retorna nulo. **Tratar `null` no back** (não somar).
- Unidades: °C (`daily_units`).

**Archive** — `https://archive-api.open-meteo.com/v1/archive`

Request real (Tulum, mesmas datas do ano anterior):
```
GET https://archive-api.open-meteo.com/v1/archive?latitude=20.2117&longitude=-87.4632&start_date=2025-10-20&end_date=2025-10-25&daily=temperature_2m_max,temperature_2m_min&timezone=America%2FCancun
```
Resposta real: `temperature_2m_max":[29.9,31.6,30.2,31.4,31.4,30.5]`, `temperature_2m_min":[23.4,22.8,22.4,22.9,22.8,22.3]`.

- **Atraso dos dados:** a doc da Open-Meteo fala em alguns dias de atraso (ERA5). **Observado:** a consulta de 2026-10-07 a 10-10 já devolveu valores até **2026-10-10** (um dia "à frente" do dia local em Cancún). Ou seja, na prática o archive está quase em tempo real, mas **não testei o atraso formal** — para o caso de uso (ano anterior), não importa.
- Para Barra Grande-PI (-2.91137, -41.40985, `America/Fortaleza`): archive 2025-10-20..22 → max 31.6/32.0/32.0, min 24.8/25.2/24.9. Forecast 2026-10-20..22 → max 30.8/31.4/31.2. Funciona.

**Recomendação de temperatura (lógica de back):**
- Se `start` estiver dentro de 16 dias de hoje → Forecast para o intervalo (ignorar `null`).
- Senão → Archive com as **mesmas datas (dia/mês) do ano anterior** (ex.: `start.year - 1`). Usar média de `tempMax` e `tempMin` do intervalo.
- Anotar na UI que é "média histórica do ano anterior" quando não é previsão.
- Limite diário Open-Meteo: 10.000 chamadas/dia (ver §a).

---

## e) Imagem de capa — Wikipedia

**Summary (pt e en) — `/api/rest_v1/page/summary/{título}`** (testado com `User-Agent` identificado):

| Destino | pt summary | Thumbnail (330px) | Observação |
|---|---|---|---|
| Maragogi | ✅ "Município brasileiro do estado de Alagoas" | `thumb…/1d/Maragogi_Alagoas_Brasil.jpg/330px-…` | `originalimage` 640×480 |
| Tulum | ✅ | `thumb…/8/85/Tulum_2.jpg/330px-…` | `originalimage` é thumb 3840px |
| Paris | ✅ | `…Eiffel_Tower…(cropped).jpg/330px-…` | Foto pouco "bonita"; ver §2 |
| Madrid | ✅ | `…Plaza_Mayor…jpeg/330px-…` | |
| Bali | ✅ | `…Tanah-Lot…jpg/330px-…` | ✅ foto boa |
| Natal | ✅ | `…Adoration_of_the_sheperds…jpg/330px-…` | ❌ **imagem errada** (pintura de presépio) |
| Barra Grande-PI | ❌ **sem artigo** com esse título | — | Ver abaixo |

- Títulos com parênteses (`Barra_Grande_(Piauí)`) → `null`/erro. A busca `Barra Grande, Piauí` devolve **Barras (Piauí)**, não o destino. O desambiguador pt lista Barra Grande (Alagoas), (Avaré), (Santa Catarina) — **não lista Piauí**. Conclusão: **Barra Grande-PI não tem artigo próprio no pt.wiki pelo que testei**; o fallback é o artigo do município (**Cajueiro da Praia**, que testei: summary 200, descrição "município brasileiro do estado do Piauí"), ou imagem curada (seed, §2).
- en summary: Madrid, Paris, Tulum, Bali, Maragogi ✅ (Bali en = marcador SVG, **não usar**).

**Endpoint de busca — `/w/rest.php/v1/search/page?q=…&limit=1`:** responde 200 e devolve `thumbnail` **de 60 px** (`//thumb.wikimedia.org/…/60px-…`). Serve só para descobrir o título, **não** para capa.

**Como obter ~1280 px (testado):**
1. **Melhor:** MediaWiki API, `prop=pageimages`:
   ```
   GET https://pt.wikipedia.org/w/api.php?action=query&titles=Tulum&prop=pageimages&piprop=thumbnail|original&pithumbsize=1280&format=json
   → thumbnail: {"source":"https://thumb.wikimedia.org/…/8/85/Tulum_2.jpg/1280px-Tulum_2.jpg…","width":1280,"height":720}
   ```
   Para Maragogi a imagem original é 640px, então devolve o original (não amplia). Isso é correto.
2. **Alternativa:** reescrever `/330px-` para `/1280px-` na `thumbnail.source` do summary. Testado: `…/Maragogi_Alagoas_Brasil.jpg/1280px-Maragogi_Alagoas_Brasil.jpg` → 200 (ver §2 para o padrão de URL).
3. Para licença/autor: `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=…&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=1280&format=json` → `extmetadata.LicenseShortName.value`, `extmetadata.Artist.value`.

**Política de User-Agent (Wikimedia):** a página oficial `foundation.wikimedia.org/wiki/Policy:User-Agent_policy` respondeu 200. A política pede UA **descritivo com contato** (nome do app + URL/e-mail). **Não consegui extrair a frase exata** do HTML (regex/quota), mas o padrão de UA genérico (ex.: `curl/…`, `python-requests`) é o que leva a bloqueio. Recomendo: `Triply/1.0 (<URL do projeto>; <contato>)` — o URL e o contato precisam ser definidos pelo time (não confirmei o repositório público). Para o e-mail: **não colocar o e-mail do usuário na UA** sem ele pedir — usar um contato de projeto/URL.

**Termos de imagem:** as imagens do Commons são CC BY / CC BY-SA. Exibir **autor + licença + link** da página `commons.wikimedia.org/wiki/File:…` (obrigatório pela licença CC BY).

---

## f) Hostnames de imagem que o Next precisa liberar

Confirmado pelas URLs testadas (todas retornaram 200 com `image/jpeg` ou `image/png`):

- `upload.wikimedia.org` — originais (ex.: `https://upload.wikimedia.org/wikipedia/commons/...`)
- `thumb.wikimedia.org` — **thumbnails** (summary e pageimages devolvem este host; é o que aparece na maioria dos casos). Precisa estar liberado também.
- `flagcdn.com` — bandeiras (`https://flagcdn.com/w320/mx.png` → 200).

Para `next/image`, `remotePatterns` mínimo (Next 16 — confirmar o formato em `node_modules/next/dist/docs/` antes de usar):
```ts
{ protocol: 'https', hostname: 'upload.wikimedia.org', pathname: '/wikipedia/commons/**' }
{ protocol: 'https', hostname: 'thumb.wikimedia.org', pathname: '/wikipedia/commons/**' }
{ protocol: 'https', hostname: 'flagcdn.com', pathname: '/**' }
```
**Não testei** a configuração do `next/image` em si (sem rodar o dev server, conforme instrução do projeto). A lista de hosts está validada; o formato exato do `remotePatterns` deve ser conferido na doc local do Next.

---

## Recomendação final e cadeia de fallback

| Necessidade | Primária | Fallback | Observação |
|---|---|---|---|
| Autocomplete destino | Open-Meteo Geocoding (`language=pt`, `count=5`) | — | Não usar texto livre "X - UF" |
| País → nome pt, moeda, bandeira | **JSON estático** gerado uma vez (base: REST Countries v5 com chave, ou Wikidata) | Wikidata SPARQL (nome pt, testado) | REST Countries v1–v4/v3.1 **morto** |
| Bandeira | `flagcdn.com/w320/{cca2}.png` | — | Testado 200 |
| Cotação → BRL | AwesomeAPI `/json/last/{X}-BRL` (`bid`) | open.er-api (`/v6/latest/{X}`, atribuição) → Frankfurter (`/v1/latest`) | IDR só em open.er-api/Frankfurter |
| Temperatura | Forecast (≤16 dias, ignorar `null`) | Archive do ano anterior (mesmas datas) | Limite 10k/dia |
| Imagem de capa | Wikipedia `prop=pageimages&pithumbsize=1280` | Summary `thumbnail` com `330px→1280px` | Barra Grande-PI: usar Cajueiro da Praia ou seed |

**Ordem de prioridade para a implementação:** (1) geocoding e temperatura (sem chave, testados) → (2) câmbio com a cadeia acima → (3) capa Wikipedia + seed para os 7 destinos → (4) países como JSON estático (elimina o problema do REST Countries).

Não há chave obrigatória para nenhuma das APIs usadas **exceto** REST Countries v5 (se for usada).
