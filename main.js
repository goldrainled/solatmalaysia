// ===============================
// CONFIGURATION
// ===============================
const ZONE = "JHR02";   // Kota Tinggi
let prayerTimes = {};
let nextPrayerName = "";
let nextPrayerTime = null;


// ===============================
// 1. Get Today’s Prayer Times
// ===============================
async function loadPrayerTimes() {
    try {
        const url = `https://api.waktusolat.app/v2/solat/${ZONE}`;
        const res = await fetch(url);
        const data = await res.json();

        prayerTimes = data.prayers; // e.g. prayers.subuh, prayers.zohor, ...

        document.getElementById("syurukTime").innerText =
            formatToAMPM(prayerTimes.syuruk);

        determineNextPrayer();  
    }
    catch (err) {
        console.error("Failed to load API:", err);
    }
}

loadPrayerTimes();
setInterval(loadPrayerTimes, 60 * 60 * 1000); // refresh every 1 hour



// ===============================
// 2. Format 24h time → 12h AM/PM
// ===============================
function formatToAMPM(timeStr) {
    if (!timeStr) return "--:--";

    let [h, m] = timeStr.split(":").map(Number);
    let suffix = h >= 12 ? "PM" : "AM";
    h = (h % 12) || 12;

    return `${h}:${m.toString().padStart(2, "0")} ${suffix}`;
}



// ===============================
// 3. Determine Next Solat
// ===============================
function determineNextPrayer() {
    const now = new Date();

    const schedule = [
        { name: "Subuh",    time: prayerTimes.subuh },
        { name: "Syuruk",   time: prayerTimes.syuruk },
        { name: "Zohor",    time: prayerTimes.zohor },
        { name: "Asar",     time: prayerTimes.asar },
        { name: "Maghrib",  time: prayerTimes.maghrib },
        { name: "Isyak",    time: prayerTimes.isyak }
    ];

    for (let p of schedule) {
        if (!p.time) continue;

        let [h, m] = p.time.split(":").map(Number);
        let target = new Date();
        target.setHours(h, m, 0, 0);

        if (target > now) {
            nextPrayerName = p.name;
            nextPrayerTime = target;
            highlightPrayerButton(p.name);
            return;
        }
    }

    // If all solat passed → next is tomorrow Subuh
    let [h, m] = prayerTimes.subuh.split(":").map(Number);
    let tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(h, m, 0, 0);

    nextPrayerName = "Subuh";
    nextPrayerTime = tomorrow;
}



// ===============================
// 4. Highlight Active Button
// ===============================
function highlightPrayerButton(name) {
    const btns = document.querySelectorAll(".selector button");
    btns.forEach(btn => btn.classList.remove("active"));

    if (name === "Zohor") document.getElementById("btnZohor").classList.add("active");
    if (name === "Asar") document.getElementById("btnAsar").classList.add("active");
    if (name === "Maghrib") document.getElementById("btnMaghrib").classList.add("active");
}



// ===============================
// 5. Countdown to Next Prayer
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
    let m = Math.floor((diff / (1000 * 60)) % 60);
    let s = Math.floor((diff / 1000) % 60);

    document.getElementById("cdHour").innerText = h.toString().padStart(2, "0");
    document.getElementById("cdMin").innerText = m.toString().padStart(2, "0");
    document.getElementById("cdSec").innerText = s.toString().padStart(2, "0");
}

setInterval(updateCountdown, 1000);



// ===============================
// 6. Update Current Time Display
// ===============================
function updateCurrentTime() {
    let now = new Date();
    let h = now.getHours();
    let m = now.getMinutes().toString().padStart(2, "0");
    let s = now.getSeconds().toString().padStart(2, "0");

    let suffix = h >= 12 ? "PM" : "AM";
    h = (h % 12) || 12;

    document.getElementById("currentTime").textContent =
        `${h}:${m}:${s} ${suffix}`;
}

setInterval(updateCurrentTime, 1000);
updateCurrentTime();
