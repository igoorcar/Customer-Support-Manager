import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Settings, Bell, Clock, MessageSquare, Shield } from "lucide-react";
import { useState } from "react";

export default function Configuracoes() {
  const { toast } = useToast();
  const [settings, setSettings] = useState({
    businessName: "Ótica Suellen",
    businessPhone: "(11) 99999-9999",
    autoReply: true,
    autoReplyMessage: "Olá! Obrigada por entrar em contato com a Ótica Suellen. Em breve um de nossos atendentes irá lhe atender.",
    notifications: true,
    soundAlert: true,
    maxWaitTime: "5",
    workHoursStart: "08:00",
    workHoursEnd: "18:00",
    workOnWeekends: false,
  });

  const handleSave = () => {
    toast({ title: "Configurações salvas com sucesso" });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold" data-testid="text-configuracoes-title">Configurações</h1>
        <p className="text-sm text-muted-foreground">Personalize o funcionamento do painel</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Settings className="w-4 h-4" /> Dados da Empresa
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Nome da Empresa</Label>
              <Input
                value={settings.businessName}
                onChange={(e) => setSettings({ ...settings, businessName: e.target.value })}
                data-testid="input-business-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Telefone Principal</Label>
              <Input
                value={settings.businessPhone}
                onChange={(e) => setSettings({ ...settings, businessPhone: e.target.value })}
                data-testid="input-business-phone"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <MessageSquare className="w-4 h-4" /> Resposta Automática
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Ativar resposta automática</p>
                <p className="text-xs text-muted-foreground">Responder automaticamente novas mensagens</p>
              </div>
              <Switch
                checked={settings.autoReply}
                onCheckedChange={(v) => setSettings({ ...settings, autoReply: v })}
                data-testid="switch-auto-reply"
              />
            </div>
            {settings.autoReply && (
              <div className="space-y-2">
                <Label>Mensagem automática</Label>
                <Input
                  value={settings.autoReplyMessage}
                  onChange={(e) => setSettings({ ...settings, autoReplyMessage: e.target.value })}
                  data-testid="input-auto-reply-message"
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Bell className="w-4 h-4" /> Notificações
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Notificações do navegador</p>
                <p className="text-xs text-muted-foreground">Receber alertas de novas mensagens</p>
              </div>
              <Switch
                checked={settings.notifications}
                onCheckedChange={(v) => setSettings({ ...settings, notifications: v })}
                data-testid="switch-notifications"
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Alertas sonoros</p>
                <p className="text-xs text-muted-foreground">Som ao receber novas mensagens</p>
              </div>
              <Switch
                checked={settings.soundAlert}
                onCheckedChange={(v) => setSettings({ ...settings, soundAlert: v })}
                data-testid="switch-sound-alert"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Clock className="w-4 h-4" /> Horário de Atendimento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Início</Label>
                <Input
                  type="time"
                  value={settings.workHoursStart}
                  onChange={(e) => setSettings({ ...settings, workHoursStart: e.target.value })}
                  data-testid="input-work-start"
                />
              </div>
              <div className="space-y-2">
                <Label>Fim</Label>
                <Input
                  type="time"
                  value={settings.workHoursEnd}
                  onChange={(e) => setSettings({ ...settings, workHoursEnd: e.target.value })}
                  data-testid="input-work-end"
                />
              </div>
            </div>
            <Separator />
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Atender nos finais de semana</p>
                <p className="text-xs text-muted-foreground">Sábados e domingos</p>
              </div>
              <Switch
                checked={settings.workOnWeekends}
                onCheckedChange={(v) => setSettings({ ...settings, workOnWeekends: v })}
                data-testid="switch-weekends"
              />
            </div>
            <div className="space-y-2">
              <Label>Tempo máximo de espera (minutos)</Label>
              <Input
                type="number"
                min="1"
                value={settings.maxWaitTime}
                onChange={(e) => setSettings({ ...settings, maxWaitTime: e.target.value })}
                data-testid="input-max-wait"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} data-testid="button-save-settings">
          Salvar Configurações
        </Button>
      </div>
    </div>
  );
}
