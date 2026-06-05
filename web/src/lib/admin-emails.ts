/** Parsed allowlist from ADMIN_EMAILS (lowercase, trimmed). */
export function getAdminEmailSet(): Set<string> {
  const raw = process.env.ADMIN_EMAILS ?? '';
  const emails = raw
    .split(',')
    .map((part) => part.trim().toLowerCase())
    .filter((part) => part.length > 0);
  return new Set(emails);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (email === null || email === undefined || email === '') {
    return false;
  }
  return getAdminEmailSet().has(email.toLowerCase());
}
