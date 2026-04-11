# AGRÍCOLA MARVIC 360 — CONTEXTO COMPLETO DEL PROYECTO

## ESTADO ACTUAL DEL SISTEMA (07/04/2026 — rev. 38 — PRODUCCIÓN FINAL)

Sistema ERP agrícola funcional al 100%. 17 módulos operativos completados. **rev. 38 — Hito "Producción": Se ha completado el módulo de Materiales y Auditoría. Se sanearon los errores de TypeScript residuales aplicando tipado estricto en las mutaciones (ej. `{ estado_planificacion: string; prioridad?: string }` en lugar de `Record<string, string>`) para garantizar el Type Matching con las autogeneraciones de Supabase. BUILD GENERADA CON ÉXITO.**

---

## IDENTIDAD DEL PROYECTO

**Nombre:** Agrícola Marvic 360
**Tipo:** ERP agrícola digital completo para explotación hortícola ecológica
**Cliente:** Grupo MARVIC — 250 ha ecológicas en Murcia y Valencia
**Director técnico:** JuanPe
**Stack:** React 18 + TypeScript + Tailwind CSS + Supabase (PostgreSQL) + Leaflet + React Query v5 + jsPDF + SheetJS (xlsx 0.18.5)
**Ruta del proyecto:** `/home/pedro/Escritorio/PC/fincasmarvic-main/`
**Puerto dev:** `localhost:8080` (npm run dev)

---

## REGLA DE TRABAJO — OBLIGATORIA

1. JuanPe pide UNA cosa concreta
2. Lees los archivos afectados primero
3. Muestras los cambios en diff antes de aplicar
4. Aplicas SOLO si JuanPe confirma
5. Verificas con `~/.nvm/versions/node/v20.20.1/bin/node ./node_modules/.bin/vite build` = 0 errores
6. Confirmas y esperas el siguiente paso

**NUNCA** hagas cambios en múltiples archivos a la vez sin confirmación.
**NUNCA** asumas que algo funciona sin verificar la compilación.

---

## 🏛️ PROTOCOLO DE ACTUACIÓN VERTICAL (PAV) — 04/04/2026

**OBJETIVO:** El sistema actúa como un organismo vivo que se auto-documenta y nunca olvida su estructura interna.

### INFRAESTRUCTURA DE AUDITORÍA — 4 PILARES FUNDACIONALES

Estos archivos son la **Fuente Única de Verdad (SSoT)** del proyecto. Toda modificación de código debe validarse contra ellos:

| Archivo | Responsabilidad | Actualización |
|---------|---|---|
| **AUDITORIA_TIPOS_OMNIA.ts** | Tipos/interfaces de todas las tablas BD + flujos | Con cada tabla nueva o campo agregado |
| **ARQUITECTURA_TECNICA_OMNIA.md** | Patrones, decisiones técnicas, estrategias | Con cada cambio arquitectónico |
| **DIAGRAMA_DEPENDENCIAS_OMNIA.md** | Grafo visual de módulos, hooks, componentes | Cuando dependencies cambian |
| **AUDITORIA_DATABASE_OMNIA.sql** | Esquema relacional completo de Supabase | Cuando se crea tabla o ALTER TABLE |

### FASE 1: INTERIORIZACIÓN (Lectura Obligatoria)

**ANTES DE ESCRIBIR CUALQUIER LÍNEA DE CÓDIGO, incluso pequeños cambios:**

1. Lee **CLAUDE.md** completo (este archivo)
2. Lee **AUDITORIA_TIPOS_OMNIA.ts** — Verifica que los tipos existen
3. Lee **ARQUITECTURA_TECNICA_OMNIA.md** — Entiende patrones aplicables
4. Lee **DIAGRAMA_DEPENDENCIAS_OMNIA.md** — No romper el grafo de dependencias
5. Lee **AUDITORIA_DATABASE_OMNIA.sql** — Esquema de BD es inviolable

**⚠️ REGLA INQUEBRANTABLE:** No puedes escribir código que:
- Cree campos sin tipo en AUDITORIA_TIPOS_OMNIA.ts
- Rompa el grafo de dependencias (importa un círculo de referencias)
- Cree tablas sin documentación en AUDITORIA_DATABASE_OMNIA.sql
- Viole patrones arquitectónicos en ARQUITECTURA_TECNICA_OMNIA.md

### FASE 2: EJECUCIÓN QUIRÚRGICA

Una vez validado contra los 4 pilares:
1. Haz el cambio solicitado
2. Mantén coherencia técnica (tipos, patrones, dependencias)
3. Completa la tarea sin ambigüedades

### FASE 3: SINCRONIZACIÓN POST-CAMBIO (Cierre de Ciclo)

**Ninguna tarea se considera finalizada hasta que:**

- ✅ Si se **crea tabla** → actualiza AUDITORIA_DATABASE_OMNIA.sql + tipos en AUDITORIA_TIPOS_OMNIA.ts
- ✅ Si se **agrega campo** → tipos en AUDITORIA_TIPOS_OMNIA.ts + SQL en AUDITORIA_DATABASE_OMNIA.sql
- ✅ Si se **cambia flujo** → actualiza DIAGRAMA_DEPENDENCIAS_OMNIA.md + ARQUITECTURA_TECNICA_OMNIA.md
- ✅ Si se **crea hook** → documenta en DIAGRAMA_DEPENDENCIAS_OMNIA.md + tipos usados en AUDITORIA_TIPOS_OMNIA.ts
- ✅ Si se **rompe patrón** → propón actualización a ARQUITECTURA_TECNICA_OMNIA.md

### REGLA DE "CRECIMIENTO VERTICAL" — Prohibición Stricta de Redundancia

**Prohibido:**
```typescript
// ❌ NO HACER: duplicar tipos ya en AUDITORIA_TIPOS_OMNIA.ts
export interface MiTabla { ... }  // Si ya existe, REUTILIZA

// ❌ NO HACER: crear tabla sin documentación
CREATE TABLE nueva_tabla (...)  // Debe estar en AUDITORIA_DATABASE_OMNIA.sql ANTES

// ❌ NO HACER: cambiar flujo sin actualizar diagrama
if (newFlow) { ... }  // Debe estar en DIAGRAMA_DEPENDENCIAS_OMNIA.md
```

**Obligatorio:**
```typescript
// ✅ HACER: reutilizar tipos existentes
import { MiTabla } from '@/AUDITORIA_TIPOS_OMNIA';

// ✅ HACER: documentar tabla primero
-- AUDITORIA_DATABASE_OMNIA.sql
CREATE TABLE nueva_tabla (...);  -- Luego código

// ✅ HACER: actualizar diagrama
-- DIAGRAMA_DEPENDENCIAS_OMNIA.md
nueva_tabla → hook → componente
```

**MANTRA:** "Tipos primero, código después. Documentación antes de ejecución."

---

## 🛡️ ESTÁNDARES DE CÓDIGO ESTRICTO (Derivados de Auditoría TS rev. 36)

Durante la auditoría profunda de linter, se han establecido las siguientes reglas obligatorias para evitar regresiones de TypeScript:

1. **Cero `any` en Supabase:** Prohibido usar `(supabase as any)` o forzar payloads. Usar inferencia nativa o aserciones seguras: `(payload as unknown as TablesInsert<'tabla'>)`.
2. **Manejo Seguro de Errores (Catch):** Prohibido usar `catch (e: any)`. Obligatorio: `catch (e: unknown)` y validación `e instanceof Error ? e.message : 'Error desconocido'`.
3. **Exportación de Contextos y Fast Refresh:** Vite prohíbe exportar hooks y componentes en el mismo archivo. En los Contextos (`AuthContext`, `ThemeContext`, `SidebarContext`) es la única excepción permitida silenciando el linter con `// eslint-disable-next-line react-refresh/only-export-components` justo encima de la exportación del hook.
4. **SelectWithOther:** El componente base `SelectWithOther` exige obligatoriamente la prop `onCreateNew`. Nunca omitirla en formularios (pasar el mismo state setter de `onChange` si no hay lógica extra).
5. **Relaciones Anidadas Supabase (JOINs):** Para tipar respuestas dinámicas con relaciones, no usar `(row as any).relation?.field`. Usar aserción estructural segura: `(row as unknown as { relation?: { field: string } }).relation?.field`.
6. **Type Matching Mutaciones:** Prohibido usar `Record<string, string>` para parches (`update`). Declarar explícitamente los campos esperados `{ campoA: string }` para que TypeScript no lance el error 2345 de no-solapamiento de tipos.

