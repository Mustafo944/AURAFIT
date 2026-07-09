import { NextResponse } from "next/server";
import { callGroq, friendlyGroqError } from "@/lib/groq-server";
import { createRpmLimiter } from "@/lib/rate-limiter";

// Text advice runs on Groq (generous free tier: 30 RPM / 14.4K RPD) so it never
// competes with the Gemini vision quota used by /api/scan-food.
const RPM_LIMIT = Number(process.env.COACH_RPM_LIMIT ?? 15);
const isRpmLimited = createRpmLimiter(RPM_LIMIT);
const MODEL = process.env.GROQ_MODEL || "llama-3.1-8b-instant";

function buildPrompt(body: {
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
  consumed: { calories: number; proteinG: number; fatG: number; carbG: number };
  meals: { mealName: string; calories: number }[];
  mealCount: number;
}) {
  const { profile, metrics, consumed, meals, mealCount } = body;
  const remainingCalories = metrics.targetCalories - consumed.calories;
  const remainingProtein = Math.max(0, metrics.proteinG - consumed.proteinG);
  const remainingFat = Math.max(0, metrics.fatG - consumed.fatG);
  const remainingCarb = Math.max(0, metrics.carbG - consumed.carbG);
  const mealList =
    meals.length > 0
      ? meals.map((m) => `${m.mealName} (${m.calories} kcal)`).join(", ")
      : "hali hech narsa qayd etilmagan";

  return `Siz shaxsiy AI fitnes murabbiysisiz. Sizning vazifangiz — foydalanuvchiga bugungi qolgan vaqt uchun ANIQ nima yeyish/qilish kerakligini aytish, umumiy gap emas.

Foydalanuvchi profili:
- Yosh: ${profile.age}, Jins: ${profile.gender === "male" ? "erkak" : "ayol"}
- Vazn: ${profile.weightKg} kg, Bo'y: ${profile.heightCm} sm
- Maqsad: ${profile.goal === "lose" ? "vazn yo'qotish" : profile.goal === "gain" ? "mushak massasi orttirish" : "vaznni saqlash"}
- BMR: ${metrics.bmr} kcal, TDEE: ${metrics.tdee} kcal
- BMI: ${metrics.bmi} (${metrics.bmiCategory})

Bugungi holat:
- Bugun yeyilgan taomlar (${mealCount} ta): ${mealList}
- Iste'mol qilingan: ${consumed.calories} kcal / ${metrics.targetCalories} kcal maqsad
- Qolgan kaloriya: ${remainingCalories} kcal
- Yetishmayotgan oqsil: ${remainingProtein}g (hozir ${consumed.proteinG}g / ${metrics.proteinG}g)
- Yetishmayotgan yog': ${remainingFat}g (hozir ${consumed.fatG}g / ${metrics.fatG}g)
- Yetishmayotgan uglevod: ${remainingCarb}g (hozir ${consumed.carbG}g / ${metrics.carbG}g)

Vazifa: yuqoridagi "yetishmayotgan" raqamlarga asoslanib (ularni qayta hisoblamang, ular tayyor), foydalanuvchiga bugungi qolgan vaqt uchun 1-2 gapli ANIQ ko'rsatma bering: qancha kaloriya va qaysi ozuqa moddasi (oqsil/yog'/uglevod) ko'proq kerak, va shu bo'shliqni to'ldiradigan 1 ta konkret taom namunasi taklif qiling. Agar barcha maqsadlarga allaqachon erishilgan yoki oshib ketilgan bo'lsa, shuni aniq ayting va mos tavsiya bering (masalan, to'xtash yoki yengil taom).

Faqat quyidagi JSON formatida javob bering: {"advice": "bitta yaxlit gap shaklidagi matn"}
"advice" qiymati albatta oddiy matn (string) bo'lishi shart — obyekt, massiv yoki boshqa maydonlar qo'shmang.`;
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

  const body = await request.json().catch(() => null);
  if (!body?.profile || !body?.metrics || !body?.consumed || !Array.isArray(body?.meals)) {
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

  const advice = (parsed as { advice?: unknown })?.advice;
  if (typeof advice !== "string") {
    return NextResponse.json({ error: "AI javobi noto'g'ri formatda keldi." }, { status: 502 });
  }
  return NextResponse.json({ advice });
}
