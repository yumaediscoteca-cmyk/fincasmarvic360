import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../integrations/supabase/client';
import { logLiaEvento } from '@/utils/liaLogger';
import { useCreatedBy } from './useCreatedBy';
import { toast } from '@/hooks/use-toast';

// ── Tipos locales ────────────────────────────────────────────
export interface Tractor {
  id:                          string;
  matricula:                   string;
  marca:                       string | null;
  modelo:                      string | null;
  anio:                        number | null;
  horas_motor:                 number | null;
  ficha_tecnica:               string | null;
  activo:                      boolean;
  foto_url:                    string | null;
  notas:                       string | null;
  created_at:                  string;
  created_by:                  string | null;
  fecha_proxima_itv:           string | null;
  fecha_proxima_revision:      string | null;
  horas_proximo_mantenimiento: number | null;
  gps_info:                    string | null;
  codigo_interno:              string | null;
  estado_operativo:            string | null;
}

export interface Apero {
  id:             string;
  tipo:           string;
  descripcion:    string | null;
  tractor_id:     string | null;
  activo:         boolean;
  foto_url:       string | null;
  notas:          string | null;
  created_at:     string;
  created_by:     string | null;
  codigo_interno: string | null;
  estado:         string | null;
}

export interface SyncMaquinariaInventario {
  id:            string;
  tipo:          'tractor' | 'apero';
  maquinaria_id: string;
  ubicacion_id:  string;
  activo:        boolean;
  created_at:    string;
}

export interface UsoMaquinaria {
  id:               string;
  tractor_id:       string | null;
  apero_id:         string | null;
  tractorista:      string | null;
  personal_id:      string | null;
  finca:            string | null;
  parcel_id:        string | null;
  tipo_trabajo:     string | null;
  fecha:            string;
  hora_inicio:      string | null;
  hora_fin:         string | null;
  horas_trabajadas: number | null;
  gasolina_litros:  number | null;
  foto_url:         string | null;
  notas:            string | null;
  created_at:       string;
  created_by:       string | null;
}

export interface MantenimientoTractor {
  id:                     string;
  tractor_id:             string | null;
  tipo:                   string;
  descripcion:            string | null;
  fecha:                  string;
  horas_motor_al_momento: number | null;
  coste_euros:            number | null;
  proveedor:              string | null;
  foto_url:               string | null;
  foto_url_2:             string | null;
  created_at:             string;
  created_by:             string | null;
}

// ── useTractores ──────────────────────────────────────────────
export function useTractores() {
  return useQuery<Tractor[]>({
    queryKey: ['maquinaria_tractores'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('maquinaria_tractores')
        .select('*')
        .order('matricula');
      if (error) throw error;
      return (data ?? []) as Tractor[];
    },
    staleTime: 60000,
  });
}

/** Tractores dados de alta en al menos una ubicación de inventario (vista BD). */
export function useTractoresEnInventario() {
  return useQuery<Tractor[]>({
    queryKey: ['v_tractores_en_inventario'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_tractores_en_inventario')
        .select('*')
        .order('matricula');
      if (error) throw error;
      return (data ?? []) as Tractor[];
    },
    staleTime: 30000,
  });
}

/** Aperos (maquinaria_aperos) asignados a inventario vía inventario_ubicacion_activo. */
export function useAperosEnInventario() {
  return useQuery<Apero[]>({
    queryKey: ['v_maquinaria_aperos_en_inventario'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_maquinaria_aperos_en_inventario')
        .select('*')
        .order('tipo');
      if (error) throw error;
      return (data ?? []) as Apero[];
    },
    staleTime: 30000,
  });
}

