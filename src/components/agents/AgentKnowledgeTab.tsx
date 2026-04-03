import { useEffect, useState, useRef } from "react";
import { BookOpen, Upload, FileText, Trash2, AlertCircle, CheckCircle2, Loader2, HardDrive, Info, Lock, Zap, File, FileSpreadsheet, FileType, Globe, Instagram, Hash } from "lucide-react";
import { extractFileText } from "@/lib/file-extractor";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale/pt-BR";

interface KBItem {
  id: string;
  source_name: string | null;
  source_type: string;
  content: string;
  created_at: string;
  chunk_index: number | null;
}

interface GroupedDoc {
  sourceName: string;
  sourceType: string;
  chunkCount: number;
  totalChars: number;
  latestDate: string;
  chunks: KBItem[];
}

const PLAN_LIMITS: Record<string, { maxDocs: number; maxSizeMB: number; label: string }> = {
  starter: { maxDocs: 10, maxSizeMB: 10, label: "Starter" },
  professional: { maxDocs: 50, maxSizeMB: 100, label: "Profissional" },
  business: { maxDocs: 200, maxSizeMB: 500, label: "Empresarial" },
  enterprise: { maxDocs: 9999, maxSizeMB: 2000, label: "Enterprise" },
};

const ACCEPTED_TYPES = ".pdf,.doc,.docx,.txt,.md,.csv,.xlsx,.xls";

const SOURCE_TYPE_CONFIG: Record<string, { label: string; pluralLabel: string; badgeClass: string }> = {
  document: { label: "Documento", pluralLabel: "Documentos", badgeClass: "bg-cosmos-indigo/10 text-cosmos-indigo" },
  website: { label: "Site", pluralLabel: "Sites", badgeClass: "bg-cosmos-cyan/10 text-cosmos-cyan" },
  social: { label: "Rede Social", pluralLabel: "Redes Sociais", badgeClass: "bg-cosmos-violet/10 text-cosmos-violet" },
  manual: { label: "Manual", pluralLabel: "Manuais", badgeClass: "bg-cosmos-emerald/10 text-cosmos-emerald" },
};

const sourceTypeIcon = (type: string) => {
  if (type === "website") return <Globe className="h-4 w-4 text-cosmos-cyan" />;
  if (type === "social") return <Instagram className="h-4 w-4 text-cosmos-violet" />;
  if (type === "manual") return <Hash className="h-4 w-4 text-cosmos-emerald" />;
  return null;
};

