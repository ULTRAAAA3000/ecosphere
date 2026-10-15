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
var puffs = [];
var shuttles = [];
var domeList = [];
var comet = null;
var flare = { t: 0, wave: 0, hit: true };
var quake = 0;
var blackout = 0;
var auroraBoost = 0;
for (var sh = 0; sh < 3; sh++) {
  shuttles.push({ from: 0, to: 1, t: sh / 3, speed: 0.003 + sh * 0.0012, trail: [] });
}

var domeAngles = [-0.5, 0.22, -0.12, 0.62, -0.82, 0.9, 0.4, -0.32];
for (var i = 0; i < domeAngles.length; i++) {
  domes.push({ angle: domeAngles[i], grow: 0, auto: true, number: i });
}

var randomLogs = [
  ["ok", "[OK] Коренева система хвойних успішно адаптована до марсіанського ґрунту"],
  ["info", "[INFO] Моніторинг вологості під біокуполом: стабільно"],
  ["ok", "[OK] Мікориза зв'язала перхлоратні шари з кореневою мережею"],
  ["warn", "[WARN] Пилова буря в секторі 7: сонячні панелі на 80%"],
  ["info", "[INFO] Фотосинтез: рівень O2 зростає"],
  ["ok", "[OK] Перші мохи закріпилися на реголіті"],
  ["info", "[INFO] Сигнал із Землі прийнято: затримка 12 хв"],
  ["info", "[INFO] Супутник зв'язку: затримка 12 хв, канал стабільний"]
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
  toast.textContent = "Досягнення: " + text;
  toast.className = "show";
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () {
    toast.className = "";
  }, 3000);
  addLog("[OK] Досягнення: " + text, "ok");
}

var TEX_W = 512;
var TEX_H = 256;
var noiseSizes = [8, 16, 32, 64, 128];
var noiseAlpha = [1, 0.35, 0.2, 0.12, 0.07];

function makeNoise() {
  var out = document.createElement("canvas");
  out.width = TEX_W;
  out.height = TEX_H;
  var t = out.getContext("2d");
  t.fillStyle = "#808080";
  t.fillRect(0, 0, TEX_W, TEX_H);
  for (var i = 0; i < noiseSizes.length; i++) {
    var n = noiseSizes[i];
    var rows = n / 2;
    var small = document.createElement("canvas");
    small.width = n + 1;
    small.height = rows + 1;
    var sc = small.getContext("2d");
    var firstColumn = [];
    for (var x = 0; x <= n; x++) {
      for (var y = 0; y <= rows; y++) {
        var v = Math.random();
        if (x == 0) firstColumn[y] = v;
        if (x == n) v = firstColumn[y];
        var gray = Math.floor(v * 255);
        sc.fillStyle = "rgb(" + gray + "," + gray + "," + gray + ")";
        sc.fillRect(x, y, 1, 1);
      }
    }
    var scaleX = TEX_W / n;
    var scaleY = TEX_H / rows;
    t.globalAlpha = noiseAlpha[i];
    t.drawImage(small, -scaleX / 2, -scaleY / 2, (n + 1) * scaleX, (rows + 1) * scaleY);
  }
  t.globalAlpha = 1;
  return out;
}

function readHeights(canvas) {
  var data = canvas.getContext("2d").getImageData(0, 0, TEX_W, TEX_H).data;
  var list = [];
  var min = 255;
  var max = 0;
  for (var i = 0; i < TEX_W * TEX_H; i++) {
    var v = data[i * 4];
    list.push(v);
    if (v < min) min = v;
    if (v > max) max = v;
  }
  for (var j = 0; j < list.length; j++) {
    list[j] = (list[j] - min) / (max - min);
  }
  return list;
}

function buildTexture(colorFunction) {
  var c = document.createElement("canvas");
  c.width = TEX_W;
  c.height = TEX_H;
  var t = c.getContext("2d");
  var img = t.createImageData(TEX_W, TEX_H);
  for (var y = 0; y < TEX_H; y++) {
    for (var x = 0; x < TEX_W; x++) {
      var i = y * TEX_W + x;
      var color = colorFunction(i, x, y);
      img.data[i * 4] = color[0];
      img.data[i * 4 + 1] = color[1];
      img.data[i * 4 + 2] = color[2];
      img.data[i * 4 + 3] = color[3];
    }
  }
  t.putImageData(img, 0, 0);
  return c;
}

var heights = readHeights(makeNoise());
var plants = readHeights(makeNoise());
var cloudsMap = readHeights(makeNoise());

