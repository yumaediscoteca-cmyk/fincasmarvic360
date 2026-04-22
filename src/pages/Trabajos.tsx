import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, Truck, Tractor, Users, UserCheck,
  AlertTriangle, Plus, X, Camera, CheckCircle2, Clock,
  MapPin, ClipboardList, Briefcase, LogOut, ChevronLeft, ChevronRight,
  Calendar, Layers, Leaf,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import {
  useRegistrosTrabajos, useAddTrabajoRegistro,
  useIncidencias, useAddIncidencia, useUpdateIncidencia, useDeleteIncidencia,
  useKPIsTrabajos,
  usePlanificacionDia, useAddTrabajoPlanificado, useUpdateTrabajoPlanificado,
  useDeleteTrabajo, useUpdateEstadoPlanificacion,
  usePlanificacionCampana, useAddPlanificacionCampana,
  useUpdatePlanificacionCampana, useDeletePlanificacionCampana,
  useCerrarJornada,
  TipoBloque, TrabajoRegistro, TrabajoIncidencia, PlanificacionCampana,
  EstadoPlanificacion, Prioridad, EstadoCampana,
} from '../hooks/useTrabajos';
import { useParcelas, useAddPlanting, useAddHarvest, useCropCatalog } from '../hooks/useParcelData';
import { usePersonal, usePersonalExterno, useTiposTrabajoCatalogoPersonal } from '../hooks/usePersonal';
import { useTractores, useAperos } from '../hooks/useMaquinaria';
import { useProductosCatalogo } from '../hooks/useInventario';
import { SelectWithOther, AudioInput, PhotoAttachment, RecordActions } from '@/components/base';
import {
  generarPDFCorporativoBase,
  pdfCorporateSection,
  pdfCorporateTable,
  PDF_COLORS,
  PDF_MARGIN,
} from '../utils/pdfUtils';
import { FINCAS_NOMBRES as FINCAS } from '../constants/farms';
import { TIPOS_TRABAJO } from '../constants/tiposTrabajo';
import { uploadImage, buildStoragePath } from '../utils/uploadImage';
import { formatFechaCorta } from '../utils/dateFormat';

// ── Constantes ───────────────────────────────────────────────

const INPUT = 'w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-[#38bdf8]/50 focus:outline-none';

const PRIORIDAD_STYLES: Record<Prioridad, { border: string; text: string; label: string }> = {
  alta:  { border: 'border-red-500',    text: 'text-red-400',    label: 'ALTA' },
  media: { border: 'border-slate-500',  text: 'text-slate-400',  label: 'MEDIA' },
  baja:  { border: 'border-slate-600',  text: 'text-slate-500',  label: 'BAJA' },
};

const ESTADO_PLAN_STYLES: Record<EstadoPlanificacion, { border: string; text: string }> = {
  borrador:   { border: 'border-slate-500',  text: 'text-slate-400' },
  confirmado: { border: 'border-blue-500',   text: 'text-blue-400' },
  ejecutado:  { border: 'border-green-500',  text: 'text-green-400' },
  pendiente:  { border: 'border-red-500',    text: 'text-red-400' },
  cancelado:  { border: 'border-slate-600',  text: 'text-slate-500' },
};

