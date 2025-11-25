/* ============================================================
   main.js — Cleaned / Single-file version
   - No duplicate functions
   - ZONE_MAP for detection (keywords)
   - ZONE_INFO for display (your preferred names)
   - GPS (reverse geocode via Nominatim) -> IP fallback (ipwho.is)
   - e-Solat monthly API loader
   - Countdown + clock + next-prayer logic
============================================================ */

/* ----- NO SCALING (Option A) ----- */
function autoDetectMode() { /* no-op */ }
function scaleToFit() {
  const app = document.getElementById("app");
  if (!app) return;
  app.style.transform = "none";
  app.style.width = "100%";
  app.style.height = "auto";
}

/* ----- Globals ----- */
let zoneCode = "JHR02";
let prayerTimes = {};      // keys: Imsak/Subuh/Syuruk/Zohor/Asar/Maghrib/Isyak -> "HH:MM" or null
let nextPrayerTime = null; // Date object
let dbgEnabled = false;
function dbg(...args){ if(dbgEnabled) console.debug("dbg:", ...args); }
function setText(id, txt){
  const el = document.getElementById(id);
  if(!el) return;
  el.innerText = txt;
}

/* ============================================================
   DATE HANDLING
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

    if(j && j.data && j.data.hijri){
      const h = j.data.hijri;
      const gMonthName = new Intl.DateTimeFormat('en-US',{month:'long'}).format(now);
      setText("dateTodayG", `${dd} ${gMonthName} ${yyyy}`);

      const hijriMonth = (h.month && (h.month.en || h.month.ar)) || "";
      setText("dateTodayH", `${h.day} ${hijriMonth} ${h.year}H`);
      return;
    }

    setText("dateTodayG", now.toLocaleDateString());
    setText("dateTodayH", "");
  } catch(e){
    dbg("setAutoDates error:", e);
    setText("dateTodayG", new Date().toLocaleDateString());
    setText("dateTodayH", "");
  }
}

/* ============================================================
   ZONE MAP (keyword detection) — keep as your detection source
   (trimmed/clean; modify keywords if you want more matches)
============================================================ */
const ZONE_MAP = {
  "JHR01": ["pulau aur","pulau pemanggil"],
  "JHR02": ["johor bahru","jb","johor","kota tinggi","mersing","kulai","jhr02"],
  "JHR03": ["kluang","pontian"],
  "JHR04": ["batu pahat","muar","segamat","gemas","tangkak"],

  "KDH01": ["kota setar","kubang pasu","pokok sena"],
  "KDH02": ["kuala muda","yan","pendang"],
  "KDH03": ["padang terap","sik"],
  "KDH04": ["baling"],
  "KDH05": ["bandar baharu","kulim"],
  "KDH06": ["langkawi"],
  "KDH07": ["gunung jerai"],

  "KTN01": ["bachok","kota bharu","machang","pasir mas","pasir puteh","tanah merah","tumpat","kuala krai"],
  "KTN02": ["jela","gua musang","jeli"],

  "MLK01": ["alor gajah","melaka","melaka tengah"],

  "PLS01": ["perlis","kangar"],

  "PNG01": ["pulau pinang","georgetown","penang","seberang perai"],

  "PHG01": ["kuantan","pahang","pulau tioman","cameron"],
  "PHG02": ["temerloh","lipis","raub"],
  "PHG03": ["jerantut","temerloh","maran"],
  "PHG04": ["bentong","lipis","raub"],
  "PHG05": ["genting sempah","janda baik","bukit tinggi"],
  "PHG06": ["cameron highlands","bukit fraser","genting"],

  "PRK01": ["tapah","slim river","tanjung malim","ipoh","perak","kinta"],
  "PRK02": ["kuala kangsar","sungai siput","ipoh","batu gajah","kampar"],
  "PRK03": ["lenggong","pengkalan hulu","grik"],
  "PRK04": ["temengor","belum"],
  "PRK05": ["teluk intan","bagan datuk","sitiawan","pangkor"],
  "PRK06": ["taiping","selama","bagan serai","parit buntar"],
  "PRK07": ["bukit larut","maxwell hill","taiping"],

  "SBH01": ["sandakan","sabah","kota kinabalu","tawau"],
  "SBH02": ["labuan"],
  "SBH03": ["lahad datu","semporna","kunak","tungku"],
  "SBH04": ["tawau","kalabakan"],
  "SBH05": ["kudat","pulau banggi","pitas"],
  "SBH06": ["kinabalu","mount kinabalu"],
  "SBH07": ["kota kinabalu","ranau","penampang","papar","putatan"],
  "SBH08": ["keningau","tambunan","nabawan"],
  "SBH09": ["beaufort","sipitang","tenom"],

  "SWK01": ["limbang","lawas"],
  "SWK02": ["miri"],
  "SWK03": ["bintulu"],
  "SWK04": ["mukah","sibu"],
  "SWK05": ["sarikei"],
  "SWK06": ["sri aman","lubok antu","betong"],
  "SWK07": ["serian","samarahan"],
  "SWK08": ["kuching","bau","lundu"],
  "SWK09": ["kampung patarikan"],

  "SGR01": ["selangor","shah alam","gombak","petaling","klang","hulu langat","sepang","hulu selangor"],
  "SGR02": ["kuala selangor","sabak bernam"],
  "SGR03": ["klang","kuala langat"],

  "TRG01": ["kuala terengganu","marang"],
  "TRG02": ["besut","setiu"],
  "TRG03": ["hulu terengganu"],
  "TRG04": ["dungun","kemaman"],

  "WLY01": ["kuala lumpur","putrajaya","wp kuala lumpur"],
  "WLY02": ["labuan"]
};

