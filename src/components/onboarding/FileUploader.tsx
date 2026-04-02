import { useRef, useState } from "react";
import { Paperclip, Loader2 } from "lucide-react";
import { extractFileText } from "@/lib/file-extractor";

const ACCEPTED = ".pdf,.doc,.docx,.xls,.xlsx,.csv,.md,.txt";

export default function FileUploader({
  onFileContent,
  disabled,
}: {
  onFileContent: (content: string, fileName: string, extracted: boolean) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [processing, setProcessing] = useState(false);

  const handleFile = async (file: File) => {
    setProcessing(true);
    try {
      const result = await extractFileText(file);
      onFileContent(result.text, file.name, result.extracted);
    } catch {
      onFileContent(`[Erro ao processar arquivo "${file.name}"]`, file.name, false);
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
