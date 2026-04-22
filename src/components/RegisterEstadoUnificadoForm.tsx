import { useState, useMemo, useRef } from 'react'
import { supabase } from '@/integrations/supabase/client'
import {
  useParcelas,
  useCropCatalog,
  useInsertPlanting,
  useInsertHarvest,
  useInsertAnalisisSuelo,
  useInsertLecturaSensor,
  useInsertAnalisisAgua,
} from '@/hooks/useParcelData'
import { toast } from '@/hooks/use-toast'
import { Camera, ChevronDown, ChevronUp } from 'lucide-react'
import { FINCAS_NOMBRES as FINCAS } from '@/constants/farms'
import { ESTADOS_PARCELA as ESTADOS } from '@/constants/estadosParcela'

const TEXTURAS = [
  'Arcilloso', 'Franco arcilloso', 'Franco', 'Franco arenoso', 'Arenoso', 'Limoso',
]

const FUENTES_AGUA = [
  'Pozo propio', 'Balsa de riego', 'Canal de riego', 'Red municipal', 'Río', 'Otra',
]

// ── Props ─────────────────────────────────────────────────────

interface Props {
  /** Si viene desde FarmMap con parcela ya seleccionada */
  parcelId?:   string
  farmName?:   string
  parcelName?: string
  onClose:     () => void
}

// ── Helpers ───────────────────────────────────────────────────

const num = (v: string) => v === '' ? undefined : parseFloat(v)
const int = (v: string) => v === '' ? undefined : parseInt(v)

