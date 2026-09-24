/**
 * Architectural scene renderer.
 *
 * Generates monochrome, perspective-correct SVG renderings of each space in
 * three states — BEFORE (raw structure), PROCESS (under construction) and
 * AFTER (finished). All three states share the exact same camera, so
 * before/after sliders line up perfectly.
 *
 * These are illustrative placeholders. Real project photography replaces
 * them through site.config.js.
 */

const W = 1600;
const H = 1000;
const VP = { x: 800, y: 460 }; // vanishing point / horizon
const B = { x0: 440, x1: 1160, y0: 230, y1: 690 }; // back wall

// ---------------------------------------------------------------- helpers
const r = (n) => Math.round(n * 10) / 10;
const P = (X, Y, s) => [r(VP.x + (X - VP.x) * s), r(VP.y + (Y - VP.y) * s)];
const pts = (list) => list.map((p) => p.join(',')).join(' ');
const poly = (list, attrs = '') => `<polygon points="${pts(list)}" ${attrs}/>`;
const line = (a, b, attrs = '') => `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" ${attrs}/>`;
const rect = (x, y, w, h, attrs = '') => `<rect x="${r(x)}" y="${r(y)}" width="${r(w)}" height="${r(h)}" ${attrs}/>`;

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Planes */
const backRect = (x0, y0, x1, y1, attrs) => rect(x0, y0, x1 - x0, y1 - y0, attrs);
const floorQuad = (x0, x1, s0, s1, y = B.y1) => [P(x0, y, s0), P(x1, y, s0), P(x1, y, s1), P(x0, y, s1)];
const ceilQuad = (x0, x1, s0, s1, y = B.y0) => [P(x0, y, s0), P(x1, y, s0), P(x1, y, s1), P(x0, y, s1)];
const sideQuad = (X, y0, y1, s0, s1) => [P(X, y0, s0), P(X, y0, s1), P(X, y1, s1), P(X, y1, s0)];
const frontQuad = (x0, x1, y0, y1, s) => [P(x0, y0, s), P(x1, y0, s), P(x1, y1, s), P(x0, y1, s)];

/** Perspective box. s0 = far face, s1 = near face. */
function box(x0, x1, y0, y1, s0, s1, c) {
  let out = '';
  if (y0 > VP.y && c.top) out += poly(ceilQuad(x0, x1, s0, s1, y0), `fill="${c.top}"`);
  if (y1 < VP.y && c.bottom) out += poly(ceilQuad(x0, x1, s0, s1, y1), `fill="${c.bottom}"`);
  if (x1 < VP.x && c.side) out += poly(sideQuad(x1, y0, y1, s0, s1), `fill="${c.side}"`);
  if (x0 > VP.x && c.side) out += poly(sideQuad(x0, y0, y1, s0, s1), `fill="${c.side}"`);
  if (c.front) out += poly(frontQuad(x0, x1, y0, y1, s1), `fill="${c.front}"${c.stroke ? ` stroke="${c.stroke}" stroke-width="${c.sw || 1}"` : ''}`);
  return out;
}

const depthSteps = (from, to, n, curve = 1.35) =>
  Array.from({ length: n }, (_, i) => from + (to - from) * Math.pow(i / (n - 1), curve));

// --------------------------------------------------------------- defs
function defs(id) {
  return `<defs>
  <filter id="grain-${id}" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed="4" stitchTiles="stitch"/>
    <feColorMatrix values="0 0 0 0 .5  0 0 0 0 .5  0 0 0 0 .5  0 0 0 .09 0"/>
  </filter>
  <filter id="concrete-${id}" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency=".012 .02" numOctaves="4" seed="9"/>
    <feColorMatrix values="0 0 0 0 .3  0 0 0 0 .3  0 0 0 0 .29  0 0 0 .55 -.15"/>
  </filter>
  <filter id="blur-${id}"><feGaussianBlur stdDeviation="18"/></filter>
  <filter id="soft-${id}"><feGaussianBlur stdDeviation="4"/></filter>
  <radialGradient id="vig-${id}" cx="50%" cy="46%" r="75%">
    <stop offset="55%" stop-color="#000" stop-opacity="0"/>
    <stop offset="100%" stop-color="#000" stop-opacity=".38"/>
  </radialGradient>
  <linearGradient id="shaft-${id}" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#fffdf7" stop-opacity=".55"/>
    <stop offset="1" stop-color="#fffdf7" stop-opacity="0"/>
  </linearGradient>
  <linearGradient id="sky-${id}" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#fbfaf7"/>
    <stop offset=".7" stop-color="#e9e7e1"/>
    <stop offset="1" stop-color="#d9d6cf"/>
  </linearGradient>
  <linearGradient id="glass-${id}" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#ffffff" stop-opacity=".9"/>
    <stop offset=".5" stop-color="#e7e6e2" stop-opacity=".75"/>
    <stop offset="1" stop-color="#cfcdc8" stop-opacity=".8"/>
  </linearGradient>
  <linearGradient id="mirror-${id}" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#d4d3cf"/>
    <stop offset=".45" stop-color="#f3f2ee"/>
    <stop offset=".55" stop-color="#e0dfdb"/>
    <stop offset="1" stop-color="#bdbcb7"/>
  </linearGradient>
  <linearGradient id="haze-${id}" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#fff" stop-opacity="0"/>
    <stop offset=".5" stop-color="#fff" stop-opacity=".10"/>
    <stop offset="1" stop-color="#fff" stop-opacity="0"/>
  </linearGradient>
  <radialGradient id="glow-${id}" cx="50%" cy="50%" r="50%">
    <stop offset="0" stop-color="#fff4dc" stop-opacity=".9"/>
    <stop offset="1" stop-color="#fff4dc" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="floorsheen-${id}" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#fff" stop-opacity=".22"/>
    <stop offset="1" stop-color="#fff" stop-opacity="0"/>
  </linearGradient>
  <clipPath id="floorclip-${id}"><polygon points="${pts(floorQuad(B.x0, B.x1, 1, 4))}"/></clipPath>
  <clipPath id="ceilclip-${id}"><polygon points="${pts(ceilQuad(B.x0, B.x1, 1, 4))}"/></clipPath>
  <clipPath id="backclip-${id}"><rect x="${B.x0}" y="${B.y0}" width="${B.x1 - B.x0}" height="${B.y1 - B.y0}"/></clipPath>
  <clipPath id="leftclip-${id}"><polygon points="${pts(sideQuad(B.x0, B.y0, B.y1, 1, 4))}"/></clipPath>
  <clipPath id="rightclip-${id}"><polygon points="${pts(sideQuad(B.x1, B.y0, B.y1, 1, 4))}"/></clipPath>
</defs>`;
}

// ----------------------------------------------------------- room shell
const PALETTE = {
  before: { back: '#8e877b', left: '#7d766b', right: '#857e72', ceil: '#56524c', floor: '#8b8984', stud: '#c4b394', studShade: '#a08f71' },
  process: { back: '#d9d7d1', left: '#cbc9c3', right: '#d2d0ca', ceil: '#e2e0db', floor: '#c6bba6', stud: '#c4b394', studShade: '#a08f71' },
  after: { back: '#e8e5de', left: '#d9d5cc', right: '#e0dcd4', ceil: '#f1efea', floor: '#b7a386', stud: '', studShade: '' },
};

function shell(id, state, opts = {}) {
  const c = { ...PALETTE[state], ...(opts.colors || {}) };
  let o = '';
  o += poly(ceilQuad(B.x0, B.x1, 1, 4), `fill="${c.ceil}"`);
  o += poly(sideQuad(B.x0, B.y0, B.y1, 1, 4), `fill="${c.left}"`);
  o += poly(sideQuad(B.x1, B.y0, B.y1, 1, 4), `fill="${c.right}"`);
  o += poly(floorQuad(B.x0, B.x1, 1, 4), `fill="${c.floor}"`);
  o += backRect(B.x0, B.y0, B.x1, B.y1, `fill="${c.back}"`);
  if (state === 'before') {
    // concrete texture on floor + walls
    o += `<g clip-path="url(#floorclip-${id})"><rect width="${W}" height="${H}" filter="url(#concrete-${id})"/></g>`;
    o += `<g opacity=".6" clip-path="url(#backclip-${id})"><rect width="${W}" height="${H}" filter="url(#concrete-${id})"/></g>`;
  }
  return o;
}

