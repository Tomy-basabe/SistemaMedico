'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { IconPlus, IconX } from '@/components/ui/Icons';
import { createUserServer } from '@/app/actions/users';

export default function SuperAdminPage() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({
    email: '', password: '', nombre: '', apellido: ''
  });
  const supabase = createClient();

  useEffect(() => {
    fetchAdmins();
  }, []);

  async function fetchAdmins() {
    setLoading(true);
    const { data } = await supabase.from('profiles').select('*').eq('rol', 'admin').order('apellido');
    setAdmins(data || []);
    setLoading(false);
  }

  async function handleCreateAdmin(e) {
    e.preventDefault();
    setCreating(true);
    setError('');
    setSuccess('');

    try {
      const response = await createUserServer({
        email: form.email,
        password: form.password,
        nombre: form.nombre,
        apellido: form.apellido,
        rol: 'admin'
      });

      if (!response.success) {
        throw new Error(response.error);
      }

      setSuccess(`Administrador ${form.email} creado exitosamente`);
      setShowModal(false);
      setForm({ email: '', password: '', nombre: '', apellido: '' });
      setTimeout(() => fetchAdmins(), 1000);
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Panel de SuperAdmin</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Gestión de Administradores del Sistema</p>
        </div>
        <button onClick={() => { setShowModal(true); setError(''); setSuccess(''); }} className="btn-primary">
          <IconPlus size={18} /> Nuevo Administrador
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
                <tr><th>Administrador</th><th>Email (Dominio)</th><th>Registro</th></tr>
              </thead>
              <tbody>
                {admins.map((u, idx) => (
                  <tr key={u.id} style={{ animation: `slideIn 0.3s ease ${idx * 0.04}s both` }}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold"
                          style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
                          {u.nombre?.charAt(0)}{u.apellido?.charAt(0)}
                        </div>
                        <span className="font-medium">{u.nombre} {u.apellido}</span>
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>{u.email}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{new Date(u.created_at).toLocaleDateString('es-AR')}</td>
                  </tr>
                ))}
                {admins.length === 0 && (
                  <tr>
                    <td colSpan="3" className="text-center py-4 text-gray-500">No hay administradores registrados.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Nuevo Administrador</h2>
              <button onClick={() => setShowModal(false)} className="btn-ghost"><IconX size={18} /></button>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-xl text-sm" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleCreateAdmin} className="space-y-4">
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
                <label className="input-label">Email Completo</label>
                <input type="email" className="input-field" placeholder="ejemplo@midominio.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                <p className="text-xs text-gray-500 mt-1">Este correo definirá el dominio (@midominio.com) permitido para los usuarios que este admin cree.</p>
              </div>
              <div>
                <label className="input-label">Contraseña</label>
                <input type="password" className="input-field" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancelar</button>
                <button type="submit" className="btn-primary" disabled={creating}>
                  {creating ? <div className="loader-spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }} /> : 'Crear Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
