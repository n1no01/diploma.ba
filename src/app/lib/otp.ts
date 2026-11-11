import crypto from 'crypto';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export const OTP_TTL_MIN = 10;        // koliko minuta kod važi
export const OTP_MAX_ATTEMPTS = 5;    // maksimalan broj pogrešnih pokušaja po kodu
export const OTP_RESEND_SECONDS = 30; // minimalni razmak između slanja novih kodova

export function generateOtp(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

// Kod se u bazi čuva samo kao HMAC hash, nikad kao običan tekst
export function hashOtp(email: string, code: string): string {
  return crypto
    .createHmac('sha256', process.env.NEXTAUTH_SECRET || '')
    .update(`${email.toLowerCase()}:${code}`)
    .digest('hex');
}

export function safeEqual(a: string, b: string): boolean {
  const A = Buffer.from(a);
  const B = Buffer.from(b);
  return A.length === B.length && crypto.timingSafeEqual(A, B);
}

export async function sendOtpEmail(to: string, code: string) {
  const { error } = await resend.emails.send({
    from: 'Diploma.ba <noreply@diploma.ba>',
    to,
    subject: 'Kod za prijavu - Diploma.ba',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; background-color: #f9fafb; border-radius: 8px;">
        <h2 style="color: #111827;">Prijava na Diploma.ba</h2>
        <p style="color: #374151; font-size: 16px;">Vaš kod za dvostepenu provjeru je:</p>
        <div style="background-color: #ffffff; padding: 16px; text-align: center; border-radius: 6px; border: 1px solid #e5e7eb; margin: 20px 0;">
          <h1 style="color: #2563eb; letter-spacing: 4px; margin: 0; font-size: 32px;">${code}</h1>
        </div>
        <p style="color: #6b7280; font-size: 14px;">Kod važi ${OTP_TTL_MIN} minuta. Ako se niste pokušali prijaviti, ignorišite ovaj mail i promijenite lozinku.</p>
      </div>
    `,
  });
  if (error) throw new Error('OTP_SEND_FAILED');
}