var landTexture = buildTexture(function (i, x, y) {
  var h = heights[i];
  var left = heights[y * TEX_W + (x + TEX_W - 9) % TEX_W];
  var light = 1 + (h - left) * 1.6;
  var r = 0;
  var g = 0;
  var b = 0;
  if (h < 0.5) {
    r = mix(95, 176, h * 2);
    g = mix(40, 86, h * 2);
    b = mix(26, 50, h * 2);
  } else {
    r = mix(176, 218, (h - 0.5) * 2);
    g = mix(86, 150, (h - 0.5) * 2);
    b = mix(50, 100, (h - 0.5) * 2);
  }
  return [clamp(r * light, 0, 255), clamp(g * light, 0, 255), clamp(b * light, 0, 255), 255];
});

function makeSea(level) {
  return buildTexture(function (i) {
    var h = heights[i];
    var depth = clamp((level - h) / level, 0, 1);
    var alpha = clamp((level - h) * 40, 0, 1) * 255;
    return [mix(55, 8, depth), mix(135, 38, depth), mix(185, 100, depth), alpha];
  });
}

function makeGreen(level) {
  return buildTexture(function (i) {
    var v = plants[i];
    var alpha = clamp((v - level) * 30, 0, 1) * 255;
    var k = clamp((v - level) * 2, 0, 1);
    var light = 0.75 + (heights[i] - 0.5) * 0.6;
    return [mix(18, 70, k) * light, mix(105, 195, k) * light, mix(58, 95, k) * light, alpha];
  });
}

var seaTextures = [makeSea(0.36), makeSea(0.45), makeSea(0.54)];
var greenTextures = [makeGreen(0.62), makeGreen(0.5), makeGreen(0.38)];

var cloudTexture = buildTexture(function (i) {
  var alpha = clamp((cloudsMap[i] - 0.5) * 3, 0, 1) * 220;
  return [255, 255, 255, alpha];
});

