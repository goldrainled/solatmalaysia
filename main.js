/* main.js
   Auto-location -> zone -> e-Solat fetch -> UI population
   - Geolocation (preferred) then IP fallback
   - Reverse geocode to get locality/state (Nominatim)
   - Map locality/state to JAKIM zone code (best-effort)
   - Fetch prayer times from e-Solat (monthly endpoint) and populate UI
   - Fetch Hijri date from AlAdhan and show combined date string
   - Integrates with the existing display HTML IDs
*/

let zoneCode = "JHR02"; // default fallback if mapping fails
let prayerTimes = {};
let nextPrayerTime = null;

function dbg(...args){ console.debug("⭑ solat:", ...args); }

/* ---------------------------
   ZONE MAPPING (best-effort)
   keywords lists adapted from JAKIM zone list (partial but extensive)
   Add / tune keywords if you have specific districts.
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

  // Add common city-to-zone shortcuts:
  "JHR02_alias": ["johor", "johor bahru", "jb"],
  "SBH02": ["labuan"],
  // (Note: This map is large in real JAKIM; expand as needed)
};

// Build inverse lookup array for faster matching (lowercased)
const zoneKeywords = [];
for(const [zone,arr] of Object.entries(ZONE_MAP)){
  if(!Array.isArray(arr)) continue;
  arr.forEach(k => zoneKeywords.push({zone, key: k.toLowerCase()}));
}

/* ---------------------------
   DOM helpers
----------------------------*/
function setText(id, txt){
  const el = document.getElementById(id);
  if(el) el.innerText = txt;
}

/* ---------------------------
   Hijri date: call AlAdhan API
   Returns formatted string like "14 November 2025 , 23 Jamadilawal 1447H"
----------------------------*/
async function setAutoDates(){
  try {
    const now = new Date();
    const dd = String(now.getDate()).padStart(2,'0');
    const mm = String(now.getMonth()+1).padStart(2,'0');
    const yyyy = now.getFullYear();
    const dateStr = `${dd}-${mm}-${yyyy}`;

    // fetch hijri conversion
    const res = await fetch(`https://api.aladhan.com/v1/gToH?date=${dateStr}`);
    const j = await res.json();
    if(j && j.data && j.data.hijri){
      const h = j.data.hijri;
      // month transcription - use english/arabic transliteration then slight tweaks
      const hijriMonth = (h.month && (h.month.en || h.month.ar)) || "";
      const hijriDay = h.day;
      const hijriYear = h.year;
      // english month for gregorian
      const gMonthName = new Intl.DateTimeFormat('en-US',{month:'long'}).format(now);
      const final = `${dd} ${gMonthName} ${yyyy} , ${hijriDay} ${hijriMonth} ${hijriYear}H`;
      setText("dateToday", final);
      return;
    }
    // fallback if API returns unexpected
    setText("dateToday", new Date().toLocaleDateString());
  } catch(err){
    dbg("Hijri fetch failed:", err);
    setText("dateToday", new Date().toLocaleDateString());
  }
}

/* ---------------------------
   Reverse geocode coords via Nominatim (OpenStreetMap)
   Returns lowercased combined locality/state string
----------------------------*/
async function reverseGeocode(lat, lon){
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`;
    const res = await fetch(url, {headers: {'User-Agent': 'solat-display/1.0 (your-email@example.com)'}});
    if(!res.ok) throw new Error("revgeo HTTP " + res.status);
    const j = await res.json();
    const addr = j.address || {};
    // Combine common fields to increase matching chance
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

/* ---------------------------
   IP geolocation fallback (ipapi.co)
   returns "city, region, country" lowercased
----------------------------*/
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

/* ---------------------------
   Determine zoneCode from place string
   simple substring match against keywords
----------------------------*/
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

/* ---------------------------
   Get location and decide zone
   Steps:
    1) Try navigator.geolocation
    2) If success -> reverse geocode -> determine zone
    3) If fail -> ipGeolocate -> determine zone
    4) set zoneCode and display zoneName in UI
----------------------------*/
async function detectZoneAndLoad(){
  // set immediate status
  setText("zoneName", "Mengesan lokasi...");
  let placeStr = "";

  // Try browser geolocation first
  if(navigator.geolocation){
    try {
      const pos = await new Promise((resolve, reject) => {
        const id = navigator.geolocation.getCurrentPosition(resolve, reject, {timeout:8000, maximumAge:5*60*1000});
      });
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      dbg("geo coords:", lat, lon);
      placeStr = await reverseGeocode(lat, lon);
    } catch(e){
      dbg("geolocation failed:", e);
      // fallback to IP
      placeStr = await ipGeolocate();
    }
  } else {
    placeStr = await ipGeolocate();
  }

  dbg("placeStr:", placeStr);
  // Determine zone
  const foundZone = determineZoneFromPlace(placeStr);
  if(foundZone){
    // strip _alias suffix if used
    const standardized = foundZone.replace(/_alias$/,'');
    zoneCode = standardized;
    setText("zoneName", `${zoneCode.toUpperCase()} - ${capitalizePlace(placeStr)}`);
    dbg("zone determined:", zoneCode);
  } else {
    dbg("zone not found from place, falling back to default:", zoneCode);
    setText("zoneName", `${zoneCode} - ${capitalizePlace(placeStr || "Lokasi tidak dikesan")}`);
  }

  // now that zoneCode is set, request prayer times
  await loadPrayerTimesForZone(zoneCode);
}

/* small helper to prettify place name */
function capitalizePlace(s){
  if(!s) return "";
  return s.split(",")[0].split(" ").map(w => w.charAt(0).toUpperCase()+w.slice(1)).join(" ");
}

/* ---------------------------
   Fetch prayer times for a given zone (month) and populate UI
   Uses same logic as your original loadPrayerTimes but parameterized by zone
----------------------------*/
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

/* ============================
   The rest of your existing helpers
============================*/
function format(t) {
  if (!t) return "--:--";
  // t might be "05:37" or "0537" or "5:37"
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
  await detectZoneAndLoad();
})();

/* Optional debug inspector */
window.debugPrayerLib = function(){
  dbg("zoneCode:", zoneCode);
  dbg("prayerTimes:", prayerTimes);
  dbg("nextPrayerTime:", nextPrayerTime);
};
