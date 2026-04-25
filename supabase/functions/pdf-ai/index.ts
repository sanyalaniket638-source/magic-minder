import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type Mode = "summarize" | "translate" | "ocr";

interface Body {
  mode: Mode;
  text?: string;
  language?: string;
  images?: string[];
}

function systemFor(mode: Mode, language?: string) {
  if (mode === "summarize") {
    return "You are an expert document summarizer. Produce a clear, well-structured summary of the supplied PDF text. Use short paragraphs and a bullet list of key points at the end. Do not invent facts.";
  }
  if (mode === "translate") {
    return `You are a professional translator. Translate the supplied text into ${language || "English"}. Preserve paragraph breaks. Output only the translation, no commentary.`;
  }
  return "You are an OCR engine. Read every visible character from the supplied page images and return ONLY the recognized plain text. Preserve line breaks. Do not add commentary.";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as Body;
    const { mode, text, language, images } = body;

    if (!mode || !["summarize", "translate", "ocr"].includes(mode)) {
      return new Response(JSON.stringify({ error: "Invalid mode" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let messages: any[];
    if (mode === "ocr") {
      if (!images || images.length === 0) {
        return new Response(JSON.stringify({ error: "No images supplied" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const content: any[] = [
        { type: "text", text: "Extract all readable text from these PDF pages." },
      ];
      for (const img of images) {
        const url = img.startsWith("data:") ? img : `data:image/png;base64,${img}`;
        content.push({ type: "image_url", image_url: { url } });
      }
      messages = [
        { role: "system", content: systemFor("ocr") },
        { role: "user", content },
      ];
    } else {
      if (!text || !text.trim()) {
        return new Response(JSON.stringify({ error: "No text supplied" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const trimmed = text.slice(0, 60_000);
      messages = [
        { role: "system", content: systemFor(mode, language) },
        { role: "user", content: trimmed },
      ];
    }

    const aiResp = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages,
        }),
      }
    );

    if (!aiResp.ok) {
      if (aiResp.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit reached. Please try again in a minute." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResp.status === 402) {
        return new Response(
          JSON.stringify({
            error: "AI credits exhausted. Add funds in Settings → Workspace → Usage.",
          }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await aiResp.text();
      console.error("AI gateway error", aiResp.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiResp.json();
    const result: string = data.choices?.[0]?.message?.content ?? "";
    return new Response(JSON.stringify({ result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("pdf-ai error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});