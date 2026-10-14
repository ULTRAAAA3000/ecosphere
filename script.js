var canvas = document.getElementById("canvas");
var ctx = canvas.getContext("2d");
var W = 0;
var H = 0;
var PI2 = Math.PI * 2;

var params = { atmo: 20, energy: 30, water: 10, temp: 25, bio: 5, speed: 40 };
var paramNames = ["atmo", "energy", "water", "temp", "bio", "speed"];
var sw = { nano: false, magnet: false, rain: false, auto: true };
var swNames = ["nano", "magnet", "rain", "auto"];

var time = 0;
var green = 0;
var rotation = 0;
var storm = 0;
var flash = 0;
var done = {};
var toastTimer = 0;

var stars = [];
var bots = [];
var meteors = [];
var sparks = [];
var craters = [];
var domes = [];
var drops = [];
var dust = [];

var domeAngles = [-0.5, 0.22, -0.12, 0.62, -0.82, 0.9, 0.4, -0.32];
for (var i = 0; i < domeAngles.length; i++) {
  domes.push({ angle: domeAngles[i], grow: 0, auto: true, number: i });
}

var randomLogs = [
  ["ok", "[OK] Корневая система хвойных успешно адаптирована к марсианскому грунту"],
  ["info", "[INFO] Мониторинг влажности под биокуполом: стабильно"],
  ["ok", "[OK] Микориза связала перхлоратные слои с корневой сетью"],
  ["warn", "[WARN] Пылевая буря в секторе 7: солнечные панели на 80%"],
  ["info", "[INFO] Фотосинтез: уровень O2 растёт"],
  ["ok", "[OK] Первые мхи закрепились на реголите"],
  ["info", "[INFO] Спутник связи: задержка 12 мин, канал стабилен"]
];

function rand(a, b) {
  return a + Math.random() * (b - a);
}

function clamp(v, a, b) {
  if (v < a) return a;
  if (v > b) return b;
  return v;
}

function mix(a, b, k) {
  return a + (b - a) * k;
}

function rgba(r, g, b, a) {
  return "rgba(" + Math.round(r) + "," + Math.round(g) + "," + Math.round(b) + "," + a + ")";
}

function addLog(text, type) {
  var log = document.getElementById("log");
  var p = document.createElement("p");
  p.className = type;
  p.textContent = "[" + new Date().toLocaleTimeString("ru-RU") + "] " + text;
  log.appendChild(p);
  while (log.children.length > 50) {
    log.removeChild(log.firstChild);
  }
  log.scrollTop = log.scrollHeight;
}

function achievement(key, text) {
  if (done[key]) return;
  done[key] = true;
  var toast = document.getElementById("toast");
  toast.textContent = "Достижение: " + text;
  toast.className = "show";
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () {
    toast.className = "";
  }, 3000);
  addLog("[OK] Достижение: " + text, "ok");
}

function makeTexture(count, minR, maxR, colors, alpha, background) {
  var c = document.createElement("canvas");
  c.width = 512;
  c.height = 256;
  var t = c.getContext("2d");
  if (background) {
    t.fillStyle = background;
    t.fillRect(0, 0, 512, 256);
  }
  for (var i = 0; i < count; i++) {
    var x = rand(0, 512);
    var y = rand(0, 256);
    var r = rand(minR, maxR);
    t.fillStyle = colors[Math.floor(Math.random() * colors.length)];
    for (var layer = 0; layer < 3; layer++) {
      t.globalAlpha = alpha * 0.4;
      for (var shift = -512; shift <= 512; shift += 512) {
        t.beginPath();
        t.arc(x + shift, y, r * (1 - layer * 0.25), 0, PI2);
        t.fill();
      }
    }
  }
  return c;
}

var landTexture = makeTexture(300, 5, 24, ["#6b2c1b", "#c98053", "#8a3d24", "#b5683f"], 0.6, "#9a4a2b");
var greenTexture1 = makeTexture(110, 10, 30, ["#2fb86a", "#45cf7f"], 0.9, null);
var greenTexture2 = makeTexture(260, 12, 34, ["#25a05c", "#3cc878", "#2fb86a"], 0.95, null);
var seaTexture = makeTexture(40, 25, 55, ["#2d7fd1", "#1f5fa8"], 0.95, null);
var cloudTexture = makeTexture(45, 6, 16, ["#ffffff"], 0.5, null);