/** Framing on the back wall, leaving openings */
function backStuds(openings = [], color = '#c4b394', shade = '#a08f71') {
  let o = '';
  for (let x = B.x0 + 6; x < B.x1; x += 44) {
    let segs = [[B.y0, B.y1]];
    for (const op of openings) {
      if (x + 9 > op.x0 && x < op.x1) {
        segs = segs.flatMap(([a, b]) => {
          const out = [];
          if (op.y0 - 22 > a) out.push([a, op.y0 - 22]);
          if (op.y1 + 10 < b) out.push([op.y1 + 10, b]);
          return out;
        });
      }
    }
    for (const [a, b] of segs) o += rect(x, a, 9, b - a, `fill="${color}"`) + rect(x + 7, a, 2, b - a, `fill="${shade}"`);
  }
  // plates
  o += rect(B.x0, B.y0, B.x1 - B.x0, 9, `fill="${color}"`) + rect(B.x0, B.y1 - 8, B.x1 - B.x0, 8, `fill="${shade}"`);
  for (const op of openings) {
    o += rect(op.x0 - 12, op.y0 - 24, op.x1 - op.x0 + 24, 22, `fill="${color}"`); // header
    o += rect(op.x0 - 12, op.y0 - 6, op.x1 - op.x0 + 24, 3, `fill="${shade}"`);
    if (op.y1 < B.y1 - 20) o += rect(op.x0 - 3, op.y1, op.x1 - op.x0 + 6, 9, `fill="${color}"`); // sill
    o += rect(op.x0 - 12, op.y0 - 2, 12, (op.y1 < B.y1 ? op.y1 : B.y1) - op.y0 + 2, `fill="${color}"`); // jack studs
    o += rect(op.x1, op.y0 - 2, 12, (op.y1 < B.y1 ? op.y1 : B.y1) - op.y0 + 2, `fill="${color}"`);
  }
  return o;
}

function sideStuds(color = '#c4b394', shade = '#a08f71') {
  let o = '';
  for (const s of depthSteps(1.08, 3.6, 12, 1.5)) {
    for (const X of [B.x0, B.x1]) {
      const a = P(X, B.y0, s), b = P(X, B.y1, s);
      const w = 9 * s;
      o += rect(a[0] - (X < VP.x ? w : 0), a[1], w, b[1] - a[1], `fill="${color}"`);
      o += rect(a[0] - (X < VP.x ? w : 0) + (X < VP.x ? w * 0.75 : 0), a[1], w * 0.25, b[1] - a[1], `fill="${shade}"`);
    }
  }
  return o;
}

function joists(color = '#b09f80') {
  let o = '';
  for (const s of depthSteps(1.02, 3.8, 14, 1.4)) {
    const a = P(B.x0, B.y0, s), b = P(B.x1, B.y0, s);
    o += rect(a[0], a[1] - 12 * s, b[0] - a[0], 12 * s, `fill="${color}"`);
    o += rect(a[0], a[1] - 2 * s, b[0] - a[0], 2 * s, `fill="#7b6f5a"`);
  }
  return o;
}

function planks(id, color = '#8c785c', seed = 3) {
  const rnd = rng(seed);
  let o = `<g clip-path="url(#floorclip-${id})" stroke="${color}" stroke-width="1.4">`;
  for (let X = -2200; X < 3800; X += 46) o += line(P(X, B.y1, 1), P(X, B.y1, 4));
  for (let X = -2200; X < 3800; X += 46) {
    let s = 1 + rnd() * 0.4;
    while (s < 4) {
      o += line(P(X, B.y1, s), P(X + 46, B.y1, s), 'stroke-width="1"');
      s += 0.5 + rnd() * 0.9;
    }
  }
  o += `</g>`;
  o += poly(floorQuad(B.x0, B.x1, 1, 4), `fill="url(#floorsheen-${id})"`);
  return o;
}

function floorTiles(id, color, size = 90, depth = [1, 1.14, 1.3, 1.5, 1.74, 2.04, 2.4, 2.86, 3.4, 4]) {
  let o = `<g clip-path="url(#floorclip-${id})" stroke="${color}" stroke-width="1.6">`;
  for (let X = -2400; X < 4000; X += size) o += line(P(X, B.y1, 1), P(X, B.y1, 4));
  for (const s of depth) o += line(P(-3000, B.y1, s), P(4600, B.y1, s));
  return o + `</g>`;
}

function drywallSeams(id) {
  // tape + mud stripes on back and side walls
  let o = `<g fill="#ecebe6">`;
  for (let x = B.x0 + 150; x < B.x1; x += 150) o += rect(x - 7, B.y0, 14, B.y1 - B.y0, 'opacity=".9"');
  o += rect(B.x0, 440, B.x1 - B.x0, 12, 'opacity=".75"');
  for (const s of [1.3, 1.75, 2.4, 3.3]) {
    for (const X of [B.x0, B.x1]) {
      const a = P(X, B.y0, s), b = P(X, B.y1, s);
      o += rect(a[0] - 7 * s, a[1], 14 * s, b[1] - a[1], 'opacity=".85"');
    }
  }
  // screw-spot patches
  const rnd = rng(11);
  for (let i = 0; i < 60; i++) {
    const x = B.x0 + 20 + rnd() * (B.x1 - B.x0 - 40), y = B.y0 + 20 + rnd() * (B.y1 - B.y0 - 40);
    o += `<ellipse cx="${r(x)}" cy="${r(y)}" rx="6" ry="4" opacity=".9"/>`;
  }
  return o + `</g>`;
}

function lightShaft(id, x0, x1, yTop, yBot, reach = 2.6, opacity = 0.6, spread = 0.25) {
  // sunlight coming through a back-wall opening, landing on the floor
  const floorNear = [P(x0 - (x1 - x0) * spread, B.y1, reach), P(x1 + (x1 - x0) * spread, B.y1, reach)];
  const shaft = [[x0, yTop], [x1, yTop], floorNear[1], floorNear[0]];
  const patch = [[x0, B.y1], [x1, B.y1], floorNear[1], floorNear[0]];
  return `<g opacity="${opacity}" style="mix-blend-mode:screen">` +
    poly(shaft, `fill="url(#shaft-${id})" opacity=".55"`) +
    poly(patch, `fill="#fffaf0" opacity=".5" filter="url(#soft-${id})"`) + `</g>`;
}

function finish(id, state) {
  let o = '';
  if (state === 'before') o += `<rect width="${W}" height="${H}" fill="url(#haze-${id})"/>`;
  o += `<rect width="${W}" height="${H}" fill="url(#vig-${id})"/>`;
  o += `<rect width="${W}" height="${H}" filter="url(#grain-${id})"/>`;
  return o;
}

// --------------------------------------------------------------- props
function ladder(x, s, h = 250, color = '#9a9a96') {
  const f = P(x, B.y1, s), t = P(x + 30, B.y1 - h, s);
  const f2 = P(x + 60, B.y1, s + 0.05), f3 = P(x - 6, B.y1, s + 0.08);
  let o = `<g stroke="${color}" stroke-width="${6 * s}" stroke-linecap="square" fill="none">`;
  o += line(f, t) + line(f2, t) + line(f3, [t[0] - 4, t[1]]);
  for (let i = 1; i < 5; i++) {
    const k = i / 5;
    const a = [f[0] + (t[0] - f[0]) * k, f[1] + (t[1] - f[1]) * k];
    const b = [f2[0] + (t[0] - f2[0]) * k, f2[1] + (t[1] - f2[1]) * k];
    o += line(a, b, `stroke-width="${4 * s}"`);
  }
  return o + `</g>` + rect(t[0] - 22 * s, t[1] - 8 * s, 50 * s, 10 * s, `fill="#6f6f6b"`);
}

function sawhorse(x, s, w = 180, color = '#b39f7c') {
  const beam = frontQuad(x, x + w, B.y1 - 70, B.y1 - 60, s);
  let o = poly(beam, `fill="${color}"`);
  for (const lx of [x + 15, x + w - 15]) {
    o += line(P(lx, B.y1 - 62, s), P(lx - 14, B.y1, s + 0.06), `stroke="${color}" stroke-width="${5 * s}"`);
    o += line(P(lx, B.y1 - 62, s), P(lx + 14, B.y1, s - 0.04), `stroke="#8d7c5f" stroke-width="${5 * s}"`);
  }
  return o;
}

function bucket(x, s, color = '#e9e8e3') {
  const top = P(x, B.y1 - 42, s), bot = P(x, B.y1, s);
  const w = 34 * s;
  return `<path d="M${r(top[0] - w / 2)},${top[1]} L${r(top[0] + w / 2)},${top[1]} L${r(bot[0] + w * 0.4)},${bot[1]} L${r(bot[0] - w * 0.4)},${bot[1]} Z" fill="${color}"/>` +
    `<ellipse cx="${top[0]}" cy="${top[1]}" rx="${r(w / 2)}" ry="${r(5 * s)}" fill="#bdbbb5"/>`;
}

function lumberPile(x0, x1, s0, s1, n = 5) {
  let o = '';
  for (let i = 0; i < n; i++) {
    const y1 = B.y1 - i * 9, y0 = y1 - 9;
    o += box(x0 + i * 6, x1 - i * 4, y0, y1, s0 + i * 0.01, s1 - i * 0.02, { front: i % 2 ? '#c9b894' : '#bfae8a', top: '#d6c7a6', side: '#a8977a' });
    const fq = frontQuad(x0 + i * 6, x1 - i * 4, y0, y1, s1 - i * 0.02);
    for (let k = 1; k < 7; k++) {
      const a = fq[0][0] + ((fq[1][0] - fq[0][0]) * k) / 7;
      o += line([a, fq[0][1]], [a, fq[2][1]], 'stroke="#9f8d6d" stroke-width="1.2"');
    }
  }
  return o;
}

