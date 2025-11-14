/* ============================
   CONFIG
============================ */
const ZONE = "JHR02";
let prayerTimes = {};
let nextPrayerTime = null;

/* ============================
   LOAD TODAY'S PRAYER TIMES
============================ */
async function loadPrayerTimes() {
    try {
        const url =
          `https://www.e-solat.gov.my/index.php?r=esolatApi/takwimsolat&period=month&zone=${ZONE}`;

        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to fetch prayer times");
        const data = await res.json();

        const today = new Date();
        const months = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
        const esDate =
          `${String(today.getDate()).padStart(2,'0')}-${months[today.getMonth()]}-${today.getFullYear()}`;

        console.log("Looking for date:", esDate);
        const todayEntry = (data.prayerTime || []).find(p => (p.date||"").toString().trim() === esDate);
        if (!todayEntry) {
            console.warn("No prayer data for today:", esDate, data.prayerTime && data.prayerTime.slice(0,3));
            return;
        }

        // Normalize and trim times
        function norm(t){ return (t||"").toString().trim().padStart(4,"0"); }

        prayerTimes = {
            Ismak: norm(todayEntry.imsak),
            Subuh: norm(todayEntry.fajr),
            Syuruk: norm(todayEntry.syuruk),
            Zohor: norm(todayEntry.dhuhr),
            Asar: norm(todayEntry.asr),
            Maghrib: norm(todayEntry.maghrib),
            Isyak: norm(todayEntry.isha)
        };

        // Update UI times (safe guards)
        const safeSet = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.innerText = val ? format(val) : "--:--";
        };

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
        console.error("loadPrayerTimes error:", err);
    }
}
loadPrayerTimes();

/* ============================
   FORMAT 12H TIME
============================ */
function format(t) {
    if (!t) return "--:--";
    let [h, m] = t.split(":").map(x => Number((x||"").toString().trim() || 0));
    if (Number.isNaN(h)) h = 0;
    if (Number.isNaN(m)) m = 0;
    const ampm = h >= 12 ? "PM" : "AM";
    h = (h % 12) || 12;
    return `${h}:${String(m).padStart(2, "0")} ${ampm}`;
}

/* ============================
   DETERMINE NEXT PRAYER
============================ */
function determineNextPrayer() {
    if (!Object.keys(prayerTimes).length) return;
    const now = new Date();
    const list = Object.entries(prayerTimes);

    document.getElementById("nextLabel").innerText = "Waktu Solat Seterusnya";

    for (let [name, time] of list) {
        if (!time) continue;
        const [h, m] = time.split(":").map(Number);
        const t = new Date();
        t.setHours(h || 0, m || 0, 0, 0);
        if (t > now) {
            nextPrayerTime = t;
            document.getElementById("nextPrayerName").innerText = name;
            return;
        }
    }

    // After Isyak → Tomorrow Subuh
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const [h, m] = (prayerTimes.Subuh || "05:00").split(":").map(Number);
    tomorrow.setHours(h||5, m||0, 0, 0);

    nextPrayerTime = tomorrow;
    document.getElementById("nextLabel").innerText = "Waktu Solat Seterusnya (Esok)";
    document.getElementById("nextPrayerName").innerText = "Subuh";
}

/* ============================
   COUNTDOWN
============================ */
setInterval(() => {
    if (!nextPrayerTime) return;
    const now = new Date();
    let diff = nextPrayerTime - now;
    if (diff <= 0) {
        determineNextPrayer();
        return;
    }
    const h = Math.floor(diff / (1000 * 60 * 60));
    const m = Math.floor((diff / 1000 / 60) % 60);
    const s = Math.floor((diff / 1000) % 60);
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.innerText = String(v).padStart(2,"0"); };
    set("cdHour", h);
    set("cdMin", m);
    set("cdSec", s);
}, 1000);

/* ============================
   CLOCK (RUN EVERY SECOND)
============================ */
function updateClock() {
    const now = new Date();
    let h = now.getHours();
    let m = now.getMinutes().toString().padStart(2, "0");
    let s = now.getSeconds().toString().padStart(2, "0");
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = (h % 12) || 12;
    const el = document.getElementById("currentTime");
    if (el) el.innerText = `${h12}:${m}:${s} ${ampm}`;
    updateHighlight();
    updateCurrentPrayerCard();
}
setInterval(updateClock, 1000);
updateClock();

/* ============================
   CURRENT PRAYER (TOP CARD)
============================ */
function updateCurrentPrayerCard() {
    if (!Object.keys(prayerTimes).length) return;
    const now = new Date();
    let active = "Isyak";
    for (let [name, time] of Object.entries(prayerTimes)) {
        if (!time) continue;
        const [h, m] = time.split(":").map(Number);
        const t = new Date();
        t.setHours(h || 0, m || 0, 0, 0);
        if (t <= now) active = name;
    }
    const nameEl = document.getElementById("currentPrayerName");
    const timeEl = document.getElementById("currentPrayerTime");
    if (nameEl) nameEl.innerText = active;
    if (timeEl) timeEl.innerText = format(prayerTimes[active]);
}

/* ============================
   HIGHLIGHT CURRENT PRAYER LIST
============================ */
function updateHighlight() {
    if (!Object.keys(prayerTimes).length) return;
    const now = new Date();
    let active = "Isyak";
    for (let [name, time] of Object.entries(prayerTimes)) {
        if (!time) continue;
        const [h, m] = time.split(":").map(Number);
        const t = new Date();
        t.setHours(h || 0, m || 0, 0, 0);
        if (t <= now) active = name;
    }
    document.querySelectorAll(".prayer-row").forEach(c => c.classList.remove("currentPrayer"));
    const activeCard = document.getElementById("card" + active);
    if (activeCard) activeCard.classList.add("currentPrayer");
}
