import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft, FileText, Download, Loader2,
  Tractor, Truck, Wrench, User, Leaf, ClipboardList, Check,
} from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { initPdf, PDF_COLORS } from '@/utils/pdfUtils'
import { formatFechaLarga } from '@/utils/dateFormat'

// ── Módulos seleccionables ────────────────────────────────────────────────────

interface ModuloExport {
  id:     string
  label:  string
  icon:   React.ElementType
  color:  [number, number, number]
}

const MODULOS: ModuloExport[] = [
  { id: 'parte_diario', label: 'Parte Diario',  icon: ClipboardList, color: PDF_COLORS.green   },
  { id: 'trabajos',     label: 'Trabajos',       icon: Wrench,        color: PDF_COLORS.amber   },
  { id: 'maquinaria',   label: 'Maquinaria',     icon: Tractor,       color: PDF_COLORS.orange  },
  { id: 'logistica',    label: 'Logística',       icon: Truck,         color: PDF_COLORS.violet  },
  { id: 'personal',     label: 'Personal',        icon: User,          color: PDF_COLORS.fuchsia },
  { id: 'campo',        label: 'Campo / Parcelas',icon: Leaf,          color: PDF_COLORS.green   },
]

// ── Carga de datos por módulo ─────────────────────────────────────────────────

async function cargarDatosPartes(desde: string, hasta: string) {
  const { data: partes } = await supabase
    .from('partes_diarios')
    .select('id, fecha, responsable, notas_generales')
    .gte('fecha', desde)
    .lte('fecha', hasta)
    .order('fecha')
  if (!partes?.length) return []

  const ids = partes.map(p => p.id)
  const [estRes, trabRes, persRes, resRes] = await Promise.all([
    supabase.from('parte_estado_finca').select('*').in('parte_id', ids).order('created_at'),
    supabase.from('parte_trabajo').select('*').in('parte_id', ids).order('hora_inicio'),
    supabase.from('parte_personal').select('*').in('parte_id', ids).order('fecha_hora'),
    supabase.from('parte_residuos_vegetales').select('*').in('parte_id', ids).order('hora_salida_nave'),
  ])

  return partes.map(p => ({
    parte: p,
    estados:   (estRes.data  ?? []).filter(e => e.parte_id === p.id),
    trabajos:  (trabRes.data ?? []).filter(t => t.parte_id === p.id),
    personales:(persRes.data ?? []).filter(x => x.parte_id === p.id),
    residuos:  (resRes.data  ?? []).filter(r => r.parte_id === p.id),
  }))
}

async function cargarTrabajos(desde: string, hasta: string) {
  const [regRes, incRes] = await Promise.all([
    supabase.from('trabajos_registro').select('*').gte('fecha', desde).lte('fecha', hasta).order('fecha').limit(500),
    supabase.from('trabajos_incidencias').select('*').gte('fecha', desde).lte('fecha', hasta).order('fecha').limit(200),
  ])
  return { registros: regRes.data ?? [], incidencias: incRes.data ?? [] }
}

async function cargarMaquinaria(desde: string, hasta: string) {
  const [usoRes, mantRes] = await Promise.all([
    supabase.from('maquinaria_uso').select('*, maquinaria_tractores(matricula, marca)').gte('fecha', desde).lte('fecha', hasta).order('fecha').limit(300),
    supabase.from('maquinaria_mantenimiento').select('*, maquinaria_tractores(matricula)').gte('fecha', desde).lte('fecha', hasta).order('fecha').limit(200),
  ])
  return { usos: usoRes.data ?? [], mantenimientos: mantRes.data ?? [] }
}

async function cargarLogistica(desde: string, hasta: string) {
  const [viajesRes, mantRes] = await Promise.all([
    supabase.from('logistica_viajes').select('*').gte('hora_salida', desde).lte('hora_salida', hasta + 'T23:59:59').order('hora_salida').limit(300),
    supabase.from('logistica_mantenimiento').select('*, camiones(matricula)').gte('fecha', desde).lte('fecha', hasta).order('fecha').limit(100),
  ])
  return { viajes: viajesRes.data ?? [], mantenimientos: mantRes.data ?? [] }
}

