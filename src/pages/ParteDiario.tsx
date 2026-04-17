import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, ChevronDown, FileText, LogOut,
} from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import type { Tables } from '@/integrations/supabase/types'
import {
  usePartePorFecha,
  useEnsureParteHoy,
  useEstadosFinca,
  useTrabajos,
  usePersonales,
  useResiduos,
  useDeleteEntradaParte,
} from '@/hooks/useParteDiario'
import { useCerrarJornada } from '@/hooks/useTrabajos'
import { NavegadorFechas } from '@/components/ParteDiario/NavegadorFechas'
import { FormEstadoFinca } from '@/components/ParteDiario/FormEstadoFinca'
import { FormTrabajosRealizado } from '@/components/ParteDiario/FormTrabajosRealizado'
import { FormAnotacionesLibres } from '@/components/ParteDiario/FormAnotacionesLibres'
import { FormLogisticaResiduos } from '@/components/ParteDiario/FormLogisticaResiduos'
import { formatHora } from '@/utils/dateFormat'
import {
  loadPdfImage,
  type PdfImage,
  paintMarvicLetterhead,
  applyCorporateFootersAllPages,
  PDF_BRAND,
  registerMontserratLetterheadFonts,
  downloadJsPdf,
} from '@/utils/pdfUtils'
import { ejecutarCosechaDiaria } from '@/utils/liaCosechadora'
import { ESTADOS_PARCELA } from '@/constants/estadosParcela'
import { toast } from '@/hooks/use-toast'
import { PageShell } from '@/components/layout/PageShell'
import jsPDF from 'jspdf'

// ─── Constantes ──────────────────────────────────────────────────────────────

const HOY = new Date().toISOString().split('T')[0]

// ─── Fecha cabecera ejecutiva: "miércoles, 25 de marzo de 2026" ───────────────

function formatFechaEjecutiva(fecha: string): string {
  try {
    return new Date(fecha + 'T12:00:00').toLocaleDateString('es-ES', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    })
  } catch {
    return fecha
  }
}

