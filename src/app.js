const vendors = [
  { id: 1, name: "Vendor A" },
  { id: 2, name: "Vendor B" },
  { id: 3, name: "Vendor C" },
];

const STORAGE_KEY = "conhunt:v1:test";

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
  count.textContent = state.scanned.length;

  vendors.forEach(vendor => {
    const div = document.createElement("div");
    div.className = "vendor";
    div.textContent = vendor.name;

    if (state.scanned.includes(vendor.id)) {
      div.classList.add("collected");
    }

    container.appendChild(div);
  });
}

// TEMP: simulate scanning vendor 1 via URL ?vendor=1
function handleScanFromURL() {
  const params = new URLSearchParams(window.location.search);
  const vendorId = Number(params.get("vendor"));

  if (!vendorId) return;

  if (!isValidVendor(vendorId)) {
    alert("This booth is not part of the scavenger hunt.");
    window.history.replaceState({}, "", window.location.pathname);
    return;
  }

  const state = loadState();
  if (!state.scanned.includes(vendorId)) {
    state.scanned.push(vendorId);
    saveState(state);
  }

  window.history.replaceState({}, "", window.location.pathname);
}

handleScanFromURL();
render();
