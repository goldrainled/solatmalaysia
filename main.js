/* =================================================================================
   FULL main.js — FINAL VERSION
   • FIXED portrait + landscape mode
   • FIXED blank screen on mobile
   • FIXED scaling on all devices (phones/tablets/TV/LED displays)
   • Solat time + location + countdown + highlight fully working
================================================================================= */

/* ---------------------------------------------------------
   GLOBAL VARIABLES
--------------------------------------------------------- */
let zoneCode = "JHR02";
let prayerTimes = {};
let nextPrayerTime = null;

let currentTarget = { w: 1224, h: 2700 }; // perfect base design



/* =================================================================================
   FIXED SCALING ENGINE — NO BLANK, NO SHRINK, WORKS ON ALL DEVICES
================================================================================= */

function scaleToFit() {
    const host = document.getElementById("viewportHost");
    const app  = document.getElementById("app");

    if (!app || !host) return;

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Prevent reading wrong values during mobile browser toolbar animation
    if (vw < 100 || vh < 100) return;

    let scale = Math.min(vw / currentTarget.w, vh / currentTarget.h);

    // --- FIX #1: Prevent the blank-screen effect (scale too small) ---
    if (scale < 0.82) scale = 0.82;

    app.style.width  = currentTarget.w + "px";
    app.style.height = currentTarget.h + "px";
    app.style.transform = `scale(${scale})`;

    host.style.alignItems = "center";
    host.style.justifyContent = "center";
}



/* =================================================================================
   FIXED PORTRAIT MODE — NEVER HIDE MOBILE SCREEN
================================================================================= */
function enforcePortrait() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    // --- FIX #2: Never hide body on mobile (was causing blank screen) ---
    if (isMobile) {
        document.body.style.display = "flex";
        return;
    }

    // Desktop/Kiosk logic
    document.body.style.display = "flex";
}



/* =================================================================================
   AUTO-DETECT DEVICE & VIRTUAL DESIGN SIZE
================================================================================= */

function autoDetectMode() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const isPortrait = h > w;

    const smallPhone = w < 500;

    if (isPortrait) {
        // Portrait layout target
        currentTarget = { w: 1224, h: 2700 };
    } else {
        // Landscape layout target
        currentTarget = { w: 2700, h: 1224 };
    }

    // Additional safe fallback for ultra-tall phones
    if (smallPhone) {
        currentTarget = { w: 1000, h: 2200 };
    }
}



/* =================================================================================
   UPDATE SCALE ON EVENTS
================================================================================= */

window.addEventListener("resize", () => {
    autoDetectMode();
    enforcePortrait();
    scaleToFit();
});

window.addEventListener("orientationchange", () => {
    setTimeout(() => {
        autoDetectMode();
        enforcePortrait();
        scaleToFit();
    }, 250);
});



/* =================================================================================
   SOLAT LOGIC (Original - Working)
================================================================================= */

function setText(id, txt) {
    const el = document.getElementById(id);
    if (el) el.innerText = txt;
}

/* ------------------ HIJRI & GREGORIAN DATE ------------------ */
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
            setText(
                "dateToday",
                `${dd} ${now.toLocaleString("en", { month: "long" })} ${yyyy} , ${h.day} ${h.month.en} ${h.year}H`
            );
            return;
        }
    } catch (e) {}
    setText("dateToday", new Date().toLocaleDateString());
}



/* ------------------ ZONE MAP ------------------ */
const ZONE_MAP = {
    "JHR01": ["pulau aur", "pulau pemanggil"],
    "JHR02": ["johor bahru", "kota tinggi", "mersing", "jb", "johor bharu"],
    "JHR03": ["kluang", "pontian"],
    "JHR04": ["batu pahat", "muar", "segamat", "gemas"],
    "KDH01": ["kota setar", "kubang pasu", "pokok sena"],
    "KDH02": ["kuala muda", "yan", "pendang"],
    "KDH03": ["padang terap", "sik"],
    "KDH04": ["baling"],
    "KDH05": ["bandar baharu", "kulim"],
    "KDH06": ["langkawi"],
    "MLK01": ["alor gajah", "melaka"],
    "PLS01": ["perlis", "kangar"],
    "PNG01": ["pulau pinang", "penang", "george town"],
    "PRK01": ["ipoh", "perak", "manjung", "kinta"],
    "SGR01": ["selangor", "shah alam", "kajang", "klang", "petaling"],
    "KUL01": ["kuala lumpur", "wp kl"],
    "SBH01": ["sabah", "kota kinabalu"],
    "TRG01": ["terengganu"],
    "KEL01": ["kelantan"],
};

const zoneKeywords = [];
for (const [zone, arr] of Object.entries(ZONE_MAP)) {
    arr.forEach(k => zoneKeywords.push({ zone, key: k.toLowerCase() }));
}



