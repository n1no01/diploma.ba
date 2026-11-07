import { Resend } from 'resend';
import PDFDocument from 'pdfkit';
import path from 'path';

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendCertificateEmailParams {
  studentEmail: string;
  studentName: string;
  institutionName: string;
  certificateTitle: string;
  verifyToken: string; // certificateHash
  certificateId: number; // Dodali smo ID da znamo šta generišemo u PDF-u (opciono, ili proslijedi podatke)
}

// Pomoćna funkcija za generisanje PDF bafera u letu za email attachment
async function generatePdfBuffer(certData: {
  studentName: string;
  certificateType: string;
  institutionName: string;
  identifier?: string;
  txHash?: string;
  createdAt: Date;
}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margin: 40,
      });

      const chunks: Uint8Array[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      // Putanja do custom fontova sa podrškom za Č, Ć, Š, Đ, Ž
      const fontRegularPath = path.join(process.cwd(), 'public/fonts/Roboto-Regular.ttf');
      const fontBoldPath = path.join(process.cwd(), 'public/fonts/Roboto-Bold.ttf');

      doc.registerFont('Roboto-Regular', fontRegularPath);
      doc.registerFont('Roboto-Bold', fontBoldPath);

      // --- DIZAJN PDF CERTIFIKATA ---
      doc.rect(20, 20, 782, 555).lineWidth(3).strokeColor('#0f172a').stroke();
      doc.rect(28, 28, 766, 539).lineWidth(1).strokeColor('#2563eb').stroke();

      doc.font('Roboto-Bold').fontSize(16).fillColor('#2563eb').text(certData.institutionName.toUpperCase(), 0, 75, { align: 'center' });
      doc.font('Roboto-Bold').fontSize(30).fillColor('#0f172a').text('CERTIFIKAT O USPJEHU', 0, 120, { align: 'center' });
      doc.font('Roboto-Regular').fontSize(12).fillColor('#64748b').text('Ovim se potvrđuje da je polaznik/ca', 0, 175, { align: 'center' });
      
      // Ime studenta (podržava dijakritičke znakove)
      doc.font('Roboto-Bold').fontSize(26).fillColor('#0f172a').text(certData.studentName, 0, 205, { align: 'center' });
      
      doc.font('Roboto-Regular').fontSize(12).fillColor('#64748b').text('uspješno završio/la program / vrstu certifikata:', 0, 250, { align: 'center' });
      doc.font('Roboto-Bold').fontSize(20).fillColor('#1e40af').text(certData.certificateType, 0, 280, { align: 'center' });

      if (certData.identifier) {
        doc.font('Roboto-Regular').fontSize(11).fillColor('#475569').text(`Identifikator: ${certData.identifier}`, 0, 315, { align: 'center' });
      }

      doc.moveTo(271, 360).lineTo(571, 360).lineWidth(1).strokeColor('#e2e8f0').stroke();

      doc.font('Roboto-Regular').fontSize(10).fillColor('#64748b').text(`Datum izdavanja: ${new Date(certData.createdAt).toLocaleDateString('bs-BA')}`, 60, 420);
      doc.font('Roboto-Bold').fontSize(10).fillColor('#059669').text('Status verifikacije: Neizbrisivo zapisano na Base Mainnetu', 60, 440);
      doc.font('Roboto-Regular').fontSize(8).fillColor('#94a3b8').text(`TX HASH: ${certData.txHash || 'N/A'}`, 60, 460);
      doc.font('Roboto-Bold').fontSize(10).fillColor('#0f172a').text('diploma.ba', 0, 460, { align: 'right', width: 762 });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

export async function sendCertificateEmail({
  studentEmail,
  studentName,
  institutionName,
  certificateTitle,
  verifyToken: certificateHash,
}: SendCertificateEmailParams) {
  const verifyUrl = `${process.env.APP_URL}/verifikuj?hash=${certificateHash}`;

  try {
    // 1. Generišemo PDF bafer u letu za prilog (attachment)
    const pdfBuffer = await generatePdfBuffer({
      studentName,
      certificateType: certificateTitle,
      institutionName,
      txHash: certificateHash,
      createdAt: new Date(),
    });

    // 2. Šaljemo mail preko Resend-a sa zakačenim PDF-om
    const data = await resend.emails.send({
      from: 'diploma.ba <onboarding@resend.dev>',
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
            U prilogu ovog emaila se nalazi vaš zvanični <strong>PDF certifikat</strong>. Vaš dokument je također nepromjenjivo zapisan na Base blockchain mreži.
          </p>
          <div style="text-align: center; margin: 35px 0;">
            <a href="${verifyUrl}" style="background-color: #2563eb; color: #ffffff; padding: 14px 28px; text-decoration: none; font-weight: bold; border-radius: 12px; display: inline-block; box-shadow: 0 4px 6px rgba(37, 99, 235, 0.2);">
              Provjeri Potvrdu Online
            </a>
          </div>
        </div>
      `,
      attachments: [
        {
          filename: `Certifikat-${studentName.replace(/\s+/g, '_')}.pdf`,
          content: pdfBuffer,
        },
      ],
    });

    return { success: true, data };
  } catch (error) {
    console.error('Greška pri slanju emaila ili generisanju PDF-a:', error);
    return { success: false, error };
  }
}