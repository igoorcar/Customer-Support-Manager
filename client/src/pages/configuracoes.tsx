import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Building2,
  User,
  Bell,
  MessageSquare,
  Clock,
  Users,
  Palette,
  Shield,
  Upload,
  Sun,
  Moon,
  Monitor,
  Trash2,
  Plus,
} from "lucide-react";
import type { Attendant } from "@shared/schema";

const STORAGE_KEY = "otica-suellen-settings";

type SectionId =
  | "perfil"
  | "conta"
  | "notificacoes"
  | "atendimento"
  | "horario"
  | "equipe"
  | "aparencia"
  | "seguranca";

const sections: { id: SectionId; label: string; icon: typeof Building2 }[] = [
  { id: "perfil", label: "Perfil da Empresa", icon: Building2 },
  { id: "conta", label: "Conta", icon: User },
  { id: "notificacoes", label: "Notificações", icon: Bell },
  { id: "atendimento", label: "Atendimento", icon: MessageSquare },
  { id: "horario", label: "Horário de Funcionamento", icon: Clock },
  { id: "equipe", label: "Equipe", icon: Users },
  { id: "aparencia", label: "Aparência", icon: Palette },
  { id: "seguranca", label: "Segurança", icon: Shield },
];

function getDefaultSettings() {
  return {
    businessName: "Ótica Suellen",
    businessPhone: "(11) 99999-9999",
    businessEmail: "",
    businessAddress: "",
    businessCnpj: "",
    accountUsername: "admin",
    accountEmail: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    notifBrowser: true,
    notifSound: true,
    notifEmail: false,
    notifDailyDigest: false,
    autoReply: true,
    autoReplyMessage:
      "Olá! Obrigada por entrar em contato com a Ótica Suellen. Em breve um de nossos atendentes irá lhe atender.",
    autoDistribution: true,
    maxConcurrentChats: "5",
    chatbotMode: false,
    workHoursStart: "08:00",
    workHoursEnd: "18:00",
    workOnWeekends: false,
    offHoursMessage:
      "Nosso horário de atendimento é de segunda a sexta, das 08:00 às 18:00. Deixe sua mensagem que responderemos assim que possível.",
    theme: "system",
    colorScheme: "blue",
    animations: true,
    twoFactor: false,
    sessionTimeout: "30",
  };
}

function loadSettings() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...getDefaultSettings(), ...JSON.parse(stored) };
    }
  } catch {}
  return getDefaultSettings();
}

