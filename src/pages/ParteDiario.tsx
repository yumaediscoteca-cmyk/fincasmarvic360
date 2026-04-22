import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, ChevronLeft, ChevronRight, ChevronDown, Plus,
  FileText, Camera, Building2, Wrench, User, Truck, LogOut,
} from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import type { Tables } from '@/integrations/supabase/types'
import {
  usePartePorFecha,
  useEnsureParteHoy,
  useEstadosFinca,
  useAddEstadoFinca,
  useTrabajos,
  useAddTrabajo,
  usePersonales,
  useAddPersonal,
  useResiduos,
  useAddResiduos,
  useDeleteEntradaParte,
  useGanaderos,
  useAddGanadero,
  useCerrarJornada,
} from '@/hooks/useParteDiario'
import { usePersonal } from '@/hooks/usePersonal'
import { SelectWithOther, AudioInput, RecordActions } from '@/components/base'
import { FINCAS_NOMBRES as FINCAS } from '@/constants/farms'
import { TIPOS_TRABAJO } from '@/constants/tiposTrabajo'
import { ESTADOS_PARCELA } from '@/constants/estadosParcela'
import { uploadImage } from '@/utils/uploadImage'
import { formatHora, formatFechaNav } from '@/utils/dateFormat'
import { loadPdfImage, type PdfImage } from '@/utils/pdfUtils'
import { useTheme } from '@/context/ThemeContext'
import jsPDF from 'jspdf'

// ─── Constantes ──────────────────────────────────────────────────────────────

const HOY = new Date().toISOString().split('T')[0]

// ─── Tipos de formulario ──────────────────────────────────────────────────────

type FormA = {
  finca: string; parcel_id: string; estado: string
  num_operarios: string; nombres_operarios: string
  foto1: File | null; foto2: File | null; notas: string
}
type FormB = {
  tipo_trabajo: string; finca: string; ambito: string; parcelas: string
  num_operarios: string; nombres_operarios: string
  hora_inicio: string; hora_fin: string
  foto1: File | null; foto2: File | null; notas: string
}
type FormC = { texto: string; con_quien: string; donde: string; foto: File | null }
type FormD = {
  personal_id: string; nombre_conductor: string
  hora_salida_nave: string
  ganadero_id: string; nombre_ganadero: string; nuevo_ganadero: string
  hora_llegada_ganadero: string
  hora_regreso_nave: string; notas_descarga: string
  foto: File | null
}

const initA = (): FormA => ({
  finca: '', parcel_id: '', estado: '', num_operarios: '',
  nombres_operarios: '', foto1: null, foto2: null, notas: '',
})
const initB = (): FormB => ({
  tipo_trabajo: '', finca: '', ambito: 'finca_completa', parcelas: '',
  num_operarios: '', nombres_operarios: '',
  hora_inicio: '', hora_fin: '', foto1: null, foto2: null, notas: '',
})
const initC = (): FormC => ({ texto: '', con_quien: '', donde: '', foto: null })
const initD = (): FormD => ({
  personal_id: '', nombre_conductor: '',
  hora_salida_nave: '',
  ganadero_id: '', nombre_ganadero: '', nuevo_ganadero: '',
  hora_llegada_ganadero: '',
  hora_regreso_nave: '', notas_descarga: '',
  foto: null,
})

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeToISO(fecha: string, time: string): string | null {
  if (!time) return null
  return `${fecha}T${time}:00`
}

