/* main.js — AUTO MODE ONLY (FIXED VERSION)
   - Auto scaling corrected (Android-safe)
   - Orientation detection improved
   - Centered layout & proportional rendering
*/

let zoneCode = "JHR02";
let prayerTimes = {};
let nextPrayerTime = null;

function dbg(...args){ console.debug("⭑ solat:", ...args); }

/* ============================================================
   AUTO MODE — FIXED ORIENTATION + RATIO SCALING
============================================================ */

let currentTarget = { w: 1920, h: 1080 }; // fallback default

function autoDetectMode() {
    const winW = window.innerWidth;
    const winH = window.innerHeight;

    const scrW = screen.width;
    const scrH = screen.height;

    // FIX: More reliable orientation detection
    const isPortrait = (winH > winW) || (scrH > scrW);

    const isMobile =
        /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
        scrW < 1280;

    // -------------------------------
    // MOBILE DEVICES
    // -------------------------------
    if (isMobile) {
        if (isPortrait) {
            currentTarget = { w: 1224, h: 2700 };  // Mobile Portrait FIXED
        } else {
            currentTarget = { w: 2700, h: 1224 };  // Mobile Landscape FIXED
        }
        scaleToFit();
        return;
    }

    // -------------------------------
    // TV (large screen, low density)
    // -------------------------------
    const isTV = scrW >= 1920 && window.devicePixelRatio <= 1.25;

    if (isTV) {
        if (isPortrait) {
            currentTarget = { w: 1080, h: 1920 };  // TV Portrait FIXED
        } else {
            currentTarget = { w: 1920, h: 1080 };  // TV Landscape FIXED
        }
        scaleToFit();
        return;
    }

    // -------------------------------
    // CUSTOM LED SCREEN
    // -------------------------------
    currentTarget = { w: scrW, h: scrH };
    scaleToFit();
}

/* ============================================================
   FIXED SCALE FUNCTION — PERFECT FIT + CENTERED
============================================================ */
function scaleToFit() {
    const host = document.getElementById("viewportHost");
    const app  = document.getElementById("app");
    if(!app) return;

    const targetW = currentTarget.w;
    const targetH = currentTarget.h;

    app.style.width  = targetW + "px";
    app.style.height = targetH + "px";

    // FIX: perfect Android-safe scaling
    const scaleX = window.innerWidth  / targetW;
    const scaleY = window.innerHeight / targetH;
    const scale  = Math.min(scaleX, scaleY);

    app.style.transform = `scale(${scale})`;
    app.style.transformOrigin = "top left";

    // Perfect center alignment
    host.style.alignItems = "center";
    host.style.justifyContent = "center";
    host.style.display = "flex";
    host.style.overflow = "hidden";
}

/* Detect changes */
window.addEventListener("resize", autoDetectMode);

/* ============================================================
   ORIGINAL SOLAT LOGIC STARTS HERE (UNMODIFIED)
============================================================ */

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

