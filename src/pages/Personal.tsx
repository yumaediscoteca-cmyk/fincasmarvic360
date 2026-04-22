import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import jsPDF from 'jspdf';
import {
  ArrowLeft, FileText, Plus, Users, Phone, CreditCard,
  Download, Building2, ChevronDown, ChevronUp, CheckCircle2, XCircle,
} from 'lucide-react';
import {
  usePersonal, useAddPersonal, useUpdatePersonal, useDeletePersonal,
  usePersonalExterno, useAddPersonalExterno, useUpdatePersonalExterno, useDeletePersonalExterno,
  useKPIsPersonal,
  useTiposTrabajoPersonal, useAddTipoTrabajoPersonal, useRemoveTipoTrabajoPersonal,
  useTiposTrabajoCatalogoPersonal, useAddTipoTrabajoCatalogo,
  Personal, PersonalExterno, CategoriaPersonal, TipoExterno,
  CATEGORIA_LABELS, CATEGORIA_COLORS, TIPO_EXTERNO_LABELS,
} from '../hooks/usePersonal';
import { SelectWithOther, AudioInput, PhotoAttachment, RecordActions } from '@/components/base';
import { uploadImage } from '../utils/uploadImage';
import { FINCAS_NOMBRES } from '../constants/farms';

// ── Tipos ────────────────────────────────────────────────────────────────────

type TabType = 'operario_campo' | 'encargado' | 'conductor_maquinaria' | 'conductor_camion' | 'externo';

const TABS: { id: TabType; label: string; color: string }[] = [
  { id: 'operario_campo',       label: 'Operarios',  color: '#22c55e' },
  { id: 'encargado',            label: 'Encargados',  color: '#38bdf8' },
  { id: 'conductor_maquinaria', label: 'Maquinaria',  color: '#fb923c' },
  { id: 'conductor_camion',     label: 'Camion',      color: '#a78bfa' },
  { id: 'externo',              label: 'Externa',     color: '#f472b6' },
];

const LICENCIAS_OPCIONES = ['Carnet tractor', 'Carnet agricola', 'Manipulador fitosanitarios'];
const CARNET_OPCIONES    = ['B', 'C', 'C+E', 'D'];

function diasHastaCaducidad(fecha: string | null): number | null {
  if (!fecha) return null;
  const diff = new Date(fecha).getTime() - Date.now();
  return Math.ceil(diff / 86400000);
}

function formatFecha(iso: string | null): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

async function generarQRDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, { width: 200, margin: 1 });
}

// ── QR Panel ─────────────────────────────────────────────────────────────────

function QRPanel({ qrCode, nombre }: { qrCode: string; nombre: string }) {
  const [dataUrl, setDataUrl] = useState<string>('');

  useEffect(() => {
    generarQRDataUrl(qrCode).then(setDataUrl).catch(() => {});
  }, [qrCode]);

  function descargar() {
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href     = dataUrl;
    a.download = `QR_${nombre.replace(/\s+/g, '_')}.png`;
    a.click();
  }

  if (!dataUrl) return null;

  return (
    <div className="flex items-center gap-3">
      <img src={dataUrl} alt="QR" className="w-16 h-16 rounded border border-white/10" />
      <div>
        <p className="text-slate-500 text-xs mb-1">Codigo QR</p>
        <button
          type="button"
          onClick={descargar}
          className="flex items-center gap-1 text-xs text-slate-400 hover:text-white border border-white/10 rounded px-2 py-1"
        >
          <Download className="w-3 h-3" />
          Descargar
        </button>
      </div>
    </div>
  );
}

// ── Sección tipos trabajo (operarios) ─────────────────────────────────────────

