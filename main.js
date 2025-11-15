/* ============================================================
   FULLSCREEN FIT ENGINE (NO SCROLL) — FIXED FOR MOBILE + MONITOR
============================================================ */

function scaleApp() {
    const app = document.getElementById("app");
    if (!app) return;

    const designW = 1080;     // virtual width
    const designH = 2400;     // virtual height

    const screenW = window.innerWidth;
    const screenH = window.innerHeight;

    let scale = Math.min(screenW / designW, screenH / designH);

    /* Prevent app shrinking to invisible on mobile */
    if (screenW < 600) {
        if (scale < 0.70) scale = 0.70;
    }

    app.style.width = designW + "px";
    app.style.height = designH + "px";
    app.style.transform = `scale(${scale})`;
}

window.addEventListener("load", scaleApp);
window.addEventListener("resize", scaleApp);
setInterval(scaleApp, 400);


/* ============================================================
   PORTRAIT ONLY — FIXED (NO MORE BLANK SCREEN ON MOBILE)
============================================================ */

function enforcePortrait() {
    const w = window.innerWidth;
    const h = window.innerHeight;

    // Only hide when REAL monitor landscape
    if (w > h && w > 1000) {
        document.body.style.display = "none";
    } else {
        document.body.style.display = "flex";
    }
}

window.addEventListener("resize", enforcePortrait);
window.addEventListener("orientationchange", enforcePortrait);
enforcePortrait();


/* ============================================================
   BELOW: SOLAT LOGIC (FIXED)
============================================================ */

let zoneCode = "JHR02";
let prayerTimes = {};
let nextPrayerTime = null;


function dbg(){}


/* ============================
   DATE (HIJRI + GREGORIAN)
============================ */
async function setAutoDates(){
  try {
    const now = new Date();
    const dd = String(now.getDate()).padStart(2,'0');
    const mm = String(now.getMonth()+1).padStart(2,'0');
    const yyyy = now.getFullYear();

    const res = await fetch(`https://api.aladhan.com/v1/gToH?date=${dd}-${mm}-${yyyy}`);
    const j = await res.json();

    if(j?.data?.hijri){
      const h = j.data.hijri;
      document.getElementById("dateToday").innerText =
        `${dd} ${now.toLocaleString('en', {month:'long'})} ${yyyy} , ${h.day} ${h.month.en} ${h.year}H`;
      return;
    }
  } catch(e){}

  document.getElementById("dateToday").innerText = new Date().toLocaleDateString();
}


/* ============================
   ZONE DETECTION — FIXED
============================ */
const ZONE_MAP = {
  "JHR01":["pulau aur","pulau pemanggil"],
  "JHR02":["johor bahru","kota tinggi","mersing","jb","johor bharu"],
  "JHR03":["kluang","pontian"],
  "JHR04":["batu pahat","muar","segamat","gemas"],
  "KDH01":["kota setar","kubang pasu","pokok sena"],
  "KDH02":["kuala muda","yan","pendang"],
  "KDH03":["padang terap","sik"],
  "KDH04":["baling"],
  "KDH05":["bandar baharu","kulim"],
  "KDH06":["langkawi"],
  "MLK01":["alor gajah","melaka"],
  "PLS01":["perlis","kangar"],
  "PNG01":["pulau pinang","penang","george town"],
  "PRK01":["ipoh","perak","manjung","kinta"],
  "SGR01":["selangor","shah alam","kajang","klang","petaling"],
  "KUL01":["kuala lumpur","wp kl"],
  "SBH01":["sabah","kota kinabalu"],
  "TRG01":["terengganu"],
  "KEL01":["kelantan"],
};

const zoneKeywords = [];
for(const [z,list] of Object.entries(ZONE_MAP)){
  list.forEach(k => zoneKeywords.push({zone:z, key:k.toLowerCase()}));
}


