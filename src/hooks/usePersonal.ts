import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../integrations/supabase/client';

// ── Tipos ────────────────────────────────────────────────────────────────────

export type CategoriaPersonal =
  | 'operario_campo'
  | 'encargado'
  | 'conductor_maquinaria'
  | 'conductor_camion';

export const CATEGORIA_LABELS: Record<CategoriaPersonal, string> = {
  operario_campo:      'Operario de campo',
  encargado:           'Encargado',
  conductor_maquinaria:'Conductor de maquinaria',
  conductor_camion:    'Conductor de camión',
};

export const CATEGORIA_COLORS: Record<CategoriaPersonal, string> = {
  operario_campo:      '#22c55e',
  encargado:           '#40916c',
  conductor_maquinaria:'#fb923c',
  conductor_camion:    '#a78bfa',
};

// Prefijos de código interno por categoría
export const CATEGORIA_PREFIJOS: Record<CategoriaPersonal, string> = {
  operario_campo:      'OP',
  encargado:           'EN',
  conductor_maquinaria:'CM',
  conductor_camion:    'CC',
};

export type TipoExterno = 'destajo' | 'jornal_servicio';

export const TIPO_EXTERNO_LABELS: Record<TipoExterno, string> = {
  destajo:         'A destajo',
  jornal_servicio: 'A jornal / servicio',
};

export interface Personal {
  id:               string;
  nombre:           string;
  dni:              string | null;
  telefono:         string | null;
  categoria:        CategoriaPersonal;
  activo:           boolean;
  foto_url:         string | null;
  qr_code:          string;
  notas:            string | null;
  created_at:       string;
  created_by:       string | null;
  codigo_interno:   string | null;
  fecha_alta:       string | null;
  carnet_tipo:      string | null;
  carnet_caducidad: string | null;
  tacografo:        boolean | null;
  finca_asignada:   string | null;
  licencias:        string | null;
}

export interface PersonalExterno {
  id:               string;
  nombre_empresa:   string;
  nif:              string | null;
  telefono_contacto:string | null;
  tipo:             TipoExterno;
  activo:           boolean;
  qr_code:          string;
  notas:            string | null;
  created_at:       string;
  created_by:       string | null;
  codigo_interno:   string | null;
  persona_contacto: string | null;
  presupuesto:      string | null;
  trabajos_realiza: string | null;
}

export interface TipoTrabajoCatalogo {
  id:         string;
  nombre:     string;
  categoria:  string;
  activo:     boolean;
  created_at: string;
}

// ── Hooks personal fijo ──────────────────────────────────────────────────────

export function usePersonal(categoria?: CategoriaPersonal) {
  return useQuery({
    queryKey: ['personal', categoria ?? 'all'],
    queryFn: async () => {
      let q = supabase
        .from('personal')
        .select('*')
        .order('nombre', { ascending: true });
      if (categoria) q = q.eq('categoria', categoria);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Personal[];
    },
    staleTime: 60000,
  });
}

export function useAddPersonal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      nombre:           string;
      dni?:             string | null;
      telefono?:        string | null;
      categoria:        CategoriaPersonal;
      activo?:          boolean;
      foto_url?:        string | null;
      notas?:           string | null;
      fecha_alta?:      string | null;
      carnet_tipo?:     string | null;
      carnet_caducidad?:string | null;
      tacografo?:       boolean | null;
      finca_asignada?:  string | null;
      licencias?:       string | null;
    }) => {
      // Generar código interno: prefijo + correlativo 3 dígitos por categoría
      const prefijo = CATEGORIA_PREFIJOS[payload.categoria];
      const { data: existentes } = await supabase
        .from('personal')
        .select('codigo_interno')
        .like('codigo_interno', `${prefijo}%`);
      const nums = (existentes ?? [])
        .map(r => parseInt((r.codigo_interno ?? '').slice(2), 10))
        .filter(n => !isNaN(n));
      const siguiente = nums.length > 0 ? Math.max(...nums) + 1 : 1;
      const codigo_interno = `${prefijo}${String(siguiente).padStart(3, '0')}`;

      const { error } = await supabase.from('personal').insert({
        ...payload,
        codigo_interno,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['personal'] }),
  });
}

export function useUpdatePersonal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<Personal> & { id: string }) => {
      const { error } = await supabase.from('personal').update(payload).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['personal'] }),
  });
}

export function useDeletePersonal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('personal').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['personal'] }),
  });
}

// ── Hooks personal externo ───────────────────────────────────────────────────

