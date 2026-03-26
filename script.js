/* eslint-disable no-unused-vars */

// ===== Utilities =====
const currency = new Intl.NumberFormat("fr-BE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 2,
});

function clampNumber(value, min, max) {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function formatMoney(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-";
  return currency.format(value);
}

function getUTMParam(name) {
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get(name) || "";
  } catch (e) {
    return "";
  }
}

// ===== Tracking UTM (Formspree hidden fields) =====
(function initTrackingUTM() {
  // Analytics: ces champs permettent de suivre la source du trafic vers Formspree.
  const utmKeys = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];
  utmKeys.forEach((key) => {
    const el = document.getElementById(key);
    if (!el) return;
    el.value = getUTMParam(key);
  });
})();

// ===== Prix : simulateur =====
const DISCOUNT_RATE = 0.5;

// Tarifs constants (€/m2 ou règle panneaux).
const PRICES_M2 = {
  // TODO : à compléter dès que le tarif est confirmé.
  ROOF_SIMPLE_EUR_PER_M2: null,
  ROOF_DEMOSSAGE_EUR_PER_M2: 14,
  FACADES_CLEAN_EUR_PER_M2: 9.5,
  HYDROFUGE_EUR_PER_M2: 18,
  WINDOWS_EUR_PER_M2: 9,
};

const SIM = {
  serviceEl: document.getElementById("sim-service"),
  qtyRangeEl: document.getElementById("sim-quantity-range"),
  qtyInputEl: document.getElementById("sim-quantity-input"),
  qtyLabelEl: document.getElementById("sim-quantity-label"),
  qtyUnitEl: document.getElementById("sim-quantity-unit"),
  qtyHelpEl: document.getElementById("sim-quantity-help"),

  priceBeforeEl: document.getElementById("price-before"),
  discountEl: document.getElementById("discount-value"),
  priceAfterEl: document.getElementById("price-after"),

  estimatedServiceEl: document.getElementById("estimated-service"),
  estimatedBeforeEl: document.getElementById("estimated-before"),
  estimatedAfterEl: document.getElementById("estimated-after"),
  estimatedQuantityEl: document.getElementById("estimated-quantity"),

  form: document.getElementById("devis-form"),
  formServiceEl: document.getElementById("form-service"),
  formEstimatedServiceEl: document.getElementById("form_estimated_service"),
  formEstimatedBeforeEl: document.getElementById("form_estimated_before"),
  formEstimatedAfterEl: document.getElementById("form_estimated_after"),
  formEstimatedQuantityEl: document.getElementById("form_estimated_quantity"),
  formMessageEl: null,
};

const SERVICE_CONFIG = {
  roof_simple: {
    label: "Traitement toiture simple",
    unit: "m2",
    unitPrice: PRICES_M2.ROOF_SIMPLE_EUR_PER_M2,
  },
  roof_demossage: {
    label: "Démoussage toiture",
    unit: "m2",
    unitPrice: PRICES_M2.ROOF_DEMOSSAGE_EUR_PER_M2,
  },
  facades_clean: {
    label: "Nettoyage façades",
    unit: "m2",
    unitPrice: PRICES_M2.FACADES_CLEAN_EUR_PER_M2,
  },
  hydrofuge: {
    label: "Traitement hydrofuge",
    unit: "m2",
    unitPrice: PRICES_M2.HYDROFUGE_EUR_PER_M2,
  },
  windows: {
    label: "Vitres",
    unit: "m2",
    unitPrice: PRICES_M2.WINDOWS_EUR_PER_M2,
  },
  panels: {
    label: "Panneaux solaires (nettoyage)",
    unit: "panels",
  },
};

function panelsBasePrice(nbPanels) {
  const panels = Math.max(0, nbPanels);

  // Règles fournies :
  // - Moins de 50 panneaux : plancher 150 €, 6,00 €/panneau
  // - Entre 50 et 500 panneaux : plancher 150 €, 5,50 €/panneau
  // - Plus de 500 panneaux : pas de prix plancher, 5,00 €/panneau
  if (panels < 50) {
    const floor = 150;
    const unit = 6.0;
    return Math.max(floor, panels * unit);
  }

  if (panels <= 500) {
    const floor = 150;
    const unit = 5.5;
    return Math.max(floor, panels * unit);
  }

  const unit = 5.0;
  return panels * unit;
}

function setQuantityUI(unitType) {
  const unitTypeSafe = unitType === "panels" ? "panels" : "m2";

  if (unitTypeSafe === "panels") {
    SIM.qtyLabelEl.textContent = "Nombre de panneaux";
    SIM.qtyUnitEl.textContent = "panneaux";
    SIM.qtyHelpEl.textContent = "Règles de prix selon le nombre de panneaux.";
    SIM.qtyRangeEl.min = "1";
    SIM.qtyRangeEl.max = "2000";
    SIM.qtyRangeEl.step = "1";
    SIM.qtyInputEl.min = "1";
    SIM.qtyInputEl.max = "100000";
    SIM.qtyInputEl.step = "1";

    // Valeur par défaut dans une zone plausible
    SIM.qtyRangeEl.value = SIM.qtyRangeEl.value && Number(SIM.qtyRangeEl.value) >= 1 ? SIM.qtyRangeEl.value : 20;
    SIM.qtyInputEl.value = SIM.qtyRangeEl.value;
  } else {
    SIM.qtyLabelEl.textContent = "Surface (m2)";
    SIM.qtyUnitEl.textContent = "m2";
    SIM.qtyHelpEl.textContent = "Ajustez selon votre surface.";
    SIM.qtyRangeEl.min = "10";
    SIM.qtyRangeEl.max = "500";
    SIM.qtyRangeEl.step = "1";
    SIM.qtyInputEl.min = "1";
    SIM.qtyInputEl.max = "10000";
    SIM.qtyInputEl.step = "1";

    SIM.qtyRangeEl.value = SIM.qtyRangeEl.value && Number(SIM.qtyRangeEl.value) >= 10 ? SIM.qtyRangeEl.value : 100;
    SIM.qtyInputEl.value = SIM.qtyRangeEl.value;
  }
}

