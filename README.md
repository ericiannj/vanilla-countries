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
- **Country Details** — Flag, name, capital, population, area, region, subregion, languages, currencies, and neighboring countries, fetched per country from countries-api. Clicking a border chip navigates to that country. Responses are cached in memory for the session, so re-selecting a country costs no request.
- **Known Countries** — Toggle any selected country as known. Known countries are highlighted on the map and counted in a live header widget. State persists across page reloads via `localStorage`.
- **Country Comparator** — Add up to two countries from the detail panel to compare them side by side. A bar at the bottom shows current comparison slots; the panel expands to display the full comparison table.

## Quick Start

The app needs two things running: the API that serves country data, and an HTTP server for these static files.

**1. Start the API** (from a checkout of `countries-api`, requires Docker):

```bash
docker compose up -d
```

This brings up Postgres and the API on **http://localhost:8000**, applying the schema and the 250-country seed on first boot. Verify with `curl http://localhost:8000/health`.

**2. Start the frontend:**

```bash
npm start
```

This runs `npx serve .` on **http://localhost:3000**.

The app has no build step, but it **must be served over HTTP** — opening `index.html` as a `file://` URL will not work, because browsers block `fetch` on the `file://` protocol.

By default the frontend looks for the API at `http://localhost:8000`. Point it somewhere else with the `api` query parameter:

```
http://localhost:3000/?api=https://your-api-host
```

Without a reachable API the map, zoom/pan, and the known-countries counter still work; selecting a country shows an error state instead of data.

## Project Structure

```
vanilla-countries/
├── index.html          # Semantic page structure
├── styles.css          # Variables, reset, layout, responsive, components
├── main.js             # CONFIG, DOM, CountriesAtlasApp class
├── assets/
│   ├── world-map.svg   # Interactive SVG world map
│   └── countries.json  # Legacy dataset — no longer read, kept for reference
└── README.md
```

## Data

Country details come from `countries-api`, a companion FastAPI + PostgreSQL service. The frontend requests one country at a time via `GET /countries/{cca2}` and caches each response in a `Map` for the session. If a request fails, the detail panel distinguishes a country the API has no record of from an API it could not reach at all.

The underlying dataset was assembled from [mledoze/countries](https://github.com/mledoze/countries) (names, capitals, area, region, languages, currencies, borders) and the [World Bank population dataset](https://github.com/datasets/population) (most recent available population per country). It now lives as the seed data in `countries-api`, applied by an Alembic migration.

This project first relied on the REST Countries API (`restcountries.com`), but its `v1`–`v4` endpoints were permanently discontinued and the replacement `v5` API requires an authenticated API key, which can't be kept secret in a static client-side app. The stopgap was bundling that dataset into `assets/countries.json`. Serving it from an API we control removes the third-party dependency without going back to a hardcoded snapshot in the client.

### Map geometry

`assets/world-map.svg` country borders are simplified using the [Ramer–Douglas–Peucker algorithm](https://en.wikipedia.org/wiki/Ramer%E2%80%93Douglas%E2%80%93Peucker_algorithm), which keeps border rendering consistent at any zoom level.

### Country counts

- **250** entries in the API's dataset — every territory with its own ISO 3166-1 alpha-2 code, not just sovereign states. This includes dependencies and administrative regions such as Puerto Rico, Hong Kong, Greenland, or French Guiana, which have a code but aren't independent countries.
- **~195** is the commonly cited number of sovereign states (193 UN member states plus the Holy See and Palestine as observers). The gap between this and the 250 above is exactly those non-sovereign territories.
- **174** countries are actually selectable on the world map, limited by the level of detail of the SVG — see **SVG coverage** below.

## Known Limitations

- **SVG coverage** — The world map SVG only has paths for 174 of the 250 entries in the dataset, mostly missing small island nations, microstates, and dependent territories (e.g. Malta, Singapore, Hong Kong, Curaçao, most Caribbean and Pacific island states). Countries not present in the SVG cannot be selected on the map, even though the API serves them and they can still be reached as a border chip from a neighboring country.
- **Requires the API** — Country details need `countries-api` reachable. With no API, the map still renders and known-countries still works, but selecting a country shows an error state. The deployed site currently defaults to `http://localhost:8000`, so country data only loads when the API is running locally.
- **Dataset snapshot** — The API's seed data was captured at a point in time, so figures like population drift out of date until the seed is refreshed. Around 35 territories have no population figure and show `—`.
- **No keyboard map navigation** — Individual countries on the SVG map are not reachable via keyboard tab navigation. The app is mouse/touch-driven for map interaction.
- **Mobile zoom controls** — The on-screen +/−/⊙ buttons are hidden on mobile viewports. Pinch-to-zoom and single-finger pan gestures are the intended interaction on touch devices.
- **Emoji flags** — Country flags are rendered as Unicode emoji, which may display differently across operating systems and browsers.
- **localStorage** — If the browser blocks or clears `localStorage`, known countries will not persist between sessions. The app falls back silently.
