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

/**
 * Bentuk tunggal dan jamak. TheMealDB tidak konsisten: "Egg" dan "Eggs"
 * tercatat sebagai dua bahan berbeda, jadi keduanya harus dicari.
 */
function variants(ingredient) {
  const base = norm(ingredient);
  const alt = base.endsWith('s') ? base.slice(0, -1) : `${base}s`;
  return [base, alt];
}

/**
 * Nama bahan resep dianggap sama dengan bahan pengguna jika identik, atau berakhir
 * dengan bahan itu ("Dark Soy Sauce" cocok dengan "soy sauce"). "Rice Vinegar"
 * sengaja tidak dianggap cocok dengan "rice".
 */
function isMatch(recipeIngredient, userIngredient) {
  const r = norm(recipeIngredient);
  return variants(userIngredient).some((v) => r === v || r.endsWith(` ${v}`));
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
 * Filter multi-bahan TheMealDB berbayar, jadi kita cari per bahan lalu gabungkan.
 * Setiap resep punya `coverage` (berapa bahan pengguna yang dipakai resep itu) dan
 * `coversAll` (true jika semua bahan pengguna terpakai). Hasil diurutkan: paling
 * banyak bahan pengguna terpakai, lalu paling sedikit bahan yang kurang.
 */
export async function findCandidates(userIngredients, excludeIds = [], limit = 12) {
  const exclude = new Set(excludeIds);

  const perIngredient = await Promise.all(
    userIngredients.map((ing) => Promise.allSettled(variants(ing).map((v) => filterByIngredient(v)))),
  );
  if (perIngredient.flat().every((r) => r.status === 'rejected')) {
    throw new Error('Sumber resep tidak dapat dihubungi');
  }

  // Hitung untuk tiap resep: berapa bahan pengguna yang dikandungnya (satu bahan dihitung sekali).
  const hitsById = new Map();
  for (const results of perIngredient) {
    const ids = new Set();
    for (const r of results) {
      if (r.status !== 'fulfilled') continue;
      for (const meal of r.value) ids.add(meal.idMeal);
    }
    for (const id of ids) {
      if (exclude.has(id)) continue;
      hitsById.set(id, (hitsById.get(id) ?? 0) + 1);
    }
  }

  // Acak dulu agar urutan seri bervariasi, lalu urutkan (sort bersifat stabil).
  const top = shuffle([...hitsById.entries()])
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);

  const details = await Promise.all(top.map(([id]) => lookupMeal(id).catch(() => null)));

  const candidates = [];
  details.forEach((d, i) => {
    if (!d) return;
    const coverage = top[i][1];
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
      coverage,
      coversAll: coverage === userIngredients.length,
    });
  });

  return candidates.sort(
    (a, b) =>
      b.coverage - a.coverage || a.missing.length - b.missing.length || b.matchedCount - a.matchedCount,
  );
}

/**
 * Jika ada resep yang memakai semua bahan pengguna, hanya itu yang dipakai.
 * Resep yang memakai sebagian bahan baru dipakai bila tidak ada satu pun yang lengkap.
 */
export function selectRelevant(candidates) {
  const full = candidates.filter((c) => c.coversAll);
  return {
    pool: full.length > 0 ? full : candidates,
    partialOnly: full.length === 0 && candidates.length > 0,
  };
}