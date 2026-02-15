import { supabase } from '@/lib/supabase';
import type { Conversa, Mensagem, ClienteSupabase, BotaoResposta, BotaoMidia } from '@/lib/supabase';

const N8N_BASE_URL = 'https://n8n-n8n-otica-suellenn.gycquy.easypanel.host';

export const api = {
  async getConversas(filtro?: 'todas' | 'aguardando' | 'minhas' | 'finalizadas' | 'ativas', atendenteId?: string) {
    const selectFields = `
      *,
      clientes (
        id,
        nome,
        whatsapp,
        email,
        avatar_url,
        tags
      ),
      atendentes (
        id,
        nome,
        avatar_url
      )
    `;

    let query = supabase
      .from('conversas')
      .select(selectFields)
      .order('updated_at', { ascending: false });

    if (atendenteId) {
      query = query.eq('atendente_id', atendenteId);
    }

    if (filtro === 'aguardando') {
      query = query.eq('status', 'nova');
    } else if (filtro === 'finalizadas') {
      query = query.eq('status', 'finalizada');
    } else if (filtro === 'ativas') {
      query = query.in('status', ['nova', 'em_atendimento', 'pausada']);
    }

    const { data, error } = await query;
    if (error) { console.error('getConversas error:', error.message); throw error; }
    return (data || []) as Conversa[];
  },

  async getUltimasMensagens(conversaIds: string[]) {
    if (conversaIds.length === 0) return {} as Record<string, { conteudo: string; tipo: string; direcao: string; enviada_em: string }>;

    const { data } = await supabase
      .from('mensagens')
      .select('conversa_id, conteudo, tipo, direcao, enviada_em')
      .in('conversa_id', conversaIds)
      .order('enviada_em', { ascending: false })
      .limit(500);

    const result: Record<string, any> = {};
    if (data) {
      for (const msg of data) {
        if (!result[msg.conversa_id]) {
          result[msg.conversa_id] = msg;
        }
      }
    }
    return result;
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
      .order('created_at', { ascending: true });

    if (error) {
      if (error.message?.includes('created_at')) {
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('mensagens')
          .select('*')
          .eq('conversa_id', conversaId)
          .order('enviada_em', { ascending: true });
        if (fallbackError) throw fallbackError;
        return (fallbackData || []).map(m => ({ ...m, atendentes: null })) as Mensagem[];
      }
      console.error('getMensagens error:', error.message, error);
      throw error;
    }
    return (data || []).map(m => ({ ...m, atendentes: null })) as Mensagem[];
  },

  async deleteConversa(id: string) {
    // Primeiro deletar mensagens (chave estrangeira)
    const { error: msgError } = await supabase
      .from('mensagens')
      .delete()
      .eq('conversa_id', id);
    
    if (msgError) {
      console.error('deleteMensagens error:', msgError.message);
      throw msgError;
    }

    const { error: convError } = await supabase
      .from('conversas')
      .delete()
      .eq('id', id);

    if (convError) {
      console.error('deleteConversa error:', convError.message);
      throw convError;
    }
    return true;
  },

  async enviarMensagem(conversaId: string, numero: string, tipo: string, mensagem?: string, midiaUrl?: string, atendenteId?: string) {
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

    const now = new Date().toISOString();
    const mimeMap: Record<string, string> = {
      audio: 'audio/ogg',
      image: 'image/jpeg',
      video: 'video/mp4',
      document: 'application/octet-stream',
    };

    const conversaUpdate: Record<string, any> = {
      ultima_mensagem_em: now,
      updated_at: now,
      status: 'em_atendimento',
    };
    if (atendenteId) {
      conversaUpdate.atendente_id = atendenteId;
    }

    await Promise.all([
      supabase.from('mensagens').insert({
        conversa_id: conversaId,
        direcao: 'enviada',
        tipo,
        conteudo: mensagem || null,
        midia_url: midiaUrl || null,
        midia_mime_type: mimeMap[tipo] || null,
        status: 'enviada',
        enviada_em: now,
      }).then(({ error }) => {
        if (error) console.error('Erro ao salvar mensagem no Supabase:', error.message);
      }),
      supabase.from('conversas')
        .update(conversaUpdate)
        .eq('id', conversaId),
    ]);

    if (atendenteId) {
      setTimeout(async () => {
        await supabase.from('conversas')
          .update({ atendente_id: atendenteId })
          .eq('id', conversaId);
      }, 2000);
    }

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

  async uploadMidia(file: File, isAudio?: boolean) {
    const mimeBase = file.type.split(';')[0].trim();

    if (isAudio || mimeBase.startsWith('audio/')) {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload/audio', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Erro no upload de áudio: ${err}`);
      }

      const result = await response.json() as {
        url: string;
        path: string;
        mimeType: string;
        tamanho: number;
        nomeArquivo: string;
      };

      return result;
    }

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
  },

  async getDashboardCompleto(periodo: 'hoje' | '7dias' | '30dias' | 'mes') {
    try {
      const now = new Date();
      let dataInicio: Date;

      if (periodo === 'hoje') {
        dataInicio = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      } else if (periodo === '7dias') {
        dataInicio = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (periodo === '30dias') {
        dataInicio = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      } else {
        dataInicio = new Date(now.getFullYear(), now.getMonth(), 1);
      }

      const dataInicioISO = dataInicio.toISOString();

      const [
        allConvRes,
        mensagensIARes,
        atendenteRes,
        clientesRes,
        etiquetasRes,
      ] = await Promise.all([
        supabase.from('conversas').select('*, clientes(id, nome, tags), atendentes(id, nome)').gte('iniciada_em', dataInicioISO),
        supabase.from('mensagens').select('id, conversa_id, direcao, enviada_em, metadata').gte('enviada_em', dataInicioISO),
        supabase.from('atendentes').select('*'),
        supabase.from('clientes').select('id, nome, tags, criado_em, total_compras, valor_total_compras'),
        supabase.from('etiquetas').select('*'),
      ]);

      const conversas = allConvRes.data || [];
      const mensagens = mensagensIARes.data || [];
      const atendentes = atendenteRes.data || [];
      const clientes = clientesRes.data || [];
      const etiquetas = etiquetasRes.data || [];

      const totalConversas = conversas.length;
      const conversasAtivas = conversas.filter(c => ['nova', 'em_atendimento', 'pausada'].includes(c.status)).length;
      const conversasFechadas = conversas.filter(c => c.status === 'finalizada').length;
      const taxaConversao = totalConversas > 0 ? Math.round((conversasFechadas / totalConversas) * 100) : 0;

      const finalizadasComTempo = conversas.filter(c => c.status === 'finalizada' && c.finalizada_em);
      let tempoMedioResposta = 0;
      if (finalizadasComTempo.length > 0) {
        const duracoes = finalizadasComTempo.map(c => {
          const start = new Date(c.iniciada_em).getTime();
          const end = new Date(c.finalizada_em).getTime();
          return (end - start) / 1000 / 60;
        }).filter(d => d > 0 && d < 10080);
        if (duracoes.length > 0) {
          tempoMedioResposta = Math.round(duracoes.reduce((a, b) => a + b, 0) / duracoes.length);
        }
      }

      const mensagensIA = mensagens.filter(m => {
        const meta = m.metadata as any;
        return meta?.remetente === 'ia' || m.direcao === 'enviada';
      });
      const totalMensagensIA = mensagensIA.length;

      const conversasIAAtivaSet = new Set<string>();
      conversas.forEach(c => {
        if ((c as any).ia_ativa) conversasIAAtivaSet.add(c.id);
      });

      const atendenteStats = atendentes.map(at => {
        const convAt = conversas.filter(c => c.atendente_id === at.id);
        const convAtFechadas = convAt.filter(c => c.status === 'finalizada');
        const convAtAtivas = convAt.filter(c => ['nova', 'em_atendimento', 'pausada'].includes(c.status));

        let tempoMedio = 0;
        const finComTempo = convAtFechadas.filter(c => c.finalizada_em);
        if (finComTempo.length > 0) {
          const durs = finComTempo.map(c => {
            const s = new Date(c.iniciada_em).getTime();
            const e = new Date(c.finalizada_em).getTime();
            return (e - s) / 1000 / 60;
          }).filter(d => d > 0 && d < 10080);
          if (durs.length > 0) tempoMedio = Math.round(durs.reduce((a, b) => a + b, 0) / durs.length);
        }

        const taxa = convAt.length > 0 ? Math.round((convAtFechadas.length / convAt.length) * 100) : 0;

        const msgsAt = mensagens.filter(m => {
          const convIds = convAt.map(c => c.id);
          return convIds.includes(m.conversa_id) && m.direcao === 'enviada';
        });

        return {
          id: at.id,
          nome: at.nome,
          status: at.status,
          avatar_url: at.avatar_url,
          totalConversas: convAt.length,
          conversasFechadas: convAtFechadas.length,
          conversasAtivas: convAtAtivas.length,
          tempoMedio,
          taxaResolucao: taxa,
          mensagensEnviadas: msgsAt.length,
        };
      });

      const etiquetaMap: Record<string, { id: string; nome: string; cor: string; tipo: string; clientes: number; conversas: number; conversasFechadas: number }> = {};
      etiquetas.forEach(et => {
        etiquetaMap[et.id] = { id: et.id, nome: et.nome, cor: et.cor, tipo: et.tipo, clientes: 0, conversas: 0, conversasFechadas: 0 };
      });

      const clienteTagMap: Record<string, string[]> = {};
      clientes.forEach(cl => {
        const tags = (cl.tags as string[]) || [];
        clienteTagMap[cl.id] = tags;
        tags.forEach(tagId => {
          if (etiquetaMap[tagId]) etiquetaMap[tagId].clientes++;
        });
      });

      conversas.forEach(conv => {
        const clienteId = (conv.clientes as any)?.id;
        const tags = clienteId ? (clienteTagMap[clienteId] || []) : [];
        tags.forEach(tagId => {
          if (etiquetaMap[tagId]) {
            etiquetaMap[tagId].conversas++;
            if (conv.status === 'finalizada') etiquetaMap[tagId].conversasFechadas++;
          }
        });
      });

      const allEtiquetaStats = Object.values(etiquetaMap)
        .filter(e => e.clientes > 0 || e.conversas > 0)
        .sort((a, b) => b.conversas - a.conversas)
        .map(e => ({
          id: e.id,
          nome: e.nome,
          cor: e.cor,
          tipo: e.tipo,
          totalClientes: e.clientes,
          totalConversas: e.conversas,
          conversasFechadas: e.conversasFechadas,
          taxaConversao: e.conversas > 0 ? Math.round((e.conversasFechadas / e.conversas) * 100) : 0,
        }));

      const funilData = allEtiquetaStats.filter(e => e.tipo === 'funil').map(e => ({ name: e.nome, value: e.totalClientes, color: e.cor }));
      const produtoData = allEtiquetaStats.filter(e => e.tipo === 'produto').map(e => ({ name: e.nome, value: e.totalClientes, color: e.cor }));
      const statusTagData = allEtiquetaStats.filter(e => e.tipo === 'status').map(e => ({ name: e.nome, value: e.totalClientes, color: e.cor }));

      const conversasPorDia: Record<string, { total: number; fechadas: number; ativas: number }> = {};
      conversas.forEach(c => {
        const dia = new Date(c.iniciada_em).toISOString().split('T')[0];
        if (!conversasPorDia[dia]) conversasPorDia[dia] = { total: 0, fechadas: 0, ativas: 0 };
        conversasPorDia[dia].total++;
        if (c.status === 'finalizada') conversasPorDia[dia].fechadas++;
        else conversasPorDia[dia].ativas++;
      });
      const timelineData = Object.entries(conversasPorDia)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([data, vals]) => ({
          data: new Date(data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
          total: vals.total,
          fechadas: vals.fechadas,
          ativas: vals.ativas,
        }));

      const hourCounts: Record<number, number> = {};
      for (let h = 0; h < 24; h++) hourCounts[h] = 0;
      mensagens.forEach(m => {
        const h = new Date(m.enviada_em).getHours();
        hourCounts[h] = (hourCounts[h] || 0) + 1;
      });
      const hourlyData = Object.entries(hourCounts).map(([h, count]) => ({
        hora: `${h.padStart(2, '0')}h`,
        mensagens: count,
      }));

      const atendenteOnline = atendentes.filter(a => a.status === 'online').length;

      return {
        metricas: {
          totalConversas,
          conversasAtivas,
          conversasFechadas,
          taxaConversao,
          tempoMedioResposta,
          totalMensagensIA,
          conversasIAAtiva: conversasIAAtivaSet.size,
          atendenteOnline,
          totalClientes: clientes.length,
          novosClientes: clientes.filter(c => new Date(c.criado_em) >= dataInicio).length,
        },
        atendenteStats,
        funilData,
        produtoData,
        statusTagData,
        allEtiquetaStats,
        timelineData,
        hourlyData,
      };
    } catch (error) {
      console.error('getDashboardCompleto error:', error);
      return {
        metricas: {
          totalConversas: 0, conversasAtivas: 0, conversasFechadas: 0,
          taxaConversao: 0, tempoMedioResposta: 0, totalMensagensIA: 0,
          conversasIAAtiva: 0, atendenteOnline: 0, totalClientes: 0, novosClientes: 0,
        },
        atendenteStats: [],
        funilData: [],
        produtoData: [],
        statusTagData: [],
        allEtiquetaStats: [],
        timelineData: [],
        hourlyData: [],
      };
    }
  },

  async getRelatorioConversas(filtros: {
    dataInicio: string;
    dataFim: string;
    atendenteId?: string;
    status?: string;
    etiquetaId?: string;
  }) {
    try {
      let query = supabase
        .from('conversas')
        .select('*, clientes(id, nome, whatsapp, tags), atendentes(id, nome)')
        .gte('iniciada_em', filtros.dataInicio)
        .lte('iniciada_em', filtros.dataFim)
        .order('iniciada_em', { ascending: false });

      if (filtros.atendenteId) query = query.eq('atendente_id', filtros.atendenteId);
      if (filtros.status && filtros.status !== 'todas') query = query.eq('status', filtros.status);

      const { data, error } = await query;
      if (error) throw error;

      let conversas = data || [];

      if (filtros.etiquetaId) {
        conversas = conversas.filter(c => {
          const tags = (c.clientes as any)?.tags as string[] | undefined;
          return tags && tags.includes(filtros.etiquetaId!);
        });
      }

      const conversaIds = conversas.map(c => c.id);
      let msgCounts: Record<string, number> = {};
      if (conversaIds.length > 0) {
        const batchSize = 50;
        for (let i = 0; i < conversaIds.length; i += batchSize) {
          const batch = conversaIds.slice(i, i + batchSize);
          const { data: msgs } = await supabase
            .from('mensagens')
            .select('conversa_id')
            .in('conversa_id', batch);
          (msgs || []).forEach(m => {
            msgCounts[m.conversa_id] = (msgCounts[m.conversa_id] || 0) + 1;
          });
        }
      }

      return conversas.map(c => {
        let tempoTotal = '';
        if (c.finalizada_em && c.iniciada_em) {
          const diff = (new Date(c.finalizada_em).getTime() - new Date(c.iniciada_em).getTime()) / 1000 / 60;
          if (diff < 60) tempoTotal = `${Math.round(diff)}min`;
          else if (diff < 1440) tempoTotal = `${Math.round(diff / 60)}h`;
          else tempoTotal = `${Math.round(diff / 1440)}d`;
        }

        return {
          id: c.id,
          cliente: (c.clientes as any)?.nome || 'Desconhecido',
          clienteWhatsapp: (c.clientes as any)?.whatsapp || '',
          atendente: (c.atendentes as any)?.nome || '--',
          status: c.status,
          iniciadaEm: c.iniciada_em,
          finalizadaEm: c.finalizada_em,
          tempoTotal,
          totalMensagens: msgCounts[c.id] || 0,
        };
      });
    } catch (error) {
      console.error('getRelatorioConversas error:', error);
      return [];
    }
  },

  async getFollowupOverview(dias: number = 30) {
    try {
      const { data, error } = await supabase.rpc('get_followup_overview', { dias });
      if (error) throw error;
      return data?.[0] || null;
    } catch (error) {
      console.error('getFollowupOverview error:', error);
      return null;
    }
  },

  async getFollowupFunil() {
    try {
      const { data, error } = await supabase.rpc('get_funil_conversao');
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('getFollowupFunil error:', error);
      return [];
    }
  },

  async getFollowupPerformanceMensagem() {
    try {
      const { data, error } = await supabase
        .from('followup_performance_mensagem')
        .select('*')
        .order('mensagem_numero');
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('getFollowupPerformanceMensagem error:', error);
      return [];
    }
  },

  async getFollowupMelhorHorario() {
    try {
      const { data, error } = await supabase
        .from('followup_melhor_horario')
        .select('*')
        .order('taxa_resposta_pct', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('getFollowupMelhorHorario error:', error);
      return [];
    }
  },

  async getFollowupPerformanceFunil() {
    try {
      const { data, error } = await supabase
        .from('followup_performance_funil')
        .select('*')
        .order('taxa_conversao_pct', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('getFollowupPerformanceFunil error:', error);
      return [];
    }
  },

  async getFollowupMotivosPerda() {
    try {
      const { data, error } = await supabase
        .from('followup_motivos_perda')
        .select('*')
        .order('total', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('getFollowupMotivosPerda error:', error);
      return [];
    }
  },

  async getFollowupJornadas(apenasConvertidos: boolean = false, limit: number = 20) {
    try {
      let query = supabase
        .from('followup_jornada_lead')
        .select('*')
        .order('janela_72h_inicio', { ascending: false })
        .limit(limit);

      if (apenasConvertidos) {
        query = query.eq('converteu', true);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('getFollowupJornadas error:', error);
      return [];
    }
  },

  async getFollowupAbTests() {
    try {
      const { data, error } = await supabase
        .from('followup_ab_tests')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('getFollowupAbTests error:', error);
      return [];
    }
  },

  async createFollowupAbTest(teste: {
    nome: string;
    descricao?: string;
    mensagem_numero: number;
    variante_a: string;
    variante_b: string;
  }) {
    const { data, error } = await supabase
      .from('followup_ab_tests')
      .insert(teste)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateFollowupAbTest(id: string, updates: Record<string, any>) {
    const { error } = await supabase
      .from('followup_ab_tests')
      .update(updates)
      .eq('id', id);
    if (error) throw error;
  },
};
