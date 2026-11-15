"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/logo";
import { useUserProfile, type Gender, type Goal } from "@/context/user-profile-context";
import { ACTIVITY_LEVELS, type ActivityLevel } from "@/lib/training-preferences";
import { GOAL_LABELS } from "@/lib/fitness";

const STEPS = ["Jins", "Yosh", "Bo'y va vazn", "Maqsad"] as const;

const GOAL_HINTS: Record<Goal, string> = {
  lose: "Kaloriya biroz kam — yog' kamayadi",
  maintain: "Hozirgi vaznni ushlab turish",
  gain: "Kaloriya biroz ko'p — mushak massasi oshadi",
};

const ACTIVITY_HINTS: Record<ActivityLevel, string> = {
  sedentary: "Asosan o'tirib ishlash, mashg'ulot deyarli yo'q",
  light: "Haftada 1-3 marta yengil mashg'ulot",
  moderate: "Haftada 3-5 marta mashg'ulot",
  active: "Deyarli har kuni og'ir mashg'ulot",
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

// Raqamli qiymat: katta raqam, slayder va −/+ tugmalari (oddiy, barmoq uchun qulay).
function NumberField({
  label,
  unit,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  unit: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  const set = (next: number) => onChange(clamp(Math.round(next / step) * step, min, max));
  const button =
    "h-12 w-12 shrink-0 rounded-xl border border-white/15 bg-white/5 text-2xl text-on-surface active:scale-95 transition-transform";
  return (
    <div className="space-y-3">
      <div className="text-center font-label-mono text-label-mono uppercase tracking-widest text-on-surface-variant">
        {label}
      </div>
      <div className="flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={() => set(value - step)}
          aria-label={`${label}: kamaytirish`}
          className={button}
        >
          −
        </button>
        <div className="min-w-[8rem] text-center">
          <span className="font-display-lg-mobile text-[52px] font-bold leading-none text-primary tabular-nums">
            {value}
          </span>
          <span className="ml-1 font-label-mono text-label-mono text-on-surface-variant">{unit}</span>
        </div>
        <button
          type="button"
          onClick={() => set(value + step)}
          aria-label={`${label}: oshirish`}
          className={button}
        >
          +
        </button>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => set(Number(event.target.value))}
        aria-label={label}
        className="w-full accent-[#c3f400]"
      />
    </div>
  );
}

function Choice({
  selected,
  onClick,
  title,
  hint,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  hint?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`w-full rounded-xl border p-4 text-left transition-colors ${
        selected
          ? "border-primary-container bg-primary-container/10 shadow-[0_0_16px_rgba(195,244,0,0.15)]"
          : "border-white/10 bg-white/[0.03] hover:bg-white/5"
      }`}
    >
      <span className={`block font-headline-md text-[18px] ${selected ? "text-primary" : "text-on-surface"}`}>
        {title}
      </span>
      {hint && <span className="mt-0.5 block text-[12px] text-on-surface-variant">{hint}</span>}
    </button>
  );
}

function StepTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-center font-headline-md text-[24px] uppercase italic text-primary">{children}</h2>
  );
}

