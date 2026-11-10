// ================= 3D OMOK ARENA =================
const $ = (id) => document.getElementById(id);
const KNAME = { b: "흑", w: "백" };
const N = Omok.N;
const GAP = 0.6; // 교차점 간격
const HALF = (N - 1) / 2;

const THEMES = {
  classic: { b: 0x151515, w: 0xf4f1ea, board: 0xd9a95f, line: "#2a1a0a", frame: 0x4a2c17, metal: 0.05, rough: 0.3, emissive: false, bg: 0x1a1220 },
  royal:   { b: 0x1a1030, w: 0xe8c45a, board: 0x6a2236, line: "#f0d890", frame: 0x2a0f18, metal: 0.8, rough: 0.25, emissive: false, bg: 0x140a10 },
  neon:    { b: 0xff3cac, w: 0x38e8ff, board: 0x12152a, line: "#5a6aff", frame: 0x05060c, metal: 0.3, rough: 0.3, emissive: true, bg: 0x05040e },
  marble:  { b: 0x1d2a33, w: 0xfafafa, board: 0xd8d8d8, line: "#444b52", frame: 0x2b2f33, metal: 0.1, rough: 0.12, emissive: false, bg: 0x0f1418 },
};

// ---------- 설정 ----------
const settings = { mode: "ai", diff: "2", color: "b", theme: "classic", time: "0", rule: "free", rotate: "0" };
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

// ---------- 전적 ----------
function loadRecord() {
  try { return JSON.parse(localStorage.getItem("omok3d_record")) || {}; } catch { return {}; }
}
function saveRecord(r) { try { localStorage.setItem("omok3d_record", JSON.stringify(r)); } catch {} }
function showRecord() {
  const r = loadRecord();
  const a = r.ai || { win: 0, loss: 0, draw: 0 };
  const p = r.pvp || { b: 0, w: 0, draw: 0 };
  $("record").textContent = settings.mode === "ai"
    ? `vs 컴퓨터 전적: ${a.win}승 ${a.loss}패 ${a.draw}무`
    : `2인 전적: 흑 ${p.b}승 · 백 ${p.w}승 · 무승부 ${p.draw}`;
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
  place: () => { tone(260, 0.05, "triangle", 0.25); tone(140, 0.08, "sine", 0.15, 0.01); },
  threat: () => { tone(660, 0.1, "square", 0.08); tone(880, 0.12, "square", 0.08, 0.1); },
  win: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.25, "triangle", 0.15, i * 0.13)),
  lose: () => [392, 330, 262, 196].forEach((f, i) => tone(f, 0.3, "sine", 0.15, i * 0.16)),
  tick: () => tone(1200, 0.03, "sine", 0.05),
};

// ================= THREE.js 장면 =================
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 500);
camera.position.set(0, 12, 9);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.maxPolarAngle = Math.PI * 0.44;
controls.minDistance = 6;
controls.maxDistance = 26;
controls.enablePan = false;

scene.add(new THREE.HemisphereLight(0xfff2e0, 0x202040, 0.6));
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
const floor = new THREE.Mesh(new THREE.CircleGeometry(60, 64), new THREE.MeshStandardMaterial({ color: 0x15121a, roughness: 0.9 }));
floor.rotation.x = -Math.PI / 2;
floor.position.y = -4.2;
floor.receiveShadow = true;
env.add(floor);
const tableMat = new THREE.MeshStandardMaterial({ color: 0x3b2414, roughness: 0.6 });
const table = new THREE.Mesh(new THREE.CylinderGeometry(9.5, 9.8, 0.5, 64), tableMat);
table.position.y = -0.95;
table.receiveShadow = true;
env.add(table);
const leg = new THREE.Mesh(new THREE.CylinderGeometry(1, 2.2, 3.2, 32), tableMat);
leg.position.y = -2.8;
env.add(leg);
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

