import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, Truck, Tractor, Users, UserCheck,
  AlertTriangle, Plus, X, Camera, CheckCircle2, Clock,
  MapPin, ClipboardList, Briefcase, LogOut, ChevronLeft, ChevronRight,
  Calendar, Layers, Leaf,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import {
  useRegistrosTrabajos, useAddTrabajoRegistro,
  useIncidencias, useAddIncidencia, useUpdateIncidencia, useDeleteIncidencia,
  useKPIsTrabajos,
  usePlanificacionDia, useAddTrabajoPlanificado, useUpdateTrabajoPlanificado,
  useDeleteTrabajo, useUpdateEstadoTrabajo,
  usePlanificacionCampana, useAddPlanificacionCampana,
  useUpdatePlanificacionCampana, useDeletePlanificacionCampana,
  useCerrarJornada,
  TipoBloque, TrabajoRegistro, TrabajoRegistroPlanificado, TrabajoIncidencia, PlanificacionCampana,
  EstadoPlanificacion, Prioridad, EstadoCampana,
} from '../hooks/useTrabajos';
import { useParcelas, useAddPlanting, useAddHarvest, useCropCatalog } from '../hooks/useParcelData';
import { usePersonal, usePersonalExterno, useTiposTrabajoCatalogoPersonal, useAddTipoTrabajoCatalogo } from '../hooks/usePersonal';
import { useCatalogoLocal } from '@/hooks/useCatalogoLocal';
import { useTractores, useAperos } from '../hooks/useMaquinaria';
import { useProductosCatalogo } from '../hooks/useInventario';
import { SelectWithOther, AudioInput, PhotoAttachment, RecordActions } from '@/components/base';
import {
  generarPDFCorporativoBase,
  pdfCorporateSection,
  pdfCorporateTable,
  PDF_MARGIN,
} from '../utils/pdfUtils';
import { FINCAS_NOMBRES as FINCAS } from '../constants/farms';
import { TIPOS_TRABAJO } from '../constants/tiposTrabajo';
import { uploadImage, buildStoragePath } from '../utils/uploadImage';
import { formatFechaCorta } from '../utils/dateFormat';
import ModalCierreTrabajo from '@/components/ModalCierreTrabajo';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { FormError } from '@/components/base/FormError';
import { toast } from '@/hooks/use-toast';
import { PageShell } from '@/components/layout/PageShell';

// ── Constantes ───────────────────────────────────────────────

const INPUT = 'w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-[#6d9b7d]/50 focus:outline-none';

const PRIORIDAD_STYLES: Record<Prioridad, { border: string; text: string; label: string }> = {
  alta:  { border: 'border-red-500',    text: 'text-red-400',    label: 'ALTA' },
  media: { border: 'border-slate-500',  text: 'text-slate-400',  label: 'MEDIA' },
  baja:  { border: 'border-slate-600',  text: 'text-slate-500',  label: 'BAJA' },
};

const ESTADO_PLAN_STYLES: Record<EstadoPlanificacion, { border: string; text: string }> = {
  borrador:   { border: 'border-slate-500',  text: 'text-slate-400' },
  confirmado: { border: 'border-primary',   text: 'text-primary' },
  ejecutado:  { border: 'border-green-500',  text: 'text-green-400' },
  pendiente:  { border: 'border-red-500',    text: 'text-red-400' },
  cancelado:  { border: 'border-slate-600',  text: 'text-slate-500' },
};

// ── Esquemas Zod ─────────────────────────────────────────────
const trabajoSchema = z.object({
  fecha_planificada: z.string().min(1, 'La fecha es obligatoria'),
  finca: z.string().optional().nullable(),
  parcel_id: z.string().optional().nullable(),
  tipo_bloque: z.enum(['logistica', 'maquinaria_agricola', 'mano_obra_interna', 'mano_obra_externa']),
  tipo_trabajo: z.string().min(1, 'El tipo de trabajo es obligatorio'),
  recursos_personal: z.array(z.string()).default([]),
  tractor_id: z.string().optional().nullable(),
  apero_id: z.string().optional().nullable(),
  prioridad: z.enum(['alta', 'media', 'baja']),
  estado_planificacion: z.enum(['borrador', 'confirmado', 'ejecutado', 'pendiente', 'cancelado']),
  hora_inicio: z.string().optional().nullable(),
  hora_fin: z.string().optional().nullable(),
  notas: z.string().optional().nullable(),
}).refine(data => {
  if (data.hora_fin && !data.hora_inicio) return false;
  if (data.hora_inicio && data.hora_fin) return data.hora_inicio <= data.hora_fin;
  return true;
}, {
  message: "La hora de fin no puede ser anterior a la hora de inicio",
  path: ["hora_fin"]
});

type TrabajoFormValues = z.infer<typeof trabajoSchema>;

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
const BadgePrioridad = React.memo(function BadgePrioridad({ p }: { p: Prioridad | null }) {
  if (!p) return null;
  const s = PRIORIDAD_STYLES[p];
  return (
    <span className={`inline-block border rounded px-1.5 py-0.5 text-[8px] font-black tracking-widest ${s.border} ${s.text}`}>
      {s.label}
    </span>
  );
});

