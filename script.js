const currency = new Intl.NumberFormat("fr-BE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 2,
});

// ==========================================
// Pricing variants (A/B/C/D)
// ==========================================
const BASE_A = {
  roof_simple: 9.5,
  roof_demossage: 14,
  roof_hydrofuge: 18,
  facades_clean: 9.5,
  hydrofuge: 18,
  windows: 9,
  panels: {
    tier1: { maxExclusive: 50, floor: 150, unit: 6.0 },
    tier2: { maxInclusive: 500, floor: 150, unit: 5.5 },
    tier3: { floor: 0, unit: 5.0 },
  },
};

const DISCOUNT_A_B = 0.3;
const B_ANCHOR_MULTIPLIER = 1 / (1 - DISCOUNT_A_B);

function scalePanels(panels, factor) {
  return {
    tier1: { ...panels.tier1, floor: panels.tier1.floor * factor, unit: panels.tier1.unit * factor },
    tier2: { ...panels.tier2, floor: panels.tier2.floor * factor, unit: panels.tier2.unit * factor },
    tier3: { ...panels.tier3, floor: panels.tier3.floor * factor, unit: panels.tier3.unit * factor },
  };
}

function scaleRates(base, factor) {
  return {
    roof_simple: base.roof_simple * factor,
    roof_demossage: base.roof_demossage * factor,
    roof_hydrofuge: base.roof_hydrofuge * factor,
    facades_clean: base.facades_clean * factor,
    hydrofuge: base.hydrofuge * factor,
    windows: base.windows * factor,
    panels: scalePanels(base.panels, factor),
  };
}

const pricingVariants = {
  A: {
    label: "Variante A",
    discountRate: DISCOUNT_A_B,
    showDiscount: true,
    rates: BASE_A,
  },
  B: {
    label: "Variante B",
    discountRate: DISCOUNT_A_B,
    showDiscount: true,
    rates: scaleRates(BASE_A, B_ANCHOR_MULTIPLIER),
  },
  C: {
    label: "Variante C",
    discountRate: 0,
    showDiscount: false,
    rates: scaleRates(BASE_A, 0.9),
  },
  D: {
    label: "Variante D",
    discountRate: 0,
    showDiscount: false,
    rates: scaleRates(BASE_A, 1.15),
  },
};

function getPricingVariantFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const raw = (params.get("pricing") || "A").toUpperCase();
  return ["A", "B", "C", "D"].includes(raw) ? raw : "A";
}

const activePricingVariant = getPricingVariantFromUrl();
const activePricingConfig = pricingVariants[activePricingVariant];

const CATEGORIES = {
  roof: [
    { key: "roof_simple", label: "Traitement toiture simple", unit: "m2" },
    { key: "roof_demossage", label: "Demoussage toiture", unit: "m2" },
    { key: "roof_hydrofuge", label: "Traitement hydrofuge", unit: "m2" },
  ],
  facade: [
    { key: "facades_clean", label: "Nettoyage facade", unit: "m2" },
    { key: "hydrofuge", label: "Traitement hydrofuge", unit: "m2" },
  ],
  panels: [{ key: "panels", label: "Nettoyage panneaux solaires", unit: "panels" }],
  windows: [{ key: "windows", label: "Nettoyage vitres", unit: "m2" }],
};

const FORM_SERVICE_MAP = {
  roof_simple: "toiture",
  roof_demossage: "toiture",
  roof_hydrofuge: "toiture_hydrofuge",
  facades_clean: "facade",
  hydrofuge: "facade",
  panels: "panneaux",
  windows: "vitres",
};

const UI = {
  categoryButtons: Array.from(document.querySelectorAll(".sim-cat-btn")),
  servicesWrap: document.getElementById("sim-services"),
  qtyRange: document.getElementById("sim-quantity-range"),
  qtyLabel: document.getElementById("sim-quantity-label"),
  qtyHelp: document.getElementById("sim-quantity-help"),
  unitRate: document.getElementById("sim-unit-rate"),
  liveNumber: document.getElementById("sim-live-number"),
  liveUnit: document.getElementById("sim-live-unit"),
  priceBefore: document.getElementById("price-before"),
  discountValue: document.getElementById("discount-value"),
  priceAfter: document.getElementById("price-after"),
  finalLabel: document.getElementById("result-final-label"),
  discountLabel: document.getElementById("result-discount-label"),
  discountCard: document.getElementById("result-discount-card"),
  beforeCard: document.getElementById("result-before-card"),
  topOfferText: document.getElementById("top-offer-text"),
  topOfferLabel: document.getElementById("top-offer-label"),
  topOfferValue: document.getElementById("top-offer-value"),
  heroOfferBadge: document.getElementById("hero-offer-badge"),
  heroOfferLabel: document.getElementById("hero-offer-label"),
  heroOfferValue: document.getElementById("hero-offer-value"),
  formService: document.getElementById("form-service"),
  pricingVariantInput: document.getElementById("pricing_variant"),
  hiddenEstimatedService: document.getElementById("estimated-service"),
  hiddenEstimatedBefore: document.getElementById("estimated-before"),
  hiddenEstimatedAfter: document.getElementById("estimated-after"),
  hiddenEstimatedQuantity: document.getElementById("estimated-quantity"),
  formEstimatedService: document.getElementById("form_estimated_service"),
  formEstimatedBefore: document.getElementById("form_estimated_before"),
  formEstimatedAfter: document.getElementById("form_estimated_after"),
  formEstimatedQuantity: document.getElementById("form_estimated_quantity"),
};

