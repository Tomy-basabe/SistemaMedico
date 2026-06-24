-- ============================================
-- MIGRACIÓN 002: ROL ADMIN + AUDITORÍA
-- ============================================

-- 1. Actualizar constraint de roles para incluir 'admin'
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_rol_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_rol_check CHECK (rol IN ('secretaria', 'medico', 'admin'));

-- 2. TABLA DE AUDITORÍA / LOG HISTÓRICO
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tabla TEXT NOT NULL,
  accion TEXT NOT NULL CHECK (accion IN ('INSERT', 'UPDATE', 'DELETE')),
  registro_id UUID,
  usuario_id UUID REFERENCES auth.users(id),
  usuario_email TEXT,
  usuario_nombre TEXT,
  datos_anteriores JSONB,
  datos_nuevos JSONB,
  descripcion TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para audit_log
CREATE INDEX idx_audit_log_tabla ON public.audit_log(tabla);
CREATE INDEX idx_audit_log_usuario ON public.audit_log(usuario_id);
CREATE INDEX idx_audit_log_created ON public.audit_log(created_at DESC);
CREATE INDEX idx_audit_log_registro ON public.audit_log(registro_id);

-- RLS para audit_log: solo admin puede leer
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_log_admin_select" ON public.audit_log
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.rol = 'admin'
    )
  );

-- Permitir inserciones desde triggers (SECURITY DEFINER)
CREATE POLICY "audit_log_insert" ON public.audit_log
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- 3. FUNCIÓN DE AUDITORÍA GENÉRICA
CREATE OR REPLACE FUNCTION public.log_audit()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_user_email TEXT;
  v_user_nombre TEXT;
  v_descripcion TEXT;
  v_registro_id UUID;
BEGIN
  -- Obtener el usuario actual
  v_user_id := auth.uid();
  
  SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;
  SELECT nombre || ' ' || apellido INTO v_user_nombre FROM public.profiles WHERE id = v_user_id;

  -- Determinar el registro_id
  IF TG_OP = 'DELETE' THEN
    v_registro_id := OLD.id;
  ELSE
    v_registro_id := NEW.id;
  END IF;

  -- Generar descripción legible
  CASE TG_TABLE_NAME
    WHEN 'pacientes' THEN
      IF TG_OP = 'INSERT' THEN
        v_descripcion := 'Se registró al paciente ' || NEW.nombre || ' ' || NEW.apellido || ' (DNI: ' || NEW.dni || ')';
      ELSIF TG_OP = 'UPDATE' THEN
        v_descripcion := 'Se actualizaron datos del paciente ' || NEW.nombre || ' ' || NEW.apellido;
      ELSIF TG_OP = 'DELETE' THEN
        v_descripcion := 'Se eliminó al paciente ' || OLD.nombre || ' ' || OLD.apellido;
      END IF;

    WHEN 'turnos' THEN
      IF TG_OP = 'INSERT' THEN
        v_descripcion := 'Se creó un turno para el ' || NEW.fecha || ' a las ' || NEW.hora;
      ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.estado IS DISTINCT FROM NEW.estado THEN
          v_descripcion := 'Turno del ' || NEW.fecha || ' cambió de estado: ' || OLD.estado || ' → ' || NEW.estado;
        ELSE
          v_descripcion := 'Se actualizó turno del ' || NEW.fecha;
        END IF;
      ELSIF TG_OP = 'DELETE' THEN
        v_descripcion := 'Se eliminó turno del ' || OLD.fecha;
      END IF;

    WHEN 'evoluciones' THEN
      IF TG_OP = 'INSERT' THEN
        v_descripcion := 'Se registró evolución médica. Diagnóstico: ' || COALESCE(NEW.diagnostico, 'N/A');
      END IF;

    WHEN 'recetas' THEN
      IF TG_OP = 'INSERT' THEN
        v_descripcion := 'Se emitió ' || NEW.tipo || ' para paciente';
      END IF;

    WHEN 'disponibilidad' THEN
      IF TG_OP = 'INSERT' THEN
        v_descripcion := 'Se agregó disponibilidad horaria';
      ELSIF TG_OP = 'UPDATE' THEN
        v_descripcion := 'Se modificó disponibilidad horaria';
      ELSIF TG_OP = 'DELETE' THEN
        v_descripcion := 'Se eliminó disponibilidad horaria';
      END IF;

    WHEN 'profiles' THEN
      IF TG_OP = 'INSERT' THEN
        v_descripcion := 'Se creó usuario: ' || NEW.nombre || ' ' || NEW.apellido || ' (' || NEW.rol || ')';
      ELSIF TG_OP = 'UPDATE' THEN
        v_descripcion := 'Se actualizó perfil de ' || NEW.nombre || ' ' || NEW.apellido;
      END IF;

    ELSE
      v_descripcion := TG_OP || ' en ' || TG_TABLE_NAME;
  END CASE;

  INSERT INTO public.audit_log (tabla, accion, registro_id, usuario_id, usuario_email, usuario_nombre, datos_anteriores, datos_nuevos, descripcion)
  VALUES (
    TG_TABLE_NAME,
    TG_OP,
    v_registro_id,
    v_user_id,
    v_user_email,
    v_user_nombre,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
    v_descripcion
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. APLICAR TRIGGERS DE AUDITORÍA
CREATE TRIGGER audit_pacientes AFTER INSERT OR UPDATE OR DELETE ON public.pacientes FOR EACH ROW EXECUTE FUNCTION public.log_audit();
CREATE TRIGGER audit_turnos AFTER INSERT OR UPDATE OR DELETE ON public.turnos FOR EACH ROW EXECUTE FUNCTION public.log_audit();
CREATE TRIGGER audit_evoluciones AFTER INSERT ON public.evoluciones FOR EACH ROW EXECUTE FUNCTION public.log_audit();
CREATE TRIGGER audit_recetas AFTER INSERT ON public.recetas FOR EACH ROW EXECUTE FUNCTION public.log_audit();
CREATE TRIGGER audit_disponibilidad AFTER INSERT OR UPDATE OR DELETE ON public.disponibilidad FOR EACH ROW EXECUTE FUNCTION public.log_audit();
CREATE TRIGGER audit_profiles AFTER INSERT OR UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.log_audit();