function resize() {
  var box = canvas.getBoundingClientRect();
  canvas.width = box.width;
  canvas.height = box.height;
  W = canvas.width;
  H = canvas.height;
  stars = [];
  for (var i = 0; i < 160; i++) {
    stars.push({ x: rand(0, W), y: rand(0, H), size: rand(0.4, 1.6), phase: rand(0, 6) });
  }
}

function getPlanet() {
  var r = Math.min(W, H) * 0.38;
  return { x: W / 2, y: H * 0.58, r: r };
}

function getSunAngle() {
  return time * 0.004 * (params.speed / 40) + 1;
}

function targetGreen() {
  var tempGood = 1 - Math.abs(params.temp - 60) / 60;
  var g = (params.atmo * 0.3 + params.energy * 0.2 + params.water * 0.2 + params.bio * 0.15 + tempGood * 100 * 0.15) / 100;
  if (sw.nano) g = g + 0.06;
  if (sw.magnet) g = g + 0.05;
  g = g - storm * 0.12;
  return clamp(g, 0, 1);
}

function drawStars() {
  for (var i = 0; i < stars.length; i++) {
    var s = stars[i];
    var alpha = 0.4 + 0.6 * Math.abs(Math.sin(time * 0.02 + s.phase));
    ctx.fillStyle = "rgba(255,255,255," + alpha + ")";
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.size, 0, PI2);
    ctx.fill();
  }
}

function drawBackground() {
  var g1 = ctx.createRadialGradient(W * 0.25, H * 0.25, 0, W * 0.25, H * 0.25, W * 0.5);
  g1.addColorStop(0, "rgba(120,40,110,0.3)");
  g1.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g1;
  ctx.fillRect(0, 0, W, H);
  var g2 = ctx.createRadialGradient(W * 0.85, H * 0.8, 0, W * 0.85, H * 0.8, W * 0.45);
  g2.addColorStop(0, "rgba(16,130,110,0.25)");
  g2.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g2;
  ctx.fillRect(0, 0, W, H);
  drawStars();
}

function drawGlow(x, y, radius, r, g, b, alpha) {
  var grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
  grad.addColorStop(0, rgba(r, g, b, alpha));
  grad.addColorStop(1, rgba(r, g, b, 0));
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, PI2);
  ctx.fill();
}

function getSunPosition(p) {
  var a = getSunAngle();
  return { x: p.x + Math.cos(a) * Math.min(W * 0.42, p.r * 3), y: Math.max(80, p.y - p.r * 1.3) };
}

function drawSun(sun) {
  drawGlow(sun.x, sun.y, 220, 255, 150, 80, 0.2);
  drawGlow(sun.x, sun.y, 90, 255, 200, 130, 0.5);
  ctx.strokeStyle = "rgba(255,230,180,0.25)";
  ctx.lineWidth = 2;
  for (var i = 0; i < 12; i++) {
    var a = i * (PI2 / 12) + time * 0.002;
    ctx.beginPath();
    ctx.moveTo(sun.x + Math.cos(a) * 30, sun.y + Math.sin(a) * 30);
    ctx.lineTo(sun.x + Math.cos(a) * 110, sun.y + Math.sin(a) * 110);
    ctx.stroke();
  }
  drawGlow(sun.x, sun.y, 28, 255, 255, 240, 1);
}

function drawMoon(p, front) {
  var a = time * 0.011;
  var x = p.x + Math.cos(a) * p.r * 1.9;
  var y = p.y - p.r * 0.5 + Math.sin(a) * p.r * 0.5;
  var isFront = Math.sin(a) > 0;
  if (isFront != front) return;
  var r = p.r * 0.05;
  var grad = ctx.createRadialGradient(x - r * 0.4, y - r * 0.4, 1, x, y, r);
  grad.addColorStop(0, "#d9c3a8");
  grad.addColorStop(1, "#4a3d35");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, PI2);
  ctx.fill();
  ctx.fillStyle = "rgba(30,20,15,0.4)";
  ctx.beginPath();
  ctx.arc(x - r * 0.3, y - r * 0.1, r * 0.25, 0, PI2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + r * 0.3, y + r * 0.3, r * 0.18, 0, PI2);
  ctx.fill();
}

