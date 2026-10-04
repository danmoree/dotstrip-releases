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

const live = (id, zones, opts) => {
  const c = document.getElementById(id);
  if (c) new DotBoard.Board(c, zones, opts);
};

// The demo panel behaves like the app: the stock and weather windows turn over
// the way DotStripApp rotates them, the sun blooms, and the song's progress bar
// runs along the top row. The weather rests on the temperature for 12s here
// rather than the app's 30s, so a visitor sees it turn.
const QUOTES = ["AAPL  314.91  \u25b2 1.6%", "MSFT  484.10  \u25b2 0.5%", "NVDA  188.20  \u25bc 0.8%"];
const WEATHER = ["\u2600 99\u00b0", "\u25b2 101\u00b0", "\u25bc 78\u00b0"];
// How far through the demo track it is after `s` seconds: a 60s loop, starting part way in.
const SONG = s => (0.38 + s / 60) % 1;
const panel = () => [
  { text: "\u266a Mink - fakemink", flex: true, progress: SONG },
  { rotate: QUOTES, dwell: 5 },
  { rotate: WEATHER, dwell: [12, 5, 5] },
];
live("bar-board", panel(), { cols: window.BAR_COLS });
live("hero-board", panel());
// Graphics mode: the whole board handed to the dog, as in the app.
live("dog-board", [{ graphic: "dog", flex: true }], { cols: 72 });
live("card-music",   [{ text: "\u266a Mink - fakemink", flex: true, progress: SONG }], { cols: 72, speed: 24 });
live("card-news",    [{ text: "Markets rally as chipmakers lead gains   Storm system moves up the coast   ", flex: true }], { cols: 72, speed: 30 });
live("card-stocks",  [{ rotate: QUOTES, dwell: 5 }], { cols: 108, center: true });
live("card-weather", [{ rotate: WEATHER, dwell: [12, 5, 5] }], { cols: 40, center: true });

DotBoard.start();