// ---------- 바둑판 ----------
const BOARD = GAP * (N - 1) + 1.0; // 판 크기
const sqPos = (sq) => new THREE.Vector3((sq % N - HALF) * GAP, 0, (Math.floor(sq / N) - HALF) * GAP);
const boardCanvas = document.createElement("canvas");
boardCanvas.width = boardCanvas.height = 1024;
const boardTex = new THREE.CanvasTexture(boardCanvas);
const boardTopMat = new THREE.MeshStandardMaterial({ map: boardTex, roughness: 0.55 });
const boardSideMat = new THREE.MeshStandardMaterial({ roughness: 0.6 });
const frameMat = new THREE.MeshStandardMaterial({ roughness: 0.5 });
const boardMesh = new THREE.Mesh(new THREE.BoxGeometry(BOARD, 0.5, BOARD),
  [boardSideMat, boardSideMat, boardTopMat, boardSideMat, boardSideMat, boardSideMat]);
boardMesh.position.y = -0.25;
boardMesh.receiveShadow = true;
boardMesh.castShadow = true;
scene.add(boardMesh);
const frame = new THREE.Mesh(new THREE.BoxGeometry(BOARD + 0.3, 0.2, BOARD + 0.3), frameMat);
frame.position.y = -0.55;
frame.castShadow = true;
scene.add(frame);
// 판 다리
for (const [x, z] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
  const f = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.25, 0.2, 16), frameMat);
  f.position.set(x * (BOARD / 2 - 0.6), -0.72, z * (BOARD / 2 - 0.6));
  scene.add(f);
}
// 돌 통 (양옆)
const bowlMats = { b: new THREE.MeshStandardMaterial({ roughness: 0.5 }), w: new THREE.MeshStandardMaterial({ roughness: 0.5 }) };
for (const side of [-1, 1]) {
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.7, 0.7, 32, 1, true), frameMat);
  bowl.material.side = THREE.DoubleSide;
  bowl.position.set(side * (BOARD / 2 + 1.5), -0.35, side * 2.5);
  scene.add(bowl);
  const bottom = new THREE.Mesh(new THREE.CircleGeometry(0.7, 32), frameMat);
  bottom.rotation.x = -Math.PI / 2;
  bottom.position.set(side * (BOARD / 2 + 1.5), -0.68, side * 2.5);
  scene.add(bottom);
}

function drawBoardTexture(t) {
  const g = boardCanvas.getContext("2d");
  const W = 1024;
  const col = new THREE.Color(t.board);
  g.fillStyle = "#" + col.getHexString();
  g.fillRect(0, 0, W, W);
  // 나뭇결
  if (!t.emissive) {
    for (let i = 0; i < 120; i++) {
      g.strokeStyle = `rgba(0,0,0,${Math.random() * 0.05})`;
      g.lineWidth = 1 + Math.random() * 3;
      g.beginPath();
      const y = Math.random() * W;
      g.moveTo(0, y);
      g.bezierCurveTo(W / 3, y + Math.random() * 30 - 15, (2 * W) / 3, y + Math.random() * 30 - 15, W, y);
      g.stroke();
    }
  }
  const px = (i) => ((0.5 + i * GAP) / BOARD) * W;
  g.strokeStyle = t.line;
  g.lineWidth = 2.5;
  if (t.emissive) { g.shadowColor = t.line; g.shadowBlur = 8; }
  for (let i = 0; i < N; i++) {
    g.beginPath(); g.moveTo(px(0), px(i)); g.lineTo(px(N - 1), px(i)); g.stroke();
    g.beginPath(); g.moveTo(px(i), px(0)); g.lineTo(px(i), px(N - 1)); g.stroke();
  }
  g.lineWidth = 5;
  g.strokeRect(px(0), px(0), px(N - 1) - px(0), px(N - 1) - px(0));
  g.shadowBlur = 0;
  g.fillStyle = t.line;
  for (const r of [3, 7, 11]) for (const c of [3, 7, 11]) {
    g.beginPath(); g.arc(px(c), px(r), 8, 0, Math.PI * 2); g.fill();
  }
  boardTex.needsUpdate = true;
}

// ---------- 하이라이트 ----------
const hlGroup = new THREE.Group();
scene.add(hlGroup);
const hlMats = {
  last: new THREE.MeshBasicMaterial({ color: 0xff4040 }),
  hint: new THREE.MeshBasicMaterial({ color: 0x40a0ff, transparent: true, opacity: 0.8 }),
  win: new THREE.MeshBasicMaterial({ color: 0xffd044, transparent: true, opacity: 0.9 }),
};
const ghostMat = new THREE.MeshStandardMaterial({ transparent: true, opacity: 0.45 });

