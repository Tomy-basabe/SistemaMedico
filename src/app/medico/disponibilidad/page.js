'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { DIAS_SEMANA } from '@/lib/utils';
import { IconCheck, IconPlus, IconX } from '@/components/ui/Icons';

const DIAS_INDEX = [1, 2, 3, 4, 5, 6, 0]; // Lunes a Domingo

export default function DisponibilidadPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  
  // State: dayIndex -> array of blocks
  const [schedule, setSchedule] = useState({});
  const [deletedIds, setDeletedIds] = useState([]); // To track blocks that were actually deleted/deactivated

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
      .eq('activa', true) // Only load active ones as per "Si desactivas se borran, que se desactive" (we hide them, they are in DB but inactive)
      .order('dia_semana')
      .order('hora_inicio');
      
    const newSchedule = {};
    DIAS_INDEX.forEach(d => { newSchedule[d] = []; });
    
    if (data) {
      data.forEach(b => {
        newSchedule[b.dia_semana].push({
          id: b.id,
          hora_inicio: b.hora_inicio.slice(0, 5),
          hora_fin: b.hora_fin.slice(0, 5),
          duracion_turno: b.duracion_turno,
          activa: b.activa,
          isNew: false
        });
      });
    }
    
    setSchedule(newSchedule);
    setDeletedIds([]);
    setLoading(false);
  }

  function addBlock(day) {
    setSchedule(prev => ({
      ...prev,
      [day]: [
        ...prev[day],
        { id: Math.random().toString(), hora_inicio: '08:00', hora_fin: '12:00', duracion_turno: 30, activa: true, isNew: true }
      ]
    }));
  }

  function removeBlock(day, blockId) {
    setSchedule(prev => {
      const blockToRemove = prev[day].find(b => b.id === blockId);
      if (blockToRemove && !blockToRemove.isNew) {
        setDeletedIds(d => [...d, blockId]);
      }
      return {
        ...prev,
        [day]: prev[day].filter(b => b.id !== blockId)
      };
    });
  }

  function updateBlock(day, blockId, field, value) {
    setSchedule(prev => ({
      ...prev,
      [day]: prev[day].map(b => b.id === blockId ? { ...b, [field]: value } : b)
    }));
  }

  function copyToWeekdays(fromDay) {
    if (!confirm('¿Copiar estos horarios a todos los días de Lunes a Viernes? Se reemplazarán los horarios actuales.')) return;
    
    const sourceBlocks = schedule[fromDay].map(b => ({
      ...b,
      id: Math.random().toString(),
      isNew: true
    }));
    
    setSchedule(prev => {
      const next = { ...prev };
      // Lunes (1) a Viernes (5)
      [1, 2, 3, 4, 5].forEach(d => {
        if (d !== fromDay) {
          // Marcar los existentes como eliminados para que se desactiven en DB
          prev[d].forEach(b => {
            if (!b.isNew) setDeletedIds(del => [...del, b.id]);
          });
          next[d] = sourceBlocks.map(b => ({ ...b, id: Math.random().toString() }));
        }
      });
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    setSuccess('');
    
    try {
      // 1. Deactivate deleted blocks (instead of hard delete)
      if (deletedIds.length > 0) {
        await supabase.from('disponibilidad')
          .update({ activa: false })
          .in('id', deletedIds);
      }
      
      // 2. Upsert active blocks
      const upserts = [];
      Object.entries(schedule).forEach(([dia_semana, blocks]) => {
        blocks.forEach(b => {
          const record = {
            medico_id: profile.id,
            dia_semana: parseInt(dia_semana),
            hora_inicio: b.hora_inicio + ':00',
            hora_fin: b.hora_fin + ':00',
            duracion_turno: b.duracion_turno,
            activa: true
          };
          if (!b.isNew) record.id = b.id;
          upserts.push(record);
        });
      });
      
      if (upserts.length > 0) {
        const { error } = await supabase.from('disponibilidad').upsert(upserts);
        if (error) throw error;
      }
      
      setSuccess('Horarios guardados exitosamente');
      await fetchDisponibilidad();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error(error);
      alert('Error al guardar: ' + error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ animation: 'fadeIn 0.4s ease', paddingBottom: '100px' }}>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Mi Disponibilidad</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Configurá tus días y horarios de atención de forma rápida</p>
        </div>
        <button 
          onClick={handleSave} 
          disabled={saving || loading}
          className="btn-primary flex items-center gap-2"
          style={{ padding: '12px 24px', fontSize: '15px' }}
        >
          {saving ? <div className="loader-spinner !w-5 !h-5 border-2" /> : <IconCheck size={20} />}
          Guardar Cambios
        </button>
      </div>

      {success && (
        <div className="mb-6 p-4 rounded-xl text-sm font-medium flex items-center gap-2" style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#10b981' }}>
          <IconCheck size={18} /> {success}
        </div>
      )}

      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="p-12"><div className="loader"><div className="loader-spinner" /></div></div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--border-primary)' }}>
            {DIAS_INDEX.map((dia) => {
              const blocks = schedule[dia] || [];
              const hasBlocks = blocks.length > 0;
              
              return (
                <div key={dia} className="p-6 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                    {/* Day Header */}
                    <div className="w-48 flex-shrink-0">
                      <h3 className="font-bold flex items-center gap-3 text-lg" style={{ color: hasBlocks ? 'var(--accent-primary)' : 'var(--text-secondary)' }}>
                        <div className={`w-3 h-3 rounded-full ${hasBlocks ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
                        {DIAS_SEMANA[dia]}
                      </h3>
                      {hasBlocks && (
                        <button 
                          onClick={() => copyToWeekdays(dia)}
                          className="text-xs font-medium mt-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                        >
                          Copiar a Lun-Vie
                        </button>
                      )}
                    </div>

                    {/* Time Blocks */}
                    <div className="flex-1 space-y-3">
                      {blocks.map((b) => (
                        <div key={b.id} className="flex flex-wrap items-center gap-4 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm">
                          <div className="flex items-center gap-2">
                            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">De</label>
                            <input 
                              type="time" 
                              className="input-field !py-1.5 !px-3 !bg-transparent"
                              value={b.hora_inicio} 
                              onChange={(e) => updateBlock(dia, b.id, 'hora_inicio', e.target.value)} 
                            />
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">A</label>
                            <input 
                              type="time" 
                              className="input-field !py-1.5 !px-3 !bg-transparent"
                              value={b.hora_fin} 
                              onChange={(e) => updateBlock(dia, b.id, 'hora_fin', e.target.value)} 
                            />
                          </div>

                          <div className="flex items-center gap-2">
                            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Turnos de</label>
                            <select 
                              className="select-field !py-1.5 !px-3 !w-auto !bg-transparent"
                              value={b.duracion_turno}
                              onChange={(e) => updateBlock(dia, b.id, 'duracion_turno', parseInt(e.target.value))}
                            >
                              <option value={15}>15 min</option>
                              <option value={20}>20 min</option>
                              <option value={30}>30 min</option>
                              <option value={45}>45 min</option>
                              <option value={60}>60 min</option>
                            </select>
                          </div>

                          <div className="flex-1 flex justify-end">
                            <button 
                              onClick={() => removeBlock(dia, b.id)}
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                              title="Eliminar este horario"
                            >
                              <IconX size={18} />
                            </button>
                          </div>
                        </div>
                      ))}

                      <div>
                        <button 
                          onClick={() => addBlock(dia)}
                          className="inline-flex items-center gap-1.5 text-sm font-medium py-1.5 px-3 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-900/20 transition-colors"
                        >
                          <IconPlus size={16} /> Agregar Horario
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      {/* Fixed Save Bar at bottom for convenience */}
      <div className="fixed bottom-0 left-0 right-0 p-4 border-t border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md z-40 flex justify-end" style={{ paddingLeft: 'calc(var(--sidebar-width) + 1rem)' }}>
        <button 
          onClick={handleSave} 
          disabled={saving || loading}
          className="btn-primary flex items-center gap-2 shadow-lg"
        >
          {saving ? <div className="loader-spinner !w-5 !h-5 border-2" /> : <IconCheck size={20} />}
          Guardar Cambios
        </button>
      </div>
    </div>
  );
}
