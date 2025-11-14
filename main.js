/* ============================
   CONFIG
============================ */
const ZONE = "JHR02";
let prayerTimes = {};        // { Ismak: "05:27", Subuh: "05:37", ... }
let nextPrayerTime = null;   // Date object
let nextPrayerName = "--";

/* ============================
   UTIL — format times & date
============================ */
function formatTo12h(t) {
    if (!t) return "--:--";
    // expect "HH:MM" or "HH:MM:SS"
    const parts = t.split(":").map(Number);
    let h = parts[0] ?? 0;
    let m = parts[1] ?? 0;
    const ampm = h >= 12 ? "AM" : "AM"; // user previously uses AM/PM but e-Solat returns 24h
    // We'll compute real AM/PM below
    const ampm2 = h >= 12 ? "PM" : "AM";
    let h12 = (h % 12) || 12;
    return `${h12}:${String(m).padStart(2, "0")} ${ampm2}`;
}

function formatDateLong(d) {
    const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

/* ============================
   LOAD PRAYER TIMES (e-Solat month endpoint)
============================ */
async function loadPrayerTimes() {
    try {
        const url = `https://www.e-solat.gov.my/index.php?r=esolatApi/takwimsolat&period=month&zone=${ZONE}`;
        const res = await fetch(url);
        const data = await res.json();

        if (!data || !data.prayerTime || !Array.isArray(data.prayerTime)) {
            console.warn("e-Solat returned unexpected data:", data);
            return;
        }

        // Prepare today's date string e-Solat uses (e.g. "14-Nov-2025")
        const today = new Date();
        document.getElementById("todayDate").innerText = formatDateLong(today);

        const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
        const esDate = `${String(today.getDate()).padStart(2,'0')}-${months[today.getMonth()]}-${today.getFullYear()}`;

        const todayEntry = data.prayerTime.find(p => p.date === esDate);
        if (!todayEntry) {
            console.warn("No prayer times found for today:", esDate);
            return;
        }

        // Map times (expect "HH:MM" or "HH:MM:SS")
        prayerTimes = {
            Ismak: todayEntry.imsak,
            Subuh: todayEntry.fajr,
            Syuruk: todayEntry.syuruk,
            Zohor: todayEntry.dhuhr,
            Asar: todayEntry.asr,
            Maghrib: todayEntry.maghrib,
            Isyak: todayEntry.isha
        };

        // Update UI times (12h format)
        const idMap = {
            Ismak: "ismakTime",
            Subuh: "subuhTime",
            Syuruk: "syurukTime",
            Zohor: "zohorTime",
            Asar: "asarTime",
            Maghrib: "maghribTime",
            Isyak: "isyakTime"
        };

        for (const [name, id] of Object.entries(idMap)) {
            const el = document.getElementById(id);
            if (el) el.innerText = formatTo12h(prayerTimes[name]);
        }

        // After loading times, determine next prayer & highlight
        determineNextPrayer();
        highlightCurrentPrayer();
    }
    catch (err) {
        console.error("Error loading prayer times:", err);
    }
}

// initial load + hourly refresh (keeps times up-to-date)
loadPrayerTimes();
setInterval(loadPrayerTimes, 60 * 60 * 1000);


/* ============================
   DETERMINE NEXT PRAYER (today or tomorrow Subuh)
   Sets nextPrayerTime (Date) and updates UI label/name
============================ */
function determineNextPrayer() {
    if (!prayerTimes || Object.keys(prayerTimes).length === 0) return;

    const now = new Date();
    // Reset default label to "Menuju"
    const nextLabelEl = document.getElementById("nextLabel");
    if (nextLabelEl) nextLabelEl.innerText = "Menuju";

    const ordered = ["Ismak","Subuh","Syuruk","Zohor","Asar","Maghrib","Isyak"];

    // Try to find next prayer today
    for (const name of ordered) {
        const timeStr = prayerTimes[name];
        if (!timeStr) continue;
        const [hh, mm] = timeStr.split(":").map(Number);
        const t = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm, 0, 0);
        if (t > now) {
            nextPrayerTime = t;
            nextPrayerName = name;
            // update UI
            const npEl = document.getElementById("nextPrayerName");
            if (npEl) npEl.innerText = name;
            return;
        }
    }

    // If we reach here, all today's times are passed → next is tomorrow Subuh
    // Calculate tomorrow date & use Subuh time
    const subuhStr = prayerTimes.Subuh;
    if (!subuhStr) {
        console.warn("No Subuh time available for tomorrow fallback.");
        return;
    }
    const [subuhH, subuhM] = subuhStr.split(":").map(Number);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(subuhH, subuhM, 0, 0);

    nextPrayerTime = tomorrow;
    nextPrayerName = "Subuh";

    // update UI: show Menuju (Esok)
    if (nextLabelEl) nextLabelEl.innerText = "Menuju (Esok)";
    const npEl = document.getElementById("nextPrayerName");
    if (npEl) npEl.innerText = "Subuh";
}


