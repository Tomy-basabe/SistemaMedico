'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function Sidebar({ links, role }) {
  const pathname = usePathname();
  const { profile, signOut, loading } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const roleConfig = {
    secretaria: {
      title: 'Secretaría',
      gradient: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
      ),
    },
    medico: {
      title: 'Médico',
      gradient: 'linear-gradient(135deg, #10b981, #06b6d4)',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
      ),
    },
    admin: {
      title: 'Administración',
      gradient: 'linear-gradient(135deg, #f59e0b, #ef4444)',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ),
    },
  };

  const config = roleConfig[role];

  return (
    <>
      {/* Mobile top bar */}
      <div className="mobile-topbar">
        <button
          onClick={() => setMobileOpen(true)}
          className="hamburger-btn"
          aria-label="Abrir menú"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
            style={{ background: config.gradient }}
          >
            {config.icon}
          </div>
          <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
            MediCenter
          </span>
        </div>
        <span
          className="text-xs font-medium px-2 py-1 rounded-full"
          style={{
            background: 'rgba(59, 130, 246, 0.15)',
            color: 'var(--accent-primary)',
          }}
        >
          {config.title}
        </span>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`sidebar-container ${mobileOpen ? 'sidebar-open' : ''}`}
      >
        {/* Close button (mobile only) */}
        <button
          onClick={() => setMobileOpen(false)}
          className="sidebar-close-btn"
          aria-label="Cerrar menú"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Header */}
        <div className="p-6 pb-4">
          <div className="flex items-center gap-3 mb-1">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
              style={{ background: config.gradient }}
            >
              {config.icon}
            </div>
            <div>
              <h2 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
                MediCenter
              </h2>
              <span
                className="text-xs font-medium px-2 py-0.5 rounded-full"
                style={{
                  background: 'rgba(59, 130, 246, 0.15)',
                  color: 'var(--accent-primary)',
                }}
              >
                {config.title}
              </span>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="mx-4" style={{ height: '1px', background: 'var(--border-primary)' }} />

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {links.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`sidebar-link ${isActive ? 'active' : ''}`}
              >
                <span className="flex-shrink-0">{link.icon}</span>
                <span>{link.label}</span>
                {link.badge && (
                  <span
                    className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{
                      background: 'rgba(239, 68, 68, 0.2)',
                      color: '#ef4444',
                    }}
                  >
                    {link.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User profile */}
        <div
          className="p-4"
          style={{ borderTop: '1px solid var(--border-primary)' }}
        >
          {!loading && profile && (
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white"
                style={{ background: config.gradient }}
              >
                {profile.nombre?.charAt(0)}{profile.apellido?.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                  {profile.nombre} {profile.apellido}
                </p>
                <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                  {profile.especialidad || 'Secretaría'}
                </p>
              </div>
            </div>
          )}
          <button
            onClick={signOut}
            className="btn-ghost w-full justify-center text-sm"
            style={{ color: 'var(--danger)' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  );
}
