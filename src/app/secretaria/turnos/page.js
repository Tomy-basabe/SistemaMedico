'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ESTADO_CONFIG, formatTime, generateWhatsAppLink } from '@/lib/utils';

export default function TurnosPage() {
  const [turnos, setTurnos] = useState([]);
  const [medicos, setMedicos] = useState([]);
  const [obrasSociales, setObrasSociales] = useState([]);
  const [especialidades, setEspecialidades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterEspecialidad, setFilterEspecialidad] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [diasDisponibles, setDiasDisponibles] = useState([]);
  const [form, setForm] = useState({
    dni: '', nombre: '', apellido: '', telefono: '', email: '',
    obra_social_id: '', medico_id: '', fecha: '', hora: '', notas: '',
  });
  const [pacienteExistente, setPacienteExistente] = useState(null);
  const [matchingPacientes, setMatchingPacientes] = useState([]);
  const [searchingDni, setSearchingDni] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    fetchEspecialidades();
  }, []);

  async function fetchEspecialidades() {
    const { data } = await supabase.from('especialidades').select('*').eq('activa', true).order('nombre');
    setEspecialidades(data || []);
  }

  useEffect(() => {
    fetchTurnos();
    fetchMedicos();
    fetchObrasSociales();
  }, [selectedDate, filterEspecialidad, filterEstado]);

  async function fetchTurnos() {
    setLoading(true);
    try {
      let query = supabase
        .from('turnos')
        .select(`*, paciente:pacientes(*, obra_social:obras_sociales(*)), medico:profiles(*)`)
        .eq('fecha', selectedDate)
        .order('hora', { ascending: true });

      if (filterEstado) query = query.eq('estado', filterEstado);

      const { data, error } = await query;
      if (error) throw error;

      let filtered = data || [];
      if (filterEspecialidad) {
        filtered = filtered.filter((t) => t.medico?.especialidad === filterEspecialidad);
      }
      setTurnos(filtered);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchMedicos() {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('rol', 'medico')
      .order('apellido');
    setMedicos(data || []);
  }

  async function fetchObrasSociales() {
    const { data } = await supabase
      .from('obras_sociales')
      .select('*')
      .eq('activa', true)
      .order('nombre');
    setObrasSociales(data || []);
  }

  async function buscarPacientePorDni(dni) {
    if (dni.length < 1) {
      setMatchingPacientes([]);
      return;
    }
    setSearchingDni(true);
    const { data } = await supabase
      .from('pacientes')
      .select('*')
      .ilike('dni', `%${dni}%`)
      .limit(5);

    setMatchingPacientes(data || []);
    setSearchingDni(false);
  }

  function seleccionarPaciente(paciente) {
    setPacienteExistente(paciente);
    setForm((prev) => ({
      ...prev,
      dni: paciente.dni,
      nombre: paciente.nombre,
      apellido: paciente.apellido,
      telefono: paciente.telefono || '',
      email: paciente.email || '',
      obra_social_id: paciente.obra_social_id || '',
    }));
    setMatchingPacientes([]);
  }

  async function fetchDisponibilidadEspecialidad(especialidadNombre) {
    if (!especialidadNombre) {
      setDiasDisponibles([]);
      return;
    }

    const medicosEsp = medicos.filter(m => m.especialidad === especialidadNombre);
    if (medicosEsp.length === 0) {
      setDiasDisponibles([]);
      return;
    }

    const medicosIds = medicosEsp.map(m => m.id);

    // 1. Obtener disponibilidad semanal de todos los médicos de la especialidad
    const { data: dispoAll } = await supabase
      .from('disponibilidad')
      .select('*')
      .in('medico_id', medicosIds)
      .eq('activa', true);

    if (!dispoAll || dispoAll.length === 0) {
      setDiasDisponibles([]);
      return;
    }

    // 2. Generar próximos 14 días
    const today = new Date();
    const next14Days = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      next14Days.push(d);
    }

    // 3. Filtrar días donde algún médico trabaje
    const workDays = next14Days.filter(d => 
      dispoAll.some(disp => disp.dia_semana === d.getDay())
    );

    if (workDays.length === 0) {
      setDiasDisponibles([]);
      return;
    }

    // 4. Traer turnos existentes
    const startDate = workDays[0].toISOString().split('T')[0];
    const endDate = workDays[workDays.length - 1].toISOString().split('T')[0];

    const { data: turnosExistentes } = await supabase
      .from('turnos')
      .select('fecha, hora, medico_id')
      .in('medico_id', medicosIds)
      .gte('fecha', startDate)
      .lte('fecha', endDate)
      .neq('estado', 'cancelado');

    // 5. Construir slots unificados por día
    const slotsList = [];

    workDays.forEach(date => {
      const dateStr = date.toISOString().split('T')[0];
      const dayOfWeek = date.getDay();
      
      const isToday = dateStr === new Date().toISOString().split('T')[0];
      const nowH = new Date().getHours();
      const nowM = new Date().getMinutes();
      const nowMinutes = nowH * 60 + nowM;

      const slotsForDay = new Map();

      medicosEsp.forEach(medico => {
        const dailyDispo = dispoAll.find(d => d.medico_id === medico.id && d.dia_semana === dayOfWeek);
        if (!dailyDispo) return;

        const horasOcupadas = (turnosExistentes || [])
          .filter(t => t.fecha === dateStr && t.medico_id === medico.id)
          .map(t => t.hora.slice(0, 5));

        const [startH, startM] = dailyDispo.hora_inicio.split(':').map(Number);
        const [endH, endM] = dailyDispo.hora_fin.split(':').map(Number);
        const duration = dailyDispo.duracion_turno || 30;
        
        let current = startH * 60 + startM;
        const end = endH * 60 + endM;

        while (current + duration <= end) {
          if (!isToday || current > nowMinutes) {
            const h = Math.floor(current / 60).toString().padStart(2, '0');
            const m = (current % 60).toString().padStart(2, '0');
            const slotTime = `${h}:${m}`;
            
            if (!horasOcupadas.includes(slotTime)) {
              if (!slotsForDay.has(slotTime)) {
                slotsForDay.set(slotTime, {
                  hora: slotTime,
                  medico_id: medico.id,
                  medico_nombre: `Dr/a. ${medico.nombre} ${medico.apellido}`
                });
              }
            }
          }
          current += duration;
        }
      });

      if (slotsForDay.size > 0) {
        const sortedSlots = Array.from(slotsForDay.values()).sort((a, b) => a.hora.localeCompare(b.hora));
        slotsList.push({
          dateStr,
          dateObj: date,
          slots: sortedSlots
        });
      }
    });

    setDiasDisponibles(slotsList);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      let pacienteId = pacienteExistente?.id;

      // Crear paciente si no existe
      if (!pacienteId) {
        const { data: nuevoPaciente, error: pacienteError } = await supabase
          .from('pacientes')
          .insert({
            dni: form.dni,
            nombre: form.nombre,
            apellido: form.apellido,
            telefono: form.telefono || null,
            email: form.email || null,
            obra_social_id: form.obra_social_id || null,
          })
          .select()
          .single();

        if (pacienteError) throw pacienteError;
        pacienteId = nuevoPaciente.id;
      }

      // Crear turno
      if (!form.fecha || !form.hora) throw new Error('Debe seleccionar una fecha y hora');
      
      const { error: turnoError } = await supabase.from('turnos').insert({
        paciente_id: pacienteId,
        medico_id: form.medico_id,
        fecha: form.fecha,
        hora: form.hora + ':00',
        notas: form.notas || null,
      });

      if (turnoError) throw turnoError;

      setShowModal(false);
      resetForm();
      fetchTurnos();
    } catch (error) {
      console.error('Error creating turno:', error);
      alert('Error al crear el turno: ' + error.message);
    }
  }

  function resetForm() {
    setForm({
      dni: '', nombre: '', apellido: '', telefono: '', email: '',
      obra_social_id: '', medico_id: '', fecha: '', hora: '', notas: '',
    });
    setPacienteExistente(null);
    setMatchingPacientes([]);
    setDiasDisponibles([]);
  }

  async function updateEstado(turnoId, estado) {
    await supabase.from('turnos').update({ estado }).eq('id', turnoId);
    fetchTurnos();
  }

  // Ya no filtramos los médicos para mostrarlos, pero si se necesita en otro lado, se mantiene.
  // const medicosFiltrados = filterEspecialidad
  //   ? medicos.filter((m) => m.especialidad === filterEspecialidad)
  //   : medicos;

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Gestión de Turnos
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Administrá y asigná turnos a los pacientes
          </p>
        </div>
        <button onClick={() => { resetForm(); setShowModal(true); }} className="btn-primary">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Nuevo Turno
        </button>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="input-label">Fecha</label>
            <input
              type="date"
              className="input-field"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{ width: '180px' }}
            />
          </div>
          <div>
            <label className="input-label">Especialidad</label>
            <select
              className="select-field"
              value={filterEspecialidad}
              onChange={(e) => setFilterEspecialidad(e.target.value)}
              style={{ width: '180px' }}
            >
              <option value="">Todas</option>
              {especialidades.map((e) => (
                <option key={e.id} value={e.nombre}>{e.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="input-label">Estado</label>
            <select
              className="select-field"
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
              style={{ width: '180px' }}
            >
              <option value="">Todos</option>
              {Object.entries(ESTADO_CONFIG).map(([key, val]) => (
                <option key={key} value={key}>{val.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="loader"><div className="loader-spinner" /></div>
        ) : turnos.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">📋</div>
            <p className="text-lg font-medium" style={{ color: 'var(--text-secondary)' }}>
              No hay turnos para esta fecha
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Hora</th>
                  <th>Paciente</th>
                  <th>DNI</th>
                  <th>Médico</th>
                  <th>Especialidad</th>
                  <th>Obra Social</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {turnos.map((turno, idx) => {
                  const ec = ESTADO_CONFIG[turno.estado];
                  return (
                    <tr key={turno.id} style={{ animation: `slideIn 0.3s ease ${idx * 0.04}s both` }}>
                      <td>
                        <span className="font-mono font-semibold" style={{ color: 'var(--accent-primary)' }}>
                          {formatTime(turno.hora)}
                        </span>
                      </td>
                      <td className="font-medium">{turno.paciente?.nombre} {turno.paciente?.apellido}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{turno.paciente?.dni}</td>
                      <td>Dr/a. {turno.medico?.apellido}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{turno.medico?.especialidad}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{turno.paciente?.obra_social?.nombre || 'Particular'}</td>
                      <td>
                        <span className={`badge ${ec.color}`}>
                          <span className={`badge-dot ${ec.dot}`} />
                          {ec.label}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          {turno.estado === 'pendiente' && (
                            <button onClick={() => updateEstado(turno.id, 'confirmado')} className="btn-ghost text-xs" style={{ color: 'var(--accent-primary)' }}>
                              ✓ Confirmar
                            </button>
                          )}
                          {turno.estado === 'confirmado' && (
                            <button onClick={() => updateEstado(turno.id, 'en_sala')} className="btn-ghost text-xs" style={{ color: 'var(--success)' }}>
                              🏥 En sala
                            </button>
                          )}
                          {turno.estado !== 'atendido' && turno.estado !== 'cancelado' && (
                            <button onClick={() => updateEstado(turno.id, 'cancelado')} className="btn-ghost text-xs" style={{ color: 'var(--danger)' }}>
                              ✕
                            </button>
                          )}
                          {turno.paciente?.telefono && (
                            <a
                              href={generateWhatsAppLink(turno.paciente, turno, turno.medico)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn-whatsapp text-xs py-1 px-2"
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                              </svg>
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Nuevo Turno */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                Nuevo Turno
              </h2>
              <button onClick={() => setShowModal(false)} className="btn-ghost">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* DNI Búsqueda */}
              <div>
                <label className="input-label flex items-center justify-between w-full">
                  <span>DNI del Paciente</span>
                  <span className="text-xs font-normal opacity-70">Escribí para buscar uno existente</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Ej: 12345678"
                    value={form.dni}
                    onChange={(e) => {
                      setForm({ ...form, dni: e.target.value });
                      if (pacienteExistente && pacienteExistente.dni !== e.target.value) {
                        setPacienteExistente(null);
                      }
                      buscarPacientePorDni(e.target.value);
                    }}
                    required
                  />
                  {searchingDni && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <div className="loader-spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }} />
                    </div>
                  )}
                  {/* Dropdown de coincidencias */}
                  {matchingPacientes.length > 0 && !pacienteExistente && (
                    <div className="absolute top-full left-0 right-0 mt-1 border rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-primary)' }}>
                      {matchingPacientes.map(p => (
                        <div 
                          key={p.id} 
                          className="px-4 py-2 cursor-pointer text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          style={{ color: 'var(--text-primary)' }}
                          onClick={() => seleccionarPaciente(p)}
                        >
                          <span className="font-semibold" style={{ color: 'var(--accent-primary)' }}>{p.dni}</span> <span style={{ color: 'var(--text-secondary)' }}>—</span> {p.nombre} {p.apellido}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {pacienteExistente && (
                  <p className="text-xs mt-1" style={{ color: 'var(--success)' }}>
                    ✓ Paciente encontrado: {pacienteExistente.nombre} {pacienteExistente.apellido}
                  </p>
                )}
              </div>

              {/* Datos paciente */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="input-label">Nombre</label>
                  <input
                    type="text"
                    className="input-field"
                    value={form.nombre}
                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                    required
                    disabled={!!pacienteExistente}
                  />
                </div>
                <div>
                  <label className="input-label">Apellido</label>
                  <input
                    type="text"
                    className="input-field"
                    value={form.apellido}
                    onChange={(e) => setForm({ ...form, apellido: e.target.value })}
                    required
                    disabled={!!pacienteExistente}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="input-label">Teléfono (con cód. país)</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="5492614001234"
                    value={form.telefono}
                    onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                    disabled={!!pacienteExistente}
                  />
                </div>
                <div>
                  <label className="input-label">Obra Social</label>
                  <select
                    className="select-field"
                    value={form.obra_social_id}
                    onChange={(e) => setForm({ ...form, obra_social_id: e.target.value })}
                    disabled={!!pacienteExistente}
                  >
                    <option value="">Seleccionar...</option>
                    {obrasSociales.map((os) => (
                      <option key={os.id} value={os.id}>{os.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ height: '1px', background: 'var(--border-primary)', margin: '8px 0' }} />

              {/* Especialidad y Disponibilidad */}
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="input-label">Especialidad</label>
                  <select
                    className="select-field"
                    onChange={(e) => {
                      setForm({ ...form, medico_id: '', hora: '', fecha: '' });
                      setFilterEspecialidad(e.target.value);
                      fetchDisponibilidadEspecialidad(e.target.value);
                    }}
                  >
                    <option value="">Seleccionar especialidad...</option>
                    {especialidades.map((esp) => (
                      <option key={esp.id} value={esp.nombre}>{esp.nombre}</option>
                    ))}
                  </select>
                </div>

                {/* Disponibilidad Visual */}
                {!filterEspecialidad && (
                  <div className="mt-2 border-2 border-dashed rounded-xl p-6 text-center" style={{ borderColor: 'var(--border-primary)', backgroundColor: 'var(--bg-secondary)' }}>
                    <div className="text-2xl mb-2">📅</div>
                    <p className="font-medium" style={{ color: 'var(--text-primary)' }}>Disponibilidad Horaria</p>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Seleccioná una especialidad para ver los horarios disponibles de todos sus médicos.</p>
                  </div>
                )}
                
                {filterEspecialidad && diasDisponibles.length === 0 && (
                  <div className="p-4 text-center text-sm rounded-xl border border-dashed" style={{ borderColor: 'var(--border-primary)', color: 'var(--text-muted)' }}>
                    No hay horarios disponibles en los próximos 14 días para esta especialidad.
                  </div>
                )}
                
                {filterEspecialidad && diasDisponibles.length > 0 && (
                  <div className="mt-2">
                    <label className="input-label mb-2 flex flex-col md:flex-row md:items-center justify-between gap-2">
                      <span>Seleccionar Fecha y Hora</span>
                      {form.fecha && form.hora && form.medico_id && (
                        <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1.5 rounded-md border border-emerald-100 dark:border-emerald-800">
                          <div><span className="font-bold">Asignado:</span> {medicos.find(m => m.id === form.medico_id)?.nombre} {medicos.find(m => m.id === form.medico_id)?.apellido}</div>
                          <div>{new Date(form.fecha + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })} a las {form.hora} hs</div>
                        </div>
                      )}
                    </label>
                    <div className="flex gap-3 overflow-x-auto pb-4 scroll-smooth" style={{ scrollbarWidth: 'thin' }}>
                      {diasDisponibles.map(dia => {
                        const isSelectedDay = form.fecha === dia.dateStr;
                        return (
                          <div key={dia.dateStr} className={`flex-shrink-0 w-48 border rounded-xl overflow-hidden transition-all ${isSelectedDay ? 'border-emerald-500 shadow-md ring-1 ring-emerald-500' : 'border-slate-200 dark:border-slate-700'}`}>
                            <div className={`text-center py-2 text-sm font-bold capitalize ${isSelectedDay ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-slate-50 text-slate-600 dark:bg-slate-800/50 dark:text-slate-300'}`}>
                              {dia.dateObj.toLocaleDateString('es-AR', { weekday: 'short', day: '2-digit', month: 'short' })}
                            </div>
                            <div className="p-2 grid grid-cols-2 gap-2 max-h-48 overflow-y-auto bg-white dark:bg-slate-900" style={{ scrollbarWidth: 'thin' }}>
                              {dia.slots.map(slot => {
                                const isSelectedSlot = form.fecha === dia.dateStr && form.hora === slot.hora && form.medico_id === slot.medico_id;
                                return (
                                  <button
                                    key={`${slot.hora}-${slot.medico_id}`}
                                    type="button"
                                    onClick={() => setForm({ ...form, fecha: dia.dateStr, hora: slot.hora, medico_id: slot.medico_id })}
                                    className={`text-xs py-1.5 rounded-md font-mono transition-colors ${isSelectedSlot ? 'bg-emerald-500 text-white shadow-sm' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300'}`}
                                    title={`Asignar a: ${slot.medico_nombre}`}
                                  >
                                    {slot.hora}
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="input-label">Notas (opcional)</label>
                <textarea
                  className="input-field"
                  rows="2"
                  value={form.notas}
                  onChange={(e) => setForm({ ...form, notas: e.target.value })}
                  placeholder="Observaciones adicionales..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  Crear Turno
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
