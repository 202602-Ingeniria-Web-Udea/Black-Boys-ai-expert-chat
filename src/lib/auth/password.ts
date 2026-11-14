import bcrypt from "bcryptjs";

const ROUNDS = 11;

// Hash válido de una contraseña que nadie conoce: se compara cuando el correo no existe para que
// el tiempo de respuesta sea parecido y no se pueda deducir qué correos están registrados.
const DUMMY_HASH = "$2b$11$ptMo39L9gbbUCMPIj5nsG.ozCuXn91i6Rgwn3vadlVyMVJWnIxf6O";

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, ROUNDS);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export async function burnPasswordCheck(plain: string): Promise<void> {
  await bcrypt.compare(plain, DUMMY_HASH);
}
