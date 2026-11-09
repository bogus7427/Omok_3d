// ================= 3D CHESS ARENA =================
const $ = (id) => document.getElementById(id);
const GLYPH = { w: { k: "♔", q: "♕", r: "♖", b: "♗", n: "♘", p: "♙" }, b: { k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟" } };
const KNAME = { w: "백", b: "흑" };

const THEMES = {
  classic: { w: 0xf3e6cc, b: 0x3a2a20, light: 0xe9d4ae, dark: 0x8a5a33, frame: 0x4a2c17, metal: 0.05, rough: 0.45, emissive: false, bg: 0x1a1220, fog: 0x1a1220 },
  royal:   { w: 0xe8c45a, b: 0x9aa6b6, light: 0xf2e3c0, dark: 0x5a2030, frame: 0x2a0f18, metal: 0.85, rough: 0.28, emissive: false, bg: 0x140a10, fog: 0x140a10 },
  neon:    { w: 0x38e8ff, b: 0xff3cac, light: 0x22263a, dark: 0x0c0e18, frame: 0x05060c, metal: 0.3, rough: 0.3, emissive: true, bg: 0x05040e, fog: 0x05040e },
  marble:  { w: 0xfafafa, b: 0x1d2a33, light: 0xdedede, dark: 0x5b6b75, frame: 0x2b2f33, metal: 0.1, rough: 0.15, emissive: false, bg: 0x0f1418, fog: 0x0f1418 },
};

// ---------- 설정 ----------
const settings = { mode: "ai", diff: "2", color: "w", theme: "classic", time: "10", inc: "0", rotate: "1" };
document.querySelectorAll(".seg").forEach((seg) => {
  seg.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    seg.querySelectorAll("button").forEach((b) => b.classList.remove("on"));
    btn.classList.add("on");
    settings[seg.dataset.opt] = btn.dataset.v;
    syncMenu();
    if (seg.dataset.opt === "theme") applyTheme(btn.dataset.v);
  });
});
function syncMenu() {
  const ai = settings.mode === "ai";
  $("row-diff").classList.toggle("hidden", !ai);
  $("row-color").classList.toggle("hidden", !ai);
  $("row-rotate").classList.toggle("hidden", ai);
  showRecord();
}

// ---------- 전적 (localStorage) ----------
function loadRecord() {
  try { return JSON.parse(localStorage.getItem("chess3d_record")) || {}; } catch { return {}; }
}
function saveRecord(r) { try { localStorage.setItem("chess3d_record", JSON.stringify(r)); } catch {} }
function showRecord() {
  const r = loadRecord();
  const a = r.ai || { win: 0, loss: 0, draw: 0 };
  const p = r.pvp || { w: 0, b: 0, draw: 0 };
  $("record").textContent = settings.mode === "ai"
    ? `vs 컴퓨터 전적: ${a.win}승 ${a.loss}패 ${a.draw}무`
    : `2인 전적: 백 ${p.w}승 · 흑 ${p.b}승 · 무승부 ${p.draw}`;
}

// ---------- 사운드 ----------
let soundOn = true, actx = null;
function tone(freq, dur = 0.08, type = "sine", vol = 0.15, delay = 0) {
  if (!soundOn) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const t0 = actx.currentTime + delay;
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(actx.destination);
    o.start(t0); o.stop(t0 + dur + 0.02);
  } catch {}
}
const SFX = {
  move: () => { tone(320, 0.06, "triangle", 0.2); },
  capture: () => { tone(180, 0.12, "square", 0.12); tone(120, 0.15, "sawtooth", 0.08, 0.05); },
  check: () => { tone(660, 0.1, "square", 0.1); tone(880, 0.15, "square", 0.1, 0.1); },
  castle: () => { tone(400, 0.06, "triangle", 0.2); tone(500, 0.06, "triangle", 0.2, 0.08); },
  win: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.25, "triangle", 0.15, i * 0.13)),
  lose: () => [392, 330, 262, 196].forEach((f, i) => tone(f, 0.3, "sine", 0.15, i * 0.16)),
  tick: () => tone(1200, 0.03, "sine", 0.05),
  select: () => tone(600, 0.03, "sine", 0.08),
};

// ================= THREE.js 장면 =================
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 500);
camera.position.set(0, 11, 11);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.maxPolarAngle = Math.PI * 0.46;
controls.minDistance = 7;
controls.maxDistance = 26;
controls.enablePan = false;

scene.add(new THREE.HemisphereLight(0xfff2e0, 0x202040, 0.55));
const sun = new THREE.DirectionalLight(0xffffff, 0.85);
sun.position.set(6, 14, 6);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10 });
scene.add(sun);
const warm = new THREE.PointLight(0xffaa55, 0.6, 30);
warm.position.set(-8, 6, 0);
scene.add(warm);
const cool = new THREE.PointLight(0x5588ff, 0.5, 30);
cool.position.set(8, 6, 0);
scene.add(cool);

