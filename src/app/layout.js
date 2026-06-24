import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'MediCenter — Sistema de Gestión Médica',
  description:
    'Sistema integral de gestión para centros médicos. Gestión de turnos, historia clínica electrónica, y administración de pacientes.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
