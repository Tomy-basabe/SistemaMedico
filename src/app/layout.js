import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'StackHard — Sistema de Gestión Médica',
  description: 'Sistema integral de gestión para centros médicos. Gestión de turnos, historia clínica electrónica, y administración de pacientes.',
  manifest: '/manifest.json',
  themeColor: '#0f172a',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'StackHard',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className="light">
      <head>
        <link rel="apple-touch-icon" href="/logo-icon.png" />
      </head>
      <body className={inter.className}>
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js');
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
