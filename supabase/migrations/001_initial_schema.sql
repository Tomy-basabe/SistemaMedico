-- ============================================
-- SISTEMA MÉDICO - MIGRACIÓN INICIAL
-- ============================================

-- 1. TABLA DE PERFILES (extiende auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  apellido TEXT NOT NULL,
  email TEXT NOT NULL,
  rol TEXT NOT NULL CHECK (rol IN ('secretaria', 'medico')),
  especialidad TEXT CHECK (especialidad IN ('Cardiólogo', 'Pediatra', 'Clínico', 'Ecografista')),
  matricula TEXT,
  telefono TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. OBRAS SOCIALES
CREATE TABLE IF NOT EXISTS public.obras_sociales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL UNIQUE,
  activa BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. PACIENTES
CREATE TABLE IF NOT EXISTS public.pacientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dni TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  apellido TEXT NOT NULL,
  fecha_nacimiento DATE,
  telefono TEXT,
  email TEXT,
  obra_social_id UUID REFERENCES public.obras_sociales(id),
  numero_afiliado TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. DISPONIBILIDAD MÉDICA
CREATE TABLE IF NOT EXISTS public.disponibilidad (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medico_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  dia_semana INT NOT NULL CHECK (dia_semana BETWEEN 0 AND 6), -- 0=Domingo, 6=Sábado
  hora_inicio TIME NOT NULL,
  hora_fin TIME NOT NULL,
  duracion_turno INT NOT NULL DEFAULT 30, -- minutos
  activa BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT horario_valido CHECK (hora_fin > hora_inicio)
);

-- 5. TURNOS
CREATE TABLE IF NOT EXISTS public.turnos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id UUID NOT NULL REFERENCES public.pacientes(id) ON DELETE CASCADE,
  medico_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  fecha DATE NOT NULL,
  hora TIME NOT NULL,
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'confirmado', 'en_sala', 'atendido', 'cancelado')),
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. ANTECEDENTES MÉDICOS
CREATE TABLE IF NOT EXISTS public.antecedentes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id UUID NOT NULL UNIQUE REFERENCES public.pacientes(id) ON DELETE CASCADE,
  alergias TEXT,
  cirugias TEXT,
  medicacion_actual TEXT,
  enfermedades_cronicas TEXT,
  antecedentes_familiares TEXT,
  observaciones TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. EVOLUCIONES MÉDICAS
CREATE TABLE IF NOT EXISTS public.evoluciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id UUID NOT NULL REFERENCES public.pacientes(id) ON DELETE CASCADE,
  medico_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  turno_id UUID REFERENCES public.turnos(id),
  motivo_consulta TEXT,
  examen_fisico TEXT,
  diagnostico TEXT,
  indicaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. ADJUNTOS
CREATE TABLE IF NOT EXISTS public.adjuntos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evolucion_id UUID NOT NULL REFERENCES public.evoluciones(id) ON DELETE CASCADE,
  nombre_archivo TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('pdf', 'imagen')),
  url_storage TEXT NOT NULL,
  descripcion TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. RECETAS Y ÓRDENES
CREATE TABLE IF NOT EXISTS public.recetas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evolucion_id UUID REFERENCES public.evoluciones(id) ON DELETE CASCADE,
  paciente_id UUID NOT NULL REFERENCES public.pacientes(id) ON DELETE CASCADE,
  medico_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('receta', 'orden_estudio')),
  contenido TEXT NOT NULL,
  diagnostico TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ÍNDICES
-- ============================================
CREATE INDEX idx_turnos_fecha ON public.turnos(fecha);
CREATE INDEX idx_turnos_medico ON public.turnos(medico_id);
CREATE INDEX idx_turnos_paciente ON public.turnos(paciente_id);
CREATE INDEX idx_turnos_estado ON public.turnos(estado);
CREATE INDEX idx_disponibilidad_medico ON public.disponibilidad(medico_id);
CREATE INDEX idx_evoluciones_paciente ON public.evoluciones(paciente_id);
CREATE INDEX idx_pacientes_dni ON public.pacientes(dni);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Habilitar RLS en todas las tablas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.obras_sociales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pacientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disponibilidad ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.turnos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.antecedentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evoluciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.adjuntos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recetas ENABLE ROW LEVEL SECURITY;

