import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { esRolEncargado } from '@/types/roles'
import { FINCAS_PILOTO } from '@/constants/fincasPilotoEncargado'
import { uploadImage } from '@/utils/uploadImage'
import {
  useEncargadoPerfil,
  useTareasHoy,
  usePlanConfirmado,
  useConfirmarPlanificacion,
  useIncidenciasDia,
  useActualizarTarea,
  useRegistrarOutput,
  useRegistrarIncidencia,
  useRegistrarCambioPersonal,
  useRegistrarMaquinariaCierre,
  useCerrarParteEncargado,
} from '@/hooks/useParteEncargado'
import type { TablesInsert } from '@/integrations/supabase/types'

const BRAND = '#1B4332'
const TEXT_MIN = 'text-base'

const INCIDENCIA_TIPOS: TablesInsert<'parte_enc_incidencia'>['tipo'][] = [
  'plaga',
  'enfermedad',
  'averia_maquinaria',
  'calidad',
  'rendimiento_bajo',
  'perdida_producto',
  'desarrollo_anomalo',
  'falta_material',
  'accidente',
  'otro',
]

function hoyISO(): string {
  return new Date().toISOString().split('T')[0]
}

function formatFechaLarga(fecha: string): string {
  try {
    return new Date(fecha + 'T12:00:00').toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return fecha
  }
}

function SpeechMicButton({ onText }: { onText: (t: string) => void }) {
  const start = useCallback(() => {
    const W = window as unknown as {
      SpeechRecognition?: new () => {
        lang: string
        onresult: ((ev: { results: { transcript: string }[][] }) => void) | null
        start: () => void
      }
      webkitSpeechRecognition?: new () => {
        lang: string
        onresult: ((ev: { results: { transcript: string }[][] }) => void) | null
        start: () => void
      }
    }
    const SR = W.SpeechRecognition ?? W.webkitSpeechRecognition
    if (!SR) return
    const rec = new SR()
    rec.lang = 'es-ES'
    rec.onresult = ev => {
      const t = ev.results[0]?.[0]?.transcript ?? ''
      if (t) onText(t)
    }
    rec.start()
  }, [onText])

  if (typeof window === 'undefined') return null
  const W = window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown }
  if (!W.SpeechRecognition && !W.webkitSpeechRecognition) return null

  return (
    <button
      type="button"
      onClick={start}
      className="min-h-[52px] rounded-lg border border-[#1B4332] px-4 text-[#1B4332]"
      style={{ minHeight: 52 }}
    >
      Micrófono
    </button>
  )
}

