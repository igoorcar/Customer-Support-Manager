import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import {
  Users,
  MessageSquare,
  Target,
  Clock,
  TrendingUp,
  Award,
  BarChart3,
  PieChart as PieChartIcon,
  Beaker,
  Route,
  X,
  Plus,
  Trophy,
  ArrowDown,
  Send,
  Reply,
  CheckCircle,
  XCircle,
} from "lucide-react";
import {
  ComposedChart,
  BarChart,
  Bar,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { api } from "@/services/api";

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

function formatMinutes(minutes: number): string {
  if (!minutes || minutes <= 0) return "--";
  if (minutes < 60) return `${Math.round(minutes)}min`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

function OverviewSection({ periodo }: { periodo: number }) {
  const { data: overview, isLoading } = useQuery({
    queryKey: ["followup-overview", periodo],
    queryFn: () => api.getFollowupOverview(periodo),
    refetchInterval: 30000,
  });

  const cards = [
    {
      title: "Total de Leads",
      value: overview?.total_leads ?? 0,
      icon: Users,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-950/30",
    },
    {
      title: "Taxa de Resposta",
      value: `${overview?.taxa_resposta_geral ?? 0}%`,
      icon: Reply,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-950/30",
    },
    {
      title: "Taxa de Conversao",
      value: `${overview?.taxa_conversao_geral ?? 0}%`,
      icon: Target,
      color: "text-purple-600 dark:text-purple-400",
      bg: "bg-purple-50 dark:bg-purple-950/30",
    },
    {
      title: "Tempo Medio Resposta",
      value: formatMinutes(overview?.tempo_medio_resposta_minutos ?? 0),
      icon: Clock,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-950/30",
    },
    {
      title: "Melhor Mensagem",
      value: overview?.melhor_mensagem ? `#${overview.melhor_mensagem} (${overview.melhor_mensagem_taxa}%)` : "--",
      icon: Award,
      color: "text-rose-600 dark:text-rose-400",
      bg: "bg-rose-50 dark:bg-rose-950/30",
    },
    {
      title: "Melhor Horario",
      value: overview?.melhor_horario != null ? `${overview.melhor_horario}:00` : "--",
      icon: TrendingUp,
      color: "text-teal-600 dark:text-teal-400",
      bg: "bg-teal-50 dark:bg-teal-950/30",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3" data-testid="section-overview">
      {cards.map((card) => (
        <Card key={card.title} data-testid={`card-overview-${card.title.toLowerCase().replace(/\s+/g, "-")}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className={`p-1.5 rounded-md ${card.bg}`}>
                <card.icon className={`w-4 h-4 ${card.color}`} />
              </div>
            </div>
            {isLoading ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <div className="text-xl font-bold" data-testid={`value-${card.title.toLowerCase().replace(/\s+/g, "-")}`}>
                {card.value}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">{card.title}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function FunilSection() {
  const { data: funil, isLoading } = useQuery({
    queryKey: ["followup-funil"],
    queryFn: () => api.getFollowupFunil(),
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">Funil de Conversao</CardTitle></CardHeader>
        <CardContent><Skeleton className="h-64 w-full" /></CardContent>
      </Card>
    );
  }

  const dados = funil || [];

  return (
    <Card data-testid="section-funil">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <ArrowDown className="w-4 h-4" />
          Funil de Conversao
        </CardTitle>
      </CardHeader>
      <CardContent>
        {dados.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Nenhum dado de funil disponivel. Execute o SQL de migracao no Supabase e aguarde os primeiros follow-ups.
          </div>
        ) : (
          <div className="space-y-2">
            {dados.map((etapa: any, idx: number) => (
              <div key={idx} className="flex items-center gap-3">
                <div
                  className="h-10 bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 rounded-md flex items-center justify-between px-3 text-white text-sm font-medium transition-all"
                  style={{ width: `${Math.max(etapa.percentual, 8)}%`, minWidth: "120px" }}
                >
                  <span>Msg {etapa.numero}</span>
                  <span>{etapa.total} ({etapa.percentual}%)</span>
                </div>
                {etapa.dropoff > 0 && (
                  <span className="text-xs text-destructive font-medium whitespace-nowrap">
                    -{etapa.dropoff} ({etapa.dropoff_pct}%)
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PerformanceMensagensSection() {
  const { data: performance, isLoading } = useQuery({
    queryKey: ["followup-performance-mensagem"],
    queryFn: () => api.getFollowupPerformanceMensagem(),
    refetchInterval: 30000,
  });

  const dados = performance || [];

  return (
    <Card data-testid="section-performance">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart3 className="w-4 h-4" />
          Performance por Mensagem
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-96 w-full" />
        ) : dados.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Sem dados de performance ainda.
          </div>
        ) : (
          <div className="space-y-6">
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={dados}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="mensagem_numero" tick={axisTickStyle} label={{ value: "Mensagem", position: "insideBottom", offset: -5, style: axisTickStyle }} />
                <YAxis yAxisId="left" tick={axisTickStyle} label={{ value: "Taxa Resposta (%)", angle: -90, position: "insideLeft", style: axisTickStyle }} />
                <YAxis yAxisId="right" orientation="right" tick={axisTickStyle} label={{ value: "Taxa Conversao (%)", angle: 90, position: "insideRight", style: axisTickStyle }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <Bar yAxisId="left" dataKey="taxa_resposta_pct" fill="#3B82F6" name="Taxa de Resposta %" radius={[4, 4, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="taxa_conversao_pct" stroke="#10B981" strokeWidth={2} name="Taxa de Conversao %" dot={{ r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>

            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="table-performance">
                <thead>
                  <tr className="border-b">
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Msg</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Dia</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">Enviadas</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">Respondidas</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">Taxa Resp</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">Conversoes</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">Taxa Conv</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">Tempo Medio</th>
                  </tr>
                </thead>
                <tbody>
                  {dados.map((msg: any) => (
                    <tr key={`${msg.mensagem_numero}-${msg.mensagem_dia}`} className="border-b last:border-0 hover-elevate" data-testid={`row-performance-${msg.mensagem_numero}`}>
                      <td className="px-3 py-2 font-semibold">#{msg.mensagem_numero}</td>
                      <td className="px-3 py-2 text-muted-foreground">Dia {msg.mensagem_dia}</td>
                      <td className="px-3 py-2 text-right">{msg.total_enviadas}</td>
                      <td className="px-3 py-2 text-right">{msg.total_respondidas}</td>
                      <td className="px-3 py-2 text-right">
                        <span className={`font-semibold ${Number(msg.taxa_resposta_pct) > 15 ? "text-emerald-600 dark:text-emerald-400" : ""}`}>
                          {msg.taxa_resposta_pct}%
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">{msg.total_conversoes}</td>
                      <td className="px-3 py-2 text-right">
                        <span className={`font-semibold ${Number(msg.taxa_conversao_pct) > 2 ? "text-emerald-600 dark:text-emerald-400" : ""}`}>
                          {msg.taxa_conversao_pct}%
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right text-muted-foreground">
                        {formatMinutes(msg.tempo_medio_resposta_minutos)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function HeatmapHorariosSection() {
  const { data: horarios, isLoading } = useQuery({
    queryKey: ["followup-melhor-horario"],
    queryFn: () => api.getFollowupMelhorHorario(),
    refetchInterval: 30000,
  });

  const dados = horarios || [];

  const getColorClasses = (taxa: number) => {
    if (taxa > 15) return "bg-emerald-500 dark:bg-emerald-600 text-white";
    if (taxa > 10) return "bg-amber-500 dark:bg-amber-600 text-white";
    return "bg-red-500 dark:bg-red-600 text-white";
  };

  return (
    <Card data-testid="section-heatmap">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Melhores Horarios de Envio
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : dados.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Sem dados de horario disponivel.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {dados.map((horario: any) => (
              <div
                key={horario.hora_envio}
                className={`p-4 rounded-md ${getColorClasses(Number(horario.taxa_resposta_pct))}`}
                data-testid={`card-horario-${horario.hora_envio}`}
              >
                <div className="text-2xl font-bold mb-1">
                  {String(Math.floor(horario.hora_envio)).padStart(2, "0")}:00
                </div>
                <div className="text-sm font-medium mb-0.5">
                  Taxa: {horario.taxa_resposta_pct}%
                </div>
                <div className="text-xs opacity-80">
                  {horario.total_respondidas}/{horario.total_enviadas} responderam
                </div>
                <div className="text-xs opacity-70 mt-1">
                  Tempo medio: {formatMinutes(horario.tempo_medio_resposta_min)}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PerformanceFunilSection() {
  const { data: funilPerf, isLoading } = useQuery({
    queryKey: ["followup-performance-funil"],
    queryFn: () => api.getFollowupPerformanceFunil(),
    refetchInterval: 30000,
  });

  const dados = funilPerf || [];

  return (
    <Card data-testid="section-performance-funil">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Route className="w-4 h-4" />
          Performance por Etiqueta de Funil
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : dados.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Sem dados de etiquetas de funil.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dados} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={axisTickStyle} />
              <YAxis dataKey="etiqueta_funil" type="category" width={120} tick={axisTickStyle} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              <Bar dataKey="taxa_resposta_pct" fill="#3B82F6" name="Taxa Resposta %" radius={[0, 4, 4, 0]} />
              <Bar dataKey="taxa_conversao_pct" fill="#10B981" name="Taxa Conversao %" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

function MotivosSection() {
  const { data: motivos, isLoading } = useQuery({
    queryKey: ["followup-motivos-perda"],
    queryFn: () => api.getFollowupMotivosPerda(),
    refetchInterval: 30000,
  });

  const dados = motivos || [];

  return (
    <Card data-testid="section-motivos">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <PieChartIcon className="w-4 h-4" />
          Motivos de Nao Conversao
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : dados.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Nenhum motivo de perda registrado.
          </div>
        ) : (
          <div className="flex flex-col md:flex-row items-center gap-6">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={dados}
                  dataKey="total"
                  nameKey="motivo_nao_conversao"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ motivo_nao_conversao, percentual }) => `${motivo_nao_conversao}: ${percentual}%`}
                  labelLine={{ stroke: "hsl(var(--muted-foreground))" }}
                >
                  {dados.map((_: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 min-w-[180px]">
              {dados.map((m: any, idx: number) => (
                <div key={m.motivo_nao_conversao} className="flex items-center gap-2 text-sm" data-testid={`motivo-${idx}`}>
                  <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }} />
                  <span className="truncate">{m.motivo_nao_conversao}</span>
                  <span className="ml-auto font-medium text-muted-foreground">{m.total}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function JornadasSection() {
  const [apenasConvertidos, setApenasConvertidos] = useState(false);

  const { data: jornadas, isLoading } = useQuery({
    queryKey: ["followup-jornadas", apenasConvertidos],
    queryFn: () => api.getFollowupJornadas(apenasConvertidos, 15),
    refetchInterval: 30000,
  });

  const dados = jornadas || [];

  return (
    <Card data-testid="section-jornadas">
      <CardHeader>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-base flex items-center gap-2">
            <Route className="w-4 h-4" />
            Jornadas dos Leads
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant={apenasConvertidos ? "default" : "outline"}
              size="sm"
              onClick={() => setApenasConvertidos(!apenasConvertidos)}
              data-testid="button-filtro-convertidos"
            >
              <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
              Apenas convertidos
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : dados.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Nenhuma jornada encontrada.
          </div>
        ) : (
          <div className="space-y-3">
            {dados.map((jornada: any) => (
              <div
                key={jornada.conversa_id}
                className={`border rounded-md p-3 ${jornada.converteu ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20" : ""}`}
                data-testid={`jornada-${jornada.conversa_id}`}
              >
                <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                  <div>
                    <div className="font-medium text-sm">{jornada.cliente_nome}</div>
                    <div className="text-xs text-muted-foreground">{jornada.whatsapp}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {jornada.etiqueta_funil_atual && (
                      <Badge variant="secondary" className="text-xs">{jornada.etiqueta_funil_atual}</Badge>
                    )}
                    {jornada.converteu && (
                      <Badge variant="default" className="text-xs bg-emerald-600">Converteu</Badge>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                  <span className="text-xs text-muted-foreground mr-1">Enviadas: {jornada.total_mensagens_enviadas}</span>
                  {jornada.mensagens_respondidas && (
                    <span className="text-xs text-muted-foreground">
                      Respondeu: {jornada.mensagens_respondidas.join(", ")}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  {Array.from({ length: 9 }, (_, i) => i + 1).map((num) => {
                    const enviou = num <= (jornada.ultima_mensagem_enviada || 0);
                    const respondeu = jornada.mensagens_respondidas?.includes(num);
                    return (
                      <div
                        key={num}
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                          respondeu
                            ? "bg-emerald-500 text-white"
                            : enviou
                            ? "bg-blue-500 text-white"
                            : "bg-muted text-muted-foreground"
                        }`}
                        data-testid={`jornada-msg-${jornada.conversa_id}-${num}`}
                      >
                        {num}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TestesABSection() {
  const queryClient = useQueryClient();
  const [criando, setCriando] = useState(false);
  const [form, setForm] = useState({
    nome: "",
    descricao: "",
    mensagem_numero: 1,
    variante_a: "",
    variante_b: "",
  });

  const { data: testes, isLoading } = useQuery({
    queryKey: ["followup-ab-tests"],
    queryFn: () => api.getFollowupAbTests(),
    refetchInterval: 30000,
  });

  const criarMutation = useMutation({
    mutationFn: (dados: typeof form) => api.createFollowupAbTest(dados),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["followup-ab-tests"] });
      setCriando(false);
      setForm({ nome: "", descricao: "", mensagem_numero: 1, variante_a: "", variante_b: "" });
    },
  });

  const finalizarMutation = useMutation({
    mutationFn: ({ id, vencedor }: { id: string; vencedor: string }) =>
      api.updateFollowupAbTest(id, { ativo: false, fim_em: new Date().toISOString(), vencedor }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["followup-ab-tests"] });
    },
  });

  const dados = testes || [];

  return (
    <Card data-testid="section-ab-tests">
      <CardHeader>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-base flex items-center gap-2">
            <Beaker className="w-4 h-4" />
            Testes A/B
          </CardTitle>
          <Button size="sm" onClick={() => setCriando(true)} data-testid="button-novo-ab-test">
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Novo Teste
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {criando && (
          <div className="border rounded-md p-4 mb-4 space-y-3" data-testid="form-novo-ab-test">
            <div className="flex items-center justify-between gap-2">
              <h4 className="font-medium text-sm">Novo Teste A/B</h4>
              <Button size="icon" variant="ghost" onClick={() => setCriando(false)} data-testid="button-cancelar-ab">
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Nome do teste</Label>
                <Input
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  placeholder="Ex: Teste urgencia vs social proof"
                  data-testid="input-ab-nome"
                />
              </div>
              <div>
                <Label className="text-xs">Mensagem #</Label>
                <Select
                  value={String(form.mensagem_numero)}
                  onValueChange={(v) => setForm({ ...form, mensagem_numero: parseInt(v) })}
                >
                  <SelectTrigger data-testid="select-ab-mensagem">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 9 }, (_, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>Mensagem {i + 1}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Descricao</Label>
              <Input
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                placeholder="Objetivo do teste"
                data-testid="input-ab-descricao"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Variante A</Label>
                <Textarea
                  value={form.variante_a}
                  onChange={(e) => setForm({ ...form, variante_a: e.target.value })}
                  placeholder="Texto da variante A..."
                  className="min-h-[80px]"
                  data-testid="textarea-ab-variante-a"
                />
              </div>
              <div>
                <Label className="text-xs">Variante B</Label>
                <Textarea
                  value={form.variante_b}
                  onChange={(e) => setForm({ ...form, variante_b: e.target.value })}
                  placeholder="Texto da variante B..."
                  className="min-h-[80px]"
                  data-testid="textarea-ab-variante-b"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={() => criarMutation.mutate(form)}
                disabled={!form.nome || !form.variante_a || !form.variante_b || criarMutation.isPending}
                data-testid="button-salvar-ab"
              >
                <Send className="w-3.5 h-3.5 mr-1.5" />
                {criarMutation.isPending ? "Salvando..." : "Criar Teste"}
              </Button>
            </div>
          </div>
        )}

        {isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : dados.length === 0 && !criando ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Nenhum teste A/B criado ainda.
          </div>
        ) : (
          <div className="space-y-3">
            {dados.map((teste: any) => (
              <div key={teste.id} className="border rounded-md p-4" data-testid={`ab-test-${teste.id}`}>
                <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                  <div>
                    <h4 className="font-medium text-sm">{teste.nome}</h4>
                    <p className="text-xs text-muted-foreground">Mensagem #{teste.mensagem_numero}</p>
                  </div>
                  <Badge variant={teste.ativo ? "default" : "secondary"}>
                    {teste.ativo ? "Ativo" : "Finalizado"}
                  </Badge>
                </div>

                {teste.descricao && (
                  <p className="text-xs text-muted-foreground mb-3">{teste.descricao}</p>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className={`p-3 rounded-md border ${teste.vencedor === "A" ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20" : ""}`}>
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-xs font-semibold">Variante A</span>
                      {teste.vencedor === "A" && <Trophy className="w-3.5 h-3.5 text-emerald-600" />}
                    </div>
                    <div className="text-xs bg-muted/50 p-2 rounded mb-2 line-clamp-3">{teste.variante_a}</div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between gap-1">
                        <span className="text-muted-foreground">Enviadas:</span>
                        <span className="font-medium">{teste.total_enviadas_a || 0}</span>
                      </div>
                      <div className="flex justify-between gap-1">
                        <span className="text-muted-foreground">Taxa Resposta:</span>
                        <span className="font-medium">{teste.taxa_resposta_a || 0}%</span>
                      </div>
                      <div className="flex justify-between gap-1">
                        <span className="text-muted-foreground">Taxa Conversao:</span>
                        <span className="font-medium">{teste.taxa_conversao_a || 0}%</span>
                      </div>
                    </div>
                  </div>

                  <div className={`p-3 rounded-md border ${teste.vencedor === "B" ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20" : ""}`}>
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-xs font-semibold">Variante B</span>
                      {teste.vencedor === "B" && <Trophy className="w-3.5 h-3.5 text-emerald-600" />}
                    </div>
                    <div className="text-xs bg-muted/50 p-2 rounded mb-2 line-clamp-3">{teste.variante_b}</div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between gap-1">
                        <span className="text-muted-foreground">Enviadas:</span>
                        <span className="font-medium">{teste.total_enviadas_b || 0}</span>
                      </div>
                      <div className="flex justify-between gap-1">
                        <span className="text-muted-foreground">Taxa Resposta:</span>
                        <span className="font-medium">{teste.taxa_resposta_b || 0}%</span>
                      </div>
                      <div className="flex justify-between gap-1">
                        <span className="text-muted-foreground">Taxa Conversao:</span>
                        <span className="font-medium">{teste.taxa_conversao_b || 0}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {teste.ativo && (
                  <div className="flex items-center justify-end gap-2 mt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => finalizarMutation.mutate({ id: teste.id, vencedor: "A" })}
                      disabled={finalizarMutation.isPending}
                      data-testid={`button-vencedor-a-${teste.id}`}
                    >
                      <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                      A Vence
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => finalizarMutation.mutate({ id: teste.id, vencedor: "B" })}
                      disabled={finalizarMutation.isPending}
                      data-testid={`button-vencedor-b-${teste.id}`}
                    >
                      <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                      B Vence
                    </Button>
                  </div>
                )}

                {teste.vencedor && (
                  <div className="mt-3 p-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md">
                    <div className="text-xs font-semibold text-amber-800 dark:text-amber-200 flex items-center gap-1.5">
                      <Trophy className="w-3.5 h-3.5" />
                      Vencedor: Variante {teste.vencedor}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function FollowUpAnalytics() {
  const [periodo, setPeriodo] = useState(30);

  return (
    <div className="space-y-4" data-testid="page-followup-analytics">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-xl font-bold" data-testid="text-page-title">Analytics Follow-up 72h</h1>
          <p className="text-sm text-muted-foreground">Performance das mensagens automaticas de follow-up</p>
        </div>
        <Select value={String(periodo)} onValueChange={(v) => setPeriodo(parseInt(v))}>
          <SelectTrigger className="w-[140px]" data-testid="select-periodo">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">7 dias</SelectItem>
            <SelectItem value="15">15 dias</SelectItem>
            <SelectItem value="30">30 dias</SelectItem>
            <SelectItem value="60">60 dias</SelectItem>
            <SelectItem value="90">90 dias</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <OverviewSection periodo={periodo} />

      <Tabs defaultValue="funil" className="space-y-4">
        <TabsList className="flex-wrap" data-testid="tabs-followup">
          <TabsTrigger value="funil" data-testid="tab-funil">Funil</TabsTrigger>
          <TabsTrigger value="performance" data-testid="tab-performance">Performance</TabsTrigger>
          <TabsTrigger value="horarios" data-testid="tab-horarios">Horarios</TabsTrigger>
          <TabsTrigger value="etiquetas" data-testid="tab-etiquetas">Etiquetas</TabsTrigger>
          <TabsTrigger value="motivos" data-testid="tab-motivos">Motivos Perda</TabsTrigger>
          <TabsTrigger value="jornadas" data-testid="tab-jornadas">Jornadas</TabsTrigger>
          <TabsTrigger value="ab-tests" data-testid="tab-ab-tests">Testes A/B</TabsTrigger>
        </TabsList>

        <TabsContent value="funil">
          <FunilSection />
        </TabsContent>

        <TabsContent value="performance">
          <PerformanceMensagensSection />
        </TabsContent>

        <TabsContent value="horarios">
          <HeatmapHorariosSection />
        </TabsContent>

        <TabsContent value="etiquetas">
          <PerformanceFunilSection />
        </TabsContent>

        <TabsContent value="motivos">
          <MotivosSection />
        </TabsContent>

        <TabsContent value="jornadas">
          <JornadasSection />
        </TabsContent>

        <TabsContent value="ab-tests">
          <TestesABSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}
