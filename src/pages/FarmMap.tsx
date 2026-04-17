import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useGeoJSON } from '@/hooks/useGeoJSON'
import { useFarmParcelStatuses, useFarmAnalisisSuelo } from '@/hooks/useParcelData'
import {
  ArrowLeft, LocateFixed, X,
  List, ClipboardList, FlaskConical,
  GitBranch, Bell, History, ChevronRight,
  Shovel, Sprout, Wheat, Activity, Camera,
  Droplets, Leaf, FileText, AlertCircle, Layers, Tractor
} from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { generarPDFCorporativoBase } from '@/utils/pdfUtils'
import { toast } from '@/hooks/use-toast'
import type { ParcelFeature, ParcelStatus } from '@/types/farm'
import { STATUS_COLORS, STATUS_LABELS } from '@/types/farm'

import RegisterWorkForm               from '@/components/RegisterWorkForm'
import UploadParcelPhoto              from '@/components/UploadParcelPhoto'
import ParcelHistory                  from '@/components/ParcelHistory'
import RegisterEstadoUnificadoForm    from '@/components/RegisterEstadoUnificadoForm'
import { usePosicionesActuales } from '@/hooks/useGPS'

// ── COLORES AGRONÓMICOS ───────────────────────────────
function getSueloColor(param: string, val: number | null | undefined): string {
  if (val === null || val === undefined) return '#64748b'
  if (param === 'pH') return (val < 5.5 || val > 8.0) ? '#ef4444' : (val < 6.0 || val > 7.5) ? '#eab308' : '#22c55e'
  if (param === 'EC') return val > 4.0 ? '#ef4444' : val >= 2.0 ? '#eab308' : '#22c55e'
  if (param === 'N')  return val < 20 ? '#ef4444' : (val < 40 || val > 80) ? '#eab308' : '#22c55e'
  if (param === 'P')  return val < 10 ? '#ef4444' : (val < 20 || val > 40) ? '#eab308' : '#22c55e'
  if (param === 'K')  return val < 100 ? '#ef4444' : (val < 150 || val > 250) ? '#eab308' : '#22c55e'
  if (param === 'MO') return val < 1.0 ? '#ef4444' : val < 2.0 ? '#eab308' : '#22c55e'
  return '#64748b'
}

// ── LEYENDA ───────────────────────────────────────────
const LEGEND_BOX =
  'rounded-lg border border-slate-200 bg-white/90 px-2 py-1.5 shadow-lg dark:border-white/10 dark:bg-slate-900/85 md:px-3 md:py-2'

