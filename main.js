/* ============================
   CONFIG
============================ */
const ZONE = "JHR02";
let prayerTimes = {};
let nextPrayerTime = null;
let nextPrayerName = "--";

/* ========== UTILS ========== */
function format12(t){
  if(!t) return "--:--";
  const parts = t.split(":").map(Number);
  const h = parts[0] ?? 0;
  const m = parts[1] ?? 0;
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = (h % 12) || 12;
  return `${h12}:${String(m).padStart(2,"0")} ${ampm}`;
}
function formatDateLong(d){
  const months=["January","February","March","April","May","June","July","August","September","October","November","December"];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

/* ========== LOAD TIMES ========== */
async function loadPrayerTimes(){
  try{
    const url = `https://www.e-solat.gov.my/index.php?r=esolatApi/takwimsolat&period=month&zone=${ZONE}`;
    const res = await fetch(url);
    const data = await res.json();
    if(!data || !data.prayerTime) return;

    const today = new Date();
    document.getElementById("todayDate").innerText = formatDateLong(today);
    const months=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const esDate = `${String(today.getDate()).padStart(2,'0')}-${months[today.getMonth()]}-${today.getFullYear()}`;

    const entry = data.prayerTime.find(p => p.date === esDate);
    if(!entry) return;

    prayerTimes = {
      Ismak: entry.imsak,
      Subuh: entry.fajr,
      Syuruk: entry.syuruk,
      Zohor: entry.dhuhr,
      Asar: entry.asr,
      Maghrib: entry.maghrib,
      Isyak: entry.isha
    };

    // populate list times
    document.getElementById("ismakTime").innerText = format12(prayerTimes.Ismak);
    document.getElementById("subuhTime").innerText = format12(prayerTimes.Subuh);
    document.getElementById("syurukTime").innerText = format12(prayerTimes.Syuruk);
    document.getElementById("zohorTime").innerText = format12(prayerTimes.Zohor);
    document.getElementById("asarTime").innerText = format12(prayerTimes.Asar);
    document.getElementById("maghribTime").innerText = format12(prayerTimes.Maghrib);
    document.getElementById("isyakTime").innerText = format12(prayerTimes.Isyak);

    determineNextPrayer();
    highlightCurrentPrayer();
  }catch(err){
    console.error("loadPrayerTimes", err);
  }
}
loadPrayerTimes();
setInterval(loadPrayerTimes, 60*60*1000);

/* ========== NEXT PRAYER (with tomorrow handling) ========== */
function determineNextPrayer(){
  if(!prayerTimes || Object.keys(prayerTimes).length===0) return;
  const now = new Date();
  const order = ["Ismak","Subuh","Syuruk","Zohor","Asar","Maghrib","Isyak"];
  // reset label text
  const nextLabelEl = document.getElementById("nextLabel");
  if(nextLabelEl) nextLabelEl.innerText = "Waktu Solat Seterusnya";

  for(const name of order){
    const tstr = prayerTimes[name];
    if(!tstr) continue;
    const [hh,mm] = tstr.split(":").map(Number);
    const t = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm, 0, 0);
    if(t > now){
      nextPrayerTime = t;
      nextPrayerName = name;
      document.getElementById("nextPrayerName").innerText = name;
      return;
    }
  }

  // after Isyak => tomorrow Subuh
  const sub = prayerTimes.Subuh;
  if(!sub) return;
  const [h,m] = sub.split(":").map(Number);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate()+1);
  tomorrow.setHours(h,m,0,0);
  nextPrayerTime = tomorrow;
  nextPrayerName = "Subuh";
  if(nextLabelEl) nextLabelEl.innerText = "Waktu Solat Seterusnya (Esok)";
  document.getElementById("nextPrayerName").innerText = "Subuh";
}

/* ========== COUNTDOWN ========== */
function updateCountdown(){
  if(!nextPrayerTime){
    document.getElementById("cdHour").innerText="00";
    document.getElementById("cdMin").innerText="00";
    document.getElementById("cdSec").innerText="00";
    return;
  }
  const now = new Date();
  let diff = nextPrayerTime - now;
  if(diff <= 0){
    determineNextPrayer();
    return;
  }
  const hh = Math.floor(diff / (1000*60*60));
  const mm = Math.floor((diff / (1000*60)) % 60);
  const ss = Math.floor((diff / 1000) % 60);
  document.getElementById("cdHour").innerText = String(hh).padStart(2,"0");
  document.getElementById("cdMin").innerText = String(mm).padStart(2,"0");
  document.getElementById("cdSec").innerText = String(ss).padStart(2,"0");
}
setInterval(updateCountdown, 1000);

/* ========== CLOCK + current prayer card update ========== */
function updateClockAndCurrentPrayer(){
  const now = new Date();
  const h = now.getHours();
  const m = now.getMinutes();
  const s = now.getSeconds();
  const h12 = (h % 12) || 12;
  const ampm = h >= 12 ? "PM" : "AM";
  document.getElementById("currentTime").innerText = `${h12}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")} ${ampm}`;

  // update countdown and highlight
  updateCountdown();
  highlightCurrentPrayer();
}
setInterval(updateClockAndCurrentPrayer, 1000);
updateClockAndCurrentPrayer();

/* ========== HIGHLIGHT & Current Prayer card ========== */
function highlightCurrentPrayer(){
  if(!prayerTimes || Object.keys(prayerTimes).length===0) return;
  const now = new Date();
  const order = ["Ismak","Subuh","Syuruk","Zohor","Asar","Maghrib","Isyak"];
  let active = "Isyak";
  let activeTime = prayerTimes.Isyak;

  for(const name of order){
    const tstr = prayerTimes[name];
    if(!tstr) continue;
    const [hh,mm] = tstr.split(":").map(Number);
    const t = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm, 0, 0);
    if(t <= now){
      active = name;
      activeTime = tstr;
    }
  }

  // update highlight classes
  document.querySelectorAll(".card").forEach(c => c.classList.remove("currentPrayer"));
  const activeCard = document.getElementById("card" + active);
  if(activeCard) activeCard.classList.add("currentPrayer");

  // update top-left current prayer card values
  const elTime = document.getElementById("currentPrayerTime");
  const elName = document.getElementById("currentPrayerName");
  if(elTime) elTime.innerText = format12(activeTime);
  if(elName) elName.innerText = active;
}

/* safety reload if nothing loaded */
setTimeout(()=>{ if(!prayerTimes || Object.keys(prayerTimes).length===0) loadPrayerTimes(); }, 2000);
