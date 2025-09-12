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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: unknown | null
          new_values: Json | null
          old_values: Json | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      automated_notifications: {
        Row: {
          booking_id: string | null
          client_id: string
          created_at: string
          error_message: string | null
          id: string
          message: string
          metadata: Json | null
          package_id: string | null
          scheduled_for: string
          sent_at: string | null
          status: string
          subject: string | null
          type: string
        }
        Insert: {
          booking_id?: string | null
          client_id: string
          created_at?: string
          error_message?: string | null
          id?: string
          message: string
          metadata?: Json | null
          package_id?: string | null
          scheduled_for: string
          sent_at?: string | null
          status?: string
          subject?: string | null
          type: string
        }
        Update: {
          booking_id?: string | null
          client_id?: string
          created_at?: string
          error_message?: string | null
          id?: string
          message?: string
          metadata?: Json | null
          package_id?: string | null
          scheduled_for?: string
          sent_at?: string | null
          status?: string
          subject?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "automated_notifications_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automated_notifications_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automated_notifications_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "client_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_payment_intents: {
        Row: {
          booking_id: string
          client_secret: string
          created_at: string
          id: string
          status: string
          stripe_payment_method_id: string | null
          stripe_setup_intent_id: string
          updated_at: string
        }
        Insert: {
          booking_id: string
          client_secret: string
          created_at?: string
          id?: string
          status?: string
          stripe_payment_method_id?: string | null
          stripe_setup_intent_id: string
          updated_at?: string
        }
        Update: {
          booking_id?: string
          client_secret?: string
          created_at?: string
          id?: string
          status?: string
          stripe_payment_method_id?: string | null
          stripe_setup_intent_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_payment_intents_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          booking_datetime: string
          center_id: string | null
          channel: Database["public"]["Enums"]["booking_channel"]
          client_id: string | null
          created_at: string
          duration_minutes: number
          email_sent_at: string | null
          email_status: string | null
          employee_id: string | null
          id: string
          lane_id: string | null
          notes: string | null
          payment_method: string | null
          payment_method_status: string | null
          payment_notes: string | null
          payment_status: Database["public"]["Enums"]["payment_status"] | null
          service_id: string | null
          status: Database["public"]["Enums"]["booking_status"] | null
          stripe_payment_method_id: string | null
          stripe_session_id: string | null
          stripe_setup_intent_id: string | null
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
          email_sent_at?: string | null
          email_status?: string | null
          employee_id?: string | null
          id?: string
          lane_id?: string | null
          notes?: string | null
          payment_method?: string | null
          payment_method_status?: string | null
          payment_notes?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          service_id?: string | null
          status?: Database["public"]["Enums"]["booking_status"] | null
          stripe_payment_method_id?: string | null
          stripe_session_id?: string | null
          stripe_setup_intent_id?: string | null
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
          email_sent_at?: string | null
          email_status?: string | null
          employee_id?: string | null
          id?: string
          lane_id?: string | null
          notes?: string | null
          payment_method?: string | null
          payment_method_status?: string | null
          payment_notes?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          service_id?: string | null
          status?: Database["public"]["Enums"]["booking_status"] | null
          stripe_payment_method_id?: string | null
          stripe_session_id?: string | null
          stripe_setup_intent_id?: string | null
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
      business_metrics: {
        Row: {
          calculated_at: string
          center_id: string | null
          id: string
          metadata: Json | null
          metric_name: string
          metric_type: string
          metric_value: number
          period_end: string
          period_start: string
        }
        Insert: {
          calculated_at?: string
          center_id?: string | null
          id?: string
          metadata?: Json | null
          metric_name: string
          metric_type: string
          metric_value: number
          period_end: string
          period_start: string
        }
        Update: {
          calculated_at?: string
          center_id?: string | null
          id?: string
          metadata?: Json | null
          metric_name?: string
          metric_type?: string
          metric_value?: number
          period_end?: string
          period_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_metrics_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
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
          whatsapp: string | null
          working_hours: Json | null
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
          whatsapp?: string | null
          working_hours?: Json | null
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
          whatsapp?: string | null
          working_hours?: Json | null
        }
        Relationships: []
      }
      client_notes: {
        Row: {
          category: string
          client_id: string
          content: string
          created_at: string
          id: string
          is_alert: boolean
          is_private: boolean
          priority: string
          search_vector: unknown | null
          staff_id: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          client_id: string
          content: string
          created_at?: string
          id?: string
          is_alert?: boolean
          is_private?: boolean
          priority?: string
          search_vector?: unknown | null
          staff_id: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          client_id?: string
          content?: string
          created_at?: string
          id?: string
          is_alert?: boolean
          is_private?: boolean
          priority?: string
          search_vector?: unknown | null
          staff_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_notes_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_package_usages: {
        Row: {
          booking_id: string | null
          client_package_id: string
          id: string
          notes: string | null
          used_at: string
          used_by: string | null
        }
        Insert: {
          booking_id?: string | null
          client_package_id: string
          id?: string
          notes?: string | null
          used_at?: string
          used_by?: string | null
        }
        Update: {
          booking_id?: string | null
          client_package_id?: string
          id?: string
          notes?: string | null
          used_at?: string
          used_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_package_usages_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_package_usages_client_package_id_fkey"
            columns: ["client_package_id"]
            isOneToOne: false
            referencedRelation: "client_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_package_usages_used_by_fkey"
            columns: ["used_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_packages: {
        Row: {
          client_id: string
          created_at: string
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
      client_profiles: {
        Row: {
          allergies: string[] | null
          anniversary: string | null
          birthday: string | null
          client_id: string
          communication_preferences: Json | null
          created_at: string
          id: string
          last_visit_date: string | null
          loyalty_points: number | null
          medical_conditions: string[] | null
          notes: string | null
          preferences: Json | null
          preferred_employee_id: string | null
          preferred_services: string[] | null
          preferred_time_slots: string[] | null
          referral_source: string | null
          satisfaction_score: number | null
          total_spent_cents: number | null
          total_visits: number | null
          updated_at: string
          vip_status: boolean | null
        }
        Insert: {
          allergies?: string[] | null
          anniversary?: string | null
          birthday?: string | null
          client_id: string
          communication_preferences?: Json | null
          created_at?: string
          id?: string
          last_visit_date?: string | null
          loyalty_points?: number | null
          medical_conditions?: string[] | null
          notes?: string | null
          preferences?: Json | null
          preferred_employee_id?: string | null
          preferred_services?: string[] | null
          preferred_time_slots?: string[] | null
          referral_source?: string | null
          satisfaction_score?: number | null
          total_spent_cents?: number | null
          total_visits?: number | null
          updated_at?: string
          vip_status?: boolean | null
        }
        Update: {
          allergies?: string[] | null
          anniversary?: string | null
          birthday?: string | null
          client_id?: string
          communication_preferences?: Json | null
          created_at?: string
          id?: string
          last_visit_date?: string | null
          loyalty_points?: number | null
          medical_conditions?: string[] | null
          notes?: string | null
          preferences?: Json | null
          preferred_employee_id?: string | null
          preferred_services?: string[] | null
          preferred_time_slots?: string[] | null
          referral_source?: string | null
          satisfaction_score?: number | null
          total_spent_cents?: number | null
          total_visits?: number | null
          updated_at?: string
          vip_status?: boolean | null
        }
        Relationships: []
      }
      code_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          code_id: string
          entity_id: string
          entity_type: string
          id: string
          notes: string | null
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          code_id: string
          entity_id: string
          entity_type: string
          id?: string
          notes?: string | null
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          code_id?: string
          entity_id?: string
          entity_type?: string
          id?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "code_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "code_assignments_code_id_fkey"
            columns: ["code_id"]
            isOneToOne: false
            referencedRelation: "internal_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_widgets: {
        Row: {
          config: Json
          created_at: string
          height: number
          id: string
          is_visible: boolean
          position_x: number
          position_y: number
          title: string
          updated_at: string
          user_id: string | null
          widget_type: string
          width: number
        }
        Insert: {
          config?: Json
          created_at?: string
          height?: number
          id?: string
          is_visible?: boolean
          position_x?: number
          position_y?: number
          title: string
          updated_at?: string
          user_id?: string | null
          widget_type: string
          width?: number
        }
        Update: {
          config?: Json
          created_at?: string
          height?: number
          id?: string
          is_visible?: boolean
          position_x?: number
          position_y?: number
          title?: string
          updated_at?: string
          user_id?: string | null
          widget_type?: string
          width?: number
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_widgets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_absences: {
        Row: {
          absence_type: string
          approved_at: string | null
          approved_by: string | null
          created_at: string
          employee_id: string
          end_date: string
          id: string
          reason: string | null
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          absence_type: string
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          employee_id: string
          end_date: string
          id?: string
          reason?: string | null
          start_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          absence_type?: string
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          employee_id?: string
          end_date?: string
          id?: string
          reason?: string | null
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      employee_availability: {
        Row: {
          available_from: string | null
          available_until: string | null
          created_at: string
          date: string
          employee_id: string
          id: string
          is_available: boolean
          notes: string | null
          updated_at: string
        }
        Insert: {
          available_from?: string | null
          available_until?: string | null
          created_at?: string
          date: string
          employee_id: string
          id?: string
          is_available?: boolean
          notes?: string | null
          updated_at?: string
        }
        Update: {
          available_from?: string | null
          available_until?: string | null
          created_at?: string
          date?: string
          employee_id?: string
          id?: string
          is_available?: boolean
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      employee_shifts: {
        Row: {
          center_id: string | null
          created_at: string
          day_of_week: number
          employee_id: string
          end_time: string
          id: string
          is_active: boolean
          start_time: string
          updated_at: string
        }
        Insert: {
          center_id?: string | null
          created_at?: string
          day_of_week: number
          employee_id: string
          end_time: string
          id?: string
          is_active?: boolean
          start_time: string
          updated_at?: string
        }
        Update: {
          center_id?: string | null
          created_at?: string
          day_of_week?: number
          employee_id?: string
          end_time?: string
          id?: string
          is_active?: boolean
          start_time?: string
          updated_at?: string
        }
        Relationships: []
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
      generated_reports: {
        Row: {
          data: Json
          error_message: string | null
          expires_at: string | null
          file_url: string | null
          format: string
          generated_at: string
          generated_by: string | null
          id: string
          name: string
          parameters: Json
          status: string
          template_id: string | null
        }
        Insert: {
          data: Json
          error_message?: string | null
          expires_at?: string | null
          file_url?: string | null
          format?: string
          generated_at?: string
          generated_by?: string | null
          id?: string
          name: string
          parameters?: Json
          status?: string
          template_id?: string | null
        }
        Update: {
          data?: Json
          error_message?: string | null
          expires_at?: string | null
          file_url?: string | null
          format?: string
          generated_at?: string
          generated_by?: string | null
          id?: string
          name?: string
          parameters?: Json
          status?: string
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "generated_reports_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_reports_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "report_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      gift_card_options: {
        Row: {
          amount_cents: number
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          show_online: boolean
          updated_at: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          show_online?: boolean
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          show_online?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      gift_card_redemptions: {
        Row: {
          amount_cents: number
          booking_id: string | null
          client_id: string | null
          gift_card_id: string
          id: string
          notes: string | null
          redeemed_at: string
          redeemed_by: string | null
        }
        Insert: {
          amount_cents: number
          booking_id?: string | null
          client_id?: string | null
          gift_card_id: string
          id?: string
          notes?: string | null
          redeemed_at?: string
          redeemed_by?: string | null
        }
        Update: {
          amount_cents?: number
          booking_id?: string | null
          client_id?: string | null
          gift_card_id?: string
          id?: string
          notes?: string | null
          redeemed_at?: string
          redeemed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gift_card_redemptions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_card_redemptions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_card_redemptions_gift_card_id_fkey"
            columns: ["gift_card_id"]
            isOneToOne: false
            referencedRelation: "gift_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_card_redemptions_redeemed_by_fkey"
            columns: ["redeemed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gift_cards: {
        Row: {
          assigned_client_id: string | null
          code: string
          created_at: string
          expiry_date: string | null
          id: string
          initial_balance_cents: number
          purchased_at: string
          purchased_by_email: string | null
          purchased_by_name: string | null
          remaining_balance_cents: number
          status: string
          updated_at: string
        }
        Insert: {
          assigned_client_id?: string | null
          code: string
          created_at?: string
          expiry_date?: string | null
          id?: string
          initial_balance_cents: number
          purchased_at?: string
          purchased_by_email?: string | null
          purchased_by_name?: string | null
          remaining_balance_cents: number
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_client_id?: string | null
          code?: string
          created_at?: string
          expiry_date?: string | null
          id?: string
          initial_balance_cents?: number
          purchased_at?: string
          purchased_by_email?: string | null
          purchased_by_name?: string | null
          remaining_balance_cents?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gift_cards_assigned_client_id_fkey"
            columns: ["assigned_client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      happy_hours: {
        Row: {
          created_at: string
          days_of_week: number[]
          description: string | null
          discount_percentage: number
          end_time: string
          id: string
          is_active: boolean
          name: string
          start_time: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          days_of_week: number[]
          description?: string | null
          discount_percentage: number
          end_time: string
          id?: string
          is_active?: boolean
          name: string
          start_time: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          days_of_week?: number[]
          description?: string | null
          discount_percentage?: number
          end_time?: string
          id?: string
          is_active?: boolean
          name?: string
          start_time?: string
          updated_at?: string
        }
        Relationships: []
      }
      internal_codes: {
        Row: {
          category: string
          code: string
          color: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          category?: string
          code: string
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          category?: string
          code?: string
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "internal_codes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_categories: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      inventory_items: {
        Row: {
          category_id: string | null
          center_id: string | null
          created_at: string
          current_stock: number
          description: string | null
          expiry_date: string | null
          id: string
          is_active: boolean
          location: string | null
          max_stock: number | null
          min_stock: number
          name: string
          selling_price: number | null
          sku: string | null
          supplier_id: string | null
          unit_cost: number | null
          unit_type: string
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          center_id?: string | null
          created_at?: string
          current_stock?: number
          description?: string | null
          expiry_date?: string | null
          id?: string
          is_active?: boolean
          location?: string | null
          max_stock?: number | null
          min_stock?: number
          name: string
          selling_price?: number | null
          sku?: string | null
          supplier_id?: string | null
          unit_cost?: number | null
          unit_type?: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          center_id?: string | null
          created_at?: string
          current_stock?: number
          description?: string | null
          expiry_date?: string | null
          id?: string
          is_active?: boolean
          location?: string | null
          max_stock?: number | null
          min_stock?: number
          name?: string
          selling_price?: number | null
          sku?: string | null
          supplier_id?: string | null
          unit_cost?: number | null
          unit_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "inventory_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          created_at: string
          id: string
          item_id: string
          movement_type: string
          notes: string | null
          performed_by: string | null
          quantity: number
          reason: string
          reference_id: string | null
          reference_type: string | null
          total_cost: number | null
          unit_cost: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          movement_type: string
          notes?: string | null
          performed_by?: string | null
          quantity: number
          reason: string
          reference_id?: string | null
          reference_type?: string | null
          total_cost?: number | null
          unit_cost?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          movement_type?: string
          notes?: string | null
          performed_by?: string | null
          quantity?: number
          reason?: string
          reference_id?: string | null
          reference_type?: string | null
          total_cost?: number | null
          unit_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_targets: {
        Row: {
          center_id: string | null
          created_at: string
          created_by: string | null
          id: string
          metric_name: string
          period_end: string
          period_start: string
          target_type: string
          target_value: number
          updated_at: string
        }
        Insert: {
          center_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          metric_name: string
          period_end: string
          period_start: string
          target_type: string
          target_value: number
          updated_at?: string
        }
        Update: {
          center_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          metric_name?: string
          period_end?: string
          period_start?: string
          target_type?: string
          target_value?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kpi_targets_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpi_targets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lane_blocks: {
        Row: {
          center_id: string
          created_at: string
          created_by: string
          end_datetime: string
          id: string
          lane_id: string
          reason: string | null
          start_datetime: string
          updated_at: string
        }
        Insert: {
          center_id: string
          created_at?: string
          created_by: string
          end_datetime: string
          id?: string
          lane_id: string
          reason?: string | null
          start_datetime: string
          updated_at?: string
        }
        Update: {
          center_id?: string
          created_at?: string
          created_by?: string
          end_datetime?: string
          id?: string
          lane_id?: string
          reason?: string | null
          start_datetime?: string
          updated_at?: string
        }
        Relationships: []
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
      low_stock_alerts: {
        Row: {
          alert_level: string
          created_at: string
          id: string
          item_id: string
          notified_at: string | null
          resolved_at: string | null
        }
        Insert: {
          alert_level: string
          created_at?: string
          id?: string
          item_id: string
          notified_at?: string | null
          resolved_at?: string | null
        }
        Update: {
          alert_level?: string
          created_at?: string
          id?: string
          item_id?: string
          notified_at?: string | null
          resolved_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "low_stock_alerts_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_transactions: {
        Row: {
          booking_id: string | null
          client_id: string
          created_at: string
          description: string | null
          id: string
          points_amount: number
          transaction_type: string
        }
        Insert: {
          booking_id?: string | null
          client_id: string
          created_at?: string
          description?: string | null
          id?: string
          points_amount: number
          transaction_type: string
        }
        Update: {
          booking_id?: string | null
          client_id?: string
          created_at?: string
          description?: string | null
          id?: string
          points_amount?: number
          transaction_type?: string
        }
        Relationships: []
      }
      notification_rules: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          message_template: string
          name: string
          segment_criteria: Json | null
          send_via: string[]
          target_audience: string
          trigger_days_before: number | null
          trigger_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          message_template: string
          name: string
          segment_criteria?: Json | null
          send_via?: string[]
          target_audience?: string
          trigger_days_before?: number | null
          trigger_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          message_template?: string
          name?: string
          segment_criteria?: Json | null
          send_via?: string[]
          target_audience?: string
          trigger_days_before?: number | null
          trigger_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      notification_templates: {
        Row: {
          content: string
          created_at: string
          id: string
          name: string
          subject: string | null
          type: string
          updated_at: string
          variables: string[] | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          name: string
          subject?: string | null
          type: string
          updated_at?: string
          variables?: string[] | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          name?: string
          subject?: string | null
          type?: string
          updated_at?: string
          variables?: string[] | null
        }
        Relationships: []
      }
      packages: {
        Row: {
          active: boolean | null
          center_id: string | null
          created_at: string
          description: string | null
          discount_percentage: number | null
          discount_price_cents: number | null
          has_discount: boolean | null
          id: string
          name: string
          price_cents: number
          service_id: string | null
          sessions_count: number
          show_online: boolean
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          center_id?: string | null
          created_at?: string
          description?: string | null
          discount_percentage?: number | null
          discount_price_cents?: number | null
          has_discount?: boolean | null
          id?: string
          name: string
          price_cents: number
          service_id?: string | null
          sessions_count?: number
          show_online?: boolean
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          center_id?: string | null
          created_at?: string
          description?: string | null
          discount_percentage?: number | null
          discount_price_cents?: number | null
          has_discount?: boolean | null
          id?: string
          name?: string
          price_cents?: number
          service_id?: string | null
          sessions_count?: number
          show_online?: boolean
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
      period_purchases: {
        Row: {
          created_at: string
          end_date: string
          id: string
          period_type: string
          price_cents: number
          purchase_details: Json | null
          start_date: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          period_type: string
          price_cents?: number
          purchase_details?: Json | null
          start_date: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          period_type?: string
          price_cents?: number
          purchase_details?: Json | null
          start_date?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          first_name: string | null
          id: string
          is_active: boolean | null
          is_staff: boolean | null
          last_login: string | null
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
          is_active?: boolean | null
          is_staff?: boolean | null
          last_login?: string | null
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
          is_active?: boolean | null
          is_staff?: boolean | null
          last_login?: string | null
          last_name?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      promotions: {
        Row: {
          applies_to: string
          coupon_code: string | null
          created_at: string
          created_by: string | null
          days_of_week: number[] | null
          description: string | null
          end_at: string | null
          id: string
          is_active: boolean
          name: string
          start_at: string | null
          target_id: string | null
          time_end: string | null
          time_start: string | null
          type: string
          updated_at: string
          value: number
        }
        Insert: {
          applies_to: string
          coupon_code?: string | null
          created_at?: string
          created_by?: string | null
          days_of_week?: number[] | null
          description?: string | null
          end_at?: string | null
          id?: string
          is_active?: boolean
          name: string
          start_at?: string | null
          target_id?: string | null
          time_end?: string | null
          time_start?: string | null
          type: string
          updated_at?: string
          value: number
        }
        Update: {
          applies_to?: string
          coupon_code?: string | null
          created_at?: string
          created_by?: string | null
          days_of_week?: number[] | null
          description?: string | null
          end_at?: string | null
          id?: string
          is_active?: boolean
          name?: string
          start_at?: string | null
          target_id?: string | null
          time_end?: string | null
          time_start?: string | null
          type?: string
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "promotions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_items: {
        Row: {
          created_at: string
          id: string
          item_id: string
          purchase_order_id: string
          quantity_ordered: number
          quantity_received: number
          total_cost: number
          unit_cost: number
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          purchase_order_id: string
          quantity_ordered: number
          quantity_received?: number
          total_cost: number
          unit_cost: number
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          purchase_order_id?: string
          quantity_ordered?: number
          quantity_received?: number
          total_cost?: number
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          center_id: string | null
          created_at: string
          created_by: string | null
          expected_date: string | null
          id: string
          notes: string | null
          order_date: string
          order_number: string
          received_date: string | null
          status: string
          subtotal: number
          supplier_id: string
          tax_amount: number
          total_amount: number
          updated_at: string
        }
        Insert: {
          center_id?: string | null
          created_at?: string
          created_by?: string | null
          expected_date?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          order_number: string
          received_date?: string | null
          status?: string
          subtotal?: number
          supplier_id: string
          tax_amount?: number
          total_amount?: number
          updated_at?: string
        }
        Update: {
          center_id?: string | null
          created_at?: string
          created_by?: string | null
          expected_date?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          order_number?: string
          received_date?: string | null
          status?: string
          subtotal?: number
          supplier_id?: string
          tax_amount?: number
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      report_templates: {
        Row: {
          chart_config: Json | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          is_public: boolean
          name: string
          parameters: Json
          query_definition: Json
          report_type: string
          updated_at: string
        }
        Insert: {
          chart_config?: Json | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_public?: boolean
          name: string
          parameters?: Json
          query_definition: Json
          report_type: string
          updated_at?: string
        }
        Update: {
          chart_config?: Json | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_public?: boolean
          name?: string
          parameters?: Json
          query_definition?: Json
          report_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      satisfaction_surveys: {
        Row: {
          booking_id: string | null
          client_id: string
          created_at: string
          facility_rating: number | null
          feedback: string | null
          id: string
          overall_rating: number
          service_rating: number | null
          staff_rating: number | null
          survey_date: string
          would_recommend: boolean | null
        }
        Insert: {
          booking_id?: string | null
          client_id: string
          created_at?: string
          facility_rating?: number | null
          feedback?: string | null
          id?: string
          overall_rating: number
          service_rating?: number | null
          staff_rating?: number | null
          survey_date?: string
          would_recommend?: boolean | null
        }
        Update: {
          booking_id?: string | null
          client_id?: string
          created_at?: string
          facility_rating?: number | null
          feedback?: string | null
          id?: string
          overall_rating?: number
          service_rating?: number | null
          staff_rating?: number | null
          survey_date?: string
          would_recommend?: boolean | null
        }
        Relationships: []
      }
      scheduled_notifications: {
        Row: {
          client_id: string
          created_at: string
          error_message: string | null
          id: string
          message_content: string
          related_booking_id: string | null
          related_package_id: string | null
          rule_id: string | null
          scheduled_for: string
          send_via: string[]
          sent_at: string | null
          status: string
          subject: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          error_message?: string | null
          id?: string
          message_content: string
          related_booking_id?: string | null
          related_package_id?: string | null
          rule_id?: string | null
          scheduled_for: string
          send_via?: string[]
          sent_at?: string | null
          status?: string
          subject?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          error_message?: string | null
          id?: string
          message_content?: string
          related_booking_id?: string | null
          related_package_id?: string | null
          rule_id?: string | null
          scheduled_for?: string
          send_via?: string[]
          sent_at?: string | null
          status?: string
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_notifications_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_notifications_related_booking_id_fkey"
            columns: ["related_booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_notifications_related_package_id_fkey"
            columns: ["related_package_id"]
            isOneToOne: false
            referencedRelation: "client_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_notifications_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "notification_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          active: boolean | null
          center_id: string | null
          color: string | null
          created_at: string
          description: string | null
          discount_price_cents: number | null
          duration_minutes: number
          group_id: string | null
          has_discount: boolean | null
          id: string
          lane_ids: string[] | null
          name: string
          price_cents: number
          show_online: boolean
          type: Database["public"]["Enums"]["service_type"]
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          center_id?: string | null
          color?: string | null
          created_at?: string
          description?: string | null
          discount_price_cents?: number | null
          duration_minutes: number
          group_id?: string | null
          has_discount?: boolean | null
          id?: string
          lane_ids?: string[] | null
          name: string
          price_cents: number
          show_online?: boolean
          type: Database["public"]["Enums"]["service_type"]
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          center_id?: string | null
          color?: string | null
          created_at?: string
          description?: string | null
          discount_price_cents?: number | null
          duration_minutes?: number
          group_id?: string | null
          has_discount?: boolean | null
          id?: string
          lane_ids?: string[] | null
          name?: string
          price_cents?: number
          show_online?: boolean
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
          {
            foreignKeyName: "services_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "treatment_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          contact_person: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          phone: string | null
          tax_id: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          phone?: string | null
          tax_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          phone?: string | null
          tax_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      treatment_groups: {
        Row: {
          active: boolean
          center_id: string | null
          color: string
          created_at: string
          id: string
          lane_id: string | null
          lane_ids: string[] | null
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          center_id?: string | null
          color?: string
          created_at?: string
          id?: string
          lane_id?: string | null
          lane_ids?: string[] | null
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          center_id?: string | null
          color?: string
          created_at?: string
          id?: string
          lane_id?: string | null
          lane_ids?: string[] | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "treatment_groups_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_groups_lane_id_fkey"
            columns: ["lane_id"]
            isOneToOne: false
            referencedRelation: "lanes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_operational_metrics: {
        Args: { center_id_param?: string; end_date: string; start_date: string }
        Returns: {
          avg_session_duration: number
          new_clients: number
          no_show_rate: number
          occupancy_rate: number
          returning_clients: number
          total_clients: number
        }[]
      }
      calculate_revenue_metrics: {
        Args: { center_id_param?: string; end_date: string; start_date: string }
        Returns: {
          average_ticket: number
          revenue_by_day: Json
          revenue_by_service: Json
          total_bookings: number
          total_revenue: number
        }[]
      }
      create_booking_reminders: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      generate_po_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_voucher_code: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_business_intelligence: {
        Args: {
          center_id_param?: string
          end_date?: string
          start_date?: string
        }
        Returns: Json
      }
      get_code_assignments_with_details: {
        Args: { target_entity_id?: string; target_entity_type?: string }
        Returns: {
          assigned_at: string
          assigned_by: string
          assigner_name: string
          code: string
          code_category: string
          code_color: string
          code_id: string
          code_name: string
          entity_id: string
          entity_type: string
          id: string
          notes: string
        }[]
      }
      get_codes_with_stats: {
        Args: Record<PropertyKey, never>
        Returns: {
          category: string
          code: string
          color: string
          created_at: string
          created_by: string
          creator_name: string
          description: string
          id: string
          last_used: string
          name: string
          updated_at: string
          usage_count: number
        }[]
      }
      get_inventory_movements_with_details: {
        Args: {
          item_id_param?: string
          limit_count?: number
          movement_type_param?: string
        }
        Returns: {
          created_at: string
          id: string
          item_id: string
          item_name: string
          item_sku: string
          movement_type: string
          notes: string
          performed_by: string
          performer_name: string
          quantity: number
          reason: string
          total_cost: number
          unit_cost: number
        }[]
      }
      get_inventory_stats: {
        Args: { center_id_param?: string }
        Returns: {
          average_stock: number
          low_stock_items: number
          out_of_stock_items: number
          total_items: number
          total_value: number
        }[]
      }
      get_low_stock_alerts_with_details: {
        Args: Record<PropertyKey, never>
        Returns: {
          alert_level: string
          created_at: string
          current_stock: number
          id: string
          item_id: string
          item_name: string
          item_sku: string
          min_stock: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_active_staff: {
        Args: { _user_id: string }
        Returns: boolean
      }
      log_activity: {
        Args: {
          p_action: string
          p_entity_id: string
          p_entity_type: string
          p_new_values?: Json
          p_old_values?: Json
          p_user_id: string
        }
        Returns: undefined
      }
      redeem_voucher_code: {
        Args: {
          p_amount_cents?: number
          p_booking_id?: string
          p_code: string
          p_notes?: string
        }
        Returns: Json
      }
      reset_employee_password: {
        Args: { new_password: string; user_email: string }
        Returns: Json
      }
      search_entities_by_codes: {
        Args: { codes: string[] }
        Returns: {
          codes_assigned: string[]
          entity_id: string
          entity_type: string
        }[]
      }
      use_client_package_session: {
        Args: { booking_id?: string; package_id: string }
        Returns: boolean
      }
      validate_user_role: {
        Args: { required_role: Database["public"]["Enums"]["user_role"] }
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
        | "requested"
        | "new"
        | "online"
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
        "requested",
        "new",
        "online",
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