/* ============================================================
   ZONE INFO (DISPLAY PURPOSE ONLY) — your preferred names
============================================================ */
const ZONE_INFO = {
  "JHR01": { negeri: "Johor", daerah: "Pulau Aur dan Pulau Pemanggil" },
  "JHR02": { negeri: "Johor", daerah: "Johor Bahru, Kota Tinggi, Mersing, Kulai" },
  "JHR03": { negeri: "Johor", daerah: "Kluang, Pontian" },
  "JHR04": { negeri: "Johor", daerah: "Batu Pahat, Muar, Segamat, Gemas Johor, Tangkak" },

  "KDH01": { negeri: "Kedah", daerah: "Kota Setar, Kubang Pasu, Pokok Sena (Daerah Kecil)" },
  "KDH02": { negeri: "Kedah", daerah: "Kuala Muda, Yan, Pendang" },
  "KDH03": { negeri: "Kedah", daerah: "Padang Terap, Sik" },
  "KDH04": { negeri: "Kedah", daerah: "Baling" },
  "KDH05": { negeri: "Kedah", daerah: "Bandar Baharu, Kulim" },
  "KDH06": { negeri: "Kedah", daerah: "Langkawi" },
  "KDH07": { negeri: "Kedah", daerah: "Puncak Gunung Jerai" },

  "KTN01": { negeri: "Kelantan", daerah: "Bachok, Kota Bharu, Machang, Pasir Mas, Pasir Puteh, Tanah Merah, Tumpat, Kuala Krai, Mukim Chiku" },
  "KTN02": { negeri: "Kelantan", daerah: "Gua Musang (Daerah Galas Dan Bertam), Jeli, Jajahan Kecil Lojing" },

  "MLK01": { negeri: "Melaka", daerah: "SELURUH NEGERI MELAKA" },

  "NGS01": { negeri: "Negeri Sembilan", daerah: "Tampin, Jempol" },
  "NGS02": { negeri: "Negeri Sembilan", daerah: "Jelebu, Kuala Pilah, Rembau" },
  "NGS03": { negeri: "Negeri Sembilan", daerah: "Port Dickson, Seremban" },

  "PHG01": { negeri: "Pahang", daerah: "Pulau Tioman" },
  "PHG02": { negeri: "Pahang", daerah: "Kuantan, Pekan, Rompin, Muadzam Shah" },
  "PHG03": { negeri: "Pahang", daerah: "Jerantut, Temerloh, Maran, Bera, Chenor, Jengka" },
  "PHG04": { negeri: "Pahang", daerah: "Bentong, Lipis, Raub" },
  "PHG05": { negeri: "Pahang", daerah: "Genting Sempah, Janda Baik, Bukit Tinggi" },
  "PHG06": { negeri: "Pahang", daerah: "Cameron Highlands, Genting Higlands, Bukit Fraser" },

  "PRK01": { negeri: "Perak", daerah: "Tapah, Slim River, Tanjung Malim" },
  "PRK02": { negeri: "Perak", daerah: "Kuala Kangsar, Sg. Siput , Ipoh, Batu Gajah, Kampar" },
  "PRK03": { negeri: "Perak", daerah: "Lenggong, Pengkalan Hulu, Grik" },
  "PRK04": { negeri: "Perak", daerah: "Temengor, Belum" },
  "PRK05": { negeri: "Perak", daerah: "Kg Gajah, Teluk Intan, Bagan Datuk, Seri Iskandar, Beruas, Parit, Lumut, Sitiawan, Pulau Pangkor" },
  "PRK06": { negeri: "Perak", daerah: "Selama, Taiping, Bagan Serai, Parit Buntar" },
  "PRK07": { negeri: "Perak", daerah: "Bukit Larut" },

  "PLS01": { negeri: "Perlis", daerah: "SELURUH NEGERI PERLIS" },

  "PNG01": { negeri: "Pulau Pinang", daerah: "SELURUH NEGERI PULAU PINANG" },

  "SBH01": { negeri: "Sabah", daerah: "Bahagian Sandakan (Timur), Bukit Garam, Semawang, Temanggong, Tambisan, Bandar Sandakan, Sukau" },
  "SBH02": { negeri: "Sabah", daerah: "Beluran, Telupid, Pinangah, Terusan, Kuamut, Bahagian Sandakan (Barat)" },
  "SBH03": { negeri: "Sabah", daerah: "Lahad Datu, Silabukan, Kunak, Sahabat, Semporna, Tungku, Bahagian Tawau (Timur)" },
  "SBH04": { negeri: "Sabah", daerah: "Bandar Tawau, Balong, Merotai, Kalabakan, Bahagian Tawau (Barat)" },
  "SBH05": { negeri: "Sabah", daerah: "Kudat, Kota Marudu, Pitas, Pulau Banggi, Bahagian Kudat" },
  "SBH06": { negeri: "Sabah", daerah: "Gunung Kinabalu" },
  "SBH07": { negeri: "Sabah", daerah: "Kota Kinabalu, Ranau, Kota Belud, Tuaran, Penampang, Papar, Putatan, Bahagian Pantai Barat" },
  "SBH08": { negeri: "Sabah", daerah: "Pensiangan, Keningau, Tambunan, Nabawan, Bahagian Pendalaman (Atas)" },
  "SBH09": { negeri: "Sabah", daerah: "Beaufort, Kuala Penyu, Sipitang, Tenom, Long Pasia, Membakut, Weston, Bahagian Pendalaman (Bawah)" },

  "SWK01": { negeri: "Sarawak", daerah: "Limbang, Lawas, Sundar, Trusan" },
  "SWK02": { negeri: "Sarawak", daerah: "Miri, Niah, Bekenu, Sibuti, Marudi" },
  "SWK03": { negeri: "Sarawak", daerah: "Pandan, Belaga, Suai, Tatau, Sebauh, Bintulu" },
  "SWK04": { negeri: "Sarawak", daerah: "Sibu, Mukah, Dalat, Song, Igan, Oya, Balingian, Kanowit, Kapit" },
  "SWK05": { negeri: "Sarawak", daerah: "Sarikei, Matu, Julau, Rajang, Daro, Bintangor, Belawai" },
  "SWK06": { negeri: "Sarawak", daerah: "Lubok Antu, Sri Aman, Roban, Debak, Kabong, Lingga, Engkelili, Betong, Spaoh, Pusa, Saratok" },
  "SWK07": { negeri: "Sarawak", daerah: "Serian, Simunjan, Samarahan, Sebuyau, Meludam" },
  "SWK08": { negeri: "Sarawak", daerah: "Kuching, Bau, Lundu, Sematan" },
  "SWK09": { negeri: "Sarawak", daerah: "Zon Khas (Kampung Patarikan)" },

  "SGR01": { negeri: "Selangor", daerah: "Gombak, Petaling, Sepang, Hulu Langat, Hulu Selangor, Shah Alam" },
  "SGR02": { negeri: "Selangor", daerah: "Kuala Selangor, Sabak Bernam" },
  "SGR03": { negeri: "Selangor", daerah: "Klang, Kuala Langat" },

  "TRG01": { negeri: "Terengganu", daerah: "Kuala Terengganu, Marang, Kuala Nerus" },
  "TRG02": { negeri: "Terengganu", daerah: "Besut, Setiu" },
  "TRG03": { negeri: "Terengganu", daerah: "Hulu Terengganu" },
  "TRG04": { negeri: "Terengganu", daerah: "Dungun, Kemaman" },

  "WLY01": { negeri: "Wilayah Persekutuan", daerah: "Kuala Lumpur, Putrajaya" },
  "WLY02": { negeri: "Wilayah Persekutuan", daerah: "Labuan" }
};

