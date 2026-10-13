'use strict';
const $ = id => document.getElementById(id);
const cv = $('canvas'), ctx = cv.getContext('2d');
const st = { atmo: 20, energy: 30, nano: false, green: 0, domes: 0 };
let W = 0, H = 0, t = 0, stars = [], bots = [];

/* ---------- утилиты ---------- */
const lerp = (a, b, k) => a + (b - a) * k;
const mix = (c1, c2, k) => c1.map((v, i) => Math.round(lerp(v, c2[i], k)));
const rgb = c => `rgb(${c[0]},${c[1]},${c[2]})`;
const rnd = (a, b) => a + Math.random() * (b - a);
const RED = [168, 74, 44], GREEN = [22, 150, 90], DARK_RED = [96, 36, 24], DARK_GREEN = [8, 80, 52];

/* ---------- лог ---------- */
const logEl = $('log');
function log(msg, type = 'info') {
  const p = document.createElement('p');
  p.className = type;
  const time = new Date().toLocaleTimeString('ru-RU');
  p.textContent = `[${time}] ${msg}`;
  logEl.appendChild(p);
  while (logEl.children.length > 60) logEl.firstChild.remove();
  logEl.scrollTop = logEl.scrollHeight;
}
const randomLogs = [
  ['ok', '[OK] Корневая система хвойных успешно адаптирована к марсианскому грунту'],
  ['info', '[INFO] Мониторинг влажности под биокуполом: стабильно'],
  ['ok', '[OK] Микориза связала перхлоратные слои с корневой сетью'],
  ['warn', '[WARN] Пылевая буря в секторе 7 — солнечные панели на 80%'],
  ['info', '[INFO] Фотосинтез: уровень O₂ растёт'],
  ['ok', '[OK] Первые мхи закрепились на реголите'],
  ['warn', '[WARN] Перепад температур на границе купола'],
  ['info', '[INFO] Спутник связи: задержка 12 мин, канал стабилен']
];

/* ---------- размеры ---------- */
function resize() {
  const r = cv.getBoundingClientRect(), d = window.devicePixelRatio || 1;
  W = r.width; H = r.height;
  cv.width = W * d; cv.height = H * d;
  ctx.setTransform(d, 0, 0, d, 0, 0);
  stars = Array.from({ length: 140 }, () => ({ x: Math.random() * W, y: Math.random() * H, r: rnd(.3, 1.4), p: rnd(0, 6) }));
}
window.addEventListener('resize', resize);

/* ---------- частицы-наноботы ---------- */
function syncBots() {
  const target = st.nano ? 70 : 0;
  while (bots.length < target) bots.push({ a: rnd(0, 6.28), d: rnd(1.02, 1.5), s: rnd(.002, .008) * (Math.random() < .5 ? -1 : 1), z: rnd(1, 2.4) });
  if (bots.length > target) bots.length = target;
}

/* ---------- купола (детерминированные позиции) ---------- */
const domeSeeds = [-.55, .2, -.1, .6, -.8, .85, .38, -.35].map((a, i) => ({ a, s: .75 + (i % 3) * .15, ph: i * 1.3 }));

function planetGeom() {
  const R = Math.min(W, H) * .38;
  return { cx: W / 2, cy: H / 2 + R * .08, R };
}

/* ---------- отрисовка ---------- */
function drawStars() {
  stars.forEach(s => {
    ctx.globalAlpha = .4 + .6 * Math.abs(Math.sin(t * .02 + s.p));
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.28); ctx.fill();
  });
  ctx.globalAlpha = 1;
}

