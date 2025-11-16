/* ============================================================
   main.js — Option A (NO SCALING)
   - 100% mobile-friendly
   - UI always fits screen naturally
   - No transform(), no virtual screen, no cut-offs
============================================================ */

/* Dummy functions (scaling removed) */
function autoDetectMode() {
    /* no-op */
}
function scaleToFit() {
    const app = document.getElementById("app");
    if (!app) return;
    app.style.transform = "none";
    app.style.width = "100%";
    app.style.height = "auto";
}

/* -------------------------
   ORIGINAL USER LOGIC BELOW
--------------------------*/

let zoneCode = "JHR02";
let prayerTimes = {};
let nextPrayerTime = null;

function dbg(...args) {
  const ENABLE_DBG = false;
  if (ENABLE_DBG) console.debug("⭑ solat:", ...args);
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

    if (j && j.data && j.data.hijri) {
      const h = j.data.hijri;

      // Gregorian
      const gMonthName = new Intl.DateTimeFormat('en-US',{month:'long'}).format(now);
      const gregorianString = `${dd} ${gMonthName} ${yyyy}`;
      setText("dateTodayG", gregorianString);

      // Hijri
      const hijriMonth = (h.month && (h.month.en || h.month.ar)) || "";
      const hijriDay   = h.day;
      const hijriYear  = h.year;
      const hijriString = `${hijriDay} ${hijriMonth} ${hijriYear}H`;
      setText("dateTodayH", hijriString);

      return;
    }

    // fallback
    setText("dateTodayG", now.toLocaleDateString());
    setText("dateTodayH", "");
  } catch (err) {
    const fallback = new Date().toLocaleDateString();
    setText("dateTodayG", fallback);
    setText("dateTodayH", "");
  }
}

/* Reverse geocode */
async function reverseGeocode(lat, lon){
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`;
    const res = await fetch(url, {headers: {'User-Agent': 'solat-display/1.0'}});
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
    const j = await res.json();
    const parts = [j.city, j.region, j.country_name].filter(Boolean).map(s => s.toLowerCase());
    return parts.join(", ");
  } catch(e){
    return "";
  }
}

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
  "PHG01": ["pahang","kuantan","cameron"],
  "PHG02": ["temerloh","lipis","raub"],
  "PRK01": ["ipoh","perak","kinta","manjung","taiping","kerian"],
  "SGR01": ["selangor","shah alam","kajang","klang","petaling","gombak","kuala langat","kuala selangor","hulu selangor"],
  "KUL01": ["kuala lumpur","wp kuala lumpur","wp kl"],
  "SBH01": ["sabah","kota kinabalu","sandakan","tawau"],
  "SRW01": ["sri aman","sarawak","kuching","sibu","miri"],
  "TRG01": ["kuala terengganu"],
  "KEL01": ["kelantan"],
  "JHR02_alias": ["johor", "johor bahru", "jb"],
  "SBH02": ["labuan"],
};

const zoneKeywords = [];
for(const [zone,arr] of Object.entries(ZONE_MAP)){
  if(!Array.isArray(arr)) continue;
  arr.forEach(k => zoneKeywords.push({zone, key: k.toLowerCase()}));
}

function determineZoneFromPlace(placeStr){
  if(!placeStr) return null;
  const norm = placeStr.toLowerCase().replace(/[^\w\s]/g,' ');
  for(const z of zoneKeywords){
    if(z.zone.endsWith("_alias")) continue;
    if(norm.includes(z.key)) return z.zone;
  }
  for(const z of zoneKeywords){
    if(norm.includes(z.key)) return z.zone;
  }
  return null;
}

/* ============================================================
   DETECT ZONE + FORMAT LOCATION (TITLE CASE)
============================================================ */
async function detectZoneAndLoad(){
  setText("zoneName", "Mengesan lokasi...");
  let placeStr = "";

  if (navigator.geolocation){
    try {
      const pos = await new Promise((resolve, reject) =>{
        navigator.geolocation.getCurrentPosition(resolve, reject, {timeout:8000});
      });
      placeStr = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
    } catch(e){
      placeStr = await ipGeolocate();
    }
  } else {
    placeStr = await ipGeolocate();
  }

  const foundZone = determineZoneFromPlace(placeStr);
  const placeCap = capitalizePlace(placeStr);

  if(foundZone){
    zoneCode = foundZone.replace(/_alias$/,'');
    setText("zoneName", `${zoneCode.toUpperCase()} - ${placeCap}`);
  } else {
    setText("zoneName", `${zoneCode} - ${placeCap || "Lokasi tidak dikesan"}`);
  }

  await loadPrayerTimesForZone(zoneCode);
}

/* Load prayer times for zone */
async function loadPrayerTimesForZone(Z){
  try {
    const url = `https://www.e-solat.gov.my/index.php?r=esolatApi/takwimsolat&period=month&zone=${encodeURIComponent(Z)}`;
    const res = await fetch(url,{cache:"no-store"});
    const data = await res.json();

    const list = Array.isArray(data.prayerTime) ? data.prayerTime : [];
    const today = new Date();
    const dd = String(today.getDate()).padStart(2,'0');
    const yyyy = today.getFullYear();
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const es1 = `${dd}-${months[today.getMonth()]}-${yyyy}`;
    const es2 = `${dd}-${months[today.getMonth()].toUpperCase()}-${yyyy}`;

    let todayEntry = list.find(x => x.date===es1 || x.date===es2) || list[list.length-1];

    prayerTimes = {
      Ismak: (todayEntry.imsak||"").padStart(4,"0"),
      Subuh: (todayEntry.fajr||"").padStart(4,"0"),
      Syuruk: (todayEntry.syuruk||"").padStart(4,"0"),
      Zohor: (todayEntry.dhuhr||"").padStart(4,"0"),
      Asar: (todayEntry.asr||"").padStart(4,"0"),
      Maghrib: (todayEntry.maghrib||"").padStart(4,"0"),
      Isyak: (todayEntry.isha||"").padStart(4,"0")
    };

    // Update UI
    const set = (id,v)=>{ const el=document.getElementById(id); if(el) el.innerText = format(v); };
    set("ismakTime", prayerTimes.Ismak);
    set("subuhTime", prayerTimes.Subuh);
    set("syurukTime", prayerTimes.Syuruk);
    set("zohorTime", prayerTimes.Zohor);
    set("asarTime", prayerTimes.Asar);
    set("maghribTime", prayerTimes.Maghrib);
    set("isyakTime", prayerTimes.Isyak);

    determineNextPrayer();
    updateHighlight();
    updateCurrentPrayerCard();

  } catch(e){
    setText("zoneName", `Gagal muat masa solat (${zoneCode})`);
  }
}

