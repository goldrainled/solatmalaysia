// ===============================
// CONFIGURATION
// ===============================
const ZONE = "JHR02";   // Kota Tinggi
let prayerTimes = {};
let nextPrayerName = "";
let nextPrayerTime = null;


// ===============================
// 1. Get Today’s Prayer Times (JAKIM e-Solat API)
// ===============================
async function loadPrayerTimes() {
    try {
        const url = `https://www.e-solat.gov.my/index.php?r=esolatApi/takwimsolat&zone=${ZONE}&period=today`;
        const res = await fetch(url);
        const data = await res.json();

        console.log("API Result:", data);

        // eSolat returns prayerTime array
        if (!data.prayerTime || data.prayerTime.length === 0) {
            console.warn("No prayer times for today");
            document.getElementById("syurukTime").innerText = "--:--";
            return;
        }

        const today = data.prayerTime[0];

        // Map to your variable names
        prayerTimes = {
            subuh: today.fajr,
            syuruk: today.syuruk,
            zohor: today.dhuhr,
            asar: today.asr,
            maghrib: today.maghrib,
            isyak: today.isha
        };

        document.getElementById("syurukTime").innerText =
            formatToAMPM(prayerTimes.syuruk);

        determineNextPrayer();
    }
    catch (err) {
        console.error("Failed to load API:", err);
    }
}

loadPrayerTimes();
setInterval(loadPrayerTimes, 60 * 60 * 1000); // refresh every hour



// ===============================
// 2. Convert 24h → 12h AM/PM
// ===============================
function formatToAMPM(timeStr) {
    if (!timeStr) return "--:--";

    let [h, m, s] = timeStr.split(":").map(Number);
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

        let [h, m, s] = p.time.split(":").map(Number);
        let target = new Date();
        target.setHours(h, m, 0, 0);

        if (target > now) {
            nextPrayerName = p.name;
            nextPrayerTime = target;
            highlightPrayerButton(p.name);
            return;
        }
    }

    // If all passed → next Subuh tomorrow
    let [h, m] = prayerTimes.subuh.split(":").map(Number);
    let tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(h, m, 0, 0);

    nextPrayerName = "Subuh";
    nextPrayerTime = tomorrow;
}



// ===============================
// 4. Highlight Active Solat Button
// ===============================
function highlightPrayerButton(name) {
    const btns = document.querySelectorAll(".selector button");
    btns.forEach(btn => btn.classList.remove("active"));

    if (name === "Zohor") document.getElementById("btnZohor").classList.add("active");
    if (name === "Asar") document.getElementById("btnAsar").classList.add("active");
    if (name === "Maghrib") document.getElementById("btnMaghrib").classList.add("active");
}



// ===============================
// 5. Countdown to Next Solat
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

setInterval(updateCountd