function drawPlanet(g, k) {
  const base = mix(RED, GREEN, k), dark = mix(DARK_RED, DARK_GREEN, k);
  // атмосферное свечение
  const glow = ctx.createRadialGradient(g.cx, g.cy, g.R * .95, g.cx, g.cy, g.R * 1.35);
  const gc = mix([232, 122, 69], [16, 185, 129], k);
  glow.addColorStop(0, `rgba(${gc},${.15 + .35 * st.atmo / 100})`);
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(g.cx, g.cy, g.R * 1.35, 0, 6.28); ctx.fill();
  // поверхность
  const gr = ctx.createRadialGradient(g.cx - g.R * .4, g.cy - g.R * .4, g.R * .1, g.cx, g.cy, g.R);
  gr.addColorStop(0, rgb(base)); gr.addColorStop(1, rgb(dark));
  ctx.fillStyle = gr;
  ctx.beginPath(); ctx.arc(g.cx, g.cy, g.R, 0, 6.28); ctx.fill();
  // кратеры, исчезают по мере озеленения
  ctx.save();
  ctx.beginPath(); ctx.arc(g.cx, g.cy, g.R, 0, 6.28); ctx.clip();
  ctx.globalAlpha = .35 * (1 - k);
  ctx.strokeStyle = rgb(dark); ctx.lineWidth = 2;
  [[-.3, -.45, .14], [.35, -.2, .1], [-.5, .25, .09], [.2, .5, .16], [.55, .4, .07]].forEach(([x, y, r]) => {
    ctx.beginPath(); ctx.arc(g.cx + x * g.R, g.cy + y * g.R, r * g.R, 0, 6.28); ctx.stroke();
  });
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawTree(x, y, h, k) {
  ctx.fillStyle = rgb(mix([60, 120, 70], [16, 185, 129], k));
  for (let i = 0; i < 3; i++) {
    const w = h * (.45 - i * .1), yy = y - h * (.3 + i * .25);
    ctx.beginPath(); ctx.moveTo(x, yy - h * .35); ctx.lineTo(x - w, yy); ctx.lineTo(x + w, yy); ctx.fill();
  }
}

function drawDomes(g, k) {
  const n = st.domes, pts = [];
  for (let i = 0; i < n; i++) {
    const d = domeSeeds[i];
    const ang = -Math.PI / 2 + d.a;
    const size = g.R * .16 * d.s * (.55 + .8 * st.atmo / 100);
    const x = g.cx + Math.cos(ang) * g.R * .98, y = g.cy + Math.sin(ang) * g.R * .98;
    pts.push({ x, y, ang, size });
  }
  // линии связи (энергия)
  ctx.lineWidth = 1.5;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const alpha = .25 + .55 * (.5 + .5 * Math.sin(t * .05 * (1 + st.energy / 50) + i));
    ctx.strokeStyle = `rgba(16,185,129,${alpha * (.3 + st.energy / 100)})`;
    ctx.shadowColor = '#10b981'; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.moveTo(a.x, a.y);
    ctx.quadraticCurveTo(g.cx + (a.x + b.x - 2 * g.cx) * .5 * .55, g.cy + (a.y + b.y - 2 * g.cy) * .5 * .55, b.x, b.y);
    ctx.stroke();
  }
  ctx.shadowBlur = 0;
  // купола
  pts.forEach(p => {
    ctx.save();
    ctx.translate(p.x, p.y); ctx.rotate(p.ang + Math.PI / 2);
    const s = p.size;
    ctx.beginPath(); ctx.arc(0, 0, s, Math.PI, 0); ctx.closePath();
    ctx.fillStyle = 'rgba(16,185,129,.18)'; ctx.fill();
    ctx.strokeStyle = 'rgba(120,255,210,.8)'; ctx.lineWidth = 1.5;
    ctx.shadowColor = '#10b981'; ctx.shadowBlur = 12; ctx.stroke(); ctx.shadowBlur = 0;
    ctx.save(); ctx.beginPath(); ctx.arc(0, 0, s, Math.PI, 0); ctx.clip();
    drawTree(-s * .45, 0, s * .55, k); drawTree(0, 0, s * .8, k); drawTree(s * .45, 0, s * .5, k);
    ctx.restore();
    ctx.restore();
  });
}

function drawBots(g) {
  bots.forEach(b => {
    b.a += b.s;
    const x = g.cx + Math.cos(b.a) * g.R * b.d, y = g.cy + Math.sin(b.a) * g.R * b.d * .85;
    ctx.fillStyle = '#8bffd8'; ctx.shadowColor = '#10b981'; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.arc(x, y, b.z, 0, 6.28); ctx.fill();
  });
  ctx.shadowBlur = 0;
}

let lastStat = 0;
function frame() {
  t++;
  // степень озеленения: атмосфера важнее, энергия и наноботы усиливают
  const target = Math.min(1, (st.atmo * .55 + st.energy * .35) / 100 + (st.nano ? .1 : 0));
  st.green = lerp(st.green, target, .04);
  st.domes = Math.min(domeSeeds.length, Math.round(st.energy / 100 * 7) + (st.atmo > 10 ? 1 : 0));

  ctx.clearRect(0, 0, W, H);
  drawStars();
  const g = planetGeom();
  drawPlanet(g, st.green);
  drawDomes(g, st.green);
  drawBots(g);

  if (t - lastStat > 10) {
    lastStat = t;
    $('sGreen').textContent = Math.round(st.green * 100) + '%';
    $('sDomes').textContent = st.domes;
    $('sBots').textContent = bots.length;
  }
  requestAnimationFrame(frame);
}

/* ---------- интерфейс ---------- */
$('atmo').addEventListener('input', e => {
  st.atmo = +e.target.value; $('atmoOut').textContent = st.atmo + '%';
});
$('atmo').addEventListener('change', () => log(
  st.atmo > 60 ? '[OK] Баланс атмосферы смещён в сторону кислорода' :
  st.atmo < 25 ? '[WARN] Высокий уровень CO₂ под куполом' : '[INFO] Состав атмосферы скорректирован',
  st.atmo > 60 ? 'ok' : st.atmo < 25 ? 'warn' : 'info'));
$('energy').addEventListener('input', e => {
  st.energy = +e.target.value; $('energyOut').textContent = st.energy + '%';
});
$('energy').addEventListener('change', () => log(
  st.energy > 60 ? '[OK] Корневая система получает энергию от солнечных батарей' : '[INFO] Энергопоток перераспределён',
  st.energy > 60 ? 'ok' : 'info'));
$('nano').addEventListener('click', e => {
  st.nano = !st.nano;
  e.currentTarget.setAttribute('aria-pressed', st.nano);
  e.currentTarget.querySelector('b').textContent = st.nano ? 'ВКЛ' : 'ВЫКЛ';
  syncBots();
  log(st.nano ? '[OK] Нано-боты запущены: очистка грунта от перхлоратов' : '[WARN] Нано-боты остановлены', st.nano ? 'ok' : 'warn');
});

/* ---------- старт ---------- */
resize();
log('[INFO] Инициализация EcoSphere: Mars & Forest…');
log('[OK] Соединение с биокуполом установлено', 'ok');
setInterval(() => {
  const [type, msg] = randomLogs[Math.floor(Math.random() * randomLogs.length)];
  log(msg, type);
}, 4500);
frame();
