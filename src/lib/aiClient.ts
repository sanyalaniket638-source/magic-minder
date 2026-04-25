const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/pdf-ai`;
const ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

export type AiMode = "summarize" | "translate" | "ocr";

export async function callAi(payload: {
  mode: AiMode;
  text?: string;
  language?: string;
  images?: string[];
}): Promise<string> {
  const resp = await fetch(FN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ANON}`,
    },
    body: JSON.stringify(payload),
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    throw new Error(data?.error || `AI request failed (${resp.status})`);
  }
  return data.result as string;
}