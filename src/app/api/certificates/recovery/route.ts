import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { Resend } from 'resend';
import { consumeRateLimit, getClientIp } from '@/app/lib/rateLimit';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email || !email.trim()) {
      return NextResponse.json({ error: 'Email adresa je obavezna.' }, { status: 400 });
    }

    // Ograničenje: po IP adresi (10/h) i po emailu (2/h). Broji se bez obzira postoji li email u bazi.
    const ip = getClientIp(req.headers);
    const emailKey = email.trim().toLowerCase();
    const allowedIp = await consumeRateLimit(`recovery-ip:${ip}`, 10, 3600);
    const allowedEmail = await consumeRateLimit(`recovery-email:${emailKey}`, 2, 3600);
    if (!allowedIp || !allowedEmail) {
      return NextResponse.json(
        { error: 'Previše zahtjeva. Pokušajte ponovo za sat vremena.' },
        { status: 429 }
      );
    }

    const client = await pool.connect();
    
    // Koristimo c.institution i radimo JOIN za slučaj da se ime vlači preko ID-ja
   const queryText = `
      SELECT 
        c.certificate_type, 
        COALESCE(i.name, 'Nepoznata institucija') AS institution_name, 
        c.certificate_hash 
      FROM certificates c
      LEFT JOIN institutions i ON c.institution_id = i.id
      WHERE LOWER(c.student_email) = LOWER($1) AND c.status = 'active'
    `;
    
    const result = await client.query(queryText, [email.trim()]);
    client.release();

    if (result.rows.length === 0) {
      // Iz sigurnosnih razloga uvijek vraćamo uspjeh da se ne otkriva postoji li mail u bazi
      return NextResponse.json({
        success: true,
        message: 'Ako uneseni email postoji u bazi, poslali smo popis verifikacijskih linkova.',
      });
    }

    // Generisanje HTML liste svih sertifikata sa ispravnim linkom (?hash=...)
    const certListHtml = result.rows
      .map(
        (cert) => `
        <div style="background-color: #1e293b; padding: 15px; border-radius: 8px; margin-bottom: 12px; border: 1px solid #334155;">
          <strong style="color: #ffffff; font-size: 16px; display: block; margin-bottom: 4px;">${cert.certificate_type}</strong>
          <span style="color: #94a3b8; font-size: 13px; display: block; margin-bottom: 8px;">Izdavalac: ${cert.institution_name}</span>
          <a href="${process.env.APP_URL}/verifikuj?hash=${cert.certificate_hash}" 
             style="color: #38bdf8; display: inline-block; font-weight: bold; text-decoration: none; font-size: 13px;">
             Otvori Verifikacijski Link &rarr;
          </a>
        </div>
      `
      )
      .join('');

    await resend.emails.send({
      from: 'diploma.ba <noreply@diploma.ba>',
      to: [email.trim()],
      subject: 'Oporavak vaših diploma i certifikata - diploma.ba',
      html: `
        <div style="font-family: Arial, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 30px; border-radius: 12px; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #38bdf8; margin-top: 0;">Vaši registrovani certifikati</h2>
          <p style="color: #94a3b8; font-size: 14px;">Zatražili ste oporavak verifikacijskih linkova za vaše diplome i certifikate vezane za ovu email adresu:</p>
          <div style="margin: 20px 0;">
            ${certListHtml}
          </div>
          <p style="font-size: 12px; color: #64748b; text-align: center; margin-top: 30px;">diploma.ba — Sigurna blockchain verifikacija</p>
        </div>
      `,
    });

    return NextResponse.json({
      success: true,
      message: 'Ako uneseni email postoji u bazi, poslali smo popis verifikacijskih linkova.',
    });

  } catch (error: any) {
    console.error('Greška pri oporavku:', error);
    return NextResponse.json({ error: 'Greška na serveru: ' + error.message }, { status: 500 });
  }
}