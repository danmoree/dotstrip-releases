// Live LED boards. Same 5x7 hand-drawn font and the same rules as the app:
// the text moves in whole dot-columns, never in subpixel steps. Windows that
// hold several lines turn over the way TextLayer.Change.pushUp does in
// Board.swift, the sun blooms like PixelFontData's variants, and a zone can
// carry the ProgressLayer bar along the top row.
(function () {
  const G = window.DOT_GLYPHS;
  const V = window.DOT_VARIANTS || {};
  const ROWS = 11, TOP = 2, SPACE = 2, GAP = 1;
  // Timing copied from the app (TextLayer / DotStripApp).
  const ROWS_PER_SEC = 30;       // changeRowsPerSecond
  const DWELL = 0.5;             // changeDwell, the beat before and after a turn
  const GLYPH_RATE = 3;          // glyphAnimationRate
  const TRAVEL = ROWS;           // Board.rows - glyphTop + 1: the band plus a blank row
  const THEMES = {
    amber: { name: "Amber", on: [255, 184, 56],  panel: "#0f0d0a", unlit: 0.075 },
    green: { name: "Green", on: [71, 255, 112],  panel: "#070f09", unlit: 0.065 },
    red:   { name: "Red",   on: [255, 69, 54],   panel: "#120808", unlit: 0.085 },
    ice:   { name: "Ice",   on: [107, 209, 255], panel: "#070d12", unlit: 0.065 },
    mono:  { name: "White", on: [240, 242, 255], panel: "#0d0d0f", unlit: 0.055 },
  };
  let theme = THEMES.amber;
  const boards = [];
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const blank = () => new Array(ROWS).fill(0);

  // A glyph with several drawings is trimmed as a group, to the widest extent
  // any frame reaches, so a sparse frame keeps the position the full one set.
  const variantCache = {};
  function variantFrames(ch) {
    if (variantCache[ch]) return variantCache[ch];
    const frames = V[ch].map(rows => {
      const w = Math.max(...rows.map(r => r.length));
      return Array.from({ length: w }, (_, x) => rows.map(r => r[x] === "#" ? 1 : 0));
    });
    const width = Math.max(...frames.map(f => f.length));
    const lit = [];
    for (let x = 0; x < width; x++) if (frames.some(f => f[x] && f[x].some(Boolean))) lit.push(x);
    const empty = new Array(ROWS - TOP).fill(0);
    return (variantCache[ch] = frames.map(f => {
      const cols = [];
      for (let x = lit[0]; x <= lit[lit.length - 1]; x++) cols.push([0, 0].concat(f[x] || empty));
      return cols;
    }));
  }

  // How many drawings a line cycles through. One means it is still.
  const frameCount = text => Math.max(1, ...[...text].map(ch => V[ch] ? V[ch].length : 1));

  function raster(text, frame = 0) {
    const out = [];
    for (const ch of text) {
      if (ch === " ") { for (let i = 0; i < SPACE; i++) out.push(blank()); }
      else if (V[ch]) {
        const f = variantFrames(ch);
        for (const c of f[frame % f.length]) out.push(c);
      } else {
        const rows = G[ch] || G["A"];
        let cols = [];
        for (let x = 0; x < rows[0].length; x++) cols.push(rows.map(r => r[x] === "#" ? 1 : 0));
        const lit = cols.map((c, i) => c.some(Boolean) ? i : -1).filter(i => i >= 0);
        if (lit.length) cols = cols.slice(lit[0], lit[lit.length - 1] + 1);
        for (const c of cols) out.push([0, 0].concat(c));
      }
      for (let i = 0; i < GAP; i++) out.push(blank());
    }
    return out;
  }

  // ---- Graphics mode: the dog, ported from DogGraphic in Graphics.swift. ----
  // Same poses (read out of the Swift source by tools/make_site_assets.py),
  // same moods, same ranges. Sprites are held as one bitmask per column, bit r
  // set when row r is on, exactly as the app does it.
  const BOARD_MASK = (1 << ROWS) - 1;
  const sprite = art => {
    const w = Math.max(...art.map(r => r.length));
    const cols = new Array(w).fill(0);
    art.forEach((line, row) => { for (let c = 0; c < line.length; c++) if (line[c] === "#") cols[c] |= 1 << row; });
    return { w, h: art.length, cols };
  };
  const mirror = s => ({ ...s, cols: s.cols.slice().reverse() });
  const rand = (a, b) => a + Math.random() * (b - a);

  // Rows pushed off the panel fall out of the shift, which is the clipping.
  function stamp(s, x, top, columns) {
    for (let i = 0; i < s.w; i++) {
      const at = x + i;
      if (at < 0 || at >= columns.length) continue;
      let bits = s.cols[i];
      if (top >= 0) { if (top >= ROWS) continue; bits <<= top; }
      else { if (-top >= s.h) continue; bits >>= -top; }
      columns[at] |= bits & BOARD_MASK;
    }
  }

  function makeDog() {
    const D = window.DOT_DOG;
    const art = {
      trot: D.trot.map(sprite), sniff: sprite(D.sniff[0]), sit: D.sit.map(sprite),
      sleep: sprite(D.sleep[0]), z: sprite(D.z[0]),
    };
    const left = {
      trot: art.trot.map(mirror), sniff: mirror(art.sniff), sit: art.sit.map(mirror), sleep: mirror(art.sleep),
    };
    let mood = "trotting", until = null, began = 0, x = 4, facing = 1, speed = 9, width = 0, last = null;

    const begin = (next, t) => {
      mood = next; began = t;
      until = t + (next === "trotting" ? rand(3.5, 9) : next === "sniffing" ? rand(1.6, 3.2)
                 : next === "sitting" ? rand(3, 7) : rand(9, 16));
      // Sometimes it has somewhere to be.
      if (next === "trotting") speed = Math.random() < 0.25 ? 16 : rand(6, 10);
    };
    // Only a trot leads anywhere else; everything else goes back to trotting.
    const choose = t => {
      if (mood !== "trotting") return begin("trotting", t);
      const r = Math.random();
      begin(r < 0.42 ? "sniffing" : r < 0.82 ? "sitting" : "sleeping", t);
    };

    return {
      render(columns, t) {
        if (width !== columns.length) { width = columns.length; x = Math.min(x, width / 2); }
        const dt = Math.min(0.1, t - (last ?? t));
        last = t;
        if (until === null) begin("trotting", t);
        if (t >= until) choose(t);
        if (mood === "trotting") {
          x += speed * dt * facing;
          const w = art.trot[0].w;
          if (x < 0) { x = 0; facing = 1; }
          else if (x + w > width) { x = width - w; facing = -1; }
        }

        const right = facing > 0;
        let s;
        if (mood === "trotting") { const f = Math.floor(t / 0.14) % 2; s = (right ? art.trot : left.trot)[f]; }   // seven steps a second
        else if (mood === "sniffing") s = right ? art.sniff : left.sniff;
        else if (mood === "sitting") { const f = Math.floor(t * 4) % 2; s = (right ? art.sit : left.sit)[f]; }    // the wag
        else s = right ? art.sleep : left.sleep;

        // Whatever it is doing, its feet are on the bottom row.
        stamp(s, Math.round(x), ROWS - s.h, columns);

        if (mood === "sleeping") {
          // A Z rises off the head and slides off the top of the board, solid the whole way.
          const age = (t - began) % 2.6;
          const head = right ? x + s.w - 4 : x + 1;
          stamp(art.z, Math.round(head), ROWS - s.h - art.z.h + 2 - Math.round(age * 3.6), columns);
        }
      },
    };
  }
  const GRAPHICS = { dog: makeDog };

  // A board is a row of zones. A zone is { text, flex? } — a flex zone takes
  // whatever is left, and scrolls if its text doesn't fit. A zone with
  // `rotate: [text, ...]` is a window that turns over between lines, like the
  // app's stock and weather windows; `dwell` is how long each line stays
  // (seconds, one number or one per line). `progress(seconds)` returns 0..1
  // and lights that much of the zone's top row, like the song's progress bar.
  // `graphic: "dog"` hands the whole zone to one of graphics mode's animations.
  class Board {
    constructor(canvas, zones, opts = {}) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
      this.speed = opts.speed || 30;      // columns per second
      this.cols = opts.cols || 176;
      this.center = !!opts.center;        // centre the zones on the board, and each line in its zone
      this.zones = zones.map(z => {
        const layer = z.graphic && GRAPHICS[z.graphic]();
        const lines = z.rotate || [z.text || ""];
        // items[line][glyphFrame] = columns
        const items = lines.map(t => Array.from({ length: frameCount(t) }, (_, f) => raster(t, f)));
        const widest = Math.max(...items.flat().map(f => f.length));
        const dwell = lines.map((_, i) => Array.isArray(z.dwell) ? z.dwell[i] : (z.dwell || 5));
        return { ...z, layer, items, widest, dwell, total: dwell.reduce((a, b) => a + b, 0) };
      });
      this.layout();
      this.resize();
      boards.push(this);
    }
    layout() {
      const ZG = 7, n = this.zones.length;
      const fixed = this.zones.reduce((a, z) => a + (z.flex ? 0 : z.widest), 0);
      this.gap = ZG;
      this.inset = 0;
      this.zones.forEach(z => {
        z.w = z.flex ? Math.max(8, this.cols - fixed - (n - 1) * ZG) : z.widest;
      });
      if (this.center) {
        const used = this.zones.reduce((a, z) => a + z.w, 0) + (n - 1) * ZG;
        this.inset = Math.max(0, Math.floor((this.cols - used) / 2));
      }
    }
    resize() {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      const w = this.canvas.clientWidth;
      this.pitch = w / this.cols;
      this.canvas.width = Math.round(w * dpr);
      this.canvas.height = Math.round(this.pitch * ROWS * dpr);
      this.canvas.style.aspectRatio = `${this.cols} / ${ROWS}`;
      this.dpr = dpr;
      this.lattice = null;
    }
    buildLattice() {
      const c = document.createElement("canvas");
      c.width = this.canvas.width; c.height = this.canvas.height;
      const x = c.getContext("2d");
      const p = this.pitch * this.dpr, r = p * 0.36;
      x.fillStyle = `rgba(${theme.on.join(",")},${theme.unlit})`;
      for (let i = 0; i < this.cols; i++) for (let j = 0; j < ROWS; j++) {
        x.beginPath(); x.arc((i + .5) * p, (j + .5) * p, r, 0, 7); x.fill();
      }
      this.lattice = c;
    }
    // The drawing of line `i` right now: a glyph with several frames (the sun)
    // moves on three times a second, whatever the line is doing.
    lineBits(z, i, lt) {
      const frames = z.items[i];
      if (frames.length === 1) return frames[0];
      return frames[still ? Math.min(2, frames.length - 1) : Math.floor(lt * GLYPH_RATE) % frames.length];
    }
    // What a zone is showing: one or two lines, each shifted down the panel.
    // Mirrors TextLayer's .pushUp. The app turns a window when its rotation
    // timer fires; the old line holds for DWELL, rises out of the band while
    // the new one follows it up, then the new one holds.
    layers(z, lt) {
      const n = z.items.length;
      if (n === 1) return [{ bits: this.lineBits(z, 0, lt), shift: 0 }];
      // start at rest on the first line, just after its turn has finished
      const tt = (lt + DWELL + TRAVEL / ROWS_PER_SEC + .05) % z.total;
      let m = 0, at = 0;
      for (let k = 0, f = 0; k < n; f += z.dwell[k++]) if (f <= tt) { m = k; at = f; }
      const dt = tt - at, prev = (m + n - 1) % n;
      if (dt < DWELL) return [{ bits: this.lineBits(z, prev, lt), shift: 0 }];
      const advance = Math.min(TRAVEL, Math.round((dt - DWELL) * ROWS_PER_SEC));
      if (advance >= TRAVEL) return [{ bits: this.lineBits(z, m, lt), shift: 0 }];
      return [
        { bits: this.lineBits(z, prev, lt), shift: -advance },
        { bits: this.lineBits(z, m, lt), shift: TRAVEL - advance },
      ];
    }
    draw(t) {
      if (!this.lattice) this.buildLattice();
      const { ctx, dpr } = this, p = this.pitch * dpr, r = p * 0.36;
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      ctx.drawImage(this.lattice, 0, 0);
      const step = still ? 0 : Math.floor(t * this.speed / 1000);
      if (this.t0 == null) this.t0 = t;
      const lt = still ? 0 : (t - this.t0) / 1000;
      const on = theme.on.join(",");
      ctx.shadowColor = `rgba(${on},.85)`; ctx.shadowBlur = p * 1.1;
      ctx.fillStyle = `rgb(${on})`;
      ctx.beginPath();
      const dot = (x, y) => { const cx = (x + .5) * p, cy = (y + .5) * p; ctx.moveTo(cx + r, cy); ctx.arc(cx, cy, r, 0, 7); };
      let x0 = this.inset;
      for (const z of this.zones) {
        const layers = this.layers(z, lt);
        const scrolls = layers.length === 1 && layers[0].bits.length > z.w;
        for (const { bits, shift } of layers) {
          const n = bits.length;
          // `center` sits a standing line in the middle of its zone, which the app never does
          const lead = !scrolls && this.center ? Math.floor((z.w - n) / 2) : 0;
          for (let i = 0; i < z.w; i++) {
            const src = scrolls ? (i + step) % (n + Math.max(24, z.w)) : i - lead;
            const col = bits[src];
            if (!col) continue;
            for (let j = 0; j < ROWS; j++) if (col[j]) {
              const row = j + shift;
              // a turning line is clipped to the text band, which is what makes it look like a window
              if (shift && (row < 1 || row >= ROWS)) continue;
              dot(x0 + i, row);
            }
          }
        }
        if (z.layer) {
          const cols = new Array(z.w).fill(0);
          z.layer.render(cols, lt);
          for (let i = 0; i < z.w; i++) if (cols[i]) for (let j = 0; j < ROWS; j++) if (cols[i] >> j & 1) dot(x0 + i, j);
        }
        if (z.progress) {
          const lit = Math.round(Math.max(0, Math.min(1, z.progress(lt))) * z.w);
          for (let i = 0; i < lit; i++) dot(x0 + i, 0);
        }
        x0 += z.w + this.gap;
      }
      ctx.fill();
      // zone dividers
      ctx.shadowBlur = 0; ctx.fillStyle = `rgba(${on},.28)`; ctx.beginPath();
      let dx = this.inset;
      this.zones.slice(0, -1).forEach(z => {
        dx += z.w;
        const cx = (dx + this.gap / 2 - .5 + .5) * p;
        for (let j = 1; j < ROWS - 1; j++) { ctx.moveTo(cx + r, (j + .5) * p); ctx.arc(cx, (j + .5) * p, r, 0, 7); }
        dx += this.gap;
      });
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  function frame(t) { boards.forEach(b => b.draw(t)); if (!still) requestAnimationFrame(frame); }

  function setTheme(id) {
    theme = THEMES[id]; const [r, g, b] = theme.on;
    const root = document.documentElement.style;
    root.setProperty("--on", `rgb(${r},${g},${b})`);
    root.setProperty("--on-rgb", `${r},${g},${b}`);
    root.setProperty("--panel", theme.panel);
    boards.forEach(b => { b.lattice = null; if (still) b.draw(0); });
    document.querySelectorAll("[data-theme]").forEach(el =>
      el.setAttribute("aria-pressed", el.dataset.theme === id));
    try { localStorage.setItem("dotstrip-theme", id); } catch (e) {}
  }

  window.addEventListener("resize", () => { boards.forEach(b => { b.resize(); if (still) b.draw(0); }); });

  window.DotBoard = { Board, setTheme, THEMES, start() {
    let saved; try { saved = localStorage.getItem("dotstrip-theme"); } catch (e) {}
    setTheme(THEMES[saved] ? saved : "amber");
    document.querySelectorAll("[data-theme]").forEach(el =>
      el.addEventListener("click", () => setTheme(el.dataset.theme)));
    requestAnimationFrame(frame);
    if (still) boards.forEach(b => b.draw(0));
  } };
})();