// ---------- 주변 배경 ----------
const env = new THREE.Group();
scene.add(env);
// 바닥
const floor = new THREE.Mesh(new THREE.CircleGeometry(60, 64), new THREE.MeshStandardMaterial({ color: 0x15121a, roughness: 0.9 }));
floor.rotation.x = -Math.PI / 2;
floor.position.y = -4.2;
floor.receiveShadow = true;
env.add(floor);
// 테이블
const tableMat = new THREE.MeshStandardMaterial({ color: 0x3b2414, roughness: 0.6 });
const table = new THREE.Mesh(new THREE.CylinderGeometry(9.5, 9.8, 0.5, 64), tableMat);
table.position.y = -0.75;
table.receiveShadow = true;
env.add(table);
const leg = new THREE.Mesh(new THREE.CylinderGeometry(1, 2.2, 3.2, 32), tableMat);
leg.position.y = -2.6;
env.add(leg);
// 기둥 + 횃불
const pillarMat = new THREE.MeshStandardMaterial({ color: 0x2a2633, roughness: 0.8 });
const flames = [];
for (let i = 0; i < 8; i++) {
  const ang = (i / 8) * Math.PI * 2 + Math.PI / 8;
  const x = Math.cos(ang) * 19, z = Math.sin(ang) * 19;
  const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.9, 14, 16), pillarMat);
  pillar.position.set(x, 2.8, z);
  env.add(pillar);
  const flame = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 12), new THREE.MeshBasicMaterial({ color: 0xffa040 }));
  flame.position.set(x * 0.95, 5, z * 0.95);
  env.add(flame);
  flames.push(flame);
}
// 별/먼지 파티클
const dustGeo = new THREE.BufferGeometry();
const dustPos = new Float32Array(900 * 3);
for (let i = 0; i < 900; i++) {
  const r = 12 + Math.random() * 40, a = Math.random() * Math.PI * 2;
  dustPos[i * 3] = Math.cos(a) * r;
  dustPos[i * 3 + 1] = Math.random() * 30 - 3;
  dustPos[i * 3 + 2] = Math.sin(a) * r;
}
dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: 0xffe0b0, size: 0.12, transparent: true, opacity: 0.7 }));
env.add(dust);

// ---------- 보드 ----------
const boardGroup = new THREE.Group();
scene.add(boardGroup);
const tiles = [];
const lightMat = new THREE.MeshStandardMaterial({ roughness: 0.5 });
const darkMat = new THREE.MeshStandardMaterial({ roughness: 0.5 });
const frameMat = new THREE.MeshStandardMaterial({ roughness: 0.5 });
const sqPos = (sq) => new THREE.Vector3((sq & 7) - 3.5, 0, (sq >> 3) - 3.5);
for (let sq = 0; sq < 64; sq++) {
  const r = sq >> 3, c = sq & 7;
  const tile = new THREE.Mesh(new THREE.BoxGeometry(1, 0.2, 1), (r + c) % 2 === 0 ? lightMat : darkMat);
  tile.position.copy(sqPos(sq)).setY(-0.1);
  tile.receiveShadow = true;
  tile.userData.sq = sq;
  boardGroup.add(tile);
  tiles.push(tile);
}
const frame = new THREE.Mesh(new THREE.BoxGeometry(9.3, 0.36, 9.3), frameMat);
frame.position.y = -0.2;
frame.receiveShadow = true;
frame.castShadow = true;
boardGroup.add(frame);
// 좌표 라벨
function labelTex(txt) {
  const cv = document.createElement("canvas");
  cv.width = cv.height = 64;
  const g = cv.getContext("2d");
  g.fillStyle = "#e8d8b8";
  g.font = "bold 44px Georgia";
  g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText(txt, 32, 34);
  return new THREE.CanvasTexture(cv);
}
for (let i = 0; i < 8; i++) {
  const mk = (txt, x, z, rot) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.4), new THREE.MeshBasicMaterial({ map: labelTex(txt), transparent: true }));
    m.rotation.set(-Math.PI / 2, 0, rot);
    m.position.set(x, -0.015, z);
    boardGroup.add(m);
  };
  mk("abcdefgh"[i], i - 3.5, 4.35, 0);
  mk("abcdefgh"[i], i - 3.5, -4.35, Math.PI);
  mk(String(8 - i), -4.35, i - 3.5, 0);
  mk(String(8 - i), 4.35, i - 3.5, Math.PI);
}
// 잡은 말 트레이 (보드 양옆)
const trayMat = new THREE.MeshStandardMaterial({ color: 0x5a1a2a, roughness: 0.95 });
for (const side of [-1, 1]) {
  const tray = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.12, 8.6), trayMat);
  tray.position.set(side * 6.2, -0.38, 0);
  tray.receiveShadow = true;
  boardGroup.add(tray);
  const rim = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.08, 8.8), frameMat);
  rim.position.set(side * 6.2, -0.46, 0);
  boardGroup.add(rim);
}

