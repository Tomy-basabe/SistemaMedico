'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { formatTime } from '@/lib/utils';

export default function HistoriaClinicaPage() {
  const { id } = useParams();
  const [paciente, setPaciente] = useState(null);
  const [antecedentes, setAntecedentes] = useState(null);
  const [evoluciones, setEvoluciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingAntecedentes, setEditingAntecedentes] = useState(false);
  const [antForm, setAntForm] = useState({
    alergias: '', cirugias: '', medicacion_actual: '',
    enfermedades_cronicas: '', antecedentes_familiares: '', observaciones: '',
  });
  const supabase = createClient();

  useEffect(() => {
    fetchPaciente();
    fetchAntecedentes();
    fetchEvoluciones();
  }, [id]);

  async function fetchPaciente() {
    const { data } = await supabase
      .from('pacientes')
      .select('*, obra_social:obras_sociales(*)')
      .eq('id', id)
      .single();
    setPaciente(data);
  }

  async function fetchAntecedentes() {
    const { data } = await supabase
      .from('antecedentes')
      .select('*')
      .eq('paciente_id', id)
      .single();
    setAntecedentes(data);
    if (data) setAntForm(data);
  }

  async function fetchEvoluciones() {
    setLoading(true);
    const { data } = await supabase
      .from('evoluciones')
      .select('*, medico:profiles(*), adjuntos(*)')
      .eq('paciente_id', id)
      .order('created_at', { ascending: false });
    setEvoluciones(data || []);
    setLoading(false);
  }

  async function saveAntecedentes(e) {
    e.preventDefault();
    try {
      if (antecedentes) {
        await supabase.from('antecedentes').update(antForm).eq('id', antecedentes.id);
      } else {
        await supabase.from('antecedentes').insert({ ...antForm, paciente_id: id });
      }
      setEditingAntecedentes(false);
      fetchAntecedentes();
    } catch (error) {
      alert('Error: ' + error.message);
    }
  }

  if (!paciente) return <div className="loader"><div className="loader-spinner" /></div>;

  const edad = paciente.fecha_nacimiento
    ? Math.floor((new Date() - new Date(paciente.fecha_nacimiento)) / 31557600000)
    : null;

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      {/* Header con datos del paciente */}
      <div className="glass-card p-6 mb-6">
        <div className="flex items-center gap-5">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold"
            style={{ background: 'rgba(59, 130, 246, 0.15)', color: 'var(--accent-primary)' }}
          >
            {paciente.nombre?.charAt(0)}{paciente.apellido?.charAt(0)}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {paciente.nombre} {paciente.apellido}
            </h1>
            <div className="flex flex-wrap gap-4 mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <span>DNI: {paciente.dni}</span>
              {edad !== null && <span>{edad} años</span>}
              <span>{paciente.obra_social?.nombre || 'Particular'}</span>
              {paciente.telefono && <span>📱 {paciente.telefono}</span>}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Antecedentes - Sidebar */}
        <div className="lg:col-span-1">
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                Antecedentes
              </h2>
              <button onClick={() => setEditingAntecedentes(!editingAntecedentes)} className="btn-ghost text-xs">
                {editingAntecedentes ? 'Cancelar' : '✏️ Editar'}
              </button>
            </div>

            {editingAntecedentes ? (
              <form onSubmit={saveAntecedentes} className="space-y-3">
                {['alergias', 'cirugias', 'medicacion_actual', 'enfermedades_cronicas', 'antecedentes_familiares', 'observaciones'].map((field) => (
                  <div key={field}>
                    <label className="input-label capitalize">{field.replace(/_/g, ' ')}</label>
                    <textarea
                      className="input-field text-sm"
                      rows="2"
                      value={antForm[field] || ''}
                      onChange={(e) => setAntForm({ ...antForm, [field]: e.target.value })}
                    />
                  </div>
                ))}
                <button type="submit" className="btn-primary w-full justify-center text-sm">Guardar</button>
              </form>
            ) : (
              <div className="space-y-3">
                {[
                  { key: 'alergias', icon: '⚠️', label: 'Alergias' },
                  { key: 'cirugias', icon: '🔪', label: 'Cirugías' },
                  { key: 'medicacion_actual', icon: '💊', label: 'Medicación Actual' },
                  { key: 'enfermedades_cronicas', icon: '🩺', label: 'Enf. Crónicas' },
                  { key: 'antecedentes_familiares', icon: '👪', label: 'Ant. Familiares' },
                  { key: 'observaciones', icon: '📝', label: 'Observaciones' },
                ].map(({ key, icon, label }) => (
                  <div key={key} className="p-3 rounded-xl" style={{ background: 'var(--bg-input)' }}>
                    <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                      {icon} {label}
                    </span>
                    <p className="text-sm mt-1" style={{ color: antecedentes?.[key] ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                      {antecedentes?.[key] || 'Sin datos'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Evoluciones - Main */}
        <div className="lg:col-span-2">
          <div className="glass-card p-5">
            <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
              Evoluciones ({evoluciones.length})
            </h2>

            {loading ? (
              <div className="loader"><div className="loader-spinner" /></div>
            ) : evoluciones.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-3xl mb-2">📋</div>
                <p style={{ color: 'var(--text-secondary)' }}>Sin evoluciones registradas</p>
              </div>
            ) : (
              <div className="space-y-4">
                {evoluciones.map((evo) => (
                  <div
                    key={evo.id}
                    className="p-4 rounded-xl"
                    style={{ background: 'var(--bg-input)', border: '1px solid var(--border-primary)' }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold" style={{ color: 'var(--accent-primary)' }}>
                          {new Date(evo.created_at).toLocaleDateString('es-AR')}
                        </span>
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          — Dr/a. {evo.medico?.apellido} ({evo.medico?.especialidad})
                        </span>
                      </div>
                    </div>

                    {evo.motivo_consulta && (
                      <div className="mb-2">
                        <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Motivo:</span>
                        <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{evo.motivo_consulta}</p>
                      </div>
                    )}
                    {evo.diagnostico && (
                      <div className="mb-2">
                        <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Diagnóstico:</span>
                        <p className="text-sm font-medium" style={{ color: 'var(--warning)' }}>{evo.diagnostico}</p>
                      </div>
                    )}
                    {evo.indicaciones && (
                      <div className="mb-2">
                        <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Indicaciones:</span>
                        <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{evo.indicaciones}</p>
                      </div>
                    )}

                    {/* Adjuntos */}
                    {evo.adjuntos && evo.adjuntos.length > 0 && (
                      <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border-primary)' }}>
                        <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>📎 Adjuntos:</span>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {evo.adjuntos.map((adj) => (
                            <a
                              key={adj.id}
                              href={adj.url_storage}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg"
                              style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-primary)', textDecoration: 'none' }}
                            >
                              {adj.tipo === 'pdf' ? '📄' : '🖼️'} {adj.nombre_archivo}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
