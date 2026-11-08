'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [website, setWebsite] = useState('');
  
  // Nova stanja za verifikacioni korak
  const [step, setStep] = useState<'register' | 'verify'>('register');
  const [verificationCode, setVerificationCode] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, website }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Greška pri registraciji.');

      // Ako backend traži verifikaciju, prebacujemo ekran na unos koda
      if (data.requiresVerification) {
        setStep('verify');
        setMessage(data.message || 'Poslali smo verifikacioni kod na vaš email.');
      }
    } catch (err: any) {
      setError(err.message || 'Došlo je do neočekivane greške.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: verificationCode }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Greška pri verifikaciji.');

      // Uspješno verifikovano, preusmjeravamo na login ili stranicu sa obavještenjem da čeka admin odobrenje
      router.push('/login?verified=true');
    } catch (err: any) {
      setError(err.message || 'Neispravan verifikacioni kod.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-[80vh] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md bg-white border border-slate-200 p-8 rounded-3xl shadow-xl">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-2">
            {step === 'register' ? 'Registracija' : 'Verifikacija Emaila'}
          </h1>
          <p className="text-slate-500 text-xs mt-1">
            {step === 'register' 
              ? 'Kreirajte račun za izdavanje certifikata' 
              : `Unesite kod poslan na ${email}`}
          </p>
        </div>

        {/* KORAK 1: Forma za registraciju */}
        {step === 'register' ? (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                Naziv Ustanove / Izdavača
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="npr. Elektrotehnički Fakultet"
                className="w-full p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:border-blue-600 focus:bg-white transition"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="info@fakultet.ba"
                className="w-full p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:border-blue-600 focus:bg-white transition"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                Web stranica <span className="text-slate-400 font-normal lowercase">(opcionalno)</span>
              </label>
              <input
                type="text"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://domena.ba"
                className="w-full p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:border-blue-600 focus:bg-white transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                Lozinka
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:border-blue-600 focus:bg-white transition"
                required
              />
            </div>

            {error && (
              <p className="text-rose-600 text-xs text-center bg-rose-50 p-3 rounded-xl border border-rose-200 font-medium">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl font-semibold bg-blue-600 hover:bg-blue-700 text-white text-sm transition shadow-md shadow-blue-600/20 cursor-pointer disabled:opacity-50 mt-2"
            >
              {loading ? 'Slanje koda...' : 'Nastavi i pošalji kod'}
            </button>
          </form>
        ) : (
          /* KORAK 2: Unos 6-cifrenog koda */
          <form onSubmit={handleVerify} className="space-y-4">
            {message && (
              <p className="text-emerald-600 text-xs text-center bg-emerald-50 p-3 rounded-xl border border-emerald-200 font-medium">
                {message}
              </p>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                6-cifreni verifikacioni kod
              </label>
              <input
                type="text"
                maxLength={6}
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                placeholder="123456"
                className="w-full p-3.5 text-center text-2xl tracking-widest rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-blue-600 focus:bg-white transition"
                required
              />
            </div>

            {error && (
              <p className="text-rose-600 text-xs text-center bg-rose-50 p-3 rounded-xl border border-rose-200 font-medium">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl font-semibold bg-blue-600 hover:bg-blue-700 text-white text-sm transition shadow-md shadow-blue-600/20 cursor-pointer disabled:opacity-50 mt-2"
            >
              {loading ? 'Provjera...' : 'Potvrdi email'}
            </button>
          </form>
        )}

        {/* Footer Link */}
        <p className="text-slate-500 text-xs text-center mt-6">
          Već imate registrovanu ustanovu?{' '}
          <Link href="/login" className="text-blue-600 hover:underline font-medium">
            Prijavite se
          </Link>
        </p>
      </div>
    </main>
  );
}