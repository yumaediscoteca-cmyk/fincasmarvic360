import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft, AlertTriangle, CheckCircle2, Clock,
  Tractor, Truck, FileWarning, Leaf, ShieldAlert,
  CalendarClock, Activity,
} from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'

// ── Tipos de alerta ───────────────────────────────────────────────────────────

type Severidad = 'critica' | 'urgente' | 'aviso' | 'ok'

interface Alerta {
  id:        string
  severidad: Severidad
  modulo:    string
  titulo:    string
  detalle:   string
  fecha?:    string
  url?:      string
}

// ── Helpers de fecha ──────────────────────────────────────────────────────────

const HOY = new Date()

function diasHasta(fecha: string | null | undefined): number | null {
  if (!fecha) return null
  const diff = (new Date(fecha).getTime() - HOY.getTime()) / 86400000
  return Math.round(diff)
}

function fmtFecha(fecha: string | null | undefined): string {
  if (!fecha) return '—'
  return new Date(fecha).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

// ── Hook de alertas globales ──────────────────────────────────────────────────

function useAlertas() {
  return useQuery<Alerta[]>({
    queryKey: ['alertas_globales'],
    queryFn: async () => {
      const alertas: Alerta[] = []

      const [tractoresRes, camionesRes, incidenciasRes, certRes, sensoresRes] = await Promise.all([
        supabase.from('maquinaria_tractores').select('id, matricula, marca, modelo, fecha_proxima_itv, fecha_proxima_revision, horas_motor, horas_proximo_mantenimiento').eq('activo', true),
        supabase.from('camiones').select('id, matricula, marca, modelo, fecha_itv, fecha_proxima_itv, fecha_proxima_revision, kilometros_actuales, km_proximo_mantenimiento').eq('activo', true),
        supabase.from('trabajos_incidencias').select('id, titulo, urgente, estado, finca, fecha').in('estado', ['abierta', 'en_proceso']).order('fecha', { ascending: false }),
        supabase.from('certificaciones_parcela').select('id, parcel_id, estado, fecha_fin, entidad_certificadora').in('estado', ['en_tramite', 'vigente']),
        supabase.from('lecturas_sensor_planta').select('parcel_id, created_at').order('created_at', { ascending: false }),
      ])

      // ── Tractores: ITV y revisión ──
      for (const t of tractoresRes.data ?? []) {
        const label = `${t.matricula}${t.marca ? ` · ${t.marca}` : ''}`

        const diasItv = diasHasta(t.fecha_proxima_itv)
        if (diasItv !== null) {
          if (diasItv < 0) {
            alertas.push({ id: `tractor-itv-${t.id}`, severidad: 'critica', modulo: 'MAQUINARIA', titulo: `ITV VENCIDA — ${label}`, detalle: `Vencida hace ${Math.abs(diasItv)} días (${fmtFecha(t.fecha_proxima_itv)})`, url: '/maquinaria' })
          } else if (diasItv <= 30) {
            alertas.push({ id: `tractor-itv-${t.id}`, severidad: 'urgente', modulo: 'MAQUINARIA', titulo: `ITV próxima — ${label}`, detalle: `Vence en ${diasItv} días (${fmtFecha(t.fecha_proxima_itv)})`, url: '/maquinaria' })
          }
        }

        const diasRev = diasHasta(t.fecha_proxima_revision)
        if (diasRev !== null && diasRev <= 14) {
          alertas.push({ id: `tractor-rev-${t.id}`, severidad: diasRev < 0 ? 'critica' : 'urgente', modulo: 'MAQUINARIA', titulo: `Revisión próxima — ${label}`, detalle: diasRev < 0 ? `Revisión atrasada ${Math.abs(diasRev)} días` : `Revisión en ${diasRev} días (${fmtFecha(t.fecha_proxima_revision)})`, url: '/maquinaria' })
        }

        if (t.horas_proximo_mantenimiento != null && t.horas_motor != null && t.horas_motor >= t.horas_proximo_mantenimiento) {
          alertas.push({ id: `tractor-mant-${t.id}`, severidad: 'urgente', modulo: 'MAQUINARIA', titulo: `Mantenimiento necesario — ${label}`, detalle: `${t.horas_motor}h actuales ≥ ${t.horas_proximo_mantenimiento}h programadas`, url: '/maquinaria' })
        }
      }

      // ── Camiones: ITV y km ──
      for (const c of camionesRes.data ?? []) {
        const label = `${c.matricula}${c.marca ? ` · ${c.marca}` : ''}`

        const diasItv = diasHasta(c.fecha_proxima_itv)
        if (diasItv !== null) {
          if (diasItv < 0) {
            alertas.push({ id: `camion-itv-${c.id}`, severidad: 'critica', modulo: 'LOGÍSTICA', titulo: `ITV VENCIDA — ${label}`, detalle: `Vencida hace ${Math.abs(diasItv)} días (${fmtFecha(c.fecha_proxima_itv)})`, url: '/logistica' })
          } else if (diasItv <= 30) {
            alertas.push({ id: `camion-itv-${c.id}`, severidad: 'urgente', modulo: 'LOGÍSTICA', titulo: `ITV próxima — ${label}`, detalle: `Vence en ${diasItv} días (${fmtFecha(c.fecha_proxima_itv)})`, url: '/logistica' })
          }
        }

        if (c.km_proximo_mantenimiento != null && c.kilometros_actuales != null && c.kilometros_actuales >= c.km_proximo_mantenimiento) {
          alertas.push({ id: `camion-km-${c.id}`, severidad: 'urgente', modulo: 'LOGÍSTICA', titulo: `Mantenimiento km — ${label}`, detalle: `${c.kilometros_actuales} km actuales ≥ ${c.km_proximo_mantenimiento} km programados`, url: '/logistica' })
        }
      }

      // ── Incidencias abiertas ──
      for (const inc of (incidenciasRes.data ?? []).slice(0, 20)) {
        alertas.push({
          id:        `inc-${inc.id}`,
          severidad: inc.urgente ? 'critica' : inc.estado === 'abierta' ? 'urgente' : 'aviso',
          modulo:    'TRABAJOS',
          titulo:    inc.titulo,
          detalle:   `${inc.estado === 'en_proceso' ? 'En proceso' : 'Abierta'} · ${inc.finca ?? 'Sin finca'} · ${fmtFecha(inc.fecha)}`,
          url:       '/trabajos',
        })
      }

      // ── Certificaciones próximas a vencer ──
      for (const cert of certRes.data ?? []) {
        const dias = diasHasta(cert.fecha_fin)
        if (dias !== null && dias <= 60) {
          alertas.push({
            id:        `cert-${cert.id}`,
            severidad: dias < 0 ? 'critica' : dias <= 14 ? 'urgente' : 'aviso',
            modulo:    'CAMPO',
            titulo:    `Certificación${dias < 0 ? ' VENCIDA' : ' próxima'} — ${cert.parcel_id}`,
            detalle:   `${cert.entidad_certificadora ?? ''} · Vence ${fmtFecha(cert.fecha_fin)}`,
            url:       `/farm`,
          })
        }
      }

      // ── Sensores sin lectura >7 días ──
      const seenParcels = new Set<string>()
      const hace7 = new Date(HOY.getTime() - 7 * 86400000)
      for (const s of sensoresRes.data ?? []) {
        if (seenParcels.has(s.parcel_id)) continue
        seenParcels.add(s.parcel_id)
        if (new Date(s.created_at) < hace7) {
          const dias = Math.round((HOY.getTime() - new Date(s.created_at).getTime()) / 86400000)
          alertas.push({
            id:        `sensor-${s.parcel_id}`,
            severidad: dias > 21 ? 'urgente' : 'aviso',
            modulo:    'CAMPO',
            titulo:    `Sin lectura sensor — ${s.parcel_id}`,
            detalle:   `Última lectura hace ${dias} días`,
            url:       '/farm',
          })
        }
      }

      // Ordenar: crítica > urgente > aviso > ok
      const orden: Record<Severidad, number> = { critica: 0, urgente: 1, aviso: 2, ok: 3 }
      alertas.sort((a, b) => orden[a.severidad] - orden[b.severidad])

      return alertas
    },
    staleTime: 60000,
  })
}

// ── Componente ────────────────────────────────────────────────────────────────

const SEV_CONFIG: Record<Severidad, { bg: string; border: string; badge: string; icon: React.ElementType; label: string }> = {
  critica: { bg: 'bg-red-500/10',    border: 'border-red-500/30',    badge: 'bg-red-500/20 text-red-400',          icon: ShieldAlert,    label: 'CRÍTICA'  },
  urgente: { bg: 'bg-amber-500/10',  border: 'border-amber-500/30',  badge: 'bg-amber-500/20 text-amber-400',      icon: AlertTriangle,  label: 'URGENTE'  },
  aviso:   { bg: 'bg-sky-500/10',    border: 'border-sky-500/30',    badge: 'bg-sky-500/20 text-sky-400',          icon: CalendarClock,  label: 'AVISO'    },
  ok:      { bg: 'bg-green-500/10',  border: 'border-green-500/30',  badge: 'bg-green-500/20 text-green-400',      icon: CheckCircle2,   label: 'OK'       },
}

const MODULO_ICON: Record<string, React.ElementType> = {
  'MAQUINARIA': Tractor,
  'LOGÍSTICA':  Truck,
  'TRABAJOS':   FileWarning,
  'CAMPO':      Leaf,
}

export default function EstadoGeneral() {
  const navigate = useNavigate()
  const { data: alertas = [], isLoading, refetch } = useAlertas()

  const criticas = alertas.filter(a => a.severidad === 'critica').length
  const urgentes = alertas.filter(a => a.severidad === 'urgente').length
  const avisos   = alertas.filter(a => a.severidad === 'aviso').length

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
        <Activity className="w-4 h-4 text-[#38bdf8]" />
        <span className="text-[10px] font-black uppercase tracking-widest text-[#38bdf8]">Estado General</span>
        <button
          onClick={() => refetch()}
          className="ml-auto text-[9px] font-black text-slate-500 hover:text-white uppercase tracking-widest transition-colors"
        >
          Actualizar
        </button>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-5 max-w-3xl w-full mx-auto space-y-5">

        {/* KPIs resumen */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Críticas',  value: criticas, color: 'text-red-400',   bg: 'bg-red-500/10 border-red-500/20' },
            { label: 'Urgentes',  value: urgentes, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
            { label: 'Avisos',    value: avisos,   color: 'text-sky-400',   bg: 'bg-sky-500/10 border-sky-500/20' },
          ].map(k => (
            <div key={k.label} className={`rounded-xl border p-3 text-center ${k.bg}`}>
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">{k.label}</p>
              <p className={`text-3xl font-black ${k.color}`}>{k.value}</p>
            </div>
          ))}
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <span className="w-5 h-5 border-2 border-white/10 border-t-[#38bdf8] rounded-full animate-spin" />
          </div>
        )}

        {!isLoading && alertas.length === 0 && (
          <div className="text-center py-16">
            <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto mb-3" />
            <p className="text-sm font-black text-green-400 uppercase tracking-widest">Todo en orden</p>
            <p className="text-xs text-slate-500 mt-1">Sin alertas activas</p>
          </div>
        )}

        {/* Lista de alertas agrupadas por módulo */}
        {(['critica', 'urgente', 'aviso'] as Severidad[]).map(sev => {
          const grupo = alertas.filter(a => a.severidad === sev)
          if (grupo.length === 0) return null
          const cfg = SEV_CONFIG[sev]
          return (
            <div key={sev}>
              <div className="flex items-center gap-2 mb-2">
                <cfg.icon className="w-3.5 h-3.5" style={{ color: sev === 'critica' ? '#f87171' : sev === 'urgente' ? '#fbbf24' : '#38bdf8' }} />
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                  {cfg.label} — {grupo.length} alerta{grupo.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="space-y-2">
                {grupo.map(alerta => {
                  const ModIcon = MODULO_ICON[alerta.modulo] ?? AlertTriangle
                  return (
                    <div
                      key={alerta.id}
                      className={`${cfg.bg} ${cfg.border} border rounded-xl p-3 cursor-pointer hover:opacity-90 transition-opacity`}
                      onClick={() => alerta.url && navigate(alerta.url)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-800/60 flex items-center justify-center shrink-0">
                          <ModIcon className="w-4 h-4 text-slate-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${cfg.badge}`}>
                              {alerta.modulo}
                            </span>
                          </div>
                          <p className="text-[12px] font-bold text-white mt-0.5 leading-tight">{alerta.titulo}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{alerta.detalle}</p>
                        </div>
                        {alerta.url && (
                          <span className="text-[9px] text-slate-600 shrink-0 mt-1">→</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}

        {/* Separador + estado de módulos */}
        {!isLoading && (
          <div className="pt-2 border-t border-white/10">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-3">Estado de módulos</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { label: 'MAQUINARIA', url: '/maquinaria', icon: Tractor,     color: '#fb923c' },
                { label: 'LOGÍSTICA',  url: '/logistica',  icon: Truck,       color: '#a78bfa' },
                { label: 'TRABAJOS',   url: '/trabajos',   icon: FileWarning, color: '#f59e0b' },
                { label: 'CAMPO',      url: '/farm',       icon: Leaf,        color: '#4ade80' },
              ].map(m => {
                const count = alertas.filter(a => a.modulo === m.label).length
                return (
                  <button
                    key={m.label}
                    onClick={() => navigate(m.url)}
                    className="p-3 rounded-xl border border-white/10 bg-slate-900/50 hover:border-white/20 transition-colors text-left"
                  >
                    <m.icon className="w-4 h-4 mb-1.5" style={{ color: m.color }} />
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{m.label}</p>
                    {count > 0
                      ? <p className="text-[11px] font-bold text-amber-400 mt-0.5">{count} alerta{count !== 1 ? 's' : ''}</p>
                      : <p className="text-[11px] font-bold text-green-400 mt-0.5">OK</p>
                    }
                  </button>
                )
              })}
            </div>
          </div>
        )}

      </main>

      <footer className="bg-slate-900/80 border-t border-white/10 px-4 py-1.5">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
          Marvic 360 · Estado General · {new Date().toLocaleDateString('es-ES')}
        </span>
      </footer>
    </div>
  )
}
