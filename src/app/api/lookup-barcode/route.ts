import { providerFetch } from "@/lib/provider-fetch";
import { readJson, record } from "@/lib/api-validation";
import { checkApiAccess } from "@/lib/api-access";
import { NextResponse } from "next/server";

// OpenFoodFacts bepul va key talab qilmaydi — shu sabab AI provayderlari kabi
// kvota emas, faqat serverimizni suiiste'moldan himoyalash uchun yengil,
// alohida limiter (scan-food'ning alohida-kvota namunasida).

interface OpenFoodFactsProduct {
  product_name?: string;
  quantity?: string;
  product_quantity?: number;
  nutriments?: {
    "energy-kcal_100g"?: number;
    energy_100g?: number;
    proteins_100g?: number;
    fat_100g?: number;
    carbohydrates_100g?: number;
  };
}

// Mahsulotning umumiy og'irligini (gramm) topishga urinadi — shu orqali
// mijoz tomonida "necha foizini yedingiz" ("hammasini yedim" = butun
// qadoqning 100%i) hisobi to'g'ri asosga tayanadi. `product_quantity` allaqachon
// gramm/ml'da raqam sifatida keladi (ml suyuqliklar uchun taxminan gramm bilan
// tenglashtiriladi); mavjud bo'lmasa `quantity` matnidan ("400 g", "33 cl") qo'lda o'qiladi.
function parsePackageGrams(product: OpenFoodFactsProduct): number | null {
  if (typeof product.product_quantity === "number" && product.product_quantity > 0) {
    return Math.round(product.product_quantity);
  }
  const raw = product.quantity;
  if (!raw) return null;
  const match = raw.match(/([\d]+(?:[.,]\d+)?)\s*(kg|g|l|cl|ml)?/i);
  if (!match) return null;
  const value = parseFloat(match[1].replace(",", "."));
  if (!Number.isFinite(value) || value <= 0) return null;
  const unit = (match[2] || "g").toLowerCase();
  const multiplier = unit === "kg" || unit === "l" ? 1000 : unit === "cl" ? 10 : 1;
  return Math.round(value * multiplier);
}

// scan-food'dagi bilan bir xil shaklda qaytaradi — shu tufayli analytics
// sahifasidagi tasdiqlash/jurnalga qo'shish UI'si ikkalasida ham qayta
// ishlatiladi. Qiymatlar 100g uchun; `packageGrams` (agar topilsa) va mijoz
// kiritgan "necha foiz yedim" birgalikda haqiqiy iste'mol miqdorini hisoblaydi.
export async function POST(request: Request) {
  const denied = await checkApiAccess("lookup-barcode");
  if (denied) return denied;

  const body = await readJson(request).catch(() => null);
  const code = record(body) && typeof body.code === "string" ? body.code.trim() : "";
  if (!code || !/^\d{6,14}$/.test(code)) {
    return NextResponse.json(
      {
        error:
          "Mahsulot kodi aniqlanmadi. QR-kod odatda shtrix-kod raqamini o'z ichiga olmaydi — iloji bo'lsa qadoqdagi chiziqli shtrix-kodni skanerlang.",
      },
      { status: 400 },
    );
  }

  let res: Response;
  try {
    res = await providerFetch(
      "barcode",
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=product_name,nutriments,quantity,product_quantity`,
      { headers: { "User-Agent": "AuraFit/1.0 (aurafit.app)" } },
    );
  } catch {
    return NextResponse.json({ error: "OpenFoodFacts bilan bog'lanib bo'lmadi." }, { status: 502 });
  }

  if (!res.ok) {
    return NextResponse.json({ error: `OpenFoodFacts xatosi (${res.status}).` }, { status: 502 });
  }

  const data = (await res.json().catch(() => null)) as {
    status?: number;
    product?: OpenFoodFactsProduct;
  } | null;
  if (!data || data.status !== 1 || !data.product) {
    // OpenFoodFacts ochiq, ko'ngillilar to'ldiradigan baza — mahalliy yoki
    // kam tanilgan mahsulotlar ko'pincha unda umuman yo'q (bu bug emas,
    // bazaning qamrov cheklovi). Shu sabab pastda "rasm orqali" muqobil
    // yo'lni ham taklif qilamiz (frontend'da).
    return NextResponse.json(
      {
        error:
          "Bu mahsulot OpenFoodFacts bazasida topilmadi — mahalliy yoki kam tanilgan mahsulotlar ko'pincha bazada yo'q. Buning o'rniga rasm orqali skanerlab ko'ring.",
      },
      { status: 404 },
    );
  }

  const nutriments = data.product.nutriments ?? {};
  const kcal100g =
    nutriments["energy-kcal_100g"] ??
    (nutriments.energy_100g != null ? Math.round(nutriments.energy_100g / 4.184) : 0);
  const packageGrams = parsePackageGrams(data.product);

  return NextResponse.json({
    mealName: data.product.product_name || "Noma'lum mahsulot",
    items: [],
    totalCalories: Math.round(kcal100g || 0),
    proteinG: Math.round(nutriments.proteins_100g || 0),
    fatG: Math.round(nutriments.fat_100g || 0),
    carbG: Math.round(nutriments.carbohydrates_100g || 0),
    note: "Qiymatlar 100 gramm uchun — quyida qancha qismini yeganingizni belgilang.",
    packageGrams,
  });
}
