import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Warehouse, Tag, Package,
  Activity, Wifi, FileText, Filter, Clock, Moon, Sun,
  ShoppingCart, Users, ChevronDown, ChevronRight, Plus, Trash2, Edit2,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../integrations/supabase/client';
import { generarPDFCorporativoBase, pdfCorporateSection, PDF_BRAND, PDF_MARGIN, PDF_TEXT_W } from '../utils/pdfUtils';
import {
  useUbicaciones, useTotalRegistros,
  useConteosUbicaciones, useCategorias,
  useProveedores, useAddProveedor, useUpdateProveedor, useDeleteProveedor,
  usePreciosProveedor, useAddPrecioProveedor,
  useEntradas, useAddEntrada, useDeleteEntrada,
  useProductosCatalogo,
} from '../hooks/useInventario';
import { usePersonal } from '../hooks/usePersonal';
import { SelectWithOther, AudioInput, PhotoAttachment, RecordActions } from '../components/base';
import { useCatalogoLocal } from '../hooks/useCatalogoLocal';
import { uploadImage, buildStoragePath } from '../utils/uploadImage';
import type { Tables } from '../integrations/supabase/types';

// ─── Tipos ───────────────────────────────────────────────────────────────────

type RegConRel = {
  id: string
  ubicacion_id: string
  categoria_id: string
  cantidad: number
  unidad: string
  descripcion: string | null
  foto_url: string | null
  foto_url_2: string | null
  notas: string | null
  created_at: string
  precio_unitario: number | null
  responsable: string | null
  inventario_ubicaciones: { nombre: string } | null
  inventario_categorias:  { nombre: string } | null
}

type MainTab = 'ubicaciones' | 'entradas' | 'proveedores'

const TIPOS_PROVEEDOR = [
  'proveedor_materiales', 'ganadero', 'gestor_residuos_plasticos', 'otro',
]
const TIPOS_PROVEEDOR_LABEL: Record<string, string> = {
  proveedor_materiales: 'Proveedor materiales',
  ganadero: 'Ganadero',
  gestor_residuos_plasticos: 'Gestor residuos plásticos',
  otro: 'Otro',
}
const UNIDADES_FRECUENTES = ['kg', 'litros', 'unidades', 'sacos', 'cajas', 'rollos', 'bidones', 'palés']

// ─── Componente ──────────────────────────────────────────────────────────────

