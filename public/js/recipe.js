import { getRecipe } from './api.js';
import { initScene, introRecipe } from './scene.js';
import { esc, safeUrl } from './utils.js';

const content = document.getElementById('content');
const id = new URLSearchParams(location.search).get('id') ?? '';
const scene = initScene();

function showError(message) {
  content.innerHTML = `<div class="note note--error" role="alert">${esc(message)}</div>`;
}

function showLoading() {
  content.innerHTML = `
    <div aria-busy="true">
      <div class="sk sk--hero"></div>
      <p class="read">Menyiapkan resep dan menerjemahkannya…</p>
    </div>`;
}

function render({ original, translated }) {
  const title = translated?.name ?? original.name;
  const ingredients = translated?.ingredients ?? original.ingredients;
  const steps =
    translated?.steps ??
    original.instructions
      .split(/\r?\n+/)
      .map((s) => s.trim())
      .filter(Boolean);
  const where = [original.area, original.category].filter(Boolean).join(' / ');
  const youtube = original.youtube ? safeUrl(original.youtube) : null;
  const source = original.source ? safeUrl(original.source) : null;
  const subtitle =
    translated && translated.name !== original.name ? original.name : 'Resep lengkap, bahan, dan langkahnya';

  document.title = `${title} - Dapur AI`;
  scene.setPhoto(original.thumbnail);

  content.innerHTML = `
    <article>
      <section class="rhero glass">
        <div class="rhero__plate"><img src="${esc(original.thumbnail)}" alt="${esc(original.name)}" /></div>
        <div class="rhero__copy">
          <p class="eyebrow">${esc(where)}</p>
          <h1 class="rtitle">${esc(title)}</h1>
          <p class="rsub">${esc(subtitle)}</p>
          ${translated
      ? ''
      : '<div class="note" role="status">Terjemahan sedang tidak tersedia, jadi resep ditampilkan dalam bahasa aslinya (Inggris).</div>'
    }
          <div class="rlinks">
            ${youtube ? `<a class="btn-cream" href="${esc(youtube)}" target="_blank" rel="noreferrer">Tonton video</a>` : ''}
            ${source ? `<a class="btn-line" href="${esc(source)}" target="_blank" rel="noreferrer">Sumber resep</a>` : ''}
          </div>
        </div>
      </section>

      <div class="rgrid">
        <section class="panel glass">
          <h2>Bahan</h2>
          <ul class="menu">
            ${ingredients
      .map(
        (item) =>
          `<li><span>${esc(item.name)}</span><span class="menu__dots" aria-hidden="true"></span><span class="menu__measure">${esc(item.measure)}</span></li>`,
      )
      .join('')}
          </ul>
        </section>

        <section class="panel glass">
          <h2>Cara memasak</h2>
          <ol class="steps">
            ${steps.map((step) => `<li><span>${esc(step)}</span></li>`).join('')}
          </ol>
        </section>
      </div>
    </article>`;

  introRecipe();
}

async function init() {
  if (!/^\d+$/.test(id)) {
    showError('ID resep tidak valid.');
    return;
  }
  showLoading();
  try {
    render(await getRecipe(id));
  } catch (err) {
    showError(err.message || 'Terjadi kesalahan.');
  }
}

init();