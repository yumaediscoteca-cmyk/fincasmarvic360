import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useInsertWorkRecordQR } from '@/hooks/useParcelData'
import { CheckCircle2, Users } from 'lucide-react'

export default function QRCuadrilla() {
  const { cuadrilla_id } = useParams<{ cuadrilla_id: string }>()
  const { mutateAsync, isPending } = useInsertWorkRecordQR()

  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleEntrada = async () => {
    if (!cuadrilla_id) {
      setError('QR inválido')
      return
    }

    setError(null)

    try {
      await mutateAsync({
        cuadrilla_id,
        hora_entrada: new Date().toISOString(),
      })

      setSaved(true)

    } catch (e: any) {
      setError(e?.message ?? 'Error registrando entrada')
    }
  }

  if (saved) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#020617] text-center px-6">
        <CheckCircle2 className="w-16 h-16 text-green-400 mb-4" />
        <p className="text-lg font-black text-green-400 uppercase tracking-widest">
          Entrada registrada
        </p>
        <p className="text-sm text-slate-500 mt-2">
          Ya puedes comenzar el trabajo
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col justify-center bg-[#020617] px-6">

      {/* HEADER */}
      <div className="text-center mb-10">
        <Users className="w-12 h-12 text-[#38bdf8] mx-auto mb-4" />
        <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">
          Registro de cuadrilla
        </p>
        <p className="text-xl font-black text-white uppercase tracking-tight">
          Entrada de jornada
        </p>
      </div>

      {/* BOTÓN PRINCIPAL */}
      <button
        onClick={handleEntrada}
        disabled={isPending}
        className="w-full py-5 rounded-xl bg-[#38bdf8]/20 border border-[#38bdf8]/40 text-[#38bdf8] text-lg font-black uppercase tracking-widest active:scale-[0.98] transition disabled:opacity-50"
      >
        {isPending ? 'Registrando...' : 'Registrar Entrada'}
      </button>

      {/* ERROR */}
      {error && (
        <p className="text-xs text-red-400 text-center mt-4">
          {error}
        </p>
      )}

      {/* FOOTER */}
      <p className="text-[10px] text-slate-600 text-center mt-10 uppercase tracking-widest">
        Marvic 360 · Control de personal
      </p>

    </div>
  )
}