-- PROFILES: Todos los autenticados pueden leer, solo el propio puede editar
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());

-- OBRAS SOCIALES: Todos los autenticados pueden leer
CREATE POLICY "obras_sociales_select" ON public.obras_sociales FOR SELECT TO authenticated USING (true);

-- PACIENTES: Todos los autenticados CRUD
CREATE POLICY "pacientes_select" ON public.pacientes FOR SELECT TO authenticated USING (true);
CREATE POLICY "pacientes_insert" ON public.pacientes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "pacientes_update" ON public.pacientes FOR UPDATE TO authenticated USING (true);

-- DISPONIBILIDAD: Todos leen, médicos gestionan la propia
CREATE POLICY "disponibilidad_select" ON public.disponibilidad FOR SELECT TO authenticated USING (true);
CREATE POLICY "disponibilidad_insert" ON public.disponibilidad FOR INSERT TO authenticated WITH CHECK (medico_id = auth.uid());
CREATE POLICY "disponibilidad_update" ON public.disponibilidad FOR UPDATE TO authenticated USING (medico_id = auth.uid());
CREATE POLICY "disponibilidad_delete" ON public.disponibilidad FOR DELETE TO authenticated USING (medico_id = auth.uid());

-- TURNOS: Todos los autenticados CRUD
CREATE POLICY "turnos_select" ON public.turnos FOR SELECT TO authenticated USING (true);
CREATE POLICY "turnos_insert" ON public.turnos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "turnos_update" ON public.turnos FOR UPDATE TO authenticated USING (true);

-- ANTECEDENTES: Todos los autenticados CRUD
CREATE POLICY "antecedentes_select" ON public.antecedentes FOR SELECT TO authenticated USING (true);
CREATE POLICY "antecedentes_insert" ON public.antecedentes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "antecedentes_update" ON public.antecedentes FOR UPDATE TO authenticated USING (true);

-- EVOLUCIONES: Todos leen, médicos insertan las propias
CREATE POLICY "evoluciones_select" ON public.evoluciones FOR SELECT TO authenticated USING (true);
CREATE POLICY "evoluciones_insert" ON public.evoluciones FOR INSERT TO authenticated WITH CHECK (medico_id = auth.uid());
CREATE POLICY "evoluciones_update" ON public.evoluciones FOR UPDATE TO authenticated USING (medico_id = auth.uid());

-- ADJUNTOS: Todos leen, médicos insertan
CREATE POLICY "adjuntos_select" ON public.adjuntos FOR SELECT TO authenticated USING (true);
CREATE POLICY "adjuntos_insert" ON public.adjuntos FOR INSERT TO authenticated WITH CHECK (true);

-- RECETAS: Todos leen, médicos insertan las propias
CREATE POLICY "recetas_select" ON public.recetas FOR SELECT TO authenticated USING (true);
CREATE POLICY "recetas_insert" ON public.recetas FOR INSERT TO authenticated WITH CHECK (medico_id = auth.uid());

-- ============================================
-- SEED: OBRAS SOCIALES
-- ============================================
INSERT INTO public.obras_sociales (nombre) VALUES
  ('OSDE'),
  ('Swiss Medical'),
  ('Galeno'),
  ('Sancor Salud'),
  ('Medifé'),
  ('Omint'),
  ('PAMI'),
  ('OSEP'),
  ('DAMSU'),
  ('Particular')
ON CONFLICT (nombre) DO NOTHING;

-- ============================================
-- FUNCIÓN: Crear perfil automáticamente al registrar usuario
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, nombre, apellido, email, rol, especialidad, matricula)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nombre', ''),
    COALESCE(NEW.raw_user_meta_data->>'apellido', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'rol', 'secretaria'),
    NEW.raw_user_meta_data->>'especialidad',
    NEW.raw_user_meta_data->>'matricula'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- TRIGGER: Ejecutar al crear usuario nuevo
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- FUNCIÓN: Actualizar updated_at automáticamente
-- ============================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_pacientes_updated_at BEFORE UPDATE ON public.pacientes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_turnos_updated_at BEFORE UPDATE ON public.turnos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_antecedentes_updated_at BEFORE UPDATE ON public.antecedentes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
