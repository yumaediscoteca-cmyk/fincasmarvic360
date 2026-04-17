-- Migración: Agregar campos de carnet, licencias y datos personales
-- Razón: Sincronizar schema BD con código (usePersonal / Personal.tsx)
-- Aplicado: 17 de abril de 2026
--
-- Nota: finca_asignada es TEXT (nombre de finca en UI), no FK: no existe public.fincas.
--       licencias es TEXT en la app (un solo string), no text[].

ALTER TABLE public.personal
ADD COLUMN IF NOT EXISTS carnet_tipo TEXT,
ADD COLUMN IF NOT EXISTS carnet_caducidad DATE,
ADD COLUMN IF NOT EXISTS codigo_interno TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS fecha_alta DATE,
ADD COLUMN IF NOT EXISTS finca_asignada TEXT,
ADD COLUMN IF NOT EXISTS licencias TEXT;

CREATE INDEX IF NOT EXISTS idx_personal_codigo_interno ON public.personal(codigo_interno);
CREATE INDEX IF NOT EXISTS idx_personal_finca_asignada ON public.personal(finca_asignada);
CREATE INDEX IF NOT EXISTS idx_personal_carnet_caducidad ON public.personal(carnet_caducidad);
