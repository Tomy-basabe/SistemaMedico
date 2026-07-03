-- Migración para expandir los tipos de archivos adjuntos permitidos
-- Originalmente el constraint era: CHECK (tipo IN ('pdf', 'imagen'))
-- Lo modificamos para aceptar cualquier texto o una lista más amplia, 
-- pero la mejor opción para no tener problemas futuros es eliminar el constraint o crear uno más permisivo.

ALTER TABLE public.adjuntos 
DROP CONSTRAINT IF EXISTS adjuntos_tipo_check;

-- Opcional: Si queremos mantener cierta restricción, se podría agregar uno nuevo, pero
-- dejarlo sin constraint permite guardar excel, word, pdf, videos, imágenes, etc. libremente.