/* Build zoneKeywords for fast detection */
const zoneKeywords = [];
for(const [zone,arr] of Object.entries(ZONE_MAP)){
  if(!Array.isArray(arr)) continue;
  arr.forEach(k => zoneKeywords.push({ zone, key: String(k).toLowerCase() }));
}

/* ============================================================
   GEOLOCATION (single reverseGeocode + single ip fallback)
   - Uses Nominatim with a proper User-Agent (important)
   - Fallback to ipwho.is for GitHub Pages environments
============================================================ */
async function reverseGeocode(lat, lon){
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`;
    const res = await fetch(url, {
      headers: {
        // put your site/contact so OSM won't block heavy usage
        "User-Agent": "goldrainled.github.io/solatmalaysia (contact: goldrainled@gmail.com)"
      }
    });
    if(!res.ok) throw new Error("revgeo HTTP " + res.status);
    const j = await res.json();
    const addr = j.address || {};
    const parts = [
      addr.suburb, addr.village, addr.town, addr.city,
      addr.county, addr.state, addr.region, addr.country
    ].filter(Boolean).map(s => String(s).toLowerCase());
    return parts.join(", ");
  } catch(e){
    dbg("reverseGeocode failed:", e);
    return "";
  }
}

async function ipGeolocate(){
  try {
    const res = await fetch("https://ipwho.is/");
    if(!res.ok) throw new Error("ipwho HTTP " + res.status);
    const j = await res.json();
    if(j.success === false) throw new Error("ipwho returned error");
    const parts = [ j.city, j.region, j.country ].filter(Boolean).map(s => String(s).toLowerCase());
    return parts.join(", ");
  } catch(e){
    dbg("ipGeolocate failed:", e);
    return "";
  }
}

/* ============================================================
   TEXT HELPERS
============================================================ */
function capitalizePlace(s){
  if(!s) return "";
  return s.split(",")[0]
          .split(" ")
          .map(w => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ");
}
function shortenCountry(placeStr){
  if(!placeStr) return placeStr;
  return placeStr.replace(/malaysia/gi, "MY");
}

/* ============================================================
   DETECTION: match location string to zone code
============================================================ */
function determineZoneFromPlace(placeStr){
  if(!placeStr) return null;
  const norm = placeStr.toLowerCase().replace(/[^\w\s]/g,' ');

  // Pass 1: skip alias-like keys if any
  for(const z of zoneKeywords){
    if(z.zone.endsWith("_alias")) continue;
    if(norm.includes(z.key)) return z.zone;
  }
  // Pass 2: include all keys
  for(const z of zoneKeywords){
    if(norm.includes(z.key)) return z.zone;
  }
  return null;
}

/* ============================================================
   ZONE DETECTION + LOAD PRAYER TIMES
============================================================ */
async function detectZoneAndLoad(){
  setText("zoneName", "Mengesan lokasi...");
  let placeStr = "";

  // 1) Try GPS
  if(navigator.geolocation){
    try {
      const pos = await new Promise((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 8000, maximumAge: 5*60*1000, enableHighAccuracy: true
        })
      );
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      dbg("GPS coords:", lat, lon);
      placeStr = await reverseGeocode(lat, lon);
      if(placeStr) dbg("Location from GPS:", placeStr);
    } catch(e){
      dbg("GPS failed:", e);
    }
  }

  // 2) Fallback to IP
  if(!placeStr){
    placeStr = await ipGeolocate();
    dbg("Location from IP:", placeStr);
  }

  // 3) Determine zone using keywords
  const foundZone = determineZoneFromPlace(placeStr);
  if(foundZone){
    const standardized = foundZone.replace(/_alias$/, '');
    zoneCode = standardized;
    if (ZONE_INFO[zoneCode]) {
      setText("zoneName", `${zoneCode} – ${ZONE_INFO[zoneCode].daerah}`);
    } else {
      setText("zoneName", `${zoneCode} – ${capitalizePlace(placeStr)}`);
    }
    dbg("Zone determined:", zoneCode);
  } else {
    dbg("Zone NOT found, using default:", zoneCode);
    setText("zoneName", `${zoneCode} - ${capitalizePlace(placeStr || "Lokasi tidak dikesan")}`);
  }

  // 4) Load prayer times
  await loadPrayerTimesForZone(zoneCode);
}

/* ============================================================
   PRAYER TIMES: normalise + UI update
============================================================ */
function fixTime(t){
  if(!t && t !== 0) return null;
  let s = String(t).trim();
  if(s.includes(":")){
    const [hh,mm] = s.split(":").map(p => p.replace(/\D/g,'')); 
    if(!hh) return null;
    return hh.padStart(2,"0") + ":" + (String(mm||"0").padStart(2,"0"));
  }
  s = s.replace(/\D/g,'').padStart(4,"0");
  return s.slice(0,2) + ":" + s.slice(2);
}

async function loadPrayerTimesForZone(Z){
  try {
    const url = `https://www.e-solat.gov.my/index.php?r=esolatApi/takwimsolat&period=month&zone=${encodeURIComponent(Z)}`;
    const res = await fetch(url, { cache: "no-store" });
    if(!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();

    const list = Array.isArray(data.prayerTime) ? data.prayerTime : [];
    const today = new Date();
    const dd = String(today.getDate()).padStart(2,'0');
    const yyyy = today.getFullYear();
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const key1 = `${dd}-${months[today.getMonth()]}-${yyyy}`;
    const key2 = `${dd}-${months[today.getMonth()].toUpperCase()}-${yyyy}`;

    let todayEntry = list.find(p => (p && (p.date === key1 || p.date === key2)));
    if(!todayEntry) todayEntry = list[list.length - 1] || {};

    prayerTimes = {
      Imsak   : fixTime(todayEntry.imsak),
      Subuh   : fixTime(todayEntry.fajr),
      Syuruk  : fixTime(todayEntry.syuruk),
      Zohor   : fixTime(todayEntry.dhuhr),
      Asar    : fixTime(todayEntry.asr),
      Maghrib : fixTime(todayEntry.maghrib),
      Isyak   : fixTime(todayEntry.isha)
    };

    if(Object.values(prayerTimes).every(v => v === null)){
      dbg("No prayer times for zone:", Z);
      setText("zoneName", `Gagal muat masa solat (${Z})`);
      nextPrayerTime = null;
      ["imsakTime","subuhTime","syurukTime","zohorTime","asarTime","maghribTime","isyakTime"].forEach(id => setText(id,"--:--"));
      setText("nextPrayerNameLarge","--");
      return;
    }

    const uiSet = (id, value) => {
      const el = document.getElementById(id);
      if(!el) return;
      el.innerText = value ? format(value) : "--:--";
    };

    uiSet("imsakTime", prayerTimes.Imsak);
    uiSet("subuhTime", prayerTimes.Subuh);
    uiSet("syurukTime", prayerTimes.Syuruk);
    uiSet("zohorTime", prayerTimes.Zohor);
    uiSet("asarTime", prayerTimes.Asar);
    uiSet("maghribTime", prayerTimes.Maghrib);
    uiSet("isyakTime", prayerTimes.Isyak);

    determineNextPrayer();
    updateHighlight();
    updateCurrentPrayerCard();

  } catch(err){
    dbg("loadPrayerTimesForZone error:", err);
    setText("zoneName", `Gagal muat masa solat (${Z})`);
    nextPrayerTime = null;
  }
}

