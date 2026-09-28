/**
 * In-memory map of user id → latest profile image URL seen on this app session
 * (e.g. from dashboard). Lets the client detail page show the same image immediately
 * while `getDoc` runs; the browser also HTTP-caches the image bytes.
 */
const byUserId = new Map<string, string>();

export function setClientProfilePhotoUrl(userId: string, url: string): void {
  const t = url.trim();
  if (!userId || !t) return;
  byUserId.set(userId, t);
}

/** Called on sign-out so the next coach in this tab doesn't see the previous coach's clients. */
export function clearClientProfilePhotoCache(): void {
  byUserId.clear();
}

export function getClientProfilePhotoUrl(userId: string): string | null {
  if (!userId) return null;
  const u = byUserId.get(userId);
  return u && u.length > 0 ? u : null;
}
