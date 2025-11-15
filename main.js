/* ============================================================================
   FULLSCREEN AUTO-SCALE ENGINE (KIOSK MODE)
   Works for all mobile phones + desktop + LED panels.
============================================================================ */

let zoneCode = "JHR02";
let prayerTimes = {};
let nextPrayerTime = null;

/* -----------------------------
   SCALE ENGINE CONFIG
----------------------------- */
const DESIGN_WIDTH  = 1224;
const DESIGN_HEIGHT = 2700;

/* Auto Scale (No scroll) */
function scaleToFit() {
    const host = document.getElementById("viewportHost");
    const app  = document.getElementById("app");
    if (!app || !host) return;

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    if (vw < 100 || vh < 100) return; // avoid chrome animation glitch

    let scale = Math.min(vw / DESIGN_WIDTH, vh / DESIGN_HEIGHT);

    // prevent blank UI on tall phones
    if (scale < 0.80) scale = 0.80;

    app.style.transform = `scale(${scale})`;

    host.style.alignItems = "flex-start";
    host.style.justifyContent = "center";
}

window.addEventListener("resize", () => {
    scaleToFit();
});

window.addEventListener("orientationchange", () => {
    setTimeout(scaleToFit, 250);
});


/* ============================================================================
   DATE (HIJRI + GREGORIAN)
============================================================================ */
async function setAutoDates() {
    try {
        const now = new Date();
        const dd = String(now.getDate()).padStart(2, "0");
        const mm = String(now.getMonth() + 1).padStart(2, "0");
        const yyyy = now.getFullYear();

        const res = await fetch(`https://api.aladhan.com/v1/gToH?date=${dd}-${mm}-${yyyy}`);
        const j = await res.json();

        if (j?.data?.hijri) {
            const h = j.data.hijri;
            const monthName = now.toLocaleString('en', {month: 'long'});
            document.getElementById("dateToday").innerText =
                `${dd} ${monthName} ${yyyy} , ${h.day} ${h.month.en} ${h.year}H`;
            return;
        }
    } catch (e) {}

    document.getElementById("dateToday").innerText = new Date().toLocaleDateString();
}


/* ============================================================================
   LOCATION → ZONE DETECTION
============================================================================ */

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
  "KEL01":["kelantan"]
};

const zoneKeywords = [];
for (const [z, list] of Object.entries(ZONE_MAP)) {
    list.forEach(k => zoneKeywords.push({zone: z, key: k.toLowerCase()}));
}

