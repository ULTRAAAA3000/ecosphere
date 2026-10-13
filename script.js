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
let W = 0, H = 0, stars = [], bots = [], meteors = [], craters = [], clouds = [], drops = [], dust = [], blobs = [], domes = [];

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
  const n = T.nano ? 80 : 0;
  while (bots.length < n) bots.push({ a: rnd(0, TAU), d: rnd(1.03, 1.55), s: rnd(.002, .009) * (Math.random() < .5 ? -1 : 1), z: rnd(1, 2.5) });
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
const geom = () => { const R = Math.min(W, H) * .36; return { cx: W / 2, cy: H * .56, R }; };
function resize() {
  const r = cv.getBoundingClientRect(), d = window.devicePixelRatio || 1;
  W = r.width; H = r.height; cv.width = W * d; cv.height = H * d; ctx.setTransform(d, 0, 0, d, 0, 0);
  stars = Array.from({ length: 200 }, () => ({ x: Math.random() * W, y: Math.random() * H, r: rnd(.3, 1.5), p: rnd(0, 6), z: rnd(.2, 1) }));
}
window.addEventListener('resize', resize);
blobs = Array.from({ length: 90 }, (_, i) => ({ lon: rnd(0, TAU), lat: rnd(-1.3, 1.3), r: rnd(.05, .17), lake: i % 4 === 0 }));
clouds = Array.from({ length: 9 }, () => ({ lon: rnd(0, TAU), lat: rnd(-1, 1), w: rnd(.18, .4) }));
const SEEDS = [-.5, .22, -.12, .62, -.82, .9, .4, -.32].map((a, i) => ({ a, g: 0, auto: true, i }));
domes = SEEDS.slice();

