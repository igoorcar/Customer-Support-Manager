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
  Crosshair,
  LogOut,
  Glasses,
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
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/services/api";

const menuItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Conversas", url: "/conversas", icon: MessageSquare, hasBadge: true },
  { title: "Clientes", url: "/clientes", icon: Users, adminOnly: true },
  { title: "Respostas Rápidas", url: "/respostas", icon: Zap },
  { title: "Produtos", url: "/produtos", icon: Package },
  { title: "Relatórios", url: "/relatorios", icon: BarChart3, adminOnly: true },
  { title: "Follow-up 72h", url: "/followup", icon: Crosshair, adminOnly: true },
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
          title: "Novo Lead",
          description: `${clientName} iniciou uma conversa`,
        });
      }
      playNotificationSound();
      if ("Notification" in window && Notification.permission === "granted") {
        const names = newLeads.map(l => l.clientes?.nome || "Novo cliente").join(", ");
        new Notification("Novo Lead — Ótica Suellen", {
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
  const { user, logout } = useAuth();
  const isAdmin = user?.role === "admin";
  const visibleMenuItems = menuItems.filter(item => !item.adminOnly || isAdmin);

  const { data: stats } = useQuery({
    queryKey: ["sidebar-stats"],
    queryFn: () => api.getDashboardStats(),
    refetchInterval: 5000,
  });

  const activeConversations = (stats?.waiting || 0) + (stats?.active || 0);
  useNewLeadNotification();

  const initials = (user?.username || "U").substring(0, 2).toUpperCase();

  return (
    <Sidebar>
      <SidebarHeader className="px-4 py-5">
        <Link href="/" className="flex items-center gap-3" data-testid="link-sidebar-logo">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-sidebar-primary/20 border border-sidebar-primary/30">
            <Glasses className="w-5 h-5 text-sidebar-primary" />
          </div>
          <div className="flex flex-col leading-none gap-1">
            <span className="text-[14px] font-bold tracking-tight text-sidebar-accent-foreground" data-testid="text-sidebar-brand">
              Ótica Suellen
            </span>
            <span className="text-[11px] text-sidebar-foreground/50" data-testid="text-sidebar-subtitle">
              Painel de Atendimento
            </span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-3 pb-3">
        <SidebarGroup className="gap-1">
          <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/35 px-2 mb-1">
            Menu
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {visibleMenuItems.map((item) => {
                const isActive = location === item.url || (item.url !== "/" && location.startsWith(item.url));
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                      className="h-9 rounded-lg text-[13px] font-medium"
                    >
                      <Link href={item.url} data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, "-")}`}>
                        <item.icon className="w-4 h-4 shrink-0" />
                        <span className="flex-1">{item.title}</span>
                        {item.hasBadge && activeConversations > 0 && (
                          <Badge
                            className="text-[10px] h-4 min-w-4 px-1.5 rounded-full font-semibold bg-sidebar-primary text-sidebar-primary-foreground border-0"
                            data-testid={`badge-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                          >
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

      <SidebarFooter className="px-3 py-3 border-t border-sidebar-border">
        <div className="flex items-center gap-2.5 px-2" data-testid="sidebar-user-info">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-sidebar-primary/20 text-sidebar-primary text-[11px] font-bold shrink-0 border border-sidebar-primary/20">
            {initials}
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-[12px] font-semibold truncate text-sidebar-accent-foreground" data-testid="text-sidebar-username">
              {user?.username || "Usuário"}
            </span>
            <span className="text-[11px] text-sidebar-foreground/50 capitalize" data-testid="text-sidebar-role">
              {user?.role === "admin" ? "Administrador" : "Atendente"}
            </span>
          </div>
          <button
            onClick={() => logout()}
            className="p-1.5 rounded-lg text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
            title="Sair"
            data-testid="button-logout-sidebar"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
