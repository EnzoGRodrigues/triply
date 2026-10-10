# Seed de imagens — 7 destinos

Validado em **2026-10-09** com `curl -I -L` (todas HTTP 200, `content-type: image/jpeg`) e metadados via API do Wikimedia Commons (`iiurlwidth=1280`). Todas são URLs de **thumbnail de 1280 px de largura** do `upload.wikimedia.org`/`thumb.wikimedia.org`.

Licença: todas CC BY ou CC BY-SA. Ao exibir, colocar **autor + licença + link para a página do arquivo** (obrigatório pela licença).

| Destino | Arquivo (Commons) | Tamanho original | Autor | Licença | URL 1280px (testada 200) | Página do arquivo |
|---|---|---|---|---|---|---|
| Espanha / Madri | Plaza Mayor de Madrid - 01.jpg | 3888×2916 | Carlos Delgado (User:Kadellar) | CC BY-SA 3.0 | `https://thumb.wikimedia.org/wikipedia/commons/thumb/5/58/Plaza_Mayor_de_Madrid_-_01.jpg/1280px-Plaza_Mayor_de_Madrid_-_01.jpg` | https://commons.wikimedia.org/wiki/File:Plaza_Mayor_de_Madrid_-_01.jpg |
| França / Paris | Panoramic view on the illuminated 7th arrondissement of Paris at sunset in France.jpg | 6027×4020 | Basile Morin | CC BY-SA 4.0 | `https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/Panoramic_view_on_the_illuminated_7th_arrondissement_of_Paris_at_sunset_in_France.jpg/1280px-Panoramic_view_on_the_illuminated_7th_arrondissement_of_Paris_at_sunset_in_France.jpg` | https://commons.wikimedia.org/wiki/File:Panoramic_view_on_the_illuminated_7th_arrondissement_of_Paris_at_sunset_in_France.jpg |
| Maragogi-AL | Praia do paiva - Maragogi - Alagoas (2).jpg | 4608×3456 | Beto Quissak | CC BY-SA 4.0 | `https://upload.wikimedia.org/wikipedia/commons/thumb/b/b0/Praia_do_paiva_-_Maragogi_-_Alagoas_%282%29.jpg/1280px-Praia_do_paiva_-_Maragogi_-_Alagoas_%282%29.jpg` | https://commons.wikimedia.org/wiki/File:Praia_do_paiva_-_Maragogi_-_Alagoas_(2).jpg |
| Indonésia / Bali | Tanah Lot, Bali, Indonesia, 20220827 0957 1098.jpg | 4816×3215 | Jakub Hałun | CC BY-SA 4.0 | `https://upload.wikimedia.org/wikipedia/commons/thumb/3/32/Tanah_Lot%2C_Bali%2C_Indonesia%2C_20220827_0957_1098.jpg/1280px-Tanah_Lot%2C_Bali%2C_Indonesia%2C_20220827_0957_1098.jpg` | https://commons.wikimedia.org/wiki/File:Tanah_Lot,_Bali,_Indonesia,_20220827_0957_1098.jpg |
| Barra Grande-PI | Barra Grande (26070630347).jpg | 2988×1992 | Otávio Nogueira | CC BY 2.0 | `https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/Barra_Grande_%2826070630347%29.jpg/1280px-Barra_Grande_%2826070630347%29.jpg` | https://commons.wikimedia.org/wiki/File:Barra_Grande_(26070630347).jpg |
| Natal-RN | Ponta Negra Beach, Natal, Brazil.jpg | 3264×2448 | CivArmy | CC BY-SA 4.0 | `https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/Ponta_Negra_Beach%2C_Natal%2C_Brazil.jpg/1280px-Ponta_Negra_Beach%2C_Natal%2C_Brazil.jpg` | https://commons.wikimedia.org/wiki/File:Ponta_Negra_Beach,_Natal,_Brazil.jpg |
| México / Tulum | Maya ruins at Tulum 2023 - beach.jpg | 4032×3024 | Erik Cleves Kristensen | CC BY 2.0 | `https://upload.wikimedia.org/wikipedia/commons/thumb/c/cb/Maya_ruins_at_Tulum_2023_-_beach.jpg/1280px-Maya_ruins_at_Tulum_2023_-_beach.jpg` | https://commons.wikimedia.org/wiki/File:Maya_ruins_at_Tulum_2023_-_beach.jpg |

## Notas

- **Natal:** autor confirmado pelo campo `Artist` do Commons (CivArmy, CC BY-SA 4.0). Alternativa também validada com `curl -I` (HTTP 200): "Praia da Ponta Negra 20150814-DSC05653.JPG" (Matti Blume, CC BY-SA 4.0), `https://upload.wikimedia.org/wikipedia/commons/thumb/3/37/Praia_da_Ponta_Negra_20150814-DSC05653.JPG/1280px-Praia_da_Ponta_Negra_20150814-DSC05653.JPG`.
- **Paris:** a foto escolhida é um panorama ao entardecer de Paris (7º distrito, Torre Eiffel ao fundo). A Torre não é o assunto principal. Alternativa testada na busca: "Paris Night.jpg" (Benh LIEU SONG, CC BY-SA 4.0, 11528×3639) — mais larga, mas não foi validada com `curl -I`.
- **Barra Grande-PI:** a foto escolhida é do acervo do Flickr de Otávio Nogueira (CC BY 2.0), típica de praia nordestina, mas não confirmei visualmente que é de Barra Grande (PI) e não de outro ponto de Barra Grande/Forta. Esse nome aparece na descrição do arquivo; conferir antes de publicar.
- **Bali:** a foto é do templo Tanah Lot (Bali). Boa para capa.
- **Maragogi:** praia do Paiva (Maragogi). O nome do arquivo confirma o município.
- **Madri:** a praça Plaza Mayor é reconhecível e a foto é de 3888 px, boa para capa.
- **Tulum:** ruínas maias com praia ao fundo, arquivo de 2023.

## Como reproduzir / atualizar

Ver a metodologia em `apis-externas.md` §e. Para outra foto, buscar no Commons:

```
https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=<termo>&gsrlimit=5&prop=imageinfo&iiprop=url|extmetadata|size|mime&iiurlwidth=1280&format=json
```

e usar `imageinfo[0].thumburl` (já vem na largura pedida). Validar com `curl -I -L` antes de salvar.
