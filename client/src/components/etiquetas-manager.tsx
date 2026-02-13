import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Tag, X, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

export interface Etiqueta {
  id: string;
  nome: string;
  cor: string;
  tipo: 'funil' | 'produto' | 'status';
}

interface EtiquetasManagerProps {
  clienteId: string;
  conversaId?: string;
}

export function EtiquetasManager({ clienteId, conversaId }: EtiquetasManagerProps) {
  const [etiquetas, setEtiquetas] = useState<Etiqueta[]>([]);
  const [clienteTags, setClienteTags] = useState<string[]>([]);
  const [mostrarSeletor, setMostrarSeletor] = useState(false);
  const [tipoSelecionado, setTipoSelecionado] = useState<'funil' | 'produto' | 'status'>('funil');
  const { toast } = useToast();

  useEffect(() => {
    const fetchEtiquetas = async () => {
      const { data } = await supabase
        .from('etiquetas')
        .select('*')
        .eq('ativo', true)
        .order('tipo')
        .order('ordem', { ascending: true, nullsFirst: false });

      if (data) setEtiquetas(data);
    };

    fetchEtiquetas();
  }, []);

  useEffect(() => {
    const fetchClienteTags = async () => {
      const { data } = await supabase
        .from('clientes')
        .select('tags')
        .eq('id', clienteId)
        .single();

      if (data?.tags) {
        setClienteTags(data.tags || []);
      }
    };

    fetchClienteTags();

    const channel = supabase
      .channel(`cliente-tags-${clienteId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'clientes',
          filter: `id=eq.${clienteId}`
        },
        (payload) => {
          if (payload.new && (payload.new as any).tags) {
            setClienteTags((payload.new as any).tags || []);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clienteId]);

  const etiquetasAplicadas = etiquetas.filter(e => clienteTags.includes(e.id));

  const adicionarEtiqueta = async (etiquetaId: string) => {
    const newTags = [...clienteTags, etiquetaId];
    const { error } = await supabase
      .from('clientes')
      .update({ tags: newTags })
      .eq('id', clienteId);

    if (error) {
      toast({ title: "Erro ao adicionar etiqueta", variant: "destructive" });
    } else {
      setClienteTags(newTags);
      setMostrarSeletor(false);
    }
  };

  const removerEtiqueta = async (etiquetaId: string) => {
    const newTags = clienteTags.filter(t => t !== etiquetaId);
    const { error } = await supabase
      .from('clientes')
      .update({ tags: newTags })
      .eq('id', clienteId);

    if (error) {
      toast({ title: "Erro ao remover etiqueta", variant: "destructive" });
    } else {
      setClienteTags(newTags);
    }
  };

  const etiquetasPorTipo = etiquetas.filter(e => e.tipo === tipoSelecionado);
  const etiquetasAplicadasIds = etiquetasAplicadas.map(e => e.id);

  const tabs = [
    { key: 'funil' as const, label: 'Funil' },
    { key: 'produto' as const, label: 'Produtos' },
    { key: 'status' as const, label: 'Status' },
  ];

  return (
    <div className="space-y-2" data-testid="etiquetas-manager">
      <div className="flex flex-wrap gap-1.5 items-center">
        {etiquetasAplicadas.map(etiqueta => (
          <Badge
            key={etiqueta.id}
            className="flex items-center gap-1 text-white text-xs no-default-hover-elevate no-default-active-elevate"
            style={{ backgroundColor: etiqueta.cor, borderColor: etiqueta.cor }}
            data-testid={`etiqueta-${etiqueta.id}`}
          >
            <Tag className="w-3 h-3" />
            {etiqueta.nome}
            <Button
              variant="ghost"
              size="icon"
              className="ml-0.5 h-4 w-4 p-0 text-white"
              onClick={() => removerEtiqueta(etiqueta.id)}
              aria-label={`Remover etiqueta ${etiqueta.nome}`}
              data-testid={`button-remover-etiqueta-${etiqueta.id}`}
            >
              <X className="w-3 h-3" />
            </Button>
          </Badge>
        ))}

        <Button
          variant="outline"
          size="sm"
          onClick={() => setMostrarSeletor(!mostrarSeletor)}
          data-testid="button-adicionar-etiqueta"
        >
          <Plus className="w-3 h-3" />
          Etiqueta
        </Button>
      </div>

      {mostrarSeletor && (
        <Card className="p-3">
          <div className="flex gap-1 mb-3 border-b">
            {tabs.map(tab => (
              <Button
                key={tab.key}
                variant="ghost"
                size="sm"
                onClick={() => setTipoSelecionado(tab.key)}
                className={`rounded-none ${
                  tipoSelecionado === tab.key
                    ? 'border-b-2 border-primary text-primary'
                    : 'text-muted-foreground'
                }`}
                data-testid={`tab-etiqueta-${tab.key}`}
              >
                {tab.label}
              </Button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2">
            {etiquetasPorTipo.length === 0 && (
              <p className="text-xs text-muted-foreground col-span-2 py-2 text-center" data-testid="text-sem-etiquetas">
                Nenhuma etiqueta deste tipo
              </p>
            )}
            {etiquetasPorTipo.map(etiqueta => {
              const jaAplicada = etiquetasAplicadasIds.includes(etiqueta.id);

              return (
                <Button
                  key={etiqueta.id}
                  variant="default"
                  size="sm"
                  onClick={() => jaAplicada ? removerEtiqueta(etiqueta.id) : adicionarEtiqueta(etiqueta.id)}
                  className={`justify-start text-white ${jaAplicada ? 'opacity-60' : ''}`}
                  style={{ backgroundColor: etiqueta.cor, borderColor: etiqueta.cor }}
                  data-testid={`button-etiqueta-${etiqueta.id}`}
                >
                  <Tag className="w-3.5 h-3.5" />
                  {etiqueta.nome}
                  {jaAplicada && <X className="w-3 h-3 ml-auto" />}
                </Button>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}

export function useEtiquetas() {
  const [etiquetas, setEtiquetas] = useState<Etiqueta[]>([]);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('etiquetas')
        .select('*')
        .eq('ativo', true)
        .order('tipo')
        .order('ordem', { ascending: true, nullsFirst: false });
      if (data) setEtiquetas(data);
    };
    fetch();
  }, []);

  return etiquetas;
}
