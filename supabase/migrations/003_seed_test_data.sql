-- ============================================
-- SEED: USUARIOS DE PRUEBA
-- ============================================
-- Ejecutar en el SQL Editor de Supabase DESPUÉS de las migraciones 001 y 002
-- Contraseña para todos: MediCenter2026!
-- ============================================

-- Crear usuarios de prueba en auth.users
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, recovery_token, raw_app_meta_data, raw_user_meta_data)
VALUES
  -- ADMIN (Carina)
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated',
   'carina@medicenter.com',
   crypt('123123', gen_salt('bf')),
   NOW(), NOW(), NOW(), '', '',
   '{"provider":"email","providers":["email"]}',
   '{"nombre":"Carina","apellido":"Méndez","rol":"admin"}'
  ),
  -- SECRETARIA
  ('00000000-0000-0000-0000-000000000000', 'b0000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated',
   'secretaria@medicenter.com',
   crypt('123123', gen_salt('bf')),
   NOW(), NOW(), NOW(), '', '',
   '{"provider":"email","providers":["email"]}',
   '{"nombre":"Laura","apellido":"García","rol":"secretaria"}'
  ),
  -- MEDICO
  ('00000000-0000-0000-0000-000000000000', 'c0000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated',
   'medico@medicenter.com',
   crypt('123123', gen_salt('bf')),
   NOW(), NOW(), NOW(), '', '',
   '{"provider":"email","providers":["email"]}',
   '{"nombre":"Martín","apellido":"Rodríguez","rol":"medico","especialidad":"Cardiólogo","matricula":"MP-45210"}'
  ),
  -- PEDIATRA
  ('00000000-0000-0000-0000-000000000000', 'd0000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated',
   'pediatra@medicenter.com',
   crypt('123123', gen_salt('bf')),
   NOW(), NOW(), NOW(), '', '',
   '{"provider":"email","providers":["email"]}',
   '{"nombre":"Lucía","apellido":"Fernández","rol":"medico","especialidad":"Pediatra","matricula":"MP-38901"}'
  ),
  -- CLÍNICO
  ('00000000-0000-0000-0000-000000000000', 'e0000000-0000-0000-0000-000000000005', 'authenticated', 'authenticated',
   'clinico@medicenter.com',
   crypt('123123', gen_salt('bf')),
   NOW(), NOW(), NOW(), '', '',
   '{"provider":"email","providers":["email"]}',
   '{"nombre":"Roberto","apellido":"Sánchez","rol":"medico","especialidad":"Clínico","matricula":"MP-52130"}'
  )
ON CONFLICT (id) DO NOTHING;

