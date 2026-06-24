'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function PacientesPage() {
  const [pacientes, setPacientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [obrasSociales, setObrasSociales] = useState([]);
  const [form, setForm] = useState({
    dni: '', nombre: '', apellido: '', fecha_nacimiento: '',
    telefono: '', email: '', obra_social_id: '', numero_afiliado: '',
  });
  const supabase = createClient();

  useEffect(() => {
    fetchPacientes();
    fetchObrasSociales();
  }, []);

  async function fetchPacientes() {
    setLoading(true);
    const { data } = await supabase
      .from('pacientes')
      .select('*, obra_social:obras_sociales(*)')
      .order('apellido');
    setPacientes(data || []);
    setLoading(false);
  }

  async function fetchObrasSociales() {
    const { data } = await supabase
      .from('obras_sociales')
      .select('*')
      .eq('activa', true)
      .order('nombre');
    setObrasSociales(data || []);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      const { error } = await supabase.from('pacientes').insert({
        ...form,
        obra_social_id: form.obra_social_id || null,
        fecha_nacimiento: form.fecha_nacimiento || null,
      });
      if (error) throw error;
      setShowModal(false);
      setForm({ dni: '', nombre: '', apellido: '', fecha_nacimiento: '', telefono: '', email: '', obra_social_id: '', numero_afiliado: '' });
      fetchPacientes();
    } catch (error) {
      alert('Error: ' + error.message);
    }
  }

  const filtered = pacientes.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.nombre?.toLowerCase().includes(q) ||
      p.apellido?.toLowerCase().includes(q) ||
      p.dni?.includes(q)
    );
  });

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Pacientes</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Registro y gestión de pacientes del centro</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          Nuevo Paciente
        </button>
      </div>

      {/* Search */}
      <div className="glass-card p-4 mb-6">
        <input
          type="text"
          className="input-field"
          placeholder="🔍 Buscar por nombre, apellido o DNI..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="loader"><div className="loader-spinner" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">👤</div>
            <p className="text-lg font-medium" style={{ color: 'var(--text-secondary)' }}>
              {search ? 'No se encontraron resultados' : 'No hay pacientes registrados'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Paciente</th>
                  <th>DNI</th>
                  <th>Teléfono</th>
                  <th>Email</th>
                  <th>Obra Social</th>
                  <th>Nº Afiliado</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, idx) => (
                  <tr key={p.id} style={{ animation: `slideIn 0.3s ease ${idx * 0.03}s both` }}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold"
                          style={{ background: 'rgba(59, 130, 246, 0.15)', color: 'var(--accent-primary)' }}
                        >
                          {p.nombre?.charAt(0)}{p.apellido?.charAt(0)}
                        </div>
                        <span className="font-medium">{p.nombre} {p.apellido}</span>
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>{p.dni}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{p.telefono || '—'}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{p.email || '—'}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{p.obra_social?.nombre || 'Particular'}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{p.numero_afiliado || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Nuevo Paciente</h2>
              <button onClick={() => setShowModal(false)} className="btn-ghost">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="input-label">DNI *</label>
                <input type="text" className="input-field" value={form.dni} onChange={(e) => setForm({ ...form, dni: e.target.value })} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="input-label">Nombre *</label>
                  <input type="text" className="input-field" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
                </div>
                <div>
                  <label className="input-label">Apellido *</label>
                  <input type="text" className="input-field" value={form.apellido} onChange={(e) => setForm({ ...form, apellido: e.target.value })} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="input-label">Fecha de Nacimiento</label>
                  <input type="date" className="input-field" value={form.fecha_nacimiento} onChange={(e) => setForm({ ...form, fecha_nacimiento: e.target.value })} />
                </div>
                <div>
                  <label className="input-label">Teléfono</label>
                  <input type="text" className="input-field" placeholder="5492614001234" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="input-label">Email</label>
                <input type="email" className="input-field" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="input-label">Obra Social</label>
                  <select className="select-field" value={form.obra_social_id} onChange={(e) => setForm({ ...form, obra_social_id: e.target.value })}>
                    <option value="">Particular</option>
                    {obrasSociales.map((os) => <option key={os.id} value={os.id}>{os.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="input-label">Nº Afiliado</label>
                  <input type="text" className="input-field" value={form.numero_afiliado} onChange={(e) => setForm({ ...form, numero_afiliado: e.target.value })} />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancelar</button>
                <button type="submit" className="btn-primary">Registrar Paciente</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
