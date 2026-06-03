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
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      closer_config: {
        Row: {
          cash_per_call_target: number
          closing_rate_target: number
          created_at: string
          daily_clients_target: number
          daily_units_target: number
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cash_per_call_target?: number
          closing_rate_target?: number
          created_at?: string
          daily_clients_target?: number
          daily_units_target?: number
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cash_per_call_target?: number
          closing_rate_target?: number
          created_at?: string
          daily_clients_target?: number
          daily_units_target?: number
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      closer_kpi_entries: {
        Row: {
          calls_made: number
          cash_collected: number
          clients_signed: number
          created_at: string
          date: string
          id: string
          notes: string | null
          units_sold: number
          updated_at: string
          user_id: string
        }
        Insert: {
          calls_made?: number
          cash_collected?: number
          clients_signed?: number
          created_at?: string
          date: string
          id?: string
          notes?: string | null
          units_sold?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          calls_made?: number
          cash_collected?: number
          clients_signed?: number
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          units_sold?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      confirmed_bookings: {
        Row: {
          auto_follow_up_enabled: boolean | null
          closer_user_id: string | null
          created_at: string
          email: string | null
          follow_up_notes: string[] | null
          follow_up_sequence: number | null
          id: string
          ig_handle: string | null
          last_contact_date: string | null
          name: string
          next_follow_up_date: string | null
          notes: string | null
          phone: string | null
          prospect_id: string
          setter_user_id: string
          status: string
          updated_at: string
        }
        Insert: {
          auto_follow_up_enabled?: boolean | null
          closer_user_id?: string | null
          created_at?: string
          email?: string | null
          follow_up_notes?: string[] | null
          follow_up_sequence?: number | null
          id?: string
          ig_handle?: string | null
          last_contact_date?: string | null
          name: string
          next_follow_up_date?: string | null
          notes?: string | null
          phone?: string | null
          prospect_id: string
          setter_user_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          auto_follow_up_enabled?: boolean | null
          closer_user_id?: string | null
          created_at?: string
          email?: string | null
          follow_up_notes?: string[] | null
          follow_up_sequence?: number | null
          id?: string
          ig_handle?: string | null
          last_contact_date?: string | null
          name?: string
          next_follow_up_date?: string | null
          notes?: string | null
          phone?: string | null
          prospect_id?: string
          setter_user_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "confirmed_bookings_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      csm_config: {
        Row: {
          created_at: string
          daily_check_ins_target: number
          daily_issues_target: number
          id: string
          monthly_upsells_target: number
          retention_target: number
          satisfaction_target: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          daily_check_ins_target?: number
          daily_issues_target?: number
          id?: string
          monthly_upsells_target?: number
          retention_target?: number
          satisfaction_target?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          daily_check_ins_target?: number
          daily_issues_target?: number
          id?: string
          monthly_upsells_target?: number
          retention_target?: number
          satisfaction_target?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      csm_kpi_entries: {
        Row: {
          client_check_ins: number
          client_satisfaction_score: number | null
          created_at: string
          date: string
          id: string
          issues_resolved: number
          notes: string | null
          retention_rate: number | null
          updated_at: string
          upsells_completed: number
          user_id: string
        }
        Insert: {
          client_check_ins?: number
          client_satisfaction_score?: number | null
          created_at?: string
          date: string
          id?: string
          issues_resolved?: number
          notes?: string | null
          retention_rate?: number | null
          updated_at?: string
          upsells_completed?: number
          user_id: string
        }
        Update: {
          client_check_ins?: number
          client_satisfaction_score?: number | null
          created_at?: string
          date?: string
          id?: string
          issues_resolved?: number
          notes?: string | null
          retention_rate?: number | null
          updated_at?: string
          upsells_completed?: number
          user_id?: string
        }
        Relationships: []
      }
      kpi_share_tokens: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          kpi_type: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          kpi_type: string
          token?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          kpi_type?: string
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          company: string | null
          created_at: string
          current_customer: boolean | null
          date: string
          email: string | null
          follow_up_date: string | null
          forklift_access: boolean | null
          id: string
          last_contact: string | null
          ltv_not_sure: boolean | null
          ltv_pallet_type: string | null
          ltv_pallets_per_month: number | null
          ltv_price_per_pallet: number | null
          name: string
          notes: string | null
          pallet_needs: string | null
          phone: string | null
          service_type: string | null
          status: string
          submitted_date: string | null
          tags: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          current_customer?: boolean | null
          date?: string
          email?: string | null
          follow_up_date?: string | null
          forklift_access?: boolean | null
          id?: string
          last_contact?: string | null
          ltv_not_sure?: boolean | null
          ltv_pallet_type?: string | null
          ltv_pallets_per_month?: number | null
          ltv_price_per_pallet?: number | null
          name: string
          notes?: string | null
          pallet_needs?: string | null
          phone?: string | null
          service_type?: string | null
          status?: string
          submitted_date?: string | null
          tags?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company?: string | null
          created_at?: string
          current_customer?: boolean | null
          date?: string
          email?: string | null
          follow_up_date?: string | null
          forklift_access?: boolean | null
          id?: string
          last_contact?: string | null
          ltv_not_sure?: boolean | null
          ltv_pallet_type?: string | null
          ltv_pallets_per_month?: number | null
          ltv_price_per_pallet?: number | null
          name?: string
          notes?: string | null
          pallet_needs?: string | null
          phone?: string | null
          service_type?: string | null
          status?: string
          submitted_date?: string | null
          tags?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      no_call_no_shows: {
        Row: {
          created_at: string
          date: string
          email: string | null
          first_name: string
          id: string
          last_name: string
          notes: string | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date?: string
          email?: string | null
          first_name: string
          id?: string
          last_name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          email?: string | null
          first_name?: string
          id?: string
          last_name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      prospect_activity: {
        Row: {
          created_at: string
          event_date: string
          event_time: string
          event_type: Database["public"]["Enums"]["prospect_event_type"]
          id: string
          metadata: Json
          prospect_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_date?: string
          event_time?: string
          event_type: Database["public"]["Enums"]["prospect_event_type"]
          id?: string
          metadata?: Json
          prospect_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_date?: string
          event_time?: string
          event_type?: Database["public"]["Enums"]["prospect_event_type"]
          id?: string
          metadata?: Json
          prospect_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      prospects: {
        Row: {
          created_at: string
          email: string | null
          follow_up_count: number
          id: string
          ig_handle: string | null
          last_contact_date: string | null
          name: string
          notes: string | null
          phone: string | null
          status: string
          training_reminder_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          follow_up_count?: number
          id?: string
          ig_handle?: string | null
          last_contact_date?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          status?: string
          training_reminder_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          follow_up_count?: number
          id?: string
          ig_handle?: string | null
          last_contact_date?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          status?: string
          training_reminder_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      setter_config: {
        Row: {
          created_at: string
          daily_calls_booked_target: number
          daily_touch_points_target: number
          id: string
          pitch_to_book_ratio_target: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          daily_calls_booked_target?: number
          daily_touch_points_target?: number
          id?: string
          pitch_to_book_ratio_target?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          daily_calls_booked_target?: number
          daily_touch_points_target?: number
          id?: string
          pitch_to_book_ratio_target?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      setter_kpi_entries: {
        Row: {
          calls_booked: number
          calls_pitched: number
          created_at: string
          date: string
          id: string
          notes: string | null
          touch_points: number
          updated_at: string
          user_id: string
        }
        Insert: {
          calls_booked?: number
          calls_pitched?: number
          created_at?: string
          date: string
          id?: string
          notes?: string | null
          touch_points?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          calls_booked?: number
          calls_pitched?: number
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          touch_points?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_next_follow_up_date: {
        Args: { current_sequence: number; last_contact: string }
        Returns: string
      }
    }
    Enums: {
      prospect_event_type:
        | "touch_point"
        | "call_pitched"
        | "call_booked"
        | "status_change"
        | "note_added"
        | "follow_up_increment"
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
      prospect_event_type: [
        "touch_point",
        "call_pitched",
        "call_booked",
        "status_change",
        "note_added",
        "follow_up_increment",
      ],
    },
  },
} as const
