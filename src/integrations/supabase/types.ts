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
      audio_hook_jobs: {
        Row: {
          audio_url: string | null
          call_to_actions: Json | null
          created_at: string | null
          error: string | null
          id: string
          paper_id: number
          script: string | null
          status: string
          sub_persona_id: string
        }
        Insert: {
          audio_url?: string | null
          call_to_actions?: Json | null
          created_at?: string | null
          error?: string | null
          id?: string
          paper_id: number
          script?: string | null
          status?: string
          sub_persona_id: string
        }
        Update: {
          audio_url?: string | null
          call_to_actions?: Json | null
          created_at?: string | null
          error?: string | null
          id?: string
          paper_id?: number
          script?: string | null
          status?: string
          sub_persona_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audio_hook_jobs_paper_id_fkey"
            columns: ["paper_id"]
            isOneToOne: false
            referencedRelation: "papers"
            referencedColumns: ["id"]
          },
        ]
      }
      chunks: {
        Row: {
          chunk_id: string
          chunk_type: string | null
          content: string
          embedding: string | null
          id: number
          module_relevance: Json
          page_numbers: number[]
          paper_id: number
          source_ids: string[]
        }
        Insert: {
          chunk_id: string
          chunk_type?: string | null
          content: string
          embedding?: string | null
          id?: never
          module_relevance?: Json
          page_numbers?: number[]
          paper_id: number
          source_ids?: string[]
        }
        Update: {
          chunk_id?: string
          chunk_type?: string | null
          content?: string
          embedding?: string | null
          id?: never
          module_relevance?: Json
          page_numbers?: number[]
          paper_id?: number
          source_ids?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "chunks_paper_id_fkey"
            columns: ["paper_id"]
            isOneToOne: false
            referencedRelation: "papers"
            referencedColumns: ["id"]
          },
        ]
      }
      digital_lab_inventory: {
        Row: {
          created_at: string | null
          description: string | null
          id: number
          item_name: string
          item_type: string
          manufacturer: string | null
          model_number: string | null
          quantity: number | null
          specifications: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: never
          item_name: string
          item_type: string
          manufacturer?: string | null
          model_number?: string | null
          quantity?: number | null
          specifications?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: never
          item_name?: string
          item_type?: string
          manufacturer?: string | null
          model_number?: string | null
          quantity?: number | null
          specifications?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "digital_lab_inventory_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_content_cache: {
        Row: {
          content: Json
          content_type: string
          created_at: string | null
          id: number
          module_id: string | null
          paper_id: number
          persona_id: string
          source_chunks: string[] | null
        }
        Insert: {
          content: Json
          content_type: string
          created_at?: string | null
          id?: never
          module_id?: string | null
          paper_id: number
          persona_id: string
          source_chunks?: string[] | null
        }
        Update: {
          content?: Json
          content_type?: string
          created_at?: string | null
          id?: never
          module_id?: string | null
          paper_id?: number
          persona_id?: string
          source_chunks?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "generated_content_cache_paper_id_fkey"
            columns: ["paper_id"]
            isOneToOne: false
            referencedRelation: "papers"
            referencedColumns: ["id"]
          },
        ]
      }
      infographic_jobs: {
        Row: {
          created_at: string
          debug: Json | null
          error: string | null
          id: string
          image_url: string | null
          paper_id: number
          policy_relevance_score: number | null
          reason: string | null
          status: string
          sub_persona_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          debug?: Json | null
          error?: string | null
          id?: string
          image_url?: string | null
          paper_id: number
          policy_relevance_score?: number | null
          reason?: string | null
          status?: string
          sub_persona_id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          debug?: Json | null
          error?: string | null
          id?: string
          image_url?: string | null
          paper_id?: number
          policy_relevance_score?: number | null
          reason?: string | null
          status?: string
          sub_persona_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "infographic_jobs_paper_id_fkey"
            columns: ["paper_id"]
            isOneToOne: false
            referencedRelation: "papers"
            referencedColumns: ["id"]
          },
        ]
      }
      paper_api_keys: {
        Row: {
          api_key_hash: string
          api_key_prefix: string
          created_at: string
          id: string
          label: string
          last_used_at: string | null
          user_id: string
        }
        Insert: {
          api_key_hash: string
          api_key_prefix: string
          created_at?: string
          id?: string
          label?: string
          last_used_at?: string | null
          user_id: string
        }
        Update: {
          api_key_hash?: string
          api_key_prefix?: string
          created_at?: string
          id?: string
          label?: string
          last_used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      papers: {
        Row: {
          abstract: string | null
          author_impact_scores: Json | null
          authors: Json | null
          created_at: string | null
          doi: string | null
          error_message: string | null
          file_size: number | null
          id: number
          journal: string | null
          num_pages: number | null
          publication_date: string | null
          selected_personas: Json
          simulated_impact_scores: Json | null
          source_type: string | null
          status: string
          storage_path: string | null
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          abstract?: string | null
          author_impact_scores?: Json | null
          authors?: Json | null
          created_at?: string | null
          doi?: string | null
          error_message?: string | null
          file_size?: number | null
          id?: never
          journal?: string | null
          num_pages?: number | null
          publication_date?: string | null
          selected_personas?: Json
          simulated_impact_scores?: Json | null
          source_type?: string | null
          status?: string
          storage_path?: string | null
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          abstract?: string | null
          author_impact_scores?: Json | null
          authors?: Json | null
          created_at?: string | null
          doi?: string | null
          error_message?: string | null
          file_size?: number | null
          id?: never
          journal?: string | null
          num_pages?: number | null
          publication_date?: string | null
          selected_personas?: Json
          simulated_impact_scores?: Json | null
          source_type?: string | null
          status?: string
          storage_path?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "papers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          experience_keywords: string[] | null
          full_name: string | null
          id: string
          institution: string | null
          location: string | null
          orcid: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          experience_keywords?: string[] | null
          full_name?: string | null
          id: string
          institution?: string | null
          location?: string | null
          orcid?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          experience_keywords?: string[] | null
          full_name?: string | null
          id?: string
          institution?: string | null
          location?: string | null
          orcid?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      structured_papers: {
        Row: {
          abstract: string | null
          author_enrichments: Json
          call_to_actions: Json
          claims: Json
          created_at: string | null
          equations: Json
          figures: Json
          metadata: Json
          methods: Json
          negative_results: Json
          paper_id: number
          references_list: Json
          schema_version: string | null
          scicomm_hooks: Json
          sections: Json
          tables_data: Json
        }
        Insert: {
          abstract?: string | null
          author_enrichments?: Json
          call_to_actions?: Json
          claims?: Json
          created_at?: string | null
          equations?: Json
          figures?: Json
          metadata?: Json
          methods?: Json
          negative_results?: Json
          paper_id: number
          references_list?: Json
          schema_version?: string | null
          scicomm_hooks?: Json
          sections?: Json
          tables_data?: Json
        }
        Update: {
          abstract?: string | null
          author_enrichments?: Json
          call_to_actions?: Json
          claims?: Json
          created_at?: string | null
          equations?: Json
          figures?: Json
          metadata?: Json
          methods?: Json
          negative_results?: Json
          paper_id?: number
          references_list?: Json
          schema_version?: string | null
          scicomm_hooks?: Json
          sections?: Json
          tables_data?: Json
        }
        Relationships: [
          {
            foreignKeyName: "structured_papers_paper_id_fkey"
            columns: ["paper_id"]
            isOneToOne: true
            referencedRelation: "papers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_activity_events: {
        Row: {
          created_at: string | null
          event_type: string
          id: number
          paper_id: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: never
          paper_id?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: never
          paper_id?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_activity_events_paper_id_fkey"
            columns: ["paper_id"]
            isOneToOne: false
            referencedRelation: "papers"
            referencedColumns: ["id"]
          },
        ]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      match_chunks: {
        Args: {
          p_match_count?: number
          p_match_threshold?: number
          p_module_id?: string
          p_paper_id: number
          p_query_embedding: string
        }
        Returns: {
          chunk_id: string
          chunk_type: string
          content: string
          module_relevance: Json
          page_numbers: number[]
          similarity: number
          source_ids: string[]
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
