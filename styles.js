// =======================================
// Update current time every second
// =======================================
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


// =======================================
// Demo countdown to Zohor (replace with API later)
// =======================================
let countdownTarget = new Date();
countdownTarget.setHours(13, 0, 0); // Example 1:00 PM

function updateCountdown() {
    let now = new Date();
    let diff = countdownTarget - now;

    if (diff < 0) diff = 0;

    let h = Math.floor(diff / (1000 * 60 * 60));
    let m = Math.floor((diff / (1000 * 60)) % 60);
    let s = Math.floor((diff / 1000) % 60);

    document.getElementById("cdHour").textContent = h.toString().padStart(2, "0");
    document.getElementById("cdMin").textContent = m.toString().padStart(2, "0");
    document.getElementById("cdSec").textContent = s.toString().padStart(2, "0");
}

setInterval(updateCountdown, 1000);
updateCountdown();


// =======================================
// Make selector buttons change active style
// =======================================
document.querySelectorAll(".selector button").forEach(btn => {
    btn.addEventListener("click", function () {
        document.querySelectorAll(".selector button").forEach(b => b.classList.remove("active"));
        this.classList.add("active");
    });
});
