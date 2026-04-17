-- Superficie asignada a esta línea de campaña dentro del sector (m²).
-- Permite varias filas con el mismo parcel_id y distinto cultivo/fechas.

ALTER TABLE public.planificacion_campana
  ADD COLUMN IF NOT EXISTS superficie_m2 numeric(12, 2);

COMMENT ON COLUMN public.planificacion_campana.superficie_m2 IS
  'Metros cuadrados de este sector dedicados a esta planificación (mismo sector puede tener varias líneas).';
