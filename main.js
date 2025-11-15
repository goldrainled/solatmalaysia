/* ============================================================
   main.js — PORTRAIT-ONLY VERSION (NO AUTO SCALE)
   - Removes scaleToFit()
   - Removes autoDetectMode()
   - Removes landscape logic
   - Keeps ALL solat logic intact
============================================================ */

let zoneCode = "JHR02";
let prayerTimes = {};
let nextPrayerTime = null;

function dbg(...args){
  const ENABLE_DBG = false;
  if(ENABLE_DBG) console.log("DBG:", ...args);
}

/* ============================================================
   FORCE PORTRAIT MODE (HIDE SCREEN IN LANDSCAPE)
============================================================ */
function enforcePortrait() {
    if (window.innerWidth > window.innerHeight) {
        document.body.style.display = "none";
    } else {
        document.body.style.display = "flex";
    }
}
window.addEventListener("orientationchange", () => setTimeout(enforcePortrait, 300));
window.addEventListener("resize", enforcePortrait);
enforcePortrait();

/* ============================================================
   DATE HANDLING (Hijri + Gregorian)
============================================================ */
async function setAutoDates(){
  try {
    const now = new Date();
    const dd = String(now.getDate()).padStart(2,'0');
    const mm = String(now.getMonth()+1).padStart(2,'0');
    const yyyy = now.getFullYear();
    const dateStr = `${dd}-${mm}-${yyyy}`;

    const res = await fetch(`https://api.aladhan.com/v1/gToH?date=${dateStr}`);
    const j = await res.json();

    if(j?.data?.hijri){
      const h = j.data.hijri;
      const hijriMonth = h.month?.en || "";
      const gMonthName = new Intl.DateTimeFormat('en-US',{month:'long'}).format(now);

      const final = `${dd} ${gMonthName} ${yyyy} , ${h.day} ${hijriMonth} ${h.year}H`;
      document.getElementById("dateToday").innerText = final;
      return;
    }
  } catch(e){}

  document.getElementById("dateToday").innerText = new Date().toLocaleDateString();
}

/* ============================================================
   GEOLOCATION → ZONE DETECTION
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
  "PHG01": ["pahang","kuantan","cameron","pahang"],
  "PHG02": ["temerloh","lipis","raub"],
  "PRK01": ["ipoh","perak","kinta","manjung","taiping","kerian"],
  "SGR01": ["selangor","shah alam","kajang","klang","petaling","gombak","kuala langat","kuala selangor","hulu selangor"],
  "KUL01": ["kuala lumpur","wp kuala lumpur","wp kl"],
  "SBH01": ["sabah","kota kinabalu","sandakan","tawau"],
  "SRW01": ["sri aman","sarawak","kuching","sibu","miri"],
  "TRG01": ["kuala terengganu","terengganu"],
  "KEL01": ["kelantan"],
  "SBH02": ["labuan"],
};

const zoneKeywords = [];
for(const [z,list] of Object.entries(ZONE_MAP)){
  list.forEach(k => zoneKeywords.push({zone: z, key: k.toLowerCase()}));
}

async function reverseGeocode(lat, lon){
  try{
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`;
    const res = await fetch(url);
    const j = await res.json();
    const a = j.address || {};

    return [
      a.city, a.town, a.village, a.county, a.state, a.region, a.country
    ].filter(Boolean).join(", ").toLowerCase();
  } catch {
    return "";
  }
}

async function ipGeolocate(){
  try{
    const res = await fetch("https://ipapi.co/json/");
    const j = await res.json();
    return [j.city, j.region, j.country_name]
      .filter(Boolean).join(", ").toLowerCase();
  } catch {
    return "";
  }
}

function determineZone(place){
  const clean = place.replace(/[^\w\s]/g," ").toLowerCase();
  for(const row of zoneKeywords){
    if(clean.includes(row.key)) return row.zone;
  }
  return null;
}

function capitalizePlace(s){
  return s.split(",")[0]
          .split(" ")
          .map(w => w.charAt(0).toUpperCase()+w.slice(1))
          .join(" ");
}

async function detectZoneAndLoad(){
  document.getElementById("zoneName").innerText = "Mengesan lokasi...";
  let place = "";

  if(navigator.geolocation){
    try{
      const pos = await new Promise((ok,fail)=>{
        navigator.geolocation.getCurrentPosition(ok,fail,{
          timeout:8000,
          maximumAge:5*60*1000
        });
      });
      place = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
    } catch {
      place = await ipGeolocate();
    }
  } else {
    place = await ipGeolocate();
  }

  const found = determineZone(place);
  if(found){
    zoneCode = found;
    document.getElementById("zoneName").innerText =
      `${zoneCode} - ${capitalizePlace(place)}`;
  } else {
    document.getElementById("zoneName").innerText =
      `${zoneCode} - ${capitalizePlace(place || "Lokasi tidak dikesan")}`;
  }

  await loadPrayerTimesForZone(zoneCode);
}

/* ============================================================
   FETCH PRAYER TIMES
============================================================ */
async function loadPrayerTimesForZone(Z){
  try{
    const url =
      `https://www.e-solat.gov.my/index.php?r=esolatApi/takwimsolat&period=month&zone=${Z}`;
    const res = await fetch(url, {cache:"no-store"});
    const data = await res.json();

    const list = data.prayerTime || [];
    const today = new Date();
    const d = String(today.getDate()).padStart(2,'0');
    const y = today.getFullYear();
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const d1 = `${d}-${months[today.getMonth()]}-${y}`;
    const d2 = `${d}-${months[today.getMonth()].toUpperCase()}-${y}`;

    let row = list.find(x => x.date===d1 || x.date===d2) || list[list.length-1];

    const norm = t => t.toString().trim().padStart(4,'0');
    prayerTimes = {
      Ismak:  norm(row.imsak),
      Subuh:  norm(row.fajr),
      Syuruk: norm(row.syuruk),
      Zohor:  norm(row.dhuhr),
      Asar:   norm(row.asr),
      Maghrib:norm(row.maghrib),
      Isyak:  norm(row.isha)
    };

    updatePrayerUI();
    determineNextPrayer();
    updateHighlight();
    updateCurrentPrayerCard();

  } catch(e){
    document.getElementById("zoneName").innerText = `Gagal muat ${Z}`;
  }
}

