'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ESTADO_CONFIG, formatTime, generateWhatsAppLink } from '@/lib/utils';
import { IconCalendar, IconClock, IconHospital, IconCheckCircle, IconClipboard, IconPlus } from '@/components/ui/Icons';

export default function SecretariaDashboard() {
  const { profile, loading: authLoading } = useAuth();
  const [turnos, setTurnos] = useState([]);
  const [stats, setStats] = useState({ total: 0, pendientes: 0, enSala: 0, atendidos: 0 });
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    fetchTurnosHoy();
  }, []);

  async function fetchTurnosHoy() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('turnos')
        .select('*, paciente:pacientes(*), medico:profiles(*)')
        .eq('fecha', today)
        .order('hora', { ascending: true });

      if (error) throw error;

      setTurnos(data || []);
      setStats({
        total: data?.length || 0,
        pendientes: data?.filter((t) => t.estado === 'pendiente').length || 0,
        enSala: data?.filter((t) => t.estado === 'en_sala').length || 0,
        atendidos: data?.filter((t) => t.estado === 'atendido').length || 0,
      });
    } catch (error) {
      console.error('Error fetching turnos:', error);
    } finally {
      setLoading(false);
    }
  }

  async function updateEstado(turnoId, nuevoEstado) {
    try {
      const { error } = await supabase.from('turnos').update({ estado: nuevoEstado }).eq('id', turnoId);
      if (error) throw error;
      fetchTurnosHoy();
    } catch (error) {
      console.error('Error updating turno:', error);
    }
  }

  const statCards = [
    { label: 'Turnos Hoy', value: stats.total, icon: <IconCalendar size={22} color="#3b82f6" />, bg: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' },
    { label: 'Pendientes', value: stats.pendientes, icon: <IconClock size={22} color="#f59e0b" />, bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' },
    { label: 'En Sala', value: stats.enSala, icon: <IconHospital size={22} color="#10b981" />, bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981' },
    { label: 'Atendidos', value: stats.atendidos, icon: <IconCheckCircle size={22} color="#64748b" />, bg: 'rgba(100, 116, 139, 0.15)', color: '#64748b' },
  ];

  if (authLoading) {
    return <div className="loader"><div className="loader-spinner" /></div>;
  }

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
          Bienvenida, {profile?.nombre}
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Resumen del día —{' '}
          <span className="gradient-text font-semibold">
            {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((stat) => (
          <div key={stat.label} className="stat-card">
            <div className="flex items-center justify-between mb-3">
              <div className="stat-icon" style={{ background: stat.bg }}>{stat.icon}</div>
            </div>
            <div className="stat-value" style={{ color: stat.color }}>{loading ? '—' : stat.value}</div>
            <div className="stat-label">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Turnos del día */}
      <div className="glass-card overflow-hidden">
        <div className="flex items-center justify-between p-6 pb-4">
          <div>
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Turnos de Hoy</h2>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{stats.total} turnos programados</p>
          </div>
          <a href="/secretaria/turnos" className="btn-primary text-sm">
            <IconPlus size={16} /> Nuevo Turno
          </a>
        </div>

        {loading ? (
          <div className="loader"><div className="loader-spinner" /></div>
        ) : turnos.length === 0 ? (
          <div className="text-center py-16">
            <div className="flex justify-center mb-3"><IconClipboard size={40} color="var(--text-muted)" /></div>
            <p className="text-lg font-medium" style={{ color: 'var(--text-secondary)' }}>No hay turnos para hoy</p>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Los turnos programados aparecerán aquí</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Hora</th><th>Paciente</th><th>DNI</th><th>Médico</th><th>Especialidad</th><th>Estado</th><th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {turnos.map((turno, index) => {
                  const estadoConfig = ESTADO_CONFIG[turno.estado];
                  return (
                    <tr key={turno.id} style={{ animation: `slideIn 0.3s ease ${index * 0.05}s both` }}>
                      <td><span className="font-mono font-semibold" style={{ color: 'var(--accent-primary)' }}>{formatTime(turno.hora)}</span></td>
                      <td><div className="font-medium">{turno.paciente?.nombre} {turno.paciente?.apellido}</div></td>
                      <td style={{ color: 'var(--text-secondary)' }}>{turno.paciente?.dni}</td>
                      <td>Dr/a. {turno.medico?.apellido}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{turno.medico?.especialidad}</td>
                      <td>
                        <span className={`badge ${estadoConfig.color}`}>
                          <span className={`badge-dot ${estadoConfig.dot}`} />{estadoConfig.label}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          {turno.estado === 'pendiente' && (
                            <button onClick={() => updateEstado(turno.id, 'confirmado')} className="btn-ghost text-xs" style={{ color: 'var(--accent-primary)' }}>Confirmar</button>
                          )}
                          {turno.estado === 'confirmado' && (
                            <button onClick={() => updateEstado(turno.id, 'en_sala')} className="btn-ghost text-xs" style={{ color: 'var(--success)' }}>En sala</button>
                          )}
                          {turno.estado !== 'atendido' && turno.estado !== 'cancelado' && (
                            <button onClick={() => updateEstado(turno.id, 'cancelado')} className="btn-ghost text-xs" style={{ color: 'var(--danger)' }}>Cancelar</button>
                          )}
                          {turno.paciente?.telefono && (
                            <a href={generateWhatsAppLink(turno.paciente, turno, turno.medico)} target="_blank" rel="noopener noreferrer" className="btn-whatsapp text-xs">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                              WhatsApp
                            </a>
                          )}
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