function drawLayer(texture, p, offset, alpha) {
  var width = p.r * 4;
  ctx.globalAlpha = alpha;
  ctx.drawImage(texture, p.x - p.r - offset, p.y - p.r, width, p.r * 2);
  ctx.drawImage(texture, p.x - p.r - offset + width, p.y - p.r, width, p.r * 2);
  ctx.globalAlpha = 1;
}

function drawPlanet(p) {
  var halo = ctx.createRadialGradient(p.x, p.y, p.r * 0.95, p.x, p.y, p.r * 1.4);
  var blue = Math.max(params.atmo / 100, green);
  halo.addColorStop(0, rgba(mix(255, 100, blue), mix(140, 200, blue), mix(80, 255, blue), 0.5));
  halo.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.r * 1.4, 0, PI2);
  ctx.fill();

  var width = p.r * 4;
  var offset = (rotation * width) % width;
  var cloudOffset = (rotation * 1.5 * width) % width;

  ctx.save();
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.r, 0, PI2);
  ctx.clip();

  drawLayer(landTexture, p, offset, 1);
  drawLayer(seaTexture, p, offset, params.water / 100);
  drawLayer(greenTexture1, p, offset, clamp(green * 2, 0, 1));
  drawLayer(greenTexture2, p, offset, clamp(green * 2 - 1, 0, 1));

  for (var i = 0; i < craters.length; i++) {
    var c = craters[i];
    for (var k = 0; k < 2; k++) {
      var cx = p.x - p.r - offset + c.u * width + k * width;
      ctx.fillStyle = "rgba(30,8,4,0.45)";
      ctx.beginPath();
      ctx.arc(cx, p.y - p.r + c.v * p.r * 2, c.size * p.r, 0, PI2);
      ctx.fill();
    }
  }

  var cap = p.r * (0.14 - params.temp / 1000);
  ctx.fillStyle = "rgba(235,243,252,0.9)";
  ctx.beginPath();
  ctx.ellipse(p.x, p.y - p.r, p.r * 0.8, cap, 0, 0, PI2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(p.x, p.y + p.r, p.r * 0.7, cap * 0.8, 0, 0, PI2);
  ctx.fill();

  drawLayer(cloudTexture, p, cloudOffset, 0.1 + params.water / 300);

  if (sw.rain) {
    ctx.strokeStyle = "rgba(150,210,255,0.5)";
    ctx.beginPath();
    for (var d = 0; d < 50; d++) {
      if (drops[d] == undefined) {
        drops[d] = { x: rand(-1, 1), y: rand(-1, 1) };
      }
      drops[d].y = drops[d].y + 0.035;
      if (drops[d].y > 1) {
        drops[d].y = -1;
        drops[d].x = rand(-1, 1);
      }
      var rx = p.x + drops[d].x * p.r;
      var ry = p.y + drops[d].y * p.r;
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx - 2, ry + 10);
    }
    ctx.stroke();
  }

  var angle = getSunAngle();
  var lx = Math.cos(angle) * 0.6;
  var shade = ctx.createRadialGradient(p.x + lx * p.r, p.y - p.r * 0.3, p.r * 0.3, p.x, p.y, p.r * 1.25);
  shade.addColorStop(0, "rgba(0,0,0,0)");
  shade.addColorStop(0.7, "rgba(4,6,16,0.18)");
  shade.addColorStop(1, "rgba(2,3,10,0.75)");
  ctx.fillStyle = shade;
  ctx.fillRect(p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
  ctx.restore();
}

