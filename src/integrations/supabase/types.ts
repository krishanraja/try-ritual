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
      bucket_list_items: {
        Row: {
          completed: boolean | null
          completed_ritual_id: string | null
          couple_id: string
          created_at: string
          description: string | null
          id: string
          original_image_url: string | null
          source: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean | null
          completed_ritual_id?: string | null
          couple_id: string
          created_at?: string
          description?: string | null
          id?: string
          original_image_url?: string | null
          source?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean | null
          completed_ritual_id?: string | null
          couple_id?: string
          created_at?: string
          description?: string | null
          id?: string
          original_image_url?: string | null
          source?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bucket_list_items_completed_ritual_id_fkey"
            columns: ["completed_ritual_id"]
            isOneToOne: false
            referencedRelation: "weekly_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bucket_list_items_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
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
          applied_promo_code: string | null
          code_expires_at: string | null
          couple_code: string
          created_at: string
          current_cycle_week_start: string | null
          id: string
          is_active: boolean | null
          partner_one: string
          partner_two: string | null
          preferred_city: string | null
          premium_expires_at: string | null
          stripe_customer_id: string | null
          subscription_id: string | null
          synthesis_ready: boolean | null
        }
        Insert: {
          applied_promo_code?: string | null
          code_expires_at?: string | null
          couple_code: string
          created_at?: string
          current_cycle_week_start?: string | null
          id?: string
          is_active?: boolean | null
          partner_one: string
          partner_two?: string | null
          preferred_city?: string | null
          premium_expires_at?: string | null
          stripe_customer_id?: string | null
          subscription_id?: string | null
          synthesis_ready?: boolean | null
        }
        Update: {
          applied_promo_code?: string | null
          code_expires_at?: string | null
          couple_code?: string
          created_at?: string
          current_cycle_week_start?: string | null
          id?: string
          is_active?: boolean | null
          partner_one?: string
          partner_two?: string | null
          preferred_city?: string | null
          premium_expires_at?: string | null
          stripe_customer_id?: string | null
          subscription_id?: string | null
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
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string | null
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string | null
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string | null
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      ritual_feedback: {
        Row: {
          connection_rating: number | null
          couple_id: string
          created_at: string
          did_complete: boolean | null
          id: string
          notes: string | null
          updated_at: string
          user_id: string | null
          weekly_cycle_id: string
          would_repeat: string | null
        }
        Insert: {
          connection_rating?: number | null
          couple_id: string
          created_at?: string
          did_complete?: boolean | null
          id?: string
          notes?: string | null
          updated_at?: string
          user_id?: string | null
          weekly_cycle_id: string
          would_repeat?: string | null
        }
        Update: {
          connection_rating?: number | null
          couple_id?: string
          created_at?: string
          did_complete?: boolean | null
          id?: string
          notes?: string | null
          updated_at?: string
          user_id?: string | null
          weekly_cycle_id?: string
          would_repeat?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ritual_feedback_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ritual_feedback_weekly_cycle_id_fkey"
            columns: ["weekly_cycle_id"]
            isOneToOne: false
            referencedRelation: "weekly_cycles"
            referencedColumns: ["id"]
          },
        ]
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
          is_tradition: boolean | null
          notes: string | null
          photo_url: string | null
          rating: number | null
          ritual_description: string | null
          ritual_title: string
          tradition_count: number | null
          updated_at: string
        }
        Insert: {
          completion_date: string
          couple_id: string
          created_at?: string
          id?: string
          is_tradition?: boolean | null
          notes?: string | null
          photo_url?: string | null
          rating?: number | null
          ritual_description?: string | null
          ritual_title: string
          tradition_count?: number | null
          updated_at?: string
        }
        Update: {
          completion_date?: string
          couple_id?: string
          created_at?: string
          id?: string
          is_tradition?: boolean | null
          notes?: string | null
          photo_url?: string | null
          rating?: number | null
          ritual_description?: string | null
          ritual_title?: string
          tradition_count?: number | null
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
      ritual_preferences: {
        Row: {
          created_at: string
          id: string
          proposed_date: string | null
          proposed_time: string | null
          rank: number
          ritual_data: Json
          ritual_title: string
          user_id: string
          weekly_cycle_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          proposed_date?: string | null
          proposed_time?: string | null
          rank: number
          ritual_data: Json
          ritual_title: string
          user_id: string
          weekly_cycle_id: string
        }
        Update: {
          created_at?: string
          id?: string
          proposed_date?: string | null
          proposed_time?: string | null
          rank?: number
          ritual_data?: Json
          ritual_title?: string
          user_id?: string
          weekly_cycle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ritual_preferences_weekly_cycle_id_fkey"
            columns: ["weekly_cycle_id"]
            isOneToOne: false
            referencedRelation: "weekly_cycles"
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
      surprise_rituals: {
        Row: {
          completed_at: string | null
          couple_id: string
          created_at: string | null
          delivered_at: string | null
          id: string
          month: string
          opened_at: string | null
          ritual_data: Json
        }
        Insert: {
          completed_at?: string | null
          couple_id: string
          created_at?: string | null
          delivered_at?: string | null
          id?: string
          month: string
          opened_at?: string | null
          ritual_data: Json
        }
        Update: {
          completed_at?: string | null
          couple_id?: string
          created_at?: string | null
          delivered_at?: string | null
          id?: string
          month?: string
          opened_at?: string | null
          ritual_data?: Json
        }
        Relationships: []
      }
      weekly_cycles: {
        Row: {
          agreed_date: string | null
          agreed_ritual: Json | null
          agreed_time: string | null
          agreement_reached: boolean | null
          canvas_state_one: Json | null
          canvas_state_two: Json | null
          couple_id: string
          created_at: string
          generated_at: string | null
          id: string
          nudge_count: number | null
          nudged_at: string | null
          partner_one_input: Json | null
          partner_one_submitted_at: string | null
          partner_two_input: Json | null
          partner_two_submitted_at: string | null
          swaps_used: number | null
          sync_completed_at: string | null
          synthesized_output: Json | null
          week_start_date: string
        }
        Insert: {
          agreed_date?: string | null
          agreed_ritual?: Json | null
          agreed_time?: string | null
          agreement_reached?: boolean | null
          canvas_state_one?: Json | null
          canvas_state_two?: Json | null
          couple_id: string
          created_at?: string
          generated_at?: string | null
          id?: string
          nudge_count?: number | null
          nudged_at?: string | null
          partner_one_input?: Json | null
          partner_one_submitted_at?: string | null
          partner_two_input?: Json | null
          partner_two_submitted_at?: string | null
          swaps_used?: number | null
          sync_completed_at?: string | null
          synthesized_output?: Json | null
          week_start_date: string
        }
        Update: {
          agreed_date?: string | null
          agreed_ritual?: Json | null
          agreed_time?: string | null
          agreement_reached?: boolean | null
          canvas_state_one?: Json | null
          canvas_state_two?: Json | null
          couple_id?: string
          created_at?: string
          generated_at?: string | null
          id?: string
          nudge_count?: number | null
          nudged_at?: string | null
          partner_one_input?: Json | null
          partner_one_submitted_at?: string | null
          partner_two_input?: Json | null
          partner_two_submitted_at?: string | null
          swaps_used?: number | null
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