async function uploadFoto(file: File, parcelId: string): Promise<string | null> {
  try {
    const ext  = file.name.split('.').pop() ?? 'jpg'
    const path = `estado/${parcelId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const { error } = await supabase.storage
      .from('parcel-images')
      .upload(path, file, { upsert: true })
    if (error) return null
    return supabase.storage.from('parcel-images').getPublicUrl(path).data.publicUrl
  } catch { return null }
}

// ── Componente principal ──────────────────────────────────────

export default function RegisterEstadoUnificadoForm({
  parcelId: propParcelId,
  farmName:  propFarmName,
  parcelName: propParcelName,
  onClose,
}: Props) {

  // ── Selector (sólo si no viene pre-seleccionado) ──
  const [selFinca,    setSelFinca]    = useState('')
  const [selParcelId, setSelParcelId] = useState('')

  const activeFinca   = propFarmName   || selFinca
  const activeParcelId = propParcelId  || selParcelId

  const { data: parcelas = [] }         = useParcelas(propFarmName ? undefined : selFinca || undefined)
  const { data: catalogo = [] }         = useCropCatalog()

  // ── Estado ────────────────────────────────────────
  const [estado,        setEstado]        = useState('')
  const [observaciones, setObservaciones] = useState('')

  // ── Plantación (si plantada / en_produccion) ──────
  const [cultivo,         setCultivo]         = useState('')
  const [variedad,        setVariedad]        = useState('')
  const [fechaPlantacion, setFechaPlantacion] = useState(new Date().toISOString().slice(0, 10))

  const cultivoObj = useMemo(() => catalogo.find(c => c.nombre_interno === cultivo) ?? null, [catalogo, cultivo])
  const cosechaEstimada = useMemo(() => {
    if (!fechaPlantacion || !cultivoObj) return ''
    const d = new Date(fechaPlantacion)
    d.setDate(d.getDate() + (cultivoObj.ciclo_dias ?? 90))
    return d.toISOString().slice(0, 10)
  }, [fechaPlantacion, cultivoObj])

  // ── Cosecha (si cosechada) ─────────────────────────
  const [cosechaCultivo, setCosechaCultivo] = useState('')
  const [cosechaKg,      setCosechaKg]      = useState('')
  const [cosechaFecha,   setCosechaFecha]   = useState(new Date().toISOString().slice(0, 10))

  // ── Análisis suelo (toggle) ───────────────────────
  const [showSuelo, setShowSuelo] = useState(false)
  const [suelo, setSuelo] = useState({
    ph: '', conductividad_ec: '', salinidad_ppm: '', temperatura_suelo: '',
    nitrogeno_ppm: '', fosforo_ppm: '', potasio_ppm: '', textura: '',
    materia_organica: '', sodio_ppm: '',
  })
  const setSu = (k: keyof typeof suelo, v: string) => setSuelo(p => ({ ...p, [k]: v }))

  // ── Análisis agua (toggle) ────────────────────────
  const [showAgua, setShowAgua] = useState(false)
  const [agua, setAgua] = useState({
    fuente: '', ph: '', conductividad_ec: '', salinidad_ppm: '',
  })
  const setAg = (k: keyof typeof agua, v: string) => setAgua(p => ({ ...p, [k]: v }))

  // ── Sensor NDVI/SPAD (toggle) ─────────────────────
  const [showSensor, setShowSensor] = useState(false)
  const [sensor, setSensor] = useState({
    indice_salud: '', nivel_estres: '', clorofila: '', ndvi: '',
  })
  const setSen = (k: keyof typeof sensor, v: string) => setSensor(p => ({ ...p, [k]: v }))

  // ── Foto ──────────────────────────────────────────
  const [foto,    setFoto]    = useState<File | null>(null)
  const [saving,  setSaving]  = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // ── Mutations ─────────────────────────────────────
  const mutPlanting = useInsertPlanting()
  const mutHarvest  = useInsertHarvest()
  const mutSuelo    = useInsertAnalisisSuelo()
  const mutSensor   = useInsertLecturaSensor()
  const mutAgua     = useInsertAnalisisAgua()

  // ── Submit ────────────────────────────────────────
  async function handleSubmit() {
    if (!activeParcelId) {
      toast({ title: 'Error', description: 'Selecciona una parcela', variant: 'destructive' })
      return
    }
    if (!estado) {
      toast({ title: 'Error', description: 'Selecciona el estado de la parcela', variant: 'destructive' })
      return
    }
    if (!foto) {
      toast({ title: 'Error', description: 'La foto es obligatoria', variant: 'destructive' })
      return
    }

    setSaving(true)
    const warnings: string[] = []

    try {
      // 1. Subir foto
      const foto_url = await uploadFoto(foto, activeParcelId)
      if (!foto_url) warnings.push('foto')

      // 2. Guardar estado + actualizar parcels
      const { error: errEstado } = await supabase
        .from('registros_estado_parcela')
        .insert({ parcel_id: activeParcelId, estado, observaciones: observaciones || null, foto_url })
      if (errEstado) warnings.push('estado')

      await supabase.from('parcels').update({ status: estado }).eq('parcel_id', activeParcelId)

      // 3. Plantación (si aplica)
      if ((estado === 'plantada' || estado === 'en_produccion') && cultivo) {
        try {
          await mutPlanting.mutateAsync({
            parcel_id:              activeParcelId,
            date:                   fechaPlantacion,
            crop:                   cultivo,
            variedad:               variedad || null,
            lote_semilla:           null,
            proveedor_semilla:      null,
            sistema_riego:          'goteo',
            num_plantas_real:       null,
            marco_cm_entre_lineas:  cultivoObj?.marco_std_entre_lineas_cm ?? null,
            marco_cm_entre_plantas: cultivoObj?.marco_std_entre_plantas_cm ?? null,
            fecha_cosecha_estimada: cosechaEstimada || null,
            notes:                  null,
          })
        } catch { warnings.push('plantación') }
      }

      // 4. Cosecha (si aplica)
      if (estado === 'cosechada' && cosechaCultivo) {
        try {
          await mutHarvest.mutateAsync({
            parcel_id:     activeParcelId,
            date:          cosechaFecha,
            crop:          cosechaCultivo,
            production_kg: cosechaKg ? parseFloat(cosechaKg) : null,
            notes:         null,
          })
        } catch { warnings.push('cosecha') }
      }

      // 5. Análisis suelo
      if (showSuelo && suelo.ph) {
        try {
          await mutSuelo.mutateAsync({
            parcel_id:        activeParcelId,
            ph:               num(suelo.ph),
            conductividad_ec: num(suelo.conductividad_ec),
            salinidad_ppm:    num(suelo.salinidad_ppm),
            temperatura_suelo:num(suelo.temperatura_suelo),
            materia_organica: num(suelo.materia_organica),
            sodio_ppm:        num(suelo.sodio_ppm),
            nitrogeno_ppm:    num(suelo.nitrogeno_ppm),
            fosforo_ppm:      num(suelo.fosforo_ppm),
            potasio_ppm:      num(suelo.potasio_ppm),
            textura:          suelo.textura ?? undefined,
            herramienta:      'Hanna HI9814 + LaMotte',
          })
        } catch { warnings.push('análisis suelo') }
      }

      // 6. Análisis agua
      if (showAgua && agua.fuente && activeFinca) {
        try {
          await mutAgua.mutateAsync({
            finca:            activeFinca,
            fuente:           agua.fuente,
            ph:               num(agua.ph),
            conductividad_ec: num(agua.conductividad_ec),
            salinidad_ppm:    num(agua.salinidad_ppm),
          })
        } catch { warnings.push('análisis agua') }
      }

      // 7. Sensor NDVI/SPAD
      if (showSensor && (sensor.indice_salud || sensor.ndvi || sensor.clorofila)) {
        try {
          await mutSensor.mutateAsync({
            parcel_id:   activeParcelId,
            indice_salud:num(sensor.indice_salud),
            nivel_estres: num(sensor.nivel_estres),
            clorofila:   num(sensor.clorofila),
            ndvi:        num(sensor.ndvi),
          })
        } catch { warnings.push('sensor') }
      }

      if (warnings.length > 0) {
        toast({ title: '⚠️ Guardado parcial', description: `Fallaron: ${warnings.join(', ')}` })
      } else {
        toast({ title: '✅ Registro guardado', description: `Parcela marcada como ${estado}` })
      }
      onClose()

    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  // ── Render ────────────────────────────────────────

  const inCls = `w-full bg-slate-800/60 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-[#38bdf8]/50 transition-colors`

  return (
    <div className="space-y-5">

      {/* ── PARCELA (sólo si no viene pre-seleccionada) ── */}
      {!propParcelId ? (
        <div className="space-y-3">
          <div>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.25em] mb-1">Finca</p>
            <select
              value={selFinca}
              onChange={e => { setSelFinca(e.target.value); setSelParcelId('') }}
              className={inCls}
            >
              <option value="">— Seleccionar finca —</option>
              {FINCAS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          {selFinca && parcelas.length > 0 && (
            <div>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.25em] mb-1">Parcela / Sector</p>
              <select
                value={selParcelId}
                onChange={e => setSelParcelId(e.target.value)}
                className={inCls}
              >
                <option value="">— Seleccionar parcela —</option>
                {parcelas.map(p => <option key={p.parcel_id} value={p.parcel_id}>{p.parcel_number}</option>)}
              </select>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-lg bg-slate-800/50 border border-[#38bdf8]/20 px-3 py-2">
          <p className="text-[9px] text-slate-500 uppercase tracking-wider">{propFarmName}</p>
          <p className="text-sm font-black text-[#38bdf8]">{propParcelName ?? propParcelId}</p>
        </div>
      )}

      {/* ── ESTADO ── */}
      <div>
        <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.25em] mb-2">Estado *</p>
        <div className="grid grid-cols-3 gap-2">
          {ESTADOS.map(e => (
            <button
              key={e.value}
              type="button"
              onClick={() => setEstado(e.value)}
              className={`py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                estado === e.value
                  ? 'bg-[#38bdf8] text-slate-900'
                  : 'bg-slate-800/60 border border-white/10 text-slate-300 hover:border-white/20'
              }`}
            >
              {e.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── PLANTACIÓN (plantada / en_produccion) ── */}
      {(estado === 'plantada' || estado === 'en_produccion') && (
        <div className="rounded-xl border border-yellow-400/20 bg-yellow-400/5 p-4 space-y-3">
          <p className="text-[9px] font-black text-yellow-400 uppercase tracking-[0.25em]">Datos de plantación</p>
          <div>
            <p className="text-[9px] text-slate-500 uppercase tracking-wide mb-1">Cultivo *</p>
            <select value={cultivo} onChange={e => setCultivo(e.target.value)} className={inCls}>
              <option value="">— Seleccionar cultivo —</option>
              {catalogo.map(c => <option key={c.nombre_interno} value={c.nombre_interno}>{c.nombre_display}</option>)}
            </select>
          </div>
          {cultivoObj && (
            <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-800/40 border border-white/5 p-2.5">
              <div>
                <p className="text-[9px] text-slate-500 uppercase">Ciclo</p>
                <p className="text-xs font-bold text-white">{cultivoObj.ciclo_dias} días</p>
              </div>
              <div>
                <p className="text-[9px] text-slate-500 uppercase">Cosecha est.</p>
                <p className="text-xs font-bold text-white">{cosechaEstimada || '—'}</p>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[9px] text-slate-500 uppercase tracking-wide mb-1">Fecha plantación</p>
              <input type="date" value={fechaPlantacion} onChange={e => setFechaPlantacion(e.target.value)} className={inCls} />
            </div>
            <div>
              <p className="text-[9px] text-slate-500 uppercase tracking-wide mb-1">Variedad</p>
              <input type="text" value={variedad} onChange={e => setVariedad(e.target.value)} placeholder="Ej: Ironman F1" className={inCls} />
            </div>
          </div>
        </div>
      )}

      {/* ── COSECHA ── */}
      {estado === 'cosechada' && (
        <div className="rounded-xl border border-red-400/20 bg-red-400/5 p-4 space-y-3">
          <p className="text-[9px] font-black text-red-400 uppercase tracking-[0.25em]">Datos de cosecha</p>
          <div>
            <p className="text-[9px] text-slate-500 uppercase tracking-wide mb-1">Cultivo cosechado *</p>
            <select value={cosechaCultivo} onChange={e => setCosechaCultivo(e.target.value)} className={inCls}>
              <option value="">— Seleccionar cultivo —</option>
              {catalogo.map(c => <option key={c.nombre_interno} value={c.nombre_interno}>{c.nombre_display}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[9px] text-slate-500 uppercase tracking-wide mb-1">Kg producidos</p>
              <input type="number" min="0" value={cosechaKg} onChange={e => setCosechaKg(e.target.value)} placeholder="0" className={inCls} />
            </div>
            <div>
              <p className="text-[9px] text-slate-500 uppercase tracking-wide mb-1">Fecha cosecha</p>
              <input type="date" value={cosechaFecha} onChange={e => setCosechaFecha(e.target.value)} className={inCls} />
            </div>
          </div>
        </div>
      )}

      {/* ── OBSERVACIONES ── */}
      <div>
        <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.25em] mb-1">Observaciones</p>
        <textarea
          rows={2}
          value={observaciones}
          onChange={e => setObservaciones(e.target.value)}
          placeholder="Estado visual, incidencias..."
          className={`${inCls} resize-none`}
        />
      </div>

      {/* ── ANÁLISIS SUELO (toggle) ── */}
      <div className="rounded-xl border border-white/10 overflow-hidden">
        <button
          type="button"
          onClick={() => setShowSuelo(p => !p)}
          className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-800/40 hover:bg-slate-800/60 transition-colors"
        >
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.25em]">📊 Análisis de suelo</span>
          {showSuelo ? <ChevronUp className="w-3.5 h-3.5 text-slate-500" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-500" />}
        </button>
        {showSuelo && (
          <div className="p-4 space-y-3 bg-slate-900/50">
            <p className="text-[9px] text-slate-500 uppercase tracking-wider">Hanna HI9814 + Kit LaMotte</p>
            <div className="grid grid-cols-2 gap-3">
              <div><p className="text-[9px] text-slate-500 mb-1">pH *</p><input type="number" step="0.1" placeholder="7.2" value={suelo.ph} onChange={e => setSu('ph', e.target.value)} className={inCls} /></div>
              <div><p className="text-[9px] text-slate-500 mb-1">EC (mS/cm)</p><input type="number" step="0.01" placeholder="1.25" value={suelo.conductividad_ec} onChange={e => setSu('conductividad_ec', e.target.value)} className={inCls} /></div>
              <div><p className="text-[9px] text-slate-500 mb-1">Salinidad (ppm)</p><input type="number" step="1" placeholder="800" value={suelo.salinidad_ppm} onChange={e => setSu('salinidad_ppm', e.target.value)} className={inCls} /></div>
              <div><p className="text-[9px] text-slate-500 mb-1">Temp. suelo (°C)</p><input type="number" step="0.1" placeholder="18.5" value={suelo.temperatura_suelo} onChange={e => setSu('temperatura_suelo', e.target.value)} className={inCls} /></div>
              <div><p className="text-[9px] text-slate-500 mb-1">N (ppm)</p><input type="number" step="1" placeholder="45" value={suelo.nitrogeno_ppm} onChange={e => setSu('nitrogeno_ppm', e.target.value)} className={inCls} /></div>
              <div><p className="text-[9px] text-slate-500 mb-1">P (ppm)</p><input type="number" step="1" placeholder="30" value={suelo.fosforo_ppm} onChange={e => setSu('fosforo_ppm', e.target.value)} className={inCls} /></div>
              <div><p className="text-[9px] text-slate-500 mb-1">K (ppm)</p><input type="number" step="1" placeholder="180" value={suelo.potasio_ppm} onChange={e => setSu('potasio_ppm', e.target.value)} className={inCls} /></div>
              <div>
                <p className="text-[9px] text-slate-500 mb-1">Textura</p>
                <select value={suelo.textura} onChange={e => setSu('textura', e.target.value)} className={inCls}>
                  <option value="">—</option>
                  {TEXTURAS.map(t => <option key={t} value={t.toLowerCase()}>{t}</option>)}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── ANÁLISIS AGUA (toggle) ── */}
      <div className="rounded-xl border border-white/10 overflow-hidden">
        <button
          type="button"
          onClick={() => setShowAgua(p => !p)}
          className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-800/40 hover:bg-slate-800/60 transition-colors"
        >
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.25em]">💧 Análisis de agua</span>
          {showAgua ? <ChevronUp className="w-3.5 h-3.5 text-slate-500" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-500" />}
        </button>
        {showAgua && (
          <div className="p-4 space-y-3 bg-slate-900/50">
            <div>
              <p className="text-[9px] text-slate-500 mb-1">Fuente de agua *</p>
              <select value={agua.fuente} onChange={e => setAg('fuente', e.target.value)} className={inCls}>
                <option value="">— Seleccionar —</option>
                {FUENTES_AGUA.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><p className="text-[9px] text-slate-500 mb-1">pH</p><input type="number" step="0.1" placeholder="7.0" value={agua.ph} onChange={e => setAg('ph', e.target.value)} className={inCls} /></div>
              <div><p className="text-[9px] text-slate-500 mb-1">EC (mS/cm)</p><input type="number" step="0.01" placeholder="0.8" value={agua.conductividad_ec} onChange={e => setAg('conductividad_ec', e.target.value)} className={inCls} /></div>
              <div><p className="text-[9px] text-slate-500 mb-1">Salinidad</p><input type="number" step="1" placeholder="500" value={agua.salinidad_ppm} onChange={e => setAg('salinidad_ppm', e.target.value)} className={inCls} /></div>
            </div>
          </div>
        )}
      </div>

      {/* ── SENSOR NDVI/SPAD (toggle) ── */}
      <div className="rounded-xl border border-white/10 overflow-hidden">
        <button
          type="button"
          onClick={() => setShowSensor(p => !p)}
          className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-800/40 hover:bg-slate-800/60 transition-colors"
        >
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.25em]">🌿 Sensor NDVI / SPAD</span>
          {showSensor ? <ChevronUp className="w-3.5 h-3.5 text-slate-500" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-500" />}
        </button>
        {showSensor && (
          <div className="p-4 space-y-3 bg-slate-900/50">
            <div className="grid grid-cols-2 gap-3">
              <div><p className="text-[9px] text-slate-500 mb-1">Índice salud (0-1)</p><input type="number" step="0.01" min="0" max="1" placeholder="0.75" value={sensor.indice_salud} onChange={e => setSen('indice_salud', e.target.value)} className={inCls} /></div>
              <div><p className="text-[9px] text-slate-500 mb-1">Nivel estrés (0-1)</p><input type="number" step="0.01" min="0" max="1" placeholder="0.2" value={sensor.nivel_estres} onChange={e => setSen('nivel_estres', e.target.value)} className={inCls} /></div>
              <div><p className="text-[9px] text-slate-500 mb-1">Clorofila (SPAD)</p><input type="number" step="0.1" placeholder="42.5" value={sensor.clorofila} onChange={e => setSen('clorofila', e.target.value)} className={inCls} /></div>
              <div><p className="text-[9px] text-slate-500 mb-1">NDVI (0-1)</p><input type="number" step="0.01" min="0" max="1" placeholder="0.65" value={sensor.ndvi} onChange={e => setSen('ndvi', e.target.value)} className={inCls} /></div>
            </div>
          </div>
        )}
      </div>

      {/* ── FOTO OBLIGATORIA ── */}
      <div>
        <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.25em] mb-2">
          Foto <span className="text-[#38bdf8]">*</span>
        </p>
        {foto ? (
          <div className="flex items-center gap-3 p-3 bg-slate-800/60 rounded-xl border border-white/10">
            <img src={URL.createObjectURL(foto)} alt="preview" className="w-16 h-16 object-cover rounded-lg shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-white truncate">{foto.name}</p>
              <p className="text-[10px] text-slate-500">{(foto.size / 1024).toFixed(0)} KB</p>
            </div>
            <button type="button" onClick={() => setFoto(null)} className="text-slate-500 hover:text-red-400 transition-colors text-lg">×</button>
          </div>
        ) : (
          <label className="flex items-center gap-3 p-3 bg-slate-800/40 rounded-xl border border-dashed border-white/20 cursor-pointer hover:border-[#38bdf8]/40 transition-colors">
            <Camera className="w-5 h-5 text-slate-500" />
            <span className="text-sm text-slate-400">Tomar foto o seleccionar</span>
            <input
              ref={fileRef}
              type="file" accept="image/*" capture="environment" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) setFoto(f) }}
            />
          </label>
        )}
      </div>

      {/* ── BOTONES ── */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 py-2.5 rounded-lg border border-white/10 text-[11px] font-black uppercase tracking-widest text-slate-400 hover:border-white/20 transition-colors"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving || !activeParcelId || !estado || !foto}
          className="flex-1 py-2.5 rounded-lg bg-[#38bdf8]/20 border border-[#38bdf8]/40 text-[11px] font-black uppercase tracking-widest text-[#38bdf8] hover:bg-[#38bdf8]/30 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {saving && <span className="w-3.5 h-3.5 border-2 border-[#38bdf8]/30 border-t-[#38bdf8] rounded-full animate-spin" />}
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>

    </div>
  )
}