function drawMagnetField(p) {
  if (!sw.magnet) return;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 18]);
  for (var i = 0; i < 4; i++) {
    ctx.lineDashOffset = -time * (1 + i * 0.4);
    ctx.strokeStyle = "rgba(160,255,230,0.7)";
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, p.r * (1.25 + i * 0.4), p.r * (1.5 + i * 0.7), 0, 0, PI2);
    ctx.stroke();
  }
  ctx.setLineDash([]);
}

function drawAurora(p) {
  if (!sw.magnet) return;
  for (var pole = -1; pole <= 1; pole += 2) {
    for (var i = 0; i < 40; i++) {
      var a = pole * Math.PI / 2 + (i / 39 - 0.5) * 1.4;
      var x = p.x + Math.cos(a) * p.r;
      var y = p.y + Math.sin(a) * p.r;
      var h = p.r * (0.08 + 0.14 * Math.abs(Math.sin(i * 0.5 + time * 0.04)));
      var grad = ctx.createLinearGradient(x, y, x + Math.cos(a) * h, y + Math.sin(a) * h);
      grad.addColorStop(0, "rgba(80,255,170,0.45)");
      grad.addColorStop(1, "rgba(190,90,255,0)");
      ctx.strokeStyle = grad;
      ctx.lineWidth = p.r * 0.05;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a) * h, y + Math.sin(a) * h);
      ctx.stroke();
    }
  }
}

function drawOneDome(x, y, angle, size, number, night) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle + Math.PI / 2);
  var s = size;

  ctx.fillStyle = "#4b5563";
  ctx.fillRect(-s * 1.1, 0, s * 2.2, s * 0.12);

  ctx.strokeStyle = "#9aa7b5";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(s * 1.35, 0);
  ctx.lineTo(s * 1.35, -s * 0.5);
  ctx.stroke();
  if (Math.sin(time * 0.08 + number) > 0) {
    ctx.fillStyle = "#ff4d4d";
    ctx.beginPath();
    ctx.arc(s * 1.35, -s * 0.52, 2, 0, PI2);
    ctx.fill();
  }

  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, s, Math.PI, 0);
  ctx.closePath();
  ctx.clip();

  var inside = ctx.createLinearGradient(0, -s, 0, 0);
  inside.addColorStop(0, "rgba(30,90,110,0.4)");
  inside.addColorStop(1, rgba(mix(90, 255, night), mix(160, 200, night), mix(150, 120, night), 0.5));
  ctx.fillStyle = inside;
  ctx.fillRect(-s, -s, s * 2, s);

  ctx.fillStyle = "#1c5a3a";
  ctx.beginPath();
  ctx.moveTo(-s, 0);
  ctx.quadraticCurveTo(-s * 0.4, -s * 0.3, 0, -s * 0.1);
  ctx.quadraticCurveTo(s * 0.5, 0, s, -s * 0.12);
  ctx.lineTo(s, 0);
  ctx.fill();

  var trees = 3 + Math.round(params.bio / 20);
  for (var i = 0; i < trees; i++) {
    var tx = -s * 0.8 + (i + 0.5) * (s * 1.6 / trees);
    var th = s * (0.5 + 0.1 * ((i + number) % 4));
    ctx.fillStyle = "#3a2a1c";
    ctx.fillRect(tx - 1, -s * 0.12, 2, s * 0.1);
    ctx.fillStyle = "rgb(" + Math.round(mix(40, 20, params.bio / 100)) + "," + Math.round(mix(110, 190, params.bio / 100)) + ",80)";
    for (var j = 0; j < 3; j++) {
      var w = th * (0.35 - j * 0.08);
      var ty = -s * 0.1 - th * (0.2 + j * 0.22);
      ctx.beginPath();
      ctx.moveTo(tx, ty - th * 0.3);
      ctx.lineTo(tx - w, ty);
      ctx.lineTo(tx + w, ty);
      ctx.fill();
    }
  }

  var flowers = Math.round(params.bio / 10);
  var flowerColors = ["#f472b6", "#fbbf24", "#a78bfa"];
  for (var f = 0; f < flowers; f++) {
    ctx.fillStyle = flowerColors[f % 3];
    ctx.beginPath();
    ctx.arc(-s * 0.85 + ((f * 37 + number * 11) % 100) / 100 * s * 1.7, -s * 0.05, s * 0.03, 0, PI2);
    ctx.fill();
  }

  if (night > 0.3) {
    ctx.fillStyle = "rgba(255,230,150," + night + ")";
    for (var q = 0; q < 4; q++) {
      ctx.beginPath();
      ctx.arc(-s * 0.6 + q * s * 0.4, -s * 0.55, 1.8, 0, PI2);
      ctx.fill();
    }
  }
  ctx.restore();

  ctx.strokeStyle = "rgba(180,255,235,0.9)";
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(0, 0, s, Math.PI, 0);
  ctx.stroke();

  ctx.strokeStyle = "rgba(190,255,240,0.25)";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.ellipse(0, 0, s * 0.5, s, 0, Math.PI, 0);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(0, 0, s, s * 0.5, 0, Math.PI, 0);
  ctx.stroke();

  ctx.strokeStyle = "rgba(255,255,255,0.6)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, s * 0.85, Math.PI * 1.15, Math.PI * 1.4);
  ctx.stroke();
  ctx.restore();
}

