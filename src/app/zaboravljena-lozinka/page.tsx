'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';

export default function ZaboravljenaLozinkaPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Došlo je do greške.');
      setMessage(data.message);
      setEmail('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Došlo je do greške.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-[80vh] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md bg-white border border-slate-200 p-8 rounded-3xl shadow-xl">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-2">Zaboravljena lozinka</h1>
          <p className="text-slate-500 text-xs mt-1">
            Unesite email svoje ustanove i poslat ćemo vam link za postavljanje nove lozinke.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ustanova@domena.ba"
              className="w-full p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:border-blue-600 focus:bg-white transition"
              required
            />
          </div>

          {error && (
            <p className="text-rose-600 text-xs text-center bg-rose-50 p-3 rounded-xl border border-rose-200 font-medium">{error}</p>
          )}
          {message && (
            <p className="text-emerald-700 text-xs text-center bg-emerald-50 p-3 rounded-xl border border-emerald-200 font-medium">{message}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl font-semibold bg-blue-600 hover:bg-blue-700 text-white text-sm transition shadow-md shadow-blue-600/20 cursor-pointer disabled:opacity-50 mt-2"
          >
            {loading ? 'Slanje...' : 'Pošalji link'}
          </button>
        </form>

        <p className="text-slate-500 text-xs text-center mt-6">
          <Link href="/login" className="text-blue-600 hover:underline font-medium">Nazad na prijavu</Link>
        </p>
      </div>
    </main>
  );
}