/* ============================================================
   FORMAT DISPLAY / NEXT PRAYER / COUNTDOWN
============================================================ */
function format(t){
  if(!t && t !== 0) return "--:--";
  try {
    t = t.toString().trim();
    if(t.length === 4 && !t.includes(":")) t = t.slice(0,2) + ":" + t.slice(2);
    if(!t.includes(":")) return "--:--";
    let [h,m] = t.split(":").map(x => Number(String(x).replace(/\D/g,'')));
    if(Number.isNaN(h) || Number.isNaN(m)) return "--:--";
    h = Math.max(0, Math.min(23, h));
    m = Math.max(0, Math.min(59, m));
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = (h % 12) || 12;
    return `${h12}:${String(m).padStart(2,"0")} ${ampm}`;
  } catch(e){
    return "--:--";
  }
}

function determineNextPrayer(){
  const now = new Date();
  let found = null;
  let foundName = null;

  for(const [name, raw] of Object.entries(prayerTimes)){
    if(!raw) continue;
    const [h,m] = raw.split(":").map(Number);
    if(Number.isNaN(h) || Number.isNaN(m)) continue;
    const when = new Date();
    when.setHours(h, m, 0, 0);
    if(when > now){
      found = when;
      foundName = name;
      break;
    }
  }

  if(!found){
    const sub = prayerTimes.Subuh;
    if(sub){
      const [h,m] = sub.split(":").map(Number);
      const when = new Date();
      when.setDate(when.getDate() + 1);
      when.setHours(h, m, 0, 0);
      found = when;
      foundName = "Subuh";
    } else {
      nextPrayerTime = null;
      setText("nextPrayerNameLarge", "--");
      return;
    }
  }

  nextPrayerTime = found;
  setText("nextPrayerNameLarge", foundName || "--");
}

