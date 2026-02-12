import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  MessageSquare,
  Users,
  Zap,
  Package,
  BarChart3,
  Settings,
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

const menuItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Conversas", url: "/conversas", icon: MessageSquare, badge: 5 },
  { title: "Clientes", url: "/clientes", icon: Users },
  { title: "Respostas Rápidas", url: "/respostas", icon: Zap },
  { title: "Produtos", url: "/produtos", icon: Package },
  { title: "Relatórios", url: "/relatorios", icon: BarChart3 },
  { title: "Configurações", url: "/configuracoes", icon: Settings },
];

export function AppSidebar() {
  const [location] = useLocation();

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
                        {item.badge && (
                          <Badge variant="default" className="text-xs min-w-5 h-5 flex items-center justify-center" data-testid={`badge-${item.title.toLowerCase().replace(/\s+/g, "-")}`}>
                            {item.badge}
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
