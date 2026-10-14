'use strict';
const $ = id => document.getElementById(id);
const cv = $('canvas'), ctx = cv.getContext('2d');
const lerp = (a, b, k) => a + (b - a) * k, rnd = (a, b) => a + Math.random() * (b - a);
const mix = (c1, c2, k) => c1.map((v, i) => Math.round(lerp(v, c2[i], k)));
const RED = [176, 78, 46], GREEN = [26, 160, 98], DR = [90, 32, 22], DG = [6, 70, 46];
const TAU = Math.PI * 2;

/* ---------- состояние ---------- */
const P = { atmo: 20, energy: 30, water: 10, temp: 25, bio: 5, speed: 40 };
const T = { nano: false, magnet: false, rain: false, auto: true };
const S = { green: 0, t: 0, rot: 0, storm: 0, flash: 0, sol: 1, shown: {} };
let shoot = [], sparks = [], waves = [], sand = [], W = 0, H = 0, stars = [], bots = [], meteors = [], craters = [], clouds = [], drops = [], dust = [], blobs = [], domes = [];

const SLIDERS = [
  ['atmo', 'Генератор атмосферы', 'Кислород / CO₂', '%'],
  ['energy', 'Энерго-сеть', 'Солнце / Корневая система', '%'],
  ['water', 'Водный цикл', 'Подлёдные резервуары', '%'],
  ['temp', 'Термостат', 'Тепловой щит купола', '%'],
  ['bio', 'Биоразнообразие', 'Хвойные · мхи · цветы', '%'],
  ['speed', 'Скорость времени', 'День / ночь', '%']
];
const TOGGLES = [['nano', '🤖 Нано-боты'], ['magnet', '🧲 Магнитное поле'], ['rain', '🌧 Дождевание'], ['auto', '🌗 Смена дня']];

/* ---------- лог / тост ---------- */
const logEl = $('log');
function log(msg, type = 'info') {
  const p = document.createElement('p');
  p.className = type;
  p.textContent = `[${new Date().toLocaleTimeString('ru-RU')}] ${msg}`;
  logEl.appendChild(p);
  while (logEl.children.length > 60) logEl.firstChild.remove();
  logEl.scrollTop = logEl.scrollHeight;
}
let toastTm;
function toast(msg) {
  const el = $('toast'); el.textContent = '🏆 ' + msg; el.classList.add('show');
  clearTimeout(toastTm); toastTm = setTimeout(() => el.classList.remove('show'), 3200);
}
function ach(key, msg) { if (!S.shown[key]) { S.shown[key] = 1; toast(msg); log('[OK] Достижение: ' + msg, 'ok'); } }

/* ---------- UI ---------- */
const outs = {}, ranges = {}, tbtn = {};
SLIDERS.forEach(([k, name, sub]) => {
  const l = document.createElement('label'); l.className = 'ctrl';
  l.innerHTML = `<div class="row"><span>${name}</span><output>${P[k]}%</output></div><em>${sub}</em><input type="range" min="0" max="100" value="${P[k]}">`;
  $('sliders').appendChild(l);
  outs[k] = l.querySelector('output'); ranges[k] = l.querySelector('input');
  ranges[k].addEventListener('input', () => { P[k] = +ranges[k].value; outs[k].textContent = P[k] + '%'; });
  ranges[k].addEventListener('change', () => onParam(k));
});
TOGGLES.forEach(([k, name]) => {
  const b = document.createElement('button'); b.className = 'toggle';
  b.innerHTML = `<span class="dot"></span>${name} <b></b>`;
  $('toggles').appendChild(b); tbtn[k] = b;
  b.addEventListener('click', () => { T[k] = !T[k]; syncToggles(); onToggle(k); });
});
function syncToggles() {
  for (const k in T) { tbtn[k].setAttribute('aria-pressed', T[k]); tbtn[k].querySelector('b').textContent = T[k] ? 'ВКЛ' : 'ВЫКЛ'; }
  const n = T.nano ? 44 : 0;
  while (bots.length < n) bots.push({ a: rnd(0, TAU), d: rnd(1.04, 1.38), s: rnd(.002, .009) * (Math.random() < .5 ? -1 : 1), z: rnd(1, 2.5) });
  bots.length = Math.min(bots.length, n);
}
function setP(o) { Object.assign(P, o); SLIDERS.forEach(([k]) => { ranges[k].value = P[k]; outs[k].textContent = P[k] + '%'; }); }
function onParam(k) {
  const m = {
    atmo: P.atmo > 60 ? ['ok', 'Баланс атмосферы смещён в сторону кислорода'] : P.atmo < 25 ? ['warn', 'Высокий уровень CO₂ под куполом'] : ['info', 'Состав атмосферы скорректирован'],
    energy: P.energy > 60 ? ['ok', 'Корневая система получает энергию от солнечных батарей'] : ['info', 'Энергопоток перераспределён'],
    water: P.water > 60 ? ['ok', 'Подлёдные резервуары вскрыты — появляются озёра'] : ['info', 'Расход воды изменён'],
    temp: P.temp > 85 ? ['warn', 'Перегрев теплового щита'] : P.temp < 30 ? ['warn', 'Купол промерзает'] : ['ok', 'Температура в комфортном диапазоне'],
    bio: P.bio > 60 ? ['ok', 'Новые виды хвойных и цветов прижились'] : ['info', 'Банк семян обновлён'],
    speed: ['info', 'Темп времени изменён']
  }[k];
  log(`[${m[0].toUpperCase()}] ${m[1]}`, m[0]);
}
function onToggle(k) {
  const msg = {
    nano: T.nano ? ['ok', 'Нано-боты запущены: очистка грунта от перхлоратов'] : ['warn', 'Нано-боты остановлены'],
    magnet: T.magnet ? ['ok', 'Магнитосфера активна — над полюсом сияет аврора'] : ['warn', 'Магнитное поле отключено'],
    rain: T.rain ? ['ok', 'Дождевание запущено'] : ['info', 'Дождевание остановлено'],
    auto: T.auto ? ['info', 'Автоматическая смена дня и ночи'] : ['info', 'Время зафиксировано']
  }[k];
  log(`[${msg[0].toUpperCase()}] ${msg[1]}`, msg[0]);
}
const PRESETS = {
  mars: { atmo: 5, energy: 15, water: 5, temp: 20, bio: 0 },
  terra: { atmo: 50, energy: 55, water: 45, temp: 55, bio: 35 },
  eden: { atmo: 90, energy: 85, water: 80, temp: 65, bio: 90 }
};
document.querySelectorAll('.pre').forEach(b => b.addEventListener('click', () => { setP(PRESETS[b.dataset.p]); log(`[INFO] Загружен сценарий «${b.textContent}»`); }));
$('bRand').addEventListener('click', () => { setP({ atmo: rnd(0, 100) | 0, energy: rnd(0, 100) | 0, water: rnd(0, 100) | 0, temp: rnd(20, 80) | 0, bio: rnd(0, 100) | 0 }); log('[INFO] Параметры сгенерированы случайно'); });
$('bMeteor').addEventListener('click', () => spawnMeteor());
$('bStorm').addEventListener('click', () => { S.storm = 1; log('[WARN] Приближается пылевая буря!', 'warn'); ach('storm', 'Пережил бурю'); });