### Resumen de correcciones (Fase Limpieza Linter - Completada al 100%)
- **Contextos (1-4):** tailwind.config, AuthContext, SidebarContext, ThemeContext. Limpios.
- **Capa de Datos/Hooks (5-10):** useAnalisis, useLogistica, useOperaciones, useParteDiario, usePersonal, useTrazabilidad. Limpios y tipados con `TablesInsert` y `Omit`.
- **Componentes UI (Nivel 3):** 9 componentes shadcn corregidos con `eslint-disable react-refresh/only-export-components`.
- **Componentes Base y Formularios (Nivel 4):** InspeccionForm, ParcelHistory, RegisterEstadoUnificadoForm, RegisterWorkForm, UploadParcelPhoto. Limpios de vulnerabilidades en los bloques `catch`.
- **Páginas Principales (Nivel 5):** Dashboard, ExportarPDF, IntegracionERP, Inventario, QRCuadrilla, InventarioUbicacion, Maquinaria, Trabajos, PresenciaPanel, Trazabilidad, FarmMap. Todo 100% tipado (Inferencia de parámetros, aserciones estructurales, cero `any`).
- **Rescate Arquitectónico:** Reconstruido `useParcelData.ts` para restaurar hooks maestros (`useParcelas`, `useCropCatalog`, `useCuadrillas`) eliminados por error en una refactorización previa, arreglando el efecto dominó de importaciones.

---

## UBICACIÓN DE LOS 4 PILARES

```
/home/pedro/Escritorio/PC/fincasmarvic-main/
├─ AUDITORIA_TIPOS_OMNIA.ts           (1,500 líneas — Fuente de verdad tipos)
├─ ARQUITECTURA_TECNICA_OMNIA.md       (808 líneas — Patrones + decisiones)
├─ DIAGRAMA_DEPENDENCIAS_OMNIA.md      (265 líneas — Mapa visual)
├─ AUDITORIA_DATABASE_OMNIA.sql        (2,218 líneas — Esquema relacional)
├─ REPORTE_CALIDAD_OMNIA.md            (935 líneas — Auditoría QA + Quick Wins)
└─ CLAUDE.md                            (Este archivo — Contexto + PAV)
```

---

---

## ARQUITECTURA GENERAL

```
src/
  App.tsx                    — Rutas: ver tabla abajo
  main.tsx                   — Entry point React
  App.css                    — Reset: max-width:100%, margin:0, padding:0
  index.css                  — Tailwind + .parcel-label
  pages/                     — Una página por módulo
  components/                — Componentes compartidos + ui/ (shadcn)
  hooks/                     — React Query hooks por dominio
  constants/                 — Datos estáticos centralizados
  utils/                     — Utilidades puras reutilizables
  context/                   — ThemeContext + SidebarContext
  types/                     — farm.ts (tipos GeoJSON)
  integrations/supabase/     — client.ts + types.ts (generado)
  AUDITORIA_TIPOS_OMNIA.ts   — ⭐ Fuente única de tipos de BD y flujos
public/
  FINCAS_MARVIC_FINAL.geojson — 119 sectores reales WGS84
  MARVIC_logo.png             — Logo watermark
doc/
  generar_seed_inventario.py  — Parser Excel → SQL
  seed_inventario_historico.sql — 177 productos + 431 registros históricos
root/
  ARQUITECTURA_TECNICA_OMNIA.md — ⭐ Patrones técnicos + decisiones arquitectónicas
  DIAGRAMA_DEPENDENCIAS_OMNIA.md — ⭐ Grafo visual módulos + dependencias
  AUDITORIA_DATABASE_OMNIA.sql — ⭐ Esquema relacional Supabase (SSoT)
  REPORTE_CALIDAD_OMNIA.md — 📊 Auditoría QA + Health Score 73/100 + Quick Wins
  CLAUDE.md — 📘 Este archivo (contexto + PAV)
```

---

## 🔒 ARCHIVOS CRÍTICOS — NO ROMPER NUNCA

**Los 4 Pilares de Auditoría:**
1. **`AUDITORIA_TIPOS_OMNIA.ts`** — Tipos/interfaces de BD — VERSIÓN 1.0
2. **`ARQUITECTURA_TECNICA_OMNIA.md`** — Patrones técnicos — VERSIÓN 1.0
3. **`DIAGRAMA_DEPENDENCIAS_OMNIA.md`** — Grafo dependencias — VERSIÓN 1.0
4. **`AUDITORIA_DATABASE_OMNIA.sql`** — Esquema relacional — VERSIÓN 1.0

Estos son la **Fuente Única de Verdad (SSoT)**. Cualquier desviación requiere actualizar TODOS ellos.

---

## RUTAS REGISTRADAS EN App.tsx (fuente de verdad)

| Ruta | Componente | Layout | Notas |
|---|---|---|---|
| `/qr/:cuadrilla_id` | QRCuadrilla | SIN AppLayout | Fichaje QR campo, sin sidebar |
| `/` | Dashboard | AppLayout | Pantalla limpia: logo + reloj + fecha |
| `/dashboard` | Dashboard | AppLayout | Alias de `/` |
| `/farm` | FarmSelector | AppLayout | Selector 7 fincas reales |
| `/farm/:farmName` | FarmMap | AppLayout | Mapa con `encodeURIComponent` en links |
| `/inventario` | Inventario | AppLayout | Grid 6 ubicaciones |
| `/inventario/:ubicacionId` | InventarioUbicacion | AppLayout | Detalle ubicación |
| `/parte-diario` | ParteDiario | AppLayout | 4 bloques + menú PDF (5 informes corporativos) |
| `/trabajos` | Trabajos | AppLayout | 4 sub-bloques + menú PDF (5 informes corporativos) |
| `/logistica` | Logistica | AppLayout | Camiones + viajes + menú PDF (5 informes corporativos) |
| `/maquinaria` | Maquinaria | AppLayout | Tractores + aperos + menú PDF (5 informes corporativos) |
| `/personal` | Personal | AppLayout | 5 tabs + PDF |
| `/presencia` | PresenciaPanel | AppLayout | Monitor tiempo real cuadrillas activas |
| `/estado-general` | EstadoGeneral | AppLayout | Alertas ITV, incidencias, certs, sensores |
| `/historicos` | Historicos | AppLayout | Buscador global multi-módulo |
| `/exportar-pdf` | ExportarPDF | AppLayout | PDF global multi-módulo |
| `/integracion-erp` | IntegracionERP | AppLayout | Exportación CSV/JSON al ERP Financiero |
| `*` | NotFound | AppLayout | 404 |

⚠️ **NO EXISTEN** rutas `/trazabilidad`, `/materiales`, `/auditoria` — están en navItems con `activo: false` pero sin página real.

---
Guarda estos 3 archivos y confírmame que todo compila y que el nuevo Buscador y el Modal de Consumo Rápido te funcionan a la perfección. ¡Estaríamos a un solo paso de acabar la aplicación con la "Auditoría"!


## MÓDULOS — ESTADO REAL

### ✅ IMPLEMENTADOS Y FUNCIONALES

