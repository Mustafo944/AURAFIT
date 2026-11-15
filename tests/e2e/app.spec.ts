import { deflateSync } from "node:zlib";
import { test, expect, type BrowserContext, type APIRequestContext } from "@playwright/test";
const backend = "http://127.0.0.1:54329";

// Brauzer haqiqatan dekodlay oladigan 1x1 PNG (rasm yuklash testlari uchun).
function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function pngChunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, checksum]);
}
function tinyPng(): Buffer {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(1, 0);
  header.writeUInt32BE(1, 4);
  header[8] = 8; // bit chuqurligi
  header[9] = 2; // RGB
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", header),
    pngChunk("IDAT", deflateSync(Buffer.from([0, 255, 0, 0]))),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

async function signIn(context: BrowserContext, request: APIRequestContext, userId?: string) {
  const response = await request.get(`${backend}/__test/session${userId ? `?user=${userId}` : ""}`);
  const session = await response.json();
  const value = `base64-${Buffer.from(JSON.stringify(session)).toString("base64url")}`;
  await context.addCookies([
    { name: "sb-127-auth-token", value, domain: "127.0.0.1", path: "/", httpOnly: false, sameSite: "Lax" },
  ]);
}

test.beforeEach(async ({ request, page }) => {
  await request.post(`${backend}/__test/reset`);
  await page.route("**/_next/image?**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "image/png",
      body: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jN1cAAAAASUVORK5CYII=",
        "base64",
      ),
    }),
  );
});
test("anonymous requests are redirected and API access is denied", async ({ page, request }) => {
  await page.goto("/workouts");
  await expect(page).toHaveURL(/login/);
  await expect(page.getByRole("heading", { name: "Tizimga Kirish" })).toBeVisible();
  const response = await request.post("http://127.0.0.1:3100/api/scan-food", { data: {} });
  expect(response.status()).toBe(401);
  const fallback = await request.get("http://127.0.0.1:3100/offline.html");
  expect(fallback.status()).toBe(200);
  expect(fallback.url()).toContain("/offline.html");
  expect(await fallback.text()).toContain("Internetga ulaning");
});
test("profile preferences persist and survive reload", async ({ page, context, request }) => {
  await signIn(context, request);
  await page.goto("/profile");
  await page.getByRole("button", { name: /Shaxsiy Ma.lumotlar/ }).click();
  await page.getByLabel("Faollik darajasi").selectOption("light");
  await page.getByLabel("Haftada necha kun?").selectOption("4");
  await page.getByRole("button", { name: "Saqlash", exact: true }).click();
  await expect
    .poll(async () => (await (await request.get(`${backend}/__test/rows`)).json()).profiles[0].activity_level)
    .toBe("light");
  await page.reload();
  await page.getByRole("button", { name: /Shaxsiy Ma.lumotlar/ }).click();
  await expect(page.getByLabel("Faollik darajasi")).toHaveValue("light");
  await expect(page.getByLabel("Haftada necha kun?")).toHaveValue("4");
});
test("weight history saves and renders a chart", async ({ page, context, request }) => {
  await signIn(context, request);
  await page.goto("/analytics");
  await page.getByRole("button", { name: /^monitor_weight Vazn/ }).click();
  await page.getByLabel("Bugungi vazn (kg)").fill("79.5");
  await page.getByRole("button", { name: "Vaznni yozish" }).click();
  await expect
    .poll(async () => (await (await request.get(`${backend}/__test/rows`)).json()).body_weight_logs.length)
    .toBe(1);
  await page.getByLabel("Bugungi vazn (kg)").fill("79.1");
  await page.getByRole("button", { name: "Vaznni yozish" }).click();
  await expect(page.getByRole("img", { name: /So'nggi 30 yozuv/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
test("offline workout survives reload, syncs and can be deleted", async ({ page, context, request }) => {
  await signIn(context, request);
  await page.goto("/workouts");
  await page.getByRole("button", { name: /Push/ }).click();
  await page.getByRole("spinbutton", { name: "1-podxod og'irligi, kilogramm" }).fill("40");
  await page.getByRole("spinbutton", { name: "1-podxod takrori" }).fill("10");
  await page.getByRole("button", { name: "1-podxodni saqlash" }).click();
  await expect(page.getByRole("timer")).toBeVisible();
  await context.setOffline(true);
  await page.getByRole("button", { name: /Mashg'ulotni yakunlash/i }).click();
  await expect(page.getByRole("heading", { name: /Mashg.ulot Yakunlandi/i })).toBeVisible();
  await request.post(`${backend}/__test/fail`, { data: { enabled: true } });
  await context.setOffline(false);
  await page.reload();
  await expect(page.getByText(/Serverga yuborilmadi/)).toBeVisible();
  await request.post(`${backend}/__test/fail`, { data: { enabled: false } });
  await page.getByRole("button", { name: "Qayta urinish", exact: true }).first().click();
  await expect
    .poll(async () => (await (await request.get(`${backend}/__test/rows`)).json()).workout_sessions.length)
    .toBe(1);
  await page.getByRole("button", { name: /Mashg.ulot tarixi/ }).click();
  await page.getByRole("button", { name: /Bugungi Mashg'ulot/ }).click();
  await page.getByRole("button", { name: /Mashg.ulotni O.chirish/i }).click();
  await page.getByRole("button", { name: /Ha, O.chir/ }).click();
  await expect
    .poll(async () => (await (await request.get(`${backend}/__test/rows`)).json()).workout_sessions.length)
    .toBe(0);
});
test("login form establishes a session and logout removes access", async ({ page }) => {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill("test@example.com");
  await page.locator('input[name="password"]').fill("fixture-password");
  await page.getByRole("button", { name: /^Kirish/ }).click();
  await expect(page).toHaveURL("http://127.0.0.1:3100/");
  await page.goto("/profile");
  await page
    .getByRole("button", { name: /Chiqish/ })
    .last()
    .click();
  await page.getByRole("button", { name: "Ha, Chiqish", exact: true }).click();
  await expect(page).toHaveURL(/login/);
  await page.goto("/workouts");
  await expect(page).toHaveURL(/login/);
});

const USER_ID = "11111111-1111-4111-8111-111111111111";

test("workout history loads older months beyond the first page", async ({ page, context, request }) => {
  const rows = Array.from({ length: 60 }, (_, index) => {
    const date = new Date(Date.now() - index * 86400000).toISOString();
    return {
      id: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
      user_id: USER_ID,
      started_at: date,
      finished_at: date,
      exercises: [],
      cardio: [],
      total_sets: 0,
      total_volume_kg: 0,
      calories_burned: 0,
    };
  });
  await request.post(`${backend}/__test/seed`, { data: { table: "workout_sessions", rows } });
  await signIn(context, request);
  await page.goto("/workouts");
  await page.getByRole("button", { name: /Mashg.ulot tarixi/ }).click();
  const marked = page.getByRole("button", { name: /mashg.ulot bor/ });
  await expect(marked.first()).toBeVisible();
  // Ikki oy orqaga: birinchi sahifa (50 kun) yetmaydi, qolgani avtomatik yuklanadi.
  await page.getByRole("button", { name: "Oldingi oy" }).click();
  await page.getByRole("button", { name: "Oldingi oy" }).click();
  await expect(marked.first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("start panel: a ready program starts a prepared plan", async ({ page, context, request }) => {
  await signIn(context, request);
  await page.goto("/workouts");
  await expect(page.getByRole("button", { name: "Takrorlash" })).toHaveCount(0);
  await page.getByRole("button", { name: /Push/ }).click();
  await expect(page.getByText("Shtanga Yotib Zhim (O'rta Ushlab)").first()).toBeVisible();
  await expect(page.getByRole("button", { name: /Mashg'ulotni yakunlash/i })).toBeDisabled();
  await page.reload();
  await expect(page.getByText("Shtanga Yotib Zhim (O'rta Ushlab)").first()).toBeVisible();
});

test("start panel: the last workout can be repeated and the draft can be cancelled", async ({
  page,
  context,
  request,
}) => {
  const finishedAt = new Date(Date.now() - 3 * 86400000).toISOString();
  await request.post(`${backend}/__test/seed`, {
    data: {
      table: "workout_sessions",
      rows: [
        {
          id: "33333333-3333-4333-8333-333333333333",
          user_id: USER_ID,
          started_at: finishedAt,
          finished_at: finishedAt,
          exercises: [
            {
              exerciseId: "Pushups",
              exerciseName: "Klassik Otjimaniye (Push-Up)",
              muscleGroup: "chest",
              sets: [{ weightKg: 0, reps: 12 }],
            },
          ],
          cardio: [],
          total_sets: 1,
          total_volume_kg: 0,
          calories_burned: 20,
        },
      ],
    },
  });
  await signIn(context, request);
  await page.goto("/workouts");
  await expect(page.getByText(/3 kun oldin/)).toBeVisible();
  await page.getByRole("button", { name: "Takrorlash" }).click();
  await expect(page.getByText("Klassik Otjimaniye (Push-Up)").first()).toBeVisible();
  // O'tgan natija bo'yicha qiymatlar oldindan to'ldirilgan.
  await expect(page.getByRole("spinbutton", { name: "1-podxod takrori" })).toHaveValue("12");
  await page.getByRole("button", { name: "Mashg'ulotni bekor qilish" }).click();
  await page.getByRole("button", { name: /Ha, o.chirish/ }).click();
  await expect(page.getByRole("button", { name: "Takrorlash" })).toBeVisible();
});

test("exercise picker filters, explains technique and preserves the selection", async ({
  page,
  context,
  request,
}) => {
  await signIn(context, request);
  await page.goto("/workouts");
  await page.getByRole("button", { name: "O'zim tanlayman" }).click();
  const picker = page.getByRole("region", { name: "Mashq tanlash" });
  const rows = picker.locator("ul > li");
  await expect(rows).toHaveCount(30);
  await picker.getByRole("button", { name: /^Yana 30/ }).click();
  await expect(rows).toHaveCount(60);
  await picker.getByRole("group", { name: "Mushak guruhi" }).getByRole("button", { name: /Ko'krak/ }).click();
  await picker.getByRole("button", { name: "Jihoz va daraja filtrlari" }).click();
  await picker.getByLabel("Jihoz", { exact: true }).selectOption("bodyweight");
  await picker.getByLabel("Daraja", { exact: true }).selectOption("beginner");
  await picker.getByLabel("Mashq qidirish").fill("tayanchga");
  await expect(rows).toHaveCount(1);
  await picker.getByRole("button", { name: /texnikani ko'rish/ }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Tayanchga suyanib otjimaniya" })).toBeVisible();
  await dialog.getByRole("button", { name: "Rejaga qo'shish", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(picker.getByRole("button", { name: /tanlovdan olish/ })).toHaveAttribute("aria-pressed", "true");
  await picker.getByLabel("Mashq qidirish").fill("not-an-exercise-xyz");
  await expect(picker.getByText("Mos mashq topilmadi")).toBeVisible();
  await picker.getByRole("button", { name: "Barcha mashqlarni ko'rish" }).click();
  await picker.getByRole("button", { name: "Tanlanganlar (1)", exact: true }).click();
  await expect(rows).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await picker.getByRole("button", { name: "Mashg'ulotga o'tish" }).click();
  await expect(page.getByText("Tayanchga suyanib otjimaniya", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("Tayanchga suyanib otjimaniya", { exact: true })).toBeVisible();
});

test("favorites and reordered plans persist; technique comparison works", async ({ page, context, request }) => {
  await signIn(context, request);
  await page.goto("/workouts");
  await page.getByRole("button", { name: "O'zim tanlayman" }).click();
  const picker = page.getByRole("region", { name: "Mashq tanlash" });
  const rows = picker.locator("ul > li");
  await picker.getByLabel("Mashq qidirish").fill("tayanchga");
  await rows.first().getByRole("button", { name: /: sevimli$/ }).click();
  await expect(rows.first().getByRole("button", { name: /: sevimli$/ })).toHaveAttribute("aria-pressed", "true");
  await rows.first().getByRole("button", { name: /rejaga qo'shish/ }).click();
  await picker.getByLabel("Mashq qidirish").fill("dead bug");
  await rows.first().getByRole("button", { name: /rejaga qo'shish/ }).click();
  const plan = picker.locator('details[aria-label="Mashqlar tartibi"]');
  await plan.locator("summary").click();
  await expect(plan.getByRole("listitem").first()).toContainText("Tayanchga suyanib otjimaniya");
  await plan.getByRole("listitem").nth(1).getByRole("button", { name: /yuqoriga/ }).click();
  await expect(plan.getByRole("listitem").first()).toContainText("Chalqancha qarama-qarshi");
  await expect(plan.getByRole("listitem").first().getByRole("button", { name: /yuqoriga/ })).toBeDisabled();
  await picker.getByLabel("Mashq qidirish").fill("");
  await picker.getByRole("button", { name: "Sevimlilar (1)", exact: true }).click();
  await expect(rows).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await rows.first().getByRole("button", { name: /texnikani ko'rish/ }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Ikki holatni solishtirish" }).click();
  await expect(dialog.locator("img")).toHaveCount(2);
  await dialog.getByRole("button", { name: "Qo'llanmani yopish" }).click();
  await page.reload();
  await page.getByRole("button", { name: /Mashq Qo'shish/ }).click();
  await expect(picker.getByRole("button", { name: "Sevimlilar (1)", exact: true })).toBeVisible();
  await plan.locator("summary").click();
  await expect(plan.getByRole("listitem").first()).toContainText("Chalqancha qarama-qarshi");
  await picker.getByRole("button", { name: "Sevimlilar (1)", exact: true }).click();
  await rows.first().getByRole("button", { name: /: sevimli$/ }).click();
  await expect(picker.getByRole("button", { name: "Sevimlilar (0)", exact: true })).toBeVisible();
  await expect(rows).toHaveCount(0);
});

test("food scan: component grams are editable and totals are recalculated live", async ({ page, context, request }) => {
  await page.route("**/api/scan-food", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        mealName: "Osh va non",
        items: ["Palov", "Non"],
        components: [
          { name: "Palov", ref: "plov", grams: 350, per100g: { kcal: 195, proteinG: 6, fatG: 9, carbG: 22.5 } },
          { name: "Non", ref: "non", grams: 100, per100g: { kcal: 265, proteinG: 9, fatG: 3.2, carbG: 49 } },
        ],
        totalCalories: 948,
        proteinG: 30,
        fatG: 35,
        carbG: 128,
        note: "Porsiya katta",
        confidence: "medium",
      }),
    }),
  );
  await signIn(context, request);
  await page.goto("/analytics");
  await page.getByRole("button", { name: /Tushlik/ }).click();
  await page.locator('input[type="file"]').setInputFiles({
    name: "meal.png",
    mimeType: "image/png",
    buffer: tinyPng(),
  });
  await expect(page.getByLabel("Palov: og'irlik, gramm")).toHaveValue("350");
  await expect(page.getByText("948", { exact: true }).first()).toBeVisible();
  await page.getByLabel("Palov: og'irlik, gramm").fill("200");
  // 200 g palov (390) + 100 g non (265) = 655
  await expect(page.getByText("655", { exact: true }).first()).toBeVisible();
  await page.getByRole("button", { name: "Non: ro'yxatdan olib tashlash" }).click();
  await expect(page.getByText("390", { exact: true }).first()).toBeVisible();
  await page.getByRole("button", { name: "Jurnalga Qo'shish" }).click();
  await expect
    .poll(async () => (await (await request.get(`${backend}/__test/rows`)).json()).meals.length)
    .toBe(1);
  const rows = await (await request.get(`${backend}/__test/rows`)).json();
  expect(rows.meals[0].calories).toBe(390);
  expect(rows.meals[0].meal_type).toBe("lunch");
});

