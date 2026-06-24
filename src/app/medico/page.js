'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ESTADO_CONFIG, formatTime } from '@/lib/utils';
import { IconClipboard, IconHospital, IconCheckCircle, IconActivity, IconCalendar } from '@/components/ui/Icons';

export default function MedicoDashboard() {
  const { profile, loading: authLoading } = useAuth();
  const [turnos, setTurnos] = useState([]);
  const [stats, setStats] = useState({ total: 0, enSala: 0, atendidos: 0, pendientes: 0 });
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (profile?.id) fetchMisTurnos();
  }, [profile]);

  async function fetchMisTurnos() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('turnos')
        .select('*, paciente:pacientes(*, obra_social:obras_sociales(*))')
        .eq('medico_id', profile.id)
        .eq('fecha', today)
        .order('hora', { ascending: true });

      if (error) throw error;
      setTurnos(data || []);
      setStats({
        total: data?.length || 0,
        enSala: data?.filter((t) => t.estado === 'en_sala').length || 0,
        atendidos: data?.filter((t) => t.estado === 'atendido').length || 0,
        pendientes: data?.filter((t) => t.estado === 'pendiente' || t.estado === 'confirmado').length || 0,
      });
    } catch (error) {
      console.error('Error fetching turnos:', error);
    } finally {
      setLoading(false);
    }
  }

  if (authLoading) {
    return <div className="loader"><div className="loader-spinner" /></div>;
  }

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
          Buen día, Dr/a. {profile?.apellido}
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Tu agenda del día —{' '}
          <span className="gradient-text font-semibold">
            {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="stat-card">
          <div className="flex items-center justify-between mb-3">
            <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.15)' }}><IconClipboard size={22} color="#3b82f6" /></div>
          </div>
          <div className="stat-value" style={{ color: '#3b82f6' }}>{loading ? '—' : stats.total}</div>
          <div className="stat-label">Pacientes Hoy</div>
        </div>

        <div className="stat-card" style={{ border: stats.enSala > 0 ? '1px solid rgba(16, 185, 129, 0.4)' : undefined }}>
          <div className="flex items-center justify-between mb-3">
            <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.15)' }}><IconHospital size={22} color="#10b981" /></div>
            {stats.enSala > 0 && (
              <span className="text-xs font-bold px-2 py-1 rounded-full animate-pulse" style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#10b981' }}>
                ESPERANDO
              </span>
            )}
          </div>
          <div className="stat-value" style={{ color: '#10b981' }}>{loading ? '—' : stats.enSala}</div>
          <div className="stat-label">En Sala de Espera</div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between mb-3">
            <div className="stat-icon" style={{ background: 'rgba(100, 116, 139, 0.15)' }}><IconCheckCircle size={22} color="#64748b" /></div>
          </div>
          <div className="stat-value" style={{ color: '#64748b' }}>{loading ? '—' : stats.atendidos}</div>
          <div className="stat-label">Atendidos</div>
        </div>
      </div>

      {/* Pacientes en sala */}
      {!loading && turnos.filter((t) => t.estado === 'en_sala').length > 0 && (
        <div className="glass-card mb-6 overflow-hidden" style={{ border: '1px solid rgba(16, 185, 129, 0.3)' }}>
          <div className="p-6 pb-4">
            <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: '#10b981' }}>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Pacientes en Sala de Espera
            </h2>
          </div>
          <div className="grid gap-3 p-6 pt-0">
            {turnos.filter((t) => t.estado === 'en_sala').map((turno) => (
              <div key={turno.id} className="flex items-center justify-between p-4 rounded-xl"
                style={{ background: 'rgba(16, 185, 129, 0.06)', border: '1px solid rgba(16, 185, 129, 0.15)' }}>
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold"
                    style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#10b981' }}>
                    {turno.paciente?.nombre?.charAt(0)}{turno.paciente?.apellido?.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {turno.paciente?.nombre} {turno.paciente?.apellido}
                    </p>
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                      Turno: {formatTime(turno.hora)} — {turno.paciente?.obra_social?.nombre || 'Particular'}
                    </p>
                  </div>
                </div>
                <a href={`/medico/consulta/${turno.id}`} className="btn-primary text-sm">
                  <IconActivity size={16} /> Atender
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Agenda completa */}
      <div className="glass-card overflow-hidden">
        <div className="p-6 pb-4">
          <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Agenda Completa</h2>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{stats.total} pacientes programados</p>
        </div>

        {loading ? (
          <div className="loader"><div className="loader-spinner" /></div>
        ) : turnos.length === 0 ? (
          <div className="text-center py-16">
            <div className="flex justify-center mb-3"><IconCalendar size={40} color="var(--text-muted)" /></div>
            <p className="text-lg font-medium" style={{ color: 'var(--text-secondary)' }}>No tenés turnos para hoy</p>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Configurá tu disponibilidad para recibir turnos</p>
            <a href="/medico/disponibilidad" className="btn-primary mt-4 inline-flex">Configurar Disponibilidad</a>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr><th>Hora</th><th>Paciente</th><th>DNI</th><th>Obra Social</th><th>Estado</th><th>Acciones</th></tr>
              </thead>
              <tbody>
                {turnos.map((turno, index) => {
                  const estadoConfig = ESTADO_CONFIG[turno.estado];
                  return (
                    <tr key={turno.id} style={{ animation: `slideIn 0.3s ease ${index * 0.05}s both` }}>
                      <td><span className="font-mono font-semibold" style={{ color: 'var(--accent-primary)' }}>{formatTime(turno.hora)}</span></td>
                      <td><div className="font-medium">{turno.paciente?.nombre} {turno.paciente?.apellido}</div></td>
                      <td style={{ color: 'var(--text-secondary)' }}>{turno.paciente?.dni}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{turno.paciente?.obra_social?.nombre || 'Particular'}</td>
                      <td>
                        <span className={`badge ${estadoConfig.color}`}>
                          <span className={`badge-dot ${estadoConfig.dot}`} />{estadoConfig.label}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          {turno.estado === 'en_sala' && <a href={`/medico/consulta/${turno.id}`} className="btn-primary text-xs py-1.5 px-3">Atender</a>}
                          {turno.estado === 'confirmado' && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Esperando llegada</span>}
                          {turno.estado === 'atendido' && <a href={`/medico/pacientes/${turno.paciente_id}`} className="btn-ghost text-xs" style={{ color: 'var(--accent-primary)' }}>Ver HC</a>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
