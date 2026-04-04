import { useState, useRef, useEffect } from "react";
import { Mic, Square, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

const TRANSCRIBE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/transcribe-audio`;

async function getAuthToken(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
}

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
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>(0);
  const [bars, setBars] = useState<number[]>(Array(12).fill(4));

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Audio analyser for waveform
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      analyserRef.current = analyser;

      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunks.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        audioCtx.close();
        cancelAnimationFrame(animFrameRef.current);
        setBars(Array(12).fill(4));
        const blob = new Blob(chunks.current, { type: "audio/webm" });
        await transcribe(blob);
      };

      recorder.start();
      mediaRecorder.current = recorder;
      setRecording(true);
      drawWaveform();
    } catch {
      console.error("Microphone access denied");
    }
  };

  const drawWaveform = () => {
    const analyser = analyserRef.current;
    if (!analyser) return;
    const data = new Uint8Array(analyser.frequencyBinCount);
    const tick = () => {
      analyser.getByteFrequencyData(data);
      const newBars: number[] = [];
      const step = Math.floor(data.length / 12);
      for (let i = 0; i < 12; i++) {
        const val = data[i * step] || 0;
        newBars.push(Math.max(4, (val / 255) * 28));
      }
      setBars(newBars);
      animFrameRef.current = requestAnimationFrame(tick);
    };
    tick();
  };

  const stopRecording = () => {
    mediaRecorder.current?.stop();
    setRecording(false);
  };

  useEffect(() => {
    return () => cancelAnimationFrame(animFrameRef.current);
  }, []);

  const transcribe = async (blob: Blob) => {
    setTranscribing(true);
    try {
      const formData = new FormData();
      formData.append("audio", blob, "recording.webm");
      const resp = await fetch(TRANSCRIBE_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${await getAuthToken()}` },
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
      <button disabled className="h-11 w-11 rounded-xl bg-muted flex items-center justify-center">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </button>
    );
  }

  if (recording) {
    return (
      <div className="flex items-center gap-2">
        {/* Waveform */}
        <div className="flex items-center gap-[2px] h-11 px-3 rounded-xl bg-red-500/10 border border-red-500/20">
          {bars.map((h, i) => (
            <motion.div
              key={i}
              className="w-[3px] rounded-full bg-red-500"
              animate={{ height: h }}
              transition={{ duration: 0.08 }}
            />
          ))}
        </div>
        <button
          onClick={stopRecording}
          className="h-11 w-11 rounded-xl bg-red-500 flex items-center justify-center animate-pulse shadow-lg shadow-red-500/30 transition-all shrink-0"
        >
          <Square className="h-4 w-4 text-white fill-white" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={startRecording}
      disabled={disabled}
      className="h-11 w-11 rounded-xl bg-muted hover:bg-muted/80 flex items-center justify-center transition-all disabled:opacity-50 shrink-0"
      title="Enviar áudio"
    >
      <Mic className="h-4 w-4 text-muted-foreground" />
    </button>
  );
}