// ── useAddTractor ─────────────────────────────────────────────
export function useAddTractor() {
  const createdBy = useCreatedBy();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Omit<Tractor, 'id' | 'created_at'> & { ubicacion_id?: string | null }) => {
      const { ubicacion_id, ...rest } = payload;

      // Generar codigo_interno automático TR001, TR002…
      const { count } = await supabase
        .from('maquinaria_tractores')
        .select('*', { count: 'exact', head: true });
      const codigo_interno = `TR${String((count ?? 0) + 1).padStart(3, '0')}`;

      const { data, error } = await supabase
        .from('maquinaria_tractores')
        .insert([{ ...rest, codigo_interno, created_by: createdBy }])
        .select()
        .single();
      if (error) throw error;

      // Sincronizar con inventario si se especificó ubicación
      if (ubicacion_id && data?.id) {
        await supabase.from('maquinaria_inventario_sync').insert({
          tipo: 'tractor',
          maquinaria_id: data.id,
          ubicacion_id,
        });
      }

      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['maquinaria_tractores'] });
      qc.invalidateQueries({ queryKey: ['v_tractores_en_inventario'] });
      qc.invalidateQueries({ queryKey: ['maquinaria_inventario_sync'] });
    },
    onError: (error: Error) => {
      console.error('[Hook Error]:', error.message);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

// ── useDeleteTractor ──────────────────────────────────────────
export function useDeleteTractor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('maquinaria_tractores').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['maquinaria_tractores'] });
      qc.invalidateQueries({ queryKey: ['maquinaria_kpis'] });
    },
    onError: (error: Error) => {
      console.error('[Hook Error]:', error.message);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

// ── useUpdateTractor ──────────────────────────────────────────
export function useUpdateTractor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<Tractor> & { id: string }) => {
      const { error } = await supabase
        .from('maquinaria_tractores')
        .update(patch)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['maquinaria_tractores'] });
      qc.invalidateQueries({ queryKey: ['v_tractores_en_inventario'] });
    },
    onError: (error: Error) => {
      console.error('[Hook Error]:', error.message);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

// ── useAperos ─────────────────────────────────────────────────
export function useAperos(tractorId?: string) {
  return useQuery<Apero[]>({
    queryKey: ['maquinaria_aperos', tractorId ?? 'all'],
    queryFn: async () => {
      let q = supabase
        .from('maquinaria_aperos')
        .select('*')
        .order('tipo');
      if (tractorId) q = q.eq('tractor_id', tractorId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Apero[];
    },
    staleTime: 60000,
  });
}

// ── useAddApero ───────────────────────────────────────────────
export function useAddApero() {
  const createdBy = useCreatedBy();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Omit<Apero, 'id' | 'created_at'> & { ubicacion_id?: string | null }) => {
      const { ubicacion_id, ...rest } = payload;

      // Generar codigo_interno automático AP001, AP002…
      const { count } = await supabase
        .from('maquinaria_aperos')
        .select('*', { count: 'exact', head: true });
      const codigo_interno = `AP${String((count ?? 0) + 1).padStart(3, '0')}`;

      const { data, error } = await supabase
        .from('maquinaria_aperos')
        .insert([{ ...rest, codigo_interno, created_by: createdBy }])
        .select()
        .single();
      if (error) throw error;

      // Sincronizar con inventario si se especificó ubicación
      if (ubicacion_id && data?.id) {
        await supabase.from('maquinaria_inventario_sync').insert({
          tipo: 'apero',
          maquinaria_id: data.id,
          ubicacion_id,
        });
      }

      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['maquinaria_aperos'] });
      qc.invalidateQueries({ queryKey: ['v_maquinaria_aperos_en_inventario'] });
      qc.invalidateQueries({ queryKey: ['maquinaria_inventario_sync'] });
    },
    onError: (error: Error) => {
      console.error('[Hook Error]:', error.message);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

// ── useUpdateApero ──────────────────────────────────────────────
export function useUpdateApero() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ubicacion_id,
      ...patch
    }: Partial<Omit<Apero, 'id' | 'created_at'>> & { id: string; ubicacion_id?: string | null }) => {
      const { error } = await supabase.from('maquinaria_aperos').update(patch).eq('id', id);
      if (error) throw error;

      await supabase.from('maquinaria_inventario_sync').delete().eq('tipo', 'apero').eq('maquinaria_id', id);
      if (ubicacion_id) {
        const { error: syncErr } = await supabase.from('maquinaria_inventario_sync').insert({
          tipo: 'apero',
          maquinaria_id: id,
          ubicacion_id,
        });
        if (syncErr) throw syncErr;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['maquinaria_aperos'] });
      qc.invalidateQueries({ queryKey: ['v_maquinaria_aperos_en_inventario'] });
      qc.invalidateQueries({ queryKey: ['maquinaria_inventario_sync'] });
      qc.invalidateQueries({ queryKey: ['maquinaria_kpis'] });
    },
    onError: (error: Error) => {
      console.error('[Hook Error]:', error.message);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

// ── useDeleteApero ────────────────────────────────────────────
export function useDeleteApero() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('maquinaria_aperos').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['maquinaria_aperos'] });
      qc.invalidateQueries({ queryKey: ['maquinaria_kpis'] });
    },
    onError: (error: Error) => {
      console.error('[Hook Error]:', error.message);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

// ── useUsosMaquinaria ─────────────────────────────────────────
export function useUsosMaquinaria(tractorId?: string) {
  return useQuery<UsoMaquinaria[]>({
    queryKey: ['maquinaria_uso', tractorId ?? 'all'],
    queryFn: async () => {
      let q = supabase
        .from('maquinaria_uso')
        .select('*')
        .order('fecha', { ascending: false });
      if (tractorId) q = q.eq('tractor_id', tractorId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as UsoMaquinaria[];
    },
    staleTime: 30000,
  });
}

// ── useAddUsoMaquinaria ───────────────────────────────────────
export function useAddUsoMaquinaria() {
  const createdBy = useCreatedBy();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Omit<UsoMaquinaria, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('maquinaria_uso')
        .insert([{ ...payload, created_by: createdBy }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data, payload) => {
      logLiaEvento('maquinaria', 'uso_registrado', {
        tipo_trabajo: payload.tipo_trabajo,
        finca: payload.finca,
        horas_trabajadas: payload.horas_trabajadas,
        gasolina_litros: payload.gasolina_litros,
      });
      qc.invalidateQueries({ queryKey: ['maquinaria_uso'] });
    },
    onError: (error: Error) => {
      console.error('[Hook Error]:', error.message);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

// ── useMantenimientoTractor ───────────────────────────────────
export function useMantenimientoTractor(tractorId?: string) {
  return useQuery<MantenimientoTractor[]>({
    queryKey: ['maquinaria_mantenimiento', tractorId ?? 'all'],
    queryFn: async () => {
      let q = supabase
        .from('maquinaria_mantenimiento')
        .select('*')
        .order('fecha', { ascending: false });
      if (tractorId) q = q.eq('tractor_id', tractorId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as MantenimientoTractor[];
    },
    staleTime: 60000,
  });
}

// ── useAddMantenimientoTractor ────────────────────────────────
export function useAddMantenimientoTractor() {
  const createdBy = useCreatedBy();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Omit<MantenimientoTractor, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('maquinaria_mantenimiento')
        .insert([{ ...payload, created_by: createdBy }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['maquinaria_mantenimiento'] }),
    onError: (error: Error) => {
      console.error('[Hook Error]:', error.message);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

// ── useTiposTrabajoMaquinaria ─────────────────────────────────
export function useTiposTrabajoMaquinaria() {
  return useQuery<{ id: string; nombre: string }[]>({
    queryKey: ['catalogo_tipos_trabajo', 'maquinaria'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('catalogo_tipos_trabajo')
        .select('id, nombre')
        .eq('categoria', 'maquinaria')
        .eq('activo', true)
        .order('nombre');
      if (error) throw error;
      return (data ?? []) as { id: string; nombre: string }[];
    },
    staleTime: 60000,
  });
}

export function useAddTipoTrabajoMaquinaria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (nombre: string) => {
      const { data, error } = await supabase
        .from('catalogo_tipos_trabajo')
        .insert({ nombre, categoria: 'maquinaria', activo: true })
        .select('id, nombre')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['catalogo_tipos_trabajo', 'maquinaria'] }),
    onError: (error: Error) => {
      console.error('[Hook Error]:', error.message);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

// ── useSyncMaquinariaInventario ───────────────────────────────
export function useSyncMaquinariaInventario() {
  return useQuery<SyncMaquinariaInventario[]>({
    queryKey: ['maquinaria_inventario_sync'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('maquinaria_inventario_sync')
        .select('*')
        .eq('activo', true);
      if (error) throw error;
      return (data ?? []) as SyncMaquinariaInventario[];
    },
    staleTime: 30000,
  });
}

export function useAddSyncMaquinaria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { tipo: 'tractor' | 'apero'; maquinaria_id: string; ubicacion_id: string }) => {
      const { data, error } = await supabase
        .from('maquinaria_inventario_sync')
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['maquinaria_inventario_sync'] });
      qc.invalidateQueries({ queryKey: ['inventario_ubicacion_activo'] });
    },
    onError: (error: Error) => {
      console.error('[Hook Error]:', error.message);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

// ── useKPIsMaquinaria ─────────────────────────────────────────
export function useKPIsMaquinaria() {
  return useQuery({
    queryKey: ['maquinaria_kpis'],
    queryFn: async () => {
      const [tractores, aperos, usos] = await Promise.all([
        supabase.from('maquinaria_tractores').select('activo, horas_motor'),
        supabase.from('maquinaria_aperos').select('activo'),
        supabase.from('maquinaria_uso').select('horas_trabajadas, gasolina_litros'),
      ]);
      const tractoresActivos = (tractores.data ?? []).filter(t => t.activo).length;
      const aperosActivos    = (aperos.data ?? []).filter(a => a.activo).length;
      const totalHoras       = (usos.data ?? []).reduce((s, u) => s + (u.horas_trabajadas ?? 0), 0);
      const totalGasolina    = (usos.data ?? []).reduce((s, u) => s + (u.gasolina_litros ?? 0), 0);
      return { tractoresActivos, aperosActivos, totalHoras: totalHoras.toFixed(1), totalGasolina: totalGasolina.toFixed(1) };
    },
    staleTime: 30000,
  });
}