/* ---------- геометрия ---------- */
const geom = () => { const R = Math.min(W, H) * .4; return { cx: W / 2, cy: H * .58, R }; };
function resize() {
  const r = cv.getBoundingClientRect(), d = window.devicePixelRatio || 1;
  W = r.width; H = r.height; cv.width = W * d; cv.height = H * d; ctx.setTransform(d, 0, 0, d, 0, 0);
  stars = Array.from({ length: 200 }, () => ({ x: Math.random() * W, y: Math.random() * H, r: rnd(.3, 1.6), p: rnd(0, 6), z: rnd(.2, 1), c: ['#fff', '#cfe3ff', '#ffe2c4', '#ffd0d0'][Math.random() * 4 | 0] }));
}
window.addEventListener('resize', resize);
blobs = Array.from({ length: 90 }, (_, i) => ({ lon: rnd(0, TAU), lat: rnd(-1.3, 1.3), r: rnd(.05, .17), lake: i % 4 === 0 }));
clouds = Array.from({ length: 9 }, () => ({ lon: rnd(0, TAU), lat: rnd(-1, 1), w: rnd(.18, .4) }));
const SEEDS = [-.5, .22, -.12, .62, -.82, .9, .4, -.32].map((a, i) => ({ a, g: 0, auto: true, i }));
domes = SEEDS.slice();

/* ---------- события ---------- */
function spawnMeteor() {
  const g = geom(); const a = rnd(-2.6, -.5);
  const sx = rnd(W * .1, W * .9), tx = g.cx + rnd(-g.R * .7, g.R * .7), ty = g.cy + rnd(-g.R * .3, g.R * .5), d = Math.hypot(tx - sx, ty + 20); meteors.push({ x: sx, y: -20, vx: (tx - sx) / d * 10, vy: (ty + 20) / d * 10, life: 0, tr: [] });
  log('[WARN] Обнаружен метеорит! Щиты на максимум', 'warn');
}
cv.addEventListener('click', e => {
  const r = cv.getBoundingClientRect(), g = geom(), dx = e.clientX - r.left - g.cx, dy = e.clientY - r.top - g.cy;
  if (Math.hypot(dx, dy) > g.R * 1.25) return;
  const a = Math.atan2(dy, dx);
  const rel = a + Math.PI / 2;
  if (domes.length < 14) { domes.push({ a: Math.max(-1.45, Math.min(1.45, rel)), g: 0, auto: false }); log('[OK] Построен новый биокупол вручную', 'ok'); ach('build', 'Первый строитель'); }
  else log('[WARN] Достигнут лимит куполов', 'warn');
});

/* ---------- метрики ---------- */
function targetGreen() {
  const tSuit = 1 - Math.abs(P.temp - 62) / 62;
  let k = .3 * P.atmo + .2 * P.energy + .2 * P.water + .15 * tSuit * 100 + .15 * P.bio;
  k = k / 100 + (T.nano ? .06 : 0) + (T.magnet ? .05 : 0) - S.storm * .12;
  return Math.max(0, Math.min(1, k));
}
const RANKS = [[0, 'Мёртвая пустошь'], [15, 'Реголит и надежды'], [30, 'Первые ростки'], [50, 'Дыхание Марса'], [70, 'Зелёный оазис'], [85, 'Новая Земля'], [97, 'Эдем']];

