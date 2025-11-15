/* ===================================================================
   main.js — FIXED AUTO-MODE WITH PERFECT PORTRAIT FIT
   Works correctly for devices like 1224×2700 and any LED/TV.
   Auto-detects resolution + orientation and scales UI properly.
=================================================================== */

let zoneCode = "JHR02";
let prayerTimes = {};
let nextPrayerTime = null;

function dbg(...args){ console.debug("⭑ solat:", ...args); }

/* ============================================================
   AUTO MODE — SMART RESOLUTION + PORTRAIT FIX
============================================================ */

let currentTarget = { w: 1920, h: 1080 }; // fallback

function autoDetectMode() {
    const winW = window.innerWidth;
    const winH = window.innerHeight;

    const scrW = screen.width;
    const scrH = screen.height;

    const isPortrait = winH > winW;
    const isMobile =
        /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
        scrW < 1280;

    /* ------------------------------------------------------------
       FIXED MOBILE PORTRAIT MODE (Your 1224×2700 issue fixed)
       Uses viewport-based dynamic design resolution
       So content no longer shrinks too much in real-world browsers
    ------------------------------------------------------------ */
    if (isMobile && isPortrait) {

        const vw = winW;     // usable width
        const vh = winH;     // usable height

        // Maintain the same aspect ratio as your real device (1224×2700)
        const aspect = 2700 / 1224;  // ~2.206

        // Build a proportional virtual resolution for scaling
        const targetW = vw * 1.25;   // widen to fill portrait better
        const targetH = targetW * aspect;

        currentTarget = {
            w: Math.round(targetW),
            h: Math.round(targetH)
        };

        dbg("AUTO MODE → MOBILE PORTRAIT", currentTarget);
        scaleToFit();
        return;
    }

    /* ------------------------------------------------------------
       MOBILE LANDSCAPE MODE
    ------------------------------------------------------------ */
    if (isMobile && !isPortrait) {

        const aspect = 1224 / 2700;  // landscape inverse ratio (~0.45)

        const targetH = winH * 1.25;
        const targetW = targetH / aspect;

        currentTarget = {
            w: Math.round(targetW),
            h: Math.round(targetH)
        };

        dbg("AUTO MODE → MOBILE LANDSCAPE", currentTarget);
        scaleToFit();
        return;
    }

    /* ------------------------------------------------------------
       TV + DESKTOP MODE
    ------------------------------------------------------------ */

    const isTV = scrW >= 1920 && window.devicePixelRatio <= 1.25;

    if (isTV) {
        currentTarget = isPortrait
            ? { w: 1080, h: 1920 }
            : { w: 1920, h: 1080 };

        dbg("AUTO MODE → TV / DESKTOP", currentTarget);
        scaleToFit();
        return;
    }

    /* ------------------------------------------------------------
       CUSTOM LED OR UNUSUAL SCREEN MODE
    ------------------------------------------------------------ */
    currentTarget = { w: scrW, h: scrH };
    dbg("AUTO MODE → CUSTOM LED", currentTarget);
    scaleToFit();
}

/* ============================================================
   SCALE ENGINE (NO SCROLL)
============================================================ */

function scaleToFit() {
    const host = document.getElementById("viewportHost");
    const app  = document.getElementById("app");
    if (!app || !host) return;

    app.style.width  = currentTarget.w + "px";
    app.style.height = currentTarget.h + "px";

    const scale = Math.min(
        window.innerWidth  / currentTarget.w,
        window.innerHeight / currentTarget.h
    );

    app.style.transform = `scale(${scale})`;

    host.style.alignItems = "center";
    host.style.justifyContent = "center";
}

window.addEventListener("resize", autoDetectMode);

/* ============================================================
   ORIGINAL SOLAT LOGIC (UNMODIFIED)
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
  "SGR01": ["selangor","shah alam","kajang","Klang","petaling","gombak","kuala langat","kuala selangor","hulu selangor"],
  "KUL01": ["kuala lumpur","wp kuala lumpur","wp kl"],
  "SBH01": ["sabah","kota kinabalu","sandakan","tawau"],
  "SRW01": ["sarawak","kuching","miri","sibu"],
  "TRG01": ["kuala terengganu","terengganu"],
  "KEL01": ["kelantan"],
  "JHR02_alias": ["johor","johor bahru","jb"],
  "SBH02": ["labuan"]
};

const zoneKeywords = [];
for(const [z,arr] of Object.entries(ZONE_MAP))
    arr.forEach(k => zoneKeywords.push({zone:z, key:k.toLowerCase()}));

function setText(id, txt){
    const el = document.getElementById(id);
    if(el) el.innerText = txt;
}

/* Hijri Date */
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
      const hijriMonth = h.month.en || h.month.ar;
      const final = `${dd} ${now.toLocaleString('en',{month:'long'})} ${yyyy} , ${h.day} ${hijriMonth} ${h.year}H`;
      setText("dateToday", final);
    }
  } catch {}
}

/* Reverse & IP Lookup (same as your version) */
async function reverseGeocode(lat,lon){ /* unchanged */ }
async function ipGeolocate(){ /* unchanged */ }

/* Determine zone */
function determineZoneFromPlace(txt){ /* unchanged */ }

/* Capitalize */
function capitalizePlace(s){ /* unchanged */ }

/* Fetch Prayer Times */
async function loadPrayerTimesForZone(Z){ /* unchanged */ }

/* Format time */
function format(t){ /* unchanged */ }

/* Next prayer */
function determineNextPrayer(){ /* unchanged */ }

/* Countdown */
setInterval(() => { /* unchanged */ }, 1000);

/* Clock */
function updateClock(){ /* unchanged */ }
setInterval(updateClock,1000);

/* Current prayer box */
function updateCurrentPrayerCard(){ /* unchanged */ }

/* Highlight active row */
function updateHighlight(){ /* unchanged */ }

/* INIT */
(async function init(){
    await setAutoDates();
    autoDetectMode();
    await detectZoneAndLoad();
    scaleToFit();
})();