function drawDomes(p) {
  var count = Math.round(params.energy / 100 * 7);
  if (params.atmo > 10) count = count + 1;
  if (count > 8) count = 8;

  var list = [];
  var light = getSunAngle();
  for (var i = 0; i < domes.length; i++) {
    var d = domes[i];
    var wanted = 1;
    if (d.auto && d.number >= count) wanted = 0;
    d.grow = d.grow + (wanted - d.grow) * 0.06;
    if (d.grow > 0.02) {
      var angle = -Math.PI / 2 + d.angle;
      var size = p.r * (0.09 + 0.08 * (0.3 + params.atmo / 140)) * d.grow;
      var x = p.x + Math.cos(angle) * p.r * 0.99;
      var y = p.y + Math.sin(angle) * p.r * 0.99;
      var dark = -(Math.cos(angle) * Math.cos(light) + Math.sin(angle) * -0.4);
      list.push({ x: x, y: y, angle: angle, size: size, number: d.number, night: clamp(dark + 0.3, 0, 1) });
    }
  }
  list.sort(function (a, b) {
    return a.x - b.x;
  });

  ctx.lineWidth = 2;
  ctx.setLineDash([2, 12]);
  ctx.lineDashOffset = -time * (0.5 + params.energy / 40);
  ctx.strokeStyle = "rgba(150,255,255,0.9)";
  for (var k = 0; k < list.length - 1; k++) {
    var a = list[k];
    var b = list[k + 1];
    var mx = (a.x + b.x) / 2 + ((a.x + b.x) / 2 - p.x) * 0.06;
    var my = (a.y + b.y) / 2 + ((a.y + b.y) / 2 - p.y) * 0.06;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.quadraticCurveTo(mx, my, b.x, b.y);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  for (var n = 0; n < list.length; n++) {
    var dm = list[n];
    drawOneDome(dm.x, dm.y, dm.angle, dm.size, dm.number, dm.night);
  }
  return list.length;
}

function drawBots(p) {
  var wanted = 0;
  if (sw.nano) wanted = 44;
  while (bots.length < wanted) {
    bots.push({ a: rand(0, PI2), dist: rand(1.05, 1.4), speed: rand(0.003, 0.009), size: rand(1, 2.4), px: 0, py: 0 });
  }
  while (bots.length > wanted) {
    bots.pop();
  }
  for (var i = 0; i < bots.length; i++) {
    var b = bots[i];
    b.a = b.a + b.speed;
    var x = p.x + Math.cos(b.a) * p.r * b.dist;
    var y = p.y + Math.sin(b.a) * p.r * b.dist * 0.8;
    ctx.strokeStyle = "rgba(140,255,220,0.5)";
    ctx.lineWidth = b.size * 0.8;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - (x - b.px) * 5, y - (y - b.py) * 5);
    ctx.stroke();
    ctx.fillStyle = "#eafff8";
    ctx.beginPath();
    ctx.arc(x, y, b.size * 0.8, 0, PI2);
    ctx.fill();
    b.px = x;
    b.py = y;
  }
}

