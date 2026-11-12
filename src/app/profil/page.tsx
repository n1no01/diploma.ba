'use client';

import { useEffect, useState, FormEvent, ChangeEvent } from 'react';
import Link from 'next/link';

interface Account {
  name: string;
  email: string;
  website: string;
  logoUrl: string;
  isApproved: boolean;
  createdAt: string;
  twoFactorEnabled: boolean;
  isGoogleAccount: boolean;
  certificatesTotal: number;
  certificatesRevoked: number;
  apiKeyPrefix: string;
  apiKeyCreatedAt: string | null;
  apiKeyLastUsedAt: string | null;
}

type Msg = { type: 'ok' | 'err'; text: string } | null;

const inputCls =
  'w-full p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:border-blue-600 focus:bg-white transition';
const labelCls = 'block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2';
const primaryBtn =
  'px-5 py-2.5 rounded-xl font-semibold bg-blue-600 hover:bg-blue-700 text-white text-sm transition cursor-pointer disabled:opacity-50';
const secondaryBtn =
  'px-5 py-2.5 rounded-xl font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm transition cursor-pointer';

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm">
      <h2 className="text-base font-bold text-slate-900">{title}</h2>
      {subtitle && <p className="text-slate-500 text-xs mt-1 leading-relaxed">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Message({ msg }: { msg: Msg }) {
  if (!msg) return null;
  const cls =
    msg.type === 'ok'
      ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
      : 'text-rose-600 bg-rose-50 border-rose-200';
  return <p className={`mt-4 text-xs p-3 rounded-xl border font-medium ${cls}`}>{msg.text}</p>;
}

export default function ProfilPage() {
  const [acc, setAcc] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // Logo
  const [logoBusy, setLogoBusy] = useState(false);
  const [logoMsg, setLogoMsg] = useState<Msg>(null);

  // Web stranica
  const [website, setWebsite] = useState('');
  const [webBusy, setWebBusy] = useState(false);
  const [webMsg, setWebMsg] = useState<Msg>(null);

  // Lozinka
  const [curPw, setCurPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [newPw2, setNewPw2] = useState('');
  const [pwBusy, setPwBusy] = useState(false);
  const [pwMsg, setPwMsg] = useState<Msg>(null);

  // API ključ
  const [apiMode, setApiMode] = useState<'generate' | 'revoke' | null>(null);
  const [apiPw, setApiPw] = useState('');
  const [apiBusy, setApiBusy] = useState(false);
  const [apiMsg, setApiMsg] = useState<Msg>(null);
  const [newKey, setNewKey] = useState('');
  const [copied, setCopied] = useState(false);

  // 2FA
  const [confirming, setConfirming] = useState(false);
  const [tfPassword, setTfPassword] = useState('');
  const [tfBusy, setTfBusy] = useState(false);
  const [tfMsg, setTfMsg] = useState<Msg>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/institution/account');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Greška pri učitavanju profila.');
        setAcc(data);
        setWebsite(data.website || '');
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : 'Greška pri učitavanju profila.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ---------- Logo ----------
  const handleLogoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !acc) return;
    setLogoMsg(null);

    if (!['image/png', 'image/jpeg'].includes(file.type)) {
      setLogoMsg({ type: 'err', text: 'Dozvoljeni formati su PNG i JPG.' });
      return;
    }
    if (file.size > 1024 * 1024) {
      setLogoMsg({ type: 'err', text: 'Slika je prevelika. Maksimalna veličina je 1MB.' });
      return;
    }

    setLogoBusy(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/institution/upload-logo', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Greška pri uploadu.');
      setAcc({ ...acc, logoUrl: data.logo_url });
      setLogoMsg({ type: 'ok', text: 'Logo je uspješno sačuvan.' });
    } catch (err) {
      setLogoMsg({ type: 'err', text: err instanceof Error ? err.message : 'Mrežna greška prilikom uploada.' });
    } finally {
      setLogoBusy(false);
    }
  };

  const handleLogoRemove = async () => {
    if (!acc || !confirm('Da li ste sigurni da želite ukloniti logo institucije?')) return;
    setLogoBusy(true);
    setLogoMsg(null);
    try {
      const res = await fetch('/api/institution/upload-logo', { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Greška pri brisanju.');
      setAcc({ ...acc, logoUrl: '' });
      setLogoMsg({ type: 'ok', text: 'Logo je uklonjen.' });
    } catch (err) {
      setLogoMsg({ type: 'err', text: err instanceof Error ? err.message : 'Mrežna greška.' });
    } finally {
      setLogoBusy(false);
    }
  };

  // ---------- Web stranica ----------
  const saveWebsite = async (e: FormEvent) => {
    e.preventDefault();
    if (!acc) return;
    setWebBusy(true);
    setWebMsg(null);
    try {
      const res = await fetch('/api/institution/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ website }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Greška pri spremanju.');
      setAcc({ ...acc, website: data.website });
      setWebsite(data.website);
      setWebMsg({ type: 'ok', text: data.message });
    } catch (err) {
      setWebMsg({ type: 'err', text: err instanceof Error ? err.message : 'Greška pri spremanju.' });
    } finally {
      setWebBusy(false);
    }
  };

  // ---------- Lozinka ----------
  const changePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPwMsg(null);
    if (newPw !== newPw2) {
      setPwMsg({ type: 'err', text: 'Nova lozinka i potvrda se ne poklapaju.' });
      return;
    }
    setPwBusy(true);
    try {
      const res = await fetch('/api/institution/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: curPw, newPassword: newPw }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Greška pri promjeni lozinke.');
      setPwMsg({ type: 'ok', text: data.message });
      setCurPw('');
      setNewPw('');
      setNewPw2('');
    } catch (err) {
      setPwMsg({ type: 'err', text: err instanceof Error ? err.message : 'Greška pri promjeni lozinke.' });
    } finally {
      setPwBusy(false);
    }
  };

  // ---------- API ključ ----------
  const submitApiKey = async (e: FormEvent) => {
    e.preventDefault();
    if (!acc || !apiMode) return;
    setApiBusy(true);
    setApiMsg(null);
    try {
      const res = await fetch('/api/institution/api-key', {
        method: apiMode === 'generate' ? 'POST' : 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: apiPw }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Greška pri spremanju.');
      if (apiMode === 'generate') {
        setNewKey(data.apiKey);
        setCopied(false);
        setAcc({ ...acc, apiKeyPrefix: data.prefix, apiKeyCreatedAt: new Date().toISOString(), apiKeyLastUsedAt: null });
      } else {
        setNewKey('');
        setAcc({ ...acc, apiKeyPrefix: '', apiKeyCreatedAt: null, apiKeyLastUsedAt: null });
        setApiMsg({ type: 'ok', text: 'API ključ je opozvan.' });
      }
      setApiMode(null);
      setApiPw('');
    } catch (err) {
      setApiMsg({ type: 'err', text: err instanceof Error ? err.message : 'Greška pri spremanju.' });
    } finally {
      setApiBusy(false);
    }
  };

  const copyKey = async () => {
    try {
      await navigator.clipboard.writeText(newKey);
      setCopied(true);
    } catch {
      setApiMsg({ type: 'err', text: 'Kopiranje nije uspjelo. Označite ključ i kopirajte ga ručno.' });
    }
  };

  // ---------- 2FA ----------
  const confirmToggle = async (e: FormEvent) => {
    e.preventDefault();
    if (!acc) return;
    setTfBusy(true);
    setTfMsg(null);
    try {
      const res = await fetch('/api/institution/2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !acc.twoFactorEnabled, password: tfPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Greška pri spremanju.');
      setAcc({ ...acc, twoFactorEnabled: data.enabled });
      setTfMsg({ type: 'ok', text: data.message });
      setConfirming(false);
      setTfPassword('');
    } catch (err) {
      setTfMsg({ type: 'err', text: err instanceof Error ? err.message : 'Greška pri spremanju.' });
    } finally {
      setTfBusy(false);
    }
  };

  if (loading) {
    return <main className="min-h-[60vh] flex items-center justify-center text-slate-500 text-sm">Učitavanje...</main>;
  }
  if (loadError || !acc) {
    return (
      <main className="min-h-[60vh] flex items-center justify-center px-6">
        <p className="text-rose-600 text-sm bg-rose-50 border border-rose-200 p-4 rounded-xl">{loadError || 'Greška pri učitavanju profila.'}</p>
      </main>
    );
  }

  const registered = new Date(acc.createdAt);
  const registeredText = isNaN(registered.getTime())
  ? '—'
  : `${String(registered.getDate()).padStart(2, '0')}.${String(registered.getMonth() + 1).padStart(2, '0')}.${registered.getFullYear()}`;

  return (
    <main className="min-h-[80vh] flex items-start justify-center px-6 py-12">
      <div className="w-full max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Profil</h1>
          <p className="text-slate-500 text-xs mt-1">Podaci o ustanovi, logo i sigurnosne postavke</p>
        </div>

        {/* Pregled naloga */}
        <section className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-lg font-bold text-slate-900">{acc.name}</p>
              <p className="text-sm text-slate-500">{acc.email}</p>
            </div>
            <span
              className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold border ${
                acc.isApproved
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
            >
              {acc.isApproved ? 'Odobren nalog' : 'Čeka odobrenje'}
            </span>
          </div>

          {!acc.isApproved && (
            <p className="mt-4 text-xs bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-xl leading-relaxed">
              Vaša ustanova je registrovana, ali još nema ovlaštenje za izdavanje certifikata. Administrator platforme
              mora pregledati i odobriti nalog.
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Registrovani od</p>
              <p className="text-slate-900 font-semibold mt-1">{registeredText}</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Izdatih certifikata</p>
              <p className="text-slate-900 font-semibold mt-1">
                {acc.certificatesTotal}
                {acc.certificatesRevoked > 0 && (
                  <span className="text-xs font-normal text-slate-500"> (od toga poništeno: {acc.certificatesRevoked})</span>
                )}
              </p>
            </div>
          </div>
        </section>

        {/* Logo */}
        <Card title="Logo ustanove">
          <div className="text-xs bg-blue-50 border border-blue-200 text-blue-800 p-3 rounded-xl leading-relaxed">
            <strong>Logo će se prikazati na vrhu svih PDF certifikata koje izdate.</strong> Koristite zvanični logo
            ustanove (PNG ili JPG, najviše 1MB).
          </div>

          <div className="flex items-center gap-4 mt-4">
            <div className="w-24 h-24 shrink-0 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-center overflow-hidden p-2">
              {acc.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={acc.logoUrl} alt="Logo ustanove" className="max-h-full max-w-full object-contain" />
              ) : (
                <span className="text-[11px] text-slate-400 text-center">Nema loga</span>
              )}
            </div>
            <div className="flex-1 space-y-3">
              <input
                type="file"
                accept="image/png, image/jpeg"
                onChange={handleLogoUpload}
                disabled={logoBusy}
                className="w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer disabled:opacity-50"
              />
              {acc.logoUrl && (
                <button
                  type="button"
                  onClick={handleLogoRemove}
                  disabled={logoBusy}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white transition border border-rose-200 cursor-pointer disabled:opacity-50"
                >
                  Ukloni logo
                </button>
              )}
              {logoBusy && <p className="text-xs text-blue-600 font-medium">Obrada u toku...</p>}
            </div>
          </div>
          <Message msg={logoMsg} />
        </Card>

        {/* Web stranica */}
        <Card title="Web stranica" subtitle="Prikazuje se u javnom registru institucija.">
          <form onSubmit={saveWebsite} className="space-y-3">
            <label className={labelCls}>Adresa</label>
            <input
              type="text"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://ustanova.ba"
              className={inputCls}
            />
            <button type="submit" disabled={webBusy || website === acc.website} className={primaryBtn}>
              {webBusy ? 'Spremanje...' : 'Sačuvaj'}
            </button>
          </form>
          <Message msg={webMsg} />
        </Card>

        {/* Lozinka */}
        <Card title="Promjena lozinke">
          {acc.isGoogleAccount ? (
            <p className="text-xs bg-slate-50 border border-slate-200 text-slate-600 p-3 rounded-xl">
              Prijavljeni ste preko Google računa, pa lozinku mijenjate u postavkama svog Google računa.
            </p>
          ) : (
            <form onSubmit={changePassword} className="space-y-3">
              <div>
                <label className={labelCls}>Trenutna lozinka</label>
                <input type="password" value={curPw} onChange={(e) => setCurPw(e.target.value)} className={inputCls} required />
              </div>
              <div>
                <label className={labelCls}>Nova lozinka</label>
                <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} minLength={8} placeholder="Najmanje 8 znakova" className={inputCls} required />
              </div>
              <div>
                <label className={labelCls}>Potvrda nove lozinke</label>
                <input type="password" value={newPw2} onChange={(e) => setNewPw2(e.target.value)} minLength={8} className={inputCls} required />
              </div>
              <button type="submit" disabled={pwBusy} className={primaryBtn}>
                {pwBusy ? 'Spremanje...' : 'Promijeni lozinku'}
              </button>
            </form>
          )}
          <Message msg={pwMsg} />
        </Card>

        {/* API pristup */}
        <Card
          title="API pristup"
          subtitle="Omogućava vašoj platformi da automatski izdaje certifikate (npr. čim neko položi kurs)."
        >
          <p className="text-xs text-slate-500 mb-4">
            Kako povezati svoju platformu:{' '}
            <Link href="/docs" target="_blank" className="text-blue-600 hover:underline font-semibold">
              pročitajte API dokumentaciju →
            </Link>
          </p>
          {!acc.isApproved ? (
            <p className="text-xs bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-xl">
              API ključ možete napraviti nakon što administrator odobri vaš nalog.
            </p>
          ) : (
            <>
              {newKey && (
                <div className="mb-4 bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
                  <p className="text-xs font-semibold text-emerald-800 mb-2">
                    Vaš novi API ključ. Prikazuje se samo jednom, pa ga odmah sačuvajte.
                  </p>
                  <div className="flex gap-2 items-center">
                    <code className="flex-1 min-w-0 break-all bg-white border border-emerald-200 rounded-xl px-3 py-2 text-xs text-slate-900">{newKey}</code>
                    <button type="button" onClick={copyKey} className={secondaryBtn}>{copied ? 'Kopirano' : 'Kopiraj'}</button>
                  </div>
                </div>
              )}

              {acc.apiKeyPrefix ? (
                <div className="text-xs text-slate-600 space-y-1">
                  <p>Aktivan ključ: <code className="text-slate-900">{acc.apiKeyPrefix}…</code></p>
                  <p>Kreiran: {acc.apiKeyCreatedAt ? new Date(acc.apiKeyCreatedAt).toLocaleString('bs-BA') : '—'}</p>
                  <p>Posljednja upotreba: {acc.apiKeyLastUsedAt ? new Date(acc.apiKeyLastUsedAt).toLocaleString('bs-BA') : 'još nije korišten'}</p>
                </div>
              ) : (
                <p className="text-xs text-slate-500">Nemate aktivan API ključ.</p>
              )}

              {!apiMode && (
                <div className="flex gap-3 mt-4">
                  <button type="button" onClick={() => { setApiMsg(null); setApiPw(''); setApiMode('generate'); }} className={primaryBtn}>
                    {acc.apiKeyPrefix ? 'Zamijeni ključ' : 'Generiši API ključ'}
                  </button>
                  {acc.apiKeyPrefix && (
                    <button type="button" onClick={() => { setApiMsg(null); setApiPw(''); setApiMode('revoke'); }} className="px-5 py-2.5 rounded-xl font-semibold bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white transition border border-rose-200 text-sm cursor-pointer">
                      Opozovi ključ
                    </button>
                  )}
                </div>
              )}

              {apiMode && (
                <form onSubmit={submitApiKey} className="mt-4 space-y-3 border-t border-slate-100 pt-4">
                  {apiMode === 'generate' && acc.apiKeyPrefix && (
                    <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 p-3 rounded-xl">
                      Stari ključ prestaje raditi čim napravite novi.
                    </p>
                  )}
                  {!acc.isGoogleAccount && (
                    <>
                      <label className={labelCls}>Unesite lozinku za potvrdu</label>
                      <input type="password" value={apiPw} onChange={(e) => setApiPw(e.target.value)} className={inputCls} autoFocus required />
                    </>
                  )}
                  <div className="flex gap-3">
                    <button type="submit" disabled={apiBusy} className={primaryBtn}>
                      {apiBusy ? 'Obrada...' : apiMode === 'generate' ? 'Generiši' : 'Opozovi'}
                    </button>
                    <button type="button" onClick={() => { setApiMode(null); setApiPw(''); }} className={secondaryBtn}>Odustani</button>
                  </div>
                </form>
              )}

              <details className="mt-5 text-xs text-slate-600">
                <summary className="cursor-pointer font-semibold text-slate-700">Kako se koristi</summary>
                <pre className="mt-3 bg-slate-900 text-slate-100 p-4 rounded-xl overflow-x-auto text-[11px] leading-relaxed">{`curl -X POST https://diploma.ba/api/v1/certificates \\
  -H "Authorization: Bearer VAŠ_API_KLJUČ" \\
  -H "Content-Type: application/json" \\
  -d '{
    "studentName": "Ime Prezime",
    "studentEmail": "student@primjer.ba",
    "certificateType": "Naziv kursa",
    "identifier": "ID-polaznika-ili-kursa",
    "expiresAt": "2030-12-31"
  }'`}</pre>
                <p className="mt-2">Isti zahtjev poslan dvaput ne pravi duplikat, nego vraća postojeći certifikat. Dozvoljeno je 60 zahtjeva u minuti. Ključ čuvajte samo na serveru, nikad u kodu koji vide korisnici.</p>
              </details>
            </>
          )}
          <Message msg={apiMsg} />
        </Card>

        {/* 2FA */}
        <section className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Dvostepena provjera (2FA)</h2>
              <p className="text-slate-500 text-xs mt-1 leading-relaxed">
                Pri svakoj prijavi, uz lozinku, šaljemo 6-cifreni kod na vaš email. Kod važi 10 minuta.
              </p>
            </div>

            {!acc.isGoogleAccount && (
              <button
                type="button"
                role="switch"
                aria-checked={acc.twoFactorEnabled}
                aria-label="Dvostepena provjera"
                onClick={() => {
                  setTfMsg(null);
                  setTfPassword('');
                  setConfirming(true);
                }}
                disabled={confirming}
                className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition cursor-pointer disabled:opacity-60 ${
                  acc.twoFactorEnabled ? 'bg-blue-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                    acc.twoFactorEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            )}
          </div>

          {acc.isGoogleAccount ? (
            <p className="mt-4 text-xs bg-slate-50 border border-slate-200 text-slate-600 p-3 rounded-xl">
              Prijavljeni ste preko Google računa. Dvostepenu provjeru uključite u postavkama svog Google računa.
            </p>
          ) : (
            <p className="mt-4 text-xs font-medium">
              Status:{' '}
              <span className={acc.twoFactorEnabled ? 'text-emerald-600' : 'text-slate-500'}>
                {acc.twoFactorEnabled ? 'Uključeno' : 'Isključeno'}
              </span>
            </p>
          )}

          {confirming && (
            <form onSubmit={confirmToggle} className="mt-5 space-y-3 border-t border-slate-100 pt-5">
              <label className={labelCls}>
                Unesite lozinku za potvrdu ({acc.twoFactorEnabled ? 'isključivanje' : 'uključivanje'})
              </label>
              <input type="password" value={tfPassword} onChange={(e) => setTfPassword(e.target.value)} placeholder="••••••••" autoFocus required className={inputCls} />
              <div className="flex gap-3">
                <button type="submit" disabled={tfBusy} className={primaryBtn}>
                  {tfBusy ? 'Spremanje...' : acc.twoFactorEnabled ? 'Isključi 2FA' : 'Uključi 2FA'}
                </button>
                <button type="button" onClick={() => { setConfirming(false); setTfPassword(''); setTfMsg(null); }} className={secondaryBtn}>
                  Odustani
                </button>
              </div>
            </form>
          )}
          <Message msg={tfMsg} />
        </section>
      </div>
    </main>
  );
}