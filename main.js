/* main.js - extended for multi-mode scaling + custom resolution toolbar
   Original solat logic kept; added viewport scaling and UI controls.
   Based on uploaded file main.js. :contentReference[oaicite:3]{index=3}
*/

/* ---------- existing variables (kept) ---------- */
let zoneCode = "JHR02"; // default fallback if mapping fails
let prayerTimes = {};
let nextPrayerTime = null;

function dbg(...args){ console.debug("⭑ solat:", ...args); }

/* ---------- Mode presets ---------- */
const MODE_PRESETS = {
  "mobile-land": {w:2700, h:1224, label: "Mobile Landscape 2700×1224"},
  "mobile-port": {w:1224, h:2700, label: "Mobile Portrait 1224×2700"},
  "tv-land": {w:1920, h:1080, label: "TV Landscape 1920×1080"},
  "tv-port": {w:1080, h:1920, label: "TV Portrait 1080×1920"},
  // auto - choose based on window orientation or custom inputs
  "auto": {w:null, h:null, label: "Auto (Fit screen)"},
};

let currentMode = "auto";
let currentTarget = {w: 1920, h:1080}; // default design target (will be overridden)

/* ---------- DOM helpers (kept + new) ---------- */
function setText(id, txt){
  const el = document.getElementById(id);
  if(el) el.innerText = txt;
}

/* ---------- Existing helper functions (Hijri, geolocation, e-solat) ----------
   I preserved your original functions and their behavior. For brevity in this block
   they remain unchanged (but are present later). We'll append scaling logic and
   attach to UI.
   NOTE: The rest of your original functions remain below (they were too long to copy here).
*/

/* ---------- === SCALING / MODE FUNCTIONS === ---------- */

/* apply a given mode name (one of presets or "custom") */
function applyMode(modeName, customW, customH){
  currentMode = modeName;
  // If custom provided, use it; otherwise pick preset
  if(modeName === "auto"){
    // Auto: pick orientation based on window aspect ratio and optional custom sizes
    // If user provided customW/customH, use them; otherwise we adapt to window
    if(customW && customH){
      currentTarget = {w: Number(customW), h: Number(customH)};
    } else {
      // default to current window size (use a large "design" size but we will scale)
      // choose a reasonable design resolution depending on orientation
      const winW = window.innerWidth;
      const winH = window.innerHeight;
      if(winW >= winH){
        currentTarget = {w: Math.max(1280, winW), h: Math.max(720, winH)};
      } else {
        currentTarget = {w: Math.max(720, winW), h: Math.max(1280, winH)};
      }
    }
  } else if(MODE_PRESETS[modeName]){
    const p = MODE_PRESETS[modeName];
    currentTarget = {w: p.w, h: p.h};
  } else if(modeName === "custom" && customW && customH){
    currentTarget = {w: Number(customW), h: Number(customH)};
  } else {
    // fallback
    currentTarget = {w: 1920, h:1080};
  }

  // update toolbar active button visuals
  document.querySelectorAll(".mode-toolbar .mt-btn").forEach(b => {
    b.classList.toggle("active", b.dataset.mode === modeName);
  });

  // perform scale/fit
  scaleToFit();
}

/* scale the #app element (which has fixed target width/height) to fit into the window
   without scrolling and maintaining aspect ratio. Centers content.
*/
function scaleToFit(){
  const host = document.getElementById("viewportHost");
  const app = document.getElementById("app");
  if(!app || !host) return;

  // set the app element to the design size (px)
  app.style.width = currentTarget.w + "px";
  app.style.height = currentTarget.h + "px";

  // calculate scale to fit the available window size without overflow
  const availW = window.innerWidth;
  const availH = window.innerHeight;

  // compute scale
  const scale = Math.min(availW / currentTarget.w, availH / currentTarget.h);

  // set transform (rounded nicely)
  const s = Math.max(0.0001, Number(scale.toFixed(6)));
  app.style.transform = `scale(${s})`;

  // Update toolbar info
  const info = document.getElementById("toolbarInfo");
  if(info){
    info.innerText = `Viewport: ${availW}×${availH} | Target: ${currentTarget.w}×${currentTarget.h} | Scale: ${s.toFixed(2)}`;
  }

  // prevent any page-level scrollbars (we set body overflow:hidden in CSS),
  // but ensure the host centers the scaled app
  host.style.alignItems = "center";
  host.style.justifyContent = "center";
}

