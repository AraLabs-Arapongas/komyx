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
    PostgrestVersion: "14.15"
  }
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
      clientes: {
        Row: {
          cidade: string | null
          corretor_id: string
          created_at: string
          documento: string | null
          email: string | null
          id: string
          nome: string
          observacoes: string | null
          telefone: string | null
        }
        Insert: {
          cidade?: string | null
          corretor_id: string
          created_at?: string
          documento?: string | null
          email?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          telefone?: string | null
        }
        Update: {
          cidade?: string | null
          corretor_id?: string
          created_at?: string
          documento?: string | null
          email?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          telefone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clientes_corretor_id_fkey"
            columns: ["corretor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      comissoes: {
        Row: {
          corretor_id: string
          faixa_aplicada: Json
          id: string
          n_parcelas: number
          percentual: number
          status: string
          updated_at: string
          valor_centavos: number
          venda_id: string
        }
        Insert: {
          corretor_id: string
          faixa_aplicada: Json
          id?: string
          n_parcelas: number
          percentual: number
          status?: string
          updated_at?: string
          valor_centavos: number
          venda_id: string
        }
        Update: {
          corretor_id?: string
          faixa_aplicada?: Json
          id?: string
          n_parcelas?: number
          percentual?: number
          status?: string
          updated_at?: string
          valor_centavos?: number
          venda_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comissoes_corretor_id_fkey"
            columns: ["corretor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comissoes_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: true
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      competencias: {
        Row: {
          ano: number
          config_snapshot: Json | null
          corretor_id: string
          id: string
          mes: number
          status: string
        }
        Insert: {
          ano: number
          config_snapshot?: Json | null
          corretor_id: string
          id?: string
          mes: number
          status?: string
        }
        Update: {
          ano?: number
          config_snapshot?: Json | null
          corretor_id?: string
          id?: string
          mes?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "competencias_corretor_id_fkey"
            columns: ["corretor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      config_financeira: {
        Row: {
          ativa: boolean
          corretor_id: string
          created_at: string
          dia_fechamento: number
          dia_primeiro_pagamento: number
          faixas: Json
          id: string
          nome_politica: string
          politica_estorno: string
          updated_at: string
        }
        Insert: {
          ativa?: boolean
          corretor_id: string
          created_at?: string
          dia_fechamento: number
          dia_primeiro_pagamento: number
          faixas: Json
          id?: string
          nome_politica?: string
          politica_estorno?: string
          updated_at?: string
        }
        Update: {
          ativa?: boolean
          corretor_id?: string
          created_at?: string
          dia_fechamento?: number
          dia_primeiro_pagamento?: number
          faixas?: Json
          id?: string
          nome_politica?: string
          politica_estorno?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "config_financeira_corretor_id_fkey"
            columns: ["corretor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      eventos: {
        Row: {
          acao: string
          antes: Json | null
          corretor_id: string
          criado_em: string
          depois: Json | null
          entidade: string
          entidade_id: string
          id: string
        }
        Insert: {
          acao: string
          antes?: Json | null
          corretor_id: string
          criado_em?: string
          depois?: Json | null
          entidade: string
          entidade_id: string
          id?: string
        }
        Update: {
          acao?: string
          antes?: Json | null
          corretor_id?: string
          criado_em?: string
          depois?: Json | null
          entidade?: string
          entidade_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "eventos_corretor_id_fkey"
            columns: ["corretor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          created_at: string
          email: string
          id: string
          origem: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          origem?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          origem?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          nome: string
          telefone: string | null
        }
        Insert: {
          created_at?: string
          id: string
          nome?: string
          telefone?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
          telefone?: string | null
        }
        Relationships: []
      }
      recebimentos: {
        Row: {
          comissao_id: string
          corretor_id: string
          data_prevista: string
          data_recebimento: string | null
          id: string
          numero_parcela: number
          status: string
          valor_centavos: number
        }
        Insert: {
          comissao_id: string
          corretor_id: string
          data_prevista: string
          data_recebimento?: string | null
          id?: string
          numero_parcela: number
          status?: string
          valor_centavos: number
        }
        Update: {
          comissao_id?: string
          corretor_id?: string
          data_prevista?: string
          data_recebimento?: string | null
          id?: string
          numero_parcela?: number
          status?: string
          valor_centavos?: number
        }
        Relationships: [
          {
            foreignKeyName: "recebimentos_comissao_id_fkey"
            columns: ["comissao_id"]
            isOneToOne: false
            referencedRelation: "comissoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recebimentos_corretor_id_fkey"
            columns: ["corretor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tentativas_cadastro: {
        Row: {
          aparelho: string | null
          created_at: string
          email: string
          erro_codigo: string | null
          erro_status: number | null
          id: string
          ok: boolean
        }
        Insert: {
          aparelho?: string | null
          created_at?: string
          email: string
          erro_codigo?: string | null
          erro_status?: number | null
          id?: string
          ok: boolean
        }
        Update: {
          aparelho?: string | null
          created_at?: string
          email?: string
          erro_codigo?: string | null
          erro_status?: number | null
          id?: string
          ok?: boolean
        }
        Relationships: []
      }
      vendas: {
        Row: {
          administradora: string
          cliente_id: string | null
          competencia_id: string
          corretor_id: string
          cota: string
          created_at: string
          data_venda: string
          grupo: string
          id: string
          motivo_cancelamento: string | null
          numero_contrato: string | null
          observacoes: string | null
          status: string
          tags: string[]
          updated_at: string
          valor_carta_centavos: number
        }
        Insert: {
          administradora: string
          cliente_id?: string | null
          competencia_id: string
          corretor_id: string
          cota: string
          created_at?: string
          data_venda: string
          grupo: string
          id?: string
          motivo_cancelamento?: string | null
          numero_contrato?: string | null
          observacoes?: string | null
          status?: string
          tags?: string[]
          updated_at?: string
          valor_carta_centavos: number
        }
        Update: {
          administradora?: string
          cliente_id?: string | null
          competencia_id?: string
          corretor_id?: string
          cota?: string
          created_at?: string
          data_venda?: string
          grupo?: string
          id?: string
          motivo_cancelamento?: string | null
          numero_contrato?: string | null
          observacoes?: string | null
          status?: string
          tags?: string[]
          updated_at?: string
          valor_carta_centavos?: number
        }
        Relationships: [
          {
            foreignKeyName: "vendas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendas_competencia_id_fkey"
            columns: ["competencia_id"]
            isOneToOne: false
            referencedRelation: "competencias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendas_corretor_id_fkey"
            columns: ["corretor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      aplicar_resultado: {
        Args: { p_competencia_id: string; p_resultado: Json }
        Returns: undefined
      }
      desmarcar_recebido: {
        Args: { p_recebimento_id: string }
        Returns: undefined
      }
      estornar_venda: {
        Args: {
          p_cobrar_recebido: boolean
          p_motivo: string
          p_venda_id: string
        }
        Returns: undefined
      }
      fechar_competencias_vencidas: {
        Args: { p_hoje: string; p_snapshot: Json }
        Returns: undefined
      }
      marcar_recebido: {
        Args: { p_data: string; p_recebimento_id: string }
        Returns: undefined
      }
      marcar_recebidos_vencidos: {
        Args: { p_ate: string; p_data: string }
        Returns: number
      }
      resumo_agenda: {
        Args: { p_busca?: string; p_hoje: string }
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
    Enums: {},
  },
} as const
