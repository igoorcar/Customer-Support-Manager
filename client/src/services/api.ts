import { supabase } from '@/lib/supabase';
import type { Conversa, Mensagem, ClienteSupabase, BotaoResposta, BotaoMidia } from '@/lib/supabase';

const N8N_BASE_URL = 'https://n8n-n8n-otica-suellenn.gycquy.easypanel.host';

export const api = {
  async getConversas(filtro?: 'todas' | 'aguardando' | 'minhas' | 'finalizadas' | 'ativas', atendenteId?: string) {
    let query = supabase
      .from('conversas')
      .select(`
        *,
        clientes (
          id,
          nome,
          whatsapp,
          email,
          avatar_url
        ),
        atendentes (
          id,
          nome,
          avatar_url
        )
      `)
      .order('iniciada_em', { ascending: false });

    if (filtro === 'aguardando') {
      query = query.eq('status', 'nova');
    } else if (filtro === 'minhas' && atendenteId) {
      query = query.eq('atendente_id', atendenteId).in('status', ['em_atendimento', 'pausada']);
    } else if (filtro === 'finalizadas') {
      query = query.eq('status', 'finalizada');
    } else if (filtro === 'ativas') {
      query = query.in('status', ['nova', 'em_atendimento', 'pausada']);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as Conversa[];
  },

  async getConversa(id: string) {
    const { data, error } = await supabase
      .from('conversas')
      .select(`
        *,
        clientes (*),
        atendentes (*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as Conversa;
  },

  async getMensagens(conversaId: string) {
    const { data, error } = await supabase
      .from('mensagens')
      .select(`
        *,
        atendentes (
          nome,
          avatar_url
        )
      `)
      .eq('conversa_id', conversaId)
      .order('enviada_em', { ascending: true });

    if (error) throw error;
    return data as Mensagem[];
  },

  async enviarMensagem(conversaId: string, numero: string, tipo: string, mensagem?: string, midiaUrl?: string) {
    const response = await fetch(`${N8N_BASE_URL}/webhook/whatsapp/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        numero,
        conversaId,
        tipo,
        mensagem: mensagem || '',
        midiaUrl: midiaUrl || null
      })
    });

    if (!response.ok) throw new Error('Erro ao enviar mensagem');
    return response.json();
  },

  async transferirConversa(conversaId: string, novoAtendenteId: string, atendenteOrigemId: string, motivo: string) {
    const response = await fetch(`${N8N_BASE_URL}/webhook/whatsapp/transferir`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversaId,
        novoAtendenteId,
        atendenteOrigemId,
        motivo
      })
    });

    if (!response.ok) throw new Error('Erro ao transferir conversa');
    return response.json();
  },

  async finalizarConversa(conversaId: string, motivo: string) {
    const { error } = await supabase
      .from('conversas')
      .update({
        status: 'finalizada',
        finalizada_em: new Date().toISOString(),
        motivo_finalizacao: motivo
      })
      .eq('id', conversaId);

    if (error) throw error;
  },

  async getClientes(busca?: string) {
    let query = supabase
      .from('clientes')
      .select('*')
      .eq('status', 'ativo')
      .order('nome');

    if (busca) {
      query = query.or(`nome.ilike.%${busca}%,whatsapp.ilike.%${busca}%,email.ilike.%${busca}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as ClienteSupabase[];
  },

  async getCliente(id: string) {
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as ClienteSupabase;
  },

  async getAtendentes() {
    const { data, error } = await supabase
      .from('atendentes')
      .select('*')
      .order('nome');

    if (error) throw error;
    return data;
  },

  async getBotoes(incluirInativos?: boolean) {
    let query = supabase
      .from('botoes_resposta')
      .select('*')
      .order('ordem');

    if (!incluirInativos) {
      query = query.eq('ativo', true);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as BotaoResposta[];
  },

  async getBotaoMidias(botaoId: number) {
    const { data, error } = await supabase
      .from('botoes_midias')
      .select('*')
      .eq('botao_id', botaoId)
      .order('ordem');

    if (error) throw error;
    return data as BotaoMidia[];
  },

  async criarBotao(botao: {
    label: string;
    tipo: string;
    textoMensagem?: string | null;
    ordenacao: string;
    usarCaption: boolean;
    midias?: Array<{
      tipo: string;
      url: string;
      mimeType: string;
      tamanho: number;
      nomeArquivo: string;
    }>;
  }) {
    const response = await fetch(`${N8N_BASE_URL}/webhook/botao/criar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(botao)
    });

    if (!response.ok) throw new Error('Erro ao criar botão');
    return response.json();
  },

  async enviarBotao(botaoId: number, conversaId: string, numero: string, atendenteId: string) {
    const response = await fetch(`${N8N_BASE_URL}/webhook/botao/enviar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        botaoId,
        conversaId,
        numero,
        atendenteId
      })
    });

    if (!response.ok) throw new Error('Erro ao enviar botão');
    return response.json();
  },

  async uploadMidia(file: File, tipo: 'conversas' | 'botoes') {
    const fileName = `${tipo}/${Date.now()}_${file.name}`;

    const { data, error } = await supabase.storage
      .from('midias')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('midias')
      .getPublicUrl(fileName);

    return {
      url: publicUrl,
      path: data.path,
      mimeType: file.type,
      tamanho: file.size,
      nomeArquivo: file.name
    };
  }
};
