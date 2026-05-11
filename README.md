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

## Local Usage

No build step. Open `index.html` directly in any modern browser, or use a local server:

```bash
# Node
npx serve .

# Python
python3 -m http.server 8000
```

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

