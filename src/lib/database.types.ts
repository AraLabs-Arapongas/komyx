export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      customers: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          organization_id: string
          updated_at: string
          whatsapp: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          organization_id: string
          updated_at?: string
          whatsapp: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          organization_id?: string
          updated_at?: string
          whatsapp?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      event_status_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          event_id: string
          from_status: Database["public"]["Enums"]["event_status"] | null
          id: number
          organization_id: string
          to_status: Database["public"]["Enums"]["event_status"]
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          event_id: string
          from_status?: Database["public"]["Enums"]["event_status"] | null
          id?: never
          organization_id: string
          to_status: Database["public"]["Enums"]["event_status"]
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          event_id?: string
          from_status?: Database["public"]["Enums"]["event_status"] | null
          id?: never
          organization_id?: string
          to_status?: Database["public"]["Enums"]["event_status"]
        }
        Relationships: [
          {
            foreignKeyName: "event_status_history_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_financials"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_status_history_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_status_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          cancelled_at: string | null
          confirmed_at: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          done_at: string | null
          ends_at: string
          estimated_participants: number | null
          expires_at: string | null
          id: string
          notes: string | null
          organization_id: string
          package_id: string | null
          space: string
          starts_at: string
          status: Database["public"]["Enums"]["event_status"]
          title: string | null
          updated_at: string
        }
        Insert: {
          cancelled_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          done_at?: string | null
          ends_at: string
          estimated_participants?: number | null
          expires_at?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          package_id?: string | null
          space?: string
          starts_at: string
          status?: Database["public"]["Enums"]["event_status"]
          title?: string | null
          updated_at?: string
        }
        Update: {
          cancelled_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          done_at?: string | null
          ends_at?: string
          estimated_participants?: number | null
          expires_at?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          package_id?: string | null
          space?: string
          starts_at?: string
          status?: Database["public"]["Enums"]["event_status"]
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
      }
      guests: {
        Row: {
          created_at: string
          event_id: string
          id: string
          name: string
          notes: string | null
          organization_id: string
          participants: number
          source: Database["public"]["Enums"]["guest_source"]
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          name: string
          notes?: string | null
          organization_id: string
          participants?: number
          source?: Database["public"]["Enums"]["guest_source"]
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          name?: string
          notes?: string | null
          organization_id?: string
          participants?: number
          source?: Database["public"]["Enums"]["guest_source"]
        }
        Relationships: [
          {
            foreignKeyName: "guests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_financials"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "guests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          address: string | null
          cover_url: string | null
          created_at: string
          default_event_duration_minutes: number
          description: string | null
          id: string
          instagram: string | null
          logo_url: string | null
          name: string
          pre_reservation_validity_hours: number
          slug: string
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          cover_url?: string | null
          created_at?: string
          default_event_duration_minutes?: number
          description?: string | null
          id?: string
          instagram?: string | null
          logo_url?: string | null
          name: string
          pre_reservation_validity_hours?: number
          slug: string
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          cover_url?: string | null
          created_at?: string
          default_event_duration_minutes?: number
          description?: string | null
          id?: string
          instagram?: string | null
          logo_url?: string | null
          name?: string
          pre_reservation_validity_hours?: number
          slug?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      package_addons: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          name: string
          organization_id: string
          price: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name: string
          organization_id: string
          price?: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          organization_id?: string
          price?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "package_addons_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      packages: {
        Row: {
          active: boolean
          additional_participant_price: number
          base_price: number
          created_at: string
          description: string | null
          id: string
          included_participants: number
          name: string
          organization_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          additional_participant_price?: number
          base_price?: number
          created_at?: string
          description?: string | null
          id?: string
          included_participants?: number
          name: string
          organization_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          additional_participant_price?: number
          base_price?: number
          created_at?: string
          description?: string | null
          id?: string
          included_participants?: number
          name?: string
          organization_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "packages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          event_id: string
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          notes: string | null
          organization_id: string
          paid_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          event_id: string
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          organization_id: string
          paid_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          event_id?: string
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          organization_id?: string
          paid_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_financials"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "payments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
          organization_id: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          name: string
          organization_id: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      public_links: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          event_id: string
          expires_at: string | null
          id: string
          organization_id: string
          token: string
          type: Database["public"]["Enums"]["public_link_type"]
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          event_id: string
          expires_at?: string | null
          id?: string
          organization_id: string
          token?: string
          type?: Database["public"]["Enums"]["public_link_type"]
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          event_id?: string
          expires_at?: string | null
          id?: string
          organization_id?: string
          token?: string
          type?: Database["public"]["Enums"]["public_link_type"]
        }
        Relationships: [
          {
            foreignKeyName: "public_links_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_financials"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "public_links_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "public_links_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      public_requests: {
        Row: {
          created_at: string
          desired_date: string | null
          desired_time: string | null
          event_id: string | null
          id: string
          message: string | null
          name: string
          organization_id: string
          participants: number | null
          status: Database["public"]["Enums"]["public_request_status"]
          updated_at: string
          whatsapp: string
        }
        Insert: {
          created_at?: string
          desired_date?: string | null
          desired_time?: string | null
          event_id?: string | null
          id?: string
          message?: string | null
          name: string
          organization_id: string
          participants?: number | null
          status?: Database["public"]["Enums"]["public_request_status"]
          updated_at?: string
          whatsapp: string
        }
        Update: {
          created_at?: string
          desired_date?: string | null
          desired_time?: string | null
          event_id?: string | null
          id?: string
          message?: string | null
          name?: string
          organization_id?: string
          participants?: number | null
          status?: Database["public"]["Enums"]["public_request_status"]
          updated_at?: string
          whatsapp?: string
        }
        Relationships: [
          {
            foreignKeyName: "public_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_financials"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "public_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "public_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_items: {
        Row: {
          addon_id: string | null
          created_at: string
          description: string
          id: string
          kind: Database["public"]["Enums"]["quote_item_kind"]
          organization_id: string
          quantity: number
          quote_id: string
          sort_order: number
          total: number | null
          unit_price: number
        }
        Insert: {
          addon_id?: string | null
          created_at?: string
          description: string
          id?: string
          kind?: Database["public"]["Enums"]["quote_item_kind"]
          organization_id: string
          quantity?: number
          quote_id: string
          sort_order?: number
          total?: number | null
          unit_price?: number
        }
        Update: {
          addon_id?: string | null
          created_at?: string
          description?: string
          id?: string
          kind?: Database["public"]["Enums"]["quote_item_kind"]
          organization_id?: string
          quantity?: number
          quote_id?: string
          sort_order?: number
          total?: number | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "quote_items_addon_id_fkey"
            columns: ["addon_id"]
            isOneToOne: false
            referencedRelation: "package_addons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_items_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "event_financials"
            referencedColumns: ["quote_id"]
          },
          {
            foreignKeyName: "quote_items_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          created_at: string
          created_by: string | null
          decided_at: string | null
          discount_total: number
          discount_type: Database["public"]["Enums"]["discount_type"]
          discount_value: number
          event_id: string
          id: string
          notes: string | null
          organization_id: string
          package_id: string | null
          participants: number
          sent_at: string | null
          status: Database["public"]["Enums"]["quote_status"]
          subtotal: number
          total: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          decided_at?: string | null
          discount_total?: number
          discount_type?: Database["public"]["Enums"]["discount_type"]
          discount_value?: number
          event_id: string
          id?: string
          notes?: string | null
          organization_id: string
          package_id?: string | null
          participants?: number
          sent_at?: string | null
          status?: Database["public"]["Enums"]["quote_status"]
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          decided_at?: string | null
          discount_total?: number
          discount_type?: Database["public"]["Enums"]["discount_type"]
          discount_value?: number
          event_id?: string
          id?: string
          notes?: string | null
          organization_id?: string
          package_id?: string | null
          participants?: number
          sent_at?: string | null
          status?: Database["public"]["Enums"]["quote_status"]
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotes_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_financials"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "quotes_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      event_financials: {
        Row: {
          balance: number | null
          event_id: string | null
          guest_count: number | null
          organization_id: string | null
          paid_total: number | null
          participants_total: number | null
          payment_status: string | null
          quote_id: string | null
          quote_status: Database["public"]["Enums"]["quote_status"] | null
          quote_total: number | null
        }
        Relationships: [
          {
            foreignKeyName: "events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      expire_pre_reservations: { Args: never; Returns: number }
    }
    Enums: {
      discount_type: "AMOUNT" | "PERCENT"
      event_status:
        | "PRE_RESERVED"
        | "CONFIRMED"
        | "DONE"
        | "CANCELLED"
        | "EXPIRED"
      guest_source: "MANUAL" | "PUBLIC"
      payment_method: "PIX" | "CASH" | "CARD" | "TRANSFER" | "OTHER"
      public_link_type: "GUEST_CONFIRM" | "QUOTE"
      public_request_status: "NEW" | "CONVERTED" | "ARCHIVED"
      quote_item_kind: "PACKAGE" | "ADDON" | "EXTRA_PARTICIPANTS" | "CUSTOM"
      quote_status: "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED"
      user_role: "owner" | "staff"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      discount_type: ["AMOUNT", "PERCENT"],
      event_status: [
        "PRE_RESERVED",
        "CONFIRMED",
        "DONE",
        "CANCELLED",
        "EXPIRED",
      ],
      guest_source: ["MANUAL", "PUBLIC"],
      payment_method: ["PIX", "CASH", "CARD", "TRANSFER", "OTHER"],
      public_link_type: ["GUEST_CONFIRM", "QUOTE"],
      public_request_status: ["NEW", "CONVERTED", "ARCHIVED"],
      quote_item_kind: ["PACKAGE", "ADDON", "EXTRA_PARTICIPANTS", "CUSTOM"],
      quote_status: ["DRAFT", "SENT", "ACCEPTED", "REJECTED"],
      user_role: ["owner", "staff"],
    },
  },
} as const

