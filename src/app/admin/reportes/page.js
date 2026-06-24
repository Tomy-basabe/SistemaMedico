'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { IconBarChart, IconCalendar, IconUsers, IconCheckCircle } from '@/components/ui/Icons';

export default function ReportesPage() {
  const [data, setData] = useState({
    turnosPorEstado: [],
    turnosPorMedico: [],
    turnosPorEspecialidad: [],
    pacientesPorMes: [],
  });
  const [periodo, setPeriodo] = useState('mes');
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchReports();
  }, [periodo]);

  async function fetchReports() {
    setLoading(true);

    // Calcular rango de fechas
    const hoy = new Date();
    let desde = new Date();
    if (periodo === 'semana') desde.setDate(hoy.getDate() - 7);
    else if (periodo === 'mes') desde.setMonth(hoy.getMonth() - 1);
    else if (periodo === 'trimestre') desde.setMonth(hoy.getMonth() - 3);
    else desde.setFullYear(hoy.getFullYear() - 1);

    const desdeStr = desde.toISOString().split('T')[0];

    // Turnos por estado
    const { data: turnos } = await supabase.from('turnos').select('estado').gte('fecha', desdeStr);
    const turnosPorEstado = {};
    (turnos || []).forEach((t) => {
      turnosPorEstado[t.estado] = (turnosPorEstado[t.estado] || 0) + 1;
    });

    // Turnos por médico
    const { data: turnosMedico } = await supabase
      .from('turnos')
      .select('medico_id, medico:profiles(nombre, apellido, especialidad)')
      .gte('fecha', desdeStr);
    const turnosPorMedico = {};
    (turnosMedico || []).forEach((t) => {
      const key = `Dr/a. ${t.medico?.apellido}`;
      turnosPorMedico[key] = (turnosPorMedico[key] || 0) + 1;
    });

    // Turnos por especialidad
    const turnosPorEspecialidad = {};
    (turnosMedico || []).forEach((t) => {
      const esp = t.medico?.especialidad || 'Sin esp.';
      turnosPorEspecialidad[esp] = (turnosPorEspecialidad[esp] || 0) + 1;
    });

    // Pacientes nuevos
    const { data: pacientes } = await supabase.from('pacientes').select('created_at').gte('created_at', desde.toISOString());

    setData({
      turnosPorEstado: Object.entries(turnosPorEstado).sort((a, b) => b[1] - a[1]),
      turnosPorMedico: Object.entries(turnosPorMedico).sort((a, b) => b[1] - a[1]),
      turnosPorEspecialidad: Object.entries(turnosPorEspecialidad).sort((a, b) => b[1] - a[1]),
      totalTurnos: turnos?.length || 0,
      totalPacientesNuevos: pacientes?.length || 0,
      totalAtendidos: turnosPorEstado['atendido'] || 0,
    });
    setLoading(false);
  }

  const estadoLabels = {
    pendiente: 'Pendiente', confirmado: 'Confirmado', en_sala: 'En sala', atendido: 'Atendido', cancelado: 'Cancelado',
  };
  const estadoColors = {
    pendiente: '#f59e0b', confirmado: '#3b82f6', en_sala: '#10b981', atendido: '#64748b', cancelado: '#ef4444',
  };

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Reportes</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Estadísticas y métricas del centro médico</p>
        </div>
        <div className="flex gap-2">
          {[{ v: 'semana', l: '7 días' }, { v: 'mes', l: '30 días' }, { v: 'trimestre', l: '3 meses' }, { v: 'año', l: '1 año' }].map((p) => (
            <button key={p.v} onClick={() => setPeriodo(p.v)}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
              style={{
                background: periodo === p.v ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-card)',
                color: periodo === p.v ? 'var(--accent-primary)' : 'var(--text-secondary)',
                border: `1px solid ${periodo === p.v ? 'rgba(59, 130, 246, 0.3)' : 'var(--border-primary)'}`,
              }}>
              {p.l}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="loader"><div className="loader-spinner" /></div>
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="stat-card">
              <div className="flex items-center justify-between mb-3">
                <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.15)' }}><IconCalendar size={22} color="#3b82f6" /></div>
              </div>
              <div className="stat-value" style={{ color: '#3b82f6' }}>{data.totalTurnos}</div>
              <div className="stat-label">Turnos Totales</div>
            </div>
            <div className="stat-card">
              <div className="flex items-center justify-between mb-3">
                <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.15)' }}><IconCheckCircle size={22} color="#10b981" /></div>
              </div>
              <div className="stat-value" style={{ color: '#10b981' }}>{data.totalAtendidos}</div>
              <div className="stat-label">Consultas Realizadas</div>
            </div>
            <div className="stat-card">
              <div className="flex items-center justify-between mb-3">
                <div className="stat-icon" style={{ background: 'rgba(139, 92, 246, 0.15)' }}><IconUsers size={22} color="#8b5cf6" /></div>
              </div>
              <div className="stat-value" style={{ color: '#8b5cf6' }}>{data.totalPacientesNuevos}</div>
              <div className="stat-label">Pacientes Nuevos</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Turnos por estado */}
            <div className="glass-card p-6">
              <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Turnos por Estado</h3>
              <div className="space-y-3">
                {data.turnosPorEstado.map(([estado, count]) => {
                  const pct = data.totalTurnos > 0 ? (count / data.totalTurnos) * 100 : 0;
                  return (
                    <div key={estado}>
                      <div className="flex justify-between text-sm mb-1">
                        <span style={{ color: 'var(--text-secondary)' }}>{estadoLabels[estado] || estado}</span>
                        <span className="font-semibold" style={{ color: estadoColors[estado] || 'var(--text-primary)' }}>{count}</span>
                      </div>
                      <div className="h-2 rounded-full" style={{ background: 'var(--bg-input)' }}>
                        <div className="h-2 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, background: estadoColors[estado] || 'var(--accent-primary)' }} />
                      </div>
                    </div>
                  );
                })}
                {data.turnosPorEstado.length === 0 && <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Sin datos</p>}
              </div>
            </div>

            {/* Turnos por médico */}
            <div className="glass-card p-6">
              <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Turnos por Médico</h3>
              <div className="space-y-3">
                {data.turnosPorMedico.map(([medico, count], i) => {
                  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];
                  const pct = data.totalTurnos > 0 ? (count / data.totalTurnos) * 100 : 0;
                  return (
                    <div key={medico}>
                      <div className="flex justify-between text-sm mb-1">
                        <span style={{ color: 'var(--text-secondary)' }}>{medico}</span>
                        <span className="font-semibold" style={{ color: colors[i % colors.length] }}>{count}</span>
                      </div>
                      <div className="h-2 rounded-full" style={{ background: 'var(--bg-input)' }}>
                        <div className="h-2 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, background: colors[i % colors.length] }} />
                      </div>
                    </div>
                  );
                })}
                {data.turnosPorMedico.length === 0 && <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Sin datos</p>}
              </div>
            </div>

            {/* Turnos por especialidad */}
            <div className="glass-card p-6 lg:col-span-2">
              <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Distribución por Especialidad</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {data.turnosPorEspecialidad.map(([esp, count], i) => {
                  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];
                  const pct = data.totalTurnos > 0 ? Math.round((count / data.totalTurnos) * 100) : 0;
                  return (
                    <div key={esp} className="p-4 rounded-xl text-center" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-primary)' }}>
                      <div className="text-2xl font-bold" style={{ color: colors[i % colors.length] }}>{count}</div>
                      <div className="text-sm font-medium mt-1" style={{ color: 'var(--text-primary)' }}>{esp}</div>
                      <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{pct}% del total</div>
                    </div>
                  );
                })}
                {data.turnosPorEspecialidad.length === 0 && <p className="text-sm col-span-4 text-center py-8" style={{ color: 'var(--text-muted)' }}>Sin datos</p>}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
