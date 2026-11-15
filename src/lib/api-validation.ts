export const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
export const number = (value: unknown, min = 0, max = 1e9): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
export const text = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0 && value.length <= 500;
const numbers = (value: unknown, keys: string[]) => record(value) && keys.every((key) => number(value[key]));
const list = (value: unknown, valid: (item: unknown) => boolean) =>
  Array.isArray(value) && value.length <= 200 && value.every(valid);
const profile = (value: unknown) =>
  record(value) &&
  number(value.age, 1, 120) &&
  number(value.weightKg, 1, 500) &&
  ["male", "female"].includes(String(value.gender)) &&
  ["lose", "maintain", "gain"].includes(String(value.goal));
export function validRecovery(value: unknown): boolean {
  return (
    record(value) &&
    profile(value.profile) &&
    numbers(value.session, ["totalSets", "totalVolumeKg", "caloriesBurned"]) &&
    record(value.session) &&
    list(value.session.muscleGroups, text) &&
    list(value.session.exercises, (e) => record(e) && text(e.name) && numbers(e, ["sets", "topWeightKg"])) &&
    list(
      value.comparison,
      (c) =>
        record(c) &&
        text(c.exerciseName) &&
        numbers(c, ["previousBestWeightKg", "latestBestWeightKg"]) &&
        number(c.deltaKg, -1e9),
    ) &&
    record(value.nutrition) &&
    numbers(value.nutrition.consumed, ["calories", "proteinG", "fatG", "carbG"]) &&
    numbers(value.nutrition.target, ["calories", "proteinG", "fatG", "carbG"])
  );
}
// Bound streamed bodies as well as Content-Length; clients can omit that header.
export async function readJson(request: Request, maxBytes = 64 * 1024): Promise<unknown> {
  if (Number(request.headers.get("content-length")) > maxBytes) throw new Error("BODY_TOO_LARGE");
  if (!request.body) return null;
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let body = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new Error("BODY_TOO_LARGE");
      }
      body += decoder.decode(value, { stream: true });
    }
    return JSON.parse(body + decoder.decode());
  } finally {
    reader.releaseLock();
  }
}
