'use client';

import { useState, useEffect } from 'react';

interface Institution {
  id: number;
  name: string;
  email: string;
  website?: string;
  is_approved: boolean;
  created_at: string;
}

interface Certificate {
  id: number;
  student_name: string;
  course_name: string;
  tx_hash: string;
  created_at: string;
}

interface Stats {
  total_institutions: string;
  pending_institutions: string;
  approved_institutions: string;
  total_certificates: string;
}

export default function AdminDashboard() {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Filteri i pretraga
  const [activeTab, setActiveTab] = useState<'PENDING' | 'APPROVED' | 'ALL'>('PENDING');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal za detaljan pregled certifikata ustanove
  const [selectedInst, setSelectedInst] = useState<Institution | null>(null);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loadingCerts, setLoadingCerts] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const res = await fetch('/api/admin/institutions');
      const data = await res.json();
      if (res.ok) {
        setInstitutions(data.institutions);
        setStats(data.stats);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleApprovalChange = async (id: number, approve: boolean) => {
    try {
      const res = await fetch('/api/admin/institutions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ institutionId: id, isApproved: approve }),
      });
      if (res.ok) {
        setInstitutions(prev =>
          prev.map(inst => inst.id === id ? { ...inst, is_approved: approve } : inst)
        );
        // Opcionalno osvježi statistiku
        fetchData();
      }
    } catch (err) {
      alert('Greška pri ažuriranju statusa.');
    }
  };

  const openDetailsModal = async (inst: Institution) => {
    setSelectedInst(inst);
    setLoadingCerts(true);
    try {
      const res = await fetch(`/api/admin/institutions?id=${inst.id}`);
      const data = await res.json();
      if (res.ok) {
        setCertificates(data.certificates);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingCerts(false);
    }
  };

  // Filtriranje ustanova
  const filteredInstitutions = institutions.filter(inst => {
    const matchesTab = 
      activeTab === 'PENDING' ? !inst.is_approved :
      activeTab === 'APPROVED' ? inst.is_approved : true;
    
    const matchesSearch = 
      inst.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      inst.email.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesTab && matchesSearch;
  });

  return (
    <main className="max-w-7xl mx-auto px-6 py-12 text-slate-800">
      
      {/* Zaglavlje */}
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-xs font-semibold text-rose-600 uppercase tracking-widest bg-rose-50 px-3 py-1 rounded-full border border-rose-100">
            Sigurna Kontrola
          </span>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-2">Admin Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">Upravljajte pristupom ustanovama i nadgledajte izdate certifikate na Base mreži.</p>
        </div>
      </div>

      {/* KPI Kartice (Statistika) */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white border border-slate-200/80 p-6 rounded-2xl shadow-sm">
            <p className="text-xs font-semibold text-slate-400 uppercase">Ukupno Ustanova</p>
            <p className="text-3xl font-black text-slate-900 mt-2">{stats.total_institutions}</p>
          </div>
          <div className="bg-white border border-slate-200/80 p-6 rounded-2xl shadow-sm">
            <p className="text-xs font-semibold text-amber-600 uppercase">Na čekanju</p>
            <p className="text-3xl font-black text-amber-600 mt-2">{stats.pending_institutions}</p>
          </div>
          <div className="bg-white border border-slate-200/80 p-6 rounded-2xl shadow-sm">
            <p className="text-xs font-semibold text-emerald-600 uppercase">Odobrene</p>
            <p className="text-3xl font-black text-emerald-600 mt-2">{stats.approved_institutions}</p>
          </div>
          <div className="bg-white border border-slate-200/80 p-6 rounded-2xl shadow-sm">
            <p className="text-xs font-semibold text-blue-600 uppercase">Izdati Certifikati</p>
            <p className="text-3xl font-black text-blue-600 mt-2">{stats.total_certificates}</p>
          </div>
        </div>
      )}

      {/* Glavni Panel */}
      <div className="bg-white border border-slate-200 p-8 rounded-3xl shadow-xl">
        
        {/* Tabovi i Pretraga */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6 border-b border-slate-200 pb-6">
          <div className="flex bg-slate-100 p-1 rounded-xl w-full md:w-auto">
            <button
              onClick={() => setActiveTab('PENDING')}
              className={`flex-1 md:flex-none px-4 py-2 text-xs font-semibold rounded-lg transition ${
                activeTab === 'PENDING' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Na čekanju ({institutions.filter(i => !i.is_approved).length})
            </button>
            <button
              onClick={() => setActiveTab('APPROVED')}
              className={`flex-1 md:flex-none px-4 py-2 text-xs font-semibold rounded-lg transition ${
                activeTab === 'APPROVED' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Odobrene ({institutions.filter(i => i.is_approved).length})
            </button>
            <button
              onClick={() => setActiveTab('ALL')}
              className={`flex-1 md:flex-none px-4 py-2 text-xs font-semibold rounded-lg transition ${
                activeTab === 'ALL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Sve
            </button>
          </div>

          <div className="w-full md:w-72">
            <input
              type="text"
              placeholder="Pretraži po nazivu ili emailu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
            />
          </div>
        </div>

        {/* Tabela */}
        {loading ? (
          <p className="text-center py-12 text-slate-400 text-sm">Učitavanje podataka...</p>
        ) : filteredInstitutions.length === 0 ? (
          <p className="text-center py-12 text-slate-400 text-sm">Nema ustanova koje odgovaraju filteru.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-400 bg-slate-50">
                  <th className="p-4 rounded-l-xl">Ustanova</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Registrovan</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 rounded-r-xl text-right">Akcije</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredInstitutions.map((inst) => (
                  <tr key={inst.id} className="hover:bg-slate-50/50 transition">
                    <td className="p-4 font-semibold text-slate-900">
                      {inst.name}
                      {inst.website && (
                        <a href={inst.website} target="_blank" rel="noreferrer" className="block text-xs font-normal text-blue-500 hover:underline">
                          {inst.website}
                        </a>
                      )}
                    </td>
                    <td className="p-4 text-slate-600">{inst.email}</td>
                    <td className="p-4 text-slate-500 text-xs">
                      {new Date(inst.created_at).toLocaleDateString('bs-BA')}
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        inst.is_approved 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {inst.is_approved ? 'Odobreno' : 'Na čekanju'}
                      </span>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => openDetailsModal(inst)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer"
                      >
                        Detalji
                      </button>
                      {!inst.is_approved ? (
                        <button
                          onClick={() => handleApprovalChange(inst.id, true)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition cursor-pointer"
                        >
                          Odobri
                        </button>
                      ) : (
                        <button
                          onClick={() => handleApprovalChange(inst.id, false)}
                          className="px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-lg text-xs font-semibold transition cursor-pointer"
                        >
                          Ukloni
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* Modal za Detalje / Certifikate Ustanove */}
      {selectedInst && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 max-w-2xl w-full p-8 rounded-3xl shadow-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6 border-b border-slate-200 pb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900">{selectedInst.name}</h3>
                <p className="text-slate-500 text-xs mt-0.5">{selectedInst.email}</p>
              </div>
              <button 
                onClick={() => setSelectedInst(null)}
                className="text-slate-400 hover:text-slate-700 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">
              Izdati certifikati ove ustanove:
            </h4>

            {loadingCerts ? (
              <p className="text-center py-8 text-slate-400 text-xs">Učitavanje certifikata...</p>
            ) : certificates.length === 0 ? (
              <p className="text-center py-8 text-slate-400 text-xs">Ova ustanova još uvijek nije izdala nijedan certifikat.</p>
            ) : (
              <div className="space-y-3">
                {certificates.map(cert => (
                  <div key={cert.id} className="p-4 bg-slate-50 border border-slate-200/60 rounded-xl flex justify-between items-center text-xs">
                    <div>
                      <p className="font-bold text-slate-900">{cert.student_name}</p>
                      <p className="text-slate-500">{cert.course_name}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400 block">{new Date(cert.created_at).toLocaleDateString('bs-BA')}</span>
                      <a 
                        href={`https://basescan.org/tx/${cert.tx_hash}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-blue-600 font-semibold hover:underline mt-1 inline-block"
                      >
                        BaseScan ↗
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

    </main>
  );
}