function MapLegend({ activeMenu, sueloParam }: { activeMenu: string | null, sueloParam: string }) {
  if (activeMenu === 'suelo') {
    return (
      <div
        className={`absolute z-[1000] ${LEGEND_BOX} max-md:bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] max-md:left-2 max-md:max-h-[min(22vh,9rem)] max-md:max-w-[min(48vw,11rem)] max-md:space-y-1 max-md:overflow-y-auto md:bottom-8 md:left-4 md:max-w-none md:space-y-1.5 [&::-webkit-scrollbar]:w-1`}
      >
        <p className="mb-1 border-b border-slate-200 pb-1 text-[8px] font-black uppercase tracking-widest text-slate-500 dark:border-white/10 dark:text-slate-400 md:text-[9px]">
          Capa: {sueloParam}
        </p>
        <div className="flex items-center gap-1.5 md:gap-2">
          <span className="h-2 w-2 shrink-0 rounded-sm bg-[#22c55e] md:h-2.5 md:w-2.5" />
          <span className="text-[9px] font-medium text-slate-700 dark:text-slate-300 md:text-[10px]">Óptimo</span>
        </div>
        <div className="flex items-center gap-1.5 md:gap-2">
          <span className="h-2 w-2 shrink-0 rounded-sm bg-[#eab308] md:h-2.5 md:w-2.5" />
          <span className="text-[9px] font-medium text-slate-700 dark:text-slate-300 md:text-[10px]">Alerta</span>
        </div>
        <div className="flex items-center gap-1.5 md:gap-2">
          <span className="h-2 w-2 shrink-0 rounded-sm bg-[#ef4444] md:h-2.5 md:w-2.5" />
          <span className="text-[9px] font-medium text-slate-700 dark:text-slate-300 md:text-[10px]">Crítico</span>
        </div>
        <div className="flex items-center gap-1.5 md:gap-2">
          <span className="h-2 w-2 shrink-0 rounded-sm bg-[#64748b] md:h-2.5 md:w-2.5" />
          <span className="text-[9px] font-medium text-slate-700 dark:text-slate-300 md:text-[10px]">Sin datos</span>
        </div>
      </div>
    )
  }
  const entries = Object.entries(STATUS_COLORS) as [ParcelStatus, string][]
  return (
    <div
      className={`absolute z-[1000] ${LEGEND_BOX} max-md:bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] max-md:left-2 max-md:max-h-[min(26vh,10rem)] max-md:max-w-[min(48vw,11rem)] max-md:space-y-0.5 max-md:overflow-y-auto md:bottom-8 md:left-4 md:space-y-1 md:max-w-none [&::-webkit-scrollbar]:w-1`}
    >
      {entries.map(([status, color]) => (
        <div key={status} className="flex items-center gap-1.5 md:gap-2">
          <span className="h-2 w-2 shrink-0 rounded-sm md:h-2.5 md:w-2.5" style={{ backgroundColor: color }} />
          <span className="text-[8px] font-medium uppercase tracking-wide text-slate-600 dark:text-slate-400 md:text-[10px]">
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
  { id: 'suelo',        label: 'CAPA SUELO',   icon: Layers },
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
      <div className={`relative z-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl w-full ${wide ? 'max-w-2xl' : 'max-w-lg'} mx-4 flex flex-col max-h-[85vh]`}>
        <div className="flex items-start justify-between px-5 py-4 border-b border-slate-200 dark:border-white/10 shrink-0">
          <div>
            <p className="text-[11px] font-black text-[#6d9b7d] uppercase tracking-[0.3em]">{title}</p>
            {subtitle && <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors ml-4 shrink-0"
          >
            <X className="w-4 h-4 text-slate-500 dark:text-slate-400" />
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
    <div className="bg-white/95 dark:bg-slate-900/95 border border-[#6d9b7d]/30 rounded-lg p-3 min-w-[180px] shadow-2xl">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-black text-[#6d9b7d] uppercase tracking-widest">{p.parcela}</p>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{p.finca}</p>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:text-slate-600 dark:hover:text-slate-400">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-1.5 mt-2">
        <div className="bg-slate-50 dark:bg-slate-800/80 rounded px-2 py-1">
          <p className="text-[9px] text-slate-500 uppercase">Superficie</p>
          <p className="text-[11px] font-bold text-slate-900 dark:text-white">{p.superficie?.toFixed(2)} ha</p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800/80 rounded px-2 py-1">
          <p className="text-[9px] text-slate-500 uppercase">Código</p>
          <p className="text-[11px] font-bold text-slate-900 dark:text-white">{p.codigo || '—'}</p>
        </div>
      </div>
      <p className="text-[9px] text-slate-500 dark:text-slate-600 text-center mt-2 uppercase tracking-widest md:hidden">
        Usa el menú superior para acceder
      </p>
      <p className="text-[9px] text-slate-500 dark:text-slate-600 text-center mt-2 uppercase tracking-widest hidden md:block">
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
  const [sueloParam, setSueloParam]         = useState<string>('pH')
  const [showTractores, setShowTractores]   = useState(false)

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
  const tractoresLayerRef = useRef<L.LayerGroup | null>(null)
  const fitDoneRef      = useRef(false)

  const decodedFarm = decodeURIComponent(farmName || '')
  const parcels     = getFarmParcels(decodedFarm)
  const parcelIdsForHooks = parcels.map(p => p.properties.parcel_id)
  const { data: statuses } = useFarmParcelStatuses(parcelIdsForHooks)
  const { data: analisisSueloMap } = useFarmAnalisisSuelo(parcelIdsForHooks)
  const { data: tractoresPosiciones = [] } = usePosicionesActuales('tractor')

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

    const fc: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: parcels as unknown as GeoJSON.Feature[] }

    const geojsonLayer = L.geoJSON(fc, {
      style: feature => {
        const isSelected = feature?.properties?.parcel_id === selectedParcel?.properties.parcel_id
        
        if (activeMenu === 'suelo' && feature?.properties?.parcel_id) {
          const paramKeyMap: Record<string, string> = {
            'pH': 'ph', 'EC': 'conductividad_ec', 'N': 'nitrogeno_ppm',
            'P': 'fosforo_ppm', 'K': 'potasio_ppm', 'MO': 'materia_organica'
          }
          const analisis = analisisSueloMap?.[feature?.properties?.parcel_id]
          const val = analisis ? analisis[paramKeyMap[sueloParam]] : null
          const color = getSueloColor(sueloParam, val)
          return {
            fillColor: color,
            fillOpacity: isSelected ? 0.6 : 0.45,
            color: isSelected ? '#ffffff' : color,
            weight: isSelected ? 2.5 : 1,
          }
        }
        
        const status: ParcelStatus = statuses?.[feature?.properties?.parcel_id] ?? 'vacia'
        const isVacia    = status === 'vacia'
        return {
          fillColor:   STATUS_COLORS[status],
          fillOpacity: isSelected ? 0.45 : isVacia ? 0.08 : 0.25,
          color:       isSelected ? '#6d9b7d' : isVacia ? 'rgba(255,255,255,0.4)' : STATUS_COLORS[status],
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
        layer.on('click', () => handleParcelClick(feature as unknown as ParcelFeature))
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
  }, [parcels, statuses, selectedParcel, activeMenu, sueloParam, analisisSueloMap, handleParcelClick, buildLabel])

  // ── Overlay de Tractores GPS en tiempo real ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    
    if (tractoresLayerRef.current) {
      map.removeLayer(tractoresLayerRef.current);
      tractoresLayerRef.current = null;
    }
    
    if (!showTractores || !tractoresPosiciones || tractoresPosiciones.length === 0) return;
    
    const layerGroup = L.layerGroup().addTo(map);
    const dosHorasAtras = Date.now() - 2 * 3600 * 1000;
    
    tractoresPosiciones.forEach(pos => {
      // Solo mostrar posiciones recientes (últimas 2 horas)
      const t = pos.timestamp ? new Date(pos.timestamp).getTime() : NaN;
      if (!Number.isFinite(t) || t < dosHorasAtras) return;
      
      const html = `
        <div style="background:#fb923c; color:#1b3022; border: 2px solid #f5f2eb; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m10 11 11 .9c.6 0 .9.5.8 1.1l-.8 5h-1"/><path d="M16 18h-5"/><path d="M18 5c-.6 0-1 .4-1 1v5.6"/><path d="m20 18-1-1h-1"/><path d="m22 18-1-1h-1"/><path d="m3 8 1.5-3h4.9l.6 3"/><path d="M3.1 9H8c2.2 0 4 1.8 4 4v3"/><path d="M4 18h-1"/><path d="M7 18h-2"/><circle cx="18" cy="18" r="2"/><circle cx="7" cy="18" r="3"/></svg>
        </div>
      `;
      
      const icon = L.divIcon({ html, className: '' });
      const lat = pos.latitude != null ? Number(pos.latitude) : NaN
      const lng = pos.longitude != null ? Number(pos.longitude) : NaN
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return

      const marker = L.marker([lat, lng], { icon }).addTo(layerGroup);
      
      const timeStr = new Date(pos.timestamp).toLocaleTimeString('es-ES');
      const spd = pos.speed != null ? Number(pos.speed) : 0
      marker.bindTooltip(`
        <div class="font-bold text-slate-800 text-[11px] mb-1 uppercase tracking-wider">Tractor ID: ${(pos.vehicle_id ?? '').slice(0, 5) || '—'}</div>
        <div class="text-[10px] text-slate-600">Velocidad: <b>${Number.isFinite(spd) ? spd : 0} km/h</b></div>
        <div class="text-[10px] text-slate-600">Última señal: <b>${timeStr}</b></div>
      `, { direction: 'top', offset: [0, -10] });
    });
    
    tractoresLayerRef.current = layerGroup;
  }, [showTractores, tractoresPosiciones]);

  // Debe ejecutarse en todo render: no colocar después de `if (loading) return` (Rules of Hooks)
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const id = window.setTimeout(() => map.invalidateSize(), 320)
    return () => window.clearTimeout(id)
  }, [activeMenu])

  // ── Generación PDF de finca ──────────────────────────────────
  async function generarPDFFinca() {
    setGenerandoInforme(true)
    setInformeError(null)
    try {
      const parcelIds   = parcels.map(p => p.properties.parcel_id)
      const sectorNombre = (pid: string) =>
        parcels.find(p => p.properties.parcel_id === pid)?.properties.parcela ?? pid

      await generarPDFCorporativoBase({
        titulo: 'INFORME DE FINCA',
        subtitulo: `Finca: ${decodedFarm} | Período: ${informeFechaInicio} a ${informeFechaFin}`,
        fecha: new Date(),
        filename: `Finca_${decodedFarm.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`,
        bloques: [
          async (ctx) => {
            if (informeFincaTipo === 'sector') {
              ctx.writeLine('Sector', sectorNombre(informeSector))
              ctx.separator()
              
              // ... Fetch y render de secciones via ctx ...
              const { data: trabajos } = await supabase.from('work_records').select('*, cuadrillas(nombre)').eq('parcel_id', informeSector).gte('date', informeFechaInicio).lte('date', informeFechaFin).order('date', { ascending: false })
              ctx.writeLabel('TRABAJOS', 11)
              if (!trabajos?.length) { ctx.writeLine('Estado', 'Sin registros en el periodo.') }
              else trabajos.forEach(r => { ctx.writeLine(`Fecha: ${r.date ?? '—'}`, `Tipo: ${r.work_type ?? '—'}`); if (r.notas) ctx.writeLine('Notas', r.notas); ctx.separator() })
            } else {
              ctx.writeLine('Estado', 'Reporte consolidado de sectores');
            }
          }
        ]
      })
      setShowInformeFinca(false)
      toast({ title: 'PDF generado', description: 'Informe de finca descargado.' })

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error generando el PDF'
      setInformeError(msg)
      toast({ title: 'Error al generar el PDF', description: msg, variant: 'destructive' })
    } finally {
      setGenerandoInforme(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center text-[#6d9b7d] text-sm font-black tracking-widest uppercase transition-colors">
      Cargando sistema...
    </div>
  )

  if (geoError) return (
    <div className="min-h-screen bg-background flex items-center justify-center flex-col gap-4 text-center px-8 transition-colors">
      <span className="text-red-400 text-sm font-black tracking-widest uppercase">Error cargando mapa</span>
      <span className="text-slate-500 dark:text-slate-400 text-xs">{typeof geoError === 'string' ? geoError : ((geoError as unknown as Error)?.message || 'Error')}</span>
      <button onClick={() => navigate('/farm')} className="text-[#6d9b7d] text-xs underline">Volver al selector</button>
    </div>
  )

  const horaStr         = now.toTimeString().slice(0, 8)
  const sectoresActivos = parcels.length
  const parcelId        = selectedParcel?.properties.parcel_id ?? null
  const parcelNombre    = selectedParcel?.properties.parcela ?? ''

  const closeModal = () => setActiveModal(null)

  return (
    <div className="h-screen w-screen relative overflow-hidden bg-background transition-colors">

      <div ref={mapContainerRef} className="h-full w-full z-0" />

      {/* PANEL IDENTIDAD — escritorio */}
      <div className="hidden md:block absolute z-[1000] bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-3 shadow-lg top-4 left-4 min-w-[200px]">
        <p className="text-[10px] font-black text-[#6d9b7d] uppercase tracking-[0.3em] mb-1">Marvic 360</p>
        <p className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight leading-none">{decodedFarm}</p>
        <div className="flex items-center gap-2 mt-2">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-[10px] text-green-500 dark:text-green-400 font-bold uppercase tracking-widest">Operativo</span>
          <span className="text-[10px] text-slate-500 ml-auto font-mono">{horaStr}</span>
        </div>
      </div>

      {/* CABECERA + HERRAMIENTAS — móvil (evita solape con leyenda y menú vertical) */}
      <div className="md:hidden absolute z-[1000] left-0 right-0 top-0 border-b border-slate-200/90 dark:border-white/10 bg-white/95 dark:bg-slate-900/95 shadow-md backdrop-blur-sm">
        <div className="pt-[max(0.35rem,env(safe-area-inset-top,0px))] pl-2 pr-14 pb-1.5">
          <div className="flex items-start gap-2">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 dark:border-white/10 bg-white/90 dark:bg-slate-900/90 shadow-sm transition-colors hover:border-[#6d9b7d]/40"
              aria-label="Volver"
            >
              <ArrowLeft className="h-4 w-4 text-slate-500 dark:text-slate-400" />
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-[8px] font-black uppercase tracking-[0.25em] text-[#6d9b7d]">Marvic 360</p>
              <p className="truncate text-sm font-black uppercase leading-tight tracking-tight text-slate-900 dark:text-white">
                {decodedFarm}
              </p>
              <div className="mt-0.5 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-green-400" />
                <span className="text-[9px] font-bold uppercase tracking-widest text-green-500 dark:text-green-400">
                  Operativo
                </span>
              </div>
            </div>
            <span className="shrink-0 pt-1 font-mono text-[9px] text-slate-500 dark:text-slate-400">{horaStr}</span>
          </div>
          <div className="mt-1.5 flex gap-1 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {MENU_ITEMS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveMenu(activeMenu === id ? null : id)}
                className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[9px] font-black uppercase tracking-wide shadow-sm transition-all ${
                  activeMenu === id
                    ? 'border-[#6d9b7d]/40 bg-[#6d9b7d]/10 text-[#6d9b7d] dark:border-[#6d9b7d]/60 dark:bg-[#6d9b7d]/20'
                    : 'border-slate-200 bg-white/90 text-slate-600 dark:border-white/10 dark:bg-slate-900/90 dark:text-slate-300'
                }`}
              >
                <Icon className="h-3 w-3 shrink-0" />
                <span className="whitespace-nowrap">{label}</span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setInformeError(null)
                setShowInformeFinca(true)
              }}
              className="flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white/90 px-2.5 py-1.5 text-[9px] font-black uppercase tracking-wide text-slate-600 shadow-sm transition-all dark:border-white/10 dark:bg-slate-900/90 dark:text-slate-300"
            >
              <FileText className="h-3 w-3 shrink-0" />
              <span className="whitespace-nowrap">Informe PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* BOTÓN VOLVER — escritorio */}
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="absolute z-[1000] top-4 left-[220px] hidden h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white/90 shadow-lg transition-colors hover:border-[#6d9b7d]/40 dark:border-white/10 dark:bg-slate-900/90 md:flex"
        aria-label="Volver"
      >
        <ArrowLeft className="h-4 w-4 text-slate-500 dark:text-slate-400" />
      </button>

      {/* MENÚ VERTICAL DERECHA — escritorio */}
      <div className="absolute z-[1000] top-4 right-4 hidden flex-col gap-1 md:flex">
        {MENU_ITEMS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveMenu(activeMenu === id ? null : id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-[11px] font-black uppercase tracking-widest transition-all shadow-sm ${
              activeMenu === id
                ? 'bg-[#6d9b7d]/10 dark:bg-[#6d9b7d]/20 border-[#6d9b7d]/40 dark:border-[#6d9b7d]/60 text-[#6d9b7d]'
                : 'bg-white/90 dark:bg-slate-900/90 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:border-[#6d9b7d]/30 hover:text-[#6d9b7d]'
            }`}
          >
            <Icon className="w-3.5 h-3.5 shrink-0" />
            {label}
          </button>
        ))}

        {/* ── Separador + Informe PDF ── */}
        <div className="h-px bg-slate-200 dark:bg-white/10 my-1" />
        <button
          onClick={() => { setInformeError(null); setShowInformeFinca(true) }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border text-[11px] font-black uppercase tracking-widest transition-all bg-white/90 dark:bg-slate-900/90 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:border-[#6d9b7d]/30 hover:text-[#6d9b7d] shadow-sm"
        >
          <FileText className="w-3.5 h-3.5 shrink-0" />
          Informe PDF
        </button>
      </div>

      {/* PANEL — SECTORES */}
      {activeMenu === 'sectores' && (
        <div className="absolute z-[999] bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-white/10 rounded-lg flex flex-col overflow-hidden shadow-2xl max-md:inset-x-3 max-md:top-[calc(env(safe-area-inset-top,0px)+8.5rem)] max-md:bottom-[5.5rem] max-md:w-auto max-md:max-h-[min(65vh,calc(100dvh-10rem))] md:top-4 md:right-52 md:bottom-10 md:left-auto md:w-72 md:max-h-none">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-white/10 shrink-0">
            <span className="text-[11px] font-black text-[#6d9b7d] uppercase tracking-widest">Sectores</span>
            <button onClick={() => setActiveMenu(null)}><X className="w-4 h-4 text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-white" /></button>
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
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-left transition-all ${
                    selectedParcel?.properties.parcel_id === p.properties.parcel_id
                      ? 'bg-[#6d9b7d]/10 border-[#6d9b7d]/30 dark:border-[#6d9b7d]/40'
                      : 'bg-slate-50 dark:bg-slate-800/50 border-transparent hover:border-slate-200 dark:hover:border-white/10'
                  }`}
                >
                  <div>
                    <p className="text-[11px] font-bold text-slate-900 dark:text-white">{p.properties.parcela}</p>
                    <p className="text-[9px] text-slate-500">{p.properties.superficie?.toFixed(2)} ha</p>
                  </div>
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: STATUS_COLORS[status] }} />
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* PANEL — CAPA SUELO */}
      {activeMenu === 'suelo' && (
        <div className="absolute z-[999] bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-white/10 rounded-lg flex flex-col overflow-hidden shadow-2xl max-md:inset-x-3 max-md:top-[calc(env(safe-area-inset-top,0px)+8.5rem)] max-md:bottom-[5.5rem] max-md:w-auto max-md:max-h-[min(65vh,calc(100dvh-10rem))] md:top-4 md:right-52 md:bottom-10 md:left-auto md:w-72 md:max-h-none">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-white/10 shrink-0 bg-slate-50 dark:bg-slate-800/50">
            <span className="text-[11px] font-black text-[#6d9b7d] uppercase tracking-widest flex items-center gap-2">
              <Layers className="w-3.5 h-3.5" /> Capa Agronómica
            </span>
            <button onClick={() => setActiveMenu(null)}><X className="w-4 h-4 text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-white transition-colors" /></button>
          </div>
          <div className="p-4 space-y-4 overflow-y-auto">
            <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-widest leading-relaxed">Selecciona el parámetro agronómico para colorear los sectores del mapa (basado en el último análisis de suelo).</p>
            <div className="space-y-1.5">
              {['pH', 'EC', 'N', 'P', 'K', 'MO'].map(param => (
                <button
                  key={param}
                  onClick={() => setSueloParam(param)}
                  className={`w-full text-left px-3 py-2.5 rounded border text-[11px] font-bold transition-all flex justify-between items-center ${
                    sueloParam === param 
                      ? 'bg-[#6d9b7d]/10 border-[#6d9b7d]/40 text-[#6d9b7d]' 
                      : 'bg-slate-50 dark:bg-slate-800/40 border-transparent text-slate-600 dark:text-slate-400 hover:border-slate-200 dark:hover:border-white/10 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <span>
                    {param === 'pH' ? 'pH (Acidez)' : param === 'EC' ? 'EC (Conductividad)' : param === 'N' ? 'Nitrógeno (ppm)' : param === 'P' ? 'Fósforo (ppm)' : param === 'K' ? 'Potasio (ppm)' : 'Materia Orgánica (%)'}
                  </span>
                  {sueloParam === param && <div className="w-1.5 h-1.5 rounded-full bg-[#6d9b7d] animate-pulse" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PANEL — REGISTRAR */}
      {activeMenu === 'registrar' && (
        <div className="absolute z-[999] bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-white/10 rounded-lg flex flex-col overflow-hidden shadow-2xl max-md:inset-x-3 max-md:top-[calc(env(safe-area-inset-top,0px)+8.5rem)] max-md:bottom-[5.5rem] max-md:w-auto max-md:max-h-[min(65vh,calc(100dvh-10rem))] md:top-4 md:right-52 md:bottom-10 md:left-auto md:w-72 md:max-h-none">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-white/10 shrink-0">
            <div>
              <span className="text-[11px] font-black text-[#6d9b7d] uppercase tracking-widest">Registrar</span>
              {selectedParcel && <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{parcelNombre}</p>}
            </div>
            <button onClick={() => setActiveMenu(null)}><X className="w-4 h-4 text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-white" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            {!selectedParcel ? (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center mt-8 uppercase tracking-widest">
                Selecciona un sector en el mapa primero
              </p>
            ) : (
              <div className="space-y-2">
                {[
                  { label: 'Estado / Análisis', icon: Activity, action: 'estado_unificado' as RegisterAction },
                  { label: 'Plantación',        icon: Sprout,   action: 'estado_unificado' as RegisterAction },
                  { label: 'Cosecha',           icon: Wheat,    action: 'estado_unificado' as RegisterAction },
                  { label: 'Foto',              icon: Camera,   action: 'photo'           as RegisterAction },
                ].map(({ label, icon: Icon, action }) => (
                  <button
                    key={action}
                    onClick={() => { setActiveModal(action); setActiveMenu(null) }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-[#6d9b7d]/30 transition-all text-left"
                  >
                    <Icon className="w-4 h-4 text-[#6d9b7d] shrink-0" />
                    <span className="text-[11px] font-bold text-slate-900 dark:text-white uppercase tracking-wide">{label}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-600 ml-auto" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* PANEL — ANÁLISIS */}
      {activeMenu === 'analisis' && (
        <div className="absolute z-[999] bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-white/10 rounded-lg flex flex-col overflow-hidden shadow-2xl max-md:inset-x-3 max-md:top-[calc(env(safe-area-inset-top,0px)+8.5rem)] max-md:bottom-[5.5rem] max-md:w-auto max-md:max-h-[min(65vh,calc(100dvh-10rem))] md:top-4 md:right-52 md:bottom-10 md:left-auto md:w-72 md:max-h-none">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-white/10 shrink-0">
            <div>
              <span className="text-[11px] font-black text-[#6d9b7d] uppercase tracking-widest">Análisis</span>
              {selectedParcel && <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{parcelNombre}</p>}
            </div>
            <button onClick={() => setActiveMenu(null)}><X className="w-4 h-4 text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-white" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            {!selectedParcel ? (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center mt-8 uppercase tracking-widest">
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
                    className="w-full flex items-start gap-3 px-3 py-3 rounded border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-[#6d9b7d]/30 transition-all text-left"
                  >
                    <Icon className="w-4 h-4 text-[#6d9b7d] shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-[11px] font-bold text-slate-900 dark:text-white uppercase tracking-wide">{label}</p>
                      <p className="text-[9px] text-slate-500 mt-0.5">{desc}</p>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-600 mt-0.5" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* PANEL — HISTÓRICO */}
      {activeMenu === 'historico' && (
        <div className="absolute z-[999] bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-white/10 rounded-lg flex flex-col overflow-hidden shadow-2xl max-md:inset-x-3 max-md:top-[calc(env(safe-area-inset-top,0px)+8.5rem)] max-md:bottom-[5.5rem] max-md:w-auto max-md:max-h-[min(65vh,calc(100dvh-10rem))] md:top-4 md:right-52 md:bottom-10 md:left-auto md:w-[480px] md:max-h-none">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-white/10 shrink-0">
            <div>
              <span className="text-[11px] font-black text-[#6d9b7d] uppercase tracking-widest">Histórico</span>
              {selectedParcel && <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{parcelNombre}</p>}
            </div>
            <button onClick={() => setActiveMenu(null)}><X className="w-4 h-4 text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-white" /></button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {!selectedParcel ? (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center mt-8 uppercase tracking-widest p-4">
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
        <div className="absolute z-[999] bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-white/10 rounded-lg flex flex-col overflow-hidden shadow-2xl max-md:inset-x-3 max-md:top-[calc(env(safe-area-inset-top,0px)+8.5rem)] max-md:bottom-[5.5rem] max-md:w-auto max-md:max-h-[min(65vh,calc(100dvh-10rem))] md:top-4 md:right-52 md:bottom-10 md:left-auto md:w-72 md:max-h-none">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-white/10 shrink-0">
            <span className="text-[11px] font-black text-[#6d9b7d] uppercase tracking-widest">
              {MENU_ITEMS.find(m => m.id === activeMenu)?.label}
            </span>
            <button onClick={() => setActiveMenu(null)}><X className="w-4 h-4 text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-white" /></button>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center p-6 gap-3">
            {selectedParcel ? (
              <>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center uppercase tracking-widest">{parcelNombre}</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-600 text-center">
                  Módulo disponible cuando se introduzcan datos de campo
                </p>
              </>
            ) : (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center uppercase tracking-widest">
                Selecciona un sector en el mapa primero
              </p>
            )}
          </div>
        </div>
      )}

      {/* TOOLTIP */}
      {tooltipParcel && !activeModal && (
        <div className="absolute left-1/2 -translate-x-1/2 z-[1001] max-md:bottom-[4.75rem] md:bottom-14">
          <SectorTooltip
            parcel={tooltipParcel}
            onClose={() => { setTooltipParcel(null); setSelectedParcel(null) }}
          />
        </div>
      )}

      {/* BARRA INFERIOR */}
      <div className="absolute bottom-0 left-0 right-0 z-[1000] bg-white/90 dark:bg-slate-900/90 border-t border-slate-200 dark:border-white/10 px-3 py-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 max-md:pb-[max(0.35rem,env(safe-area-inset-bottom))] md:px-4 md:gap-6 md:py-1.5">
        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
          Finca: <span className="text-slate-900 dark:text-white">{decodedFarm}</span>
        </span>
        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
          Sectores: <span className="text-slate-900 dark:text-white">{sectoresActivos}</span>
        </span>
        
        <button
          onClick={() => setShowTractores(prev => !prev)}
          className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full transition-colors flex items-center gap-1.5 ${
            showTractores ? 'bg-orange-500 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-700'
          }`}
        >
          <Tractor className="w-3 h-3" /> GPS TRACTORES
        </button>

        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
          Conexión: <span className="text-green-400">Online</span>
        </span>
        <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 ml-auto">
          {coords.lat !== 0 ? `${coords.lat.toFixed(5)}° N  ${coords.lng.toFixed(5)}° E` : '—'}
        </span>
        <span className="text-[10px] font-mono text-slate-400 dark:text-slate-400">{horaStr}</span>
      </div>

      {/* BOTÓN LOCALIZAR */}
      <button
        onClick={() => mapRef.current?.locate({ setView: true, maxZoom: 16 })}
        className="absolute z-[1000] w-10 h-10 rounded-full border border-slate-200 dark:border-white/10 flex items-center justify-center bg-white/90 dark:bg-slate-900/90 hover:border-[#6d9b7d]/40 shadow-lg transition-colors max-md:bottom-[5.5rem] max-md:right-3 md:bottom-10 md:right-4"
      >
        <LocateFixed className="w-4 h-4 text-[#6d9b7d]" />
      </button>

      <MapLegend activeMenu={activeMenu} sueloParam={sueloParam} />

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
          <div className="relative z-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl w-full max-w-md mx-4 flex flex-col max-h-[85vh]">

            {/* Header */}
            <div className="flex items-start justify-between px-5 py-4 border-b border-slate-200 dark:border-white/10 shrink-0">
              <div>
                <p className="text-[11px] font-black text-[#6d9b7d] uppercase tracking-[0.3em]">Informe PDF</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{decodedFarm}</p>
              </div>
              <button
                onClick={() => setShowInformeFinca(false)}
                className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors ml-4 shrink-0"
              >
                <X className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 dark:border-white/10 shrink-0">
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
                      ? 'border-[#6d9b7d] text-[#6d9b7d]'
                      : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
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
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    Todo lo registrado en un sector: trabajos, plantaciones, cosechas y tickets.
                  </p>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">
                      Sector <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={informeSector}
                      onChange={e => setInformeSector(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#6d9b7d]/50"
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
                    <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">Fecha inicio</label>
                    <input type="date" value={informeFechaInicio} onChange={e => setInformeFechaInicio(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#6d9b7d]/50" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">Fecha fin</label>
                    <input type="date" value={informeFechaFin} onChange={e => setInformeFechaFin(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#6d9b7d]/50" />
                  </div>
                </>
              )}

              {/* ── Por Tipo ── */}
              {informeFincaTipo === 'tipo' && (
                <>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    Todos los registros de un tipo en toda la finca, agrupados por sector.
                  </p>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">Tipo de dato</label>
                    <select
                      value={informeTipoDato}
                      onChange={e => setInformeTipoDato(e.target.value as InformeTipoDato)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#6d9b7d]/50"
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
                    <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">Fecha inicio</label>
                    <input type="date" value={informeFechaInicio} onChange={e => setInformeFechaInicio(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#6d9b7d]/50" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">Fecha fin</label>
                    <input type="date" value={informeFechaFin} onChange={e => setInformeFechaFin(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#6d9b7d]/50" />
                  </div>
                </>
              )}

              {/* ── Estado Finca ── */}
              {informeFincaTipo === 'estado' && (
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
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
            <div className="shrink-0 px-5 py-4 border-t border-slate-200 dark:border-white/10">
              <button
                onClick={generarPDFFinca}
                disabled={generandoInforme || (informeFincaTipo === 'sector' && !informeSector)}
                className="w-full py-2.5 rounded-lg bg-[#6d9b7d]/20 border border-[#6d9b7d]/40 hover:bg-[#6d9b7d]/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-[11px] font-black uppercase tracking-widest text-[#6d9b7d] flex items-center justify-center gap-2"
              >
                {generandoInforme ? (
                  <>
                    <div className="w-4 h-4 border-2 border-[#6d9b7d] border-t-transparent rounded-full animate-spin" />
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