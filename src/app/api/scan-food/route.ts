import { createHash } from "node:crypto";
import { createRequestCache } from "@/lib/request-cache";
import { readJson, record } from "@/lib/api-validation";
import { parseScanResponse, referencePromptList } from "@/lib/nutrition";
import { authorizeApi } from "@/lib/api-access";
import { NextResponse } from "next/server";
import { callDeepSeek, friendlyDeepSeekError, DEEPSEEK_MODEL } from "@/lib/deepseek-server";

// AI vazifasi: nima borligini aniqlash va porsiyani (gramm) baholash. Kaloriya va
// BJU hisobi, yig'indi va tekshiruv serverda (src/lib/nutrition.ts) — arifmetikani
// AI'ga qoldirmaymiz. Statik matn oldinda turadi, rasm esa oxirida: shunda DeepSeek
// prefiks keshi ishlaydi va takroriy so'rovlar arzonroq bo'ladi.
const PROMPT = `Siz tajribali ovqatlanish mutaxassisisiz. Rasmdagi taomni komponentlarga ajrating va har birining og'irligini (gramm) iloji boricha aniq baholang. Kaloriya hisobini biz o'zimiz qilamiz: sizning vazifangiz — nima borligini to'g'ri aniqlash va porsiyani to'g'ri baholash.

QOIDALAR
1. Har bir alohida taom yoki mahsulotni alohida komponent qiling (palov, non, salat, ichimlik, sous...). Murakkab taomni ichki qismlarga bo'lmang: palov — bitta komponent (guruch, go'sht, sabzi, yog' u yerga kiradi). Mayda narsalarni birlashtiring. Eng ko'pi bilan 8 ta komponent.
2. "ref" maydoniga quyidagi ro'yxatdan eng mos mahsulot identifikatorini yozing. Aniq mos keladigani bo'lmasa, ref ni null qiling va 100 g uchun kcalPer100g, proteinPer100g, fatPer100g, carbPer100g ni o'zingiz yozing (kaloriya ≈ 4·oqsil + 4·uglevod + 9·yog' bo'lsin).
3. grams — rasmda ko'ringan, yeyiladigan qismning (suyak, qobiq va idishsiz) og'irligi, gramm. Porsiyani idish (standart likopcha ~ 24-26 sm, choy piyolasi ~ 200-250 ml), vilka/qoshiq, qo'l, non va stakan bilan taqqoslab baholang. Odatiy og'irliklar: 1 tuxum ~ 50 g; 1 somsa ~ 110-130 g; 1 manti ~ 55 g; 1 chuchvara ~ 10 g; butun tandir non ~ 350 g, bir bo'lak non ~ 40-60 g; 1 banan (tozalangan) ~ 100 g; 1 olma ~ 170 g; 1 kotlet ~ 90 g; 1 lagan palov ~ 350-450 g; 1 piyola sho'rva ~ 300 g; 1 stakan ichimlik ~ 200 g; 1 osh qoshiq yog' ~ 15 g.
4. Yog'da qovurilgan yoki moyli taomlar uchun mos ref ni tanlang (qovurilgan kartoshka, qovurilgan baliq...) — yashirin yog'ni kamaytirib yubormang. Alohida ko'rinadigan sous, mayonez, smetana yoki yog'ni ayrim komponent qiling.
5. Bir narsani ikki marta sanamang.
6. confidence: "high" — hammasi aniq va o'lchamni taqqoslash mumkin; "medium" — porsiya taxminiy; "low" — rasm sifatsiz yoki porsiyani baholash qiyin.

MA'LUMOTNOMA (ref — nomi):
${referencePromptList()}

Faqat JSON bilan, o'zbek tilida javob bering. Namuna:
{"mealName":"Osh va non","components":[{"name":"Palov","ref":"plov","grams":350},{"name":"Non","ref":"non","grams":60},{"name":"Mahalliy shirinlik","ref":null,"grams":80,"kcalPer100g":400,"proteinPer100g":5,"fatPer100g":15,"carbPer100g":60}],"confidence":"medium","note":"..."}
note — porsiya yoki taom haqida bitta qisqa foydali jumla.
Agar rasmda ovqat bo'lmasa: {"mealName":"Aniqlanmadi","components":[],"confidence":"low","note":"sababi"}.`;

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
        maxTokens: 1200,
      });
      if (!attempt.ok) throw new Error(friendlyDeepSeekError(attempt));
      if (!attempt.text) throw new Error("AI javobi bo'sh keldi.");
      let parsed: unknown;
      try {
        parsed = JSON.parse(attempt.text);
      } catch {
        throw new Error("AI javobini o'qib bo'lmadi.");
      }
      if (record(parsed) && Array.isArray(parsed.components) && parsed.components.length === 0)
        throw new Error("Rasmda ovqat ko'rinmadi. Taomni aniqroq suratga oling.");
      const scan = parseScanResponse(parsed);
      if (!scan) throw new Error("AI javobi noto'g'ri.");
      return scan;
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
