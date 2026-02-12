import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Search, Filter, MessageCircle, Send, ArrowLeft, Phone, Mail,
  UserPlus, Pause, CheckCircle, MoreVertical, PanelRight, PanelRightClose,
  Check, Zap, Hand, Info, Package, Smile, ChevronDown, Clock, ArrowDown,
  Tag, MapPin, Calendar,
} from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Conversation, Message, QuickReply, Attendant } from "@shared/schema";

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

function formatMessageTime(date: string | Date) {
  return new Date(date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

type ConvWithNames = Conversation & {
  clientName: string;
  attendantName: string;
  clientPhone: string;
  lastMessage?: string;
  unreadCount?: number;
  lastMessageAt?: string;
};

const categoryIcons: Record<string, any> = {
  saudacao: Hand,
  produtos: Package,
  precos: Info,
  agendamento: Calendar,
  encerramento: Smile,
  geral: Info,
};

function MessageStatus({ status }: { status: string }) {
  if (status === "sent") {
    return <Check className="w-3.5 h-3.5 text-muted-foreground" />;
  }
  if (status === "delivered") {
    return (
      <div className="flex -space-x-2">
        <Check className="w-3.5 h-3.5 text-muted-foreground" />
        <Check className="w-3.5 h-3.5 text-muted-foreground" />
      </div>
    );
  }
  if (status === "read") {
    return (
      <div className="flex -space-x-2">
        <Check className="w-3.5 h-3.5 text-primary" />
        <Check className="w-3.5 h-3.5 text-primary" />
      </div>
    );
  }
  return null;
}

export default function Conversas() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("todas");
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [rightPanelOpen, setRightPanelOpen] = useState(() => {
    const saved = localStorage.getItem("rightPanelOpen");
    return saved !== null ? saved === "true" : true;
  });
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [finalizeDialogOpen, setFinalizeDialogOpen] = useState(false);
  const [transferReason, setTransferReason] = useState("");
  const [transferAttendantId, setTransferAttendantId] = useState("");
  const [finalizeReason, setFinalizeReason] = useState("atendido");
  const [finalizeNotes, setFinalizeNotes] = useState("");
  const [showScrollDown, setShowScrollDown] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    localStorage.setItem("rightPanelOpen", String(rightPanelOpen));
  }, [rightPanelOpen]);

  const { data: conversations, isLoading } = useQuery<ConvWithNames[]>({
    queryKey: ["/api/conversations"],
  });

  const { data: messagesData, isLoading: messagesLoading } = useQuery<Message[]>({
    queryKey: ["/api/conversations", selectedConvId, "messages"],
    queryFn: async () => {
      if (!selectedConvId) return [];
      const res = await fetch(`/api/conversations/${selectedConvId}/messages`);
      return res.json();
    },
    enabled: !!selectedConvId,
    refetchInterval: 5000,
  });

  const { data: quickRepliesData } = useQuery<QuickReply[]>({
    queryKey: ["/api/quick-replies"],
  });

  const { data: attendantsData } = useQuery<Attendant[]>({
    queryKey: ["/api/attendants"],
  });

  const selectedConv = conversations?.find(c => c.id === selectedConvId);

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest("POST", `/api/conversations/${selectedConvId}/messages`, {
        sender: "attendant",
        content,
        type: "text",
        status: "sent",
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", selectedConvId, "messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      setMessageInput("");
    },
    onError: () => {
      toast({ title: "Erro ao enviar mensagem", variant: "destructive" });
    },
  });

  const updateConvMutation = useMutation({
    mutationFn: async (data: { status?: string; attendantId?: string; finishReason?: string }) => {
      const res = await apiRequest("PATCH", `/api/conversations/${selectedConvId}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    },
  });

  const useQuickReplyMutation = useMutation({
    mutationFn: async (reply: QuickReply) => {
      await apiRequest("POST", `/api/quick-replies/${reply.id}/use`, {});
      const res = await apiRequest("POST", `/api/conversations/${selectedConvId}/messages`, {
        sender: "attendant",
        content: reply.content,
        type: "text",
        status: "sent",
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", selectedConvId, "messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/quick-replies"] });
      toast({ title: "Resposta rápida enviada" });
    },
  });

  const handleSendMessage = () => {
    if (!messageInput.trim() || !selectedConvId) return;
    sendMessageMutation.mutate(messageInput.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handlePause = () => {
    updateConvMutation.mutate({ status: "pausada" }, {
      onSuccess: () => toast({ title: "Conversa pausada" }),
    });
  };

  const handleFinalize = () => {
    updateConvMutation.mutate(
      { status: "finalizada", finishReason: finalizeReason },
      {
        onSuccess: () => {
          toast({ title: "Conversa finalizada" });
          setFinalizeDialogOpen(false);
          setFinalizeReason("atendido");
          setFinalizeNotes("");
        },
      }
    );
  };

  const handleTransfer = () => {
    if (!transferAttendantId) return;
    updateConvMutation.mutate(
      { attendantId: transferAttendantId },
      {
        onSuccess: () => {
          toast({ title: "Conversa transferida" });
          setTransferDialogOpen(false);
          setTransferAttendantId("");
          setTransferReason("");
        },
      }
    );
  };

  useEffect(() => {
    if (messagesData && messagesData.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messagesData]);

  const handleScroll = useCallback(() => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    setShowScrollDown(scrollHeight - scrollTop - clientHeight > 100);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

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

  const activeQuickReplies = quickRepliesData?.filter(r => r.active) || [];
  const groupedReplies = activeQuickReplies.reduce((acc, reply) => {
    const cat = reply.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(reply);
    return acc;
  }, {} as Record<string, QuickReply[]>);

  const categoryLabels: Record<string, string> = {
    saudacao: "Saudações",
    produtos: "Produtos",
    precos: "Preços",
    agendamento: "Agendamento",
    encerramento: "Despedidas",
    geral: "Geral",
  };

  if (selectedConvId && selectedConv) {
    return (
      <div className="flex h-[calc(100vh-4rem)] -m-4 md:-m-6">
        <div className="hidden md:flex flex-col w-72 border-r bg-background flex-shrink-0">
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="input-search-conversations-sidebar"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filtered?.map((conv) => {
              const st = statusConfig[conv.status] || statusConfig.nova;
              const isSelected = conv.id === selectedConvId;
              return (
                <div
                  key={conv.id}
                  className={`flex items-center gap-3 p-3 cursor-pointer border-b transition-colors ${isSelected ? "bg-accent" : "hover-elevate"}`}
                  onClick={() => setSelectedConvId(conv.id)}
                  data-testid={`sidebar-conv-${conv.id}`}
                >
                  <div className="relative flex-shrink-0">
                    <Avatar className="w-9 h-9">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                        {conv.clientName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className={`absolute bottom-0 right-0 w-2 h-2 rounded-full ${st.dotColor} border-2 border-background`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-sm font-medium truncate">{conv.clientName}</p>
                      <span className="text-xs text-muted-foreground flex-shrink-0">{formatTime(conv.startedAt)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{conv.lastMessage || conv.clientPhone}</p>
                  </div>
                  {(conv.unreadCount ?? 0) > 0 && (
                    <Badge variant="default" className="text-xs min-w-5 justify-center">{conv.unreadCount}</Badge>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="hidden lg:flex flex-col w-56 border-r bg-background flex-shrink-0">
          <div className="p-3 border-b flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">Respostas Rápidas</span>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {Object.entries(groupedReplies).map(([cat, replies]) => {
              const Icon = categoryIcons[cat] || Info;
              return (
                <div key={cat} className="mb-3">
                  <div className="flex items-center gap-1.5 px-2 py-1">
                    <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{categoryLabels[cat] || cat}</span>
                  </div>
                  {replies.map((reply) => (
                    <button
                      key={reply.id}
                      className="w-full text-left p-2 rounded-md hover-elevate transition-colors"
                      onClick={() => useQuickReplyMutation.mutate(reply)}
                      disabled={useQuickReplyMutation.isPending}
                      data-testid={`button-quick-reply-${reply.id}`}
                    >
                      <p className="text-sm font-medium truncate">{reply.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{reply.content}</p>
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 p-3 border-b bg-background">
            <div className="flex items-center gap-3 min-w-0">
              <Button variant="ghost" size="icon" onClick={() => setSelectedConvId(null)} data-testid="button-back-to-list">
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <Avatar className="w-8 h-8 flex-shrink-0">
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                  {selectedConv.clientName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate" data-testid="text-chat-client-name">{selectedConv.clientName}</p>
                <p className="text-xs text-muted-foreground">{selectedConv.clientPhone}</p>
              </div>
              <Badge variant={statusConfig[selectedConv.status]?.variant || "secondary"} className="flex-shrink-0" data-testid="badge-chat-status">
                {statusConfig[selectedConv.status]?.label || selectedConv.status}
              </Badge>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <Button variant="ghost" size="icon" onClick={() => setTransferDialogOpen(true)} data-testid="button-transfer">
                <UserPlus className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handlePause} data-testid="button-pause">
                <Pause className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setFinalizeDialogOpen(true)} data-testid="button-finalize">
                <CheckCircle className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setRightPanelOpen(!rightPanelOpen)}
                data-testid="button-toggle-panel"
              >
                {rightPanelOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRight className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 relative" ref={chatContainerRef} onScroll={handleScroll} data-testid="chat-messages-area">
            {messagesLoading ? (
              <div className="flex flex-col items-center justify-center h-full gap-2">
                <Skeleton className="w-8 h-8 rounded-full" />
                <p className="text-sm text-muted-foreground">Carregando mensagens...</p>
              </div>
            ) : messagesData && messagesData.length > 0 ? (
              messagesData.map((msg) => {
                const isAttendant = msg.sender === "attendant";
                return (
                  <div key={msg.id} className={`flex ${isAttendant ? "justify-end" : "justify-start"}`} data-testid={`message-${msg.id}`}>
                    <div className={`max-w-[70%] rounded-lg px-3 py-2 ${isAttendant ? "bg-primary text-primary-foreground" : "bg-card border"}`}>
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      <div className={`flex items-center justify-end gap-1 mt-1 ${isAttendant ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                        <span className="text-xs">{formatMessageTime(msg.sentAt)}</span>
                        {isAttendant && <MessageStatus status={msg.status} />}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-2">
                <MessageCircle className="w-10 h-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Nenhuma mensagem ainda</p>
              </div>
            )}
            <div ref={messagesEndRef} />
            {showScrollDown && (
              <Button
                variant="secondary"
                size="icon"
                className="fixed bottom-24 right-8 rounded-full shadow-lg z-10"
                onClick={scrollToBottom}
                data-testid="button-scroll-down"
              >
                <ArrowDown className="w-4 h-4" />
              </Button>
            )}
          </div>

          <div className="border-t p-3 bg-background">
            <div className="flex items-end gap-2">
              <Textarea
                placeholder="Digite uma mensagem..."
                className="resize-none flex-1 min-h-[2.5rem] max-h-32"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                data-testid="input-message"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!messageInput.trim() || sendMessageMutation.isPending}
                data-testid="button-send-message"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Enter para enviar, Shift+Enter para quebra de linha</p>
          </div>
        </div>

        <div className={`border-l bg-background flex-shrink-0 transition-all duration-300 overflow-hidden ${rightPanelOpen ? "w-72" : "w-0"}`}>
          {rightPanelOpen && (
            <div className="w-72 overflow-y-auto h-full">
              <div className="p-4 text-center border-b">
                <Avatar className="w-16 h-16 mx-auto mb-3">
                  <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
                    {selectedConv.clientName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <p className="text-base font-semibold" data-testid="text-panel-client-name">{selectedConv.clientName}</p>
                <div className="flex items-center justify-center gap-1.5 mt-1">
                  <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{selectedConv.clientPhone}</span>
                </div>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Informações</p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={statusConfig[selectedConv.status]?.variant || "secondary"}>
                        {statusConfig[selectedConv.status]?.label}
                      </Badge>
                    </div>
                    {selectedConv.attendantName && (
                      <div className="flex items-center gap-2 text-sm">
                        <UserPlus className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>Atendente: {selectedConv.attendantName}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>Início: {new Date(selectedConv.startedAt).toLocaleString("pt-BR")}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Transferir Conversa</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Atendente</Label>
                <Select value={transferAttendantId} onValueChange={setTransferAttendantId}>
                  <SelectTrigger data-testid="select-transfer-attendant">
                    <SelectValue placeholder="Selecione o atendente" />
                  </SelectTrigger>
                  <SelectContent>
                    {attendantsData?.filter(a => a.status === "online").map((att) => (
                      <SelectItem key={att.id} value={att.id}>{att.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Motivo (opcional)</Label>
                <Textarea
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  placeholder="Motivo da transferência..."
                  data-testid="input-transfer-reason"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setTransferDialogOpen(false)} data-testid="button-cancel-transfer">Cancelar</Button>
                <Button onClick={handleTransfer} disabled={!transferAttendantId} data-testid="button-confirm-transfer">Transferir</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={finalizeDialogOpen} onOpenChange={setFinalizeDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Finalizar Conversa</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Motivo</Label>
                <Select value={finalizeReason} onValueChange={setFinalizeReason}>
                  <SelectTrigger data-testid="select-finalize-reason">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="atendido">Atendido</SelectItem>
                    <SelectItem value="sem_interesse">Sem interesse</SelectItem>
                    <SelectItem value="nao_respondeu">Não respondeu</SelectItem>
                    <SelectItem value="outros">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Observações (opcional)</Label>
                <Textarea
                  value={finalizeNotes}
                  onChange={(e) => setFinalizeNotes(e.target.value)}
                  placeholder="Observações sobre o atendimento..."
                  data-testid="input-finalize-notes"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setFinalizeDialogOpen(false)} data-testid="button-cancel-finalize">Cancelar</Button>
                <Button onClick={handleFinalize} data-testid="button-confirm-finalize">Finalizar</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

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
              <Card
                key={conv.id}
                className="hover-elevate transition-all duration-200 cursor-pointer"
                onClick={() => setSelectedConvId(conv.id)}
                data-testid={`card-conversation-${conv.id}`}
              >
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
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {(conv.unreadCount ?? 0) > 0 && (
                            <Badge variant="default" className="text-xs min-w-5 justify-center">{conv.unreadCount}</Badge>
                          )}
                          <Badge variant={st.variant} className="text-xs" data-testid={`badge-status-${conv.id}`}>{st.label}</Badge>
                        </div>
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
