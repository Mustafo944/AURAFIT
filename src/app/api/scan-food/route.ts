import { createHash } from "node:crypto";
import { createRequestCache } from "@/lib/request-cache";
import { readJson, record, validFood } from "@/lib/api-validation";
import { authorizeApi } from "@/lib/api-access";
import { NextResponse } from "next/server";
import { callDeepSeek, friendlyDeepSeekError, DEEPSEEK_MODEL } from "@/lib/deepseek-server";

const PROMPT = `Siz tajribali ovqatlanish mutaxassisisiz. Rasmda tasvirlangan taom(lar)ni aniqlang va ularning taxminiy ozuqaviy tarkibini hisoblang.
Hisoblash usuli (har qanday taom uchun):
1. Rasmdagi har bir alohida taom yoki komponentni ajrating (masalan: palov, salat, non, go'sht, ichimlik, sous, shirinlik).
2. Har biri uchun porsiyani baholang: dona soni yoki taxminiy gramm (idish, qo'l, non, vilka kabi narsalarga qarab o'lchamni taqqoslang).
3. Har biri uchun shu porsiyaning kaloriyasini yozing, so'ng hammasini qo'shib totalCalories ni chiqaring.
4. Yashirin kaloriyani unutmang: yog'da qovurilgan yoki moyli taomlar (palov, somsa, qovurma), mayonez, kremli va shirin souslar, yog'li go'sht. Rasmda ko'ringan butun porsiyani hisoblang, kichraytirib yubormang.
Faqat JSON formatida, o'zbek tilida javob bering. Namuna: {"mealName":"Osh (Palov)","breakdown":["Palov, 350 g × 1.8 kkal/g = 630 kkal","Salat, 100 g = 60 kkal"],"items":["guruch","go'sht","sabzi"],"totalCalories":690,"proteinG":25,"fatG":30,"carbG":70,"note":"..."}. Maydonlar:
- mealName: taomning umumiy nomi (masalan, "Osh (Palov)")
- breakdown: har bir komponent bo'yicha hisob-kitob qatorlari (porsiya × kaloriya = natija, 1-8 ta)
- items: rasmda ko'ringan asosiy tarkibiy qismlar ro'yxati (o'zbek tilida, 2-6 ta)
- totalCalories: breakdown yig'indisiga teng umumiy taxminiy kaloriya (kcal, butun son)
- proteinG: protein miqdori (gramm, butun son)
- fatG: yog' miqdori (gramm, butun son)
- carbG: uglevod miqdori (gramm, butun son)
- note: bitta qisqa, foydali tavsiya jumlasi (o'zbek tilida)
Agar rasmda ovqat ko'rinmasa, mealName ni "Aniqlanmadi" deb qo'ying, items bo'sh massiv, boshqa raqamli maydonlarni 0 ga tenglashtiring va note ga sababini yozing.`;

const cachedScan = createRequestCache<unknown>(15 * 60_000);

export async function POST(request: Request) {
  const access = await authorizeApi("scan-food");
  if (access.response) return access.response;

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "DEEPSEEK_API_KEY sozlanmagan. .env.local faylida kalitni kiriting." },
      { status: 500 },
    );
  }

  const body = await readJson(request, 8 * 1024 * 1024).catch(() => null);
  const image = record(body) ? body.image : null;
  const mimeType = record(body) ? body.mimeType : null;
  if (
    typeof image !== "string" ||
    !image ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(image) ||
    image.length % 4 !== 0 ||
    typeof mimeType !== "string" ||
    !["image/jpeg", "image/png", "image/webp"].includes(mimeType)
  ) {
    return NextResponse.json({ error: "Rasm topilmadi." }, { status: 400 });
  }

  // Include user, prompt/schema version, credential, model configuration and image.
  const key = createHash("sha256")
    .update(JSON.stringify([access.userId, apiKey, DEEPSEEK_MODEL, PROMPT, mimeType, image]))
    .digest("hex");
  try {
    const result = await cachedScan(key, async () => {
      const attempt = await callDeepSeek(apiKey, {
        prompt: PROMPT,
        image: { mimeType, data: image },
        maxTokens: 1000,
      });
      if (!attempt.ok) throw new Error(friendlyDeepSeekError(attempt));
      if (!attempt.text) throw new Error("AI javobi bo'sh keldi.");
      let parsed: unknown;
      try {
        parsed = JSON.parse(attempt.text);
      } catch {
        throw new Error("AI javobini o'qib bo'lmadi.");
      }
      if (!validFood(parsed)) throw new Error("AI javobi noto'g'ri.");
      return parsed;
    });
    return NextResponse.json(result, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const busy = error instanceof Error && error.message === "AI_BUSY";
    return NextResponse.json(
      {
        error: busy
          ? "AI xizmati band. Birozdan so'ng urinib ko'ring."
          : error instanceof Error
            ? error.message
            : "Rasmni tahlil qilib bo'lmadi.",
      },
      { status: busy ? 503 : 502, ...(busy ? { headers: { "Retry-After": "5" } } : {}) },
    );
  }
}