function drywallStack(X, s0, s1, lean = 40) {
  // sheets leaning against a side wall
  let o = '';
  for (let i = 0; i < 4; i++) {
    const s = s0 + i * 0.02;
    const d = X < VP.x ? 1 : -1;
    const top0 = P(X + d * (8 + i * 6), B.y1 - 300, s), top1 = P(X + d * (8 + i * 6), B.y1 - 300, s1 + i * 0.02);
    const bot1 = P(X + d * (lean + i * 6), B.y1, s1 + i * 0.02), bot0 = P(X + d * (lean + i * 6), B.y1, s);
    o += poly([top0, top1, bot1, bot0], `fill="${i % 2 ? '#e3e1dc' : '#d8d6d0'}" stroke="#bdbab4" stroke-width="1"`);
  }
  return o;
}

function pendant(X, s, drop, glow, id) {
  const top = P(X, B.y0, s), bot = P(X, drop, s);
  const w = 22 * s, h = 34 * s;
  let o = line(top, bot, `stroke="#111" stroke-width="${1.4 * s}"`);
  if (glow) o += `<ellipse cx="${bot[0]}" cy="${r(bot[1] + h + 30 * s)}" rx="${r(70 * s)}" ry="${r(45 * s)}" fill="url(#glow-${id})" opacity=".7"/>`;
  o += `<path d="M${r(bot[0] - w * 0.35)},${bot[1]} L${r(bot[0] + w * 0.35)},${bot[1]} L${r(bot[0] + w)},${r(bot[1] + h)} L${r(bot[0] - w)},${r(bot[1] + h)} Z" fill="#111"/>`;
  if (glow) o += `<ellipse cx="${bot[0]}" cy="${r(bot[1] + h)}" rx="${r(w)}" ry="${r(3 * s)}" fill="#fff6e0"/>`;
  return o;
}

function plant(x, s, scale = 1) {
  const base = P(x, B.y1, s);
  const k = s * scale;
  let o = `<path d="M${r(base[0] - 20 * k)},${r(base[1] - 46 * k)} h${r(40 * k)} l${r(-5 * k)},${r(46 * k)} h${r(-30 * k)} z" fill="#1c1c1c"/>`;
  const rnd = rng(Math.round(x * s));
  for (let i = 0; i < 9; i++) {
    const a = -Math.PI / 2 + (rnd() - 0.5) * 2.2;
    const len = (60 + rnd() * 70) * k;
    const cx = base[0] + Math.cos(a) * len * 0.55, cy = base[1] - 46 * k + Math.sin(a) * len * 0.55;
    o += `<ellipse cx="${r(cx)}" cy="${r(cy)}" rx="${r(9 * k)}" ry="${r(len * 0.45)}" transform="rotate(${r((a * 180) / Math.PI + 90)} ${r(cx)} ${r(cy)})" fill="${i % 2 ? '#4d544a' : '#5f665a'}"/>`;
  }
  return o;
}

function recessedLights(state, xs = [620, 800, 980], ss = [1.3, 1.9, 2.8]) {
  let o = '';
  for (const s of ss) for (const X of xs) {
    const p = P(X, B.y0, s);
    o += `<ellipse cx="${p[0]}" cy="${p[1]}" rx="${r(11 * s)}" ry="${r(3.2 * s)}" fill="${state === 'after' ? '#fffaf0' : '#3a3834'}"/>`;
  }
  return o;
}

function wires(seed = 5) {
  const rnd = rng(seed);
  let o = '<g fill="none" stroke="#2d2b28" stroke-width="2.2">';
  for (let i = 0; i < 4; i++) {
    const s = 1.3 + rnd() * 1.4;
    const a = P(560 + rnd() * 480, B.y0, s);
    o += `<path d="M${a[0]},${a[1]} q${r(rnd() * 30 - 15)},${r(40 + rnd() * 50)} ${r(rnd() * 20 - 10)},${r(90 + rnd() * 70)}"/>`;
  }
  return o + '</g>';
}

function worklight(x, s) {
  const b = P(x, B.y1, s), t = P(x, B.y1 - 190, s);
  return `<g stroke="#1a1a1a" stroke-width="${3 * s}">` +
    line(t, b) + line(t, P(x - 30, B.y1, s + 0.05)) + line(t, P(x + 30, B.y1, s - 0.03)) + `</g>` +
    rect(t[0] - 26 * s, t[1] - 26 * s, 52 * s, 30 * s, `fill="#1a1a1a"`) +
    rect(t[0] - 22 * s, t[1] - 22 * s, 44 * s, 22 * s, `fill="#fff7e6"`) +
    `<ellipse cx="${t[0]}" cy="${r(t[1] - 10 * s)}" rx="${r(120 * s)}" ry="${r(80 * s)}" fill="url(#glow-x)" opacity=".5"/>`;
}

function debris(x0, x1, s0, s1, seed, colors = ['#6f6c66', '#9c9891', '#b8b4ac', '#57544f']) {
  const rnd = rng(seed);
  let o = '';
  for (let i = 0; i < 26; i++) {
    const s = s0 + rnd() * (s1 - s0);
    const p = P(x0 + rnd() * (x1 - x0), B.y1, s);
    const w = (8 + rnd() * 26) * s, h = (4 + rnd() * 12) * s;
    o += `<path d="M${r(p[0])},${r(p[1])} l${r(w * 0.5)},${r(-h)} l${r(w * 0.5)},${r(h * 0.7)} z" fill="${colors[i % colors.length]}"/>`;
  }
  return o;
}

// ================================================================ SCENES

