let vendors = [];
let tokenToVendorId = {};
let lastScannedVendorId = null;

let STORAGE_KEY = "conhunt:uninitialized";

const SUPABASE_URL = "https://ujfvsnftyrbvyrdycami.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_tHRDPdmxJOnZyMCnrLHNLQ_QKCgfegp";

const subtitleEl = document.getElementById("subtitle");
const progressLabelEl = document.getElementById("progress-label");
const messageEl = document.getElementById("message");
const bannerEl = document.getElementById("completion-banner");
const progressBarWrapperEl = document.getElementById("progress-bar-wrapper");
const progressSectionEl = document.getElementById("progress");
const huntOverBannerEl = document.getElementById("hunt-over-banner");

const remainingContainer = document.getElementById("remaining-vendors");
const collectedContainer = document.getElementById("collected-vendors");
const countEl = document.getElementById("count");
const remainingCountEl = document.getElementById("remaining-count");
const collectedCountEl = document.getElementById("collected-count");

const remainingToggle = document.getElementById("remaining-toggle");
const collectedToggle = document.getElementById("collected-toggle");

let huntFinishedCache = null;

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
  .then((res) => res.json())
  .then(async (data) => {
    vendors = data.vendors;
    STORAGE_KEY = `conhunt:${data.eventId}`;

    vendors.forEach((v) => {
      tokenToVendorId[v.token] = v.id;
    });

    await handleScanFromURL();
    render();
  })
  .catch((err) => {
    console.error("Failed to load vendors.public.json", err);
  });

function showMessage(text, isError = false) {
  messageEl.textContent = text;
  messageEl.className = "message visible" + (isError ? " error" : "");
  messageEl.style.opacity = "1";

  setTimeout(() => {
    messageEl.style.opacity = "0";
    messageEl.className = "message" + (isError ? " error" : "");
  }, 2000);
}

function isValidVendor(id) {
  return vendors.some((v) => v.id === id);
}

function normalizeState(rawState) {
  const state = rawState && typeof rawState === "object" ? rawState : {};
  return {
    scanned: Array.isArray(state.scanned) ? state.scanned : [],
    collectedAt:
      state.collectedAt && typeof state.collectedAt === "object"
        ? state.collectedAt
        : {},
  };
}

function loadState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return normalizeState(parsed);
  } catch {
    return normalizeState();
  }
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeState(state)));
}

function getTruncatedTimestampISO() {
  const now = new Date();
  now.setSeconds(0, 0);
  return now.toISOString();
}

