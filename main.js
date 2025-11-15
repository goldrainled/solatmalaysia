/* main.js — AUTO MODE ONLY (Portrait fixes for 1224x2700 & 1080x1920)
   - Preserves your original solat logic (APIs, countdown, highlights)
   - Adds robust auto-detect scaling that avoids over-shrinking on tall phones
   - Listens to resize & orientationchange
*/

let zoneCode = "JHR02";
let prayerTimes = {};
let nextPrayerTime = null;

function dbg(...args){
  // Toggle this to true to get console logs for debugging
  const ENABLE_DBG = false;
  if(ENABLE_DBG) console.debug("⭑ solat:", ...args);
}

/* -------------------------
   Auto-detect / scaling
   - Fixes portrait proportional issues, esp. for:
     * 1224 x 2700
     * 1080 x 1920
   - Uses viewport-based target (not raw physical screen) to avoid large shrink
--------------------------*/

let currentTarget = { w: 1920, h: 1080 }; // fallback

function autoDetectMode() {
  const winW = window.innerWidth;
  const winH = window.innerHeight;
  const scrW = screen.width;
  const scrH = screen.height;
  const dpr  = window.devicePixelRatio || 1;

  const isPortrait = winH > winW;
  const ua = navigator.userAgent || "";
  const isMobile = /Android|iPhone|iPad|iPod/i.test(ua) || scrW < 1280;

  // Helper: produce a proportional virtual target that keeps the same aspect ratio
  // as `refW` x `refH` but sized relative to the usable viewport (winW/winH).
  function virtualTargetFromReference(refW, refH) {
    // desired aspect ratio (height / width)
    const ratio = refH / refW;
    // Prefer to size based on available viewport width so UI fills horizontally
    // but ensure resulting height is not much larger than viewport (avoid being small)
    const baseW = Math.max(winW * 1.05, Math.min(refW, winW * 1.3));
    const targetW = Math.round(baseW);
    const targetH = Math.round(targetW * ratio);

    // Ensure a minimum height so some elements don't collapse visually
    const minH = Math.round(winH * 1.05);
    return {
      w: targetW,
      h: Math.max(targetH, minH)
    };
  }

  // Special-case handling for tall phones (common problematic ratios)
  // If physical screen matches those exact tall resolutions or similar aspect ratio,
  // we use the proportional virtual target based on those references.
  const aspect1224x2700 = 2700 / 1224; // ~2.206
  const aspect1080x1920 = 1920 / 1080; // ~1.777

  // approximate aspect of current screen
  const screenAspect = scrH / scrW;

  // If device is mobile + portrait and either:
  // - physical screen equals exactly the known tall sizes (or DPR-normalized)
  // - OR screen aspect ratio is close to one of those tall aspect ratios
  // then apply the proportional virtual target technique.
  if (isMobile && isPortrait) {
    // Normalize possible DPR differences for detection (some browsers report css px)
    const physW = Math.round(scrW * dpr);
    const physH = Math.round(scrH * dpr);

    const is1224_2700 = ( (scrW === 1224 && scrH === 2700) || (physW === 1224 && physH === 2700) );
    const is1080_1920 = ( (scrW === 1080 && scrH === 1920) || (physW === 1080 && physH === 1920) );

    const aspectClose1224 = Math.abs(screenAspect - aspect1224x2700) < 0.12;
    const aspectClose1080 = Math.abs(screenAspect - aspect1080x1920) < 0.12;

    if (is1224_2700 || aspectClose1224) {
      currentTarget = virtualTargetFromReference(1224, 2700);
      dbg("portrait detected ≈1224x2700, virtualTarget:", currentTarget);
      scaleToFit();
      return;
    }

    if (is1080_1920 || aspectClose1080) {
      currentTarget = virtualTargetFromReference(1080, 1920);
      dbg("portrait detected ≈1080x1920, virtualTarget:", currentTarget);
      scaleToFit();
      return;
    }

    // Generic mobile portrait fallback: use a high-aspect reference but proportional
    const genericRefW = 1224;
    const genericRefH = 2700;
    currentTarget = virtualTargetFromReference(genericRefW, genericRefH);
    dbg("mobile portrait generic virtualTarget:", currentTarget);
    scaleToFit();
    return;
  }

  // Mobile landscape: keep previous behavior but make proportional to viewport
  if (isMobile && !isPortrait) {
    // Use the same reference rotated (2700x1224) but base on viewport height
    const refW = 2700, refH = 1224;
    const ratio = refH / refW;
    // prefer base on viewport height so landscape fills vertically
    const baseH = Math.max(winH * 1.05, Math.min(refH, winH * 1.25));
    const targetH = Math.round(baseH);
    const targetW = Math.round(targetH / ratio);
    currentTarget = { w: targetW, h: targetH };
    dbg("mobile landscape virtualTarget:", currentTarget);
    scaleToFit();
    return;
  }

  // TV detection (low DPR + large screen)
  const isTV = scrW >= 1920 && dpr <= 1.25;
  if (isTV) {
    if (isPortrait) currentTarget = { w: 1080, h: 1920 };
    else currentTarget = { w: 1920, h: 1080 };
    dbg("tv detected target:", currentTarget);
    scaleToFit();
    return;
  }

  // Fall back to using screen CSS pixels (useful for big LED walls)
  currentTarget = { w: Math.max(800, scrW), h: Math.max(600, scrH) };
  dbg("fallback custom target:", currentTarget);
  scaleToFit();
}