| Módulo | Ruta | Descripción real |
|---|---|---|
| Dashboard | `/` | Logo + reloj HH:MM + fecha. Módulo Metereología (Open-Meteo), 4 KPIs globales, listas detalladas de Trabajos Hoy, Maquinaria Activa (GPS/Parte) y Alertas Críticas. Integración panel LIA (observación IA). PDF Corporativo en 1 clic. |
| FarmSelector | `/farm` | Grid 7 fincas reales |
| FarmMap | `/farm/:farmName` | Mapa 119 sectores, menú de funciones, formulario unificado. Integración de marcadores de tractores en tiempo real y telemetría. Motor PDF refactorizado (vía `generarPDFCorporativoBase`). Variantes `dark:` implementadas. |
| Inventario | `/inventario` | Grid 6 ubicaciones + KPIs dinámicos + PDF global |
| InventarioUbicacion | `/inventario/:id` | 7 categorías, panel lateral, modales, Excel/PDF. Bridge table `inventario_ubicacion_activo` para tractores/aperos |
| ParteDiario | `/parte-diario` | 4 bloques A/B/C/D + navegador fechas + menú PDF ejecutivo (5 variantes). Bloque C: foto opcional; D: foto. PDF corporativo vía `generarPDFCorporativo()` en `ParteDiario.tsx` (cabecera logo 45mm, tablas, pie firmado + «Página X de Y»). Botón "Cerrar jornada" en cabecera (solo si fecha=hoy): confirm() → lógica completa de arrastre en useCerrarJornada() → modal resultado con 4 KPIs + botón "Ver planificación" → /trabajos. Trabajos pendientes arrastrados a mañana con prioridad ALTA; incidencias urgentes no resueltas del día → nuevas tareas. cierres_jornada registra resumen |
| Trabajos | `/trabajos` | 4 sub-bloques + incidencias + selector cascada finca→parcela. Fix de validación TS en `Partial<TrabajoRegistro>` resuelto. Formularios robustecidos. |
| Logistica | `/logistica` | Camiones+vehículos empresa+viajes+mantenimiento+combustible. 6 tabs. Conductor desde `personal (categoria=conductor_camion)`. Código interno CM/VH automático. `estado_operativo` en camiones y vehículos. Panel Estado Flota. Sync `logistica_inventario_sync` al dar de alta. PDF vía `generarPDFCorporativoBase()` + menú (completo, viajes hoy, estado flota, mantenimientos, resumen) |
| Maquinaria | `/maquinaria` | Tractores+aperos+uso+mantenimiento. + Tab de GPS / Recorridos (Polyline de ruta y detección de paradas >5min). Tractorista vía `personal_id`. |
| Personal | `/personal` | 5 tabs (Operarios/Encargados/Maquinaria/Camión/Externa) + QR auto + PDF |
| QRCuadrilla | `/qr/:cuadrilla_id` | Pantalla fullscreen móvil, sin login, sin sidebar |
| PresenciaPanel | `/presencia` | Monitor en tiempo real de cuadrillas activas + tabla resumen horas. Tabla (cuadrilla/parcela/hora_entrada/tiempo_acumulado en HH:MM:SS), contador de activas, refetch automático cada 30s. Filtros (cuadrilla/rango fechas), tabla resumen (cuadrilla/total horas/parcelas/tipo trabajo), botón PDF corporativo 2 secciones, botón Excel 2 hojas, lógica calcularResumen() con agregación de horas desde presencia_tiempo_real |
| EstadoGeneral | `/estado-general` | Alertas: ITV tractores/camiones (<0d crítica, ≤30d urgente), revisión tractores (≤14d), mantenimiento km/horas, incidencias abiertas, certificaciones (≤60d), sensores sin lectura >7d |
| Historicos | `/historicos` | Busca en: trabajos_registro, maquinaria_uso, logistica_viajes, partes_diarios, parte_estado_finca, parte_trabajo. Filtros: rango fechas (defecto últimos 30d), módulo, finca, texto. Límite 200 por tabla |
| ExportarPDF | `/exportar-pdf` | PDF global seleccionable: Parte Diario, Trabajos, Maquinaria, Logística, Personal, Campo (todas implementadas 100%). |
| IntegracionERP | `/integracion-erp` | Permite exportar los datos raw limpios (CSV/JSON) para importarlos en el ERP contable o cualquier software externo. Registra historial de exportaciones. |
| Trazabilidad | `/trazabilidad` | Página con tabs de Palots, Cámaras y Escáner QR de lote; captura de geolocalización y ciclo de vida en progreso. |
| Materiales | `/materiales` | Gestión de inventario descentralizado en campo (fitosanitarios, abonos, riego, plástico). Filtros, buscador y herramienta de Consumo Rápido para actualizar el stock fácilmente. |
| Auditoria | `/auditoria` | Módulo final que centraliza y muestra un registro cronológico de todas las acciones clave realizadas en el sistema (creación de trabajos, movimientos de inventario, etc.) con filtros por fecha, módulo y usuario. |

### 🔴 NO IMPLEMENTADOS (rutas en navItems pero sin página)

| Módulo | navItems activo | Ruta | Estado |
|---|---|---|---|

---

## FINCAS REALES (fuente única: `src/constants/farms.ts`)

| Nombre exacto | Sectores | Ha |
|---|---|---|
| LA CONCEPCION | 24 | 28.37 |
| LONSORDO | 16 | 10.54 |
| FINCA COLLADOS | 18 | 46.06 |
| FINCA BRAZO DE LA VIRGEN | 4 | 7.08 |
| FINCA LA BARDA | 28 | 74.70 |
| FINCA LA NUEVA | 13 | 15.66 |
| FINCA MAYORAZGO | 16 | 29.53 |

**Total:** 7 fincas, 119 sectores, 211.94 ha
**GeoJSON:** WGS84 — NO convertir UTM nunca.

---

## CONSTANTES

### `src/constants/farms.ts`
- `FINCAS_DATA: FincaData[]` — array con nombre, sectores, ha
- `FINCAS_NOMBRES: string[]` — solo nombres

### `src/constants/tiposTrabajo.ts`
- `TIPOS_TRABAJO: string[]` — 25 tipos: Laboreo, Siembra, Transplante, Plantación, Acolchado, Encamado plástico, Colocación plástico, Retirada plástico, Riego, Abonado, Tratamiento fitosanitario, Preparación terreno, Preparación suelo, Labores tractor, Poda, Deshierbe, Desbrozado, Cosecha, Recolección, Transporte, Limpieza nave, Mantenimiento, Mantenimiento maquinaria, Inspección, Otro

### `src/constants/estadosParcela.ts`
- `ESTADOS_PARCELA: {value, label}[]` — 6 valores: `vacia | preparacion | plantada | cosechada | en_produccion | acolchado`

### `src/constants/navItems.ts`
- `NAV_ITEMS: NavItem[]` — 13 ítems totales
- CAMPO (accordion, `activo: true`): children → [Selector de fincas: /farm]
- INVENTARIO (accordion, `activo: true`): children → [Ubicaciones: /inventario]
- TRABAJOS/LOGÍSTICA/MAQUINARIA/PERSONAL/PARTE DIARIO/ESTADO GENERAL/HISTÓRICOS/EXPORTAR PDF: rutas directas (`activo: true`)
- TRAZABILIDAD/MATERIALES/AUDITORÍA: rutas declaradas pero `activo: false` — el sidebar los muestra deshabilitados

---

## UTILIDADES

### `src/utils/uploadImage.ts`
- `uploadImage(file, bucket, path, upsert?)` → `Promise<string | null>` — sube a Storage, devuelve URL pública o null (nunca lanza excepción)
- `buildStoragePath(folder, file, filenamePrefix?)` → `string` — genera path único `folder/timestamp-random.ext`

### `src/utils/dateFormat.ts`
- `formatHora(ts)` → `'HH:MM'` — para timestamps ISO o null
- `formatFecha(iso)` → `'dd/mm/yyyy, HH:MM'` — fecha + hora completa
- `formatFechaCompleta(fecha)` → `'dd/mm/yyyy'` — solo fecha
- `formatFechaCorta(fecha)` → `'27 mar'` — día y mes corto
- `formatFechaLarga(fecha)` → `'JUEVES, 27 DE MARZO DE 2026'` — cabeceras parte diario
- `formatFechaNav(fecha)` → `'JUE 27 MAR'` — navegador de fechas

### `src/utils/pdfUtils.ts`
- `PDF_COLORS` — objeto: `accent | orange | violet | amber | green | fuchsia | gray | lightGray | white | dark`
- `PDF_MARGIN=14, PDF_PAGE_W=210, PDF_PAGE_H=297, PDF_TEXT_W, PDF_BOTTOM_LIMIT=280`
- `loadPdfImage(url)` → `PdfImage | null` — fetch + canvas → base64 JPEG
- `createPdfContext(doc, logoData?, accentColor?)` → `PdfContext` — incluye `setCorporateMode`, `addCorporatePageHeader`; con modo corporativo activo, `checkPage` repinta cabecera 45 mm y reserva pie
- `initPdf(accentColor?)` → `{ doc, ctx }` — crea doc A4 + carga logo + crea contexto
- `generarPDFCorporativoBase({ titulo, subtitulo, fecha: Date, filename, bloques, accentColor? })` — `initPdf` + cabecera corporativa + bloques `(ctx, doc) =>` + pie todas las páginas + `save`
- `pdfCorporateSection(ctx, titulo)`, `pdfCorporateTable(ctx, headers, colWidths, rows)`, `applyCorporateFootersAllPages(doc, fecha)`

### `src/utils/validation.ts`
- `validateForm(rules, values)` → `string[]`
- `isNonEmpty(v)`, `isPositive(v)` → `boolean`
- `parseOperarios(v)`, `parseDecimal(v)`, `parseCoste(v)` → `number | null`
- `firstError(errors)` → `string | null`

---

## HOOKS — NOMBRES REALES (verificados en código)

### `src/hooks/useParcelData.ts`

