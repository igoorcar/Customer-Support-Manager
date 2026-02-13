import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { User, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface Atendente {
  id: string;
  nome: string;
  email: string;
  online: boolean;
  status: 'ativo' | 'ausente' | 'offline';
  conversas_ativas: number;
  limite_conversas: number;
}

interface AtendenteStatusProps {
  atendenteEmail: string;
}

export function AtendenteStatus({ atendenteEmail }: AtendenteStatusProps) {
  const [atendente, setAtendente] = useState<Atendente | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchAtendente = async () => {
      const { data } = await supabase
        .from('atendentes')
        .select('*')
        .eq('email', atendenteEmail)
        .single();

      if (data) setAtendente(data);
    };

    fetchAtendente();

    const channel = supabase
      .channel(`atendente-status-${atendenteEmail}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'atendentes',
          filter: `email=eq.${atendenteEmail}`
        },
        (payload) => {
          if (payload.new) {
            setAtendente(payload.new as Atendente);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [atendenteEmail]);

  useEffect(() => {
    if (!atendente) return;

    const marcarOnline = async () => {
      const currentStatus = atendente.status === 'ausente' ? 'ausente' : 'ativo';
      await supabase
        .from('atendentes')
        .update({
          online: true,
          status: currentStatus,
          ultima_atividade: new Date().toISOString()
        })
        .eq('email', atendenteEmail);
      setAtendente(prev => prev ? { ...prev, online: true, status: currentStatus } : prev);
    };

    marcarOnline();

    const interval = setInterval(() => {
      supabase
        .from('atendentes')
        .update({
          ultima_atividade: new Date().toISOString()
        })
        .eq('email', atendenteEmail);
    }, 30000);

    const marcarOffline = async () => {
      await supabase
        .from('atendentes')
        .update({
          online: false,
          status: 'offline'
        })
        .eq('email', atendenteEmail);
    };

    window.addEventListener('beforeunload', marcarOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', marcarOffline);
      marcarOffline();
    };
  }, [atendente?.id, atendenteEmail]);

  const alternarStatus = async (novoStatus: 'ativo' | 'ausente' | 'offline') => {
    if (!atendente) return;

    const novoOnline = novoStatus !== 'offline';
    setAtendente({ ...atendente, status: novoStatus, online: novoOnline });
    setLoading(true);
    try {
      const { error } = await supabase
        .from('atendentes')
        .update({
          status: novoStatus,
          online: novoOnline,
          ultima_atividade: new Date().toISOString()
        })
        .eq('id', atendente.id);
      if (error) {
        console.error('Erro ao alterar status:', error);
        const { data } = await supabase
          .from('atendentes')
          .select('*')
          .eq('id', atendente.id)
          .single();
        if (data) setAtendente(data);
      }
    } catch (error) {
      console.error('Erro ao alterar status:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!atendente) return null;

  const getStatusColor = () => {
    if (!atendente.online) return 'bg-muted-foreground';
    if (atendente.status === 'ativo') return 'bg-chart-2';
    if (atendente.status === 'ausente') return 'bg-chart-4';
    return 'bg-muted-foreground';
  };

  const getStatusText = () => {
    if (!atendente.online) return 'Offline';
    if (atendente.status === 'ativo') return 'Disponivel';
    if (atendente.status === 'ausente') return 'Ausente';
    return 'Offline';
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };

  return (
    <div className="flex items-center gap-3 p-3 border rounded-md" data-testid="atendente-status">
      <div className="relative">
        <Avatar className="h-9 w-9" data-testid="avatar-atendente">
          <AvatarFallback className="bg-primary/10 text-primary text-xs">
            {getInitials(atendente.nome)}
          </AvatarFallback>
        </Avatar>
        <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-background ${getStatusColor()}`} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm truncate" data-testid="text-atendente-nome">{atendente.nome}</div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Circle className={`w-2 h-2 fill-current ${getStatusColor().replace('bg-', 'text-')}`} />
          <span data-testid="text-atendente-status">{getStatusText()}</span>
        </div>
      </div>

      <div className="text-right flex-shrink-0">
        <div className="text-sm font-medium" data-testid="text-atendente-conversas">
          {atendente.conversas_ativas}/{atendente.limite_conversas}
        </div>
        <div className="text-xs text-muted-foreground" data-testid="text-atendente-conversas-label">conversas</div>
      </div>

      <div className="flex gap-1 flex-shrink-0">
        <Button
          variant={atendente.status === 'ativo' && atendente.online ? 'default' : 'outline'}
          size="sm"
          onClick={() => alternarStatus('ativo')}
          disabled={loading || (atendente.status === 'ativo' && atendente.online)}
          data-testid="button-status-ativo"
        >
          Ativo
        </Button>
        <Button
          variant={atendente.status === 'ausente' ? 'secondary' : 'outline'}
          size="sm"
          onClick={() => alternarStatus('ausente')}
          disabled={loading || atendente.status === 'ausente'}
          data-testid="button-status-ausente"
        >
          Ausente
        </Button>
      </div>
    </div>
  );
}
