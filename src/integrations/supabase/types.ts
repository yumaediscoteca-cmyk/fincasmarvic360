export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      ai_proposal_validations: {
        Row: {
          created_at: string | null
          decided_by: string | null
          decision: Database["public"]["Enums"]["ai_validation_decision"]
          id: string
          note: string | null
          proposal_id: string
        }
        Insert: {
          created_at?: string | null
          decided_by?: string | null
          decision: Database["public"]["Enums"]["ai_validation_decision"]
          id?: string
          note?: string | null
          proposal_id: string
        }
        Update: {
          created_at?: string | null
          decided_by?: string | null
          decision?: Database["public"]["Enums"]["ai_validation_decision"]
          id?: string
          note?: string | null
          proposal_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_proposal_validations_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "ai_proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_proposals: {
        Row: {
          category: Database["public"]["Enums"]["ai_proposal_category"] | null
          company_id: string | null
          created_at: string | null
          id: string
          input_json: Json | null
          output_json: Json | null
          related_parcel_id: string | null
          status: Database["public"]["Enums"]["ai_proposal_status"] | null
        }
        Insert: {
          category?: Database["public"]["Enums"]["ai_proposal_category"] | null
          company_id?: string | null
          created_at?: string | null
          id?: string
          input_json?: Json | null
          output_json?: Json | null
          related_parcel_id?: string | null
          status?: Database["public"]["Enums"]["ai_proposal_status"] | null
        }
        Update: {
          category?: Database["public"]["Enums"]["ai_proposal_category"] | null
          company_id?: string | null
          created_at?: string | null
          id?: string
          input_json?: Json | null
          output_json?: Json | null
          related_parcel_id?: string | null
          status?: Database["public"]["Enums"]["ai_proposal_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_proposals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_proposals_related_parcel_id_fkey"
            columns: ["related_parcel_id"]
            isOneToOne: false
            referencedRelation: "parcels"
            referencedColumns: ["parcel_id"]
          },
        ]
      }
      analisis_agua: {
        Row: {
          cloruros_ppm: number | null
          company_id: string | null
          conductividad_ec: number | null
          created_at: string | null
          dureza_total: number | null
          fecha: string | null
          finca: string | null
          fuente: string | null
          herramienta: string | null
          id: string
          nitratos_ppm: number | null
          observaciones: string | null
          operario: string | null
          ph: number | null
          salinidad_ppm: number | null
          sodio_ppm: number | null
          temperatura: number | null
        }
        Insert: {
          cloruros_ppm?: number | null
          company_id?: string | null
          conductividad_ec?: number | null
          created_at?: string | null
          dureza_total?: number | null
          fecha?: string | null
          finca?: string | null
          fuente?: string | null
          herramienta?: string | null
          id?: string
          nitratos_ppm?: number | null
          observaciones?: string | null
          operario?: string | null
          ph?: number | null
          salinidad_ppm?: number | null
          sodio_ppm?: number | null
          temperatura?: number | null
        }
        Update: {
          cloruros_ppm?: number | null
          company_id?: string | null
          conductividad_ec?: number | null
          created_at?: string | null
          dureza_total?: number | null
          fecha?: string | null
          finca?: string | null
          fuente?: string | null
          herramienta?: string | null
          id?: string
          nitratos_ppm?: number | null
          observaciones?: string | null
          operario?: string | null
          ph?: number | null
          salinidad_ppm?: number | null
          sodio_ppm?: number | null
          temperatura?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "analisis_agua_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      analisis_suelo: {
        Row: {
          company_id: string | null
          conductividad_ec: number | null
          created_at: string | null
          fecha: string | null
          fosforo_ppm: number | null
          herramienta: string | null
          id: string
          informe_url: string | null
          materia_organica: number | null
          nitrogeno_ppm: number | null
          num_muestras: number | null
          observaciones: string | null
          operario: string | null
          parcel_id: string | null
          ph: number | null
          potasio_ppm: number | null
          profundidad_cm: number | null
          salinidad_ppm: number | null
          sodio_ppm: number | null
          temperatura_suelo: number | null
          textura: string | null
        }
        Insert: {
          company_id?: string | null
          conductividad_ec?: number | null
          created_at?: string | null
          fecha?: string | null
          fosforo_ppm?: number | null
          herramienta?: string | null
          id?: string
          informe_url?: string | null
          materia_organica?: number | null
          nitrogeno_ppm?: number | null
          num_muestras?: number | null
          observaciones?: string | null
          operario?: string | null
          parcel_id?: string | null
          ph?: number | null
          potasio_ppm?: number | null
          profundidad_cm?: number | null
          salinidad_ppm?: number | null
          sodio_ppm?: number | null
          temperatura_suelo?: number | null
          textura?: string | null
        }
        Update: {
          company_id?: string | null
          conductividad_ec?: number | null
          created_at?: string | null
          fecha?: string | null
          fosforo_ppm?: number | null
          herramienta?: string | null
          id?: string
          informe_url?: string | null
          materia_organica?: number | null
          nitrogeno_ppm?: number | null
          num_muestras?: number | null
          observaciones?: string | null
          operario?: string | null
          parcel_id?: string | null
          ph?: number | null
          potasio_ppm?: number | null
          profundidad_cm?: number | null
          salinidad_ppm?: number | null
          sodio_ppm?: number | null
          temperatura_suelo?: number | null
          textura?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analisis_suelo_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analisis_suelo_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: false
            referencedRelation: "parcels"
            referencedColumns: ["parcel_id"]
          },
        ]
      }
      aperos: {
        Row: {
          codigo: string | null
          company_id: string | null
          created_at: string | null
          denominacion: string
          estado: string | null
          id: string
          marca: string | null
          ubicacion: string | null
          updated_at: string | null
        }
        Insert: {
          codigo?: string | null
          company_id?: string | null
          created_at?: string | null
          denominacion: string
          estado?: string | null
          id?: string
          marca?: string | null
          ubicacion?: string | null
          updated_at?: string | null
        }
        Update: {
          codigo?: string | null
          company_id?: string | null
          created_at?: string | null
          denominacion?: string
          estado?: string | null
          id?: string
          marca?: string | null
          ubicacion?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "aperos_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      camaras_almacen: {
        Row: {
          activa: boolean | null
          capacidad_palots: number | null
          company_id: string | null
          created_at: string | null
          id: string
          nombre: string
          temperatura_objetivo: number | null
          ubicacion: string | null
        }
        Insert: {
          activa?: boolean | null
          capacidad_palots?: number | null
          company_id?: string | null
          created_at?: string | null
          id?: string
          nombre: string
          temperatura_objetivo?: number | null
          ubicacion?: string | null
        }
        Update: {
          activa?: boolean | null
          capacidad_palots?: number | null
          company_id?: string | null
          created_at?: string | null
          id?: string
          nombre?: string
          temperatura_objetivo?: number | null
          ubicacion?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "camaras_almacen_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      camiones: {
        Row: {
          activo: boolean | null
          anio: number | null
          capacidad_kg: number | null
          codigo_interno: string | null
          company_id: string | null
          created_at: string | null
          created_by: string | null
          empresa_transporte: string | null
          estado_operativo: string | null
          fecha_itv: string | null
          fecha_proxima_itv: string | null
          fecha_proxima_revision: string | null
          foto_url: string | null
          gps_info: string | null
          id: string
          kilometros_actuales: number | null
          km_proximo_mantenimiento: number | null
          marca: string | null
          matricula: string
          modelo: string | null
          notas_mantenimiento: string | null
          tipo: string | null
        }
        Insert: {
          activo?: boolean | null
          anio?: number | null
          capacidad_kg?: number | null
          codigo_interno?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          empresa_transporte?: string | null
          estado_operativo?: string | null
          fecha_itv?: string | null
          fecha_proxima_itv?: string | null
          fecha_proxima_revision?: string | null
          foto_url?: string | null
          gps_info?: string | null
          id?: string
          kilometros_actuales?: number | null
          km_proximo_mantenimiento?: number | null
          marca?: string | null
          matricula: string
          modelo?: string | null
          notas_mantenimiento?: string | null
          tipo?: string | null
        }
        Update: {
          activo?: boolean | null
          anio?: number | null
          capacidad_kg?: number | null
          codigo_interno?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          empresa_transporte?: string | null
          estado_operativo?: string | null
          fecha_itv?: string | null
          fecha_proxima_itv?: string | null
          fecha_proxima_revision?: string | null
          foto_url?: string | null
          gps_info?: string | null
          id?: string
          kilometros_actuales?: number | null
          km_proximo_mantenimiento?: number | null
          marca?: string | null
          matricula?: string
          modelo?: string | null
          notas_mantenimiento?: string | null
          tipo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "camiones_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      catalogo_tipos_mantenimiento: {
        Row: {
          activo: boolean | null
          created_at: string | null
          id: string
          modulo: string | null
          nombre: string
        }
        Insert: {
          activo?: boolean | null
          created_at?: string | null
          id?: string
          modulo?: string | null
          nombre: string
        }
        Update: {
          activo?: boolean | null
          created_at?: string | null
          id?: string
          modulo?: string | null
          nombre?: string
        }
        Relationships: []
      }
      catalogo_tipos_trabajo: {
        Row: {
          activo: boolean | null
          categoria: string | null
          created_at: string | null
          id: string
          nombre: string
        }
        Insert: {
          activo?: boolean | null
          categoria?: string | null
          created_at?: string | null
          id?: string
          nombre: string
        }
        Update: {
          activo?: boolean | null
          categoria?: string | null
          created_at?: string | null
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      certificaciones_parcela: {
        Row: {
          campana: string
          company_id: string | null
          created_at: string | null
          entidad_certificadora: string
          estado: Database["public"]["Enums"]["estado_certificacion"]
          fecha_fin: string | null
          fecha_inicio: string
          id: string
          numero_expediente: string | null
          observaciones: string | null
          parcel_id: string | null
        }
        Insert: {
          campana: string
          company_id?: string | null
          created_at?: string | null
          entidad_certificadora: string
          estado?: Database["public"]["Enums"]["estado_certificacion"]
          fecha_fin?: string | null
          fecha_inicio: string
          id?: string
          numero_expediente?: string | null
          observaciones?: string | null
          parcel_id?: string | null
        }
        Update: {
          campana?: string
          company_id?: string | null
          created_at?: string | null
          entidad_certificadora?: string
          estado?: Database["public"]["Enums"]["estado_certificacion"]
          fecha_fin?: string | null
          fecha_inicio?: string
          id?: string
          numero_expediente?: string | null
          observaciones?: string | null
          parcel_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "certificaciones_parcela_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificaciones_parcela_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: false
            referencedRelation: "parcels"
            referencedColumns: ["parcel_id"]
          },
        ]
      }
      cierres_jornada: {
        Row: {
          cerrado_at: string | null
          cerrado_by: string | null
          fecha: string
          id: string
          notas: string | null
          parte_diario_id: string | null
          trabajos_arrastrados: number | null
          trabajos_ejecutados: number | null
          trabajos_pendientes: number | null
        }
        Insert: {
          cerrado_at?: string | null
          cerrado_by?: string | null
          fecha: string
          id?: string
          notas?: string | null
          parte_diario_id?: string | null
          trabajos_arrastrados?: number | null
          trabajos_ejecutados?: number | null
          trabajos_pendientes?: number | null
        }
        Update: {
          cerrado_at?: string | null
          cerrado_by?: string | null
          fecha?: string
          id?: string
          notas?: string | null
          parte_diario_id?: string | null
          trabajos_arrastrados?: number | null
          trabajos_ejecutados?: number | null
          trabajos_pendientes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cierres_jornada_parte_diario_id_fkey"
            columns: ["parte_diario_id"]
            isOneToOne: false
            referencedRelation: "partes_diarios"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          created_at: string | null
          id: string
          name: string
          slug: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          slug?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          slug?: string | null
        }
        Relationships: []
      }
      cuadrillas: {
        Row: {
          activa: boolean | null
          company_id: string | null
          created_at: string | null
          empresa: string | null
          id: string
          nif: string | null
          nombre: string
          qr_code: string | null
          responsable: string | null
          telefono: string | null
        }
        Insert: {
          activa?: boolean | null
          company_id?: string | null
          created_at?: string | null
          empresa?: string | null
          id?: string
          nif?: string | null
          nombre: string
          qr_code?: string | null
          responsable?: string | null
          telefono?: string | null
        }
        Update: {
          activa?: boolean | null
          company_id?: string | null
          created_at?: string | null
          empresa?: string | null
          id?: string
          nif?: string | null
          nombre?: string
          qr_code?: string | null
          responsable?: string | null
          telefono?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cuadrillas_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      cultivos_catalogo: {
        Row: {
          ciclo_dias: number
          created_at: string | null
          es_ecologico: boolean | null
          id: string
          kg_plastico_por_ha: number | null
          m_cinta_riego_por_ha: number | null
          marco_std_entre_lineas_cm: number | null
          marco_std_entre_plantas_cm: number | null
          nombre_display: string
          nombre_interno: string
          rendimiento_kg_ha: number | null
        }
        Insert: {
          ciclo_dias: number
          created_at?: string | null
          es_ecologico?: boolean | null
          id?: string
          kg_plastico_por_ha?: number | null
          m_cinta_riego_por_ha?: number | null
          marco_std_entre_lineas_cm?: number | null
          marco_std_entre_plantas_cm?: number | null
          nombre_display: string
          nombre_interno: string
          rendimiento_kg_ha?: number | null
        }
        Update: {
          ciclo_dias?: number
          created_at?: string | null
          es_ecologico?: boolean | null
          id?: string
          kg_plastico_por_ha?: number | null
          m_cinta_riego_por_ha?: number | null
          marco_std_entre_lineas_cm?: number | null
          marco_std_entre_plantas_cm?: number | null
          nombre_display?: string
          nombre_interno?: string
          rendimiento_kg_ha?: number | null
        }
        Relationships: []
      }
      erp_exportaciones: {
        Row: {
          company_id: string | null
          contenido: Json | null
          created_by: string | null
          fecha: string | null
          generado_at: string | null
          id: string
          tipo: string | null
        }
        Insert: {
          company_id?: string | null
          contenido?: Json | null
          created_by?: string | null
          fecha?: string | null
          generado_at?: string | null
          id?: string
          tipo?: string | null
        }
        Update: {
          company_id?: string | null
          contenido?: Json | null
          created_by?: string | null
          fecha?: string | null
          generado_at?: string | null
          id?: string
          tipo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "erp_exportaciones_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      fotos_campo: {
        Row: {
          company_id: string | null
          descripcion: string | null
          fecha: string | null
          id: string
          latitud: number | null
          longitud: number | null
          parcel_id: string | null
          tipo: string | null
          url_imagen: string | null
        }
        Insert: {
          company_id?: string | null
          descripcion?: string | null
          fecha?: string | null
          id?: string
          latitud?: number | null
          longitud?: number | null
          parcel_id?: string | null
          tipo?: string | null
          url_imagen?: string | null
        }
        Update: {
          company_id?: string | null
          descripcion?: string | null
          fecha?: string | null
          id?: string
          latitud?: number | null
          longitud?: number | null
          parcel_id?: string | null
          tipo?: string | null
          url_imagen?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fotos_campo_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fotos_campo_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: false
            referencedRelation: "parcels"
            referencedColumns: ["parcel_id"]
          },
        ]
      }
      ganaderos: {
        Row: {
          activo: boolean | null
          company_id: string | null
          created_at: string | null
          created_by: string | null
          direccion: string | null
          id: string
          nombre: string
          notas: string | null
          telefono: string | null
        }
        Insert: {
          activo?: boolean | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          direccion?: string | null
          id?: string
          nombre: string
          notas?: string | null
          telefono?: string | null
        }
        Update: {
          activo?: boolean | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          direccion?: string | null
          id?: string
          nombre?: string
          notas?: string | null
          telefono?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ganaderos_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      harvests: {
        Row: {
          company_id: string | null
          created_at: string | null
          crop: string | null
          date: string | null
          harvest_cost: number | null
          id: string
          parcel_id: string | null
          price_kg: number | null
          production_kg: number | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          crop?: string | null
          date?: string | null
          harvest_cost?: number | null
          id?: string
          parcel_id?: string | null
          price_kg?: number | null
          production_kg?: number | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          crop?: string | null
          date?: string | null
          harvest_cost?: number | null
          id?: string
          parcel_id?: string | null
          price_kg?: number | null
          production_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "harvests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "harvests_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: false
            referencedRelation: "parcels"
            referencedColumns: ["parcel_id"]
          },
        ]
      }
      inventario_categorias: {
        Row: {
          created_at: string | null
          icono: string | null
          id: string
          nombre: string
          orden: number | null
          slug: string
        }
        Insert: {
          created_at?: string | null
          icono?: string | null
          id?: string
          nombre: string
          orden?: number | null
          slug: string
        }
        Update: {
          created_at?: string | null
          icono?: string | null
          id?: string
          nombre?: string
          orden?: number | null
          slug?: string
        }
        Relationships: []
      }
      inventario_entradas: {
        Row: {
          cantidad: number
          categoria_id: string | null
          company_id: string | null
          created_at: string | null
          created_by: string | null
          fecha: string | null
          foto_albaran: string | null
          id: string
          importe_total: number | null
          notas: string | null
          precio_unitario: number | null
          producto_id: string | null
          proveedor_id: string | null
          receptor: string | null
          ubicacion_id: string | null
          unidad: string
        }
        Insert: {
          cantidad: number
          categoria_id?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          fecha?: string | null
          foto_albaran?: string | null
          id?: string
          importe_total?: number | null
          notas?: string | null
          precio_unitario?: number | null
          producto_id?: string | null
          proveedor_id?: string | null
          receptor?: string | null
          ubicacion_id?: string | null
          unidad: string
        }
        Update: {
          cantidad?: number
          categoria_id?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          fecha?: string | null
          foto_albaran?: string | null
          id?: string
          importe_total?: number | null
          notas?: string | null
          precio_unitario?: number | null
          producto_id?: string | null
          proveedor_id?: string | null
          receptor?: string | null
          ubicacion_id?: string | null
          unidad?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventario_entradas_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "inventario_categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_entradas_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_entradas_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "inventario_productos_catalogo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_entradas_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "proveedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_entradas_ubicacion_id_fkey"
            columns: ["ubicacion_id"]
            isOneToOne: false
            referencedRelation: "inventario_ubicaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      inventario_informes: {
        Row: {
          categoria_id: string | null
          company_id: string | null
          contenido: Json | null
          fecha_fin: string | null
          fecha_inicio: string | null
          generado_at: string | null
          id: string
          tipo: string | null
          ubicacion_id: string | null
        }
        Insert: {
          categoria_id?: string | null
          company_id?: string | null
          contenido?: Json | null
          fecha_fin?: string | null
          fecha_inicio?: string | null
          generado_at?: string | null
          id?: string
          tipo?: string | null
          ubicacion_id?: string | null
        }
        Update: {
          categoria_id?: string | null
          company_id?: string | null
          contenido?: Json | null
          fecha_fin?: string | null
          fecha_inicio?: string | null
          generado_at?: string | null
          id?: string
          tipo?: string | null
          ubicacion_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventario_informes_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "inventario_categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_informes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_informes_ubicacion_id_fkey"
            columns: ["ubicacion_id"]
            isOneToOne: false
            referencedRelation: "inventario_ubicaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      inventario_movimientos: {
        Row: {
          cantidad: number | null
          categoria_id: string | null
          company_id: string | null
          created_at: string | null
          created_by: string | null
          fecha: string | null
          id: string
          notas: string | null
          producto_id: string | null
          responsable: string | null
          ubicacion_destino_id: string | null
          ubicacion_origen_id: string | null
          unidad: string | null
        }
        Insert: {
          cantidad?: number | null
          categoria_id?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          fecha?: string | null
          id?: string
          notas?: string | null
          producto_id?: string | null
          responsable?: string | null
          ubicacion_destino_id?: string | null
          ubicacion_origen_id?: string | null
          unidad?: string | null
        }
        Update: {
          cantidad?: number | null
          categoria_id?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          fecha?: string | null
          id?: string
          notas?: string | null
          producto_id?: string | null
          responsable?: string | null
          ubicacion_destino_id?: string | null
          ubicacion_origen_id?: string | null
          unidad?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventario_movimientos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "inventario_categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_movimientos_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_movimientos_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "inventario_productos_catalogo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_movimientos_ubicacion_destino_id_fkey"
            columns: ["ubicacion_destino_id"]
            isOneToOne: false
            referencedRelation: "inventario_ubicaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_movimientos_ubicacion_origen_id_fkey"
            columns: ["ubicacion_origen_id"]
            isOneToOne: false
            referencedRelation: "inventario_ubicaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      inventario_productos_catalogo: {
        Row: {
          activo: boolean | null
          categoria_id: string | null
          company_id: string | null
          created_at: string | null
          id: string
          nombre: string
          precio_unitario: number | null
          unidad_defecto: string | null
        }
        Insert: {
          activo?: boolean | null
          categoria_id?: string | null
          company_id?: string | null
          created_at?: string | null
          id?: string
          nombre: string
          precio_unitario?: number | null
          unidad_defecto?: string | null
        }
        Update: {
          activo?: boolean | null
          categoria_id?: string | null
          company_id?: string | null
          created_at?: string | null
          id?: string
          nombre?: string
          precio_unitario?: number | null
          unidad_defecto?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventario_productos_catalogo_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "inventario_categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_productos_catalogo_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      inventario_registros: {
        Row: {
          cantidad: number | null
          categoria_id: string | null
          company_id: string | null
          created_at: string | null
          created_by: string | null
          descripcion: string | null
          foto_url: string | null
          foto_url_2: string | null
          id: string
          notas: string | null
          precio_unitario: number | null
          producto_id: string | null
          responsable: string | null
          ubicacion_id: string | null
          unidad: string | null
        }
        Insert: {
          cantidad?: number | null
          categoria_id?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          descripcion?: string | null
          foto_url?: string | null
          foto_url_2?: string | null
          id?: string
          notas?: string | null
          precio_unitario?: number | null
          producto_id?: string | null
          responsable?: string | null
          ubicacion_id?: string | null
          unidad?: string | null
        }
        Update: {
          cantidad?: number | null
          categoria_id?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          descripcion?: string | null
          foto_url?: string | null
          foto_url_2?: string | null
          id?: string
          notas?: string | null
          precio_unitario?: number | null
          producto_id?: string | null
          responsable?: string | null
          ubicacion_id?: string | null
          unidad?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventario_registros_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "inventario_categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_registros_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_registros_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "inventario_productos_catalogo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_registros_ubicacion_id_fkey"
            columns: ["ubicacion_id"]
            isOneToOne: false
            referencedRelation: "inventario_ubicaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      inventario_ubicacion_activo: {
        Row: {
          apero_id: string | null
          company_id: string | null
          created_at: string | null
          created_by: string | null
          id: string
          maquinaria_apero_id: string | null
          maquinaria_tractor_id: string | null
          notas: string | null
          ubicacion_id: string
        }
        Insert: {
          apero_id?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          maquinaria_apero_id?: string | null
          maquinaria_tractor_id?: string | null
          notas?: string | null
          ubicacion_id: string
        }
        Update: {
          apero_id?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          maquinaria_apero_id?: string | null
          maquinaria_tractor_id?: string | null
          notas?: string | null
          ubicacion_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventario_ubicacion_activo_apero_id_fkey"
            columns: ["apero_id"]
            isOneToOne: false
            referencedRelation: "aperos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_ubicacion_activo_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_ubicacion_activo_maquinaria_apero_id_fkey"
            columns: ["maquinaria_apero_id"]
            isOneToOne: false
            referencedRelation: "maquinaria_aperos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_ubicacion_activo_maquinaria_apero_id_fkey"
            columns: ["maquinaria_apero_id"]
            isOneToOne: false
            referencedRelation: "v_inventario_activos_en_ubicacion"
            referencedColumns: ["apero_id"]
          },
          {
            foreignKeyName: "inventario_ubicacion_activo_maquinaria_apero_id_fkey"
            columns: ["maquinaria_apero_id"]
            isOneToOne: false
            referencedRelation: "v_maquinaria_aperos_en_inventario"
            referencedColumns: ["apero_id"]
          },
          {
            foreignKeyName: "inventario_ubicacion_activo_maquinaria_tractor_id_fkey"
            columns: ["maquinaria_tractor_id"]
            isOneToOne: false
            referencedRelation: "maquinaria_tractores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_ubicacion_activo_maquinaria_tractor_id_fkey"
            columns: ["maquinaria_tractor_id"]
            isOneToOne: false
            referencedRelation: "v_inventario_activos_en_ubicacion"
            referencedColumns: ["tractor_id"]
          },
          {
            foreignKeyName: "inventario_ubicacion_activo_maquinaria_tractor_id_fkey"
            columns: ["maquinaria_tractor_id"]
            isOneToOne: false
            referencedRelation: "v_tractores_en_inventario"
            referencedColumns: ["tractor_id"]
          },
          {
            foreignKeyName: "inventario_ubicacion_activo_ubicacion_id_fkey"
            columns: ["ubicacion_id"]
            isOneToOne: false
            referencedRelation: "inventario_ubicaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      inventario_ubicaciones: {
        Row: {
          activa: boolean | null
          company_id: string | null
          created_at: string | null
          descripcion: string | null
          foto_url: string | null
          id: string
          nombre: string
          orden: number | null
          updated_at: string | null
        }
        Insert: {
          activa?: boolean | null
          company_id?: string | null
          created_at?: string | null
          descripcion?: string | null
          foto_url?: string | null
          id?: string
          nombre: string
          orden?: number | null
          updated_at?: string | null
        }
        Update: {
          activa?: boolean | null
          company_id?: string | null
          created_at?: string | null
          descripcion?: string | null
          foto_url?: string | null
          id?: string
          nombre?: string
          orden?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventario_ubicaciones_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      lecturas_sensor_planta: {
        Row: {
          clorofila: number | null
          company_id: string | null
          created_at: string | null
          cultivo: string | null
          fecha: string | null
          herramienta: string | null
          id: string
          indice_salud: number | null
          ndvi: number | null
          nivel_estres: number | null
          num_plantas_medidas: number | null
          observaciones: string | null
          operario: string | null
          parcel_id: string | null
        }
        Insert: {
          clorofila?: number | null
          company_id?: string | null
          created_at?: string | null
          cultivo?: string | null
          fecha?: string | null
          herramienta?: string | null
          id?: string
          indice_salud?: number | null
          ndvi?: number | null
          nivel_estres?: number | null
          num_plantas_medidas?: number | null
          observaciones?: string | null
          operario?: string | null
          parcel_id?: string | null
        }
        Update: {
          clorofila?: number | null
          company_id?: string | null
          created_at?: string | null
          cultivo?: string | null
          fecha?: string | null
          herramienta?: string | null
          id?: string
          indice_salud?: number | null
          ndvi?: number | null
          nivel_estres?: number | null
          num_plantas_medidas?: number | null
          observaciones?: string | null
          operario?: string | null
          parcel_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lecturas_sensor_planta_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lecturas_sensor_planta_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: false
            referencedRelation: "parcels"
            referencedColumns: ["parcel_id"]
          },
        ]
      }
      lia_contexto_sesion: {
        Row: {
          company_id: string | null
          contexto: Json | null
          created_at: string | null
          id: string
          sesion_id: string | null
        }
        Insert: {
          company_id?: string | null
          contexto?: Json | null
          created_at?: string | null
          id?: string
          sesion_id?: string | null
        }
        Update: {
          company_id?: string | null
          contexto?: Json | null
          created_at?: string | null
          id?: string
          sesion_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lia_contexto_sesion_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      lia_memoria: {
        Row: {
          clave: string | null
          company_id: string | null
          created_at: string | null
          id: string
          tipo: string | null
          valor: Json | null
        }
        Insert: {
          clave?: string | null
          company_id?: string | null
          created_at?: string | null
          id?: string
          tipo?: string | null
          valor?: Json | null
        }
        Update: {
          clave?: string | null
          company_id?: string | null
          created_at?: string | null
          id?: string
          tipo?: string | null
          valor?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "lia_memoria_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      lia_patrones: {
        Row: {
          company_id: string | null
          frecuencia: number | null
          id: string
          patron: string | null
          ultimo_uso: string | null
        }
        Insert: {
          company_id?: string | null
          frecuencia?: number | null
          id?: string
          patron?: string | null
          ultimo_uso?: string | null
        }
        Update: {
          company_id?: string | null
          frecuencia?: number | null
          id?: string
          patron?: string | null
          ultimo_uso?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lia_patrones_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      logistica_combustible: {
        Row: {
          company_id: string | null
          conductor_id: string | null
          coste_total: number | null
          created_at: string | null
          created_by: string | null
          fecha: string | null
          foto_url: string | null
          gasolinera: string | null
          id: string
          litros: number | null
          notas: string | null
          vehiculo_id: string | null
          vehiculo_tipo: string | null
        }
        Insert: {
          company_id?: string | null
          conductor_id?: string | null
          coste_total?: number | null
          created_at?: string | null
          created_by?: string | null
          fecha?: string | null
          foto_url?: string | null
          gasolinera?: string | null
          id?: string
          litros?: number | null
          notas?: string | null
          vehiculo_id?: string | null
          vehiculo_tipo?: string | null
        }
        Update: {
          company_id?: string | null
          conductor_id?: string | null
          coste_total?: number | null
          created_at?: string | null
          created_by?: string | null
          fecha?: string | null
          foto_url?: string | null
          gasolinera?: string | null
          id?: string
          litros?: number | null
          notas?: string | null
          vehiculo_id?: string | null
          vehiculo_tipo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "logistica_combustible_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logistica_combustible_conductor_id_fkey"
            columns: ["conductor_id"]
            isOneToOne: false
            referencedRelation: "personal"
            referencedColumns: ["id"]
          },
        ]
      }
      logistica_inventario_sync: {
        Row: {
          activo: boolean | null
          company_id: string | null
          created_at: string | null
          id: string
          tipo: string
          ubicacion_id: string | null
          vehiculo_id: string | null
        }
        Insert: {
          activo?: boolean | null
          company_id?: string | null
          created_at?: string | null
          id?: string
          tipo: string
          ubicacion_id?: string | null
          vehiculo_id?: string | null
        }
        Update: {
          activo?: boolean | null
          company_id?: string | null
          created_at?: string | null
          id?: string
          tipo?: string
          ubicacion_id?: string | null
          vehiculo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "logistica_inventario_sync_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logistica_inventario_sync_ubicacion_id_fkey"
            columns: ["ubicacion_id"]
            isOneToOne: false
            referencedRelation: "inventario_ubicaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      logistica_mantenimiento: {
        Row: {
          camion_id: string | null
          company_id: string | null
          coste_euros: number | null
          created_at: string | null
          created_by: string | null
          descripcion: string | null
          fecha: string | null
          foto_url: string | null
          foto_url_2: string | null
          id: string
          proveedor: string | null
          tipo: string | null
          vehiculo_empresa_id: string | null
          vehiculo_tipo: string | null
        }
        Insert: {
          camion_id?: string | null
          company_id?: string | null
          coste_euros?: number | null
          created_at?: string | null
          created_by?: string | null
          descripcion?: string | null
          fecha?: string | null
          foto_url?: string | null
          foto_url_2?: string | null
          id?: string
          proveedor?: string | null
          tipo?: string | null
          vehiculo_empresa_id?: string | null
          vehiculo_tipo?: string | null
        }
        Update: {
          camion_id?: string | null
          company_id?: string | null
          coste_euros?: number | null
          created_at?: string | null
          created_by?: string | null
          descripcion?: string | null
          fecha?: string | null
          foto_url?: string | null
          foto_url_2?: string | null
          id?: string
          proveedor?: string | null
          tipo?: string | null
          vehiculo_empresa_id?: string | null
          vehiculo_tipo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_logistica_mant_camion"
            columns: ["camion_id"]
            isOneToOne: false
            referencedRelation: "camiones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_logistica_mant_vehiculo_empresa"
            columns: ["vehiculo_empresa_id"]
            isOneToOne: false
            referencedRelation: "vehiculos_empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logistica_mantenimiento_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      logistica_viajes: {
        Row: {
          camion_id: string | null
          company_id: string | null
          conductor_id: string | null
          created_at: string | null
          created_by: string | null
          destino: string | null
          finca: string | null
          gasto_gasolina_euros: number | null
          gasto_gasolina_litros: number | null
          hora_llegada: string | null
          hora_salida: string | null
          id: string
          km_recorridos: number | null
          notas: string | null
          personal_id: string | null
          ruta: string | null
          trabajo_realizado: string | null
        }
        Insert: {
          camion_id?: string | null
          company_id?: string | null
          conductor_id?: string | null
          created_at?: string | null
          created_by?: string | null
          destino?: string | null
          finca?: string | null
          gasto_gasolina_euros?: number | null
          gasto_gasolina_litros?: number | null
          hora_llegada?: string | null
          hora_salida?: string | null
          id?: string
          km_recorridos?: number | null
          notas?: string | null
          personal_id?: string | null
          ruta?: string | null
          trabajo_realizado?: string | null
        }
        Update: {
          camion_id?: string | null
          company_id?: string | null
          conductor_id?: string | null
          created_at?: string | null
          created_by?: string | null
          destino?: string | null
          finca?: string | null
          gasto_gasolina_euros?: number | null
          gasto_gasolina_litros?: number | null
          hora_llegada?: string | null
          hora_salida?: string | null
          id?: string
          km_recorridos?: number | null
          notas?: string | null
          personal_id?: string | null
          ruta?: string | null
          trabajo_realizado?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "logistica_viajes_camion_id_fkey"
            columns: ["camion_id"]
            isOneToOne: false
            referencedRelation: "camiones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logistica_viajes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logistica_viajes_personal_id_fkey"
            columns: ["personal_id"]
            isOneToOne: false
            referencedRelation: "personal"
            referencedColumns: ["id"]
          },
        ]
      }
      maquinaria_aperos: {
        Row: {
          activo: boolean | null
          codigo_interno: string | null
          company_id: string | null
          created_at: string | null
          created_by: string | null
          descripcion: string | null
          estado: string | null
          foto_url: string | null
          id: string
          notas: string | null
          tipo: string | null
          tractor_id: string | null
        }
        Insert: {
          activo?: boolean | null
          codigo_interno?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          descripcion?: string | null
          estado?: string | null
          foto_url?: string | null
          id?: string
          notas?: string | null
          tipo?: string | null
          tractor_id?: string | null
        }
        Update: {
          activo?: boolean | null
          codigo_interno?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          descripcion?: string | null
          estado?: string | null
          foto_url?: string | null
          id?: string
          notas?: string | null
          tipo?: string | null
          tractor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maquinaria_aperos_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maquinaria_aperos_tractor_id_fkey"
            columns: ["tractor_id"]
            isOneToOne: false
            referencedRelation: "maquinaria_tractores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maquinaria_aperos_tractor_id_fkey"
            columns: ["tractor_id"]
            isOneToOne: false
            referencedRelation: "v_inventario_activos_en_ubicacion"
            referencedColumns: ["tractor_id"]
          },
          {
            foreignKeyName: "maquinaria_aperos_tractor_id_fkey"
            columns: ["tractor_id"]
            isOneToOne: false
            referencedRelation: "v_tractores_en_inventario"
            referencedColumns: ["tractor_id"]
          },
        ]
      }
      maquinaria_inventario_sync: {
        Row: {
          activo: boolean | null
          company_id: string | null
          created_at: string | null
          id: string
          maquinaria_id: string | null
          tipo: string
          ubicacion_id: string | null
        }
        Insert: {
          activo?: boolean | null
          company_id?: string | null
          created_at?: string | null
          id?: string
          maquinaria_id?: string | null
          tipo: string
          ubicacion_id?: string | null
        }
        Update: {
          activo?: boolean | null
          company_id?: string | null
          created_at?: string | null
          id?: string
          maquinaria_id?: string | null
          tipo?: string
          ubicacion_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maquinaria_inventario_sync_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maquinaria_inventario_sync_ubicacion_id_fkey"
            columns: ["ubicacion_id"]
            isOneToOne: false
            referencedRelation: "inventario_ubicaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      maquinaria_mantenimiento: {
        Row: {
          company_id: string | null
          coste_euros: number | null
          created_at: string | null
          created_by: string | null
          descripcion: string | null
          fecha: string | null
          foto_url: string | null
          foto_url_2: string | null
          horas_motor_al_momento: number | null
          id: string
          proveedor: string | null
          tipo: string | null
          tractor_id: string | null
        }
        Insert: {
          company_id?: string | null
          coste_euros?: number | null
          created_at?: string | null
          created_by?: string | null
          descripcion?: string | null
          fecha?: string | null
          foto_url?: string | null
          foto_url_2?: string | null
          horas_motor_al_momento?: number | null
          id?: string
          proveedor?: string | null
          tipo?: string | null
          tractor_id?: string | null
        }
        Update: {
          company_id?: string | null
          coste_euros?: number | null
          created_at?: string | null
          created_by?: string | null
          descripcion?: string | null
          fecha?: string | null
          foto_url?: string | null
          foto_url_2?: string | null
          horas_motor_al_momento?: number | null
          id?: string
          proveedor?: string | null
          tipo?: string | null
          tractor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maquinaria_mantenimiento_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maquinaria_mantenimiento_tractor_id_fkey"
            columns: ["tractor_id"]
            isOneToOne: false
            referencedRelation: "maquinaria_tractores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maquinaria_mantenimiento_tractor_id_fkey"
            columns: ["tractor_id"]
            isOneToOne: false
            referencedRelation: "v_inventario_activos_en_ubicacion"
            referencedColumns: ["tractor_id"]
          },
          {
            foreignKeyName: "maquinaria_mantenimiento_tractor_id_fkey"
            columns: ["tractor_id"]
            isOneToOne: false
            referencedRelation: "v_tractores_en_inventario"
            referencedColumns: ["tractor_id"]
          },
        ]
      }
      maquinaria_tractores: {
        Row: {
          activo: boolean | null
          anio: number | null
          codigo_interno: string | null
          company_id: string | null
          created_at: string | null
          created_by: string | null
          estado_operativo: string | null
          fecha_proxima_itv: string | null
          fecha_proxima_revision: string | null
          ficha_tecnica: string | null
          foto_url: string | null
          gps_info: string | null
          horas_motor: number | null
          horas_proximo_mantenimiento: number | null
          id: string
          marca: string | null
          matricula: string
          modelo: string | null
          notas: string | null
        }
        Insert: {
          activo?: boolean | null
          anio?: number | null
          codigo_interno?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          estado_operativo?: string | null
          fecha_proxima_itv?: string | null
          fecha_proxima_revision?: string | null
          ficha_tecnica?: string | null
          foto_url?: string | null
          gps_info?: string | null
          horas_motor?: number | null
          horas_proximo_mantenimiento?: number | null
          id?: string
          marca?: string | null
          matricula: string
          modelo?: string | null
          notas?: string | null
        }
        Update: {
          activo?: boolean | null
          anio?: number | null
          codigo_interno?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          estado_operativo?: string | null
          fecha_proxima_itv?: string | null
          fecha_proxima_revision?: string | null
          ficha_tecnica?: string | null
          foto_url?: string | null
          gps_info?: string | null
          horas_motor?: number | null
          horas_proximo_mantenimiento?: number | null
          id?: string
          marca?: string | null
          matricula?: string
          modelo?: string | null
          notas?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maquinaria_tractores_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      maquinaria_uso: {
        Row: {
          apero_id: string | null
          company_id: string | null
          created_at: string | null
          created_by: string | null
          fecha: string | null
          finca: string | null
          foto_url: string | null
          gasolina_litros: number | null
          hora_fin: string | null
          hora_inicio: string | null
          horas_trabajadas: number | null
          id: string
          notas: string | null
          parcel_id: string | null
          personal_id: string | null
          tipo_trabajo: string | null
          tractor_id: string | null
          tractorista: string | null
        }
        Insert: {
          apero_id?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          fecha?: string | null
          finca?: string | null
          foto_url?: string | null
          gasolina_litros?: number | null
          hora_fin?: string | null
          hora_inicio?: string | null
          horas_trabajadas?: number | null
          id?: string
          notas?: string | null
          parcel_id?: string | null
          personal_id?: string | null
          tipo_trabajo?: string | null
          tractor_id?: string | null
          tractorista?: string | null
        }
        Update: {
          apero_id?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          fecha?: string | null
          finca?: string | null
          foto_url?: string | null
          gasolina_litros?: number | null
          hora_fin?: string | null
          hora_inicio?: string | null
          horas_trabajadas?: number | null
          id?: string
          notas?: string | null
          parcel_id?: string | null
          personal_id?: string | null
          tipo_trabajo?: string | null
          tractor_id?: string | null
          tractorista?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maquinaria_uso_apero_id_fkey"
            columns: ["apero_id"]
            isOneToOne: false
            referencedRelation: "maquinaria_aperos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maquinaria_uso_apero_id_fkey"
            columns: ["apero_id"]
            isOneToOne: false
            referencedRelation: "v_inventario_activos_en_ubicacion"
            referencedColumns: ["apero_id"]
          },
          {
            foreignKeyName: "maquinaria_uso_apero_id_fkey"
            columns: ["apero_id"]
            isOneToOne: false
            referencedRelation: "v_maquinaria_aperos_en_inventario"
            referencedColumns: ["apero_id"]
          },
          {
            foreignKeyName: "maquinaria_uso_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maquinaria_uso_personal_id_fkey"
            columns: ["personal_id"]
            isOneToOne: false
            referencedRelation: "personal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maquinaria_uso_tractor_id_fkey"
            columns: ["tractor_id"]
            isOneToOne: false
            referencedRelation: "maquinaria_tractores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maquinaria_uso_tractor_id_fkey"
            columns: ["tractor_id"]
            isOneToOne: false
            referencedRelation: "v_inventario_activos_en_ubicacion"
            referencedColumns: ["tractor_id"]
          },
          {
            foreignKeyName: "maquinaria_uso_tractor_id_fkey"
            columns: ["tractor_id"]
            isOneToOne: false
            referencedRelation: "v_tractores_en_inventario"
            referencedColumns: ["tractor_id"]
          },
        ]
      }
      movimientos_palot: {
        Row: {
          camion_id: string | null
          company_id: string | null
          created_at: string | null
          destino: string | null
          fecha: string | null
          id: string
          notas: string | null
          origen: string | null
          palot_id: string
          responsable: string | null
          tipo_movimiento: string | null
        }
        Insert: {
          camion_id?: string | null
          company_id?: string | null
          created_at?: string | null
          destino?: string | null
          fecha?: string | null
          id?: string
          notas?: string | null
          origen?: string | null
          palot_id: string
          responsable?: string | null
          tipo_movimiento?: string | null
        }
        Update: {
          camion_id?: string | null
          company_id?: string | null
          created_at?: string | null
          destino?: string | null
          fecha?: string | null
          id?: string
          notas?: string | null
          origen?: string | null
          palot_id?: string
          responsable?: string | null
          tipo_movimiento?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_movimientos_palot_camion"
            columns: ["camion_id"]
            isOneToOne: false
            referencedRelation: "camiones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_palot_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_palot_palot_id_fkey"
            columns: ["palot_id"]
            isOneToOne: false
            referencedRelation: "palots"
            referencedColumns: ["id"]
          },
        ]
      }
      palots: {
        Row: {
          camara_id: string | null
          company_id: string | null
          created_at: string | null
          cultivo: string | null
          estado: string | null
          fecha_entrada: string | null
          fecha_salida: string | null
          id: string
          notas: string | null
          numero_palot: string
          parcel_id: string | null
          peso_kg: number | null
          variedad: string | null
        }
        Insert: {
          camara_id?: string | null
          company_id?: string | null
          created_at?: string | null
          cultivo?: string | null
          estado?: string | null
          fecha_entrada?: string | null
          fecha_salida?: string | null
          id?: string
          notas?: string | null
          numero_palot: string
          parcel_id?: string | null
          peso_kg?: number | null
          variedad?: string | null
        }
        Update: {
          camara_id?: string | null
          company_id?: string | null
          created_at?: string | null
          cultivo?: string | null
          estado?: string | null
          fecha_entrada?: string | null
          fecha_salida?: string | null
          id?: string
          notas?: string | null
          numero_palot?: string
          parcel_id?: string | null
          peso_kg?: number | null
          variedad?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "palots_camara_id_fkey"
            columns: ["camara_id"]
            isOneToOne: false
            referencedRelation: "camaras_almacen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "palots_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "palots_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: false
            referencedRelation: "parcels"
            referencedColumns: ["parcel_id"]
          },
        ]
      }
      parcel_photos: {
        Row: {
          company_id: string | null
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          parcel_id: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          parcel_id?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          parcel_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "parcel_photos_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parcel_photos_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: false
            referencedRelation: "parcels"
            referencedColumns: ["parcel_id"]
          },
        ]
      }
      parcel_production: {
        Row: {
          area_hectares: number | null
          company_id: string | null
          crop: string | null
          estimated_cost: number | null
          estimated_drip_meters: number | null
          estimated_plastic_kg: number | null
          estimated_production_kg: number | null
          parcel_id: string
        }
        Insert: {
          area_hectares?: number | null
          company_id?: string | null
          crop?: string | null
          estimated_cost?: number | null
          estimated_drip_meters?: number | null
          estimated_plastic_kg?: number | null
          estimated_production_kg?: number | null
          parcel_id: string
        }
        Update: {
          area_hectares?: number | null
          company_id?: string | null
          crop?: string | null
          estimated_cost?: number | null
          estimated_drip_meters?: number | null
          estimated_plastic_kg?: number | null
          estimated_production_kg?: number | null
          parcel_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "parcel_production_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parcel_production_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: true
            referencedRelation: "parcels"
            referencedColumns: ["parcel_id"]
          },
        ]
      }
      parcels: {
        Row: {
          area_hectares: number | null
          company_id: string | null
          created_at: string | null
          farm: string | null
          irrigation_type_v2: Database["public"]["Enums"]["tipo_riego"] | null
          materia_organica_pct: number | null
          parcel_id: string
          parcel_number: string | null
          ph_suelo: number | null
          status: Database["public"]["Enums"]["estado_parcela"] | null
          tipo_suelo: Database["public"]["Enums"]["tipo_suelo"] | null
          ultima_analisis_suelo: string | null
        }
        Insert: {
          area_hectares?: number | null
          company_id?: string | null
          created_at?: string | null
          farm?: string | null
          irrigation_type_v2?: Database["public"]["Enums"]["tipo_riego"] | null
          materia_organica_pct?: number | null
          parcel_id: string
          parcel_number?: string | null
          ph_suelo?: number | null
          status?: Database["public"]["Enums"]["estado_parcela"] | null
          tipo_suelo?: Database["public"]["Enums"]["tipo_suelo"] | null
          ultima_analisis_suelo?: string | null
        }
        Update: {
          area_hectares?: number | null
          company_id?: string | null
          created_at?: string | null
          farm?: string | null
          irrigation_type_v2?: Database["public"]["Enums"]["tipo_riego"] | null
          materia_organica_pct?: number | null
          parcel_id?: string
          parcel_number?: string | null
          ph_suelo?: number | null
          status?: Database["public"]["Enums"]["estado_parcela"] | null
          tipo_suelo?: Database["public"]["Enums"]["tipo_suelo"] | null
          ultima_analisis_suelo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "parcels_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      parte_enc_alerta_outbox: {
        Row: {
          company_id: string
          created_at: string | null
          estado: string
          gravedad: string
          id: string
          incidencia_id: string
          payload: Json
        }
        Insert: {
          company_id: string
          created_at?: string | null
          estado?: string
          gravedad: string
          id?: string
          incidencia_id: string
          payload: Json
        }
        Update: {
          company_id?: string
          created_at?: string | null
          estado?: string
          gravedad?: string
          id?: string
          incidencia_id?: string
          payload?: Json
        }
        Relationships: [
          {
            foreignKeyName: "parte_enc_alerta_outbox_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parte_enc_alerta_outbox_incidencia_id_fkey"
            columns: ["incidencia_id"]
            isOneToOne: false
            referencedRelation: "parte_enc_incidencia"
            referencedColumns: ["id"]
          },
        ]
      }
      parte_enc_cambio_personal: {
        Row: {
          company_id: string
          created_at: string | null
          decidido_por: string
          fecha: string
          id: string
          justificacion: string
          numero_empleado: string
          reportado_por: string
          tarea_destino_id: string | null
          tarea_origen_id: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          decidido_por: string
          fecha: string
          id?: string
          justificacion: string
          numero_empleado: string
          reportado_por: string
          tarea_destino_id?: string | null
          tarea_origen_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          decidido_por?: string
          fecha?: string
          id?: string
          justificacion?: string
          numero_empleado?: string
          reportado_por?: string
          tarea_destino_id?: string | null
          tarea_origen_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "parte_enc_cambio_personal_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parte_enc_cambio_personal_tarea_destino_id_fkey"
            columns: ["tarea_destino_id"]
            isOneToOne: false
            referencedRelation: "parte_enc_tarea_dia"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parte_enc_cambio_personal_tarea_origen_id_fkey"
            columns: ["tarea_origen_id"]
            isOneToOne: false
            referencedRelation: "parte_enc_tarea_dia"
            referencedColumns: ["id"]
          },
        ]
      }
      parte_enc_cierre_escalado: {
        Row: {
          company_id: string
          created_at: string | null
          estado: string
          fecha: string
          id: string
          iniciado_por: string
          nivel: string
          notas: string | null
          payload_resumen: Json | null
          revisado_por: string | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          estado?: string
          fecha: string
          id?: string
          iniciado_por: string
          nivel: string
          notas?: string | null
          payload_resumen?: Json | null
          revisado_por?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          estado?: string
          fecha?: string
          id?: string
          iniciado_por?: string
          nivel?: string
          notas?: string | null
          payload_resumen?: Json | null
          revisado_por?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "parte_enc_cierre_escalado_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      parte_enc_incidencia: {
        Row: {
          alerta_registrada: boolean | null
          alerta_timestamp: string | null
          company_id: string
          created_at: string | null
          decidido_por: string | null
          descripcion: string
          fecha: string
          finca: string | null
          foto_url: string | null
          gravedad: string
          id: string
          latitud: number | null
          longitud: number | null
          reportado_por: string
          sector: string | null
          tarea_id: string | null
          tipo: string
        }
        Insert: {
          alerta_registrada?: boolean | null
          alerta_timestamp?: string | null
          company_id: string
          created_at?: string | null
          decidido_por?: string | null
          descripcion: string
          fecha: string
          finca?: string | null
          foto_url?: string | null
          gravedad: string
          id?: string
          latitud?: number | null
          longitud?: number | null
          reportado_por: string
          sector?: string | null
          tarea_id?: string | null
          tipo: string
        }
        Update: {
          alerta_registrada?: boolean | null
          alerta_timestamp?: string | null
          company_id?: string
          created_at?: string | null
          decidido_por?: string | null
          descripcion?: string
          fecha?: string
          finca?: string | null
          foto_url?: string | null
          gravedad?: string
          id?: string
          latitud?: number | null
          longitud?: number | null
          reportado_por?: string
          sector?: string | null
          tarea_id?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "parte_enc_incidencia_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parte_enc_incidencia_tarea_id_fkey"
            columns: ["tarea_id"]
            isOneToOne: false
            referencedRelation: "parte_enc_tarea_dia"
            referencedColumns: ["id"]
          },
        ]
      }
      parte_enc_maquinaria_cierre: {
        Row: {
          cerrado_por: string
          company_id: string
          created_at: string | null
          descripcion_maquinaria: string | null
          estado_cierre: string
          fecha: string
          id: string
          maquinaria_id: string | null
          notas: string | null
        }
        Insert: {
          cerrado_por: string
          company_id: string
          created_at?: string | null
          descripcion_maquinaria?: string | null
          estado_cierre: string
          fecha: string
          id?: string
          maquinaria_id?: string | null
          notas?: string | null
        }
        Update: {
          cerrado_por?: string
          company_id?: string
          created_at?: string | null
          descripcion_maquinaria?: string | null
          estado_cierre?: string
          fecha?: string
          id?: string
          maquinaria_id?: string | null
          notas?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "parte_enc_maquinaria_cierre_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parte_enc_maquinaria_cierre_maquinaria_id_fkey"
            columns: ["maquinaria_id"]
            isOneToOne: false
            referencedRelation: "maquinaria_tractores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parte_enc_maquinaria_cierre_maquinaria_id_fkey"
            columns: ["maquinaria_id"]
            isOneToOne: false
            referencedRelation: "v_inventario_activos_en_ubicacion"
            referencedColumns: ["tractor_id"]
          },
          {
            foreignKeyName: "parte_enc_maquinaria_cierre_maquinaria_id_fkey"
            columns: ["maquinaria_id"]
            isOneToOne: false
            referencedRelation: "v_tractores_en_inventario"
            referencedColumns: ["tractor_id"]
          },
        ]
      }
      parte_enc_plan_confirmacion: {
        Row: {
          company_id: string
          confirmado_at: string
          fecha: string
          id: string
          user_id: string
        }
        Insert: {
          company_id: string
          confirmado_at?: string
          fecha: string
          id?: string
          user_id: string
        }
        Update: {
          company_id?: string
          confirmado_at?: string
          fecha?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "parte_enc_plan_confirmacion_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      parte_enc_tarea_dia: {
        Row: {
          apero_descripcion: string | null
          asignado_a_rol: string
          company_id: string
          created_at: string | null
          created_by: string | null
          descripcion: string | null
          estado: string
          fecha: string
          finca: string
          hora_fin: string | null
          hora_inicio: string | null
          id: string
          maquinaria_id: string | null
          orden: number | null
          output_cantidad: number | null
          output_notas: string | null
          output_unidad: string | null
          personal_asignado: string[] | null
          sector: string | null
          tipo: string
          titulo: string
          trabajo_registro_id: string | null
          updated_at: string | null
        }
        Insert: {
          apero_descripcion?: string | null
          asignado_a_rol: string
          company_id: string
          created_at?: string | null
          created_by?: string | null
          descripcion?: string | null
          estado?: string
          fecha: string
          finca: string
          hora_fin?: string | null
          hora_inicio?: string | null
          id?: string
          maquinaria_id?: string | null
          orden?: number | null
          output_cantidad?: number | null
          output_notas?: string | null
          output_unidad?: string | null
          personal_asignado?: string[] | null
          sector?: string | null
          tipo: string
          titulo: string
          trabajo_registro_id?: string | null
          updated_at?: string | null
        }
        Update: {
          apero_descripcion?: string | null
          asignado_a_rol?: string
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          descripcion?: string | null
          estado?: string
          fecha?: string
          finca?: string
          hora_fin?: string | null
          hora_inicio?: string | null
          id?: string
          maquinaria_id?: string | null
          orden?: number | null
          output_cantidad?: number | null
          output_notas?: string | null
          output_unidad?: string | null
          personal_asignado?: string[] | null
          sector?: string | null
          tipo?: string
          titulo?: string
          trabajo_registro_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "parte_enc_tarea_dia_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parte_enc_tarea_dia_maquinaria_id_fkey"
            columns: ["maquinaria_id"]
            isOneToOne: false
            referencedRelation: "maquinaria_tractores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parte_enc_tarea_dia_maquinaria_id_fkey"
            columns: ["maquinaria_id"]
            isOneToOne: false
            referencedRelation: "v_inventario_activos_en_ubicacion"
            referencedColumns: ["tractor_id"]
          },
          {
            foreignKeyName: "parte_enc_tarea_dia_maquinaria_id_fkey"
            columns: ["maquinaria_id"]
            isOneToOne: false
            referencedRelation: "v_tractores_en_inventario"
            referencedColumns: ["tractor_id"]
          },
          {
            foreignKeyName: "parte_enc_tarea_dia_trabajo_registro_id_fkey"
            columns: ["trabajo_registro_id"]
            isOneToOne: false
            referencedRelation: "trabajos_registro"
            referencedColumns: ["id"]
          },
        ]
      }
      parte_estado_finca: {
        Row: {
          company_id: string | null
          created_at: string | null
          estado: string | null
          finca: string | null
          foto_url: string | null
          foto_url_2: string | null
          id: string
          nombres_operarios: string | null
          notas: string | null
          num_operarios: number | null
          parcel_id: string | null
          parte_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          estado?: string | null
          finca?: string | null
          foto_url?: string | null
          foto_url_2?: string | null
          id?: string
          nombres_operarios?: string | null
          notas?: string | null
          num_operarios?: number | null
          parcel_id?: string | null
          parte_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          estado?: string | null
          finca?: string | null
          foto_url?: string | null
          foto_url_2?: string | null
          id?: string
          nombres_operarios?: string | null
          notas?: string | null
          num_operarios?: number | null
          parcel_id?: string | null
          parte_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "parte_estado_finca_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parte_estado_finca_parte_id_fkey"
            columns: ["parte_id"]
            isOneToOne: false
            referencedRelation: "partes_diarios"
            referencedColumns: ["id"]
          },
        ]
      }
      parte_personal: {
        Row: {
          company_id: string | null
          con_quien: string | null
          created_at: string | null
          donde: string | null
          fecha_hora: string | null
          foto_url: string | null
          id: string
          parte_id: string
          texto: string | null
        }
        Insert: {
          company_id?: string | null
          con_quien?: string | null
          created_at?: string | null
          donde?: string | null
          fecha_hora?: string | null
          foto_url?: string | null
          id?: string
          parte_id: string
          texto?: string | null
        }
        Update: {
          company_id?: string | null
          con_quien?: string | null
          created_at?: string | null
          donde?: string | null
          fecha_hora?: string | null
          foto_url?: string | null
          id?: string
          parte_id?: string
          texto?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "parte_personal_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parte_personal_parte_id_fkey"
            columns: ["parte_id"]
            isOneToOne: false
            referencedRelation: "partes_diarios"
            referencedColumns: ["id"]
          },
        ]
      }
      parte_residuos_vegetales: {
        Row: {
          company_id: string | null
          created_at: string | null
          foto_url: string | null
          ganadero_id: string | null
          hora_llegada_ganadero: string | null
          hora_regreso_nave: string | null
          hora_salida_nave: string | null
          id: string
          nombre_conductor: string | null
          nombre_ganadero: string | null
          notas_descarga: string | null
          parte_id: string
          personal_id: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          foto_url?: string | null
          ganadero_id?: string | null
          hora_llegada_ganadero?: string | null
          hora_regreso_nave?: string | null
          hora_salida_nave?: string | null
          id?: string
          nombre_conductor?: string | null
          nombre_ganadero?: string | null
          notas_descarga?: string | null
          parte_id: string
          personal_id?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          foto_url?: string | null
          ganadero_id?: string | null
          hora_llegada_ganadero?: string | null
          hora_regreso_nave?: string | null
          hora_salida_nave?: string | null
          id?: string
          nombre_conductor?: string | null
          nombre_ganadero?: string | null
          notas_descarga?: string | null
          parte_id?: string
          personal_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "parte_residuos_vegetales_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parte_residuos_vegetales_ganadero_id_fkey"
            columns: ["ganadero_id"]
            isOneToOne: false
            referencedRelation: "ganaderos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parte_residuos_vegetales_parte_id_fkey"
            columns: ["parte_id"]
            isOneToOne: false
            referencedRelation: "partes_diarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parte_residuos_vegetales_personal_id_fkey"
            columns: ["personal_id"]
            isOneToOne: false
            referencedRelation: "personal"
            referencedColumns: ["id"]
          },
        ]
      }
      parte_trabajo: {
        Row: {
          ambito: string | null
          company_id: string | null
          created_at: string | null
          finca: string | null
          foto_url: string | null
          foto_url_2: string | null
          hora_fin: string | null
          hora_inicio: string | null
          id: string
          nombres_operarios: string | null
          notas: string | null
          num_operarios: number | null
          parcelas: string[] | null
          parte_id: string
          tipo_trabajo: string | null
        }
        Insert: {
          ambito?: string | null
          company_id?: string | null
          created_at?: string | null
          finca?: string | null
          foto_url?: string | null
          foto_url_2?: string | null
          hora_fin?: string | null
          hora_inicio?: string | null
          id?: string
          nombres_operarios?: string | null
          notas?: string | null
          num_operarios?: number | null
          parcelas?: string[] | null
          parte_id: string
          tipo_trabajo?: string | null
        }
        Update: {
          ambito?: string | null
          company_id?: string | null
          created_at?: string | null
          finca?: string | null
          foto_url?: string | null
          foto_url_2?: string | null
          hora_fin?: string | null
          hora_inicio?: string | null
          id?: string
          nombres_operarios?: string | null
          notas?: string | null
          num_operarios?: number | null
          parcelas?: string[] | null
          parte_id?: string
          tipo_trabajo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "parte_trabajo_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parte_trabajo_parte_id_fkey"
            columns: ["parte_id"]
            isOneToOne: false
            referencedRelation: "partes_diarios"
            referencedColumns: ["id"]
          },
        ]
      }
      partes_diarios: {
        Row: {
          company_id: string | null
          created_at: string | null
          fecha: string
          id: string
          notas_generales: string | null
          responsable: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          fecha: string
          id?: string
          notas_generales?: string | null
          responsable?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          fecha?: string
          id?: string
          notas_generales?: string | null
          responsable?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partes_diarios_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      personal: {
        Row: {
          activo: boolean | null
          carnet_caducidad: string | null
          carnet_tipo: string | null
          categoria: string | null
          codigo_interno: string | null
          company_id: string | null
          created_at: string | null
          created_by: string | null
          dni: string | null
          fecha_alta: string | null
          finca_asignada: string | null
          foto_url: string | null
          id: string
          licencias: string | null
          nombre: string
          notas: string | null
          qr_code: string | null
          tacografo: boolean | null
          telefono: string | null
        }
        Insert: {
          activo?: boolean | null
          carnet_caducidad?: string | null
          carnet_tipo?: string | null
          categoria?: string | null
          codigo_interno?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          dni?: string | null
          fecha_alta?: string | null
          finca_asignada?: string | null
          foto_url?: string | null
          id?: string
          licencias?: string | null
          nombre: string
          notas?: string | null
          qr_code?: string | null
          tacografo?: boolean | null
          telefono?: string | null
        }
        Update: {
          activo?: boolean | null
          carnet_caducidad?: string | null
          carnet_tipo?: string | null
          categoria?: string | null
          codigo_interno?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          dni?: string | null
          fecha_alta?: string | null
          finca_asignada?: string | null
          foto_url?: string | null
          id?: string
          licencias?: string | null
          nombre?: string
          notas?: string | null
          qr_code?: string | null
          tacografo?: boolean | null
          telefono?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "personal_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      personal_externo: {
        Row: {
          activo: boolean | null
          company_id: string | null
          created_at: string | null
          created_by: string | null
          id: string
          nif: string | null
          nombre_empresa: string
          notas: string | null
          qr_code: string | null
          telefono_contacto: string | null
          tipo: string | null
        }
        Insert: {
          activo?: boolean | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          nif?: string | null
          nombre_empresa: string
          notas?: string | null
          qr_code?: string | null
          telefono_contacto?: string | null
          tipo?: string | null
        }
        Update: {
          activo?: boolean | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          nif?: string | null
          nombre_empresa?: string
          notas?: string | null
          qr_code?: string | null
          telefono_contacto?: string | null
          tipo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "personal_externo_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      personal_tipos_trabajo: {
        Row: {
          company_id: string | null
          created_at: string | null
          id: string
          personal_id: string
          tipo_trabajo_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          personal_id: string
          tipo_trabajo_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          personal_id?: string
          tipo_trabajo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "personal_tipos_trabajo_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personal_tipos_trabajo_personal_id_fkey"
            columns: ["personal_id"]
            isOneToOne: false
            referencedRelation: "personal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personal_tipos_trabajo_tipo_trabajo_id_fkey"
            columns: ["tipo_trabajo_id"]
            isOneToOne: false
            referencedRelation: "catalogo_tipos_trabajo"
            referencedColumns: ["id"]
          },
        ]
      }
      pilot_config: {
        Row: {
          fallback_enabled: boolean
          singleton: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          fallback_enabled?: boolean
          singleton?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          fallback_enabled?: boolean
          singleton?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      pilot_fallback_log: {
        Row: {
          action: string
          actor_user_id: string
          company_id: string
          created_at: string
          id: string
          record_id: string
          table_name: string
        }
        Insert: {
          action: string
          actor_user_id: string
          company_id: string
          created_at?: string
          id?: string
          record_id: string
          table_name: string
        }
        Update: {
          action?: string
          actor_user_id?: string
          company_id?: string
          created_at?: string
          id?: string
          record_id?: string
          table_name?: string
        }
        Relationships: []
      }
      pilot_fallback_table_allowlist: {
        Row: {
          created_at: string
          enabled: boolean
          table_name: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          table_name: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          table_name?: string
        }
        Relationships: []
      }
      pilot_fallback_user_allowlist: {
        Row: {
          created_at: string
          enabled: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          user_id?: string
        }
        Relationships: []
      }
      planificacion_campana: {
        Row: {
          company_id: string | null
          created_at: string | null
          created_by: string | null
          cultivo: string
          estado: string
          fecha_estimada_cosecha: string | null
          fecha_prevista_plantacion: string | null
          finca: string
          id: string
          observaciones: string | null
          parcel_id: string | null
          recursos_estimados: string | null
          superficie_m2: number | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          cultivo: string
          estado?: string
          fecha_estimada_cosecha?: string | null
          fecha_prevista_plantacion?: string | null
          finca: string
          id?: string
          observaciones?: string | null
          parcel_id?: string | null
          recursos_estimados?: string | null
          superficie_m2?: number | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          cultivo?: string
          estado?: string
          fecha_estimada_cosecha?: string | null
          fecha_prevista_plantacion?: string | null
          finca?: string
          id?: string
          observaciones?: string | null
          parcel_id?: string | null
          recursos_estimados?: string | null
          superficie_m2?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "planificacion_campana_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planificacion_campana_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: false
            referencedRelation: "parcels"
            referencedColumns: ["parcel_id"]
          },
        ]
      }
      plantaciones_transformadas: {
        Row: {
          bandejas: string | null
          ciclo_real: string | null
          ciclo_teorico: string | null
          codigo_cultivo: string | null
          cultivo_id: string | null
          fecha_plantacion: string | null
          finca_normalizada: string | null
          lote: string | null
          marco_plantacion: string | null
          municipio: string | null
          num_plantas: string | null
          numero_albaran: string | null
          observaciones: string | null
          parcel_id: string | null
          parcela_catastral: string | null
          poligono: string | null
          prevision_recolection: string | null
          primera_oportunidad_cosecha: string | null
          producto: string | null
          productor: string | null
          recinto: string | null
          recoleccion_real: string | null
          rendimiento_real: string | null
          rendimiento_teorico: string | null
          sector_original: string | null
          sem_oportunidad_cosecha: string | null
          semillero: string | null
          superficie_m2: string | null
          tipo: string | null
          tipo_match: string | null
          variedad: string | null
        }
        Insert: {
          bandejas?: string | null
          ciclo_real?: string | null
          ciclo_teorico?: string | null
          codigo_cultivo?: string | null
          cultivo_id?: string | null
          fecha_plantacion?: string | null
          finca_normalizada?: string | null
          lote?: string | null
          marco_plantacion?: string | null
          municipio?: string | null
          num_plantas?: string | null
          numero_albaran?: string | null
          observaciones?: string | null
          parcel_id?: string | null
          parcela_catastral?: string | null
          poligono?: string | null
          prevision_recolection?: string | null
          primera_oportunidad_cosecha?: string | null
          producto?: string | null
          productor?: string | null
          recinto?: string | null
          recoleccion_real?: string | null
          rendimiento_real?: string | null
          rendimiento_teorico?: string | null
          sector_original?: string | null
          sem_oportunidad_cosecha?: string | null
          semillero?: string | null
          superficie_m2?: string | null
          tipo?: string | null
          tipo_match?: string | null
          variedad?: string | null
        }
        Update: {
          bandejas?: string | null
          ciclo_real?: string | null
          ciclo_teorico?: string | null
          codigo_cultivo?: string | null
          cultivo_id?: string | null
          fecha_plantacion?: string | null
          finca_normalizada?: string | null
          lote?: string | null
          marco_plantacion?: string | null
          municipio?: string | null
          num_plantas?: string | null
          numero_albaran?: string | null
          observaciones?: string | null
          parcel_id?: string | null
          parcela_catastral?: string | null
          poligono?: string | null
          prevision_recolection?: string | null
          primera_oportunidad_cosecha?: string | null
          producto?: string | null
          productor?: string | null
          recinto?: string | null
          recoleccion_real?: string | null
          rendimiento_real?: string | null
          rendimiento_teorico?: string | null
          sector_original?: string | null
          sem_oportunidad_cosecha?: string | null
          semillero?: string | null
          superficie_m2?: string | null
          tipo?: string | null
          tipo_match?: string | null
          variedad?: string | null
        }
        Relationships: []
      }
      plantings: {
        Row: {
          company_id: string | null
          created_at: string | null
          crop: string | null
          date: string | null
          fecha_cosecha_estimada: string | null
          id: string
          lote_semilla: string | null
          marco_cm_entre_lineas: number | null
          marco_cm_entre_plantas: number | null
          notes: string | null
          num_plantas_real: number | null
          parcel_id: string | null
          proveedor_semilla: string | null
          sistema_riego: Database["public"]["Enums"]["tipo_riego"] | null
          variedad: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          crop?: string | null
          date?: string | null
          fecha_cosecha_estimada?: string | null
          id?: string
          lote_semilla?: string | null
          marco_cm_entre_lineas?: number | null
          marco_cm_entre_plantas?: number | null
          notes?: string | null
          num_plantas_real?: number | null
          parcel_id?: string | null
          proveedor_semilla?: string | null
          sistema_riego?: Database["public"]["Enums"]["tipo_riego"] | null
          variedad?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          crop?: string | null
          date?: string | null
          fecha_cosecha_estimada?: string | null
          id?: string
          lote_semilla?: string | null
          marco_cm_entre_lineas?: number | null
          marco_cm_entre_plantas?: number | null
          notes?: string | null
          num_plantas_real?: number | null
          parcel_id?: string | null
          proveedor_semilla?: string | null
          sistema_riego?: Database["public"]["Enums"]["tipo_riego"] | null
          variedad?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plantings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plantings_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: false
            referencedRelation: "parcels"
            referencedColumns: ["parcel_id"]
          },
        ]
      }
      presencia_tiempo_real: {
        Row: {
          activo: boolean | null
          company_id: string | null
          created_at: string | null
          cuadrilla_id: string
          hora_entrada: string
          hora_salida: string | null
          id: string
          parcel_id: string | null
          work_record_id: string | null
        }
        Insert: {
          activo?: boolean | null
          company_id?: string | null
          created_at?: string | null
          cuadrilla_id: string
          hora_entrada?: string
          hora_salida?: string | null
          id?: string
          parcel_id?: string | null
          work_record_id?: string | null
        }
        Update: {
          activo?: boolean | null
          company_id?: string | null
          created_at?: string | null
          cuadrilla_id?: string
          hora_entrada?: string
          hora_salida?: string | null
          id?: string
          parcel_id?: string | null
          work_record_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "presencia_tiempo_real_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presencia_tiempo_real_cuadrilla_id_fkey"
            columns: ["cuadrilla_id"]
            isOneToOne: false
            referencedRelation: "cuadrillas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presencia_tiempo_real_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: false
            referencedRelation: "parcels"
            referencedColumns: ["parcel_id"]
          },
          {
            foreignKeyName: "presencia_tiempo_real_work_record_id_fkey"
            columns: ["work_record_id"]
            isOneToOne: false
            referencedRelation: "work_records"
            referencedColumns: ["id"]
          },
        ]
      }
      proveedores: {
        Row: {
          activo: boolean | null
          codigo_interno: string | null
          company_id: string | null
          created_at: string | null
          created_by: string | null
          direccion: string | null
          email: string | null
          foto_url: string | null
          id: string
          nif: string | null
          nombre: string
          notas: string | null
          persona_contacto: string | null
          telefono: string | null
          tipo: string | null
        }
        Insert: {
          activo?: boolean | null
          codigo_interno?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          direccion?: string | null
          email?: string | null
          foto_url?: string | null
          id?: string
          nif?: string | null
          nombre: string
          notas?: string | null
          persona_contacto?: string | null
          telefono?: string | null
          tipo?: string | null
        }
        Update: {
          activo?: boolean | null
          codigo_interno?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          direccion?: string | null
          email?: string | null
          foto_url?: string | null
          id?: string
          nif?: string | null
          nombre?: string
          notas?: string | null
          persona_contacto?: string | null
          telefono?: string | null
          tipo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proveedores_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      proveedores_precios: {
        Row: {
          activo: boolean | null
          created_at: string | null
          fecha_vigencia: string | null
          id: string
          precio_unitario: number | null
          producto: string
          proveedor_id: string
          unidad: string | null
        }
        Insert: {
          activo?: boolean | null
          created_at?: string | null
          fecha_vigencia?: string | null
          id?: string
          precio_unitario?: number | null
          producto: string
          proveedor_id: string
          unidad?: string | null
        }
        Update: {
          activo?: boolean | null
          created_at?: string | null
          fecha_vigencia?: string | null
          id?: string
          precio_unitario?: number | null
          producto?: string
          proveedor_id?: string
          unidad?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proveedores_precios_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "proveedores"
            referencedColumns: ["id"]
          },
        ]
      }
      raw_plantaciones_csv: {
        Row: {
          " 1ª OPORTUNIDAD COSECHA": string | null
          " SEM 1ª OPORTUNIDAD COSECHA": string | null
          BANDEJAS: string | null
          "CICLO REAL": string | null
          "CICLO TEORICO": string | null
          "CÓDIGO CULTIVO": string | null
          DIFERENCIA: string | null
          Escandallo: string | null
          FECHA: string | null
          FINCA: string | null
          LOTE: string | null
          MARCO: string | null
          MUNICIPIO: string | null
          "Nº Plantas": string | null
          NºAlbarán: string | null
          OBSERVACIONES: string | null
          PARCELA: string | null
          POLIGONO: string | null
          "PREVISION RECOLECCION": string | null
          PRODUCTO: string | null
          PRODUCTOR: string | null
          RECINTO: string | null
          "RECO. REAL": string | null
          "REND. TEORICO": string | null
          "REND.REAL": string | null
          Sector: string | null
          SEM: string | null
          Semillero: string | null
          SUPERFICIE: string | null
          TIPO: string | null
          VARIEDAD: string | null
        }
        Insert: {
          " 1ª OPORTUNIDAD COSECHA"?: string | null
          " SEM 1ª OPORTUNIDAD COSECHA"?: string | null
          BANDEJAS?: string | null
          "CICLO REAL"?: string | null
          "CICLO TEORICO"?: string | null
          "CÓDIGO CULTIVO"?: string | null
          DIFERENCIA?: string | null
          Escandallo?: string | null
          FECHA?: string | null
          FINCA?: string | null
          LOTE?: string | null
          MARCO?: string | null
          MUNICIPIO?: string | null
          "Nº Plantas"?: string | null
          NºAlbarán?: string | null
          OBSERVACIONES?: string | null
          PARCELA?: string | null
          POLIGONO?: string | null
          "PREVISION RECOLECCION"?: string | null
          PRODUCTO?: string | null
          PRODUCTOR?: string | null
          RECINTO?: string | null
          "RECO. REAL"?: string | null
          "REND. TEORICO"?: string | null
          "REND.REAL"?: string | null
          Sector?: string | null
          SEM?: string | null
          Semillero?: string | null
          SUPERFICIE?: string | null
          TIPO?: string | null
          VARIEDAD?: string | null
        }
        Update: {
          " 1ª OPORTUNIDAD COSECHA"?: string | null
          " SEM 1ª OPORTUNIDAD COSECHA"?: string | null
          BANDEJAS?: string | null
          "CICLO REAL"?: string | null
          "CICLO TEORICO"?: string | null
          "CÓDIGO CULTIVO"?: string | null
          DIFERENCIA?: string | null
          Escandallo?: string | null
          FECHA?: string | null
          FINCA?: string | null
          LOTE?: string | null
          MARCO?: string | null
          MUNICIPIO?: string | null
          "Nº Plantas"?: string | null
          NºAlbarán?: string | null
          OBSERVACIONES?: string | null
          PARCELA?: string | null
          POLIGONO?: string | null
          "PREVISION RECOLECCION"?: string | null
          PRODUCTO?: string | null
          PRODUCTOR?: string | null
          RECINTO?: string | null
          "RECO. REAL"?: string | null
          "REND. TEORICO"?: string | null
          "REND.REAL"?: string | null
          Sector?: string | null
          SEM?: string | null
          Semillero?: string | null
          SUPERFICIE?: string | null
          TIPO?: string | null
          VARIEDAD?: string | null
        }
        Relationships: []
      }
      registros_estado_parcela: {
        Row: {
          company_id: string | null
          cultivo: string | null
          estado: string | null
          fecha: string | null
          foto_url: string | null
          id: string
          observaciones: string | null
          parcel_id: string | null
        }
        Insert: {
          company_id?: string | null
          cultivo?: string | null
          estado?: string | null
          fecha?: string | null
          foto_url?: string | null
          id?: string
          observaciones?: string | null
          parcel_id?: string | null
        }
        Update: {
          company_id?: string | null
          cultivo?: string | null
          estado?: string | null
          fecha?: string | null
          foto_url?: string | null
          id?: string
          observaciones?: string | null
          parcel_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "registros_estado_parcela_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_estado_parcela_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: false
            referencedRelation: "parcels"
            referencedColumns: ["parcel_id"]
          },
        ]
      }
      registros_riego: {
        Row: {
          company_id: string | null
          conductividad_entrada: number | null
          created_at: string | null
          duracion_minutos: number | null
          fecha: string | null
          id: string
          notas: string | null
          ph_entrada: number | null
          presion_bar: number | null
          volumen_m3: number | null
          zona_id: string | null
        }
        Insert: {
          company_id?: string | null
          conductividad_entrada?: number | null
          created_at?: string | null
          duracion_minutos?: number | null
          fecha?: string | null
          id?: string
          notas?: string | null
          ph_entrada?: number | null
          presion_bar?: number | null
          volumen_m3?: number | null
          zona_id?: string | null
        }
        Update: {
          company_id?: string | null
          conductividad_entrada?: number | null
          created_at?: string | null
          duracion_minutos?: number | null
          fecha?: string | null
          id?: string
          notas?: string | null
          ph_entrada?: number | null
          presion_bar?: number | null
          volumen_m3?: number | null
          zona_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "registros_riego_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_riego_zona_id_fkey"
            columns: ["zona_id"]
            isOneToOne: false
            referencedRelation: "sistema_riego_zonas"
            referencedColumns: ["id"]
          },
        ]
      }
      residuos_operacion: {
        Row: {
          company_id: string | null
          created_at: string | null
          fecha_instalacion: string | null
          fecha_retirada: string | null
          gestor_residuos: string | null
          id: string
          kg_instalados: number | null
          kg_retirados: number | null
          lote_material: string | null
          operacion_id: string | null
          parcel_id: string | null
          proveedor: string | null
          tipo_residuo: Database["public"]["Enums"]["tipo_residuo"]
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          fecha_instalacion?: string | null
          fecha_retirada?: string | null
          gestor_residuos?: string | null
          id?: string
          kg_instalados?: number | null
          kg_retirados?: number | null
          lote_material?: string | null
          operacion_id?: string | null
          parcel_id?: string | null
          proveedor?: string | null
          tipo_residuo: Database["public"]["Enums"]["tipo_residuo"]
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          fecha_instalacion?: string | null
          fecha_retirada?: string | null
          gestor_residuos?: string | null
          id?: string
          kg_instalados?: number | null
          kg_retirados?: number | null
          lote_material?: string | null
          operacion_id?: string | null
          parcel_id?: string | null
          proveedor?: string | null
          tipo_residuo?: Database["public"]["Enums"]["tipo_residuo"]
        }
        Relationships: [
          {
            foreignKeyName: "residuos_operacion_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "residuos_operacion_operacion_id_fkey"
            columns: ["operacion_id"]
            isOneToOne: false
            referencedRelation: "work_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "residuos_operacion_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: false
            referencedRelation: "parcels"
            referencedColumns: ["parcel_id"]
          },
        ]
      }
      sistema_riego_zonas: {
        Row: {
          activa: boolean | null
          caudal_lh: number | null
          company_id: string | null
          created_at: string | null
          goteros_por_planta: number | null
          id: string
          nombre_zona: string | null
          parcel_id: string | null
          superficie_ha: number | null
          tipo_riego: Database["public"]["Enums"]["tipo_riego"] | null
        }
        Insert: {
          activa?: boolean | null
          caudal_lh?: number | null
          company_id?: string | null
          created_at?: string | null
          goteros_por_planta?: number | null
          id?: string
          nombre_zona?: string | null
          parcel_id?: string | null
          superficie_ha?: number | null
          tipo_riego?: Database["public"]["Enums"]["tipo_riego"] | null
        }
        Update: {
          activa?: boolean | null
          caudal_lh?: number | null
          company_id?: string | null
          created_at?: string | null
          goteros_por_planta?: number | null
          id?: string
          nombre_zona?: string | null
          parcel_id?: string | null
          superficie_ha?: number | null
          tipo_riego?: Database["public"]["Enums"]["tipo_riego"] | null
        }
        Relationships: [
          {
            foreignKeyName: "sistema_riego_zonas_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sistema_riego_zonas_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: false
            referencedRelation: "parcels"
            referencedColumns: ["parcel_id"]
          },
        ]
      }
      tickets_pesaje: {
        Row: {
          camion_id: string | null
          company_id: string | null
          conductor: string | null
          created_at: string | null
          destino: string
          harvest_id: string | null
          hora_salida: string | null
          id: string
          matricula_manual: string | null
          numero_albaran: string | null
          observaciones: string | null
          peso_bruto_kg: number
          peso_neto_kg: number | null
          peso_tara_kg: number
        }
        Insert: {
          camion_id?: string | null
          company_id?: string | null
          conductor?: string | null
          created_at?: string | null
          destino: string
          harvest_id?: string | null
          hora_salida?: string | null
          id?: string
          matricula_manual?: string | null
          numero_albaran?: string | null
          observaciones?: string | null
          peso_bruto_kg: number
          peso_neto_kg?: number | null
          peso_tara_kg?: number
        }
        Update: {
          camion_id?: string | null
          company_id?: string | null
          conductor?: string | null
          created_at?: string | null
          destino?: string
          harvest_id?: string | null
          hora_salida?: string | null
          id?: string
          matricula_manual?: string | null
          numero_albaran?: string | null
          observaciones?: string | null
          peso_bruto_kg?: number
          peso_neto_kg?: number | null
          peso_tara_kg?: number
        }
        Relationships: [
          {
            foreignKeyName: "tickets_pesaje_camion_id_fkey"
            columns: ["camion_id"]
            isOneToOne: false
            referencedRelation: "camiones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_pesaje_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_pesaje_harvest_id_fkey"
            columns: ["harvest_id"]
            isOneToOne: false
            referencedRelation: "harvests"
            referencedColumns: ["id"]
          },
        ]
      }
      trabajos_coste_snapshot: {
        Row: {
          apero_id: string | null
          calculado_en: string
          calculado_por: string | null
          coste_mano_obra: number
          coste_maquinaria: number
          coste_materiales: number
          coste_por_kg: number | null
          coste_total: number | null
          horas: number
          id: string
          lineas_materiales: Json
          num_operarios: number
          produccion_kg_total: number | null
          produccion_vinculada: Json
          tarifa_operario_eur_h: number
          tarifa_tractor_eur_h: number
          trabajo_id: string | null
          tractor_id: string | null
          version_calculo: number
        }
        Insert: {
          apero_id?: string | null
          calculado_en?: string
          calculado_por?: string | null
          coste_mano_obra?: number
          coste_maquinaria?: number
          coste_materiales?: number
          coste_por_kg?: number | null
          coste_total?: number | null
          horas?: number
          id?: string
          lineas_materiales?: Json
          num_operarios?: number
          produccion_kg_total?: number | null
          produccion_vinculada?: Json
          tarifa_operario_eur_h?: number
          tarifa_tractor_eur_h?: number
          trabajo_id?: string | null
          tractor_id?: string | null
          version_calculo?: number
        }
        Update: {
          apero_id?: string | null
          calculado_en?: string
          calculado_por?: string | null
          coste_mano_obra?: number
          coste_maquinaria?: number
          coste_materiales?: number
          coste_por_kg?: number | null
          coste_total?: number | null
          horas?: number
          id?: string
          lineas_materiales?: Json
          num_operarios?: number
          produccion_kg_total?: number | null
          produccion_vinculada?: Json
          tarifa_operario_eur_h?: number
          tarifa_tractor_eur_h?: number
          trabajo_id?: string | null
          tractor_id?: string | null
          version_calculo?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_snapshot_trabajo"
            columns: ["trabajo_id"]
            isOneToOne: false
            referencedRelation: "trabajos_registro"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trabajos_coste_snapshot_trabajo_id_fkey"
            columns: ["trabajo_id"]
            isOneToOne: false
            referencedRelation: "trabajos_registro"
            referencedColumns: ["id"]
          },
        ]
      }
      trabajos_incidencias: {
        Row: {
          company_id: string | null
          created_at: string | null
          created_by: string | null
          descripcion: string | null
          estado: string | null
          fecha: string | null
          fecha_resolucion: string | null
          finca: string | null
          foto_url: string | null
          id: string
          notas_resolucion: string | null
          parcel_id: string | null
          titulo: string
          urgente: boolean | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          descripcion?: string | null
          estado?: string | null
          fecha?: string | null
          fecha_resolucion?: string | null
          finca?: string | null
          foto_url?: string | null
          id?: string
          notas_resolucion?: string | null
          parcel_id?: string | null
          titulo: string
          urgente?: boolean | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          descripcion?: string | null
          estado?: string | null
          fecha?: string | null
          fecha_resolucion?: string | null
          finca?: string | null
          foto_url?: string | null
          id?: string
          notas_resolucion?: string | null
          parcel_id?: string | null
          titulo?: string
          urgente?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "trabajos_incidencias_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      trabajos_registro: {
        Row: {
          apero_id: string | null
          company_id: string | null
          created_at: string | null
          created_by: string | null
          estado_planificacion: string | null
          fecha: string | null
          fecha_original: string | null
          fecha_planificada: string | null
          finca: string | null
          foto_url: string | null
          hora_fin: string | null
          hora_inicio: string | null
          id: string
          materiales_previstos: Json | null
          nombres_operarios: string | null
          notas: string | null
          num_operarios: number | null
          parcel_id: string | null
          prioridad: string | null
          recursos_personal: string[] | null
          tipo_bloque: string
          tipo_trabajo: string
          tractor_id: string | null
        }
        Insert: {
          apero_id?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          estado_planificacion?: string | null
          fecha?: string | null
          fecha_original?: string | null
          fecha_planificada?: string | null
          finca?: string | null
          foto_url?: string | null
          hora_fin?: string | null
          hora_inicio?: string | null
          id?: string
          materiales_previstos?: Json | null
          nombres_operarios?: string | null
          notas?: string | null
          num_operarios?: number | null
          parcel_id?: string | null
          prioridad?: string | null
          recursos_personal?: string[] | null
          tipo_bloque: string
          tipo_trabajo: string
          tractor_id?: string | null
        }
        Update: {
          apero_id?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          estado_planificacion?: string | null
          fecha?: string | null
          fecha_original?: string | null
          fecha_planificada?: string | null
          finca?: string | null
          foto_url?: string | null
          hora_fin?: string | null
          hora_inicio?: string | null
          id?: string
          materiales_previstos?: Json | null
          nombres_operarios?: string | null
          notas?: string | null
          num_operarios?: number | null
          parcel_id?: string | null
          prioridad?: string | null
          recursos_personal?: string[] | null
          tipo_bloque?: string
          tipo_trabajo?: string
          tractor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trabajos_registro_apero_id_fkey"
            columns: ["apero_id"]
            isOneToOne: false
            referencedRelation: "maquinaria_aperos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trabajos_registro_apero_id_fkey"
            columns: ["apero_id"]
            isOneToOne: false
            referencedRelation: "v_inventario_activos_en_ubicacion"
            referencedColumns: ["apero_id"]
          },
          {
            foreignKeyName: "trabajos_registro_apero_id_fkey"
            columns: ["apero_id"]
            isOneToOne: false
            referencedRelation: "v_maquinaria_aperos_en_inventario"
            referencedColumns: ["apero_id"]
          },
          {
            foreignKeyName: "trabajos_registro_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trabajos_registro_tractor_id_fkey"
            columns: ["tractor_id"]
            isOneToOne: false
            referencedRelation: "maquinaria_tractores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trabajos_registro_tractor_id_fkey"
            columns: ["tractor_id"]
            isOneToOne: false
            referencedRelation: "v_inventario_activos_en_ubicacion"
            referencedColumns: ["tractor_id"]
          },
          {
            foreignKeyName: "trabajos_registro_tractor_id_fkey"
            columns: ["tractor_id"]
            isOneToOne: false
            referencedRelation: "v_tractores_en_inventario"
            referencedColumns: ["tractor_id"]
          },
        ]
      }
      trazabilidad_registros: {
        Row: {
          company_id: string | null
          created_at: string | null
          created_by: string | null
          datos: Json | null
          id: string
          referencia_id: string | null
          tipo: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          datos?: Json | null
          id?: string
          referencia_id?: string | null
          tipo?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          datos?: Json | null
          id?: string
          referencia_id?: string | null
          tipo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trazabilidad_registros_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          company_id: string | null
          created_at: string | null
          email: string | null
          fincas_permitidas: string[] | null
          full_name: string | null
          id: string
          rol_encargado: string | null
          role: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          email?: string | null
          fincas_permitidas?: string[] | null
          full_name?: string | null
          id: string
          rol_encargado?: string | null
          role?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          email?: string | null
          fincas_permitidas?: string[] | null
          full_name?: string | null
          id?: string
          rol_encargado?: string | null
          role?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      usuario_roles: {
        Row: {
          created_at: string | null
          descripcion: string | null
          id: string
          nombre: string
          permisos: Json | null
        }
        Insert: {
          created_at?: string | null
          descripcion?: string | null
          id?: string
          nombre: string
          permisos?: Json | null
        }
        Update: {
          created_at?: string | null
          descripcion?: string | null
          id?: string
          nombre?: string
          permisos?: Json | null
        }
        Relationships: []
      }
      vehicle_positions: {
        Row: {
          company_id: string | null
          heading: number | null
          id: string
          latitude: number | null
          longitude: number | null
          recorded_at: string | null
          speed: number | null
          timestamp: string | null
          vehicle_id: string | null
          vehicle_type: string | null
        }
        Insert: {
          company_id?: string | null
          heading?: number | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          recorded_at?: string | null
          speed?: number | null
          timestamp?: string | null
          vehicle_id?: string | null
          vehicle_type?: string | null
        }
        Update: {
          company_id?: string | null
          heading?: number | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          recorded_at?: string | null
          speed?: number | null
          timestamp?: string | null
          vehicle_id?: string | null
          vehicle_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_positions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      vehiculos_empresa: {
        Row: {
          anio: number | null
          codigo_interno: string | null
          company_id: string | null
          conductor_habitual_id: string | null
          created_at: string | null
          created_by: string | null
          estado_operativo: string | null
          fecha_proxima_itv: string | null
          fecha_proxima_revision: string | null
          foto_url: string | null
          gps_info: string | null
          id: string
          km_actuales: number | null
          marca: string | null
          matricula: string
          modelo: string | null
          notas: string | null
          tipo: string | null
        }
        Insert: {
          anio?: number | null
          codigo_interno?: string | null
          company_id?: string | null
          conductor_habitual_id?: string | null
          created_at?: string | null
          created_by?: string | null
          estado_operativo?: string | null
          fecha_proxima_itv?: string | null
          fecha_proxima_revision?: string | null
          foto_url?: string | null
          gps_info?: string | null
          id?: string
          km_actuales?: number | null
          marca?: string | null
          matricula: string
          modelo?: string | null
          notas?: string | null
          tipo?: string | null
        }
        Update: {
          anio?: number | null
          codigo_interno?: string | null
          company_id?: string | null
          conductor_habitual_id?: string | null
          created_at?: string | null
          created_by?: string | null
          estado_operativo?: string | null
          fecha_proxima_itv?: string | null
          fecha_proxima_revision?: string | null
          foto_url?: string | null
          gps_info?: string | null
          id?: string
          km_actuales?: number | null
          marca?: string | null
          matricula?: string
          modelo?: string | null
          notas?: string | null
          tipo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vehiculos_empresa_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehiculos_empresa_conductor_habitual_id_fkey"
            columns: ["conductor_habitual_id"]
            isOneToOne: false
            referencedRelation: "personal"
            referencedColumns: ["id"]
          },
        ]
      }
      vuelos_dron: {
        Row: {
          company_id: string | null
          created_at: string | null
          fecha_vuelo: string | null
          id: string
          observaciones: string | null
          parcel_id: string | null
          url_imagen: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          fecha_vuelo?: string | null
          id?: string
          observaciones?: string | null
          parcel_id?: string | null
          url_imagen?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          fecha_vuelo?: string | null
          id?: string
          observaciones?: string | null
          parcel_id?: string | null
          url_imagen?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vuelos_dron_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vuelos_dron_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: false
            referencedRelation: "parcels"
            referencedColumns: ["parcel_id"]
          },
        ]
      }
      work_records: {
        Row: {
          company_id: string | null
          created_at: string | null
          cuadrilla_id: string | null
          date: string | null
          hora_entrada: string | null
          hora_salida: string | null
          horas_calculadas: number | null
          hours_worked: number | null
          id: string
          notas: string | null
          parcel_id: string | null
          qr_scan_entrada: string | null
          qr_scan_salida: string | null
          work_type: string | null
          workers_count: number | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          cuadrilla_id?: string | null
          date?: string | null
          hora_entrada?: string | null
          hora_salida?: string | null
          horas_calculadas?: number | null
          hours_worked?: number | null
          id?: string
          notas?: string | null
          parcel_id?: string | null
          qr_scan_entrada?: string | null
          qr_scan_salida?: string | null
          work_type?: string | null
          workers_count?: number | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          cuadrilla_id?: string | null
          date?: string | null
          hora_entrada?: string | null
          hora_salida?: string | null
          horas_calculadas?: number | null
          hours_worked?: number | null
          id?: string
          notas?: string | null
          parcel_id?: string | null
          qr_scan_entrada?: string | null
          qr_scan_salida?: string | null
          work_type?: string | null
          workers_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "work_records_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_records_cuadrilla_id_fkey"
            columns: ["cuadrilla_id"]
            isOneToOne: false
            referencedRelation: "cuadrillas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_records_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: false
            referencedRelation: "parcels"
            referencedColumns: ["parcel_id"]
          },
        ]
      }
      work_records_cuadrillas: {
        Row: {
          created_at: string | null
          cuadrilla_id: string
          hora_entrada: string | null
          hora_salida: string | null
          id: string
          num_trabajadores: number | null
          work_record_id: string
        }
        Insert: {
          created_at?: string | null
          cuadrilla_id: string
          hora_entrada?: string | null
          hora_salida?: string | null
          id?: string
          num_trabajadores?: number | null
          work_record_id: string
        }
        Update: {
          created_at?: string | null
          cuadrilla_id?: string
          hora_entrada?: string | null
          hora_salida?: string | null
          id?: string
          num_trabajadores?: number | null
          work_record_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_records_cuadrillas_cuadrilla_id_fkey"
            columns: ["cuadrilla_id"]
            isOneToOne: false
            referencedRelation: "cuadrillas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_records_cuadrillas_work_record_id_fkey"
            columns: ["work_record_id"]
            isOneToOne: false
            referencedRelation: "work_records"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_inventario_activos_en_ubicacion: {
        Row: {
          apero_descripcion: string | null
          apero_id: string | null
          apero_tipo: string | null
          company_id: string | null
          created_at: string | null
          id: string | null
          notas: string | null
          tractor_id: string | null
          tractor_marca: string | null
          tractor_matricula: string | null
          tractor_modelo: string | null
          ubicacion_id: string | null
          ubicacion_nombre: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventario_ubicacion_activo_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_ubicacion_activo_ubicacion_id_fkey"
            columns: ["ubicacion_id"]
            isOneToOne: false
            referencedRelation: "inventario_ubicaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      v_maquinaria_aperos_en_inventario: {
        Row: {
          activo: boolean | null
          apero_id: string | null
          codigo_interno: string | null
          company_id: string | null
          created_at: string | null
          descripcion: string | null
          estado: string | null
          id: string | null
          notas: string | null
          tipo: string | null
          tractor_id: string | null
          ubicacion_id: string | null
          ubicacion_nombre: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventario_ubicacion_activo_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_ubicacion_activo_ubicacion_id_fkey"
            columns: ["ubicacion_id"]
            isOneToOne: false
            referencedRelation: "inventario_ubicaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maquinaria_aperos_tractor_id_fkey"
            columns: ["tractor_id"]
            isOneToOne: false
            referencedRelation: "maquinaria_tractores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maquinaria_aperos_tractor_id_fkey"
            columns: ["tractor_id"]
            isOneToOne: false
            referencedRelation: "v_inventario_activos_en_ubicacion"
            referencedColumns: ["tractor_id"]
          },
          {
            foreignKeyName: "maquinaria_aperos_tractor_id_fkey"
            columns: ["tractor_id"]
            isOneToOne: false
            referencedRelation: "v_tractores_en_inventario"
            referencedColumns: ["tractor_id"]
          },
        ]
      }
      v_tractores_en_inventario: {
        Row: {
          activo: boolean | null
          anio: number | null
          codigo_interno: string | null
          company_id: string | null
          created_at: string | null
          estado_operativo: string | null
          id: string | null
          marca: string | null
          matricula: string | null
          modelo: string | null
          notas: string | null
          tractor_id: string | null
          ubicacion_id: string | null
          ubicacion_nombre: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventario_ubicacion_activo_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_ubicacion_activo_ubicacion_id_fkey"
            columns: ["ubicacion_id"]
            isOneToOne: false
            referencedRelation: "inventario_ubicaciones"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      cerrar_jornada_atomica: {
        Args: { p_fecha: string; p_usuario: string }
        Returns: Json
      }
      current_user_company_id: { Args: never; Returns: string }
      current_user_is_admin: { Args: never; Returns: boolean }
      current_user_role: { Args: never; Returns: string }
      get_user_context: { Args: never; Returns: Json }
      pilot_disable_fallback: {
        Args: { p_actor_user_id?: string }
        Returns: undefined
      }
      pilot_fallback_write: {
        Args: {
          p_action: string
          p_actor_user_id: string
          p_payload?: Json
          p_record_id?: string
          p_table_name: string
        }
        Returns: {
          company_id: string
          record_id: string
        }[]
      }
      pilot_get_active_user_company_id: {
        Args: { p_user_id?: string }
        Returns: string
      }
      user_has_role: { Args: { required_role: string }; Returns: boolean }
    }
    Enums: {
      ai_proposal_category: "analysis" | "planning" | "report"
      ai_proposal_status:
        | "pending"
        | "approved"
        | "rejected"
        | "executed"
        | "failed"
      ai_validation_decision: "approved" | "rejected"
      estado_certificacion: "vigente" | "suspendida" | "en_tramite" | "caducada"
      estado_parcela:
        | "activa"
        | "plantada"
        | "preparacion"
        | "cosechada"
        | "vacia"
        | "baja"
        | "en_produccion"
        | "acolchado"
      tipo_residuo:
        | "plastico_acolchado"
        | "cinta_riego"
        | "rafia"
        | "envase_fitosanitario"
        | "otro"
      tipo_riego: "goteo" | "tradicional" | "aspersion" | "ninguno"
      tipo_suelo:
        | "arcilloso"
        | "franco"
        | "arenoso"
        | "limoso"
        | "franco_arcilloso"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      ai_proposal_category: ["analysis", "planning", "report"],
      ai_proposal_status: [
        "pending",
        "approved",
        "rejected",
        "executed",
        "failed",
      ],
      ai_validation_decision: ["approved", "rejected"],
      estado_certificacion: ["vigente", "suspendida", "en_tramite", "caducada"],
      estado_parcela: [
        "activa",
        "plantada",
        "preparacion",
        "cosechada",
        "vacia",
        "baja",
        "en_produccion",
        "acolchado",
      ],
      tipo_residuo: [
        "plastico_acolchado",
        "cinta_riego",
        "rafia",
        "envase_fitosanitario",
        "otro",
      ],
      tipo_riego: ["goteo", "tradicional", "aspersion", "ninguno"],
      tipo_suelo: [
        "arcilloso",
        "franco",
        "arenoso",
        "limoso",
        "franco_arcilloso",
      ],
    },
  },
} as const
