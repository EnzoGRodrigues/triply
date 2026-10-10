import bcrypt from "bcryptjs";

const COST = 10;

/**
 * Hash fictício usado para gastar o mesmo tempo quando o e-mail não existe,
 * evitando revelar (por tempo de resposta) quais e-mails têm conta.
 */
const DUMMY_HASH = bcrypt.hashSync("triply-dummy-password", COST);

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, COST);
}

export async function verifyPassword(
  password: string,
  hash: string | undefined,
): Promise<boolean> {
  const valid = await bcrypt.compare(password, hash ?? DUMMY_HASH);
  return hash !== undefined && valid;
}
