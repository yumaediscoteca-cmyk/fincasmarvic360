import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useGeoJSON } from '@/hooks/useGeoJSON'
import { useFarmParcelStatuses } from '@/hooks/useParcelData'
import {
  ArrowLeft, LocateFixed, X,
  List, ClipboardList, FlaskConical,
  GitBranch, Bell, History, ChevronRight,
  Shovel, Sprout, Wheat, Activity, Camera,
  Droplets, Leaf, FileText, AlertCircle
} from 'lucide-react'
import jsPDF from 'jspdf'
import { supabase } from '@/integrations/supabase/client'
import type { ParcelFeature, ParcelStatus } from '@/types/farm'
import { STATUS_COLORS, STATUS_LABELS } from '@/types/farm'

import RegisterWorkForm               from '@/components/RegisterWorkForm'
import UploadParcelPhoto              from '@/components/UploadParcelPhoto'
import ParcelHistory                  from '@/components/ParcelHistory'
import RegisterEstadoUnificadoForm    from '@/components/RegisterEstadoUnificadoForm'

// ── LEYENDA ───────────────────────────────────────────
function MapLegend() {
  const entries = Object.entries(STATUS_COLORS) as [ParcelStatus, string][]
  return (
    <div className="absolute bottom-8 left-4 z-[1000] bg-slate-900/80 border border-white/10 rounded-lg px-3 py-2 space-y-1">
      {entries.map(([status, color]) => (
        <div key={status} className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: color }} />
          <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">
            {STATUS_LABELS[status]}
          </span>
        </div>
      ))}
    </div>
  )
}

function getLabelSize(zoom: number): string {
  if (zoom >= 17) return '11px'
  if (zoom >= 15) return '9px'
  if (zoom >= 14) return '8px'
  return '7px'
}

const MENU_ITEMS = [
  { id: 'sectores',     label: 'SECTORES',     icon: List },
  { id: 'registrar',    label: 'REGISTRAR',    icon: ClipboardList },
  { id: 'analisis',     label: 'ANÁLISIS',     icon: FlaskConical },
  { id: 'trazabilidad', label: 'TRAZABILIDAD', icon: GitBranch },
  { id: 'alertas',      label: 'ALERTAS',      icon: Bell },
  { id: 'historico',    label: 'HISTÓRICO',    icon: History },
] as const

type MenuId           = typeof MENU_ITEMS[number]['id']
type RegisterAction   = 'work' | 'estado_unificado' | 'photo' | null
type InformeFincaTipo = 'sector' | 'tipo' | 'estado'
type InformeTipoDato  = 'trabajos' | 'plantaciones' | 'cosechas' | 'tickets' | 'residuos' | 'certificaciones'

function Modal({
  title, subtitle, onClose, children, wide = false
}: {
  title: string
  subtitle?: string
  onClose: () => void
  children: React.ReactNode
  wide?: boolean
}) {
  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className={`relative z-10 bg-slate-900 border border-white/10 rounded-xl shadow-2xl w-full ${wide ? 'max-w-2xl' : 'max-w-lg'} mx-4 flex flex-col max-h-[85vh]`}>
        <div className="flex items-start justify-between px-5 py-4 border-b border-white/10 shrink-0">
          <div>
            <p className="text-[11px] font-black text-[#38bdf8] uppercase tracking-[0.3em]">{title}</p>
            {subtitle && <p className="text-[10px] text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center hover:bg-slate-700 transition-colors ml-4 shrink-0"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-5 py-4">
          {children}
        </div>
      </div>
    </div>
  )
}

