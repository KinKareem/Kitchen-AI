# Dapur AI

Tulis bahan yang kamu punya, AI carikan resep yang cocok.
Satu proyek: server Node (Express) + halaman HTML/CSS/JS biasa.

## Menjalankan

```bash
npm install
copy .env.example .env      # Windows (Mac/Linux: cp .env.example .env)
# buka .env lalu isi GEMINI_API_KEY
npm run dev
```

Buka http://localhost:3000

- `npm run dev`: jalan dan otomatis restart saat file server berubah.
- `npm start`: jalan biasa.

## Struktur

```
dapur-ai/
├── server.js          # titik masuk: menyajikan public/ dan route /api
├── src/               # kode server (AI, TheMealDB, pencocokan bahan)
├── public/            # halaman yang dibuka di browser
│   ├── index.html, recipe.html
│   ├── css/style.css
│   └── js/ (app.js, recipe.js, api.js, utils.js)
└── .env               # API key (jangan di-commit)
```

API key Gemini hanya dibaca server dari `.env` dan tidak pernah dikirim ke browser.
