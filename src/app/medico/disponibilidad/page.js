'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { DIAS_SEMANA } from '@/lib/utils';

export default function DisponibilidadPage() {
  const { profile } = useAuth();
  const [disponibilidades, setDisponibilidades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({
    dia_semana: 1,
    hora_inicio: '08:00',
    hora_fin: '12:00',
    duracion_turno: 30,
    activa: true,
  });
  const supabase = createClient();

  useEffect(() => {
    if (profile?.id) fetchDisponibilidad();
  }, [profile]);

  async function fetchDisponibilidad() {
    setLoading(true);
    const { data } = await supabase
      .from('disponibilidad')
      .select('*')
      .eq('medico_id', profile.id)
      .order('dia_semana')
      .order('hora_inicio');
    setDisponibilidades(data || []);
    setLoading(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      if (editando) {
        const { error } = await supabase
          .from('disponibilidad')
          .update(form)
          .eq('id', editando);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('disponibilidad').insert({
          ...form,
          medico_id: profile.id,
        });
        if (error) throw error;
      }
      setShowModal(false);
      setEditando(null);
      fetchDisponibilidad();
    } catch (error) {
      alert('Error: ' + error.message);
    }
  }

  async function toggleActiva(id, activa) {
    await supabase.from('disponibilidad').update({ activa: !activa }).eq('id', id);
    fetchDisponibilidad();
  }

  async function eliminar(id) {
    if (!confirm('¿Eliminar este bloque horario?')) return;
    await supabase.from('disponibilidad').delete().eq('id', id);
    fetchDisponibilidad();
  }

  function openEdit(d) {
    setEditando(d.id);
    setForm({
      dia_semana: d.dia_semana,
      hora_inicio: d.hora_inicio.slice(0, 5),
      hora_fin: d.hora_fin.slice(0, 5),
      duracion_turno: d.duracion_turno,
      activa: d.activa,
    });
    setShowModal(true);
  }

  // Group by day
  const byDay = {};
  disponibilidades.forEach((d) => {
    if (!byDay[d.dia_semana]) byDay[d.dia_semana] = [];
    byDay[d.dia_semana].push(d);
  });

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Mi Disponibilidad</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Configurá tus días y horarios de atención</p>
        </div>
        <button onClick={() => { setEditando(null); setForm({ dia_semana: 1, hora_inicio: '08:00', hora_fin: '12:00', duracion_turno: 30, activa: true }); setShowModal(true); }} className="btn-primary">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          Agregar Horario
        </button>
      </div>

      {/* Vista semanal */}
      {loading ? (
        <div className="loader"><div className="loader-spinner" /></div>
      ) : disponibilidades.length === 0 ? (
        <div className="glass-card text-center py-16">
          <div className="text-4xl mb-3">🕐</div>
          <p className="text-lg font-medium" style={{ color: 'var(--text-secondary)' }}>No tenés horarios configurados</p>
          <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>Agregá tus días y horarios para que la secretaría pueda asignar turnos</p>
          <button onClick={() => setShowModal(true)} className="btn-primary">Configurar Horarios</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6, 0].map((dia) => {
            const bloques = byDay[dia] || [];
            if (bloques.length === 0) return null;
            return (
              <div key={dia} className="glass-card p-5">
                <h3 className="font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <span
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
                    style={{ background: 'rgba(59, 130, 246, 0.15)', color: 'var(--accent-primary)' }}
                  >
                    {DIAS_SEMANA[dia].slice(0, 2).toUpperCase()}
                  </span>
                  {DIAS_SEMANA[dia]}
                </h3>
                <div className="space-y-2">
                  {bloques.map((b) => (
                    <div
                      key={b.id}
                      className="flex items-center justify-between p-3 rounded-xl"
                      style={{
                        background: b.activa ? 'rgba(16, 185, 129, 0.06)' : 'rgba(100, 116, 139, 0.06)',
                        border: `1px solid ${b.activa ? 'rgba(16, 185, 129, 0.15)' : 'rgba(100, 116, 139, 0.15)'}`,
                        opacity: b.activa ? 1 : 0.6,
                      }}
                    >
                      <div>
                        <span className="font-mono font-semibold text-sm" style={{ color: b.activa ? 'var(--success)' : 'var(--text-muted)' }}>
                          {b.hora_inicio.slice(0, 5)} — {b.hora_fin.slice(0, 5)}
                        </span>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          Turnos de {b.duracion_turno} min
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => toggleActiva(b.id, b.activa)} className="btn-ghost text-xs" title={b.activa ? 'Desactivar' : 'Activar'}>
                          {b.activa ? '⏸' : '▶'}
                        </button>
                        <button onClick={() => openEdit(b)} className="btn-ghost text-xs">✏️</button>
                        <button onClick={() => eliminar(b.id)} className="btn-ghost text-xs" style={{ color: 'var(--danger)' }}>🗑</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>
              {editando ? 'Editar Horario' : 'Nuevo Horario'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="input-label">Día de la semana</label>
                <select className="select-field" value={form.dia_semana} onChange={(e) => setForm({ ...form, dia_semana: parseInt(e.target.value) })}>
                  {DIAS_SEMANA.map((d, i) => <option key={i} value={i}>{d}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="input-label">Hora Inicio</label>
                  <input type="time" className="input-field" value={form.hora_inicio} onChange={(e) => setForm({ ...form, hora_inicio: e.target.value })} required />
                </div>
                <div>
                  <label className="input-label">Hora Fin</label>
                  <input type="time" className="input-field" value={form.hora_fin} onChange={(e) => setForm({ ...form, hora_fin: e.target.value })} required />
                </div>
              </div>
              <div>
                <label className="input-label">Duración del turno (minutos)</label>
                <select className="select-field" value={form.duracion_turno} onChange={(e) => setForm({ ...form, duracion_turno: parseInt(e.target.value) })}>
                  <option value={15}>15 minutos</option>
                  <option value={20}>20 minutos</option>
                  <option value={30}>30 minutos</option>
                  <option value={45}>45 minutos</option>
                  <option value={60}>60 minutos</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancelar</button>
                <button type="submit" className="btn-primary">{editando ? 'Guardar' : 'Agregar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