/* ---------- события ---------- */
function spawnMeteor() {
  const g = geom(); const a = rnd(-2.6, -.5);
  meteors.push({ x: g.cx + Math.cos(a) * W * .6 + rnd(-40, 40), y: -20, a, life: 0 });
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
function bg(amb) {
  const g = ctx.createRadialGradient(W * .3, H * .2, 0, W * .3, H * .2, W * .8);
  g.addColorStop(0, `rgba(120,40,110,${.25 * amb})`); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const g2 = ctx.createRadialGradient(W * .85, H * .75, 0, W * .85, H * .75, W * .6);
  g2.addColorStop(0, `rgba(16,120,100,${.22 * amb})`); g2.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g2; ctx.fillRect(0, 0, W, H);
  stars.forEach(s => {
    ctx.globalAlpha = (.3 + .7 * Math.abs(Math.sin(S.t * .02 * s.z + s.p))) * (1 - .6 * S.green * amb);
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc((s.x + S.t * .05 * s.z) % W, s.y, s.r, 0, TAU); ctx.fill();
  });
  ctx.globalAlpha = 1;
}
function planet(g, k, sunA) {
  const base = mix(RED, GREEN, k), dark = mix(DR, DG, k), gc = mix([232, 122, 69], [60, 220, 170], k);
  const halo = ctx.createRadialGradient(g.cx, g.cy, g.R * .9, g.cx, g.cy, g.R * (1.3 + P.atmo / 400));
  halo.addColorStop(0, `rgba(${gc},${.25 + .4 * P.atmo / 100})`); halo.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(g.cx, g.cy, g.R * 1.45, 0, TAU); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.arc(g.cx, g.cy, g.R, 0, TAU); ctx.clip();
  const gr = ctx.createRadialGradient(g.cx - g.R * .3, g.cy - g.R * .3, g.R * .1, g.cx, g.cy, g.R);
  gr.addColorStop(0, `rgb(${base})`); gr.addColorStop(1, `rgb(${dark})`);
  ctx.fillStyle = gr; ctx.fillRect(g.cx - g.R, g.cy - g.R, g.R * 2, g.R * 2);
  // материки / озёра, вращаются вместе с планетой
  blobs.forEach(b => {
    const l = b.lon + S.rot, c = Math.cos(l); if (c < -.1) return;
    const x = g.cx + g.R * Math.cos(b.lat) * Math.sin(l), y = g.cy + g.R * Math.sin(b.lat), r = b.r * g.R * Math.max(.2, c);
    if (b.lake) { ctx.fillStyle = `rgba(60,150,230,${.65 * P.water / 100})`; ctx.beginPath(); ctx.ellipse(x, y, r * .8, r * .5, 0, 0, TAU); ctx.fill(); }
    else { ctx.fillStyle = `rgba(${mix([140, 60, 36], [14, 120, 70], k)},${.15 + .5 * k})`; ctx.beginPath(); ctx.arc(x, y, r * (.5 + k), 0, TAU); ctx.fill(); }
  });
  craters.forEach(c => { ctx.strokeStyle = 'rgba(40,10,5,.6)'; ctx.fillStyle = 'rgba(30,8,4,.35)'; ctx.beginPath(); ctx.arc(g.cx + c.x * g.R, g.cy + c.y * g.R, c.r * g.R, 0, TAU); ctx.fill(); ctx.stroke(); });
  // облака
  clouds.forEach(c => {
    const l = c.lon + S.rot * 1.4, cs = Math.cos(l); if (cs < 0) return;
    ctx.fillStyle = `rgba(255,255,255,${.5 * cs * (.15 + P.water / 130)})`;
    ctx.beginPath(); ctx.ellipse(g.cx + g.R * Math.cos(c.lat) * Math.sin(l), g.cy + g.R * Math.sin(c.lat) * .95, c.w * g.R * cs, c.w * g.R * .22, 0, 0, TAU); ctx.fill();
  });
  // терминатор: освещённая сторона вращается вместе со временем
  const lx = g.cx + Math.cos(sunA) * g.R * .55, ly = g.cy - Math.abs(Math.sin(sunA)) * g.R * .15;
  const sh = ctx.createRadialGradient(lx, ly, g.R * .2, g.cx, g.cy, g.R * 1.05);
  sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(.7, 'rgba(4,6,16,.5)'); sh.addColorStop(1, 'rgba(2,3,10,.9)');
  ctx.fillStyle = sh; ctx.fillRect(g.cx - g.R, g.cy - g.R, g.R * 2, g.R * 2);
  // дождь
  if (T.rain) {
    ctx.strokeStyle = 'rgba(140,200,255,.55)'; ctx.lineWidth = 1; ctx.beginPath();
    for (let i = 0; i < 40; i++) { const d = drops[i] || (drops[i] = { x: rnd(-1, 1), y: rnd(-1, 1) }); d.y += .03; if (d.y > 1) { d.y = -1; d.x = rnd(-1, 1); } const x = g.cx + d.x * g.R, y = g.cy + d.y * g.R; ctx.moveTo(x, y); ctx.lineTo(x - 2, y + 9); }
    ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = `rgba(${gc},.35)`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(g.cx, g.cy, g.R, 0, TAU); ctx.stroke();
}
function tree(x, y, h, k, c) {
  ctx.fillStyle = c;
  for (let i = 0; i < 3; i++) { const w = h * (.42 - i * .1), yy = y - h * (.28 + i * .24); ctx.beginPath(); ctx.moveTo(x, yy - h * .34); ctx.lineTo(x - w, yy); ctx.lineTo(x + w, yy); ctx.fill(); }
}
function drawDomes(g, k, night) {
  const n = Math.min(8, Math.round(P.energy / 100 * 7) + (P.atmo > 10 ? 1 : 0));
  const act = [];
  domes.forEach(d => {
    const on = !d.auto || d.i < n; d.g = lerp(d.g, on ? 1 : 0, .06);
    if (d.g > .02) {
      const ang = -Math.PI / 2 + d.a;
      act.push({ x: g.cx + Math.cos(ang) * g.R * .985, y: g.cy + Math.sin(ang) * g.R * .985, ang, s: g.R * (.075 + .09 * (.3 + P.atmo / 140)) * d.g * (.9 + (d.i || 3) % 3 * .12) });
    }
  });
  act.sort((a, b) => a.x - b.x);
  ctx.lineWidth = 1.6;
  for (let i = 0; i < act.length - 1; i++) {
    const a = act[i], b = act[i + 1], pu = .5 + .5 * Math.sin(S.t * .06 * (1 + P.energy / 40) + i);
    ctx.strokeStyle = `rgba(80,255,200,${(.25 + .6 * pu) * (.3 + P.energy / 100)})`; ctx.shadowColor = '#10b981'; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.quadraticCurveTo((a.x + b.x) / 2 * .98 + g.cx * .02, (a.y + b.y) / 2 + g.R * .08, b.x, b.y); ctx.stroke();
    const f = (S.t * .01 * (1 + P.energy / 50) + i * .3) % 1; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(lerp(a.x, b.x, f), lerp(a.y, b.y, f) + Math.sin(f * Math.PI) * g.R * .04, 2, 0, TAU); ctx.fill();
  }
  ctx.shadowBlur = 0;
  act.forEach((p, j) => {
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.ang + Math.PI / 2); const s = p.s;
    const gl = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 1.6); gl.addColorStop(0, `rgba(255,220,140,${.25 * night + .1})`); gl.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(0, 0, s * 1.6, Math.PI, 0); ctx.fill();
    ctx.beginPath(); ctx.arc(0, 0, s, Math.PI, 0); ctx.closePath();
    ctx.fillStyle = `rgba(30,200,150,${.12 + .1 * night})`; ctx.fill();
    ctx.save(); ctx.clip();
    const treeC = `rgb(${mix([70, 140, 80], [16, 200, 129], P.bio / 100)})`;
    const nTrees = 2 + Math.round(P.bio / 100 * 4);
    for (let q = 0; q < nTrees; q++) tree(-s * .8 + s * 1.6 * (q + .5) / nTrees, 0, s * (.5 + .4 * ((q * 7 + j) % 3) / 2), k, treeC);
    for (let q = 0; q < Math.round(P.bio / 14); q++) { ctx.fillStyle = ['#f472b6', '#fbbf24', '#a78bfa'][q % 3]; ctx.beginPath(); ctx.arc(-s * .8 + ((q * 37 + j * 11) % 100) / 100 * s * 1.6, -s * .06, s * .045, 0, TAU); ctx.fill(); }
    ctx.fillStyle = `rgba(255,230,150,${night * .9})`; for (let q = 0; q < 3; q++) ctx.fillRect(-s * .5 + q * s * .5, -s * .2, 2.5, 2.5);
    ctx.restore();
    ctx.strokeStyle = 'rgba(130,255,215,.85)'; ctx.shadowColor = '#10b981'; ctx.shadowBlur = 14; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(0, 0, s, Math.PI, 0); ctx.stroke();
    ctx.shadowBlur = 0; ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.beginPath(); ctx.arc(0, 0, s * .78, Math.PI * 1.15, Math.PI * 1.45); ctx.stroke();
    ctx.restore();
  });
}
function aurora(g) {
  const k = T.magnet ? 1 : 0; aurora.v = lerp(aurora.v || 0, k, .03); if (aurora.v < .02) return;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let l = 0; l < 3; l++) {
    ctx.strokeStyle = ['rgba(16,255,160,', 'rgba(120,120,255,', 'rgba(255,90,200,'][l] + (.1 * aurora.v) + ')'; ctx.lineWidth = 26 - l * 7;
    ctx.beginPath();
    for (let x = -g.R * 1.1; x <= g.R * 1.1; x += 8) { const y = g.cy - g.R * 1.12 - 20 * l - Math.sin(x * .02 + S.t * .03 + l) * 14 - Math.cos(x * .008) * 20 + (x * x) / (g.R * 14); x === -g.R * 1.1 ? ctx.moveTo(g.cx + x, y) : ctx.lineTo(g.cx + x, y); }
    ctx.stroke();
  }
  ctx.restore();
}
function draw() {
  const g = geom(), sunA = S.t * .004 * (P.speed / 40) + 1;
  const night = T.auto || true ? .5 - .5 * Math.cos(sunA * 1.0) : 0, amb = 1 - night * .5;
  ctx.clearRect(0, 0, W, H); bg(amb);
  // солнце + Фобос
  const sx = g.cx + Math.cos(sunA) * W * .42, sy = H * .22 - Math.abs(Math.sin(sunA)) * H * .08;
  const sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, 60); sg.addColorStop(0, 'rgba(255,240,200,.9)'); sg.addColorStop(.3, 'rgba(255,170,90,.3)'); sg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(sx, sy, 60, 0, TAU); ctx.fill();
  const ma = S.t * .012; ctx.fillStyle = '#8b7766'; ctx.beginPath(); ctx.ellipse(g.cx + Math.cos(ma) * g.R * 1.9, g.cy - g.R * .9 + Math.sin(ma) * g.R * .35, 9, 7, .4, 0, TAU); ctx.fill();
  planet(g, S.green, sunA); aurora(g); drawDomes(g, S.green, night);
  bots.forEach(b => { b.a += b.s; const x = g.cx + Math.cos(b.a) * g.R * b.d, y = g.cy + Math.sin(b.a) * g.R * b.d * .8; ctx.fillStyle = '#8bffd8'; ctx.shadowColor = '#10b981'; ctx.shadowBlur = 8; ctx.beginPath(); ctx.arc(x, y, b.z, 0, TAU); ctx.fill(); });
  ctx.shadowBlur = 0;
  // метеориты
  meteors = meteors.filter(m => {
    m.life++; const sp = 9; m.x += Math.cos(Math.PI / 2 + (m.a + Math.PI / 2) * .15) * sp * .35; m.y += sp;
    const tg = ctx.createLinearGradient(m.x, m.y, m.x - 30, m.y - 130); tg.addColorStop(0, 'rgba(255,200,120,.95)'); tg.addColorStop(1, 'rgba(255,100,40,0)');
    ctx.strokeStyle = tg; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(m.x - 30, m.y - 130); ctx.stroke();
    const hit = Math.hypot(m.x - g.cx, m.y - g.cy) < g.R * 1.02;
    if (hit) { S.flash = 1; const a = Math.atan2(m.y - g.cy, m.x - g.cx); craters.push({ x: Math.cos(a) * .8 * rnd(.3, .9), y: Math.sin(a) * .6, r: rnd(.04, .08) }); if (craters.length > 8) craters.shift(); S.green = Math.max(0, S.green - .05); log('[WARN] Удар метеорита! Экосистема повреждена', 'warn'); ach('meteor', 'Звёздный гость'); return false; }
    return m.y < H + 50;
  });
  if (S.flash > .01) { ctx.fillStyle = `rgba(255,200,140,${S.flash * .35})`; ctx.fillRect(0, 0, W, H); S.flash *= .9; }
  // пылевая буря
  if (S.storm > 0) {
    while (dust.length < 120) dust.push({ x: rnd(0, W), y: rnd(0, H), s: rnd(6, 16), l: rnd(10, 40) });
    ctx.fillStyle = `rgba(190,95,50,${.22 * S.storm})`; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = `rgba(240,160,100,${.5 * S.storm})`; ctx.lineWidth = 1.5; ctx.beginPath();
    dust.forEach(d => { d.x -= d.s; if (d.x < -50) { d.x = W + 20; d.y = rnd(0, H); } ctx.moveTo(d.x, d.y); ctx.lineTo(d.x + d.l, d.y + 3); });
    ctx.stroke(); S.storm -= .0012; if (S.storm <= 0) { S.storm = 0; log('[OK] Буря утихла, панели очищены', 'ok'); }
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
