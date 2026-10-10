// Effecten: bloesemblaadjes die vallen, opspatten of regenen, en een zachte rimpel op knoppen.
// Alles stopt vanzelf bij "Rustige weergave" en als het besturingssysteem minder beweging vraagt.

const root = document.documentElement;
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
export const motionOK = () => root.dataset.calm !== 'true' && !reduce.matches;

const TAU = Math.PI * 2;
const rand = (a, b) => a + Math.random() * (b - a);

let layer;
function fxLayer() {
  if (!layer) {
    layer = document.createElement('div');
    layer.className = 'fx-layer';
    layer.setAttribute('aria-hidden', 'true');
    document.body.append(layer);
  }
  return layer;
}

function petalEl(size) {
  const el = document.createElement('span');
  el.className = `fx-petal p-${'abc'[Math.floor(Math.random() * 3)]}`;
  el.style.width = `${size}px`;
  el.style.height = `${size * 1.28}px`;
  return el;
}

// Eén blaadje laten vliegen: eerst een zet (snelheid), dan zachtjes naar beneden dwarrelen.
function fly(el, { x, y, vx, vy, duration, delay = 0, drift = 40, fall = 110, spin = 540 }) {
  const steps = 18, k = 2.6, flip = rand(0, TAU), phase = rand(0, TAU);
  const frames = [];
  for (let i = 0; i <= steps; i++) {
    const p = i / steps, t = (p * duration) / 1000;
    const damp = (1 - Math.exp(-k * t)) / k;                   // de zet verdwijnt door luchtweerstand
    const px = vx * damp + Math.sin(t * 5 + phase) * drift * p;
    const py = vy * damp + fall * (t - damp);                   // daarna daalt het blaadje rustig
    const rot = spin * p * (vx < 0 ? -1 : 1);
    const sx = Math.cos(t * 7 + flip);                          // omklappen: lijkt een draaiend blaadje
    frames.push({
      transform: `translate(${(x + px).toFixed(1)}px, ${(y + py).toFixed(1)}px) rotate(${rot.toFixed(0)}deg) scale(${sx.toFixed(2)}, 1)`,
      opacity: p < .15 ? Math.min(1, p / .08) : p > .72 ? Math.max(0, (1 - p) / .28) : 1,
      offset: p,
    });
  }
  fxLayer().append(el);
  const anim = el.animate(frames, { duration, delay, easing: 'linear', fill: 'both' });
  anim.finished.then(() => el.remove(), () => el.remove());
}

// Een bosje blaadjes dat vanaf een punt opspat (bijv. een verloren leven of een goed antwoord).
export function burst({ x, y, count = 12, power = 260, cone = [-150, -30], size = [12, 22], life = [1100, 1700] }) {
  if (!motionOK()) return;
  for (let i = 0; i < count; i++) {
    const a = (rand(cone[0], cone[1]) * Math.PI) / 180, v = rand(.4, 1) * power;
    const s = rand(size[0], size[1]);
    fly(petalEl(s), {
      x: x - s / 2, y: y - s / 2, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
      duration: rand(life[0], life[1]), drift: rand(14, 40), fall: rand(90, 150), spin: rand(280, 700),
    });
  }
}

// Een bui van blaadjes over het hele scherm (bij winnen).
export function rain({ count = 46, duration = 4200 } = {}) {
  if (!motionOK()) return;
  const w = window.innerWidth, h = window.innerHeight;
  for (let i = 0; i < count; i++) {
    const s = rand(14, 28), d = rand(3200, 5200);
    fly(petalEl(s), {
      x: rand(-20, w), y: -40, vx: rand(-30, 30), vy: rand(60, 160), duration: d,
      delay: rand(0, duration - 1200), drift: rand(30, 80), fall: (h + 120) / (d / 1000) * 1.05, spin: rand(300, 800),
    });
  }
}

// Zachte rimpel op de gevulde knoppen
export function initRipple() {
  document.addEventListener('pointerdown', (e) => {
    if (!motionOK()) return;
    const btn = e.target.closest?.('.btn-primary, .hero .btn');
    if (!btn || btn.disabled) return;
    const r = btn.getBoundingClientRect();
    const size = Math.max(r.width, r.height) * 2;
    const dot = document.createElement('span');
    dot.className = 'ripple';
    dot.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - r.left - size / 2}px;top:${e.clientY - r.top - size / 2}px`;
    btn.append(dot);
    dot.addEventListener('animationend', () => dot.remove());
  });
}

// Langzaam vallende blaadjes op de achtergrond (alleen CSS-beweging, dus zuinig)
export function initAmbient() {
  const field = document.createElement('div');
  field.className = 'petal-field';
  field.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < 7; i++) {
    const p = document.createElement('span');
    p.className = `petal p-${'abc'[i % 3]}`;
    const s = rand(14, 26);
    p.style.cssText = `--x:${rand(2, 96).toFixed(0)}%;--s:${s.toFixed(0)}px;--t:${rand(17, 27).toFixed(1)}s;--d:${(-rand(0, 24)).toFixed(1)}s;--sway:${rand(40, 110).toFixed(0)}px;--flip:${rand(.4, 1).toFixed(2)}`;
    field.append(p);
  }
  document.body.prepend(field);
}
