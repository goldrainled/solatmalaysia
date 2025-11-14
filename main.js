/* ============================
   CONFIG
============================ */
const ZONE = "JHR02";
let prayerTimes = {};
let nextPrayerTime = null;

/* ============================
   HELPERS
============================ */
function dbg(...args){ console.log("⭑ solat debug:", ...args); }
function showUiError(msg){
  const nl = document.getElementById("nextLabel");
  const np = document.getElementById("nextPrayerName");
  if(nl) nl.innerText = msg;
  if(np) np.innerText = "--";
}

/* ============================
   LOAD TODAY'S PRAYER TIMES (robust + debug)
============================ */
async function loadPrayerTimes() {
  const url = `https://www.e-solat.gov.my/index.php?r=esolatApi/takwimsolat&period=month&zone=${ZONE}`;
  dbg("fetching e-solat url:", url);

  try {
    const res = await fetch(url, {cache: "no-store"});
    dbg("fetch response status:", res.status);
    if (!res.ok) throw new Error("HTTP " + res.status);

    // Try parse JSON
    let data;
    try {
      data = await res.json();
      dbg("got JSON from e-solat, top keys:", Object.keys(data || {}));
    } catch (e) {
      dbg("JSON parse failed:", e);
      throw new Error("Invalid JSON from e-solat");
    }

    // Prepare date string (JAKIM uses uppercase month codes in many responses)
    const today = new Date();
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];  
    const esDate = `${String(today.getDate()).padStart(2,'0')}-${months[today.getMonth()]}-${today.getFullYear()}`;

    dbg("esDate used for lookup:", esDate);

    // Defensive: ensure data.prayerTime exists & is an array
    const list = Array.isArray(data.prayerTime) ? data.prayerTime : [];
    dbg("prayerTime length:", list.length, "sample:", list.slice(0,3));

    const todayEntry = list.find(p => (p.date||"").toString().trim() === esDate);
    if (!todayEntry) {
      // If not found, log a helpful sample and bail
      dbg("No matching entry for esDate. First items (if any):", list.slice(0,6));
      showUiError("Tiada data (semak log)");
      return;
    }

    dbg("todayEntry found:", todayEntry);

    // Normalize times and store
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
    const safeSet = (id, val) => { const el = document.getElementById(id); if(el) el.innerText = val ? format(val) : "--:--"; };
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

  } catch (err) {
    // Catch any error (network, CORS, parse, missing data) and show it
    dbg("loadPrayerTimes error:", err && err.toString ? err.toString() : err);
    showUiError("Gagal muat data (lihat konsol)");
    // Optionally fallback to alternative API here (see notes below)
  }
}

/* Start loading */
loadPrayerTimes();

/* ============================
   FORMAT 12H TIME
============================ */
function format(t) {
  if (!t) return "--:--";
  let [h, m] = (""+t).split(":").map(x => Number((x||"").toString().trim() || 0));
  if (Number.isNaN(h)) h = 0;
  if (Number.isNaN(m)) m = 0;
  const ampm = h >= 12 ? "PM" : "AM";
  h = (h % 12) || 12;
  return `${h}:${String(m).padStart(2,"0")} ${ampm}`;
}

/* ============================
   DETERMINE NEXT PRAYER
============================ */
function determineNextPrayer() {
  if (!Object.keys(prayerTimes).length) return;
  const now = new Date();
  const list = Object.entries(prayerTimes);
  const nl = document.getElementById("nextLabel");
  if(nl) nl.innerText = "Waktu Solat Seterusnya";

  for (let [name,time] of list) {
    if(!time) continue;
    const [h,m] = time.split(":").map(Number);
    const t = new Date();
    t.setHours(h||0,m||0,0,0);
    if(t > now){
      nextPrayerTime = t;
      const np = document.getElementById("nextPrayerName");
      if(np) np.innerText = name;
      return;
    }
  }

  // After Isyak -> tomorrow Subuh
  let tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate()+1);
  const [h,m] = (prayerTimes.Subuh || "05:00").split(":").map(Number);
  tomorrow.setHours(h||5,m||0,0,0);
  nextPrayerTime = tomorrow;
  const nl2 = document.getElementById("nextLabel"); if(nl2) nl2.innerText = "Waktu Solat Seterusnya (Esok)";
  const np2 = document.getElementById("nextPrayerName"); if(np2) np2.innerText = "Subuh";
}

/* ============================
   COUNTDOWN
============================ */
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

/* ============================
   CLOCK (RUN EVERY SECOND)
============================ */
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

/* ============================
   CURRENT PRAYER (TOP CARD)
============================ */
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

/* ============================
   HIGHLIGHT CURRENT PRAYER LIST
============================ */
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

/* ============================
   OPTIONAL: manual debug helper
   In console run: window.debugPrayer()
============================ */
window.debugPrayer = async function(){
  dbg("prayerTimes:", prayerTimes);
  dbg("nextPrayerTime:", nextPrayerTime);
  // Also show the raw month fetch sample
  try{
    const url = `https://www.e-solat.gov.my/index.php?r=esolatApi/takwimsolat&period=month&zone=${ZONE}`;
    const res = await fetch(url, {cache:"no-store"});
    dbg("raw fetch status:", res.status);
    const txt = await res.text();
    dbg("raw fetch snippet (first 1000 chars):", txt.slice(0,1000));
  }catch(e){
    dbg("raw fetch error:", e && e.toString ? e.toString() : e);
  }
};
