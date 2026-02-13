import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  UserPlus, Pause, CheckCircle, PanelRight, PanelRightClose,
  Check, Zap, Hand, Info, Package, Smile, ChevronDown, Clock, ArrowDown,
  Calendar, Image, Video, Music, FileText, Download, Play,
} from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { queryClient } from "@/lib/queryClient";
import { api } from "@/services/api";
import type { Conversa, Mensagem, BotaoResposta, BotaoMidia } from "@/lib/supabase";
import MessageInput from "@/components/message-input";

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

function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
}

function MessageStatus({ status }: { status: string }) {
  if (status === "enviada") {
    return <Check className="w-3.5 h-3.5 text-muted-foreground" />;
  }
  if (status === "entregue") {
    return (
      <div className="flex -space-x-2">
        <Check className="w-3.5 h-3.5 text-muted-foreground" />
        <Check className="w-3.5 h-3.5 text-muted-foreground" />
      </div>
    );
  }
  if (status === "lida") {
    return (
      <div className="flex -space-x-2">
        <Check className="w-3.5 h-3.5 text-primary" />
        <Check className="w-3.5 h-3.5 text-primary" />
      </div>
    );
  }
  if (status === "falha") {
    return <span className="text-xs text-destructive">Falha</span>;
  }
  return null;
}

function getMediaUrl(url: string | null): string | null {
  if (!url) return null;
  if (url.startsWith("/") || url.includes("supabase.co") || url.includes(window.location.host)) {
    return url;
  }
  return `/api/media-proxy?url=${encodeURIComponent(url)}`;
}