async function checkHuntStatusOnce() {
  if (huntFinishedCache !== null) return huntFinishedCache;

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/anitomo_scavenger_hunt_status?id=eq.1&select=is_finished`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    }
  );

  const data = await res.json();
  huntFinishedCache = data?.[0]?.is_finished === true;
  return huntFinishedCache;
}

function formatCollectedTime(isoString) {
  if (!isoString) return "";

  const date = new Date(isoString);

  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

function formatDuration(startISO, endISO) {
  if (!startISO || !endISO) return "";

  const start = new Date(startISO);
  const end = new Date(endISO);

  const diffMs = end - start;
  if (Number.isNaN(diffMs) || diffMs < 0) return "";

  const totalMinutes = Math.round(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours <= 0) {
    return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  }

  if (minutes === 0) {
    return `${hours} hour${hours === 1 ? "" : "s"}`;
  }

  return `${hours} hour${hours === 1 ? "" : "s"} and ${minutes} minute${
    minutes === 1 ? "" : "s"
  }`;
}

function getCompletionDurationText(state) {
  const timestamps = Object.values(state.collectedAt)
    .filter(Boolean)
    .map((iso) => new Date(iso))
    .filter((d) => !Number.isNaN(d.getTime()))
    .sort((a, b) => a - b);

  if (timestamps.length === 0) return "";

  const startISO = timestamps[0].toISOString();
  const endISO = timestamps[timestamps.length - 1].toISOString();
  const duration = formatDuration(startISO, endISO);

  return duration
    ? `You completed the hunt in ${duration}! Congrats!`
    : "";
}

function createVendorCard(vendor, isCollected, collectedTime = "") {
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

  if (isCollected && collectedTime) {
    const time = document.createElement("div");
    time.className = "vendor-time";
    time.textContent = collectedTime;
    div.appendChild(time);
  }

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

function renderCompletionBanner(state) {
  const durationText = getCompletionDurationText(state);
  bannerEl.textContent = durationText || "🎉 Collection complete!";
}

function render() {
  const state = loadState();
  const scannedSet = new Set(state.scanned);
  const huntIsOver = huntFinishedCache === true;

  remainingContainer.innerHTML = "";
  collectedContainer.innerHTML = "";

  const remaining = [];
  const collected = [];

  vendors.forEach((vendor) => {
    if (scannedSet.has(vendor.id)) {
      collected.push(vendor);
    } else {
      remaining.push(vendor);
    }
  });

  collected.sort((a, b) => {
    const aISO = state.collectedAt[String(a.id)] || "";
    const bISO = state.collectedAt[String(b.id)] || "";

    if (!aISO && !bISO) return 0;
    if (!aISO) return 1;
    if (!bISO) return -1;

    return new Date(aISO) - new Date(bISO);
  });

  const total = vendors.length;
  const collectedCount = collected.length;
  const percent = total ? (collectedCount / total) * 100 : 0;

  remainingCountEl.textContent = `(${remaining.length})`;
  collectedCountEl.textContent = `(${collectedCount})`;

  remaining.forEach((vendor) => {
    remainingContainer.appendChild(createVendorCard(vendor, false));
  });

  collected.forEach((vendor) => {
    const collectedISO = state.collectedAt[String(vendor.id)];
    const collectedTime = formatCollectedTime(collectedISO);
    collectedContainer.appendChild(
      createVendorCard(vendor, true, collectedTime)
    );
  });

  lastScannedVendorId = null;

  const progressFill = document.getElementById("progress-fill");
  progressFill.style.width = `${percent}%`;

  if (huntIsOver) {
    huntOverBannerEl.hidden = false;

    subtitleEl.hidden = true;
    bannerEl.hidden = true;

    progressSectionEl.hidden = true;
    progressBarWrapperEl.hidden = true;

    remainingToggle.hidden = true;
    remainingContainer.hidden = true;

    collectedToggle.hidden = true;
    collectedContainer.hidden = true;

    return;
  }

  huntOverBannerEl.hidden = true;

  progressSectionEl.hidden = false;
  progressBarWrapperEl.hidden = false;

  remainingToggle.hidden = false;
  collectedToggle.hidden = false;

  if (collectedCount === total && total > 0) {
    subtitleEl.hidden = true;
    countEl.hidden = true;
    progressLabelEl.hidden = true;

    renderCompletionBanner(state);
    bannerEl.hidden = false;

    remainingToggle.setAttribute("aria-expanded", "false");
    remainingContainer.hidden = true;

    collectedToggle.setAttribute("aria-expanded", "true");
    collectedContainer.hidden = false;
  } else {
    subtitleEl.hidden = false;
    countEl.hidden = false;
    progressLabelEl.hidden = false;
    bannerEl.hidden = true;

    progressLabelEl.textContent = "Stickers collected:";
    countEl.textContent = `${collectedCount} / ${total}`;
  }
}

async function handleScanFromURL() {
  const finished = await checkHuntStatusOnce();

  if (finished) {
    window.history.replaceState({}, "", window.location.pathname);
    return;
  }

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
  const vendor = vendors.find((v) => v.id === vendorId);

  if (state.scanned.includes(vendorId)) {
    showMessage(`${vendor.name} already collected ✔️`);
  } else {
    state.scanned.push(vendorId);

    const vendorKey = String(vendorId);
    if (!state.collectedAt[vendorKey]) {
      state.collectedAt[vendorKey] = getTruncatedTimestampISO();
    }

    saveState(state);
    lastScannedVendorId = vendorId;

    showMessage(`${vendor.name} collected! 🎉`);
  }

  window.history.replaceState({}, "", window.location.pathname);
}