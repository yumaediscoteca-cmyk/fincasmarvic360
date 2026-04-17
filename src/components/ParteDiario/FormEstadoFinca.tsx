import React, { useState, useCallback, useMemo } from 'react'
import { Building2, Plus, Camera, X } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import type { Tables } from '@/integrations/supabase/types'
import { useAddEstadoFinca } from '@/hooks/useParteDiario'
import { AudioInput } from '@/components/base'
import { ESTADOS_PARCELA } from '@/constants/estadosParcela'
import { FINCAS_NOMBRES as FINCAS } from '@/constants/farms'
import { uploadImage } from '@/utils/uploadImage'
import { formatHora } from '@/utils/dateFormat'
import { toast } from '@/hooks/use-toast'
import { EntradaRow, EmptyState } from './Shared'
import { useFormDraft } from '@/stability'

type FormA = {
  finca: string; parcel_id: string; estado: string
  num_operarios: string; nombres_operarios: string
  foto1: File | null; foto2: File | null; notas: string
}

const initA = (): FormA => ({
  finca: '', parcel_id: '', estado: '', num_operarios: '',
  nombres_operarios: '', foto1: null, foto2: null, notas: '',
})

async function uploadFoto(file: File, parteId: string): Promise<string | null> {
  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `${parteId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  return uploadImage(file, 'partes-images', path)
}

interface FormEstadoFincaProps {
  parteId: string | null
  estadosFinca: Tables<'parte_estado_finca'>[]
  esHoy: boolean
  onDelete: (id: string) => void
}

export const FormEstadoFinca = React.memo(({ parteId, estadosFinca, esHoy, onDelete }: FormEstadoFincaProps) => {
  const [modalOpen, setModalOpen] = useState(false)
  const [formA, setFormA] = useState<FormA>(initA())
  const [editIdA, setEditIdA] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const addEstadoFinca = useAddEstadoFinca()

  const draftScope =
    parteId && modalOpen
      ? `parte_estado_finca:${parteId}:${editIdA ?? 'new'}`
      : 'parte_estado_finca:__closed__'

  const snapshot = useMemo(
    () => ({
      finca: formA.finca,
      parcel_id: formA.parcel_id,
      estado: formA.estado,
      num_operarios: formA.num_operarios,
      nombres_operarios: formA.nombres_operarios,
      notas: formA.notas,
      editIdA,
    }),
    [
      formA.finca,
      formA.parcel_id,
      formA.estado,
      formA.num_operarios,
      formA.nombres_operarios,
      formA.notas,
      editIdA,
    ]
  )

  const hydrateDraft = useCallback(
    (d: {
      finca: string
      parcel_id: string
      estado: string
      num_operarios: string
      nombres_operarios: string
      notas: string
      editIdA: string | null
    }) => {
      setFormA((prev) => ({
        ...prev,
        finca: d.finca,
        parcel_id: d.parcel_id,
        estado: d.estado,
        num_operarios: d.num_operarios,
        nombres_operarios: d.nombres_operarios,
        notas: d.notas,
        foto1: null,
        foto2: null,
      }))
      setEditIdA(d.editIdA ?? null)
    },
    []
  )

  const { clearDraft } = useFormDraft({
    scope: draftScope,
    type: 'parte_estado_finca',
    enabled: modalOpen && !!parteId,
    snapshot,
    hydrate: hydrateDraft,
  })

  const editar = useCallback((e: Tables<'parte_estado_finca'>) => {
    setEditIdA(e.id)
    setFormA({
      finca: e.finca ?? '', parcel_id: e.parcel_id ?? '', estado: e.estado ?? '',
      num_operarios: e.num_operarios?.toString() ?? '',
      nombres_operarios: e.nombres_operarios ?? '',
      foto1: null, foto2: null, notas: e.notas ?? '',
    })
    setModalOpen(true)
  }, [])

  async function submitA() {
    if (!parteId || !formA.finca) return
    const hasNewPhotos = !!(formA.foto1 || formA.foto2)
    if (hasNewPhotos && typeof navigator !== 'undefined' && !navigator.onLine) {
      toast({
        title: 'Sin conexión',
        description: 'No se pueden enviar fotos sin conexión. Conéctate y vuelve a guardar.',
        variant: 'destructive',
      })
      return
    }
    setSaving(true)
    try {
      const numOp = parseInt(formA.num_operarios)
      const patch = {
        parte_id: parteId,
        finca: formA.finca,
        parcel_id:         formA.parcel_id         || null,
        estado:            formA.estado             || null,
        num_operarios:     isNaN(numOp) ? null : numOp,
        nombres_operarios: formA.nombres_operarios  || null,
        notas: formA.notas || null,
      }
      if (editIdA) {
        await supabase.from('parte_estado_finca').update(patch).eq('id', editIdA)
        if (formA.foto1) {
          const url = await uploadFoto(formA.foto1, parteId)
          if (url) await supabase.from('parte_estado_finca').update({ foto_url: url }).eq('id', editIdA)
        }
        if (formA.foto2) {
          const url = await uploadFoto(formA.foto2, parteId)
          if (url) await supabase.from('parte_estado_finca').update({ foto_url_2: url }).eq('id', editIdA)
        }
      } else {
        const foto_url   = formA.foto1 ? await uploadFoto(formA.foto1, parteId) : null
        const foto_url_2 = formA.foto2 ? await uploadFoto(formA.foto2, parteId) : null
        await addEstadoFinca.mutateAsync({ ...patch, foto_url, foto_url_2 })
      }
      await clearDraft()
      setModalOpen(false); setFormA(initA()); setEditIdA(null)
    } finally { setSaving(false) }
  }

  return (
    <>
      <div className="bg-slate-900/60 border border-white/10 rounded-xl overflow-hidden">
        <div className="bg-slate-800/60 px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-black px-1.5 py-0.5 rounded border text-sky-400 border-sky-400/40 bg-sky-400/5">A</span>
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[10px] font-black uppercase tracking-widest text-white">Estado Finca / Parcela</span>
          </div>
          {esHoy && parteId && (
            <button
              onClick={() => { setFormA(initA()); setEditIdA(null); setModalOpen(true); }}
              className="flex items-center gap-1 px-2.5 py-1 rounded border border-[#6d9b7d]/30 bg-[#6d9b7d]/5 hover:bg-[#6d9b7d]/15 text-[#6d9b7d] text-[10px] font-black uppercase tracking-widest transition-all"
            >
              <Plus className="w-3 h-3" /> Añadir
            </button>
          )}
        </div>
        <div className="divide-y divide-white/5">
          {estadosFinca.length === 0 ? (
            <EmptyState texto="Sin estados registrados" />
          ) : (
            estadosFinca.map(e => (
              <EntradaRow
                key={e.id} hora={formatHora(e.created_at)}
                titulo={`${e.finca}${e.parcel_id ? ` · ${e.parcel_id}` : ''}`}
                subtitulo={[
                  ESTADOS_PARCELA.find(s => s.value === e.estado)?.label,
                  e.num_operarios ? `${e.num_operarios} op.` : null,
                  e.nombres_operarios,
                ].filter(Boolean).join(' · ')}
                hasPhoto={!!(e.foto_url || e.foto_url_2)}
                onEdit={() => editar(e)} onDelete={() => onDelete(e.id)}
                esHoy={esHoy} parteId={parteId} id={e.id}
              />
            ))
          )}
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-white/10 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-slate-900 border-b border-white/10 px-5 py-3 flex items-center justify-between">
              <span className="text-sm font-black uppercase tracking-widest text-sky-400">A · Estado Finca / Parcela</span>
              <button onClick={() => setModalOpen(false)} className="text-slate-500 hover:text-white text-lg leading-none">×</button>
            </div>
            <div className="p-5 space-y-4">
              <div><label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Finca *</label><select value={formA.finca} onChange={e => setFormA(p => ({ ...p, finca: e.target.value }))} className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:border-[#6d9b7d]/50 outline-none"><option value="">— Seleccionar finca —</option>{FINCAS.map(f => <option key={f} value={f}>{f}</option>)}</select></div>
              <div><label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Parcela / Sector (opcional)</label><input type="text" value={formA.parcel_id} onChange={e => setFormA(p => ({ ...p, parcel_id: e.target.value }))} placeholder="Ej: S-12, Sector Norte..." className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:border-[#6d9b7d]/50 outline-none" /></div>
              <div><label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Estado actual</label><select value={formA.estado} onChange={e => setFormA(p => ({ ...p, estado: e.target.value }))} className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:border-[#6d9b7d]/50 outline-none"><option value="">— Sin especificar —</option>{ESTADOS_PARCELA.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}</select></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Nº Operarios</label><input type="number" min="0" value={formA.num_operarios} onChange={e => setFormA(p => ({ ...p, num_operarios: e.target.value }))} className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:border-[#6d9b7d]/50 outline-none" /></div>
                <div><label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Nombres</label><input type="text" value={formA.nombres_operarios} onChange={e => setFormA(p => ({ ...p, nombres_operarios: e.target.value }))} placeholder="Juan, Pedro..." className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:border-[#6d9b7d]/50 outline-none" /></div>
              </div>
              <div><label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Notas</label><AudioInput value={formA.notas} onChange={v => setFormA(p => ({ ...p, notas: v }))} placeholder="Observaciones del estado..." rows={3} /></div>
              <div className="grid grid-cols-2 gap-3">
                {[1, 2].map(n => (
                  <div key={n}><label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Foto {n} {n === 1 ? '(estado)' : '(opcional)'}</label><label className="flex items-center gap-2 px-3 py-2.5 bg-slate-800 border border-white/10 rounded-lg cursor-pointer hover:border-[#6d9b7d]/30 transition-colors"><Camera className="w-4 h-4 text-slate-500 shrink-0" /><span className="text-[11px] text-slate-400 truncate">{n === 1 ? (formA.foto1?.name ?? 'Capturar / Subir') : (formA.foto2?.name ?? 'Capturar / Subir')}</span><input type="file" accept="image/*" capture="environment" className="sr-only" onChange={e => { const f = e.target.files?.[0] ?? null; setFormA(p => n === 1 ? { ...p, foto1: f } : { ...p, foto2: f }) }} /></label></div>
                ))}
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setModalOpen(false)} className="flex-1 py-2.5 rounded-lg border border-white/10 text-slate-400 text-sm hover:border-white/20 transition-colors">Cancelar</button>
                <button type="button" onClick={submitA} disabled={saving || !formA.finca} className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-black hover:opacity-90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {saving && <span className="w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />} Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
})