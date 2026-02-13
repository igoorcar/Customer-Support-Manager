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
    if (error) {
      console.error('getConversas error:', error.message);
      throw error;
    }
    return (data || []) as Conversa[];
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
      .select('*')
      .eq('conversa_id', conversaId)
      .order('enviada_em', { ascending: true });

    if (error) {
      console.error('getMensagens error:', error.message, error);
      throw error;
    }
    return (data || []).map(m => ({ ...m, atendentes: null })) as Mensagem[];
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
    const text = await response.text();
    if (!text) return { ok: true };
    try {
      return JSON.parse(text);
    } catch {
      return { ok: true, raw: text };
    }
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
    const text = await response.text();
    if (!text) return { ok: true };
    try {
      return JSON.parse(text);
    } catch {
      return { ok: true, raw: text };
    }
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
    const text = await response.text();
    if (!text) return { ok: true };
    try {
      return JSON.parse(text);
    } catch {
      return { ok: true, raw: text };
    }
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
    const text = await response.text();
    if (!text) return { ok: true };
    try {
      return JSON.parse(text);
    } catch {
      return { ok: true, raw: text };
    }
  },

  async uploadMidia(file: File) {
    const extMap: Record<string, string> = {
      'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
      'video/mp4': 'mp4', 'video/3gpp': '3gp',
      'audio/ogg': 'ogg', 'audio/mpeg': 'mp3', 'audio/mp4': 'm4a',
      'audio/webm': 'webm', 'audio/amr': 'amr',
      'application/pdf': 'pdf',
    };

    const mimeBase = file.type.split(';')[0].trim();
    const ext = extMap[mimeBase] || file.name.split('.').pop() || 'bin';
    const folder = mimeBase.startsWith('image') ? 'imagens'
      : mimeBase.startsWith('video') ? 'videos'
      : mimeBase.startsWith('audio') ? 'audios'
      : 'documentos';
    const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

    try {
      const { error } = await supabase.storage
        .from('midias')
        .upload(fileName, file, {
          contentType: mimeBase,
          cacheControl: '3600',
          upsert: false,
        });

      if (error) throw error;

      const { data } = supabase.storage
        .from('midias')
        .getPublicUrl(fileName);

      return {
        url: data.publicUrl,
        path: fileName,
        mimeType: mimeBase,
        tamanho: file.size,
        nomeArquivo: file.name,
      };
    } catch (supabaseError) {
      console.warn('Supabase Storage falhou, usando upload local:', supabaseError);
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Erro no upload: ${err}`);
      }

      return response.json() as Promise<{
        url: string;
        path: string;
        mimeType: string;
        tamanho: number;
        nomeArquivo: string;
      }>;
    }
  },

  async getDashboardStats() {
    try {
      const today = new Date().toISOString().split('T')[0];
      const startOfDay = `${today}T00:00:00.000Z`;

      const [waitingRes, activeRes, finishedTodayRes, finishedAllRes] = await Promise.all([
        supabase.from('conversas').select('id', { count: 'exact', head: true }).eq('status', 'nova'),
        supabase.from('conversas').select('id', { count: 'exact', head: true }).eq('status', 'em_atendimento'),
        supabase.from('conversas').select('id', { count: 'exact', head: true }).eq('status', 'finalizada').gte('finalizada_em', startOfDay),
        supabase.from('conversas').select('iniciada_em, finalizada_em').eq('status', 'finalizada').not('finalizada_em', 'is', null),
      ]);

      const waiting = waitingRes.count || 0;
      const active = activeRes.count || 0;
      const finishedToday = finishedTodayRes.count || 0;

      let avgTime = 0;
      if (finishedAllRes.data && finishedAllRes.data.length > 0) {
        const durations = finishedAllRes.data.map((c: any) => {
          const start = new Date(c.iniciada_em).getTime();
          const end = new Date(c.finalizada_em).getTime();
          return (end - start) / 1000 / 60;
        }).filter((d: number) => d > 0);
        if (durations.length > 0) {
          avgTime = Math.round(durations.reduce((a: number, b: number) => a + b, 0) / durations.length);
        }
      }

      return { waiting, active, finishedToday, avgTime };
    } catch (error) {
      console.error('getDashboardStats error:', error);
      return { waiting: 0, active: 0, finishedToday: 0, avgTime: 0 };
    }
  },

  async getDashboardChart() {
    try {
      const today = new Date().toISOString().split('T')[0];
      const startOfDay = `${today}T00:00:00.000Z`;
      const endOfDay = `${today}T23:59:59.999Z`;

      const { data, error } = await supabase
        .from('conversas')
        .select('iniciada_em')
        .gte('iniciada_em', startOfDay)
        .lte('iniciada_em', endOfDay);

      if (error) throw error;

      const hourCounts: Record<string, number> = {};
      for (let h = 0; h < 24; h++) {
        const hourStr = h.toString().padStart(2, '0') + ':00';
        hourCounts[hourStr] = 0;
      }

      (data || []).forEach((c: any) => {
        const hour = new Date(c.iniciada_em).getHours();
        const hourStr = hour.toString().padStart(2, '0') + ':00';
        hourCounts[hourStr] = (hourCounts[hourStr] || 0) + 1;
      });

      return Object.entries(hourCounts).map(([hour, conversas]) => ({ hour, conversas }));
    } catch (error) {
      console.error('getDashboardChart error:', error);
      return [];
    }
  },

  async getRecentActivity() {
    try {
      const { data, error } = await supabase
        .from('conversas')
        .select(`
          id,
          status,
          iniciada_em,
          finalizada_em,
          clientes (
            nome
          )
        `)
        .order('iniciada_em', { ascending: false })
        .limit(15);

      if (error) throw error;

      return (data || []).map((c: any) => {
        const clienteNome = c.clientes?.nome || 'Cliente desconhecido';
        let type: string;
        let description: string;

        if (c.status === 'nova') {
          type = 'nova_conversa';
          description = `Nova conversa de ${clienteNome}`;
        } else if (c.status === 'finalizada') {
          type = 'finalizacao';
          description = `Conversa com ${clienteNome} finalizada`;
        } else {
          type = 'mensagem';
          description = `Conversa com ${clienteNome} - ${c.status}`;
        }

        return {
          id: c.id,
          type,
          description,
          timestamp: c.status === 'finalizada' && c.finalizada_em ? c.finalizada_em : c.iniciada_em,
        };
      });
    } catch (error) {
      console.error('getRecentActivity error:', error);
      return [];
    }
  },

  async getClientesSupabase(options?: { search?: string; page?: number; limit?: number }) {
    try {
      const page = options?.page || 1;
      const limit = options?.limit || 20;
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      let query = supabase
        .from('clientes')
        .select('*', { count: 'exact' })
        .order('nome')
        .range(from, to);

      if (options?.search) {
        query = query.or(`nome.ilike.%${options.search}%,whatsapp.ilike.%${options.search}%,email.ilike.%${options.search}%`);
      }

      const { data, error, count } = await query;
      if (error) throw error;

      return { data: (data || []) as ClienteSupabase[], total: count || 0 };
    } catch (error) {
      console.error('getClientesSupabase error:', error);
      return { data: [] as ClienteSupabase[], total: 0 };
    }
  },

  async getClienteConversas(clienteId: string) {
    try {
      const { data, error } = await supabase
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
        .eq('cliente_id', clienteId)
        .order('iniciada_em', { ascending: false });

      if (error) throw error;
      return (data || []) as Conversa[];
    } catch (error) {
      console.error('getClienteConversas error:', error);
      return [] as Conversa[];
    }
  },

  async getReportsData() {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const thirtyDaysAgoISO = thirtyDaysAgo.toISOString();

      const [totalConvRes, totalCliRes, responseTimeRes, allConvRes, weeklyRes] = await Promise.all([
        supabase.from('conversas').select('id', { count: 'exact', head: true }),
        supabase.from('clientes').select('id', { count: 'exact', head: true }),
        supabase.from('conversas').select('iniciada_em, atribuida_em').not('atribuida_em', 'is', null),
        supabase.from('conversas').select('status'),
        supabase.from('conversas').select('iniciada_em').gte('iniciada_em', thirtyDaysAgoISO),
      ]);

      const totalConversations = totalConvRes.count || 0;
      const totalClients = totalCliRes.count || 0;

      let avgResponseTime = 0;
      if (responseTimeRes.data && responseTimeRes.data.length > 0) {
        const times = responseTimeRes.data.map((c: any) => {
          const start = new Date(c.iniciada_em).getTime();
          const end = new Date(c.atribuida_em).getTime();
          return (end - start) / 1000 / 60;
        }).filter((t: number) => t > 0);
        if (times.length > 0) {
          avgResponseTime = Math.round(times.reduce((a: number, b: number) => a + b, 0) / times.length);
        }
      }

      const statusColors: Record<string, string> = {
        nova: '#3b82f6',
        em_atendimento: '#f59e0b',
        pausada: '#8b5cf6',
        finalizada: '#10b981',
      };
      const statusCounts: Record<string, number> = {};
      (allConvRes.data || []).forEach((c: any) => {
        statusCounts[c.status] = (statusCounts[c.status] || 0) + 1;
      });
      const statusDistribution = Object.entries(statusCounts).map(([status, count]) => ({
        status,
        count,
        color: statusColors[status] || '#6b7280',
      }));

      const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
      const dayCounts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
      (weeklyRes.data || []).forEach((c: any) => {
        const day = new Date(c.iniciada_em).getDay();
        dayCounts[day] = (dayCounts[day] || 0) + 1;
      });
      const weeklyData = dayNames.map((name, index) => ({
        dia: name,
        conversas: dayCounts[index] || 0,
      }));

      return { totalConversations, totalClients, avgResponseTime, statusDistribution, weeklyData };
    } catch (error) {
      console.error('getReportsData error:', error);
      return {
        totalConversations: 0,
        totalClients: 0,
        avgResponseTime: 0,
        statusDistribution: [],
        weeklyData: [],
      };
    }
  },

  async getAtendentesStats() {
    try {
      const { data: atendentes, error: atError } = await supabase
        .from('atendentes')
        .select('*')
        .order('nome');

      if (atError) throw atError;

      const stats = await Promise.all(
        (atendentes || []).map(async (at: any) => {
          const { count } = await supabase
            .from('conversas')
            .select('id', { count: 'exact', head: true })
            .eq('atendente_id', at.id);

          const { data: finished } = await supabase
            .from('conversas')
            .select('iniciada_em, finalizada_em')
            .eq('atendente_id', at.id)
            .eq('status', 'finalizada')
            .not('finalizada_em', 'is', null);

          let tempoMedio = 0;
          if (finished && finished.length > 0) {
            const durations = finished.map((c: any) => {
              const start = new Date(c.iniciada_em).getTime();
              const end = new Date(c.finalizada_em).getTime();
              return (end - start) / 1000 / 60;
            }).filter((d: number) => d > 0);
            if (durations.length > 0) {
              tempoMedio = Math.round(durations.reduce((a: number, b: number) => a + b, 0) / durations.length);
            }
          }

          return {
            id: at.id,
            nome: at.nome,
            avatar_url: at.avatar_url,
            status: at.status,
            conversasAtendidas: count || 0,
            tempoMedio,
          };
        })
      );

      return stats;
    } catch (error) {
      console.error('getAtendentesStats error:', error);
      return [];
    }
  },

  async getHourlyDistribution() {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const thirtyDaysAgoISO = thirtyDaysAgo.toISOString();

      const { data, error } = await supabase
        .from('conversas')
        .select('iniciada_em')
        .gte('iniciada_em', thirtyDaysAgoISO);

      if (error) throw error;

      const hourCounts: Record<number, number> = {};
      for (let h = 0; h < 24; h++) {
        hourCounts[h] = 0;
      }

      (data || []).forEach((c: any) => {
        const hour = new Date(c.iniciada_em).getHours();
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      });

      return Object.entries(hourCounts).map(([h, count]) => ({
        hora: `${h}h`,
        conversas: count,
      }));
    } catch (error) {
      console.error('getHourlyDistribution error:', error);
      return [];
    }
  },

  async getClosingReasons() {
    try {
      const { data, error } = await supabase
        .from('conversas')
        .select('motivo_finalizacao')
        .eq('status', 'finalizada')
        .not('motivo_finalizacao', 'is', null);

      if (error) throw error;

      const reasonCounts: Record<string, number> = {};
      (data || []).forEach((c: any) => {
        const motivo = c.motivo_finalizacao || 'Não informado';
        reasonCounts[motivo] = (reasonCounts[motivo] || 0) + 1;
      });

      const total = Object.values(reasonCounts).reduce((a, b) => a + b, 0);

      return Object.entries(reasonCounts).map(([motivo, quantidade]) => ({
        motivo,
        quantidade,
        percentual: total > 0 ? Math.round((quantidade / total) * 100) : 0,
      }));
    } catch (error) {
      console.error('getClosingReasons error:', error);
      return [];
    }
  }
};