export function usePersonalExterno() {
  return useQuery({
    queryKey: ['personal_externo'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('personal_externo')
        .select('*')
        .order('nombre_empresa', { ascending: true });
      if (error) throw error;
      return (data ?? []) as PersonalExterno[];
    },
    staleTime: 60000,
  });
}

export function useAddPersonalExterno() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      nombre_empresa:    string;
      nif?:              string | null;
      telefono_contacto?:string | null;
      tipo:              TipoExterno;
      activo?:           boolean;
      notas?:            string | null;
      persona_contacto?: string | null;
      presupuesto?:      string | null;
      trabajos_realiza?: string | null;
    }) => {
      // Generar código interno EX + correlativo 3 dígitos
      const { data: existentes } = await supabase
        .from('personal_externo')
        .select('codigo_interno')
        .like('codigo_interno', 'EX%');
      const nums = (existentes ?? [])
        .map(r => parseInt((r.codigo_interno ?? '').slice(2), 10))
        .filter(n => !isNaN(n));
      const siguiente = nums.length > 0 ? Math.max(...nums) + 1 : 1;
      const codigo_interno = `EX${String(siguiente).padStart(3, '0')}`;

      const { error } = await supabase.from('personal_externo').insert({
        ...payload,
        codigo_interno,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['personal_externo'] }),
  });
}

export function useUpdatePersonalExterno() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<PersonalExterno> & { id: string }) => {
      const { error } = await supabase.from('personal_externo').update(payload).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['personal_externo'] }),
  });
}

export function useDeletePersonalExterno() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('personal_externo').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['personal_externo'] }),
  });
}

// ── Hooks tipos trabajo personal ─────────────────────────────────────────────

export function useTiposTrabajoPersonal(personalId: string) {
  return useQuery({
    queryKey: ['personal_tipos_trabajo', personalId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('personal_tipos_trabajo')
        .select('tipo_trabajo_id, catalogo_tipos_trabajo:tipo_trabajo_id(id, nombre, categoria, activo, created_at)')
        .eq('personal_id', personalId);
      if (error) throw error;
      return (data ?? []).map(r => r.catalogo_tipos_trabajo as unknown as TipoTrabajoCatalogo);
    },
    staleTime: 30000,
    enabled: !!personalId,
  });
}

export function useAddTipoTrabajoPersonal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ personal_id, tipo_trabajo_id }: { personal_id: string; tipo_trabajo_id: string }) => {
      const { error } = await supabase.from('personal_tipos_trabajo').insert({ personal_id, tipo_trabajo_id });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ['personal_tipos_trabajo', vars.personal_id] }),
  });
}

export function useRemoveTipoTrabajoPersonal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ personal_id, tipo_trabajo_id }: { personal_id: string; tipo_trabajo_id: string }) => {
      const { error } = await supabase
        .from('personal_tipos_trabajo')
        .delete()
        .eq('personal_id', personal_id)
        .eq('tipo_trabajo_id', tipo_trabajo_id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ['personal_tipos_trabajo', vars.personal_id] }),
  });
}

export function useTiposTrabajoCatalogoPersonal(categoria: string) {
  return useQuery({
    queryKey: ['catalogo_tipos_trabajo', categoria],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('catalogo_tipos_trabajo')
        .select('*')
        .eq('categoria', categoria)
        .eq('activo', true)
        .order('nombre', { ascending: true });
      if (error) throw error;
      return (data ?? []) as TipoTrabajoCatalogo[];
    },
    staleTime: 60000,
  });
}

export function useAddTipoTrabajoCatalogo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { nombre: string; categoria: string }) => {
      const { data, error } = await supabase
        .from('catalogo_tipos_trabajo')
        .insert({ ...payload, activo: true })
        .select()
        .single();
      if (error) throw error;
      return data as TipoTrabajoCatalogo;
    },
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ['catalogo_tipos_trabajo', vars.categoria] }),
  });
}

// ── KPIs ─────────────────────────────────────────────────────────────────────

export function useKPIsPersonal() {
  return useQuery({
    queryKey: ['personal', 'kpis'],
    queryFn: async () => {
      const [{ data: fijo }, { data: externo }] = await Promise.all([
        supabase.from('personal').select('categoria, activo'),
        supabase.from('personal_externo').select('tipo, activo'),
      ]);

      const activos = (fijo ?? []).filter(p => p.activo).length;
      const externos = (externo ?? []).filter(p => p.activo).length;
      const total = activos + externos;

      const porCategoria = (fijo ?? []).reduce<Record<string, number>>((acc, p) => {
        if (p.activo) acc[p.categoria] = (acc[p.categoria] ?? 0) + 1;
        return acc;
      }, {});

      return { total, activos, externos, porCategoria };
    },
    staleTime: 60000,
  });
}