// ---------------------------------------------------------------- LIVING
function living(id, state) {
  const WIN = { x0: 530, x1: 1070, y0: 280, y1: 660 };
  let o = shell(id, state);
  if (state === 'before') {
    o += `<rect x="${WIN.x0}" y="${WIN.y0}" width="${WIN.x1 - WIN.x0}" height="${WIN.y1 - WIN.y0}" fill="url(#sky-${id})"/>`;
    o += `<path d="M${WIN.x0},590 C640,560 700,575 760,560 S900,540 1000,565 L${WIN.x1},560 V${WIN.y1} H${WIN.x0}Z" fill="#cfccc4"/>`;
    o += backStuds([WIN]);
    o += joists();
    o += sideStuds();
    o += lightShaft(id, WIN.x0, WIN.x1, WIN.y0, WIN.y1, 3.1, 0.85, 0.35);
    o += wires(7);
    o += drywallStack(B.x1, 1.35, 1.9);
    o += lumberPile(520, 820, 1.9, 2.35);
    o += bucket(1010, 2.2);
    o += sawhorse(880, 1.55);
    o += debris(560, 1080, 1.3, 2.8, 21);
  }
  if (state === 'process') {
    o += drywallSeams(id);
    o += recessedLights(state);
    o += poly(floorQuad(B.x0, B.x1, 1, 4), `fill="#cbbfa9"`);
    o += `<g stroke="#b4a78f" stroke-width="2">${[1.5, 2.2, 3.2].map((s) => line(P(-2000, B.y1, s), P(3600, B.y1, s))).join('')}</g>`;
    o += steelWindow(id, WIN, 'process');
    o += lightShaft(id, WIN.x0, WIN.x1, WIN.y0, WIN.y1, 2.8, 0.55, 0.3);
    // rolling scaffold at right
    const sc = (X, Y, s) => P(X, Y, s);
    o += `<g stroke="#5b5b58" stroke-width="5" fill="none">`;
    for (const [X, s] of [[900, 1.5], [1100, 1.5], [900, 1.9], [1100, 1.9]]) o += line(sc(X, B.y1, s), sc(X, 380, s));
    for (const Y of [470, 560]) o += line(sc(900, Y, 1.9), sc(1100, Y, 1.9)) + line(sc(1100, Y, 1.5), sc(1100, Y, 1.9));
    o += line(sc(900, 380, 1.9), sc(1100, 470, 1.9)) + `</g>`;
    o += box(890, 1110, 372, 386, 1.5, 1.92, { front: '#b59f7a', top: '#cab591' });
    o += bucket(620, 2.1);
    o += `<g>${poly(frontQuad(700, 790, B.y1 - 6, B.y1, 2.3), 'fill="#2a2a2a"')}${poly(ceilQuad(700, 790, 2.1, 2.3, B.y1 - 6), 'fill="#9b9994"')}</g>`;
    o += lumberPile(460, 640, 2.4, 2.7, 3);
  }
  if (state === 'after') {
    o += recessedLights(state, [620, 980], [1.5, 2.6]);
    o += planks(id);
    o += steelWindow(id, WIN, 'after');
    o += lightShaft(id, WIN.x0, WIN.x1, WIN.y0, WIN.y1, 2.5, 0.5, 0.3);
    // built-in shelving on the left wall
    o += poly(sideQuad(B.x0, 250, B.y1, 1.06, 1.62), 'fill="#161616"');
    for (const Y of [330, 410, 490, 570]) {
      o += poly([P(B.x0, Y, 1.08), P(B.x0 + 40, Y, 1.08), P(B.x0 + 40, Y, 1.6), P(B.x0, Y, 1.6)], 'fill="#2c2c2c"');
      o += line(P(B.x0 + 40, Y, 1.08), P(B.x0 + 40, Y, 1.6), 'stroke="#3a3a3a" stroke-width="3"');
    }
    const rnd = rng(8);
    for (const Y of [330, 410, 490]) {
      let s = 1.12;
      while (s < 1.52) {
        const w = 0.02 + rnd() * 0.03, h = 30 + rnd() * 30;
        o += poly(sideQuad(B.x0 + 4, Y - h, Y, s, s + w), `fill="${['#d8d3c9', '#8d8579', '#b8ab96', '#e9e5dc', '#595550'][Math.floor(rnd() * 5)]}"`);
        s += w + 0.006 + (rnd() > 0.8 ? 0.06 : 0);
      }
    }
    o += box(B.x0, B.x0 + 40, 570, B.y1, 1.06, 1.62, { front: '#161616', top: '#2a2a2a', side: '#1d1d1d' });
    // art on right wall
    o += poly(sideQuad(B.x1, 330, 520, 1.18, 1.52), 'fill="#141414"');
    o += poly(sideQuad(B.x1, 348, 502, 1.21, 1.49), 'fill="#e9e6de"');
    o += `<g>${poly(sideQuad(B.x1, 395, 480, 1.27, 1.4), 'fill="#2a2a2a"')}${poly(sideQuad(B.x1, 370, 420, 1.36, 1.45), 'fill="#9d958a"')}</g>`;
    // rug
    o += poly(floorQuad(470, 1130, 1.55, 2.6), 'fill="#d3cdc2"');
    o += poly(floorQuad(490, 1110, 1.58, 2.55), 'fill="none" stroke="#bfb8ab" stroke-width="2"');
    // sofa
    o += box(560, 1040, 575, 640, 1.66, 1.74, { front: '#cfc8bb', top: '#ddd7cb' });
    o += box(560, 1040, 630, B.y1, 1.66, 2.0, { front: '#c8c0b2', top: '#dcd5c8' });
    o += box(540, 580, 600, B.y1, 1.66, 2.02, { front: '#bfb7a8', top: '#d6cfc1', side: '#b1a999' });
    o += box(1020, 1060, 600, B.y1, 1.66, 2.02, { front: '#bfb7a8', top: '#d6cfc1', side: '#b1a999' });
    o += box(640, 760, 590, 632, 1.76, 1.82, { front: '#2a2a2a', top: '#3a3a3a' });
    o += box(840, 960, 590, 632, 1.76, 1.82, { front: '#a09382', top: '#b4a795' });
    // coffee table
    o += box(690, 910, 650, 662, 2.12, 2.35, { front: '#111', top: '#1e1e1e' });
    for (const [X, s] of [[700, 2.33], [900, 2.33]]) o += line(P(X, 662, s), P(X, B.y1, s), 'stroke="#111" stroke-width="7"');
    o += box(760, 810, 630, 650, 2.2, 2.26, { front: '#e8e4dc', top: '#f3f0ea' });
    // floor lamp
    const lb = P(1100, B.y1, 1.9), lt = P(1100, 400, 1.9);
    o += line(lb, lt, 'stroke="#111" stroke-width="5"');
    o += `<ellipse cx="${lt[0]}" cy="${r(lt[1] + 90)}" rx="120" ry="70" fill="url(#glow-${id})" opacity=".55"/>`;
    o += `<path d="M${lt[0] - 34},${lt[1]} h68 l14,56 h-96z" fill="#efe9dd"/>`;
    o += `<ellipse cx="${lb[0]}" cy="${lb[1]}" rx="30" ry="6" fill="#111"/>`;
    o += plant(505, 1.3, 1.1);
  }
  o += finish(id, state);
  return o;
}

function steelWindow(id, WIN, state) {
  let o = `<rect x="${WIN.x0}" y="${WIN.y0}" width="${WIN.x1 - WIN.x0}" height="${WIN.y1 - WIN.y0}" fill="url(#sky-${id})"/>`;
  // exterior: soft landscape
  o += `<path d="M${WIN.x0},600 C620,585 700,590 780,575 S930,560 1000,580 L${WIN.x1},575 V${WIN.y1} H${WIN.x0}Z" fill="#d3d0c8"/>`;
  o += `<g fill="#bdb9b1" opacity=".8"><ellipse cx="610" cy="560" rx="60" ry="80"/><ellipse cx="680" cy="575" rx="40" ry="55"/><ellipse cx="990" cy="555" rx="70" ry="95"/></g>`;
  const cols = 4, rows = 3, t = 10;
  o += `<g fill="#101010">`;
  o += rect(WIN.x0 - t, WIN.y0 - t, WIN.x1 - WIN.x0 + 2 * t, t * 1.6);
  o += rect(WIN.x0 - t, WIN.y1 - t * 0.6, WIN.x1 - WIN.x0 + 2 * t, t * 1.6);
  o += rect(WIN.x0 - t, WIN.y0 - t, t * 1.6, WIN.y1 - WIN.y0 + 2 * t);
  o += rect(WIN.x1 - t * 0.6, WIN.y0 - t, t * 1.6, WIN.y1 - WIN.y0 + 2 * t);
  for (let i = 1; i < cols; i++) o += rect(WIN.x0 + ((WIN.x1 - WIN.x0) * i) / cols - t / 2, WIN.y0, t, WIN.y1 - WIN.y0);
  for (let j = 1; j < rows; j++) o += rect(WIN.x0, WIN.y0 + ((WIN.y1 - WIN.y0) * j) / rows - 3, WIN.x1 - WIN.x0, 6);
  o += `</g>`;
  if (state === 'process') {
    // protective film labels
    o += `<g fill="#ffffff" opacity=".85">`;
    for (let i = 0; i < cols; i++) o += rect(WIN.x0 + ((WIN.x1 - WIN.x0) * i) / cols + 18, WIN.y0 + 22, 46, 20);
    o += `</g>`;
  }
  // reflection
  o += `<g opacity=".18" fill="#fff">` +
    poly([[WIN.x0 + 20, WIN.y0], [WIN.x0 + 120, WIN.y0], [WIN.x0 + 40, WIN.y1], [WIN.x0 - 60, WIN.y1]]) +
    poly([[WIN.x0 + 300, WIN.y0], [WIN.x0 + 340, WIN.y0], [WIN.x0 + 260, WIN.y1], [WIN.x0 + 220, WIN.y1]]) + `</g>`;
  return o;
}

