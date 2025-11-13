const zone = 'JHR02';  // change to your zone code
let todaysTimes = {};

async function loadTimes() {
  try {
    const res = await fetch(`https://api.waktusolat.app/v2/zones/${zone}/monthly`);
    const data = await res.json();
    const today = new Date().getDate();
    const item = data.results.data[today-1];
    todaysTimes = {
      imsak: item.imsak,
      subuh: item.subuh,
      syuruk: item.syuruk,
      zohor: item.zohor,
      asar: item.asar,
      maghrib: item.maghrib,
      isyak: item.isyak
    };
    renderPrayerList();
  } catch (e) {
    console.error('Error fetching times', e);
  }
}

function renderPrayerList() {
  const container = document.querySelector('.prayer-list');
  container.innerHTML = '';
  const keys = ['imsak','subuh','syuruk','zohor','asar','maghrib','isyak'];
  keys.forEach(key => {
    const div = document.createElement('div');
    div.className = 'prayer';
    div.innerHTML = `<span>${key.charAt(0).toUpperCase()+key.slice(1)}</span><span>${todaysTimes[key]}</span>`;
    container.appendChild(div);
  });
}

function getNowNext(timesObj) {
  const now = new Date();
  const keys = ['imsak','subuh','syuruk','zohor','asar','maghrib','isyak'];
  let nowPrayer = null, nextPrayer = null;

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const [h, m] = timesObj[key].split(':').map(Number);
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m);
    if (d > now) {
      nextPrayer = { key, time: d };
      nowPrayer = (i === 0) ? null : { key: keys[i-1], time:new Date(now.getFullYear(), now.getMonth(), now.getDate(), ...timesObj[keys[i-1]].split(':').map(Number)) };
      break;
    }
  }
  if (!nextPrayer) {
    // Past last prayer
    const firstKey = 'imsak';
    nextPrayer = { key:firstKey, time:new Date(now.getFullYear(), now.getMonth(), now.getDate()+1, ...timesObj[firstKey].split(':').map(Number)) };
    nowPrayer = { key:'isyak', time:new Date(now.getFullYear(), now.getMonth(), now.getDate(), ...timesObj['isyak'].split(':').map(Number)) };
  }
  return { nowPrayer, nextPrayer };
}

function updateCountdown(nextTime) {
  const now = new Date();
  const diff = nextTime - now;
  const hrs  = Math.floor(diff / (1000*60*60));
  const mins = Math.floor((diff % (1000*60*60)) / (1000*60));
  const secs = Math.floor((diff % (1000*60)) / 1000);
  document.getElementById('hr').innerText  = String(hrs).padStart(2,'0');
  document.getElementById('min').innerText = String(mins).padStart(2,'0');
  document.getElementById('sec').innerText = String(secs).padStart(2,'0');
}

function highlightList(nowPrayer, nextPrayer) {
  document.querySelectorAll('.prayer').forEach(div=>{
    div.classList.remove('active','next');
  });
  if (nowPrayer) {
    const sel = [...document.querySelectorAll('.prayer')].find(div => div.innerText.startsWith(nowPrayer.key.charAt(0).toUpperCase()+nowPrayer.key.slice(1)));
    if (sel) sel.classList.add('active');
  }
  if (nextPrayer) {
    const sel2 = [...document.querySelectorAll('.prayer')].find(div => div.innerText.startsWith(nextPrayer.key.charAt(0).toUpperCase()+nextPrayer.key.slice(1)));
    if (sel2) sel2.classList.add('next');
  }
}

function updateTimes() {
  const now = new Date();
  document.getElementById('nowTime').innerText = now.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
  const { nowPrayer, nextPrayer } = getNowNext(todaysTimes);
  if (nextPrayer) {
    document.getElementById('nextLabel').innerText = 'Menuju ' + (nextPrayer.key.charAt(0).toUpperCase()+nextPrayer.key.slice(1));
    document.getElementById('nextTime').innerText  = nextPrayer.key.charAt(0).toUpperCase()+nextPrayer.key.slice(1) + ' ' + formatTime(nextPrayer.time);
    updateCountdown(nextPrayer.time);
    highlightList(nowPrayer, nextPrayer);
  }
}

function formatTime(d) {
  const h = String(d.getHours()).padStart(2,'0');
  const m = String(d.getMinutes()).padStart(2,'0');
  return `${h}:${m}`;
}

// Theme toggle
document.querySelector('.toggle-theme').addEventListener('click', ()=> {
  document.body.classList.toggle('dark');
  localStorage.setItem('theme', document.body.classList.contains('dark') ? 'dark' : 'light');
});
if (localStorage.getItem('theme') === 'dark') {
  document.body.classList.add('dark');
}

// Initialise
loadTimes().then(()=> {
  updateTimes();
  setInterval(updateTimes, 1000);
});