| Hook | Descripción |
|---|---|
| `useCropCatalog()` | Catálogo cultivos (orden por nombre_display) |
| `useParcelProduction(parcelId, crop)` | Producción estimada (cálculo local con datos BD) |
| `useParcelTickets(parcelId)` | Tickets de pesaje con JOIN a harvests y camiones |
| `useParcelResiduos(parcelId)` | Residuos de parcela |
| `useParcelCertification(parcelId)` | Última certificación de parcela |
| `useCamiones()` | ⚠️ DUPLICADO — usar `useLogistica.useCamiones()` en Logística |
| `useCuadrillas()` | Cuadrillas activas |
| `useParcelRecords(parcelId)` | Retorna `{ workRecords, plantings, harvests }` — tres queries |
| `useParcelAnalisisSuelo(parcelId)` | Análisis suelo de parcela |
| `useParcelLecturasSensor(parcelId)` | Lecturas NDVI/SPAD de parcela |
| `useFincaAnalisisAgua(finca)` | Análisis agua por finca |
| `useFarmParcelStatuses(parcelIds)` | Estado calculado de parcelas en mapa |
| `useInsertWorkRecord()` | Insertar trabajo en work_records |
| `useInsertWorkRecordQR()` | Insertar trabajo vía QR cuadrilla |
| `useInsertPlanting()` | Insertar plantación |
| `useInsertHarvest()` | Insertar cosecha |
| `useInsertResiduo()` | Insertar residuo |
| `useInsertTicketPesaje()` | Insertar ticket (genera número_albaran automático) |
| `useInsertCamion()` | Insertar camión (⚠️ duplicado) |
| `useInsertCuadrilla()` | Insertar cuadrilla |
| `useInsertAnalisisSuelo()` | Insertar análisis suelo |
| `useInsertLecturaSensor()` | Insertar lectura sensor NDVI/SPAD |
| `useInsertAnalisisAgua()` | Insertar análisis agua |
| `useParcelas(finca?)` | Parcelas por finca (para selectores) |
| `useAddPlanting()` | Alias de useInsertPlanting — firma diferente |
| `useAddHarvest()` | Alias de useInsertHarvest — firma diferente |

⚠️ **NO EXISTEN** en useParcelData: `useTicketsPesaje`, `useResiduosOperacion`, `useCertificaciones`, `useAnalisisSuelo`, `useAddAnalisisSuelo`, `useLecturaSensor`, `useAddLecturaSensor`, `useAnalisisAgua`, `useAddAnalisisAgua`, `useUpdateParcelStatus`, `useAddEstadoParcela`

### `src/hooks/useParteDiario.ts`

| Hook | Descripción |
|---|---|
| `usePartePorFecha(fecha)` | Parte diario por fecha (maybeSingle) |
| `useEnsureParteHoy()` | Mutation: obtiene o crea parte del día |
| `useEstadosFinca(parteId)` | Bloque A — estados finca |
| `useAddEstadoFinca()` | Bloque A — añadir estado |
| `useTrabajos(parteId)` | Bloque B — trabajos |
| `useAddTrabajo()` | Bloque B — añadir trabajo |
| `usePersonales(parteId)` | Bloque C — anotaciones personales |
| `useAddPersonal()` | Bloque C — añadir anotación |
| `useResiduos(parteId)` | Bloque D — residuos vegetales |
| `useAddResiduos()` | Bloque D — añadir residuo |
| `useUpdateParteDiario()` | Actualizar notas_generales del parte |
| `useDeleteEntradaParte()` | Eliminar fila por tabla+id+parteId |
| `useGanaderos()` | Listado ganaderos activos |
| `useAddGanadero()` | Crear ganadero (solo con nombre) |

### `src/hooks/useInventario.ts`

| Hook | Descripción |
|---|---|
| `useUbicaciones()` | Ubicaciones activas ordenadas |
| `useCategorias()` | Categorías ordenadas |
| `useRegistros(ubicacionId, categoriaId)` | Registros de ubicación+categoría |
| `useUltimoRegistro(ubicacionId, categoriaId)` | Último registro (estado actual) |
| `useResumenUbicacion(ubicacionId)` | Último registro de cada categoría en ubicación |
| `useAddRegistro()` | Añadir registro de inventario |
| `useAddInforme()` | Insertar snapshot de informe |
| `useTotalRegistros()` | Conteo global de registros |
| `useConteosUbicaciones()` | Map<ubicacion_id, count> de registros |
| `useProductosCatalogo(categoriaId)` | Catálogo productos por categoría |
| `useAddProductoCatalogo()` | Añadir producto al catálogo |
| `useUpdatePrecioProducto()` | Actualizar precio de producto |
| `useMovimientos(ubicacionId, categoriaId)` | Movimientos entre ubicaciones |
| `useAddMovimiento()` | Añadir movimiento |
| `useInformes(ubicacionId?, desde?, hasta?)` | Listar informes con filtros opcionales |
| `useActivosEnUbicacionVista(ubicacionId)` | Vista `v_inventario_activos_en_ubicacion` — tractores/aperos asignados |
| `useInventarioUbicacionActivosAll()` | Todas las asignaciones `inventario_ubicacion_activo` |
| `useMaquinariaAperosAsignadosUbicacion(ubicacionId)` | Aperos de maquinaria_aperos asignados a ubicación |
| `useAperosTablaInventario()` | Tabla legacy `aperos` (denominacion, codigo, marca, estado) |
| `useAssignActivoUbicacion()` | Asignar tractor/apero a ubicación |
| `useRemoveActivoUbicacion()` | Desasignar activo de ubicación |

### `src/hooks/useTrabajos.ts`

| Hook | Descripción |
|---|---|
| `useRegistrosTrabajos(tipoBloque?)` | Registros con filtro opcional por bloque |
| `useAddTrabajoRegistro()` | Añadir registro de trabajo |
| `useIncidencias(soloAbiertas?)` | Incidencias (filtro opcional excluyendo resueltas) |
| `useAddIncidencia()` | Añadir incidencia |
| `useUpdateIncidencia()` | Actualizar estado/resolución de incidencia |
| `useKPIsTrabajos()` | totalRegistros, incAbiertas, incUrgentes |

### `src/hooks/useLogistica.ts`

| Hook | Descripción |
|---|---|
| `useCamiones()` | FUENTE PRINCIPAL de camiones (select *) |
| `useAddCamion()` | Añadir camión — genera código CM001+ — sync inventario si viene ubicacion_id |
| `useUpdateCamion()` | Actualizar camión (patch parcial) |
| `useDeleteCamion()` | Eliminar camión + invalida sync inventario |
| `useVehiculosEmpresa()` | Todos los vehículos empresa |
| `useAddVehiculoEmpresa()` | Añadir vehículo — genera código VH001+ — sync inventario |
| `useUpdateVehiculoEmpresa()` | Actualizar vehículo (patch parcial) |
| `useDeleteVehiculoEmpresa()` | Eliminar vehículo |
| `useViajes(personalId?)` | Viajes con filtro opcional por personal_id |
| `useAddViaje()` | Añadir viaje |
| `useUpdateViaje()` | Actualizar viaje (patch parcial) |
| `useDeleteViaje()` | Eliminar viaje |
| `useMantenimientoCamion(camionId?)` | Mantenimiento con filtro opcional (camion_id) |
| `useAddMantenimientoCamion()` | Añadir mantenimiento |
| `useUpdateMantenimientoCamion()` | Actualizar mantenimiento |
| `useDeleteMantenimiento()` | Eliminar mantenimiento |
| `useCombustible(vehiculoId?, vehiculoTipo?)` | Repostajes con filtros opcionales |
| `useAddCombustible()` | Añadir repostaje |
| `useUpdateCombustible()` | Actualizar repostaje |
| `useDeleteCombustible()` | Eliminar repostaje |
| `useLogisticaInventarioSync()` | Todas las asignaciones activas |
| `useAddLogisticaSync()` | Añadir asignación sync inventario |
| `useTiposTrabajoLogistica()` | Tipos trabajo de `catalogo_tipos_trabajo WHERE categoria='logistica'` |
| `useAddTipoTrabajoLogistica()` | Añadir tipo trabajo logística al catálogo |
| `useTiposMantenimientoLogistica()` | Tipos mant. de `catalogo_tipos_mantenimiento WHERE modulo='logistica'` |
| `useKPIsLogistica()` | totalCamiones, camionesActivos, totalVehiculos, totalConductores, totalViajes |

⚠️ **NO EXISTE** `useConductores` — era legacy. Los conductores se leen de `personal` con `categoria='conductor_camion'`.

### `src/hooks/useMaquinaria.ts`