export default function ParteEncargado() {
  const { user, rol, rol_encargado, fincas_permitidas, loading } = useAuth()
  const fecha = hoyISO()

  if (!loading && (rol === 'admin' || rol === 'director')) {
    return <Navigate to="/parte-diario" replace />
  }

  if (!loading && user && rol && !esRolEncargado(rol) && rol !== 'solo_lectura') {
    return <Navigate to="/" replace />
  }

  const perfilQ = useEncargadoPerfil()
  const tareasQ = useTareasHoy(fecha)
  const planQ = usePlanConfirmado(fecha)
  const incQ = useIncidenciasDia(fecha)

  const confirmarPlan = useConfirmarPlanificacion()
  const actualizarTarea = useActualizarTarea()
  const registrarOutput = useRegistrarOutput()
  const registrarIncidencia = useRegistrarIncidencia()
  const registrarCambio = useRegistrarCambioPersonal()
  const registrarMaq = useRegistrarMaquinariaCierre()
  const cerrarParte = useCerrarParteEncargado()

  const [resumenOpen, setResumenOpen] = useState(true)
  const [sheetInc, setSheetInc] = useState(false)
  const [sheetCambio, setSheetCambio] = useState(false)
  const [alertaMuyGrave, setAlertaMuyGrave] = useState(false)

  const [incGravedad, setIncGravedad] = useState<'leve' | 'grave' | 'muy_grave' | null>(null)
  const [incTipo, setIncTipo] = useState<TablesInsert<'parte_enc_incidencia'>['tipo']>('otro')
  const [incFinca, setIncFinca] = useState('')
  const [incSector, setIncSector] = useState('')
  const [incDesc, setIncDesc] = useState('')
  const [incFoto, setIncFoto] = useState<File | null>(null)

  const [cambioNum, setCambioNum] = useState('')
  const [cambioMotivo, setCambioMotivo] = useState('')
  const [cambioDecide, setCambioDecide] = useState('')
  const [cambioOrigen, setCambioOrigen] = useState('')
  const [cambioDestino, setCambioDestino] = useState('')

  const [outputByTask, setOutputByTask] = useState<
    Record<string, { cantidad: string; unidad: string; notas: string; foto: File | null }>
  >({})

  const tareas = tareasQ.data ?? []
  const incidencias = incQ.data ?? []

  const resumen = useMemo(() => {
    const total = tareas.length
    const completadas = tareas.filter(t => t.estado === 'completada').length
    const enCurso = tareas.filter(t => t.estado === 'en_curso').length
    return { total, completadas, enCurso, incidencias: incidencias.length }
  }, [tareas, incidencias])

  const tractoresIds = useMemo(() => {
    const s = new Set<string>()
    tareas.forEach(t => {
      if (t.maquinaria_id) s.add(t.maquinaria_id)
    })
    return [...s]
  }, [tareas])

  const todasFinales =
    tareas.length > 0 && tareas.every(t => t.estado === 'completada' || t.estado === 'cancelada')

  const rolLabel = (rol_encargado ?? rol ?? '') as string
  const fincasOpts = (fincas_permitidas?.length ? fincas_permitidas : [...FINCAS_PILOTO]) as string[]

  const ensureOutputState = (id: string) => {
    setOutputByTask(prev => prev[id] ?? { cantidad: '', unidad: 'kg', notas: '', foto: null })
  }

  useEffect(() => {
    if (alertaMuyGrave) {
      const t = setTimeout(() => setAlertaMuyGrave(false), 8000)
      return () => clearTimeout(t)
    }
  }, [alertaMuyGrave])

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-white p-4" style={{ color: BRAND }}>
        <p className={TEXT_MIN}>Cargando sesión…</p>
      </div>
    )
  }

  if (!esRolEncargado(rol ?? '')) {
    return (
      <div className="min-h-screen bg-white p-4" style={{ color: BRAND }}>
        <p className={TEXT_MIN}>Acceso reservado a encargados de campo.</p>
      </div>
    )
  }

  const displayName =
    perfilQ.data?.full_name || perfilQ.data?.email || user.email || 'Encargado'

  return (
    <div className="min-h-screen bg-white pb-28" style={{ color: '#111' }}>
      <header
        className="px-4 py-4 text-white"
        style={{ backgroundColor: BRAND, minHeight: 72 }}
      >
        <div className="flex items-center gap-3">
          <img src="/MARVIC_logo.png" alt="Marvic" className="h-10 w-auto object-contain brightness-0 invert" />
          <div className="flex-1">
            <p className={`${TEXT_MIN} font-semibold leading-tight`}>{formatFechaLarga(fecha)}</p>
            <p className="text-sm opacity-90 mt-1">{displayName}</p>
            <p className="text-sm opacity-90">Rol: {rolLabel}</p>
          </div>
        </div>
      </header>

      {alertaMuyGrave && (
        <div className="mx-4 mt-3 rounded-lg border border-red-600 bg-red-50 p-3 text-red-800 text-base">
          Alerta registrada — Dirección será notificada
        </div>
      )}

      {!planQ.data && (
        <div
          className="mx-4 mt-4 rounded-lg border p-4"
          style={{ backgroundColor: '#FEF3C7', borderColor: '#F59E0B' }}
        >
          <p className={`${TEXT_MIN} font-medium text-slate-900`}>
            Confirma que has leído la planificación de hoy
          </p>
          <button
            type="button"
            disabled={confirmarPlan.isPending}
            onClick={() => confirmarPlan.mutate(fecha)}
            className="mt-4 w-full rounded-lg font-semibold text-white"
            style={{ backgroundColor: BRAND, minHeight: 52 }}
          >
            Confirmar planificación
          </button>
        </div>
      )}

      {planQ.data && (
        <div className="mx-4 mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-base text-slate-800">
          Planificación confirmada:{' '}
          {planQ.data.confirmado_at
            ? new Date(planQ.data.confirmado_at).toLocaleString('es-ES')
            : '—'}
        </div>
      )}

      <section className="mx-4 mt-4 rounded-xl border border-slate-200">
        <button
          type="button"
          className="flex w-full items-center justify-between p-4 text-left font-semibold text-slate-900"
          style={{ minHeight: 52, fontSize: '1rem' }}
          onClick={() => setResumenOpen(o => !o)}
        >
          Resumen del día
          <span className="text-slate-500">{resumenOpen ? '−' : '+'}</span>
        </button>
        {resumenOpen && (
          <div className="border-t border-slate-200 px-4 pb-4 text-base text-slate-700 space-y-1">
            <p>Total tareas: {resumen.total}</p>
            <p>Completadas: {resumen.completadas}</p>
            <p>En curso: {resumen.enCurso}</p>
            <p>Incidencias: {resumen.incidencias}</p>
          </div>
        )}
      </section>

      <div className="mx-4 mt-6 space-y-4">
        {tareasQ.isLoading && <p className={TEXT_MIN}>Cargando tareas…</p>}
        {tareasQ.isError && (
          <p className="text-base text-red-600">No se pudieron cargar las tareas.</p>
        )}
        {!tareasQ.isLoading && tareas.length === 0 && (
          <p className={`${TEXT_MIN} text-slate-600`}>No hay tareas planificadas para hoy en tus fincas.</p>
        )}

        {tareas.map(tarea => {
          const badgeColor =
            tarea.estado === 'pendiente'
              ? '#6B7280'
              : tarea.estado === 'en_curso'
                ? '#F59E0B'
                : tarea.estado === 'completada'
                  ? BRAND
                  : '#DC2626'
          ensureOutputState(tarea.id)
          const out = outputByTask[tarea.id] ?? { cantidad: '', unidad: 'kg', notas: '', foto: null }

          return (
            <article
              key={tarea.id}
              className="rounded-xl border border-slate-200 p-4 shadow-sm"
              style={{ fontSize: '1rem' }}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 leading-snug">{tarea.titulo}</h2>
                  <p className="text-base text-slate-700 mt-1">
                    {tarea.finca}
                    {tarea.sector ? ` · ${tarea.sector}` : ''}
                  </p>
                </div>
                <span
                  className="rounded-full px-3 py-1 text-sm font-semibold text-white shrink-0"
                  style={{ backgroundColor: badgeColor }}
                >
                  {tarea.estado.replace('_', ' ')}
                </span>
              </div>

              {tarea.personal_asignado?.length ? (
                <p className="mt-3 text-base text-slate-800">
                  Personal (códigos): {tarea.personal_asignado.join(', ')}
                </p>
              ) : null}

              {tarea.maquinaria_id ? (
                <p className="mt-1 text-base text-slate-600">Maquinaria asignada (tractor ref. {tarea.maquinaria_id.slice(0, 8)}…)</p>
              ) : null}

              <div className="mt-4 flex flex-col gap-3">
                {tarea.estado === 'pendiente' && (
                  <button
                    type="button"
                    className="w-full rounded-lg font-semibold text-white"
                    style={{ backgroundColor: BRAND, minHeight: 52 }}
                    disabled={actualizarTarea.isPending}
                    onClick={() =>
                      actualizarTarea.mutate({ tareaId: tarea.id, nuevoEstado: 'en_curso', fecha })
                    }
                  >
                    Iniciar
                  </button>
                )}

                {tarea.estado === 'en_curso' && (
                  <>
                    <div className="grid gap-2 rounded-lg border border-slate-200 p-3 bg-slate-50">
                      <label className="text-base font-medium text-slate-800">Output (opcional antes de completar)</label>
                      <input
                        type="number"
                        className="min-h-[48px] w-full rounded border border-slate-300 px-3 text-base"
                        placeholder="Cantidad"
                        value={out.cantidad}
                        onChange={e =>
                          setOutputByTask(p => ({
                            ...p,
                            [tarea.id]: { ...out, cantidad: e.target.value },
                          }))
                        }
                      />
                      <select
                        className="min-h-[48px] w-full rounded border border-slate-300 px-3 text-base"
                        value={out.unidad}
                        onChange={e =>
                          setOutputByTask(p => ({
                            ...p,
                            [tarea.id]: { ...out, unidad: e.target.value },
                          }))
                        }
                      >
                        <option value="kg">kg</option>
                        <option value="piezas">piezas</option>
                        <option value="cajas">cajas</option>
                        <option value="palots">palots</option>
                      </select>
                      <textarea
                        className="min-h-[80px] w-full rounded border border-slate-300 px-3 py-2 text-base"
                        placeholder="Notas"
                        value={out.notas}
                        onChange={e =>
                          setOutputByTask(p => ({
                            ...p,
                            [tarea.id]: { ...out, notas: e.target.value },
                          }))
                        }
                      />
                      <div className="flex flex-wrap gap-2 items-center">
                        <label className="text-base text-slate-700">Foto opcional</label>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="text-base"
                          onChange={e =>
                            setOutputByTask(p => ({
                              ...p,
                              [tarea.id]: { ...out, foto: e.target.files?.[0] ?? null },
                            }))
                          }
                        />
                      </div>
                      <SpeechMicButton
                        onText={txt =>
                          setOutputByTask(p => ({
                            ...p,
                            [tarea.id]: { ...out, notas: (out.notas ? `${out.notas} ` : '') + txt },
                          }))
                        }
                      />
                      <button
                        type="button"
                        className="w-full rounded-lg border-2 font-semibold"
                        style={{ borderColor: BRAND, color: BRAND, minHeight: 52 }}
                        disabled={registrarOutput.isPending}
                        onClick={async () => {
                          let notas = out.notas || null
                          if (out.foto) {
                            const fotoUrl = await uploadImage(
                              out.foto,
                              'partes-images',
                              `enc/${tarea.id}/${Date.now()}.jpg`,
                            )
                            if (fotoUrl) {
                              notas = notas ? `${notas}\n[Foto] ${fotoUrl}` : `[Foto] ${fotoUrl}`
                            }
                          }
                          await registrarOutput.mutateAsync({
                            tareaId: tarea.id,
                            output_cantidad: out.cantidad ? Number(out.cantidad) : null,
                            output_unidad: (out.unidad || null) as 'kg' | 'piezas' | 'cajas' | 'palots' | null,
                            output_notas: notas,
                            fecha,
                          })
                        }}
                      >
                        Guardar output
                      </button>
                    </div>
                    <button
                      type="button"
                      className="w-full rounded-lg font-semibold text-white"
                      style={{ backgroundColor: BRAND, minHeight: 52 }}
                      disabled={actualizarTarea.isPending}
                      onClick={() =>
                        actualizarTarea.mutate({ tareaId: tarea.id, nuevoEstado: 'completada', fecha })
                      }
                    >
                      Completar
                    </button>
                  </>
                )}

                {tarea.estado === 'completada' && (
                  <p className="text-base text-slate-700">
                    Completada
                    {tarea.hora_inicio ? ` · inicio ${new Date(tarea.hora_inicio).toLocaleTimeString('es-ES')}` : ''}
                    {tarea.hora_fin ? ` · fin ${new Date(tarea.hora_fin).toLocaleTimeString('es-ES')}` : ''}
                  </p>
                )}
              </div>
            </article>
          )
        })}
      </div>

      <div className="mx-4 mt-8">
        <button
          type="button"
          className="w-full rounded-lg border-2 font-semibold"
          style={{ borderColor: BRAND, color: BRAND, minHeight: 52 }}
          onClick={() => setSheetCambio(true)}
        >
          Cambio de personal
        </button>
      </div>

      {tractoresIds.length > 0 && (
        <section className="mx-4 mt-8 space-y-3">
          <h3 className="text-lg font-bold text-slate-900">Estado maquinaria al cierre</h3>
          {tractoresIds.map(tid => (
            <div key={tid} className="rounded-xl border border-slate-200 p-4">
              <p className="text-base font-medium text-slate-800">Tractor {tid.slice(0, 8)}…</p>
              <div className="mt-3 flex flex-col gap-2">
                {(['operativo', 'incidencia_menor', 'averia'] as const).map(est => (
                  <button
                    key={est}
                    type="button"
                    className="w-full rounded-lg border border-slate-300 py-3 text-base font-semibold"
                    style={{ minHeight: 52 }}
                    disabled={registrarMaq.isPending}
                    onClick={() => {
                      const notas =
                        est === 'averia'
                          ? window.prompt('Descripción obligatoria (avería):') || ''
                          : null
                      if (est === 'averia' && !notas) return
                      registrarMaq.mutate({
                        fecha,
                        maquinaria_id: tid,
                        descripcion_maquinaria: null,
                        estado_cierre: est,
                        notas,
                      })
                    }}
                  >
                    {est === 'operativo' ? 'Operativo' : est === 'incidencia_menor' ? 'Incidencia menor' : 'Avería'}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      {todasFinales && (
        <div className="mx-4 mt-10">
          <button
            type="button"
            className="w-full rounded-lg border-2 border-red-600 py-4 text-base font-bold text-red-600"
            style={{ minHeight: 52 }}
            disabled={cerrarParte.isPending}
            onClick={() => {
              if (window.confirm(`¿Confirmas el cierre de la jornada del ${fecha}?`)) {
                cerrarParte.mutate(fecha)
              }
            }}
          >
            Cerrar jornada del {fecha}
          </button>
        </div>
      )}

      <button
        type="button"
        className="fixed bottom-6 right-4 z-40 rounded-full px-5 font-bold text-white shadow-lg"
        style={{ backgroundColor: '#DC2626', minHeight: 56 }}
        onClick={() => {
          setSheetInc(true)
          setIncGravedad(null)
          setIncDesc('')
          setIncFoto(null)
        }}
      >
        ! Incidencia
      </button>

      {sheetInc && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40" onClick={() => setSheetInc(false)}>
          <div
            className="max-h-[90vh] overflow-y-auto rounded-t-2xl bg-white p-4 shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <p className="text-lg font-bold text-slate-900 mb-4">Registrar incidencia</p>
            <div className="flex flex-col gap-3">
              <button
                type="button"
                className="w-full rounded-lg bg-slate-500 py-4 text-base font-bold text-white"
                style={{ minHeight: 52 }}
                onClick={() => setIncGravedad('leve')}
              >
                LEVE
              </button>
              <button
                type="button"
                className="w-full rounded-lg py-4 text-base font-bold text-white"
                style={{ backgroundColor: '#F59E0B', minHeight: 52 }}
                onClick={() => setIncGravedad('grave')}
              >
                GRAVE
              </button>
              <button
                type="button"
                className="w-full rounded-lg py-4 text-base font-bold text-white"
                style={{ backgroundColor: '#DC2626', minHeight: 52 }}
                onClick={() => setIncGravedad('muy_grave')}
              >
                MUY GRAVE
              </button>
              <label className="text-base font-medium">Tipo</label>
              <select
                className="min-h-[48px] w-full rounded border px-3 text-base"
                value={incTipo}
                onChange={e => setIncTipo(e.target.value as TablesInsert<'parte_enc_incidencia'>['tipo'])}
              >
                {INCIDENCIA_TIPOS.map(t => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <label className="text-base font-medium">Finca</label>
              <select
                className="min-h-[48px] w-full rounded border px-3 text-base"
                value={incFinca}
                onChange={e => setIncFinca(e.target.value)}
              >
                <option value="">—</option>
                {fincasOpts.map(f => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
              <label className="text-base font-medium">Sector (texto)</label>
              <input
                className="min-h-[48px] w-full rounded border px-3 text-base"
                value={incSector}
                onChange={e => setIncSector(e.target.value)}
              />
              <label className="text-base font-medium">Descripción</label>
              <textarea
                className="min-h-[100px] w-full rounded border px-3 py-2 text-base"
                value={incDesc}
                onChange={e => setIncDesc(e.target.value)}
              />
                      <SpeechMicButton onText={t => setIncDesc(prev => (prev ? `${prev} ${t}` : t))} />
              <input type="file" accept="image/*" capture="environment" onChange={e => setIncFoto(e.target.files?.[0] ?? null)} />
              <button
                type="button"
                className="w-full rounded-lg font-bold text-white"
                style={{ backgroundColor: BRAND, minHeight: 52 }}
                disabled={!incGravedad || !incDesc.trim() || registrarIncidencia.isPending}
                onClick={async () => {
                  if (!incGravedad) return
                  let fotoUrl: string | null = null
                  if (incFoto) {
                    fotoUrl = await uploadImage(incFoto, 'partes-images', `enc/inc/${Date.now()}.jpg`)
                  }
                  await registrarIncidencia.mutateAsync({
                    fecha,
                    tarea_id: null,
                    gravedad: incGravedad,
                    tipo: incTipo,
                    finca: incFinca || null,
                    sector: incSector || null,
                    descripcion: incDesc.trim(),
                    foto_url: fotoUrl,
                  })
                  if (incGravedad === 'muy_grave') setAlertaMuyGrave(true)
                  setSheetInc(false)
                }}
              >
                Registrar incidencia
              </button>
              <button type="button" className="py-3 text-base text-slate-600" onClick={() => setSheetInc(false)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {sheetCambio && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40" onClick={() => setSheetCambio(false)}>
          <div
            className="max-h-[90vh] overflow-y-auto rounded-t-2xl bg-white p-4"
            onClick={e => e.stopPropagation()}
          >
            <p className="text-lg font-bold mb-4">Cambio de personal</p>
            <div className="flex flex-col gap-3 text-base">
              <input
                className="min-h-[48px] rounded border px-3"
                placeholder="Número empleado"
                value={cambioNum}
                onChange={e => setCambioNum(e.target.value)}
              />
              <label>Tarea origen</label>
              <select
                className="min-h-[48px] rounded border px-3"
                value={cambioOrigen}
                onChange={e => setCambioOrigen(e.target.value)}
              >
                <option value="">—</option>
                {tareas.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.titulo}
                  </option>
                ))}
              </select>
              <label>Tarea destino</label>
              <select
                className="min-h-[48px] rounded border px-3"
                value={cambioDestino}
                onChange={e => setCambioDestino(e.target.value)}
              >
                <option value="">—</option>
                {tareas.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.titulo}
                  </option>
                ))}
              </select>
              <textarea
                className="min-h-[80px] rounded border px-3 py-2"
                placeholder="Motivo"
                value={cambioMotivo}
                onChange={e => setCambioMotivo(e.target.value)}
              />
              <SpeechMicButton onText={t => setCambioMotivo(m => (m ? `${m} ${t}` : t))} />
              <input
                className="min-h-[48px] rounded border px-3"
                placeholder="Número empleado que decide"
                value={cambioDecide}
                onChange={e => setCambioDecide(e.target.value)}
              />
              <button
                type="button"
                className="rounded-lg font-bold text-white"
                style={{ backgroundColor: BRAND, minHeight: 52 }}
                disabled={registrarCambio.isPending}
                onClick={() => {
                  if (!cambioNum.trim() || !cambioMotivo.trim() || !cambioDecide.trim()) return
                  registrarCambio.mutate(
                    {
                      fecha,
                      tarea_origen_id: cambioOrigen || null,
                      tarea_destino_id: cambioDestino || null,
                      numero_empleado: cambioNum.trim(),
                      justificacion: cambioMotivo.trim(),
                      decidido_por: cambioDecide.trim(),
                    },
                    { onSuccess: () => setSheetCambio(false) },
                  )
                }}
              >
                Registrar cambio
              </button>
              <button type="button" className="py-2 text-slate-600" onClick={() => setSheetCambio(false)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
