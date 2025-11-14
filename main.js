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

    const url =
      `https://www.e-solat.gov.my/index.php?r=esolatApi/takwimsolat&period=month&zone=${ZONE}`;

    const res = await fetch(url);
    const data = await res.json();

    const today = new Date();
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

    // FIX: JAKIM uses uppercase month names
    const esDate =
      `${String(today.getDate()).padStart(2,'0')}-${months[today.getMonth()].toUpperCase()}-${today.getFullYear()}`;

    const todayEntry = data.prayerTime.find(p => p.date === esDate);
    if (!todayEntry) return;

    prayerTimes = {
        Ismak: todayEntry.imsak,
        Subuh: todayEntry.fajr,
        Syuruk: todayEntry.syuruk,
        Zohor: todayEntry.dhuhr,
        Asar: todayEntry.asr,
        Maghrib: todayEntry.maghrib,
        Isyak: todayEntry.isha
    };

    // Fill UI times
    document.getElementById("ismakTime").innerText = format(prayerTimes.Ismak);
    document.getElementById("subuhTime").innerText = format(prayerTimes.Subuh);
    document.getElementById("syurukTime").innerText = format(prayerTimes.Syuruk);
    document.getElementById("zohorTime").innerText = format(prayerTimes.Zohor);
    document.getElementById("asarTime").innerText = format(prayerTimes.Asar);
    document.getElementById("maghribTime").innerText = format(prayerTimes.Maghrib);
    document.getElementById("isyakTime").innerText = format(prayerTimes.Isyak);

    determineNextPrayer();
    updateHighlight();
}
loadPrayerTimes();


/* ============================
   FORMAT 12H TIME
============================ */
function format(t) {
    let [h, m] = t.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    h = (h % 12) || 12;
    return `${h}:${String(m).padStart(2,'0')} ${ampm}`;
}


/* ============================
   DETERMINE NEXT PRAYER
============================ */
function determineNextPrayer() {
    const now = new Date();

    document.getElementById("nextLabel").innerText = "Waktu Solat Seterusnya";

    const list = Object.entries(prayerTimes);

    for (let [name, time] of list) {
        const [h, m] = time.split(":").map(Number);
        const t = new Date();
        t.setHours(h, m, 0, 0);

        if (t > now) {
            nextPrayerTime = t;
            document.getElementById("nextPrayerName").innerText = name;
            return;
        }
    }

    // After Isyak → Next day Subuh
    let tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [h, m] = prayerTimes.Subuh.split(":").map(Number);
    tomorrow.setHours(h, m, 0, 0);

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

    let h = Math.floor(diff / (1000 * 60 * 60));
    let m = Math.floor((diff / 1000 / 60) % 60);
    let s = Math.floor((diff / 1000) % 60);

    document.getElementById("cdHour").innerText = h.toString().padStart(2, "0");
    document.getElementById("cdMin").innerText = m.toString().padStart(2, "0");
    document.getElementById("cdSec").innerText = s.toString().padStart(2, "0");

}, 1000);


/* ============================
   CLOCK + HIGHLIGHT
============================ */
function updateClock() {
    const now = new Date();
    let h = now.getHours();
    let m = now.getMinutes().toString().padStart(2, "0");
    let s = now.getSeconds().toString().padStart(2, "0");
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = (h % 12) || 12;

    document.getElementById("currentTime").innerText =
        `${h12}:${m}:${s} ${ampm}`;

    updateHighlight();
}
setInterval(updateClock, 1000);
updateClock();


/* ============================
   HIGHLIGHT CURRENT PRAYER
============================ */
function updateHighlight() {
    const now = new Date();
    let active = "Isyak"; // default

    for (const [name, time] of Object.entries(prayerTimes)) {
        const [h, m] = time.split(":").map(Number);
        const t = new Date();
        t.setHours(h, m, 0, 0);

        if (t <= now) active = name;
    }

    // Clear previous
    document.querySelectorAll(".prayer-row")
        .forEach(c => c.classList.remove("currentPrayer"));

    // Highlight active
    const activeCard = document.getElementById("card" + active);
    if (activeCard) activeCard.classList.add("currentPrayer");

    // Also update the BIG CURRENT PRAYER CARD
    document.getElementById("currentPrayerName").innerText = active;
    document.getElementById("currentPrayerTime").innerText =
        format(prayerTimes[active]);
}