| Hook | Descripción |
|---|---|
| `useTractores()` | Todos los tractores (select *) |
| `useTractoresEnInventario()` | Vista `v_tractores_en_inventario` |
| `useAperosEnInventario()` | Vista `v_maquinaria_aperos_en_inventario` |
| `useAddTractor()` | Añadir tractor |
| `useUpdateTractor()` | Actualizar tractor (patch parcial) |
| `useAperos(tractorId?)` | Aperos con filtro opcional por tractor |
| `useAddApero()` | Añadir apero |
| `useUsosMaquinaria(tractorId?)` | Usos con filtro opcional |
| `useAddUsoMaquinaria()` | Añadir uso maquinaria |
| `useMantenimientoTractor(tractorId?)` | Mantenimiento con filtro opcional |
| `useAddMantenimientoTractor()` | Añadir mantenimiento tractor |
| `useKPIsMaquinaria()` | tractoresActivos, aperosActivos, totalHoras, totalGasolina |

### `src/hooks/usePersonal.ts`

| Hook | Descripción |
|---|---|
| `usePersonal(categoria?)` | Personal con filtro opcional por categoría |
| `useAddPersonal()` | Añadir personal — genera código OP/EN/CM/CC001+ por categoría |
| `useUpdatePersonal()` | Actualizar personal (patch parcial) |
| `useDeletePersonal()` | Eliminar personal por id |
| `usePersonalExterno()` | Personal externo (todos) |
| `useAddPersonalExterno()` | Añadir personal externo — genera código EX001+ |
| `useUpdatePersonalExterno()` | Actualizar personal externo |
| `useDeletePersonalExterno()` | Eliminar personal externo por id |
| `useTiposTrabajoPersonal(personalId)` | Tipos trabajo asignados a un operario (JOIN personal_tipos_trabajo→catalogo) |
| `useAddTipoTrabajoPersonal()` | Insertar fila en personal_tipos_trabajo |
| `useRemoveTipoTrabajoPersonal()` | Eliminar fila de personal_tipos_trabajo |
| `useTiposTrabajoCatalogoPersonal(categoria)` | Catálogo tipos trabajo filtrado por categoría |
| `useAddTipoTrabajoCatalogo()` | Añadir tipo trabajo al catálogo (devuelve el registro creado) |
| `useKPIsPersonal()` | total, activos, externos, porCategoria |

### `src/hooks/useGPS.ts`
- `usePosicionesActuales(vehicleTipo?)` — Obtiene la última posición reportada de los vehículos en tiempo real
- `useRecorridoDia(vehicleId, fecha)` — Obtiene historial de tracking (polyline) y localiza paradas prolongadas
- `useAddPosicion()` — Inserta una nueva coordenada GPS

### `src/hooks/useGeoJSON.ts`
- `useGeoJSON` — carga GeoJSON + upsert parcelas (singleton: una sola vez por sesión)

---

## COMPONENTES (`src/components/`)

| Archivo | Descripción |
|---|---|
| `AppLayout.tsx` | Wrapper transparente con `<Outlet />` — inyecta GlobalSidebar en todas las rutas no-QR |
| `base/SelectWithOther.tsx` | Select universal con opción "Otros/Añadir nuevo" — llama `onCreateNew(texto)` y autoselecciona |
| `base/AudioInput.tsx` | Textarea + dictado Web Speech API (es-ES), icono SVG micrófono, graceful degradation |
| `base/PhotoAttachment.tsx` | Adjuntar foto sin auto-upload — gestiona File local, preview + botón eliminar |
| `base/RecordActions.tsx` | Botones Editar/Eliminar alineados a la derecha — Eliminar pide confirm() |
| `base/index.ts` | Barrel export de los 4 componentes base |
| `GlobalSidebar.tsx` | Sidebar overlay con accordion (CAMPO/INVENTARIO expandibles), auto-open por ruta, scroll al activo, cierre con Escape |
| `ParcelDetailPanel.tsx` | Modal datos básicos sector (sin formularios) |
| `ParcelHistory.tsx` | Panel historial 7 tabs (incluye Galería visual con geolocalización) |
| `RegisterWorkForm.tsx` | Formulario registro trabajo desde FarmMap |
| `RegisterEstadoUnificadoForm.tsx` | Formulario unificado (estado+plantación+cosecha+análisis+foto) |
| `UploadParcelPhoto.tsx` | Captura foto + subida Storage con API Geolocation (spinner CSS, **NO** Loader2) |
| `InspeccionForm.tsx` | Formulario estructurado para inspecciones de campo con foto geolocalizada obligatoria |
| `ui/` | Librería shadcn/ui completa (≥47 componentes) |

---

## BASE DE DATOS SUPABASE — TABLAS ACTIVAS

