/**
 * Capa da viagem: data URL de imagem (upload) ou URL https externa.
 * Uploads são guardados como bytes (+ tipo); capas externas, como URL.
 */

import type { ImageMime, TripCover } from "@/db/types";
import { apiErrors } from "@/server/http/errors";
import type { CoverImageSource } from "@/types/api";

export const MAX_COVER_BYTES = 2 * 1024 * 1024; // ~2 MB de imagem decodificada
export const MAX_COVER_URL_LENGTH = 2048;

const DATA_URL_RE = /^data:(image\/(?:jpeg|jpg|png|webp|gif));base64,([A-Za-z0-9+/]+={0,2})$/;

export interface DecodedImage {
  mime: ImageMime;
  bytes: Buffer;
}

/** Confere os "magic bytes" para garantir que o conteúdo bate com o tipo declarado. */
function matchesSignature(mime: ImageMime, bytes: Buffer): boolean {
  switch (mime) {
    case "image/jpeg":
      return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    case "image/png":
      return bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    case "image/gif":
      return bytes.subarray(0, 4).toString("latin1") === "GIF8";
    case "image/webp":
      return (
        bytes.subarray(0, 4).toString("latin1") === "RIFF" &&
        bytes.subarray(8, 12).toString("latin1") === "WEBP"
      );
  }
}

export function isDataUrl(value: string): boolean {
  return value.startsWith("data:");
}

/** Decodifica e valida um data URL de imagem; `null` se inválido ou grande demais. */
export function decodeImageDataUrl(value: string): DecodedImage | null {
  // Limite barato antes de rodar o regex/decodificar: base64 ocupa ~4/3 do tamanho.
  if (value.length > Math.ceil((MAX_COVER_BYTES * 4) / 3) + 128) return null;

  const match = DATA_URL_RE.exec(value);
  if (!match) return null;

  const mime = (match[1] === "image/jpg" ? "image/jpeg" : match[1]) as ImageMime;
  const bytes = Buffer.from(match[2], "base64");
  if (bytes.length === 0 || bytes.length > MAX_COVER_BYTES) return null;
  if (!matchesSignature(mime, bytes)) return null;

  return { mime, bytes };
}

/** URL externa aceita: https absoluta, sem credenciais embutidas. */
export function isHttpsUrl(value: string): boolean {
  if (value.length > MAX_COVER_URL_LENGTH) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && url.hostname !== "";
  } catch {
    return false;
  }
}

/**
 * Converte o `coverImage` (já validado) do cliente na capa a gravar:
 * data URL → upload (bytes + tipo); https → `wikipedia` (se o cliente disse) ou `externa`;
 * `null` → remove.
 */
export function toTripCover(
  coverImage: string | null,
  requestedSource: CoverImageSource | null | undefined,
): TripCover {
  if (coverImage === null) return null;

  if (isDataUrl(coverImage)) {
    const decoded = decodeImageDataUrl(coverImage);
    if (!decoded) {
      throw apiErrors.validation({ coverImage: "A imagem de capa é inválida ou grande demais." });
    }
    return { kind: "upload", ...decoded };
  }

  return {
    kind: "external",
    url: coverImage,
    source: requestedSource === "wikipedia" ? "wikipedia" : "externa",
  };
}
