// Where the Download buttons point. Change it here, once, when a release ships.
const DOWNLOAD_URL = "https://dotstrip.app/DotStrip-1.1.zip";
const CHECKOUT_URL = "https://buy.polar.sh/polar_cl_HtOOStKwyMR6Mulgg7t9RXGylPc4l7e6icwK40GtFIe";

document.querySelectorAll("[data-download]").forEach(a => (a.href = DOWNLOAD_URL));
document.querySelectorAll("[data-checkout]").forEach(a => (a.href = CHECKOUT_URL || DOWNLOAD_URL));

const live = (id, zones, opts) => {
  const c = document.getElementById(id);
  if (c) new DotBoard.Board(c, zones, opts);
};

const STOCKS = "AAPL  314.91  \u25b2 1.6%";
live("bar-board", [
  { text: "\u266a Mink - fakemink", flex: true },
  { text: STOCKS },
  { frames: ["\u2600 99\u00b0", "\u25b2 101\u00b0", "\u25bc 78\u00b0"] },
], { cols: window.BAR_COLS });
live("hero-board", [
  { text: "\u266a Mink - fakemink", flex: true },
  { text: STOCKS },
  { frames: ["\u2600 99\u00b0", "\u25b2 101\u00b0", "\u25bc 78\u00b0"] },
]);
live("card-music",   [{ text: "\u266a Mink - fakemink", flex: true }], { cols: 72, speed: 24 });
live("card-news",    [{ text: "Markets rally as chipmakers lead gains   Storm system moves up the coast   ", flex: true }], { cols: 72, speed: 30 });
live("card-stocks",  [{ text: "AAPL  314.91  \u25b2 1.6%   MSFT  484.10  \u25b2 0.5%   NVDA  188.20  \u25bc 0.8%   ", flex: true }], { cols: 72, speed: 26 });
live("card-weather", [{ frames: ["\u2600 99\u00b0", "\u25b2 101\u00b0", "\u25bc 78\u00b0"] }], { cols: 40 });

DotBoard.start();