async function reverseGeocode(lat, lon){
  try{
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`
    );
    const j = await res.json();
    const a = j.address || {};
    return [
      a.city, a.town, a.village, a.state, a.country
    ].filter(Boolean).join(", ").toLowerCase();
  } catch(e){ return ""; }
}

async function ipGeolocate(){
  try{
    const res = await fetch("https://ipapi.co/json/");
    const j = await res.json();
    return [j.city, j.region, j.country_name]
      .filter(Boolean).join(", ").toLowerCase();
  } catch(e){ return ""; }
}

function determineZone(str){
  if (!str) return null;
  const clean = str.toLowerCase();
  for(const z of zoneKeywords){
    if(clean.includes(z.key)) return z.zone;
  }
  return null;
}


/* ===== FIXED ZONE DETECTION ===== */
async function detectZoneAndLoad(){
  document.getElementById("zoneName").innerText = "Mengesan lokasi...";

  let place = "";

  if(navigator.geolocation){
    try{
      const pos = await new Promise((ok,fail)=>{
         navigator.geolocation.getCurrentPosition(ok,fail,{timeout:8000});
      });
      place = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
    } catch {
      place = await ipGeolocate();
    }
  } else {
    place = await ipGeolocate();
  }

  let found = determineZone(place);

  if(!found) found = "JHR02";  // Safe fallback

  zoneCode = found;
  document.getElementById("zoneName").innerText =
      `${zoneCode.toUpperCase()} - ${place || "Lokasi tidak dikesan"}`;

  await loadPrayerTimesForZone(zoneCode);
}


/* ============================
   E-SOLAT API — FIXED DATE LOGIC
============================ */
async function loadPrayerTimesForZone(Z){

  const url=`https://www.e-solat.gov.my/index.php?r=esolatApi/takwimsolat&period=month&zone=${Z}`;
  const res = await fetch(url);
  const data = await res.json();

  const list = data.prayerTime || [];

  const today = new Date();
  const dd = String(today.getDate()).padStart(2,'0');
  const yyyy = today.getFullYear();
  const mIdx = today.getMonth();

  const monthsA = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const m1 = monthsA[mIdx];
  const m2 = m1.toUpperCase();

  const d1 = `${dd}-${m1}-${yyyy}`;
  const d2 = `${dd}-${m2}-${yyyy}`;

  let row = list.find(x => x.date === d1 || x.date === d2);

  if (!row) row = list[list.length - 1];

  const norm = t => (t||"0000").padStart(4,'0');

  prayerTimes = {
    Ismak:   norm(row.imsak),
    Subuh:   norm(row.fajr),
    Syuruk:  norm(row.syuruk),
    Zohor:   norm(row.dhuhr),
    Asar:    norm(row.asr),
    Maghrib: norm(row.maghrib),
    Isyak:   norm(row.isha)
  };

  document.getElementById("ismakTime").innerText   = fmt(prayerTimes.Ismak);
  document.getElementById("subuhTime").innerText   = fmt(prayerTimes.Subuh);
  document.getElementById("syurukTime").innerText  = fmt(prayerTimes.Syuruk);
  document.getElementById("zohorTime").innerText   = fmt(prayerTimes.Zohor);
  document.getElementById("asarTime").innerText    = fmt(prayerTimes.Asar);
  document.getElementById("maghribTime").innerText = fmt(prayerTimes.Maghrib);
  document.getElementById("isyakTime").innerText   = fmt(prayerTimes.Isyak);

  determineNextPrayer();
  updateCurrentPrayerCard();
  updateHighlight();
}


/* ============================
   FORMAT TIME
============================ */
function fmt(t){
  t = t.toString();
  if(!t.includes(":")) t = t.slice(0,2)+":"+t.slice(2);
  let [h,m] = t.split(":").map(Number);
  const ampm = h>=12 ? "PM" : "AM";
  const h12 = (h%12) || 12;
  return `${h12}:${String(m).padStart(2,'0')} ${ampm}`;
}


/* ============================
   DETERMINE NEXT PRAYER
============================ */
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

  // After isyak → tomorrow subuh
  const t = new Date();
  t.setDate(t.getDate() + 1);
  const [h,m] = prayerTimes.Subuh.split(":").map(Number);
  t.setHours(h,m,0,0);
  nextPrayerTime = t;
  document.getElementById("nextPrayerNameLarge").innerText = "Subuh";
}


/* ============================
   COUNTDOWN
============================ */
setInterval(()=>{
  if(!nextPrayerTime) return;

  const now = new Date();
  let diff = nextPrayerTime - now;

  if(diff <= 0){
    determineNextPrayer();
    return;
  }

  const h = Math.floor(diff/(1000*60*60));
  const m = Math.floor((diff/1000/60)%60);
  const s = Math.floor((diff/1000)%60);

  document.getElementById("cdHour").innerText = String(h).padStart(2,'0');
  document.getElementById("cdMin").innerText  = String(m).padStart(2,'0');
  document.getElementById("cdSec").innerText  = String(s).padStart(2,'0');
},1000);


/* ============================
   CLOCK + ACTIVE PRAYER
============================ */
function updateClock(){
  const now = new Date();

  let h = now.getHours();
  let m = String(now.getMinutes()).padStart(2,'0');
  let s = String(now.getSeconds()).padStart(2,'0');
  const ampm = h>=12 ? "PM" : "AM";
  const h12 = (h%12)||12;

  document.getElementById("currentTime").innerText =
    `${h12}:${m}:${s} ${ampm}`;

  updateHighlight();
  updateCurrentPrayerCard();
}
setInterval(updateClock,1000);
updateClock();


/* ============================
   HIGHLIGHT CURRENT
============================ */
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
    .forEach(el=>el.classList.remove("currentPrayer"));

  const card = document.getElementById("card" + active);
  if(card) card.classList.add("currentPrayer");
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
  document.getElementById("currentPrayerTime").innerText = fmt(prayerTimes[active]);
}


/* ============================
   INIT
============================ */
(async function init(){
  await setAutoDates();
  await detectZoneAndLoad();
})();
