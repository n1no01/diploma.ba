'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface CustomField {
  key: string;
  value: string;
}

export default function IssueCertificatePage() {
  const { data: session } = useSession();
  
  const [certTypes, setCertTypes] = useState<string[]>([
    'Diploma o završenom studiju',
    'Certifikat o stručnom usavršavanju',
  ]);

  const [certificateType, setCertificateType] = useState('Diploma o završenom studiju');
  const [customType, setCustomType] = useState('');
  
  const [isBulk, setIsBulk] = useState(false);
  
  // Pojedinačni unos
  const [studentName, setStudentName] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [identifier, setIdentifier] = useState('');
  
  // Dinamička dodatna polja (Zvanje, ECTS, Prosjek, itd.)
  const [customFields, setCustomFields] = useState<CustomField[]>([]);

  // Bulk unos
  const [bulkData, setBulkData] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [error, setError] = useState('');

  const institutionName = session?.user?.name || session?.user?.email || 'Ustanova';

  useEffect(() => {
    const savedCustomTypes = localStorage.getItem('diploma.ba_custom_types');
    if (savedCustomTypes) {
      try {
        const parsed = JSON.parse(savedCustomTypes);
        setCertTypes(prev => [...prev, ...parsed]);
      } catch (e) {
        console.error('Greška pri učitavanju custom tipova');
      }
    }
  }, []);

  // Funkcije za dodavanje i brisanje dinamičkih polja
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
        
        const customOnly = updatedTypes.filter(t => 
          !['Diploma o završenom studiju', 'Certifikat o stručnom usavršavanju', 'Ostalo'].includes(t)
        );
        localStorage.setItem('diploma.ba_custom_types', JSON.stringify(customOnly));
      }
    }

    // Pakujemo dodatna polja u objekat (npr. { "Zvanje": "Bachelor", "ECTS": "180" })
    const metadataObj: Record<string, string> = {};
    customFields.forEach(field => {
      if (field.key.trim() && field.value.trim()) {
        metadataObj[field.key.trim()] = field.value.trim();
      }
    });

    try {
      if (isBulk) {
        const lines = bulkData.split('\n').filter(line => line.trim() !== '');
        const recipients = lines.map(line => {
          const parts = line.split(',').map(s => s?.trim());
          return { name: parts[0], email: parts[1], identifier: parts[2] };
        });

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
                required
              />
              <p className="text-xs text-slate-400 mt-1">Upišite svakog studenta u novi red odvojeno zarezom (Ime, Email, Identifikator).</p>
            </div>
          )}

          {/* SEKCIJA ZA DODATNA/SPECIFIČNA POLJA (Zvanje, ECTS, itd.) */}
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