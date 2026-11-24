const N = 19, GOAL = 18 * N + 18, CDLEN = 10;
const DNAMES = ['NE', 'NW', 'SE', 'SW'];
const DV = { NE: [1, 0], NW: [0, 1], SE: [0, -1], SW: [-1, 0] };
const ARROW = { NE: '↗', NW: '↖', SE: '↘', SW: '↙' };
const CW = { TL: 'SE', TR: 'SW', BL: 'NE', BR: 'NW' };
let Fset = new Set();
function setFloor(list) { Fset = new Set(list.map(s => { const [a, b] = s.split(',').map(Number); return a * N + b; })); }
function inF(a, b) { return a >= 0 && b >= 0 && a < N && b < N && Fset.has(a * N + b); }

function fireArr(arr, state) {
  let c = null, sc = null;
  for (const k in arr) { if (arr[k] === state) c = k; if (arr[k] === 'Sec') sc = k; }
  const n = Object.assign({}, arr); n[c] = 'Sec'; n[sc] = state;
  return [CW[c], n, c];
}
function dist(p, walls) {
  const g = GOAL, s = p[0] * N + p[1];
  if (s === g) return 0;
  const seen = new Set([s]); let q = [s], k = 0;
  while (q.length) {
    k++; const nq = [];
    for (const c of q) {
      const a = (c / N) | 0, b = c % N;
      for (const d of DNAMES) {
        const x = a + DV[d][0], y = b + DV[d][1];
        if (!inF(x, y)) continue;
        const id = x * N + y;
        if (seen.has(id) || walls.includes(id)) continue;
        if (id === g) return k;
        seen.add(id); nq.push(id);
      }
    }
    q = nq;
  }
  return 999;
}
function addWall(w, p, wd) {
  const x = p[0] + DV[wd][0], y = p[1] + DV[wd][1];
  if (!inF(x, y)) return [w, null];
  const id = x * N + y;
  if (w.includes(id)) return [w, null];
  return [w.concat([id]).sort((u, v) => u - v), [x, y]];
}
// start: [a,b]; walls: int[]; arr: corner->golem; fires: string[]; cd: int
function staticDist() {
  const d = new Map([[GOAL, 0]]); let q = [GOAL];
  while (q.length) {
    const nq = [];
    for (const c of q) {
      const a = (c / N) | 0, b = c % N;
      for (const k of DNAMES) {
        const x = a + DV[k][0], y = b + DV[k][1];
        if (!inF(x, y)) continue;
        const id = x * N + y;
        if (!d.has(id)) { d.set(id, d.get(c) + 1); nq.push(id); }
      }
    }
    q = nq;
  }
  return d;
}
const BEAM = 5000;
function* planGen(start, walls0, arr0, fires, cd0) {
  const SD = staticDist();
  const arrAt = [arr0], wdAt = [];
  for (const f of fires) { const [wd, na] = fireArr(arrAt[arrAt.length - 1], f); wdAt.push(wd); arrAt.push(na); }
  let layer = new Map();
  const w0 = walls0.slice().sort((u, v) => u - v);
  layer.set(start.join() + '|' + w0.join() + '|' + cd0, { p: start, w: w0, c: cd0, prev: null, act: null });
  let used = 0;
  for (let i = 0; i < fires.length; i++) {
    used = i + 1;
    const next = new Map(), wd = wdAt[i];
    for (const node of layer.values()) {
      const p = node.p, w = node.w, c = node.c;
      const opts = [{ act: 'PASSE', p: p, c: Math.max(c - 1, 0) }];
      for (const d of DNAMES) {
        const x = p[0] + DV[d][0], y = p[1] + DV[d][1];
        if (!inF(x, y) || w.includes(x * N + y)) continue;
        opts.push({ act: d, p: [x, y], c: Math.max(c - 1, 0) });
        if (c === 0) {
          for (const d2 of DNAMES) {
            const x2 = x + DV[d2][0], y2 = y + DV[d2][1];
            if (!inF(x2, y2) || w.includes(x2 * N + y2) || (x2 === p[0] && y2 === p[1])) continue;
            opts.push({ act: 'RAPIDE', dirs: [d, d2], p: [x2, y2], c: CDLEN - 1 });
          }
        }
      }
      for (const o of opts) {
        const [w2, tgt] = addWall(w, o.p, wd);
        const key = o.p.join() + '|' + w2.join() + '|' + o.c;
        if (!next.has(key)) next.set(key, { p: o.p, w: w2, c: o.c, prev: node, act: o.act, dirs: o.dirs, wd: wd, tgt: tgt });
      }
    }
    if (next.size > BEAM) {
      const arr = [...next.entries()].map(([k, n]) => [SD.has(n.p[0] * N + n.p[1]) ? SD.get(n.p[0] * N + n.p[1]) : 999, k, n]);
      arr.sort((u, v) => u[0] - v[0]);
      layer = new Map(arr.slice(0, BEAM).map(e => [e[1], e[2]]));
    } else layer = next;
    yield i;
    let atGoal = false;
    for (const nd of layer.values()) if (nd.p[0] * N + nd.p[1] === GOAL) { atGoal = true; break; }
    if (atGoal) break;
  }
  const final = arrAt[used];
  let sc = null;
  for (const k in final) if (final[k] === 'Sec') sc = k;
  const possible = ['TL', 'TR', 'BL', 'BR'].filter(k => k !== sc).map(k => CW[k]);
  let best = null;
  const cand = [];
  let dmin = 999;
  for (const node of layer.values()) {
    const d0 = dist(node.p, node.w);
    if (d0 >= 999) continue;
    node.d0 = d0; if (d0 < dmin) dmin = d0; cand.push(node);
  }
  let cnt = 0;
  for (const node of cand) {
    const d0 = node.d0;
    if (d0 > dmin + 1) continue;
    if (++cnt % 150 === 0) yield cnt;
    let worst = 0;
    for (const wd of possible) {
      let br = 999;
      for (const d of [null].concat(DNAMES)) {
        let n = node.p;
        if (d) {
          n = [node.p[0] + DV[d][0], node.p[1] + DV[d][1]];
          if (!inF(n[0], n[1]) || node.w.includes(n[0] * N + n[1])) continue;
        }
        const [w2] = addWall(node.w, n, wd);
        br = Math.min(br, dist(n, w2) + (d ? 0 : 1));
      }
      worst = Math.max(worst, br);
    }
    const score = [d0, worst, -node.c];
    if (!best || score[0] < best.score[0] || (score[0] === best.score[0] && (score[1] < best.score[1] || (score[1] === best.score[1] && score[2] < best.score[2])))) best = { score, node };
  }
  if (!best) return null;
  const steps = [];
  for (let n = best.node; n.prev; n = n.prev) steps.push({ act: n.act, dirs: n.dirs, p: n.p, wd: n.wd, tgt: n.tgt, from: n.prev.p });
  steps.reverse();
  return { score: best.score, steps, final: best.node, arr: final };
}

function plan(start, walls0, arr0, fires, cd0) {
  const g = planGen(start, walls0, arr0, fires, cd0);
  let r; do { r = g.next(); } while (!r.done);
  return r.value;
}
