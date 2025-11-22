/* ============================================================
   main.js — FINAL VERSION (IP GEO ONLY — 100% KIOSK SAFE)
============================================================ */

/* ----- NO SCALING (Option A) ----- */
function autoDetectMode() {}
function scaleToFit() {
  const app = document.getElementById("app");
  if (!app) return;
  app.style.transform = "none";
  app.style.width = "100%";
  app.style.height = "auto";
}

/* Globals */
let zoneCode = "JHR02";
let prayerTimes = {};
let nextPrayerTime = null;

/* Helper */
function setText(id, txt){
  const el = document.getElementById(id);
  if (el) el.innerText = txt;
}

/* ============================================================
   DATE HANDLING
============================================================ */
async function setAutoDates(){
  try{
    const now = new Date();
    const d = String(now.getDate()).padStart(2,'0');
    const m = String(now.getMonth()+1).padStart(2,'0');
    const y = now.getFullYear();
    const dateStr = `${d}-${m}-${y}`;

    const r = await fetch(`https://api.aladhan.com/v1/gToH?date=${dateStr}`);
    const j = await r.json();

    if(j?.data?.hijri){
      const h = j.data.hijri;
      const gMonth = new Intl.DateTimeFormat("en-US",{month:"long"}).format(now);

      setText("dateTodayG", `${d} ${gMonth} ${y}`);
      setText("dateTodayH", `${h.day} ${h.month.en} ${h.year}H`);
      return;
    }
  }catch{}

  setText("dateTodayG", new Date().toLocaleDateString());
  setText("dateTodayH", "");
}

/* ============================================================
   IP-BASED GEOLOCATION ONLY (NO GPS)
============================================================ */
async function ipGeolocate(){
  try {
    const res = await fetch("https://ipapi.co/json/");
    if (!res.ok) return "";
    const j = await res.json();
    return [
      j.city,
      j.region,
      j.country_name
    ].filter(Boolean).join(", ").toLowerCase();
  } catch {
    return "";
  }
}

function capitalizePlace(s){
  if (!s) return "";
  return s.split(",").map(x =>
    x.trim().split(" ").map(w =>
      w ? w[0].toUpperCase()+w.slice(1) : ""
    ).join(" ")
  ).join(", ");
}

function shortenCountry(str){
  if (!str) return str;
  return str.replace(/malaysia/gi,"MY");
}

/* ============================================================
   ZONE DETECTOR
============================================================ */
const ZONE_MAP = {
  "JHR01":["pulau aur","pulau pemanggil"],
  "JHR02":["johor bahru","kota tinggi","mersing","jhr02","jb","johor bharu"],
  "JHR03":["kluang","pontian"],
  "JHR04":["batu pahat","muar","segamat","gemas"],
  "KDH01":["kota setar","kubang pasu","pokok sena"],
  "KDH02":["kuala muda","yan","pendang"],
  "KDH03":["padang terap","sik"],
  "KDH04":["baling"],
  "KDH05":["bandar baharu","kulim"],
  "KDH06":["langkawi"],
  "KTN01":["bachok","kota bharu","machang","pasir mas","pasir puteh","tanah merah","tumpat","kuala krai"],
  "MLK01":["alor gajah","melaka"],
  "PLS01":["perlis","kangar"],
  "PNG01":["pulau pinang","george town","penang","seberang perai"],
  "PHG01":["pahang","kuantan","cameron"],
  "PHG02":["temerloh","lipis","raub"],
  "PRK01":["ipoh","perak","kinta","manjung","taiping","kerian"],
  "SGR01":["selangor","shah alam","kajang","klang","petaling","gombak","kuala langat","kuala selangor","hulu selangor"],
  "KUL01":["kuala lumpur","wp kuala lumpur","wp kl"],
  "SBH01":["sabah","kota kinabalu","sandakan","tawau"],
  "SRW01":["sarawak","kuching","sibu","miri"],
  "TRG01":["kuala terengganu"],
  "KEL01":["kelantan"],
  "SBH02":["labuan"],
};

function determineZoneFromPlace(str){
  str = str.toLowerCase();
  for (const zone in ZONE_MAP){
    for (const key of ZONE_MAP[zone]){
      if (str.includes(key)) return zone;
    }
  }
  return null;
}

/* ============================================================
   DETECT ZONE — FIXED & STABLE
============================================================ */
async function detectZoneAndLoad(){
  setText("zoneName", "Mengesan lokasi...");

  let place = await ipGeolocate();

  // If total fail → default JHR02
  if (!place) {
    place = "johor bahru, MY";
  }

  place = shortenCountry(place);
  const cap = capitalizePlace(place);

  const zone = determineZoneFromPlace(place);
  if (zone){
    zoneCode = zone;
    setText("zoneName", `${zone.toUpperCase()} - ${cap}`);
  } else {
    setText("zoneName", `${zoneCode} - ${cap}`);
  }

  await loadPrayerTimesForZone(zoneCode);
}

/* ============================================================
   LOAD PRAYER TIMES
============================================================ */
function fixTime(t){
  if(!t) return null;
  let s = t.toString().trim();
  if (s.includes(":")) {
    let [h,m] = s.split(":");
    return h.padStart(2,"0")+":"+m.padStart(2,"0");
  }
  s = s.replace(/\D/g,"").padStart(4,"0");
  return s.slice(0,2)+":"+s.slice(2);
}

