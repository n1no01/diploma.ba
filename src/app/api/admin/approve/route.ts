import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { Resend } from 'resend';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { institutionId } = body;

    if (!institutionId) {
      return NextResponse.json(
        { error: 'ID institucije je obavezan.' },
        { status: 400 }
      );
    }

    const client = await pool.connect();

    // 1. Ažuriramo status u bazi na is_approved = TRUE
    const result = await client.query(
      'UPDATE institutions SET is_approved = TRUE WHERE id = $1 RETURNING name, email',
      [institutionId]
    );

    if (result.rows.length === 0) {
      client.release();
      return NextResponse.json(
        { error: 'Institucija nije pronađena.' },
        { status: 404 }
      );
    }

    const institution = result.rows[0];
    client.release();

    // 2. Šaljemo obavještenje preko Resend-a da je nalog odobren
    await resend.emails.send({
      from: 'Diploma.ba <noreply@diploma.ba>',
      to: institution.email,
      subject: 'Vaš račun je odobren - Diploma.ba',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; background-color: #f9fafb; border-radius: 8px;">
          <h2 style="color: #111827;">Čestitamo, ${institution.name}!</h2>
          <p style="color: #374151; font-size: 16px;">Administrator je pregledao i odobrio vaš zahtjev za registraciju na platformi Diploma.ba.</p>
          <div style="margin: 25px 0;">
            <a href="https://diploma.ba/login" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Prijavite se na portal</a>
          </div>
          <p style="color: #6b7280; font-size: 14px;">"Vaš nalog je sada spreman za sigurno izdavanje i verifikaciju digitalnih certifikata na platformi.</p>
        </div>
      `,
    });

    return NextResponse.json({
      success: true,
      message: `Institucija ${institution.name} je uspješno odobrena i poslan im je email obavještenja.`,
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Greška pri odobravanju';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}