async function uploadFoto(file: File, parteId: string): Promise<string | null> {
  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `${parteId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  return uploadImage(file, 'partes-images', path)
}

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
function generarPDFCorporativo(
  tituloInforme: string,
  subtituloInforme: string,
  fechaISO: string,
  logoData: PdfImage | null,
) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const M = 14
  const PAGE_W = 210
  const PAGE_H = 297
  const TW = PAGE_W - 2 * M
  const FOOTER_LINE_Y = 282
  const FOOTER_TEXT_Y = 287
  const CONTENT_MAX_Y = FOOTER_LINE_Y - 6

  let y = M
  const fechaLarga = formatFechaEjecutiva(fechaISO)

  function drawPageBackground() {
    doc.setFillColor(255, 255, 255)
    doc.rect(0, 0, PAGE_W, PAGE_H, 'F')
  }

  function drawHeader() {
    drawPageBackground()
    const top = M
    let bandBottom = top
    if (logoData) {
      const logoW = 45
      const logoH = Math.min(logoW * (logoData.natH / logoData.natW), 22)
      doc.setFillColor(255, 255, 255)
      doc.rect(M - 0.5, top - 0.5, logoW + 1, logoH + 1, 'F')
      doc.addImage(logoData.b64, 'JPEG', M, top, logoW, logoH)
      bandBottom = Math.max(bandBottom, top + logoH)
    }
    const right = PAGE_W - M
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.setTextColor(0, 0, 0)
    doc.text(tituloInforme.toUpperCase(), right, top + 4, { align: 'right' })
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(100, 116, 139)
    doc.text(subtituloInforme, right, top + 9, { align: 'right' })
    doc.text(fechaLarga, right, top + 14, { align: 'right' })
    bandBottom = Math.max(bandBottom, top + 16)
    y = bandBottom + 2
    doc.setDrawColor(200, 200, 200)
    doc.setLineWidth(0.35)
    doc.line(M, y, PAGE_W - M, y)
    y += 5
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
      const fill = stripe % 2 === 0 ? [255, 255, 255] : [248, 250, 252]
      doc.setFillColor(fill[0], fill[1], fill[2])
      doc.rect(M, y - 4.5, TW, Math.max(rowH, linesH + 1), 'F')
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(100, 116, 139)
      doc.text(row.label, labelX, y)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(0, 0, 0)
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
    doc.setFillColor(30, 41, 59)
    doc.rect(M, y, TW, 7, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    const extra = horario ? `  ${horario}` : ''
    doc.text(`[${letra}] ${titulo.toUpperCase()}${extra}`, M + 2, y + 4.8)
    y += 9
    doc.setTextColor(0, 0, 0)
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
    const fill = pairStripe % 2 === 0 ? [255, 255, 255] : [248, 250, 252]
    doc.setFillColor(fill[0], fill[1], fill[2])
    doc.rect(M, y - 4, TW, blockH + 1, 'F')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(100, 116, 139)
    doc.text(label, M + 2, y)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(0, 0, 0)
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
      doc.setTextColor(100, 116, 139)
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
    doc.setFillColor(30, 41, 59)
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
      const fill = stripe % 2 === 0 ? [255, 255, 255] : [248, 250, 252]
      doc.setFillColor(fill[0], fill[1], fill[2])
      doc.rect(M, y - 1, TW, rowH, 'F')
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(100, 116, 139)
      doc.text(f.hora, c1, y + 3.5)
      doc.setTextColor(0, 0, 0)
      let yy = y + 3.5
      actLines.forEach(ln => {
        doc.text(ln, c2, yy)
        yy += 3.8
      })
      doc.setFont('helvetica', 'bold')
      if (f.estado === 'INCIDENCIA') {
        doc.setTextColor(239, 68, 68)
      } else {
        doc.setTextColor(0, 0, 0)
      }
      doc.text(f.estado, c3, y + 3.5)
      y += rowH
      stripe++
    }
    y += 3
    doc.setTextColor(0, 0, 0)
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
    doc.setFillColor(30, 41, 59)
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
      const fill = stripe % 2 === 0 ? [255, 255, 255] : [248, 250, 252]
      doc.setFillColor(fill[0], fill[1], fill[2])
      doc.rect(M, y - 1, TW, rowH, 'F')
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(0, 0, 0)
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
        doc.setTextColor(51, 65, 85)
      }
      doc.text(f.prioridad, colP, y + 3.5)
      y += rowH
      stripe++
    }
    y += 3
    doc.setTextColor(0, 0, 0)
  }

  function addMutedParagraph(texto: string) {
    checkPage(12)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(100, 116, 139)
    const lines = doc.splitTextToSize(texto, TW) as string[]
    lines.forEach(ln => {
      checkPage(5)
      doc.text(ln, M, y)
      y += 4.5
    })
    y += 2
  }

  function finalize(filename: string) {
    const total = doc.getNumberOfPages()
    const pieFecha = new Date(fechaISO + 'T12:00:00').toLocaleDateString('es-ES', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    })
    for (let i = 1; i <= total; i++) {
      doc.setPage(i)
      doc.setDrawColor(200, 200, 200)
      doc.setLineWidth(0.25)
      doc.line(M, FOOTER_LINE_Y, PAGE_W - M, FOOTER_LINE_Y)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(71, 85, 105)
      const left = `Firmado: JuanPe — Dirección Técnica de Campo  |  Agrícola Marvic 360  |  ${pieFecha}`
      doc.text(left, M, FOOTER_TEXT_Y)
      doc.text(`Página ${i} de ${total}`, PAGE_W - M, FOOTER_TEXT_Y, { align: 'right' })
    }
    doc.save(filename)
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
  const { theme } = useTheme()
  const pdfMenuRef = useRef<HTMLDivElement>(null)
  const [fecha, setFecha]           = useState(HOY)
  const [modal, setModal]           = useState<'A' | 'B' | 'C' | 'D' | null>(null)
  const [saving, setSaving]         = useState(false)
  const [generandoPdf, setGenPdf]   = useState(false)
  const [pdfMenuOpen, setPdfMenuOpen] = useState(false)
  const [formA, setFormA]           = useState<FormA>(initA())
  const [formB, setFormB]           = useState<FormB>(initB())
  const [formC, setFormC]           = useState<FormC>(initC())
  const [formD, setFormD]           = useState<FormD>(initD())

  const esHoy = fecha === HOY

  // Edit state per block
  const [editIdA, setEditIdA] = useState<string | null>(null)
  const [editIdB, setEditIdB] = useState<string | null>(null)
  const [editIdC, setEditIdC] = useState<string | null>(null)
  const [editIdD, setEditIdD] = useState<string | null>(null)
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

  const addEstadoFinca = useAddEstadoFinca()
  const addTrabajo     = useAddTrabajo()
  const addPersonal    = useAddPersonal()
  const addResiduos    = useAddResiduos()
  const deleteEntrada  = useDeleteEntradaParte()
  const addGanadero    = useAddGanadero()
  const cerrarJornada  = useCerrarJornada()

  const { data: conductoresCamion = [] } = usePersonal('conductor_camion')
  const { data: ganaderos          = [] } = useGanaderos()

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

  // ── Abrir modales en modo edición ──
  function editarA(e: Tables<'parte_estado_finca'>) {
    setEditIdA(e.id)
    setFormA({
      finca: e.finca ?? '', parcel_id: e.parcel_id ?? '', estado: e.estado ?? '',
      num_operarios: e.num_operarios?.toString() ?? '',
      nombres_operarios: e.nombres_operarios ?? '',
      foto1: null, foto2: null, notas: e.notas ?? '',
    })
    setModal('A')
  }
  function editarB(e: Tables<'parte_trabajo'>) {
    setEditIdB(e.id)
    setFormB({
      tipo_trabajo: e.tipo_trabajo ?? '', finca: e.finca ?? '',
      ambito: e.ambito ?? 'finca_completa', parcelas: e.parcelas?.join(', ') ?? '',
      num_operarios: e.num_operarios?.toString() ?? '',
      nombres_operarios: e.nombres_operarios ?? '',
      hora_inicio: e.hora_inicio ? new Date(e.hora_inicio).toTimeString().slice(0,5) : '',
      hora_fin: e.hora_fin ? new Date(e.hora_fin).toTimeString().slice(0,5) : '',
      foto1: null, foto2: null, notas: e.notas ?? '',
    })
    setModal('B')
  }
  function editarC(e: Tables<'parte_personal'>) {
    setEditIdC(e.id)
    setFormC({ texto: e.texto ?? '', con_quien: e.con_quien ?? '', donde: e.donde ?? '', foto: null })
    setModal('C')
  }
  function editarD(e: Tables<'parte_residuos_vegetales'>) {
    setEditIdD(e.id)
    setFormD({
      personal_id: e.personal_id ?? '', nombre_conductor: e.nombre_conductor ?? '',
      hora_salida_nave: e.hora_salida_nave ? new Date(e.hora_salida_nave).toTimeString().slice(0,5) : '',
      ganadero_id: e.ganadero_id ?? '', nombre_ganadero: e.nombre_ganadero ?? '', nuevo_ganadero: '',
      hora_llegada_ganadero: e.hora_llegada_ganadero ? new Date(e.hora_llegada_ganadero).toTimeString().slice(0,5) : '',
      hora_regreso_nave: e.hora_regreso_nave ? new Date(e.hora_regreso_nave).toTimeString().slice(0,5) : '',
      notas_descarga: e.notas_descarga ?? '', foto: null,
    })
    setModal('D')
  }

  // ── Cerrar jornada ──
  async function handleCerrarJornada() {
    if (!parteId || !confirm('¿Cerrar la jornada de hoy? Se marcarán trabajos ejecutados/pendientes y se arrastrarán a mañana.')) return
    try {
      const res = await cerrarJornada.mutateAsync({ fecha, parteId })
      setCierreResultado(res as { ejecutados: number; pendientes: number; arrastrados: number; incidenciasArrastradas: number })
      setShowCierre(true)
    } catch (e) {
      alert('Error al cerrar jornada: ' + (e instanceof Error ? e.message : String(e)))
    }
  }

  // ── Submit Modal A ──
  async function submitA() {
    if (!parteId || !formA.finca) return
    setSaving(true)
    try {
      const numOp = parseInt(formA.num_operarios)
      const patch = {
        parte_id: parteId,
        finca: formA.finca,
        parcel_id:         formA.parcel_id         || null,
        estado:            formA.estado             || null,
        num_operarios:     isNaN(numOp) ? null : numOp,
        nombres_operarios: formA.nombres_operarios  || null,
        notas: formA.notas || null,
      }
      if (editIdA) {
        // Update — solo campos sin foto
        await supabase.from('parte_estado_finca').update(patch).eq('id', editIdA)
        if (formA.foto1) {
          const url = await uploadFoto(formA.foto1, parteId)
          if (url) await supabase.from('parte_estado_finca').update({ foto_url: url }).eq('id', editIdA)
        }
        if (formA.foto2) {
          const url = await uploadFoto(formA.foto2, parteId)
          if (url) await supabase.from('parte_estado_finca').update({ foto_url_2: url }).eq('id', editIdA)
        }
      } else {
        const foto_url   = formA.foto1 ? await uploadFoto(formA.foto1, parteId) : null
        const foto_url_2 = formA.foto2 ? await uploadFoto(formA.foto2, parteId) : null
        await addEstadoFinca.mutateAsync({ ...patch, foto_url, foto_url_2 })
      }
      setModal(null); setFormA(initA()); setEditIdA(null)
    } finally { setSaving(false) }
  }

  // ── Submit Modal B ──
  async function submitB() {
    if (!parteId || !formB.tipo_trabajo) return
    setSaving(true)
    try {
      const numOp = parseInt(formB.num_operarios)
      const parcelasArr = formB.ambito === 'parcelas_concretas' && formB.parcelas
        ? formB.parcelas.split(',').map(s => s.trim()).filter(Boolean)
        : null
      const patch = {
        parte_id: parteId,
        tipo_trabajo: formB.tipo_trabajo,
        finca:  formB.finca  || null,
        ambito: formB.ambito || null,
        parcelas: parcelasArr,
        num_operarios:     isNaN(numOp) ? null : numOp,
        nombres_operarios: formB.nombres_operarios || null,
        hora_inicio: timeToISO(fecha, formB.hora_inicio),
        hora_fin:    timeToISO(fecha, formB.hora_fin),
        notas: formB.notas || null,
      }
      if (editIdB) {
        await supabase.from('parte_trabajo').update(patch).eq('id', editIdB)
        if (formB.foto1) { const u = await uploadFoto(formB.foto1, parteId); if (u) await supabase.from('parte_trabajo').update({ foto_url: u }).eq('id', editIdB) }
        if (formB.foto2) { const u = await uploadFoto(formB.foto2, parteId); if (u) await supabase.from('parte_trabajo').update({ foto_url_2: u }).eq('id', editIdB) }
      } else {
        const foto_url   = formB.foto1 ? await uploadFoto(formB.foto1, parteId) : null
        const foto_url_2 = formB.foto2 ? await uploadFoto(formB.foto2, parteId) : null
        await addTrabajo.mutateAsync({ ...patch, foto_url, foto_url_2 })
      }
      setModal(null); setFormB(initB()); setEditIdB(null)
    } finally { setSaving(false) }
  }

  // ── Submit Modal C ──
  async function submitC() {
    if (!parteId || !formC.texto.trim()) return
    setSaving(true)
    try {
      const patch = {
        parte_id:  parteId,
        texto:     formC.texto,
        con_quien: formC.con_quien || null,
        donde:     formC.donde     || null,
      }
      if (editIdC) {
        await supabase.from('parte_personal').update(patch).eq('id', editIdC)
        if (formC.foto) { const u = await uploadFoto(formC.foto, parteId); if (u) await supabase.from('parte_personal').update({ foto_url: u }).eq('id', editIdC) }
      } else {
        const foto_url = formC.foto ? await uploadFoto(formC.foto, parteId) : null
        await addPersonal.mutateAsync({ ...patch, foto_url })
      }
      setModal(null); setFormC(initC()); setEditIdC(null)
    } finally { setSaving(false) }
  }

  // ── Submit Modal D ──
  async function submitD() {
    if (!parteId) return
    setSaving(true)
    try {
      // Si nuevo ganadero, crear primero
      let ganaderoId = formD.ganadero_id ?? null
      if (!ganaderoId && formD.nuevo_ganadero.trim()) {
        const nuevo = await addGanadero.mutateAsync(formD.nuevo_ganadero.trim())
        ganaderoId = nuevo.id
      }

      // Subir foto si existe
      let foto_url: string | null = null
      if (formD.foto && parteId) {
        foto_url = await uploadFoto(formD.foto, parteId)
      }

      // Nombre conductor desde selector
      const nombreConductor = formD.personal_id
        ? ((conductoresCamion.find(c => c.id === formD.personal_id)?.nombre ?? formD.nombre_conductor) || null)
        : (formD.nombre_conductor || null)

      // Nombre ganadero para PDF/texto
      const nombreGanadero = ganaderoId
        ? ((ganaderos.find(g => g.id === ganaderoId)?.nombre ?? formD.nuevo_ganadero) || null)
        : (formD.nombre_ganadero || null)

      await addResiduos.mutateAsync({
        parte_id:               parteId,
        nombre_conductor:       nombreConductor,
        hora_salida_nave:       timeToISO(fecha, formD.hora_salida_nave),
        nombre_ganadero:        nombreGanadero,
        hora_llegada_ganadero:  timeToISO(fecha, formD.hora_llegada_ganadero),
        hora_regreso_nave:      timeToISO(fecha, formD.hora_regreso_nave),
        notas_descarga:         formD.notas_descarga || null,
        foto_url,
        personal_id:            formD.personal_id ?? null,
        ganadero_id:            ganaderoId,
      })
      setModal(null); setFormD(initD()); setEditIdD(null)
    } finally { setSaving(false) }
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
      const pdf = generarPDFCorporativo(
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
    } finally {
      setGenPdf(false)
    }
  }

  async function generarSoloIncidencias() {
    if (!parteId) return
    setGenPdf(true)
    try {
      const logoData = await loadPdfImage(`${window.location.origin}/MARVIC_logo.png`)
      const pdf = generarPDFCorporativo(
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
    } finally {
      setGenPdf(false)
    }
  }

  async function generarSoloResiduos() {
    if (!parteId) return
    setGenPdf(true)
    try {
      const logoData = await loadPdfImage(`${window.location.origin}/MARVIC_logo.png`)
      const pdf = generarPDFCorporativo(
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
    } finally {
      setGenPdf(false)
    }
  }

  async function generarPartePersonal() {
    if (!parteId) return
    setGenPdf(true)
    try {
      const logoData = await loadPdfImage(`${window.location.origin}/MARVIC_logo.png`)
      const pdf = generarPDFCorporativo(
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
      const pdf = generarPDFCorporativo(
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

  // Pequeño componente de fila de entrada para reutilizar
  const EntradaRow = ({
    hora, titulo, subtitulo, hasPhoto, tabla, id, onEdit,
  }: {
    hora: string; titulo: string; subtitulo?: string
    hasPhoto?: boolean; tabla: string; id: string
    onEdit?: () => void
  }) => (
    <div className="px-4 py-3 flex items-start justify-between gap-2 hover:bg-white/5 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-[#38bdf8] shrink-0">{hora}</span>
          {hasPhoto && <Camera className="w-3 h-3 text-slate-500 shrink-0" />}
        </div>
        <p className="text-sm text-white font-medium truncate mt-0.5">{titulo}</p>
        {subtitulo && <p className="text-[11px] text-slate-400 truncate mt-0.5">{subtitulo}</p>}
      </div>
      {esHoy && parteId && (
        <RecordActions
          onEdit={onEdit}
          onDelete={() => eliminar(tabla, id)}
        />
      )}
    </div>
  )

  const EmptyState = ({ texto }: { texto: string }) => (
    <div className="px-4 py-8 text-center">
      <p className="text-[11px] text-slate-600 uppercase tracking-widest">{texto}</p>
    </div>
  )

  // ─── Bloque card ───
  const BloqueCard = ({
    letra, icono: Icon, titulo, color, children, onAdd,
  }: {
    letra: string; icono: React.ElementType; titulo: string
    color: string; children: React.ReactNode; onAdd?: () => void
  }) => (
    <div className="bg-slate-900/60 border border-white/10 rounded-xl overflow-hidden">
      <div className="bg-slate-800/60 px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border ${color}`}>{letra}</span>
          <Icon className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-[10px] font-black uppercase tracking-widest text-white">{titulo}</span>
        </div>
        {esHoy && parteId && onAdd && (
          <button
            onClick={onAdd}
            className="flex items-center gap-1 px-2.5 py-1 rounded border border-[#38bdf8]/30 bg-[#38bdf8]/5 hover:bg-[#38bdf8]/15 text-[#38bdf8] text-[10px] font-black uppercase tracking-widest transition-all"
          >
            <Plus className="w-3 h-3" /> Añadir
          </button>
        )}
      </div>
      <div className="divide-y divide-white/5">{children}</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col">

      {/* ── CABECERA ── */}
      <header className="bg-slate-900/80 border-b border-white/10 pl-14 pr-4 py-2.5 flex items-center gap-3 flex-wrap">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-[10px] font-black uppercase tracking-widest">Volver</span>
        </button>

        <div className="w-px h-4 bg-white/10" />

        <span className="text-[10px] font-black uppercase tracking-widest text-[#38bdf8]">
          Parte Diario
        </span>

        <div className="flex items-center gap-1 ml-auto">
          <button
            onClick={irAnterior}
            className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-[11px] font-bold text-white min-w-[140px] text-center">
            {formatFechaNav(fecha)}
            {esHoy && <span className="ml-1 text-[9px] text-[#38bdf8] font-black">HOY</span>}
          </span>
          <button
            onClick={irSiguiente}
            disabled={esHoy}
            className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white transition-colors disabled:opacity-30"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="relative" ref={pdfMenuRef}>
          <button
            type="button"
            onClick={() => setPdfMenuOpen(o => !o)}
            disabled={generandoPdf || !parteId}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-[#38bdf8]/30 bg-[#38bdf8]/5 hover:bg-[#38bdf8]/15 text-[#38bdf8] text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
          >
            {generandoPdf
              ? <span className="w-3.5 h-3.5 border-2 border-[#38bdf8]/20 border-t-[#38bdf8] rounded-full animate-spin" />
              : <FileText className="w-3.5 h-3.5" />
            }
            PDF
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${pdfMenuOpen ? 'rotate-180' : ''}`} />
          </button>
          {pdfMenuOpen && (
            <div
              className={`absolute right-0 top-full z-[70] mt-1 min-w-[280px] rounded-lg border shadow-lg py-1 ${
                theme === 'dark'
                  ? 'border-slate-600 bg-slate-900 text-slate-100 shadow-black/40'
                  : 'border-slate-200 bg-white text-slate-800 shadow-slate-400/20'
              }`}
            >
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
                  className={`w-full px-3 py-2.5 text-left text-xs font-medium transition-colors disabled:opacity-50 ${
                    theme === 'dark'
                      ? 'hover:bg-slate-800 text-slate-200'
                      : 'hover:bg-slate-50 text-slate-800'
                  }`}
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
            className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-orange-500/40 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
          >
            <LogOut className="w-3.5 h-3.5" />
            Cerrar jornada
          </button>
        )
      }
      </header>

      {/* ── CONTENIDO PRINCIPAL ── */}
      <main className="flex-1 overflow-y-auto px-4 py-4 space-y-3 max-w-3xl w-full mx-auto">

        {cargando && (
          <div className="flex items-center justify-center py-16">
            <span className="w-5 h-5 border-2 border-white/10 border-t-[#38bdf8] rounded-full animate-spin" />
          </div>
        )}

        {!cargando && !parteId && !esHoy && (
          <div className="text-center py-16">
            <p className="text-slate-500 text-sm">Sin parte registrado para esta fecha.</p>
          </div>
        )}

        {/* BLOQUE A */}
        <BloqueCard
          letra="A" icono={Building2} titulo="Estado Finca / Parcela"
          color="text-sky-400 border-sky-400/40 bg-sky-400/5"
          onAdd={() => { setFormA(initA()); setModal('A') }}
        >
          {estadosFinca.length === 0
            ? <EmptyState texto="Sin estados registrados" />
            : estadosFinca.map(e => (
                <EntradaRow
                  key={e.id}
                  hora={formatHora(e.created_at)}
                  titulo={`${e.finca}${e.parcel_id ? ` · ${e.parcel_id}` : ''}`}
                  subtitulo={[
                    ESTADOS_PARCELA.find(s => s.value === e.estado)?.label,
                    e.num_operarios ? `${e.num_operarios} op.` : null,
                    e.nombres_operarios,
                  ].filter(Boolean).join(' · ')}
                  hasPhoto={!!(e.foto_url || e.foto_url_2)}
                  tabla="parte_estado_finca"
                  id={e.id}
                  onEdit={() => editarA(e)}
                />
              ))
          }
        </BloqueCard>

        {/* BLOQUE B */}
        <BloqueCard
          letra="B" icono={Wrench} titulo="Trabajo en Curso"
          color="text-amber-400 border-amber-400/40 bg-amber-400/5"
          onAdd={() => { setFormB(initB()); setModal('B') }}
        >
          {trabajos.length === 0
            ? <EmptyState texto="Sin trabajos registrados" />
            : trabajos.map(e => (
                <EntradaRow
                  key={e.id}
                  hora={e.hora_inicio
                    ? `${formatHora(e.hora_inicio)}–${formatHora(e.hora_fin)}`
                    : formatHora(e.created_at)}
                  titulo={e.tipo_trabajo}
                  subtitulo={[
                    e.finca,
                    e.ambito === 'finca_completa' ? 'Finca completa' : e.parcelas?.join(', '),
                    e.num_operarios ? `${e.num_operarios} op.` : null,
                  ].filter(Boolean).join(' · ')}
                  hasPhoto={!!(e.foto_url || e.foto_url_2)}
                  tabla="parte_trabajo"
                  id={e.id}
                  onEdit={() => editarB(e)}
                />
              ))
          }
        </BloqueCard>

        {/* BLOQUE C */}
        <BloqueCard
          letra="C" icono={User} titulo="Parte Personal JuanPe"
          color="text-green-400 border-green-400/40 bg-green-400/5"
          onAdd={() => { setFormC(initC()); setModal('C') }}
        >
          {personales.length === 0
            ? <EmptyState texto="Sin anotaciones personales" />
            : personales.map(e => (
                <EntradaRow
                  key={e.id}
                  hora={formatHora(e.fecha_hora)}
                  titulo={e.texto.length > 60 ? e.texto.slice(0, 60) + '…' : e.texto}
                  subtitulo={[
                    e.con_quien ? `Con: ${e.con_quien}` : null,
                    e.donde     ? `En: ${e.donde}`      : null,
                  ].filter(Boolean).join(' · ')}
                  hasPhoto={!!e.foto_url}
                  tabla="parte_personal"
                  id={e.id}
                  onEdit={() => editarC(e)}
                />
              ))
          }
        </BloqueCard>

        {/* BLOQUE D */}
        <BloqueCard
          letra="D" icono={Truck} titulo="Residuos Vegetales"
          color="text-orange-400 border-orange-400/40 bg-orange-400/5"
          onAdd={() => { setFormD(initD()); setModal('D') }}
        >
          {residuos.length === 0
            ? <EmptyState texto="Sin viajes de residuos registrados" />
            : residuos.map(e => (
                <EntradaRow
                  key={e.id}
                  hora={formatHora(e.hora_salida_nave ?? e.created_at)}
                  titulo={[
                    e.nombre_conductor ? `Conductor: ${e.nombre_conductor}` : 'Viaje residuos',
                  ].join('')}
                  subtitulo={[
                    e.nombre_ganadero          ? `Ganadero: ${e.nombre_ganadero}` : null,
                    e.hora_llegada_ganadero    ? `Llegada: ${formatHora(e.hora_llegada_ganadero)}` : null,
                    e.hora_regreso_nave        ? `Regreso: ${formatHora(e.hora_regreso_nave)}` : null,
                  ].filter(Boolean).join(' · ')}
                  tabla="parte_residuos_vegetales"
                  id={e.id}
                  onEdit={() => editarD(e)}
                />
              ))
          }
        </BloqueCard>

      </main>

      {/* ── BARRA INFERIOR ── */}
      <footer className="bg-slate-900/80 border-t border-white/10 px-4 py-1.5 flex items-center gap-4">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
          Marvic 360 · Parte Diario
        </span>
        <span className="text-[10px] text-slate-600">|</span>
        <span className="text-[10px] text-slate-500">
          {estadosFinca.length + trabajos.length + personales.length + residuos.length} entradas
        </span>
        <span className="text-[10px] font-mono text-slate-600 ml-auto">
          {new Date().toTimeString().slice(0, 8)}
        </span>
      </footer>

      {/* ══════════════════════════════════════════════════════════ */}
      {/* MODAL A — Estado Finca/Parcela                            */}
      {/* ══════════════════════════════════════════════════════════ */}
      {modal === 'A' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-white/10 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-slate-900 border-b border-white/10 px-5 py-3 flex items-center justify-between">
              <span className="text-sm font-black uppercase tracking-widest text-sky-400">
                A · Estado Finca / Parcela
              </span>
              <button onClick={() => setModal(null)} className="text-slate-500 hover:text-white text-lg leading-none">×</button>
            </div>
            <div className="p-5 space-y-4">

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Finca *</label>
                <select
                  value={formA.finca}
                  onChange={e => setFormA(p => ({ ...p, finca: e.target.value }))}
                  className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:border-[#38bdf8]/50 outline-none"
                >
                  <option value="">— Seleccionar finca —</option>
                  {FINCAS.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Parcela / Sector (opcional)</label>
                <input
                  type="text"
                  value={formA.parcel_id}
                  onChange={e => setFormA(p => ({ ...p, parcel_id: e.target.value }))}
                  placeholder="Ej: S-12, Sector Norte..."
                  className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:border-[#38bdf8]/50 outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Estado actual</label>
                <select
                  value={formA.estado}
                  onChange={e => setFormA(p => ({ ...p, estado: e.target.value }))}
                  className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:border-[#38bdf8]/50 outline-none"
                >
                  <option value="">— Sin especificar —</option>
                  {ESTADOS_PARCELA.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Nº Operarios</label>
                  <input
                    type="number" min="0"
                    value={formA.num_operarios}
                    onChange={e => setFormA(p => ({ ...p, num_operarios: e.target.value }))}
                    className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:border-[#38bdf8]/50 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Nombres</label>
                  <input
                    type="text"
                    value={formA.nombres_operarios}
                    onChange={e => setFormA(p => ({ ...p, nombres_operarios: e.target.value }))}
                    placeholder="Juan, Pedro..."
                    className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:border-[#38bdf8]/50 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Notas</label>
                <AudioInput
                  value={formA.notas}
                  onChange={v => setFormA(p => ({ ...p, notas: v }))}
                  placeholder="Observaciones del estado..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[1, 2].map(n => (
                  <div key={n}>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
                      Foto {n} {n === 1 ? '(estado)' : '(opcional)'}
                    </label>
                    <label className="flex items-center gap-2 px-3 py-2.5 bg-slate-800 border border-white/10 rounded-lg cursor-pointer hover:border-[#38bdf8]/30 transition-colors">
                      <Camera className="w-4 h-4 text-slate-500 shrink-0" />
                      <span className="text-[11px] text-slate-400 truncate">
                        {n === 1
                          ? (formA.foto1?.name ?? 'Capturar / Subir')
                          : (formA.foto2?.name ?? 'Capturar / Subir')}
                      </span>
                      <input
                        type="file" accept="image/*" capture="environment" className="sr-only"
                        onChange={e => {
                          const f = e.target.files?.[0] ?? null
                          setFormA(p => n === 1 ? { ...p, foto1: f } : { ...p, foto2: f })
                        }}
                      />
                    </label>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setModal(null)}
                  className="flex-1 py-2.5 rounded-lg border border-white/10 text-slate-400 text-sm hover:border-white/20 transition-colors"
                >Cancelar</button>
                <button
                  onClick={submitA}
                  disabled={saving || !formA.finca}
                  className="flex-1 py-2.5 rounded-lg bg-[#38bdf8] text-[#020617] text-sm font-black hover:bg-sky-300 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving && <span className="w-3.5 h-3.5 border-2 border-[#020617]/20 border-t-[#020617] rounded-full animate-spin" />}
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* MODAL B — Trabajo en Curso                                */}
      {/* ══════════════════════════════════════════════════════════ */}
      {modal === 'B' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-white/10 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-slate-900 border-b border-white/10 px-5 py-3 flex items-center justify-between">
              <span className="text-sm font-black uppercase tracking-widest text-amber-400">
                B · Trabajo en Curso
              </span>
              <button onClick={() => setModal(null)} className="text-slate-500 hover:text-white text-lg leading-none">×</button>
            </div>
            <div className="p-5 space-y-4">

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Tipo de trabajo *</label>
                <input
                  list="tipos-trabajo"
                  value={formB.tipo_trabajo}
                  onChange={e => setFormB(p => ({ ...p, tipo_trabajo: e.target.value }))}
                  placeholder="Seleccionar o escribir..."
                  className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:border-[#38bdf8]/50 outline-none"
                />
                <datalist id="tipos-trabajo">
                  {TIPOS_TRABAJO.map(t => <option key={t} value={t} />)}
                </datalist>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Finca</label>
                <select
                  value={formB.finca}
                  onChange={e => setFormB(p => ({ ...p, finca: e.target.value }))}
                  className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:border-[#38bdf8]/50 outline-none"
                >
                  <option value="">— Sin especificar —</option>
                  {FINCAS.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Ámbito</label>
                <div className="flex gap-2">
                  {[
                    { value: 'finca_completa', label: 'Finca completa' },
                    { value: 'parcelas_concretas', label: 'Parcelas concretas' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setFormB(p => ({ ...p, ambito: opt.value }))}
                      className={`flex-1 py-2 rounded-lg border text-[11px] font-bold transition-colors ${
                        formB.ambito === opt.value
                          ? 'border-[#38bdf8]/50 bg-[#38bdf8]/10 text-[#38bdf8]'
                          : 'border-white/10 text-slate-400 hover:border-white/20'
                      }`}
                    >{opt.label}</button>
                  ))}
                </div>
              </div>

              {formB.ambito === 'parcelas_concretas' && (
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Parcelas (separadas por coma)</label>
                  <input
                    type="text"
                    value={formB.parcelas}
                    onChange={e => setFormB(p => ({ ...p, parcelas: e.target.value }))}
                    placeholder="S-01, S-02, S-03..."
                    className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:border-[#38bdf8]/50 outline-none"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Hora inicio</label>
                  <input
                    type="time"
                    value={formB.hora_inicio}
                    onChange={e => setFormB(p => ({ ...p, hora_inicio: e.target.value }))}
                    className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:border-[#38bdf8]/50 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Hora fin</label>
                  <input
                    type="time"
                    value={formB.hora_fin}
                    onChange={e => setFormB(p => ({ ...p, hora_fin: e.target.value }))}
                    className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:border-[#38bdf8]/50 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Nº Operarios</label>
                  <input
                    type="number" min="0"
                    value={formB.num_operarios}
                    onChange={e => setFormB(p => ({ ...p, num_operarios: e.target.value }))}
                    className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:border-[#38bdf8]/50 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Nombres</label>
                  <input
                    type="text"
                    value={formB.nombres_operarios}
                    onChange={e => setFormB(p => ({ ...p, nombres_operarios: e.target.value }))}
                    placeholder="Juan, Pedro..."
                    className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:border-[#38bdf8]/50 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Notas</label>
                <AudioInput
                  value={formB.notas}
                  onChange={v => setFormB(p => ({ ...p, notas: v }))}
                  placeholder="Observaciones del trabajo..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[1, 2].map(n => (
                  <div key={n}>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Foto {n}</label>
                    <label className="flex items-center gap-2 px-3 py-2.5 bg-slate-800 border border-white/10 rounded-lg cursor-pointer hover:border-[#38bdf8]/30 transition-colors">
                      <Camera className="w-4 h-4 text-slate-500 shrink-0" />
                      <span className="text-[11px] text-slate-400 truncate">
                        {n === 1 ? (formB.foto1?.name ?? 'Capturar / Subir') : (formB.foto2?.name ?? 'Capturar / Subir')}
                      </span>
                      <input
                        type="file" accept="image/*" capture="environment" className="sr-only"
                        onChange={e => {
                          const f = e.target.files?.[0] ?? null
                          setFormB(p => n === 1 ? { ...p, foto1: f } : { ...p, foto2: f })
                        }}
                      />
                    </label>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setModal(null)} className="flex-1 py-2.5 rounded-lg border border-white/10 text-slate-400 text-sm hover:border-white/20 transition-colors">Cancelar</button>
                <button
                  onClick={submitB}
                  disabled={saving || !formB.tipo_trabajo}
                  className="flex-1 py-2.5 rounded-lg bg-amber-500 text-[#020617] text-sm font-black hover:bg-amber-400 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving && <span className="w-3.5 h-3.5 border-2 border-[#020617]/20 border-t-[#020617] rounded-full animate-spin" />}
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* MODAL C — Parte Personal JuanPe                           */}
      {/* ══════════════════════════════════════════════════════════ */}
      {modal === 'C' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-white/10 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-slate-900 border-b border-white/10 px-5 py-3 flex items-center justify-between">
              <span className="text-sm font-black uppercase tracking-widest text-green-400">
                C · Parte Personal JuanPe
              </span>
              <button onClick={() => setModal(null)} className="text-slate-500 hover:text-white text-lg leading-none">×</button>
            </div>
            <div className="p-5 space-y-4">

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Texto libre *</label>
                <AudioInput
                  value={formC.texto}
                  onChange={v => setFormC(p => ({ ...p, texto: v }))}
                  placeholder="Qué gestiona, decisiones tomadas, observaciones..."
                  rows={5}
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Con quién</label>
                <input
                  type="text"
                  value={formC.con_quien}
                  onChange={e => setFormC(p => ({ ...p, con_quien: e.target.value }))}
                  placeholder="Técnico CAAE, proveedor, gestor..."
                  className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:border-[#38bdf8]/50 outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Dónde</label>
                <AudioInput
                  value={formC.donde}
                  onChange={v => setFormC(p => ({ ...p, donde: v }))}
                  placeholder="Murcia, nave, oficina..."
                  rows={1}
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Foto (opcional)</label>
                <label className="flex items-center gap-2 px-3 py-2.5 bg-slate-800 border border-white/10 rounded-lg cursor-pointer hover:border-[#38bdf8]/30 transition-colors">
                  <Camera className="w-4 h-4 text-slate-500 shrink-0" />
                  <span className="text-[11px] text-slate-400 truncate">
                    {formC.foto?.name ?? 'Capturar / Subir'}
                  </span>
                  <input
                    type="file" accept="image/*" capture="environment" className="sr-only"
                    onChange={e => {
                      const f = e.target.files?.[0] ?? null
                      setFormC(p => ({ ...p, foto: f }))
                    }}
                  />
                </label>
              </div>

              <p className="text-[10px] text-slate-600">La fecha y hora se registran automáticamente.</p>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setModal(null)} className="flex-1 py-2.5 rounded-lg border border-white/10 text-slate-400 text-sm hover:border-white/20 transition-colors">Cancelar</button>
                <button
                  onClick={submitC}
                  disabled={saving || !formC.texto.trim()}
                  className="flex-1 py-2.5 rounded-lg bg-green-600 text-white text-sm font-black hover:bg-green-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving && <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />}
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* MODAL D — Residuos Vegetales                              */}
      {/* ══════════════════════════════════════════════════════════ */}
      {modal === 'D' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-white/10 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-slate-900 border-b border-white/10 px-5 py-3 flex items-center justify-between">
              <span className="text-sm font-black uppercase tracking-widest text-orange-400">
                D · Residuos Vegetales
              </span>
              <button onClick={() => setModal(null)} className="text-slate-500 hover:text-white text-lg leading-none">×</button>
            </div>
            <div className="p-5 space-y-4">

              {/* CONDUCTOR — desde Personal */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Conductor</label>
                <select
                  value={formD.personal_id}
                  onChange={e => {
                    const id = e.target.value
                    const nombre = conductoresCamion.find(c => c.id === id)?.nombre ?? ''
                    setFormD(p => ({ ...p, personal_id: id, nombre_conductor: nombre }))
                  }}
                  className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:border-[#38bdf8]/50 outline-none"
                >
                  <option value="">— Seleccionar conductor —</option>
                  {conductoresCamion.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </div>

              {/* GANADERO DESTINO — desde tabla ganaderos */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Ganadero destino</label>
                <select
                  value={formD.ganadero_id}
                  onChange={e => setFormD(p => ({ ...p, ganadero_id: e.target.value, nuevo_ganadero: '' }))}
                  className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:border-[#38bdf8]/50 outline-none"
                >
                  <option value="">— Seleccionar ganadero —</option>
                  <option value="__nuevo__">+ Nuevo ganadero…</option>
                  {ganaderos.map(g => (
                    <option key={g.id} value={g.id}>{g.nombre}</option>
                  ))}
                </select>
                {formD.ganadero_id === '__nuevo__' && (
                  <input
                    type="text"
                    placeholder="Nombre del ganadero (se guardará)"
                    value={formD.nuevo_ganadero}
                    onChange={e => setFormD(p => ({ ...p, nuevo_ganadero: e.target.value, ganadero_id: '__nuevo__' }))}
                    className="mt-2 w-full bg-slate-800 border border-orange-400/40 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:border-orange-400/70 outline-none"
                  />
                )}
              </div>

              {/* HORAS */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Hora salida nave</label>
                  <input
                    type="time"
                    value={formD.hora_salida_nave}
                    onChange={e => setFormD(p => ({ ...p, hora_salida_nave: e.target.value }))}
                    className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:border-[#38bdf8]/50 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Hora llegada ganadero</label>
                  <input
                    type="time"
                    value={formD.hora_llegada_ganadero}
                    onChange={e => setFormD(p => ({ ...p, hora_llegada_ganadero: e.target.value }))}
                    className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:border-[#38bdf8]/50 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Hora regreso nave</label>
                <input
                  type="time"
                  value={formD.hora_regreso_nave}
                  onChange={e => setFormD(p => ({ ...p, hora_regreso_nave: e.target.value }))}
                  className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:border-[#38bdf8]/50 outline-none"
                />
              </div>

              {/* NOTAS */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Notas de la descarga</label>
                <AudioInput
                  value={formD.notas_descarga}
                  onChange={v => setFormD(p => ({ ...p, notas_descarga: v }))}
                  placeholder="Observaciones del viaje..."
                  rows={3}
                />
              </div>

              {/* FOTO OBLIGATORIA */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
                  Foto <span className="text-orange-400">*</span>
                </label>
                {formD.foto ? (
                  <div className="flex items-center gap-3 p-3 bg-slate-800 rounded-lg border border-white/10">
                    <img
                      src={URL.createObjectURL(formD.foto)}
                      alt="preview"
                      className="w-14 h-14 object-cover rounded-lg shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white truncate">{formD.foto.name}</p>
                      <p className="text-[10px] text-slate-500">{(formD.foto.size / 1024).toFixed(0)} KB</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormD(p => ({ ...p, foto: null }))}
                      className="text-slate-500 hover:text-red-400 transition-colors"
                    >×</button>
                  </div>
                ) : (
                  <label className="flex items-center gap-3 p-3 bg-slate-800 rounded-lg border border-dashed border-white/20 cursor-pointer hover:border-orange-400/50 transition-colors">
                    <Camera className="w-5 h-5 text-slate-500" />
                    <span className="text-sm text-slate-400">Tomar foto o seleccionar</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={e => {
                        const f = e.target.files?.[0]
                        if (f) setFormD(p => ({ ...p, foto: f }))
                      }}
                    />
                  </label>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setModal(null)} className="flex-1 py-2.5 rounded-lg border border-white/10 text-slate-400 text-sm hover:border-white/20 transition-colors">Cancelar</button>
                <button
                  onClick={submitD}
                  disabled={saving || !formD.foto}
                  className="flex-1 py-2.5 rounded-lg bg-orange-600 text-white text-sm font-black hover:bg-orange-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving && <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />}
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* MODAL — RESULTADO CIERRE DE JORNADA                       */}
      {/* ══════════════════════════════════════════════════════════ */}
      {showCierre && cierreResultado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-white/10 rounded-xl w-full max-w-md shadow-2xl">
            <div className="border-b border-white/10 px-5 py-3 flex items-center justify-between">
              <span className="text-sm font-black uppercase tracking-widest text-orange-400">Jornada cerrada</span>
              <button onClick={() => setShowCierre(false)} className="text-slate-500 hover:text-white text-lg leading-none">×</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Trabajos ejecutados', value: cierreResultado.ejecutados, color: 'text-green-400' },
                  { label: 'Pendientes arrastrados', value: cierreResultado.arrastrados, color: 'text-orange-400' },
                  { label: 'Incidencias arrastradas', value: cierreResultado.incidenciasArrastradas, color: 'text-red-400' },
                  { label: 'Pendientes marcados', value: cierreResultado.pendientes, color: 'text-slate-400' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-slate-800/60 border border-white/10 rounded-lg px-3 py-3 text-center">
                    <p className={`text-2xl font-black ${color}`}>{value}</p>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">{label}</p>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-slate-500 text-center">
                Los trabajos pendientes e incidencias urgentes han sido arrastrados a manana con prioridad alta.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCierre(false)}
                  className="flex-1 py-2.5 rounded-lg border border-white/10 text-slate-400 text-sm hover:border-white/20 transition-colors"
                >
                  Cerrar
                </button>
                <button
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

    </div>
  )
}