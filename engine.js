// ================= 체스 규칙 엔진 (국제 규칙) =================
// 보드: 길이 64 배열, index = row*8 + col, row 0 = 8랭크(흑 진영), row 7 = 1랭크(백 진영)
// 기물: "wp", "bk" 처럼 [색][종류]  (p n b r q k)
const Chess = (() => {
  const FILES = "abcdefgh";
  const KN = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
  const KG = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
  const ORTHO = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  const DIAG = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  const PTS = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
  const VAL = { p: 100, n: 320, b: 335, r: 500, q: 900, k: 0 };

  const inside = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;
  const opp = (c) => (c === "w" ? "b" : "w");
  const sqName = (i) => FILES[i & 7] + (8 - (i >> 3));

  function initState() {
    const b = Array(64).fill(null);
    const back = "rnbqkbnr";
    for (let c = 0; c < 8; c++) {
      b[c] = "b" + back[c];
      b[8 + c] = "bp";
      b[48 + c] = "wp";
      b[56 + c] = "w" + back[c];
    }
    return { b, turn: "w", castle: { wK: true, wQ: true, bK: true, bQ: true }, ep: -1, half: 0, full: 1 };
  }

  function isAttacked(b, sq, by) {
    const r = sq >> 3, c = sq & 7;
    const pr = by === "w" ? r + 1 : r - 1;
    for (const dc of [-1, 1]) {
      if (inside(pr, c + dc) && b[pr * 8 + c + dc] === by + "p") return true;
    }
    for (const [dr, dc] of KN) {
      if (inside(r + dr, c + dc) && b[(r + dr) * 8 + c + dc] === by + "n") return true;
    }
    for (const [dr, dc] of KG) {
      if (inside(r + dr, c + dc) && b[(r + dr) * 8 + c + dc] === by + "k") return true;
    }
    for (const [dr, dc] of ORTHO) {
      let rr = r + dr, cc = c + dc;
      while (inside(rr, cc)) {
        const p = b[rr * 8 + cc];
        if (p) { if (p === by + "r" || p === by + "q") return true; break; }
        rr += dr; cc += dc;
      }
    }
    for (const [dr, dc] of DIAG) {
      let rr = r + dr, cc = c + dc;
      while (inside(rr, cc)) {
        const p = b[rr * 8 + cc];
        if (p) { if (p === by + "b" || p === by + "q") return true; break; }
        rr += dr; cc += dc;
      }
    }
    return false;
  }

  const kingSq = (b, color) => b.indexOf(color + "k");
  const inCheck = (s, color = s.turn) => isAttacked(s.b, kingSq(s.b, color), opp(color));

  function applyMove(s, m) {
    const b = s.b.slice();
    const p = b[m.f];
    const me = p[0];
    let cap = b[m.t];
    b[m.t] = m.promo ? me + m.promo : p;
    b[m.f] = null;
    if (m.flag === "ep") {
      const cs = m.t + (me === "w" ? 8 : -8);
      cap = b[cs];
      b[cs] = null;
    } else if (m.flag === "castleK") {
      b[m.f + 1] = b[m.f + 3]; b[m.f + 3] = null;
    } else if (m.flag === "castleQ") {
      b[m.f - 1] = b[m.f - 4]; b[m.f - 4] = null;
    }
    const castle = { ...s.castle };
    if (p[1] === "k") { castle[me + "K"] = false; castle[me + "Q"] = false; }
    if (m.f === 63 || m.t === 63) castle.wK = false;
    if (m.f === 56 || m.t === 56) castle.wQ = false;
    if (m.f === 7 || m.t === 7) castle.bK = false;
    if (m.f === 0 || m.t === 0) castle.bQ = false;
    return {
      b,
      turn: opp(me),
      castle,
      ep: m.flag === "double" ? (m.f + m.t) / 2 : -1,
      half: p[1] === "p" || cap ? 0 : s.half + 1,
      full: s.full + (me === "b" ? 1 : 0),
      cap: cap || null,
    };
  }

  function genMoves(s, capturesOnly = false) {
    const b = s.b, me = s.turn, op = opp(me);
    const out = [];
    const push = (f, t, extra) => {
      if (capturesOnly && !b[t] && !(extra && extra.flag === "ep")) return;
      out.push(Object.assign({ f, t }, extra));
    };
    for (let sq = 0; sq < 64; sq++) {
      const p = b[sq];
      if (!p || p[0] !== me) continue;
      const r = sq >> 3, c = sq & 7, t = p[1];
      if (t === "p") {
        const dir = me === "w" ? -1 : 1;
        const start = me === "w" ? 6 : 1;
        const last = me === "w" ? 0 : 7;
        const r1 = r + dir;
        const addP = (to, extra) => {
          if (r1 === last) for (const pr of "qrbn") out.push(Object.assign({ f: sq, t: to, promo: pr }, extra));
          else push(sq, to, extra);
        };
        if (inside(r1, c) && !b[r1 * 8 + c]) {
          if (!capturesOnly || r1 === last) addP(r1 * 8 + c);
          const r2 = r + 2 * dir;
          if (r === start && !b[r2 * 8 + c] && !capturesOnly) out.push({ f: sq, t: r2 * 8 + c, flag: "double" });
        }
        for (const dc of [-1, 1]) {
          const cc = c + dc;
          if (!inside(r1, cc)) continue;
          const to = r1 * 8 + cc;
          if (b[to] && b[to][0] === op) addP(to);
          else if (to === s.ep) push(sq, to, { flag: "ep" });
        }
      } else if (t === "n" || t === "k") {
        for (const [dr, dc] of t === "n" ? KN : KG) {
          const rr = r + dr, cc = c + dc;
          if (!inside(rr, cc)) continue;
          const q = b[rr * 8 + cc];
          if (!q || q[0] === op) push(sq, rr * 8 + cc);
        }
        if (t === "k" && !capturesOnly) {
          const home = me === "w" ? 60 : 4;
          if (sq === home && !isAttacked(b, sq, op)) {
            if (s.castle[me + "K"] && !b[sq + 1] && !b[sq + 2] && b[sq + 3] === me + "r" &&
                !isAttacked(b, sq + 1, op) && !isAttacked(b, sq + 2, op))
              out.push({ f: sq, t: sq + 2, flag: "castleK" });
            if (s.castle[me + "Q"] && !b[sq - 1] && !b[sq - 2] && !b[sq - 3] && b[sq - 4] === me + "r" &&
                !isAttacked(b, sq - 1, op) && !isAttacked(b, sq - 2, op))
              out.push({ f: sq, t: sq - 2, flag: "castleQ" });
          }
        }
      } else {
        const dirs = t === "r" ? ORTHO : t === "b" ? DIAG : ORTHO.concat(DIAG);
        for (const [dr, dc] of dirs) {
          let rr = r + dr, cc = c + dc;
          while (inside(rr, cc)) {
            const q = b[rr * 8 + cc];
            if (!q) push(sq, rr * 8 + cc);
            else { if (q[0] === op) push(sq, rr * 8 + cc); break; }
            rr += dr; cc += dc;
          }
        }
      }
    }
    // 자기 킹을 체크에 두는 수 제거
    return out.filter((m) => {
      const ns = applyMove(s, m);
      return !isAttacked(ns.b, kingSq(ns.b, me), op);
    });
  }

  function toSAN(s, m, legal) {
    if (m.flag === "castleK") return withCheck(s, m, "O-O");
    if (m.flag === "castleQ") return withCheck(s, m, "O-O-O");
    const p = s.b[m.f];
    const isCap = !!s.b[m.t] || m.flag === "ep";
    let str = "";
    if (p[1] === "p") {
      if (isCap) str = FILES[m.f & 7] + "x";
      str += sqName(m.t);
      if (m.promo) str += "=" + m.promo.toUpperCase();
    } else {
      str = p[1].toUpperCase();
      const amb = legal.filter((o) => o.t === m.t && o.f !== m.f && s.b[o.f] === p);
      if (amb.length) {
        const sameFile = amb.some((o) => (o.f & 7) === (m.f & 7));
        const sameRank = amb.some((o) => o.f >> 3 === m.f >> 3);
        if (!sameFile) str += FILES[m.f & 7];
        else if (!sameRank) str += 8 - (m.f >> 3);
        else str += sqName(m.f);
      }
      if (isCap) str += "x";
      str += sqName(m.t);
    }
    return withCheck(s, m, str);
  }
  function withCheck(s, m, str) {
    const ns = applyMove(s, m);
    if (inCheck(ns)) str += genMoves(ns).length ? "+" : "#";
    return str;
  }

  function insufficient(b) {
    const rest = [];
    for (let i = 0; i < 64; i++) if (b[i] && b[i][1] !== "k") rest.push([b[i], i]);
    if (rest.length === 0) return true;
    if (rest.length === 1 && (rest[0][0][1] === "b" || rest[0][0][1] === "n")) return true;
    if (rest.every(([p]) => p[1] === "b")) {
      const colors = new Set(rest.map(([, i]) => ((i >> 3) + (i & 7)) % 2));
      if (colors.size === 1) return true;
    }
    return false;
  }
  // 특정 색이 상대를 메이트할 재료가 있는지 (시간패 판정용)
  function canMate(b, color) {
    const mine = [];
    for (let i = 0; i < 64; i++) if (b[i] && b[i][0] === color && b[i][1] !== "k") mine.push(b[i][1]);
    if (mine.length === 0) return false;
    if (mine.length === 1 && (mine[0] === "b" || mine[0] === "n")) return false;
    return true;
  }

  const posKey = (s) =>
    s.b.map((p) => p || "-").join("") + s.turn +
    (s.castle.wK ? "K" : "") + (s.castle.wQ ? "Q" : "") + (s.castle.bK ? "k" : "") + (s.castle.bQ ? "q" : "") + s.ep;

  // ================= AI (네가맥스 + 알파베타 + 정지탐색) =================
  const PST = {
    p: [0,0,0,0,0,0,0,0, 50,50,50,50,50,50,50,50, 10,10,20,30,30,20,10,10, 5,5,10,25,25,10,5,5,
        0,0,0,22,22,0,0,0, 5,-5,-10,0,0,-10,-5,5, 5,10,10,-20,-20,10,10,5, 0,0,0,0,0,0,0,0],
    n: [-50,-40,-30,-30,-30,-30,-40,-50, -40,-20,0,0,0,0,-20,-40, -30,0,10,15,15,10,0,-30, -30,5,15,20,20,15,5,-30,
        -30,0,15,20,20,15,0,-30, -30,5,10,15,15,10,5,-30, -40,-20,0,5,5,0,-20,-40, -50,-40,-30,-30,-30,-30,-40,-50],
    b: [-20,-10,-10,-10,-10,-10,-10,-20, -10,0,0,0,0,0,0,-10, -10,0,5,10,10,5,0,-10, -10,5,5,10,10,5,5,-10,
        -10,0,10,10,10,10,0,-10, -10,10,10,10,10,10,10,-10, -10,5,0,0,0,0,5,-10, -20,-10,-10,-10,-10,-10,-10,-20],
    r: [0,0,0,0,0,0,0,0, 5,10,10,10,10,10,10,5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5,
        -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, 0,0,0,5,5,0,0,0],
    q: [-20,-10,-10,-5,-5,-10,-10,-20, -10,0,0,0,0,0,0,-10, -10,0,5,5,5,5,0,-10, -5,0,5,5,5,5,0,-5,
        0,0,5,5,5,5,0,-5, -10,5,5,5,5,5,0,-10, -10,0,5,0,0,0,0,-10, -20,-10,-10,-5,-5,-10,-10,-20],
    k: [-30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30,
        -20,-30,-30,-40,-40,-30,-30,-20, -10,-20,-20,-20,-20,-20,-20,-10, 20,20,0,0,0,0,20,20, 20,30,10,0,0,10,30,20],
    ke: [-50,-40,-30,-20,-20,-30,-40,-50, -30,-20,-10,0,0,-10,-20,-30, -30,-10,20,30,30,20,-10,-30, -30,-10,30,40,40,30,-10,-30,
         -30,-10,30,40,40,30,-10,-30, -30,-10,20,30,30,20,-10,-30, -30,-30,0,0,0,0,-30,-30, -50,-30,-30,-30,-30,-30,-30,-50],
  };

  function evaluate(s) {
    let sc = 0, mat = 0;
    for (let i = 0; i < 64; i++) { const p = s.b[i]; if (p && p[1] !== "k" && p[1] !== "p") mat += VAL[p[1]]; }
    const endgame = mat <= 1600;
    for (let i = 0; i < 64; i++) {
      const p = s.b[i];
      if (!p) continue;
      const t = p[1];
      const idx = p[0] === "w" ? i : i ^ 56;
      const v = VAL[t] + (t === "k" && endgame ? PST.ke[idx] : PST[t][idx]);
      sc += p[0] === "w" ? v : -v;
    }
    return s.turn === "w" ? sc : -sc;
  }

  function order(s, moves) {
    for (const m of moves) {
      const v = s.b[m.t];
      m._o = (v ? 10 * VAL[v[1]] - VAL[s.b[m.f][1]] / 10 : 0) + (m.promo === "q" ? 800 : 0) + (m.flag === "ep" ? 900 : 0);
    }
    moves.sort((a, b) => b._o - a._o);
    return moves;
  }

  let nodes = 0;
  function quiesce(s, a, beta, qd) {
    nodes++;
    const stand = evaluate(s);
    if (stand >= beta) return beta;
    if (stand > a) a = stand;
    if (qd <= 0) return a;
    for (const m of order(s, genMoves(s, true))) {
      const v = -quiesce(applyMove(s, m), -beta, -a, qd - 1);
      if (v >= beta) return beta;
      if (v > a) a = v;
    }
    return a;
  }

  function negamax(s, depth, a, beta, ply, qd) {
    nodes++;
    if (s.half >= 100) return 0;
    const moves = genMoves(s);
    if (!moves.length) return inCheck(s) ? -100000 + ply : 0;
    if (depth <= 0) return quiesce(s, a, beta, qd);
    for (const m of order(s, moves)) {
      const v = -negamax(applyMove(s, m), depth - 1, -beta, -a, ply + 1, qd);
      if (v >= beta) return beta;
      if (v > a) a = v;
    }
    return a;
  }

  // level 1: 쉬움, 2: 보통, 3: 어려움
  function bestMove(s, level) {
    const moves = order(s, genMoves(s));
    if (!moves.length) return null;
    const depth = level === 1 ? 1 : level === 2 ? 3 : 4;
    const qd = level === 1 ? 0 : level === 2 ? 3 : 4;
    const noise = level === 1 ? 120 : level === 2 ? 15 : 0;
    nodes = 0;
    let best = null, bestV = -Infinity;
    let a = -Infinity;
    for (const m of moves) {
      let v = -negamax(applyMove(s, m), depth - 1, -Infinity, noise ? Infinity : -a, 1, qd);
      v += (Math.random() - 0.5) * noise;
      if (v > bestV) { bestV = v; best = m; }
      if (!noise && v > a) a = v;
    }
    return best;
  }

  return { initState, genMoves, applyMove, isAttacked, inCheck, kingSq, toSAN, insufficient, canMate, posKey, bestMove, sqName, PTS, opp };
})();
