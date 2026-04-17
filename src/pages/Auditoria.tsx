import React, { useState } from 'react'
import { ShieldCheck, Filter, Loader2, Wrench, Package, Truck, Users, FileText, Trash2 } from 'lucide-react'
import { useAuditTrail, AuditEntry } from '@/hooks/useAuditoria'
import { PDFExportModal, type PDFExportParams } from '@/components/base'
import { generarPDFCorporativoBase, pdfCorporateSection, pdfCorporateTable } from '@/utils/pdfUtils'
import { AUDITORIA_EDITABLE } from '@/constants/modoPiloto'
import { supabase } from '@/integrations/supabase/client'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from '@/hooks/use-toast'

const MODULO_ICON: Record<string, React.ElementType> = {
  'Trabajos': Wrench,
  'Inventario': Package,
  'Logística': Truck,
  'Personal': Users,
}

const MODULO_COLOR: Record<string, string> = {
  'Trabajos': 'text-amber-400',
  'Inventario': 'text-sky-400',
  'Logística': 'text-purple-400',
  'Personal': 'text-pink-400',
}

export default function Auditoria() {
  const [fechaDesde, setFechaDesde] = useState(() => new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10))
  const [fechaHasta, setFechaHasta] = useState(() => new Date().toISOString().slice(0, 10))
  const [modulo, setModulo] = useState('')
  const [usuario, setUsuario] = useState('')
  const [pdfOpen, setPdfOpen] = useState(false)

  const { data: trail = [], isLoading } = useAuditTrail({ fechaDesde, fechaHasta, modulo, usuario })
  const qc = useQueryClient()

  async function handleDeleteEntry(entry: AuditEntry) {
    if (!AUDITORIA_EDITABLE) return
    if (!window.confirm(`¿Eliminar el registro origen de este evento?\n\n${entry.modulo} — ${entry.accion}\n${entry.detalle}`)) return
    const [prefix, id] = entry.id.split(/-(.*)/)
    const tablaPorPrefijo: Record<string, string> = {
      trab: 'trabajos_registro',
      inv: 'inventario_movimientos',
      log: 'logistica_viajes',
      pers: 'personal',
    }
    const tabla = tablaPorPrefijo[prefix]
    if (!tabla || !id) {
      toast({ title: 'Error', description: 'No se puede identificar el registro origen', variant: 'destructive' })
      return
    }
    const { error } = await supabase.from(tabla as 'trabajos_registro').delete().eq('id', id)
    if (error) {
      toast({ title: 'Error al eliminar', description: error.message, variant: 'destructive' })
      return
    }
    qc.invalidateQueries({ queryKey: ['audit_trail'] })
    toast({ title: 'Registro eliminado' })
  }

  const handleExportPDF = async ({ desde, hasta, filtros }: PDFExportParams) => {
    // Filtrar el trail por rango seleccionado en el modal
    const entradas = trail.filter(e => {
      const d = e.timestamp.slice(0, 10)
      return d >= desde && d <= hasta
    })

    await generarPDFCorporativoBase({
      titulo: 'Auditoría del Sistema',
      subtitulo: `Registro de actividad · ${desde} → ${hasta}`,
      fecha: new Date(),
      filename: `auditoria_${desde}_${hasta}.pdf`,
      bloques: [
        (ctx) => {
          pdfCorporateSection(ctx, 'Resumen')
          const porModulo = entradas.reduce((acc, e) => {
            acc[e.modulo] = (acc[e.modulo] || 0) + 1
            return acc
          }, {} as Record<string, number>)
          ctx.writeLine('Total de eventos', String(entradas.length))
          Object.entries(porModulo).forEach(([mod, count]) => {
            ctx.writeLine(`  ${mod}`, String(count))
          })
          ctx.y += 4
        },
        (ctx) => {
          if (entradas.length === 0) return
          pdfCorporateSection(ctx, 'Timeline de Eventos')
          const rows = entradas.map(e => [
            new Date(e.timestamp).toLocaleString('es-ES'),
            e.modulo,
            e.accion,
            filtros.incluir_detalle ? e.detalle : '—',
            e.usuario,
          ])
          pdfCorporateTable(
            ctx,
            ['Fecha/Hora', 'Módulo', 'Acción', 'Detalle', 'Usuario'],
            [32, 22, 30, 60, 40],
            rows,
          )
        },
      ],
    })
  }

  const renderEntry = (entry: AuditEntry) => {
    const Icon = MODULO_ICON[entry.modulo] || ShieldCheck
    const color = MODULO_COLOR[entry.modulo] || 'text-slate-400'
    return (
      <div key={entry.id} className="relative pl-8 before:absolute before:left-3 before:top-3 before:h-full before:w-px before:bg-slate-800">
        <div className="absolute left-0 top-1.5 w-6 h-6 rounded-full bg-slate-900 border-2 border-slate-700 flex items-center justify-center">
          <Icon className={`w-3.5 h-3.5 ${color}`} />
        </div>
        <div className="bg-slate-900/50 border border-white/5 rounded-xl p-4 hover:border-slate-700 transition-colors">
          <div className="flex justify-between items-start mb-1">
            <div>
              <span className={`text-[10px] font-black uppercase tracking-widest ${color}`}>{entry.modulo}</span>
              <p className="text-sm font-bold text-white">{entry.accion}</p>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">{new Date(entry.timestamp).toLocaleString('es-ES')}</span>
          </div>
          <p className="text-xs text-slate-400">{entry.detalle}</p>
          <div className="flex items-center justify-between mt-2">
            <p className="text-[10px] text-slate-600">Usuario: {entry.usuario}</p>
            {AUDITORIA_EDITABLE && (
              <button
                type="button"
                onClick={() => handleDeleteEntry(entry)}
                className="flex items-center gap-1 text-[10px] text-red-500/70 hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-3 h-3" /> Eliminar
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen pt-4 pb-10 pr-4 pl-14 md:p-4 md:pb-10 max-w-4xl mx-auto w-full text-slate-200">
      <div className="flex flex-col gap-3 mb-6 shrink-0 max-md:items-stretch md:flex-row md:items-center">
        <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center border border-amber-500/30">
          <ShieldCheck className="w-5 h-5 text-amber-400" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-black text-white uppercase tracking-tight">Auditoría del Sistema</h1>
          <p className="text-xs text-slate-400 font-medium">Registro de actividades y cambios en la plataforma</p>
        </div>
        <button
          onClick={() => setPdfOpen(true)}
          className="px-3 py-2 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-400 hover:bg-amber-500/30 transition-colors flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
        >
          <FileText className="w-4 h-4" />
          <span className="hidden sm:inline">PDF</span>
        </button>
      </div>

      <PDFExportModal
        open={pdfOpen}
        onClose={() => setPdfOpen(false)}
        title="Auditoría del Sistema"
        subtitle="Timeline cronológico de eventos"
        accentColor="#f59e0b"
        filtros={[
          { key: 'incluir_detalle', label: 'Incluir detalle completo de cada evento', default: true },
        ]}
        onExport={handleExportPDF}
      />

      {/* Filtros */}
      <div className="bg-slate-900/60 border border-white/10 rounded-xl p-4 mb-6 space-y-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-amber-400" />
          <h3 className="text-xs font-black uppercase tracking-widest text-white">Filtros de Búsqueda</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-[9px] text-slate-500 uppercase font-bold mb-1">Desde</label>
            <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-xs text-white" />
          </div>
          <div>
            <label className="block text-[9px] text-slate-500 uppercase font-bold mb-1">Hasta</label>
            <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-xs text-white" />
          </div>
          <div>
            <label className="block text-[9px] text-slate-500 uppercase font-bold mb-1">Módulo</label>
            <select value={modulo} onChange={e => setModulo(e.target.value)} className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-xs text-white">
              <option value="">Todos</option>
              <option value="Trabajos">Trabajos</option>
              <option value="Inventario">Inventario</option>
              <option value="Logística">Logística</option>
              <option value="Personal">Personal</option>
            </select>
          </div>
          <div>
            <label className="block text-[9px] text-slate-500 uppercase font-bold mb-1">Usuario</label>
            <input type="text" value={usuario} onChange={e => setUsuario(e.target.value)} placeholder="Email o nombre..." className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-xs text-white" />
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-6">
        {isLoading && (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
          </div>
        )}
        {!isLoading && trail.length === 0 && (
          <div className="text-center py-20 text-slate-600">
            <p className="text-sm font-bold">No hay registros de actividad para los filtros seleccionados.</p>
          </div>
        )}
        {!isLoading && trail.map(renderEntry)}
      </div>
    </div>
  )
}