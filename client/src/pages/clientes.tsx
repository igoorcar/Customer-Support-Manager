import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Search, Plus, Phone, Mail, Users, StickyNote } from "lucide-react";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Client } from "@shared/schema";

function formatDate(date: string | Date | null) {
  if (!date) return "Nunca";
  return new Date(date).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function Clientes() {
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", phone: "", email: "", notes: "" });
  const { toast } = useToast();

  const { data: clients, isLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await apiRequest("POST", "/api/clients", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      setDialogOpen(false);
      setFormData({ name: "", phone: "", email: "", notes: "" });
      toast({ title: "Cliente cadastrado com sucesso" });
    },
    onError: () => {
      toast({ title: "Erro ao cadastrar cliente", variant: "destructive" });
    },
  });

  const filtered = clients?.filter((c) =>
    !searchTerm ||
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm) ||
    c.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold" data-testid="text-clientes-title">Clientes</h1>
          <p className="text-sm text-muted-foreground">Gerencie sua base de clientes</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-client">
              <Plus className="w-4 h-4 mr-1.5" /> Novo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cadastrar Cliente</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate(formData);
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nome completo"
                  data-testid="input-client-name"
                />
              </div>
              <div className="space-y-2">
                <Label>Telefone *</Label>
                <Input
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="(00) 00000-0000"
                  data-testid="input-client-phone"
                />
              </div>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@exemplo.com"
                  data-testid="input-client-email"
                />
              </div>
              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Notas sobre o cliente..."
                  data-testid="input-client-notes"
                />
              </div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-submit-client">
                {createMutation.isPending ? "Salvando..." : "Cadastrar"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar clientes..."
          className="pl-9"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          data-testid="input-search-clients"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-3 w-28" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : filtered && filtered.length > 0 ? (
          filtered.map((client) => (
            <Card key={client.id} className="hover-elevate transition-all duration-200" data-testid={`card-client-${client.id}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar className="w-10 h-10 flex-shrink-0">
                    <AvatarFallback className="bg-chart-3/10 text-chart-3 text-sm font-semibold">
                      {client.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{client.name}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Phone className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                      <span className="text-xs text-muted-foreground">{client.phone}</span>
                    </div>
                    {client.email && (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Mail className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                        <span className="text-xs text-muted-foreground truncate">{client.email}</span>
                      </div>
                    )}
                    {client.notes && (
                      <div className="flex items-start gap-1.5 mt-1.5">
                        <StickyNote className="w-3 h-3 text-muted-foreground flex-shrink-0 mt-0.5" />
                        <span className="text-xs text-muted-foreground line-clamp-2">{client.notes}</span>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      Último contato: {formatDate(client.lastContact)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="md:col-span-2 xl:col-span-3">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="w-10 h-10 text-muted-foreground mb-3" />
              <p className="text-sm font-medium">Nenhum cliente encontrado</p>
              <p className="text-xs text-muted-foreground mt-1">Cadastre seu primeiro cliente</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
