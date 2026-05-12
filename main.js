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
  comparisonPanel: '#comparisonPanel',
  comparisonCards: '#comparisonCards',
  comparisonClear: '#comparisonClear',
  knownReset: '#knownReset',
  compClearBar: '#compClearBar',
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
    this.svgElement = null;
    this.mapView = null;
    this.mapDragged = false;
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
        const svg = DOM.mapContainer.querySelector('svg');
        if (svg) {
          svg.setAttribute('role', 'img');
          svg.setAttribute('aria-label', 'Interactive world map — click a country to explore it');
          svg.setAttribute('preserveAspectRatio', 'none');
          this.svgElement = svg;
          this.initMapView();
          this.bindMapZoomPan();
        }
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

  initMapView() {
    if (!DOM.mapContainer) return;
    const cW = DOM.mapContainer.clientWidth;
    const cH = DOM.mapContainer.clientHeight;
    // Scale to fill the container without distortion (object-fit: cover behavior)
    const fillScale = Math.max(cW / 2000, cH / 1000);
    const vbW = cW / fillScale;
    const vbH = cH / fillScale;
    this.mapView = {
      x: (2000 - vbW) / 2,
      y: (1000 - vbH) / 2,
      w: vbW,
      h: vbH,
    };
    this.applyViewBox();
  }

  applyViewBox() {
    if (!this.svgElement || !this.mapView) return;
    this.clampView();
    const { x, y, w, h } = this.mapView;
    this.svgElement.setAttribute('viewBox', `${x} ${y} ${w} ${h}`);
  }

  clampView() {
    if (!this.mapView || !DOM.mapContainer) return;
    const cW = DOM.mapContainer.clientWidth;
    const cH = DOM.mapContainer.clientHeight;
    // Maximum viewBox size that still fills the container (same as initMapView)
    const fillScale = Math.max(cW / 2000, cH / 1000);
    const maxW = cW / fillScale;
    const maxH = cH / fillScale;

    if (this.mapView.w > maxW) {
      this.mapView.w = maxW;
      this.mapView.h = maxH;
    }

    // Keep viewBox inside the 2000×1000 SVG canvas so black borders never show
    this.mapView.x = Math.max(0, Math.min(this.mapView.x, 2000 - this.mapView.w));
    this.mapView.y = Math.max(0, Math.min(this.mapView.y, 1000 - this.mapView.h));
  }

  zoomMap(pivotX, pivotY, factor) {
    if (!this.mapView || !DOM.mapContainer) return;
    const rect = DOM.mapContainer.getBoundingClientRect();
    // Pre-compute the min-zoom limit so the pivot math uses the clamped width
    const fillScale = Math.max(rect.width / 2000, rect.height / 1000);
    const maxW = rect.width / fillScale;

    const scaleX = this.mapView.w / rect.width;
    const scaleY = this.mapView.h / rect.height;

    // SVG coordinate under the cursor/pinch midpoint
    const svgX = this.mapView.x + pivotX * scaleX;
    const svgY = this.mapView.y + pivotY * scaleY;

    const newW = Math.min(Math.max(this.mapView.w * factor, 80), maxW);
    const newH = newW * (rect.height / rect.width);

    this.mapView.x = svgX - pivotX * (newW / rect.width);
    this.mapView.y = svgY - pivotY * (newH / rect.height);
    this.mapView.w = newW;
    this.mapView.h = newH;
    this.applyViewBox();
  }

  bindMapZoomPan() {
    const container = DOM.mapContainer;
    if (!container) return;

    let isPanning = false;
    let panStart = { x: 0, y: 0 };
    let panViewStart = { x: 0, y: 0 };
    let mouseDownPos = { x: 0, y: 0 };
    const DRAG_THRESHOLD = 5;

    // Wheel zoom
    container.addEventListener('wheel', (e) => {
      e.preventDefault();
      const rect = container.getBoundingClientRect();
      const factor = e.deltaY < 0 ? 0.85 : 1 / 0.85;
      this.zoomMap(e.clientX - rect.left, e.clientY - rect.top, factor);
    }, { passive: false });

    // Mouse pan
    container.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      this.mapDragged = false;
      isPanning = true;
      mouseDownPos = { x: e.clientX, y: e.clientY };
      panStart = { x: e.clientX, y: e.clientY };
      panViewStart = { x: this.mapView.x, y: this.mapView.y };
    });

    window.addEventListener('mousemove', (e) => {
      if (!isPanning) return;
      const dx = e.clientX - mouseDownPos.x;
      const dy = e.clientY - mouseDownPos.y;
      if (!this.mapDragged && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
        this.mapDragged = true;
        container.style.cursor = 'grabbing';
      }
      if (!this.mapDragged) return;
      const rect = container.getBoundingClientRect();
      this.mapView.x = panViewStart.x - (e.clientX - panStart.x) * (this.mapView.w / rect.width);
      this.mapView.y = panViewStart.y - (e.clientY - panStart.y) * (this.mapView.h / rect.height);
      this.applyViewBox();
    });

    window.addEventListener('mouseup', () => {
      if (isPanning) {
        isPanning = false;
        container.style.cursor = '';
      }
    });

    // Touch — pan (1 finger) and pinch-to-zoom (2 fingers)
    let lastTouchDist = 0;
    let isTouchPanning = false;
    let touchPanStart = { x: 0, y: 0 };
    let touchViewStart = { x: 0, y: 0 };
    let touchDownPos = { x: 0, y: 0 };

    container.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.mapDragged = false;
      if (e.touches.length === 1) {
        isTouchPanning = true;
        touchDownPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        touchPanStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        touchViewStart = { x: this.mapView.x, y: this.mapView.y };
      } else if (e.touches.length === 2) {
        isTouchPanning = false;
        lastTouchDist = Math.hypot(
          e.touches[1].clientX - e.touches[0].clientX,
          e.touches[1].clientY - e.touches[0].clientY
        );
      }
    }, { passive: false });

    container.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const rect = container.getBoundingClientRect();
      if (e.touches.length === 1 && isTouchPanning) {
        const tdx = e.touches[0].clientX - touchDownPos.x;
        const tdy = e.touches[0].clientY - touchDownPos.y;
        if (!this.mapDragged && Math.hypot(tdx, tdy) > DRAG_THRESHOLD) {
          this.mapDragged = true;
        }
        if (!this.mapDragged) return;
        this.mapView.x = touchViewStart.x - (e.touches[0].clientX - touchPanStart.x) * (this.mapView.w / rect.width);
        this.mapView.y = touchViewStart.y - (e.touches[0].clientY - touchPanStart.y) * (this.mapView.h / rect.height);
        this.applyViewBox();
      } else if (e.touches.length === 2) {
        const dist = Math.hypot(
          e.touches[1].clientX - e.touches[0].clientX,
          e.touches[1].clientY - e.touches[0].clientY
        );
        const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
        const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;
        if (lastTouchDist > 0) this.zoomMap(midX, midY, lastTouchDist / dist);
        lastTouchDist = dist;
      }
    }, { passive: false });

    container.addEventListener('touchend', () => {
      isTouchPanning = false;
    });

    // Maintain fill on resize
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (!this.mapView || !DOM.mapContainer) return;
        const cW = DOM.mapContainer.clientWidth;
        const cH = DOM.mapContainer.clientHeight;
        const svgUnitsPerPx = this.mapView.w / cW;
        const cx = this.mapView.x + this.mapView.w / 2;
        const cy = this.mapView.y + this.mapView.h / 2;
        const newW = cW * svgUnitsPerPx;
        const newH = cH * svgUnitsPerPx;
        this.mapView = { x: cx - newW / 2, y: cy - newH / 2, w: newW, h: newH };
        this.applyViewBox();
      }, 80);
    });
  }

  bindMapEvents() {
    const svg = DOM.mapContainer?.querySelector('svg');
    if (!svg) return;

    svg.addEventListener('click', (e) => {
      if (this.mapDragged) return;
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
    DOM.detailCard.setAttribute('aria-busy', 'true');
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

    DOM.detailCard.removeAttribute('aria-busy');
    this.updateKnownButton(data.code);
    this.updateCompareButton(data.code);
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
    DOM.detailCard.removeAttribute('aria-busy');
    DOM.detailCard.hidden = false;
  }

  toggleKnownCountry(code) {
    if (!code) return;

    if (this.knownCountries.has(code)) {
      this.knownCountries.delete(code);
      DOM.mapContainer
        ?.querySelector(`path[data-code="${code}"]`)
        ?.classList.remove('known');
    } else {
      this.knownCountries.add(code);
      DOM.mapContainer
        ?.querySelector(`path[data-code="${code}"]`)
        ?.classList.add('known');
    }

    this.saveKnownCountries();
    this.updateKnownCounter();
    this.updateKnownButton(code);
  }

  updateKnownButton(code) {
    if (!DOM.btnKnown || !code) return;
    const isKnown = this.knownCountries.has(code);
    DOM.btnKnown.textContent = isKnown ? 'Remove from Known' : 'Mark as Known';
    DOM.btnKnown.classList.toggle('is-known', isKnown);
    DOM.btnKnown.setAttribute('aria-pressed', String(isKnown));
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
    DOM.btnKnown?.addEventListener('click', () => this.toggleKnownCountry(this.selectedCountryCode));
    DOM.knownReset?.addEventListener('click', () => this.resetKnownCountries());

    document.getElementById('mapZoomIn')?.addEventListener('click', () => {
      const rect = DOM.mapContainer.getBoundingClientRect();
      this.zoomMap(rect.width / 2, rect.height / 2, 0.7);
    });
    document.getElementById('mapZoomOut')?.addEventListener('click', () => {
      const rect = DOM.mapContainer.getBoundingClientRect();
      this.zoomMap(rect.width / 2, rect.height / 2, 1 / 0.7);
    });
    document.getElementById('mapReset')?.addEventListener('click', () => this.initMapView());

    DOM.btnCompare?.addEventListener('click', () => {
      if (!this.selectedCountryCode) return;
      const code = this.selectedCountryCode;
      const idx = this.comparisonCountries.indexOf(code);
      if (idx !== -1) {
        this.removeCountryFromComparison(idx);
      } else {
        this.addCountryToComparison(code);
      }
    });

    const clearComparison = () => {
      this.comparisonCountries = [];
      this.renderComparatorSlots();
      this.renderComparisonPanel();
      if (this.selectedCountryCode) this.updateCompareButton(this.selectedCountryCode);
    };
    DOM.comparisonClear?.addEventListener('click', clearComparison);
    DOM.compClearBar?.addEventListener('click', clearComparison);

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

    if (DOM.knownReset) DOM.knownReset.hidden = count === 0;
  }

  resetKnownCountries() {
    for (const code of this.knownCountries) {
      DOM.mapContainer
        ?.querySelector(`path[data-code="${code}"]`)
        ?.classList.remove('known');
    }
    this.knownCountries.clear();
    this.saveKnownCountries();
    this.updateKnownCounter();
    if (this.selectedCountryCode) this.updateKnownButton(this.selectedCountryCode);
  }

  addCountryToComparison(code) {
    if (!code) return;
    if (this.comparisonCountries.includes(code)) return;

    if (this.comparisonCountries.length >= 2) {
      this.comparisonCountries.shift();
    }
    this.comparisonCountries.push(code);

    this.fetchCountryByCode(code)
      .then(() => {
        this.renderComparatorSlots();
        this.renderComparisonPanel();
        if (this.selectedCountryCode) this.updateCompareButton(this.selectedCountryCode);
      })
      .catch(() => {
        this.renderComparatorSlots();
        this.renderComparisonPanel();
      });
  }

  removeCountryFromComparison(index) {
    this.comparisonCountries.splice(index, 1);
    this.renderComparatorSlots();
    this.renderComparisonPanel();
    if (this.selectedCountryCode) this.updateCompareButton(this.selectedCountryCode);
  }

  renderComparatorSlots() {
    [DOM.comparatorSlot1, DOM.comparatorSlot2].forEach((slot, i) => {
      if (!slot) return;
      const code = this.comparisonCountries[i];

      if (!code) {
        slot.innerHTML = '<span class="comp-empty-text">+ Add a country</span>';
        slot.classList.add('comp-slot--empty');
        return;
      }

      const data = this.countryCache.get(code);
      if (!data) return;

      slot.classList.remove('comp-slot--empty');
      slot.innerHTML = `
        <span class="comp-slot-flag" aria-hidden="true">${this.escapeHtml(data.flag)}</span>
        <div class="comp-slot-info">
          <div class="comp-slot-name">${this.escapeHtml(data.common)}</div>
          <div class="comp-slot-sub">${this.escapeHtml(data.capital)}</div>
        </div>
        <button class="comp-slot-remove" aria-label="Remove ${this.escapeHtml(data.common)} from comparator">✕</button>
      `;
      slot.querySelector('.comp-slot-remove')?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.removeCountryFromComparison(i);
      });
    });

    if (DOM.compClearBar) DOM.compClearBar.hidden = this.comparisonCountries.length === 0;
  }

  renderComparisonPanel() {
    if (!DOM.comparisonPanel || !DOM.comparisonCards) return;

    if (this.comparisonCountries.length === 0) {
      DOM.comparisonPanel.hidden = true;
      return;
    }

    DOM.comparisonPanel.hidden = false;

    const renderCard = (code) => {
      if (!code) {
        return `
          <div class="comp-card comp-card--empty">
            <span class="comp-card-empty-text">+ Add a country to compare</span>
          </div>`;
      }

      const data = this.countryCache.get(code);
      if (!data) {
        return `<div class="comp-card"><div class="skeleton" style="height:180px;border-radius:10px;"></div></div>`;
      }

      const stats = [
        { label: 'Capital',    value: data.capital },
        { label: 'Population', value: data.population },
        { label: 'Area',       value: data.area },
        { label: 'Region',     value: data.region },
        { label: 'Subregion',  value: data.subregion },
        { label: 'Languages',  value: data.languages },
        { label: 'Currencies', value: data.currencies },
      ];

      return `
        <div class="comp-card">
          <div class="comp-card-header">
            <span class="comp-card-flag" aria-hidden="true">${this.escapeHtml(data.flag)}</span>
            <div class="comp-card-names">
              <div class="comp-card-common">${this.escapeHtml(data.common)}</div>
              <div class="comp-card-official">${this.escapeHtml(data.official)}</div>
            </div>
          </div>
          <div class="comp-card-stats">
            ${stats.map(s => `
              <div>
                <div class="stat-label">${this.escapeHtml(s.label)}</div>
                <div class="stat-value">${this.escapeHtml(s.value)}</div>
              </div>`).join('')}
          </div>
        </div>`;
    };

    const card1 = renderCard(this.comparisonCountries[0] ?? null);
    const card2 = renderCard(this.comparisonCountries[1] ?? null);
    DOM.comparisonCards.innerHTML = card1 + card2;
  }

  updateCompareButton(code) {
    if (!DOM.btnCompare || !code) return;
    const isInComparison = this.comparisonCountries.includes(code);
    DOM.btnCompare.textContent = isInComparison ? 'In Comparator' : '+ Compare';
    DOM.btnCompare.classList.toggle('is-comparing', isInComparison);
    DOM.btnCompare.setAttribute('aria-pressed', String(isInComparison));
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

new CountriesAtlasApp();