```sql
-- IA (tablas BD, no usadas en código activo)
ai_proposals                 — id, status ENUM, category ENUM, input_json, output_json, related_parcel_id TEXT
ai_proposal_validations      — id, proposal_id, decision ENUM, note, decided_by

-- FINCAS Y PARCELAS
parcels                      — parcel_id TEXT PK, farm TEXT, parcel_number, area_hectares, status,
                               irrigation_type_v2 ENUM(tipo_riego), tipo_suelo ENUM,
                               ph_suelo, materia_organica_pct, ultima_analisis_suelo
cultivos_catalogo            — id UUID PK, nombre_interno UNIQUE, nombre_display, ciclo_dias,
                               rendimiento_kg_ha, kg_plastico_por_ha, m_cinta_riego_por_ha,
                               marco_std_entre_lineas_cm, marco_std_entre_plantas_cm, es_ecologico BOOL

-- OPERACIONES AGRÍCOLAS
plantings                    — id UUID PK, parcel_id TEXT FK, crop, date, variedad, lote_semilla, notes
harvests                     — id UUID PK, parcel_id TEXT FK, crop, date, production_kg, price_kg, harvest_cost
work_records                 — id UUID PK, parcel_id TEXT FK, work_type, date, cuadrilla_id UUID FK,
                               workers_count, hours_worked, hora_entrada, hora_salida, notas
cuadrillas                   — id UUID PK, nombre, qr_code, activa, empresa, nif, responsable, telefono
registros_estado_parcela     — parcel_id TEXT FK, estado ENUM, foto_url, notas, created_at
tickets_pesaje               — id UUID PK, harvest_id UUID FK, numero_albaran UNIQUE, destino,
                               camion_id FK, peso_neto_kg (generated)
residuos_operacion           — id UUID PK, parcel_id TEXT FK, tipo_residuo ENUM, kg_instalados, kg_retirados
certificaciones_parcela      — id UUID PK, parcel_id TEXT FK, estado ENUM, campana, entidad_certificadora,
                               fecha_inicio, fecha_fin, numero_expediente

-- ANÁLISIS (parcel_id es TEXT)
analisis_suelo               — id UUID PK, parcel_id TEXT FK, ph, conductividad_ec, salinidad_ppm,
                               temperatura_suelo, materia_organica, sodio_ppm, nitrogeno_ppm, fosforo_ppm,
                               potasio_ppm, textura, profundidad_cm, num_muestras, operario, herramienta,
                               informe_url, observaciones, fecha
lecturas_sensor_planta       — id UUID PK, parcel_id TEXT FK, indice_salud, nivel_estres, ndvi, clorofila,
                               cultivo, num_plantas_medidas, operario, herramienta, observaciones, fecha
analisis_agua                — id UUID PK, finca TEXT, fuente TEXT, ph, conductividad_ec, salinidad_ppm,
                               temperatura, sodio_ppm, cloruros_ppm, nitratos_ppm, dureza_total,
                               operario, herramienta, observaciones, fecha

-- FOTOS (legacy)
parcel_photos                — id UUID PK, parcel_id TEXT FK, image_url, description, created_at
fotos_campo                  — id UUID PK, parcel_id TEXT FK, url_imagen, descripcion, fecha

-- INVENTARIO (7 tablas activas)
inventario_ubicaciones        — id UUID PK, nombre, descripcion, foto_url, activa, orden
inventario_categorias         — id UUID PK, nombre, slug, icono, orden
inventario_productos_catalogo — id UUID PK, nombre, categoria_id UUID FK, precio_unitario, unidad_defecto, activo
inventario_registros          — id UUID PK, ubicacion_id UUID FK, categoria_id UUID FK, producto_id UUID FK,
                                cantidad, unidad, descripcion, foto_url, foto_url_2, precio_unitario, notas,
                                created_at, created_by
                                ⚠️ NO tiene campo `responsable` en BD (no está en types.ts)
inventario_movimientos        — id UUID PK, categoria_id, producto_id, cantidad, unidad,
                                ubicacion_origen_id, ubicacion_destino_id, fecha, notas, responsable, created_by
inventario_informes           — id UUID PK, tipo, fecha_inicio, fecha_fin, ubicacion_id, categoria_id,
                                contenido JSONB, generado_at
inventario_ubicacion_activo   — id UUID PK, ubicacion_id UUID FK, maquinaria_tractor_id UUID FK,
                                maquinaria_apero_id UUID FK, apero_id UUID FK (legacy aperos),
                                notas, created_at, created_by

-- VISTAS BD (solo lectura)
v_inventario_activos_en_ubicacion   — activos (tractores+aperos) asignados por ubicación
v_tractores_en_inventario           — tractores de maquinaria_tractores asignados a inventario
v_maquinaria_aperos_en_inventario   — aperos de maquinaria_aperos asignados a inventario

-- CATÁLOGOS DINÁMICOS (01/04/2026)
catalogo_tipos_trabajo       — id UUID PK, nombre TEXT, categoria TEXT, activo BOOL, created_at
catalogo_tipos_mantenimiento — id UUID PK, nombre TEXT, modulo TEXT, activo BOOL, created_at
                               RLS: anon full access en ambas

-- TABLA LEGACY DE INVENTARIO
aperos                       — id UUID PK, codigo, denominacion, marca, estado, ubicacion
                               (tabla legacy, distinta de maquinaria_aperos)

-- TRABAJOS (2 tablas)
trabajos_registro            — id UUID PK, tipo_bloque ENUM(logistica|maquinaria_agricola|mano_obra_interna|mano_obra_externa),
                               fecha, hora_inicio, hora_fin, finca, parcel_id TEXT, tipo_trabajo,
                               num_operarios, nombres_operarios, foto_url, notas, created_by,
                               estado_planificacion TEXT CHECK(borrador|confirmado|ejecutado|pendiente|cancelado) DEFAULT 'borrador',
                               prioridad TEXT CHECK(alta|media|baja) DEFAULT 'media',
                               fecha_planificada DATE, fecha_original DATE,
                               tractor_id UUID FK→maquinaria_tractores ON DELETE SET NULL,
                               apero_id UUID FK→maquinaria_aperos ON DELETE SET NULL
trabajos_incidencias         — id UUID PK, urgente BOOL, titulo, descripcion, finca, parcel_id TEXT,
                               estado ENUM(abierta|en_proceso|resuelta), foto_url, fecha,
                               fecha_resolucion, notas_resolucion, created_by

-- PERSONAL (2 tablas activas)
personal                     — id UUID PK, nombre, dni, telefono,
                               categoria TEXT CHECK(operario_campo|encargado|conductor_maquinaria|conductor_camion),
                               activo, foto_url, qr_code TEXT UNIQUE, notas, created_by
personal_externo             — id UUID PK, nombre_empresa, nif, telefono_contacto,
                               tipo TEXT CHECK(destajo|jornal_servicio), activo, qr_code TEXT UNIQUE,
                               notas, created_by

-- LOGÍSTICA (6 tablas activas)
camiones                     — id UUID PK, matricula UNIQUE, activo, marca, modelo, anio,
                               kilometros_actuales, fecha_itv, fecha_proxima_itv, fecha_proxima_revision,
                               km_proximo_mantenimiento, gps_info, notas_mantenimiento, foto_url,
                               capacidad_kg, empresa_transporte, tipo, created_by,
                               codigo_interno TEXT UNIQUE, estado_operativo TEXT CHECK(disponible|en_uso|mantenimiento|baja)
vehiculos_empresa            — id UUID PK, codigo_interno TEXT UNIQUE, matricula UNIQUE,
                               marca, modelo, anio, tipo CHECK(furgoneta|turismo|pick_up|otro),
                               conductor_habitual_id UUID FK→personal, km_actuales,
                               estado_operativo TEXT CHECK(disponible|en_uso|mantenimiento|baja),
                               fecha_proxima_itv, fecha_proxima_revision, foto_url, notas, gps_info, created_by
logistica_viajes             — id UUID PK, conductor_id UUID FK (legacy), personal_id UUID FK→personal,
                               camion_id, finca, destino, trabajo_realizado, ruta,
                               hora_salida, hora_llegada, gasto_gasolina_litros, gasto_gasolina_euros,
                               km_recorridos, notas, created_by
logistica_mantenimiento      — id UUID PK, camion_id UUID FK, tipo, descripcion, fecha, coste_euros,
                               proveedor, foto_url, foto_url_2, created_by
                               ⚠️ camion_id almacena ID tanto de camión como de vehículo empresa
logistica_combustible        — id UUID PK, vehiculo_tipo TEXT CHECK(camion|vehiculo),
                               vehiculo_id UUID (no FK específico), conductor_id UUID FK→personal,
                               fecha, litros, coste_total, gasolinera, foto_url, notas, created_by
logistica_inventario_sync    — id UUID PK, tipo TEXT CHECK(camion|vehiculo), vehiculo_id UUID,
                               ubicacion_id UUID FK→inventario_ubicaciones, activo BOOL
                               RLS: anon full access
logistica_conductores        — DEPRECATED — solo lectura histórica (nombre, telefono, activo)

-- MAQUINARIA (5 tablas activas)
maquinaria_tractores         — id UUID PK, matricula UNIQUE, marca, modelo, anio, horas_motor,
                               ficha_tecnica, activo, foto_url, notas, fecha_proxima_itv,
                               fecha_proxima_revision, horas_proximo_mantenimiento, gps_info, created_by,
                               codigo_interno TEXT UNIQUE, estado_operativo TEXT CHECK(disponible|en_uso|mantenimiento|baja)
maquinaria_aperos            — id UUID PK, tipo, descripcion, tractor_id UUID FK, activo,
                               foto_url, notas, created_by,
                               codigo_interno TEXT UNIQUE, estado TEXT CHECK(disponible|asignado|en_reparacion|baja)
maquinaria_inventario_sync   — id UUID PK, tipo TEXT CHECK(tractor|apero), maquinaria_id UUID,
                               ubicacion_id UUID FK→inventario_ubicaciones, activo BOOL, created_at
                               RLS: anon full access
maquinaria_uso               — id UUID PK, tractor_id, apero_id, tractorista TEXT NULL (legacy),
                               personal_id UUID FK→personal, finca, parcel_id TEXT, tipo_trabajo,
                               fecha, hora_inicio, hora_fin, horas_trabajadas, gasolina_litros,
                               foto_url, notas, created_by
maquinaria_mantenimiento     — id UUID PK, tractor_id, tipo, descripcion, fecha, horas_motor_al_momento,
                               coste_euros, proveedor, foto_url, foto_url_2, created_by
maquinaria_tractoristas      — DEPRECATED — solo lectura histórica

-- PARTE DIARIO (5 tablas)
partes_diarios               — id UUID PK, fecha DATE UNIQUE, responsable TEXT DEFAULT 'JuanPe', notas_generales
parte_estado_finca           — id UUID PK, parte_id UUID FK, finca, parcel_id TEXT, estado,
                               num_operarios, nombres_operarios, foto_url, foto_url_2, notas
parte_trabajo                — id UUID PK, parte_id UUID FK, tipo_trabajo, finca, ambito,
                               parcelas TEXT[], num_operarios, nombres_operarios,
                               hora_inicio, hora_fin, foto_url, foto_url_2, notas
parte_personal               — id UUID PK, parte_id UUID FK, texto, con_quien, donde, foto_url TEXT NULL, fecha_hora
parte_residuos_vegetales     — id UUID PK, parte_id UUID FK, nombre_conductor, personal_id UUID FK→personal,
                               hora_salida_nave, nombre_ganadero, ganadero_id UUID FK→ganaderos,
                               hora_llegada_ganadero, hora_regreso_nave, foto_url, notas_descarga

-- PROVEEDORES (rev. 17)
proveedores                  — id UUID PK, codigo_interno TEXT UNIQUE (PR001+), nombre TEXT NOT NULL,
                               nif, telefono, email, direccion,
                               tipo TEXT CHECK(proveedor_materiales|ganadero|gestor_residuos_plasticos|otro),
                               persona_contacto, activo BOOL, notas, foto_url, created_at, created_by
                               RLS: anon full access
proveedores_precios          — id UUID PK, proveedor_id UUID FK→proveedores ON DELETE CASCADE,
                               producto TEXT NOT NULL, unidad, precio_unitario NUMERIC, fecha_vigencia DATE,
                               activo BOOL, created_at
                               RLS: anon full access
inventario_entradas          — id UUID PK, proveedor_id UUID FK→proveedores ON DELETE SET NULL,
                               ubicacion_id UUID FK→inventario_ubicaciones,
                               categoria_id UUID FK→inventario_categorias,
                               producto_id UUID FK→inventario_productos_catalogo ON DELETE SET NULL,
                               cantidad NUMERIC NOT NULL, unidad TEXT NOT NULL,
                               precio_unitario NUMERIC, importe_total NUMERIC,
                               receptor TEXT, fecha DATE, foto_albaran TEXT, notas, created_at, created_by
                               RLS: anon full access
                               NOTA: al crear entrada → se crea automáticamente registro en inventario_registros
cierres_jornada              — id UUID PK, fecha DATE NOT NULL UNIQUE,
                               parte_diario_id UUID FK→partes_diarios ON DELETE SET NULL,
                               trabajos_ejecutados INT, trabajos_pendientes INT, trabajos_arrastrados INT,
                               notas, cerrado_at TIMESTAMPTZ, cerrado_by TEXT DEFAULT 'JuanPe'
                               RLS: anon full access
planificacion_campana        — id UUID PK, finca TEXT NOT NULL, parcela TEXT,
                               cultivo TEXT NOT NULL, variedad TEXT,
                               fecha_siembra DATE, fecha_cosecha_estimada DATE,
                               produccion_estimada_kg NUMERIC, precio_venta_estimado NUMERIC,
                               notas TEXT, created_at TIMESTAMPTZ, created_by TEXT DEFAULT 'JuanPe'
                               RLS: anon full access

-- GANADEROS
ganaderos                    — id UUID PK, nombre TEXT NOT NULL, telefono, direccion,
                               activo BOOL DEFAULT true, notas
```