export default function Inventario() {
  const catUnidades = useCatalogoLocal('inventario_unidades', UNIDADES_FRECUENTES);
  const catReceptores = useCatalogoLocal('inventario_receptores', []);
  const [mainTab,        setMainTab]        = useState<MainTab>('ubicaciones');
  const [hoveredId,      setHoveredId]      = useState<string | null>(null);
  const [now,            setNow]            = useState(new Date());
  const [showModal,      setShowModal]      = useState(false);
  const [genPdf,         setGenPdf]         = useState(false);
  const [selUbics,       setSelUbics]       = useState<Set<string>>(new Set());
  const [selCats,        setSelCats]        = useState<Set<string>>(new Set());
  const [fechaDesde,     setFechaDesde]     = useState(() => {
    const d = new Date(); d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [fechaHasta,     setFechaHasta]     = useState(() => new Date().toISOString().split('T')[0]);

  // ── Estado tab Entradas ───────────────────────────────────────
  const [showEntradaModal,   setShowEntradaModal]   = useState(false);
  const [filtroUbicacion,    setFiltroUbicacion]    = useState('');
  const [filtroCategoria,    setFiltroCategoria]    = useState('');
  const [filtroDesde,        setFiltroDesde]        = useState('');
  const [filtroHasta,        setFiltroHasta]        = useState('');
  const [entradaProveedorId, setEntradaProveedorId] = useState('');
  const [entradaUbicacion,   setEntradaUbicacion]   = useState('');
  const [entradaCategoria,   setEntradaCategoria]   = useState('');
  const [entradaProductoId,  setEntradaProductoId]  = useState('');
  const [entradaCantidad,    setEntradaCantidad]    = useState('');
  const [entradaUnidad,      setEntradaUnidad]      = useState('kg');
  const [entradaPrecio,      setEntradaPrecio]      = useState('');
  const [entradaReceptor,    setEntradaReceptor]    = useState('');
  const [entradaFecha,       setEntradaFecha]       = useState(() => new Date().toISOString().split('T')[0]);
  const [entradaFotoFile,    setEntradaFotoFile]    = useState<File | null>(null);
  const [entradaNotas,       setEntradaNotas]       = useState('');
  const [entradaSubmitting,  setEntradaSubmitting]  = useState(false);
  const [entradaError,       setEntradaError]       = useState<string | null>(null);

  // ── Estado tab Proveedores ────────────────────────────────────
  const [showProvModal,      setShowProvModal]      = useState(false);
  const [editProv,           setEditProv]           = useState<Tables<'proveedores'> | null>(null);
  const [provNombre,         setProvNombre]         = useState('');
  const [provNif,            setProvNif]            = useState('');
  const [provTelefono,       setProvTelefono]       = useState('');
  const [provEmail,          setProvEmail]          = useState('');
  const [provTipo,           setProvTipo]           = useState('');
  const [provContacto,       setProvContacto]       = useState('');
  const [provActivo,         setProvActivo]         = useState(true);
  const [provNotas,          setProvNotas]          = useState('');
  const [provFotoFile,       setProvFotoFile]       = useState<File | null>(null);
  const [provSubmitting,     setProvSubmitting]     = useState(false);
  const [provError,          setProvError]          = useState<string | null>(null);
  const [expandedProvId,     setExpandedProvId]     = useState<string | null>(null);
  const [showPrecioModal,    setShowPrecioModal]    = useState(false);
  const [precioProvId,       setPrecioProvId]       = useState<string | null>(null);
  const [precioProducto,     setPrecioProducto]     = useState('');
  const [precioUnidad,       setPrecioUnidad]       = useState('');
  const [precioValor,        setPrecioValor]        = useState('');
  const [precioVigencia,     setPrecioVigencia]     = useState(() => new Date().toISOString().split('T')[0]);
  const [precioSubmitting,   setPrecioSubmitting]   = useState(false);

  const navigate                = useNavigate();
  const { theme, toggleTheme }  = useTheme();
  const { data: ubicaciones = [],  isLoading }          = useUbicaciones();
  const { data: categorias  = [] }                       = useCategorias();
  const { data: totalRegistros, isLoading: isLoadingTotal } = useTotalRegistros();
  const { data: conteos }                                = useConteosUbicaciones();
  const { data: proveedores = [] }                       = useProveedores();
  const { data: entradas = [] }                          = useEntradas(
    filtroUbicacion || null,
    filtroDesde || undefined,
    filtroHasta || undefined,
  );
  const { data: productos = [] }                         = useProductosCatalogo(entradaCategoria || null);
  const { data: personal = [] }                          = usePersonal();
  const { data: precios = [] }                           = usePreciosProveedor(expandedProvId);
  const addProveedor    = useAddProveedor();
  const updateProveedor = useUpdateProveedor();
  const deleteProveedor = useDeleteProveedor();
  const addPrecio       = useAddPrecioProveedor();
  const addEntrada      = useAddEntrada();
  const deleteEntrada   = useDeleteEntrada();

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const isDark   = theme === 'dark';
  const horaStr  = now.toTimeString().slice(0, 8);
  const fechaStr = now.toLocaleDateString('es-ES', {
    weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric'
  }).toUpperCase();

  // ── Importe calculado entrada ────────────────────────────────
  const importeCalc = parseFloat(entradaCantidad || '0') * parseFloat(entradaPrecio || '0');

  // ── Modal PDF global ─────────────────────────────────────────
  function abrirModal() {
    setSelUbics(new Set(ubicaciones.map(u => u.id)));
    setSelCats(new Set(categorias.map(c => c.id)));
    setShowModal(true);
  }

  function toggleUbic(id: string) {
    setSelUbics(prev => { const s = new Set(prev); if (s.has(id)) s.delete(id); else s.add(id); return s; });
  }
  function toggleCat(id: string) {
    setSelCats(prev => { const s = new Set(prev); if (s.has(id)) s.delete(id); else s.add(id); return s; });
  }

  // ── Abrir modal proveedor ────────────────────────────────────
  function openProvModal(p?: Tables<'proveedores'>) {
    setEditProv(p ?? null);
    setProvNombre(p?.nombre ?? '');
    setProvNif(p?.nif ?? '');
    setProvTelefono(p?.telefono ?? '');
    setProvEmail(p?.email ?? '');
    setProvTipo(p?.tipo ?? '');
    setProvContacto(p?.persona_contacto ?? '');
    setProvActivo(p?.activo ?? true);
    setProvNotas(p?.notas ?? '');
    setProvFotoFile(null);
    setProvError(null);
    setShowProvModal(true);
  }

  async function handleGuardarProveedor() {
    if (!provNombre.trim()) { setProvError('El nombre es obligatorio'); return; }
    setProvSubmitting(true);
    setProvError(null);
    try {
      let foto_url: string | undefined = editProv?.foto_url ?? undefined;
      if (provFotoFile) {
        foto_url = await uploadImage(provFotoFile, 'inventario-images', buildStoragePath('proveedores', provFotoFile)) ?? undefined;
      }
      const payload = {
        nombre: provNombre.trim(),
        nif: provNif || null,
        telefono: provTelefono || null,
        email: provEmail || null,
        tipo: provTipo || null,
        persona_contacto: provContacto || null,
        activo: provActivo,
        notas: provNotas || null,
        foto_url: foto_url ?? null,
      };
      if (editProv) {
        await updateProveedor.mutateAsync({ id: editProv.id, ...payload });
      } else {
        await addProveedor.mutateAsync(payload);
      }
      setShowProvModal(false);
    } catch (e: unknown) {
      setProvError(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setProvSubmitting(false);
    }
  }

  async function handleEliminarProveedor(id: string) {
    if (!confirm('¿Eliminar este proveedor?')) return;
    await deleteProveedor.mutateAsync(id);
  }

  // ── Guardar precio ───────────────────────────────────────────
  async function handleGuardarPrecio() {
    if (!precioProvId || !precioProducto.trim()) return;
    setPrecioSubmitting(true);
    try {
      await addPrecio.mutateAsync({
        proveedor_id: precioProvId,
        producto: precioProducto.trim(),
        unidad: precioUnidad || null,
        precio_unitario: parseFloat(precioValor) || null,
        fecha_vigencia: precioVigencia || null,
      });
      setShowPrecioModal(false);
      setPrecioProducto(''); setPrecioUnidad(''); setPrecioValor('');
    } finally {
      setPrecioSubmitting(false);
    }
  }

  // ── Guardar entrada ──────────────────────────────────────────
  async function handleGuardarEntrada() {
    if (!entradaUbicacion || !entradaCategoria || !entradaCantidad) {
      setEntradaError('Ubicación, categoría y cantidad son obligatorios');
      return;
    }
    setEntradaSubmitting(true);
    setEntradaError(null);
    try {
      let foto_albaran: string | null = null;
      if (entradaFotoFile) {
        foto_albaran = await uploadImage(entradaFotoFile, 'inventario-images', buildStoragePath('albaran', entradaFotoFile));
      }
      await addEntrada.mutateAsync({
        proveedor_id: entradaProveedorId || null,
        ubicacion_id: entradaUbicacion,
        categoria_id: entradaCategoria,
        producto_id: entradaProductoId || null,
        cantidad: parseFloat(entradaCantidad),
        unidad: entradaUnidad,
        precio_unitario: parseFloat(entradaPrecio) || null,
        importe_total: importeCalc > 0 ? importeCalc : null,
        receptor: entradaReceptor || null,
        fecha: entradaFecha || null,
        foto_albaran,
        notas: entradaNotas || null,
      });
      setShowEntradaModal(false);
      setEntradaProveedorId(''); setEntradaUbicacion(''); setEntradaCategoria('');
      setEntradaProductoId(''); setEntradaCantidad(''); setEntradaUnidad('kg');
      setEntradaPrecio(''); setEntradaReceptor(''); setEntradaNotas('');
      setEntradaFotoFile(null);
    } catch (e: unknown) {
      setEntradaError(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setEntradaSubmitting(false);
    }
  }

  // ── Generar PDF global ────────────────────────────────────────
  async function generarPDFGlobal() {
    if (selUbics.size === 0 || selCats.size === 0) return;
    setGenPdf(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: registros, error } = await (supabase as any)
        .from('inventario_registros')
        .select('*, inventario_ubicaciones(nombre), inventario_categorias(nombre)')
        .in('ubicacion_id', Array.from(selUbics))
        .in('categoria_id', Array.from(selCats))
        .gte('created_at', fechaDesde + 'T00:00:00')
        .lte('created_at', fechaHasta + 'T23:59:59')
        .order('ubicacion_id')
        .order('categoria_id')
        .order('created_at', { ascending: false });

      if (error) throw error;
      const rows: RegConRel[] = registros ?? [];

      await generarPDFCorporativoBase({
        titulo: 'INFORME GLOBAL DE INVENTARIO',
        subtitulo: 'Agrícola Marvic 360',
        fecha: new Date(),
        filename: `Inventario_Global_${fechaDesde}_${fechaHasta}.pdf`,
        bloques: [(ctx) => {
          const doc = ctx.doc;
          doc.setFontSize(9);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(...PDF_BRAND.muted);
          doc.text(`Período: ${fechaDesde} → ${fechaHasta}`, PDF_MARGIN, ctx.y);
          ctx.y += 5;
          doc.text(`Generado: ${new Date().toLocaleString('es-ES')}`, PDF_MARGIN, ctx.y);
          ctx.y += 7;
          if (rows.length === 0) {
            doc.setTextColor(...PDF_BRAND.green);
            doc.text('Sin registros para el período y filtros seleccionados.', PDF_MARGIN, ctx.y);
            return;
          }
          const porUbic = new Map<string, RegConRel[]>();
          for (const r of rows) {
            if (!porUbic.has(r.ubicacion_id)) porUbic.set(r.ubicacion_id, []);
            porUbic.get(r.ubicacion_id)!.push(r);
          }
          for (const [, regsUbic] of porUbic) {
            const nombreUbic = regsUbic[0]?.inventario_ubicaciones?.nombre ?? '—';
            pdfCorporateSection(ctx, `Ubicación · ${nombreUbic}`);
            const porCat = new Map<string, RegConRel[]>();
            for (const r of regsUbic) {
              if (!porCat.has(r.categoria_id)) porCat.set(r.categoria_id, []);
              porCat.get(r.categoria_id)!.push(r);
            }
            for (const [, regsCat] of porCat) {
              const nombreCat = regsCat[0]?.inventario_categorias?.nombre ?? '—';
              doc.setFont('helvetica', 'bold');
              doc.setFontSize(9);
              doc.setTextColor(...PDF_BRAND.green);
              ctx.checkPage(8);
              doc.text(`Categoría: ${nombreCat} (${regsCat.length} reg.)`, PDF_MARGIN, ctx.y);
              ctx.y += 5;
              doc.setFont('helvetica', 'normal');
              doc.setFontSize(8);
              for (const r of regsCat) {
                const fecha = new Date(r.created_at).toLocaleDateString('es-ES');
                const line = `  ${fecha}  ·  ${r.cantidad} ${r.unidad}${r.descripcion ? `  ·  ${r.descripcion}` : ''}`;
                const lines = doc.splitTextToSize(line, PDF_TEXT_W) as string[];
                for (const ln of lines) {
                  ctx.checkPage(4);
                  doc.text(ln, PDF_MARGIN, ctx.y);
                  ctx.y += 4;
                }
                if (r.precio_unitario) {
                  ctx.checkPage(4);
                  doc.text(`  Precio: ${r.precio_unitario.toFixed(2)} €`, PDF_MARGIN, ctx.y);
                  ctx.y += 4;
                }
                if (r.notas) {
                  const ns = doc.splitTextToSize(`  Notas: ${r.notas}`, PDF_TEXT_W) as string[];
                  for (const ln of ns) {
                    ctx.checkPage(4);
                    doc.text(ln, PDF_MARGIN, ctx.y);
                    ctx.y += 4;
                  }
                }
                ctx.y += 2;
              }
              ctx.y += 2;
            }
            ctx.separator();
          }
          ctx.checkPage(6);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10);
          doc.setTextColor(...PDF_BRAND.green);
          doc.text(`Total registros: ${rows.length}`, PDF_MARGIN, ctx.y);
        }],
      });
      setShowModal(false);
    } finally {
      setGenPdf(false);
    }
  }

  // ── Entradas filtradas ────────────────────────────────────────
  const entradasFiltradas = filtroCategoria
    ? entradas.filter(e => e.categoria_id === filtroCategoria)
    : entradas;

  // ─────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col transition-colors duration-300">

      {/* BARRA SUPERIOR — tema integrado (GlobalThemeToggle oculto en esta ruta) */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200/90 bg-white/95 backdrop-blur-md dark:border-white/10 dark:bg-slate-900/92 pt-[max(0.25rem,env(safe-area-inset-top,0px))] pl-14 pr-3 sm:pr-5">
        <div className="flex min-h-[2.75rem] flex-col gap-2 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="flex min-w-0 items-start gap-2.5">
            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-green-400 animate-pulse" aria-hidden />
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0">
                <h1 className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-900 dark:text-white">
                  Inventario
                </h1>
                <span className="text-[10px] font-black uppercase tracking-widest text-[#6d9b7d]">
                  Activos físicos
                </span>
              </div>
              <p className="mt-0.5 text-[10px] font-mono text-slate-500 dark:text-slate-400">{fechaStr}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 sm:shrink-0">
            <button
              type="button"
              onClick={abrirModal}
              className="flex items-center gap-1.5 rounded-lg border border-[#6d9b7d]/35 bg-[#6d9b7d]/8 px-2.5 py-1.5 text-[#6d9b7d] transition-colors hover:bg-[#6d9b7d]/14"
            >
              <FileText className="h-3.5 w-3.5 shrink-0" />
              <span className="text-[9px] font-black uppercase tracking-widest">Informe</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-100 px-2.5 py-1.5 text-slate-600 transition-colors hover:border-[#6d9b7d]/45 hover:text-[#6d9b7d] dark:border-white/10 dark:bg-slate-800/70 dark:text-slate-300"
            >
              <ArrowLeft className="h-3.5 w-3.5 shrink-0" />
              <span className="text-[9px] font-black uppercase tracking-widest">Volver</span>
            </button>

            <div
              className="flex items-center gap-2 rounded-lg border border-slate-200/90 bg-slate-50 px-2 py-1 dark:border-white/10 dark:bg-slate-800/55"
              title="Estado de conexión"
            >
              <Wifi className="h-3.5 w-3.5 shrink-0 text-green-500 dark:text-green-400" aria-hidden />
              <span className="text-[9px] font-bold uppercase tracking-wider text-green-600 dark:text-green-400">
                Online
              </span>
              <span className="h-3 w-px shrink-0 bg-slate-200 dark:bg-white/15" aria-hidden />
              <Clock className="h-3 w-3 shrink-0 text-slate-400 dark:text-slate-500" aria-hidden />
              <span className="font-mono text-[10px] tabular-nums text-slate-600 dark:text-slate-300">{horaStr}</span>
            </div>

            <button
              type="button"
              onClick={toggleTheme}
              aria-label={isDark ? 'Activar modo claro' : 'Activar modo oscuro'}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
            >
              {isDark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
            </button>
          </div>
        </div>
      </header>

      {/* MAIN TABS */}
      <div className="w-full bg-white dark:bg-slate-900/80 border-b border-slate-200 dark:border-white/10 px-6 flex gap-1 pt-2">
        {[
          { id: 'ubicaciones' as MainTab, label: 'Ubicaciones', icon: Warehouse },
          { id: 'entradas'    as MainTab, label: 'Entradas de stock', icon: ShoppingCart },
          { id: 'proveedores' as MainTab, label: 'Proveedores', icon: Users },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setMainTab(id)}
            className={`flex items-center gap-1.5 px-4 py-2 text-[11px] font-black uppercase tracking-widest border-b-2 transition-all ${
              mainTab === id
                ? 'border-[#6d9b7d] text-[#6d9b7d]'
                : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* CONTENIDO */}
      <main className="flex-1 px-6 py-8">

        {/* ═══ TAB: UBICACIONES ═══ */}
        {mainTab === 'ubicaciones' && (
          <div className="flex flex-col items-center">
            <div className="flex flex-col items-center mb-10 relative">
              <div className="absolute w-[600px] h-[300px] bg-[#6d9b7d]/10 rounded-full blur-[120px] opacity-50 pointer-events-none" />
              <img
                src="/MARVIC_logo.png"
                className="w-full max-w-[480px] opacity-90 relative z-10"
                style={{
                  filter: isDark
                    ? 'brightness(0) invert(1) drop-shadow(0 0 30px rgba(56,189,248,0.3))'
                    : 'drop-shadow(0 0 20px rgba(56,189,248,0.2))',
                }}
              />
              <div className="mt-4 h-px w-64 bg-gradient-to-r from-transparent via-[#6d9b7d]/40 to-transparent" />
              <p className="mt-3 text-[10px] tracking-[0.5em] uppercase font-black text-slate-400 dark:text-slate-500">
                Inventario de Activos Físicos
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-10 w-full max-w-lg">
              {[
                { label: 'Ubicaciones', value: '6',  icon: Warehouse },
                { label: 'Categorías',  value: '7',  icon: Tag       },
                { label: 'Registros',   value: isLoadingTotal ? '…' : String(totalRegistros ?? 0), icon: Package },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-3 text-center shadow-sm dark:shadow-none">
                  <Icon className="w-4 h-4 text-[#6d9b7d] mx-auto mb-1" />
                  <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{label}</p>
                  <p className="text-xl font-black text-slate-900 dark:text-white mt-0.5">{value}</p>
                </div>
              ))}
            </div>

            <div className="w-full max-w-3xl">
              <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] mb-3 flex items-center gap-2">
                <Warehouse className="w-3.5 h-3.5 text-[#6d9b7d]" />
                Acceso directo por ubicación
              </p>
              {isLoading ? (
                <div className="flex items-center justify-center py-16">
                  <span className="text-[11px] font-black text-[#6d9b7d] uppercase tracking-widest animate-pulse">Cargando...</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {ubicaciones.map((ub) => (
                    <button
                      key={ub.id}
                      onMouseEnter={() => setHoveredId(ub.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      onClick={() => navigate(`/inventario/${ub.id}`)}
                      className={`text-left p-3 rounded-lg border transition-all duration-200 ${
                        hoveredId === ub.id
                          ? 'bg-[#6d9b7d]/10 border-[#6d9b7d]/50 shadow-[0_0_15px_rgba(56,189,248,0.1)]'
                          : 'bg-white dark:bg-slate-900/50 border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 shadow-sm dark:shadow-none'
                      }`}
                    >
                      <p className={`text-[10px] font-black uppercase tracking-wide transition-colors leading-tight ${hoveredId === ub.id ? 'text-[#6d9b7d]' : 'text-slate-800 dark:text-white'}`}>
                        {ub.nombre}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Tag className="w-2.5 h-2.5 text-slate-400 dark:text-slate-500" />
                        <span className="text-[9px] text-slate-400 dark:text-slate-500">7 categorías</span>
                      </div>
                      <div className={`mt-2 h-px transition-all ${hoveredId === ub.id ? 'bg-[#6d9b7d]/40' : 'bg-slate-200 dark:bg-white/5'}`} />
                      <div className="flex items-center gap-1 mt-1.5">
                        {(() => {
                          const count = conteos?.get(ub.id) ?? 0;
                          return (
                            <>
                              <span className={`w-1.5 h-1.5 rounded-full ${count > 0 ? 'bg-green-400' : 'bg-slate-300 dark:bg-slate-600'}`} />
                              <span className="text-[8px] text-slate-400 dark:text-slate-600 uppercase tracking-widest">
                                {count > 0 ? `${count} registro${count !== 1 ? 's' : ''}` : 'Sin registros'}
                              </span>
                            </>
                          );
                        })()}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══ TAB: ENTRADAS DE STOCK ═══ */}
        {mainTab === 'entradas' && (
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white">Entradas de stock</h2>
              <button onClick={() => setShowEntradaModal(true)} className="btn-primary flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black uppercase">
                <Plus className="w-3.5 h-3.5" />
                Nueva entrada
              </button>
            </div>

            {/* Filtros */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5 p-4 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 rounded-lg">
              <div>
                <label className="block text-[10px] text-slate-500 dark:text-slate-400 mb-1 uppercase font-bold">Ubicación</label>
                <select value={filtroUbicacion} onChange={e => setFiltroUbicacion(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded px-2 py-1.5 text-xs text-slate-900 dark:text-white">
                  <option value="">Todas</option>
                  {ubicaciones.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 dark:text-slate-400 mb-1 uppercase font-bold">Categoría</label>
                <select value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded px-2 py-1.5 text-xs text-slate-900 dark:text-white">
                  <option value="">Todas</option>
                  {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 dark:text-slate-400 mb-1 uppercase font-bold">Desde</label>
                <input type="date" value={filtroDesde} onChange={e => setFiltroDesde(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded px-2 py-1.5 text-xs text-slate-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 dark:text-slate-400 mb-1 uppercase font-bold">Hasta</label>
                <input type="date" value={filtroHasta} onChange={e => setFiltroHasta(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded px-2 py-1.5 text-xs text-slate-900 dark:text-white" />
              </div>
            </div>

            {/* Tabla */}
            <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#1e293b] text-white">
                    {['Fecha', 'Proveedor', 'Producto', 'Cantidad', 'Precio', 'Receptor', 'Ubicación', ''].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-[10px] font-black uppercase tracking-widest">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {entradasFiltradas.length === 0 ? (
                    <tr><td colSpan={8} className="px-4 py-8 text-center text-xs text-slate-400">Sin entradas registradas</td></tr>
                  ) : entradasFiltradas.map((e, i) => (
                    <tr key={e.id} className={i % 2 === 0 ? 'bg-white dark:bg-slate-900/40' : 'bg-slate-50 dark:bg-slate-900/20'}>
                      <td className="px-3 py-2 text-xs text-slate-700 dark:text-slate-300">{e.fecha ?? '—'}</td>
                      <td className="px-3 py-2 text-xs text-slate-700 dark:text-slate-300">{e.proveedor_nombre ?? '—'}</td>
                      <td className="px-3 py-2 text-xs text-slate-700 dark:text-slate-300">{e.producto_nombre ?? '—'}</td>
                      <td className="px-3 py-2 text-xs font-bold text-slate-900 dark:text-white">{e.cantidad} {e.unidad}</td>
                      <td className="px-3 py-2 text-xs text-slate-700 dark:text-slate-300">{e.precio_unitario ? `${e.precio_unitario.toFixed(2)} €` : '—'}</td>
                      <td className="px-3 py-2 text-xs text-slate-700 dark:text-slate-300">{e.receptor ?? '—'}</td>
                      <td className="px-3 py-2 text-xs text-slate-700 dark:text-slate-300">{ubicaciones.find(u => u.id === e.ubicacion_id)?.nombre ?? '—'}</td>
                      <td className="px-3 py-2">
                        <button
                          onClick={() => { if (confirm('¿Eliminar esta entrada?')) deleteEntrada.mutate(e.id); }}
                          className="text-red-400 hover:text-red-600 transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ═══ TAB: PROVEEDORES ═══ */}
        {mainTab === 'proveedores' && (
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white">Proveedores</h2>
              <button onClick={() => openProvModal()} className="btn-primary flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black uppercase">
                <Plus className="w-3.5 h-3.5" />
                Nuevo proveedor
              </button>
            </div>

            <div className="space-y-2">
              {proveedores.length === 0 ? (
                <div className="text-center py-12 text-sm text-slate-400">Sin proveedores registrados</div>
              ) : proveedores.map(p => (
                <div key={p.id} className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 rounded-lg overflow-hidden">
                  {/* Cabecera fila */}
                  <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                      <button onClick={() => setExpandedProvId(expandedProvId === p.id ? null : p.id)} className="text-slate-400 hover:text-[#6d9b7d] transition-colors">
                        {expandedProvId === p.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{p.nombre}</p>
                        <p className="text-[10px] text-slate-400">
                          {p.codigo_interno && <span className="font-mono mr-2 text-[#6d9b7d]">{p.codigo_interno}</span>}
                          {p.tipo ? TIPOS_PROVEEDOR_LABEL[p.tipo] ?? p.tipo : ''}
                          {p.telefono ? ` · ${p.telefono}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${p.activo ? 'border-green-500/50 text-green-500' : 'border-slate-500/50 text-slate-400'}`}>
                        {p.activo ? 'Activo' : 'Inactivo'}
                      </span>
                      <RecordActions
                        onEdit={() => openProvModal(p)}
                        onDelete={() => handleEliminarProveedor(p.id)}
                      />
                    </div>
                  </div>

                  {/* Detalle expandido */}
                  {expandedProvId === p.id && (
                    <div className="border-t border-slate-200 dark:border-white/10 px-4 py-3 bg-slate-50 dark:bg-slate-900/40">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs mb-4">
                        {p.nif && <div><span className="text-slate-400">NIF:</span> <span className="text-slate-700 dark:text-slate-300">{p.nif}</span></div>}
                        {p.email && <div><span className="text-slate-400">Email:</span> <span className="text-slate-700 dark:text-slate-300">{p.email}</span></div>}
                        {p.persona_contacto && <div><span className="text-slate-400">Contacto:</span> <span className="text-slate-700 dark:text-slate-300">{p.persona_contacto}</span></div>}
                        {p.notas && <div className="col-span-2 sm:col-span-3"><span className="text-slate-400">Notas:</span> <span className="text-slate-700 dark:text-slate-300">{p.notas}</span></div>}
                      </div>

                      {/* Lista de precios */}
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Lista de precios</p>
                        <button
                          onClick={() => { setPrecioProvId(p.id); setPrecioProducto(''); setPrecioUnidad(''); setPrecioValor(''); setShowPrecioModal(true); }}
                          className="btn-secondary flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold uppercase"
                        >
                          <Plus className="w-3 h-3" />
                          Añadir precio
                        </button>
                      </div>
                      {precios.length === 0 ? (
                        <p className="text-xs text-slate-400">Sin precios registrados</p>
                      ) : (
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-[#1e293b] text-white">
                              {['Producto', 'Unidad', 'Precio', 'Vigencia'].map(h => (
                                <th key={h} className="px-2 py-1 text-left text-[9px] font-black uppercase">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {precios.map((pr, i) => (
                              <tr key={pr.id} className={i % 2 === 0 ? 'bg-white dark:bg-slate-900/40' : 'bg-slate-50 dark:bg-slate-900/20'}>
                                <td className="px-2 py-1 text-slate-700 dark:text-slate-300">{pr.producto}</td>
                                <td className="px-2 py-1 text-slate-500 dark:text-slate-400">{pr.unidad ?? '—'}</td>
                                <td className="px-2 py-1 font-bold text-slate-900 dark:text-white">{pr.precio_unitario != null ? `${pr.precio_unitario.toFixed(2)} €` : '—'}</td>
                                <td className="px-2 py-1 text-slate-500 dark:text-slate-400">{pr.fecha_vigencia ?? '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* BARRA INFERIOR */}
      <footer className="w-full bg-white/90 dark:bg-slate-900/80 border-t border-slate-200 dark:border-white/10 px-6 py-1.5 flex items-center gap-6">
        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Marvic 360 · Inventario</span>
        <span className="text-[10px] text-slate-300 dark:text-slate-600">|</span>
        <span className="text-[10px] text-slate-400 dark:text-slate-500">{proveedores.length} proveedores · {entradas.length} entradas</span>
        <span className="text-[10px] font-mono text-slate-300 dark:text-slate-600 ml-auto">{horaStr}</span>
      </footer>

      {/* ══════════════════════════════════════════════════════════ */}
      {/* MODAL — INFORME GLOBAL PDF                                */}
      {/* ══════════════════════════════════════════════════════════ */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-white/10 px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-[#6d9b7d]" />
                <span className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white">Informe Global de Inventario</span>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-xl leading-none">×</button>
            </div>
            <div className="p-5 space-y-5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">Período</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-slate-500 dark:text-slate-400 mb-1">Desde</label>
                    <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-[#6d9b7d]/50 outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 dark:text-slate-400 mb-1">Hasta</label>
                    <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-[#6d9b7d]/50 outline-none" />
                  </div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Ubicaciones ({selUbics.size}/{ubicaciones.length})</p>
                  <div className="flex gap-2">
                    <button onClick={() => setSelUbics(new Set(ubicaciones.map(u => u.id)))} className="text-[9px] text-[#6d9b7d] hover:underline font-bold uppercase">Todas</button>
                    <button onClick={() => setSelUbics(new Set())} className="text-[9px] text-slate-400 hover:underline uppercase">Ninguna</button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {ubicaciones.map(u => (
                    <label key={u.id} className="flex items-center gap-2.5 cursor-pointer group">
                      <input type="checkbox" checked={selUbics.has(u.id)} onChange={() => toggleUbic(u.id)} className="w-3.5 h-3.5 accent-sky-400" />
                      <span className="text-sm text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">{u.nombre}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Categorías ({selCats.size}/{categorias.length})</p>
                  <div className="flex gap-2">
                    <button onClick={() => setSelCats(new Set(categorias.map(c => c.id)))} className="text-[9px] text-[#6d9b7d] hover:underline font-bold uppercase">Todas</button>
                    <button onClick={() => setSelCats(new Set())} className="text-[9px] text-slate-400 hover:underline uppercase">Ninguna</button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {categorias.map(c => (
                    <label key={c.id} className="flex items-center gap-2.5 cursor-pointer group">
                      <input type="checkbox" checked={selCats.has(c.id)} onChange={() => toggleCat(c.id)} className="w-3.5 h-3.5 accent-sky-400" />
                      <span className="text-sm text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">{c.nombre}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowModal(false)} className="btn-secondary flex-1 py-2.5 rounded-lg text-sm">Cancelar</button>
                <button
                  onClick={generarPDFGlobal}
                  disabled={genPdf || selUbics.size === 0 || selCats.size === 0}
                  className="btn-primary flex-1 py-2.5 rounded-lg text-sm font-black flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {genPdf ? <span className="w-3.5 h-3.5 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                  {genPdf ? 'Generando…' : 'Generar PDF'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* MODAL — NUEVA ENTRADA DE STOCK                            */}
      {/* ══════════════════════════════════════════════════════════ */}
      {showEntradaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-white/10 px-5 py-3 flex items-center justify-between">
              <span className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white">Nueva entrada de stock</span>
              <button onClick={() => setShowEntradaModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-xl leading-none">×</button>
            </div>
            <div className="p-5 space-y-4">
              {entradaError && <p className="text-xs text-red-400">{entradaError}</p>}

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 mb-1">Proveedor</label>
                <SelectWithOther
                  options={proveedores.map(p => p.nombre)}
                  value={proveedores.find(p => p.id === entradaProveedorId)?.nombre ?? ''}
                  onChange={v => { const p = proveedores.find(x => x.nombre === v); setEntradaProveedorId(p?.id ?? ''); }}
                  placeholder="Seleccionar proveedor"
                  onCreateNew={async (nombre) => {
                    const result = await addProveedor.mutateAsync({ nombre, tipo: 'proveedor_materiales' });
                    setEntradaProveedorId((result as { id: string }).id);
                  }}
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 mb-1">Ubicacion *</label>
                <select
                  value={entradaUbicacion}
                  onChange={e => { setEntradaUbicacion(e.target.value); setEntradaProductoId(''); }}
                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none"
                >
                  <option value="">Seleccionar ubicacion</option>
                  {ubicaciones.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 mb-1">Categoria *</label>
                <select
                  value={entradaCategoria}
                  onChange={e => { setEntradaCategoria(e.target.value); setEntradaProductoId(''); }}
                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none"
                >
                  <option value="">Seleccionar categoria</option>
                  {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 mb-1">Producto</label>
                <select
                  value={entradaProductoId}
                  onChange={e => setEntradaProductoId(e.target.value)}
                  disabled={!entradaCategoria}
                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none"
                >
                  <option value="">Seleccionar producto</option>
                  {productos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 mb-1">Cantidad *</label>
                  <input type="number" min="0" step="0.01" value={entradaCantidad} onChange={e => setEntradaCantidad(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 mb-1">Unidad</label>
                  <SelectWithOther
                    options={catUnidades.opciones}
                    value={entradaUnidad}
                    onChange={v => setEntradaUnidad(v)}
                    onCreateNew={v => { catUnidades.addOpcion(v); setEntradaUnidad(v); }}
                    placeholder="kg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 mb-1">Precio unitario (€)</label>
                  <input type="number" min="0" step="0.01" value={entradaPrecio} onChange={e => setEntradaPrecio(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 mb-1">Importe total (€)</label>
                  <input type="text" readOnly value={importeCalc > 0 ? importeCalc.toFixed(2) : ''} className="w-full bg-slate-200 dark:bg-slate-700 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-500 dark:text-slate-400 cursor-not-allowed" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 mb-1">Receptor</label>
                <SelectWithOther
                  options={Array.from(new Set([...personal.filter(p => p.activo).map(p => p.nombre), ...catReceptores.opciones]))}
                  value={entradaReceptor}
                  onChange={v => setEntradaReceptor(v)}
                  onCreateNew={v => { catReceptores.addOpcion(v); setEntradaReceptor(v); }}
                  placeholder="Seleccionar receptor"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 mb-1">Fecha</label>
                <input type="date" value={entradaFecha} onChange={e => setEntradaFecha(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none" />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 mb-1">Albaran (foto)</label>
                <PhotoAttachment value={entradaFotoFile ? URL.createObjectURL(entradaFotoFile) : null} onChange={f => setEntradaFotoFile(f)} />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 mb-1">Notas</label>
                <AudioInput value={entradaNotas} onChange={v => setEntradaNotas(v)} placeholder="Notas de la entrada..." rows={2} />
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowEntradaModal(false)} className="btn-secondary flex-1 py-2.5 rounded-lg text-sm">Cancelar</button>
                <button onClick={handleGuardarEntrada} disabled={entradaSubmitting} className="btn-primary flex-1 py-2.5 rounded-lg text-sm font-black disabled:opacity-50">
                  {entradaSubmitting ? 'Guardando…' : 'Guardar entrada'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* MODAL — PROVEEDOR (alta / edición)                        */}
      {/* ══════════════════════════════════════════════════════════ */}
      {showProvModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-white/10 px-5 py-3 flex items-center justify-between">
              <span className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white">
                {editProv ? 'Editar proveedor' : 'Nuevo proveedor'}
              </span>
              <button onClick={() => setShowProvModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-xl leading-none">×</button>
            </div>
            <div className="p-5 space-y-4">
              {provError && <p className="text-xs text-red-400">{provError}</p>}
              {editProv?.codigo_interno && (
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 mb-1">Codigo interno</label>
                  <input type="text" readOnly value={editProv.codigo_interno} className="w-full bg-slate-200 dark:bg-slate-700 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-500 dark:text-slate-400 cursor-not-allowed" />
                </div>
              )}
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 mb-1">Nombre *</label>
                <input value={provNombre} onChange={e => setProvNombre(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 mb-1">NIF</label>
                  <input value={provNif} onChange={e => setProvNif(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 mb-1">Telefono</label>
                  <input value={provTelefono} onChange={e => setProvTelefono(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 mb-1">Email</label>
                <input type="email" value={provEmail} onChange={e => setProvEmail(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none" />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 mb-1">Tipo</label>
                <select
                  value={provTipo}
                  onChange={e => setProvTipo(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none"
                >
                  <option value="">Seleccionar tipo</option>
                  {TIPOS_PROVEEDOR.map(t => <option key={t} value={t}>{TIPOS_PROVEEDOR_LABEL[t] ?? t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 mb-1">Persona de contacto</label>
                <input value={provContacto} onChange={e => setProvContacto(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none" />
              </div>
              <div className="flex items-center gap-3">
                <label className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400">Activo</label>
                <button
                  type="button"
                  onClick={() => setProvActivo(v => !v)}
                  className={`relative w-10 h-5 rounded-full transition-colors ${provActivo ? 'bg-[#6d9b7d]' : 'bg-slate-400 dark:bg-slate-600'}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${provActivo ? 'left-5' : 'left-0.5'}`} />
                </button>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 mb-1">Notas</label>
                <AudioInput value={provNotas} onChange={v => setProvNotas(v)} placeholder="Notas sobre el proveedor..." rows={2} />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 mb-1">Foto</label>
                <PhotoAttachment value={provFotoFile ? URL.createObjectURL(provFotoFile) : (editProv?.foto_url ?? null)} onChange={f => setProvFotoFile(f)} />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowProvModal(false)} className="btn-secondary flex-1 py-2.5 rounded-lg text-sm">Cancelar</button>
                <button onClick={handleGuardarProveedor} disabled={provSubmitting} className="btn-primary flex-1 py-2.5 rounded-lg text-sm font-black disabled:opacity-50">
                  {provSubmitting ? 'Guardando…' : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* MODAL — PRECIO PROVEEDOR                                  */}
      {/* ══════════════════════════════════════════════════════════ */}
      {showPrecioModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl w-full max-w-md shadow-2xl">
            <div className="border-b border-slate-200 dark:border-white/10 px-5 py-3 flex items-center justify-between">
              <span className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white">Añadir precio</span>
              <button onClick={() => setShowPrecioModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-xl leading-none">×</button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 mb-1">Producto *</label>
                <input value={precioProducto} onChange={e => setPrecioProducto(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 mb-1">Unidad</label>
                  <SelectWithOther
                    options={catUnidades.opciones}
                    value={precioUnidad}
                    onChange={v => setPrecioUnidad(v)}
                    onCreateNew={v => { catUnidades.addOpcion(v); setPrecioUnidad(v); }}
                    placeholder="kg"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 mb-1">Precio (€)</label>
                  <input type="number" min="0" step="0.01" value={precioValor} onChange={e => setPrecioValor(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 mb-1">Vigencia</label>
                <input type="date" value={precioVigencia} onChange={e => setPrecioVigencia(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none" />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowPrecioModal(false)} className="btn-secondary flex-1 py-2.5 rounded-lg text-sm">Cancelar</button>
                <button onClick={handleGuardarPrecio} disabled={precioSubmitting || !precioProducto} className="btn-primary flex-1 py-2.5 rounded-lg text-sm font-black disabled:opacity-50">
                  {precioSubmitting ? 'Guardando…' : 'Guardar precio'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
