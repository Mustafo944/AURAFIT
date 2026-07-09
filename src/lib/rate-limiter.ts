// Simple in-memory sliding-window RPM guard so we fail fast with a friendly
// message instead of burning a real request against a provider's rate limit.
export function createRpmLimiter(limit: number, windowMs = 60 * 1000) {
  const timestamps: number[] = [];
  return function isRpmLimited(): boolean {
    const now = Date.now();
    while (timestamps.length > 0 && now - timestamps[0] > windowMs) {
      timestamps.shift();
    }
    if (timestamps.length >= limit) return true;
    timestamps.push(now);
    return false;
  };
}
