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

    this.showLoadingState();
    this.fetchCountryByCode(code)
      .then(data => this.renderCountryDetails(data))
      .catch(() => this.showErrorState(code));
  }

  async fetchCountryByCode(code) {
    if (this.countryCache.has(code)) {
      return this.countryCache.get(code);
    }
    const res = await fetch(`${CONFIG.API_BASE_URL}/${code}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const [raw] = await res.json();
    const data = this.normalizeCountryData(raw);
    this.countryCache.set(code, data);
    return data;
  }

  normalizeCountryData(raw) {
    const currencies = raw.currencies
      ? Object.values(raw.currencies).map(c => c.name).join(', ')
      : '—';
    const languages = raw.languages
      ? Object.values(raw.languages).join(', ')
      : '—';

    return {
      code:       raw.cca2 ?? '',
      flag:       raw.flag ?? '',
      common:     raw.name?.common ?? raw.cca2 ?? '',
      official:   raw.name?.official ?? '',
      capital:    raw.capital?.[0] ?? '—',
      population: raw.population != null ? raw.population.toLocaleString() : '—',
      area:       raw.area != null ? raw.area.toLocaleString() + ' km²' : '—',
      region:     raw.region ?? '—',
      subregion:  raw.subregion ?? '—',
      languages,
      currencies,
      borders:    raw.borders ?? [],
    };
  }

  showLoadingState() {
    if (!DOM.detailCard) return;

    const skeletonLine = (w, h) =>
      `<span class="skeleton" style="width:${w};height:${h}px;display:inline-block;border-radius:3px;"></span>`;

    if (DOM.cardFlag) DOM.cardFlag.textContent = '';
    if (DOM.cardCommon) DOM.cardCommon.innerHTML = skeletonLine('100px', 14);
    if (DOM.cardOfficial) DOM.cardOfficial.innerHTML = skeletonLine('140px', 10);
    if (DOM.cardGrid) {
      DOM.cardGrid.innerHTML = Array.from({ length: 6 }, () =>
        `<div>
          ${skeletonLine('38px', 9)}
          <div style="margin-top:4px;">${skeletonLine('64px', 12)}</div>
        </div>`
      ).join('');
    }
    if (DOM.cardChips) DOM.cardChips.innerHTML = '';
    DOM.detailCard.hidden = false;
  }

  renderCountryDetails(data) {
    if (!DOM.detailCard) return;

    if (DOM.cardFlag) DOM.cardFlag.textContent = data.flag;
    if (DOM.cardCommon) DOM.cardCommon.textContent = data.common;
    if (DOM.cardOfficial) DOM.cardOfficial.textContent = data.official;

    if (DOM.cardGrid) {
      const stats = [
        { label: 'Capital',    value: data.capital },
        { label: 'Population', value: data.population },
        { label: 'Area',       value: data.area },
        { label: 'Region',     value: data.region },
        { label: 'Subregion',  value: data.subregion },
        { label: 'Languages',  value: data.languages },
        { label: 'Currencies', value: data.currencies },
      ];
      DOM.cardGrid.innerHTML = stats.map(s =>
        `<div>
          <div class="stat-label">${this.escapeHtml(s.label)}</div>
          <div class="stat-value">${this.escapeHtml(s.value)}</div>
        </div>`
      ).join('');
    }

    if (DOM.cardChips) {
      if (data.borders.length) {
        DOM.cardChips.innerHTML = data.borders
          .map(b => `<button class="chip" data-border-code="${this.escapeHtml(b)}">${this.escapeHtml(b)}</button>`)
          .join('');
        DOM.cardChips.querySelectorAll('.chip[data-border-code]').forEach(chip => {
          chip.addEventListener('click', () => this.selectCountry(chip.dataset.borderCode));
        });
      } else {
        DOM.cardChips.innerHTML = '<span class="chip-none">None</span>';
      }
    }
  }

  showErrorState(code) {
    if (!DOM.detailCard) return;

    if (DOM.cardFlag) DOM.cardFlag.textContent = '⚠️';
    if (DOM.cardCommon) DOM.cardCommon.textContent = code;
    if (DOM.cardOfficial) DOM.cardOfficial.textContent = 'Could not load data';
    if (DOM.cardGrid) {
      DOM.cardGrid.innerHTML =
        `<p class="card-error-msg">Request failed. Check your connection and try again.</p>`;
    }
    if (DOM.cardChips) DOM.cardChips.innerHTML = '';
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