/* ---------- отрисовка ---------- */
function lightDir(a) { const L = [Math.cos(a) * .85, -.38, .5 + .25 * Math.sin(a * .7)], n = Math.hypot(...L); return L.map(v => v / n); }
let nebula = null;
function makeNebula() {
  const w = 220, h = 130, c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d'), im = x.createImageData(w, h);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const m = ((j / h * MH) | 0) * MW + ((i / w * MW) | 0), a = CM[m], b = VM[m], o = (j * w + i) * 4;
    const pu = sm(.45, .85, a), te = sm(.5, .9, b);
    im.data[o] = 150 * pu + 20 * te; im.data[o + 1] = 40 * pu + 140 * te; im.data[o + 2] = 170 * pu + 120 * te;
    im.data[o + 3] = Math.max(pu * .5, te * .38) * 255;
  }
  x.putImageData(im, 0, 0); nebula = c;
}
function bg(amb) {
  if (!nebula) makeNebula();
  ctx.imageSmoothingEnabled = true; ctx.globalAlpha = .5 * amb + .2; ctx.drawImage(nebula, 0, 0, W, H); ctx.globalAlpha = 1;
  stars.forEach(s => {
    const tw = .45 + .55 * Math.abs(Math.sin(S.t * .02 * s.z + s.p)), x = (s.x + S.t * .04 * s.z) % W;
    ctx.globalAlpha = tw * (1 - .5 * S.green * amb); ctx.fillStyle = s.c;
    ctx.beginPath(); ctx.arc(x, s.y, s.r, 0, TAU); ctx.fill();
    if (s.r > 1.45) { ctx.globalAlpha *= .5; ctx.fillRect(x - s.r * 4, s.y - .4, s.r * 8, .8); ctx.fillRect(x - .4, s.y - s.r * 4, .8, s.r * 8); }
  });
  ctx.globalAlpha = 1;
  if (Math.random() < .004) shoot.push({ x: rnd(0, W), y: rnd(0, H * .4), l: 0 });
  ctx.lineWidth = 1.5;
  shoot = shoot.filter(s => { s.l++; s.x += 14; s.y += 6; const g = ctx.createLinearGradient(s.x, s.y, s.x - 70, s.y - 30); g.addColorStop(0, 'rgba(255,255,255,.9)'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.strokeStyle = g; ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x - 70, s.y - 30); ctx.stroke(); return s.l < 30; });
}
/* ---------- процедурная планета (карты шума + пиксельный рендер сферы) ---------- */
const MW = 1024, MH = 512;
function fbm(seed, oct) {
  let s = seed; const rn = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const out = new Float32Array(MW * MH); let amp = 1, tot = 0;
  for (let o = 0; o < oct; o++) {
    const gx = 4 << o, gy = 2 << o, lat = Array.from({ length: gx * (gy + 1) }, rn);
    for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
      const fx = x / MW * gx, fy = y / MH * gy, x0 = fx | 0, y0 = fy | 0, tx = fx - x0, ty = fy - y0;
      const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty), x1 = (x0 + 1) % gx;
      const a = lat[y0 * gx + x0], b = lat[y0 * gx + x1], c = lat[(y0 + 1) * gx + x0], d = lat[(y0 + 1) * gx + x1];
      out[y * MW + x] += amp * lerp(lerp(a, b, sx), lerp(c, d, sx), sy);
    }
    tot += amp; amp *= .52;
  }
  let mn = 9, mx = -9; for (let i = 0; i < out.length; i++) { out[i] /= tot; mn = Math.min(mn, out[i]); mx = Math.max(mx, out[i]); }
  for (let i = 0; i < out.length; i++) out[i] = (out[i] - mn) / (mx - mn);
  return out;
}
const HM = fbm(7, 6), VM = fbm(31, 5), CM = fbm(99, 5);
const NN = 320, pc = document.createElement('canvas'); pc.width = pc.height = NN;
const pctx = pc.getContext('2d'), img = pctx.createImageData(NN, NN), D = img.data;
const cl = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v;
const sm = (a, b, v) => { const t = cl((v - a) / (b - a)); return t * t * (3 - 2 * t); };
function crater(lon, lat, r) {
  const cx = ((lon / TAU % 1 + 1) % 1) * MW, cy = (lat / Math.PI + .5) * MH;
  for (let dy = -r; dy <= r; dy++) for (let dx = -r * 2; dx <= r * 2; dx++) {
    const d = Math.hypot(dx / 2, dy) / r; if (d > 1.25) continue;
    const x = ((cx + dx) % MW + MW) % MW | 0, y = cl(cy + dy | 0, 0, MH - 1), i = y * MW + x;
    HM[i] = cl(HM[i] - (d < 1 ? .22 * (1 - d * d) : 0) + (d > .85 && d < 1.2 ? .06 : 0));
  }
}
const NP = NN * NN, tNX = new Float32Array(NP), tNY = new Float32Array(NP), tNZ = new Float32Array(NP), tLON = new Float32Array(NP), tV = new Int16Array(NP), tA = new Float32Array(NP), tLAT = new Float32Array(NP);
(() => { const h = NN / 2; for (let py = 0; py < NN; py++) for (let px = 0; px < NN; px++) { const i = py * NN + px, nx = (px - h) / h, ny = (py - h) / h, r2 = nx * nx + ny * ny; if (r2 >= 1) { tA[i] = -1; continue; } const nz = Math.sqrt(1 - r2), lat = Math.asin(ny); tNX[i] = nx; tNY[i] = ny; tNZ[i] = nz; tLAT[i] = lat; tLON[i] = Math.atan2(nx, nz); tV[i] = Math.min(MH - 2, (lat / Math.PI + .5) * MH | 0); tA[i] = cl((1 - Math.sqrt(r2)) * NN * .45, 0, 1); } })();
function renderPlanet(k, sunA) {
  const sl = P.water / 100 * .66, capLat = 1.45 - P.temp / 100 * .75;
  const L = lightDir(sunA);
  const hv = [L[0], L[1], L[2] + 1], hn = Math.hypot(...hv); hv.forEach((v, i) => hv[i] = v / hn);
  const ac = mix([255, 140, 80], [110, 190, 255], Math.max(P.atmo / 100, k)), N2 = NN / 2;
  const rotU = S.rot / TAU * MW, drift = S.t * .16 | 0;
  for (let p = 0; p < NP; p++) {
    const o = p * 4;
    if (tA[p] < 0) { D[o + 3] = 0; continue; }
    const nx = tNX[p], ny = tNY[p], nz = tNZ[p], lat = tLAT[p], v = tV[p];
    const u = ((((tLON[p] / TAU) * MW + rotU) % MW) + MW) % MW | 0, i = v * MW + u, i2 = v * MW + (u + 1) % MW;
    const h = HM[i], vg = VM[i];
    const dot = nx * L[0] + ny * L[1] + nz * L[2];
    let lit = sm(-.12, .35, dot), col, spec = 0, em = 0;
    if (h < sl) {
      const dp = cl((sl - h) / Math.max(sl, .01)); col = mix([70, 190, 215], [8, 38, 105], Math.pow(dp, .6));
      spec = Math.pow(cl(nx * hv[0] + ny * hv[1] + nz * hv[2]), 60) * .9 * lit;
    } else {
      const hh = (h - sl) / (1 - sl);
      col = mix(mix([84, 34, 24], [196, 108, 62], hh), [226, 168, 112], sm(.7, 1, hh) * (1 - k * .6));
      const veg = cl((k * 1.35 - vg * .75 - hh * .45) * 3.2);
      if (veg > 0) { col = mix(col, mix([8, 62, 40], [96, 190, 84], cl(vg * 2.2 - hh * .5 - .25)), veg); em = veg * (1 - lit) * (VM[i2] > .55 ? 1 : 0); }
      lit = cl(lit + (HM[i] - HM[i2]) * 22 * L[0] + (HM[i] - HM[i + MW]) * 22 * L[1]);
      if (hh < .03) col = mix(col, [240, 230, 200], .5 * (1 - hh / .03));
    }
    const polar = Math.abs(lat) + (CM[i] - .5) * .35 - capLat;
    if (polar > 0) { col = mix(col, [236, 244, 252], sm(0, .1, polar)); spec = 0; }
    const cd = cl((CM[v * MW + (u + drift) % MW] - .8 + P.water / 100 * .22) * 5) * .8;
    col = mix(col, [255, 255, 255], cd * (.6 + .4 * lit));
    const rim = Math.pow(1 - nz, 2.6) * (.35 + .65 * P.atmo / 100) * (.25 + .75 * cl(lit + .3));
    const amb = .05 + .95 * lit;
    D[o] = cl(col[0] * amb + ac[0] * rim * .9 + spec * 255 + em * 20, 0, 255);
    D[o + 1] = cl(col[1] * amb + ac[1] * rim * .9 + spec * 255 + em * 190, 0, 255);
    D[o + 2] = cl(col[2] * amb + ac[2] * rim * .9 + spec * 255 + em * 120, 0, 255);
    D[o + 3] = tA[p] * 255;
  }
  pctx.putImageData(img, 0, 0);
}
function planet(g, k, sunA) {
  const ac = mix([255, 140, 80], [90, 210, 255], Math.max(P.atmo / 100, k));
  const halo = ctx.createRadialGradient(g.cx, g.cy, g.R * .96, g.cx, g.cy, g.R * 1.5);
  halo.addColorStop(0, `rgba(${ac},${.35 + .35 * P.atmo / 100})`); halo.addColorStop(.35, `rgba(${ac},.1)`); halo.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(g.cx, g.cy, g.R * 1.5, 0, TAU); ctx.fill();
  if (!planet.f || ((S.t | 0) & 1)) renderPlanet(k, sunA); planet.f = 1;
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(pc, g.cx - g.R, g.cy - g.R, g.R * 2, g.R * 2);
  if (T.rain) {
    ctx.save(); ctx.beginPath(); ctx.arc(g.cx, g.cy, g.R, 0, TAU); ctx.clip();
    ctx.strokeStyle = 'rgba(150,210,255,.5)'; ctx.lineWidth = 1; ctx.beginPath();
    for (let i = 0; i < 60; i++) { const d = drops[i] || (drops[i] = { x: rnd(-1, 1), y: rnd(-1, 1) }); d.y += .035; if (d.y > 1) { d.y = -1; d.x = rnd(-1, 1); } const x = g.cx + d.x * g.R, y = g.cy + d.y * g.R; ctx.moveTo(x, y); ctx.lineTo(x - 2, y + 11); }
    ctx.stroke(); ctx.restore();
  }
}
function sunPos(g, L) { return { x: g.cx + L[0] * Math.min(W * .44, g.R * 3.2), y: Math.max(70, g.cy + L[1] * g.R * 2.6 - g.R * .15) }; }
function glow(x, y, r, c, a) { const q = ctx.createRadialGradient(x, y, 0, x, y, r); q.addColorStop(0, `rgba(${c},${a})`); q.addColorStop(1, `rgba(${c},0)`); ctx.fillStyle = q; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
function drawSun(p) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  glow(p.x, p.y, W * .3, '255,150,80', .12); glow(p.x, p.y, 150, '255,190,120', .28); glow(p.x, p.y, 60, '255,225,170', .6);
  ctx.translate(p.x, p.y);
  for (let i = 0; i < 12; i++) { ctx.rotate(TAU / 12 + Math.sin(S.t * .01 + i) * .002); const g = ctx.createLinearGradient(0, 0, 0, -130 - (i % 3) * 40); g.addColorStop(0, 'rgba(255,230,180,.22)'); g.addColorStop(1, 'rgba(255,230,180,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-3, 0); ctx.lineTo(0, -130 - (i % 3) * 40); ctx.lineTo(3, 0); ctx.fill(); }
  const sg = ctx.createLinearGradient(-320, 0, 320, 0); sg.addColorStop(0, 'rgba(255,200,140,0)'); sg.addColorStop(.5, 'rgba(255,230,190,.55)'); sg.addColorStop(1, 'rgba(255,200,140,0)');
  ctx.fillStyle = sg; ctx.fillRect(-320, -1.2, 640, 2.4);
  const cg = ctx.createRadialGradient(0, 0, 0, 0, 0, 22); cg.addColorStop(0, '#fff'); cg.addColorStop(.55, '#fff3d6'); cg.addColorStop(1, 'rgba(255,190,110,0)');
  ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(0, 0, 22, 0, TAU); ctx.fill(); ctx.restore();
}
function drawFlare(p, g) {
  const dx = g.cx - p.x, dy = g.cy - p.y; ctx.save(); ctx.globalCompositeOperation = 'lighter';
  [[.35, 22, '120,200,255', .12], [.6, 12, '255,170,100', .14], [.85, 34, '160,255,200', .08], [1.25, 16, '255,120,200', .1]].forEach(([t, r, c, a]) => {
    const x = p.x + dx * t, y = p.y + dy * t; glow(x, y, r * 1.6, c, a * .8);
  }); ctx.restore();
}
function drawMoon(g, L, front) {
  const ma = S.t * .011, mx = g.cx + Math.cos(ma) * g.R * 1.95, my = g.cy - g.R * .55 + Math.sin(ma) * g.R * .55;
  if ((Math.sin(ma) > 0) !== front) return;
  const r = g.R * .045, q = ctx.createRadialGradient(mx + L[0] * r * .6, my + L[1] * r * .6, r * .1, mx, my, r * 1.1);
  q.addColorStop(0, '#d9c3a8'); q.addColorStop(.6, '#7e6a5a'); q.addColorStop(1, '#14100f');
  ctx.save(); ctx.translate(mx, my); ctx.rotate(.5); ctx.scale(1.2, 1); ctx.translate(-mx, -my);
  ctx.fillStyle = q; ctx.beginPath(); ctx.arc(mx, my, r, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(30,20,15,.45)'; [[-.3, -.2, .3], [.35, .15, .22], [0, .45, .15], [-.1, .1, .12]].forEach(c => { ctx.beginPath(); ctx.arc(mx + c[0] * r, my + c[1] * r, c[2] * r, 0, TAU); ctx.fill(); });
  ctx.restore();
}
/* --- магнитосфера: дипольные линии, ударная волна, сияние --- */
function mag(g, L) {
  aurora.v = lerp(aurora.v || 0, T.magnet ? 1 : 0, .03); const v = aurora.v; if (v < .02) return;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const sa = Math.atan2(L[1], L[0]);
  // линии поля
  [1.5, 1.85, 2.3, 2.9].forEach((Ls, li) => {
    for (const sd of [-1, 1]) {
      ctx.beginPath();
      const a0 = Math.asin(Math.sqrt(1 / Ls)) + .02;
      for (let a = a0; a < Math.PI - a0; a += .06) {
        const r = Ls * Math.sin(a) ** 2, x = sd * r * Math.sin(a) * g.R * (sd * Math.cos(sa) > 0 ? .8 : 1.12), y = -r * Math.cos(a) * g.R;
        a < a0 + .07 ? ctx.moveTo(g.cx + x, g.cy + y) : ctx.lineTo(g.cx + x, g.cy + y);
      }
      ctx.strokeStyle = `rgba(90,200,255,${.16 * v})`; ctx.lineWidth = 1.2; ctx.setLineDash([]); ctx.stroke();
      ctx.strokeStyle = `rgba(170,255,235,${.85 * v})`; ctx.lineWidth = 2; ctx.setLineDash([4, 20]); ctx.lineDashOffset = -S.t * (1.2 + li * .5) * (sd > 0 ? 1 : -1); ctx.stroke();
    }
  });
  ctx.setLineDash([]);
  // ударная волна со стороны солнца
  const bg2 = ctx.createRadialGradient(g.cx, g.cy, g.R * 2.5, g.cx, g.cy, g.R * 3.1); bg2.addColorStop(0, 'rgba(0,0,0,0)'); bg2.addColorStop(.7, `rgba(120,180,255,${.16 * v})`); bg2.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save(); ctx.beginPath(); ctx.moveTo(g.cx, g.cy); ctx.arc(g.cx, g.cy, g.R * 3.2, sa - .95, sa + .95); ctx.closePath(); ctx.clip(); ctx.fillStyle = bg2; ctx.fillRect(0, 0, W, H); ctx.restore();
  ctx.strokeStyle = `rgba(150,210,255,${.35 * v})`; ctx.lineWidth = 2; ctx.shadowColor = '#7cf'; ctx.shadowBlur = 14; ctx.beginPath(); ctx.arc(g.cx, g.cy, g.R * 2.85, sa - .9, sa + .9); ctx.stroke(); ctx.shadowBlur = 0;
  // сияние: вертикальные завесы над полюсами
  for (const pole of [-1, 1]) for (let i = 0; i < 50; i++) {
    const f = i / 49, ang = -Math.PI / 2 * pole * -1 + (f - .5) * 1.5 * (pole < 0 ? 1 : -1);
    const a2 = (pole < 0 ? -Math.PI / 2 : Math.PI / 2) + (f - .5) * 1.4;
    const bx = g.cx + Math.cos(a2) * g.R * 1.005, by = g.cy + Math.sin(a2) * g.R * 1.005;
    const h = g.R * (.22 + .3 * (.5 + .5 * Math.sin(f * 14 + S.t * .04 + pole))) * (.6 + .4 * Math.sin(f * 5 - S.t * .02));
    const gr = ctx.createLinearGradient(bx, by, bx + Math.cos(a2) * h, by + Math.sin(a2) * h);
    gr.addColorStop(0, `rgba(80,255,170,${.55 * v})`); gr.addColorStop(.55, `rgba(70,210,210,${.35 * v})`); gr.addColorStop(1, 'rgba(190,90,255,0)');
    ctx.strokeStyle = gr; ctx.lineWidth = g.R * 1.4 / 50 * 1.6; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + Math.cos(a2) * h, by + Math.sin(a2) * h); ctx.stroke();
  }
  ctx.restore();
}
function aurora() {}
/* --- купол: стекло с френелем, каркас, интерьер, платформа, антенна --- */
function dome(p, k, j, L) {
  const nrm = [Math.cos(p.ang), Math.sin(p.ang)], dotL = nrm[0] * L[0] + nrm[1] * L[1] + .3 * L[2], night = 1 - sm(-.12, .3, dotL);
  ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.ang + Math.PI / 2);
  const s = p.s, rot = -(p.ang + Math.PI / 2), lx = L[0] * Math.cos(rot) - L[1] * Math.sin(rot), ly = L[0] * Math.sin(rot) + L[1] * Math.cos(rot);
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(0, -s * .3, s * 1.9, '255,210,130', .06 + .3 * night); ctx.restore();
  // антенна + солнечная панель
  const ax = s * 1.35; ctx.strokeStyle = '#8fa3b8'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(ax, 0); ctx.lineTo(ax, -s * .55); ctx.stroke();
  ctx.save(); ctx.translate(ax, -s * .4); ctx.rotate(-.4 - lx * .2); const pg = ctx.createLinearGradient(-s * .3, 0, s * .3, 0); pg.addColorStop(0, '#1d4ed8'); pg.addColorStop(1, '#60a5fa'); ctx.fillStyle = pg; ctx.fillRect(-s * .3, -s * .05, s * .6, s * .1); ctx.restore();
  ctx.fillStyle = Math.sin(S.t * .08 + j) > 0 ? '#ff4d4d' : '#601818'; ctx.shadowColor = '#f44'; ctx.shadowBlur = 8; ctx.beginPath(); ctx.arc(ax, -s * .57, 1.8, 0, TAU); ctx.fill(); ctx.shadowBlur = 0;
  // платформа
  const bgd = ctx.createLinearGradient(0, 0, 0, s * .12); bgd.addColorStop(0, '#9aa7b5'); bgd.addColorStop(1, '#2c3440');
  ctx.fillStyle = bgd; ctx.beginPath(); ctx.moveTo(-s * 1.12, s * .02); ctx.lineTo(s * 1.12, s * .02); ctx.lineTo(s * 1.02, s * .13); ctx.lineTo(-s * 1.02, s * .13); ctx.fill();
  for (let q = -4; q <= 4; q++) { ctx.fillStyle = `rgba(120,230,255,${.5 + .5 * Math.sin(S.t * .1 + q)})`; ctx.fillRect(q * s * .24 - 1, s * .06, 2, 2); }
  // интерьер
  ctx.save(); ctx.beginPath(); ctx.arc(0, 0, s, Math.PI, 0); ctx.closePath(); ctx.clip();
  const ig = ctx.createLinearGradient(0, -s, 0, 0); ig.addColorStop(0, `rgba(30,90,110,${.35})`); ig.addColorStop(1, `rgba(${mix([90, 160, 150], [255, 200, 120], night)},${.3 + .35 * night})`);
  ctx.fillStyle = ig; ctx.fillRect(-s, -s, s * 2, s);
  const hg = ctx.createLinearGradient(0, -s * .2, 0, 0); hg.addColorStop(0, `rgb(${mix([60, 110, 60], [24, 150, 90], P.bio / 100)})`); hg.addColorStop(1, '#10281c');
  ctx.fillStyle = hg; ctx.beginPath(); ctx.moveTo(-s, 0); ctx.quadraticCurveTo(-s * .4, -s * .3, 0, -s * .1); ctx.quadraticCurveTo(s * .5, 0, s, -s * .12); ctx.lineTo(s, 0); ctx.fill();
  const nT = 3 + Math.round(P.bio / 100 * 5);
  for (let layer = 0; layer < 2; layer++) for (let q = 0; q < nT; q++) {
    const rr = ((q * 53 + j * 17 + layer * 29) % 100) / 100, x = -s * .85 + rr * s * 1.7, h = s * (.42 + .4 * (((q * 7 + j + layer) % 4) / 3)) * (layer ? 1 : .75);
    const gc = layer ? mix([20, 100, 60], [40, 200, 120], P.bio / 100) : mix([10, 60, 40], [20, 120, 80], P.bio / 100);
    ctx.fillStyle = '#3a2a1c'; ctx.fillRect(x - 1, -s * .12, 2, s * .1);
    for (let t3 = 0; t3 < 4; t3++) { const w = h * (.34 - t3 * .06), yy = -s * .1 - h * (.18 + t3 * .2), tg = ctx.createLinearGradient(x - w, 0, x + w, 0); tg.addColorStop(0, `rgb(${gc.map(v => v * .6 | 0)})`); tg.addColorStop(1, `rgb(${gc})`); ctx.fillStyle = tg; ctx.beginPath(); ctx.moveTo(x, yy - h * .3); ctx.lineTo(x - w, yy); ctx.lineTo(x + w, yy); ctx.fill(); }
  }
  for (let q = 0; q < Math.round(P.bio / 9); q++) { ctx.fillStyle = ['#f472b6', '#fbbf24', '#a78bfa', '#fff'][q % 4]; ctx.beginPath(); ctx.arc(-s * .85 + ((q * 37 + j * 11) % 100) / 100 * s * 1.7, -s * .05, s * .03, 0, TAU); ctx.fill(); }
  ctx.fillStyle = `rgba(255,230,150,${.3 + .7 * night})`; ctx.shadowColor = '#fd8'; ctx.shadowBlur = 6; for (let q = 0; q < 4; q++) { ctx.beginPath(); ctx.arc(-s * .6 + q * s * .4, -s * .55 - (q % 2) * s * .08, 1.6, 0, TAU); ctx.fill(); } ctx.shadowBlur = 0;
  ctx.restore();
  // стекло: френель
  const fr = ctx.createRadialGradient(0, -s * .1, s * .35, 0, -s * .1, s * 1.02); fr.addColorStop(0, 'rgba(160,255,235,0)'); fr.addColorStop(.8, 'rgba(160,255,235,.1)'); fr.addColorStop(1, 'rgba(190,255,240,.5)');
  ctx.fillStyle = fr; ctx.beginPath(); ctx.arc(0, 0, s, Math.PI, 0); ctx.closePath(); ctx.fill();
  // каркас
  ctx.strokeStyle = 'rgba(190,255,240,.28)'; ctx.lineWidth = .8;
  for (const rx of [.35, .68, .9]) { ctx.beginPath(); ctx.ellipse(0, 0, s * rx, s, 0, Math.PI, 0); ctx.stroke(); }
  for (const ry of [.35, .68]) { ctx.beginPath(); ctx.ellipse(0, 0, s, s * ry, 0, Math.PI, 0); ctx.stroke(); }
  // контур
  ctx.strokeStyle = 'rgba(180,255,235,.9)'; ctx.lineWidth = 1.8; ctx.shadowColor = '#34d399'; ctx.shadowBlur = 12; ctx.beginPath(); ctx.arc(0, 0, s, Math.PI, 0); ctx.stroke(); ctx.shadowBlur = 0;
  // блик в сторону солнца
  const la = Math.atan2(Math.min(ly, -.15), lx), li = clampLit(dotL);
  ctx.strokeStyle = `rgba(255,255,255,${.15 + .6 * li})`; ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(0, 0, s * .86, la - .28, la + .28); ctx.stroke();
  ctx.fillStyle = `rgba(255,255,255,${.3 + .6 * li})`; ctx.beginPath(); ctx.arc(Math.cos(la) * s * .86, Math.sin(la) * s * .86, 2.2, 0, TAU); ctx.fill(); ctx.lineCap = 'butt';
  ctx.restore();
}
const clampLit = v => Math.max(0, Math.min(1, v * 1.4));
function drawDomes(g, k, L) {
  const n = Math.min(8, Math.round(P.energy / 100 * 7) + (P.atmo > 10 ? 1 : 0)), act = [];
  domes.forEach(d => {
    const on = !d.auto || d.i < n; d.g = lerp(d.g, on ? 1 : 0, .06);
    if (d.g > .02) { const ang = -Math.PI / 2 + d.a; act.push({ x: g.cx + Math.cos(ang) * g.R * .99, y: g.cy + Math.sin(ang) * g.R * .99, ang, s: g.R * (.09 + .08 * (.3 + P.atmo / 140)) * d.g * (.9 + (d.i || 3) % 3 * .1) }); }
  });
  act.sort((a, b) => a.x - b.x);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < act.length - 1; i++) {
    const a = act[i], b = act[i + 1], mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, cx2 = mx + (mx - g.cx) * .06, cy2 = my + (my - g.cy) * .06;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.quadraticCurveTo(cx2, cy2, b.x, b.y);
    ctx.strokeStyle = `rgba(60,220,255,${.12 + .1 * P.energy / 100})`; ctx.lineWidth = 3; ctx.shadowColor = '#22d3ee'; ctx.shadowBlur = 14; ctx.setLineDash([]); ctx.stroke();
    ctx.strokeStyle = 'rgba(200,255,255,.9)'; ctx.lineWidth = 1.4; ctx.setLineDash([2, 14 - P.energy / 14]); ctx.lineDashOffset = -S.t * (.6 + P.energy / 40); ctx.stroke();
  }
  ctx.setLineDash([]); ctx.restore(); ctx.shadowBlur = 0;
  act.forEach((p, j) => dome(p, k, j, L));
}
function draw() {
  const g = geom(), sunA = S.t * .004 * (P.speed / 40) + 1, L = lightDir(sunA), sp = sunPos(g, L);
  const night = .5 - .5 * Math.cos(sunA), amb = 1 - night * .5;
  ctx.clearRect(0, 0, W, H); bg(amb); drawSun(sp); drawMoon(g, L, false);
  planet(g, S.green, sunA); drawDomes(g, S.green, L); mag(g, L); drawMoon(g, L, true);
  // нано-боты со шлейфами
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
  bots.forEach(b => {
    b.a += b.s; const x = g.cx + Math.cos(b.a) * g.R * b.d, y = g.cy + Math.sin(b.a) * g.R * b.d * .8 + Math.sin(S.t * .06 + b.z * 9) * 5, px = b.px ?? x, py = b.py ?? y;
    const gr = ctx.createLinearGradient(x, y, px - (x - px) * 6, py - (y - py) * 6); gr.addColorStop(0, 'rgba(140,255,220,.8)'); gr.addColorStop(1, 'rgba(140,255,220,0)');
    ctx.strokeStyle = gr; ctx.lineWidth = b.z * .8; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - (x - px) * 5, y - (y - py) * 5); ctx.stroke();
    ctx.fillStyle = '#eafff8'; ctx.beginPath(); ctx.arc(x, y, b.z * .7, 0, TAU); ctx.fill(); b.px = x; b.py = y;
  });
  ctx.restore();
  drawFlare(sp, g);
  // метеориты: огненный шар, плазменный хвост, ударная волна
  meteors = meteors.filter(m => {
    m.life++; m.x += m.vx; m.y += m.vy; m.tr.push([m.x, m.y]); if (m.tr.length > 26) m.tr.shift();
    const dist = Math.hypot(m.x - g.cx, m.y - g.cy), hot = 1 + 1.6 * sm(g.R * 1.9, g.R * 1.02, dist);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    for (let i = 1; i < m.tr.length; i++) { const f = i / m.tr.length; ctx.strokeStyle = `rgba(${255},${120 + 100 * f | 0},${60 + 80 * f | 0},${.5 * f})`; ctx.lineWidth = 2 + 9 * f * hot; ctx.beginPath(); ctx.moveTo(...m.tr[i - 1]); ctx.lineTo(...m.tr[i]); ctx.stroke(); }
    glow(m.x, m.y, 26 * hot, '255,170,90', .8); glow(m.x, m.y, 9, '255,255,230', 1);
    if (Math.random() < .6) sparks.push({ x: m.x, y: m.y, vx: rnd(-1, 1), vy: rnd(-1, 1), l: 22, c: '255,170,90' });
    ctx.restore();
    if (dist < g.R * .97) {
      S.flash = 1; waves.push({ x: m.x, y: m.y, r: 4, l: 0 }); for (let i = 0; i < 50; i++) sparks.push({ x: m.x, y: m.y, vx: rnd(-4, 4), vy: rnd(-5, 1), l: rnd(30, 70), c: i % 3 ? '255,170,90' : '255,235,200', g: .08 });
      const nx = (m.x - g.cx) / g.R, ny = (m.y - g.cy) / g.R, lat = Math.asin(Math.max(-1, Math.min(1, ny))), lon = Math.atan2(nx, Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny))) + S.rot;
      crater(lon, lat, 20 + (Math.random() * 14 | 0)); S.green = Math.max(0, S.green - .05); log('[WARN] Удар метеорита! Экосистема повреждена', 'warn'); ach('meteor', 'Звёздный гость'); return false;
    }
    return m.y < H + 60 && m.x > -60 && m.x < W + 60;
  });
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  waves = waves.filter(w => { w.l++; w.r += 4; const a = 1 - w.l / 50; ctx.strokeStyle = `rgba(255,200,140,${a * .7})`; ctx.lineWidth = 3 * a + 1; ctx.beginPath(); ctx.arc(w.x, w.y, w.r, 0, TAU); ctx.stroke(); return w.l < 50; });
  sparks = sparks.filter(s => { s.l--; s.x += s.vx; s.y += s.vy; s.vy += s.g || 0; ctx.fillStyle = `rgba(${s.c},${Math.min(1, s.l / 30)})`; ctx.fillRect(s.x, s.y, 2, 2); return s.l > 0; });
  ctx.restore();
  if (S.flash > .01) { ctx.fillStyle = `rgba(255,210,150,${S.flash * .3})`; ctx.fillRect(0, 0, W, H); S.flash *= .9; }
  // пылевая буря: слои песка, вихревые полосы, виньетка
  if (S.storm > 0) {
    while (dust.length < 140) dust.push({ x: rnd(0, W), y: rnd(0, H), s: rnd(8, 22), l: rnd(20, 70) });
    while (sand.length < 12) sand.push({ x: rnd(0, W), y: rnd(0, H), r: rnd(120, 320), v: rnd(.6, 2.2) });
    const e = Math.min(1, S.storm * 2);
    sand.forEach(c => { c.x -= c.v * 2; if (c.x < -c.r) { c.x = W + c.r; c.y = rnd(0, H); } glow(c.x, c.y, c.r, '205,115,65', .2 * e); });
    ctx.strokeStyle = `rgba(245,175,115,${.4 * e})`; ctx.lineWidth = 1.2; ctx.beginPath();
    dust.forEach(d => { d.x -= d.s; d.y += Math.sin(d.x * .01) * .6; if (d.x < -80) { d.x = W + 20; d.y = rnd(0, H); } ctx.moveTo(d.x, d.y); ctx.lineTo(d.x + d.l, d.y + 2); }); ctx.stroke();
    const vg = ctx.createRadialGradient(W / 2, H / 2, H * .25, W / 2, H / 2, H * .8); vg.addColorStop(0, 'rgba(120,50,20,0)'); vg.addColorStop(1, `rgba(90,35,15,${.55 * e})`); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    S.storm -= .0012; if (S.storm <= 0) { S.storm = 0; log('[OK] Буря утихла, панели очищены', 'ok'); }
  }
}

