'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { IconPlus, IconX } from '@/components/ui/Icons';

export default function EspecialidadesPage() {
  const [especialidades, setEspecialidades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({ nombre: '', activa: true });
  
  const supabase = createClient();

  useEffect(() => {
    fetchEspecialidades();
  }, []);

  async function fetchEspecialidades() {
    setLoading(true);
    const { data } = await supabase
      .from('especialidades')
      .select('*')
      .order('nombre');
    setEspecialidades(data || []);
    setLoading(false);
  }

  async function handleCreate(e) {
    e.preventDefault();
    setCreating(true);
    setError('');
    setSuccess('');

    try {
      const { error: err } = await supabase
        .from('especialidades')
        .insert([{ nombre: form.nombre, activa: form.activa }]);

      if (err) {
        if (err.code === '23505') throw new Error('Ya existe una especialidad con este nombre');
        throw err;
      }

      setSuccess(`Especialidad ${form.nombre} agregada`);
      setShowModal(false);
      setForm({ nombre: '', activa: true });
      fetchEspecialidades();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function toggleActiva(id, activa) {
    await supabase.from('especialidades').update({ activa }).eq('id', id);
    fetchEspecialidades();
  }

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Especialidades Médicas</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Administrá las especialidades disponibles para los médicos</p>
        </div>
        <button onClick={() => { setShowModal(true); setError(''); setSuccess(''); }} className="btn-primary">
          <IconPlus size={18} /> Nueva Especialidad
        </button>
      </div>

      {success && (
        <div className="mb-4 p-3 rounded-xl text-sm" style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#10b981' }}>
          {success}
        </div>
      )}

      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="loader"><div className="loader-spinner" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Estado</th>
                  <th>Fecha de Registro</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {especialidades.map((esp, idx) => (
                  <tr key={esp.id} style={{ animation: `slideIn 0.3s ease ${idx * 0.04}s both` }}>
                    <td className="font-medium">{esp.nombre}</td>
                    <td>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full" 
                        style={{ 
                          background: esp.activa ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', 
                          color: esp.activa ? '#10b981' : '#ef4444' 
                        }}>
                        {esp.activa ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>{new Date(esp.created_at).toLocaleDateString('es-AR')}</td>
                    <td>
                      <button 
                        onClick={() => toggleActiva(esp.id, !esp.activa)}
                        className="btn-ghost text-xs"
                      >
                        {esp.activa ? 'Desactivar' : 'Activar'}
                      </button>
                    </td>
                  </tr>
                ))}
                {especialidades.length === 0 && (
                  <tr>
                    <td colSpan="4" className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
                      No hay especialidades registradas
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Nueva Especialidad</h2>
              <button onClick={() => setShowModal(false)} className="btn-ghost"><IconX size={18} /></button>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-xl text-sm" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="input-label">Nombre de la Especialidad</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="Ej: Dermatología"
                  value={form.nombre} 
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })} 
                  required 
                />
              </div>
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="activa"
                  checked={form.activa} 
                  onChange={(e) => setForm({ ...form, activa: e.target.checked })} 
                />
                <label htmlFor="activa" className="text-sm" style={{ color: 'var(--text-primary)' }}>
                  Activa (visible al crear turnos/médicos)
                </label>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancelar</button>
                <button type="submit" className="btn-primary" disabled={creating}>
                  {creating ? <div className="loader-spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }} /> : 'Agregar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
