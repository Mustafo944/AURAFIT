"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useRef, useState, type ChangeEvent } from "react";
import { useAuth } from "@/context/auth-context";
import { useUserProfile, DEFAULT_PROFILE, type Gender, type Goal } from "@/context/user-profile-context";
import { calculateFitnessMetrics } from "@/lib/fitness";
import { useProfileInsight } from "@/lib/profile-insight";
import { logWeightEntry } from "@/lib/weight-log";
import { uploadAvatar } from "@/lib/avatar";
import { signOut } from "@/lib/supabase/actions";
import { WeightRuler } from "@/components/weight-ruler";
import { HeightRuler } from "@/components/height-ruler";
import { AgeWheel } from "@/components/age-wheel";
import { FullScreenFieldEditor } from "@/components/full-screen-field-editor";

type ProfileFormState = Omit<typeof DEFAULT_PROFILE, "targetWeightKg"> & {
  targetWeightKg: number | "";
};

// BMI bo'sag'alari fitness.ts'dagi bmiCategory bilan bir xil (18.5/25/30) —
// vazn slayderi ostidagi rang zonalarini shu ko'rsatkichlardan hisoblaydi.
const BMI_ZONE_THRESHOLDS = [
  { bmi: 18.5, color: "#00dbe9", label: "Kam Vazn" },
  { bmi: 25, color: "#abd600", label: "Norma" },
  { bmi: 30, color: "#f2b705", label: "Ortiqcha Vazn" },
  { bmi: Infinity, color: "#ffb4ab", label: "Semizlik" },
];

