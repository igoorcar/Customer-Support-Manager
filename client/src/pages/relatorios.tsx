import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { useState, useMemo } from "react";
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
  CheckCircle,
  Timer,
  Target,
  Download,
  Filter,
  ChevronDown,
  FileText,
  Bot,
} from "lucide-react";
import type { Product } from "@shared/schema";
import type { ClienteSupabase } from "@/lib/supabase";
import { api } from "@/services/api";
import { useEtiquetas } from "@/components/etiquetas-manager";

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5, 280 65% 60%))",
  "#ec4899",
  "#14b8a6",
  "#f97316",
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
        <CardContent className="p-4">
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-7 w-16" />
        </CardContent>
      </Card>
    );
  }
  return (
    <Card data-testid={testId}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`flex items-center justify-center w-9 h-9 rounded-md ${iconColor}`}>
            <Icon className="w-4 h-4" />
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

function exportToCSV(data: any[], filename: string) {
  if (!data || data.length === 0) return;
  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(','),
    ...data.map(row =>
      headers.map(h => {
        const val = row[h];
        const str = val === null || val === undefined ? '' : String(val);
        return str.includes(',') || str.includes('"') || str.includes('\n')
          ? `"${str.replace(/"/g, '""')}"`
          : str;
      }).join(',')
    ),
  ];
  const blob = new Blob(['\ufeff' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function TabVisaoGeral() {
  const [periodo, setPeriodo] = useState<'hoje' | '7dias' | '30dias' | 'mes'>('30dias');

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-completo-reports", periodo],
    queryFn: () => api.getDashboardCompleto(periodo),
  });

  const m = data?.metricas;

  return (
    <div className="space-y-6" data-testid="tab-visao-geral-content">
      <div className="flex items-center gap-1.5 flex-wrap">
        {([['hoje', 'Hoje'], ['7dias', '7 dias'], ['30dias', '30 dias'], ['mes', 'Este mês']] as const).map(([key, label]) => (
          <Button key={key} variant={periodo === key ? "default" : "outline"} size="sm" onClick={() => setPeriodo(key)} data-testid={`button-report-period-${key}`}>
            {label}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
        <KpiCard title="Conversas" value={m?.totalConversas ?? 0} icon={MessageCircle} iconColor="bg-primary/10 text-primary" isLoading={isLoading} testId="metric-total-conversas" />
        <KpiCard title="Clientes" value={m?.totalClientes ?? 0} icon={Users} iconColor="bg-chart-2/10 text-chart-2" isLoading={isLoading} testId="metric-total-clientes" />
        <KpiCard title="Tempo Médio" value={`${m?.tempoMedioResposta ?? 0}min`} icon={Timer} iconColor="bg-chart-4/10 text-chart-4" isLoading={isLoading} testId="metric-tempo-medio" />
        <KpiCard title="Conversão" value={`${m?.taxaConversao ?? 0}%`} icon={Target} iconColor="bg-chart-3/10 text-chart-3" isLoading={isLoading} testId="metric-taxa-resolucao" />
        <KpiCard title="Msgs IA" value={m?.totalMensagensIA ?? 0} icon={Bot} iconColor="bg-purple-500/10 text-purple-500" isLoading={isLoading} testId="metric-msgs-ia" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card data-testid="card-chart-timeline-report">
          <CardHeader className="pb-2">
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
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-sm text-muted-foreground">Sem dados no período</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-chart-funil-report">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Distribuição do Funil</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center">
              {isLoading ? (
                <Skeleton className="w-40 h-40 rounded-full" />
              ) : data?.funilData && data.funilData.some(d => d.value > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={data.funilData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
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
      </div>

      <Card data-testid="card-chart-hourly-report">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Mensagens por Hora do Dia</CardTitle>
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
  );
}

function TabConversas() {
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);
  const [atendenteFilter, setAtendenteFilter] = useState('todas');
  const [statusFilter, setStatusFilter] = useState('todas');
  const [etiquetaFilter, setEtiquetaFilter] = useState('todas');

  const etiquetas = useEtiquetas();

  const { data: atendentes } = useQuery({
    queryKey: ["supabase-atendentes-list"],
    queryFn: () => api.getAtendentes(),
  });

  const { data: relatorio, isLoading } = useQuery({
    queryKey: ["relatorio-conversas", dateFrom, dateTo, atendenteFilter, statusFilter, etiquetaFilter],
    queryFn: () => api.getRelatorioConversas({
      dataInicio: `${dateFrom}T00:00:00.000Z`,
      dataFim: `${dateTo}T23:59:59.999Z`,
      atendenteId: atendenteFilter !== 'todas' ? atendenteFilter : undefined,
      status: statusFilter !== 'todas' ? statusFilter : undefined,
      etiquetaId: etiquetaFilter !== 'todas' ? etiquetaFilter : undefined,
    }),
  });

  return (
    <div className="space-y-4" data-testid="tab-conversas-report">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-end gap-3 flex-wrap">
            <div className="space-y-1">
              <Label className="text-xs">De</Label>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-36" data-testid="input-date-from" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Até</Label>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-36" data-testid="input-date-to" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Atendente</Label>
              <Select value={atendenteFilter} onValueChange={setAtendenteFilter}>
                <SelectTrigger className="w-36" data-testid="select-atendente-filter"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  {(atendentes || []).map((at: any) => (
                    <SelectItem key={at.id} value={at.id}>{at.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36" data-testid="select-status-filter"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  <SelectItem value="nova">Nova</SelectItem>
                  <SelectItem value="em_atendimento">Em Atendimento</SelectItem>
                  <SelectItem value="pausada">Pausada</SelectItem>
                  <SelectItem value="finalizada">Finalizada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Etiqueta</Label>
              <Select value={etiquetaFilter} onValueChange={setEtiquetaFilter}>
                <SelectTrigger className="w-40" data-testid="select-etiqueta-filter"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  {etiquetas.map(et => (
                    <SelectItem key={et.id} value={et.id}>{et.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => relatorio && exportToCSV(relatorio, 'relatorio_conversas')}
              disabled={!relatorio || relatorio.length === 0}
              data-testid="button-export-csv-conversas"
            >
              <Download className="w-3.5 h-3.5 mr-1" />
              CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-md" />)}
              </div>
            ) : relatorio && relatorio.length > 0 ? (
              <table className="w-full text-sm" data-testid="table-report-conversas">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Cliente</th>
                    <th className="text-left py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">WhatsApp</th>
                    <th className="text-left py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Atendente</th>
                    <th className="text-left py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</th>
                    <th className="text-left py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Início</th>
                    <th className="text-right py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Duração</th>
                    <th className="text-right py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Msgs</th>
                  </tr>
                </thead>
                <tbody>
                  {relatorio.map((r, i) => (
                    <tr key={r.id} className="border-b last:border-0" data-testid={`row-report-${i}`}>
                      <td className="py-2.5 px-3 font-medium">{r.cliente}</td>
                      <td className="py-2.5 px-3 text-muted-foreground text-xs">{r.clienteWhatsapp}</td>
                      <td className="py-2.5 px-3 text-muted-foreground">{r.atendente}</td>
                      <td className="py-2.5 px-3">
                        <Badge variant="secondary" className="text-xs">{statusLabels[r.status] || r.status}</Badge>
                      </td>
                      <td className="py-2.5 px-3 text-muted-foreground text-xs">{new Date(r.iniciadaEm).toLocaleDateString('pt-BR')}</td>
                      <td className="py-2.5 px-3 text-right text-muted-foreground">{r.tempoTotal || '--'}</td>
                      <td className="py-2.5 px-3 text-right text-muted-foreground">{r.totalMensagens}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">Nenhuma conversa encontrada no período</div>
            )}
          </div>
          {relatorio && (
            <div className="px-4 py-2 border-t text-xs text-muted-foreground">
              {relatorio.length} conversa{relatorio.length !== 1 ? 's' : ''} encontrada{relatorio.length !== 1 ? 's' : ''}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function TabAtendentes() {
  const [periodo, setPeriodo] = useState<'hoje' | '7dias' | '30dias' | 'mes'>('30dias');

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-completo-att", periodo],
    queryFn: () => api.getDashboardCompleto(periodo),
  });

  const attStats = data?.atendenteStats || [];

  return (
    <div className="space-y-4" data-testid="tab-atendentes-content">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          {([['hoje', 'Hoje'], ['7dias', '7 dias'], ['30dias', '30 dias'], ['mes', 'Este mês']] as const).map(([key, label]) => (
            <Button key={key} variant={periodo === key ? "default" : "outline"} size="sm" onClick={() => setPeriodo(key)}>
              {label}
            </Button>
          ))}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => exportToCSV(attStats.map(a => ({
            Atendente: a.nome,
            Conversas: a.totalConversas,
            Fechadas: a.conversasFechadas,
            Ativas: a.conversasAtivas,
            'Taxa Resolução': `${a.taxaResolucao}%`,
            'Tempo Médio (min)': a.tempoMedio,
            Mensagens: a.mensagensEnviadas,
            Status: a.status,
          })), 'relatorio_atendentes')}
          disabled={attStats.length === 0}
          data-testid="button-export-csv-atendentes"
        >
          <Download className="w-3.5 h-3.5 mr-1" />
          CSV
        </Button>
      </div>

      <Card data-testid="card-table-attendants">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-md" />)}
              </div>
            ) : attStats.length > 0 ? (
              <table className="w-full text-sm" data-testid="table-attendants">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Atendente</th>
                    <th className="text-right py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Conversas</th>
                    <th className="text-right py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Fechadas</th>
                    <th className="text-right py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Ativas</th>
                    <th className="text-right py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Resolução</th>
                    <th className="text-right py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Tempo Médio</th>
                    <th className="text-right py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Msgs</th>
                    <th className="text-center py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {attStats.map((att, i) => {
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
                        <td className="py-2.5 px-3 text-right text-muted-foreground">{att.mensagensEnviadas}</td>
                        <td className="py-2.5 px-3 text-center">
                          <Badge variant={statusVariant[att.status] ?? "secondary"} className="text-xs">
                            {statusLabel[att.status] ?? att.status}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">Sem dados de atendentes</div>
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
            ) : attStats.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={attStats.map(a => ({ name: a.nome.split(' ')[0], conversas: a.totalConversas, fechadas: a.conversasFechadas, tempoMedio: a.tempoMedio }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={axisTickStyle} axisLine={{ stroke: "hsl(var(--border))" }} tickLine={false} />
                  <YAxis tick={axisTickStyle} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend />
                  <Bar dataKey="conversas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Conversas" />
                  <Bar dataKey="fechadas" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} name="Fechadas" />
                  <Bar dataKey="tempoMedio" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} name="Tempo Médio (min)" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground">Sem dados de atendentes</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TabVendas() {
  const { data: products, isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const topProducts = products
    ? [...products].sort((a, b) => (b.soldCount ?? 0) - (a.soldCount ?? 0)).slice(0, 8)
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
    <div className="space-y-4" data-testid="tab-vendas-content">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="grid grid-cols-3 gap-3 flex-1">
          <KpiCard title="Faturamento" value={formatCurrency(totalRevenue)} icon={DollarSign} iconColor="bg-chart-2/10 text-chart-2" testId="metric-faturamento" />
          <KpiCard title="Ticket Médio" value={formatCurrency(ticketMedio)} icon={TrendingUp} iconColor="bg-chart-4/10 text-chart-4" testId="metric-ticket-medio-vendas" />
          <KpiCard title="Vendidos" value={totalSold} icon={ShoppingBag} iconColor="bg-primary/10 text-primary" testId="metric-produtos-vendidos" />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => exportToCSV(
            (products || []).map(p => ({
              Produto: p.name,
              Categoria: p.category || '',
              Preço: (p.price || 0) / 100,
              Vendidos: p.soldCount || 0,
              Estoque: p.stock || 0,
            })),
            'relatorio_produtos'
          )}
          disabled={!products || products.length === 0}
          data-testid="button-export-csv-vendas"
        >
          <Download className="w-3.5 h-3.5 mr-1" />
          CSV
        </Button>
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
                  <BarChart data={topProducts.map(p => ({ name: p.name.length > 18 ? p.name.slice(0, 18) + "..." : p.name, vendidos: p.soldCount ?? 0 }))} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={axisTickStyle} axisLine={false} tickLine={false} />
                    <YAxis dataKey="name" type="category" tick={axisTickStyle} axisLine={false} tickLine={false} width={130} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="vendidos" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Vendidos" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-sm text-muted-foreground">Sem dados de produtos</div>
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
                <div className="text-sm text-muted-foreground">Sem dados de categorias</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function TabClientes() {
  const { data: clientsData, isLoading } = useQuery({
    queryKey: ["supabase-clientes-reports"],
    queryFn: () => api.getClientesSupabase({ limit: 200 }),
  });

  const etiquetas = useEtiquetas();
  const clients = clientsData?.data ?? [];
  const totalClients = clientsData?.total ?? 0;

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
  const newClientsMonth = clients.filter(c => new Date(c.criado_em) >= thirtyDaysAgo).length;

  const etiquetaCounts: Record<string, { nome: string; cor: string; count: number }> = {};
  etiquetas.forEach(et => { etiquetaCounts[et.id] = { nome: et.nome, cor: et.cor, count: 0 }; });
  clients.forEach(c => {
    (c.tags ?? []).forEach(tag => {
      if (etiquetaCounts[tag]) etiquetaCounts[tag].count++;
    });
  });
  const tagData = Object.values(etiquetaCounts).filter(t => t.count > 0).sort((a, b) => b.count - a.count);

  return (
    <div className="space-y-4" data-testid="tab-clientes-content">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 flex-1">
          <KpiCard title="Novos (mês)" value={newClientsMonth} icon={UserPlus} iconColor="bg-primary/10 text-primary" isLoading={isLoading} testId="metric-novos-clientes" />
          <KpiCard title="Total Clientes" value={totalClients} icon={Users} iconColor="bg-chart-4/10 text-chart-4" isLoading={isLoading} testId="metric-clientes-total" />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => exportToCSV(
            clients.map(c => ({
              Nome: c.nome || '',
              WhatsApp: c.whatsapp || '',
              Email: c.email || '',
              Compras: c.total_compras || 0,
              'Criado em': new Date(c.criado_em).toLocaleDateString('pt-BR'),
            })),
            'relatorio_clientes'
          )}
          disabled={clients.length === 0}
          data-testid="button-export-csv-clientes"
        >
          <Download className="w-3.5 h-3.5 mr-1" />
          CSV
        </Button>
      </div>

      <Card data-testid="card-chart-tags-distribution">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Distribuição de Etiquetas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            {isLoading ? (
              <Skeleton className="w-full h-full rounded-md" />
            ) : tagData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={tagData.map(t => ({ name: t.nome, clientes: t.count }))} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={axisTickStyle} axisLine={false} tickLine={false} />
                  <YAxis dataKey="name" type="category" tick={axisTickStyle} axisLine={false} tickLine={false} width={130} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="clientes" radius={[0, 4, 4, 0]} name="Clientes">
                    {tagData.map((entry, index) => (
                      <Cell key={index} fill={entry.cor || CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground">Sem dados de etiquetas</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Relatorios() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold" data-testid="text-reports-title">Relatórios</h1>
        <p className="text-sm text-muted-foreground">Análise detalhada de dados e performance</p>
      </div>

      <Tabs defaultValue="visao-geral" data-testid="tabs-reports">
        <TabsList className="flex flex-wrap gap-1" data-testid="tabs-list-reports">
          <TabsTrigger value="visao-geral" data-testid="tab-trigger-visao-geral">Visão Geral</TabsTrigger>
          <TabsTrigger value="conversas" data-testid="tab-trigger-conversas">Conversas</TabsTrigger>
          <TabsTrigger value="atendentes" data-testid="tab-trigger-atendentes">Atendentes</TabsTrigger>
          <TabsTrigger value="vendas" data-testid="tab-trigger-vendas">Vendas</TabsTrigger>
          <TabsTrigger value="clientes" data-testid="tab-trigger-clientes">Clientes</TabsTrigger>
        </TabsList>

        <TabsContent value="visao-geral">
          <TabVisaoGeral />
        </TabsContent>
        <TabsContent value="conversas">
          <TabConversas />
        </TabsContent>
        <TabsContent value="atendentes">
          <TabAtendentes />
        </TabsContent>
        <TabsContent value="vendas">
          <TabVendas />
        </TabsContent>
        <TabsContent value="clientes">
          <TabClientes />
        </TabsContent>
      </Tabs>
    </div>
  );
}