// ---------- 하이라이트 ----------
const hlGroup = new THREE.Group();
scene.add(hlGroup);
const hlMats = {
  sel: new THREE.MeshBasicMaterial({ color: 0xffe066, transparent: true, opacity: 0.55 }),
  last: new THREE.MeshBasicMaterial({ color: 0xffa94d, transparent: true, opacity: 0.35 }),
  check: new THREE.MeshBasicMaterial({ color: 0xff3030, transparent: true, opacity: 0.6 }),
  dot: new THREE.MeshBasicMaterial({ color: 0x40d080, transparent: true, opacity: 0.8 }),
  ring: new THREE.MeshBasicMaterial({ color: 0xff5050, transparent: true, opacity: 0.85 }),
  hint: new THREE.MeshBasicMaterial({ color: 0x40a0ff, transparent: true, opacity: 0.55 }),
  hover: new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.18 }),
};
const planeGeo = new THREE.PlaneGeometry(0.98, 0.98);
const dotGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.03, 20);
const ringGeo = new THREE.TorusGeometry(0.4, 0.05, 8, 32);
function hlPlane(sq, mat, y = 0.005) {
  const m = new THREE.Mesh(planeGeo, mat);
  m.rotation.x = -Math.PI / 2;
  m.position.copy(sqPos(sq)).setY(y);
  hlGroup.add(m);
  return m;
}
const hoverMesh = new THREE.Mesh(planeGeo, hlMats.hover);
hoverMesh.rotation.x = -Math.PI / 2;
hoverMesh.visible = false;
scene.add(hoverMesh);

// ---------- 기물 모델 ----------
const pieceMats = { w: new THREE.MeshStandardMaterial(), b: new THREE.MeshStandardMaterial() };
function lathe(pts) {
  return new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), 28);
}
const BASE = [[0, 0], [0.38, 0], [0.38, 0.07], [0.33, 0.11], [0.3, 0.16], [0.24, 0.2]];
const PROFILES = {
  p: BASE.concat([[0.17, 0.3], [0.12, 0.5], [0.19, 0.54], [0.1, 0.58], [0, 0.58]]),
  r: BASE.concat([[0.24, 0.3], [0.21, 0.72], [0.29, 0.76], [0.29, 0.95], [0.18, 0.95], [0.18, 0.88], [0, 0.88]]),
  n: BASE.concat([[0.22, 0.3], [0.2, 0.42], [0.27, 0.46], [0, 0.46]]),
  b: BASE.concat([[0.2, 0.3], [0.13, 0.75], [0.22, 0.8], [0.12, 0.85], [0, 0.85]]),
  q: BASE.concat([[0.22, 0.3], [0.14, 0.9], [0.26, 0.96], [0.18, 1.02], [0.24, 1.18], [0, 1.12]]),
  k: BASE.concat([[0.24, 0.3], [0.16, 1.0], [0.27, 1.06], [0.18, 1.12], [0.22, 1.25], [0, 1.25]]),
};
const geoCache = {};
function createPiece(type, color) {
  const mat = pieceMats[color];
  const g = new THREE.Group();
  const add = (geo, x = 0, y = 0, z = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    g.add(m);
    return m;
  };
  geoCache[type] = geoCache[type] || lathe(PROFILES[type]);
  add(geoCache[type]);
  if (type === "p") add(new THREE.SphereGeometry(0.16, 20, 16), 0, 0.7, 0);
  if (type === "r") {
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      add(new THREE.BoxGeometry(0.13, 0.13, 0.13), Math.cos(a) * 0.23, 1.0, Math.sin(a) * 0.23);
    }
  }
  if (type === "b") {
    const head = add(new THREE.SphereGeometry(0.17, 20, 16), 0, 1.0, 0);
    head.scale.y = 1.35;
    add(new THREE.SphereGeometry(0.06, 10, 8), 0, 1.27, 0);
  }
  if (type === "q") {
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      add(new THREE.SphereGeometry(0.05, 8, 6), Math.cos(a) * 0.22, 1.2, Math.sin(a) * 0.22);
    }
    add(new THREE.SphereGeometry(0.09, 12, 10), 0, 1.24, 0);
  }
  if (type === "k") {
    add(new THREE.BoxGeometry(0.08, 0.34, 0.08), 0, 1.42, 0);
    add(new THREE.BoxGeometry(0.26, 0.08, 0.08), 0, 1.45, 0);
  }
  if (type === "n") {
    const head = new THREE.Group();
    const neck = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.55, 0.36), mat);
    neck.position.set(0, 0.68, 0.02);
    neck.rotation.x = -0.25;
    const snout = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.24, 0.42), mat);
    snout.position.set(0, 0.86, -0.2);
    snout.rotation.x = 0.35;
    const mane = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, 0.14), mat);
    mane.position.set(0, 0.74, 0.2);
    mane.rotation.x = -0.25;
    const ear1 = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.14, 6), mat);
    ear1.position.set(0.08, 1.03, 0.08);
    const ear2 = ear1.clone();
    ear2.position.x = -0.08;
    [neck, snout, mane, ear1, ear2].forEach((m) => { m.castShadow = true; head.add(m); });
    g.add(head);
    g.rotation.y = color === "w" ? 0 : Math.PI; // 상대 진영을 바라보도록
  }
  return g;
}

