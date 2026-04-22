import {
  Map,
  Package,
  Wrench,
  Truck,
  Cog,
  Users,
  FileText,
  Activity,
  History,
  Download,
  GitBranch,
  Layers,
  ShieldCheck,
  Tractor,
  LayoutGrid,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface NavItem {
  id: string;
  label: string;
  ruta?: string;
  icono: LucideIcon;
  color: string;
  activo: boolean;
  children?: NavItemChild[];
}

export interface NavItemChild {
  id: string;
  label: string;
  ruta: string;
  icono: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  {
    id: 'campo',
    label: 'CAMPO',
    icono: Map,
    color: '#22c55e',
    activo: true,
    children: [
      { id: 'campo-selector', label: 'Selector de fincas', ruta: '/farm',           icono: LayoutGrid },
    ],
  },
  {
    id: 'inventario',
    label: 'INVENTARIO',
    icono: Package,
    color: '#38bdf8',
    activo: true,
    children: [
      { id: 'inventario-ubicaciones', label: 'Ubicaciones',  ruta: '/inventario', icono: Package },
    ],
  },
  { id: 'trabajos',       label: 'TRABAJOS',       ruta: '/trabajos',       icono: Wrench,      color: '#f59e0b', activo: true  },
  { id: 'logistica',      label: 'LOGÍSTICA',      ruta: '/logistica',      icono: Truck,       color: '#a78bfa', activo: true  },
  { id: 'maquinaria',     label: 'MAQUINARIA',     ruta: '/maquinaria',     icono: Tractor,     color: '#fb923c', activo: true  },
  { id: 'personal',       label: 'PERSONAL',       ruta: '/personal',       icono: Users,       color: '#e879f9', activo: true  },
  { id: 'parte-diario',   label: 'PARTE DIARIO',   ruta: '/parte-diario',   icono: FileText,    color: '#4ade80', activo: true  },
  { id: 'estado-general', label: 'ESTADO GENERAL', ruta: '/estado-general', icono: Activity,    color: '#94a3b8', activo: true  },
  { id: 'historicos',     label: 'HISTÓRICOS',     ruta: '/historicos',     icono: History,     color: '#94a3b8', activo: true  },
  { id: 'exportar-pdf',   label: 'EXPORTAR PDF',   ruta: '/exportar-pdf',   icono: Download,    color: '#94a3b8', activo: true  },
  { id: 'trazabilidad',   label: 'TRAZABILIDAD',   ruta: '/trazabilidad',   icono: GitBranch,   color: '#475569', activo: false },
  { id: 'materiales',     label: 'MATERIALES',     ruta: '/materiales',     icono: Layers,      color: '#475569', activo: false },
  { id: 'auditoria',      label: 'AUDITORÍA',      ruta: '/auditoria',      icono: ShieldCheck, color: '#475569', activo: false },
];
