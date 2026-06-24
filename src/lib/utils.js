/**
 * Formatea una fecha para mostrar en español
 */
export function formatDate(date) {
  return new Date(date).toLocaleDateString('es-AR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Formatea una hora en formato HH:MM
 */
export function formatTime(time) {
  if (!time) return '';
  return time.slice(0, 5);
}

/**
 * Genera un mensaje de WhatsApp predeterminado para confirmar turno
 */
export function generateWhatsAppLink(paciente, turno, medico) {
  const fecha = formatDate(turno.fecha);
  const hora = formatTime(turno.hora);
  const message = encodeURIComponent(
    `Hola ${paciente.nombre}, te confirmamos tu turno para el día ${fecha} a las ${hora} hs con ${medico.especialidad} Dr/a. ${medico.nombre} ${medico.apellido}. Por favor, llegá 10 minutos antes. ¡Te esperamos!`
  );
  const phone = paciente.telefono ? paciente.telefono.replace(/\D/g, '') : '';
  return `https://wa.me/${phone}?text=${message}`;
}

/**
 * Colores de los estados de turno
 */
export const ESTADO_CONFIG = {
  pendiente: {
    label: 'Pendiente',
    color: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    dot: 'bg-amber-400',
  },
  confirmado: {
    label: 'Confirmado',
    color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    dot: 'bg-blue-400',
  },
  en_sala: {
    label: 'En sala de espera',
    color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    dot: 'bg-emerald-400 animate-pulse',
  },
  atendido: {
    label: 'Atendido',
    color: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    dot: 'bg-slate-400',
  },
  cancelado: {
    label: 'Cancelado',
    color: 'bg-red-500/20 text-red-400 border-red-500/30',
    dot: 'bg-red-400',
  },
};

/**
 * Lista de especialidades disponibles
 */
export const ESPECIALIDADES = ['Cardiólogo', 'Pediatra', 'Clínico', 'Ecografista'];

/**
 * Días de la semana
 */
export const DIAS_SEMANA = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
];

/**
 * Genera los slots de tiempo disponibles para un día según la disponibilidad del médico
 */
export function generateTimeSlots(disponibilidad) {
  const slots = [];
  if (!disponibilidad) return slots;

  const [startH, startM] = disponibilidad.hora_inicio.split(':').map(Number);
  const [endH, endM] = disponibilidad.hora_fin.split(':').map(Number);
  const duration = disponibilidad.duracion_turno || 30;

  let currentMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  while (currentMinutes + duration <= endMinutes) {
    const hours = Math.floor(currentMinutes / 60);
    const minutes = currentMinutes % 60;
    slots.push(
      `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
    );
    currentMinutes += duration;
  }

  return slots;
}
