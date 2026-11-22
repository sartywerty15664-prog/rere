import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
const SCRYPT_OPTIONS = { N: 1 << 17, r: 8, p: 1, maxmem: 256 * 1024 * 1024 };

export function randomToken(bytes = 32) {
  return randomBytes(bytes).toString('base64url');
}

export function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const derived = await scrypt(password, salt, 64, SCRYPT_OPTIONS);
  return { salt, hash: derived.toString('hex') };
}

export async function verifyPassword(password, salt, expectedHash) {
  const expected = Buffer.from(expectedHash, 'hex');
  if (expected.length !== 64) return false;
  const current = await scrypt(password, salt, 64, SCRYPT_OPTIONS);
  if (timingSafeEqual(current, expected)) return true;

  // Existing accounts were created with Node's historical default N=2^14.
  // Keep them able to sign in while all newly stored hashes use N=2^17.
  const legacy = await scrypt(password, salt, 64, { N: 1 << 14, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return timingSafeEqual(legacy, expected);
}

export function safeEqual(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && timingSafeEqual(a, b);
}

export function parseCookies(header = '') {
  return Object.fromEntries(
    header.split(';').map((part) => part.trim()).filter(Boolean).map((part) => {
      const index = part.indexOf('=');
      if (index === -1) return [part, ''];
      return [part.slice(0, index), decodeURIComponent(part.slice(index + 1))];
    }),
  );
}
