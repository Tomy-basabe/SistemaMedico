'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { IconPlus, IconUser, IconX } from '@/components/ui/Icons';
import { createUserServer } from '@/app/actions/users';

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState([]);
  const [especialidades, setEspecialidades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [adminDomain, setAdminDomain] = useState('');
  const [form, setForm] = useState({
    username: '', password: '', nombre: '', apellido: '',
    rol: 'secretaria', especialidad: '', matricula: '',
  });
  const supabase = createClient();

  useEffect(() => {
    fetchData();

    const channel = supabase.channel('realtime:profiles')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchData() {
    setLoading(true);
    
    // Obtener el dominio del admin actual
    const { data: { user } } = await supabase.auth.getUser();
    let currentDomain = '';
    if (user && user.email) {
      const parts = user.email.split('@');
      if (parts.length === 2) {
        currentDomain = '@' + parts[1];
        setAdminDomain(currentDomain);
      }
    }

    const [usuariosRes, especialidadesRes] = await Promise.all([
      supabase.from('profiles').select('*').order('rol').order('apellido'),
      supabase.from('especialidades').select('*').eq('activa', true).order('nombre')
    ]);
    
    let filteredUsuarios = usuariosRes.data || [];
    if (currentDomain) {
      filteredUsuarios = filteredUsuarios.filter(u => u.email && u.email.endsWith(currentDomain));
    }

    setUsuarios(filteredUsuarios);
    setEspecialidades(especialidadesRes.data || []);
    setLoading(false);
  }

  async function fetchUsuarios() {
    const { data } = await supabase.from('profiles').select('*').order('rol').order('apellido');
    let filteredUsuarios = data || [];
    if (adminDomain) {
      filteredUsuarios = filteredUsuarios.filter(u => u.email && u.email.endsWith(adminDomain));
    }
    setUsuarios(filteredUsuarios);
  }

  async function handleCreateUser(e) {
    e.preventDefault();
    setCreating(true);
    setError('');
    setSuccess('');

    try {
      const fullEmail = `${form.username}${adminDomain}`;
      
      const response = await createUserServer({
        email: fullEmail,
        password: form.password,
        nombre: form.nombre,
        apellido: form.apellido,
        rol: form.rol,
        especialidad: form.especialidad,
        matricula: form.matricula
      });

      if (!response.success) {
        throw new Error(response.error);
      }

      setSuccess(`Usuario ${fullEmail} creado exitosamente`);
      setShowModal(false);
      setForm({ username: '', password: '', nombre: '', apellido: '', rol: 'secretaria', especialidad: '', matricula: '' });
      setTimeout(() => fetchUsuarios(), 1000);
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  const rolColors = {
    admin: { bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', label: 'Admin' },
    secretaria: { bg: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', label: 'Secretaria' },
    medico: { bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981', label: 'Médico' },
  };

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Gestión de Usuarios</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Creá y administrá las cuentas del sistema</p>
        </div>
        <button onClick={() => { setShowModal(true); setError(''); setSuccess(''); }} className="btn-primary">
          <IconPlus size={18} /> Nuevo Usuario
        </button>
      </div>

      {success && (
        <div className="mb-4 p-3 rounded-xl text-sm" style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#10b981' }}>
          {success}
        </div>
      )}

      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="loader"><div className="loader-spinner" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr><th>Usuario</th><th>Email</th><th>Rol</th><th>Especialidad</th><th>Matrícula</th><th>Registro</th></tr>
              </thead>
              <tbody>
                {usuarios.map((u, idx) => {
                  const rc = rolColors[u.rol] || rolColors.secretaria;
                  return (
                    <tr key={u.id} style={{ animation: `slideIn 0.3s ease ${idx * 0.04}s both` }}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold"
                            style={{ background: rc.bg, color: rc.color }}>
                            {u.nombre?.charAt(0)}{u.apellido?.charAt(0)}
                          </div>
                          <span className="font-medium">{u.nombre} {u.apellido}</span>
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>{u.email}</td>
                      <td>
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: rc.bg, color: rc.color }}>
                          {rc.label}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>{u.especialidad || '—'}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{u.matricula || '—'}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{new Date(u.created_at).toLocaleDateString('es-AR')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal crear usuario */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Nuevo Usuario</h2>
              <button onClick={() => setShowModal(false)} className="btn-ghost"><IconX size={18} /></button>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-xl text-sm" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="input-label">Nombre</label>
                  <input type="text" className="input-field" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
                </div>
                <div>
                  <label className="input-label">Apellido</label>
                  <input type="text" className="input-field" value={form.apellido} onChange={(e) => setForm({ ...form, apellido: e.target.value })} required />
                </div>
              </div>
              <div>
                <label className="input-label">Email</label>
                <div className="flex items-center gap-2">
                  <input type="text" className="input-field flex-1" placeholder="usuario" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
                  <div className="px-3 py-2 bg-gray-100 rounded-lg text-gray-600 font-medium whitespace-nowrap dark:bg-gray-800 dark:text-gray-400">
                    {adminDomain}
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">Los usuarios creados deben pertenecer a su misma organización ({adminDomain}).</p>
              </div>
              <div>
                <label className="input-label">Contraseña</label>
                <input type="password" className="input-field" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} />
              </div>
              <div>
                <label className="input-label">Rol</label>
                <select className="select-field" value={form.rol} onChange={(e) => setForm({ ...form, rol: e.target.value })}>
                  <option value="secretaria">Secretaria</option>
                  <option value="medico">Médico</option>
                  {/* Removida la opción de Admin, solo el SuperAdmin crea Admins */}
                </select>
              </div>
              {form.rol === 'medico' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="input-label">Especialidad</label>
                    <select className="select-field" value={form.especialidad} onChange={(e) => setForm({ ...form, especialidad: e.target.value })} required>
                      <option value="">Seleccionar...</option>
                      {especialidades.map((e) => <option key={e.id} value={e.nombre}>{e.nombre}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="input-label">Matrícula</label>
                    <input type="text" className="input-field" placeholder="MP-12345" value={form.matricula} onChange={(e) => setForm({ ...form, matricula: e.target.value })} required />
                  </div>
                </div>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancelar</button>
                <button type="submit" className="btn-primary" disabled={creating}>
                  {creating ? <div className="loader-spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }} /> : 'Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