// ── Generador PDF ─────────────────────────────────────────────────────────────

async function generarPDFGlobal(
  desde: string,
  hasta: string,
  modulosSeleccionados: Set<string>
) {
  const { doc, ctx } = await initPdf(PDF_COLORS.accent)

  const rangoLabel = `${new Date(desde).toLocaleDateString('es-ES')} — ${new Date(hasta).toLocaleDateString('es-ES')}`

  // Portada
  ctx.addPageHeader('INFORME GLOBAL', rangoLabel)
  ctx.writeLabel(`Módulos incluidos: ${[...modulosSeleccionados].map(id => MODULOS.find(m => m.id === id)?.label ?? id).join(', ')}`, 8)
  ctx.writeLabel(`Generado: ${new Date().toLocaleString('es-ES')}`, 8)
  ctx.separator()

  // ── PARTE DIARIO ──
  if (modulosSeleccionados.has('parte_diario')) {
    const partesDatos = await cargarDatosPartes(desde, hasta)
    if (partesDatos.length > 0) {
      ctx.checkPage(12)
      ctx.writeLabel('PARTE DIARIO', 11)
      ctx.separator()

      for (const { parte, estados, trabajos, personales, residuos } of partesDatos) {
        ctx.checkPage(14)
        ctx.entryHeader('FECHA', formatFechaLarga(parte.fecha), '')
        const total = estados.length + trabajos.length + personales.length + residuos.length
        ctx.writeLine('Entradas', String(total))
        if (parte.notas_generales) ctx.writeLine('Notas', parte.notas_generales)

        for (const e of estados) {
          ctx.checkPage(10)
          ctx.writeLine('A · Estado', `${e.finca}${e.parcel_id ? ` · ${e.parcel_id}` : ''} — ${e.estado ?? ''}`)
          if (e.num_operarios) ctx.writeLine('Operarios', String(e.num_operarios))
        }
        for (const t of trabajos) {
          ctx.checkPage(10)
          ctx.writeLine('B · Trabajo', `${t.tipo_trabajo ?? ''} — ${t.finca ?? ''}`)
          if (t.num_operarios) ctx.writeLine('Operarios', String(t.num_operarios))
        }
        for (const p of personales) {
          ctx.checkPage(8)
          ctx.writeLine('C · Personal', p.texto ?? '')
        }
        for (const r of residuos) {
          ctx.checkPage(8)
          ctx.writeLine('D · Residuos', `${r.nombre_conductor ?? ''} → ${r.nombre_ganadero ?? ''}`)
        }
        ctx.separator()
      }
    }
  }

  // ── TRABAJOS ──
  if (modulosSeleccionados.has('trabajos')) {
    const { registros, incidencias } = await cargarTrabajos(desde, hasta)
    if (registros.length + incidencias.length > 0) {
      ctx.checkPage(12)
      ctx.writeLabel('TRABAJOS', 11)
      ctx.separator()

      ctx.kpiRow([
        { label: 'Registros',   value: registros.length   },
        { label: 'Incidencias', value: incidencias.length },
      ])

      for (const r of registros) {
        ctx.checkPage(10)
        ctx.writeLine(r.fecha, `${r.tipo_trabajo ?? r.tipo_bloque} — ${r.finca ?? ''}`)
        if (r.num_operarios) ctx.writeLine('Operarios', String(r.num_operarios))
      }
      ctx.separator()

      for (const inc of incidencias) {
        ctx.checkPage(10)
        ctx.writeLine(inc.urgente ? '⚠ URGENTE' : 'Incidencia', `${inc.titulo} — ${inc.estado}`)
        if (inc.finca) ctx.writeLine('Finca', inc.finca)
      }
      ctx.separator()
    }
  }

  // ── MAQUINARIA ──
  if (modulosSeleccionados.has('maquinaria')) {
    const { usos, mantenimientos } = await cargarMaquinaria(desde, hasta)
    if (usos.length + mantenimientos.length > 0) {
      ctx.checkPage(12)
      ctx.writeLabel('MAQUINARIA', 11)
      ctx.separator()

      const totalH = usos.reduce((s: number, u: { horas_trabajadas?: number | null }) => s + (u.horas_trabajadas ?? 0), 0)
      const totalL = usos.reduce((s: number, u: { gasolina_litros?: number | null }) => s + (u.gasolina_litros ?? 0), 0)
      ctx.kpiRow([
        { label: 'Usos',        value: usos.length        },
        { label: 'Horas',       value: totalH.toFixed(1)  },
        { label: 'Gasoil (L)',  value: totalL.toFixed(1)  },
        { label: 'Mant.',       value: mantenimientos.length },
      ])

      for (const u of usos) {
        ctx.checkPage(8)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mat = (u as any).maquinaria_tractores?.matricula ?? '—'
        ctx.writeLine(u.fecha, `${u.tipo_trabajo ?? 'Uso'} · ${mat} · ${u.tractorista ?? ''}`)
        if (u.horas_trabajadas) ctx.writeLine('Horas', String(u.horas_trabajadas))
      }
      ctx.separator()
    }
  }

  // ── LOGÍSTICA ──
  if (modulosSeleccionados.has('logistica')) {
    const { viajes, mantenimientos } = await cargarLogistica(desde, hasta)
    if (viajes.length + mantenimientos.length > 0) {
      ctx.checkPage(12)
      ctx.writeLabel('LOGÍSTICA', 11)
      ctx.separator()

      const totalKm = viajes.reduce((s: number, v: { km_recorridos?: number | null }) => s + (v.km_recorridos ?? 0), 0)
      ctx.kpiRow([
        { label: 'Viajes',    value: viajes.length       },
        { label: 'Km total',  value: totalKm.toFixed(0)  },
        { label: 'Mant.',     value: mantenimientos.length },
      ])

      for (const v of viajes) {
        ctx.checkPage(8)
        const fecha = v.hora_salida ? v.hora_salida.slice(0, 10) : '—'
        ctx.writeLine(fecha, `${v.trabajo_realizado ?? 'Viaje'} → ${v.destino ?? ''}`)
        if (v.km_recorridos) ctx.writeLine('Km', String(v.km_recorridos))
      }
      ctx.separator()
    }
  }

  ctx.footer()
  doc.save(`Informe_Global_Marvic_${desde}_${hasta}.pdf`)
}

