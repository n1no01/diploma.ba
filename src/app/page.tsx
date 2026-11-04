'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Home() {
  const [stats, setStats] = useState({ totalCertificates: 0, totalInstitutions: 0 });

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/stats');
        const data = await res.json();
        if (data.success) {
          setStats({
            totalCertificates: data.totalCertificates,
            totalInstitutions: data.totalInstitutions,
          });
        }
      } catch (err) {
        console.error('Neuspješno učitavanje statistike');
      }
    }
    fetchStats();
  }, []);

  return (
    <main className="max-w-6xl mx-auto px-6 py-20 flex flex-col items-center text-center">
      
      {/* Badge */}
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold mb-8 shadow-2xs">
        <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping"></span>
        Web3 Standardizirana verifikacija diploma za BiH
      </div>

      {/* Glavni naslov */}
      <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900 max-w-4xl leading-tight">
        Zaštitite autentičnost vaših diploma i certifikata zauvijek
      </h1>

      {/* Opis */}
      <p className="mt-6 text-lg text-slate-600 max-w-2xl leading-relaxed">
        diploma.ba omogućava fakultetima i edukacijskim centrima nepromjenjivo ovjeravanje dokumenata. Poslodavci i službe verificiraju autentičnost u 1 sekundi putem jedinstvenog hasha.
      </p>

      {/* Akcijska dugmad */}
      <div className="mt-10 flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
        <Link
          href="/verifikuj"
          className="px-8 py-4 rounded-xl font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20 transition-all hover:scale-[1.02] text-center"
        >
          Provjeri Dokument
        </Link>
        <Link
          href="/izdavanje"
          className="px-8 py-4 rounded-xl font-semibold bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 transition-all hover:scale-[1.02] text-center shadow-2xs"
        >
          Izdaj Dokument
        </Link>
      </div>

      {/* Dinamička Statistika iz Baze */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 w-full mt-24 py-10 px-8 rounded-3xl bg-white border border-slate-200 backdrop-blur-md text-center shadow-xl">
        <div>
          <p className="text-3xl font-extrabold text-blue-600">{stats.totalCertificates}</p>
          <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-semibold">Izdatih certifikata</p>
        </div>
        <div>
          <p className="text-3xl font-extrabold text-blue-600">{stats.totalInstitutions}</p>
          <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-semibold">Registrovanih ustanova</p>
        </div>
        <div>
          <p className="text-3xl font-extrabold text-blue-600">100%</p>
          <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-semibold">Blockchain sigurnost</p>
        </div>
        <div>
          <p className="text-3xl font-extrabold text-blue-600">&lt; 1s</p>
          <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-semibold">Brzina provjere</p>
        </div>
      </div>

      {/* Kratki vodič za korisnike */}
      <div id="kako-radi" className="w-full mt-24 text-left scroll-mt-24">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900">Kako provjeriti autentičnost u 3 koraka?</h2>
          <p className="text-slate-600 text-sm mt-2">Sistem se temelji na sigurnim kriptografskim identifikatorima, čime se u potpunosti štiti privatnost građana.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-blue-600 font-bold text-lg">01. Nabavi link ili hash</span>
            <p className="text-sm text-slate-600 mt-2">Preuzmi direktan verifikacijski link iz emaila ili kopiraj jedinstveni certificate hash.</p>
          </div>
          <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-blue-600 font-bold text-lg">02. Unesi identifikator</span>
            <p className="text-sm text-slate-600 mt-2">Zalijepi certificate hash u polje za javnu provjeru na našem portalu.</p>
          </div>
          <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-blue-600 font-bold text-lg">03. Provjereno na mreži</span>
            <p className="text-sm text-slate-600 mt-2">Dobij trenutnu službenu potvrdu iz baze i sa sigurne Base blockchain mreže.</p>
          </div>
        </div>
      </div>

      {/* Feature Grid */}
      <div id="prednosti" className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-24 text-left w-full scroll-mt-24">
        <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center font-bold mb-5">
            01
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">Nemoguće Krivotvoriti</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Kriptografski otisak jamči da svaka izmjena na dokumentu odmah ruši njegovu autentičnost.
          </p>
        </div>

        <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-600 border border-cyan-200 flex items-center justify-center font-bold mb-5">
            02
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">Instantna Provjera</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Bez slanja službenih dopisa i čekanja tjednima. Provjera traje točno 1 sekundu.
          </p>
        </div>

        <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center font-bold mb-5">
            03
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">Potpuna Privatnost</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Nema javne pretrage po ličnim imenima. Sistem provjerava isključivo unikatne kriptografske ključeve.
          </p>
        </div>
      </div>

      {/* FAQ / Dodatna sekcija */}
      <div id="faq" className="w-full mt-24 text-left scroll-mt-24">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900">Često postavljana pitanja</h2>
          <p className="text-slate-600 text-sm mt-2">Sve što trebate znati o digitalnom izdavanju i verifikaciji.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <h4 className="font-bold text-slate-900 mb-2">Ko može izdavati certifikate?</h4>
            <p className="text-sm text-slate-600">Samo registrovane i od strane administratora odobrene visokoškolske ustanove i edukacijski centri mogu kreirati naloge i izdavati dokumente.</p>
          </div>
          <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <h4 className="font-bold text-slate-900 mb-2">Da li je potrebna kriptovaluta za korištenje?</h4>
            <p className="text-sm text-slate-600">Ne. Institucije koriste platformu jednostavno kroz web formu, dok sistem automatski upravlja blockchain transakcijama u pozadini.</p>
          </div>
        </div>
      </div>

    </main>
  );
}