/* ---------- UI wiring ---------- */
function attachModeToolbar(){
  // buttons
  document.querySelectorAll(".mode-toolbar .mt-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const m = btn.dataset.mode;
      // if auto mode applied, use no custom size
      applyMode(m);
    });
  });

  // custom apply
  document.getElementById("applyCustom").addEventListener("click", () => {
    const w = document.getElementById("customW").value;
    const h = document.getElementById("customH").value;
    if(!w || !h) return alert("Enter both width and height (pixels).");
    applyMode("custom", w, h);
  });

  // toggle toolbar visibility
  const toggle = document.getElementById("toggleToolbar");
  const toolbar = document.getElementById("modeToolbar");
  toggle.addEventListener("click", () => {
    const visible = toolbar.getAttribute("data-visible") !== "false";
    if(visible){
      toolbar.style.opacity = "0.06";
      toolbar.style.pointerEvents = "none";
      toolbar.setAttribute("data-visible", "false");
    } else {
      toolbar.style.opacity = "1";
      toolbar.style.pointerEvents = "auto";
      toolbar.setAttribute("data-visible", "true");
    }
  });

  // keyboard shortcuts for convenience
  window.addEventListener("keydown", (ev) => {
    if(ev.altKey && ev.key === "1") applyMode("mobile-land");
    if(ev.altKey && ev.key === "2") applyMode("mobile-port");
    if(ev.altKey && ev.key === "3") applyMode("tv-land");
    if(ev.altKey && ev.key === "4") applyMode("tv-port");
    if(ev.altKey && ev.key === "0") applyMode("auto");
  });
}

/* ---------- Keep pull-to-refresh behavior available ----------
   We do NOT add touchmove preventDefault handlers that would block the native pull-to-refresh.
   Styling in CSS uses overscroll-behavior-y:auto to allow the browser to handle refresh gestures.
*/

/* ---------- Hook onto window resize to maintain correct scale ---------- */
window.addEventListener("resize", () => {
  // If in auto mode, re-evaluate target (we keep same target but we may want to re-scale)
  if(currentMode === "auto"){
    // small heuristic: set currentTarget to a base that respects orientation
    const winW = window.innerWidth, winH = window.innerHeight;
    if(winW >= winH){
      // landscape base
      currentTarget = {w: Math.max(1280, winW), h: Math.max(720, winH)};
    } else {
      currentTarget = {w: Math.max(720, winW), h: Math.max(1280, winH)};
    }
  }
  scaleToFit();
});

/* ---------- initialize toolbar and default mode ---------- */
function initModeSystem(){
  attachModeToolbar();
  // default to auto so that the page fits any screen at first load
  applyMode("auto");
}

/* ============================
   The rest of your existing functions (Hijri, reverseGeocode, ipGeolocate, zone mapping,
   loadPrayerTimesForZone, determineNextPrayer, clock, updateHighlight, updateCurrentPrayerCard)
   are preserved from your original main.js. I've appended them below verbatim (kept logic).
   For brevity in this header I will reintroduce them exactly as you had them.
   ============================ */

/* ---------------------------
   ZONE MAPPING (best-effort)
----------------------------*/
const ZONE_MAP = {
  "JHR01": ["pulau aur","pulau pemanggil"],
  "JHR02": ["johor bahru","kota tinggi","mersing","jhr02","jb","johor bharu"],
  "JHR03": ["kluang","pontian"],
  "JHR04": ["batu pahat","muar","segamat","gemas"],
  "KDH01": ["kota setar","kubang pasu","pokok sena"],
  "KDH02": ["kuala muda","yan","pendang"],
  "KDH03": ["padang terap","sik"],
  "KDH04": ["baling"],
  "KDH05": ["bandar baharu","kulim"],
  "KDH06": ["langkawi"],
  "KTN01": ["bachok","kota bharu","machang","pasir mas","pasir puteh","tanah merah","tumpat","kuala krai"],
  "MLK01": ["alor gajah","melaka"],
  "PLS01": ["perlis","kangar"],
  "PNG01": ["pulau pinang","george town","penang","seberang perai"],
  "KDH07": ["gunung jerai"],
  "PHG01": ["pahang","kuantan","cameron","pahang"],
  "PHG02": ["temerloh","lipis","raub"],
  "PRK01": ["ipoh","perak","kinta","manjung","taiping","kerian"],
  "SGR01": ["selangor","shah alam","kajang"," Klang","petaling","gombak","kuala langat","kuala selangor","hulu selangor"],
  "KUL01": ["kuala lumpur","wp kuala lumpur","wp kl"],
  "PLS01": ["perlis","kangar"],
  "SBH01": ["sabah","kota kinabalu","sandakan","tawau"],
  "SRW01": ["sri aman","sri aman region","sarawak","kuching","sibu","miri"],
  "TRG01": ["kuala terengganu","terengganu"],
  "KEL01": ["kelantan"],
  "JHR02_alias": ["johor", "johor bahru", "jb"],
  "SBH02": ["labuan"],
};