function GenderGlyph({ gender, color }: { gender: Gender; color: string }) {
  if (gender === "male") {
    return (
      <svg viewBox="0 0 24 24" className="w-8 h-8">
        <circle cx="10" cy="14" r="6" fill="none" stroke={color} strokeWidth="2" />
        <path d="M14.2 9.8 L20 4 M14 4 H20 V10" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="w-8 h-8">
      <circle cx="12" cy="9" r="6" fill="none" stroke={color} strokeWidth="2" />
      <path d="M12 15 V22 M8.5 18.5 H15.5" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function ProfilePage() {
  const { userId } = useAuth();
  const { profile, setProfile, loading: profileLoading } = useUserProfile();
  const [form, setForm] = useState<ProfileFormState>({ ...profile, targetWeightKg: profile.targetWeightKg ?? "" });
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [bioExpanded, setBioExpanded] = useState(false);
  const [editingField, setEditingField] = useState<"gender" | "age" | "height" | "weight" | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const handleAvatarChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !userId) return;
    setAvatarUploading(true);
    setAvatarError(null);
    const { url, error } = await uploadAvatar(userId, file);
    if (error || !url) {
      setAvatarError(error || "Rasmni yuklab bo'lmadi.");
    } else {
      const { error: saveError } = await setProfile({ ...profile, avatarUrl: url });
      if (saveError) setAvatarError("Saqlab bo'lmadi: " + saveError);
    }
    setAvatarUploading(false);
  };

  // Profil (Supabase'dan) yangilanganda formani render vaqtida moslaymiz —
  // effect ichidagi sync setState kaskadli qo'shimcha render chiqarardi
  // (React docs: "adjusting state when props change" naqshi).
  const [prevProfile, setPrevProfile] = useState(profile);
  if (prevProfile !== profile) {
    setPrevProfile(profile);
    setForm({ ...profile, targetWeightKg: profile.targetWeightKg ?? "" });
  }

  const handleSave = async () => {
    const next = {
      firstName: form.firstName,
      lastName: form.lastName,
      age: form.age,
      gender: form.gender,
      weightKg: form.weightKg,
      heightCm: form.heightCm,
      goal: form.goal,
      targetWeightKg: form.targetWeightKg === "" ? null : form.targetWeightKg,
      avatarUrl: form.avatarUrl,
    };
    setSaveError(null);
    const { error } = await setProfile(next);
    if (error) {
      setSaveError("Saqlab bo'lmadi: " + error);
      return;
    }
    setForm({ ...next, targetWeightKg: next.targetWeightKg ?? "" });
    if (form.weightKg !== profile.weightKg && userId) {
      logWeightEntry(userId, form.weightKg);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const weightZones = useMemo(() => {
    const heightM = form.heightCm / 100;
    return BMI_ZONE_THRESHOLDS.map((t) => ({
      upTo: t.bmi === Infinity ? 200 : Math.round(t.bmi * heightM * heightM),
      color: t.color,
      label: t.label,
    }));
  }, [form.heightCm]);

  // Driven by the saved profile (not the live form draft), so the AI call only
  // fires once Saqlash is pressed — never on every keystroke.
  const metrics = calculateFitnessMetrics(
    profile.age,
    profile.gender,
    profile.weightKg,
    profile.heightCm,
    profile.goal
  );
  const { insight, loading: insightLoading } = useProfileInsight({
    profile: {
      age: profile.age,
      gender: profile.gender,
      weightKg: profile.weightKg,
      heightCm: profile.heightCm,
      goal: profile.goal,
    },
    metrics: {
      bmr: metrics.bmr,
      tdee: metrics.tdee,
      targetCalories: metrics.targetCalories,
      bmi: metrics.bmi,
      bmiCategory: metrics.bmiCategory,
      proteinG: metrics.proteinG,
      fatG: metrics.fatG,
      carbG: metrics.carbG,
    },
    // Profil Supabase'dan yuklanmaguncha AI chaqirilmaydi — aks holda
    // DEFAULT_PROFILE bilan bitta ortiqcha (noto'g'ri) so'rov ketadi.
  }, !profileLoading);

  return (
    <div className="space-y-stack-lg max-w-7xl mx-auto">
      {/* Profile Header Section */}
      <section className="grid grid-cols-1 md:grid-cols-12 gap-gutter">
        <div className="md:col-span-12 glass-card rounded-xl p-6 flex flex-col md:flex-row items-center md:items-start gap-6">
          {/* Avatar */}
          <div className="relative group">
            <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-primary-container shadow-[0_0_20px_rgba(195,244,0,0.2)] relative bg-surface-container flex items-center justify-center">
              {profile.avatarUrl ? (
                <Image
                  alt="Profil rasmi"
                  fill
                  sizes="128px"
                  className="object-cover"
                  src={profile.avatarUrl}
                />
              ) : (
                <span className="material-symbols-outlined text-[64px] text-on-surface-variant">person</span>
              )}
              {avatarUploading && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <span className="material-symbols-outlined animate-spin text-2xl text-primary-fixed-dim">progress_activity</span>
                </div>
              )}
            </div>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              disabled={avatarUploading}
              aria-label="Profil rasmini o'zgartirish"
              className="absolute bottom-0 right-0 bg-primary-container text-on-primary-container w-10 h-10 rounded-full flex items-center justify-center glow-button hover:bg-primary-fixed transition-colors disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-sm">edit</span>
            </button>
          </div>

          {/* Profile Info */}
          <div className="flex-1 text-center md:text-left flex flex-col justify-center">
            <h2 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-primary uppercase">
              {`${profile.firstName} ${profile.lastName}`.trim() || "ATHLETE_01"}
            </h2>
            {avatarError && (
              <p className="font-body-md text-[13px] text-error mt-2">{avatarError}</p>
            )}
          </div>

        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter">
        {/* Side Navigation (Desktop) */}
        <div className="hidden md:flex flex-col col-span-3 glass-card rounded-xl overflow-hidden h-fit">
          <nav className="flex flex-col py-stack-md w-full">
            <Link className="flex items-center gap-3 px-6 py-4 bg-primary/10 text-primary border-l-4 border-primary" href="/profile">
              <span className="material-symbols-outlined">psychology</span>
              <span className="font-body-md text-body-md">AI Murabbiy Sozlamalari</span>
            </Link>
            <form action={signOut} className="mt-stack-md border-t border-white/5">
              <button
                type="submit"
                className="w-full flex items-center gap-3 px-6 py-4 text-on-surface-variant hover:bg-white/5 transition-colors duration-200"
              >
                <span className="material-symbols-outlined">logout</span>
                <span className="font-body-md text-body-md">Chiqish</span>
              </button>
            </form>
          </nav>
        </div>

        {/* Settings Content Area */}
        <div className="col-span-1 md:col-span-9 space-y-stack-md">
          {/* Section 0: Personal Biometrics */}
          <div className="glass-card ai-accent-border rounded-xl p-6">
            <button
              type="button"
              onClick={() => setBioExpanded((v) => !v)}
              className={`w-full flex items-center gap-3 text-left ${bioExpanded ? "pb-4 border-b border-white/10" : ""}`}
            >
              <span className="material-symbols-outlined text-primary-fixed-dim">monitor_weight</span>
              <h3 className="font-headline-md text-headline-md text-primary uppercase flex-1">Shaxsiy Ma&apos;lumotlar</h3>
              <span
                className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 transition-all duration-300 ${
                  bioExpanded
                    ? "rotate-45 bg-primary-container/10 border-primary-container/40"
                    : "bg-white/5 border-white/10"
                }`}
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4">
                  <path
                    d="M12 5 V19 M5 12 H19"
                    stroke={bioExpanded ? "#c3f400" : "#8e9379"}
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    className="transition-colors duration-300"
                  />
                </svg>
              </span>
            </button>

            {/* CSS-grid orqali silliq balandlik animatsiyasi — JS bilan
                balandlik o'lchashga hojat yo'q, `grid-template-rows: 0fr/1fr`
                o'zaro almashadi. */}
            <div
              className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
                bioExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              }`}
            >
              <div
                className={`overflow-hidden min-h-0 transition-opacity duration-300 ${
                  bioExpanded ? "opacity-100 delay-100" : "opacity-0"
                }`}
              >
                <div className="pt-6 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-label-mono text-label-mono text-on-surface-variant mb-2">Ism</label>
                    <input
                      className="w-full bg-[#000000] border border-white/10 rounded px-4 py-3 text-on-surface font-body-md focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-colors outline-none"
                      type="text"
                      value={form.firstName}
                      onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                      placeholder="Ismingiz"
                    />
                  </div>
                  <div>
                    <label className="block font-label-mono text-label-mono text-on-surface-variant mb-2">Familiya</label>
                    <input
                      className="w-full bg-[#000000] border border-white/10 rounded px-4 py-3 text-on-surface font-body-md focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-colors outline-none"
                      type="text"
                      value={form.lastName}
                      onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                      placeholder="Familiyangiz"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingField("gender")}
                  className="w-full flex items-center justify-between gap-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg px-4 py-3.5 transition-colors"
                >
                  <span className="font-label-mono text-label-mono text-on-surface-variant uppercase">Jins</span>
                  <span className="flex items-center gap-2">
                    <span className="font-body-md text-on-surface">{form.gender === "male" ? "Erkak" : "Ayol"}</span>
                    <span className="material-symbols-outlined text-on-surface-variant text-[18px]">chevron_right</span>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setEditingField("age")}
                  className="w-full flex items-center justify-between gap-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg px-4 py-3.5 transition-colors"
                >
                  <span className="font-label-mono text-label-mono text-on-surface-variant uppercase">Yosh</span>
                  <span className="flex items-center gap-2">
                    <span className="font-body-md text-on-surface">{form.age} yosh</span>
                    <span className="material-symbols-outlined text-on-surface-variant text-[18px]">chevron_right</span>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setEditingField("height")}
                  className="w-full flex items-center justify-between gap-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg px-4 py-3.5 transition-colors"
                >
                  <span className="font-label-mono text-label-mono text-on-surface-variant uppercase">Bo&apos;y</span>
                  <span className="flex items-center gap-2">
                    <span className="font-body-md text-on-surface">{form.heightCm} sm</span>
                    <span className="material-symbols-outlined text-on-surface-variant text-[18px]">chevron_right</span>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setEditingField("weight")}
                  className="w-full flex items-center justify-between gap-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg px-4 py-3.5 transition-colors"
                >
                  <span className="font-label-mono text-label-mono text-on-surface-variant uppercase">Vazn</span>
                  <span className="flex items-center gap-2">
                    <span className="font-body-md text-on-surface">{form.weightKg} kg</span>
                    <span className="material-symbols-outlined text-on-surface-variant text-[18px]">chevron_right</span>
                  </span>
                </button>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3">
                  <div>
                    <label className="block font-label-mono text-label-mono text-on-surface-variant mb-2">
                      MAQSAD VAZNI (KG) <span className="normal-case text-on-surface-variant/60">— ixtiyoriy</span>
                    </label>
                    <input
                      className="w-full bg-[#000000] border border-white/10 rounded px-4 py-3 text-on-surface font-body-md focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-colors outline-none"
                      type="number"
                      min={30}
                      max={300}
                      value={form.targetWeightKg}
                      onChange={(e) =>
                        setForm({ ...form, targetWeightKg: e.target.value === "" ? "" : Number(e.target.value) })
                      }
                    />
                  </div>
                  <div>
                    <label className="block font-label-mono text-label-mono text-on-surface-variant mb-2">MAQSAD</label>
                    <select
                      className="w-full bg-[#000000] border border-white/10 rounded px-4 py-3 text-on-surface font-body-md focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-colors outline-none"
                      value={form.goal}
                      onChange={(e) => setForm({ ...form, goal: e.target.value as Goal })}
                    >
                      <option value="lose">Vazn Yo&apos;qotish</option>
                      <option value="maintain">Vaznni Saqlash</option>
                      <option value="gain">Mushak Massasi Orttirish</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-4 pt-3">
                  <button
                    onClick={handleSave}
                    className="px-6 py-3 rounded-lg bg-primary-container text-on-primary-container font-headline-md text-sm uppercase tracking-wider glow-button hover:bg-primary-fixed transition-colors"
                  >
                    Saqlash
                  </button>
                  {saved && (
                    <span className="font-label-mono text-label-mono text-primary-fixed-dim flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">check_circle</span> Saqlandi
                    </span>
                  )}
                </div>
                {saveError && (
                  <p className="font-body-md text-[13px] text-error border border-error/30 bg-error/10 rounded-lg px-4 py-3">
                    {saveError}
                  </p>
                )}
                </div>
              </div>
            </div>

            {editingField === "gender" && (
              <FullScreenFieldEditor title="Jins" icon="person" onClose={() => setEditingField(null)} onSave={() => setEditingField(null)}>
                <div className="grid grid-cols-2 gap-3">
                  {(["male", "female"] as const).map((g) => {
                    const active = form.gender === g;
                    return (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setForm({ ...form, gender: g })}
                        className={`flex flex-col items-center gap-2 rounded-xl border p-5 transition-colors ${
                          active
                            ? "border-primary-container bg-primary-container/10 shadow-[0_0_16px_rgba(195,244,0,0.15)]"
                            : "border-white/10 bg-white/5 hover:bg-white/10"
                        }`}
                      >
                        <GenderGlyph gender={g} color={active ? "#c3f400" : "#8e9379"} />
                        <span
                          className={`font-label-mono text-label-mono uppercase ${
                            active ? "text-primary" : "text-on-surface-variant"
                          }`}
                        >
                          {g === "male" ? "Erkak" : "Ayol"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </FullScreenFieldEditor>
            )}

            {editingField === "age" && (
              <FullScreenFieldEditor title="Yosh" icon="calendar_month" onClose={() => setEditingField(null)} onSave={() => setEditingField(null)}>
                <AgeWheel value={form.age} min={10} max={90} onChange={(v) => setForm({ ...form, age: v })} />
              </FullScreenFieldEditor>
            )}

            {editingField === "height" && (
              <FullScreenFieldEditor title="Bo'y" icon="trending_up" onClose={() => setEditingField(null)} onSave={() => setEditingField(null)}>
                <HeightRuler
                  value={form.heightCm}
                  min={120}
                  max={220}
                  onChange={(v) => setForm({ ...form, heightCm: v })}
                />
              </FullScreenFieldEditor>
            )}

            {editingField === "weight" && (
              <FullScreenFieldEditor title="Vazn" icon="monitor_weight" onClose={() => setEditingField(null)} onSave={() => setEditingField(null)}>
                <WeightRuler
                  value={form.weightKg}
                  min={30}
                  max={200}
                  zones={weightZones}
                  onChange={(v) => setForm({ ...form, weightKg: v })}
                />
              </FullScreenFieldEditor>
            )}
          </div>

          {/* AI Tahlili: formula + AI hybrid */}
          <div className="glass-card ai-accent-border rounded-xl p-6">
            <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-4">
              <span className="material-symbols-outlined text-tertiary-fixed-dim">auto_awesome</span>
              <h3 className="font-headline-md text-headline-md text-primary uppercase">AI Tahlili</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Formula numbers */}
              <div className="md:col-span-4 grid grid-cols-3 md:grid-cols-1 gap-4 md:border-r border-white/10 md:pr-6">
                <div className="text-center md:text-left">
                  <div className="font-headline-md text-[22px] text-primary font-bold">{metrics.bmr}</div>
                  <div className="font-label-mono text-[10px] text-on-surface-variant uppercase">BMR (kcal)</div>
                </div>
                <div className="text-center md:text-left">
                  <div className="font-headline-md text-[22px] text-primary font-bold">{metrics.tdee}</div>
                  <div className="font-label-mono text-[10px] text-on-surface-variant uppercase">TDEE (kcal)</div>
                </div>
                <div className="text-center md:text-left">
                  <div className="font-headline-md text-[22px] text-primary font-bold">{metrics.targetCalories}</div>
                  <div className="font-label-mono text-[10px] text-on-surface-variant uppercase">Kunlik Maqsad</div>
                </div>
                <div className="text-center md:text-left">
                  <div className="font-headline-md text-[22px] text-primary font-bold">{metrics.bmi}</div>
                  <div className="font-label-mono text-[10px] text-on-surface-variant uppercase">BMI</div>
                  <div className="font-label-mono text-[9px] text-tertiary-fixed-dim mt-0.5">{metrics.bmiCategory}</div>
                </div>
              </div>

              {/* AI narrative */}
              <div className="md:col-span-8">
                {insightLoading && !insight && (
                  <div className="flex items-center gap-2 text-on-surface-variant">
                    <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                    <span className="font-label-mono text-label-mono uppercase tracking-widest">AI tahlil qilmoqda...</span>
                  </div>
                )}
                {insight && (
                  <div className="space-y-3">
                    <p className="font-body-md text-body-md text-on-surface">{insight.analysis}</p>
                    {insight.tips.length > 0 && (
                      <ul className="space-y-2">
                        {insight.tips.map((tip, i) => (
                          <li key={i} className="flex items-start gap-2 font-body-md text-[14px] text-on-surface-variant">
                            <span className="material-symbols-outlined text-tertiary-fixed-dim text-[16px] mt-0.5">check_circle</span>
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
                {!insightLoading && !insight && (
                  <p className="font-body-md text-body-md text-on-surface-variant">
                    Tahlil hozircha mavjud emas. Ma&apos;lumotlaringizni saqlab, birozdan so&apos;ng qayta tekshiring.
                  </p>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