// --------------------------------------------------------------- KITCHEN
function kitchen(id, state) {
  const WIN = { x0: 710, x1: 890, y0: 290, y1: 470 };
  let o = shell(id, state);
  if (state === 'before') {
    o += `<rect x="${WIN.x0}" y="${WIN.y0}" width="${WIN.x1 - WIN.x0}" height="${WIN.y1 - WIN.y0}" fill="url(#sky-${id})"/>`;
    o += backStuds([WIN, { x0: 1030, x1: 1120, y0: 300, y1: B.y1 }]);
    o += rect(1030, 300, 90, B.y1 - 300, 'fill="#2b2926" opacity=".85"');
    o += joists();
    o += sideStuds();
    o += lightShaft(id, WIN.x0, WIN.x1, WIN.y0, WIN.y1, 2.8, 0.9, 0.3);
    o += wires(3);
    // electrical boxes on studs
    for (const x of [512, 644, 952, 1084]) o += rect(x - 2, 560, 14, 20, 'fill="#3a4a5c" opacity=".75"');
    // plumbing stub under window
    o += line([780, B.y1], [780, 600], 'stroke="#d9d7d0" stroke-width="10"') + line([820, B.y1], [820, 610], 'stroke="#a8784e" stroke-width="5"');
    // old cabinet boxes pulled from the wall
    o += box(480, 640, 575, B.y1, 1.35, 1.6, { front: '#6d655a', top: '#877e70', side: '#5a5349' });
    o += box(494, 626, 590, 676, 1.35, 1.6, { front: '#403b35' });
    o += lumberPile(820, 1110, 2.0, 2.5);
    o += drywallStack(B.x0, 1.3, 1.9);
    o += worklight(650, 2.3);
    o += bucket(1000, 1.7, '#d7d4cc');
    o += debris(520, 1100, 1.4, 3, 44);
  }
  if (state === 'process') {
    o += drywallSeams(id);
    o += recessedLights(state, [620, 800, 980], [1.4, 2.2]);
    o += windowFrame(id, WIN, 'process');
    o += lightShaft(id, WIN.x0, WIN.x1, WIN.y0, WIN.y1, 2.6, 0.55, 0.3);
    // pencil layout for future uppers
    o += `<g fill="none" stroke="#8f8c86" stroke-width="1.5" stroke-dasharray="8 6">${backRect(470, 262, 680, 420)}${backRect(920, 262, 1130, 420)}</g>`;
    o += `<g font-family="monospace" font-size="12" fill="#77746e"><text x="480" y="282">UPPERS 36"</text><text x="930" y="282">UPPERS 36"</text></g>`;
    o += poly(floorQuad(B.x0, B.x1, 1, 4), `fill="#cbbfa9"`);
    o += `<g stroke="#b4a78f" stroke-width="2">${[1.4, 2, 2.9].map((s) => line(P(-2000, B.y1, s), P(3600, B.y1, s))).join('')}</g>`;
    // base cabinets installed, plywood top
    o += box(450, 1150, 575, B.y1, 1, 1.12, { front: '#232323', top: '#caa979' });
    o += cabinetGaps(450, 1150, 575, B.y1, 1.12, 8);
    // island carcass
    o += box(600, 1000, 590, B.y1, 1.52, 1.86, { front: '#d2bb94', top: '#c2a97f' });
    const f = frontQuad(600, 1000, 590, B.y1, 1.86);
    o += `<g stroke="#a88f68" stroke-width="3">${[0.25, 0.5, 0.75].map((k) => line([f[0][0] + (f[1][0] - f[0][0]) * k, f[0][1]], [f[0][0] + (f[1][0] - f[0][0]) * k, f[2][1]])).join('')}</g>`;
    o += ladder(1030, 1.75, 300);
    o += sawhorse(470, 2.1, 160);
    o += bucket(560, 2.4);
  }
  if (state === 'after') {
    o += planks(id, '#8c785c', 7);
    o += windowFrame(id, WIN, 'after');
    // backsplash
    o += backRect(450, 470, 1150, 560, 'fill="#f1efea"');
    o += `<g stroke="#dcd8d0" stroke-width="1">`;
    for (let x = 450; x <= 1150; x += 22) o += line([x, 470], [x, 560]);
    o += `</g>`;
    // uppers
    o += box(460, 690, 255, 425, 1, 1.08, { front: '#1c1c1c', bottom: '#2c2c2c' });
    o += box(910, 1140, 255, 425, 1, 1.08, { front: '#1c1c1c', bottom: '#2c2c2c' });
    o += cabinetGaps(460, 690, 255, 425, 1.08, 3) + cabinetGaps(910, 1140, 255, 425, 1.08, 3);
    // under-cabinet light
    o += backRect(465, 432, 685, 470, 'fill="#fff6e3" opacity=".35"') + backRect(915, 432, 1135, 470, 'fill="#fff6e3" opacity=".35"');
    o += lightShaft(id, WIN.x0, WIN.x1, WIN.y0, WIN.y1, 2.4, 0.45, 0.3);
    // base run + stone
    o += box(450, 1150, 575, B.y1, 1, 1.12, { front: '#1c1c1c', top: '#e9e7e2' });
    o += cabinetGaps(450, 1150, 575, B.y1, 1.12, 8);
    o += box(446, 1154, 560, 575, 1, 1.135, { front: '#f2f1ed', top: '#fbfaf8' });
    // sink + faucet
    o += poly(ceilQuad(740, 860, 1.02, 1.1, 560), 'fill="#bdbab4"');
    const fb = P(800, 560, 1.03);
    o += `<path d="M${fb[0]},${fb[1]} v-44 q0,-16 16,-16 h14" fill="none" stroke="#111" stroke-width="4"/>`;
    // island
    o += box(600, 1000, 590, B.y1, 1.52, 1.86, { front: '#171717', top: '#242424' });
    const f = frontQuad(600, 1000, 590, B.y1, 1.86);
    o += `<g stroke="#2b2b2b" stroke-width="2">`;
    for (let k = 1; k < 30; k++) { const x = f[0][0] + ((f[1][0] - f[0][0]) * k) / 30; o += line([r(x), f[0][1]], [r(x), f[2][1]]); }
    o += `</g>`;
    o += box(584, 1016, 574, 590, 1.48, 1.9, { front: '#f4f3ef', top: '#fdfcfa' });
    // island styling
    o += box(640, 700, 548, 574, 1.62, 1.68, { front: '#e0dbd1', top: '#ece8e0' });
    o += `<ellipse cx="${P(930, 574, 1.7)[0]}" cy="${P(930, 574, 1.7)[1]}" rx="40" ry="8" fill="#2a2a2a"/>`;
    // pendants
    for (const X of [680, 800, 920]) o += pendant(X, 1.7, 440, true, id);
    // stools
    for (const X of [650, 770, 890]) {
      o += box(X, X + 60, 604, 614, 1.96, 2.06, { front: '#111', top: '#2a2826' });
      for (const [lx, ls] of [[X + 6, 2.05], [X + 54, 2.05]]) o += line(P(lx, 614, ls), P(lx, B.y1, ls), 'stroke="#111" stroke-width="5"');
      o += line(P(X + 6, 660, 2.05), P(X + 54, 660, 2.05), 'stroke="#111" stroke-width="3"');
    }
    o += plant(1100, 1.25, 0.9);
  }
  o += finish(id, state);
  return o;
}

function cabinetGaps(x0, x1, y0, y1, s, n) {
  const f = frontQuad(x0, x1, y0, y1, s);
  let o = `<g stroke="#0a0a0a" stroke-width="2.4">`;
  for (let k = 1; k < n; k++) { const x = f[0][0] + ((f[1][0] - f[0][0]) * k) / n; o += line([r(x), f[0][1]], [r(x), f[2][1]]); }
  if (y1 === B.y1) o += line([f[0][0], r(f[2][1] - 14 * s)], [f[1][0], r(f[2][1] - 14 * s)]);
  return o + `</g>`;
}

function windowFrame(id, WIN, state) {
  let o = `<rect x="${WIN.x0}" y="${WIN.y0}" width="${WIN.x1 - WIN.x0}" height="${WIN.y1 - WIN.y0}" fill="url(#sky-${id})"/>`;
  o += `<g fill="#c9c5bd" opacity=".8"><ellipse cx="${WIN.x0 + 40}" cy="${WIN.y1 - 20}" rx="50" ry="60"/><ellipse cx="${WIN.x1 - 30}" cy="${WIN.y1 - 30}" rx="60" ry="70"/></g>`;
  o += `<g fill="none" stroke="#101010" stroke-width="10">${backRect(WIN.x0, WIN.y0, WIN.x1, WIN.y1)}${line([(WIN.x0 + WIN.x1) / 2, WIN.y0], [(WIN.x0 + WIN.x1) / 2, WIN.y1])}</g>`;
  if (state === 'process') o += rect(WIN.x0 + 16, WIN.y0 + 16, 40, 18, 'fill="#fff" opacity=".9"');
  return o;
}