function MediaContent({ msg }: { msg: Mensagem }) {
  const isAttendant = msg.direcao === "enviada";
  const mediaUrl = getMediaUrl(msg.midia_url);

  if (msg.tipo === "image" && mediaUrl) {
    return (
      <div className="space-y-1">
        <img
          src={mediaUrl}
          alt="Imagem"
          className="rounded-md max-w-full max-h-64 object-cover cursor-pointer"
          loading="lazy"
          data-testid={`media-image-${msg.id}`}
        />
        {msg.conteudo && <p className="text-sm whitespace-pre-wrap">{msg.conteudo}</p>}
      </div>
    );
  }

  if (msg.tipo === "video" && mediaUrl) {
    return (
      <div className="space-y-1">
        <div className="relative">
          <video
            src={mediaUrl}
            controls
            className="rounded-md max-w-full max-h-64"
            data-testid={`media-video-${msg.id}`}
          />
        </div>
        {msg.conteudo && <p className="text-sm whitespace-pre-wrap">{msg.conteudo}</p>}
      </div>
    );
  }

  if (msg.tipo === "audio" && mediaUrl) {
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-2 min-w-[200px]">
          <audio
            src={mediaUrl}
            controls
            preload="metadata"
            className="max-w-full w-full h-10"
            data-testid={`media-audio-${msg.id}`}
          />
        </div>
        {msg.conteudo && <p className="text-sm whitespace-pre-wrap">{msg.conteudo}</p>}
      </div>
    );
  }

  if (msg.tipo === "audio" && !msg.midia_url) {
    return (
      <div className="flex items-center gap-2 py-1">
        <Music className="w-4 h-4 flex-shrink-0" />
        <span className="text-sm italic">Áudio indisponível</span>
      </div>
    );
  }

  if (msg.tipo === "document" && mediaUrl) {
    return (
      <div className="space-y-1">
        <a
          href={mediaUrl || "#"}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex items-center gap-2 p-2 rounded-md border ${isAttendant ? "border-primary-foreground/20" : "border-border"}`}
          data-testid={`media-document-${msg.id}`}
        >
          <FileText className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm truncate">Documento</span>
          <Download className="w-4 h-4 flex-shrink-0" />
        </a>
        {msg.conteudo && <p className="text-sm whitespace-pre-wrap">{msg.conteudo}</p>}
      </div>
    );
  }

  return <p className="text-sm whitespace-pre-wrap">{msg.conteudo || ""}</p>;
}

function BotaoRespostaPanel({
  botoes,
  onEnviar,
  isPending,
}: {
  botoes: BotaoResposta[];
  onEnviar: (botao: BotaoResposta) => void;
  isPending: boolean;
}) {
  const [expandedBotao, setExpandedBotao] = useState<number | null>(null);
  const [midias, setMidias] = useState<Record<number, BotaoMidia[]>>({});

  const loadMidias = async (botaoId: number) => {
    if (midias[botaoId]) {
      setExpandedBotao(expandedBotao === botaoId ? null : botaoId);
      return;
    }
    try {
      const data = await api.getBotaoMidias(botaoId);
      setMidias(prev => ({ ...prev, [botaoId]: data }));
      setExpandedBotao(botaoId);
    } catch {
      setExpandedBotao(botaoId);
    }
  };

  if (!botoes.length) return null;

  return (
    <div className="space-y-1">
      {botoes.map((botao) => (
        <div key={botao.id}>
          <div className="flex items-center gap-2">
            <button
              className="flex-1 text-left p-2 rounded-md hover-elevate transition-colors"
              onClick={() => loadMidias(botao.id)}
              data-testid={`button-botao-preview-${botao.id}`}
            >
              <p className="text-sm font-medium truncate">{botao.label}</p>
              {botao.texto_mensagem && (
                <p className="text-xs text-muted-foreground truncate">{botao.texto_mensagem}</p>
              )}
            </button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onEnviar(botao)}
              disabled={isPending}
              data-testid={`button-enviar-botao-${botao.id}`}
            >
              <Send className="w-3.5 h-3.5" />
            </Button>
          </div>
          {expandedBotao === botao.id && (
            <div className="ml-4 pl-2 border-l space-y-1 py-1">
              {botao.texto_mensagem && (
                <p className="text-xs text-muted-foreground">{botao.texto_mensagem}</p>
              )}
              {midias[botao.id]?.map((m) => (
                <div key={m.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                  {m.tipo === "image" && <Image className="w-3 h-3" />}
                  {m.tipo === "video" && <Video className="w-3 h-3" />}
                  {m.tipo === "audio" && <Music className="w-3 h-3" />}
                  {m.tipo === "document" && <FileText className="w-3 h-3" />}
                  <span className="truncate">{m.nome_arquivo || m.tipo}</span>
                </div>
              ))}
              {(!midias[botao.id] || midias[botao.id].length === 0) && !botao.texto_mensagem && (
                <p className="text-xs text-muted-foreground italic">Sem conteúdo</p>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function Conversas() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("todas");
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
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
  const [sendingBotao, setSendingBotao] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    localStorage.setItem("rightPanelOpen", String(rightPanelOpen));
  }, [rightPanelOpen]);

  const { data: conversations, isLoading } = useQuery<Conversa[]>({
    queryKey: ["supabase-conversas", activeFilter],
    queryFn: () => api.getConversas(
      activeFilter === "todas" ? "todas" :
      activeFilter === "nova" ? "aguardando" :
      activeFilter === "finalizada" ? "finalizadas" : "ativas"
    ),
    refetchInterval: 10000,
  });

  const optimisticMsgsRef = useRef<Mensagem[]>([]);

  useEffect(() => {
    optimisticMsgsRef.current = [];
  }, [selectedConvId]);

  const { data: rawMensagens, isLoading: messagesLoading } = useQuery<Mensagem[]>({
    queryKey: ["supabase-mensagens", selectedConvId],
    queryFn: () => api.getMensagens(selectedConvId!),
    enabled: !!selectedConvId,
    refetchInterval: 2000,
  });

  const mensagens = (() => {
    const real = rawMensagens || [];
    if (optimisticMsgsRef.current.length === 0) return real;
    const realTimestamps = new Set(real.map(m => m.enviada_em?.slice(0, 16)));
    const realContents = new Set(real.map(m => m.conteudo));
    const pending = optimisticMsgsRef.current.filter(opt => {
      const optTime = opt.enviada_em?.slice(0, 16);
      if (opt.tipo === "text") {
        return !realContents.has(opt.conteudo) && !realTimestamps.has(optTime);
      }
      return !real.some(r =>
        r.direcao === "enviada" &&
        r.tipo === opt.tipo &&
        Math.abs(new Date(r.enviada_em).getTime() - new Date(opt.enviada_em).getTime()) < 30000
      );
    });
    optimisticMsgsRef.current = pending;
    return [...real, ...pending];
  })();

  const { data: botoes } = useQuery<BotaoResposta[]>({
    queryKey: ["supabase-botoes"],
    queryFn: () => api.getBotoes(),
  });

  const { data: atendentes } = useQuery({
    queryKey: ["supabase-atendentes"],
    queryFn: () => api.getAtendentes(),
  });

  const selectedConv = conversations?.find(c => c.id === selectedConvId);

  const addOptimisticMessage = (content: string, tipo: string, midiaUrl?: string) => {
    if (!selectedConvId) return;
    const optimistic: Mensagem = {
      id: `opt-${Date.now()}`,
      conversa_id: selectedConvId,
      whatsapp_message_id: null,
      direcao: "enviada",
      tipo: tipo as Mensagem["tipo"],
      conteudo: content || null,
      midia_url: midiaUrl || null,
      midia_mime_type: null,
      status: "enviada",
      enviada_em: new Date().toISOString(),
      entregue_em: null,
      lida_em: null,
      enviada_por: null,
      atendentes: null,
    };
    optimisticMsgsRef.current = [...optimisticMsgsRef.current, optimistic];
    queryClient.invalidateQueries({ queryKey: ["supabase-mensagens", selectedConvId] });
  };

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!selectedConv) throw new Error("Nenhuma conversa selecionada");
      addOptimisticMessage(content, "text");
      return api.enviarMensagem(
        selectedConv.id,
        selectedConv.clientes.whatsapp,
        "text",
        content
      );
    },
    onError: () => {
      toast({ title: "Erro ao enviar mensagem", variant: "destructive" });
    },
  });

  const handleSendMedia = async (file: File, type: string, caption: string) => {
    if (!selectedConv) throw new Error("Nenhuma conversa selecionada");
    const isAudio = type === "audio";
    const uploadResult = await api.uploadMidia(file, isAudio);
    addOptimisticMessage(caption, type, uploadResult.url);
    await api.enviarMensagem(
      selectedConv.id,
      selectedConv.clientes.whatsapp,
      type,
      caption || "",
      uploadResult.url
    );
  };

  const finalizeMutation = useMutation({
    mutationFn: async (motivo: string) => {
      if (!selectedConvId) throw new Error("Nenhuma conversa selecionada");
      return api.finalizarConversa(selectedConvId, motivo);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supabase-conversas"] });
      toast({ title: "Conversa finalizada" });
      setFinalizeDialogOpen(false);
      setFinalizeReason("atendido");
      setFinalizeNotes("");
    },
    onError: () => {
      toast({ title: "Erro ao finalizar conversa", variant: "destructive" });
    },
  });

  const transferMutation = useMutation({
    mutationFn: async () => {
      if (!selectedConvId || !transferAttendantId) throw new Error("Dados incompletos");
      return api.transferirConversa(
        selectedConvId,
        transferAttendantId,
        selectedConv?.atendentes?.id || "",
        transferReason
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supabase-conversas"] });
      toast({ title: "Conversa transferida" });
      setTransferDialogOpen(false);
      setTransferAttendantId("");
      setTransferReason("");
    },
    onError: () => {
      toast({ title: "Erro ao transferir conversa", variant: "destructive" });
    },
  });

  const handleEnviarBotao = async (botao: BotaoResposta) => {
    if (!selectedConv) return;
    setSendingBotao(true);
    try {
      await api.enviarBotao(
        botao.id,
        selectedConv.id,
        selectedConv.clientes.whatsapp,
        selectedConv.atendentes?.id || ""
      );
      queryClient.invalidateQueries({ queryKey: ["supabase-mensagens", selectedConvId] });
      toast({ title: `"${botao.label}" enviado` });
    } catch {
      toast({ title: "Erro ao enviar botão", variant: "destructive" });
    } finally {
      setSendingBotao(false);
    }
  };

  const handleSendMessage = (text: string) => {
    if (!text.trim() || !selectedConvId) return;
    sendMessageMutation.mutate(text.trim());
  };

  const handleFinalize = () => {
    finalizeMutation.mutate(finalizeReason);
  };

  const handleTransfer = () => {
    if (!transferAttendantId) return;
    transferMutation.mutate();
  };

  useEffect(() => {
    if (mensagens && mensagens.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [mensagens]);

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

  const filtered = (() => {
    const seen = new Set<string>();
    return conversations?.filter((c) => {
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      const clientName = c.clientes?.nome || "";
      const clientPhone = c.clientes?.whatsapp || "";
      const matchesSearch = !searchTerm ||
        clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        clientPhone.includes(searchTerm);
      const matchesFilter = activeFilter === "todas" || c.status === activeFilter;
      return matchesSearch && matchesFilter;
    });
  })();

  if (selectedConvId && selectedConv) {
    const clientName = selectedConv.clientes?.nome || "Cliente";
    const clientPhone = selectedConv.clientes?.whatsapp || "";
    const clientAvatar = selectedConv.clientes?.avatar_url;

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
              const name = conv.clientes?.nome || "Cliente";
              return (
                <div
                  key={conv.id}
                  className={`flex items-center gap-3 p-3 cursor-pointer border-b transition-colors ${isSelected ? "bg-accent" : "hover-elevate"}`}
                  onClick={() => setSelectedConvId(conv.id)}
                  data-testid={`sidebar-conv-${conv.id}`}
                >
                  <div className="relative flex-shrink-0">
                    <Avatar className="w-9 h-9">
                      {conv.clientes?.avatar_url && <AvatarImage src={conv.clientes.avatar_url} />}
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                        {getInitials(name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className={`absolute bottom-0 right-0 w-2 h-2 rounded-full ${st.dotColor} border-2 border-background`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-sm font-medium truncate">{name}</p>
                      <span className="text-xs text-muted-foreground flex-shrink-0">{formatTime(conv.iniciada_em)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{conv.clientes?.whatsapp || ""}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="hidden lg:flex flex-col w-56 border-r bg-background flex-shrink-0">
          <div className="p-3 border-b flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">Botões de Resposta</span>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {botoes && botoes.length > 0 ? (
              <BotaoRespostaPanel
                botoes={botoes}
                onEnviar={handleEnviarBotao}
                isPending={sendingBotao}
              />
            ) : (
              <p className="text-xs text-muted-foreground text-center py-4">Nenhum botão configurado</p>
            )}
          </div>
        </div>

        <div className="flex flex-col flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 p-3 border-b bg-background">
            <div className="flex items-center gap-3 min-w-0">
              <Button variant="ghost" size="icon" onClick={() => setSelectedConvId(null)} data-testid="button-back-to-list">
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <Avatar className="w-8 h-8 flex-shrink-0">
                {clientAvatar && <AvatarImage src={clientAvatar} />}
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                  {getInitials(clientName)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate" data-testid="text-chat-client-name">{clientName}</p>
                <p className="text-xs text-muted-foreground">{clientPhone}</p>
              </div>
              <Badge variant={statusConfig[selectedConv.status]?.variant || "secondary"} className="flex-shrink-0" data-testid="badge-chat-status">
                {statusConfig[selectedConv.status]?.label || selectedConv.status}
              </Badge>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <Button variant="ghost" size="icon" onClick={() => setTransferDialogOpen(true)} data-testid="button-transfer">
                <UserPlus className="w-4 h-4" />
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
            ) : mensagens && mensagens.length > 0 ? (
              mensagens.map((msg) => {
                const isAttendant = msg.direcao === "enviada";
                return (
                  <div key={msg.id} className={`flex ${isAttendant ? "justify-end" : "justify-start"}`} data-testid={`message-${msg.id}`}>
                    <div className={`max-w-[70%] rounded-lg px-3 py-2 ${isAttendant ? "bg-primary text-primary-foreground" : "bg-card border"}`}>
                      {msg.atendentes && isAttendant && (
                        <p className={`text-xs mb-1 font-medium ${isAttendant ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                          {msg.atendentes.nome}
                        </p>
                      )}
                      <MediaContent msg={msg} />
                      <div className={`flex items-center justify-end gap-1 mt-1 ${isAttendant ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                        <span className="text-xs">{formatMessageTime(msg.enviada_em)}</span>
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

          <MessageInput
            onSendMessage={handleSendMessage}
            onSendMedia={handleSendMedia}
            disabled={selectedConv.status === "finalizada"}
            isPending={sendMessageMutation.isPending}
          />
        </div>

        <div className={`border-l bg-background flex-shrink-0 transition-all duration-300 overflow-hidden ${rightPanelOpen ? "w-72" : "w-0"}`}>
          {rightPanelOpen && (
            <div className="w-72 overflow-y-auto h-full">
              <div className="p-4 text-center border-b">
                <Avatar className="w-16 h-16 mx-auto mb-3">
                  {clientAvatar && <AvatarImage src={clientAvatar} />}
                  <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
                    {getInitials(clientName)}
                  </AvatarFallback>
                </Avatar>
                <p className="text-base font-semibold" data-testid="text-panel-client-name">{clientName}</p>
                <div className="flex items-center justify-center gap-1.5 mt-1">
                  <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{clientPhone}</span>
                </div>
                {selectedConv.clientes?.email && (
                  <div className="flex items-center justify-center gap-1.5 mt-1">
                    <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{selectedConv.clientes.email}</span>
                  </div>
                )}
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
                    {selectedConv.atendentes && (
                      <div className="flex items-center gap-2 text-sm">
                        <UserPlus className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>Atendente: {selectedConv.atendentes.nome}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>Início: {new Date(selectedConv.iniciada_em).toLocaleString("pt-BR")}</span>
                    </div>
                    {selectedConv.canal && (
                      <div className="flex items-center gap-2 text-sm">
                        <MessageCircle className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>Canal: {selectedConv.canal}</span>
                      </div>
                    )}
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
                    {atendentes?.map((att: any) => (
                      <SelectItem key={att.id} value={att.id}>{att.nome}</SelectItem>
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
                <Button onClick={handleTransfer} disabled={!transferAttendantId || transferMutation.isPending} data-testid="button-confirm-transfer">
                  {transferMutation.isPending ? "Transferindo..." : "Transferir"}
                </Button>
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
                <Button onClick={handleFinalize} disabled={finalizeMutation.isPending} data-testid="button-confirm-finalize">
                  {finalizeMutation.isPending ? "Finalizando..." : "Finalizar"}
                </Button>
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
            const name = conv.clientes?.nome || "Cliente";
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
                        {conv.clientes?.avatar_url && <AvatarImage src={conv.clientes.avatar_url} />}
                        <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                          {getInitials(name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ${st.dotColor} border-2 border-card`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold truncate">{name}</p>
                        <span className="text-xs text-muted-foreground flex-shrink-0">{formatTime(conv.iniciada_em)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-0.5">
                        <p className="text-xs text-muted-foreground truncate">
                          {conv.clientes?.whatsapp || "Sem telefone"}
                        </p>
                        <Badge variant={st.variant} className="text-xs flex-shrink-0" data-testid={`badge-status-${conv.id}`}>{st.label}</Badge>
                      </div>
                      {conv.atendentes && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Atendente: {conv.atendentes.nome}
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
              <p className="text-xs text-muted-foreground mt-1">
                {isLoading ? "Carregando..." : "As conversas do WhatsApp aparecerão aqui"}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
