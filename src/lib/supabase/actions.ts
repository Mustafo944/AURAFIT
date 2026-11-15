"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { friendlyAuthError, isValidEmail, normalizeEmail, parseVerificationCode, retryAfterSeconds } from "@/lib/auth-input";

function isRedirectError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "digest" in err &&
    typeof (err as { digest: unknown }).digest === "string" &&
    ((err as { digest: string }).digest.startsWith("NEXT_REDIRECT") ||
      (err as { digest: string }).digest.startsWith("NEXT_NOT_FOUND"))
  );
}

const NETWORK_ERROR =
  "Serverga ulanib bo'lmadi. Supabase ma'lumotlar bazasi 'Paused' bo'lishi yoki internet uzilgan bo'lishi mumkin.";

// Supabase bir emailga 60 soniyada bir marta kod yuboradi.
const RESEND_COOLDOWN_SECONDS = 60;

function verifyUrl(
  email: string,
  params: { message?: string; error?: string; cooldownSeconds?: number } = {},
): string {
  const { cooldownSeconds, ...text } = params;
  const query = new URLSearchParams({ email });
  if (text.message) query.set("message", text.message);
  if (text.error) query.set("error", text.error);
  // Mutlaq vaqt (epoch ms): sahifa yangilansa ham sanoq to'g'ri davom etadi.
  if (cooldownSeconds) query.set("resendAt", String(Date.now() + cooldownSeconds * 1000));
  return `/signup/verify?${query.toString()}`;
}

function isEmailRateLimit(error: { status?: number; code?: string; message: string }): boolean {
  return (
    error.status === 429 ||
    error.code === "over_email_send_rate_limit" ||
    retryAfterSeconds(error.message) !== null
  );
}

export async function signIn(formData: FormData) {
  const email = normalizeEmail(formData.get("email"));
  const password = String(formData.get("password") ?? "");

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      // Email hali tasdiqlanmagan: foydalanuvchini kod kiritish sahifasiga olib boramiz.
      if (error.code === "email_not_confirmed" && isValidEmail(email)) {
        redirect(verifyUrl(email, { message: "Emailingiz tasdiqlanmagan. Pochtaga kelgan kodni kiriting." }));
      }
      redirect(`/login?error=${encodeURIComponent(friendlyAuthError(error.message) ?? error.message)}`);
    }
  } catch (err) {
    if (isRedirectError(err)) throw err;
    redirect(`/login?error=${encodeURIComponent(NETWORK_ERROR)}`);
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function signUp(formData: FormData) {
  const email = normalizeEmail(formData.get("email"));
  const password = String(formData.get("password") ?? "");

  if (!isValidEmail(email)) {
    redirect(`/signup?error=${encodeURIComponent("Email manzili noto'g'ri.")}`);
  }
  if (password.length < 8) {
    redirect(`/signup?error=${encodeURIComponent("Parol kamida 8 belgidan iborat bo'lishi kerak.")}`);
  }

  let failure: string | null = null;
  let signedIn = false;
  let cooldownSeconds = RESEND_COOLDOWN_SECONDS;
  let message: string | undefined;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error && isEmailRateLimit(error)) {
      // Kod yaqinda yuborilgan (masalan, tugma ikki marta bosilgan): yangi kod so'ramay, kod sahifasiga o'tamiz.
      cooldownSeconds = retryAfterSeconds(error.message) ?? RESEND_COOLDOWN_SECONDS;
      message = "Kod yaqinda yuborilgan. Pochtangizni tekshiring.";
    } else if (error) failure = error.message;
    // Supabase'da "Confirm email" o'chiq bo'lsa, sessiya darhol qaytadi.
    else signedIn = Boolean(data.session);
  } catch {
    failure = NETWORK_ERROR;
  }

  if (failure) redirect(`/signup?error=${encodeURIComponent(failure)}`);
  if (signedIn) {
    revalidatePath("/", "layout");
    redirect("/onboarding");
  }
  // Email mavjudligini oshkor qilmaslik uchun natija har doim bir xil: kod sahifasi.
  redirect(verifyUrl(email, { message, cooldownSeconds }));
}

// Emailga yuborilgan kod bilan ro'yxatdan o'tishni yakunlaydi (va tizimga kiritadi).
export async function verifyEmailCode(formData: FormData) {
  const email = normalizeEmail(formData.get("email"));
  if (!isValidEmail(email)) redirect("/signup");
  const token = parseVerificationCode(formData.get("code"));
  if (!token) redirect(verifyUrl(email, { error: "Kodni to'liq kiriting (faqat raqamlar)." }));

  let failure: string | null = null;
  try {
    const supabase = await createClient();
    // "email" turi ro'yxatdan o'tish kodini ham qabul qiladi ("signup" turi eskirgan).
    const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
    if (error) {
      // Supabase noto'g'ri va eskirgan kodni bitta "otp_expired" bilan qaytaradi.
      failure =
        "Kod noto'g'ri yoki eskirgan. Pochtadagi eng oxirgi kodni kiriting yoki yangi kod so'rang.";
    }
  } catch {
    failure = NETWORK_ERROR;
  }

  if (failure) redirect(verifyUrl(email, { error: failure }));
  revalidatePath("/", "layout");
  // Yangi hisob: avval qisqa tanishuv anketasi (jins, yosh, bo'y, vazn, maqsad).
  redirect("/onboarding");
}

// Kod kelmagan yoki muddati o'tgan bo'lsa, yangisini yuboradi (Supabase 60 soniyada bir martaga cheklaydi).
export async function resendEmailCode(formData: FormData) {
  const email = normalizeEmail(formData.get("email"));
  if (!isValidEmail(email)) redirect("/signup");

  let failure: string | null = null;
  let cooldownSeconds = RESEND_COOLDOWN_SECONDS;
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.resend({ type: "signup", email });
    if (error && isEmailRateLimit(error)) {
      cooldownSeconds = retryAfterSeconds(error.message) ?? RESEND_COOLDOWN_SECONDS;
      failure = "Yangi kodni biroz keyin so'rash mumkin. Sanoq tugashini kuting.";
    } else if (error) {
      failure = "Kodni yuborib bo'lmadi. Birozdan keyin qayta urinib ko'ring.";
      cooldownSeconds = 0;
    }
  } catch {
    failure = NETWORK_ERROR;
    cooldownSeconds = 0;
  }

  redirect(
    failure
      ? verifyUrl(email, { error: failure, cooldownSeconds })
      : verifyUrl(email, { message: "Yangi kod yuborildi. Eng oxirgi kodni kiriting.", cooldownSeconds }),
  );
}

export async function signOut() {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch {
    // Chiqish vaqtida tarmoq xatosi bo'lsa ham cookie'lar tozalanib login sahifasiga qaytariladi
  }
  revalidatePath("/", "layout");
  redirect("/login");
}
