'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function VerifyContent() {
  const searchParams = useSearchParams();
  const hashParam = searchParams.get('hash');
  const qParam = searchParams.get('q');

  const initialVal = hashParam || qParam || '';
  const [inputVal, setInputVal] = useState(initialVal);
  const [loading, setLoading] = useState(false);
  const [certData, setCertData] = useState<any>(null);
  const [isRevoked, setIsRevoked] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Stanja za oporavak certifikata preko emaila
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoveryMsg, setRecoveryMsg] = useState('');

  useEffect(() => {
    if (initialVal) {
      fetchVerification(initialVal);
    }
  }, [initialVal]);

  async function fetchVerification(queryVal: string) {
    if (!queryVal.trim()) return;

    setLoading(true);
    setErrorMsg('');
    setCertData(null);
    setIsRevoked(false);

    try {
      const res = await fetch(`/api/certificates/verify?q=${encodeURIComponent(queryVal.trim())}`);
      
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Server je vratio HTML umjesto JSON-a.");
      }

      const data = await res.json();

      if (data.success) {
        setCertData(data.certificate);
        setIsRevoked(false);
      } else if (data.isRevoked) {
        setCertData(data.certificate);
        setIsRevoked(true);
        setErrorMsg(data.message || 'Ovaj dokument je poništen od strane izdavača.');
      } else {
        setErrorMsg(data.message || 'Nismo pronašli važeći certifikat za uneseni podatak.');
      }
    } catch (err: any) {
      console.error('Greška pri verifikaciji:', err);
      setErrorMsg('Došlo je do greške prilikom mrežnog upita.');
    } finally {
      setLoading(false);
    }
  }

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) return;
    fetchVerification(inputVal);
  };

  const handleRecoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryEmail.trim()) return;

    setRecoveryLoading(true);
    setRecoveryMsg('');

    try {
      const res = await fetch('/api/certificates/recovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: recoveryEmail }),
      });
      const data = await res.json();
      setRecoveryMsg(data.message || data.error);
    } catch (err) {
      setRecoveryMsg('Došlo je do greške prilikom slanja zahtjeva.');
    } finally {
      setRecoveryLoading(false);
    }
  };

  // Sigurno parsiranje metadata
  let parsedMetadata = {};
  if (certData?.metadata) {
    if (typeof certData.metadata === 'object') {
      parsedMetadata = certData.metadata;
    } else if (typeof certData.metadata === 'string') {
      try {
        parsedMetadata = JSON.parse(certData.metadata);
      } catch (e) {
        console.error('Neuspješno parsiranje metadata JSON-a');
      }
    }
  }
  const metadataEntries = Object.entries(parsedMetadata);

  return (
    <div className="max-w-3xl mx-auto px-4 py-16 text-slate-800">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-extrabold text-slate-900 mb-3">Provjera Autentičnosti Dokumenata</h1>
        <p className="text-slate-600">
          Unesite jedinstveni certificate hash ili otvorite direktan link iz emaila.
        </p>
      </div>

      {/* Forma za ručni unos */}
      <form onSubmit={handleManualSearch} className="flex gap-2 mb-6">
        <input
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          placeholder="Unesite Certificate Hash..."
          className="flex-1 bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-600/20 font-mono text-sm shadow-sm"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-cyan-600 hover:bg-cyan-700 text-white font-semibold px-6 py-3 rounded-xl transition shadow-sm cursor-pointer"
        >
          {loading ? 'Provjera...' : 'Provjeri'}
        </button>
      </form>

      {/* Prikaz Statusa Učitavanja / Standardne greške */}
      {loading && (
        <div className="text-center py-10 text-cyan-600 font-medium">
          Očitavanje i validacija zapisa na Base blockchain mreži...
        </div>
      )}

      {errorMsg && !certData && (
        <div className="p-5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-center font-medium shadow-sm mb-10">
          {errorMsg}
        </div>
      )}

      {/* Kartica rezultata */}
      {certData && (
        <div className={`bg-white border rounded-2xl p-6 shadow-xl relative overflow-hidden mb-12 ${isRevoked ? 'border-rose-300 bg-rose-50/30' : 'border-emerald-200'}`}>
          
          {isRevoked ? (
            <div className="absolute top-0 right-0 bg-rose-600 text-white text-xs font-extrabold px-4 py-1.5 rounded-bl-xl shadow-xs">
              DOKUMENT JE PONIŠTEN
            </div>
          ) : (
            <div className="absolute top-0 right-0 bg-emerald-100 text-emerald-800 text-xs font-bold px-4 py-1 rounded-bl-xl border-l border-b border-emerald-200">
              VERIFIKOVANO NA BLOCKCHAINU
            </div>
          )}

          {isRevoked ? (
            <div className="mb-6 p-4 bg-rose-100 border border-rose-200 rounded-xl">
              <div className="flex items-center gap-3 text-rose-800 font-bold mb-1">
                <span className="w-3 h-3 rounded-full bg-rose-600 animate-ping"></span>
                Upozorenje: Dokument više nije važeći
              </div>
              <p className="text-xs text-rose-700 font-medium">
                {errorMsg}
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-3 text-emerald-700 font-bold mb-4">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
              Dokument je 100% autentičan
            </div>
          )}

          <div className="space-y-4">
            <div>
              <span className="text-xs text-slate-400 uppercase tracking-wider block font-semibold">Vrsta certifikata</span>
              <h2 className="text-2xl font-bold text-slate-900">{certData.certificate_type || 'Certifikat / Diploma'}</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div>
                <span className="text-xs text-slate-400 uppercase tracking-wider block font-semibold">Izdavalac (Institucija)</span>
                <p className="text-slate-800 font-semibold">{certData.institution_name}</p>
              </div>
              <div>
                <span className="text-xs text-slate-400 uppercase tracking-wider block font-semibold">Vlasnik / Student</span>
                <p className="text-slate-800 font-semibold">{certData.student_name}</p>
              </div>
              {certData.identifier && (
                <div>
                  <span className="text-xs text-slate-400 uppercase tracking-wider block font-semibold">Broj indeksa / Identifikator</span>
                  <p className="text-slate-800 font-semibold">{certData.identifier}</p>
                </div>
              )}
            </div>

            {metadataEntries.length > 0 && (
              <div className="pt-3 border-t border-slate-100">
                <span className="text-xs text-slate-400 uppercase tracking-wider block mb-2 font-semibold">Dodatni atributi dokumenta</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  {metadataEntries.map(([key, val]: [string, any], idx) => (
                    <div key={idx} className="text-sm">
                      <span className="text-slate-500 font-medium">{key}: </span>
                      <span className="text-slate-900 font-semibold">{String(val)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-slate-100 space-y-3">
              {certData.certificate_hash && (
                <div>
                  <span className="text-xs text-slate-400 uppercase tracking-wider block mb-1 font-semibold">Certificate Hash</span>
                  <p className="text-xs text-slate-700 font-mono break-all bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    {certData.certificate_hash}
                  </p>
                </div>
              )}

              {certData.tx_hash && (
                <div>
                  <span className="text-xs text-slate-400 uppercase tracking-wider block mb-1 font-semibold">Blockchain Transaction Hash (TX)</span>
                  <p className="text-xs text-slate-700 font-mono break-all bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    {certData.tx_hash}
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center text-xs text-slate-400 pt-2 font-medium">
              <span>Status: <strong className={isRevoked ? 'text-rose-600' : 'text-emerald-600'}>{isRevoked ? 'Poništen / Opozvan' : 'Aktivan'}</strong></span>
              <span>Izdato: {certData.created_at ? new Date(certData.created_at).toLocaleDateString('bs-BA') : 'N/A'}</span>
            </div>
          </div>
        </div>
      )}

      {/* SEKCIJA ZA OPORAVAK / VRAĆANJE CERTIFIKATA PREKO EMAILA */}
      <div className="bg-slate-900 text-slate-100 rounded-2xl p-6 sm:p-8 border border-slate-800 shadow-lg mt-12">
        <div className="max-w-lg">
          <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400 bg-cyan-950 px-3 py-1 rounded-full border border-cyan-800 inline-block mb-3">
            Izgubili ste link? ✉️
          </span>
          <h3 className="text-xl font-bold mb-2">Zatražite oporavak svojih certifikata</h3>
          <p className="text-slate-400 text-sm mb-6">
            Unesite email adresu na koju su vam certifikati izdati, a mi ćemo vam automatski poslati sve verifikacijske linkove u vaš inbox.
          </p>

          <form onSubmit={handleRecoverySubmit} className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="email"
                value={recoveryEmail}
                onChange={(e) => setRecoveryEmail(e.target.value)}
                placeholder="Unesite vašu email adresu..."
                required
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 text-sm"
              />
              <button
                type="submit"
                disabled={recoveryLoading}
                className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold px-6 py-3 rounded-xl transition shadow-sm cursor-pointer disabled:opacity-50 text-sm shrink-0"
              >
                {recoveryLoading ? 'Slanje...' : 'Pošalji linkove'}
              </button>
            </div>

            {recoveryMsg && (
              <p className="text-xs text-cyan-300 font-medium pt-2">
                {recoveryMsg}
              </p>
            )}
          </form>
        </div>
      </div>

    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-slate-500">Učitavanje verifikacije...</div>}>
      <VerifyContent />
    </Suspense>
  );
}