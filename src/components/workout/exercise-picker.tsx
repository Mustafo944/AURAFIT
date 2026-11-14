"use client";

import { useMemo, useRef, useState } from "react";
import { useWorkoutSession } from "@/context/workout-session-context";
import { ExerciseDetails } from "@/components/workout/exercise-details";
import { ExerciseRow } from "@/components/workout/exercise-row";
import { ExercisePlan } from "@/components/workout/exercise-plan";
import { ExerciseIcon } from "@/components/workout/exercise-icon";
import { MuscleIcon } from "@/components/workout/muscle-icon";
import {
  EXERCISES,
  MUSCLE_GROUPS,
  MUSCLE_SHORT_LABELS,
  EQUIPMENT_LABELS,
  LEVEL_LABELS,
  type Equipment,
  type Level,
  type Exercise,
  type MuscleGroupId,
} from "@/lib/exercises";
import { useFavoriteExercises } from "@/lib/saved-items";

const PAGE_SIZE = 30;

const normalize = (text: string) =>
  text
    .toLowerCase()
    .replace(/['‘’ʻʼ`]/g, "")
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

// Har bir renderda 137 ta mashq matnini regex bilan qayta normallashtirmaslik
// uchun qidiruv indeksini bir marta hisoblab olamiz.
const EXERCISE_SEARCH_INDEX = new Map<string, string>(
  EXERCISES.map((exercise) => [
    exercise.id,
    normalize(
      `${exercise.name} ${exercise.englishName} ${MUSCLE_SHORT_LABELS[exercise.muscleGroup]} ${
        MUSCLE_GROUPS.find((item) => item.id === exercise.muscleGroup)?.label ?? ""
      } ${EQUIPMENT_LABELS[exercise.equipment]}`,
    ),
  ]),
);

const chipBase =
  "flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[13px] whitespace-nowrap transition-colors";
const chipOn = "border-primary-container bg-primary-container text-on-primary-container font-semibold";
const chipOff = "border-white/10 bg-white/5 text-on-surface-variant hover:text-primary";

// Mashq tanlash: qidiruv + mushak chiplari + ixcham ro'yxat. Bitta ekranga 6-7 ta
// mashq sig'adi; qator yoki "+" bosilsa mashq rejaga qo'shiladi. Pastdagi panel
// doim ko'rinadi.
export function ExercisePicker({ onDone, recentIds }: { onDone: () => void; recentIds: string[] }) {
  const { activeSession, addExercises, removeExercise, discardSession } = useWorkoutSession();
  const { items: favorites, loading: favoritesLoading, save: saveFavorites } = useFavoriteExercises();
  const [favoriteOnly, setFavoriteOnly] = useState(false);
  const [recentOnly, setRecentOnly] = useState(false);
  const [selectedOnly, setSelectedOnly] = useState(false);
  const [favoriteBusy, setFavoriteBusy] = useState(false);
  const favoriteLock = useRef(false);
  const [favoriteError, setFavoriteError] = useState<string | null>(null);
  const [group, setGroup] = useState<MuscleGroupId | "all">("all");
  const [equipment, setEquipment] = useState<Equipment | "all">("all");
  const [level, setLevel] = useState<Level | "all">("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [detail, setDetail] = useState<Exercise | null>(null);

  const selected = useMemo(
    () => new Set(activeSession?.exercises.map((exercise) => exercise.exerciseId) ?? []),
    [activeSession?.exercises],
  );
  const locked = useMemo(
    () =>
      new Set(
        activeSession?.exercises.filter((exercise) => exercise.sets.length > 0).map((exercise) => exercise.exerciseId) ??
          [],
      ),
    [activeSession?.exercises],
  );
  const recent = useMemo(() => new Set(recentIds), [recentIds]);
  const hasLoggedSets = locked.size > 0;

  const filtered = useMemo(() => {
    const tokens = normalize(query).split(" ").filter(Boolean);
    return EXERCISES.filter((exercise) => {
      const text = EXERCISE_SEARCH_INDEX.get(exercise.id) ?? "";
      return (
        (group === "all" || exercise.muscleGroup === group) &&
        (equipment === "all" || exercise.equipment === equipment) &&
        (level === "all" || exercise.level === level) &&
        (!selectedOnly || selected.has(exercise.id)) &&
        (!favoriteOnly || favorites.includes(exercise.id)) &&
        (!recentOnly || recent.has(exercise.id)) &&
        tokens.every((token) => text.includes(token))
      );
    });
  }, [query, group, equipment, level, selectedOnly, selected, favoriteOnly, favorites, recentOnly, recent]);

  const activeFilterCount = Number(equipment !== "all") + Number(level !== "all");
  const filtersActive =
    group !== "all" || activeFilterCount > 0 || query !== "" || selectedOnly || favoriteOnly || recentOnly;

  const resetFilters = () => {
    setFavoriteOnly(false);
    setRecentOnly(false);
    setSelectedOnly(false);
    setGroup("all");
    setEquipment("all");
    setLevel("all");
    setQuery("");
    setLimit(PAGE_SIZE);
  };
  // Filtr o'zgarsa ro'yxat boshidan boshlanadi.
  const withReset = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value);
    setLimit(PAGE_SIZE);
  };

  const toggle = (exercise: Exercise) => {
    if (locked.has(exercise.id)) return;
    if (selected.has(exercise.id)) removeExercise(exercise.id);
    else addExercises([exercise]);
  };
  const toggleFavorite = async (id: string) => {
    if (favoriteLock.current || favoritesLoading) return;
    favoriteLock.current = true;
    setFavoriteBusy(true);
    setFavoriteError(null);
    try {
      await saveFavorites(favorites.includes(id) ? favorites.filter((item) => item !== id) : [...favorites, id]);
    } catch {
      setFavoriteError("Sevimlilarga saqlanmadi. Qayta urinib ko'ring.");
    } finally {
      favoriteLock.current = false;
      setFavoriteBusy(false);
    }
  };

  return (
    <section aria-label="Mashq tanlash" className="rounded-2xl border border-white/10 bg-[#121815]">
      <div className="sticky top-[calc(4.25rem+env(safe-area-inset-top))] z-20 space-y-3 rounded-t-2xl border-b border-white/10 bg-[#121815]/95 p-3 backdrop-blur-xl md:top-0">
        <div className="flex items-center justify-between gap-3 px-1">
          <h2 className="font-headline-md text-[20px] uppercase italic text-primary">Mashq tanlash</h2>
          {!hasLoggedSets && (
            <button
              type="button"
              onClick={discardSession}
              className="font-label-mono text-[11px] uppercase text-on-surface-variant underline underline-offset-4 hover:text-error"
            >
              Bekor qilish
            </button>
          )}
        </div>

        <div className="flex gap-2">
          <div className="relative min-w-0 flex-1">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="pointer-events-none absolute left-3.5 top-3 h-5 w-5 text-on-surface-variant"
            >
              <circle cx="10.5" cy="10.5" r="6.5" />
              <path d="m16 16 4.5 4.5" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              value={query}
              onChange={(event) => withReset(setQuery)(event.target.value)}
              aria-label="Mashq qidirish"
              placeholder="Qidirish: zhim, skvot, gantel..."
              className="h-11 w-full rounded-xl border border-white/15 bg-black/30 pl-11 pr-3 text-sm text-white outline-none focus:border-primary"
            />
          </div>
          <button
            type="button"
            onClick={() => setFiltersOpen((open) => !open)}
            aria-expanded={filtersOpen}
            aria-label="Jihoz va daraja filtrlari"
            className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${
              filtersOpen || activeFilterCount > 0
                ? "border-primary-container bg-primary-container/15 text-primary-fixed-dim"
                : "border-white/15 text-on-surface-variant"
            }`}
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="4" y1="21" x2="4" y2="14" />
              <line x1="4" y1="10" x2="4" y2="3" />
              <line x1="12" y1="21" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12" y2="3" />
              <line x1="20" y1="21" x2="20" y2="16" />
              <line x1="20" y1="12" x2="20" y2="3" />
              <line x1="1" y1="14" x2="7" y2="14" />
              <line x1="9" y1="8" x2="15" y2="8" />
              <line x1="17" y1="16" x2="23" y2="16" />
            </svg>
            {activeFilterCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary-container font-label-mono text-[9px] text-on-primary-container">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {filtersOpen && (
          <div className="grid grid-cols-2 gap-2">
            <label className="text-[11px] text-on-surface-variant">
              Jihoz
              <select
                aria-label="Jihoz"
                value={equipment}
                onChange={(event) => withReset(setEquipment)(event.target.value as Equipment | "all")}
                className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-[#202621] px-3 text-sm text-white"
              >
                <option value="all">Barchasi</option>
                {Object.entries(EQUIPMENT_LABELS).map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-[11px] text-on-surface-variant">
              Daraja
              <select
                aria-label="Daraja"
                value={level}
                onChange={(event) => withReset(setLevel)(event.target.value as Level | "all")}
                className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-[#202621] px-3 text-sm text-white"
              >
                <option value="all">Barchasi</option>
                {Object.entries(LEVEL_LABELS).map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}

        <div
          className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1 [scrollbar-width:none]"
          role="group"
          aria-label="Mushak guruhi"
        >
          <button
            type="button"
            aria-pressed={group === "all"}
            onClick={() => withReset(setGroup)("all")}
            className={`${chipBase} ${group === "all" ? chipOn : chipOff}`}
          >
            Barchasi
          </button>
          {MUSCLE_GROUPS.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={group === item.id}
              onClick={() => withReset(setGroup)(item.id)}
              className={`${chipBase} ${group === item.id ? chipOn : chipOff}`}
            >
              <MuscleIcon group={item.id} size={18} />
              {MUSCLE_SHORT_LABELS[item.id]}
            </button>
          ))}
        </div>
        <div className="-mx-3 flex gap-2 overflow-x-auto px-3 [scrollbar-width:none]" role="group" aria-label="Ro'yxat turi">
          {recent.size > 0 && (
            <button
              type="button"
              aria-pressed={recentOnly}
              onClick={() => withReset(setRecentOnly)(!recentOnly)}
              className={`${chipBase} ${recentOnly ? chipOn : chipOff}`}
            >
              <span className="material-symbols-outlined text-[16px]">history</span>
              Oxirgilar ({recent.size})
            </button>
          )}
          <button
            type="button"
            aria-pressed={favoriteOnly}
            onClick={() => withReset(setFavoriteOnly)(!favoriteOnly)}
            className={`${chipBase} ${favoriteOnly ? chipOn : chipOff}`}
          >
            <ExerciseIcon name="heart" width="15" height="15" />
            Sevimlilar ({favorites.length})
          </button>
          <button
            type="button"
            aria-pressed={selectedOnly}
            onClick={() => withReset(setSelectedOnly)(!selectedOnly)}
            className={`${chipBase} ${selectedOnly ? chipOn : chipOff}`}
          >
            <ExerciseIcon name="check" width="15" height="15" />
            Tanlanganlar ({selected.size})
          </button>
        </div>
      </div>

      <div className="p-3">
        <div className="mb-3 flex items-center justify-between gap-3 px-1">
          <p role="status" className="text-[13px] text-on-surface-variant">
            <strong className="text-white">{filtered.length}</strong> ta mashq
          </p>
          {filtersActive && (
            <button
              type="button"
              onClick={resetFilters}
              className="text-xs text-on-surface-variant underline underline-offset-4"
            >
              Filtrlarni tozalash
            </button>
          )}
        </div>
        {favoriteError && (
          <p role="alert" className="mb-3 text-sm text-error">
            {favoriteError}
          </p>
        )}

        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/15 px-6 py-12 text-center">
            <p className="text-lg font-semibold">Mos mashq topilmadi</p>
            <p className="mt-2 text-sm text-on-surface-variant">
              Qidiruv so&apos;zini yoki tanlangan filtrlarni o&apos;zgartiring.
            </p>
            <button
              type="button"
              onClick={resetFilters}
              className="mt-5 rounded-xl bg-primary/10 px-5 py-3 text-sm text-primary"
            >
              Barcha mashqlarni ko&apos;rish
            </button>
          </div>
        ) : (
          <ul className="space-y-2">
            {filtered.slice(0, limit).map((exercise) => (
              <ExerciseRow
                key={exercise.id}
                exercise={exercise}
                selected={selected.has(exercise.id)}
                locked={locked.has(exercise.id)}
                favorite={favorites.includes(exercise.id)}
                favoriteDisabled={favoriteBusy || favoritesLoading}
                onToggle={() => toggle(exercise)}
                onFavorite={() => void toggleFavorite(exercise.id)}
                onDetails={() => setDetail(exercise)}
              />
            ))}
          </ul>
        )}
        {filtered.length > limit && (
          <button
            type="button"
            onClick={() => setLimit(limit + PAGE_SIZE)}
            className="mt-3 h-12 w-full rounded-xl border border-white/15 text-sm text-on-surface-variant hover:border-primary/50"
          >
            Yana {Math.min(PAGE_SIZE, filtered.length - limit)} ta mashqni ko&apos;rsatish
          </button>
        )}
      </div>

      <ExercisePlan />

      <div className="sticky bottom-[calc(5rem+env(safe-area-inset-bottom))] z-20 flex items-center justify-between gap-3 rounded-b-2xl border-t border-white/15 bg-[#20281f]/95 p-3 backdrop-blur-xl md:bottom-0">
        <p className="pl-1 text-sm font-semibold text-white">{selected.size} ta mashq tanlandi</p>
        <button
          type="button"
          aria-label={selected.size ? "Mashg'ulotga o'tish" : "Keyinroq tanlash"}
          onClick={onDone}
          className="h-12 shrink-0 rounded-xl bg-primary-container px-6 text-sm font-semibold text-on-primary-container hover:bg-primary-fixed"
        >
          {selected.size ? "Boshlash →" : "Keyinroq"}
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
