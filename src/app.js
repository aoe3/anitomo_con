let vendors = [];
let tokenToVendorId = {};
let lastScannedVendorId = null;

let STORAGE_KEY = "conhunt:uninitialized";

const messageEl = document.getElementById("message");

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

function render() {
  const state = loadState();
  const container = document.getElementById("vendors");
  const count = document.getElementById("count");

  container.innerHTML = "";
  count.textContent = `${state.scanned.length} / ${vendors.length}`;

  vendors.forEach(vendor => {
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

    if (state.scanned.includes(vendor.id)) {
      if (lastScannedVendorId && vendor.id === lastScannedVendorId) {
        requestAnimationFrame(() => {
          div.classList.add("collected");
        });
      } else {
        div.classList.add("collected");
      }
    }

    container.appendChild(div);
  });

  lastScannedVendorId = null;
}

function handleScanFromURL() {
  const params = new URLSearchParams(window.location.search);

  let vendorId = null;


  // NEW: token-based scan
  const token = params.get("v");
  if (token && tokenToVendorId[token]) {
    vendorId = tokenToVendorId[token];
  }

  // EXISTING: numeric scan (kept for testing/admin)
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
  }

  window.history.replaceState({}, "", window.location.pathname);
}