import { Link, useLocation } from "wouter";
import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  MessageSquare,
  Users,
  Zap,
  Package,
  BarChart3,
  Settings,
  Glasses,
  Crosshair,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/services/api";

const menuItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Conversas", url: "/conversas", icon: MessageSquare, hasBadge: true },
  { title: "Clientes", url: "/clientes", icon: Users },
  { title: "Respostas Rápidas", url: "/respostas", icon: Zap },
  { title: "Produtos", url: "/produtos", icon: Package },
  { title: "Relatórios", url: "/relatorios", icon: BarChart3 },
  { title: "Follow-up 72h", url: "/followup", icon: Crosshair },
  { title: "Configurações", url: "/configuracoes", icon: Settings },
];

function playNotificationSound() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(660, ctx.currentTime + 0.15);
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
  } catch {}
}

function useNewLeadNotification() {
  const knownIdsRef = useRef<Set<string> | null>(null);
  const { toast } = useToast();

  const { data: novasConversas } = useQuery({
    queryKey: ["new-lead-check"],
    queryFn: () => api.getConversas("aguardando"),
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (!novasConversas) return;
    const currentIds = new Set(novasConversas.map(c => c.id));

    if (knownIdsRef.current === null) {
      knownIdsRef.current = currentIds;
      if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission();
      }
      return;
    }

    const newLeads = novasConversas.filter(c => !knownIdsRef.current!.has(c.id));
    if (newLeads.length > 0) {
      for (const lead of newLeads) {
        const clientName = lead.clientes?.nome || "Novo cliente";
        toast({
          title: "Novo Lead!",
          description: `${clientName} iniciou uma conversa`,
        });
      }

      playNotificationSound();

      if ("Notification" in window && Notification.permission === "granted") {
        const names = newLeads.map(l => l.clientes?.nome || "Novo cliente").join(", ");
        new Notification("Novo Lead - Ótica Suellen", {
          body: `${newLeads.length} nova${newLeads.length > 1 ? "s" : ""} conversa${newLeads.length > 1 ? "s" : ""}: ${names}`,
          icon: "/favicon.ico",
        });
      }
    }

    knownIdsRef.current = currentIds;
  }, [novasConversas, toast]);
}

export function AppSidebar() {
  const [location] = useLocation();

  const { data: stats } = useQuery({
    queryKey: ["sidebar-stats"],
    queryFn: () => api.getDashboardStats(),
    refetchInterval: 5000,
  });

  const activeConversations = (stats?.waiting || 0) + (stats?.active || 0);

  useNewLeadNotification();

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <Link href="/" className="flex items-center gap-2" data-testid="link-sidebar-logo">
          <div className="flex items-center justify-center w-9 h-9 rounded-md bg-primary text-primary-foreground">
            <Glasses className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-tight" data-testid="text-sidebar-brand">Ótica Suellen</span>
            <span className="text-xs text-muted-foreground" data-testid="text-sidebar-subtitle">Painel de Atendimento</span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive = location === item.url || (item.url !== "/" && location.startsWith(item.url));
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      <Link href={item.url} data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, "-")}`}>
                        <item.icon className="w-4 h-4" />
                        <span className="flex-1">{item.title}</span>
                        {item.hasBadge && activeConversations > 0 && (
                          <Badge variant="default" className="text-xs min-w-5 h-5 flex items-center justify-center" data-testid={`badge-${item.title.toLowerCase().replace(/\s+/g, "-")}`}>
                            {activeConversations}
                          </Badge>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <div className="flex items-center gap-3" data-testid="sidebar-user-info">
          <div className="relative">
            <Avatar className="w-9 h-9" data-testid="avatar-sidebar-user">
              <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                SU
              </AvatarFallback>
            </Avatar>
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-status-online border-2 border-sidebar" data-testid="status-sidebar-user" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-medium truncate" data-testid="text-sidebar-username">Suellen</span>
            <span className="text-xs text-muted-foreground" data-testid="text-sidebar-status">Online</span>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