function spawnMeteor() {
  var p = getPlanet();
  var startX = rand(W * 0.1, W * 0.9);
  var targetX = p.x + rand(-p.r * 0.7, p.r * 0.7);
  var targetY = p.y + rand(-p.r * 0.3, p.r * 0.5);
  var dx = targetX - startX;
  var dy = targetY + 20;
  var len = Math.sqrt(dx * dx + dy * dy);
  meteors.push({ x: startX, y: -20, vx: dx / len * 10, vy: dy / len * 10, trail: [] });
  addLog("[WARN] Обнаружен метеорит! Щиты на максимум", "warn");
}

function drawMeteors(p) {
  for (var i = meteors.length - 1; i >= 0; i--) {
    var m = meteors[i];
    m.x = m.x + m.vx;
    m.y = m.y + m.vy;
    m.trail.push({ x: m.x, y: m.y });
    if (m.trail.length > 20) m.trail.shift();

    for (var t = 1; t < m.trail.length; t++) {
      var f = t / m.trail.length;
      ctx.strokeStyle = "rgba(255," + Math.round(120 + 100 * f) + ",70," + f * 0.6 + ")";
      ctx.lineWidth = 2 + 8 * f;
      ctx.beginPath();
      ctx.moveTo(m.trail[t - 1].x, m.trail[t - 1].y);
      ctx.lineTo(m.trail[t].x, m.trail[t].y);
      ctx.stroke();
    }
    drawGlow(m.x, m.y, 28, 255, 170, 90, 0.8);
    drawGlow(m.x, m.y, 8, 255, 255, 230, 1);

    var dx = m.x - p.x;
    var dy = m.y - p.y;
    if (Math.sqrt(dx * dx + dy * dy) < p.r * 0.96) {
      flash = 1;
      for (var s = 0; s < 40; s++) {
        sparks.push({ x: m.x, y: m.y, vx: rand(-4, 4), vy: rand(-5, 1), life: rand(30, 60) });
      }
      var width = p.r * 4;
      var offset = (rotation * width) % width;
      var u = ((dx + p.r + offset) % width) / width;
      var v = (dy + p.r) / (p.r * 2);
      craters.push({ u: u, v: v, size: rand(0.05, 0.1) });
      if (craters.length > 8) craters.shift();
      green = Math.max(0, green - 0.05);
      addLog("[WARN] Удар метеорита! Экосистема повреждена", "warn");
      achievement("meteor", "Звёздный гость");
      meteors.splice(i, 1);
    } else if (m.y > H + 50) {
      meteors.splice(i, 1);
    }
  }

  for (var j = sparks.length - 1; j >= 0; j--) {
    var sp = sparks[j];
    sp.x = sp.x + sp.vx;
    sp.y = sp.y + sp.vy;
    sp.vy = sp.vy + 0.08;
    sp.life = sp.life - 1;
    ctx.fillStyle = "rgba(255,190,110," + Math.min(1, sp.life / 30) + ")";
    ctx.fillRect(sp.x, sp.y, 2, 2);
    if (sp.life <= 0) sparks.splice(j, 1);
  }

  if (flash > 0.01) {
    ctx.fillStyle = "rgba(255,210,150," + flash * 0.3 + ")";
    ctx.fillRect(0, 0, W, H);
    flash = flash * 0.9;
  }
}

function drawStorm() {
  if (storm <= 0) return;
  while (dust.length < 120) {
    dust.push({ x: rand(0, W), y: rand(0, H), speed: rand(8, 20), len: rand(20, 60) });
  }
  var power = Math.min(1, storm * 2);
  ctx.fillStyle = "rgba(190,95,50," + 0.25 * power + ")";
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "rgba(245,175,115," + 0.4 * power + ")";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (var i = 0; i < dust.length; i++) {
    var d = dust[i];
    d.x = d.x - d.speed;
    if (d.x < -80) {
      d.x = W + 20;
      d.y = rand(0, H);
    }
    ctx.moveTo(d.x, d.y);
    ctx.lineTo(d.x + d.len, d.y + 2);
  }
  ctx.stroke();
  storm = storm - 0.0012;
  if (storm <= 0) {
    storm = 0;
    addLog("[OK] Буря утихла, панели очищены", "ok");
  }
}