// -------------------------------------------------------------- BATHROOM
function bath(id, state) {
  const SH = 880; // shower starts here
  let o = shell(id, state, state === 'after' ? { colors: { floor: '#c4bfb6' } } : {});
  if (state === 'before') {
    o += backStuds([{ x0: 560, x1: 700, y0: 300, y1: 440 }]);
    o += `<rect x="560" y="300" width="140" height="140" fill="url(#sky-${id})"/>`;
    o += joists();
    o += sideStuds();
    o += lightShaft(id, 560, 700, 300, 440, 2.3, 0.8, 0.4);
    // plumbing
    o += `<g fill="none" stroke-linecap="round">`;
    o += `<path d="M640,${B.y1} V525 h-10 M664,${B.y1} V525 h10" stroke="#a8784e" stroke-width="6"/>`;
    o += `<path d="M652,${B.y1} V560" stroke="#e4e2dc" stroke-width="16"/>`;
    o += `<path d="M1020,${B.y1} V520 M1020,520 V330 h-24" stroke="#a8784e" stroke-width="6"/>`;
    o += `</g>` + rect(1004, 505, 32, 32, 'fill="#3c3a36"');
    // outline where the old tub was
    o += poly(floorQuad(880, 1160, 1, 1.5), 'fill="#a09d97" opacity=".6"');
    const d = P(1020, B.y1, 1.25);
    o += `<ellipse cx="${d[0]}" cy="${d[1]}" rx="18" ry="6" fill="#2a2926"/>`;
    o += debris(820, 1150, 1.6, 2.8, 71, ['#e5e2da', '#bfbab0', '#8d8a84', '#d2cec6']);
    o += bucket(560, 2.0, '#d4d1c9');
    o += worklight(470, 1.7);
  }
  if (state === 'process') {
    // cement board with screw grid, waterproofing in shower
    o += backRect(B.x0, B.y0, B.x1, B.y1, 'fill="#b3b6b6"');
    o += poly(sideQuad(B.x0, B.y0, B.y1, 1, 4), 'fill="#a7aaaa"');
    o += poly(sideQuad(B.x1, B.y0, B.y1, 1, 4), 'fill="#77807f"');
    o += `<g fill="#8c9091">`;
    for (let x = B.x0 + 20; x < SH; x += 40) for (let y = B.y0 + 20; y < B.y1; y += 50) o += `<circle cx="${x}" cy="${y}" r="1.8"/>`;
    o += `</g>`;
    o += backRect(SH, B.y0, B.x1, B.y1, 'fill="#7c8685"');
    o += `<g stroke="#6d7675" stroke-width="3" opacity=".6">`;
    for (let y = B.y0 + 10; y < B.y1; y += 16) o += line([SH, y], [B.x1, y + 6]);
    o += `</g>`;
    // first rows of tile
    o += `<g>`;
    for (let x = SH; x < B.x1; x += 70) for (let y = 610; y < B.y1; y += 40) o += rect(x + 1, y + 1, 68, 38, 'fill="#343230"');
    o += `</g>`;
    o += poly(floorQuad(SH, B.x1, 1, 1.5), 'fill="#9a9993"');
    o += poly(floorQuad(B.x0, SH, 1, 4), 'fill="#b8b4ab"');
    o += `<rect x="560" y="300" width="140" height="140" fill="url(#sky-${id})"/><rect x="560" y="300" width="140" height="140" fill="none" stroke="#111" stroke-width="8"/>`;
    o += lightShaft(id, 560, 700, 300, 440, 2.2, 0.55, 0.35);
    // wrapped vanity and tile boxes
    o += box(480, 780, 560, B.y1, 1.8, 2.1, { front: '#efeee9', top: '#f7f6f2' });
    const f = frontQuad(480, 780, 560, B.y1, 2.1);
    o += `<g stroke="#b0ad a6" stroke-width="3">${line(f[0], f[2])}${line(f[1], f[3])}</g>`.replace('#b0ad a6', '#b0ada6');
    for (let i = 0; i < 3; i++) o += box(850 + i * 8, 980 - i * 6, B.y1 - 30 - i * 30, B.y1 - i * 30, 2.0, 2.2, { front: '#8f8a80', top: '#a39e93', side: '#7b776e' });
    o += bucket(1060, 2.3);
  }
  if (state === 'after') {
    // large-format stone tile
    o += backRect(B.x0, B.y0, SH, B.y1, 'fill="#dbd7cf"');
    o += `<g stroke="#c9c4ba" stroke-width="1.5">`;
    for (let x = B.x0; x < SH; x += 110) o += line([x, B.y0], [x, B.y1]);
    for (let y = B.y0; y < B.y1; y += 110) o += line([B.x0, y], [SH, y]);
    o += `</g>`;
    o += poly(sideQuad(B.x0, B.y0, B.y1, 1, 4), 'fill="#cfcac1"');
    // shower in charcoal tile
    o += backRect(SH, B.y0, B.x1, B.y1, 'fill="#2f2d2a"');
    o += poly(sideQuad(B.x1, B.y0, B.y1, 1, 4), 'fill="#262422"');
    o += `<g stroke="#3b3935" stroke-width="1.5">`;
    for (let y = B.y0; y < B.y1; y += 46) o += line([SH, y], [B.x1, y]);
    for (let x = SH; x < B.x1; x += 92) o += line([x, B.y0], [x, B.y1]);
    o += `</g>`;
    o += backRect(960, 470, 1080, 540, 'fill="#1f1d1b"') + backRect(960, 532, 1080, 540, 'fill="#3f3c38"');
    o += box(970, 1000, 505, 532, 1, 1.03, { front: '#e7e3da' }) + box(1010, 1030, 495, 532, 1, 1.03, { front: '#8d877c' });
    // rain head
    const rh = P(1020, B.y0, 1.25), rb = P(1020, 290, 1.25);
    o += line(rh, rb, 'stroke="#0f0f0f" stroke-width="4"') + `<ellipse cx="${rb[0]}" cy="${rb[1]}" rx="42" ry="7" fill="#0f0f0f"/>`;
    o += floorTiles(id, '#b3ada3', 110);
    o += poly(floorQuad(SH, B.x1, 1, 1.55), 'fill="#2a2826"');
    const dr = P(1020, B.y1, 1.3);
    o += `<rect x="${dr[0] - 60}" y="${dr[1] - 2}" width="120" height="4" fill="#111"/>`;
    // window
    o += `<rect x="560" y="300" width="140" height="140" fill="url(#sky-${id})"/><rect x="560" y="300" width="140" height="140" fill="none" stroke="#111" stroke-width="8"/>`;
    o += lightShaft(id, 560, 700, 300, 440, 2.1, 0.45, 0.35);
    // mirror + sconces
    o += rect(500, 330, 240, 190, 'fill="#111"') + rect(506, 336, 228, 178, `fill="url(#mirror-${id})"`);
    for (const x of [482, 752]) o += rect(x, 360, 6, 70, 'fill="#111"') + `<ellipse cx="${x + 3}" cy="395" rx="40" ry="60" fill="url(#glow-${id})" opacity=".55"/>` + rect(x + 1, 365, 4, 60, 'fill="#fff7e6"');
    // floating vanity
    o += box(480, 760, 560, 625, 1, 1.16, { front: '#4b3f33', top: '#f3f1ec', bottom: '#2a2520' });
    const vf = frontQuad(480, 760, 560, 625, 1.16);
    o += line([vf[0][0], r((vf[0][1] + vf[2][1]) / 2)], [vf[1][0], r((vf[0][1] + vf[2][1]) / 2)], 'stroke="#2a221b" stroke-width="2"');
    o += poly(ceilQuad(560, 680, 1.03, 1.12, 560), 'fill="#dcd9d3"');
    const fp = P(620, 520, 1.0);
    o += `<path d="M${fp[0]},${fp[1]} h0 v10 h18" fill="none" stroke="#111" stroke-width="4"/>`;
    o += poly(floorQuad(480, 760, 1.02, 1.2), 'fill="#000" opacity=".12" filter="url(#soft-' + id + ')"');
    // glass partition
    o += poly(sideQuad(SH, B.y0 + 20, B.y1, 1, 1.55), 'fill="#fff" opacity=".13"');
    o += line(P(SH, B.y0 + 20, 1), P(SH, B.y0 + 20, 1.55), 'stroke="#0f0f0f" stroke-width="4"');
    o += line(P(SH, B.y0 + 20, 1.55), P(SH, B.y1, 1.55), 'stroke="#0f0f0f" stroke-width="5"');
    o += line(P(SH, 300, 1.08), P(SH, 640, 1.5), 'stroke="#fff" stroke-width="6" opacity=".25"');
    // towel on left wall
    o += line(P(B.x0, 440, 1.25), P(B.x0, 440, 1.5), 'stroke="#111" stroke-width="5"');
    o += poly(sideQuad(B.x0 + 3, 440, 580, 1.28, 1.46), 'fill="#f1eee8"');
    o += plant(560, 1.9, 0.8);
  }
  o += finish(id, state);
  return o;
}

