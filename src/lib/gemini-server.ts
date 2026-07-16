export interface GeminiPart {
  text?: string;
  inlineData?: { mimeType: string; data: string };
}

export interface GeminiAttempt {
  ok: boolean;
  status: number;
  errorStatus?: string;
  errorMessage?: string;
  text?: string;
}

async function callGeminiModel(
  model: string,
  apiKey: string,
  parts: GeminiPart[],
  responseSchema: object
): Promise<GeminiAttempt> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: { responseMimeType: "application/json", responseSchema },
    }),
  });

  if (res.ok) {
    const data = await res.json();
    return { ok: true, status: res.status, text: data?.candidates?.[0]?.content?.parts?.[0]?.text };
  }

  const errText = await res.text();
  let errorStatus: string | undefined;
  let errorMessage: string | undefined;
  try {
    const errJson = JSON.parse(errText);
    errorStatus = errJson?.error?.status;
    errorMessage = errJson?.error?.message;
  } catch {
    // non-JSON error body, leave fields undefined
  }
  return { ok: false, status: res.status, errorStatus, errorMessage };
}

// Runs the model chain in order, falling through to the next model (a separate
// free-tier quota bucket) only when the current one is exhausted or unavailable.
export async function callGeminiChain(
  models: string[],
  apiKey: string,
  parts: GeminiPart[],
  responseSchema: object
): Promise<GeminiAttempt> {
  let attempt: GeminiAttempt = { ok: false, status: 502, errorMessage: "Gemini bilan bog'lanib bo'lmadi." };
  for (const model of models) {
    try {
      attempt = await callGeminiModel(model, apiKey, parts, responseSchema);
    } catch {
      return { ok: false, status: 502, errorMessage: "Gemini bilan bog'lanib bo'lmadi." };
    }
    if (attempt.ok) break;
    // Keyingi (pastdagi) modelga o'tamiz: kvota tugagan (RESOURCE_EXHAUSTED),
    // model band (UNAVAILABLE), yoki model bu kalitda mavjud emas/ruxsat yo'q
    // (NOT_FOUND / PERMISSION_DENIED) — masalan yangi gemini-3.5-flash hali
    // ochilmagan bo'lsa, zanjir jimgina 2.5-flash'ga tushadi, xato bermaydi.
    const retryableWithNextModel =
      attempt.errorStatus === "RESOURCE_EXHAUSTED" ||
      attempt.errorStatus === "UNAVAILABLE" ||
      attempt.errorStatus === "NOT_FOUND" ||
      attempt.errorStatus === "PERMISSION_DENIED";
    if (!retryableWithNextModel) break;
  }
  return attempt;
}

export function friendlyGeminiError(attempt: GeminiAttempt): string {
  if (attempt.errorStatus === "RESOURCE_EXHAUSTED") {
    return "Bugungi AI kvotasi tugadi (free tier: kuniga 20 ta/model, barcha modellar sinab ko'rildi). Ertaga (UTC bo'yicha) qayta tiklanadi.";
  }
  if (attempt.errorStatus === "UNAVAILABLE") {
    return "AI xizmatlari hozir band. Birozdan so'ng qayta urinib ko'ring.";
  }
  return attempt.errorMessage || `Gemini xatosi (${attempt.status})`;
}
