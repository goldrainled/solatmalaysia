const ZONE="JHR02";let prayerTimes={},nextPrayerName="",nextPrayerTime=null;
async function loadPrayerTimes(){
try{
const url=`https://www.e-solat.gov.my/index.php?r=esolatApi/takwimsolat&period=month&zone=${ZONE}`;
const res=await fetch(url);const data=await res.json();console.log("API DATA:",data);
if(!data.prayerTime){console.error("No prayerTime array.");return;}
const today=new Date();const m=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const esDate=`${today.getDate().toString().padStart(2,"0")}-${m[today.getMonth()]}-${today.getFullYear()}`;
const entry=data.prayerTime.find(i=>i.date===esDate);
if(!entry){console.warn("Today not found");return;}
prayerTimes={subuh:entry.fajr,syuruk:entry.syuruk,zohor:entry.dhuhr,asar:entry.asr,maghrib:entry.maghrib,isyak:entry.isha};
document.getElementById("syurukTime").innerText=formatToAMPM(prayerTimes.syuruk);
determineNextPrayer();
}catch(e){console.error("API ERROR:",e);}
}
loadPrayerTimes();setInterval(loadPrayerTimes,3600000);

function formatToAMPM(t){if(!t)return"--:--";let[h,m]=t.split(":").map(Number);let am=h>=12?"PM":"AM";h=(h%12)||12;return`${h}:${m.toString().padStart(2,"0")} ${am}`;}

function determineNextPrayer(){const now=new Date();
const schedule=[{name:"Subuh",time:prayerTimes.subuh},{name:"Syuruk",time:prayerTimes.syuruk},{name:"Zohor",time:prayerTimes.zohor},{name:"Asar",time:prayerTimes.asar},{name:"Maghrib",time:prayerTimes.maghrib},{name:"Isyak",time:prayerTimes.isyak}];
for(let p of schedule){let[h,m]=p.time.split(":");let target=new Date();target.setHours(h,m,0,0);
if(target>now){nextPrayerName=p.name;nextPrayerTime=target;document.getElementById("nextPrayerName").innerText=p.name;highlightPrayerButton(p.name);return;}}
}

function highlightPrayerButton(n){document.querySelectorAll(".selector button").forEach(b=>b.classList.remove("active"));
if(n==="Zohor")document.getElementById("btnZohor").classList.add("active");
if(n==="Asar")document.getElementById("btnAsar").classList.add("active");
if(n==="Maghrib")document.getElementById("btnMaghrib").classList.add("active");
}

function updateCountdown(){if(!nextPrayerTime)return;let now=new Date();let diff=nextPrayerTime-now;
let h=Math.floor(diff/3600000),m=Math.floor((diff/60000)%60),s=Math.floor((diff/1000)%60);
document.getElementById("cdHour").innerText=h.toString().padStart(2,"0");
document.getElementById("cdMin").innerText=m.toString().padStart(2,"0");
document.getElementById("cdSec").innerText=s.toString().padStart(2,"0");
}
setInterval(updateCountdown,1000);

function updateCurrentTime(){let now=new Date();let h=now.getHours(),m=now.getMinutes().toString().padStart(2,"0"),s=now.getSeconds().toString().padStart(2,"0");
let am=h>=12?"PM":"AM";h=(h%12)||12;
document.getElementById("currentTime").innerText=`${h}:${m}:${s} ${am}`;}
setInterval(updateCurrentTime,1000);updateCurrentTime();