function applyTheme(name) {
  const t = THEMES[name];
  for (const c of ["w", "b"]) {
    const m = pieceMats[c];
    m.color.setHex(t[c]);
    m.metalness = t.metal;
    m.roughness = t.rough;
    m.emissive.setHex(t.emissive ? t[c] : 0x000000);
    m.emissiveIntensity = t.emissive ? 0.35 : 0;
    m.needsUpdate = true;
  }
  lightMat.color.setHex(t.light);
  darkMat.color.setHex(t.dark);
  frameMat.color.setHex(t.frame);
  lightMat.metalness = darkMat.metalness = name === "marble" ? 0.2 : 0;
  lightMat.roughness = darkMat.roughness = name === "marble" ? 0.15 : 0.5;
  scene.background = new THREE.Color(t.bg);
  scene.fog = new THREE.Fog(t.fog, 22, 60);
  if (name === "neon") { lightMat.emissive.setHex(0x101530); darkMat.emissive.setHex(0x000000); }
  else { lightMat.emissive.setHex(0); darkMat.emissive.setHex(0); }
}
applyTheme("classic");

// ================= 게임 상태 =================
let G = null; // 현재 게임
let meshAt = Array(64).fill(null);
let trayMeshes = { w: [], b: [] };
let anims = [];
let effects = [];
let camGoal = null;

function newGame() {
  for (const m of meshAt) if (m) scene.remove(m);
  for (const c of ["w", "b"]) trayMeshes[c].forEach((m) => scene.remove(m));
  meshAt = Array(64).fill(null);
  trayMeshes = { w: [], b: [] };
  anims = [];
  const human = settings.mode === "ai" ? (settings.color === "r" ? (Math.random() < 0.5 ? "w" : "b") : settings.color) : null;
  const mins = +settings.time;
  G = {
    s: Chess.initState(),
    mode: settings.mode,
    level: +settings.diff,
    human,
    ai: human ? Chess.opp(human) : null,
    clock: { w: mins * 60000, b: mins * 60000 },
    timed: mins > 0,
    inc: +settings.inc * 1000,
    lastTick: performance.now(),
    history: [],
    sans: [],
    keys: [],
    captured: { w: [], b: [] }, // w = 백이 잡은 말들
    legal: [],
    selected: -1,
    lastMove: null,
    hint: null,
    over: false,
    thinking: false,
    bottom: human || "w",
  };
  G.keys.push(Chess.posKey(G.s));
  G.legal = Chess.genMoves(G.s);
  for (let sq = 0; sq < 64; sq++) if (G.s.b[sq]) spawnAt(sq, G.s.b[sq]);
  setCamera(G.bottom, false);
  applyTheme(settings.theme);
  $("menu").classList.add("hidden");
  $("over-modal").classList.add("hidden");
  $("left").classList.remove("hidden");
  $("right").classList.remove("hidden");
  refresh();
  toast(G.mode === "ai" ? (G.human === "w" ? "당신은 백! 선공입니다" : "당신은 흑! 후공입니다") : "대국 시작!", "#ffe29a");
  maybeAI();
}

function spawnAt(sq, piece) {
  const m = createPiece(piece[1], piece[0]);
  m.position.copy(sqPos(sq));
  scene.add(m);
  meshAt[sq] = m;
  return m;
}
function traySlot(capturer, i) {
  // 백이 잡은 말 → 오른쪽(+x) 트레이, 흑이 잡은 말 → 왼쪽(-x)
  const side = capturer === "w" ? 1 : -1;
  const col = Math.floor(i / 8), row = i % 8;
  return new THREE.Vector3(side * (5.75 + col * 0.9), -0.32, side * (3.6 - row * 1.03));
}
function sendToTray(mesh, capturer) {
  const i = trayMeshes[capturer].length;
  trayMeshes[capturer].push(mesh);
  animate(mesh, traySlot(capturer, i), 650, 2.2, () => mesh.scale.setScalar(0.75));
}
function rebuildMeshes() {
  for (const m of meshAt) if (m) scene.remove(m);
  for (const c of ["w", "b"]) trayMeshes[c].forEach((m) => scene.remove(m));
  meshAt = Array(64).fill(null);
  trayMeshes = { w: [], b: [] };
  anims = [];
  for (let sq = 0; sq < 64; sq++) if (G.s.b[sq]) spawnAt(sq, G.s.b[sq]);
  for (const c of ["w", "b"]) {
    G.captured[c].forEach((p, i) => {
      const m = createPiece(p[1], p[0]);
      m.position.copy(traySlot(c, i));
      m.scale.setScalar(0.75);
      scene.add(m);
      trayMeshes[c].push(m);
    });
  }
}

