export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      allowed_embed_domains: {
        Row: {
          created_at: string
          domain: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          domain: string
          id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          domain?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      anime: {
        Row: {
          created_at: string
          id: string
          is_published: boolean
          poster_path: string | null
          alt_title: string | null
          duration_minutes: number | null
          rating: number | null
          studio: string | null
          total_episodes: number | null
          season: string | null
          slug: string
          status: Database["public"]["Enums"]["anime_status"]
          synopsis: string | null
          title: string
          type: Database["public"]["Enums"]["anime_type"]
          updated_at: string
          year: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_published?: boolean
          poster_path?: string | null
          alt_title?: string | null
          duration_minutes?: number | null
          rating?: number | null
          studio?: string | null
          total_episodes?: number | null
          season?: string | null
          slug: string
          status?: Database["public"]["Enums"]["anime_status"]
          synopsis?: string | null
          title: string
          type?: Database["public"]["Enums"]["anime_type"]
          updated_at?: string
          year?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          is_published?: boolean
          poster_path?: string | null
          alt_title?: string | null
          duration_minutes?: number | null
          rating?: number | null
          studio?: string | null
          total_episodes?: number | null
          season?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["anime_status"]
          synopsis?: string | null
          title?: string
          type?: Database["public"]["Enums"]["anime_type"]
          updated_at?: string
          year?: number | null
        }
        Relationships: []
      }
      anime_tags: {
        Row: {
          anime_id: string
          created_at: string
          tag_id: string
        }
        Insert: {
          anime_id: string
          created_at?: string
          tag_id: string
        }
        Update: {
          anime_id?: string
          created_at?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "anime_tags_anime_id_fkey"
            columns: ["anime_id"]
            isOneToOne: false
            referencedRelation: "anime"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anime_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      episode_comments: {
        Row: { id: string; episode_id: string; parent_id: string | null; author_name: string; public_content: string | null; status: string; created_at: string }
        Insert: { id?: string }
        Update: { status?: string }
        Relationships: []
      }
      episodes: {
        Row: {
          anime_id: string
          created_at: string
          embed_url: string | null
          number: number | null
          id: string
          is_published: boolean
          published_at: string | null
          special_label: "ova" | "ona" | "special" | "extra" | "final" | null
          thumbnail_path: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          anime_id: string
          created_at?: string
          embed_url?: string | null
          number: number | null
          id?: string
          is_published?: boolean
          published_at?: string | null
          special_label?: "ova" | "ona" | "special" | "extra" | "final" | null
          thumbnail_path?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          anime_id?: string
          created_at?: string
          embed_url?: string | null
          number?: number | null
          id?: string
          is_published?: boolean
          published_at?: string | null
          special_label?: "ova" | "ona" | "special" | "extra" | "final" | null
          thumbnail_path?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "episodes_anime_id_fkey"
            columns: ["anime_id"]
            isOneToOne: false
            referencedRelation: "anime"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          ad_slots: Json
          created_at: string
          footer_text: string | null
          hero: Json
          id: number
          logo_path: string | null
          site_name: string
          tagline: string | null
          updated_at: string
        }
        Insert: {
          ad_slots?: Json
          created_at?: string
          footer_text?: string | null
          hero?: Json
          id?: number
          logo_path?: string | null
          site_name?: string
          tagline?: string | null
          updated_at?: string
        }
        Update: {
          ad_slots?: Json
          created_at?: string
          footer_text?: string | null
          hero?: Json
          id?: number
          logo_path?: string | null
          site_name?: string
          tagline?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      tags: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      get_episode_comments: {
        Args: { _episode_id: string }
        Returns: { id: string; parent_id: string | null; author_name: string; content: string; is_hidden: boolean; created_at: string }[]
      }
      submit_guest_comment: {
        Args: { _episode_id: string; _content: string; _author_name?: string | null; _email?: string | null; _parent_id?: string | null; _client_token?: string | null; _honeypot?: string | null }
        Returns: string
      }
      admin_list_comments: {
        Args: Record<PropertyKey, never>
        Returns: { id: string; episode_id: string; parent_id: string | null; author_name: string; email: string | null; content: string; status: string; created_at: string; anime_id: string; anime_title: string; episode_number: number | null; special_label: string | null }[]
      }
      save_ad_slot: {
        Args: { _code: string; _enabled: boolean; _slot: string }
        Returns: undefined
      }
    }
    Enums: {
      anime_status: "ongoing" | "completed" | "upcoming"
      anime_type: "tv" | "movie" | "ova" | "ona" | "special"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals["public"]["Tables"] &
      DatabaseWithoutInternals["public"]["Views"])[TableName] extends {
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals["public"]["Tables"][TableName] extends {
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals["public"]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
    : never

export type Enums<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends keyof DefaultSchema["Enums"] = never,
> = DefaultSchema["Enums"][EnumName]

export type CompositeTypes<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends keyof DefaultSchema["CompositeTypes"] = never,
> = DefaultSchema["CompositeTypes"][CompositeTypeName]

export const Constants = {
  public: {
    Enums: {
      anime_status: ["ongoing", "completed", "upcoming"],
      anime_type: ["tv", "movie", "ova", "ona", "special"],
      app_role: ["admin", "user"],
    },
  },
} as const
