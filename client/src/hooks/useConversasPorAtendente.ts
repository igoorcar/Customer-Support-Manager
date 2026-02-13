import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface ConversaAtendente {
  id: string;
  cliente_id: string;
  atendente_id: string;
  status: string;
  ultima_mensagem: string;
  ultima_mensagem_em: string;
  clientes?: {
    id: string;
    nome: string;
    whatsapp: string;
    email: string;
  };
}

interface UseConversasPorAtendenteProps {
  atendenteEmail: string;
  filtroStatus?: 'todas' | 'nova' | 'em_atendimento' | 'pausada' | 'finalizada';
}

export const useConversasPorAtendente = ({
  atendenteEmail,
  filtroStatus = 'em_atendimento'
}: UseConversasPorAtendenteProps) => {
  const [conversas, setConversas] = useState<ConversaAtendente[]>([]);
  const [loading, setLoading] = useState(true);
  const [atendenteId, setAtendenteId] = useState<string | null>(null);

  useEffect(() => {
    const fetchAtendenteId = async () => {
      const { data } = await supabase
        .from('atendentes')
        .select('id')
        .eq('email', atendenteEmail)
        .single();

      if (data) setAtendenteId(data.id);
    };

    fetchAtendenteId();
  }, [atendenteEmail]);

  useEffect(() => {
    if (!atendenteId) return;

    const fetchConversas = async () => {
      setLoading(true);

      let query = supabase
        .from('conversas')
        .select(`
          *,
          clientes (
            id,
            nome,
            whatsapp,
            email
          )
        `)
        .eq('atendente_id', atendenteId);

      if (filtroStatus !== 'todas') {
        query = query.eq('status', filtroStatus);
      }

      const { data, error } = await query
        .order('ultima_mensagem_em', { ascending: false });

      if (data && !error) {
        setConversas(data);
      }

      setLoading(false);
    };

    fetchConversas();

    const channel = supabase
      .channel(`conversas-atendente-${atendenteId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversas',
          filter: `atendente_id=eq.${atendenteId}`
        },
        () => fetchConversas()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [atendenteId, filtroStatus]);

  return { conversas, loading, atendenteId };
};