const zoneKeywords = [];
for(const [zone,arr] of Object.entries(ZONE_MAP)){
  if(!Array.isArray(arr)) continue;
  arr.forEach(k => zoneKeywords.push({zone, key: k.toLowerCase()}));
}

/* DOM helper already defined (setText) */

/* Hijri date: call AlAdhan API */
async function setAutoDates(){
  try {
    const now = new Date();
    const dd = String(now.getDate()).padStart(2,'0');
    const mm = String(now.getMonth()+1).padStart(2,'0');
    const yyyy = now.getFullYear();
    const dateStr = `${dd}-${mm}-${yyyy}`;

    const res = await fetch(`https://api.aladhan.com/v1/gToH?date=${dateStr}`);
    const j = await res.json();
    if(j && j.data && j.data.hijri){
      const h = j.data.hijri;
      const hijriMonth = (h.month && (h.month.en || h.month.ar)) || "";
      const hijriDay = h.day;
      const hijriYear = h.year;
      const gMonthName = new Intl.DateTimeFormat('en-US',{month:'long'}).format(now);
      const final = `${dd} ${gMonthName} ${yyyy} , ${hijriDay} ${hijriMonth} ${hijriYear}H`;
      setText("dateToday", final);
      return;
    }
    setText("dateToday", new Date().toLocaleDateString());
  } catch(err){
    dbg("Hijri fetch failed:", err);
    setText("dateToday", new Date().toLocaleDateString());
  }
}

