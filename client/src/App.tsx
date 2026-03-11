import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";
import Dashboard from "@/pages/dashboard";
import Conversas from "@/pages/conversas";
import Clientes from "@/pages/clientes";
import RespostasRapidas from "@/pages/respostas-rapidas";
import Produtos from "@/pages/produtos";
import Relatorios from "@/pages/relatorios";
import Configuracoes from "@/pages/configuracoes";
import FollowUpAnalytics from "@/pages/followup-analytics";
import AuthPage from "@/pages/auth";
import NotFound from "@/pages/not-found";

function PageWrapper({ children }: { children: React.ReactNode }) {
  return <div className="p-5 md:p-6">{children}</div>;
}

const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/conversas": "Conversas",
  "/clientes": "Clientes",
  "/respostas": "Respostas Rápidas",
  "/produtos": "Produtos",
  "/relatorios": "Relatórios",
  "/followup": "Follow-up 72h",
  "/configuracoes": "Configurações",
};

function PageTitle() {
  const [location] = useLocation();
  const title = Object.entries(pageTitles).find(([path]) =>
    path === "/" ? location === "/" : location.startsWith(path)
  )?.[1] || "Painel";
  return <span className="text-sm font-semibold text-foreground">{title}</span>;
}

function Router() {
  return (
    <Switch>
      <Route path="/">{() => <PageWrapper><Dashboard /></PageWrapper>}</Route>
      <Route path="/conversas" component={Conversas} />
      <Route path="/clientes">{() => <PageWrapper><Clientes /></PageWrapper>}</Route>
      <Route path="/respostas">{() => <PageWrapper><RespostasRapidas /></PageWrapper>}</Route>
      <Route path="/produtos">{() => <PageWrapper><Produtos /></PageWrapper>}</Route>
      <Route path="/relatorios">{() => <PageWrapper><Relatorios /></PageWrapper>}</Route>
      <Route path="/followup">{() => <PageWrapper><FollowUpAnalytics /></PageWrapper>}</Route>
      <Route path="/configuracoes">{() => <PageWrapper><Configuracoes /></PageWrapper>}</Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function MainContent() {
  const [location] = useLocation();
  const isConversas = location.startsWith("/conversas");

  return (
    <main className={`flex-1 min-h-0 ${isConversas ? "overflow-hidden" : "overflow-y-auto"}`}>
      <Router />
    </main>
  );
}

function AuthenticatedApp() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="space-y-4 text-center">
          <Skeleton className="h-10 w-10 rounded-md mx-auto" />
          <Skeleton className="h-4 w-32 mx-auto" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 min-w-0 min-h-0 overflow-hidden">
          <header className="flex items-center gap-3 px-5 border-b bg-white flex-shrink-0 z-50 h-14 shadow-sm">
            <SidebarTrigger data-testid="button-sidebar-toggle" className="text-muted-foreground hover:text-foreground" />
            <div className="w-px h-5 bg-border" />
            <PageTitle />
          </header>
          <MainContent />
        </div>
      </div>
    </SidebarProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <AuthenticatedApp />
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
