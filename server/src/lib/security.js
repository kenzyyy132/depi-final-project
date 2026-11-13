import { createHash, randomBytes, randomInt, randomUUID, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);
const N = 16384, R = 8, P = 1, KEYLEN = 64;

/** Password hash format: scrypt$N$r$p$saltB64$hashB64 (memory-hard, per-user random salt). */
export async function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password.normalize('NFKC'), salt, KEYLEN, { N, r: R, p: P, maxmem: 64 * 1024 * 1024 });
  return `scrypt$${N}$${R}$${P}$${salt.toString('base64')}$${hash.toString('base64')}`;
}

export async function verifyPassword(password, stored) {
  const parts = String(stored || '').split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const [, n, r, p, saltB64, hashB64] = parts;
  const expected = Buffer.from(hashB64, 'base64');
  const actual = await scryptAsync(password.normalize('NFKC'), Buffer.from(saltB64, 'base64'), expected.length, {
    N: Number(n), r: Number(r), p: Number(p), maxmem: 64 * 1024 * 1024,
  });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

// A real hash of a random password, used to keep login timing the same for unknown emails.
let dummy;
export const dummyHash = async () => (dummy ??= await hashPassword(randomBytes(12).toString('hex')));

export const newId = () => randomUUID();
export const randomToken = () => randomBytes(32).toString('base64url');
export const sha256 = (s) => createHash('sha256').update(s).digest('hex');

// Same alphabet and length as the original makeJoinCode (no 0/O/1/I/L), but cryptographically random.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const makeJoinCode = () => Array.from({ length: 6 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');
export const normalizeJoinCode = (code) => String(code || '').trim().toUpperCase().replace(/[\s-]/g, '');