function updatePrayerUI(){
  const f = id => document.getElementById(id);
  const fmt = t => formatTime(t);
  f("ismakTime").innerText   = fmt(prayerTimes.Ismak);
  f("subuhTime").innerText   = fmt(prayerTimes.Subuh);
  f("syurukTime").innerText  = fmt(prayerTimes.Syuruk);
  f("zohorTime").innerText   = fmt(prayerTimes.Zohor);
  f("asarTime").innerText    = fmt(prayerTimes.Asar);
  f("maghribTime").innerText = fmt(prayerTimes.Maghrib);
  f("isyakTime").innerText   = fmt(prayerTimes.Isyak);
}

/* ============================================================
   FORMAT TIME
============================================================ */
function formatTime(t){
  if(!t) return "--:--";
  t = t.toString();
  if(!t.includes(":")) t = t.slice(0,2)+":"+t.slice(2);
  let [h,m] = t.split(":").map(Number);
  const ampm = h>=12 ? "PM" : "AM";
  const h12 = (h%12) || 12;
  return `${h12}:${String(m).padStart(2,'0')} ${ampm}`;
}

/* ============================================================
   DETERMINE NEXT PRAYER
============================================================ */
function determineNextPrayer(){
  const now = new Date();
  for(const [name,time] of Object.entries(prayerTimes)){
    const [h,m] = time.split(":").map(Number);
    const t = new Date();
    t.setHours(h,m,0,0);
    if(t > now){
      nextPrayerTime = t;
      document.getElementById("nextPrayerNameLarge").innerText = name;
      return;
    }
  }

  let t = new Date();
  t.setDate(t.getDate()+1);
  const [h,m] = prayerTimes.Subuh.split(":").map(Number);
  t.setHours(h,m,0,0);
  nextPrayerTime = t;
  document.getElementById("nextPrayerNameLarge").innerText = "Subuh";
}

/* ============================================================
   COUNTDOWN
============================================================ */
setInterval(()=>{
  if(!nextPrayerTime) return;
  const now = new Date();
  let diff = nextPrayerTime - now;

  if(diff <= 0){ determineNextPrayer(); return; }

  const h = Math.floor(diff/(1000*60*60));
  const m = Math.floor((diff/1000/60)%60);
  const s = Math.floor((diff/1000)%60);

  document.getElementById("cdHour").innerText = String(h).padStart(2,'0');
  document.getElementById("cdMin").innerText  = String(m).padStart(2,'0');
  document.getElementById("cdSec").innerText  = String(s).padStart(2,'0');
}, 1000);

/* ============================================================
   CLOCK
============================================================ */
function updateClock(){
  const now = new Date();
  let h = now.getHours();
  let m = String(now.getMinutes()).padStart(2,'0');
  let s = String(now.getSeconds()).padStart(2,'0');
  const ampm = h>=12 ? "PM" : "AM";
  const h12 = (h%12) || 12;

  document.getElementById("currentTime").innerText =
    `${h12}:${m}:${s} ${ampm}`;

  updateHighlight();
  updateCurrentPrayerCard();
}
setInterval(updateClock, 1000);
updateClock();

/* ============================================================
   HIGHLIGHT CURRENT PRAYER
============================================================ */
function updateHighlight(){
  const now = new Date();
  let active = "Isyak";

  for(const [name,time] of Object.entries(prayerTimes)){
    const [h,m] = time.split(":").map(Number);
    const t = new Date();
    t.setHours(h,m,0,0);
    if(t <= now) active = name;
  }

  document.querySelectorAll(".prayer-row")
    .forEach(el => el.classList.remove("currentPrayer"));

  const el = document.getElementById("card"+active);
  if(el) el.classList.add("currentPrayer");
}

function updateCurrentPrayerCard(){
  const now = new Date();
  let active = "Isyak";

  for(const [name,time] of Object.entries(prayerTimes)){
    const [h,m] = time.split(":").map(Number);
    const t = new Date();
    t.setHours(h,m,0,0);
    if(t <= now) active = name;
  }

  document.getElementById("currentPrayerName").innerText = active;
  document.getElementById("currentPrayerTime").innerText =
    formatTime(prayerTimes[active]);
}

/* ============================================================
   INIT
============================================================ */
(async function init(){
  await setAutoDates();
  await detectZoneAndLoad();
})();
