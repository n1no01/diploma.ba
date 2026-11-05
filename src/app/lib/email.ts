import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendCertificateEmailParams {
  studentEmail: string;
  studentName: string;
  institutionName: string;
  certificateTitle: string;
  verifyToken: string; // Možeš ostaviti naziv parametra zbog kompatibilnosti, ali ga tretiramo kao hash
}

export async function sendCertificateEmail({
  studentEmail,
  studentName,
  institutionName,
  certificateTitle,
  verifyToken: certificateHash, // Mapiramo token na certificateHash
}: SendCertificateEmailParams) {
  // Generisemo link koristeći hash umjesto tokena
  const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verifikuj?hash=${certificateHash}`;

  try {
    const data = await resend.emails.send({
      from: 'diploma.ba <onboarding@resend.dev>', // Nakon verifikacije domene na Resendu
      to: [studentEmail],
      subject: `Izdana vam je zvanična diploma/certifikat - ${institutionName}`,
      html: `
        <div style="font-family: Arial, sans-serif; background-color: #f8fafc; color: #1e293b; padding: 40px; border-radius: 16px; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0;">
          <h2 style="color: #0284c7; margin-bottom: 20px;">Poštovani/a ${studentName},</h2>
          <p style="font-size: 16px; line-height: 1.6; color: #475569;">
            Ustanova <strong style="color: #0f172a;">${institutionName}</strong> vam je zvanično izdala digitalni certifikat/diplomu:
          </p>
          <div style="background-color: #ffffff; border-left: 4px solid #0284c7; padding: 15px; margin: 20px 0; border-radius: 8px; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
            <p style="margin: 0; font-size: 18px; font-weight: bold; color: #0f172a;">${certificateTitle}</p>
          </div>
          <p style="font-size: 14px; line-height: 1.6; color: #475569;">
            Vaš dokument je nepromjenjivo zapisan na blockchain mreži. Link ispod možete proslijediti poslodavcima ili partnerima kako bi u 1 sekundi potvrdili autentičnost vašeg dokumenta.
          </p>
          <div style="text-align: center; margin: 35px 0;">
            <a href="${verifyUrl}" style="background-color: #2563eb; color: #ffffff; padding: 14px 28px; text-decoration: none; font-weight: bold; border-radius: 12px; display: inline-block; box-shadow: 0 4px 6px rgba(37, 99, 235, 0.2);">
              Provjeri i Preuzmi Potvrdu
            </a>
          </div>
          <p style="font-size: 12px; color: #64748b; text-align: center; margin-top: 30px; word-break: break-all;">
            Ako dugme ne radi, kopirajte sljedeći link u vaš preglednik:<br/>
            <a href="${verifyUrl}" style="color: #2563eb;">${verifyUrl}</a>
          </p>
        </div>
      `,
    });

    return { success: true, data };
  } catch (error) {
    console.error('Greška pri slanju emaila preko Resend-a:', error);
    return { success: false, error };
  }
}