// Birinchi kirishdagi tanishuv: 4 qisqa qadam. Shu ma'lumotlarsiz kaloriya, BMI va
// BJU maqsadlarini to'g'ri hisoblab bo'lmaydi.
export default function OnboardingPage() {
  const router = useRouter();
  const { profile, setProfile } = useUserProfile();
  const [step, setStep] = useState(0);
  const [gender, setGender] = useState<Gender | null>(profile.onboarded ? profile.gender : null);
  const [age, setAge] = useState(profile.onboarded ? profile.age : 25);
  const [heightCm, setHeightCm] = useState(profile.onboarded ? profile.heightCm : 170);
  const [weightKg, setWeightKg] = useState(profile.onboarded ? profile.weightKg : 70);
  const [goal, setGoal] = useState<Goal | null>(profile.onboarded ? profile.goal : null);
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(profile.activityLevel);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canContinue = step === 0 ? gender !== null : step === 3 ? goal !== null : true;
  const isLast = step === STEPS.length - 1;

  const finish = async () => {
    if (!gender || !goal || saving) return;
    setSaving(true);
    setError(null);
    const { error: saveError } = await setProfile({
      ...profile,
      gender,
      age,
      heightCm,
      weightKg,
      goal,
      activityLevel,
      onboarded: true,
    });
    if (saveError) {
      setError(saveError);
      setSaving(false);
      return;
    }
    router.replace("/");
  };

  return (
    <div className="relative min-h-dvh overflow-hidden bg-[radial-gradient(circle_at_50%_0%,#1c1f1f,var(--color-background)_65%)] px-margin-mobile pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-[calc(1.5rem+env(safe-area-inset-top))]">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -left-24 h-[26rem] w-[26rem] rounded-full bg-primary-container/25 blur-[120px]"
      />
      <div className="relative mx-auto flex min-h-[calc(100dvh-3rem)] w-full max-w-md flex-col gap-6">
        <header className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Logo className="h-7 w-7" />
              <span className="font-headline-md text-[18px] font-bold uppercase italic text-primary">
                AuraFit
              </span>
            </div>
            <button
              type="button"
              onClick={() => router.replace("/")}
              className="font-label-mono text-[11px] uppercase text-on-surface-variant underline underline-offset-4"
            >
              Keyinroq
            </button>
          </div>
          <div>
            <div className="mb-2 flex justify-between font-label-mono text-[11px] uppercase text-on-surface-variant">
              <span>Tanishaylik</span>
              <span>
                {step + 1}/{STEPS.length} · {STEPS[step]}
              </span>
            </div>
            <div
              className="h-1.5 overflow-hidden rounded-full bg-white/10"
              role="progressbar"
              aria-valuemin={1}
              aria-valuemax={STEPS.length}
              aria-valuenow={step + 1}
              aria-label="Anketa bosqichi"
            >
              <div
                className="h-full rounded-full bg-primary-container transition-all duration-300"
                style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
              />
            </div>
          </div>
        </header>

        <main className="flex flex-1 flex-col justify-center gap-6">
          {step === 0 && (
            <>
              <StepTitle>Jinsingiz</StepTitle>
              <p className="text-center text-sm text-on-surface-variant">
                Kaloriya ehtiyoji shunga qarab hisoblanadi.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {(["male", "female"] as const).map((value) => (
                  <Choice
                    key={value}
                    selected={gender === value}
                    title={value === "male" ? "Erkak" : "Ayol"}
                    onClick={() => {
                      setGender(value);
                      setStep(1);
                    }}
                  />
                ))}
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <StepTitle>Yoshingiz</StepTitle>
              <NumberField
                label="Yosh"
                unit="yosh"
                value={age}
                min={12}
                max={90}
                step={1}
                onChange={setAge}
              />
            </>
          )}

          {step === 2 && (
            <>
              <StepTitle>Bo&apos;y va vazn</StepTitle>
              <NumberField
                label="Bo'y"
                unit="sm"
                value={heightCm}
                min={120}
                max={220}
                step={1}
                onChange={setHeightCm}
              />
              <NumberField
                label="Vazn"
                unit="kg"
                value={weightKg}
                min={30}
                max={200}
                step={0.5}
                onChange={setWeightKg}
              />
            </>
          )}

          {step === 3 && (
            <>
              <StepTitle>Maqsadingiz</StepTitle>
              <div className="space-y-2">
                {(["lose", "maintain", "gain"] as const).map((value) => (
                  <Choice
                    key={value}
                    selected={goal === value}
                    title={GOAL_LABELS[value]}
                    hint={GOAL_HINTS[value]}
                    onClick={() => setGoal(value)}
                  />
                ))}
              </div>
              <div className="space-y-2">
                <div className="font-label-mono text-label-mono uppercase tracking-widest text-on-surface-variant">
                  Faollik darajangiz
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(ACTIVITY_LEVELS) as ActivityLevel[]).map((value) => (
                    <Choice
                      key={value}
                      selected={activityLevel === value}
                      title={ACTIVITY_LEVELS[value].label}
                      hint={ACTIVITY_HINTS[value]}
                      onClick={() => setActivityLevel(value)}
                    />
                  ))}
                </div>
              </div>
            </>
          )}

          {error && (
            <p
              role="alert"
              className="rounded-lg border border-error/30 bg-error/10 px-4 py-3 text-sm text-error"
            >
              {error}
            </p>
          )}
        </main>

        <footer className="flex gap-3">
          {step > 0 && (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="h-14 rounded-xl border border-white/15 px-5 font-label-mono text-label-mono uppercase text-on-surface"
            >
              Orqaga
            </button>
          )}
          <button
            type="button"
            disabled={!canContinue || saving}
            onClick={() => (isLast ? void finish() : setStep(step + 1))}
            className="h-14 flex-1 rounded-xl bg-primary-container font-headline-md text-[16px] uppercase tracking-wider text-on-primary-container glow-button transition-colors hover:bg-primary-fixed disabled:opacity-40"
          >
            {saving ? "Saqlanmoqda..." : isLast ? "Hisoblash va boshlash" : "Keyingi"}
          </button>
        </footer>
      </div>
    </div>
  );
}
