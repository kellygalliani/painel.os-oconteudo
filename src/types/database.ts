// GERADO por npm run db:tipos. Não editar.
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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      api_chaves: {
        Row: {
          criado_em: string
          hash: string
          id: string
          nome: string
          prefixo: string
          socia_id: string
          ultimo_uso: string | null
        }
        Insert: {
          criado_em?: string
          hash: string
          id?: string
          nome: string
          prefixo: string
          socia_id: string
          ultimo_uso?: string | null
        }
        Update: {
          criado_em?: string
          hash?: string
          id?: string
          nome?: string
          prefixo?: string
          socia_id?: string
          ultimo_uso?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_chaves_socia_id_fkey"
            columns: ["socia_id"]
            isOneToOne: false
            referencedRelation: "socias"
            referencedColumns: ["id"]
          },
        ]
      }
      areas: {
        Row: {
          id: string
          nome: string
          ordem: number
        }
        Insert: {
          id: string
          nome: string
          ordem?: number
        }
        Update: {
          id?: string
          nome?: string
          ordem?: number
        }
        Relationships: []
      }
      blocos_fixos: {
        Row: {
          criado_em: string
          data: string
          id: string
          minutos: number
          tarefa_id: string
        }
        Insert: {
          criado_em?: string
          data: string
          id?: string
          minutos: number
          tarefa_id: string
        }
        Update: {
          criado_em?: string
          data?: string
          id?: string
          minutos?: number
          tarefa_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocos_fixos_tarefa_id_fkey"
            columns: ["tarefa_id"]
            isOneToOne: false
            referencedRelation: "tarefas"
            referencedColumns: ["id"]
          },
        ]
      }
      campanha_contatos: {
        Row: {
          autor_id: string
          campanha_id: string | null
          comentario: string | null
          comentario_id: string | null
          criado_em: string
          id: string
          naie_post_id: string | null
          palavra: string | null
          rede: string
          usuario: string | null
        }
        Insert: {
          autor_id: string
          campanha_id?: string | null
          comentario?: string | null
          comentario_id?: string | null
          criado_em?: string
          id?: string
          naie_post_id?: string | null
          palavra?: string | null
          rede: string
          usuario?: string | null
        }
        Update: {
          autor_id?: string
          campanha_id?: string | null
          comentario?: string | null
          comentario_id?: string | null
          criado_em?: string
          id?: string
          naie_post_id?: string | null
          palavra?: string | null
          rede?: string
          usuario?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campanha_contatos_campanha_id_fkey"
            columns: ["campanha_id"]
            isOneToOne: false
            referencedRelation: "campanhas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campanha_contatos_naie_post_id_fkey"
            columns: ["naie_post_id"]
            isOneToOne: false
            referencedRelation: "naie_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      campanhas: {
        Row: {
          atualizado_em: string
          botao: string
          criado_em: string
          dm: string
          id: string
          idioma: string
          link: string
          nome: string
          origem_id: string | null
          palavras: string[]
          resposta_tiktok: string
          respostas: string[]
          status: string
        }
        Insert: {
          atualizado_em?: string
          botao?: string
          criado_em?: string
          dm?: string
          id?: string
          idioma: string
          link?: string
          nome: string
          origem_id?: string | null
          palavras?: string[]
          resposta_tiktok?: string
          respostas?: string[]
          status?: string
        }
        Update: {
          atualizado_em?: string
          botao?: string
          criado_em?: string
          dm?: string
          id?: string
          idioma?: string
          link?: string
          nome?: string
          origem_id?: string | null
          palavras?: string[]
          resposta_tiktok?: string
          respostas?: string[]
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "campanhas_origem_id_fkey"
            columns: ["origem_id"]
            isOneToOne: false
            referencedRelation: "campanhas"
            referencedColumns: ["id"]
          },
        ]
      }
      capacidades: {
        Row: {
          dia_semana: number
          minutos: number
          socia_id: string
        }
        Insert: {
          dia_semana: number
          minutos?: number
          socia_id: string
        }
        Update: {
          dia_semana?: number
          minutos?: number
          socia_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "capacidades_socia_id_fkey"
            columns: ["socia_id"]
            isOneToOne: false
            referencedRelation: "socias"
            referencedColumns: ["id"]
          },
        ]
      }
      config_segura: {
        Row: {
          chave: string
          valor: string
        }
        Insert: {
          chave: string
          valor: string
        }
        Update: {
          chave?: string
          valor?: string
        }
        Relationships: []
      }
      criativo_arquivos: {
        Row: {
          chave: string
          criado_em: string
          criativo_id: string
          enviado: boolean
          id: string
          idioma: string | null
          nome_original: string
          ordem: number
          posicionamento: string | null
          tamanho_bytes: number
          tipo_mime: string
        }
        Insert: {
          chave: string
          criado_em?: string
          criativo_id: string
          enviado?: boolean
          id?: string
          idioma?: string | null
          nome_original: string
          ordem?: number
          posicionamento?: string | null
          tamanho_bytes?: number
          tipo_mime: string
        }
        Update: {
          chave?: string
          criado_em?: string
          criativo_id?: string
          enviado?: boolean
          id?: string
          idioma?: string | null
          nome_original?: string
          ordem?: number
          posicionamento?: string | null
          tamanho_bytes?: number
          tipo_mime?: string
        }
        Relationships: [
          {
            foreignKeyName: "criativo_arquivos_criativo_id_fkey"
            columns: ["criativo_id"]
            isOneToOne: false
            referencedRelation: "criativos"
            referencedColumns: ["id"]
          },
        ]
      }
      criativo_versoes: {
        Row: {
          botao: string
          criativo_id: string
          descricao: string
          id: string
          idioma: string
          link_destino: string
          texto: string
          titulo: string
        }
        Insert: {
          botao?: string
          criativo_id: string
          descricao?: string
          id?: string
          idioma: string
          link_destino?: string
          texto?: string
          titulo?: string
        }
        Update: {
          botao?: string
          criativo_id?: string
          descricao?: string
          id?: string
          idioma?: string
          link_destino?: string
          texto?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "criativo_versoes_criativo_id_fkey"
            columns: ["criativo_id"]
            isOneToOne: false
            referencedRelation: "criativos"
            referencedColumns: ["id"]
          },
        ]
      }
      criativos: {
        Row: {
          atualizado_em: string
          criado_em: string
          formato: string
          id: string
          link: string | null
          no_ar_desde: string | null
          nota: string | null
          ordem: number
          origem: string
          resultado: string | null
          status: string
          titulo: string
        }
        Insert: {
          atualizado_em?: string
          criado_em?: string
          formato?: string
          id?: string
          link?: string | null
          no_ar_desde?: string | null
          nota?: string | null
          ordem?: number
          origem?: string
          resultado?: string | null
          status?: string
          titulo: string
        }
        Update: {
          atualizado_em?: string
          criado_em?: string
          formato?: string
          id?: string
          link?: string | null
          no_ar_desde?: string | null
          nota?: string | null
          ordem?: number
          origem?: string
          resultado?: string | null
          status?: string
          titulo?: string
        }
        Relationships: []
      }
      dias_especiais: {
        Row: {
          data: string
          nome: string
          tipo: string
        }
        Insert: {
          data: string
          nome: string
          tipo: string
        }
        Update: {
          data?: string
          nome?: string
          tipo?: string
        }
        Relationships: []
      }
      marcacoes: {
        Row: {
          data: string
          feito_em: string
          feito_por: string | null
          id: string
          minutos: number | null
          ref_id: string
          tipo: string
        }
        Insert: {
          data: string
          feito_em?: string
          feito_por?: string | null
          id?: string
          minutos?: number | null
          ref_id: string
          tipo: string
        }
        Update: {
          data?: string
          feito_em?: string
          feito_por?: string | null
          id?: string
          minutos?: number | null
          ref_id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "marcacoes_feito_por_fkey"
            columns: ["feito_por"]
            isOneToOne: false
            referencedRelation: "socias"
            referencedColumns: ["id"]
          },
        ]
      }
      naie_posts: {
        Row: {
          agendado_para: string | null
          atualizado_em: string
          automacao_id: string | null
          campanha_id: string | null
          cliques: number
          conta_id: string
          contatos: number
          criado_em: string
          disparos: number
          dms: number
          erro: string | null
          falhas_dm: number
          id: string
          idioma: string
          link: string | null
          naie_id: string
          numeros_em: string | null
          palavra: string | null
          rede: string
          status: string
          usuario: string
          zernio_post_id: string | null
        }
        Insert: {
          agendado_para?: string | null
          atualizado_em?: string
          automacao_id?: string | null
          campanha_id?: string | null
          cliques?: number
          conta_id: string
          contatos?: number
          criado_em?: string
          disparos?: number
          dms?: number
          erro?: string | null
          falhas_dm?: number
          id?: string
          idioma: string
          link?: string | null
          naie_id: string
          numeros_em?: string | null
          palavra?: string | null
          rede: string
          status: string
          usuario: string
          zernio_post_id?: string | null
        }
        Update: {
          agendado_para?: string | null
          atualizado_em?: string
          automacao_id?: string | null
          campanha_id?: string | null
          cliques?: number
          conta_id?: string
          contatos?: number
          criado_em?: string
          disparos?: number
          dms?: number
          erro?: string | null
          falhas_dm?: number
          id?: string
          idioma?: string
          link?: string | null
          naie_id?: string
          numeros_em?: string | null
          palavra?: string | null
          rede?: string
          status?: string
          usuario?: string
          zernio_post_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "naie_posts_campanha_id_fkey"
            columns: ["campanha_id"]
            isOneToOne: false
            referencedRelation: "campanhas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "naie_posts_naie_id_fkey"
            columns: ["naie_id"]
            isOneToOne: false
            referencedRelation: "naies"
            referencedColumns: ["id"]
          },
        ]
      }
      naie_versoes: {
        Row: {
          atualizado_em: string
          contagem: Json
          id: string
          idioma: string
          naie_id: string
          roteiro: string
          titulo_escolhido: number | null
          titulos: string[]
        }
        Insert: {
          atualizado_em?: string
          contagem?: Json
          id?: string
          idioma: string
          naie_id: string
          roteiro?: string
          titulo_escolhido?: number | null
          titulos?: string[]
        }
        Update: {
          atualizado_em?: string
          contagem?: Json
          id?: string
          idioma?: string
          naie_id?: string
          roteiro?: string
          titulo_escolhido?: number | null
          titulos?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "naie_versoes_naie_id_fkey"
            columns: ["naie_id"]
            isOneToOne: false
            referencedRelation: "naies"
            referencedColumns: ["id"]
          },
        ]
      }
      naie_videos: {
        Row: {
          chave: string
          criado_em: string
          id: string
          idioma: string
          naie_id: string
          nome_original: string
          tamanho_bytes: number
          tipo: string
        }
        Insert: {
          chave: string
          criado_em?: string
          id?: string
          idioma: string
          naie_id: string
          nome_original: string
          tamanho_bytes: number
          tipo?: string
        }
        Update: {
          chave?: string
          criado_em?: string
          id?: string
          idioma?: string
          naie_id?: string
          nome_original?: string
          tamanho_bytes?: number
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "naie_videos_naie_id_fkey"
            columns: ["naie_id"]
            isOneToOne: false
            referencedRelation: "naies"
            referencedColumns: ["id"]
          },
        ]
      }
      naies: {
        Row: {
          atualizado_em: string
          criado_em: string
          data_prevista: string | null
          dia_numero: number | null
          editar_em: string | null
          facebook_postado: boolean
          ficha: Json
          formato: string
          id: string
          legenda_en: string | null
          legenda_pt: string | null
          legenda_tiktok_en: string | null
          legenda_tiktok_pt: string | null
          link_bruto_en: string | null
          link_bruto_pt: string | null
          link_referencia: string | null
          origem_md: string | null
          quem_grava: string
          semana: string | null
          status: string
          template: string
          tipo: string
          titulo_curto: string
          trilha_id: string | null
        }
        Insert: {
          atualizado_em?: string
          criado_em?: string
          data_prevista?: string | null
          dia_numero?: number | null
          editar_em?: string | null
          facebook_postado?: boolean
          ficha?: Json
          formato?: string
          id?: string
          legenda_en?: string | null
          legenda_pt?: string | null
          legenda_tiktok_en?: string | null
          legenda_tiktok_pt?: string | null
          link_bruto_en?: string | null
          link_bruto_pt?: string | null
          link_referencia?: string | null
          origem_md?: string | null
          quem_grava?: string
          semana?: string | null
          status?: string
          template?: string
          tipo: string
          titulo_curto: string
          trilha_id?: string | null
        }
        Update: {
          atualizado_em?: string
          criado_em?: string
          data_prevista?: string | null
          dia_numero?: number | null
          editar_em?: string | null
          facebook_postado?: boolean
          ficha?: Json
          formato?: string
          id?: string
          legenda_en?: string | null
          legenda_pt?: string | null
          legenda_tiktok_en?: string | null
          legenda_tiktok_pt?: string | null
          link_bruto_en?: string | null
          link_bruto_pt?: string | null
          link_referencia?: string | null
          origem_md?: string | null
          quem_grava?: string
          semana?: string | null
          status?: string
          template?: string
          tipo?: string
          titulo_curto?: string
          trilha_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "naies_trilha_id_fkey"
            columns: ["trilha_id"]
            isOneToOne: false
            referencedRelation: "trilhas"
            referencedColumns: ["id"]
          },
        ]
      }
      objetivos: {
        Row: {
          criado_em: string
          id: string
          indicador: string
          nota: string | null
          ordem: number
          periodo: string
          unidade: string
          valor: number
        }
        Insert: {
          criado_em?: string
          id?: string
          indicador: string
          nota?: string | null
          ordem?: number
          periodo: string
          unidade?: string
          valor: number
        }
        Update: {
          criado_em?: string
          id?: string
          indicador?: string
          nota?: string | null
          ordem?: number
          periodo?: string
          unidade?: string
          valor?: number
        }
        Relationships: []
      }
      projecoes: {
        Row: {
          atualizado_em: string
          criado_em: string
          dados: Json
          e_meta: boolean
          id: string
          nome: string
        }
        Insert: {
          atualizado_em?: string
          criado_em?: string
          dados: Json
          e_meta?: boolean
          id?: string
          nome: string
        }
        Update: {
          atualizado_em?: string
          criado_em?: string
          dados?: Json
          e_meta?: boolean
          id?: string
          nome?: string
        }
        Relationships: []
      }
      realizado_mensal: {
        Row: {
          faturamento: number
          investimento_anuncio: number
          mes: string
          nota: string | null
          order_bumps: number
          vendas: number
        }
        Insert: {
          faturamento?: number
          investimento_anuncio?: number
          mes: string
          nota?: string | null
          order_bumps?: number
          vendas?: number
        }
        Update: {
          faturamento?: number
          investimento_anuncio?: number
          mes?: string
          nota?: string | null
          order_bumps?: number
          vendas?: number
        }
        Relationships: []
      }
      rotina_donas: {
        Row: {
          minutos: number | null
          rotina_id: string
          socia_id: string
        }
        Insert: {
          minutos?: number | null
          rotina_id: string
          socia_id: string
        }
        Update: {
          minutos?: number | null
          rotina_id?: string
          socia_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rotina_donas_rotina_id_fkey"
            columns: ["rotina_id"]
            isOneToOne: false
            referencedRelation: "rotinas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rotina_donas_socia_id_fkey"
            columns: ["socia_id"]
            isOneToOne: false
            referencedRelation: "socias"
            referencedColumns: ["id"]
          },
        ]
      }
      rotina_excecoes: {
        Row: {
          criado_em: string
          data_original: string
          id: string
          nova_data: string | null
          pular: boolean
          rotina_id: string
        }
        Insert: {
          criado_em?: string
          data_original: string
          id?: string
          nova_data?: string | null
          pular?: boolean
          rotina_id: string
        }
        Update: {
          criado_em?: string
          data_original?: string
          id?: string
          nova_data?: string | null
          pular?: boolean
          rotina_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rotina_excecoes_rotina_id_fkey"
            columns: ["rotina_id"]
            isOneToOne: false
            referencedRelation: "rotinas"
            referencedColumns: ["id"]
          },
        ]
      }
      rotinas: {
        Row: {
          area_id: string
          ativa: boolean
          atualizado_em: string
          chave: string
          criado_em: string
          dia_mes: number | null
          dia_semana: number | null
          frequencia: string
          id: string
          minutos: number
          ordem: number
          regra: string | null
          titulo: string
        }
        Insert: {
          area_id: string
          ativa?: boolean
          atualizado_em?: string
          chave: string
          criado_em?: string
          dia_mes?: number | null
          dia_semana?: number | null
          frequencia: string
          id?: string
          minutos: number
          ordem?: number
          regra?: string | null
          titulo: string
        }
        Update: {
          area_id?: string
          ativa?: boolean
          atualizado_em?: string
          chave?: string
          criado_em?: string
          dia_mes?: number | null
          dia_semana?: number | null
          frequencia?: string
          id?: string
          minutos?: number
          ordem?: number
          regra?: string | null
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "rotinas_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
        ]
      }
      socias: {
        Row: {
          criado_em: string
          email: string
          id: string
          nome: string
          precisa_trocar_senha: boolean
        }
        Insert: {
          criado_em?: string
          email: string
          id: string
          nome: string
          precisa_trocar_senha?: boolean
        }
        Update: {
          criado_em?: string
          email?: string
          id?: string
          nome?: string
          precisa_trocar_senha?: boolean
        }
        Relationships: []
      }
      sprints: {
        Row: {
          criado_em: string
          id: string
          nao_antes: string | null
          numero: number
          sugestao: boolean
          tema: string
        }
        Insert: {
          criado_em?: string
          id?: string
          nao_antes?: string | null
          numero: number
          sugestao?: boolean
          tema: string
        }
        Update: {
          criado_em?: string
          id?: string
          nao_antes?: string | null
          numero?: number
          sugestao?: boolean
          tema?: string
        }
        Relationships: []
      }
      tarefas: {
        Row: {
          area_id: string
          atualizado_em: string
          criado_em: string
          dia: string | null
          dona_id: string | null
          horas: number
          id: string
          ordem: number
          sprint_id: string
          status: string
          titulo: string
        }
        Insert: {
          area_id: string
          atualizado_em?: string
          criado_em?: string
          dia?: string | null
          dona_id?: string | null
          horas: number
          id?: string
          ordem?: number
          sprint_id: string
          status?: string
          titulo: string
        }
        Update: {
          area_id?: string
          atualizado_em?: string
          criado_em?: string
          dia?: string | null
          dona_id?: string | null
          horas?: number
          id?: string
          ordem?: number
          sprint_id?: string
          status?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "tarefas_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarefas_dona_id_fkey"
            columns: ["dona_id"]
            isOneToOne: false
            referencedRelation: "socias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarefas_sprint_id_fkey"
            columns: ["sprint_id"]
            isOneToOne: false
            referencedRelation: "sprints"
            referencedColumns: ["id"]
          },
        ]
      }
      trafego_semanal: {
        Row: {
          checkouts: number
          cliques: number
          gasto: number
          impressoes: number
          nota: string | null
          semana_inicio: string
          vendas: number
          visitas_pagina: number
        }
        Insert: {
          checkouts?: number
          cliques?: number
          gasto?: number
          impressoes?: number
          nota?: string | null
          semana_inicio: string
          vendas?: number
          visitas_pagina?: number
        }
        Update: {
          checkouts?: number
          cliques?: number
          gasto?: number
          impressoes?: number
          nota?: string | null
          semana_inicio?: string
          vendas?: number
          visitas_pagina?: number
        }
        Relationships: []
      }
      trilhas: {
        Row: {
          arquivo: string
          atualizado_em: string
          criado_em: string
          duracao_seg: number | null
          favorita: boolean
          id: string
          nome: string
          nota: string | null
          tamanho_bytes: number | null
        }
        Insert: {
          arquivo: string
          atualizado_em?: string
          criado_em?: string
          duracao_seg?: number | null
          favorita?: boolean
          id?: string
          nome: string
          nota?: string | null
          tamanho_bytes?: number | null
        }
        Update: {
          arquivo?: string
          atualizado_em?: string
          criado_em?: string
          duracao_seg?: number | null
          favorita?: boolean
          id?: string
          nome?: string
          nota?: string | null
          tamanho_bytes?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      api_arquivos: {
        Args: { p_chave: string; p_criativo: string }
        Returns: {
          chave: string
          id: string
          nome: string
        }[]
      }
      api_campanha_da_palavra: {
        Args: { p_chave: string; p_idioma: string; p_palavras: string[] }
        Returns: Json
      }
      api_criar_anuncio: {
        Args: { p_chave: string; p_dados: Json }
        Returns: string
      }
      api_gravar_naie: {
        Args: { p_chave: string; p_dados: Json }
        Returns: string
      }
      api_ler_naie: { Args: { p_chave: string; p_naie: string }; Returns: Json }
      api_listar_anuncios: { Args: { p_chave: string }; Returns: Json }
      api_listar_naies: {
        Args: {
          p_ate?: string
          p_chave: string
          p_desde?: string
          p_semana?: string
        }
        Returns: Json
      }
      api_listar_naies_para_postar: { Args: { p_chave: string }; Returns: Json }
      api_marcar_pronto: {
        Args: { p_chave: string; p_criativo: string; p_enviados: string[] }
        Returns: undefined
      }
      api_naie_para_postar: {
        Args: { p_chave: string; p_naie: string }
        Returns: Json
      }
      api_registrar_arquivo: {
        Args: { p_arquivo: Json; p_chave: string; p_criativo: string }
        Returns: string
      }
      api_registrar_posts: {
        Args: {
          p_chave: string
          p_naie: string
          p_postada: boolean
          p_posts: Json
        }
        Returns: undefined
      }
      api_socia: { Args: { p_chave: string }; Returns: string }
      e_socia: { Args: never; Returns: boolean }
      webhook_registrar_contato: {
        Args: { p_dados: Json; p_segredo_hash: string }
        Returns: undefined
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