// ── Componente ────────────────────────────────────────────────────────────────

const HOY   = new Date().toISOString().split('T')[0]
const HACE30 = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]

export default function ExportarPDF() {
  const navigate = useNavigate()

  const [desde,     setDesde]     = useState(HACE30)
  const [hasta,     setHasta]     = useState(HOY)
  const [modulos,   setModulos]   = useState<Set<string>>(new Set(['parte_diario', 'trabajos']))
  const [generando, setGenerando] = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  // Conteo rápido de registros para el rango
  const { data: preview } = useQuery({
    queryKey: ['export_preview', desde, hasta],
    queryFn: async () => {
      const [p, t, m, l] = await Promise.all([
        supabase.from('partes_diarios').select('id', { count: 'exact', head: true }).gte('fecha', desde).lte('fecha', hasta),
        supabase.from('trabajos_registro').select('id', { count: 'exact', head: true }).gte('fecha', desde).lte('fecha', hasta),
        supabase.from('maquinaria_uso').select('id', { count: 'exact', head: true }).gte('fecha', desde).lte('fecha', hasta),
        supabase.from('logistica_viajes').select('id', { count: 'exact', head: true }).gte('hora_salida', desde).lte('hora_salida', hasta + 'T23:59:59'),
      ])
      return {
        parte_diario: p.count ?? 0,
        trabajos:     t.count ?? 0,
        maquinaria:   m.count ?? 0,
        logistica:    l.count ?? 0,
        personal:     0,
        campo:        0,
      }
    },
    staleTime: 30000,
  })

  const toggleModulo = (id: string) => {
    setModulos(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else              next.add(id)
      return next
    })
  }

  const handleGenerar = async () => {
    if (modulos.size === 0) { setError('Selecciona al menos un módulo'); return }
    setError(null)
    setGenerando(true)
    try {
      await generarPDFGlobal(desde, hasta, modulos)
    } catch (e) {
      setError('Error al generar el PDF. Inténtalo de nuevo.')
      console.error(e)
    } finally {
      setGenerando(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col">

      {/* CABECERA */}
      <header className="bg-slate-900/80 border-b border-white/10 pl-14 pr-4 py-2.5 flex items-center gap-3">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-[10px] font-black uppercase tracking-widest">Volver</span>
        </button>
        <div className="w-px h-4 bg-white/10" />
        <FileText className="w-4 h-4 text-[#38bdf8]" />
        <span className="text-[10px] font-black uppercase tracking-widest text-[#38bdf8]">Exportar PDF Global</span>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-5 max-w-2xl w-full mx-auto space-y-5">

        {/* Rango de fechas */}
        <div className="bg-slate-900/60 border border-white/10 rounded-xl p-4 space-y-3">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Rango de fechas</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Desde</label>
              <input type="date" value={desde} onChange={e => setDesde(e.target.value)}
                className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:border-[#38bdf8]/50 outline-none" />
            </div>
            <div>
              <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Hasta</label>
              <input type="date" value={hasta} onChange={e => setHasta(e.target.value)}
                className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:border-[#38bdf8]/50 outline-none" />
            </div>
          </div>
        </div>

        {/* Selección de módulos */}
        <div className="bg-slate-900/60 border border-white/10 rounded-xl p-4 space-y-3">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Módulos a incluir</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {MODULOS.map(m => {
              const seleccionado = modulos.has(m.id)
              const count = preview?.[m.id as keyof typeof preview] ?? null
              return (
                <button
                  key={m.id}
                  onClick={() => toggleModulo(m.id)}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                    seleccionado
                      ? 'border-[#38bdf8]/40 bg-[#38bdf8]/5'
                      : 'border-white/10 bg-slate-900/40 hover:border-white/20'
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg bg-slate-800/80 flex items-center justify-center shrink-0">
                    <m.icon className="w-4 h-4" style={{ color: `rgb(${m.color.join(',')})` }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold text-white">{m.label}</p>
                    {count !== null && (
                      <p className="text-[9px] text-slate-500">{count} registros en el período</p>
                    )}
                  </div>
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                    seleccionado
                      ? 'border-[#38bdf8] bg-[#38bdf8]'
                      : 'border-slate-600'
                  }`}>
                    {seleccionado && <Check className="w-3 h-3 text-[#020617]" />}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Info */}
        <div className="bg-slate-800/40 border border-white/5 rounded-xl p-4">
          <p className="text-[10px] text-slate-500">
            El PDF incluirá todos los registros de los módulos seleccionados en el rango de fechas indicado,
            ordenados cronológicamente. Fotos no incluidas para reducir el tamaño del archivo.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Botón generar */}
        <button
          onClick={handleGenerar}
          disabled={generando || modulos.size === 0}
          className="w-full py-3.5 rounded-xl bg-[#38bdf8] text-[#020617] font-black text-sm uppercase tracking-widest hover:bg-sky-300 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {generando
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Generando PDF…</>
            : <><Download className="w-4 h-4" /> Descargar PDF Global</>
          }
        </button>

      </main>

      <footer className="bg-slate-900/80 border-t border-white/10 px-4 py-1.5">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
          Marvic 360 · Exportar PDF · {modulos.size} módulo{modulos.size !== 1 ? 's' : ''} seleccionado{modulos.size !== 1 ? 's' : ''}
        </span>
      </footer>
    </div>
  )
}
