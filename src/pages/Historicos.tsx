import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft, Search, History, Tractor, Truck,
  Wrench, User, Leaf, FileText, MapPin, Clock,
  X, ChevronDown,
} from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { FINCAS_NOMBRES as FINCAS } from '@/constants/farms'

// ── Tipos ─────────────────────────────────────────────────────────────────────

type ModuloFiltro = 'todos' | 'campo' | 'trabajos' | 'maquinaria' | 'logistica' | 'parte'

interface EntradaHistorico {
  id:       string
  modulo:   ModuloFiltro
  fecha:    string          // YYYY-MM-DD
  hora?:    string          // HH:MM opcional
  tipo:     string          // etiqueta del tipo de registro
  titulo:   string
  subtitulo?: string
  finca?:   string
  url:      string
}

// ── Hook buscador global ──────────────────────────────────────────────────────

function useHistoricos(fechaDesde: string, fechaHasta: string) {
  return useQuery<EntradaHistorico[]>({
    queryKey: ['historicos', fechaDesde, fechaHasta],
    queryFn: async () => {
      const entradas: EntradaHistorico[] = []

      const [trabajosRes, usoRes, viajesRes, partesRes, estadosRes, parteTrabRes] = await Promise.all([
        supabase
          .from('trabajos_registro')
          .select('id, fecha, tipo_bloque, tipo_trabajo, finca, parcel_id, num_operarios, nombres_operarios')
          .gte('fecha', fechaDesde)
          .lte('fecha', fechaHasta)
          .order('fecha', { ascending: false })
          .limit(200),
        supabase
          .from('maquinaria_uso')
          .select('id, fecha, hora_inicio, tipo_trabajo, finca, tractorista, horas_trabajadas, tractor_id')
          .gte('fecha', fechaDesde)
          .lte('fecha', fechaHasta)
          .order('fecha', { ascending: false })
          .limit(200),
        supabase
          .from('logistica_viajes')
          .select('id, hora_salida, trabajo_realizado, finca, destino, km_recorridos')
          .gte('hora_salida', fechaDesde)
          .lte('hora_salida', fechaHasta + 'T23:59:59')
          .order('hora_salida', { ascending: false })
          .limit(200),
        supabase
          .from('partes_diarios')
          .select('id, fecha, responsable, notas_generales')
          .gte('fecha', fechaDesde)
          .lte('fecha', fechaHasta)
          .order('fecha', { ascending: false })
          .limit(200),
        supabase
          .from('parte_estado_finca')
          .select('id, parte_id, finca, parcel_id, estado, num_operarios, created_at')
          .gte('created_at', fechaDesde)
          .lte('created_at', fechaHasta + 'T23:59:59')
          .order('created_at', { ascending: false })
          .limit(200),
        supabase
          .from('parte_trabajo')
          .select('id, parte_id, tipo_trabajo, finca, ambito, num_operarios, hora_inicio, created_at')
          .gte('created_at', fechaDesde)
          .lte('created_at', fechaHasta + 'T23:59:59')
          .order('created_at', { ascending: false })
          .limit(200),
      ])

      // Trabajos registro
      for (const r of trabajosRes.data ?? []) {
        const TIPO_LABEL: Record<string, string> = {
          logistica: 'Logística', maquinaria_agricola: 'Maquinaria',
          mano_obra_interna: 'M.O. Interna', mano_obra_externa: 'M.O. Externa',
        }
        entradas.push({
          id:        `trab-${r.id}`,
          modulo:    'trabajos',
          fecha:     r.fecha,
          tipo:      TIPO_LABEL[r.tipo_bloque] ?? r.tipo_bloque,
          titulo:    r.tipo_trabajo ?? 'Trabajo',
          subtitulo: [r.num_operarios ? `${r.num_operarios} op.` : null, r.nombres_operarios].filter(Boolean).join(' · ') || undefined,
          finca:     r.finca ?? undefined,
          url:       '/trabajos',
        })
      }

      // Maquinaria uso
      for (const u of usoRes.data ?? []) {
        entradas.push({
          id:        `maq-${u.id}`,
          modulo:    'maquinaria',
          fecha:     u.fecha,
          hora:      u.hora_inicio ? u.hora_inicio.slice(11, 16) : undefined,
          tipo:      'Uso maquinaria',
          titulo:    u.tipo_trabajo ?? 'Uso',
          subtitulo: [u.tractorista, u.horas_trabajadas ? `${u.horas_trabajadas}h` : null].filter(Boolean).join(' · ') || undefined,
          finca:     u.finca ?? undefined,
          url:       '/maquinaria',
        })
      }

      // Viajes logística
      for (const v of viajesRes.data ?? []) {
        const fecha = v.hora_salida ? v.hora_salida.slice(0, 10) : ''
        const hora  = v.hora_salida ? v.hora_salida.slice(11, 16) : undefined
        entradas.push({
          id:        `log-${v.id}`,
          modulo:    'logistica',
          fecha,
          hora,
          tipo:      'Viaje',
          titulo:    v.trabajo_realizado ?? 'Viaje logística',
          subtitulo: [v.finca, v.destino, v.km_recorridos ? `${v.km_recorridos} km` : null].filter(Boolean).join(' · ') || undefined,
          finca:     v.finca ?? undefined,
          url:       '/logistica',
        })
      }

      // Partes diarios
      for (const p of partesRes.data ?? []) {
        entradas.push({
          id:       `parte-${p.id}`,
          modulo:   'parte',
          fecha:    p.fecha,
          tipo:     'Parte diario',
          titulo:   `Parte ${p.fecha}`,
          subtitulo: p.notas_generales ?? undefined,
          url:      '/parte-diario',
        })
      }

      // Parte estado finca
      for (const e of estadosRes.data ?? []) {
        entradas.push({
          id:        `pef-${e.id}`,
          modulo:    'campo',
          fecha:     e.created_at.slice(0, 10),
          hora:      e.created_at.slice(11, 16),
          tipo:      'Estado parcela',
          titulo:    `${e.finca}${e.parcel_id ? ` · ${e.parcel_id}` : ''}`,
          subtitulo: [e.estado, e.num_operarios ? `${e.num_operarios} op.` : null].filter(Boolean).join(' · ') || undefined,
          finca:     e.finca ?? undefined,
          url:       '/parte-diario',
        })
      }

      // Parte trabajo
      for (const t of parteTrabRes.data ?? []) {
        entradas.push({
          id:        `ptrab-${t.id}`,
          modulo:    'campo',
          fecha:     t.created_at.slice(0, 10),
          hora:      t.hora_inicio ? t.hora_inicio.slice(11, 16) : t.created_at.slice(11, 16),
          tipo:      'Trabajo (parte)',
          titulo:    t.tipo_trabajo ?? 'Trabajo',
          subtitulo: [t.finca, t.num_operarios ? `${t.num_operarios} op.` : null].filter(Boolean).join(' · ') || undefined,
          finca:     t.finca ?? undefined,
          url:       '/parte-diario',
        })
      }

      // Ordenar por fecha descendente
      entradas.sort((a, b) => {
        const fa = a.fecha + (a.hora ?? '')
        const fb = b.fecha + (b.hora ?? '')
        return fb.localeCompare(fa)
      })

      return entradas
    },
    staleTime: 30000,
  })
}

