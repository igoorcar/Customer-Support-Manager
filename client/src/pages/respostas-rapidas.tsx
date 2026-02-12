import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Search, Plus, Zap, Copy, Trash2 } from "lucide-react";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { QuickReply } from "@shared/schema";

const categories = [
  { value: "saudacao", label: "Saudação" },
  { value: "produtos", label: "Produtos" },
  { value: "precos", label: "Preços" },
  { value: "agendamento", label: "Agendamento" },
  { value: "encerramento", label: "Encerramento" },
  { value: "geral", label: "Geral" },
];

export default function RespostasRapidas() {
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    category: "geral",
    shortcut: "",
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
      setDialogOpen(false);
      setFormData({ title: "", content: "", category: "geral", shortcut: "" });
      toast({ title: "Resposta rápida criada" });
    },
    onError: () => {
      toast({ title: "Erro ao criar resposta", variant: "destructive" });
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

  const filtered = replies?.filter((r) =>
    !searchTerm ||
    r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copiado para a área de transferência" });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold" data-testid="text-respostas-title">Respostas Rápidas</h1>
          <p className="text-sm text-muted-foreground">Mensagens prontas para agilizar o atendimento</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-reply">
              <Plus className="w-4 h-4 mr-1.5" /> Nova Resposta
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Resposta Rápida</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate(formData);
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label>Título *</Label>
                <Input
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ex: Boas-vindas"
                  data-testid="input-reply-title"
                />
              </div>
              <div className="space-y-2">
                <Label>Conteúdo *</Label>
                <Textarea
                  required
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Mensagem que será enviada..."
                  data-testid="input-reply-content"
                />
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
              <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-submit-reply">
                {createMutation.isPending ? "Salvando..." : "Criar Resposta"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar respostas..."
          className="pl-9"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          data-testid="input-search-replies"
        />
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
            return (
              <Card key={reply.id} className="hover-elevate transition-all duration-200" data-testid={`card-reply-${reply.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{reply.title}</p>
                      <p className="text-xs text-muted-foreground mt-1.5 line-clamp-3 leading-relaxed">
                        {reply.content}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-3">
                    <div className="flex items-center gap-1.5">
                      <Badge variant="secondary" className="text-xs">{cat?.label || reply.category}</Badge>
                      {reply.shortcut && (
                        <Badge variant="outline" className="text-xs font-mono">{reply.shortcut}</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => copyToClipboard(reply.content)}
                        data-testid={`button-copy-${reply.id}`}
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMutation.mutate(reply.id)}
                        data-testid={`button-delete-${reply.id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </div>
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
