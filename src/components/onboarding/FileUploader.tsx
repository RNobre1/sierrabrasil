import { useRef, useState } from "react";
import { Paperclip, Loader2, FileText } from "lucide-react";

const ACCEPTED = ".pdf,.doc,.docx,.xls,.xlsx,.csv,.md,.txt";

export default function FileUploader({
  onFileContent,
  disabled,
}: {
  onFileContent: (content: string, fileName: string) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [processing, setProcessing] = useState(false);

  const handleFile = async (file: File) => {
    setProcessing(true);
    try {
      // For text-based files, read directly
      const textTypes = [".txt", ".md", ".csv"];
      const isText = textTypes.some((t) => file.name.toLowerCase().endsWith(t));

      if (isText) {
        const text = await file.text();
        onFileContent(text, file.name);
      } else {
        // Binary files (PDF, DOC, XLS) - only show metadata, not raw content
        onFileContent(
          `[Documento enviado: "${file.name}" (${(file.size / 1024).toFixed(1)}KB)]`,
          file.name
        );
      }
    } catch {
      onFileContent(`[Erro ao processar arquivo "${file.name}"]`, file.name);
    }
    setProcessing(false);
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={disabled || processing}
        className="h-11 w-11 rounded-xl bg-muted hover:bg-muted/80 flex items-center justify-center transition-all disabled:opacity-50"
        title="Enviar documento"
      >
        {processing ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : (
          <Paperclip className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
    </>
  );
}
