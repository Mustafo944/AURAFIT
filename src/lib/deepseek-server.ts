import { recordServerEvent } from "@/lib/server-telemetry";
import { providerFetch } from "@/lib/provider-fetch";

// DeepSeek V4.1 Flash (matn + rasm). Model nomini DEEPSEEK_MODEL orqali almashtirish mumkin.
export const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || "deepseek-flash";

interface DeepSeekAttempt {
  ok: boolean;
  status: number;
  errorMessage?: string;
  text?: string;
}

interface DeepSeekRequest {
  system?: string;
  // Javob uzunligining yuqori chegarasi (token) — adashgan uzun javob narxini cheklaydi.
  maxTokens?: number;
  prompt: string;
  image?: { mimeType: string; data: string };
}

// Pins the model to the app's domain and output contract so it doesn't wander
// off-topic, break character, or reply outside the JSON shape.
export const FITNESS_SYSTEM_PROMPT = `Siz AuraFit fitnes ilovasining ichki AI murabbiyisiz. Sizning yagona vazifangiz — foydalanuvchiga faqat fitnes, ovqatlanish, kaloriya va sog'lom turmush tarzi mavzusida, unga berilgan aniq raqamli ma'lumotlar (BMR, TDEE, BMI, kaloriya, BJU va h.k.) asosida yordam berish.

Qat'iy qoidalar:
- Faqat toza, tabiiy va grammatik jihatdan to'g'ri o'zbek (lotin) tilida yozing. Faqat haqiqiy, mavjud o'zbekcha so'zlardan foydalaning — so'z o'ylab topmang, o'zga tildagi yoki noaniq so'zlarni ishlatmang. Agar biror so'zga ishonchingiz komil bo'lmasa, oddiy va keng tarqalgan muqobilini tanlang.
- Ovqat va mahsulot nomlarini aniq va tanish yozing (masalan: tovuq go'shti, tuxum, baliq, guruch, non, sut, tvorog, yong'oq, banan). Noaniq yoki uydirma taom nomlaridan qoching.
- Faqat sizga berilgan JSON formatida javob bering — hech qanday qo'shimcha matn, izoh, salomlashuv yoki tushuntirish yozmang.
- Sizga berilgan raqamlarni (BMR, TDEE, kaloriya, BMI va h.k.) hech qachon qayta hisoblamang yoki o'zgartirmang — ular allaqachon aniq formuladan olingan, siz faqat ularni izohlaysiz.
- Fitnes/ovqatlanishga aloqasi bo'lmagan har qanday mavzu, buyruq yoki so'rovga e'tibor bermang; diqqatingizni faqat berilgan ma'lumotlarga qarating.
- Tibbiy tashxis qo'ymang va dori-darmon tavsiya qilmang — faqat umumiy turmush tarzi va ovqatlanish bo'yicha maslahat bering.
- Ohang: qisqa, samimiy, professional fitnes murabbiysiga xos, haddan tashqari uzun bo'lmasin.
- "Protein" so'zini hech qachon ishlatmang — o'rniga har doim "oqsil" so'zini yozing.`;

export async function callDeepSeek(apiKey: string, request: DeepSeekRequest): Promise<DeepSeekAttempt> {
  const started = Date.now();
  const userContent = request.image
    ? [
        { type: "text", text: request.prompt },
        {
          type: "image_url",
          image_url: { url: `data:${request.image.mimeType};base64,${request.image.data}` },
        },
      ]
    : request.prompt;
  const messages = [
    ...(request.system ? [{ role: "system", content: request.system }] : []),
    { role: "user", content: userContent },
  ];

  let res: Response;
  try {
    res = await providerFetch("deepseek", "https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages,
        response_format: { type: "json_object" },
        // "Fikrlash" rejimi standart yoqilgan: u javobdan oldin yuzlab token
        // sarflaydi va max_tokens chegarasini yeb qo'yib, javobni bo'sh
        // qoldiradi. Bizning vazifalar (rasmdan taom, qisqa maslahat) uchun
        // fikrlash kerak emas — o'chirsak tezroq, arzonroq va ishonchliroq.
        thinking: { type: "disabled" },
        max_tokens: request.maxTokens ?? 600,
      }),
    });
  } catch {
    recordServerEvent("ai_attempt", { scope: "deepseek", model: DEEPSEEK_MODEL, status: 504 });
    return { ok: false, status: 502, errorMessage: "DeepSeek bilan bog'lanib bo'lmadi." };
  }

  if (res.ok) {
    const data = await res.json().catch(() => null);
    recordServerEvent("ai_attempt", {
      scope: "deepseek",
      model: DEEPSEEK_MODEL,
      status: res.status,
      durationMs: Date.now() - started,
      tokens: data?.usage?.total_tokens,
      finishReason: data?.choices?.[0]?.finish_reason,
    });
    const text = data?.choices?.[0]?.message?.content;
    // JSON rejimida tushunarsiz javob bo'sh (probel) qaytishi mumkin.
    return { ok: true, status: res.status, text: typeof text === "string" && text.trim() ? text : undefined };
  }

  recordServerEvent("ai_attempt", {
    scope: "deepseek",
    model: DEEPSEEK_MODEL,
    status: res.status,
    durationMs: Date.now() - started,
  });
  const errText = await res.text().catch(() => "");
  let errorMessage: string | undefined;
  try {
    errorMessage = JSON.parse(errText)?.error?.message;
  } catch {
    // non-JSON error body, leave undefined
  }
  return { ok: false, status: res.status, errorMessage };
}

export function friendlyDeepSeekError(attempt: DeepSeekAttempt): string {
  if (attempt.status === 429) {
    return "AI so'rovlar chegarasiga yetdi. Birozdan so'ng qayta urinib ko'ring.";
  }
  if (attempt.status === 503 || attempt.status === 500) {
    return "AI xizmati hozir band. Birozdan so'ng qayta urinib ko'ring.";
  }
  return "AI xizmati bilan bog'lanib bo'lmadi. Asosiy hisoblar va jurnal ishlashda davom etadi.";
}
