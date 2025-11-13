// ===============================
// CONFIG
// ===============================
const ZONE = "JHR02";
let prayerTimes = {};
let nextPrayerName = "";
let nextPrayerTime = null;

// ===============================
// 1. GET TODAY PRAYER TIME FROM e-SOLAT (MONTH ENDPOINT)
// ===============================
async function loadPrayerTimes() {
    try {
        const url = `https://www.e-solat.gov.my/index.php?r=esolatApi/takwimsolat&period=month&zone=${ZONE}`;
        const res = await fetch(url);
        const data = await res.json();

        console.log("API DATA:", data);

        if (!data.prayerTime) {
            console.error("No prayerTime array found.");
            return;
        }

        // Today's date formatting for e-Solat ("13-Nov-2024")
        const today = new Date();
        const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
        const esDate = `${today.getDate().toString().padStart(2,"0")}-${months[today.getMonth()]}-${today.getFullYear()}`;

        console.log("Searching date:", esDate);

        const todayEntry = data.prayerTime.find(p => p.date === esDate);

        if (!todayEntry) {
            console.warn("No prayer times found for today.");
            return;
        }

        // Map to easier names
        prayerTimes = {
            subuh: todayEntry.fajr,
            syuruk: todayEntry.syuruk,
            zohor: todayEntry.dhuhr,
            asar: todayEntry.asr,
            maghrib: todayEntry.maghrib,
            isyak: todayEntry.isha
        };

        console.log("Today's times:", prayerTimes);

        document.getElementById("ismakTime").innerText = formatToAMPM(prayerTimes.ismak);
        document.getElementById("subuhTime").innerText   = formatToAMPM(prayerTimes.subuh);
        document.getElementById("syurukTime").innerText  = formatToAMPM(prayerTimes.syuruk);
        document.getElementById("zohorTime").innerText   = formatToAMPM(prayerTimes.zohor);
        document.getElementById("asarTime").innerText    = formatToAMPM(prayerTimes.asar);
        document.getElementById("maghribTime").innerText = formatToAMPM(prayerTimes.maghrib);
        document.getElementById("isyakTime").innerText   = formatToAMPM(prayerTimes.isyak);


        determineNextPrayer();
    }
    catch (err) {
        console.error("API ERROR:", err);
    }
}

loadPrayerTimes();
setInterval(loadPrayerTimes, 60 * 60 * 1000);


// ===============================
// 2. FORMAT 24H → 12H
// ===============================
function formatToAMPM(t) {
    if (!t) return "--:--";
    let [h, m, s] = t.split(":").map(Number);
    let ampm = h >= 12 ? "PM" : "AM";
    h = (h % 12) || 12;
    return `${h}:${m.toString().padStart(2,"0")} ${ampm}`;
}


// ===============================
// 3. DETERMINE NEXT PRAYER
// ===============================
function determineNextPrayer() {
    const now = new Date();

    const schedule = [
        { name: "Ismak", time: prayerTimes.ismak },
        { name: "Subuh", time: prayerTimes.subuh },
        { name: "Syuruk", time: prayerTimes.syuruk },
        { name: "Zohor", time: prayerTimes.zohor },
        { name: "Asar", time: prayerTimes.asar },
        { name: "Maghrib", time: prayerTimes.maghrib },
        { name: "Isyak", time: prayerTimes.isyak }
    ];

    for (let p of schedule) {
        if (!p.time) continue;
        
        let [h, m] = p.time.split(":");
        let target = new Date();
        target.setHours(h, m, 0, 0);

        if (target > now) {
            nextPrayerName = p.name;
            nextPrayerTime = target;
            document.getElementById("nextPrayerName").innerText = p.name;
            highlightPrayerButton(p.name);
            return;
        }
    }
}


// ===============================
// 4. HIGHLIGHT BUTTON
// ===============================
function highlightPrayerButton(name) {
    document.querySelectorAll(".selector button")
        .forEach(btn => btn.classList.remove("active"));

    if (name === "Zohor") document.getElementById("btnZohor").classList.add("active");
    if (name === "Asar") document.getElementById("btnAsar").classList.add("active");
    if (name === "Maghrib") document.getElementById("btnMaghrib").classList.add("active");
}


// ===============================
// 5. COUNTDOWN
// ===============================
function updateCountdown() {
    if (!nextPrayerTime) return;

    let now = new Date();
    let diff = nextPrayerTime - now;

    if (diff < 0) {
        determineNextPrayer();
        return;
    }

    let h = Math.floor(diff / (1000 * 60 * 60));
    let m = Math.floor((diff / 1000 / 60) % 60);
    let s = Math.floor((diff / 1000) % 60);

    document.getElementById("cdHour").innerText = h.toString().padStart(2,"0");
    document.getElementById("cdMin").innerText = m.toString().padStart(2,"0");
    document.getElementById("cdSec").innerText = s.toString().padStart(2,"0");
}

setInterval(updateCountdown, 1000);


// ===============================
// 6. LIVE CLOCK
// ===============================
function updateCurrentTime() {
    let now = new Date();

    let h = now.getHours();
    let m = now.getMinutes().toString().padStart(2,"0");
    let s = now.getSeconds().toString().padStart(2,"0");

    let ampm = h >= 12 ? "PM" : "AM";
    h = (h % 12) || 12;

    document.getElementById("currentTime").innerText =
        `${h}:${m}:${s} ${ampm}`;
}

setInterval(updateCurrentTime, 1000);
updateCurrentTime();
