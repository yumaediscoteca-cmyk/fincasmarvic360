import { useEffect, useState } from 'react'
import { usePresenciaTiempoReal } from '@/hooks/usePresencia'
import { useCuadrillas } from '@/hooks/useCatalogos'
import { Users, RefreshCw, Download, FileText } from 'lucide-react'
import { formatHora, formatFechaCompleta } from '@/utils/dateFormat'
import { generarPDFCorporativoBase, pdfCorporateSection, pdfCorporateTable, PDF_MARGIN } from '@/utils/pdfUtils'
import { SelectWithOther } from '@/components/base'
import { toast } from '@/hooks/use-toast'
import * as XLSX from 'xlsx'

interface PresenciaRecord {
  id: string
  cuadrilla_id: string
  parcel_id?: string | null
  hora_entrada: string
  hora_salida?: string | null
  cuadrillas?: { nombre: string } | null
  parcels?: { farm: string } | null
}

interface PresenciaAcumulada {
  cuadrilla_id: string
  nombre_cuadrilla: string
  total_horas: number
  parcelas: Set<string>
  tipo_trabajo: string
  registros: Array<{
    parcel_id: string
    fecha: string
    hora_entrada: string
    hora_salida: string
    horas: number
  }>
}

export default function PresenciaPanel() {
  const { data: presencias, isLoading, refetch } = usePresenciaTiempoReal()
  const { data: cuadrillas } = useCuadrillas()
  
  const [tiemposTranscurridos, setTiemposTranscurridos] = useState<Record<string, string>>({})
  const [filtroFecha1, setFiltroFecha1] = useState<string>('')
  const [filtroFecha2, setFiltroFecha2] = useState<string>('')
  const [filtroCuadrilla, setFiltroCuadrilla] = useState<string>('')
  const [filtroFinca, setFiltroFinca] = useState<string>('')

  // Actualizar tiempos transcurridos cada segundo
  useEffect(() => {
    if (!presencias) return

    const interval = setInterval(() => {
      const nuevos: Record<string, string> = {}
      presencias.forEach((p: PresenciaRecord) => {
        const entrada = new Date(p.hora_entrada)
        const ahora = new Date()
        const diffMs = ahora.getTime() - entrada.getTime()
        const horas = Math.floor(diffMs / (1000 * 60 * 60))
        const minutos = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
        const segundos = Math.floor((diffMs % (1000 * 60)) / 1000)
        nuevos[p.id] = `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`
      })
      setTiemposTranscurridos(nuevos)
    }, 1000)

    return () => clearInterval(interval)
  }, [presencias])

  // Calcular registros acumulados históricos (con hora_salida)
  const calcularResumen = (): PresenciaAcumulada[] => {
    if (!presencias) return []
    
    // Filtrar por fechas si están seteadas
    let registrosFiltrados = presencias
    
    if (filtroFecha1) {
      const fecha1 = new Date(filtroFecha1).getTime()
      registrosFiltrados = registrosFiltrados.filter((p: PresenciaRecord) => {
        const fechaEntrada = new Date(p.hora_entrada).getTime()
        return fechaEntrada >= fecha1
      })
    }

    if (filtroFecha2) {
      const fecha2 = new Date(filtroFecha2)
      fecha2.setHours(23, 59, 59, 999)
      const fecha2Time = fecha2.getTime()
      registrosFiltrados = registrosFiltrados.filter((p: PresenciaRecord) => {
        const fechaEntrada = new Date(p.hora_entrada).getTime()
        return fechaEntrada <= fecha2Time
      })
    }

    if (filtroCuadrilla) {
      registrosFiltrados = registrosFiltrados.filter((p: PresenciaRecord) => p.cuadrillas?.nombre === filtroCuadrilla)
    }

    // Agrupar por cuadrilla
    const mapa = new Map<string, PresenciaAcumulada>()
    
    registrosFiltrados.forEach((p: PresenciaRecord) => {
      const key = p.cuadrilla_id
      const nombreCuadrilla = p.cuadrillas?.nombre ?? 'Sin nombre'
      
      if (!mapa.has(key)) {
        mapa.set(key, {
          cuadrilla_id: key,
          nombre_cuadrilla: nombreCuadrilla,
          total_horas: 0,
          parcelas: new Set(),
          tipo_trabajo: '',
          registros: []
        })
      }

      const item = mapa.get(key)!
      if (p.parcel_id) item.parcelas.add(p.parcel_id)
      
      // Si tiene hora_salida, calcular horas
      if (p.hora_salida) {
        const entrada = new Date(p.hora_entrada).getTime()
        const salida = new Date(p.hora_salida).getTime()
        const horas = (salida - entrada) / (1000 * 60 * 60)
        item.total_horas += horas
        
        item.registros.push({
          parcel_id: p.parcel_id ?? '—',
          fecha: new Date(p.hora_entrada).toLocaleDateString('es-ES'),
          hora_entrada: formatHora(p.hora_entrada),
          hora_salida: formatHora(p.hora_salida),
          horas
        })
      }
    })

    return Array.from(mapa.values()).sort((a, b) => b.total_horas - a.total_horas)
  }

  const resumen = calcularResumen()
  const totalHorasGlobal = resumen.reduce((acc, r) => acc + r.total_horas, 0)

  // Refetch cada 30 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      refetch()
    }, 30000)
    return () => clearInterval(interval)
  }, [refetch])

  // Generar PDF corporativo
  const generarPDF = () => {
    const bloques: Parameters<typeof generarPDFCorporativoBase>[0]['bloques'] = [(ctx) => {
      pdfCorporateSection(ctx, 'RESUMEN DE HORAS POR CUADRILLA')
      
      // Tabla resumen cuadrillas
      const rowsResumen = resumen.map((r) => [
        r.nombre_cuadrilla,
        r.total_horas.toFixed(2),
        Array.from(r.parcelas).join(', ') || '—',
        r.tipo_trabajo || '—'
      ])

      pdfCorporateTable(
        ctx,
        ['CUADRILLA', 'TOTAL HORAS', 'PARCELAS', 'TIPO TRABAJO'],
        [40, 30, 60, 50],
        rowsResumen
      )

      // Pie: total general
      ctx.doc.setFontSize(10)
      ctx.doc.text(`TOTAL GENERAL: ${totalHorasGlobal.toFixed(2)} HORAS`, PDF_MARGIN, ctx.doc.internal.pageSize.getHeight() - 40)

      // Detalle si hay registros
      if (resumen.some(r => r.registros.length > 0)) {
        ctx.checkPage(40)
        pdfCorporateSection(ctx, 'DETALLE DE PRESENCIA')
        
        resumen.forEach((cuadrilla) => {
          if (cuadrilla.registros.length === 0) return
          
          ctx.doc.setFontSize(9)
          ctx.doc.setTextColor(56, 189, 248)
          ctx.doc.text(`${cuadrilla.nombre_cuadrilla} - Total: ${cuadrilla.total_horas.toFixed(2)}h`, PDF_MARGIN, ctx.y + 4)
          ctx.doc.setTextColor(200, 200, 200)
          
          const rows = cuadrilla.registros.map((r) => [
            r.parcel_id,
            r.fecha,
            r.hora_entrada,
            r.hora_salida,
            r.horas.toFixed(2)
          ])

          pdfCorporateTable(
            ctx,
            ['PARCELA', 'FECHA', 'ENTRADA', 'SALIDA', 'HORAS'],
            [30, 30, 25, 25, 20],
            rows
          )
          
          ctx.checkPage(10)
        })
      }
    }]

    generarPDFCorporativoBase({
      titulo: 'Informe de Presencia y Horas',
      subtitulo: `Período: ${filtroFecha1 ? formatFechaCompleta(filtroFecha1) : 'Todos'} - ${filtroFecha2 ? formatFechaCompleta(filtroFecha2) : 'Hoy'}`,
      fecha: new Date(),
      filename: `Presencia_Horas_${new Date().toISOString().split('T')[0]}.pdf`,
      bloques,
    })
  }

  // Generar Excel
  const generarExcel = () => {
    const datosResumen = resumen.map((r) => ({
      CUADRILLA: r.nombre_cuadrilla,
      'TOTAL HORAS': r.total_horas.toFixed(2),
      PARCELAS: Array.from(r.parcelas).join(', ') || '—',
      'TIPO TRABAJO': r.tipo_trabajo || '—'
    }))

    const workbook = XLSX.utils.book_new()
    
    // Hoja 1: Resumen
    const ws1 = XLSX.utils.json_to_sheet(datosResumen)
    ws1['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 40 }, { wch: 20 }]
    XLSX.utils.book_append_sheet(workbook, ws1, 'Resumen')

    // Hoja 2: Detalle
    const datosDetalle: Array<Record<string, string>> = []
    resumen.forEach((cuadrilla) => {
      cuadrilla.registros.forEach((r) => {
        datosDetalle.push({
          CUADRILLA: cuadrilla.nombre_cuadrilla,
          PARCELA: r.parcel_id,
          FECHA: r.fecha,
          ENTRADA: r.hora_entrada,
          SALIDA: r.hora_salida,
          HORAS: r.horas.toFixed(2)
        })
      })
    })

    if (datosDetalle.length > 0) {
      const ws2 = XLSX.utils.json_to_sheet(datosDetalle)
      ws2['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 10 }]
      XLSX.utils.book_append_sheet(workbook, ws2, 'Detalle')
    }

    XLSX.writeFile(workbook, `Presencia_Horas_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  // Get lista cuadrillas para dropdown
  const cuadrillasOpciones = (cuadrillas ?? []).map((c: { nombre: string }) => c.nombre)
  
  const fincasOpciones = Array.from(
    new Set((presencias ?? []).map((p: PresenciaRecord) => p.parcels?.farm).filter(Boolean))
  ).map(f => ({ value: f, label: f }))

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-sky-400 mx-auto mb-2" />
          <p className="text-slate-400">Cargando presencia...</p>
        </div>
      </div>
    )
  }

  const cuadrillasActivas = presencias?.length ?? 0

  return (
    <div className="pl-14 pr-6 py-6">
      {/* ENCABEZADO */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Users className="w-6 h-6 text-sky-400" />
          <h1 className="text-3xl font-black text-white uppercase tracking-tight">
            Panel de Presencia
          </h1>
        </div>
        <p className="text-sm text-slate-400">
          Monitoreo en tiempo real de cuadrillas activas + informe de horas
        </p>
      </div>

      {/* FILTROS */}
      <div className="bg-slate-900/50 border border-slate-700/50 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="text-xs text-slate-400 uppercase tracking-widest block mb-2">
              Cuadrilla
            </label>
            <SelectWithOther
              options={cuadrillasOpciones}
              value={filtroCuadrilla}
              onChange={(val) => setFiltroCuadrilla(val)}
              placeholder="Todas"
              onCreateNew={() => toast({ title: 'Cuadrilla nueva', description: 'Las cuadrillas se gestionan desde el módulo Personal.' })}
            />
          </div>
          
          <div>
            <label className="text-xs text-slate-400 uppercase tracking-widest block mb-2">
              Desde fecha
            </label>
            <input
              type="date"
              value={filtroFecha1}
              onChange={(e) => setFiltroFecha1(e.target.value)}
              className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-600 text-slate-300 text-sm"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 uppercase tracking-widest block mb-2">
              Hasta fecha
            </label>
            <input
              type="date"
              value={filtroFecha2}
              onChange={(e) => setFiltroFecha2(e.target.value)}
              className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-600 text-slate-300 text-sm"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={() => {
                setFiltroCuadrilla('')
                setFiltroFecha1('')
                setFiltroFecha2('')
              }}
              className="w-full px-3 py-2 rounded bg-slate-700/50 border border-slate-600/50 text-slate-300 text-sm hover:bg-slate-700 transition"
            >
              Limpiar
            </button>
          </div>
        </div>
      </div>

      {/* CONTADOR DE ACTIVAS */}
      <div className="bg-slate-900/50 border border-sky-500/20 rounded-lg p-4 mb-6">
        <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">
          Cuadrillas activas
        </p>
        <p className="text-3xl font-black text-sky-400">
          {cuadrillasActivas}
        </p>
      </div>

      {/* TABLA EN TIEMPO REAL */}
      {cuadrillasActivas > 0 ? (
        <div className="mb-8">
          <h2 className="text-lg font-bold text-white mb-4 uppercase">Presencia Activa</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-3 px-4 text-xs font-black text-slate-400 uppercase tracking-widest">
                    Cuadrilla
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-black text-slate-400 uppercase tracking-widest">
                    Parcela
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-black text-slate-400 uppercase tracking-widest">
                    Hora Entrada
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-black text-slate-400 uppercase tracking-widest">
                    Tiempo Acumulado
                  </th>
                </tr>
              </thead>
              <tbody>
                {presencias?.map((presencia: PresenciaRecord) => {
                  const tiempoDisplay = tiemposTranscurridos[presencia.id] || '00:00:00'
                  return (
                    <tr
                      key={presencia.id}
                      className="border-b border-slate-800 hover:bg-slate-900/30 transition"
                    >
                      <td className="py-4 px-4">
                        <div>
                          <p className="font-black text-white">
                            {presencia.cuadrillas?.nombre ?? 'Sin nombre'}
                          </p>
                          <p className="text-xs text-slate-500 font-mono">
                            {presencia.cuadrilla_id}
                          </p>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <p className="text-slate-300 font-mono">
                          {presencia.parcel_id ?? '—'}
                        </p>
                      </td>
                      <td className="py-4 px-4">
                        <p className="text-sky-400 font-mono">
                          {formatHora(presencia.hora_entrada)}
                        </p>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                          <p className="text-green-400 font-black font-mono">
                            {tiempoDisplay}
                          </p>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="mb-8 text-center py-12 bg-slate-900/30 rounded-lg border border-slate-700">
          <Users className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
          <p className="text-slate-400">No hay cuadrillas activas en este momento</p>
        </div>
      )}

      {/* TABLA RESUMEN / INFORME DE HORAS */}
      {resumen.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-bold text-white mb-4 uppercase">Resumen de Horas</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-3 px-4 text-xs font-black text-slate-400 uppercase tracking-widest">
                    Cuadrilla
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-black text-slate-400 uppercase tracking-widest">
                    Total Horas
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-black text-slate-400 uppercase tracking-widest">
                    Parcelas
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-black text-slate-400 uppercase tracking-widest">
                    Tipo Trabajo
                  </th>
                </tr>
              </thead>
              <tbody>
                {resumen.map((item) => (
                  <tr key={item.cuadrilla_id} className="border-b border-slate-800 hover:bg-slate-900/30 transition">
                    <td className="py-4 px-4">
                      <p className="font-black text-white">{item.nombre_cuadrilla}</p>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <p className="text-amber-400 font-bold font-mono">{item.total_horas.toFixed(2)}h</p>
                    </td>
                    <td className="py-4 px-4">
                      <p className="text-slate-300 text-sm">
                        {Array.from(item.parcelas).join(', ') || '—'}
                      </p>
                    </td>
                    <td className="py-4 px-4">
                      <p className="text-slate-400 text-sm">{item.tipo_trabajo || '—'}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-600 bg-slate-900/60">
                  <td colSpan={1} className="py-4 px-4 font-black text-white">
                    TOTAL
                  </td>
                  <td className="py-4 px-4 text-right">
                    <p className="text-amber-400 font-bold font-mono text-lg">{totalHorasGlobal.toFixed(2)}h</p>
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* BOTONES ACCIONES */}
      <div className="flex gap-4 mb-8 pt-6 border-t border-slate-700">
        <button
          onClick={() => refetch()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-500/20 border border-sky-500/50 text-sky-400 text-sm font-semibold hover:bg-sky-500/30 transition"
        >
          <RefreshCw className="w-4 h-4" />
          Actualizar
        </button>
        
        <button
          onClick={generarPDF}
          disabled={resumen.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/20 border border-red-500/50 text-red-400 text-sm font-semibold hover:bg-red-500/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FileText className="w-4 h-4" />
          PDF Corporativo
        </button>

        <button
          onClick={generarExcel}
          disabled={resumen.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/20 border border-green-500/50 text-green-400 text-sm font-semibold hover:bg-green-500/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4" />
          Excel
        </button>
      </div>

      <p className="text-xs text-slate-500">
        Actualización automática de presencia activa cada 30 segundos
      </p>
    </div>
  )
}
