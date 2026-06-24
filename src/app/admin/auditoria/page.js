'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { IconHistory, IconFilter } from '@/components/ui/Icons';

export default function AuditoriaPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ tabla: '', accion: '', usuario: '', desde: '', hasta: '', texto: '' });
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const pageSize = 25;
  const supabase = createClient();

  useEffect(() => {
    fetchLogs();
  }, [page, filters]);

  async function fetchLogs() {
    setLoading(true);
    let query = supabase
      .from('audit_log')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (filters.tabla) query = query.eq('tabla', filters.tabla);
    if (filters.accion) query = query.eq('accion', filters.accion);
    if (filters.desde) query = query.gte('created_at', filters.desde + 'T00:00:00');
    if (filters.hasta) query = query.lte('created_at', filters.hasta + 'T23:59:59');
    if (filters.texto) query = query.ilike('descripcion', `%${filters.texto}%`);

    const { data, count } = await query;
    setLogs(data || []);
    setTotalCount(count || 0);
    setLoading(false);
  }

  const accionConfig = {
    INSERT: { bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981', label: 'Creación' },
    UPDATE: { bg: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', label: 'Modificación' },
    DELETE: { bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', label: 'Eliminación' },
  };

  const tablaLabels = {
    pacientes: 'Pacientes',
    turnos: 'Turnos',
    evoluciones: 'Evoluciones',
    recetas: 'Recetas',
    disponibilidad: 'Disponibilidad',
    profiles: 'Usuarios',
    obras_sociales: 'Mutuales',
    medico_obras_sociales: 'Mutuales de Médico',
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      <div className="mb-8">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Historial de Auditoría</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Registro completo de todas las acciones realizadas en el sistema</p>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <IconFilter size={16} color="var(--text-muted)" />
          <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Filtros</span>
        </div>
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="input-label">Buscar en descripción</label>
            <input type="text" className="input-field" placeholder="Ej: OSEP, OSDE..." style={{ width: '200px' }} value={filters.texto}
              onChange={(e) => { setFilters({ ...filters, texto: e.target.value }); setPage(0); }} />
          </div>
          <div>
            <label className="input-label">Tabla</label>
            <select className="select-field" style={{ width: '160px' }} value={filters.tabla}
              onChange={(e) => { setFilters({ ...filters, tabla: e.target.value }); setPage(0); }}>
              <option value="">Todas</option>
              {Object.entries(tablaLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="input-label">Acción</label>
            <select className="select-field" style={{ width: '160px' }} value={filters.accion}
              onChange={(e) => { setFilters({ ...filters, accion: e.target.value }); setPage(0); }}>
              <option value="">Todas</option>
              <option value="INSERT">Creación</option>
              <option value="UPDATE">Modificación</option>
              <option value="DELETE">Eliminación</option>
            </select>
          </div>
          <div>
            <label className="input-label">Desde</label>
            <input type="date" className="input-field" style={{ width: '160px' }} value={filters.desde}
              onChange={(e) => { setFilters({ ...filters, desde: e.target.value }); setPage(0); }} />
          </div>
          <div>
            <label className="input-label">Hasta</label>
            <input type="date" className="input-field" style={{ width: '160px' }} value={filters.hasta}
              onChange={(e) => { setFilters({ ...filters, hasta: e.target.value }); setPage(0); }} />
          </div>
          <div className="flex items-end">
            <button className="btn-ghost text-sm" onClick={() => { setFilters({ tabla: '', accion: '', usuario: '', desde: '', hasta: '', texto: '' }); setPage(0); }}>
              Limpiar
            </button>
          </div>
        </div>
      </div>

      {/* Results count */}
      <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
        {totalCount} registros encontrados {totalPages > 1 && `— Página ${page + 1} de ${totalPages}`}
      </p>

      {/* Logs */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="loader"><div className="loader-spinner" /></div>
        ) : logs.length === 0 ? (
          <div className="text-center py-16">
            <div className="flex justify-center mb-3"><IconHistory size={40} color="var(--text-muted)" /></div>
            <p className="text-lg font-medium" style={{ color: 'var(--text-secondary)' }}>Sin registros de auditoría</p>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Las acciones se registran automáticamente</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr><th>Fecha/Hora</th><th>Usuario</th><th>Acción</th><th>Sección</th><th>Descripción</th></tr>
              </thead>
              <tbody>
                {logs.map((log, idx) => {
                  const ac = accionConfig[log.accion] || accionConfig.INSERT;
                  return (
                    <tr key={log.id} style={{ animation: `slideIn 0.3s ease ${idx * 0.03}s both` }}>
                      <td>
                        <div>
                          <span className="font-mono text-sm" style={{ color: 'var(--accent-primary)' }}>
                            {new Date(log.created_at).toLocaleDateString('es-AR')}
                          </span>
                          <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                            {new Date(log.created_at).toLocaleTimeString('es-AR')}
                          </p>
                        </div>
                      </td>
                      <td>
                        <div className="font-medium">{log.usuario_nombre || 'Sistema'}</div>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{log.usuario_email}</p>
                      </td>
                      <td>
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: ac.bg, color: ac.color }}>
                          {ac.label}
                        </span>
                      </td>
                      <td>
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(100, 116, 139, 0.1)', color: 'var(--text-secondary)' }}>
                          {tablaLabels[log.tabla] || log.tabla}
                        </span>
                      </td>
                      <td>
                        <p className="text-sm max-w-md" style={{ color: 'var(--text-primary)' }}>{log.descripcion}</p>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 p-4" style={{ borderTop: '1px solid var(--border-primary)' }}>
            <button className="btn-ghost text-sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
              Anterior
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const pageNum = page < 3 ? i : page - 2 + i;
              if (pageNum >= totalPages) return null;
              return (
                <button key={pageNum} onClick={() => setPage(pageNum)}
                  className="w-8 h-8 rounded-lg text-sm font-medium transition-all"
                  style={{
                    background: page === pageNum ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                    color: page === pageNum ? 'var(--accent-primary)' : 'var(--text-muted)',
                  }}>
                  {pageNum + 1}
                </button>
              );
            })}
            <button className="btn-ghost text-sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
              Siguiente
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
