import React, { useState, useCallback } from 'react'
import { Wrench, Plus, Camera, X } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import type { Tables } from '@/integrations/supabase/types'
import { useAddTrabajo } from '@/hooks/useParteDiario'
import { AudioInput } from '@/components/base'
import { TIPOS_TRABAJO } from '@/constants/tiposTrabajo'
import { FINCAS_NOMBRES as FINCAS } from '@/constants/farms'
import { uploadImage } from '@/utils/uploadImage'
import { formatHora } from '@/utils/dateFormat'
import { EntradaRow, EmptyState } from './Shared'

type FormB = {
  tipo_trabajo: string; finca: string; ambito: string; parcelas: string
  num_operarios: string; nombres_operarios: string
  hora_inicio: string; hora_fin: string
  foto1: File | null; foto2: File | null; notas: string
}

const initB = (): FormB => ({
  tipo_trabajo: '', finca: '', ambito: 'finca_completa', parcelas: '',
  num_operarios: '', nombres_operarios: '',
  hora_inicio: '', hora_fin: '', foto1: null, foto2: null, notas: '',
})

function timeToISO(fecha: string, time: string): string | null {
  if (!time) return null
  return `${fecha}T${time}:00`
}

async function uploadFoto(file: File, parteId: string): Promise<string | null> {
  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `${parteId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  return uploadImage(file, 'partes-images', path)
}

interface FormTrabajosRealizadoProps {
  parteId: string | null
  trabajos: Tables<'parte_trabajo'>[]
  fecha: string
  esHoy: boolean
  onDelete: (id: string) => void
}

export const FormTrabajosRealizado = React.memo(({ parteId, trabajos, fecha, esHoy, onDelete }: FormTrabajosRealizadoProps) => {
  const [modalOpen, setModalOpen] = useState(false)
  const [formB, setFormB] = useState<FormB>(initB())
  const [editIdB, setEditIdB] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const addTrabajo = useAddTrabajo()

  const editar = useCallback((e: Tables<'parte_trabajo'>) => {
    setEditIdB(e.id)
    setFormB({
      tipo_trabajo: e.tipo_trabajo ?? '', finca: e.finca ?? '',
      ambito: e.ambito ?? 'finca_completa', parcelas: e.parcelas?.join(', ') ?? '',
      num_operarios: e.num_operarios?.toString() ?? '',
      nombres_operarios: e.nombres_operarios ?? '',
      hora_inicio: e.hora_inicio ? new Date(e.hora_inicio).toTimeString().slice(0,5) : '',
      hora_fin: e.hora_fin ? new Date(e.hora_fin).toTimeString().slice(0,5) : '',
      foto1: null, foto2: null, notas: e.notas ?? '',
    })
    setModalOpen(true)
  }, [])

  async function submitB() {
    if (!parteId || !formB.tipo_trabajo) return
    setSaving(true)
    try {
      const numOp = parseInt(formB.num_operarios)
      const parcelasArr = formB.ambito === 'parcelas_concretas' && formB.parcelas
        ? formB.parcelas.split(',').map(s => s.trim()).filter(Boolean)
        : null
      const patch = {
        parte_id: parteId,
        tipo_trabajo: formB.tipo_trabajo,
        finca:  formB.finca  || null,
        ambito: formB.ambito || null,
        parcelas: parcelasArr,
        num_operarios:     isNaN(numOp) ? null : numOp,
        nombres_operarios: formB.nombres_operarios || null,
        hora_inicio: timeToISO(fecha, formB.hora_inicio),
        hora_fin:    timeToISO(fecha, formB.hora_fin),
        notas: formB.notas || null,
      }
      if (editIdB) {
        await supabase.from('parte_trabajo').update(patch).eq('id', editIdB)
        if (formB.foto1) { const u = await uploadFoto(formB.foto1, parteId); if (u) await supabase.from('parte_trabajo').update({ foto_url: u }).eq('id', editIdB) }
        if (formB.foto2) { const u = await uploadFoto(formB.foto2, parteId); if (u) await supabase.from('parte_trabajo').update({ foto_url_2: u }).eq('id', editIdB) }
      } else {
        const foto_url   = formB.foto1 ? await uploadFoto(formB.foto1, parteId) : null
        const foto_url_2 = formB.foto2 ? await uploadFoto(formB.foto2, parteId) : null
        await addTrabajo.mutateAsync({ ...patch, foto_url, foto_url_2 })
      }
      setModalOpen(false); setFormB(initB()); setEditIdB(null)
    } finally { setSaving(false) }
  }

  return (
    <>
      <div className="bg-slate-900/60 border border-white/10 rounded-xl overflow-hidden">
        <div className="bg-slate-800/60 px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-black px-1.5 py-0.5 rounded border text-amber-400 border-amber-400/40 bg-amber-400/5">B</span>
            <Wrench className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[10px] font-black uppercase tracking-widest text-white">Trabajo en Curso</span>
          </div>
          {esHoy && parteId && (
            <button
              onClick={() => { setFormB(initB()); setEditIdB(null); setModalOpen(true); }}
              className="flex items-center gap-1 px-2.5 py-1 rounded border border-[#6d9b7d]/30 bg-[#6d9b7d]/5 hover:bg-[#6d9b7d]/15 text-[#6d9b7d] text-[10px] font-black uppercase tracking-widest transition-all"
            >
              <Plus className="w-3 h-3" /> Añadir
            </button>
          )}
        </div>
        <div className="divide-y divide-white/5">
          {trabajos.length === 0 ? (
            <EmptyState texto="Sin trabajos registrados" />
          ) : (
            trabajos.map(e => (
              <EntradaRow
                key={e.id}
                hora={e.hora_inicio ? `${formatHora(e.hora_inicio)}–${formatHora(e.hora_fin)}` : formatHora(e.created_at)}
                titulo={e.tipo_trabajo}
                subtitulo={[
                  e.finca,
                  e.ambito === 'finca_completa' ? 'Finca completa' : e.parcelas?.join(', '),
                  e.num_operarios ? `${e.num_operarios} op.` : null,
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
              <span className="text-sm font-black uppercase tracking-widest text-amber-400">B · Trabajo en Curso</span>
              <button onClick={() => setModalOpen(false)} className="text-slate-500 hover:text-white text-lg leading-none">×</button>
            </div>
            <div className="p-5 space-y-4">
              <div><label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Tipo de trabajo *</label><input list="tipos-trabajo" value={formB.tipo_trabajo} onChange={e => setFormB(p => ({ ...p, tipo_trabajo: e.target.value }))} placeholder="Seleccionar o escribir..." className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:border-[#6d9b7d]/50 outline-none" /><datalist id="tipos-trabajo">{TIPOS_TRABAJO.map(t => <option key={t} value={t} />)}</datalist></div>
              <div><label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Finca</label><select value={formB.finca} onChange={e => setFormB(p => ({ ...p, finca: e.target.value }))} className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:border-[#6d9b7d]/50 outline-none"><option value="">— Sin especificar —</option>{FINCAS.map(f => <option key={f} value={f}>{f}</option>)}</select></div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Ámbito</label>
                <div className="flex gap-2">
                  {[{ value: 'finca_completa', label: 'Finca completa' }, { value: 'parcelas_concretas', label: 'Parcelas concretas' }].map(opt => (
                    <button key={opt.value} onClick={() => setFormB(p => ({ ...p, ambito: opt.value }))} className={`flex-1 py-2 rounded-lg border text-[11px] font-bold transition-colors ${formB.ambito === opt.value ? 'border-[#6d9b7d]/50 bg-[#6d9b7d]/10 text-[#6d9b7d]' : 'border-white/10 text-slate-400 hover:border-white/20'}`}>{opt.label}</button>
                  ))}
                </div>
              </div>
              {formB.ambito === 'parcelas_concretas' && <div><label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Parcelas (separadas por coma)</label><input type="text" value={formB.parcelas} onChange={e => setFormB(p => ({ ...p, parcelas: e.target.value }))} placeholder="S-01, S-02, S-03..." className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:border-[#6d9b7d]/50 outline-none" /></div>}
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Hora inicio</label><input type="time" value={formB.hora_inicio} onChange={e => setFormB(p => ({ ...p, hora_inicio: e.target.value }))} className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:border-[#6d9b7d]/50 outline-none" /></div>
                <div><label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Hora fin</label><input type="time" value={formB.hora_fin} onChange={e => setFormB(p => ({ ...p, hora_fin: e.target.value }))} className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:border-[#6d9b7d]/50 outline-none" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Nº Operarios</label><input type="number" min="0" value={formB.num_operarios} onChange={e => setFormB(p => ({ ...p, num_operarios: e.target.value }))} className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:border-[#6d9b7d]/50 outline-none" /></div>
                <div><label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Nombres</label><input type="text" value={formB.nombres_operarios} onChange={e => setFormB(p => ({ ...p, nombres_operarios: e.target.value }))} placeholder="Juan, Pedro..." className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:border-[#6d9b7d]/50 outline-none" /></div>
              </div>
              <div><label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Notas</label><AudioInput value={formB.notas} onChange={v => setFormB(p => ({ ...p, notas: v }))} placeholder="Observaciones del trabajo..." rows={3} /></div>
              <div className="grid grid-cols-2 gap-3">
                {[1, 2].map(n => (
                  <div key={n}><label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Foto {n}</label><label className="flex items-center gap-2 px-3 py-2.5 bg-slate-800 border border-white/10 rounded-lg cursor-pointer hover:border-[#6d9b7d]/30 transition-colors"><Camera className="w-4 h-4 text-slate-500 shrink-0" /><span className="text-[11px] text-slate-400 truncate">{n === 1 ? (formB.foto1?.name ?? 'Capturar / Subir') : (formB.foto2?.name ?? 'Capturar / Subir')}</span><input type="file" accept="image/*" capture="environment" className="sr-only" onChange={e => { const f = e.target.files?.[0] ?? null; setFormB(p => n === 1 ? { ...p, foto1: f } : { ...p, foto2: f }) }} /></label></div>
                ))}
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setModalOpen(false)} className="flex-1 py-2.5 rounded-lg border border-white/10 text-slate-400 text-sm hover:border-white/20 transition-colors">Cancelar</button>
                <button type="button" onClick={submitB} disabled={saving || !formB.tipo_trabajo} className="flex-1 py-2.5 rounded-lg bg-amber-500 text-amber-950 text-sm font-black hover:bg-amber-400 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {saving && <span className="w-3.5 h-3.5 border-2 border-amber-950/20 border-t-amber-950 rounded-full animate-spin" />} Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
})