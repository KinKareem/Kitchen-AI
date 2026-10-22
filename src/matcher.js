import { filterByIngredient, lookupMeal } from './mealdb.js';

// Bahan dapur dasar yang dianggap selalu ada, jadi tidak dihitung "kurang".
const STAPLES = new Set([
  'salt',
  'water',
  'pepper',
  'black pepper',
  'oil',
  'vegetable oil',
  'olive oil',
  'sugar',
]);

const norm = (s) => s.trim().toLowerCase();

function isMatch(recipeIngredient, userIngredient) {
  const r = norm(recipeIngredient);
  const u = norm(userIngredient);
  return r.includes(u) || u.includes(r);
}

function shuffle(items) {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Filter multi-bahan TheMealDB berbayar, jadi kita cari per bahan lalu
 * gabungkan hasilnya dan urutkan berdasarkan jumlah bahan yang cocok.
 */
export async function findCandidates(userIngredients, excludeIds = [], limit = 12) {
  const exclude = new Set(excludeIds);

  const settled = await Promise.allSettled(userIngredients.map((i) => filterByIngredient(i)));
  if (settled.every((r) => r.status === 'rejected')) {
    throw new Error('Sumber resep tidak dapat dihubungi');
  }

  const hitsById = new Map();
  for (const r of settled) {
    if (r.status !== 'fulfilled') continue;
    for (const meal of r.value) {
      if (exclude.has(meal.idMeal)) continue;
      hitsById.set(meal.idMeal, (hitsById.get(meal.idMeal) ?? 0) + 1);
    }
  }

  // Acak dulu agar urutan seri bervariasi, lalu urutkan (sort bersifat stabil).
  const topIds = shuffle([...hitsById.entries()])
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id);

  const details = await Promise.all(topIds.map((id) => lookupMeal(id).catch(() => null)));

  const candidates = [];
  for (const d of details) {
    if (!d) continue;
    const matched = [];
    const missing = [];
    for (const ing of d.ingredients) {
      if (userIngredients.some((u) => isMatch(ing.name, u))) matched.push(ing.name);
      else if (!STAPLES.has(norm(ing.name))) missing.push(ing.name);
    }
    candidates.push({
      id: d.id,
      name: d.name,
      thumbnail: d.thumbnail,
      category: d.category,
      area: d.area,
      matched,
      missing,
      matchedCount: matched.length,
    });
  }

  return candidates.sort(
    (a, b) => a.missing.length - b.missing.length || b.matchedCount - a.matchedCount,
  );
}
