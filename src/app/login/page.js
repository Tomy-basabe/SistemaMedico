'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { IconShield, IconMonitor, IconStethoscope } from '@/components/ui/Icons';

export default function LoginPage() {
  const [step, setStep] = useState('role'); // 'role' → 'credentials'
  const [selectedRole, setSelectedRole] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const supabase = createClient();

  const roles = [
    {
      value: 'admin',
      label: 'Administración',
      description: 'Panel de gestión y auditoría',
      icon: <IconShield size={24} color="white" />,
      gradient: 'linear-gradient(135deg, #0f172a, #334155)',
    },
    {
      value: 'secretaria',
      label: 'Secretaría',
      description: 'Gestión de turnos y pacientes',
      icon: <IconMonitor size={24} color="white" />,
      gradient: 'linear-gradient(135deg, #0284c7, #0ea5e9)',
    },
    {
      value: 'medico',
      label: 'Médico',
      description: 'Consultas e historia clínica',
      icon: <IconStethoscope size={24} color="white" />,
      gradient: 'linear-gradient(135deg, #059669, #10b981)',
    },
  ];

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      // Verificar que el rol del usuario coincida con el seleccionado
      const { data: profile } = await supabase
        .from('profiles')
        .select('rol')
        .eq('id', data.user.id)
        .single();

      if (!profile) {
        await supabase.auth.signOut();
        throw new Error('No se encontró el perfil del usuario.');
      }

      // Admin puede entrar a cualquier módulo; otros deben coincidir
      if (profile.rol !== 'admin' && profile.rol !== selectedRole) {
        await supabase.auth.signOut();
        throw new Error(
          `Tu cuenta no tiene acceso al módulo de ${selectedRole === 'medico' ? 'Médico' : 'Secretaría'}. Contactá al administrador.`
        );
      }

      // Redirigir según el rol seleccionado (admin tiene su propio panel)
      if (profile.rol === 'admin') {
        if (selectedRole === 'admin') {
          router.push('/admin');
        } else {
          // Admin accediendo como secretaria o médico
          router.push(`/${selectedRole}`);
        }
      } else {
        router.push(`/${profile.rol}`);
      }
    } catch (err) {
      console.error('Error de login:', err);
      const msg = err?.message || (typeof err === 'object' ? JSON.stringify(err) : String(err));
      setError(
        msg === 'Invalid login credentials' || msg.includes('Invalid login credentials')
          ? 'Credenciales inválidas. Verificá tu email y contraseña.'
          : msg
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'var(--bg-primary)' }}
    >
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-10 blur-3xl"
          style={{ background: 'var(--accent-primary)' }}
        />
        <div
          className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full opacity-8 blur-3xl"
          style={{ background: 'var(--accent-secondary)' }}
        />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{ background: 'var(--accent-gradient)' }}
          >
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold gradient-text mb-2">MediCenter</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Sistema de Gestión Médica</p>
        </div>

        {/* Card */}
        <div className="glass-card p-8">
          {step === 'role' ? (
            <>
              <h2
                className="text-xl font-semibold mb-2"
                style={{ color: 'var(--text-primary)' }}
              >
                ¿Cómo querés ingresar?
              </h2>
              <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
                Seleccioná tu rol para acceder al sistema
              </p>

              <div className="space-y-3">
                {roles.map((role) => (
                  <button
                    key={role.value}
                    onClick={() => {
                      setSelectedRole(role.value);
                      setStep('credentials');
                      setError('');
                    }}
                    className="w-full flex items-center gap-4 p-4 rounded-xl text-left transition-all duration-200"
                    style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-primary)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.4)';
                      e.currentTarget.style.transform = 'translateX(4px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border-primary)';
                      e.currentTarget.style.transform = 'translateX(0)';
                    }}
                  >
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                      style={{ background: role.gradient }}
                    >
                      {role.icon}
                    </div>
                    <div>
                      <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {role.label}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {role.description}
                      </p>
                    </div>
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="ml-auto flex-shrink-0"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              {/* Back button + role indicator */}
              <div className="flex items-center gap-3 mb-6">
                <button
                  onClick={() => {
                    setStep('role');
                    setError('');
                    setEmail('');
                    setPassword('');
                  }}
                  className="btn-ghost p-2"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                </button>
                <div>
                  <h2
                    className="text-lg font-semibold"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    Iniciar sesión
                  </h2>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Ingresando como{' '}
                    <span
                      className="font-semibold px-2 py-0.5 rounded-full"
                      style={{
                        background:
                          selectedRole === 'admin'
                            ? 'rgba(15, 23, 42, 0.1)'
                            : selectedRole === 'medico'
                            ? 'rgba(5, 150, 105, 0.15)'
                            : 'rgba(2, 132, 199, 0.15)',
                        color:
                          selectedRole === 'admin'
                            ? '#0f172a'
                            : selectedRole === 'medico'
                            ? '#059669'
                            : '#0284c7',
                      }}
                    >
                      {selectedRole === 'admin'
                        ? 'Administración'
                        : selectedRole === 'medico'
                        ? 'Médico'
                        : 'Secretaría'}
                    </span>
                  </p>
                </div>
              </div>

              {error && (
                <div
                  className="mb-4 p-3 rounded-xl text-sm flex items-start gap-2"
                  style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#ef4444',
                  }}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="flex-shrink-0 mt-0.5"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="15" y1="9" x2="9" y2="15" />
                    <line x1="9" y1="9" x2="15" y2="15" />
                  </svg>
                  {error}
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="input-label">Email</label>
                  <input
                    id="email"
                    type="email"
                    className="input-field"
                    placeholder="tu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                  />
                </div>

                <div>
                  <label className="input-label">Contraseña</label>
                  <input
                    id="password"
                    type="password"
                    className="input-field"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={3}
                  />
                </div>

                <button
                  type="submit"
                  className="btn-primary w-full justify-center"
                  disabled={loading}
                  style={{ marginTop: '24px' }}
                >
                  {loading ? (
                    <div
                      className="loader-spinner"
                      style={{ width: '20px', height: '20px', borderWidth: '2px' }}
                    />
                  ) : (
                    'Iniciar sesión'
                  )}
                </button>
              </form>

              <p
                className="text-center mt-4 text-xs"
                style={{ color: 'var(--text-muted)' }}
              >
                Las cuentas son creadas por el administrador del sistema
              </p>
            </>
          )}
        </div>

        <p
          className="text-center mt-6 text-xs"
          style={{ color: 'var(--text-muted)' }}
        >
          © 2026 MediCenter — Sistema de Gestión Médica
        </p>
      </div>
    </div>
  );
}
