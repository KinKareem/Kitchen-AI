/**
 * Cache in-memory sederhana dengan masa berlaku (TTL).
 * Data hilang saat server restart.
 */
export class TtlCache {
  #store = new Map();

  constructor(ttlMs, maxEntries = 500) {
    this.ttlMs = ttlMs;
    this.maxEntries = maxEntries;
  }

  get(key) {
    const entry = this.#store.get(key);
    if (!entry) return undefined;
    if (entry.expires < Date.now()) {
      this.#store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key, value) {
    if (this.#store.size >= this.maxEntries) {
      const oldest = this.#store.keys().next().value;
      if (oldest !== undefined) this.#store.delete(oldest);
    }
    this.#store.set(key, { value, expires: Date.now() + this.ttlMs });
  }
}