function SectorTooltip({ parcel, onClose }: { parcel: ParcelFeature; onClose: () => void }) {
  const p = parcel.properties
  return (
    <div className="bg-slate-900/95 border border-[#38bdf8]/30 rounded-lg p-3 min-w-[180px] shadow-2xl">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-black text-[#38bdf8] uppercase tracking-widest">{p.parcela}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">{p.finca}</p>
        </div>
        <button onClick={onClose} className="text-slate-600 hover:text-slate-400">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-1.5 mt-2">
        <div className="bg-slate-800/80 rounded px-2 py-1">
          <p className="text-[9px] text-slate-500 uppercase">Superficie</p>
          <p className="text-[11px] font-bold text-white">{p.superficie?.toFixed(2)} ha</p>
        </div>
        <div className="bg-slate-800/80 rounded px-2 py-1">
          <p className="text-[9px] text-slate-500 uppercase">Código</p>
          <p className="text-[11px] font-bold text-white">{p.codigo || '—'}</p>
        </div>
      </div>
      <p className="text-[9px] text-slate-600 text-center mt-2 uppercase tracking-widest">
        Usa el menú derecho para acceder
      </p>
    </div>
  )
}

export default function FarmMap() {
  const { farmName } = useParams<{ farmName: string }>()
  const navigate     = useNavigate()
  const { getFarmParcels, loading, error: geoError } = useGeoJSON()

  const [selectedParcel, setSelectedParcel] = useState<ParcelFeature | null>(null)
  const [tooltipParcel, setTooltipParcel]   = useState<ParcelFeature | null>(null)
  const [activeMenu, setActiveMenu]   = useState<MenuId | null>(null)
  const [activeModal, setActiveModal] = useState<RegisterAction>(null)
  const [now, setNow]                 = useState(new Date())
  const [coords, setCoords]                 = useState({ lat: 0, lng: 0 })

  // ── Informe PDF state ─────────────────────────────────────────
  const [showInformeFinca,   setShowInformeFinca]   = useState(false)
  const [informeFincaTipo,   setInformeFincaTipo]   = useState<InformeFincaTipo>('sector')
  const [informeSector,      setInformeSector]      = useState('')
  const [informeTipoDato,    setInformeTipoDato]    = useState<InformeTipoDato>('trabajos')
  const [informeFechaInicio, setInformeFechaInicio] = useState(() => {
    const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
  })
  const [informeFechaFin,    setInformeFechaFin]    = useState(() => new Date().toISOString().slice(0, 10))
  const [generandoInforme,   setGenerandoInforme]   = useState(false)
  const [informeError,       setInformeError]       = useState<string | null>(null)

  const mapRef          = useRef<L.Map | null>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const geoJsonLayerRef = useRef<L.GeoJSON | null>(null)
  const labelsRef       = useRef<L.Marker[]>([])
  const fitDoneRef      = useRef(false)

  const decodedFarm = decodeURIComponent(farmName || '')
  const parcels     = getFarmParcels(decodedFarm)
  const { data: statuses } = useFarmParcelStatuses(parcels.map(p => p.properties.parcel_id))

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const handleParcelClick = useCallback((feature: ParcelFeature) => {
    setTooltipParcel(feature)
    setSelectedParcel(feature)
  }, [])

  const buildLabel = useCallback((text: string, map: L.Map): L.DivIcon => {
    const size = getLabelSize(map.getZoom())
    return L.divIcon({
      className: 'parcel-label',
      html: `<span style="font-size:${size};white-space:nowrap">${text}</span>`,
      iconAnchor: [0, 0],
    })
  }, [])

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return
    const map = L.map(mapContainerRef.current, {
      center: [38.2, -0.9],
      zoom: 14,
      zoomControl: false,
    })
    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
    ).addTo(map)
    map.on('mousemove', (e) => setCoords({ lat: e.latlng.lat, lng: e.latlng.lng }))
    mapRef.current = map
    return () => { map.remove(); mapRef.current = null }
  }, [loading])

  useEffect(() => {
    const map = mapRef.current
    if (!map || parcels.length === 0) return

    if (geoJsonLayerRef.current) map.removeLayer(geoJsonLayerRef.current)
    labelsRef.current.forEach(m => m.remove())
    labelsRef.current = []

    const fc: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: parcels as any }

    const geojsonLayer = L.geoJSON(fc, {
      style: feature => {
        const status: ParcelStatus = statuses?.[feature?.properties?.parcel_id] ?? 'vacia'
        const isVacia    = status === 'vacia'
        const isSelected = feature?.properties?.parcel_id === selectedParcel?.properties.parcel_id
        return {
          fillColor:   STATUS_COLORS[status],
          fillOpacity: isSelected ? 0.45 : isVacia ? 0.08 : 0.25,
          color:       isSelected ? '#38bdf8' : isVacia ? 'rgba(255,255,255,0.4)' : STATUS_COLORS[status],
          weight:      isSelected ? 2.5 : isVacia ? 1 : 1.5,
        }
      },
      onEachFeature: (feature, layer) => {
        if (layer instanceof L.Polygon) {
          const center = layer.getBounds().getCenter()
          const nombre = feature.properties?.parcela || feature.properties?.parcel_id || ''
          const marker = L.marker(center, {
            icon: buildLabel(nombre, map),
            interactive: false,
          }).addTo(map)
          labelsRef.current.push(marker)
        }
        layer.on('click', () => handleParcelClick(feature as any))
      }
    }).addTo(map)

    geoJsonLayerRef.current = geojsonLayer
    const bounds = geojsonLayer.getBounds()
    if (bounds.isValid() && !fitDoneRef.current) {
      map.fitBounds(bounds, { padding: [30, 30] })
      fitDoneRef.current = true
    }

    const onZoom = () => {
      labelsRef.current.forEach((marker, i) => {
        const feature = parcels[i]
        if (!feature) return
        const nombre = feature.properties?.parcela || feature.properties?.parcel_id || ''
        marker.setIcon(buildLabel(nombre, map))
      })
    }
    map.on('zoomend', onZoom)
    return () => { map.off('zoomend', onZoom) }
  }, [parcels, statuses, selectedParcel, handleParcelClick, buildLabel])

  // ── Generación PDF de finca ──────────────────────────────────
  async function generarPDFFinca() {
    setGenerandoInforme(true)
    setInformeError(null)
    try {
      const doc    = new jsPDF()
      const margin = 15
      const maxW   = 180
      let y        = 20
      const lh     = 6

      function checkPage() {
        if (y > 272) { doc.addPage(); y = 20 }
      }
      function writeLine(text: string, bold = false, size = 10) {
        doc.setFontSize(size)
        doc.setFont('helvetica', bold ? 'bold' : 'normal')
        const lines = doc.splitTextToSize(text, maxW) as string[]
        for (const l of lines) { checkPage(); doc.text(l, margin, y); y += lh }
      }
      function separator() {
        checkPage(); doc.setDrawColor(160)
        doc.line(margin, y, margin + maxW, y); y += lh
      }
      async function loadImage(url: string): Promise<{ data: string; w: number; h: number } | null> {
        try {
          const res  = await fetch(url)
          const blob = await res.blob()
          return await new Promise(resolve => {
            const img = new Image()
            img.crossOrigin = 'anonymous'
            img.onload = () => {
              const canvas = document.createElement('canvas')
              canvas.width = img.naturalWidth; canvas.height = img.naturalHeight
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
        } catch { return null }
      }
      async function addPhoto(url: string | null) {
        if (!url) return
        const img = await loadImage(url)
        if (!img) return
        writeLine('Foto adjunta:')
        const imgW = 80; const imgH = imgW * (img.h / img.w)
        if (y + imgH > 272) { doc.addPage(); y = 20 }
        doc.addImage(img.data, 'JPEG', margin, y, imgW, imgH)
        y += imgH + 4
      }

      const parcelIds   = parcels.map(p => p.properties.parcel_id)
      const sectorNombre = (pid: string) =>
        parcels.find(p => p.properties.parcel_id === pid)?.properties.parcela ?? pid

      // ── Cabecera ─────────────────────────────────────────────
      writeLine('INFORME DE FINCA — AGRICOLA MARVIC 360', true, 13)
      y += 2
      writeLine(`Finca: ${decodedFarm}`)
      writeLine(`Generado el: ${new Date().toLocaleString('es-ES')}`)

      if (informeFincaTipo === 'sector') {
        writeLine(`Sector: ${sectorNombre(informeSector)}`)
        writeLine(`Periodo: ${informeFechaInicio} a ${informeFechaFin}`)
        y += 2; separator()

        // Trabajos
        const { data: trabajos, error: tErr } = await supabase
          .from('work_records').select('*, cuadrillas(nombre)')
          .eq('parcel_id', informeSector)
          .gte('date', informeFechaInicio).lte('date', informeFechaFin)
          .order('date', { ascending: false })
        if (tErr) throw tErr
        writeLine('TRABAJOS', true, 11); y += 1
        if (!trabajos || trabajos.length === 0) { writeLine('  Sin registros en el periodo.') }
        else for (const r of trabajos) {
          writeLine(`  Fecha: ${r.date}  |  Tipo: ${r.work_type}`)
          if (r.workers_count) writeLine(`  Trabajadores: ${r.workers_count}`)
          if (r.hours_worked)  writeLine(`  Horas: ${r.hours_worked}`)
          if ((r as any).cuadrillas?.nombre) writeLine(`  Cuadrilla: ${(r as any).cuadrillas.nombre}`)
          if (r.notes) writeLine(`  Notas: ${r.notes}`)
          await addPhoto((r as any).foto_url ?? null)
          y += 2
        }
        y += 3

        // Plantaciones
        const { data: plantaciones, error: pErr } = await supabase
          .from('plantings').select('*')
          .eq('parcel_id', informeSector)
          .gte('date', informeFechaInicio).lte('date', informeFechaFin)
          .order('date', { ascending: false })
        if (pErr) throw pErr
        writeLine('PLANTACIONES', true, 11); y += 1
        if (!plantaciones || plantaciones.length === 0) { writeLine('  Sin registros en el periodo.') }
        else for (const r of plantaciones) {
          writeLine(`  Fecha: ${r.date}  |  Cultivo: ${r.crop}`)
          if (r.variedad)     writeLine(`  Variedad: ${r.variedad}`)
          if (r.lote_semilla) writeLine(`  Lote semilla: ${r.lote_semilla}`)
          await addPhoto((r as any).foto_url ?? null)
          y += 2
        }
        y += 3

        // Cosechas
        const { data: cosechas, error: cErr } = await supabase
          .from('harvests').select('*')
          .eq('parcel_id', informeSector)
          .gte('date', informeFechaInicio).lte('date', informeFechaFin)
          .order('date', { ascending: false })
        if (cErr) throw cErr
        writeLine('COSECHAS', true, 11); y += 1
        if (!cosechas || cosechas.length === 0) { writeLine('  Sin registros en el periodo.') }
        else for (const r of cosechas) {
          writeLine(`  Fecha: ${r.date}  |  Cultivo: ${r.crop}`)
          if (r.production_kg) writeLine(`  Produccion: ${r.production_kg} kg`)
          if (r.price_kg)      writeLine(`  Precio: ${r.price_kg} €/kg`)
          y += 2
        }
        y += 3

        // Tickets — a partir de los harvest_ids del sector
        const harvestIds = (cosechas ?? []).map(h => h.id)
        writeLine('TICKETS DE PESAJE', true, 11); y += 1
        if (harvestIds.length === 0) {
          writeLine('  Sin cosechas en el periodo — no hay tickets.')
        } else {
          const { data: tickets, error: tkErr } = await supabase
            .from('tickets_pesaje').select('*, camiones(matricula)')
            .in('harvest_id', harvestIds).order('created_at', { ascending: false })
          if (tkErr) throw tkErr
          if (!tickets || tickets.length === 0) { writeLine('  Sin tickets en el periodo.') }
          else for (const t of tickets) {
            writeLine(`  Albaran: ${(t as any).numero_albaran ?? '—'}`)
            writeLine(`  Peso neto: ${(t as any).peso_neto_kg ?? '—'} kg`)
            if ((t as any).camiones?.matricula) writeLine(`  Matricula: ${(t as any).camiones.matricula}`)
            if ((t as any).destino)             writeLine(`  Destino: ${(t as any).destino}`)
            y += 2
          }
        }

      } else if (informeFincaTipo === 'tipo') {
        const tipLabel = { trabajos: 'Trabajos', plantaciones: 'Plantaciones', cosechas: 'Cosechas',
          tickets: 'Tickets de Pesaje', residuos: 'Residuos', certificaciones: 'Certificaciones' }
        writeLine(`Tipo: ${tipLabel[informeTipoDato]}`)
        writeLine(`Finca: ${decodedFarm} (todos los sectores)`)
        writeLine(`Periodo: ${informeFechaInicio} a ${informeFechaFin}`)
        y += 2; separator()

        function groupByParcel<T extends { parcel_id: string }>(rows: T[]) {
          const map = new Map<string, T[]>()
          for (const r of rows) {
            if (!map.has(r.parcel_id)) map.set(r.parcel_id, [])
            map.get(r.parcel_id)!.push(r)
          }
          return map
        }

        if (informeTipoDato === 'trabajos') {
          const { data, error } = await supabase.from('work_records').select('*, cuadrillas(nombre)')
            .in('parcel_id', parcelIds).gte('date', informeFechaInicio).lte('date', informeFechaFin)
            .order('parcel_id').order('date', { ascending: false })
          if (error) throw error
          const groups = groupByParcel(data ?? [])
          if (groups.size === 0) { writeLine('Sin registros en el periodo.') }
          for (const [pid, rows] of groups) {
            writeLine(sectorNombre(pid).toUpperCase(), true, 11); y += 1
            for (const r of rows) {
              writeLine(`  Fecha: ${r.date}  |  Tipo: ${r.work_type}`)
              if (r.workers_count) writeLine(`  Trabajadores: ${r.workers_count}`)
              if (r.hours_worked)  writeLine(`  Horas: ${r.hours_worked}`)
              if ((r as any).cuadrillas?.nombre) writeLine(`  Cuadrilla: ${(r as any).cuadrillas.nombre}`)
              if (r.notes) writeLine(`  Notas: ${r.notes}`)
              await addPhoto((r as any).foto_url ?? null)
              y += 2
            }
            y += 3
          }
        } else if (informeTipoDato === 'plantaciones') {
          const { data, error } = await supabase.from('plantings').select('*')
            .in('parcel_id', parcelIds).gte('date', informeFechaInicio).lte('date', informeFechaFin)
            .order('parcel_id').order('date', { ascending: false })
          if (error) throw error
          const groups = groupByParcel(data ?? [])
          if (groups.size === 0) { writeLine('Sin registros en el periodo.') }
          for (const [pid, rows] of groups) {
            writeLine(sectorNombre(pid).toUpperCase(), true, 11); y += 1
            for (const r of rows) {
              writeLine(`  Fecha: ${r.date}  |  Cultivo: ${r.crop}`)
              if (r.variedad)     writeLine(`  Variedad: ${r.variedad}`)
              if (r.lote_semilla) writeLine(`  Lote semilla: ${r.lote_semilla}`)
              y += 2
            }
            y += 3
          }
        } else if (informeTipoDato === 'cosechas') {
          const { data, error } = await supabase.from('harvests').select('*')
            .in('parcel_id', parcelIds).gte('date', informeFechaInicio).lte('date', informeFechaFin)
            .order('parcel_id').order('date', { ascending: false })
          if (error) throw error
          const groups = groupByParcel(data ?? [])
          if (groups.size === 0) { writeLine('Sin registros en el periodo.') }
          for (const [pid, rows] of groups) {
            writeLine(sectorNombre(pid).toUpperCase(), true, 11); y += 1
            for (const r of rows) {
              writeLine(`  Fecha: ${r.date}  |  Cultivo: ${r.crop}`)
              if (r.production_kg) writeLine(`  Produccion: ${r.production_kg} kg`)
              if (r.price_kg)      writeLine(`  Precio: ${r.price_kg} €/kg`)
              y += 2
            }
            y += 3
          }
        } else if (informeTipoDato === 'tickets') {
          // 2 queries: primero harvest_ids de la finca en rango, luego tickets
          const { data: fhData, error: fhErr } = await supabase.from('harvests')
            .select('id, parcel_id').in('parcel_id', parcelIds)
            .gte('date', informeFechaInicio).lte('date', informeFechaFin)
          if (fhErr) throw fhErr
          const fhIds     = (fhData ?? []).map(h => h.id)
          const fhParcels = new Map((fhData ?? []).map(h => [h.id, h.parcel_id]))
          if (fhIds.length === 0) {
            writeLine('Sin cosechas en el periodo — no hay tickets.')
          } else {
            const { data: tickets, error: tkErr } = await supabase.from('tickets_pesaje')
              .select('*, camiones(matricula)').in('harvest_id', fhIds)
              .order('created_at', { ascending: false })
            if (tkErr) throw tkErr
            const groups = new Map<string, typeof tickets>()
            for (const t of tickets ?? []) {
              const pid = fhParcels.get((t as any).harvest_id) ?? 'desconocido'
              if (!groups.has(pid)) groups.set(pid, [])
              groups.get(pid)!.push(t)
            }
            if (groups.size === 0) { writeLine('Sin tickets en el periodo.') }
            for (const [pid, rows] of groups) {
              writeLine(sectorNombre(pid).toUpperCase(), true, 11); y += 1
              for (const t of rows ?? []) {
                writeLine(`  Albaran: ${(t as any).numero_albaran ?? '—'}`)
                writeLine(`  Peso neto: ${(t as any).peso_neto_kg ?? '—'} kg`)
                if ((t as any).camiones?.matricula) writeLine(`  Matricula: ${(t as any).camiones.matricula}`)
                if ((t as any).destino)             writeLine(`  Destino: ${(t as any).destino}`)
                y += 2
              }
              y += 3
            }
          }
        } else if (informeTipoDato === 'residuos') {
          const { data, error } = await supabase.from('residuos_operacion').select('*')
            .in('parcel_id', parcelIds)
            .gte('created_at', `${informeFechaInicio}T00:00:00`)
            .lte('created_at', `${informeFechaFin}T23:59:59`)
            .order('parcel_id').order('created_at', { ascending: false })
          if (error) throw error
          const groups = groupByParcel(data ?? [])
          if (groups.size === 0) { writeLine('Sin registros en el periodo.') }
          for (const [pid, rows] of groups) {
            writeLine(sectorNombre(pid).toUpperCase(), true, 11); y += 1
            for (const r of rows) {
              writeLine(`  Tipo: ${r.tipo_residuo}`)
              if (r.kg_instalados) writeLine(`  Instalados: ${r.kg_instalados} kg`)
              if (r.kg_retirados)  writeLine(`  Retirados: ${r.kg_retirados} kg`)
              y += 2
            }
            y += 3
          }
        } else if (informeTipoDato === 'certificaciones') {
          const { data, error } = await supabase.from('certificaciones_parcela').select('*')
            .in('parcel_id', parcelIds)
            .gte('fecha_inicio', informeFechaInicio).lte('fecha_inicio', informeFechaFin)
            .order('parcel_id').order('fecha_inicio', { ascending: false })
          if (error) throw error
          const groups = groupByParcel(data ?? [])
          if (groups.size === 0) { writeLine('Sin registros en el periodo.') }
          for (const [pid, rows] of groups) {
            writeLine(sectorNombre(pid).toUpperCase(), true, 11); y += 1
            for (const r of rows) {
              writeLine(`  Estado: ${r.estado}`)
              if ((r as any).entidad_certificadora) writeLine(`  Entidad: ${(r as any).entidad_certificadora}`)
              if (r.fecha_inicio) writeLine(`  Inicio: ${r.fecha_inicio}`)
              if ((r as any).fecha_fin) writeLine(`  Fin: ${(r as any).fecha_fin}`)
              y += 2
            }
            y += 3
          }
        }

      } else {
        // Estado actual finca
        writeLine(`Estado actual — todos los sectores`)
        writeLine(`Finca: ${decodedFarm}`)
        y += 2; separator()

        const [plRes, haRes, ceRes] = await Promise.all([
          supabase.from('plantings').select('*').in('parcel_id', parcelIds).order('date', { ascending: false }),
          supabase.from('harvests').select('*').in('parcel_id', parcelIds).order('date', { ascending: false }),
          supabase.from('certificaciones_parcela').select('*').in('parcel_id', parcelIds).order('fecha_inicio', { ascending: false }),
        ])

        const latestPl = new Map<string, any>()
        const latestHa = new Map<string, any>()
        const latestCe = new Map<string, any>()
        for (const r of plRes.data ?? []) { if (!latestPl.has(r.parcel_id)) latestPl.set(r.parcel_id, r) }
        for (const r of haRes.data ?? []) { if (!latestHa.has(r.parcel_id)) latestHa.set(r.parcel_id, r) }
        for (const r of ceRes.data ?? []) { if (!latestCe.has(r.parcel_id)) latestCe.set(r.parcel_id, r) }

        for (const p of parcels) {
          const pid    = p.properties.parcel_id
          const nombre = p.properties.parcela ?? pid
          const area   = p.properties.superficie?.toFixed(2) ?? '—'
          const status = statuses?.[pid] ?? 'vacia'
          writeLine(`${nombre.toUpperCase()}  (${area} ha)`, true, 11)
          writeLine(`  Estado: ${status}`)
          const pl = latestPl.get(pid)
          if (pl) writeLine(`  Ultima plantacion: ${pl.date} — ${pl.crop}${pl.variedad ? ` (${pl.variedad})` : ''}`)
          else    writeLine(`  Sin plantaciones registradas`)
          const ha = latestHa.get(pid)
          if (ha) writeLine(`  Ultima cosecha: ${ha.date} — ${ha.crop} — ${ha.production_kg ?? '—'} kg`)
          else    writeLine(`  Sin cosechas registradas`)
          const ce = latestCe.get(pid)
          if (ce) writeLine(`  Certificacion: ${ce.estado}${(ce as any).entidad_certificadora ? ` — ${(ce as any).entidad_certificadora}` : ''}`)
          y += 4
        }
      }

      // ── Descarga ─────────────────────────────────────────────
      const slug  = decodedFarm.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 25)
      const fecha = new Date().toISOString().slice(0, 10)
      doc.save(`finca_${slug}_${fecha}.pdf`)
      setShowInformeFinca(false)

    } catch (err: unknown) {
      setInformeError(err instanceof Error ? err.message : 'Error generando el PDF')
    } finally {
      setGenerandoInforme(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center text-[#38bdf8] text-sm font-black tracking-widest uppercase">
      Cargando sistema...
    </div>
  )

  if (geoError) return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center flex-col gap-4 text-center px-8">
      <span className="text-red-400 text-sm font-black tracking-widest uppercase">Error cargando mapa</span>
      <span className="text-slate-400 text-xs">{geoError.message}</span>
      <button onClick={() => navigate('/farm')} className="text-[#38bdf8] text-xs underline">Volver al selector</button>
    </div>
  )

  const horaStr         = now.toTimeString().slice(0, 8)
  const sectoresActivos = parcels.length
  const parcelId        = selectedParcel?.properties.parcel_id ?? null
  const parcelNombre    = selectedParcel?.properties.parcela ?? ''

  const closeModal = () => setActiveModal(null)

  return (
    <div className="h-screen w-screen relative overflow-hidden bg-[#020617]">

      <div ref={mapContainerRef} className="h-full w-full z-0" />

      {/* PANEL IDENTIDAD */}
      <div className="absolute top-4 left-4 z-[1000] bg-slate-900/90 border border-white/10 rounded-lg px-4 py-3 min-w-[200px]">
        <p className="text-[10px] font-black text-[#38bdf8] uppercase tracking-[0.3em] mb-1">Marvic 360</p>
        <p className="text-base font-black text-white uppercase tracking-tight leading-none">{decodedFarm}</p>
        <div className="flex items-center gap-2 mt-2">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-[10px] text-green-400 font-bold uppercase tracking-widest">Operativo</span>
          <span className="text-[10px] text-slate-500 ml-auto font-mono">{horaStr}</span>
        </div>
      </div>

      {/* BOTÓN VOLVER */}
      <button
        onClick={() => navigate(-1)}
        className="absolute top-4 left-[220px] z-[1000] w-8 h-8 rounded-lg border border-white/10 flex items-center justify-center bg-slate-900/90 hover:border-[#38bdf8]/40 transition-colors"
      >
        <ArrowLeft className="w-4 h-4 text-slate-400" />
      </button>

      {/* MENÚ VERTICAL DERECHA */}
      <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-1">
        {MENU_ITEMS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveMenu(activeMenu === id ? null : id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-[11px] font-black uppercase tracking-widest transition-all ${
              activeMenu === id
                ? 'bg-[#38bdf8]/20 border-[#38bdf8]/60 text-[#38bdf8]'
                : 'bg-slate-900/90 border-white/10 text-slate-300 hover:border-[#38bdf8]/30 hover:text-[#38bdf8]'
            }`}
          >
            <Icon className="w-3.5 h-3.5 shrink-0" />
            {label}
          </button>
        ))}

        {/* ── Separador + Informe PDF ── */}
        <div className="h-px bg-white/10 my-1" />
        <button
          onClick={() => { setInformeError(null); setShowInformeFinca(true) }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border text-[11px] font-black uppercase tracking-widest transition-all bg-slate-900/90 border-white/10 text-slate-300 hover:border-[#38bdf8]/30 hover:text-[#38bdf8]"
        >
          <FileText className="w-3.5 h-3.5 shrink-0" />
          Informe PDF
        </button>
      </div>

      {/* PANEL — SECTORES */}
      {activeMenu === 'sectores' && (
        <div className="absolute top-4 right-52 bottom-10 z-[999] w-72 bg-slate-900/95 border border-white/10 rounded-lg flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
            <span className="text-[11px] font-black text-[#38bdf8] uppercase tracking-widest">Sectores</span>
            <button onClick={() => setActiveMenu(null)}><X className="w-4 h-4 text-slate-500 hover:text-white" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {parcels.map(p => {
              const status = statuses?.[p.properties.parcel_id] ?? 'vacia'
              return (
                <button
                  key={p.properties.parcel_id}
                  onClick={() => {
                    setSelectedParcel(p)
                    setTooltipParcel(p)
                    const map = mapRef.current
                    if (map) {
                      const rawCoords = p.geometry.type === 'Polygon'
                        ? p.geometry.coordinates[0]
                        : p.geometry.coordinates[0][0]
                      const lats = (rawCoords as number[][]).map(c => c[1])
                      const lngs = (rawCoords as number[][]).map(c => c[0])
                      map.flyTo(
                        [(Math.min(...lats) + Math.max(...lats)) / 2,
                         (Math.min(...lngs) + Math.max(...lngs)) / 2],
                        16, { duration: 1 }
                      )
                    }
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded border text-left transition-all ${
                    selectedParcel?.properties.parcel_id === p.properties.parcel_id
                      ? 'bg-[#38bdf8]/10 border-[#38bdf8]/30'
                      : 'bg-slate-800/50 border-transparent hover:border-white/10'
                  }`}
                >
                  <div>
                    <p className="text-[11px] font-bold text-white">{p.properties.parcela}</p>
                    <p className="text-[9px] text-slate-500">{p.properties.superficie?.toFixed(2)} ha</p>
                  </div>
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: STATUS_COLORS[status] }} />
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* PANEL — REGISTRAR */}
      {activeMenu === 'registrar' && (
        <div className="absolute top-4 right-52 bottom-10 z-[999] w-72 bg-slate-900/95 border border-white/10 rounded-lg flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
            <div>
              <span className="text-[11px] font-black text-[#38bdf8] uppercase tracking-widest">Registrar</span>
              {selectedParcel && <p className="text-[10px] text-slate-500 mt-0.5">{parcelNombre}</p>}
            </div>
            <button onClick={() => setActiveMenu(null)}><X className="w-4 h-4 text-slate-500 hover:text-white" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            {!selectedParcel ? (
              <p className="text-[11px] text-slate-500 text-center mt-8 uppercase tracking-widest">
                Selecciona un sector en el mapa primero
              </p>
            ) : (
              <div className="space-y-2">
                {[
                  { label: 'Registrar Trabajo',     icon: Shovel,   action: 'work'            as RegisterAction },
                  { label: 'Estado / Análisis',      icon: Activity, action: 'estado_unificado' as RegisterAction },
                  { label: 'Subir Foto',             icon: Camera,   action: 'photo'           as RegisterAction },
                ].map(({ label, icon: Icon, action }) => (
                  <button
                    key={action}
                    onClick={() => { setActiveModal(action); setActiveMenu(null) }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded border border-white/10 bg-slate-800/50 hover:bg-slate-800 hover:border-[#38bdf8]/30 transition-all text-left"
                  >
                    <Icon className="w-4 h-4 text-[#38bdf8] shrink-0" />
                    <span className="text-[11px] font-bold text-white uppercase tracking-wide">{label}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-600 ml-auto" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* PANEL — ANÁLISIS */}
      {activeMenu === 'analisis' && (
        <div className="absolute top-4 right-52 bottom-10 z-[999] w-72 bg-slate-900/95 border border-white/10 rounded-lg flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
            <div>
              <span className="text-[11px] font-black text-[#38bdf8] uppercase tracking-widest">Análisis</span>
              {selectedParcel && <p className="text-[10px] text-slate-500 mt-0.5">{parcelNombre}</p>}
            </div>
            <button onClick={() => setActiveMenu(null)}><X className="w-4 h-4 text-slate-500 hover:text-white" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            {!selectedParcel ? (
              <p className="text-[11px] text-slate-500 text-center mt-8 uppercase tracking-widest">
                Selecciona un sector en el mapa primero
              </p>
            ) : (
              <div className="space-y-2">
                <p className="text-[10px] text-slate-500 px-1 pb-1">
                  Suelo, agua y sensor están integrados en el formulario unificado.
                </p>
                {[
                  { label: 'Análisis de Suelo',   icon: FlaskConical, desc: 'pH · EC · NPK · textura' },
                  { label: 'Sensor NDVI / SPAD',  icon: Leaf,         desc: 'Salud vegetal · clorofila' },
                  { label: 'Análisis Agua Riego', icon: Droplets,     desc: 'Calidad agua por fuente' },
                ].map(({ label, icon: Icon, desc }) => (
                  <button
                    key={label}
                    onClick={() => { setActiveModal('estado_unificado'); setActiveMenu(null) }}
                    className="w-full flex items-start gap-3 px-3 py-3 rounded border border-white/10 bg-slate-800/50 hover:bg-slate-800 hover:border-[#38bdf8]/30 transition-all text-left"
                  >
                    <Icon className="w-4 h-4 text-[#38bdf8] shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-[11px] font-bold text-white uppercase tracking-wide">{label}</p>
                      <p className="text-[9px] text-slate-500 mt-0.5">{desc}</p>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-600 mt-0.5" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* PANEL — HISTÓRICO */}
      {activeMenu === 'historico' && (
        <div className="absolute top-4 right-52 bottom-10 z-[999] w-[480px] bg-slate-900/95 border border-white/10 rounded-lg flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
            <div>
              <span className="text-[11px] font-black text-[#38bdf8] uppercase tracking-widest">Histórico</span>
              {selectedParcel && <p className="text-[10px] text-slate-500 mt-0.5">{parcelNombre}</p>}
            </div>
            <button onClick={() => setActiveMenu(null)}><X className="w-4 h-4 text-slate-500 hover:text-white" /></button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {!selectedParcel ? (
              <p className="text-[11px] text-slate-500 text-center mt-8 uppercase tracking-widest p-4">
                Selecciona un sector en el mapa primero
              </p>
            ) : (
              <ParcelHistory parcelId={parcelId!} onClose={() => setActiveMenu(null)} />
            )}
          </div>
        </div>
      )}

      {/* PANEL — TRAZABILIDAD / ALERTAS */}
      {['trazabilidad', 'alertas'].includes(activeMenu ?? '') && (
        <div className="absolute top-4 right-52 bottom-10 z-[999] w-72 bg-slate-900/95 border border-white/10 rounded-lg flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
            <span className="text-[11px] font-black text-[#38bdf8] uppercase tracking-widest">
              {MENU_ITEMS.find(m => m.id === activeMenu)?.label}
            </span>
            <button onClick={() => setActiveMenu(null)}><X className="w-4 h-4 text-slate-500 hover:text-white" /></button>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center p-6 gap-3">
            {selectedParcel ? (
              <>
                <p className="text-[11px] text-slate-400 text-center uppercase tracking-widest">{parcelNombre}</p>
                <p className="text-[10px] text-slate-600 text-center">
                  Módulo disponible cuando se introduzcan datos de campo
                </p>
              </>
            ) : (
              <p className="text-[11px] text-slate-500 text-center uppercase tracking-widest">
                Selecciona un sector en el mapa primero
              </p>
            )}
          </div>
        </div>
      )}

      {/* TOOLTIP */}
      {tooltipParcel && !activeModal && (
        <div className="absolute bottom-14 left-1/2 -translate-x-1/2 z-[1001]">
          <SectorTooltip
            parcel={tooltipParcel}
            onClose={() => { setTooltipParcel(null); setSelectedParcel(null) }}
          />
        </div>
      )}

      {/* BARRA INFERIOR */}
      <div className="absolute bottom-0 left-0 right-0 z-[1000] bg-slate-900/90 border-t border-white/10 px-4 py-1.5 flex items-center gap-6">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          Finca: <span className="text-white">{decodedFarm}</span>
        </span>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          Sectores: <span className="text-white">{sectoresActivos}</span>
        </span>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          Conexión: <span className="text-green-400">Online</span>
        </span>
        <span className="text-[10px] font-mono text-slate-500 ml-auto">
          {coords.lat !== 0 ? `${coords.lat.toFixed(5)}° N  ${coords.lng.toFixed(5)}° E` : '—'}
        </span>
        <span className="text-[10px] font-mono text-slate-400">{horaStr}</span>
      </div>

      {/* BOTÓN LOCALIZAR */}
      <button
        onClick={() => mapRef.current?.locate({ setView: true, maxZoom: 16 })}
        className="absolute bottom-10 right-4 z-[1000] w-10 h-10 rounded-full border border-white/10 flex items-center justify-center bg-slate-900/90 hover:border-[#38bdf8]/40 transition-colors"
      >
        <LocateFixed className="w-4 h-4 text-[#38bdf8]" />
      </button>

      <MapLegend />

      {/* ══ MODALES REGISTRAR ══════════════════════════ */}
      {activeModal === 'work' && parcelId && (
        <Modal title="Registrar Trabajo" subtitle={parcelNombre} onClose={closeModal}>
          <RegisterWorkForm parcelId={parcelId} onClose={closeModal} />
        </Modal>
      )}
      {activeModal === 'estado_unificado' && parcelId && (
        <Modal title="Estado / Análisis" subtitle={parcelNombre} onClose={closeModal} wide>
          <RegisterEstadoUnificadoForm
            parcelId={parcelId}
            farmName={decodedFarm}
            parcelName={parcelNombre}
            onClose={closeModal}
          />
        </Modal>
      )}
      {activeModal === 'photo' && parcelId && (
        <Modal title="Subir Foto" subtitle={parcelNombre} onClose={closeModal}>
          <UploadParcelPhoto parcelId={parcelId} onClose={closeModal} />
        </Modal>
      )}

      {/* ══ MODAL — INFORME PDF FINCA ══════════════════ */}
      {showInformeFinca && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowInformeFinca(false)} />
          <div className="relative z-10 bg-slate-900 border border-white/10 rounded-xl shadow-2xl w-full max-w-md mx-4 flex flex-col max-h-[85vh]">

            {/* Header */}
            <div className="flex items-start justify-between px-5 py-4 border-b border-white/10 shrink-0">
              <div>
                <p className="text-[11px] font-black text-[#38bdf8] uppercase tracking-[0.3em]">Informe PDF</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{decodedFarm}</p>
              </div>
              <button
                onClick={() => setShowInformeFinca(false)}
                className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center hover:bg-slate-700 transition-colors ml-4 shrink-0"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-white/10 shrink-0">
              {([
                { id: 'sector', label: 'Por Sector'   },
                { id: 'tipo',   label: 'Por Tipo'     },
                { id: 'estado', label: 'Estado Finca' },
              ] as const).map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setInformeFincaTipo(id)}
                  className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all border-b-2 ${
                    informeFincaTipo === id
                      ? 'border-[#38bdf8] text-[#38bdf8]'
                      : 'border-transparent text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Campos */}
            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">

              {/* ── Por Sector ── */}
              {informeFincaTipo === 'sector' && (
                <>
                  <p className="text-[10px] text-slate-400">
                    Todo lo registrado en un sector: trabajos, plantaciones, cosechas y tickets.
                  </p>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                      Sector <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={informeSector}
                      onChange={e => setInformeSector(e.target.value)}
                      className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#38bdf8]/50"
                    >
                      <option value="">Seleccionar sector…</option>
                      {parcels.map(p => (
                        <option key={p.properties.parcel_id} value={p.properties.parcel_id}>
                          {p.properties.parcela}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Fecha inicio</label>
                    <input type="date" value={informeFechaInicio} onChange={e => setInformeFechaInicio(e.target.value)}
                      className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#38bdf8]/50" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Fecha fin</label>
                    <input type="date" value={informeFechaFin} onChange={e => setInformeFechaFin(e.target.value)}
                      className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#38bdf8]/50" />
                  </div>
                </>
              )}

              {/* ── Por Tipo ── */}
              {informeFincaTipo === 'tipo' && (
                <>
                  <p className="text-[10px] text-slate-400">
                    Todos los registros de un tipo en toda la finca, agrupados por sector.
                  </p>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Tipo de dato</label>
                    <select
                      value={informeTipoDato}
                      onChange={e => setInformeTipoDato(e.target.value as InformeTipoDato)}
                      className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#38bdf8]/50"
                    >
                      <option value="trabajos">Trabajos</option>
                      <option value="plantaciones">Plantaciones</option>
                      <option value="cosechas">Cosechas</option>
                      <option value="tickets">Tickets de Pesaje</option>
                      <option value="residuos">Residuos</option>
                      <option value="certificaciones">Certificaciones</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Fecha inicio</label>
                    <input type="date" value={informeFechaInicio} onChange={e => setInformeFechaInicio(e.target.value)}
                      className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#38bdf8]/50" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Fecha fin</label>
                    <input type="date" value={informeFechaFin} onChange={e => setInformeFechaFin(e.target.value)}
                      className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#38bdf8]/50" />
                  </div>
                </>
              )}

              {/* ── Estado Finca ── */}
              {informeFincaTipo === 'estado' && (
                <p className="text-[10px] text-slate-400">
                  Estado actual de todos los sectores de la finca: último cultivo plantado, última cosecha y certificación vigente. Sin filtro de fechas.
                </p>
              )}

              {/* Error */}
              {informeError && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <p className="text-[11px] text-red-400">{informeError}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="shrink-0 px-5 py-4 border-t border-white/10">
              <button
                onClick={generarPDFFinca}
                disabled={generandoInforme || (informeFincaTipo === 'sector' && !informeSector)}
                className="w-full py-2.5 rounded-lg bg-[#38bdf8]/20 border border-[#38bdf8]/40 hover:bg-[#38bdf8]/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-[11px] font-black uppercase tracking-widest text-[#38bdf8] flex items-center justify-center gap-2"
              >
                {generandoInforme ? (
                  <>
                    <div className="w-4 h-4 border-2 border-[#38bdf8] border-t-transparent rounded-full animate-spin" />
                    Generando...
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    Generar PDF
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}