/* ============================
   COUNTDOWN — updates every second
   When countdown reaches zero, call determineNextPrayer() and continue.
============================ */
function updateCountdownNow() {
    if (!nextPrayerTime) {
        // no next prayer set yet
        document.getElementById("cdHour").innerText = "00";
        document.getElementById("cdMin").innerText = "00";
        document.getElementById("cdSec").innerText = "00";
        return;
    }

    const now = new Date();
    let diff = nextPrayerTime - now;

    if (diff <= 0) {
        // time reached — move to next prayer (do not reload full day immediately)
        determineNextPrayer();
        return;
    }

    const hh = Math.floor(diff / (1000 * 60 * 60));
    const mm = Math.floor((diff / (1000 * 60)) % 60);
    const ss = Math.floor((diff / 1000) % 60);

    document.getElementById("cdHour").innerText = String(hh).padStart(2,"0");
    document.getElementById("cdMin").innerText = String(mm).padStart(2,"0");
    document.getElementById("cdSec").innerText = String(ss).padStart(2,"0");
}

setInterval(updateCountdownNow, 1000);
updateCountdownNow();


/* ============================
   LIVE CLOCK & helper to trigger highlight
============================ */
function updateClock() {
    const now = new Date();
    let h = now.getHours();
    let m = now.getMinutes();
    let s = now.getSeconds();
    let h12 = (h % 12) || 12;
    const ampm = h >= 12 ? "PM" : "AM";
    const display = `${h12}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")} ${ampm}`;
    const el = document.getElementById("currentTime");
    if (el) el.innerText = display;

    // update countdown and highlight continuously
    updateCountdownNow();
    highlightCurrentPrayer();
}
setInterval(updateClock, 1000);
updateClock();


/* ============================
   Highlight current prayer card
   - determines which prayer was most-recent (<= now)
   - highlights that card id="card<Name>"
============================ */
function highlightCurrentPrayer() {
    if (!prayerTimes || Object.keys(prayerTimes).length === 0) return;

    const now = new Date();
    const ordered = ["Ismak","Subuh","Syuruk","Zohor","Asar","Maghrib","Isyak"];
    let active = "Isyak"; // default

    for (const name of ordered) {
        const tstr = prayerTimes[name];
        if (!tstr) continue;
        const [hh, mm] = tstr.split(":").map(Number);
        const t = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm, 0, 0);
        if (t <= now) active = name;
    }

    // remove existing highlights
    document.querySelectorAll(".card").forEach(c => c.classList.remove("currentPrayer"));

    const activeCard = document.getElementById("card" + active);
    if (activeCard) activeCard.classList.add("currentPrayer");
}

/* ============================
   Safety / initial guard
============================ */
// If the page opened before loadPrayerTimes finished, attempt again after short delay
setTimeout(() => {
    if (!prayerTimes || Object.keys(prayerTimes).length === 0) {
        loadPrayerTimes();
    }
}, 2000);
