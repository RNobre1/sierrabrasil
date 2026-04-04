import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireAuth } from "../_shared/auth.ts";
import { getCorsHeaders, handleCors } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return handleCors(req);

  try {
    // Verify authentication (accepts user JWT, service role, or anon key with warning)
    const caller = await requireAuth(req, "transcribe-audio");
    if (!caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const ASSEMBLYAI_API_KEY = Deno.env.get("ASSEMBLYAI_API_KEY");
    if (!ASSEMBLYAI_API_KEY) throw new Error("ASSEMBLYAI_API_KEY is not configured");

    const formData = await req.formData();
    const audioFile = formData.get("audio") as File;
    if (!audioFile) {
      return new Response(JSON.stringify({ error: "No audio file provided" }), {
        status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // Upload audio to AssemblyAI
    const audioBuffer = await audioFile.arrayBuffer();
    const uploadResp = await fetch("https://api.assemblyai.com/v2/upload", {
      method: "POST",
      headers: { authorization: ASSEMBLYAI_API_KEY },
      body: new Uint8Array(audioBuffer),
    });

    if (!uploadResp.ok) {
      const errText = await uploadResp.text();
      console.error("Upload error:", uploadResp.status, errText);
      throw new Error("Failed to upload audio");
    }

    const { upload_url } = await uploadResp.json();

    // Request transcription
    const transcriptResp = await fetch("https://api.assemblyai.com/v2/transcript", {
      method: "POST",
      headers: {
        authorization: ASSEMBLYAI_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        audio_url: upload_url,
        language_code: "pt",
        speech_model: "best",
      }),
    });

    if (!transcriptResp.ok) throw new Error("Failed to create transcript");
    const { id: transcriptId } = await transcriptResp.json();

    // Poll for completion
    let transcript: any = null;
    for (let i = 0; i < 40; i++) {
      await new Promise(r => setTimeout(r, 3000));
      const pollResp = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
        headers: { authorization: ASSEMBLYAI_API_KEY },
      });
      if (!pollResp.ok) continue;
      transcript = await pollResp.json();
      if (transcript.status === "completed") break;
      if (transcript.status === "error") throw new Error(transcript.error || "Transcription failed");
    }

    if (!transcript || transcript.status !== "completed") {
      throw new Error("Transcription timed out");
    }

    return new Response(JSON.stringify({ text: transcript.text }), {
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("transcribe-audio error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