**ENUMs Supabase (verificados en backup_full.sql):**
- `estado_parcela`: activa | plantada | preparacion | cosechada | **vacia** | baja | **en_produccion** | **acolchado**
- `tipo_riego`: goteo | tradicional | aspersion | ninguno
- `tipo_residuo`: plastico_acolchado | cinta_riego | rafia | envase_fitosanitario | otro
- `estado_certificacion`: vigente | suspendida | en_tramite | caducada
- `tipo_suelo`: arcilloso | franco | arenoso | limoso | franco_arcilloso
- `ai_proposal_category`: analysis | planning | report
- `ai_proposal_status`: pending | approved | rejected | executed | failed
- `ai_validation_decision`: approved | rejected

---

## ESTRUCTURA DE PÁGINAS CLAVE

| Archivo | Descripción real |
|---|---|
| `Dashboard.tsx` | Completo con clima, KPIs globales, panel LIA de observación IA, maquinaria en tiempo real. |
| `FarmSelector.tsx` | Grid 7 fincas reales |
| `FarmMap.tsx` | Mapa 119 sectores, soporte de marcadores vivos (tractores), PDF, inspecciones en campo. |
| `Inventario.tsx` | Grid 6 ubicaciones + KPIs + PDF global |
| `InventarioUbicacion.tsx` | 7 categorías + bridge table activos + panel lateral + modales + Excel/PDF |
| `Trabajos.tsx` | 4 sub-bloques + incidencias + selector cascada + menú PDF ejecutivo (`generarPDFCorporativoBase`, 5 variantes; datos globales con `useRegistrosTrabajos()` sin filtro) |
| `Maquinaria.tsx` | Tractores+aperos+uso+mant+**Tab GPS** (telemetría con paradas >5min), tractorista desde Personal |
| `Personal.tsx` | 5 tabs, fichas expandibles, QR auto, PDF |
| `PresenciaPanel.tsx` | Modelo completo: filtros cuadrilla/finca/rango fechas, tabla en tiempo real presencia activa (cuadrilla/parcela/entrada/tiempo acumulado HH:MM:SS), tabla resumen horas (cuadrilla/total horas/parcelas/tipo trabajo), PDF corporativo 2 secciones, Excel 2 hojas, lógica calcularResumen() con agregación desde presencia_tiempo_real |
| `EstadoGeneral.tsx` | useAlertas() inline — consulta 5 tablas — no usa hooks externos |
| `Historicos.tsx` | useHistoricos() inline — consulta 6 tablas — no usa hooks externos |
| `ExportarPDF.tsx` | PDF global multi-módulo (Exportación completa de los 6 módulos) + 5 Reportes Agronómicos Específicos (Suelo con sparklines, Cosecha, Certificación, Residuos, Hídrica) |
| `QRCuadrilla.tsx` | Pantalla fullscreen móvil — sin sidebar — usa useInsertWorkRecordQR |

---

## NAVEGACIÓN GLOBAL (rev. 6 — 29/03/2026)

- **Sidebar global**: overlay accesible desde botón hamburguesa `fixed top-3 left-3`
- **AppLayout.tsx**: wrapper transparente que envuelve todas las rutas excepto `/qr/:cuadrilla_id`
- **SidebarContext**: estado global open/close (patrón ThemeContext)
- **GlobalSidebar.tsx**: accordion (solo CAMPO e INVENTARIO tienen children reales), auto-open por ruta, cierre con Escape, scroll al activo
- **Headers con back-button**: usar `pl-14 pr-N` (no `px-N`) para reservar espacio al hamburguesa
- **Botón tema**: `fixed top-3 right-4 z-[60]`

---

## DISEÑO VISUAL

**Fondo:** `bg-[#020617]` | **Acento:** `#38bdf8` | **Paneles:** `bg-slate-900`
**Tipografía:** Inter | **Tema:** oscuro/claro via ThemeContext + `localStorage('marvic-theme')`

**Colores de módulo:**
- CAMPO: `#22c55e` | INVENTARIO: `#38bdf8` | TRABAJOS: `#f59e0b` | LOGÍSTICA: `#a78bfa`
- MAQUINARIA: `#fb923c` | PERSONAL: `#e879f9` | PARTE DIARIO: `#4ade80`
- ESTADO GENERAL/HISTÓRICOS/EXPORTAR PDF: `#94a3b8`
- WIP (Trazabilidad/Materiales/Auditoría): `#475569`

**⚠️ FarmMap:** usa clases hardcoded oscuras — NO tiene variantes `dark:` aún.

**Clases de botón estándar (definidas en index.css):**
- `.btn-primary` — `bg-sky-400 text-slate-900` — acciones principales (guardar, confirmar)
- `.btn-secondary` — `border border-slate-600 text-slate-300` — acciones neutras (cancelar, ver)
- `.btn-danger` — `border border-red-500/50 text-red-400` — eliminar, acciones destructivas

**Tipografía base:** Inter, 14px (`text-sm` = default en formularios y listas)

**Patrón PDF (común en todos los módulos):**
- Import estático: `import jsPDF from 'jspdf'` — NUNCA dynamic import
- Usar `initPdf()` de `pdfUtils.ts` para nuevos PDFs
- Descarga automática con nombre descriptivo tipo `Módulo_YYYY-MM-DD.pdf`

---

## ALERTAS CRÍTICAS — NO ROMPER NUNCA

1. `parcel_id` es **TEXT** en **TODAS** las tablas sin excepción
2. Estado parcela usa `'vacia'` — **NUNCA** `'empty'`; `'en_produccion'` — **NUNCA** `'produccion'`
3. GeoJSON ya está en WGS84 — NO aplicar conversión UTM nunca
4. Navegación a fincas usa `encodeURIComponent(ruta)` en el link
5. El panel antiguo de bottom sheet fue ELIMINADO — no restaurar
6. Bucket Storage `parcel-images` — fotos parcelas, trabajos, personal, maquinaria
7. Bucket Storage `inventario-images` — fotos inventario
8. Bucket Storage `partes-images` — fotos parte diario
9. Solo existen **7 fincas reales** — no crear ni asumir fincas de prueba
10. jsPDF se importa **estático**: `import jsPDF from 'jspdf'` — NO `await import('jspdf')`
11. `UploadParcelPhoto.tsx` usa spinner CSS — **NO** Loader2 (causaba error DOM)
12. `logistica_conductores` y `maquinaria_tractoristas` son tablas **deprecated** — solo lectura histórica
13. Campos UUID: usar `?? null` — **NUNCA** `|| null` (0 y `""` son falsy, UUID nunca es 0)
14. Campos numéricos con 0 válido: usar `> 0 ? valor : null` — **NUNCA** `valor || null`
15. Mezcla `??` + `||` en la misma expresión: siempre con paréntesis explícitos o TypeScript falla
16. Sidebar: fuente única de navegación en `navItems.ts` — añadir módulos solo ahí
17. Rutas WIP (trazabilidad/materiales/auditoria): están en navItems con `activo: false` pero NO tienen página ni ruta en App.tsx
18. `useLogistica.useCamiones()` es la FUENTE PRINCIPAL — NO usar `useParcelData.useCamiones()`
19. `useConductores` en useLogistica **NO EXISTE** — conductores = personal con categoria='conductor_camion'
20. `inventario_registros` NO tiene campo `responsable` en BD (solo `created_by`)
21. `inventario_ubicacion_activo` es la tabla puente para asignar tractores/aperos a ubicaciones — documentarla en nuevas features

