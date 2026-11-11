'use client';

import { useState } from 'react';

export default function RecoveryPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setStatusMsg('');

    try {
      const res = await fetch('/api/certificates/recovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();

      if (data.success) {
        setStatusMsg(data.message);
        setEmail('');
      } else {
        setStatusMsg(data.error || 'Došlo je do greške. Pokušajte ponovo.');
      }
    } catch (err) {
      setStatusMsg('Mrežna greška pri slanju zahtjeva.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-20 text-slate-100">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl text-center">
        <h1 className="text-2xl font-bold text-white mb-2">Zaboravili ste vaše certifikate?</h1>
        <p className="text-slate-400 text-sm mb-6">
          Unesite vašu email adresu na koju su certifikati izdati. Poslat ćemo vam zbirni email sa svim verifikacijskim linkovima.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Vaša email adresa (npr. student@unsa.ba)"
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500 text-sm"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-semibold py-3 rounded-xl transition"
          >
            {loading ? 'Šaljem zahtjev...' : 'Pošalji moje verifikacijske linkove'}
          </button>
        </form>

        {statusMsg && (
          <div className="mt-6 p-4 bg-cyan-950/40 border border-cyan-500/30 rounded-xl text-cyan-300 text-sm">
            {statusMsg}
          </div>
        )}
      </div>
    </div>
  );
}