// ================= 오목 규칙 엔진 =================
// 보드: 길이 N*N 배열, index = r*N + c, 값: null | "b" | "w"  (흑 선공)
const Omok = (() => {
  const N = 15;
  const DIRS = [[0, 1], [1, 0], [1, 1], [1, -1]];
  const COLS = "ABCDEFGHIJKLMNO";
  const opp = (c) => (c === "b" ? "w" : "b");
  const inside = (r, c) => r >= 0 && r < N && c >= 0 && c < N;
  const sqName = (i) => COLS[i % N] + (N - Math.floor(i / N));

  function initState() {
    return { b: Array(N * N).fill(null), turn: "b", count: 0 };
  }
  function applyMove(s, sq) {
    const b = s.b.slice();
    b[sq] = s.turn;
    return { b, turn: opp(s.turn), count: s.count + 1 };
  }

  // sq에 color 돌이 놓였다고 가정하고 방향별 연속 개수
  function lineLen(b, sq, color, dr, dc) {
    const r0 = Math.floor(sq / N), c0 = sq % N;
    let n = 1;
    for (const k of [1, -1]) {
      let r = r0 + dr * k, c = c0 + dc * k;
      while (inside(r, c) && b[r * N + c] === color) { n++; r += dr * k; c += dc * k; }
    }
    return n;
  }

  // 승리 라인 반환 (없으면 null). exact=true면 정확히 5목만 인정
  function winLine(b, sq, exact) {
    const color = b[sq];
    if (!color) return null;
    const r0 = Math.floor(sq / N), c0 = sq % N;
    for (const [dr, dc] of DIRS) {
      const cells = [sq];
      for (const k of [1, -1]) {
        let r = r0 + dr * k, c = c0 + dc * k;
        while (inside(r, c) && b[r * N + c] === color) { cells.push(r * N + c); r += dr * k; c += dc * k; }
      }
      if (exact ? cells.length === 5 : cells.length >= 5) return cells;
    }
    return null;
  }

  // ----- 패턴 평가 (AI용) -----
  // 한 방향에서 sq에 color를 둘 때의 형태 점수
  function dirScore(b, sq, color, dr, dc) {
    const r0 = Math.floor(sq / N), c0 = sq % N;
    let count = 1, open = 0, gapBonus = 0;
    for (const k of [1, -1]) {
      let r = r0 + dr * k, c = c0 + dc * k;
      while (inside(r, c) && b[r * N + c] === color) { count++; r += dr * k; c += dc * k; }
      if (inside(r, c) && b[r * N + c] === null) {
        open++;
        // 한 칸 띈 연결 (예: ●●_●)
        const r2 = r + dr * k, c2 = c + dc * k;
        if (inside(r2, c2) && b[r2 * N + c2] === color) gapBonus++;
      }
    }
    if (count >= 5) return 1000000;
    if (count === 4) return open === 2 ? 100000 : open === 1 ? 12000 : 0;
    if (count === 3) {
      if (gapBonus && open >= 1) return 12000; // 띈 4
      return open === 2 ? 8000 : open === 1 ? 600 : 0;
    }
    if (count === 2) {
      if (gapBonus && open === 2) return 5000; // 띈 3
      return open === 2 ? 500 : open === 1 ? 60 : 0;
    }
    if (gapBonus && open === 2) return 300;
    return open === 2 ? 20 : open === 1 ? 4 : 0;
  }
  function cellScore(b, sq, color) {
    let s = 0, big = 0;
    for (const [dr, dc] of DIRS) {
      const v = dirScore(b, sq, color, dr, dc);
      s += v;
      if (v >= 5000) big++;
    }
    if (big >= 2) s += 60000; // 쌍삼/사삼 등 복합 위협
    return s;
  }

  function candidates(b) {
    const out = [];
    let any = false;
    for (let i = 0; i < N * N; i++) {
      if (b[i]) { any = true; continue; }
      const r = Math.floor(i / N), c = i % N;
      let near = false;
      for (let dr = -2; dr <= 2 && !near; dr++)
        for (let dc = -2; dc <= 2; dc++)
          if (inside(r + dr, c + dc) && b[(r + dr) * N + c + dc]) { near = true; break; }
      if (near) out.push(i);
    }
    if (!any) out.push(Math.floor(N / 2) * N + Math.floor(N / 2));
    return out;
  }

  function scored(s) {
    const me = s.turn, op = opp(me);
    return candidates(s.b)
      .map((sq) => ({ sq, v: cellScore(s.b, sq, me) * 1.1 + cellScore(s.b, sq, op) }))
      .sort((a, b) => b.v - a.v);
  }

  function bestMove(s, level = 2, exact = false) {
    const list = scored(s);
    if (!list.length) return -1;
    // 즉시 승리 / 즉시 방어
    for (const { sq } of list) {
      const b = s.b.slice(); b[sq] = s.turn;
      if (winLine(b, sq, exact)) return sq;
    }
    for (const { sq } of list) {
      const b = s.b.slice(); b[sq] = opp(s.turn);
      if (winLine(b, sq, exact)) return sq;
    }
    if (level <= 1) {
      // 쉬움: 상위 후보 중 랜덤
      const top = list.slice(0, Math.min(6, list.length));
      return top[Math.floor(Math.random() * top.length)].sq;
    }
    if (level === 2) {
      const top = list.filter((x) => x.v >= list[0].v * 0.9).slice(0, 3);
      return top[Math.floor(Math.random() * top.length)].sq;
    }
    // 어려움: 상위 후보에 대해 상대 최선 응수를 고려한 2수 탐색
    let best = list[0].sq, bestV = -Infinity;
    for (const { sq, v } of list.slice(0, 10)) {
      const ns = applyMove(s, sq);
      const reply = scored(ns)[0];
      const val = v - (reply ? reply.v * 0.85 : 0);
      if (val > bestV) { bestV = val; best = sq; }
    }
    return best;
  }

  return { N, opp, initState, applyMove, winLine, bestMove, sqName, lineLen };
})();
