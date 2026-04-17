import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useRegistrarEntradaQR, useRegistrarSalidaQR } from '@/hooks/usePresencia'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { CheckCircle2, Users, Clock, AlertCircle } from 'lucide-react'
import GlobalThemeToggle from '@/components/GlobalThemeToggle'

type PresenciaActiva = {
  id: string;
  hora_entrada: string;
  parcel_id: string | null;
  parcels: { parcel_id: string } | null;
};

export default function QRCuadrilla() {
  const { cuadrilla_id } = useParams<{ cuadrilla_id: string }>()
  const { mutateAsync: registrarEntrada, isPending: pendingEntrada } = useRegistrarEntradaQR()
  const { mutateAsync: registrarSalida, isPending: pendingSalida } = useRegistrarSalidaQR()

  const [stage, setStage] = useState<'entrada' | 'activa' | 'confirmada'>('entrada')
  const [error, setError] = useState<string | null>(null)
  const [presenciaActual, setPresenciaActual] = useState<PresenciaActiva | null>(null)
  const [tiempoTranscurrido, setTiempoTranscurrido] = useState('00:00')

  // Obtener datos cuadrilla
  const { data: cuadrilla } = useQuery({
    queryKey: ['cuadrilla', cuadrilla_id],
    queryFn: async () => {
      if (!cuadrilla_id) return null
      const { data, error } = await supabase
        .from('cuadrillas')
        .select('*')
        .eq('id', cuadrilla_id)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!cuadrilla_id
  })

  // Obtener presencia activa
  const { data: presenciaData } = useQuery({
    queryKey: ['presencia_activa', cuadrilla_id],
    queryFn: async () => {
      if (!cuadrilla_id) return null
      const { data, error } = await supabase
        .from('presencia_tiempo_real')
        .select(`
          id,
          hora_entrada,
          parcel_id,
          parcels(parcel_id)
        `)
        .eq('cuadrilla_id', cuadrilla_id)
        .eq('activo', true)
        .single()
      if (error && error.code !== 'PGRST116') throw error // No existe = normal
      return data ?? null
    },
    staleTime: 5000,
    refetchInterval: 5000
  })

  useEffect(() => {
    setPresenciaActual(presenciaData)
    if (presenciaData) {
      setStage('activa')
    }
  }, [presenciaData])

  // Calcular tiempo transcurrido
  useEffect(() => {
    if (stage !== 'activa' || !presenciaActual) return

    const interval = setInterval(() => {
      const entrada = new Date(presenciaActual.hora_entrada)
      const ahora = new Date()
      const diffMs = ahora.getTime() - entrada.getTime()
      const horas = Math.floor(diffMs / (1000 * 60 * 60))
      const minutos = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
      setTiempoTranscurrido(
        `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}`
      )
    }, 1000)

    return () => clearInterval(interval)
  }, [stage, presenciaActual])

  const handleEntrada = async () => {
    if (!cuadrilla_id) {
      setError('QR inválido')
      return
    }

    setError(null)

    try {
      await registrarEntrada({
        cuadrilla_id,
        parcel_id: null
      })
      setStage('activa')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error registrando entrada')
    }
  }

  const handleSalida = async () => {
    if (!presenciaActual?.id) {
      setError('Presencia no encontrada')
      return
    }

    setError(null)

    try {
      await registrarSalida(presenciaActual.id)
      setStage('confirmada')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error registrando salida')
    }
  }

  // ════════════════════════════════════════════════════════════════
  // PANTALLA: ENTRADA (sin presencia activa)
  // ════════════════════════════════════════════════════════════════
  if (stage === 'entrada') {
    return (
      <>
      <GlobalThemeToggle />
      <div className="min-h-screen flex flex-col justify-center bg-background px-6">
        <div className="text-center mb-10">
          <Users className="w-12 h-12 text-[#6d9b7d] mx-auto mb-4" />
          <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">
            Registro de cuadrilla
          </p>
          <p className="text-2xl font-black text-white uppercase tracking-tight">
            {cuadrilla?.nombre ?? 'Cuadrilla'}
          </p>
        </div>

        <button
          onClick={handleEntrada}
          disabled={pendingEntrada}
          className="w-full py-6 rounded-xl bg-green-500/20 border-2 border-green-500 text-green-400 text-2xl font-black uppercase tracking-widest active:scale-[0.98] transition disabled:opacity-50 mb-4"
        >
          {pendingEntrada ? 'Registrando...' : '🟢 ENTRADA'}
        </button>

        {error && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/50 text-red-400 text-sm mb-6">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <p className="text-[10px] text-slate-600 text-center mt-10 uppercase tracking-widest">
          Marvic 360 · Control de personal
        </p>
      </div>
      </>
    )
  }

  // ════════════════════════════════════════════════════════════════
  // PANTALLA: ACTIVA (presencia registrada, esperando salida)
  // ════════════════════════════════════════════════════════════════
  if (stage === 'activa') {
    return (
      <>
      <GlobalThemeToggle />
      <div className="min-h-screen flex flex-col justify-center bg-background px-6">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <div className="absolute inset-0 bg-green-500 rounded-full animate-pulse opacity-50"></div>
              <Users className="w-12 h-12 text-green-400 relative z-10" />
            </div>
          </div>
          <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">
            Cuadrilla activa
          </p>
          <p className="text-2xl font-black text-white uppercase tracking-tight">
            {cuadrilla?.nombre ?? 'Cuadrilla'}
          </p>
        </div>

        {/* PANEL DE DATOS */}
        <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-6 mb-8">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-xs text-slate-500 mb-1">Hora entrada</p>
              <p className="text-lg font-mono text-primary">
                {presenciaActual?.hora_entrada 
                  ? new Date(presenciaActual.hora_entrada).toLocaleTimeString('es-ES', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })
                  : '--:--'
                }
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Tiempo acumulado</p>
              <p className="text-lg font-mono text-amber-400">
                <Clock className="w-4 h-4 inline mr-1" />
                {tiempoTranscurrido}
              </p>
            </div>
          </div>

          {presenciaActual?.parcel_id && (
            <div>
              <p className="text-xs text-slate-500 mb-1">Parcela</p>
              <p className="text-sm text-slate-300 font-mono">
                {presenciaActual.parcel_id}
              </p>
            </div>
          )}
        </div>

        {/* BOTONES DE ACCIÓN */}
        <div className="flex gap-3">
          <button
            onClick={handleSalida}
            disabled={pendingSalida}
            className="flex-1 py-6 rounded-xl bg-red-500/20 border-2 border-red-500 text-red-400 text-xl font-black uppercase tracking-widest active:scale-[0.98] transition disabled:opacity-50"
          >
            {pendingSalida ? 'Saliendo...' : '🔴 SALIDA'}
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/50 text-red-400 text-sm mt-4">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <p className="text-[10px] text-slate-600 text-center mt-10 uppercase tracking-widest">
          Marvic 360 · Control de personal
        </p>
      </div>
      </>
    )
  }

  // ════════════════════════════════════════════════════════════════
  // PANTALLA: CONFIRMADA (salida registrada)
  // ════════════════════════════════════════════════════════════════
  return (
    <>
    <GlobalThemeToggle />
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground text-center px-6">
      <CheckCircle2 className="w-16 h-16 text-green-400 mb-4" />
      <p className="text-lg font-black text-green-400 uppercase tracking-widest">
        Salida registrada
      </p>
      <p className="text-sm text-slate-500 mt-2">
        Jornada completada
      </p>
      <p className="text-xs text-slate-600 text-center mt-10 uppercase tracking-widest">
        Marvic 360 · Control de personal
      </p>
    </div>
    </>
  )
}