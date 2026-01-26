
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      equipments: {
        Row: {
          id: string
          name: string
          type: string
          parent_id: string | null
          location: any // PostGIS Point
          status: string
          capacity_total: number
          capacity_used: number
          metadata: Json
          is_deleted: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          type: string
          parent_id?: string | null
          location?: any
          status?: string
          capacity_total?: number
          capacity_used?: number
          metadata?: Json
          is_deleted?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['equipments']['Insert']>
      }
      cables: {
        Row: {
          id: string
          name: string
          type: string
          category: string
          start_node_id: string
          end_node_id: string
          path_geometry: any // PostGIS LineString
          fiber_count: number
          status: string
          is_deleted: boolean
          created_at: string
          updated_at: string
          length_meters: number
          metadata: Json
        }
        Insert: {
          id?: string
          name: string
          type?: string
          category: string
          start_node_id: string
          end_node_id: string
          path_geometry?: any
          fiber_count?: number
          status?: string
          is_deleted?: boolean
          created_at?: string
          updated_at?: string
          length_meters?: number
          metadata?: Json
        }
        Update: Partial<Database['public']['Tables']['cables']['Insert']>
      }
      clients: {
        Row: {
          id: string
          equipment_id: string
          login: string
          name: string
          contact_info: Json
          contract_info: Json
          created_at: string
        }
        Insert: {
          id?: string
          equipment_id: string
          login: string
          name: string
          contact_info?: Json
          contract_info?: Json
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['clients']['Insert']>
      }
      operations: {
        Row: {
          id: string
          type: string
          status: string
          technician: string
          target_id: string
          details: string
          date: string
          created_at: string
        }
        Insert: {
          id?: string
          type: string
          status: string
          technician: string
          target_id: string
          details?: string
          date?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['operations']['Insert']>
      }
      audit_logs: {
        Row: {
          id: string
          user_email: string
          action: string
          entity_type: string
          entity_id: string
          entity_path: string | null
          old_data: Json | null
          new_data: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_email: string
          action: string
          entity_type: string
          entity_id: string
          entity_path?: string | null
          old_data?: Json | null
          new_data?: Json | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['audit_logs']['Insert']>
      }
    }
  }
}