function format(t) {
  t = t.toString();
  if(t.length===4) t = t.slice(0,2)+":"+t.slice(2);
  let [h,m] = t.split(":").map(Number);
  const ampm = h>=12 ? "PM" : "AM";
  const h12 = (h%12)||12;
  return `${h12}:${String(m).padStart(2,"0")} ${ampm}`;
}

function determineNextPrayer(){
  const now = new Date();
  for(let [name,time] of Object.entries(prayerTimes)){
    const [h,m] = time.split(":").map(Number);
    const t = new Date(); t.setHours(h,m,0,0);
    if(t > now){
      nextPrayerTime = t;
      const el = document.getElementById("nextPrayerNameLarge");
      if(el) el.innerText = name;
      return;
    }
  }
  let t = new Date();
  t.setDate(t.getDate()+1);
  const [h,m] = prayerTimes.Subuh.split(":").map(Number);
  t.setHours(h,m,0,0);
  nextPrayerTime = t;
}

setInterval(()=>{
  if(!nextPrayerTime) return;
  const diff = nextPrayerTime - new Date();
  if(diff <= 0){ determineNextPrayer(); return; }
  const h = Math.floor(diff/3600000);
  const m = Math.floor((diff/60000)%60);
  const s = Math.floor((diff/1000)%60);
  const set = (id,v)=>{ const el=document.getElementById(id); if(el) el.innerText=String(v).padStart(2,"0"); };
  set("cdHour",h); set("cdMin",m); set("cdSec",s);
},1000);

function updateClock(){
  const now = new Date();
  let h = now.getHours();
  let m = String(now.getMinutes()).padStart(2,"0");
  let s = String(now.getSeconds()).padStart(2,"0");
  const ampm = h>=12?"PM":"AM";
  const h12 = (h%12)||12;
  const el = document.getElementById("currentTime");
  if(el) el.innerText = `${h12}:${m}:${s} ${ampm}`;
  updateHighlight();
  updateCurrentPrayerCard();
}
setInterval(updateClock,1000);

function updateCurrentPrayerCard(){
  const now = new Date();
  let active = "Isyak";
  for(let [name,time] of Object.entries(prayerTimes)){
    const [h,m] = time.split(":").map(Number);
    const t = new Date(); t.setHours(h,m,0,0);
    if(t <= now) active = name;
  }
  setText("currentPrayerName", active);
  setText("currentPrayerTime", format(prayerTimes[active]));
}

function updateHighlight(){
  const now = new Date();
  let active="Isyak";
  for(let [name,time] of Object.entries(prayerTimes)){
    const [h,m] = time.split(":").map(Number);
    const t = new Date(); t.setHours(h,m,0,0);
    if(t <= now) active = name;
  }
  document.querySelectorAll(".prayer-row").forEach(e=>e.classList.remove("currentPrayer"));
  const el = document.getElementById("card"+active);
  if(el) el.classList.add("currentPrayer");
}

/* Start */
(async function init(){
  await setAutoDates();
  scaleToFit();
  await detectZoneAndLoad();
})();
