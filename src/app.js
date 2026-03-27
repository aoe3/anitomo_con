let vendors = [];
let tokenToVendorId = {};
let lastScannedVendorId = null;

let STORAGE_KEY = "conhunt:uninitialized";

const subtitleEl = document.getElementById("subtitle");
const progressLabelEl = document.getElementById("progress-label");
const messageEl = document.getElementById("message");
const bannerEl = document.getElementById("completion-banner");

const remainingContainer = document.getElementById("remaining-vendors");
const collectedContainer = document.getElementById("collected-vendors");
const countEl = document.getElementById("count");
const remainingCountEl = document.getElementById("remaining-count");
const collectedCountEl = document.getElementById("collected-count");

const remainingToggle = document.getElementById("remaining-toggle");
const collectedToggle = document.getElementById("collected-toggle");


remainingToggle.addEventListener("click", () => {
  const isExpanded = remainingToggle.getAttribute("aria-expanded") === "true";
  remainingToggle.setAttribute("aria-expanded", String(!isExpanded));
  remainingContainer.hidden = isExpanded;
});

collectedToggle.addEventListener("click", () => {
  const isExpanded = collectedToggle.getAttribute("aria-expanded") === "true";
  collectedToggle.setAttribute("aria-expanded", String(!isExpanded));
  collectedContainer.hidden = isExpanded;
});

fetch("vendors.public.json")
  .then(res => res.json())
  .then(data => {
    vendors = data.vendors;
    STORAGE_KEY = `conhunt:${data.eventId}`;

    vendors.forEach(v => {
      tokenToVendorId[v.token] = v.id;
    });

    handleScanFromURL();
    render();
  })
  .catch(err => {
    console.error("Failed to load vendors.public.json", err);
  });

function showMessage(text, isError = false) {
  messageEl.textContent = text;
  messageEl.hidden = false;
  messageEl.className = "message" + (isError ? " error" : "");

  setTimeout(() => {
    messageEl.hidden = true;
  }, 2000);
}

function isValidVendor(id) {
  return vendors.some(v => v.id === id);
}

function loadState() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { scanned: [] };
  } catch {
    return { scanned: [] };
  }
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function createVendorCard(vendor, isCollected) {
  const div = document.createElement("div");
  div.className = "vendor";

  const name = document.createElement("div");
  name.className = "vendor-name";
  name.textContent = vendor.name;

  const booth = document.createElement("div");
  booth.className = "vendor-booth";
  booth.textContent = `Booth ${vendor.booth}`;

  div.appendChild(name);
  div.appendChild(booth);

  if (isCollected) {
    if (lastScannedVendorId && vendor.id === lastScannedVendorId) {
      requestAnimationFrame(() => {
        div.classList.add("collected");
      });
    } else {
      div.classList.add("collected");
    }
  }

  return div;
}

function render() {
  const state = loadState();
  const scannedSet = new Set(state.scanned);

  remainingContainer.innerHTML = "";
  collectedContainer.innerHTML = "";

  const remaining = [];
  const collected = [];

  vendors.forEach(vendor => {
    if (scannedSet.has(vendor.id)) {
      collected.push(vendor);
    } else {
      remaining.push(vendor);
    }
  });

  const total = vendors.length;
  const collectedCount = collected.length;
  const percent = total ? (collectedCount / total) * 100 : 0;

  remainingCountEl.textContent = `(${remaining.length})`;
  collectedCountEl.textContent = `(${collectedCount})`;

  remaining.forEach(vendor => {
    remainingContainer.appendChild(createVendorCard(vendor, false));
  });

  collected.forEach(vendor => {
    collectedContainer.appendChild(createVendorCard(vendor, true));
  });

  lastScannedVendorId = null;

  const progressFill = document.getElementById("progress-fill");
  progressFill.style.width = `${percent}%`;

  if (collectedCount === total && total > 0) {
    subtitleEl.hidden = true;
    countEl.hidden = true;
    progressLabelEl.hidden = true;
    bannerEl.hidden = false;
    remainingToggle.setAttribute("aria-expanded", "false");
    remainingContainer.hidden = true;
    collectedToggle.setAttribute("aria-expanded", "false");
    collectedContainer.hidden = true;
  } else {
    subtitleEl.hidden = false;
    countEl.hidden = false;
    progressLabelEl.hidden = false;
    bannerEl.hidden = true;
    countEl.textContent = `${collectedCount} / ${total}`;
    progressLabelEl.textContent = "Stickers collected:";
    countEl.textContent = `${collectedCount} / ${total}`;
  }
}

function handleScanFromURL() {
  const params = new URLSearchParams(window.location.search);

  let vendorId = null;

  const token = params.get("v");
  if (token && tokenToVendorId[token]) {
    vendorId = tokenToVendorId[token];
  }

  if (!vendorId) {
    const legacyId = Number(params.get("vendor"));
    if (legacyId) {
      vendorId = legacyId;
    }
  }

  if (!vendorId) return;

  if (!isValidVendor(vendorId)) {
    showMessage("This booth is not part of the scavenger hunt.", true);
    window.history.replaceState({}, "", window.location.pathname);
    return;
  }

  const state = loadState();

  if (state.scanned.includes(vendorId)) {
    showMessage("Already collected ✔️");
  } else {
    state.scanned.push(vendorId);
    saveState(state);
    lastScannedVendorId = vendorId;

    // auto-open collected when a new sticker is added
    collectedToggle.setAttribute("aria-expanded", "true");
    collectedContainer.hidden = false;
  }

  window.history.replaceState({}, "", window.location.pathname);
}