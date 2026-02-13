import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Conversa = {
  id: string;
  cliente_id: string;
  atendente_id: string | null;
  status: 'nova' | 'em_atendimento' | 'pausada' | 'finalizada';
  canal: string;
  prioridade: number;
  iniciada_em: string;
  atribuida_em: string | null;
  finalizada_em: string | null;
  motivo_finalizacao?: string | null;
  ia_ativa?: boolean;
  ia_modo?: 'manual' | 'horario' | 'feriado' | 'domingo';
  atendente_ausente?: boolean;
  updated_at?: string;
  created_at?: string;
  clientes: {
    id: string;
    nome: string;
    whatsapp: string;
    email: string | null;
    avatar_url: string | null;
  };
  atendentes: {
    id: string;
    nome: string;
    avatar_url: string | null;
  } | null;
};

export type Mensagem = {
  id: string;
  conversa_id: string;
  whatsapp_message_id: string | null;
  direcao: 'enviada' | 'recebida';
  tipo: 'text' | 'image' | 'video' | 'audio' | 'document';
  conteudo: string | null;
  midia_url: string | null;
  midia_mime_type: string | null;
  status: 'enviada' | 'entregue' | 'lida' | 'falha';
  enviada_em: string;
  entregue_em: string | null;
  lida_em: string | null;
  enviada_por: string | null;
  metadata: string | null;
  created_at?: string;
  atendentes: {
    nome: string;
    avatar_url: string | null;
  } | null;
};

export type ClienteSupabase = {
  id: string;
  nome: string;
  whatsapp: string;
  email: string | null;
  avatar_url: string | null;
  status: string;
  tags: string[];
  total_conversas: number;
  total_compras: number;
  valor_total_compras: number;
  criado_em: string;
};

export type BotaoResposta = {
  id: number;
  label: string;
  tipo: string;
  texto_mensagem: string | null;
  contexto: string | null;
  ordem: number;
  cor: string | null;
  icone: string | null;
  ativo: boolean;
  produto_id: number | null;
  ordenacao: 'texto_primeiro' | 'midias_primeiro' | 'caption_primeira_midia' | 'intercalado';
  usar_caption: boolean;
  preview_config: any;
};

export type BotaoMidia = {
  id: string;
  botao_id: number;
  tipo: 'image' | 'video' | 'audio' | 'document';
  url: string;
  mime_type: string | null;
  tamanho: number | null;
  nome_arquivo: string | null;
  ordem: number;
};