let selectedCategory = "roof";
let selectedService = CATEGORIES.roof[0];

function formatMoney(value) {
  if (!Number.isFinite(value)) return "-";
  return currency.format(value);
}

function clamp(value, min, max) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function setHidden(el, value) {
  if (el) el.value = value == null ? "" : String(value);
}

function setFormService(serviceKey) {
  if (UI.formService) UI.formService.value = FORM_SERVICE_MAP[serviceKey] || "";
}

function computePanelsBasePrice(count, panelConfig) {
  const qty = Math.max(0, count);
  if (qty < panelConfig.tier1.maxExclusive) return Math.max(panelConfig.tier1.floor, qty * panelConfig.tier1.unit);
  if (qty <= panelConfig.tier2.maxInclusive) return Math.max(panelConfig.tier2.floor, qty * panelConfig.tier2.unit);
  return Math.max(panelConfig.tier3.floor, qty * panelConfig.tier3.unit);
}

function getBasePriceForService(service, qty) {
  if (service.unit === "panels") return computePanelsBasePrice(qty, activePricingConfig.rates.panels);
  const unitPrice = activePricingConfig.rates[service.key];
  return typeof unitPrice === "number" ? qty * unitPrice : null;
}

function formatUnitRateText(service, qty) {
  if (!service) return "Tarif utilise : -";

  if (service.unit === "panels") {
    const t = activePricingConfig.rates.panels;
    if (qty < t.tier1.maxExclusive) return `Tarif utilise : ${formatMoney(t.tier1.unit)}/panneau (+${formatMoney(t.tier1.floor)} minimum)`;
    if (qty <= t.tier2.maxInclusive) return `Tarif utilise : ${formatMoney(t.tier2.unit)}/panneau (+${formatMoney(t.tier2.floor)} minimum)`;
    return `Tarif utilise : ${formatMoney(t.tier3.unit)}/panneau`;
  }

  const unitPrice = activePricingConfig.rates[service.key];
  if (typeof unitPrice !== "number") return "Tarif utilise : -";
  return `Tarif utilise : ${formatMoney(unitPrice)}/m2`;
}

function updateRangeUI(unit) {
  if (unit === "panels") {
    UI.qtyLabel.textContent = "3. Nombre de panneaux";
    UI.liveUnit.textContent = "panneaux";
    UI.qtyHelp.textContent = "Le plancher est appliqué automatiquement.";
    UI.qtyRange.min = "1";
    UI.qtyRange.max = "2000";
    UI.qtyRange.step = "1";
    UI.qtyRange.value = "20";
  } else {
    UI.qtyLabel.textContent = "3. Surface (m2)";
    UI.liveUnit.textContent = "m2";
    UI.qtyHelp.textContent = "Ajustez selon la surface estimée.";
    UI.qtyRange.min = "10";
    UI.qtyRange.max = "500";
    UI.qtyRange.step = "1";
    UI.qtyRange.value = "100";
  }
}

function renderServiceButtons() {
  UI.servicesWrap.innerHTML = "";
  const services = CATEGORIES[selectedCategory] || [];
  services.forEach((service, idx) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "sim-service-btn" + (idx === 0 ? " is-active" : "");
    button.textContent = service.label;
    button.addEventListener("click", () => {
      selectedService = service;
      Array.from(UI.servicesWrap.querySelectorAll(".sim-service-btn")).forEach((b) => b.classList.remove("is-active"));
      button.classList.add("is-active");
      updateRangeUI(service.unit);
      compute();
    });
    UI.servicesWrap.appendChild(button);
  });
  selectedService = services[0];
}