// ------------------------------------------------------------ COMMERCIAL
function commercial(id, state) {
  const colors = {
    before: { ceil: '#3e3c39', floor: '#7f7d78' },
    process: { ceil: '#3a3936', floor: '#9e9c97' },
    after: { ceil: '#1b1b1b', floor: '#a4a29c', back: '#e2dfd8' },
  }[state];
  let o = shell(id, state, { colors });
  if (state === 'before') {
    o += `<g fill="#6c6963" opacity=".6">${backRect(500, 300, 700, 450)}${backRect(900, 380, 1100, 600)}</g>`;
    o += backRect(620, 420, 980, 660, 'fill="#252422"') + rect(640, 440, 320, 200, `fill="url(#sky-${id})" opacity=".9"`);
    o += lightShaft(id, 640, 960, 440, 640, 2.2, 0.8, 0.3);
    o += ducts('#8b8a86', '#6e6d69');
    // hanging remains of ceiling grid
    o += `<g stroke="#c7c5c0" stroke-width="3">`;
    for (const s of [1.4, 1.9, 2.6]) { const a = P(600, B.y0, s), b = P(1000, B.y0, s); o += line(a, [a[0] + 20, a[1] + 60]) + line([a[0] + 20, a[1] + 60], [b[0] - 60, b[1] + 90]); }
    o += `</g>`;
    o += debris(480, 1120, 1.3, 3, 99);
    o += box(900, 1100, 580, B.y1, 1.9, 2.3, { front: '#2c2b29', top: '#3d3c39' });
    o += worklight(560, 2.0);
  }
  if (state === 'process') {
    o += backRect(B.x0, B.y0, B.x1, B.y1, 'fill="#bdbab3"');
    o += backRect(620, 420, 980, 660, 'fill="#252422"') + rect(640, 440, 320, 200, `fill="url(#sky-${id})" opacity=".9"`);
    o += lightShaft(id, 640, 960, 440, 640, 2.2, 0.6, 0.3);
    o += ducts('#d4d2cc', '#b6b3ad');
    // metal-stud partitions
    o += `<g fill="#b6babd">`;
    for (let s = 1.35; s < 2.8; s += 0.11) {
      const a = P(560, B.y0, s), b = P(560, B.y1, s);
      o += rect(a[0] - 3 * s, a[1], 6 * s, b[1] - a[1]);
    }
    o += `</g>`;
    o += poly(sideQuad(560, B.y1 - 6, B.y1, 1.35, 2.8), 'fill="#8f9396"') + poly(sideQuad(560, B.y0, B.y0 + 6, 1.35, 2.8), 'fill="#8f9396"');
    // drywall on part of the partition
    o += poly(sideQuad(560, B.y0, B.y1, 1.35, 1.8), 'fill="#dedcd6" opacity=".95"');
    // scissor lift
    const base = frontQuad(880, 1080, B.y1 - 30, B.y1, 2.0);
    o += box(880, 1080, B.y1 - 30, B.y1, 1.8, 2.0, { front: '#2a2a2a', top: '#3a3a3a', side: '#222' });
    o += `<g stroke="#1e1e1e" stroke-width="7">`;
    const lv = [B.y1 - 30, 560, 450];
    for (let i = 0; i < 2; i++) o += line(P(890, lv[i], 2.0), P(1070, lv[i + 1], 2.0)) + line(P(1070, lv[i], 2.0), P(890, lv[i + 1], 2.0));
    o += `</g>` + box(870, 1090, 430, 450, 1.8, 2.0, { front: '#1e1e1e', top: '#3a3a3a', side: '#262626' });
    o += `<g stroke="#1e1e1e" stroke-width="3" fill="none">${poly(frontQuad(870, 1090, 380, 430, 2.0))}</g>`;
    void base;
    o += drywallStack(B.x0, 1.2, 1.7);
  }
  if (state === 'after') {
    // polished concrete reflections
    o += poly(floorQuad(B.x0, B.x1, 1, 4), `fill="url(#floorsheen-${id})"`);
    o += `<g opacity=".2">${poly(floorQuad(620, 980, 1, 2.4), 'fill="#fff" filter="url(#blur-' + id + ')"')}</g>`;
    // linear lights
    for (const X of [600, 800, 1000]) {
      o += line(P(X, B.y0, 1.02), P(X, B.y0, 3.8), `stroke="#fffaf0" stroke-width="7"`);
      o += `<g opacity=".25">${poly(floorQuad(X - 40, X + 40, 1, 3.5), 'fill="#fff" filter="url(#blur-' + id + ')"')}</g>`;
    }
    // glass partitions on back wall
    o += backRect(B.x0, B.y0, B.x1, B.y1, 'fill="#dcd9d2"');
    o += backRect(470, 270, 1130, B.y1, 'fill="#c9c6bf"');
    o += backRect(470, 270, 1130, B.y1, `fill="url(#glass-${id})" opacity=".55"`);
    o += `<g fill="#0f0f0f">`;
    for (let x = 470; x <= 1130; x += 132) o += rect(x - 4, 270, 8, B.y1 - 270);
    o += rect(466, 266, 668, 10) + rect(466, 470, 668, 5);
    o += `</g>`;
    o += `<g fill="#9c978f" opacity=".6">${backRect(520, 560, 600, B.y1)}${backRect(700, 540, 760, B.y1)}${backRect(1000, 520, 1100, B.y1)}</g>`;
    // oak slat wall
    o += poly(sideQuad(B.x0, B.y0, B.y1, 1, 4), 'fill="#a58c6c"');
    o += `<g stroke="#7f6a50" stroke-width="2" clip-path="url(#leftclip-${id})">`;
    for (let s = 1.02; s < 4; s *= 1.035) o += line(P(B.x0, B.y0, s), P(B.x0, B.y1, s));
    o += `</g>`;
    // table
    o += box(600, 1000, 600, 612, 1.7, 2.4, { front: '#e9e6df', top: '#f4f2ed' });
    for (const [X, s] of [[620, 1.75], [980, 1.75], [620, 2.35], [980, 2.35]]) o += line(P(X, 612, s), P(X, B.y1, s), 'stroke="#111" stroke-width="6"');
    for (const s of [1.85, 2.05, 2.25]) {
      for (const X of [560, 1000]) {
        o += box(X, X + 40, 620, 630, s - 0.05, s + 0.05, { front: '#111', top: '#2a2a2a', side: '#1a1a1a' });
        o += line(P(X + 20, 630, s), P(X + 20, B.y1, s), 'stroke="#111" stroke-width="4"');
        o += box(X + (X < 800 ? 0 : 34), X + (X < 800 ? 6 : 40), 560, 620, s - 0.05, s + 0.05, { front: '#111', side: '#111' });
      }
    }
    for (const X of [520, 1100]) o += plant(X, 1.35, 1.2);
  }
  o += finish(id, state);
  return o;
}

function ducts(c1, c2) {
  let o = '';
  const X0 = 620, X1 = 700, Y0 = B.y0 + 10, Y1 = B.y0 + 60;
  o += poly([P(X0, Y1, 1), P(X1, Y1, 1), P(X1, Y1, 4), P(X0, Y1, 4)], `fill="${c2}"`);
  o += poly([P(X1, Y0, 1), P(X1, Y1, 1), P(X1, Y1, 4), P(X1, Y0, 4)], `fill="${c1}"`);
  o += `<g stroke="${c2}" stroke-width="2">`;
  for (let s = 1.1; s < 4; s *= 1.18) o += line(P(X0, Y1, s), P(X1, Y1, s));
  o += `</g>`;
  const X2 = 940, X3 = 980;
  o += poly([P(X2, Y0, 1), P(X3, Y0, 1), P(X3, Y1 - 10, 4), P(X2, Y1 - 10, 4)], `fill="${c1}" opacity=".85"`);
  return o;
}