/* ------------------ REVERSE GEO ------------------ */
async function reverseGeocode(lat, lon) {
    try {
        const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`
        );
        const j = await res.json();
        return Object.values(j.address || {})
            .join(", ")
            .toLowerCase();
    } catch (e) {
        return "";
    }
}



/* ------------------ IP GEO ------------------ */
async function ipGeolocate() {
    try {
        const res = await fetch("https://ipapi.co/json/");
        const j = await res.json();
        return [j.city, j.region, j.country_name]
            .filter(Boolean)
            .join(", ")
            .toLowerCase();
    } catch (e) {
        return "";
    }
}



/* ------------------ FIND ZONE ------------------ */
function determineZone(place) {
    if (!place) return null;
    for (const z of zoneKeywords) {
        if (place.includes(z.key)) return z.zone;
    }
    return null;
}



/* ------------------ DETECT ZONE ------------------ */
async function detectZoneAndLoad() {
    setText("zoneName", "Mengesan lokasi...");

    let place = "";

    if (navigator.geolocation) {
        try {
            const pos = await new Promise((ok, fail) =>
                navigator.geolocation.getCurrentPosition(ok, fail, { timeout: 7000 })
            );
            place = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
        } catch {
            place = await ipGeolocate();
        }
    } else {
        place = await ipGeolocate();
    }

    const found = determineZone(place);
    if (found) zoneCode = found;

    setText("zoneName", `${zoneCode} - ${place || "Lokasi tidak dikesan"}`);

    await loadPrayerTimesForZone(zoneCode);
}



/* ------------------ LOAD PRAYER TIMES ------------------ */
async function loadPrayerTimesForZone(Z) {
    const url = `https://www.e-solat.gov.my/index.php?r=esolatApi/takwimsolat&period=month&zone=${Z}`;
    const res = await fetch(url);
    const data = await res.json();
    const list = data.prayerTime || [];

    const today = new Date();
    const dd = String(today.getDate()).padStart(2, "0");
    const yyyy = today.getFullYear();
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

    const d1 = `${dd}-${months[today.getMonth()]}-${yyyy}`;
    const d2 = `${dd}-${months[today.getMonth()].toUpperCase()}-${yyyy}`;

    let row = list.find(x => x.date === d1 || x.date === d2);
    if (!row) row = list[list.length - 1];

    function to4(t) {
        return (t || "0000").toString().padStart(4, "0");
    }

    prayerTimes = {
        Ismak: to4(row.imsak),
        Subuh: to4(row.fajr),
        Syuruk: to4(row.syuruk),
        Zohor: to4(row.dhuhr),
        Asar: to4(row.asr),
        Maghrib: to4(row.maghrib),
        Isyak: to4(row.isha),
    };

    function fmt(t) {
        t = t.padStart(4, "0");
        let h = +t.substr(0, 2);
        let m = t.substr(2);
        const ampm = h >= 12 ? "PM" : "AM";
        const h12 = h % 12 || 12;
        return `${h12}:${m} ${ampm}`;
    }

    setText("ismakTime", fmt(prayerTimes.Ismak));
    setText("subuhTime", fmt(prayerTimes.Subuh));
    setText("syurukTime", fmt(prayerTimes.Syuruk));
    setText("zohorTime", fmt(prayerTimes.Zohor));
    setText("asarTime", fmt(prayerTimes.Asar));
    setText("maghribTime", fmt(prayerTimes.Maghrib));
    setText("isyakTime", fmt(prayerTimes.Isyak));

    determineNextPrayer();
    updateCurrentPrayerCard();
    updateHighlight();
}



/* ------------------ NEXT PRAYER ------------------ */
function determineNextPrayer() {
    const now = new Date();
    let found = null;

    for (const [name, t] of Object.entries(prayerTimes)) {
        const h = +t.substr(0, 2);
        const m = +t.substr(2);
        const dt = new Date();
        dt.setHours(h, m, 0, 0);

        if (dt > now) {
            found = { name, dt };
            break;
        }
    }

    if (!found) {
        const t = prayerTimes.Subuh;
        const h = +t.substr(0, 2);
        const m = +t.substr(2);
        const dt = new Date();
        dt.setDate(dt.getDate() + 1);
        dt.setHours(h, m, 0, 0);
        found = { name: "Subuh", dt };
    }

    nextPrayerTime = found.dt;
    setText("nextPrayerNameLarge", found.name);
}



/* ------------------ COUNTDOWN ------------------ */
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

    setText("cdHour", String(h).padStart(2, "0"));
    setText("cdMin", String(m).padStart(2, "0"));
    setText("cdSec", String(s).padStart(2, "0"));
}, 1000);



/* ------------------ CLOCK ------------------ */
function updateClock() {
    const now = new Date();
    let h = now.getHours();
    let m = String(now.getMinutes()).padStart(2, "0");
    let s = String(now.getSeconds()).padStart(2, "0");
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    setText("currentTime", `${h12}:${m}:${s} ${ampm}`);

    updateCurrentPrayerCard();
    updateHighlight();
}
setInterval(updateClock, 1000);
updateClock();



/* ------------------ HIGHLIGHT CURRENT PRAYER ------------------ */
function updateHighlight() {
    const now = new Date();
    let active = "Isyak";

    for (const [name, t] of Object.entries(prayerTimes)) {
        const h = +t.substr(0, 2);
        const m = +t.substr(2);
        const dt = new Date();
        dt.setHours(h, m, 0, 0);
        if (dt <= now) active = name;
    }

    document.querySelectorAll(".prayer-row").forEach(x => x.classList.remove("currentPrayer"));
    const el = document.getElementById("card" + active);
    if (el) el.classList.add("currentPrayer");
}



/* ------------------ CURRENT PRAYER CARD ------------------ */
function updateCurrentPrayerCard() {
    const now = new Date();
    let active = "Isyak";

    for (const [name, t] of Object.entries(prayerTimes)) {
        const h = +t.substr(0, 2);
        const m = +t.substr(2);
        const dt = new Date();
        dt.setHours(h, m, 0, 0);
        if (dt <= now) active = name;
    }

    function fmt(t) {
        t = t.padStart(4, "0");
        let h = +t.substr(0, 2);
        let m = t.substr(2);
        const ampm = h >= 12 ? "PM" : "AM";
        const h12 = h % 12 || 12;
        return `${h12}:${m} ${ampm}`;
    }

    setText("currentPrayerName", active);
    setText("currentPrayerTime", fmt(prayerTimes[active]));
}



/* =================================================================================
   INIT
================================================================================= */

(async function init() {
    await setAutoDates();
    autoDetectMode();
    enforcePortrait();
    scaleToFit();
    await detectZoneAndLoad();
})();
