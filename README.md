# Vanilla Countries

An interactive world atlas built with vanilla HTML, CSS, and JavaScript — no frameworks, no build step.

## Features

- **Interactive SVG Map** — Click countries on a world map. Visual states for hover, selected, and known countries are reflected directly on the SVG paths.
- **Country Details** — Flag, name, capital, population, area, region, subregion, languages, currencies, and neighboring countries, loaded from the REST Countries API. Clicking a border chip navigates to that country. API results are cached in memory for the session.
- **Known Countries** — Toggle any selected country as known. Known countries are highlighted on the map and counted in a live header widget. State persists across page reloads via `localStorage`.
- **Country Comparator** — Add up to two countries from the detail panel to compare them side by side. A bar at the bottom shows current comparison slots; the panel expands to display the full comparison table.

## Running Locally

The app has no build step, but it **must be served over HTTP** — opening `index.html` directly as a `file://` URL will not work. The SVG world map is loaded at runtime via `fetch()` so JavaScript can interact with individual country `<path>` elements. Browsers block `fetch` on the `file://` protocol due to CORS policy.

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
│   └── world-map.svg   # Interactive SVG world map
└── README.md
```

## API

Data is fetched from `https://restcountries.com/v3.1/alpha/{code}`. No API key is required. Responses are cached in a `Map` for the duration of the session to avoid redundant requests. If a request fails, the detail panel shows a friendly error message.

## Known Limitations

- **SVG coverage** — The world map SVG includes most sovereign states but may be missing some small island nations or territories. Countries not present in the SVG cannot be selected on the map.
- **API availability** — The app depends on the public REST Countries API. If the API is unavailable or rate-limits requests, the detail panel will show an error. Cached results from the same session remain available.
- **No keyboard map navigation** — Individual countries on the SVG map are not reachable via keyboard tab navigation. The app is mouse/touch-driven for map interaction.
- **Emoji flags** — Country flags are rendered as Unicode emoji, which may display differently across operating systems and browsers.
- **localStorage** — If the browser blocks or clears `localStorage`, known countries will not persist between sessions. The app falls back silently.
