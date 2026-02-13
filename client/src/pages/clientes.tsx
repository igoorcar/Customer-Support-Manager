import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search, Phone, Mail, Users, Grid3X3, List,
  DollarSign, ShoppingBag, Calendar, TrendingUp, Eye,
  MessageCircle, Tag, ChevronLeft, ChevronRight,
} from "lucide-react";
import { useState } from "react";
import { api } from "@/services/api";
import type { ClienteSupabase, Conversa } from "@/lib/supabase";

function formatDate(date: string | Date | null) {
  if (!date) return "Nunca";
  return new Date(date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

function getInitials(nome: string) {
  return nome.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
}

export default function Clientes() {
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [page, setPage] = useState(1);
  const [profileOpen, setProfileOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClienteSupabase | null>(null);
  const [profileTab, setProfileTab] = useState<"info" | "conversas">("info");
  const limit = 24;

  const { data: clientsResult, isLoading } = useQuery<{ data: ClienteSupabase[]; total: number }>({
    queryKey: ["supabase-clientes", searchTerm, page, limit],
    queryFn: () => api.getClientesSupabase({ search: searchTerm || undefined, page, limit }),
  });

  const { data: clientConvs } = useQuery<Conversa[]>({
    queryKey: ["supabase-cliente-conversas", selectedClient?.id],
    queryFn: () => api.getClienteConversas(selectedClient!.id),
    enabled: !!selectedClient && profileOpen && profileTab === "conversas",
  });

  const openProfile = (client: ClienteSupabase) => {
    setSelectedClient(client);
    setProfileTab("info");
    setProfileOpen(true);
  };

  const clients = clientsResult?.data || [];
  const total = clientsResult?.total || 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold" data-testid="text-clientes-title">Clientes</h1>
          <p className="text-sm text-muted-foreground">{total} clientes cadastrados</p>
        </div>
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
        <div className="flex items-center gap-1 ml-auto">
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
                <div className="absolute top-2 right-2">
                  <Badge variant={client.status === "ativo" ? "secondary" : "outline"} className="text-xs">{client.status === "ativo" ? "Ativo" : "Inativo"}</Badge>
                </div>
                <CardContent className="p-4 pt-8">
                  <div className="flex flex-col items-center text-center">
                    <Avatar className="w-14 h-14 mb-2">
                      <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
                        {getInitials(client.nome)}
                      </AvatarFallback>
                    </Avatar>
                    <p className="text-sm font-semibold truncate w-full">{client.nome}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Phone className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{client.whatsapp}</span>
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
                        <p className="text-xs font-semibold mt-0.5">{formatCurrency(client.valor_total_compras || 0)}</p>
                      </div>
                      <div className="text-center">
                        <ShoppingBag className="w-3.5 h-3.5 text-primary mx-auto" />
                        <p className="text-xs font-semibold mt-0.5">{client.total_compras || 0}</p>
                      </div>
                      <div className="text-center">
                        <MessageCircle className="w-3.5 h-3.5 text-muted-foreground mx-auto" />
                        <p className="text-xs font-semibold mt-0.5">{client.total_conversas || 0}</p>
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
                    <th className="text-right p-3 font-medium text-muted-foreground hidden lg:table-cell">Compras</th>
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
                              {getInitials(client.nome)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium truncate">{client.nome}</p>
                            {client.email && <p className="text-xs text-muted-foreground truncate max-w-40">{client.email}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-muted-foreground">{client.whatsapp}</td>
                      <td className="p-3 hidden md:table-cell">
                        <div className="flex flex-wrap gap-1">
                          {client.tags?.slice(0, 2).map((t) => (
                            <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
                          ))}
                          {(client.tags?.length || 0) > 2 && <Badge variant="outline" className="text-xs">+{(client.tags?.length || 0) - 2}</Badge>}
                        </div>
                      </td>
                      <td className="p-3 text-right font-medium hidden sm:table-cell">{formatCurrency(client.valor_total_compras || 0)}</td>
                      <td className="p-3 text-right text-muted-foreground hidden lg:table-cell">{client.total_compras || 0}</td>
                      <td className="p-3 text-center">
                        <Badge variant={client.status === "ativo" ? "secondary" : "outline"} className="text-xs">{client.status === "ativo" ? "Ativo" : "Inativo"}</Badge>
                      </td>
                      <td className="p-3 text-right">
                        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); openProfile(client); }} data-testid={`button-view-${client.id}`}>
                          <Eye className="w-4 h-4" />
                        </Button>
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
            <p className="text-xs text-muted-foreground mt-1">Ajuste os filtros de busca</p>
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
                      {getInitials(selectedClient.nome)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <DialogTitle className="text-lg">{selectedClient.nome}</DialogTitle>
                      <Badge variant={selectedClient.status === "ativo" ? "secondary" : "outline"}>{selectedClient.status === "ativo" ? "Ativo" : "Inativo"}</Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className="text-sm text-muted-foreground flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {selectedClient.whatsapp}</span>
                      {selectedClient.email && <span className="text-sm text-muted-foreground flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {selectedClient.email}</span>}
                    </div>
                  </div>
                </div>
              </DialogHeader>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                <Card><CardContent className="p-3 text-center"><DollarSign className="w-5 h-5 text-chart-2 mx-auto" /><p className="text-lg font-bold mt-1" data-testid="text-total-spend">{formatCurrency(selectedClient.valor_total_compras || 0)}</p><p className="text-xs text-muted-foreground">Total gasto</p></CardContent></Card>
                <Card><CardContent className="p-3 text-center"><ShoppingBag className="w-5 h-5 text-primary mx-auto" /><p className="text-lg font-bold mt-1">{selectedClient.total_compras || 0}</p><p className="text-xs text-muted-foreground">Compras</p></CardContent></Card>
                <Card><CardContent className="p-3 text-center"><TrendingUp className="w-5 h-5 text-chart-5 mx-auto" /><p className="text-lg font-bold mt-1">{selectedClient.total_compras ? formatCurrency(Math.round((selectedClient.valor_total_compras || 0) / selectedClient.total_compras)) : "R$ 0"}</p><p className="text-xs text-muted-foreground">Ticket médio</p></CardContent></Card>
                <Card><CardContent className="p-3 text-center"><MessageCircle className="w-5 h-5 text-chart-4 mx-auto" /><p className="text-lg font-bold mt-1">{selectedClient.total_conversas || 0}</p><p className="text-xs text-muted-foreground">Conversas</p></CardContent></Card>
              </div>

              {selectedClient.tags && selectedClient.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {selectedClient.tags.map((t) => <Badge key={t} variant="outline" className="text-xs">{t}</Badge>)}
                </div>
              )}

              <div className="flex gap-1 mt-4 border-b">
                {(["info", "conversas"] as const).map((tab) => (
                  <Button key={tab} variant={profileTab === tab ? "default" : "ghost"} size="sm" onClick={() => setProfileTab(tab)} data-testid={`button-tab-${tab}`}>
                    {tab === "info" ? "Informações" : "Conversas"}
                  </Button>
                ))}
              </div>

              <div className="mt-3">
                {profileTab === "info" && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div><p className="text-xs text-muted-foreground">WhatsApp</p><p>{selectedClient.whatsapp}</p></div>
                      {selectedClient.email && <div><p className="text-xs text-muted-foreground">E-mail</p><p>{selectedClient.email}</p></div>}
                      <div><p className="text-xs text-muted-foreground">Cadastrado em</p><p>{formatDate(selectedClient.criado_em)}</p></div>
                      <div><p className="text-xs text-muted-foreground">Status</p><p className="capitalize">{selectedClient.status}</p></div>
                    </div>
                  </div>
                )}

                {profileTab === "conversas" && (
                  <div className="space-y-2">
                    {clientConvs && clientConvs.length > 0 ? clientConvs.map((conv) => (
                      <Card key={conv.id}>
                        <CardContent className="p-3 flex items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium">{formatDate(conv.iniciada_em)}</p>
                            {conv.atendentes?.nome && <p className="text-xs text-muted-foreground">Atendente: {conv.atendentes.nome}</p>}
                            {conv.finalizada_em && <p className="text-xs text-muted-foreground">Finalizada: {formatDate(conv.finalizada_em)}</p>}
                          </div>
                          <Badge variant="secondary" className="text-xs capitalize">{conv.status.replace("_", " ")}</Badge>
                        </CardContent>
                      </Card>
                    )) : (
                      <p className="text-sm text-muted-foreground text-center py-4">Nenhuma conversa registrada</p>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
