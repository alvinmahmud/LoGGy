import { promisify } from "util";
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "crypto";

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;
const VERSION = "scrypt-v1";

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const derivedKey = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;

  return `${VERSION}$${salt.toString("base64url")}$${derivedKey.toString("base64url")}`;
}

export async function verifyPassword(password: string, storedHash: string) {
  const [version, encodedSalt, encodedKey] = storedHash.split("$");

  if (version !== VERSION || !encodedSalt || !encodedKey) {
    return false;
  }

  try {
    const salt = Buffer.from(encodedSalt, "base64url");
    const expectedKey = Buffer.from(encodedKey, "base64url");
    const actualKey = (await scrypt(
      password,
      salt,
      expectedKey.length,
    )) as Buffer;

    return (
      expectedKey.length === actualKey.length &&
      timingSafeEqual(expectedKey, actualKey)
    );
  } catch {
    return false;
  }
}