function addDaysISO(fecha: string, days: number): string {
  const d = new Date(fecha + 'T12:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

/** Bloque C: INCIDENCIA si el texto contiene la palabra "incidencia". */
function esIncidenciaPartePersonal(texto: string): boolean {
  return /\bincidencia\b/i.test(texto)
}

function estadoPartePersonalRow(texto: string): 'COMPLETADO' | 'INCIDENCIA' {
  return esIncidenciaPartePersonal(texto) ? 'INCIDENCIA' : 'COMPLETADO'
}

function prioridadPlanningDesdeNotas(notas: string | null): 'ALTA' | 'MEDIA' {
  if (/\b(urgente|prioridad\s*alta|crític|critico)\b/i.test(notas ?? '')) return 'ALTA'
  return 'MEDIA'
}

type EntradaPDF =
  | { ts: string; tipo: 'A'; data: Tables<'parte_estado_finca'> }
  | { ts: string; tipo: 'B'; data: Tables<'parte_trabajo'> }
  | { ts: string; tipo: 'C'; data: Tables<'parte_personal'> }
  | { ts: string; tipo: 'D'; data: Tables<'parte_residuos_vegetales'> }

function buildEntradasOrdenadas(
  estadosFinca: Tables<'parte_estado_finca'>[],
  trabajos: Tables<'parte_trabajo'>[],
  personales: Tables<'parte_personal'>[],
  residuos: Tables<'parte_residuos_vegetales'>[],
): EntradaPDF[] {
  return [
    ...estadosFinca.map(e => ({ ts: e.created_at, tipo: 'A' as const, data: e })),
    ...trabajos.map(e => ({ ts: e.hora_inicio ?? e.created_at, tipo: 'B' as const, data: e })),
    ...personales.map(e => ({ ts: e.fecha_hora, tipo: 'C' as const, data: e })),
    ...residuos.map(e => ({ ts: e.hora_salida_nave ?? e.created_at, tipo: 'D' as const, data: e })),
  ].sort((a, b) => a.ts.localeCompare(b.ts))
}

function computeInicioJornada(entradas: EntradaPDF[]): string {
  const times: number[] = []
  for (const e of entradas) {
    if (e.tipo === 'A') times.push(new Date(e.data.created_at).getTime())
    if (e.tipo === 'B' && e.data.hora_inicio) times.push(new Date(e.data.hora_inicio).getTime())
    if (e.tipo === 'C') times.push(new Date(e.data.fecha_hora).getTime())
    if (e.tipo === 'D' && e.data.hora_salida_nave) times.push(new Date(e.data.hora_salida_nave).getTime())
  }
  if (times.length === 0) return '—'
  const min = new Date(Math.min(...times))
  return `${min.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} h`
}

function collectZonasTrabajo(entradas: EntradaPDF[]): string {
  const set = new Set<string>()
  for (const e of entradas) {
    if (e.tipo === 'A' && e.data.finca) set.add(e.data.finca)
    if (e.tipo === 'B' && e.data.finca) set.add(e.data.finca)
  }
  return [...set].filter(Boolean).join(' / ') || '—'
}

function collectNombresPersonal(entradas: EntradaPDF[]): string {
  const names = new Set<string>()
  for (const e of entradas) {
    if (e.tipo === 'A' && e.data.nombres_operarios) {
      e.data.nombres_operarios.split(/[,;]/).map(s => s.trim()).filter(Boolean).forEach(n => names.add(n))
    }
    if (e.tipo === 'B' && e.data.nombres_operarios) {
      e.data.nombres_operarios.split(/[,;]/).map(s => s.trim()).filter(Boolean).forEach(n => names.add(n))
    }
    if (e.tipo === 'C' && e.data.con_quien) {
      e.data.con_quien.split(/[,;]/).map(s => s.trim()).filter(Boolean).forEach(n => names.add(n))
    }
  }
  return [...names].join(', ') || '—'
}

/**
 * Motor de formato corporativo ejecutivo para todos los PDFs del Parte Diario.
 * Cabecera por página, pie con firma y numeración; contenido sobre fondo blanco.
 */
async function generarPDFCorporativo(
  tituloInforme: string,
  subtituloInforme: string,
  fechaISO: string,
  logoData: PdfImage | null,
) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  await registerMontserratLetterheadFonts(doc)
  const M = 14
  const PAGE_W = 210
  const PAGE_H = 297
  const TW = PAGE_W - 2 * M
  const FOOTER_LINE_Y = 282
  const FOOTER_TEXT_Y = 287
  const CONTENT_MAX_Y = FOOTER_LINE_Y - 6

  let y = M
  const fechaLarga = formatFechaEjecutiva(fechaISO)

  function drawHeader() {
    doc.setFillColor(255, 255, 255)
    doc.rect(0, 0, PAGE_W, PAGE_H, 'F')
    y = paintMarvicLetterhead(doc, logoData, {
      titulo: tituloInforme,
      subtitulo: subtituloInforme,
      fechaTexto: fechaLarga,
    })
  }

  function checkPage(need: number) {
    if (y + need > CONTENT_MAX_Y) {
      doc.addPage()
      y = M
      drawHeader()
    }
  }

  /** Resumen 2 columnas (solo parte completo). Sin borde exterior. */
  function addResumenDosColumnas(rows: Array<{ label: string; value: string }>) {
    let stripe = 0
    const rowH = 6
    const labelX = M + 2
    const valueX = M + 52
    for (const row of rows) {
      const valueLines = doc.splitTextToSize(row.value, TW - 56) as string[]
      const linesH = Math.max(1, valueLines.length) * 4.2 + 2
      checkPage(linesH + rowH)
      const fill = stripe % 2 === 0 ? [255, 255, 255] : [...PDF_BRAND.rowAlt]
      doc.setFillColor(fill[0], fill[1], fill[2])
      doc.rect(M, y - 4.5, TW, Math.max(rowH, linesH + 1), 'F')
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(...PDF_BRAND.muted)
      doc.text(row.label, labelX, y)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(...PDF_BRAND.green)
      let yy = y
      valueLines.forEach((line, i) => {
        if (i > 0) {
          yy += 4.2
          checkPage(5)
        }
        doc.text(line, valueX, yy)
      })
      y = yy + 5
      stripe++
      doc.setFont('helvetica', 'normal')
    }
    y += 2
  }

  function addSectionHeader(letra: string, titulo: string, horario: string) {
    checkPage(10)
    doc.setFillColor(...PDF_BRAND.green)
    doc.rect(M, y, TW, 7, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    const extra = horario ? `  ${horario}` : ''
    doc.text(`[${letra}] ${titulo.toUpperCase()}${extra}`, M + 2, y + 4.8)
    y += 9
    doc.setTextColor(...PDF_BRAND.green)
  }

  let pairStripe = 0

  function resetPairStripe() {
    pairStripe = 0
  }

  function addKeyValueRow(label: string, value: string | null | undefined) {
    if (value === null || value === undefined || value === '') return
    const lines = doc.splitTextToSize(String(value), TW - 58) as string[]
    const blockH = 5 + lines.length * 4
    checkPage(blockH + 2)
    const fill = pairStripe % 2 === 0 ? [255, 255, 255] : [...PDF_BRAND.rowAlt]
    doc.setFillColor(fill[0], fill[1], fill[2])
    doc.rect(M, y - 4, TW, blockH + 1, 'F')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...PDF_BRAND.muted)
    doc.text(label, M + 2, y)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...PDF_BRAND.green)
    let yy = y
    lines.forEach((ln, i) => {
      if (i > 0) {
        yy += 4
        checkPage(4)
      }
      doc.text(ln, M + 55, yy)
    })
    y = yy + 5
    pairStripe++
  }

  async function addPhoto120(url: string | null, pie: string) {
    if (!url) return
    const img = await loadPdfImage(url)
    if (!img) return
    const w = 120
    const h = Math.min(w * (img.natH / img.natW), 95)
    checkPage(h + 14)
    const x = (PAGE_W - w) / 2
    doc.addImage(img.b64, 'JPEG', x, y, w, h)
    y += h + 2
    if (pie) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(...PDF_BRAND.muted)
      const capLines = doc.splitTextToSize(pie, TW) as string[]
      capLines.forEach(ln => {
        checkPage(4)
        doc.text(ln, PAGE_W / 2, y, { align: 'center' })
        y += 3.5
      })
    }
    y += 2
  }

  /** Tabla HORA | ACTIVIDAD | ESTADO (bloque C). */
  function addTablaPartePersonal(
    filas: Array<{ hora: string; actividad: string; estado: 'COMPLETADO' | 'INCIDENCIA' }>,
  ) {
    checkPage(14)
    const c1 = M + 2
    const c2 = M + 24
    const c3 = M + 138
    const headerH = 6
    doc.setFillColor(...PDF_BRAND.green)
    doc.rect(M, y, TW, headerH, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(255, 255, 255)
    doc.text('HORA', c1, y + 4.2)
    doc.text('ACTIVIDAD', c2, y + 4.2)
    doc.text('ESTADO', c3, y + 4.2)
    y += headerH + 1
    let stripe = 0
    for (const f of filas) {
      const actLines = doc.splitTextToSize(f.actividad, 108) as string[]
      const rowH = Math.max(6, actLines.length * 3.8 + 2)
      checkPage(rowH + 1)
      const fill = stripe % 2 === 0 ? [255, 255, 255] : [...PDF_BRAND.rowAlt]
      doc.setFillColor(fill[0], fill[1], fill[2])
      doc.rect(M, y - 1, TW, rowH, 'F')
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(...PDF_BRAND.muted)
      doc.text(f.hora, c1, y + 3.5)
      doc.setTextColor(...PDF_BRAND.green)
      let yy = y + 3.5
      actLines.forEach(ln => {
        doc.text(ln, c2, yy)
        yy += 3.8
      })
      doc.setFont('helvetica', 'bold')
      if (f.estado === 'INCIDENCIA') {
        doc.setTextColor(239, 68, 68)
      } else {
        doc.setTextColor(...PDF_BRAND.green)
      }
      doc.text(f.estado, c3, y + 3.5)
      y += rowH
      stripe++
    }
    y += 3
    doc.setTextColor(...PDF_BRAND.green)
  }

  /** Tabla planning: Nº | TAREA | RESPONSABLE | PRIORIDAD */
  function addTablaPlanning(
    filas: Array<{ num: number; tarea: string; responsable: string; prioridad: 'ALTA' | 'MEDIA' }>,
  ) {
    checkPage(14)
    const colN = M + 3
    const colT = M + 14
    const colR = M + 95
    const colP = M + 155
    const headerH = 6
    doc.setFillColor(...PDF_BRAND.green)
    doc.rect(M, y, TW, headerH, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(255, 255, 255)
    doc.text('Nº', colN, y + 4.2)
    doc.text('TAREA', colT, y + 4.2)
    doc.text('RESPONSABLE', colR, y + 4.2)
    doc.text('PRIORIDAD', colP, y + 4.2)
    y += headerH + 1
    let stripe = 0
    for (const f of filas) {
      const tLines = doc.splitTextToSize(f.tarea, 75) as string[]
      const rowH = Math.max(6, tLines.length * 3.8 + 2)
      checkPage(rowH + 1)
      const fill = stripe % 2 === 0 ? [255, 255, 255] : [...PDF_BRAND.rowAlt]
      doc.setFillColor(fill[0], fill[1], fill[2])
      doc.rect(M, y - 1, TW, rowH, 'F')
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(...PDF_BRAND.green)
      doc.text(String(f.num), colN, y + 3.5)
      let yy = y + 3.5
      tLines.forEach(ln => {
        doc.text(ln, colT, yy)
        yy += 3.8
      })
      doc.text(f.responsable || '—', colR, y + 3.5)
      doc.setFont('helvetica', 'bold')
      if (f.prioridad === 'ALTA') {
        doc.setTextColor(239, 68, 68)
      } else {
        doc.setTextColor(...PDF_BRAND.muted)
      }
      doc.text(f.prioridad, colP, y + 3.5)
      y += rowH
      stripe++
    }
    y += 3
    doc.setTextColor(...PDF_BRAND.green)
  }

  function addMutedParagraph(texto: string) {
    checkPage(12)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(...PDF_BRAND.muted)
    const lines = doc.splitTextToSize(texto, TW) as string[]
    lines.forEach(ln => {
      checkPage(5)
      doc.text(ln, M, y)
      y += 4.5
    })
    y += 2
  }

  function finalize(filename: string) {
    applyCorporateFootersAllPages(doc, new Date(fechaISO + 'T12:00:00'))
    downloadJsPdf(doc, filename)
  }

  drawHeader()

  return {
    doc,
    checkPage,
    addResumenDosColumnas,
    addSectionHeader,
    resetPairStripe,
    addKeyValueRow,
    addPhoto120,
    addTablaPartePersonal,
    addTablaPlanning,
    addMutedParagraph,
    finalize,
  }
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function ParteDiario() {
  const navigate = useNavigate()
  const pdfMenuRef = useRef<HTMLDivElement>(null)
  const [fecha, setFecha]           = useState(HOY)
  const [generandoPdf, setGenPdf]   = useState(false)
  const [pdfMenuOpen, setPdfMenuOpen] = useState(false)

  const esHoy = fecha === HOY

  // Cerrar jornada
  const [showCierre, setShowCierre] = useState(false)
  const [cierreResultado, setCierreResultado] = useState<{
    ejecutados: number; pendientes: number; arrastrados: number; incidenciasArrastradas: number
  } | null>(null)

  const ensureHoy                             = useEnsureParteHoy()
  const { data: parte, isLoading: cargando }  = usePartePorFecha(fecha)
  const parteId                               = parte?.id ?? null

  const { data: estadosFinca = [] }  = useEstadosFinca(parteId)
  const { data: trabajos      = [] } = useTrabajos(parteId)
  const { data: personales    = [] } = usePersonales(parteId)
  const { data: residuos      = [] } = useResiduos(parteId)

  const deleteEntrada  = useDeleteEntradaParte()
  const cerrarJornada  = useCerrarJornada()

  // Asegurar parte del día actual al montar y al cambiar a hoy
  useEffect(() => {
    if (fecha === HOY) {
      ensureHoy.mutate(HOY)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fecha])

  useEffect(() => {
    if (!pdfMenuOpen) return
    function onDown(ev: MouseEvent) {
      if (pdfMenuRef.current && !pdfMenuRef.current.contains(ev.target as Node)) {
        setPdfMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [pdfMenuOpen])

  // ── Navegación de fechas ──
  function irAnterior() {
    const d = new Date(fecha + 'T12:00:00')
    d.setDate(d.getDate() - 1)
    setFecha(d.toISOString().split('T')[0])
  }
  function irSiguiente() {
    const d = new Date(fecha + 'T12:00:00')
    d.setDate(d.getDate() + 1)
    const sig = d.toISOString().split('T')[0]
    if (sig <= HOY) setFecha(sig)
  }

  // ── Cerrar jornada ──
  async function handleCerrarJornada() {
    if (!parteId || !confirm('¿Cerrar la jornada de hoy? Se marcarán trabajos ejecutados/pendientes y se arrastrarán a mañana.')) return
    try {
      const res = await cerrarJornada.mutateAsync(fecha)
      setCierreResultado(res as { ejecutados: number; pendientes: number; arrastrados: number; incidenciasArrastradas: number })
      setShowCierre(true)
      // Ejecutar cosechadora LIA sin bloquear
      ejecutarCosechaDiaria(fecha)
    } catch (e) {
      alert('Error al cerrar jornada: ' + (e instanceof Error ? e.message : String(e)))
    }
  }

  // ── Eliminar entrada ──
  function eliminar(tabla: string, id: string) {
    if (!parteId) return
    deleteEntrada.mutate({ tabla, id, parteId })
  }

  // ─────────────────────────────────────────────────────────────────
  // PDF — formato corporativo ejecutivo (5 variantes)
  // ─────────────────────────────────────────────────────────────────

  async function fetchIncidenciasTrabajosDelDia(fechaDia: string) {
    const { data, error } = await supabase
      .from('trabajos_incidencias')
      .select('*')
      .eq('fecha', fechaDia)
      .order('created_at')
    if (error) throw error
    return data ?? []
  }

  async function fetchPlanningManana(fechaActual: string) {
    const manana = addDaysISO(fechaActual, 1)
    const { data: parteM, error: e1 } = await supabase
      .from('partes_diarios')
      .select('id')
      .eq('fecha', manana)
      .maybeSingle()
    if (e1) throw e1
    if (!parteM?.id) return { manana, tareas: [] as Tables<'parte_trabajo'>[] }
    const { data: tareas, error: e2 } = await supabase
      .from('parte_trabajo')
      .select('*')
      .eq('parte_id', parteM.id)
      .order('created_at')
    if (e2) throw e2
    return { manana, tareas: tareas ?? [] }
  }

  async function generarParteCompleto() {
    if (!parteId) return
    setGenPdf(true)
    try {
      const logoData = await loadPdfImage(`${window.location.origin}/MARVIC_logo.png`)
      const pdf = await generarPDFCorporativo(
        'PARTE DIARIO',
        'Informe integral de la jornada',
        fecha,
        logoData,
      )
      const entradas = buildEntradasOrdenadas(estadosFinca, trabajos, personales, residuos)
      const responsable = parte?.responsable ?? 'JuanPe'
      pdf.addResumenDosColumnas([
        { label: 'Responsable', value: responsable },
        { label: 'Inicio jornada', value: computeInicioJornada(entradas) },
        { label: 'Zonas de trabajo', value: collectZonasTrabajo(entradas) },
        { label: 'Personal implicado', value: collectNombresPersonal(entradas) },
      ])

      if (entradas.length === 0) {
        pdf.addMutedParagraph('Sin entradas registradas para este día.')
      }

      for (const entrada of entradas) {
        if (entrada.tipo === 'A') {
          const e = entrada.data
          pdf.addSectionHeader('A', 'ESTADO FINCA / PARCELA', formatHora(e.created_at))
          pdf.resetPairStripe()
          pdf.addKeyValueRow('Finca', e.finca)
          pdf.addKeyValueRow('Parcela / Sector', e.parcel_id)
          pdf.addKeyValueRow('Estado', ESTADOS_PARCELA.find(s => s.value === e.estado)?.label ?? e.estado ?? null)
          pdf.addKeyValueRow('Número de operarios', e.num_operarios?.toString())
          pdf.addKeyValueRow('Nombres operarios', e.nombres_operarios)
          pdf.addKeyValueRow('Notas', e.notas)
          await pdf.addPhoto120(e.foto_url, 'Fotografía del estado (1)')
          await pdf.addPhoto120(e.foto_url_2, 'Fotografía del estado (2)')
        } else if (entrada.tipo === 'B') {
          const e = entrada.data
          const rangoHora = e.hora_inicio
            ? `${formatHora(e.hora_inicio)} → ${formatHora(e.hora_fin)}`
            : formatHora(e.created_at)
          pdf.addSectionHeader('B', 'TRABAJO EN CURSO', rangoHora)
          pdf.resetPairStripe()
          pdf.addKeyValueRow('Tipo de trabajo', e.tipo_trabajo)
          pdf.addKeyValueRow('Finca', e.finca)
          pdf.addKeyValueRow('Ámbito', e.ambito === 'finca_completa' ? 'Finca completa' : 'Parcelas concretas')
          if (e.parcelas?.length) pdf.addKeyValueRow('Parcelas', e.parcelas.join(', '))
          pdf.addKeyValueRow('Número de operarios', e.num_operarios?.toString())
          pdf.addKeyValueRow('Nombres operarios', e.nombres_operarios)
          if (e.hora_inicio) pdf.addKeyValueRow('Hora inicio', formatHora(e.hora_inicio))
          if (e.hora_fin) pdf.addKeyValueRow('Hora fin', formatHora(e.hora_fin))
          pdf.addKeyValueRow('Notas', e.notas)
          await pdf.addPhoto120(e.foto_url, 'Fotografía del trabajo (1)')
          await pdf.addPhoto120(e.foto_url_2, 'Fotografía del trabajo (2)')
        } else if (entrada.tipo === 'C') {
          const e = entrada.data
          pdf.addSectionHeader('C', 'PARTE PERSONAL JUANPE', formatHora(e.fecha_hora))
          pdf.resetPairStripe()
          pdf.addKeyValueRow('Texto', e.texto)
          pdf.addKeyValueRow('Con quién', e.con_quien)
          pdf.addKeyValueRow('Dónde', e.donde)
          await pdf.addPhoto120(e.foto_url, 'Fotografía — parte personal')
        } else if (entrada.tipo === 'D') {
          const e = entrada.data
          pdf.addSectionHeader(
            'D',
            'RESIDUOS VEGETALES',
            e.hora_salida_nave ? `${formatHora(e.hora_salida_nave)}` : '',
          )
          pdf.resetPairStripe()
          pdf.addKeyValueRow('Conductor', e.nombre_conductor)
          pdf.addKeyValueRow('Hora salida nave', formatHora(e.hora_salida_nave))
          pdf.addKeyValueRow('Ganadero / Destino', e.nombre_ganadero)
          pdf.addKeyValueRow('Hora llegada ganadero', formatHora(e.hora_llegada_ganadero))
          pdf.addKeyValueRow('Hora regreso nave', formatHora(e.hora_regreso_nave))
          pdf.addKeyValueRow('Notas descarga', e.notas_descarga)
          await pdf.addPhoto120(e.foto_url, 'Fotografía — residuos vegetales')
        }
      }

      pdf.finalize(`Parte_Diario_${fecha}.pdf`)
      toast({ title: 'PDF generado', description: 'Si no ves la descarga, revisa la carpeta de descargas o bloqueos del navegador.' })
    } catch (e) {
      console.error('PDF parte completo:', e)
      toast({
        title: 'Error al generar el PDF',
        description: e instanceof Error ? e.message : 'Inténtalo de nuevo.',
        variant: 'destructive',
      })
    } finally {
      setGenPdf(false)
    }
  }

  async function generarSoloIncidencias() {
    if (!parteId) return
    setGenPdf(true)
    try {
      const logoData = await loadPdfImage(`${window.location.origin}/MARVIC_logo.png`)
      const pdf = await generarPDFCorporativo(
        'INCIDENCIAS DE JORNADA',
        'Consolidado de incidencias del día',
        fecha,
        logoData,
      )
      const incidenciasPersonal = personales.filter(p => esIncidenciaPartePersonal(p.texto))
      const incTrab = await fetchIncidenciasTrabajosDelDia(fecha)

      if (incidenciasPersonal.length === 0 && incTrab.length === 0) {
        pdf.addMutedParagraph('Sin incidencias registradas para esta jornada.')
      }

      for (const e of incidenciasPersonal) {
        pdf.addSectionHeader('C', 'PARTE PERSONAL — INCIDENCIA', formatHora(e.fecha_hora))
        pdf.resetPairStripe()
        pdf.addKeyValueRow('Texto', e.texto)
        pdf.addKeyValueRow('Con quién', e.con_quien)
        pdf.addKeyValueRow('Dónde', e.donde)
        await pdf.addPhoto120(e.foto_url, 'Evidencia fotográfica')
      }

      for (const inc of incTrab) {
        const hora = inc.created_at ? formatHora(inc.created_at) : ''
        pdf.addSectionHeader('I', 'INCIDENCIA TRABAJOS', hora)
        pdf.resetPairStripe()
        pdf.addKeyValueRow('Título', inc.titulo)
        pdf.addKeyValueRow('Descripción', inc.descripcion)
        pdf.addKeyValueRow('Estado', inc.estado)
        pdf.addKeyValueRow('Finca', inc.finca)
        pdf.addKeyValueRow('Parcela', inc.parcel_id)
        pdf.addKeyValueRow('Urgente', inc.urgente ? 'Sí' : 'No')
        pdf.addKeyValueRow('Notas resolución', inc.notas_resolucion)
        await pdf.addPhoto120(inc.foto_url, 'Fotografía incidencia')
      }

      pdf.finalize(`Incidencias_${fecha}.pdf`)
      toast({ title: 'PDF generado', description: 'Incidencias descargadas.' })
    } catch (e) {
      console.error('PDF incidencias:', e)
      toast({
        title: 'Error al generar el PDF',
        description: e instanceof Error ? e.message : 'Inténtalo de nuevo.',
        variant: 'destructive',
      })
    } finally {
      setGenPdf(false)
    }
  }

  async function generarSoloResiduos() {
    if (!parteId) return
    setGenPdf(true)
    try {
      const logoData = await loadPdfImage(`${window.location.origin}/MARVIC_logo.png`)
      const pdf = await generarPDFCorporativo(
        'RESIDUOS VEGETALES',
        'Registro de movimientos del día',
        fecha,
        logoData,
      )
      if (residuos.length === 0) {
        pdf.addMutedParagraph('Sin registros de residuos vegetales para este día.')
      }
      for (const e of residuos) {
        pdf.addSectionHeader(
          'D',
          'RESIDUOS VEGETALES',
          e.hora_salida_nave ? `${formatHora(e.hora_salida_nave)}` : '',
        )
        pdf.resetPairStripe()
        pdf.addKeyValueRow('Conductor', e.nombre_conductor)
        pdf.addKeyValueRow('Hora salida nave', formatHora(e.hora_salida_nave))
        pdf.addKeyValueRow('Ganadero / Destino', e.nombre_ganadero)
        pdf.addKeyValueRow('Hora llegada ganadero', formatHora(e.hora_llegada_ganadero))
        pdf.addKeyValueRow('Hora regreso nave', formatHora(e.hora_regreso_nave))
        pdf.addKeyValueRow('Notas descarga', e.notas_descarga)
        await pdf.addPhoto120(e.foto_url, 'Fotografía — residuos vegetales')
      }
      pdf.finalize(`Residuos_${fecha}.pdf`)
      toast({ title: 'PDF generado', description: 'Residuos descargados.' })
    } catch (e) {
      console.error('PDF residuos:', e)
      toast({
        title: 'Error al generar el PDF',
        description: e instanceof Error ? e.message : 'Inténtalo de nuevo.',
        variant: 'destructive',
      })
    } finally {
      setGenPdf(false)
    }
  }

  async function generarPartePersonal() {
    if (!parteId) return
    setGenPdf(true)
    try {
      const logoData = await loadPdfImage(`${window.location.origin}/MARVIC_logo.png`)
      const pdf = await generarPDFCorporativo(
        'PARTE PERSONAL JUANPE',
        'Registro cronológico de actividades',
        fecha,
        logoData,
      )
      const ordenados = [...personales].sort((a, b) => a.fecha_hora.localeCompare(b.fecha_hora))
      if (ordenados.length === 0) {
        pdf.addMutedParagraph('Sin anotaciones en el parte personal para este día.')
      } else {
        pdf.addTablaPartePersonal(
          ordenados.map(p => ({
            hora: formatHora(p.fecha_hora),
            actividad: [p.texto, p.con_quien ? `Con: ${p.con_quien}` : '', p.donde ? `En: ${p.donde}` : '']
              .filter(Boolean)
              .join(' · '),
            estado: estadoPartePersonalRow(p.texto),
          })),
        )
        for (const p of ordenados) {
          if (p.foto_url) {
            pdf.checkPage(100)
            await pdf.addPhoto120(p.foto_url, `Foto — ${formatHora(p.fecha_hora)}`)
          }
        }
      }
      pdf.finalize(`Parte_Personal_${fecha}.pdf`)
      toast({ title: 'PDF generado', description: 'Parte personal descargado.' })
    } catch (e) {
      console.error('PDF parte personal:', e)
      toast({
        title: 'Error al generar el PDF',
        description: e instanceof Error ? e.message : 'Inténtalo de nuevo.',
        variant: 'destructive',
      })
    } finally {
      setGenPdf(false)
    }
  }

  async function generarPlanning() {
    if (!parteId) return
    setGenPdf(true)
    try {
      const logoData = await loadPdfImage(`${window.location.origin}/MARVIC_logo.png`)
      const { manana, tareas } = await fetchPlanningManana(fecha)
      const pdf = await generarPDFCorporativo(
        'PLANNING OPERATIVO',
        `Tareas previstas — ${formatFechaEjecutiva(manana)}`,
        manana,
        logoData,
      )
      if (tareas.length === 0) {
        pdf.addMutedParagraph('Sin tareas planificadas para mañana.')
      } else {
        pdf.addTablaPlanning(
          tareas.map((t, i) => ({
            num: i + 1,
            tarea: [t.tipo_trabajo, t.finca, t.ambito === 'finca_completa' ? 'Finca completa' : (t.parcelas?.join(', ') ?? '')]
              .filter(Boolean)
              .join(' · '),
            responsable: t.nombres_operarios ?? '—',
            prioridad: prioridadPlanningDesdeNotas(t.notas),
          })),
        )
      }
      pdf.finalize(`Planning_${manana}.pdf`)
      toast({ title: 'PDF generado', description: 'Planning descargado.' })
    } catch (e) {
      console.error('PDF planning:', e)
      toast({
        title: 'Error al generar el PDF',
        description: e instanceof Error ? e.message : 'Inténtalo de nuevo.',
        variant: 'destructive',
      })
    } finally {
      setGenPdf(false)
    }
  }

  async function onElegirOpcionPdf(opcion: 1 | 2 | 3 | 4 | 5) {
    setPdfMenuOpen(false)
    if (opcion === 1) await generarParteCompleto()
    else if (opcion === 2) await generarSoloIncidencias()
    else if (opcion === 3) await generarSoloResiduos()
    else if (opcion === 4) await generarPartePersonal()
    else await generarPlanning()
  }

  // ─────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────

  return (
    <PageShell.Root>
      <PageShell.Header className="pl-14 pr-4 py-2.5 flex flex-col gap-2 max-md:items-stretch md:flex-row md:flex-wrap md:items-center md:gap-3">
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-[10px] font-black uppercase tracking-widest">Volver</span>
        </button>

        <div className="w-px h-4 bg-border" aria-hidden />

        <span className="text-[10px] font-black uppercase tracking-widest text-[#6d9b7d]">
          Parte Diario
        </span>

        <NavegadorFechas
          fecha={fecha}
          esHoy={esHoy}
          onAnterior={irAnterior}
          onSiguiente={irSiguiente}
        />

        <div className="relative" ref={pdfMenuRef}>
          <button
            type="button"
            onClick={() => setPdfMenuOpen(o => !o)}
            disabled={generandoPdf || !parteId}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-[#6d9b7d]/30 bg-[#6d9b7d]/5 hover:bg-[#6d9b7d]/15 text-[#6d9b7d] text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
          >
            {generandoPdf
              ? <span className="w-3.5 h-3.5 border-2 border-[#6d9b7d]/20 border-t-[#6d9b7d] rounded-full animate-spin" />
              : <FileText className="w-3.5 h-3.5" />
            }
            PDF
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${pdfMenuOpen ? 'rotate-180' : ''}`} />
          </button>
          {pdfMenuOpen && (
            <div className="absolute right-0 top-full z-page-dropdown mt-1 min-w-[280px] rounded-lg border border-border bg-popover text-popover-foreground shadow-lg py-1">
              {[
                { k: 1 as const, label: 'Parte completo del día' },
                { k: 2 as const, label: 'Solo incidencias de la jornada' },
                { k: 3 as const, label: 'Solo residuos vegetales' },
                { k: 4 as const, label: 'Solo parte personal JuanPe' },
                { k: 5 as const, label: 'Planning del día siguiente' },
              ].map(({ k, label }) => (
                <button
                  key={k}
                  type="button"
                  disabled={generandoPdf}
                  onClick={() => onElegirOpcionPdf(k)}
                  className="w-full px-3 py-2.5 text-left text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        {esHoy && parteId && (
          <button
            type="button"
            onClick={handleCerrarJornada}
            disabled={cerrarJornada.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-orange-500/40 bg-orange-500/10 hover:bg-orange-500/20 text-orange-700 dark:text-orange-400 text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
          >
            <LogOut className="w-3.5 h-3.5" />
            Cerrar jornada
          </button>
        )
      }
      </PageShell.Header>

      <PageShell.Main maxWidth="standard" className="px-4 py-4 space-y-3">

        {cargando && (
          <div className="flex items-center justify-center py-16">
            <span className="w-5 h-5 border-2 border-border border-t-primary rounded-full animate-spin" />
          </div>
        )}

        {!cargando && !parteId && !esHoy && (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-sm">Sin parte registrado para esta fecha.</p>
          </div>
        )}

        {/* BLOQUE A */}
        <FormEstadoFinca
          parteId={parteId}
          estadosFinca={estadosFinca}
          esHoy={esHoy}
          onDelete={(id) => eliminar('parte_estado_finca', id)}
        />

        {/* BLOQUE B */}
        <FormTrabajosRealizado
          parteId={parteId}
          trabajos={trabajos}
          fecha={fecha}
          esHoy={esHoy}
          onDelete={(id) => eliminar('parte_trabajo', id)}
        />

        {/* BLOQUE C */}
        <FormAnotacionesLibres
          parteId={parteId}
          personales={personales}
          esHoy={esHoy}
          onDelete={(id) => eliminar('parte_personal', id)}
        />

        {/* BLOQUE D */}
        <FormLogisticaResiduos
          parteId={parteId}
          residuos={residuos}
          fecha={fecha}
          esHoy={esHoy}
          onDelete={(id) => eliminar('parte_residuos_vegetales', id)}
        />

      </PageShell.Main>

      {/* ── BARRA INFERIOR ── */}
      <footer className="bg-card/95 backdrop-blur-md border-t border-border px-4 py-1.5 flex items-center gap-4">
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
          Marvic 360 · Parte Diario
        </span>
        <span className="text-[10px] text-muted-foreground/70">|</span>
        <span className="text-[10px] text-muted-foreground">
          {estadosFinca.length + trabajos.length + personales.length + residuos.length} entradas
        </span>
        <span className="text-[10px] font-mono text-muted-foreground ml-auto">
          {new Date().toTimeString().slice(0, 8)}
        </span>
      </footer>

      {/* ══════════════════════════════════════════════════════════ */}
      {/* MODAL — RESULTADO CIERRE DE JORNADA                       */}
      {/* ══════════════════════════════════════════════════════════ */}
      {showCierre && cierreResultado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-md shadow-2xl">
            <div className="border-b border-border px-5 py-3 flex items-center justify-between">
              <span className="text-sm font-black uppercase tracking-widest text-orange-600 dark:text-orange-400">Jornada cerrada</span>
              <button type="button" onClick={() => setShowCierre(false)} className="text-muted-foreground hover:text-foreground text-lg leading-none">×</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Trabajos ejecutados', value: cierreResultado.ejecutados, color: 'text-green-600 dark:text-green-400' },
                  { label: 'Pendientes arrastrados', value: cierreResultado.arrastrados, color: 'text-orange-600 dark:text-orange-400' },
                  { label: 'Incidencias arrastradas', value: cierreResultado.incidenciasArrastradas, color: 'text-red-600 dark:text-red-400' },
                  { label: 'Pendientes marcados', value: cierreResultado.pendientes, color: 'text-muted-foreground' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-muted/50 border border-border rounded-lg px-3 py-3 text-center">
                    <p className={`text-2xl font-black ${color}`}>{value}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">{label}</p>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground text-center">
                Los trabajos pendientes e incidencias urgentes han sido arrastrados a manana con prioridad alta.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCierre(false)}
                  className="flex-1 py-2.5 rounded-lg border border-border text-muted-foreground text-sm hover:bg-muted transition-colors"
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  onClick={() => { setShowCierre(false); navigate('/trabajos') }}
                  className="flex-1 py-2.5 rounded-lg bg-orange-600 text-white text-sm font-black hover:bg-orange-500 transition-colors"
                >
                  Ver planificacion
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </PageShell.Root>
  )
}