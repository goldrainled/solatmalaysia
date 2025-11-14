
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

    const url = `https://www.e-solat.gov.my/index.php?r=esolatApi/takwimsolat&period=month&zone=${ZONE}`;
    const res = await fetch(url);
    const data = await res.json();

    const today = new Date();
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const esDate = `${String(today.getDate()).padStart(2,'0')}-${months[today.getMonth()]}-${today.getFullYear()}`;

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

    document.getElementById("ismakTime").innerText = format(prayerTimes.Ismak);
    document.getElementById("subuhTime").innerText = format(prayerTimes.Subuh);
    document.getElementById("syurukTime").innerText = format(prayerTimes.Syuruk);
    document.getElementById("zohorTime").innerText = format(prayerTimes.Zohor);
    document.getElementById("asarTime").innerText = format(prayerTimes.Asar);
    document.getElementById("maghribTime").innerText = format(prayerTimes.Maghrib);
    document.getElementById("isyakTime").innerText = format(prayerTimes.Isyak);

    determineNextPrayer();
    highlightCurrentPrayer();
}
loadPrayerTimes();


/* ============================
   FORMAT 12H TIME
============================ */
function format(t) {
    let [h, m] = t.split(":").map(Number);
    let ampm = h >= 12 ? "PM" : "AM";
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
        let [h, m] = time.split(":");
        let t = new Date();
        t.setHours(h, m, 0, 0);

        if (t > now) {
            nextPrayerTime = t;
            document.getElementById("nextPrayerName").innerText = name;
            return;
        }
    }

    // After Isyak → tomorrow Subuh
    let tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    let [h, m] = prayerTimes.Subuh.split(":");
    tomorrow.setHours(h, m, 0, 0);

    nextPrayerTime = tomorrow;

    document.getElementById("nextLabel").innerText = "Waktu Solat Seterusnya(Esok)";
    document.getElementById("nextPrayerName").innerText = "Subuh";
}


/* ============================
   COUNTDOWN
============================ */
setInterval(() => {

    if (!nextPrayerTime) return;

    let now = new Date();
    let diff = nextPrayerTime - now;

    if (diff <= 0) {
        determineNextPrayer();
        return;
    }

    let h = Math.floor(diff / (1000 * 60 * 60));
    let m = Math.floor((diff / 1000 / 60) % 60);
    let s = Math.floor((diff / 1000) % 60);

    document.getElementById("cdHour").innerText = String(h).padStart(2,'0');
    document.getElementById("cdMin").innerText = String(m).padStart(2,'0');
    document.getElementById("cdSec").innerText = String(s).padStart(2,'0');

}, 1000);


/* ============================
   LIVE CLOCK
============================ */
function updateClock() {
    let now = new Date();
    let h = now.getHours();
    let m = String(now.getMinutes()).padStart(2,"0");
    let s = String(now.getSeconds()).padStart(2,"0");
    let ampm = h >= 12 ? "PM" : "AM";
    let h12 = (h % 12) || 12;

    document.getElementById("currentTime").innerText =
        `${h12}:${m}:${s} ${ampm}`;

    highlightCurrentPrayer();
}
setInterval(updateClock, 1000);
updateClock();


/* ============================
   HIGHLIGHT CURRENT PRAYER
============================ */
function highlightCurrentPrayer() {
    const now = new Date();
    const list = Object.entries(prayerTimes);
    let active = "Isyak";

    for (let [name, time] of list) {
        let [h, m] = time.split(":").map(Number);
        let t = new Date();
        t.setHours(h, m, 0, 0);

        if (t <= now) active = name;
    }

    document.querySelectorAll(".card")
        .forEach(c => c.classList.remove("currentPrayer"));

    const activeCard = document.getElementById("card" + active);
    if (activeCard) activeCard.classList.add("currentPrayer");
}
