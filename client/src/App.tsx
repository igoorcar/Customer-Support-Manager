import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import Dashboard from "@/pages/dashboard";
import Conversas from "@/pages/conversas";
import Clientes from "@/pages/clientes";
import RespostasRapidas from "@/pages/respostas-rapidas";
import Produtos from "@/pages/produtos";
import Relatorios from "@/pages/relatorios";
import Configuracoes from "@/pages/configuracoes";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/conversas" component={Conversas} />
      <Route path="/clientes" component={Clientes} />
      <Route path="/respostas" component={RespostasRapidas} />
      <Route path="/produtos" component={Produtos} />
      <Route path="/relatorios" component={Relatorios} />
      <Route path="/configuracoes" component={Configuracoes} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SidebarProvider style={style as React.CSSProperties}>
          <div className="flex h-screen w-full">
            <AppSidebar />
            <div className="flex flex-col flex-1 min-w-0">
              <header className="flex items-center gap-2 p-3 border-b bg-background sticky top-0 z-50">
                <SidebarTrigger data-testid="button-sidebar-toggle" />
              </header>
              <main className="flex-1 overflow-y-auto p-4 md:p-6">
                <Router />
              </main>
            </div>
          </div>
        </SidebarProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