var ranks = [
  [0, "Мёртвая пустошь"],
  [15, "Реголит и надежды"],
  [30, "Первые ростки"],
  [50, "Дыхание Марса"],
  [70, "Зелёный оазис"],
  [85, "Новая Земля"],
  [97, "Эдем"]
];

function updateHud(domeCount) {
  var index = Math.round(green * 100);
  document.getElementById("idx").textContent = index;
  document.getElementById("bar").style.width = index + "%";
  var rankName = ranks[0][1];
  for (var i = 0; i < ranks.length; i++) {
    if (index >= ranks[i][0]) rankName = ranks[i][1];
  }
  document.getElementById("rank").textContent = rankName;
  var temperature = Math.round(-63 + params.temp * 0.9 + green * 10);
  document.getElementById("mTemp").textContent = temperature + " °C";
  document.getElementById("mO2").textContent = (params.atmo * 0.21).toFixed(1) + "%";
  document.getElementById("mWater").textContent = params.water + "%";
  document.getElementById("mDomes").textContent = domeCount;
  document.getElementById("clock").textContent = "Сол " + (1 + Math.floor(time / 600));
  if (index >= 25) achievement("i25", "Первый росток");
  if (index >= 50) achievement("i50", "Дыхание Марса");
  if (index >= 75) achievement("i75", "Зелёная планета");
  if (index >= 95) achievement("i95", "Эдем достигнут!");
}

var domeCountShown = 0;

function draw() {
  var p = getPlanet();
  var sun = getSunPosition(p);
  ctx.clearRect(0, 0, W, H);
  drawBackground();
  drawSun(sun);
  drawMoon(p, false);
  drawMagnetField(p);
  drawPlanet(p);
  domeCountShown = drawDomes(p);
  drawAurora(p);
  drawMoon(p, true);
  drawBots(p);
  drawMeteors(p);
  drawStorm();
}

function loop() {
  if (sw.auto) {
    time = time + 1;
  } else {
    time = time + 0.15;
  }
  rotation = rotation + 0.0018 * (0.3 + params.speed / 50);
  green = green + (targetGreen() - green) * 0.03;
  if (Math.random() < 0.0006) spawnMeteor();
  draw();
  if (Math.floor(time) % 8 == 0) updateHud(domeCountShown);
  requestAnimationFrame(loop);
}

function paramMessage(name) {
  var v = params[name];
  if (name == "atmo") {
    if (v > 60) addLog("[OK] Баланс атмосферы смещён в сторону кислорода", "ok");
    else if (v < 25) addLog("[WARN] Высокий уровень CO2 под куполом", "warn");
    else addLog("[INFO] Состав атмосферы скорректирован", "info");
  }
  if (name == "energy") {
    if (v > 60) addLog("[OK] Корневая система получает энергию от солнечных батарей", "ok");
    else addLog("[INFO] Энергопоток перераспределён", "info");
  }
  if (name == "water") {
    if (v > 60) addLog("[OK] Подлёдные резервуары вскрыты: появляются озёра", "ok");
    else addLog("[INFO] Расход воды изменён", "info");
  }
  if (name == "temp") {
    if (v > 85) addLog("[WARN] Перегрев теплового щита", "warn");
    else if (v < 30) addLog("[WARN] Купол промерзает", "warn");
    else addLog("[OK] Температура в комфортном диапазоне", "ok");
  }
  if (name == "bio") {
    if (v > 60) addLog("[OK] Новые виды хвойных и цветов прижились", "ok");
    else addLog("[INFO] Банк семян обновлён", "info");
  }
  if (name == "speed") {
    addLog("[INFO] Темп времени изменён", "info");
  }
}

function connectSlider(name) {
  var input = document.getElementById(name);
  var output = document.getElementById(name + "Out");
  input.oninput = function () {
    params[name] = Number(input.value);
    output.textContent = params[name] + "%";
  };
  input.onchange = function () {
    paramMessage(name);
  };
}

