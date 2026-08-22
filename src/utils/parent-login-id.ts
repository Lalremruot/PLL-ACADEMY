/**
 * Builds parent portal login IDs from a student's first name + random digits.
 * Example: "Thangminlel" → "Thangmin67876", "Liam Sterling" → "Liam48291"
 */

export function extractFirstName(studentName: string): string {
  const token = studentName.trim().split(/\s+/)[0]?.replace(/[^a-zA-Z]/g, '') || 'Student';
  const base = token.length > 8 ? token.slice(0, 8) : token;
  if (!base) return 'Student';
  return base.charAt(0).toUpperCase() + base.slice(1).toLowerCase();
}

export function buildParentLoginId(firstName: string, digitSuffix: string): string {
  return `${firstName}${digitSuffix}`;
}

/** Generates a unique login id given a set of ids already in use (lowercase keys). */
export function generateParentLoginId(studentName: string, existingIds: Set<string>): string {
  const firstName = extractFirstName(studentName);
  for (let attempt = 0; attempt < 64; attempt++) {
    const suffix = String(Math.floor(10000 + Math.random() * 90000));
    const candidate = buildParentLoginId(firstName, suffix);
    if (!existingIds.has(candidate.toLowerCase())) {
      return candidate;
    }
  }
  return buildParentLoginId(firstName, String(Date.now()).slice(-5));
}
