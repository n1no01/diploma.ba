'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function PublicInstitutionsPage() {
  const [institutions, setInstitutions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetch('/api/institution/public')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setInstitutions(data.institutions);
        }
      })
      .catch((err) => console.error('Greška:', err))
      .finally(() => setLoading(false));
  }, []);

  // Filtriranje po nazivu
  const filteredInstitutions = institutions.filter((inst) =>
    inst.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <main className="max-w-5xl mx-auto px-6 py-16 text-slate-800">
      {/* Zaglavlje */}
      <div className="text-center max-w-2xl mx-auto mb-12">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-4">
          Registar Verifikovanih Institucija
        </h1>
        <p className="text-slate-600 text-sm">
          Pregled svih zvaničnih obrazovnih ustanova, fakulteta i organizacija koje izdaju sigurne, blockchain-verifikovane dokumente putem <span className="font-semibold text-slate-900">diploma.ba</span>.
        </p>
      </div>

      {/* Pretraga */}
      <div className="mb-10 max-w-md mx-auto">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Pretraži instituciju..."
          className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-600/20 shadow-sm transition"
        />
      </div>

      {/* Sadržaj / Učitavanje */}
      {loading ? (
        <div className="text-center py-16 text-slate-500 font-medium">Učitavanje registra institucija...</div>
      ) : filteredInstitutions.length === 0 ? (
        <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl text-slate-500 shadow-sm">
          Nema pronađenih institucija koje odgovaraju pretrazi.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredInstitutions.map((inst, idx) => {
            // Formatiranje URL-a da osiguramo ispravan link
            let webUrl = inst.website;
            if (webUrl && !webUrl.startsWith('http://') && !webUrl.startsWith('https://')) {
              webUrl = 'https://' + webUrl;
            }

            const CardContent = (
              <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm hover:shadow-md hover:border-cyan-200 transition flex items-center justify-between gap-4 h-full group">
                <div className="flex items-center gap-4">
                  {/* Ikona / Inicijal */}
                  <div className="w-12 h-12 rounded-xl bg-cyan-50 border border-cyan-100 text-cyan-700 font-bold flex items-center justify-center text-lg shrink-0 group-hover:bg-cyan-600 group-hover:text-white transition">
                    {inst.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="font-bold text-slate-900 text-base group-hover:text-cyan-600 transition flex items-center gap-1.5">
                      {inst.name}
                      {webUrl && <span className="text-xs text-slate-400 font-normal">↗</span>}
                    </h2>
                    <span className="text-xs text-emerald-600 font-medium flex items-center gap-1 mt-0.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      Zvanični izdavač
                    </span>
                  </div>
                </div>

                <div className="text-right text-xs text-slate-400 font-medium shrink-0">
                  Partner od <br />
                  {inst.created_at ? new Date(inst.created_at).getFullYear() : '2026'}
                </div>
              </div>
            );

            return webUrl ? (
              <a
                key={idx}
                href={webUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-2xl focus:outline-none focus:ring-2 focus:ring-cyan-600/20"
              >
                {CardContent}
              </a>
            ) : (
              <div key={idx}>{CardContent}</div>
            );
          })}
        </div>
      )}

      {/* Footer link nazad */}
      <div className="text-center mt-12">
        <Link
          href="/"
          className="text-sm font-semibold text-cyan-600 hover:text-cyan-700 transition"
        >
          ← Nazad na početnu stranu
        </Link>
      </div>
    </main>
  );
}