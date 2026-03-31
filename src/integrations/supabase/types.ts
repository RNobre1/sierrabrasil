export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
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
      conversations: {
        Row: {
          attendant_id: string | null
          channel: string
          contact_name: string
          contact_phone: string | null
          ended_at: string | null
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
          metadata: Json | null
          search_vector: unknown
          source_name: string | null
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
          metadata?: Json | null
          search_vector?: unknown
          source_name?: string | null
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
          metadata?: Json | null
          search_vector?: unknown
          source_name?: string | null
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
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string
          username: string | null
          username_changed_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
          username?: string | null
          username_changed_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
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
      get_attendant_knowledge: {
        Args: { p_attendant_id: string; p_limit?: number }
        Returns: {
          content: string
          source_name: string
          source_type: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof Database
}
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof Database
}
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof Database
}
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof Database
}
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never
