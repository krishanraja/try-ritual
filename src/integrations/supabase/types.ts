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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      completions: {
        Row: {
          completed_at: string
          created_at: string
          id: string
          ritual_title: string
          weekly_cycle_id: string
        }
        Insert: {
          completed_at?: string
          created_at?: string
          id?: string
          ritual_title: string
          weekly_cycle_id: string
        }
        Update: {
          completed_at?: string
          created_at?: string
          id?: string
          ritual_title?: string
          weekly_cycle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "completions_weekly_cycle_id_fkey"
            columns: ["weekly_cycle_id"]
            isOneToOne: false
            referencedRelation: "weekly_cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      couples: {
        Row: {
          code_expires_at: string | null
          couple_code: string
          created_at: string
          current_cycle_week_start: string | null
          id: string
          is_active: boolean | null
          partner_one: string
          partner_two: string | null
          preferred_city: string | null
          synthesis_ready: boolean | null
        }
        Insert: {
          code_expires_at?: string | null
          couple_code: string
          created_at?: string
          current_cycle_week_start?: string | null
          id?: string
          is_active?: boolean | null
          partner_one: string
          partner_two?: string | null
          preferred_city?: string | null
          synthesis_ready?: boolean | null
        }
        Update: {
          code_expires_at?: string | null
          couple_code?: string
          created_at?: string
          current_cycle_week_start?: string | null
          id?: string
          is_active?: boolean | null
          partner_one?: string
          partner_two?: string | null
          preferred_city?: string | null
          synthesis_ready?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "couples_partner_one_fkey"
            columns: ["partner_one"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "couples_partner_two_fkey"
            columns: ["partner_two"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string
          preferred_city: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
          name: string
          preferred_city?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          preferred_city?: string | null
        }
        Relationships: []
      }
      ritual_library: {
        Row: {
          budget_band: string
          category: string
          constraints: Json | null
          created_at: string
          description: string
          id: string
          time_estimate: string
          title: string
        }
        Insert: {
          budget_band: string
          category: string
          constraints?: Json | null
          created_at?: string
          description: string
          id?: string
          time_estimate: string
          title: string
        }
        Update: {
          budget_band?: string
          category?: string
          constraints?: Json | null
          created_at?: string
          description?: string
          id?: string
          time_estimate?: string
          title?: string
        }
        Relationships: []
      }
      ritual_memories: {
        Row: {
          completion_date: string
          couple_id: string
          created_at: string
          id: string
          notes: string | null
          photo_url: string | null
          rating: number | null
          ritual_description: string | null
          ritual_title: string
          updated_at: string
        }
        Insert: {
          completion_date: string
          couple_id: string
          created_at?: string
          id?: string
          notes?: string | null
          photo_url?: string | null
          rating?: number | null
          ritual_description?: string | null
          ritual_title: string
          updated_at?: string
        }
        Update: {
          completion_date?: string
          couple_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          photo_url?: string | null
          rating?: number | null
          ritual_description?: string | null
          ritual_title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ritual_memories_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      ritual_streaks: {
        Row: {
          couple_id: string
          created_at: string
          current_streak: number
          id: string
          last_completion_date: string | null
          longest_streak: number
          updated_at: string
        }
        Insert: {
          couple_id: string
          created_at?: string
          current_streak?: number
          id?: string
          last_completion_date?: string | null
          longest_streak?: number
          updated_at?: string
        }
        Update: {
          couple_id?: string
          created_at?: string
          current_streak?: number
          id?: string
          last_completion_date?: string | null
          longest_streak?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ritual_streaks_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: true
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      ritual_suggestions: {
        Row: {
          accepted: boolean | null
          based_on_history: Json | null
          couple_id: string
          created_at: string
          id: string
          reason: string
          shown_at: string
          suggested_ritual: Json
        }
        Insert: {
          accepted?: boolean | null
          based_on_history?: Json | null
          couple_id: string
          created_at?: string
          id?: string
          reason: string
          shown_at?: string
          suggested_ritual: Json
        }
        Update: {
          accepted?: boolean | null
          based_on_history?: Json | null
          couple_id?: string
          created_at?: string
          id?: string
          reason?: string
          shown_at?: string
          suggested_ritual?: Json
        }
        Relationships: [
          {
            foreignKeyName: "ritual_suggestions_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_cycles: {
        Row: {
          canvas_state_one: Json | null
          canvas_state_two: Json | null
          couple_id: string
          created_at: string
          generated_at: string | null
          id: string
          partner_one_input: Json | null
          partner_one_submitted_at: string | null
          partner_two_input: Json | null
          partner_two_submitted_at: string | null
          sync_completed_at: string | null
          synthesized_output: Json | null
          week_start_date: string
        }
        Insert: {
          canvas_state_one?: Json | null
          canvas_state_two?: Json | null
          couple_id: string
          created_at?: string
          generated_at?: string | null
          id?: string
          partner_one_input?: Json | null
          partner_one_submitted_at?: string | null
          partner_two_input?: Json | null
          partner_two_submitted_at?: string | null
          sync_completed_at?: string | null
          synthesized_output?: Json | null
          week_start_date: string
        }
        Update: {
          canvas_state_one?: Json | null
          canvas_state_two?: Json | null
          couple_id?: string
          created_at?: string
          generated_at?: string | null
          id?: string
          partner_one_input?: Json | null
          partner_one_submitted_at?: string | null
          partner_two_input?: Json | null
          partner_two_submitted_at?: string | null
          sync_completed_at?: string | null
          synthesized_output?: Json | null
          week_start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_cycles_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