async function loadPrayerTimesForZone(Z){
  try{
    const url = `https://www.e-solat.gov.my/index.php?r=esolatApi/takwimsolat&period=month&zone=${Z}`;
    const res = await fetch(url);
    const data = await res.json();

    const list = data.prayerTime || [];
    const now = new Date();
    const d = String(now.getDate()).padStart(2,'0');
    const year = now.getFullYear();
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const k1 = `${d}-${months[now.getMonth()]}-${year}`;
    const k2 = `${d}-${months[now.getMonth()].toUpperCase()}-${year}`;

    let today = list.find(p => p.date===k1 || p.date===k2) || list[list.length-1];

    prayerTimes = {
      Imsak: fixTime(today.imsak),
      Subuh: fixTime(today.fajr),
      Syuruk: fixTime(today.syuruk),
      Zohor: fixTime(today.dhuhr),
      Asar: fixTime(today.asr),
      Maghrib: fixTime(today.maghrib),
      Isyak: fixTime(today.isha),
    };

    const ui = (id,val)=>{
      const el = document.getElementById(id);
      if(el) el.innerText = val ? format(val) : "--:--";
    };

    ui("imsakTime", prayerTimes.Imsak);
    ui("subuhTime", prayerTimes.Subuh);
    ui("syurukTime", prayerTimes.Syuruk);
    ui("zohorTime", prayerTimes.Zohor);
    ui("asarTime", prayerTimes.Asar);
    ui("maghribTime", prayerTimes.Maghrib);
    ui("isyakTime", prayerTimes.Isyak);

    determineNextPrayer();
    updateHighlight();
    updateCurrentPrayerCard();

  }catch(e){
    setText("zoneName", `Gagal muat masa solat (${Z})`);
  }
}

function format(t){
  try{
    let [h,m] = t.split(":").map(Number);
    const ampm = h>=12 ? "PM":"AM";
    h = (h%12)||12;
    return `${h}:${String(m).padStart(2,"0")} ${ampm}`;
  }catch{
    return "--:--";
  }
}

/* ============================================================
   NEXT PRAYER + COUNTDOWN
============================================================ */
function determineNextPrayer(){
  const now = new Date();
  let found=null, name="";

  for(const [n,v] of Object.entries(prayerTimes)){
    if(!v) continue;
    const [h,m]=v.split(":").map(Number);
    const t=new Date();
    t.setHours(h,m,0,0);
    if(t>now){
      found=t; name=n; break;
    }
  }

  if(!found && prayerTimes.Subuh){
    const [h,m]=prayerTimes.Subuh.split(":").map(Number);
    const t=new Date();
    t.setDate(t.getDate()+1);
    t.setHours(h,m,0,0);
    found=t; name="Subuh";
  }

  nextPrayerTime=found;
  setText("nextPrayerNameLarge", name);
}

setInterval(()=>{
  if (!nextPrayerTime) return;

  const diff = nextPrayerTime - new Date();
  if(diff<=0){ determineNextPrayer(); return; }

  const h = Math.floor(diff/3600000);
  const m = Math.floor((diff/60000)%60);
  const s = Math.floor((diff/1000)%60);

  document.getElementById("cdHour").innerText = String(h).padStart(2,"0");
  document.getElementById("cdMin").innerText  = String(m).padStart(2,"0");
  document.getElementById("cdSec").innerText  = String(s).padStart(2,"0");

  const box = document.querySelector(".countdown-container");
  const total = h*3600 + m*60 + s;

  if(total >= 0 && total <= 600) box.classList.add("highlight");
  else box.classList.remove("highlight");

},1000);

/* ============================================================
   CLOCK + HIGHLIGHT CURRENT PRAYER
============================================================ */
function updateClock(){
  const now = new Date();
  let h = now.getHours();
  let m = String(now.getMinutes()).padStart(2,"0");
  let s = String(now.getSeconds()).padStart(2,"0");

  const ampm = h>=12?"PM":"AM";
  h=(h%12)||12;

  setText("currentTime", `${h}:${m}:${s} ${ampm}`);
  updateHighlight();
  updateCurrentPrayerCard();
}
setInterval(updateClock,1000);
updateClock();

function updateCurrentPrayerCard(){
  const now = new Date();
  let active="Isyak";

  for(const [n,v] of Object.entries(prayerTimes)){
    if(!v) continue;
    const [h,m]=v.split(":").map(Number);
    const t=new Date();
    t.setHours(h,m,0,0);
    if(t<=now) active=n;
  }

  setText("currentPrayerName", active);
  setText("currentPrayerTime", prayerTimes[active] ? format(prayerTimes[active]) : "--:--");
}

function updateHighlight(){
  const now = new Date();
  let active="Isyak";

  for(const [n,v] of Object.entries(prayerTimes)){
    if(!v) continue;
    const [h,m]=v.split(":").map(Number);
    const t=new Date();
    t.setHours(h,m,0,0);
    if(t<=now) active=n;
  }

  document.querySelectorAll(".prayer-row").forEach(e => e.classList.remove("currentPrayer"));
  const el = document.getElementById("card"+active);
  if(el) el.classList.add("currentPrayer");
}

/* ============================================================
   STARTUP
============================================================ */
(async function init(){
  await setAutoDates();
  scaleToFit();
  await detectZoneAndLoad();
})();
