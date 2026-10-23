import { recommend } from './api.js';
import { initScene, introHero, plantSvg, revealItems } from './scene.js';
import { esc } from './utils.js';

const STORAGE_KEY = 'dapur-ai:state';
const MAX_MISSING_SHOWN = 6;

// ---------- State ----------
// Disimpan di sessionStorage supaya hasil tidak hilang saat kembali dari halaman resep.
function emptyState() {
  return { query: '', ingredients: [], results: [], shownIds: [], notice: null };
}

function loadState() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? { ...emptyState(), ...JSON.parse(raw) } : emptyState();
  } catch {
    return emptyState();
  }
}

function saveState() {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // abaikan jika penyimpanan penuh/dinonaktifkan
  }
}

let state = loadState();
let loading = null; // null | 'search' | 'reload'
let errorMessage = null;
let revealNext = false; // true setelah hasil baru tiba, agar kartu dimunculkan dengan animasi
let currentPhoto = null;

// ---------- Elemen ----------
const $ = (id) => document.getElementById(id);
const form = $('search-form');
const input = $('bahan');
const submitBtn = $('submit-btn');
const examples = $('examples');
const errorBox = $('error');
const detectedBox = $('detected');
const noticeBox = $('notice');
const resultsBox = $('results');
const reloadBox = $('reload');
const reloadBtn = $('reload-btn');
const reloadLabel = $('reload-label');

const scene = initScene();
$('plant').innerHTML = plantSvg();

// ---------- Tampilan ----------
function dishHtml(r) {
  const href = `/recipe.html?id=${encodeURIComponent(r.id)}`;
  const missingShown = r.missing.slice(0, MAX_MISSING_SHOWN);
  const missingHidden = r.missing.length - missingShown.length;
  const where = [r.area, r.category].filter(Boolean).join(' / ');

  const pills =
    r.matched.map((item) => `<li class="pill pill--have">${esc(item)}</li>`).join('') +
    missingShown.map((item) => `<li class="pill pill--need">${esc(item)}</li>`).join('') +
    (missingHidden > 0 ? `<li class="pill pill--more">${missingHidden} lainnya</li>` : '');

  const swaps = r.substitutions.length
    ? `<details class="swap">
         <summary>Pengganti bahan</summary>
         <ul>${r.substitutions.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
       </details>`
    : '';

  return `
    <article class="dish glass" data-photo="${esc(r.thumbnail)}">
      <a class="dish__photo" href="${href}" tabindex="-1" aria-hidden="true">
        <img src="${esc(r.thumbnail)}" alt="" loading="lazy" />
      </a>
      <div class="dish__body">
        <h3 class="dish__name"><a href="${href}">${esc(r.name)}</a></h3>
        <p class="dish__where">${esc(where)}</p>
        <p class="dish__why">${esc(r.reason)}</p>
        ${pills ? `<ul class="pills">${pills}</ul>` : ''}
        ${swaps}
        <div class="dish__open"><a class="btn-line" href="${href}">Lihat resep</a></div>
      </div>
    </article>`;
}

function legendHtml() {
  return `<ul class="legend" aria-label="Arti penanda">
    <li class="pill pill--have">sudah ada</li>
    <li class="pill pill--need">perlu dibeli</li>
  </ul>`;
}

function skeletonHtml() {
  return `<div class="list" aria-hidden="true">${'<div class="sk sk--card"></div>'.repeat(4)}</div>`;
}

function updateSubmitState() {
  submitBtn.disabled = loading !== null || !input.value.trim();
}