// ---------- 돌 ----------
const stoneGeo = new THREE.SphereGeometry(0.27, 32, 20);
const stoneMats = { b: new THREE.MeshStandardMaterial(), w: new THREE.MeshStandardMaterial() };
function createStone(color) {
  const m = new THREE.Mesh(stoneGeo, stoneMats[color]);
  m.scale.y = 0.42;
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}
const ghost = new THREE.Mesh(stoneGeo, ghostMat);
ghost.scale.y = 0.42;
ghost.visible = false;
scene.add(ghost);
// 통 안에 장식용 돌
for (const [c, side] of [["b", -1], ["w", 1]]) {
  for (let i = 0; i < 14; i++) {
    const s = createStone(c);
    const a = Math.random() * Math.PI * 2, r = Math.random() * 0.5;
    s.position.set(side * (BOARD / 2 + 1.5) + Math.cos(a) * r, -0.55 + Math.random() * 0.15, side * 2.5 + Math.sin(a) * r);
    s.rotation.set(Math.random(), Math.random(), Math.random());
    scene.add(s);
  }
}

function applyTheme(name) {
  const t = THEMES[name];
  for (const c of ["b", "w"]) {
    const m = stoneMats[c];
    m.color.setHex(t[c]);
    m.metalness = t.metal;
    m.roughness = t.rough;
    m.emissive.setHex(t.emissive ? t[c] : 0x000000);
    m.emissiveIntensity = t.emissive ? 0.4 : 0;
    m.needsUpdate = true;
  }
  boardSideMat.color.setHex(t.board).multiplyScalar(0.8);
  frameMat.color.setHex(t.frame);
  drawBoardTexture(t);
  scene.background = new THREE.Color(t.bg);
  scene.fog = new THREE.Fog(t.bg, 22, 60);
}
applyTheme("classic");

// ================= 게임 상태 =================
let G = null;
let meshAt = [];
let anims = [];
let effects = [];
let camGoal = null;

function clearMeshes() {
  for (const m of meshAt) if (m) scene.remove(m);
  meshAt = Array(N * N).fill(null);
  anims = [];
}

function newGame() {
  clearMeshes();
  const human = settings.mode === "ai" ? (settings.color === "r" ? (Math.random() < 0.5 ? "b" : "w") : settings.color) : null;
  const secs = +settings.time;
  G = {
    s: Omok.initState(),
    mode: settings.mode,
    level: +settings.diff,
    exact: settings.rule === "exact",
    human,
    ai: human ? Omok.opp(human) : null,
    clock: { b: secs * 1000, w: secs * 1000 },
    timed: secs > 0,
    perMove: secs * 1000,
    lastTick: performance.now(),
    history: [],
    lastMove: -1,
    hint: -1,
    win: null,
    over: false,
    thinking: false,
    bottom: human || "b",
  };
  setCamera(G.bottom, false);
  applyTheme(settings.theme);
  $("menu").classList.add("hidden");
  $("over-modal").classList.add("hidden");
  $("left").classList.remove("hidden");
  $("right").classList.remove("hidden");
  refresh();
  toast(G.mode === "ai" ? (G.human === "b" ? "당신은 흑! 선공입니다" : "당신은 백! 후공입니다") : "대국 시작!", "#ffe29a");
  maybeAI();
}

function rebuildMeshes() {
  clearMeshes();
  G.s.b.forEach((c, sq) => {
    if (!c) return;
    const m = createStone(c);
    m.position.copy(sqPos(sq));
    scene.add(m);
    meshAt[sq] = m;
  });
}