async function reverseGeocode(lat, lon) {
    try {
        const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`
        );
        const j = await res.json();
        return Object.values(j.address || {}).join(", ").toLowerCase();
    } catch(e) { return ""; }
}

async function ipGeolocate() {
    try {
        const res = await fetch("https://ipapi.co/json/");
        const j = await res.json();
        return [j.city, j.region, j.country_name]
            .filter(Boolean).join(", ").toLowerCase();
    } catch(e) {
        return "";
    }
}

function determineZone(str) {
    if (!str) return null;
    const clean = str.toLowerCase();
    for (const z of zoneKeywords) {
        if (clean.includes(z.key)) return z.zone;
    }
    return null;
}

async function detectZoneAndLoad() {
    const zoneLabel = document.getElementById("zoneName");
    zoneLabel.innerText = "Mengesan lokasi...";

    let place = "";

    if (navigator.geolocation) {
        try {
            const pos = await new Promise((ok, fail) => 
                navigator.geolocation.getCurrentPosition(ok, fail, {timeout:8000})
            );
            place = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
        } catch(e) {
            place = await ipGeolocate();
        }
    } else {
        place = await ipGeolocate();
    }

    const found = determineZone(place);
    if (found) zoneCode = found;

    zoneLabel.innerText = `${zoneCode} - ${place || "Lokasi tidak dikesan"}`;

    await loadPrayerTimesForZone(zoneCode);
}


/* ============================================================================
   LOAD SOLAT TIMES (E-SOLAT API)
============================================================================ */
async function loadPrayerTimesForZone(Z) {
    const url = `https://www.e-solat.gov.my/index.php?r=esolatApi/takwimsolat&period=month&zone=${Z}`;

    try {
        const res = await fetch(url);
        const data = await res.json();

        const list = data.prayerTime || [];
        const today = new Date();

        const dd = String(today.getDate()).padStart(2, "0");
        const yyyy = today.getFullYear();

        const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
        const d1 = `${dd}-${months[today.getMonth()]}-${yyyy}`;
        const d2 = `${dd}-${months[today.getMonth()].toUpperCase()}-${yyyy}`;

        let todayRow = list.find(x => x.date === d1 || x.date === d2);
        if (!todayRow) todayRow = list[list.length - 1];

        function pad4(t) { return (t || "0000").padStart(4, "0"); }

        prayerTimes = {
            Ismak:   pad4(todayRow.imsak),
            Subuh:   pad4(todayRow.fajr),
            Syuruk:  pad4(todayRow.syuruk),
            Zohor:   pad4(todayRow.dhuhr),
            Asar:    pad4(todayRow.asr),
            Maghrib: pad4(todayRow.maghrib),
            Isyak:   pad4(todayRow.isha)
        };

        updatePrayerUI();
        determineNextPrayer();

    } catch(e) {
        document.getElementById("zoneName").innerText =
            `Ralat memuat masa solat (${Z})`;
    }
}

function formatTime(t) {
    t = t.padStart(4, "0");
    let h = parseInt(t.substr(0, 2));
    let m = t.substr(2);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${h12}:${m} ${ampm}`;
}

function updatePrayerUI() {
    document.getElementById("ismakTime").innerText   = formatTime(prayerTimes.Ismak);
    document.getElementById("subuhTime").innerText   = formatTime(prayerTimes.Subuh);
    document.getElementById("syurukTime").innerText  = formatTime(prayerTimes.Syuruk);
    document.getElementById("zohorTime").innerText   = formatTime(prayerTimes.Zohor);
    document.getElementById("asarTime").innerText    = formatTime(prayerTimes.Asar);
    document.getElementById("maghribTime").innerText = formatTime(prayerTimes.Maghrib);
    document.getElementById("isyakTime").innerText   = formatTime(prayerTimes.Isyak);
}


/* ============================================================================
   NEXT PRAYER
============================================================================ */
function determineNextPrayer() {
    const now = new Date();

    for (const [name, t] of Object.entries(prayerTimes)) {
        const h = +t.substr(0,2);
        const m = +t.substr(2);

        const dt = new Date();
        dt.setHours(h, m, 0, 0);

        if (dt > now) {
            nextPrayerTime = dt;
            document.getElementById("nextPrayerNameLarge").innerText = name;
            return;
        }
    }

    // After Isyak → next day Subuh
    let d = new Date();
    d.setDate(d.getDate() + 1);

    const t = prayerTimes.Subuh;
    const h = +t.substr(0,2);
    const m = +t.substr(2);
    d.setHours(h, m, 0, 0);

    nextPrayerTime = d;
    document.getElementById("nextPrayerNameLarge").innerText = "Subuh";
}


/* ============================================================================
   COUNTDOWN
============================================================================ */
setInterval(() => {
    if (!nextPrayerTime) return;

    const now = new Date();
    let diff = nextPrayerTime - now;

    if (diff <= 0) {
        determineNextPrayer();
        return;
    }

    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);

    document.getElementById("cdHour").innerText = String(h).padStart(2,"0");
    document.getElementById("cdMin").innerText  = String(m).padStart(2,"0");
    document.getElementById("cdSec").innerText  = String(s).padStart(2,"0");

}, 1000);


/* ============================================================================
   CLOCK + CURRENT PRAYER HIGHLIGHT
============================================================================ */
function updateClock() {
    const now = new Date();
    let h = now.getHours();
    let m = String(now.getMinutes()).padStart(2,"0");
    let s = String(now.getSeconds()).padStart(2,"0");

    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;

    document.getElementById("currentTime").innerText =
        `${h12}:${m}:${s} ${ampm}`;

    updateCurrentPrayerCard();
    updateHighlight();
}

setInterval(updateClock, 1000);
updateClock();


function updateCurrentPrayerCard() {
    const now = new Date();
    let active = "Isyak";

    for (const [name, t] of Object.entries(prayerTimes)) {
        const h = +t.substr(0,2);
        const m = +t.substr(2);
        const dt = new Date();
        dt.setHours(h, m, 0, 0);
        if (dt <= now) active = name;
    }

    document.getElementById("currentPrayerName").innerText = active;
    document.getElementById("currentPrayerTime").innerText =
        formatTime(prayerTimes[active]);
}

function updateHighlight() {
    const now = new Date();
    let active = "Isyak";

    for (const [name, t] of Object.entries(prayerTimes)) {
        const h = +t.substr(0,2);
        const m = +t.substr(2);
        const dt = new Date();
        dt.setHours(h, m, 0, 0);
        if (dt <= now) active = name;
    }

    document.querySelectorAll(".prayer-row")
        .forEach(el => el.classList.remove("currentPrayer"));

    const card = document.getElementById("card" + active);
    if (card) card.classList.add("currentPrayer");
}


/* ============================================================================
   INIT
============================================================================ */
(async function init() {
    scaleToFit();
    await setAutoDates();
    await detectZoneAndLoad();
    scaleToFit();
})();
