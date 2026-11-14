"use strict";
/* ============ constants ============ */
const CATS=[
  {k:"dir",n:"Режиссура",s:"Реж",ic:"🎬",c:"#ffb84d"},
  {k:"script",n:"Сценарий",s:"Сцен",ic:"📜",c:"#8b7bff"},
  {k:"actors",n:"Актёры",s:"Акт",ic:"🎭",c:"#ff7aa8"},
  {k:"visual",n:"Визуал",s:"Виз",ic:"🎨",c:"#4cc9f0"},
  {k:"sound",n:"Звук",s:"Звук",ic:"🎧",c:"#3ecf8e"}];
const SERIES_TYPES=["Сериал","Мультсериал","Аниме","Дорама"];
const FR={MCU:"MCU",CLASSIC:"Классика",XMEN:"Люди Икс",DC:"DC"};
const MARVEL=["MCU","CLASSIC","XMEN"];
const PHASES=[
  {id:1,n:"Фаза 1",c:"#ff5d5d",f:x=>x<=6},
  {id:2,n:"Фаза 2",c:"#ff9f43",f:x=>x>6&&x<=14},
  {id:3,n:"Фаза 3",c:"#feca57",f:x=>x>14&&x<=36},
  {id:4,n:"Фаза 4",c:"#1dd1a1",f:x=>x>36&&x<=50},
  {id:5,n:"Фаза 5",c:"#54a0ff",f:x=>x>50&&x<=60},
  {id:6,n:"Фаза 6",c:"#a29bfe",f:x=>x>60}];
const BUCKETS=[
  {k:"5",n:"5",f:v=>v>=5},
  {k:"45",n:"4–5",f:v=>v>=4&&v<5},
  {k:"34",n:"3–4",f:v=>v>=3&&v<4},
  {k:"23",n:"2–3",f:v=>v>=2&&v<3},
  {k:"02",n:"0–2",f:v=>v<2}];
const TABS=[
  {id:"watched",n:"Просмотрено",s:"Список",ic:"🎞"},
  {id:"plan",n:"Планы",s:"Планы",ic:"🗓"},
  {id:"catalog",n:"Каталог",s:"Каталог",ic:"🔥"},
  {id:"quiz",n:"Викторина",s:"Викторина",ic:"🎲"},
  {id:"comics",n:"Кинокомиксы",s:"Комиксы",ic:"💥"},
  {id:"analytics",n:"Аналитика",s:"Аналитика",ic:"📊"},
  {id:"guide",n:"Как оценивать",s:"Гайд",ic:"📖"},
  {id:"data",n:"Данные",s:"Данные",ic:"⚙"}];
const TABALIAS={stats:"stats",taste:"taste",world:"world"}; // старые ссылки #stats/#taste/#world ведут в «Аналитику»
/* ============ журнал ошибок: ничего не теряется молча ============ */
const ERRK="kinoteka.errlog.v1";
const ERRLOG=(()=>{try{const a=JSON.parse(localStorage.getItem(ERRK)||"[]");return Array.isArray(a)?a:[]}catch(e){return[]}})();
function errSeenAt(){try{return+localStorage.getItem(ERRK+".seen")||0}catch(e){return 0}}
const errUnseen=()=>ERRLOG.filter(e=>!e.s&&e.t>errSeenAt()).length;
/* soft=true — мелочь (кэш, настройки): попадает в журнал, но значок не зажигает */
function logErr(ctx,e,soft){
  const m=String((e&&e.message)||e||"ошибка").slice(0,240);
  try{console.warn("["+ctx+"]",e)}catch(_){}
  const last=ERRLOG[ERRLOG.length-1];
  if(last&&last.c===ctx&&last.m===m&&Date.now()-last.t<5000)return;
  ERRLOG.push({t:Date.now(),c:ctx,m,s:soft?1:0});while(ERRLOG.length>60)ERRLOG.shift();
  try{localStorage.setItem(ERRK,JSON.stringify(ERRLOG))}catch(_){}
  if(!soft)try{if(DB)renderTabs()}catch(_){}
}
function errMarkSeen(){try{localStorage.setItem(ERRK+".seen",String(Date.now()))}catch(e){}}
window.addEventListener("error",e=>logErr("Скрипт",e.error||e.message));
window.addEventListener("unhandledrejection",e=>logErr("Запрос или сохранение",e.reason));
function errPanel(){
  errMarkSeen();
  const L=ERRLOG.slice().reverse(),hard=L.filter(e=>!e.s).length;
  return `<div class="panel" id="errPanel"><h3>Журнал ошибок</h3>
   <p class="dim" style="font-size:12.5px;margin:4px 0 10px">${hard?`Были сбои, из-за которых что-то могло не сохраниться или не загрузиться: ${hard}.`:"Серьёзных сбоев не было."} Мелкие замечания (кэш, настройки) тоже попадают сюда. Хранятся последние 60 записей.</p>
   ${L.length?`<div class="errlist">${L.slice(0,30).map(e=>`<div class="erri ${e.s?"soft":"hard"}"><span class="et">${esc(new Date(e.t).toLocaleString("ru-RU",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}))}</span><b>${esc(e.c)}</b><span class="em">${esc(e.m)}</span></div>`).join("")}</div>
   <div class="row" style="margin-top:10px;gap:8px"><button class="btn sm" id="errCopy">Скопировать для отладки</button><button class="btn sm" id="errClear">Очистить журнал</button></div>`:`<div class="empty" style="padding:14px">Журнал пуст.</div>`}</div>`;
}

const SEED=JSON.parse(document.getElementById("seed").textContent);
const GUIDE=JSON.parse(document.getElementById("guide").textContent);
const WORLD=(()=>{try{return JSON.parse(document.getElementById("world").textContent)}catch(e){return{}}})();

/* ============ One Piece: арки вместо сезонов ============ */
const OP_ARCS=[
 ["Ромэнс Дон",1,3],["Оранж Таун",4,8],["Деревня Сироп",9,18],["Барати",19,30],["Арлонг Парк",31,44],["Логтаун",45,53],
 ["Остров военного корабля",54,61,1],["Реверс Маунтин",62,63],["Виски Пик",64,67],["Коби и Хельмеппо",68,69,1],["Литл Гарден",70,77],
 ["Остров Драм",78,91],["Алабаста",92,130],["После Алабасты",131,135,1],["Остров Козла",136,138,1],["Остров Рулука",139,143,1],
 ["Джая",144,152],["Скайпия",153,195],["G-8",196,206,1],["Лонг Ринг Лонг Лэнд",207,219],["Океанская мечта",220,224,1],
 ["Возвращение Фокси",225,228,1],["Water 7",229,263],["Эниес Лобби",264,312],["После Эниес Лобби",313,325],["Ледяные охотники",326,336,1],
 ["Триллер Барк",337,381],["Остров-спа",382,384,1],["Архипелаг Сабаоди",385,405],["Исторический спецвыпуск",406,407,1],["Амазон Лили",408,421],
 ["Импел Даун",422,456],["Маринфорд",457,489],["После войны",490,516],["Возвращение на Сабаоди",517,522],["Остров рыболюдей",523,574],
 ["Амбиции Зеда",575,578,1],["Панк Хазард",579,625],["Похищение Цезаря",626,628,1],["Дрессроза",629,746],["Серебряный рудник",747,750,1],
 ["Зоу",751,779],["Новобранцы дозора",780,782,1],["Остров Пирожных",783,877],["Ревери",878,889],["Страна Вано",890,1085],
 ["Эггхед",1086,1155],["Эльбаф",1156,null]
].map(([name,a,b,f],i)=>({n:i+1,name,from:a,to:b,filler:!!f}));
function onePieceItem(){return{id:"op1",title:"Ван Пис",type:"Аниме",kind:"series",status:"watching",year:1999,tmdb:{type:"tv",id:37854},
  genres:["Аниме","Приключения","Боевик","Комедия","Фэнтези"],tags:[],
  synopsis:"Монки Д. Луффи, парень с резиновым телом, собирает команду Пиратов Соломенной Шляпы и отправляется на поиски легендарного сокровища «Ван Пис», чтобы стать Королём пиратов. Вместо сезонов — арки: каждую можно оценить отдельно.",
  poster:"",duration:null,ratings:{},order:null,watchedAt:null,addedAt:Date.now(),
  arcs:clone(OP_ARCS),seasons:[],seasonsTotal:OP_ARCS.length,episodes:null,episodeDuration:24,totalDuration:null,
  seasonEpisodes:OP_ARCS.map(a=>a.to?a.to-a.from+1:null),progress:{season:1,episode:0},progressAt:Date.now()}}
/* сегменты: сезон или арка */
const isArc=it=>Array.isArray(it&&it.arcs)&&it.arcs.length>0;
const arcOf=(it,n)=>isArc(it)?it.arcs.find(a=>a.n===n):null;
function segName(it,n){if(isArc(it)){const a=arcOf(it,n);return a?a.name:"Арка "+n}return n+" сезон"}
function segShort(it,n){return isArc(it)?String(n):"S"+n}
function segTip(it,n){if(!isArc(it))return"Сезон "+n;const a=arcOf(it,n);return a?`${a.name}${a.filler?" (филлер)":""} · эп. ${a.from}–${a.to||"…"}`:"Арка "+n}
function segTitle(it,n){return isArc(it)?`${it.title} — ${segName(it,n)}`:`${it.title} — ${n} сезон`}
function segW(it,form){const a=isArc(it);return {one:a?"арка":"сезон",One:a?"Арка":"Сезон",acc:a?"арку":"сезон",gen:a?"арок":"сезонов",done:a?"Арка досмотрена":"Сезон досмотрен"}[form]}
function segCount(it,n){return isArc(it)?n+" "+plural(n,"арка","арки","арок"):n+" "+plural(n,"сезон","сезона","сезонов")}

/* ============ helpers ============ */
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const clone=o=>JSON.parse(JSON.stringify(o));
const uid=p=>p+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const isNum=v=>typeof v==="number"&&isFinite(v);
const avg=a=>{a=a.filter(isNum);return a.length?a.reduce((x,y)=>x+y,0)/a.length:null};
const f1=v=>isNum(v)?(Math.round(v*10)/10).toFixed(1).replace(/\.0$/,""):"—";
const f2=v=>isNum(v)?(Math.round(v*100)/100).toFixed(2):"—";
const cmpRu=(a,b)=>String(a).localeCompare(String(b),"ru");
function plural(n,a,b,c){n=Math.abs(n)%100;const m=n%10;if(n>10&&n<20)return c;if(m>1&&m<5)return b;if(m===1)return a;return c}
function fmtDur(min){if(!isNum(min)||min<=0)return"";min=Math.round(min);const h=Math.floor(min/60),m=min%60;if(!h)return m+" мин";if(min>=60*48){return Math.round(min/60)+" ч"}return h+" ч"+(m?" "+m+" мин":"")}
function hoursStr(min){if(!min)return"0 ч";const h=min/60;return (h>=100?Math.round(h):Math.round(h*10)/10).toString().replace(".",",")+" ч"}
function scoreColor(v){if(!isNum(v))return"";
  /* шкала: красный → янтарь → лайм → зелёный; без мутного жёлто-зелёного посередине */
  const S=[[1,[5,72,60]],[2,[16,82,60]],[3,[38,88,58]],[4,[88,52,54]],[5,[148,50,50]]];
  v=Math.max(1,Math.min(5,v));let k=0;while(k<S.length-2&&v>S[k+1][0])k++;
  const a=S[k],b=S[k+1],t=(v-a[0])/(b[0]-a[0]);
  const m=i=>a[1][i]+(b[1][i]-a[1][i])*t;
  const l=dark()?m(2):m(2)-4;
  return`hsl(${Math.round(m(0))} ${Math.round(m(1))}% ${Math.round(l)}%)`}
function dark(){return document.documentElement.dataset.theme!=="light"}
function scBadge(v,cls=""){if(!isNum(v))return`<span class="sc na ${cls}">—</span>`;const c=scoreColor(v);return`<span class="sc ${cls}" style="background:${c};--c:${c}">${f1(v)}</span>`}
function hashStr(s){let h=0;for(const c of String(s))h=(h*31+c.charCodeAt(0))|0;return Math.abs(h)}
function initials(t){const w=String(t).replace(/[«»"„“:.,!?()]/g," ").split(/\s+/).filter(Boolean);return ((w[0]||"?")[0]+(w[1]?w[1][0]:"")).toUpperCase()}
function posterHTML(it,big){
  if(it.poster)return`<img src="${esc(it.poster)}" alt="" loading="lazy" onerror="this.remove()">`;
  const h=hashStr(it.title),h1=h%360,h2=(h1+40+(h>>8)%80)%360;
  return`<div class="ph" style="background:linear-gradient(150deg,hsl(${h1} 55% 38%),hsl(${h2} 60% 18%))"><div class="ini">${esc(initials(it.title))}</div>${big===false?"":`<div class="pt">${esc(it.title)}</div>`}</div>`;
}
function toast(m){const t=$("#toast");t.textContent=m;t.classList.add("on");clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove("on"),2200)}
function parseDurAvg(s){if(isNum(s))return s;if(!s)return null;const m=String(s).match(/\d+(?:[.,]\d+)?/g);if(!m)return null;return avg(m.map(x=>parseFloat(x.replace(",","."))))}

/* ============ storage ============ */
let DB=null;
const IDB={
  open(){return new Promise((res,rej)=>{const r=indexedDB.open("kinoteka",1);r.onupgradeneeded=()=>r.result.createObjectStore("kv");r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})},
  async get(k){try{const d=await this.open();return await new Promise(res=>{const q=d.transaction("kv").objectStore("kv").get(k);q.onsuccess=()=>res(q.result);q.onerror=()=>res(undefined)})}catch(e){return undefined}},
  async setMany(o){try{const d=await this.open();await new Promise((res,rej)=>{const tx=d.transaction("kv","readwrite");const st=tx.objectStore("kv");for(const k in o)st.put(o[k],k);tx.oncomplete=res;tx.onerror=()=>rej(tx.error)})}catch(e){logErr("Сохранение в браузере",e);toast("Не удалось сохранить: "+e.message)}},
  async set(k,v){try{const d=await this.open();await new Promise((res,rej)=>{const tx=d.transaction("kv","readwrite");tx.objectStore("kv").put(v,k);tx.oncomplete=res;tx.onerror=()=>rej(tx.error)})}catch(e){logErr("Сохранение в браузере",e);toast("Не удалось сохранить: "+e.message)}}
};
let saveT=null;
function save(){clearTimeout(saveT);saveT=setTimeout(()=>{IDB.setMany(CLOUD&&CLOUD.room?{db:DB,cloud:{room:CLOUD.room,base:SY.base}}:{db:DB});cloudPush()},250)}
function commit(){save();render()}
const UIK="kinoteka.ui.v1";
let UI={qzSub:"play",qzWho:"turn",qzLen:"10",qzProj:"asked",sub:"stats",hiddenTabs:["comics"],catCat:"movie",catSort:"popular",catGenre:"",catYear:"",catHide:true,catQ:"",planView:"list",planSeen:"all",planUni:"",tab:"watched",type:"all",comics:"all",bucket:null,rater:"all",sort:"order",dir:-1,mode:"whole",view:"cards",q:"",genre:"",uni:"marvel",cOrder:"num",planType:"all",planSort:"added",serType:"all",serQ:"",theme:"dark",tag:"",tA:"",tB:"",wSrc:"all",wWho:"all",wSort:"rel",omdbKey:"",gridSize:178,hideScores:false,group:"none",gColl:{},compact:false,stPer:"month"};
try{Object.assign(UI,JSON.parse(localStorage.getItem(UIK)||"{}"))}catch(e){logErr("Настройки интерфейса",e,1)}
if(!UI.catStatusShown){UI.catHide=false;UI.catStatusShown=1}  /* в каталоге по умолчанию видны статусы (смотрели / в планах / на согласовании) */
UI.reorder=false;
function tabHidden(id){return id!=="data"&&Array.isArray(UI.hiddenTabs)&&UI.hiddenTabs.includes(id)}
if(TABALIAS[UI.tab]){UI.sub=TABALIAS[UI.tab];UI.tab="analytics"}
if(!TABS.some(t=>t.id===UI.tab)||tabHidden(UI.tab))UI.tab="watched";
function saveUI(){try{localStorage.setItem(UIK,JSON.stringify(UI))}catch(e){logErr("Сохранение настроек",e,0)}}

/* ============ ☁ облако: Firebase Realtime Database (REST + SSE, без SDK) ============
   В облаке лежит каждая запись отдельным документом /rooms/<комната>/d/<id> = {j:JSON, t, by, who},
   общие настройки — /d/meta, журнал оценок — /log/<ключ>. Встроенные постеры TMDB в облако
   не уходят (ставится метка @tmdb:<id>), так что база весит сотни килобайт.
   Одновременные правки сливаются по полям (трёхстороннее слияние), оценки двух людей не затирают друг друга. */
const CLK="kinoteka.cloud.v1";
function rid(n){const A="ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";const b=crypto.getRandomValues(new Uint8Array(n));return [...b].map(x=>A[x%A.length]).join("")}
const DEV=(()=>{try{let d=localStorage.getItem("kinoteka.dev");if(!d){d=rid(10);localStorage.setItem("kinoteka.dev",d)}return d}catch(e){return rid(10)}})();
let CLOUD=null;try{CLOUD=JSON.parse(localStorage.getItem(CLK)||"null")}catch(e){logErr("Настройки облака",e,1)}
function saveCloudCfg(){try{CLOUD?localStorage.setItem(CLK,JSON.stringify(CLOUD)):localStorage.removeItem(CLK)}catch(e){logErr("Сохранение настроек облака",e,0)}}
function normDbUrl(s){s=String(s||"").trim();if(!s)return"";if(!/^https?:\/\//i.test(s))s="https://"+s;try{return new URL(s).origin}catch(e){return""}}
const isFbHost=u=>/\.(firebaseio\.com|firebasedatabase\.app)$/i.test((()=>{try{return new URL(u).hostname}catch(e){return""}})());
/* стабильный JSON: ключи по алфавиту — чтобы одинаковые данные давали одинаковую строку */
function sj(v){if(v===undefined)return undefined;if(v===null||typeof v!=="object")return JSON.stringify(v);
  if(Array.isArray(v))return"["+v.map(x=>x===undefined?"null":sj(x)).join(",")+"]";
  return"{"+Object.keys(v).filter(k=>v[k]!==undefined&&typeof v[k]!=="function").sort().map(k=>JSON.stringify(k)+":"+sj(v[k])).join(",")+"}"}
const fbKey=s=>String(s).replace(/[.#$\[\]\/%]/g,c=>"%"+c.charCodeAt(0).toString(16));
function h53(s){let a=0xdeadbeef,b=0x41c6ce57;for(let i=0;i<s.length;i++){const c=s.charCodeAt(i);a=Math.imul(a^c,2654435761);b=Math.imul(b^c,1597334677)}
  a=Math.imul(a^(a>>>16),2246822507)^Math.imul(b^(b>>>13),3266489909);b=Math.imul(b^(b>>>16),2246822507)^Math.imul(a^(a>>>13),3266489909);
  return(4294967296*(2097151&b)+(a>>>0)).toString(36)}
const lkey=e=>"l"+h53(e.t+"|"+e.id+"|"+e.s+"|"+e.r);
const META_SKIP=new Set(["items","log"]);
let _pm=null;
function posterSid(p){if(!p||typeof p!=="string"||!p.startsWith("data:"))return null;
  if(!_pm){_pm=new Map();for(const[k,d]of Object.entries(TMDB))if(d&&d.poster)_pm.set(d.poster,k)}return _pm.get(p)||null}
function itemOut(it){const o={...it};const s=posterSid(o.poster);if(s)o.poster="@tmdb:"+s;return o}
function itemIn(o){if(typeof o.poster==="string"&&o.poster.startsWith("@tmdb:")){const d=TMDB[o.poster.slice(6)];if(d&&d.poster)o.poster=d.poster}return o}
const docOf=it=>"i_"+fbKey(it.id);
function localDocs(){const m={},meta={};for(const k in DB)if(!META_SKIP.has(k))meta[k]=DB[k];m.meta=sj(meta);
  for(const it of DB.items)m[docOf(it)]=sj(itemOut(it));return m}
/* трёхстороннее слияние: b — общая основа, l — наше, r — пришедшее. Где поменял только один — берём его; конфликт поля — побеждает наше */
const isObj=v=>v!==null&&typeof v==="object"&&!Array.isArray(v);
const keyOfArr=a=>Array.isArray(a)&&a.length&&a.every(x=>isObj(x)&&(x.id!=null||x.n!=null))?(a[0].id!=null?"id":"n"):null;
function merge3(b,l,r){
  const sl=sj(l),sr=sj(r);if(sl===sr)return l;const sb=sj(b);if(sl===sb)return r;if(sr===sb)return l;
  if(isObj(l)&&isObj(r)){const bo=isObj(b)?b:{},o={};for(const k of new Set([...Object.keys(l),...Object.keys(r)])){const v=merge3(bo[k],l[k],r[k]);if(v!==undefined)o[k]=v}return o}
  const kl=keyOfArr(l),kr=keyOfArr(r);
  if(kl&&kl===kr){const toM=a=>{const m={};(Array.isArray(a)?a:[]).forEach(x=>{if(isObj(x)&&x[kl]!=null)m[x[kl]]=x});return m};
    const M=merge3(toM(b),toM(l),toM(r));const ord=[...r.map(x=>String(x[kl])),...l.map(x=>String(x[kl]))];
    const out=[],seen=new Set();for(const k of ord)if(!seen.has(k)&&M[k]!==undefined){seen.add(k);out.push(M[k])}
    if(kl==="n")out.sort((a,b)=>a.n-b.n);return out}
  return l;
}
const SY={st:"off",msg:"",es:null,rm:{d:{},log:{}},base:{},sent:{},lsent:new Set(),ready:false,pushT:null,retryT:null,busy:false,again:false};
const roomUrl=p=>`${CLOUD.url}/rooms/${encodeURIComponent(CLOUD.room)}${p}.json`;
function setSt(st,msg){SY.st=st;SY.msg=msg||{off:"Облако выключено",conn:"Подключение…",sync:"Синхронизация…",ok:"Всё синхронизировано",err:"Ошибка связи"}[st];
  const b=$("#cloudBtn");if(b){b.dataset.st=st;b.title="☁ "+SY.msg}
  const s=$("#cloudSt");if(s){s.dataset.st=st;s.textContent=SY.msg}}
function cloudClose(){clearTimeout(SY.retryT);clearTimeout(SY.pushT);if(SY.es){SY.es.close();SY.es=null}SY.ready=false}
async function cloudConnect(){
  cloudClose();
  if(!CLOUD||!CLOUD.url||!CLOUD.room){setSt("off");return}
  const saved=await IDB.get("cloud");
  SY.base=saved&&saved.room===CLOUD.room&&saved.base?saved.base:{};
  SY.sent={};SY.lsent=new Set();SY.rm={d:{},log:{}};
  setSt("conn");
  let es;try{es=new EventSource(roomUrl(""))}catch(e){setSt("err","Неверный адрес базы");return}
  SY.es=es;
  es.addEventListener("put",e=>onCloudEv(e,false));
  es.addEventListener("patch",e=>onCloudEv(e,true));
  const deny=()=>{cloudClose();setSt("err","Нет доступа к базе — проверьте правила (Rules)")};
  es.addEventListener("cancel",deny);es.addEventListener("auth_revoked",deny);
  es.onerror=()=>{if(SY.es!==es)return;SY.ready=false;
    if(es.readyState===2){setSt("err",navigator.onLine===false?"Нет интернета — переподключусь":"Не удаётся подключиться — переподключусь");clearTimeout(SY.retryT);SY.retryT=setTimeout(cloudConnect,15000)}
    else setSt("conn","Переподключение…")};
}
function setPath(root,segs,val){let o=root;for(let i=0;i<segs.length-1;i++){if(!isObj(o[segs[i]])){if(val===null)return;o[segs[i]]={}}o=o[segs[i]]}
  const k=segs[segs.length-1];if(val===null)delete o[k];else o[k]=val}
function onCloudEv(e,patch){
  let m;try{m=JSON.parse(e.data)}catch(x){return}if(!m)return;
  const segs=String(m.path||"/").split("/").filter(Boolean);
  if(!segs.length&&!patch){const d=isObj(m.data)?m.data:{};SY.rm={d:isObj(d.d)?d.d:{},log:isObj(d.log)?d.log:{}};cloudSnapshot();return}
  const subs=patch?Object.keys(m.data||{}).map(k=>segs.concat(k.split("/").filter(Boolean))):[segs];
  if(patch){for(const k in m.data||{})setPath(SY.rm,segs.concat(k.split("/").filter(Boolean)),m.data[k])}else setPath(SY.rm,segs,m.data);
  if(!isObj(SY.rm.d))SY.rm.d={};if(!isObj(SY.rm.log))SY.rm.log={};
  if(!SY.ready)return;
  let ids=new Set(),all=false,lg=false;
  for(const s of subs){if(!s.length||(s[0]==="d"&&!s[1]))all=true;else if(s[0]==="d")ids.add(s[1]);else if(s[0]==="log")lg=true}
  cloudReconcile(all?null:ids,lg);
}
function applyDoc(id,j){
  if(id==="meta"){if(j===undefined)return;const o=JSON.parse(j);for(const k of Object.keys(DB))if(!META_SKIP.has(k)&&!(k in o))delete DB[k];for(const k in o)if(!META_SKIP.has(k))DB[k]=o[k];return}
  const idx=DB.items.findIndex(it=>docOf(it)===id);
  if(j===undefined){if(idx>=0)DB.items.splice(idx,1);return}
  const o=itemIn(JSON.parse(j));
  if(idx>=0){const it=DB.items[idx];for(const k of Object.keys(it))delete it[k];Object.assign(it,o)}else DB.items.push(o);
}
function reconLog(replace){
  if(replace)DB.log=[];
  const have=new Set(DB.log.map(lkey));let add=0;
  for(const[k,v]of Object.entries(SY.rm.log||{})){if(!v||typeof v.j!=="string"||have.has(k))continue;try{DB.log.push(JSON.parse(v.j));have.add(k);add++}catch(e){logErr("Облако: запись журнала",e,1)}}
  if(add)DB.log.sort((a,b)=>a.t<b.t?-1:1);return add;
}
function cloudReconcile(ids,lg){
  const L=localDocs(),R={};for(const k in SY.rm.d){const r=SY.rm.d[k];if(r&&typeof r.j==="string")R[k]=r}
  const all=ids||new Set([...Object.keys(L),...Object.keys(R),...Object.keys(SY.base)]);
  let ch=0;const who=new Set(),names=[];
  for(const id of all){
    const r=R[id],rj=r?r.j:undefined,l=L[id],b=SY.base[id];
    if(id in SY.sent){ // ждём эха своей записи
      if(r&&r.by===DEV){if(rj===SY.sent[id]){SY.base[id]=rj;delete SY.sent[id]}continue}
      if(!r&&SY.sent[id]===null){delete SY.base[id];delete SY.sent[id];continue}
    }
    if(rj===l){if(rj===undefined)delete SY.base[id];else SY.base[id]=rj;continue}
    let nj;
    if(l===b)nj=rj;                                   // у нас не менялось — берём облачное
    else if(rj===undefined){delete SY.base[id];continue}  // в облаке нет/удалили, а у нас правки — оставляем наше
    else if(l===undefined)nj=rj===b?undefined:rj;       // мы удалили; если там правили — возвращаем
    else nj=sj(merge3(b!==undefined?JSON.parse(b):undefined,JSON.parse(l),JSON.parse(rj)));
    if(nj===undefined&&l===undefined){SY.base[id]=rj;continue}
    applyDoc(id,nj);if(rj===undefined)delete SY.base[id];else SY.base[id]=rj;ch++;
    if(r&&r.by!==DEV){who.add(r.who||"");if(id!=="meta"){try{names.push(JSON.parse(rj).title)}catch(e){logErr("Облако: чтение названия",e,1)}}}
    else if(!r&&b!==undefined&&id!=="meta")who.add("");
  }
  const la=lg||!ids?reconLog():0;
  if(ch||la)cloudApplied(who,names);else save();
}
function cloudApplied(who,names){
  save();rerenderSoft();
  if(who.size&&SY.toastOk!==false){const w=[...who].filter(Boolean);const n=names.filter(Boolean);
    toast(`☁ ${w.length?w.join(", "):"Обновление"}: ${n.length?`«${n[0]}»${n.length>1?` и ещё ${n.length-1}`:""}`:"данные обновлены"}`)}
}
function rerenderSoft(){const a=document.activeElement;if(a&&a.matches&&a.matches("#view input,#view textarea,#view select")){clearTimeout(rerenderSoft.t);rerenderSoft.t=setTimeout(rerenderSoft,1500);return}render()}
function cloudSnapshot(){
  SY.sent={};SY.lsent=new Set();
  const remote=Object.keys(SY.rm.d).length>0,fresh=!Object.keys(SY.base).length;
  if(fresh&&remote){ // первое подключение к существующей базе — берём облачную версию целиком
    IDB.set("db.beforeCloud",DB);
    const R=SY.rm.d;
    if(R.meta&&typeof R.meta.j==="string")applyDoc("meta",R.meta.j);
    DB.items=[];for(const k in R){if(k==="meta"||!R[k]||typeof R[k].j!=="string")continue;applyDoc(k,R[k].j)}
    for(const k in R)if(R[k]&&typeof R[k].j==="string")SY.base[k]=R[k].j;
    reconLog(true);DB=normalize(DB);
    SY.ready=true;setSt("ok");save();render();toast("☁ Подключено: загружены общие оценки");return;
  }
  SY.ready=true;setSt("ok");
  SY.toastOk=!fresh;cloudReconcile(null,true);SY.toastOk=true;
  cloudPush();
}
function cloudPush(){if(!SY.ready)return;clearTimeout(SY.pushT);SY.pushT=setTimeout(doCloudPush,400)}
async function cloudReq(method,p,body){
  const r=await fetch(roomUrl(p),{method,body:body===undefined?undefined:JSON.stringify(body)});
  if(!r.ok){let t="";try{t=(await r.json()).error||""}catch(e){logErr("Облако: текст ошибки",e,1)}throw new Error(r.status===401||/permission/i.test(t)?"нет доступа (правила базы)":`HTTP ${r.status} ${t}`)}
  return r.json();
}
async function doCloudPush(){
  if(!SY.ready||!CLOUD)return;if(SY.busy){SY.again=true;return}
  const L=localDocs(),upd={},now=Date.now();let n=0;
  for(const id in L)if(L[id]!==SY.base[id]&&L[id]!==SY.sent[id]){upd[id]={j:L[id],t:now,by:DEV,who:CLOUD.who||""};n++}
  for(const id in SY.base)if(!(id in L)&&SY.sent[id]!==null){upd[id]=null;n++}
  const lu={};for(const e of DB.log){const k=lkey(e);if(!SY.rm.log[k]&&!SY.lsent.has(k))lu[k]={j:sj(e)}}
  const ln=Object.keys(lu).length;
  if(!n&&!ln){if(SY.st!=="ok")setSt("ok");return}
  SY.busy=true;setSt("sync");
  for(const id in upd)SY.sent[id]=upd[id]?upd[id].j:null;
  Object.keys(lu).forEach(k=>SY.lsent.add(k));
  try{
    if(n)await cloudReq("PATCH","/d",upd);
    if(ln)await cloudReq("PATCH","/log",lu);
    setSt("ok");
  }catch(e){
    for(const id in upd)if(SY.sent[id]===(upd[id]?upd[id].j:null))delete SY.sent[id];
    Object.keys(lu).forEach(k=>SY.lsent.delete(k));
    logErr("Облако: отправка",e);setSt("err","Не отправилось ("+e.message+") — повторю");clearTimeout(SY.retryT);SY.retryT=setTimeout(()=>{if(SY.es&&SY.ready)doCloudPush()},10000);
  }finally{SY.busy=false;if(SY.again){SY.again=false;cloudPush()}}
}
function inviteLink(){const u=new URL(location.href);u.hash="";u.search="";u.searchParams.set("db",CLOUD.url.replace(/^https:\/\//,""));u.searchParams.set("room",CLOUD.room);return u.toString()}
function parseInvite(s){try{const u=new URL(s,location.href);const db=u.searchParams.get("db"),room=u.searchParams.get("room");if(!db||!room)return null;const url=normDbUrl(db);return url&&room.length>=16?{url,room}:null}catch(e){return null}}
function joinCloud(inv,ask){
  if(CLOUD&&CLOUD.url===inv.url&&CLOUD.room===inv.room){toast("☁ Уже подключено к этой базе");return false}
  if(ask&&!confirm("Подключиться к общим «Лисьим оценкам»?\n\nОценки будут синхронизироваться через облако. Данные в этом браузере заменятся общими (резервная копия останется внутри браузера)."))return false;
  CLOUD={url:inv.url,room:inv.room,who:(CLOUD&&CLOUD.who)||""};saveCloudCfg();SY.base={};cloudConnect();return true;
}
async function createCloud(rawUrl){
  const url=normDbUrl(rawUrl);if(!url){toast("Вставьте адрес базы Firebase");return}
  if(!isFbHost(url)&&!confirm("Адрес не похож на Firebase Realtime Database (…firebasedatabase.app или …firebaseio.com). Всё равно попробовать?"))return;
  const room=rid(24);
  try{const r=await fetch(`${url}/rooms/${room}.json`);if(r.status===401||r.status===403)throw new Error("доступ запрещён — вставьте правила из инструкции");if(!r.ok)throw new Error("HTTP "+r.status)}
  catch(e){toast("☁ Не получилось: "+(e.message==="Failed to fetch"?"база недоступна, проверьте адрес":e.message));return}
  CLOUD={url,room,who:(CLOUD&&CLOUD.who)||""};saveCloudCfg();SY.base={};
  await cloudConnect();render();toast("☁ База создана — теперь отправьте ссылку");
}
/* ============ приложение (PWA) ============ */
const PWA={deferred:null,
  standalone:()=>matchMedia("(display-mode: standalone)").matches||navigator.standalone===true,
  ios:/iphone|ipad|ipod/i.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1),
  web:/^https?:$/.test(location.protocol)};
if(PWA.web){
  if(!document.querySelector('link[rel="manifest"]')){const l=document.createElement("link");l.rel="manifest";l.href="manifest.webmanifest";document.head.appendChild(l)}
  if("serviceWorker" in navigator)addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(e=>logErr("Офлайн-режим (sw.js)",e,1)));
}
addEventListener("beforeinstallprompt",e=>{e.preventDefault();PWA.deferred=e;if(UI.tab==="data")render()});
addEventListener("appinstalled",()=>{PWA.deferred=null;toast("Приложение «Лисьи Оценки» установлено 🦊");if(UI.tab==="data")render()});
async function pwaInstall(){
  if(PWA.deferred){PWA.deferred.prompt();try{await PWA.deferred.userChoice}catch(e){logErr("Установка приложения",e,1)}PWA.deferred=null;if(UI.tab==="data")render();return}
  if(PWA.ios)toast("В Safari: «Поделиться» ⬆ → «На экран „Домой“»");
}
function pwaPanel(){
  let body;
  if(PWA.standalone())body=`<p>Сайт открыт как приложение ✓</p>`;
  else if(PWA.deferred)body=`<p>Иконка с лисой появится на главном экране, сайт будет открываться без адресной строки.</p><div class="row"><button class="btn pri" id="pwaInstall">📲 Установить</button></div>`;
  else if(PWA.ios&&PWA.web)body=`<p>В Safari нажмите «Поделиться» ⬆, затем «На экран „Домой“» — появится иконка с лисой.</p>`;
  else if(PWA.web)body=`<p>Откройте сайт в Chrome, Edge или Samsung Internet и выберите в меню браузера «Установить приложение» или «Добавить на главный экран».</p>`;
  else body=`<p>Установка доступна, когда сайт открыт по адресу http(s)://, а рядом с ним лежат файлы manifest.webmanifest, sw.js и папка icons.</p>`;
  return `<div class="panel" id="pwaP"><h3>Приложение</h3>${body}</div>`;
}
function cloudPanel(){
  const RULES=`{
  "rules": {
    "rooms": {
      "$room": {
        ".read": "$room.length >= 20",
        ".write": "$room.length >= 20"
      }
    }
  }
}`;
  const guide=`<details class="cdet"><summary>Как завести бесплатную базу (≈5 минут, один раз)</summary><ol>
    <li>Откройте <a href="https://console.firebase.google.com/" target="_blank" rel="noopener">console.firebase.google.com</a> → <b>Create a project</b> (Analytics можно выключить).</li>
    <li>Слева <b>Build → Realtime Database → Create Database</b>, регион <b>europe-west1</b>, режим <b>locked</b>.</li>
    <li>Вкладка <b>Rules</b> → замените всё на текст ниже → <b>Publish</b>.</li>
    <li>Скопируйте адрес базы со вкладки <b>Data</b> (вида <code>https://…firebasedatabase.app</code>) и вставьте сюда.</li></ol>
    <div class="cpre"><pre>${esc(RULES)}</pre><button class="btn sm" id="cloudRules">Копировать правила</button></div>
    <p class="dim" style="font-size:12.5px">Чужие не увидят базу без ссылки: в ней длинный случайный ключ комнаты. Но всякий, у кого есть ссылка, может менять оценки — не публикуйте её.</p></details>`;
  if(!CLOUD||!CLOUD.room)return `<div class="panel cloudp" id="cloudP"><h3>☁ Облачные оценки</h3>
    <p>Общая база на двоих: вы отправляете ссылку, второй человек открывает её и ставит оценки — у вас они появляются сразу, без экспорта файлов. Синхронизируются записи, оценки (и по сезонам), планы, теги, каталог и журнал оценок. Встроенные постеры остаются в файле.</p>
    ${guide}
    <div class="row" style="margin-top:10px"><input class="inp" id="cloudUrl" placeholder="https://….firebasedatabase.app" style="flex:1;min-width:200px"><button class="btn pri" id="cloudCreate">Создать общую базу</button></div>
    <div class="row" style="margin-top:8px"><input class="inp" id="cloudLink" placeholder="…или вставьте ссылку-приглашение" style="flex:1;min-width:200px"><button class="btn" id="cloudJoin">Подключиться</button></div></div>`;
  let host="";try{host=new URL(CLOUD.url).host}catch(e){logErr("Облако: адрес базы",e,1)}
  return `<div class="panel cloudp" id="cloudP"><h3>☁ Облачные оценки</h3>
    <div class="cstat"><span class="cst" id="cloudSt" data-st="${SY.st}">${esc(SY.msg)}</span><span class="dim">${esc(host)} · комната ${esc(CLOUD.room.slice(0,4))}…</span></div>
    <p>Отправьте ссылку второму человеку — откроет, подтвердит, и вы будете видеть оценки друг друга сразу.</p>
    <div class="row"><button class="btn pri" id="cloudCopy">📋 Скопировать ссылку</button><button class="btn" id="cloudNow">⟳ Переподключить</button><button class="btn ghost" id="cloudOff">Отключить</button></div>
    <div class="row" style="margin-top:10px"><span class="dim" style="font-size:13px">Я в этой базе —</span>
      <select class="inp" id="cloudWho" style="flex:0 1 auto;min-width:120px"><option value="">не указано</option>${DB.raters.map(r=>`<option${CLOUD.who===r?" selected":""}>${esc(r)}</option>`).join("")}</select>
      <span class="dim" style="font-size:12.5px">имя видно второму в уведомлениях</span></div></div>`;
}
function bindCloud(v){
  $("#cloudCreate",v)?.addEventListener("click",()=>createCloud($("#cloudUrl",v).value));
  $("#cloudJoin",v)?.addEventListener("click",()=>{const inv=parseInvite($("#cloudLink",v).value.trim());if(!inv){toast("Это не похоже на ссылку-приглашение");return}if(joinCloud(inv,true))render()});
  $("#cloudRules",v)?.addEventListener("click",()=>copyText($(".cpre pre",v).textContent,"Правила скопированы"));
  $("#cloudCopy",v)?.addEventListener("click",()=>copyText(inviteLink(),"Ссылка скопирована — отправьте её"));
  $("#cloudNow",v)?.addEventListener("click",()=>{cloudConnect()});
  $("#cloudOff",v)?.addEventListener("click",()=>{if(!confirm("Отключить облако в этом браузере? Данные останутся здесь, облачная копия тоже не пострадает."))return;cloudClose();CLOUD=null;saveCloudCfg();setSt("off");render()});
  $("#cloudWho",v)?.addEventListener("change",e=>{CLOUD.who=e.target.value;saveCloudCfg();toast("Сохранено")});
}
async function copyText(t,ok){try{await navigator.clipboard.writeText(t);toast(ok)}catch(e){prompt("Скопируйте:",t)}}

/* ============ версия базы и миграции ============
   db.schema — номер версии. Каждая миграция приводит базу от версии N к N+1.
   Новая миграция = новая функция в конце списка; SCHEMA считается сам. */
const POSTER_SIG=s=>String(s).length+":"+hashStr(s);   /* отпечаток картинки: узнаём «родной» постер без хранения самой картинки */
const MIGRATIONS=[
  /* 0→1: поля, появившиеся позже, приводим к одному виду */
  db=>{const ST=["watched","planned","watching","proposed"];
    for(const i of db.items){
      if(!ST.includes(i.status))i.status="watched";
      for(const f of["seenBy","noSeen"]){if(i[f]&&typeof i[f]==="object"&&!Array.isArray(i[f])){if(!Object.keys(i[f]).length)delete i[f]}else delete i[f]}
    }},
  /* 1→2: постеры-картинки внутри записей заменяем ссылками на файлы (база и облако становятся легче) */
  db=>{for(const i of db.items){
      const t=TMDB[i.id];
      if(t&&typeof t.poster==="string"&&/^posters\//.test(t.poster)&&typeof i.poster==="string"&&i.poster.startsWith("data:")&&t.posterSig&&POSTER_SIG(i.poster)===t.posterSig)i.poster=t.poster;
    }},
  /* 2→3: типы, которые создаёт каталог, должны быть в списке типов */
  db=>{for(const t of["Аниме","Дорама"])if(!db.types.includes(t))db.types.push(t)},
];
const SCHEMA=MIGRATIONS.length;
function migrate(db){
  let v=+db.schema||0;if(v>=SCHEMA){return 0}
  const from=v;
  for(;v<SCHEMA;v++){
    try{MIGRATIONS[v](db)}catch(e){logErr("Миграция базы "+v+"→"+(v+1),e);break}
  }
  db.schema=v;
  if(v>from)logErr("Миграция базы "+from+"→"+v,"база обновлена до версии "+v,1);
  return v-from;
}
function normalize(db){
  db.raters=db.raters&&db.raters.length?db.raters:["Дима","Женя"];
  db.types=db.types&&db.types.length?db.types:clone(SEED.types);
  db.items=(db.items||[]).map(i=>{
    i.id=i.id||uid("i");i.genres=i.genres||[];i.tags=i.tags||[];i.ratings=i.ratings||{};i.status=i.status||"watched";
    i.kind=i.kind||(SERIES_TYPES.includes(i.type)?"series":"movie");
    if(i.kind==="series")i.seasons=(i.seasons||[]).map(s=>({n:+s.n,ratings:s.ratings||{},order:s.order??null,watchedAt:s.watchedAt||null})).sort((a,b)=>a.n-b.n);
    return i});
  db.catalog=db.catalog||[];
  db.collections=db.collections||[];
  db.log=Array.isArray(db.log)?db.log:[];
  if(!db.opAdded){if(!db.items.some(i=>i.id==="op1"||normT(i.title)===normT("Ван Пис")))db.items.push(onePieceItem());db.opAdded=1}
  {const op=db.items.find(i=>i.id==="op1");if(op&&!op.tmdb)op.tmdb={type:"tv",id:37854}}
  db.version=1;
  if(migrate(db))setTimeout(()=>{try{save()}catch(e){}},400);
  return db;
}

/* ============ scoring ============ */
function personScore(r){if(!r)return null;return avg(CATS.map(c=>r[c.k]))}
function overallOf(ratings){if(!ratings)return null;return avg(DB.raters.map(n=>personScore(ratings[n])))}
function hasRatings(r){return r&&DB.raters.some(n=>isNum(personScore(r[n])))}
function seasonsRated(it){return (it.seasons||[]).filter(s=>hasRatings(s.ratings))}
/* whole-item score: explicit "целиком" ratings, otherwise average of seasons */
function itemScore(it,rater){
  if(it.kind==="series"&&!hasRatings(it.ratings)){
    const ss=seasonsRated(it);if(!ss.length)return null;
    return avg(ss.map(s=>rater?personScore(s.ratings[rater]):overallOf(s.ratings)));
  }
  return rater?personScore(it.ratings[rater]):overallOf(it.ratings);
}
function itemCats(it,rater){ // average per category
  let srcs=[];
  if(it.kind==="series"&&!hasRatings(it.ratings))srcs=seasonsRated(it).map(s=>s.ratings);else srcs=[it.ratings];
  const o={};for(const c of CATS){o[c.k]=avg(srcs.flatMap(r=>(rater?[rater]:DB.raters).map(n=>r[n]?.[c.k])))}return o;
}
function totalMinutes(it){
  if(it.kind!=="series")return isNum(it.duration)?it.duration:parseDurAvg(it.duration);
  if(isNum(it.totalDuration))return it.totalDuration;
  const ed=parseDurAvg(it.episodeDuration);if(ed&&isNum(it.episodes))return ed*it.episodes;return null;
}
function watchedMinutes(it){
  if(it.status==="watching"){const ed=parseDurAvg(it.episodeDuration),dn=epsDone(it);return ed&&dn?ed*dn:0}
  if(it.status!=="watched")return 0;
  const t=totalMinutes(it);if(!t)return 0;
  if(it.kind==="series"&&it.seasonsTotal&&it.seasons?.length&&!hasRatings(it.ratings)){return t*Math.min(1,seasonsRated(it).length/it.seasonsTotal)}
  return t;
}
/* ---- прогресс просмотра ---- */
function seasonEps(it,n){const a=it.seasonEpisodes;if(Array.isArray(a)&&a.length)return isNum(a[n-1])&&a[n-1]>0?a[n-1]:null;if(isNum(it.episodes)&&isNum(it.seasonsTotal)&&it.seasonsTotal>0)return Math.round(it.episodes/it.seasonsTotal);return null}
function totalEps(it){if(isNum(it.episodes))return it.episodes;const a=it.seasonEpisodes;if(Array.isArray(a)&&a.length&&(a.every(isNum)||isArc(it)))return a.filter(isNum).reduce((x,y)=>x+y,0);return null}
function absEp(it){const p=it.progress;if(!p||p.season==null)return p?p.episode||0:null;const a=arcOf(it,p.season);return a?a.from-1+(p.episode||0):null}
function epsDone(it){const p=it.progress;if(!p)return null;if(p.season==null)return p.episode||0;let n=0;for(let k=1;k<p.season;k++){const e=seasonEps(it,k);if(e==null)return null;n+=e}return n+(p.episode||0)}
function progPct(it){const d=epsDone(it),t=totalEps(it);if(d==null||!t)return null;return Math.max(0,Math.min(1,d/t))}
function progLabel(it,short){const p=it.progress;if(!p)return"";
  if(p.season==null){const t=totalEps(it),e=p.episode||0;return short?`${e}${t?"/"+t:""} сер.`:`${e}${t?" из "+t:""} ${plural(t||e,"серия","серии","серий")}`}
  const e=seasonEps(it,p.season);
  if(isArc(it)){const ab=absEp(it);return short?`${segName(it,p.season)} · эп. ${ab||0}`:`Арка «${segName(it,p.season)}» · серия ${p.episode||0}${e?" из "+e:""} · эпизод ${ab||0}`}
  return short?`S${p.season} · E${p.episode||0}${e?"/"+e:""}`:`Сезон ${p.season} · серия ${p.episode||0}${e?" из "+e:""}`}
function contList(withFrozen){
  const out=[];
  for(const it of DB.items){
    if(it.kind!=="series")continue;
    if(it.frozen&&!withFrozen)continue;
    if(it.status==="watching")out.push({it,kind:"w"});
    else if(it.status==="watched"&&it.seasonsTotal){const mx=Math.max(0,...(it.seasons||[]).map(s=>s.n));if(mx&&mx<it.seasonsTotal)out.push({it,kind:"n",next:mx+1})}
  }
  return out.sort((a,b)=>(a.kind===b.kind?0:a.kind==="w"?-1:1)||(b.it.progressAt||0)-(a.it.progressAt||0));
}
function frozenList(){return contList(true).filter(x=>x.it.frozen).sort((a,b)=>(b.it.frozenAt||0)-(a.it.frozenAt||0))}
function canFreeze(it){return contList(true).some(x=>x.it===it)}
function frozenHTML(F){
  if(!F.length)return"";
  return `<details class="frz"${UI.frzOpen?" open":""}><summary title="Эти сериалы не показываются в «Продолжить просмотр»"><i class="ico ico-snow frz-ic"></i> Заморожено <span class="frz-n">${F.length}</span></summary>
    <div class="frz-row">${F.map(({it,kind,next})=>`<div class="frz-c" data-open="${it.id}"><div class="mini">${posterHTML(it,false)}</div><div class="frz-t"><b>${esc(it.title)}</b><small>${kind==="w"?esc(progLabel(it,true)||"в процессе"):isArc(it)?"следующая арка не начата":`ждёт сезона ${next}`}${it.frozenAt?` · с ${fmtAt(new Date(it.frozenAt).toISOString(),false)}`:""}</small></div><button class="btn sm" data-unfreeze="${it.id}" title="Вернуть в «Продолжить просмотр»">Разморозить</button></div>`).join("")}</div>
  </details>`;
}
function contHTML(){
  const L=contList(),F=frozenList();if(!L.length&&!F.length)return"";
  if(!L.length)return `<section class="cont">${frozenHTML(F)}</section>`;
  return `<section class="cont"><div class="cont-h"><h3>Продолжить просмотр</h3><span class="nb">${L.length}</span></div><div class="cont-row">${L.map(({it,kind,next},i)=>{
    const pc=kind==="w"?progPct(it):null;
    return `<div class="ccard ${kind==="n"?"nx":""}" data-open="${it.id}"><div class="mini">${posterHTML(it,false)}</div><div class="cb">
      <div class="ch"><div class="ct" title="${esc(it.title)}">${esc(it.title)}</div><div class="ctools">${kind==="w"?`<button class="ctool" data-prog="${it.id}" title="Изменить прогресс" aria-label="Изменить прогресс"><i class="ico ico-edit"></i></button><button class="ctool" data-finish="${it.id}" title="Досмотрели полностью" aria-label="Досмотрели полностью"><i class="ico ico-check"></i></button>`:""}<button class="ctool" data-freeze="${it.id}" title="Заморозить: пока не продолжаем, убрать из списка" aria-label="Заморозить"><i class="ico ico-snow"></i></button></div></div>
      <div class="cm">${kind==="w"?esc(progLabel(it)):isArc(it)?`Арка «${esc(segName(it,next))}» ещё не начата`:`Сезон ${next} ещё не начат · всего ${it.seasonsTotal}`}</div>
      ${kind==="w"?`<div class="prog"><i style="width:${pc!=null?(pc*100).toFixed(1):0}%"></i></div><div class="cm2">${pc!=null?`Просмотрено ${Math.round(pc*100)}%`:"Укажите число серий, чтобы видеть процент"}</div>`:`<div class="prog"><i style="width:${((next-1)/it.seasonsTotal*100).toFixed(1)}%"></i></div>`}
      <div class="cact">${kind==="w"?`<button class="btn sm pri" data-ep="${it.id}">＋1 серия</button>${it.progress?.season!=null?`<button class="btn sm" data-sdone="${it.id}">${segW(it,"done")}</button>`:""}`:`<button class="btn sm pri" data-start="${it.id}" data-sn="${next}">▶ ${isArc(it)?"Начать арку":"Начать сезон "+next}</button>`}</div>
    </div></div>`}).join("")}</div>${frozenHTML(F)}</section>`;
}
function setFrozen(id,on,inDlg){
  const it=itemById(id);if(!it)return;
  if(on){it.frozen=true;it.frozenAt=Date.now()}else{delete it.frozen;delete it.frozenAt}
  commit();
  if(inDlg)openDetail(id,null);
  toast(on?`Заморожено: «${it.title}»`:`Разморожено: «${it.title}»`);
}
function bumpEp(id){
  const it=itemById(id);if(!it)return;delete it.frozen;delete it.frozenAt;
  const p=it.progress||(it.progress={season:it.seasonsTotal?1:null,episode:0});
  p.episode=(p.episode||0)+1;it.progressAt=Date.now();
  if(p.season!=null){const e=seasonEps(it,p.season);if(e&&p.episode>=e){p.episode=e;commit();toast(isArc(it)?`Арка «${segName(it,p.season)}» досмотрена — оцените её`:`Сезон ${p.season} досмотрен — оцените его`);seasonDone(id);return}}
  else{const t=totalEps(it);if(t&&p.episode>=t){p.episode=t;commit();toast("Все серии просмотрены — поставьте оценку");openRate(id,{finish:true,season:null});return}}
  commit();toast(`${it.title}: ${progLabel(it)}`);
}
function seasonDone(id){
  const it=itemById(id);if(!it)return;const S=it.progress?.season||1;
  openRate(id,{season:S,onSaved:()=>{
    if(it.seasonsTotal&&S>=it.seasonsTotal){it.status="watched";delete it.progress;it.order=it.order||nextOrder();it.watchedAt=it.watchedAt||new Date().toISOString().slice(0,10);toast("Сериал досмотрен полностью 🦊")}
    else{it.progress={season:S+1,episode:0};it.progressAt=Date.now()}
  }});
}
function startWatching(id,season){
  const it=itemById(id);if(!it)return;delete it.frozen;delete it.frozenAt;
  it.status="watching";it.progress={season:season!=null?season:(it.seasonsTotal?1:null),episode:0};it.progressAt=Date.now();
  commit();toast("Добавлено в «Продолжить просмотр»");
}
function openProgress(id){
  const it=itemById(id);if(!it)return;
  const p=it.progress||{season:it.seasonsTotal?1:null,episode:0};
  let bySeason=p.season!=null;
  const html=`<div class="dh"><h2>Прогресс: ${esc(it.title)}</h2><button class="btn icon ghost" data-close>✕</button></div>
  <div class="db">
    <div class="row" style="margin-bottom:14px"><div class="seg" id="pMode"><button data-v="s" class="${bySeason?"on":""}">${isArc(it)?"Арка":"Сезон"} и серия</button><button data-v="e" class="${bySeason?"":"on"}">Только серии</button></div></div>
    <div class="form">
      <div class="f s3" id="pSW"><label>${isArc(it)?"Арка №":"Сезон"}</label><div class="stepper"><button class="btn icon sm" data-st="pS:-1">−</button><input class="inp" id="pS" type="number" min="1" value="${p.season||1}"><button class="btn icon sm" data-st="pS:1">＋</button></div></div>
      <div class="f s3"><label id="pEL">Просмотрено серий</label><div class="stepper"><button class="btn icon sm" data-st="pE:-1">−</button><input class="inp" id="pE" type="number" min="0" value="${p.episode||0}"><button class="btn icon sm" data-st="pE:1">＋</button></div></div>
    </div>
    <p class="dim" id="pInfo" style="font-size:13px;margin:14px 0 0"></p>
  </div>
  <div class="df"><button class="btn danger ghost" id="pStop">Убрать из «Продолжить»</button><div class="sp"></div><button class="btn" data-close>Отмена</button><button class="btn pri" id="pSave">Сохранить</button></div>`;
  const d=showDlg(html);
  const info=()=>{$("#pSW",d).style.display=bySeason?"":"none";$("#pEL",d).textContent=bySeason?"Просмотрено серий в сезоне":"Просмотрено серий всего";
    const tmp={...it,progress:{season:bySeason?(+$("#pS",d).value||1):null,episode:+$("#pE",d).value||0}};
    const e=bySeason?seasonEps(it,tmp.progress.season):totalEps(it),pc=progPct(tmp);
    $("#pInfo",d).textContent=[bySeason&&isArc(it)?`Арка «${segName(it,tmp.progress.season)}» (${segTip(it,tmp.progress.season).split(" · ")[1]||""}).`:"",e?`${bySeason?(isArc(it)?"В арке":"В сезоне"):"Всего"} ${e} ${plural(e,"серия","серии","серий")}.`:"Число серий не указано — его можно добавить в карточке («Серий всего» или «Серий по сезонам»).",pc!=null?`Прогресс: ${Math.round(pc*100)}%.`:""].join(" ")};
  info();
  $("#pMode",d).onclick=e=>{const b=e.target.closest("[data-v]");if(!b)return;bySeason=b.dataset.v==="s";$$("#pMode button",d).forEach(x=>x.classList.toggle("on",x===b));info()};
  d.querySelectorAll("[data-st]").forEach(b=>b.onclick=()=>{const[f,dl]=b.dataset.st.split(":");const inp=$("#"+f,d);inp.value=Math.max(f==="pS"?1:0,(+inp.value||0)+ +dl);info()});
  ["#pS","#pE"].forEach(q=>$(q,d).addEventListener("input",info));
  $("#pSave",d).onclick=()=>{it.status="watching";it.progress={season:bySeason?(+$("#pS",d).value||1):null,episode:Math.max(0,+$("#pE",d).value||0)};it.progressAt=Date.now();closeDlg();commit();toast("Прогресс сохранён")};
  $("#pStop",d).onclick=()=>{delete it.progress;it.status=hasRatings(it.ratings)||seasonsRated(it).length?"watched":"planned";closeDlg();commit();toast(it.status==="watched"?"Перенесено в просмотренное":"Возвращено в планы")};
}
function comicsMap(){const m={};for(const c of DB.catalog){if(c.link?.itemId){(m[c.link.itemId]=m[c.link.itemId]||[]).push(c)}}return m}
function itemById(id){return DB.items.find(i=>i.id===id)}
function nextOrder(){return Math.max(0,...DB.items.map(i=>i.order||0))+1}
function durLine(it){
  const p=[];
  if(it.kind==="series"){
    if(it.seasonsTotal)p.push(segCount(it,it.seasonsTotal));
    const te=it.episodes||(isArc(it)?totalEps(it):null);if(te)p.push((isArc(it)&&!it.episodes?"≥ ":"")+te+" "+plural(te,"серия","серии","серий"));
    if(it.episodeDuration)p.push(String(it.episodeDuration).replace("-","–")+" мин/серия");
    const t=totalMinutes(it);if(t)p.push("всего ≈ "+fmtDur(t));
  }else if(it.duration){p.push(isNum(it.duration)?fmtDur(it.duration):it.duration+" мин")}
  return p.join(" · ");
}

/* ============ entries for watched tab ============ */
function buildEntries(mode){
  const out=[];const cm=comicsMap();
  for(const it of DB.items){
    if(it.status==="planned"||it.status===PROP)continue;
    if(it.status==="watching"&&!hasRatings(it.ratings)&&!seasonsRated(it).length)continue;
    const cs=cm[it.id]||[];
    if(mode==="seasons"&&it.kind==="series"&&seasonsRated(it).length){
      for(const s of seasonsRated(it)){
        const per={};for(const n of DB.raters)per[n]=personScore(s.ratings[n]);
        const cats={};for(const c of CATS)cats[c.k]=avg(DB.raters.map(n=>s.ratings[n]?.[c.k]));
        const ccs=cs.filter(c=>c.link.season==null||c.link.season===s.n);
        out.push({it,season:s.n,title:segTitle(it,s.n),score:overallOf(s.ratings),per,cats,comics:ccs,order:(it.order||0)+(s.n/1000)});
      }
      continue;
    }
    const per={};for(const n of DB.raters)per[n]=itemScore(it,n);
    const sr=it.kind==="series"?seasonsRated(it).length:0;
    out.push({it,season:null,title:it.title,score:itemScore(it),per,cats:itemCats(it),comics:cs,order:it.order||0,sub:sr?segCount(it,sr):""});
  }
  return out;
}
function comicsMatch(e,f){
  if(f==="all")return true;
  const fr=e.comics.map(c=>c.franchise);
  if(f==="none")return !fr.length;
  if(f==="any")return fr.length>0;
  if(f==="marvel")return fr.some(x=>MARVEL.includes(x));
  return fr.includes(f);
}
function mcuNum(e){const c=e.comics.find(c=>c.franchise==="MCU");return c?c.num:9999}

/* ============ router / shell ============ */
function renderTabs(){
  const nav=$("#tabs"),x=nav.scrollLeft;
  nav.innerHTML=TABS.filter(t=>!tabHidden(t.id)).map(t=>`<a href="#${t.id}" class="${UI.tab===t.id?"on":""}" draggable="false"><span class="ic"><i class="ico ico-${t.id}"></i></span><span class="ln">${t.n}</span><span class="sn">${t.s}</span>${t.id==="data"&&errUnseen()?`<span class="nb err" title="Были сбои — откройте журнал ошибок на вкладке «Данные»">!</span>`:""}${t.id==="plan"&&DB&&contList().length?`<span class="nb" title="Продолжить просмотр">${contList().length}</span>`:""}</a>`).join("");
  nav.scrollLeft=x;tabsArrows();
  if(renderTabs.last!==UI.tab){renderTabs.last=UI.tab;const a=$("a.on",nav);if(a){const l=a.offsetLeft-nav.offsetLeft,r=l+a.offsetWidth;if(l<nav.scrollLeft+30||r>nav.scrollLeft+nav.clientWidth-30)nav.scrollTo({left:l-nav.clientWidth/2+a.offsetWidth/2,behavior:"smooth"})}}
}
/* прокрутка вкладок мышью: стрелки, колесо, перетаскивание */
function tabsArrows(){const n=$("#tabs"),w=$("#tabsW");if(!n||!w)return;const max=n.scrollWidth-n.clientWidth;
  w.classList.toggle("tcl",n.scrollLeft>2);w.classList.toggle("tcr",n.scrollLeft<max-2)}
(function(){
  const n=$("#tabs");
  n.addEventListener("scroll",tabsArrows,{passive:true});window.addEventListener("resize",tabsArrows);
  n.addEventListener("wheel",e=>{if(n.scrollWidth<=n.clientWidth)return;const d=Math.abs(e.deltaX)>Math.abs(e.deltaY)?e.deltaX:e.deltaY;if(!d)return;e.preventDefault();n.scrollLeft+=d},{passive:false});
  $$(".tarr").forEach(b=>b.addEventListener("click",()=>n.scrollBy({left:(b.dataset.d==="l"?-1:1)*Math.max(160,n.clientWidth*.6),behavior:"smooth"})));
  let drag=null;
  n.addEventListener("pointerdown",e=>{if(e.pointerType!=="mouse"||e.button!==0)return;drag={x:e.clientX,s:n.scrollLeft,moved:false}});
  window.addEventListener("pointermove",e=>{if(!drag)return;const dx=e.clientX-drag.x;if(Math.abs(dx)>5){drag.moved=true;n.classList.add("drag")}if(drag.moved)n.scrollLeft=drag.s-dx});
  window.addEventListener("pointerup",()=>{if(!drag)return;const m=drag.moved;drag=null;n.classList.remove("drag");if(m){const block=e=>{e.preventDefault();e.stopPropagation()};n.addEventListener("click",block,{capture:true,once:true});setTimeout(()=>n.removeEventListener("click",block,{capture:true}),50)}});
})();
function route(){let h=location.hash.slice(1);if(TABALIAS[h]){UI.sub=TABALIAS[h];h="analytics"}
  if(TABS.some(t=>t.id===h)&&!tabHidden(h))UI.tab=h;
  if(location.hash.slice(1)!==UI.tab)history.replaceState(null,"","#"+UI.tab);
  saveUI();render(true)}
window.addEventListener("hashchange",route);
function render(top){
  renderTabs();
  const v=$("#view");
  const f={watched:vWatched,plan:vPlan,comics:vComics,analytics:vAnalytics,catalog:vCatalog,quiz:vQuiz,guide:vGuide,data:vData}[UI.tab]||vWatched;
  const y=window.scrollY,switched=render.lastTab!==UI.tab;render.lastTab=UI.tab;
  v.innerHTML=f();
  if(switched){v.classList.remove("tab-in");void v.offsetWidth;v.classList.add("tab-in")}
  bindView();
  skeletonBind(v);lazyObserve(v);bindReorder(v);timeDraw(v);
  if(UI.tab==="catalog")recoEnsure();
  if(UI.tab==="catalog")catEnsure();
  if(UI.tab==="plan")planEnsure();
  if(top)window.scrollTo(0,0);else window.scrollTo(0,y);
}
function setUI(k,v){UI[k]=v;saveUI();render()}

/* ---- клавиатура: всё, что открывается по клику, берёт фокус и открывается Enter / пробелом ---- */
const A11Y_SEL='[data-open]:not(a):not(button):not(input):not(select),.cp[data-cprev],[data-ucopen]:not(a):not(button)';
function a11yLabel(el){
  const c=el.closest(".card,.cc,.uc,.r,tr,.geo-it,.frz-c")||el;
  const t=c.querySelector(".t,.cbody b,.ttl,td:nth-child(2),b,h3")||c;
  return "Открыть: "+String(t.textContent||"").replace(/\s+/g," ").trim().slice(0,80);
}
function a11yPass(root){
  for(const el of(root||document).querySelectorAll(A11Y_SEL)){
    if(el.hasAttribute("tabindex"))continue;
    el.tabIndex=0;el.setAttribute("role","button");el.setAttribute("aria-label",a11yLabel(el));
  }
}
(function(){
  let t=0;const run=()=>{t=0;a11yPass()};
  new MutationObserver(()=>{if(!t)t=requestAnimationFrame(run)}).observe(document.body,{childList:true,subtree:true});
  document.addEventListener("keydown",e=>{
    if(e.key!=="Enter"&&e.key!==" ")return;
    const el=e.target;if(!el||!el.matches||!el.matches(A11Y_SEL)||e.target!==e.currentTarget&&el.closest("button,a,input,select,textarea")!==null&&!el.matches(A11Y_SEL))return;
    e.preventDefault();el.click();
  });
})();

/* ============ VIEW: watched ============ */
const GROUPS=[["none","Без группировки"],["type","По типу"],["year","По году выхода"],["decade","По десятилетию"],["genre","По жанру"],["score","По оценке"],["month","По месяцу просмотра"]];
const MONTHS=["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];
function wScoreFn(){const r=UI.rater==="all"?null:UI.rater;return e=>r?e.per[r]:e.score}
function wMatch(e,sc,skipBucket){
  if(UI.type!=="all"&&e.it.type!==UI.type)return false;
  if(!comicsMatch(e,UI.comics))return false;
  if(UI.genre&&!e.it.genres.includes(UI.genre))return false;
  if(UI.tag&&!(e.it.tags||[]).includes(UI.tag))return false;
  if(UI.rater!=="all"){const has=isNum(e.per[UI.rater]);if(UI.unr==="only"?has:!has)return false}
  if(UI.q&&!e.title.toLowerCase().includes(UI.q.toLowerCase()))return false;
  if(!skipBucket&&UI.bucket){const b=BUCKETS.find(b=>b.k===UI.bucket);const v=sc(e);if(!isNum(v)||!b.f(v))return false}
  return true;
}
function wRanks(list,sc){
  const sorted=list.filter(e=>isNum(sc(e))).sort((a,b)=>sc(b)-sc(a));
  const rk=new Map();let r=0,prev=null;for(const e of sorted){const v=Math.round(sc(e)*100);if(v!==prev){r++;prev=v}rk.set(e,r)}
  return rk;
}
function wSort(list,sc){
  const d=UI.dir,R=DB.raters;
  const S={
    order:(a,b)=>(a.order-b.order)*d,
    score:(a,b)=>((sc(a)??-1)-(sc(b)??-1))*d||cmpRu(a.title,b.title),
    title:(a,b)=>cmpRu(a.title,b.title)*d,
    year:(a,b)=>((a.it.year||0)-(b.it.year||0))*d||cmpRu(a.title,b.title),
    mcu:(a,b)=>(mcuNum(a)-mcuNum(b))*d||a.order-b.order,
    diff:(a,b)=>(Math.abs((a.per[R[0]]??0)-(a.per[R[1]]??0))-Math.abs((b.per[R[0]]??0)-(b.per[R[1]]??0)))*d,
    world:(a,b)=>{const g=e=>{const w=worldScore(e.it),v=sc(e);return isNum(w)&&isNum(v)?v-w:-99};return (g(a)-g(b))*d||cmpRu(a.title,b.title)},
  };
  return list.sort(S[UI.sort]||S.order);
}
function watchedState(){
  const all=buildEntries(UI.mode),sc=wScoreFn(),rater=UI.rater==="all"?null:UI.rater;
  const list=wSort(all.filter(e=>wMatch(e,sc)),sc);
  return {all,list,sc,rater,rk:wRanks(list,sc)};
}
function wActiveFilters(){return [UI.type!=="all",UI.bucket,UI.comics!=="all",UI.genre,UI.rater!=="all",UI.rater!=="all"&&UI.unr==="only"].filter(Boolean).length}
function wHasFilters(){return (UI.rater!=="all"&&UI.unr==="only")||UI.type!=="all"||UI.bucket||UI.comics!=="all"||UI.genre||UI.tag||UI.q||UI.rater!=="all"}

/* --- components --- */
function segHTML(key,opts,cur){return `<div class="seg" data-ui="${key}">${opts.map(([v,n,t])=>`<button data-v="${esc(v)}" class="${cur===v?"on":""}"${t?` title="${t}"`:""}>${n}</button>`).join("")}</div>`}
function selectHTML(key,opts,cur){return `<select class="inp" data-uis="${key}">${opts.map(([v,n])=>`<option value="${esc(v)}" ${cur===v?"selected":""}>${n}</option>`).join("")}</select>`}
function chipHTML(v,label,on,count){return `<button class="chip ${on?"on":""}" data-v="${esc(v)}">${label}${count!=null?` <small>${count}</small>`:""}</button>`}
function fltHTML(label,inner,style){return `<div class="flt"${style?` style="${style}"`:""}><label>${label}</label>${inner}</div>`}

function wHeaderHTML(st){
  return `<div class="ptitle"><div><h1>Просмотрено</h1><p>${st.all.length} ${plural(st.all.length,"запись","записи","записей")} · оценки ${DB.raters.map(esc).join(" и ")}</p></div>
    <div class="row">
      ${segHTML("mode",[["whole","Сериалы целиком"],["seasons","По сезонам"]],UI.mode)}
      ${segHTML("view",[["cards","Карточки","С постерами"],["posters","Постеры","Только постеры"],["list","Список","Таблица"]],UI.view)}
      <button class="hide-sc-btn${UI.hideScores?" on":""}" id="hideScBtn" title="${UI.hideScores?"Показать оценки":"Скрыть оценки"}"><i class="ico ico-${UI.hideScores?"eyeoff":"eye"}"></i></button>
      ${UI.view==="cards"?`<button class="hide-sc-btn show-m${UI.compact?" on":""}" id="compactBtn" title="${UI.compact?"Обычные карточки":"Компактные карточки"}"><i class="ico ico-rows"></i></button>`:""}
      ${UI.view!=="list"?`<button class="hide-sc-btn${UI.reorder?" on":""}" id="reorderBtn" title="${UI.reorder?"Готово":"Переставить карточки"}"><i class="ico ico-move"></i></button>`:""}
    </div></div>`;
}
function wFiltersHTML(st){
  const sc=st.sc,typesPresent={};st.all.forEach(e=>typesPresent[e.it.type]=(typesPresent[e.it.type]||0)+1);
  const genres=[...new Set(DB.items.flatMap(i=>i.genres))].sort(cmpRu);
  const bc={};BUCKETS.forEach(b=>bc[b.k]=st.all.filter(e=>{if(UI.type!=="all"&&e.it.type!==UI.type)return false;if(!comicsMatch(e,UI.comics))return false;const v=sc(e);return isNum(v)&&b.f(v)}).length);
  UI.bucket=null;const n=wActiveFilters(),tags=allTags();
  return `<button class="btn fbtn" id="fBtn" style="margin-bottom:12px">⚲ Фильтры${n?" · "+n:""} ${UI.fopen?"▴":"▾"}</button>
  <div class="panel fpanel ${UI.fopen?"open":""}">
    ${fltHTML("Тип контента",`<div class="chips" data-ui="type">${chipHTML("all","Все",UI.type==="all",st.all.length)}${DB.types.filter(t=>typesPresent[t]).map(t=>chipHTML(t,esc(t),UI.type===t,typesPresent[t])).join("")}</div>`)}
    ${fltHTML("Кинокомиксы",selectHTML("comics",[["all","Все"],["any","Только кинокомиксы"],["marvel","Marvel (все)"],["MCU","Marvel · MCU"],["CLASSIC","Marvel · Классика"],["XMEN","Marvel · Люди Икс"],["DC","DC"],["none","Без кинокомиксов"]],UI.comics))}
    ${fltHTML("Чей топ",segHTML("rater",[["all","Общий"],...DB.raters.map(r=>[r,esc(r)])],UI.rater))}
    ${UI.rater!=="all"?fltHTML("Без оценки",segHTML("unr",[["hide","Скрыть"],["only","Только без оценки "+esc(UI.rater)]],UI.unr==="only"?"only":"hide")):""}
    ${fltHTML("Жанр",selectHTML("genre",[["","Любой"],...genres.map(g=>[g,esc(g)])],UI.genre))}
    ${tags.length?fltHTML("Тег",selectHTML("tag",[["","Любой"],...tags.map(([t,c])=>[t,`#${esc(t)} (${c})`])],UI.tag)):""}
  </div>`;
}
function wToolbarHTML(st){
  const scores=st.list.map(st.sc).filter(isNum),mins=st.list.filter(e=>e.season==null).reduce((s,e)=>s+watchedMinutes(e.it),0);
  const rAvg=n=>avg(st.list.map(e=>e.per[n]));
  const sortOpts=[["order","По порядку просмотра"],["score",st.rater?"По оценке: "+esc(st.rater):"По итоговой оценке"],["title","По названию"],["year","По году выхода"],["mcu","Хронология Marvel"],["diff","По расхождению оценок"],["world","Мы выше мира ↔ ниже"]];
  return `<div class="toolbar">
    <div class="search"><input class="inp" id="q" placeholder="Поиск по названию" value="${esc(UI.q)}"></div>
    ${selectHTML("sort",sortOpts,UI.sort)}
    <button class="btn icon" id="dirBtn" title="Направление сортировки">${UI.dir>0?"↑":"↓"}</button>
    ${selectHTML("group",GROUPS,UI.group||"none")}
    ${wHasFilters()?`<button class="btn ghost sm" id="resetF">✕ Сбросить фильтры</button>`:""}
    <div class="sp"></div>
    <button class="btn sm" data-shot="#wlist" data-shot-title="Просмотрено${st.rater?" · топ "+esc(st.rater):""}${UI.type!=="all"?" · "+esc(UI.type):""}${UI.tag?" · #"+esc(UI.tag):""}" title="Скопировать список картинкой"><i class="ico ico-cam"></i> Картинкой</button>
    <span class="muted" style="font-size:13.5px">Показано <b>${st.list.length}</b> · средняя <b>${f2(avg(scores))}</b> ${DB.raters.map(n=>`· ${esc(n)} <b>${f2(rAvg(n))}</b>`).join(" ")}${mins?` · ≈ ${hoursStr(mins)}`:""}</span>
  </div>`;
}
function vWatched(){
  const st=watchedState();
  let body;
  if(!st.list.length)body=`<div class="empty">Ничего не найдено. Попробуйте сбросить фильтры.</div>`;
  else if(UI.reorder&&UI.view!=="list")body=gridHTML(st.list,st.rk,st.sc,UI.view==="posters","all",true);
  else body=groupedHTML(st);
  return `${wHeaderHTML(st)}
  ${UI.reorder?`<div class="reorder-bar"><span>Перетащите карточку на новое место${matchMedia("(pointer:coarse)").matches?", взявшись за значок ⠿":""}. Порядок сохраняется сразу после отпускания.</span><button class="btn sm pri" id="reorderDone">Готово</button></div>`:`${contHTML()}`}
  ${wFiltersHTML(st)}
  ${wToolbarHTML(st)}
  ${UI.view!=="list"?`${gridSizerHTML()}`:""}
  <div id="wlist">${body}</div>`;
}

/* --- grouping --- */
function groupKey(e,sc,g){
  const it=e.it;
  switch(g){
    case "type":return [it.type,it.type,DB.types.indexOf(it.type)];
    case "year":return it.year?[String(it.year),String(it.year),-it.year]:["—","Год не указан",1e9];
    case "decade":{if(!it.year)return["—","Год не указан",1e9];const d=Math.floor(it.year/10)*10;return [String(d),d+"-е",-d]}
    case "genre":{const g0=it.genres[0];return g0?[g0,g0,0]:["—","Без жанра",1e9]}
    case "score":{const v=sc(e);if(!isNum(v))return["na","Без оценки",99];const i=BUCKETS.findIndex(b=>b.f(v));return [BUCKETS[i].k,"Оценка "+BUCKETS[i].n,i]}
    case "month":{const w=it.watchedAt?String(it.watchedAt).slice(0,7):"";if(!/^\d{4}-\d\d$/.test(w))return["—","Дата не указана",1e12];const[y,m]=w.split("-");return [w,MONTHS[+m-1]+" "+y,-(+y*12+ +m)]}
  }
  return ["all","",0];
}
function groupEntries(list,sc,g){
  const m=new Map();
  for(const e of list){const[k,label,ord]=groupKey(e,sc,g);if(!m.has(k))m.set(k,{k,label,ord,items:[]});m.get(k).items.push(e)}
  const out=[...m.values()];
  out.sort((a,b)=>g==="genre"?(a.ord-b.ord)||(b.items.length-a.items.length)||cmpRu(a.label,b.label):(a.ord-b.ord)||cmpRu(a.label,b.label));
  return out;
}
function groupedHTML(st){
  const g=UI.group||"none",posters=UI.view==="posters";
  const inner=(items,key)=>UI.view==="list"?tableHTML(items,st.rk,st.sc,key):gridHTML(items,st.rk,st.sc,posters,key);
  if(g==="none")return inner(st.list,"all");
  const coll=UI.gColl||{};
  return groupEntries(st.list,st.sc,g).map(G=>{
    const ck=g+":"+G.k,closed=!!coll[ck],a=avg(G.items.map(st.sc));
    return `<section class="grp${closed?" closed":""}">
      <button class="grp-h" data-gtoggle="${esc(ck)}" aria-expanded="${!closed}"><span class="grp-ar">▾</span><b>${esc(G.label)}</b><small>${G.items.length} ${plural(G.items.length,"запись","записи","записей")}${isNum(a)?` · средняя ${f2(a)}`:""}</small></button>
      ${closed?"":`<div class="grp-b">${inner(G.items,ck)}</div>`}
    </section>`}).join("");
}

/* --- cards & rows --- */
function entryKey(e){return e.it.id+(e.season!=null?":"+e.season:"")}
function cardHTML(e,i,rk,sc,reorder){
  const it=e.it,r=rk.get(e);
  return `<div class="card${it.poster?" sk":""}" ${reorder?`data-id="${esc(it.id)}"`:`data-open="${entryKey(e)}"`}>
      <div class="poster">${posterHTML(it)}${r?`<span class="rk">#${r}</span>`:""}<span class="sct">${scBadge(sc(e),"big")}</span>${reorder?`<span class="drag-h" aria-hidden="true">⠿</span>`:""}</div>
      <div class="body">
        <div class="t">${esc(e.title)}</div>
        <div class="m"><span class="tag">${esc(it.type)}</span>${it.status==="watching"&&e.season==null?`<span class="stt c" style="padding:1px 7px">Смотрим</span>`:""}${it.year?`<span>${it.year}</span>`:""}${e.sub?`<span>${e.sub}</span>`:""}${extChip(it)}</div>
        ${it.genres.length?`<div class="gen">${it.genres.map(esc).join(", ")}</div>`:""}${tagChips(it)}
        <div class="pr">${DB.raters.map(n=>`<span>${esc(n)} ${scBadge(e.per[n],"sm")}</span>`).join("")}</div>
      </div>
    </div>`;
}
function rowHTML(e,rk,sc){
  const it=e.it,w=e.season==null?worldScore(it):null;
  return `<tr data-open="${entryKey(e)}">
      <td class="num">${rk.get(e)||""}</td>
      <td><div class="tt"><div class="mini${it.poster?" sk":""}">${posterHTML(it,false)}</div><div><b>${esc(e.title)}</b>${it.genres.length?`<div class="gen">${it.genres.map(esc).join(", ")}</div>`:""}</div></div></td>
      <td><span class="tag">${esc(it.type)}</span></td><td class="c dim">${it.year||""}</td>
      ${CATS.map(c=>`<td class="c cv">${f1(e.cats[c.k])}</td>`).join("")}
      ${DB.raters.map(n=>`<td class="c">${scBadge(e.per[n],"sm")}</td>`).join("")}
      <td class="c">${scBadge(sc(e))}</td><td class="c">${isNum(w)?`<span class="wsc" title="${esc(extLine(it))}">${f1(w)}</span>`:`<span class="dim">—</span>`}</td></tr>`;
}
function gridHTML(list,rk,sc,postersOnly,key="all",reorder=false){
  const cls=`grid${postersOnly?" posters-only":""}${UI.hideScores?" hide-scores":""}${UI.compact?" compact":""}${reorder?" reorder":""}`;
  const html=reorder?list.map((e,i)=>cardHTML(e,i,rk,sc,true)).join(""):lazyHTML("g:"+key,list,(e,i)=>cardHTML(e,i,rk,sc),"div");
  return `<div class="${cls}">${html}</div>`;
}
function tableHTML(list,rk,sc,key="all"){
  return `<div class="tbl-wrap"><table class="t${UI.hideScores?" hide-scores":""}"><thead><tr>
    <th class="num">#</th><th>Название</th><th>Тип</th><th class="c">Год</th>
    ${CATS.map(c=>`<th class="c" title="${c.n} (среднее по оценщикам)">${c.s}</th>`).join("")}
    ${DB.raters.map(n=>`<th class="c">${esc(n)}</th>`).join("")}<th class="c">Итог</th><th class="c" title="Сводная мировая оценка (IMDb, Rotten Tomatoes, Metacritic, MAL), приведённая к шкале 0–5">Мир</th></tr></thead><tbody>
    ${lazyHTML("t:"+key,list,e=>rowHTML(e,rk,sc),"tr")}
  </tbody></table></div>`;
}

/* --- lazy rendering: first batch now, the rest as the user scrolls --- */
const LAZY_BATCH=36,LAZY={};let lazyIO=null;
function lazyHTML(key,items,fn,tag){
  LAZY[key]={items,fn,n:Math.min(LAZY_BATCH,items.length),tag};
  const head=items.slice(0,LAZY_BATCH).map(fn).join("");
  return head+(items.length>LAZY_BATCH?lazySentinel(key,tag):"");
}
function lazySentinel(key,tag){return tag==="tr"?`<tr class="lazy-s" data-lazy="${esc(key)}"><td colspan="99"></td></tr>`:`<div class="lazy-s" data-lazy="${esc(key)}"></div>`}
function lazyMore(s,all){
  const L=LAZY[s.dataset.lazy];if(!L){s.remove();return}
  const end=all?L.items.length:Math.min(L.n+LAZY_BATCH,L.items.length);
  s.insertAdjacentHTML("beforebegin",L.items.slice(L.n,end).map((x,j)=>L.fn(x,L.n+j)).join(""));
  L.n=end;
  if(L.n>=L.items.length){lazyIO&&lazyIO.unobserve(s);s.remove()}
  skeletonBind(s.parentNode||document);
}
function lazyObserve(root){
  if(lazyIO)lazyIO.disconnect();
  const ss=$$("[data-lazy]",root);if(!ss.length)return;
  if(!("IntersectionObserver" in window)){ss.forEach(s=>lazyMore(s,true));return}
  lazyIO=new IntersectionObserver(es=>es.forEach(en=>{if(en.isIntersecting)lazyMore(en.target)}),{rootMargin:"800px 0px"});
  ss.forEach(s=>lazyIO.observe(s));
}
function lazyFlush(root){$$("[data-lazy]",root||document).forEach(s=>lazyMore(s,true))}

/* --- skeleton shimmer until the poster image is loaded --- */
function skeletonBind(root){
  $$(".sk",root).forEach(box=>{
    const img=$("img",box),done=()=>box.classList.remove("sk");
    if(!img||img.complete){done();return}
    img.addEventListener("load",done,{once:true});img.addEventListener("error",done,{once:true});
  });
}

/* --- drag-and-drop reordering (pointer events: mouse, pen and touch) --- */
function bindReorder(v){
  const g=$("#wlist .grid.reorder",v);if(!g)return;
  let d=null;
  const autoScroll=y=>{const edge=70;if(y<edge)window.scrollBy(0,-14);else if(y>innerHeight-edge)window.scrollBy(0,14)};
  g.addEventListener("pointerdown",e=>{
    const c=e.target.closest(".card");if(!c||e.button>0)return;
    if(e.pointerType==="touch"&&!e.target.closest(".drag-h"))return;
    e.preventDefault();const r=c.getBoundingClientRect();
    d={c,sx:e.clientX,sy:e.clientY,ox:e.clientX-r.left,oy:e.clientY-r.top,w:r.width,h:r.height,on:false,ghost:null};
    c.setPointerCapture(e.pointerId);
  });
  g.addEventListener("pointermove",e=>{
    if(!d)return;
    if(!d.on){if(Math.hypot(e.clientX-d.sx,e.clientY-d.sy)<6)return;d.on=true;
      d.ghost=d.c.cloneNode(true);d.ghost.className+=" drag-ghost";Object.assign(d.ghost.style,{width:d.w+"px",height:d.h+"px",animation:"none"});
      document.body.appendChild(d.ghost);d.c.classList.add("drag-src");g.classList.add("dragging")}
    d.ghost.style.transform=`translate(${e.clientX-d.ox}px,${e.clientY-d.oy}px)`;
    autoScroll(e.clientY);
    const el=document.elementFromPoint(e.clientX,e.clientY),t=el&&el.closest(".grid.reorder .card");
    if(!t||t===d.c)return;
    const r=t.getBoundingClientRect(),after=e.clientX>r.left+r.width/2;
    g.insertBefore(d.c,after?t.nextSibling:t);
  });
  const end=()=>{
    if(!d)return;const was=d.on;
    if(d.ghost)d.ghost.remove();d.c.classList.remove("drag-src");g.classList.remove("dragging");d=null;
    if(was)reorderCommit(g);
  };
  g.addEventListener("pointerup",end);g.addEventListener("pointercancel",end);
}
function reorderCommit(g){
  const items=$$(".card",g).map(c=>itemById(c.dataset.id)).filter(Boolean);
  let pool=[...new Set(items.map(i=>i.order).filter(isNum))];let nx=nextOrder();
  while(pool.length<items.length)pool.push(nx++);
  pool.sort((a,b)=>a-b);
  const seq=UI.dir>0?pool:pool.reverse();
  let changed=false;items.forEach((it,k)=>{if(it.order!==seq[k]){it.order=seq[k];changed=true}});
  if(changed){save();toast("Порядок сохранён")}
}


/* ползунок размера карточек — общий для «Просмотрено», «Планы», «Каталог» */
function gridSizerHTML(){return `<div class="gridbar"><div class="grid-sizer" title="Размер карточек"><span class="gs-label"><i class="ico ico-gsmall"></i></span><input type="range" class="gridSlider" min="110" max="280" step="10" value="${UI.gridSize||178}" aria-label="Размер карточек"><span class="gs-label"><i class="ico ico-glarge"></i></span></div></div>`}
document.addEventListener("input",e=>{const t=e.target;if(!t.classList||!t.classList.contains("gridSlider"))return;
  UI.gridSize=+t.value;saveUI();document.documentElement.style.setProperty("--gridMin",UI.gridSize+"px");
  document.querySelectorAll(".gridSlider").forEach(x=>{if(x!==t)x.value=t.value})});
/* ============ VIEW: series ============ */
function vSeries(){
  let list=DB.items.filter(i=>i.kind==="series"&&(i.status!=="planned"&&i.status!=="proposed"));
  const tp={};list.forEach(i=>tp[i.type]=(tp[i.type]||0)+1);
  if(UI.serType!=="all")list=list.filter(i=>i.type===UI.serType);
  if(UI.serQ)list=list.filter(i=>i.title.toLowerCase().includes(UI.serQ.toLowerCase()));
  list.sort((a,b)=>(b.order||0)-(a.order||0));
  const allSeasons=DB.items.filter(i=>i.kind==="series").flatMap(i=>seasonsRated(i));
  return `<div class="ptitle"><div><h1>Сериалы</h1><p>Оценки по сезонам · нажмите на клетку, чтобы изменить оценку сезона</p></div>
     <button class="btn" id="newSeries">＋ Новый сериал</button></div>
   <div class="kpis">
     <div class="kpi"><span>Сериалов</span><b>${DB.items.filter(i=>i.kind==="series"&&(i.status!=="planned"&&i.status!=="proposed")).length}</b><em>${DB.items.filter(i=>i.status==="watching").length?`смотрим сейчас: ${DB.items.filter(i=>i.status==="watching").length}`:""}</em></div>
     <div class="kpi"><span>Оценено сезонов</span><b>${allSeasons.length}</b></div>
     <div class="kpi"><span>Средняя за сезон</span><b>${f2(avg(allSeasons.map(s=>overallOf(s.ratings))))}</b></div>
     <div class="kpi"><span>Лучший сезон</span><b style="font-size:16px">${(()=>{let best=null;DB.items.forEach(i=>seasonsRated(i).forEach(s=>{const v=overallOf(s.ratings);if(!best||v>best.v)best={v,t:i.title+" · "+(isArc(i)?segName(i,s.n):"S"+s.n)}}));return best?esc(best.t)+" "+scBadge(best.v,"sm"):"—"})()}</b></div>
   </div>
   <div class="toolbar">
     <div class="search"><input class="inp" id="serQ" placeholder="Поиск сериала" value="${esc(UI.serQ)}"></div>
     <div class="chips" data-ui="serType"><button class="chip ${UI.serType==="all"?"on":""}" data-v="all">Все</button>${Object.keys(tp).map(t=>`<button class="chip ${UI.serType===t?"on":""}" data-v="${esc(t)}">${esc(t)} <small>${tp[t]}</small></button>`).join("")}</div>
   </div>
   ${list.length?list.map(serCard).join(""):`<div class="empty">Нет просмотренных сериалов</div>`}`;
}
function serCard(it,i){
  const ss=it.seasons||[];
  const maxN=Math.max(0,...ss.map(s=>s.n));
  const cols=[];for(let n=1;n<=maxN;n++)cols.push(n);
  const sm=Object.fromEntries(ss.map(s=>[s.n,s]));
  const cell=(v,n,whole)=>`<div class="cell ${isNum(v)?"":"na"}" ${isNum(v)?`style="background:${scoreColor(v)}"`:""} data-rate="${it.id}" data-season="${whole?"whole":n}" title="${whole?"":esc(segTip(it,n))}">${f1(v)}</div>`;
  const nextN=maxN+1;
  const canAdd=!it.seasonsTotal||nextN<=it.seasonsTotal;
  const whole=hasRatings(it.ratings);
  const rows=DB.raters.map(r=>`<tr><th class="l">${esc(r)}</th>${cols.map(n=>`<td>${cell(sm[n]?personScore(sm[n].ratings[r]):null,n)}</td>`).join("")}<td>${cell(whole?personScore(it.ratings[r]):null,0,true)}</td><td>${cell(itemScore(it,r),0,true)}</td></tr>`).join("");
  const avgRow=`<tr class="avg"><th class="l">Среднее</th>${cols.map(n=>`<td>${cell(sm[n]?overallOf(sm[n].ratings):null,n)}</td>`).join("")}<td>${cell(whole?overallOf(it.ratings):null,0,true)}</td><td>${cell(itemScore(it),0,true)}</td></tr>`;
  const bars=cols.map(n=>{const v=sm[n]?overallOf(sm[n].ratings):null;return `<div style="height:${isNum(v)?Math.max(6,v/5*100):4}%;background:${isNum(v)?scoreColor(v):"var(--line)"}" title="${esc(segTip(it,n))}: ${f1(v)}"><span>${segShort(it,n)}</span></div>`}).join("");
  const arc=isArc(it),nextArc=arc?arcOf(it,nextN):null;
  const arcLegend=arc&&cols.length?`<div class="arcleg">${cols.map(n=>{const a=arcOf(it,n);return `<span class="${sm[n]?"":"dim"}"><b>${n}</b> ${esc(a?a.name:"")}${a&&a.filler?` <i>филлер</i>`:""}</span>`}).join("")}</div>`:"";
  return `<div class="ser" style="animation-delay:${Math.min(i,10)*25}ms">
    <div class="poster" data-open="${it.id}">${posterHTML(it,false)}</div>
    <div style="min-width:0">
      <div class="hd"><div><h3 data-open="${it.id}">${esc(it.title)}</h3>
        <div class="meta"><span class="tag">${esc(it.type)}</span>${it.year?`<span>${it.year}</span>`:""}<span>${arc?"Оценено арок":"Просмотрено сезонов"}: ${seasonsRated(it).length}${it.seasonsTotal?" из "+it.seasonsTotal:""}</span>${it.status==="watching"?`<span class="stt c" style="padding:1px 8px">Смотрим · ${esc(progLabel(it,true))}</span>`:""}${durLine(it)?`<span>${esc(durLine(it))}</span>`:""}</div></div>
        <div class="row"><button class="btn sm ghost" data-shot=".ser" data-noshot title="Копировать картинкой"><i class="ico ico-cam"></i></button>${scBadge(itemScore(it),"big")}${arc?`<button class="btn sm" data-rate="${it.id}" data-season="${nextArc?nextN:1}">＋ ${nextArc?"Арка: "+esc(nextArc.name):"Оценить арку"}</button>`:canAdd?`<button class="btn sm" data-rate="${it.id}" data-season="${nextN}">＋ Сезон ${nextN}</button>`:""}</div></div>
      ${arc&&!cols.length?`<p class="dim" style="margin:12px 0 0;font-size:13.5px">Вместо сезонов здесь ${it.arcs.length} арок аниме — от «${esc(it.arcs[0].name)}» до «${esc(it.arcs[it.arcs.length-1].name)}». Нажмите «＋ Арка», чтобы поставить оценку первой арке; следующие появятся в таблице по мере оценки.</p>`:`<div class="smat"><table><thead><tr><th></th>${cols.map(n=>`<th title="${esc(segTip(it,n))}">${segShort(it,n)}</th>`).join("")}<th title="Оценка сериала целиком (отдельная)">Целиком</th><th title="Итог: оценка целиком, а если её нет — среднее по ${arc?"аркам":"сезонам"}">Итог</th></tr></thead><tbody>${rows}${avgRow}</tbody></table></div>`}
      ${arcLegend}
      ${cols.length>1?`<div class="bars">${bars}</div><div style="height:16px"></div>`:""}
    </div></div>`;
}

/* ============ планы: «уже видели», «ещё не вышло», вселенные ============ */
const todayStr=()=>{const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")};
function isUpcoming(it){
  if(!it||it.status!=="planned")return false;
  if(it.relDate)return it.relDate>todayStr();
  if(it.unreleased)return true;
  return isNum(it.year)&&it.year>new Date().getFullYear();
}
function relLabel(it){
  if(it.relDate){
    const d=new Date(it.relDate+"T00:00:00");if(isNaN(d))return"";
    const days=Math.round((d-new Date(todayStr()+"T00:00:00"))/864e5);
    const txt=d.toLocaleDateString("ru-RU",{day:"numeric",month:"long",year:"numeric"}).replace(/\s*г\.$/,"");
    const tail=days>0?(days<=45?` · через ${days} дн.`:days<=500?` · через ${Math.round(days/30)} мес.`:""):"";
    return"📅 "+txt+tail;
  }
  return isNum(it.year)?"📅 "+it.year+" год · дата не объявлена":"📅 дата не объявлена";
}
/* кто уже видел (пересматривает) */
const seenList=it=>DB.raters.filter(n=>it.seenBy&&it.seenBy[n]);
function seenBadge(it){
  const s=seenList(it);if(!s.length)return"";
  const all=s.length===DB.raters.length&&s.length>1;
  return `<span class="${all?"rw":"sv1"}">${all?"↻ Пересмотр":"👁 "+esc(s.join(", "))+" видел(а)"}</span>`;
}
function seenRow(it,compact){
  return `<div class="seenrow${compact?" cpt":""}">${compact?"":"<span>Видели:</span>"}${DB.raters.map(n=>{const on=!!(it.seenBy&&it.seenBy[n]);
    return `<button type="button" class="sb${on?" on":""}" data-seen="${it.id}" data-who="${esc(n)}" title="${compact?"Видел(а) — ":""}${esc(n)}: ${on?"уже видел(а) — для этого человека это пересмотр. Нажмите, чтобы снять":"отметить, что уже видел(а) — будет пересмотр"}">${on?"✓ ":""}${compact?esc(n.trim().charAt(0).toUpperCase()):esc(n)}</button>`}).join("")}</div>`;
}
function toggleSeen(id,who,inDlg){
  const it=itemById(id);if(!it)return;
  const s=Object.assign({},it.seenBy);if(s[who])delete s[who];else s[who]=1;
  if(Object.keys(s).length)it.seenBy=s;else delete it.seenBy;
  if(s[who]&&it.noSeen){const nb=Object.assign({},it.noSeen);delete nb[who];if(Object.keys(nb).length)it.noSeen=nb;else delete it.noSeen}
  commit();
  if(inDlg&&document.getElementById("dlg").open&&document.getElementById("dlg").querySelector(`[data-seen="${id}"]`))openDetail(id);
}
/* ---- «На согласовании»: фильмы, про которые сначала спрашиваем партнёра ---- */
const PROP="proposed";
const isProp=it=>!!it&&it.status===PROP;
const askWho=()=>DB.raters[1]||DB.raters[0];
/* ответ того, кого спрашиваем: "seen" — смотрел(а), "new" — не смотрел(а), "" — ответа ещё нет */
function replyOf(it){const w=askWho();if(it.seenBy&&it.seenBy[w])return"seen";if(it.noSeen&&it.noSeen[w])return"new";return""}
function setReply(id,val){
  const it=itemById(id);if(!it)return;const w=askWho();
  const sb=Object.assign({},it.seenBy),nb=Object.assign({},it.noSeen);delete sb[w];delete nb[w];
  if(val==="seen")sb[w]=1;else if(val==="new")nb[w]=1;
  if(Object.keys(sb).length)it.seenBy=sb;else delete it.seenBy;
  if(Object.keys(nb).length)it.noSeen=nb;else delete it.noSeen;
  commit();
  const dg=document.getElementById("dlg");if(dg&&dg.open&&dg.querySelector(`[data-reply="${id}"]`))openDetail(id);
}
const REPLY_TXT={"":"ждём ответа",seen:"смотрела",new:"не смотрела"};
function askRow(it){
  const w=askWho(),r=replyOf(it);
  return `<div class="pask ${r||"wait"}"><div class="pq"><b>${esc(w)}</b> · ${REPLY_TXT[r]}</div><div class="pbt">
    <button type="button" data-reply="${it.id}" data-v="seen" class="${r==="seen"?"on":""}" title="${esc(w)} уже видела этот фильм">Смотрела</button>
    <button type="button" data-reply="${it.id}" data-v="new" class="${r==="new"?"on":""}" title="${esc(w)} ещё не видела — можно смотреть вместе">Не смотрела</button></div></div>`;
}
function propCard(it){
  const r=replyOf(it);
  return `<div class="card prop" data-open="${it.id}">
     <div class="poster">${posterHTML(it)}<div class="pb">${r==="seen"?`<span class="pbq">👁 ${esc(askWho())} смотрела</span>`:""}</div></div>
     <div class="body"><div class="t">${esc(it.title)}</div>
       <div class="m"><span class="tag">${esc(it.type)}</span>${it.year?`<span>${it.year}</span>`:""}</div>
       ${it.genres.length?`<div class="gen">${it.genres.map(esc).join(", ")}</div>`:""}
       ${durLine(it)?`<div class="gen">⏱ ${esc(durLine(it))}</div>`:""}
       ${askRow(it)}
       <div class="act"><button class="btn sm pri" data-toplan="${it.id}" title="Решили смотреть — перенести в планы (отметка о Жене сохранится)">В планы</button><button class="btn sm icon" data-finish="${it.id}" title="Уже смотрели вместе — оценить" aria-label="Смотрели вместе — оценить">✓</button><button class="btn sm icon" data-edit="${it.id}" title="Изменить" aria-label="Изменить"><i class="ico ico-edit"></i></button><button class="btn sm icon" data-propdel="${it.id}" title="Убрать из списка" aria-label="Убрать из списка">✕</button></div>
     </div></div>`;
}
function planSwitch(){
  const pl=DB.items.filter(i=>i.status==="planned"),nS=pl.filter(isUpcoming).length,nP=pl.length-nS,nQ=DB.items.filter(isProp).length,cur=UI.planList==="prop"?"prop":UI.planList==="soon"?"soon":"plan",on=cur==="prop";
  return `<div class="plsw"><div class="seg lg" data-ui="planList"><button data-v="plan" class="${cur==="plan"?"on":""}">В планах <small>${nP}</small></button><button data-v="soon" class="${cur==="soon"?"on":""}">🚧 Скоро <small>${nS}</small></button><button data-v="prop" class="${on?"on":""}">🤝 На согласовании <small>${nQ}</small></button></div></div>`;
}
function vProp(){
  const all=DB.items.filter(isProp),w=askWho();
  const cnt={wait:all.filter(i=>!replyOf(i)).length,seen:all.filter(i=>replyOf(i)==="seen").length,new:all.filter(i=>replyOf(i)==="new").length};
  const f=["all","wait","seen","new"].includes(UI.propF)?UI.propF:"all";
  const list=all.filter(i=>f==="all"||(f==="wait"?!replyOf(i):replyOf(i)===f)).sort((a,b)=>(b.addedAt||0)-(a.addedAt||0));
  const body=list.length?gridSizerHTML()+`<div class="grid plan">${list.map(propCard).join("")}</div>`:
    `<div class="empty">${all.length?"По этому фильтру ничего нет.":`Здесь фильмы, про которые вы сначала хотите узнать, смотрела ли их ${esc(w)}. В планы они не попадают, пока вы не решите. Нажмите «＋ На согласование».`}</div>`;
  return `<div class="ptitle"><div><h1>Планы</h1><p>${all.length?`${cnt.wait} ждут ответа · ${cnt.seen} ${esc(w)} смотрела · ${cnt.new} не смотрела`:"Спросите, смотрела ли "+esc(w)+", прежде чем добавлять в планы"}</p></div><div class="row" style="gap:8px;flex-wrap:wrap"><button class="btn pri" id="addProp">＋ На согласование</button></div></div>
  ${planSwitch()}
  <div class="toolbar">
    <div class="chips" data-ui="propF"><button class="chip ${f==="all"?"on":""}" data-v="all">Все <small>${all.length}</small></button><button class="chip ${f==="wait"?"on":""}" data-v="wait">Ждём ответа <small>${cnt.wait}</small></button><button class="chip ${f==="seen"?"on":""}" data-v="seen">👁 Смотрела <small>${cnt.seen}</small></button><button class="chip ${f==="new"?"on":""}" data-v="new">Не смотрела <small>${cnt.new}</small></button></div>
    <div class="sp"></div>
    <button class="btn sm" data-shot="#plist" data-shot-title="На согласовании" title="Скопировать список картинкой — например, чтобы отправить ${esc(w)}"><i class="ico ico-cam"></i></button>
  </div>
  <div id="plist">${body}</div>`;
}
/* ---- вселенные и серии ---- */
const MCU_NAME="Киновселенная Marvel (MCU)";
const UNI_FR={MCU:MCU_NAME,CLASSIC:"Marvel: классика",XMEN:"Люди Икс",DC:"DC"};
/* ключ для проверки: |название|english| — «\|» якорит начало названия */
const UNI_RULES=[
 ["Монстрвёрс",/годзилл|godzilla|конг|kong/,/кинг[\s-]?конг|king kong|минус один|minus one/],
 ["Джон Уик",/джон уик|john wick|\|балерина\||ballerina/],
 ["Смертельная битва",/смертельн\S* битв|mortal kombat/],
 ["Паучья вселенная (Spider-Verse)",/через вселенные|паутина вселенных|в паучью вселенную|spider-verse|spider verse|across the spider|beyond the spider/],
 ["Матрица",/матриц|matrix/],
 ["Дюна",/\|дюна|dune/],
 ["Звёздные войны",/звезд\S* войн|star wars|мандалор|mandalorian|\|андор\||\|andor\||асока|ahsoka|оби-ван|obi-wan|изгой-один|rogue one|книга бобы фетта/],
 ["Средиземье",/властелин колец|lord of the rings|хоббит|hobbit|кольца власти|rings of power/],
 ["Волшебный мир Гарри Поттера",/гарри поттер|harry potter|фантастические твари|fantastic beasts/],
 ["Форсаж",/форсаж|fast (&|and) furious|fast x\||fast five/],
 ["Чужой и Хищник",/\|чужой|\|чужие|\|aliens?[\s:|]|хищник|predator|прометей|prometheus/],
 ["Терминатор",/терминатор|terminator/],
 ["Миссия невыполнима",/миссия невыполнима|mission[:\s]+impossible/],
 ["Пираты Карибского моря",/пираты карибского|pirates of the caribbean/],
 ["Планета обезьян",/планета обезьян|planet of the apes/],
 ["Индиана Джонс",/индиана джонс|indiana jones/],
 ["Джеймс Бонд",/джеймс бонд|james bond|казино рояль|casino royale|скайфолл|skyfall|не время умирать|no time to die/],
 ["Мир Юрского периода",/юрск\S* период|jurassic/],
 ["Рокки и Крид",/\|рокки|\|rocky|\|крид|\|creed/],
 ["Шрек",/\|шрек|\|shrek/],
 ["Как приручить дракона",/как приручить дракона|how to train your dragon/],
 ["История игрушек",/история игрушек|toy story/],
 ["Кунг-фу Панда",/кунг-фу панда|kung fu panda/],
 ["Вестерос (Игра престолов)",/игра престолов|game of thrones|дом дракона|house of the dragon|рыцарь семи королевств|knight of the seven/],
 ["Во все тяжкие",/во все тяжкие|breaking bad|el camino|лучше звоните солу|better call saul/],
 ["DC",/бэтмен|batman|супермен|superman|чудо-женщина|wonder woman|аквамен|aquaman|отряд самоубийц|suicide squad|лига справедливости|justice league|тёмный рыцарь|темный рыцарь|dark knight|\|джокер|\|joker|\|флэш\||\|the flash/]
].map(([n,re,ex])=>({n,re:new RegExp(re.source,"iu"),ex:ex?new RegExp(ex.source,"iu"):null}));
const MARVEL_RE=new RegExp("мстител|avengers|железн\\S* человек|iron man|человек[\\s-]паук|spider-man|стражи галактики|guardians of the galaxy|чёрная пантера|черная пантера|black panther|доктор стрэндж|doctor strange|капитан америка|captain america|\\|тор[:\\s|]|\\|thor|человек-муравей|ant-man|сорвиголова|daredevil|шан-чи|shang-chi|\\|локи|\\|loki|вандавижн|wandavision|фантастическая четвёрка|фантастическая четверка|fantastic four|громовержцы|thunderbolts|дэдпул|deadpool|росомаха|wolverine|люди икс|x-men|блэйд|\\|blade|капитан марвел|captain marvel|вечные|eternals|джессика джонс|jessica jones|защитники|defenders|каратель|punisher|люк кейдж|luke cage|железный кулак|iron fist|мисс марвел|ms\\. marvel","iu");
const cleanColl=s=>String(s||"").replace(/\s*[\(\-–—]?\s*(коллекция|collection|серия)\)?\s*$/i,"").trim();
function uniBase(t){
  let s=String(t||"").replace(/[«»„“”"*]/g,"").trim();
  s=s.split(/\s*[:：—–]\s*/)[0];
  s=s.replace(/\.\s*часть.*$/i,"").replace(/\s+(?:часть\s+)?(?:\d+|[ivx]+)\s*$/i,"").trim();
  return s.length>=3?s:"";
}
function uniRaw(it,cm){
  if(it.uni)return it.uni;
  const key="|"+String(it.title||"").toLowerCase().replace(/ё/g,"е")+"|"+String(it.ext&&it.ext.en||"").toLowerCase().replace(/ё/g,"е")+"|";
  const key2="|"+String(it.title||"").toLowerCase()+"|"+String(it.ext&&it.ext.en||"").toLowerCase()+"|";
  for(const r of UNI_RULES)if((r.re.test(key)||r.re.test(key2))&&!(r.ex&&(r.ex.test(key)||r.ex.test(key2))))return r.n;
  const c=cm[it.id];if(c&&c.length)return UNI_FR[c[0].franchise]||FR[c[0].franchise];
  if(MARVEL_RE.test(key)||MARVEL_RE.test(key2))return MCU_NAME;
  if(it.coll&&it.coll.name)return cleanColl(it.coll.name)||null;
  return null;
}
/* of: id→название вселенной/серии; groups: название→записи (по году) */
function buildUni(){
  const cm=comicsMap(),of=new Map(),groups=new Map(),base=new Map();
  for(const it of DB.items){
    const u=uniRaw(it,cm);
    if(u){of.set(it.id,u);continue}
    const b=uniBase(it.title);if(!b)continue;
    const k=normT(b);let g=base.get(k);if(!g){g={name:b,items:[]};base.set(k,g)}g.items.push(it);
  }
  for(const g of base.values())if(g.items.length>=2)for(const it of g.items)of.set(it.id,g.name);
  for(const it of DB.items){const u=of.get(it.id);if(!u)continue;let a=groups.get(u);if(!a){a=[];groups.set(u,a)}a.push(it)}
  const mcuN=it=>{const c=(cm[it.id]||[]).find(c=>c.franchise==="MCU");return c&&isNum(c.num)?c.num:0};
  for(const a of groups.values())a.sort((x,y)=>(x.year||9999)-(y.year||9999)||mcuN(x)-mcuN(y)||cmpRu(x.title,y.title));
  return{of,groups};
}
function universeNames(){return[...buildUni().groups.keys()].sort(cmpRu)}
/* недостающие части: по коллекциям TMDB */
const UNIX={};
function rerenderPlan(){if(UI.tab==="plan")rerenderSoft()}
async function uniFind(name){
  const U=buildUni(),items=U.groups.get(name)||[];
  UNIX[name]="loading";rerenderPlan();
  try{
    const cids=new Set();
    for(const it of items){
      if(!(it.tmdb&&it.tmdb.type==="movie"))continue;
      if(it.coll&&it.coll.id){cids.add(it.coll.id);continue}
      const d=await tmdbGet("/movie/"+it.tmdb.id,{language:"ru-RU"});
      if(d.belongs_to_collection){it.coll={id:d.belongs_to_collection.id,name:d.belongs_to_collection.name};cids.add(it.coll.id)}
    }
    const have=recoHave(),out=[],seen=new Set();
    for(const cid of cids){
      const c=await tmdbGet("/collection/"+cid,{language:"ru-RU"});
      for(const p of c.parts||[]){const k="movie:"+p.id;if(seen.has(k)||have.h.has(k)||have.t.has(normT(p.title)))continue;
        seen.add(k);out.push({k,id:p.id,title:p.title,y:String(p.release_date||"").slice(0,4),rd:p.release_date||"",p:p.poster_path})}
    }
    out.sort((a,b)=>(a.rd||"9").localeCompare(b.rd||"9"));
    UNIX[name]=out;save();
  }catch(e){delete UNIX[name];toast("⚠ "+(e.message==="Failed to fetch"?"нет связи с TMDB":e.message))}
  rerenderPlan();
}
async function uniAdd(k,name){
  const [t,id]=k.split(":");toast("Добавляю…");
  try{const it=await tmdbNewItem(t,id,"planned");DB.items.push(it);
    if(Array.isArray(UNIX[name]))UNIX[name]=UNIX[name].filter(x=>x.k!==k);
    commit();toast("✓ «"+it.title+"» — в планах")}
  catch(e){toast("⚠ "+(e.message==="Failed to fetch"?"нет связи с TMDB":e.message))}
}
/* досчитываем даты выхода и коллекции через TMDB (тихо, в фоне) */
const PLD={busy:false,fail:0};
async function planEnsure(){
  if(PLD.busy||PLD.fail>2||!DB||!apiKey("tmdb"))return;
  const now=Date.now();
  const need=DB.items.filter(i=>i.tmdb&&i.tmdb.id&&(i.tmdb.type==="movie"||i.status==="planned")&&(!i.relChk||(i.status==="planned"&&isUpcoming(i)&&now-i.relChk>3*864e5))).slice(0,80);
  if(!need.length)return;
  PLD.busy=true;let changed=0,done=0,ix=0;
  const work=async()=>{
    while(ix<need.length){
      const it=need[ix++];
      try{
        const d=await tmdbGet(`/${it.tmdb.type}/${it.tmdb.id}`,{language:"ru-RU"});
        const rd=d.release_date||d.first_air_date||"";
        const c=d.belongs_to_collection?{id:d.belongs_to_collection.id,name:d.belongs_to_collection.name}:null;
        if(rd&&it.relDate!==rd){it.relDate=rd;changed++}
        if(c&&(!it.coll||it.coll.id!==c.id)){it.coll=c;changed++}
        if(it.status==="planned"&&!rd&&it.tmdb.type==="tv"&&["Planned","In Production"].includes(d.status)&&!it.unreleased){it.unreleased=true;changed++}
        it.relChk=now;done++;
      }catch(e){PLD.fail=/ключ|401/.test(e.message||"")?9:PLD.fail+1;return}
    }
  };
  try{await Promise.all([work(),work(),work()])}finally{PLD.busy=false}
  if(done){save();if(changed)rerenderSoft()}
}

/* ============ VIEW: plan ============ */
function planCard(it,U){
  const upc=isUpcoming(it),u=U.of.get(it.id);
  return `<div class="card${upc?" upc":""}" data-open="${it.id}">
     <div class="poster">${posterHTML(it)}<div class="pb">${upc?`<span class="up">🚧 Скоро</span>`:""}</div></div>
     <div class="body"><div class="t">${esc(it.title)}</div>
       <div class="m"><span class="tag">${esc(it.type)}</span>${it.year?`<span>${it.year}</span>`:""}</div>
       ${upc?`<div class="rel">${esc(relLabel(it))}</div>`:""}
       ${it.genres.length?`<div class="gen">${it.genres.map(esc).join(", ")}</div>`:""}
       ${!upc&&durLine(it)?`<div class="gen">⏱ ${esc(durLine(it))}</div>`:""}
       ${seenRow(it,true)}
       <div class="act">${upc?`<button class="btn sm" data-relnow="${it.id}" title="Уже вышло — перенести в основной список">Уже вышло</button>`:`${it.kind==="series"?`<button class="btn sm" data-start="${it.id}" title="Начать смотреть" aria-label="Начать смотреть" style="flex:0 0 30px;height:30px;padding:0;justify-content:center"><i class="ico ico-play"></i></button>`:""}<button class="btn sm pri" data-finish="${it.id}" title="Отметить просмотренным">✓<span class="lbl"> Просмотрено</span></button>`}<button class="btn sm icon" data-edit="${it.id}" title="Изменить" aria-label="Изменить" style="flex:0 0 30px;height:30px"><i class="ico ico-edit"></i></button></div>
     </div></div>`;
}
function ucPoster(i){return i.poster?`<img src="${esc(i.poster)}" alt="" loading="lazy" onerror="this.remove()">`:posterHTML(i,false)}
function planUniHTML(U,list){
  const keep=new Set(list.map(i=>i.id));
  let names=[...U.groups.keys()].filter(n=>U.groups.get(n).some(i=>keep.has(i.id)));
  if(UI.planUni)names=names.filter(n=>n===UI.planUni);
  names.sort((a,b)=>U.groups.get(b).filter(i=>i.status==="planned").length-U.groups.get(a).filter(i=>i.status==="planned").length||cmpRu(a,b));
  if(!names.length)return `<div class="empty">Вселенных и серий среди планов пока не нашлось. Они определяются по названиям (Marvel, Джон Уик, Дюна…), по коллекциям TMDB и по общему началу названия («Матрица 2», «Матрица 3»). Можно задать вручную в поле «Вселенная / серия» при редактировании записи.</div>`;
  return names.map(n=>{
    const items=U.groups.get(n),done=items.filter(i=>i.status==="watched"),pl=items.filter(i=>i.status==="planned"),up=pl.filter(isUpcoming);
    const sc=avg(done.map(i=>itemScore(i)).filter(isNum)),miss=UNIX[n];
    const canFind=apiKey("tmdb")&&items.some(i=>i.tmdb&&i.tmdb.type==="movie");
    const cards=items.map(i=>{
      const v=i.status==="watched"?itemScore(i):null,upc=isUpcoming(i);
      const st=i.status==="watched"?`<span class="us w"${isNum(v)?` style="background:${scoreColor(v)}"`:""}>${isNum(v)?f1(v):"✓"}</span>`:i.status==="watching"?`<span class="us c">▶ смотрим</span>`:upc?`<span class="us u">скоро</span>`:`<span class="us p">в планах</span>`;
      return `<div class="uc ${i.status}${upc?" upc":""}" data-open="${i.id}" title="${esc(i.title)}"><div class="rp">${ucPoster(i)}${st}</div><div class="rb"><b>${esc(i.title)}</b><span class="dim">${i.year||"—"}${i.status==="planned"&&seenList(i).length?` · 👁 ${esc(seenList(i).join(", "))}`:""}</span></div></div>`}).join("");
    const missCards=Array.isArray(miss)?miss.map(m=>`<div class="uc miss"><div class="rp">${m.p?`<img src="${tmdbImg(m.p,"w342")}" alt="" loading="lazy">`:`<span class="ph0">${esc(initials(m.title))}</span>`}<span class="us m">нет в списке</span></div><div class="rb"><b>${esc(m.title)}</b><span class="dim">${m.y||"—"}</span><button class="btn sm" data-unifadd="${m.k}">＋ В планы</button></div></div>`).join(""):"";
    return `<section class="panel unp" data-uni="${esc(n)}">
      <div class="uhead"><h3>${esc(n)}</h3><span class="dim">${items.length} ${plural(items.length,"часть","части","частей")} · просмотрено ${done.length} · в планах ${pl.length-up.length}${up.length?` · скоро ${up.length}`:""}</span><div class="sp"></div>${isNum(sc)?`<span class="dim" style="font-size:12.5px">средняя оценка</span>${scBadge(sc)}`:""}</div>
      <div class="uprog" title="Просмотрено ${done.length} из ${items.length}"><i style="width:${(done.length/items.length*100).toFixed(1)}%"></i></div>
      <div class="urow">${cards}${missCards}</div>
      ${canFind?`<div class="ufoot">${miss==="loading"?`<span class="dim">⏳ Ищу недостающие части в коллекциях TMDB…</span>`:Array.isArray(miss)?`<span class="dim">${miss.length?`Не хватает по коллекциям TMDB: ${miss.length}`:"По коллекциям TMDB все части уже у вас"}</span><button class="btn sm ghost" data-unifind="${esc(n)}">↻</button>`:`<button class="btn sm" data-unifind="${esc(n)}">🔎 Найти недостающие части</button>`}</div>`:""}
    </section>`}).join("");
}
function vPlan(){
  if(UI.planList==="prop")return vProp();
  const U=buildUni();
  const soonTab=UI.planList==="soon";
  const all=DB.items.filter(i=>i.status==="planned"&&isUpcoming(i)===soonTab);
  const tp={};all.forEach(i=>tp[i.type]=(tp[i.type]||0)+1);
  const nSeen=all.filter(i=>seenList(i).length).length;
  let list=all.slice();
  if(UI.planType!=="all")list=list.filter(i=>i.type===UI.planType);
  if(UI.planSeen==="new")list=list.filter(i=>!seenList(i).length);
  else if(UI.planSeen==="seen")list=list.filter(i=>seenList(i).length);
  const uniNames=[...U.groups].filter(([n,a])=>a.some(i=>i.status==="planned")).map(([n])=>n).sort(cmpRu);
  if(UI.planUni&&!uniNames.includes(UI.planUni))UI.planUni="";
  const uni=UI.planView==="uni";
  const nAct=(UI.planSeen!=="all"?1:0)+(UI.planUni?1:0)+(uni?1:0)+((UI.planSort||"added")!=="added"?1:0);
  if(UI.planUni&&!uni)list=list.filter(i=>U.of.get(i.id)===UI.planUni);
  const S={added:(a,b)=>(a.addedAt||0)-(b.addedAt||0)||(a.id>b.id?1:-1),title:(a,b)=>cmpRu(a.title,b.title),dur:(a,b)=>(totalMinutes(a)||0)-(totalMinutes(b)||0),year:(a,b)=>(a.year||0)-(b.year||0)};
  list.sort(S[UI.planSort]||S.added);
  const up=list.filter(isUpcoming).sort((a,b)=>String(a.relDate||"9999").localeCompare(String(b.relDate||"9999"))||(a.year||9999)-(b.year||9999)||cmpRu(a.title,b.title));
  const rel=list.filter(i=>!isUpcoming(i));
  const tot=rel.reduce((s,i)=>s+(totalMinutes(i)||0),0);
  const body=uni?planUniHTML(U,list):
    (rel.length||up.length?gridSizerHTML():"")+(rel.length&&!soonTab?`<div class="grid plan">${rel.map(it=>planCard(it,U)).join("")}</div>`:(up.length?"":`<div class="empty">${all.length?"По этим фильтрам ничего нет.":soonTab?"Невышедших фильмов в планах нет. Они появятся здесь сами, когда вы добавите проект с будущей датой выхода.":"План пуст. Добавьте что-нибудь посмотреть — или загляните в «Каталог»!"}</div>`))+
    (up.length?`<div class="grid plan">${up.map(it=>planCard(it,U)).join("")}</div>`:"");
  return `<div class="ptitle"><div><h1>Планы</h1><p>${soonTab?`${up.length} ещё не вышли · сверху те, что выйдут раньше`:`${rel.length} можно смотреть`}${tot&&!soonTab?` · суммарно ≈ ${hoursStr(tot)}`:""}</p></div><div class="row" style="gap:8px;flex-wrap:wrap"><button class="btn" data-rl="open" title="Выбрать, что смотреть сегодня">🎰 Рулетка</button><button class="btn pri" id="addPlan">＋ В планы</button></div></div>
  ${planSwitch()}
  ${contHTML()}
  <div class="toolbar plbar">
    <div class="chips" data-ui="planType"><button class="chip ${UI.planType==="all"?"on":""}" data-v="all">Все</button>${Object.keys(tp).map(t=>`<button class="chip ${UI.planType===t?"on":""}" data-v="${esc(t)}">${esc(t)} <small>${tp[t]}</small></button>`).join("")}</div>
    <div class="sp"></div>
    <div data-ui="planFiltOpen" style="display:contents"><button class="btn sm pfbtn ${nAct?"on":""}" data-v="${UI.planFiltOpen?"":"1"}" aria-expanded="${UI.planFiltOpen?"true":"false"}">⚙ Фильтры${nAct?` <span class="nb">${nAct}</span>`:""}</button></div>
    <button class="btn sm" data-shot="#plist" data-shot-title="Планы" title="Скопировать планы картинкой"><i class="ico ico-cam"></i></button>
  </div>
  ${UI.planFiltOpen?`<div class="toolbar pfpanel">
    <div class="seg" data-ui="planView"><button data-v="list" class="${uni?"":"on"}">Список</button><button data-v="uni" class="${uni?"on":""}">🌐 Вселенные</button></div>
    <div class="chips" data-ui="planSeen"><button class="chip ${UI.planSeen==="all"?"on":""}" data-v="all">Любые</button><button class="chip ${UI.planSeen==="new"?"on":""}" data-v="new">Новое для обоих <small>${all.length-nSeen}</small></button><button class="chip ${UI.planSeen==="seen"?"on":""}" data-v="seen">👁 Пересмотр <small>${nSeen}</small></button></div>
    <div class="sp"></div>
    ${uniNames.length?`<select class="inp" data-uis="planUni" title="Фильтр по вселенной или серии"><option value="">Все вселенные и серии</option>${uniNames.map(n=>`<option value="${esc(n)}" ${UI.planUni===n?"selected":""}>${esc(n)}</option>`).join("")}</select>`:""}
    ${uni?"":`<select class="inp" data-uis="planSort">${[["added","По дате добавления"],["title","По названию"],["dur","По длительности"],["year","По году"]].map(([k,n])=>`<option value="${k}" ${UI.planSort===k?"selected":""}>${n}</option>`).join("")}</select>`}
  </div>`:""}
  <div id="plist">${body}</div>`;
}

/* ============ аналитика: Статистика + Вкусы + Мы и мир ============ */
const SUBTABS=[["stats","📊 Статистика"],["taste","🤝 Вкусы"],["world","🌍 Мы и мир"],["wrapped","🦊 Лисий год"],["geo","🗺 География"]];
function vAnalytics(){
  const sub=SUBTABS.some(s=>s[0]===UI.sub)?UI.sub:"stats";
  return `<div class="subnav"><div class="seg lg" data-ui="sub" role="tablist">${SUBTABS.map(([k,n])=>`<button role="tab" data-v="${k}" class="${sub===k?"on":""}" aria-selected="${sub===k}">${n}</button>`).join("")}</div></div>`+({stats:vStats,taste:vTaste,world:vWorld,wrapped:vWrapped,geo:vGeo}[sub])();
}
function tabsPanel(){
  return `<div class="panel" id="tabsP"><h3>Вкладки</h3><p>Какие вкладки показывать в меню (на этом устройстве). Скрытое можно вернуть здесь в любой момент.</p>
    <div class="tabvis">${TABS.filter(t=>t.id!=="data").map(t=>`<label class="chk"><input type="checkbox" data-tabvis="${t.id}" ${tabHidden(t.id)?"":"checked"}><span class="ic"><i class="ico ico-${t.id}"></i></span>${esc(t.n)}</label>`).join("")}</div></div>`;
}

/* ============ быстрые действия (перехватываем клик раньше общих обработчиков) ============ */
document.addEventListener("click",e=>{
  const t=e.target.closest("[data-seen],[data-planuni],[data-unifind],[data-unifadd],[data-relnow],[data-cadd],[data-cwatch],[data-chide],[data-cprev],[data-cretry],[data-ckey],[data-cunhide],[data-csimi],[data-csimk],[data-csimx],[data-ppick],[data-reply],[data-toplan],[data-propdel],[data-cprop],[data-ccprop]");
  if(!t)return;
  e.stopPropagation();e.preventDefault();
  const d=t.dataset;
  if(d.csimi){const it=itemById(d.csimi);if(it)catSimilarFor(it);return}
  if(d.csimk){const x=CAT.items.find(r=>r.k===d.csimk);if(x)catSimilar(x.t,x.id,x.title);return}
  if(d.csimx!==undefined){UI.catSim=null;saveUI();render(true);return}
  if(d.ppick){const it=itemById(d.ppick);if(it)openPosterPicker(it.tmdb,it.title,it.year,u=>{it.poster=u;commit();openDetail(it.id)});return}
  if(d.seen){toggleSeen(d.seen,d.who,!!t.closest("dialog"));return}
  if(d.reply){const it=itemById(d.reply);if(it)setReply(d.reply,replyOf(it)===d.v?"":d.v);return}
  if(d.toplan){const it=itemById(d.toplan);if(it){it.status="planned";it.addedAt=Date.now();if(t.closest("#dlg2"))closeDlg("dlg2");if(t.closest("#dlg"))closeDlg();commit();toast("✓ «"+it.title+"» — в планах"+(replyOf(it)==="seen"?" · "+askWho()+" смотрела":""))}return}
  if(d.propdel){const it=itemById(d.propdel);if(it&&confirm("Убрать «"+it.title+"» из списка «На согласовании»?")){DB.items=DB.items.filter(x=>x!==it);DB.catalog.forEach(c=>{if(c.link?.itemId===it.id)c.link=null});commit();toast("Убрано из списка")}return}
  if(d.cprop){if(t.closest("#dlg2"))closeDlg("dlg2");catAdd(d.cprop,"prop");return}
  if(d.ccprop){const c=DB.catalog.find(x=>x.id===d.ccprop);if(c){const it={id:uid("i"),title:c.title,type:"Фильм",kind:"movie",status:PROP,year:c.year||null,genres:["Кинокомикс"],synopsis:"",poster:"",duration:null,ratings:{},order:null,watchedAt:null,addedAt:Date.now()};DB.items.push(it);c.link={itemId:it.id,season:null};commit();toast("🤝 На согласовании: "+c.title)}return}
  if(d.planuni!==undefined){UI.planUni=d.planuni;UI.planView="uni";saveUI();if(t.closest("dialog"))closeDlg();if(UI.tab!=="plan")location.hash="plan";else render(true);return}
  if(d.unifind){uniFind(d.unifind);return}
  if(d.unifadd){const s=t.closest("[data-uni]");t.disabled=true;uniAdd(d.unifadd,s?s.dataset.uni:"");return}
  if(d.relnow){const it=itemById(d.relnow);if(it){it.relDate=todayStr();delete it.unreleased;commit();toast("«"+it.title+"» — теперь можно смотреть")}return}
  if(d.cadd){if(t.closest("#dlg2"))closeDlg("dlg2");catAdd(d.cadd,"plan");return}
  if(d.cwatch){catAdd(d.cwatch,"watch");return}
  if(d.chide){DB.recoHide=[...new Set([...(DB.recoHide||[]),d.chide])];save();if(t.closest("#dlg2"))closeDlg("dlg2");catPaint();return}
  if(d.cprev){catPreview(d.cprev);return}
  if(d.cretry!==undefined){CAT.err="";catMore();return}
  if(d.cunhide!==undefined){DB.recoHide=[];save();catPaint();return}
  if(d.ckey!==undefined){const k=($("#catKeyIn")||{}).value;if(k&&k.trim()){setApiKey("tmdb",k);toast("Ключ сохранён");render()}else toast("Вставьте ключ TMDB");return}
},true);

/* блок в карточке записи (диалог): дата выхода, вселенная, «уже видели» */
function detPlanBlock(it){
  const u=buildUni().of.get(it.id);
  return `<div class="dplan">${isUpcoming(it)?`<p class="rel" style="margin:0 0 8px;font-weight:700">🚧 Ещё не вышло · ${esc(relLabel(it))}</p>`:""}${u?`<p style="margin:0 0 8px"><button type="button" class="uchip" data-planuni="${esc(u)}">🌐 ${esc(u)}</button></p>`:""}${seenRow(it)}</div>`;
}

/* ============ создание записи из TMDB (общая для «Может понравиться», каталога и вселенных) ============ */
async function tmdbNewItem(t,id,status="planned"){
  const o=await tmdbDetails(t,+id);
  const om=await omdbById(o.imdbId).catch(()=>null);
  const it={id:uid("i"),title:o.title,type:o.type,kind:o.series?"series":"movie",status,year:o.year,genres:o.genres,tags:[],synopsis:o.synopsis,poster:o.poster,
    ratings:{},order:null,watchedAt:null,seasons:[],addedAt:Date.now(),tmdb:o.tmdb,duration:o.series?null:o.duration};
  if(o.series)Object.assign(it,{seasonsTotal:o.seasonsTotal,episodes:o.episodes,episodeDuration:o.episodeDuration,seasonEpisodes:o.seasonEpisodes,totalDuration:null});
  if(o.relDate)it.relDate=o.relDate;
  if(o.coll)it.coll=o.coll;
  if(o.geo)it.geo=o.geo;
  it.relChk=Date.now();
  const ext={};if(o.en)ext.en=o.en;if(o.imdbId)ext.imdbId=o.imdbId;
  if(om){for(const s of ["imdb","rt","mc"])if(isNum(om[s]))ext[s]=om[s];ext.at=new Date().toISOString();ext.src="OMDb (авто)"}
  if(Object.keys(ext).length)it.ext=ext;
  return it;
}

/* ============ VIEW: каталог (что сейчас популярно на TMDB) ============ */
/* какой тип должен быть у карточки в каждой вкладке каталога */
const CAT_TYPE={movie:"Фильм",tv:"Сериал",anime:"Аниме",animem:"Аниме",dorama:"Дорама",cartoon:"Мультфильм",cartoontv:"Мультсериал"};
const CAT_CATS=[
  {k:"movie",n:"🎬 Фильмы",kind:"movie",p:{without_genres:"16"}},
  {k:"tv",n:"📺 Сериалы",kind:"tv",p:{without_genres:"16"}},
  {k:"anime",n:"🌸 Аниме",kind:"tv",p:{with_genres:"16",with_original_language:"ja"}},
  {k:"animem",n:"🌸 Аниме-фильмы",kind:"movie",p:{with_genres:"16",with_original_language:"ja"}},
  {k:"dorama",n:"🍜 Дорамы",kind:"tv",p:{with_origin_country:"KR|JP|CN|TW|TH|HK",without_genres:"16"}},
  {k:"cartoon",n:"🧸 Мультфильмы",kind:"movie",p:{with_genres:"16"},not:"ja"},
  {k:"cartoontv",n:"🧸 Мультсериалы",kind:"tv",p:{with_genres:"16"},not:"ja"}];
const CAT_SORTS=[["popular","Популярное сейчас"],["top","Лучшие по рейтингу"],["new","Свежие новинки"],["soon","Скоро выйдут · по дате"],["soonpop","Скоро выйдут · по популярности"]];
const CG_MOVIE=[[28,"Боевик"],[12,"Приключения"],[35,"Комедия"],[80,"Криминал"],[99,"Документальный"],[18,"Драма"],[10751,"Семейный"],[14,"Фэнтези"],[36,"История"],[27,"Ужасы"],[9648,"Детектив"],[10749,"Мелодрама"],[878,"Фантастика"],[53,"Триллер"],[10752,"Военный"],[37,"Вестерн"]];
const CG_TV=[[10759,"Боевик и приключения"],[35,"Комедия"],[80,"Криминал"],[99,"Документальный"],[18,"Драма"],[10751,"Семейный"],[9648,"Детектив"],[10765,"Фантастика и фэнтези"],[10768,"Война и политика"],[10764,"Реалити"]];
const CAT={key:"",tok:0,loading:false,items:[],seen:new Set(),page:0,total:1,totalRes:0,err:""};
const CATB=new Set();
const catCur=()=>CAT_CATS.find(c=>c.k===UI.catCat)||CAT_CATS[0];
const catGenres=()=>catCur().kind==="tv"?CG_TV:CG_MOVIE;
function catReq(page){
  const c=catCur(),q=(UI.catQ||"").trim();
  if(UI.catSim&&UI.catSim.id)return{path:`/${UI.catSim.t}/${UI.catSim.id}/${CAT.simPath||"recommendations"}`,params:{language:"ru-RU",page}};
  if(q)return{path:"/search/multi",params:{query:q,language:"ru-RU",include_adult:"false",page}};
  const tv=c.kind==="tv",dk=tv?"first_air_date":"primary_release_date";
  const p=Object.assign({language:"ru-RU",include_adult:"false",page},c.p);
  if(UI.catGenre)p.with_genres=(p.with_genres?p.with_genres+",":"")+UI.catGenre;
  if(UI.catYear)p[tv?"first_air_date_year":"primary_release_year"]=UI.catYear;
  const today=todayStr();
  if(UI.catSort==="top"){p.sort_by="vote_average.desc";p["vote_count.gte"]=tv?150:400}
  else if(UI.catSort==="new"){p.sort_by=dk+".desc";p[dk+".lte"]=today;p["vote_count.gte"]=8}
  else if(UI.catSort==="soon"){p.sort_by=dk+".asc";p[dk+".gte"]=today}
  else if(UI.catSort==="soonpop"){p.sort_by="popularity.desc";p[dk+".gte"]=today}
  else p.sort_by="popularity.desc";
  return{path:"/discover/"+c.kind,params:p};
}
const catNorm=(x,t)=>({k:t+":"+x.id,t,id:x.id,title:x.title||x.name||x.original_title||x.original_name||"?",orig:x.original_title||x.original_name||"",
  y:String(x.release_date||x.first_air_date||"").slice(0,4),rd:x.release_date||x.first_air_date||"",p:x.poster_path,v:x.vote_average,vc:x.vote_count||0,
  g:x.genre_ids||[],lang:x.original_language,oc:x.origin_country||[],ov:x.overview||""});
const catType=x=>tmdbType(x.t,{genre_ids:x.g,origin_country:x.oc,original_language:x.lang});
function catSync(){
  const key=JSON.stringify([!!apiKey("tmdb"),UI.catCat,UI.catSort,UI.catGenre,UI.catYear,(UI.catQ||"").trim(),UI.catSim&&UI.catSim.t+UI.catSim.id]);
  if(CAT.key!==key){Object.assign(CAT,{simPath:"",key,tok:CAT.tok+1,loading:false,items:[],seen:new Set(),page:0,total:1,totalRes:0,err:""})}
}
async function catMore(){
  if(CAT.loading||CAT.page>=CAT.total)return;
  if(!apiKey("tmdb")){catPaint();return}
  const tok=CAT.tok;CAT.loading=true;CAT.err="";catPaint();
  try{
    const {path,params}=catReq(CAT.page+1);
    let r=await tmdbGet(path,params);
    if(CAT.tok!==tok)return;
    if(UI.catSim&&!(r.results||[]).length&&!CAT.page&&!CAT.simPath){CAT.simPath="similar";const q2=catReq(1);r=await tmdbGet(q2.path,q2.params);if(CAT.tok!==tok)return}
    const c=catCur();let res=r.results||[];
    if(UI.catSim)res=res.map(x=>catNorm(x,UI.catSim.t));
    else if(path==="/search/multi")res=res.filter(x=>x.media_type==="movie"||x.media_type==="tv").map(x=>catNorm(x,x.media_type));
    else{res=res.map(x=>catNorm(x,c.kind));if(c.not)res=res.filter(x=>x.lang!==c.not);res=res.filter(x=>tmdbRawType(x.t,{genre_ids:x.g,origin_country:x.oc,original_language:x.lang})===CAT_TYPE[c.k]);if(UI.catSort==="soon"||UI.catSort==="soonpop")res=res.filter(x=>x.p)}
    for(const x of res)if(!CAT.seen.has(x.k)){CAT.seen.add(x.k);CAT.items.push(x)}
    CAT.page=r.page||CAT.page+1;CAT.total=Math.min(r.total_pages||1,500);CAT.totalRes=r.total_results||0;
  }catch(e){if(CAT.tok===tok)CAT.err=e.message==="Failed to fetch"?"нет связи с TMDB":(e.message||"ошибка")}
  finally{if(CAT.tok===tok){CAT.loading=false;catPaint();setTimeout(catAuto,30)}}
}
function catAuto(){
  if(UI.tab!=="catalog"||CAT.loading||CAT.err||!CAT.page||CAT.page>=CAT.total)return;
  const s=$("#catSentinel");if(!s)return;
  if(s.getBoundingClientRect().top<innerHeight+600)catMore();
}
window.addEventListener("scroll",()=>{if(UI.tab==="catalog"){clearTimeout(catAuto.t);catAuto.t=setTimeout(catAuto,60)}},{passive:true});
window.addEventListener("resize",()=>{if(UI.tab==="catalog")catAuto()});
function catEnsure(){
  catSync();
  if(!CAT.page&&!CAT.loading&&!CAT.err&&apiKey("tmdb"))catMore();else catAuto();
}
function catIndex(){
  const bk=new Map(),bt=new Map();
  for(const i of DB.items){if(i.tmdb&&i.tmdb.id)bk.set(i.tmdb.type+":"+i.tmdb.id,i);bt.set(normT(i.title),i);if(i.ext&&i.ext.en)bt.set(normT(i.ext.en),i)}
  return{bk,bt};
}
function catState(x,ix){
  const a=ix.bk.get(x.k);if(a)return a;
  const b=ix.bt.get(normT(x.title))||(x.orig&&ix.bt.get(normT(x.orig)));
  if(b&&(!b.year||!x.y||Math.abs(b.year-(+x.y))<=1))return b;
  return null;
}
/* метка статуса в каталоге: смотрели / смотрим / на согласовании / в планах + кто уже видел */
function catBadge(st){
  const sn=st.status==="watched"?[]:seenList(st);
  const main=st.status==="watched"?`<span class="ccb w">✓ Просмотрено</span>`:st.status==="watching"?`<span class="ccb c">▶ Смотрим</span>`:st.status===PROP?`<span class="ccb q" title="На согласовании">🤝 Согласуем</span>`:`<span class="ccb p">В планах</span>`;
  const eye=sn.length?`<span class="ccb sub">${sn.length===DB.raters.length&&sn.length>1?"↻ Оба видели":"👁 "+esc(sn.join(", "))+" видел(а)"}</span>`:"";
  return main+eye;
}
function catCard(x,st){
  const upc=x.rd&&x.rd>todayStr();
  const badge=st?catBadge(st):`<button class="cx" data-chide="${x.k}" title="Не интересно — скрыть" aria-label="Скрыть">✕</button>`;
  const acts=(!st?`<button data-cadd="${x.k}">＋ В планы</button><button class="alt" data-cprop="${x.k}">🤝 На согласование</button><button class="alt" data-cwatch="${x.k}">✓ Смотрели — оценить</button>`:st.status==="planned"?`<button class="alt" data-cwatch="${x.k}">✓ Смотрели — оценить</button>`:st.status==="proposed"?`<button class="alt" data-toplan="${st.id}">＋ В планы</button><button class="alt" data-cwatch="${x.k}">✓ Смотрели — оценить</button>`:"")+`<button class="alt" data-csimk="${x.k}">≈ Похожие</button>`;
  return `<div class="cc${st?" in":""}">
    <div class="cp" data-cprev="${x.k}" title="${esc(x.ov||x.title)}">${x.p?`<img loading="lazy" src="${tmdbImg(x.p,"w342")}" alt="">`:`<span class="ph0">${esc(initials(x.title))}</span>`}
      ${isNum(x.v)&&x.v>0&&x.vc>=5?`<span class="cr">★ ${x.v.toFixed(1)}</span>`:""}${badge}${upc?`<span class="cs">📅 ${new Date(x.rd+"T00:00:00").toLocaleDateString("ru-RU",{day:"numeric",month:"short",year:"numeric"}).replace(/\s*г\.$/,"")}</span>`:""}
      ${acts?`<div class="ccact">${acts}</div>`:""}</div>
    <div class="cbody" data-cprev="${x.k}"><b>${esc(x.title)}</b><span>${x.y||"—"} · ${esc(catType(x))}</span></div></div>`;
}
function catBodyHTML(){
  if(!apiKey("tmdb"))return `<div class="panel"><h3>Нужен бесплатный ключ TMDB</h3>
    <p class="muted" style="margin:6px 0 12px">Каталог берёт популярное с TMDB: тысячи фильмов, сериалов, аниме и дорам, листайте сколько хочется. Ключ — на themoviedb.org → Настройки → API (бесплатно, пара минут). Вставьте его сюда — он сохранится и во вкладке «Данные».</p>
    <div class="row"><input class="inp" id="catKeyIn" placeholder="Ключ TMDB (API Key или токен)" style="flex:1;min-width:200px" autocomplete="off"><button class="btn pri" data-ckey>Подключить</button></div></div>`;
  const ix=catIndex(),hid=new Set(DB.recoHide||[]),q=(UI.catQ||"").trim();
  let hiddenN=0;const vis=[];
  for(const x of CAT.items){const st=catState(x,ix);if(!q&&!UI.catSim&&(hid.has(x.k)||(UI.catHide&&st))){hiddenN++;continue}vis.push([x,st])}
  const sk=CAT.loading?Array.from({length:CAT.page?6:18},()=>`<div class="cc sk"><div class="cp"></div><div class="cbody"><i></i><i></i></div></div>`).join(""):"";
  let note="";
  if(CAT.err)note=`<p class="rnote">⚠ ${esc(CAT.err)} <button class="btn sm" data-cretry>Повторить</button></p>`;
  else if(!CAT.loading&&CAT.page>=CAT.total&&!vis.length)note=`<div class="empty">Ничего не нашлось. Попробуйте другой жанр, год или запрос.</div>`;
  else if(!CAT.loading&&CAT.page&&CAT.page>=CAT.total)note=`<p class="rnote" style="text-align:center">Это всё, что есть в этой подборке</p>`;
  const nh=(DB.recoHide||[]).length;
  const stat=CAT.items.length||CAT.loading?`<p class="rnote" style="margin:0 0 10px">Загружено ${CAT.items.length}${CAT.totalRes?` из ~${CAT.totalRes.toLocaleString("ru-RU")}`:""}${hiddenN?` · скрыто ${hiddenN} (уже в списке или «не интересно»)`:""}${nh?` · <button class="lnk2" data-cunhide>вернуть скрытые «не интересно» (${nh})</button>`:""}</p>`:"";
  return stat+`<div class="ccgrid">${vis.map(([x,st])=>catCard(x,st)).join("")}${sk}</div>${note}<div id="catSentinel" style="height:1px"></div>`;
}
function catPaint(){const el=$("#catBody");if(el)el.innerHTML=catBodyHTML()}
function vCatalog(){
  catSync();
  const gl=catGenres();if(UI.catGenre&&!gl.some(g=>String(g[0])===String(UI.catGenre)))UI.catGenre="";
  const sim=UI.catSim&&UI.catSim.id,y0=new Date().getFullYear();
  const years=Array.from({length:y0-1989},(_,i)=>y0+1-i);
  return `<div class="ptitle"><div><h1>Каталог</h1><p>Что сейчас смотрят: популярное из TMDB — фильмы, сериалы, аниме, дорамы. Наведите на постер — добавить в планы или сразу оценить.</p></div></div>
  ${sim?`<div class="simbar"><span>≈ Похожие на <b>${esc(UI.catSim.title)}</b></span><button class="btn sm" data-csimx>✕ Вернуться к каталогу</button></div>`:""}
  ${recoHTML()}
  <div class="chips catcats" data-ui="catCat">${CAT_CATS.map(c=>`<button class="chip ${UI.catCat===c.k?"on":""}" data-v="${c.k}">${c.n}</button>`).join("")}</div>
  <div class="toolbar catbar soonbar">
    <button class="chip ${UI.catSort==="soon"||UI.catSort==="soonpop"?"on":""}" id="catSoon" ${(UI.catQ||"").trim()||sim?"disabled":""} title="Фильмы и сериалы, которые ещё не вышли">📅 Скоро выйдут</button>
    ${(UI.catSort==="soon"||UI.catSort==="soonpop")&&!(UI.catQ||"").trim()&&!sim?`<div class="seg" data-ui="catSort"><button data-v="soon" class="${UI.catSort==="soon"?"on":""}">По дате</button><button data-v="soonpop" class="${UI.catSort==="soonpop"?"on":""}">По популярности</button></div><span class="dim" style="font-size:12.5px">только с постером · ближайшие сверху, если «по дате»</span>`:""}
  </div>
  <div class="toolbar catbar">
    <input class="inp" id="catQ" type="search" placeholder="🔎 Найти любой фильм или сериал (по всему TMDB)…" value="${esc(UI.catQ||"")}" style="min-width:220px;flex:1 1 220px;max-width:360px" autocomplete="off">
    <select class="inp" data-uis="catSort" ${(UI.catQ||"").trim()||sim?"disabled":""}>${CAT_SORTS.map(([k,n])=>`<option value="${k}" ${UI.catSort===k?"selected":""}>${n}</option>`).join("")}</select>
    <select class="inp" data-uis="catGenre" ${(UI.catQ||"").trim()||sim?"disabled":""}><option value="">Все жанры</option>${gl.map(([id,n])=>`<option value="${id}" ${String(UI.catGenre)===String(id)?"selected":""}>${n}</option>`).join("")}</select>
    <select class="inp" data-uis="catYear" ${(UI.catQ||"").trim()||sim?"disabled":""}><option value="">Любой год</option>${years.map(y=>`<option value="${y}" ${String(UI.catYear)===String(y)?"selected":""}>${y}</option>`).join("")}</select>
    <label class="chk" style="font-size:13.5px"><input type="checkbox" id="catHide" ${UI.catHide?"checked":""}> Скрывать то, что уже в списке</label>
  </div>
  ${gridSizerHTML()}
  <div id="catBody">${catBodyHTML()}</div>`;
}
async function catAdd(k,mode){
  if(CATB.has(k))return;CATB.add(k);
  const [t,id]=k.split(":");
  try{
    const ex=DB.items.find(i=>i.tmdb&&i.tmdb.type===t&&String(i.tmdb.id)===id);
    let it=ex;
    if(!it){toast("Добавляю…");it=await tmdbNewItem(t,id,mode==="prop"?PROP:"planned");DB.items.push(it)}
    if(mode==="plan"||mode==="prop"){save();catPaint();toast(mode==="prop"?"🤝 «"+it.title+"» — на согласовании":"✓ «"+it.title+"» — в планах")}
    else{
      if(document.getElementById("dlg2").open)closeDlg("dlg2");
      const created=!ex;
      openRate(it.id,{finish:true});
      const d=document.getElementById("dlg");
      const onClose=()=>{d.removeEventListener("close",onClose);if(created&&it.status!=="watched")DB.items=DB.items.filter(x=>x!==it);if(UI.tab==="catalog")catPaint()};
      d.addEventListener("close",onClose);
    }
  }catch(e){toast("⚠ "+(e.message==="Failed to fetch"?"нет связи с TMDB":e.message))}
  finally{CATB.delete(k)}
}
function catPreview(k){
  const x=CAT.items.find(r=>r.k===k);if(!x)return;
  const st=catState(x,catIndex()),g=[...new Set(x.g.flatMap(i=>TG[i]||[]))];
  const html=`<div class="dh"><h2>${esc(x.title)}</h2><button class="btn icon ghost" data-close>✕</button></div>
  <div class="db"><div class="det"><div><div class="poster">${x.p?`<img src="${tmdbImg(x.p,"w500")}" alt="">`:posterHTML({title:x.title})}</div></div>
    <div><div class="meta"><span class="tag">${esc(catType(x))}</span>${x.y?`<span>${x.y}</span>`:""}${isNum(x.v)&&x.vc>=5?`<span class="tag ext">TMDB ★ ${x.v.toFixed(1)}</span>`:""}${st?`<span class="stt ${st.status==="watched"?"w":st.status==="watching"?"c":"p"}">${st.status==="watched"?"Просмотрено":st.status==="watching"?"Смотрим":"В планах"}</span>`:""}</div>
      ${x.orig&&x.orig!==x.title?`<p class="dim" style="margin:0 0 10px">${esc(x.orig)}</p>`:""}
      ${g.length?`<div class="chips" style="margin-bottom:12px">${g.map(t=>`<span class="tag am">${esc(t)}</span>`).join("")}</div>`:""}
      ${x.rd&&x.rd>todayStr()?`<p class="muted" style="margin:0 0 10px">📅 Выходит ${esc(new Date(x.rd+"T00:00:00").toLocaleDateString("ru-RU",{day:"numeric",month:"long",year:"numeric"}).replace(/\s*г\.$/,""))}</p>`:""}
      <p class="syn${x.ov?"":" dim"}">${x.ov?esc(x.ov):"Описания на русском пока нет."}</p></div></div></div>
  <div class="df"><a class="btn" href="https://www.themoviedb.org/${x.t}/${x.id}?language=ru-RU" target="_blank" rel="noopener">TMDB ↗</a>${st?"":`<button class="btn ghost" data-chide="${x.k}">Не интересно</button>`}<button class="btn" data-csimk="${x.k}">≈ Похожие</button><div class="sp"></div>${st?(st.status===PROP?`<button class="btn" data-toplan="${st.id}">＋ В планы</button>`:""):`<button class="btn" data-cadd="${x.k}">＋ В планы</button><button class="btn" data-cprop="${x.k}">🤝 На согласование</button>`}${!st||st.status==="planned"||st.status===PROP?`<button class="btn pri" data-cwatch="${x.k}">✓ Смотрели — оценить</button>`:""}</div>`;
  showDlg(html,"dlg2");
}

/* ============ смена постера через TMDB ============ */
function openPosterPicker(ref,title,year,onPick){
  if(!apiKey("tmdb")){toast("Для выбора постера нужен ключ TMDB (вкладка «Данные» или «Каталог»)");return}
  const d=showDlg(`<div class="dh"><h2>Постер из TMDB</h2><button class="btn icon ghost" data-close>✕</button></div>
    <div class="db"><div class="row" style="margin-bottom:12px"><input class="inp" id="ppQ" value="${esc(title||"")}" placeholder="Название для поиска" style="flex:1;min-width:180px" autocomplete="off"><button class="btn" id="ppGo">🔎 Найти</button></div><div id="ppBody"></div></div>`,"dlg2");
  const body=()=>d.querySelector("#ppBody"),say=h=>{body().innerHTML=h};
  const loadImages=async(t,id,name)=>{
    say(`<p class="muted">⏳ Загружаю постеры…</p>`);
    try{
      const r=await tmdbGet(`/${t}/${id}/images`,{include_image_language:"ru,en,null"});
      const rank=l=>l==="ru"?0:!l?1:l==="en"?2:3;
      const ps=(r.posters||[]).slice().sort((a,b)=>rank(a.iso_639_1)-rank(b.iso_639_1)||(b.vote_average||0)-(a.vote_average||0));
      say(ps.length?`${name?`<p class="muted" style="margin:0 0 10px">${esc(name)} · постеров: ${ps.length}. Нажмите на понравившийся.</p>`:""}<div class="ppgrid">${ps.map(p=>`<button type="button" class="ppi" data-pp="${esc(p.file_path)}" title="${p.width}×${p.height}"><img loading="lazy" src="${tmdbImg(p.file_path,"w342")}" alt=""><span>${p.iso_639_1?esc(p.iso_639_1.toUpperCase()):"без текста"}</span></button>`).join("")}</div>`:`<div class="empty">У этой записи в TMDB нет постеров.</div>`);
    }catch(e){say(`<p class="rnote">⚠ ${esc(e.message==="Failed to fetch"?"нет связи с TMDB":e.message)}</p>`)}
  };
  const search=async q=>{
    q=(q||"").trim();if(!q){say(`<p class="muted">Введите название.</p>`);return}
    say(`<p class="muted">⏳ Ищу…</p>`);
    try{
      const r=await tmdbGet("/search/multi",{query:q,language:"ru-RU",include_adult:"false"});
      const res=(r.results||[]).filter(x=>x.media_type==="movie"||x.media_type==="tv").slice(0,12);
      say(res.length?`<p class="muted" style="margin:0 0 10px">Выберите, какой именно проект:</p><div class="ppgrid sm">${res.map(x=>`<button type="button" class="ppi" data-ppt="${x.media_type}:${x.id}" data-ppn="${esc(x.title||x.name)}">${x.poster_path?`<img loading="lazy" src="${tmdbImg(x.poster_path,"w185")}" alt="">`:`<i class="ph0">?</i>`}<span>${esc((x.title||x.name)+" · "+String(x.release_date||x.first_air_date||"").slice(0,4))}</span></button>`).join("")}</div>`:`<div class="empty">Ничего не нашлось.</div>`);
    }catch(e){say(`<p class="rnote">⚠ ${esc(e.message==="Failed to fetch"?"нет связи с TMDB":e.message)}</p>`)}
  };
  d.onclick=e=>{
    const a=e.target.closest("[data-pp]");if(a){onPick(tmdbImg(a.dataset.pp,"w500"));closeDlg("dlg2");return}
    const b=e.target.closest("[data-ppt]");if(b){const[t,id]=b.dataset.ppt.split(":");loadImages(t,id,b.dataset.ppn);return}
    if(e.target.closest("#ppGo"))search(d.querySelector("#ppQ").value);
  };
  d.querySelector("#ppQ").addEventListener("keydown",e=>{if(e.key==="Enter")search(e.target.value)});
  if(ref&&ref.id)loadImages(ref.type,ref.id,title);else search(title);
}

function catSimilar(t,id,title){
  UI.catSim={t,id:+id,title:title||""};UI.catQ="";saveUI();
  closeDlg("dlg2");closeDlg("dlg");
  if(UI.tab!=="catalog")location.hash="catalog";else render(true);
  window.scrollTo(0,0);
}
async function catSimilarFor(it){
  if(it.tmdb&&it.tmdb.id){catSimilar(it.tmdb.type,it.tmdb.id,it.title);return}
  if(!apiKey("tmdb")){toast("Нужен ключ TMDB (вкладка «Каталог» или «Данные»)");return}
  try{
    const r=await tmdbGet("/search/multi",{query:it.title,language:"ru-RU",include_adult:"false"});
    const m=(r.results||[]).filter(x=>x.media_type==="movie"||x.media_type==="tv");
    const best=m.find(x=>it.year&&String(x.release_date||x.first_air_date||"").slice(0,4)==String(it.year))||m[0];
    if(!best){toast("В TMDB не нашлось «"+it.title+"»");return}
    catSimilar(best.media_type,best.id,it.title);
  }catch(e){toast("⚠ "+(e.message==="Failed to fetch"?"нет связи с TMDB":e.message))}
}

/* ============ VIEW: викторина ============ */
const QZ_KINDS=[["poster","🖼 По постеру","Угадай фильм по постеру"],["frame","🎞 По кадру","Угадай проект по кадру"],["plot","📝 По описанию","Угадай по описанию сюжета"],["year","📅 Год выхода","В каком году вышел проект?"],["genre","🎭 Жанр","Какой жанр у этого проекта?"],["duel","⚖️ Кто оценил выше","Кто из вас поставил оценку выше?"]];
const QZ={state:"idle",q:null,res:[],used:new Set(),n:10,bd:{},kinds:[],err:""};
const qzShuf=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const qzPick=a=>a[Math.floor(Math.random()*a.length)];
/* категории контента: какие типы записей в какую группу попадают */
const QZ_CATS=[["film","🎬 Фильмы",["Фильм"]],["cartoon","🧸 Мультфильмы",["Мультфильм","Мультсериал"]],["anime","🌸 Аниме",["Аниме"]],["series","📺 Сериалы",["Сериал"]],["dorama","🍜 Дорамы",["Дорама"]],["game","🎮 Игры",["Игра"]],["other","📦 Прочее",[]]];
const qzCatOf=ty=>{const c=QZ_CATS.find(c=>c[2].includes(ty));return c?c[0]:"other"};
const qzAllWatched=()=>DB.items.filter(i=>i.status==="watched"&&i.title);
const qzCatsOn=()=>new Set(Array.isArray(UI.qzCats)?UI.qzCats:QZ_CATS.map(c=>c[0]).filter(k=>k!=="game"));
const qzPool=()=>{const on=qzCatsOn();return qzAllWatched().filter(i=>on.has(qzCatOf(i.type)))};
const qzHasImg=i=>typeof i.poster==="string"&&i.poster.length>8;
function qzPlayer(){
  const R=DB.raters;
  if(UI.qzWho&&UI.qzWho!=="turn"&&R.includes(UI.qzWho))return UI.qzWho;
  return R[QZ.res.length%R.length];
}
function qzKinds(){
  const on=Array.isArray(UI.qzTypes)?UI.qzTypes:QZ_KINDS.map(k=>k[0]);
  return QZ_KINDS.map(k=>k[0]).filter(k=>on.includes(k)&&(k!=="frame"||apiKey("tmdb"))&&(k!=="duel"||DB.raters.length>=2));
}
/* варианты ответа: похожие по типу записи в приоритете */
function qzOthers(it,pool,n){
  const used=new Set([normT(it.title)]),out=[];
  const cand=qzShuf(pool.filter(x=>x.id!==it.id&&x.type===it.type)).concat(qzShuf(pool.filter(x=>x.id!==it.id&&x.type!==it.type)));
  for(const x of cand){const k=normT(x.title);if(used.has(k))continue;used.add(k);out.push(x);if(out.length>=n)break}
  return out;
}
const qzTitleOpts=(it,pool)=>{const o=qzOthers(it,pool,3);if(o.length<3)return null;return qzShuf([it,...o]).map(x=>({label:x.title,ok:x.id===it.id}))};
function qzMask(it){
  let s=String(it.synopsis||"").replace(/\s+/g," ").trim();
  const names=[it.title,it.ext&&it.ext.en].filter(Boolean);
  for(const n of names){s=s.replace(new RegExp(n.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),"gi"),"▮▮▮")}
  if(s.length>340){s=s.slice(0,340);const i=Math.max(s.lastIndexOf(". "),s.lastIndexOf(" "));s=s.slice(0,i>200?i:340)+"…"}
  return s;
}
async function qzBackdrop(it){
  if(QZ.bd[it.id]!==undefined)return QZ.bd[it.id];
  let url=null;
  try{
    const r=await tmdbGet(`/${it.tmdb.type}/${it.tmdb.id}/images`,{include_image_language:"null"});
    const b=(r.backdrops||[]).filter(x=>!x.iso_639_1);
    if(b.length)url=tmdbImg(qzPick(b.slice(0,12)).file_path,"w780");
  }catch(e){logErr("Викторина: кадр",e,1)}
  QZ.bd[it.id]=url;return url;
}
async function qzMakeOne(kind,pool){
  const R=DB.raters;
  const fresh=a=>{const f=a.filter(i=>!QZ.used.has(i.id));return f.length?f:a};
  const base={kind,reveal:null};
  if(kind==="poster"){
    const c=fresh(pool.filter(qzHasImg));if(!c.length)return null;const it=qzPick(c),opts=qzTitleOpts(it,pool);if(!opts)return null;
    return{...base,it,prompt:"Что это за проект?",img:it.poster,opts};
  }
  if(kind==="frame"){
    const c=fresh(pool.filter(i=>i.tmdb&&i.tmdb.id));
    for(const it of qzShuf(c).slice(0,4)){const url=await qzBackdrop(it);if(!url)continue;const opts=qzTitleOpts(it,pool);if(!opts)continue;
      return{...base,it,prompt:"Угадайте проект по кадру",img:url,wide:true,opts}}
    return null;
  }
  if(kind==="plot"){
    const c=fresh(pool.filter(i=>String(i.synopsis||"").length>=80));if(!c.length)return null;const it=qzPick(c),opts=qzTitleOpts(it,pool);if(!opts)return null;
    return{...base,it,prompt:"Что за проект по описанию?",text:qzMask(it),opts};
  }
  if(kind==="year"){
    const c=fresh(pool.filter(i=>isNum(i.year)));if(!c.length)return null;const it=qzPick(c),cy=new Date().getFullYear()+1;
    const ys=new Set([it.year]);for(const d of qzShuf([-9,-7,-5,-4,-3,-2,-1,1,2,3,4,5,7,9])){const y=it.year+d;if(y>=1900&&y<=cy)ys.add(y);if(ys.size>=4)break}
    if(ys.size<4)return null;
    return{...base,it,prompt:`В каком году вышел «${it.title}»?`,img:qzHasImg(it)?it.poster:null,small:true,opts:[...ys].sort((a,b)=>a-b).map(y=>({label:String(y),ok:y===it.year}))};
  }
  if(kind==="genre"){
    const all=[...new Set(pool.flatMap(i=>i.genres||[]))];
    const c=fresh(pool.filter(i=>(i.genres||[]).length));if(!c.length)return null;const it=qzPick(c);
    const right=qzPick(it.genres),wrong=qzShuf(all.filter(g=>!it.genres.includes(g))).slice(0,3);
    if(wrong.length<3)return null;
    return{...base,it,prompt:`Какой жанр есть у «${it.title}»?`,img:qzHasImg(it)?it.poster:null,small:true,opts:qzShuf([right,...wrong]).map(g=>({label:g,ok:g===right}))};
  }
  if(kind==="duel"){
    const [a,b]=R;
    const c=fresh(pool.filter(i=>{const x=itemScore(i,a),y=itemScore(i,b);return isNum(x)&&isNum(y)&&Math.abs(x-y)>=.3}));if(!c.length)return null;
    const it=qzPick(c),hi=itemScore(it,a)>itemScore(it,b)?a:b;
    return{...base,it,prompt:`Кто из вас поставил «${it.title}» выше?`,img:qzHasImg(it)?it.poster:null,small:true,opts:[a,b].map(n=>({label:n,ok:n===hi})),duel:true};
  }
  return null;
}
async function qzNextQ(){
  const pool=qzPool(),kinds=qzKinds();
  QZ.state="loading";qzPaint();
  let q=null;
  for(let t=0;t<12&&!q;t++)q=await qzMakeOne(qzPick(kinds),pool);
  if(!q)for(const k of kinds){q=await qzMakeOne(k,pool);if(q)break}
  if(!q){QZ.state="idle";QZ.err="Не получилось составить вопрос — отметьте больше типов вопросов или оцените больше проектов.";qzPaint();return}
  QZ.used.add(q.it.id);QZ.q=q;QZ.state="q";QZ.ans=null;qzPaint();
}
function qzStart(){
  const kinds=qzKinds();
  if(!kinds.length){toast("Отметьте хотя бы один тип вопросов");return}
  if(qzPool().length<6){toast("В выбранных категориях нужно хотя бы 6 просмотренных проектов");return}
  Object.assign(QZ,{state:"loading",q:null,ans:null,res:[],used:new Set(),n:+UI.qzLen||10,err:""});
  qzNextQ();
}
function qzAnswer(i){
  if(QZ.state!=="q"||QZ.ans)return;
  const q=QZ.q,o=q.opts[i];if(!o)return;
  const who=qzPlayer(),ok=!!o.ok;
  QZ.ans={i,ok,who};QZ.res.push({who,ok,kind:q.kind,id:q.it.id,n:q.it.title});
  DB.quizLog=Array.isArray(DB.quizLog)?DB.quizLog:[];
  DB.quizLog.push({id:"q"+Date.now().toString(36)+Math.random().toString(36).slice(2,6),t:Date.now(),w:who,k:q.kind,i:q.it.id,n:q.it.title,ok:ok?1:0,g:(q.it.genres||[]).slice(0,3),ty:q.it.type});
  if(DB.quizLog.length>1200)DB.quizLog=DB.quizLog.slice(-1200);
  save();qzPaint();
}
function qzNext(){
  if(QZ.res.length>=QZ.n){QZ.state="done";qzPaint();return}
  qzNextQ();
}
const qzScore=()=>DB.raters.map(n=>{const r=QZ.res.filter(x=>x.who===n);return{n,ok:r.filter(x=>x.ok).length,all:r.length}});
function qzHTML(){
  if(QZ.state==="loading")return `<div class="qz"><div class="qz-load"><i class="spin"></i> Готовлю вопрос…</div></div>`;
  if(QZ.state==="q")return qzQuestionHTML();
  if(QZ.state==="done")return qzDoneHTML();
  return qzIdleHTML();
}
function qzCatChips(){
  const all=qzAllWatched(),on=qzCatsOn(),cnt={};
  for(const i of all){const k=qzCatOf(i.type);cnt[k]=(cnt[k]||0)+1}
  return QZ_CATS.filter(c=>cnt[c[0]]||on.has(c[0])&&c[0]!=="other"&&c[0]!=="game").map(([k,n])=>{const c=cnt[k]||0;return `<button class="chip ${on.has(k)&&c?"on":""}" data-qzc="${k}" ${c?"":"disabled"}>${n} <small>${c}</small></button>`}).join("")
    +`<button class="chip" data-qzc="*" title="Выбрать всё">Все</button>`;
}
function qzIdleHTML(){
  const pool=qzPool(),R=DB.raters,on=new Set(qzKinds()),hasKey=!!apiKey("tmdb"),log=DB.quizLog||[];
  const need=pool.length<6,allN=qzAllWatched().length;
  return `<div class="panel qz-set">
    ${QZ.err?`<p class="rnote">⚠ ${esc(QZ.err)}</p>`:""}
    <p class="muted" style="margin:0 0 14px">Вопросы строятся по вашим просмотренным проектам (${pool.length}${pool.length!==allN?` из ${allN}`:""}). Играйте вдвоём по очереди или каждый за себя — результаты копятся в статистике.</p>
    <div class="flt"><label>Кто играет</label><div class="chips" data-ui="qzWho">${chipHTML("turn","🔁 По очереди",(UI.qzWho||"turn")==="turn")}${R.map(n=>chipHTML(n,esc(n),UI.qzWho===n)).join("")}</div></div>
    <div class="flt" style="margin-top:14px"><label>Что спрашивать</label><div class="chips">${qzCatChips()}</div></div>
    <div class="flt" style="margin-top:14px"><label>Типы вопросов</label><div class="chips">${QZ_KINDS.map(([k,n])=>{const dis=(k==="frame"&&!hasKey)||(k==="duel"&&R.length<2);return `<button class="chip ${on.has(k)?"on":""}" data-qzt="${k}" ${dis?`disabled title="${k==="frame"?"нужен ключ TMDB":"нужны два оценщика"}"`:""}>${n}</button>`}).join("")}</div></div>
    <div class="flt" style="margin-top:14px"><label>Вопросов в раунде</label>${segHTML("qzLen",[["5","5"],["10","10"],["20","20"]],String(UI.qzLen||"10"))}</div>
    <div style="margin-top:20px;display:flex;gap:12px;flex-wrap:wrap;align-items:center"><button class="btn pri" data-qzstart ${need?"disabled":""} style="padding:10px 26px;font-size:16px">▶ Начать</button>${need?`<span class="dim">Нужно хотя бы 6 просмотренных проектов</span>`:log.length?`<span class="dim">Всего ответов в статистике: ${log.length}</span>`:""}</div>
  </div>`;
}
function qzScoreStrip(){
  return `<div class="qz-sc">${qzScore().map(s=>`<span class="${QZ.ans&&QZ.ans.who===s.n?"hot":""}"><b>${esc(s.n)}</b> ${s.ok}/${s.all}</span>`).join("")}</div>`;
}
function qzQuestionHTML(){
  const q=QZ.q,a=QZ.ans,i=QZ.res.length-(a?1:0),who=a?a.who:qzPlayer();
  const kindName=(QZ_KINDS.find(k=>k[0]===q.kind)||[])[1]||"";
  const imgBox=q.img?`<div class="qz-img${q.wide?" wide":""}${q.small?" small":""}"><img src="${esc(q.img)}" alt="" onerror="this.parentNode.classList.add('bad')"></div>`:"";
  const it=q.it;
  const reveal=a?`<div class="qz-rev ${a.ok?"ok":"bad"}"><div class="qz-rp">${it.poster?`<img src="${esc(it.poster)}" alt="">`:""}</div><div><b>${a.ok?"✓ Верно!":"✗ Не угадали"}</b><div>«${esc(it.title)}» · ${it.year||"—"} · ${esc(it.type)}</div>${q.duel?`<div class="dim">${DB.raters.map(n=>esc(n)+" — "+f1(itemScore(it,n))).join(" · ")}</div>`:`<div class="dim">${esc((it.genres||[]).join(", "))}</div>`}</div></div>
      <div style="display:flex;gap:10px;margin-top:14px"><button class="btn pri" data-qznext>${QZ.res.length>=QZ.n?"Итоги →":"Дальше →"} <small class="dim">Enter</small></button></div>`:"";
  return `<div class="qz">
    <div class="qz-top"><span class="qz-kind">${kindName}</span><span>Вопрос <b>${i+1}</b> из ${QZ.n}</span><span class="qz-who">Отвечает: <b>${esc(who)}</b></span>${qzScoreStrip()}<div class="sp"></div><button class="btn sm ghost" data-qzend>Закончить раунд</button></div>
    <div class="qz-prog"><i style="width:${(QZ.res.length/QZ.n*100).toFixed(1)}%"></i></div>
    <div class="qz-body${q.wide?" wide":""}">${imgBox}
      <div class="qz-main"><h2>${esc(q.prompt)}</h2>${q.text?`<blockquote class="qz-text">${esc(q.text)}</blockquote>`:""}
        <div class="qz-opts">${q.opts.map((o,k)=>{const cls=!a?"":o.ok?" right":k===a.i?" wrong":" dim";return `<button class="qzo${cls}" data-qzopt="${k}" ${a?"disabled":""}><kbd>${k+1}</kbd><span>${esc(o.label)}</span></button>`}).join("")}</div>
        ${reveal}</div></div></div>`;
}
function qzDoneHTML(){
  const sc=qzScore().filter(s=>s.all),top=Math.max(0,...sc.map(s=>s.ok)),win=sc.filter(s=>s.ok===top);
  const miss=QZ.res.filter(x=>!x.ok),total=QZ.res.length;
  return `<div class="panel qz-done"><h2>Раунд окончен</h2>
    <div class="qz-res">${sc.map(s=>`<div class="qz-rc ${sc.length>1&&win.length===1&&win[0].n===s.n?"win":""}"><b>${esc(s.n)}</b><span class="big">${s.ok}<small>/${s.all}</small></span><div class="qbar"><i style="width:${s.all?s.ok/s.all*100:0}%"></i></div></div>`).join("")}</div>
    <p class="muted" style="text-align:center;margin:10px 0 0">${sc.length>1?(win.length===1?`🏆 Победил ${esc(win[0].n)}!`:"🤝 Ничья!"):""} Всего верных ответов: ${QZ.res.filter(x=>x.ok).length} из ${total}.</p>
    ${miss.length?`<p class="muted" style="margin:16px 0 6px">Где ошиблись:</p><div class="chips">${miss.map(m=>`<span class="tag">${esc(m.n)} · ${esc(m.who)}</span>`).join("")}</div>`:""}
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:20px;justify-content:center"><button class="btn pri" data-qzstart>↻ Сыграть ещё</button><button class="btn" data-qzend>Настройки</button><button class="btn ghost" data-ui-go="stats">📊 Статистика</button></div></div>`;
}
function qzPaint(){const el=document.getElementById("qzBox");if(el)el.innerHTML=qzHTML()}

/* ---- статистика ---- */
function qzStatsData(){
  const L=DB.quizLog||[],R=DB.raters,S={};
  for(const n of R)S[n]={n,all:0,ok:0,kind:{},genre:{},proj:{},type:{},best:0,cur:0,seq:[]};
  for(const e of L.slice().sort((a,b)=>a.t-b.t)){
    const s=S[e.w];if(!s)continue;
    s.all++;s.ok+=e.ok;s.seq.push(e.ok);
    s.cur=e.ok?s.cur+1:0;if(s.cur>s.best)s.best=s.cur;
    const bump=(m,k,extra)=>{const o=m[k]||(m[k]=Object.assign({all:0,ok:0},extra));o.all++;o.ok+=e.ok};
    bump(s.kind,e.k);bump(s.type,e.ty||"—");
    for(const g of e.g||[])bump(s.genre,g);
    bump(s.proj,e.i,{n:e.n});
  }
  return S;
}
const pc=(a,b)=>b?Math.round(a/b*100):null;
function qzCell(o,i){
  if(!o||!o.all)return `<td class="c dim">—</td>`;
  const p=pc(o.ok,o.all);
  return `<td><div class="qcell"><span class="qbar c${i}"><i style="width:${p}%"></i></span><b>${p}%</b><small class="dim">${o.ok}/${o.all}</small></div></td>`;
}
function qzDyn(S){
  const R=DB.raters,W=600,H=150,P=24;
  const lines=R.map((n,i)=>{
    const seq=S[n].seq;if(seq.length<5)return null;
    const win=Math.min(15,seq.length),pts=[];
    for(let k=win-1;k<seq.length;k++){let s=0;for(let j=k-win+1;j<=k;j++)s+=seq[j];pts.push(s/win)}
    return{n,i,pts};
  }).filter(Boolean);
  if(!lines.length)return "";
  const mx=Math.max(...lines.map(l=>l.pts.length));
  const X=k=>P+(mx<=1?0:k/(mx-1))*(W-2*P),Y=v=>H-P-v*(H-2*P);
  return `<svg viewBox="0 0 ${W} ${H}" class="qz-dyn" role="img" aria-label="Динамика точности ответов">
    ${[0,.5,1].map(v=>`<line x1="${P}" x2="${W-P}" y1="${Y(v)}" y2="${Y(v)}" class="gl"/><text x="2" y="${Y(v)+4}" class="gt">${v*100}%</text>`).join("")}
    ${lines.map(l=>`<polyline class="ln c${l.i}" fill="none" points="${l.pts.map((v,k)=>X(k).toFixed(1)+","+Y(v).toFixed(1)).join(" ")}"/>`).join("")}
  </svg><div class="qz-leg">${lines.map(l=>`<span><i class="c${l.i}"></i>${esc(l.n)}</span>`).join("")}<span class="dim">скользящее среднее по 15 ответам</span></div>`;
}
function qzStatsHTML(){
  const L=DB.quizLog||[],R=DB.raters;
  if(!L.length)return `<div class="empty">Статистика появится после первого раунда. Сыграйте — и здесь будет видно, кто лучше знает фильмы, жанры и проекты.</div>`;
  const S=qzStatsData();
  const kpi=`<div class="qz-kpis">${R.map((n,i)=>{const s=S[n];return `<div class="panel qk"><h3 class="c${i}">${esc(n)}</h3><div class="big">${s.all?pc(s.ok,s.all)+"%":"—"}</div><div class="dim">${s.ok} верно из ${s.all}</div><div class="qbar c${i}"><i style="width:${s.all?pc(s.ok,s.all):0}%"></i></div><div class="dim" style="margin-top:8px">Лучшая серия: <b>${s.best}</b> подряд</div></div>`}).join("")}</div>`;
  const kinds=QZ_KINDS.filter(k=>R.some(n=>S[n].kind[k[0]]));
  const kindT=`<div class="panel"><h3>По типам вопросов</h3><div class="tbl-wrap"><table class="t qz-t"><thead><tr><th>Тип</th>${R.map(n=>`<th>${esc(n)}</th>`).join("")}</tr></thead><tbody>${kinds.map(k=>`<tr><td>${k[1]}</td>${R.map((n,i)=>qzCell(S[n].kind[k[0]],i)).join("")}</tr>`).join("")}</tbody></table></div></div>`;
  const catAgg=(n,k)=>Object.entries(S[n].type).reduce((a,[ty,o])=>{if(qzCatOf(ty)===k){a.all+=o.all;a.ok+=o.ok}return a},{all:0,ok:0});
  const cats=QZ_CATS.filter(c=>R.some(n=>catAgg(n,c[0]).all));
  const catT=cats.length?`<div class="panel"><h3>По типам контента</h3><div class="tbl-wrap"><table class="t qz-t"><thead><tr><th>Контент</th>${R.map(n=>`<th>${esc(n)}</th>`).join("")}</tr></thead><tbody>${cats.map(c=>`<tr><td>${c[1]}</td>${R.map((n,i)=>qzCell(catAgg(n,c[0]),i)).join("")}</tr>`).join("")}</tbody></table></div></div>`:"";
  const gset=new Set();R.forEach(n=>Object.keys(S[n].genre).forEach(g=>gset.add(g)));
  const gs=[...gset].map(g=>({g,all:R.reduce((s,n)=>s+(S[n].genre[g]?S[n].genre[g].all:0),0)})).sort((a,b)=>b.all-a.all||cmpRu(a.g,b.g)).slice(0,14);
  const best=R.map(n=>{const a=Object.entries(S[n].genre).filter(([g,o])=>o.all>=3).map(([g,o])=>({g,p:o.ok/o.all})).sort((x,y)=>y.p-x.p);return{n,b:a[0],w:a.length>1?a[a.length-1]:null}});
  const genreT=`<div class="panel"><h3>По жанрам</h3>${best.some(x=>x.b)?`<div class="qz-hl">${best.map((x,i)=>x.b?`<span><b class="c${i}">${esc(x.n)}</b>: сильнее всего — ${esc(x.b.g)} (${Math.round(x.b.p*100)}%)${x.w?`, слабее — ${esc(x.w.g)} (${Math.round(x.w.p*100)}%)`:""}</span>`:"").join("")}</div>`:`<p class="dim" style="margin:0 0 8px">Лучшие и худшие жанры появятся после 3+ ответов на жанр.</p>`}
    <div class="tbl-wrap"><table class="t qz-t"><thead><tr><th>Жанр</th>${R.map(n=>`<th>${esc(n)}</th>`).join("")}</tr></thead><tbody>${gs.map(x=>`<tr><td>${esc(x.g)}</td>${R.map((n,i)=>qzCell(S[n].genre[x.g],i)).join("")}</tr>`).join("")}</tbody></table></div></div>`;
  const pset=new Map();R.forEach(n=>Object.entries(S[n].proj).forEach(([id,o])=>{if(!pset.has(id))pset.set(id,{id,n:o.n,all:0,ok:0});const p=pset.get(id);p.all+=o.all;p.ok+=o.ok}));
  const mode=UI.qzProj||"asked";
  const pl=[...pset.values()].filter(p=>mode==="asked"||p.all>=2).sort((a,b)=>mode==="asked"?b.all-a.all||cmpRu(a.n,b.n):mode==="hard"?(a.ok/a.all)-(b.ok/b.all)||b.all-a.all:(b.ok/b.all)-(a.ok/a.all)||b.all-a.all).slice(0,15);
  const projT=`<div class="panel"><div class="row" style="justify-content:space-between;margin-bottom:8px"><h3 style="margin:0">По проектам</h3>${segHTML("qzProj",[["asked","Чаще спрашивали"],["hard","Самые каверзные"],["easy","Самые лёгкие"]],mode)}</div>
    <div class="tbl-wrap"><table class="t qz-t"><thead><tr><th>Проект</th>${R.map(n=>`<th>${esc(n)}</th>`).join("")}<th>Итого</th></tr></thead><tbody>${pl.map(p=>`<tr><td>${esc(p.n)}</td>${R.map((n,i)=>qzCell(S[n].proj[p.id],i)).join("")}<td class="c"><b>${pc(p.ok,p.all)}%</b> <small class="dim">${p.ok}/${p.all}</small></td></tr>`).join("")}</tbody></table></div></div>`;
  const dyn=qzDyn(S);
  const recent=L.slice(-12).reverse();
  const recT=`<div class="panel"><h3>Последние ответы</h3><div class="qz-recent">${recent.map(e=>`<span class="qr ${e.ok?"ok":"bad"}" title="${esc((QZ_KINDS.find(k=>k[0]===e.k)||[])[1]||"")}">${e.ok?"✓":"✗"} ${esc(e.w)} · ${esc(e.n)}</span>`).join("")}</div></div>`;
  return `${kpi}${dyn?`<div class="panel"><h3>Динамика точности</h3>${dyn}</div>`:""}<div class="qz-grid2">${kindT}${catT}</div>${genreT}${projT}${recT}
    <p style="margin-top:16px"><button class="btn sm ghost danger" data-qzreset>Сбросить статистику викторины</button></p>`;
}
function vQuiz(){
  const sub=UI.qzSub==="stats"?"stats":"play";
  return `<div class="ptitle"><div><h1>Викторина</h1><p>Проверьте, как хорошо вы помните просмотренное</p></div>${segHTML("qzSub",[["play","🎲 Играть"],["stats","📊 Статистика"]],sub)}</div>
  ${sub==="stats"?qzStatsHTML():`<div id="qzBox">${qzHTML()}</div>`}`;
}
/* клавиатура: 1–4 — ответ, Enter — дальше */
document.addEventListener("keydown",e=>{
  if(UI.tab!=="quiz"||UI.qzSub==="stats"||e.ctrlKey||e.metaKey||e.altKey)return;
  if(/INPUT|TEXTAREA|SELECT/.test((e.target.tagName||"")))return;
  if(document.querySelector("dialog[open]"))return;
  if(QZ.state==="q"&&!QZ.ans&&/^[1-6]$/.test(e.key)){qzAnswer(+e.key-1);e.preventDefault()}
  else if(QZ.state==="q"&&QZ.ans&&(e.key==="Enter"||e.key==="ArrowRight")){qzNext();e.preventDefault()}
});
document.addEventListener("click",e=>{
  const t=e.target.closest("[data-qzstart],[data-qzopt],[data-qznext],[data-qzt],[data-qzc],[data-qzend],[data-qzreset],[data-ui-go]");
  if(!t)return;
  e.stopPropagation();e.preventDefault();
  const d=t.dataset;
  if(d.qzstart!==undefined){qzStart();return}
  if(d.qzopt!==undefined){qzAnswer(+d.qzopt);return}
  if(d.qznext!==undefined){qzNext();return}
  if(d.qzc){const cur=qzCatsOn();if(d.qzc==="*"){QZ_CATS.forEach(c=>{if(qzAllWatched().some(i=>qzCatOf(i.type)===c[0]))cur.add(c[0])})}else if(cur.has(d.qzc)){if(cur.size>1)cur.delete(d.qzc)}else cur.add(d.qzc);UI.qzCats=[...cur];saveUI();render();return}
  if(d.qzt){const cur=new Set(Array.isArray(UI.qzTypes)?UI.qzTypes:QZ_KINDS.map(k=>k[0]));if(cur.has(d.qzt))cur.delete(d.qzt);else cur.add(d.qzt);UI.qzTypes=[...cur];saveUI();render();return}
  if(d.qzend!==undefined){if(QZ.state==="q"&&QZ.res.length)QZ.state="done";else QZ.state="idle";qzPaint();return}
  if(d.qzreset!==undefined){if(confirm("Удалить всю статистику викторины (у обоих)?")){DB.quizLog=[];save();render()}return}
  if(d.uiGo){UI.qzSub="stats";saveUI();render()}
},true);

/* ============ VIEW: comics ============ */
function catStatus(c){
  const it=c.link?.itemId&&itemById(c.link.itemId);
  if(!it)return{st:"n"};
  if(it.status==="planned")return{st:"p",it};
  if(it.status===PROP)return{st:"q",it};
  if(it.status==="watching"){const s=c.link.season!=null?(it.seasons||[]).find(s=>s.n===c.link.season):null;
    if(!s||!hasRatings(s.ratings)){if(c.link.season==null&&(hasRatings(it.ratings)||seasonsRated(it).length)){}else return{st:"c",it}}}
  if(c.link.season!=null){const s=(it.seasons||[]).find(s=>s.n===c.link.season);if(!s||!hasRatings(s.ratings))return{st:"p",it};
    const per={};DB.raters.forEach(n=>per[n]=personScore(s.ratings[n]));return{st:"w",it,score:overallOf(s.ratings),per}}
  const per={};DB.raters.forEach(n=>per[n]=itemScore(it,n));return{st:"w",it,score:itemScore(it),per};
}
function comicsSections(){
  if(UI.uni==="dc")return[{id:"DC",n:"DC",c:"#0476f2",fr:"DC",rows:DB.catalog.filter(c=>c.franchise==="DC")}];
  const mcu=DB.catalog.filter(c=>c.franchise==="MCU");
  return [...PHASES.map(p=>({id:"P"+p.id,n:p.n,c:p.c,fr:"MCU",phase:p,rows:mcu.filter(c=>p.f(c.num))})),
    {id:"CLASSIC",n:"Классика",c:"#c8a46b",fr:"CLASSIC",rows:DB.catalog.filter(c=>c.franchise==="CLASSIC")},
    {id:"XMEN",n:"Люди Икс",c:"#f6c445",fr:"XMEN",rows:DB.catalog.filter(c=>c.franchise==="XMEN")}];
}
function vComics(){
  const secs=comicsSections();
  const all=secs.flatMap(s=>s.rows);const stAll=all.map(catStatus);const w=stAll.filter(s=>s.st==="w");
  const ord=UI.cOrder==="year"?(a,b)=>(a.year||0)-(b.year||0)||a.num-b.num:(a,b)=>a.num-b.num;
  return `<div class="ptitle"><div><h1>Кинокомиксы</h1><p>Прогресс по вселенным, оценки подтягиваются из списка просмотренного</p></div>
    <div class="seg" data-ui="cOrder"><button data-v="num" class="${UI.cOrder==="num"?"on":""}">По хронологии</button><button data-v="year" class="${UI.cOrder==="year"?"on":""}">По дате выхода</button></div></div>
  <div class="uni" data-ui="uni"><button class="m ${UI.uni==="marvel"?"on":""}" data-v="marvel">MARVEL</button><button class="d ${UI.uni==="dc"?"on":""}" data-v="dc">DC</button></div>
  <div class="kpis">
    <div class="kpi"><span>Просмотрено</span><b>${w.length} <em>из ${all.length}</em></b><div class="prog" style="margin-top:8px"><i style="width:${all.length?w.length/all.length*100:0}%"></i></div></div>
    <div class="kpi"><span>Средняя оценка</span><b>${f2(avg(w.map(s=>s.score)))}</b></div>
    ${DB.raters.map(n=>`<div class="kpi"><span>${esc(n)}</span><b>${f2(avg(w.map(s=>s.per[n])))}</b></div>`).join("")}
    <div class="kpi"><span>В планах</span><b>${stAll.filter(s=>s.st==="p").length}</b></div>
  </div>
  ${secs.map((s,si)=>{const st=s.rows.map(catStatus);const ww=st.filter(x=>x.st==="w");const pct=s.rows.length?Math.round(ww.length/s.rows.length*100):0;
    return `<div class="cphase" style="--pc:${s.c};animation-delay:${si*30}ms"><div class="hd"><h3><i></i>${esc(s.n)}</h3>
      <div class="st"><span>${ww.length}/${s.rows.length}</span><div class="prog pbar"><i style="width:${pct}%;background:${s.c}"></i></div><span><b>${pct}%</b></span>
        <span>Сред ${scBadge(avg(ww.map(x=>x.score)),"sm")}</span>${DB.raters.map(n=>`<span>${esc(n)} ${scBadge(avg(ww.map(x=>x.per[n])),"sm")}</span>`).join("")}
        <button class="btn sm ghost" data-shot=".cphase" data-noshot title="Копировать картинкой"><i class="ico ico-cam"></i></button><button class="btn sm ghost" data-cadd="${s.fr}" data-phase="${s.phase?s.phase.id:""}" data-noshot>＋</button></div></div>
      ${[...s.rows].sort(ord).map(c=>{const x=catStatus(c);return `<div class="crow ${x.st==="w"?"w":""}">
        <span class="n">${c.franchise==="MCU"?c.num:c.num}</span>
        <span class="ttl" ${x.it?`data-open="${x.it.id}${c.link.season!=null&&x.st==="w"?":"+c.link.season:""}"`:`data-cedit="${c.id}"`}>${esc(c.title)}${c.link?.season!=null?` <span class="dim">· ${c.link.season} сезон</span>`:""}</span>
        <span class="yr">${c.year||""}</span>
        <span>${x.st==="w"?`<span class="stt w">✓ Просмотрено</span>`:x.st==="p"?`<span class="stt p">В планах</span>`:x.st==="q"?`<span class="stt q">🤝 На согласовании</span>`:x.st==="c"?`<span class="stt c">Смотрим</span>`:`<span class="stt n">Не отмечено</span>`}${x.it&&x.st!=="w"&&seenList(x.it).length?` <span class="stt s" title="Уже видел(а)">👁 ${esc(seenList(x.it).join(", "))}</span>`:""}</span>
        <span class="rs">${x.st==="w"?scBadge(x.score,"sm")+DB.raters.map(n=>`<span title="${esc(n)}">${scBadge(x.per[n],"sm")}</span>`).join(""):""}</span>
        <span class="acts">${x.st==="n"?`<button class="btn sm" data-cplan="${c.id}">В планы</button><button class="btn sm" data-ccprop="${c.id}" title="Сначала согласовать: смотрела ли Женя" aria-label="На согласование">🤝</button>`:""}${x.st==="q"?`<button class="btn sm" data-toplan="${x.it.id}" title="В планы">В планы</button>`:""}${x.st==="p"||x.st==="q"?`<button class="btn sm pri" data-finish="${x.it.id}" ${c.link.season!=null?`data-fseason="${c.link.season}"`:""}>✓</button>`:""}<button class="btn sm ghost" data-cedit="${c.id}" title="Изменить / связать" aria-label="Изменить / связать"><i class="ico ico-edit"></i></button></span>
      </div>`}).join("")||`<div class="crow"><span></span><span class="dim">Пусто</span></div>`}</div>`}).join("")}`;
}

/* ============ VIEW: stats ============ */
function vStats(){
  const W=DB.items.filter(i=>i.status==="watched"||(i.status==="watching"&&(hasRatings(i.ratings)||seasonsRated(i).length)));
  const sc=W.map(i=>itemScore(i)).filter(isNum);
  const mins=W.reduce((s,i)=>s+watchedMinutes(i),0);
  const seasons=W.flatMap(i=>seasonsRated(i));
  const R=DB.raters;
  // by type
  const types=DB.types.filter(t=>W.some(i=>i.type===t));
  const byType=types.map(t=>{const l=W.filter(i=>i.type===t);return{t,n:l.length,avg:avg(l.map(i=>itemScore(i))),per:Object.fromEntries(R.map(r=>[r,avg(l.map(i=>itemScore(i,r)))])),mins:l.reduce((s,i)=>s+watchedMinutes(i),0)}});
  const maxN=Math.max(1,...byType.map(x=>x.n));
  // per rater categories
  const catAvg=(r,k)=>avg(W.map(i=>itemCats(i,r)[k]));
  const rc=["var(--acc)","var(--acc2)","#3ecf8e","#ff7aa8"];
  // distribution
  const dist=BUCKETS.map(b=>({n:b.n,v:sc.filter(b.f).length})).reverse();
  const maxD=Math.max(1,...dist.map(x=>x.v));
  // genres
  const gm={};W.forEach(i=>i.genres.forEach(g=>{(gm[g]=gm[g]||[]).push(itemScore(i))}));
  const gl=Object.entries(gm).map(([g,a])=>({g,n:a.length,avg:avg(a)})).sort((a,b)=>b.n-a.n||(b.avg||0)-(a.avg||0)).slice(0,12);
  const maxG=Math.max(1,...gl.map(x=>x.n));
  // disagreements
  const dis=R.length>=2?W.map(i=>({i,a:itemScore(i,R[0]),b:itemScore(i,R[1])})).filter(x=>isNum(x.a)&&isNum(x.b)).map(x=>({...x,d:x.a-x.b})).sort((x,y)=>Math.abs(y.d)-Math.abs(x.d)).slice(0,8):[];
  const agree=R.length>=2?W.filter(i=>isNum(itemScore(i,R[0]))&&isNum(itemScore(i,R[1]))&&Math.abs(itemScore(i,R[0])-itemScore(i,R[1]))<0.05).length:0;
  const ranked=W.filter(i=>isNum(itemScore(i))).sort((a,b)=>itemScore(b)-itemScore(a));
  const lrow=(i,extra)=>`<div class="r" data-open="${i.id}"><div class="mini" style="width:26px;height:38px">${posterHTML(i,false)}</div><span class="x">${esc(i.title)}</span>${extra}</div>`;
  // trend by watch order
  const tr=W.filter(i=>isNum(itemScore(i))&&i.order).sort((a,b)=>a.order-b.order);
  const svg=trendSVG(tr);
  return `<div class="ptitle"><div><h1>Статистика</h1><p>Сериалы учитываются целиком (оценка целиком или среднее по сезонам)</p></div><button class="btn sm" data-shot="#statsKpi" data-shot-title="Лисьи оценки — сводка"><i class="ico ico-cam"></i> Сводка</button></div>
  <div class="kpis" id="statsKpi">
    <div class="kpi"><span>Просмотрено</span><b>${W.length}</b><em>${seasons.length} сезонов оценено</em></div>
    <div class="kpi"><span>Средняя оценка</span><b>${f2(avg(sc))}</b><em>медиана ${f2(median(sc))}</em></div>
    ${R.map(r=>`<div class="kpi"><span>${esc(r)} в среднем</span><b>${f2(avg(W.map(i=>itemScore(i,r))))}</b><em>${W.filter(i=>itemScore(i,r)>=5).length} пятёрок</em></div>`).join("")}
    <div class="kpi"><span>Время просмотра</span><b>${hoursStr(mins)}</b><em>≈ ${Math.round(mins/60/24*10)/10} сут.</em></div>
    <div class="kpi"><span>Смотрим сейчас</span><b>${DB.items.filter(i=>i.status==="watching").length}</b><em>${DB.items.filter(i=>i.status==="watching").map(i=>i.title).slice(0,2).map(esc).join(", ")||"—"}</em></div>
    <div class="kpi"><span>В планах</span><b>${DB.items.filter(i=>i.status==="planned").length}</b><em>≈ ${hoursStr(DB.items.filter(i=>i.status==="planned").reduce((s,i)=>s+(totalMinutes(i)||0),0))}</em></div>
  </div>
  <div class="sgrid">
    <div class="sbox"><button class="btn sm ghost shotbtn" data-shot=".sbox" data-noshot title="Копировать картинкой"><i class="ico ico-cam"></i></button><h3>По типу контента</h3>
      <div style="overflow-x:auto"><table class="t" style="font-size:13.5px"><thead><tr><th>Тип</th><th class="c">Кол-во</th><th class="c">Средняя</th>${R.map(r=>`<th class="c">${esc(r)}</th>`).join("")}<th class="c">Время</th></tr></thead><tbody>
      ${byType.map(x=>`<tr style="cursor:default"><td><b>${esc(x.t)}</b><div class="prog" style="margin-top:5px;width:${Math.max(8,x.n/maxN*100)}%"><i style="width:100%"></i></div></td><td class="c">${x.n}</td><td class="c">${scBadge(x.avg,"sm")}</td>${R.map(r=>`<td class="c cv">${f2(x.per[r])}</td>`).join("")}<td class="c dim">${x.mins?hoursStr(x.mins):"—"}</td></tr>`).join("")}
      </tbody></table></div></div>
    <div class="sbox"><button class="btn sm ghost shotbtn" data-shot=".sbox" data-noshot title="Копировать картинкой"><i class="ico ico-cam"></i></button><h3>Категории <span class="lg">${R.map((r,i)=>`<span><i style="background:${rc[i%4]}"></i>${esc(r)}</span>`).join("")}</span></h3>
      ${CATS.map(c=>`<div style="margin:10px 0 12px"><div style="font-size:13px;font-weight:700;margin-bottom:4px">${c.ic} ${c.n}</div>${R.map((r,i)=>{const v=catAvg(r,c.k);return `<div class="hb" style="margin:3px 0"><span class="dim" style="font-size:12px">${esc(r)}</span><div class="tr"><i style="width:${(v||0)/5*100}%;background:${rc[i%4]}"></i></div><b>${f2(v)}</b></div>`}).join("")}</div>`).join("")}
    </div>
    <div class="sbox"><button class="btn sm ghost shotbtn" data-shot=".sbox" data-noshot title="Копировать картинкой"><i class="ico ico-cam"></i></button><h3>Распределение итоговых оценок</h3>
      ${dist.map(x=>`<div class="hb"><span>${x.n}</span><div class="tr"><i style="width:${x.v/maxD*100}%;background:${scoreColor(x.n==="5"?5:x.n==="0–2"?1.2:parseFloat(x.n)+.5)}"></i></div><b>${x.v}</b></div>`).join("")}
      <div class="dsec"><h4>Оценки в порядке просмотра</h4>${svg}</div>
    </div>
    <div class="sbox"><button class="btn sm ghost shotbtn" data-shot=".sbox" data-noshot title="Копировать картинкой"><i class="ico ico-cam"></i></button><h3>Жанры</h3>${gl.length?gl.map(x=>`<div class="hb"><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(x.g)}</span><div class="tr"><i style="width:${x.n/maxG*100}%;background:linear-gradient(90deg,var(--acc2),var(--acc))"></i></div><b>${x.n}</b></div>`).join(""):`<p class="dim">Жанры пока не указаны у просмотренного. Их можно добавить в карточке.</p>`}</div>
    <div class="sbox"><button class="btn sm ghost shotbtn" data-shot=".sbox" data-noshot title="Копировать картинкой"><i class="ico ico-cam"></i></button><h3>Лучшее</h3><div class="lst">${ranked.slice(0,8).map(i=>lrow(i,scBadge(itemScore(i),"sm"))).join("")}</div></div>
    <div class="sbox"><button class="btn sm ghost shotbtn" data-shot=".sbox" data-noshot title="Копировать картинкой"><i class="ico ico-cam"></i></button><h3>Худшее</h3><div class="lst">${ranked.slice(-8).reverse().map(i=>lrow(i,scBadge(itemScore(i),"sm"))).join("")}</div></div>
    ${R.length>=2?`<div class="sbox"><button class="btn sm ghost shotbtn" data-shot=".sbox" data-noshot title="Копировать картинкой"><i class="ico ico-cam"></i></button><h3>Самые большие расхождения <span class="dim" style="font-size:12px;font-family:var(--font)">полное совпадение: ${agree}</span></h3><div class="lst">${dis.map(x=>lrow(x.i,`<span class="dim" style="font-size:12px">${esc(R[0])}</span>${scBadge(x.a,"sm")}<span class="dim" style="font-size:12px">${esc(R[1])}</span>${scBadge(x.b,"sm")}`)).join("")||`<p class="dim">Нет данных</p>`}</div></div>`:""}
    <div class="sbox"><button class="btn sm ghost shotbtn" data-shot=".sbox" data-noshot title="Копировать картинкой"><i class="ico ico-cam"></i></button><h3>Кто строже</h3>${R.map((r,i)=>{const others=R.filter(x=>x!==r);const higher=W.filter(it=>{const a=itemScore(it,r);return isNum(a)&&others.every(o=>{const b=itemScore(it,o);return isNum(b)&&a>b+0.04})}).length;return `<div class="hb"><span>${esc(r)}</span><div class="tr"><i style="width:${W.length?higher/W.length*100:0}%;background:${rc[i%4]}"></i></div><b>${higher}</b></div>`}).join("")}<p class="dim" style="font-size:12.5px;margin:10px 0 0">Сколько раз оценка была выше, чем у остальных</p></div>
    ${timeBox(W)}
    ${logBox()}
  </div>`;
}
/* --- statistics over time: count per period + average score per period (two charts, one axis each) --- */
function itemDate(it){
  if(it.watchedAt){const d=new Date(it.watchedAt);if(!isNaN(d))return d}
  let t=null;for(const e of DB.log||[])if(e.id===it.id&&(!t||e.t<t))t=e.t;
  return t?new Date(t):null;
}
function timeSeries(W,per){
  const pts=W.map(it=>({it,d:itemDate(it)})).filter(x=>x.d);
  if(!pts.length)return {pts,rows:[]};
  const key=d=>per==="year"?String(d.getFullYear()):d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");
  const lo=new Date(Math.min(...pts.map(x=>+x.d))),hi=new Date(Math.max(...pts.map(x=>+x.d)));
  const rows=[];
  if(per==="year"){for(let y=lo.getFullYear();y<=hi.getFullYear();y++)rows.push({k:String(y),l:String(y),full:String(y)})}
  else{let d=new Date(hi.getFullYear(),hi.getMonth()-23,1);if(d<lo)d=new Date(lo.getFullYear(),lo.getMonth(),1);
    for(;d<=hi;d=new Date(d.getFullYear(),d.getMonth()+1,1)){const m=d.getMonth();rows.push({k:key(d),l:MONTHS[m].slice(0,3).toLowerCase()+(m===0||!rows.length?" "+String(d.getFullYear()).slice(2):""),full:MONTHS[m]+" "+d.getFullYear()})}}
  const by=new Map(rows.map(r=>[r.k,Object.assign(r,{items:[]})]));
  pts.forEach(x=>{const r=by.get(key(x.d));if(r)r.items.push(x.it)});
  rows.forEach(r=>{r.n=r.items.length;r.avg=avg(r.items.map(i=>itemScore(i)))});
  return {pts,rows};
}
function timeChartSVG(rows,kind,cw){
  const W=Math.max(280,Math.round(cw||640)),H=kind==="n"?150:130,pl=30,pr=8,pt=10,pb=24,iw=W-pl-pr,ih=H-pt-pb,n=rows.length,step=iw/n;
  const maxN=Math.max(1,...rows.map(r=>r.n)),niceMax=maxN<=4?maxN:Math.ceil(maxN/4)*4;
  const yv=v=>kind==="n"?pt+ih-(v/niceMax)*ih:pt+ih-(v/5)*ih;
  const ticks=kind==="n"?[0,niceMax/2,niceMax].filter((v,i,a)=>a.indexOf(v)===i):[0,1,2,3,4,5];
  const every=Math.max(1,Math.ceil(n/Math.max(2,Math.floor(iw/58))));
  let g=ticks.map(v=>`<line x1="${pl}" x2="${W-pr}" y1="${yv(v)}" y2="${yv(v)}" class="tc-grid"/><text x="${pl-6}" y="${yv(v)+3.5}" class="tc-ax" text-anchor="end">${Number.isInteger(v)?v:v.toFixed(1)}</text>`).join("");
  g+=rows.map((r,i)=>i%every===0?`<text x="${pl+step*i+step/2}" y="${H-6}" class="tc-ax" text-anchor="middle">${esc(r.l)}</text>`:"").join("");
  if(kind==="n"){
    const bw=Math.max(3,Math.min(28,step-4));
    g+=rows.map((r,i)=>{const x=pl+step*i+(step-bw)/2,y=yv(r.n),h=pt+ih-y;
      return `<g class="tc-hit"><rect x="${pl+step*i}" y="${pt}" width="${step}" height="${ih}" fill="transparent"/>${r.n?`<path class="tc-bar" d="M${x},${pt+ih}V${y+Math.min(4,h)}a4,4 0 0 1 4,-4h${bw-8}a4,4 0 0 1 4,4V${pt+ih}Z"/>`:""}<title>${esc(r.full)}: ${r.n} ${plural(r.n,"запись","записи","записей")}</title></g>`}).join("");
  }else{
    const P=rows.map((r,i)=>isNum(r.avg)?[pl+step*i+step/2,yv(r.avg),r]:null);
    let d="",pen=false;P.forEach(p=>{if(!p){pen=false;return}d+=(pen?"L":"M")+p[0].toFixed(1)+","+p[1].toFixed(1);pen=true});
    g+=`<path class="tc-line" d="${d}"/>`;
    g+=P.map((p,i)=>`<g class="tc-hit"><rect x="${pl+step*i}" y="${pt}" width="${step}" height="${ih}" fill="transparent"/>${p?`<circle class="tc-dot" cx="${p[0]}" cy="${p[1]}" r="4.5"/>`:""}<title>${esc(rows[i].full)}: ${p?"средняя "+f2(p[2].avg):"нет оценок"}</title></g>`).join("");
  }
  return `<svg class="tchart" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${kind==="n"?"Количество просмотров по периодам":"Средняя оценка по периодам"}">${g}</svg>`;
}
let TC_ROWS=[];
function timeDraw(root){$$("[data-tc]",root||document).forEach(el=>{el.innerHTML=timeChartSVG(TC_ROWS,el.dataset.tc,el.clientWidth)})}
window.addEventListener("resize",()=>{clearTimeout(timeDraw.t);timeDraw.t=setTimeout(()=>timeDraw(),150)});
function timeBox(W){
  const per=UI.stPer==="year"?"year":"month",{pts,rows}=timeSeries(W,per);TC_ROWS=rows;
  const sh=`<button class="btn sm ghost shotbtn" data-shot=".sbox" data-noshot title="Копировать картинкой"><i class="ico ico-cam"></i></button>`;
  const head=`<h3>Динамика по времени ${segHTML("stPer",[["month","Месяцы"],["year","Годы"]],per)}</h3>`;
  if(!rows.length)return `<div class="sbox wide">${sh}${head}<p class="dim" style="margin:0">Дат пока нет. График строится по полю «Дата просмотра» в карточке и по времени новых оценок.</p></div>`;
  const busiest=rows.reduce((a,b)=>b.n>a.n?b:a),best=rows.filter(r=>r.n>=2&&isNum(r.avg)).reduce((a,b)=>!a||b.avg>a.avg?b:a,null);
  return `<div class="sbox wide">${sh}${head}
    <div class="tstats"><span>С датой: <b>${pts.length}</b> из ${W.length}</span><span>Самый насыщенный период: <b>${esc(busiest.full)}</b> (${busiest.n})</span>${best?`<span>Лучший по оценкам: <b>${esc(best.full)}</b> ${scBadge(best.avg,"sm")}</span>`:""}</div>
    <div class="dsec"><h4>Сколько посмотрели</h4><div class="tc-w" data-tc="n"></div></div>
    <div class="dsec"><h4>Средняя оценка, шкала 0–5</h4><div class="tc-w" data-tc="avg"></div></div>
    <details class="tdet"><summary>Показать таблицей</summary><table class="t" style="font-size:13px"><thead><tr><th>Период</th><th class="c">Записей</th><th class="c">Средняя</th></tr></thead><tbody>${rows.filter(r=>r.n).map(r=>`<tr style="cursor:default"><td>${esc(r.full)}</td><td class="c">${r.n}</td><td class="c">${scBadge(r.avg,"sm")}</td></tr>`).join("")}</tbody></table></details>
  </div>`;
}
function logBox(){
  const L=DB.log||[];const sh=`<button class="btn sm ghost shotbtn" data-shot=".sbox" data-noshot title="Копировать картинкой"><i class="ico ico-cam"></i></button>`;
  if(!L.length)return `<div class="sbox">${sh}<h3>Хронология оценок</h3><p class="dim" style="margin:0">Время теперь фиксируется у каждой новой оценки. Как только появятся новые оценки, здесь будет видно, по каким месяцам, дням недели и часам вы оцениваете.</p></div>`;
  const now=new Date(),months=[];for(let k=11;k>=0;k--){const d=new Date(now.getFullYear(),now.getMonth()-k,1);months.push({y:d.getFullYear(),m:d.getMonth(),n:0,l:d.toLocaleDateString("ru-RU",{month:"short"}).replace(".","").slice(0,3)})}
  const wd=[0,0,0,0,0,0,0],hr=Array(24).fill(0);
  L.forEach(e=>{const d=new Date(e.t);const mm=months.find(x=>x.y===d.getFullYear()&&x.m===d.getMonth());if(mm)mm.n++;wd[(d.getDay()+6)%7]++;hr[d.getHours()]++});
  const mx=Math.max(1,...months.map(x=>x.n)),mw=Math.max(1,...wd),mh=Math.max(1,...hr);
  const wn=["Пн","Вт","Ср","Чт","Пт","Сб","Вс"];
  const last=[...L].reverse().slice(0,6).map(e=>{const it=itemById(e.id);if(!it)return"";return `<div class="r" data-open="${it.id}${e.s!=null?":"+e.s:""}"><span class="dim" style="font-size:12px;min-width:92px">${fmtAt(e.t).replace(/ \d{4} г\.,?/," ")}</span><span class="x">${esc(e.s!=null?segTitle(it,e.s):it.title)}</span><span class="dim" style="font-size:12px">${esc(e.r)}</span>${scBadge(e.v,"sm")}</div>`}).join("");
  return `<div class="sbox">${sh}<h3>Хронология оценок <span class="dim" style="font-size:12px;font-family:var(--font)">${L.length} ${plural(L.length,"оценка","оценки","оценок")}</span></h3>
    <div class="bars" style="height:70px;gap:4px">${months.map(x=>`<div style="flex:1 1 0;height:${x.n?Math.max(6,x.n/mx*100):3}%;background:${x.n?"linear-gradient(var(--acc),var(--acc2))":"var(--line)"}" title="${x.l} ${x.y}: ${x.n}"><span>${x.l}</span></div>`).join("")}</div><div style="height:20px"></div>
    <div class="dsec"><h4>Дни недели</h4>${wn.map((n,i)=>`<div class="hb" style="grid-template-columns:30px 1fr 30px;margin:3px 0"><span class="dim">${n}</span><div class="tr"><i style="width:${wd[i]/mw*100}%;background:var(--acc2)"></i></div><b>${wd[i]}</b></div>`).join("")}</div>
    <div class="dsec"><h4>Время суток</h4><div class="bars" style="height:46px;gap:2px">${hr.map((v,h)=>`<div style="flex:1 1 0;height:${v?Math.max(8,v/mh*100):3}%;background:${v?"var(--acc)":"var(--line)"}" title="${h}:00 — ${v}"><span>${h%6===0?h:""}</span></div>`).join("")}</div><div style="height:18px"></div></div>
    <div class="dsec"><h4>Последние</h4><div class="lst">${last}</div></div></div>`;
}
function median(a){if(!a.length)return null;const s=[...a].sort((x,y)=>x-y);const m=s.length>>1;return s.length%2?s[m]:(s[m-1]+s[m])/2}
function trendSVG(tr){
  if(tr.length<2)return`<p class="dim">Недостаточно данных</p>`;
  const W=600,H=150,p=22;const xs=i=>p+i*(W-2*p)/(tr.length-1);const ys=v=>H-p-(v-1)/4*(H-2*p);
  const pts=tr.map((it,i)=>[xs(i),ys(itemScore(it))]);
  // moving average
  const k=5;const ma=tr.map((_,i)=>{const s=tr.slice(Math.max(0,i-k+1),i+1).map(x=>itemScore(x));return[xs(i),ys(avg(s))]});
  const grid=[1,2,3,4,5].map(v=>`<line x1="${p}" x2="${W-p}" y1="${ys(v)}" y2="${ys(v)}" stroke="var(--line)" stroke-dasharray="3 4"/><text x="4" y="${ys(v)+4}" font-size="10" fill="var(--tx3)">${v}</text>`).join("");
  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto">${grid}
   <polyline fill="none" stroke="var(--acc2)" stroke-width="2.5" stroke-linejoin="round" points="${ma.map(q=>q.join(",")).join(" ")}"/>
   ${pts.map((q,i)=>`<circle cx="${q[0]}" cy="${q[1]}" r="3.2" fill="${scoreColor(itemScore(tr[i]))}"><title>${esc(tr[i].title)}: ${f1(itemScore(tr[i]))}</title></circle>`).join("")}</svg>
   <div class="lg"><span><i style="background:var(--acc2)"></i>скользящее среднее (5)</span></div>`;
}

/* ============ VIEW: guide ============ */
function vGuide(){
  return `<div class="ptitle"><div><h1>Как оценивать</h1><p>Пояснения к пяти категориям оценки</p></div></div>
  <div class="gintro">
    <div class="panel"><h3 style="font-size:15px;margin-bottom:6px">Шкала 0–5</h3><p class="muted" style="margin:0">Каждый из оценщиков ставит оценку по пяти категориям. Допустимы дробные значения (например 4.5).</p></div>
    <div class="panel"><h3 style="font-size:15px;margin-bottom:6px">Как считается итог</h3><p class="muted" style="margin:0">Личная оценка = среднее по категориям. Итоговая = среднее личных оценок всех оценщиков.</p></div>
    <div class="panel"><h3 style="font-size:15px;margin-bottom:6px">Прочерк «—»</h3><p class="muted" style="margin:0">Если категория неприменима (например, «Актёры» в мультфильме), ставьте «-». Она не участвует в среднем.</p></div>
    <div class="panel"><h3 style="font-size:15px;margin-bottom:6px">Сериалы</h3><p class="muted" style="margin:0">Можно оценивать каждый сезон отдельно и/или сериал целиком. Если оценки «целиком» нет, итог считается как среднее по сезонам.</p></div>
  </div>
  ${guideToolbar()}
  <div class="gnav">${CATS.map(c=>`<a class="chip" href="#guide" data-jump="g-${c.k}">${c.ic} ${c.n}</a>`).join("")}</div>
  ${GUIDE.map(g=>{const c=CATS.find(c=>c.k===g.key)||CATS[0];return `<section class="gcat" id="g-${c.k}" style="--gc:${c.c}"><h2><i>${c.ic}</i>${esc(g.title)}</h2>${guideHTML(g,c)}</section>`}).join("")}`;
}

/* ============ Гайд: модель, подсказки на экране оценок, страница гайда ============
   GUIDE (guide.json) → GM: {dir:{title,lead:[…],subs:[{id:"1.1",t,desc,ex:[…],lines,kids:[{id,t,lines}]}]}}
   Используется в экране оценок (чипы подпунктов, якоря шкалы, «ваши оценки», закрепление «?»)
   и на странице «Как оценивать» (сворачиваемые подпункты, поиск, примеры из вашей базы). */
const GM={};
(function(){
  GUIDE.forEach((g,gi)=>{
    const m={title:g.title,lead:[],subs:[]};let cur=null,kid=null;
    for(const ln of g.lines){
      const h=ln.match(/^(\d+(?:\.\d+)+)\s+(.+)$/);
      if(h&&+h[1].split(".")[0]===gi+1){
        const depth=h[1].split(".").length;
        if(depth===2){cur={id:h[1],t:h[2],lines:[],kids:[]};m.subs.push(cur);kid=null;continue}
        if(cur){kid={id:h[1],t:h[2],lines:[]};cur.kids.push(kid);continue}
      }
      if(kid)kid.lines.push(ln);else if(cur)cur.lines.push(ln);else m.lead.push(ln);
    }
    m.subs.forEach(s=>{
      const plain=s.lines.filter(l=>!l.startsWith("•")&&!/:$/.test(l));
      s.desc=plain[0]||s.kids.map(k=>k.t).join(" · ");
      const grp=[];let lab="";s.lines.forEach(l=>{if(l.startsWith("•"))grp.push([lab,l.replace(/^•\s*/,"")]);else lab=l});
      const pick=grp.filter(x=>/^(Например|Сюда входит|Хорош|Сильн)/i.test(x[0]));
      const first=grp.length?grp.filter(x=>x[0]===grp[0][0]):[];
      s.ex=(pick.length?pick:first).map(x=>x[1]).slice(0,5);
      if(!s.ex.length)s.ex=s.kids.map(k=>k.t);
    });
    GM[g.key]=m;
  });
})();
/* ориентиры шкалы: что значит 1, 3 и 5 именно в этой категории */
const GANCH={
  dir:["сцены и темп разваливаются, настроение не держится","крепко и ровно, но без запоминающихся решений","хочется пересмотреть ради самой постановки"],
  script:["дыры в логике, пустые диалоги, непонятно зачем всё","история понятна и работает, но предсказуема","удивила, осталась в голове, всё на своём месте"],
  actors:["не верится ни одному герою","играют нормально, но без отдачи","забываешь, что это актёры; герои как живые"],
  visual:["выглядит дёшево или нечитаемо","аккуратно, но без своего почерка","хочется делать скриншоты; стиль узнаётся с кадра"],
  sound:["мешает или вовсе не замечается","работает фоном, но не запоминается","звук и музыка усиливают каждую сцену; хочется в плейлист"]
};
/* оценки категории по всей базе: [{it,v,who}] (целиком + сезоны), кроме проекта exceptId */
function guideVals(cat,rater,exceptId){
  const out=[];
  DB.items.forEach(it=>{
    if(it.id===exceptId)return;
    const srcs=[it.ratings,...(it.seasons||[]).map(s=>s.ratings)];
    let vs=[];srcs.forEach(r=>{DB.raters.forEach(n=>{if(rater&&n!==rater)return;const v=r&&r[n]&&r[n][cat];if(isNum(v))vs.push(v)})});
    if(vs.length)out.push({it,v:avg(vs)});
  });
  return out;
}
function guideRefHTML(cat,rater,exceptId){
  const rows=(rater?[rater]:DB.raters).map(n=>{
    const a=guideVals(cat,n,exceptId);if(a.length<2)return"";
    const s=a.slice().sort((x,y)=>y.v-x.v||cmpRu(x.it.title,y.it.title));
    const mean=avg(a.map(x=>x.v)),best=s[0],low=s[s.length-1];
    return `<div><b>${esc(n)}</b> · в среднем ${f1(mean)} <span class="dim">(${a.length})</span>${best.v!==low.v?` · выше всего <button type="button" class="gh-it" data-open="${best.it.id}">${esc(best.it.title)} ${f1(best.v)}</button> · ниже всего <button type="button" class="gh-it" data-open="${low.it.id}">${esc(low.it.title)} ${f1(low.v)}</button>`:""}</div>`;
  }).filter(Boolean);
  return rows.length?`<div class="gh-ref"><span class="gh-k">Ваши оценки</span>${rows.join("")}</div>`:"";
}
/* подсказка на экране оценок */
function guideHint(k,o={}){
  const m=GM[k];if(!m)return"";const c=CATS.find(x=>x.k===k)||CATS[0];
  const sub=o.sub&&m.subs.find(s=>s.id===o.sub);
  const an=GANCH[k]||[];
  return `<div class="gh" style="--gc:${c.c}">
    <div class="gh-top"><b>${c.ic} ${esc(m.title)}</b><span class="gh-lead">${esc(m.lead[0]||"")}</span>
      <span class="gh-act"><button type="button" class="gh-btn${o.pinned?" on":""}" data-gh="pin" title="${o.pinned?"Открепить подсказку":"Закрепить подсказку"}">${o.pinned?"Закреплено":"Закрепить"}</button><button type="button" class="gh-btn" data-gh="guide" data-gk="${k}" data-gs="${sub?sub.id:""}">В гайде →</button></span></div>
    <div class="gh-chips">${m.subs.map(s=>`<button type="button" class="gh-chip${sub&&sub.id===s.id?" on":""}" data-gsub="${s.id}">${esc(s.t)}</button>`).join("")}</div>
    ${sub?`<div class="gh-sub"><b>${esc(sub.t)}.</b> ${esc(sub.desc)}${sub.ex.length?` <span class="dim">Признаки: ${sub.ex.map(esc).join(" · ")}.</span>`:""}</div>`:`<div class="gh-sub dim">Нажмите на подпункт, чтобы увидеть, что он значит.</div>`}
    <div class="gh-scale">${[["1",0],["3",1],["5",2]].map(([n,i])=>`<div><span class="gh-n">${n}</span>${esc(an[i]||"")}</div>`).join("")}</div>
    ${guideRefHTML(k,o.rater,o.exceptId)}
  </div>`;
}
/* ---------- страница гайда ---------- */
function guideBlocks(t){
  let h="",ul=[];const flush=()=>{if(ul.length){h+=`<ul>${ul.map(x=>`<li>${esc(x)}</li>`).join("")}</ul>`;ul=[]}};
  for(const ln of t){if(ln.startsWith("•")){ul.push(ln.replace(/^•\s*/,""));continue}flush();if(/:$/.test(ln))h+=`<div class="lab">${esc(ln)}</div>`;else h+=`<p>${esc(ln)}</p>`}
  flush();return h;
}
function guideExamples(cat){
  const a=guideVals(cat,null,null);if(a.length<3)return"";
  const s=a.slice().sort((x,y)=>y.v-x.v||cmpRu(x.it.title,y.it.title));
  const chip=x=>`<button type="button" class="gh-it" data-open="${x.it.id}">${esc(x.it.title)} <b>${f1(x.v)}</b></button>`;
  const top=s.slice(0,3),low=s.slice(-3).reverse().filter(x=>!top.includes(x));
  return `<div class="gex"><span class="gh-k">Примеры у вас</span><div><span class="dim">выше всего:</span> ${top.map(chip).join("")}</div>${low.length?`<div><span class="dim">ниже всего:</span> ${low.map(chip).join("")}</div>`:""}</div>`;
}
function guideHTML(g,c){
  const m=GM[g.key];
  let h=`<p class="lead">${esc(m.lead[0]||"")}</p>${guideBlocks(m.lead.slice(1))}`;
  h+=guideExamples(g.key);
  h+=`<div class="gsub">${m.subs.map(s=>`<details class="gd" id="g-${g.key}-${s.id.replace(/\./g,"_")}" data-k="${g.key}"${UI.gOpenAll?" open":""}>
    <summary><span class="gn">${s.id}</span><span class="gt"><b>${esc(s.t)}</b><em>${esc(s.desc)}</em></span></summary>
    <div class="gbody">${guideBlocks(s.lines.filter(l=>l!==s.desc))}${s.kids.map(k=>`<h5>${esc(k.t)}</h5>${guideBlocks(k.lines)}`).join("")}
      <div class="ganch">${[["1",0],["3",1],["5",2]].map(([n,i])=>`<span><i>${n}</i>${esc(GANCH[g.key][i])}</span>`).join("")}</div></div></details>`).join("")}</div>`;
  return h;
}
function guideRateTarget(){
  const rated=it=>hasRatings(it.ratings)||(it.seasons||[]).some(s=>hasRatings(s.ratings));
  const w=DB.items.filter(i=>i.status==="watching"&&!rated(i)),d=DB.items.filter(i=>i.status==="watched"&&!rated(i));
  return w[0]||d[d.length-1]||null;
}
function guideToolbar(){
  const t=guideRateTarget();
  return `<div class="gtool"><div class="gsearch"><i class="ico ico-search"></i><input id="gSearch" type="search" placeholder="Найти: темп, озвучка, химия…" autocomplete="off" spellcheck="false"></div>
    <button type="button" class="btn sm" id="gAll" data-open-all="1">Развернуть всё</button><button type="button" class="btn sm" id="gNone">Свернуть всё</button>
    ${t?`<button type="button" class="btn sm pri" id="gRate" data-gr="${t.id}" title="Открыть оценку и подсказки рядом">Оценить: ${esc(t.title.length>26?t.title.slice(0,25)+"…":t.title)}</button>`:""}</div><div class="gnone empty" id="gEmpty" hidden>Ничего не нашлось. Попробуйте другое слово.</div>`;
}
function guideBind(v){
  const all=()=>$$(".gd",v),sec=()=>$$(".gcat",v);
  const setOpen=o=>all().forEach(d=>{if(!d.hidden)d.open=o});
  $("#gAll",v)?.addEventListener("click",()=>setOpen(true));
  $("#gNone",v)?.addEventListener("click",()=>setOpen(false));
  $("#gRate",v)?.addEventListener("click",e=>openRate(e.currentTarget.dataset.gr));
  const q=$("#gSearch",v);
  q?.addEventListener("input",()=>{
    const s=q.value.trim().toLowerCase();
    all().forEach(d=>{const hit=!s||d.textContent.toLowerCase().includes(s);d.hidden=!hit;if(s)d.open=hit});
    let any=0;sec().forEach(c=>{const n=$$(".gd:not([hidden])",c).length;c.hidden=!!s&&!n;if(n||!s)any++});
    $("#gEmpty",v).hidden=!s||any>0;
  });
  const f=UI.guideFocus;
  if(f){UI.guideFocus=null;const [k,sid]=f.split(":");
    const el=sid?document.getElementById(`g-${k}-${sid.replace(/\./g,"_")}`):document.getElementById("g-"+k);
    if(el){if(el.tagName==="DETAILS")el.open=true;setTimeout(()=>{el.scrollIntoView({behavior:"smooth",block:"center"});el.classList.add("flash");setTimeout(()=>el.classList.remove("flash"),1800)},120)}}
}
/* ============ VIEW: data ============ */
function vData(){
  const n=DB.items.length,ph=DB.items.filter(i=>i.poster).length;
  const size=new Blob([JSON.stringify(DB)]).size;
  return `<div class="ptitle"><div><h1>Данные</h1><p>${CLOUD&&CLOUD.room?"Данные хранятся в браузере и синхронизируются через облако.":"«Лисьи оценки» хранят всё локально в этом браузере (IndexedDB). Подключите облако, чтобы оценивать вдвоём."} Резервные копии — через экспорт.</p></div></div>
  <div class="kpis"><div class="kpi"><span>Записей</span><b>${n}</b></div><div class="kpi"><span>С фото</span><b>${ph}</b></div><div class="kpi"><span>Каталог комиксов</span><b>${DB.catalog.length}</b></div><div class="kpi"><span>Размер данных</span><b>${(size/1024/1024).toFixed(size>1048576?1:2)} МБ</b></div></div>
  <div class="dgrid">
    ${cloudPanel()}
    ${errPanel()}
    ${pwaPanel()}
    ${tabsPanel()}
    ${lookPanel()}
    ${backupPanel()}
    <div class="panel"><h3>Экспорт JSON</h3><p>Скачать все данные: записи, оценки, сезоны, планы и каталог кинокомиксов.</p>
      <div class="row"><button class="btn pri" id="expFull">⬇ Экспорт с фото</button><button class="btn" id="expLite">⬇ Без фото</button></div></div>
    <div class="panel"><h3>Импорт JSON</h3><p>Загрузить ранее выгруженный файл. «Заменить» — полностью заменяет данные; «Объединить» — добавляет новые записи и обновляет совпадающие (по id или названию).</p>
      <div class="row"><button class="btn" id="impReplace">⬆ Заменить</button><button class="btn" id="impMerge">⬆ Объединить</button></div></div>
    <div class="panel"><h3>Оценщики</h3><p>Переименование сохраняет все оценки.</p>
      <div class="ed-list" id="ratersEd">${DB.raters.map((r,i)=>`<div class="row"><input class="inp" value="${esc(r)}" data-ri="${i}"></div>`).join("")}</div>
      <div class="row"><button class="btn sm" id="saveRaters">Сохранить</button><button class="btn sm ghost" id="addRater">＋ Оценщик</button></div></div>
    <div class="panel"><h3>Типы контента</h3><p>Список типов для фильтров и формы. Через запятую.</p>
      <textarea class="inp" id="typesEd" rows="3" style="width:100%">${esc(DB.types.join(", "))}</textarea>
      <div class="row" style="margin-top:8px"><button class="btn sm" id="saveTypes">Сохранить</button></div></div>
    <div class="panel"><h3>Теги</h3><p>Нажмите на тег, чтобы переименовать или удалить его во всех записях.</p>
      <div class="chips">${allTags().map(([t,n])=>`<button class="chip" data-tagren="${esc(t)}">#${esc(t)} <small>${n}</small></button>`).join("")||`<span class="dim">Тегов пока нет</span>`}</div></div>
    <div class="panel"><h3>🔎 Автозаполнение из TMDB</h3><p>С ключом TMDB при добавлении достаточно начать вводить название: появятся варианты, а постер, год, жанры, описание, длительность, сезоны и серии заполнятся сами. С ключом OMDb (панель «Мировые оценки») подтянутся ещё IMDb, Rotten Tomatoes и Metacritic, для аниме — MyAnimeList.</p>
      <div class="row"><input class="inp" id="tmdbKey" placeholder="Ключ TMDB (API Key)" value="${esc(apiKey("tmdb"))}" style="flex:1;min-width:160px" autocomplete="off"><button class="btn pri" id="tmdbKeySave">${apiKey("tmdb")?"Проверить":"Сохранить"}</button></div>
      <details class="cdet" style="margin-top:10px"><summary>Как получить ключ (бесплатно, ≈3 минуты)</summary><ol>
        <li>Зарегистрируйтесь на <a href="https://www.themoviedb.org/signup" target="_blank" rel="noopener">themoviedb.org</a> и подтвердите почту.</li>
        <li>Откройте <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noopener">Настройки → API</a> → <b>Create</b> → <b>Developer</b>, примите условия.</li>
        <li>В анкете: тип — <b>Personal</b>, название и описание — любые, адрес сайта — ссылка на вашу страницу на GitHub.</li>
        <li>Скопируйте <b>API Key</b> (короткий) или <b>API Read Access Token</b> (длинный) — подходят оба.</li></ol>
        <p class="dim" style="font-size:12.5px;margin:0">${CLOUD&&CLOUD.room?"Ключи хранятся в общих данных — второму человеку вводить их не нужно.":"Если подключено облако, ключи попадут и второму человеку — ему не придётся вводить их самому."}</p></details>
      <p class="dim" style="font-size:13px;margin:10px 0 6px">Для 70 встроенных записей данные TMDB уже внутри файла.</p>
      <button class="btn sm" id="tmdbAgain">↻ Дополнить пустые поля встроенными</button></div>
    <div class="panel"><h3>🌍 Мировые оценки</h3><p>IMDb, Rotten Tomatoes, Metacritic и MyAnimeList. Встроенные данные — на 2026 год (у ${DB.items.filter(i=>worldParts(i).length).length} из ${DB.items.length} записей). Свежие цифры можно подтянуть онлайн: нужен бесплатный ключ <a href="https://www.omdbapi.com/apikey.aspx" target="_blank" rel="noopener">OMDb</a> (приходит на почту за минуту).</p>
      <div class="row" style="margin-bottom:8px"><input class="inp" id="omdbKey" placeholder="Ключ OMDb" value="${esc(apiKey("omdb"))}" style="flex:1;min-width:140px"><button class="btn pri" id="omdbGo">↻ IMDb · RT · MC</button></div>
      <div class="row"><button class="btn" id="malGo" title="Без ключа, через Jikan API">↻ MyAnimeList для аниме</button><button class="btn ghost" id="worldAgain">Вернуть встроенные в пустые поля</button></div></div>
    <div class="panel"><h3>🕓 Время оценок</h3><p>С этой версии каждая новая или изменённая оценка запоминает дату и время, а ещё попадает в журнал — из него строится «Хронология оценок» в статистике.</p>
      <p class="dim" style="margin:0">В журнале: <b style="color:var(--tx)">${DB.log.length}</b> ${plural(DB.log.length,"событие","события","событий")}${DB.log.length?` · последнее ${fmtAt(DB.log[DB.log.length-1].t)}`:""}</p></div>
    <div class="panel"><h3>Сброс</h3><p>Вернуть исходные данные из Excel-таблицы. Текущие данные будут потеряны (сначала сделайте экспорт).</p>
      <button class="btn danger" id="resetAll">↺ Сбросить к исходным</button></div>
  </div>`;
}
function download(name,text){const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([text],{type:"application/json"}));a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500)}
function doExport(withPhotos){
  const d=clone(DB);if(!withPhotos)d.items.forEach(i=>{if(String(i.poster).startsWith("data:"))i.poster=""});
  d.exportedAt=new Date().toISOString();
  download(`lisi-ocenki-${new Date().toISOString().slice(0,10)}.json`,JSON.stringify(d,null,1));toast("Файл выгружен");
}
let impMode="replace";
async function doImport(file){
  try{
    const d=JSON.parse(await file.text());
    if(!d||!Array.isArray(d.items))throw new Error("нет поля items");
    if(impMode==="replace"){DB=normalize(d)}
    else{
      const n=normalize(d);let add=0,upd=0;
      for(const it of n.items){const ex=DB.items.find(x=>x.id===it.id)||DB.items.find(x=>x.title.toLowerCase()===it.title.toLowerCase()&&x.type===it.type);
        if(ex){const id=ex.id;Object.assign(ex,it,{id,poster:it.poster||ex.poster});upd++}else{DB.items.push(it);add++}}
      for(const r of n.raters)if(!DB.raters.includes(r))DB.raters.push(r);
      for(const t of n.types)if(!DB.types.includes(t))DB.types.push(t);
      const lk=e=>e.t+"|"+e.id+"|"+e.s+"|"+e.r;const have=new Set(DB.log.map(lk));for(const e of n.log||[])if(!have.has(lk(e)))DB.log.push(e);DB.log.sort((a,b)=>a.t<b.t?-1:1);
      for(const c of n.catalog){const ex=DB.catalog.find(x=>x.id===c.id)||DB.catalog.find(x=>x.franchise===c.franchise&&x.title===c.title);if(ex)Object.assign(ex,c,{id:ex.id});else DB.catalog.push(c)}
      toast(`Добавлено ${add}, обновлено ${upd}`);
    }
    commit();if(impMode==="replace")toast("Данные загружены");
  }catch(e){toast("Ошибка импорта: "+e.message)}
}

/* ============ binding ============ */
function bindView(){
  const v=$("#view");
  $$("[data-ui]",v).forEach(g=>g.addEventListener("click",e=>{const b=e.target.closest("[data-v]");if(!b)return;const k=g.dataset.ui;let val=b.dataset.v;
    if(k==="bucket"&&UI.bucket===val)val=null;
    if(k==="sort"){}
    setUI(k,val)}));
  $$("[data-uis]",v).forEach(s=>s.addEventListener("change",()=>{const k=s.dataset.uis;if(k==="sort"||k==="group")UI.reorder=false;if(k==="sort"){UI.dir=(s.value==="title"||s.value==="mcu"||s.value==="year")?1:-1}setUI(k,s.value)}));
  const q=$("#q",v);if(q){q.addEventListener("input",()=>{UI.q=q.value;saveUI();clearTimeout(q.t);q.t=setTimeout(()=>{render();const n=$("#q");n.focus();n.setSelectionRange(n.value.length,n.value.length)},180)})}
  const sq=$("#serQ",v);if(sq){sq.addEventListener("input",()=>{UI.serQ=sq.value;saveUI();clearTimeout(sq.t);sq.t=setTimeout(()=>{render();const n=$("#serQ");n.focus();n.setSelectionRange(n.value.length,n.value.length)},180)})}
  $("#fBtn",v)?.addEventListener("click",()=>setUI("fopen",!UI.fopen));
  $("#dirBtn",v)?.addEventListener("click",()=>setUI("dir",-UI.dir));
  $("#hideScBtn",v)?.addEventListener("click",()=>{UI.hideScores=!UI.hideScores;saveUI();render()});
  const reo=on=>{UI.reorder=on;if(on){const ch=UI.sort!=="order"||UI.group!=="none"||UI.mode!=="whole";Object.assign(UI,{sort:"order",group:"none",mode:"whole"});if(ch)toast("Включена сортировка по порядку просмотра")}saveUI();render()};
  $$(".frz",v).forEach(d=>d.addEventListener("toggle",()=>{UI.frzOpen=d.open;saveUI()}));
  $("#compactBtn",v)?.addEventListener("click",()=>setUI("compact",!UI.compact));
  $("#reorderBtn",v)?.addEventListener("click",()=>reo(!UI.reorder));
  $("#reorderDone",v)?.addEventListener("click",()=>reo(false));
  $$("[data-gtoggle]",v).forEach(b=>b.addEventListener("click",()=>{const k=b.dataset.gtoggle;UI.gColl=Object.assign({},UI.gColl);if(UI.gColl[k])delete UI.gColl[k];else UI.gColl[k]=1;saveUI();render()}));
  $("#resetF",v)?.addEventListener("click",()=>{Object.assign(UI,{type:"all",bucket:null,comics:"all",genre:"",tag:"",q:"",rater:"all",unr:"hide"});saveUI();render()});
  $("#newSeries",v)?.addEventListener("click",()=>openEdit(null,{type:"Сериал",status:"watched"}));
  $("#addPlan",v)?.addEventListener("click",()=>openEdit(null,{status:"planned"}));
  $("#addProp",v)?.addEventListener("click",()=>openEdit(null,{status:PROP}));
  $("#errClear",v)?.addEventListener("click",()=>{ERRLOG.length=0;try{localStorage.removeItem(ERRK)}catch(e){}render()});
  $("#errCopy",v)?.addEventListener("click",()=>copyText(ERRLOG.map(e=>new Date(e.t).toISOString()+" ["+e.c+"] "+e.m).join("\n"),"Журнал скопирован"));
  $$("[data-jump]",v).forEach(a=>a.addEventListener("click",e=>{e.preventDefault();document.getElementById(a.dataset.jump)?.scrollIntoView({behavior:"smooth"})}));
  if(UI.tab==="guide")guideBind(v);
  // data tab
  bindCloud(v);
  $("#pwaInstall",v)?.addEventListener("click",pwaInstall);
  $("#expFull",v)?.addEventListener("click",()=>doExport(true));
  $("#expLite",v)?.addEventListener("click",()=>doExport(false));
  $("#impReplace",v)?.addEventListener("click",()=>{if(!confirm("Заменить все текущие данные содержимым файла?"+(CLOUD&&CLOUD.room?"\n\nОблако включено — замена уйдёт и второму человеку.":"")))return;impMode="replace";$("#fileImp").click()});
  $("#impMerge",v)?.addEventListener("click",()=>{impMode="merge";$("#fileImp").click()});
  $("#addRater",v)?.addEventListener("click",()=>{$("#ratersEd").insertAdjacentHTML("beforeend",`<div class="row"><input class="inp" placeholder="Имя" data-ri="new"></div>`)});
  $("#saveRaters",v)?.addEventListener("click",()=>{
    const ins=$$("#ratersEd input");const nr=[];
    ins.forEach(inp=>{const nm=inp.value.trim();if(!nm)return;const i=inp.dataset.ri;
      if(i!=="new"){const old=DB.raters[+i];if(old!==nm)renameRater(old,nm)}nr.push(nm)});
    DB.raters=[...new Set(nr)];if(!DB.raters.length)DB.raters=["Оценщик"];
    if(!DB.raters.includes(UI.rater))UI.rater="all";commit();toast("Сохранено")});
  $("#saveTypes",v)?.addEventListener("click",()=>{const t=$("#typesEd").value.split(",").map(s=>s.trim()).filter(Boolean);if(t.length){DB.types=[...new Set(t)];commit();toast("Сохранено")}});
  $("#resetAll",v)?.addEventListener("click",()=>{if(!confirm("Сбросить все данные к исходным из Excel? Это необратимо."+(CLOUD&&CLOUD.room?"\n\nВнимание: облако включено — сброс уйдёт и второму человеку.":"")))return;snapNow("safety","перед сбросом");DB=normalize(clone(SEED));applyTmdb(DB);applyWorld(DB);commit();toast("Данные сброшены (копия до сброса сохранена)")});
  $$("[data-cadd]",v).forEach(b=>b.addEventListener("click",()=>openCatalog(null,b.dataset.cadd,b.dataset.phase)));
  $$("[data-tagren]",v).forEach(b=>b.addEventListener("click",()=>{const o=b.dataset.tagren;const n=prompt(`Новое имя для тега #${o} (пусто — удалить тег):`,o);if(n===null)return;const nn=n.trim();
    DB.items.forEach(i=>{if((i.tags||[]).includes(o)){i.tags=i.tags.filter(x=>x!==o);if(nn&&!i.tags.includes(nn))i.tags.push(nn)}});if(UI.tag===o)UI.tag=nn;commit();toast(nn?"Тег переименован":"Тег удалён")}));
  $("#tmdbAgain",v)?.addEventListener("click",()=>{const n=applyTmdb(DB);commit();toast(n?`Дополнено записей: ${n}`:"Все поля уже заполнены")});
  $("#worldAgain",v)?.addEventListener("click",()=>{const n=applyWorld(DB);commit();toast(n?`Дополнено записей: ${n}`:"Все поля уже заполнены")});
  $("#omdbKey",v)?.addEventListener("change",e=>{setApiKey("omdb",e.target.value);toast("Ключ OMDb сохранён")});
  $("#omdbGo",v)?.addEventListener("click",()=>{setApiKey("omdb",$("#omdbKey",v).value);refreshWorld()});
  $("#tmdbKeySave",v)?.addEventListener("click",async()=>{const k=$("#tmdbKey",v).value.trim();setApiKey("tmdb",k);if(!k){toast("Ключ TMDB удалён");return}
    try{await tmdbGet("/configuration");toast("✓ Ключ TMDB работает");fillPosters()}catch(e){toast("⚠ "+(e.message==="Failed to fetch"?"нет связи с TMDB":e.message))}});
  $("#malGo",v)?.addEventListener("click",()=>refreshMal());
  $$("[data-tabvis]",v).forEach(cb=>cb.addEventListener("change",()=>{const id=cb.dataset.tabvis,h=new Set(UI.hiddenTabs||[]);if(cb.checked)h.delete(id);else h.add(id);UI.hiddenTabs=[...h];saveUI();render()}));
  const cq=$("#catQ",v);if(cq){cq.addEventListener("input",()=>{UI.catQ=cq.value;UI.catSim=null;saveUI();clearTimeout(cq.t);cq.t=setTimeout(()=>{render();const n=$("#catQ");if(n){n.focus();n.setSelectionRange(n.value.length,n.value.length)}},500)})}
  $("#catHide",v)?.addEventListener("change",e=>setUI("catHide",e.target.checked));
  $("#catSoon",v)?.addEventListener("click",()=>setUI("catSort",UI.catSort==="soon"||UI.catSort==="soonpop"?"popular":"soon"));
}
function renameRater(o,n){const fix=r=>{if(r&&r[o]!==undefined){r[n]=r[o];delete r[o]}};DB.items.forEach(i=>{fix(i.ratings);(i.seasons||[]).forEach(s=>fix(s.ratings))})}
// global delegated clicks
document.addEventListener("click",e=>{
  const t=e.target.closest("[data-open],[data-rate],[data-finish],[data-edit],[data-cplan],[data-cedit],[data-ep],[data-sdone],[data-prog],[data-start],[data-tags],[data-gotag],[data-freeze],[data-unfreeze]");if(!t)return;
  if(t.closest("dialog")&&!t.closest("#dlg"))return;
  if(t.dataset.freeze||t.dataset.unfreeze){e.stopPropagation();setFrozen(t.dataset.freeze||t.dataset.unfreeze,!!t.dataset.freeze,!!t.closest("#dlg"));return}
  if(t.dataset.ep){e.stopPropagation();bumpEp(t.dataset.ep);return}
  if(t.dataset.tags){e.stopPropagation();openItemTags(t.dataset.tags);return}
  if(t.dataset.gotag){if(t.closest("dialog"))closeDlg();Object.assign(UI,{tag:t.dataset.gotag,type:"all",bucket:null,genre:"",q:""});location.hash="watched";if(UI.tab==="watched")render(true);return}
  if(t.dataset.sdone){e.stopPropagation();seasonDone(t.dataset.sdone);return}
  if(t.dataset.prog){e.stopPropagation();openProgress(t.dataset.prog);return}
  if(t.dataset.start){e.stopPropagation();if(t.closest("dialog"))closeDlg();startWatching(t.dataset.start,t.dataset.sn?+t.dataset.sn:null);return}
  if(t.dataset.rate){e.stopPropagation();const s=t.dataset.season;openRate(t.dataset.rate,{season:s==="whole"?null:+s});return}
  if(t.dataset.finish){e.stopPropagation();openRate(t.dataset.finish,{finish:true,season:t.dataset.fseason?+t.dataset.fseason:undefined});return}
  if(t.dataset.edit){e.stopPropagation();openEdit(t.dataset.edit);return}
  if(t.dataset.cplan){const c=DB.catalog.find(x=>x.id===t.dataset.cplan);const it={id:uid("i"),title:c.title,type:"Фильм",kind:"movie",status:"planned",year:c.year||null,genres:["Кинокомикс"],synopsis:"",poster:"",duration:null,ratings:{},order:null,watchedAt:null,addedAt:Date.now()};DB.items.push(it);c.link={itemId:it.id,season:null};commit();toast("Добавлено в планы: "+c.title);return}
  if(t.dataset.cedit){openCatalog(t.dataset.cedit);return}
  if(t.dataset.open){const[id,s]=t.dataset.open.split(":");openDetail(id,s!=null?+s:null)}
});

/* ============ dialogs ============ */
function showDlg(html,id="dlg"){const d=document.getElementById(id);d.classList.remove("pbg");d.style.removeProperty("--pcol");delete d.dataset.pid;d.innerHTML=html;if(!d.open)d.showModal();d.tabIndex=-1;d.focus({preventScroll:true});d.scrollTop=0;return d}
function closeDlg(id="dlg"){const d=document.getElementById(id);if(d.open)d.close()}
["dlg","dlg2"].forEach(id=>{const d=document.getElementById(id);d.addEventListener("click",e=>{if(e.target===d)d.close();if(e.target.closest("[data-close]"))d.close()})});

/* detail */
function segTable(it){
  const arc=isArc(it),S=it.seasons||[],nx=Math.max(0,...S.map(s=>s.n))+1;
  const cell=(v,sn,tip)=>`<div class="cell ${isNum(v)?"":"na"}" ${isNum(v)?`style="background:${scoreColor(v)}"`:""} data-rate="${it.id}" data-season="${sn}" title="${esc(tip)}">${f1(v)}</div>`;
  const addTip=arc?"Оценить следующую арку":"Добавить сезон";
  const h=`<div class="dsec"><h4>${arc?"Арки":"Сезоны"}${S.length?` <span class="dim" style="font-weight:600;text-transform:none;letter-spacing:0">· оценено ${S.length}${arc?" из "+it.arcs.length:it.seasonsTotal?" из "+it.seasonsTotal:""}</span>`:""}</h4>`;
  if(arc||S.length>8){ // вертикально: по строке на арку/сезон
    const nxName=arc?(arcOf(it,nx)?`${nx}. ${arcOf(it,nx).name}`:""):`${nx} сезон`;
    return h+`<div class="smat svt"><table><thead><tr><th>№</th><th class="l">${arc?"Арка":"Сезон"}</th>${DB.raters.map(n=>`<th>${esc(n)}</th>`).join("")}<th>Среднее</th></tr></thead><tbody>
      ${S.map(sg=>{const a=arcOf(it,sg.n);return `<tr><td class="n">${sg.n}</td><td class="l"><span class="nm">${esc(arc?(a?a.name:"Арка "+sg.n):sg.n+" сезон")}</span>${a?`<span class="ep">${a.filler?"филлер · ":""}эп. ${a.from}–${a.to||"…"}</span>`:""}</td>
        ${DB.raters.map(n=>`<td>${cell(personScore(sg.ratings[n]),sg.n,segTip(it,sg.n)+" · "+n)}</td>`).join("")}<td class="av">${cell(overallOf(sg.ratings),sg.n,segTip(it,sg.n))}</td></tr>`}).join("")}
      ${!arc||arcOf(it,nx)?`<tr><td class="n"></td><td colspan="${DB.raters.length+2}"><div class="cell add wide" data-rate="${it.id}" data-season="${nx}" title="${addTip}">＋ ${esc(nxName)}</div></td></tr>`:""}
      </tbody></table></div></div>`;
  }
  return h+`<div class="smat"><table><thead><tr><th></th>${S.map(sg=>`<th title="${esc(segTip(it,sg.n))}">${segShort(it,sg.n)}</th>`).join("")}<th></th></tr></thead><tbody>
    ${[...DB.raters,null].map(n=>`<tr ${n?"":`class="avg"`}><th class="l">${n?esc(n):"Среднее"}</th>${S.map(sg=>`<td>${cell(n?personScore(sg.ratings[n]):overallOf(sg.ratings),sg.n,segTip(it,sg.n))}</td>`).join("")}${n?"<td></td>":`<td><div class="cell add" data-rate="${it.id}" data-season="${nx}" title="${addTip}">＋</div></td>`}</tr>`).join("")}
    </tbody></table></div></div>`;
}
function openDetail(id,season){
  const it=itemById(id);if(!it)return;
  const cm=comicsMap()[it.id]||[];
  const sObj=season!=null?(it.seasons||[]).find(s=>s.n===season):null;
  const R=sObj?sObj.ratings:it.ratings;
  const useSeasonsAvg=!sObj&&it.kind==="series"&&!hasRatings(it.ratings);
  const per=n=>sObj?personScore(sObj.ratings[n]):itemScore(it,n);
  const tot=sObj?overallOf(sObj.ratings):itemScore(it);
  const catCell=(n,k)=>{const v=useSeasonsAvg?itemCats(it,n)[k]:R[n]?.[k];return `<td>${R[n]||useSeasonsAvg?scBadge(isNum(v)?v:null,"sm"):`<span class="dim">·</span>`}</td>`};
  const ser=it.kind==="series";
  const arc=isArc(it);
  const html=`<div class="dh"><h2 class="dsub">${esc(it.type)}${it.year?` · ${it.year}`:""}</h2><button class="btn icon ghost" data-close aria-label="Закрыть">✕</button></div>
  <div class="db"><div class="det" id="detShot">
    <div><div class="poster">${posterHTML(it)}</div><button class="btn sm" data-ppick="${it.id}" style="width:100%;margin-top:8px;justify-content:center">🖼 Сменить постер</button><button class="btn sm" data-csimi="${it.id}" style="width:100%;margin-top:6px;justify-content:center">≈ Похожие в каталоге</button></div>
    <div>
      <h1 class="dtitle">${esc(it.title)}${sObj?`<span class="dseg"> · ${esc(segName(it,season))}</span>`:""}</h1>
      <div class="meta"><span class="tag">${esc(it.type)}</span>${it.year?`<span>${it.year}</span>`:""}${it.status==="planned"?`<span class="stt p">В планах</span>`:it.status===PROP?`<span class="stt q">🤝 На согласовании</span>`:it.status==="watching"?`<span class="stt c">Смотрим · ${esc(progLabel(it,true))}</span>`:`<span class="stt w">Просмотрено${it.order?` · №${it.order}`:""}</span>`}${it.watchedAt?`<span class="dim">${new Date(it.watchedAt).toLocaleDateString("ru-RU")}</span>`:""}${cm.map(c=>`<span class="tag acc">${FR[c.franchise]}${c.franchise==="MCU"?" №"+c.num:""}${c.link.season!=null?" (S"+c.link.season+")":""}</span>`).join("")}</div>
      ${it.status==="planned"?detPlanBlock(it):isProp(it)?`<div class="dplan">${askRow(it)}</div>`:""}
      ${it.genres.length?`<div class="chips" style="margin-bottom:12px">${it.genres.map(g=>`<span class="tag am">${esc(g)}</span>`).join("")}</div>`:""}
      ${(it.tags||[]).length?`<div class="chips" style="margin-bottom:12px">${it.tags.map(t=>`<button class="chip" data-gotag="${esc(t)}" style="padding:3px 10px;font-size:12px">#${esc(t)}</button>`).join("")}</div>`:""}
      ${durLine(it)?`<p class="muted" style="margin:0 0 12px">⏱ ${esc(durLine(it))}${it.tmdb?`<span data-noshot> · <a href="${tmdbUrl(it)}" target="_blank" rel="noopener">TMDB ↗</a></span>`:""}</p>`:it.tmdb?`<p class="muted" style="margin:0 0 12px" data-noshot><a href="${tmdbUrl(it)}" target="_blank" rel="noopener">TMDB ↗</a></p>`:""}
      ${it.synopsis?`<p class="syn">${esc(it.synopsis)}</p>`:`<p class="syn dim">Синопсис не добавлен.</p>`}
      ${it.status==="watching"?`<div class="pgbox"><div class="row"><b>${esc(progLabel(it))}</b><span class="dim">${progPct(it)!=null?Math.round(progPct(it)*100)+"%":""}</span></div><div class="prog"><i style="width:${((progPct(it)||0)*100).toFixed(1)}%"></i></div><div class="row" style="justify-content:flex-start;gap:6px"><button class="btn sm pri" data-ep="${it.id}">＋1 серия</button>${it.progress?.season!=null?`<button class="btn sm" data-sdone="${it.id}">Сезон досмотрен</button>`:""}<button class="btn sm ghost" data-prog="${it.id}">✎ Прогресс</button></div></div>`:""}
      ${it.status!=="planned"&&(it.status==="watched"||hasRatings(it.ratings)||seasonsRated(it).length)?`<div class="scores"><div>Итог ${scBadge(tot,"big")}</div>${DB.raters.map((n,ri)=>`<div class="who w${ri%2}">${esc(n)} ${scBadge(per(n),"big")}</div>`).join("")}</div>
      <table class="ctbl"><thead><tr><th></th>${CATS.map(c=>`<th title="${c.n}">${c.s}</th>`).join("")}</tr></thead><tbody>
        ${DB.raters.map(n=>`<tr><td class="l">${esc(n)}</td>${CATS.map(c=>catCell(n,c.k)).join("")}</tr>`).join("")}
      </tbody></table>${useSeasonsAvg?`<p class="dim" style="font-size:12.5px">Оценки — среднее по ${arc?"аркам":"сезонам"}.</p>`:""}${ratedAtLine(R,useSeasonsAvg)}`:""}
      ${!sObj?worldBlock(it,tot):""}
      ${ser&&!sObj?segTable(it):""}
    </div></div></div>
  <div class="df"><button class="btn danger ghost" id="dDel">Удалить</button><div class="sp"></div>
    <button class="btn icon" data-shot="#detShot" data-shot-title="${esc(it.title)}${sObj?" · "+esc(segName(it,season)):""}" title="Копировать карточку картинкой"><i class="ico ico-cam"></i></button>
    <button class="btn" data-tags="${it.id}" title="Теги">🏷</button>
    ${canFreeze(it)?(it.frozen?`<button class="btn" data-unfreeze="${it.id}">Разморозить</button>`:`<button class="btn" data-freeze="${it.id}" title="Пока не продолжаем — убрать из «Продолжить просмотр»"><i class="ico ico-snow"></i> Заморозить</button>`):""}
    <button class="btn" data-edit="${it.id}">✎ Изменить</button>
    ${it.status==="planned"&&ser?`<button class="btn" data-start="${it.id}">▶ Начать смотреть</button>`:""}${it.status==="watched"&&ser&&it.seasonsTotal&&Math.max(0,...(it.seasons||[]).map(s=>s.n))<it.seasonsTotal?`<button class="btn" data-start="${it.id}" data-sn="${Math.max(0,...(it.seasons||[]).map(s=>s.n))+1}">▶ Продолжить</button>`:""}${it.status==="watching"?`<button class="btn" data-finish="${it.id}">✓ Досмотрели</button>`:""}
    ${isProp(it)?`<button class="btn" data-toplan="${it.id}">＋ В планы</button>`:""}${it.status==="planned"||isProp(it)?`<button class="btn pri" data-finish="${it.id}">✓ Просмотрено</button>`:`<button class="btn pri" data-rate="${it.id}" data-season="${sObj?season:"whole"}">★ ${sObj?(arc?"Оценить арку":"Оценить сезон"):ser?"Оценить целиком":"Изменить оценку"}</button>`}</div>`;
  const d=showDlg(html);
  posterBgApply(d,it);
  $("#dDel",d).onclick=()=>{
    if(sObj){if(!confirm(arc?`Удалить оценку арки «${segName(it,season)}»?`:`Удалить оценку ${season} сезона?`))return;it.seasons=it.seasons.filter(s=>s.n!==season);closeDlg();commit();return}
    if(!confirm(`Удалить «${it.title}»?`))return;DB.items=DB.items.filter(x=>x!==it);DB.catalog.forEach(c=>{if(c.link?.itemId===it.id)c.link=null});closeDlg();commit();toast("Удалено")};
}

/* edit */
function openEdit(id,preset){
  const isNew=!id;
  const it=isNew?Object.assign({id:uid("i"),title:"",type:"Фильм",status:"watched",year:null,genres:[],synopsis:"",poster:"",duration:null,ratings:{},order:null,watchedAt:null,seasons:[],addedAt:Date.now()},preset||{}):clone(itemById(id));
  if(isNew)it.kind=SERIES_TYPES.includes(it.type)?"series":"movie";
  let poster=it.poster||"";
  const allGenres=[...new Set(DB.items.flatMap(i=>i.genres))].sort(cmpRu);
  const html=`<div class="dh"><h2>${isNew?"Новая запись":"Изменить"}</h2><button class="btn icon ghost" data-close>✕</button></div>
  <div class="db"><div class="pedit">
    <div><div class="poster" id="ePoster">${posterHTML({...it,poster})}</div>
      <div class="drop" id="eDrop" style="margin-top:8px">Перетащите фото, вставьте (Ctrl+V) или<br><button class="btn sm" id="ePick" style="margin-top:6px">Выбрать файл</button></div>
      <button class="btn sm" id="ePickTmdb" style="margin-top:6px;width:100%;justify-content:center">🖼 Постер из TMDB</button>
      <input class="inp" id="eUrl" placeholder="…или ссылка на картинку" style="width:100%;margin-top:6px;font-size:13px" value="${poster.startsWith("data:")?"":esc(poster)}">
      <button class="btn sm ghost danger" id="eNoPh" style="margin-top:6px;width:100%;justify-content:center">Убрать фото</button>
      <input type="file" id="eFile" accept="image/*" hidden></div>
    <div class="form">
      <div class="f s6 tfind"><label>Название * <button type="button" class="lnk" id="eFindBtn" title="Найти фильм или сериал в TMDB и заполнить поля">🔎 найти данные</button></label><input class="inp" id="eTitle" value="${esc(it.title)}" required autocomplete="off"><div class="tres" id="eFind" hidden></div><span class="hint" id="eFindSt">${isNew?(apiKey("tmdb")?"Начните вводить название — предложу варианты, остальное заполнится само":"Подключите TMDB во вкладке «Данные» — тогда данные будут подтягиваться сами"):""}</span></div>
      <div class="f s2"><label>Тип</label><select class="inp" id="eType">${DB.types.map(t=>`<option ${t===it.type?"selected":""}>${esc(t)}</option>`).join("")}</select></div>
      <div class="f s2"><label>Статус</label><select class="inp" id="eStatus"><option value="watched" ${it.status==="watched"?"selected":""}>Просмотрено</option><option value="watching" ${it.status==="watching"?"selected":""}>Смотрим сейчас</option><option value="planned" ${it.status==="planned"?"selected":""}>В планах</option><option value="proposed" ${it.status===PROP?"selected":""}>На согласовании</option></select></div>
      <div class="f s2"><label>Год выхода</label><input class="inp" id="eYear" type="number" min="1890" max="2100" value="${it.year||""}"></div>
      <div class="f s6"><label class="chk"><input type="checkbox" id="eSer" ${it.kind==="series"?"checked":""}> Многосерийное (сезоны и серии)</label></div>
      <div class="f s2 mv"><label>Длительность, мин</label><input class="inp" id="eDur" inputmode="numeric" value="${it.kind!=="series"&&it.duration!=null?esc(it.duration):""}"></div>
      <div class="f s2 sv"><label>Сезонов всего</label><input class="inp" id="eSeas" type="number" min="1" value="${it.seasonsTotal||""}"></div>
      <div class="f s2 sv"><label>Серий всего</label><input class="inp" id="eEps" type="number" min="1" value="${it.episodes||""}"></div>
      <div class="f s2 sv"><label>Длительность серии, мин</label><input class="inp" id="eEpD" placeholder="напр. 45 или 43-75" value="${esc(it.episodeDuration||"")}"></div>
      <div class="f s2 sv"><label>Общая длительность, мин</label><input class="inp" id="eTot" type="number" min="1" value="${it.totalDuration||""}" placeholder="авто"><span class="hint" id="eTotH"></span></div>
      <div class="f s4 sv"><label>Серий по сезонам (необязательно)</label><input class="inp" id="eSE" placeholder="напр. 10, 10, 13" value="${esc((it.seasonEpisodes||[]).join(", "))}"><span class="hint">Для точного прогресса, если в сезонах разное число серий</span></div>
      <div class="f s2 pv"><label>Смотрим: сезон</label><input class="inp" id="ePS" type="number" min="1" placeholder="—" value="${it.progress?.season??(it.progress?"":1)}"></div>
      <div class="f s2 pv"><label>Просмотрено серий</label><input class="inp" id="ePE" type="number" min="0" value="${it.progress?.episode??0}"></div>
      <div class="f s6 pv"><span class="hint">Укажите, на каком сезоне вы сейчас и сколько серий в нём уже посмотрели. Если сезонов нет (аниме, мини-сериал), оставьте сезон пустым и укажите общее число просмотренных серий.</span></div>
      <div class="f s2"><label>Дата выхода</label><input class="inp" id="eRel" type="date" value="${esc(it.relDate||"")}"></div>
      <div class="f s4"><label class="chk" style="margin-top:24px"><input type="checkbox" id="eUnrel" ${it.unreleased?"checked":""}> Ещё не вышло — смотреть позже (если дата неизвестна)</label></div>
      <div class="f s4"><label>Вселенная / серия <span class="dim" style="font-weight:400">· если не определилась сама</span></label><input class="inp" id="eUni" list="uniList" value="${esc(it.uni||"")}" placeholder="${esc(buildUni().of.get(it.id)||"напр. Монстрвёрс")}"><datalist id="uniList">${universeNames().map(n=>`<option value="${esc(n)}">`).join("")}</datalist></div>
      <div class="f s2"><label>Уже видели</label><div class="chips" style="gap:12px;padding-top:6px">${DB.raters.map(n=>`<label class="chk"><input type="checkbox" data-seenchk="${esc(n)}" ${it.seenBy&&it.seenBy[n]?"checked":""}> ${esc(n)}</label>`).join("")}</div></div>
      <div class="f s6"><label>Жанры (через запятую)</label><input class="inp" id="eGen" list="genList" value="${esc(it.genres.join(", "))}"><datalist id="genList">${allGenres.map(g=>`<option value="${esc(g)}">`).join("")}</datalist>
        <div class="chips" id="eGenQ" style="margin-top:4px">${allGenres.slice(0,16).map(g=>`<button type="button" class="chip" data-g="${esc(g)}" style="padding:3px 9px;font-size:12px">${esc(g)}</button>`).join("")}</div></div>
      <div class="f s6"><label>Теги (через запятую)</label><input class="inp" id="eTags" value="${esc((it.tags||[]).join(", "))}" placeholder="напр. Нолан, пересмотреть, с друзьями"></div>
      <div class="f s6"><label>Синопсис</label><textarea class="inp" id="eSyn" rows="4">${esc(it.synopsis||"")}</textarea></div>
      <div class="f s6"><label>Мировые оценки <span class="dim" style="font-weight:400">· английское название нужно для онлайн-обновления</span></label></div>
      <div class="f s6"><input class="inp" id="xEn" placeholder="Название на английском, напр. The Matrix" value="${esc(it.ext?.en||"")}"></div>
      ${WSRC.map(s=>`<div class="f xw ${s.k==="mal"?"s2":"s1"}"><label>${s.s||s.n}</label><input class="inp" id="x_${s.k}" inputmode="decimal" placeholder="${s.k==="rt"?"%":s.k==="mc"?"0–100":"0–10"}" value="${isNum(it.ext?.[s.k])?it.ext[s.k]:""}"></div>`).join("")}
      <div class="f s2 wv"><label>№ в порядке просмотра</label><input class="inp" id="eOrd" type="number" value="${it.order||""}"></div>
      <div class="f s2 wv"><label>Дата просмотра</label><input class="inp" id="eDate" type="date" value="${it.watchedAt?String(it.watchedAt).slice(0,10):""}"></div>
    </div></div></div>
  <div class="df">${isNew?"":`<span class="dim" style="font-size:12.5px;align-self:center">Оценки меняются кнопкой «Оценить» в карточке</span>`}<div class="sp"></div><button class="btn" data-close>Отмена</button><button class="btn pri" id="eSave">${isNew&&it.status==="watched"?"Далее: оценка →":"Сохранить"}</button></div>`;
  const d=showDlg(html);
  const sync=()=>{const s=$("#eSer",d).checked;$$(".sv",d).forEach(x=>x.style.display=s?"":"none");$$(".mv",d).forEach(x=>x.style.display=s?"none":"");$$(".wv",d).forEach(x=>x.style.display=$("#eStatus",d).value==="watched"?"":"none");
    const wo=$("#eStatus",d).querySelector('[value="watching"]');wo.disabled=!s;if(!s&&$("#eStatus",d).value==="watching")$("#eStatus",d).value="planned";
    $$(".pv",d).forEach(x=>x.style.display=s&&$("#eStatus",d).value==="watching"?"":"none");
    const ed=parseDurAvg($("#eEpD",d).value),ep=+$("#eEps",d).value;$("#eTotH",d).textContent=ed&&ep&&!$("#eTot",d).value?"≈ "+fmtDur(ed*ep):""};
  sync();["#eSer","#eStatus","#eEpD","#eEps","#eTot"].forEach(s=>$(s,d).addEventListener("input",sync));
  $("#eType",d).addEventListener("change",()=>{$("#eSer",d).checked=SERIES_TYPES.includes($("#eType",d).value);sync()});
  $("#eStatus",d).addEventListener("change",()=>{$("#eSave",d).textContent=isNew&&$("#eStatus",d).value==="watched"?"Далее: оценка →":"Сохранить"});
  $("#eGenQ",d).addEventListener("click",e=>{const b=e.target.closest("[data-g]");if(!b)return;const inp=$("#eGen",d);const cur=inp.value.split(",").map(s=>s.trim()).filter(Boolean);if(!cur.includes(b.dataset.g))cur.push(b.dataset.g);inp.value=cur.join(", ")});
  const setPoster=p=>{poster=p;$("#ePoster",d).innerHTML=posterHTML({...it,title:$("#eTitle",d).value||it.title||"?",poster})};
  let picked=null;
  $("#ePickTmdb",d).addEventListener("click",()=>openPosterPicker((picked&&picked.tmdb)||it.tmdb,$("#eTitle",d).value||it.title,$("#eYear",d).value,u=>{setPoster(u);$("#eUrl",d).value=u}));
  bindAutofill(d,isNew,o=>{picked=o;
    $("#eTitle",d).value=o.title;
    if([...$("#eType",d).options].some(x=>x.value===o.type))$("#eType",d).value=o.type;
    $("#eSer",d).checked=o.series;if(o.year)$("#eYear",d).value=o.year;
    if(o.series){$("#eSeas",d).value=o.seasonsTotal||"";$("#eEps",d).value=o.episodes||"";$("#eEpD",d).value=o.episodeDuration||"";$("#eSE",d).value=(o.seasonEpisodes||[]).join(", ");$("#eTot",d).value=""}
    else if(o.duration)$("#eDur",d).value=o.duration;
    if(o.genres.length)$("#eGen",d).value=o.genres.join(", ");
    if(o.synopsis)$("#eSyn",d).value=o.synopsis;
    if(o.poster&&(isNew||!poster)){setPoster(o.poster);$("#eUrl",d).value=o.poster}
    if(o.en)$("#xEn",d).value=o.en;
    if(o.relDate&&!$("#eRel",d).value)$("#eRel",d).value=o.relDate;
    WSRC.forEach(s=>{if(o.ext&&isNum(o.ext[s.k]))$("#x_"+s.k,d).value=o.ext[s.k]});
    sync();$("#eSave",d).textContent=isNew&&$("#eStatus",d).value==="watched"?"Далее: оценка →":"Сохранить"});
  const takeFile=async f=>{if(!f||!f.type.startsWith("image/"))return;try{setPoster(await resizeImage(f));$("#eUrl",d).value=""}catch(e){toast("Не удалось прочитать изображение")}};
  $("#ePick",d).onclick=()=>$("#eFile",d).click();
  $("#eFile",d).onchange=e=>takeFile(e.target.files[0]);
  $("#eUrl",d).addEventListener("change",e=>setPoster(e.target.value.trim()));
  $("#eNoPh",d).onclick=()=>{setPoster("");$("#eUrl",d).value=""};
  const drop=$("#eDrop",d);
  ["dragover","dragenter"].forEach(ev=>d.addEventListener(ev,e=>{e.preventDefault();drop.classList.add("ov")}));
  ["dragleave","drop"].forEach(ev=>d.addEventListener(ev,()=>drop.classList.remove("ov")));
  d.addEventListener("drop",e=>{e.preventDefault();takeFile(e.dataTransfer.files[0])});
  d.onpaste=e=>{const f=[...(e.clipboardData?.items||[])].find(x=>x.type.startsWith("image/"));if(f){e.preventDefault();takeFile(f.getAsFile())}};
  $("#eSave",d).onclick=()=>{
    const title=$("#eTitle",d).value.trim();if(!title){$("#eTitle",d).focus();toast("Укажите название");return}
    const numOr=v=>{v=String(v).trim();if(!v)return null;const n=Number(v.replace(",","."));return isFinite(n)?n:v};
    const o=isNew?it:itemById(id);
    const wasPlanned=o.status==="planned";
    o.title=title;o.type=$("#eType",d).value;o.status=$("#eStatus",d).value;o.year=+$("#eYear",d).value||null;
    o.genres=$("#eGen",d).value.split(",").map(s=>s.trim()).filter(Boolean).map(s=>s[0].toUpperCase()+s.slice(1));
    o.synopsis=$("#eSyn",d).value.trim();o.tags=parseTags($("#eTags",d).value);o.poster=poster;
    o.kind=$("#eSer",d).checked?"series":"movie";
    {const rd=$("#eRel",d).value;if(rd)o.relDate=rd;else delete o.relDate;
     if($("#eUnrel",d).checked)o.unreleased=true;else delete o.unreleased;
     const uv=$("#eUni",d).value.trim();if(uv)o.uni=uv;else delete o.uni;
     const sb={};$$("[data-seenchk]",d).forEach(c=>{if(c.checked)sb[c.dataset.seenchk]=1});if(Object.keys(sb).length)o.seenBy=sb;else delete o.seenBy;if(o.noSeen){for(const n in sb)delete o.noSeen[n];if(!Object.keys(o.noSeen).length)delete o.noSeen}}
    {const x=Object.assign({},o.ext||{});const en=$("#xEn",d).value.trim();if(en)x.en=en;else delete x.en;let ch=false;
     WSRC.forEach(s=>{const raw=$("#x_"+s.k,d).value.trim().replace(",",".").replace("%","");const v=raw===""?null:parseFloat(raw);const nv=isFinite(v)?v:null;if((x[s.k]??null)!==nv)ch=true;if(nv==null)delete x[s.k];else x[s.k]=nv});
     if(ch){x.at=new Date().toISOString();x.src=picked&&picked.ext?"OMDb (авто)":"вручную"}
     if(picked&&picked.imdbId)x.imdbId=picked.imdbId;
     if(Object.keys(x).length)o.ext=x;else delete o.ext}
    if(picked){o.tmdb=picked.tmdb;if(picked.coll)o.coll=picked.coll;o.relChk=Date.now()}
    if(o.kind==="series"){o.seasonEpisodes=$("#eSE",d).value.split(/[,;\s]+/).map(Number).filter(n=>n>0);if(!o.seasonEpisodes.length)delete o.seasonEpisodes;o.seasons=o.seasons||[];o.seasonsTotal=+$("#eSeas",d).value||null;o.episodes=+$("#eEps",d).value||null;o.episodeDuration=numOr($("#eEpD",d).value);o.totalDuration=+$("#eTot",d).value||null;o.duration=null}
    else{o.duration=numOr($("#eDur",d).value)}
    if(o.status==="watched"){o.order=+$("#eOrd",d).value||o.order||nextOrder();o.watchedAt=$("#eDate",d).value||o.watchedAt||null}
    if(o.status==="watching"){const ps=+$("#ePS",d).value;o.progress={season:ps>0?ps:null,episode:Math.max(0,+$("#ePE",d).value||0)};o.progressAt=Date.now()}else delete o.progress;
    if(isNew)DB.items.push(o);
    closeDlg();commit();
    if(isNew&&o.status==="watched"){openRate(o.id,{season:o.kind==="series"?1:null,isNew:true})}
    else{toast("Сохранено");if(wasPlanned&&o.status==="watched"&&!hasRatings(o.ratings)&&!seasonsRated(o).length)openRate(o.id,{season:o.kind==="series"?1:null})}
  };
  setTimeout(()=>isNew&&$("#eTitle",d).focus(),50);
}
function resizeImage(file,maxW=500,maxH=750){
  return new Promise((res,rej)=>{const fr=new FileReader();fr.onerror=rej;fr.onload=()=>{const img=new Image();img.onerror=rej;img.onload=()=>{
    const k=Math.min(1,maxW/img.width,maxH/img.height);const c=document.createElement("canvas");c.width=Math.round(img.width*k);c.height=Math.round(img.height*k);
    const x=c.getContext("2d");x.imageSmoothingQuality="high";x.drawImage(img,0,0,c.width,c.height);res(c.toDataURL("image/jpeg",0.84))};img.src=fr.result};fr.readAsDataURL(file)});
}

/* rate */
function openRate(id,opt={}){
  const it=itemById(id);if(!it)return;
  const ser=it.kind==="series";
  let season=opt.season;
  if(season===undefined)season=ser?(Math.max(0,...(it.seasons||[]).map(s=>s.n))+1||1):null;
  const finish=!!opt.finish;
  const html=`<div class="dh"><h2>${finish?"Просмотрено: ":"Оценка: "}${esc(it.title)}</h2><button class="btn icon ghost" data-close>✕</button></div>
  <div class="db">
    ${ser?`<div class="row" style="margin-bottom:12px"><div class="seg" id="rTgt"><button data-v="s" class="${season!=null?"on":""}">${isArc(it)?"Арка":"Сезон"}</button><button data-v="w" class="${season==null?"on":""}">${isArc(it)?"Аниме целиком":"Сериал целиком"}</button></div>
      ${isArc(it)?`<select class="inp" id="rSn" style="max-width:min(340px,100%)" ${season==null?"disabled":""}>${it.arcs.map(a=>`<option value="${a.n}" ${a.n===(season??1)?"selected":""}>${a.n}. ${esc(a.name)}${a.filler?" (филлер)":""} · эп. ${a.from}–${a.to||"…"}${(it.seasons||[]).some(s=>s.n===a.n&&hasRatings(s.ratings))?" ✓":""}</option>`).join("")}</select>`:`<input class="inp" id="rSn" type="number" min="1" style="width:80px" value="${season??1}" ${season==null?"disabled":""}>`}<span class="dim" id="rSnH" style="font-size:13px"></span></div>`:""}
    ${finish?`<div class="row" style="margin-bottom:12px"><label class="dim" style="font-size:13px">Дата просмотра</label><input class="inp" type="date" id="rDate" value="${new Date().toISOString().slice(0,10)}"><label class="dim" style="font-size:13px">№ просмотра</label><input class="inp" type="number" id="rOrd" style="width:90px" value="${it.order||nextOrder()}"></div>`:""}
    <table class="rtbl"><thead><tr><th></th>${CATS.map(c=>`<th data-ch="${c.k}">${c.ic} ${c.n}<button type="button" class="q" data-q-ch="${c.k}" aria-label="Что значит: ${c.n}" title="Что значит «${c.n}»">?</button></th>`).join("")}<th>Среднее</th></tr></thead>
      <tbody id="rBody"></tbody></table>
    <div class="rres"><span class="dim" id="rAt" style="font-weight:400;font-size:12.5px;margin-right:auto"></span>Итог ${"<span id='rTot'></span>"}</div>
    <div class="qp" id="rQp" title="Быстрый ввод в активную клетку">${["-",1,1.5,2,2.5,3,3.5,4,4.5,5].map(v=>`<button data-q="${v}">${v==="-"?"—":v}</button>`).join("")}</div>
    <div class="ghint" id="rHint"><span class="dim">Шкала 0–5, можно дробные. «-» — категория неприменима и не учитывается в среднем. Пустая строка — оценщик ещё не оценил. Нажмите «?» у категории или выберите поле — здесь появятся пояснения и ориентиры.</span></div>
  </div>
  <div class="df">${!finish&&(season!=null?(it.seasons||[]).some(s=>s.n===season):hasRatings(it.ratings))?`<button class="btn danger ghost" id="rDel">Очистить оценку</button>`:""}<div class="sp"></div>${finish?`<button class="btn" id="rSkip">Без оценки</button>`:""}<button class="btn" data-close>Отмена</button><button class="btn pri" id="rSave">Сохранить</button></div>`;
  const d=showDlg(html,"dlg");
  const getR=()=>season==null?it.ratings:((it.seasons||[]).find(s=>s.n===season)||{}).ratings||{};
  const fill=()=>{const R=getR();
    $("#rBody",d).innerHTML=DB.raters.map(n=>`<tr><td class="l">${esc(n)}</td>${CATS.map(c=>{const v=R[n]?.[c.k];const has=R[n]&&c.k in R[n];return `<td><input data-r="${esc(n)}" data-k="${c.k}" inputmode="decimal" placeholder="" value="${isNum(v)?v:(has&&R[n]&&hasAny(R[n])?"-":"")}"></td>`}).join("")}<td class="av" data-av="${esc(n)}"></td></tr>`).join("");
    if(ser){const ex=(it.seasons||[]).some(s=>s.n===season);const a=isArc(it);$("#rSnH",d).textContent=season==null?"":(ex?(a?"арка уже оценена — правка":"сезон уже оценён — правка"):(a?"новая оценка":"новый сезон"))+(it.seasonsTotal&&!a?` · всего ${it.seasonsTotal}`:"")}
    const R2=getR(),ats=DB.raters.map(n=>R2[n]?.at?`${esc(n)}: ${fmtAt(R2[n].at)}`:null).filter(Boolean);
    $("#rAt",d).innerHTML=ats.length?"🕓 Оценено — "+ats.join(" · "):"";
    calc()};
  const hasAny=r=>CATS.some(c=>isNum(r[c.k]));
  const parse=s=>{s=String(s).trim().replace(",",".");if(s===""||s==="-"||s==="—")return null;const n=parseFloat(s);return isFinite(n)?Math.max(0,Math.min(5,n)):null};
  const calc=()=>{const per=[];DB.raters.forEach(n=>{const vs=$$(`input[data-r="${CSS.escape(n)}"]`,d).map(i=>parse(i.value));const a=avg(vs);per.push(a);$(`[data-av="${CSS.escape(n)}"]`,d).innerHTML=scBadge(a)});$("#rTot",d).innerHTML=scBadge(avg(per),"big")};
  let active=null;
  const H={k:null,sub:null,pin:false,who:null};
  const hintShow=()=>{if(H.k)$("#rHint",d).innerHTML=guideHint(H.k,{sub:H.sub,pinned:H.pin,rater:H.who,exceptId:it.id})};
  const hintSet=(k,who)=>{if(H.pin&&H.k!==k)return;if(H.k!==k)H.sub=null;H.k=k;if(who)H.who=who;hintShow()};
  d.addEventListener("focusin",e=>{if(e.target.matches("input[data-k]")){active=e.target;hintSet(e.target.dataset.k,e.target.dataset.r)}});
  $("#rHint",d).addEventListener("click",e=>{
    const ch=e.target.closest("[data-gsub]");if(ch){H.sub=H.sub===ch.dataset.gsub?null:ch.dataset.gsub;hintShow();return}
    const b=e.target.closest("[data-gh]");if(!b)return;
    if(b.dataset.gh==="pin"){H.pin=!H.pin;hintShow()}
    else if(b.dataset.gh==="guide"){UI.guideFocus=b.dataset.gk+(b.dataset.gs?":"+b.dataset.gs:"");closeDlg();location.hash==="#guide"?render(true):(location.hash="guide")}
  });
  d.addEventListener("click",e=>{const q=e.target.closest("[data-q-ch]");if(!q)return;e.preventDefault();const k=q.dataset.qCh;
    if(H.pin&&H.k===k){H.pin=false}else{H.pin=false;H.k=null;hintSet(k);H.pin=true}hintShow()});
  $("#rBody",d)?.addEventListener("input",e=>{const i=e.target;if(/[^\d.,\-—]/.test(i.value))i.value=i.value.replace(/[^\d.,\-—]/g,"");calc()});
  d.addEventListener("keydown",e=>{if(e.key==="Enter"&&e.target.matches("input[data-k]")){e.preventDefault();const all=$$("input[data-k]",d);const ix=all.indexOf(e.target);if(all[ix+1])all[ix+1].focus();else $("#rSave",d).focus()}});
  $$("th[data-ch]",d).forEach(h=>h.addEventListener("mouseenter",()=>hintSet(h.dataset.ch)));
  $("#rQp",d).addEventListener("mousedown",e=>e.preventDefault());
  $("#rQp",d).addEventListener("click",e=>{const b=e.target.closest("[data-q]");if(!b)return;if(!active)active=$("input[data-k]",d);active.value=b.dataset.q;calc();const all=$$("input[data-k]",d);const ix=all.indexOf(active);if(all[ix+1])all[ix+1].focus()});
  if(ser){
    $("#rTgt",d).addEventListener("click",e=>{const b=e.target.closest("[data-v]");if(!b)return;$$("#rTgt button",d).forEach(x=>x.classList.toggle("on",x===b));const w=b.dataset.v==="w";$("#rSn",d).disabled=w;season=w?null:(+$("#rSn",d).value||1);fill()});
    ["input","change"].forEach(ev=>$("#rSn",d).addEventListener(ev,()=>{season=+$("#rSn",d).value||1;fill()}));
  }
  fill();
  const finishMeta=()=>{if(!finish)return;delete it.progress;it.status="watched";it.order=+$("#rOrd",d).value||nextOrder();it.watchedAt=$("#rDate",d).value||null};
  $("#rSave",d).onclick=()=>{
    const res={};let any=false;const prev=getR(),now=new Date().toISOString(),logs=[];
    DB.raters.forEach(n=>{const o={};let h=false;CATS.forEach(c=>{const inp=$(`input[data-r="${CSS.escape(n)}"][data-k="${c.k}"]`,d);const v=parse(inp.value);o[c.k]=v;if(isNum(v))h=true});if(h){
      const p=prev[n],same=p&&CATS.every(c=>(p[c.k]??null)===(o[c.k]??null));
      if(same&&p.at){o.at=p.at;if(p.first)o.first=p.first}
      else{o.at=now;const fst=p&&p.first?p.first:p&&p.at?p.at:(p&&hasAnyR(p)?null:now);if(fst)o.first=fst;logs.push({t:now,id:it.id,s:season,r:n,v:Math.round(personScore(o)*100)/100,edit:!!(p&&hasAnyR(p))})}
      res[n]=o;any=true}});
    if(!any&&!finish){toast("Введите хотя бы одну оценку");return}
    DB.log.push(...logs);
    if(season==null){it.ratings=res}
    else{it.seasons=it.seasons||[];let s=it.seasons.find(s=>s.n===season);if(!s){s={n:season,ratings:{},order:it.seasons.length+1,watchedAt:finish?($("#rDate",d)?.value||null):new Date().toISOString().slice(0,10)};it.seasons.push(s);it.seasons.sort((a,b)=>a.n-b.n)}
      if(any)s.ratings=res;else it.seasons=it.seasons.filter(x=>x!==s);
      if(it.seasonsTotal&&season>it.seasonsTotal)it.seasonsTotal=season}
    finishMeta();
    if(opt.onSaved)opt.onSaved();
    closeDlg();commit();toast(finish?"Отмечено как просмотренное":"Оценка сохранена");foxRated(it,res,finish);
  };
  $("#rSkip",d)&&($("#rSkip",d).onclick=()=>{finishMeta();closeDlg();commit();toast("Отмечено как просмотренное")});
  $("#rDel",d)&&($("#rDel",d).onclick=()=>{if(!confirm("Очистить эту оценку?"))return;if(season==null)it.ratings={};else it.seasons=it.seasons.filter(s=>s.n!==season);closeDlg();commit()});
  setTimeout(()=>$("input[data-k]",d)?.focus(),60);
}

/* catalog entry edit/link */
function openCatalog(cid,fr,phase){
  const isNew=!cid;
  const c=isNew?{id:uid("c"),franchise:fr||"MCU",num:null,title:"",year:null,link:null}:DB.catalog.find(x=>x.id===cid);
  if(isNew){const same=DB.catalog.filter(x=>x.franchise===c.franchise);
    if(c.franchise==="MCU"&&phase){const p=PHASES.find(p=>p.id===+phase);const inP=same.filter(x=>p.f(x.num));c.num=inP.length?Math.floor(Math.max(...inP.map(x=>x.num)))+1:Math.max(0,...same.map(x=>x.num))+1}
    else c.num=Math.max(0,...same.map(x=>x.num))+1}
  const items=[...DB.items].sort((a,b)=>cmpRu(a.title,b.title));
  const guess=!c.link&&c.title?DB.items.find(i=>i.title.toLowerCase()===c.title.toLowerCase()):null;
  const html=`<div class="dh"><h2>${isNew?"Новая позиция":"Кинокомикс"} · ${FR[c.franchise]}</h2><button class="btn icon ghost" data-close>✕</button></div>
  <div class="db"><div class="form">
    <div class="f s1"><label>№</label><input class="inp" id="cNum" type="number" step="0.5" value="${c.num??""}"></div>
    <div class="f s4"><label>Название</label><input class="inp" id="cTitle" value="${esc(c.title)}"></div>
    <div class="f s1"><label>Год</label><input class="inp" id="cYear" type="number" value="${c.year||""}"></div>
    <div class="f s2"><label>Вселенная</label><select class="inp" id="cFr">${Object.entries(FR).map(([k,n])=>`<option value="${k}" ${k===c.franchise?"selected":""}>${n}</option>`).join("")}</select></div>
    <div class="f s4"><label>Связь с записью в списке</label><select class="inp" id="cLink"><option value="">— не связано —</option>${items.map(i=>`<option value="${i.id}" ${(c.link?.itemId||guess?.id)===i.id?"selected":""}>${esc(i.title)} (${esc(i.type)}${i.status==="planned"?", в планах":""})</option>`).join("")}</select>${guess?`<span class="hint">Найдено совпадение по названию</span>`:""}</div>
    <div class="f s2"><label>Сезон (если это сезон сериала)</label><input class="inp" id="cSeason" type="number" min="1" value="${c.link?.season??""}"></div>
  </div><p class="dim" style="font-size:13px;margin:14px 0 0">Оценка и статус берутся из связанной записи. Не нашли запись? Нажмите «В планы» в списке — она будет создана автоматически.</p></div>
  <div class="df">${isNew?"":`<button class="btn danger ghost" id="cDel">Удалить позицию</button>`}<div class="sp"></div><button class="btn" data-close>Отмена</button><button class="btn pri" id="cSave">Сохранить</button></div>`;
  const d=showDlg(html);
  $("#cSave",d).onclick=()=>{
    const t=$("#cTitle",d).value.trim();if(!t){toast("Укажите название");return}
    c.title=t;c.num=parseFloat($("#cNum",d).value)||c.num||1;c.year=+$("#cYear",d).value||null;c.franchise=$("#cFr",d).value;
    const l=$("#cLink",d).value;c.link=l?{itemId:l,season:+$("#cSeason",d).value||null}:null;
    if(l){const it=itemById(l);if(it&&!it.year&&c.year)it.year=c.year}
    if(isNew)DB.catalog.push(c);closeDlg();commit();toast("Сохранено")};
  $("#cDel",d)&&($("#cDel",d).onclick=()=>{if(!confirm("Удалить позицию из каталога?"))return;DB.catalog=DB.catalog.filter(x=>x!==c);closeDlg();commit()});
}


/* ============ TMDB: однократное дополнение ============ */
const TMDB=(()=>{try{return JSON.parse(document.getElementById("tmdb").textContent)}catch(e){return{}}})();
const normT=s=>String(s||"").toLowerCase().replace(/ё/g,"е").replace(/[^\p{L}\p{N}]+/gu,"");
function applyTmdb(db,{silent}={}){
  const titles={};SEED.items.forEach(i=>titles[i.id]=normT(i.title));
  let n=0;
  for(const [sid,d] of Object.entries(TMDB)){
    const want=titles[sid];
    let it=db.items.find(i=>i.id===sid&&normT(i.title)===want)||db.items.find(i=>normT(i.title)===want);
    if(!it)continue;
    let ch=false;const set=(k,v)=>{const cur=it[k];const empty=cur==null||cur===""||(Array.isArray(cur)&&!cur.length);if(empty&&v!=null&&v!==""&&!(Array.isArray(v)&&!v.length)){it[k]=v;ch=true}};
    set("poster",d.poster);set("synopsis",d.synopsis);set("year",d.year);set("genres",d.genres);
    if(it.kind==="series"){set("seasonEpisodes",d.seasonEpisodes);set("seasonsTotal",d.seasonsTotal);set("episodes",d.episodes);set("episodeDuration",d.episodeDuration);set("totalDuration",d.totalDuration)}
    else set("duration",d.duration);
    if(!it.tmdb){it.tmdb=d.tmdb;ch=true}
    if(ch)n++;
  }
  db.tmdbApplied=1;
  return n;
}
const tmdbUrl=it=>it.tmdb?`https://www.themoviedb.org/${it.tmdb.type}/${it.tmdb.id}?language=ru-RU`:"";

/* ============ автозаполнение: TMDB (данные) + OMDb (IMDb/RT/MC) + Jikan (MAL) ============ */
function apiKey(k){return String((DB&&DB.apiKeys&&DB.apiKeys[k])||(k==="omdb"?UI.omdbKey:"")||"").trim()}
function setApiKey(k,v){v=String(v||"").trim();const o=Object.assign({},DB.apiKeys);if(v)o[k]=v;else delete o[k];if(Object.keys(o).length)DB.apiKeys=o;else delete DB.apiKeys;save()}
async function tmdbGet(path,params={}){
  const k=apiKey("tmdb");if(!k)throw new Error("нет ключа TMDB");
  const u=new URL("https://api.themoviedb.org/3"+path);const bearer=k.length>40;
  if(!bearer)u.searchParams.set("api_key",k);for(const p in params)u.searchParams.set(p,params[p]);
  const r=await fetch(u,bearer?{headers:{Authorization:"Bearer "+k}}:{});
  if(r.status===401)throw new Error("ключ TMDB не подходит");if(!r.ok)throw new Error("TMDB ответил "+r.status);return r.json();
}
const TG={28:["Боевик"],12:["Приключения"],16:["Мультфильм"],35:["Комедия"],80:["Криминал"],99:["Документальный"],18:["Драма"],10751:["Семейный"],14:["Фэнтези"],36:["История"],27:["Ужасы"],10402:["Музыка"],9648:["Детектив"],10749:["Мелодрама"],878:["Фантастика"],53:["Триллер"],10752:["Военный"],37:["Вестерн"],
  10759:["Боевик","Приключения"],10762:["Детский"],10764:["Реалити-шоу"],10765:["Фантастика","Фэнтези"],10766:["Мыльная опера"],10767:["Ток-шоу"],10768:["Военный","Политика"]};
const tmdbImg=(p,w="w500")=>p?`https://image.tmdb.org/t/p/${w}${p}`:"";
/* чистый тип по данным TMDB: сериалы из Азии (в т.ч. Японии) без анимации — это дорамы */
function tmdbRawType(kind,d){
  const ids=(d.genres||[]).map(g=>g.id).concat(d.genre_ids||[]);const anim=ids.includes(16);
  const orig=[...(d.origin_country||[]),...(d.production_countries||[]).map(c=>c.iso_3166_1)];const jp=orig.includes("JP")||d.original_language==="ja";
  const asia=["KR","CN","TW","TH","HK"].some(c=>orig.includes(c))||["ko","zh","th"].includes(d.original_language);
  return kind==="tv"?(anim?(jp?"Аниме":"Мультсериал"):(asia||jp)?"Дорама":"Сериал"):(anim?(jp?"Аниме":"Мультфильм"):"Фильм");
}
function tmdbType(kind,d){
  let t=tmdbRawType(kind,d);
  if(!DB.types.includes(t))t=kind==="tv"?(DB.types.includes("Сериал")?"Сериал":DB.types[0]):(DB.types.includes("Фильм")?"Фильм":DB.types[0]);
  return t;
}
async function tmdbSearch(q){
  const r=await tmdbGet("/search/multi",{query:q,language:"ru-RU",include_adult:"false"});
  return (r.results||[]).filter(x=>x.media_type==="movie"||x.media_type==="tv").slice(0,8);
}
/* полные данные по выбранному: всё, что нужно форме */
async function tmdbDetails(kind,id){
  const d=await tmdbGet(`/${kind}/${id}`,{language:"ru-RU",append_to_response:"external_ids,translations"});
  const tr=(d.translations?.translations||[]).find(t=>t.iso_639_1==="en")?.data||{};
  const en=(kind==="tv"?tr.name:tr.title)||(d.original_language==="en"?(d.original_title||d.original_name):"")||d.original_title||d.original_name||"";
  const o={tmdb:{type:kind,id:d.id},title:(kind==="tv"?d.name:d.title)||en,en,
    year:+String(d.release_date||d.first_air_date||"").slice(0,4)||null,
    genres:[...new Set((d.genres||[]).flatMap(g=>TG[g.id]||[]))],
    synopsis:d.overview||tr.overview||"",poster:tmdbImg(d.poster_path),
    imdbId:d.imdb_id||d.external_ids?.imdb_id||"",type:tmdbType(kind,d),
    tmdbVote:isNum(d.vote_average)&&d.vote_count>20?d.vote_average:null,tmdbVotes:d.vote_count||0,geo:tmdbGeo(kind,d)};
  o.relDate=d.release_date||d.first_air_date||"";
  if(d.belongs_to_collection)o.coll={id:d.belongs_to_collection.id,name:d.belongs_to_collection.name};
  if(kind==="movie"){o.series=false;o.duration=d.runtime||null}
  else{o.series=true;const ss=(d.seasons||[]).filter(s=>s.season_number>0&&s.episode_count>0).sort((a,b)=>a.season_number-b.season_number);
    o.seasonsTotal=d.number_of_seasons||ss.length||null;o.episodes=d.number_of_episodes||null;o.seasonEpisodes=ss.map(s=>s.episode_count);
    const rt=(d.episode_run_time||[]).filter(Boolean);const lo=Math.min(...rt),hi=Math.max(...rt);
    o.episodeDuration=rt.length?(lo===hi?lo:`${lo}-${hi}`):(d.last_episode_to_air?.runtime||null)}
  return o;
}

/* ============ «Может понравиться»: рекомендации TMDB по нашим лучшим оценкам ============ */
const RECOK="kinoteka.reco.v1";
const RECO={sig:"",st:"idle",list:[],msg:"",seeds:[]};
const recoKey=(t,id)=>t+":"+id;
function recoWho(){return UI.recoWho&&DB.raters.includes(UI.recoWho)?UI.recoWho:null}
function recoSeeds(){
  const who=recoWho();
  return DB.items.filter(i=>i.tmdb&&i.tmdb.id&&(i.status!=="planned"&&i.status!=="proposed")).map(it=>({it,s:itemScore(it,who)}))
    .filter(x=>isNum(x.s)&&x.s>=3.8).sort((a,b)=>b.s-a.s).slice(0,10);
}
function recoHave(){const h=new Set(),t=new Set();for(const i of DB.items){if(i.tmdb)h.add(recoKey(i.tmdb.type,i.tmdb.id));t.add(normT(i.title));if(i.ext?.en)t.add(normT(i.ext.en))}
  for(const k of DB.recoHide||[])h.add(k);return{h,t}}
async function recoLoad(force){
  const seeds=recoSeeds();RECO.seeds=seeds;
  const sig=(apiKey("tmdb")?"k":"-")+(recoWho()||"*")+"|"+seeds.map(x=>x.it.tmdb.type+x.it.tmdb.id+":"+x.s.toFixed(1)).join(",");
  if(!force&&RECO.sig===sig&&RECO.st!=="idle")return;
  RECO.sig=sig;
  if(!apiKey("tmdb")){RECO.st="nokey";recoPaint();return}
  if(!seeds.length){RECO.st="noseed";recoPaint();return}
  if(!force){try{const c=JSON.parse(localStorage.getItem(RECOK)||"null");if(c&&c.sig===sig&&Date.now()-c.at<3*864e5){RECO.raw=c.raw;RECO.st="ok";recoBuild();recoPaint();return}}catch(e){logErr("Кэш рекомендаций (чтение)",e,1)}}
  RECO.st="loading";recoPaint();const my=sig;
  try{
    const raw=[];
    for(const {it,s} of seeds){
      const r=await tmdbGet(`/${it.tmdb.type}/${it.tmdb.id}/recommendations`,{language:"ru-RU",page:1});
      raw.push({from:it.id,s,res:(r.results||[]).slice(0,20).map(x=>({t:x.media_type||it.tmdb.type,id:x.id,title:x.title||x.name,orig:x.original_title||x.original_name,
        y:String(x.release_date||x.first_air_date||"").slice(0,4),p:x.poster_path,v:x.vote_average,vc:x.vote_count,g:x.genre_ids||[],lang:x.original_language,oc:x.origin_country||[],ov:x.overview||""}))});
      if(RECO.sig!==my)return;
    }
    RECO.raw=raw;RECO.st="ok";try{localStorage.setItem(RECOK,JSON.stringify({sig,at:Date.now(),raw}))}catch(e){logErr("Кэш рекомендаций (запись)",e,1)}
    recoBuild();
  }catch(e){if(RECO.sig!==my)return;RECO.st="err";RECO.msg=e.message==="Failed to fetch"?"нет связи с TMDB":e.message}
  recoPaint();
}
/* склейка: чем выше наша оценка источника и чем выше позиция в его рекомендациях, тем больше вес; совпадения по нескольким источникам складываются */
function recoBuild(){
  const {h,t}=recoHave(),M=new Map();
  for(const {from,s,res} of RECO.raw||[]){const w=Math.max(.3,s-3);
    res.forEach((x,rank)=>{const k=recoKey(x.t,x.id);if(h.has(k)||t.has(normT(x.title))||t.has(normT(x.orig)))return;if((x.vc||0)<30)return;
      const m=M.get(k)||{...x,k,score:0,from:[]};m.score+=w*(1-rank/24);if(!m.from.includes(from))m.from.push(from);M.set(k,m)})}
  const L=[...M.values()].map(m=>({...m,score:m.score*(.55+(m.v||0)/20)})).sort((a,b)=>b.score-a.score).slice(0,14);
  const mx=L.length?L[0].score:1;L.forEach(m=>m.pct=Math.round(55+45*m.score/mx));
  RECO.list=L;
}
function recoKind(x){const anim=x.g.includes(16),jp=x.oc.includes("JP")||x.lang==="ja";return x.t==="tv"?(anim?(jp?"аниме":"мультсериал"):"сериал"):(anim?(jp?"аниме":"мультфильм"):"фильм")}
function recoInner(){
  const who=recoWho();
  const head=`<div class="rhead"><h3>Может понравиться</h3>
    <div class="seg sm"><button data-reco-who="" class="${!who?"on":""}">Нам</button>${DB.raters.map(n=>`<button data-reco-who="${esc(n)}" class="${who===n?"on":""}">${esc(n)}</button>`).join("")}</div>
    <div class="sp"></div>${RECO.st==="ok"||RECO.st==="err"?`<button class="btn sm ghost" data-reco-ref title="Обновить подборку">↻</button>`:""}<button class="btn sm ghost" data-reco-tog title="${UI.recoOff?"Развернуть":"Свернуть"}">${UI.recoOff?"▾":"▴"}</button></div>`;
  if(UI.recoOff)return head;
  const seedNames=RECO.seeds.slice(0,4).map(x=>"«"+esc(x.it.title)+"»").join(", ");
  let body="";
  if(RECO.st==="nokey")body=`<p class="rnote">Добавьте ключ TMDB во вкладке <a href="#data">«Данные»</a> — и здесь появятся фильмы и сериалы, похожие на то, что вы оценили выше всего.</p>`;
  else if(RECO.st==="noseed")body=`<p class="rnote">Пока не на что опереться: нужны записи с оценкой от 3.8${who?" у "+esc(who):""}.</p>`;
  else if(RECO.st==="err")body=`<p class="rnote">⚠ Не удалось загрузить: ${esc(RECO.msg)}</p>`;
  else if(RECO.st==="loading"||RECO.st==="idle")body=`<div class="rrow">${Array.from({length:7},()=>`<div class="rc sk"><div class="rp"></div><div class="rb"><i></i><i></i></div></div>`).join("")}</div>`;
  else if(!RECO.list.length)body=`<p class="rnote">Всё похожее уже есть у вас в списке 🙂</p>`;
  else body=`<p class="rnote">По мотивам ${seedNames}${RECO.seeds.length>4?` и ещё ${RECO.seeds.length-4}`:""} · процент — насколько сильно совпадает с вашими любимыми</p>
    <div class="rrow">${RECO.list.map(x=>{const fr=x.from.map(id=>itemById(id)?.title).filter(Boolean);
      return `<div class="rc" title="${esc(x.ov)}">
        <a class="rp" href="https://www.themoviedb.org/${x.t}/${x.id}?language=ru-RU" target="_blank" rel="noopener">${x.p?`<img src="${tmdbImg(x.p,"w342")}" alt="" loading="lazy">`:`<span class="ph0">${esc(initials(x.title))}</span>`}<span class="rpct">${x.pct}%</span></a>
        <div class="rb"><b>${esc(x.title)}</b><span class="dim">${x.y?x.y+" · ":""}${recoKind(x)}${isNum(x.v)&&x.v>0?" · ★ "+x.v.toFixed(1):""}</span>
          <span class="rwhy">похоже на ${fr.slice(0,2).map(t=>"«"+esc(t)+"»").join(", ")}${fr.length>2?" +"+(fr.length-2):""}</span>
          <div class="ract"><button class="btn sm" data-reco-add="${x.k}">＋ В планы</button><button class="btn sm ghost icon" data-reco-hide="${x.k}" title="Не интересно">✕</button></div></div></div>`}).join("")}</div>`;
  return head+body;
}
function recoHTML(){return `<section class="panel reco" id="reco">${recoInner()}</section>`}
function recoPaint(){const el=$("#reco");if(el)el.innerHTML=recoInner()}
async function recoAdd(k){
  const x=RECO.list.find(r=>r.k===k);if(!x)return;
  const [t,id]=k.split(":");toast("Добавляю «"+x.title+"»…");
  try{const it=await tmdbNewItem(t,id);DB.items.push(it);RECO.list=RECO.list.filter(r=>r.k!==k);commit();toast("✓ «"+it.title+"» — в планах")}
  catch(e){toast("⚠ "+(e.message==="Failed to fetch"?"нет связи с TMDB":e.message))}
}
document.addEventListener("click",e=>{
  const b=e.target.closest("[data-reco-add],[data-reco-hide],[data-reco-who],[data-reco-ref],[data-reco-tog]");if(!b||!b.closest("#reco"))return;
  e.preventDefault();
  if(b.dataset.recoAdd){b.disabled=true;recoAdd(b.dataset.recoAdd);return}
  if(b.dataset.recoHide){DB.recoHide=[...new Set([...(DB.recoHide||[]),b.dataset.recoHide])];RECO.list=RECO.list.filter(r=>r.k!==b.dataset.recoHide);save();recoPaint();return}
  if(b.dataset.recoWho!==undefined){UI.recoWho=b.dataset.recoWho;saveUI();recoLoad();return}
  if(b.dataset.recoRef!==undefined){recoLoad(true);return}
  if(b.dataset.recoTog!==undefined){UI.recoOff=!UI.recoOff;saveUI();recoPaint();if(!UI.recoOff)recoLoad()}
});
function recoEnsure(){if(UI.tab!=="catalog"||UI.recoOff)return;if(RECO.st==="ok"){const before=RECO.list.length;recoBuild();if(RECO.list.length!==before)recoPaint()}recoLoad()}
/* постеры для записей с tmdb-id, но без картинки (например, Ван Пис) */
async function fillPosters(silent){
  if(!apiKey("tmdb")||fillPosters.busy)return 0;fillPosters.busy=true;let n=0;
  try{for(const it of DB.items.filter(i=>i.tmdb&&i.tmdb.id&&!i.poster)){
    try{const d=await tmdbGet(`/${it.tmdb.type}/${it.tmdb.id}`,{language:"ru-RU"});const ps=d.poster_path||(await tmdbGet(`/${it.tmdb.type}/${it.tmdb.id}`)).poster_path;
      if(ps&&!it.poster){it.poster=tmdbImg(ps);n++}}catch(e){if(/ключ/.test(e.message))break}}}
  finally{fillPosters.busy=false}
  if(n){commit();if(!silent)toast(`Добавлены постеры: ${n}`)}return n;
}
async function omdbById(imdbId){
  const k=apiKey("omdb");if(!k||!imdbId)return null;
  const r=await (await fetch(`https://www.omdbapi.com/?apikey=${encodeURIComponent(k)}&i=${encodeURIComponent(imdbId)}`)).json();
  if(r.Response!=="True")return null;
  const im=parseFloat(r.imdbRating),mc=parseInt(r.Metascore),rt=(r.Ratings||[]).find(x=>x.Source==="Rotten Tomatoes");
  return {imdb:isFinite(im)?im:null,mc:isFinite(mc)?mc:null,rt:rt?parseInt(rt.Value):null};
}
async function malScore(q){try{const r=await (await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(q)}&limit=1`)).json();const a=r.data&&r.data[0];return a&&isNum(a.score)?a.score:null}catch(e){return null}}
/* подключение к форме «Новая запись / Изменить» */
function bindAutofill(d,isNew,onPick){
  const inp=$("#eTitle",d),box=$("#eFind",d),st=$("#eFindSt",d);let t=null,seq=0,lastQ="",open=false;
  const close=()=>{box.hidden=true;open=false};
  const has=x=>DB.items.find(i=>i.tmdb&&i.tmdb.id===x.id&&i.tmdb.type===x.media_type);
  async function run(q,force){
    q=q.trim();if(q.length<2||(!force&&q===lastQ))return;lastQ=q;
    if(!apiKey("tmdb")){st.innerHTML=`🔎 Чтобы данные подтягивались сами, добавьте ключ TMDB во вкладке <a href="#data" data-close>«Данные»</a>.`;return}
    const my=++seq;st.textContent="🔎 Ищу…";
    try{const R=await tmdbSearch(q);if(my!==seq)return;
      if(!R.length){st.textContent="Ничего не нашлось — можно заполнить вручную";close();return}
      st.textContent="Выберите вариант — остальное заполнится само";
      box.innerHTML=R.map(x=>{const ti=x.title||x.name,or=x.original_title||x.original_name,y=String(x.release_date||x.first_air_date||"").slice(0,4),ex=has(x);
        return `<button type="button" data-tk="${x.media_type}" data-tid="${x.id}">${x.poster_path?`<img src="${tmdbImg(x.poster_path,"w92")}" alt="">`:`<span class="noimg">?</span>`}
          <span><b>${esc(ti)}</b>${y?` <span class="dim">${y}</span>`:""}<br><span class="dim">${or&&or!==ti?esc(or)+" · ":""}${x.media_type==="tv"?"сериал":"фильм"}${isNum(x.vote_average)&&x.vote_count>20?" · ★ "+x.vote_average.toFixed(1):""}</span>${ex?` <span class="tex">уже в списке</span>`:""}</span></button>`}).join("");
      box.hidden=false;open=true;
    }catch(e){if(my===seq){st.textContent="⚠ "+(e.message==="Failed to fetch"?"нет связи с TMDB":e.message);close()}}
  }
  inp.addEventListener("input",()=>{if(!isNew)return;clearTimeout(t);t=setTimeout(()=>run(inp.value),450)});
  inp.addEventListener("keydown",e=>{if(e.key==="Escape"&&open){e.preventDefault();e.stopPropagation();close()}if(e.key==="Enter"){e.preventDefault();clearTimeout(t);run(inp.value,true)}});
  $("#eFindBtn",d).addEventListener("click",()=>{clearTimeout(t);run(inp.value||"",true)});
  d.addEventListener("click",e=>{if(open&&!e.target.closest("#eFind,#eTitle,#eFindBtn"))close()});
  box.addEventListener("click",async e=>{const b=e.target.closest("[data-tid]");if(!b)return;close();
    const kind=b.dataset.tk,id=+b.dataset.tid;
    const ex=DB.items.find(i=>i.tmdb&&i.tmdb.id===id&&i.tmdb.type===kind);
    if(ex&&isNew&&!confirm(`«${ex.title}» уже есть в списке. Всё равно добавить ещё раз?`))return;
    st.textContent="⏳ Загружаю данные…";const my=++seq;
    try{const o=await tmdbDetails(kind,id);if(my!==seq)return;
      const parts=["✓ TMDB"];
      const [om,mal]=await Promise.all([omdbById(o.imdbId).catch(()=>null),o.type==="Аниме"?malScore(o.en||o.title):null]);
      if(om)o.ext=om;if(isNum(mal))o.ext=Object.assign(o.ext||{},{mal});
      if(o.ext){for(const s of WSRC)if(isNum(o.ext[s.k]))parts.push(`${s.s||s.n} ${s.fmt(o.ext[s.k])}`)}
      else if(!apiKey("omdb")&&o.imdbId)parts.push(`<span class="dim">для IMDb/RT/MC добавьте ключ OMDb во вкладке «Данные»</span>`);
      if(isNum(o.tmdbVote))parts.push(`<span class="dim">TMDB ★ ${o.tmdbVote.toFixed(1)}</span>`);
      onPick(o);st.innerHTML=parts.join(" · ");
    }catch(e){if(my===seq)st.textContent="⚠ "+(e.message==="Failed to fetch"?"нет связи с TMDB":e.message)}
  });
}

/* ============ теги ============ */
const allTags=()=>{const m=new Map();DB.items.forEach(i=>(i.tags||[]).forEach(t=>m.set(t,(m.get(t)||0)+1)));return [...m.entries()].sort((a,b)=>b[1]-a[1]||cmpRu(a[0],b[0]))};
const tagChips=(it,max=3)=>(it.tags||[]).length?`<div class="tags">${it.tags.slice(0,max).map(t=>`<span class="tg">#${esc(t)}</span>`).join("")}${it.tags.length>max?`<span class="tg">+${it.tags.length-max}</span>`:""}</div>`:"";
const parseTags=s=>[...new Set(String(s||"").split(/[,#\n]+/).map(t=>t.trim().replace(/\s+/g," ")).filter(Boolean))];

/* ============ время оценок ============ */
const hasAnyR=r=>!!r&&CATS.some(c=>isNum(r[c.k]));
function fmtAt(iso,withTime=true){if(!iso)return"";const d=new Date(iso);if(isNaN(d))return"";return d.toLocaleDateString("ru-RU",{day:"numeric",month:"short",year:"numeric"})+(withTime?", "+d.toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit"}):"")}
function ratedAtLine(R,skip){if(skip||!R)return"";const L=DB.raters.map(n=>R[n]?.at?`${esc(n)} — ${fmtAt(R[n].at)}`:null).filter(Boolean);return L.length?`<p class="dim" style="font-size:12.5px;margin:6px 0 0">🕓 Оценено: ${L.join(" · ")}</p>`:""}

/* ============ мировые оценки ============ */
const WSRC=[
  {k:"imdb",n:"IMDb",f:v=>v/2,fmt:v=>v.toFixed(1),c:"#f5c518"},
  {k:"rt",n:"Rotten Tomatoes",s:"RT",f:v=>v/20,fmt:v=>Math.round(v)+"%",c:"#fa320a"},
  {k:"mc",n:"Metacritic",s:"MC",f:v=>v/20,fmt:v=>String(Math.round(v)),c:"#66cc33"},
  {k:"mal",n:"MyAnimeList",s:"MAL",f:v=>v/2,fmt:v=>v.toFixed(2),c:"#2e51a2"}];
function worldParts(it){const e=it&&it.ext;if(!e)return[];return WSRC.filter(s=>isNum(e[s.k])).map(s=>({...s,raw:e[s.k],v:s.f(e[s.k])}))}
function worldScore(it,src){const P=worldParts(it);if(src&&src!=="all"){const p=P.find(x=>x.k===src);return p?p.v:null}return P.length?avg(P.map(x=>x.v)):null}
function extLine(it){return worldParts(it).map(p=>`${p.s||p.n} ${p.fmt(p.raw)}`).join(" · ")}
function extChip(it){const e=it.ext;if(!e)return"";if(isNum(e.imdb))return `<span class="tag ext" title="${esc(extLine(it))}">IMDb ${e.imdb.toFixed(1)}</span>`;if(isNum(e.mal))return `<span class="tag ext" title="${esc(extLine(it))}">MAL ${e.mal.toFixed(2)}</span>`;if(isNum(e.rt))return `<span class="tag ext" title="${esc(extLine(it))}">RT ${e.rt}%</span>`;return""}
function worldBlock(it,ours){
  const P=worldParts(it);const w=worldScore(it);
  if(!P.length)return it.status==="planned"?"":`<div class="dsec" data-noshot><h4>Мировые оценки</h4><p class="dim" style="font-size:13px;margin:0">Нет данных. Их можно вписать в «✎ Изменить» или подтянуть во вкладке «Данные».</p></div>`;
  const dlt=isNum(ours)&&isNum(w)?ours-w:null;
  return `<div class="dsec"><h4>Мировые оценки</h4><div class="wrow">${P.map(p=>`<div class="wpill" style="--wc:${p.c}"><span>${p.s||p.n}</span><b>${p.fmt(p.raw)}</b></div>`).join("")}
    <div class="wpill tot"><span>Мир (0–5)</span><b>${f1(w)}</b></div>${isNum(dlt)?`<div class="wpill tot"><span>Мы − мир</span><b style="color:${Math.abs(dlt)<.25?"var(--tx)":dlt>0?"var(--ok)":"var(--bad)"}">${dlt>0?"+":""}${f1(dlt)}</b></div>`:""}</div>
    <p class="dim" style="font-size:12px;margin:6px 0 0">Всё приведено к шкале 0–5: IMDb и MAL ÷ 2, RT и Metacritic ÷ 20.${it.kind==="series"&&(isNum(it.ext?.rt)||isNum(it.ext?.mc))?" RT и Metacritic у сериалов — по 1 сезону.":""}${it.ext?.at?" Обновлено "+fmtAt(it.ext.at,false)+".":""}${it.ext?.imdbId?` <a href="https://www.imdb.com/title/${esc(it.ext.imdbId)}/" target="_blank" rel="noopener" data-noshot>IMDb ↗</a>`:""}</p></div>`;
}
function applyWorld(db){
  const titles={};SEED.items.forEach(i=>titles[i.id]=normT(i.title));titles.op1=normT("Ван Пис");
  let n=0;
  for(const [sid,d] of Object.entries(WORLD)){
    const it=db.items.find(i=>i.id===sid&&normT(i.title)===titles[sid])||db.items.find(i=>normT(i.title)===titles[sid]);if(!it)continue;
    it.ext=it.ext||{};let ch=false;
    for(const k of ["en","imdb","rt","mc","mal"])if(d[k]!=null&&(it.ext[k]==null||it.ext[k]==="")){it.ext[k]=d[k];ch=true}
    if(ch){it.ext.src=it.ext.src||"встроено (2026)";n++}
  }
  db.worldApplied=1;return n;
}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function refreshWorld(){
  const key=apiKey("omdb");if(!key){toast("Сначала вставьте ключ OMDb");return}
  if(refreshWorld.busy)return;refreshWorld.busy=true;
  const L=DB.items.filter(i=>i.ext?.imdbId||i.ext?.en);let ok=0,miss=[];
  for(let k=0;k<L.length;k++){const it=L[k];
    toast(`OMDb: ${k+1} из ${L.length} · ${it.title}`);
    try{
      const q=it.ext.imdbId?`i=${encodeURIComponent(it.ext.imdbId)}`:`t=${encodeURIComponent(it.ext.en)}&type=${it.kind==="series"?"series":"movie"}`;
      let r=await (await fetch(`https://www.omdbapi.com/?apikey=${encodeURIComponent(key)}&${q}${!it.ext.imdbId&&it.year?"&y="+it.year:""}`)).json();
      if(r.Response!=="True"&&!it.ext.imdbId&&it.year)r=await (await fetch(`https://www.omdbapi.com/?apikey=${encodeURIComponent(key)}&${q}`)).json();
      if(r.Error&&/invalid api key|limit/i.test(r.Error)){toast("OMDb: "+r.Error);break}
      if(r.Response==="True"){
        const im=parseFloat(r.imdbRating),mc=parseInt(r.Metascore),rt=(r.Ratings||[]).find(x=>x.Source==="Rotten Tomatoes");
        if(isFinite(im))it.ext.imdb=im;if(isFinite(mc))it.ext.mc=mc;if(rt)it.ext.rt=parseInt(rt.Value);
        if(r.imdbID)it.ext.imdbId=r.imdbID;it.ext.at=new Date().toISOString();it.ext.src="OMDb";ok++}
      else miss.push(it.title);
    }catch(e){toast("Сеть недоступна: "+e.message);break}
    await sleep(120);
  }
  refreshWorld.busy=false;commit();toast(`Обновлено: ${ok}${miss.length?` · не найдено: ${miss.length}`:""}`);
  if(miss.length)console.info("OMDb не нашёл:",miss);
}
async function refreshMal(){
  const L=DB.items.filter(i=>i.type==="Аниме"&&(i.ext?.en||i.title));let ok=0;
  for(const it of L){toast(`MyAnimeList: ${it.title}`);
    try{const r=await (await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(it.ext?.en||it.title)}&limit=1`)).json();const a=r.data&&r.data[0];
      if(a&&isNum(a.score)){it.ext=it.ext||{};it.ext.mal=a.score;it.ext.at=new Date().toISOString();ok++}}catch(e){toast("Сеть недоступна: "+e.message);break}
    await sleep(700)}
  commit();toast(`MyAnimeList: обновлено ${ok} из ${L.length}`);
}
function ourEntries(){return DB.items.filter(i=>(i.status!=="planned"&&i.status!=="proposed")).map(it=>({it,o:itemScore(it),per:Object.fromEntries(DB.raters.map(r=>[r,itemScore(it,r)]))})).filter(x=>isNum(x.o))}
function vWorld(){
  const src=UI.wSrc||"all",who=UI.wWho!=="all"&&DB.raters.includes(UI.wWho)?UI.wWho:null;
  const ours=x=>who?x.per[who]:x.o;
  const E=ourEntries();const P=E.map(x=>({...x,u:ours(x),w:worldScore(x.it,src)})).filter(x=>isNum(x.u)&&isNum(x.w));
  const srcBtns=[["all","Сводная"],...WSRC.map(s=>[s.k,s.s||s.n])];
  const head=`<div class="ptitle"><div><h1>Мы и мир</h1><p>Наши оценки против IMDb, Rotten Tomatoes, Metacritic и MyAnimeList · всё в шкале 0–5</p></div>
    <div class="row"><div class="seg" data-ui="wSrc">${srcBtns.map(([k,n])=>`<button data-v="${k}" class="${src===k?"on":""}">${n}</button>`).join("")}</div>
    <div class="seg" data-ui="wWho"><button data-v="all" class="${!who?"on":""}">Мы</button>${DB.raters.map(n=>`<button data-v="${esc(n)}" class="${who===n?"on":""}">${esc(n)}</button>`).join("")}</div></div></div>`;
  if(P.length<3)return head+`<div class="empty">Мало записей, где есть и наша оценка, и ${src==="all"?"мировая":WSRC.find(s=>s.k===src).n}. Выберите другой источник или обновите данные во вкладке «Данные».</div>`;
  const mu=avg(P.map(x=>x.u)),mw=avg(P.map(x=>x.w)),shift=mu-mw;
  P.forEach(x=>{x.d=x.u-x.w;x.rel=x.d-shift});
  const r=pearson(P.map(x=>x.u),P.map(x=>x.w));
  const close=P.filter(x=>Math.abs(x.rel)<=.5).length,pct=Math.round(close/P.length*100);
  const rTxt=r==null?"—":r>=.7?"очень похоже на мир":r>=.45?"в целом совпадаем":r>=.2?"совпадаем слабо":"у нас свой взгляд";
  const perR=DB.raters.map(n=>{const Q=E.map(x=>({u:x.per[n],w:worldScore(x.it,src)})).filter(q=>isNum(q.u)&&isNum(q.w));return{n,k:Q.length,r:pearson(Q.map(q=>q.u),Q.map(q=>q.w)),sh:avg(Q.map(q=>q.u-q.w))}});
  const best=[...perR].filter(x=>x.r!=null).sort((a,b)=>b.r-a.r)[0];
  const cA="var(--acc)",cB="var(--acc2)";
  const up=[...P].sort((a,b)=>b.rel-a.rel).filter(x=>x.rel>.15).slice(0,8),down=[...P].sort((a,b)=>a.rel-b.rel).filter(x=>x.rel<-.15).slice(0,8);
  const row=(x,extra)=>`<div class="r" data-open="${x.it.id}"><div class="mini" style="width:26px;height:38px">${posterHTML(x.it,false)}</div><span class="x">${esc(x.it.title)}</span>${extra}</div>`;
  const pair=x=>`${scBadge(x.u,"sm")}<span class="dim" style="font-size:12px">мир</span><span class="wsc">${f1(x.w)}</span>`;
  const grp=key=>{const m=new Map();P.forEach(x=>(key(x.it)||[]).forEach(g=>{const e=m.get(g)||{g,u:[],w:[]};e.u.push(x.u);e.w.push(x.w);m.set(g,e)}));return [...m.values()].filter(e=>e.u.length>=2).map(e=>({g:e.g,n:e.u.length,u:avg(e.u),w:avg(e.w),rel:avg(e.u)-avg(e.w)-shift})).sort((a,b)=>b.rel-a.rel)};
  const dv=d=>{const w=Math.min(50,Math.abs(d)/1.2*50);return `<div class="dvb"><i style="${d>=0?`left:50%;width:${w}%;background:${cA}`:`right:50%;width:${w}%;background:${cB}`}"></i><b></b></div>`};
  const gt=(L,h)=>L.length?`<div style="overflow-x:auto"><table class="t tt2"><thead><tr><th>${h}</th><th class="c">n</th><th class="c">Мы</th><th class="c">Мир</th><th style="width:34%">Мы ↔ мир</th></tr></thead><tbody>${L.map(x=>`<tr style="cursor:default"><td>${esc(x.g)}</td><td class="c dim">${x.n}</td><td class="c">${scBadge(x.u,"sm")}</td><td class="c"><span class="wsc">${f1(x.w)}</span></td><td>${dv(x.rel)}</td></tr>`).join("")}</tbody></table></div>`:`<p class="dim">Недостаточно данных.</p>`;
  const S={rel:(a,b)=>b.rel-a.rel,title:(a,b)=>cmpRu(a.it.title,b.it.title),w:(a,b)=>b.w-a.w,u:(a,b)=>b.u-a.u};
  const T=[...P].sort(S[UI.wSort]||S.rel);
  const cell=(it,k)=>{const p=worldParts(it).find(x=>x.k===k);return p?`<span style="color:${src===k?"var(--tx)":"var(--tx2)"};font-weight:${src===k?800:600}">${p.fmt(p.raw)}</span>`:`<span class="dim">—</span>`};
  const noData=E.filter(x=>!isNum(worldScore(x.it,src))).length;
  return head+`
  <div class="thero">
    <div class="th-l"><div class="th-n" style="color:${cA}">${who?esc(who):"Мы"}</div><div class="th-avg">${f2(mu)}</div><div class="dim">наша средняя</div></div>
    <div class="th-c"><div class="th-ring" style="--p:${pct}"><b>${pct}%</b></div><div class="th-cap">совпадаем с миром ±0,5<br>(с поправкой на нашу щедрость)</div></div>
    <div class="th-r"><div class="th-n" style="color:${cB}">${src==="all"?"Мир":esc(WSRC.find(s=>s.k===src).n)}</div><div class="th-avg">${f2(mw)}</div><div class="dim">средняя мира</div></div>
    <button class="btn sm ghost shotbtn" data-shot=".thero" data-shot-title="Мы и мир" data-noshot><i class="ico ico-cam"></i></button>
  </div>
  <div class="kpis">
    <div class="kpi"><span>Корреляция</span><b>${r==null?"—":r.toFixed(2).replace(".",",")}</b><em>${rTxt}</em></div>
    <div class="kpi"><span>Мы щедрее мира</span><b>${shift>0?"+":""}${f2(shift).replace(".",",")}</b><em>балла в среднем</em></div>
    <div class="kpi"><span>Ближе к миру</span><b style="font-size:19px">${best?esc(best.n):"—"}</b><em>${perR.map(x=>`${esc(x.n)} r=${x.r==null?"—":x.r.toFixed(2).replace(".",",")}`).join(" · ")}</em></div>
    <div class="kpi"><span>Сравнено</span><b>${P.length}</b><em>${noData?`без мировых данных: ${noData}`:"все записи с данными"}</em></div>
  </div>
  <div class="sgrid">
    <div class="sbox shot"><h3>Карта: мир ↔ мы <button class="btn sm ghost" data-shot=".sbox" data-noshot><i class="ico ico-cam"></i></button></h3><div class="lg" style="margin:-6px 0 8px"><span><i style="background:${cA}"></i>нам нравится больше</span><span><i style="background:${cB}"></i>миру больше</span><span><i style="background:var(--tx2)"></i>совпадаем</span></div>${worldScatter(P,shift,cA,cB,src)}</div>
    <div class="sbox shot"><h3>По источникам <button class="btn sm ghost" data-shot=".sbox" data-noshot><i class="ico ico-cam"></i></button></h3>${WSRC.map(s=>{const Q=E.map(x=>({u:ours(x),w:worldScore(x.it,s.k)})).filter(q=>isNum(q.u)&&isNum(q.w));if(Q.length<3)return"";const rr=pearson(Q.map(q=>q.u),Q.map(q=>q.w));const a=avg(Q.map(q=>q.u)),b=avg(Q.map(q=>q.w));return `<div class="tcat"><div class="tcat-h"><span style="color:${s.c}">● ${s.n}</span><span class="dim">${Q.length} зап. · r = ${rr==null?"—":rr.toFixed(2).replace(".",",")}</span></div>
      <div class="hb" style="margin:3px 0"><span class="dim" style="font-size:12px">${who?esc(who):"Мы"}</span><div class="tr"><i style="width:${a/5*100}%;background:${cA}"></i></div><b>${f2(a)}</b></div>
      <div class="hb" style="margin:3px 0"><span class="dim" style="font-size:12px">${s.s||s.n}</span><div class="tr"><i style="width:${b/5*100}%;background:${s.c}"></i></div><b>${f2(b)}</b></div></div>`}).join("")}
      <p class="dim" style="font-size:12.5px;margin:10px 0 0">r — насколько порядок наших оценок совпадает с порядком у источника (1 — идеально, 0 — никак).</p></div>
    <div class="sbox shot"><h3>Нам нравится больше, чем миру <button class="btn sm ghost" data-shot=".sbox" data-noshot><i class="ico ico-cam"></i></button></h3><div class="lst">${up.map(x=>row(x,`<span class="dim" style="font-size:12px">+${f1(x.rel)}</span>${pair(x)}`)).join("")||`<p class="dim">Таких нет</p>`}</div></div>
    <div class="sbox shot"><h3>Миру нравится больше, чем нам <button class="btn sm ghost" data-shot=".sbox" data-noshot><i class="ico ico-cam"></i></button></h3><div class="lst">${down.map(x=>row(x,`<span class="dim" style="font-size:12px">${f1(x.rel)}</span>${pair(x)}`)).join("")||`<p class="dim">Таких нет</p>`}</div></div>
    <div class="sbox shot"><h3>По типам <button class="btn sm ghost" data-shot=".sbox" data-noshot><i class="ico ico-cam"></i></button></h3>${gt(grp(it=>[it.type]),"Тип")}</div>
    <div class="sbox shot"><h3>По жанрам <button class="btn sm ghost" data-shot=".sbox" data-noshot><i class="ico ico-cam"></i></button></h3>${gt(grp(it=>it.genres).slice(0,12),"Жанр")}</div>
  </div>
  <p class="dim" style="font-size:12.5px;margin:14px 0 18px">«Больше/меньше, чем миру» считается с поправкой на общий сдвиг: мы в среднем ставим на ${f2(Math.abs(shift)).replace(".",",")} ${shift>=0?"выше":"ниже"}, поэтому сравниваем не сырые числа, а то, насколько запись выделяется у нас и у мира.</p>
  <div class="toolbar"><h3 style="font-size:16px">Все записи</h3><div class="sp"></div><select class="inp" data-uis="wSort">${[["rel","По расхождению"],["u","По нашей оценке"],["w","По мировой оценке"],["title","По названию"]].map(([k,n])=>`<option value="${k}" ${(UI.wSort||"rel")===k?"selected":""}>${n}</option>`).join("")}</select><button class="btn sm" data-shot="#wtbl" data-shot-title="Мы и мир"><i class="ico ico-cam"></i></button></div>
  <div id="wtbl" class="tbl-wrap"><table class="t"><thead><tr><th>Название</th><th class="c">${who?esc(who):"Мы"}</th>${WSRC.map(s=>`<th class="c">${s.s||s.n}</th>`).join("")}<th class="c">Мир</th><th class="c" title="С поправкой на общий сдвиг">Δ</th></tr></thead><tbody>
    ${T.map(x=>`<tr data-open="${x.it.id}"><td><div class="tt"><div class="mini">${posterHTML(x.it,false)}</div><div><b>${esc(x.it.title)}</b>${x.it.ext?.en?`<div class="gen">${esc(x.it.ext.en)}</div>`:""}</div></div></td><td class="c">${scBadge(x.u,"sm")}</td>${WSRC.map(s=>`<td class="c">${cell(x.it,s.k)}</td>`).join("")}<td class="c"><span class="wsc">${f1(x.w)}</span></td><td class="c" style="font-weight:800;color:${Math.abs(x.rel)<.25?"var(--tx2)":x.rel>0?"var(--ok)":"var(--bad)"}">${x.rel>0?"+":""}${f1(x.rel)}</td></tr>`).join("")}
  </tbody></table></div>`;
}
function worldScatter(P,shift,cA,cB,src){
  const S=420,p=40,lo=Math.max(0,Math.floor(Math.min(...P.map(x=>Math.min(x.u,x.w)))*2)/2-.5),hi=5;
  const sx=v=>p+(v-lo)/(hi-lo)*(S-2*p),sy=v=>S-p-(v-lo)/(hi-lo)*(S-2*p);
  let o="";for(let v=Math.ceil(lo);v<=hi;v++)o+=`<line x1="${sx(v)}" y1="${p}" x2="${sx(v)}" y2="${S-p}" stroke="var(--line)"/><line x1="${p}" y1="${sy(v)}" x2="${S-p}" y2="${sy(v)}" stroke="var(--line)"/><text x="${sx(v)}" y="${S-p+16}" font-size="11" fill="var(--tx3)" text-anchor="middle">${v}</text><text x="${p-8}" y="${sy(v)+4}" font-size="11" fill="var(--tx3)" text-anchor="end">${v}</text>`;
  o+=`<line x1="${sx(lo)}" y1="${sy(lo)}" x2="${sx(hi)}" y2="${sy(hi)}" stroke="var(--tx3)" stroke-dasharray="4 4"/>`;
  const a=Math.max(lo,lo-shift),b=Math.min(hi,hi-shift);
  o+=`<line x1="${sx(a)}" y1="${sy(a+shift)}" x2="${sx(b)}" y2="${sy(b+shift)}" stroke="var(--acc)" stroke-opacity=".55" stroke-width="2"/>`;
  o+=`<text x="${S/2}" y="${S-6}" font-size="12" fill="var(--tx2)" text-anchor="middle">${src==="all"?"мир":esc(WSRC.find(s=>s.k===src).n)} →</text><text x="12" y="${S/2}" font-size="12" fill="var(--tx2)" text-anchor="middle" transform="rotate(-90 12 ${S/2})">мы →</text>`;
  const jit=x=>(hashStr(x.it.id)%7-3)*0.012;
  o+=P.map(x=>`<circle cx="${sx(x.w+jit(x)).toFixed(1)}" cy="${sy(x.u-jit(x)).toFixed(1)}" r="5.5" fill="${Math.abs(x.rel)<.25?"var(--tx2)":x.rel>0?cA:cB}" fill-opacity=".85" stroke="var(--card)" stroke-width="1.5" data-open="${x.it.id}" style="cursor:pointer"><title>${esc(x.it.title)}: мы ${f1(x.u)}, мир ${f1(x.w)}</title></circle>`).join("");
  return `<svg viewBox="0 0 ${S} ${S}" style="width:100%;max-width:440px;display:block;margin:0 auto">${o}</svg><p class="dim" style="font-size:12.5px;margin:6px 0 0;text-align:center">Пунктир — одинаковые оценки. Оранжевая линия — «как мир, но с нашей щедростью».</p>`;
}

/* ============ теги записи ============ */
function openItemTags(id){
  const it=itemById(id);if(!it)return;
  const d=showDlg(`<div class="dh"><h2>Теги</h2><button class="btn icon ghost" data-close>✕</button></div>
  <div class="db"><p class="muted" style="margin:0 0 10px">${esc(it.title)}</p>
   <div class="form"><div class="f s6"><label>Теги (через запятую)</label><input class="inp" id="iT" value="${esc((it.tags||[]).join(", "))}" placeholder="напр. Нолан, пересмотреть"><div class="chips" id="iTQ" style="margin-top:4px">${allTags().slice(0,24).map(([t])=>`<button type="button" class="chip" data-t="${esc(t)}" style="padding:3px 9px;font-size:12px">#${esc(t)}</button>`).join("")}</div></div></div></div>
  <div class="df"><div class="sp"></div><button class="btn" data-close>Отмена</button><button class="btn pri" id="iOk">Сохранить</button></div>`);
  $("#iTQ",d).onclick=e=>{const b=e.target.closest("[data-t]");if(!b)return;const cur=parseTags($("#iT",d).value);if(!cur.includes(b.dataset.t))cur.push(b.dataset.t);$("#iT",d).value=cur.join(", ")};
  $("#iOk",d).onclick=()=>{it.tags=parseTags($("#iT",d).value);closeDlg();commit();toast("Сохранено")};
}

/* ============ Вкусы ============ */
function pearson(xs,ys){const n=xs.length;if(n<3)return null;const mx=avg(xs),my=avg(ys);let a=0,b=0,c=0;for(let i=0;i<n;i++){const dx=xs[i]-mx,dy=ys[i]-my;a+=dx*dy;b+=dx*dx;c+=dy*dy}return b&&c?a/Math.sqrt(b*c):null}
function vTaste(){
  const R=DB.raters;
  if(R.length<2)return `<div class="ptitle"><div><h1>Вкусы</h1></div></div><div class="empty">Для сравнения нужны минимум два оценщика.</div>`;
  let A=UI.tA&&R.includes(UI.tA)?UI.tA:R[0],B=UI.tB&&R.includes(UI.tB)&&UI.tB!==A?UI.tB:R.find(r=>r!==A);
  const W=DB.items.filter(i=>(i.status!=="planned"&&i.status!=="proposed"));
  const P=W.map(it=>({it,a:itemScore(it,A),b:itemScore(it,B)})).filter(x=>isNum(x.a)&&isNum(x.b)).map(x=>({...x,d:x.a-x.b}));
  if(P.length<2)return `<div class="ptitle"><div><h1>Вкусы</h1></div></div><div class="empty">Мало общих оценок для сравнения.</div>`;
  const ad=avg(P.map(x=>Math.abs(x.d))),md=avg(P.map(x=>x.d)),r=pearson(P.map(x=>x.a),P.map(x=>x.b));
  const close=P.filter(x=>Math.abs(x.d)<=0.5).length,same=P.filter(x=>Math.abs(x.d)<0.05).length;
  const pct=Math.round(close/P.length*100);
  const rTxt=r==null?"—":r>=.7?"очень похожие вкусы":r>=.4?"похожие вкусы":r>=.15?"вкусы немного похожи":"вкусы заметно разные";
  const harsh=Math.abs(md)<0.05?"Ставите в среднем одинаково":`${esc(md>0?A:B)} в среднем ставит на ${f2(Math.abs(md)).replace(".",",")} выше`;
  const cA="var(--acc)",cB="var(--acc2)";
  const cats=CATS.map(c=>{const pa=[],pb=[];W.forEach(it=>{const x=itemCats(it,A)[c.k],y=itemCats(it,B)[c.k];if(isNum(x)&&isNum(y)){pa.push(x);pb.push(y)}});return{c,a:avg(pa),b:avg(pb),ad:avg(pa.map((v,i)=>Math.abs(v-pb[i]))),n:pa.length}});
  const grp=key=>{const m=new Map();P.forEach(x=>(key(x.it)||[]).forEach(g=>{const e=m.get(g)||{g,a:[],b:[]};e.a.push(x.a);e.b.push(x.b);m.set(g,e)}));return [...m.values()].filter(e=>e.a.length>=2).map(e=>({g:e.g,n:e.a.length,a:avg(e.a),b:avg(e.b),d:avg(e.a)-avg(e.b)})).sort((x,y)=>Math.abs(y.d)-Math.abs(x.d))};
  const genres=grp(it=>it.genres),types=grp(it=>[it.type]);
  const mA=[...P].filter(x=>x.d>0.04).sort((x,y)=>y.d-x.d).slice(0,6),mB=[...P].filter(x=>x.d<-0.04).sort((x,y)=>x.d-y.d).slice(0,6);
  const love=P.filter(x=>x.a>=4.7&&x.b>=4.7).sort((x,y)=>(y.a+y.b)-(x.a+x.b)),meh=P.filter(x=>x.a<=3.2&&x.b<=3.2).sort((x,y)=>(x.a+x.b)-(y.a+y.b));
  const row=(x,extra)=>`<div class="r" data-open="${x.it.id}"><div class="mini" style="width:26px;height:38px">${posterHTML(x.it,false)}</div><span class="x">${esc(x.it.title)}</span>${extra}</div>`;
  const pair=x=>`${scBadge(x.a,"sm")}<span class="dim">:</span>${scBadge(x.b,"sm")}`;
  const div=(a,b)=>{const d=(a??0)-(b??0),w=Math.min(50,Math.abs(d)/1.5*50);return `<div class="dvb"><i style="${d>=0?`left:50%;width:${w}%;background:${cA}`:`right:50%;width:${w}%;background:${cB}`}"></i><b></b></div>`};
  const gtable=(L,head)=>L.length?`<div style="overflow-x:auto"><table class="t tt2"><thead><tr><th>${head}</th><th class="c">n</th><th class="c">${esc(A)}</th><th class="c">${esc(B)}</th><th style="width:30%">Кому больше</th></tr></thead><tbody>${L.map(x=>`<tr style="cursor:default"><td>${esc(x.g)}</td><td class="c dim">${x.n}</td><td class="c">${scBadge(x.a,"sm")}</td><td class="c">${scBadge(x.b,"sm")}</td><td>${div(x.a,x.b)}</td></tr>`).join("")}</tbody></table></div>`:`<p class="dim">Недостаточно данных.</p>`;
  return `<div class="ptitle"><div><h1>Вкусы</h1><p>Насколько совпадают оценки · ${P.length} общих ${plural(P.length,"запись","записи","записей")}</p></div>
    ${R.length>2?`<div class="row"><select class="inp" data-uis="tA">${R.map(n=>`<option ${n===A?"selected":""}>${esc(n)}</option>`).join("")}</select><span class="dim">и</span><select class="inp" data-uis="tB">${R.filter(n=>n!==A).map(n=>`<option ${n===B?"selected":""}>${esc(n)}</option>`).join("")}</select></div>`:""}</div>
  <div class="thero shot" style="--ta:${"var(--acc)"};--tb:${"var(--acc2)"}">
    <div class="th-l"><div class="th-n" style="color:${cA}">${esc(A)}</div><div class="th-avg">${f2(avg(P.map(x=>x.a)))}</div><div class="dim">средняя</div></div>
    <div class="th-c"><div class="th-ring" style="--p:${pct}"><b>${pct}%</b></div><div class="th-cap">оценки отличаются<br>не больше чем на 0,5</div></div>
    <div class="th-r"><div class="th-n" style="color:${cB}">${esc(B)}</div><div class="th-avg">${f2(avg(P.map(x=>x.b)))}</div><div class="dim">средняя</div></div>
    <button class="btn sm ghost shotbtn" data-shot=".thero" data-shot-title="Вкусы: ${esc(A)} и ${esc(B)}" data-noshot><i class="ico ico-cam"></i></button>
  </div>
  <div class="kpis">
    <div class="kpi"><span>Корреляция</span><b>${r==null?"—":r.toFixed(2).replace(".",",")}</b><em>${rTxt}</em></div>
    <div class="kpi"><span>Средняя разница</span><b>${f2(ad).replace(".",",")}</b><em>балла на запись</em></div>
    <div class="kpi"><span>Полных совпадений</span><b>${same}</b><em>из ${P.length}</em></div>
    <div class="kpi"><span>Кто щедрее</span><b style="font-size:17px;line-height:1.3">${harsh}</b></div>
  </div>
  <div class="sgrid">
    <div class="sbox shot"><h3>Карта оценок <span class="row" style="gap:6px"><span class="lg"><span><i style="background:${cA}"></i>${esc(A)} выше</span><span><i style="background:${cB}"></i>${esc(B)} выше</span></span><button class="btn sm ghost" data-shot=".sbox" data-noshot><i class="ico ico-cam"></i></button></span></h3>${tasteScatter(P,A,B,cA,cB)}</div>
    <div class="sbox shot"><h3>По категориям <button class="btn sm ghost" data-shot=".sbox" data-noshot><i class="ico ico-cam"></i></button></h3>
      ${cats.map(x=>`<div class="tcat"><div class="tcat-h"><span>${x.c.ic} ${x.c.n}</span><span class="dim">расхождение ${f2(x.ad).replace(".",",")}</span></div>
        <div class="hb" style="margin:3px 0"><span class="dim" style="font-size:12px">${esc(A)}</span><div class="tr"><i style="width:${(x.a||0)/5*100}%;background:${cA}"></i></div><b>${f2(x.a)}</b></div>
        <div class="hb" style="margin:3px 0"><span class="dim" style="font-size:12px">${esc(B)}</span><div class="tr"><i style="width:${(x.b||0)/5*100}%;background:${cB}"></i></div><b>${f2(x.b)}</b></div></div>`).join("")}
      <p class="dim" style="font-size:12.5px;margin:10px 0 0">Сильнее всего расходитесь в категории «${[...cats].sort((x,y)=>(y.ad||0)-(x.ad||0))[0].c.n}», меньше всего — «${[...cats].sort((x,y)=>(x.ad||9)-(y.ad||9))[0].c.n}».</p></div>
    <div class="sbox shot"><h3>По жанрам <button class="btn sm ghost" data-shot=".sbox" data-noshot><i class="ico ico-cam"></i></button></h3>${gtable(genres.slice(0,12),"Жанр")}</div>
    <div class="sbox shot"><h3>По типам <button class="btn sm ghost" data-shot=".sbox" data-noshot><i class="ico ico-cam"></i></button></h3>${gtable(types,"Тип")}</div>
    <div class="sbox shot"><h3>${esc(A)} ставит выше <button class="btn sm ghost" data-shot=".sbox" data-noshot><i class="ico ico-cam"></i></button></h3><div class="lst">${mA.map(x=>row(x,`<span class="dim" style="font-size:12px">+${f1(x.d)}</span>${pair(x)}`)).join("")||`<p class="dim">Нет таких</p>`}</div></div>
    <div class="sbox shot"><h3>${esc(B)} ставит выше <button class="btn sm ghost" data-shot=".sbox" data-noshot><i class="ico ico-cam"></i></button></h3><div class="lst">${mB.map(x=>row(x,`<span class="dim" style="font-size:12px">+${f1(-x.d)}</span>${pair(x)}`)).join("")||`<p class="dim">Нет таких</p>`}</div></div>
    <div class="sbox shot"><h3>Любим оба <button class="btn sm ghost" data-shot=".sbox" data-noshot><i class="ico ico-cam"></i></button></h3><div class="lst">${love.slice(0,8).map(x=>row(x,pair(x))).join("")||`<p class="dim">Нет записей, где оба поставили 4,7+</p>`}</div></div>
    <div class="sbox shot"><h3>Не зашло обоим <button class="btn sm ghost" data-shot=".sbox" data-noshot><i class="ico ico-cam"></i></button></h3><div class="lst">${meh.slice(0,8).map(x=>row(x,pair(x))).join("")||`<p class="dim">Нет записей, где оба поставили 3,2 и ниже</p>`}</div></div>
  </div>`;
}
function tasteScatter(P,A,B,cA,cB){
  const S=420,p=40,lo=Math.max(0,Math.floor(Math.min(...P.map(x=>Math.min(x.a,x.b)))*2)/2-0.5),hi=5;
  const s=v=>p+(v-lo)/(hi-lo)*(S-2*p),sy=v=>S-p-(v-lo)/(hi-lo)*(S-2*p);
  let o="";for(let v=Math.ceil(lo);v<=hi;v++)o+=`<line x1="${s(v)}" y1="${p}" x2="${s(v)}" y2="${S-p}" stroke="var(--line)"/><line x1="${p}" y1="${sy(v)}" x2="${S-p}" y2="${sy(v)}" stroke="var(--line)"/><text x="${s(v)}" y="${S-p+16}" font-size="11" fill="var(--tx3)" text-anchor="middle">${v}</text><text x="${p-8}" y="${sy(v)+4}" font-size="11" fill="var(--tx3)" text-anchor="end">${v}</text>`;
  o+=`<polygon points="${s(lo)},${sy(lo+.5)} ${s(hi-.5)},${sy(hi)} ${s(hi)},${sy(hi)} ${s(hi)},${sy(hi-.5)} ${s(lo+.5)},${sy(lo)} ${s(lo)},${sy(lo)}" fill="var(--tx)" fill-opacity=".05"/>`;
  o+=`<line x1="${s(lo)}" y1="${sy(lo)}" x2="${s(hi)}" y2="${sy(hi)}" stroke="var(--tx3)" stroke-dasharray="4 4"/>`;
  o+=`<text x="${S/2}" y="${S-6}" font-size="12" fill="var(--tx2)" text-anchor="middle">${esc(A)} →</text><text x="12" y="${S/2}" font-size="12" fill="var(--tx2)" text-anchor="middle" transform="rotate(-90 12 ${S/2})">${esc(B)} →</text>`;
  const jit=x=>(hashStr(x.it.id)%7-3)*0.012;
  o+=P.map(x=>`<circle cx="${s(x.a+jit(x)).toFixed(1)}" cy="${sy(x.b-jit(x)).toFixed(1)}" r="5.5" fill="${Math.abs(x.d)<0.05?"var(--tx2)":x.d>0?cA:cB}" fill-opacity=".85" stroke="var(--card)" stroke-width="1.5" data-open="${x.it.id}" style="cursor:pointer"><title>${esc(x.it.title)}: ${esc(A)} ${f1(x.a)}, ${esc(B)} ${f1(x.b)}</title></circle>`).join("");
  return `<svg viewBox="0 0 ${S} ${S}" style="width:100%;max-width:440px;display:block;margin:0 auto">${o}</svg><p class="dim" style="font-size:12.5px;margin:6px 0 0;text-align:center">Каждая точка — запись. На диагонали — одинаковые оценки, светлая полоса — разница до 0,5.</p>`;
}

/* ============ Снимки: копирование блоков как картинки ============ */
const SHOT_DEF={};
function shotDefaults(tag){
  if(SHOT_DEF[tag])return SHOT_DEF[tag];
  let fr=document.getElementById("shotFrame");
  if(!fr){fr=document.createElement("iframe");fr.id="shotFrame";fr.style.cssText="position:fixed;left:-9999px;top:0;width:10px;height:10px;border:0;visibility:hidden";document.body.appendChild(fr)}
  const doc=fr.contentDocument;const el=doc.createElementNS(tag==="svg"||/^(circle|line|polyline|polygon|path|text|rect|g|tspan|title|defs|lineargradient|stop)$/i.test(tag)?"http://www.w3.org/2000/svg":"http://www.w3.org/1999/xhtml",tag);
  doc.body.appendChild(el);const cs=fr.contentWindow.getComputedStyle(el);const o={};for(let i=0;i<cs.length;i++)o[cs[i]]=cs.getPropertyValue(cs[i]);el.remove();
  return SHOT_DEF[tag]=o;
}
function shotStyle(cs,tag){
  const def=shotDefaults(tag);let s="";
  for(let i=0;i<cs.length;i++){const p=cs[i];if(p.startsWith("animation")||p.startsWith("transition"))continue;const v=cs.getPropertyValue(p);if(v!==def[p])s+=`${p}:${v};`}
  return s;
}
const _imgCache=new Map();
function inlineImg(u){if(!_imgCache.has(u))_imgCache.set(u,(async()=>{try{const ac=new AbortController();const tm=setTimeout(()=>ac.abort(),6000);const b=await (await fetch(u,{signal:ac.signal})).blob();clearTimeout(tm);
  return await new Promise(res=>{const fr=new FileReader();fr.onload=()=>res(fr.result);fr.onerror=()=>res(null);fr.readAsDataURL(b)})}catch(e){return null}})());return _imgCache.get(u)}
async function nodeToCanvas(node){node.classList.add("shotting");try{return await nodeToCanvas0(node)}finally{node.classList.remove("shotting")}}
async function nodeToCanvas0(node){
  const W=Math.ceil(node.scrollWidth),H=Math.ceil(node.scrollHeight);
  const clone=node.cloneNode(true);
  const src=[node,...node.querySelectorAll("*")],dst=[clone,...clone.querySelectorAll("*")];
  const rm=[],pend=[];
  for(let i=0;i<src.length;i++){
    const s=src[i],d=dst[i];
    if(s.hasAttribute("data-noshot")){rm.push(d);continue}
    const tag=s.tagName.toLowerCase();
    d.setAttribute("style",shotStyle(getComputedStyle(s),tag)+"animation:none;transition:none;");
    if(tag==="img"&&!/^data:/.test(s.getAttribute("src")||"")){const u=s.currentSrc||s.src;d.removeAttribute("src");d.removeAttribute("srcset");if(/^https?:/.test(u))pend.push(inlineImg(u).then(x=>{if(x)d.setAttribute("src",x)}))}
    if(tag==="input"||tag==="textarea")d.setAttribute("value",s.value);
    for(const pe of ["::before","::after"]){const pc=getComputedStyle(s,pe);const ct=pc.content;if(ct&&ct!=="none"&&ct!=="normal"){const sp=document.createElement("span");sp.setAttribute("style",shotStyle(pc,"span"));sp.textContent=ct.replace(/^["']|["']$/g,"");pe==="::before"?d.insertBefore(sp,d.firstChild):d.appendChild(sp)}}
  }
  rm.forEach(e=>e.remove());
  await Promise.all(pend);
  clone.style.margin="0";clone.style.transform="none";
  const fonts=[...document.querySelectorAll("style")].map(x=>(x.textContent.match(/@font-face\{[^}]*\}/g)||[]).join("")).join("");
  const wrap=`<div xmlns="http://www.w3.org/1999/xhtml" style="width:${W}px;height:${H}px"><style>${fonts}</style>${new XMLSerializer().serializeToString(clone)}</div>`;
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><foreignObject x="0" y="0" width="100%" height="100%">${wrap}</foreignObject></svg>`;
  const img=new Image();
  await new Promise((res,rej)=>{img.onload=res;img.onerror=()=>rej(new Error("не удалось отрисовать"));img.src="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(svg)});
  return {img,W,H};
}
async function shotBlob(node,title){
  const {img,W,H}=await nodeToCanvas(node);
  const K=2,P=28,cs=getComputedStyle(document.documentElement),bg=cs.getPropertyValue("--bg").trim()||"#0c0d12",tx=cs.getPropertyValue("--tx").trim()||"#eee",tx3=cs.getPropertyValue("--tx3").trim()||"#888";
  const font=getComputedStyle(document.body).fontFamily;
  const th=title?40:0,fh=34,cw=W+P*2,ch=H+P*2+th+fh;
  const c=document.createElement("canvas");c.width=cw*K;c.height=ch*K;const x=c.getContext("2d");x.scale(K,K);
  x.fillStyle=bg;x.fillRect(0,0,cw,ch);
  const g=x.createRadialGradient(cw*.9,0,0,cw*.9,0,cw*.7);g.addColorStop(0,"rgba(139,123,255,.16)");g.addColorStop(1,"rgba(139,123,255,0)");x.fillStyle=g;x.fillRect(0,0,cw,ch);
  if(title){x.fillStyle=tx;x.font=`700 22px ${font}`;x.textBaseline="top";x.fillText(title,P,P)}
  x.drawImage(img,P,P+th,W,H);
  x.fillStyle=tx3;x.font=`600 13px ${font}`;x.textBaseline="middle";x.fillText("🦊 Лисьи оценки · "+new Date().toLocaleDateString("ru-RU"),P,ch-fh/2-6);
  return await new Promise((res,rej)=>c.toBlob(b=>b?res(b):rej(new Error("не удалось создать PNG")),"image/png"));
}
async function doShot(node,title,name){
  const p=shotBlob(node,title);
  try{
    if(!navigator.clipboard||!window.ClipboardItem)throw new Error("no clipboard");
    await navigator.clipboard.write([new ClipboardItem({"image/png":p})]);
    toast("Картинка скопирована — вставьте её в чат (Ctrl+V)");
  }catch(e){
    try{const b=await p;const f=new File([b],(name||"lisi-ocenki")+".png",{type:"image/png"});
      if(navigator.canShare&&navigator.canShare({files:[f]})){await navigator.share({files:[f]});return}
      const a=document.createElement("a");a.href=URL.createObjectURL(b);a.download=f.name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},800);toast("Буфер обмена недоступен — картинка скачана");
    }catch(e2){toast("Не удалось сделать картинку: "+(e2.message||e2))}
  }
}
document.addEventListener("click",e=>{
  const b=e.target.closest("[data-shot]");if(!b)return;
  e.preventDefault();e.stopPropagation();
  const sel=b.dataset.shot,node=sel.startsWith("#")?document.querySelector(sel):b.closest(sel);
  if(!node){toast("Нечего копировать");return}
  lazyFlush(node);doShot(node,b.dataset.shotTitle||"",b.dataset.shotName);
},true);

/* ============ темы: встроенные (CSS), готовые наборы и свои темы ============
   Встроенные темы описаны в CSS через :root[data-theme="…"].
   Остальные получаются из трёх цветов (фон, акцент, второй акцент) + режима «светлая/тёмная»:
   themeVars() строит полный набор переменных и кладёт их прямо в <html style>.
   UI.theme: "dark" | … | id готовой темы (GEN_THEMES) | "c:<id>" (своя, UI.customThemes). */
const THEMES=["dark","light","warm","ocean","forest","glass","neon"];
const THEME_IC={"dark":"🌑","light":"☀","warm":"🦊","ocean":"🌊","forest":"🌲","glass":"💎","neon":"✨"};
const THEME_NAME={"dark":"Тёмная","light":"Светлая","warm":"Тёплая","ocean":"Океан","forest":"Лес","glass":"Стекло","neon":"Неон"};
const THEME_DOT={"dark":"#ff9448","light":"#d85f16","warm":"#cf8a2e","ocean":"#56c8d8","forest":"#6dbba1","glass":"#a8c0f0","neon":"#c77dff"};
const THEME_META={"dark":"#11181c","light":"#eef1f2","warm":"#100e0b","ocean":"#0a1620","forest":"#0c1410","glass":"#10121a","neon":"#0e0a18"};
const GEN_THEMES={
  cinema:{n:"Кинозал",ic:"🎭",bg:"#18080d",acc:"#e2b24c",acc2:"#c8403a",light:false},
  film:{n:"Ретро-плёнка",ic:"🎞",bg:"#17130e",acc:"#dba75f",acc2:"#8fae7a",light:false},
  sunset:{n:"Закат",ic:"🌇",bg:"#1a1020",acc:"#ff8f5a",acc2:"#e65aa5",light:false},
  midnight:{n:"Полночь",ic:"🌌",bg:"#070b1a",acc:"#6f8dff",acc2:"#37d6c4",light:false},
  sakura:{n:"Сакура",ic:"🌸",bg:"#fbf0f3",acc:"#c4547c",acc2:"#6fa58a",light:true},
  paper:{n:"Бумага",ic:"📜",bg:"#f4efe4",acc:"#a8642a",acc2:"#4f7f6a",light:true}
};
/* --- цвета --- */
const thRGB=c=>{c=String(c||"#000000").replace("#","");if(c.length===3)c=[...c].map(x=>x+x).join("");return[0,2,4].map(i=>parseInt(c.slice(i,i+2),16)||0)};
const thHex=a=>"#"+a.map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,"0")).join("");
const thMix=(a,b,t)=>{const A=thRGB(a),B=thRGB(b);return thHex(A.map((v,i)=>v+(B[i]-v)*t))};
const thRgba=(c,a)=>{const[r,g,b]=thRGB(c);return `rgba(${r},${g},${b},${a})`};
const thLum=c=>{const[r,g,b]=thRGB(c).map(v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)});return .2126*r+.7152*g+.0722*b};
function themeVars(t){
  const L=!!t.light,bg=t.bg,acc=t.acc,acc2=t.acc2||t.acc;
  const tx=L?thMix(bg,"#000000",.9):thMix(bg,"#ffffff",.9);
  const bg2=L?thMix(bg,tx,.05):thMix(bg,tx,.045);
  const card=L?thMix(bg,"#ffffff",.72):thMix(bg,tx,.085);
  const card2=L?thMix(bg,"#ffffff",.4):thMix(bg,tx,.13);
  const line=thMix(bg,tx,L?.14:.17),line2=thMix(bg,tx,L?.23:.27);
  const v={"--bg":bg,"--bg2":bg2,"--card":card,"--card2":card2,"--line":line,"--line2":line2,
    "--tx":tx,"--tx2":thMix(tx,bg,.42),"--tx3":thMix(tx,bg,.66),"--acc":acc,"--acc2":acc2,
    "--accTx":thLum(acc)>.38?"#15120e":"#ffffff",
    "--fox1":acc,"--fox2":thMix(acc,"#000000",.28),"--foxEar":thMix(acc,bg,.62),"--foxBelly":L?"#ffffff":tx,"--foxEye":L?"#16181d":bg,
    "--sh":L?"0 6px 20px rgba(20,22,30,.08)":"0 8px 28px rgba(0,0,0,.5)",
    "--card-g":thRgba(card,L?.75:.55),"--bg2-g":thRgba(bg2,L?.8:.65),"--bg2-gd":thRgba(bg2,L?.88:.78),"--bg2-gdh":thRgba(bg2,L?.72:.72),
    "--card-g2":thRgba(card,L?.5:.5),"--card-gk":thRgba(card,L?.45:.45),"--card-gs":thRgba(card,L?.4:.4),"--card-ge":thRgba(card,.25),"--card2-g":thRgba(card2,.5),
    "color-scheme":L?"light":"dark"};
  return v;
}
function themeDef(id){
  if(GEN_THEMES[id])return GEN_THEMES[id];
  if(typeof id==="string"&&id.startsWith("c:"))return(UI.customThemes||[]).find(t=>"c:"+t.id===id)||null;
  return null;
}
function themeName(id){const g=themeDef(id);return g?g.n:(THEME_NAME[id]||"Тёмная")}
function themeDot(id){const g=themeDef(id);return g?g.acc:(THEME_DOT[id]||THEME_DOT.dark)}
function themeIcon(id){const g=themeDef(id);return g?(g.ic||"🎨"):(THEME_IC[id]||"🎨")}
function applyTheme(){
  const root=document.documentElement,st=root.style;
  (applyTheme.keys||[]).forEach(k=>st.removeProperty(k));applyTheme.keys=[];
  let id=UI.theme;const g=themeDef(id);
  if(g){
    const v=themeVars(g);for(const k in v){st.setProperty(k,v[k]);applyTheme.keys.push(k)}
    root.dataset.theme=g.light?"light":"dark";root.dataset.skin=id;
    $("#themeColor")?.setAttribute("content",g.bg);
  }else{
    if(!THEMES.includes(id))id="dark";
    root.dataset.theme=id;delete root.dataset.skin;
    $("#themeColor")?.setAttribute("content",THEME_META[id]||"#131416");
  }
  const tb=$("#themeBtn"),ti=tb&&tb.querySelector(".ico-theme");if(ti)ti.style.color=themeDot(g?id:(THEMES.includes(id)?id:"dark"));
  if(UI.gridSize)root.style.setProperty("--gridMin",UI.gridSize+"px");
  renderThemePicker();
}
function themeSelect(id){UI.theme=id;saveUI();applyTheme();render();if(typeof foxSay==="function")foxSay("theme",themeName(id))}
function renderThemePicker(){
  const p=$("#themePicker");if(!p)return;
  const item=(id,extra="")=>`<button class="tp-item${UI.theme===id?" on":""}" data-t="${esc(id)}"><span class="tp-dot" style="background:${themeDot(id)}"></span>${esc(themeName(id))}${extra}<span class="tp-check">✓</span></button>`;
  const cust=UI.customThemes||[];
  p.innerHTML=THEMES.map(t=>item(t)).join("")+
    `<div class="tp-sep">Наборы</div>`+Object.keys(GEN_THEMES).map(t=>item(t)).join("")+
    (cust.length?`<div class="tp-sep">Мои темы</div>`+cust.map(c=>`<div class="tp-row">${item("c:"+c.id)}<button class="tp-mini" data-thedit="${esc(c.id)}" title="Изменить">✎</button></div>`).join(""):"")+
    `<button class="tp-item tp-new" data-thnew>🎨 Создать свою тему…</button>`;
}
function toggleThemePicker(){const p=$("#themePicker");const btn=$("#themeBtn");if(p.classList.contains("open")){p.classList.remove("open");return}const r=btn.getBoundingClientRect();const isMob=window.innerWidth<=820;if(isMob){p.style.left="auto";p.style.right="8px";p.style.top=(r.bottom+6)+"px";p.style.bottom="auto"}else{p.style.left=(r.right+10)+"px";p.style.bottom=(window.innerHeight-r.bottom)+"px";p.style.top="auto";p.style.right="auto"}p.classList.add("open")}
document.addEventListener("click",e=>{const p=$("#themePicker");if(p&&p.classList.contains("open")&&!p.contains(e.target)&&e.target.id!=="themeBtn"&&!e.target.closest("#themeBtn")){p.classList.remove("open")}});
/* --- редактор своей темы --- */
const thCode=t=>[t.bg,t.acc,t.acc2,t.light?"l":"d"].join(",");
function thParse(s){
  const a=String(s||"").trim().split(/[,\s;]+/);
  const ok=x=>/^#?[0-9a-f]{6}$/i.test(x||"");
  if(a.length<3||!ok(a[0])||!ok(a[1])||!ok(a[2]))return null;
  const f=x=>"#"+x.replace("#","").toLowerCase();
  return{bg:f(a[0]),acc:f(a[1]),acc2:f(a[2]),light:/^l/i.test(a[3]||"")};
}
function thRandom(light){
  const h=Math.random()*360,h2=(h+30+Math.random()*150)%360;
  const hsl=(h,s,l)=>{s/=100;l/=100;const k=n=>(n+h/30)%12,a=s*Math.min(l,1-l),f=n=>l-a*Math.max(-1,Math.min(k(n)-3,Math.min(9-k(n),1)));return thHex([f(0)*255,f(8)*255,f(4)*255])};
  return light?{bg:hsl(h,40+Math.random()*30,95),acc:hsl(h,55+Math.random()*25,42),acc2:hsl(h2,45+Math.random()*25,40),light:true}
    :{bg:hsl(h,35+Math.random()*30,6+Math.random()*4),acc:hsl(h,65+Math.random()*25,62+Math.random()*8),acc2:hsl(h2,55+Math.random()*25,60),light:false};
}
function openThemeEditor(id){
  $("#themePicker")?.classList.remove("open");
  const cur=id?(UI.customThemes||[]).find(t=>t.id===id):null;
  const base=cur||themeDef(UI.theme)||{bg:"#131416",acc:"#8eaadc",acc2:"#6dbba1",light:false};
  const T={id:cur?cur.id:null,n:cur?cur.n:"Моя тема",bg:base.bg,acc:base.acc,acc2:base.acc2||base.acc,light:!!base.light};
  const seeds=[["Кинозал",GEN_THEMES.cinema],["Закат",GEN_THEMES.sunset],["Полночь",GEN_THEMES.midnight],["Сакура",GEN_THEMES.sakura],["Бумага",GEN_THEMES.paper],["Лес",{bg:"#0c1410",acc:"#6dbba1",acc2:"#a0c878",light:false}],["Неон",{bg:"#0e0a18",acc:"#c77dff",acc2:"#ff6b9d",light:false}]];
  const d=showDlg(`<div class="dh"><h2>${cur?"Изменить тему":"Своя тема"}</h2><button class="btn icon ghost" data-close>✕</button></div>
  <div class="db the">
    <div class="the-grid">
      <div class="the-form">
        <div class="f"><label>Название</label><input class="inp" id="thN" maxlength="24" value="${esc(T.n)}"></div>
        <div class="the-cols">
          <label class="the-c"><span>Фон</span><input type="color" id="thBg" value="${T.bg}"></label>
          <label class="the-c"><span>Акцент</span><input type="color" id="thAcc" value="${T.acc}"></label>
          <label class="the-c"><span>Второй акцент</span><input type="color" id="thAcc2" value="${T.acc2}"></label>
        </div>
        <div class="seg" id="thMode"><button data-v="d" class="${T.light?"":"on"}">🌙 Тёмная</button><button data-v="l" class="${T.light?"on":""}">☀ Светлая</button></div>
        <div class="the-seeds"><span class="dim">Отправная точка:</span>${seeds.map(([n,s],i)=>`<button class="chip" data-thseed="${i}"><i style="background:${s.acc}"></i>${n}</button>`).join("")}<button class="chip" data-thrnd>🎲 Случайная</button></div>
        <div class="f"><label>Код темы <span class="dim">— можно отправить второму человеку</span></label><input class="inp" id="thCode" spellcheck="false" value="${esc(thCode(T))}"></div>
      </div>
      <div class="the-prev" id="thPrev">
        <div class="tp-bar"><b>Лисьи оценки</b><span class="tp-pill">Просмотрено</span></div>
        <div class="tp-card"><div class="tp-poster"></div><div><b>Название фильма</b><div class="tp-sub">2024 · Драма · 2 ч 10 мин</div><div class="tp-score">4.6</div></div></div>
        <div class="tp-row2"><span class="tp-btn">Кнопка</span><span class="tp-btn pri">Главная</span><span class="tp-chip">Чип</span></div>
      </div>
    </div>
  </div>
  <div class="df">${cur?`<button class="btn danger ghost" id="thDel">Удалить</button>`:""}<div class="sp"></div><button class="btn" data-close>Отмена</button><button class="btn pri" id="thSave">Сохранить и применить</button></div>`,"dlg2");
  const prev=$("#thPrev",d);
  const paint=()=>{const v=themeVars(T);for(const k in v)prev.style.setProperty(k,v[k]);prev.style.colorScheme=T.light?"light":"dark";$("#thCode",d).value=thCode(T)};
  const bind=(sel,k)=>$(sel,d).addEventListener("input",e=>{T[k]=e.target.value;paint()});
  bind("#thBg","bg");bind("#thAcc","acc");bind("#thAcc2","acc2");
  $("#thN",d).addEventListener("input",e=>T.n=e.target.value);
  const setAll=s=>{Object.assign(T,{bg:s.bg,acc:s.acc,acc2:s.acc2||s.acc,light:!!s.light});$("#thBg",d).value=T.bg;$("#thAcc",d).value=T.acc;$("#thAcc2",d).value=T.acc2;$$("#thMode button",d).forEach(b=>b.classList.toggle("on",(b.dataset.v==="l")===T.light));paint()};
  $$("#thMode button",d).forEach(b=>b.onclick=()=>{const l=b.dataset.v==="l";if(l===T.light)return;const s=l?{bg:"#f6f1ee",acc:T.acc,acc2:T.acc2,light:true}:{bg:"#131416",acc:T.acc,acc2:T.acc2,light:false};setAll(s)});
  $$("[data-thseed]",d).forEach(b=>b.onclick=()=>setAll(seeds[+b.dataset.thseed][1]));
  $("[data-thrnd]",d).onclick=()=>setAll(thRandom(T.light));
  $("#thCode",d).addEventListener("change",e=>{const p=thParse(e.target.value);if(p)setAll(p);else{toast("Код: фон,акцент,акцент2,d|l — например #18080d,#e2b24c,#c8403a,d");e.target.value=thCode(T)}});
  $("#thSave",d).onclick=()=>{
    const n=(T.n||"").trim()||"Моя тема";
    UI.customThemes=UI.customThemes||[];
    if(T.id){const t=UI.customThemes.find(x=>x.id===T.id);Object.assign(t,{n,bg:T.bg,acc:T.acc,acc2:T.acc2,light:T.light,ic:"🎨"})}
    else{T.id="t"+Date.now().toString(36);UI.customThemes.push({id:T.id,n,bg:T.bg,acc:T.acc,acc2:T.acc2,light:T.light,ic:"🎨"})}
    UI.theme="c:"+T.id;saveUI();closeDlg("dlg2");applyTheme();render();toast("Тема «"+n+"» применена");
  };
  const del=$("#thDel",d);if(del)del.onclick=()=>{if(!confirm("Удалить тему «"+T.n+"»?"))return;UI.customThemes=UI.customThemes.filter(x=>x.id!==T.id);if(UI.theme==="c:"+T.id)UI.theme="dark";saveUI();closeDlg("dlg2");applyTheme();render()};
  paint();
}
/* клики по списку тем (capture: чтобы сработать раньше прежних обработчиков) */
document.addEventListener("click",e=>{
  const t=e.target.closest("#themePicker [data-t],#themePicker [data-thnew],#themePicker [data-thedit]");if(!t)return;
  e.stopPropagation();e.preventDefault();
  if(t.dataset.thnew!==undefined){openThemeEditor();return}
  if(t.dataset.thedit){openThemeEditor(t.dataset.thedit);return}
  themeSelect(t.dataset.t);
},true);
/* ============ смайлы → нарисованные иконки ============
   Все эмодзи и значки-символы (🦊 ✓ ✕ ↻ …) на странице автоматически заменяются на линейные иконки
   (css/230-icons-x.css). Срабатывает на любом тексте, который появляется в документе, поэтому
   отдельно править шаблоны не нужно. В <option>, title, placeholder иконок быть не может — там смайлы убираются.
   Карта и сами иконки генерируются legacy/make_icons.py. */
const EMO_MAP={"🦊": "fox", "🎬": "film", "🎞": "strip", "🎨": "art", "☁": "cloud", "📅": "cal", "🗓": "cal", "↻": "redo", "↺": "undo2", "🔎": "search", "🔍": "search", "⚲": "search", "★": "star", "⭐": "star", "🎭": "masks", "🎲": "dice", "🎰": "slot", "🧸": "teddy", "🍿": "popcorn", "📊": "chart", "⬆": "up", "⬇": "down", "⏳": "hourglass", "↗": "ext", "↔": "swap", "👁": "eye", "🚧": "cone", "🌐": "globe", "🌍": "globe", "🗺": "map", "🤝": "link", "📺": "tv", "🖼": "image", "🔁": "repeat", "🏆": "trophy", "🕓": "clock", "⏱": "timer", "❤": "heart", "💛": "heart", "💾": "save", "⚔": "swords", "📜": "scroll", "🔥": "flame", "📋": "clip", "✎": "pencil", "✨": "sparkle", "🌙": "moon", "☀": "sun", "🌑": "newmoon", "🌊": "wave", "🌲": "tree", "💎": "gem", "🌇": "sunset", "🌌": "galaxy", "🎉": "party", "🙂": "smile", "😄": "grin", "😂": "laugh", "😱": "scared", "🤔": "think", "🧐": "monocle", "🥲": "relief", "🚀": "rocket", "🚫": "ban", "🎯": "target", "🗑": "trash", "↩": "back", "📦": "box", "🎮": "gamepad", "📝": "notes", "⚖": "scales", "📖": "book", "⚙": "gear", "📲": "phone", "🎧": "phones", "💥": "boom", "🏷": "tag", "☕": "coffee", "🍜": "noodles", "🌸": "flower", "⚠": "warn", "✓": "check", "✔": "check", "✕": "x", "✗": "x", "✖": "x", "🍒": "flower"};
const EMO_RX=new RegExp("("+Object.keys(EMO_MAP).map(k=>k.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")).join("|")+")[\\uFE0E\\uFE0F]?","gu");
const EMO_TEST=new RegExp(EMO_RX.source,"u");
const EMO_SKIP=new Set(["SCRIPT","STYLE","TEXTAREA","TITLE","OPTION","NOSCRIPT"]);
const emoStrip=s=>s.replace(EMO_RX,"").replace(/\s{2,}/g," ").trim();
function emoText(tn){
  const t=tn.nodeValue;if(!t||!EMO_TEST.test(t))return;
  const p=tn.parentNode;if(!p||p.nodeType!==1)return;
  if(p.tagName==="OPTION"){tn.nodeValue=emoStrip(t);return}
  if(EMO_SKIP.has(p.tagName)||p.closest("svg,textarea,[contenteditable]"))return;
  const frag=document.createDocumentFragment();let last=0;EMO_RX.lastIndex=0;let m;
  while((m=EMO_RX.exec(t))){
    if(m.index>last)frag.appendChild(document.createTextNode(t.slice(last,m.index)));
    const i=document.createElement("i");i.className="ico ico-x-"+EMO_MAP[m[1]];i.setAttribute("aria-hidden","true");frag.appendChild(i);last=m.index+m[0].length;
  }
  if(last<t.length)frag.appendChild(document.createTextNode(t.slice(last)));
  p.replaceChild(frag,tn);
}
function emoNode(n){
  if(n.nodeType===3){emoText(n);return}
  if(n.nodeType!==1||EMO_SKIP.has(n.tagName))return;
  const w=document.createTreeWalker(n,NodeFilter.SHOW_TEXT),L=[];while(w.nextNode())L.push(w.currentNode);L.forEach(emoText);
  const els=n.matches&&n.matches("[title],[placeholder],[aria-label]")?[n]:[];
  n.querySelectorAll("[title],[placeholder],[aria-label]").forEach(e=>els.push(e));
  els.forEach(e=>{for(const a of ["title","placeholder","aria-label"]){const v=e.getAttribute(a);if(v&&EMO_TEST.test(v))e.setAttribute(a,emoStrip(v))}});
}
new MutationObserver(ms=>{for(const m of ms){if(m.type==="characterData")emoText(m.target);else if(m.type==="attributes"){const v=m.target.getAttribute(m.attributeName);if(v&&EMO_TEST.test(v))m.target.setAttribute(m.attributeName,emoStrip(v))}else m.addedNodes.forEach(emoNode)}})
  .observe(document.documentElement,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:["title","placeholder","aria-label"]});
emoNode(document.body);
/* ============ оформление: анимации, цвет постера, лис-талисман ============
   Настройки (на этом устройстве, в UI): anim, posterBg, fox — по умолчанию включены.
   Панель настроек — lookPanel() во вкладке «Данные». */
const fxOn=()=>UI.anim!==false&&!(UI.anim===undefined&&window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches);
const posterBgOn=()=>UI.posterBg!==false;
const foxOn=()=>UI.fox!==false;
function fxApply(){document.documentElement.dataset.fx=fxOn()?"on":"off";document.documentElement.classList.toggle("fox-off",!foxOn())}
fxApply();

/* ---------- плавное появление карточек и счётчики ---------- */
function fxCount(root){
  if(!fxOn())return;
  root.querySelectorAll(".kpi b,.qk .big,[data-count]").forEach(el=>{
    if(el.children.length)return;
    const m=el.textContent.trim().match(/^(\d+(?:[.,]\d+)?)(\D*)$/);if(!m)return;
    const to=parseFloat(m[1].replace(",","."));if(!isFinite(to)||to<=0)return;
    const dec=(m[1].split(/[.,]/)[1]||"").length,suf=m[2],sep=m[1].includes(",")?",":".",t0=performance.now(),dur=700;
    const tick=t=>{const k=Math.min(1,(t-t0)/dur),e=1-Math.pow(1-k,3),v=to*e;
      el.textContent=(dec?v.toFixed(dec).replace(".",sep):String(Math.round(v)))+suf;if(k<1)requestAnimationFrame(tick)};
    requestAnimationFrame(tick);
  });
}
let fxKey="",fxT=0;
function fxAfterRender(){
  const v=$("#view");if(!v)return;
  const key=UI.tab+"/"+(UI.tab==="analytics"?UI.sub:UI.tab==="quiz"?UI.qzSub:"");
  if(key!==fxKey){fxKey=key;v.classList.add("fx-in");clearTimeout(fxT);fxT=setTimeout(()=>v.classList.remove("fx-in"),1400);fxCount(v)}
  else v.classList.remove("fx-in");
}
{const base=render;render=function(top){base(top);fxAfterRender()}}

/* ---------- цвет постера в карточке фильма ---------- */
const PCOL=new Map();
/* приводим цвет к «живому» среднему тону, чтобы подсветка была заметна и на тёмных постерах */
function posterTone(hex){
  const[r,g,b]=thRGB(hex).map(v=>v/255),mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn;let h=0;
  if(d){h=mx===r?((g-b)/d+6)%6:mx===g?(b-r)/d+2:(r-g)/d+4;h*=60}
  const s=Math.max(.45,Math.min(.8,mx?d/(1-Math.abs(mx+mn-1)||1):0)),l=.46;
  const a=s*Math.min(l,1-l),f=n=>{const k=(n+h/30)%12;return l-a*Math.max(-1,Math.min(k-3,Math.min(9-k,1)))};
  return thHex([f(0)*255,f(8)*255,f(4)*255]);
}
function posterColor(src){
  if(PCOL.has(src))return Promise.resolve(PCOL.get(src));
  return new Promise(res=>{
    const im=new Image();im.crossOrigin="anonymous";
    im.onload=()=>{try{
      const S=32,c=document.createElement("canvas");c.width=c.height=S;
      const x=c.getContext("2d",{willReadFrequently:true});x.drawImage(im,0,0,S,S);
      const px=x.getImageData(0,0,S,S).data,bins=Array.from({length:12},()=>({w:0,r:0,g:0,b:0}));let ar=0,ag=0,ab=0,n=0;
      for(let i=0;i<px.length;i+=4){
        const r=px[i],g=px[i+1],b=px[i+2];ar+=r;ag+=g;ab+=b;n++;
        const mx=Math.max(r,g,b),mn=Math.min(r,g,b);if(mx===mn)continue;
        const l=(mx+mn)/510,d=(mx-mn)/255,s=d/(1-Math.abs(2*l-1)||1);
        if(l<.14||l>.9||s<.25)continue;
        const h=mx===r?((g-b)/(mx-mn)+6)%6:mx===g?(b-r)/(mx-mn)+2:(r-g)/(mx-mn)+4;
        const o=bins[Math.floor(h*2)%12],w=s*(1-Math.abs(l-.5)*1.4);o.w+=w;o.r+=r*w;o.g+=g*w;o.b+=b*w;
      }
      const best=bins.reduce((a,b)=>b.w>a.w?b:a);
      const col=best.w>.8?thHex([best.r/best.w,best.g/best.w,best.b/best.w]):thHex([ar/n,ag/n,ab/n]);
      const tn=posterTone(col);PCOL.set(src,tn);res(tn);
    }catch(e){PCOL.set(src,null);res(null)}};
    im.onerror=()=>res(null);im.src=src;
  });
}
function posterBgApply(d,it){
  d.dataset.pid=it.id;
  if(!posterBgOn()||!it.poster||!/^(https?:|data:|blob:|posters\/)/.test(it.poster))return;
  posterColor(it.poster).then(col=>{
    if(!col||!d.open||d.dataset.pid!==it.id)return;
    d.style.setProperty("--pcol",col);d.classList.add("pbg");
  });
}

/* ---------- лис-талисман ---------- */
const FOX_MSG={
  rateHigh:["Вот это шедевр! 🎉","Пятёрочка! Лис хлопает хвостом","Записал в список любимого ❤","Такое надо пересматривать!"],
  rateMid:["Неплохо, неплохо 🙂","Записал. Хороший вечер получился","Крепкая середина"],
  rateLow:["Ой… Бывает 🥲","Минус вечер — плюс опыт","Лис сочувствует и подаёт плед"],
  watched:["Отмечено! Ещё один в копилку 🍿"],
  plan:["В планах! Попкорн уже готов 🍿","Записал на «когда-нибудь вместе»","Хороший выбор — пусть ждёт своего вечера"],
  quizOk:["Верно! 🦊","В яблочко!","Точно!","Память как у лиса"],
  quizStreak:["Серия {n}! 🔥","{n} подряд — вы машины!"],
  quizBad:["Мимо… но это же весело","Ничего, в следующий раз","Хм, коварный вопрос"],
  quizHi:["Блестящий раунд! 🏆"],quizMid:["Хороший результат!"],quizLo:["Кино стоит пересмотреть 😄"],
  theme:["Тема «{n}» — отличный вкус! 🎨"],
  backup:["Копия спрятана в норку 💾"],
  roll:["Крутим барабан… 🎰"],rollWin:["Сегодня смотрим вот это! 🍿"],
  poke:["Тык!","Эй, щекотно 😄","Я тут, я слушаю","Хвост не трогать!","Кино? Кино!"],
  wrapped:["Что за год получился! 🦊"],geo:["Весь мир на ладони 🌍"]
};
const foxPick=a=>a[Math.floor(Math.random()*a.length)];
let foxBub=null,foxTm=0,foxMoodTm=0,foxLast=0;
function foxLogo(){return document.querySelector(".sb-logo")}
function foxMood(m,ms=1700){
  const l=foxLogo();if(!l)return;l.dataset.mood=m;clearTimeout(foxMoodTm);
  if(m!=="sleep")foxMoodTm=setTimeout(()=>{if(l.dataset.mood===m)delete l.dataset.mood},ms);
}
function foxSparks(chars){
  const l=foxLogo();if(!l||!fxOn()||!l.offsetWidth)return;
  for(let i=0;i<5;i++){const s=document.createElement("span");s.className="fox-spark";s.textContent=chars[i%chars.length];
    s.style.setProperty("--dx",(Math.random()*44-22)+"px");s.style.animationDelay=(i*70)+"ms";l.appendChild(s);setTimeout(()=>s.remove(),1500)}
}
function foxBubble(text,act){
  if(!foxBub){
    foxBub=document.createElement("div");foxBub.className="fox-bubble";foxBub.setAttribute("popover","manual");
    const lg=foxLogo(),sv=lg&&lg.querySelector("svg");
    foxBub.innerHTML=`<span class="fb-face"></span><span class="fb-t"></span>`;
    if(sv)foxBub.firstChild.appendChild(sv.cloneNode(true));
    foxBub.addEventListener("click",()=>{const a=foxBub._act;foxHide();if(a)a()});
    document.body.appendChild(foxBub);
  }
  foxBub._act=act||null;foxBub.classList.toggle("act",!!act);
  foxBub.querySelector(".fb-t").textContent=text;
  try{if(foxBub.matches(":popover-open"))foxBub.hidePopover();foxBub.showPopover()}catch(e){foxBub.classList.add("nopop")}
  foxBub.classList.remove("out");void foxBub.offsetWidth;foxBub.classList.add("in");
  clearTimeout(foxTm);foxTm=setTimeout(foxHide,act?4500:2200);
}
function foxHide(){
  if(!foxBub)return;foxBub.classList.remove("in");foxBub.classList.add("out");
  clearTimeout(foxTm);foxTm=setTimeout(()=>{try{foxBub.hidePopover()}catch(e){logErr("Реплика лисы",e,1)}},260);
}
function foxSay(kind,arg,act){
  if(!foxOn())return;
  const now=Date.now();if(now-foxLast<900&&kind!=="poke")return;foxLast=now;
  const pool=FOX_MSG[kind];if(!pool)return;
  const txt=foxPick(pool).replace("{n}",arg==null?"":arg);
  foxBubble(txt,act);
  const happy=["rateHigh","quizOk","quizStreak","quizHi","plan","watched","backup","rollWin","wrapped","poke","theme","geo"],sad=["rateLow","quizBad","quizLo"];
  if(happy.includes(kind)){foxMood("happy");if(kind==="rateHigh"||kind==="quizStreak"||kind==="quizHi"||kind==="rollWin")foxSparks(["✨","❤","⭐"])}
  else if(sad.includes(kind))foxMood("sad");
  else foxMood("wow");
}
/* итог оценки: вызывается из диалога оценивания */
function foxRated(it,res,finish){
  try{
    const vals=Object.values(res||{}).map(r=>personScore(r)).filter(isNum);
    if(!vals.length){if(finish)foxSay("watched");return}
    const a=vals.reduce((s,x)=>s+x,0)/vals.length;
    foxSay(a>=4.5?"rateHigh":a<=2.5?"rateLow":"rateMid");
  }catch(e){logErr("Реплика лисы",e,1)}
}
/* глаза следят за курсором, моргание, сон */
(function foxLife(){
  const l=foxLogo();if(!l)return;const sv=l.querySelector("svg");if(!sv)return;
  let raf=0,px=0,py=0,idle=0;
  const move=e=>{px=e.clientX;py=e.clientY;
    if(l.dataset.mood==="sleep"){delete l.dataset.mood;}
    clearTimeout(idle);idle=setTimeout(()=>{if(foxOn()&&fxOn())foxMood("sleep")},240000);
    if(!raf)raf=requestAnimationFrame(()=>{raf=0;if(!foxOn()||!l.offsetWidth)return;
      const r=l.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,dx=px-cx,dy=py-cy,d=Math.hypot(dx,dy)||1,k=Math.min(1,d/260);
      sv.style.setProperty("--ex",(dx/d*1.7*k).toFixed(2)+"px");sv.style.setProperty("--ey",(dy/d*1.3*k).toFixed(2)+"px")})};
  window.addEventListener("pointermove",move,{passive:true});
  (function blink(){setTimeout(()=>{if(foxOn()&&l.dataset.mood!=="sleep"){sv.style.setProperty("--bl",".08");setTimeout(()=>sv.style.setProperty("--bl","1"),120)}blink()},3500+Math.random()*4500)})();
  l.addEventListener("click",()=>foxSay("poke"));
  idle=setTimeout(()=>{if(foxOn()&&fxOn())foxMood("sleep")},240000);
})();
/* реакции на чужие функции — оборачиваем после определения */
{
  const qa=qzAnswer;
  qzAnswer=function(i){const had=QZ.ans;qa(i);
    if(!had&&QZ.ans){let st=0;for(let k=QZ.res.length-1;k>=0&&QZ.res[k].ok;k--)st++;
      if(QZ.ans.ok)foxSay(st>=5&&st%5===0?"quizStreak":"quizOk",st);else foxSay("quizBad")}};
  const qn=qzNext;
  qzNext=function(){qn();if(QZ.state==="done"){const a=QZ.res.length?QZ.res.filter(x=>x.ok).length/QZ.res.length:0;setTimeout(()=>foxSay(a>=.8?"quizHi":a>=.5?"quizMid":"quizLo"),300)}};
  const ca=catAdd;
  catAdd=async function(k,mode){const n=DB.items.length;const r=await ca(k,mode);if(mode==="plan"&&DB.items.length>n)foxSay("plan");return r};
}

/* ---------- панель «Оформление» (вкладка «Данные») ---------- */
function lookPanel(){
  const cust=UI.customThemes||[];
  const chk=(k,on,t,h)=>`<label class="chk" title="${esc(h)}"><input type="checkbox" data-look="${k}" ${on?"checked":""}><span>${t}</span></label>`;
  return `<div class="panel" id="lookP"><h3>🎨 Оформление</h3><p>Темы, движение и лис-талисман. Настройки хранятся на этом устройстве.</p>
    <div class="tabvis">
      ${chk("anim",fxOn(),"Анимации","Появление карточек, плавные переходы, счётчики")}
      ${chk("posterBg",posterBgOn(),"Цвет постера в карточке фильма","Фон окна фильма подстраивается под главный цвет постера")}
      ${chk("fox",foxOn(),"Лис-талисман","Реплики и реакции лисы в углу")}
    </div>
    <div class="row" style="margin-top:12px;gap:8px;flex-wrap:wrap">
      <span class="dim">Тема: <b style="color:var(--tx)">${esc(themeName(UI.theme))}</b></span>
      <button class="btn sm" data-lookact="newtheme">🎨 Создать свою тему</button>
      <button class="btn sm ghost" data-lookact="fox">🦊 Поздороваться с лисой</button>
    </div>
    ${cust.length?`<div class="chips" style="margin-top:10px">${cust.map(c=>`<button class="chip ${UI.theme==="c:"+c.id?"on":""}" data-lookact="usetheme" data-id="${esc(c.id)}"><i class="thdot" style="background:${esc(c.acc)}"></i>${esc(c.n)}</button><button class="chip" data-lookact="edittheme" data-id="${esc(c.id)}" title="Изменить">✎</button>`).join("")}</div>`:""}
  </div>`;
}
document.addEventListener("change",e=>{
  const t=e.target.closest&&e.target.closest("[data-look]");if(!t)return;
  UI[t.dataset.look]=t.checked;saveUI();fxApply();
  if(t.dataset.look==="fox"&&t.checked)foxSay("poke");
});
document.addEventListener("click",e=>{
  const t=e.target.closest&&e.target.closest("[data-lookact]");if(!t)return;
  e.stopPropagation();e.preventDefault();
  const a=t.dataset.lookact;
  if(a==="newtheme")openThemeEditor();
  else if(a==="edittheme")openThemeEditor(t.dataset.id);
  else if(a==="usetheme")themeSelect("c:"+t.dataset.id);
  else if(a==="fox"){if(!foxOn()){UI.fox=true;saveUI();fxApply();render()}foxSay("poke")}
},true);
/* ============ init ============ */
/* ============ рулетка вечера ============
   Выбирает, что смотреть сегодня, из «Планов» (кроме ещё не вышедших). Фильтры: тип, длительность,
   настроение (по жанрам), «только новое для обоих». Состояние фильтров живёт, пока открыта страница. */
const RL={cats:null,time:"any",mood:"any",fresh:true,skip:new Set(),busy:false,win:null};
const RL_TIME=[["any","Любая"],["90","до 1,5 ч"],["120","до 2 ч"],["150","до 2,5 ч"]];
const RL_MOOD=[["any","🎲 Любое",null],
  ["fun","😂 Посмеяться",["Комедия","Семейный","Мультфильм"]],
  ["thrill","😱 Нервы пощекотать",["Ужасы","Триллер","Детектив","Криминал"]],
  ["think","🤔 Подумать",["Драма","Фантастика","Документальный","История","Военный"]],
  ["adv","🚀 Приключения",["Боевик","Приключения","Фэнтези","Вестерн"]],
  ["cozy","🧸 Уютно",["Мелодрама","Семейный","Музыка","Комедия","Мультфильм"]]];
function rlPool(){
  const on=RL.cats?new Set(RL.cats):null,lim=RL.time==="any"?0:+RL.time,mg=(RL_MOOD.find(m=>m[0]===RL.mood)||[])[2];
  return DB.items.filter(it=>{
    if(it.status!=="planned"||isUpcoming(it)||RL.skip.has(it.id))return false;
    if(on&&!on.has(qzCatOf(it.type)))return false;
    if(RL.fresh&&seenList(it).length)return false;
    if(lim){const m=it.kind==="series"?parseDurAvg(it.episodeDuration):totalMinutes(it);if(m&&m>lim)return false}
    if(mg&&!(it.genres||[]).some(g=>mg.includes(g)))return false;
    return true;
  });
}
function rlCats(){
  const cnt={};DB.items.forEach(it=>{if(it.status==="planned"&&!isUpcoming(it)){const k=qzCatOf(it.type);cnt[k]=(cnt[k]||0)+1}});
  return QZ_CATS.filter(c=>cnt[c[0]]).map(c=>[c[0],c[1],cnt[c[0]]]);
}
const rlCell=it=>`<div class="rl-cell" data-id="${esc(it.id)}"><div class="poster">${posterHTML(it,false)}</div><div class="rl-t">${esc(it.title)}</div></div>`;
function rlRender(){
  const pool=rlPool(),cats=rlCats(),on=RL.cats?new Set(RL.cats):new Set(cats.map(c=>c[0]));
  const mins=pool.map(it=>it.kind==="series"?null:totalMinutes(it)).filter(isNum);
  const avgM=mins.length?Math.round(mins.reduce((s,x)=>s+x,0)/mins.length):null;
  const mix={};pool.forEach(it=>{const n=(QZ_CATS.find(c=>c[0]===qzCatOf(it.type))||[])[1]||"Прочее";mix[n]=(mix[n]||0)+1});
  const chip=(k,v,label,cur,extra="")=>`<button class="chip ${cur?"on":""}" data-rlk="${k}" data-rlv="${esc(v)}">${label}${extra}</button>`;
  const prev=qzShuf(pool).slice(0,12);
  const html=`<div class="dh"><h2>🎰 Рулетка вечера</h2><button class="btn icon ghost" data-close>✕</button></div>
  <div class="db rl">
    <div class="rl-flt"><label>Что крутим</label><div class="chips">${cats.map(([k,n,c])=>chip("cat",k,n,on.has(k),` <small>${c}</small>`)).join("")||`<span class="dim">В планах пусто</span>`}</div></div>
    <div class="rl-flt"><label>Сколько есть времени <span class="dim">(у сериалов — длина серии)</span></label><div class="chips">${RL_TIME.map(([v,n])=>chip("time",v,n,RL.time===v)).join("")}</div></div>
    <div class="rl-flt"><label>Настроение</label><div class="chips">${RL_MOOD.map(([v,n])=>chip("mood",v,n,RL.mood===v)).join("")}</div></div>
    <div class="rl-flt"><label>Пересмотры</label><div class="chips">${chip("fresh","1","Только новое для обоих",RL.fresh)}${RL.skip.size?`<button class="chip" data-rl="unskip">Вернуть пропущенные <small>${RL.skip.size}</small></button>`:""}</div></div>
    <div class="rl-info"><b data-count>${pool.length}</b> ${plural(pool.length,"проект","проекта","проектов")} в барабане${pool.length?` · ${Object.entries(mix).map(([n,c])=>`${n.replace(/^\S+\s/,"")} ${c}`).join(", ")}`:""}${avgM?` · фильм в среднем ≈ ${hoursStr(avgM)}`:""}</div>
    <div class="rl-stage" id="rlStage"><div class="rl-mark"></div><div class="rl-reel idle" id="rlReel">${pool.length?prev.map(rlCell).join(""):`<div class="rl-empty">${DB.items.some(i=>i.status==="planned")?"По этим фильтрам ничего не нашлось — ослабьте их.":"План пуст — добавьте что-нибудь в «Каталоге»."}</div>`}</div></div>
    <div class="rl-res" id="rlRes"></div>
  </div>
  <div class="df"><span class="dim" style="margin-right:auto;font-size:12.5px">Выбор честный: у каждого проекта в барабане равные шансы.</span><button class="btn pri rl-go" id="rlSpin" ${pool.length?"":"disabled"}>🎰 Крутить!</button></div>`;
  showDlg(html);
}
function openRoulette(){RL.busy=false;RL.win=null;rlRender()}
function rlSpin(){
  if(RL.busy)return;const pool=rlPool();if(!pool.length)return;
  RL.busy=true;
  const win=pool[Math.floor(Math.random()*pool.length)],N=36,WIN=28;
  const strip=[];let prev=null;
  for(let i=0;i<N;i++){
    let it;if(i===WIN)it=win;else{let t=0;do{it=pool[Math.floor(Math.random()*pool.length)]}while(pool.length>1&&(it===prev||(i===WIN-1||i===WIN+1)&&it===win)&&++t<20)}
    strip.push(it);prev=it;
  }
  const reel=$("#rlReel"),stage=$("#rlStage"),res=$("#rlRes"),btn=$("#rlSpin");
  res.innerHTML="";reel.classList.remove("idle");reel.innerHTML=strip.map(rlCell).join("");
  btn.disabled=true;$$(".rl-flt .chip,.rl-flt button",$("#dlg")).forEach(b=>b.disabled=true);
  foxSay("roll");
  const cs=$$(".rl-cell",reel),P=cs[1].offsetLeft-cs[0].offsetLeft,half=cs[0].offsetWidth/2;
  const W=stage.clientWidth,jitter=Math.round((Math.random()-.5)*half),target=-(WIN*P+half-W/2+jitter),dur=fxOn()?7400:60;
  reel.style.transition="none";reel.style.transform="translateX(0)";void reel.offsetWidth;
  reel.style.transition=`transform ${dur}ms cubic-bezier(.08,.7,.1,1)`;reel.style.transform=`translateX(${target}px)`;
  let done=false;const fin=()=>{if(done)return;done=true;rlReveal(win)};
  reel.addEventListener("transitionend",fin,{once:true});setTimeout(fin,dur+250);
}
function rlReveal(it){
  RL.busy=false;RL.win=it;
  const reel=$("#rlReel"),res=$("#rlRes");if(!reel||!res)return;
  const cells=$$(".rl-cell",reel);if(cells[28])cells[28].classList.add("win");
  $$(".rl-flt .chip,.rl-flt button",$("#dlg")).forEach(b=>b.disabled=false);
  const sp=$("#rlSpin");if(sp){sp.disabled=false;sp.textContent="🔁 Ещё раз"}
  const sc=itemScore(it);
  const meta=[it.type,it.year,it.kind==="series"?(it.seasonsTotal?it.seasonsTotal+" "+plural(it.seasonsTotal,"сезон","сезона","сезонов"):""):(durLine(it)||"")].filter(Boolean);
  res.innerHTML=`<div class="rl-win"><div class="poster">${posterHTML(it)}</div><div class="rl-wb">
    <div class="rl-kick">Сегодня смотрим</div><h3>${esc(it.title)}</h3>
    <div class="dim">${meta.map(esc).join(" · ")}</div>
    ${(it.genres||[]).length?`<div class="chips" style="margin:8px 0">${it.genres.slice(0,5).map(g=>`<span class="tag am">${esc(g)}</span>`).join("")}</div>`:""}
    ${it.synopsis?`<p class="syn" style="margin:6px 0 12px">${esc(it.synopsis.length>260?it.synopsis.slice(0,257)+"…":it.synopsis)}</p>`:""}
    <div class="row" style="gap:8px;flex-wrap:wrap"><button class="btn pri" data-rl="go" data-id="${esc(it.id)}">▶ Смотрим!</button><button class="btn" data-rl="again">🔁 Ещё раз</button><button class="btn ghost" data-rl="skip" data-id="${esc(it.id)}">🚫 Не сегодня</button></div></div></div>`;
  res.scrollIntoView({behavior:fxOn()?"smooth":"auto",block:"nearest"});
  foxSay("rollWin");
}
document.addEventListener("click",e=>{
  const dlg=$("#dlg");
  const f=e.target.closest&&e.target.closest("[data-rlk]"),a=e.target.closest&&e.target.closest("[data-rl],#rlSpin");
  if(!f&&!a)return;
  if(f&&!(dlg&&dlg.contains(f)))return;
  if(a&&!a.matches("[data-rl=open]")&&!(dlg&&dlg.contains(a)))return;
  e.stopPropagation();e.preventDefault();
  if(f){
    if(RL.busy)return;
    const k=f.dataset.rlk,v=f.dataset.rlv;
    if(k==="cat"){const all=rlCats().map(c=>c[0]);const cur=new Set(RL.cats||all);if(cur.has(v)){if(cur.size>1)cur.delete(v)}else cur.add(v);RL.cats=cur.size===all.length?null:[...cur]}
    else if(k==="time")RL.time=v;else if(k==="mood")RL.mood=v;else if(k==="fresh")RL.fresh=!RL.fresh;
    rlRender();return;
  }
  const act=a.id==="rlSpin"?"spin":a.dataset.rl;
  if(act==="open")openRoulette();
  else if(act==="spin"||act==="again")rlSpin();
  else if(act==="unskip"){RL.skip.clear();rlRender()}
  else if(act==="skip"){if(RL.win)RL.skip.add(RL.win.id);rlSpin()}
  else if(act==="go"){closeDlg();openDetail(a.dataset.id)}
},true);
/* ============ Лисий год: итоги года (вкладка «Аналитика» → «🦊 Лисий год») ============
   Считается по просмотренным и начатым проектам с известной датой просмотра (поле «Дата просмотра»
   или первая оценка в журнале). Истории — полноэкранные слайды с автопереходом. */
const WR={y:null,i:0,slides:[],data:null};
const wrIn=i=>i.status==="watched"||i.status==="watching";
function wrDate(it){
  if(it.status==="watching"){if(it.progressAt)return new Date(it.progressAt);return itemDate(it)}
  const m=typeof it.watchedAt==="string"&&it.watchedAt.match(/^(\d{4})-(\d\d)-(\d\d)/);
  if(m)return new Date(+m[1],+m[2]-1,+m[3]);
  return itemDate(it);
}
function wrYears(){
  const ys=new Set();DB.items.forEach(i=>{if(wrIn(i)){const d=wrDate(i);if(d)ys.add(d.getFullYear())}});
  return [...ys].sort((a,b)=>b-a);
}
function wrData(y){
  const R=DB.raters,all=DB.items.filter(wrIn);
  const dated=all.map(it=>({it,d:wrDate(it)})),undated=dated.filter(x=>!x.d).length;
  const Y=dated.filter(x=>x.d&&x.d.getFullYear()===y);
  let minutes=0,noDur=0;Y.forEach(x=>{const m=x.it.status==="watching"?watchedMinutes(x.it):totalMinutes(x.it);if(isNum(m)&&m>0)minutes+=m;else noDur++});
  const months=Array(12).fill(0);Y.forEach(x=>months[x.d.getMonth()]++);
  const byCat={};Y.forEach(x=>{const k=qzCatOf(x.it.type);byCat[k]=(byCat[k]||0)+1});
  const gm=new Map();Y.forEach(x=>{const sc=itemScore(x.it);(x.it.genres||[]).forEach(g=>{const o=gm.get(g)||{n:0,s:[]};o.n++;if(isNum(sc))o.s.push(sc);gm.set(g,o)})});
  const genres=[...gm].map(([g,o])=>({g,n:o.n,avg:avg(o.s)})).sort((a,b)=>b.n-a.n||cmpRu(a.g,b.g));
  const scored=Y.map(x=>({it:x.it,sc:itemScore(x.it),d:x.d})).filter(x=>isNum(x.sc));
  const top=scored.slice().sort((a,b)=>b.sc-a.sc||cmpRu(a.it.title,b.it.title));
  const per=R.map(n=>{
    const sc=Y.map(x=>({it:x.it,s:itemScore(x.it,n)})).filter(x=>isNum(x.s));
    const g2=new Map();sc.forEach(x=>(x.it.genres||[]).forEach(g=>{const a=g2.get(g)||[];a.push(x.s);g2.set(g,a)}));
    const fg=[...g2].filter(([g,a])=>a.length>=2).map(([g,a])=>({g,m:avg(a),n:a.length})).sort((a,b)=>b.m-a.m||b.n-a.n)[0]||null;
    return{n,avg:avg(sc.map(x=>x.s)),cnt:sc.length,fav:sc.slice().sort((a,b)=>b.s-a.s)[0]||null,fg};
  });
  const diffs=[];
  if(R.length>=2)Y.forEach(x=>{const a=itemScore(x.it,R[0]),b=itemScore(x.it,R[1]);if(isNum(a)&&isNum(b))diffs.push({it:x.it,a,b,d:Math.abs(a-b)})});
  const meanDiff=diffs.length?avg(diffs.map(x=>x.d)):null;
  const compat=meanDiff==null?null:Math.round(Math.max(0,100-meanDiff/2.5*100));
  const hot=diffs.slice().sort((a,b)=>b.d-a.d)[0]||null;
  const days=new Map();Y.forEach(x=>{const k=x.d.getFullYear()+"-"+x.d.getMonth()+"-"+x.d.getDate();days.set(k,(days.get(k)||{n:0,d:x.d}));days.get(k).n++});
  const busiest=[...days.values()].sort((a,b)=>b.n-a.n)[0]||null;
  const mi=months.indexOf(Math.max(...months));
  /* звания */
  const badges=[];const n=Y.length,series=Y.filter(x=>x.it.kind==="series").length,anim=Y.filter(x=>["cartoon","anime"].includes(qzCatOf(x.it.type))).length;
  const aAll=avg(scored.map(x=>x.sc));
  if(n>=1){
    if(series>n/2)badges.push(["📺","Сериальные запойщики","сериалов больше, чем фильмов"]);else if(n>=3&&series===0)badges.push(["🎬","Верны большому экрану","только фильмы"]);
    if(n>=4&&anim/n>=.25)badges.push(["🧸","Мультяшные души","четверть года — анимация"]);
    if(isNum(aAll)&&aAll>=4.2&&scored.length>=3)badges.push(["💛","Добрые зрители","средняя оценка "+f1(aAll)]);
    if(isNum(aAll)&&aAll<=3.3&&scored.length>=3)badges.push(["🧐","Строгие критики","средняя оценка "+f1(aAll)]);
    if(compat!=null&&diffs.length>=3)badges.push(compat>=82?["🤝","Единомышленники","вкусы совпали на "+compat+"%"]:compat<=60?["⚔","Вечные спорщики","вкусы совпали лишь на "+compat+"%"]:["🎭","Дополняете друг друга","вкусы совпали на "+compat+"%"]);
    if(busiest&&busiest.n>=3)badges.push(["🍿","Марафонцы","рекорд: "+busiest.n+" "+plural(busiest.n,"проект","проекта","проектов")+" за день"]);
    if(minutes/60>=100)badges.push(["🏆","Сотня часов","больше 100 часов кино"]);
    const night=months.filter(Boolean).length;if(night>=9)badges.push(["📅","Без пропусков","кино почти каждый месяц"]);
  }
  const started=Y.filter(x=>x.it.status==="watching").length;
  return{y,R,n:Y.length,started,undated,minutes,noDur,months,mi,byCat,genres,top,scored,per,diffs,meanDiff,compat,hot,busiest,badges,Y};
}
const MONTHS_IN=["январе","феврале","марте","апреле","мае","июне","июле","августе","сентябре","октябре","ноябре","декабре"];
const wrFmtDay=d=>d.toLocaleDateString("ru-RU",{day:"numeric",month:"long"});
function wrMonthsSVG(D,big){
  const mx=Math.max(1,...D.months),W=600,H=big?190:150,P=22,bw=(W-P*2)/12;
  return `<svg viewBox="0 0 ${W} ${H}" class="wr-svg" role="img" aria-label="Проектов по месяцам">
    ${D.months.map((v,i)=>{const h=v?Math.max(4,(H-P*2-14)*v/mx):2,x=P+i*bw+bw*.14,y=H-P-h;
      return `<g><rect class="wr-bar${i===D.mi&&v?" top":""}" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${(bw*.72).toFixed(1)}" height="${h.toFixed(1)}" rx="4" style="--d:${i*45}ms"><title>${MONTHS[i]}: ${v}</title></rect>${v?`<text x="${(x+bw*.36).toFixed(1)}" y="${(y-5).toFixed(1)}" class="wr-v">${v}</text>`:""}<text x="${(x+bw*.36).toFixed(1)}" y="${H-6}" class="wr-m">${MONTHS[i].slice(0,3).toLowerCase()}</text></g>`}).join("")}</svg>`;
}
function wrRing(p){
  const r=52,c=2*Math.PI*r;
  return `<svg viewBox="0 0 130 130" class="wr-ring"><circle cx="65" cy="65" r="${r}" class="bg"/><circle cx="65" cy="65" r="${r}" class="fg" stroke-dasharray="${(c*p/100).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 65 65)"/><text x="65" y="73" text-anchor="middle" class="wr-pct">${p}%</text></svg>`;
}
/* ---------- вкладка аналитики ---------- */
function vWrapped(){
  const ys=wrYears();
  if(!ys.length)return `<div class="empty">«Лисий год» строится по датам просмотра. Укажите «Дату просмотра» у просмотренных проектов (в окне «Изменить») — и здесь появятся итоги года.<br><br><span class="dim">Новые оценки запоминают дату сами.</span></div>`;
  if(!ys.includes(WR.y))WR.y=ys.includes(new Date().getFullYear())?new Date().getFullYear():ys[0];
  const D=wrData(WR.y),R=DB.raters;
  if(!D.n)return `<div class="ptitle"><div><h1>Лисий год</h1></div><div class="chips">${ys.map(y=>`<button class="chip ${y===WR.y?"on":""}" data-wr="year" data-y="${y}">${y}</button>`).join("")}</div></div><div class="empty">В ${WR.y} году ничего не отмечено просмотренным.</div>`;
  const hrs=D.minutes/60;
  const kpis=`<div class="kpis"><div class="kpi"><span>Проектов</span><b>${D.n}</b></div><div class="kpi"><span>Часов кино</span><b>${hrs>=10?Math.round(hrs):f1(hrs)}</b></div>${D.per.map(p=>`<div class="kpi"><span>${esc(p.n)} · средняя</span><b>${isNum(p.avg)?f1(p.avg):"—"}</b></div>`).join("")}<div class="kpi"><span>Совпадение вкусов</span><b>${D.compat!=null?D.compat+"%":"—"}</b></div></div>`;
  const catRows=QZ_CATS.filter(c=>D.byCat[c[0]]).map(c=>`<tr><td>${c[1]}</td><td class="c"><b>${D.byCat[c[0]]}</b></td><td><div class="qbar c0"><i style="width:${Math.round(D.byCat[c[0]]/D.n*100)}%"></i></div></td></tr>`).join("");
  const gRows=D.genres.slice(0,8).map(g=>`<tr><td>${esc(g.g)}</td><td class="c"><b>${g.n}</b></td><td class="c">${isNum(g.avg)?scBadge(g.avg,"sm"):"—"}</td></tr>`).join("");
  const tRows=D.top.slice(0,7).map((x,i)=>`<tr data-open="${esc(x.it.id)}" style="cursor:pointer"><td class="c dim">${i+1}</td><td>${esc(x.it.title)}</td><td class="c">${scBadge(x.sc,"sm")}</td><td class="dim">${esc(wrFmtDay(x.d))}</td></tr>`).join("");
  const pRows=D.per.map(p=>`<tr><td><b>${esc(p.n)}</b></td><td class="c">${isNum(p.avg)?scBadge(p.avg,"sm"):"—"}</td><td>${p.fav?esc(p.fav.it.title)+" "+scBadge(p.fav.s,"sm"):"—"}</td><td>${p.fg?esc(p.fg.g)+" <small class='dim'>"+f1(p.fg.m)+"</small>":"<span class='dim'>мало данных</span>"}</td></tr>`).join("");
  return `<div class="ptitle"><div><h1>Лисий год ${WR.y}</h1><p>${D.n} ${plural(D.n,"проект","проекта","проектов")} за год${D.started?` (из них ${D.started} ещё в процессе)`:""}${D.undated?` · ещё ${D.undated} без даты просмотра`:""}</p></div>
    <div class="row" style="gap:8px;flex-wrap:wrap"><div class="chips">${ys.map(y=>`<button class="chip ${y===WR.y?"on":""}" data-wr="year" data-y="${y}">${y}</button>`).join("")}</div><button class="btn pri" data-wr="story">▶ Смотреть итоги</button></div></div>
  ${kpis}
  <div class="wr-grid">
    <div class="panel"><h3>По месяцам</h3>${wrMonthsSVG(D)}<p class="dim" style="margin:6px 0 0;font-size:13px">Самый кино-активный месяц — <b style="color:var(--tx)">${MONTHS[D.mi]}</b> (${D.months[D.mi]}).${D.busiest&&D.busiest.n>1?` Рекордный день — ${wrFmtDay(D.busiest.d)}: ${D.busiest.n} ${plural(D.busiest.n,"проект","проекта","проектов")}.`:""}${D.noDur?` У ${D.noDur} без длительности — в часы не вошли.`:""}</p></div>
    <div class="panel"><h3>Что смотрели</h3><div class="tbl-wrap"><table class="t"><tbody>${catRows}</tbody></table></div></div>
    <div class="panel"><h3>Жанры года</h3><div class="tbl-wrap"><table class="t"><thead><tr><th>Жанр</th><th>Проектов</th><th>Оценка</th></tr></thead><tbody>${gRows}</tbody></table></div></div>
    <div class="panel"><h3>Лучшее за год</h3>${tRows?`<div class="tbl-wrap"><table class="t"><thead><tr><th></th><th>Проект</th><th>Итог</th><th>Просмотрен</th></tr></thead><tbody>${tRows}</tbody></table></div>`:`<p class="dim">Оценок пока нет.</p>`}</div>
    <div class="panel"><h3>Каждый по отдельности</h3><div class="tbl-wrap"><table class="t"><thead><tr><th></th><th>Средняя</th><th>Любимый проект</th><th>Любимый жанр</th></tr></thead><tbody>${pRows}</tbody></table></div>
      ${D.hot&&D.hot.d>=1?`<p class="dim" style="margin:10px 0 0;font-size:13px">⚔ Больше всего спорили: <b style="color:var(--tx)">${esc(D.hot.it.title)}</b> — ${esc(R[0])} ${f1(D.hot.a)} против ${esc(R[1])} ${f1(D.hot.b)}.</p>`:""}</div>
    <div class="panel"><h3>Звания года</h3>${D.badges.length?`<div class="wr-badges">${D.badges.map(b=>`<div class="wr-badge"><span>${b[0]}</span><div><b>${esc(b[1])}</b><small>${esc(b[2])}</small></div></div>`).join("")}</div>`:`<p class="dim">Звания появятся, когда в году наберётся побольше оценок.</p>`}</div>
  </div>`;
}
/* ---------- истории ---------- */
function wrSlides(D){
  const R=D.R,S=[],hrs=D.minutes/60,fox=(document.querySelector(".sb-logo svg")||{outerHTML:""}).outerHTML;
  const bigNum=(v,suf="")=>`<div class="wr-big"><span data-count>${v}</span>${suf}</div>`;
  S.push({g:"g1",html:`<div class="wr-fox">${fox}</div><div class="wr-k">Наш</div><h1 class="wr-h">Лисий год</h1><div class="wr-year">${D.y}</div><div class="wr-sub">${R.map(esc).join(" и ")}<br>итоги кино-года</div>`});
  const days=hrs/24;
  S.push({g:"g2",html:`<div class="wr-k">За год вы посмотрели или начали</div>${bigNum(D.n)}<div class="wr-lab">${plural(D.n,"проект","проекта","проектов")}${D.started?` · ${D.started} ещё смотрим`:""}</div>
    ${D.minutes?`<div class="wr-line">Это ≈ <b>${hrs>=10?Math.round(hrs):f1(hrs)} ч</b> перед экраном${days>=1?` — целых <b>${days>=10?Math.round(days):f1(days)} сут.</b> подряд без сна и еды`:""}</div>`:""}
    <div class="wr-pills">${QZ_CATS.filter(c=>D.byCat[c[0]]).map(c=>`<span>${c[1]} · ${D.byCat[c[0]]}</span>`).join("")}</div>`});
  S.push({g:"g3",html:`<div class="wr-k">Кино-календарь</div>${wrMonthsSVG(D,true)}<div class="wr-line">Больше всего — в <b>${MONTHS_IN[D.mi]}</b>: ${D.months[D.mi]} ${plural(D.months[D.mi],"проект","проекта","проектов")}${D.busiest&&D.busiest.n>1?`<br>Рекордный день — ${wrFmtDay(D.busiest.d)}: ${D.busiest.n} за день`:""}</div>`});
  if(D.genres.length){const mx=D.genres[0].n;S.push({g:"g4",html:`<div class="wr-k">Главные жанры</div><div class="wr-gen">${D.genres.slice(0,4).map((g,i)=>`<div class="wr-gr"><span class="wr-gn">${i+1}</span><div><b>${esc(g.g)}</b><div class="wr-gb"><i style="width:${Math.round(g.n/mx*100)}%;--d:${i*120}ms"></i></div></div><span class="wr-gc">${g.n}</span></div>`).join("")}</div><div class="wr-line">${isNum(D.genres[0].avg)?`В жанре «${esc(D.genres[0].g)}» средняя оценка — <b>${f1(D.genres[0].avg)}</b>`:""}</div>`})}
  if(D.top.length){const t=D.top[0];S.push({g:"g5",html:`<div class="wr-k">Лучшее за год</div><div class="wr-top"><div class="poster">${posterHTML(t.it)}</div></div><h2 class="wr-t">${esc(t.it.title)}</h2><div class="wr-sc">${scBadge(t.sc,"big")}</div>
    ${D.top.length>1?`<div class="wr-next">${D.top.slice(1,4).map((x,i)=>`<span>${i+2}. ${esc(x.it.title)} <b>${f1(x.sc)}</b></span>`).join("")}</div>`:""}`})}
  if(D.per.some(p=>isNum(p.avg))){const harsh=D.per.filter(p=>isNum(p.avg)).sort((a,b)=>a.avg-b.avg);
    S.push({g:"g6",html:`<div class="wr-k">Каждый по-своему</div><div class="wr-per">${D.per.map(p=>`<div class="wr-pc"><b>${esc(p.n)}</b><div class="wr-avg">${isNum(p.avg)?f1(p.avg):"—"}</div><small>средняя оценка</small>${p.fav?`<div class="wr-pf">❤ ${esc(p.fav.it.title)}</div>`:""}${p.fg?`<div class="wr-pf">🎭 ${esc(p.fg.g)}</div>`:""}</div>`).join("")}</div>${harsh.length>1?`<div class="wr-line">Строже в этом году — <b>${esc(harsh[0].n)}</b> (на ${f1(harsh[1].avg-harsh[0].avg)})</div>`:""}`})}
  if(D.compat!=null)S.push({g:"g7",html:`<div class="wr-k">Совпадение вкусов</div>${wrRing(D.compat)}<div class="wr-line">${D.compat>=82?"Почти всегда на одной волне":D.compat>=65?"Вкусы близки, но спорить интересно":"Спорите — значит, неравнодушны!"}</div>${D.hot&&D.hot.d>=1?`<div class="wr-hot">⚔ ${esc(D.hot.it.title)}<br><small>${esc(R[0])} ${f1(D.hot.a)} · ${esc(R[1])} ${f1(D.hot.b)}</small></div>`:""}`});
  S.push({g:"g8",html:`<div class="wr-k">Звания ${D.y} года</div>${D.badges.length?`<div class="wr-badges big">${D.badges.slice(0,4).map(b=>`<div class="wr-badge"><span>${b[0]}</span><div><b>${esc(b[1])}</b><small>${esc(b[2])}</small></div></div>`).join("")}</div>`:`<div class="wr-line">Хороший год — и это только начало!</div>`}
    <div class="wr-end"><button class="btn pri" data-wr="copy">📋 Скопировать итоги</button><button class="btn" data-wr="restart">↺ Сначала</button></div><div class="wr-sub">До встречи в ${D.y+1}! 🦊</div>`});
  return S;
}
function wrText(D){
  const L=[`🦊 Наш Лисий год ${D.y}`,`• ${D.n} ${plural(D.n,"проект","проекта","проектов")}${D.minutes?`, ≈ ${Math.round(D.minutes/60)} ч`:""}`];
  if(D.genres[0])L.push(`• Главный жанр: ${D.genres[0].g}`);
  if(D.top[0])L.push(`• Лучшее: ${D.top[0].it.title} (${f1(D.top[0].sc)})`);
  D.per.forEach(p=>{if(isNum(p.avg))L.push(`• ${p.n}: средняя ${f1(p.avg)}`)});
  if(D.compat!=null)L.push(`• Совпадение вкусов: ${D.compat}%`);
  if(D.badges.length)L.push(`• ${D.badges.slice(0,3).map(b=>b[0]+" "+b[1]).join(" · ")}`);
  return L.join("\n");
}
const WR_MS=7000;
function openWrapped(y){
  const D=wrData(y);if(!D.n){toast("В этом году пока нечего показывать");return}
  WR.data=D;WR.slides=wrSlides(D);WR.i=0;
  const d=showDlg(`<div class="wr-wrap"><div class="wr-bars">${WR.slides.map((_,i)=>`<i data-i="${i}"><b></b></i>`).join("")}</div><button class="wr-x" data-close aria-label="Закрыть">✕</button><div class="wr-slide" id="wrSlide"></div><button class="wr-zone l" data-wr="prev" aria-label="Назад"></button><button class="wr-zone r" data-wr="next" aria-label="Дальше"></button></div>`,"dlg2");
  d.classList.add("wr");d.addEventListener("close",()=>{d.classList.remove("wr");foxHide()},{once:true});
  wrShow(0);foxSay("wrapped");
}
function wrShow(i){
  i=Math.max(0,Math.min(WR.slides.length-1,i));WR.i=i;
  const sl=$("#wrSlide");if(!sl)return;
  const s=WR.slides[i];
  sl.className="wr-slide "+s.g;sl.innerHTML=`<div class="wr-in">${s.html}</div>`;
  $$(".wr-bars i").forEach((b,k)=>{b.className=k<i?"done":k===i?"cur":"";const f=b.firstChild;f.style.animation="none";void f.offsetWidth;
    if(k===i&&i<WR.slides.length-1&&fxOn()){f.style.animation=`wrFill ${WR_MS}ms linear forwards`;f.onanimationend=()=>wrShow(WR.i+1)}else f.onanimationend=null});
  fxCount(sl);
}
document.addEventListener("click",e=>{
  const t=e.target.closest&&e.target.closest("[data-wr]");if(!t)return;
  e.stopPropagation();e.preventDefault();
  const a=t.dataset.wr;
  if(a==="year"){WR.y=+t.dataset.y;render()}
  else if(a==="story")openWrapped(WR.y);
  else if(a==="next")wrShow(WR.i+1);
  else if(a==="prev")wrShow(WR.i-1);
  else if(a==="restart")wrShow(0);
  else if(a==="copy"){const txt=wrText(WR.data);(navigator.clipboard?navigator.clipboard.writeText(txt):Promise.reject()).then(()=>toast("Итоги скопированы — можно вставлять в чат")).catch(()=>{prompt("Скопируйте текст:",txt)})}
},true);
document.addEventListener("keydown",e=>{
  const d=$("#dlg2");if(!d||!d.open||!d.classList.contains("wr"))return;
  if(e.key==="ArrowRight"||e.key===" "){wrShow(WR.i+1);e.preventDefault()}else if(e.key==="ArrowLeft"){wrShow(WR.i-1);e.preventDefault()}
});
/* пауза при удержании */
document.addEventListener("pointerdown",e=>{if(e.target.closest&&e.target.closest("#dlg2.wr .wr-zone"))$("#dlg2").classList.add("hold")},true);
["pointerup","pointercancel","pointerleave"].forEach(ev=>document.addEventListener(ev,()=>$("#dlg2")&&$("#dlg2").classList.remove("hold"),true));
/* Плиточная карта мира: [x,y] клетки для каждой страны (код ISO 3166-1 alpha-2). Сгенерировано legacy/geo_layout.py */
const GEO_GRID={w:45,h:22,t:{"RU":[35,2],"CA":[0,4],"US":[1,8],"CN":[35,9],"BR":[6,17],"AU":[39,19],"IN":[32,11],"AR":[5,20],"KZ":[31,6],"DZ":[16,10],"CD":[21,16],"SA":[26,11],"MX":[1,11],"ID":[37,16],"SD":[23,13],"LY":[19,10],"IR":[28,9],"MN":[35,6],"PE":[3,17],"TD":[20,13],"NE":[18,12],"AO":[20,17],"ML":[14,12],"ZA":[21,20],"CO":[4,15],"ET":[25,14],"BO":[5,18],"MR":[13,12],"EG":[23,11],"TZ":[24,16],"NG":[17,14],"VE":[4,14],"NA":[19,19],"MZ":[24,18],"PK":[31,10],"TR":[24,8],"CL":[4,20],"ZM":[22,17],"MM":[34,11],"AF":[31,9],"SS":[23,14],"SO":[27,14],"CF":[20,14],"UA":[23,5],"MG":[27,18],"BW":[21,19],"KE":[25,15],"FR":[16,6],"YE":[27,12],"TH":[35,13],"ES":[14,8],"TM":[30,8],"CM":[18,14],"PG":[40,16],"SE":[19,2],"UZ":[30,7],"MA":[14,10],"IQ":[26,9],"PY":[5,19],"ZW":[23,18],"JP":[39,9],"DE":[18,5],"CG":[19,15],"FI":[22,2],"VN":[35,12],"MY":[35,15],"NO":[18,2],"CI":[14,14],"PL":[20,5],"OM":[29,11],"IT":[18,7],"PH":[37,13],"EC":[3,15],"BF":[15,13],"NZ":[43,21],"GA":[18,15],"GN":[13,13],"GB":[15,4],"UG":[23,15],"GH":[15,14],"RO":[21,6],"LA":[35,11],"GY":[5,14],"BY":[22,4],"KG":[32,7],"SN":[12,13],"SY":[25,9],"KH":[36,13],"UY":[6,20],"SR":[5,15],"TN":[18,9],"BD":[33,11],"NP":[33,10],"TJ":[31,8],"GR":[21,8],"NI":[2,13],"AE":[28,11],"AL":[20,7],"AM":[26,8],"AT":[19,6],"AZ":[27,8],"BA":[19,7],"BE":[16,5],"BG":[22,7],"BH":[28,10],"BI":[23,16],"BJ":[16,14],"BN":[36,14],"BS":[3,11],"BT":[34,10],"BZ":[2,12],"CH":[17,6],"CR":[3,13],"CU":[3,12],"CY":[23,9],"CZ":[19,5],"DJ":[26,13],"DK":[18,4],"DO":[4,12],"EE":[21,3],"ER":[25,13],"FJ":[44,18],"GE":[26,7],"GL":[7,0],"GM":[11,13],"GQ":[17,15],"GT":[1,12],"GW":[12,14],"HK":[36,11],"HN":[1,13],"HR":[20,6],"HT":[4,11],"HU":[21,5],"IE":[13,4],"IL":[24,10],"IS":[11,1],"JM":[4,13],"JO":[24,9],"KP":[38,8],"KR":[38,9],"KW":[27,10],"LB":[25,10],"LK":[32,14],"LR":[13,14],"LS":[22,20],"LT":[21,4],"LU":[17,5],"LV":[22,3],"MD":[22,6],"ME":[21,7],"MK":[20,8],"MT":[19,9],"MU":[29,18],"MV":[32,15],"MW":[24,17],"NC":[42,19],"NL":[17,4],"PA":[3,14],"PR":[5,12],"PS":[23,10],"PT":[13,8],"QA":[27,11],"RS":[19,8],"RW":[22,16],"SG":[36,15],"SI":[18,6],"SK":[20,4],"SL":[12,15],"SV":[2,14],"SZ":[23,19],"TG":[16,13],"TL":[38,17],"TT":[5,13],"TW":[37,11],"XK":[22,8]}};
/* ============ География: страны и языки (вкладка «Аналитика» → «🗺 География») ============
   Страны и язык оригинала берутся из TMDB (it.geo = {c:["US","GB"], l:"en"}) — нужен ключ TMDB.
   Подтягиваются в фоне при открытии вкладки (3 запроса одновременно) и сохраняются в записи.
   Карта — плиточная: одна плитка на страну (раскладка в 356-geo-data.js). */
const GEO={busy:false,done:0,total:0,sel:null,quest:null};
const GEO_STARS=["JP","KR","FR","IN","MX","ES","IT","DE","SE","DK","IR","TR","BR","AR","PL","CN","TH","NG","EG","RU","AU","CA","NZ","IE","NO","FI","IS","CZ","GR","CO"];
let GEO_RN=null,GEO_LN=null;
try{GEO_RN=new Intl.DisplayNames(["ru"],{type:"region"});GEO_LN=new Intl.DisplayNames(["ru"],{type:"language"})}catch(e){logErr("Названия стран",e,1)}
const geoCountry=c=>{try{return(GEO_RN&&GEO_RN.of(c))||c}catch(e){return c}};
const GEO_LX={xx:"Без речи",cn:"Кантонский",sh:"Сербохорватский"};
const geoLang=l=>{if(GEO_LX[l])return GEO_LX[l];try{const n=GEO_LN&&GEO_LN.of(l);return n&&n!==l?n.charAt(0).toUpperCase()+n.slice(1):l}catch(e){return l}};
/* что вытащить из ответа TMDB */
function tmdbGeo(kind,d){
  const c1=(d.origin_country||[]).filter(Boolean),c2=(d.production_countries||[]).map(x=>x.iso_3166_1).filter(Boolean);
  const c=kind==="tv"?(c1.length?c1:c2):(c2.length?c2:c1);
  return{c:[...new Set(c)],l:d.original_language||""};
}
async function geoEnsure(){
  if(GEO.busy||!apiKey("tmdb"))return;
  const todo=DB.items.filter(i=>i.tmdb&&i.tmdb.id&&!i.geo&&!(i.geoTry&&Date.now()-i.geoTry<7*864e5));
  if(!todo.length)return;
  GEO.busy=true;GEO.total=todo.length;GEO.done=0;let ch=0;
  const worker=async()=>{
    while(todo.length){
      const it=todo.shift();
      try{const d=await tmdbGet(`/${it.tmdb.type}/${it.tmdb.id}`,{language:"ru-RU"});it.geo=tmdbGeo(it.tmdb.type,d);delete it.geoTry;ch++}
      catch(e){it.geoTry=Date.now()}
      GEO.done++;const p=$("#geoProg");if(p)p.textContent=`Загружаю страны и языки: ${GEO.done} из ${GEO.total}…`;
    }
  };
  await Promise.all([worker(),worker(),worker()]);
  GEO.busy=false;
  if(ch)save();
  if(UI.tab==="analytics"&&UI.sub==="geo")render();
}
function geoStats(){
  const C=new Map(),L=new Map();let have=0,miss=0;
  const add=(m,k,it)=>{let o=m.get(k);if(!o){o={k,items:[],s:[],per:DB.raters.map(()=>[])};m.set(k,o)}o.items.push(it);const sc=itemScore(it);if(isNum(sc))o.s.push(sc);DB.raters.forEach((n,i)=>{const v=itemScore(it,n);if(isNum(v))o.per[i].push(v)})};
  for(const it of DB.items){
    if(it.status!=="watched")continue;
    if(!it.geo||!(it.geo.c||[]).length&&!it.geo.l){miss++;continue}
    have++;(it.geo.c||[]).forEach(c=>add(C,c,it));if(it.geo.l)add(L,it.geo.l,it);
  }
  const fin=m=>[...m.values()].map(o=>Object.assign(o,{n:o.items.length,avg:avg(o.s),pa:o.per.map(a=>avg(a))})).sort((a,b)=>b.n-a.n||(b.avg||0)-(a.avg||0));
  return{C:fin(C),L:fin(L),have,miss,total:have+miss};
}
function geoMapSVG(G){
  const cm=new Map(G.C.map(o=>[o.k,o])),mx=Math.max(1,...G.C.map(o=>o.n)),S=24,gap=2,P=S+gap;
  const tiles=Object.entries(GEO_GRID.t).map(([c,[x,y]])=>{
    const o=cm.get(c),k=o?.35+.65*Math.log(o.n+1)/Math.log(mx+1):0,sel=GEO.sel===c;
    const tip=geoCountry(c)+(o?`: ${o.n} ${plural(o.n,"проект","проекта","проектов")}${isNum(o.avg)?`, средняя ${f1(o.avg)}`:""}`:" — пока ничего");
    return `<g class="gt${o?" on":""}${sel?" sel":""}" data-geo="${c}" transform="translate(${x*P},${y*P})"><rect width="${S}" height="${S}" rx="5" style="${o?`fill:color-mix(in srgb,var(--acc) ${Math.round(k*100)}%,var(--card2))`:""}"/><text x="${S/2}" y="${S/2+3.4}" text-anchor="middle" class="${o&&k>.62?"hi":""}">${c}</text><title>${esc(tip)}</title></g>`;
  }).join("");
  return `<svg viewBox="0 0 ${GEO_GRID.w*P} ${GEO_GRID.h*P}" class="geo-svg" role="img" aria-label="Карта-мозаика: страны, откуда вы смотрели кино">${tiles}</svg>`;
}
function geoRows(list,nameFn,lim){
  const mx=Math.max(1,...list.map(o=>o.n));
  return list.slice(0,lim).map(o=>`<tr><td>${esc(nameFn(o.k))}</td><td class="c"><b>${o.n}</b></td><td style="min-width:90px"><div class="qbar c0"><i style="width:${Math.round(o.n/mx*100)}%"></i></div></td><td class="c">${isNum(o.avg)?scBadge(o.avg,"sm"):"—"}</td>${DB.raters.map((n,i)=>`<td class="c">${isNum(o.pa[i])?f1(o.pa[i]):"<span class='dim'>·</span>"}</td>`).join("")}</tr>`).join("");
}
function vGeo(){
  const G=geoStats(),key=!!apiKey("tmdb"),R=DB.raters;
  const watched=DB.items.filter(i=>i.status==="watched").length;
  const head=`<div class="ptitle"><div><h1>География кино</h1><p>Откуда ваше кино: страны производства и язык оригинала</p></div></div>`;
  if(!G.have){
    return head+`<div class="empty">${key?`<span id="geoProg">${GEO.busy?`Загружаю страны и языки: ${GEO.done} из ${GEO.total}…`:"Данных о странах пока нет — они подтянутся из TMDB автоматически. Если ничего не происходит, свяжите проекты с TMDB (кнопка «Заполнить из TMDB» в окне «Изменить»)."}</span>`:`Страны и языки берутся из TMDB. Добавьте ключ TMDB во вкладке <a href="#data">«Данные»</a> — и карта заполнится сама.`}</div>`;
  }
  const sel=GEO.sel&&G.C.find(o=>o.k===GEO.sel);
  const top=G.C[0],unseen=GEO_STARS.filter(c=>!G.C.some(o=>o.k===c));
  if(!GEO.quest||!unseen.includes(GEO.quest))GEO.quest=unseen.length?unseen[Math.floor(Math.random()*unseen.length)]:null;
  const pct=Math.round(G.C.length/Object.keys(GEO_GRID.t).length*100);
  return head+`
  <div class="kpis"><div class="kpi"><span>Стран</span><b>${G.C.length}</b></div><div class="kpi"><span>Языков оригинала</span><b>${G.L.length}</b></div><div class="kpi"><span>Любимая страна</span><b class="geo-fav">${top?esc(geoCountry(top.k)):"—"}</b></div><div class="kpi"><span>Открыто на карте</span><b>${pct}%</b></div><div class="kpi"><span>Проектов с данными</span><b>${G.have}</b><small class="dim"> из ${watched}</small></div></div>
  ${G.miss&&key?`<p class="dim" id="geoProg" style="margin:-6px 0 12px;font-size:13px">${GEO.busy?`Загружаю страны и языки: ${GEO.done} из ${GEO.total}…`:`У ${G.miss} ${plural(G.miss,"проекта","проектов","проектов")} нет данных о стране (не связаны с TMDB).`}</p>`:""}
  ${!key?`<p class="rnote">Чтобы данные обновлялись, добавьте ключ TMDB во вкладке «Данные».</p>`:""}
  <div class="panel geo-map"><h3>Карта-мозаика <small class="dim">один квадрат — одна страна, чем ярче, тем больше проектов</small></h3>${geoMapSVG(G)}
    <div class="geo-leg"><span>меньше</span><i style="background:color-mix(in srgb,var(--acc) 35%,var(--card2))"></i><i style="background:color-mix(in srgb,var(--acc) 60%,var(--card2))"></i><i style="background:color-mix(in srgb,var(--acc) 85%,var(--card2))"></i><i style="background:var(--acc)"></i><span>больше</span><span class="dim" style="margin-left:auto">нажмите на квадрат, чтобы увидеть проекты</span></div>
    ${sel?`<div class="geo-sel"><h4>${esc(geoCountry(sel.k))} · ${sel.n} ${plural(sel.n,"проект","проекта","проектов")}</h4><div class="geo-items">${sel.items.map(it=>`<div class="geo-it" data-open="${esc(it.id)}" title="${esc(it.title)}"><div class="poster">${posterHTML(it,false)}</div><span>${esc(it.title)}</span>${scBadge(itemScore(it),"sm")}</div>`).join("")}</div></div>`:""}</div>
  <div class="wr-grid" style="margin-top:16px">
    <div class="panel"><h3>Страны</h3><div class="tbl-wrap"><table class="t"><thead><tr><th>Страна</th><th>Проектов</th><th></th><th>Оценка</th>${R.map(n=>`<th>${esc(n)}</th>`).join("")}</tr></thead><tbody>${geoRows(G.C,geoCountry,14)}</tbody></table></div>${G.C.length>14?`<p class="dim" style="margin:8px 0 0;font-size:12.5px">Показаны 14 из ${G.C.length}. Остальные — на карте.</p>`:""}</div>
    <div class="panel"><h3>Языки оригинала</h3><div class="tbl-wrap"><table class="t"><thead><tr><th>Язык</th><th>Проектов</th><th></th><th>Оценка</th>${R.map(n=>`<th>${esc(n)}</th>`).join("")}</tr></thead><tbody>${geoRows(G.L,geoLang,12)}</tbody></table></div>
      ${(()=>{const n=G.L.filter(o=>o.k!=="en").reduce((s,o)=>s+o.n,0),all=G.L.reduce((s,o)=>s+o.n,0);return all?`<p class="dim" style="margin:8px 0 0;font-size:13px">Не на английском: <b style="color:var(--tx)">${Math.round(n/all*100)}%</b> проектов.</p>`:""})()}</div>
  </div>
  ${GEO.quest?`<div class="panel geo-quest"><h3>🎯 Задание на вечер</h3><p style="margin:0 0 10px">Вы ещё не смотрели ничего из страны — <b>${esc(geoCountry(GEO.quest))}</b>. Заглянуть в каталог за подходящим фильмом?</p><div class="row" style="gap:8px;flex-wrap:wrap"><button class="btn pri" data-geoact="catalog">В каталог</button><button class="btn" data-geoact="reroll">🎲 Другая страна</button><span class="dim" style="font-size:12.5px">Ещё не открыто: ${unseen.slice(0,10).map(geoCountry).join(", ")}${unseen.length>10?"…":""}</span></div></div>`:""}`;
}
{const b=render;render=function(top){b(top);if(UI.tab==="analytics"&&UI.sub==="geo")geoEnsure()}}
document.addEventListener("click",e=>{
  const g=e.target.closest&&e.target.closest("[data-geo]"),a=e.target.closest&&e.target.closest("[data-geoact]");
  if(!g&&!a)return;
  e.stopPropagation();e.preventDefault();
  if(g){GEO.sel=GEO.sel===g.dataset.geo?null:g.dataset.geo;render();return}
  if(a.dataset.geoact==="reroll"){GEO.quest=null;render()}
  else if(a.dataset.geoact==="catalog"){UI.tab="catalog";saveUI();location.hash="catalog";render(true);foxSay("geo")}
},true);
/* ============ резервные копии ============
   Копии лежат в IndexedDB этого браузера (ключ "snaps"). В копию не входят фото-картинки (data:…),
   при восстановлении текущие фото остаются на месте. Виды: auto — само, раз в ~6 ч при изменениях;
   manual — по кнопке; safety — перед импортом «Заменить», сбросом и восстановлением. */
const SNAP_KEY="snaps";
const SNAP_LIMIT={auto:8,manual:10,safety:4};
const SNAP_KIND={auto:"авто",manual:"вручную",safety:"страховка"};
let SNAPS=null,snapDeb=0;
async function snapLoad(){if(SNAPS)return SNAPS;const a=await IDB.get(SNAP_KEY);SNAPS=Array.isArray(a)?a:[];return SNAPS}
function snapJSON(){const d=clone(DB);d.items.forEach(i=>{if(typeof i.poster==="string"&&i.poster.startsWith("data:"))i.poster=""});return JSON.stringify(d)}
function snapHash(s){let h=5381;for(let i=0;i<s.length;i++)h=((h<<5)+h+s.charCodeAt(i))|0;return h>>>0}
async function snapNow(kind="manual",note=""){
  if(!DB)return null;
  const json=snapJSON(),h=snapHash(json),t=Date.now(),n=DB.items.length,w=DB.items.filter(i=>i.status==="watched").length;/* снимок берём сразу, до любых await */
  await snapLoad();
  const last=SNAPS.filter(s=>s.kind===kind).slice(-1)[0];
  if(kind==="auto"&&last&&last.h===h)return null;
  const s={id:"s"+t.toString(36)+Math.random().toString(36).slice(2,5),t,kind,note,h,n,w,bytes:json.length,json};
  SNAPS.push(s);
  for(const k in SNAP_LIMIT){const L=SNAPS.filter(x=>x.kind===k);while(L.length>SNAP_LIMIT[k])SNAPS.splice(SNAPS.indexOf(L.shift()),1)}
  await IDB.set(SNAP_KEY,SNAPS);
  snapPaint();
  return s;
}
async function snapMaybe(){await snapLoad();const last=SNAPS.filter(s=>s.kind==="auto").pop();if(last&&Date.now()-last.t<6*3600e3)return;snapNow("auto","автоматически")}
async function snapRestore(id){
  await snapLoad();const s=SNAPS.find(x=>x.id===id);if(!s)return;
  if(!confirm(`Восстановить копию от ${fmtAt(s.t)}?\n\nТекущие данные сначала сохранятся как «страховочная» копия.`+(CLOUD&&CLOUD.room?"\n\nВнимание: облако включено — восстановление уйдёт и второму человеку.":"")))return;
  await snapNow("safety","перед восстановлением");
  const d=JSON.parse(s.json),cur=new Map(DB.items.map(i=>[i.id,i.poster]));
  d.items.forEach(i=>{if(!i.poster){const p=cur.get(i.id);if(p)i.poster=p}});
  DB=normalize(d);commit();toast("Данные восстановлены из копии от "+fmtAt(s.t,false));
}
/* реакция на изменения данных */
{
  const sv=save;save=function(){sv();clearTimeout(snapDeb);snapDeb=setTimeout(snapMaybe,60000)};
  const di=doImport;doImport=async function(f){if(impMode==="replace")await snapNow("safety","перед импортом");return di(f)};
  setTimeout(()=>{if(DB)snapMaybe()},12000);
}
const snapSize=b=>b>=1e6?(b/1e6).toFixed(1)+" МБ":Math.max(1,Math.round(b/1e3))+" КБ";
function backupPanel(){
  return `<div class="panel" id="bakP" style="grid-column:1/-1"><h3>💾 Резервные копии</h3>
    <p>Копии хранятся в этом браузере. Сама создаётся примерно раз в 6 часов, если данные менялись (последние ${SNAP_LIMIT.auto}); перед импортом «Заменить», сбросом и восстановлением добавляется страховочная. Фото в копии не входят — при восстановлении ваши текущие фото остаются на месте.</p>
    <div class="row" style="gap:8px;flex-wrap:wrap;margin-bottom:10px"><button class="btn pri" data-bak="now">💾 Создать копию сейчас</button><span class="dim" id="bakNote"></span></div>
    <div id="bakBody"><span class="dim">Загружаю список…</span></div></div>`;
}
async function snapPaint(){
  const box=$("#bakBody");if(!box)return;
  const L=(await snapLoad()).slice().sort((a,b)=>b.t-a.t);
  if(!$("#bakBody"))return;
  let spark="";
  if(L.length>=3){
    const A=L.slice().reverse(),mx=Math.max(...A.map(s=>s.n)),mn=Math.min(...A.map(s=>s.n)),W=220,H=40,x=i=>6+i*(W-12)/(A.length-1),y=v=>mx===mn?H/2:H-6-(v-mn)/(mx-mn)*(H-12);
    spark=`<div class="bak-spark"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Число записей по копиям"><polyline fill="none" stroke="var(--acc)" stroke-width="2" points="${A.map((s,i)=>x(i).toFixed(1)+","+y(s.n).toFixed(1)).join(" ")}"/>${A.map((s,i)=>`<circle cx="${x(i).toFixed(1)}" cy="${y(s.n).toFixed(1)}" r="2.6" fill="var(--acc)"><title>${fmtAt(s.t,false)}: ${s.n} записей</title></circle>`).join("")}</svg><span class="dim">записей в копиях: ${A[0].n} → ${A[A.length-1].n}</span></div>`;
  }
  const tot=L.reduce((s,x)=>s+x.bytes,0);
  box.innerHTML=L.length?`${spark}<div class="tbl-wrap"><table class="t bak-t"><thead><tr><th>Дата</th><th>Вид</th><th>Записей</th><th>Просмотрено</th><th>Размер</th><th></th></tr></thead><tbody>${L.map(s=>`<tr><td>${esc(fmtAt(s.t))}</td><td><span class="bak-k ${s.kind}">${SNAP_KIND[s.kind]||s.kind}</span>${s.note?` <small class="dim">${esc(s.note)}</small>`:""}</td><td>${s.n}</td><td>${s.w}</td><td>${snapSize(s.bytes)}</td><td class="bak-act"><button class="btn sm" data-bak="restore" data-id="${s.id}">↩ Восстановить</button><button class="btn sm ghost" data-bak="dl" data-id="${s.id}" title="Скачать файл">⬇</button><button class="btn sm ghost" data-bak="del" data-id="${s.id}" title="Удалить копию">🗑</button></td></tr>`).join("")}</tbody></table></div>
    <p class="dim" style="font-size:12.5px;margin:8px 0 0">Всего копий: ${L.length} · ${snapSize(tot)}<span id="bakQuota"></span></p>`:`<p class="dim">Копий пока нет — первая появится автоматически или по кнопке выше.</p>`;
  try{const e=await navigator.storage.estimate();const q=$("#bakQuota");if(q&&e&&e.usage)q.textContent=` · браузер хранит всего ${snapSize(e.usage)} из ≈${snapSize(e.quota)}`}catch(e){}
}
{const base=render;render=function(top){base(top);if(UI.tab==="data")snapPaint()}}
document.addEventListener("click",async e=>{
  const t=e.target.closest&&e.target.closest("[data-bak]");if(!t)return;
  e.stopPropagation();e.preventDefault();
  const a=t.dataset.bak,id=t.dataset.id;
  if(a==="now"){const s=await snapNow("manual","по кнопке");if(s){toast("Копия создана");foxSay("backup")}}
  else if(a==="restore")snapRestore(id);
  else if(a==="dl"){await snapLoad();const s=SNAPS.find(x=>x.id===id);if(s){const d=new Date(s.t);download(`lisi-kopiya-${d.toISOString().slice(0,10)}-${String(d.getHours()).padStart(2,"0")}${String(d.getMinutes()).padStart(2,"0")}.json`,s.json);toast("Файл копии выгружен")}}
  else if(a==="del"){if(!confirm("Удалить эту копию?"))return;await snapLoad();SNAPS=SNAPS.filter(x=>x.id!==id);await IDB.set(SNAP_KEY,SNAPS);snapPaint()}
},true);
/* ============ GLOBAL SEARCH (Ctrl+K or /) ============ */
const GS={sel:0,res:[]};
const gsNorm=s=>String(s||"").toLowerCase().replace(/ё/g,"е").trim();
function gsSearch(q){
  q=gsNorm(q);if(!q)return [];
  const out=[],rank=(t)=>{const n=gsNorm(t);if(!n)return 0;if(n===q)return 100;if(n.startsWith(q))return 80;if(n.split(/[\s:—–-]+/).some(w=>w.startsWith(q)))return 60;if(n.includes(q))return 40;return 0};
  const grp={watched:"Просмотрено",watching:"Смотрим",planned:"В планах"};
  for(const it of DB.items){
    let r=Math.max(rank(it.title),rank(it.ext&&it.ext.en)*.95);
    if(!r&&(it.tags||[]).some(t=>gsNorm(t).includes(q.replace(/^#/,""))))r=30;
    if(!r&&it.genres.some(g=>gsNorm(g).startsWith(q)))r=20;
    if(!r&&String(it.year||"")===q)r=25;
    if(!r)continue;
    const sc=itemScore(it);
    out.push({r:r+(it.status==="watched"?3:0),g:grp[it.status]||"Записи",kind:"item",id:it.id,it,title:it.title,sub:[it.type,it.year,it.ext&&it.ext.en&&gsNorm(it.ext.en)!==gsNorm(it.title)?it.ext.en:""].filter(Boolean).join(" · "),sc});
  }
  for(const c of DB.catalog||[]){
    if(c.link&&c.link.itemId&&itemById(c.link.itemId))continue;
    const r=rank(c.title);if(!r)continue;
    out.push({r:r-5,g:"Каталог кинокомиксов",kind:"cat",id:c.id,title:c.title,sub:[c.franchise,c.year].filter(Boolean).join(" · ")});
  }
  out.sort((a,b)=>b.r-a.r||cmpRu(a.title,b.title));
  return out.slice(0,40);
}
function gsResultsHTML(){
  if(!GS.q)return `<div class="gs-empty">Введите название, английское название, #тег, жанр или год</div>`;
  if(!GS.res.length)return `<div class="gs-empty">Ничего не найдено по запросу «${esc(GS.q)}»</div>`;
  const order=["Просмотрено","Смотрим","В планах","Записи","Каталог кинокомиксов"];
  let html="",idx=0;
  for(const g of order){const L=GS.res.filter(x=>x.g===g);if(!L.length)continue;
    html+=`<div class="gs-g">${g} <small>${L.length}</small></div>`;
    html+=L.map(x=>{const i=GS.res.indexOf(x);idx++;return `<button class="gs-r${i===GS.sel?" on":""}" data-gi="${i}" role="option" aria-selected="${i===GS.sel}">
      <span class="mini">${x.it?posterHTML(x.it,false):`<span class="gs-ci"><i class="ico ico-comics"></i></span>`}</span>
      <span class="gs-t"><b>${esc(x.title)}</b><small>${esc(x.sub)}</small></span>
      ${x.kind==="item"&&isNum(x.sc)?scBadge(x.sc,"sm"):""}</button>`}).join("");
  }
  return html;
}
function gsPaint(){const b=$("#gsRes");if(!b)return;b.innerHTML=gsResultsHTML();const on=$(".gs-r.on",b);if(on)on.scrollIntoView({block:"nearest"})}
function gsOpen(){
  const d=$("#gsDlg");if(!DB||d.open)return;
  d.innerHTML=`<div class="gs-box"><div class="gs-in"><i class="ico ico-search"></i><input id="gsQ" placeholder="Поиск по всей коллекции…" autocomplete="off" spellcheck="false" aria-label="Глобальный поиск"><kbd>Esc</kbd></div><div class="gs-res" id="gsRes" role="listbox"></div><div class="gs-ft"><span><kbd>↑</kbd><kbd>↓</kbd> выбор</span><span><kbd>Enter</kbd> открыть</span><span><kbd>Ctrl</kbd><kbd>K</kbd> поиск</span></div></div>`;
  GS.q="";GS.res=[];GS.sel=0;d.showModal();gsPaint();
  const q=$("#gsQ",d);q.focus();
  q.addEventListener("input",()=>{GS.q=q.value.trim();GS.res=gsSearch(GS.q);GS.sel=0;gsPaint()});
  q.addEventListener("keydown",e=>{
    if(e.key==="ArrowDown"||e.key==="ArrowUp"){e.preventDefault();if(!GS.res.length)return;GS.sel=(GS.sel+(e.key==="ArrowDown"?1:-1)+GS.res.length)%GS.res.length;gsPaint()}
    else if(e.key==="Enter"){e.preventDefault();gsGo(GS.sel)}
  });
  $("#gsRes",d).addEventListener("click",e=>{const b=e.target.closest("[data-gi]");if(b)gsGo(+b.dataset.gi)});
  $("#gsRes",d).addEventListener("mousemove",e=>{const b=e.target.closest("[data-gi]");if(b&&+b.dataset.gi!==GS.sel){GS.sel=+b.dataset.gi;$$(".gs-r",d).forEach(x=>x.classList.toggle("on",x===b))}});
}
function gsGo(i){
  const x=GS.res[i];if(!x)return;const d=$("#gsDlg");d.close();
  if(x.kind==="cat"){openCatalog(x.id);return}
  openDetail(x.id,null);
}
(function(){
  const d=$("#gsDlg");
  d.addEventListener("click",e=>{if(e.target===d)d.close()});
  $("#searchBtn").addEventListener("click",gsOpen);
  document.addEventListener("keydown",e=>{
    const typing=e.target.matches&&e.target.matches("input,textarea,select,[contenteditable]");
    if((e.ctrlKey||e.metaKey)&&(e.key==="k"||e.key==="K"||e.code==="KeyK")){e.preventDefault();if($("#gsDlg").open)$("#gsDlg").close();else if(!$("dialog[open]"))gsOpen();return}
    if(e.key==="/"&&!typing&&!$("dialog[open]")){e.preventDefault();gsOpen()}
  });
})();

/* ============ запуск: кнопки шапки и инициализация ============ */
$("#cloudBtn").onclick=()=>{location.hash="data";if(UI.tab==="data")render();setTimeout(()=>$("#cloudP")?.scrollIntoView({behavior:"smooth",block:"center"}),60)};
$("#themeBtn").onclick=(e)=>{e.stopPropagation();toggleThemePicker()};
$("#fabBtn").onclick=()=>openEdit(null,{status:UI.tab==="plan"?"planned":"watched",type:UI.tab==="series"?"Сериал":"Фильм"});
$("#fileImp").onchange=e=>{const f=e.target.files[0];if(f)doImport(f);e.target.value=""};
document.addEventListener("keydown",e=>{if(e.key==="/"&&!e.target.matches("input,textarea,select")&&$("#q")){e.preventDefault();$("#q").focus()}});
(async()=>{
  applyTheme();
  const st=await IDB.get("db");
  DB=normalize(st&&st.items?st:clone(SEED));
  let tmdbN=0;if(!DB.tmdbApplied){tmdbN=applyTmdb(DB);save()}
  if(!DB.worldApplied){applyWorld(DB);save()}
  if(!st)save();
  if(tmdbN)setTimeout(()=>toast(`Добавлены данные из TMDB: ${tmdbN} ${plural(tmdbN,"запись","записи","записей")}`),400);
  let h=location.hash.slice(1);if(TABALIAS[h]){UI.sub=TABALIAS[h];h="analytics"}
  if(TABS.some(t=>t.id===h)&&!tabHidden(h))UI.tab=h;history.replaceState(null,"","#"+UI.tab);
  render(true);
  const inv=parseInvite(location.href);
  if(inv){const u=new URL(location.href);u.searchParams.delete("db");u.searchParams.delete("room");history.replaceState(null,"",u.pathname+u.search+u.hash);
    if(!joinCloud(inv,true))cloudConnect()}
  else cloudConnect();
  setTimeout(()=>fillPosters(true),2500);
})();
