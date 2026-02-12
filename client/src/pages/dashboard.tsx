import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Clock,
  MessageCircle,
  CheckCircle,
  Timer,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  MessageSquare,
  UserPlus,
  ArrowLeftRight,
  LogOut,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { Conversation, Activity } from "@shared/schema";

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  nova: { label: "Nova", variant: "default" },
  em_atendimento: { label: "Em atendimento", variant: "secondary" },
  pausada: { label: "Pausada", variant: "outline" },
  finalizada: { label: "Finalizada", variant: "secondary" },
};

const activityIconMap: Record<string, typeof MessageSquare> = {
  nova_conversa: MessageSquare,
  mensagem: MessageCircle,
  transferencia: ArrowLeftRight,
  finalizacao: LogOut,
  novo_cliente: UserPlus,
};

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor,
  trend,
  trendLabel,
  isLoading,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: typeof Clock;
  iconColor: string;
  trend?: number;
  trendLabel?: string;
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-10 w-10 rounded-md" />
          </div>
        </CardContent>
      </Card>
    );
  }
  return (
    <Card className="hover-elevate transition-all duration-200" data-testid={`metric-${title.toLowerCase().replace(/\s+/g, "-")}`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            <div className="flex items-center gap-1.5">
              {trend !== undefined && (
                <span className={`flex items-center text-xs font-medium ${trend >= 0 ? "text-chart-2" : "text-destructive"}`}>
                  {trend >= 0 ? <TrendingUp className="w-3 h-3 mr-0.5" /> : <TrendingDown className="w-3 h-3 mr-0.5" />}
                  {Math.abs(trend)}%
                </span>
              )}
              <span className="text-xs text-muted-foreground">{trendLabel || subtitle}</span>
            </div>
          </div>
          <div className={`flex items-center justify-center w-10 h-10 rounded-md ${iconColor}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function formatRelativeTime(date: string | Date) {
  const now = new Date();
  const d = new Date(date);
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60) return "agora mesmo";
  if (diff < 3600) return `há ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `há ${Math.floor(diff / 3600)}h`;
  return `há ${Math.floor(diff / 86400)}d`;
}

function formatDuration(minutes: number | null) {
  if (!minutes) return "--";
  if (minutes < 60) return `${minutes}min`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}min`;
}

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery<{
    waiting: number;
    active: number;
    finishedToday: number;
    avgTime: number;
    waitingTrend: number;
    finishedTrend: number;
  }>({
    queryKey: ["/api/stats"],
  });

  const { data: conversations, isLoading: convsLoading } = useQuery<(Conversation & { clientName: string; attendantName: string })[]>({
    queryKey: ["/api/conversations"],
  });

  const { data: activities, isLoading: activitiesLoading } = useQuery<Activity[]>({
    queryKey: ["/api/activities"],
  });

  const { data: chartData } = useQuery<{ hour: string; conversas: number }[]>({
    queryKey: ["/api/stats/chart"],
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold" data-testid="text-dashboard-title">Dashboard</h1>
        <p className="text-sm text-muted-foreground" data-testid="text-dashboard-subtitle">Visão geral do atendimento</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard
          title="Aguardando"
          value={stats?.waiting ?? 0}
          subtitle="na fila"
          icon={Clock}
          iconColor="bg-primary/10 text-primary"
          trend={stats?.waitingTrend}
          trendLabel="na fila"
          isLoading={statsLoading}
        />
        <MetricCard
          title="Em Atendimento"
          value={stats?.active ?? 0}
          subtitle="conversas ativas"
          icon={MessageCircle}
          iconColor="bg-chart-2/10 text-chart-2"
          isLoading={statsLoading}
        />
        <MetricCard
          title="Finalizadas Hoje"
          value={stats?.finishedToday ?? 0}
          subtitle="vs ontem"
          icon={CheckCircle}
          iconColor="bg-chart-3/10 text-chart-3"
          trend={stats?.finishedTrend}
          trendLabel="vs ontem"
          isLoading={statsLoading}
        />
        <MetricCard
          title="Tempo Médio"
          value={stats?.avgTime ? `${stats.avgTime}min` : "--"}
          subtitle="por atendimento"
          icon={Timer}
          iconColor="bg-chart-4/10 text-chart-4"
          isLoading={statsLoading}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2" data-testid="card-chart-conversations">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-semibold">Conversas ao longo do dia</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {chartData ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="hour"
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={{ stroke: "hsl(var(--border))" }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "6px",
                        fontSize: "12px",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="conversas"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ fill: "hsl(var(--primary))", r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <Skeleton className="w-full h-full rounded-md" />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-activity-recent">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-semibold">Atividade Recente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {activitiesLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <Skeleton className="w-8 h-8 rounded-md flex-shrink-0" />
                    <div className="space-y-1 flex-1">
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                ))
              ) : activities && activities.length > 0 ? (
                activities.slice(0, 10).map((activity) => {
                  const Icon = activityIconMap[activity.type] || MessageSquare;
                  return (
                    <div key={activity.id} className="flex items-start gap-3" data-testid={`activity-${activity.id}`}>
                      <div className="flex items-center justify-center w-8 h-8 rounded-md bg-muted flex-shrink-0">
                        <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs leading-relaxed" data-testid={`text-activity-description-${activity.id}`}>{activity.description}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatRelativeTime(activity.timestamp)}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-muted-foreground text-center py-8">Nenhuma atividade recente</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-recent-conversations">
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
          <CardTitle className="text-sm font-semibold">Conversas Recentes</CardTitle>
          <Button variant="ghost" size="sm" asChild data-testid="button-view-all-conversations">
            <a href="/conversas" data-testid="link-view-all-conversations">
              Ver todas <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </a>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="table-recent-conversations">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Cliente</th>
                  <th className="text-left py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Atendente</th>
                  <th className="text-left py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Início</th>
                  <th className="text-left py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Duração</th>
                  <th className="text-left py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</th>
                  <th className="text-right py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Ações</th>
                </tr>
              </thead>
              <tbody>
                {convsLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-2.5 px-3"><Skeleton className="h-4 w-24" /></td>
                      <td className="py-2.5 px-3"><Skeleton className="h-4 w-20" /></td>
                      <td className="py-2.5 px-3"><Skeleton className="h-4 w-16" /></td>
                      <td className="py-2.5 px-3"><Skeleton className="h-4 w-12" /></td>
                      <td className="py-2.5 px-3"><Skeleton className="h-5 w-16 rounded-full" /></td>
                      <td className="py-2.5 px-3"><Skeleton className="h-4 w-12 ml-auto" /></td>
                    </tr>
                  ))
                ) : conversations && conversations.length > 0 ? (
                  conversations.slice(0, 8).map((conv) => {
                    const st = statusMap[conv.status] || statusMap.nova;
                    return (
                      <tr key={conv.id} className="border-b last:border-0 hover-elevate" data-testid={`row-conversation-${conv.id}`}>
                        <td className="py-2.5 px-3 font-medium">{conv.clientName}</td>
                        <td className="py-2.5 px-3 text-muted-foreground">{conv.attendantName || "--"}</td>
                        <td className="py-2.5 px-3 text-muted-foreground">{formatRelativeTime(conv.startedAt)}</td>
                        <td className="py-2.5 px-3 text-muted-foreground">{formatDuration(conv.duration)}</td>
                        <td className="py-2.5 px-3">
                          <Badge variant={st.variant} className="text-xs" data-testid={`badge-status-${conv.id}`}>{st.label}</Badge>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <Button variant="ghost" size="sm" data-testid={`button-view-${conv.id}`}>
                            Detalhes
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-muted-foreground text-sm">
                      Nenhuma conversa encontrada
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
