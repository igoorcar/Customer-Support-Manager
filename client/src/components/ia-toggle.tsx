import { Bot, BotOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useIAControl } from '@/hooks/useIAControl';
import { verificarHorarioComercial } from '@/utils/horarioComercial';
import { useToast } from '@/hooks/use-toast';

interface IAToggleProps {
  conversaId: string;
}

export function IAToggle({ conversaId }: IAToggleProps) {
  const { iaStatus, ativarIA, desativarIA, loading } = useIAControl(conversaId);
  const { toast } = useToast();
  const horarioStatus = verificarHorarioComercial();

  const getModoTexto = () => {
    if (iaStatus.iaModo === 'manual') return 'Manual';
    if (iaStatus.iaModo === 'horario') return 'Auto - Fora de horário';
    if (iaStatus.iaModo === 'feriado') return 'Auto - Feriado';
    if (iaStatus.iaModo === 'domingo') return 'Auto - Domingo';
    return '';
  };

  if (iaStatus.iaAtiva) {
    return (
      <div className="flex items-center gap-3 p-2.5 bg-chart-2/10 border border-chart-2/30 rounded-md" data-testid="ia-toggle-active">
        <Bot className="w-4 h-4 text-chart-2 animate-pulse flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-chart-2">
              IA Ativa
            </span>
            <Badge variant="secondary" className="text-xs">
              {getModoTexto()}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Respostas automáticas ativadas
          </p>
        </div>
        {iaStatus.iaModo === 'manual' && (
          <Button
            variant="destructive"
            size="sm"
            onClick={async () => {
              try {
                await desativarIA();
              } catch {
                toast({ title: "Erro ao desativar IA", variant: "destructive" });
              }
            }}
            disabled={loading}
            data-testid="button-desativar-ia"
          >
            {loading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              'Desativar'
            )}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 p-2.5 bg-muted/50 border border-border rounded-md" data-testid="ia-toggle-inactive">
      <BotOff className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium">
          IA Desativada
        </span>
        <p className="text-xs text-muted-foreground mt-0.5">
          {horarioStatus.dentroHorario
            ? 'Atendimento humano'
            : horarioStatus.mensagem || 'Fora do horário comercial'}
        </p>
      </div>
      <Button
        variant="default"
        size="sm"
        onClick={async () => {
          try {
            await ativarIA();
          } catch {
            toast({ title: "Erro ao ativar IA", variant: "destructive" });
          }
        }}
        disabled={loading}
        data-testid="button-ativar-ia"
      >
        {loading ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          'Ativar IA'
        )}
      </Button>
    </div>
  );
}