// ---------- 애니메이션 ----------
function animate(obj, to, dur, arc = 0, done) {
  anims = anims.filter((a) => a.obj !== obj);
  anims.push({ obj, from: obj.position.clone(), to: to.clone(), t0: performance.now(), dur, arc, done });
}
function burst(pos, color, n = 30) {
  const geo = new THREE.BufferGeometry();
  const arr = new Float32Array(n * 3);
  const vel = [];
  for (let i = 0; i < n; i++) {
    arr.set([pos.x, 0.2, pos.z], i * 3);
    vel.push(new THREE.Vector3((Math.random() - 0.5) * 3, Math.random() * 3 + 1, (Math.random() - 0.5) * 3));
  }
  geo.setAttribute("position", new THREE.BufferAttribute(arr, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color, size: 0.1, transparent: true }));
  scene.add(pts);
  effects.push({ pts, vel, t0: performance.now(), life: 800 });
}
function confetti() {
  const cols = [0xff5577, 0xffd044, 0x44ddff, 0x77ff88, 0xbb88ff];
  for (let k = 0; k < 6; k++) setTimeout(() => burst(new THREE.Vector3((Math.random() - 0.5) * 8, 0, (Math.random() - 0.5) * 8), cols[k % 5], 40), k * 150);
}
function setCamera(color, smooth = true) {
  const z = color === "b" ? 8.5 : -8.5;
  const goal = new THREE.Vector3(0, 12.5, z);
  if (smooth) camGoal = goal;
  else { camera.position.copy(goal); controls.target.set(0, 0, 0); camGoal = null; }
}

// ---------- 착수 ----------
function doMove(sq) {
  const me = G.s.turn;
  G.history.push({ s: G.s, lastMove: G.lastMove, clock: { ...G.clock } });
  G.s = Omok.applyMove(G.s, sq);
  G.lastMove = sq;
  G.hint = -1;
  if (G.timed) G.clock[me] = G.perMove; // 초읽기: 수마다 리셋
  G.clock[G.s.turn] = G.timed ? G.perMove : 0;

  const m = createStone(me);
  const to = sqPos(sq);
  m.position.copy(to).setY(2.5);
  scene.add(m);
  meshAt[sq] = m;
  animate(m, to, 280, 0, () => { SFX.place(); burst(to, me === "b" ? 0x888888 : 0xffffff, 14); });

  const line = Omok.winLine(G.s.b, sq, G.exact);
  if (line) {
    G.win = line;
    setTimeout(() => finish(me, "오목 완성!"), 320);
  } else if (G.s.count >= N * N) {
    finish(null, "판이 가득 참");
  } else {
    // 4목 경고
    let four = false;
    for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) if (Omok.lineLen(G.s.b, sq, me, dr, dc) === 4) four = true;
    if (four) setTimeout(() => { SFX.threat(); toast("4목!", "#ff6b6b"); }, 300);
  }
  if (!G.over && G.mode === "pvp" && settings.rotate === "1") {
    G.bottom = G.s.turn;
    setTimeout(() => setCamera(G.s.turn), 500);
  }
  refresh();
  setTimeout(maybeAI, 320);
}

function finish(winner, reason) {
  if (G.over) return;
  G.over = true;
  G.thinking = false;
  const rec = loadRecord();
  let title;
  if (G.mode === "ai") {
    rec.ai = rec.ai || { win: 0, loss: 0, draw: 0 };
    if (!winner) { rec.ai.draw++; title = "🤝 무승부"; }
    else if (winner === G.human) { rec.ai.win++; title = "🏆 승리!"; SFX.win(); confetti(); }
    else { rec.ai.loss++; title = "💀 패배..."; SFX.lose(); }
  } else {
    rec.pvp = rec.pvp || { b: 0, w: 0, draw: 0 };
    if (!winner) { rec.pvp.draw++; title = "🤝 무승부"; }
    else { rec.pvp[winner]++; title = `🏆 ${KNAME[winner]} 승리!`; confetti(); SFX.win(); }
  }
  saveRecord(rec);
  $("over-title").textContent = title;
  $("over-reason").textContent = reason + (winner ? ` · ${KNAME[winner]} 승` : "");
  $("over-stats").innerHTML =
    `총 ${G.s.count}수 진행<br>` +
    (G.mode === "ai" ? `vs 컴퓨터 전적: ${rec.ai.win}승 ${rec.ai.loss}패 ${rec.ai.draw}무` : `2인 전적: 흑 ${rec.pvp.b} · 백 ${rec.pvp.w} · 무 ${rec.pvp.draw}`);
  setTimeout(() => $("over-modal").classList.remove("hidden"), 1200);
  refresh();
}

