"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      redirect(`/login?error=${encodeURIComponent(error.message)}`);
    }
  } catch (err) {
    if (isRedirectError(err)) throw err;
    redirect(
      `/login?error=${encodeURIComponent("Serverga ulanib bo'lmadi. Supabase ma'lumotlar bazasi 'Paused' bo'lishi yoki internet uzilgan bo'lishi mumkin.")}`,
    );
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function signUp(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  if (password.length < 8) {
    redirect(`/signup?error=${encodeURIComponent("Parol kamida 8 belgidan iborat bo'lishi kerak.")}`);
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signUp({ email, password });

    if (error) {
      redirect(`/signup?error=${encodeURIComponent(error.message)}`);
    }
  } catch (err) {
    if (isRedirectError(err)) throw err;
    redirect(
      `/signup?error=${encodeURIComponent("Serverga ulanib bo'lmadi. Supabase ma'lumotlar bazasi 'Paused' bo'lishi yoki internet uzilgan bo'lishi mumkin.")}`,
    );
  }

  redirect(`/login?message=${encodeURIComponent("Ro'yxatdan o'tdingiz. Emailingizni tasdiqlab, tizimga kiring.")}`);
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
