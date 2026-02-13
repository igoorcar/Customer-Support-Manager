import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Upload, X, Image, Video, Music, FileText, Eye, GripVertical, Loader2,
} from "lucide-react";
import { api } from "@/services/api";
import { useToast } from "@/hooks/use-toast";

type MidiaUpload = {
  id: string;
  tipo: "image" | "video" | "audio" | "document";
  file: File;
  url: string;
  preview?: string;
  uploading?: boolean;
  uploaded?: boolean;
  urlFinal?: string;
};

type Ordenacao = "texto_primeiro" | "midias_primeiro" | "caption_primeira_midia" | "intercalado";

function detectarTipoMidia(mimeType: string): "image" | "video" | "audio" | "document" {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  return "document";
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

const MidiaIcon = ({ tipo }: { tipo: string }) => {
  if (tipo === "image") return <Image className="w-4 h-4 text-chart-1" />;
  if (tipo === "video") return <Video className="w-4 h-4 text-chart-3" />;
  if (tipo === "audio") return <Music className="w-4 h-4 text-chart-2" />;
  return <FileText className="w-4 h-4 text-chart-4" />;
};

function PreviewPanel({
  textoMensagem,
  midias,
  ordenacao,
}: {
  textoMensagem: string;
  midias: MidiaUpload[];
  ordenacao: Ordenacao;
}) {
  const renderMidia = (midia: MidiaUpload, key: number) => (
    <div key={key} className="bg-[hsl(var(--chart-2)/0.15)] rounded-lg p-2 ml-auto max-w-[85%]">
      {midia.preview ? (
        <img src={midia.preview} alt="Preview" className="rounded-md max-h-32 w-full object-cover" />
      ) : (
        <div className="flex items-center gap-2 p-2">
          <MidiaIcon tipo={midia.tipo} />
          <span className="text-xs truncate">{midia.file.name}</span>
        </div>
      )}
    </div>
  );

  const renderTexto = () => {
    if (!textoMensagem) return null;
    return (
      <div className="bg-[hsl(var(--chart-2)/0.15)] rounded-lg p-3 ml-auto max-w-[85%]">
        <p className="text-sm whitespace-pre-wrap">{textoMensagem}</p>
        <p className="text-xs text-muted-foreground text-right mt-1">12:00</p>
      </div>
    );
  };

  return (
    <div className="space-y-2">
      {ordenacao === "texto_primeiro" && (
        <>
          {renderTexto()}
          {midias.map((m, i) => renderMidia(m, i))}
        </>
      )}
      {ordenacao === "midias_primeiro" && (
        <>
          {midias.map((m, i) => renderMidia(m, i))}
          {renderTexto()}
        </>
      )}
      {ordenacao === "caption_primeira_midia" && midias.length > 0 && (
        <>
          <div className="bg-[hsl(var(--chart-2)/0.15)] rounded-lg p-2 ml-auto max-w-[85%]">
            {midias[0].preview ? (
              <img src={midias[0].preview} alt="Preview" className="rounded-md max-h-32 w-full object-cover" />
            ) : (
              <div className="flex items-center gap-2 p-2">
                <MidiaIcon tipo={midias[0].tipo} />
                <span className="text-xs truncate">{midias[0].file.name}</span>
              </div>
            )}
            {textoMensagem && <p className="text-sm mt-2 whitespace-pre-wrap">{textoMensagem}</p>}
          </div>
          {midias.slice(1).map((m, i) => renderMidia(m, i + 1))}
        </>
      )}
      {ordenacao === "intercalado" && (
        <>
          {midias.length > 0 && renderMidia(midias[0], 0)}
          {renderTexto()}
          {midias.slice(1).map((m, i) => renderMidia(m, i + 1))}
        </>
      )}
      {!textoMensagem && midias.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">
          Adicione texto ou mídias para ver o preview
        </p>
      )}
    </div>
  );
}