/* -------------------------
   Scale engine (no scroll)
--------------------------*/
function scaleToFit() {
  const host = document.getElementById("viewportHost");
  const app  = document.getElementById("app");
  if(!app || !host) return;

  // set app virtual design size
  app.style.width  = currentTarget.w + "px";
  app.style.height = currentTarget.h + "px";

  // calculate scale to fit into browser viewport
  const scale = Math.min(
    window.innerWidth  / currentTarget.w,
    window.innerHeight / currentTarget.h
  );

  app.style.transform = `scale(${scale})`;
  host.style.alignItems = "center";
  host.style.justifyContent = "center";
}

/* Re-run on resize & orientationchange */
window.addEventListener("resize", autoDetectMode);
window.addEventListener("orientationchange", () => {
  // small timeout to allow viewport/browser chrome to settle on some devices
  setTimeout(autoDetectMode, 220);
});

/* ============================================================
   The rest of your original solat logic (unchanged)
   I paste your functions verbatim but keep them intact.
============================================================*/

/* ZONE MAP */
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

function setText(id, txt){
  const el = document.getElementById(id);
  if(el) el.innerText = txt;
}

/* Hijri date */
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
    setText("dateToday", new Date().toLocaleDateString());
  }
}

/* Reverse geocode */
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
    return "";
  }
}

/* Determine zone from place string */
function determineZoneFromPlace(placeStr){
  if(!placeStr) return null;
  const s = placeStr.toLowerCase();
  // exact wipe punctuation
  const norm = s.replace(/[^\w\s]/g,' ');
  // try to find exact keyword match, prefer exact zones (non "_alias")
  for(const z of zoneKeywords){
    if(z.zone.endsWith("_alias")) continue; // skip alias on first pass
    if(norm.includes(z.key)) return z.zone;
  }
  // second pass include aliases
  for(const z of zoneKeywords){
    if(norm.includes(z.key)) return z.zone;
  }
  return null;
}

function capitalizePlace(s){
  if(!s) return "";
  return s.split(",")[0].split(" ").map(w => w.charAt(0).toUpperCase()+w.slice(1)).join(" ");
}

/* Detect zone and load */
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

/* Load prayer times for zone */
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
    // find today's entry by matching day-month-year with two month formats
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

    // Update UI times safely
    const safeSet = (id,val) => { const el = document.getElementById(id); if(el) el.innerText = val ? format(val) : "--:--"; };
    safeSet("ismakTime", prayerTimes.Ismak);
    safeSet("subuhTime", prayerTimes.Subuh);
    safeSet("syurukTime", prayerTimes.Syuruk);
    safeSet("zohorTime", prayerTimes.Zohor);
    safeSet("asarTime", prayerTimes.Asar);
    safeSet("maghribTime", prayerTimes.Maghrib);
    safeSet("isyakTime", prayerTimes.Isyak);

    // update current/prayer/next ui using existing functions
    determineNextPrayer();
    updateHighlight();
    updateCurrentPrayerCard();

  } catch(err){
    dbg("loadPrayerTimesForZone error:", err);
    setText("zoneName", `Gagal muat masa solat (${zoneCode})`);
  }
}

/* time formatter */
function format(t) {
  if (!t) return "--:--";
  if(typeof t === 'string' && !t.includes(':') && t.length === 4){
    t = t.slice(0,2) + ":" + t.slice(2);
  }
  let [h, m] = (""+t).split(":").map(Number);
  if (Number.isNaN(h)) h = 0;
  if (Number.isNaN(m)) m = 0;
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = (h % 12) || 12;
  return `${h12}:${String(m).padStart(2,"0")} ${ampm}`;
}

/* determineNextPrayer, countdown, clock, highlight, etc.
   Copied & slightly adapted from prior main.js to use the dynamic prayerTimes variable.
*/

function determineNextPrayer() {
  if (!Object.keys(prayerTimes).length) return;
  const now = new Date();
  const list = Object.entries(prayerTimes);
  // try to set label text if present
  const nl = document.getElementById("nextLabel");
  if(nl) nl.innerText = "Waktu Solat Seterusnya";

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

  // after last prayer: set to tomorrow Subuh
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

/* Clock (updates every second) */
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

/* debug helper to force a specific zone code at runtime:
   window.setZoneAndReload("JHR02");
*/
window.setZoneAndReload = async function(z){
  zoneCode = String(z).toUpperCase();
  dbg("manually set zone:", zoneCode);
  setText("zoneName", `${zoneCode} (manual)`);
  await loadPrayerTimesForZone(zoneCode);
};

/* Start: set dates then detect zone & load */
(async function init(){
  await setAutoDates();
  autoDetectMode();
  await detectZoneAndLoad();
  scaleToFit();
})();