async function reverseGeocode(lat, lon){
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`;
    const res = await fetch(url, {headers: {'User-Agent': 'solat-display/1.0'}});
    if(!res.ok) throw new Error("revgeo HTTP " + res.status);
    const j = await res.json();
    const addr = j.address || {};
    const parts = [
      addr.city, addr.town, addr.village,
      addr.county, addr.state, addr.region,
      addr.state_district, addr.country
    ].filter(Boolean).map(s => String(s).toLowerCase());
    return parts.join(", ");
  } catch(e){
    return "";
  }
}

async function ipGeolocate(){
  try {
    const res = await fetch("https://ipapi.co/json/");
    if(!res.ok) throw new Error("ipapi HTTP " + res.status);
    const j = await res.json();
    const parts = [j.city, j.region, j.country_name]
      .filter(Boolean).map(s => String(s).toLowerCase());
    return parts.join(", ");
  } catch(e){
    return "";
  }
}

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

function capitalizePlace(s){
  if(!s) return "";
  return s.split(",")[0]
          .split(" ")
          .map(w => w.charAt(0).toUpperCase()+w.slice(1))
          .join(" ");
}

async function detectZoneAndLoad(){
  setText("zoneName", "Mengesan lokasi...");
  let placeStr = "";

  if(navigator.geolocation){
    try {
      const pos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject,
          {timeout:8000, maximumAge:5*60*1000});
      });
      placeStr = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
    } catch(e){
      placeStr = await ipGeolocate();
    }
  } else {
    placeStr = await ipGeolocate();
  }

  const foundZone = determineZoneFromPlace(placeStr);
  if(foundZone){
    zoneCode = foundZone.replace(/_alias$/,'');
    setText("zoneName", `${zoneCode} - ${capitalizePlace(placeStr)}`);
  } else {
    setText("zoneName", `${zoneCode} - ${capitalizePlace(placeStr || "Lokasi tidak dikesan")}`);
  }

  await loadPrayerTimesForZone(zoneCode);
}

async function loadPrayerTimesForZone(Z){
  try {
    const url = `https://www.e-solat.gov.my/index.php?r=esolatApi/takwimsolat&period=month&zone=${encodeURIComponent(Z)}`;
    const res = await fetch(url, {cache:"no-store"});
    if(!res.ok) throw new Error("HTTP " + res.status);

    const data = await res.json();
    const list = Array.isArray(data.prayerTime) ? data.prayerTime : [];

    const today = new Date();
    const dd = String(today.getDate()).padStart(2,'0');
    const yyyy = today.getFullYear();
    const mlist = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const mlist2 = mlist.map(m=>m.toUpperCase());
    const key1 = `${dd}-${mlist[today.getMonth()]}-${yyyy}`;
    const key2 = `${dd}-${mlist2[today.getMonth()]}-${yyyy}`;

    let todayEntry = list.find(p => p.date === key1 || p.date === key2);
    if(!todayEntry) todayEntry = list[list.length-1];

    const norm = t => (t||"").toString().trim().padStart(4,"0");

    prayerTimes = {
      Ismak: norm(todayEntry.imsak),
      Subuh: norm(todayEntry.fajr),
      Syuruk: norm(todayEntry.syuruk),
      Zohor: norm(todayEntry.dhuhr),
      Asar: norm(todayEntry.asr),
      Maghrib: norm(todayEntry.maghrib),
      Isyak: norm(todayEntry.isha),
    };

    const safe = (id,val) => setText(id, val ? format(val) : "--:--");

    safe("ismakTime", prayerTimes.Ismak);
    safe("subuhTime", prayerTimes.Subuh);
    safe("syurukTime", prayerTimes.Syuruk);
    safe("zohorTime", prayerTimes.Zohor);
    safe("asarTime", prayerTimes.Asar);
    safe("maghribTime", prayerTimes.Maghrib);
    safe("isyakTime", prayerTimes.Isyak);

    determineNextPrayer();
    updateHighlight();
    updateCurrentPrayerCard();

  } catch(err){
    setText("zoneName", `Gagal muat masa solat (${zoneCode})`);
  }
}

function format(t) {
  if (!t) return "--:--";
  if(typeof t === 'string' && !t.includes(':') && t.length === 4){
    t = t.slice(0,2) + ":" + t.slice(2);
  }
  let [h, m] = (""+t).split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = (h % 12) || 12;
  return `${h12}:${String(m).padStart(2,"0")} ${ampm}`;
}

function determineNextPrayer() {
  if (!Object.keys(prayerTimes).length) return;
  const now = new Date();

  for (let [name,time] of Object.entries(prayerTimes)) {
    const [h,m] = time.split(":").map(Number);
    const t = new Date();
    t.setHours(h||0,m||0,0,0);
    if(t > now){
      nextPrayerTime = t;
      setText("nextPrayerNameLarge", name);
      return;
    }
  }

  let tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate()+1);
  const [h,m] = prayerTimes.Subuh.split(":").map(Number);
  tomorrow.setHours(h,m,0,0);
  nextPrayerTime = tomorrow;
  setText("nextPrayerNameLarge", "Subuh");
}

setInterval(() => {
  if (!nextPrayerTime) return;
  const now = new Date();
  let diff = nextPrayerTime - now;
  if(diff <= 0){ determineNextPrayer(); return; }
  const h = Math.floor(diff/(1000*60*60));
  const m = Math.floor((diff/1000/60)%60);
  const s = Math.floor((diff/1000)%60);

  setText("cdHour", String(h).padStart(2,"0"));
  setText("cdMin",  String(m).padStart(2,"0"));
  setText("cdSec",  String(s).padStart(2,"0"));

}, 1000);

function updateClock(){
  const now = new Date();
  let h = now.getHours();
  let m = now.getMinutes().toString().padStart(2,'0');
  let s = now.getSeconds().toString().padStart(2,'0');
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = (h%12) || 12;
  setText("currentTime", `${h12}:${m}:${s} ${ampm}`);

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
    const [h,m] = time.split(":").map(Number);
    const t = new Date();
    t.setHours(h,m,0,0);
    if(t <= now) active = name;
  }
  setText("currentPrayerName", active);
  setText("currentPrayerTime", format(prayerTimes[active]));
}

function updateHighlight(){
  if(!Object.keys(prayerTimes).length) return;
  const now = new Date();
  let active = "Isyak";

  for(let [name,time] of Object.entries(prayerTimes)){
    const [h,m] = time.split(":").map(Number);
    const t = new Date();
    t.setHours(h,m,0,0);
    if(t <= now) active = name;
  }

  document.querySelectorAll(".prayer-row")
    .forEach(c => c.classList.remove("currentPrayer"));

  const activeCard = document.getElementById("card" + active);
  if(activeCard) activeCard.classList.add("currentPrayer");
}

/* Init */
(async function init(){
  await setAutoDates();
  autoDetectMode();     
  await detectZoneAndLoad();
  scaleToFit();         
})();
