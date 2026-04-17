import React, { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { QrCode, Package, Thermometer, Plus, X, Search, MapPin, Truck, Box, FlaskConical, Sprout, Wrench, Droplets, Wheat, Activity, CalendarClock, Download, FileText, AlertCircle, Loader2 } from 'lucide-react'
import {
  usePalots, useAddPalot, useCamarasAlmacen,
  useMovimientosPalot, useAddMovimientoPalot, useLocalPalot,
  useDeletePalot, useUpdatePalot
} from '@/hooks/useTrazabilidad'
import { useParcelas } from '@/hooks/useParcelData'
import { supabase } from '@/integrations/supabase/client'
import type { Tables } from '@/integrations/supabase/types'
import { useQuery } from '@tanstack/react-query'
import SelectWithOther from '@/components/base/SelectWithOther'
import RecordActions from '@/components/base/RecordActions'
import { generarPDFCorporativoBase } from '@/utils/pdfUtils'
import { FINCAS_NOMBRES } from '@/constants/farms'
import { toast } from '@/hooks/use-toast'
import { horasTrabajoLabel } from '@/utils/horasTrabajo'

const ESTADOS_PALOT = {
  en_campo: 'bg-green-500/20 text-green-400 border-green-500/30',
  en_transporte: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  en_almacen: 'bg-primary/20 text-primary border-primary/30',
  expedido: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
}

const TIPOS_MOVIMIENTO = [
  { value: 'carga_campo', label: 'Carga en Campo' },
  { value: 'descarga_almacen', label: 'Descarga en Almacén' },
  { value: 'entrada_camara', label: 'Entrada a Cámara' },
  { value: 'salida_expedicion', label: 'Salida / Expedición' }
]

interface DbRow {
  id: string;
  fecha?: string;
  created_at?: string;
  date?: string;
  fecha_inicio?: string;
  timestamp?: string;
  ph?: number;
  conductividad_ec?: number;
  materia_organica?: number;
  crop?: string;
  variedad?: string;
  tipo_trabajo?: string;
  work_type?: string;
  cuadrillas?: { nombre?: string };
  nombres_operarios?: string;
  hours_worked?: number | null;
  horas_calculadas?: number | null;
  hora_entrada?: string | null;
  hora_salida?: string | null;
  volumen_m3?: number | null;
  tipo_movimiento?: string | null;
  ndvi?: number;
  clorofila?: number;
  production_kg?: number;
  numero_palot?: string;
  peso_kg?: number;
  tipo?: string;
  camiones?: { matricula?: string };
}

interface PalotRow {
  id: string;
  numero_palot: string;
  estado: string;
  cultivo?: string | null;
  lote?: string | null;
  peso_kg?: number | null;
  parcel_id?: string | null;
  parcels?: { parcel_number?: string } | null;
}

export default function Trazabilidad() {
  const [filtroEstado, setFiltroEstado] = useState<string>('todos')
  const { data: palots = [], isLoading: loadingPalots } = usePalots(null, filtroEstado)
  const { data: camaras = [] } = useCamarasAlmacen()
  const [scanInput, setScanInput] = useState('')
  const [searchedQR, setSearchedQR] = useState<string>('')
  
  // Modales
  const [showAltaPalot, setShowAltaPalot] = useState(false)
  const [showMovimiento, setShowMovimiento] = useState<string | null>(null) // palot_id

  // Modal Alta
  const [altaParcela, setAltaParcela] = useState('')
  const [altaCosecha, setAltaCosecha] = useState('')
  const [altaCultivo, setAltaCultivo] = useState('')
  const [altaLote, setAltaLote] = useState('')
  const [altaPeso, setAltaPeso] = useState('')
  
  // Modal Movimiento
  const [movTipo, setMovTipo] = useState('')
  const [movOperador, setMovOperador] = useState('')
  const [movNotas, setMovNotas] = useState('')

  const mutAddPalot = useAddPalot()
  const mutAddMov = useAddMovimientoPalot()
  const mutDeletePalot = useDeletePalot()
  const mutUpdatePalot = useUpdatePalot()
  const [editPalot, setEditPalot] = useState<PalotRow | null>(null)
  const [editPeso, setEditPeso] = useState('')
  const [editCultivo, setEditCultivo] = useState('')
  const [editLote, setEditLote] = useState('')

  const { data: parcelas = [] } = useParcelas()
  const { data: cosechas = [] } = useQuery({
    queryKey: ['todas_cosechas_recientes'],
    queryFn: async () => {
      const { data, error } = await supabase.from('harvests').select('*').order('date', { ascending: false }).limit(50)
      if (error) throw error
      return data ?? []
    }
  })

  const { data: palotEscaneado, isLoading: loadingScan } = useLocalPalot(searchedQR)
  const { data: palotMovimientos } = useMovimientosPalot(palotEscaneado?.id ?? null)

  // ── Timeline Parcela ────────────────────────────────────────
  const [timelineFinca, setTimelineFinca] = useState('')
  const [timelineParcela, setTimelineParcela] = useState('')
  const { data: parcelasTimeline = [] } = useParcelas(timelineFinca || undefined)

  const { data: timelineData, isLoading: loadingTimeline } = useQuery({
    queryKey: ['trazabilidad_timeline', timelineParcela],
    queryFn: async () => {
      if (!timelineParcela) return null

      const [
        { data: suelo },
        { data: plantaciones },
        { data: trabajos },
        { data: sensores },
        { data: cosechas },
        { data: palots }
      ] = await Promise.all([
        supabase.from('analisis_suelo').select('*').eq('parcel_id', timelineParcela),
        supabase.from('plantings').select('*').eq('parcel_id', timelineParcela),
        supabase.from('work_records').select('*, cuadrillas(nombre)').eq('parcel_id', timelineParcela),
        supabase.from('lecturas_sensor_planta').select('*').eq('parcel_id', timelineParcela),
        supabase.from('harvests').select('*').eq('parcel_id', timelineParcela),
        supabase.from('palots').select('*').eq('parcel_id', timelineParcela)
      ])

      const { data: zonasTimeline } = await supabase.from('sistema_riego_zonas').select('id').eq('parcel_id', timelineParcela)
      const zonaIdsTimeline = (zonasTimeline ?? []).map(z => z.id)
      const { data: riegos } =
        zonaIdsTimeline.length > 0
          ? await supabase.from('registros_riego').select('*').in('zona_id', zonaIdsTimeline)
          : { data: [] as Tables<'registros_riego'>[] }

      const palotIds = (palots || []).map(p => p.id)
      let movimientos: (Tables<'movimientos_palot'> & { camiones?: { matricula: string | null } | null })[] = []
      if (palotIds.length > 0) {
        const { data: movs } = await supabase.from('movimientos_palot').select('*, camiones(matricula)').in('palot_id', palotIds)
        movimientos = movs || []
      }

      const events: { id: string; type: string; date: Date; data: DbRow }[] = []

      ;((suelo ?? []) as DbRow[]).forEach(e => events.push({ id: e.id, type: 'suelo', date: new Date(e.fecha || e.created_at || 0), data: e }))
      ;((plantaciones ?? []) as DbRow[]).forEach(e => events.push({ id: e.id, type: 'plantacion', date: new Date(e.date || e.created_at || 0), data: e }))
      ;((trabajos ?? []) as DbRow[]).forEach(e => events.push({ id: e.id, type: 'trabajo', date: new Date(e.date || e.created_at || 0), data: e }))
      ;((riegos ?? []) as DbRow[]).forEach(e =>
        events.push({ id: e.id, type: 'riego', date: new Date(e.fecha || e.created_at || 0), data: e })
      )
      ;((sensores ?? []) as DbRow[]).forEach(e => events.push({ id: e.id, type: 'sensor', date: new Date(e.fecha || e.created_at || 0), data: e }))
      ;((cosechas ?? []) as DbRow[]).forEach(e => events.push({ id: e.id, type: 'cosecha', date: new Date(e.date || e.created_at || 0), data: e }))
      ;((palots ?? []) as DbRow[]).forEach(e => events.push({ id: e.id, type: 'palot', date: new Date(e.created_at || 0), data: e }))
      ;((movimientos ?? []) as DbRow[]).forEach(e => events.push({ id: e.id, type: 'movimiento', date: new Date(e.timestamp || e.created_at || 0), data: e }))

      return events.sort((a, b) => b.date.getTime() - a.date.getTime())
    },
    enabled: !!timelineParcela
  })

  const missingFlags = {
    suelo: timelineData && !timelineData.some(e => e.type === 'suelo'),
    plantacion: timelineData && !timelineData.some(e => e.type === 'plantacion'),
    cosecha: timelineData && !timelineData.some(e => e.type === 'cosecha'),
    palot: timelineData && !timelineData.some(e => e.type === 'palot'),
  }

  const [generandoPDF, setGenerandoPDF] = useState(false)
  const generarPDFTimeline = async () => {
    if (!timelineData || !timelineParcela) return
    setGenerandoPDF(true)
    try {
      await generarPDFCorporativoBase({
        titulo: `Trazabilidad Completa — ${timelineParcela}`,
        subtitulo: `Finca: ${timelineFinca}`,
        fecha: new Date(),
        filename: `Trazabilidad_${timelineParcela}_${new Date().toISOString().slice(0,10)}.pdf`,
        bloques: [
          async (ctx) => {
            ctx.writeLabel('RESUMEN DE TRAZABILIDAD', 11)
            ctx.separator()
            const evs = [...timelineData].sort((a, b) => a.date.getTime() - b.date.getTime())
            if (evs.length === 0) {
              ctx.writeLine('Sin eventos', 'No hay registros para esta parcela.')
              return
            }
            for (const ev of evs) {
              ctx.checkPage(12)
              const dStr = ev.date.toLocaleDateString('es-ES')
              const e = ev.data
              const label = ev.type.toUpperCase()
              let detail = ''

              if (ev.type === 'suelo') { detail = `pH: ${e.ph ?? '-'} | EC: ${e.conductividad_ec ?? '-'} | MO: ${e.materia_organica ?? '-'}%` }
              else if (ev.type === 'plantacion') { detail = `Cultivo: ${e.crop ?? '—'} | Variedad: ${e.variedad || 'N/D'}` }
              else if (ev.type === 'trabajo') {
                const tipo = e.work_type ?? e.tipo_trabajo ?? '—';
                const horas = horasTrabajoLabel({
                  hours_worked: e.hours_worked,
                  horas_calculadas: e.horas_calculadas,
                  hora_entrada: e.hora_entrada,
                  hora_salida: e.hora_salida,
                });
                detail = `${tipo} | ${e.cuadrillas?.nombre || e.nombres_operarios || 'Sin operarios'} | ${horas}`;
              }
              else if (ev.type === 'riego') {
                const m3 = Number(e.volumen_m3) || 0
                detail = m3 > 0 ? `${Math.round(m3 * 1000).toLocaleString()} L (~${m3.toFixed(2)} m³)` : 'Sin volumen registrado'
              }
              else if (ev.type === 'sensor') { detail = `NDVI: ${e.ndvi ?? '-'} | SPAD: ${e.clorofila ?? '-'}` }
              else if (ev.type === 'cosecha') { detail = `${e.production_kg || 0} kg recolectados` }
              else if (ev.type === 'palot') {
                const codigo = e.numero_palot ?? '';
                detail = `Nº: ${codigo ? codigo.split('-')[0] : '—'} | Peso: ${e.peso_kg || 0} kg`;
              }
              else if (ev.type === 'movimiento') {
                const tipoMov = (e.tipo_movimiento ?? e.tipo ?? '').replace(/_/g, ' ')
                detail = `${tipoMov} | Vehículo: ${e.camiones?.matricula || 'N/D'}`
              }

              ctx.entryHeader(label[0] || 'E', label, dStr)
              ctx.writeLine('Detalle', detail)
            }
          }
        ]
      })
      toast({ title: 'PDF generado', description: 'Trazabilidad descargada.' })
    } catch (e) {
      console.error(e)
      toast({
        title: 'Error al generar el PDF',
        description: e instanceof Error ? e.message : 'Inténtalo de nuevo.',
        variant: 'destructive',
      })
    } finally {
      setGenerandoPDF(false)
    }
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'suelo': return <FlaskConical className="w-4 h-4 text-emerald-400" />
      case 'plantacion': return <Sprout className="w-4 h-4 text-green-400" />
      case 'trabajo': return <Wrench className="w-4 h-4 text-amber-400" />
      case 'riego': return <Droplets className="w-4 h-4 text-primary" />
      case 'sensor': return <Activity className="w-4 h-4 text-purple-400" />
      case 'cosecha': return <Wheat className="w-4 h-4 text-yellow-400" />
      case 'palot': return <Package className="w-4 h-4 text-primary" />
      case 'movimiento': return <Truck className="w-4 h-4 text-marvic-brand" />
      default: return <CalendarClock className="w-4 h-4 text-slate-400" />
    }
  }

  const renderEventInfo = (ev: { type: string; data: DbRow }) => {
    const e = ev.data;
    switch (ev.type) {
      case 'suelo': return <><span className="font-bold text-slate-300">Análisis:</span> pH {e.ph ?? '-'} | EC {e.conductividad_ec ?? '-'}</>;
      case 'plantacion': return <><span className="font-bold text-slate-300">Plantación:</span> {e.crop ?? '—'} ({e.variedad || 'Sin variedad'})</>;
      case 'trabajo': {
        const tipo = e.work_type ?? e.tipo_trabajo ?? '—';
        const horas = horasTrabajoLabel({
          hours_worked: e.hours_worked,
          horas_calculadas: e.horas_calculadas,
          hora_entrada: e.hora_entrada,
          hora_salida: e.hora_salida,
        });
        return <><span className="font-bold text-slate-300">Trabajo:</span> {tipo} | {e.cuadrillas?.nombre || e.nombres_operarios || '-'} | {horas}</>;
      }
      case 'riego': {
        const m3 = Number(e.volumen_m3) || 0
        return (
          <>
            <span className="font-bold text-slate-300">Riego:</span>{' '}
            {m3 > 0 ? `${Math.round(m3 * 1000).toLocaleString()} L (~${m3.toFixed(2)} m³)` : 'Sin volumen'}
          </>
        )
      }
      case 'sensor': return <><span className="font-bold text-slate-300">Sensor:</span> NDVI {e.ndvi ?? '-'} | SPAD {e.clorofila ?? '-'}</>;
      case 'cosecha': return <><span className="font-bold text-slate-300">Cosecha:</span> {e.production_kg || 0} kg</>;
      case 'palot': {
        const codigo = e.numero_palot ?? '';
        return <><span className="font-bold text-slate-300">Palot creado:</span> Nº {codigo ? codigo.split('-')[0] : '—'} | {e.peso_kg || 0} kg</>;
      }
      case 'movimiento': {
        const tipoMov = (e.tipo_movimiento ?? e.tipo ?? '').replace(/_/g, ' ')
        return <><span className="font-bold text-slate-300">Movimiento:</span> {tipoMov} | {e.camiones?.matricula || '-'}</>
      }
      default: return null;
    }
  }

  const renderMissing = () => {
    return (
      <div className="flex gap-2 flex-wrap mt-2">
        {missingFlags.suelo && <span className="bg-red-500/10 text-red-400 border border-red-500/30 text-[10px] uppercase font-bold px-2 py-1 rounded flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Sin Análisis Suelo</span>}
        {missingFlags.plantacion && <span className="bg-red-500/10 text-red-400 border border-red-500/30 text-[10px] uppercase font-bold px-2 py-1 rounded flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Sin Plantación</span>}
        {missingFlags.cosecha && <span className="bg-red-500/10 text-red-400 border border-red-500/30 text-[10px] uppercase font-bold px-2 py-1 rounded flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Sin Cosecha</span>}
        {missingFlags.palot && <span className="bg-red-500/10 text-red-400 border border-red-500/30 text-[10px] uppercase font-bold px-2 py-1 rounded flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Sin Palots</span>}
      </div>
    )
  }

  async function handleAltaPalot(e: React.FormEvent) {
    e.preventDefault()
    await mutAddPalot.mutateAsync({
      parcel_id: altaParcela || null,
      harvest_id: altaCosecha || null,
      cultivo: altaCultivo || null,
      lote: altaLote || null,
      peso_kg: parseFloat(altaPeso) || null,
      estado: 'en_campo'
    })
    setShowAltaPalot(false)
    setAltaParcela(''); setAltaCosecha(''); setAltaCultivo(''); setAltaLote(''); setAltaPeso('');
  }

  async function handleMovimiento(e: React.FormEvent) {
    e.preventDefault()
    if (!showMovimiento || !movTipo) return

    // Intentar obtener geolocalización
    let lat = null, lng = null;
    if (navigator.geolocation) {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 3000 })
        })
        lat = pos.coords.latitude; lng = pos.coords.longitude;
      } catch (e) { console.warn('No GPS') }
    }

    // Determinar nuevo estado basado en el movimiento
    let nuevoEstado = 'en_campo'
    if (movTipo === 'carga_campo') nuevoEstado = 'en_transporte'
    if (movTipo === 'descarga_almacen' || movTipo === 'entrada_camara') nuevoEstado = 'en_almacen'
    if (movTipo === 'salida_expedicion') nuevoEstado = 'expedido'

    await mutAddMov.mutateAsync({
      palot_id: showMovimiento,
      tipo: movTipo,
      operador: movOperador || null,
      notas: movNotas || null,
      latitud: lat,
      longitud: lng
    })

    // Actualizamos estado del palot
    await supabase.from('palots').update({ estado: nuevoEstado }).eq('id', showMovimiento)

    setShowMovimiento(null)
    setMovTipo(''); setMovOperador(''); setMovNotas('');
  }

  return (
    <div className="flex flex-col min-h-screen pt-4 pb-10 pr-4 pl-14 md:p-4 md:pb-10 max-w-6xl mx-auto w-full text-slate-200">
        <div className="flex flex-col gap-3 mb-6 shrink-0 max-md:items-stretch md:flex-row md:items-center">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
            <Package className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white uppercase tracking-tight">Trazabilidad Lotes</h1>
            <p className="text-xs text-slate-400 font-medium">Control integral de palots y cámaras de almacenamiento</p>
          </div>
        </div>

        <Tabs defaultValue="palots" className="flex-1 flex flex-col min-h-0">
          <TabsList className="bg-slate-900 border border-white/5 shrink-0 grid w-full grid-cols-2 md:grid-cols-4">
            <TabsTrigger value="palots" className="text-xs font-bold uppercase tracking-wider data-[state=active]:bg-[#6d9b7d]/10 data-[state=active]:text-[#6d9b7d]">PALOTS</TabsTrigger>
            <TabsTrigger value="camaras" className="text-xs font-bold uppercase tracking-wider data-[state=active]:bg-[#6d9b7d]/10 data-[state=active]:text-[#6d9b7d]">CÁMARAS</TabsTrigger>
            <TabsTrigger value="scanner" className="text-xs font-bold uppercase tracking-wider data-[state=active]:bg-[#6d9b7d]/10 data-[state=active]:text-[#6d9b7d]">SCANNER QR</TabsTrigger>
            <TabsTrigger value="timeline" className="text-xs font-bold uppercase tracking-wider data-[state=active]:bg-[#6d9b7d]/10 data-[state=active]:text-[#6d9b7d]">TIMELINE PARCELA</TabsTrigger>
          </TabsList>

          {/* ── TAB: PALOTS ── */}
          <TabsContent value="palots" className="flex-1 overflow-y-auto mt-4 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <SelectWithOther
                options={['todos', ...Object.keys(ESTADOS_PALOT)]}
                value={filtroEstado}
                onChange={setFiltroEstado}
                onCreateNew={() => toast({ title: 'Estado fijo', description: 'Los estados de palot están predefinidos por el flujo de trazabilidad.' })}
                placeholder="Filtrar por estado..."
              />
              <button
                onClick={() => setShowAltaPalot(true)}
                className="px-4 py-2 bg-[#6d9b7d] text-slate-900 font-bold rounded-lg text-xs uppercase flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Alta Palot
              </button>
            </div>

            {loadingPalots && <p className="text-center py-10 text-slate-500 animate-pulse">Cargando palots...</p>}
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {palots.map((p: PalotRow) => (
                <div key={p.id} className="bg-slate-900/60 border border-white/5 p-4 rounded-xl relative overflow-hidden group hover:border-[#6d9b7d]/30 transition-colors">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Nº palot</p>
                      <p className="text-xs font-mono text-slate-300">{p.numero_palot.split('-')[0]}</p>
                    </div>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${ESTADOS_PALOT[p.estado as keyof typeof ESTADOS_PALOT]}`}>
                      {p.estado?.replace('_', ' ')}
                    </span>
                  </div>
                  
                  <div className="space-y-1.5 mb-4">
                    <p className="text-sm font-black text-white">{p.cultivo ?? 'Sin cultivo'} <span className="text-slate-500 font-normal">| Lote {p.lote ?? '-'}</span></p>
                    <p className="text-xs text-slate-400 flex items-center gap-1.5"><MapPin className="w-3 h-3" /> Sector {p.parcels?.parcel_number ?? p.parcel_id ?? 'N/A'}</p>
                    <p className="text-xs text-slate-400 flex items-center gap-1.5"><Box className="w-3 h-3" /> {p.peso_kg ? `${p.peso_kg} Kg` : 'Peso sin registrar'}</p>
                  </div>

                  <button onClick={() => setShowMovimiento(p.id)} className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-[#6d9b7d] rounded-lg transition-colors border border-white/5">
                    Registrar Movimiento
                  </button>
                  <div className="mt-2 pt-2 border-t border-white/5">
                    <RecordActions
                      onEdit={() => {
                        setEditPalot(p)
                        setEditPeso(p.peso_kg != null ? String(p.peso_kg) : '')
                        setEditCultivo(p.cultivo ?? '')
                        setEditLote(p.lote ?? '')
                      }}
                      onDelete={() => mutDeletePalot.mutate(p.id)}
                      confirmMessage="¿Eliminar este palot? Esta acción no puede deshacerse."
                    />
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* ── TAB: CÁMARAS ── */}
          <TabsContent value="camaras" className="flex-1 overflow-y-auto mt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {camaras.map(c => (
                <div key={c.id} className="bg-slate-900 border border-white/10 rounded-xl p-5 relative overflow-hidden">
                  <Thermometer className="absolute top-4 right-4 w-12 h-12 text-slate-800" />
                  <h3 className="text-lg font-black text-white mb-1">{c.nombre}</h3>
                  <p className="text-xs text-slate-400 mb-4">Objetivo: <span className="text-primary font-bold">{c.temperatura_objetivo ?? '-'}°C</span></p>
                  <div className="bg-slate-800 rounded-lg p-3">
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Capacidad Máxima</p>
                    <p className="text-xl font-black text-white">{c.capacidad_palots ?? 'N/D'} <span className="text-xs text-slate-400 font-normal">palots</span></p>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* ── TAB: SCANNER ── */}
          <TabsContent value="scanner" className="flex-1 overflow-y-auto mt-4">
            <div className="max-w-md mx-auto space-y-6">
              <div className="p-6 bg-slate-900/80 rounded-2xl border border-[#6d9b7d]/20 flex flex-col items-center justify-center text-center shadow-[0_0_30px_rgba(109,155,125,0.12)]">
                <div className="w-16 h-16 bg-[#6d9b7d]/20 rounded-full flex items-center justify-center mb-4">
                  <QrCode className="w-8 h-8 text-[#6d9b7d]" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Escáner de Palot</h3>
                <p className="text-xs text-slate-400 mb-6">Introduce el código QR exacto del palot para consultar su trazabilidad completa.</p>
                
                <div className="relative w-full">
                  <input 
                    type="text" 
                    placeholder="Escanear o teclear QR..." 
                    value={scanInput}
                    onChange={e => setScanInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') setSearchedQR(scanInput) }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white text-sm focus:outline-none focus:border-[#6d9b7d] transition-colors font-mono"
                  />
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                </div>
                <button onClick={() => setSearchedQR(scanInput)} className="w-full mt-3 py-3 bg-[#6d9b7d] text-slate-900 font-bold rounded-xl text-xs uppercase tracking-widest hover:bg-[#6d9b7d]/90">
                  Consultar Palot
                </button>
              </div>

              {loadingScan && <p className="text-center text-slate-500 animate-pulse">Buscando en base de datos...</p>}
              
              {palotEscaneado && (
                <div className="bg-slate-900 border border-white/10 rounded-2xl p-5 shadow-xl">
                  <div className="flex justify-between items-center border-b border-white/5 pb-4 mb-4">
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">FICHA DE PALOT</p>
                      <p className="text-sm font-mono text-[#6d9b7d]">{palotEscaneado.numero_palot}</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md border uppercase tracking-wider ${ESTADOS_PALOT[palotEscaneado.estado as keyof typeof ESTADOS_PALOT]}`}>
                      {palotEscaneado.estado?.replace('_', ' ')}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div><p className="text-[10px] text-slate-500 uppercase">Cultivo</p><p className="text-sm font-bold">{palotEscaneado.cultivo || '-'}</p></div>
                    <div><p className="text-[10px] text-slate-500 uppercase">Lote</p><p className="text-sm font-bold">{palotEscaneado.lote || '-'}</p></div>
                    <div><p className="text-[10px] text-slate-500 uppercase">Peso</p><p className="text-sm font-bold">{palotEscaneado.peso_kg ? `${palotEscaneado.peso_kg} Kg` : '-'}</p></div>
                    <div><p className="text-[10px] text-slate-500 uppercase">Sector</p><p className="text-sm font-bold">{(palotEscaneado as unknown as PalotRow).parcels?.parcel_number || palotEscaneado.parcel_id || '-'}</p></div>
                  </div>

                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-white/5 pb-2 mb-3">Historial de Movimientos</h4>
                  <div className="space-y-3 relative before:absolute before:inset-0 before:ml-[11px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-700 before:to-transparent">
                    {palotMovimientos?.map((m, i) => (
                      <div key={m.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full border border-slate-700 bg-slate-900 text-slate-500 group-[.is-active]:text-emerald-500 group-[.is-active]:bg-emerald-500/10 group-[.is-active]:border-emerald-500/30 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                          <div className="w-2 h-2 rounded-full bg-current"></div>
                        </div>
                        <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-1.5rem)] bg-slate-800/50 p-3 rounded-xl border border-white/5">
                          <p className="text-xs font-bold text-[#6d9b7d] mb-1">{TIPOS_MOVIMIENTO.find(t => t.value === m.tipo)?.label || m.tipo}</p>
                          <p className="text-[10px] text-slate-400">{new Date(m.timestamp).toLocaleString('es-ES')}</p>
                          {m.operador && <p className="text-[10px] text-slate-500 mt-1">Operador: {m.operador}</p>}
                        </div>
                      </div>
                    ))}
                    {!palotMovimientos?.length && <p className="text-xs text-slate-500 text-center italic py-2">No hay movimientos registrados</p>}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* ── TAB: TIMELINE PARCELA ── */}
          <TabsContent value="timeline" className="flex-1 overflow-y-auto mt-4 space-y-6 pb-20">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 bg-slate-900/60 p-4 border border-white/5 rounded-xl">
              <div className="flex-1">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1.5">Finca</p>
                <select value={timelineFinca} onChange={e => { setTimelineFinca(e.target.value); setTimelineParcela(''); }} className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#6d9b7d]">
                  <option value="">-- Seleccionar --</option>
                  {FINCAS_NOMBRES.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div className="flex-1">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1.5">Parcela / Sector</p>
                <select disabled={!timelineFinca} value={timelineParcela} onChange={e => setTimelineParcela(e.target.value)} className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#6d9b7d] disabled:opacity-50">
                  <option value="">-- Seleccionar --</option>
                  {parcelasTimeline.map(p => <option key={p.parcel_id} value={p.parcel_id}>{p.parcel_number}</option>)}
                </select>
              </div>
            </div>

            {timelineParcela && !loadingTimeline && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-black text-white uppercase tracking-wider">Trazabilidad del Sector</h3>
                    {renderMissing()}
                  </div>
                  <button onClick={generarPDFTimeline} disabled={generandoPDF || !timelineData?.length} className="shrink-0 flex items-center gap-2 px-4 py-2.5 bg-[#6d9b7d] hover:bg-[#528163] text-slate-900 font-black rounded-lg text-xs uppercase tracking-widest transition-colors disabled:opacity-50 shadow-[0_0_15px_rgba(109,155,125,0.25)]">
                    {generandoPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                    Descargar PDF
                  </button>
                </div>

                <div className="relative border-l-2 border-slate-800 ml-4 space-y-6 pb-4">
                  {timelineData?.map((ev, idx) => (
                    <div key={ev.id + ev.type + idx} className="relative pl-6">
                      <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-slate-900 border-2 border-slate-700 flex items-center justify-center">
                         <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                      </div>
                      <div className="bg-slate-900/60 border border-white/5 rounded-xl p-4 hover:border-slate-700 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            {getIcon(ev.type)}
                            <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">{ev.type}</span>
                          </div>
                          <span className="text-[10px] text-[#6d9b7d] font-mono bg-[#6d9b7d]/10 border border-[#6d9b7d]/20 px-2 py-1 rounded">
                            {ev.date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                        <p className="text-sm text-slate-400">
                          {renderEventInfo(ev)}
                        </p>
                      </div>
                    </div>
                  ))}
                  {(!timelineData || timelineData.length === 0) && (
                    <p className="pl-6 text-slate-500 italic text-sm">No hay eventos registrados para esta parcela.</p>
                  )}
                </div>
              </div>
            )}
            {loadingTimeline && <p className="text-center py-10 text-slate-500 animate-pulse">Cargando línea de tiempo...</p>}
          </TabsContent>
        </Tabs>

      {/* ── MODAL ALTA PALOT ── */}
      {showAltaPalot && (
        <div className="fixed inset-0 z-[2000] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-black text-white">Alta de Palot</h3>
              <button onClick={() => setShowAltaPalot(false)}><X className="w-5 h-5 text-slate-500 hover:text-white" /></button>
            </div>
            <form onSubmit={handleAltaPalot} className="space-y-4">
              <SelectWithOther 
                label="Parcela / Sector" 
                options={parcelas.map(p => p.parcel_id)} 
                value={altaParcela} 
                onChange={setAltaParcela} 
                onCreateNew={setAltaParcela} 
                placeholder="Seleccionar..." 
              />
              <div><p className="text-[10px] text-slate-500 mb-1 uppercase font-bold">Cultivo</p><input type="text" value={altaCultivo} onChange={e => setAltaCultivo(e.target.value)} className="w-full bg-slate-800 rounded-lg border border-slate-700 px-3 py-2 text-sm text-white" /></div>
              <div><p className="text-[10px] text-slate-500 mb-1 uppercase font-bold">Lote</p><input type="text" value={altaLote} onChange={e => setAltaLote(e.target.value)} className="w-full bg-slate-800 rounded-lg border border-slate-700 px-3 py-2 text-sm text-white" /></div>
              <div><p className="text-[10px] text-slate-500 mb-1 uppercase font-bold">Peso Neto (Kg)</p><input type="number" step="0.1" value={altaPeso} onChange={e => setAltaPeso(e.target.value)} className="w-full bg-slate-800 rounded-lg border border-slate-700 px-3 py-2 text-sm text-white" /></div>
              <button type="submit" className="w-full py-3 bg-[#6d9b7d] text-slate-900 font-bold rounded-xl mt-4 uppercase tracking-widest text-xs hover:bg-[#6d9b7d]/90 transition-colors">Generar Palot</button>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL REGISTRO MOVIMIENTO ── */}
      {showMovimiento && (
        <div className="fixed inset-0 z-[2000] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-black text-white">Registrar Movimiento</h3>
              <button onClick={() => setShowMovimiento(null)}><X className="w-5 h-5 text-slate-500 hover:text-white" /></button>
            </div>
            <form onSubmit={handleMovimiento} className="space-y-4">
              <div><p className="text-[10px] text-slate-500 mb-1 uppercase font-bold">Tipo de Movimiento *</p>
                <select required value={movTipo} onChange={e => setMovTipo(e.target.value)} className="w-full bg-slate-800 rounded-lg border border-slate-700 px-3 py-2 text-sm text-white">
                  <option value="">-- Seleccionar --</option>
                  {TIPOS_MOVIMIENTO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div><p className="text-[10px] text-slate-500 mb-1 uppercase font-bold">Operador</p><input type="text" value={movOperador} onChange={e => setMovOperador(e.target.value)} className="w-full bg-slate-800 rounded-lg border border-slate-700 px-3 py-2 text-sm text-white" /></div>
              <div><p className="text-[10px] text-slate-500 mb-1 uppercase font-bold">Notas</p><textarea rows={3} value={movNotas} onChange={e => setMovNotas(e.target.value)} className="w-full bg-slate-800 rounded-lg border border-slate-700 px-3 py-2 text-sm text-white resize-none" /></div>
              <button type="submit" className="w-full py-3 bg-[#6d9b7d] text-slate-900 font-bold rounded-xl mt-4 uppercase tracking-widest text-xs hover:bg-[#6d9b7d]/90 transition-colors">Guardar Movimiento</button>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL EDITAR PALOT ── */}
      {editPalot && (
        <div className="fixed inset-0 z-[2000] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-black text-white">Editar Palot</h3>
              <button onClick={() => setEditPalot(null)}><X className="w-5 h-5 text-slate-500 hover:text-white" /></button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault()
                await mutUpdatePalot.mutateAsync({
                  id: editPalot.id,
                  peso_kg: editPeso ? parseFloat(editPeso) : null,
                  cultivo: editCultivo || null,
                  lote: editLote || null,
                })
                setEditPalot(null)
              }}
              className="space-y-4"
            >
              <div>
                <p className="text-[10px] text-slate-500 mb-1 uppercase font-bold">Cultivo</p>
                <input type="text" value={editCultivo} onChange={e => setEditCultivo(e.target.value)} className="w-full bg-slate-800 rounded-lg border border-slate-700 px-3 py-2 text-sm text-white" />
              </div>
              <div>
                <p className="text-[10px] text-slate-500 mb-1 uppercase font-bold">Lote</p>
                <input type="text" value={editLote} onChange={e => setEditLote(e.target.value)} className="w-full bg-slate-800 rounded-lg border border-slate-700 px-3 py-2 text-sm text-white" />
              </div>
              <div>
                <p className="text-[10px] text-slate-500 mb-1 uppercase font-bold">Peso Neto (Kg)</p>
                <input type="number" step="0.1" value={editPeso} onChange={e => setEditPeso(e.target.value)} className="w-full bg-slate-800 rounded-lg border border-slate-700 px-3 py-2 text-sm text-white" />
              </div>
              <button type="submit" className="w-full py-3 bg-[#6d9b7d] text-slate-900 font-bold rounded-xl mt-4 uppercase tracking-widest text-xs hover:bg-[#6d9b7d]/90 transition-colors">Guardar Cambios</button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}