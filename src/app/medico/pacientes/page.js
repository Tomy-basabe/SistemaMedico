'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export default function MedicoPacientesPage() {
  const { profile } = useAuth();
  const [pacientes, setPacientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const supabase = createClient();

  useEffect(() => {
    if (profile?.id) fetchMisPacientes();
  }, [profile]);

  async function fetchMisPacientes() {
    setLoading(true);
    // Get unique patients from doctor's appointments
    const { data: turnos } = await supabase
      .from('turnos')
      .select('paciente_id, paciente:pacientes(*, obra_social:obras_sociales(*))')
      .eq('medico_id', profile.id);

    const uniqueMap = {};
    (turnos || []).forEach((t) => {
      if (t.paciente && !uniqueMap[t.paciente.id]) {
        uniqueMap[t.paciente.id] = t.paciente;
      }
    });

    setPacientes(Object.values(uniqueMap).sort((a, b) => a.apellido.localeCompare(b.apellido)));
    setLoading(false);
  }

  const filtered = pacientes.filter((p) => {
    const q = search.toLowerCase();
    return p.nombre?.toLowerCase().includes(q) || p.apellido?.toLowerCase().includes(q) || p.dni?.includes(q);
  });

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      <div className="mb-8">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Mis Pacientes</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Pacientes que han tenido consultas con vos</p>
      </div>

      <div className="glass-card p-4 mb-6">
        <input type="text" className="input-field" placeholder="🔍 Buscar por nombre, apellido o DNI..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="loader"><div className="loader-spinner" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">👤</div>
            <p className="text-lg font-medium" style={{ color: 'var(--text-secondary)' }}>
              {search ? 'Sin resultados' : 'Aún no atendiste pacientes'}
            </p>
          </div>
        ) : (
          <div className="grid gap-3 p-4">
            {filtered.map((p, idx) => (
              <a
                key={p.id}
                href={`/medico/pacientes/${p.id}`}
                className="flex items-center justify-between p-4 rounded-xl transition-all duration-200"
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-primary)',
                  animation: `slideIn 0.3s ease ${idx * 0.04}s both`,
                  textDecoration: 'none',
                  color: 'inherit',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.3)';
                  e.currentTarget.style.transform = 'translateX(4px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-primary)';
                  e.currentTarget.style.transform = 'translateX(0)';
                }}
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold"
                    style={{ background: 'rgba(59, 130, 246, 0.15)', color: 'var(--accent-primary)' }}
                  >
                    {p.nombre?.charAt(0)}{p.apellido?.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{p.nombre} {p.apellido}</p>
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>DNI: {p.dni} — {p.obra_social?.nombre || 'Particular'}</p>
                  </div>
                </div>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--text-muted)' }}>
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
