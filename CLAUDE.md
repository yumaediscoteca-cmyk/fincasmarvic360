# Agrícola Marvic 360 — notas de sesión

**Última actualización:** 23/04/2026

## Módulo Parte Diario Encargado (piloto campo)

- **Ruta:** `/parte-encargado` (fuera de `AppLayout`, sin sidebar; lazy-loaded).
- **Tablas Supabase nuevas (7):** `parte_enc_plan_confirmacion`, `parte_enc_tarea_dia`, `parte_enc_incidencia`, `parte_enc_cambio_personal`, `parte_enc_maquinaria_cierre`, `parte_enc_cierre_escalado`, `parte_enc_alerta_outbox`.
- **Ampliación `user_profiles`:** `fincas_permitidas` (text[]), `rol_encargado` (text).
- **Roles en app (`src/types/roles.ts`):** `RolEncargado` (encargado_general, encargado_tractores, encargado_logistica, subencargado, subtractorista, camionero) + `RolAdmin` (admin, director, solo_lectura).
- **Estado:** funcional para piloto; lectura de planificación desde `trabajos_registro` (solo lectura) para rellenar `parte_enc_tarea_dia` la primera vez.

## Piloto usuarios (Supabase)

- `omnia360.sistema@gmail.com` → `admin`.
- `sergio@agricolamarvic.com` → `encargado_general` + fincas piloto + `rol_encargado` (dueño en prueba campo; ajustar `role` a `admin` si debe gestionar todo el ERP desde la misma cuenta).
