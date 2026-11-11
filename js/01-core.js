/* Ablage – Kern: Zustand, Hilfen, Symbole, Penny, Rückmeldungen */
'use strict';
const VER=1;
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8);
const pad=n=>String(n).padStart(2,'0');
const ymd=t=>{const d=new Date(t);return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())};
const today0=()=>{const d=new Date();d.setHours(0,0,0,0);return d.getTime()};
const pD=s=>{const m=String(s||'').match(/^(\d{4})-(\d{2})-(\d{2})/);return m?new Date(+m[1],m[2]-1,+m[3]).getTime():null};
/* Datum TT.MM. im laufenden Jahr, sonst TT.MM.JJJJ */
const dShort=s=>{const t=pD(s);if(t==null)return'';const d=new Date(t);return pad(d.getDate())+'.'+pad(d.getMonth()+1)+'.'+(d.getFullYear()==new Date().getFullYear()?'':d.getFullYear())};
const dLong=s=>{const t=pD(s);if(t==null)return'';const d=new Date(t);return pad(d.getDate())+'.'+pad(d.getMonth()+1)+'.'+d.getFullYear()};
const daysTo=s=>{const t=pD(s);return t==null?null:Math.round((t-today0())/864e5)};
const eur=v=>(+v||0).toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2})+' €';
const pNum=s=>{if(typeof s=='number')return s;const t=String(s||'').replace(/[^\d,.-]/g,'');if(!t)return 0;const n=t.includes(',')?t.replace(/\./g,'').replace(',','.'):t;return Math.round((parseFloat(n)||0)*100)/100};
const mb=kb=>kb<1024?Math.round(kb)+' KB':(kb/1024).toLocaleString('de-DE',{maximumFractionDigits:1})+' MB';

/* Symbole (Strichzeichnungen 24×24) */
const IC={
 folder:'<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
 more:'<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>',
 vertrag:'<path d="M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v5h5M9 13h6M9 17h3"/><path d="M14 17.5l1.2 1.2 2.3-2.4"/>',
 rechnung:'<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6M9 16h3"/>',
 brief:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
 garantie:'<path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/><path d="M9 12l2 2 4-4"/>',
 reise:'<path d="M3 15l18-6-4 10-5-3-2 4-1-5z"/>',
 pers:'<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="11" r="2.2"/><path d="M5.5 16.5c.8-1.6 2-2.4 3.5-2.4s2.7.8 3.5 2.4M14 10h4M14 13h3"/>',
 sonst:'<path d="M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v5h5"/>',
 search:'<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>',
 cam:'<path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.5"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',
 sync:'<path d="M20 11a8 8 0 0 0-14.5-4.5L4 8M4 4v4h4M4 13a8 8 0 0 0 14.5 4.5L20 16M20 20v-4h-4"/>',
 cloudoff:'<path d="M3 3l18 18M8 7.5A6 6 0 0 1 17.7 10 4 4 0 0 1 20 17M17 19H7a4.5 4.5 0 0 1-1.6-8.7"/>',
 check:'<path d="M5 12.5l4.5 4.5L19 7.5"/>',
 spark:'<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z"/>',
 share:'<path d="M12 15V3M8 7l4-4 4 4M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1"/>',
 link:'<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
 lock:'<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
 alert:'<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17v.01"/>',
 file:'<path d="M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v5h5"/>'
};
const I=(n,s)=>`<svg class="i" viewBox="0 0 24 24"${s?` style="width:${s}px;height:${s}px"`:''} aria-hidden="true">${IC[n]||''}</svg>`;

/* Arten und ihre Felder. key: Feldname im Dokument, t: Typ (text|date|eur|status|ctr|bool|area), only: nur wenn Bedingung */
const ARTEN=[
 {k:'vertrag',n:'Vertrag',p:'Verträge'},{k:'rechnung',n:'Rechnung',p:'Rechnungen'},{k:'brief',n:'Bescheid/Brief',p:'Briefe'},
 {k:'garantie',n:'Garantie/Kaufbeleg',p:'Garantien'},{k:'reise',n:'Reisekosten',p:'Reisekosten'},{k:'pers',n:'Persönliches',p:'Persönliches'},{k:'sonst',n:'Sonstiges',p:'Sonstiges'}];
const ARTN=Object.fromEntries(ARTEN.map(a=>[a.k,a.n]));
const STAT={rechnung:[['offen','offen'],['bezahlt','bezahlt'],['strittig','strittig']],reise:[['offen','offen'],['eingereicht','eingereicht'],['erstattet','erstattet']]};
const FIELDS={
 vertrag:[['abs','Anbieter','text'],['vnr','Vertragsnr.','text'],['beginn','Beginn','date'],['laufzeit','Laufzeit','text','z. B. 24 Monate'],['ctr','In CashFlow','ctr'],['kfrist','Kündigen bis','date',null,d=>!d.ctr],['betrag','Kosten','eur',null,d=>!d.ctr]],
 rechnung:[['abs','Absender','text'],['betrag','Betrag','eur'],['faellig','Fällig am','date'],['iban','IBAN','text'],['vz','Verwendungszweck','text'],['status','Status','status'],['plan','In Prognose einplanen','bool']],
 brief:[['abs','Absender','text'],['frist','Frist','date','Antwort bis']],
 garantie:[['abs','Händler','text'],['geraet','Gerät','text'],['betrag','Kaufpreis','eur'],['gbis','Garantie bis','date']],
 reise:[['anlass','Anlass','text','Dienstreise …'],['von','Von','date'],['bis','Bis','date'],['betrag','Betrag','eur'],['eing','Eingereicht am','date'],['status','Status','status'],['plan','Erstattung einplanen','bool']],
 pers:[['abs','Aussteller','text','z. B. Stadt'],['gueltig','Gültig bis','date']],
 sonst:[['abs','Absender','text'],['frist','Frist','date']]
};

