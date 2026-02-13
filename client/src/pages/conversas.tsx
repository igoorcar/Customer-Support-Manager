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
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Search, Filter, MessageCircle, Send, ArrowLeft, Phone, Mail,
  UserPlus, Pause, CheckCircle, PanelRight, PanelRightClose,
  Check, Zap, Hand, Info, Package, Smile, ChevronDown, Clock, ArrowDown,
  Calendar, Image, Video, Music, FileText, Download, Play, Trash2,
  Plus, StickyNote, Receipt, Minus, ShoppingCart, ImageOff, AlertTriangle,
} from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { api } from "@/services/api";
import { supabase } from "@/lib/supabase";
import type { Conversa, Mensagem, BotaoResposta, BotaoMidia } from "@/lib/supabase";
import MessageInput from "@/components/message-input";
import { IAToggle } from "@/components/ia-toggle";
import { EtiquetasManager } from "@/components/etiquetas-manager";
import { AtendenteStatus } from "@/components/atendente-status";
import { useAuth } from "@/hooks/use-auth";

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

function getLastMessagePreview(msg?: { conteudo: string; tipo: string; direcao: string }) {
  if (!msg) return "";
  const prefix = msg.direcao === "enviada" ? "Voce: " : "";
  if (msg.tipo === "image") return `${prefix}Imagem`;
  if (msg.tipo === "video") return `${prefix}Video`;
  if (msg.tipo === "audio" || msg.tipo === "ptt") return `${prefix}Audio`;
  if (msg.tipo === "document") return `${prefix}Documento`;
  if (msg.tipo === "sticker") return `${prefix}Figurinha`;
  return `${prefix}${msg.conteudo || ""}`;
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

function ExpiredMediaPlaceholder({ type, text }: { type: string; text?: string | null }) {
  const icons: Record<string, typeof ImageOff> = {
    image: ImageOff,
    video: Video,
    audio: Music,
    document: FileText,
  };
  const Icon = icons[type] || AlertTriangle;
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 p-3 rounded-md bg-muted/50 border border-border/50">
        <Icon className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
        <span className="text-xs text-muted-foreground italic">
          {type === "image" ? "Imagem indisponível" :
           type === "video" ? "Vídeo indisponível" :
           type === "audio" ? "Áudio indisponível" :
           "Documento indisponível"}
        </span>
      </div>
      {text && <p className="text-sm whitespace-pre-wrap">{text}</p>}
    </div>
  );
}

