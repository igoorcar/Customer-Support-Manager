import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Tag, X, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

interface Etiqueta {
  id: string;
  nome: string;
  cor: string;
  tipo: 'funil' | 'produto' | 'status';
}

interface EtiquetasManagerProps {
  conversaId: string;
}

export function EtiquetasManager({ conversaId }: EtiquetasManagerProps) {
  const [etiquetas, setEtiquetas] = useState<Etiqueta[]>([]);
  const [etiquetasAplicadas, setEtiquetasAplicadas] = useState<Etiqueta[]>([]);
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
    const fetchEtiquetasAplicadas = async () => {
      const { data } = await supabase
        .from('conversas_etiquetas')
        .select(`
          etiqueta_id,
          etiquetas (
            id,
            nome,
            cor,
            tipo
          )
        `)
        .eq('conversa_id', conversaId);

      if (data) {
        const etiquetasData = data
          .map(item => (item as any).etiquetas)
          .filter((e): e is Etiqueta => e != null);
        setEtiquetasAplicadas(etiquetasData);
      }
    };

    fetchEtiquetasAplicadas();

    const channel = supabase
      .channel(`etiquetas-${conversaId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversas_etiquetas',
          filter: `conversa_id=eq.${conversaId}`
        },
        () => fetchEtiquetasAplicadas()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversaId]);

  const adicionarEtiqueta = async (etiquetaId: string) => {
    const { error } = await supabase
      .from('conversas_etiquetas')
      .insert({
        conversa_id: conversaId,
        etiqueta_id: etiquetaId
      });

    if (error) {
      toast({ title: "Erro ao adicionar etiqueta", variant: "destructive" });
    } else {
      setMostrarSeletor(false);
    }
  };

  const removerEtiqueta = async (etiquetaId: string) => {
    const { error } = await supabase
      .from('conversas_etiquetas')
      .delete()
      .eq('conversa_id', conversaId)
      .eq('etiqueta_id', etiquetaId);

    if (error) {
      toast({ title: "Erro ao remover etiqueta", variant: "destructive" });
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
                  onClick={() => adicionarEtiqueta(etiqueta.id)}
                  disabled={jaAplicada}
                  className="justify-start text-white"
                  style={{ backgroundColor: etiqueta.cor, borderColor: etiqueta.cor }}
                  data-testid={`button-etiqueta-${etiqueta.id}`}
                >
                  <Tag className="w-3.5 h-3.5" />
                  {etiqueta.nome}
                </Button>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
