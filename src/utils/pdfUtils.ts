/**
 * pdfUtils.ts — Utilidades PDF compartidas para todos los módulos de Agrícola Marvic 360
 *
 * Patrón de uso:
 *   const ctx = createPdfContext(doc)
 *   ctx.addPageHeader('MÓDULO', 'Subtítulo opcional')
 *   ctx.writeLine('Campo', 'valor')
 *   ctx.separator()
 *   await ctx.addPhoto(url)
 *   doc.save('archivo.pdf')
 */

import jsPDF from 'jspdf'

// ── Constantes globales de layout ────────────────────────────────────────────

export const PDF_MARGIN       = 14
export const PDF_PAGE_W       = 210
export const PDF_PAGE_H       = 297
export const PDF_TEXT_W       = PDF_PAGE_W - 2 * PDF_MARGIN
export const PDF_BOTTOM_LIMIT = 280

/** Límite vertical del contenido cuando el pie corporativo está activo (evita solaparse). */
const CORPORATE_CONTENT_BOTTOM = 268

const CORP_SECTION_BG: [number, number, number] = [30, 41, 59]
const CORP_ROW_A: [number, number, number] = [255, 255, 255]
const CORP_ROW_B: [number, number, number] = [248, 250, 252]

// Colores corporativos por módulo
export const PDF_COLORS = {
  accent:    [14,  94,  131] as [number, number, number],   // azul Marvic
  orange:    [251, 146, 60]  as [number, number, number],   // maquinaria
  violet:    [167, 139, 250] as [number, number, number],   // logística
  amber:     [245, 158, 11]  as [number, number, number],   // trabajos
  green:     [74,  222, 128] as [number, number, number],   // parte diario
  fuchsia:   [232, 121, 249] as [number, number, number],   // personal
  gray:      [100, 116, 139] as [number, number, number],
  lightGray: [160, 160, 160] as [number, number, number],
  white:     [255, 255, 255] as [number, number, number],
  dark:      [40,  40,  40]  as [number, number, number],
}

// ── Carga de imagen desde URL → base64 ──────────────────────────────────────

export interface PdfImage {
  b64:  string
  natW: number
  natH: number
}

export async function loadPdfImage(url: string): Promise<PdfImage | null> {
  try {
    const res = await fetch(url, { mode: 'cors' })
    if (!res.ok) return null
    const blob = await res.blob()
    const bmp  = await createImageBitmap(blob)
    const natW = bmp.width
    const natH = bmp.height
    const MAX  = 1200
    const scale = Math.min(1, MAX / Math.max(natW, natH))
    const canvas = document.createElement('canvas')
    canvas.width  = natW * scale
    canvas.height = natH * scale
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height)
    return { b64: canvas.toDataURL('image/jpeg', 0.82), natW, natH }
  } catch {
    return null
  }
}

// ── Contexto de documento PDF ────────────────────────────────────────────────

export interface PdfContext {
  doc:         jsPDF
  y:           number
  logoData:    PdfImage | null
  accentColor: [number, number, number]

  /** Salta a nueva página si no hay espacio suficiente */
  checkPage(needed?: number): void

  /** Línea horizontal separadora */
  separator(): void

  /** Cabecera de página con logo + título del módulo */
  addPageHeader(modulo: string, subtitulo?: string): void

  /** Línea de texto con etiqueta en negrita */
  writeLine(label: string, value: string | null | undefined, size?: number): void

  /** Etiqueta de sección (sin valor) */
  writeLabel(label: string, size?: number): void

  /** Cabecera de entrada cronológica con barra lateral de color */
  entryHeader(letra: string, titulo: string, hora: string): void

  /** Inserta foto con caption. No hace nada si url es null. */
  addPhoto(url: string | null, maxW?: number): Promise<void>

  /** Tabla de KPIs en una fila horizontal */
  kpiRow(items: Array<{ label: string; value: string | number }>): void

