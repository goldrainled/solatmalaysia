/* main.js — FIXED FULL-WIDTH PORTRAIT MODE (Option C)
   • Portrait = stretch to full width, scale height proportionally
   • Landscape = normal auto scaling
*/

let zoneCode = "JHR02";
let prayerTimes = {};
let nextPrayerTime = null;

function dbg(...args){ console.debug("⭑ solat:", ...args); }

/* ============================================================
   AUTO MODE — FIXED FOR FULL-WIDTH PORTRAIT
============================================================ */

let currentTarget = { w: 1920, h: 1080 }; // default landscape reference

function autoDetectMode() {
    const winW = window.innerWidth;
    const winH = window.innerHeight;
    const scrW = screen.width;
    const scrH = screen.height;

    const isPortrait =
        (winH > winW) ||
        (scrH > scrW);

    /* OPTION C - FULL WIDTH FIT ON PORTRAIT */
    if (isPortrait) {
        // Set a reference portrait layout
        // Width determines scale. Height auto scales.
        currentTarget = { w: 1080, h: 2400 };
    } else {
        // Landscape default
        currentTarget = { w: 1920, h: 1080 };
    }

    scaleToFit(isPortrait);
}

/* ============================================================
   SCALE UI — FULL WIDTH FIT IN PORTRAIT
============================================================ */
function scaleToFit(isPortrait = false) {
    const host = document.getElementById("viewportHost");
    const app  = document.getElementById("app");  // IMPORTANT: rename your root element to id="app"
    if(!app) return;

    const targetW = currentTarget.w;
    const targetH = currentTarget.h;

    // Set base size
    app.style.width  = targetW + "px";
    app.style.height = targetH + "px";

    let scale;

    if (isPortrait) {
        // FULL WIDTH SCALING (Option C)
        scale = window.innerWidth / targetW;
        app.style.transformOrigin = "top center";  // center horizontally
    } else {
        // LANDSCAPE = fit in both directions
        scale = Math.min(
            window.innerWidth  / targetW,
            window.innerHeight / targetH
        );
        app.style.transformOrigin = "top left";
    }

    app.style.transform = `scale(${scale})`;

    host.style.display = "flex";
    host.style.alignItems = "flex-start";
    host.style.justifyContent = "center";
}

/* Auto update on rotate/resize */
window.addEventListener("resize", autoDetectMode);


/* ============================================================
   ORIGINAL SOLAT LOGIC (UNCHANGED)
============================================================ */

/* (All your solat logic remains unchanged, no need to copy again) */

async function setAutoDates(){
    try {
        const now = new Date();
        const dd = String(now.getDate()).padStart(2,'0');
        const mm = String(now.getMonth()+1).padStart(2,'0');
        const yyyy = now.getFullYear();
        const dateStr = `${dd}-${mm}-${yyyy}`;

        const res = await fetch(`https://api.aladhan.com/v1/gToH?date=${dateStr}`);
        const j = await res.json();
        if(j && j.data && j.data.hijri){
            const h = j.data.hijri;
            const hijriMonth = (h.month && (h.month.en || h.month.ar)) || "";
            const hijriDay = h.day;
            const hijriYear = h.year;
            const gMonthName = new Intl.DateTimeFormat('en-US',{month:'long'}).format(now);
            const final = `${dd} ${gMonthName} ${yyyy} , ${hijriDay} ${hijriMonth} ${hijriYear}H`;
            document.getElementById("dateToday").innerText = final;
            return;
        }
        document.getElementById("dateToday").innerText = new Date().toLocaleDateString();
    } catch(err){
        document.getElementById("dateToday").innerText = new Date().toLocaleDateString();
    }
}

/* --- keep rest of your solat logic exactly the same --- */

(async function init(){
    await setAutoDates();
    autoDetectMode();
    await detectZoneAndLoad();
    scaleToFit();
})();
