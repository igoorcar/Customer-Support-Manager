import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Search, Plus, Phone, Mail, Users, StickyNote, Crown, Grid3X3, List,
  DollarSign, ShoppingBag, Calendar, TrendingUp, Eye, Edit, Trash2,
  MessageCircle, MapPin, Tag, ChevronLeft, ChevronRight, ArrowUpDown,
  X,
} from "lucide-react";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Client, ClientNote } from "@shared/schema";

function formatDate(date: string | Date | null) {
  if (!date) return "Nunca";
  return new Date(date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

function daysAgo(date: string | Date | null) {
  if (!date) return "Nunca";
  const d = Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
  if (d === 0) return "Hoje";
  if (d === 1) return "Ontem";
  return `${d} dias`;
}

type ClientsResponse = { data: Client[]; total: number };

export default function Clientes() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [vipFilter, setVipFilter] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState("lastContact");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [profileTab, setProfileTab] = useState<"info" | "conversas" | "notas">("info");
  const [formData, setFormData] = useState({ name: "", phone: "", email: "", notes: "", tags: [] as string[], vip: false, status: "ativo", city: "", state: "", channel: "whatsapp", gender: "", cpf: "", birthday: "" });
  const [noteInput, setNoteInput] = useState("");
  const { toast } = useToast();
  const limit = 24;

  const { data: clientsResult, isLoading } = useQuery<ClientsResponse>({
    queryKey: ["/api/clients", { search: searchTerm, status: statusFilter !== "todos" ? statusFilter : undefined, vip: vipFilter ? "true" : undefined, sortBy, page, limit }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.set("search", searchTerm);
      if (statusFilter !== "todos") params.set("status", statusFilter);
      if (vipFilter) params.set("vip", "true");
      params.set("sortBy", sortBy);
      params.set("page", String(page));
      params.set("limit", String(limit));
      const res = await fetch(`/api/clients?${params}`);
      return res.json();
    },
  });

  const { data: clientNotes } = useQuery<ClientNote[]>({
    queryKey: ["/api/clients", selectedClient?.id, "notes"],
    queryFn: async () => {
      if (!selectedClient) return [];
      const res = await fetch(`/api/clients/${selectedClient.id}/notes`);
      return res.json();
    },
    enabled: !!selectedClient && profileOpen,
  });

  const { data: clientConvs } = useQuery<any[]>({
    queryKey: ["/api/clients", selectedClient?.id, "conversations"],
    queryFn: async () => {
      if (!selectedClient) return [];
      const res = await fetch(`/api/clients/${selectedClient.id}/conversations`);
      return res.json();
    },
    enabled: !!selectedClient && profileOpen && profileTab === "conversas",
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await apiRequest("POST", "/api/clients", {
        ...data,
        tags: data.tags.length > 0 ? data.tags : undefined,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      setDialogOpen(false);
      resetForm();
      toast({ title: "Cliente cadastrado com sucesso" });
    },
    onError: () => {
      toast({ title: "Erro ao cadastrar cliente", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest("PATCH", `/api/clients/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      setEditOpen(false);
      toast({ title: "Cliente atualizado" });
    },
    onError: () => {
      toast({ title: "Erro ao atualizar cliente", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/clients/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      setProfileOpen(false);
      toast({ title: "Cliente removido" });
    },
  });

  const addNoteMutation = useMutation({
    mutationFn: async (data: { clientId: string; content: string; author: string }) => {
      const res = await apiRequest("POST", `/api/clients/${data.clientId}/notes`, { content: data.content, author: data.author });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", selectedClient?.id, "notes"] });
      setNoteInput("");
      toast({ title: "Nota adicionada" });
    },
  });

  const resetForm = () => setFormData({ name: "", phone: "", email: "", notes: "", tags: [], vip: false, status: "ativo", city: "", state: "", channel: "whatsapp", gender: "", cpf: "", birthday: "" });

  const openProfile = (client: Client) => {
    setSelectedClient(client);
    setProfileTab("info");
    setProfileOpen(true);
  };

  const openEdit = (client: Client) => {
    setSelectedClient(client);
    setFormData({
      name: client.name,
      phone: client.phone,
      email: client.email || "",
      notes: client.notes || "",
      tags: client.tags || [],
      vip: client.vip || false,
      status: client.status,
      city: client.city || "",
      state: client.state || "",
      channel: client.channel || "whatsapp",
      gender: client.gender || "",
      cpf: client.cpf || "",
      birthday: client.birthday || "",
    });
    setEditOpen(true);
  };

  const clients = clientsResult?.data || [];
  const total = clientsResult?.total || 0;
  const totalPages = Math.ceil(total / limit);

  const filterBtns = [
    { key: "todos", label: "Todos" },
    { key: "ativo", label: "Ativos" },
    { key: "inativo", label: "Inativos" },
  ];

  const [tagInput, setTagInput] = useState("");

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold" data-testid="text-clientes-title">Clientes</h1>
          <p className="text-sm text-muted-foreground">{total} clientes cadastrados</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-client">
              <Plus className="w-4 h-4 mr-1.5" /> Novo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Cadastrar Cliente</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => { e.preventDefault(); createMutation.mutate(formData); }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2 col-span-2">
                  <Label>Nome *</Label>
                  <Input required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Nome completo" data-testid="input-client-name" />
                </div>
                <div className="space-y-2">
                  <Label>Telefone *</Label>
                  <Input required value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="(00) 00000-0000" data-testid="input-client-phone" />
                </div>
                <div className="space-y-2">
                  <Label>E-mail</Label>
                  <Input value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="email@exemplo.com" data-testid="input-client-email" />
                </div>
                <div className="space-y-2">
                  <Label>CPF</Label>
                  <Input value={formData.cpf} onChange={(e) => setFormData({ ...formData, cpf: e.target.value })} placeholder="000.000.000-00" data-testid="input-client-cpf" />
                </div>
                <div className="space-y-2">
                  <Label>Gênero</Label>
                  <Select value={formData.gender} onValueChange={(v) => setFormData({ ...formData, gender: v })}>
                    <SelectTrigger data-testid="select-client-gender"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="masculino">Masculino</SelectItem>
                      <SelectItem value="feminino">Feminino</SelectItem>
                      <SelectItem value="outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Cidade</Label>
                  <Input value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} placeholder="São Paulo" data-testid="input-client-city" />
                </div>
                <div className="space-y-2">
                  <Label>Estado</Label>
                  <Input value={formData.state} onChange={(e) => setFormData({ ...formData, state: e.target.value })} placeholder="SP" data-testid="input-client-state" />
                </div>
                <div className="space-y-2">
                  <Label>Canal de origem</Label>
                  <Select value={formData.channel} onValueChange={(v) => setFormData({ ...formData, channel: v })}>
                    <SelectTrigger data-testid="select-client-channel"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="loja">Loja Física</SelectItem>
                      <SelectItem value="site">Site</SelectItem>
                      <SelectItem value="indicacao">Indicação</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Tags</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      placeholder="Adicionar tag e pressione Enter"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
                            setFormData({ ...formData, tags: [...formData.tags, tagInput.trim()] });
                            setTagInput("");
                          }
                        }
                      }}
                      data-testid="input-client-tags"
                    />
                  </div>
                  {formData.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {formData.tags.map((t) => (
                        <Badge key={t} variant="secondary" className="text-xs">
                          {t}
                          <button className="ml-1" onClick={() => setFormData({ ...formData, tags: formData.tags.filter(x => x !== t) })}>
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Observações</Label>
                  <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Notas sobre o cliente..." data-testid="input-client-notes" />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-submit-client">
                {createMutation.isPending ? "Salvando..." : "Cadastrar"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, telefone, email..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
            data-testid="input-search-clients"
          />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {filterBtns.map((f) => (
            <Button key={f.key} variant={statusFilter === f.key ? "default" : "outline"} size="sm" onClick={() => { setStatusFilter(f.key); setPage(1); }} data-testid={`button-filter-${f.key}`}>
              {f.label}
            </Button>
          ))}
          <Button variant={vipFilter ? "default" : "outline"} size="sm" onClick={() => { setVipFilter(!vipFilter); setPage(1); }} data-testid="button-filter-vip">
            <Crown className="w-3.5 h-3.5 mr-1" /> VIP
          </Button>
        </div>
        <div className="flex items-center gap-1 ml-auto">
          <Select value={sortBy} onValueChange={(v) => { setSortBy(v); setPage(1); }}>
            <SelectTrigger className="w-40" data-testid="select-sort-by">
              <ArrowUpDown className="w-3.5 h-3.5 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="lastContact">Último contato</SelectItem>
              <SelectItem value="name">Nome A-Z</SelectItem>
              <SelectItem value="totalSpend">Maior gasto</SelectItem>
              <SelectItem value="createdAt">Cadastro recente</SelectItem>
            </SelectContent>
          </Select>
          <Button variant={viewMode === "grid" ? "default" : "outline"} size="icon" onClick={() => setViewMode("grid")} data-testid="button-view-grid">
            <Grid3X3 className="w-4 h-4" />
          </Button>
          <Button variant={viewMode === "list" ? "default" : "outline"} size="icon" onClick={() => setViewMode("list")} data-testid="button-view-list">
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className={`grid gap-4 ${viewMode === "grid" ? "grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4" : "grid-cols-1"}`}>
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4"><div className="flex items-start gap-3"><Skeleton className="w-10 h-10 rounded-full flex-shrink-0" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-24" /></div></div></CardContent></Card>
          ))}
        </div>
      ) : clients.length > 0 ? (
        viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
            {clients.map((client) => (
              <Card key={client.id} className="hover-elevate transition-all duration-200 cursor-pointer relative" onClick={() => openProfile(client)} data-testid={`card-client-${client.id}`}>
                {client.vip && (
                  <div className="absolute top-2 left-2">
                    <Badge variant="outline" className="text-xs border-chart-4 text-chart-4"><Crown className="w-3 h-3 mr-0.5" /> VIP</Badge>
                  </div>
                )}
                <div className="absolute top-2 right-2">
                  <Badge variant={client.status === "ativo" ? "secondary" : "outline"} className="text-xs">{client.status === "ativo" ? "Ativo" : "Inativo"}</Badge>
                </div>
                <CardContent className="p-4 pt-8">
                  <div className="flex flex-col items-center text-center">
                    <Avatar className="w-14 h-14 mb-2">
                      <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
                        {client.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <p className="text-sm font-semibold truncate w-full">{client.name}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Phone className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{client.phone}</span>
                    </div>
                    {client.email && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <Mail className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground truncate max-w-36">{client.email}</span>
                      </div>
                    )}
                    {client.tags && client.tags.length > 0 && (
                      <div className="flex flex-wrap justify-center gap-1 mt-2">
                        {client.tags.slice(0, 3).map((t) => (
                          <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
                        ))}
                        {client.tags.length > 3 && <Badge variant="outline" className="text-xs">+{client.tags.length - 3}</Badge>}
                      </div>
                    )}
                    <div className="grid grid-cols-3 gap-2 w-full mt-3 pt-3 border-t">
                      <div className="text-center">
                        <DollarSign className="w-3.5 h-3.5 text-chart-2 mx-auto" />
                        <p className="text-xs font-semibold mt-0.5">{formatCurrency(client.totalSpend || 0)}</p>
                      </div>
                      <div className="text-center">
                        <ShoppingBag className="w-3.5 h-3.5 text-primary mx-auto" />
                        <p className="text-xs font-semibold mt-0.5">{client.purchaseCount || 0}</p>
                      </div>
                      <div className="text-center">
                        <Calendar className="w-3.5 h-3.5 text-muted-foreground mx-auto" />
                        <p className="text-xs font-semibold mt-0.5">{daysAgo(client.lastPurchaseAt)}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium text-muted-foreground">Cliente</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">WhatsApp</th>
                    <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Tags</th>
                    <th className="text-right p-3 font-medium text-muted-foreground hidden sm:table-cell">Total Gasto</th>
                    <th className="text-right p-3 font-medium text-muted-foreground hidden lg:table-cell">Última Compra</th>
                    <th className="text-center p-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((client) => (
                    <tr key={client.id} className="border-b last:border-0 hover-elevate cursor-pointer" onClick={() => openProfile(client)} data-testid={`row-client-${client.id}`}>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                              {client.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-1">
                              <p className="font-medium truncate">{client.name}</p>
                              {client.vip && <Crown className="w-3.5 h-3.5 text-chart-4" />}
                            </div>
                            {client.email && <p className="text-xs text-muted-foreground truncate max-w-40">{client.email}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-muted-foreground">{client.phone}</td>
                      <td className="p-3 hidden md:table-cell">
                        <div className="flex flex-wrap gap-1">
                          {client.tags?.slice(0, 2).map((t) => (
                            <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
                          ))}
                          {(client.tags?.length || 0) > 2 && <Badge variant="outline" className="text-xs">+{(client.tags?.length || 0) - 2}</Badge>}
                        </div>
                      </td>
                      <td className="p-3 text-right font-medium hidden sm:table-cell">{formatCurrency(client.totalSpend || 0)}</td>
                      <td className="p-3 text-right text-muted-foreground hidden lg:table-cell">{daysAgo(client.lastPurchaseAt)}</td>
                      <td className="p-3 text-center">
                        <Badge variant={client.status === "ativo" ? "secondary" : "outline"} className="text-xs">{client.status === "ativo" ? "Ativo" : "Inativo"}</Badge>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); openProfile(client); }} data-testid={`button-view-${client.id}`}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); openEdit(client); }} data-testid={`button-edit-${client.id}`}>
                            <Edit className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="w-10 h-10 text-muted-foreground mb-3" />
            <p className="text-sm font-medium">Nenhum cliente encontrado</p>
            <p className="text-xs text-muted-foreground mt-1">Ajuste os filtros ou cadastre um novo cliente</p>
          </CardContent>
        </Card>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Mostrando {(page - 1) * limit + 1}-{Math.min(page * limit, total)} de {total}
          </p>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)} data-testid="button-prev-page">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm px-2">{page} / {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)} data-testid="button-next-page">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedClient && (
            <>
              <DialogHeader>
                <div className="flex items-start gap-4">
                  <Avatar className="w-16 h-16">
                    <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
                      {selectedClient.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <DialogTitle className="text-lg">{selectedClient.name}</DialogTitle>
                      {selectedClient.vip && <Badge variant="outline" className="text-xs border-chart-4 text-chart-4"><Crown className="w-3 h-3 mr-0.5" /> VIP</Badge>}
                      <Badge variant={selectedClient.status === "ativo" ? "secondary" : "outline"}>{selectedClient.status === "ativo" ? "Ativo" : "Inativo"}</Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className="text-sm text-muted-foreground flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {selectedClient.phone}</span>
                      {selectedClient.email && <span className="text-sm text-muted-foreground flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {selectedClient.email}</span>}
                    </div>
                    {selectedClient.city && (
                      <span className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5"><MapPin className="w-3.5 h-3.5" /> {selectedClient.city}{selectedClient.state ? `, ${selectedClient.state}` : ""}</span>
                    )}
                  </div>
                </div>
              </DialogHeader>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                <Card><CardContent className="p-3 text-center"><DollarSign className="w-5 h-5 text-chart-2 mx-auto" /><p className="text-lg font-bold mt-1" data-testid="text-total-spend">{formatCurrency(selectedClient.totalSpend || 0)}</p><p className="text-xs text-muted-foreground">Total gasto</p></CardContent></Card>
                <Card><CardContent className="p-3 text-center"><ShoppingBag className="w-5 h-5 text-primary mx-auto" /><p className="text-lg font-bold mt-1">{selectedClient.purchaseCount || 0}</p><p className="text-xs text-muted-foreground">Compras</p></CardContent></Card>
                <Card><CardContent className="p-3 text-center"><TrendingUp className="w-5 h-5 text-chart-5 mx-auto" /><p className="text-lg font-bold mt-1">{selectedClient.purchaseCount ? formatCurrency(Math.round((selectedClient.totalSpend || 0) / selectedClient.purchaseCount)) : "R$ 0"}</p><p className="text-xs text-muted-foreground">Ticket médio</p></CardContent></Card>
                <Card><CardContent className="p-3 text-center"><Calendar className="w-5 h-5 text-chart-4 mx-auto" /><p className="text-lg font-bold mt-1">{daysAgo(selectedClient.lastPurchaseAt)}</p><p className="text-xs text-muted-foreground">Última compra</p></CardContent></Card>
              </div>

              {selectedClient.tags && selectedClient.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {selectedClient.tags.map((t) => <Badge key={t} variant="outline" className="text-xs">{t}</Badge>)}
                </div>
              )}

              <div className="flex gap-1 mt-4 border-b">
                {(["info", "conversas", "notas"] as const).map((tab) => (
                  <Button key={tab} variant={profileTab === tab ? "default" : "ghost"} size="sm" onClick={() => setProfileTab(tab)} data-testid={`button-tab-${tab}`}>
                    {tab === "info" ? "Informações" : tab === "conversas" ? "Conversas" : "Notas"}
                  </Button>
                ))}
              </div>

              <div className="mt-3">
                {profileTab === "info" && (
                  <div className="space-y-3">
                    {selectedClient.notes && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Observações</p>
                        <p className="text-sm">{selectedClient.notes}</p>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {selectedClient.cpf && <div><p className="text-xs text-muted-foreground">CPF</p><p>{selectedClient.cpf}</p></div>}
                      {selectedClient.gender && <div><p className="text-xs text-muted-foreground">Gênero</p><p className="capitalize">{selectedClient.gender}</p></div>}
                      {selectedClient.channel && <div><p className="text-xs text-muted-foreground">Canal</p><p className="capitalize">{selectedClient.channel}</p></div>}
                      {selectedClient.createdAt && <div><p className="text-xs text-muted-foreground">Cadastrado em</p><p>{formatDate(selectedClient.createdAt)}</p></div>}
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(selectedClient)} data-testid="button-edit-profile"><Edit className="w-3.5 h-3.5 mr-1" /> Editar</Button>
                      <Button variant="outline" size="sm" onClick={() => { if (confirm("Tem certeza?")) deleteMutation.mutate(selectedClient.id); }} data-testid="button-delete-client"><Trash2 className="w-3.5 h-3.5 mr-1" /> Excluir</Button>
                      <Button variant="outline" size="sm" onClick={() => updateMutation.mutate({ id: selectedClient.id, data: { vip: !selectedClient.vip } })} data-testid="button-toggle-vip">
                        <Crown className="w-3.5 h-3.5 mr-1" /> {selectedClient.vip ? "Remover VIP" : "Marcar VIP"}
                      </Button>
                    </div>
                  </div>
                )}

                {profileTab === "conversas" && (
                  <div className="space-y-2">
                    {clientConvs && clientConvs.length > 0 ? clientConvs.map((conv: any) => (
                      <Card key={conv.id}>
                        <CardContent className="p-3 flex items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium">{formatDate(conv.startedAt)}</p>
                            {conv.attendantName && <p className="text-xs text-muted-foreground">Atendente: {conv.attendantName}</p>}
                          </div>
                          <Badge variant="secondary" className="text-xs capitalize">{conv.status.replace("_", " ")}</Badge>
                        </CardContent>
                      </Card>
                    )) : (
                      <p className="text-sm text-muted-foreground text-center py-4">Nenhuma conversa registrada</p>
                    )}
                  </div>
                )}

                {profileTab === "notas" && (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Adicionar nota..."
                        value={noteInput}
                        onChange={(e) => setNoteInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && noteInput.trim()) {
                            addNoteMutation.mutate({ clientId: selectedClient.id, content: noteInput.trim(), author: "Atendente" });
                          }
                        }}
                        data-testid="input-client-note"
                      />
                      <Button size="sm" disabled={!noteInput.trim()} onClick={() => addNoteMutation.mutate({ clientId: selectedClient.id, content: noteInput.trim(), author: "Atendente" })} data-testid="button-add-note">Adicionar</Button>
                    </div>
                    {clientNotes && clientNotes.length > 0 ? clientNotes.map((note) => (
                      <Card key={note.id}>
                        <CardContent className="p-3">
                          <p className="text-sm">{note.content}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-muted-foreground">{note.author}</span>
                            <span className="text-xs text-muted-foreground">{formatDate(note.createdAt)}</span>
                          </div>
                        </CardContent>
                      </Card>
                    )) : (
                      <p className="text-sm text-muted-foreground text-center py-4">Nenhuma nota registrada</p>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Cliente</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (selectedClient) updateMutation.mutate({ id: selectedClient.id, data: formData });
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2 col-span-2">
                <Label>Nome *</Label>
                <Input required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} data-testid="input-edit-name" />
              </div>
              <div className="space-y-2">
                <Label>Telefone *</Label>
                <Input required value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} data-testid="input-edit-phone" />
              </div>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} data-testid="input-edit-email" />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger data-testid="select-edit-status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="inativo">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Cidade</Label>
                <Input value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} data-testid="input-edit-city" />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Observações</Label>
                <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} data-testid="input-edit-notes" />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={updateMutation.isPending} data-testid="button-submit-edit">
              {updateMutation.isPending ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
