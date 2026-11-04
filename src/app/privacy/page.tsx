export default function PrivacyPolicyPage() {
  return (
    <main className="max-w-4xl mx-auto px-6 py-16 text-slate-700">
      <div className="bg-white border border-slate-200 p-8 sm:p-12 rounded-3xl shadow-xl space-y-8">
        
        <div className="border-b border-slate-100 pb-6">
          <span className="text-xs font-semibold text-blue-600 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
            Pravni dokument
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mt-4">
            Politika Privatnosti
          </h1>
          <p className="text-slate-500 text-sm mt-2">
            Zadnja izmjena: Novembar 2026.
          </p>
        </div>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-slate-900">1. Uvod</h2>
          <p className="text-sm leading-relaxed text-slate-600">
            Dobrodošli na <strong className="text-slate-900">diploma.ba.ba BiH</strong>. Posvećeni smo zaštiti vaše privatnosti i sigurnosti vaših podataka. Ova Politika privatnosti objašnjava koje podatke sakupljamo, kako ih koristimo, štitimo i na koji način komuniciramo s blockchain tehnologijom.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-slate-900">2. Podaci koje sakupljamo</h2>
          <ul className="list-disc list-inside text-sm space-y-2 text-slate-600 pl-2">
            <li><strong className="text-slate-900">Podaci o institucijama:</strong> Naziv ustanove, službena email adresa i kriptirane lozinke (ili podaci s Google OAuth profila).</li>
            <li><strong className="text-slate-900">Podaci o certificiranim osobama:</strong> Ime i prezime polaznika/studenta, naziv vrste dokumenta, te jedinstveni identifikator.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-slate-900">3. Blockchain i Privatnost</h2>
          <p className="text-sm leading-relaxed text-slate-600">
            diploma.ba BiH koristi hibridni pristup. Lični podaci <strong className="text-slate-900">nikada se ne pohranjuju direktno na blockchain</strong>. Na Ethereum Sepolia testnet šalje se isključivo kriptografski hash zapis koji garantuje integritet dokumenta.
          </p>
        </section>

      </div>
    </main>
  );
}