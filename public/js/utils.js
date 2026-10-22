/** Escape teks sebelum disisipkan ke HTML (teks dari AI/TheMealDB tidak boleh dipercaya begitu saja). */
export function esc(value) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(value ?? '').replace(/[&<>"']/g, (c) => map[c]);
}

/** Hanya izinkan tautan http/https. Mengembalikan null jika tidak valid. */
export function safeUrl(url) {
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.href : null;
  } catch {
    return null;
  }
}