function TiposTrabajoSection({ personalId }: { personalId: string }) {
  const { data: asignados = [] }  = useTiposTrabajoPersonal(personalId);
  const { data: catalogo = [] }   = useTiposTrabajoCatalogoPersonal('operario_campo');
  const addTipo    = useAddTipoTrabajoPersonal();
  const removeTipo = useRemoveTipoTrabajoPersonal();
  const addCat     = useAddTipoTrabajoCatalogo();

  const asignadosIds = new Set(asignados.map(t => t.id));
  const disponibles  = catalogo.filter(t => !asignadosIds.has(t.id));

  async function handleAdd(nombre: string) {
    const existente = catalogo.find(t => t.nombre === nombre);
    let id = existente?.id;
    if (!id) {
      const nuevo = await addCat.mutateAsync({ nombre, categoria: 'operario_campo' });
      id = nuevo.id;
    }
    await addTipo.mutateAsync({ personal_id: personalId, tipo_trabajo_id: id });
  }

  return (
    <div>
      <p className="text-slate-500 text-xs uppercase tracking-wide font-bold mb-2">Trabajos que puede realizar</p>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {asignados.map(t => (
          <span
            key={t.id}
            className="flex items-center gap-1 px-2 py-0.5 rounded border border-green-500/40 text-green-400 text-xs"
          >
            {t.nombre}
            <button
              type="button"
              onClick={() => removeTipo.mutate({ personal_id: personalId, tipo_trabajo_id: t.id })}
              className="text-green-400/60 hover:text-red-400 ml-0.5 leading-none"
            >
              x
            </button>
          </span>
        ))}
        {asignados.length === 0 && (
          <span className="text-slate-600 text-xs">Sin trabajos asignados</span>
        )}
      </div>
      <SelectWithOther
        options={disponibles.map(t => t.nombre)}
        value=""
        onChange={nombre => handleAdd(nombre)}
        onCreateNew={nombre => handleAdd(nombre)}
        placeholder="Añadir trabajo..."
      />
    </div>
  );
}

// ── Modal Personal Fijo ───────────────────────────────────────────────────────