/* ---------- цикл ---------- */
function frame() {
  S.t += T.auto ? 1 : .15; S.rot += .0018 * (.3 + P.speed / 50);
  S.green = lerp(S.green, targetGreen(), .03);
  if (Math.random() < .0006) spawnMeteor();
  draw();
  if (S.t % 8 < 1) hud();
  requestAnimationFrame(frame);
}
function hud() {
  const idx = Math.round(S.green * 100);
  $('idx').textContent = idx; $('bar').style.width = idx + '%';
  $('rank').textContent = RANKS.filter(r => idx >= r[0]).pop()[1];
  const tc = Math.round(-63 + P.temp * .9 + S.green * 10);
  $('meters').innerHTML = `<div>Температура<b>${tc} °C</b></div><div>O₂<b>${(P.atmo * .21).toFixed(1)}%</b></div><div>Влажность<b>${P.water}%</b></div><div>Куполов<b>${domes.filter(d => d.g > .5).length}</b></div>`;
  $('clock').textContent = 'Сол ' + (1 + Math.floor(S.t / 600));
  [[25, 'Первый росток'], [50, 'Дыхание Марса'], [75, 'Зелёная планета'], [95, 'Эдем достигнут!']].forEach(([v, m]) => idx >= v && ach('i' + v, m));
}

/* ---------- старт ---------- */
resize(); syncToggles();
log('[INFO] Инициализация EcoSphere: Mars & Forest…');
log('[OK] Соединение с биокуполом установлено', 'ok');
const RL = [['ok', '[OK] Корневая система хвойных успешно адаптирована к марсианскому грунту'], ['info', '[INFO] Мониторинг влажности под биокуполом: стабильно'], ['ok', '[OK] Микориза связала перхлоратные слои с корневой сетью'], ['warn', '[WARN] Пылевая буря в секторе 7 — солнечные панели на 80%'], ['info', '[INFO] Фотосинтез: уровень O₂ растёт'], ['ok', '[OK] Первые мхи закрепились на реголите'], ['info', '[INFO] Спутник связи: задержка 12 мин, канал стабилен']];
setInterval(() => { const [t, m] = RL[Math.random() * RL.length | 0]; log(m, t); }, 5000);
frame();
