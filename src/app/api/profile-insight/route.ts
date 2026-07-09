import { NextResponse } from "next/server";
import { callGroq, friendlyGroqError } from "@/lib/groq-server";
import { createRpmLimiter } from "@/lib/rate-limiter";

const RPM_LIMIT = Number(process.env.COACH_RPM_LIMIT ?? 15);
const isRpmLimited = createRpmLimiter(RPM_LIMIT);
const MODEL = process.env.GROQ_MODEL || "llama-3.1-8b-instant";

interface RequestBody {
  profile: { age: number; gender: string; weightKg: number; heightCm: number; goal: string };
  metrics: {
    bmr: number;
    tdee: number;
    targetCalories: number;
    bmi: number;
    bmiCategory: string;
    proteinG: number;
    fatG: number;
    carbG: number;
  };
}

// The formula (Mifflin-St Jeor + goal-adjusted TDEE) produces the numbers — they are
// ground truth and passed in verbatim. The AI's job is only to interpret/contextualize
// them, not recompute them, so the response stays numerically accurate.
function buildPrompt({ profile, metrics }: RequestBody) {
  const goalLabel =
    profile.goal === "lose" ? "vazn yo'qotish" : profile.goal === "gain" ? "mushak massasi orttirish" : "vaznni saqlash";
  const genderLabel = profile.gender === "male" ? "erkak" : "ayol";
  const deltaPercent = Math.round(((metrics.tdee - metrics.targetCalories) / metrics.tdee) * 100);
  const deltaLabel =
    deltaPercent > 0 ? `${deltaPercent}% defitsit` : deltaPercent < 0 ? `${Math.abs(deltaPercent)}% ortiqcha` : "farqsiz (saqlash)";

  return `Siz tajribali fitnes va ozuqalanish mutaxassisisiz. Quyidagi formula orqali aniq hisoblangan ko'rsatkichlarni (bu raqamlar to'g'ri — qayta hisoblamang, faqat izohlang) foydalanuvchiga tushunarli qilib izohlang.

Foydalanuvchi: ${profile.age} yosh, ${genderLabel}, ${profile.weightKg} kg, ${profile.heightCm} sm, maqsad: ${goalLabel}.

Hisoblangan ko'rsatkichlar:
- BMR: ${metrics.bmr} kcal, TDEE: ${metrics.tdee} kcal
- Kunlik kaloriya maqsadi: ${metrics.targetCalories} kcal (TDEE'ga nisbatan: ${deltaLabel})
- BMI: ${metrics.bmi} (${metrics.bmiCategory})
- Kunlik maqsad: Oqsil ${metrics.proteinG}g, Yog' ${metrics.fatG}g, Uglevod ${metrics.carbG}g

Vazifa:
1. "analysis": 2-3 gapli tahlil (o'zbek tilida) — bu raqamlar nimani anglatadi, maqsad xavfsiz/real sur'atdami (masalan defitsit/ortiqcha foizi asosida).
2. "tips": aynan shu profilga mos 3 ta qisqa, amaliy tavsiya (har biri bitta jumla).

Faqat quyidagi JSON formatida javob bering, boshqa hech narsa yozmang: {"analysis": "...", "tips": ["...", "...", "..."]}`;
}

export async function POST(request: Request) {
  if (isRpmLimited()) {
    return NextResponse.json(
      { error: `Juda tez-tez so'rov yubordingiz (limit: ${RPM_LIMIT} ta/daqiqa). Bir daqiqadan so'ng qayta urinib ko'ring.` },
      { status: 429 }
    );
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GROQ_API_KEY sozlanmagan. .env.local faylida kalitni kiriting." },
      { status: 500 }
    );
  }

  const body = (await request.json().catch(() => null)) as RequestBody | null;
  if (!body?.profile || !body?.metrics) {
    return NextResponse.json({ error: "Ma'lumot to'liq emas." }, { status: 400 });
  }

  const attempt = await callGroq(MODEL, apiKey, buildPrompt(body));

  if (!attempt.ok) {
    return NextResponse.json({ error: friendlyGroqError(attempt) }, { status: 502 });
  }
  if (!attempt.text) {
    return NextResponse.json({ error: "AI javobi bo'sh keldi." }, { status: 502 });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(attempt.text);
  } catch {
    return NextResponse.json({ error: "AI javobini o'qib bo'lmadi." }, { status: 502 });
  }

  const { analysis, tips } = parsed as { analysis?: unknown; tips?: unknown };
  if (typeof analysis !== "string") {
    return NextResponse.json({ error: "AI javobi noto'g'ri formatda keldi." }, { status: 502 });
  }
  const safeTips = Array.isArray(tips) ? tips.filter((t): t is string => typeof t === "string") : [];
  return NextResponse.json({ analysis, tips: safeTips });
}
