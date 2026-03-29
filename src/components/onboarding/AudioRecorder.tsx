import { useState, useRef } from "react";
import { Mic, Square, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const TRANSCRIBE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/transcribe-audio`;

export default function AudioRecorder({
  onTranscribed,
  disabled,
}: {
  onTranscribed: (text: string) => void;
  disabled?: boolean;
}) {
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunks.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks.current, { type: "audio/webm" });
        await transcribe(blob);
      };

      recorder.start();
      mediaRecorder.current = recorder;
      setRecording(true);
    } catch {
      console.error("Microphone access denied");
    }
  };

  const stopRecording = () => {
    mediaRecorder.current?.stop();
    setRecording(false);
  };

  const transcribe = async (blob: Blob) => {
    setTranscribing(true);
    try {
      const formData = new FormData();
      formData.append("audio", blob, "recording.webm");

      const resp = await fetch(TRANSCRIBE_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: formData,
      });

      if (!resp.ok) throw new Error("Transcription failed");
      const { text } = await resp.json();
      if (text) onTranscribed(text);
    } catch (e) {
      console.error("Transcription error:", e);
    }
    setTranscribing(false);
  };

  if (transcribing) {
    return (
      <button
        disabled
        className="h-11 w-11 rounded-xl bg-muted flex items-center justify-center"
      >
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </button>
    );
  }

  if (recording) {
    return (
      <button
        onClick={stopRecording}
        className="h-11 w-11 rounded-xl bg-red-500 flex items-center justify-center animate-pulse shadow-lg shadow-red-500/30 transition-all"
      >
        <Square className="h-4 w-4 text-white fill-white" />
      </button>
    );
  }

  return (
    <button
      onClick={startRecording}
      disabled={disabled}
      className="h-11 w-11 rounded-xl bg-muted hover:bg-muted/80 flex items-center justify-center transition-all disabled:opacity-50"
      title="Enviar áudio"
    >
      <Mic className="h-4 w-4 text-muted-foreground" />
    </button>
  );
}