export default function Configuracoes() {
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState<SectionId>("perfil");
  const [settings, setSettings] = useState(loadSettings);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const update = (key: string, value: string | boolean) => {
    setSettings((prev: Record<string, string | boolean>) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    toast({ title: "Configurações salvas com sucesso!" });
  };

  const renderSection = () => {
    switch (activeSection) {
      case "perfil":
        return <PerfilSection settings={settings} update={update} onSave={handleSave} />;
      case "conta":
        return <ContaSection settings={settings} update={update} onSave={handleSave} />;
      case "notificacoes":
        return <NotificacoesSection settings={settings} update={update} onSave={handleSave} />;
      case "atendimento":
        return <AtendimentoSection settings={settings} update={update} onSave={handleSave} />;
      case "horario":
        return <HorarioSection settings={settings} update={update} onSave={handleSave} />;
      case "equipe":
        return <EquipeSection />;
      case "aparencia":
        return <AparenciaSection settings={settings} update={update} onSave={handleSave} />;
      case "seguranca":
        return <SegurancaSection settings={settings} update={update} onSave={handleSave} />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold" data-testid="text-configuracoes-title">
          Configurações
        </h1>
        <p className="text-sm text-muted-foreground">
          Gerencie todas as configurações do sistema
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        <Card className="lg:w-64 shrink-0">
          <CardContent className="p-2">
            <nav className="flex flex-col gap-1" data-testid="nav-settings">
              {sections.map((section) => {
                const Icon = section.icon;
                const isActive = activeSection === section.id;
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm text-left transition-colors ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover-elevate"
                    }`}
                    data-testid={`nav-section-${section.id}`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{section.label}</span>
                  </button>
                );
              })}
            </nav>
          </CardContent>
        </Card>

        <div className="flex-1 min-w-0">{renderSection()}</div>
      </div>
    </div>
  );
}

interface SectionProps {
  settings: ReturnType<typeof getDefaultSettings>;
  update: (key: string, value: string | boolean) => void;
  onSave: () => void;
}

function SaveButton({ onSave }: { onSave: () => void }) {
  return (
    <div className="flex justify-end pt-4">
      <Button onClick={onSave} data-testid="button-save-settings">
        Salvar Configurações
      </Button>
    </div>
  );
}

function PerfilSection({ settings, update, onSave }: SectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Building2 className="w-5 h-5" />
          Perfil da Empresa
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <div
            className="w-20 h-20 rounded-md border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center text-muted-foreground cursor-pointer"
            data-testid="area-logo-upload"
          >
            <Upload className="w-6 h-6 mb-1" />
            <span className="text-xs">Logo</span>
          </div>
          <div className="text-sm text-muted-foreground">
            Clique para enviar o logotipo da empresa
          </div>
        </div>
        <Separator />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Nome da Empresa</Label>
            <Input
              value={settings.businessName}
              onChange={(e) => update("businessName", e.target.value)}
              data-testid="input-business-name"
            />
          </div>
          <div className="space-y-2">
            <Label>Telefone</Label>
            <Input
              value={settings.businessPhone}
              onChange={(e) => update("businessPhone", e.target.value)}
              data-testid="input-business-phone"
            />
          </div>
          <div className="space-y-2">
            <Label>E-mail</Label>
            <Input
              type="email"
              value={settings.businessEmail}
              onChange={(e) => update("businessEmail", e.target.value)}
              placeholder="contato@oticasuellen.com.br"
              data-testid="input-business-email"
            />
          </div>
          <div className="space-y-2">
            <Label>CNPJ</Label>
            <Input
              value={settings.businessCnpj}
              onChange={(e) => update("businessCnpj", e.target.value)}
              placeholder="00.000.000/0001-00"
              data-testid="input-business-cnpj"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Endereço</Label>
          <Input
            value={settings.businessAddress}
            onChange={(e) => update("businessAddress", e.target.value)}
            placeholder="Rua, número, bairro, cidade - UF"
            data-testid="input-business-address"
          />
        </div>
        <SaveButton onSave={onSave} />
      </CardContent>
    </Card>
  );
}

function ContaSection({ settings, update, onSave }: SectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <User className="w-5 h-5" />
          Conta
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Nome de usuário</Label>
          <Input
            value={settings.accountUsername}
            disabled
            data-testid="input-account-username"
          />
        </div>
        <div className="space-y-2">
          <Label>E-mail</Label>
          <Input
            type="email"
            value={settings.accountEmail}
            onChange={(e) => update("accountEmail", e.target.value)}
            placeholder="seu@email.com"
            data-testid="input-account-email"
          />
        </div>
        <Separator />
        <h3 className="text-sm font-semibold">Alterar Senha</h3>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Senha atual</Label>
            <Input
              type="password"
              value={settings.currentPassword}
              onChange={(e) => update("currentPassword", e.target.value)}
              data-testid="input-current-password"
            />
          </div>
          <div className="space-y-2">
            <Label>Nova senha</Label>
            <Input
              type="password"
              value={settings.newPassword}
              onChange={(e) => update("newPassword", e.target.value)}
              data-testid="input-new-password"
            />
          </div>
          <div className="space-y-2">
            <Label>Confirmar nova senha</Label>
            <Input
              type="password"
              value={settings.confirmPassword}
              onChange={(e) => update("confirmPassword", e.target.value)}
              data-testid="input-confirm-password"
            />
          </div>
        </div>
        <SaveButton onSave={onSave} />
      </CardContent>
    </Card>
  );
}

function NotificacoesSection({ settings, update, onSave }: SectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Bell className="w-5 h-5" />
          Notificações
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Notificações do navegador</p>
            <p className="text-xs text-muted-foreground">
              Receber alertas de novas mensagens no navegador
            </p>
          </div>
          <Switch
            checked={settings.notifBrowser}
            onCheckedChange={(v) => update("notifBrowser", v)}
            data-testid="switch-notif-browser"
          />
        </div>
        <Separator />
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Alertas sonoros</p>
            <p className="text-xs text-muted-foreground">
              Reproduzir som ao receber novas mensagens
            </p>
          </div>
          <Switch
            checked={settings.notifSound}
            onCheckedChange={(v) => update("notifSound", v)}
            data-testid="switch-notif-sound"
          />
        </div>
        <Separator />
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Notificação por email</p>
            <p className="text-xs text-muted-foreground">
              Receber notificações importantes por e-mail
            </p>
          </div>
          <Switch
            checked={settings.notifEmail}
            onCheckedChange={(v) => update("notifEmail", v)}
            data-testid="switch-notif-email"
          />
        </div>
        <Separator />
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Resumo diário</p>
            <p className="text-xs text-muted-foreground">
              Receber um resumo diário das atividades por e-mail
            </p>
          </div>
          <Switch
            checked={settings.notifDailyDigest}
            onCheckedChange={(v) => update("notifDailyDigest", v)}
            data-testid="switch-notif-daily"
          />
        </div>
        <SaveButton onSave={onSave} />
      </CardContent>
    </Card>
  );
}

function AtendimentoSection({ settings, update, onSave }: SectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquare className="w-5 h-5" />
          Atendimento
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Resposta automática</p>
            <p className="text-xs text-muted-foreground">
              Enviar mensagem automática para novas conversas
            </p>
          </div>
          <Switch
            checked={settings.autoReply}
            onCheckedChange={(v) => update("autoReply", v)}
            data-testid="switch-auto-reply"
          />
        </div>
        {settings.autoReply && (
          <div className="space-y-2">
            <Label>Mensagem automática</Label>
            <Textarea
              value={settings.autoReplyMessage}
              onChange={(e) => update("autoReplyMessage", e.target.value)}
              rows={3}
              data-testid="textarea-auto-reply-message"
            />
          </div>
        )}
        <Separator />
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Distribuição automática</p>
            <p className="text-xs text-muted-foreground">
              Distribuir novas conversas automaticamente entre os atendentes
            </p>
          </div>
          <Switch
            checked={settings.autoDistribution}
            onCheckedChange={(v) => update("autoDistribution", v)}
            data-testid="switch-auto-distribution"
          />
        </div>
        <Separator />
        <div className="space-y-2">
          <Label>Limite de conversas simultâneas</Label>
          <Input
            type="number"
            min="1"
            value={settings.maxConcurrentChats}
            onChange={(e) => update("maxConcurrentChats", e.target.value)}
            data-testid="input-max-concurrent"
          />
          <p className="text-xs text-muted-foreground">
            Número máximo de conversas por atendente
          </p>
        </div>
        <Separator />
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Modo chatbot</p>
            <p className="text-xs text-muted-foreground">
              Ativar respostas automáticas por inteligência artificial
            </p>
          </div>
          <Switch
            checked={settings.chatbotMode}
            onCheckedChange={(v) => update("chatbotMode", v)}
            data-testid="switch-chatbot-mode"
          />
        </div>
        <SaveButton onSave={onSave} />
      </CardContent>
    </Card>
  );
}

function HorarioSection({ settings, update, onSave }: SectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="w-5 h-5" />
          Horário de Funcionamento
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Início</Label>
            <Input
              type="time"
              value={settings.workHoursStart}
              onChange={(e) => update("workHoursStart", e.target.value)}
              data-testid="input-work-start"
            />
          </div>
          <div className="space-y-2">
            <Label>Fim</Label>
            <Input
              type="time"
              value={settings.workHoursEnd}
              onChange={(e) => update("workHoursEnd", e.target.value)}
              data-testid="input-work-end"
            />
          </div>
        </div>
        <Separator />
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Atender nos finais de semana</p>
            <p className="text-xs text-muted-foreground">
              Habilitar atendimento aos sábados e domingos
            </p>
          </div>
          <Switch
            checked={settings.workOnWeekends}
            onCheckedChange={(v) => update("workOnWeekends", v)}
            data-testid="switch-weekends"
          />
        </div>
        <Separator />
        <div className="space-y-2">
          <Label>Mensagem fora de horário</Label>
          <Textarea
            value={settings.offHoursMessage}
            onChange={(e) => update("offHoursMessage", e.target.value)}
            rows={3}
            data-testid="textarea-off-hours"
          />
          <p className="text-xs text-muted-foreground">
            Mensagem enviada quando o cliente entra em contato fora do horário
          </p>
        </div>
        <SaveButton onSave={onSave} />
      </CardContent>
    </Card>
  );
}

function EquipeSection() {
  const { toast } = useToast();
  const { data: attendants, isLoading } = useQuery<Attendant[]>({
    queryKey: ["/api/attendants"],
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="w-5 h-5" />
          Equipe
        </CardTitle>
        <Button
          onClick={() =>
            toast({ title: "Funcionalidade em desenvolvimento" })
          }
          data-testid="button-add-attendant"
        >
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Atendente
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="table-attendants">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 font-medium text-muted-foreground">Nome</th>
                  <th className="pb-2 font-medium text-muted-foreground">E-mail</th>
                  <th className="pb-2 font-medium text-muted-foreground">Status</th>
                  <th className="pb-2 font-medium text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody>
                {attendants?.map((att) => (
                  <tr key={att.id} className="border-b last:border-0" data-testid={`row-attendant-${att.id}`}>
                    <td className="py-3 font-medium">{att.name}</td>
                    <td className="py-3 text-muted-foreground">{att.email}</td>
                    <td className="py-3">
                      <Badge
                        variant={att.status === "online" ? "default" : "secondary"}
                        className="text-xs"
                        data-testid={`badge-status-${att.id}`}
                      >
                        {att.status === "online" ? "Online" : att.status === "offline" ? "Offline" : att.status}
                      </Badge>
                    </td>
                    <td className="py-3">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          toast({ title: "Funcionalidade em desenvolvimento" })
                        }
                        data-testid={`button-remove-attendant-${att.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {attendants?.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-muted-foreground">
                      Nenhum atendente cadastrado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AparenciaSection({ settings, update, onSave }: SectionProps) {
  const themes = [
    { value: "light", label: "Claro", icon: Sun },
    { value: "dark", label: "Escuro", icon: Moon },
    { value: "system", label: "Sistema", icon: Monitor },
  ];

  const colorSchemes = [
    { value: "blue", label: "Azul", color: "bg-blue-500" },
    { value: "green", label: "Verde", color: "bg-green-500" },
    { value: "purple", label: "Roxo", color: "bg-purple-500" },
    { value: "orange", label: "Laranja", color: "bg-orange-500" },
    { value: "red", label: "Vermelho", color: "bg-red-500" },
    { value: "pink", label: "Rosa", color: "bg-pink-500" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Palette className="w-5 h-5" />
          Aparência
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <Label>Tema</Label>
          <div className="grid grid-cols-3 gap-3">
            {themes.map((t) => {
              const Icon = t.icon;
              const isSelected = settings.theme === t.value;
              return (
                <button
                  key={t.value}
                  onClick={() => update("theme", t.value)}
                  className={`flex flex-col items-center gap-2 rounded-md border-2 p-4 transition-colors ${
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-transparent bg-muted/50 hover-elevate"
                  }`}
                  data-testid={`button-theme-${t.value}`}
                >
                  <Icon className="w-6 h-6" />
                  <span className="text-xs font-medium">{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>
        <Separator />
        <div className="space-y-3">
          <Label>Esquema de cores</Label>
          <div className="flex flex-wrap gap-3">
            {colorSchemes.map((c) => {
              const isSelected = settings.colorScheme === c.value;
              return (
                <button
                  key={c.value}
                  onClick={() => update("colorScheme", c.value)}
                  className={`flex flex-col items-center gap-1.5 rounded-md border-2 p-3 transition-colors ${
                    isSelected
                      ? "border-primary"
                      : "border-transparent hover-elevate"
                  }`}
                  data-testid={`button-color-${c.value}`}
                >
                  <div className={`w-8 h-8 rounded-full ${c.color}`} />
                  <span className="text-xs">{c.label}</span>
                </button>
              );
            })}
          </div>
        </div>
        <Separator />
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Animações</p>
            <p className="text-xs text-muted-foreground">
              Habilitar animações e transições na interface
            </p>
          </div>
          <Switch
            checked={settings.animations}
            onCheckedChange={(v) => update("animations", v)}
            data-testid="switch-animations"
          />
        </div>
        <SaveButton onSave={onSave} />
      </CardContent>
    </Card>
  );
}

function SegurancaSection({ settings, update, onSave }: SectionProps) {
  const { toast } = useToast();

  const mockSessions = [
    {
      id: "1",
      device: "Chrome - Windows",
      ip: "192.168.1.10",
      lastActivity: "Agora",
    },
    {
      id: "2",
      device: "Safari - iPhone",
      ip: "192.168.1.25",
      lastActivity: "Há 15 minutos",
    },
    {
      id: "3",
      device: "Firefox - macOS",
      ip: "10.0.0.5",
      lastActivity: "Há 2 horas",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Shield className="w-5 h-5" />
          Segurança
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Autenticação de dois fatores</p>
            <p className="text-xs text-muted-foreground">
              Adicionar uma camada extra de segurança à sua conta
            </p>
          </div>
          <Switch
            checked={settings.twoFactor}
            onCheckedChange={(v) => update("twoFactor", v)}
            data-testid="switch-two-factor"
          />
        </div>
        <Separator />
        <div className="space-y-2">
          <Label>Tempo limite da sessão</Label>
          <Select
            value={settings.sessionTimeout}
            onValueChange={(v) => update("sessionTimeout", v)}
          >
            <SelectTrigger data-testid="select-session-timeout">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="15">15 minutos</SelectItem>
              <SelectItem value="30">30 minutos</SelectItem>
              <SelectItem value="60">1 hora</SelectItem>
              <SelectItem value="120">2 horas</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Separator />
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Sessões ativas</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="table-sessions">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 font-medium text-muted-foreground">Dispositivo</th>
                  <th className="pb-2 font-medium text-muted-foreground">IP</th>
                  <th className="pb-2 font-medium text-muted-foreground">Última atividade</th>
                </tr>
              </thead>
              <tbody>
                {mockSessions.map((s) => (
                  <tr key={s.id} className="border-b last:border-0" data-testid={`row-session-${s.id}`}>
                    <td className="py-3">{s.device}</td>
                    <td className="py-3 text-muted-foreground">{s.ip}</td>
                    <td className="py-3 text-muted-foreground">{s.lastActivity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button
            variant="destructive"
            onClick={() =>
              toast({ title: "Todas as sessões foram encerradas" })
            }
            data-testid="button-end-sessions"
          >
            Encerrar todas as sessões
          </Button>
        </div>
        <SaveButton onSave={onSave} />
      </CardContent>
    </Card>
  );
}
