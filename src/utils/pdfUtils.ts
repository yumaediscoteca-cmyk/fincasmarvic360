/**
 * pdfUtils.ts — Utilidades PDF compartidas para todos los módulos de Agrícola Marvic 360
 *
 * Identidad visual unificada (tarjeta corporativa): verde bosque + beige piedra.
 * Carta: Montserrat (Regular/Bold) desde /fonts/*.ttf si cargan; si no, Helvetica.
 *
 * Patrón de uso:
 *   const ctx = createPdfContext(doc)
 *   ...
 *   downloadJsPdf(doc, 'archivo.pdf')
 */

import jsPDF from 'jspdf'

// ── Constantes globales de layout ────────────────────────────────────────────

export const PDF_MARGIN       = 14
export const PDF_PAGE_W       = 210
export const PDF_PAGE_H       = 297
export const PDF_TEXT_W       = PDF_PAGE_W - 2 * PDF_MARGIN
export const PDF_BOTTOM_LIMIT = 280

/** Marca Agrícola Marvic (tarjeta de visita: #1b3022, #d8d3c9). */
export const PDF_BRAND = {
  green:   [27, 48, 34] as [number, number, number],
  beige:   [216, 211, 201] as [number, number, number],
  /** Filas alternas (beige muy suave sobre blanco). */
  rowAlt:  [236, 232, 226] as [number, number, number],
  /** Texto secundario sobre beige / cuerpo. */
  muted:   [60, 75, 65] as [number, number, number],
  white:   [255, 255, 255] as [number, number, number],
}

/** Altura franja cabecera + ancho panel verde (proporción tarjeta ~36%). */
const HEADER_BAND_H    = 36
const HEADER_BRAND_W_MM = 76

/** Límite vertical del contenido cuando el pie corporativo está activo (evita solaparse). */
const CORPORATE_CONTENT_BOTTOM = 266

const CORP_SECTION_BG: [number, number, number] = PDF_BRAND.green
const CORP_ROW_A: [number, number, number] = [255, 255, 255]
const CORP_ROW_B: [number, number, number] = PDF_BRAND.rowAlt

/**
 * Acento por defecto = verde marca (los PDF corporativos ya no usan colores distintos por módulo
 * en cabeceras/tablas; se mantiene el mapa para código legado que aún importe estas claves).
 */
export const PDF_COLORS = {
  accent:    PDF_BRAND.green,
  orange:    PDF_BRAND.green,
  violet:    PDF_BRAND.green,
  amber:     PDF_BRAND.green,
  green:     PDF_BRAND.green,
  fuchsia:   PDF_BRAND.green,
  gray:      PDF_BRAND.muted,
  lightGray: [140, 130, 120] as [number, number, number],
  white:     PDF_BRAND.white,
  dark:      PDF_BRAND.green,
}

export interface MarvicLetterheadConfig {
  titulo: string
  subtitulo: string
  /** Fecha ya formateada (ej. locale largo o formato ejecutivo del Parte Diario). */
  fechaTexto: string
}

/** Nombre interno jsPDF para la familia Montserrat (cartas / cabecera). */
export const PDF_LETTERHEAD_FONT = 'Montserrat'

let montserratTtfCache: { regular: string; bold: string } | null = null

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

async function fetchMontserratTtfBase64(): Promise<{ regular: string; bold: string } | null> {
  if (montserratTtfCache) return montserratTtfCache
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  try {
    const [resR, resB] = await Promise.all([
      fetch(`${origin}/fonts/Montserrat-Regular.ttf`),
      fetch(`${origin}/fonts/Montserrat-Bold.ttf`),
    ])
    if (!resR.ok || !resB.ok) return null
    const [bufR, bufB] = await Promise.all([resR.arrayBuffer(), resB.arrayBuffer()])
    if (!bufR.byteLength || !bufB.byteLength) return null
    montserratTtfCache = {
      regular: arrayBufferToBase64(bufR),
      bold: arrayBufferToBase64(bufB),
    }
    return montserratTtfCache
  } catch {
    return null
  }
}

/**
 * Registra Montserrat (normal + bold) en el VFS del documento. Idempotente por instancia de doc.
 * @returns true si la familia quedó disponible como `PDF_LETTERHEAD_FONT`
 */
