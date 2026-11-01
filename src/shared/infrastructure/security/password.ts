import argon2 from 'argon2';

// Argon2id with the same defaults as Python's pwdlib (t=3, m=64MiB, p=4),
// so hashes created by the old backend keep working.
export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password);
}

export async function verifyPassword(
  plainPassword: string,
  hashedPassword: string,
): Promise<boolean> {
  return argon2.verify(hashedPassword, plainPassword);
}

/** Verify a password; also return a fresh hash if the stored one should be upgraded. */
export async function verifyAndUpdatePassword(
  plainPassword: string,
  hashedPassword: string,
): Promise<{ ok: boolean; upgradedHash: string | null }> {
  const ok = await argon2.verify(hashedPassword, plainPassword);
  if (ok && argon2.needsRehash(hashedPassword)) {
    return { ok, upgradedHash: await hashPassword(plainPassword) };
  }
  return { ok, upgradedHash: null };
}