---

## CONVENCIÓN DE OPERADORES

- Campos UUID / IDs: usar `?? null` — nunca `|| null`
- Campos texto de formulario (string → BD): `|| null` es correcto (convierte `""` a null)
- Campos numéricos con 0 válido: usar comparación explícita (`> 0 ? x : null`)
- Mezcla `??` + `||`: siempre entre paréntesis para evitar error de compilación TS

---

## ERRORES CONOCIDOS DEL ENTORNO

| Error | Causa | Workaround |
|---|---|---|
| `npm run build` falla `SyntaxError` | Node v12 del sistema no soporta Vite | `~/.nvm/versions/node/v20.20.1/bin/node ./node_modules/.bin/vite build` |
| `npx tsc --noEmit` falla | Node v12 no soporta TS moderno | Usar build de Vite con Node v20 |
| `SyntaxError: Unexpected token '?'` | Node v12 no soporta optional chaining | El código es correcto, solo afecta al CLI |

---

## SQL APLICADO EN SUPABASE (histórico)

```sql
-- ✅ rev.5 (28/03/2026)
ALTER TABLE parte_personal ADD COLUMN IF NOT EXISTS foto_url TEXT;
ALTER TABLE maquinaria_uso ADD COLUMN IF NOT EXISTS foto_url TEXT;
ALTER TABLE maquinaria_uso ALTER COLUMN tractorista DROP NOT NULL;
```

**types.ts confirma:**
- `parte_personal.Row.foto_url: string | null` ✅
- `maquinaria_uso.Row.foto_url: string | null` ✅
- `maquinaria_uso.Row.tractorista: string | null` ✅

-- ✅ rev.31 (Sesión actual)
-- Creadas tablas de Telemetría GPS: vehicle_positions
-- Creadas tablas de Riego Inteligente: sistema_riego_zonas, registros_riego
-- Creadas tablas de Trazabilidad Palots: camaras_almacen, palots, movimientos_palot
-- Creadas tablas de Inteligencia LIA: ai_proposals, ai_proposal_validations
-- Creada tabla vuelos_dron
-- Modificada tabla fotos_campo agregando latitud, longitud (NUMERIC), tipo (TEXT)

-- ✅ rev.32 (Sesión actual)
-- Creada función RPC transaccional cerrar_jornada_atomica para garantizar integridad al cerrar el día
-- (Se encarga de marcar ejecutados, copiar pendientes y arrastrar incidencias urgentes al día siguiente)

---

## TABLA PERSONAL — FUENTE ÚNICA

```
categoria = 'conductor_camion'      → Logística (selector conductor viajes)
categoria = 'conductor_maquinaria'  → Maquinaria (selector tractorista uso)
categoria = 'operario_campo'        → Trabajos, ParteDiario (operarios)
categoria = 'encargado'             → Administración de personal
```

**REGLA:** NO leer de `logistica_conductores` ni `maquinaria_tractoristas`. Son deprecated.

---

## ESTADO DEL SISTEMA — RESUMEN EJECUTIVO (05/04/2026)

```
Sistema funcional al ~99%
━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ 13 módulos operativos + sidebar global
✅ Dashboard limpio (logo + reloj + fecha)
✅ Sidebar accordion (CAMPO/INVENTARIO con submódulos reales)
✅ EstadoGeneral: alertas ITV, revisión, mantenimiento, incidencias, certs, sensores
✅ Históricos: buscador global multi-módulo con filtros
✅ ExportarPDF: PDF global (Parte Diario, Trabajos, Maquinaria, Logística)
✅ Motor PDF unificado (pdfUtils.ts)
✅ Validaciones centralizadas (validation.ts)
✅ Inventario: bridge table inventario_ubicacion_activo para tractores/aperos
✅ Personal como fuente única de conductores/tractoristas
✅ Foto en Bloque C Parte Diario (foto opcional)
✅ Foto obligatoria en uso de maquinaria
✅ tractorista nullable — personal_id es fuente real
✅ SQL planificación ejecutado (planificacion_campana, cierres_jornada)
✅ Cierre de jornada automático completamente funcional
✅ Inventario: Proveedores + Entradas de Stock con tabs, modales, filtros, precios
✅ Fotos de campo con geolocalización automática, galería visual en historial de parcela y formulario de inspección (InspeccionForm).
✅ Overlay agronómico en mapa (pH, EC, N, P, K, MO), gráficos Recharts de evolución en ParcelHistory y alertas agronómicas automáticas en EstadoGeneral.
✅ Módulo Riego: tablas de zonas y registros creadas, integración de bloque "Riego del día" en formulario de Estado Unificado.
✅ Variantes dark mode en FarmMap.tsx y pestaña de Riegos en ParcelHistory.tsx implementadas.
✅ Módulo Trazabilidad: Página con tabs de Palots, Cámaras y Escáner QR de lote; captura de geolocalización y ciclo de vida (en campo, en transporte, en almacén, expedido) integrado.
✅ Módulo ERP: Página lista para exportar producción, costes y análisis como CSV/JSON.
✅ Refactor Parte Diario: División en subcomponentes memoizados (`FormEstadoFinca`, `FormTrabajosRealizado`, `FormAnotacionesLibres`, `FormLogisticaResiduos`), aislando el estado y reduciendo re-renders.
✅ Quick Wins QA (Fase 15 QA): Eliminados casteos "any" obsoletos y unificado uso de RPC para cierre de jornada atómico.

⚠️ PENDIENTES:
  - FarmMap sin variantes dark: (P1.1)
  - ExportarPDF: Personal y Campo sin datos en generador
  - QRCuadrilla UI: funcional pero puede necesitar refinamiento UX

🔴 NO IMPLEMENTADOS:
```

---

## PENDIENTES REALES (por prioridad)

### PRIORIDAD 1

### PRIORIDAD 2
- **ExportarPDF Personal**: implementar carga y sección Personal en generador PDF
- **ExportarPDF Campo**: implementar carga y sección Campo/Parcelas en generador PDF
- **Módulo TRAZABILIDAD**: página + rutas + cadena semilla→cosecha→camión por sector
- **Módulo MATERIALES**: página + fitosanitarios, riego y plástico de campo
- **Módulo AUDITORÍA**: página + certificaciones, trazas, logs

### PRIORIDAD 3
- Sistema riego: tablas + RegisterRiegoForm + hooks
- Fotos reales de ubicaciones inventario
- Integración ERP actual de Marvic

### PRIORIDAD 4
- Autenticación Supabase + roles — RLS actual para `anon`
- PWA + modo offline IndexedDB
- Despliegue Vercel + dominio marvic360.es
- IA planificación campaña (activar Julio 2026)

---

## CONTEXTO DE NEGOCIO

JuanPe recoge datos en campo desde el 1 de Abril 2026:
- **Hanna HI9814** → pH, EC, salinidad, temperatura suelo
- **Kit LaMotte NPK** → Nitrógeno, Fósforo, Potasio
- **Sensor SPAD/NDVI** → Salud vegetal, clorofila, estrés hídrico
- **Dron DJI** → Vuelos de inspección aérea
- **GPS Teltonika FMC920** → Tractores (pendiente instalación)

El sistema NO tiene datos históricos digitales todavía. Todo se construye desde cero a partir del 1 de Abril 2026.

---

## CÓMO EMPEZAR CADA SESIÓN

1. Lee este archivo CLAUDE.md completo
2. Lee los archivos relevantes a la tarea concreta
3. Espera a que JuanPe diga qué quiere hacer
4. Muestra el plan antes de ejecutar
5. Un archivo a la vez, con verificación build entre cada cambio

CLAUDE_rev16_append.txt al final de tu CLAUDE.md.

Resumen de lo entregado:

useTrabajos.ts — 19 hooks: todos los existentes intactos + usePlanificacionDia, useAddTrabajoPlanificado, useUpdateTrabajoPlanificado, useDeleteTrabajo, useUpdateEstadoPlanificacion, usePlanificacionCampana, useAddPlanificacionCampana, useUpdatePlanificacionCampana, useDeletePlanificacionCampana, useCierresJornada, useAddCierreJornada, useCerrarJornada
Trabajos.tsx — módulo completamente refactorizado: título PLANIFICACIÓN DE TRABAJOS, 3 tabs, panel estado día con navegador, badges prioridad/estado solo borde, RecordActions en todo, SelectWithOther/AudioInput/PhotoAttachment en todos los modales, lógica cierre jornada completa, diseño sin emojis