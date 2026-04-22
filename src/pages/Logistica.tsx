import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Truck, Users, Plus, X, FileText, MapPin, Clock,
  Fuel, Gauge, Calendar, Wrench, ChevronRight, Navigation,
  ChevronDown, Car, Phone,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import {
  useCamiones, useAddCamion, useUpdateCamion, useDeleteCamion,
  useVehiculosEmpresa, useAddVehiculoEmpresa, useUpdateVehiculoEmpresa, useDeleteVehiculoEmpresa,
  useViajes, useAddViaje, useUpdateViaje, useDeleteViaje,
  useMantenimientoCamion, useAddMantenimientoCamion, useUpdateMantenimientoCamion, useDeleteMantenimiento,
  useCombustible, useAddCombustible, useUpdateCombustible, useDeleteCombustible,
  useTiposTrabajoLogistica, useAddTipoTrabajoLogistica,
  useTiposMantenimientoLogistica,
  useKPIsLogistica,
  Camion, VehiculoEmpresa, Viaje, MantenimientoCamion, Combustible,
} from '../hooks/useLogistica';
import { usePersonal, Personal } from '../hooks/usePersonal';
import { useUbicaciones } from '../hooks/useInventario';
import { SelectWithOther, AudioInput, PhotoAttachment, RecordActions } from '@/components/base';
import { uploadImage, buildStoragePath } from '../utils/uploadImage';
import {
  generarPDFCorporativoBase,
  pdfCorporateSection,
  pdfCorporateTable,
  PDF_COLORS,
  PDF_MARGIN,
} from '../utils/pdfUtils';
import { FINCAS_NOMBRES as FINCAS } from '../constants/farms';

// ── Tipos ─────────────────────────────────────────────────────

type TabType = 'camiones' | 'vehiculos' | 'conductores' | 'viajes' | 'mantenimiento' | 'combustible';

// ── Constantes ────────────────────────────────────────────────

const INPUT  = 'w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-purple-400/50 focus:outline-none';
const LABEL  = 'block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1';

const MARCAS_CAMION   = ['MAN', 'Iveco', 'Volvo', 'DAF', 'Mercedes-Benz', 'Renault Trucks', 'Scania', 'FUSO'];
const MODELOS_CAMION  = ['TGM', 'TGS', 'Daily', 'Stralis', 'FH', 'XF', 'Actros', 'T-Series', 'S-Series'];
const MARCAS_VH       = ['Ford', 'Volkswagen', 'Mercedes-Benz', 'Renault', 'Toyota', 'Opel', 'Peugeot', 'Citroën', 'Fiat', 'Nissan', 'Mitsubishi', 'SEAT'];
const MODELOS_VH      = ['Transit', 'Crafter', 'Sprinter', 'Master', 'Hilux', 'L200', 'HiAce', 'Movano', 'Ducato', 'Jumper', 'Ranger'];
const TIPOS_CAMION    = ['Camión rígido', 'Camión articulado', 'Furgón isotermo', 'Camión plataforma', 'Volquete', 'Cisterna'];
const TIPOS_VH_OPTS   = [{ val: 'furgoneta', label: 'Furgoneta' }, { val: 'turismo', label: 'Turismo' }, { val: 'pick_up', label: 'Pick-up' }, { val: 'otro', label: 'Otro' }];
const EMPRESAS_TRANSP = ['Marvic', 'Transportes Rodríguez', 'Autónomo'];
const DESTINOS_PRESET = ['Nave Collados+Brazo Virgen', 'Cabezal La Barda', 'Nave Polígono La Barda', 'Nave La Concepción', 'Nave Lonsordo', 'Semillero', 'Oficina', 'Almería', 'Murcia', 'Valencia'];
const GASOLINERAS     = ['Repsol', 'BP', 'Cepsa', 'Shell', 'Total Energies', 'Galp', 'Plenoil', 'Carrefour', 'Valcarce'];
const TALLERES        = ['Taller oficial MAN', 'Taller oficial Iveco', 'Taller mecánico local', 'Concesionario oficial'];
const ESTADOS_OP      = ['disponible', 'en_uso', 'mantenimiento', 'baja'] as const;

const ESTADO_LABEL: Record<string, string> = {
  disponible: 'Disponible', en_uso: 'En uso', mantenimiento: 'En mantenimiento', baja: 'Baja',
};
const ESTADO_CLS: Record<string, string> = {
  disponible:   'text-green-400 border-green-400/60',
  en_uso:       'text-sky-400 border-sky-400/60',
  mantenimiento:'text-amber-400 border-amber-400/60',
  baja:         'text-red-400 border-red-400/60',
};

// ── Helpers ───────────────────────────────────────────────────

function itvDias(f: string | null): number | null {
  if (!f) return null;
  return Math.ceil((new Date(f).getTime() - Date.now()) / 86400000);
}

function fmtFecha(f: string | null): string {
  if (!f) return '—';
  try { return new Date(f).toLocaleDateString('es-ES'); } catch { return '—'; }
}

function fmtDatetime(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch { return '—'; }
}

function nombreDe(lista: Personal[], id: string | null): string {
  if (!id) return '—';
  return lista.find(p => p.id === id)?.nombre ?? '—';
}

function matriculaVehiculo(camiones: Camion[], vehiculos: VehiculoEmpresa[], id: string | null): string {
  if (!id) return '—';
  return camiones.find(c => c.id === id)?.matricula ?? vehiculos.find(v => v.id === id)?.matricula ?? '—';
}

function calcHoras(salida: string, llegada: string): number | null {
  if (!salida || !llegada) return null;
  const d = (new Date(llegada).getTime() - new Date(salida).getTime()) / 3600000;
  return d > 0 ? +d.toFixed(2) : null;
}

