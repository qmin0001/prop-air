const currency = new Intl.NumberFormat("fr-BE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 2,
});

const DISCOUNT_RATE = 0.5;

const PRICES = {
  ROOF_SIMPLE_EUR_PER_M2: 9.5,
  ROOF_DEMOSSAGE_EUR_PER_M2: 14,
  FACADES_CLEAN_EUR_PER_M2: 9.5,
  HYDROFUGE_EUR_PER_M2: 18,
  WINDOWS_EUR_PER_M2: 9,
};

const CATEGORIES = {
  roof: [
    { key: "roof_simple", label: "Traitement toiture simple", unit: "m2", unitPrice: PRICES.ROOF_SIMPLE_EUR_PER_M2 },
    { key: "roof_demossage", label: "Démoussage toiture", unit: "m2", unitPrice: PRICES.ROOF_DEMOSSAGE_EUR_PER_M2 },
  ],
  facade: [
    { key: "facades_clean", label: "Nettoyage façade", unit: "m2", unitPrice: PRICES.FACADES_CLEAN_EUR_PER_M2 },
    { key: "hydrofuge", label: "Traitement hydrofuge", unit: "m2", unitPrice: PRICES.HYDROFUGE_EUR_PER_M2 },
  ],
  panels: [{ key: "panels", label: "Nettoyage panneaux solaires", unit: "panels" }],
  windows: [{ key: "windows", label: "Nettoyage vitres", unit: "m2", unitPrice: PRICES.WINDOWS_EUR_PER_M2 }],
};

const FORM_SERVICE_MAP = {
  roof_simple: "toiture",
  roof_demossage: "toiture",
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
  liveNumber: document.getElementById("sim-live-number"),
  liveUnit: document.getElementById("sim-live-unit"),
  priceBefore: document.getElementById("price-before"),
  discountValue: document.getElementById("discount-value"),
  priceAfter: document.getElementById("price-after"),
  formService: document.getElementById("form-service"),
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

function panelsBasePrice(count) {
  const qty = Math.max(0, count);
  if (qty < 50) return Math.max(150, qty * 6.0);
  if (qty <= 500) return Math.max(150, qty * 5.5);
  return qty * 5.0;
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

function compute() {
  if (!selectedService) return;

  const qty = clamp(Number(UI.qtyRange.value), Number(UI.qtyRange.min), Number(UI.qtyRange.max));
  UI.liveNumber.textContent = String(qty);

  let before = null;
  if (selectedService.unit === "panels") before = panelsBasePrice(qty);
  else if (typeof selectedService.unitPrice === "number") before = qty * selectedService.unitPrice;

  if (before == null) {
    UI.priceBefore.textContent = "Tarif à définir";
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

  const discount = before * DISCOUNT_RATE;
  const after = before - discount;

  UI.priceBefore.textContent = formatMoney(before);
  UI.discountValue.textContent = "-" + formatMoney(discount);
  UI.priceAfter.textContent = formatMoney(after);

  setHidden(UI.hiddenEstimatedService, selectedService.label);
  setHidden(UI.hiddenEstimatedBefore, before.toFixed(2));
  setHidden(UI.hiddenEstimatedAfter, after.toFixed(2));
  setHidden(UI.hiddenEstimatedQuantity, qty);
  setHidden(UI.formEstimatedService, selectedService.label);
  setHidden(UI.formEstimatedBefore, before.toFixed(2));
  setHidden(UI.formEstimatedAfter, after.toFixed(2));
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

  // Etat initial
  UI.categoryButtons.forEach((b) => b.classList.toggle("is-active", b.dataset.category === selectedCategory));
  renderServiceButtons();
  updateRangeUI(selectedService.unit);
  compute();
}

function init() {
  initUTM();
  initSimulator();
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
else init();