const fileIcon = (name: string, sourceType: string) => {
  const customIcon = sourceTypeIcon(sourceType);
  if (customIcon) return customIcon;
  if (!name) return <File className="h-4 w-4" />;
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return <FileType className="h-4 w-4 text-red-400" />;
  if (["xlsx", "xls", "csv"].includes(ext || "")) return <FileSpreadsheet className="h-4 w-4 text-emerald-400" />;
  if (["doc", "docx"].includes(ext || "")) return <FileText className="h-4 w-4 text-blue-400" />;
  return <FileText className="h-4 w-4 text-muted-foreground" />;
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function groupChunksBySource(items: KBItem[]): GroupedDoc[] {
  const map = new Map<string, GroupedDoc>();
  for (const item of items) {
    const key = item.source_name || "Sem nome";
    const existing = map.get(key);
    if (existing) {
      existing.chunkCount += 1;
      existing.totalChars += item.content.length;
      existing.chunks.push(item);
      if (new Date(item.created_at) > new Date(existing.latestDate)) {
        existing.latestDate = item.created_at;
      }
    } else {
      map.set(key, {
        sourceName: key,
        sourceType: item.source_type,
        chunkCount: 1,
        totalChars: item.content.length,
        latestDate: item.created_at,
        chunks: [item],
      });
    }
  }
  return Array.from(map.values()).sort(
    (a, b) => new Date(b.latestDate).getTime() - new Date(a.latestDate).getTime()
  );
}

function groupDocsBySourceType(docs: GroupedDoc[]): Record<string, GroupedDoc[]> {
  const groups: Record<string, GroupedDoc[]> = {};
  for (const doc of docs) {
    const type = doc.sourceType;
    if (!groups[type]) groups[type] = [];
    groups[type].push(doc);
  }
  return groups;
}

// Display order for source type sections
const SOURCE_TYPE_ORDER = ["document", "manual", "website", "social"];

interface Props {
  agentId: string;
  tenantId: string;
  plan: string;
}

export default function AgentKnowledgeTab({ agentId, tenantId, plan }: Props) {
  const [items, setItems] = useState<KBItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "processing" | "done" | "error">("idle");
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.starter;

  const fetchKB = async () => {
    const { data } = await supabase
      .from("knowledge_base")
      .select("id, source_name, source_type, content, created_at, chunk_index")
      .eq("attendant_id", agentId)
      .eq("is_archived", false)
      .order("created_at", { ascending: false });
    setItems(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchKB(); }, [agentId]);

  const groupedDocs = groupChunksBySource(items);
  const docCount = groupedDocs.length;
  const totalChars = items.reduce((sum, i) => sum + i.content.length, 0);
  const atLimit = docCount >= limits.maxDocs;
  const docsByType = groupDocsBySourceType(groupedDocs);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > limits.maxSizeMB) {
      toast({ title: "Arquivo muito grande", description: `Maximo ${limits.maxSizeMB}MB no plano ${limits.label}`, variant: "destructive" });
      return;
    }
    if (atLimit) {
      toast({ title: "Limite atingido", description: `Maximo ${limits.maxDocs} documentos no plano ${limits.label}`, variant: "destructive" });
      return;
    }

    setUploading(true);
    setUploadStatus("uploading");
    setUploadProgress(30);

    try {
      // Extract text using browser-side extraction (PDF.js for PDFs, direct read for text files)
      const result = await extractFileText(file);
      if (!result.extracted) {
        toast({ title: "Extracao falhou", description: result.text, variant: "destructive" });
        setUploadStatus("error");
        return;
      }
      const text = result.text;
      setUploadProgress(60);
      setUploadStatus("processing");

      // Split into chunks of ~1000 chars with 150 char overlap
      const chunks: string[] = [];
      const CHUNK_SIZE = 1000;
      const OVERLAP = 150;
      let start = 0;
      while (start < text.length) {
        const end = Math.min(start + CHUNK_SIZE, text.length);
        chunks.push(text.slice(start, end));
        if (end >= text.length) break;
        start = end - OVERLAP;
      }

      const rows = chunks.map((chunk, idx) => ({
        tenant_id: tenantId,
        attendant_id: agentId,
        content: chunk,
        source_type: "document",
        source_name: file.name,
        chunk_index: idx,
      }));

      setUploadProgress(80);

      const { error } = await supabase.from("knowledge_base").insert(rows);
      if (error) throw error;

      setUploadProgress(100);
      setUploadStatus("done");
      toast({ title: "Documento enviado!", description: `${file.name} processado em ${chunks.length} partes` });
      fetchKB();
    } catch (err: any) {
      setUploadStatus("error");
      toast({ title: "Erro no envio", description: err.message, variant: "destructive" });
    } finally {
      setTimeout(() => {
        setUploading(false);
        setUploadStatus("idle");
        setUploadProgress(0);
      }, 2000);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const deleteDoc = async (sourceName: string) => {
    await supabase
      .from("knowledge_base")
      .delete()
      .eq("attendant_id", agentId)
      .eq("source_name", sourceName);
    toast({ title: "Documento removido" });
    fetchKB();
  };

  return (
    <div className="space-y-6">
      {/* Header + Stats */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" /> Base de Conhecimento
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {docCount} de {limits.maxDocs} documentos · {(totalChars / 1000).toFixed(0)}k caracteres
          </p>
        </div>
        <Badge variant="outline" className="text-[10px] font-mono capitalize border-border/40">
          {limits.label}
        </Badge>
      </div>

      {/* Usage bar */}
      <Card className="border-border/30 bg-card/50">
        <CardContent className="py-4">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-2">
            <span className="flex items-center gap-1.5">
              <HardDrive className="h-3 w-3" /> Armazenamento
            </span>
            <span>{docCount}/{limits.maxDocs} docs</span>
          </div>
          <Progress value={(docCount / limits.maxDocs) * 100} className="h-1.5" />
          {atLimit && (
            <div className="mt-3 flex items-center justify-between">
              <span className="text-[10px] text-amber-400">Limite atingido</span>
              <Button size="sm" variant="outline" className="h-6 text-[9px] gap-1 border-[hsl(var(--meteora-cyan))]/20 text-[hsl(var(--meteora-cyan))] hover:bg-[hsl(var(--meteora-cyan))]/5">
                <Zap className="h-3 w-3" /> Upgrade
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload area */}
      <Card className="border-border/30 bg-card/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-display flex items-center gap-2">
            <Upload className="h-4 w-4 text-primary" /> Enviar Documento
          </CardTitle>
          <CardDescription className="text-xs">
            PDF, DOC, DOCX, TXT, MD, CSV, XLSX · Max {limits.maxSizeMB}MB
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Guidelines */}
            <div className="rounded-lg bg-muted/30 border border-border/20 p-3 space-y-1.5">
              <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Info className="h-3 w-3" /> Orientacoes
              </p>
              <ul className="text-[11px] text-muted-foreground space-y-1 list-disc pl-4">
                <li>Envie documentos <strong>limpos e bem formatados</strong> para melhores resultados</li>
                <li>Evite PDFs escaneados ou com imagens de texto — prefira texto digital</li>
                <li>Arquivos grandes podem levar alguns minutos para serem processados</li>
                <li>O agente usara este conteudo para responder perguntas dos clientes</li>
              </ul>
            </div>

            <div className="relative">
              <input
                ref={fileRef}
                type="file"
                accept={ACCEPTED_TYPES}
                onChange={handleUpload}
                disabled={uploading || atLimit}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
              />
              <div className={`rounded-xl border-2 border-dashed p-6 text-center transition-all ${
                atLimit ? "border-border/20 opacity-50" : "border-border/30 hover:border-primary/30 hover:bg-primary/5"
              }`}>
                {uploadStatus === "idle" && (
                  <>
                    <Upload className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">
                      {atLimit ? "Limite atingido — faca upgrade" : "Clique ou arraste um arquivo aqui"}
                    </p>
                  </>
                )}
                {uploadStatus === "uploading" && (
                  <div className="space-y-2">
                    <Loader2 className="h-6 w-6 text-primary animate-spin mx-auto" />
                    <p className="text-xs text-muted-foreground">Enviando arquivo...</p>
                    <Progress value={uploadProgress} className="h-1 max-w-[200px] mx-auto" />
                  </div>
                )}
                {uploadStatus === "processing" && (
                  <div className="space-y-2">
                    <Loader2 className="h-6 w-6 text-[hsl(var(--meteora-cyan))] animate-spin mx-auto" />
                    <p className="text-xs text-[hsl(var(--meteora-cyan))]">Processando e indexando documento...</p>
                    <p className="text-[10px] text-muted-foreground">Isso pode levar alguns segundos</p>
                    <Progress value={uploadProgress} className="h-1 max-w-[200px] mx-auto" />
                  </div>
                )}
                {uploadStatus === "done" && (
                  <div className="space-y-1">
                    <CheckCircle2 className="h-6 w-6 text-emerald-400 mx-auto" />
                    <p className="text-xs text-emerald-400">Documento processado com sucesso!</p>
                  </div>
                )}
                {uploadStatus === "error" && (
                  <div className="space-y-1">
                    <AlertCircle className="h-6 w-6 text-destructive mx-auto" />
                    <p className="text-xs text-destructive">Erro ao processar documento</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Docs list grouped by source type */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : docCount === 0 ? (
          <Card className="border-border/20 bg-card/30">
            <CardContent className="py-8 text-center">
              <BookOpen className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">Nenhum documento na base de conhecimento</p>
              <p className="text-[10px] text-muted-foreground/60 mt-1">Envie documentos para o agente aprender sobre seu negocio</p>
            </CardContent>
          </Card>
        ) : (
          SOURCE_TYPE_ORDER
            .filter((type) => docsByType[type] && docsByType[type].length > 0)
            .map((type) => {
              const docs = docsByType[type];
              const config = SOURCE_TYPE_CONFIG[type] || { label: type, pluralLabel: type, badgeClass: "bg-muted text-muted-foreground" };
              const sectionLabel = docs.length === 1 ? config.label : config.pluralLabel;

              return (
                <div key={type} className="space-y-2">
                  <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Badge variant="outline" className={`text-[9px] font-medium border-0 px-1.5 py-0 rounded uppercase tracking-wider ${config.badgeClass}`}>
                      {sectionLabel}
                    </Badge>
                    <span className="text-[10px]">({docs.length})</span>
                  </h3>
                  <div className="space-y-2">
                    {docs.map((doc, i) => (
                      <motion.div
                        key={doc.sourceName}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="flex items-center justify-between rounded-lg border border-border/30 bg-card/50 px-4 py-3 group hover:border-border/50 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {fileIcon(doc.sourceName, doc.sourceType)}
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-foreground truncate">{doc.sourceName}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {doc.chunkCount} {doc.chunkCount === 1 ? "chunk" : "chunks"} · {formatBytes(doc.totalChars)} · Adicionado {formatDistanceToNow(new Date(doc.latestDate), { addSuffix: false, locale: ptBR })}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive/60 hover:text-destructive"
                          onClick={() => deleteDoc(doc.sourceName)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </motion.div>
                    ))}
                  </div>
                </div>
              );
            })
        )}
      </div>
    </div>
  );
}
