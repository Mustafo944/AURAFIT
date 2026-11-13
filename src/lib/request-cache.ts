// Per-process, bounded cache. No images or credentials are retained in keys.
// Concurrent requests share a promise; failures are never cached.
export function createRequestCache<T>(ttlMs: number, capacity = 128, maxPending = 16) {
  const values = new Map<string, { value: T; expires: number }>();
  const pending = new Map<string, Promise<T>>();
  return async (key: string, run: () => Promise<T>): Promise<T> => {
    const now = Date.now();
    for (const [id, entry] of values) if (entry.expires <= now) values.delete(id);
    const cached = values.get(key);
    if (cached) return cached.value;
    const active = pending.get(key);
    if (active) return active;
    if (pending.size >= maxPending) throw new Error("AI_BUSY");
    const task = Promise.resolve()
      .then(run)
      .then((value) => {
        if (values.size >= capacity) values.delete(values.keys().next().value!);
        values.set(key, { value, expires: Date.now() + ttlMs });
        return value;
      })
      .finally(() => pending.delete(key));
    pending.set(key, task);
    return task;
  };
}