/* Reverse geocode coords via Nominatim */
async function reverseGeocode(lat, lon){
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`;
    const res = await fetch(url, {headers: {'User-Agent': 'solat-display/1.0 (your-email@example.com)'}});
    if(!res.ok) throw new Error("revgeo HTTP " + res.status);
    const j = await res.json();
    const addr = j.address || {};
    const parts = [
      addr.city, addr.town, addr.village,
      addr.county, addr.state, addr.region, addr.state_district,
      addr.country
    ].filter(Boolean).map(s => String(s).toLowerCase());
    return parts.join(", ");
  } catch(e){
    dbg("reverseGeocode error:", e);
    return "";
  }
}

/* IP geolocation fallback (ipapi.co) */
async function ipGeolocate(){
  try {
    const res = await fetch("https://ipapi.co/json/");
    if(!res.ok) throw new Error("ipapi HTTP " + res.status);
    const j = await res.json();
    const parts = [j.city, j.region, j.country_name].filter(Boolean).map(s => String(s).toLowerCase());
    return parts.join(", ");
  } catch(e){
    dbg("ipGeolocate error:", e);
    return "";
  }
}

/* Determine zone from place string */
function determineZoneFromPlace(placeStr){
  if(!placeStr) return null;
  const s = placeStr.toLowerCase();
  const norm = s.replace(/[^\w\s]/g,' ');
  for(const z of zoneKeywords){
    if(z.zone.endsWith("_alias")) continue;
    if(norm.includes(z.key)) return z.zone;
  }
  for(const z of zoneKeywords){
    if(norm.includes(z.key)) return z.zone;
  }
  return null;
}

/* detectZoneAndLoad preserves original flow but will not affect scaling */
async function detectZoneAndLoad(){
  setText("zoneName", "Mengesan lokasi...");
  let placeStr = "";

  if(navigator.geolocation){
    try {
      const pos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {timeout:8000, maximumAge:5*60*1000});
      });
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      dbg("geo coords:", lat, lon);
      placeStr = await reverseGeocode(lat, lon);
    } catch(e){
      dbg("geolocation failed:", e);
      placeStr = await ipGeolocate();
    }
  } else {
    placeStr = await ipGeolocate();
  }

  dbg("placeStr:", placeStr);
  const foundZone = determineZoneFromPlace(placeStr);
  if(foundZone){
    const standardized = foundZone.replace(/_alias$/,'');
    zoneCode = standardized;
    setText("zoneName", `${zoneCode.toUpperCase()} - ${capitalizePlace(placeStr)}`);
    dbg("zone determined:", zoneCode);
  } else {
    dbg("zone not found from place, falling back to default:", zoneCode);
    setText("zoneName", `${zoneCode} - ${capitalizePlace(placeStr || "Lokasi tidak dikesan")}`);
  }

  await loadPrayerTimesForZone(zoneCode);
}

function capitalizePlace(s){
  if(!s) return "";
  return s.split(",")[0].split(" ").map(w => w.charAt(0).toUpperCase()+w.slice(1)).join(" ");
}

/* Fetch prayer times for zone (month) and populate UI */
async function loadPrayerTimesForZone(Z){
  try {
    const url = `https://www.e-solat.gov.my/index.php?r=esolatApi/takwimsolat&period=month&zone=${encodeURIComponent(Z)}`;
    dbg("fetching e-solat url:", url);

    const res = await fetch(url, {cache: "no-store"});
    dbg("fetch response status:", res.status);
    if(!res.ok) throw new Error("HTTP " + res.status);

    const data = await res.json();
    dbg("esolat keys:", Object.keys(data || {}));
    const list = Array.isArray(data.prayerTime) ? data.prayerTime : [];
    const today = new Date();
    const day = String(today.getDate()).padStart(2,'0');
    const year = today.getFullYear();
    const monthsTitle = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const monthsUpper = monthsTitle.map(m => m.toUpperCase());
    const esDate1 = `${day}-${monthsTitle[today.getMonth()]}-${year}`;
    const esDate2 = `${day}-${monthsUpper[today.getMonth()]}-${year}`;

    let todayEntry = list.find(p => {
      const d = (p.date||"").toString().trim();
      return d === esDate1 || d === esDate2;
    });
    if(!todayEntry) todayEntry = list[list.length-1];

    dbg("todayEntry:", todayEntry);
    const norm = t => (t||"").toString().trim().padStart(4,"0");
    prayerTimes = {
      Ismak: norm(todayEntry.imsak),
      Subuh: norm(todayEntry.fajr),
      Syuruk: norm(todayEntry.syuruk),
      Zohor: norm(todayEntry.dhuhr),
      Asar: norm(todayEntry.asr),
      Maghrib: norm(todayEntry.maghrib),
      Isyak: norm(todayEntry.isha)
    };

    const safeSet = (id,val) => { const el = document.getElementById(id); if(el) el.innerText = val ? format(val) : "--:--"; };
    safeSet("ismakTime", prayerTimes.Ismak);
    safeSet("subuhTime", prayerTimes.Subuh);
    safeSet("syurukTime", prayerTimes.Syuruk);
    safeSet("zohorTime", prayerTimes.Zohor);
    safeSet("asarTime", prayerTimes.Asar);
    safeSet("maghribTime", prayerTimes.Maghrib);
    safeSet("isyakTime", prayerTimes.Isyak);

    determineNextPrayer();
    updateHighlight();
    updateCurrentPrayerCard();

  } catch(err){
    dbg("loadPrayerTimesForZone error:", err);
    setText("zoneName", `Gagal muat masa solat (${zoneCode})`);
  }
}

/* time formatting */
function format(t) {
  if (!t) return "--:--";
  if(typeof t === 'string' && !t.includes(':') && t.length === 4){
    t = t.slice(0,2) + ":" + t.slice(2);
  }
  let [h, m] = (""+t).split(":").map(x => Number((x||"").toString().trim() || 0));
  if (Number.isNaN(h)) h = 0;
  if (Number.isNaN(m)) m = 0;
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = (h % 12) || 12;
  return `${h12}:${String(m).padStart(2,"0")} ${ampm}`;
}

