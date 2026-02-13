import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface IAStatus {
  iaAtiva: boolean;
  iaModo: 'manual' | 'horario' | 'feriado' | 'domingo' | 'almoco';
  atendenteAusente: boolean;
}

export const useIAControl = (conversaId: string | null) => {
  const [iaStatus, setIAStatus] = useState<IAStatus>({
    iaAtiva: false,
    iaModo: 'manual',
    atendenteAusente: false
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!conversaId) return;

    const fetchStatus = async () => {
      const { data, error } = await supabase
        .from('conversas')
        .select('ia_ativa, ia_modo, atendente_ausente')
        .eq('id', conversaId)
        .single();

      if (data && !error) {
        setIAStatus({
          iaAtiva: data.ia_ativa || false,
          iaModo: data.ia_modo || 'manual',
          atendenteAusente: data.atendente_ausente || false
        });
      }
    };

    fetchStatus();

    const channel = supabase
      .channel(`conversa-ia-${conversaId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversas',
          filter: `id=eq.${conversaId}`
        },
        (payload) => {
          if (payload.new) {
            setIAStatus({
              iaAtiva: (payload.new as any).ia_ativa || false,
              iaModo: (payload.new as any).ia_modo || 'manual',
              atendenteAusente: (payload.new as any).atendente_ausente || false
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversaId]);

  const ativarIA = async () => {
    if (!conversaId) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('conversas')
        .update({
          ia_ativa: true,
          ia_modo: 'manual',
          atendente_ausente: true
        })
        .eq('id', conversaId);

      if (!error) {
        setIAStatus({
          iaAtiva: true,
          iaModo: 'manual',
          atendenteAusente: true
        });
      }
    } catch (error) {
      console.error('Erro ao ativar IA:', error);
    } finally {
      setLoading(false);
    }
  };

  const desativarIA = async () => {
    if (!conversaId) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('conversas')
        .update({
          ia_ativa: false,
          ia_modo: 'manual',
          atendente_ausente: false
        })
        .eq('id', conversaId);

      if (!error) {
        setIAStatus({
          iaAtiva: false,
          iaModo: 'manual',
          atendenteAusente: false
        });
      }
    } catch (error) {
      console.error('Erro ao desativar IA:', error);
    } finally {
      setLoading(false);
    }
  };

  return {
    iaStatus,
    ativarIA,
    desativarIA,
    loading
  };
};
