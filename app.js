
(function() {
'use strict';

var MONTHS = ["Morning Star", "Sun's Dawn", "First Seed", "Rain's Hand", "Second Seed", "Summertide", "Sun's Height", "Last Seed", "Amberfall", "Frostfall", "Sun's Dusk", "Evening Star"];
var HOLIDAYS = [{"month": 0, "day": 1, "name": "New Dawn", "deity": "The Changebringer"}, {"month": 1, "day": 7, "name": "Day of Challenging", "deity": "The Stormlord"}, {"month": 2, "day": 21, "name": "Heart's Fire", "deity": "The Eternal Flame"}, {"month": 3, "day": 17, "name": "Whelm's Gift", "deity": "The Tide Tempest"}, {"month": 4, "day": 2, "name": "Harvest Dawn", "deity": "The Stonesoul"}, {"month": 4, "day": 19, "name": "Deep Solace", "deity": "The Allhammer"}, {"month": 5, "day": 1, "name": "Midsummer", "deity": "The Archeart"}, {"month": 5, "day": 21, "name": "Elvendawn", "deity": "Arcanus"}, {"month": 6, "day": 28, "name": "Highsummer", "deity": "The Dawnfather"}, {"month": 8, "day": 22, "name": "Valor's Dawn", "deity": "The Lawbearer"}, {"month": 8, "day": 28, "name": "High Harvest", "deity": "The Tide Tempest"}, {"month": 10, "day": 5, "name": "Embertide", "deity": "The Platinum Dragon"}, {"month": 11, "day": 21, "name": "Winter's Crest", "deity": "The Archeart"}];
var BUILTIN_TAGS = ["Adventure","Travel","Downtime","Crafting","Rest"];
var DEFAULT_STATE = {"current": {"year": 1095, "month": 0, "day": 1}, "view": {"year": 1095, "month": 0}, "days": {}, "customTags": [], "quickTags": [], "arcs": [], "quests": [], "crafts": [], "events": []};
var STORAGE_KEY = "teleevandros_fresh_dm";
var MODE_KEY = "teleevandros_fresh_mode";
var SHARED_URL = "./campaign-data.json";

var isDM = window.localStorage.getItem(MODE_KEY) === "true";
var state = loadLocalState();
var undoStack = [];
var redoStack = [];

function byId(id) { return document.getElementById(id); }
function clone(value) { return JSON.parse(JSON.stringify(value)); }
function normalize(input) {
  var d = Object.assign(clone(DEFAULT_STATE), input || {});
  d.days = d.days || {};
  d.customTags = d.customTags || [];
  d.quickTags = d.quickTags || [];
  d.arcs = d.arcs || [];
  d.quests = d.quests || [];
  d.crafts = d.crafts || [];
  d.events = d.events || [];
  if (!d.current) d.current = clone(DEFAULT_STATE.current);
  if (!d.view) d.view = {year:d.current.year, month:d.current.month};
  return d;
}
function loadLocalState() {
  try {
    var raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? normalize(JSON.parse(raw)) : clone(DEFAULT_STATE);
  } catch (e) {
    return clone(DEFAULT_STATE);
  }
}
function saveLocalState() {
  if (!isDM) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
function dayOrdinal(d) { return d.year * 336 + d.month * 28 + (d.day - 1); }
function fromOrdinal(n) {
  var y = Math.floor(n / 336);
  var remainder = n - y * 336;
  return {year:y, month:Math.floor(remainder / 28), day:(remainder % 28) + 1};
}
function addDays(d,n) { return fromOrdinal(dayOrdinal(d)+n); }
function daysBetween(a,b) { return dayOrdinal(b)-dayOrdinal(a); }
function dateKey(d) { return d.year + "-" + d.month + "-" + d.day; }
function formatDate(d) { return MONTHS[d.month] + " " + d.day + ", " + d.year + " TA"; }
function weekdayName(d) { return ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"][dayOrdinal(d) % 7]; }
function escapeHtml(value) {
  return String(value == null ? "" : value).replace(/[&<>"']/g,function(ch) {
    return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch];
  });
}
function holidayFor(month,day) {
  for (var i=0;i<HOLIDAYS.length;i++) {
    if (HOLIDAYS[i].month===month && HOLIDAYS[i].day===day) return HOLIDAYS[i];
  }
  return null;
}
function allTags() { return BUILTIN_TAGS.concat(state.customTags); }
function ensureDay(d) {
  var k = dateKey(d);
  if (!state.days[k]) state.days[k] = {tags:[],notes:"",notePublic:false};
  return state.days[k];
}
function showToast(text) {
  var el = byId("toast");
  el.textContent = text;
  el.classList.add("show");
  window.setTimeout(function(){ el.classList.remove("show"); },1800);
}
function setStatus(text) {
  var box = byId("statusBox");
  if (!text) { box.hidden = true; box.textContent = ""; return; }
  box.hidden = false;
  box.textContent = text;
}
function snapshot() {
  undoStack.push(clone(state));
  if (undoStack.length > 50) undoStack.shift();
  redoStack = [];
}
function doUndo() {
  if (!undoStack.length) return;
  redoStack.push(clone(state));
  state = undoStack.pop();
  renderAll();
}
function doRedo() {
  if (!redoStack.length) return;
  undoStack.push(clone(state));
  state = redoStack.pop();
  renderAll();
}
function setModeClass() {
  document.body.classList.toggle("player-mode", !isDM);
  byId("modeLabel").textContent = isDM ? "DM Mode" : "Player View";
  byId("toggleDmButton").textContent = isDM ? "Switch to Player View" : "Enable DM Mode";
}

function renderAll() {
  setModeClass();
  byId("currentDateText").textContent = formatDate(state.current);
  byId("weekdayText").textContent = weekdayName(state.current);
  byId("monthTitle").textContent = MONTHS[state.view.month];
  byId("monthMeta").textContent = "Month " + (state.view.month+1) + " of 12 · 28 days · " + state.view.year + " TA";
  renderQuickTags();
  renderCalendar();
  renderArcs();
  renderQuests();
  renderCrafts();
  renderEvents();
  byId("undoButton").disabled = undoStack.length === 0;
  byId("redoButton").disabled = redoStack.length === 0;
  saveLocalState();
}

function makeChip(label,active,onClick,disabled) {
  var b = document.createElement("button");
  b.type = "button";
  b.className = "chip" + (active ? " active" : "");
  b.textContent = label;
  b.disabled = !!disabled;
  b.addEventListener("click",onClick);
  return b;
}
function renderQuickTags() {
  var wrap = byId("quickTags");
  wrap.innerHTML = "";
  allTags().forEach(function(tag) {
    wrap.appendChild(makeChip(tag,state.quickTags.indexOf(tag)>=0,function() {
      var idx = state.quickTags.indexOf(tag);
      if (idx >= 0) state.quickTags.splice(idx,1);
      else state.quickTags.push(tag);
      renderQuickTags();
      saveLocalState();
    },false));
  });
  wrap.appendChild(makeChip("+ Tag",false,function() {
    openEditor("New Custom Tag",[
      {id:"name",label:"Tag name",type:"text"}
    ],function(v) {
      var name = v.name.trim();
      if (!name) return;
      snapshot();
      if (state.customTags.indexOf(name)<0) state.customTags.push(name);
      if (state.quickTags.indexOf(name)<0) state.quickTags.push(name);
    });
  },false));
}
function renderCalendar() {
  var grid = byId("calendarGrid");
  grid.innerHTML = "";
  for (var day=1; day<=28; day++) {
    (function(d) {
      var rec = state.days[dateKey(d)] || {tags:[],notes:"",notePublic:false};
      var h = holidayFor(d.month,d.day);
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "day";
      if (dayOrdinal(d) === dayOrdinal(state.current)) btn.classList.add("current-day");

      var html = '<span class="day-number">' + d.day + '</span>';
      if ((isDM && rec.notes) || (!isDM && rec.notePublic && rec.notes)) html += '<span class="note-mark">✦</span>';
      if (h) html += '<span class="holiday">' + escapeHtml(h.name) + '</span><span class="deity">' + escapeHtml(h.deity) + '</span>';
      if (rec.tags && rec.tags.length) {
        html += '<span class="tag-row">';
        rec.tags.slice(0,3).forEach(function(tag) {
          html += '<span class="mini-tag">' + escapeHtml(tag) + '</span>';
        });
        if (rec.tags.length > 3) html += '<span class="mini-tag">+' + (rec.tags.length-3) + '</span>';
        html += '</span>';
      }
      btn.innerHTML = html;
      btn.addEventListener("click",function(){ openDayDialog(d); });
      grid.appendChild(btn);
    })({year:state.view.year,month:state.view.month,day:day});
  }
}
function renderArcs() {
  var wrap = byId("arcList");
  if (!state.arcs.length) { wrap.innerHTML = "<p>No arcs recorded.</p>"; return; }
  wrap.innerHTML = "";
  state.arcs.forEach(function(arc,index) {
    var end = arc.end || state.current;
    var days = Math.max(1,daysBetween(arc.start,end)+1);
    var el = document.createElement("div");
    el.className = "item";
    el.innerHTML = "<h4>"+escapeHtml(arc.name)+"</h4><p>Started "+formatDate(arc.start)+"</p><p><strong>Length: "+days+" days</strong> · "+(arc.end?"Completed":"Active")+"</p>";
    if (isDM) {
      var actions = document.createElement("div");
      actions.className = "item-actions";
      if (!arc.end) {
        var endBtn = document.createElement("button"); endBtn.type="button"; endBtn.textContent="End Arc";
        endBtn.addEventListener("click",function(){ snapshot(); state.arcs[index].end=clone(state.current); renderAll(); });
        actions.appendChild(endBtn);
      }
      var delBtn = document.createElement("button"); delBtn.type="button"; delBtn.textContent="Delete";
      delBtn.addEventListener("click",function(){ if(confirm("Delete this arc?")){ snapshot(); state.arcs.splice(index,1); renderAll(); } });
      actions.appendChild(delBtn); el.appendChild(actions);
    }
    wrap.appendChild(el);
  });
}
function renderQuests() {
  var wrap = byId("questList");
  var visible = state.quests.filter(function(q){ return isDM || q.public; });
  if (!visible.length) { wrap.innerHTML = "<p>No visible quests.</p>"; return; }
  wrap.innerHTML = "";
  visible.forEach(function(q) {
    var index = state.quests.indexOf(q);
    var end = q.end || state.current;
    var days = Math.max(1,daysBetween(q.start,end)+1);
    var el = document.createElement("div"); el.className="item";
    el.innerHTML="<h4>"+escapeHtml(q.name)+"</h4><p>"+escapeHtml(q.status)+" · Day "+days+(q.arc?" · "+escapeHtml(q.arc):"")+"</p>";
    if (isDM) {
      var actions=document.createElement("div"); actions.className="item-actions";
      if (!q.end) {
        var complete=document.createElement("button"); complete.type="button"; complete.textContent="Complete";
        complete.addEventListener("click",function(){ snapshot(); state.quests[index].status="Completed"; state.quests[index].end=clone(state.current); renderAll(); });
        actions.appendChild(complete);
      }
      var status=document.createElement("button"); status.type="button"; status.textContent="Status";
      status.addEventListener("click",function(){ cycleQuestStatus(index); });
      var del=document.createElement("button"); del.type="button"; del.textContent="Delete";
      del.addEventListener("click",function(){ if(confirm("Delete this quest?")){ snapshot(); state.quests.splice(index,1); renderAll(); } });
      actions.appendChild(status);actions.appendChild(del);el.appendChild(actions);
    }
    wrap.appendChild(el);
  });
}
function cycleQuestStatus(index) {
  snapshot();
  var choices=["Active","On Hold","Completed","Failed","Abandoned"];
  var q=state.quests[index];
  var i=choices.indexOf(q.status);
  q.status=choices[(i+1)%choices.length];
  if (q.status==="Active" || q.status==="On Hold") q.end=null;
  else if (!q.end) q.end=clone(state.current);
  renderAll();
}
function renderCrafts() {
  var wrap=byId("craftList");
  var visible=state.crafts.filter(function(c){ return isDM || c.public; });
  if(!visible.length){wrap.innerHTML="<p>No visible crafting projects.</p>";return;}
  wrap.innerHTML="";
  visible.forEach(function(c){
    var index=state.crafts.indexOf(c);
    var pct=Math.min(100,(c.progress/c.total)*100);
    var el=document.createElement("div");el.className="item";
    el.innerHTML="<h4>"+escapeHtml(c.name)+"</h4><p>"+(c.character?escapeHtml(c.character)+" · ":"")+c.progress+" / "+c.total+" crafting days</p><div class='progress'><span style='width:"+pct+"%'></span></div>";
    if(isDM){
      var actions=document.createElement("div");actions.className="item-actions";
      [[1,"+1"],[0.5,"+½"],[-0.5,"−½"]].forEach(function(pair){
        var b=document.createElement("button");b.type="button";b.textContent=pair[1];
        b.addEventListener("click",function(){snapshot();c.progress=Math.max(0,Math.min(c.total,Math.round((c.progress+pair[0])*2)/2));renderAll();});
        actions.appendChild(b);
      });
      var del=document.createElement("button");del.type="button";del.textContent="Delete";
      del.addEventListener("click",function(){if(confirm("Delete this project?")){snapshot();state.crafts.splice(index,1);renderAll();}});
      actions.appendChild(del);el.appendChild(actions);
    }
    wrap.appendChild(el);
  });
}
function renderEvents(){
  var wrap=byId("eventList");
  var visible=state.events.filter(function(e){return isDM||e.public;}).slice();
  visible.sort(function(a,b){return dayOrdinal(a.date)-dayOrdinal(b.date);});
  if(!visible.length){wrap.innerHTML="<p>No visible world events.</p>";return;}
  wrap.innerHTML="";
  visible.forEach(function(e){
    var index=state.events.indexOf(e);
    var delta=daysBetween(state.current,e.date);
    var when=delta===0?"Due today":(delta>0?delta+" days away":"Triggered "+Math.abs(delta)+" days ago");
    var el=document.createElement("div");el.className="item";
    el.innerHTML="<h4>"+escapeHtml(e.name)+"</h4><p>"+formatDate(e.date)+" · "+when+"</p>"+(e.quest?"<p>Quest: "+escapeHtml(e.quest)+"</p>":"");
    if(isDM){
      var actions=document.createElement("div");actions.className="item-actions";
      var del=document.createElement("button");del.type="button";del.textContent="Delete";
      del.addEventListener("click",function(){if(confirm("Delete this event?")){snapshot();state.events.splice(index,1);renderAll();}});
      actions.appendChild(del);el.appendChild(actions);
    }
    wrap.appendChild(el);
  });
}

function advanceDays(count,tags){
  snapshot();
  for(var i=0;i<count;i++){
    state.current=addDays(state.current,1);
    var r=ensureDay(state.current);
    r.tags=Array.from(new Set((r.tags||[]).concat(tags)));
  }
  state.view={year:state.current.year,month:state.current.month};
  renderAll();
  var due=state.events.find(function(e){return dayOrdinal(e.date)===dayOrdinal(state.current);});
  if(due)showToast("World event due: "+due.name);
}
function openDayDialog(d){
  var data=state.days[dateKey(d)]||{tags:[],notes:"",notePublic:false};
  byId("dayDialogTitle").textContent=formatDate(d);
  byId("dayKeyInput").value=dateKey(d);
  byId("dayNotesInput").value=(isDM||data.notePublic)?(data.notes||""):"";
  byId("dayNotesInput").disabled=!isDM;
  byId("dayNotePublicInput").checked=!!data.notePublic;
  var wrap=byId("dayTagChoices");wrap.innerHTML="";
  allTags().forEach(function(tag){
    wrap.appendChild(makeChip(tag,(data.tags||[]).indexOf(tag)>=0,function(e){
      e.currentTarget.classList.toggle("active");
    },!isDM));
  });
  byId("dayDialog").showModal();
}
function parseDateKey(k){
  var p=k.split("-").map(Number);
  return {year:p[0],month:p[1],day:p[2]};
}
function openEditor(title,fields,onSave){
  byId("editorTitle").textContent=title;
  var wrap=byId("editorFields");wrap.innerHTML="";
  fields.forEach(function(f){
    var label=document.createElement("label");label.textContent=f.label;
    var input;
    if(f.type==="select"){
      input=document.createElement("select");
      (f.options||[]).forEach(function(o){var opt=document.createElement("option");opt.value=o.value;opt.textContent=o.label;input.appendChild(opt);});
      input.value=f.value==null?"":f.value;
    } else if(f.type==="check"){
      input=document.createElement("input");input.type="checkbox";input.checked=!!f.value;label.className="checkbox-row";
    } else {
      input=document.createElement("input");input.type=f.type||"text";input.value=f.value==null?"":f.value;
      if(f.min!=null)input.min=f.min;if(f.max!=null)input.max=f.max;if(f.step!=null)input.step=f.step;
    }
    input.id="field_"+f.id;label.appendChild(input);wrap.appendChild(label);
  });
  byId("editorForm").onsubmit=function(ev){
    if(ev.submitter && ev.submitter.value==="cancel")return;
    ev.preventDefault();
    var values={};
    fields.forEach(function(f){var el=byId("field_"+f.id);values[f.id]=f.type==="check"?el.checked:el.value;});
    onSave(values);
    byId("editorDialog").close();
    renderAll();
  };
  byId("editorDialog").showModal();
}
function dateFields(d){
  return [
    {id:"year",label:"Year",type:"number",min:1,value:d.year},
    {id:"month",label:"Month",type:"select",value:d.month,options:MONTHS.map(function(m,i){return {value:i,label:m};})},
    {id:"day",label:"Day",type:"number",min:1,max:28,value:d.day}
  ];
}

async function loadShared(){
  try{
    setStatus("");
    var res=await fetch(SHARED_URL+"?t="+Date.now(),{cache:"no-store"});
    if(!res.ok)throw new Error("Could not load campaign-data.json");
    var shared=normalize(await res.json());
    if(!isDM)state=shared;
    else if(!window.localStorage.getItem(STORAGE_KEY))state=shared;
    renderAll();
    showToast("Calendar updated");
  }catch(err){
    setStatus("Shared calendar could not be loaded. "+err.message);
  }
}
function publicState(){
  var data=clone(state);
  data.quickTags=[];
  data.events=data.events.filter(function(x){return x.public;});
  data.quests=data.quests.filter(function(x){return x.public;});
  data.crafts=data.crafts.filter(function(x){return x.public;});
  Object.keys(data.days).forEach(function(k){if(!data.days[k].notePublic)data.days[k].notes="";});
  return data;
}
function downloadShared(){
  var blob=new Blob([JSON.stringify(publicState(),null,2)],{type:"application/json"});
  var a=document.createElement("a");
  a.href=URL.createObjectURL(blob);a.download="campaign-data.json";
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(function(){URL.revokeObjectURL(a.href);},1000);
  showToast("Shared update downloaded");
}

function openDrawer(){byId("drawer").classList.add("open");byId("scrim").classList.add("open");byId("drawer").setAttribute("aria-hidden","false");}
function closeDrawer(){byId("drawer").classList.remove("open");byId("scrim").classList.remove("open");byId("drawer").setAttribute("aria-hidden","true");}

function bindEvents(){
  byId("menuButton").addEventListener("click",openDrawer);
  byId("closeDrawerButton").addEventListener("click",closeDrawer);
  byId("scrim").addEventListener("click",closeDrawer);

  byId("toggleDmButton").addEventListener("click",function(){
    isDM=!isDM;
    window.localStorage.setItem(MODE_KEY,String(isDM));
    if(!isDM)loadShared();else renderAll();
    closeDrawer();
  });
  byId("refreshButton").addEventListener("click",loadShared);
  byId("downloadSharedButton").addEventListener("click",downloadShared);

  byId("advanceButton").addEventListener("click",function(){advanceDays(1,state.quickTags);});
  byId("backButton").addEventListener("click",function(){snapshot();state.current=addDays(state.current,-1);state.view={year:state.current.year,month:state.current.month};renderAll();});
  byId("undoButton").addEventListener("click",doUndo);
  byId("redoButton").addEventListener("click",doRedo);
  byId("clearQuickButton").addEventListener("click",function(){state.quickTags=[];renderQuickTags();saveLocalState();});
  byId("todayButton").addEventListener("click",function(){state.view={year:state.current.year,month:state.current.month};renderAll();});
  byId("previousMonthButton").addEventListener("click",function(){state.view.month--;if(state.view.month<0){state.view.month=11;state.view.year--;}renderAll();});
  byId("nextMonthButton").addEventListener("click",function(){state.view.month++;if(state.view.month>11){state.view.month=0;state.view.year++;}renderAll();});

  byId("advanceManyButton").addEventListener("click",function(){
    var wrap=byId("advanceManyTags");wrap.innerHTML="";
    allTags().forEach(function(tag){
      wrap.appendChild(makeChip(tag,state.quickTags.indexOf(tag)>=0,function(e){e.currentTarget.classList.toggle("active");},false));
    });
    function updatePreview(){
      var n=Math.max(1,parseInt(byId("advanceManyCount").value||"1",10));
      byId("advanceManyPreview").textContent="Resulting date: "+formatDate(addDays(state.current,n));
    }
    byId("advanceManyCount").oninput=updatePreview;updatePreview();
    byId("advanceManyDialog").showModal();
  });
  byId("advanceManyForm").addEventListener("submit",function(ev){
    if(ev.submitter && ev.submitter.value==="cancel")return;
    ev.preventDefault();
    var n=Math.max(1,parseInt(byId("advanceManyCount").value||"1",10));
    var tags=Array.prototype.slice.call(byId("advanceManyTags").querySelectorAll(".chip.active")).map(function(b){return b.textContent;});
    byId("advanceManyDialog").close();advanceDays(n,tags);
  });

  byId("dayForm").addEventListener("submit",function(ev){
    if(ev.submitter && ev.submitter.value==="cancel")return;
    ev.preventDefault();if(!isDM)return;
    snapshot();
    var k=byId("dayKeyInput").value;
    var r=state.days[k]||{tags:[],notes:"",notePublic:false};
    r.tags=Array.prototype.slice.call(byId("dayTagChoices").querySelectorAll(".chip.active")).map(function(b){return b.textContent;});
    r.notes=byId("dayNotesInput").value.trim();
    r.notePublic=byId("dayNotePublicInput").checked;
    state.days[k]=r;
    byId("dayDialog").close();renderAll();
  });
  byId("addCustomTagButton").addEventListener("click",function(){
    var name=byId("customTagInput").value.trim();
    if(!name)return;
    if(state.customTags.indexOf(name)<0){snapshot();state.customTags.push(name);}
    byId("customTagInput").value="";
    openDayDialog(parseDateKey(byId("dayKeyInput").value));
    renderAll();
  });

  byId("newArcButton").addEventListener("click",function(){
    openEditor("New Arc",[{id:"name",label:"Arc name",type:"text"}],function(v){snapshot();state.arcs.push({name:v.name||"Untitled Arc",start:clone(state.current),end:null});});
  });
  byId("newQuestButton").addEventListener("click",function(){
    openEditor("New Quest",[
      {id:"name",label:"Quest name",type:"text"},
      {id:"arc",label:"Arc",type:"select",options:[{value:"",label:"None"}].concat(state.arcs.map(function(a){return {value:a.name,label:a.name};}))},
      {id:"public",label:"Visible to players",type:"check",value:true}
    ],function(v){snapshot();state.quests.push({name:v.name||"Untitled Quest",arc:v.arc,status:"Active",start:clone(state.current),end:null,public:v.public});});
  });
  byId("newCraftButton").addEventListener("click",function(){
    openEditor("New Crafting Project",[
      {id:"character",label:"Character",type:"text"},
      {id:"name",label:"Project name",type:"text"},
      {id:"total",label:"Required crafting days",type:"number",min:0.5,step:0.5,value:7},
      {id:"public",label:"Visible to players",type:"check",value:true}
    ],function(v){snapshot();state.crafts.push({character:v.character||"",name:v.name||"Untitled Project",total:Math.max(.5,parseFloat(v.total)||1),progress:0,public:v.public});});
  });
  byId("newEventButton").addEventListener("click",function(){
    openEditor("New World Event",[
      {id:"name",label:"Event name",type:"text"}
    ].concat(dateFields(state.current)).concat([
      {id:"quest",label:"Related quest",type:"select",options:[{value:"",label:"None"}].concat(state.quests.map(function(q){return {value:q.name,label:q.name};}))},
      {id:"public",label:"Visible to players",type:"check",value:false}
    ]),function(v){snapshot();state.events.push({name:v.name||"Untitled Event",date:{year:parseInt(v.year,10),month:parseInt(v.month,10),day:parseInt(v.day,10)},quest:v.quest,public:v.public});});
  });
  byId("setDateButton").addEventListener("click",function(){
    openEditor("Set Current Date",dateFields(state.current),function(v){snapshot();state.current={year:parseInt(v.year,10),month:parseInt(v.month,10),day:parseInt(v.day,10)};state.view={year:state.current.year,month:state.current.month};});
  });
  byId("resetLocalButton").addEventListener("click",function(){
    if(confirm("Erase local DM data?")){window.localStorage.removeItem(STORAGE_KEY);state=clone(DEFAULT_STATE);undoStack=[];redoStack=[];renderAll();closeDrawer();}
  });
}

function boot(){
  try {
    bindEvents();
    renderAll();
    loadShared();
  } catch (err) {
    setStatus("Calendar failed to start: "+err.message);
    console.error(err);
  }
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);
else boot();

})();