function render() {
  const busy = loading !== null;
  const hasResults = state.results.length > 0;

  updateSubmitState();
  submitBtn.textContent = loading === 'search' ? 'Mencari…' : 'Cari resep';
  examples.querySelectorAll('button[data-example]').forEach((b) => (b.disabled = busy));

  errorBox.hidden = !errorMessage;
  errorBox.textContent = errorMessage ?? '';

  const showDetected = state.ingredients.length > 0 && !busy;
  detectedBox.hidden = !showDetected;
  if (showDetected) {
    detectedBox.innerHTML = `Dibaca sebagai: <strong>${esc(state.ingredients.join(', '))}</strong>`;
  }

  const showNotice = Boolean(state.notice) && !busy;
  noticeBox.hidden = !showNotice;
  if (showNotice) {
    noticeBox.innerHTML =
      esc(state.notice) +
      (hasResults && state.shownIds.length > state.results.length
        ? ' <button type="button" class="linkbtn" data-action="restart">Ulangi dari awal</button>'
        : '');
  }

  resultsBox.setAttribute('aria-busy', String(busy));
  if (loading === 'search') {
    resultsBox.innerHTML = skeletonHtml();
  } else if (hasResults) {
    const dim = loading === 'reload' ? ' list--dim' : '';
    resultsBox.innerHTML =
      legendHtml() + `<div class="list${dim}">${state.results.map(dishHtml).join('')}</div>`;
  } else {
    resultsBox.innerHTML = '';
  }

  reloadBox.hidden = !(hasResults && loading !== 'search');
  reloadBtn.disabled = busy;
  reloadBtn.classList.toggle('is-spinning', loading === 'reload');
  reloadLabel.textContent = loading === 'reload' ? 'Mencari opsi lain…' : 'Tampilkan opsi lain';

  // Foto latar mengikuti hidangan teratas. Selama mencari, foto lama dipertahankan.
  if (loading !== 'search') {
    const top = hasResults ? state.results[0].thumbnail : null;
    if (top !== currentPhoto) {
      currentPhoto = top;
      scene.setPhoto(top);
    }
  }

  if (revealNext && loading === null && hasResults) {
    revealNext = false;
    revealItems('.legend, .dish');
  }
}

// ---------- Aksi ----------
/** Pencarian baru: daftar "sudah tampil" dikosongkan. */
async function search(query) {
  loading = 'search';
  errorMessage = null;
  render();
  try {
    const res = await recommend(query, []);
    state = {
      query,
      ingredients: res.ingredients,
      results: res.results,
      shownIds: res.results.map((r) => r.id),
      notice: res.message,
    };
    revealNext = true;
    saveState();
  } catch (err) {
    errorMessage = err.message || 'Terjadi kesalahan.';
  } finally {
    loading = null;
    render();
  }
}

/** Opsi lain: minta rekomendasi baru dengan mengecualikan yang sudah tampil. */
async function reload() {
  if (!state.query) return;
  loading = 'reload';
  errorMessage = null;
  render();
  try {
    const res = await recommend(state.query, state.shownIds);
    if (res.results.length === 0) {
      // Kehabisan opsi: pertahankan hasil lama dan beri tahu pengguna.
      state = { ...state, notice: res.message ?? 'Tidak ada rekomendasi lain.' };
    } else {
      state = {
        ...state,
        ingredients: res.ingredients,
        results: res.results,
        shownIds: [...state.shownIds, ...res.results.map((r) => r.id)],
        notice: res.message,
      };
      revealNext = true;
    }
    saveState();
  } catch (err) {
    errorMessage = err.message || 'Terjadi kesalahan.';
  } finally {
    loading = null;
    render();
  }
}

// ---------- Event ----------
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const query = input.value.trim();
  if (query && loading === null) search(query);
});

input.addEventListener('input', updateSubmitState);

examples.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-example]');
  if (!btn || loading !== null) return;
  input.value = btn.dataset.example;
  search(btn.dataset.example);
});

reloadBtn.addEventListener('click', reload);

noticeBox.addEventListener('click', (e) => {
  if (e.target.closest('[data-action="restart"]') && state.query && loading === null) {
    search(state.query);
  }
});

// Menyorot kartu mengganti foto latar
function previewPhoto(e) {
  const card = e.target.closest('.dish');
  if (card && loading === null && card.dataset.photo !== currentPhoto) {
    currentPhoto = card.dataset.photo;
    scene.setPhoto(currentPhoto);
  }
}
resultsBox.addEventListener('pointerover', previewPhoto);
resultsBox.addEventListener('focusin', previewPhoto);

// ---------- Mulai ----------
input.value = state.query;
render();
introHero();