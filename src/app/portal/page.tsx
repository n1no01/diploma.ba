'use client';

import { useEffect, useState, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

interface Certificate {
  id: number;
  certificate_type: string;
  student_name: string;
  student_email: string;
  certificate_hash: string;
  tx_hash?: string;
  status?: string;
  created_at: string;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Stanje za odobrenje od strane admina
  const [isApproved, setIsApproved] = useState<boolean | null>(null);

  // Stanja za filtere
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');

  async function fetchData() {
    try {
      // 1. Provjera statusa odobrenja ustanove
      const statusRes = await fetch('/api/institution/status');
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        setIsApproved(statusData.is_approved);
      }

      // 2. Učitavanje certifikata
      const res = await fetch('/api/certificates');
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Greška pri učitavanju certifikata.');
      }

      setCertificates(data.certificates || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (session) {
      fetchData();
    }
  }, [session]);

  // Funkcija za opoziv (poništenje) certifikata
  async function handleRevoke(certificateId: number) {
    if (!confirm('Da li ste sigurni da želite trajno poništiti ovaj certifikat? Ova akcija se ne može poništiti.')) {
      return;
    }

    try {
      const res = await fetch('/api/certificates/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ certificateId }),
      });

      const data = await res.json();

      if (data.success) {
        alert('Certifikat je uspješno poništen.');
        fetchData(); // Ponovo učitaj podatke da se osvježi status
      } else {
        alert(data.error || 'Došlo je do greške.');
      }
    } catch (err) {
      console.error('Greška:', err);
      alert('Mrežna greška prilikom opoziva certifikata.');
    }
  }

  // Ekstrakcija svih unikatnih tipova certifikata za dropdown filter
  const certificateTypes = useMemo(() => {
    const types = new Set(certificates.map((c) => c.certificate_type).filter(Boolean));
    return Array.from(types);
  }, [certificates]);

  // Filtriranje liste na osnovu unosa i izabranog tipa
  const filteredCertificates = useMemo(() => {
    return certificates.filter((cert) => {
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        cert.student_name?.toLowerCase().includes(query) ||
        cert.student_email?.toLowerCase().includes(query) ||
        cert.certificate_type?.toLowerCase().includes(query) ||
        cert.certificate_hash?.toLowerCase().includes(query);

      const matchesType = selectedType === 'ALL' || cert.certificate_type === selectedType;

      return matchesSearch && matchesType;
    });
  }, [certificates, searchQuery, selectedType]);

  return (
    <main className="max-w-7xl mx-auto px-6 py-12 text-slate-800">
      
      {/* Obavještenje ukoliko nalog NIJE odobren */}
      {isApproved === false && (
        <div className="mb-8 p-6 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-4 shadow-sm">
          <div className="text-amber-600 font-bold text-xl">⚠️</div>
          <div>
            <h2 className="text-base font-bold text-amber-900">Račun čeka odobrenje administratora</h2>
            <p className="text-sm text-amber-700 mt-1">
              Vaša ustanova je uspješno registrovana, ali trenutno nema ovlaštenje za izdavanje certifikata. Administrator platforme mora pregledati i odobriti vaš nalog prije nego što budete mogli generirati blockchain dokumente.
            </p>
          </div>
        </div>
      )}

      {/* Zaglavlje Portala */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8 border-b border-slate-200 pb-6">
        <div>
          <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">
            Upravljačka ploča
          </span>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight mt-1">
            Dobrodošli, {session?.user?.name || 'Ustanova'}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Pregled i pretraga svih izdanih certifikata i diploma vaše ustanove.
          </p>
        </div>

        {/* Dugme za izdavanje (Onemogućeno ako nalog nije odobren) */}
        {isApproved === false ? (
          <button
            disabled
            className="px-5 py-3 rounded-xl font-semibold bg-slate-200 text-slate-400 text-sm cursor-not-allowed text-center"
            title="Nalog čeka odobrenje administratora"
          >
            + Izdaj novi certifikat (Na čekanju)
          </button>
        ) : (
          <Link
            href="/izdavanje"
            className="px-5 py-3 rounded-xl font-semibold bg-blue-600 hover:bg-blue-700 text-white text-sm transition shadow-md shadow-blue-600/20 text-center"
          >
            + Izdaj novi certifikat
          </Link>
        )}
      </div>

      {/* Statistika / Kartice */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Ukupno izdanih
          </p>
          <p className="text-3xl font-bold text-slate-900 mt-2">{certificates.length}</p>
        </div>
        
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Prikazano / Filtrirano
          </p>
          <p className="text-3xl font-bold text-blue-600 mt-2">{filteredCertificates.length}</p>
        </div>

        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Zadnje izdavanje
          </p>
          <p className="text-sm font-bold text-slate-800 mt-3 truncate">
            {certificates.length > 0
              ? new Date(certificates[0].created_at).toLocaleDateString('bs-BA', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                })
              : 'Nema zapisa'}
          </p>
        </div>
      </div>

      {/* Lista certifikata i filteri */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xl">
        {/* Traka sa filterima */}
        <div className="p-6 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row gap-4 items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 whitespace-nowrap">
            Evidencija certifikata
          </h2>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            {/* Pretraga po tekstu (Ime, Email, Hash) */}
            <input
              type="text"
              placeholder="Pretraži po imenu, emailu ili hash-u..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-4 py-2 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 shadow-2xs w-full sm:w-64"
            />

            {/* Filter po tipu certifikata */}
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-4 py-2 bg-white border border-slate-300 rounded-xl text-sm text-slate-700 focus:outline-none focus:border-blue-600 shadow-2xs cursor-pointer"
            >
              <option value="ALL">Svi tipovi certifikata</option>
              {certificateTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tabela sa rezultatima */}
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            Učitavanje certifikata...
          </div>
        ) : error ? (
          <div className="p-12 text-center text-rose-600 text-sm font-medium">{error}</div>
        ) : filteredCertificates.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            {certificates.length === 0 ? (
              <>
                Još uvijek niste izdali nijedan certifikat.{' '}
                {isApproved !== false && (
                  <Link href="/izdavanje" className="text-blue-600 font-semibold hover:underline">
                    Izdajte prvi
                  </Link>
                )}
              </>
            ) : (
              'Nema rezultata koji odgovaraju odabranim filterima.'
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Student / Vlasnik</th>
                  <th className="px-6 py-4">Email / Indeks</th>
                  <th className="px-6 py-4">Vrsta Dokumenta</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Blockchain</th>
                  <th className="px-6 py-4">Datum izdavanja</th>
                  <th className="px-6 py-4 text-right">Akcija</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCertificates.map((cert) => (
                  <tr key={cert.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-6 py-4 font-semibold text-slate-900">
                      {cert.student_name}
                    </td>
                    <td className="px-6 py-4 text-slate-500">{cert.student_email}</td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                        {cert.certificate_type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {cert.status === 'revoked' ? (
                        <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-100 text-rose-700">
                          Poništen
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-700">
                          Aktivan
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs">
                      {cert.tx_hash ? (
                        <a
                          href={`https://sepolia.etherscan.io/tx/${cert.tx_hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline font-semibold inline-flex items-center gap-1"
                        >
                          Pregledaj ↗
                        </a>
                      ) : (
                        <span className="text-slate-400">N/A</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-xs">
                      {new Date(cert.created_at).toLocaleDateString('bs-BA', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {cert.status !== 'revoked' && (
                        <button
                          onClick={() => handleRevoke(cert.id)}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white transition border border-rose-200 cursor-pointer"
                        >
                          Poništi
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}