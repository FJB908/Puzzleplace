// Beperkt hoe vaak iets mag worden geprobeerd (tegen het raden van wachtwoorden).
// Geheugen alleen: bij een herstart begint het opnieuw, dat is hier voldoende.

export function createLimiter(now = Date.now) {
  const buckets = new Map();
  return {
    // true als dit mag, false als de grens is bereikt
    hit(key, max, windowMs) {
      const t = now();
      const entry = buckets.get(key);
      if (!entry || t - entry.start > windowMs) { buckets.set(key, { start: t, count: 1 }); return true; }
      entry.count++;
      return entry.count <= max;
    },
    reset(key) { buckets.delete(key); },
    sweep() { const t = now(); for (const [k, v] of buckets) if (t - v.start > 3600_000) buckets.delete(k); },
  };
}
