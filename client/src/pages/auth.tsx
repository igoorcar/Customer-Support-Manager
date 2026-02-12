import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Glasses, LogIn, UserPlus, Eye, EyeOff } from "lucide-react";

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
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-primary items-center justify-center p-12">
        <div className="max-w-md text-center text-primary-foreground">
          <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-primary-foreground/10 mx-auto mb-8">
            <Glasses className="w-10 h-10" />
          </div>
          <h1 className="text-3xl font-bold mb-4">Ótica Suellen</h1>
          <p className="text-lg opacity-90 mb-6">
            Painel de Atendimento ao Cliente via WhatsApp
          </p>
          <div className="space-y-3 text-sm opacity-80 text-left">
            <div className="flex items-center gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-foreground/60 flex-shrink-0" />
              <span>Gerencie todas as conversas em um só lugar</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-foreground/60 flex-shrink-0" />
              <span>Catálogo completo de produtos e clientes</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-foreground/60 flex-shrink-0" />
              <span>Relatórios e métricas em tempo real</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-foreground/60 flex-shrink-0" />
              <span>Respostas rápidas e automações</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-sm">
          <div className="flex items-center justify-center gap-2 mb-8 lg:hidden">
            <div className="flex items-center justify-center w-10 h-10 rounded-md bg-primary text-primary-foreground">
              <Glasses className="w-5 h-5" />
            </div>
            <span className="text-xl font-bold">Ótica Suellen</span>
          </div>

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg" data-testid="text-auth-title">
                {isLogin ? "Entrar no Painel" : "Criar Conta"}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {isLogin
                  ? "Acesse o painel de atendimento"
                  : "Crie sua conta para acessar o painel"}
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Usuário</Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="Digite seu usuário"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                    data-testid="input-username"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Digite sua senha"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete={isLogin ? "current-password" : "new-password"}
                      data-testid="input-password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0"
                      onClick={() => setShowPassword(!showPassword)}
                      data-testid="button-toggle-password"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
                {!isLogin && (
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Confirme sua senha"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                      data-testid="input-confirm-password"
                    />
                  </div>
                )}
                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading}
                  data-testid="button-submit-auth"
                >
                  {loading ? (
                    "Carregando..."
                  ) : isLogin ? (
                    <>
                      <LogIn className="w-4 h-4 mr-1.5" /> Entrar
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 mr-1.5" /> Criar Conta
                    </>
                  )}
                </Button>
              </form>

              <div className="mt-4 text-center">
                <button
                  type="button"
                  className="text-sm text-primary hover:underline"
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
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
