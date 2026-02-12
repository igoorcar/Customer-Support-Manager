import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import {
  Search, Plus, Package, Grid3X3, List, Edit, Trash2,
  AlertTriangle, CheckCircle, Eye, ChevronLeft, ChevronRight,
  ShoppingCart, TrendingUp, Archive, X,
} from "lucide-react";
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

const genderOptions = [
  { value: "masculino", label: "Masculino" },
  { value: "feminino", label: "Feminino" },
  { value: "unissex", label: "Unissex" },
  { value: "infantil", label: "Infantil" },
];

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

function getCategoryLabel(value: string) {
  return productCategories.find((c) => c.value === value)?.label || value;
}

function getGenderLabel(value: string | null) {
  if (!value) return null;
  return genderOptions.find((g) => g.value === value)?.label || value;
}

function getStockColor(stock: number, stockAlert: number | null) {
  const alert = stockAlert ?? 10;
  if (stock <= alert) return "text-red-500";
  if (stock <= alert * 2) return "text-yellow-500";
  return "text-green-500";
}

function getStockBgColor(stock: number, stockAlert: number | null) {
  const alert = stockAlert ?? 10;
  if (stock <= alert) return "bg-red-500/10";
  if (stock <= alert * 2) return "bg-yellow-500/10";
  return "bg-green-500/10";
}

const ITEMS_PER_PAGE = 12;

const emptyForm = {
  name: "",
  sku: "",
  brand: "",
  description: "",
  price: "",
  promoPrice: "",
  costPrice: "",
  category: "armacoes",
  stock: "",
  stockAlert: "10",
  format: "",
  material: "",
  color: "",
  gender: "",
  active: true,
};

