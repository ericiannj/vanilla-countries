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

  bindEvents() {
    DOM.cardClose?.addEventListener('click', () => this.closeCard());

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closeCard();
    });

    // Map click and hover events will be wired in Commit 2 when the SVG is injected.
    // Comparator slot interactions will be added in a later commit.
  }

  closeCard() {
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