// --------------------------------------------------------------- EXTERIOR
function exterior(id, state) {
  let o = `<rect width="${W}" height="${H}" fill="url(#sky-${id})"/>`;
  // distant trees
  o += `<g fill="${state === 'after' ? '#c6c3bc' : '#c1bdb5'}">`;
  const rnd = rng(12);
  for (let x = -40; x < W + 60; x += 70) o += `<ellipse cx="${x}" cy="${r(700 - rnd() * 60)}" rx="${r(60 + rnd() * 40)}" ry="${r(120 + rnd() * 60)}"/>`;
  o += `</g>`;
  // ground
  o += rect(0, 815, W, H - 815, `fill="${state === 'after' ? '#8b8f86' : '#9a9a8e'}"`);
  o += `<path d="M700,815 L900,815 L1010,${H} L590,${H}Z" fill="${state === 'after' ? '#cfccc5' : '#b9b5ac'}"/>`;
  const gable = 'M360,440 L640,230 L920,440 Z';
  const body = { x0: 390, x1: 890, y0: 430, y1: 815 };
  const side = { x0: 890, x1: 1260, y0: 520, y1: 815 };
  if (state === 'before') {
    o += `<path d="M370,440 L640,250 L910,440 Z" fill="#6f6b66"/>`;
    o += `<g stroke="#5f5b56" stroke-width="2">`;
    for (let y = 270; y < 440; y += 14) { const t = (y - 250) / 190; o += line([640 - 270 * t, y], [640 + 270 * t, y]); }
    o += `</g>`;
    o += rect(body.x0, body.y0, body.x1 - body.x0, body.y1 - body.y0, 'fill="#cdc7ba"');
    o += rect(side.x0, side.y0, side.x1 - side.x0, side.y1 - side.y0, 'fill="#c4bdae"');
    o += rect(side.x0 - 10, side.y0 - 16, side.x1 - side.x0 + 30, 18, 'fill="#6f6b66"');
    o += `<g stroke="#b2ab9c" stroke-width="2">`;
    for (let y = body.y0 + 16; y < body.y1; y += 16) o += line([body.x0, y], [body.x1, y]);
    for (let y = side.y0 + 16; y < side.y1; y += 16) o += line([side.x0, y], [side.x1, y]);
    o += `</g>`;
    // peeling paint patches
    o += `<g fill="#b9b1a1">${rect(430, 700, 60, 30)}${rect(820, 520, 40, 22)}${rect(1180, 620, 50, 30)}</g>`;
    // small windows w/ shutters
    for (const [x, y] of [[470, 520], [720, 520], [470, 660]]) {
      o += rect(x - 26, y, 22, 110, 'fill="#5d5f5b"') + rect(x + 104, y, 22, 110, 'fill="#5d5f5b"');
      o += rect(x, y, 100, 110, 'fill="#f3f1ec"') + rect(x + 8, y + 8, 84, 94, 'fill="#76766f"') + line([x + 50, y + 8], [x + 50, y + 102], 'stroke="#f3f1ec" stroke-width="5"') + line([x + 8, y + 55], [x + 92, y + 55], 'stroke="#f3f1ec" stroke-width="5"');
    }
    o += rect(690, 660, 90, 155, 'fill="#8b8373"') + rect(700, 672, 70, 60, 'fill="#9c9483"');
    // garage door
    o += rect(950, 610, 250, 205, 'fill="#e6e2d9"');
    o += `<g stroke="#c9c4b9" stroke-width="3">${[650, 690, 730, 770].map((y) => line([950, y], [1200, y])).join('')}</g>`;
    // sagging gutter
    o += `<path d="M380,442 Q640,462 900,440" fill="none" stroke="#9a968f" stroke-width="7"/>`;
    // overgrown shrubs
    o += `<g fill="#6d7166">`;
    for (const [x, rx] of [[420, 70], [540, 60], [860, 80], [1240, 70], [330, 50]]) o += `<ellipse cx="${x}" cy="810" rx="${rx}" ry="${rx * 0.8}"/>`;
    o += `</g>`;
  }
  if (state === 'process') {
    o += `<path d="${gable}" fill="#1a1a1a"/>`;
    o += rect(body.x0, body.y0, body.x1 - body.x0, body.y1 - body.y0, 'fill="#efefeb"');
    o += rect(side.x0, side.y0, side.x1 - side.x0, side.y1 - side.y0, 'fill="#e9e9e4"');
    o += rect(side.x0 - 10, side.y0 - 16, side.x1 - side.x0 + 30, 18, 'fill="#1a1a1a"');
    // house-wrap print
    o += `<g fill="#b9b9b3">`;
    for (let y = body.y0 + 30; y < body.y1; y += 60) for (let x = body.x0 + 20; x < side.x1 - 60; x += 150) if (!(x > body.x1 - 40 && y < side.y0)) o += rect(x, y, 80, 6);
    o += `</g>`;
    // new siding on lower left
    o += rect(body.x0, 640, 280, body.y1 - 640, 'fill="#1b1b1b"');
    o += `<g stroke="#2b2b2b" stroke-width="3">`;
    for (let x = body.x0 + 26; x < body.x0 + 280; x += 26) o += line([x, 640], [x, body.y1]);
    o += `</g>`;
    // new big windows installed
    o += rect(450, 480, 170, 150, 'fill="#101010"') + rect(460, 490, 150, 130, `fill="url(#glass-${id})"`) + rect(470, 500, 50, 20, 'fill="#fff"');
    o += rect(690, 480, 150, 335, 'fill="#101010"') + rect(700, 490, 130, 325, `fill="url(#glass-${id})"`);
    o += rect(950, 580, 260, 170, 'fill="#101010"') + rect(960, 590, 240, 150, `fill="url(#glass-${id})"`) + rect(975, 600, 50, 20, 'fill="#fff"');
    // scaffolding
    o += `<g stroke="#4e4e4b" stroke-width="6">`;
    for (const x of [360, 560, 760, 960, 1160]) o += line([x, 380], [x, 818]);
    for (const y of [520, 660]) o += line([340, y], [1180, y]);
    for (const x of [360, 760]) o += line([x, 520], [x + 200, 660]);
    o += `</g>`;
    o += `<g fill="#b59f7a">${rect(340, 512, 840, 10)}${rect(340, 652, 840, 10)}</g>`;
    // dumpster
    o += `<path d="M1260,720 L1560,720 L1540,830 L1280,830Z" fill="#3a3a38"/>` + rect(1250, 712, 320, 14, 'fill="#2a2a28"');
    o += debris(0, 0, 1, 1, 1).replace(/.*/, '');
  }
  if (state === 'after') {
    // soft ground shadow
    o += `<ellipse cx="820" cy="818" rx="560" ry="18" fill="#000" opacity=".18" filter="url(#soft-${id})"/>`;
    o += `<path d="M340,445 L640,220 L940,445 L924,445 L640,238 L356,445Z" fill="#0c0c0c"/>`;
    o += `<path d="${gable}" fill="#1a1a1a"/>`;
    o += `<g stroke="#262626" stroke-width="3">`;
    for (let x = 400; x < 900; x += 22) { const yTop = x < 640 ? 440 - ((x - 360) / 280) * 210 : 230 + ((x - 640) / 280) * 210; o += line([x, r(yTop + 6)], [x, 440]); }
    o += `</g>`;
    o += rect(body.x0, body.y0, body.x1 - body.x0, body.y1 - body.y0, 'fill="#161616"');
    o += `<g stroke="#232323" stroke-width="4">`;
    for (let x = body.x0 + 26; x < body.x1; x += 26) o += line([x, body.y0], [x, body.y1]);
    o += `</g>`;
    // warm wood volume
    o += rect(side.x0, side.y0, side.x1 - side.x0, side.y1 - side.y0, 'fill="#9a8064"');
    o += `<g stroke="#826a51" stroke-width="2">`;
    for (let y = side.y0 + 12; y < side.y1; y += 12) o += line([side.x0, y], [side.x1, y]);
    o += `</g>`;
    o += rect(side.x0 - 10, side.y0 - 20, side.x1 - side.x0 + 30, 22, 'fill="#0c0c0c"');
    // big glazing with interior glow
    const win = (x, y, w, h, mull = []) => {
      let s = rect(x - 8, y - 8, w + 16, h + 16, 'fill="#0a0a0a"');
      s += rect(x, y, w, h, 'fill="#e8dcc4"');
      s += `<ellipse cx="${x + w / 2}" cy="${y + h * 0.35}" rx="${w * 0.6}" ry="${h * 0.5}" fill="url(#glow-${id})"/>`;
      s += rect(x, y + h * 0.72, w, h * 0.28, 'fill="#c6b99f" opacity=".6"');
      for (const m of mull) s += rect(x + m * w - 3, y, 6, h, 'fill="#0a0a0a"');
      s += `<g opacity=".22" fill="#fff">${poly([[x + w * 0.1, y], [x + w * 0.3, y], [x + w * 0.1, y + h], [x - w * 0.1, y + h]])}</g>`;
      return s;
    };
    o += win(450, 480, 170, 150, [0.5]);
    o += win(690, 480, 150, 335, []);
    o += win(950, 580, 260, 170, [0.33, 0.66]);
    o += rect(700, 480, 14, 335, 'fill="#0a0a0a" opacity=".001"');
    // door (wood) in the glazing bay
    o += rect(720, 560, 90, 255, 'fill="#6f5a45"') + rect(795, 680, 5, 50, 'fill="#e6d7bb"');
    // soffit light
    for (const x of [470, 600, 1000, 1150]) o += `<ellipse cx="${x}" cy="${x > 900 ? 510 : 450}" rx="60" ry="40" fill="url(#glow-${id})" opacity=".5"/>`;
    // steps + landscape
    o += rect(690, 815, 150, 12, 'fill="#dedbd4"') + rect(670, 827, 190, 12, 'fill="#e6e3dc"');
    o += `<g fill="#3c4039">`;
    const g = rng(33);
    for (let x = 380; x < 1290; x += 18) if (x < 660 || x > 880) o += `<ellipse cx="${x}" cy="${r(812 - g() * 6)}" rx="${r(14 + g() * 10)}" ry="${r(20 + g() * 16)}"/>`;
    o += `</g>`;
    o += `<g fill="#2e322c"><ellipse cx="300" cy="640" rx="110" ry="190"/><rect x="296" y="700" width="8" height="120"/></g>`;
    o += `<g fill="#1d1d1d">${rect(1330, 760, 4, 60)}${rect(1310, 756, 44, 6)}</g>`;
  }
  o += `<rect width="${W}" height="${H}" fill="url(#vig-${id})" opacity=".7"/>`;
  o += `<rect width="${W}" height="${H}" filter="url(#grain-${id})"/>`;
  return o;
}

// ------------------------------------------------------------------ API
const SCENES = { living, kitchen, bath, commercial, exterior };

/** Crops of finished scenes used for service cards */
const CROPS = {
  'living-detail': { scene: 'living', state: 'after', viewBox: '400 220 880 550' },
  'floor-detail': { scene: 'kitchen', state: 'after', viewBox: '240 520 1120 480' },
  'carpentry-detail': { scene: 'kitchen', state: 'after', viewBox: '380 220 840 525' },
  'bath-detail': { scene: 'bath', state: 'after', viewBox: '420 260 720 450' },
};

function render(scene, state, viewBox = `0 0 ${W} ${H}`, label = '') {
  const id = `${scene[0]}${state[0]}`;
  const body = SCENES[scene](id, state);
  const [, , vw, vh] = viewBox.split(' ').map(Number);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${vw}" height="${vh}" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${label}">` +
    `<radialGradient id="glow-x" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#fff4dc" stop-opacity=".9"/><stop offset="1" stop-color="#fff4dc" stop-opacity="0"/></radialGradient>` +
    defs(id) + body + `</svg>`;
}

function all() {
  const out = {};
  for (const scene of Object.keys(SCENES)) for (const state of ['before', 'process', 'after']) out[`${scene}-${state}`] = render(scene, state);
  for (const [name, c] of Object.entries(CROPS)) out[name] = render(c.scene, c.state, c.viewBox);
  return out;
}

module.exports = { all, render, W, H };
