'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface CustomField {
  key: string;
  value: string;
}

interface Recipient {
  name: string;
  email: string;
  identifier: string;
}

export default function IssueCertificatePage() {
  const { data: session } = useSession();
  
  const [certTypes, setCertTypes] = useState<string[]>([
    'Diploma o završenom studiju',
    'Certifikat o završenoj obuci / kursu',
    'Certifikat o stručnom usavršavanju',
    'Potvrda o učešću',
    'Certifikat o završenoj praksi',
  ]);

  const [certificateType, setCertificateType] = useState('Diploma o završenom studiju');
  const [customType, setCustomType] = useState('');
  
  const [isBulk, setIsBulk] = useState(false);
  const [bulkModeType, setBulkModeType] = useState<'textarea' | 'file'>('textarea');
  
  // Pojedinačni unos
  const [studentName, setStudentName] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [identifier, setIdentifier] = useState('');
  
  // Dinamička dodatna polja
  const [customFields, setCustomFields] = useState<CustomField[]>([]);

  // Bulk unos (Tekstualni i CSV fajl)
  const [bulkData, setBulkData] = useState('');
  const [parsedRecipients, setParsedRecipients] = useState<Recipient[]>([]);
  const [fileName, setFileName] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [error, setError] = useState('');

  const institutionName = session?.user?.name || session?.user?.email || 'Ustanova';

  useEffect(() => {
    const savedCustomTypes = localStorage.getItem('diploma.ba_custom_types');
    if (savedCustomTypes) {
      try {
        const parsed = JSON.parse(savedCustomTypes);
        setCertTypes(prev => {
          const combined = [...prev];
          parsed.forEach((t: string) => {
            if (!combined.includes(t)) combined.push(t);
          });
          return combined;
        });
      } catch (e) {
        console.error('Greška pri učitavanju custom tipova');
      }
    }
  }, []);

  // Funkcija za parsiranje CSV fajla sa računara (sa podrškom za UTF-8 dijakritičke znakove č, ć, š, ž, đ)
 const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setError('');

    try {
      const text = await file.text();
      
      const lines = text.split(/\r\n|\n/).filter(line => line.trim() !== '');
      const recipients: Recipient[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (i === 0 && (line.toLowerCase().includes('name') || line.toLowerCase().includes('email'))) {
          continue;
        }

        const parts = line.split(',').map(s => s?.trim().replace(/^["']|["']$/g, ''));
        if (parts.length >= 2 && parts[0] && parts[1]) {
          recipients.push({
            name: parts[0],
            email: parts[1],
            identifier: parts[2] || '',
          });
        }
      }

      setParsedRecipients(recipients);
      if (recipients.length === 0) {
        setError('Nisu pronađeni validni redovi u CSV fajlu. Format: Ime, Email, Identifikator');
      }
    } catch (err) {
      setError('Greška prilikom čitanja CSV fajla.');
    }
  };

  const addField = () => {
    setCustomFields([...customFields, { key: '', value: '' }]);
  };

  const removeField = (index: number) => {
    setCustomFields(customFields.filter((_, i) => i !== index));
  };

  const updateField = (index: number, field: 'key' | 'value', val: string) => {
    const updated = [...customFields];
    updated[index][field] = val;
    setCustomFields(updated);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMsg('');

    let finalCertType = certificateType;
    if (certificateType === 'Ostalo' && customType.trim()) {
      finalCertType = customType.trim();
      
      if (!certTypes.includes(finalCertType)) {
        const updatedTypes = [...certTypes.filter(t => t !== 'Ostalo'), finalCertType, 'Ostalo'];
        setCertTypes(updatedTypes);
        
        const defaultTypes = [
          'Diploma o završenom studiju',
          'Certifikat o završenoj obuci / kursu',
          'Certifikat o stručnom usavršavanju',
          'Potvrda o učešću',
          'Certifikat o završenoj praksi'
        ];
        const customOnly = updatedTypes.filter(t => !defaultTypes.includes(t) && t !== 'Ostalo');
        localStorage.setItem('diploma.ba_custom_types', JSON.stringify(customOnly));
      }
    }

    const metadataObj: Record<string, string> = {};
    customFields.forEach(field => {
      if (field.key.trim() && field.value.trim()) {
        metadataObj[field.key.trim()] = field.value.trim();
      }
    });

    try {
      if (isBulk) {
        let recipients: Recipient[] = [];

        if (bulkModeType === 'file') {
          recipients = parsedRecipients;
        } else {
          const lines = bulkData.split('\n').filter(line => line.trim() !== '');
          recipients = lines.map(line => {
            const parts = line.split(',').map(s => s?.trim());
            return { name: parts[0] || '', email: parts[1] || '', identifier: parts[2] || '' };
          });
        }

        if (recipients.length === 0) {
          throw new Error('Nema validnih primatelja za masovno izdavanje.');
        }

        const res = await fetch('/api/certificates/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            institution: institutionName, 
            certificateType: finalCertType, 
            recipients,
            metadata: metadataObj 
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Greška pri masovnom izdavanju.');

        setSuccessMsg(`Uspješno izdano ${recipients.length} certifikata i poslano na e-mail adrese!`);
        setBulkData('');
        setParsedRecipients([]);
        setFileName('');
        setCustomFields([]);
      } else {
        const res = await fetch('/api/certificates/issue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            institution: institutionName, 
            certificateType: finalCertType, 
            studentName, 
            studentEmail,
            identifier,
            metadata: metadataObj
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Greška pri izdavanju certifikata.');

        setSuccessMsg('Certifikat uspješno izdan, zabilježen na Base blockchain mreži i poslan studentu na e-mail!');
        setStudentName('');
        setStudentEmail('');
        setIdentifier('');
        setCustomFields([]);
      }
    } catch (err: any) {
      setError(err.message || 'Došlo je do neočekivane greške.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="max-w-3xl mx-auto px-6 py-12 text-slate-800">
      <div className="bg-white border border-slate-200 p-8 rounded-3xl shadow-xl">
        
        {/* Zaglavlje */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">Izdavanje Certifikata</h1>
            <p className="text-slate-500 text-sm mt-1">Generirajte sigurne blockchain certifikate i pošaljite ih studentima.</p>
          </div>
          
          <div className="bg-slate-100 p-1 rounded-xl border border-slate-200 flex gap-1 self-start shadow-2xs">
            <button
              type="button"
              onClick={() => setIsBulk(false)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${!isBulk ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Pojedinačno
            </button>
            <button
              type="button"
              onClick={() => setIsBulk(true)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${isBulk ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Masovno (Bulk)
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
              Ustanova / Izdavač <span className="text-blue-600">(Automatski povezano)</span>
            </label>
            <input
              type="text"
              value={institutionName}
              disabled
              className="w-full p-4 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 cursor-not-allowed font-medium text-sm"
            />
          </div>

          {/* Dinamički Dropdown za Vrstu Dokumenta */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Vrsta Dokumenta</label>
              <select
                value={certificateType}
                onChange={(e) => setCertificateType(e.target.value)}
                className="w-full p-4 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-blue-600 focus:bg-white transition"
              >
                {certTypes.map((type, idx) => (
                  <option key={idx} value={type}>{type}</option>
                ))}
                <option value="Ostalo">Unesi ručno</option>
              </select>
            </div>

            {certificateType === 'Ostalo' && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Nova vrsta dokumenta</label>
                <input
                  type="text"
                  value={customType}
                  onChange={(e) => setCustomType(e.target.value)}
                  placeholder="npr. Specijalistička diploma"
                  className="w-full p-4 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-blue-600 focus:bg-white transition"
                  required
                />
                <p className="text-[10px] text-slate-400 mt-1">Bit će automatski spremljena u listu za ubuduće.</p>
              </div>
            )}
          </div>

          {!isBulk ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Ime i prezime studenta</label>
                  <input
                    type="text"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    placeholder="npr. Amar Memić"
                    className="w-full p-4 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:border-blue-600 focus:bg-white transition"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Email studenta</label>
                  <input
                    type="email"
                    value={studentEmail}
                    onChange={(e) => setStudentEmail(e.target.value)}
                    placeholder="student@domena.ba"
                    className="w-full p-4 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:border-blue-600 focus:bg-white transition"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Identifikator / Broj indeksa</label>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="npr. IND-2023-45"
                  className="w-full p-4 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:border-blue-600 focus:bg-white transition"
                  required
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Izbor načina unosa za masovno (Fajl ili Tekst) */}
              <div className="flex gap-2 border-b border-slate-200 pb-3">
                <button
                  type="button"
                  onClick={() => setBulkModeType('file')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${bulkModeType === 'file' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  Upload CSV Fajla
                </button>
                <button
                  type="button"
                  onClick={() => setBulkModeType('textarea')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${bulkModeType === 'textarea' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  Ručni unos (Tekst)
                </button>
              </div>

              {bulkModeType === 'file' ? (
                <div className="p-6 bg-slate-50 border border-slate-300 rounded-2xl text-center">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                  />
                  <p className="text-xs text-slate-400 mt-2">Format CSV fajla u redu: <code className="text-slate-600">Ime i Prezime, Email, Identifikator</code></p>
                  <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 p-2 rounded-lg mt-2 inline-block"><strong>Napomena:</strong> Prilikom snimanja CSV fajla, izaberite opciju 
                  <strong> CSV UTF-8 (Comma delimited)</strong> kako bi dijakritički znakovi (č, ć, š, ž, đ) bili ispravno prikazani.
    </p>
                  {fileName && (
                    <div className="mt-4 text-xs font-semibold text-emerald-600 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                      Učitan fajl: {fileName} ({parsedRecipients.length} primatelja spremno)
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                    Masovni unos (Format: Ime i Prezime, Email, Identifikator - svaki u novi red)
                  </label>
                  <textarea
                    rows={5}
                    value={bulkData}
                    onChange={(e) => setBulkData(e.target.value)}
                    placeholder="Amar Memić, amar@memic.ba, IND-2023-45&#10;Emina Hadžić, emina@hadzic.ba, IND-2023-46"
                    className="w-full p-4 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:border-blue-600 focus:bg-white transition font-mono"
                  />
                  <p className="text-xs text-slate-400 mt-1">Upišite svakog studenta u novi red odvojeno zarezom (Ime, Email, Identifikator).</p>
                </div>
              )}
            </div>
          )}

          {/* SEKCIJA ZA DODATNA/SPECIFIČNA POLJA */}
          <div className="border-t border-slate-200 pt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Dodatna specifična polja (Opciono)</h3>
                <p className="text-xs text-slate-500">Dodajte zvanje, ECTS bodove, smjer, prosjek ili druge atribute.</p>
              </div>
              <button
                type="button"
                onClick={addField}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition border border-slate-300 cursor-pointer"
              >
                + Dodaj polje
              </button>
            </div>

            {customFields.length > 0 && (
              <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                {customFields.map((field, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Naziv (npr. Zvanje)"
                      value={field.key}
                      onChange={(e) => updateField(idx, 'key', e.target.value)}
                      className="w-1/2 p-3 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-blue-600"
                    />
                    <input
                      type="text"
                      placeholder="Vrijednost (npr. Bachelor)"
                      value={field.value}
                      onChange={(e) => updateField(idx, 'value', e.target.value)}
                      className="w-1/2 p-3 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-blue-600"
                    />
                    <button
                      type="button"
                      onClick={() => removeField(idx)}
                      className="p-3 text-rose-500 hover:bg-rose-50 rounded-xl transition text-xs font-bold"
                      title="Ukloni polje"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && <p className="text-rose-600 text-xs text-center bg-rose-50 p-3 rounded-xl border border-rose-200 font-medium">{error}</p>}
          {successMsg && <p className="text-emerald-700 text-xs text-center bg-emerald-50 p-3 rounded-xl border border-emerald-200 font-medium">{successMsg}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-xl font-semibold bg-blue-600 hover:bg-blue-700 text-white text-sm transition shadow-md shadow-blue-600/20 cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Slanje na Base blockchain...' : isBulk ? 'Izdaj masovno certifikate' : 'Izdaj pojedinačni certifikat'}
          </button>
        </form>
      </div>
    </main>
  );
}