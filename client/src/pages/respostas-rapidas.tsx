import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Search, Plus, Zap, Copy, Trash2, Edit, BarChart3, Clock, Hand, Info,
  Package, Smile, Calendar, Eye, EyeOff, Send,
} from "lucide-react";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { QuickReply } from "@shared/schema";

const categories = [
  { value: "saudacao", label: "Saudação", icon: Hand },
  { value: "produtos", label: "Produtos", icon: Package },
  { value: "precos", label: "Preços", icon: Info },
  { value: "agendamento", label: "Agendamento", icon: Calendar },
  { value: "encerramento", label: "Encerramento", icon: Smile },
  { value: "geral", label: "Geral", icon: Info },
];

function daysAgo(count: number) {
  if (count === 0) return "Nunca usado";
  return `${count}x usado`;
}

export default function RespostasRapidas() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("todos");
  const [showInactive, setShowInactive] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingReply, setEditingReply] = useState<QuickReply | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    category: "geral",
    shortcut: "",
    active: true,
  });
  const { toast } = useToast();

  const { data: replies, isLoading } = useQuery<QuickReply[]>({
    queryKey: ["/api/quick-replies"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await apiRequest("POST", "/api/quick-replies", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quick-replies"] });
      closeDialog();
      toast({ title: "Resposta rápida criada" });
    },
    onError: () => {
      toast({ title: "Erro ao criar resposta", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest("PATCH", `/api/quick-replies/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quick-replies"] });
      closeDialog();
      toast({ title: "Resposta atualizada" });
    },
    onError: () => {
      toast({ title: "Erro ao atualizar resposta", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/quick-replies/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quick-replies"] });
      toast({ title: "Resposta removida" });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const res = await apiRequest("PATCH", `/api/quick-replies/${id}`, { active });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quick-replies"] });
    },
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingReply(null);
    setFormData({ title: "", content: "", category: "geral", shortcut: "", active: true });
  };

  const openEdit = (reply: QuickReply) => {
    setEditingReply(reply);
    setFormData({
      title: reply.title,
      content: reply.content,
      category: reply.category,
      shortcut: reply.shortcut || "",
      active: reply.active ?? true,
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingReply) {
      updateMutation.mutate({ id: editingReply.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const filtered = replies?.filter((r) => {
    const matchesSearch = !searchTerm ||
      r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeCategory === "todos" || r.category === activeCategory;
    const matchesActive = showInactive || r.active;
    return matchesSearch && matchesCategory && matchesActive;
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copiado para a área de transferência" });
  };

  const activeCounts = replies?.reduce((acc, r) => {
    acc[r.category] = (acc[r.category] || 0) + (r.active ? 1 : 0);
    return acc;
  }, {} as Record<string, number>) || {};

  const totalActive = replies?.filter(r => r.active).length || 0;
  const totalInactive = replies?.filter(r => !r.active).length || 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold" data-testid="text-respostas-title">Respostas Rápidas</h1>
          <p className="text-sm text-muted-foreground">Configure respostas automáticas para agilizar o atendimento</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); else setDialogOpen(true); }}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-reply">
              <Plus className="w-4 h-4 mr-1.5" /> Nova Resposta
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingReply ? "Editar Resposta Rápida" : "Criar Resposta Rápida"}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Título *</Label>
                  <Input
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Ex: Boas-vindas"
                    maxLength={30}
                    data-testid="input-reply-title"
                  />
                  <p className="text-xs text-muted-foreground text-right">{formData.title.length}/30</p>
                </div>
                <div className="space-y-2">
                  <Label>Conteúdo *</Label>
                  <Textarea
                    required
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="Mensagem que será enviada..."
                    maxLength={1000}
                    className="min-h-[120px]"
                    data-testid="input-reply-content"
                  />
                  <p className="text-xs text-muted-foreground text-right">{formData.content.length}/1000</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Categoria</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(v) => setFormData({ ...formData, category: v })}
                    >
                      <SelectTrigger data-testid="select-reply-category">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((c) => (
                          <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Atalho</Label>
                    <Input
                      value={formData.shortcut}
                      onChange={(e) => setFormData({ ...formData, shortcut: e.target.value })}
                      placeholder="/ola"
                      data-testid="input-reply-shortcut"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.active}
                    onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                    data-testid="switch-reply-active"
                  />
                  <Label>Ativo</Label>
                </div>
                <Button type="submit" className="w-full" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-submit-reply">
                  {(createMutation.isPending || updateMutation.isPending) ? "Salvando..." : editingReply ? "Salvar Alterações" : "Criar Resposta"}
                </Button>
              </form>

              <div className="hidden lg:block">
                <p className="text-sm font-semibold mb-2">Preview do Envio</p>
                <p className="text-xs text-muted-foreground mb-3">Veja como ficará no chat</p>
                <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      {(() => {
                        const cat = categories.find(c => c.value === formData.category);
                        const Icon = cat?.icon || Info;
                        return <Icon className="w-4 h-4 text-primary" />;
                      })()}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{formData.title || "Título do botão"}</p>
                      {formData.shortcut && <p className="text-xs text-muted-foreground font-mono">{formData.shortcut}</p>}
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <div className="bg-primary text-primary-foreground rounded-lg px-3 py-2 max-w-[85%]">
                      <p className="text-sm whitespace-pre-wrap">{formData.content || "O conteúdo da mensagem aparecerá aqui..."}</p>
                      <p className="text-xs text-primary-foreground/70 text-right mt-1">12:00</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar respostas..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            data-testid="input-search-replies"
          />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <Button
            variant={activeCategory === "todos" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveCategory("todos")}
            data-testid="button-cat-todos"
          >
            Todos
            <Badge variant="secondary" className="ml-1 text-xs">{totalActive}</Badge>
          </Button>
          {categories.map((c) => {
            const Icon = c.icon;
            return (
              <Button
                key={c.value}
                variant={activeCategory === c.value ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveCategory(c.value)}
                data-testid={`button-cat-${c.value}`}
              >
                <Icon className="w-3.5 h-3.5 mr-1" />
                {c.label}
                {(activeCounts[c.value] || 0) > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs">{activeCounts[c.value]}</Badge>
                )}
              </Button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Switch
          checked={showInactive}
          onCheckedChange={setShowInactive}
          data-testid="switch-show-inactive"
        />
        <Label className="text-sm">Mostrar inativos ({totalInactive})</Label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </CardContent>
            </Card>
          ))
        ) : filtered && filtered.length > 0 ? (
          filtered.map((reply) => {
            const cat = categories.find((c) => c.value === reply.category);
            const Icon = cat?.icon || Info;
            const isActive = reply.active ?? true;
            return (
              <Card key={reply.id} className={`transition-all duration-200 ${isActive ? "hover-elevate" : "opacity-60"}`} data-testid={`card-reply-${reply.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${isActive ? "bg-primary/10" : "bg-muted"}`}>
                      <Icon className={`w-5 h-5 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold truncate">{reply.title}</p>
                        <Switch
                          checked={isActive}
                          onCheckedChange={(checked) => toggleActiveMutation.mutate({ id: reply.id, active: checked })}
                          data-testid={`switch-active-${reply.id}`}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                        {reply.content}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">{cat?.label || reply.category}</Badge>
                      {reply.shortcut && (
                        <Badge variant="outline" className="text-xs font-mono">{reply.shortcut}</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <BarChart3 className="w-3 h-3" />
                      <span>{reply.usageCount || 0}x</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-1 mt-2">
                    <Button variant="ghost" size="icon" onClick={() => copyToClipboard(reply.content)} data-testid={`button-copy-${reply.id}`}>
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(reply)} data-testid={`button-edit-${reply.id}`}>
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(reply.id)} data-testid={`button-delete-${reply.id}`}>
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card className="md:col-span-2 xl:col-span-3">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Zap className="w-10 h-10 text-muted-foreground mb-3" />
              <p className="text-sm font-medium">Nenhuma resposta rápida</p>
              <p className="text-xs text-muted-foreground mt-1">Crie mensagens prontas para acelerar o atendimento</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
