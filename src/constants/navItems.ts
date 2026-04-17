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
  Eye,
  Database,
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
    color: '#3f6a4f',
    activo: true,
    children: [
      { id: 'campo-selector', label: 'Selector de fincas', ruta: '/farm',           icono: LayoutGrid },
    ],
  },
  {
    id: 'inventario',
    label: 'INVENTARIO',
    icono: Package,
    color: '#6d9b7d',
    activo: true,
    children: [
      { id: 'inventario-ubicaciones', label: 'Ubicaciones',  ruta: '/inventario', icono: Package },
    ],
  },
  { id: 'trabajos',       label: 'TRABAJOS',       ruta: '/trabajos',       icono: Wrench,      color: '#d97706', activo: true  },
  { id: 'logistica',      label: 'LOGÍSTICA',      ruta: '/logistica',      icono: Truck,       color: '#528163', activo: true  },
  { id: 'maquinaria',     label: 'MAQUINARIA',     ruta: '/maquinaria',     icono: Tractor,     color: '#c2410c', activo: true  },
  { id: 'personal',       label: 'PERSONAL',       ruta: '/personal',       icono: Users,       color: '#5f8f6f', activo: true  },
  { id: 'parte-diario',   label: 'PARTE DIARIO',   ruta: '/parte-diario',   icono: FileText,    color: '#6d9b7d', activo: true  },
  { id: 'presencia',      label: 'PRESENCIA',      ruta: '/presencia',      icono: Eye,         color: '#5a8f6a', activo: true  },
  { id: 'estado-general', label: 'ESTADO GENERAL', ruta: '/estado-general', icono: Activity,    color: '#94a3b8', activo: true  },
  { id: 'historicos',     label: 'HISTÓRICOS',     ruta: '/historicos',     icono: History,     color: '#94a3b8', activo: true  },
  { id: 'exportar-pdf',   label: 'EXPORTAR PDF',   ruta: '/exportar-pdf',   icono: Download,    color: '#94a3b8', activo: true  },
  { id: 'integracion-erp',label: 'INTEGRACIÓN ERP',ruta: '/integracion-erp',icono: Database,    color: '#355541', activo: true  },
  { id: 'trazabilidad',   label: 'TRAZABILIDAD',   ruta: '/trazabilidad',   icono: GitBranch,   color: '#4a6b52', activo: true  },
  { id: 'materiales',     label: 'MATERIALES',     ruta: '/materiales',     icono: Layers,      color: '#527a5c', activo: true  },
  { id: 'auditoria',      label: 'AUDITORÍA',      ruta: '/auditoria',      icono: ShieldCheck, color: '#f59e0b', activo: true  },
];
