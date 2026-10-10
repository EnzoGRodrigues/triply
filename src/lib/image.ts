/**
 * Redimensiona uma imagem enviada pelo usuário no navegador:
 * lado máximo 1280 px, JPEG ~0,8, devolvendo um data URL.
 */

export const MAX_COVER_SIDE = 1280;

const MAX_INPUT_BYTES = 15 * 1024 * 1024;
/** Limite do back-end (~2 MB) — em base64 o tamanho do texto é ≈ 4/3 do binário. */
const MAX_OUTPUT_CHARS = 2 * 1024 * 1024 * (4 / 3);

export class ImageProcessingError extends Error {}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new ImageProcessingError("Não foi possível ler essa imagem. Tente outro arquivo."));
    };
    img.src = url;
  });
}

export async function resizeImageToDataUrl(
  file: File,
  { maxSide = MAX_COVER_SIDE, quality = 0.8 }: { maxSide?: number; quality?: number } = {},
): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new ImageProcessingError("Escolha um arquivo de imagem (JPG, PNG, WebP…).");
  }
  if (file.size > MAX_INPUT_BYTES) {
    throw new ImageProcessingError("A imagem é muito grande (máx. 15 MB).");
  }

  const img = await loadImage(file);
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  const width = Math.max(1, Math.round(img.naturalWidth * scale));
  const height = Math.max(1, Math.round(img.naturalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new ImageProcessingError("Seu navegador não conseguiu processar a imagem.");

  // JPEG não tem transparência: pinta o fundo de branco antes.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  let q = quality;
  let dataUrl = canvas.toDataURL("image/jpeg", q);
  while (dataUrl.length > MAX_OUTPUT_CHARS && q > 0.4) {
    q -= 0.1;
    dataUrl = canvas.toDataURL("image/jpeg", q);
  }
  if (dataUrl.length > MAX_OUTPUT_CHARS) {
    throw new ImageProcessingError("Mesmo reduzida, a imagem ficou grande demais. Tente outra.");
  }
  return dataUrl;
}
