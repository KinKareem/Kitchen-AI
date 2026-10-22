import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { parseIngredients, rankAndExplain, translateRecipe } from './ai.js';
import { findCandidates } from './matcher.js';
import { lookupMeal } from './mealdb.js';

export const apiRouter = Router();

// Batasi permintaan agar biaya AI tidak membengkak.
const limiter = (limit) =>
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Terlalu banyak permintaan. Coba lagi beberapa menit lagi.' },
  });

apiRouter.get('/health', (_req, res) => {
  res.json({ ok: true });
});

const recommendSchema = z.object({
  query: z.string().trim().min(1).max(300),
  // ID resep yang sudah ditampilkan; dikirim ulang oleh tombol Reload.
  excludeIds: z.array(z.string().regex(/^\d+$/)).max(200).default([]),
});

apiRouter.post('/recommend', limiter(30), async (req, res, next) => {
  try {
    const parsed = recommendSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Input tidak valid. Tulis bahan yang Anda punya, misalnya: telur, tahu, cabai.',
      });
      return;
    }
    const { query, excludeIds } = parsed.data;

    const ingredients = await parseIngredients(query);
    if (ingredients.length === 0) {
      res.json({
        ingredients: [],
        results: [],
        hasMore: false,
        message:
          'Saya tidak menemukan bahan makanan di pesan Anda. Coba sebutkan bahan, misalnya: ayam, bawang putih, kecap.',
      });
      return;
    }

    const candidates = await findCandidates(ingredients, excludeIds);
    if (candidates.length === 0) {
      res.json({
        ingredients,
        results: [],
        hasMore: false,
        message:
          excludeIds.length > 0
            ? 'Tidak ada rekomendasi lain untuk bahan ini. Coba tambah atau ganti bahan.'
            : 'Belum ada resep yang cocok. Coba tambahkan bahan lain.',
      });
      return;
    }

    const results = await rankAndExplain(ingredients, candidates, 4);
    res.json({
      ingredients,
      results,
      hasMore: candidates.length > results.length,
      message: null,
    });
  } catch (err) {
    next(err);
  }
});

apiRouter.get('/recipe/:id', limiter(60), async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!/^\d+$/.test(id)) {
      res.status(400).json({ error: 'ID resep tidak valid.' });
      return;
    }

    const original = await lookupMeal(id);
    if (!original) {
      res.status(404).json({ error: 'Resep tidak ditemukan.' });
      return;
    }

    // Jika terjemahan gagal, tetap kirim resep aslinya.
    const translated = await translateRecipe(original).catch((err) => {
      console.error('translateRecipe gagal:', err);
      return null;
    });

    res.json({ original, translated });
  } catch (err) {
    next(err);
  }
});
