# Vanilla Countries

An interactive world atlas built with vanilla HTML, CSS, and JavaScript — no frameworks, no build step.

## Features

1. **Interactive Map** — Click countries on an SVG world map. Visual states for hover, selected, and known countries.
2. **Country Details** — Flag, name, capital, population, area, languages, currencies and more, loaded from the REST Countries API. Results cached in memory.
3. **Known Countries** — Mark or unmark the selected country as visited. Persisted in `localStorage`. A global counter shows how many countries you have marked.
4. **Country Comparator** — Compare two countries side by side directly from the detail panel.

## Tech Stack

- HTML5
- CSS3 (custom properties, grid, flexbox, responsive)
- Vanilla JavaScript ES6+ (one main class, no dependencies)
- [REST Countries API v3.1](https://restcountries.com)
- `localStorage` for persistence

## Running Locally

The app has no build step, but it **must be served over HTTP** — opening `index.html` directly as a `file://` URL will not work. This is because the SVG world map (`assets/world-map.svg`) is loaded at runtime via `fetch()` and injected into the DOM, so JavaScript can access individual country `<path>` elements to apply interactive classes like `selected` and `known`. Browsers block `fetch` requests on the `file://` protocol due to CORS policy.

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

Data fetched from `https://restcountries.com/v3.1/alpha/{code}`. No API key required. Responses are cached in a `Map` for the duration of the session to avoid repeated requests.