// ---------- 애니메이션 ----------
function animate(obj, to, dur, arc = 0, done) {
  anims = anims.filter((a) => a.obj !== obj);
  anims.push({ obj, from: obj.position.clone(), to: to.clone(), t0: performance.now(), dur, arc, done });
}
function burst(pos, color) {
  const n = 40;
  const geo = new THREE.BufferGeometry();
  const arr = new Float32Array(n * 3);
  const vel = [];
  for (let i = 0; i < n; i++) {
    arr.set([pos.x, 0.5, pos.z], i * 3);
    vel.push(new THREE.Vector3((Math.random() - 0.5) * 4, Math.random() * 4 + 1, (Math.random() - 0.5) * 4));
  }
  geo.setAttribute("position", new THREE.BufferAttribute(arr, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color, size: 0.12, transparent: true }));
  scene.add(pts);
  effects.push({ pts, vel, t0: performance.now(), life: 900 });
}
function confetti() {
  const cols = [0xff5577, 0xffd044, 0x44ddff, 0x77ff88, 0xbb88ff];
  for (let k = 0; k < 6; k++) setTimeout(() => burst(new THREE.Vector3((Math.random() - 0.5) * 8, 0, (Math.random() - 0.5) * 8), cols[k % 5]), k * 150);
}
function setCamera(color, smooth = true) {
  const z = color === "w" ? 10.5 : -10.5;
  const goal = new THREE.Vector3(0, 11, z);
  if (smooth) camGoal = goal;
  else { camera.position.copy(goal); controls.target.set(0, 0, 0); camGoal = null; }
}

// ---------- 수 두기 ----------
function doMove(m) {
  const s = G.s;
  const piece = s.b[m.f];
  const me = piece[0];
  const san = Chess.toSAN(s, m, G.legal);
  G.history.push({ s, captured: { w: G.captured.w.slice(), b: G.captured.b.slice() }, lastMove: G.lastMove, keysLen: G.keys.length });
  const ns = Chess.applyMove(s, m);

  // 3D 처리
  const mesh = meshAt[m.f];
  const capSq = m.flag === "ep" ? m.t + (me === "w" ? 8 : -8) : m.t;
  const capMesh = s.b[capSq] && capSq !== m.f ? meshAt[capSq] : null;
  meshAt[m.f] = null;
  if (capMesh) {
    meshAt[capSq] = null;
    setTimeout(() => {
      burst(sqPos(capSq), me === "w" ? 0xffe9a0 : 0xff6688);
      sendToTray(capMesh, me);
    }, 260);
  }
  const isKnight = piece[1] === "n";
  animate(mesh, sqPos(m.t), 380, isKnight ? 1.2 : capMesh ? 0.5 : 0.25, () => {
    if (m.promo) {
      scene.remove(mesh);
      const nm = spawnAt(m.t, me + m.promo);
      nm.scale.setScalar(0.01);
      effects.push({ grow: nm, t0: performance.now(), life: 400 });
      burst(sqPos(m.t), 0x66ccff);
    }
  });
  meshAt[m.t] = mesh;
  if (m.flag === "castleK" || m.flag === "castleQ") {
    const rf = m.flag === "castleK" ? m.f + 3 : m.f - 4;
    const rt = m.flag === "castleK" ? m.f + 1 : m.f - 1;
    const rm = meshAt[rf];
    meshAt[rf] = null;
    meshAt[rt] = rm;
    setTimeout(() => animate(rm, sqPos(rt), 380, 0.9), 120);
  }

  if (ns.cap) G.captured[me].push(ns.cap);
  if (G.timed) G.clock[me] += G.inc;
  G.s = ns;
  G.sans.push(san);
  G.keys.push(Chess.posKey(ns));
  G.lastMove = m;
  G.selected = -1;
  G.hint = null;
  G.legal = Chess.genMoves(ns);

  // 효과음 & 토스트
  const check = Chess.inCheck(ns);
  if (check && G.legal.length) { SFX.check(); toast("체크!", "#ff6b6b"); }
  else if (m.flag && m.flag.startsWith("castle")) { SFX.castle(); toast("캐슬링!", "#9ad0ff"); }
  else if (m.flag === "ep") { SFX.capture(); toast("앙파상!", "#c9a0ff"); }
  else if (m.promo) { SFX.capture(); toast("프로모션! " + GLYPH[me][m.promo], "#7fe0ff"); }
  else if (ns.cap) {
    SFX.capture();
    const v = Chess.PTS[ns.cap[1]];
    if (v >= 5) toast(v >= 9 ? "퀸을 잡았다!!" : "룩 획득!", "#ffd166");
  } else SFX.move();

  checkEnd();
  if (!G.over && G.mode === "pvp" && settings.rotate === "1") {
    G.bottom = ns.turn;
    setTimeout(() => setCamera(ns.turn), 500);
  }
  refresh();
  maybeAI();
}

function checkEnd() {
  const s = G.s;
  if (!G.legal.length) {
    if (Chess.inCheck(s)) return finish(Chess.opp(s.turn), "체크메이트");
    return finish(null, "스테일메이트");
  }
  if (s.half >= 100) return finish(null, "50수 규칙");
  const key = G.keys[G.keys.length - 1];
  if (G.keys.filter((k) => k === key).length >= 3) return finish(null, "3회 동형 반복");
  if (Chess.insufficient(s.b)) return finish(null, "기물 부족");
}

