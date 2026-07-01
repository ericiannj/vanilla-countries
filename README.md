<p align="center">
  <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f30d.png" width="72" alt="🌍" />
</p>

<h1 align="center">vanilla-countries</h1>

<p align="center">
  An interactive world atlas built with vanilla HTML, CSS, and JavaScript — no frameworks, no build step.
</p>

---

## Why

Most mapping apps pull in heavy dependencies. This one doesn't. The goal was to build a fully interactive, data-rich geography tool using only what the browser already provides — no bundler, no framework, no runtime compilation. Just files served over HTTP.

- **Zero dependencies** — no npm package does the heavy lifting, everything is hand-rolled
- **No build step** — open it, serve it, it works
- **Full interactivity** — click, zoom, pan, compare, and track countries you know, all in plain JS

## Features

- **Interactive SVG Map** — Click countries on a world map. Visual states for hover, selected, and known countries are reflected directly on the SVG paths.
- **Zoom & Pan Navigation** — Mouse wheel to zoom, click-and-drag to pan, pinch-to-zoom on touch screens. On-screen +/−/⊙ buttons on desktop. Zoom and pan are bounded so the map always fills the viewport — no black borders, no zooming out past the fill level.
- **Country Details** — Flag, name, capital, population, area, region, subregion, languages, currencies, and neighboring countries, loaded from a bundled local dataset. Clicking a border chip navigates to that country. Data is cached in memory for the session.
- **Known Countries** — Toggle any selected country as known. Known countries are highlighted on the map and counted in a live header widget. State persists across page reloads via `localStorage`.
- **Country Comparator** — Add up to two countries from the detail panel to compare them side by side. A bar at the bottom shows current comparison slots; the panel expands to display the full comparison table.

## Quick Start

The app has no build step, but it **must be served over HTTP** — opening `index.html` directly as a `file://` URL will not work. The SVG world map and the country dataset are both loaded at runtime via `fetch()`. Browsers block `fetch` on the `file://` protocol due to CORS policy.

```bash
npm start
```

This runs `npx serve .` and serves the project on **http://localhost:3000**.

## Project Structure

```
vanilla-countries/
├── index.html          # Semantic page structure
├── styles.css          # Variables, reset, layout, responsive, components
├── main.js             # CONFIG, DOM, CountriesAtlasApp class
├── assets/
│   ├── world-map.svg   # Interactive SVG world map
│   └── countries.json  # Bundled country dataset
└── README.md
```

## Data

Country details are loaded from the bundled `assets/countries.json` file rather than a live third-party API. This dataset was assembled from [mledoze/countries](https://github.com/mledoze/countries) (names, capitals, area, region, languages, currencies, borders) and the [World Bank population dataset](https://github.com/datasets/population) (most recent available population per country). No API key or network access to a third party is required. Responses are cached in a `Map` for the duration of the session to avoid redundant lookups. If a code can't be found, the detail panel shows a friendly error message.

This project originally relied on the REST Countries API (`restcountries.com`), but its `v1`–`v4` endpoints were permanently discontinued and the replacement `v5` API requires an authenticated API key — which can't be kept secret in a fully static, client-side app. Bundling a static dataset keeps the project dependency-free and avoids relying on third-party API uptime.

### Map geometry

`assets/world-map.svg` country borders are simplified using the [Ramer–Douglas–Peucker algorithm](https://en.wikipedia.org/wiki/Ramer%E2%80%93Douglas%E2%80%93Peucker_algorithm), which keeps border rendering consistent at any zoom level.

### Country counts

- **250** entries in `assets/countries.json` — every territory with its own ISO 3166-1 alpha-2 code, not just sovereign states. This includes dependencies and administrative regions such as Puerto Rico, Hong Kong, Greenland, or French Guiana, which have a code but aren't independent countries.
- **~195** is the commonly cited number of sovereign states (193 UN member states plus the Holy See and Palestine as observers). The gap between this and the 250 above is exactly those non-sovereign territories.
- **174** countries are actually selectable on the world map, limited by the level of detail of the SVG — see **SVG coverage** below.

## Known Limitations

- **SVG coverage** — The world map SVG only has paths for 174 of the 250 entries in the dataset, mostly missing small island nations, microstates, and dependent territories (e.g. Malta, Singapore, Hong Kong, Curaçao, most Caribbean and Pacific island states). Countries not present in the SVG cannot be selected on the map, even though they exist in `assets/countries.json` and can still be reached as a border chip from a neighboring country.
- **Static snapshot** — Country data is bundled at a point in time rather than fetched live, so figures like population will drift out of date until `assets/countries.json` is refreshed. Around 35 territories have no population figure and show `—`.
- **No keyboard map navigation** — Individual countries on the SVG map are not reachable via keyboard tab navigation. The app is mouse/touch-driven for map interaction.
- **Mobile zoom controls** — The on-screen +/−/⊙ buttons are hidden on mobile viewports. Pinch-to-zoom and single-finger pan gestures are the intended interaction on touch devices.
- **Emoji flags** — Country flags are rendered as Unicode emoji, which may display differently across operating systems and browsers.
- **localStorage** — If the browser blocks or clears `localStorage`, known countries will not persist between sessions. The app falls back silently.