/* Zustand: liegt in IndexedDB (kv/state); A.docs ist die Ablage, A.base die Server-Revision */
let A={docs:[],base:null,cfg:{ki:true,model:'claude-haiku-5-5'},ki:{},v:1};
let CF={contracts:[],paid:{},at:0};   // gelesene CashFlow-Daten (nur lesen)
let tab='docs',filt='alle',q='',busy={};

/* Penny: Maskottchen beider Apps, hier mit blauer Mappe. m: ok | denkt | oops */
function penny(m,size){const c=m=='oops'?'#F87171':m=='denkt'?'#FB923C':'#4ADE80',w='#fff',g='#F5B92E',z=size||30;
  const mouth=m=='oops'?`<path d="M26 42.5q4.5-4.5 9 0" stroke="#F87171" stroke-width="2.6" fill="none" stroke-linecap="round"/>`:m=='denkt'?`<path d="M26.5 40h8" stroke="${w}" stroke-width="2.6" stroke-linecap="round"/>`:`<path d="M25.5 38.5q5 5 10 0" stroke="#4ADE80" stroke-width="2.8" fill="none" stroke-linecap="round"/>`;
  return `<svg class="penny" viewBox="0 0 64 64" width="${z}" height="${z}" aria-hidden="true"><g class="pn-b"><path d="M32 9v5" stroke="#8B7CF6" stroke-width="2.2" stroke-linecap="round"/><circle cx="32" cy="6" r="4.4" fill="${c}"/>
  <rect x="5" y="13" width="54" height="38" rx="13" fill="#7C5CFF"/><rect x="11" y="19" width="42" height="26" rx="8" fill="#211A3D"/>
  <circle cx="23" cy="31" r="2.8" fill="${w}"/><circle cx="40" cy="30.6" r="2.5" fill="${w}"/><circle cx="40" cy="30.6" r="6.4" stroke="${g}" stroke-width="2.6" fill="none"/>${mouth}
  <path d="M22.5 52.5l8.5 4.3-8.5 4.3z M41.5 52.5l-8.5 4.3 8.5 4.3z" fill="${g}"/><circle cx="32" cy="56.8" r="2.3" fill="#B7791F"/>
  <g transform="translate(42 38) rotate(-8)"><path d="M0 4a2 2 0 0 1 2-2h5l2 2h9a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2z" fill="#2F6FEB" stroke="#1B4FB8" stroke-width="1"/><path d="M0 8h20" stroke="#fff" stroke-opacity=".35"/></g></g></svg>`}

/* Leerer Text = nur Nicken (leere Quittung). Rückmeldungen gebündelt über Penny (siehe Konzept Rückmeldungen): eine Blase, neue ersetzt alte.
   o.undo: Rückgängig (5 s), o.act:[Label,fn], o.sys: Systemfehler oben, o.m: Penny-Stimmung */
let tellT=null;
function tell(text,o={}){const r=$('toastRoot');clearTimeout(tellT);
  r.style.top=o.sys?'calc(env(safe-area-inset-top,0px) + 10px)':'';r.style.bottom=o.sys?'auto':'';
  const ch=o.undo?['Rückgängig',o.undo]:o.act||null;
  r.innerHTML=`<div class="toast${o.sys?' sys':''}" role="status">${o.sys?I('alert'):penny(o.m||'ok',30)}${text?`<div class="tx">${text}</div>`:''}${ch?`<button class="tchip" id="tChip">${esc(ch[0])}</button>`:''}${o.undo?'<i class="run"></i>':''}</div>`;
  if(ch)$('tChip').onclick=()=>{r.innerHTML='';ch[1]()};
  tellT=setTimeout(()=>{r.innerHTML=''},o.undo?5000:o.sys?6000:text?3200:1200)}

/* Lokale Speicherung: IndexedDB „ab-docs“ – f: Dateien, q: Upload-Warteschlange, kv: Zustand */
function abDB(){return new Promise((res,rej)=>{try{const r=indexedDB.open('ab-docs',1);r.onupgradeneeded=()=>{['f','q','kv'].forEach(s=>r.result.createObjectStore(s))};r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)}catch(e){rej(e)}})}
let abDBp=null;
async function tx(st,mode,fn){if(!abDBp)abDBp=abDB();const db=await abDBp;return new Promise((res,rej)=>{const t=db.transaction(st,mode),r=fn(t.objectStore(st));let out;if(r)r.onsuccess=()=>{out=r.result};t.oncomplete=()=>res(out);t.onerror=()=>rej(t.error);t.onabort=()=>rej(t.error)})}
const kvGet=k=>tx('kv','readonly',s=>s.get(k)),kvPut=(k,v)=>tx('kv','readwrite',s=>s.put(v,k));
const fGet=id=>tx('f','readonly',s=>s.get(id)),fPut=(id,b)=>tx('f','readwrite',s=>s.put(b,id)),fDel=id=>tx('f','readwrite',s=>s.delete(id));
let saveT=null;
function save(sync=true){clearTimeout(saveT);saveT=setTimeout(()=>{kvPut('state',A).catch(()=>tell('Speichern auf diesem Gerät fehlgeschlagen.',{sys:true}));if(sync&&typeof syncSoon=='function')syncSoon()},150)}

const live=()=>A.docs.filter(d=>!d.del);
const docById=id=>A.docs.find(d=>d.id==id&&!d.del);
function touch(d){d.u=Date.now();A.dirty=true}
