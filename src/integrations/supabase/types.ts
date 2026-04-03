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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      agent_faqs: {
        Row: {
          answer: string
          attendant_id: string
          created_at: string
          id: string
          is_active: boolean
          match_count: number
          question: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          answer: string
          attendant_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          match_count?: number
          question: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          answer?: string
          attendant_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          match_count?: number
          question?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_faqs_attendant_id_fkey"
            columns: ["attendant_id"]
            isOneToOne: false
            referencedRelation: "attendants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_faqs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_leads: {
        Row: {
          attendant_id: string
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          conversation_id: string | null
          created_at: string
          id: string
          source: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          attendant_id: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          conversation_id?: string | null
          created_at?: string
          id?: string
          source?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          attendant_id?: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          conversation_id?: string | null
          created_at?: string
          id?: string
          source?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_leads_attendant_id_fkey"
            columns: ["attendant_id"]
            isOneToOne: false
            referencedRelation: "attendants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_leads_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_leads_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_memories: {
        Row: {
          attendant_id: string
          consent_given: boolean | null
          contact_phone: string
          conversations_count: number | null
          created_at: string | null
          first_interaction_at: string
          id: string
          key_facts: Json
          last_interaction_at: string
          retention_until: string | null
          search_vector: unknown
          summary: string | null
          token_count: number | null
          updated_at: string | null
        }
        Insert: {
          attendant_id: string
          consent_given?: boolean | null
          contact_phone: string
          conversations_count?: number | null
          created_at?: string | null
          first_interaction_at?: string
          id?: string
          key_facts?: Json
          last_interaction_at?: string
          retention_until?: string | null
          search_vector?: unknown
          summary?: string | null
          token_count?: number | null
          updated_at?: string | null
        }
        Update: {
          attendant_id?: string
          consent_given?: boolean | null
          contact_phone?: string
          conversations_count?: number | null
          created_at?: string | null
          first_interaction_at?: string
          id?: string
          key_facts?: Json
          last_interaction_at?: string
          retention_until?: string | null
          search_vector?: unknown
          summary?: string | null
          token_count?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_memories_attendant_id_fkey"
            columns: ["attendant_id"]
            isOneToOne: false
            referencedRelation: "attendants"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_templates: {
        Row: {
          class: string
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          name: string
          prompt_template: string
          recommended_models: string[] | null
        }
        Insert: {
          class: string
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          prompt_template: string
          recommended_models?: string[] | null
        }
        Update: {
          class?: string
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          prompt_template?: string
          recommended_models?: string[] | null
        }
        Relationships: []
      }
      attendants: {
        Row: {
          active_skills: string[] | null
          channels: string[] | null
          class: string | null
          created_at: string
          icon: string | null
          id: string
          instructions: string | null
          model: string | null
          model_selection_reason: string | null
          name: string
          persona: string | null
          recommended_model: string | null
          status: string
          temperature: number | null
          template_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          active_skills?: string[] | null
          channels?: string[] | null
          class?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          instructions?: string | null
          model?: string | null
          model_selection_reason?: string | null
          name: string
          persona?: string | null
          recommended_model?: string | null
          status?: string
          temperature?: number | null
          template_id?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          active_skills?: string[] | null
          channels?: string[] | null
          class?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          instructions?: string | null
          model?: string | null
          model_selection_reason?: string | null
          name?: string
          persona?: string | null
          recommended_model?: string | null
          status?: string
          temperature?: number | null
          template_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendants_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "agent_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendants_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          admin_user_id: string
          created_at: string | null
          details: Json | null
          id: string
          tenant_id: string
        }
        Insert: {
          action: string
          admin_user_id: string
          created_at?: string | null
          details?: Json | null
          id?: string
          tenant_id: string
        }
        Update: {
          action?: string
          admin_user_id?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          tenant_id?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          attendant_id: string | null
          channel: string
          contact_name: string
          contact_phone: string | null
          ended_at: string | null
          escalation_count: number
          human_takeover: boolean | null
          id: string
          metadata: Json | null
          started_at: string
          status: string
          takeover_at: string | null
          takeover_by: string | null
          tenant_id: string
        }
        Insert: {
          attendant_id?: string | null
          channel?: string
          contact_name: string
          contact_phone?: string | null
          ended_at?: string | null
          escalation_count?: number
          human_takeover?: boolean | null
          id?: string
          metadata?: Json | null
          started_at?: string
          status?: string
          takeover_at?: string | null
          takeover_by?: string | null
          tenant_id: string
        }
        Update: {
          attendant_id?: string | null
          channel?: string
          contact_name?: string
          contact_phone?: string | null
          ended_at?: string | null
          escalation_count?: number
          human_takeover?: boolean | null
          id?: string
          metadata?: Json | null
          started_at?: string
          status?: string
          takeover_at?: string | null
          takeover_by?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_attendant_id_fkey"
            columns: ["attendant_id"]
            isOneToOne: false
            referencedRelation: "attendants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_base: {
        Row: {
          attendant_id: string | null
          chunk_index: number | null
          content: string
          created_at: string
          id: string
          is_archived: boolean | null
          metadata: Json | null
          search_vector: unknown
          source_name: string | null
          source_priority: number | null
          source_type: string
          source_url: string | null
          tenant_id: string
        }
        Insert: {
          attendant_id?: string | null
          chunk_index?: number | null
          content: string
          created_at?: string
          id?: string
          is_archived?: boolean | null
          metadata?: Json | null
          search_vector?: unknown
          source_name?: string | null
          source_priority?: number | null
          source_type?: string
          source_url?: string | null
          tenant_id: string
        }
        Update: {
          attendant_id?: string | null
          chunk_index?: number | null
          content?: string
          created_at?: string
          id?: string
          is_archived?: boolean | null
          metadata?: Json | null
          search_vector?: unknown
          source_name?: string | null
          source_priority?: number | null
          source_type?: string
          source_url?: string | null
          tenant_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          metadata: Json | null
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          metadata?: Json | null
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_data: Json | null
          action_resolved_at: string | null
          action_result: string | null
          action_type: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          message: string
          read: boolean | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          action_data?: Json | null
          action_resolved_at?: string | null
          action_result?: string | null
          action_type?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          message: string
          read?: boolean | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          action_data?: Json | null
          action_resolved_at?: string | null
          action_result?: string | null
          action_type?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          message?: string
          read?: boolean | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      phone_verifications: {
        Row: {
          attempts: number
          code: string
          created_at: string
          expires_at: string
          id: string
          max_attempts: number
          phone: string
          user_id: string
          verified_at: string | null
        }
        Insert: {
          attempts?: number
          code: string
          created_at?: string
          expires_at: string
          id?: string
          max_attempts?: number
          phone: string
          user_id: string
          verified_at?: string | null
        }
        Update: {
          attempts?: number
          code?: string
          created_at?: string
          expires_at?: string
          id?: string
          max_attempts?: number
          phone?: string
          user_id?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      plans: {
        Row: {
          created_at: string | null
          display_name: string
          features: Json | null
          id: string
          is_active: boolean | null
          max_agents: number
          max_conversations_month: number
          max_knowledge_docs: number
          max_knowledge_mb: number
          max_whatsapp_numbers: number
          price_monthly: number | null
        }
        Insert: {
          created_at?: string | null
          display_name: string
          features?: Json | null
          id: string
          is_active?: boolean | null
          max_agents?: number
          max_conversations_month?: number
          max_knowledge_docs?: number
          max_knowledge_mb?: number
          max_whatsapp_numbers?: number
          price_monthly?: number | null
        }
        Update: {
          created_at?: string | null
          display_name?: string
          features?: Json | null
          id?: string
          is_active?: boolean | null
          max_agents?: number
          max_conversations_month?: number
          max_knowledge_docs?: number
          max_knowledge_mb?: number
          max_whatsapp_numbers?: number
          price_monthly?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          completed_tours: string[] | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          phone_verified: boolean
          updated_at: string
          user_id: string
          username: string | null
          username_changed_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          completed_tours?: string[] | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          phone_verified?: boolean
          updated_at?: string
          user_id: string
          username?: string | null
          username_changed_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          completed_tours?: string[] | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          phone_verified?: boolean
          updated_at?: string
          user_id?: string
          username?: string | null
          username_changed_at?: string | null
        }
        Relationships: []
      }
      scraping_results: {
        Row: {
          attendant_id: string | null
          completed_at: string | null
          confirmed_data: Json | null
          created_at: string | null
          id: string
          platform: string
          profile_pic_url: string | null
          raw_data: Json | null
          source_url: string
          status: string | null
          tenant_id: string | null
        }
        Insert: {
          attendant_id?: string | null
          completed_at?: string | null
          confirmed_data?: Json | null
          created_at?: string | null
          id?: string
          platform: string
          profile_pic_url?: string | null
          raw_data?: Json | null
          source_url: string
          status?: string | null
          tenant_id?: string | null
        }
        Update: {
          attendant_id?: string | null
          completed_at?: string | null
          confirmed_data?: Json | null
          created_at?: string | null
          id?: string
          platform?: string
          profile_pic_url?: string | null
          raw_data?: Json | null
          source_url?: string
          status?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scraping_results_attendant_id_fkey"
            columns: ["attendant_id"]
            isOneToOne: false
            referencedRelation: "attendants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scraping_results_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      system_config: {
        Row: {
          id: string
          key: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string | null
          value: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string | null
          value?: Json
        }
        Relationships: []
      }
      tenants: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
          plan: string
          settings: Json | null
          slug: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id: string
          plan?: string
          settings?: Json | null
          slug: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          plan?: string
          settings?: Json | null
          slug?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_instances: {
        Row: {
          attendant_id: string | null
          connected_at: string | null
          created_at: string
          display_name: string | null
          id: string
          instance_name: string
          metadata: Json | null
          phone_number: string | null
          profile_pic_url: string | null
          qr_code: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          attendant_id?: string | null
          connected_at?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          instance_name: string
          metadata?: Json | null
          phone_number?: string | null
          profile_pic_url?: string | null
          qr_code?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          attendant_id?: string | null
          connected_at?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          instance_name?: string
          metadata?: Json | null
          phone_number?: string | null
          profile_pic_url?: string | null
          qr_code?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_instances_attendant_id_fkey"
            columns: ["attendant_id"]
            isOneToOne: false
            referencedRelation: "attendants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_instances_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      append_completed_tour: {
        Args: { p_tour_key: string; p_user_id: string }
        Returns: undefined
      }
      get_attendant_knowledge: {
        Args: { p_attendant_id: string; p_limit?: number }
        Returns: {
          content: string
          source_name: string
          source_type: string
        }[]
      }
      get_memory_token_limit: { Args: { p_tenant_id: string }; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      search_knowledge: {
        Args: { p_attendant_id: string; p_limit?: number; p_query: string }
        Returns: {
          content: string
          id: string
          relevance: number
          source_name: string
          source_priority: number
          source_type: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "client"
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
      app_role: ["admin", "client"],
    },
  },
} as const
