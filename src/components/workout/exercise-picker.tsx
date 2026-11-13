"use client";

import { useMemo, useRef, useState } from "react";
import { useWorkoutSession } from "@/context/workout-session-context";
import { ExerciseImage } from "@/components/workout/exercise-image";
import { ExerciseDetails } from "@/components/workout/exercise-details";
import {
  EXERCISES,
  MUSCLE_GROUPS,
  EQUIPMENT_LABELS,
  LEVEL_LABELS,
  type Equipment,
  type Level,
  type Exercise,
  type MuscleGroupId,
} from "@/lib/exercises";

import { ExerciseCard } from "@/components/workout/exercise-card";
import { ExercisePlan } from "@/components/workout/exercise-plan";
import { ExerciseIcon } from "@/components/workout/exercise-icon";
import { useFavoriteExercises } from "@/lib/saved-items";
import styles from "./exercise-library.module.css";

const PAGE_SIZE = 24;
const normalize = (text: string) =>
  text
    .toLowerCase()
    .replace(/['‘’ʻʼ`]/g, "")
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const SHORT_LABELS: Record<MuscleGroupId, string> = {
  chest: "Ko'krak",
  back: "Orqa",
  shoulders: "Yelka",
  biceps: "Biseps",
  triceps: "Triseps",
  legs: "Oyoq va dumba",
  abs: "Qorin",
};

// Har bir renderda 137 ta mashq matnini regex bilan qayta normallashtirmaslik
// uchun qidiruv indeksini bir marta hisoblab olamiz.
const EXERCISE_SEARCH_INDEX = new Map<string, string>(
  EXERCISES.map((exercise) => [
    exercise.id,
    normalize(
      `${exercise.name} ${exercise.englishName} ${SHORT_LABELS[exercise.muscleGroup]} ${MUSCLE_GROUPS.find((item) => item.id === exercise.muscleGroup)?.label ?? ""} ${EQUIPMENT_LABELS[exercise.equipment]}`,
    ),
  ]),
);

export function ExercisePicker({ onDone }: { onDone: () => void }) {
  const { activeSession, addExercises, removeExercise } = useWorkoutSession();
  const { items: favorites, loading: favoritesLoading, save: saveFavorites } = useFavoriteExercises();
  const [favoriteOnly, setFavoriteOnly] = useState(false);
  const [favoriteBusy, setFavoriteBusy] = useState(false);
  const favoriteLock = useRef(false);
  const [favoriteError, setFavoriteError] = useState<string | null>(null);
  const [compact, setCompact] = useState(false);
  const [sort, setSort] = useState("catalog");
  const toggleFavorite = async (id: string) => {
    if (favoriteLock.current || favoritesLoading) return;
    favoriteLock.current = true;
    setFavoriteBusy(true);
    setFavoriteError(null);
    try {
      await saveFavorites(
        favorites.includes(id) ? favorites.filter((item) => item !== id) : [...favorites, id],
      );
    } catch {
      setFavoriteError("Sevimlilarga saqlanmadi. Qayta urinib ko'ring.");
    } finally {
      favoriteLock.current = false;
      setFavoriteBusy(false);
    }
  };
  const [group, setGroup] = useState<MuscleGroupId | "all">("all");
  const [equipment, setEquipment] = useState<Equipment | "all">("all");
  const [level, setLevel] = useState<Level | "all">("all");
  const [query, setQuery] = useState("");
  const [selectedOnly, setSelectedOnly] = useState(false);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [detail, setDetail] = useState<Exercise | null>(null);
  const selected = useMemo(
    () => new Set(activeSession?.exercises.map((exercise) => exercise.exerciseId) ?? []),
    [activeSession?.exercises],
  );
  const locked = useMemo(
    () =>
      new Set(
        activeSession?.exercises
          .filter((exercise) => exercise.sets.length > 0)
          .map((exercise) => exercise.exerciseId) ?? [],
      ),
    [activeSession?.exercises],
  );
  const filtered = useMemo(() => {
    const tokens = normalize(query).split(" ").filter(Boolean);
    const result = EXERCISES.filter((exercise) => {
      const text = EXERCISE_SEARCH_INDEX.get(exercise.id) ?? "";
      return (
        (group === "all" || exercise.muscleGroup === group) &&
        (equipment === "all" || exercise.equipment === equipment) &&
        (level === "all" || exercise.level === level) &&
        (!selectedOnly || selected.has(exercise.id)) &&
        (!favoriteOnly || favorites.includes(exercise.id)) &&
        tokens.every((token) => text.includes(token))
      );
    });

    if (sort === "name") {
      return [...result].sort((a, b) => a.name.localeCompare(b.name, "uz"));
    }
    if (sort === "level") {
      const rank = { beginner: 0, intermediate: 1, expert: 2 };
      return [...result].sort((a, b) => rank[a.level] - rank[b.level]);
    }
    return result;
  }, [query, group, equipment, level, selectedOnly, selected, favoriteOnly, favorites, sort]);
  const featured = EXERCISES.find((exercise) => exercise.muscleGroup === group) ?? EXERCISES[0];
  const reset = () => {
    setFavoriteOnly(false);
    setGroup("all");
    setEquipment("all");
    setLevel("all");
    setQuery("");
    setSelectedOnly(false);
    setLimit(PAGE_SIZE);
  };
  const toggle = (exercise: Exercise) => {
    if (locked.has(exercise.id)) return;
    if (selected.has(exercise.id)) removeExercise(exercise.id);
    else addExercises([exercise]);
  };
  const filteredActive =
    group !== "all" || equipment !== "all" || level !== "all" || query !== "" || selectedOnly || favoriteOnly;

  return (
    <section aria-label="Mashqlar kutubxonasi" className={styles.library}>
      <header className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>AuraFit / Mashqlar kutubxonasi</p>
          <h2 className={styles.title}>
            Mashqingizni toping.
            <br />
            <span>Rejangizni yarating.</span>
          </h2>
          <p className={styles.description}>
            Har bir mashq uchun aniq ko&apos;rsatmalar. O&apos;zingizga mosini tanlang va harakatni boshlang.
          </p>
          <div className={styles.stats}>
            <div>
              <strong>{EXERCISES.length}</strong>ta mashq
            </div>
            <div>
              <strong>{MUSCLE_GROUPS.length}</strong>mushak guruhi
            </div>
            <div>
              <strong>{selected.size.toString().padStart(2, "0")}</strong>rejangizda
            </div>
          </div>
        </div>
        <div className={styles.poster}>
          <ExerciseImage eager key={featured.id} exercise={featured} sizes="(max-width: 640px) 0px, 320px" />
          <div className={styles.posterLabel}>
            <span>Texnikani o&apos;rganing · ongli mashq qiling</span>
            {featured.name}
          </div>
        </div>
      </header>

      <div className="grid lg:grid-cols-[190px_minmax(0,1fr)]">
        <aside className="min-w-0 border-b border-white/10 p-4 lg:border-b-0 lg:border-r lg:p-5">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant">
            Mushak guruhi
          </p>
          <div
            className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible"
            role="group"
            aria-label="Mushak guruhi"
          >
            {(
              [
                { id: "all", label: "Barchasi", icon: "grid_view" },
                ...MUSCLE_GROUPS.map((item) => ({ ...item, label: SHORT_LABELS[item.id] })),
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={group === item.id}
                onClick={() => {
                  setGroup(item.id as MuscleGroupId | "all");
                  setLimit(PAGE_SIZE);
                }}
                className={`flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${group === item.id ? "bg-primary-container font-semibold text-on-primary-container" : "text-on-surface-variant hover:bg-white/5"}`}
              >
                <span aria-hidden="true" className="material-symbols-outlined text-lg">
                  {item.icon}
                </span>
                <span>{item.label}</span>
                <span className="ml-auto hidden pl-1 text-[10px] opacity-60 lg:inline">
                  {item.id === "all"
                    ? EXERCISES.length
                    : EXERCISES.filter((exercise) => exercise.muscleGroup === item.id).length}
                </span>
              </button>
            ))}
          </div>
          <div className="mt-6 hidden rounded-xl border border-white/10 p-3 text-xs leading-relaxed text-on-surface-variant lg:block">
            Kartochkadagi <span className="text-primary">Texnika</span> tugmasi rasmlar va bajarish
            bosqichlarini ochadi.
          </div>
        </aside>

        <div className="min-w-0 p-4 md:p-6">
          <div className="relative">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="pointer-events-none absolute left-4 top-3.5 h-5 w-5 text-on-surface-variant"
            >
              <circle cx="10.5" cy="10.5" r="6.5" />
              <path d="m16 16 4.5 4.5" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setLimit(PAGE_SIZE);
              }}
              aria-label="Mashq qidirish"
              placeholder="Mashq nomi: otjimaniya, gantel, squat..."
              className="min-h-12 w-full rounded-xl border border-white/15 bg-black/20 py-3 pl-12 pr-4 text-sm text-white outline-none focus:border-primary"
            />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <label className="text-xs text-on-surface-variant">
              Jihoz
              <select
                aria-label="Jihoz"
                value={equipment}
                onChange={(event) => {
                  setEquipment(event.target.value as Equipment | "all");
                  setLimit(PAGE_SIZE);
                }}
                className="mt-1.5 min-h-11 w-full rounded-xl border border-white/10 bg-[#202621] px-3 text-sm text-white"
              >
                <option value="all">Barcha jihozlar</option>
                {Object.entries(EQUIPMENT_LABELS).map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-on-surface-variant">
              Tajriba darajasi
              <select
                aria-label="Tajriba darajasi"
                value={level}
                onChange={(event) => {
                  setLevel(event.target.value as Level | "all");
                  setLimit(PAGE_SIZE);
                }}
                className="mt-1.5 min-h-11 w-full rounded-xl border border-white/10 bg-[#202621] px-3 text-sm text-white"
              >
                <option value="all">Barcha darajalar</option>
                {Object.entries(LEVEL_LABELS).map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
            <button
              type="button"
              aria-pressed={favoriteOnly}
              onClick={() => {
                setFavoriteOnly(!favoriteOnly);
                setLimit(PAGE_SIZE);
              }}
              className={`flex min-h-10 items-center gap-2 rounded-full px-3 text-xs ${favoriteOnly ? "bg-primary/15 text-primary" : "bg-white/5 text-on-surface-variant"}`}
            >
              <ExerciseIcon name="heart" width="15" height="15" />
              Sevimlilar ({favorites.length})
            </button>
            <div className="flex items-center gap-2">
              <select
                aria-label="Mashqlarni saralash"
                value={sort}
                onChange={(event) => {
                  setSort(event.target.value);
                  setLimit(PAGE_SIZE);
                }}
                className="min-h-10 max-w-36 rounded-lg border border-white/10 bg-[#202621] px-2 text-xs text-on-surface-variant"
              >
                <option value="catalog">Katalog tartibi</option>
                <option value="name">Nomi bo&apos;yicha</option>
                <option value="level">Osondan qiyinga</option>
              </select>
              <div
                className="flex rounded-lg border border-white/10 p-1"
                role="group"
                aria-label="Katalog ko'rinishi"
              >
                <button
                  type="button"
                  aria-label="Kartochkalar"
                  aria-pressed={!compact}
                  onClick={() => setCompact(false)}
                  className={`flex h-9 w-9 items-center justify-center rounded-md ${!compact ? "bg-white/10 text-primary" : "text-on-surface-variant"}`}
                >
                  <ExerciseIcon name="grid" width="16" height="16" />
                </button>
                <button
                  type="button"
                  aria-label="Ixcham ro'yxat"
                  aria-pressed={compact}
                  onClick={() => setCompact(true)}
                  className={`flex h-9 w-9 items-center justify-center rounded-md ${compact ? "bg-white/10 text-primary" : "text-on-surface-variant"}`}
                >
                  <ExerciseIcon name="list" width="18" height="18" />
                </button>
              </div>
            </div>
          </div>
          {favoriteError && (
            <p role="alert" className="mt-3 text-sm text-error">
              {favoriteError}
            </p>
          )}
          {favoriteOnly && (
            <p className="mt-3 text-xs text-on-surface-variant">
              Sevimlilar shu qurilmada, hisobingiz uchun saqlanadi.
            </p>
          )}
          <div className="my-5 flex flex-wrap items-center justify-between gap-3">
            <p role="status" className="text-sm text-on-surface-variant">
              <strong className="text-white">{filtered.length}</strong> ta mashq topildi
            </p>
            <div className="flex flex-wrap items-center gap-3">
              {filteredActive && (
                <button
                  type="button"
                  onClick={reset}
                  className="min-h-10 text-xs text-on-surface-variant underline underline-offset-4"
                >
                  Filtrlarni tozalash
                </button>
              )}
              <button
                type="button"
                aria-pressed={selectedOnly}
                onClick={() => {
                  setSelectedOnly(!selectedOnly);
                  setLimit(PAGE_SIZE);
                }}
                className={`min-h-10 rounded-full border px-3 text-xs ${selectedOnly ? "border-primary text-primary" : "border-white/15 text-on-surface-variant"}`}
              >
                Tanlanganlar ({selected.size})
              </button>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/15 px-6 py-14 text-center">
              <p className="text-lg font-semibold">Mos mashq topilmadi</p>
              <p className="mt-2 text-sm text-on-surface-variant">
                Qidiruv so&apos;zini yoki tanlangan filtrlarni o&apos;zgartiring.
              </p>
              <button
                type="button"
                onClick={reset}
                className="mt-5 rounded-xl bg-primary/10 px-5 py-3 text-sm text-primary"
              >
                Barcha mashqlarni ko&apos;rish
              </button>
            </div>
          ) : (
            <div className={compact ? "grid gap-3" : "grid gap-4 sm:grid-cols-2 2xl:grid-cols-3"}>
              {filtered.slice(0, limit).map((exercise) => (
                <ExerciseCard
                  key={exercise.id}
                  exercise={exercise}
                  compact={compact}
                  favorite={favorites.includes(exercise.id)}
                  favoriteDisabled={favoriteBusy || favoritesLoading}
                  onFavorite={() => void toggleFavorite(exercise.id)}
                  selected={selected.has(exercise.id)}
                  locked={locked.has(exercise.id)}
                  onToggle={() => toggle(exercise)}
                  onDetails={() => setDetail(exercise)}
                />
              ))}
            </div>
          )}
          {filtered.length > limit && (
            <button
              type="button"
              onClick={() => setLimit(limit + PAGE_SIZE)}
              className="mt-5 min-h-12 w-full rounded-xl border border-white/15 text-sm text-on-surface-variant hover:border-primary/50"
            >
              Yana {Math.min(PAGE_SIZE, filtered.length - limit)} ta mashqni ko&apos;rsatish
            </button>
          )}
        </div>
      </div>
      <ExercisePlan />
      <div className="sticky bottom-20 z-20 flex items-center justify-between gap-2 rounded-b-3xl border-t border-white/15 bg-[#20281f]/95 p-4 backdrop-blur-xl md:bottom-0 md:px-6">
        <div>
          <p className="text-sm font-semibold text-white">{selected.size} ta mashq tanlandi</p>
          <p className="mt-1 text-[11px] text-on-surface-variant">Rejangiz saqlanadi.</p>
        </div>
        <button
          type="button"
          aria-label={selected.size ? "Mashg'ulotga o'tish" : "Keyinroq tanlash"}
          onClick={onDone}
          className="min-h-12 shrink-0 rounded-xl bg-primary-container px-5 py-3 text-sm font-semibold text-on-primary-container hover:bg-primary-fixed"
        >
          {selected.size ? "Tayyor →" : "Keyinroq"}
        </button>
      </div>
      {detail && (
        <ExerciseDetails
          exercise={detail}
          selected={selected.has(detail.id)}
          locked={locked.has(detail.id)}
          onToggle={() => toggle(detail)}
          onClose={() => setDetail(null)}
        />
      )}
    </section>
  );
}
