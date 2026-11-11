export type WebsiteResult = { ok: true; value: string | null } | { ok: false; error: string };

const ERR = 'Unesite ispravnu adresu web stranice (npr. www.ustanova.ba).';

// Prazno -> null. Inače mora biti ispravan http/https URL; "www.ustanova.ba" postaje "https://www.ustanova.ba".
export function normalizeWebsite(input: unknown): WebsiteResult {
  if (input === undefined || input === null) return { ok: true, value: null };
  if (typeof input !== 'string') return { ok: false, error: ERR };

  let raw = input.trim();
  if (!raw) return { ok: true, value: null };
  if (raw.length > 200) return { ok: false, error: 'Adresa web stranice je predugačka.' };
  if (!/^https?:\/\//i.test(raw)) raw = `https://${raw}`;

  try {
    const url = new URL(raw);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return { ok: false, error: ERR };
    if (!url.hostname.includes('.') || url.username || url.password) return { ok: false, error: ERR };
    const value = url.pathname === '/' && !url.search && !url.hash ? url.origin : url.toString();
    return { ok: true, value };
  } catch {
    return { ok: false, error: ERR };
  }
}
