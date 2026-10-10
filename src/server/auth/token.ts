import { jwtVerify, SignJWT } from "jose";

/** Módulo sem acesso ao banco: também é usado pelo `src/proxy.ts`. */

export const SESSION_COOKIE = "triply_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 dias

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

let cachedKey: Uint8Array | undefined;

/** `JWT_SECRET` validado (32+ caracteres). Também serve de chave dos HMACs internos. */
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "JWT_SECRET ausente ou curto demais (use ao menos 32 caracteres; veja .env.example).",
    );
  }
  return secret;
}

function getKey(): Uint8Array {
  cachedKey ??= new TextEncoder().encode(getJwtSecret());
  return cachedKey;
}

export async function signSessionToken(userId: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(getKey());
}

/** Retorna o id do usuário se o token for válido (assinatura + expiração); senão `null`. */
export async function verifySessionToken(
  token: string | undefined,
): Promise<string | null> {
  if (!token) return null;
  // Fora do try: JWT_SECRET mal configurado deve falhar alto, não deslogar todo mundo em silêncio.
  const key = getKey();
  try {
    const { payload } = await jwtVerify(token, key, {
      algorithms: ["HS256"],
    });
    return typeof payload.sub === "string" && UUID_RE.test(payload.sub)
      ? payload.sub
      : null;
  } catch {
    return null;
  }
}
