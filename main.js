/* ============================================================
   main.js — Option A (NO SCALING)
============================================================ */

// no scaling needed
function autoDetectMode() {}
function scaleToFit() {
    const app = document.getElementById("app");
    if (app) {
        app.style.transform = "none";
        app.style.width = "100%";
        app.style.height = "auto";
    }
}

/* ----------------------------- */

let zoneCode = "JHR02";
let prayerTimes = {};
let nextPrayerTime = null;

function setText(id, txt){
    const el = document.getElementById(id);
    if(el) el.innerText = txt;
}

/* ============================================================
   DATE HANDLING
============================================================ */
async function setAutoDates(){
    try{
        const now = new Date();
        const dd = String(now.getDate()).padStart(2,'0');
        const mm = String(now.getMonth()+1).padStart(2,'0');
        const yyyy = now.getFullYear();

        const res = await fetch(`https://api.aladhan.com/v1/gToH?date=${dd}-${mm}-${yyyy}`);
        const j = await res.json();

        if(j?.data?.hijri){
            const h = j.data.hijri;

            const gMonth = new Intl.DateTimeFormat('en-US',{month:'long'}).format(now);
            setText("dateTodayG", `${dd} ${gMonth} ${yyyy}`);

            setText("dateTodayH", `${h.day} ${h.month.en} ${h.year}H`);
            return;
        }

        setText("dateTodayG", now.toLocaleDateString());
    }catch(e){
        setText("dateTodayG", new Date().toLocaleDateString());
    }
}

/* ============================================================
   GEO LOOKUP
============================================================ */
async function reverseGeocode(lat, lon){
    try{
        const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`;
        const res = await fetch(url);
        const j = await res.json();
        const a = j.address || {};

        const parts = [
            a.city, a.town, a.village, a.county,
            a.state, a.region, a.country
        ].filter(Boolean).map(s=>s.toLowerCase());

        return parts.join(", ");
    }catch(e){
        return "";
    }
}

async function ipGeolocate(){
    try{
        const res = await fetch("https://ipapi.co/json/");
        const j = await res.json();
        return [j.city, j.region, j.country_name]
            .filter(Boolean)
            .map(v=>v.toLowerCase())
            .join(", ");
    }catch(e){
        return "";
    }
}

/* ============================================================
   TITLE CASE FOR LOCATION
============================================================ */
function capitalizePlace(s){
    if(!s) return "";
    return s.split(",")
        .map(p => p.trim().split(" ")
            .map(w => w.charAt(0).toUpperCase()+w.slice(1))
            .join(" ")
        )
        .join(", ");
}

/* ============================================================
   ZONE DETECTION
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
    "KDH07":["gunung jerai"],
    "PHG01":["pahang","kuantan","cameron"],
    "PHG02":["temerloh","lipis","raub"],
    "PRK01":["ipoh","perak","kinta","manjung","taiping","kerian"],
    "SGR01":["selangor","shah alam","kajang","klang","petaling","gombak","kuala langat","kuala selangor","hulu selangor"],
    "KUL01":["kuala lumpur","wp kuala lumpur","wp kl"],
    "SBH01":["sabah","kota kinabalu","sandakan","tawau"],
    "SRW01":["sri aman","sarawak","kuching","sibu","miri"],
    "TRG01":["kuala terengganu"],
    "KEL01":["kelantan"],
    "JHR02_alias":["johor","johor bahru","jb"],
    "SBH02":["labuan"]
};

const zoneKeywords = [];
for(const [zone,arr] of Object.entries(ZONE_MAP)){
    arr.forEach(k => zoneKeywords.push({
        zone,
        key: k.toLowerCase()
    }));
}

function determineZoneFromPlace(place){
    if(!place) return null;
    const norm = place.toLowerCase();

    // Pass 1: exact zones
    for(const z of zoneKeywords){
        if(z.zone.endsWith("_alias")) continue;
        if(norm.includes(z.key)) return z.zone;
    }
    // Pass 2: alias
    for(const z of zoneKeywords){
        if(norm.includes(z.key)) return z.zone;
    }
    return null;
}

/* ============================================================
   DETECT LOCATION + APPLY TITLE CASE
============================================================ */
async function detectZoneAndLoad(){
    setText("zoneName","Mengesan lokasi...");

    let placeStr = "";

    if(navigator.geolocation){
        try{
            const pos = await new Promise((resolve,reject)=>{
                navigator.geolocation.getCurrentPosition(resolve,reject,{timeout:8000});
            });
            placeStr = await reverseGeocode(pos.coords.latitude,pos.coords.longitude);
        }catch(e){
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

/* ============================================================
   PRAYER TIME LOADING
============================================================ */
async function loadPrayerTimesForZone(Z){
    try{
        const url = `https://www.e-solat.gov.my/index.php?r=esolatApi/takwimsolat&period=month&zone=${Z}`;
        const res = await fetch(url,{cache:"no-store"});
        const data = await res.json();

        const list = data?.prayerTime || [];
        const now = new Date();
        const dd = String(now.getDate()).padStart(2,'0');
        const yyyy = now.getFullYear();
        const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

        const es1 = `${dd}-${months[now.getMonth()]}-${yyyy}`;
        const es2 = `${dd}-${months[now.getMonth()].toUpperCase()}-${yyyy}`;

        const todayEntry = list.find(p => p.date===es1 || p.date===es2) || list[list.length-1];

        prayerTimes = {
            Ismak: todayEntry.imsak,
            Subuh: todayEntry.fajr,
            Syuruk: todayEntry.syuruk,
            Zohor: todayEntry.dhuhr,
            Asar: todayEntry.asr,
            Maghrib: todayEntry.maghrib,
            Isyak: todayEntry.isha
        };

        const set = (id,v)=>{ const el=document.getElementById(id); if(el) el.innerText=v; };
        set("ismakTime", todayEntry.imsak);
        set("subuhTime", todayEntry.fajr);
        set("syurukTime", todayEntry.syuruk);
        set("zohorTime", todayEntry.dhuhr);
        set("asarTime", todayEntry.asr);
        set("maghribTime", todayEntry.maghrib);
        set("isyakTime", todayEntry.isha);

        determineNextPrayer();
        updateHighlight();
        updateCurrentPrayerCard();

    }catch(e){
        setText("zoneName", `Gagal muat masa solat (${Z})`);
    }
}

/* ============================================================
   PRAYER TIME FORMAT + NEXT PRAYER + UI UPDATES
============================================================ */

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

/* ============================================================
   START
============================================================ */
(async function init(){
  await setAutoDates();
  scaleToFit();          // Important for Option A
  await detectZoneAndLoad();
})();
