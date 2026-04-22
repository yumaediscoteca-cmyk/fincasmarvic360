import { useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { toast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Camera, Image, Upload } from 'lucide-react'

type Props = {
  parcelId: string
  onClose?: () => void
}

export default function UploadParcelPhoto({ parcelId, onClose }: Props) {
  const [file, setFile]               = useState<File | null>(null)
  const [preview, setPreview]         = useState<string | null>(null)
  const [description, setDescription] = useState('')
  const [uploading, setUploading]     = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] || null
    setFile(selected)
    if (selected) {
      const url = URL.createObjectURL(selected)
      setPreview(url)
    } else {
      setPreview(null)
    }
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!file) {
      toast({ title: 'Error', description: 'Selecciona una imagen', variant: 'destructive' })
      return
    }

    setUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${parcelId}-${Date.now()}.${fileExt}`

      // Subir a Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('parcel-images')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      const { data } = supabase.storage
        .from('parcel-images')
        .getPublicUrl(fileName)

      const imageUrl = data.publicUrl

      // ✅ Insertar en fotos_campo (FK TEXT correcta)
      const { error: insertError } = await supabase
        .from('fotos_campo')
        .insert({
          parcel_id:   parcelId,
          url_imagen:  imageUrl,
          descripcion: description || null,
        })

      if (insertError) throw insertError

      toast({ title: '✅ Foto subida', description: 'Imagen guardada correctamente.' })
      if (onClose) onClose()

    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    } finally {
      setUploading(false)
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
        <h3 className="font-bold text-lg">Subir foto de parcela</h3>
      </div>

      <form onSubmit={handleUpload} className="space-y-4">

        {/* PREVIEW */}
        {preview ? (
          <div className="relative rounded-2xl overflow-hidden border border-border">
            <img src={preview} alt="Preview" className="w-full max-h-48 object-cover" />
            <button
              type="button"
              onClick={() => { setFile(null); setPreview(null) }}
              className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-lg"
            >
              Cambiar
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {/* CÁMARA DIRECTA */}
            <label className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 border-dashed border-border cursor-pointer hover:border-primary transition-colors">
              <Camera className="w-8 h-8 text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-semibold">Cámara</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>

            {/* GALERÍA */}
            <label className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 border-dashed border-border cursor-pointer hover:border-primary transition-colors">
              <Image className="w-8 h-8 text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-semibold">Galería</span>
              <input
                type="file"
                accept="image/*,video/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>
        )}

        {/* DESCRIPCIÓN */}
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">
            Descripción <span className="text-muted-foreground/60">(opcional)</span>
          </label>
          <Textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Ej: Estado del cultivo, plaga detectada, vuelo dron..."
            rows={3}
          />
        </div>

        <Button
          type="submit"
          disabled={uploading || !file}
          className="w-full h-12 rounded-2xl text-base font-bold"
        >
          {uploading ? (
            <><div className="w-4 h-4 border-2 border-[#38bdf8] border-t-transparent rounded-full animate-spin mr-2" /> Subiendo...</>
          ) : (
            <><Upload className="w-4 h-4 mr-2" /> Subir foto</>
          )}
        </Button>

      </form>
    </div>
  )
}