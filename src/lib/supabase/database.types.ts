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
          config_aplicada: string | null
          config_snapshot: Json | null
          corretor_id: string
          id: string
          mes: number
          status: string
          volume_externo_aplicado: number
        }
        Insert: {
          ano: number
          config_aplicada?: string | null
          config_snapshot?: Json | null
          corretor_id: string
          id?: string
          mes: number
          status?: string
          volume_externo_aplicado?: number
        }
        Update: {
          ano?: number
          config_aplicada?: string | null
          config_snapshot?: Json | null
          corretor_id?: string
          id?: string
          mes?: number
          status?: string
          volume_externo_aplicado?: number
        }
        Relationships: [
          {
            foreignKeyName: "competencias_config_aplicada_fkey"
            columns: ["config_aplicada"]
            isOneToOne: false
            referencedRelation: "config_financeira"
            referencedColumns: ["id"]
          },
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
          aplica_a: string | null
          ativa: boolean
          corretor_id: string | null
          created_at: string
          dia_fechamento: number
          dia_primeiro_pagamento: number
          escritorio_id: string | null
          faixa_por_escritorio: boolean
          faixas: Json
          id: string
          nome_politica: string
          politica_estorno: string
          updated_at: string
        }
        Insert: {
          aplica_a?: string | null
          ativa?: boolean
          corretor_id?: string | null
          created_at?: string
          dia_fechamento: number
          dia_primeiro_pagamento: number
          escritorio_id?: string | null
          faixa_por_escritorio?: boolean
          faixas: Json
          id?: string
          nome_politica?: string
          politica_estorno?: string
          updated_at?: string
        }
        Update: {
          aplica_a?: string | null
          ativa?: boolean
          corretor_id?: string | null
          created_at?: string
          dia_fechamento?: number
          dia_primeiro_pagamento?: number
          escritorio_id?: string | null
          faixa_por_escritorio?: boolean
          faixas?: Json
          id?: string
          nome_politica?: string
          politica_estorno?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "config_financeira_aplica_a_fkey"
            columns: ["aplica_a"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "config_financeira_corretor_id_fkey"
            columns: ["corretor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "config_financeira_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
        ]
      }
      convites_escritorio: {
        Row: {
          aceito_em: string | null
          aceito_por: string | null
          criado_em: string
          email: string
          escritorio_id: string
          expira_em: string
          id: string
          status: string
          token: string
        }
        Insert: {
          aceito_em?: string | null
          aceito_por?: string | null
          criado_em?: string
          email: string
          escritorio_id: string
          expira_em?: string
          id?: string
          status?: string
          token?: string
        }
        Update: {
          aceito_em?: string | null
          aceito_por?: string | null
          criado_em?: string
          email?: string
          escritorio_id?: string
          expira_em?: string
          id?: string
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "convites_escritorio_aceito_por_fkey"
            columns: ["aceito_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "convites_escritorio_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
        ]
      }
      escritorios: {
        Row: {
          assinatura_ate: string | null
          assinatura_status: string | null
          criado_em: string
          dono_id: string
          id: string
          limite_corretores: number
          nome: string
        }
        Insert: {
          assinatura_ate?: string | null
          assinatura_status?: string | null
          criado_em?: string
          dono_id: string
          id?: string
          limite_corretores?: number
          nome: string
        }
        Update: {
          assinatura_ate?: string | null
          assinatura_status?: string | null
          criado_em?: string
          dono_id?: string
          id?: string
          limite_corretores?: number
          nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "escritorios_dono_id_fkey"
            columns: ["dono_id"]
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
      eventos_stripe: {
        Row: {
          corretor_id: string | null
          erro: string | null
          id: string
          recebido_em: string
          tipo: string
        }
        Insert: {
          corretor_id?: string | null
          erro?: string | null
          id: string
          recebido_em?: string
          tipo: string
        }
        Update: {
          corretor_id?: string | null
          erro?: string | null
          id?: string
          recebido_em?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "eventos_stripe_corretor_id_fkey"
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
      membros_escritorio: {
        Row: {
          corretor_id: string
          entrou_em: string
          escritorio_id: string
          id: string
          papel: string
          saiu_em: string | null
        }
        Insert: {
          corretor_id: string
          entrou_em?: string
          escritorio_id: string
          id?: string
          papel?: string
          saiu_em?: string | null
        }
        Update: {
          corretor_id?: string
          entrou_em?: string
          escritorio_id?: string
          id?: string
          papel?: string
          saiu_em?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "membros_escritorio_corretor_id_fkey"
            columns: ["corretor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membros_escritorio_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
        ]
      }
      metas_escritorio: {
        Row: {
          corretor_id: string | null
          criado_em: string
          escritorio_id: string
          id: string
          valor_centavos: number
          vigente_de: string
        }
        Insert: {
          corretor_id?: string | null
          criado_em?: string
          escritorio_id: string
          id?: string
          valor_centavos: number
          vigente_de: string
        }
        Update: {
          corretor_id?: string | null
          criado_em?: string
          escritorio_id?: string
          id?: string
          valor_centavos?: number
          vigente_de?: string
        }
        Relationships: [
          {
            foreignKeyName: "metas_escritorio_corretor_id_fkey"
            columns: ["corretor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "metas_escritorio_escritorio_id_fkey"
            columns: ["escritorio_id"]
            isOneToOne: false
            referencedRelation: "escritorios"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          assinatura_ate: string | null
          assinatura_status: string | null
          cancela_no_fim: boolean
          created_at: string
          id: string
          nome: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          telefone: string | null
          trial_termina_em: string
        }
        Insert: {
          assinatura_ate?: string | null
          assinatura_status?: string | null
          cancela_no_fim?: boolean
          created_at?: string
          id: string
          nome?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          telefone?: string | null
          trial_termina_em?: string
        }
        Update: {
          assinatura_ate?: string | null
          assinatura_status?: string | null
          cancela_no_fim?: boolean
          created_at?: string
          id?: string
          nome?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          telefone?: string | null
          trial_termina_em?: string
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
          produto: string
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
          produto?: string
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
          produto?: string
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
      aceitar_convite: { Args: { p_token: string }; Returns: Json }
      aplicar_resultado: {
        Args: { p_competencia_id: string; p_resultado: Json }
        Returns: undefined
      }
      config_efetiva: {
        Args: never
        Returns: {
          aplica_a: string | null
          ativa: boolean
          corretor_id: string | null
          created_at: string
          dia_fechamento: number
          dia_primeiro_pagamento: number
          escritorio_id: string | null
          faixa_por_escritorio: boolean
          faixas: Json
          id: string
          nome_politica: string
          politica_estorno: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "config_financeira"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      criar_escritorio: { Args: { p_nome: string }; Returns: string }
      criar_escritorio_para: {
        Args: {
          p_corretores?: number
          p_email: string
          p_meses?: number
          p_nome: string
        }
        Returns: string
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
      historico_escritorio: {
        Args: { p_meses?: number }
        Returns: {
          ano: number
          comissao_centavos: number
          corretor_id: string
          mes: number
          n_vendas: number
          total_centavos: number
        }[]
      }
      marcar_recebido: {
        Args: { p_data: string; p_recebimento_id: string }
        Returns: undefined
      }
      marcar_recebidos_vencidos: {
        Args: { p_ate: string; p_data: string }
        Returns: number
      }
      membros_do_escritorio: {
        Args: never
        Returns: {
          corretor_id: string
          entrou_em: string
          membro_id: string
          nome: string
          papel: string
          saiu_em: string
        }[]
      }
      metas_vigentes: {
        Args: { p_ano: number; p_escritorio: string; p_mes: number }
        Returns: {
          corretor_id: string
          valor_centavos: number
          vigente_de: string
        }[]
      }
      meu_escritorio: { Args: never; Returns: Json }
      meu_escritorio_como_dono: { Args: never; Returns: string }
      minhas_metas: { Args: { p_ano: number; p_mes: number }; Returns: Json }
      painel_do_dono: {
        Args: { p_ano: number; p_mes: number; p_meses_historico?: number }
        Returns: Json
      }
      painel_escritorio: {
        Args: { p_ano: number; p_mes: number }
        Returns: Json
      }
      remover_membro: { Args: { p_membro_id: string }; Returns: undefined }
      resumo_agenda: {
        Args: { p_busca?: string; p_hoje: string }
        Returns: Json
      }
      sair_do_escritorio: { Args: never; Returns: undefined }
      vagas_ocupadas: { Args: { p_escritorio: string }; Returns: number }
      ver_convite: { Args: { p_token: string }; Returns: Json }
      volume_do_escritorio: {
        Args: { p_ano: number; p_mes: number }
        Returns: number
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
