DROP POLICY IF EXISTS "obras_sociales_select" ON public.obras_sociales;
DROP POLICY IF EXISTS "obras_sociales_admin" ON public.obras_sociales;
DROP POLICY IF EXISTS "obras_sociales_insert" ON public.obras_sociales;
DROP POLICY IF EXISTS "obras_sociales_update" ON public.obras_sociales;
DROP POLICY IF EXISTS "obras_sociales_delete" ON public.obras_sociales;
DROP POLICY IF EXISTS "obras_sociales_secretaria" ON public.obras_sociales;
DROP POLICY IF EXISTS "obras_sociales_write" ON public.obras_sociales;

CREATE POLICY "obras_sociales_select" ON public.obras_sociales FOR SELECT USING (true);
CREATE POLICY "obras_sociales_write" ON public.obras_sociales FOR ALL
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND rol IN ('admin', 'secretaria')))
WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND rol IN ('admin', 'secretaria')));

DROP POLICY IF EXISTS "pacientes_select" ON public.pacientes;
DROP POLICY IF EXISTS "pacientes_admin" ON public.pacientes;
DROP POLICY IF EXISTS "pacientes_write" ON public.pacientes;
DROP POLICY IF EXISTS "pacientes_all" ON public.pacientes;

CREATE POLICY "pacientes_select" ON public.pacientes FOR SELECT USING (true);
CREATE POLICY "pacientes_write" ON public.pacientes FOR ALL
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND rol IN ('admin', 'secretaria', 'medico')))
WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND rol IN ('admin', 'secretaria', 'medico')));

DROP POLICY IF EXISTS "turnos_select" ON public.turnos;
DROP POLICY IF EXISTS "turnos_write" ON public.turnos;
DROP POLICY IF EXISTS "turnos_all" ON public.turnos;

CREATE POLICY "turnos_select" ON public.turnos FOR SELECT USING (true);
CREATE POLICY "turnos_write" ON public.turnos FOR ALL
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND rol IN ('admin', 'secretaria', 'medico')))
WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND rol IN ('admin', 'secretaria', 'medico')));
