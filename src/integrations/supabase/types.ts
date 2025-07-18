export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      bookings: {
        Row: {
          booking_datetime: string
          center_id: string | null
          channel: Database["public"]["Enums"]["booking_channel"]
          client_id: string | null
          created_at: string
          duration_minutes: number
          employee_id: string | null
          id: string
          lane_id: string | null
          notes: string | null
          payment_status: Database["public"]["Enums"]["payment_status"] | null
          service_id: string | null
          status: Database["public"]["Enums"]["booking_status"] | null
          stripe_session_id: string | null
          total_price_cents: number
          updated_at: string
        }
        Insert: {
          booking_datetime: string
          center_id?: string | null
          channel: Database["public"]["Enums"]["booking_channel"]
          client_id?: string | null
          created_at?: string
          duration_minutes: number
          employee_id?: string | null
          id?: string
          lane_id?: string | null
          notes?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          service_id?: string | null
          status?: Database["public"]["Enums"]["booking_status"] | null
          stripe_session_id?: string | null
          total_price_cents: number
          updated_at?: string
        }
        Update: {
          booking_datetime?: string
          center_id?: string | null
          channel?: Database["public"]["Enums"]["booking_channel"]
          client_id?: string | null
          created_at?: string
          duration_minutes?: number
          employee_id?: string | null
          id?: string
          lane_id?: string | null
          notes?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          service_id?: string | null
          status?: Database["public"]["Enums"]["booking_status"] | null
          stripe_session_id?: string | null
          total_price_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_lane_id_fkey"
            columns: ["lane_id"]
            isOneToOne: false
            referencedRelation: "lanes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      centers: {
        Row: {
          active: boolean | null
          address: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      client_packages: {
        Row: {
          client_id: string
          created_at: string
          expiry_date: string
          id: string
          notes: string | null
          package_id: string
          purchase_date: string
          purchase_price_cents: number
          status: string
          total_sessions: number
          updated_at: string
          used_sessions: number
          voucher_code: string
        }
        Insert: {
          client_id: string
          created_at?: string
          expiry_date: string
          id?: string
          notes?: string | null
          package_id: string
          purchase_date?: string
          purchase_price_cents: number
          status?: string
          total_sessions: number
          updated_at?: string
          used_sessions?: number
          voucher_code: string
        }
        Update: {
          client_id?: string
          created_at?: string
          expiry_date?: string
          id?: string
          notes?: string | null
          package_id?: string
          purchase_date?: string
          purchase_price_cents?: number
          status?: string
          total_sessions?: number
          updated_at?: string
          used_sessions?: number
          voucher_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_packages_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_packages_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          active: boolean | null
          center_id: string | null
          created_at: string
          id: string
          profile_id: string | null
          specialties: string[] | null
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          center_id?: string | null
          created_at?: string
          id?: string
          profile_id?: string | null
          specialties?: string[] | null
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          center_id?: string | null
          created_at?: string
          id?: string
          profile_id?: string | null
          specialties?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employees_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lanes: {
        Row: {
          active: boolean | null
          blocked_until: string | null
          capacity: number | null
          center_id: string | null
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          blocked_until?: string | null
          capacity?: number | null
          center_id?: string | null
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          blocked_until?: string | null
          capacity?: number | null
          center_id?: string | null
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lanes_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
        ]
      }
      packages: {
        Row: {
          active: boolean | null
          center_id: string | null
          created_at: string
          description: string | null
          discount_percentage: number | null
          id: string
          name: string
          price_cents: number
          service_id: string | null
          sessions_count: number
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          center_id?: string | null
          created_at?: string
          description?: string | null
          discount_percentage?: number | null
          id?: string
          name: string
          price_cents: number
          service_id?: string | null
          sessions_count?: number
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          center_id?: string | null
          created_at?: string
          description?: string | null
          discount_percentage?: number | null
          id?: string
          name?: string
          price_cents?: number
          service_id?: string | null
          sessions_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "packages_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "packages_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role"] | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      services: {
        Row: {
          active: boolean | null
          center_id: string | null
          created_at: string
          description: string | null
          duration_minutes: number
          id: string
          name: string
          price_cents: number
          type: Database["public"]["Enums"]["service_type"]
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          center_id?: string | null
          created_at?: string
          description?: string | null
          duration_minutes: number
          id?: string
          name: string
          price_cents: number
          type: Database["public"]["Enums"]["service_type"]
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          center_id?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          name?: string
          price_cents?: number
          type?: Database["public"]["Enums"]["service_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_voucher_code: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_expiring_packages: {
        Args: { days_ahead?: number }
        Returns: {
          id: string
          client_id: string
          client_name: string
          client_email: string
          package_name: string
          voucher_code: string
          expiry_date: string
          remaining_sessions: number
          days_to_expiry: number
        }[]
      }
      has_role: {
        Args: {
          _user_id: string
          _role: Database["public"]["Enums"]["user_role"]
        }
        Returns: boolean
      }
      use_client_package_session: {
        Args: { package_id: string; booking_id?: string }
        Returns: boolean
      }
    }
    Enums: {
      booking_channel: "web" | "whatsapp" | "email" | "phone"
      booking_status:
        | "pending"
        | "confirmed"
        | "completed"
        | "cancelled"
        | "no_show"
      payment_status:
        | "pending"
        | "paid"
        | "failed"
        | "refunded"
        | "partial_refund"
      service_type: "massage" | "treatment" | "package"
      user_role: "admin" | "employee" | "client"
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
      booking_channel: ["web", "whatsapp", "email", "phone"],
      booking_status: [
        "pending",
        "confirmed",
        "completed",
        "cancelled",
        "no_show",
      ],
      payment_status: [
        "pending",
        "paid",
        "failed",
        "refunded",
        "partial_refund",
      ],
      service_type: ["massage", "treatment", "package"],
      user_role: ["admin", "employee", "client"],
    },
  },
} as const
