import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Search, Filter, MessageCircle } from "lucide-react";
import { useState } from "react";
import type { Conversation } from "@shared/schema";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; dotColor: string }> = {
  nova: { label: "Nova", variant: "default", dotColor: "bg-primary" },
  em_atendimento: { label: "Em atendimento", variant: "secondary", dotColor: "bg-chart-2" },
  pausada: { label: "Pausada", variant: "outline", dotColor: "bg-chart-4" },
  finalizada: { label: "Finalizada", variant: "secondary", dotColor: "bg-muted-foreground" },
};

function formatTime(date: string | Date) {
  const d = new Date(date);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60) return "agora";
  if (diff < 3600) return `${Math.floor(diff / 60)}min`;
  if (diff < 86400) return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

type ConvWithNames = Conversation & { clientName: string; attendantName: string; clientPhone: string; lastMessage?: string };

export default function Conversas() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("todas");

  const { data: conversations, isLoading } = useQuery<ConvWithNames[]>({
    queryKey: ["/api/conversations"],
  });

  const filters = [
    { key: "todas", label: "Todas" },
    { key: "nova", label: "Novas" },
    { key: "em_atendimento", label: "Ativas" },
    { key: "pausada", label: "Pausadas" },
    { key: "finalizada", label: "Finalizadas" },
  ];

  const filtered = conversations?.filter((c) => {
    const matchesSearch = !searchTerm ||
      c.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.clientPhone?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = activeFilter === "todas" || c.status === activeFilter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold" data-testid="text-conversas-title">Conversas</h1>
          <p className="text-sm text-muted-foreground" data-testid="text-conversas-subtitle">Gerencie todas as conversas do WhatsApp</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou telefone..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            data-testid="input-search-conversations"
          />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <Filter className="w-4 h-4 text-muted-foreground mr-1" />
          {filters.map((f) => (
            <Button
              key={f.key}
              variant={activeFilter === f.key ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveFilter(f.key)}
              data-testid={`button-filter-${f.key}`}
            >
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : filtered && filtered.length > 0 ? (
          filtered.map((conv) => {
            const st = statusConfig[conv.status] || statusConfig.nova;
            return (
              <Card key={conv.id} className="hover-elevate transition-all duration-200 cursor-pointer" data-testid={`card-conversation-${conv.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="relative flex-shrink-0">
                      <Avatar className="w-10 h-10">
                        <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                          {conv.clientName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ${st.dotColor} border-2 border-card`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold truncate">{conv.clientName}</p>
                        <span className="text-xs text-muted-foreground flex-shrink-0">{formatTime(conv.startedAt)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-0.5">
                        <p className="text-xs text-muted-foreground truncate" data-testid={`text-last-message-${conv.id}`}>
                          {conv.lastMessage || conv.clientPhone || "Sem mensagens"}
                        </p>
                        <Badge variant={st.variant} className="text-xs flex-shrink-0" data-testid={`badge-status-${conv.id}`}>{st.label}</Badge>
                      </div>
                      {conv.attendantName && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Atendente: {conv.attendantName}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <MessageCircle className="w-10 h-10 text-muted-foreground mb-3" />
              <p className="text-sm font-medium">Nenhuma conversa encontrada</p>
              <p className="text-xs text-muted-foreground mt-1">Tente ajustar os filtros de busca</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