function finish(winner, reason) {
  G.over = true;
  G.thinking = false;
  const rec = loadRecord();
  let title;
  if (G.mode === "ai") {
    rec.ai = rec.ai || { win: 0, loss: 0, draw: 0 };
    if (!winner) { rec.ai.draw++; title = "🤝 무승부"; SFX.move(); }
    else if (winner === G.human) { rec.ai.win++; title = "🏆 승리!"; SFX.win(); confetti(); }
    else { rec.ai.loss++; title = "💀 패배..."; SFX.lose(); }
  } else {
    rec.pvp = rec.pvp || { w: 0, b: 0, draw: 0 };
    if (!winner) { rec.pvp.draw++; title = "🤝 무승부"; }
    else { rec.pvp[winner]++; title = `🏆 ${KNAME[winner]} 승리!`; confetti(); }
    SFX.win();
  }
  saveRecord(rec);
  const sw = score("w"), sb = score("b");
  $("over-title").textContent = title;
  $("over-reason").textContent = reason + (winner ? ` · ${KNAME[winner]} 승` : "");
  $("over-stats").innerHTML =
    `총 ${Math.ceil(G.sans.length / 2)}수 진행<br>` +
    `백 획득 점수: <b>${sw}</b> · 흑 획득 점수: <b>${sb}</b><br>` +
    (G.mode === "ai" ? `vs 컴퓨터 전적: ${rec.ai.win}승 ${rec.ai.loss}패 ${rec.ai.draw}무` : `2인 전적: 백 ${rec.pvp.w} · 흑 ${rec.pvp.b} · 무 ${rec.pvp.draw}`);
  setTimeout(() => $("over-modal").classList.remove("hidden"), 900);
  refresh();
}

const score = (c) => G.captured[c].reduce((a, p) => a + Chess.PTS[p[1]], 0);

// ---------- AI ----------
function maybeAI() {
  if (!G || G.over || G.mode !== "ai" || G.s.turn !== G.ai) return;
  G.thinking = true;
  refresh();
  const gameRef = G;
  setTimeout(() => {
    if (G !== gameRef || G.over) return;
    const m = Chess.bestMove(G.s, G.level);
    G.thinking = false;
    if (m && G === gameRef && !G.over) doMove(m);
  }, 550);
}

// ---------- 입력 ----------
const ray = new THREE.Raycaster();
const mouse = new THREE.Vector2();
function pickSquare(ev) {
  mouse.x = (ev.clientX / innerWidth) * 2 - 1;
  mouse.y = -(ev.clientY / innerHeight) * 2 + 1;
  ray.setFromCamera(mouse, camera);
  const objs = tiles.slice();
  meshAt.forEach((m) => m && objs.push(m));
  const hit = ray.intersectObjects(objs, true)[0];
  if (!hit) return -1;
  let o = hit.object;
  while (o && o.userData.sq === undefined && !meshAt.includes(o)) o = o.parent;
  if (!o) return -1;
  if (o.userData.sq !== undefined) return o.userData.sq;
  return meshAt.indexOf(o);
}
const canHumanMove = () =>
  G && !G.over && !G.thinking && anims.length === 0 && (G.mode === "pvp" || G.s.turn === G.human);

let downPos = null;
renderer.domElement.addEventListener("pointerdown", (e) => (downPos = [e.clientX, e.clientY]));
renderer.domElement.addEventListener("pointerup", (e) => {
  if (!downPos || Math.hypot(e.clientX - downPos[0], e.clientY - downPos[1]) > 6) return;
  downPos = null;
  if (!canHumanMove()) return;
  const sq = pickSquare(e);
  if (sq < 0) { G.selected = -1; refresh(); return; }
  if (G.selected >= 0) {
    const cands = G.legal.filter((m) => m.f === G.selected && m.t === sq);
    if (cands.length) {
      if (cands.length > 1) askPromo(G.s.turn, (pr) => doMove(cands.find((m) => m.promo === pr)));
      else doMove(cands[0]);
      return;
    }
  }
  const p = G.s.b[sq];
  if (p && p[0] === G.s.turn) { G.selected = sq === G.selected ? -1 : sq; SFX.select(); }
  else G.selected = -1;
  refresh();
});
renderer.domElement.addEventListener("pointermove", (e) => {
  if (!canHumanMove()) { hoverMesh.visible = false; return; }
  const sq = pickSquare(e);
  hoverMesh.visible = sq >= 0;
  if (sq >= 0) hoverMesh.position.copy(sqPos(sq)).setY(0.008);
  renderer.domElement.style.cursor = sq >= 0 && G.s.b[sq] && G.s.b[sq][0] === G.s.turn ? "pointer" : "default";
});

