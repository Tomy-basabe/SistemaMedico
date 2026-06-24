'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { formatTime } from '@/lib/utils';

export default function ConsultaPage() {
  const { turnoId } = useParams();
  const { profile } = useAuth();
  const router = useRouter();
  const [turno, setTurno] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('evolucion');
  const [evolucion, setEvolucion] = useState({
    motivo_consulta: '', examen_fisico: '', diagnostico: '', indicaciones: '',
  });
  const [receta, setReceta] = useState({ tipo: 'receta', contenido: '', diagnostico: '' });
  const [adjuntos, setAdjuntos] = useState([]);
  const supabase = createClient();

  useEffect(() => {
    fetchTurno();
  }, [turnoId]);

  async function fetchTurno() {
    const { data } = await supabase
      .from('turnos')
      .select('*, paciente:pacientes(*, obra_social:obras_sociales(*)), medico:profiles(*)')
      .eq('id', turnoId)
      .single();
    setTurno(data);
    setLoading(false);
  }

  async function guardarConsulta() {
    if (!turno || !profile) return;
    setSaving(true);
    try {
      // Crear evolución
      const { data: evo, error: evoError } = await supabase
        .from('evoluciones')
        .insert({
          paciente_id: turno.paciente_id,
          medico_id: profile.id,
          turno_id: turno.id,
          ...evolucion,
        })
        .select()
        .single();

      if (evoError) throw evoError;

      // Subir adjuntos si hay
      for (const file of adjuntos) {
        const filePath = `evoluciones/${evo.id}/${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('adjuntos')
          .upload(filePath, file);

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage.from('adjuntos').getPublicUrl(filePath);
          await supabase.from('adjuntos').insert({
            evolucion_id: evo.id,
            nombre_archivo: file.name,
            tipo: file.type.includes('pdf') ? 'pdf' : 'imagen',
            url_storage: publicUrl,
          });
        }
      }

      // Marcar turno como atendido
      await supabase.from('turnos').update({ estado: 'atendido' }).eq('id', turno.id);

      alert('Consulta guardada exitosamente');
      router.push('/medico');
    } catch (error) {
      alert('Error: ' + error.message);
    } finally {
      setSaving(false);
    }
  }

  async function guardarReceta() {
    if (!turno || !profile) return;
    try {
      const { error } = await supabase.from('recetas').insert({
        paciente_id: turno.paciente_id,
        medico_id: profile.id,
        ...receta,
      });
      if (error) throw error;
      alert(`${receta.tipo === 'receta' ? 'Receta' : 'Orden de estudio'} guardada`);
      setReceta({ tipo: 'receta', contenido: '', diagnostico: '' });
    } catch (error) {
      alert('Error: ' + error.message);
    }
  }

  if (loading) return <div className="loader"><div className="loader-spinner" /></div>;
  if (!turno) return <p>Turno no encontrado</p>;

  const paciente = turno.paciente;

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      {/* Paciente header */}
      <div className="glass-card p-5 mb-6" style={{ border: '1px solid rgba(16, 185, 129, 0.3)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold"
              style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}
            >
              {paciente?.nombre?.charAt(0)}{paciente?.apellido?.charAt(0)}
            </div>
            <div>
              <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                Consulta: {paciente?.nombre} {paciente?.apellido}
              </h1>
              <div className="flex gap-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
                <span>DNI: {paciente?.dni}</span>
                <span>Turno: {formatTime(turno.hora)}</span>
                <span>{paciente?.obra_social?.nombre || 'Particular'}</span>
              </div>
            </div>
          </div>
          <a href={`/medico/pacientes/${paciente?.id}`} className="btn-secondary text-sm">
            Ver Historia Clínica
          </a>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {[
          { key: 'evolucion', label: '📝 Evolución' },
          { key: 'receta', label: '📋 Receta / Orden' },
          { key: 'adjuntos', label: '📎 Adjuntos' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="px-5 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{
              background: activeTab === tab.key ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-card)',
              color: activeTab === tab.key ? 'var(--accent-primary)' : 'var(--text-secondary)',
              border: `1px solid ${activeTab === tab.key ? 'rgba(59, 130, 246, 0.3)' : 'var(--border-primary)'}`,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="glass-card p-6">
        {activeTab === 'evolucion' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Evolución Médica</h2>
            <div>
              <label className="input-label">Motivo de Consulta</label>
              <textarea className="input-field" rows="3" value={evolucion.motivo_consulta}
                onChange={(e) => setEvolucion({ ...evolucion, motivo_consulta: e.target.value })}
                placeholder="¿Por qué consulta el paciente?" />
            </div>
            <div>
              <label className="input-label">Examen Físico</label>
              <textarea className="input-field" rows="3" value={evolucion.examen_fisico}
                onChange={(e) => setEvolucion({ ...evolucion, examen_fisico: e.target.value })}
                placeholder="Hallazgos del examen físico..." />
            </div>
            <div>
              <label className="input-label">Diagnóstico</label>
              <textarea className="input-field" rows="2" value={evolucion.diagnostico}
                onChange={(e) => setEvolucion({ ...evolucion, diagnostico: e.target.value })}
                placeholder="Diagnóstico presuntivo o definitivo..." />
            </div>
            <div>
              <label className="input-label">Indicaciones</label>
              <textarea className="input-field" rows="3" value={evolucion.indicaciones}
                onChange={(e) => setEvolucion({ ...evolucion, indicaciones: e.target.value })}
                placeholder="Tratamiento, medicación, estudios a realizar..." />
            </div>
          </div>
        )}

        {activeTab === 'receta' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Receta / Orden de Estudio</h2>
            <div>
              <label className="input-label">Tipo</label>
              <select className="select-field" value={receta.tipo} onChange={(e) => setReceta({ ...receta, tipo: e.target.value })}>
                <option value="receta">Receta Médica</option>
                <option value="orden_estudio">Orden de Estudio</option>
              </select>
            </div>
            <div>
              <label className="input-label">Diagnóstico</label>
              <input type="text" className="input-field" value={receta.diagnostico}
                onChange={(e) => setReceta({ ...receta, diagnostico: e.target.value })}
                placeholder="Diagnóstico asociado..." />
            </div>
            <div>
              <label className="input-label">{receta.tipo === 'receta' ? 'Prescripción' : 'Estudios solicitados'}</label>
              <textarea className="input-field" rows="6" value={receta.contenido}
                onChange={(e) => setReceta({ ...receta, contenido: e.target.value })}
                placeholder={receta.tipo === 'receta'
                  ? 'Rp:\n1. Medicamento - dosis - frecuencia\n2. ...'
                  : '1. Hemograma completo\n2. Glucemia\n3. ...'
                } />
            </div>
            <button onClick={guardarReceta} className="btn-primary">
              Guardar {receta.tipo === 'receta' ? 'Receta' : 'Orden'}
            </button>
          </div>
        )}

        {activeTab === 'adjuntos' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Adjuntar Archivos</h2>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Subí estudios de laboratorio (PDF) o imágenes (radiografías, ecografías)
            </p>
            <div
              className="p-8 rounded-xl text-center cursor-pointer transition-all"
              style={{ border: '2px dashed var(--border-primary)', background: 'var(--bg-input)' }}
              onClick={() => document.getElementById('file-input').click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                setAdjuntos([...adjuntos, ...Array.from(e.dataTransfer.files)]);
              }}
            >
              <div className="text-3xl mb-2">📤</div>
              <p className="font-medium" style={{ color: 'var(--text-secondary)' }}>
                Arrastrá archivos o hacé clic para seleccionar
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>PDF, JPG, PNG</p>
              <input
                id="file-input"
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                className="hidden"
                onChange={(e) => setAdjuntos([...adjuntos, ...Array.from(e.target.files)])}
              />
            </div>
            {adjuntos.length > 0 && (
              <div className="space-y-2">
                {adjuntos.map((f, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-primary)' }}>
                    <span className="text-sm">{f.type.includes('pdf') ? '📄' : '🖼️'} {f.name}</span>
                    <button onClick={() => setAdjuntos(adjuntos.filter((_, idx) => idx !== i))} className="btn-ghost text-xs" style={{ color: 'var(--danger)' }}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div className="flex justify-between items-center mt-6">
        <button onClick={() => router.push('/medico')} className="btn-secondary">
          ← Volver al Dashboard
        </button>
        <button onClick={guardarConsulta} className="btn-primary" disabled={saving}>
          {saving ? (
            <div className="loader-spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }} />
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>
              Guardar Consulta y Finalizar
            </>
          )}
        </button>
      </div>
    </div>
  );
}
