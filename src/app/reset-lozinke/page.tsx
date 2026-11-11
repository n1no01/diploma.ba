'use client';

import { Suspense, useState, FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function ResetForm() {
  const params = useSearchParams();
  const token = params.get('token') || '';

  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== password2) {
      setError('Lozinka i potvrda se ne poklapaju.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Došlo je do greške.');
      setDone(data.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Došlo je do greške.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <p className="text-rose-600 text-xs text-center bg-rose-50 p-3 rounded-xl border border-rose-200 font-medium">
        Link nije ispravan. Zatražite novi na stranici <Link href="/zaboravljena-lozinka" className="underline">Zaboravljena lozinka</Link>.
      </p>
    );
  }

  if (done) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-emerald-700 text-xs bg-emerald-50 p-3 rounded-xl border border-emerald-200 font-medium">{done}</p>
        <Link href="/login" className="inline-block px-5 py-2.5 rounded-xl font-semibold bg-blue-600 hover:bg-blue-700 text-white text-sm transition">
          Prijavi se
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Nova lozinka</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} placeholder="Najmanje 8 znakova" className="w-full p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:border-blue-600 focus:bg-white transition" required />
      </div>
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Potvrda lozinke</label>
        <input type="password" value={password2} onChange={(e) => setPassword2(e.target.value)} minLength={8} className="w-full p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:border-blue-600 focus:bg-white transition" required />
      </div>

      {error && (
        <p className="text-rose-600 text-xs text-center bg-rose-50 p-3 rounded-xl border border-rose-200 font-medium">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3.5 rounded-xl font-semibold bg-blue-600 hover:bg-blue-700 text-white text-sm transition shadow-md shadow-blue-600/20 cursor-pointer disabled:opacity-50 mt-2"
      >
        {loading ? 'Spremanje...' : 'Postavi lozinku'}
      </button>
    </form>
  );
}

export default function ResetLozinkePage() {
  return (
    <main className="min-h-[80vh] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md bg-white border border-slate-200 p-8 rounded-3xl shadow-xl">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-2">Nova lozinka</h1>
          <p className="text-slate-500 text-xs mt-1">Unesite novu lozinku za svoj nalog.</p>
        </div>
        <Suspense fallback={null}>
          <ResetForm />
        </Suspense>
      </div>
    </main>
  );
}