  /** Pie de página final */
  footer(totalEntradas?: number): void

  /** Activa cabecera/pie corporativos en saltos de página (45 mm logo, título/subtítulo/fecha). */
  setCorporateMode(cfg: { titulo: string; subtitulo: string; fecha: Date } | null): void

  /** Pinta cabecera corporativa en la página actual (fondo blanco). */
  addCorporatePageHeader(): void
}

export function createPdfContext(
  doc: jsPDF,
  logoData: PdfImage | null = null,
  accentColor: [number, number, number] = PDF_COLORS.accent
): PdfContext {
  const M  = PDF_MARGIN
  const TW = PDF_TEXT_W
  let y    = M
  let corporateCfg: { titulo: string; subtitulo: string; fecha: Date } | null = null

  function contentBottomLimit() {
    return corporateCfg ? CORPORATE_CONTENT_BOTTOM : PDF_BOTTOM_LIMIT
  }

  function paintCorporateHeaderInternal() {
    if (!corporateCfg) return
    doc.setFillColor(255, 255, 255)
    doc.rect(0, 0, PDF_PAGE_W, PDF_PAGE_H, 'F')
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
    const right = PDF_PAGE_W - M
    const fechaStr = corporateCfg.fecha.toLocaleDateString('es-ES', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    })
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.setTextColor(0, 0, 0)
    doc.text(corporateCfg.titulo.toUpperCase(), right, top + 4, { align: 'right' })
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(100, 116, 139)
    doc.text(corporateCfg.subtitulo, right, top + 9, { align: 'right' })
    doc.text(fechaStr, right, top + 14, { align: 'right' })
    bandBottom = Math.max(bandBottom, top + 16)
    y = bandBottom + 2
    doc.setDrawColor(200, 200, 200)
    doc.setLineWidth(0.35)
    doc.line(M, y, PDF_PAGE_W - M, y)
    y += 5
  }

  const ctx: PdfContext = {
    doc,
    get y() { return y },
    set y(v) { y = v },
    logoData,
    accentColor,

    setCorporateMode(cfg) {
      corporateCfg = cfg
    },

    addCorporatePageHeader() {
      paintCorporateHeaderInternal()
    },

    checkPage(needed = 10) {
      const lim = contentBottomLimit()
      if (y + needed > lim) {
        doc.addPage()
        y = M
        if (corporateCfg) paintCorporateHeaderInternal()
        else ctx.addPageHeader('', '')
      }
    },

    separator() {
      if (y + 5 > contentBottomLimit()) { doc.addPage(); y = M; if (corporateCfg) paintCorporateHeaderInternal() }
      doc.setDrawColor(200, 200, 200)
      doc.setLineWidth(0.2)
      doc.line(M, y, PDF_PAGE_W - M, y)
      y += 4
    },

    addPageHeader(modulo: string, subtitulo = '') {
      if (logoData) {
        doc.addImage(logoData.b64, 'JPEG', M, y, 38, 10)
      }
      doc.setFontSize(8)
      doc.setTextColor(...PDF_COLORS.gray)
      doc.text('AGRÍCOLA MARVIC 360', PDF_PAGE_W - M, y + 4, { align: 'right' })
      if (modulo) {
        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...accentColor)
        doc.text(
          subtitulo ? `${modulo} — ${subtitulo}` : modulo,
          PDF_PAGE_W - M, y + 8.5, { align: 'right' }
        )
        doc.setFont('helvetica', 'normal')
      }
      y += 14
      doc.setDrawColor(...accentColor)
      doc.setLineWidth(0.4)
      doc.line(M, y, PDF_PAGE_W - M, y)
      y += 5
    },

    writeLine(label, value, size = 9) {
      if (!value) return
      ctx.checkPage(7)
      doc.setFontSize(size)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...PDF_COLORS.dark)
      const txt = `${label}: ${value}`
      const lines = doc.splitTextToSize(txt, TW) as string[]
      lines.forEach((line: string) => {
        ctx.checkPage(5)
        doc.text(line, M, y)
        y += size * 0.44
      })
      y += 0.5
    },

    writeLabel(label, size = 8) {
      ctx.checkPage(6)
      doc.setFontSize(size)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...PDF_COLORS.gray)
      doc.text(label, M, y)
      doc.setFont('helvetica', 'normal')
      y += size * 0.44 + 0.5
    },

    entryHeader(letra, titulo, hora) {
      ctx.checkPage(14)
      doc.setFillColor(...accentColor)
      doc.rect(M, y, 2, 9, 'F')
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...accentColor)
      doc.text(`[${letra}]  ${titulo}`, M + 4, y + 6)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(...PDF_COLORS.gray)
      doc.text(hora, PDF_PAGE_W - M, y + 6, { align: 'right' })
      y += 12
    },

    async addPhoto(url, maxW = 80) {
      if (!url) return
      const img = await loadPdfImage(url)
      if (!img) return
      const hFoto = Math.min(maxW * (img.natH / img.natW), 100)
      ctx.checkPage(hFoto + 12)
      doc.setFontSize(7)
      doc.setTextColor(...PDF_COLORS.lightGray)
      doc.text('Foto adjunta:', M, y)
      y += 4
      doc.addImage(img.b64, 'JPEG', M, y, maxW, hFoto)
      y += hFoto + 4
    },

    kpiRow(items) {
      ctx.checkPage(18)
      const colW = TW / items.length
      doc.setFillColor(15, 23, 42)
      doc.roundedRect(M, y, TW, 14, 2, 2, 'F')
      items.forEach((item, i) => {
        const cx = M + colW * i + colW / 2
        doc.setFontSize(7)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...PDF_COLORS.gray)
        doc.text(item.label.toUpperCase(), cx, y + 5, { align: 'center' })
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...accentColor)
        doc.text(String(item.value), cx, y + 11, { align: 'center' })
      })
      y += 18
    },

    footer(totalEntradas) {
      ctx.checkPage(10)
      y += 4
      doc.setFontSize(7)
      doc.setTextColor(...PDF_COLORS.lightGray)
      const txt = totalEntradas != null
        ? `Generado por Agrícola Marvic 360 · ${new Date().toLocaleString('es-ES')} · ${totalEntradas} entradas`
        : `Generado por Agrícola Marvic 360 · ${new Date().toLocaleString('es-ES')}`
      doc.text(txt, PDF_PAGE_W / 2, y, { align: 'center' })
    },
  }

  return ctx
}