// ---------- AI ----------
function maybeAI() {
  if (!G || G.over || G.mode !== "ai" || G.s.turn !== G.ai || G.thinking) return;
  G.thinking = true;
  refresh();
  const gameRef = G;
  setTimeout(() => {
    if (G !== gameRef || G.over) return;
    const sq = Omok.bestMove(G.s, G.level, G.exact);
    G.thinking = false;
    if (sq >= 0 && G === gameRef && !G.over) doMove(sq);
  }, 450);
}

// ---------- 입력 ----------
const ray = new THREE.Raycaster();
const mouse = new THREE.Vector2();
function pickSquare(ev) {
  mouse.x = (ev.clientX / innerWidth) * 2 - 1;
  mouse.y = -(ev.clientY / innerHeight) * 2 + 1;
  ray.setFromCamera(mouse, camera);
  const hit = ray.intersectObject(boardMesh)[0];
  if (!hit) return -1;
  const c = Math.round(hit.point.x / GAP + HALF), r = Math.round(hit.point.z / GAP + HALF);
  if (r < 0 || r >= N || c < 0 || c >= N) return -1;
  return r * N + c;
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
  if (sq < 0 || G.s.b[sq]) return;
  ghost.visible = false;
  doMove(sq);
});
renderer.domElement.addEventListener("pointermove", (e) => {
  if (!canHumanMove() || e.pointerType === "touch") { ghost.visible = false; return; }
  const sq = pickSquare(e);
  const ok = sq >= 0 && !G.s.b[sq];
  ghost.visible = ok;
  if (ok) {
    ghost.position.copy(sqPos(sq));
    ghostMat.color.copy(stoneMats[G.s.turn].color);
  }
  renderer.domElement.style.cursor = ok ? "pointer" : "default";
});