// ── Badge Estado ──────────────────────────────────────────────
const BadgeEstado = React.memo(function BadgeEstado({ e }: { e: EstadoPlanificacion | null }) {
  if (!e) return null;
  const s = ESTADO_PLAN_STYLES[e];
  return (
    <span className={`inline-block border rounded px-1.5 py-0.5 text-[8px] font-black tracking-widest uppercase ${s.border} ${s.text}`}>
      {e}
    </span>
  );
});

// ── Panel Estado Día ──────────────────────────────────────────
interface PanelDiaProps {
  fecha: string;
  onPrev: () => void;
  onNext: () => void;
  onCerrar: () => void;
}
const PanelDia = React.memo(function PanelDia({ fecha, onPrev, onNext, onCerrar }: PanelDiaProps) {
  const { data: trabajos = [] } = usePlanificacionDia(fecha);
  const esHoy = fecha === hoy();

  const confirmados = trabajos.filter(t => t.estado_planificacion === 'confirmado').length;
  const ejecutados  = trabajos.filter(t => t.estado_planificacion === 'ejecutado').length;
  const pendientes  = trabajos.filter(t => t.estado_planificacion === 'pendiente').length;
  const arrastrados = trabajos.filter(t => t.fecha_original && t.fecha_original !== t.fecha_planificada).length;

  return (
    <div className="rounded-xl border border-border bg-card p-4 mb-4">
      {/* Navegador fecha */}
      <div className="flex items-center justify-between mb-3">
        <button type="button" onClick={onPrev} className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="text-center">
          <p className="text-[11px] font-black text-foreground uppercase tracking-widest">{fmtFecha(fecha)}</p>
          {esHoy && <p className="text-[9px] text-primary font-black uppercase tracking-widest">Hoy</p>}
        </div>
        <button type="button" onClick={onNext} className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Contadores */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        {[
          { label: 'Confirmados', value: confirmados, color: 'text-primary' },
          { label: 'Ejecutados',  value: ejecutados,  color: 'text-green-400' },
          { label: 'Pendientes',  value: pendientes,  color: pendientes > 0 ? 'text-red-400' : 'text-slate-400' },
          { label: 'Arrastrados', value: arrastrados, color: arrastrados > 0 ? 'text-red-400' : 'text-slate-400' },
        ].map(k => (
          <div key={k.label} className="text-center">
            <p className={`text-xl font-black ${k.color}`}>{k.value}</p>
            <p className="text-[8px] text-muted-foreground uppercase tracking-wider">{k.label}</p>
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
});

// ── Modal Trabajo Planificado ─────────────────────────────────
interface ModalTrabajoPlanProps {
  fecha: string;
  editData?: TrabajoRegistro | null;
  onClose: () => void;
}

const ModalTrabajoPlan = React.memo(function ModalTrabajoPlan({ fecha, editData, onClose }: ModalTrabajoPlanProps) {
  const isEdit = !!editData;
  const { user } = useAuth();
  const currentUser = user?.email || 'sistema';

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<TrabajoFormValues>({
    resolver: zodResolver(trabajoSchema),
    defaultValues: {
      fecha_planificada: editData?.fecha_planificada ?? fecha,
      finca: editData?.finca ?? '',
      parcel_id: editData?.parcel_id ?? '',
      tipo_bloque: editData?.tipo_bloque ?? 'mano_obra_interna',
      tipo_trabajo: editData?.tipo_trabajo ?? '',
      recursos_personal: editData?.recursos_personal ?? [],
      tractor_id: editData?.tractor_id ?? '',
      apero_id: editData?.apero_id ?? '',
      prioridad: editData?.prioridad ?? 'media',
      estado_planificacion: editData?.estado_planificacion ?? 'borrador',
      hora_inicio: editData?.hora_inicio?.slice(0, 5) ?? '',
      hora_fin: editData?.hora_fin?.slice(0, 5) ?? '',
      notas: editData?.notas ?? '',
    }
  });

  const finca = watch('finca');
  const parcelId = watch('parcel_id');
  const tipoTrabajo = watch('tipo_trabajo');
  const personalSel = watch('recursos_personal');
  const tractorId = watch('tractor_id');
  const aperoId = watch('apero_id');
  const notas = watch('notas');

  const [materiales,   setMateriales]   = useState<{ nombre: string; cantidad: string }[]>(
    editData?.materiales_previstos && Array.isArray(editData.materiales_previstos) ? (editData.materiales_previstos as { nombre: string; cantidad: string }[]) : []
  );
  const [foto,         setFoto]         = useState<File | null>(null);
  const [matNombre,    setMatNombre]    = useState('');
  const [matCantidad,  setMatCantidad]  = useState('');
  const [saving,       setSaving]       = useState(false);

  const { data: parcelas  = [] } = useParcelas(finca || undefined);
  const { data: personal  = [] } = usePersonal();
  const { data: tractores = [] } = useTractores();
  /** Todos los aperos activos: filtrar solo por tractor dejaba el desplegable vacío si no hay asignación en BD. */
  const { data: aperosTodos = [] } = useAperos();
  const { data: tiposCat  = [] } = useTiposTrabajoCatalogoPersonal('');
  const addTipoCat = useAddTipoTrabajoCatalogo();

  const addMut    = useAddTrabajoPlanificado();
  const updateMut = useUpdateTrabajoPlanificado();

  const tiposOpciones = [...new Set([...TIPOS_TRABAJO, ...tiposCat.map(t => t.nombre)])];
  const personalActivo = personal.filter(p => p.activo);

  const aperosActivos = useMemo(() => {
    const list = aperosTodos.filter(a => a.activo);
    if (!tractorId) return list;
    return [...list].sort((a, b) => {
      const ma = a.tractor_id === tractorId ? 0 : 1;
      const mb = b.tractor_id === tractorId ? 0 : 1;
      if (ma !== mb) return ma - mb;
      return (a.tipo || '').localeCompare(b.tipo || '', 'es');
    });
  }, [aperosTodos, tractorId]);

  const addMaterial = () => {
    if (matNombre.trim()) {
      setMateriales(p => [...p, { nombre: matNombre.trim(), cantidad: matCantidad }]);
      setMatNombre(''); setMatCantidad('');
    }
  };

  const onSubmit = async (data: TrabajoFormValues) => {
    setSaving(true);
    try {
      let foto_url = editData?.foto_url ?? null;
      if (foto) foto_url = await uploadImage(foto, 'parcel-images', buildStoragePath('planificacion', foto));

      const payload = {
        tipo_bloque:          data.tipo_bloque,
        fecha:                data.fecha_planificada,
        hora_inicio:          data.hora_inicio || null,
        hora_fin:             data.hora_fin || null,
        finca:                data.finca || null,
        parcel_id:            data.parcel_id || null,
        tipo_trabajo:         data.tipo_trabajo,
        num_operarios:        data.recursos_personal.length || null,
        nombres_operarios:    data.recursos_personal.join(', ') || null,
        foto_url,
        notas:                data.notas || null,
        created_by:           currentUser,
        estado_planificacion: data.estado_planificacion,
        prioridad:            data.prioridad,
        fecha_planificada:    data.fecha_planificada,
        fecha_original:       editData?.fecha_original ?? null,
        recursos_personal:    data.recursos_personal.length > 0 ? data.recursos_personal : null,
        tractor_id:           data.tractor_id || null,
        apero_id:             data.apero_id || null,
        materiales_previstos: materiales.length > 0 ? materiales : null,
      };

      if (isEdit) {
        await updateMut.mutateAsync({ id: editData!.id, ...(payload as unknown as Parameters<typeof updateMut.mutateAsync>[0]) });
      } else {
        await addMut.mutateAsync(payload as unknown as Parameters<typeof addMut.mutateAsync>[0]);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-white/10 rounded-xl w-full max-w-md shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-white/10 shrink-0">
          <Calendar className="w-4 h-4 text-[#6d9b7d]" />
          <p className="flex-1 text-[11px] font-black text-white uppercase tracking-wider">
            {isEdit ? 'Editar trabajo' : 'Nuevo trabajo planificado'}
          </p>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-5 space-y-3 overflow-y-auto flex-1">
          {/* Fecha planificada */}
          <div>
            <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Fecha planificada</label>
            <input type="date" {...register('fecha_planificada')} className={INPUT} />
            <FormError message={errors.fecha_planificada?.message} />
          </div>

          {/* Finca */}
          <div>
            <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Finca</label>
            <SelectWithOther
              value={finca || ''}
              onChange={v => { setValue('finca', v, { shouldValidate: true }); setValue('parcel_id', '', { shouldValidate: true }); }}
              options={FINCAS}
              onCreateNew={(newFinca) => setValue('finca', newFinca, { shouldValidate: true })}
              placeholder="Seleccionar finca…"
            />
            <FormError message={errors.finca?.message} />
          </div>

          {/* Parcela cascada */}
          {finca && parcelas.length > 0 && (
            <div>
              <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Parcela</label>
              <SelectWithOther
                value={parcelId || ''}
                onChange={v => setValue('parcel_id', v, { shouldValidate: true })}
                options={parcelas.map(p => p.parcel_id)}
                onCreateNew={(newParcel) => setValue('parcel_id', newParcel, { shouldValidate: true })}
                placeholder="Finca completa"
              />
              <FormError message={errors.parcel_id?.message} />
            </div>
          )}

          {/* Tipo bloque */}
          <div>
            <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Tipo bloque</label>
            <select {...register('tipo_bloque')} className={INPUT}>
              <option value="mano_obra_interna">Mano Obra Interna</option>
              <option value="mano_obra_externa">Mano Obra Externa</option>
              <option value="maquinaria_agricola">Maquinaria Agrícola</option>
              <option value="logistica">Logística</option>
            </select>
            <FormError message={errors.tipo_bloque?.message} />
          </div>

          {/* Tipo trabajo */}
          <div>
            <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Tipo de trabajo *</label>
            <SelectWithOther
              value={tipoTrabajo || ''}
              onChange={v => setValue('tipo_trabajo', v, { shouldValidate: true })}
              options={tiposOpciones}
              onCreateNew={(newTipo) => {
                addTipoCat.mutate({ nombre: newTipo, categoria: 'general' });
                setValue('tipo_trabajo', newTipo, { shouldValidate: true });
              }}
              placeholder="Seleccionar tipo…"
            />
            <FormError message={errors.tipo_trabajo?.message} />
          </div>

          {/* Personal */}
          <div>
            <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">
              Personal asignado ({personalSel.length})
            </label>
            <SelectWithOther
              value=""
              onChange={v => { if (v && !personalSel.includes(v)) setValue('recursos_personal', [...personalSel, v], { shouldValidate: true }); }}
              options={personalActivo.map(p => p.nombre)}
              onCreateNew={(newPersonal) => { if (newPersonal && !personalSel.includes(newPersonal)) setValue('recursos_personal', [...personalSel, newPersonal], { shouldValidate: true }); }}
              placeholder="+ Añadir operario…"
            />
            {personalSel.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {personalSel.map(n => (
                  <span key={n} className="flex items-center gap-1 px-2 py-1 bg-slate-700 rounded-full text-[10px] text-white">
                    {n}
                    <button type="button" onClick={() => setValue('recursos_personal', personalSel.filter(x => x !== n), { shouldValidate: true })} className="text-slate-400 hover:text-red-400">×</button>
                  </span>
                ))}
              </div>
            )}
            <FormError message={errors.recursos_personal?.message} />
          </div>

          {/* Tractor / Apero */}
          <div>
            <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Tractor</label>
            <select
              value={tractorId || ''}
              onChange={e => { setValue('tractor_id', e.target.value || null, { shouldValidate: true }); setValue('apero_id', '', { shouldValidate: true }); }}
              className={INPUT}
            >
              <option value="">Sin tractor</option>
              {tractores.filter(t => t.activo).map(t => (
                <option key={t.id} value={t.id}>{t.matricula} — {t.marca}</option>
              ))}
            </select>
            <FormError message={errors.tractor_id?.message} />
          </div>
          {tractorId && (
            <div>
              <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Apero</label>
              <select
                value={aperoId || ''}
                onChange={e => setValue('apero_id', e.target.value || null, { shouldValidate: true })}
                className={INPUT}
              >
                <option value="">Sin apero</option>
                {aperosActivos.map(a => {
                  const mat = tractores.find(t => t.id === a.tractor_id)?.matricula;
                  const hint = a.tractor_id === tractorId ? ' (este tractor)' : mat ? ` (${mat})` : a.tractor_id ? '' : ' (sin tractor)';
                  return (
                    <option key={a.id} value={a.id}>
                      {a.codigo_interno ? `${a.codigo_interno} · ` : ''}{a.tipo}{a.descripcion ? ` — ${a.descripcion}` : ''}{hint}
                    </option>
                  );
                })}
              </select>
              {aperosActivos.length === 0 && (
                <p className="text-[9px] text-amber-400/90 mt-1">
                  No hay aperos activos en Maquinaria. Alta en el módulo Maquinaria → Aperos.
                </p>
              )}
              <FormError message={errors.apero_id?.message} />
            </div>
          )}

          {/* Materiales */}
          <div>
            <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Materiales previstos</label>
            <p className="text-[9px] text-slate-500 mb-2 leading-relaxed">
              Opcional: fitosanitarios, fertilizantes, semillas, carburante u otro consumo previsto. Indica nombre (o producto del inventario) y cantidad; se usarán al cerrar el trabajo.
            </p>
            <div className="flex gap-2">
              <input type="text" value={matNombre} onChange={e => setMatNombre(e.target.value)}
                placeholder="Producto…" className="flex-1 bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-[#6d9b7d]/50 focus:outline-none" />
              <input type="text" value={matCantidad} onChange={e => setMatCantidad(e.target.value)}
                placeholder="Cant." className="w-20 bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-[#6d9b7d]/50 focus:outline-none" />
              <button type="button" onClick={addMaterial} className="px-3 py-2 rounded-lg bg-slate-700 text-white text-[10px] font-black hover:bg-slate-600 transition-colors">+</button>
            </div>
            {materiales.length > 0 && (
              <div className="mt-2 space-y-1">
                {materiales.map((m, i) => (
                  <div key={i} className="flex items-center justify-between px-2 py-1.5 bg-slate-800 rounded-lg border border-white/10">
                    <span className="text-[10px] text-white">{m.nombre} {m.cantidad && `· ${m.cantidad}`}</span>
                    <button type="button" onClick={() => setMateriales(p => p.filter((_, j) => j !== i))} className="text-slate-500 hover:text-red-400 text-xs">×</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Prioridad */}
          <div>
            <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Prioridad</label>
            <select {...register('prioridad')} className={INPUT}>
              <option value="alta">Alta</option>
              <option value="media">Media</option>
              <option value="baja">Baja</option>
            </select>
            <FormError message={errors.prioridad?.message} />
          </div>

          {/* Estado planificación */}
          <div>
            <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Estado</label>
            <select {...register('estado_planificacion')} className={INPUT}>
              <option value="borrador">Borrador</option>
              <option value="confirmado">Confirmado</option>
              <option value="ejecutado">Ejecutado</option>
              <option value="pendiente">Pendiente</option>
              <option value="cancelado">Cancelado</option>
            </select>
            <FormError message={errors.estado_planificacion?.message} />
          </div>

          {/* Horas */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Hora inicio</label>
              <input type="time" {...register('hora_inicio')} className={INPUT} />
              <FormError message={errors.hora_inicio?.message} />
            </div>
            <div>
              <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Hora fin</label>
              <input type="time" {...register('hora_fin')} className={INPUT} />
              <FormError message={errors.hora_fin?.message} />
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Notas</label>
            <AudioInput value={notas || ''} onChange={v => setValue('notas', v, { shouldValidate: true })} rows={3} placeholder="Observaciones…" />
            <FormError message={errors.notas?.message} />
          </div>

          {/* Foto */}
          <div>
            <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Foto (opcional)</label>
            <PhotoAttachment value={foto ? URL.createObjectURL(foto) : editData?.foto_url} onChange={setFoto} />
          </div>
        </div>

        <div className="px-5 py-3 border-t border-white/10 flex gap-2 shrink-0">
          <button type="button" onClick={onClose}
            className="flex-1 py-2 rounded-lg border border-white/10 text-[10px] font-black text-slate-400 hover:text-white transition-colors uppercase tracking-widest"
          >Cancelar</button>
          <button type="button" onClick={(e) => { void handleSubmit(onSubmit)(e); }} disabled={saving}
            className="flex-1 py-2 rounded-lg bg-[#6d9b7d] text-[10px] font-black uppercase tracking-widest text-black transition-colors disabled:opacity-40"
          >
            {saving ? 'Guardando…' : isEdit ? 'Actualizar' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
});

// ── Tarjeta Trabajo Planificado ───────────────────────────────
const TarjetaTrabajoPlan = React.memo(function TarjetaTrabajoPlan({ t, onEdit, onCerrar }: { t: TrabajoRegistroPlanificado; onEdit: (t: TrabajoRegistroPlanificado) => void; onCerrar: (t: TrabajoRegistroPlanificado) => void }) {
  const deleteMut = useDeleteTrabajo();
  const yaEjecutado = t.estado_planificacion === 'ejecutado' || t.estado_planificacion === 'cancelado';

  return (
    <div className={`p-3 rounded-lg border border-white/10 bg-slate-800/40 space-y-2`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <BadgePrioridad p={t.prioridad} />
          <BadgeEstado e={t.estado_planificacion} />
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {!yaEjecutado && (
            <button
              onClick={() => onCerrar(t)}
              className="px-2 py-1 rounded bg-green-600/20 border border-green-500/30 text-[8px] font-black uppercase tracking-widest text-green-400 hover:bg-green-600/30 transition-colors"
            >
              Ejecutar
            </button>
          )}
          <RecordActions
            onEdit={() => onEdit(t)}
            onDelete={() => deleteMut.mutate(t.id)} 
            confirmMessage="Eliminar este trabajo"
          />
        </div>
      </div>
      <p className="text-[11px] font-bold text-white leading-tight">{t.tipo_trabajo}</p>
      <div className="flex flex-wrap gap-3">
        {t.finca && (
          <span className="flex items-center gap-1 text-[9px] text-slate-400">
            <MapPin className="w-2.5 h-2.5" />{t.finca}{t.parcel_id ? ` · ${t.parcel_id}` : ''}
          </span>
        )}
        {(t.maquinaria_tractores?.matricula || t.maquinaria_tractores?.marca) && (
          <span className="flex items-center gap-1 text-[9px] text-slate-400">
            <Tractor className="w-2.5 h-2.5" />
            {t.maquinaria_tractores?.matricula ?? '—'}
            {' — '}
            {t.maquinaria_tractores?.marca ?? '—'}
          </span>
        )}
        {(t.maquinaria_aperos?.tipo || t.maquinaria_aperos?.descripcion) && (
          <span className="flex items-center gap-1 text-[9px] text-slate-400">
            <Layers className="w-2.5 h-2.5" />
            {t.maquinaria_aperos?.tipo ?? '—'}
            {' — '}
            {t.maquinaria_aperos?.descripcion ?? '—'}
          </span>
        )}
        {(t.hora_inicio || t.hora_fin) && (
          <span className="flex items-center gap-1 text-[9px] text-slate-400">
            <Clock className="w-2.5 h-2.5" />
            {t.hora_inicio?.slice(11, 16) ?? ''}{t.hora_fin ? ` → ${t.hora_fin.slice(11, 16)}` : ''}
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
});

// ── Modal Campaña ─────────────────────────────────────────────
const ModalCampana = React.memo(function ModalCampana({ editData, onClose }: { editData?: PlanificacionCampana | null; onClose: () => void }) {
  const isEdit = !!editData;
  const { user } = useAuth();
  const currentUser = user?.email || 'sistema';
  const [finca,      setFinca]      = useState(editData?.finca ?? '');
  const [parcelId,   setParcelId]   = useState(editData?.parcel_id ?? '');
  const [superficieM2, setSuperficieM2] = useState(
    editData?.superficie_m2 != null && !Number.isNaN(editData.superficie_m2)
      ? String(editData.superficie_m2)
      : ''
  );
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
  }, [fPlantacion, cultivo, cultivos, fCosecha]);
  const handleSubmit = async () => {
    if (!finca.trim() || !cultivo.trim()) return;
    const supRaw = superficieM2.trim().replace(',', '.');
    let superficie_m2: number | null = null;
    if (supRaw !== '') {
      const n = Number(supRaw);
      if (!Number.isFinite(n) || n <= 0) {
        return;
      }
      superficie_m2 = n;
    }
    setSaving(true);
    try {
      const payload = {
        finca,
        parcel_id:                parcelId || null,
        superficie_m2,
        cultivo,
        fecha_prevista_plantacion: fPlantacion || null,
        fecha_estimada_cosecha:   fCosecha || null,
        recursos_estimados:       recursos || null,
        observaciones:            observaciones || null,
        estado,
        created_by:               currentUser,
      };
      if (isEdit) await updateMut.mutateAsync({ id: editData!.id, ...payload });
      else await addMut.mutateAsync(payload);
      onClose();
    } finally { setSaving(false); }
  };

  const catCultivos = useCatalogoLocal('trabajos_cultivos', cultivos.map(c => c.nombre_display));
  const cultivosOpciones = catCultivos.opciones;

  const supTrim = superficieM2.trim().replace(',', '.');
  const supInvalid =
    supTrim !== '' && (!Number.isFinite(Number(supTrim)) || Number(supTrim) <= 0);
  const guardarDeshabilitado = !finca.trim() || !cultivo.trim() || saving || supInvalid;

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
            <SelectWithOther value={finca} onChange={v => { setFinca(v); setParcelId(''); setSuperficieM2(''); }} onCreateNew={setFinca} options={FINCAS} placeholder="Seleccionar finca…" />
          </div>
          {finca && parcelas.length > 0 && (
            <div>
              <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Sector / parcela</label>
              <SelectWithOther
                value={parcelId}
                onChange={v => { setParcelId(v); setSuperficieM2(''); }}
                onCreateNew={v => { setParcelId(v); setSuperficieM2(''); }}
                options={parcelas.map(p => p.parcel_id)}
                placeholder="Finca completa"
              />
              <p className="text-[9px] text-slate-500 mt-1.5 leading-relaxed">
                Puedes crear <span className="text-slate-400">otra planificación</span> con el mismo sector y otro cultivo o fechas: cada línea es un reparto distinto (hortalizas, maduración o producto diferente).
              </p>
            </div>
          )}
          {parcelId.trim() !== '' && (
            <div>
              <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Superficie en este sector (m²)</label>
              <input
                type="text"
                inputMode="decimal"
                value={superficieM2}
                onChange={e => setSuperficieM2(e.target.value)}
                placeholder="Ej: 2500 o 0,35"
                className={INPUT}
              />
              <p className="text-[9px] text-slate-500 mt-1">Opcional si la línea es «finca completa». Metros cuadrados dedicados a <span className="text-slate-400">este</span> cultivo en el sector elegido.</p>
            </div>
          )}
          <div>
            <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Cultivo *</label>
            <SelectWithOther value={cultivo} onChange={setCultivo} onCreateNew={v => { catCultivos.addOpcion(v); setCultivo(v); }} options={cultivosOpciones} placeholder="Seleccionar cultivo…" />
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
          <button
            onClick={handleSubmit}
            disabled={guardarDeshabilitado}
            className="flex-1 py-2 rounded-lg bg-green-500 text-[10px] font-black uppercase tracking-widest text-black disabled:opacity-40"
          >{saving ? 'Guardando…' : isEdit ? 'Actualizar' : 'Guardar'}</button>
        </div>
      </div>
    </div>
  );
});

// ── Tarjeta Campaña ───────────────────────────────────────────
const TarjetaCampana = React.memo(function TarjetaCampana({ c, onEdit }: { c: PlanificacionCampana; onEdit: (c: PlanificacionCampana) => void }) {
  const deleteMut = useDeletePlanificacionCampana();
  const ESTADO_COLOR: Record<string, string> = {
    planificado: 'text-primary border-primary',
    en_curso:    'text-amber-400 border-amber-500',
    completado:  'text-green-400 border-green-500',
    cancelado:   'text-slate-500 border-slate-600',
  };
  return (
    <div className="p-3 rounded-lg border border-white/10 bg-slate-800/40 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-bold text-white">{c.cultivo}</p>
          <p className="text-[9px] text-slate-400">
            {c.finca}{c.parcel_id ? ` · ${c.parcel_id}` : ''}
            {c.superficie_m2 != null && Number(c.superficie_m2) > 0
              ? ` · ${Number(c.superficie_m2).toLocaleString('es-ES', { maximumFractionDigits: 2 })} m²`
              : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`border rounded px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest ${ESTADO_COLOR[c.estado] ?? 'text-slate-400 border-slate-500'}`}>
            {c.estado.replace('_', ' ')}
          </span>
          <RecordActions onEdit={() => onEdit(c)} onDelete={() => deleteMut.mutate(c.id)} confirmMessage="Eliminar campaña" />
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
});

// ── Modal Incidencia completo ─────────────────────────────────
const ModalIncidencia = React.memo(function ModalIncidencia({ editData, onClose }: { editData?: TrabajoIncidencia | null; onClose: () => void }) {
  const isEdit = !!editData;
  const { user } = useAuth();
  const currentUser = user?.email || 'sistema';
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
        created_by:  currentUser,
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
            created_by:           currentUser,
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
            <SelectWithOther value={finca} onChange={v => { setFinca(v); setParcelId(''); }} onCreateNew={(newFinca) => setFinca(newFinca)} options={FINCAS} placeholder="Sin finca específica" />
          </div>
          {finca && parcelas.length > 0 && (
            <div>
              <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Parcela</label>
              <SelectWithOther value={parcelId} onChange={setParcelId} onCreateNew={(newParcel) => setParcelId(newParcel)} options={parcelas.map(p => p.parcel_id)} placeholder="Finca completa" />
            </div>
          )}
          <div>
            <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Estado</label>
            <select value={estado} onChange={e => setEstado(e.target.value as 'abierta' | 'en_proceso' | 'resuelta')} className={INPUT}>
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
              Foto <span className="text-amber-500/70">(recomendada)</span>
            </label>
            <PhotoAttachment value={foto ? URL.createObjectURL(foto) : editData?.foto_url} onChange={setFoto} />
          </div>
        </div>
        <div className="px-5 py-3 border-t border-white/10 flex gap-2 shrink-0">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-white/10 text-[10px] font-black text-slate-400 hover:text-white uppercase tracking-widest">Cancelar</button>
          <button onClick={handleSubmit} disabled={!titulo.trim() || saving}
            className="flex-1 py-2 rounded-lg bg-amber-500 text-[10px] font-black uppercase tracking-widest text-black disabled:opacity-40"
          >{saving ? 'Guardando…' : isEdit ? 'Actualizar' : 'Registrar'}</button>
        </div>
      </div>
    </div>
  );
});

// ── Tarjeta Incidencia ────────────────────────────────────────
const TarjetaIncidencia = React.memo(function TarjetaIncidencia({ inc, onEdit }: { inc: TrabajoIncidencia; onEdit: (i: TrabajoIncidencia) => void }) {
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
          <RecordActions onEdit={() => onEdit(inc)} onDelete={() => deleteMut.mutate(inc.id)} confirmMessage="Eliminar incidencia" />
        </div>
      </div>
      {inc.finca && <span className="flex items-center gap-1 text-[9px] text-slate-400"><MapPin className="w-2.5 h-2.5" />{inc.finca}</span>}
      {inc.descripcion && <p className="text-[9px] text-slate-400">{inc.descripcion}</p>}
      {inc.foto_url && <img src={inc.foto_url} alt="foto" className="w-full max-h-28 object-cover rounded-lg opacity-80" />}
    </div>
  );
});

// ── Modal Cierre Resultado ────────────────────────────────────
interface CierreResultado {
  ejecutados: number;
  arrastrados: number;
  incidenciasNuevasTrabajo: number;
  pendientes: number;
  fechaMañana: string;
}
const ModalCierreResultado = React.memo(function ModalCierreResultado({ resultado, onClose, onVerMañana }: {
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
            className="flex-1 py-2 rounded-lg bg-[#6d9b7d] text-[10px] font-black uppercase tracking-widest text-black"
          >Ver planning de mañana</button>
        </div>
      </div>
    </div>
  );
});

// ── Componente principal ──────────────────────────────────────
type TabPrincipal = 'diaria' | 'campana' | 'incidencias';
type FiltroInc = 'todas' | 'urgentes' | 'no_urgentes';

export default function Trabajos() {
  const navigate  = useNavigate();
  const [tab,               setTab]               = useState<TabPrincipal>('diaria');
  const [fechaDia,          setFechaDia]          = useState(hoy());
  const [modalTrabajo,      setModalTrabajo]      = useState(false);
  const [editTrabajo,       setEditTrabajo]       = useState<TrabajoRegistro | null>(null);
  const [modalCampana,      setModalCampana]      = useState(false);
  const [editCampana,       setEditCampana]       = useState<PlanificacionCampana | null>(null);
  const [modalIncidencia,   setModalIncidencia]   = useState(false);
  const [editIncidencia,    setEditIncidencia]    = useState<TrabajoIncidencia | null>(null);
  const [trabajoCierre,     setTrabajoCierre]     = useState<TrabajoRegistro | null>(null);
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

  const handlePrevDia = useCallback(() => setFechaDia(d => addDays(d, -1)), []);
  const handleNextDia = useCallback(() => setFechaDia(d => addDays(d, 1)), []);

  const handleCerrarJornada = useCallback(async () => {
    if (!confirm(`¿Cerrar la jornada del ${fmtFecha(fechaDia)}?`)) return;
    const resultado = await cerrarJornada.mutateAsync(fechaDia);
    setCierreResultado(resultado as unknown as CierreResultado);
  }, [fechaDia, cerrarJornada]);

  const handleEditTrabajo = useCallback((t: TrabajoRegistro) => { setEditTrabajo(t); setModalTrabajo(true); }, []);
  const handleCloseTrabajo = useCallback(() => { setModalTrabajo(false); setEditTrabajo(null); }, []);

  const handleEditCampana = useCallback((c: PlanificacionCampana) => { setEditCampana(c); setModalCampana(true); }, []);
  const handleCloseCampana = useCallback(() => { setModalCampana(false); setEditCampana(null); }, []);

  const handleEditIncidencia = useCallback((i: TrabajoIncidencia) => { setEditIncidencia(i); setModalIncidencia(true); }, []);
  const handleCloseIncidencia = useCallback(() => { setModalIncidencia(false); setEditIncidencia(null); }, []);

  const handleCerrarTrabajo = useCallback((t: TrabajoRegistro) => { setTrabajoCierre(t); }, []);
  const handleCloseCierreTrabajo = useCallback(() => { setTrabajoCierre(null); }, []);

  const handleCloseCierre = useCallback(() => setCierreResultado(null), []);
  const handleVerManana = useCallback(() => {
    setCierreResultado(null);
    setFechaDia(d => addDays(d, 1));
    setTab('diaria');
  }, []);

  // ── PDF ───────────────────────────────────────────────────
  async function generarPDF() {
    const ref = new Date();
    const fs  = ref.toISOString().slice(0, 10);
    await generarPDFCorporativoBase({
      titulo: 'PLANIFICACIÓN DE TRABAJOS',
      subtitulo: 'Resumen planificación diaria, campaña e incidencias',
      fecha: ref,
      filename: `Planificacion_${fs}.pdf`,
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
    <PageShell.Root>

      <PageShell.Header className="pl-14 pr-4 py-2 flex flex-col gap-2 max-md:items-stretch md:flex-row md:items-center md:gap-3 text-foreground">
        <div className="flex items-center gap-3 min-w-0">
        <button onClick={() => navigate('/dashboard')} className="flex items-center gap-1.5 text-slate-400 hover:text-[#6d9b7d] transition-colors shrink-0">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-[9px] font-black uppercase tracking-widest">Dashboard</span>
        </button>
        <span className="text-slate-600 hidden sm:inline">|</span>
        <Briefcase className="w-4 h-4 text-amber-400 shrink-0" />
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-wider leading-tight">Planificación de Trabajos</p>
          <p className="text-[8px] text-slate-500 leading-tight">Gestión y seguimiento de trabajos diarios</p>
        </div>
        </div>

        <div className="flex items-center gap-2 max-md:w-full md:ml-auto">
          {incUrgentes > 0 && (
            <button onClick={() => setTab('incidencias')}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-[9px] font-black uppercase tracking-widest animate-pulse"
            >
              <AlertTriangle className="w-3 h-3" />{incUrgentes} urgente{incUrgentes > 1 ? 's' : ''}
            </button>
          )}
          <div className="relative" ref={pdfMenuRef}>
            <button type="button" onClick={() => setPdfMenuOpen(o => !o)} disabled={generandoPdf}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#6d9b7d]/20 bg-[#6d9b7d]/5 hover:bg-[#6d9b7d]/10 text-[#6d9b7d] text-[9px] font-black uppercase tracking-widest transition-colors disabled:opacity-50"
            >
              {generandoPdf ? <span className="w-3 h-3 border-2 border-[#6d9b7d]/20 border-t-[#6d9b7d] rounded-full animate-spin" /> : null}
              PDF {pdfMenuOpen ? '▲' : '▼'}
            </button>
            {pdfMenuOpen && (
              <div className="absolute right-0 top-full z-page-dropdown mt-1 min-w-[200px] rounded-lg border border-border bg-card text-foreground shadow-lg py-1">
                <button type="button" disabled={generandoPdf} onClick={async () => {
                  setPdfMenuOpen(false); setGenerandoPdf(true);
                  try {
                    await generarPDF();
                    toast({ title: 'PDF generado', description: 'Planificación descargada.' });
                  } catch (e) {
                    console.error('PDF trabajos:', e);
                    toast({
                      title: 'Error al generar el PDF',
                      description: e instanceof Error ? e.message : 'Inténtalo de nuevo.',
                      variant: 'destructive',
                    });
                  } finally {
                    setGenerandoPdf(false);
                  }
                }}
                  className="w-full px-3 py-2.5 text-left text-xs font-medium transition-colors disabled:opacity-50 hover:bg-muted"
                >Informe completo</button>
              </div>
            )}
          </div>
        </div>
      </PageShell.Header>

      <PageShell.Main maxWidth="wide" className="px-4 py-5">

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
          {[
            { label: 'Planificados hoy', value: trabajosDia.length,  color: '#6d9b7d' },
            { label: 'Inc. abiertas',    value: incAbiertas,          color: incAbiertas > 0 ? '#ef4444' : '#34d399' },
            { label: 'Urgentes',         value: incUrgentes,          color: incUrgentes > 0 ? '#ef4444' : '#64748b' },
          ].map(k => (
            <div key={k.label} className="bg-card border border-border rounded-xl p-3 text-center">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{k.label}</p>
              <p className="text-2xl font-black" style={{ color: k.color }}>{k.value}</p>
            </div>
          ))}
        </div>

        {/* TABS PRINCIPALES */}
        <div className="flex flex-wrap gap-1 mb-5 bg-card border border-border rounded-xl p-1">
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
              onPrev={handlePrevDia}
              onNext={handleNextDia}
              onCerrar={handleCerrarJornada}
            />

            <hr className="border-border mb-4" />

            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                {trabajosDia.length} trabajo{trabajosDia.length !== 1 ? 's' : ''} — {fmtFecha(fechaDia)}
              </p>
              <button
              onClick={() => { setEditTrabajo(null); setModalTrabajo(true); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#6d9b7d]/10 border border-[#6d9b7d]/30 text-[#6d9b7d] text-[9px] font-black uppercase tracking-widest hover:bg-[#6d9b7d]/20 transition-colors"
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
                    onEdit={handleEditTrabajo}
                    onCerrar={handleCerrarTrabajo}
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
                <TarjetaCampana key={c.id} c={c} onEdit={handleEditCampana} />
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
                <TarjetaIncidencia key={i.id} inc={i} onEdit={handleEditIncidencia} />
                ))}
              </div>
            )}
          </>
        )}
      </PageShell.Main>

      {/* MODALES */}
      {modalTrabajo && (
        <ModalTrabajoPlan
          fecha={fechaDia}
          editData={editTrabajo}
        onClose={handleCloseTrabajo}
        />
      )}
      {modalCampana && (
        <ModalCampana
          editData={editCampana}
        onClose={handleCloseCampana}
        />
      )}
      {modalIncidencia && (
        <ModalIncidencia
          editData={editIncidencia}
        onClose={handleCloseIncidencia}
        />
      )}
      {cierreResultado && (
        <ModalCierreResultado
          resultado={cierreResultado}
        onClose={handleCloseCierre}
        onVerMañana={handleVerManana}
        />
      )}
      {trabajoCierre && (
        <ModalCierreTrabajo
          trabajo={trabajoCierre}
          onClose={handleCloseCierreTrabajo}
        />
      )}
    </PageShell.Root>
  );
}