function hoy(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(fecha: string, n: number): string {
  const d = new Date(fecha + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function fmtFecha(f: string): string {
  try { return new Date(f + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }); }
  catch { return f; }
}

// ── Badge Prioridad ───────────────────────────────────────────
function BadgePrioridad({ p }: { p: Prioridad | null }) {
  if (!p) return null;
  const s = PRIORIDAD_STYLES[p];
  return (
    <span className={`inline-block border rounded px-1.5 py-0.5 text-[8px] font-black tracking-widest ${s.border} ${s.text}`}>
      {s.label}
    </span>
  );
}

// ── Badge Estado ──────────────────────────────────────────────
function BadgeEstado({ e }: { e: EstadoPlanificacion | null }) {
  if (!e) return null;
  const s = ESTADO_PLAN_STYLES[e];
  return (
    <span className={`inline-block border rounded px-1.5 py-0.5 text-[8px] font-black tracking-widest uppercase ${s.border} ${s.text}`}>
      {e}
    </span>
  );
}

// ── Panel Estado Día ──────────────────────────────────────────
interface PanelDiaProps {
  fecha: string;
  onPrev: () => void;
  onNext: () => void;
  onCerrar: () => void;
  isDark: boolean;
}
function PanelDia({ fecha, onPrev, onNext, onCerrar, isDark }: PanelDiaProps) {
  const { data: trabajos = [] } = usePlanificacionDia(fecha);
  const esHoy = fecha === hoy();

  const confirmados = trabajos.filter(t => t.estado_planificacion === 'confirmado').length;
  const ejecutados  = trabajos.filter(t => t.estado_planificacion === 'ejecutado').length;
  const pendientes  = trabajos.filter(t => t.estado_planificacion === 'pendiente').length;
  const arrastrados = trabajos.filter(t => t.fecha_original && t.fecha_original !== t.fecha_planificada).length;

  return (
    <div className={`rounded-xl border p-4 mb-4 ${isDark ? 'bg-slate-900/60 border-white/10' : 'bg-white border-slate-200'}`}>
      {/* Navegador fecha */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={onPrev} className="p-1.5 rounded-lg border border-white/10 text-slate-400 hover:text-white transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="text-center">
          <p className="text-[11px] font-black text-white uppercase tracking-widest">{fmtFecha(fecha)}</p>
          {esHoy && <p className="text-[9px] text-[#38bdf8] font-black uppercase tracking-widest">Hoy</p>}
        </div>
        <button onClick={onNext} className="p-1.5 rounded-lg border border-white/10 text-slate-400 hover:text-white transition-colors">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Contadores */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        {[
          { label: 'Confirmados', value: confirmados, color: 'text-blue-400' },
          { label: 'Ejecutados',  value: ejecutados,  color: 'text-green-400' },
          { label: 'Pendientes',  value: pendientes,  color: pendientes > 0 ? 'text-red-400' : 'text-slate-400' },
          { label: 'Arrastrados', value: arrastrados, color: arrastrados > 0 ? 'text-red-400' : 'text-slate-400' },
        ].map(k => (
          <div key={k.label} className="text-center">
            <p className={`text-xl font-black ${k.color}`}>{k.value}</p>
            <p className="text-[8px] text-slate-500 uppercase tracking-wider">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Botón cerrar jornada */}
      {esHoy && (
        <button
          onClick={onCerrar}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-[10px] font-black uppercase tracking-widest hover:bg-red-500/20 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          Cerrar jornada
        </button>
      )}
    </div>
  );
}

// ── Modal Trabajo Planificado ─────────────────────────────────
interface ModalTrabajoPlanProps {
  fecha: string;
  editData?: TrabajoRegistro | null;
  onClose: () => void;
}

function ModalTrabajoPlan({ fecha, editData, onClose }: ModalTrabajoPlanProps) {
  const isEdit = !!editData;

  const [fechaPlan,    setFechaPlan]    = useState(editData?.fecha_planificada ?? fecha);
  const [finca,        setFinca]        = useState(editData?.finca ?? '');
  const [parcelId,     setParcelId]     = useState(editData?.parcel_id ?? '');
  const [tipoBloque,   setTipoBloque]   = useState<TipoBloque>(editData?.tipo_bloque ?? 'mano_obra_interna');
  const [tipoTrabajo,  setTipoTrabajo]  = useState(editData?.tipo_trabajo ?? '');
  const [personalSel,  setPersonalSel]  = useState<string[]>(editData?.recursos_personal ?? []);
  const [tractorId,    setTractorId]    = useState(editData?.tractor_id ?? '');
  const [aperoId,      setAperoId]      = useState(editData?.apero_id ?? '');
  const [materiales,   setMateriales]   = useState<{ nombre: string; cantidad: string }[]>(
    editData?.materiales_previstos ? (editData.materiales_previstos as { nombre: string; cantidad: string }[]) : []
  );
  const [prioridad,    setPrioridad]    = useState<Prioridad>(editData?.prioridad ?? 'media');
  const [estado,       setEstado]       = useState<EstadoPlanificacion>(editData?.estado_planificacion ?? 'borrador');
  const [notas,        setNotas]        = useState(editData?.notas ?? '');
  const [foto,         setFoto]         = useState<File | null>(null);
  const [horaInicio,   setHoraInicio]   = useState(editData?.hora_inicio?.slice(0, 5) ?? '');
  const [horaFin,      setHoraFin]      = useState(editData?.hora_fin?.slice(0, 5) ?? '');
  const [matNombre,    setMatNombre]    = useState('');
  const [matCantidad,  setMatCantidad]  = useState('');
  const [saving,       setSaving]       = useState(false);

  const { data: parcelas  = [] } = useParcelas(finca || undefined);
  const { data: personal  = [] } = usePersonal();
  const { data: tractores = [] } = useTractores();
  const { data: aperos    = [] } = useAperos(tractorId || undefined);
  const { data: tiposCat  = [] } = useTiposTrabajoCatalogoPersonal('');

  const addMut    = useAddTrabajoPlanificado();
  const updateMut = useUpdateTrabajoPlanificado();

  const tiposOpciones = [...new Set([...TIPOS_TRABAJO, ...tiposCat.map(t => t.nombre)])];
  const personalActivo = personal.filter(p => p.activo);

  const addMaterial = () => {
    if (matNombre.trim()) {
      setMateriales(p => [...p, { nombre: matNombre.trim(), cantidad: matCantidad }]);
      setMatNombre(''); setMatCantidad('');
    }
  };

  const handleSubmit = async () => {
    if (!tipoTrabajo.trim()) return;
    setSaving(true);
    try {
      let foto_url = editData?.foto_url ?? null;
      if (foto) foto_url = await uploadImage(foto, 'parcel-images', buildStoragePath('planificacion', foto));

      const payload = {
        tipo_bloque:          tipoBloque,
        fecha:                fechaPlan,
        hora_inicio:          horaInicio || null,
        hora_fin:             horaFin || null,
        finca:                finca || null,
        parcel_id:            parcelId || null,
        tipo_trabajo:         tipoTrabajo,
        num_operarios:        personalSel.length || null,
        nombres_operarios:    personalSel.join(', ') || null,
        foto_url,
        notas:                notas || null,
        created_by:           'JuanPe',
        estado_planificacion: estado,
        prioridad,
        fecha_planificada:    fechaPlan,
        fecha_original:       editData?.fecha_original ?? null,
        recursos_personal:    personalSel.length > 0 ? personalSel : null,
        tractor_id:           tractorId || null,
        apero_id:             aperoId || null,
        materiales_previstos: materiales.length > 0 ? materiales : null,
      };

      if (isEdit) {
        await updateMut.mutateAsync({ id: editData!.id, ...payload });
      } else {
        await addMut.mutateAsync(payload);
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-white/10 rounded-xl w-full max-w-md shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-white/10 shrink-0">
          <Calendar className="w-4 h-4 text-[#38bdf8]" />
          <p className="flex-1 text-[11px] font-black text-white uppercase tracking-wider">
            {isEdit ? 'Editar trabajo' : 'Nuevo trabajo planificado'}
          </p>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-5 space-y-3 overflow-y-auto flex-1">
          {/* Fecha planificada */}
          <div>
            <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Fecha planificada</label>
            <input type="date" value={fechaPlan} onChange={e => setFechaPlan(e.target.value)} className={INPUT} />
          </div>

          {/* Finca */}
          <div>
            <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Finca</label>
            <SelectWithOther
              value={finca}
              onChange={v => { setFinca(v); setParcelId(''); }}
              options={FINCAS}
              placeholder="Seleccionar finca…"
            />
          </div>

          {/* Parcela cascada */}
          {finca && parcelas.length > 0 && (
            <div>
              <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Parcela</label>
              <SelectWithOther
                value={parcelId}
                onChange={setParcelId}
                options={parcelas.map(p => p.parcel_id)}
                placeholder="Finca completa"
              />
            </div>
          )}

          {/* Tipo bloque */}
          <div>
            <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Tipo bloque</label>
            <select value={tipoBloque} onChange={e => setTipoBloque(e.target.value as TipoBloque)} className={INPUT}>
              <option value="mano_obra_interna">Mano Obra Interna</option>
              <option value="mano_obra_externa">Mano Obra Externa</option>
              <option value="maquinaria_agricola">Maquinaria Agrícola</option>
              <option value="logistica">Logística</option>
            </select>
          </div>

          {/* Tipo trabajo */}
          <div>
            <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Tipo de trabajo *</label>
            <SelectWithOther
              value={tipoTrabajo}
              onChange={setTipoTrabajo}
              options={tiposOpciones}
              placeholder="Seleccionar tipo…"
            />
          </div>

          {/* Personal */}
          <div>
            <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">
              Personal asignado ({personalSel.length})
            </label>
            <SelectWithOther
              value=""
              onChange={v => { if (v && !personalSel.includes(v)) setPersonalSel(p => [...p, v]); }}
              options={personalActivo.map(p => p.nombre)}
              placeholder="+ Añadir operario…"
            />
            {personalSel.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {personalSel.map(n => (
                  <span key={n} className="flex items-center gap-1 px-2 py-1 bg-slate-700 rounded-full text-[10px] text-white">
                    {n}
                    <button onClick={() => setPersonalSel(p => p.filter(x => x !== n))} className="text-slate-400 hover:text-red-400">×</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Tractor / Apero */}
          <div>
            <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Tractor</label>
            <SelectWithOther
              value={tractorId}
              onChange={v => { setTractorId(v); setAperoId(''); }}
              options={tractores.filter(t => t.activo).map(t => t.id)}
              optionLabels={Object.fromEntries(tractores.map(t => [t.id, `${t.matricula}${t.marca ? ' · ' + t.marca : ''}`]))}
              placeholder="Sin tractor"
            />
          </div>
          {tractorId && (
            <div>
              <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Apero</label>
              <SelectWithOther
                value={aperoId}
                onChange={setAperoId}
                options={aperos.filter(a => a.activo).map(a => a.id)}
                optionLabels={Object.fromEntries(aperos.map(a => [a.id, `${a.tipo}${a.descripcion ? ' · ' + a.descripcion : ''}`]))}
                placeholder="Sin apero"
              />
            </div>
          )}

          {/* Materiales */}
          <div>
            <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Materiales previstos</label>
            <div className="flex gap-2">
              <input type="text" value={matNombre} onChange={e => setMatNombre(e.target.value)}
                placeholder="Producto…" className="flex-1 bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-[#38bdf8]/50 focus:outline-none" />
              <input type="text" value={matCantidad} onChange={e => setMatCantidad(e.target.value)}
                placeholder="Cant." className="w-20 bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-[#38bdf8]/50 focus:outline-none" />
              <button onClick={addMaterial} className="px-3 py-2 rounded-lg bg-slate-700 text-white text-[10px] font-black hover:bg-slate-600 transition-colors">+</button>
            </div>
            {materiales.length > 0 && (
              <div className="mt-2 space-y-1">
                {materiales.map((m, i) => (
                  <div key={i} className="flex items-center justify-between px-2 py-1.5 bg-slate-800 rounded-lg border border-white/10">
                    <span className="text-[10px] text-white">{m.nombre} {m.cantidad && `· ${m.cantidad}`}</span>
                    <button onClick={() => setMateriales(p => p.filter((_, j) => j !== i))} className="text-slate-500 hover:text-red-400 text-xs">×</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Prioridad */}
          <div>
            <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Prioridad</label>
            <select value={prioridad} onChange={e => setPrioridad(e.target.value as Prioridad)} className={INPUT}>
              <option value="alta">Alta</option>
              <option value="media">Media</option>
              <option value="baja">Baja</option>
            </select>
          </div>

          {/* Estado planificación */}
          <div>
            <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Estado</label>
            <select value={estado} onChange={e => setEstado(e.target.value as EstadoPlanificacion)} className={INPUT}>
              <option value="borrador">Borrador</option>
              <option value="confirmado">Confirmado</option>
              <option value="ejecutado">Ejecutado</option>
              <option value="pendiente">Pendiente</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>

          {/* Horas */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Hora inicio</label>
              <input type="time" value={horaInicio} onChange={e => setHoraInicio(e.target.value)} className={INPUT} />
            </div>
            <div>
              <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Hora fin</label>
              <input type="time" value={horaFin} onChange={e => setHoraFin(e.target.value)} className={INPUT} />
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Notas</label>
            <AudioInput value={notas} onChange={setNotas} rows={3} placeholder="Observaciones…" />
          </div>

          {/* Foto */}
          <div>
            <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Foto (opcional)</label>
            <PhotoAttachment value={foto} onChange={setFoto} existingUrl={editData?.foto_url} />
          </div>
        </div>

        <div className="px-5 py-3 border-t border-white/10 flex gap-2 shrink-0">
          <button onClick={onClose}
            className="flex-1 py-2 rounded-lg border border-white/10 text-[10px] font-black text-slate-400 hover:text-white transition-colors uppercase tracking-widest"
          >Cancelar</button>
          <button onClick={handleSubmit} disabled={!tipoTrabajo.trim() || saving}
            className="flex-1 py-2 rounded-lg bg-[#38bdf8] text-[10px] font-black uppercase tracking-widest text-black transition-colors disabled:opacity-40"
          >
            {saving ? 'Guardando…' : isEdit ? 'Actualizar' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Tarjeta Trabajo Planificado ───────────────────────────────
function TarjetaTrabajoPlan({ t, onEdit }: { t: TrabajoRegistro; onEdit: () => void }) {
  const deleteMut = useDeleteTrabajo();
  const isDark = true;

  return (
    <div className={`p-3 rounded-lg border border-white/10 bg-slate-800/40 space-y-2`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <BadgePrioridad p={t.prioridad} />
          <BadgeEstado e={t.estado_planificacion} />
        </div>
        <RecordActions
          onEdit={onEdit}
          onDelete={() => deleteMut.mutate(t.id)}
          deleteConfirmText="Eliminar este trabajo"
        />
      </div>
      <p className="text-[11px] font-bold text-white leading-tight">{t.tipo_trabajo}</p>
      <div className="flex flex-wrap gap-3">
        {t.finca && (
          <span className="flex items-center gap-1 text-[9px] text-slate-400">
            <MapPin className="w-2.5 h-2.5" />{t.finca}{t.parcel_id ? ` · ${t.parcel_id}` : ''}
          </span>
        )}
        {(t.horaInicio || t.horaFin || t.hora_inicio || t.hora_fin) && (
          <span className="flex items-center gap-1 text-[9px] text-slate-400">
            <Clock className="w-2.5 h-2.5" />
            {t.hora_inicio?.slice(0, 5) ?? ''}{t.hora_fin ? ` → ${t.hora_fin.slice(0, 5)}` : ''}
          </span>
        )}
        {t.nombres_operarios && (
          <span className="flex items-center gap-1 text-[9px] text-slate-400">
            <Users className="w-2.5 h-2.5" />{t.nombres_operarios}
          </span>
        )}
      </div>
      {t.fecha_original && t.fecha_original !== t.fecha_planificada && (
        <p className="text-[8px] text-amber-400/80">Arrastrado desde {formatFechaCorta(t.fecha_original)}</p>
      )}
      {t.notas && <p className="text-[9px] text-slate-500 italic">{t.notas}</p>}
      {t.materiales_previstos && Array.isArray(t.materiales_previstos) && t.materiales_previstos.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {(t.materiales_previstos as { nombre: string; cantidad: string }[]).map((m, i) => (
            <span key={i} className="px-1.5 py-0.5 bg-slate-700 rounded text-[8px] text-slate-300">{m.nombre} {m.cantidad}</span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Modal Campaña ─────────────────────────────────────────────
function ModalCampana({ editData, onClose }: { editData?: PlanificacionCampana | null; onClose: () => void }) {
  const isEdit = !!editData;
  const [finca,      setFinca]      = useState(editData?.finca ?? '');
  const [parcelId,   setParcelId]   = useState(editData?.parcel_id ?? '');
  const [cultivo,    setCultivo]    = useState(editData?.cultivo ?? '');
  const [fPlantacion,setFPlantacion] = useState(editData?.fecha_prevista_plantacion ?? '');
  const [fCosecha,   setFCosecha]   = useState(editData?.fecha_estimada_cosecha ?? '');
  const [recursos,   setRecursos]   = useState(editData?.recursos_estimados ?? '');
  const [observaciones, setObservaciones] = useState(editData?.observaciones ?? '');
  const [estado,     setEstado]     = useState<EstadoCampana>(editData?.estado ?? 'planificado');
  const [saving,     setSaving]     = useState(false);

  const { data: parcelas = [] } = useParcelas(finca || undefined);
  const { data: cultivos  = [] } = useCropCatalog();
  const addMut    = useAddPlanificacionCampana();
  const updateMut = useUpdatePlanificacionCampana();

  // Auto-calcular fecha cosecha desde ciclo_dias del cultivo
  useEffect(() => {
    if (!fPlantacion || !cultivo) return;
    const cat = cultivos.find(c => c.nombre_interno === cultivo || c.nombre_display === cultivo);
    if (cat?.ciclo_dias && !fCosecha) {
      const d = new Date(fPlantacion + 'T12:00:00');
      d.setDate(d.getDate() + cat.ciclo_dias);
      setFCosecha(d.toISOString().slice(0, 10));
    }
  }, [fPlantacion, cultivo]);

  const handleSubmit = async () => {
    if (!finca.trim() || !cultivo.trim()) return;
    setSaving(true);
    try {
      const payload = {
        finca,
        parcel_id:                parcelId || null,
        cultivo,
        fecha_prevista_plantacion: fPlantacion || null,
        fecha_estimada_cosecha:   fCosecha || null,
        recursos_estimados:       recursos || null,
        observaciones:            observaciones || null,
        estado,
        created_by:               'JuanPe',
      };
      if (isEdit) await updateMut.mutateAsync({ id: editData!.id, ...payload });
      else await addMut.mutateAsync(payload);
      onClose();
    } finally { setSaving(false); }
  };

  const cultivosOpciones = cultivos.map(c => c.nombre_display);

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-white/10 rounded-xl w-full max-w-md shadow-2xl flex flex-col max-h-[92vh]">
        <div className="flex items-center gap-3 px-5 py-3 border-b border-white/10 shrink-0">
          <Leaf className="w-4 h-4 text-green-400" />
          <p className="flex-1 text-[11px] font-black text-white uppercase tracking-wider">
            {isEdit ? 'Editar campaña' : 'Nueva planificación campaña'}
          </p>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-3 overflow-y-auto flex-1">
          <div>
            <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Finca *</label>
            <SelectWithOther value={finca} onChange={v => { setFinca(v); setParcelId(''); }} options={FINCAS} placeholder="Seleccionar finca…" />
          </div>
          {finca && parcelas.length > 0 && (
            <div>
              <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Parcela</label>
              <SelectWithOther value={parcelId} onChange={setParcelId} options={parcelas.map(p => p.parcel_id)} placeholder="Finca completa" />
            </div>
          )}
          <div>
            <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Cultivo *</label>
            <SelectWithOther value={cultivo} onChange={setCultivo} options={cultivosOpciones} placeholder="Seleccionar cultivo…" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Plantación prevista</label>
              <input type="date" value={fPlantacion} onChange={e => setFPlantacion(e.target.value)} className={INPUT} />
            </div>
            <div>
              <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Cosecha estimada</label>
              <input type="date" value={fCosecha} onChange={e => setFCosecha(e.target.value)} className={INPUT} />
            </div>
          </div>
          <div>
            <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Recursos estimados</label>
            <AudioInput value={recursos} onChange={setRecursos} rows={2} placeholder="Personal, maquinaria…" />
          </div>
          <div>
            <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Observaciones</label>
            <AudioInput value={observaciones} onChange={setObservaciones} rows={2} placeholder="Notas adicionales…" />
          </div>
          <div>
            <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Estado</label>
            <select value={estado} onChange={e => setEstado(e.target.value as EstadoCampana)} className={INPUT}>
              <option value="planificado">Planificado</option>
              <option value="en_curso">En curso</option>
              <option value="completado">Completado</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>
        </div>
        <div className="px-5 py-3 border-t border-white/10 flex gap-2 shrink-0">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-white/10 text-[10px] font-black text-slate-400 hover:text-white uppercase tracking-widest">Cancelar</button>
          <button onClick={handleSubmit} disabled={!finca.trim() || !cultivo.trim() || saving}
            className="flex-1 py-2 rounded-lg bg-green-500 text-[10px] font-black uppercase tracking-widest text-black disabled:opacity-40"
          >{saving ? 'Guardando…' : isEdit ? 'Actualizar' : 'Guardar'}</button>
        </div>
      </div>
    </div>
  );
}

// ── Tarjeta Campaña ───────────────────────────────────────────
function TarjetaCampana({ c, onEdit }: { c: PlanificacionCampana; onEdit: () => void }) {
  const deleteMut = useDeletePlanificacionCampana();
  const ESTADO_COLOR: Record<string, string> = {
    planificado: 'text-blue-400 border-blue-500',
    en_curso:    'text-amber-400 border-amber-500',
    completado:  'text-green-400 border-green-500',
    cancelado:   'text-slate-500 border-slate-600',
  };
  return (
    <div className="p-3 rounded-lg border border-white/10 bg-slate-800/40 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-bold text-white">{c.cultivo}</p>
          <p className="text-[9px] text-slate-400">{c.finca}{c.parcel_id ? ` · ${c.parcel_id}` : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`border rounded px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest ${ESTADO_COLOR[c.estado] ?? 'text-slate-400 border-slate-500'}`}>
            {c.estado.replace('_', ' ')}
          </span>
          <RecordActions onEdit={onEdit} onDelete={() => deleteMut.mutate(c.id)} deleteConfirmText="Eliminar campaña" />
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        {c.fecha_prevista_plantacion && (
          <span className="text-[9px] text-slate-400">Plantación: {formatFechaCorta(c.fecha_prevista_plantacion)}</span>
        )}
        {c.fecha_estimada_cosecha && (
          <span className="text-[9px] text-slate-400">Cosecha: {formatFechaCorta(c.fecha_estimada_cosecha)}</span>
        )}
      </div>
      {c.observaciones && <p className="text-[9px] text-slate-500 italic">{c.observaciones}</p>}
    </div>
  );
}

// ── Modal Incidencia completo ─────────────────────────────────
function ModalIncidencia({ editData, onClose }: { editData?: TrabajoIncidencia | null; onClose: () => void }) {
  const isEdit = !!editData;
  const [urgente,    setUrgente]    = useState(editData?.urgente ?? false);
  const [titulo,     setTitulo]     = useState(editData?.titulo ?? '');
  const [descripcion,setDescripcion] = useState(editData?.descripcion ?? '');
  const [finca,      setFinca]      = useState(editData?.finca ?? '');
  const [parcelId,   setParcelId]   = useState(editData?.parcel_id ?? '');
  const [estado,     setEstado]     = useState(editData?.estado ?? 'abierta');
  const [fResolucion,setFResolucion] = useState(editData?.fecha_resolucion ?? '');
  const [notasResol, setNotasResol] = useState(editData?.notas_resolucion ?? '');
  const [foto,       setFoto]       = useState<File | null>(null);
  const [saving,     setSaving]     = useState(false);

  const { data: parcelas = [] } = useParcelas(finca || undefined);
  const addMut    = useAddIncidencia();
  const updateMut = useUpdateIncidencia();
  const addPlan   = useAddTrabajoPlanificado();

  const handleSubmit = async () => {
    if (!titulo.trim()) return;
    setSaving(true);
    try {
      let foto_url = editData?.foto_url ?? null;
      if (foto) foto_url = await uploadImage(foto, 'parcel-images', buildStoragePath('incidencias', foto));

      const payload = {
        urgente,
        titulo,
        descripcion: descripcion || null,
        finca:       finca || null,
        parcel_id:   parcelId || null,
        estado:      estado as 'abierta' | 'en_proceso' | 'resuelta',
        foto_url,
        fecha:       editData?.fecha ?? hoy(),
        fecha_resolucion: estado === 'resuelta' ? (fResolucion || hoy()) : null,
        notas_resolucion: estado === 'resuelta' ? (notasResol || null) : null,
        created_by:  'JuanPe',
      };

      if (isEdit) {
        await updateMut.mutateAsync({ id: editData!.id, ...payload });
      } else {
        await addMut.mutateAsync(payload);
        // Si urgente → crear trabajo planificado para mañana
        if (urgente) {
          await addPlan.mutateAsync({
            tipo_bloque:          'mano_obra_interna',
            fecha:                addDays(hoy(), 1),
            hora_inicio:          null,
            hora_fin:             null,
            finca:                finca || null,
            parcel_id:            parcelId || null,
            tipo_trabajo:         `Incidencia: ${titulo}`,
            num_operarios:        null,
            nombres_operarios:    null,
            foto_url:             null,
            notas:                descripcion || null,
            created_by:           'JuanPe',
            estado_planificacion: 'borrador',
            prioridad:            'alta',
            fecha_planificada:    addDays(hoy(), 1),
            fecha_original:       null,
            recursos_personal:    null,
            tractor_id:           null,
            apero_id:             null,
            materiales_previstos: null,
          });
        }
      }
      onClose();
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-white/10 rounded-xl w-full max-w-md shadow-2xl flex flex-col max-h-[92vh]">
        <div className="flex items-center gap-3 px-5 py-3 border-b border-white/10 shrink-0">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <p className="flex-1 text-[11px] font-black text-white uppercase tracking-wider">
            {isEdit ? 'Editar incidencia' : 'Nueva incidencia'}
          </p>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-3 overflow-y-auto flex-1">
          {/* Toggle urgente */}
          <div className="flex items-center gap-3 p-3 rounded-lg border border-white/10 bg-slate-800/50">
            <button onClick={() => setUrgente(p => !p)}
              className={`w-10 h-5 rounded-full relative transition-colors ${urgente ? 'bg-red-500' : 'bg-slate-600'}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${urgente ? 'left-5' : 'left-0.5'}`} />
            </button>
            <div>
              <p className="text-[10px] font-black text-white uppercase tracking-wider">{urgente ? 'URGENTE' : 'No urgente'}</p>
              <p className="text-[9px] text-slate-500">{urgente ? 'Generará trabajo para mañana' : 'Se resuelve en próximos días'}</p>
            </div>
          </div>
          <div>
            <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Título *</label>
            <input type="text" value={titulo} onChange={e => setTitulo(e.target.value)}
              placeholder="Descripción breve…" className={INPUT} />
          </div>
          <div>
            <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Descripción</label>
            <AudioInput value={descripcion} onChange={setDescripcion} rows={3} placeholder="Detalle adicional…" />
          </div>
          <div>
            <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Finca</label>
            <SelectWithOther value={finca} onChange={v => { setFinca(v); setParcelId(''); }} options={FINCAS} placeholder="Sin finca específica" />
          </div>
          {finca && parcelas.length > 0 && (
            <div>
              <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Parcela</label>
              <SelectWithOther value={parcelId} onChange={setParcelId} options={parcelas.map(p => p.parcel_id)} placeholder="Finca completa" />
            </div>
          )}
          <div>
            <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Estado</label>
            <select value={estado} onChange={e => setEstado(e.target.value)} className={INPUT}>
              <option value="abierta">Abierta</option>
              <option value="en_proceso">En proceso</option>
              <option value="resuelta">Resuelta</option>
            </select>
          </div>
          {estado === 'resuelta' && (
            <>
              <div>
                <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Fecha resolución</label>
                <input type="date" value={fResolucion} onChange={e => setFResolucion(e.target.value)} className={INPUT} />
              </div>
              <div>
                <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Notas resolución</label>
                <AudioInput value={notasResol} onChange={setNotasResol} rows={2} placeholder="Cómo se resolvió…" />
              </div>
            </>
          )}
          <div>
            <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">
              Foto {!isEdit && <span className="text-red-400">(obligatoria)</span>}
            </label>
            <PhotoAttachment value={foto} onChange={setFoto} existingUrl={editData?.foto_url} />
          </div>
        </div>
        <div className="px-5 py-3 border-t border-white/10 flex gap-2 shrink-0">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-white/10 text-[10px] font-black text-slate-400 hover:text-white uppercase tracking-widest">Cancelar</button>
          <button onClick={handleSubmit} disabled={!titulo.trim() || (!isEdit && !foto) || saving}
            className="flex-1 py-2 rounded-lg bg-amber-500 text-[10px] font-black uppercase tracking-widest text-black disabled:opacity-40"
          >{saving ? 'Guardando…' : isEdit ? 'Actualizar' : 'Registrar'}</button>
        </div>
      </div>
    </div>
  );
}

// ── Tarjeta Incidencia ────────────────────────────────────────
function TarjetaIncidencia({ inc, onEdit }: { inc: TrabajoIncidencia; onEdit: () => void }) {
  const deleteMut = useDeleteIncidencia();
  const colorEstado = inc.estado === 'resuelta' ? '#34d399' : inc.urgente ? '#ef4444' : '#f59e0b';
  return (
    <div className={`p-3 rounded-lg border bg-slate-800/40 space-y-1.5 ${inc.urgente && inc.estado !== 'resuelta' ? 'border-red-500/40' : 'border-white/10'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {inc.urgente && inc.estado !== 'resuelta' && <AlertTriangle className="w-3 h-3 text-red-400 shrink-0" />}
          <p className="text-[11px] font-bold text-white leading-tight">{inc.titulo}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border"
            style={{ color: colorEstado, borderColor: colorEstado + '60' }}>
            {inc.estado}
          </span>
          <RecordActions onEdit={onEdit} onDelete={() => deleteMut.mutate(inc.id)} deleteConfirmText="Eliminar incidencia" />
        </div>
      </div>
      {inc.finca && <span className="flex items-center gap-1 text-[9px] text-slate-400"><MapPin className="w-2.5 h-2.5" />{inc.finca}</span>}
      {inc.descripcion && <p className="text-[9px] text-slate-400">{inc.descripcion}</p>}
      {inc.foto_url && <img src={inc.foto_url} alt="foto" className="w-full max-h-28 object-cover rounded-lg opacity-80" />}
    </div>
  );
}

// ── Modal Cierre Resultado ────────────────────────────────────
interface CierreResultado {
  ejecutados: number;
  arrastrados: number;
  incidenciasNuevasTrabajo: number;
  pendientes: number;
  fechaMañana: string;
}
function ModalCierreResultado({ resultado, onClose, onVerMañana }: {
  resultado: CierreResultado;
  onClose: () => void;
  onVerMañana: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-white/10 rounded-xl w-full max-w-sm shadow-2xl">
        <div className="px-5 py-4 border-b border-white/10">
          <p className="text-[11px] font-black text-white uppercase tracking-wider">Jornada cerrada</p>
        </div>
        <div className="p-5 space-y-3">
          {[
            { label: 'Trabajos ejecutados',              value: resultado.ejecutados,                color: 'text-green-400' },
            { label: 'Trabajos arrastrados a mañana',    value: resultado.arrastrados,               color: resultado.arrastrados > 0 ? 'text-amber-400' : 'text-slate-400' },
            { label: 'Incidencias que generaron trabajo',value: resultado.incidenciasNuevasTrabajo,  color: resultado.incidenciasNuevasTrabajo > 0 ? 'text-red-400' : 'text-slate-400' },
            { label: 'Trabajos pendientes sin arrastrar', value: resultado.pendientes - resultado.arrastrados, color: 'text-slate-400' },
          ].map(k => (
            <div key={k.label} className="flex items-center justify-between">
              <span className="text-[10px] text-slate-400">{k.label}</span>
              <span className={`text-[14px] font-black ${k.color}`}>{k.value}</span>
            </div>
          ))}
        </div>
        <div className="px-5 py-3 border-t border-white/10 flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-white/10 text-[10px] font-black text-slate-400 hover:text-white uppercase tracking-widest">Cerrar</button>
          <button onClick={onVerMañana}
            className="flex-1 py-2 rounded-lg bg-[#38bdf8] text-[10px] font-black uppercase tracking-widest text-black"
          >Ver planning de mañana</button>
        </div>
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────
type TabPrincipal = 'diaria' | 'campana' | 'incidencias';
type FiltroInc = 'todas' | 'urgentes' | 'no_urgentes';

export default function Trabajos() {
  const navigate  = useNavigate();
  const { theme } = useTheme();
  const isDark    = theme === 'dark';

  const [tab,               setTab]               = useState<TabPrincipal>('diaria');
  const [fechaDia,          setFechaDia]          = useState(hoy());
  const [modalTrabajo,      setModalTrabajo]      = useState(false);
  const [editTrabajo,       setEditTrabajo]       = useState<TrabajoRegistro | null>(null);
  const [modalCampana,      setModalCampana]      = useState(false);
  const [editCampana,       setEditCampana]       = useState<PlanificacionCampana | null>(null);
  const [modalIncidencia,   setModalIncidencia]   = useState(false);
  const [editIncidencia,    setEditIncidencia]    = useState<TrabajoIncidencia | null>(null);
  const [filtroInc,         setFiltroInc]         = useState<FiltroInc>('todas');
  const [cierreResultado,   setCierreResultado]   = useState<CierreResultado | null>(null);
  const [pdfMenuOpen,       setPdfMenuOpen]       = useState(false);
  const [generandoPdf,      setGenerandoPdf]      = useState(false);
  const pdfMenuRef = useRef<HTMLDivElement>(null);

  const { data: kpis }          = useKPIsTrabajos();
  const { data: incidencias = [] } = useIncidencias();
  const { data: campanas = [] }  = usePlanificacionCampana();
  const { data: trabajosDia = [] } = usePlanificacionDia(fechaDia);
  const cerrarJornada = useCerrarJornada();

  const incAbiertas = incidencias.filter(i => i.estado !== 'resuelta').length;
  const incUrgentes = incidencias.filter(i => i.urgente && i.estado !== 'resuelta').length;

  const incFiltradas = useMemo(() => {
    if (filtroInc === 'urgentes')    return incidencias.filter(i => i.urgente && i.estado !== 'resuelta');
    if (filtroInc === 'no_urgentes') return incidencias.filter(i => !i.urgente);
    return incidencias;
  }, [incidencias, filtroInc]);

  useEffect(() => {
    if (!pdfMenuOpen) return;
    const onDown = (ev: MouseEvent) => {
      if (pdfMenuRef.current && !pdfMenuRef.current.contains(ev.target as Node)) setPdfMenuOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [pdfMenuOpen]);

  const handleCerrarJornada = async () => {
    if (!confirm(`¿Cerrar la jornada del ${fmtFecha(fechaDia)}?`)) return;
    const resultado = await cerrarJornada.mutateAsync(fechaDia);
    setCierreResultado(resultado);
  };

  // ── PDF ───────────────────────────────────────────────────
  async function generarPDF() {
    const ref = new Date();
    const fs  = ref.toISOString().slice(0, 10);
    await generarPDFCorporativoBase({
      titulo: 'PLANIFICACIÓN DE TRABAJOS',
      subtitulo: 'Resumen planificación diaria, campaña e incidencias',
      fecha: ref,
      filename: `Planificacion_${fs}.pdf`,
      accentColor: PDF_COLORS.amber,
      bloques: [
        ctx => {
          pdfCorporateSection(ctx, `Trabajos del día ${fechaDia}`);
          if (trabajosDia.length === 0) {
            ctx.checkPage(8); ctx.doc.setFontSize(9); ctx.doc.setTextColor(100, 116, 139);
            ctx.doc.text('Sin trabajos.', PDF_MARGIN, ctx.y); ctx.y += 6; return;
          }
          pdfCorporateTable(ctx,
            ['PRIORIDAD', 'TIPO TRABAJO', 'FINCA', 'PERSONAL', 'ESTADO'],
            [22, 56, 38, 40, 26],
            trabajosDia.map(t => [
              t.prioridad ?? '—', t.tipo_trabajo, t.finca ?? '—',
              t.nombres_operarios ?? '—', t.estado_planificacion ?? '—',
            ]));
        },
        ctx => {
          pdfCorporateSection(ctx, 'Planificación campaña');
          if (campanas.length === 0) {
            ctx.checkPage(8); ctx.doc.setFontSize(9); ctx.doc.setTextColor(100, 116, 139);
            ctx.doc.text('Sin campañas.', PDF_MARGIN, ctx.y); ctx.y += 6; return;
          }
          pdfCorporateTable(ctx,
            ['FINCA', 'CULTIVO', 'PLANTACIÓN', 'COSECHA', 'ESTADO'],
            [36, 40, 30, 30, 46],
            campanas.map(c => [
              c.finca, c.cultivo,
              c.fecha_prevista_plantacion ?? '—', c.fecha_estimada_cosecha ?? '—', c.estado,
            ]));
        },
        ctx => {
          pdfCorporateSection(ctx, 'Incidencias');
          if (incidencias.length === 0) {
            ctx.checkPage(8); ctx.doc.setFontSize(9); ctx.doc.setTextColor(100, 116, 139);
            ctx.doc.text('Sin incidencias.', PDF_MARGIN, ctx.y); ctx.y += 6; return;
          }
          pdfCorporateTable(ctx,
            ['FECHA', 'FINCA', 'TÍTULO', 'ESTADO', 'URGENTE'],
            [24, 34, 76, 28, 20],
            incidencias.map(i => [
              i.fecha, i.finca ?? '—', i.titulo, i.estado, i.urgente ? 'Sí' : 'No',
            ]));
        },
      ],
    });
  }

  return (
    <div className={`min-h-screen ${isDark ? 'bg-[#020617] text-white' : 'bg-slate-50 text-slate-900'} flex flex-col`}>

      {/* HEADER */}
      <header className={`w-full ${isDark ? 'bg-slate-900/80 border-white/10' : 'bg-white/90 border-slate-200'} border-b pl-14 pr-4 py-2 flex items-center gap-3 z-50`}>
        <button onClick={() => navigate('/dashboard')} className="flex items-center gap-1.5 text-slate-400 hover:text-[#38bdf8] transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-[9px] font-black uppercase tracking-widest">Dashboard</span>
        </button>
        <span className="text-slate-600">|</span>
        <Briefcase className="w-4 h-4 text-amber-400" />
        <div>
          <p className="text-[11px] font-black uppercase tracking-wider leading-tight">Planificación de Trabajos</p>
          <p className="text-[8px] text-slate-500 leading-tight">Gestión y seguimiento de trabajos diarios</p>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {incUrgentes > 0 && (
            <button onClick={() => setTab('incidencias')}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-[9px] font-black uppercase tracking-widest animate-pulse"
            >
              <AlertTriangle className="w-3 h-3" />{incUrgentes} urgente{incUrgentes > 1 ? 's' : ''}
            </button>
          )}
          <div className="relative" ref={pdfMenuRef}>
            <button type="button" onClick={() => setPdfMenuOpen(o => !o)} disabled={generandoPdf}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#38bdf8]/20 bg-[#38bdf8]/5 hover:bg-[#38bdf8]/10 text-[#38bdf8] text-[9px] font-black uppercase tracking-widest transition-colors disabled:opacity-50"
            >
              {generandoPdf ? <span className="w-3 h-3 border-2 border-[#38bdf8]/20 border-t-[#38bdf8] rounded-full animate-spin" /> : null}
              PDF {pdfMenuOpen ? '▲' : '▼'}
            </button>
            {pdfMenuOpen && (
              <div className={`absolute right-0 top-full z-[70] mt-1 min-w-[200px] rounded-lg border shadow-lg py-1 ${isDark ? 'border-slate-600 bg-slate-900 text-slate-100 shadow-black/40' : 'border-slate-200 bg-white text-slate-800'}`}>
                <button type="button" disabled={generandoPdf} onClick={async () => { setPdfMenuOpen(false); setGenerandoPdf(true); try { await generarPDF(); } finally { setGenerandoPdf(false); } }}
                  className={`w-full px-3 py-2.5 text-left text-xs font-medium transition-colors disabled:opacity-50 ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-50'}`}
                >Informe completo</button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-5 max-w-4xl mx-auto w-full">

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: 'Planificados hoy', value: trabajosDia.length,  color: '#38bdf8' },
            { label: 'Inc. abiertas',    value: incAbiertas,          color: incAbiertas > 0 ? '#ef4444' : '#34d399' },
            { label: 'Urgentes',         value: incUrgentes,          color: incUrgentes > 0 ? '#ef4444' : '#64748b' },
          ].map(k => (
            <div key={k.label} className={`${isDark ? 'bg-slate-900/60 border-white/10' : 'bg-white border-slate-200'} border rounded-xl p-3 text-center`}>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{k.label}</p>
              <p className="text-2xl font-black" style={{ color: k.color }}>{k.value}</p>
            </div>
          ))}
        </div>

        {/* TABS PRINCIPALES */}
        <div className={`flex gap-1 mb-5 ${isDark ? 'bg-slate-900/60 border-white/10' : 'bg-white border-slate-200'} border rounded-xl p-1`}>
          {([
            { id: 'diaria',      label: 'Planificación diaria', icon: Calendar },
            { id: 'campana',     label: 'Campaña',              icon: Leaf },
            { id: 'incidencias', label: 'Incidencias',          icon: AlertTriangle },
          ] as { id: TabPrincipal; label: string; icon: React.ElementType }[]).map(t => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors relative flex items-center justify-center gap-1.5 ${
                  active ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'text-slate-400 hover:text-slate-300'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />{t.label}
                {t.id === 'incidencias' && incAbiertas > 0 && (
                  <span className="ml-0.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-500 text-[8px] font-black text-white">{incAbiertas}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── TAB PLANIFICACIÓN DIARIA ── */}
        {tab === 'diaria' && (
          <>
            <PanelDia
              fecha={fechaDia}
              onPrev={() => setFechaDia(d => addDays(d, -1))}
              onNext={() => setFechaDia(d => addDays(d, 1))}
              onCerrar={handleCerrarJornada}
              isDark={isDark}
            />

            <hr className="border-white/10 mb-4" />

            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                {trabajosDia.length} trabajo{trabajosDia.length !== 1 ? 's' : ''} — {fmtFecha(fechaDia)}
              </p>
              <button
                onClick={() => { setEditTrabajo(null); setModalTrabajo(true); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#38bdf8]/10 border border-[#38bdf8]/30 text-[#38bdf8] text-[9px] font-black uppercase tracking-widest hover:bg-[#38bdf8]/20 transition-colors"
              >
                <Plus className="w-3 h-3" />Nuevo trabajo
              </button>
            </div>

            {trabajosDia.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Calendar className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs font-black uppercase tracking-widest">Sin trabajos planificados</p>
                <p className="text-[10px] mt-1">Añade trabajos para este día</p>
              </div>
            ) : (
              <div className="space-y-2">
                {trabajosDia.map(t => (
                  <TarjetaTrabajoPlan
                    key={t.id}
                    t={t}
                    onEdit={() => { setEditTrabajo(t); setModalTrabajo(true); }}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* ── TAB CAMPAÑA ── */}
        {tab === 'campana' && (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{campanas.length} campañas</p>
              <button
                onClick={() => { setEditCampana(null); setModalCampana(true); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-[9px] font-black uppercase tracking-widest hover:bg-green-500/20 transition-colors"
              >
                <Plus className="w-3 h-3" />Nueva campaña
              </button>
            </div>
            {campanas.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Leaf className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs font-black uppercase tracking-widest">Sin campañas planificadas</p>
              </div>
            ) : (
              <div className="space-y-2">
                {campanas.map(c => (
                  <TarjetaCampana key={c.id} c={c} onEdit={() => { setEditCampana(c); setModalCampana(true); }} />
                ))}
              </div>
            )}
          </>
        )}

        {/* ── TAB INCIDENCIAS ── */}
        {tab === 'incidencias' && (
          <>
            <div className="flex items-center justify-between mb-3">
              {/* Filtros */}
              <div className="flex gap-1 p-1 bg-slate-900/60 border border-white/10 rounded-lg">
                {(['todas', 'urgentes', 'no_urgentes'] as FiltroInc[]).map(f => (
                  <button key={f} onClick={() => setFiltroInc(f)}
                    className={`px-2.5 py-1 rounded text-[9px] font-black uppercase tracking-widest transition-colors ${filtroInc === f ? 'bg-amber-500/20 text-amber-400' : 'text-slate-400 hover:text-slate-300'}`}
                  >{f.replace('_', ' ')}</button>
                ))}
              </div>
              <button
                onClick={() => { setEditIncidencia(null); setModalIncidencia(true); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-[9px] font-black uppercase tracking-widest hover:bg-red-500/20 transition-colors"
              >
                <Plus className="w-3 h-3" />Nueva
              </button>
            </div>

            {incFiltradas.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs font-black uppercase tracking-widest">Sin incidencias</p>
              </div>
            ) : (
              <div className="space-y-2">
                {incFiltradas.map(i => (
                  <TarjetaIncidencia key={i.id} inc={i} onEdit={() => { setEditIncidencia(i); setModalIncidencia(true); }} />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* MODALES */}
      {modalTrabajo && (
        <ModalTrabajoPlan
          fecha={fechaDia}
          editData={editTrabajo}
          onClose={() => { setModalTrabajo(false); setEditTrabajo(null); }}
        />
      )}
      {modalCampana && (
        <ModalCampana
          editData={editCampana}
          onClose={() => { setModalCampana(false); setEditCampana(null); }}
        />
      )}
      {modalIncidencia && (
        <ModalIncidencia
          editData={editIncidencia}
          onClose={() => { setModalIncidencia(false); setEditIncidencia(null); }}
        />
      )}
      {cierreResultado && (
        <ModalCierreResultado
          resultado={cierreResultado}
          onClose={() => setCierreResultado(null)}
          onVerMañana={() => {
            setCierreResultado(null);
            setFechaDia(addDays(fechaDia, 1));
            setTab('diaria');
          }}
        />
      )}
    </div>
  );
}