function syncVariantDisplay() {
  const withDiscount = activePricingConfig.showDiscount;
  if (UI.discountCard) UI.discountCard.classList.toggle("is-hidden", !withDiscount);
  if (UI.beforeCard) UI.beforeCard.classList.toggle("is-hidden", !withDiscount);
  if (UI.finalLabel) UI.finalLabel.textContent = withDiscount ? "Prix promo estime" : "Prix estime";

  if (withDiscount) {
    const discountPercent = Math.round(activePricingConfig.discountRate * 100);
    if (UI.discountLabel) UI.discountLabel.textContent = `Reduction lancement -${discountPercent}%`;
    if (UI.topOfferText) UI.topOfferText.classList.remove("is-hidden");
    if (UI.heroOfferBadge) UI.heroOfferBadge.classList.remove("is-hidden");
    if (UI.topOfferLabel) UI.topOfferLabel.textContent = "Offre de lancement :";
    if (UI.heroOfferLabel) UI.heroOfferLabel.textContent = "Offre de lancement";
    if (UI.topOfferValue) UI.topOfferValue.textContent = `-${discountPercent}%`;
    if (UI.heroOfferValue) UI.heroOfferValue.textContent = `-${discountPercent}%`;
    if (UI.heroOfferBadge) UI.heroOfferBadge.setAttribute("aria-label", `Offre de lancement -${discountPercent} pour cent`);
  } else {
    if (UI.topOfferText) UI.topOfferText.classList.add("is-hidden");
    if (UI.heroOfferBadge) UI.heroOfferBadge.classList.add("is-hidden");
  }
}

function compute() {
  if (!selectedService) return;

  const qty = clamp(Number(UI.qtyRange.value), Number(UI.qtyRange.min), Number(UI.qtyRange.max));
  UI.liveNumber.textContent = String(qty);
  if (UI.unitRate) UI.unitRate.textContent = formatUnitRateText(selectedService, qty);

  const basePrice = getBasePriceForService(selectedService, qty);
  if (basePrice == null) {
    UI.priceBefore.textContent = "Tarif a definir";
    UI.discountValue.textContent = "-";
    UI.priceAfter.textContent = "-";
    setHidden(UI.hiddenEstimatedService, selectedService.label);
    setHidden(UI.hiddenEstimatedBefore, "");
    setHidden(UI.hiddenEstimatedAfter, "");
    setHidden(UI.hiddenEstimatedQuantity, qty);
    setHidden(UI.formEstimatedService, selectedService.label);
    setHidden(UI.formEstimatedBefore, "");
    setHidden(UI.formEstimatedAfter, "");
    setHidden(UI.formEstimatedQuantity, qty);
    return;
  }

  const discount = activePricingConfig.showDiscount ? basePrice * activePricingConfig.discountRate : 0;
  const finalPrice = basePrice - discount;

  UI.priceBefore.textContent = formatMoney(basePrice);
  UI.discountValue.textContent = activePricingConfig.showDiscount ? "-" + formatMoney(discount) : "-";
  UI.priceAfter.textContent = formatMoney(finalPrice);

  setHidden(UI.hiddenEstimatedService, selectedService.label);
  setHidden(UI.hiddenEstimatedBefore, basePrice.toFixed(2));
  setHidden(UI.hiddenEstimatedAfter, finalPrice.toFixed(2));
  setHidden(UI.hiddenEstimatedQuantity, qty);
  setHidden(UI.formEstimatedService, selectedService.label);
  setHidden(UI.formEstimatedBefore, basePrice.toFixed(2));
  setHidden(UI.formEstimatedAfter, finalPrice.toFixed(2));
  setHidden(UI.formEstimatedQuantity, qty);
  setFormService(selectedService.key);
}

function initUTM() {
  const params = new URLSearchParams(window.location.search);
  ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"].forEach((key) => {
    const el = document.getElementById(key);
    if (el) el.value = params.get(key) || "";
  });
}

function initSimulator() {
  if (!UI.servicesWrap || !UI.qtyRange) return;

  UI.categoryButtons.forEach((button) => {
    button.addEventListener("click", () => {
      selectedCategory = button.dataset.category;
      UI.categoryButtons.forEach((b) => b.classList.toggle("is-active", b === button));
      renderServiceButtons();
      updateRangeUI(selectedService.unit);
      compute();
    });
  });

  UI.qtyRange.addEventListener("input", compute);

  UI.categoryButtons.forEach((b) => b.classList.toggle("is-active", b.dataset.category === selectedCategory));
  renderServiceButtons();
  updateRangeUI(selectedService.unit);
  syncVariantDisplay();
  compute();
}

function initPricingVariantField() {
  if (UI.pricingVariantInput) UI.pricingVariantInput.value = activePricingVariant;
}

function init() {
  initUTM();
  initPricingVariantField();
  initSimulator();
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
else init();

