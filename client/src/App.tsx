import { Switch, Route } from "wouter";
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
import AuthPage from "@/pages/auth";
import NotFound from "@/pages/not-found";

function PageWrapper({ children }: { children: React.ReactNode }) {
  return <div className="p-4 md:p-6">{children}</div>;
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
      <Route path="/configuracoes">{() => <PageWrapper><Configuracoes /></PageWrapper>}</Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function AuthenticatedApp() {
  const { user, isLoading, logout } = useAuth();

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
        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex items-center justify-between gap-2 p-3 border-b bg-background sticky top-0 z-50">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground" data-testid="text-logged-user">
                {user.username}
              </span>
              <button
                onClick={() => logout()}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                data-testid="button-logout"
              >
                Sair
              </button>
            </div>
          </header>
          <main className="flex-1 overflow-y-auto">
            <Router />
          </main>
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