// ---------- 버튼 ----------
$("start-btn").onclick = newGame;
$("btn-again").onclick = newGame;
$("btn-tomenu").onclick = $("btn-menu").onclick = () => {
  if (G && !G.over && G.s.count && !confirm("진행 중인 게임을 그만두고 메뉴로 갈까요?")) return;
  if (G) G.over = true;
  $("over-modal").classList.add("hidden");
  $("menu").classList.remove("hidden");
  showRecord();
};
$("btn-review").onclick = () => $("over-modal").classList.add("hidden");
$("btn-flip").onclick = () => { if (!G) return; G.bottom = Omok.opp(G.bottom); setCamera(G.bottom); refresh(); };
$("btn-sound").onclick = () => { soundOn = !soundOn; $("btn-sound").textContent = soundOn ? "🔊 소리" : "🔇 소리"; };
$("btn-resign").onclick = () => {
  if (!G || G.over) return;
  const loser = G.mode === "ai" ? G.human : G.s.turn;
  if (confirm(`${KNAME[loser]}이(가) 기권할까요?`)) finish(Omok.opp(loser), `${KNAME[loser]} 기권`);
};
$("btn-undo").onclick = () => {
  if (!G || !G.history.length || G.thinking || anims.length) return;
  let steps = 1;
  if (G.mode === "ai") steps = G.s.turn === G.human ? 2 : 1;
  for (let i = 0; i < steps && G.history.length; i++) {
    const h = G.history.pop();
    G.s = h.s;
    G.lastMove = h.lastMove;
    G.clock = h.clock;
  }
  G.over = false;
  G.win = null;
  G.hint = -1;
  $("over-modal").classList.add("hidden");
  rebuildMeshes();
  if (G.mode === "pvp" && settings.rotate === "1") { G.bottom = G.s.turn; setCamera(G.bottom); }
  toast("무르기", "#ccc");
  refresh();
  maybeAI();
};
$("btn-hint").onclick = () => {
  if (!canHumanMove()) return;
  G.hint = Omok.bestMove(G.s, 3, G.exact);
  toast("💡 파란 표시를 참고하세요", "#7fc8ff");
  refresh();
};
addEventListener("keydown", (e) => {
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
  return (ms / 1000).toFixed(ms < 10000 ? 1 : 0) + "초";
}
function playerName(c) {
  if (G.mode === "ai") return c === G.human ? `나 (${KNAME[c]})` : `컴퓨터 (${KNAME[c]}) Lv.${G.level}`;
  return `플레이어 ${c === "b" ? 1 : 2} (${KNAME[c]})`;
}
function refresh() {
  if (!G) return;
  const top = Omok.opp(G.bottom), bottom = G.bottom;
  for (const [id, c] of [["card-top", top], ["card-bottom", bottom]]) {
    const card = $(id);
    card.classList.toggle("active", !G.over && G.s.turn === c);
    card.querySelector(".p-dot").style.background = c === "w" ? "#f5f0e6" : "#222";
    card.querySelector(".p-name").textContent = playerName(c);
    card.querySelector(".p-score").textContent = "";
    card.querySelector(".caps").textContent = `${G.s.b.filter((x) => x === c).length}개`;
    const clk = card.querySelector(".clock");
    clk.textContent = fmt(G.clock[c]);
    clk.classList.toggle("low", G.timed && G.s.turn === c && G.clock[c] < 5000 && !G.over);
  }
  $("status").textContent = G.over ? "게임 종료" : `${KNAME[G.s.turn]} 차례 · ${G.s.count + 1}수째`;
  $("thinking").classList.toggle("hidden", !G.thinking);
  $("btn-undo").disabled = !G.history.length;
  // 기보
  const mv = $("moves");
  let html = "";
  const seq = G.history.map((h, i) => (G.history[i + 1] ? G.history[i + 1].lastMove : G.lastMove));
  for (let i = 0; i < seq.length; i += 2) {
    const last = seq.length - 1;
    html += `<span class="n">${i / 2 + 1}.</span><span class="${i === last ? "last" : ""}">● ${Omok.sqName(seq[i])}</span>` +
      `<span class="${i + 1 === last ? "last" : ""}">${seq[i + 1] !== undefined ? "○ " + Omok.sqName(seq[i + 1]) : ""}</span>`;
  }
  mv.innerHTML = html;
  mv.scrollTop = mv.scrollHeight;
  drawHighlights();
}
const markGeo = new THREE.SphereGeometry(0.06, 12, 8);
const ringGeo = new THREE.TorusGeometry(0.3, 0.04, 8, 32);
function drawHighlights() {
  while (hlGroup.children.length) hlGroup.remove(hlGroup.children[0]);
  if (G.lastMove >= 0 && !G.win) {
    const mk = new THREE.Mesh(markGeo, hlMats.last);
    mk.position.copy(sqPos(G.lastMove)).setY(0.12);
    hlGroup.add(mk);
  }
  if (G.hint >= 0) {
    const r = new THREE.Mesh(ringGeo, hlMats.hint);
    r.rotation.x = -Math.PI / 2;
    r.position.copy(sqPos(G.hint)).setY(0.03);
    hlGroup.add(r);
  }
  if (G.win) for (const sq of G.win) {
    const r = new THREE.Mesh(ringGeo, hlMats.win);
    r.rotation.x = -Math.PI / 2;
    r.position.copy(sqPos(sq)).setY(0.13);
    hlGroup.add(r);
  }
}

// ---------- 메인 루프 ----------
let lastSecShown = -1;
function loop(now) {
  requestAnimationFrame(loop);
  if (G && !G.over && G.timed && G.s.count > 0) {
    const c = G.s.turn;
    G.clock[c] -= now - G.lastTick;
    const sec = Math.floor(G.clock[c] / 1000);
    if (sec !== lastSecShown) {
      lastSecShown = sec;
      if (G.clock[c] < 5000 && G.clock[c] > 0) SFX.tick();
      refresh();
    }
    if (G.clock[c] <= 0) { G.clock[c] = 0; finish(Omok.opp(c), `${KNAME[c]} 시간 초과`); }
  }
  if (G) G.lastTick = now;

  anims = anims.filter((a) => {
    const k = Math.min(1, (now - a.t0) / a.dur);
    const e = k * k;
    a.obj.position.lerpVectors(a.from, a.to, e);
    a.obj.position.y += Math.sin(Math.PI * k) * a.arc;
    if (k >= 1) { a.done && a.done(); return false; }
    return true;
  });
  effects = effects.filter((f) => {
    const k = (now - f.t0) / f.life;
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
  hlMats.win.opacity = 0.55 + Math.sin(now / 150) * 0.35;
  if (camGoal) {
    camera.position.lerp(camGoal, 0.06);
    if (camera.position.distanceTo(camGoal) < 0.05) camGoal = null;
  }
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
