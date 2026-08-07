
const MONTHS = ["Morning Star", "Sun's Dawn", "First Seed", "Rain's Hand", "Second Seed", "Summertide", "Sun's Height", "Last Seed", "Amberfall", "Frostfall", "Sun's Dusk", "Evening Star"];
const HOLIDAYS = [{"month": 0, "day": 1, "name": "New Dawn", "deity": "The Changebringer"}, {"month": 1, "day": 7, "name": "Day of Challenging", "deity": "The Stormlord"}, {"month": 2, "day": 21, "name": "Heart's Fire", "deity": "The Eternal Flame"}, {"month": 3, "day": 17, "name": "Whelm's Gift", "deity": "The Tide Tempest"}, {"month": 4, "day": 2, "name": "Harvest Dawn", "deity": "The Stonesoul"}, {"month": 4, "day": 19, "name": "Deep Solace", "deity": "The Allhammer"}, {"month": 5, "day": 1, "name": "Midsummer", "deity": "The Archeart"}, {"month": 5, "day": 21, "name": "Elvendawn", "deity": "Arcanus"}, {"month": 6, "day": 28, "name": "Highsummer", "deity": "The Dawnfather"}, {"month": 8, "day": 22, "name": "Valor's Dawn", "deity": "The Lawbearer"}, {"month": 8, "day": 28, "name": "High Harvest", "deity": "The Tide Tempest"}, {"month": 10, "day": 5, "name": "Embertide", "deity": "The Platinum Dragon"}, {"month": 11, "day": 21, "name": "Winter's Crest", "deity": "The Archeart"}];
const DAYS_PER_MONTH = 28;
const STORAGE_KEY = "tele_calendar_v1";
const TYPES = {
  adventure:"Adventure", travel:"Travel", downtime:"Downtime", crafting:"Crafting", rest:"Rest"
};
const defaultState = {
  current: {year:1095,month:0,day:1},
  view: {year:1095,month:0},
  campaignStart: {year:1095,month:0,day:1},
  days: {},
  arcs: [],
  crafts: [],
  events: []
};
let state = loadState();

