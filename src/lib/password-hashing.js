const { randomBytes, scrypt, timingSafeEqual } = require("crypto");
const { promisify } = require("util");

const scryptAsync = promisify(scrypt);

const PASSWORD_HASH_VERSION = "scrypt";
const PASSWORD_KEY_LENGTH = 64;
const SCRYPT_PARAMS = {
  N: 16384,
  r: 8,
  p: 1,
  maxmem: 64 * 1024 * 1024,
};

async function hashPassword(password) {
  const salt = randomBytes(16).toString("base64url");
  const derivedKey = await scryptAsync(
    password,
    salt,
    PASSWORD_KEY_LENGTH,
    SCRYPT_PARAMS,
  );

  return [
    PASSWORD_HASH_VERSION,
    SCRYPT_PARAMS.N,
    SCRYPT_PARAMS.r,
    SCRYPT_PARAMS.p,
    salt,
    derivedKey.toString("base64url"),
  ].join("$");
}

async function verifyPassword(password, passwordHash) {
  const [version, n, r, p, salt, storedHash] = passwordHash.split("$");
  const params = {
    N: Number(n),
    r: Number(r),
    p: Number(p),
    maxmem: SCRYPT_PARAMS.maxmem,
  };

  if (
    version !== PASSWORD_HASH_VERSION ||
    !salt ||
    !storedHash ||
    !Number.isInteger(params.N) ||
    !Number.isInteger(params.r) ||
    !Number.isInteger(params.p)
  ) {
    return false;
  }

  try {
    const derivedKey = await scryptAsync(
      password,
      salt,
      PASSWORD_KEY_LENGTH,
      params,
    );
    const storedKey = Buffer.from(storedHash, "base64url");

    if (storedKey.length !== derivedKey.length) {
      return false;
    }

    return timingSafeEqual(storedKey, derivedKey);
  } catch {
    return false;
  }
}

module.exports = {
  hashPassword,
  verifyPassword,
};
