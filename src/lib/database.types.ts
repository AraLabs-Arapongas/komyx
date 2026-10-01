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
      celebrants: {
        Row: {
          birth_date: string
          created_at: string
          customer_id: string
          event_id: string | null
          id: string
          name: string
          notes: string | null
          organization_id: string
          promo_muted_until: string | null
        }
        Insert: {
          birth_date: string
          created_at?: string
          customer_id: string
          event_id?: string | null
          id?: string
          name: string
          notes?: string | null
          organization_id: string
          promo_muted_until?: string | null
        }
        Update: {
          birth_date?: string
          created_at?: string
          customer_id?: string
          event_id?: string | null
          id?: string
          name?: string
          notes?: string | null
          organization_id?: string
          promo_muted_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "celebrants_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "celebrants_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_financials"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "celebrants_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "celebrants_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_org_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "celebrants_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          accepted_at: string | null
          accepted_ip: string | null
          accepted_name: string | null
          content: string
          created_at: string
          created_by: string | null
          event_id: string
          id: string
          number: number
          organization_id: string
          quote_id: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["contract_status"]
          token: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_ip?: string | null
          accepted_name?: string | null
          content: string
          created_at?: string
          created_by?: string | null
          event_id: string
          id?: string
          number?: number
          organization_id: string
          quote_id?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["contract_status"]
          token?: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_ip?: string | null
          accepted_name?: string | null
          content?: string
          created_at?: string
          created_by?: string | null
          event_id?: string
          id?: string
          number?: number
          organization_id?: string
          quote_id?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["contract_status"]
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_financials"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "contracts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_org_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "contracts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "event_financials"
            referencedColumns: ["quote_id"]
          },
          {
            foreignKeyName: "contracts_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          created_at: string
          document: string | null
          email: string | null
          id: string
          marketing_opt_in: boolean
          name: string
          notes: string | null
          organization_id: string
          source: string | null
          updated_at: string
          whatsapp: string
        }
        Insert: {
          created_at?: string
          document?: string | null
          email?: string | null
          id?: string
          marketing_opt_in?: boolean
          name: string
          notes?: string | null
          organization_id: string
          source?: string | null
          updated_at?: string
          whatsapp: string
        }
        Update: {
          created_at?: string
          document?: string | null
          email?: string | null
          id?: string
          marketing_opt_in?: boolean
          name?: string
          notes?: string | null
          organization_id?: string
          source?: string | null
          updated_at?: string
          whatsapp?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_org_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "customers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      event_extras: {
        Row: {
          addon_id: string | null
          created_at: string
          created_by: string | null
          description: string
          event_id: string
          id: string
          organization_id: string
          quantity: number
          source: string
          total: number | null
          unit_price: number
        }
        Insert: {
          addon_id?: string | null
          created_at?: string
          created_by?: string | null
          description: string
          event_id: string
          id?: string
          organization_id: string
          quantity?: number
          source?: string
          total?: number | null
          unit_price?: number
        }
        Update: {
          addon_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          event_id?: string
          id?: string
          organization_id?: string
          quantity?: number
          source?: string
          total?: number | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "event_extras_addon_id_fkey"
            columns: ["addon_id"]
            isOneToOne: false
            referencedRelation: "package_addons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_extras_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_financials"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_extras_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_extras_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_org_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "event_extras_organization_id_fkey"
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
            referencedRelation: "admin_org_stats"
            referencedColumns: ["organization_id"]
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
          adults: number | null
          cancelled_at: string | null
          celebrant_age: number | null
          celebrant_name: string | null
          children: number | null
          confirmed_at: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          done_at: string | null
          ends_at: string
          estimated_participants: number | null
          expires_at: string | null
          id: string
          invite_image_url: string | null
          invite_message: string | null
          invite_title: string | null
          invite_updated_at: string | null
          notes: string | null
          occasion: string | null
          organization_id: string
          origin: string
          package_id: string | null
          pix_txid: string | null
          space: string
          starts_at: string
          status: Database["public"]["Enums"]["event_status"]
          title: string | null
          updated_at: string
        }
        Insert: {
          adults?: number | null
          cancelled_at?: string | null
          celebrant_age?: number | null
          celebrant_name?: string | null
          children?: number | null
          confirmed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          done_at?: string | null
          ends_at: string
          estimated_participants?: number | null
          expires_at?: string | null
          id?: string
          invite_image_url?: string | null
          invite_message?: string | null
          invite_title?: string | null
          invite_updated_at?: string | null
          notes?: string | null
          occasion?: string | null
          organization_id: string
          origin?: string
          package_id?: string | null
          pix_txid?: string | null
          space?: string
          starts_at: string
          status?: Database["public"]["Enums"]["event_status"]
          title?: string | null
          updated_at?: string
        }
        Update: {
          adults?: number | null
          cancelled_at?: string | null
          celebrant_age?: number | null
          celebrant_name?: string | null
          children?: number | null
          confirmed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          done_at?: string | null
          ends_at?: string
          estimated_participants?: number | null
          expires_at?: string | null
          id?: string
          invite_image_url?: string | null
          invite_message?: string | null
          invite_title?: string | null
          invite_updated_at?: string | null
          notes?: string | null
          occasion?: string | null
          organization_id?: string
          origin?: string
          package_id?: string | null
          pix_txid?: string | null
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
            referencedRelation: "admin_org_stats"
            referencedColumns: ["organization_id"]
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
          adults: number
          checked_in_adults: number
          checked_in_at: string | null
          checked_in_children: number
          children: number
          created_at: string
          event_id: string
          id: string
          name: string
          notes: string | null
          organization_id: string
          participants: number | null
          source: Database["public"]["Enums"]["guest_source"]
        }
        Insert: {
          adults?: number
          checked_in_adults?: number
          checked_in_at?: string | null
          checked_in_children?: number
          children?: number
          created_at?: string
          event_id: string
          id?: string
          name: string
          notes?: string | null
          organization_id: string
          participants?: number | null
          source?: Database["public"]["Enums"]["guest_source"]
        }
        Update: {
          adults?: number
          checked_in_adults?: number
          checked_in_at?: string | null
          checked_in_children?: number
          children?: number
          created_at?: string
          event_id?: string
          id?: string
          name?: string
          notes?: string | null
          organization_id?: string
          participants?: number | null
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
            referencedRelation: "admin_org_stats"
            referencedColumns: ["organization_id"]
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
      notifications: {
        Row: {
          body: string | null
          created_at: string
          href: string | null
          id: string
          organization_id: string
          read_at: string | null
          title: string
          type: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          href?: string | null
          id?: string
          organization_id: string
          read_at?: string | null
          title: string
          type: string
        }
        Update: {
          body?: string | null
          created_at?: string
          href?: string | null
          id?: string
          organization_id?: string
          read_at?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_org_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "notifications_organization_id_fkey"
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
          billing_cycle_start: string | null
          billing_due_at: string | null
          billing_status: string
          capacity: number | null
          city: string | null
          contract_template: string
          cover_caption: string | null
          cover_url: string | null
          created_at: string
          default_event_duration_minutes: number
          description: string | null
          document: string | null
          founded_year: number | null
          gallery: Json
          highlights: string[]
          id: string
          instagram: string | null
          legal_name: string | null
          logo_url: string | null
          name: string
          notes: string | null
          one_event_per_day: boolean
          payment_plan: Json
          pix_key: string | null
          plan: Database["public"]["Enums"]["org_plan"]
          pre_reservation_validity_hours: number
          self_booking_enabled: boolean
          show_prices_public: boolean
          slug: string
          status: Database["public"]["Enums"]["org_status"]
          tagline: string | null
          testimonials: Json
          theme: Json
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          billing_cycle_start?: string | null
          billing_due_at?: string | null
          billing_status?: string
          capacity?: number | null
          city?: string | null
          contract_template?: string
          cover_caption?: string | null
          cover_url?: string | null
          created_at?: string
          default_event_duration_minutes?: number
          description?: string | null
          document?: string | null
          founded_year?: number | null
          gallery?: Json
          highlights?: string[]
          id?: string
          instagram?: string | null
          legal_name?: string | null
          logo_url?: string | null
          name: string
          notes?: string | null
          one_event_per_day?: boolean
          payment_plan?: Json
          pix_key?: string | null
          plan?: Database["public"]["Enums"]["org_plan"]
          pre_reservation_validity_hours?: number
          self_booking_enabled?: boolean
          show_prices_public?: boolean
          slug: string
          status?: Database["public"]["Enums"]["org_status"]
          tagline?: string | null
          testimonials?: Json
          theme?: Json
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          billing_cycle_start?: string | null
          billing_due_at?: string | null
          billing_status?: string
          capacity?: number | null
          city?: string | null
          contract_template?: string
          cover_caption?: string | null
          cover_url?: string | null
          created_at?: string
          default_event_duration_minutes?: number
          description?: string | null
          document?: string | null
          founded_year?: number | null
          gallery?: Json
          highlights?: string[]
          id?: string
          instagram?: string | null
          legal_name?: string | null
          logo_url?: string | null
          name?: string
          notes?: string | null
          one_event_per_day?: boolean
          payment_plan?: Json
          pix_key?: string | null
          plan?: Database["public"]["Enums"]["org_plan"]
          pre_reservation_validity_hours?: number
          self_booking_enabled?: boolean
          show_prices_public?: boolean
          slug?: string
          status?: Database["public"]["Enums"]["org_status"]
          tagline?: string | null
          testimonials?: Json
          theme?: Json
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
            referencedRelation: "admin_org_stats"
            referencedColumns: ["organization_id"]
          },
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
          base_price: number
          created_at: string
          description: string | null
          extra_adult_price: number
          extra_child_price: number
          id: string
          included_adults: number
          included_children: number
          name: string
          organization_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          base_price?: number
          created_at?: string
          description?: string | null
          extra_adult_price?: number
          extra_child_price?: number
          id?: string
          included_adults?: number
          included_children?: number
          name: string
          organization_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          base_price?: number
          created_at?: string
          description?: string | null
          extra_adult_price?: number
          extra_child_price?: number
          id?: string
          included_adults?: number
          included_children?: number
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
            referencedRelation: "admin_org_stats"
            referencedColumns: ["organization_id"]
          },
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
            referencedRelation: "admin_org_stats"
            referencedColumns: ["organization_id"]
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
          is_platform_admin: boolean
          name: string
          organization_id: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          is_platform_admin?: boolean
          name: string
          organization_id: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_platform_admin?: boolean
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
            referencedRelation: "admin_org_stats"
            referencedColumns: ["organization_id"]
          },
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
          short: string
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
          short?: string
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
          short?: string
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
            referencedRelation: "admin_org_stats"
            referencedColumns: ["organization_id"]
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
          addons: Json | null
          adults: number | null
          celebrant_birth_date: string | null
          celebrant_name: string | null
          children: number | null
          created_at: string
          desired_date: string | null
          desired_time: string | null
          estimated_total: number | null
          event_id: string | null
          id: string
          message: string | null
          name: string
          occasion: string | null
          organization_id: string
          package_id: string | null
          participants: number | null
          source: string | null
          status: Database["public"]["Enums"]["public_request_status"]
          updated_at: string
          whatsapp: string
        }
        Insert: {
          addons?: Json | null
          adults?: number | null
          celebrant_birth_date?: string | null
          celebrant_name?: string | null
          children?: number | null
          created_at?: string
          desired_date?: string | null
          desired_time?: string | null
          estimated_total?: number | null
          event_id?: string | null
          id?: string
          message?: string | null
          name: string
          occasion?: string | null
          organization_id: string
          package_id?: string | null
          participants?: number | null
          source?: string | null
          status?: Database["public"]["Enums"]["public_request_status"]
          updated_at?: string
          whatsapp: string
        }
        Update: {
          addons?: Json | null
          adults?: number | null
          celebrant_birth_date?: string | null
          celebrant_name?: string | null
          children?: number | null
          created_at?: string
          desired_date?: string | null
          desired_time?: string | null
          estimated_total?: number | null
          event_id?: string | null
          id?: string
          message?: string | null
          name?: string
          occasion?: string | null
          organization_id?: string
          package_id?: string | null
          participants?: number | null
          source?: string | null
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
            referencedRelation: "admin_org_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "public_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "public_requests_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_installments: {
        Row: {
          amount: number
          created_at: string
          days_before: number | null
          due_date: string | null
          id: string
          label: string
          organization_id: string
          percent: number
          quote_id: string
          rule: Database["public"]["Enums"]["installment_rule"]
          sequence: number
        }
        Insert: {
          amount?: number
          created_at?: string
          days_before?: number | null
          due_date?: string | null
          id?: string
          label: string
          organization_id: string
          percent: number
          quote_id: string
          rule?: Database["public"]["Enums"]["installment_rule"]
          sequence?: number
        }
        Update: {
          amount?: number
          created_at?: string
          days_before?: number | null
          due_date?: string | null
          id?: string
          label?: string
          organization_id?: string
          percent?: number
          quote_id?: string
          rule?: Database["public"]["Enums"]["installment_rule"]
          sequence?: number
        }
        Relationships: [
          {
            foreignKeyName: "quote_installments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_org_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "quote_installments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_installments_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "event_financials"
            referencedColumns: ["quote_id"]
          },
          {
            foreignKeyName: "quote_installments_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
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
            referencedRelation: "admin_org_stats"
            referencedColumns: ["organization_id"]
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
          adults: number
          children: number
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
          participants: number | null
          sent_at: string | null
          status: Database["public"]["Enums"]["quote_status"]
          subtotal: number
          total: number
          updated_at: string
        }
        Insert: {
          adults?: number
          children?: number
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
          participants?: number | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["quote_status"]
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Update: {
          adults?: number
          children?: number
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
          participants?: number | null
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
            referencedRelation: "admin_org_stats"
            referencedColumns: ["organization_id"]
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
      saas_invoices: {
        Row: {
          amount: number
          created_at: string
          description: string
          due_at: string
          id: string
          method: string | null
          organization_id: string
          paid_at: string | null
          receipt_url: string | null
          status: string
        }
        Insert: {
          amount: number
          created_at?: string
          description: string
          due_at: string
          id?: string
          method?: string | null
          organization_id: string
          paid_at?: string | null
          receipt_url?: string | null
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          due_at?: string
          id?: string
          method?: string | null
          organization_id?: string
          paid_at?: string | null
          receipt_url?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "saas_invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_org_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "saas_invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      admin_org_stats: {
        Row: {
          events_30d: number | null
          events_total: number | null
          last_event_at: string | null
          members: number | null
          organization_id: string | null
          payments_total: number | null
          requests_total: number | null
          self_service_events: number | null
        }
        Insert: {
          events_30d?: never
          events_total?: never
          last_event_at?: never
          members?: never
          organization_id?: string | null
          payments_total?: never
          requests_total?: never
          self_service_events?: never
        }
        Update: {
          events_30d?: never
          events_total?: never
          last_event_at?: never
          members?: never
          organization_id?: string | null
          payments_total?: never
          requests_total?: never
          self_service_events?: never
        }
        Relationships: []
      }
      event_financials: {
        Row: {
          adults_total: number | null
          balance: number | null
          checked_in_count: number | null
          checked_in_total: number | null
          children_total: number | null
          event_id: string | null
          extras_total: number | null
          guest_count: number | null
          organization_id: string | null
          paid_total: number | null
          participants_total: number | null
          payment_status: string | null
          quote_id: string | null
          quote_status: Database["public"]["Enums"]["quote_status"] | null
          quote_total: number | null
          total: number | null
        }
        Relationships: [
          {
            foreignKeyName: "events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_org_stats"
            referencedColumns: ["organization_id"]
          },
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
      busy_days: {
        Args: { p_from: string; p_slug: string; p_to: string }
        Returns: string[]
      }
      confirm_guest: {
        Args: {
          p_adults: number
          p_children: number
          p_name: string
          p_notes?: string
          p_token: string
        }
        Returns: undefined
      }
      expire_pre_reservations: { Args: never; Returns: number }
      guest_link: { Args: { p_token: string }; Returns: Json }
      my_reservations: { Args: never; Returns: Json }
      reservation_by_token: { Args: { p_token: string }; Returns: Json }
      search_customers: {
        Args: {
          p_dir?: string
          p_page?: number
          p_q?: string
          p_size?: number
          p_sort?: string
        }
        Returns: Json
      }
      unread_notifications_count: { Args: never; Returns: number }
    }
    Enums: {
      contract_status: "DRAFT" | "SENT" | "ACCEPTED" | "CANCELLED"
      discount_type: "AMOUNT" | "PERCENT"
      event_status:
        | "QUOTE"
        | "PRE_RESERVED"
        | "CONFIRMED"
        | "DONE"
        | "CANCELLED"
        | "EXPIRED"
      guest_source: "MANUAL" | "PUBLIC" | "DOOR"
      installment_rule: "ON_ACCEPT" | "DAYS_BEFORE_EVENT" | "FIXED_DATE"
      org_plan: "basic" | "premium"
      org_status: "active" | "suspended"
      payment_method: "PIX" | "CASH" | "CARD" | "TRANSFER" | "OTHER"
      public_link_type:
        | "GUEST_CONFIRM"
        | "QUOTE"
        | "INVITE_EDIT"
        | "CHECKIN"
        | "RESERVATION"
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
      contract_status: ["DRAFT", "SENT", "ACCEPTED", "CANCELLED"],
      discount_type: ["AMOUNT", "PERCENT"],
      event_status: [
        "QUOTE",
        "PRE_RESERVED",
        "CONFIRMED",
        "DONE",
        "CANCELLED",
        "EXPIRED",
      ],
      guest_source: ["MANUAL", "PUBLIC", "DOOR"],
      installment_rule: ["ON_ACCEPT", "DAYS_BEFORE_EVENT", "FIXED_DATE"],
      org_plan: ["basic", "premium"],
      org_status: ["active", "suspended"],
      payment_method: ["PIX", "CASH", "CARD", "TRANSFER", "OTHER"],
      public_link_type: [
        "GUEST_CONFIRM",
        "QUOTE",
        "INVITE_EDIT",
        "CHECKIN",
        "RESERVATION",
      ],
      public_request_status: ["NEW", "CONVERTED", "ARCHIVED"],
      quote_item_kind: ["PACKAGE", "ADDON", "EXTRA_PARTICIPANTS", "CUSTOM"],
      quote_status: ["DRAFT", "SENT", "ACCEPTED", "REJECTED"],
      user_role: ["owner", "staff"],
    },
  },
} as const

