import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, X, Clock, History, Plus, Package, AlertCircle,
  FlaskConical, Droplets, Layers, Wind, Wrench, Tractor, FileText, MoveRight,
  Trash2, Cog,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import jsPDF from 'jspdf'
import {
  useUbicaciones, useCategorias, useUltimoRegistro,
  useRegistros, useAddRegistro,
  useProductosCatalogo, useAddProductoCatalogo, useAddMovimiento,
  useActivosEnUbicacionVista, useInventarioUbicacionActivosAll,
  useAperosTablaInventario, useAssignActivoUbicacion, useRemoveActivoUbicacion,
  useMaquinariaAperosAsignadosUbicacion, useResumenUbicacion,
  useEntradas,
} from '@/hooks/useInventario'
import { RecordActions } from '@/components/base'
import { useTractores, useAperos } from '@/hooks/useMaquinaria'

type ActivoAssignTab = 'tractor' | 'apero' | 'maquinaria_apero'
import { supabase } from '@/integrations/supabase/client'
import type { TablesInsert } from '@/integrations/supabase/types'
import { uploadImage } from '@/utils/uploadImage'
import { formatFecha } from '@/utils/dateFormat'

// ── Mapa slug → icono Lucide ──────────────────────────────────
const ICON_MAP: Record<string, LucideIcon> = {
  FlaskConical, Droplets, Layers, Wind, Wrench, Package, Tractor,
}

const UNIDADES = [
  'kg', 'g', 'litros', 'ml', 'm²', 'm',
  'unidades', 'rollos', 'sacos', 'bidones', 'cajas', 'palés', 'otro',
]

const MESES_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

type RegistroConCategoria = {
  id: string
  ubicacion_id: string
  categoria_id: string
  cantidad: number
  unidad: string
  descripcion: string | null
  foto_url: string | null
  foto_url_2: string | null
  notas: string | null
  created_at: string
  precio_unitario: number | null
  producto_id: string | null
  created_by: string | null
  inventario_categorias: { nombre: string; orden: number } | null
}

type PanelView  = 'estado' | 'historico'
type InformeTipo = 'historico' | 'categoria' | 'mes'

