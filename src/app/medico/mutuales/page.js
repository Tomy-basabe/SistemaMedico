'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { IconCheck } from '@/components/ui/Icons';

export default function MisMutualesPage() {
  const { profile } = useAuth();
  const [obrasSociales, setObrasSociales] = useState([]);
  const [misMutuales, setMisMutuales] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  
  const supabase = createClient();

  useEffect(() => {
    if (profile) {
      fetchData();
    }
  }, [profile]);

  async function fetchData() {
    setLoading(true);
    
    // 1. Obtener todas las mutuales activas
    const { data: osData } = await supabase
      .from('obras_sociales')
      .select('*')
      .eq('activa', true)
      .order('nombre');
      
    // 2. Obtener las que el médico acepta
    const { data: misData } = await supabase
      .from('medico_obras_sociales')
      .select('obra_social_id')
      .eq('medico_id', profile.id);

    const misSet = new Set((misData || []).map(m => m.obra_social_id));
    
    setObrasSociales(osData || []);
    setMisMutuales(misSet);
    setLoading(false);
  }

  async function toggleMutual(obraSocialId, actualmenteAceptada) {
    setSaving(obraSocialId);
    
    try {
      if (actualmenteAceptada) {
        // Dejar de aceptar
        await supabase
          .from('medico_obras_sociales')
          .delete()
          .match({ medico_id: profile.id, obra_social_id: obraSocialId });
          
        setMisMutuales(prev => {
          const next = new Set(prev);
          next.delete(obraSocialId);
          return next;
        });
      } else {
        // Empezar a aceptar
        await supabase
          .from('medico_obras_sociales')
          .insert({ medico_id: profile.id, obra_social_id: obraSocialId });
          
        setMisMutuales(prev => {
          const next = new Set(prev);
          next.add(obraSocialId);
          return next;
        });
      }
    } catch (error) {
      console.error('Error al actualizar mutual:', error);
      alert('Hubo un error al guardar los cambios.');
    } finally {
      setSaving(null);
    }
  }

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      <div className="mb-8">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Mis Mutuales Aceptadas</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Seleccioná las obras sociales por las que atendés a tus pacientes</p>
      </div>

      <div className="glass-card p-6">
        {loading ? (
          <div className="loader"><div className="loader-spinner" /></div>
        ) : obrasSociales.length === 0 ? (
          <p className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
            No hay obras sociales activas en el sistema. Solicitá a Secretaría que las agregue.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {obrasSociales.map((os) => {
              const isAccepted = misMutuales.has(os.id);
              const isSaving = saving === os.id;
              
              return (
                <div 
                  key={os.id}
                  className="flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer"
                  style={{ 
                    background: isAccepted ? 'rgba(16, 185, 129, 0.05)' : 'var(--bg-card)',
                    borderColor: isAccepted ? 'rgba(16, 185, 129, 0.3)' : 'var(--border-primary)',
                    opacity: isSaving ? 0.7 : 1
                  }}
                  onClick={() => !isSaving && toggleMutual(os.id, isAccepted)}
                >
                  <div>
                    <h3 className="font-semibold" style={{ color: isAccepted ? '#10b981' : 'var(--text-primary)' }}>
                      {os.nombre}
                    </h3>
                  </div>
                  
                  <div 
                    className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${isAccepted ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'}`}
                  >
                    {isSaving ? (
                      <div className="loader-spinner !w-3 !h-3 !border-white" />
                    ) : isAccepted ? (
                      <IconCheck size={14} color="white" />
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
