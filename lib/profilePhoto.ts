/** `profilePhoto` on user docs: Firebase Storage download URL (or empty to use avatar initials). */
export function profilePhotoUrl(value: unknown): string {
  if (typeof value !== "string") return "";
  const t = value.trim();
  return t.length > 0 ? t : "";
}
