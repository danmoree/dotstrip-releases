// Where the Download buttons point. Change it here, once, when a release ships.
const DOWNLOAD_URL = "https://dotstrip.app/DotStrip-1.2.zip";
const CHECKOUT_URL = "https://buy.polar.sh/polar_cl_HtOOStKwyMR6Mulgg7t9RXGylPc4l7e6icwK40GtFIe";

document.querySelectorAll("[data-download]").forEach(a => (a.href = DOWNLOAD_URL));
document.querySelectorAll("[data-checkout]").forEach(a => (a.href = CHECKOUT_URL || DOWNLOAD_URL));

// Umami custom events. Optional chaining makes this a no-op if the script is blocked.
const track = (selector, event) =>
  document.querySelectorAll(selector).forEach(a =>
    a.addEventListener("click", () => window.umami?.track(event, { location: a.closest("section, header, nav")?.id || "page" })));
track("[data-download]", "Download");
track("[data-checkout]", "Subscribe");

// Board colours. Every board is a looping clip recorded once per colour, so choosing a colour
// swaps the page's accent and points each clip at that colour's recording.
const THEMES = {
  amber: { on: [255, 184, 56],  panel: "#0f0d0a" },
  green: { on: [71, 255, 112],  panel: "#070f09" },
  red:   { on: [255, 69, 54],   panel: "#120808" },
  ice:   { on: [107, 209, 255], panel: "#070d12" },
  mono:  { on: [240, 242, 255], panel: "#0d0d0f" },
};

const clips = document.querySelectorAll(".clip video");
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

function setTheme(id) {
  const t = THEMES[id] || THEMES.amber, [r, g, b] = t.on;
  const root = document.documentElement.style;
  root.setProperty("--on", `rgb(${r},${g},${b})`);
  root.setProperty("--on-rgb", `${r},${g},${b}`);
  root.setProperty("--panel", t.panel);
  document.querySelectorAll("[data-theme]").forEach(el =>
    el.setAttribute("aria-pressed", el.dataset.theme === id));

  clips.forEach(v => {
    const src = `assets/clips/${THEMES[id] ? id : "amber"}/${v.dataset.clip}.mp4`;
    if (v.getAttribute("src") === src) return;
    const resume = v.currentTime || 0;
    v.src = src;
    // Carry on from the same moment, so the colour changes without the board restarting.
    v.addEventListener("loadedmetadata", () => {
      if (resume && v.duration) v.currentTime = resume % v.duration;
      // Autoplay does not apply to a source swapped in after the script has touched playback.
      if (reduceMotion || v.dataset.visible === "false") v.pause(); else v.play().catch(() => {});
    }, { once: true });
  });
  try { localStorage.setItem("dotstrip-theme", id); } catch (e) {}
}

let saved;
try { saved = localStorage.getItem("dotstrip-theme"); } catch (e) {}
setTheme(THEMES[saved] ? saved : "amber");
document.querySelectorAll("[data-theme]").forEach(el => el.addEventListener("click", () => setTheme(el.dataset.theme)));

// The clips only play while they are on screen, and not at all if the visitor asked for less motion.
if (reduceMotion) {
  clips.forEach(v => { v.removeAttribute("autoplay"); v.pause(); });
} else if ("IntersectionObserver" in window) {
  const watch = new IntersectionObserver(entries => entries.forEach(e => {
    e.target.dataset.visible = e.isIntersecting;
    if (e.isIntersecting) e.target.play().catch(() => {}); else e.target.pause();
  }), { rootMargin: "300px" });
  clips.forEach(v => watch.observe(v));
}