// ── Configuración de módulos ──────────────────────────────────────────────────

const MODULO_CONFIG: Record<ModuloFiltro, { label: string; color: string; icon: React.ElementType }> = {
  todos:     { label: 'Todos',      color: '#38bdf8',  icon: History   },
  campo:     { label: 'Campo',      color: '#4ade80',  icon: Leaf      },
  trabajos:  { label: 'Trabajos',   color: '#f59e0b',  icon: Wrench    },
  maquinaria:{ label: 'Maquinaria', color: '#fb923c',  icon: Tractor   },
  logistica: { label: 'Logística',  color: '#a78bfa',  icon: Truck     },
  parte:     { label: 'Parte Diario',color: '#4ade80', icon: FileText  },
}

// ── Componente ────────────────────────────────────────────────────────────────

const HOY   = new Date().toISOString().split('T')[0]
const HACE30 = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]

export default function Historicos() {
  const navigate = useNavigate()

  const [desde,    setDesde]   = useState(HACE30)
  const [hasta,    setHasta]   = useState(HOY)
  const [modulo,   setModulo]  = useState<ModuloFiltro>('todos')
  const [finca,    setFinca]   = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [showFiltros, setShowFiltros] = useState(false)

  const { data: entradas = [], isLoading } = useHistoricos(desde, hasta)

  const filtradas = useMemo(() => {
    let res = entradas
    if (modulo !== 'todos') res = res.filter(e => e.modulo === modulo)
    if (finca)              res = res.filter(e => e.finca === finca)
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase()
      res = res.filter(e =>
        e.titulo.toLowerCase().includes(q) ||
        (e.subtitulo ?? '').toLowerCase().includes(q) ||
        e.tipo.toLowerCase().includes(q) ||
        (e.finca ?? '').toLowerCase().includes(q)
      )
    }
    return res
  }, [entradas, modulo, finca, busqueda])

  return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col">

      {/* CABECERA */}
      <header className="bg-slate-900/80 border-b border-white/10 pl-14 pr-4 py-2.5 flex items-center gap-3 flex-wrap">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-[10px] font-black uppercase tracking-widest">Volver</span>
        </button>
        <div className="w-px h-4 bg-white/10" />
        <History className="w-4 h-4 text-[#38bdf8]" />
        <span className="text-[10px] font-black uppercase tracking-widest text-[#38bdf8]">Históricos</span>

        <button
          onClick={() => setShowFiltros(f => !f)}
          className="ml-auto flex items-center gap-1 text-[9px] font-black text-slate-400 hover:text-white uppercase tracking-widest transition-colors"
        >
          Filtros <ChevronDown className={`w-3 h-3 transition-transform ${showFiltros ? 'rotate-180' : ''}`} />
        </button>
      </header>

      {/* FILTROS */}
      <div className={`bg-slate-900/60 border-b border-white/10 overflow-hidden transition-all ${showFiltros ? 'max-h-[300px]' : 'max-h-0'}`}>
        <div className="px-4 py-4 space-y-3 max-w-3xl mx-auto">
          {/* Rango de fechas */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Desde</label>
              <input type="date" value={desde} onChange={e => setDesde(e.target.value)}
                className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-[#38bdf8]/50 outline-none" />
            </div>
            <div>
              <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Hasta</label>
              <input type="date" value={hasta} onChange={e => setHasta(e.target.value)}
                className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-[#38bdf8]/50 outline-none" />
            </div>
          </div>

          {/* Módulo */}
          <div className="flex gap-1.5 flex-wrap">
            {(Object.entries(MODULO_CONFIG) as [ModuloFiltro, typeof MODULO_CONFIG['todos']][]).map(([key, cfg]) => (
              <button
                key={key}
                onClick={() => setModulo(key)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[9px] font-black uppercase tracking-widest transition-colors ${
                  modulo === key
                    ? 'border-[#38bdf8]/50 bg-[#38bdf8]/10 text-[#38bdf8]'
                    : 'border-white/10 text-slate-500 hover:border-white/20 hover:text-slate-300'
                }`}
              >
                <cfg.icon className="w-2.5 h-2.5" style={modulo === key ? { color: cfg.color } : {}} />
                {cfg.label}
              </button>
            ))}
          </div>

          {/* Finca */}
          <select value={finca} onChange={e => setFinca(e.target.value)}
            className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-[#38bdf8]/50 outline-none">
            <option value="">— Todas las fincas —</option>
            {FINCAS.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
      </div>

      {/* BUSCADOR */}
      <div className="bg-slate-900/40 border-b border-white/10 px-4 py-3">
        <div className="relative max-w-3xl mx-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
          <input
            type="search"
            placeholder="Buscar por tipo, finca, operario..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="w-full bg-slate-800 border border-white/10 rounded-lg pl-9 pr-9 py-2 text-sm text-white placeholder-slate-600 focus:border-[#38bdf8]/50 outline-none"
          />
          {busqueda && (
            <button onClick={() => setBusqueda('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* CONTADOR */}
      <div className="px-4 py-2 max-w-3xl w-full mx-auto">
        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
          {isLoading ? 'Cargando…' : `${filtradas.length} registro${filtradas.length !== 1 ? 's' : ''} encontrado${filtradas.length !== 1 ? 's' : ''}`}
        </span>
      </div>

      {/* LISTA */}
      <main className="flex-1 overflow-y-auto px-4 pb-4 max-w-3xl w-full mx-auto">
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <span className="w-5 h-5 border-2 border-white/10 border-t-[#38bdf8] rounded-full animate-spin" />
          </div>
        )}

        {!isLoading && filtradas.length === 0 && (
          <div className="text-center py-16">
            <History className="w-8 h-8 text-slate-700 mx-auto mb-2" />
            <p className="text-xs text-slate-600 uppercase tracking-widest">Sin registros para los filtros seleccionados</p>
          </div>
        )}

        <div className="space-y-2">
          {filtradas.map(entrada => {
            const cfg  = MODULO_CONFIG[entrada.modulo]
            const Icon = cfg.icon
            return (
              <div
                key={entrada.id}
                onClick={() => navigate(entrada.url)}
                className="p-3 rounded-xl border border-white/10 bg-slate-900/50 hover:border-white/20 hover:bg-slate-900/80 transition-all cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-800/80 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4" style={{ color: cfg.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: cfg.color + '20', color: cfg.color }}>
                        {cfg.label}
                      </span>
                      <span className="text-[8px] text-slate-600 uppercase tracking-widest">{entrada.tipo}</span>
                      <span className="ml-auto text-[9px] font-mono text-slate-500 shrink-0">
                        {new Date(entrada.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })}
                        {entrada.hora ? ` ${entrada.hora}` : ''}
                      </span>
                    </div>
                    <p className="text-[12px] font-bold text-white mt-0.5 leading-tight truncate">{entrada.titulo}</p>
                    {entrada.subtitulo && (
                      <p className="text-[10px] text-slate-400 mt-0.5 truncate">{entrada.subtitulo}</p>
                    )}
                    {entrada.finca && (
                      <p className="text-[9px] text-slate-600 mt-0.5 flex items-center gap-0.5">
                        <MapPin className="w-2.5 h-2.5" />{entrada.finca}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </main>

      <footer className="bg-slate-900/80 border-t border-white/10 px-4 py-1.5">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
          Marvic 360 · Históricos · {desde} → {hasta}
        </span>
      </footer>
    </div>
  )
}
