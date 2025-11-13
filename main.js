// ===============================
// CONFIG
// ===============================
const ZONE = "JHR02"; // Kota Tinggi
let prayerTimes = {};
let nextPrayerName = "";
let nextPrayerTime = null;

// ===============================
// 1. GET TODAY’S PRAYER TIME
// ===============================
async function loadPrayerTimes() {
    try {
        const url = `https://api.waktusolat.app/v2/solat/today?zone=${ZONE}`;
        const res = await fetch(url);
        const data = await res.json();

        console.log("API DATA:", data);

        // prayers object
        prayerTimes = data.prayers;

        // Write Syuruk
        document.getElementById("syurukTime").innerText =
            formatToAMPM(prayerTimes.syuruk);

        determineNextPrayer();

    } catch (err) {
        console.error("API ERROR:", err);
    }
}

loadPrayerTimes();
setInterval(loadPrayerTimes, 60 * 60 * 1000); // refresh every hour


// ===============================
// 2. FORMAT 24H → 12H
// ===============================
function formatToAMPM(t) {
    let [h, m] = t.split(":").map(Number);
    let ampm = h >= 12 ? "PM" : "AM";
    h = (h % 12) || 12;
    return `${h}:${m.toString().padStart(2, "0")} ${ampm}`;
}


// ===============================
// 3. DETERMINE NEXT PRAYER
// ===============================
function determineNextPrayer() {

    const now = new Date();

    const schedule = [
        { name: "Subuh", time: prayerTimes.subuh },
        { name: "Syuruk", time: prayerTimes.syuruk },
        { name: "Zohor", time: prayerTimes.zohor },
        { name: "Asar", time: prayerTimes.asar },
        { name: "Maghrib", time: prayerTimes.maghrib },
        { name: "Isyak", time: prayerTimes.isyak }
    ];

    for (let p of schedule) {
        let [h, m] = p.time.split(":");
        let target = new Date();
        target.setHours(h, m, 0, 0);

        if (target > now) {
            nextPrayerName = p.name;
            nextPrayerTime = target;
            highlightPrayerButton(p.name);
            document.getElementById("nextPrayerName").innerText = p.name;
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

    document.getElementById("cdHour").innerText = h.toString().padStart(2, "0");
    document.getElementById("cdMin").innerText = m.toString().padStart(2, "0");
    document.getElementById("cdSec").innerText = s.toString().padStart(2, "0");
}

setInterval(updateCountdown, 1000);


// ===============================
// 6. LIVE CLOCK
// ===============================
function updateCurrentTime() {
    let now = new Date();
    let hh = now.getHours();
    let mm = now.getMinutes().toString().padStart(2, "0");
    let ss = now.getSeconds().toString().padStart(2, "0");

    let ampm = hh >= 12 ? "PM" : "AM";
    hh = (hh % 12) || 12;

    document.getElementById("currentTime").innerText =
        `${hh}:${mm}:${ss} ${ampm}`;
}

setInterval(updateCurrentTime, 1000);
updateCurrentTime();
