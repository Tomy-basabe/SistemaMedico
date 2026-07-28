'use client';

import Sidebar from '@/components/ui/Sidebar';

const superadminLinks = [
  {
    href: '/superadmin',
    label: 'Dashboard',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
      </svg>
    ),
  },
];

export default function SuperAdminLayout({ children }) {
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <Sidebar links={superadminLinks} role="superadmin" />
      <main
        className="main-content min-h-screen transition-all duration-300"
        style={{ marginLeft: 'var(--sidebar-width)', padding: '24px 32px' }}
      >
        {children}
      </main>
    </div>
  );
}
