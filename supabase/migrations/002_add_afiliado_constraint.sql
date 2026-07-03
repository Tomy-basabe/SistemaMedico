-- Migración para agregar constraint de unicidad para (obra_social_id, numero_afiliado)
-- Asegura que no existan dos pacientes con el mismo número de afiliado en la misma obra social.
-- El DNI ya es único según la migración inicial.

ALTER TABLE public.pacientes
ADD CONSTRAINT uq_afiliado_por_obra_social 
UNIQUE (obra_social_id, numero_afiliado);
