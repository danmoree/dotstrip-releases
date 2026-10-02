// Live LED boards. Same 5x7 hand-drawn font and the same rules as the app:
// the text moves in whole dot-columns, never in subpixel steps.
(function () {
  const G = window.DOT_GLYPHS;
  const ROWS = 11, TOP = 2, SPACE = 2, GAP = 1;
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

  function raster(text) {
    const out = [];
    const blank = () => new Array(ROWS).fill(0);
    for (const ch of text) {
      if (ch === " ") { for (let i = 0; i < SPACE; i++) out.push(blank()); }
      else {
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

  // A board is a row of zones. A zone is { text, width? } — a zone with no
  // width takes whatever is left, and scrolls if its text doesn't fit.
  class Board {
    constructor(canvas, zones, opts = {}) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
      this.speed = opts.speed || 30;      // columns per second
      this.cols = opts.cols || 176;
      this.zones = zones.map(z => {
        // a zone with `frames` cycles through them in place, like the app's weather zone
        const frames = (z.frames || [z.text || ""]).map(raster);
        const widest = Math.max(...frames.map(f => f.length));
        return { ...z, frames, bits: frames.reduce((a, f) => f.length > a.length ? f : a), widest };
      });
      this.layout();
      this.resize();
      boards.push(this);
    }
    layout() {
      const ZG = 7, n = this.zones.length;
      const fixed = this.zones.reduce((a, z) => a + (z.flex ? 0 : z.widest), 0);
      this.gap = ZG;
      this.zones.forEach(z => {
        z.w = z.flex ? Math.max(8, this.cols - fixed - (n - 1) * ZG) : z.widest;
      });
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
    draw(t) {
      if (!this.lattice) this.buildLattice();
      const { ctx, dpr } = this, p = this.pitch * dpr, r = p * 0.36;
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      ctx.drawImage(this.lattice, 0, 0);
      const step = still ? 0 : Math.floor(t * this.speed / 1000);
      const on = theme.on.join(",");
      ctx.shadowColor = `rgba(${on},.85)`; ctx.shadowBlur = p * 1.1;
      ctx.fillStyle = `rgb(${on})`;
      ctx.beginPath();
      let x0 = 0;
      for (const z of this.zones) {
        const bits = z.frames.length > 1 ? z.frames[Math.floor(t / 2600) % z.frames.length] : z.bits;
        const n = bits.length;
        const scrolls = n > z.w;
        for (let i = 0; i < z.w; i++) {
          let src;
          if (scrolls) src = (i + step) % (n + Math.max(24, z.w));
          else src = i;
          const col = bits[src];
          if (!col) continue;
          for (let j = 0; j < ROWS; j++) if (col[j]) {
            const cx = (x0 + i + .5) * p, cy = (j + .5) * p;
            ctx.moveTo(cx + r, cy); ctx.arc(cx, cy, r, 0, 7);
          }
        }
        x0 += z.w + this.gap;
      }
      ctx.fill();
      // zone dividers
      ctx.shadowBlur = 0; ctx.fillStyle = `rgba(${on},.28)`; ctx.beginPath();
      let dx = 0;
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