// ── Función de inicio estándar (crea doc + carga logo) ───────────────────────

export async function initPdf(
  accentColor: [number, number, number] = PDF_COLORS.accent
): Promise<{ doc: jsPDF; ctx: PdfContext }> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const logoData = await loadPdfImage(window.location.origin + '/MARVIC_logo.png')
  const ctx = createPdfContext(doc, logoData, accentColor)
  return { doc, ctx }
}

// ── PDF corporativo global (cabecera 45 mm + pie en todas las páginas) ───────

export type CorporatePdfBlock = (ctx: PdfContext, doc: jsPDF) => void | Promise<void>

export interface GenerarPDFCorporativoBaseConfig {
  titulo: string
  subtitulo: string
  fecha: Date
  filename: string
  bloques: CorporatePdfBlock[]
  accentColor?: [number, number, number]
}

const CORP_FOOTER_LINE_Y = 282
const CORP_FOOTER_TEXT_Y = 287

export function applyCorporateFootersAllPages(doc: jsPDF, fecha: Date): void {
  const M = PDF_MARGIN
  const total = doc.getNumberOfPages()
  const pieFecha = fecha.toLocaleDateString('es-ES', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
  for (let i = 1; i <= total; i++) {
    doc.setPage(i)
    doc.setDrawColor(200, 200, 200)
    doc.setLineWidth(0.25)
    doc.line(M, CORP_FOOTER_LINE_Y, PDF_PAGE_W - M, CORP_FOOTER_LINE_Y)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(71, 85, 105)
    doc.text(
      `Firmado: JuanPe — Dirección Técnica de Campo  |  Agrícola Marvic 360  |  ${pieFecha}`,
      M,
      CORP_FOOTER_TEXT_Y,
    )
    doc.text(`Página ${i} de ${total}`, PDF_PAGE_W - M, CORP_FOOTER_TEXT_Y, { align: 'right' })
  }
}

/** Barra de sección #1e293b, texto blanco mayúsculas. */
export function pdfCorporateSection(ctx: PdfContext, titulo: string): void {
  const doc = ctx.doc
  const M = PDF_MARGIN
  const TW = PDF_TEXT_W
  ctx.checkPage(10)
  const y0 = ctx.y
  doc.setFillColor(...CORP_SECTION_BG)
  doc.rect(M, y0, TW, 7, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text(titulo.toUpperCase(), M + 2, y0 + 4.8)
  ctx.y = y0 + 9
  doc.setTextColor(0, 0, 0)
}

/**
 * Tabla corporativa: cabecera oscura, filas alternas blanco / #f8fafc.
 * `colWidths` en mm; se escala si la suma supera el ancho útil.
 */
export function pdfCorporateTable(
  ctx: PdfContext,
  headers: string[],
  colWidths: number[],
  rows: string[][],
): void {
  const doc = ctx.doc
  const M = PDF_MARGIN
  const TW = PDF_TEXT_W
  const sum = colWidths.reduce((a, b) => a + b, 0)
  const scale = sum > TW ? TW / sum : 1
  const w = colWidths.map(c => c * scale)

  function colLeft(i: number): number {
    let x = M
    for (let j = 0; j < i; j++) x += w[j]
    return x
  }

  ctx.checkPage(8)
  let y = ctx.y
  doc.setFillColor(...CORP_SECTION_BG)
  doc.rect(M, y, TW, 6, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(255, 255, 255)
  headers.forEach((h, i) => {
    doc.text(h, colLeft(i) + 1, y + 4.2, { maxWidth: w[i] - 2 })
  })
  y += 7
  ctx.y = y

  rows.forEach((row, ri) => {
    const linesPerCell = row.map((cell, ci) =>
      doc.splitTextToSize(cell || '—', w[ci] - 2) as string[],
    )
    const maxLines = Math.max(1, ...linesPerCell.map(l => l.length))
    const rowH = 4 + maxLines * 3.6
    ctx.checkPage(rowH + 1)
    y = ctx.y
    const fill = ri % 2 === 0 ? CORP_ROW_A : CORP_ROW_B
    doc.setFillColor(...fill)
    doc.rect(M, y - 0.5, TW, rowH, 'F')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(0, 0, 0)
    linesPerCell.forEach((lines, ci) => {
      let yy = y + 3.5
      lines.forEach(line => {
        doc.text(line, colLeft(ci) + 1, yy)
        yy += 3.6
      })
    })
    y += rowH
    ctx.y = y
  })
  ctx.y += 2
}

/**
 * Orquesta `initPdf`, cabecera corporativa, bloques y pie en todas las páginas.
 * Reutiliza `createPdfContext` vía `initPdf`.
 */
export async function generarPDFCorporativoBase(
  config: GenerarPDFCorporativoBaseConfig,
): Promise<void> {
  const { titulo, subtitulo, fecha, filename, bloques, accentColor } = config
  const { doc, ctx } = await initPdf(accentColor ?? PDF_COLORS.accent)
  ctx.setCorporateMode({ titulo, subtitulo, fecha })
  ctx.addCorporatePageHeader()
  for (const block of bloques) {
    await block(ctx, doc)
  }
  ctx.setCorporateMode(null)
  applyCorporateFootersAllPages(doc, fecha)
  doc.save(filename)
}