function getSelectedServiceKey() {
  return SIM.serviceEl ? SIM.serviceEl.value : "roof_demossage";
}

function getQuantityValue() {
  const raw = SIM.qtyInputEl ? Number(SIM.qtyInputEl.value) : Number(SIM.qtyRangeEl.value);
  return clampNumber(raw, Number(SIM.qtyInputEl.min), Number(SIM.qtyInputEl.max));
}

function computeAndRender() {
  const serviceKey = getSelectedServiceKey();
  const cfg = SERVICE_CONFIG[serviceKey];
  if (!cfg) return;

  const quantity = getQuantityValue();
  const unit = cfg.unit;

  const before = (() => {
    if (unit === "panels") return panelsBasePrice(quantity);
    if (unit === "m2") {
      if (typeof cfg.unitPrice !== "number") return null; // TODO : prix non défini
      return quantity * cfg.unitPrice;
    }
    return null;
  })();

  if (before === null) {
    SIM.priceBeforeEl.textContent = "Tarif à définir";
    SIM.discountEl.textContent = "-";
    SIM.priceAfterEl.textContent = "-";

    // Champs analytics (côté landing)
    setHiddenIfPresent(SIM.estimatedServiceEl, cfg.label);
    setHiddenIfPresent(SIM.estimatedBeforeEl, "");
    setHiddenIfPresent(SIM.estimatedAfterEl, "");
    setHiddenIfPresent(SIM.estimatedQuantityEl, quantity.toString());

    // Champs analytics (dans le formulaire)
    setHiddenIfPresent(SIM.formEstimatedServiceEl, cfg.label);
    setHiddenIfPresent(SIM.formEstimatedBeforeEl, "");
    setHiddenIfPresent(SIM.formEstimatedAfterEl, "");
    setHiddenIfPresent(SIM.formEstimatedQuantityEl, quantity.toString());
    return;
  }

  const discount = before * DISCOUNT_RATE;
  const after = before - discount;

  SIM.priceBeforeEl.textContent = formatMoney(before);
  SIM.discountEl.textContent = "-" + formatMoney(discount);
  SIM.priceAfterEl.textContent = formatMoney(after);

  // Champs analytics (côté landing)
  setHiddenIfPresent(SIM.estimatedServiceEl, cfg.label);
  setHiddenIfPresent(SIM.estimatedBeforeEl, before.toFixed(2));
  setHiddenIfPresent(SIM.estimatedAfterEl, after.toFixed(2));
  setHiddenIfPresent(SIM.estimatedQuantityEl, quantity.toString());

  // Champs analytics (dans le formulaire)
  setHiddenIfPresent(SIM.formEstimatedServiceEl, cfg.label);
  setHiddenIfPresent(SIM.formEstimatedBeforeEl, before.toFixed(2));
  setHiddenIfPresent(SIM.formEstimatedAfterEl, after.toFixed(2));
  setHiddenIfPresent(SIM.formEstimatedQuantityEl, quantity.toString());
}

function setHiddenIfPresent(el, value) {
  if (!el) return;
  el.value = value == null ? "" : value;
}

function setFormServiceFromSim(serviceKey) {
  const mapping = {
    roof_simple: "toiture",
    roof_demossage: "toiture",
    facades_clean: "facade",
    hydrofuge: "facade",
    windows: "vitres",
    panels: "panneaux",
  };

  if (!SIM.formServiceEl) return;
  const value = mapping[serviceKey] || "";
  SIM.formServiceEl.value = value;
}

// Synchroniser range <-> input + recalcul
function syncQuantityFromRange() {
  if (!SIM.qtyRangeEl || !SIM.qtyInputEl) return;
  SIM.qtyInputEl.value = SIM.qtyRangeEl.value;
  computeAndRender();
}

function syncQuantityFromInput() {
  if (!SIM.qtyRangeEl || !SIM.qtyInputEl) return;
  const min = Number(SIM.qtyRangeEl.min);
  const max = Number(SIM.qtyRangeEl.max);
  const step = Number(SIM.qtyRangeEl.step || 1);

  let value = Number(SIM.qtyInputEl.value);
  if (!Number.isFinite(value)) value = min;
  value = clampNumber(value, min, max);

  // Arrondi à l'incrément du slider
  const stepped = Math.round(value / step) * step;
  SIM.qtyRangeEl.value = String(clampNumber(stepped, min, max));
  SIM.qtyInputEl.value = SIM.qtyRangeEl.value;
  computeAndRender();
}

// Init simulateur
function initSimulator() {
  if (!SIM.serviceEl || !SIM.qtyRangeEl || !SIM.qtyInputEl) return;

  // Appeler une fois pour config UI
  const serviceKey = getSelectedServiceKey();
  const cfg = SERVICE_CONFIG[serviceKey];
  setQuantityUI(cfg.unit);
  setFormServiceFromSim(serviceKey);
  computeAndRender();

  SIM.serviceEl.addEventListener("change", () => {
    const key = getSelectedServiceKey();
    const config = SERVICE_CONFIG[key];
    if (config) setQuantityUI(config.unit);
    setFormServiceFromSim(key);
    computeAndRender();
  });

  SIM.qtyRangeEl.addEventListener("input", syncQuantityFromRange);
  SIM.qtyInputEl.addEventListener("input", syncQuantityFromInput);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initSimulator);
} else {
  initSimulator();
}

