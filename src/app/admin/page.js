'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { IconUsers, IconCalendar, IconClipboard, IconBarChart, IconHistory } from '@/components/ui/Icons';

export default function AdminDashboard() {
  const { profile, loading: authLoading } = useAuth();
  const [stats, setStats] = useState({ pacientes: 0, turnos: 0, medicos: 0, turnosHoy: 0 });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchStats();
    fetchRecentActivity();
  }, []);

  async function fetchStats() {
    const [pacientes, turnos, medicos, turnosHoy] = await Promise.all([
      supabase.from('pacientes').select('id', { count: 'exact', head: true }),
      supabase.from('turnos').select('id', { count: 'exact', head: true }),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('rol', 'medico'),
      supabase.from('turnos').select('id', { count: 'exact', head: true }).eq('fecha', new Date().toISOString().split('T')[0]),
    ]);

    setStats({
      pacientes: pacientes.count || 0,
      turnos: turnos.count || 0,
      medicos: medicos.count || 0,
      turnosHoy: turnosHoy.count || 0,
    });
    setLoading(false);
  }

  async function fetchRecentActivity() {
    const { data } = await supabase
      .from('audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    setRecentActivity(data || []);
  }

  const statCards = [
    { label: 'Pacientes Registrados', value: stats.pacientes, icon: <IconUsers size={22} color="#3b82f6" />, bg: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' },
    { label: 'Turnos Totales', value: stats.turnos, icon: <IconCalendar size={22} color="#8b5cf6" />, bg: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6' },
    { label: 'Médicos Activos', value: stats.medicos, icon: <IconClipboard size={22} color="#10b981" />, bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981' },
    { label: 'Turnos Hoy', value: stats.turnosHoy, icon: <IconBarChart size={22} color="#f59e0b" />, bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' },
  ];

  if (authLoading) return <div className="loader"><div className="loader-spinner" /></div>;

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
          Panel de Administración
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Bienvenida, {profile?.nombre} — Vista general del centro médico
        </p>
      </div>

      {/* Stats */}
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

      {/* Quick links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <a href="/admin/usuarios" className="glass-card p-5 flex items-center gap-4 transition-transform hover:translate-x-1" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(59, 130, 246, 0.15)' }}>
            <IconUsers size={24} color="#3b82f6" />
          </div>
          <div>
            <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Gestionar Usuarios</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Crear y administrar cuentas</p>
          </div>
        </a>
        <a href="/admin/auditoria" className="glass-card p-5 flex items-center gap-4 transition-transform hover:translate-x-1" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(139, 92, 246, 0.15)' }}>
            <IconHistory size={24} color="#8b5cf6" />
          </div>
          <div>
            <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Historial de Auditoría</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Quién hizo qué y cuándo</p>
          </div>
        </a>
        <a href="/admin/reportes" className="glass-card p-5 flex items-center gap-4 transition-transform hover:translate-x-1" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(245, 158, 11, 0.15)' }}>
            <IconBarChart size={24} color="#f59e0b" />
          </div>
          <div>
            <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Reportes</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Estadísticas del centro</p>
          </div>
        </a>
      </div>

      {/* Recent activity */}
      <div className="glass-card overflow-hidden">
        <div className="p-6 pb-4">
          <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Actividad Reciente</h2>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Últimas acciones en el sistema</p>
        </div>
        {recentActivity.length === 0 ? (
          <div className="text-center py-12">
            <div className="flex justify-center mb-3"><IconHistory size={40} color="var(--text-muted)" /></div>
            <p style={{ color: 'var(--text-secondary)' }}>Sin actividad registrada aún</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'rgba(30, 58, 95, 0.4)' }}>
            {recentActivity.map((log) => (
              <div key={log.id} className="flex items-start gap-4 px-6 py-4">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: log.accion === 'INSERT' ? 'rgba(16, 185, 129, 0.15)' : log.accion === 'UPDATE' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(239, 68, 68, 0.15)' }}>
                  <span className="text-xs font-bold" style={{ color: log.accion === 'INSERT' ? '#10b981' : log.accion === 'UPDATE' ? '#3b82f6' : '#ef4444' }}>
                    {log.accion === 'INSERT' ? '+' : log.accion === 'UPDATE' ? '~' : '-'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{log.descripcion}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {log.usuario_nombre || 'Sistema'} — {new Date(log.created_at).toLocaleString('es-AR')}
                  </p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                  style={{ background: 'rgba(100, 116, 139, 0.1)', color: 'var(--text-muted)' }}>
                  {log.tabla}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