export default function InventarioUbicacion() {
  const { ubicacionId } = useParams<{ ubicacionId: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()

  // ── UI state ─────────────────────────────────────────────────
  const [activeCatId, setActiveCatId] = useState<string | null>(null)
  const [panelView,   setPanelView]   = useState<PanelView>('estado')
  const [showModal,   setShowModal]   = useState(false)
  const [now, setNow]                 = useState(new Date())

  // ── Form state ───────────────────────────────────────────────
  const [cantidad,      setCantidad]      = useState('')
  const [unidad,        setUnidad]        = useState('kg')
  const [descripcion,   setDescripcion]   = useState('')
  const [notas,         setNotas]         = useState('')
  const [fotoFile,      setFotoFile]      = useState<File | null>(null)
  const [preview,       setPreview]       = useState<string | null>(null)
  const [submitting,    setSubmitting]    = useState(false)
  const [submitError,   setSubmitError]   = useState<string | null>(null)
  // ── Producto + precio ─────────────────────────────────────────
  const [productoId,    setProductoId]    = useState<string>('')   // UUID | '' | 'nuevo'
  const [productoNombre, setProductoNombre] = useState('')
  const [precioUnitario, setPrecioUnitario] = useState('')
  // ── Segunda foto (fitosanitarios) ────────────────────────────
  const [fotoFile2,     setFotoFile2]     = useState<File | null>(null)
  const [preview2,      setPreview2]      = useState<string | null>(null)
  // ── Responsable ──────────────────────────────────────────────
  const [responsable,   setResponsable]   = useState('')
  // ── Modal mover producto ─────────────────────────────────────
  const [showMoverModal,    setShowMoverModal]    = useState(false)
  const [moverProductoId,   setMoverProductoId]   = useState<string>('')
  const [moverCantidad,     setMoverCantidad]     = useState('')
  const [moverUnidad,       setMoverUnidad]       = useState('kg')
  const [moverDestinoId,    setMoverDestinoId]    = useState('')
  const [moverResponsable,  setMoverResponsable]  = useState('')
  const [moverNotas,        setMoverNotas]        = useState('')
  const [submittingMover,   setSubmittingMover]   = useState(false)
  const [moverError,        setMoverError]        = useState<string | null>(null)

  // ── Informe state ─────────────────────────────────────────────
  const [showInformeModal,   setShowInformeModal]   = useState(false)
  const [informeTipo,        setInformeTipo]        = useState<InformeTipo>('historico')
  const [informeFechaInicio, setInformeFechaInicio] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
  })
  const [informeFechaFin,    setInformeFechaFin]    = useState(() => new Date().toISOString().slice(0, 10))
  const [informeCategoria,   setInformeCategoria]   = useState('')
  const [informeMes,         setInformeMes]         = useState(() => new Date().getMonth() + 1)
  const [informeAnio,        setInformeAnio]        = useState(() => new Date().getFullYear())
  const [generandoPDF,       setGenerandoPDF]       = useState(false)
  const [generandoExcel,     setGenerandoExcel]     = useState(false)
  const [pdfError,           setPdfError]           = useState<string | null>(null)
  const [showPdfMenu,        setShowPdfMenu]        = useState(false)
  // ── Maquinaria / aperos (puente inventario) ─────────────────
  const [showActivoModal,    setShowActivoModal]    = useState(false)
  const [activoTab,          setActivoTab]          = useState<ActivoAssignTab>('tractor')
  const [selTractorId,       setSelTractorId]       = useState('')
  const [selAperoId,         setSelAperoId]         = useState('')
  const [selMaquinariaAperoId, setSelMaquinariaAperoId] = useState('')
  const [activoSubmitting,   setActivoSubmitting]   = useState(false)
  const [activoError,        setActivoError]        = useState<string | null>(null)

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  // ── Datos ────────────────────────────────────────────────────
  const { data: ubicaciones = [] }  = useUbicaciones()
  const { data: categorias  = [] }  = useCategorias()
  const { data: ultimoRegistro }    = useUltimoRegistro(ubicacionId ?? null, activeCatId)
  const { data: registros   = [] }  = useRegistros(ubicacionId ?? null, activeCatId)
  const { data: productos   = [] }  = useProductosCatalogo(activeCatId)
  const addRegistro                 = useAddRegistro()
  const addProductoCatalogo         = useAddProductoCatalogo()
  const addMovimiento               = useAddMovimiento()
  const { data: activosVista = [] } = useActivosEnUbicacionVista(ubicacionId ?? null)
  const { data: todasAsign = [] }  = useInventarioUbicacionActivosAll()
  const { data: resumenUbic = [] } = useResumenUbicacion(ubicacionId ?? null)
  const { data: entradasUbic = [] } = useEntradas(ubicacionId ?? null)
  const { data: aperosInv = [] }    = useAperosTablaInventario()
  const { data: tractores = [] }   = useTractores()
  const { data: maqAperosCat = [] } = useAperos()
  const { data: maperosUbic = [] } = useMaquinariaAperosAsignadosUbicacion(ubicacionId ?? null)
  const assignActivo                = useAssignActivoUbicacion()
  const removeActivo                = useRemoveActivoUbicacion()

  const ubicacion  = ubicaciones.find(u => u.id === ubicacionId)
  const activeCat  = categorias.find(c => c.id === activeCatId)
  const horaStr    = now.toTimeString().slice(0, 8)
  const isFito     = activeCat?.slug === 'fitosanitarios_abonos'
  const importe    = parseFloat(cantidad || '0') * parseFloat(precioUnitario || '0')

  // ── Handlers ─────────────────────────────────────────────────
  function handleSelectCat(id: string) {
    if (activeCatId === id) {
      setActiveCatId(null)
    } else {
      setActiveCatId(id)
      setPanelView('estado')
      setShowModal(false)
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null
    setFotoFile(f)
    setPreview(f ? URL.createObjectURL(f) : null)
  }

  function openModal() {
    setCantidad('')
    setUnidad('kg')
    setDescripcion('')
    setNotas('')
    setFotoFile(null)
    setPreview(null)
    setSubmitError(null)
    setProductoId('')
    setProductoNombre('')
    setPrecioUnitario('')
    setFotoFile2(null)
    setPreview2(null)
    setResponsable('')
    setShowModal(true)
  }

  function openMoverModal() {
    setMoverProductoId('')
    setMoverCantidad('')
    setMoverUnidad('kg')
    setMoverDestinoId('')
    setMoverResponsable('')
    setMoverNotas('')
    setMoverError(null)
    setShowMoverModal(true)
  }

  function openActivoModalFn() {
    setActivoTab('tractor')
    setSelTractorId('')
    setSelAperoId('')
    setSelMaquinariaAperoId('')
    setActivoError(null)
    setShowActivoModal(true)
  }

  const tractoresLibres = tractores.filter(t => {
    const a = todasAsign.find(x => x.maquinaria_tractor_id === t.id)
    return !a
  })
  const aperosLibres = aperosInv.filter(ap => {
    const x = todasAsign.find(y => y.apero_id === ap.id)
    return !x
  })
  const maquinariaAperosLibres = maqAperosCat.filter(a => {
    const x = todasAsign.find(y => y.maquinaria_apero_id === a.id)
    return !x
  })

  async function handleSubmitActivo(e: React.FormEvent) {
    e.preventDefault()
    if (!ubicacionId) return
    setActivoError(null)
    if (activoTab === 'tractor' && !selTractorId) {
      setActivoError('Selecciona un tractor')
      return
    }
    if (activoTab === 'apero' && !selAperoId) {
      setActivoError('Selecciona un apero')
      return
    }
    if (activoTab === 'maquinaria_apero' && !selMaquinariaAperoId) {
      setActivoError('Selecciona un apero del módulo Maquinaria')
      return
    }
    setActivoSubmitting(true)
    try {
      await assignActivo.mutateAsync({
        ubicacion_id: ubicacionId,
        maquinaria_tractor_id: activoTab === 'tractor' ? selTractorId : null,
        apero_id: activoTab === 'apero' ? selAperoId : null,
        maquinaria_apero_id: activoTab === 'maquinaria_apero' ? selMaquinariaAperoId : null,
      })
      setShowActivoModal(false)
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : String(err)
      setActivoError(
        raw.includes('23505') || raw.toLowerCase().includes('unique')
          ? 'Ese activo ya está asignado (solo una ubicación de inventario).'
          : raw
      )
    } finally {
      setActivoSubmitting(false)
    }
  }

  async function handleRemoveActivo(asignacionId: string | null) {
    if (!ubicacionId || !asignacionId) return
    setActivoError(null)
    try {
      await removeActivo.mutateAsync({ id: asignacionId, ubicacion_id: ubicacionId })
    } catch (err: unknown) {
      setActivoError(err instanceof Error ? err.message : 'No se pudo quitar la asignación')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!ubicacionId || !activeCatId || !cantidad) return
    if (isFito && !fotoFile2) {
      setSubmitError('La foto del lote / código de barras es obligatoria para fitosanitarios')
      return
    }
    setSubmitting(true)
    setSubmitError(null)

    try {
      // 1. Crear producto nuevo en catálogo si es necesario
      let resolvedProductoId: string | null = null
      if (productoId === 'nuevo') {
        if (!productoNombre.trim()) throw new Error('El nombre del producto es obligatorio')
        const nuevo = await addProductoCatalogo.mutateAsync({
          nombre:          productoNombre.trim(),
          categoria_id:    activeCatId,
          precio_unitario: precioUnitario ? parseFloat(precioUnitario) : null,
          unidad_defecto:  unidad,
          created_by:      responsable || null,
        })
        resolvedProductoId = nuevo.id
      } else if (productoId) {
        resolvedProductoId = productoId
      }

      // 2. Subir foto 1
      let foto_url: string | null = null
      if (fotoFile) {
        const ext  = fotoFile.name.split('.').pop() ?? 'jpg'
        const path = `${ubicacionId}/${activeCatId}/${Date.now()}.${ext}`
        foto_url = await uploadImage(fotoFile, 'inventario-images', path, false)
        if (!foto_url) throw new Error('Error subiendo foto 1')
      }

      // 3. Subir foto 2 (lote/código de barras, solo fitos)
      let foto_url_2: string | null = null
      if (fotoFile2) {
        const ext  = fotoFile2.name.split('.').pop() ?? 'jpg'
        const path = `${ubicacionId}/${activeCatId}/lote_${Date.now()}.${ext}`
        foto_url_2 = await uploadImage(fotoFile2, 'inventario-images', path, false)
        if (!foto_url_2) throw new Error('Error subiendo foto 2')
      }

      // 4. Insertar registro
      await addRegistro.mutateAsync({
        ubicacion_id:    ubicacionId,
        categoria_id:    activeCatId,
        cantidad:        parseFloat(cantidad),
        unidad,
        descripcion:     descripcion     || null,
        notas:           notas           || null,
        foto_url,
        foto_url_2,
        precio_unitario: precioUnitario ? parseFloat(precioUnitario) : null,
        producto_id:     resolvedProductoId,
        created_by:      responsable     || null,
      })

      setShowModal(false)
      setPanelView('estado')

    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSubmitMover(e: React.FormEvent) {
    e.preventDefault()
    if (!ubicacionId || !activeCatId || !moverCantidad || !moverDestinoId) return
    setSubmittingMover(true)
    setMoverError(null)

    try {
      const cantidadNum = parseFloat(moverCantidad)

      // Leer stock actual en origen
      const { data: origenRow } = await supabase
        .from('inventario_registros')
        .select('cantidad, unidad')
        .eq('ubicacion_id', ubicacionId)
        .eq('categoria_id', activeCatId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      const stockOrigen = origenRow?.cantidad ?? 0
      if (cantidadNum > stockOrigen) {
        throw new Error(
          `Stock insuficiente en origen (disponible: ${stockOrigen} ${origenRow?.unidad ?? ''})`
        )
      }

      // Leer stock actual en destino
      const { data: destinoRow } = await supabase
        .from('inventario_registros')
        .select('cantidad')
        .eq('ubicacion_id', moverDestinoId)
        .eq('categoria_id', activeCatId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      const stockDestino = destinoRow?.cantidad ?? 0

      // Nuevo registro en origen con stock reducido
      await addRegistro.mutateAsync({
        ubicacion_id: ubicacionId,
        categoria_id: activeCatId,
        cantidad:     stockOrigen - cantidadNum,
        unidad:       moverUnidad,
        descripcion:  'Salida por movimiento a otra ubicación',
        producto_id:  moverProductoId || null,
        created_by:   moverResponsable || null,
      })

      // Nuevo registro en destino con stock ampliado
      await addRegistro.mutateAsync({
        ubicacion_id: moverDestinoId,
        categoria_id: activeCatId,
        cantidad:     stockDestino + cantidadNum,
        unidad:       moverUnidad,
        descripcion:  'Entrada por movimiento desde otra ubicación',
        producto_id:  moverProductoId || null,
        created_by:   moverResponsable || null,
      })

      // Registrar el movimiento para trazabilidad
      await addMovimiento.mutateAsync({
        producto_id:          moverProductoId || null,
        categoria_id:         activeCatId,
        ubicacion_origen_id:  ubicacionId,
        ubicacion_destino_id: moverDestinoId,
        cantidad:             cantidadNum,
        unidad:               moverUnidad,
        responsable:          moverResponsable || null,
        notas:                moverNotas       || null,
        created_by:           moverResponsable || null,
      })

      setShowMoverModal(false)

    } catch (err: unknown) {
      setMoverError(err instanceof Error ? err.message : 'Error al registrar el movimiento')
    } finally {
      setSubmittingMover(false)
    }
  }

  // ── Generación PDF ───────────────────────────────────────────
  // ── Helper formato moneda ────────────────────────────────────
  function fmtEur(n: number | null | undefined): string {
    if (n == null) return '—'
    return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
  }

  // ── Helper consulta datos informe (compartido PDF + Excel) ───
  async function fetchGruposInforme(): Promise<Map<string, { nombre: string; rows: RegistroConCategoria[] }>> {
    const base = supabase
      .from('inventario_registros')
      .select('*, inventario_categorias(nombre, orden)')
      .eq('ubicacion_id', ubicacionId!)

    let query = base
    if (informeTipo === 'historico') {
      query = query
        .gte('created_at', `${informeFechaInicio}T00:00:00`)
        .lte('created_at', `${informeFechaFin}T23:59:59`)
        .order('categoria_id')
        .order('created_at', { ascending: false })
    } else if (informeTipo === 'categoria') {
      query = query
        .eq('categoria_id', informeCategoria)
        .gte('created_at', `${informeFechaInicio}T00:00:00`)
        .lte('created_at', `${informeFechaFin}T23:59:59`)
        .order('created_at', { ascending: false })
    } else {
      const firstDay = `${informeAnio}-${String(informeMes).padStart(2, '0')}-01`
      query = query
        .lte('created_at', `${firstDay}T23:59:59`)
        .order('categoria_id')
        .order('created_at', { ascending: false })
    }

    const { data, error } = await query
    if (error) throw error

    const rows = (data ?? []) as unknown as RegistroConCategoria[]

    if (informeTipo === 'mes') {
      // Solo el último registro por categoría
      const porCategoria = new Map<string, RegistroConCategoria>()
      for (const r of rows) {
        if (!porCategoria.has(r.categoria_id)) porCategoria.set(r.categoria_id, r)
      }
      const sorted = Array.from(porCategoria.values()).sort(
        (a, b) => (a.inventario_categorias?.orden ?? 0) - (b.inventario_categorias?.orden ?? 0)
      )
      const groups = new Map<string, { nombre: string; rows: RegistroConCategoria[] }>()
      for (const r of sorted) {
        const nombre = r.inventario_categorias?.nombre ?? 'Sin categoria'
        groups.set(r.categoria_id, { nombre, rows: [r] })
      }
      return groups
    }

    const groups = new Map<string, { nombre: string; rows: RegistroConCategoria[] }>()
    for (const r of rows) {
      const nombre = r.inventario_categorias?.nombre ?? 'Sin categoria'
      if (!groups.has(r.categoria_id)) groups.set(r.categoria_id, { nombre, rows: [] })
      groups.get(r.categoria_id)!.rows.push(r)
    }
    return groups
  }

  async function generarPDF() {
    if (!ubicacionId || !ubicacion) return
    setGenerandoPDF(true)
    setPdfError(null)

    try {
      const doc    = new jsPDF()
      const margin = 15
      const maxW   = 180
      let y        = 25
      const lh     = 6

      async function loadImage(url: string): Promise<{ data: string; w: number; h: number } | null> {
        try {
          const res  = await fetch(url)
          const blob = await res.blob()
          return await new Promise(resolve => {
            const img = new Image()
            img.crossOrigin = 'anonymous'
            img.onload = () => {
              const canvas = document.createElement('canvas')
              canvas.width  = img.naturalWidth
              canvas.height = img.naturalHeight
              const ctx = canvas.getContext('2d')!
              ctx.fillStyle = '#ffffff'
              ctx.fillRect(0, 0, canvas.width, canvas.height)
              ctx.drawImage(img, 0, 0)
              const data = canvas.toDataURL('image/jpeg', 0.8)
              URL.revokeObjectURL(img.src)
              resolve({ data, w: img.naturalWidth, h: img.naturalHeight })
            }
            img.onerror = () => resolve(null)
            img.src = URL.createObjectURL(blob)
          })
        } catch {
          return null
        }
      }

      // Cargar logo una sola vez
      const logo = await loadImage('/MARVIC_logo.png')

      function addLogoToPage() {
        if (!logo) return
        const lw = 38
        const lh2 = lw * (logo.h / logo.w)
        doc.addImage(logo.data, 'JPEG', 210 - margin - lw, 6, lw, lh2)
      }

      function checkPage() {
        if (y > 272) {
          doc.addPage()
          addLogoToPage()
          y = 25
        }
      }

      function writeLine(text: string, bold = false, size = 10) {
        doc.setFontSize(size)
        doc.setFont('helvetica', bold ? 'bold' : 'normal')
        const lines = doc.splitTextToSize(text, maxW) as string[]
        for (const l of lines) {
          checkPage()
          doc.text(l, margin, y)
          y += lh
        }
      }

      function separator() {
        checkPage()
        doc.setDrawColor(160)
        doc.line(margin, y, margin + maxW, y)
        y += lh
      }

      async function addPhoto(url: string | null) {
        if (!url) return
        const img = await loadImage(url)
        if (!img) return
        writeLine('Foto adjunta:')
        const imgW = 80
        const imgH = imgW * (img.h / img.w)
        if (y + imgH > 272) { doc.addPage(); addLogoToPage(); y = 25 }
        doc.addImage(img.data, 'JPEG', margin, y, imgW, imgH)
        y += imgH + 4
      }

      // Logo primera página
      addLogoToPage()

      // ── Cabecera ─────────────────────────────────────────────
      writeLine('INVENTARIO DE ACTIVOS FISICOS — AGRICOLA MARVIC 360', true, 13)
      y += 2
      writeLine(`Ubicacion: ${ubicacion.nombre}`)
      writeLine(`Generado el: ${new Date().toLocaleString('es-ES')}`)

      if (informeTipo === 'historico') {
        writeLine(`Periodo: ${informeFechaInicio} a ${informeFechaFin}`)
      } else if (informeTipo === 'categoria') {
        const cat = categorias.find(c => c.id === informeCategoria)
        writeLine(`Categoria: ${cat?.nombre ?? ''}`)
        writeLine(`Periodo: ${informeFechaInicio} a ${informeFechaFin}`)
      } else {
        writeLine(`Stock a 01/${String(informeMes).padStart(2, '0')}/${informeAnio}`)
      }

      y += 2
      separator()

      // ── Datos ────────────────────────────────────────────────
      const groups = await fetchGruposInforme()
      let totalGeneral = 0

      if (groups.size === 0) {
        writeLine('Sin registros en el periodo seleccionado.')
      }

      for (const [, g] of groups) {
        writeLine(g.nombre.toUpperCase(), true, 11)
        y += 1
        let totalSeccion = 0

        for (const r of g.rows) {
          writeLine(`  Fecha: ${formatFecha(r.created_at)}`)
          writeLine(`  Cantidad: ${r.cantidad} ${r.unidad}`)
          if (r.descripcion) writeLine(`  Descripcion: ${r.descripcion}`)
          if (r.precio_unitario != null) {
            const imp = r.cantidad * r.precio_unitario
            totalSeccion += imp
            writeLine(`  Precio: ${fmtEur(r.precio_unitario)}/unidad  —  Importe: ${fmtEur(imp)}`)
          }
          if (r.notas) writeLine(`  Notas: ${r.notas}`)
          await addPhoto(r.foto_url)
          if (r.foto_url_2) await addPhoto(r.foto_url_2)
          y += 2
        }

        if (totalSeccion > 0) {
          y += 1
          writeLine(`  TOTAL ${g.nombre.toUpperCase()}: ${fmtEur(totalSeccion)}`, true)
          totalGeneral += totalSeccion
        }
        y += 3
      }

      // ── Total general ─────────────────────────────────────────
      if (totalGeneral > 0) {
        y += 2
        separator()
        writeLine(`TOTAL GENERAL: ${fmtEur(totalGeneral)}`, true, 12)
      }

      // ── Descarga ─────────────────────────────────────────────
      const slug  = ubicacion.nombre.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 25)
      const fecha = new Date().toISOString().slice(0, 10)
      doc.save(`inventario_${slug}_${fecha}.pdf`)
      setShowInformeModal(false)

    } catch (err: unknown) {
      setPdfError(err instanceof Error ? err.message : 'Error generando el PDF')
    } finally {
      setGenerandoPDF(false)
    }
  }

  async function generarExcel() {
    if (!ubicacionId || !ubicacion) return
    setGenerandoExcel(true)
    setPdfError(null)

    try {
      const XLSX = await import('xlsx')
      const groups = await fetchGruposInforme()

      const wb = XLSX.utils.book_new()

      for (const [, g] of groups) {
        const header = [
          'Descripción / Producto', 'Fecha', 'Cantidad', 'Unidad',
          'Precio Unit. (€)', 'Importe (€)',
        ]
        const filas: (string | number)[][] = [header]
        let totalHoja = 0

        for (const r of g.rows) {
          const imp = r.precio_unitario != null ? r.cantidad * r.precio_unitario : null
          if (imp != null) totalHoja += imp
          filas.push([
            r.descripcion ?? '',
            new Date(r.created_at).toLocaleString('es-ES'),
            r.cantidad,
            r.unidad,
            r.precio_unitario ?? '',
            imp != null ? Math.round(imp * 100) / 100 : '',
          ])
        }

        // Fila TOTAL
        filas.push(['', '', '', '', 'TOTAL:', Math.round(totalHoja * 100) / 100])

        const ws = XLSX.utils.aoa_to_sheet(filas)
        ws['!cols'] = [
          { wch: 35 }, { wch: 18 }, { wch: 10 },
          { wch: 10 }, { wch: 16 }, { wch: 14 },
        ]
        const sheetName = g.nombre.slice(0, 31).replace(/[\\/*?:[\]]/g, '_')
        XLSX.utils.book_append_sheet(wb, ws, sheetName)
      }

      const slug  = ubicacion.nombre.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 25)
      const fecha = new Date().toISOString().slice(0, 10)
      XLSX.writeFile(wb, `Inventario_${slug}_${fecha}.xlsx`)
      setShowInformeModal(false)

    } catch (err: unknown) {
      setPdfError(err instanceof Error ? err.message : 'Error generando Excel')
    } finally {
      setGenerandoExcel(false)
    }
  }

  // ─────────────────────────────────────────────────────────────
  return (
    <div className="h-screen w-screen relative overflow-hidden bg-[#020617]">

      {/* ── FONDO — LOGO WATERMARK ─────────────────────────── */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
        <img
          src="/MARVIC_logo.png"
          className="w-[520px] opacity-[0.04]"
          style={{ filter: 'brightness(0) invert(1)' }}
        />
      </div>

      {/* ── PANEL IDENTIDAD ────────────────────────────────── */}
      <div className="absolute top-4 left-4 z-[1000] bg-slate-900/90 border border-white/10 rounded-lg px-4 py-3 min-w-[200px] max-w-[260px]">
        <p className="text-[10px] font-black text-[#38bdf8] uppercase tracking-[0.3em] mb-1">
          Marvic 360 · Inventario
        </p>
        <p className="text-sm font-black text-white uppercase tracking-tight leading-tight">
          {ubicacion?.nombre ?? '…'}
        </p>
        <div className="flex items-center gap-2 mt-2">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-[10px] text-green-400 font-bold uppercase tracking-widest">Operativo</span>
          <span className="text-[10px] text-slate-500 ml-auto font-mono">{horaStr}</span>
        </div>
      </div>

      {/* ── BOTÓN VOLVER ───────────────────────────────────── */}
      <button
        onClick={() => navigate('/inventario')}
        className="absolute top-4 left-[276px] z-[1000] w-8 h-8 rounded-lg border border-white/10 flex items-center justify-center bg-slate-900/90 hover:border-[#38bdf8]/40 transition-colors"
      >
        <ArrowLeft className="w-4 h-4 text-slate-400" />
      </button>

      {/* ── MENÚ VERTICAL DERECHA — 7 CATEGORÍAS + INFORME ── */}
      <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-1">
        {categorias.map(cat => {
          const Icon = ICON_MAP[cat.icono] ?? Package
          return (
            <button
              key={cat.id}
              onClick={() => handleSelectCat(cat.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                activeCatId === cat.id
                  ? 'bg-[#38bdf8]/20 border-[#38bdf8]/60 text-[#38bdf8]'
                  : 'bg-slate-900/90 border-white/10 text-slate-300 hover:border-[#38bdf8]/30 hover:text-[#38bdf8]'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              {cat.nombre}
            </button>
          )
        })}

        {/* Separador + menú desplegable PDF */}
        <div className="w-full h-px bg-white/10 my-1" />
        <div className="relative">
          <button
            onClick={() => setShowPdfMenu(v => !v)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap bg-slate-900/90 border-white/10 text-slate-300 hover:border-[#38bdf8]/30 hover:text-[#38bdf8] w-full"
          >
            <FileText className="w-3.5 h-3.5 shrink-0" />
            Informes PDF
            <ChevronDown className="w-3 h-3 ml-auto" />
          </button>
          {showPdfMenu && (
            <div className="absolute right-0 top-full mt-1 w-56 bg-slate-900 border border-white/10 rounded-lg shadow-xl z-10 overflow-hidden">
              {[
                { label: 'Informe completo ubicacion', tipo: 'historico' as const },
                { label: 'Stock actual por categoria', tipo: 'mes' as const },
                { label: 'Por categoria especifica', tipo: 'categoria' as const },
              ].map(({ label, tipo }) => (
                <button
                  key={tipo}
                  onClick={() => { setInformeTipo(tipo); setPdfError(null); setShowInformeModal(true); setShowPdfMenu(false); }}
                  className="w-full text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-300 hover:bg-[#38bdf8]/10 hover:text-[#38bdf8] transition-colors"
                >
                  {label}
                </button>
              ))}
              <div className="w-full h-px bg-white/10" />
              <button
                onClick={() => { setInformeTipo('historico'); setShowInformeModal(true); setShowPdfMenu(false); }}
                className="w-full text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-300 hover:bg-[#38bdf8]/10 hover:text-[#38bdf8] transition-colors"
              >
                Exportar Excel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── PANEL LATERAL ──────────────────────────────────── */}
      {activeCatId && activeCat && (
        <div className="absolute top-4 right-[300px] bottom-10 z-[999] w-80 bg-slate-900/95 border border-white/10 rounded-lg flex flex-col overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
            <span className="text-[11px] font-black text-[#38bdf8] uppercase tracking-widest">
              {activeCat.nombre}
            </span>
            <button onClick={() => setActiveCatId(null)}>
              <X className="w-4 h-4 text-slate-500 hover:text-white" />
            </button>
          </div>

          {/* Sub-nav */}
          <div className="flex border-b border-white/10 shrink-0">
            {([
              { id: 'estado',    label: 'Estado actual', icon: Clock    },
              { id: 'historico', label: 'Histórico',     icon: History  },
            ] as const).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setPanelView(id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all border-b-2 ${
                  panelView === id
                    ? 'border-[#38bdf8] text-[#38bdf8]'
                    : 'border-transparent text-slate-500 hover:text-slate-300'
                }`}
              >
                <Icon className="w-3 h-3" />
                {label}
              </button>
            ))}
          </div>

          {/* Contenido */}
          <div className="flex-1 overflow-y-auto p-4">

            {/* ── ESTADO ACTUAL ── */}
            {panelView === 'estado' && (
              !ultimoRegistro ? (
                <div className="flex flex-col items-center justify-center h-32 gap-2">
                  <Package className="w-6 h-6 text-slate-600" />
                  <p className="text-[11px] text-slate-500 uppercase tracking-widest text-center">
                    Sin registros aún
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="bg-slate-800/60 border border-white/10 rounded-lg p-3">
                    <p className="text-[9px] text-slate-500 uppercase tracking-widest mb-1">Último registro</p>
                    <p className="text-2xl font-black text-white">
                      {ultimoRegistro.cantidad}
                      <span className="text-base text-slate-400 font-normal ml-1">
                        {ultimoRegistro.unidad}
                      </span>
                    </p>
                    {ultimoRegistro.descripcion && (
                      <p className="text-[11px] text-slate-400 mt-1">{ultimoRegistro.descripcion}</p>
                    )}
                    <p className="text-[9px] text-slate-600 mt-2 font-mono">
                      {formatFecha(ultimoRegistro.created_at)}
                    </p>
                  </div>
                  {ultimoRegistro.precio_unitario != null && (
                    <div className="bg-slate-800/40 rounded-lg p-3">
                      <p className="text-[9px] text-slate-500 uppercase tracking-widest mb-1">Valor aprox.</p>
                      <p className="text-lg font-black text-[#38bdf8]">
                        {(ultimoRegistro.cantidad * ultimoRegistro.precio_unitario)
                          .toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                      </p>
                      <p className="text-[9px] text-slate-600 mt-0.5">
                        {ultimoRegistro.precio_unitario
                          .toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €/unidad
                      </p>
                    </div>
                  )}
                  {ultimoRegistro.notas && (
                    <div className="bg-slate-800/40 rounded-lg p-3">
                      <p className="text-[9px] text-slate-500 uppercase tracking-widest mb-1">Notas</p>
                      <p className="text-[11px] text-slate-400">{ultimoRegistro.notas}</p>
                    </div>
                  )}
                  {ultimoRegistro.foto_url && (
                    <img
                      src={ultimoRegistro.foto_url}
                      alt="Foto registro"
                      className="w-full rounded-lg border border-white/10 object-cover max-h-40"
                    />
                  )}
                </div>
              )
            )}

            {/* ── HISTÓRICO ── */}
            {panelView === 'historico' && (
              registros.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 gap-2">
                  <History className="w-6 h-6 text-slate-600" />
                  <p className="text-[11px] text-slate-500 uppercase tracking-widest text-center">
                    Sin registros aún
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {registros.map(r => (
                    <div
                      key={r.id}
                      className="bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[13px] font-black text-white">
                          {r.cantidad}
                          <span className="text-[11px] text-slate-400 font-normal ml-1">{r.unidad}</span>
                        </p>
                        <p className="text-[9px] text-slate-600 font-mono shrink-0">
                          {formatFecha(r.created_at)}
                        </p>
                      </div>
                      {r.descripcion && (
                        <p className="text-[10px] text-slate-400 mt-0.5">{r.descripcion}</p>
                      )}
                      <div className="flex justify-end mt-1">
                        <RecordActions
                          onDelete={async () => {
                            if (!confirm('¿Eliminar este registro?')) return
                            await supabase.from('inventario_registros').delete().eq('id', r.id)
                            qc.invalidateQueries({ queryKey: ['inventario_registros', ubicacionId, activeCatId] })
                            qc.invalidateQueries({ queryKey: ['inventario_ultimo_registro', ubicacionId, activeCatId] })
                            qc.invalidateQueries({ queryKey: ['inventario_resumen_ubicacion', ubicacionId] })
                            qc.invalidateQueries({ queryKey: ['inventario_total_registros'] })
                            qc.invalidateQueries({ queryKey: ['inventario_conteos_ubicaciones'] })
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

          </div>

          {/* Footer — dos botones */}
          <div className="shrink-0 p-3 border-t border-white/10 flex gap-2">
            <button
              onClick={openModal}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-[#38bdf8]/20 border border-[#38bdf8]/40 hover:bg-[#38bdf8]/30 transition-all text-[10px] font-black uppercase tracking-widest text-[#38bdf8]"
            >
              <Plus className="w-3.5 h-3.5" />
              Añadir
            </button>
            <button
              onClick={openMoverModal}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-slate-800 border border-white/10 hover:border-[#38bdf8]/30 hover:text-[#38bdf8] transition-all text-[10px] font-black uppercase tracking-widest text-slate-400"
            >
              <MoveRight className="w-3.5 h-3.5" />
              Mover
            </button>
          </div>

        </div>
      )}

      {/* ── STOCK ACTUAL POR CATEGORÍA ─────────────────────── */}
      {resumenUbic.length > 0 && (
        <div className="absolute top-[84px] left-4 z-[997] w-[min(100%-2rem,22rem)] bg-slate-900/95 border border-[#38bdf8]/20 rounded-lg overflow-hidden shadow-lg">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10 bg-[#38bdf8]/5">
            <Package className="w-3.5 h-3.5 text-[#38bdf8]" />
            <span className="text-[10px] font-black text-[#38bdf8] uppercase tracking-widest">Stock actual</span>
          </div>
          <div className="px-3 py-2 space-y-1 max-h-[28vh] overflow-y-auto">
            {resumenUbic.map(r => {
              const cat = (r as { inventario_categorias?: { nombre: string } | null }).inventario_categorias
              // Entrada reciente: creada en los últimos 7 días
              const esReciente = (Date.now() - new Date(r.created_at).getTime()) < 7 * 24 * 3600 * 1000
              // Entradas de esta categoría en esta ubicación
              const nEntradas = entradasUbic.filter(e => e.categoria_id === r.categoria_id).length
              return (
                <div key={r.id} className="flex items-center justify-between gap-2 py-1">
                  <span className="text-[10px] text-slate-400 truncate">{cat?.nombre ?? '—'}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    {esReciente && (
                      <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded border border-green-500/40 text-green-400">Entrada reciente</span>
                    )}
                    {nEntradas > 0 && (
                      <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded border border-[#38bdf8]/40 text-[#38bdf8]">{nEntradas} entrada{nEntradas !== 1 ? 's' : ''}</span>
                    )}
                    <span className="text-[11px] font-black text-white">{r.cantidad} <span className="text-slate-500 font-normal">{r.unidad}</span></span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── MAQUINARIA / APEROS (mismos IDs que Maquinaria + tabla aperos) ── */}
      {ubicacionId && (
        <div className="absolute bottom-14 left-4 z-[998] w-[min(100%-2rem,22rem)] max-h-[38vh] flex flex-col bg-slate-900/95 border border-[#fb923c]/30 rounded-lg overflow-hidden shadow-xl">
          <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 bg-[#fb923c]/10 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <Cog className="w-4 h-4 text-[#fb923c] shrink-0" />
              <span className="text-[10px] font-black text-[#fb923c] uppercase tracking-widest truncate">
                Maquinaria aquí
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => navigate('/maquinaria')}
                className="text-[9px] font-bold uppercase tracking-wider text-slate-400 hover:text-[#fb923c] px-2 py-1"
              >
                Módulo
              </button>
              <button
                type="button"
                onClick={openActivoModalFn}
                className="text-[9px] font-black uppercase tracking-wider bg-[#fb923c]/20 border border-[#fb923c]/40 text-[#fb923c] px-2 py-1 rounded"
              >
                + Asignar
              </button>
            </div>
          </div>
          <div className="overflow-y-auto p-2 space-y-1.5 flex-1 min-h-0">
            {activosVista.length === 0 && maperosUbic.length === 0 ? (
              <p className="text-[10px] text-slate-500 text-center py-3 uppercase tracking-widest">
                Ningún activo asignado a esta ubicación
              </p>
            ) : (
              <>
                {activosVista.map(row => {
                  const aid = row.asignacion_id
                  const isTr = row.tipo_activo === 'tractor'
                  return (
                    <div
                      key={aid ?? `${row.tipo_activo}-${row.etiqueta}`}
                      className="flex items-start gap-2 bg-slate-800/50 border border-white/5 rounded-lg px-2 py-1.5"
                    >
                      {isTr ? (
                        <Tractor className="w-3.5 h-3.5 text-[#fb923c] shrink-0 mt-0.5" />
                      ) : (
                        <Wrench className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-bold text-white truncate">{row.etiqueta}</p>
                        {row.detalle ? (
                          <p className="text-[9px] text-slate-500 truncate">{row.detalle}</p>
                        ) : null}
                        {row.ubicacion_texto_legacy ? (
                          <p className="text-[8px] text-slate-600 truncate" title="Texto legacy en ficha">
                            Legacy: {row.ubicacion_texto_legacy}
                          </p>
                        ) : null}
                      </div>
                      {aid ? (
                        <button
                          type="button"
                          title="Quitar de esta ubicación"
                          onClick={() => { void handleRemoveActivo(aid) }}
                          className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10 shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      ) : null}
                    </div>
                  )
                })}
                {maperosUbic.map(row => {
                  const det = row.maquinaria_aperos
                  return (
                    <div
                      key={row.id}
                      className="flex items-start gap-2 bg-slate-800/50 border border-orange-500/20 rounded-lg px-2 py-1.5"
                    >
                      <Wrench className="w-3.5 h-3.5 text-orange-400 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold text-orange-200/90 uppercase tracking-wider">Apero maquinaria</p>
                        <p className="text-[11px] font-bold text-white truncate">{det?.tipo ?? '—'}</p>
                        {det?.descripcion ? (
                          <p className="text-[9px] text-slate-500 truncate">{det.descripcion}</p>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        title="Quitar de esta ubicación"
                        onClick={() => { void handleRemoveActivo(row.id) }}
                        className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10 shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )
                })}
              </>
            )}
          </div>
          {activoError && !showActivoModal ? (
            <p className="text-[9px] text-red-400 px-2 py-1 border-t border-white/5">{activoError}</p>
          ) : null}
        </div>
      )}

      {/* ── BARRA INFERIOR ─────────────────────────────────── */}
      <div className="absolute bottom-0 left-0 right-0 z-[1000] bg-slate-900/90 border-t border-white/10 px-4 py-1.5 flex items-center gap-6">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate max-w-[300px]">
          Ubicación: <span className="text-white">{ubicacion?.nombre ?? '…'}</span>
        </span>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          Categorías: <span className="text-white">7</span>
        </span>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          Conexión: <span className="text-green-400">Online</span>
        </span>
        <span className="text-[10px] font-mono text-slate-400 ml-auto">{horaStr}</span>
      </div>

      {/* ── MODAL — INFORME PDF ──────────────────────────────── */}
      {showInformeModal && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowInformeModal(false)} />
          <div className="relative z-10 bg-slate-900 border border-white/10 rounded-xl shadow-2xl w-full max-w-md mx-4 flex flex-col max-h-[85vh]">

            {/* Header */}
            <div className="flex items-start justify-between px-5 py-4 border-b border-white/10 shrink-0">
              <div>
                <p className="text-[11px] font-black text-[#38bdf8] uppercase tracking-[0.3em]">
                  Informe PDF
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">{ubicacion?.nombre}</p>
              </div>
              <button
                onClick={() => setShowInformeModal(false)}
                className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center hover:bg-slate-700 transition-colors ml-4 shrink-0"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            {/* Tipo tabs */}
            <div className="flex border-b border-white/10 shrink-0">
              {([
                { id: 'historico', label: 'Histórico'     },
                { id: 'categoria', label: 'Por categoría' },
                { id: 'mes',       label: 'Stock mes'     },
              ] as const).map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setInformeTipo(id)}
                  className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all border-b-2 ${
                    informeTipo === id
                      ? 'border-[#38bdf8] text-[#38bdf8]'
                      : 'border-transparent text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Campos según tipo */}
            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">

              {/* ── Histórico completo ── */}
              {informeTipo === 'historico' && (
                <>
                  <p className="text-[10px] text-slate-400">
                    Todos los registros de esta ubicación en el periodo, agrupados por categoría.
                  </p>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                      Fecha inicio
                    </label>
                    <input
                      type="date"
                      value={informeFechaInicio}
                      onChange={e => setInformeFechaInicio(e.target.value)}
                      className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#38bdf8]/50"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                      Fecha fin
                    </label>
                    <input
                      type="date"
                      value={informeFechaFin}
                      onChange={e => setInformeFechaFin(e.target.value)}
                      className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#38bdf8]/50"
                    />
                  </div>
                </>
              )}

              {/* ── Por categoría ── */}
              {informeTipo === 'categoria' && (
                <>
                  <p className="text-[10px] text-slate-400">
                    Todos los registros de una categoría específica en el periodo seleccionado.
                  </p>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                      Categoría <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={informeCategoria}
                      onChange={e => setInformeCategoria(e.target.value)}
                      className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#38bdf8]/50"
                    >
                      <option value="">Seleccionar…</option>
                      {categorias.map(c => (
                        <option key={c.id} value={c.id}>{c.nombre}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                      Fecha inicio
                    </label>
                    <input
                      type="date"
                      value={informeFechaInicio}
                      onChange={e => setInformeFechaInicio(e.target.value)}
                      className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#38bdf8]/50"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                      Fecha fin
                    </label>
                    <input
                      type="date"
                      value={informeFechaFin}
                      onChange={e => setInformeFechaFin(e.target.value)}
                      className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#38bdf8]/50"
                    />
                  </div>
                </>
              )}

              {/* ── Stock día 1 del mes ── */}
              {informeTipo === 'mes' && (
                <>
                  <p className="text-[10px] text-slate-400">
                    El último registro de cada categoría registrado hasta el día 1 del mes seleccionado.
                  </p>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                        Mes
                      </label>
                      <select
                        value={informeMes}
                        onChange={e => setInformeMes(Number(e.target.value))}
                        className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#38bdf8]/50"
                      >
                        {MESES_ES.map((m, i) => (
                          <option key={i + 1} value={i + 1}>{m}</option>
                        ))}
                      </select>
                    </div>
                    <div className="w-28">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                        Año
                      </label>
                      <input
                        type="number"
                        min="2024"
                        max="2030"
                        value={informeAnio}
                        onChange={e => setInformeAnio(Number(e.target.value))}
                        className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#38bdf8]/50"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Error PDF */}
              {pdfError && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <p className="text-[11px] text-red-400">{pdfError}</p>
                </div>
              )}

            </div>

            {/* Footer — generar PDF + Excel */}
            <div className="shrink-0 px-5 py-4 border-t border-white/10 flex gap-2">
              <button
                onClick={generarPDF}
                disabled={generandoPDF || generandoExcel || (informeTipo === 'categoria' && !informeCategoria)}
                className="flex-1 py-2.5 rounded-lg bg-[#38bdf8]/20 border border-[#38bdf8]/40 hover:bg-[#38bdf8]/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-[11px] font-black uppercase tracking-widest text-[#38bdf8] flex items-center justify-center gap-2"
              >
                {generandoPDF ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-[#38bdf8] border-t-transparent rounded-full animate-spin" />
                    PDF...
                  </>
                ) : (
                  <>
                    <FileText className="w-3.5 h-3.5" />
                    Generar PDF
                  </>
                )}
              </button>
              <button
                onClick={generarExcel}
                disabled={generandoPDF || generandoExcel || (informeTipo === 'categoria' && !informeCategoria)}
                className="flex-1 py-2.5 rounded-lg bg-slate-800 border border-white/10 hover:border-[#38bdf8]/30 hover:text-[#38bdf8] disabled:opacity-40 disabled:cursor-not-allowed transition-all text-[11px] font-black uppercase tracking-widest text-slate-300 flex items-center justify-center gap-2"
              >
                {generandoExcel ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                    Excel...
                  </>
                ) : (
                  <>
                    <FileText className="w-3.5 h-3.5" />
                    Exportar Excel
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ── MODAL — AÑADIR REGISTRO ─────────────────────────── */}
      {showModal && activeCat && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative z-10 bg-slate-900 border border-white/10 rounded-xl shadow-2xl w-full max-w-md mx-4 flex flex-col max-h-[85vh]">

            {/* Modal header */}
            <div className="flex items-start justify-between px-5 py-4 border-b border-white/10 shrink-0">
              <div>
                <p className="text-[11px] font-black text-[#38bdf8] uppercase tracking-[0.3em]">
                  Añadir Registro
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">{activeCat.nombre}</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center hover:bg-slate-700 transition-colors ml-4 shrink-0"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            {/* Modal form */}
            <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-5 py-4 space-y-4">

              {/* Selector de producto del catálogo */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                  Producto
                </label>
                <select
                  value={productoId}
                  onChange={e => {
                    const val = e.target.value
                    setProductoId(val)
                    if (val && val !== 'nuevo') {
                      const p = productos.find(p => p.id === val)
                      if (p) {
                        setPrecioUnitario(p.precio_unitario != null ? String(p.precio_unitario) : '')
                        setUnidad(p.unidad_defecto ?? 'kg')
                      }
                    } else if (val === 'nuevo') {
                      setPrecioUnitario('')
                    }
                  }}
                  className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#38bdf8]/50"
                >
                  <option value="">Sin especificar</option>
                  {productos.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                  <option value="nuevo">— Otro / Nuevo producto —</option>
                </select>
              </div>

              {/* Campos nuevo producto */}
              {productoId === 'nuevo' && (
                <div className="pl-3 border-l-2 border-[#38bdf8]/30 space-y-3">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                      Nombre del producto <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={productoNombre}
                      onChange={e => setProductoNombre(e.target.value)}
                      required
                      className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-[#38bdf8]/50"
                      placeholder="Ej: Glifosato 36%, THIOVIT..."
                    />
                  </div>
                </div>
              )}

              {/* Cantidad + Unidad */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                    Cantidad <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={cantidad}
                    onChange={e => setCantidad(e.target.value)}
                    required
                    className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-[#38bdf8]/50"
                    placeholder="0"
                  />
                </div>
                <div className="w-32">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                    Unidad
                  </label>
                  <select
                    value={unidad}
                    onChange={e => setUnidad(e.target.value)}
                    className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#38bdf8]/50"
                  >
                    {UNIDADES.map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Precio unitario + Importe calculado */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                    Precio unitario (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={precioUnitario}
                    onChange={e => setPrecioUnitario(e.target.value)}
                    className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-[#38bdf8]/50"
                    placeholder="0.00"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                    Importe total
                  </label>
                  <div className="bg-slate-800/40 border border-white/5 rounded-lg px-3 py-2 text-sm font-black text-[#38bdf8]">
                    {importe > 0
                      ? importe.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
                      : '— €'}
                  </div>
                </div>
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                  Descripción
                </label>
                <input
                  type="text"
                  value={descripcion}
                  onChange={e => setDescripcion(e.target.value)}
                  className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-[#38bdf8]/50"
                  placeholder="Ej: Herbicida Glifosato 36%, lote 2024..."
                />
              </div>

              {/* Notas */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                  Notas
                </label>
                <textarea
                  value={notas}
                  onChange={e => setNotas(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-[#38bdf8]/50 resize-none"
                  placeholder="Observaciones opcionales..."
                />
              </div>

              {/* Foto */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                  Foto
                </label>
                {preview ? (
                  <div className="relative rounded-lg overflow-hidden border border-white/10">
                    <img src={preview} alt="Preview" className="w-full max-h-36 object-cover" />
                    <button
                      type="button"
                      onClick={() => { setFotoFile(null); setPreview(null) }}
                      className="absolute top-2 right-2 bg-black/60 text-white text-[10px] px-2 py-1 rounded font-black uppercase tracking-widest"
                    >
                      Cambiar
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-dashed border-white/20 cursor-pointer hover:border-[#38bdf8]/40 transition-colors">
                    <Plus className="w-4 h-4 text-slate-500" />
                    <span className="text-[11px] text-slate-500">Seleccionar imagen</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* Segunda foto — solo fitosanitarios */}
              {isFito && (
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                    Foto lote / código de barras <span className="text-red-400">*</span>
                  </label>
                  {preview2 ? (
                    <div className="relative rounded-lg overflow-hidden border border-white/10">
                      <img src={preview2} alt="Preview lote" className="w-full max-h-36 object-cover" />
                      <button
                        type="button"
                        onClick={() => { setFotoFile2(null); setPreview2(null) }}
                        className="absolute top-2 right-2 bg-black/60 text-white text-[10px] px-2 py-1 rounded font-black uppercase tracking-widest"
                      >
                        Cambiar
                      </button>
                    </div>
                  ) : (
                    <label className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-dashed border-red-400/30 cursor-pointer hover:border-red-400/60 transition-colors">
                      <Plus className="w-4 h-4 text-red-400" />
                      <span className="text-[11px] text-red-400">Seleccionar foto del lote</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={e => {
                          const f = e.target.files?.[0] ?? null
                          setFotoFile2(f)
                          setPreview2(f ? URL.createObjectURL(f) : null)
                        }}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              )}

              {/* Responsable */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                  Responsable
                </label>
                <input
                  type="text"
                  value={responsable}
                  onChange={e => setResponsable(e.target.value)}
                  className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-[#38bdf8]/50"
                  placeholder="Nombre de quien registra..."
                />
              </div>

              {/* Error */}
              {submitError && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <p className="text-[11px] text-red-400">{submitError}</p>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting || !cantidad}
                className="w-full py-2.5 rounded-lg bg-[#38bdf8]/20 border border-[#38bdf8]/40 hover:bg-[#38bdf8]/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-[11px] font-black uppercase tracking-widest text-[#38bdf8]"
              >
                {submitting ? 'Guardando...' : 'Guardar registro'}
              </button>

            </form>
          </div>
        </div>
      )}

      {/* ── MODAL — MOVER PRODUCTO ──────────────────────────── */}
      {showMoverModal && activeCat && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowMoverModal(false)} />
          <div className="relative z-10 bg-slate-900 border border-white/10 rounded-xl shadow-2xl w-full max-w-md mx-4 flex flex-col max-h-[85vh]">

            {/* Header */}
            <div className="flex items-start justify-between px-5 py-4 border-b border-white/10 shrink-0">
              <div>
                <p className="text-[11px] font-black text-[#38bdf8] uppercase tracking-[0.3em]">
                  Mover Producto
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">{activeCat.nombre}</p>
              </div>
              <button
                onClick={() => setShowMoverModal(false)}
                className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center hover:bg-slate-700 transition-colors ml-4 shrink-0"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitMover} className="overflow-y-auto flex-1 px-5 py-4 space-y-4">

              {/* Producto */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                  Producto
                </label>
                <select
                  value={moverProductoId}
                  onChange={e => setMoverProductoId(e.target.value)}
                  className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#38bdf8]/50"
                >
                  <option value="">Sin especificar</option>
                  {productos.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
              </div>

              {/* Cantidad + Unidad */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                    Cantidad <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={moverCantidad}
                    onChange={e => setMoverCantidad(e.target.value)}
                    required
                    className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-[#38bdf8]/50"
                    placeholder="0"
                  />
                </div>
                <div className="w-32">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                    Unidad
                  </label>
                  <select
                    value={moverUnidad}
                    onChange={e => setMoverUnidad(e.target.value)}
                    className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#38bdf8]/50"
                  >
                    {UNIDADES.map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Ubicación destino */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                  Ubicación destino <span className="text-red-400">*</span>
                </label>
                <select
                  value={moverDestinoId}
                  onChange={e => setMoverDestinoId(e.target.value)}
                  required
                  className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#38bdf8]/50"
                >
                  <option value="">Seleccionar destino…</option>
                  {ubicaciones
                    .filter(u => u.id !== ubicacionId)
                    .map(u => (
                      <option key={u.id} value={u.id}>{u.nombre}</option>
                    ))}
                </select>
              </div>

              {/* Responsable */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                  Responsable
                </label>
                <input
                  type="text"
                  value={moverResponsable}
                  onChange={e => setMoverResponsable(e.target.value)}
                  className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-[#38bdf8]/50"
                  placeholder="Nombre de quien mueve el producto..."
                />
              </div>

              {/* Notas */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                  Notas
                </label>
                <textarea
                  value={moverNotas}
                  onChange={e => setMoverNotas(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-[#38bdf8]/50 resize-none"
                  placeholder="Motivo del movimiento, observaciones..."
                />
              </div>

              {/* Error */}
              {moverError && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <p className="text-[11px] text-red-400">{moverError}</p>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={submittingMover || !moverCantidad || !moverDestinoId}
                className="w-full py-2.5 rounded-lg bg-[#38bdf8]/20 border border-[#38bdf8]/40 hover:bg-[#38bdf8]/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-[11px] font-black uppercase tracking-widest text-[#38bdf8] flex items-center justify-center gap-2"
              >
                {submittingMover ? (
                  <>
                    <div className="w-4 h-4 border-2 border-[#38bdf8] border-t-transparent rounded-full animate-spin" />
                    Registrando...
                  </>
                ) : (
                  <>
                    <MoveRight className="w-4 h-4" />
                    Registrar movimiento
                  </>
                )}
              </button>

            </form>
          </div>
        </div>
      )}

      {/* ── MODAL — ASIGNAR TRACTOR / APERO (tabla aperos) ───────── */}
      {showActivoModal && ubicacionId && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
          <div
            role="presentation"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowActivoModal(false)}
          />
          <div className="relative z-10 bg-slate-900 border border-[#fb923c]/40 rounded-xl shadow-2xl w-full max-w-md flex flex-col max-h-[85vh]">
            <div className="flex items-start justify-between px-5 py-4 border-b border-white/10 shrink-0">
              <div>
                <p className="text-[11px] font-black text-[#fb923c] uppercase tracking-[0.3em]">
                  Asignar a esta ubicación
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Tractor, <span className="font-mono">aperos</span> legacy o <span className="font-mono">maquinaria_aperos</span> (uno por fila, según BD).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowActivoModal(false)}
                className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center hover:bg-slate-700 transition-colors shrink-0"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleSubmitActivo} className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
              <div className="grid grid-cols-3 rounded-lg border border-white/10 overflow-hidden">
                <button
                  type="button"
                  onClick={() => { setActivoTab('tractor'); setActivoError(null) }}
                  className={`py-2 text-[9px] font-black uppercase tracking-wider ${
                    activoTab === 'tractor' ? 'bg-[#fb923c]/20 text-[#fb923c]' : 'text-slate-500'
                  }`}
                >
                  Tractor
                </button>
                <button
                  type="button"
                  onClick={() => { setActivoTab('apero'); setActivoError(null) }}
                  className={`py-2 text-[9px] font-black uppercase tracking-wider border-x border-white/10 ${
                    activoTab === 'apero' ? 'bg-amber-500/20 text-amber-400' : 'text-slate-500'
                  }`}
                >
                  Apero legacy
                </button>
                <button
                  type="button"
                  onClick={() => { setActivoTab('maquinaria_apero'); setActivoError(null) }}
                  className={`py-2 text-[9px] font-black uppercase tracking-wider ${
                    activoTab === 'maquinaria_apero' ? 'bg-orange-500/20 text-orange-300' : 'text-slate-500'
                  }`}
                >
                  Apero maq.
                </button>
              </div>
              {activoTab === 'tractor' ? (
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                    Tractor (maquinaria_tractores)
                  </label>
                  <select
                    value={selTractorId}
                    onChange={e => setSelTractorId(e.target.value)}
                    className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#fb923c]/50"
                  >
                    <option value="">Seleccionar…</option>
                    {tractoresLibres.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.matricula}
                        {t.marca ? ` · ${t.marca}` : ''}
                        {t.modelo ? ` ${t.modelo}` : ''}
                      </option>
                    ))}
                  </select>
                  {tractoresLibres.length === 0 ? (
                    <p className="text-[9px] text-slate-500 mt-2">
                      No hay tractores libres. Quita uno de otra ubicación o da de alta en Maquinaria.
                    </p>
                  ) : null}
                </div>
              ) : activoTab === 'apero' ? (
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                    Apero (tabla aperos)
                  </label>
                  <select
                    value={selAperoId}
                    onChange={e => setSelAperoId(e.target.value)}
                    className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500/50"
                  >
                    <option value="">Seleccionar…</option>
                    {aperosLibres.map(ap => (
                      <option key={ap.id} value={ap.id}>
                        {ap.denominacion}
                        {ap.codigo ? ` (${ap.codigo})` : ''}
                      </option>
                    ))}
                  </select>
                  {aperosLibres.length === 0 ? (
                    <p className="text-[9px] text-slate-500 mt-2">
                      No hay aperos libres en tabla <span className="font-mono">aperos</span>.
                    </p>
                  ) : null}
                </div>
              ) : (
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                    Apero (maquinaria_aperos)
                  </label>
                  <select
                    value={selMaquinariaAperoId}
                    onChange={e => setSelMaquinariaAperoId(e.target.value)}
                    className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-400/50"
                  >
                    <option value="">Seleccionar…</option>
                    {maquinariaAperosLibres.filter(a => a.activo).map(a => (
                      <option key={a.id} value={a.id}>
                        {a.tipo}
                        {a.descripcion ? ` · ${a.descripcion}` : ''}
                      </option>
                    ))}
                  </select>
                  {maquinariaAperosLibres.length === 0 ? (
                    <p className="text-[9px] text-slate-500 mt-2">
                      Crea el apero en Maquinaria o quítalo de otra ubicación.
                    </p>
                  ) : null}
                </div>
              )}
              {activoError ? (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <p className="text-[11px] text-red-400">{activoError}</p>
                </div>
              ) : null}
              <button
                type="submit"
                disabled={
                  activoSubmitting
                  || (activoTab === 'tractor' && !selTractorId)
                  || (activoTab === 'apero' && !selAperoId)
                  || (activoTab === 'maquinaria_apero' && !selMaquinariaAperoId)
                }
                className="w-full py-2.5 rounded-lg bg-[#fb923c]/20 border border-[#fb923c]/50 hover:bg-[#fb923c]/30 disabled:opacity-40 text-[11px] font-black uppercase tracking-widest text-[#fb923c]"
              >
                {activoSubmitting ? 'Guardando…' : 'Asignar a esta ubicación'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
