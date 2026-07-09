import { NextResponse } from "next/server";
import { callGeminiChain, friendlyGeminiError } from "@/lib/gemini-server";
import { createRpmLimiter } from "@/lib/rate-limiter";

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    mealName: { type: "STRING" },
    items: { type: "ARRAY", items: { type: "STRING" } },
    totalCalories: { type: "NUMBER" },
    proteinG: { type: "NUMBER" },
    fatG: { type: "NUMBER" },
    carbG: { type: "NUMBER" },
    note: { type: "STRING" },
  },
  required: ["mealName", "items", "totalCalories", "proteinG", "fatG", "carbG", "note"],
};

const PROMPT = `Siz tajribali ovqatlanish mutaxassisisiz. Rasmda tasvirlangan taom(lar)ni aniqlang va ularning taxminiy ozuqaviy tarkibini hisoblang.
Faqat berilgan JSON formatida, o'zbek tilida javob bering:
- mealName: taomning umumiy nomi (masalan, "Osh (Palov)")
- items: rasmda ko'ringan asosiy tarkibiy qismlar ro'yxati (o'zbek tilida, 2-6 ta)
- totalCalories: umumiy taxminiy kaloriya (kcal, butun son)
- proteinG: protein miqdori (gramm, butun son)
- fatG: yog' miqdori (gramm, butun son)
- carbG: uglevod miqdori (gramm, butun son)
- note: bitta qisqa, foydali tavsiya jumlasi (o'zbek tilida)
Agar rasmda ovqat ko'rinmasa, mealName ni "Aniqlanmadi" deb qo'ying, items bo'sh massiv, boshqa raqamli maydonlarni 0 ga tenglashtiring va note ga sababini yozing.`;

// Free-tier quota for this account (checked in Google AI Studio): 5 RPM / 20 RPD per model.
// Vision scans prioritize gemini-2.5-flash; the coach-advice route prioritizes flash-lite
// so the two features don't compete for the same model's daily bucket under normal use.
const RPM_LIMIT = Number(process.env.SCAN_RPM_LIMIT ?? 4);
const isRpmLimited = createRpmLimiter(RPM_LIMIT);

const MODEL_CHAIN = [
  process.env.GEMINI_MODEL || "gemini-2.5-flash",
  process.env.GEMINI_FALLBACK_MODEL || "gemini-2.5-flash-lite",
  process.env.GEMINI_FALLBACK_MODEL_2 || "gemini-3.5-flash",
].filter((model, i, arr) => arr.indexOf(model) === i);

export async function POST(request: Request) {
  if (isRpmLimited()) {
    return NextResponse.json(
      { error: `Juda tez-tez so'rov yubordingiz (limit: ${RPM_LIMIT} ta/daqiqa). Bir daqiqadan so'ng qayta urinib ko'ring.` },
      { status: 429 }
    );
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY sozlanmagan. .env.local faylida kalitni kiriting." },
      { status: 500 }
    );
  }

  const body = await request.json().catch(() => null);
  const image = body?.image;
  const mimeType = body?.mimeType;
  if (!image || !mimeType) {
    return NextResponse.json({ error: "Rasm topilmadi." }, { status: 400 });
  }

  const attempt = await callGeminiChain(
    MODEL_CHAIN,
    apiKey,
    [{ text: PROMPT }, { inlineData: { mimeType, data: image } }],
    RESPONSE_SCHEMA
  );

  if (!attempt.ok) {
    return NextResponse.json({ error: friendlyGeminiError(attempt) }, { status: 502 });
  }

  if (!attempt.text) {
    return NextResponse.json({ error: "AI javobi bo'sh keldi." }, { status: 502 });
  }

  try {
    const parsed = JSON.parse(attempt.text);
    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({ error: "AI javobini o'qib bo'lmadi." }, { status: 502 });
  }
}
