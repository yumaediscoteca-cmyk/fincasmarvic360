import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { toast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Upload, MapPin } from 'lucide-react'
import SelectWithOther from '@/components/base/SelectWithOther'
import AudioInput from '@/components/base/AudioInput'
import PhotoAttachment from '@/components/base/PhotoAttachment'
import { uploadImage } from '@/utils/uploadImage'

const TIPOS_INSPECCION = [
  'Fitosanitaria',
  'Riego',
  'Residuos',
  'General',
]

const RESULTADOS = ['OK', 'Alerta', 'Crítico'] as const
type Resultado = typeof RESULTADOS[number]

const RESULTADO_COLOR: Record<Resultado, string> = {
  'OK':       'border-green-500  text-green-400',
  'Alerta':   'border-yellow-500 text-yellow-400',
  'Crítico':  'border-red-500    text-red-400',
}

type Props = {
  parcelId: string
  onClose?: () => void
}

export default function InspeccionForm({ parcelId, onClose }: Props) {
  const [tipo,          setTipo]          = useState('')
  const [resultado,     setResultado]     = useState<Resultado | ''>('')
  const [observaciones, setObservaciones] = useState('')
  const [fotoFile,      setFotoFile]      = useState<File | null>(null)
  const [fotoPreview,   setFotoPreview]   = useState<string | null>(null)
  const [coords,        setCoords]        = useState<{ lat: number; lng: number } | null>(null)
  const [coordsLoading, setCoordsLoading] = useState(false)
  const [saving,        setSaving]        = useState(false)

  // Geolocalización automática al montar
  useEffect(() => {
    if (navigator.geolocation) {
      setCoordsLoading(true)
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
          setCoordsLoading(false)
        },
        () => setCoordsLoading(false),
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 0 }
      )
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!tipo)      { toast({ title: 'Error', description: 'Selecciona el tipo de inspección', variant: 'destructive' }); return }
    if (!resultado) { toast({ title: 'Error', description: 'Selecciona el resultado', variant: 'destructive' }); return }
    // Modo piloto: foto opcional

    setSaving(true)
    try {
      // Subir foto si existe
      const fotoUrl = fotoFile ? await uploadImage(fotoFile, 'parcel-images', 'inspecciones') : null

      // Guardar en fotos_campo con tipo=inspeccion
      const descripcionFinal = [
        `[${resultado}] ${tipo}`,
        observaciones || null,
      ].filter(Boolean).join(' — ')

      const { error } = await supabase
        .from('fotos_campo')
        .insert({
          parcel_id:   parcelId,
          url_imagen:  fotoUrl,
          descripcion: descripcionFinal,
          tipo:        'inspeccion',
          latitud:     coords?.lat ?? null,
          longitud:    coords?.lng ?? null,
        })

      if (error) throw error

      toast({ title: 'Inspección guardada', description: `${tipo} — ${resultado}` })
      if (onClose) onClose()

    } catch (err: unknown) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Error desconocido', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="px-5 pb-6">

      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center"
        >
          <ArrowLeft className="w-4 h-4 text-muted-foreground" />
        </button>
        <h3 className="font-bold text-lg">Formulario de inspección</h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* TIPO */}
        <SelectWithOther
          label="Tipo de inspección"
          options={TIPOS_INSPECCION}
          value={tipo}
          onChange={setTipo}
          onCreateNew={setTipo}
          placeholder="Seleccionar tipo..."
        />

        {/* RESULTADO */}
        <div>
          <label className="text-xs text-muted-foreground mb-2 block">Resultado</label>
          <div className="flex gap-2">
            {RESULTADOS.map(r => (
              <button
                key={r}
                type="button"
                onClick={() => setResultado(r)}
                className={`flex-1 py-2 rounded-lg border text-sm font-bold transition-colors ${
                  resultado === r
                    ? RESULTADO_COLOR[r] + ' bg-white/5'
                    : 'border-slate-700 text-slate-500'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* OBSERVACIONES */}
        <AudioInput
          label="Observaciones"
          value={observaciones}
          onChange={setObservaciones}
          placeholder="Describe lo observado en la inspección..."
        />

        {/* FOTO RECOMENDADA (piloto) */}
        <PhotoAttachment
          label="Foto de evidencia (recomendada)"
          value={fotoPreview}
          onChange={(file) => {
            setFotoFile(file)
            setFotoPreview(file ? URL.createObjectURL(file) : null)
          }}
        />

        {/* GEOLOCALIZACIÓN */}
        <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-900/50 border border-slate-700/50">
          <MapPin className="w-4 h-4 text-primary shrink-0" />
          <div className="text-xs">
            {coordsLoading && <p className="text-slate-400">Obteniendo ubicación...</p>}
            {!coordsLoading && coords && (
              <p className="text-slate-300">
                <span className="font-semibold">GPS</span>: {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
              </p>
            )}
            {!coordsLoading && !coords && (
              <p className="text-slate-500">Sin geolocalización</p>
            )}
          </div>
        </div>

        <Button
          type="submit"
          disabled={saving}
          className="w-full h-12 rounded-2xl text-base font-bold"
        >
          {saving ? (
            <><div className="w-4 h-4 border-2 border-[#6d9b7d] border-t-transparent rounded-full animate-spin mr-2" /> Guardando...</>
          ) : (
            <><Upload className="w-4 h-4 mr-2" /> Guardar inspección</>
          )}
        </Button>

      </form>
    </div>
  )
}
