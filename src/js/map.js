const SUPABASE_URL = "https://ujfvsnftyrbvyrdycami.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_tHRDPdmxJOnZyMCnrLHNLQ_QKCgfegp";

const mapBackRowEl = document.querySelector(".map-back-row");

async function checkHuntFinished() {
  try {
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
    return data?.[0]?.is_finished === true;
  } catch (err) {
    console.error("Failed to check hunt status", err);
    return false;
  }
}

(async function initMapPage() {
  const finished = await checkHuntFinished();

  if (mapBackRowEl && !finished) {
    mapBackRowEl.hidden = false;
  }
})();