export async function registerMontserratLetterheadFonts(doc: jsPDF): Promise<boolean> {
  const fonts = doc.getFontList()
  if (fonts[PDF_LETTERHEAD_FONT]) return true

  const data = await fetchMontserratTtfBase64()
  if (!data) return false

  try {
    doc.addFileToVFS('Montserrat-Regular.ttf', data.regular)
    doc.addFont('Montserrat-Regular.ttf', PDF_LETTERHEAD_FONT, 'normal')
    doc.addFileToVFS('Montserrat-Bold.ttf', data.bold)
    doc.addFont('Montserrat-Bold.ttf', PDF_LETTERHEAD_FONT, 'bold')
    return true
  } catch {
    return false
  }
}

function setLetterheadFont(doc: jsPDF, style: 'normal' | 'bold') {
  const fonts = doc.getFontList()
  if (fonts[PDF_LETTERHEAD_FONT]) {
    doc.setFont(PDF_LETTERHEAD_FONT, style)
  } else {
    doc.setFont('helvetica', style === 'bold' ? 'bold' : 'normal')
  }
}

/**
 * Cabecera de dos franjas: panel verde (logo + AGRÍCOLA / MARVIC) y panel beige (título del documento).
 * Devuelve la posición Y inicial del cuerpo (bajo la línea divisoria).
 */
export function paintMarvicLetterhead(
  doc: jsPDF,
  logoData: PdfImage | null,
  cfg: MarvicLetterheadConfig,
): number {
  const M = PDF_MARGIN
  const PAGE_W = PDF_PAGE_W

  doc.setFillColor(...PDF_BRAND.white)
  doc.rect(0, 0, PAGE_W, HEADER_BAND_H + 6, 'F')

  doc.setFillColor(...PDF_BRAND.green)
  doc.rect(0, 0, HEADER_BRAND_W_MM, HEADER_BAND_H, 'F')
  doc.setFillColor(...PDF_BRAND.beige)
  doc.rect(HEADER_BRAND_W_MM, 0, PAGE_W - HEADER_BRAND_W_MM, HEADER_BAND_H, 'F')

  let brandTextY = 8
  if (logoData) {
    const logoW = 24
    const logoH = Math.min(logoW * (logoData.natH / logoData.natW), 17)
    doc.addImage(logoData.b64, 'JPEG', M, 6, logoW, logoH)
    brandTextY = 6 + logoH + 3
  }
  setLetterheadFont(doc, 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...PDF_BRAND.white)
  doc.text('AGRÍCOLA', M, Math.max(brandTextY, 19))
  setLetterheadFont(doc, 'bold')
  doc.setFontSize(10)
  doc.text('MARVIC', M, Math.max(brandTextY + 4, 24))

  const right = PAGE_W - M
  setLetterheadFont(doc, 'bold')
  doc.setFontSize(11.5)
  doc.setTextColor(...PDF_BRAND.green)
  doc.text(cfg.titulo.toUpperCase(), right, 12, { align: 'right' })
  setLetterheadFont(doc, 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...PDF_BRAND.muted)
  const subLines = doc.splitTextToSize(cfg.subtitulo, PAGE_W - HEADER_BRAND_W_MM - M - 8) as string[]
  let subY = 18
  subLines.forEach(line => {
    doc.text(line, right, subY, { align: 'right' })
    subY += 4
  })
  setLetterheadFont(doc, 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...PDF_BRAND.green)
  doc.text(cfg.fechaTexto, right, Math.max(subY + 1, 28), { align: 'right' })

  const yLine = HEADER_BAND_H + 1
  doc.setDrawColor(...PDF_BRAND.green)
  doc.setLineWidth(0.45)
  doc.line(M, yLine, PAGE_W - M, yLine)
  doc.setFont('helvetica', 'normal')
  return yLine + 5
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
  accentColor: [number, number, number] = PDF_BRAND.green
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
    doc.setFillColor(...PDF_BRAND.white)
    doc.rect(0, 0, PDF_PAGE_W, PDF_PAGE_H, 'F')
    const fechaStr = corporateCfg.fecha.toLocaleDateString('es-ES', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    })
    y = paintMarvicLetterhead(doc, logoData, {
      titulo: corporateCfg.titulo,
      subtitulo: corporateCfg.subtitulo,
      fechaTexto: fechaStr,
    })
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
      doc.setDrawColor(...PDF_BRAND.green)
      doc.setLineWidth(0.2)
      doc.line(M, y, PDF_PAGE_W - M, y)
      y += 4
    },

    addPageHeader(modulo: string, subtitulo = '') {
      if (logoData) {
        doc.addImage(logoData.b64, 'JPEG', M, y, 38, 10)
      }
      doc.setFontSize(8)
      doc.setTextColor(...PDF_BRAND.muted)
      doc.text('AGRÍCOLA MARVIC', PDF_PAGE_W - M, y + 4, { align: 'right' })
      if (modulo) {
        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...PDF_BRAND.green)
        doc.text(
          subtitulo ? `${modulo} — ${subtitulo}` : modulo,
          PDF_PAGE_W - M, y + 8.5, { align: 'right' }
        )
        doc.setFont('helvetica', 'normal')
      }
      y += 14
      doc.setDrawColor(...PDF_BRAND.green)
      doc.setLineWidth(0.4)
      doc.line(M, y, PDF_PAGE_W - M, y)
      y += 5
    },

    writeLine(label, value, size = 9) {
      if (!value) return
      ctx.checkPage(7)
      doc.setFontSize(size)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...PDF_BRAND.green)
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
      doc.setTextColor(...PDF_BRAND.green)
      doc.text(label, M, y)
      doc.setFont('helvetica', 'normal')
      y += size * 0.44 + 0.5
    },

    entryHeader(letra, titulo, hora) {
      ctx.checkPage(14)
      doc.setFillColor(...PDF_BRAND.green)
      doc.rect(M, y, 2, 9, 'F')
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...PDF_BRAND.green)
      doc.text(`[${letra}]  ${titulo}`, M + 4, y + 6)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(...PDF_BRAND.muted)
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
      doc.setFillColor(...PDF_BRAND.green)
      doc.roundedRect(M, y, TW, 14, 2, 2, 'F')
      items.forEach((item, i) => {
        const cx = M + colW * i + colW / 2
        doc.setFontSize(7)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(230, 235, 232)
        doc.text(item.label.toUpperCase(), cx, y + 5, { align: 'center' })
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...PDF_BRAND.white)
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
  accentColor: [number, number, number] = PDF_BRAND.green
): Promise<{ doc: jsPDF; ctx: PdfContext }> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  await registerMontserratLetterheadFonts(doc)
  const logoData = await loadPdfImage(window.location.origin + '/MARVIC_logo.png')
  const ctx = createPdfContext(doc, logoData, accentColor)
  return { doc, ctx }
}

