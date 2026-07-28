'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { formatTime } from '@/lib/utils';

export default function HistoriaClinicaPage() {
  const { id } = useParams();
  const { profile } = useAuth();
  const [paciente, setPaciente] = useState(null);
  const [antecedentes, setAntecedentes] = useState(null);
  const [evoluciones, setEvoluciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingAntecedentes, setEditingAntecedentes] = useState(false);
  const [antForm, setAntForm] = useState({
    alergias: '', cirugias: '', medicacion_actual: '',
    enfermedades_cronicas: '', antecedentes_familiares: '', observaciones: '',
  });

  // Estado para nueva evolución
  const [showNuevaEvolucion, setShowNuevaEvolucion] = useState(false);
  const [evoForm, setEvoForm] = useState({
    motivo_consulta: '',
    examen_fisico: '',
    diagnostico: '',
    indicaciones: '',
  });
  const [archivos, setArchivos] = useState([]);
  const [uploading, setUploading] = useState(false);
  
  // Estados para filtro y acordeón
  const [filtroFecha, setFiltroFecha] = useState('');
  const [expandedEvo, setExpandedEvo] = useState(null);

  const supabase = createClient();

  useEffect(() => {
    if (id) {
      fetchPaciente();
      fetchAntecedentes();
      fetchEvoluciones();
    }
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

  async function handleNuevaEvolucion(e) {
    e.preventDefault();
    if (!profile) return alert('No se pudo identificar al médico');
    
    // Validar que al menos haya texto o archivos
    if (!evoForm.motivo_consulta && !evoForm.diagnostico && archivos.length === 0) {
      return alert('Debe ingresar algún dato o subir al menos un archivo.');
    }

    setUploading(true);
    
    try {
      // 1. Insertar Evolución
      const { data: nuevaEvo, error: evoError } = await supabase
        .from('evoluciones')
        .insert({
          paciente_id: id,
          medico_id: profile.id,
          motivo_consulta: evoForm.motivo_consulta || null,
          examen_fisico: evoForm.examen_fisico || null,
          diagnostico: evoForm.diagnostico || null,
          indicaciones: evoForm.indicaciones || null,
        })
        .select()
        .single();
        
      if (evoError) throw evoError;
      
      // 2. Subir archivos si hay
      if (archivos.length > 0) {
        for (const file of archivos) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
          const filePath = `${id}/${nuevaEvo.id}/${fileName}`;
          
          const { error: uploadError } = await supabase.storage
            .from('adjuntos')
            .upload(filePath, file);
            
          if (uploadError) throw uploadError;
          
          const { data: { publicUrl } } = supabase.storage
            .from('adjuntos')
            .getPublicUrl(filePath);
            
          let tipo = 'otro';
          const extLow = fileExt.toLowerCase();
          if (['pdf'].includes(extLow)) tipo = 'pdf';
          else if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(extLow)) tipo = 'imagen';
          else if (['doc', 'docx'].includes(extLow)) tipo = 'word';
          else if (['xls', 'xlsx', 'csv'].includes(extLow)) tipo = 'excel';
          
          const { error: adjError } = await supabase.from('adjuntos').insert({
            evolucion_id: nuevaEvo.id,
            nombre_archivo: file.name,
            tipo: tipo,
            url_storage: publicUrl
          });
          
          if (adjError) throw adjError;
        }
      }
      
      setShowNuevaEvolucion(false);
      setEvoForm({ motivo_consulta: '', examen_fisico: '', diagnostico: '', indicaciones: '' });
      setArchivos([]);
      fetchEvoluciones();
    } catch (error) {
      console.error('Error:', error);
      alert('Error al guardar la evolución: ' + (error.message || 'Verifica que la tabla adjuntos no tenga restricciones y el bucket exista.'));
    } finally {
      setUploading(false);
    }
  }

  function handleFileChange(e) {
    if (e.target.files) {
      setArchivos(Array.from(e.target.files));
    }
  }

  function getFileIcon(tipo) {
    switch(tipo) {
      case 'pdf': return '📄';
      case 'imagen': return '🖼️';
      case 'word': return '📝';
      case 'excel': return '📊';
      default: return '📎';
    }
  }

  if (!paciente) return <div className="loader"><div className="loader-spinner" /></div>;

  const edad = paciente.fecha_nacimiento
    ? Math.floor((new Date() - new Date(paciente.fecha_nacimiento)) / 31557600000)
    : null;

  const evolucionesFiltradas = evoluciones.filter(evo => {
    if (!filtroFecha) return true;
    const evoDate = new Date(evo.created_at).toISOString().split('T')[0]; // "YYYY-MM-DD"
    return evoDate === filtroFecha;
  });

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      {/* Header con datos del paciente */}
      <div className="glass-card p-6 mb-6 flex flex-wrap gap-4 items-center justify-between">
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
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                Evoluciones ({evolucionesFiltradas.length})
              </h2>
              <div className="flex flex-wrap items-center gap-3">
                <input 
                  type="date" 
                  className="input-field text-sm px-3 py-1.5 h-auto w-auto" 
                  value={filtroFecha}
                  onChange={e => setFiltroFecha(e.target.value)}
                  title="Filtrar por fecha"
                />
                {filtroFecha && (
                  <button onClick={() => setFiltroFecha('')} className="btn-ghost text-xs">Limpiar</button>
                )}
                <button onClick={() => setShowNuevaEvolucion(true)} className="btn-primary text-sm px-3 py-1.5">
                  + Nueva Evolución
                </button>
              </div>
            </div>

            {loading ? (
              <div className="loader"><div className="loader-spinner" /></div>
            ) : evolucionesFiltradas.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-3xl mb-2">📋</div>
                <p style={{ color: 'var(--text-secondary)' }}>Sin evoluciones registradas para esta fecha</p>
              </div>
            ) : (
              <div className="space-y-4">
                {evolucionesFiltradas.map((evo) => (
                  <div
                    key={evo.id}
                    className="rounded-xl overflow-hidden transition-all"
                    style={{ background: 'var(--bg-input)', border: '1px solid var(--border-primary)' }}
                  >
                    {/* Cabecera clickeable (Acordeón) */}
                    <button
                      className="w-full p-4 flex items-center justify-between text-left transition-colors"
                      style={{ background: expandedEvo === evo.id ? 'rgba(0,0,0,0.03)' : 'transparent' }}
                      onClick={() => setExpandedEvo(expandedEvo === evo.id ? null : evo.id)}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold" style={{ color: 'var(--accent-primary)' }}>
                          {new Date(evo.created_at).toLocaleDateString('es-AR')} a las {formatTime(new Date(evo.created_at).toLocaleTimeString('es-AR'))}
                        </span>
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          — Dr/a. {evo.medico?.apellido} ({evo.medico?.especialidad})
                        </span>
                      </div>
                      <span className="text-xl font-bold ml-2" style={{ color: 'var(--text-muted)' }}>
                        {expandedEvo === evo.id ? '−' : '+'}
                      </span>
                    </button>

                    {/* Contenido Desplegable */}
                    {expandedEvo === evo.id && (
                      <div className="p-4 pt-0" style={{ borderTop: '1px dashed var(--border-primary)', marginTop: '8px', paddingTop: '16px' }}>
                        {evo.motivo_consulta && (
                          <div className="mb-3">
                            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Motivo de Consulta:</span>
                            <p className="text-sm mt-1" style={{ color: 'var(--text-primary)' }}>{evo.motivo_consulta}</p>
                          </div>
                        )}
                        {evo.examen_fisico && (
                          <div className="mb-3">
                            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Examen Físico:</span>
                            <p className="text-sm mt-1" style={{ color: 'var(--text-primary)' }}>{evo.examen_fisico}</p>
                          </div>
                        )}
                        {evo.diagnostico && (
                          <div className="mb-3 p-3 rounded-lg" style={{ background: 'rgba(234, 179, 8, 0.1)' }}>
                            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#ca8a04' }}>Diagnóstico:</span>
                            <p className="text-sm mt-1 font-medium" style={{ color: '#ca8a04' }}>{evo.diagnostico}</p>
                          </div>
                        )}
                        {evo.indicaciones && (
                          <div className="mb-3">
                            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Indicaciones / Tratamiento:</span>
                            <p className="text-sm mt-1" style={{ color: 'var(--text-primary)' }}>{evo.indicaciones}</p>
                          </div>
                        )}

                        {/* Adjuntos */}
                        {evo.adjuntos && evo.adjuntos.length > 0 && (
                          <div className="mt-4 pt-3" style={{ borderTop: '1px solid var(--border-primary)' }}>
                            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>📎 Archivos Adjuntos:</span>
                            <div className="flex flex-wrap gap-2 mt-2">
                              {evo.adjuntos.map((adj) => (
                                <a
                                  key={adj.id}
                                  href={adj.url_storage}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg transition-colors hover:scale-105"
                                  style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-primary)', textDecoration: 'none' }}
                                >
                                  {getFileIcon(adj.tipo)} <span className="truncate max-w-[200px] font-medium">{adj.nombre_archivo}</span>
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Nueva Evolución */}
      {showNuevaEvolucion && (
        <div className="modal-overlay" onClick={() => !uploading && setShowNuevaEvolucion(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '700px' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Registrar Evolución</h2>
              {!uploading && (
                <button onClick={() => setShowNuevaEvolucion(false)} className="btn-ghost">✕</button>
              )}
            </div>

            <form onSubmit={handleNuevaEvolucion} className="space-y-4">
              <div>
                <label className="input-label">Motivo de Consulta</label>
                <textarea
                  className="input-field"
                  rows="2"
                  value={evoForm.motivo_consulta}
                  onChange={(e) => setEvoForm({ ...evoForm, motivo_consulta: e.target.value })}
                  placeholder="Ej: Control general, dolor de cabeza..."
                />
              </div>
              <div>
                <label className="input-label">Examen Físico</label>
                <textarea
                  className="input-field"
                  rows="2"
                  value={evoForm.examen_fisico}
                  onChange={(e) => setEvoForm({ ...evoForm, examen_fisico: e.target.value })}
                  placeholder="Observaciones clínicas, signos vitales..."
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="input-label">Diagnóstico</label>
                  <textarea
                    className="input-field"
                    rows="3"
                    value={evoForm.diagnostico}
                    onChange={(e) => setEvoForm({ ...evoForm, diagnostico: e.target.value })}
                    placeholder="Diagnóstico presuntivo o definitivo..."
                  />
                </div>
                <div>
                  <label className="input-label">Indicaciones / Tratamiento</label>
                  <textarea
                    className="input-field"
                    rows="3"
                    value={evoForm.indicaciones}
                    onChange={(e) => setEvoForm({ ...evoForm, indicaciones: e.target.value })}
                    placeholder="Medicamentos, reposo, estudios requeridos..."
                  />
                </div>
              </div>

              {/* Sección Adjuntos */}
              <div className="p-4 rounded-xl border border-dashed mt-2" style={{ borderColor: 'var(--border-primary)', background: 'var(--bg-secondary)' }}>
                <label className="input-label mb-2 flex items-center justify-between">
                  <span>Archivos Adjuntos</span>
                  <span className="text-xs font-normal opacity-70">Fotos, Word, Excel, PDF</span>
                </label>
                <input
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  style={{ color: 'var(--text-primary)' }}
                />
                {archivos.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {archivos.map((a, i) => (
                      <span key={i} className="text-xs px-2 py-1 rounded bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                        {a.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowNuevaEvolucion(false)} className="btn-secondary" disabled={uploading}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={uploading}>
                  {uploading ? (
                    <span className="flex items-center gap-2">
                      <div className="loader-spinner border-white" style={{ width: '16px', height: '16px', borderWidth: '2px' }} />
                      Guardando...
                    </span>
                  ) : 'Guardar Evolución'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