function askPromo(color, cb) {
  const box = $("promo-opts");
  box.innerHTML = "";
  for (const t of "qrbn") {
    const b = document.createElement("button");
    b.textContent = GLYPH[color][t];
    b.onclick = () => { $("promo-modal").classList.add("hidden"); cb(t); };
    box.appendChild(b);
  }
  $("promo-modal").classList.remove("hidden");
}

// ---------- 버튼 ----------
$("start-btn").onclick = newGame;
$("btn-again").onclick = newGame;
$("btn-tomenu").onclick = $("btn-menu").onclick = () => {
  if (G && !G.over && G.sans.length && !confirm("진행 중인 게임을 그만두고 메뉴로 갈까요?")) return;
  if (G) G.over = true;
  $("over-modal").classList.add("hidden");
  $("menu").classList.remove("hidden");
  showRecord();
};
$("btn-review").onclick = () => $("over-modal").classList.add("hidden");
$("btn-flip").onclick = () => { if (!G) return; G.bottom = Chess.opp(G.bottom); setCamera(G.bottom); refresh(); };
$("btn-sound").onclick = () => { soundOn = !soundOn; $("btn-sound").textContent = soundOn ? "🔊 소리" : "🔇 소리"; };
$("btn-resign").onclick = () => {
  if (!G || G.over) return;
  const loser = G.mode === "ai" ? G.human : G.s.turn;
  if (confirm(`${KNAME[loser]}이(가) 기권할까요?`)) finish(Chess.opp(loser), `${KNAME[loser]} 기권`);
};
$("btn-undo").onclick = () => {
  if (!G || !G.history.length || G.thinking || anims.length) return;
  const steps = G.mode === "ai" ? (G.s.turn === G.human || G.over ? 2 : 1) : 1;
  for (let i = 0; i < steps && G.history.length; i++) {
    const h = G.history.pop();
    G.s = h.s;
    G.captured = h.captured;
    G.lastMove = h.lastMove;
    G.keys.length = h.keysLen;
    G.sans.pop();
  }
  if (G.mode === "ai" && G.s.turn !== G.human && G.history.length) {
    // AI가 백일 때 첫 수까지 되돌린 경우 대비
  }
  G.over = false;
  G.selected = -1;
  G.hint = null;
  G.legal = Chess.genMoves(G.s);
  $("over-modal").classList.add("hidden");
  rebuildMeshes();
  if (G.mode === "pvp" && settings.rotate === "1") { G.bottom = G.s.turn; setCamera(G.bottom); }
  toast("무르기", "#ccc");
  refresh();
  maybeAI();
};
$("btn-hint").onclick = () => {
  if (!canHumanMove()) return;
  toast("💡 생각 중...", "#7fc8ff");
  setTimeout(() => {
    const m = Chess.bestMove(G.s, 2);
    if (m) { G.hint = m; G.selected = m.f; refresh(); }
  }, 30);
};
addEventListener("keydown", (e) => {
  if (e.key === "Escape" && G) { G.selected = -1; refresh(); }
  if ((e.key === "z" || e.key === "Z") && e.ctrlKey) $("btn-undo").click();
});

