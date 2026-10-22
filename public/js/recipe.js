import { getRecipe } from './api.js';
import { esc, safeUrl } from './utils.js';

const content = document.getElementById('content');
const id = new URLSearchParams(location.search).get('id') ?? '';

function showError(message) {
  content.innerHTML = `<div class="note note--error" role="alert">${esc(message)}</div>`;
}

function showLoading() {
  content.innerHTML = `
    <div aria-busy="true">
      <div class="sk sk--hero"></div>
      <div class="sk sk--line"></div>
      <div class="sk sk--line sk--short"></div>
      <p class="more" style="color: var(--redup)">Menyiapkan resep dan menerjemahkannya…</p>
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
  const where = [original.area, original.category].filter(Boolean).join(', ');
  const youtube = original.youtube ? safeUrl(original.youtube) : null;
  const source = original.source ? safeUrl(original.source) : null;

  document.title = `${title} - Dapur AI`;

  content.innerHTML = `
    <article class="recipe">
      <header>
        <h1 class="recipe__title">${esc(title)}</h1>
        ${translated && translated.name !== original.name
      ? `<p class="recipe__sub">${esc(original.name)}</p>`
      : ''
    }
        <p class="recipe__where">${esc(where)}</p>
        ${translated
      ? ''
      : '<div class="note" role="status">Terjemahan sedang tidak tersedia, jadi resep ditampilkan dalam bahasa aslinya (Inggris).</div>'
    }
      </header>

      <div class="recipe__body">
        <aside class="recipe__side">
          <img src="${esc(original.thumbnail)}" alt="${esc(original.name)}" />
          <h2>Bahan</h2>
          <ul class="menu">
            ${ingredients
      .map(
        (item) =>
          `<li><span>${esc(item.name)}</span><span class="menu__dots" aria-hidden="true"></span><span class="menu__measure">${esc(item.measure)}</span></li>`,
      )
      .join('')}
          </ul>
        </aside>

        <section class="recipe__steps">
          <h2>Cara memasak</h2>
          <ol class="steps">
            ${steps.map((step) => `<li><span>${esc(step)}</span></li>`).join('')}
          </ol>
          <div class="recipe__links">
            ${youtube ? `<a class="btn btn--line" href="${esc(youtube)}" target="_blank" rel="noreferrer">Tonton video</a>` : ''}
            ${source ? `<a class="btn btn--line" href="${esc(source)}" target="_blank" rel="noreferrer">Buka sumber resep</a>` : ''}
          </div>
        </section>
      </div>
    </article>`;
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