function ModalPersonal({
  onClose,
  initial,
  categoria,
}: {
  onClose: () => void;
  initial?: Personal;
  categoria: CategoriaPersonal;
}) {
  const addMut    = useAddPersonal();
  const updateMut = useUpdatePersonal();

  const [nombre,          setNombre]          = useState(initial?.nombre           ?? '');
  const [dni,             setDni]             = useState(initial?.dni              ?? '');
  const [telefono,        setTelefono]        = useState(initial?.telefono         ?? '');
  const [fechaAlta,       setFechaAlta]       = useState(initial?.fecha_alta       ?? new Date().toISOString().slice(0, 10));
  const [activo,          setActivo]          = useState(initial?.activo           ?? true);
  const [notas,           setNotas]           = useState(initial?.notas            ?? '');
  const [fotoUrl,         setFotoUrl]         = useState<string | null>(initial?.foto_url ?? null);
  const [fotoFile,        setFotoFile]        = useState<File | null>(null);
  const [fincaAsignada,   setFincaAsignada]   = useState(initial?.finca_asignada   ?? '');
  const [licencias,       setLicencias]       = useState(initial?.licencias        ?? '');
  const [carnetTipo,      setCarnetTipo]      = useState(initial?.carnet_tipo      ?? '');
  const [carnetCaducidad, setCarnetCaducidad] = useState(initial?.carnet_caducidad ?? '');
  const [tacografo,       setTacografo]       = useState(initial?.tacografo        ?? false);
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  const color = CATEGORIA_COLORS[categoria];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) { setError('El nombre es obligatorio'); return; }
    setSaving(true);
    try {
      let foto_url = fotoUrl;
      if (fotoFile) {
        const ext  = fotoFile.name.split('.').pop() ?? 'jpg';
        const path = `personal/${Date.now()}.${ext}`;
        foto_url   = await uploadImage(fotoFile, 'parcel-images', path);
      }
      const payload = {
        nombre:           nombre.trim(),
        dni:              dni || null,
        telefono:         telefono || null,
        fecha_alta:       fechaAlta || null,
        activo,
        notas:            notas || null,
        foto_url,
        finca_asignada:   fincaAsignada || null,
        licencias:        licencias || null,
        carnet_tipo:      carnetTipo || null,
        carnet_caducidad: carnetCaducidad || null,
        tacografo:        tacografo,
      };
      if (initial) {
        await updateMut.mutateAsync({ id: initial.id, ...payload });
      } else {
        await addMut.mutateAsync({ ...payload, categoria });
      }
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-white/10 rounded-xl w-full max-w-lg shadow-2xl my-4">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
            <h2 className="text-white font-bold text-sm uppercase tracking-wide">
              {initial ? 'Editar' : 'Nuevo'} — {CATEGORIA_LABELS[categoria]}
            </h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-sm">x</button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && <p className="text-red-400 text-xs">{error}</p>}

          {initial?.codigo_interno && (
            <div>
              <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Codigo interno</p>
              <p className="text-white font-mono text-sm">{initial.codigo_interno}</p>
            </div>
          )}

          <hr className="border-white/5" />

          <div>
            <label className="text-slate-400 text-xs block mb-1">Nombre completo *</label>
            <input
              className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
              value={nombre} onChange={e => setNombre(e.target.value)} required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 text-xs block mb-1">DNI / NIE</label>
              <input
                className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                value={dni} onChange={e => setDni(e.target.value)}
              />
            </div>
            <div>
              <label className="text-slate-400 text-xs block mb-1">Telefono</label>
              <input
                className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                value={telefono} onChange={e => setTelefono(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-slate-400 text-xs block mb-1">Fecha de alta</label>
            <input
              type="date"
              className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
              value={fechaAlta} onChange={e => setFechaAlta(e.target.value)}
            />
          </div>

          <PhotoAttachment
            label="Foto"
            value={fotoFile ? URL.createObjectURL(fotoFile) : fotoUrl}
            onChange={f => { setFotoFile(f); if (!f) setFotoUrl(null); }}
          />

          <AudioInput
            label="Notas"
            value={notas}
            onChange={setNotas}
            rows={2}
            placeholder="Observaciones..."
          />

          {categoria === 'encargado' && (
            <>
              <hr className="border-white/5" />
              <SelectWithOther
                label="Finca asignada"
                options={FINCAS_NOMBRES}
                value={fincaAsignada}
                onChange={setFincaAsignada}
                onCreateNew={v => setFincaAsignada(v)}
                placeholder="Seleccionar finca..."
              />
            </>
          )}

          {categoria === 'conductor_maquinaria' && (
            <>
              <hr className="border-white/5" />
              <SelectWithOther
                label="Licencias"
                options={LICENCIAS_OPCIONES}
                value={licencias}
                onChange={setLicencias}
                onCreateNew={v => setLicencias(v)}
                placeholder="Tipo de licencia..."
              />
            </>
          )}

          {categoria === 'conductor_camion' && (
            <>
              <hr className="border-white/5" />
              <SelectWithOther
                label="Tipo de carnet"
                options={CARNET_OPCIONES}
                value={carnetTipo}
                onChange={setCarnetTipo}
                onCreateNew={v => setCarnetTipo(v)}
                placeholder="Seleccionar carnet..."
              />
              <div>
                <label className="text-slate-400 text-xs block mb-1">Caducidad carnet</label>
                <input
                  type="date"
                  className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                  value={carnetCaducidad} onChange={e => setCarnetCaducidad(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox" id="tacografo-chk" checked={tacografo}
                  onChange={e => setTacografo(e.target.checked)}
                  className="accent-violet-400"
                />
                <label htmlFor="tacografo-chk" className="text-slate-300 text-sm">
                  Tiene tacografo digital
                </label>
              </div>
            </>
          )}

          <hr className="border-white/5" />

          <div className="flex items-center gap-2">
            <input
              type="checkbox" id="activo-chk" checked={activo}
              onChange={e => setActivo(e.target.checked)}
              className="accent-green-500"
            />
            <label htmlFor="activo-chk" className="text-slate-300 text-sm">Activo</label>
          </div>

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 rounded-lg border border-white/10 text-slate-400 text-sm hover:bg-slate-800">
              Cancelar
            </button>
            <button
              type="submit" disabled={saving}
              className="flex-1 py-2 rounded-lg text-white text-sm font-bold disabled:opacity-50"
              style={{ backgroundColor: color }}
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Modal Personal Externo ────────────────────────────────────────────────────

function ModalExterno({
  onClose,
  initial,
}: {
  onClose: () => void;
  initial?: PersonalExterno;
}) {
  const addMut    = useAddPersonalExterno();
  const updateMut = useUpdatePersonalExterno();

  const [empresa,         setEmpresa]         = useState(initial?.nombre_empresa    ?? '');
  const [nif,             setNif]             = useState(initial?.nif               ?? '');
  const [telefono,        setTelefono]        = useState(initial?.telefono_contacto ?? '');
  const [tipo,            setTipo]            = useState<TipoExterno>(initial?.tipo ?? 'jornal_servicio');
  const [personaContacto, setPersonaContacto] = useState(initial?.persona_contacto  ?? '');
  const [activo,          setActivo]          = useState(initial?.activo            ?? true);
  const [notas,           setNotas]           = useState(initial?.notas             ?? '');
  const [trabajosRealiza, setTrabajosRealiza] = useState(initial?.trabajos_realiza  ?? '');
  const [presupuesto,     setPresupuesto]     = useState(initial?.presupuesto       ?? '');
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!empresa.trim()) { setError('El nombre de empresa es obligatorio'); return; }
    setSaving(true);
    try {
      const payload = {
        nombre_empresa:    empresa.trim(),
        nif:               nif || null,
        telefono_contacto: telefono || null,
        tipo,
        activo,
        notas:             notas || null,
        persona_contacto:  personaContacto || null,
        trabajos_realiza:  trabajosRealiza || null,
        presupuesto:       presupuesto || null,
      };
      if (initial) {
        await updateMut.mutateAsync({ id: initial.id, ...payload });
      } else {
        await addMut.mutateAsync(payload);
      }
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-white/10 rounded-xl w-full max-w-lg shadow-2xl my-4">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#f472b6]" />
            <h2 className="text-white font-bold text-sm uppercase tracking-wide">
              {initial ? 'Editar' : 'Nueva'} empresa externa
            </h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-sm">x</button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && <p className="text-red-400 text-xs">{error}</p>}

          {initial?.codigo_interno && (
            <div>
              <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Codigo interno</p>
              <p className="text-white font-mono text-sm">{initial.codigo_interno}</p>
            </div>
          )}

          <hr className="border-white/5" />

          <div>
            <label className="text-slate-400 text-xs block mb-1">Nombre empresa / autonomo *</label>
            <input
              className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
              value={empresa} onChange={e => setEmpresa(e.target.value)} required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 text-xs block mb-1">NIF / CIF</label>
              <input
                className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                value={nif} onChange={e => setNif(e.target.value)}
              />
            </div>
            <div>
              <label className="text-slate-400 text-xs block mb-1">Telefono</label>
              <input
                className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                value={telefono} onChange={e => setTelefono(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-slate-400 text-xs block mb-1">Persona de contacto</label>
            <input
              className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
              value={personaContacto} onChange={e => setPersonaContacto(e.target.value)}
            />
          </div>

          <div>
            <label className="text-slate-400 text-xs block mb-1">Tipo de contratacion</label>
            <select
              className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
              value={tipo} onChange={e => setTipo(e.target.value as TipoExterno)}
            >
              <option value="destajo">A destajo</option>
              <option value="jornal_servicio">A jornal / servicio</option>
            </select>
          </div>

          <AudioInput
            label="Trabajos que realiza"
            value={trabajosRealiza}
            onChange={setTrabajosRealiza}
            rows={2}
            placeholder="Tipos de trabajo que realiza esta empresa..."
          />

          <AudioInput
            label="Presupuesto / tarifas"
            value={presupuesto}
            onChange={setPresupuesto}
            rows={2}
            placeholder="Tarifas o condiciones economicas..."
          />

          <AudioInput
            label="Notas"
            value={notas}
            onChange={setNotas}
            rows={2}
            placeholder="Observaciones..."
          />

          <div className="flex items-center gap-2">
            <input
              type="checkbox" id="activo-ext" checked={activo}
              onChange={e => setActivo(e.target.checked)}
              className="accent-pink-500"
            />
            <label htmlFor="activo-ext" className="text-slate-300 text-sm">Activo</label>
          </div>

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 rounded-lg border border-white/10 text-slate-400 text-sm hover:bg-slate-800">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2 rounded-lg bg-[#f472b6] text-white text-sm font-bold disabled:opacity-50">
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Tarjeta Personal Fijo ─────────────────────────────────────────────────────

function TarjetaPersonal({
  p,
  onEdit,
  onDelete,
}: {
  p: Personal;
  onEdit: (p: Personal) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const color = CATEGORIA_COLORS[p.categoria];
  const dias  = diasHastaCaducidad(p.carnet_caducidad);
  const carnetAlerta = dias !== null && dias <= 30;

  return (
    <div className="bg-slate-900 border border-white/10 rounded-xl overflow-hidden">
      <div
        className="flex items-center justify-between p-3 cursor-pointer select-none"
        onClick={() => setExpanded(x => !x)}
      >
        <div className="flex items-center gap-3 min-w-0">
          {p.foto_url
            ? <img src={p.foto_url} alt={p.nombre} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
            : (
              <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: color + '22' }}>
                <Users className="w-4 h-4" style={{ color }} />
              </div>
            )
          }
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-white font-semibold text-sm truncate">{p.nombre}</p>
              {p.codigo_interno && (
                <span className="text-slate-500 font-mono text-[10px]">{p.codigo_interno}</span>
              )}
            </div>
            {p.telefono && (
              <p className="text-slate-400 text-xs flex items-center gap-1">
                <Phone className="w-3 h-3" />{p.telefono}
              </p>
            )}
            {carnetAlerta && (
              <p className="text-red-400 text-xs">
                Carnet {dias! <= 0 ? 'CADUCADO' : `caduca en ${dias} dias`}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {p.activo
            ? <CheckCircle2 className="w-4 h-4 text-green-400" />
            : <XCircle      className="w-4 h-4 text-red-400" />
          }
          {expanded
            ? <ChevronUp   className="w-4 h-4 text-slate-400" />
            : <ChevronDown className="w-4 h-4 text-slate-400" />
          }
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 pt-2 border-t border-white/10 space-y-3">
          {/* Datos base */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            {p.dni && (
              <div className="flex items-center gap-1.5 text-slate-300">
                <CreditCard className="w-3 h-3 text-slate-500 flex-shrink-0" />
                {p.dni}
              </div>
            )}
            {p.fecha_alta && (
              <div className="text-slate-400">
                Alta: {formatFecha(p.fecha_alta)}
              </div>
            )}
          </div>

          {/* Especificos por categoria */}
          {p.categoria === 'encargado' && p.finca_asignada && (
            <p className="text-xs text-slate-300">
              <span className="text-slate-500">Finca: </span>{p.finca_asignada}
            </p>
          )}

          {p.categoria === 'conductor_maquinaria' && p.licencias && (
            <p className="text-xs text-slate-300">
              <span className="text-slate-500">Licencias: </span>{p.licencias}
            </p>
          )}

          {p.categoria === 'conductor_camion' && (
            <div className="space-y-1 text-xs">
              {p.carnet_tipo && (
                <p className={carnetAlerta ? 'text-red-400' : 'text-slate-300'}>
                  <span className={carnetAlerta ? 'text-red-500' : 'text-slate-500'}>Carnet: </span>
                  {p.carnet_tipo}
                  {p.carnet_caducidad && ` — Caduca: ${formatFecha(p.carnet_caducidad)}`}
                  {dias !== null && dias <= 0 && <span className="ml-1 font-bold"> CADUCADO</span>}
                  {dias !== null && dias > 0 && dias <= 30 && (
                    <span className="ml-1"> ({dias} dias)</span>
                  )}
                </p>
              )}
              {p.tacografo !== null && (
                <p className="text-slate-400">
                  Tacografo: <span className="text-slate-200">{p.tacografo ? 'Si' : 'No'}</span>
                </p>
              )}
            </div>
          )}

          {/* Tipos trabajo: solo operarios */}
          {p.categoria === 'operario_campo' && (
            <TiposTrabajoSection personalId={p.id} />
          )}

          {p.notas && (
            <p className="text-xs text-slate-400 italic">{p.notas}</p>
          )}

          <hr className="border-white/5" />

          <QRPanel qrCode={p.qr_code} nombre={p.nombre} />

          <RecordActions
            onEdit={() => onEdit(p)}
            onDelete={() => onDelete(p.id)}
            confirmMessage={`Eliminar a ${p.nombre}? Esta accion no se puede deshacer.`}
          />
        </div>
      )}
    </div>
  );
}

// ── Tarjeta Empresa Externa ───────────────────────────────────────────────────

function TarjetaExterno({
  p,
  onEdit,
  onDelete,
}: {
  p: PersonalExterno;
  onEdit: (p: PersonalExterno) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-slate-900 border border-white/10 rounded-xl overflow-hidden">
      <div
        className="flex items-center justify-between p-3 cursor-pointer select-none"
        onClick={() => setExpanded(x => !x)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 bg-[#f472b6]/10">
            <Building2 className="w-4 h-4 text-[#f472b6]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-white font-semibold text-sm truncate">{p.nombre_empresa}</p>
              {p.codigo_interno && (
                <span className="text-slate-500 font-mono text-[10px]">{p.codigo_interno}</span>
              )}
            </div>
            <p className="text-slate-400 text-xs">{TIPO_EXTERNO_LABELS[p.tipo]}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {p.activo
            ? <CheckCircle2 className="w-4 h-4 text-green-400" />
            : <XCircle      className="w-4 h-4 text-red-400" />
          }
          {expanded
            ? <ChevronUp   className="w-4 h-4 text-slate-400" />
            : <ChevronDown className="w-4 h-4 text-slate-400" />
          }
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 pt-2 border-t border-white/10 space-y-3">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            {p.nif && (
              <div className="flex items-center gap-1.5 text-slate-300">
                <CreditCard className="w-3 h-3 text-slate-500 flex-shrink-0" />
                {p.nif}
              </div>
            )}
            {p.telefono_contacto && (
              <div className="flex items-center gap-1.5 text-slate-300">
                <Phone className="w-3 h-3 text-slate-500 flex-shrink-0" />
                {p.telefono_contacto}
              </div>
            )}
            {p.persona_contacto && (
              <div className="col-span-2 text-slate-300">
                Contacto: {p.persona_contacto}
              </div>
            )}
          </div>

          {p.trabajos_realiza && (
            <p className="text-xs text-slate-300">
              <span className="text-slate-500">Trabajos: </span>{p.trabajos_realiza}
            </p>
          )}

          {p.presupuesto && (
            <p className="text-xs text-slate-300">
              <span className="text-slate-500">Presupuesto: </span>{p.presupuesto}
            </p>
          )}

          {p.notas && (
            <p className="text-xs text-slate-400 italic">{p.notas}</p>
          )}

          <hr className="border-white/5" />

          <QRPanel qrCode={p.qr_code} nombre={p.nombre_empresa} />

          <RecordActions
            onEdit={() => onEdit(p)}
            onDelete={() => onDelete(p.id)}
            confirmMessage={`Eliminar ${p.nombre_empresa}?`}
          />
        </div>
      )}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function Personal() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabType>('operario_campo');

  const { data: todoPersonal = [] } = usePersonal();
  const { data: externos = [] }     = usePersonalExterno();
  const deleteFijo = useDeletePersonal();
  const deleteExt  = useDeletePersonalExterno();

  const [modalCat,   setModalCat]   = useState<CategoriaPersonal | null>(null);
  const [editFijo,   setEditFijo]   = useState<Personal | null>(null);
  const [editExt,    setEditExt]    = useState<PersonalExterno | null>(null);
  const [newExterno, setNewExterno] = useState(false);

  const listaFija = tab !== 'externo' ? todoPersonal.filter(p => p.categoria === tab) : [];
  const listaExt  = tab === 'externo' ? externos : [];
  const activeTab = TABS.find(t => t.id === tab)!;

  const carnetsCriticos = todoPersonal.filter(p => {
    const d = diasHastaCaducidad(p.carnet_caducidad);
    return d !== null && d <= 30;
  });

  function generarPDF() {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const W = doc.internal.pageSize.getWidth();
    let y = 20;

    const writeLine = (text: string, size = 9, bold = false) => {
      doc.setFontSize(size);
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      if (y > 270) { doc.addPage(); y = 20; }
      doc.text(text, 15, y);
      y += size * 0.5 + 2;
    };
    const separator = () => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.setDrawColor(200, 200, 200);
      doc.line(15, y, W - 15, y);
      y += 4;
    };

    doc.setFillColor(2, 6, 23);
    doc.rect(0, 0, W, 14, 'F');
    doc.setTextColor(255, 255, 255);
    writeLine('AGRICOLA MARVIC — LISTADO DE PERSONAL', 11, true);
    doc.setTextColor(0, 0, 0);
    writeLine(new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' }), 9);
    y += 4;

    const CATS: CategoriaPersonal[] = ['operario_campo', 'encargado', 'conductor_maquinaria', 'conductor_camion'];
    for (const cat of CATS) {
      const lista = todoPersonal.filter(p => p.categoria === cat);
      if (lista.length === 0) continue;
      separator();
      writeLine(CATEGORIA_LABELS[cat].toUpperCase(), 10, true);
      y += 1;
      for (const p of lista) {
        writeLine(
          `${p.activo ? 'ACTIVO' : 'BAJA'}  ${p.nombre}${p.codigo_interno ? `  [${p.codigo_interno}]` : ''}${p.dni ? `  DNI: ${p.dni}` : ''}${p.telefono ? `  Tel: ${p.telefono}` : ''}`,
          8,
        );
      }
      y += 2;
    }

    if (externos.length > 0) {
      separator();
      writeLine('MANO DE OBRA EXTERNA', 10, true);
      y += 1;
      for (const e of externos) {
        writeLine(
          `${e.activo ? 'ACTIVO' : 'BAJA'}  ${e.nombre_empresa}${e.codigo_interno ? `  [${e.codigo_interno}]` : ''}  ${TIPO_EXTERNO_LABELS[e.tipo]}${e.nif ? `  NIF: ${e.nif}` : ''}${e.telefono_contacto ? `  Tel: ${e.telefono_contacto}` : ''}`,
          8,
        );
      }
    }

    doc.save(`Personal_MARVIC_${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      {/* Header */}
      <div className="flex items-center justify-between pl-14 pr-4 pt-4 pb-3 border-b border-white/10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/dashboard')}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#e879f9]/10 flex items-center justify-center">
              <Users className="w-4 h-4 text-[#e879f9]" />
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-tight">PERSONAL</p>
              <p className="text-slate-500 text-[10px]">Gestion de personal de la explotacion</p>
            </div>
          </div>
        </div>
        <button onClick={generarPDF}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 text-xs">
          <FileText className="w-3.5 h-3.5" />
          PDF
        </button>
      </div>

      {/* Panel resumen */}
      <div className="px-4 py-3 space-y-2">
        <div className="grid grid-cols-5 gap-2">
          {[
            { label: 'Operarios',  cat: 'operario_campo' as CategoriaPersonal,       color: '#22c55e', externo: false },
            { label: 'Encargados', cat: 'encargado' as CategoriaPersonal,             color: '#38bdf8', externo: false },
            { label: 'Maquinaria', cat: 'conductor_maquinaria' as CategoriaPersonal,  color: '#fb923c', externo: false },
            { label: 'Camion',     cat: 'conductor_camion' as CategoriaPersonal,      color: '#a78bfa', externo: false },
            { label: 'Externa',    cat: null,                                          color: '#f472b6', externo: true },
          ].map(({ label, cat, color, externo }) => {
            const count = externo
              ? externos.filter(e => e.activo).length
              : todoPersonal.filter(p => p.categoria === cat && p.activo).length;
            return (
              <div key={label} className="bg-slate-900/60 border border-white/10 rounded-lg px-1 py-2 text-center">
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest leading-tight mb-0.5">
                  {label}
                </p>
                <p className="text-base font-black" style={{ color }}>{count}</p>
              </div>
            );
          })}
        </div>

        {/* Alerta carnets */}
        {carnetsCriticos.length > 0 && (
          <div className="border border-red-500/30 rounded-lg px-3 py-2 space-y-0.5">
            <p className="text-red-400 text-xs font-bold uppercase tracking-wide">
              Carnets con caducidad proxima o vencida
            </p>
            {carnetsCriticos.map(p => {
              const d = diasHastaCaducidad(p.carnet_caducidad);
              return (
                <p key={p.id} className="text-red-300 text-xs">
                  {p.nombre}
                  {p.carnet_tipo ? ` — carnet ${p.carnet_tipo}` : ''}
                  {' — '}
                  {d !== null && d <= 0 ? 'CADUCADO' : `caduca en ${d} dias`}
                  {' '}({formatFecha(p.carnet_caducidad)})
                </p>
              );
            })}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-4 pb-3 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all"
            style={tab === t.id
              ? { backgroundColor: t.color + '22', color: t.color, border: `1px solid ${t.color}55` }
              : { backgroundColor: 'transparent', color: '#94a3b8', border: '1px solid transparent' }
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Lista */}
      <div className="px-4 pb-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-white text-sm font-bold uppercase tracking-wide">
            {activeTab.label}
            <span className="text-slate-500 text-xs font-normal ml-2 normal-case">
              ({tab === 'externo' ? listaExt.length : listaFija.length})
            </span>
          </span>
          <button
            onClick={() => {
              if (tab === 'externo') setNewExterno(true);
              else setModalCat(tab as CategoriaPersonal);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-semibold"
            style={{ backgroundColor: activeTab.color }}
          >
            <Plus className="w-3.5 h-3.5" />
            Nuevo
          </button>
        </div>

        {tab !== 'externo' && (
          listaFija.length === 0
            ? <p className="text-slate-500 text-sm text-center py-8">Sin registros en esta categoria</p>
            : <div className="space-y-2">
                {listaFija.map(p => (
                  <TarjetaPersonal
                    key={p.id}
                    p={p}
                    onEdit={setEditFijo}
                    onDelete={id => deleteFijo.mutate(id)}
                  />
                ))}
              </div>
        )}

        {tab === 'externo' && (
          listaExt.length === 0
            ? <p className="text-slate-500 text-sm text-center py-8">Sin empresas externas registradas</p>
            : <div className="space-y-2">
                {listaExt.map(p => (
                  <TarjetaExterno
                    key={p.id}
                    p={p}
                    onEdit={setEditExt}
                    onDelete={id => deleteExt.mutate(id)}
                  />
                ))}
              </div>
        )}
      </div>

      {/* Modales */}
      {modalCat && (
        <ModalPersonal
          categoria={modalCat}
          onClose={() => setModalCat(null)}
        />
      )}
      {editFijo && (
        <ModalPersonal
          categoria={editFijo.categoria}
          initial={editFijo}
          onClose={() => setEditFijo(null)}
        />
      )}
      {(newExterno || editExt) && (
        <ModalExterno
          initial={editExt ?? undefined}
          onClose={() => { setNewExterno(false); setEditExt(null); }}
        />
      )}
    </div>
  );
}
