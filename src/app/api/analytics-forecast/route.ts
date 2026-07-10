import { NextResponse } from "next/server";
import { callGroq, friendlyGroqError } from "@/lib/groq-server";
import { createRpmLimiter } from "@/lib/rate-limiter";

const RPM_LIMIT = Number(process.env.COACH_RPM_LIMIT ?? 15);
const isRpmLimited = createRpmLimiter(RPM_LIMIT);
const MODEL = process.env.GROQ_MODEL || "llama-3.1-8b-instant";

interface RequestBody {
  goal: "lose" | "maintain" | "gain";
  formulaTdee: number;
  calibratedTdee:
    | { status: "ok"; calibratedTdee: number; confidence: "high" | "medium"; weightDataPoints: number; mealDataDays: number }
    | { status: "insufficient"; weightDataPoints: number; mealDataDays: number };
  weightForecast:
    | { status: "ok"; latestWeightKg: number; slopeKgPerWeek: number; projectedIn30DaysKg: number; etaToGoalDays: number | null }
    | { status: "insufficient"; latestWeightKg?: number };
  hasGoalDiscrepancy: boolean;
  weeklyActivity: { avgSessionsPerWeek: number; weeksTracked: number };
  muscleBalance: { muscleGroup: string; volumeKg: number }[];
}

// Barcha raqamlar (kalibrlangan TDEE, vazn trendi, haftalik faollik, mushak
// balansi) TypeScript'da (src/lib/forecast.ts) hisoblab bo'lingan — bu yerda
// AI faqat ularni izohlaydi va tavsiya beradi, hech qanday raqamni qayta
// hisoblamaydi (profile-insight/coach-advice bilan bir xil qat'iy qoida).
function buildPrompt({ goal, formulaTdee, calibratedTdee, weightForecast, hasGoalDiscrepancy, weeklyActivity, muscleBalance }: RequestBody) {
  const goalLabel = goal === "lose" ? "vazn yo'qotish" : goal === "gain" ? "mushak massasi orttirish" : "vaznni saqlash";

  const tdeeLine =
    calibratedTdee.status === "ok"
      ? `Kalibrlangan TDEE (haqiqiy vazn o'zgarishi va ovqat qabuliga asoslangan): ${calibratedTdee.calibratedTdee} kcal (ishonch darajasi: ${calibratedTdee.confidence === "high" ? "yuqori" : "o'rta"}, ${calibratedTdee.weightDataPoints} ta vazn yozuvi, ${calibratedTdee.mealDataDays} kun ovqat ma'lumoti asosida). Formula (Mifflin-St Jeor) TDEE: ${formulaTdee} kcal.`
      : `Kalibrlangan TDEE hali hisoblanmadi (${calibratedTdee.weightDataPoints} ta vazn yozuvi, ${calibratedTdee.mealDataDays} kun ovqat ma'lumoti bor — kamida 5 ta vazn yozuvi va 7 kun ovqat ma'lumoti kerak). Formula (Mifflin-St Jeor) TDEE: ${formulaTdee} kcal.`;

  const weightLine =
    weightForecast.status === "ok"
      ? `Vazn trendi: haftasiga ${weightForecast.slopeKgPerWeek > 0 ? "+" : ""}${weightForecast.slopeKgPerWeek} kg. Joriy vazn: ${weightForecast.latestWeightKg} kg. 30 kundan keyingi prognoz: ${weightForecast.projectedIn30DaysKg} kg.${
          weightForecast.etaToGoalDays != null ? ` Maqsad vaznga taxminan ${weightForecast.etaToGoalDays} kunda yetadi.` : ""
        }`
      : `Vazn trendini hisoblash uchun hali yetarli ma'lumot yo'q (kamida 3 marta vazn qayd etilishi kerak).`;

  const discrepancyLine = hasGoalDiscrepancy
    ? `MUHIM NOMUVOFIQLIK: foydalanuvchining maqsadi "${goalLabel}", lekin haqiqiy vazn trendi bunga zid yo'nalishda ketmoqda.`
    : "";

  const activityLine = `Haftalik mashg'ulot faolligi: so'nggi ${weeklyActivity.weeksTracked} haftada o'rtacha ${weeklyActivity.avgSessionsPerWeek} ta mashg'ulot/hafta.`;

  const muscleLine =
    muscleBalance.length > 0
      ? `So'nggi 30 kunda mushak guruhlari bo'yicha hajm (kg, kamayish tartibida): ${muscleBalance
          .map((m) => `${m.muscleGroup} ${m.volumeKg}kg`)
          .join(", ")}.`
      : "";

  return `Siz tajribali fitnes va ozuqalanish tahlilchisisiz. Quyida formula va statistik hisob-kitob (chiziqli regressiya) orqali aniq hisoblangan ko'rsatkichlar berilgan (bu raqamlar to'g'ri — qayta hisoblamang, faqat izohlang).

Foydalanuvchi maqsadi: ${goalLabel}.

${tdeeLine}
${weightLine}
${discrepancyLine}
${activityLine}
${muscleLine}

Vazifa:
1. "summary": foydalanuvchining hozirgi holati haqida 2-3 gapli xulosa (o'zbek tilida) — real ma'lumotlar formula bilan mos keladimi, qanday holatda ekani.
2. "forecast": kelajak prognozi haqida 1-2 gapli izoh (vazn trendi shu sur'atda davom etsa nima bo'ladi).
3. "tips": aynan shu ma'lumotlarga mos 3 ta qisqa, amaliy tavsiya (har biri bitta jumla).
4. "warnings": agar nomuvofiqlik yoki e'tiborga molik holat bo'lsa (masalan maqsadga zid trend, yoki ma'lumot yetarli emas), 0-2 ta qisqa ogohlantirish; aks holda bo'sh massiv.

Faqat quyidagi JSON formatida javob bering, boshqa hech narsa yozmang: {"summary": "...", "forecast": "...", "tips": ["...", "...", "..."], "warnings": []}`;
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
    return NextResponse.json({ error: "GROQ_API_KEY sozlanmagan. .env.local faylida kalitni kiriting." }, { status: 500 });
  }

  const body = (await request.json().catch(() => null)) as RequestBody | null;
  if (!body?.goal || !body?.calibratedTdee || !body?.weightForecast || !body?.weeklyActivity) {
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

  const { summary, forecast, tips, warnings } = parsed as {
    summary?: unknown;
    forecast?: unknown;
    tips?: unknown;
    warnings?: unknown;
  };
  if (typeof summary !== "string" || typeof forecast !== "string") {
    return NextResponse.json({ error: "AI javobi noto'g'ri formatda keldi." }, { status: 502 });
  }
  const safeTips = Array.isArray(tips) ? tips.filter((t): t is string => typeof t === "string") : [];
  const safeWarnings = Array.isArray(warnings) ? warnings.filter((w): w is string => typeof w === "string") : [];
  return NextResponse.json({ summary, forecast, tips: safeTips, warnings: safeWarnings });
}
