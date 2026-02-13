import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import {
  Paperclip, Send, Smile, Image, Video, Music, FileText,
  X, Mic, Pause, Play, Square, Loader2, CheckCircle,
} from "lucide-react";
import { useDropzone } from "react-dropzone";
import EmojiPicker, { EmojiClickData, Theme } from "emoji-picker-react";

type FilePreview = {
  file: File;
  id: string;
  preview: string | null;
  type: "image" | "video" | "audio" | "document";
  caption: string;
  uploading: boolean;
  progress: number;
  error: string | null;
};

type Props = {
  onSendMessage: (text: string) => void;
  onSendMedia: (file: File, type: string, caption: string) => Promise<void>;
  disabled?: boolean;
  isPending?: boolean;
};

const MAX_FILES = 10;
const MAX_SIZES: Record<string, number> = {
  image: 5 * 1024 * 1024,
  video: 16 * 1024 * 1024,
  audio: 16 * 1024 * 1024,
  document: 10 * 1024 * 1024,
};

function getFileType(file: File): "image" | "video" | "audio" | "document" {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  return "document";
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

export default function MessageInput({ onSendMessage, onSendMedia, disabled, isPending }: Props) {
  const [text, setText] = useState("");
  const [files, setFiles] = useState<FilePreview[]>([]);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingPaused, setRecordingPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [playingRecorded, setPlayingRecorded] = useState(false);
  const [sending, setSending] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { toast } = useToast();

  useEffect(() => {
    return () => {
      files.forEach(f => {
        if (f.preview) URL.revokeObjectURL(f.preview);
      });
      if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    };
  }, []);

  const adjustTextarea = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    const maxH = 5 * 24;
    ta.style.height = Math.min(ta.scrollHeight, maxH) + "px";
  }, []);

  useEffect(() => {
    adjustTextarea();
  }, [text, adjustTextarea]);

  const addFiles = useCallback((acceptedFiles: File[]) => {
    const newFiles: FilePreview[] = [];
    for (const file of acceptedFiles) {
      if (files.length + newFiles.length >= MAX_FILES) {
        toast({ title: `Máximo de ${MAX_FILES} arquivos por vez`, variant: "destructive" });
        break;
      }
      const fileType = getFileType(file);
      const maxSize = MAX_SIZES[fileType];
      if (file.size > maxSize) {
        toast({ title: `${file.name} excede o tamanho máximo (${formatFileSize(maxSize)})`, variant: "destructive" });
        continue;
      }
      let preview: string | null = null;
      if (fileType === "image" || fileType === "video") {
        preview = URL.createObjectURL(file);
      }
      newFiles.push({
        file,
        id: generateId(),
        preview,
        type: fileType,
        caption: "",
        uploading: false,
        progress: 0,
        error: null,
      });
    }
    setFiles(prev => [...prev, ...newFiles]);
    setAttachOpen(false);
  }, [files.length, toast]);

  const removeFile = (id: string) => {
    setFiles(prev => {
      const f = prev.find(x => x.id === id);
      if (f?.preview) URL.revokeObjectURL(f.preview);
      return prev.filter(x => x.id !== id);
    });
  };

  const updateCaption = (id: string, caption: string) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, caption } : f));
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: addFiles,
    noClick: true,
    noKeyboard: true,
    onDragEnter: () => setDragOver(true),
    onDragLeave: () => setDragOver(false),
    onDropAccepted: () => setDragOver(false),
    onDropRejected: () => setDragOver(false),
  });

  const openFilePicker = (accept: string) => {
    const input = fileInputRef.current;
    if (!input) return;
    input.accept = accept;
    input.click();
    setAttachOpen(false);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(Array.from(e.target.files));
    }
    e.target.value = "";
  };

  const onEmojiClick = (emojiData: EmojiClickData) => {
    const ta = textareaRef.current;
    if (ta) {
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const newText = text.slice(0, start) + emojiData.emoji + text.slice(end);
      setText(newText);
      setTimeout(() => {
        ta.selectionStart = ta.selectionEnd = start + emojiData.emoji.length;
        ta.focus();
      }, 0);
    } else {
      setText(prev => prev + emojiData.emoji);
    }
    setEmojiOpen(false);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        setRecordedBlob(blob);
        setRecordedUrl(url);
        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorderRef.current = mr;
      mr.start(100);
      setRecording(true);
      setRecordingPaused(false);
      setRecordingTime(0);
      setRecordedBlob(null);
      setRecordedUrl(null);

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 300) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } catch {
      toast({ title: "Microfone não disponível", description: "Verifique as permissões do navegador", variant: "destructive" });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setRecording(false);
    setRecordingPaused(false);
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current) {
      if (recordingPaused) {
        mediaRecorderRef.current.resume();
        timerRef.current = setInterval(() => {
          setRecordingTime(prev => prev + 1);
        }, 1000);
      } else {
        mediaRecorderRef.current.pause();
        if (timerRef.current) clearInterval(timerRef.current);
      }
      setRecordingPaused(!recordingPaused);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setRecording(false);
    setRecordingPaused(false);
    setRecordingTime(0);
    setRecordedBlob(null);
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    setRecordedUrl(null);
  };

  const sendRecordedAudio = async () => {
    if (!recordedBlob) return;
    setSending(true);
    try {
      const fileName = `audio_${Date.now()}.webm`;
      const file = new File([recordedBlob], fileName, { type: "audio/webm" });
      await onSendMedia(file, "audio", "");
      cancelRecording();
      toast({ title: "Áudio enviado" });
    } catch (error) {
      console.error("Erro ao enviar áudio:", error);
      toast({ title: "Erro ao enviar áudio", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const togglePlayRecorded = () => {
    if (!recordedUrl) return;
    if (playingRecorded && audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      setPlayingRecorded(false);
    } else {
      if (!audioPlayerRef.current) {
        audioPlayerRef.current = new Audio(recordedUrl);
        audioPlayerRef.current.onended = () => setPlayingRecorded(false);
      }
      audioPlayerRef.current.play();
      setPlayingRecorded(true);
    }
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const handleSend = async () => {
    if (sending || disabled || isPending) return;

    if (files.length > 0) {
      setSending(true);
      try {
        for (const fp of files) {
          setFiles(prev => prev.map(f => f.id === fp.id ? { ...f, uploading: true } : f));
          await onSendMedia(fp.file, fp.type, fp.caption || text);
          setFiles(prev => prev.map(f => f.id === fp.id ? { ...f, uploading: false, progress: 100 } : f));
        }
        setFiles([]);
        setText("");
        toast({ title: "Mensagem enviada" });
      } catch {
        toast({ title: "Erro ao enviar arquivos", variant: "destructive" });
      } finally {
        setSending(false);
      }
      return;
    }

    if (text.trim()) {
      onSendMessage(text.trim());
      setText("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === "Escape") {
      if (emojiOpen) setEmojiOpen(false);
      if (recording) cancelRecording();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    const pastedFiles: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith("image/")) {
        const file = items[i].getAsFile();
        if (file) pastedFiles.push(file);
      }
    }
    if (pastedFiles.length > 0) {
      e.preventDefault();
      addFiles(pastedFiles);
    }
  };

  const hasContent = text.trim().length > 0 || files.length > 0;
  const isDisabled = disabled || isPending || sending;

  if (recording && !recordedBlob) {
    return (
      <div className="border-t bg-background p-3">
        <div className="flex items-center gap-3 bg-card border rounded-lg p-3">
          <div className={`w-3 h-3 rounded-full bg-destructive ${recordingPaused ? "" : "animate-pulse"}`} />
          <div className="flex-1 flex items-center gap-3">
            <div className="flex-1 h-8 bg-muted rounded-md overflow-hidden relative">
              <div className="absolute inset-0 flex items-center justify-center gap-0.5">
                {Array.from({ length: 30 }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-1 bg-primary rounded-full transition-all duration-150 ${recordingPaused ? "h-1" : ""}`}
                    style={{
                      height: recordingPaused ? "4px" : `${Math.random() * 24 + 4}px`,
                      animationDelay: `${i * 50}ms`,
                    }}
                  />
                ))}
              </div>
            </div>
            <span className="text-sm font-mono text-muted-foreground min-w-[3rem]" data-testid="text-recording-timer">
              {formatTimer(recordingTime)}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={pauseRecording}
              data-testid="button-pause-recording"
            >
              {recordingPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={cancelRecording}
              data-testid="button-cancel-recording"
            >
              <X className="w-4 h-4" />
            </Button>
            <Button
              size="icon"
              onClick={stopRecording}
              data-testid="button-stop-recording"
            >
              <Square className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (recordedBlob && recordedUrl) {
    return (
      <div className="border-t bg-background p-3">
        <div className="flex items-center gap-3 bg-card border rounded-lg p-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={togglePlayRecorded}
            data-testid="button-play-recorded"
          >
            {playingRecorded ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </Button>
          <div className="flex-1">
            <div className="h-8 bg-muted rounded-md overflow-hidden relative">
              <div className="absolute inset-0 flex items-center justify-center gap-0.5">
                {Array.from({ length: 40 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-1 bg-primary/60 rounded-full"
                    style={{ height: `${Math.random() * 20 + 4}px` }}
                  />
                ))}
              </div>
            </div>
            <span className="text-xs text-muted-foreground mt-1">{formatTimer(recordingTime)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={cancelRecording}
              data-testid="button-discard-recording"
            >
              <X className="w-4 h-4" />
            </Button>
            <Button
              size="icon"
              onClick={sendRecordedAudio}
              disabled={sending}
              data-testid="button-send-recording"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border-t bg-background" {...getRootProps()}>
      <input {...getInputProps()} />
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        multiple
        onChange={handleFileInput}
        data-testid="input-file-hidden"
      />

      {(isDragActive || dragOver) && (
        <div className="absolute inset-0 z-50 bg-primary/10 border-2 border-dashed border-primary rounded-lg flex items-center justify-center">
          <div className="text-center">
            <Paperclip className="w-10 h-10 text-primary mx-auto mb-2" />
            <p className="text-sm font-medium text-primary">Solte aqui para anexar</p>
          </div>
        </div>
      )}

      {files.length > 0 && (
        <div className="px-3 pt-3 pb-1">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {files.map((fp) => (
              <div key={fp.id} className="relative flex-shrink-0 group" data-testid={`file-preview-${fp.id}`}>
                {fp.type === "image" && fp.preview ? (
                  <div className="relative">
                    <img
                      src={fp.preview}
                      alt={fp.file.name}
                      className="w-28 h-28 object-cover rounded-md border"
                    />
                    {fp.uploading && (
                      <div className="absolute inset-0 bg-background/60 rounded-md flex items-center justify-center">
                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                      </div>
                    )}
                    {fp.progress === 100 && (
                      <div className="absolute bottom-1 right-1">
                        <CheckCircle className="w-4 h-4 text-chart-2" />
                      </div>
                    )}
                  </div>
                ) : fp.type === "video" && fp.preview ? (
                  <div className="relative w-28 h-28 rounded-md border overflow-hidden">
                    <video src={fp.preview} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 flex items-center justify-center bg-background/30">
                      <Play className="w-6 h-6 text-foreground" />
                    </div>
                    {fp.uploading && (
                      <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-28 h-28 rounded-md border flex flex-col items-center justify-center gap-1 bg-card p-2">
                    {fp.type === "audio" ? (
                      <Music className="w-6 h-6 text-muted-foreground" />
                    ) : (
                      <FileText className="w-6 h-6 text-muted-foreground" />
                    )}
                    <p className="text-xs text-muted-foreground truncate w-full text-center">{fp.file.name}</p>
                    <p className="text-xs text-muted-foreground">{formatFileSize(fp.file.size)}</p>
                    {fp.uploading && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
                  </div>
                )}
                <button
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ visibility: "visible" }}
                  onClick={() => removeFile(fp.id)}
                  data-testid={`button-remove-file-${fp.id}`}
                >
                  <X className="w-3 h-3" />
                </button>
                {(fp.type === "image" || fp.type === "video") && (
                  <input
                    type="text"
                    placeholder="Legenda..."
                    className="w-28 mt-1 text-xs border rounded px-1.5 py-0.5 bg-background"
                    value={fp.caption}
                    onChange={(e) => updateCaption(fp.id, e.target.value)}
                    data-testid={`input-caption-${fp.id}`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="p-3 flex items-end gap-2">
        <Popover open={attachOpen} onOpenChange={setAttachOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              disabled={isDisabled}
              data-testid="button-attach"
            >
              <Paperclip className="w-4 h-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent side="top" align="start" className="w-auto p-2">
            <div className="grid grid-cols-2 gap-1">
              <button
                className="flex items-center gap-2 px-3 py-2 rounded-md hover-elevate text-sm transition-colors"
                onClick={() => openFilePicker("image/*,video/*")}
                data-testid="button-attach-photo"
              >
                <div className="w-8 h-8 rounded-full bg-chart-3/20 flex items-center justify-center">
                  <Image className="w-4 h-4 text-chart-3" />
                </div>
                <span>Foto/Vídeo</span>
              </button>
              <button
                className="flex items-center gap-2 px-3 py-2 rounded-md hover-elevate text-sm transition-colors"
                onClick={() => openFilePicker("audio/*")}
                data-testid="button-attach-audio"
              >
                <div className="w-8 h-8 rounded-full bg-chart-4/20 flex items-center justify-center">
                  <Music className="w-4 h-4 text-chart-4" />
                </div>
                <span>Áudio</span>
              </button>
              <button
                className="flex items-center gap-2 px-3 py-2 rounded-md hover-elevate text-sm transition-colors"
                onClick={() => openFilePicker(".pdf,.doc,.docx,.xls,.xlsx,.zip")}
                data-testid="button-attach-document"
              >
                <div className="w-8 h-8 rounded-full bg-chart-1/20 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-chart-1" />
                </div>
                <span>Documento</span>
              </button>
              <button
                className="flex items-center gap-2 px-3 py-2 rounded-md hover-elevate text-sm transition-colors"
                onClick={() => { setAttachOpen(false); startRecording(); }}
                data-testid="button-attach-record"
              >
                <div className="w-8 h-8 rounded-full bg-destructive/20 flex items-center justify-center">
                  <Mic className="w-4 h-4 text-destructive" />
                </div>
                <span>Gravar</span>
              </button>
            </div>
          </PopoverContent>
        </Popover>

        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            placeholder="Digite uma mensagem..."
            className="w-full resize-none rounded-lg border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 min-h-[2.5rem] max-h-[7.5rem] leading-6"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            disabled={isDisabled}
            rows={1}
            data-testid="input-message"
          />
        </div>

        <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              disabled={isDisabled}
              data-testid="button-emoji"
            >
              <Smile className="w-4 h-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent side="top" align="end" className="w-auto p-0 border-0">
            <EmojiPicker
              onEmojiClick={onEmojiClick}
              theme={Theme.AUTO}
              width={320}
              height={400}
              searchPlaceHolder="Buscar emoji..."
              lazyLoadEmojis
            />
          </PopoverContent>
        </Popover>

        {hasContent ? (
          <Button
            size="icon"
            onClick={handleSend}
            disabled={isDisabled || (!text.trim() && files.length === 0)}
            data-testid="button-send-message"
          >
            {sending || isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            onClick={startRecording}
            disabled={isDisabled}
            data-testid="button-start-recording"
          >
            <Mic className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
