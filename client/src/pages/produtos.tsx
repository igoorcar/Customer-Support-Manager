import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Search, Plus, Package, Tag } from "lucide-react";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Product } from "@shared/schema";

const productCategories = [
  { value: "armacoes", label: "Armações" },
  { value: "lentes", label: "Lentes" },
  { value: "solar", label: "Óculos de Sol" },
  { value: "acessorios", label: "Acessórios" },
  { value: "limpeza", label: "Limpeza" },
];

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

export default function Produtos() {
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    category: "armacoes",
    stock: "",
  });
  const { toast } = useToast();

  const { data: products, isLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await apiRequest("POST", "/api/products", {
        name: data.name,
        description: data.description || null,
        price: Math.round(parseFloat(data.price) * 100),
        category: data.category,
        stock: parseInt(data.stock) || 0,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setDialogOpen(false);
      setFormData({ name: "", description: "", price: "", category: "armacoes", stock: "" });
      toast({ title: "Produto cadastrado com sucesso" });
    },
    onError: () => {
      toast({ title: "Erro ao cadastrar produto", variant: "destructive" });
    },
  });

  const filtered = products?.filter((p) =>
    !searchTerm ||
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold" data-testid="text-produtos-title">Produtos</h1>
          <p className="text-sm text-muted-foreground">Catálogo de produtos da ótica</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-product">
              <Plus className="w-4 h-4 mr-1.5" /> Novo Produto
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cadastrar Produto</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate(formData);
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nome do produto"
                  data-testid="input-product-name"
                />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descrição do produto..."
                  data-testid="input-product-description"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Preço (R$) *</Label>
                  <Input
                    required
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="0,00"
                    data-testid="input-product-price"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Estoque</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    placeholder="0"
                    data-testid="input-product-stock"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select
                  value={formData.category}
                  onValueChange={(v) => setFormData({ ...formData, category: v })}
                >
                  <SelectTrigger data-testid="select-product-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {productCategories.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-submit-product">
                {createMutation.isPending ? "Salvando..." : "Cadastrar Produto"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar produtos..."
          className="pl-9"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          data-testid="input-search-products"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-full" />
                <div className="flex justify-between">
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : filtered && filtered.length > 0 ? (
          filtered.map((product) => {
            const cat = productCategories.find((c) => c.value === product.category);
            return (
              <Card key={product.id} className="hover-elevate transition-all duration-200" data-testid={`card-product-${product.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center justify-center w-10 h-10 rounded-md bg-chart-4/10 flex-shrink-0">
                      <Package className="w-5 h-5 text-chart-4" />
                    </div>
                    <Badge variant="secondary" className="text-xs flex-shrink-0">{cat?.label || product.category}</Badge>
                  </div>
                  <div className="mt-3">
                    <p className="text-sm font-semibold">{product.name}</p>
                    {product.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{product.description}</p>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-3">
                    <p className="text-base font-bold text-primary">{formatCurrency(product.price)}</p>
                    <div className="flex items-center gap-1">
                      <Tag className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {product.stock} em estoque
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card className="md:col-span-2 xl:col-span-3">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Package className="w-10 h-10 text-muted-foreground mb-3" />
              <p className="text-sm font-medium">Nenhum produto encontrado</p>
              <p className="text-xs text-muted-foreground mt-1">Cadastre produtos do catálogo da ótica</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