export default function Produtos() {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("todos");
  const [brandFilter, setBrandFilter] = useState("todos");
  const [genderFilter, setGenderFilter] = useState("todos");
  const [activeFilter, setActiveFilter] = useState<"todos" | "ativo" | "inativo">("todos");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [page, setPage] = useState(1);

  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({ ...emptyForm });

  const { toast } = useToast();

  const { data: products, isLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const body: Record<string, unknown> = {
        name: data.name,
        sku: data.sku || null,
        brand: data.brand || null,
        description: data.description || null,
        price: Math.round(parseFloat(data.price) * 100),
        promoPrice: data.promoPrice ? Math.round(parseFloat(data.promoPrice) * 100) : null,
        costPrice: data.costPrice ? Math.round(parseFloat(data.costPrice) * 100) : null,
        category: data.category,
        stock: parseInt(data.stock) || 0,
        stockAlert: parseInt(data.stockAlert) || 10,
        format: data.format || null,
        material: data.material || null,
        color: data.color || null,
        gender: data.gender || null,
        active: data.active,
      };
      const res = await apiRequest("POST", "/api/products", body);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      closeFormDialog();
      toast({ title: "Produto cadastrado com sucesso" });
    },
    onError: () => {
      toast({ title: "Erro ao cadastrar produto", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const body: Record<string, unknown> = {
        name: data.name,
        sku: data.sku || null,
        brand: data.brand || null,
        description: data.description || null,
        price: Math.round(parseFloat(data.price) * 100),
        promoPrice: data.promoPrice ? Math.round(parseFloat(data.promoPrice) * 100) : null,
        costPrice: data.costPrice ? Math.round(parseFloat(data.costPrice) * 100) : null,
        category: data.category,
        stock: parseInt(data.stock) || 0,
        stockAlert: parseInt(data.stockAlert) || 10,
        format: data.format || null,
        material: data.material || null,
        color: data.color || null,
        gender: data.gender || null,
        active: data.active,
      };
      const res = await apiRequest("PATCH", `/api/products/${id}`, body);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      closeFormDialog();
      toast({ title: "Produto atualizado com sucesso" });
    },
    onError: () => {
      toast({ title: "Erro ao atualizar produto", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/products/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setDeleteDialogOpen(false);
      setDetailDialogOpen(false);
      setSelectedProduct(null);
      toast({ title: "Produto removido com sucesso" });
    },
    onError: () => {
      toast({ title: "Erro ao remover produto", variant: "destructive" });
    },
  });

  function closeFormDialog() {
    setFormDialogOpen(false);
    setEditingProduct(null);
    setFormData({ ...emptyForm });
  }

  function openCreateDialog() {
    setEditingProduct(null);
    setFormData({ ...emptyForm });
    setFormDialogOpen(true);
  }

  function openEditDialog(product: Product) {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      sku: product.sku || "",
      brand: product.brand || "",
      description: product.description || "",
      price: (product.price / 100).toFixed(2),
      promoPrice: product.promoPrice ? (product.promoPrice / 100).toFixed(2) : "",
      costPrice: product.costPrice ? (product.costPrice / 100).toFixed(2) : "",
      category: product.category,
      stock: String(product.stock),
      stockAlert: String(product.stockAlert ?? 10),
      format: product.format || "",
      material: product.material || "",
      color: product.color || "",
      gender: product.gender || "",
      active: product.active ?? true,
    });
    setFormDialogOpen(true);
  }

  function openDetailDialog(product: Product) {
    setSelectedProduct(product);
    setDetailDialogOpen(true);
  }

  function openDeleteDialog(product: Product) {
    setSelectedProduct(product);
    setDeleteDialogOpen(true);
  }

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  }

  const allProducts = products || [];
  const brands = [...new Set(allProducts.map((p) => p.brand).filter(Boolean))] as string[];

  const filtered = allProducts.filter((p) => {
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const match = p.name.toLowerCase().includes(q) ||
        (p.sku && p.sku.toLowerCase().includes(q)) ||
        (p.brand && p.brand.toLowerCase().includes(q)) ||
        p.category.toLowerCase().includes(q);
      if (!match) return false;
    }
    if (categoryFilter !== "todos" && p.category !== categoryFilter) return false;
    if (brandFilter !== "todos" && p.brand !== brandFilter) return false;
    if (genderFilter !== "todos" && p.gender !== genderFilter) return false;
    if (activeFilter === "ativo" && !p.active) return false;
    if (activeFilter === "inativo" && p.active) return false;
    return true;
  });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paged = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const totalProducts = allProducts.length;
  const activeProducts = allProducts.filter((p) => p.active).length;
  const lowStockCount = allProducts.filter((p) => p.stock <= (p.stockAlert ?? 10)).length;
  const totalStockValue = allProducts.reduce((sum, p) => sum + p.price * p.stock, 0);

  const statsCards = [
    { label: "Total de Produtos", value: totalProducts, icon: Package, color: "text-primary" },
    { label: "Produtos Ativos", value: activeProducts, icon: CheckCircle, color: "text-green-500" },
    { label: "Estoque Baixo", value: lowStockCount, icon: AlertTriangle, color: "text-yellow-500" },
    { label: "Valor em Estoque", value: formatCurrency(totalStockValue), icon: TrendingUp, color: "text-chart-2" },
  ];

  const isMutating = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold" data-testid="text-produtos-title">Produtos</h1>
          <p className="text-sm text-muted-foreground">Catálogo de produtos da ótica</p>
        </div>
        <Button onClick={openCreateDialog} data-testid="button-add-product">
          <Plus className="w-4 h-4 mr-1.5" /> Novo Produto
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4 space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-6 w-16" /></CardContent></Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statsCards.map((stat) => (
            <Card key={stat.label}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <stat.icon className={`w-4 h-4 ${stat.color}`} />
                </div>
                <p className="text-xl font-bold mt-1" data-testid={`stat-${stat.label.toLowerCase().replace(/\s+/g, "-")}`}>{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="flex flex-col lg:flex-row items-start lg:items-center gap-3">
        <div className="relative flex-1 w-full lg:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, SKU, marca..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
            data-testid="input-search-products"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setPage(1); }}>
            <SelectTrigger className="w-36" data-testid="select-filter-category">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas Categorias</SelectItem>
              {productCategories.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={brandFilter} onValueChange={(v) => { setBrandFilter(v); setPage(1); }}>
            <SelectTrigger className="w-36" data-testid="select-filter-brand">
              <SelectValue placeholder="Marca" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas Marcas</SelectItem>
              {brands.map((b) => (
                <SelectItem key={b} value={b}>{b}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={genderFilter} onValueChange={(v) => { setGenderFilter(v); setPage(1); }}>
            <SelectTrigger className="w-32" data-testid="select-filter-gender">
              <SelectValue placeholder="Gênero" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {genderOptions.map((g) => (
                <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-1.5">
            {(["todos", "ativo", "inativo"] as const).map((f) => (
              <Button
                key={f}
                variant={activeFilter === f ? "default" : "outline"}
                size="sm"
                onClick={() => { setActiveFilter(f); setPage(1); }}
                data-testid={`button-filter-${f}`}
              >
                {f === "todos" ? "Todos" : f === "ativo" ? "Ativos" : "Inativos"}
              </Button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1 ml-auto">
          <Button
            variant={viewMode === "grid" ? "default" : "outline"}
            size="icon"
            onClick={() => setViewMode("grid")}
            data-testid="button-view-grid"
          >
            <Grid3X3 className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="icon"
            onClick={() => setViewMode("list")}
            data-testid="button-view-list"
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className={`grid gap-4 ${viewMode === "grid" ? "grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4" : "grid-cols-1"}`}>
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4 space-y-3"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-full" /><div className="flex justify-between gap-2"><Skeleton className="h-5 w-20" /><Skeleton className="h-5 w-16 rounded-full" /></div></CardContent></Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="w-10 h-10 text-muted-foreground mb-3" />
            <p className="text-sm font-medium">Nenhum produto encontrado</p>
            <p className="text-xs text-muted-foreground mt-1">Cadastre produtos do catálogo da ótica</p>
          </CardContent>
        </Card>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {paged.map((product) => (
            <Card
              key={product.id}
              className="hover-elevate transition-all duration-200 cursor-pointer relative"
              onClick={() => openDetailDialog(product)}
              data-testid={`card-product-${product.id}`}
            >
              {!product.active && (
                <div className="absolute top-2 right-2">
                  <Badge variant="outline" className="text-xs text-muted-foreground">Inativo</Badge>
                </div>
              )}
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center justify-center w-10 h-10 rounded-md bg-chart-4/10 flex-shrink-0">
                    <Package className="w-5 h-5 text-chart-4" />
                  </div>
                  <div className="flex items-center gap-1 flex-wrap justify-end">
                    <Badge variant="secondary" className="text-xs">{getCategoryLabel(product.category)}</Badge>
                    {product.brand && <Badge variant="outline" className="text-xs">{product.brand}</Badge>}
                  </div>
                </div>
                <div className="mt-3">
                  <p className="text-sm font-semibold truncate">{product.name}</p>
                  {product.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{product.description}</p>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2 mt-3">
                  <div>
                    {product.promoPrice ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-base font-bold text-green-600">{formatCurrency(product.promoPrice)}</span>
                        <span className="text-xs text-muted-foreground line-through">{formatCurrency(product.price)}</span>
                      </div>
                    ) : (
                      <p className="text-base font-bold">{formatCurrency(product.price)}</p>
                    )}
                  </div>
                  <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${getStockBgColor(product.stock, product.stockAlert)}`}>
                    <span className={`text-xs font-medium ${getStockColor(product.stock, product.stockAlert)}`}>
                      {product.stock} un.
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {product.gender && (
                    <span className="text-xs text-muted-foreground">{getGenderLabel(product.gender)}</span>
                  )}
                  {product.material && (
                    <span className="text-xs text-muted-foreground">{product.material}</span>
                  )}
                  {product.color && (
                    <span className="text-xs text-muted-foreground">{product.color}</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-medium text-muted-foreground">SKU</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Nome</th>
                  <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Marca</th>
                  <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Categoria</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Preço</th>
                  <th className="text-right p-3 font-medium text-muted-foreground hidden sm:table-cell">Estoque</th>
                  <th className="text-right p-3 font-medium text-muted-foreground hidden lg:table-cell">Vendidos</th>
                  <th className="text-center p-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((product) => (
                  <tr
                    key={product.id}
                    className="border-b last:border-0 hover-elevate cursor-pointer"
                    onClick={() => openDetailDialog(product)}
                    data-testid={`row-product-${product.id}`}
                  >
                    <td className="p-3 text-muted-foreground font-mono text-xs">{product.sku || "—"}</td>
                    <td className="p-3">
                      <p className="font-medium truncate max-w-48">{product.name}</p>
                    </td>
                    <td className="p-3 hidden md:table-cell">
                      {product.brand ? <Badge variant="outline" className="text-xs">{product.brand}</Badge> : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="p-3 hidden md:table-cell">
                      <Badge variant="secondary" className="text-xs">{getCategoryLabel(product.category)}</Badge>
                    </td>
                    <td className="p-3 text-right">
                      {product.promoPrice ? (
                        <div>
                          <span className="font-medium text-green-600">{formatCurrency(product.promoPrice)}</span>
                          <span className="text-xs text-muted-foreground line-through ml-1">{formatCurrency(product.price)}</span>
                        </div>
                      ) : (
                        <span className="font-medium">{formatCurrency(product.price)}</span>
                      )}
                    </td>
                    <td className="p-3 text-right hidden sm:table-cell">
                      <span className={`font-medium ${getStockColor(product.stock, product.stockAlert)}`}>{product.stock}</span>
                    </td>
                    <td className="p-3 text-right hidden lg:table-cell text-muted-foreground">{product.soldCount ?? 0}</td>
                    <td className="p-3 text-center">
                      <Badge variant={product.active ? "secondary" : "outline"} className="text-xs">
                        {product.active ? "Ativo" : "Inativo"}
                      </Badge>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => { e.stopPropagation(); openEditDialog(product); }}
                          data-testid={`button-edit-${product.id}`}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => { e.stopPropagation(); openDeleteDialog(product); }}
                          data-testid={`button-delete-${product.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {filtered.length > ITEMS_PER_PAGE && (
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            Mostrando {(page - 1) * ITEMS_PER_PAGE + 1}-{Math.min(page * ITEMS_PER_PAGE, filtered.length)} de {filtered.length}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              data-testid="button-page-prev"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (page <= 3) {
                pageNum = i + 1;
              } else if (page >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = page - 2 + i;
              }
              return (
                <Button
                  key={pageNum}
                  variant={page === pageNum ? "default" : "outline"}
                  size="icon"
                  onClick={() => setPage(pageNum)}
                  data-testid={`button-page-${pageNum}`}
                >
                  {pageNum}
                </Button>
              );
            })}
            <Button
              variant="outline"
              size="icon"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              data-testid="button-page-next"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      <Dialog open={formDialogOpen} onOpenChange={(open) => { if (!open) closeFormDialog(); else setFormDialogOpen(true); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProduct ? "Editar Produto" : "Cadastrar Produto"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2 col-span-2">
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
                <Label>SKU</Label>
                <Input
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  placeholder="SKU-001"
                  data-testid="input-product-sku"
                />
              </div>
              <div className="space-y-2">
                <Label>Marca</Label>
                <Input
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  placeholder="Ray-Ban"
                  data-testid="input-product-brand"
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Descrição</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descrição do produto..."
                  data-testid="input-product-description"
                />
              </div>
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
                <Label>Preço Promocional (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.promoPrice}
                  onChange={(e) => setFormData({ ...formData, promoPrice: e.target.value })}
                  placeholder="0,00"
                  data-testid="input-product-promo-price"
                />
              </div>
              <div className="space-y-2">
                <Label>Preço de Custo (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.costPrice}
                  onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                  placeholder="0,00"
                  data-testid="input-product-cost-price"
                />
              </div>
              <div className="space-y-2">
                <Label>Categoria *</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
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
              <div className="space-y-2">
                <Label>Alerta de Estoque</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.stockAlert}
                  onChange={(e) => setFormData({ ...formData, stockAlert: e.target.value })}
                  placeholder="10"
                  data-testid="input-product-stock-alert"
                />
              </div>
              <div className="space-y-2">
                <Label>Formato</Label>
                <Input
                  value={formData.format}
                  onChange={(e) => setFormData({ ...formData, format: e.target.value })}
                  placeholder="Retangular"
                  data-testid="input-product-format"
                />
              </div>
              <div className="space-y-2">
                <Label>Material</Label>
                <Input
                  value={formData.material}
                  onChange={(e) => setFormData({ ...formData, material: e.target.value })}
                  placeholder="Acetato"
                  data-testid="input-product-material"
                />
              </div>
              <div className="space-y-2">
                <Label>Cor</Label>
                <Input
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  placeholder="Preto"
                  data-testid="input-product-color"
                />
              </div>
              <div className="space-y-2">
                <Label>Gênero</Label>
                <Select value={formData.gender || "none"} onValueChange={(v) => setFormData({ ...formData, gender: v === "none" ? "" : v })}>
                  <SelectTrigger data-testid="select-product-gender">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {genderOptions.map((g) => (
                      <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 flex items-center justify-between gap-2 pt-2">
                <Label>Produto ativo</Label>
                <Switch
                  checked={formData.active}
                  onCheckedChange={(v) => setFormData({ ...formData, active: v })}
                  data-testid="switch-product-active"
                />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={isMutating} data-testid="button-submit-product">
              {isMutating ? "Salvando..." : editingProduct ? "Salvar Alterações" : "Cadastrar Produto"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {selectedProduct && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  {selectedProduct.name}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary">{getCategoryLabel(selectedProduct.category)}</Badge>
                  {selectedProduct.brand && <Badge variant="outline">{selectedProduct.brand}</Badge>}
                  <Badge variant={selectedProduct.active ? "secondary" : "outline"}>
                    {selectedProduct.active ? "Ativo" : "Inativo"}
                  </Badge>
                </div>

                {selectedProduct.description && (
                  <p className="text-sm text-muted-foreground">{selectedProduct.description}</p>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Preço</p>
                    {selectedProduct.promoPrice ? (
                      <div>
                        <p className="text-lg font-bold text-green-600">{formatCurrency(selectedProduct.promoPrice)}</p>
                        <p className="text-sm text-muted-foreground line-through">{formatCurrency(selectedProduct.price)}</p>
                      </div>
                    ) : (
                      <p className="text-lg font-bold">{formatCurrency(selectedProduct.price)}</p>
                    )}
                  </div>
                  {selectedProduct.costPrice && (
                    <div>
                      <p className="text-xs text-muted-foreground">Custo</p>
                      <p className="text-lg font-bold">{formatCurrency(selectedProduct.costPrice)}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-muted-foreground">Estoque</p>
                    <p className={`text-lg font-bold ${getStockColor(selectedProduct.stock, selectedProduct.stockAlert)}`}>
                      {selectedProduct.stock} un.
                    </p>
                    <p className="text-xs text-muted-foreground">Alerta: {selectedProduct.stockAlert ?? 10}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Vendidos</p>
                    <p className="text-lg font-bold">{selectedProduct.soldCount ?? 0}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                  {selectedProduct.sku && (
                    <div>
                      <p className="text-xs text-muted-foreground">SKU</p>
                      <p className="text-sm font-mono">{selectedProduct.sku}</p>
                    </div>
                  )}
                  {selectedProduct.gender && (
                    <div>
                      <p className="text-xs text-muted-foreground">Gênero</p>
                      <p className="text-sm">{getGenderLabel(selectedProduct.gender)}</p>
                    </div>
                  )}
                  {selectedProduct.format && (
                    <div>
                      <p className="text-xs text-muted-foreground">Formato</p>
                      <p className="text-sm">{selectedProduct.format}</p>
                    </div>
                  )}
                  {selectedProduct.material && (
                    <div>
                      <p className="text-xs text-muted-foreground">Material</p>
                      <p className="text-sm">{selectedProduct.material}</p>
                    </div>
                  )}
                  {selectedProduct.color && (
                    <div>
                      <p className="text-xs text-muted-foreground">Cor</p>
                      <p className="text-sm">{selectedProduct.color}</p>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-2 border-t">
                  <Button
                    className="flex-1"
                    onClick={() => { setDetailDialogOpen(false); openEditDialog(selectedProduct); }}
                    data-testid="button-detail-edit"
                  >
                    <Edit className="w-4 h-4 mr-1.5" /> Editar
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => openDeleteDialog(selectedProduct)}
                    data-testid="button-detail-delete"
                  >
                    <Trash2 className="w-4 h-4 mr-1.5" /> Excluir
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja excluir o produto <strong>{selectedProduct?.name}</strong>? Esta ação não pode ser desfeita.
          </p>
          <div className="flex items-center gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setDeleteDialogOpen(false)}
              data-testid="button-cancel-delete"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              disabled={deleteMutation.isPending}
              onClick={() => selectedProduct && deleteMutation.mutate(selectedProduct.id)}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}