function resize() {
  var box = canvas.getBoundingClientRect();
  canvas.width = box.width;
  canvas.height = box.height;
  W = canvas.width;
  H = canvas.height;
  nebula = null;
  stars = [];
  for (var i = 0; i < 160; i++) {
    stars.push({ x: rand(0, W), y: rand(0, H), size: rand(0.4, 1.7), phase: rand(0, 6), color: starColors[Math.floor(Math.random() * starColors.length)] });
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

var nebula = null;
var shooters = [];
var starColors = ["255,255,255", "200,225,255", "255,230,200", "255,210,210"];

function makeNebula() {
  nebula = document.createElement("canvas");
  nebula.width = W;
  nebula.height = H;
  var t = nebula.getContext("2d");
  var colors = [[150, 50, 170], [40, 120, 210], [210, 70, 130], [30, 170, 150]];
  t.globalCompositeOperation = "lighter";
  for (var i = 0; i < 50; i++) {
    var f = i / 49;
    var x = W * (-0.1 + 1.2 * f) + rand(-W * 0.08, W * 0.08);
    var y = H * (0.8 - 0.65 * f) + rand(-H * 0.15, H * 0.15);
    var r = rand(W * 0.1, W * 0.26);
    var c = colors[Math.floor(Math.random() * colors.length)];
    var grad = t.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, rgba(c[0], c[1], c[2], rand(0.05, 0.11)));
    grad.addColorStop(1, rgba(c[0], c[1], c[2], 0));
    t.fillStyle = grad;
    t.fillRect(x - r, y - r, r * 2, r * 2);
  }
  for (var j = 0; j < 1400; j++) {
    var sx = rand(0, W);
    var spread = (Math.random() + Math.random() + Math.random()) / 3 - 0.5;
    var sy = H * (0.8 - 0.65 * sx / W) + spread * H * 0.7;
    t.fillStyle = "rgba(220,230,255," + rand(0.15, 0.6) + ")";
    t.fillRect(sx, sy, 1, 1);
  }
}

function drawStars() {
  for (var i = 0; i < stars.length; i++) {
    var s = stars[i];
    var alpha = 0.4 + 0.6 * Math.abs(Math.sin(time * 0.02 + s.phase));
    var x = (s.x + time * 0.03 * s.size) % W;
    ctx.fillStyle = "rgba(" + s.color + "," + alpha + ")";
    ctx.beginPath();
    ctx.arc(x, s.y, s.size, 0, PI2);
    ctx.fill();
    if (s.size > 1.4) {
      ctx.fillRect(x - s.size * 4, s.y - 0.4, s.size * 8, 0.8);
      ctx.fillRect(x - 0.4, s.y - s.size * 4, 0.8, s.size * 8);
    }
  }
  if (Math.random() < 0.004) {
    shooters.push({ x: rand(0, W * 0.8), y: rand(0, H * 0.4), life: 0 });
  }
  for (var k = shooters.length - 1; k >= 0; k--) {
    var sh = shooters[k];
    sh.life = sh.life + 1;
    sh.x = sh.x + 14;
    sh.y = sh.y + 6;
    var grad = ctx.createLinearGradient(sh.x, sh.y, sh.x - 80, sh.y - 34);
    grad.addColorStop(0, "rgba(255,255,255,0.9)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.strokeStyle = grad;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(sh.x, sh.y);
    ctx.lineTo(sh.x - 80, sh.y - 34);
    ctx.stroke();
    if (sh.life > 30) shooters.splice(k, 1);
  }
}

function drawBackground() {
  if (nebula == null) makeNebula();
  ctx.drawImage(nebula, 0, 0);
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
  var f = 0;
  if (flare.t > 0) f = flare.t;
  drawGlow(sun.x, sun.y, 220 + 260 * f, 255, 150 + 60 * f, 80 + 60 * f, 0.2 + 0.4 * f);
  drawGlow(sun.x, sun.y, 90 + 90 * f, 255, 200, 130, 0.5 + 0.3 * f);
  ctx.strokeStyle = "rgba(255,230,180," + (0.25 + 0.4 * f) + ")";
  ctx.lineWidth = 2 + 3 * f;
  for (var i = 0; i < 12; i++) {
    var a = i * (PI2 / 12) + time * 0.002;
    ctx.beginPath();
    ctx.moveTo(sun.x + Math.cos(a) * 30, sun.y + Math.sin(a) * 30);
    ctx.lineTo(sun.x + Math.cos(a) * (110 + 160 * f), sun.y + Math.sin(a) * (110 + 160 * f));
    ctx.stroke();
  }
  drawGlow(sun.x, sun.y, 28 + 20 * f, 255, 255, 240, 1);
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
  drawLayer(greenTextures[0], p, offset, clamp(green * 3, 0, 1));
  drawLayer(greenTextures[1], p, offset, clamp(green * 3 - 1, 0, 1));
  drawLayer(greenTextures[2], p, offset, clamp(green * 3 - 2, 0, 1));
  drawLayer(seaTextures[0], p, offset, clamp(params.water / 33, 0, 1));
  drawLayer(seaTextures[1], p, offset, clamp((params.water - 33) / 33, 0, 1));
  drawLayer(seaTextures[2], p, offset, clamp((params.water - 66) / 34, 0, 1));

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

  drawLayer(cloudTexture, p, cloudOffset, 0.25 + params.water / 200);

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
  var shade = ctx.createRadialGradient(p.x + lx * p.r, p.y - p.r * 0.3, p.r * 0.1, p.x, p.y, p.r * 1.2);
  shade.addColorStop(0, "rgba(0,0,0,0)");
  shade.addColorStop(0.5, "rgba(4,6,16,0.2)");
  shade.addColorStop(0.85, "rgba(3,4,12,0.6)");
  shade.addColorStop(1, "rgba(2,3,10,0.92)");
  ctx.fillStyle = shade;
  ctx.fillRect(p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
  var limb = ctx.createRadialGradient(p.x, p.y, p.r * 0.6, p.x, p.y, p.r);
  limb.addColorStop(0, "rgba(0,0,0,0)");
  limb.addColorStop(1, "rgba(0,10,20,0.55)");
  ctx.fillStyle = limb;
  ctx.fillRect(p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
  ctx.restore();
}

function drawMagnetField(p, sun) {
  if (!sw.magnet) return;
  var sunAngle = Math.atan2(sun.y - p.y, sun.x - p.x);
  var sunSide = Math.cos(sunAngle);
  var shells = [1.5, 1.9, 2.4, 3.0];
  var colors = [[120, 255, 220], [100, 220, 255], [130, 170, 255], [180, 140, 255]];

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";

  for (var i = 0; i < shells.length; i++) {
    var L = shells[i];
    var c = colors[i];
    var start = Math.asin(Math.sqrt(1 / L)) + 0.02;
    for (var side = -1; side <= 1; side += 2) {
      var stretch = 1 - 0.3 * side * sunSide;
      var points = [];
      for (var th = start; th < Math.PI - start; th += 0.05) {
        var r = L * Math.sin(th) * Math.sin(th) * p.r;
        points.push({ x: p.x + side * stretch * r * Math.sin(th), y: p.y - r * Math.cos(th) });
      }

      ctx.strokeStyle = rgba(c[0], c[1], c[2], 0.07);
      ctx.lineWidth = 6;
      ctx.beginPath();
      for (var a = 0; a < points.length; a++) {
        if (a == 0) ctx.moveTo(points[a].x, points[a].y);
        else ctx.lineTo(points[a].x, points[a].y);
      }
      ctx.stroke();

      ctx.strokeStyle = rgba(c[0], c[1], c[2], 0.35);
      ctx.lineWidth = 1.2;
      ctx.stroke();

      for (var q = 0; q < 4; q++) {
        var f = (time * 0.003 * (1 + i * 0.15) + q / 4 + i * 0.13) % 1;
        if (side == 1) f = 1 - f;
        var index = Math.floor(f * (points.length - 1));
        for (var tail = 0; tail < 6; tail++) {
          var ti = index - tail * (side == 1 ? -1 : 1);
          if (ti < 0 || ti >= points.length) continue;
          drawGlow(points[ti].x, points[ti].y, 5 - tail * 0.6, c[0], c[1], c[2], 0.7 - tail * 0.1);
        }
      }
    }
  }

  for (var k = 0; k < 3; k++) {
    var phase = (time * 0.004 + k / 3) % 1;
    var radius = p.r * (3.3 - phase * 1.9);
    var alpha = Math.sin(phase * Math.PI) * 0.5;
    ctx.strokeStyle = rgba(150, 210, 255, alpha);
    ctx.lineWidth = 2 + (1 - phase) * 2;
    ctx.beginPath();
    for (var w = -0.85; w <= 0.85; w += 0.04) {
      var wave = Math.sin(w * 18 + time * 0.06) * 3;
      var px = p.x + Math.cos(sunAngle + w) * (radius + wave);
      var py = p.y + Math.sin(sunAngle + w) * (radius + wave);
      if (w < -0.84) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
  ctx.restore();
}

function drawAurora(p) {
  if (!sw.magnet) return;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (var pole = -1; pole <= 1; pole += 2) {
    var base = pole * Math.PI / 2;
    var outer = [];
    var inner = [];
    for (var i = 0; i <= 60; i++) {
      var a = base + (i / 60 - 0.5) * 1.5;
      var h = (1 + auroraBoost * 0.8) * p.r * (0.06 + 0.16 * Math.abs(Math.sin(i * 0.35 + time * 0.03)) * (0.6 + 0.4 * Math.sin(i * 0.15 - time * 0.02)));
      outer.push({ x: p.x + Math.cos(a) * (p.r + h), y: p.y + Math.sin(a) * (p.r + h), a: a });
      inner.push({ x: p.x + Math.cos(a) * p.r * 0.995, y: p.y + Math.sin(a) * p.r * 0.995 });
    }
    var grad = ctx.createRadialGradient(p.x, p.y, p.r, p.x, p.y, p.r * 1.25);
    grad.addColorStop(0, rgba(80, 255, 170, Math.min(1, 0.75 + auroraBoost * 0.25)));
    grad.addColorStop(0.5, "rgba(60,200,220,0.35)");
    grad.addColorStop(1, "rgba(170,90,255,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(inner[0].x, inner[0].y);
    for (var j = 1; j < inner.length; j++) ctx.lineTo(inner[j].x, inner[j].y);
    for (var k = outer.length - 1; k >= 0; k--) ctx.lineTo(outer[k].x, outer[k].y);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "rgba(160,255,210,0.18)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (var m = 0; m < outer.length; m = m + 2) {
      ctx.moveTo(inner[m].x, inner[m].y);
      ctx.lineTo(outer[m].x, outer[m].y);
    }
    ctx.stroke();
  }
  ctx.restore();
}

function drawFir(x, baseY, h, number, bio, dark) {
  var sway = Math.sin(time * 0.03 + number * 1.7 + x * 0.1) * h * 0.05;
  var green = mix(0, 1, bio / 100);
  var r = Math.round(mix(30, 22, green) * dark);
  var g = Math.round(mix(105, 175, green) * dark);
  var b = Math.round(mix(70, 95, green) * dark);
  var colorDark = "rgb(" + Math.round(r * 0.55) + "," + Math.round(g * 0.55) + "," + Math.round(b * 0.6) + ")";
  var colorLight = "rgb(" + Math.min(255, Math.round(r * 1.25)) + "," + Math.min(255, Math.round(g * 1.25)) + "," + Math.min(255, Math.round(b * 1.2)) + ")";

  ctx.fillStyle = "#3a2a1c";
  ctx.fillRect(x - h * 0.025, baseY - h * 0.1, h * 0.05, h * 0.1);

  var tiers = 5;
  for (var t = 0; t < tiers; t++) {
    var top = baseY - h + t * h * 0.17;
    var bottom = top + h * 0.34;
    var width = h * (0.1 + 0.075 * t);
    var dx = sway * (1 - t / tiers);
    var apexX = x + dx;
    var bottomX = x + dx * 0.4;

    var zig = [];
    for (var k = 0; k <= 6; k++) {
      var zx = bottomX + width - (k / 6) * width * 2;
      var zy = bottom;
      if (k % 2 == 1) zy = bottom - h * 0.045;
      zig.push({ x: zx, y: zy });
    }

    ctx.fillStyle = colorDark;
    ctx.beginPath();
    ctx.moveTo(apexX, top);
    for (var a = 0; a < zig.length; a++) ctx.lineTo(zig[a].x, zig[a].y);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = colorLight;
    ctx.beginPath();
    ctx.moveTo(apexX, top);
    for (var c = 0; c <= 3; c++) ctx.lineTo(zig[c].x, zig[c].y);
    ctx.lineTo(apexX, bottom - h * 0.02);
    ctx.closePath();
    ctx.fill();
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

  var trees = 2 + Math.round(params.bio / 35);
  for (var row = 0; row < 2; row++) {
    for (var i = 0; i < trees; i++) {
      var tx = -s * 0.8 + (i + 0.5 + row * 0.5) * (s * 1.6 / trees);
      var th = s * (0.55 + 0.12 * ((i + number + row) % 4));
      if (row == 0) {
        drawFir(tx, -s * 0.06, th * 0.8, i + number, params.bio, 0.6);
      } else {
        drawFir(tx, -s * 0.02, th, i + number + 7, params.bio, 1);
      }
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

  for (var q = 0; q < 5; q++) {
    var fx = Math.sin(time * 0.01 * (q + 1) + number * 3 + q) * s * 0.7;
    var fy = -s * (0.3 + 0.25 * Math.sin(time * 0.013 * (q + 2) + q));
    var fa = 0.4 + 0.6 * Math.abs(Math.sin(time * 0.05 + q));
    drawGlow(fx, fy, 5, 255, 240, 120, fa * (0.3 + night * 0.7));
  }

  if (params.bio > 30) {
    var bx = ((time * 0.6 + number * 40) % (s * 2.6)) - s * 1.3;
    var by = -s * 0.7 + Math.sin(time * 0.08) * s * 0.05;
    var wing = Math.sin(time * 0.3) * s * 0.05;
    var bs = s * 0.06;
    ctx.strokeStyle = "#16302a";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(bx - bs * 2, by + wing);
    ctx.lineTo(bx, by);
    ctx.lineTo(bx + bs * 2, by + wing);
    ctx.stroke();
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

  if (blackout > 0) {
    ctx.fillStyle = "rgba(0,0,10," + blackout * (0.35 + 0.3 * Math.random()) + ")";
    ctx.beginPath();
    ctx.arc(0, 0, s, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
  }

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
      var size = p.r * (0.105 + 0.08 * (0.3 + params.atmo / 140)) * d.grow;
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
    if (blackout > 0.2 && Math.random() < blackout * 0.7) continue;
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
    var shakeX = rand(-1, 1) * quake * 3;
    var shakeY = rand(-1, 1) * quake * 3;
    drawOneDome(dm.x + shakeX, dm.y + shakeY, dm.angle, dm.size, dm.number, dm.night);
  }
  domeList = list;
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
  addLog("[WARN] Виявлено метеорит! Щити на максимум", "warn");
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
      addLog("[WARN] Удар метеорита! Екосистему пошкоджено", "warn");
      achievement("meteor", "Зоряний гість");
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
    addLog("[OK] Буря вщухла, панелі очищено", "ok");
  }
}

var ranks = [
  [0, "Мертва пустка"],
  [15, "Реголіт і надії"],
  [30, "Перші паростки"],
  [50, "Подих Марса"],
  [70, "Зелений оазис"],
  [85, "Нова Земля"],
  [97, "Едем"]
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
  if (index >= 25) achievement("i25", "Перший росток");
  if (index >= 50) achievement("i50", "Подих Марса");
  if (index >= 75) achievement("i75", "Зелена планета");
  if (index >= 95) achievement("i95", "Едем досягнуто!");
}

var domeCountShown = 0;

function startFlare() {
  if (flare.t > 0) return;
  flare.t = 1;
  flare.wave = 0;
  flare.hit = false;
  addLog("[WARN] Сонячний спалах! Викид плазми прямує до планети", "warn");
}

function drawFlare(p, sun) {
  if (flare.t <= 0) return;
  flare.t = flare.t - 0.003;
  flare.wave = flare.wave + 7;
  var dx = p.x - sun.x;
  var dy = p.y - sun.y;
  var dist = Math.sqrt(dx * dx + dy * dy);
  var direction = Math.atan2(dy, dx);

  if (flare.wave < dist + p.r) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (var i = 0; i < 3; i++) {
      var radius = flare.wave - i * 14;
      if (radius <= 0) continue;
      ctx.strokeStyle = rgba(255, 190 - i * 30, 90, 0.55 - i * 0.15);
      ctx.lineWidth = 9 - i * 2.5;
      ctx.beginPath();
      ctx.arc(sun.x, sun.y, radius, direction - 0.6, direction + 0.6);
      ctx.stroke();
    }
    ctx.restore();
  }

  if (!flare.hit && flare.wave >= dist - p.r) {
    flare.hit = true;
    flash = 0.6;
    if (sw.magnet) {
      auroraBoost = 1;
      addLog("[OK] Магнітне поле відбило викид плазми, сяйво посилилось", "ok");
      achievement("shield", "Магнітний щит");
    } else {
      blackout = 1;
      green = Math.max(0, green - 0.04);
      addLog("[WARN] Викид плазми! Енергомережу вимкнено, купола на резервному живленні", "warn");
      achievement("flare", "Пережив спалах");
    }
  }
}

function startQuake() {
  if (quake > 0) return;
  quake = 1;
  var magnitude = (4 + Math.random() * 2.5).toFixed(1);
  green = Math.max(0, green - 0.03);
  for (var i = 0; i < domeList.length; i++) {
    for (var k = 0; k < 6; k++) {
      puffs.push({ x: domeList[i].x + rand(-12, 12), y: domeList[i].y, vx: rand(-0.6, 0.6), vy: rand(-1.2, -0.3), life: rand(50, 90), size: rand(3, 8) });
    }
  }
  addLog("[WARN] Землетрус магнітудою " + magnitude + "! Купола витримали", "warn");
  achievement("quake", "Тверда земля");
}

function drawQuakePuffs() {
  for (var i = puffs.length - 1; i >= 0; i--) {
    var q = puffs[i];
    q.x = q.x + q.vx;
    q.y = q.y + q.vy;
    q.size = q.size + 0.08;
    q.life = q.life - 1;
    ctx.fillStyle = "rgba(150,110,80," + Math.max(0, q.life / 150) + ")";
    ctx.beginPath();
    ctx.arc(q.x, q.y, q.size, 0, PI2);
    ctx.fill();
    if (q.life <= 0) puffs.splice(i, 1);
  }
}

function spawnComet() {
  if (comet != null) return;
  comet = { x: -120, y: rand(H * 0.1, H * 0.3), vx: rand(2.2, 3), vy: rand(0.2, 0.6) };
  addLog("[INFO] Виявлено комету! Курс повз планету", "info");
  achievement("comet", "Небесний гість");
}

function drawComet(sun) {
  if (comet == null) return;
  comet.x = comet.x + comet.vx;
  comet.y = comet.y + comet.vy;
  var tx = comet.x - sun.x;
  var ty = comet.y - sun.y;
  var len = Math.sqrt(tx * tx + ty * ty);
  tx = tx / len;
  ty = ty / len;
  var px = -ty;
  var py = tx;

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";

  var ion = ctx.createLinearGradient(comet.x, comet.y, comet.x + tx * 300, comet.y + ty * 300);
  ion.addColorStop(0, "rgba(120,200,255,0.7)");
  ion.addColorStop(1, "rgba(120,200,255,0)");
  ctx.strokeStyle = ion;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(comet.x, comet.y);
  ctx.lineTo(comet.x + tx * 300, comet.y + ty * 300);
  ctx.stroke();

  var dust = ctx.createLinearGradient(comet.x, comet.y, comet.x + tx * 220 + px * 80, comet.y + ty * 220 + py * 80);
  dust.addColorStop(0, "rgba(255,220,160,0.5)");
  dust.addColorStop(1, "rgba(255,200,120,0)");
  ctx.strokeStyle = dust;
  ctx.lineWidth = 16;
  ctx.beginPath();
  ctx.moveTo(comet.x, comet.y);
  ctx.quadraticCurveTo(comet.x + tx * 110 + px * 15, comet.y + ty * 110 + py * 15, comet.x + tx * 220 + px * 80, comet.y + ty * 220 + py * 80);
  ctx.stroke();

  for (var i = 0; i < 12; i++) {
    var f = Math.random();
    ctx.fillStyle = "rgba(255,235,200," + (1 - f) * 0.8 + ")";
    ctx.fillRect(comet.x + tx * f * 220 + px * f * f * 80 + rand(-6, 6), comet.y + ty * f * 220 + py * f * f * 80 + rand(-6, 6), 1.5, 1.5);
  }

  drawGlow(comet.x, comet.y, 34, 190, 225, 255, 0.8);
  drawGlow(comet.x, comet.y, 10, 255, 255, 255, 1);
  ctx.restore();

  if (comet.x > W + 350 || comet.y > H + 100) comet = null;
}

function drawEarth(sun) {
  var r = Math.min(W, H) * 0.045;
  var x = W * 0.11 + Math.sin(time * 0.002) * 6;
  var y = H * 0.74 + Math.cos(time * 0.0017) * 5;
  drawGlow(x, y, r * 2.2, 90, 160, 255, 0.35);

  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, PI2);
  ctx.clip();
  var ocean = ctx.createLinearGradient(x, y - r, x, y + r);
  ocean.addColorStop(0, "#2d7fd1");
  ocean.addColorStop(1, "#123a7a");
  ctx.fillStyle = ocean;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);

  for (var k = 0; k < 5; k++) {
    var a = k * 1.3 + time * 0.003;
    var c = Math.cos(a);
    if (c < -0.2) continue;
    ctx.fillStyle = k % 2 == 0 ? "#3f9b4f" : "#9a8a4a";
    ctx.beginPath();
    ctx.ellipse(x + Math.sin(a) * r * 0.8, y + ((k % 3) - 1) * r * 0.45, r * (0.18 + 0.2 * Math.max(0, c)), r * 0.3, 0, 0, PI2);
    ctx.fill();
  }

  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.beginPath();
  ctx.ellipse(x, y - r, r * 0.6, r * 0.2, 0, 0, PI2);
  ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,0.45)";
  for (var c2 = 0; c2 < 4; c2++) {
    var ca = c2 * 1.7 + time * 0.005;
    if (Math.cos(ca) < -0.1) continue;
    ctx.beginPath();
    ctx.ellipse(x + Math.sin(ca) * r * 0.7, y + (c2 - 1.5) * r * 0.35, r * 0.3, r * 0.08, 0, 0, PI2);
    ctx.fill();
  }

  var lx = sun.x - x;
  var ly = sun.y - y;
  var ll = Math.sqrt(lx * lx + ly * ly);
  var shade = ctx.createRadialGradient(x + lx / ll * r * 0.5, y + ly / ll * r * 0.5, r * 0.2, x, y, r * 1.15);
  shade.addColorStop(0, "rgba(0,0,0,0)");
  shade.addColorStop(1, "rgba(2,4,14,0.85)");
  ctx.fillStyle = shade;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.restore();

  ctx.strokeStyle = "rgba(140,200,255,0.5)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, PI2);
  ctx.stroke();

  ctx.fillStyle = "rgba(200,225,255,0.8)";
  ctx.font = "12px Arial";
  ctx.textAlign = "center";
  ctx.fillText("Земля", x, y + r + 18);
}

function drawShuttles(p) {
  if (domeList.length < 2) return;
  for (var i = 0; i < shuttles.length; i++) {
    var s = shuttles[i];
    if (s.from >= domeList.length || s.to >= domeList.length || s.from == s.to) {
      s.from = 0;
      s.to = 1;
      s.t = 0;
    }
    s.t = s.t + s.speed;
    if (s.t >= 1) {
      s.from = s.to;
      s.to = Math.floor(Math.random() * domeList.length);
      if (s.to == s.from) s.to = (s.from + 1) % domeList.length;
      s.t = 0;
      s.speed = rand(0.003, 0.007);
    }
    var a = domeList[s.from];
    var b = domeList[s.to];
    var mx = (a.x + b.x) / 2;
    var my = (a.y + b.y) / 2;
    var dx = mx - p.x;
    var dy = my - p.y;
    var len = Math.sqrt(dx * dx + dy * dy);
    var lift = p.r * 0.3 + Math.abs(a.x - b.x) * 0.2;
    var cx = mx + dx / len * lift;
    var cy = my + dy / len * lift;
    var t = s.t;
    var x = (1 - t) * (1 - t) * a.x + 2 * (1 - t) * t * cx + t * t * b.x;
    var y = (1 - t) * (1 - t) * a.y + 2 * (1 - t) * t * cy + t * t * b.y;
    var vx = 2 * (1 - t) * (cx - a.x) + 2 * t * (b.x - cx);
    var vy = 2 * (1 - t) * (cy - a.y) + 2 * t * (b.y - cy);
    var angle = Math.atan2(vy, vx);

    s.trail.push({ x: x, y: y });
    if (s.trail.length > 16) s.trail.shift();
    for (var k = 1; k < s.trail.length; k++) {
      ctx.strokeStyle = "rgba(255,190,120," + (k / s.trail.length) * 0.6 + ")";
      ctx.lineWidth = 1 + k * 0.12;
      ctx.beginPath();
      ctx.moveTo(s.trail[k - 1].x, s.trail[k - 1].y);
      ctx.lineTo(s.trail[k].x, s.trail[k].y);
      ctx.stroke();
    }

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    drawGlow(-5, 0, 9, 255, 160, 80, 0.7);
    ctx.fillStyle = "#dfe7f0";
    ctx.beginPath();
    ctx.moveTo(7, 0);
    ctx.lineTo(-5, -3.5);
    ctx.lineTo(-3, 0);
    ctx.lineTo(-5, 3.5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#7cc4f5";
    ctx.fillRect(1, -1, 3, 2);
    ctx.restore();
  }
}

function draw() {
  var p = getPlanet();
  var sun = getSunPosition(p);
  ctx.clearRect(0, 0, W, H);
  ctx.save();
  if (quake > 0) {
    ctx.translate(rand(-1, 1) * quake * 6, rand(-1, 1) * quake * 6);
    quake = quake - 0.012;
    if (quake < 0) quake = 0;
  }
  if (blackout > 0) blackout = blackout - 0.003;
  if (auroraBoost > 0) auroraBoost = auroraBoost - 0.004;
  drawBackground();
  drawEarth(sun);
  drawSun(sun);
  drawMoon(p, false);
  drawComet(sun);
  drawMagnetField(p, sun);
  drawPlanet(p);
  drawAurora(p);
  domeCountShown = drawDomes(p);
  drawShuttles(p);
  drawMoon(p, true);
  drawBots(p);
  drawMeteors(p);
  drawFlare(p, sun);
  drawQuakePuffs();
  drawStorm();
  ctx.restore();
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
  if (Math.random() < 0.0002) spawnComet();
  draw();
  if (Math.floor(time) % 8 == 0) updateHud(domeCountShown);
  requestAnimationFrame(loop);
}

function paramMessage(name) {
  var v = params[name];
  if (name == "atmo") {
    if (v > 60) addLog("[OK] Баланс атмосфери зміщено в бік кисню", "ok");
    else if (v < 25) addLog("[WARN] Високий рівень CO2 під куполом", "warn");
    else addLog("[INFO] Склад атмосфери скориговано", "info");
  }
  if (name == "energy") {
    if (v > 60) addLog("[OK] Коренева система отримує енергію від сонячних батарей", "ok");
    else addLog("[INFO] Енергопотік перерозподілено", "info");
  }
  if (name == "water") {
    if (v > 60) addLog("[OK] Підльодові резервуари розкрито: з'являються озера", "ok");
    else addLog("[INFO] Витрату води змінено", "info");
  }
  if (name == "temp") {
    if (v > 85) addLog("[WARN] Перегрів теплового щита", "warn");
    else if (v < 30) addLog("[WARN] Купол промерзає", "warn");
    else addLog("[OK] Температура в комфортному діапазоні", "ok");
  }
  if (name == "bio") {
    if (v > 60) addLog("[OK] Нові види хвойних і квітів прижилися", "ok");
    else addLog("[INFO] Банк насіння оновлено", "info");
  }
  if (name == "speed") {
    addLog("[INFO] Темп часу змінено", "info");
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
      button.querySelector("b").textContent = "УВІМК";
    } else {
      button.querySelector("b").textContent = "ВИМК";
    }
    if (name == "nano") {
      if (sw.nano) addLog("[OK] Нано-боти запущено: очищення ґрунту від перхлоратів", "ok");
      else addLog("[WARN] Нано-боти зупинено", "warn");
    }
    if (name == "magnet") {
      if (sw.magnet) addLog("[OK] Магнітосфера активна: над полюсом сяє аврора", "ok");
      else addLog("[WARN] Магнітне поле вимкнено", "warn");
    }
    if (name == "rain") {
      if (sw.rain) addLog("[OK] Зрошення запущено", "ok");
      else addLog("[INFO] Зрошення зупинено", "info");
    }
    if (name == "auto") {
      addLog("[INFO] Зміну дня і ночі перемкнуто", "info");
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
document.getElementById("bFlare").onclick = startFlare;
document.getElementById("bComet").onclick = spawnComet;
document.getElementById("bQuake").onclick = startQuake;

document.getElementById("bStorm").onclick = function () {
  storm = 1;
  addLog("[WARN] Наближається пилова буря!", "warn");
  achievement("storm", "Пережив бурю");
};

document.getElementById("bRand").onclick = function () {
  setParams({
    atmo: Math.floor(rand(0, 100)),
    energy: Math.floor(rand(0, 100)),
    water: Math.floor(rand(0, 100)),
    temp: Math.floor(rand(20, 80)),
    bio: Math.floor(rand(0, 100))
  });
  addLog("[INFO] Параметри згенеровано випадково", "info");
};

document.getElementById("pMars").onclick = function () {
  setParams({ atmo: 5, energy: 15, water: 5, temp: 20, bio: 0 });
  addLog("[INFO] Завантажено сценарій Марс", "info");
};

document.getElementById("pTerra").onclick = function () {
  setParams({ atmo: 50, energy: 55, water: 45, temp: 55, bio: 35 });
  addLog("[INFO] Завантажено сценарій Терраформ", "info");
};

document.getElementById("pEden").onclick = function () {
  setParams({ atmo: 90, energy: 85, water: 80, temp: 65, bio: 90 });
  addLog("[INFO] Завантажено сценарій Едем", "info");
};

canvas.onclick = function (e) {
  var box = canvas.getBoundingClientRect();
  var p = getPlanet();
  var dx = e.clientX - box.left - p.x;
  var dy = e.clientY - box.top - p.y;
  if (Math.sqrt(dx * dx + dy * dy) > p.r * 1.25) return;
  if (domes.length >= 14) {
    addLog("[WARN] Досягнуто ліміту куполів", "warn");
    return;
  }
  var angle = clamp(Math.atan2(dy, dx) + Math.PI / 2, -1.45, 1.45);
  domes.push({ angle: angle, grow: 0, auto: false, number: domes.length });
  addLog("[OK] Збудовано новий біокупол вручну", "ok");
  achievement("build", "Перший будівельник");
};

window.onresize = resize;

resize();
addLog("[INFO] Ініціалізація EcoSphere: Mars & Forest...", "info");
addLog("[OK] З'єднання з біокуполом встановлено", "ok");

setInterval(function () {
  var item = randomLogs[Math.floor(Math.random() * randomLogs.length)];
  addLog(item[1], item[0]);
}, 5000);

loop();