-- Crear identidades de email para cada usuario
INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'carina@medicenter.com',
   '{"sub":"a0000000-0000-0000-0000-000000000001","email":"carina@medicenter.com"}', 'email', NOW(), NOW(), NOW()),
  ('b0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 'secretaria@medicenter.com',
   '{"sub":"b0000000-0000-0000-0000-000000000002","email":"secretaria@medicenter.com"}', 'email', NOW(), NOW(), NOW()),
  ('c0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000003', 'medico@medicenter.com',
   '{"sub":"c0000000-0000-0000-0000-000000000003","email":"medico@medicenter.com"}', 'email', NOW(), NOW(), NOW()),
  ('d0000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000004', 'pediatra@medicenter.com',
   '{"sub":"d0000000-0000-0000-0000-000000000004","email":"pediatra@medicenter.com"}', 'email', NOW(), NOW(), NOW()),
  ('e0000000-0000-0000-0000-000000000005', 'e0000000-0000-0000-0000-000000000005', 'clinico@medicenter.com',
   '{"sub":"e0000000-0000-0000-0000-000000000005","email":"clinico@medicenter.com"}', 'email', NOW(), NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Los perfiles se crean automáticamente via trigger on_auth_user_created
-- Pero por si acaso, insertamos manualmente:
INSERT INTO public.profiles (id, nombre, apellido, email, rol, especialidad, matricula)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Carina', 'Méndez', 'carina@medicenter.com', 'admin', NULL, NULL),
  ('b0000000-0000-0000-0000-000000000002', 'Laura', 'García', 'secretaria@medicenter.com', 'secretaria', NULL, NULL),
  ('c0000000-0000-0000-0000-000000000003', 'Martín', 'Rodríguez', 'medico@medicenter.com', 'medico', 'Cardiólogo', 'MP-45210'),
  ('d0000000-0000-0000-0000-000000000004', 'Lucía', 'Fernández', 'pediatra@medicenter.com', 'medico', 'Pediatra', 'MP-38901'),
  ('e0000000-0000-0000-0000-000000000005', 'Roberto', 'Sánchez', 'clinico@medicenter.com', 'medico', 'Clínico', 'MP-52130')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- SEED: PACIENTES DE EJEMPLO
-- ============================================
INSERT INTO public.pacientes (id, dni, nombre, apellido, fecha_nacimiento, telefono, email, obra_social_id)
VALUES
  ('f0000000-0000-0000-0000-000000000001', '30456789', 'María', 'López', '1985-03-15', '5492614001234', 'maria.lopez@email.com',
   (SELECT id FROM public.obras_sociales WHERE nombre = 'OSDE')),
  ('f0000000-0000-0000-0000-000000000002', '28123456', 'Juan', 'Martínez', '1978-11-22', '5492614005678', 'juan.martinez@email.com',
   (SELECT id FROM public.obras_sociales WHERE nombre = 'Swiss Medical')),
  ('f0000000-0000-0000-0000-000000000003', '35789012', 'Ana', 'Torres', '1992-07-08', '5492614009012', NULL,
   (SELECT id FROM public.obras_sociales WHERE nombre = 'PAMI')),
  ('f0000000-0000-0000-0000-000000000004', '42345678', 'Diego', 'Ruiz', '2000-01-30', '5492614003456', NULL,
   (SELECT id FROM public.obras_sociales WHERE nombre = 'Particular'))
ON CONFLICT (dni) DO NOTHING;

-- ============================================
-- SEED: DISPONIBILIDAD DE MÉDICOS
-- ============================================
-- Dr. Rodríguez (Cardiólogo) - Lunes a Viernes 8:00-12:00
INSERT INTO public.disponibilidad (medico_id, dia_semana, hora_inicio, hora_fin, duracion_turno)
VALUES
  ('c0000000-0000-0000-0000-000000000003', 1, '08:00', '12:00', 30),
  ('c0000000-0000-0000-0000-000000000003', 2, '08:00', '12:00', 30),
  ('c0000000-0000-0000-0000-000000000003', 3, '08:00', '12:00', 30),
  ('c0000000-0000-0000-0000-000000000003', 4, '08:00', '12:00', 30),
  ('c0000000-0000-0000-0000-000000000003', 5, '08:00', '12:00', 30);

-- Dra. Fernández (Pediatra) - Lunes, Miércoles, Viernes 14:00-18:00
INSERT INTO public.disponibilidad (medico_id, dia_semana, hora_inicio, hora_fin, duracion_turno)
VALUES
  ('d0000000-0000-0000-0000-000000000004', 1, '14:00', '18:00', 20),
  ('d0000000-0000-0000-0000-000000000004', 3, '14:00', '18:00', 20),
  ('d0000000-0000-0000-0000-000000000004', 5, '14:00', '18:00', 20);

-- Dr. Sánchez (Clínico) - Martes y Jueves 09:00-13:00
INSERT INTO public.disponibilidad (medico_id, dia_semana, hora_inicio, hora_fin, duracion_turno)
VALUES
  ('e0000000-0000-0000-0000-000000000005', 2, '09:00', '13:00', 30),
  ('e0000000-0000-0000-0000-000000000005', 4, '09:00', '13:00', 30);

-- ============================================
-- SEED: TURNOS DE EJEMPLO (para hoy)
-- ============================================
INSERT INTO public.turnos (paciente_id, medico_id, fecha, hora, estado)
VALUES
  ('f0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003', CURRENT_DATE, '08:30', 'confirmado'),
  ('f0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000003', CURRENT_DATE, '09:00', 'en_sala'),
  ('f0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000004', CURRENT_DATE, '14:00', 'pendiente'),
  ('f0000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000005', CURRENT_DATE, '09:30', 'atendido');