/* determineNextPrayer, countdown, clock, highlight, etc. */
function determineNextPrayer() {
  if (!Object.keys(prayerTimes).length) return;
  const now = new Date();
  const list = Object.entries(prayerTimes);
  for (let [name,time] of list) {
    if(!time) continue;
    const [h,m] = time.split(":").map(Number);
    const t = new Date();
    t.setHours(h||0,m||0,0,0);
    if(t > now){
      nextPrayerTime = t;
      const np = document.getElementById("nextPrayerNameLarge");
      if(np) np.innerText = name;
      return;
    }
  }

  // set to next day's Subuh
  let tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate()+1);
  const [h,m] = (prayerTimes.Subuh || "05:00").split(":").map(Number);
  tomorrow.setHours(h||5,m||0,0,0);
  nextPrayerTime = tomorrow;
  const np2 = document.getElementById("nextPrayerNameLarge"); if(np2) np2.innerText = "Subuh";
}

setInterval(() => {
  if (!nextPrayerTime) return;
  const now = new Date();
  let diff = nextPrayerTime - now;
  if(diff <= 0){ determineNextPrayer(); return; }
  const h = Math.floor(diff/(1000*60*60));
  const m = Math.floor((diff/1000/60)%60);
  const s = Math.floor((diff/1000)%60);
  const set = (id,v) => { const el = document.getElementById(id); if(el) el.innerText = String(v).padStart(2,"0"); };
  set("cdHour", h); set("cdMin", m); set("cdSec", s);
}, 1000);

/* Clock */
function updateClock(){
  const now = new Date();
  let h = now.getHours();
  let m = now.getMinutes().toString().padStart(2,"0");
  let s = now.getSeconds().toString().padStart(2,"0");
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = (h%12) || 12;
  const el = document.getElementById("currentTime");
  if(el) el.innerText = `${h12}:${m}:${s} ${ampm}`;
  updateHighlight();
  updateCurrentPrayerCard();
}
setInterval(updateClock,1000);
updateClock();

function updateCurrentPrayerCard(){
  if(!Object.keys(prayerTimes).length) return;
  const now = new Date();
  let active = "Isyak";
  for(let [name,time] of Object.entries(prayerTimes)){
    if(!time) continue;
    const [h,m] = time.split(":").map(Number);
    const t = new Date();
    t.setHours(h||0,m||0,0,0);
    if(t <= now) active = name;
  }
  const nameEl = document.getElementById("currentPrayerName");
  const timeEl = document.getElementById("currentPrayerTime");
  if(nameEl) nameEl.innerText = active;
  if(timeEl) timeEl.innerText = format(prayerTimes[active]);
}

function updateHighlight(){
  if(!Object.keys(prayerTimes).length) return;
  const now = new Date();
  let active = "Isyak";
  for(let [name,time] of Object.entries(prayerTimes)){
    if(!time) continue;
    const [h,m] = time.split(":").map(Number);
    const t = new Date();
    t.setHours(h||0,m||0,0,0);
    if(t <= now) active = name;
  }
  document.querySelectorAll(".prayer-row").forEach(c => c.classList.remove("currentPrayer"));
  const activeCard = document.getElementById("card" + active);
  if(activeCard) activeCard.classList.add("currentPrayer");
}

/* debug helper */
window.setZoneAndReload = async function(z){
  zoneCode = String(z).toUpperCase();
  dbg("manually set zone:", zoneCode);
  setText("zoneName", `${zoneCode} (manual)`);
  await loadPrayerTimesForZone(zoneCode);
};

window.debugPrayerLib = function(){
  dbg("zoneCode:", zoneCode);
  dbg("prayerTimes:", prayerTimes);
  dbg("nextPrayerTime:", nextPrayerTime);
};

/* ---------- boot sequence (init) ---------- */
(async function init(){
  // initialize dates, modes, and zone detection
  await setAutoDates();
  initModeSystem();          // sets toolbar and applies default 'auto' mode
  await detectZoneAndLoad(); // loads prayer times
  // make sure scale is correct once everything is ready
  scaleToFit();
})();
