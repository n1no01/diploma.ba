'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { signOut, useSession } from 'next-auth/react';
import { TERMS_VERSION } from '@/app/lib/legal';

export default function PrihvatiUslovePage() {
  const { data: session, update } = useSession();
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!accepted) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/institution/accept-terms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accept: true, version: TERMS_VERSION }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Greška pri spremanju.');

      // Osvježi sesiju (token dobija novu verziju uslova), pa tek onda idi dalje
      await update();
      window.location.assign('/portal');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Došlo je do neočekivane greške.');
      setLoading(false);
    }
  };

  return (
    <main className="min-h-[80vh] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-lg bg-white border border-slate-200 p-8 rounded-3xl shadow-xl">
        <div className="text-center mb-6">
          <span className="text-xs font-semibold text-blue-600 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
            Prije nastavka
          </span>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-4">Uslovi korištenja</h1>
          <p className="text-slate-500 text-xs mt-1">
            {session?.user?.email ? `Prijavljeni ste kao ${session.user.email}` : 'Potvrdite uslove za nastavak'}
          </p>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm text-slate-600 leading-relaxed">
          <p className="font-semibold text-slate-900 mb-2">Ukratko:</p>
          <ul className="list-disc list-outside ml-5 space-y-1.5">
            <li>diploma.ba izdaje i provjerava digitalne certifikate. Ne zamjenjuje službene dokumente.</li>
            <li>Vi odgovarate za tačnost podataka i za pravni osnov da podatke svojih polaznika obrađujete putem platforme.</li>
            <li>Mi podatke polaznika obrađujemo samo po vašim uputama (ustanova je voditelj, mi smo izvršilac obrade).</li>
            <li>Na blockchain ide samo kriptografski otisak. Zapis i opoziv su trajni.</li>
          </ul>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="flex items-start gap-3 text-sm text-slate-700 leading-relaxed cursor-pointer">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              className="mt-1 h-4 w-4 shrink-0 accent-blue-600 cursor-pointer"
            />
            <span>
              Pročitao/la sam i prihvatam{' '}
              <Link href="/uslovi-koristenja" target="_blank" className="text-blue-600 hover:underline font-medium">
                Uslove korištenja
              </Link>{' '}
              i{' '}
              <Link href="/ugovor-o-obradi-podataka" target="_blank" className="text-blue-600 hover:underline font-medium">
                Ugovor o obradi podataka
              </Link>{' '}
              (verzija {TERMS_VERSION}) u ime ustanove i potvrđujem da sam ovlašten/a da to učinim.
            </span>
          </label>

          {error && (
            <p className="text-rose-600 text-xs text-center bg-rose-50 p-3 rounded-xl border border-rose-200 font-medium">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={!accepted || loading}
            className="w-full py-3.5 rounded-xl font-semibold bg-blue-600 hover:bg-blue-700 text-white text-sm transition shadow-md shadow-blue-600/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Spremanje...' : 'Prihvatam i nastavljam'}
          </button>
        </form>

        <p className="text-slate-500 text-xs text-center mt-6">
          Ne slažete se?{' '}
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: '/' })}
            className="text-blue-600 hover:underline font-medium cursor-pointer"
          >
            Odjavite se
          </button>
        </p>
      </div>
    </main>
  );
}