/**
 * Descarga un PDF generado con jsPDF. Usa Blob + ancla para mayor fiabilidad
 * tras cadenas async largas (algunos navegadores bloquean doc.save() tardío).
 */
export function downloadJsPdf(doc: jsPDF, filename: string): void {
  let name = (filename || 'documento').trim() || 'documento.pdf'
  if (!name.toLowerCase().endsWith('.pdf')) name = `${name}.pdf`
  name = name.replace(/[/\\?%*:|"<>]/g, '-')
  try {
    const blob = doc.output('blob')
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = name
    a.rel = 'noopener'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
  } catch (err) {
    console.error('[downloadJsPdf] blob falló, usando doc.save', err)
    doc.save(name)
  }
}

// ── PDF corporativo global (cabecera 45 mm + pie en todas las páginas) ───────

export type CorporatePdfBlock = (ctx: PdfContext, doc: jsPDF) => void | Promise<void>

export interface GenerarPDFCorporativoBaseConfig {
  titulo: string
  subtitulo: string
  fecha: Date
  filename: string
  bloques: CorporatePdfBlock[]
  /** @deprecated Ignorado: todo PDF usa el verde/beige de marca. */
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
    doc.setDrawColor(...PDF_BRAND.green)
    doc.setLineWidth(0.3)
    doc.line(M, CORP_FOOTER_LINE_Y, PDF_PAGE_W - M, CORP_FOOTER_LINE_Y)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...PDF_BRAND.green)
    doc.text(
      `Firmado: JuanPe — Dirección Técnica de Campo  |  Agrícola Marvic 360  |  ${pieFecha}`,
      M,
      CORP_FOOTER_TEXT_Y,
    )
    doc.text(`Página ${i} de ${total}`, PDF_PAGE_W - M, CORP_FOOTER_TEXT_Y, { align: 'right' })
  }
}

/** Barra de sección verde marca, texto blanco mayúsculas. */
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
  doc.setTextColor(...PDF_BRAND.green)
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
    doc.setTextColor(...PDF_BRAND.green)
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
  const { titulo, subtitulo, fecha, filename, bloques } = config
  const { doc, ctx } = await initPdf(PDF_BRAND.green)
  ctx.setCorporateMode({ titulo, subtitulo, fecha })
  ctx.addCorporatePageHeader()
  for (const block of bloques) {
    await block(ctx, doc)
  }
  ctx.setCorporateMode(null)
  applyCorporateFootersAllPages(doc, fecha)
  downloadJsPdf(doc, filename)
}