// ---------- HUD ----------
let toastTimer;
function toast(msg, color = "#fff") {
  const t = $("toast");
  t.textContent = msg;
  t.style.color = color;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 1300);
}
function fmt(ms) {
  if (!G.timed) return "∞";
  ms = Math.max(0, ms);
  const s = Math.floor(ms / 1000);
  if (ms < 10000) return `0:0${Math.floor(ms / 1000)}.${Math.floor((ms % 1000) / 100)}`;
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
function playerName(c) {
  if (G.mode === "ai") return c === G.human ? `나 (${KNAME[c]})` : `컴퓨터 (${KNAME[c]}) Lv.${G.level}`;
  return `플레이어 ${c === "w" ? 1 : 2} (${KNAME[c]})`;
}
function refresh() {
  if (!G) return;
  const top = Chess.opp(G.bottom), bottom = G.bottom;
  for (const [id, c] of [["card-top", top], ["card-bottom", bottom]]) {
    const card = $(id);
    card.classList.toggle("active", !G.over && G.s.turn === c);
    card.querySelector(".p-dot").style.background = c === "w" ? "#f5f0e6" : "#222";
    card.querySelector(".p-name").textContent = playerName(c);
    const diff = score(c) - score(Chess.opp(c));
    card.querySelector(".p-score").textContent = `${score(c)}점` + (diff > 0 ? ` (+${diff})` : "");
    const ord = "qrbnp";
    card.querySelector(".caps").textContent = G.captured[c]
      .slice()
      .sort((a, b) => ord.indexOf(a[1]) - ord.indexOf(b[1]))
      .map((p) => GLYPH[p[0]][p[1]])
      .join("");
    const clk = card.querySelector(".clock");
    clk.textContent = fmt(G.clock[c]);
    clk.classList.toggle("low", G.timed && G.clock[c] < 20000 && !G.over);
  }
  const st = $("status");
  if (G.over) st.textContent = "게임 종료";
  else st.textContent = `${KNAME[G.s.turn]} 차례` + (Chess.inCheck(G.s) ? " — 체크!" : "") + ` · ${G.s.full}수`;
  $("thinking").classList.toggle("hidden", !G.thinking);
  $("btn-undo").disabled = !G.history.length;
  // 기보
  const mv = $("moves");
  let html = "";
  for (let i = 0; i < G.sans.length; i += 2) {
    const last = G.sans.length - 1;
    html += `<span class="n">${i / 2 + 1}.</span><span class="${i === last ? "last" : ""}">${G.sans[i]}</span><span class="${i + 1 === last ? "last" : ""}">${G.sans[i + 1] || ""}</span>`;
  }
  mv.innerHTML = html;
  mv.scrollTop = mv.scrollHeight;
  drawHighlights();
}
function drawHighlights() {
  while (hlGroup.children.length) hlGroup.remove(hlGroup.children[0]);
  if (G.lastMove) { hlPlane(G.lastMove.f, hlMats.last); hlPlane(G.lastMove.t, hlMats.last); }
  if (Chess.inCheck(G.s)) hlPlane(Chess.kingSq(G.s.b, G.s.turn), hlMats.check, 0.007);
  if (G.hint) { hlPlane(G.hint.f, hlMats.hint, 0.006); hlPlane(G.hint.t, hlMats.hint, 0.006); }
  if (G.selected >= 0) {
    hlPlane(G.selected, hlMats.sel, 0.009);
    const seen = new Set();
    for (const m of G.legal) {
      if (m.f !== G.selected || seen.has(m.t)) continue;
      seen.add(m.t);
      const cap = G.s.b[m.t] || m.flag === "ep";
      const mk = new THREE.Mesh(cap ? ringGeo : dotGeo, cap ? hlMats.ring : hlMats.dot);
      mk.position.copy(sqPos(m.t)).setY(0.03);
      if (cap) mk.rotation.x = -Math.PI / 2;
      hlGroup.add(mk);
    }
  }
}

// ---------- 메인 루프 ----------
let lastSecShown = -1;
function loop(now) {
  requestAnimationFrame(loop);
  // 시계
  if (G && !G.over && G.timed && G.sans.length > 0) {
    const c = G.s.turn;
    G.clock[c] -= now - G.lastTick;
    const sec = Math.floor(G.clock[c] / 1000);
    if (sec !== lastSecShown) {
      lastSecShown = sec;
      if (G.clock[c] < 10000 && G.clock[c] > 0) SFX.tick();
      refresh();
    }
    if (G.clock[c] <= 0) {
      G.clock[c] = 0;
      const w = Chess.opp(c);
      if (Chess.canMate(G.s.b, w)) finish(w, `${KNAME[c]} 시간 초과`);
      else finish(null, "시간 초과 (상대 기물 부족)");
    }
  }
  if (G) G.lastTick = now;

  // 이동 애니메이션
  anims = anims.filter((a) => {
    const k = Math.min(1, (now - a.t0) / a.dur);
    const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    a.obj.position.lerpVectors(a.from, a.to, e);
    a.obj.position.y += Math.sin(Math.PI * k) * a.arc;
    if (k >= 1) { a.done && a.done(); return false; }
    return true;
  });
  // 이펙트
  effects = effects.filter((f) => {
    const k = (now - f.t0) / f.life;
    if (f.grow) { f.grow.scale.setScalar(Math.min(1, k) * (1 + Math.sin(Math.min(1, k) * Math.PI) * 0.3)); return k < 1; }
    const p = f.pts.geometry.attributes.position;
    for (let i = 0; i < f.vel.length; i++) {
      f.vel[i].y -= 0.15;
      p.setXYZ(i, p.getX(i) + f.vel[i].x * 0.016, Math.max(0.02, p.getY(i) + f.vel[i].y * 0.016), p.getZ(i) + f.vel[i].z * 0.016);
    }
    p.needsUpdate = true;
    f.pts.material.opacity = 1 - k;
    if (k >= 1) { scene.remove(f.pts); return false; }
    return true;
  });
  // 선택된 말 떠오르기
  if (G) {
    meshAt.forEach((m, sq) => {
      if (!m || anims.some((a) => a.obj === m)) return;
      const goal = sq === G.selected ? 0.25 + Math.sin(now / 200) * 0.05 : 0;
      m.position.y += (goal - m.position.y) * 0.2;
    });
    // 체크 깜빡임
    hlMats.check.opacity = 0.35 + Math.sin(now / 150) * 0.25;
  }
  // 카메라 이동
  if (camGoal) {
    camera.position.lerp(camGoal, 0.06);
    if (camera.position.distanceTo(camGoal) < 0.05) camGoal = null;
  }
  // 배경 연출
  dust.rotation.y += 0.0004;
  flames.forEach((f, i) => f.scale.setScalar(1 + Math.sin(now / 90 + i * 2) * 0.15));
  warm.intensity = 0.55 + Math.sin(now / 130) * 0.08;
  controls.update();
  renderer.render(scene, camera);
}
requestAnimationFrame(loop);

addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
syncMenu();
