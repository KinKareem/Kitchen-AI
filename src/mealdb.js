import { TtlCache } from './cache.js';

const BASE = process.env.MEALDB_BASE_URL ?? 'https://www.themealdb.com/api/json/v1/1';
const detailCache = new TtlCache(24 * 60 * 60 * 1000); // 24 jam

async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`TheMealDB error ${res.status}`);
  return res.json();
}

/** Cari resep yang memakai satu bahan. TheMealDB memakai underscore untuk spasi. */
export async function filterByIngredient(ingredient) {
  const key = ingredient.trim().toLowerCase().replace(/\s+/g, '_');
  const data = await getJson(`${BASE}/filter.php?i=${encodeURIComponent(key)}`);
  return Array.isArray(data?.meals) ? data.meals : [];
}

/** Ambil detail lengkap satu resep (dengan cache). */
export async function lookupMeal(id) {
  const cached = detailCache.get(id);
  if (cached) return cached;

  const data = await getJson(`${BASE}/lookup.php?i=${encodeURIComponent(id)}`);
  const m = data?.meals?.[0];
  if (!m) return null;

  const ingredients = [];
  for (let i = 1; i <= 20; i++) {
    const name = String(m[`strIngredient${i}`] ?? '').trim();
    if (!name) continue;
    ingredients.push({ name, measure: String(m[`strMeasure${i}`] ?? '').trim() });
  }

  const detail = {
    id: String(m.idMeal),
    name: String(m.strMeal ?? ''),
    category: String(m.strCategory ?? ''),
    area: String(m.strArea ?? ''),
    instructions: String(m.strInstructions ?? ''),
    thumbnail: String(m.strMealThumb ?? ''),
    youtube: m.strYoutube ? String(m.strYoutube) : null,
    source: m.strSource ? String(m.strSource) : null,
    ingredients,
  };
  detailCache.set(id, detail);
  return detail;
}