const $ = id => document.getElementById(id);
function clone(x){return JSON.parse(JSON.stringify(x));}
function loadState(){
  try {
    const raw=localStorage.getItem(STORAGE_KEY);
    if(!raw) return clone(defaultState);
    return Object.assign(clone(defaultState),JSON.parse(raw));
  } catch(e){ return clone(defaultState); }
}
function saveState(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}
function key(d){return `${d.year}-${d.month}-${d.day}`;}
function ordinal(d){return d.year*336+d.month*28+(d.day-1);}
function fromOrdinal(n){
  const year=Math.floor(n/336), rem=n-year*336;
  return {year,month:Math.floor(rem/28),day:(rem%28)+1};
}
function addDays(d,n){return fromOrdinal(ordinal(d)+n);}
function diffDays(a,b){return ordinal(b)-ordinal(a);}
function compare(a,b){return ordinal(a)-ordinal(b);}
function formatDate(d){return `${MONTHS[d.month]} ${d.day}, ${d.year} TA`;}
function weekday(d){return ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"][ordinal(d)%7];}
function holidayFor(month,day){return HOLIDAYS.find(h=>h.month===month&&h.day===day);}
function toast(msg){const t=$("toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2200);}

function render(){
  $("currentDateText").textContent=formatDate(state.current);
  $("weekdayText").textContent=weekday(state.current);
  $("monthTitle").textContent=MONTHS[state.view.month];
  $("monthMeta").textContent=`Month ${state.view.month+1} of 12 • 28 days • ${state.view.year} TA`;
  renderCalendar(); renderStats(); renderArcs(); renderCrafts(); renderEvents(); saveState();
}
function renderCalendar(){
  const grid=$("calendarGrid"); grid.innerHTML="";
  for(let day=1;day<=28;day++) {
    const d={year:state.view.year,month:state.view.month,day};
    const k=key(d), rec=state.days[k]||{}, hol=holidayFor(d.month,d.day);
    const btn=document.createElement("button"); btn.className="day";
    if(compare(d,state.current)===0) btn.classList.add("current");
    if(compare(d,state.current)<0) btn.classList.add("past");
    let html=`<span class="num">${day}</span>`;
    if(rec.notes) html+=`<span class="note-mark">✦</span>`;
    if(hol) html+=`<span class="holiday">${hol.name}</span><span class="deity">${hol.deity}</span>`;
    if(rec.type) html+=`<span class="activity activity-${rec.type}">${TYPES[rec.type]}</span>`;
    btn.innerHTML=html; btn.addEventListener("click",()=>openDay(d)); grid.appendChild(btn);
  }
}
function renderStats(){
  const elapsed=Math.max(0,diffDays(state.campaignStart,state.current));
  const counts={adventure:0,travel:0,downtime:0,crafting:0,rest:0};
  Object.entries(state.days).forEach(([k,v])=>{if(v.type&&counts[v.type]!==undefined)counts[v.type]++;});
  const activeArc=state.arcs.find(a=>!a.ended);
  const arcDays=activeArc?Math.max(1,diffDays(activeArc.start,state.current)+1):0;
  const stats=[
    ["Days Since Start",elapsed],["Days in Active Arc",arcDays],["Adventure",counts.adventure],
    ["Travel",counts.travel],["Downtime",counts.downtime],["Crafting",counts.crafting],["Rest",counts.rest]
  ];
  $("statsGrid").innerHTML=stats.map(s=>`<div class="stat"><span>${s[0]}</span><b>${s[1]}</b></div>`).join("");
}
function renderArcs(){
  const list=$("arcList");
  if(!state.arcs.length){list.innerHTML='<p>No arcs recorded yet.</p>';return;}
  list.innerHTML=state.arcs.map((a,i)=>{
    const end=a.ended||state.current, days=Math.max(1,diffDays(a.start,end)+1);
    return `<div class="item"><h4>${esc(a.name)}</h4><p>${formatDate(a.start)} • ${days} day${days===1?"":"s"}${a.ended?" • Completed":" • Active"}</p>
    <div class="item-actions">${a.ended?"":`<button onclick="endArc(${i})">End arc</button>`}<button onclick="deleteArc(${i})">Delete</button></div></div>`;
  }).join("");
}
function renderCrafts(){
  const list=$("craftList");
  if(!state.crafts.length){list.innerHTML='<p>No crafting projects yet.</p>';return;}
  list.innerHTML=state.crafts.map((c,i)=>{
    const pct=Math.min(100,Math.round((c.progress/c.total)*100));
    return `<div class="item"><h4>${esc(c.name)}</h4><p>${c.progress} of ${c.total} crafting days</p><div class="progress"><span style="width:${pct}%"></span></div>
    <div class="item-actions"><button onclick="craftProgress(${i},1)">+1 day</button><button onclick="craftProgress(${i},-1)">−1 day</button><button onclick="deleteCraft(${i})">Delete</button></div></div>`;
  }).join("");
}
function renderEvents(){
  const list=$("eventList");
  const sorted=state.events.map((e,i)=>({...e,_i:i})).sort((a,b)=>compare(a.date,b.date));
  if(!sorted.length){list.innerHTML='<p>No world events scheduled.</p>';return;}
  list.innerHTML=sorted.map(e=>{
    const delta=diffDays(state.current,e.date);
    const when=delta===0?"Today":delta>0?`in ${delta} day${delta===1?"":"s"}`:`${Math.abs(delta)} day${Math.abs(delta)===1?"":"s"} ago`;
    return `<div class="item"><h4>${esc(e.name)}</h4><p>${formatDate(e.date)} • ${when}</p>${e.notes?`<p>${esc(e.notes)}</p>`:""}
    <div class="item-actions"><button onclick="deleteEvent(${e._i})">Delete</button></div></div>`;
  }).join("");
}
function esc(s){return String(s||"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m]));}

function advance(days,type,note){
  for(let i=0;i<days;i++) {
    const d=addDays(state.current,1);
    if(type||note) state.days[key(d)]={...(state.days[key(d)]||{}),type,notes:note||""};
    state.current=d;
  }
  state.view={year:state.current.year,month:state.current.month};
  const due=state.events.filter(e=>compare(e.date,state.current)===0);
  render(); if(due.length) toast(`World event: ${due[0].name}`); else toast(`Advanced ${days} day${days===1?"":"s"}`);
}
function openDay(d){
  const rec=state.days[key(d)]||{};
  $("dayDialogTitle").textContent=formatDate(d);
  $("dayKeyInput").value=key(d); $("dayTypeInput").value=rec.type||""; $("dayNotesInput").value=rec.notes||"";
  $("dayDialog").showModal();
}
$("dayForm").addEventListener("submit",e=>{
  if(e.submitter?.value==="cancel") return;
  e.preventDefault(); const k=$("dayKeyInput").value;
  state.days[k]={type:$("dayTypeInput").value,notes:$("dayNotesInput").value.trim()};
  $("dayDialog").close(); render();
});
$("advanceDayBtn").onclick=()=>advance(1,"adventure","");
$("advanceTimeBtn").onclick=()=>$("advanceDialog").showModal();
$("advanceForm").addEventListener("submit",e=>{
  if(e.submitter?.value==="cancel")return;e.preventDefault();
  const n=Math.max(1,parseInt($("advanceCountInput").value||1));
  const type=$("advanceTypeInput").value,note=$("advanceNoteInput").value.trim();
  $("advanceDialog").close();advance(n,type,note);
});
$("prevMonthBtn").onclick=()=>{state.view.month--;if(state.view.month<0){state.view.month=11;state.view.year--;}render();};
$("nextMonthBtn").onclick=()=>{state.view.month++;if(state.view.month>11){state.view.month=0;state.view.year++;}render();};

function simpleDialog(title,fields,onSave){
  $("simpleTitle").textContent=title; const wrap=$("simpleFields"); wrap.innerHTML="";
  fields.forEach(f=>{const lab=document.createElement("label");lab.textContent=f.label;let el;
    if(f.type==="select"){el=document.createElement("select");f.options.forEach(o=>{const op=document.createElement("option");op.value=o.value;op.textContent=o.label;el.appendChild(op);});}
    else{el=document.createElement("input");el.type=f.type||"text";if(f.min)el.min=f.min;if(f.max)el.max=f.max;}
    el.id="sf_"+f.id;el.value=f.value??"";lab.appendChild(el);wrap.appendChild(lab);
  });
  $("simpleForm").onsubmit=e=>{if(e.submitter?.value==="cancel")return;e.preventDefault();const vals={};fields.forEach(f=>vals[f.id]=$("sf_"+f.id).value);onSave(vals);$("simpleDialog").close();render();};
  $("simpleDialog").showModal();
}
function dateFields(d){return[
  {id:"year",label:"Year",type:"number",min:"1",value:d.year},
  {id:"month",label:"Month",type:"select",value:d.month,options:MONTHS.map((m,i)=>({value:i,label:m}))},
  {id:"day",label:"Day",type:"number",min:"1",max:"28",value:d.day}
];}
$("setDateBtn").onclick=()=>simpleDialog("Set Current Date",dateFields(state.current),v=>{state.current={year:+v.year,month:+v.month,day:+v.day};state.view={year:+v.year,month:+v.month};closeDrawer();});
$("resetStartBtn").onclick=()=>simpleDialog("Set Campaign Start",dateFields(state.campaignStart),v=>state.campaignStart={year:+v.year,month:+v.month,day:+v.day});
$("addArcBtn").onclick=()=>simpleDialog("New Arc",[{id:"name",label:"Arc name",value:""}],v=>state.arcs.push({name:v.name||"Untitled Arc",start:clone(state.current),ended:null}));
$("addCraftBtn").onclick=()=>simpleDialog("New Crafting Project",[{id:"name",label:"Project name"},{id:"total",label:"Required crafting days",type:"number",min:"1",value:7}],v=>state.crafts.push({name:v.name||"Untitled Project",total:Math.max(1,+v.total),progress:0}));
$("addEventBtn").onclick=()=>simpleDialog("New World Event",[
  {id:"name",label:"Event name"},...dateFields(state.current),{id:"notes",label:"Notes"}
],v=>state.events.push({name:v.name||"Untitled Event",date:{year:+v.year,month:+v.month,day:+v.day},notes:v.notes||""}));
window.endArc=i=>{state.arcs[i].ended=clone(state.current);render();};
window.deleteArc=i=>{if(confirm("Delete this arc?")){state.arcs.splice(i,1);render();}};
window.craftProgress=(i,n)=>{state.crafts[i].progress=Math.max(0,Math.min(state.crafts[i].total,state.crafts[i].progress+n));render();};
window.deleteCraft=i=>{if(confirm("Delete this project?")){state.crafts.splice(i,1);render();}};
window.deleteEvent=i=>{if(confirm("Delete this event?")){state.events.splice(i,1);render();}};

const drawer=$("drawer"),scrim=$("scrim");
function openDrawer(){drawer.classList.add("open");scrim.classList.add("open");drawer.setAttribute("aria-hidden","false");}
function closeDrawer(){drawer.classList.remove("open");scrim.classList.remove("open");drawer.setAttribute("aria-hidden","true");}
$("menuBtn").onclick=openDrawer;$("closeDrawerBtn").onclick=closeDrawer;scrim.onclick=closeDrawer;
$("exportBtn").onclick=()=>{
  const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="tele-calendar-backup.json";a.click();URL.revokeObjectURL(a.href);
};
$("importInput").onchange=async e=>{const f=e.target.files[0];if(!f)return;try{state=Object.assign(clone(defaultState),JSON.parse(await f.text()));render();toast("Backup imported");closeDrawer();}catch{alert("That backup file could not be read.");}};
$("clearDataBtn").onclick=()=>{if(confirm("Erase all locally saved calendar data?")){state=clone(defaultState);render();closeDrawer();}};

if("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(()=>{});
render();