/* Countdown interval (updates cdHour/cdMin/cdSec and highlight) */
setInterval(()=>{
  if(!nextPrayerTime) return;
  const now = new Date();
  const diff = nextPrayerTime - now;
  if(diff <= 0){ determineNextPrayer(); return; }

  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff / 60000) % 60);
  const s = Math.floor((diff / 1000) % 60);

  const set = (id,v)=>{ const el=document.getElementById(id); if(el) el.innerText = String(v).padStart(2,"0"); };
  set("cdHour", h);
  set("cdMin", m);
  set("cdSec", s);

  const totalSeconds = h*3600 + m*60 + s;
  const countdownBox = document.querySelector(".countdown-container");
  if(totalSeconds >= 0 && totalSeconds <= 600){
    if(countdownBox) countdownBox.classList.add("highlight");
  } else {
    if(countdownBox) countdownBox.classList.remove("highlight");
  }
}, 1000);

/* ============================================================
   CLOCK / CURRENT PRAYER CARD / HIGHLIGHT
============================================================ */
function updateClock(){
  const now = new Date();
  let h = now.getHours();
  let m = String(now.getMinutes()).padStart(2,"0");
  let s = String(now.getSeconds()).padStart(2,"0");
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = (h % 12) || 12;
  setText("currentTime", `${h12}:${m}:${s} ${ampm}`);
  updateHighlight();
  updateCurrentPrayerCard();
}
setInterval(updateClock, 1000);
updateClock();

function updateCurrentPrayerCard(){
  const now = new Date();
  let active = "Isyak";
  for(const [name, raw] of Object.entries(prayerTimes)){
    if(!raw) continue;
    const [h,m] = raw.split(":").map(Number);
    if(Number.isNaN(h) || Number.isNaN(m)) continue;
    const t = new Date();
    t.setHours(h,m,0,0);
    if(t <= now) active = name;
  }

  setText("currentPrayerName", active);
  const activeTime = prayerTimes[active];
  setText("currentPrayerTime", activeTime ? format(activeTime) : "--:--");
}

function updateHighlight(){
  let active = "Isyak";
  const now = new Date();
  for(const [name, raw] of Object.entries(prayerTimes)){
    if(!raw) continue;
    const [h,m] = raw.split(":").map(Number);
    if(Number.isNaN(h) || Number.isNaN(m)) continue;
    const t = new Date(); t.setHours(h,m,0,0);
    if(t <= now) active = name;
  }
  document.querySelectorAll(".prayer-row").forEach(e => e.classList.remove("currentPrayer"));
  const el = document.getElementById("card" + active);
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