function setParams(values) {
  for (var i = 0; i < paramNames.length; i++) {
    var name = paramNames[i];
    if (values[name] != undefined) {
      params[name] = values[name];
      document.getElementById(name).value = values[name];
      document.getElementById(name + "Out").textContent = values[name] + "%";
    }
  }
}

function connectToggle(name) {
  var button = document.getElementById(name);
  button.onclick = function () {
    sw[name] = !sw[name];
    button.setAttribute("aria-pressed", sw[name]);
    if (sw[name]) {
      button.querySelector("b").textContent = "ВКЛ";
    } else {
      button.querySelector("b").textContent = "ВЫКЛ";
    }
    if (name == "nano") {
      if (sw.nano) addLog("[OK] Нано-боты запущены: очистка грунта от перхлоратов", "ok");
      else addLog("[WARN] Нано-боты остановлены", "warn");
    }
    if (name == "magnet") {
      if (sw.magnet) addLog("[OK] Магнитосфера активна: над полюсом сияет аврора", "ok");
      else addLog("[WARN] Магнитное поле отключено", "warn");
    }
    if (name == "rain") {
      if (sw.rain) addLog("[OK] Дождевание запущено", "ok");
      else addLog("[INFO] Дождевание остановлено", "info");
    }
    if (name == "auto") {
      addLog("[INFO] Смена дня и ночи переключена", "info");
    }
  };
}

for (var s = 0; s < paramNames.length; s++) {
  connectSlider(paramNames[s]);
}
for (var t = 0; t < swNames.length; t++) {
  connectToggle(swNames[t]);
}

document.getElementById("bMeteor").onclick = spawnMeteor;

document.getElementById("bStorm").onclick = function () {
  storm = 1;
  addLog("[WARN] Приближается пылевая буря!", "warn");
  achievement("storm", "Пережил бурю");
};

document.getElementById("bRand").onclick = function () {
  setParams({
    atmo: Math.floor(rand(0, 100)),
    energy: Math.floor(rand(0, 100)),
    water: Math.floor(rand(0, 100)),
    temp: Math.floor(rand(20, 80)),
    bio: Math.floor(rand(0, 100))
  });
  addLog("[INFO] Параметры сгенерированы случайно", "info");
};

document.getElementById("pMars").onclick = function () {
  setParams({ atmo: 5, energy: 15, water: 5, temp: 20, bio: 0 });
  addLog("[INFO] Загружен сценарий Марс", "info");
};

document.getElementById("pTerra").onclick = function () {
  setParams({ atmo: 50, energy: 55, water: 45, temp: 55, bio: 35 });
  addLog("[INFO] Загружен сценарий Терраформ", "info");
};

document.getElementById("pEden").onclick = function () {
  setParams({ atmo: 90, energy: 85, water: 80, temp: 65, bio: 90 });
  addLog("[INFO] Загружен сценарий Эдем", "info");
};

canvas.onclick = function (e) {
  var box = canvas.getBoundingClientRect();
  var p = getPlanet();
  var dx = e.clientX - box.left - p.x;
  var dy = e.clientY - box.top - p.y;
  if (Math.sqrt(dx * dx + dy * dy) > p.r * 1.25) return;
  if (domes.length >= 14) {
    addLog("[WARN] Достигнут лимит куполов", "warn");
    return;
  }
  var angle = clamp(Math.atan2(dy, dx) + Math.PI / 2, -1.45, 1.45);
  domes.push({ angle: angle, grow: 0, auto: false, number: domes.length });
  addLog("[OK] Построен новый биокупол вручную", "ok");
  achievement("build", "Первый строитель");
};

window.onresize = resize;

resize();
addLog("[INFO] Инициализация EcoSphere: Mars & Forest...", "info");
addLog("[OK] Соединение с биокуполом установлено", "ok");

setInterval(function () {
  var item = randomLogs[Math.floor(Math.random() * randomLogs.length)];
  addLog(item[1], item[0]);
}, 5000);

loop();