function MediaContent({ msg }: { msg: Mensagem }) {
  const isAttendant = msg.direcao === "enviada";
  const mediaUrl = getMediaUrl(msg.midia_url);
  const [mediaError, setMediaError] = useState(false);

  if (!mediaUrl && (msg.tipo === "image" || msg.tipo === "video" || msg.tipo === "audio" || msg.tipo === "document")) {
    return <ExpiredMediaPlaceholder type={msg.tipo} text={msg.conteudo} />;
  }

  if (mediaError) {
    return <ExpiredMediaPlaceholder type={msg.tipo} text={msg.conteudo} />;
  }

  if (msg.tipo === "image" && mediaUrl) {
    return (
      <div className="space-y-1">
        <img
          src={mediaUrl}
          alt="Imagem"
          className="rounded-md max-w-full max-h-64 object-cover cursor-pointer"
          loading="lazy"
          data-testid={`media-image-${msg.id}`}
          onError={() => setMediaError(true)}
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
            onError={() => setMediaError(true)}
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
            onError={() => setMediaError(true)}
          />
        </div>
        {msg.conteudo && <p className="text-sm whitespace-pre-wrap">{msg.conteudo}</p>}
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
  const { user } = useAuth();
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
  const [quoteDialogOpen, setQuoteDialogOpen] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [quoteItems, setQuoteItems] = useState<Array<{ productId: string; productName: string; quantity: number; unitPrice: number }>>([]);
  const [quoteObservacoes, setQuoteObservacoes] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [productPickerSearch, setProductPickerSearch] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [atendenteId, setAtendenteId] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem("rightPanelOpen", String(rightPanelOpen));
  }, [rightPanelOpen]);

  useEffect(() => {
    if (!user) return;
    const fetchAtendenteId = async () => {
      const { data } = await supabase
        .from('atendentes')
        .select('id')
        .eq('email', user.username)
        .single();
      if (data) setAtendenteId(data.id);
    };
    fetchAtendenteId();
  }, [user]);

  const { data: conversations, isLoading } = useQuery<Conversa[]>({
    queryKey: ["supabase-conversas", activeFilter, atendenteId],
    queryFn: () => {
      if (!atendenteId) return api.getConversas('todas');
      if (activeFilter === "todas") return api.getConversas('todas', atendenteId);
      if (activeFilter === "nova") return api.getConversas('aguardando');
      if (activeFilter === "finalizada") return api.getConversas('finalizadas', atendenteId);
      return api.getConversas('ativas', atendenteId);
    },
    refetchInterval: 5000,
  });

  const conversaIds = conversations?.map(c => c.id) || [];
  const { data: ultimasMensagens } = useQuery<Record<string, { conteudo: string; tipo: string; direcao: string; enviada_em: string }>>({
    queryKey: ["ultimas-mensagens", conversaIds.join(",")],
    queryFn: () => api.getUltimasMensagens(conversaIds),
    enabled: conversaIds.length > 0,
    refetchInterval: 5000,
  });

  useEffect(() => {
    const channel = supabase
      .channel('conversas-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversas' },
        () => {
          queryClient.invalidateQueries({ queryKey: ["supabase-conversas"] });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const optimisticMsgsRef = useRef<Mensagem[]>([]);
  const realSentIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    optimisticMsgsRef.current = [];
    realSentIdsRef.current = new Set();
  }, [selectedConvId]);

  const { data: rawMensagens, isLoading: messagesLoading } = useQuery<Mensagem[]>({
    queryKey: ["supabase-mensagens", selectedConvId],
    queryFn: () => api.getMensagens(selectedConvId!),
    enabled: !!selectedConvId,
    refetchInterval: 3000,
  });

  useEffect(() => {
    if (!selectedConvId) return;

    const channel = supabase
      .channel(`mensagens-realtime-${selectedConvId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mensagens',
          filter: `conversa_id=eq.${selectedConvId}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["supabase-mensagens", selectedConvId] });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedConvId]);

  const mensagens = (() => {
    const real = rawMensagens || [];
    const currentRealSentIds = new Set(
      real.filter(r => r.direcao === "enviada").map(r => r.id)
    );

    const newRealIds = new Set<string>();
    currentRealSentIds.forEach(id => {
      if (!realSentIdsRef.current.has(id)) newRealIds.add(id);
    });

    let remaining = [...optimisticMsgsRef.current];
    if (newRealIds.size > 0) {
      const newRealMsgs = real.filter(r => newRealIds.has(r.id));
      for (const newMsg of newRealMsgs) {
        const matchIdx = remaining.findIndex(opt => opt.tipo === newMsg.tipo);
        if (matchIdx !== -1) {
          remaining.splice(matchIdx, 1);
        }
      }
    }

    remaining = remaining.filter(opt => {
      const age = Date.now() - new Date(opt.enviada_em).getTime();
      return age < 120000;
    });

    optimisticMsgsRef.current = remaining;
    realSentIdsRef.current = currentRealSentIds;

    const all = [...real, ...remaining];
    all.sort((a, b) => {
      const tA = new Date(a.created_at || a.enviada_em).getTime();
      const tB = new Date(b.created_at || b.enviada_em).getTime();
      return tA - tB;
    });
    return all;
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
  const clienteId = selectedConv?.clientes?.id;

  const { data: clientNotes, isLoading: notesLoading } = useQuery<any[]>({
    queryKey: ["/api/clients", clienteId, "notes"],
    queryFn: async () => {
      const res = await fetch(`/api/clients/${clienteId}/notes`, { credentials: "include" });
      if (!res.ok) throw new Error("Erro ao buscar notas");
      return res.json();
    },
    enabled: !!clienteId,
  });

  const addNoteMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest("POST", `/api/clients/${clienteId}/notes`, { content, author: "Atendente" });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clienteId, "notes"] });
      setNewNote("");
      toast({ title: "Nota adicionada" });
    },
    onError: () => {
      toast({ title: "Erro ao adicionar nota", variant: "destructive" });
    },
  });

  const { data: quotes, isLoading: quotesLoading } = useQuery<any[]>({
    queryKey: ["/api/quotes", selectedConvId],
    queryFn: async () => {
      const res = await fetch(`/api/quotes?conversaId=${selectedConvId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Erro ao buscar orçamentos");
      return res.json();
    },
    enabled: !!selectedConvId,
  });

  const { data: productsData } = useQuery<any[]>({
    queryKey: ["/api/products"],
    queryFn: async () => {
      const res = await fetch("/api/products", { credentials: "include" });
      if (!res.ok) throw new Error("Erro ao buscar produtos");
      return res.json();
    },
    enabled: quoteDialogOpen,
  });

  const createQuoteMutation = useMutation({
    mutationFn: async () => {
      if (!selectedConvId || !clienteId) throw new Error("Dados incompletos");
      const res = await apiRequest("POST", "/api/quotes", {
        conversaId: selectedConvId,
        clienteId,
        clienteNome: selectedConv?.clientes?.nome || "",
        observacoes: quoteObservacoes || null,
        items: quoteItems.map(item => ({
          quoteId: "",
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
      });
      return res.json();
    },
    onSuccess: (data: any) => {
      const savedItems = [...quoteItems];
      const clienteName = selectedConv?.clientes?.nome || "";

      queryClient.invalidateQueries({ queryKey: ["/api/quotes", selectedConvId] });
      setQuoteDialogOpen(false);
      setQuoteItems([]);
      setQuoteObservacoes("");
      setProductSearch("");
      toast({ title: "Orçamento criado" });

      const total = savedItems.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0);
      const itemsText = savedItems.map(item =>
        `${item.productName} - ${item.quantity}x R$ ${(item.unitPrice / 100).toFixed(2).replace(".", ",")}`
      ).join("\n");
      const message = `*ORÇAMENTO - Ótica Suellen*\n\nCliente: ${clienteName}\n\n${itemsText}\n\n*Total: R$ ${(total / 100).toFixed(2).replace(".", ",")}*`;

      if (confirm("Deseja enviar o orçamento por WhatsApp?")) {
        sendMessageMutation.mutate(message);
      }
    },
    onError: () => {
      toast({ title: "Erro ao criar orçamento", variant: "destructive" });
    },
  });

  const filteredProducts = productsData?.filter(p =>
    p.active !== false &&
    (productSearch ? p.name.toLowerCase().includes(productSearch.toLowerCase()) : true)
  ) || [];

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supabase-mensagens", selectedConvId] });
    },
    onError: () => {
      toast({ title: "Erro ao enviar mensagem", variant: "destructive" });
    },
  });

  const handleSendMedia = async (file: File, type: string, caption: string) => {
    if (!selectedConv) throw new Error("Nenhuma conversa selecionada");
    try {
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
      queryClient.invalidateQueries({ queryKey: ["supabase-mensagens", selectedConvId] });
    } catch {
      toast({ title: "Erro ao enviar mídia", variant: "destructive" });
    }
  };

  const handleSendProduct = async (product: import("@shared/schema").Product) => {
    if (!selectedConv) return;
    try {
      const price = product.promoPrice || product.price;
      const priceFormatted = `R$ ${(price / 100).toFixed(2).replace(".", ",")}`;
      const lines = [`*${product.name}*`];
      if (product.brand) lines.push(`Marca: ${product.brand}`);
      if (product.description) lines.push(`\n${product.description}`);
      lines.push(`\n*Preço: ${priceFormatted}*`);
      if (product.promoPrice && product.price > product.promoPrice) {
        lines.push(`~De: R$ ${(product.price / 100).toFixed(2).replace(".", ",")}~`);
      }
      if (product.material) lines.push(`Material: ${product.material}`);
      if (product.color) lines.push(`Cor: ${product.color}`);
      if (product.format) lines.push(`Formato: ${product.format}`);
      if (product.stock > 0) lines.push(`Estoque: ${product.stock} un.`);
      const text = lines.join("\n");

      let imageUrl = product.image;
      if (imageUrl && !imageUrl.includes('supabase')) {
        try {
          const imgResp = await fetch(imageUrl);
          const imgBlob = await imgResp.blob();
          const ext = imageUrl.split('.').pop()?.split('?')[0] || 'png';
          const fileName = `produtos/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
          const { error } = await supabase.storage
            .from('midias')
            .upload(fileName, imgBlob, {
              contentType: imgBlob.type || 'image/png',
              cacheControl: '3600',
              upsert: false,
            });
          if (!error) {
            const { data } = supabase.storage.from('midias').getPublicUrl(fileName);
            imageUrl = data.publicUrl;
          }
        } catch (e) {
          console.warn('Falha ao enviar imagem para Supabase Storage, enviando como texto:', e);
          imageUrl = null;
        }
      }

      if (imageUrl) {
        addOptimisticMessage(text, "image", imageUrl);
        await api.enviarMensagem(
          selectedConv.id,
          selectedConv.clientes.whatsapp,
          "image",
          text,
          imageUrl
        );
      } else {
        addOptimisticMessage(text, "text");
        await api.enviarMensagem(
          selectedConv.id,
          selectedConv.clientes.whatsapp,
          "text",
          text
        );
      }
      queryClient.invalidateQueries({ queryKey: ["supabase-mensagens", selectedConvId] });
      setProductPickerOpen(false);
      setProductPickerSearch("");
      toast({ title: "Produto enviado" });
    } catch {
      toast({ title: "Erro ao enviar produto", variant: "destructive" });
    }
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
              const lastMsg = ultimasMensagens?.[conv.id];
              const timeToShow = lastMsg?.enviada_em || conv.updated_at || conv.iniciada_em;
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
                      <span className="text-xs text-muted-foreground flex-shrink-0">{formatTime(timeToShow)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate" data-testid={`text-last-msg-${conv.id}`}>
                      {getLastMessagePreview(lastMsg) || conv.clientes?.whatsapp || ""}
                    </p>
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
              <Button variant="ghost" size="icon" onClick={() => { setProductPickerOpen(true); setProductPickerSearch(""); }} data-testid="button-send-product" title="Enviar Produto">
                <ShoppingCart className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setQuoteDialogOpen(true)} data-testid="button-quote">
                <Package className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setTransferDialogOpen(true)} data-testid="button-transfer">
                <UserPlus className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setFinalizeDialogOpen(true)} data-testid="button-finalize">
                <CheckCircle className="w-4 h-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={async () => {
                  if (confirm("Tem certeza que deseja apagar permanentemente esta conversa?")) {
                    try {
                      await api.deleteConversa(selectedConvId);
                      setSelectedConvId(null);
                      queryClient.invalidateQueries({ queryKey: ["supabase-conversas"] });
                      toast({ title: "Conversa apagada com sucesso" });
                    } catch (e) {
                      toast({ title: "Erro ao apagar conversa", variant: "destructive" });
                    }
                  }
                }} 
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                data-testid="button-delete-conversa"
              >
                <Trash2 className="w-4 h-4" />
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

          <div className="px-3 py-2 border-b space-y-2">
            <IAToggle conversaId={selectedConvId} />
            <EtiquetasManager conversaId={selectedConvId} />
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

                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Notas</p>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Textarea
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        placeholder="Adicionar nota..."
                        className="text-xs min-h-[60px]"
                        data-testid="input-new-note"
                      />
                    </div>
                    <Button
                      size="sm"
                      className="w-full"
                      disabled={!newNote.trim() || addNoteMutation.isPending}
                      onClick={() => newNote.trim() && addNoteMutation.mutate(newNote.trim())}
                      data-testid="button-add-note"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      {addNoteMutation.isPending ? "Salvando..." : "Adicionar Nota"}
                    </Button>
                    {notesLoading ? (
                      <Skeleton className="h-12 w-full" />
                    ) : clientNotes && clientNotes.length > 0 ? (
                      clientNotes.map((note: any) => (
                        <div key={note.id} className="border rounded-md p-2 space-y-1" data-testid={`note-${note.id}`}>
                          <p className="text-xs text-muted-foreground">
                            {new Date(note.createdAt).toLocaleDateString("pt-BR")} - {note.author}
                          </p>
                          <p className="text-sm">{note.content}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground italic">Nenhuma nota</p>
                    )}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Orçamentos</p>
                    <Button size="sm" variant="ghost" onClick={() => setQuoteDialogOpen(true)} data-testid="button-new-quote-panel">
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {quotesLoading ? (
                      <Skeleton className="h-12 w-full" />
                    ) : quotes && quotes.length > 0 ? (
                      quotes.map((quote: any) => {
                        const total = quote.items?.reduce((acc: number, item: any) => acc + item.quantity * item.unitPrice, 0) || 0;
                        const statusVariant = quote.status === "rascunho" ? "outline" : quote.status === "enviado" ? "default" : "secondary";
                        return (
                          <div key={quote.id} className="border rounded-md p-2 space-y-1" data-testid={`quote-${quote.id}`}>
                            <div className="flex items-center justify-between gap-1 flex-wrap">
                              <Badge variant={statusVariant} className="text-xs">
                                {quote.status}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {new Date(quote.createdAt).toLocaleDateString("pt-BR")}
                              </span>
                            </div>
                            <p className="text-sm font-semibold" data-testid={`quote-total-${quote.id}`}>
                              R$ {(total / 100).toFixed(2).replace(".", ",")}
                            </p>
                            {quote.items?.map((item: any) => (
                              <p key={item.id} className="text-xs text-muted-foreground">
                                {item.productName} - {item.quantity}x R$ {(item.unitPrice / 100).toFixed(2).replace(".", ",")}
                              </p>
                            ))}
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-xs text-muted-foreground italic">Nenhum orçamento</p>
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
              <DialogDescription>Selecione o atendente para transferir esta conversa</DialogDescription>
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
              <DialogDescription>Selecione o motivo para finalizar esta conversa</DialogDescription>
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

        <Dialog open={quoteDialogOpen} onOpenChange={(open) => {
          setQuoteDialogOpen(open);
          if (!open) {
            setQuoteItems([]);
            setQuoteObservacoes("");
            setProductSearch("");
          }
        }}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Novo Orçamento</DialogTitle>
              <DialogDescription>Adicione produtos e quantidades para criar um orçamento</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Buscar Produto</Label>
                <Input
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Buscar produto..."
                  data-testid="input-product-search"
                />
                {productSearch && filteredProducts.length > 0 && (
                  <div className="border rounded-md max-h-40 overflow-y-auto">
                    {filteredProducts.slice(0, 10).map((product: any) => (
                      <div
                        key={product.id}
                        className="flex items-center justify-between gap-2 p-2 hover-elevate cursor-pointer"
                        onClick={() => {
                          if (!quoteItems.find(i => i.productId === product.id)) {
                            setQuoteItems([...quoteItems, {
                              productId: product.id,
                              productName: product.name,
                              quantity: 1,
                              unitPrice: product.price,
                            }]);
                          }
                          setProductSearch("");
                        }}
                        data-testid={`product-option-${product.id}`}
                      >
                        <span className="text-sm truncate">{product.name}</span>
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          R$ {(product.price / 100).toFixed(2).replace(".", ",")}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {quoteItems.length > 0 && (
                <div className="space-y-2">
                  <Label>Itens do Orçamento</Label>
                  {quoteItems.map((item, index) => (
                    <div key={item.productId} className="flex items-center gap-2 border rounded-md p-2" data-testid={`quote-item-${item.productId}`}>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{item.productName}</p>
                        <p className="text-xs text-muted-foreground">
                          R$ {(item.unitPrice / 100).toFixed(2).replace(".", ",")} un.
                        </p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => {
                            const updated = [...quoteItems];
                            updated[index].quantity = Math.max(1, updated[index].quantity - 1);
                            setQuoteItems(updated);
                          }}
                          data-testid={`button-qty-minus-${item.productId}`}
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <Input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) => {
                            const updated = [...quoteItems];
                            updated[index].quantity = Math.max(1, parseInt(e.target.value) || 1);
                            setQuoteItems(updated);
                          }}
                          className="w-14 text-center"
                          data-testid={`input-qty-${item.productId}`}
                        />
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => {
                            const updated = [...quoteItems];
                            updated[index].quantity += 1;
                            setQuoteItems(updated);
                          }}
                          data-testid={`button-qty-plus-${item.productId}`}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                      <p className="text-sm font-medium flex-shrink-0 w-20 text-right" data-testid={`text-subtotal-${item.productId}`}>
                        R$ {((item.quantity * item.unitPrice) / 100).toFixed(2).replace(".", ",")}
                      </p>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setQuoteItems(quoteItems.filter((_, i) => i !== index))}
                        data-testid={`button-remove-item-${item.productId}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t">
                    <span className="text-sm font-semibold">Total:</span>
                    <span className="text-base font-bold" data-testid="text-quote-grand-total">
                      R$ {(quoteItems.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0) / 100).toFixed(2).replace(".", ",")}
                    </span>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Observações (opcional)</Label>
                <Textarea
                  value={quoteObservacoes}
                  onChange={(e) => setQuoteObservacoes(e.target.value)}
                  placeholder="Observações do orçamento..."
                  data-testid="input-quote-observacoes"
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setQuoteDialogOpen(false)} data-testid="button-cancel-quote">
                  Cancelar
                </Button>
                <Button
                  onClick={() => createQuoteMutation.mutate()}
                  disabled={quoteItems.length === 0 || createQuoteMutation.isPending}
                  data-testid="button-create-quote"
                >
                  <ShoppingCart className="w-4 h-4 mr-1" />
                  {createQuoteMutation.isPending ? "Criando..." : "Criar Orçamento"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={productPickerOpen} onOpenChange={(open) => {
          setProductPickerOpen(open);
          if (!open) setProductPickerSearch("");
        }}>
          <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>Enviar Produto</DialogTitle>
              <DialogDescription>Selecione um produto para enviar ao cliente</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 flex-1 overflow-hidden flex flex-col">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={productPickerSearch}
                  onChange={(e) => setProductPickerSearch(e.target.value)}
                  placeholder="Buscar produto..."
                  className="pl-9"
                  data-testid="input-product-picker-search"
                />
              </div>
              <div className="flex-1 overflow-y-auto space-y-2">
                {(productsData || [])
                  .filter(p => p.active !== false)
                  .filter(p => !productPickerSearch || p.name.toLowerCase().includes(productPickerSearch.toLowerCase()) || (p.brand && p.brand.toLowerCase().includes(productPickerSearch.toLowerCase())))
                  .map((product: any) => {
                    const price = product.promoPrice || product.price;
                    return (
                      <div
                        key={product.id}
                        className="flex items-center gap-3 p-2 rounded-md hover-elevate cursor-pointer border"
                        onClick={() => handleSendProduct(product)}
                        data-testid={`product-pick-${product.id}`}
                      >
                        {product.image ? (
                          <div className="w-12 h-12 rounded-md overflow-hidden bg-muted flex-shrink-0">
                            <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded-md bg-muted/50 flex items-center justify-center flex-shrink-0">
                            <Package className="w-5 h-5 text-muted-foreground/40" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{product.name}</p>
                          <div className="flex items-center gap-2">
                            {product.brand && <span className="text-xs text-muted-foreground">{product.brand}</span>}
                            <span className="text-xs font-semibold text-green-600">
                              R$ {(price / 100).toFixed(2).replace(".", ",")}
                            </span>
                          </div>
                        </div>
                        <Button size="sm" variant="outline" data-testid={`button-send-pick-${product.id}`}>
                          <Send className="w-3 h-3 mr-1" /> Enviar
                        </Button>
                      </div>
                    );
                  })}
                {(productsData || []).filter(p => p.active !== false).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">Nenhum produto cadastrado</p>
                )}
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

      {user && (
        <AtendenteStatus atendenteEmail={user.username} />
      )}

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
