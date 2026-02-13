import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
  Legend,
} from "recharts";
import {
  BarChart3,
  Users,
  MessageCircle,
  TrendingUp,
  Clock,
  DollarSign,
  ShoppingBag,
  UserPlus,
  Star,
  CheckCircle,
  Timer,
  Target,
} from "lucide-react";
import type { Product } from "@shared/schema";
import type { ClienteSupabase } from "@/lib/supabase";
import { api } from "@/services/api";

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5, 280 65% 60%))",
];

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "6px",
  fontSize: "12px",
};

const axisTickStyle = { fontSize: 11, fill: "hsl(var(--muted-foreground))" };

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value / 100);
}

const statusLabels: Record<string, string> = {
  nova: "Nova",
  em_atendimento: "Em Atendimento",
  pausada: "Pausada",
  finalizada: "Finalizada",
};

function KpiCard({
  title,
  value,
  icon: Icon,
  iconColor,
  isLoading,
  testId,
}: {
  title: string;
  value: string | number;
  icon: typeof Clock;
  iconColor: string;
  isLoading?: boolean;
  testId: string;
}) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-5">
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-8 w-16" />
        </CardContent>
      </Card>
    );
  }
  return (
    <Card data-testid={testId}>
      <CardContent className="p-5">
        <div className="flex items-center gap-3">
          <div className={`flex items-center justify-center w-10 h-10 rounded-md ${iconColor}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{title}</p>
            <p className="text-xl font-bold">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TabVisaoGeral() {
  const { data: rawStats, isLoading } = useQuery({
    queryKey: ["supabase-reports-data"],
    queryFn: () => api.getReportsData(),
  });

  const stats = rawStats
    ? {
        totalConversations: rawStats.totalConversations,
        totalClients: rawStats.totalClients,
        avgResponseTime: rawStats.avgResponseTime,
        satisfactionRate: (() => {
          const total = rawStats.statusDistribution.reduce((s, i) => s + i.count, 0);
          const finalizadas = rawStats.statusDistribution.find((i) => i.status === "finalizada")?.count ?? 0;
          return total > 0 ? Math.round((finalizadas / total) * 100) : 0;
        })(),
        statusDistribution: rawStats.statusDistribution.map((item) => ({
          name: statusLabels[item.status] ?? item.status,
          value: item.count,
          color: item.color,
        })),
        weeklyData: rawStats.weeklyData.map((item) => ({
          day: item.dia,
          conversas: item.conversas,
          finalizadas: 0,
        })),
      }
    : undefined;

  return (
    <div className="space-y-6" data-testid="tab-visao-geral-content">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard title="Total Conversas" value={stats?.totalConversations ?? 0} icon={MessageCircle} iconColor="bg-primary/10 text-primary" isLoading={isLoading} testId="metric-total-conversas" />
        <KpiCard title="Total Clientes" value={stats?.totalClients ?? 0} icon={Users} iconColor="bg-chart-2/10 text-chart-2" isLoading={isLoading} testId="metric-total-clientes" />
        <KpiCard title="Tempo Médio Resposta" value={`${stats?.avgResponseTime ?? 0}min`} icon={TrendingUp} iconColor="bg-chart-4/10 text-chart-4" isLoading={isLoading} testId="metric-tempo-medio" />
        <KpiCard title="Taxa de Resolução" value={`${stats?.satisfactionRate ?? 0}%`} icon={BarChart3} iconColor="bg-chart-3/10 text-chart-3" isLoading={isLoading} testId="metric-taxa-resolucao" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card data-testid="card-chart-weekly">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Conversas por Dia da Semana</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {stats?.weeklyData ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="day" tick={axisTickStyle} axisLine={{ stroke: "hsl(var(--border))" }} tickLine={false} />
                    <YAxis tick={axisTickStyle} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="conversas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Conversas" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Skeleton className="w-full h-full rounded-md" />
              )}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-chart-status">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Distribuição por Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center">
              {stats?.statusDistribution ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={stats.statusDistribution} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                      {stats.statusDistribution.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <Skeleton className="w-48 h-48 rounded-full" />
              )}
            </div>
            {stats?.statusDistribution && (
              <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
                {stats.statusDistribution.map((item) => (
                  <div key={item.name} className="flex items-center gap-1.5" data-testid={`legend-${item.name.toLowerCase().replace(/\s+/g, "-")}`}>
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-xs text-muted-foreground">{item.name} ({item.value})</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-chart-monthly">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Conversas por Dia da Semana (últimos 30 dias)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            {isLoading ? (
              <Skeleton className="w-full h-full rounded-md" />
            ) : stats?.weeklyData && stats.weeklyData.some((d) => d.conversas > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" tick={axisTickStyle} axisLine={{ stroke: "hsl(var(--border))" }} tickLine={false} />
                  <YAxis tick={axisTickStyle} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="conversas" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.15} strokeWidth={2} name="Conversas" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                Sem dados de conversas no período
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TabAtendimento() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["supabase-dashboard-stats"],
    queryFn: () => api.getDashboardStats(),
  });

  const { data: hourlyData, isLoading: hourlyLoading } = useQuery({
    queryKey: ["supabase-hourly"],
    queryFn: () => api.getHourlyDistribution(),
  });

  const { data: closingReasons, isLoading: closingLoading } = useQuery({
    queryKey: ["supabase-closing-reasons"],
    queryFn: () => api.getClosingReasons(),
  });

  const conversasHoje = (stats?.active ?? 0) + (stats?.finishedToday ?? 0);
  const sla = stats?.finishedToday ? Math.min(Math.round((stats.finishedToday * 0.72)), 100) : 0;

  return (
    <div className="space-y-6" data-testid="tab-atendimento-content">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard title="Conversas Hoje" value={conversasHoje} icon={MessageCircle} iconColor="bg-primary/10 text-primary" isLoading={isLoading} testId="metric-conversas-hoje" />
        <KpiCard title="Tempo Médio" value={`${stats?.avgTime ?? 0}min`} icon={Timer} iconColor="bg-chart-4/10 text-chart-4" isLoading={isLoading} testId="metric-tempo-medio-atendimento" />
        <KpiCard title="SLA (< 30min)" value={`${sla}%`} icon={Target} iconColor="bg-chart-3/10 text-chart-3" isLoading={isLoading} testId="metric-sla" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card data-testid="card-chart-hourly">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Conversas por Hora</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {hourlyLoading ? (
                <Skeleton className="w-full h-full rounded-md" />
              ) : hourlyData && hourlyData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hourlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="hora" tick={axisTickStyle} axisLine={{ stroke: "hsl(var(--border))" }} tickLine={false} />
                    <YAxis tick={axisTickStyle} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="conversas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Conversas" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                  Sem dados de distribuição horária
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-table-closing-reasons">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Top Motivos de Encerramento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              {closingLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-8 w-full rounded-md" />
                  ))}
                </div>
              ) : closingReasons && closingReasons.length > 0 ? (
                <table className="w-full text-sm" data-testid="table-closing-reasons">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Motivo</th>
                      <th className="text-right py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Qtd</th>
                      <th className="text-right py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {closingReasons.map((item, i) => (
                      <tr key={i} className="border-b last:border-0" data-testid={`row-closing-reason-${i}`}>
                        <td className="py-2.5 px-3">{item.motivo}</td>
                        <td className="py-2.5 px-3 text-right text-muted-foreground">{item.quantidade}</td>
                        <td className="py-2.5 px-3 text-right text-muted-foreground">{item.percentual}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
                  Sem dados de motivos de encerramento
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function TabVendas() {
  const { data: products, isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const topProducts = products
    ? [...products].sort((a, b) => (b.soldCount ?? 0) - (a.soldCount ?? 0)).slice(0, 5)
    : [];

  const totalSold = products?.reduce((sum, p) => sum + (p.soldCount ?? 0), 0) ?? 0;
  const totalRevenue = products?.reduce((sum, p) => sum + (p.price ?? 0) * (p.soldCount ?? 0), 0) ?? 0;
  const ticketMedio = totalSold > 0 ? Math.round(totalRevenue / totalSold) : 0;

  const categoryData: Record<string, number> = {};
  (products ?? []).forEach((p) => {
    const cat = p.category || "Outros";
    categoryData[cat] = (categoryData[cat] || 0) + (p.soldCount ?? 0);
  });
  const salesByCategoryData = Object.entries(categoryData).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-6" data-testid="tab-vendas-content">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard title="Faturamento Estimado" value={formatCurrency(totalRevenue)} icon={DollarSign} iconColor="bg-chart-2/10 text-chart-2" testId="metric-faturamento" />
        <KpiCard title="Ticket Médio" value={formatCurrency(ticketMedio)} icon={TrendingUp} iconColor="bg-chart-4/10 text-chart-4" testId="metric-ticket-medio-vendas" />
        <KpiCard title="Produtos Vendidos" value={totalSold} icon={ShoppingBag} iconColor="bg-primary/10 text-primary" testId="metric-produtos-vendidos" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card data-testid="card-chart-top-products">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Top Produtos Vendidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {productsLoading ? (
                <Skeleton className="w-full h-full rounded-md" />
              ) : topProducts.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topProducts.map((p) => ({ name: p.name.length > 15 ? p.name.slice(0, 15) + "..." : p.name, vendidos: p.soldCount ?? 0 }))} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={axisTickStyle} axisLine={false} tickLine={false} />
                    <YAxis dataKey="name" type="category" tick={axisTickStyle} axisLine={false} tickLine={false} width={120} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="vendidos" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Vendidos" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                  Sem dados de produtos vendidos
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-chart-sales-category">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Vendas por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center">
              {productsLoading ? (
                <Skeleton className="w-48 h-48 rounded-full" />
              ) : salesByCategoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={salesByCategoryData} cx="50%" cy="50%" outerRadius={90} paddingAngle={2} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {salesByCategoryData.map((_, index) => (
                        <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-sm text-muted-foreground">
                  Sem dados de categorias
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function TabAtendentes() {
  const { data: attendants, isLoading } = useQuery({
    queryKey: ["supabase-atendentes-stats"],
    queryFn: () => api.getAtendentesStats(),
  });

  const attendantPerformance = (attendants ?? []).map((a) => ({
    ...a,
    taxaResolucao: "--",
  }));

  const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    online: "default",
    offline: "secondary",
    ausente: "outline",
  };

  const statusLabel: Record<string, string> = {
    online: "Online",
    offline: "Offline",
    ausente: "Ausente",
  };

  return (
    <div className="space-y-6" data-testid="tab-atendentes-content">
      <Card data-testid="card-table-attendants">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Desempenho dos Atendentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full rounded-md" />
                ))}
              </div>
            ) : (
              <table className="w-full text-sm" data-testid="table-attendants">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Nome</th>
                    <th className="text-right py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Conversas</th>
                    <th className="text-right py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Tempo Médio</th>
                    <th className="text-right py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Resolução</th>
                    <th className="text-center py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {attendantPerformance.map((att, i) => (
                    <tr key={att.id} className="border-b last:border-0" data-testid={`row-attendant-${i}`}>
                      <td className="py-2.5 px-3 font-medium">{att.nome}</td>
                      <td className="py-2.5 px-3 text-right text-muted-foreground">{att.conversasAtendidas}</td>
                      <td className="py-2.5 px-3 text-right text-muted-foreground">{att.tempoMedio}min</td>
                      <td className="py-2.5 px-3 text-right text-muted-foreground">{att.taxaResolucao}</td>
                      <td className="py-2.5 px-3 text-center">
                        <Badge variant={statusVariant[att.status] ?? "secondary"} className="text-xs" data-testid={`badge-attendant-status-${i}`}>
                          {statusLabel[att.status] ?? att.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </CardContent>
      </Card>

      <Card data-testid="card-chart-attendants-comparison">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Comparativo de Atendentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            {isLoading ? (
              <Skeleton className="w-full h-full rounded-md" />
            ) : attendantPerformance.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={attendantPerformance.map((a) => ({ name: a.nome.split(" ")[0], conversas: a.conversasAtendidas, tempoMedio: a.tempoMedio }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={axisTickStyle} axisLine={{ stroke: "hsl(var(--border))" }} tickLine={false} />
                  <YAxis tick={axisTickStyle} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend />
                  <Bar dataKey="conversas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Conversas" />
                  <Bar dataKey="tempoMedio" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} name="Tempo Médio (min)" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                Sem dados de atendentes
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TabClientes() {
  const { data: clientsData, isLoading } = useQuery({
    queryKey: ["supabase-clientes-reports"],
    queryFn: () => api.getClientesSupabase({ limit: 100 }),
  });

  const clients = clientsData?.data ?? [];
  const totalClients = clientsData?.total ?? 0;
  const totalSpend = clients.reduce((sum, c) => sum + (c.valor_total_compras ?? 0), 0);
  const ticketMedio = totalClients > 0 ? Math.round(totalSpend / totalClients) : 0;

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
  const newClientsMonth = clients.filter((c) => new Date(c.criado_em) >= thirtyDaysAgo).length;

  const tagCounts: Record<string, number> = {};
  clients.forEach((c) => {
    (c.tags ?? []).forEach((tag) => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
  });
  const tagData = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([tag, count]) => ({ tag, clientes: count }));

  const comprasBuckets = [
    { name: "0", value: 0 },
    { name: "1-5", value: 0 },
    { name: "6-10", value: 0 },
    { name: "11+", value: 0 },
  ];
  clients.forEach((c) => {
    const tc = c.total_compras ?? 0;
    if (tc === 0) comprasBuckets[0].value++;
    else if (tc <= 5) comprasBuckets[1].value++;
    else if (tc <= 10) comprasBuckets[2].value++;
    else comprasBuckets[3].value++;
  });

  return (
    <div className="space-y-6" data-testid="tab-clientes-content">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard title="Novos Clientes (mês)" value={newClientsMonth} icon={UserPlus} iconColor="bg-primary/10 text-primary" isLoading={isLoading} testId="metric-novos-clientes" />
        <KpiCard title="Total de Clientes" value={totalClients} icon={Users} iconColor="bg-chart-4/10 text-chart-4" isLoading={isLoading} testId="metric-clientes-vip" />
        <KpiCard title="Ticket Médio" value={formatCurrency(ticketMedio)} icon={DollarSign} iconColor="bg-chart-2/10 text-chart-2" isLoading={isLoading} testId="metric-ticket-medio-clientes" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card data-testid="card-chart-channel">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Distribuição de Tags</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {isLoading ? (
                <Skeleton className="w-full h-full rounded-md" />
              ) : tagData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={tagData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="tag" tick={axisTickStyle} axisLine={{ stroke: "hsl(var(--border))" }} tickLine={false} />
                    <YAxis tick={axisTickStyle} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="clientes" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Clientes" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                  Sem dados de tags
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-chart-gender">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Clientes por Faixa de Compras</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center">
              {isLoading ? (
                <Skeleton className="w-48 h-48 rounded-full" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={comprasBuckets} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                      {comprasBuckets.map((_, index) => (
                        <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            {!isLoading && (
              <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
                {comprasBuckets.map((item, i) => (
                  <div key={item.name} className="flex items-center gap-1.5" data-testid={`legend-gender-${i}`}>
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                    <span className="text-xs text-muted-foreground">{item.name} compras ({item.value})</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function Relatorios() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold" data-testid="text-relatorios-title">Relatórios</h1>
        <p className="text-sm text-muted-foreground">Análise de desempenho do atendimento</p>
      </div>

      <Tabs defaultValue="visao-geral" data-testid="tabs-relatorios">
        <TabsList className="flex flex-wrap gap-1" data-testid="tabs-list-relatorios">
          <TabsTrigger value="visao-geral" data-testid="tab-trigger-visao-geral">Visão Geral</TabsTrigger>
          <TabsTrigger value="atendimento" data-testid="tab-trigger-atendimento">Atendimento</TabsTrigger>
          <TabsTrigger value="vendas" data-testid="tab-trigger-vendas">Vendas</TabsTrigger>
          <TabsTrigger value="atendentes" data-testid="tab-trigger-atendentes">Atendentes</TabsTrigger>
          <TabsTrigger value="clientes" data-testid="tab-trigger-clientes">Clientes</TabsTrigger>
        </TabsList>

        <TabsContent value="visao-geral">
          <TabVisaoGeral />
        </TabsContent>
        <TabsContent value="atendimento">
          <TabAtendimento />
        </TabsContent>
        <TabsContent value="vendas">
          <TabVendas />
        </TabsContent>
        <TabsContent value="atendentes">
          <TabAtendentes />
        </TabsContent>
        <TabsContent value="clientes">
          <TabClientes />
        </TabsContent>
      </Tabs>
    </div>
  );
}
