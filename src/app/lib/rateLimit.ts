import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

type HeaderSource = Headers | Record<string, unknown> | null | undefined;

function readHeader(headers: HeaderSource, name: string): string | null {
  if (!headers) return null;
  if (typeof Headers !== 'undefined' && headers instanceof Headers) return headers.get(name);
  const v = (headers as Record<string, unknown>)[name];
  if (Array.isArray(v)) return typeof v[0] === 'string' ? v[0] : null;
  return typeof v === 'string' ? v : null;
}

// IP klijenta. Na Vercelu je prvi unos u x-forwarded-for stvarna IP adresa klijenta.
export function getClientIp(headers: HeaderSource): string {
  const xff = readHeader(headers, 'x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return readHeader(headers, 'x-real-ip') || 'unknown';
}

// Je li ključ dostigao limit u zadanom prozoru (ne povećava brojač)
export async function isRateLimited(key: string, max: number, windowSec: number): Promise<boolean> {
  const r = await pool.query(
    `SELECT count FROM rate_limits
     WHERE key = $1 AND window_start > NOW() - make_interval(secs => $2::double precision)`,
    [key, windowSec]
  );
  return r.rows.length > 0 && r.rows[0].count >= max;
}

// Povećava brojač (atomski); ako je prozor istekao, kreće ispočetka. Vraća novi broj.
export async function hitRateLimit(key: string, windowSec: number): Promise<number> {
  const r = await pool.query(
    `INSERT INTO rate_limits (key, count, window_start) VALUES ($1, 1, NOW())
     ON CONFLICT (key) DO UPDATE SET
       count = CASE WHEN rate_limits.window_start > NOW() - make_interval(secs => $2::double precision)
                    THEN rate_limits.count + 1 ELSE 1 END,
       window_start = CASE WHEN rate_limits.window_start > NOW() - make_interval(secs => $2::double precision)
                           THEN rate_limits.window_start ELSE NOW() END
     RETURNING count`,
    [key, windowSec]
  );
  // Povremeno čišćenje starih zapisa
  if (Math.random() < 0.01) {
    pool.query(`DELETE FROM rate_limits WHERE window_start < NOW() - INTERVAL '1 day'`).catch(() => {});
  }
  return r.rows[0].count;
}

export async function resetRateLimit(key: string): Promise<void> {
  await pool.query('DELETE FROM rate_limits WHERE key = $1', [key]);
}

// Svaki zahtjev se broji. Vraća true ako je zahtjev dozvoljen.
export async function consumeRateLimit(key: string, max: number, windowSec: number): Promise<boolean> {
  const count = await hitRateLimit(key, windowSec);
  return count <= max;
}
