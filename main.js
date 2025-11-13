// ===============================
// CONFIG
// ===============================
const ZONE = "JHR02";
let prayerTimes = {};
let nextPrayerName = "";
let nextPrayerTime = null;

// ===============================
// 1. GET TODAY PRAYER TIME FROM e-SOLAT
// ===============================
async function loadPrayerTimes() {
    try {
        const url = `https://www.e-solat.gov.my/index.php?r=esolatApi/takwimsolat&period=month&zone=${ZONE}`;
        const res = await fetch(url);
        const data = await res.json();

        if (!data.prayerTime) return;

        // Today's date for eSolat format
        const today = new Date();
        const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
        const esDate = `${String(today.getDate()).padStart(2,"0")}-${months[today.getMonth()]}-${today.getFullYear()}`;

        const todayEntry = data.prayerTime.find(p => p.date === esDate);
        if (!todayEntry) return;

        prayerTimes = {
            ismak: todayEntry.imsak,
            subuh: todayEntry.fajr,
            syuruk: todayEntry.syuruk,
            zohor: todayEntry.dhuhr,
            asar: todayEntry.asr,
            maghrib: todayEntry.maghrib,
            isyak: todayEntry.isha
        };

        document.getElementById("ismakTime").innerText = formatToAMPM(prayerTimes.ismak);
        document.getElementById("subuhTime").innerText = formatToAMPM(prayerTimes.subuh);
        document.getElementById("syurukTime").innerText = formatToAMPM(prayerTimes.syuruk);
        document.getElementById("zohorTime").innerText = formatToAMPM(prayerTimes.zohor);
        document.getElementById("asarTime").innerText = formatToAMPM(prayerTimes.asar);
        document.getElementById("maghribTime").innerText = formatToAMPM(prayerTimes.maghrib);
        document.getElementById("isyakTime").innerText = formatToAMPM(prayerTimes.isyak);

        determineNextPrayer();
        getCurrentPrayer(); // highlight immediately

    } catch (err) {
        console.error("API Error:", err);
    }
}

loadPrayerTimes();
setInterval(loadPrayerTimes, 60 * 60 * 1000);

// ===============================
// 2. FORMAT 24H → 12H
// ===============================
function formatToAMPM(t) {
    if (!t) return "--:--";
    let [h, m] = t.split(":").map(Number);
    let ampm = h >= 12 ? "PM" : "AM";
    h = (h % 12) || 12;
    return `${h}:${String(m).padStart(2,"0")} ${ampm}`;
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
        let [h, m] = p.time.split(":");
        let t = new Date();
        t.setHours(h, m, 0, 0);

        if (t > now) {
            nextPrayerName = p.name;
            nextPrayerTime = t;
            document.getElementById("nextPrayerName").innerText = p.name;
            return;
        }
    }
}

// ===============================
// 4. COUNTDOWN
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

    document.getElementById("cdHour").innerText = String(h).padStart(2,"0");
    document.getElementById("cdMin").innerText = String(m).padStart(2,"0");
    document.getElementById("cdSec").innerText = String(s).padStart(2,"0");
}

setInterval(updateCountdown, 1000);

// ===============================
// 5. LIVE CLOCK + HIGHLIGHT
// ===============================
function updateCurrentTime() {
    let now = new Date();

    let h = now.getHours();
    let m = String(now.getMinutes()).padStart(2,"0");
    let s = String(now.getSeconds()).padStart(2,"0");

    let ampm = h >= 12 ? "PM" : "AM";
    let h12 = (h % 12) || 12;

    document.getElementById("currentTime").innerText =
        `${h12}:${m}:${s} ${ampm}`;

    getCurrentPrayer(); // highlight every second
}

setInterval(updateCurrentTime, 1000);
updateCurrentTime();

// ===============================
// 6. HIGHLIGHT CURRENT PRAYER
// ===============================
function highlightCurrentPrayer(prayerName) {
    let cards = [
        "cardIsmak",
        "cardSubuh",
        "cardSyuruk",
        "cardZohor",
        "cardAsar",
        "cardMaghrib",
        "cardIsyak"
    ];

    cards.forEach(id => {
        document.getElementById(id).classList.remove("currentPrayer");
    });

    let id = "card" + prayerName;
    let card = document.getElementById(id);
    if (card) card.classList.add("currentPrayer");
}

function getCurrentPrayer() {
    const now = new Date();
    let active = "Isyak";

    const schedule = [
        { name: "Ismak",   time: prayerTimes.ismak },
        { name: "Subuh",   time: prayerTimes.subuh },
        { name: "Syuruk",  time: prayerTimes.syuruk },
        { name: "Zohor",   time: prayerTimes.zohor },
        { name: "Asar",    time: prayerTimes.asar },
        { name: "Maghrib", time: prayerTimes.maghrib },
        { name: "Isyak",   time: prayerTimes.isyak }
    ];

    for (let p of schedule) {
        let [h, m] = p.time.split(":").map(Number);
        let t = new Date();
        t.setHours(h, m, 0, 0);

        if (t <= now) active = p.name;
    }

    highlightCurrentPrayer(active);
}
