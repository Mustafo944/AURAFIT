import { test, expect, type BrowserContext, type APIRequestContext } from "@playwright/test";
const backend = "http://127.0.0.1:54329";
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
  await page.getByRole("button", { name: "Shu rejani boshlash" }).first().click();
  await page.getByRole("spinbutton", { name: "Og'irlik", exact: true }).first().fill("40");
  await page.getByRole("spinbutton", { name: "Takror", exact: true }).first().fill("10");
  await page.getByRole("button", { name: "Podxod qo'shish" }).first().click();
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
test("workout templates survive navigation and do not pre-log sets", async ({ page, context, request }) => {
  await signIn(context, request);
  await page.goto("/workouts");
  await page.getByRole("button", { name: "Shu rejani boshlash" }).first().click();
  await page.getByPlaceholder("Masalan: Dushanba").fill("My workout");
  await page.getByRole("button", { name: "Shablonni saqlash" }).click();
  await expect(page.getByText("Shablon shu qurilmada saqlandi.")).toBeVisible();
  await page.getByRole("button", { name: "Bekor", exact: true }).click();
  await page.reload();
  await page
    .getByRole("button", { name: /My workout/ })
    .first()
    .click();
  await expect(page.getByRole("spinbutton", { name: "Og'irlik", exact: true }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /Mashg'ulotni yakunlash/i })).toBeDisabled();
});
test("saved meals can be added again with the selected meal type", async ({ page, context, request }) => {
  await request.post(`${backend}/__test/seed`, {
    data: {
      table: "meals",
      rows: [
        {
          id: "meal-1",
          user_id: "11111111-1111-4111-8111-111111111111",
          meal_name: "Test taom",
          meal_type: "breakfast",
          calories: 350,
          protein_g: 20,
          fat_g: 10,
          carb_g: 45,
          items: [],
          logged_at: new Date().toISOString(),
        },
      ],
    },
  });
  await signIn(context, request);
  await page.goto("/analytics");
  await page.getByText("Bugungi jurnaldan saqlash", { exact: true }).click();
  await page.getByRole("button", { name: "Test taom", exact: true }).click();
  await page.getByLabel(/Qaysi ovqatlanishga/).selectOption("lunch");
  await page.getByRole("button", { name: "Qo'shish", exact: true }).click();
  await expect
    .poll(async () => (await (await request.get(`${backend}/__test/rows`)).json()).meals.length)
    .toBe(2);
  const rows = await (await request.get(`${backend}/__test/rows`)).json();
  expect(rows.meals[1].meal_type).toBe("lunch");
  await page.reload();
  await expect(page.getByRole("button", { name: "Qo'shish", exact: true })).toBeVisible();
});
test("history loads beyond the first page without duplicates", async ({ page, context, request }) => {
  const rows = Array.from({ length: 60 }, (_, index) => {
    const date = new Date(Date.now() - index * 86400000).toISOString();
    return {
      id: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
      user_id: "11111111-1111-4111-8111-111111111111",
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
  await page.goto("/analytics");
  await expect(page.getByText(/Tahlil yuklangan 50 ta/)).toBeVisible();
  await page.getByRole("button", { name: "Eski tarixni ham yuklash" }).click();
  await expect(page.getByRole("button", { name: "Eski tarixni ham yuklash" })).toHaveCount(0);
});

test("exercise library combines filters, explains technique and preserves selection", async ({
  page,
  context,
  request,
}, testInfo) => {
  if (process.env.AURAFIT_VISUAL === "1") await page.unroute("**/_next/image?**");
  await signIn(context, request);
  await page.goto("/workouts");
  await page.getByRole("button", { name: /Mashg'ulotni Boshlash/ }).click();
  const library = page.getByRole("region", { name: "Mashqlar kutubxonasi" });
  await expect(library.getByRole("article")).toHaveCount(24);
  await library.getByRole("button", { name: /Yana 24/ }).click();
  await expect(library.getByRole("article")).toHaveCount(48);
  await library
    .getByRole("group", { name: "Mushak guruhi" })
    .getByRole("button", { name: /Ko'krak/ })
    .click();
  await library.getByLabel("Jihoz", { exact: true }).selectOption("bodyweight");
  await library.getByLabel("Tajriba darajasi").selectOption("beginner");
  if (process.env.AURAFIT_VISUAL === "1") {
    for (const picture of await library.getByRole("article").locator("img").all()) {
      await picture.scrollIntoViewIfNeeded();
      await expect(picture).toHaveJSProperty("complete", true);
      await expect(picture).not.toHaveJSProperty("naturalWidth", 0);
    }
    await library.scrollIntoViewIfNeeded();
    await page.screenshot({ path: testInfo.outputPath("exercise-catalog-preview.png"), fullPage: true });
  }
  await library.getByLabel("Mashq qidirish").fill("tayanchga");
  await expect(library.getByRole("article")).toHaveCount(1);
  const card = library.getByRole("article");
  await card.getByRole("button", { name: "Texnika", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Tayanchga suyanib otjimaniya" })).toBeVisible();
  if (process.env.AURAFIT_VISUAL === "1") {
    await expect(dialog.locator("img")).toHaveJSProperty("complete", true);
    await page.screenshot({ path: testInfo.outputPath("exercise-technique-preview.png") });
  }
  await dialog.getByRole("button", { name: "Yakun", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "Yakun", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await dialog.getByRole("button", { name: "Rejaga qo'shish", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(card.getByRole("button", { name: /tanlovdan olish/ })).toHaveAttribute("aria-pressed", "true");
  await library.getByLabel("Mashq qidirish").fill("not-an-exercise-xyz");
  await expect(library.getByText("Mos mashq topilmadi")).toBeVisible();
  await library.getByRole("button", { name: "Barcha mashqlarni ko'rish" }).click();
  await library.getByRole("button", { name: "Tanlanganlar (1)", exact: true }).click();
  await expect(library.getByRole("article")).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("exercise-library.png"), fullPage: true });
  await library.getByRole("button", { name: "Mashg'ulotga o'tish" }).click();
  await expect(page.getByText("Tayanchga suyanib otjimaniya", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("Tayanchga suyanib otjimaniya", { exact: true })).toBeVisible();
});

test("favorites and reordered plans persist; compact view and comparison work", async ({
  page,
  context,
  request,
}, testInfo) => {
  if (process.env.AURAFIT_VISUAL === "1") await page.unroute("**/_next/image?**");
  await signIn(context, request);
  await page.goto("/workouts");
  await page.getByRole("button", { name: /Mashg'ulotni Boshlash/ }).click();
  const library = page.getByRole("region", { name: "Mashqlar kutubxonasi" });
  await library.getByLabel("Mashq qidirish").fill("tayanchga");
  const first = library.getByRole("article");
  await first.getByRole("button", { name: /: sevimli$/ }).click();
  await expect(first.getByRole("button", { name: /: sevimli$/ })).toHaveAttribute("aria-pressed", "true");
  await first.getByRole("button", { name: /rejaga qo'shish/ }).click();
  await library.getByLabel("Mashq qidirish").fill("dead bug");
  await library
    .getByRole("article")
    .getByRole("button", { name: /rejaga qo'shish/ })
    .click();
  const plan = library.locator('details[aria-label="Mashqlar tartibi"]');
  await plan.locator("summary").click();
  await expect(plan.getByRole("listitem").first()).toContainText("Tayanchga suyanib otjimaniya");
  await plan
    .getByRole("listitem")
    .nth(1)
    .getByRole("button", { name: /yuqoriga/ })
    .click();
  await expect(plan.getByRole("listitem").first()).toContainText("Chalqancha qarama-qarshi");
  await expect(
    plan
      .getByRole("listitem")
      .first()
      .getByRole("button", { name: /yuqoriga/ }),
  ).toBeDisabled();
  await library.getByLabel("Mashq qidirish").fill("");
  await library.getByRole("button", { name: "Sevimlilar (1)", exact: true }).click();
  await library.getByLabel("Mashqlarni saralash").selectOption("name");
  await library.getByRole("button", { name: "Ixcham ro'yxat", exact: true }).click();
  await expect(library.getByRole("article")).toHaveCount(1);
  await expect(library.getByRole("button", { name: "Ixcham ro'yxat", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("compact-plan.png"), fullPage: true });
  await library.getByRole("article").getByRole("button", { name: "Texnika", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Ikki holatni solishtirish" }).click();
  await expect(dialog.locator("img")).toHaveCount(2);
  if (process.env.AURAFIT_VISUAL === "1") {
    for (const picture of await dialog.locator("img").all()) {
      await expect(picture).toHaveJSProperty("complete", true);
      await expect(picture).not.toHaveJSProperty("naturalWidth", 0);
    }
  }
  await page.screenshot({ path: testInfo.outputPath("comparison.png") });
  await dialog.getByRole("button", { name: "Qo'llanmani yopish" }).click();
  await page.reload();
  await page.getByRole("button", { name: /Mashq Qo'shish/ }).click();
  await expect(library.getByRole("button", { name: "Sevimlilar (1)", exact: true })).toBeVisible();
  await plan.locator("summary").click();
  await expect(plan.getByRole("listitem").first()).toContainText("Chalqancha qarama-qarshi");
  await library.getByRole("button", { name: "Sevimlilar (1)", exact: true }).click();
  await library
    .getByRole("article")
    .getByRole("button", { name: /: sevimli$/ })
    .click();
  await expect(library.getByRole("button", { name: "Sevimlilar (0)", exact: true })).toBeVisible();
  await expect(library.getByRole("article")).toHaveCount(0);
});
