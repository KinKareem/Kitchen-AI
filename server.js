import 'dotenv/config'; // harus paling atas agar .env terbaca sebelum modul lain
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { apiRouter } from './src/routes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT ?? 3000);

app.use(express.json({ limit: '10kb' }));

// API
app.use('/api', apiRouter);
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Endpoint tidak ditemukan.' });
});

// Halaman (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));

// Penanganan error terpusat
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Terjadi kesalahan di server. Coba lagi sebentar.' });
});

app.listen(PORT, () => {
  console.log(`Dapur AI berjalan di http://localhost:${PORT}`);
});
