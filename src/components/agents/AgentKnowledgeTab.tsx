import { useEffect, useState, useRef } from "react";
import { BookOpen, Upload, FileText, Trash2, AlertCircle, CheckCircle2, Loader2, HardDrive, Info, Lock, Zap, File, FileSpreadsheet, FileType } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

interface KBItem {
  id: string;
  source_name: string | null;
  source_type: string;
  content: string;
  created_at: string;
  chunk_index: number | null;
}

const PLAN_LIMITS: Record<string, { maxDocs: number; maxSizeMB: number; label: string }> = {
  starter: { maxDocs: 10, maxSizeMB: 10, label: "Starter" },
  professional: { maxDocs: 50, maxSizeMB: 100, label: "Profissional" },
  business: { maxDocs: 200, maxSizeMB: 500, label: "Empresarial" },
  enterprise: { maxDocs: 9999, maxSizeMB: 2000, label: "Enterprise" },
};

const ACCEPTED_TYPES = ".pdf,.doc,.docx,.txt,.md,.csv,.xlsx,.xls";

const fileIcon = (name: string) => {
  if (!name) return <File className="h-4 w-4" />;
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return <FileType className="h-4 w-4 text-red-400" />;
  if (["xlsx", "xls", "csv"].includes(ext || "")) return <FileSpreadsheet className="h-4 w-4 text-emerald-400" />;
  if (["doc", "docx"].includes(ext || "")) return <FileText className="h-4 w-4 text-blue-400" />;
  return <FileText className="h-4 w-4 text-muted-foreground" />;
};

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
      .order("created_at", { ascending: false });
    setItems(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchKB(); }, [agentId]);

  // Group by source_name
  const grouped = items.reduce<Record<string, KBItem[]>>((acc, item) => {
    const key = item.source_name || "Sem nome";
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});
  const docCount = Object.keys(grouped).length;
  const totalChars = items.reduce((sum, i) => sum + i.content.length, 0);
  const atLimit = docCount >= limits.maxDocs;

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > limits.maxSizeMB) {
      toast({ title: "Arquivo muito grande", description: `Máximo ${limits.maxSizeMB}MB no plano ${limits.label}`, variant: "destructive" });
      return;
    }
    if (atLimit) {
      toast({ title: "Limite atingido", description: `Máximo ${limits.maxDocs} documentos no plano ${limits.label}`, variant: "destructive" });
      return;
    }

    setUploading(true);
    setUploadStatus("uploading");
    setUploadProgress(30);

    try {
      // Read file as text (simplified — in production, use edge function for PDF/DOCX parsing)
      const text = await file.text();
      setUploadProgress(60);
      setUploadStatus("processing");

      // Split into chunks of ~1500 chars
      const chunks: string[] = [];
      const CHUNK_SIZE = 1500;
      for (let i = 0; i < text.length; i += CHUNK_SIZE) {
        chunks.push(text.slice(i, i + CHUNK_SIZE));
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
    const ids = grouped[sourceName].map(i => i.id);
    await supabase.from("knowledge_base").delete().in("id", ids);
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
            PDF, DOC, DOCX, TXT, MD, CSV, XLSX · Máx {limits.maxSizeMB}MB
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Guidelines */}
            <div className="rounded-lg bg-muted/30 border border-border/20 p-3 space-y-1.5">
              <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Info className="h-3 w-3" /> Orientações
              </p>
              <ul className="text-[11px] text-muted-foreground space-y-1 list-disc pl-4">
                <li>Envie documentos <strong>limpos e bem formatados</strong> para melhores resultados</li>
                <li>Evite PDFs escaneados ou com imagens de texto — prefira texto digital</li>
                <li>Arquivos grandes podem levar alguns minutos para serem processados</li>
                <li>O agente usará este conteúdo para responder perguntas dos clientes</li>
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
                      {atLimit ? "Limite atingido — faça upgrade" : "Clique ou arraste um arquivo aqui"}
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

      {/* Docs list */}
      <div className="space-y-2">
        <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
          Documentos ({docCount})
        </h3>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : docCount === 0 ? (
          <Card className="border-border/20 bg-card/30">
            <CardContent className="py-8 text-center">
              <BookOpen className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">Nenhum documento na base de conhecimento</p>
              <p className="text-[10px] text-muted-foreground/60 mt-1">Envie documentos para o agente aprender sobre seu negócio</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {Object.entries(grouped).map(([name, chunks], i) => (
              <motion.div
                key={name}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-center justify-between rounded-lg border border-border/30 bg-card/50 px-4 py-3 group hover:border-border/50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {fileIcon(name)}
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {chunks.length} {chunks.length === 1 ? "parte" : "partes"} · {(chunks.reduce((s, c) => s + c.content.length, 0) / 1000).toFixed(1)}k chars
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[9px] border-border/30">{chunks[0].source_type}</Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive/60 hover:text-destructive"
                    onClick={() => deleteDoc(name)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
