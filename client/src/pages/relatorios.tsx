import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "recharts";
import { BarChart3, Users, MessageCircle, TrendingUp } from "lucide-react";

export default function Relatorios() {
  const { data: stats, isLoading } = useQuery<{
    totalConversations: number;
    totalClients: number;
    avgResponseTime: number;
    satisfactionRate: number;
    weeklyData: { day: string; conversas: number; finalizadas: number }[];
    statusDistribution: { name: string; value: number; color: string }[];
  }>({
    queryKey: ["/api/reports"],
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold" data-testid="text-relatorios-title">Relatórios</h1>
        <p className="text-sm text-muted-foreground">Análise de desempenho do atendimento</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <Card data-testid="metric-total-conversas">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-md bg-primary/10">
                    <MessageCircle className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total de Conversas</p>
                    <p className="text-xl font-bold" data-testid="text-total-conversas">{stats?.totalConversations ?? 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card data-testid="metric-total-clientes">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-md bg-chart-2/10">
                    <Users className="w-5 h-5 text-chart-2" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total de Clientes</p>
                    <p className="text-xl font-bold" data-testid="text-total-clientes">{stats?.totalClients ?? 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card data-testid="metric-tempo-medio">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-md bg-chart-4/10">
                    <TrendingUp className="w-5 h-5 text-chart-4" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Tempo Médio</p>
                    <p className="text-xl font-bold" data-testid="text-tempo-medio">{stats?.avgResponseTime ?? 0}min</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card data-testid="metric-taxa-resolucao">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-md bg-chart-3/10">
                    <BarChart3 className="w-5 h-5 text-chart-3" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Taxa de Resolução</p>
                    <p className="text-xl font-bold" data-testid="text-taxa-resolucao">{stats?.satisfactionRate ?? 0}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card data-testid="card-chart-weekly">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Conversas por Dia (Semana)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {stats?.weeklyData ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="day"
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
                    <Bar dataKey="conversas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="finalizadas" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
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
                    <Pie
                      data={stats.statusDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {stats.statusDistribution.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "6px",
                        fontSize: "12px",
                      }}
                    />
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
    </div>
  );
}
