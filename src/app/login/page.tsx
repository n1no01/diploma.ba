'use client';

import { useState, FormEvent } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'credentials' | 'otp'>('credentials');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCredentialsLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setInfo('');

    try {
      const res = await signIn('credentials', {
        email,
        password,
        otp: step === 'otp' ? otp.trim() : '',
        redirect: false,
      });

      if (res?.error === 'OTP_REQUIRED') {
        // Lozinka je tačna, kod je poslan na email
        setStep('otp');
        setOtp('');
        setInfo('Poslali smo 6-cifreni kod na vaš email. Unesite ga ispod.');
      } else if (res?.error === 'OTP_INVALID') {
        setError('Pogrešan kod. Pokušajte ponovo.');
      } else if (res?.error === 'OTP_EXPIRED') {
        setError('Kod je istekao ili je potrošen maksimalan broj pokušaja. Zatražite novi kod.');
      } else if (res?.error === 'OTP_SEND_FAILED') {
        setError('Slanje koda nije uspjelo. Pokušajte ponovo za nekoliko trenutaka.');
      } else if (res?.error) {
        setError('Pogrešan email ili lozinka.');
      } else {
        router.push('/portal');
        router.refresh();
      }
    } catch (err) {
      setError('Došlo je do neočekivane greške.');
    } finally {
      setLoading(false);
    }
  };

  // Traži novi kod (server šalje novi tek ako je prošlo 30 s od prethodnog)
  const handleResend = async () => {
    setLoading(true);
    setError('');
    setInfo('');
    try {
      const res = await signIn('credentials', { email, password, otp: '', redirect: false });
      if (res?.error === 'OTP_REQUIRED') {
        setInfo('Ako kod ne stigne, pričekajte 30 sekundi pa zatražite ponovo.');
      } else {
        setError('Slanje koda nije uspjelo.');
      }
    } catch {
      setError('Došlo je do neočekivane greške.');
    } finally {
      setLoading(false);
    }
  };

  const backToCredentials = () => {
    setStep('credentials');
    setOtp('');
    setError('');
    setInfo('');
  };

  return (
    <main className="min-h-[80vh] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md bg-white border border-slate-200 p-8 rounded-3xl shadow-xl">
        
        {/* Header */}
        <div className="text-center mb-8">
      
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-2">
            Prijava
          </h1>
          <p className="text-slate-500 text-xs mt-1">
            Prijavite se za upravljanje i izdavanje certifikata
          </p>
        </div>

        {/* Credentials Form */}
        <form onSubmit={handleCredentialsLogin} className="space-y-4">
          {step === 'credentials' && (
            <>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ustanova@domena.ba"
              className="w-full p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:border-blue-600 focus:bg-white transition"
              required
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

            </>
          )}

          {step === 'otp' && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                Kod iz emaila
              </label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                autoFocus
                className="w-full p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 text-sm tracking-[0.4em] text-center focus:outline-none focus:border-blue-600 focus:bg-white transition"
                required
              />
            </div>
          )}

          {info && (
            <p className="text-blue-700 text-xs text-center bg-blue-50 p-3 rounded-xl border border-blue-200 font-medium">
              {info}
            </p>
          )}

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
            {loading ? 'Prijavljivanje...' : step === 'otp' ? 'Potvrdi kod' : 'Prijavi se'}
          </button>

          {step === 'otp' && (
            <div className="flex items-center justify-between text-xs">
              <button type="button" onClick={backToCredentials} className="text-slate-500 hover:underline cursor-pointer">
                Nazad
              </button>
              <button type="button" onClick={handleResend} disabled={loading} className="text-blue-600 hover:underline font-medium cursor-pointer disabled:opacity-50">
                Pošalji kod ponovo
              </button>
            </div>
          )}
        </form>

        {step === 'credentials' && (
          <>
        {/* Divider */}
        <div className="relative flex items-center justify-center my-6">
          <div className="border-t border-slate-200 w-full" />
          <span className="bg-white px-3 text-[11px] uppercase tracking-wider text-slate-400 font-semibold absolute">
            ILI PREKO GOOGLE RAČUNA
          </span>
        </div>

        {/* Google Auth Button */}
        <button
          type="button"
          onClick={() => signIn('google', { callbackUrl: '/portal' })}
          className="w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-medium text-sm border border-slate-200 transition shadow-xs cursor-pointer"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          Nastavi putem Google računa
        </button>

          </>
        )}

        {/* Footer Link */}
        <p className="text-slate-500 text-xs text-center mt-6">
          Nemate registrovanu ustanovu?{' '}
          <Link href="/register" className="text-blue-600 hover:underline font-medium">
            Registrujte se
          </Link>
        </p>
      </div>
    </main>
  );
}