function mismoDia(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// ── Badge estado operativo ────────────────────────────────────

function BadgeEstado({ estado }: { estado: string | null }) {
  if (!estado) return null;
  const cls = ESTADO_CLS[estado] ?? 'text-slate-400 border-slate-400/60';
  return (
    <span className={`text-[8px] font-black uppercase tracking-widest border px-1.5 py-0.5 rounded ${cls}`}>
      {ESTADO_LABEL[estado] ?? estado}
    </span>
  );
}

// ── Modal Camión ──────────────────────────────────────────────

function ModalCamion({
  initial, ubicaciones, onClose,
}: {
  initial?: Camion;
  ubicaciones: { id: string; nombre: string }[];
  onClose: () => void;
}) {
  const addMut = useAddCamion();
  const updMut = useUpdateCamion();
  const isEdit = !!initial;

  const [form, setForm] = useState({
    matricula:                initial?.matricula ?? '',
    marca:                    initial?.marca ?? '',
    modelo:                   initial?.modelo ?? '',
    anio:                     String(initial?.anio ?? ''),
    capacidad_kg:             String(initial?.capacidad_kg ?? ''),
    tipo:                     initial?.tipo ?? '',
    empresa_transporte:       initial?.empresa_transporte ?? '',
    kilometros_actuales:      String(initial?.kilometros_actuales ?? ''),
    estado_operativo:         initial?.estado_operativo ?? 'disponible',
    fecha_itv:                initial?.fecha_itv ?? '',
    fecha_proxima_itv:        initial?.fecha_proxima_itv ?? '',
    fecha_proxima_revision:   initial?.fecha_proxima_revision ?? '',
    km_proximo_mantenimiento: String(initial?.km_proximo_mantenimiento ?? ''),
    gps_info:                 initial?.gps_info ?? '',
    notas_mantenimiento:      initial?.notas_mantenimiento ?? '',
    ubicacion_id:             '',
  });
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const fotoPreview = useMemo(
    () => fotoFile ? URL.createObjectURL(fotoFile) : (initial?.foto_url ?? null),
    [fotoFile, initial?.foto_url],
  );

  const handleSubmit = async () => {
    if (!form.matricula.trim()) return;
    let foto_url = initial?.foto_url ?? null;
    if (fotoFile) {
      foto_url = await uploadImage(fotoFile, 'parcel-images', buildStoragePath('logistica-camion', fotoFile)) ?? null;
    }
    const payload = {
      matricula:                form.matricula.toUpperCase().trim(),
      activo:                   initial?.activo ?? true,
      marca:                    form.marca || null,
      modelo:                   form.modelo || null,
      anio:                     form.anio ? Number(form.anio) : null,
      capacidad_kg:             form.capacidad_kg ? Number(form.capacidad_kg) : null,
      tipo:                     form.tipo || null,
      empresa_transporte:       form.empresa_transporte || null,
      kilometros_actuales:      form.kilometros_actuales ? Number(form.kilometros_actuales) : null,
      estado_operativo:         form.estado_operativo || null,
      fecha_itv:                form.fecha_itv || null,
      fecha_proxima_itv:        form.fecha_proxima_itv || null,
      fecha_proxima_revision:   form.fecha_proxima_revision || null,
      km_proximo_mantenimiento: form.km_proximo_mantenimiento ? Number(form.km_proximo_mantenimiento) : null,
      gps_info:                 null,
      notas_mantenimiento:      form.notas_mantenimiento || null,
      foto_url,
      created_by: 'JuanPe',
    };
    if (isEdit && initial) {
      await updMut.mutateAsync({ id: initial.id, ...payload });
    } else {
      await addMut.mutateAsync({ ...payload, ubicacion_id: form.ubicacion_id || null });
    }
    onClose();
  };

  const isPending = addMut.isPending || updMut.isPending;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-white/10 rounded-xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center gap-3 px-5 py-3 border-b border-white/10 shrink-0">
          <Truck className="w-5 h-5 text-purple-400" />
          <p className="flex-1 text-[11px] font-black text-white uppercase tracking-wider">
            {isEdit ? `Editar camión${initial!.codigo_interno ? ' · ' + initial!.codigo_interno : ''}` : 'Nuevo camión'}
          </p>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-3 overflow-y-auto flex-1">
          {isEdit && initial?.codigo_interno && (
            <div>
              <label className={LABEL}>Código interno</label>
              <input type="text" value={initial.codigo_interno} disabled className={INPUT + ' opacity-50 cursor-not-allowed'} />
            </div>
          )}
          <div>
            <label className={LABEL}>Matrícula *</label>
            <input type="text" value={form.matricula} onChange={e => set('matricula', e.target.value)}
              placeholder="1234 ABC" className={INPUT + ' uppercase'} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Marca</label>
              <SelectWithOther options={MARCAS_CAMION} value={form.marca} onChange={v => set('marca', v)} onCreateNew={v => set('marca', v)} placeholder="Seleccionar marca" />
            </div>
            <div>
              <label className={LABEL}>Modelo</label>
              <SelectWithOther options={MODELOS_CAMION} value={form.modelo} onChange={v => set('modelo', v)} onCreateNew={v => set('modelo', v)} placeholder="Seleccionar modelo" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Año</label>
              <input type="number" min="1990" max="2030" value={form.anio} onChange={e => set('anio', e.target.value)} placeholder="2020" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Capacidad (kg)</label>
              <input type="number" min="0" value={form.capacidad_kg} onChange={e => set('capacidad_kg', e.target.value)} placeholder="10000" className={INPUT} />
            </div>
          </div>
          <div>
            <label className={LABEL}>Tipo</label>
            <SelectWithOther options={TIPOS_CAMION} value={form.tipo} onChange={v => set('tipo', v)} onCreateNew={v => set('tipo', v)} placeholder="Seleccionar tipo" />
          </div>
          <div>
            <label className={LABEL}>Empresa de transporte</label>
            <SelectWithOther options={EMPRESAS_TRANSP} value={form.empresa_transporte} onChange={v => set('empresa_transporte', v)} onCreateNew={v => set('empresa_transporte', v)} placeholder="Seleccionar empresa" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Km actuales</label>
              <input type="number" min="0" value={form.kilometros_actuales} onChange={e => set('kilometros_actuales', e.target.value)} placeholder="0" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Estado operativo</label>
              <select value={form.estado_operativo} onChange={e => set('estado_operativo', e.target.value)} className={INPUT}>
                {ESTADOS_OP.map(s => <option key={s} value={s}>{ESTADO_LABEL[s]}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>ITV actual</label>
              <input type="date" value={form.fecha_itv} onChange={e => set('fecha_itv', e.target.value)} className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Próxima ITV</label>
              <input type="date" value={form.fecha_proxima_itv} onChange={e => set('fecha_proxima_itv', e.target.value)} className={INPUT} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Próxima revisión</label>
              <input type="date" value={form.fecha_proxima_revision} onChange={e => set('fecha_proxima_revision', e.target.value)} className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Km próx. mantenimiento</label>
              <input type="number" min="0" value={form.km_proximo_mantenimiento} onChange={e => set('km_proximo_mantenimiento', e.target.value)} placeholder="0" className={INPUT} />
            </div>
          </div>
          {!isEdit && (
            <div>
              <label className={LABEL}>Asignar a ubicación inventario</label>
              <SelectWithOther
                options={ubicaciones.map(u => u.nombre)}
                value={ubicaciones.find(u => u.id === form.ubicacion_id)?.nombre ?? ''}
                onChange={v => { const u = ubicaciones.find(x => x.nombre === v); if (u) set('ubicacion_id', u.id); }}
                onCreateNew={() => {}}
                placeholder="Sin asignación"
              />
            </div>
          )}
          <div>
            <label className={LABEL}>Foto</label>
            <PhotoAttachment value={fotoPreview} onChange={setFotoFile} />
          </div>
          <div>
            <label className={LABEL}>GPS</label>
            <input type="text" value="Conexión GPS — próximamente" disabled className={INPUT + ' opacity-40 cursor-not-allowed'} />
          </div>
          <AudioInput label="NOTAS MANTENIMIENTO" value={form.notas_mantenimiento} onChange={v => set('notas_mantenimiento', v)} rows={2} placeholder="Estado general, revisiones pendientes…" />
        </div>
        <div className="px-5 py-3 border-t border-white/10 flex gap-2 shrink-0">
          <button onClick={onClose} className="btn-secondary flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest">Cancelar</button>
          <button onClick={handleSubmit} disabled={!form.matricula || isPending}
            className="btn-primary flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest disabled:opacity-40">
            {isPending ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal Vehículo de empresa ─────────────────────────────────

function ModalVehiculo({
  initial, ubicaciones, conductores, onClose,
}: {
  initial?: VehiculoEmpresa;
  ubicaciones: { id: string; nombre: string }[];
  conductores: Personal[];
  onClose: () => void;
}) {
  const addMut = useAddVehiculoEmpresa();
  const updMut = useUpdateVehiculoEmpresa();
  const isEdit = !!initial;

  const [form, setForm] = useState({
    matricula:             initial?.matricula ?? '',
    marca:                 initial?.marca ?? '',
    modelo:                initial?.modelo ?? '',
    anio:                  String(initial?.anio ?? ''),
    tipo:                  initial?.tipo ?? 'furgoneta',
    conductor_habitual_id: initial?.conductor_habitual_id ?? '',
    km_actuales:           String(initial?.km_actuales ?? ''),
    estado_operativo:      initial?.estado_operativo ?? 'disponible',
    fecha_proxima_itv:     initial?.fecha_proxima_itv ?? '',
    fecha_proxima_revision:initial?.fecha_proxima_revision ?? '',
    gps_info:              initial?.gps_info ?? '',
    notas:                 initial?.notas ?? '',
    ubicacion_id:          '',
  });
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const fotoPreview = useMemo(
    () => fotoFile ? URL.createObjectURL(fotoFile) : (initial?.foto_url ?? null),
    [fotoFile, initial?.foto_url],
  );

  const handleSubmit = async () => {
    if (!form.matricula.trim()) return;
    let foto_url = initial?.foto_url ?? null;
    if (fotoFile) {
      foto_url = await uploadImage(fotoFile, 'parcel-images', buildStoragePath('logistica-vehiculo', fotoFile)) ?? null;
    }
    const payload = {
      matricula:             form.matricula.toUpperCase().trim(),
      marca:                 form.marca || null,
      modelo:                form.modelo || null,
      anio:                  form.anio ? Number(form.anio) : null,
      tipo:                  form.tipo || null,
      conductor_habitual_id: form.conductor_habitual_id ?? null,
      km_actuales:           form.km_actuales ? Number(form.km_actuales) : null,
      estado_operativo:      form.estado_operativo || null,
      fecha_proxima_itv:     form.fecha_proxima_itv || null,
      fecha_proxima_revision:form.fecha_proxima_revision || null,
      gps_info:              null,
      notas:                 form.notas || null,
      foto_url,
      created_by: 'JuanPe',
    };
    if (isEdit && initial) {
      await updMut.mutateAsync({ id: initial.id, ...payload });
    } else {
      await addMut.mutateAsync({ ...payload, ubicacion_id: form.ubicacion_id || null });
    }
    onClose();
  };

  const isPending = addMut.isPending || updMut.isPending;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-white/10 rounded-xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center gap-3 px-5 py-3 border-b border-white/10 shrink-0">
          <Car className="w-5 h-5 text-purple-400" />
          <p className="flex-1 text-[11px] font-black text-white uppercase tracking-wider">
            {isEdit ? `Editar vehículo${initial!.codigo_interno ? ' · ' + initial!.codigo_interno : ''}` : 'Nuevo vehículo de empresa'}
          </p>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-3 overflow-y-auto flex-1">
          {isEdit && initial?.codigo_interno && (
            <div>
              <label className={LABEL}>Código interno</label>
              <input type="text" value={initial.codigo_interno} disabled className={INPUT + ' opacity-50 cursor-not-allowed'} />
            </div>
          )}
          <div>
            <label className={LABEL}>Matrícula *</label>
            <input type="text" value={form.matricula} onChange={e => set('matricula', e.target.value)}
              placeholder="1234 ABC" className={INPUT + ' uppercase'} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Marca</label>
              <SelectWithOther options={MARCAS_VH} value={form.marca} onChange={v => set('marca', v)} onCreateNew={v => set('marca', v)} placeholder="Seleccionar marca" />
            </div>
            <div>
              <label className={LABEL}>Modelo</label>
              <SelectWithOther options={MODELOS_VH} value={form.modelo} onChange={v => set('modelo', v)} onCreateNew={v => set('modelo', v)} placeholder="Seleccionar modelo" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Año</label>
              <input type="number" min="1990" max="2030" value={form.anio} onChange={e => set('anio', e.target.value)} placeholder="2020" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Tipo</label>
              <select value={form.tipo} onChange={e => set('tipo', e.target.value)} className={INPUT}>
                {TIPOS_VH_OPTS.map(o => <option key={o.val} value={o.val}>{o.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className={LABEL}>Conductor habitual</label>
            <SelectWithOther
              options={conductores.map(c => c.nombre)}
              value={conductores.find(c => c.id === form.conductor_habitual_id)?.nombre ?? ''}
              onChange={v => { const c = conductores.find(x => x.nombre === v); set('conductor_habitual_id', c?.id ?? ''); }}
              onCreateNew={() => {}}
              placeholder="Sin asignación"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Km actuales</label>
              <input type="number" min="0" value={form.km_actuales} onChange={e => set('km_actuales', e.target.value)} placeholder="0" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Estado operativo</label>
              <select value={form.estado_operativo} onChange={e => set('estado_operativo', e.target.value)} className={INPUT}>
                {ESTADOS_OP.map(s => <option key={s} value={s}>{ESTADO_LABEL[s]}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Próxima ITV</label>
              <input type="date" value={form.fecha_proxima_itv} onChange={e => set('fecha_proxima_itv', e.target.value)} className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Próxima revisión</label>
              <input type="date" value={form.fecha_proxima_revision} onChange={e => set('fecha_proxima_revision', e.target.value)} className={INPUT} />
            </div>
          </div>
          {!isEdit && (
            <div>
              <label className={LABEL}>Asignar a ubicación inventario</label>
              <SelectWithOther
                options={ubicaciones.map(u => u.nombre)}
                value={ubicaciones.find(u => u.id === form.ubicacion_id)?.nombre ?? ''}
                onChange={v => { const u = ubicaciones.find(x => x.nombre === v); if (u) set('ubicacion_id', u.id); }}
                onCreateNew={() => {}}
                placeholder="Sin asignación"
              />
            </div>
          )}
          <div>
            <label className={LABEL}>Foto</label>
            <PhotoAttachment value={fotoPreview} onChange={setFotoFile} />
          </div>
          <div>
            <label className={LABEL}>GPS</label>
            <input type="text" value="Datos GPS — próximamente" disabled className={INPUT + ' opacity-40 cursor-not-allowed'} />
          </div>
          <AudioInput label="NOTAS" value={form.notas} onChange={v => set('notas', v)} rows={2} placeholder="Observaciones, estado general…" />
        </div>
        <div className="px-5 py-3 border-t border-white/10 flex gap-2 shrink-0">
          <button onClick={onClose} className="btn-secondary flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest">Cancelar</button>
          <button onClick={handleSubmit} disabled={!form.matricula || isPending}
            className="btn-primary flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest disabled:opacity-40">
            {isPending ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal Viaje ───────────────────────────────────────────────

function ModalViaje({
  initial, camiones, vehiculos, conductores, tiposTrabajo, onAddTipoTrabajo, onClose,
}: {
  initial?: Viaje;
  camiones: Camion[];
  vehiculos: VehiculoEmpresa[];
  conductores: Personal[];
  tiposTrabajo: { id: string; nombre: string }[];
  onAddTipoTrabajo: (nombre: string) => void;
  onClose: () => void;
}) {
  const addMut = useAddViaje();
  const updMut = useUpdateViaje();
  const isEdit = !!initial;

  const destinos = [...FINCAS, ...DESTINOS_PRESET];

  const [form, setForm] = useState({
    personal_id:           initial?.personal_id ?? '',
    camion_id:             initial?.camion_id ?? '',
    finca:                 initial?.finca ?? '',
    destino:               initial?.destino ?? '',
    trabajo_realizado:     initial?.trabajo_realizado ?? '',
    ruta:                  initial?.ruta ?? '',
    hora_salida:           initial?.hora_salida ? initial.hora_salida.slice(0, 16) : new Date().toISOString().slice(0, 16),
    hora_llegada:          initial?.hora_llegada ? initial.hora_llegada.slice(0, 16) : '',
    gasto_gasolina_litros: String(initial?.gasto_gasolina_litros ?? ''),
    gasto_gasolina_euros:  String(initial?.gasto_gasolina_euros ?? ''),
    km_recorridos:         String(initial?.km_recorridos ?? ''),
    notas:                 initial?.notas ?? '',
  });
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const horas = useMemo(() => calcHoras(form.hora_salida, form.hora_llegada), [form.hora_salida, form.hora_llegada]);
  const todos = [...camiones, ...vehiculos];

  const handleSubmit = async () => {
    const payload = {
      conductor_id:          null,
      personal_id:           form.personal_id || null,
      camion_id:             form.camion_id || null,
      finca:                 form.finca || null,
      destino:               form.destino || null,
      trabajo_realizado:     form.trabajo_realizado || null,
      ruta:                  form.ruta || null,
      hora_salida:           form.hora_salida || null,
      hora_llegada:          form.hora_llegada || null,
      gasto_gasolina_litros: form.gasto_gasolina_litros ? Number(form.gasto_gasolina_litros) : null,
      gasto_gasolina_euros:  form.gasto_gasolina_euros  ? Number(form.gasto_gasolina_euros)  : null,
      km_recorridos:         form.km_recorridos         ? Number(form.km_recorridos)          : null,
      notas:                 form.notas || null,
      created_by:            'JuanPe',
    };
    if (isEdit && initial) {
      await updMut.mutateAsync({ id: initial.id, ...payload });
    } else {
      await addMut.mutateAsync(payload);
    }
    onClose();
  };

  const isPending = addMut.isPending || updMut.isPending;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-white/10 rounded-xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center gap-3 px-5 py-3 border-b border-white/10 shrink-0">
          <MapPin className="w-5 h-5 text-purple-400" />
          <p className="flex-1 text-[11px] font-black text-white uppercase tracking-wider">
            {isEdit ? 'Editar viaje' : 'Registrar viaje'}
          </p>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-3 overflow-y-auto flex-1">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Conductor</label>
              <SelectWithOther
                options={conductores.map(c => c.nombre)}
                value={conductores.find(c => c.id === form.personal_id)?.nombre ?? ''}
                onChange={v => { const c = conductores.find(x => x.nombre === v); set('personal_id', c?.id ?? ''); }}
                onCreateNew={() => {}}
                placeholder="Sin conductor"
              />
            </div>
            <div>
              <label className={LABEL}>Vehículo</label>
              <SelectWithOther
                options={todos.map(v => v.matricula + (v.marca ? ' · ' + v.marca : ''))}
                value={todos.find(v => v.id === form.camion_id) ? (todos.find(v => v.id === form.camion_id)!.matricula + ((todos.find(v => v.id === form.camion_id) as Camion)?.marca ? ' · ' + (todos.find(v => v.id === form.camion_id) as Camion)?.marca : '')) : ''}
                onChange={v => { const mat = v.split(' · ')[0]; const item = todos.find(x => x.matricula === mat); set('camion_id', item?.id ?? ''); }}
                onCreateNew={() => {}}
                placeholder="Sin vehículo"
              />
            </div>
          </div>
          <div>
            <label className={LABEL}>Tipo de trabajo</label>
            <SelectWithOther
              options={tiposTrabajo.map(t => t.nombre)}
              value={form.trabajo_realizado}
              onChange={v => set('trabajo_realizado', v)}
              onCreateNew={v => { onAddTipoTrabajo(v); set('trabajo_realizado', v); }}
              placeholder="Seleccionar tipo"
            />
          </div>
          <div>
            <label className={LABEL}>Finca origen</label>
            <SelectWithOther
              options={FINCAS}
              value={form.finca}
              onChange={v => set('finca', v)}
              onCreateNew={v => set('finca', v)}
              placeholder="Sin finca específica"
            />
          </div>
          <div>
            <label className={LABEL}>Destino</label>
            <SelectWithOther
              options={destinos}
              value={form.destino}
              onChange={v => set('destino', v)}
              onCreateNew={v => set('destino', v)}
              placeholder="Seleccionar destino"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Salida</label>
              <input type="datetime-local" value={form.hora_salida} onChange={e => set('hora_salida', e.target.value)} className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Llegada</label>
              <input type="datetime-local" value={form.hora_llegada} onChange={e => set('hora_llegada', e.target.value)} className={INPUT} />
            </div>
          </div>
          {horas != null && (
            <div className="flex items-center gap-2 px-3 py-2 bg-purple-500/5 rounded-lg border border-purple-500/20">
              <Clock className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-[10px] font-black text-purple-400">{horas}h de viaje</span>
            </div>
          )}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className={LABEL}>Litros</label>
              <input type="number" min="0" step="0.1" value={form.gasto_gasolina_litros} onChange={e => set('gasto_gasolina_litros', e.target.value)} placeholder="0.0" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Euros (€)</label>
              <input type="number" min="0" step="0.01" value={form.gasto_gasolina_euros} onChange={e => set('gasto_gasolina_euros', e.target.value)} placeholder="0.00" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Km</label>
              <input type="number" min="0" value={form.km_recorridos} onChange={e => set('km_recorridos', e.target.value)} placeholder="0" className={INPUT} />
            </div>
          </div>
          <AudioInput label="RUTA / DESCRIPCIÓN" value={form.ruta} onChange={v => set('ruta', v)} rows={2} placeholder="Itinerario, observaciones…" />
          <div>
            <label className={LABEL}>GPS futuro</label>
            <input type="text" value="Datos GPS — próximamente" disabled className={INPUT + ' opacity-40 cursor-not-allowed'} />
          </div>
          <AudioInput label="NOTAS" value={form.notas} onChange={v => set('notas', v)} rows={2} placeholder="Observaciones adicionales…" />
        </div>
        <div className="px-5 py-3 border-t border-white/10 flex gap-2 shrink-0">
          <button onClick={onClose} className="btn-secondary flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest">Cancelar</button>
          <button onClick={handleSubmit} disabled={isPending}
            className="btn-primary flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest disabled:opacity-40">
            {isPending ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal Mantenimiento ───────────────────────────────────────

function ModalMantenimiento({
  initial, camiones, vehiculos, tiposMant, onClose,
}: {
  initial?: MantenimientoCamion;
  camiones: Camion[];
  vehiculos: VehiculoEmpresa[];
  tiposMant: { id: string; nombre: string }[];
  onClose: () => void;
}) {
  const addMut = useAddMantenimientoCamion();
  const updMut = useUpdateMantenimientoCamion();
  const isEdit = !!initial;

  // vehiculo_tipo es solo UI para filtrar la lista
  const detectarTipo = (): 'camion' | 'vehiculo' => {
    if (!initial?.camion_id) return 'camion';
    if (camiones.find(c => c.id === initial.camion_id)) return 'camion';
    return 'vehiculo';
  };

  const [vehiculoTipo, setVehiculoTipo] = useState<'camion' | 'vehiculo'>(detectarTipo);
  const [form, setForm] = useState({
    camion_id:   initial?.camion_id ?? '',
    tipo:        initial?.tipo ?? '',
    descripcion: initial?.descripcion ?? '',
    fecha:       initial?.fecha ? initial.fecha.slice(0, 10) : new Date().toISOString().slice(0, 10),
    coste_euros: String(initial?.coste_euros ?? ''),
    proveedor:   initial?.proveedor ?? '',
  });
  const [foto1, setFoto1] = useState<File | null>(null);
  const [foto2, setFoto2] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const foto1Preview = useMemo(() => foto1 ? URL.createObjectURL(foto1) : (initial?.foto_url ?? null), [foto1, initial?.foto_url]);
  const foto2Preview = useMemo(() => foto2 ? URL.createObjectURL(foto2) : (initial?.foto_url_2 ?? null), [foto2, initial?.foto_url_2]);

  const listaVehiculos = vehiculoTipo === 'camion' ? camiones : vehiculos;

  const tiposOpciones = tiposMant.map(t => t.nombre);

  const handleSubmit = async () => {
    setUploading(true);
    try {
      const fotoUrl1 = foto1 ? await uploadImage(foto1, 'parcel-images', buildStoragePath('mant-logistica', foto1)) ?? null : (initial?.foto_url ?? null);
      const fotoUrl2 = foto2 ? await uploadImage(foto2, 'parcel-images', buildStoragePath('mant-logistica', foto2)) ?? null : (initial?.foto_url_2 ?? null);
      const payload = {
        camion_id:   form.camion_id || null,
        tipo:        form.tipo || 'Revisión periódica',
        descripcion: form.descripcion || null,
        fecha:       form.fecha,
        coste_euros: form.coste_euros ? Number(form.coste_euros) : null,
        proveedor:   form.proveedor || null,
        foto_url:    fotoUrl1,
        foto_url_2:  fotoUrl2,
        created_by:  'JuanPe',
      };
      if (isEdit && initial) {
        await updMut.mutateAsync({ id: initial.id, ...payload });
      } else {
        await addMut.mutateAsync(payload);
      }
      onClose();
    } finally {
      setUploading(false);
    }
  };

  const isPending = addMut.isPending || updMut.isPending || uploading;

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-white/10 rounded-xl w-full max-w-sm shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center gap-3 px-5 py-3 border-b border-white/10 shrink-0">
          <Wrench className="w-5 h-5 text-purple-400" />
          <p className="flex-1 text-[11px] font-black text-white uppercase tracking-wider">
            {isEdit ? 'Editar mantenimiento' : 'Nuevo mantenimiento'}
          </p>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-3 overflow-y-auto flex-1">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Tipo de vehículo</label>
              <select value={vehiculoTipo} onChange={e => { setVehiculoTipo(e.target.value as 'camion' | 'vehiculo'); set('camion_id', ''); }} className={INPUT}>
                <option value="camion">Camión</option>
                <option value="vehiculo">Vehículo empresa</option>
              </select>
            </div>
            <div>
              <label className={LABEL}>Vehículo</label>
              <SelectWithOther
                options={listaVehiculos.map(v => v.matricula + (v.marca ? ' · ' + v.marca : ''))}
                value={listaVehiculos.find(v => v.id === form.camion_id) ? (listaVehiculos.find(v => v.id === form.camion_id)!.matricula + ((listaVehiculos.find(v => v.id === form.camion_id) as Camion)?.marca ? ' · ' + (listaVehiculos.find(v => v.id === form.camion_id) as Camion)?.marca : '')) : ''}
                onChange={v => { const mat = v.split(' · ')[0]; const item = listaVehiculos.find(x => x.matricula === mat); set('camion_id', item?.id ?? ''); }}
                onCreateNew={() => {}}
                placeholder="Seleccionar vehículo"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Tipo *</label>
              <SelectWithOther
                options={tiposOpciones}
                value={form.tipo}
                onChange={v => set('tipo', v)}
                onCreateNew={v => set('tipo', v)}
                placeholder="Seleccionar tipo"
              />
            </div>
            <div>
              <label className={LABEL}>Fecha</label>
              <input type="date" value={form.fecha} onChange={e => set('fecha', e.target.value)} className={INPUT} />
            </div>
          </div>
          <AudioInput label="DESCRIPCIÓN" value={form.descripcion} onChange={v => set('descripcion', v)} rows={3} placeholder="Trabajo realizado, observaciones…" />
          <div>
            <label className={LABEL}>Taller / Proveedor</label>
            <SelectWithOther options={TALLERES} value={form.proveedor} onChange={v => set('proveedor', v)} onCreateNew={v => set('proveedor', v)} placeholder="Seleccionar taller" />
          </div>
          <div>
            <label className={LABEL}>Coste (€)</label>
            <input type="number" min="0" step="0.01" value={form.coste_euros} onChange={e => set('coste_euros', e.target.value)} placeholder="0.00" className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Foto 1 — Albarán / Trabajo</label>
            <PhotoAttachment value={foto1Preview} onChange={setFoto1} />
          </div>
          <div>
            <label className={LABEL}>Foto 2 — ITV / Factura</label>
            <PhotoAttachment value={foto2Preview} onChange={setFoto2} />
          </div>
        </div>
        <div className="px-5 py-3 border-t border-white/10 flex gap-2 shrink-0">
          <button onClick={onClose} className="btn-secondary flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest">Cancelar</button>
          <button onClick={handleSubmit} disabled={isPending}
            className="btn-primary flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest disabled:opacity-40">
            {isPending ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal Combustible ─────────────────────────────────────────

function ModalCombustible({
  initial, camiones, vehiculos, conductores, onClose,
}: {
  initial?: Combustible;
  camiones: Camion[];
  vehiculos: VehiculoEmpresa[];
  conductores: Personal[];
  onClose: () => void;
}) {
  const addMut = useAddCombustible();
  const updMut = useUpdateCombustible();
  const isEdit = !!initial;

  const detectarTipo = (): 'camion' | 'vehiculo' => {
    if (!initial?.vehiculo_id) return 'camion';
    if (camiones.find(c => c.id === initial.vehiculo_id)) return 'camion';
    return 'vehiculo';
  };

  const [vehiculoTipo, setVehiculoTipo] = useState<'camion' | 'vehiculo'>(
    initial?.vehiculo_tipo === 'vehiculo' ? 'vehiculo' : 'camion',
  );
  const [form, setForm] = useState({
    vehiculo_id:  initial?.vehiculo_id ?? '',
    conductor_id: initial?.conductor_id ?? '',
    fecha:        initial?.fecha ? initial.fecha.slice(0, 16) : new Date().toISOString().slice(0, 16),
    litros:       String(initial?.litros ?? ''),
    coste_total:  String(initial?.coste_total ?? ''),
    gasolinera:   initial?.gasolinera ?? '',
    notas:        initial?.notas ?? '',
  });
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const fotoPreview = useMemo(
    () => fotoFile ? URL.createObjectURL(fotoFile) : (initial?.foto_url ?? null),
    [fotoFile, initial?.foto_url],
  );

  const listaVehiculos = vehiculoTipo === 'camion' ? camiones : vehiculos;

  const handleSubmit = async () => {
    setUploading(true);
    try {
      let foto_url = initial?.foto_url ?? null;
      if (fotoFile) {
        foto_url = await uploadImage(fotoFile, 'parcel-images', buildStoragePath('combustible', fotoFile)) ?? null;
      }
      const payload = {
        vehiculo_tipo: vehiculoTipo,
        vehiculo_id:   form.vehiculo_id,
        conductor_id:  form.conductor_id || null,
        fecha:         form.fecha || null,
        litros:        form.litros    ? Number(form.litros)    : null,
        coste_total:   form.coste_total ? Number(form.coste_total) : null,
        gasolinera:    form.gasolinera || null,
        foto_url,
        notas:         form.notas || null,
        created_by:    'JuanPe',
      };
      if (isEdit && initial) {
        await updMut.mutateAsync({ id: initial.id, ...payload });
      } else {
        await addMut.mutateAsync(payload);
      }
      onClose();
    } finally {
      setUploading(false);
    }
  };

  const isPending = addMut.isPending || updMut.isPending || uploading;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-white/10 rounded-xl w-full max-w-sm shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center gap-3 px-5 py-3 border-b border-white/10 shrink-0">
          <Fuel className="w-5 h-5 text-purple-400" />
          <p className="flex-1 text-[11px] font-black text-white uppercase tracking-wider">
            {isEdit ? 'Editar repostaje' : 'Nuevo repostaje'}
          </p>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-3 overflow-y-auto flex-1">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Tipo de vehículo</label>
              <select value={vehiculoTipo} onChange={e => { setVehiculoTipo(e.target.value as 'camion' | 'vehiculo'); set('vehiculo_id', ''); }} className={INPUT}>
                <option value="camion">Camión</option>
                <option value="vehiculo">Vehículo empresa</option>
              </select>
            </div>
            <div>
              <label className={LABEL}>Vehículo</label>
              <SelectWithOther
                options={listaVehiculos.map(v => v.matricula + (v.marca ? ' · ' + v.marca : ''))}
                value={listaVehiculos.find(v => v.id === form.vehiculo_id) ? (listaVehiculos.find(v => v.id === form.vehiculo_id)!.matricula + ((listaVehiculos.find(v => v.id === form.vehiculo_id) as Camion)?.marca ? ' · ' + (listaVehiculos.find(v => v.id === form.vehiculo_id) as Camion)?.marca : '')) : ''}
                onChange={v => { const mat = v.split(' · ')[0]; const item = listaVehiculos.find(x => x.matricula === mat); set('vehiculo_id', item?.id ?? ''); }}
                onCreateNew={() => {}}
                placeholder="Seleccionar vehículo"
              />
            </div>
          </div>
          <div>
            <label className={LABEL}>Conductor</label>
            <SelectWithOther
              options={conductores.map(c => c.nombre)}
              value={conductores.find(c => c.id === form.conductor_id)?.nombre ?? ''}
              onChange={v => { const c = conductores.find(x => x.nombre === v); set('conductor_id', c?.id ?? ''); }}
              onCreateNew={() => {}}
              placeholder="Sin conductor"
            />
          </div>
          <div>
            <label className={LABEL}>Fecha y hora</label>
            <input type="datetime-local" value={form.fecha} onChange={e => set('fecha', e.target.value)} className={INPUT} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Litros</label>
              <input type="number" min="0" step="0.01" value={form.litros} onChange={e => set('litros', e.target.value)} placeholder="0.00" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Coste total (€)</label>
              <input type="number" min="0" step="0.01" value={form.coste_total} onChange={e => set('coste_total', e.target.value)} placeholder="0.00" className={INPUT} />
            </div>
          </div>
          <div>
            <label className={LABEL}>Gasolinera</label>
            <SelectWithOther options={GASOLINERAS} value={form.gasolinera} onChange={v => set('gasolinera', v)} onCreateNew={v => set('gasolinera', v)} placeholder="Seleccionar gasolinera" />
          </div>
          <div>
            <label className={LABEL}>Foto — Ticket repostaje</label>
            <PhotoAttachment value={fotoPreview} onChange={setFotoFile} />
          </div>
          <AudioInput label="NOTAS" value={form.notas} onChange={v => set('notas', v)} rows={2} placeholder="Observaciones…" />
        </div>
        <div className="px-5 py-3 border-t border-white/10 flex gap-2 shrink-0">
          <button onClick={onClose} className="btn-secondary flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest">Cancelar</button>
          <button onClick={handleSubmit} disabled={!form.vehiculo_id || isPending}
            className="btn-primary flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest disabled:opacity-40">
            {isPending ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────

export default function Logistica() {
  const navigate   = useNavigate();
  const { theme }  = useTheme();
  const isDark     = theme === 'dark';

  const [tab, setTab] = useState<TabType>('camiones');
  const [pdfMenuOpen, setPdfMenuOpen]   = useState(false);
  const [generandoPdf, setGenerandoPdf] = useState(false);
  const pdfMenuRef = useRef<HTMLDivElement>(null);

  // Modales camiones
  const [modalAddCamion, setModalAddCamion]   = useState(false);
  const [editCamion,     setEditCamion]       = useState<Camion | null>(null);
  // Modales vehículos
  const [modalAddVehiculo, setModalAddVehiculo] = useState(false);
  const [editVehiculo,     setEditVehiculo]     = useState<VehiculoEmpresa | null>(null);
  // Modales viajes
  const [modalAddViaje, setModalAddViaje] = useState(false);
  const [editViaje,     setEditViaje]     = useState<Viaje | null>(null);
  // Modales mantenimiento
  const [modalAddMant, setModalAddMant] = useState(false);
  const [editMant,     setEditMant]     = useState<MantenimientoCamion | null>(null);
  // Modales combustible
  const [modalAddComb, setModalAddComb] = useState(false);
  const [editComb,     setEditComb]     = useState<Combustible | null>(null);

  // ── Datos ──────────────────────────────────────────────────
  const { data: kpis       = { totalCamiones: 0, camionesActivos: 0, totalVehiculos: 0, totalConductores: 0, totalViajes: 0 } } = useKPIsLogistica();
  const { data: camiones   = [] } = useCamiones();
  const { data: vehiculos  = [] } = useVehiculosEmpresa();
  const { data: viajes     = [] } = useViajes();
  const { data: mants      = [] } = useMantenimientoCamion();
  const { data: combustibles = [] } = useCombustible();
  const { data: personal   = [] } = usePersonal();
  const { data: ubicaciones = [] } = useUbicaciones();
  const { data: tiposTrabajo = [] } = useTiposTrabajoLogistica();
  const { data: tiposMant  = [] } = useTiposMantenimientoLogistica();
  const addTipoTrabajo = useAddTipoTrabajoLogistica();

  const delCamion  = useDeleteCamion();
  const delVehiculo = useDeleteVehiculoEmpresa();
  const delViaje   = useDeleteViaje();
  const delMant    = useDeleteMantenimiento();
  const delComb    = useDeleteCombustible();

  const conductores = personal.filter(p => p.activo && p.categoria === 'conductor_camion');

  // ── KPIs secundarios ───────────────────────────────────────
  const totalKm      = viajes.reduce((s, v) => s + (v.km_recorridos ?? 0), 0);
  const totalCostMant = mants.reduce((s, m) => s + (m.coste_euros ?? 0), 0);
  const totalLitros  = combustibles.reduce((s, c) => s + (c.litros ?? 0), 0);
  const totalCostComb = combustibles.reduce((s, c) => s + (c.coste_total ?? 0), 0);

  // ── Cierre PDF menu ────────────────────────────────────────
  useEffect(() => {
    if (!pdfMenuOpen) return;
    function onDown(ev: MouseEvent) {
      if (pdfMenuRef.current && !pdfMenuRef.current.contains(ev.target as Node)) {
        setPdfMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [pdfMenuOpen]);

  // ── PDF helpers ────────────────────────────────────────────
  function fmtFechaCorta(f: string | null) { return fmtFecha(f); }
  function estadoCamionTexto(c: Camion) {
    if (!c.activo) return 'Inactivo';
    const d = itvDias(c.fecha_proxima_itv);
    if (d !== null && d < 0)  return 'Activo · ITV vencida';
    if (d !== null && d < 30) return `Activo · ITV en ${d}d`;
    return 'Activo';
  }

  // ── Generadores PDF ────────────────────────────────────────
  async function generarCompleto() {
    const ref = new Date(); const fs = ref.toISOString().slice(0, 10);
    await generarPDFCorporativoBase({
      titulo: 'LOGÍSTICA', subtitulo: 'Informe completo de flota y operaciones',
      fecha: ref, filename: `Logistica_Completa_${fs}.pdf`, accentColor: PDF_COLORS.violet,
      bloques: [
        ctx => {
          pdfCorporateSection(ctx, 'Camiones');
          pdfCorporateTable(ctx, ['CÓDIGO', 'MATRÍCULA', 'MARCA', 'KM', 'ITV', 'ESTADO'], [20, 26, 30, 22, 26, 58],
            camiones.map(c => [c.codigo_interno ?? '—', c.matricula, c.marca ?? '—', c.kilometros_actuales != null ? c.kilometros_actuales.toLocaleString('es-ES') : '—', fmtFechaCorta(c.fecha_proxima_itv), estadoCamionTexto(c)]));
        },
        ctx => {
          pdfCorporateSection(ctx, 'Vehículos de empresa');
          if (vehiculos.length === 0) { ctx.checkPage(8); ctx.doc.setFontSize(9); ctx.doc.setTextColor(100,116,139); ctx.doc.text('Sin vehículos registrados.', PDF_MARGIN, ctx.y); ctx.y += 6; return; }
          pdfCorporateTable(ctx, ['CÓDIGO', 'MATRÍCULA', 'MARCA', 'TIPO', 'KM', 'ESTADO'], [20, 26, 28, 28, 22, 58],
            vehiculos.map(v => [v.codigo_interno ?? '—', v.matricula, v.marca ?? '—', v.tipo ?? '—', v.km_actuales != null ? v.km_actuales.toLocaleString('es-ES') : '—', v.estado_operativo ?? '—']));
        },
        ctx => {
          pdfCorporateSection(ctx, 'Viajes');
          if (viajes.length === 0) { ctx.checkPage(8); ctx.doc.setFontSize(9); ctx.doc.setTextColor(100,116,139); ctx.doc.text('Sin viajes registrados.', PDF_MARGIN, ctx.y); ctx.y += 6; return; }
          pdfCorporateTable(ctx, ['SALIDA', 'LLEGADA', 'VEHÍCULO', 'CONDUCTOR', 'DESTINO', 'KM'], [28, 28, 24, 34, 42, 26],
            viajes.map(v => [fmtDatetime(v.hora_salida), fmtDatetime(v.hora_llegada), matriculaVehiculo(camiones, vehiculos, v.camion_id), nombreDe(personal, v.personal_id), v.destino ?? v.finca ?? '—', v.km_recorridos != null ? String(v.km_recorridos) : '—']));
        },
        ctx => {
          pdfCorporateSection(ctx, 'Mantenimientos');
          if (mants.length === 0) { ctx.checkPage(8); ctx.doc.setFontSize(9); ctx.doc.setTextColor(100,116,139); ctx.doc.text('Sin mantenimientos.', PDF_MARGIN, ctx.y); ctx.y += 6; return; }
          pdfCorporateTable(ctx, ['FECHA', 'VEHÍCULO', 'TIPO', 'DESCRIPCIÓN', 'COSTE €', 'PROVEEDOR'], [22, 22, 24, 50, 20, 44],
            mants.map(m => [fmtFechaCorta(m.fecha), matriculaVehiculo(camiones, vehiculos, m.camion_id), m.tipo, m.descripcion ?? '—', m.coste_euros != null ? m.coste_euros.toFixed(2) : '—', m.proveedor ?? '—']));
        },
      ],
    });
  }

  async function generarViajeshoy() {
    const ref = new Date(); const fs = ref.toISOString().slice(0, 10);
    const hoy = viajes.filter(v => v.hora_salida && mismoDia(new Date(v.hora_salida), ref));
    await generarPDFCorporativoBase({
      titulo: 'LOGÍSTICA — VIAJES', subtitulo: 'Movimientos del día',
      fecha: ref, filename: `Logistica_Viajes_${fs}.pdf`, accentColor: PDF_COLORS.violet,
      bloques: [ctx => {
        pdfCorporateSection(ctx, 'Viajes del día');
        if (hoy.length === 0) { ctx.checkPage(8); ctx.doc.setFontSize(9); ctx.doc.setTextColor(100,116,139); ctx.doc.text('Sin viajes hoy.', PDF_MARGIN, ctx.y); ctx.y += 6; return; }
        pdfCorporateTable(ctx, ['SALIDA', 'LLEGADA', 'VEHÍCULO', 'CONDUCTOR', 'DESTINO', 'KM'], [28, 28, 24, 34, 42, 26],
          hoy.map(v => [fmtDatetime(v.hora_salida), fmtDatetime(v.hora_llegada), matriculaVehiculo(camiones, vehiculos, v.camion_id), nombreDe(personal, v.personal_id), v.destino ?? '—', v.km_recorridos != null ? String(v.km_recorridos) : '—']));
      }],
    });
  }

  async function generarFlota() {
    const ref = new Date(); const fs = ref.toISOString().slice(0, 10);
    await generarPDFCorporativoBase({
      titulo: 'LOGÍSTICA — FLOTA', subtitulo: 'Estado operativo de camiones y vehículos',
      fecha: ref, filename: `Logistica_Flota_${fs}.pdf`, accentColor: PDF_COLORS.violet,
      bloques: [
        ctx => {
          pdfCorporateSection(ctx, 'Camiones');
          pdfCorporateTable(ctx, ['CÓDIGO', 'MATRÍCULA', 'MARCA', 'ITV', 'ESTADO'], [20, 28, 34, 30, 70],
            camiones.map(c => [c.codigo_interno ?? '—', c.matricula, c.marca ?? '—', fmtFechaCorta(c.fecha_proxima_itv), estadoCamionTexto(c)]));
        },
        ctx => {
          pdfCorporateSection(ctx, 'Vehículos empresa');
          if (vehiculos.length === 0) { ctx.checkPage(8); ctx.doc.setFontSize(9); ctx.doc.setTextColor(100,116,139); ctx.doc.text('Sin vehículos.', PDF_MARGIN, ctx.y); ctx.y += 6; return; }
          pdfCorporateTable(ctx, ['CÓDIGO', 'MATRÍCULA', 'MARCA', 'TIPO', 'ESTADO'], [20, 28, 34, 24, 76],
            vehiculos.map(v => [v.codigo_interno ?? '—', v.matricula, v.marca ?? '—', v.tipo ?? '—', v.estado_operativo ?? '—']));
        },
      ],
    });
  }

  async function generarMantenimientos() {
    const ref = new Date(); const fs = ref.toISOString().slice(0, 10);
    await generarPDFCorporativoBase({
      titulo: 'LOGÍSTICA — MANTENIMIENTO', subtitulo: 'Historial de intervenciones',
      fecha: ref, filename: `Logistica_Mantenimientos_${fs}.pdf`, accentColor: PDF_COLORS.violet,
      bloques: [ctx => {
        pdfCorporateSection(ctx, 'Mantenimientos');
        if (mants.length === 0) { ctx.checkPage(8); ctx.doc.setFontSize(9); ctx.doc.setTextColor(100,116,139); ctx.doc.text('Sin mantenimientos.', PDF_MARGIN, ctx.y); ctx.y += 6; return; }
        pdfCorporateTable(ctx, ['FECHA', 'VEHÍCULO', 'TIPO', 'COSTE €', 'PROVEEDOR'], [26, 28, 32, 22, 74],
          mants.map(m => [fmtFechaCorta(m.fecha), matriculaVehiculo(camiones, vehiculos, m.camion_id), m.tipo, m.coste_euros != null ? m.coste_euros.toFixed(2) : '—', m.proveedor ?? '—']));
      }],
    });
  }

  async function generarResumen() {
    const ref = new Date(); const fs = ref.toISOString().slice(0, 10);
    await generarPDFCorporativoBase({
      titulo: 'LOGÍSTICA — RESUMEN', subtitulo: 'Indicadores operativos',
      fecha: ref, filename: `Logistica_Resumen_${fs}.pdf`, accentColor: PDF_COLORS.violet,
      bloques: [ctx => {
        pdfCorporateSection(ctx, 'Resumen operativo');
        pdfCorporateTable(ctx, ['INDICADOR', 'VALOR'], [95, 87], [
          ['Total viajes',                     String(viajes.length)],
          ['Km recorridos (acumulado)',          totalKm.toLocaleString('es-ES')],
          ['Combustible (litros)',               totalLitros > 0 ? totalLitros.toFixed(1) : '—'],
          ['Gasto combustible (€)',              totalCostComb > 0 ? `${totalCostComb.toFixed(2)} €` : '—'],
          ['Coste mantenimiento (€)',            totalCostMant > 0 ? `${totalCostMant.toFixed(2)} €` : '—'],
          ['Camiones activos',                   String(kpis.camionesActivos)],
          ['Vehículos empresa',                  String(kpis.totalVehiculos)],
        ]);
      }],
    });
  }

  async function onElegirPdf(op: 1 | 2 | 3 | 4 | 5) {
    setPdfMenuOpen(false); setGenerandoPdf(true);
    try {
      if (op === 1) await generarCompleto();
      else if (op === 2) await generarViajeshoy();
      else if (op === 3) await generarFlota();
      else if (op === 4) await generarMantenimientos();
      else               await generarResumen();
    } finally {
      setGenerandoPdf(false);
    }
  }

  // ── Panel estado flota ─────────────────────────────────────
  const flotaItems = [
    ...camiones.map(c => ({
      id: c.id, tipo: 'Camión' as const,
      codigo: c.codigo_interno, matricula: c.matricula, marca: c.marca,
      estado: c.estado_operativo, itvDate: c.fecha_proxima_itv,
      km: c.kilometros_actuales, conductor: null as string | null,
    })),
    ...vehiculos.map(v => ({
      id: v.id, tipo: 'Vehículo' as const,
      codigo: v.codigo_interno, matricula: v.matricula, marca: v.marca,
      estado: v.estado_operativo, itvDate: v.fecha_proxima_itv,
      km: v.km_actuales,
      conductor: v.conductor_habitual_id ? (conductores.find(c => c.id === v.conductor_habitual_id)?.nombre ?? null) : null,
    })),
  ];

  const panel = isDark ? 'bg-slate-900/60 border-white/10' : 'bg-white border-slate-200';

  return (
    <div className={`min-h-screen ${isDark ? 'bg-[#020617] text-white' : 'bg-slate-50 text-slate-900'} flex flex-col`}>

      {/* HEADER */}
      <header className={`w-full ${isDark ? 'bg-slate-900/80 border-white/10' : 'bg-white/90 border-slate-200'} border-b pl-14 pr-4 py-2 flex items-center gap-3 z-50`}>
        <button onClick={() => navigate('/dashboard')} className="flex items-center gap-1.5 text-slate-400 hover:text-[#38bdf8] transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-[9px] font-black uppercase tracking-widest">Dashboard</span>
        </button>
        <span className="text-slate-600">|</span>
        <Truck className="w-4 h-4 text-purple-400" />
        <span className="text-[11px] font-black uppercase tracking-wider">Logística</span>
        <div className="ml-auto flex items-center gap-2">
          <div className="relative" ref={pdfMenuRef}>
            <button type="button" onClick={() => setPdfMenuOpen(o => !o)} disabled={generandoPdf}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#38bdf8]/20 bg-[#38bdf8]/5 hover:bg-[#38bdf8]/10 text-[#38bdf8] text-[9px] font-black uppercase tracking-widest transition-colors disabled:opacity-50">
              {generandoPdf
                ? <span className="w-3 h-3 border-2 border-[#38bdf8]/20 border-t-[#38bdf8] rounded-full animate-spin" />
                : <FileText className="w-3 h-3" />}
              PDF
              <ChevronDown className={`w-3 h-3 transition-transform ${pdfMenuOpen ? 'rotate-180' : ''}`} />
            </button>
            {pdfMenuOpen && (
              <div className={`absolute right-0 top-full z-[70] mt-1 min-w-[240px] rounded-lg border shadow-lg py-1 ${isDark ? 'border-slate-600 bg-slate-900 shadow-black/40' : 'border-slate-200 bg-white shadow-slate-400/20'}`}>
                {[
                  { k: 1 as const, label: 'Informe completo logística' },
                  { k: 2 as const, label: 'Viajes del día' },
                  { k: 3 as const, label: 'Estado de flota' },
                  { k: 4 as const, label: 'Mantenimientos' },
                  { k: 5 as const, label: 'Resumen operativo' },
                ].map(({ k, label }) => (
                  <button key={k} type="button" disabled={generandoPdf} onClick={() => onElegirPdf(k)}
                    className={`w-full px-3 py-2.5 text-left text-xs font-medium transition-colors disabled:opacity-50 ${isDark ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-50 text-slate-800'}`}>
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-5 max-w-4xl mx-auto w-full">

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-3 mb-3 sm:grid-cols-5">
          {[
            { label: 'Camiones',    value: kpis.totalCamiones,    color: '#a78bfa' },
            { label: 'Activos',     value: kpis.camionesActivos,  color: '#34d399' },
            { label: 'Vehículos',   value: kpis.totalVehiculos,   color: '#a78bfa' },
            { label: 'Conductores', value: kpis.totalConductores, color: '#a78bfa' },
            { label: 'Viajes',      value: kpis.totalViajes,      color: '#60a5fa' },
          ].map(kpi => (
            <div key={kpi.label} className={`${panel} border rounded-xl p-3 text-center`}>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{kpi.label}</p>
              <p className="text-xl font-black" style={{ color: kpi.color }}>{kpi.value}</p>
            </div>
          ))}
        </div>

        {/* KPIs secundarios */}
        <div className="grid grid-cols-2 gap-3 mb-5 sm:grid-cols-4">
          {[
            { icon: <Gauge className="w-4 h-4 text-purple-400" />, label: 'Km totales', value: totalKm.toLocaleString('es-ES') + ' km', color: 'text-purple-300' },
            { icon: <Fuel className="w-4 h-4 text-sky-400" />,    label: 'Combustible', value: totalLitros.toFixed(1) + ' L', color: 'text-sky-300' },
            { icon: <Fuel className="w-4 h-4 text-amber-400" />,   label: 'Gasto comb.', value: totalCostComb.toFixed(2) + ' €', color: 'text-amber-300' },
            { icon: <Wrench className="w-4 h-4 text-amber-400" />, label: 'Coste mant.', value: totalCostMant.toFixed(2) + ' €', color: 'text-amber-300' },
          ].map(kpi => (
            <div key={kpi.label} className={`${panel} border rounded-xl p-3 flex items-center gap-2`}>
              {kpi.icon}
              <div>
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{kpi.label}</p>
                <p className={`text-[13px] font-black ${kpi.color}`}>{kpi.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* PANEL ESTADO FLOTA */}
        {flotaItems.length > 0 && (
          <div className={`${panel} border rounded-xl p-4 mb-5`}>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Estado de flota</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {flotaItems.map(item => {
                const dias = itvDias(item.itvDate);
                const itvRojo = dias !== null && dias < 30;
                return (
                  <div key={item.id} className={`flex items-center gap-3 px-3 py-2 rounded-lg ${isDark ? 'bg-slate-800/50' : 'bg-slate-50'} border ${isDark ? 'border-white/5' : 'border-slate-200'}`}>
                    {item.tipo === 'Camión'
                      ? <Truck className="w-4 h-4 text-purple-400 shrink-0" />
                      : <Car   className="w-4 h-4 text-sky-400 shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {item.codigo && <span className="text-[8px] text-slate-500">{item.codigo}</span>}
                        <span className="text-[10px] font-black text-white uppercase">{item.matricula}</span>
                        {item.marca && <span className="text-[9px] text-slate-400">{item.marca}</span>}
                        <BadgeEstado estado={item.estado} />
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        {item.itvDate && (
                          <span className={`text-[8px] flex items-center gap-0.5 ${itvRojo ? 'text-red-400' : 'text-slate-400'}`}>
                            <Calendar className="w-2.5 h-2.5" />ITV: {fmtFecha(item.itvDate)}{itvRojo && dias !== null && ` (${dias}d)`}
                          </span>
                        )}
                        {item.km != null && (
                          <span className="text-[8px] text-slate-400 flex items-center gap-0.5">
                            <Gauge className="w-2.5 h-2.5" />{item.km.toLocaleString('es-ES')} km
                          </span>
                        )}
                        {item.conductor && (
                          <span className="text-[8px] text-slate-400">{item.conductor}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TABS */}
        <div className={`flex gap-1 mb-5 ${panel} border rounded-xl p-1 overflow-x-auto`}>
          {([
            ['camiones',      'Camiones',     <Truck  key="t" className="w-3 h-3 inline mr-1" />],
            ['vehiculos',     'Vehículos',    <Car    key="v" className="w-3 h-3 inline mr-1" />],
            ['conductores',   'Conductores',  <Users  key="c" className="w-3 h-3 inline mr-1" />],
            ['viajes',        'Viajes',       <MapPin key="j" className="w-3 h-3 inline mr-1" />],
            ['mantenimiento', 'Mantenimiento',<Wrench key="m" className="w-3 h-3 inline mr-1" />],
            ['combustible',   'Combustible',  <Fuel   key="f" className="w-3 h-3 inline mr-1" />],
          ] as [TabType, string, React.ReactNode][]).map(([t, label, icon]) => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 min-w-fit py-2 px-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-colors whitespace-nowrap ${tab === t ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'text-slate-400 hover:text-slate-300'}`}>
              {icon}{label}
            </button>
          ))}
        </div>

        {/* ── TAB CAMIONES ── */}
        {tab === 'camiones' && (
          <>
            <div className="flex justify-between items-center mb-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{camiones.length} camión{camiones.length !== 1 ? 'es' : ''}</p>
              <button onClick={() => setModalAddCamion(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[9px] font-black uppercase tracking-widest hover:bg-purple-500/20 transition-colors">
                <Plus className="w-3 h-3" />Nuevo camión
              </button>
            </div>
            {camiones.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Truck className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs font-black uppercase tracking-widest">Sin camiones registrados</p>
              </div>
            ) : (
              <div className="space-y-2">
                {camiones.map(c => {
                  const dias = itvDias(c.fecha_proxima_itv);
                  const misViajes = viajes.filter(v => v.camion_id === c.id).length;
                  return (
                    <div key={c.id} className={`${panel} border rounded-xl p-4`}>
                      <div className="flex items-start gap-3">
                        <Truck className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            {c.codigo_interno && <span className="text-[8px] text-slate-500">{c.codigo_interno}</span>}
                            <span className="text-[12px] font-black text-white uppercase">{c.matricula}</span>
                            <BadgeEstado estado={c.estado_operativo} />
                            {dias !== null && dias < 0 && <span className="text-[8px] font-black text-red-400">ITV VENCIDA</span>}
                            {dias !== null && dias >= 0 && dias < 30 && <span className="text-[8px] font-black text-amber-400">ITV en {dias}d</span>}
                          </div>
                          <p className="text-[10px] text-slate-400">{[c.marca, c.modelo, c.anio].filter(Boolean).join(' · ')}</p>
                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            <span className="text-[8px] text-slate-500">{misViajes} viajes</span>
                            {c.kilometros_actuales != null && <span className="text-[8px] text-slate-500 flex items-center gap-0.5"><Gauge className="w-2.5 h-2.5" />{c.kilometros_actuales.toLocaleString('es-ES')} km</span>}
                            {c.fecha_proxima_itv && <span className={`text-[8px] flex items-center gap-0.5 ${dias !== null && dias < 0 ? 'text-red-400' : dias !== null && dias < 30 ? 'text-amber-400' : 'text-slate-500'}`}><Calendar className="w-2.5 h-2.5" />ITV: {fmtFecha(c.fecha_proxima_itv)}</span>}
                            {c.empresa_transporte && <span className="text-[8px] text-slate-500">{c.empresa_transporte}</span>}
                          </div>
                        </div>
                        <RecordActions
                          onEdit={() => setEditCamion(c)}
                          onDelete={() => delCamion.mutate(c.id)}
                          confirmMessage={`¿Eliminar camión ${c.matricula}?`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ── TAB VEHÍCULOS ── */}
        {tab === 'vehiculos' && (
          <>
            <div className="flex justify-between items-center mb-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{vehiculos.length} vehículo{vehiculos.length !== 1 ? 's' : ''}</p>
              <button onClick={() => setModalAddVehiculo(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[9px] font-black uppercase tracking-widest hover:bg-purple-500/20 transition-colors">
                <Plus className="w-3 h-3" />Nuevo vehículo
              </button>
            </div>
            {vehiculos.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Car className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs font-black uppercase tracking-widest">Sin vehículos de empresa registrados</p>
              </div>
            ) : (
              <div className="space-y-2">
                {vehiculos.map(v => {
                  const dias = itvDias(v.fecha_proxima_itv);
                  const condNombre = v.conductor_habitual_id ? conductores.find(c => c.id === v.conductor_habitual_id)?.nombre : null;
                  return (
                    <div key={v.id} className={`${panel} border rounded-xl p-4`}>
                      <div className="flex items-start gap-3">
                        <Car className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            {v.codigo_interno && <span className="text-[8px] text-slate-500">{v.codigo_interno}</span>}
                            <span className="text-[12px] font-black text-white uppercase">{v.matricula}</span>
                            <BadgeEstado estado={v.estado_operativo} />
                            {dias !== null && dias < 0 && <span className="text-[8px] font-black text-red-400">ITV VENCIDA</span>}
                            {dias !== null && dias >= 0 && dias < 30 && <span className="text-[8px] font-black text-amber-400">ITV en {dias}d</span>}
                          </div>
                          <p className="text-[10px] text-slate-400">{[v.marca, v.modelo, v.anio, v.tipo].filter(Boolean).join(' · ')}</p>
                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            {v.km_actuales != null && <span className="text-[8px] text-slate-500 flex items-center gap-0.5"><Gauge className="w-2.5 h-2.5" />{v.km_actuales.toLocaleString('es-ES')} km</span>}
                            {v.fecha_proxima_itv && <span className={`text-[8px] flex items-center gap-0.5 ${dias !== null && dias < 0 ? 'text-red-400' : dias !== null && dias < 30 ? 'text-amber-400' : 'text-slate-500'}`}><Calendar className="w-2.5 h-2.5" />ITV: {fmtFecha(v.fecha_proxima_itv)}</span>}
                            {condNombre && <span className="text-[8px] text-slate-500">{condNombre}</span>}
                          </div>
                        </div>
                        <RecordActions
                          onEdit={() => setEditVehiculo(v)}
                          onDelete={() => delVehiculo.mutate(v.id)}
                          confirmMessage={`¿Eliminar vehículo ${v.matricula}?`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ── TAB CONDUCTORES ── */}
        {tab === 'conductores' && (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{conductores.length} conductor{conductores.length !== 1 ? 'es' : ''} activos</p>
              <button onClick={() => navigate('/personal')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#e879f9]/10 border border-[#e879f9]/20 text-[#e879f9] text-[9px] font-black uppercase tracking-widest hover:bg-[#e879f9]/20 transition-colors">
                <Users className="w-3 h-3" />Gestionar personal
              </button>
            </div>
            {conductores.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs font-black uppercase tracking-widest">Sin conductores de camión</p>
                <p className="text-[10px] mt-1">Añade conductores de camión en el módulo Personal</p>
              </div>
            ) : (
              <div className={`${panel} border rounded-xl overflow-hidden`}>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-[#1e293b] text-white">
                      {['Nombre', 'DNI', 'Teléfono', 'Estado', 'Viajes'].map(h => (
                        <th key={h} className="px-3 py-2 text-left text-[9px] font-black uppercase tracking-widest">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {conductores.map((c, i) => {
                      const misViajes = viajes.filter(v => v.personal_id === c.id).length;
                      return (
                        <tr key={c.id} className={i % 2 === 0 ? (isDark ? 'bg-slate-900/40' : 'bg-white') : (isDark ? 'bg-slate-800/30' : 'bg-slate-50')}>
                          <td className="px-3 py-2 font-medium text-white">{c.nombre}</td>
                          <td className="px-3 py-2 text-slate-400">{c.dni ?? '—'}</td>
                          <td className="px-3 py-2 text-slate-400">{c.telefono ? <span className="flex items-center gap-1"><Phone className="w-2.5 h-2.5" />{c.telefono}</span> : '—'}</td>
                          <td className="px-3 py-2">
                            <span className={`text-[8px] font-black uppercase border px-1.5 py-0.5 rounded ${c.activo ? 'text-green-400 border-green-400/60' : 'text-red-400 border-red-400/60'}`}>
                              {c.activo ? 'Activo' : 'Inactivo'}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-slate-400">{misViajes}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* ── TAB VIAJES ── */}
        {tab === 'viajes' && (
          <>
            <div className="flex justify-between items-center mb-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{viajes.length} viaje{viajes.length !== 1 ? 's' : ''}</p>
              <button onClick={() => setModalAddViaje(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[9px] font-black uppercase tracking-widest hover:bg-purple-500/20 transition-colors">
                <Plus className="w-3 h-3" />Nuevo viaje
              </button>
            </div>
            {viajes.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <MapPin className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs font-black uppercase tracking-widest">Sin viajes registrados</p>
              </div>
            ) : (
              <div className="space-y-2">
                {viajes.map(v => {
                  const conductor = personal.find(p => p.id === v.personal_id);
                  const vehiculoLabel = matriculaVehiculo(camiones, vehiculos, v.camion_id);
                  return (
                    <div key={v.id} className={`${panel} border rounded-xl p-4`}>
                      <div className="flex items-start gap-3">
                        <MapPin className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-[10px] font-black text-white">{v.trabajo_realizado ?? v.ruta ?? 'Viaje sin descripción'}</span>
                            {v.hora_salida && <span className="text-[8px] text-slate-500 shrink-0">{fmtDatetime(v.hora_salida)}</span>}
                          </div>
                          <div className="flex items-center gap-3 flex-wrap">
                            {conductor && <span className="text-[9px] text-slate-400">{conductor.nombre}</span>}
                            {vehiculoLabel !== '—' && <span className="text-[9px] text-slate-400 flex items-center gap-0.5"><Truck className="w-2.5 h-2.5" />{vehiculoLabel}</span>}
                            {v.finca   && <span className="text-[9px] text-slate-400 flex items-center gap-0.5"><MapPin className="w-2 h-2" />{v.finca}</span>}
                            {v.destino && <span className="text-[9px] text-slate-400">→ {v.destino}</span>}
                            {v.km_recorridos != null && <span className="text-[9px] text-slate-400 flex items-center gap-0.5"><Gauge className="w-2.5 h-2.5" />{v.km_recorridos} km</span>}
                            {v.gasto_gasolina_litros != null && <span className="text-[9px] text-slate-400 flex items-center gap-0.5"><Fuel className="w-2.5 h-2.5" />{v.gasto_gasolina_litros}L</span>}
                            {v.gasto_gasolina_euros  != null && <span className="text-[9px] text-purple-300 font-black">{v.gasto_gasolina_euros}€</span>}
                          </div>
                        </div>
                        <RecordActions
                          onEdit={() => setEditViaje(v)}
                          onDelete={() => delViaje.mutate(v.id)}
                          confirmMessage="¿Eliminar este viaje?"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ── TAB MANTENIMIENTO ── */}
        {tab === 'mantenimiento' && (
          <>
            <div className="flex justify-between items-center mb-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{mants.length} registro{mants.length !== 1 ? 's' : ''}</p>
              <button onClick={() => setModalAddMant(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[9px] font-black uppercase tracking-widest hover:bg-purple-500/20 transition-colors">
                <Plus className="w-3 h-3" />Nuevo mantenimiento
              </button>
            </div>
            {mants.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Wrench className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs font-black uppercase tracking-widest">Sin mantenimientos registrados</p>
              </div>
            ) : (
              <div className="space-y-2">
                {mants.map(m => (
                  <div key={m.id} className={`${panel} border rounded-xl p-4`}>
                    <div className="flex items-start gap-3">
                      <Wrench className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-[10px] font-black text-white uppercase">{m.tipo}</span>
                          <span className="text-[8px] text-slate-500 shrink-0">{fmtFecha(m.fecha)}</span>
                        </div>
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="text-[9px] text-slate-400">{matriculaVehiculo(camiones, vehiculos, m.camion_id)}</span>
                          {m.descripcion && <span className="text-[9px] text-slate-400">{m.descripcion}</span>}
                          {m.proveedor   && <span className="text-[9px] text-slate-500">· {m.proveedor}</span>}
                          {m.coste_euros != null && <span className="text-[9px] text-purple-300 font-black">{m.coste_euros.toFixed(2)}€</span>}
                        </div>
                      </div>
                      <RecordActions
                        onEdit={() => setEditMant(m)}
                        onDelete={() => delMant.mutate(m.id)}
                        confirmMessage="¿Eliminar este mantenimiento?"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── TAB COMBUSTIBLE ── */}
        {tab === 'combustible' && (
          <>
            <div className="flex justify-between items-center mb-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{combustibles.length} repostaje{combustibles.length !== 1 ? 's' : ''}</p>
              <button onClick={() => setModalAddComb(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[9px] font-black uppercase tracking-widest hover:bg-purple-500/20 transition-colors">
                <Plus className="w-3 h-3" />Nuevo repostaje
              </button>
            </div>
            {combustibles.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Fuel className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs font-black uppercase tracking-widest">Sin repostajes registrados</p>
              </div>
            ) : (
              <div className="space-y-2">
                {combustibles.map(c => {
                  const conductor = personal.find(p => p.id === c.conductor_id);
                  const vehiculoLabel = matriculaVehiculo(camiones, vehiculos, c.vehiculo_id);
                  return (
                    <div key={c.id} className={`${panel} border rounded-xl p-4`}>
                      <div className="flex items-start gap-3">
                        <Fuel className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-[10px] font-black text-white">{c.gasolinera ?? 'Repostaje'}</span>
                            <span className="text-[8px] text-slate-500 shrink-0">{fmtDatetime(c.fecha)}</span>
                          </div>
                          <div className="flex items-center gap-3 flex-wrap">
                            {vehiculoLabel !== '—' && <span className="text-[9px] text-slate-400">{vehiculoLabel}</span>}
                            {conductor && <span className="text-[9px] text-slate-400">{conductor.nombre}</span>}
                            {c.litros     != null && <span className="text-[9px] text-slate-400 flex items-center gap-0.5"><Fuel className="w-2.5 h-2.5" />{c.litros}L</span>}
                            {c.coste_total != null && <span className="text-[9px] text-purple-300 font-black">{c.coste_total.toFixed(2)}€</span>}
                          </div>
                        </div>
                        <RecordActions
                          onEdit={() => setEditComb(c)}
                          onDelete={() => delComb.mutate(c.id)}
                          confirmMessage="¿Eliminar este repostaje?"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>

      {/* MODALES */}
      {(modalAddCamion || editCamion) && (
        <ModalCamion
          initial={editCamion ?? undefined}
          ubicaciones={ubicaciones}
          onClose={() => { setModalAddCamion(false); setEditCamion(null); }}
        />
      )}
      {(modalAddVehiculo || editVehiculo) && (
        <ModalVehiculo
          initial={editVehiculo ?? undefined}
          ubicaciones={ubicaciones}
          conductores={conductores}
          onClose={() => { setModalAddVehiculo(false); setEditVehiculo(null); }}
        />
      )}
      {(modalAddViaje || editViaje) && (
        <ModalViaje
          initial={editViaje ?? undefined}
          camiones={camiones}
          vehiculos={vehiculos}
          conductores={conductores}
          tiposTrabajo={tiposTrabajo}
          onAddTipoTrabajo={nombre => addTipoTrabajo.mutate(nombre)}
          onClose={() => { setModalAddViaje(false); setEditViaje(null); }}
        />
      )}
      {(modalAddMant || editMant) && (
        <ModalMantenimiento
          initial={editMant ?? undefined}
          camiones={camiones}
          vehiculos={vehiculos}
          tiposMant={tiposMant}
          onClose={() => { setModalAddMant(false); setEditMant(null); }}
        />
      )}
      {(modalAddComb || editComb) && (
        <ModalCombustible
          initial={editComb ?? undefined}
          camiones={camiones}
          vehiculos={vehiculos}
          conductores={conductores}
          onClose={() => { setModalAddComb(false); setEditComb(null); }}
        />
      )}
    </div>
  );
}
