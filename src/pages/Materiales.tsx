import React, { useState } from 'react'
import { Package, Plus, Loader2, MapPin, X, Search, MinusCircle, FileText } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useMaterialesStock, useAddMaterial, useDeleteMaterial, MaterialStockRow } from '@/hooks/useMateriales'
import { useCategorias, useUbicaciones, useProductosCatalogo, useAddProductoCatalogo } from '@/hooks/useInventario'
import { SelectWithOther, AudioInput, PDFExportModal, RecordActions, type PDFExportParams } from '@/components/base'
import { useCatalogoLocal } from '@/hooks/useCatalogoLocal'
import { toast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { generarPDFCorporativoBase, pdfCorporateSection, pdfCorporateTable } from '@/utils/pdfUtils'

export default function Materiales() {
  const [activeTab, setActiveTab] = useState('fitosanitarios_abonos')
  const [searchTerm, setSearchTerm] = useState('')
  const { data: stock, isLoading } = useMaterialesStock(activeTab)
  
  const { data: categorias = [] } = useCategorias()
  const { data: ubicaciones = [] } = useUbicaciones()
  const activeCatId = categorias.find(c => c.slug === activeTab)?.id || ''
  const { data: productos = [] } = useProductosCatalogo(activeCatId || null)

  const mutAddMaterial = useAddMaterial()
  const mutAddProducto = useAddProductoCatalogo()
  const mutDeleteMaterial = useDeleteMaterial()

  const [showModal, setShowModal] = useState(false)
  const [ubicacionId, setUbicacionId] = useState('')
  const [productoId, setProductoId] = useState('')
  const [productoNombre, setProductoNombre] = useState('')
  const [cantidad, setCantidad] = useState('')
  const [unidad, setUnidad] = useState('L')
  const catUnidades = useCatalogoLocal('unidades_materiales', ['Kg', 'L', 'Unidades', 'Rollos', 'm'])
  const [notas, setNotas] = useState('')
  const [saving, setSaving] = useState(false)
  
  const [consumeItem, setConsumeItem] = useState<MaterialStockRow | null>(null)
  const [consumeCantidad, setConsumeCantidad] = useState('')
  const [consumeNotas, setConsumeNotas] = useState('')
  const [pdfOpen, setPdfOpen] = useState(false)

  const handleExportPDF = async ({ desde, hasta, filtros }: PDFExportParams) => {
    const categoriasIncluidas = filtros.solo_tab_actual
      ? [activeCatId]
      : categorias.map(c => c.id)

    // Obtener movimientos del rango en las categorías seleccionadas
    const { data: movimientos } = await supabase
      .from('inventario_registros')
      .select('*, inventario_productos_catalogo(nombre), inventario_ubicaciones(nombre), inventario_categorias(nombre)')
      .in('categoria_id', categoriasIncluidas)
      .gte('created_at', `${desde}T00:00:00`)
      .lte('created_at', `${hasta}T23:59:59`)
      .order('created_at', { ascending: false })

    const rows = (movimientos ?? []).map(m => [
      new Date(m.created_at ?? '').toLocaleDateString('es-ES'),
      (m as { inventario_categorias?: { nombre?: string } }).inventario_categorias?.nombre ?? '—',
      (m as { inventario_productos_catalogo?: { nombre?: string } }).inventario_productos_catalogo?.nombre ?? m.descripcion ?? '—',
      `${m.cantidad} ${m.unidad}`,
      (m as { inventario_ubicaciones?: { nombre?: string } }).inventario_ubicaciones?.nombre ?? '—',
      m.notas ?? '—',
    ])

    await generarPDFCorporativoBase({
      titulo: 'Materiales de Campo',
      subtitulo: `Movimientos · ${desde} → ${hasta}`,
      fecha: new Date(),
      filename: `materiales_${desde}_${hasta}.pdf`,
      bloques: [
        (ctx) => {
          pdfCorporateSection(ctx, 'Resumen')
          ctx.writeLine('Total movimientos', String(rows.length))
          ctx.writeLine('Categorías', filtros.solo_tab_actual ? (categorias.find(c => c.id === activeCatId)?.nombre ?? '—') : 'Todas')
          ctx.y += 4
        },
        (ctx) => {
          if (rows.length === 0) return
          pdfCorporateSection(ctx, 'Detalle de Movimientos')
          pdfCorporateTable(
            ctx,
            ['Fecha', 'Categoría', 'Producto', 'Cantidad', 'Ubicación', 'Notas'],
            [22, 28, 42, 22, 28, 40],
            rows,
          )
        },
      ],
    })
  }

  const resetForm = () => {
    setUbicacionId('')
    setProductoId('')
    setProductoNombre('')
    setCantidad('')
    setUnidad('L')
    setNotas('')
  }

  const handleConsumeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!consumeItem || !consumeCantidad) return
    const consumido = parseFloat(consumeCantidad)
    if (consumido <= 0) return
    if (consumido > consumeItem.cantidad) {
      toast({ title: 'Error', description: 'Stock insuficiente para este consumo.', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      await mutAddMaterial.mutateAsync({
        ubicacion_id: consumeItem.ubicacion_id,
        categoria_id: consumeItem.categoria_id,
        producto_id: consumeItem.producto_id,
        cantidad: consumeItem.cantidad - consumido,
        unidad: consumeItem.unidad,
        notas: consumeNotas || null,
        descripcion: `Consumo: ${consumido} ${consumeItem.unidad}${consumeNotas ? ` - ${consumeNotas}` : ''}`,
        precio_unitario: consumeItem.precio_unitario
      } as unknown as Parameters<typeof mutAddMaterial.mutateAsync>[0])

      setConsumeItem(null)
      setConsumeCantidad('')
      setConsumeNotas('')
      toast({ title: 'Stock actualizado', description: `Se han consumido ${consumido} ${consumeItem.unidad}` })
    } catch (err: unknown) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Error desconocido', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ubicacionId || !cantidad || !activeCatId) return
    setSaving(true)
    try {
      let finalProdId = productoId
      if (productoId === 'nuevo' && productoNombre.trim()) {
         const np = await mutAddProducto.mutateAsync({
           nombre: productoNombre.trim(),
           categoria_id: activeCatId,
           unidad_defecto: unidad,
           activo: true
         } as unknown as Parameters<typeof mutAddProducto.mutateAsync>[0])
         finalProdId = np.id
      }
      
      await mutAddMaterial.mutateAsync({
        ubicacion_id: ubicacionId,
        categoria_id: activeCatId,
        producto_id: finalProdId && finalProdId !== 'nuevo' ? finalProdId : null,
        cantidad: parseFloat(cantidad),
        unidad,
        notas: notas || null,
        descripcion: finalProdId === 'nuevo' ? productoNombre : (productos.find(p => p.id === finalProdId)?.nombre || null)
      } as unknown as Parameters<typeof mutAddMaterial.mutateAsync>[0])
      
      setShowModal(false)
      resetForm()
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const renderGrid = () => {
    if (isLoading) {
      return <div className="py-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-teal-500" /></div>
    }

    const filteredStock = stock?.filter(item => {
      if (!searchTerm) return true
      const term = searchTerm.toLowerCase()
      const nombre = (item.inventario_productos_catalogo?.nombre || item.descripcion || '').toLowerCase()
      return nombre.includes(term)
    })
    
    if (!filteredStock || filteredStock.length === 0) {
      return <div className="text-center py-20 text-slate-500 uppercase tracking-widest text-xs font-bold">No hay materiales registrados o que coincidan con la búsqueda.</div>
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4 pb-10">
        {filteredStock.map((item) => (
          <div key={item.id} className="bg-slate-900/60 border border-white/5 p-4 rounded-xl relative overflow-hidden group hover:border-teal-500/30 transition-colors">
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1 min-w-0 pr-2">
                <p className="text-sm font-black text-white truncate">{item.inventario_productos_catalogo?.nombre || item.descripcion || 'Producto sin catálogo'}</p>
                {item.descripcion && item.descripcion !== item.inventario_productos_catalogo?.nombre && (
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest truncate mt-0.5">{item.descripcion}</p>
                )}
              </div>
              <div className="text-right shrink-0">
                <p className="text-lg font-black text-teal-400">{item.cantidad} <span className="text-[10px] font-bold text-slate-500 uppercase">{item.unidad}</span></p>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400 border-t border-white/5 pt-3 mt-2">
              <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-slate-500" /> {item.inventario_ubicaciones?.nombre || 'Sin ubicación'}</span>
              <span className="font-mono">{item.precio_unitario ? `${item.precio_unitario.toFixed(2)} €/${item.unidad}` : '—'}</span>
            </div>
            <button onClick={() => setConsumeItem(item)} className="mt-4 w-full py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-teal-400 rounded-lg transition-colors border border-white/5 flex items-center justify-center gap-1.5">
              <MinusCircle className="w-3.5 h-3.5" /> Consumo Rápido
            </button>
            <div className="mt-2 pt-2 border-t border-white/5">
              <RecordActions
                onEdit={() => setConsumeItem(item)}
                onDelete={() => mutDeleteMaterial.mutate(item.id)}
                confirmMessage="¿Eliminar este registro de material? Esta acción revertirá al stock anterior."
              />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen pt-4 pb-10 pr-4 pl-14 md:p-4 md:pb-10 max-w-6xl mx-auto w-full text-slate-200">
      <div className="flex flex-col gap-3 mb-6 shrink-0 max-md:items-stretch md:flex-row md:items-center">
        <div className="w-10 h-10 rounded-xl bg-teal-500/20 flex items-center justify-center border border-teal-500/30">
          <Package className="w-5 h-5 text-teal-400" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-black text-white uppercase tracking-tight">Materiales de Campo</h1>
          <p className="text-xs text-slate-400 font-medium">Gestión de fitosanitarios, sistemas de riego y plásticos</p>
        </div>
        <button
          onClick={() => setPdfOpen(true)}
          className="px-3 py-2 rounded-lg bg-teal-500/20 border border-teal-500/40 text-teal-400 hover:bg-teal-500/30 transition-colors flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
        >
          <FileText className="w-4 h-4" />
          <span className="hidden sm:inline">PDF</span>
        </button>
      </div>

      <PDFExportModal
        open={pdfOpen}
        onClose={() => setPdfOpen(false)}
        title="Materiales de Campo"
        subtitle="Informe de movimientos por fecha"
        accentColor="#14b8a6"
        filtros={[
          { key: 'solo_tab_actual', label: 'Solo la categoría activa', default: false },
        ]}
        onExport={handleExportPDF}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <TabsList className="bg-slate-900 border border-white/5 shrink-0 grid w-full grid-cols-1 md:grid-cols-3">
          <TabsTrigger value="fitosanitarios_abonos" className="text-xs font-bold uppercase tracking-wider data-[state=active]:bg-teal-500/10 data-[state=active]:text-teal-400">Fitosanitarios & Abonos</TabsTrigger>
          <TabsTrigger value="material_riego" className="text-xs font-bold uppercase tracking-wider data-[state=active]:bg-teal-500/10 data-[state=active]:text-teal-400">Material de Riego</TabsTrigger>
          <TabsTrigger value="plastico" className="text-xs font-bold uppercase tracking-wider data-[state=active]:bg-teal-500/10 data-[state=active]:text-teal-400">Plásticos & Estructuras</TabsTrigger>
        </TabsList>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mt-6 mb-2 gap-4">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              type="text" 
              placeholder="Buscar material..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-teal-500 transition-colors"
            />
          </div>
          <button onClick={() => setShowModal(true)} className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3 py-2 bg-teal-500 text-slate-900 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-teal-400 transition-colors shadow-lg shadow-teal-500/20">
            <Plus className="w-3.5 h-3.5" /> Registrar Entrada / Salida
          </button>
        </div>

        <TabsContent value="fitosanitarios_abonos" className="flex-1 outline-none">{renderGrid()}</TabsContent>
        <TabsContent value="material_riego" className="flex-1 outline-none">{renderGrid()}</TabsContent>
        <TabsContent value="plastico" className="flex-1 outline-none">{renderGrid()}</TabsContent>
      </Tabs>

      {/* ── MODAL REGISTRO ── */}
      {showModal && (
        <div className="fixed inset-0 z-[2000] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-black text-white">Registrar Material</h3>
              <button onClick={() => { setShowModal(false); resetForm(); }}><X className="w-5 h-5 text-slate-500 hover:text-white" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <p className="text-[10px] text-slate-500 mb-1 uppercase font-bold">Ubicación *</p>
                <select required value={ubicacionId} onChange={e => setUbicacionId(e.target.value)} className="w-full bg-slate-800 rounded-lg border border-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:border-teal-500">
                  <option value="">-- Seleccionar --</option>
                  {ubicaciones.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                </select>
              </div>
              
              <div>
                <p className="text-[10px] text-slate-500 mb-1 uppercase font-bold">Producto *</p>
                <select required value={productoId} onChange={e => {
                  setProductoId(e.target.value);
                  if (e.target.value && e.target.value !== 'nuevo') {
                    const p = productos.find(x => x.id === e.target.value);
                    if (p?.unidad_defecto) setUnidad(p.unidad_defecto);
                  }
                }} className="w-full bg-slate-800 rounded-lg border border-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:border-teal-500">
                  <option value="">-- Seleccionar --</option>
                  {productos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  <option value="nuevo">+ Nuevo Producto</option>
                </select>
              </div>

              {productoId === 'nuevo' && (
                <div>
                  <p className="text-[10px] text-slate-500 mb-1 uppercase font-bold">Nombre del Nuevo Producto *</p>
                  <input required type="text" value={productoNombre} onChange={e => setProductoNombre(e.target.value)} className="w-full bg-slate-800 rounded-lg border border-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:border-teal-500" />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] text-slate-500 mb-1 uppercase font-bold">Cantidad *</p>
                  <input required type="number" step="0.01" value={cantidad} onChange={e => setCantidad(e.target.value)} className="w-full bg-slate-800 rounded-lg border border-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:border-teal-500" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 mb-1 uppercase font-bold">Unidad</p>
                  <SelectWithOther options={catUnidades.opciones} value={unidad} onChange={setUnidad} onCreateNew={v => { catUnidades.addOpcion(v); setUnidad(v); }} />
                </div>
              </div>

              <div>
                <p className="text-[10px] text-slate-500 mb-1 uppercase font-bold">Notas</p>
                <AudioInput value={notas} onChange={setNotas} />
              </div>

              <button type="submit" disabled={saving || !ubicacionId || !cantidad} className="w-full py-3 bg-teal-500 text-slate-900 font-bold rounded-xl mt-4 uppercase tracking-widest text-xs hover:bg-teal-400 transition-colors disabled:opacity-50">
                {saving ? 'Guardando...' : 'Guardar Registro'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL CONSUMO RÁPIDO ── */}
      {consumeItem && (
        <div className="fixed inset-0 z-[2000] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-teal-500/30 rounded-2xl w-full max-w-sm p-6 shadow-[0_0_30px_rgba(20,184,166,0.1)]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-black text-white">Consumo Rápido</h3>
              <button onClick={() => { setConsumeItem(null); setConsumeCantidad(''); setConsumeNotas(''); }}><X className="w-5 h-5 text-slate-500 hover:text-white" /></button>
            </div>
            
            <p className="text-sm font-bold text-teal-400 mb-1">{consumeItem.inventario_productos_catalogo?.nombre || consumeItem.descripcion}</p>
            <p className="text-xs text-slate-400 mb-5 pb-4 border-b border-white/10">Stock disponible: <strong className="text-white">{consumeItem.cantidad} {consumeItem.unidad}</strong> en {consumeItem.inventario_ubicaciones?.nombre}</p>
            
            <form onSubmit={handleConsumeSubmit} className="space-y-4">
              <div>
                <p className="text-[10px] text-slate-500 mb-1 uppercase font-bold">Cantidad a restar *</p>
                <input required type="number" step="0.01" max={consumeItem.cantidad} value={consumeCantidad} onChange={e => setConsumeCantidad(e.target.value)} placeholder={`Ej: 5`} className="w-full bg-slate-800 rounded-lg border border-slate-700 px-3 py-3 text-sm text-white focus:outline-none focus:border-teal-500" />
              </div>
              <div>
                <p className="text-[10px] text-slate-500 mb-1 uppercase font-bold">Destino / Uso (Opcional)</p>
                <input type="text" value={consumeNotas} onChange={e => setConsumeNotas(e.target.value)} placeholder="Sector 4, invernadero, etc..." className="w-full bg-slate-800 rounded-lg border border-slate-700 px-3 py-3 text-sm text-white focus:outline-none focus:border-teal-500" />
              </div>
              <div className="pt-2">
                <button type="submit" disabled={saving || !consumeCantidad} className="w-full py-3 bg-teal-500 text-slate-900 font-bold rounded-xl uppercase tracking-widest text-xs hover:bg-teal-400 transition-colors disabled:opacity-50">
                  {saving ? 'Registrando...' : 'Confirmar Consumo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}