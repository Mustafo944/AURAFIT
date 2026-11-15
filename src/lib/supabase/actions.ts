"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isValidEmail, normalizeEmail, parseVerificationCode } from "@/lib/auth-input";

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

function verifyUrl(email: string, params: { message?: string; error?: string } = {}): string {
  const query = new URLSearchParams({ email, ...params });
  return `/signup/verify?${query.toString()}`;
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
      redirect(`/login?error=${encodeURIComponent(error.message)}`);
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
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) failure = error.message;
    // Supabase'da "Confirm email" o'chiq bo'lsa, sessiya darhol qaytadi.
    else signedIn = Boolean(data.session);
  } catch {
    failure = NETWORK_ERROR;
  }

  if (failure) redirect(`/signup?error=${encodeURIComponent(failure)}`);
  if (signedIn) {
    revalidatePath("/", "layout");
    redirect("/");
  }
  // Email mavjudligini oshkor qilmaslik uchun natija har doim bir xil: kod sahifasi.
  redirect(verifyUrl(email));
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
    const { error } = await supabase.auth.verifyOtp({ email, token, type: "signup" });
    if (error) {
      failure =
        error.code === "otp_expired"
          ? "Kod muddati tugagan. Yangi kod so'rang."
          : "Kod noto'g'ri. Tekshirib qayta kiriting yoki yangi kod so'rang.";
    }
  } catch {
    failure = NETWORK_ERROR;
  }

  if (failure) redirect(verifyUrl(email, { error: failure }));
  revalidatePath("/", "layout");
  redirect("/");
}

// Kod kelmagan yoki muddati o'tgan bo'lsa, yangisini yuboradi (Supabase 60 soniyada bir martaga cheklaydi).
export async function resendEmailCode(formData: FormData) {
  const email = normalizeEmail(formData.get("email"));
  if (!isValidEmail(email)) redirect("/signup");

  let failure: string | null = null;
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.resend({ type: "signup", email });
    if (error) {
      failure =
        error.status === 429 || error.code === "over_email_send_rate_limit"
          ? "Juda tez-tez so'raldi. Bir daqiqadan keyin qayta urinib ko'ring."
          : "Kodni yuborib bo'lmadi. Birozdan keyin qayta urinib ko'ring.";
    }
  } catch {
    failure = NETWORK_ERROR;
  }

  redirect(failure ? verifyUrl(email, { error: failure }) : verifyUrl(email, { message: "Yangi kod yuborildi." }));
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
