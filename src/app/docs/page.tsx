import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Dokumentacija | diploma.ba',
  description:
    'API dokumentacija za institucije: automatsko izdavanje certifikata s vaše platforme putem API ključa.',
};

const curlExample = `curl -X POST https://diploma.ba/api/v1/certificates \\
  -H "Authorization: Bearer dpl_VAS_KLJUC" \\
  -H "Content-Type: application/json" \\
  -d '{
    "studentName": "Ime Prezime",
    "studentEmail": "student@example.com",
    "certificateType": "Naziv kursa",
    "identifier": "course-12-user-345"
  }'`;

const nodeExample = `const res = await fetch('https://diploma.ba/api/v1/certificates', {
  method: 'POST',
  headers: {
    Authorization: \`Bearer \${process.env.DIPLOMA_API_KEY}\`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    studentName: user.fullName,
    studentEmail: user.email,
    certificateType: course.title,
    identifier: \`course-\${course.id}-user-\${user.id}\`,
  }),
});
const data = await res.json();
// sačuvajte data.verifyUrl uz zapis "položio kurs" u svojoj bazi`;

const responseExample = `{
  "success": true,
  "alreadyIssued": false,
  "certificateId": 123,
  "certificateHash": "…",
  "txHash": "0x…",
  "status": "active",
  "verifyUrl": "https://diploma.ba/verifikuj?hash=…"
}`;

const fields: [string, string, string][] = [
  ['studentName', 'da', 'Ime i prezime (najviše 200 znakova)'],
  ['studentEmail', 'da', 'Email primaoca; na njega stiže obavijest o certifikatu'],
  ['certificateType', 'ne (preporučeno)', 'Naziv certifikata/kursa (ako se izostavi, koristi se „Diploma o završenom studiju“)'],
  ['identifier', 'ne (preporučeno)', 'Vaš interni ID, npr. broj indeksa ili ID kursa i korisnika (najviše 100 znakova). Ulazi u izračun hasha, pa bez njega isti student ne može dobiti dva istovjetna certifikata istog naziva'],
  ['metadata', 'ne', 'JSON objekat s dodatnim podacima (najviše 4000 znakova)'],
  ['expiresAt', 'ne', 'Datum isteka, npr. 2030-12-31'],
  ['sendEmail', 'ne', 'false ako ne želite da šaljemo mail primaocu (zadano true)'],
];

const errors: [string, string][] = [
  ['400', 'Neispravni podaci'],
  ['401', 'Nevažeći ili nedostajući API ključ'],
  ['403', 'Nalog ustanove nije odobren'],
  ['429', 'Previše zahtjeva (ograničenje 60 u minuti)'],
  ['502', 'Greška pri upisu na blockchain'],
  ['500', 'Greška na serveru'],
];

function Code({ children }: { children: string }) {
  return (
    <pre className="bg-slate-900 text-slate-100 text-xs sm:text-sm rounded-2xl p-5 overflow-x-auto leading-relaxed">
      <code>{children}</code>
    </pre>
  );
}

export default function DocsPage() {
  return (
    <main className="max-w-4xl mx-auto px-6 py-16 text-slate-700">
      <div className="bg-white border border-slate-200 p-8 sm:p-12 rounded-3xl shadow-xl space-y-10">
        <div className="border-b border-slate-100 pb-6">
          <span className="text-xs font-semibold text-blue-600 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
            Dokumentacija
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mt-4">
            API: automatsko izdavanje certifikata
          </h1>
          <p className="text-slate-500 text-sm mt-2">
            Povežite vlastitu platformu s diploma.ba tako da se certifikat izda čim korisnik završi kurs, bez ručne prijave na diploma.ba.
          </p>
        </div>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900">1. Kako radi</h2>
          <ol className="list-decimal list-inside text-sm space-y-2 text-slate-600 pl-2">
            <li>Registrujte ustanovu i sačekajte da administrator odobri nalog.</li>
            <li>
              Na stranici <Link href="/profil" className="text-blue-600 hover:underline">Profil</Link> u sekciji <strong className="text-slate-900">API pristup</strong> generišite API ključ. Ključ se prikazuje samo jednom, zato ga odmah sačuvajte.
            </li>
            <li>Ključ držite na serveru vaše platforme (npr. u varijabli okruženja), nikada u kodu koji ide u browser.</li>
            <li>Kada korisnik završi kurs, vaš server pošalje zahtjev na API. Certifikat se upiše na blockchain, a primalac dobije email s linkom za provjeru i preuzimanje PDF-a.</li>
          </ol>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-slate-900">2. Zahtjev</h2>
          <p className="text-sm text-slate-600">
            <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-900">POST https://diploma.ba/api/v1/certificates</code>
          </p>
          <p className="text-sm text-slate-600">Zaglavlja:</p>
          <Code>{`Authorization: Bearer dpl_...\nContent-Type: application/json`}</Code>
          <p className="text-sm text-slate-600">Tijelo (JSON):</p>
          <div className="overflow-x-auto border border-slate-200 rounded-2xl">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-900">
                <tr>
                  <th className="px-4 py-2 font-semibold">Polje</th>
                  <th className="px-4 py-2 font-semibold">Obavezno</th>
                  <th className="px-4 py-2 font-semibold">Opis</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {fields.map(([name, req, desc]) => (
                  <tr key={name}>
                    <td className="px-4 py-2"><code className="text-slate-900">{name}</code></td>
                    <td className="px-4 py-2">{req}</td>
                    <td className="px-4 py-2 text-slate-600">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-slate-900">3. Odgovor</h2>
          <p className="text-sm text-slate-600">
            Status <strong className="text-slate-900">201</strong> za novi certifikat, ili <strong className="text-slate-900">200</strong> s <code className="bg-slate-100 px-1 rounded">alreadyIssued: true</code> ako već postoji.
          </p>
          <Code>{responseExample}</Code>
          <p className="text-sm text-slate-600">
            Isti podaci (ustanova, ime, email, tip, identifikator, metadata) uvijek daju isti hash, pa je poziv <strong className="text-slate-900">idempotentan</strong>: ponovljen zahtjev ne pravi duplikat ni novi upis na blockchain.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-slate-900">4. Greške</h2>
          <ul className="text-sm space-y-1 text-slate-600">
            {errors.map(([code, desc]) => (
              <li key={code}>
                <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-900">{code}</code> {desc}
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-slate-900">5. Primjeri</h2>
          <p className="text-sm text-slate-600">cURL:</p>
          <Code>{curlExample}</Code>
          <p className="text-sm text-slate-600">Node.js:</p>
          <Code>{nodeExample}</Code>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900">6. Sigurnost</h2>
          <ul className="list-disc list-inside text-sm space-y-2 text-slate-600 pl-2">
            <li>U našoj bazi se čuva samo hash ključa, pa ga ne možemo ponovo prikazati. Ako ga izgubite, generišite novi (stari prestaje važiti).</li>
            <li>Ako sumnjate da je ključ procurio, opozovite ga u profilu.</li>
            <li>Primalac PDF dobija tek kada na stranici za provjeru klikne na „Preuzmi PDF Certifikat“.</li>
          </ul>
          <p className="text-sm text-slate-600">
            Pitanja: <a href="mailto:info@diploma.ba" className="text-blue-600 hover:underline">info@diploma.ba</a>
          </p>
        </section>
      </div>
    </main>
  );
}
