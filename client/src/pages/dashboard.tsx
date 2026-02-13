import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
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
  Bot,
  Users,
  Target,
  Percent,
  Zap,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { api } from "@/services/api";
import type { Conversa } from "@/lib/supabase";

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "6px",
  fontSize: "12px",
};
const axisTickStyle = { fontSize: 11, fill: "hsl(var(--muted-foreground))" };

const CHART_COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#ec4899", "#14b8a6", "#f97316",
];

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
  isLoading,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: typeof Clock;
  iconColor: string;
  trend?: number;
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-7 w-14" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-9 w-9 rounded-md" />
          </div>
        </CardContent>
      </Card>
    );
  }
  return (
    <Card data-testid={`metric-${title.toLowerCase().replace(/\s+/g, "-")}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-0.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            <div className="flex items-center gap-1.5">
              {trend !== undefined && trend !== 0 && (
                <span className={`flex items-center text-xs font-medium ${trend >= 0 ? "text-chart-2" : "text-destructive"}`}>
                  {trend >= 0 ? <TrendingUp className="w-3 h-3 mr-0.5" /> : <TrendingDown className="w-3 h-3 mr-0.5" />}
                  {Math.abs(trend)}%
                </span>
              )}
              <span className="text-xs text-muted-foreground">{subtitle}</span>
            </div>
          </div>
          <div className={`flex items-center justify-center w-9 h-9 rounded-md ${iconColor}`}>
            <Icon className="w-4.5 h-4.5" />
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

export default function Dashboard() {
  const [periodo, setPeriodo] = useState<'hoje' | '7dias' | '30dias' | 'mes'>('7dias');

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-completo", periodo],
    queryFn: () => api.getDashboardCompleto(periodo),
    refetchInterval: 30000,
  });

  const { data: conversations, isLoading: convsLoading } = useQuery({
    queryKey: ["supabase-dashboard-conversas"],
    queryFn: () => api.getConversas(),
    refetchInterval: 15000,
  });

  const { data: activities, isLoading: activitiesLoading } = useQuery({
    queryKey: ["supabase-dashboard-activity"],
    queryFn: () => api.getRecentActivity(),
    refetchInterval: 15000,
  });

  const m = data?.metricas;
  const periodoLabels: Record<string, string> = {
    hoje: "Hoje",
    "7dias": "7 dias",
    "30dias": "30 dias",
    mes: "Este mês",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold" data-testid="text-dashboard-title">Dashboard</h1>
          <p className="text-sm text-muted-foreground" data-testid="text-dashboard-subtitle">Visão geral do atendimento</p>
        </div>
        <div className="flex items-center gap-1.5">
          {(Object.keys(periodoLabels) as Array<keyof typeof periodoLabels>).map((key) => (
            <Button
              key={key}
              variant={periodo === key ? "default" : "outline"}
              size="sm"
              onClick={() => setPeriodo(key as any)}
              data-testid={`button-period-${key}`}
            >
              {periodoLabels[key]}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
        <MetricCard title="Conversas" value={m?.totalConversas ?? 0} subtitle="no período" icon={MessageCircle} iconColor="bg-primary/10 text-primary" isLoading={isLoading} />
        <MetricCard title="Ativas" value={m?.conversasAtivas ?? 0} subtitle="em andamento" icon={Clock} iconColor="bg-chart-4/10 text-chart-4" isLoading={isLoading} />
        <MetricCard title="Fechadas" value={m?.conversasFechadas ?? 0} subtitle="finalizadas" icon={CheckCircle} iconColor="bg-chart-2/10 text-chart-2" isLoading={isLoading} />
        <MetricCard title="Conversão" value={`${m?.taxaConversao ?? 0}%`} subtitle="taxa" icon={Target} iconColor="bg-chart-3/10 text-chart-3" isLoading={isLoading} />
        <MetricCard title="Tempo Médio" value={m?.tempoMedioResposta ? `${m.tempoMedioResposta}min` : "--"} subtitle="atendimento" icon={Timer} iconColor="bg-chart-5/10 text-chart-5" isLoading={isLoading} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard title="Msgs IA" value={m?.totalMensagensIA ?? 0} subtitle="enviadas" icon={Bot} iconColor="bg-purple-500/10 text-purple-500" isLoading={isLoading} />
        <MetricCard title="Online" value={m?.atendenteOnline ?? 0} subtitle="atendentes" icon={Users} iconColor="bg-emerald-500/10 text-emerald-500" isLoading={isLoading} />
        <MetricCard title="Clientes" value={m?.totalClientes ?? 0} subtitle="cadastrados" icon={UserPlus} iconColor="bg-blue-500/10 text-blue-500" isLoading={isLoading} />
        <MetricCard title="Novos" value={m?.novosClientes ?? 0} subtitle="no período" icon={Zap} iconColor="bg-amber-500/10 text-amber-500" isLoading={isLoading} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card data-testid="card-chart-timeline">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-semibold">Conversas ao Longo do Tempo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {isLoading ? (
                <Skeleton className="w-full h-full rounded-md" />
              ) : data?.timelineData && data.timelineData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.timelineData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="data" tick={axisTickStyle} axisLine={{ stroke: "hsl(var(--border))" }} tickLine={false} />
                    <YAxis tick={axisTickStyle} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend />
                    <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={2} dot={{ r: 2 }} name="Total" />
                    <Line type="monotone" dataKey="fechadas" stroke="#10b981" strokeWidth={2} dot={{ r: 2 }} name="Fechadas" />
                    <Line type="monotone" dataKey="ativas" stroke="#f59e0b" strokeWidth={2} dot={{ r: 2 }} name="Ativas" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-sm text-muted-foreground">Sem dados no período</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-chart-attendant-performance">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-semibold">Performance por Atendente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {isLoading ? (
                <Skeleton className="w-full h-full rounded-md" />
              ) : data?.atendenteStats && data.atendenteStats.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.atendenteStats.map(a => ({ name: a.nome.split(' ')[0], fechadas: a.conversasFechadas, ativas: a.conversasAtivas, tempoMedio: a.tempoMedio }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={axisTickStyle} axisLine={{ stroke: "hsl(var(--border))" }} tickLine={false} />
                    <YAxis tick={axisTickStyle} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend />
                    <Bar dataKey="fechadas" fill="#10b981" radius={[4, 4, 0, 0]} name="Fechadas" />
                    <Bar dataKey="ativas" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Ativas" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-sm text-muted-foreground">Sem dados de atendentes</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card data-testid="card-chart-funil">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Funil de Vendas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56 flex items-center justify-center">
              {isLoading ? (
                <Skeleton className="w-40 h-40 rounded-full" />
              ) : data?.funilData && data.funilData.some(d => d.value > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={data.funilData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                      {data.funilData.map((entry, index) => (
                        <Cell key={index} fill={entry.color || CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-sm text-muted-foreground">Sem dados de funil</div>
              )}
            </div>
            {data?.funilData && data.funilData.some(d => d.value > 0) && (
              <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
                {data.funilData.filter(d => d.value > 0).map((item) => (
                  <div key={item.name} className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-xs text-muted-foreground">{item.name} ({item.value})</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-chart-produtos">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Interesse por Produto</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56 flex items-center justify-center">
              {isLoading ? (
                <Skeleton className="w-40 h-40 rounded-full" />
              ) : data?.produtoData && data.produtoData.some(d => d.value > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={data.produtoData} cx="50%" cy="50%" outerRadius={80} paddingAngle={2} dataKey="value">
                      {data.produtoData.map((entry, index) => (
                        <Cell key={index} fill={entry.color || CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-sm text-muted-foreground">Sem dados de produtos</div>
              )}
            </div>
            {data?.produtoData && data.produtoData.some(d => d.value > 0) && (
              <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
                {data.produtoData.filter(d => d.value > 0).map((item, i) => (
                  <div key={item.name} className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color || CHART_COLORS[i % CHART_COLORS.length] }} />
                    <span className="text-xs text-muted-foreground">{item.name} ({item.value})</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-chart-hourly">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Mensagens por Hora</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              {isLoading ? (
                <Skeleton className="w-full h-full rounded-md" />
              ) : data?.hourlyData && data.hourlyData.some(d => d.mensagens > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.hourlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="hora" tick={axisTickStyle} axisLine={{ stroke: "hsl(var(--border))" }} tickLine={false} interval={2} />
                    <YAxis tick={axisTickStyle} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Area type="monotone" dataKey="mensagens" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.15} strokeWidth={2} name="Mensagens" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-sm text-muted-foreground">Sem dados horários</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-table-attendants">
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
          <CardTitle className="text-sm font-semibold">Desempenho dos Atendentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full rounded-md" />
                ))}
              </div>
            ) : data?.atendenteStats && data.atendenteStats.length > 0 ? (
              <table className="w-full text-sm" data-testid="table-attendant-performance">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Atendente</th>
                    <th className="text-right py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Conversas</th>
                    <th className="text-right py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Fechadas</th>
                    <th className="text-right py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Ativas</th>
                    <th className="text-right py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Resolução</th>
                    <th className="text-right py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Tempo Médio</th>
                    <th className="text-center py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.atendenteStats.map((att, i) => {
                    const statusVariant: Record<string, "default" | "secondary" | "outline"> = { online: "default", offline: "secondary", ausente: "outline" };
                    const statusLabel: Record<string, string> = { online: "Online", offline: "Offline", ausente: "Ausente" };
                    return (
                      <tr key={att.id} className="border-b last:border-0" data-testid={`row-attendant-${i}`}>
                        <td className="py-2.5 px-3 font-medium">{att.nome}</td>
                        <td className="py-2.5 px-3 text-right text-muted-foreground">{att.totalConversas}</td>
                        <td className="py-2.5 px-3 text-right text-muted-foreground">{att.conversasFechadas}</td>
                        <td className="py-2.5 px-3 text-right text-muted-foreground">{att.conversasAtivas}</td>
                        <td className="py-2.5 px-3 text-right text-muted-foreground">{att.taxaResolucao}%</td>
                        <td className="py-2.5 px-3 text-right text-muted-foreground">{att.tempoMedio}min</td>
                        <td className="py-2.5 px-3 text-center">
                          <Badge variant={statusVariant[att.status] ?? "secondary"} className="text-xs" data-testid={`badge-att-status-${i}`}>
                            {statusLabel[att.status] ?? att.status}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="flex items-center justify-center h-20 text-sm text-muted-foreground">Sem dados de atendentes</div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2" data-testid="card-recent-conversations">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-semibold">Conversas Recentes</CardTitle>
            <Button variant="ghost" size="sm" asChild data-testid="button-view-all-conversations">
              <a href="/conversas">
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
                    <th className="text-left py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {convsLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="py-2.5 px-3"><Skeleton className="h-4 w-24" /></td>
                        <td className="py-2.5 px-3"><Skeleton className="h-4 w-20" /></td>
                        <td className="py-2.5 px-3"><Skeleton className="h-4 w-16" /></td>
                        <td className="py-2.5 px-3"><Skeleton className="h-5 w-16 rounded-full" /></td>
                      </tr>
                    ))
                  ) : conversations && conversations.length > 0 ? (
                    conversations.slice(0, 6).map((conv: Conversa) => {
                      const st = statusMap[conv.status] || statusMap.nova;
                      return (
                        <tr key={conv.id} className="border-b last:border-0" data-testid={`row-conversation-${conv.id}`}>
                          <td className="py-2.5 px-3 font-medium">{conv.clientes?.nome || "Desconhecido"}</td>
                          <td className="py-2.5 px-3 text-muted-foreground">{conv.atendentes?.nome || "--"}</td>
                          <td className="py-2.5 px-3 text-muted-foreground">{formatRelativeTime(conv.iniciada_em)}</td>
                          <td className="py-2.5 px-3">
                            <Badge variant={st.variant} className="text-xs">{st.label}</Badge>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={4} className="text-center py-8 text-muted-foreground text-sm">Nenhuma conversa encontrada</td>
                    </tr>
                  )}
                </tbody>
              </table>
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
                    <Skeleton className="w-7 h-7 rounded-md flex-shrink-0" />
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
                      <div className="flex items-center justify-center w-7 h-7 rounded-md bg-muted flex-shrink-0">
                        <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs leading-relaxed">{activity.description}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{formatRelativeTime(activity.timestamp)}</p>
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
    </div>
  );
}
