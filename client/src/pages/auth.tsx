import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Eye, EyeOff } from "lucide-react";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }
    if (!isLogin && password !== confirmPassword) {
      toast({ title: "As senhas não coincidem", variant: "destructive" });
      return;
    }
    if (password.length < 4) {
      toast({ title: "A senha deve ter pelo menos 4 caracteres", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      if (isLogin) {
        await login(username, password);
      } else {
        await register(username, password);
      }
    } catch (err: any) {
      const msg = err?.message?.includes("401")
        ? "Usuário ou senha incorretos"
        : err?.message?.includes("400")
        ? "Este nome de usuário já está em uso"
        : "Erro ao processar. Tente novamente.";
      toast({ title: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      <div className="hidden lg:flex lg:w-1/2 bg-foreground relative overflow-hidden">
        <div className="absolute inset-0 flex flex-col justify-between p-12">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-background rounded-lg flex items-center justify-center text-foreground font-bold text-xs">
              OS
            </div>
            <span className="text-background font-semibold text-sm">Ótica Suellen</span>
          </div>

          <div className="max-w-md">
            <h1 className="text-3xl font-semibold text-background mb-3 leading-tight">
              Painel de Atendimento
            </h1>
            <p className="text-background/60 text-base leading-relaxed mb-10">
              Gerencie conversas, clientes e vendas via WhatsApp em um único lugar.
            </p>
            <div className="space-y-4">
              {[
                "Automação com IA e controle manual",
                "Distribuição de leads entre atendentes",
                "Relatórios e follow-up de 72h",
                "Catálogo de produtos integrado",
              ].map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <div className="w-1 h-1 rounded-full bg-background/40 shrink-0" />
                  <span className="text-background/70 text-sm">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-background/30 text-xs">
            © 2025 Ótica Suellen — Todos os direitos reservados
          </p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-[360px]">
          <div className="lg:hidden flex items-center gap-2 mb-10">
            <div className="w-7 h-7 bg-foreground rounded-lg flex items-center justify-center text-background font-bold text-[10px]">
              OS
            </div>
            <span className="font-semibold text-sm">Ótica Suellen</span>
          </div>

          <div className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-1" data-testid="text-auth-title">
              {isLogin ? "Entrar na conta" : "Criar conta"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isLogin
                ? "Acesse o painel de atendimento"
                : "Preencha os dados para criar sua conta"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="username" className="text-sm font-medium">Usuário</Label>
              <Input
                id="username"
                type="text"
                placeholder="Nome de usuário"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                className="h-10"
                data-testid="input-username"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={isLogin ? "current-password" : "new-password"}
                  className="h-10 pr-10"
                  data-testid="input-password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                  data-testid="button-toggle-password"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {!isLogin && (
              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirmar Senha</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirme sua senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  className="h-10"
                  data-testid="input-confirm-password"
                />
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-10 font-medium mt-2"
              disabled={loading}
              data-testid="button-submit-auth"
            >
              {loading ? "Entrando..." : isLogin ? "Entrar" : "Criar Conta"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline"
              onClick={() => {
                setIsLogin(!isLogin);
                setConfirmPassword("");
              }}
              data-testid="button-toggle-auth-mode"
            >
              {isLogin
                ? "Não tem conta? Cadastre-se"
                : "Já tem conta? Faça login"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
