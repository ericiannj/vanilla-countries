const CONFIG = {
  API_BASE_URL: 'https://restcountries.com/v3.1/alpha',
  STORAGE_KEY: 'vanillaCountries.knownCountries',
};

const SELECTORS = {
  knownCount: '#knownCount',
  knownCounterWidget: '#knownCounterWidget',
  mapContainer: '#mapContainer',
  mapHint: '#mapHint',
  detailCard: '#detailCard',
  cardClose: '#cardClose',
  cardFlag: '#cardFlag',
  cardCommon: '#cardCommon',
  cardOfficial: '#cardOfficial',
  cardGrid: '#cardGrid',
  cardChips: '#cardChips',
  btnKnown: '#btnKnown',
  btnCompare: '#btnCompare',
  comparatorBar: '#comparatorBar',
  comparatorSlot1: '#comparatorSlot1',
  comparatorSlot2: '#comparatorSlot2',
};

const DOM = Object.entries(SELECTORS).reduce((acc, [key, selector]) => {
  acc[key] = document.querySelector(selector);
  return acc;
}, {});

class CountriesAtlasApp {
  constructor() {
    this.selectedCountryCode = null;
    this.knownCountries = new Set();
    this.comparisonCountries = [];
    this.countryCache = new Map();
    this.init();
  }

  init() {
    this.loadKnownCountries();
    this.loadMap();
    this.bindEvents();
    this.updateKnownCounter();
  }

  loadKnownCountries() {
    try {
      const stored = localStorage.getItem(CONFIG.STORAGE_KEY);
      if (stored) {
        this.knownCountries = new Set(JSON.parse(stored));
      }
    } catch {
      this.knownCountries = new Set();
    }
  }

  saveKnownCountries() {
    try {
      localStorage.setItem(
        CONFIG.STORAGE_KEY,
        JSON.stringify([...this.knownCountries])
      );
    } catch {
      // localStorage unavailable — silently ignore
    }
  }

  async loadMap() {
    try {
      const res = await fetch('assets/world-map.svg');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const svgText = await res.text();
      if (DOM.mapContainer) {
        DOM.mapContainer.innerHTML = svgText;
        this.bindMapEvents();
        this.applyMapClasses();
      }
    } catch (err) {
      console.error('Failed to load map:', err);
      if (DOM.mapContainer) {
        DOM.mapContainer.innerHTML =
          '<p class="map-load-error">Map unavailable</p>';
      }
    }
  }

  bindMapEvents() {
    const svg = DOM.mapContainer?.querySelector('svg');
    if (!svg) return;

    svg.addEventListener('click', (e) => {
      const path = e.target.closest('path[data-code]');
      if (!path) return;
      this.selectCountry(path.dataset.code);
    });
  }

  selectCountry(code) {
    if (!code) return;

    const previous = this.selectedCountryCode;

    this.selectedCountryCode = code;

    if (previous) {
      DOM.mapContainer
        ?.querySelector(`path[data-code="${previous}"]`)
        ?.classList.remove('selected');
    }

    DOM.mapContainer
      ?.querySelector(`path[data-code="${code}"]`)
      ?.classList.add('selected');

    if (DOM.mapHint) DOM.mapHint.hidden = true;

    this.showCountryPlaceholder(code);
  }

  showCountryPlaceholder(code) {
    if (!DOM.detailCard) return;

    if (DOM.cardFlag)    DOM.cardFlag.textContent    = '';
    if (DOM.cardCommon)  DOM.cardCommon.textContent  = code;
    if (DOM.cardOfficial) DOM.cardOfficial.textContent = 'Loading…';
    if (DOM.cardGrid)    DOM.cardGrid.innerHTML      = '';
    if (DOM.cardChips)   DOM.cardChips.innerHTML     = '';

    DOM.detailCard.hidden = false;
  }

  applyMapClasses() {
    for (const code of this.knownCountries) {
      DOM.mapContainer
        ?.querySelector(`path[data-code="${code}"]`)
        ?.classList.add('known');
    }
  }

  bindEvents() {
    DOM.cardClose?.addEventListener('click', () => this.closeCard());

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closeCard();
    });
  }

  closeCard() {
    if (this.selectedCountryCode) {
      DOM.mapContainer
        ?.querySelector(`path[data-code="${this.selectedCountryCode}"]`)
        ?.classList.remove('selected');
    }
    if (DOM.detailCard) DOM.detailCard.hidden = true;
    this.selectedCountryCode = null;
    if (DOM.mapHint) DOM.mapHint.hidden = false;
  }

  updateKnownCounter() {
    const count = this.knownCountries.size;
    if (!DOM.knownCount) return;

    DOM.knownCount.textContent = count;
    DOM.knownCount.classList.remove('bump');
    void DOM.knownCount.offsetWidth;
    DOM.knownCount.classList.add('bump');
    setTimeout(() => DOM.knownCount.classList.remove('bump'), 300);
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

new CountriesAtlasApp();
