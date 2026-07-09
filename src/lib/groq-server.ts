export interface GroqAttempt {
  ok: boolean;
  status: number;
  errorMessage?: string;
  text?: string;
}

// Pins the model to the app's domain and output contract so a small model
// doesn't wander off-topic, break character, or reply outside the JSON shape.
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

export async function callGroq(model: string, apiKey: string, prompt: string): Promise<GroqAttempt> {
  let res: Response;
  try {
    res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: FITNESS_SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      }),
    });
  } catch {
    return { ok: false, status: 502, errorMessage: "Groq bilan bog'lanib bo'lmadi." };
  }

  if (res.ok) {
    const data = await res.json();
    return { ok: true, status: res.status, text: data?.choices?.[0]?.message?.content };
  }

  const errText = await res.text();
  let errorMessage: string | undefined;
  try {
    errorMessage = JSON.parse(errText)?.error?.message;
  } catch {
    // non-JSON error body, leave undefined
  }
  return { ok: false, status: res.status, errorMessage };
}

export function friendlyGroqError(attempt: GroqAttempt): string {
  if (attempt.status === 429) {
    return "AI maslahat xizmatining kvotasi tugadi. Birozdan so'ng qayta urinib ko'ring.";
  }
  if (attempt.status === 503) {
    return "AI xizmati hozir band. Birozdan so'ng qayta urinib ko'ring.";
  }
  return attempt.errorMessage || `Groq xatosi (${attempt.status})`;
}
