// Latar (foto buram + dedaunan), tanaman hero, dan animasi GSAP.
// GSAP dimuat lewat tag <script> di HTML. Jika gagal dimuat (misalnya offline) atau
// pengguna memilih "kurangi gerakan", semua animasi dilewati dan halaman tetap berfungsi.
import { safeUrl } from './utils.js';

const gsap = window.gsap ?? null;
const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
export const motion = Boolean(gsap) && !reduceMotion;

// ---------- SVG ----------
function leavesSvg() {
  const leaf = (x, y, r, s, fill, o = 1) =>
    `<use href="#leaf" transform="translate(${x} ${y}) rotate(${r}) scale(${s})" fill="url(#${fill})" opacity="${o}" />`;

  const far = [
    leaf(-200, 220, -20, 3.2, 'lg1'),
    leaf(300, -80, 30, 3, 'lg1'),
    leaf(900, 120, 160, 3.4, 'lg1'),
    leaf(1250, 620, -150, 3.2, 'lg1'),
    leaf(100, 820, -40, 3, 'lg1'),
    leaf(760, 940, 200, 3.6, 'lg1'),
  ].join('');

  const near = [
    leaf(-90, 470, -10, 2.2, 'lg2', 0.85),
    leaf(1520, 320, 190, 2.4, 'lg2', 0.8),
    leaf(1320, 960, -160, 2.6, 'lg2', 0.85),
    leaf(220, -50, 40, 2, 'lg2', 0.75),
    leaf(1040, -70, 140, 2.2, 'lg2', 0.8),
  ].join('');

  return `
    <svg class="bg__leaves" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="lg1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#0f3d1e" /><stop offset="1" stop-color="#2e7d3a" />
        </linearGradient>
        <linearGradient id="lg2" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#1b5e2b" /><stop offset="1" stop-color="#8fd13f" />
        </linearGradient>
        <filter id="blurFar" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="14" /></filter>
        <filter id="blurNear" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="4" /></filter>
        <g id="leaf">
          <path d="M0 0 C70 -110 250 -130 360 -10 C260 90 80 90 0 0Z" />
          <path d="M0 0 C120 -20 250 -25 360 -10" fill="none" stroke="rgba(255,255,255,.16)" stroke-width="3" />
        </g>
      </defs>
      <g class="far" filter="url(#blurFar)">${far}</g>
      <g class="near" filter="url(#blurNear)">${near}</g>
    </svg>`;
}

/** Tanaman di tepi panel hero, menimpa batas panel seperti pada referensi. */
export function plantSvg() {
  const blades = [
    [-78, 0.5, 'pg1'],
    [-62, 0.7, 'pg2'],
    [-40, 0.9, 'pg1'],
    [-22, 1, 'pg2'],
    [-6, 1.08, 'pg1'],
    [10, 1, 'pg2'],
    [26, 0.92, 'pg1'],
    [44, 0.8, 'pg2'],
    [62, 0.62, 'pg1'],
  ];
  const use = ([r, s, g]) =>
    `<g class="blade"><use href="#blade" transform="translate(200 540) rotate(${r}) scale(${s})" fill="url(#${g})" /></g>`;

  return `
    <svg viewBox="0 0 400 560" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="pg1" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stop-color="#174d27" /><stop offset=".55" stop-color="#3f9a3c" /><stop offset="1" stop-color="#c4ec5c" />
        </linearGradient>
        <linearGradient id="pg2" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stop-color="#12401f" /><stop offset=".6" stop-color="#2f8a3a" /><stop offset="1" stop-color="#9fdc4a" />
        </linearGradient>
        <g id="blade">
          <path d="M-14 0 C-40 -140 -26 -280 8 -420 C46 -280 48 -140 14 0Z" />
          <path d="M0 0 C-4 -140 0 -280 8 -420" fill="none" stroke="rgba(255,255,255,.4)" stroke-width="2" />
        </g>
      </defs>
      ${blades.map(use).join('')}
    </svg>`;
}