export function CriarBotaoModal({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [label, setLabel] = useState("");
  const [textoMensagem, setTextoMensagem] = useState("");
  const [ordenacao, setOrdenacao] = useState<Ordenacao>("texto_primeiro");
  const [usarCaption, setUsarCaption] = useState(false);
  const [midias, setMidias] = useState<MidiaUpload[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const novasMidias: MidiaUpload[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const tipo = detectarTipoMidia(file.type);
      const midia: MidiaUpload = {
        id: Math.random().toString(36).slice(2),
        tipo,
        file,
        url: URL.createObjectURL(file),
        uploading: false,
        uploaded: false,
      };
      if (tipo === "image") {
        midia.preview = URL.createObjectURL(file);
      }
      novasMidias.push(midia);
    }
    setMidias(prev => [...prev, ...novasMidias]);
  };

  const removerMidia = (id: string) => {
    setMidias(prev => prev.filter(m => m.id !== id));
  };

  const moverMidia = (fromIndex: number, direction: "up" | "down") => {
    const toIndex = direction === "up" ? fromIndex - 1 : fromIndex + 1;
    if (toIndex < 0 || toIndex >= midias.length) return;
    const novasMidias = [...midias];
    const [removed] = novasMidias.splice(fromIndex, 1);
    novasMidias.splice(toIndex, 0, removed);
    setMidias(novasMidias);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const resetForm = () => {
    setLabel("");
    setTextoMensagem("");
    setOrdenacao("texto_primeiro");
    setUsarCaption(false);
    setMidias([]);
    setSalvando(false);
  };

  const salvarBotao = async () => {
    if (!label.trim()) {
      toast({ title: "Preencha o label do botão", variant: "destructive" });
      return;
    }
    setSalvando(true);
    try {
      const midiasComUrl = await Promise.all(
        midias.map(async (midia, index) => {
          const resultado = await api.uploadMidia(midia.file);
          return {
            tipo: midia.tipo,
            url: resultado.url,
            mimeType: resultado.mimeType,
            tamanho: resultado.tamanho,
            nomeArquivo: resultado.nomeArquivo,
            ordem: index,
          };
        })
      );

      await api.criarBotao({
        label,
        tipo: "customizado",
        textoMensagem: textoMensagem || null,
        ordenacao,
        usarCaption,
        midias: midiasComUrl,
      });

      toast({ title: "Botão criado com sucesso" });
      resetForm();
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao criar botão:", error);
      toast({ title: "Erro ao criar botão", variant: "destructive" });
    } finally {
      setSalvando(false);
    }
  };

  const ordenacaoOptions: { value: Ordenacao; title: string; desc: string }[] = [
    { value: "texto_primeiro", title: "Texto primeiro, depois mídias", desc: "Envia o texto, depois todas as mídias" },
    { value: "midias_primeiro", title: "Mídias primeiro, depois texto", desc: "Envia todas as mídias, depois o texto" },
    { value: "caption_primeira_midia", title: "Texto como legenda na primeira mídia", desc: "Primeira mídia com caption, resto sem texto" },
    { value: "intercalado", title: "Intercalado", desc: "1ª mídia -> texto -> demais mídias" },
  ];

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden p-0">
        <div className="flex h-full max-h-[90vh]">
          <div className="flex-1 overflow-y-auto p-6">
            <DialogHeader className="mb-6">
              <DialogTitle>Criar Botão de Resposta</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Label do Botão *</Label>
                <Input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Ex: Catálogo Óculos Esportivos"
                  maxLength={50}
                  data-testid="input-botao-label"
                />
                <p className="text-xs text-muted-foreground text-right">{label.length}/50</p>
              </div>

              <div className="space-y-2">
                <Label>Texto da Mensagem</Label>
                <Textarea
                  value={textoMensagem}
                  onChange={(e) => setTextoMensagem(e.target.value)}
                  placeholder="Digite o texto que será enviado..."
                  className="min-h-[80px]"
                  maxLength={1000}
                  data-testid="input-botao-texto"
                />
                <p className="text-xs text-muted-foreground text-right">{textoMensagem.length}/1000</p>
              </div>

              <div className="space-y-2">
                <Label>Mídias (Imagens, Vídeos, Áudios, Documentos)</Label>
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`relative border-2 border-dashed rounded-md p-6 flex flex-col items-center justify-center cursor-pointer transition-colors ${
                    isDragging ? "border-primary bg-primary/5" : "border-border"
                  }`}
                  data-testid="upload-drop-zone"
                >
                  <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground mb-1">
                    Clique para selecionar ou arraste arquivos
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Imagens, vídeos (max 16MB), áudios, PDFs, documentos
                  </p>
                  <input
                    type="file"
                    multiple
                    accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx"
                    onChange={(e) => handleFileSelect(e.target.files)}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    data-testid="input-file-upload"
                  />
                </div>

                {midias.length > 0 && (
                  <div className="space-y-2 mt-3">
                    {midias.map((midia, index) => (
                      <div
                        key={midia.id}
                        className="flex items-center gap-3 p-3 bg-muted/30 rounded-md border"
                        data-testid={`midia-item-${index}`}
                      >
                        <div className="flex flex-col gap-0.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5"
                            onClick={() => moverMidia(index, "up")}
                            disabled={index === 0}
                            data-testid={`button-move-up-${index}`}
                          >
                            <span className="text-xs">&#9650;</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5"
                            onClick={() => moverMidia(index, "down")}
                            disabled={index === midias.length - 1}
                            data-testid={`button-move-down-${index}`}
                          >
                            <span className="text-xs">&#9660;</span>
                          </Button>
                        </div>

                        <MidiaIcon tipo={midia.tipo} />

                        {midia.preview && (
                          <img
                            src={midia.preview}
                            alt="Preview"
                            className="w-10 h-10 object-cover rounded-md"
                          />
                        )}

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{midia.file.name}</p>
                          <p className="text-xs text-muted-foreground">{formatFileSize(midia.file.size)}</p>
                        </div>

                        <Badge variant="secondary" className="text-xs">#{index + 1}</Badge>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removerMidia(midia.id)}
                          data-testid={`button-remove-midia-${index}`}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {midias.length > 0 && (
                <div className="space-y-2">
                  <Label>Como enviar?</Label>
                  <div className="space-y-2">
                    {ordenacaoOptions.map((opt) => (
                      <label
                        key={opt.value}
                        className={`flex items-center gap-3 p-3 border rounded-md cursor-pointer transition-colors ${
                          ordenacao === opt.value ? "border-primary bg-primary/5" : "hover-elevate"
                        }`}
                        data-testid={`radio-ordenacao-${opt.value}`}
                      >
                        <input
                          type="radio"
                          name="ordenacao"
                          value={opt.value}
                          checked={ordenacao === opt.value}
                          onChange={(e) => setOrdenacao(e.target.value as Ordenacao)}
                          className="accent-primary"
                        />
                        <div>
                          <p className="text-sm font-medium">{opt.title}</p>
                          <p className="text-xs text-muted-foreground">{opt.desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Switch
                  checked={usarCaption}
                  onCheckedChange={setUsarCaption}
                  data-testid="switch-usar-caption"
                />
                <Label className="text-sm">Usar caption nas mídias</Label>
              </div>
            </div>

            <div className="flex gap-2 justify-end mt-6 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => { resetForm(); onOpenChange(false); }}
                disabled={salvando}
                data-testid="button-cancel-botao"
              >
                Cancelar
              </Button>
              <Button
                onClick={salvarBotao}
                disabled={salvando || !label.trim()}
                data-testid="button-save-botao"
              >
                {salvando ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Criar Botão"
                )}
              </Button>
            </div>
          </div>

          <div className="w-80 bg-muted/30 p-6 border-l overflow-y-auto hidden lg:block">
            <div className="flex items-center gap-2 mb-4">
              <Eye className="w-4 h-4" />
              <h3 className="text-sm font-semibold">Preview do Envio</h3>
            </div>
            <div className="bg-[hsl(var(--muted)/0.5)] rounded-lg p-4">
              <PreviewPanel
                textoMensagem={textoMensagem}
                midias={midias}
                ordenacao={ordenacao}
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
