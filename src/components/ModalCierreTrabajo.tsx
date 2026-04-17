import React, { useState, useMemo } from 'react';
import { X, CheckCircle2, Loader2, Wheat, Leaf, Package } from 'lucide-react';
import { useCerrarTrabajoCompleto, type DatosCierreTrabajo } from '@/hooks/useCerrarTrabajoCompleto';
import { getAccionCierre } from '@/constants/cierreTrabajoMap';
import { useCropCatalog } from '@/hooks/useParcelData';
import { supabase } from '@/integrations/supabase/client';

const INPUT = 'w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-[#6d9b7d]/50 focus:outline-none';

interface TrabajoParaCierre {
  id: string;
  tipo_trabajo: string;
  parcel_id: string | null;
  finca: string | null;
  fecha: string;
  hora_inicio: string | null;
  hora_fin: string | null;
  notas: string | null;
  foto_url: string | null;
  materiales_previstos: unknown;
}

interface Props {
  trabajo: TrabajoParaCierre;
  onClose: () => void;
}

interface MaterialCierre {
  nombre: string;
  cantidad: number;
  unidad: string;
  productoId: string | null;
  categoriaId: string | null;
  ubicacionOrigenId: string | null;
  incluir: boolean;
}

export default function ModalCierreTrabajo({ trabajo, onClose }: Props) {
  const { accion } = getAccionCierre(trabajo.tipo_trabajo);
  const cerrarMut = useCerrarTrabajoCompleto();
  const { data: cultivos = [] } = useCropCatalog();

  const [horaInicio, setHoraInicio] = useState(trabajo.hora_inicio?.slice(0, 5) ?? '');
  const [horaFin, setHoraFin] = useState(trabajo.hora_fin?.slice(0, 5) ?? '');
  const [notas, setNotas] = useState(trabajo.notas ?? '');

  const [crop, setCrop] = useState('');
  const [variedad, setVariedad] = useState('');
  const [productionKg, setProductionKg] = useState('');
  const [fechaCosecha, setFechaCosecha] = useState(trabajo.fecha ?? '');

  const [materiales, setMateriales] = useState<MaterialCierre[]>(() => {
    if (!trabajo.materiales_previstos || !Array.isArray(trabajo.materiales_previstos)) return [];
    return (trabajo.materiales_previstos as { nombre: string; cantidad?: string }[]).map(m => ({
      nombre: m.nombre,
      cantidad: parseFloat(m.cantidad ?? '0') || 0,
      unidad: 'ud',
      productoId: null,
      categoriaId: null,
      ubicacionOrigenId: null,
      incluir: true,
    }));
  });

  const [matchingProductos, setMatchingProductos] = useState(false);
  const [productosResueltos, setProductosResueltos] = useState(false);

  const resolverProductos = async () => {
    if (materiales.length === 0) return;
    setMatchingProductos(true);
    try {
      const { data: productos } = await supabase
        .from('inventario_productos_catalogo')
        .select('id, nombre, categoria_id')
        .eq('activo', true);

      if (!productos) { setProductosResueltos(true); setMatchingProductos(false); return; }

      const normMap = new Map(productos.map(p => [
        p.nombre.trim().toLowerCase().replace(/\s+/g, ' '),
        { id: p.id, categoriaId: p.categoria_id },
      ]));

      setMateriales(prev => prev.map(m => {
        const key = m.nombre.trim().toLowerCase().replace(/\s+/g, ' ');
        const match = normMap.get(key);
        return match
          ? { ...m, productoId: match.id, categoriaId: match.categoriaId }
          : m;
      }));
      setProductosResueltos(true);
    } finally {
      setMatchingProductos(false);
    }
  };

  const esCosecha = accion === 'cosecha';
  const esPlantacion = accion === 'plantacion';

  const errores = useMemo(() => {
    const e: string[] = [];
    if (esCosecha) {
      if (!crop) e.push('Selecciona un cultivo');
      if (!productionKg || parseFloat(productionKg) <= 0) e.push('Indica los kg producidos');
      if (!fechaCosecha) e.push('Indica la fecha');
    }
    if (esPlantacion) {
      if (!crop) e.push('Selecciona un cultivo');
      if (!variedad.trim()) e.push('Indica la variedad');
      if (!fechaCosecha) e.push('Indica la fecha');
    }
    return e;
  }, [esCosecha, esPlantacion, crop, productionKg, variedad, fechaCosecha]);

  const handleConfirmar = async () => {
    if (errores.length > 0) return;

    if (materiales.some(m => m.incluir) && !productosResueltos) {
      await resolverProductos();
    }

    const datos: DatosCierreTrabajo = {
      trabajoId: trabajo.id,
      tipoTrabajo: trabajo.tipo_trabajo,
      parcelId: trabajo.parcel_id,
      finca: trabajo.finca,
      fecha: trabajo.fecha,
      horaInicio: horaInicio || null,
      horaFin: horaFin || null,
      notas: notas || null,
      fotoUrl: trabajo.foto_url,
    };

    if (esCosecha && trabajo.parcel_id) {
      datos.datosCosecha = {
        crop,
        productionKg: parseFloat(productionKg),
        date: fechaCosecha,
      };
    }

    if (esPlantacion && trabajo.parcel_id) {
      datos.datosPlantacion = {
        crop,
        variedad: variedad.trim(),
        date: fechaCosecha,
      };
    }

    const matsActivos = materiales.filter(m => m.incluir && m.cantidad > 0);
    if (matsActivos.length > 0) {
      datos.materialesConsumidos = matsActivos.map(m => ({
        nombre: m.nombre,
        cantidad: m.cantidad,
        unidad: m.unidad,
        productoId: m.productoId,
        categoriaId: m.categoriaId,
        ubicacionOrigenId: m.ubicacionOrigenId,
      }));
    }

    await cerrarMut.mutateAsync(datos);
    onClose();
  };

  const tituloAccion = esCosecha ? 'Cierre con Cosecha' : esPlantacion ? 'Cierre con Plantación' : 'Cerrar Trabajo';

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-white/10 rounded-xl w-full max-w-md shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-white/10 shrink-0">
          <CheckCircle2 className="w-4 h-4 text-green-400" />
          <div className="flex-1">
            <p className="text-[11px] font-black text-white uppercase tracking-wider">{tituloAccion}</p>
            <p className="text-[9px] text-slate-500">{trabajo.tipo_trabajo} — {trabajo.finca ?? 'Sin finca'}</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Horarios reales */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Hora inicio real</label>
              <input type="time" value={horaInicio} onChange={e => setHoraInicio(e.target.value)} className={INPUT} />
            </div>
            <div>
              <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Hora fin real</label>
              <input type="time" value={horaFin} onChange={e => setHoraFin(e.target.value)} className={INPUT} />
            </div>
          </div>

          {/* Seccion cosecha */}
          {esCosecha && trabajo.parcel_id && (
            <div className="space-y-3 p-3 rounded-lg border border-green-500/20 bg-green-500/5">
              <div className="flex items-center gap-2">
                <Wheat className="w-3.5 h-3.5 text-green-400" />
                <p className="text-[10px] font-black text-green-400 uppercase tracking-widest">Datos de cosecha</p>
              </div>
              <div>
                <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Cultivo *</label>
                <select value={crop} onChange={e => setCrop(e.target.value)} className={INPUT}>
                  <option value="">Seleccionar...</option>
                  {cultivos.map(c => <option key={c.id} value={c.nombre_interno}>{c.nombre_display}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Kg producidos *</label>
                  <input type="number" value={productionKg} onChange={e => setProductionKg(e.target.value)} className={INPUT} min="0" step="0.01" />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Fecha *</label>
                  <input type="date" value={fechaCosecha} onChange={e => setFechaCosecha(e.target.value)} className={INPUT} />
                </div>
              </div>
            </div>
          )}

          {esCosecha && !trabajo.parcel_id && (
            <p className="text-[10px] text-amber-400 p-2 bg-amber-500/10 rounded-lg border border-amber-500/20">
              Sin parcela asignada. La cosecha no se registrara automaticamente.
            </p>
          )}

          {/* Seccion plantacion */}
          {esPlantacion && trabajo.parcel_id && (
            <div className="space-y-3 p-3 rounded-lg border border-primary/20 bg-primary/5">
              <div className="flex items-center gap-2">
                <Leaf className="w-3.5 h-3.5 text-primary" />
                <p className="text-[10px] font-black text-primary uppercase tracking-widest">Datos de plantacion</p>
              </div>
              <div>
                <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Cultivo *</label>
                <select value={crop} onChange={e => setCrop(e.target.value)} className={INPUT}>
                  <option value="">Seleccionar...</option>
                  {cultivos.map(c => <option key={c.id} value={c.nombre_interno}>{c.nombre_display}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Variedad *</label>
                  <input type="text" value={variedad} onChange={e => setVariedad(e.target.value)} className={INPUT} placeholder="Ej: MERIKO" />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Fecha *</label>
                  <input type="date" value={fechaCosecha} onChange={e => setFechaCosecha(e.target.value)} className={INPUT} />
                </div>
              </div>
            </div>
          )}

          {esPlantacion && !trabajo.parcel_id && (
            <p className="text-[10px] text-amber-400 p-2 bg-amber-500/10 rounded-lg border border-amber-500/20">
              Sin parcela asignada. La plantacion no se registrara automaticamente.
            </p>
          )}

          {/* Materiales consumidos */}
          {materiales.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Package className="w-3.5 h-3.5 text-slate-400" />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Materiales consumidos</p>
              </div>
              {materiales.map((m, i) => (
                <div key={i} className="flex items-center gap-2 p-2 bg-slate-800 rounded-lg border border-white/5">
                  <input
                    type="checkbox"
                    checked={m.incluir}
                    onChange={e => setMateriales(prev => prev.map((x, j) => j === i ? { ...x, incluir: e.target.checked } : x))}
                    className="w-3.5 h-3.5 rounded"
                  />
                  <span className="flex-1 text-[10px] text-white truncate">{m.nombre}</span>
                  <input
                    type="number"
                    value={m.cantidad}
                    onChange={e => setMateriales(prev => prev.map((x, j) => j === i ? { ...x, cantidad: parseFloat(e.target.value) || 0 } : x))}
                    className="w-16 bg-slate-700 border border-white/10 rounded px-2 py-1 text-[10px] text-white text-right"
                    min="0"
                    step="0.1"
                  />
                  <input
                    type="text"
                    value={m.unidad}
                    onChange={e => setMateriales(prev => prev.map((x, j) => j === i ? { ...x, unidad: e.target.value } : x))}
                    className="w-12 bg-slate-700 border border-white/10 rounded px-2 py-1 text-[10px] text-white"
                    placeholder="ud"
                  />
                  {m.productoId && <span className="text-[8px] text-green-400" title="Vinculado a inventario">INV</span>}
                </div>
              ))}
              {!productosResueltos && materiales.some(m => m.incluir) && (
                <button
                  type="button"
                  onClick={resolverProductos}
                  disabled={matchingProductos}
                  className="w-full text-[9px] text-slate-400 border border-white/10 rounded-lg py-1.5 hover:text-white hover:border-white/20 transition-colors disabled:opacity-40"
                >
                  {matchingProductos ? 'Buscando productos...' : 'Vincular con inventario'}
                </button>
              )}
            </div>
          )}

          {/* Notas */}
          <div>
            <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Notas de ejecucion</label>
            <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={2} className={INPUT} placeholder="Observaciones..." />
          </div>

          {/* Errores de validacion */}
          {errores.length > 0 && (
            <div className="p-2 bg-red-500/10 border border-red-500/20 rounded-lg">
              {errores.map((e, i) => <p key={i} className="text-[9px] text-red-400">{e}</p>)}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 py-3 border-t border-white/10 shrink-0">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-white/10 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleConfirmar}
            disabled={errores.length > 0 || cerrarMut.isPending}
            className="flex-1 py-2 rounded-lg bg-green-600 text-[10px] font-black uppercase tracking-widest text-white transition-colors hover:bg-green-500 disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {cerrarMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            {cerrarMut.isPending ? 'Cerrando...' : 'Confirmar ejecucion'}
          </button>
        </div>
      </div>
    </div>
  );
}
