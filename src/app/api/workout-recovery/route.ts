import { NextResponse } from "next/server";
import { callGroq, friendlyGroqError } from "@/lib/groq-server";
import { createRpmLimiter } from "@/lib/rate-limiter";

const RPM_LIMIT = Number(process.env.COACH_RPM_LIMIT ?? 15);
const isRpmLimited = createRpmLimiter(RPM_LIMIT);
const MODEL = process.env.GROQ_MODEL || "llama-3.1-8b-instant";

interface RequestBody {
  profile: { age: number; gender: string; weightKg: number; goal: string };
  session: {
    muscleGroups: string[];
    exercises: { name: string; sets: number; topWeightKg: number }[];
    totalSets: number;
    totalVolumeKg: number;
    caloriesBurned: number;
  };
  comparison: { exerciseName: string; previousBestWeightKg: number; latestBestWeightKg: number; deltaKg: number }[];
  nutrition: {
    consumed: { calories: number; proteinG: number; fatG: number; carbG: number };
    target: { calories: number; proteinG: number; fatG: number; carbG: number };
  };
}

// caloriesBurned is informational only — the app's TDEE already assumes moderate
// weekly activity (see calculateFitnessMetrics), so the prompt explicitly tells the
// model not to add it back on top of the daily calorie target (that would double-count).
function buildPrompt({ profile, session, comparison, nutrition }: RequestBody) {
  const goalLabel =
    profile.goal === "lose" ? "vazn yo'qotish" : profile.goal === "gain" ? "mushak massasi orttirish" : "vaznni saqlash";
  const genderLabel = profile.gender === "male" ? "erkak" : "ayol";
  const exerciseList = session.exercises
    .map((e) => `${e.name} (${e.sets} podxod, eng og'iri ${e.topWeightKg}kg)`)
    .join(", ");
  const remainingCalories = nutrition.target.calories - nutrition.consumed.calories;
  const remainingProtein = Math.max(0, nutrition.target.proteinG - nutrition.consumed.proteinG);
  const remainingCarb = Math.max(0, nutrition.target.carbG - nutrition.consumed.carbG);

  const comparisonText =
    comparison.length > 0
      ? `Oldingi mashg'ulot bilan solishtirish (bir xil mashqlar, eng og'ir podxod):\n${comparison
          .map(
            (c) =>
              `- ${c.exerciseName}: ${c.previousBestWeightKg}kg -> ${c.latestBestWeightKg}kg (${c.deltaKg >= 0 ? "+" : ""}${c.deltaKg}kg)`
          )
          .join("\n")}`
      : "Solishtirish uchun bu mashqlar bo'yicha oldingi mashg'ulot topilmadi (bu birinchi marta yoki mashqlar boshqacha).";

  return `Siz sport ozuqalanishi va tiklanish bo'yicha bilimli, ilmiy tadqiqotlarga (ISSN va ACSM tavsiyalari) tayanadigan fitnes murabbiysisiz. Foydalanuvchi hozirgina mashg'ulotni yakunladi.

Foydalanuvchi: ${profile.age} yosh, ${genderLabel}, ${profile.weightKg} kg, maqsad: ${goalLabel}.

Bugungi mashg'ulot:
- Mushak guruhlari: ${session.muscleGroups.join(", ")}
- Mashqlar: ${exerciseList}
- Jami ${session.totalSets} ta podxod, umumiy hajm (og'irlik x takror yig'indisi) ${Math.round(session.totalVolumeKg)} kg
- Taxminiy yoqilgan kaloriya: ${session.caloriesBurned} kcal (bu allaqachon kunlik TDEE hisobiga kiritilgan taxminiy faollik darajasiga kiradi — buni kunlik kaloriya maqsadiga QAYTA QO'SHIB hisoblamang)

Bugungi ovqatlanish holati:
- Iste'mol qilingan: ${nutrition.consumed.calories} kcal / ${nutrition.target.calories} kcal kunlik maqsad (qolgan: ${remainingCalories} kcal)
- Qolgan oqsil: ${remainingProtein}g, qolgan uglevod: ${remainingCarb}g

${comparisonText}

Vazifa — quyidagi ikki maydonni to'ldiring:
1. "recoveryAdvice": Mashg'ulotdan keyin ovqatlanish bo'yicha 2-3 gapli ANIQ tavsiya. Qolgan kaloriya/oqsil bo'shlig'iga asoslanib hozir yeyish mumkinmi yoki yo'qligini ayting, so'ng tiklanish uchun eng yaxshi 1 ta aniq taom namunasi taklif qiling (oqsil + uglevod manbai, tanish o'zbek taomlaridan). Eskirgan "30 daqiqalik oyna" mifidan foydalanmang — zamonaviy tadqiqotlarga ko'ra asosiysi kun davomida yetarli umumiy oqsil va bir necha soat ichida ovqatlanish.
2. "progressAdvice": ${comparison.length > 0 ? "Yuqoridagi solishtirish raqamlariga asoslanib" : "Bugungi hajm va podxodlar soniga asoslanib"} progressiv yuklama (progressive overload) tamoyiliga ko'ra 2-3 gapli aniq maslahat bering — keyingi mashg'ulotda og'irlik, takror yoki podxod sonini qanday oshirish yoki tiklanishga e'tibor qaratish kerakligini ayting.

Faqat quyidagi JSON formatida javob bering, boshqa hech narsa yozmang: {"recoveryAdvice": "...", "progressAdvice": "..."}`;
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
  if (!body?.profile || !body?.session || !body?.nutrition || !Array.isArray(body?.comparison)) {
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

  const { recoveryAdvice, progressAdvice } = parsed as { recoveryAdvice?: unknown; progressAdvice?: unknown };
  if (typeof recoveryAdvice !== "string" || typeof progressAdvice !== "string") {
    return NextResponse.json({ error: "AI javobi noto'g'ri formatda keldi." }, { status: 502 });
  }
  return NextResponse.json({ recoveryAdvice, progressAdvice });
}