// ---------- Latar ----------
/** Membuat latar dan mengembalikan setPhoto(url | null) untuk mengganti foto latar. */
export function initScene() {
  const bg = document.createElement('div');
  bg.className = 'bg';
  bg.setAttribute('aria-hidden', 'true');
  bg.innerHTML = `<div class="bg__photo"></div><div class="bg__photo"></div>${leavesSvg()}<div class="bg__shade"></div>`;
  document.body.prepend(bg);

  const layers = [...bg.querySelectorAll('.bg__photo')];
  const leaves = bg.querySelector('.bg__leaves');
  const far = bg.querySelector('.far');
  const near = bg.querySelector('.near');

  function fade(el, opacity) {
    if (motion) gsap.to(el, { opacity, duration: 0.9, ease: 'power2.out', overwrite: true });
    else el.style.opacity = String(opacity);
  }

  // Paralaks halus mengikuti pointer
  if (motion) {
    window.addEventListener(
      'pointermove',
      (e) => {
        const x = e.clientX / window.innerWidth - 0.5;
        const y = e.clientY / window.innerHeight - 0.5;
        gsap.to(far, { x: -x * 30, y: -y * 20, duration: 1.4, ease: 'power3.out' });
        gsap.to(near, { x: -x * 70, y: -y * 45, duration: 1.4, ease: 'power3.out' });
      },
      { passive: true },
    );
  }

  let front = 0;
  let wanted = null;

  function setPhoto(url) {
    const safe = url ? safeUrl(url) : null;
    if (safe === wanted) return;
    wanted = safe;

    if (!safe) {
      layers.forEach((l) => fade(l, 0));
      fade(leaves, 1);
      return;
    }

    // Muat dulu agar pergantian tidak berkedip
    const img = new Image();
    img.onload = () => {
      if (wanted !== safe) return; // sudah ada permintaan yang lebih baru
      const incoming = layers[1 - front];
      incoming.style.backgroundImage = `url("${safe.replace(/"/g, '%22')}")`;
      fade(incoming, 1);
      fade(layers[front], 0);
      fade(leaves, 0.15);
      front = 1 - front;
    };
    img.src = safe;
  }

  return { setPhoto };
}

// ---------- Animasi ----------
export function introHero() {
  if (!motion) return;
  gsap
    .timeline({ defaults: { ease: 'power3.out' } })
    .from('.hero', { y: 36, opacity: 0, duration: 0.9 })
    .from('.hero .line > span', { yPercent: 110, duration: 0.9, stagger: 0.12 }, '-=0.5')
    .from(
      '.hero .blade',
      { scale: 0, rotation: -10, svgOrigin: '200 540', duration: 1.1, stagger: 0.07, ease: 'back.out(1.5)' },
      '-=0.9',
    )
    .from('.hero__sub, .ask__box, .hero__pills', { y: 18, opacity: 0, duration: 0.7, stagger: 0.1 }, '-=0.7');
}

export function introRecipe() {
  if (!motion) return;
  gsap
    .timeline({ defaults: { ease: 'power3.out' } })
    .from('.rhero', { y: 36, opacity: 0, duration: 0.9 })
    .from('.rhero__plate', { scale: 0.6, rotation: -24, opacity: 0, duration: 1.1, ease: 'back.out(1.4)' }, '-=0.6')
    .from('.rhero__copy > *', { y: 20, opacity: 0, duration: 0.7, stagger: 0.08 }, '-=0.8')
    .from('.panel', { y: 30, opacity: 0, duration: 0.8, stagger: 0.12 }, '-=0.5');
}

/** Memunculkan item hasil satu per satu setelah pencarian selesai. */
export function revealItems(selector) {
  if (!motion) return;
  gsap.from(selector, {
    y: 36,
    opacity: 0,
    duration: 0.7,
    stagger: 0.09,
    ease: 'power3.out',
    clearProps: 'transform,opacity',
  });
}
