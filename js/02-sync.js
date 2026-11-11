/* Ablage – Anmeldung, Verschlüsselung, Sync (Tabelle „ablage“), Dateien (Bucket „belege“, Ordner uid/a/), CashFlow lesen, KI */
'use strict';
const SYK='ab_sync';
let SY=(()=>{try{return JSON.parse(localStorage.getItem(SYK))||{}}catch(e){return{}}})();
const sySave=()=>{try{localStorage.setItem(SYK,JSON.stringify(SY))}catch(e){}};
const SYDEF='https://yyltagrgzrjteltnkolw.supabase.co';
let syKey=null,syMsg='',syBusy=false,syTimer=null;
const syOn=()=>!!(SY.url&&SY.key&&SY.refresh);
const syReady=()=>syOn()&&!!(syKey||SY.k);

/* CashFlow liegt am selben Ursprung: Angaben nur LESEN (nie zurückschreiben). Sitzung wird nicht geteilt,
   weil Supabase Refresh-Tokens rotiert und sich zwei Apps sonst gegenseitig abmelden. */
function cfSync(){try{return JSON.parse(localStorage.getItem('cf_sync'))||null}catch(e){return null}}

const b64=u=>{const a=new Uint8Array(u);let s='';for(let i=0;i<a.length;i+=32768)s+=String.fromCharCode.apply(null,a.subarray(i,i+32768));return btoa(s)};
const ub64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
async function syDerive(pass,salt){const km=await crypto.subtle.importKey('raw',new TextEncoder().encode(pass),'PBKDF2',false,['deriveKey']);
  return crypto.subtle.deriveKey({name:'PBKDF2',salt:ub64(salt),iterations:250000,hash:'SHA-256'},km,{name:'AES-GCM',length:256},true,['encrypt','decrypt'])}
async function syLoadKey(){if(syKey)return syKey;if(SY.k){syKey=await crypto.subtle.importKey('raw',ub64(SY.k),'AES-GCM',true,['encrypt','decrypt']);return syKey}return null}
async function syEnc(obj){const iv=crypto.getRandomValues(new Uint8Array(12)),ct=await crypto.subtle.encrypt({name:'AES-GCM',iv},syKey,new TextEncoder().encode(JSON.stringify(obj)));return{data:b64(ct),iv:b64(iv)}}
async function syDec(row,k){const pt=await crypto.subtle.decrypt({name:'AES-GCM',iv:ub64(row.iv)},k||syKey,ub64(row.data));return JSON.parse(new TextDecoder().decode(pt))}

async function syRefresh(){const r=await fetch(SY.url.replace(/\/$/,'')+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{apikey:SY.key,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:SY.refresh})});
  const j=await r.json().catch(()=>({}));if(!r.ok||!j.access_token){if(r.status==400||r.status==401){SY.refresh=null;SY.access=null;sySave();throw new Error('AUTH')}throw new Error('Keine Verbindung')}syAuthSet(j)}
function syAuthSet(j){if(!j.access_token)throw new Error(j.error_description||j.msg||j.error||'Anmeldung fehlgeschlagen');SY.access=j.access_token;SY.refresh=j.refresh_token;SY.exp=Date.now()+(j.expires_in||3600)*1000;SY.uid=j.user&&j.user.id||SY.uid;SY.email=j.user&&j.user.email||SY.email;sySave()}
let refreshP=null;
async function syFetch(path,opt={}){const h=Object.assign({apikey:SY.key,'Content-Type':'application/json'},opt.headers||{});
  if(!SY.access||Date.now()>(SY.exp||0)-60000){refreshP=refreshP||syRefresh().finally(()=>{refreshP=null});await refreshP}
  h.Authorization='Bearer '+SY.access;
  const r=await fetch(SY.url.replace(/\/$/,'')+path,Object.assign({},opt,{headers:h}));
  if(r.status==401&&!opt._retry){refreshP=refreshP||syRefresh().finally(()=>{refreshP=null});await refreshP;return syFetch(path,Object.assign({},opt,{_retry:1}))}return r}

/* Anmelden: E-Mail + Passwort; Schlüssel aus CashFlow übernehmen (gleiches Gerät) oder aus dem Sync-Passwort ableiten.
   Geprüft wird immer gegen die verschlüsselte CashFlow-Zeile, damit beide Apps denselben Schlüssel nutzen. */
async function syLogin(f){const url=(f.url||SYDEF).trim().replace(/\/$/,''),key=f.key.trim();if(!key)throw new Error('Bitte den Publishable Key eintragen.');
  SY.url=url;SY.key=key;
  const r=await fetch(url+'/auth/v1/token?grant_type=password',{method:'POST',headers:{apikey:key,'Content-Type':'application/json'},body:JSON.stringify({email:f.email.trim(),password:f.pw})});
  const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(/invalid/i.test(j.error_description||j.msg||'')?'E-Mail oder Passwort stimmt nicht.':(j.error_description||j.msg||'Anmeldung fehlgeschlagen ('+r.status+').'));
  syAuthSet(j);
  try{
  const rr=await syFetch('/rest/v1/cashflow?select=data,iv,salt&user_id=eq.'+SY.uid);if(!rr.ok)throw new Error('CashFlow-Daten nicht lesbar ('+rr.status+').');
  const row=(await rr.json())[0];if(!row)throw new Error('Unter diesem Konto gibt es noch keine CashFlow-Daten. Richte zuerst in CashFlow den Online-Sync ein.');
  let k=null;const cf=cfSync();
  if(!f.sp&&cf&&cf.k&&cf.uid==SY.uid){k=await crypto.subtle.importKey('raw',ub64(cf.k),'AES-GCM',true,['encrypt','decrypt'])}
  else{if(!f.sp)throw new Error('Bitte das Sync-Passwort aus CashFlow eintragen.');k=await syDerive(f.sp,row.salt)}
  let cfData;try{cfData=await syDec(row,k)}catch(e){throw new Error(f.sp?'Das Sync-Passwort passt nicht zu deinen CashFlow-Daten.':'Der Schlüssel aus CashFlow passt nicht. Bitte Sync-Passwort eintragen.')}
  syKey=k;SY.k=f.keep?b64(await crypto.subtle.exportKey('raw',k)):null;SY.keep=!!f.keep;SY.at=0;A.base=null;sySave();
  cfTake(cfData)}catch(e){SY.refresh=null;SY.access=null;sySave();throw e}
  await sync(true);docFlush()}

async function syLogout(wipe){try{await syFetch('/auth/v1/logout?scope=local',{method:'POST'})}catch(e){}
  SY={url:SY.url,key:SY.key,email:SY.email};syKey=null;sySave();
  if(wipe){A={docs:[],base:null,cfg:A.cfg,ki:{},v:1};CF={contracts:[],paid:{},at:0};await kvPut('state',A);await kvPut('cf',CF);await tx('f','readwrite',s=>s.clear());await tx('q','readwrite',s=>s.clear())}
  render()}

/* Zusammenführen je Dokument: neuere Änderung (u) gewinnt, Löschungen bleiben als Grabstein 60 Tage */
function merge(loc,rem){const M=new Map();let changed=false;
  (rem||[]).forEach(d=>M.set(d.id,d));
  (loc||[]).forEach(d=>{const r=M.get(d.id);if(!r||(d.u||0)>(r.u||0)){M.set(d.id,d);changed=true}});
  const lim=Date.now()-60*864e5;const out=[...M.values()].filter(d=>!(d.del&&d.del<lim));
  return{docs:out,changed:changed||out.length!=(rem||[]).length}}

async function sync(force){if(syBusy||!syOn()||navigator.onLine===false)return;if(!await syLoadKey()){syMsg='Schlüssel fehlt: bitte neu anmelden.';render();return}
  syBusy=true;syMsg='';
  try{for(let i=0;i<3;i++){
      const r=await syFetch('/rest/v1/ablage?select=data,iv,rev&user_id=eq.'+SY.uid);
      if(!r.ok){const t=await r.text();if(/does not exist|schema cache|relation/i.test(t)){syMsg='TABLE';break}throw new Error('Fehler '+r.status)}
      const row=(await r.json())[0];
      if(!row){const e=await syEnc({docs:A.docs,v:1});const p=await syFetch('/rest/v1/ablage',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({user_id:SY.uid,data:e.data,iv:e.iv,rev:1})});
        if(!p.ok){if(p.status==409)continue;throw new Error('Fehler '+p.status)}A.base=1;A.dirty=false;break}
      let rem=null;if(row.rev!==A.base||A.dirty){rem=await syDec(row)}
      if(row.rev===A.base&&!A.dirty)break;
      const m=rem?merge(A.docs,rem.docs):{docs:A.docs,changed:true};A.docs=m.docs;
      if(!m.changed&&!A.dirty){A.base=row.rev;break}
      const e=await syEnc({docs:A.docs,v:1});
      const p=await syFetch('/rest/v1/ablage?user_id=eq.'+SY.uid+'&rev=eq.'+row.rev,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({data:e.data,iv:e.iv,rev:row.rev+1,updated_at:new Date().toISOString()})});
      if(!p.ok)throw new Error('Fehler '+p.status);const back=await p.json();if(!back.length)continue;   // jemand war schneller: neu lesen
      A.base=row.rev+1;A.dirty=false;break}
    SY.at=Date.now();sySave();await kvPut('state',A);
    if(force||Date.now()-(CF.at||0)>5*6e4)await cfLoad();
    abGC()}
  catch(e){syMsg=e.message=='AUTH'?'Anmeldung abgelaufen: bitte neu anmelden.':navigator.onLine===false?'Offline.':'Sync: '+(e.message||e)}
  finally{syBusy=false;render()}}
function syncSoon(){clearTimeout(syTimer);if(syOn())syTimer=setTimeout(()=>sync(),1500)}

/* CashFlow-Daten lesen (nur lesen): Verträge zum Verknüpfen, Buchungen mit e.ab für „bezahlt/erstattet“ */
async function cfLoad(){try{const r=await syFetch('/rest/v1/cashflow?select=data,iv&user_id=eq.'+SY.uid);if(!r.ok)return;const row=(await r.json())[0];if(!row)return;cfTake(await syDec(row))}catch(e){}}
function cfTake(S){const C=(S.contracts||[]).map(c=>({id:c.id,n:c.n,prov:c.prov||'',start:c.start,next:c.next,renew:c.renew,term:c.term,notice:c.notice,state:c.state,auto:c.auto,cost:c.cost}));
  const paid={};(S.exp||[]).forEach(e=>{if(e&&e.ab)paid[e.ab]={dt:e.t?ymd(e.t):String(e.dt||'').slice(0,10),a:e.a,n:e.n}});
  const rid={};(S.rec||[]).forEach(r=>{if(r&&r.id)rid[r.id]={a:r.a,every:r.every||1}});
  C.forEach(c=>{const x=(S.contracts||[]).find(z=>z.id==c.id);if(x&&x.rid&&rid[x.rid])c.mon=rid[x.rid].a/rid[x.rid].every});
  CF={contracts:C,paid,at:Date.now()};kvPut('cf',CF).catch(()=>{})}
/* gleiche Rechnung wie CashFlow (contractNext): nächste Verlängerung d und letzter Kündigungstag kd */
function addPer(d,pp,k=1){const x=new Date(d);if(!pp)return x;if(pp.u=='d')x.setDate(x.getDate()+pp.n*k);else if(pp.u=='w')x.setDate(x.getDate()+7*pp.n*k);else if(pp.u=='m')x.setMonth(x.getMonth()+pp.n*k);else x.setFullYear(x.getFullYear()+pp.n*k);return x}
function contractNext(c){const now=new Date();if(c.state=='cancelled')return{d:new Date((c.next||c.start)+'T12:00'),kd:null};let d=new Date((c.next||c.start)+'T12:00'),g=0;const st=c.renew||c.term||{u:'y',n:1};
  while(d<now&&g++<600)d=addPer(d,st);let kd=c.notice?addPer(d,c.notice,-1):null;while(kd&&kd<now&&g++<600){d=addPer(d,st);kd=addPer(d,c.notice,-1)}return{d,kd}}
const cfCtr=id=>CF.contracts.find(c=>c.id==id);
/* Status mit CashFlow abgeleitet: Buchung mit e.ab=<docId> heißt bezahlt bzw. erstattet */
function effStatus(d){const p=CF.paid[d.id];if(p&&(d.art=='rechnung'||d.art=='reise'||d.art=='gehalt'))return{s:d.art=='reise'?'erstattet':d.art=='gehalt'?'übertragen':'bezahlt',cf:p};if(d.art=='gehalt')return{s:'offen',cf:null};return{s:d.status||'offen',cf:null}}

/* ---------- Dateien ---------- */
const fPath=id=>SY.uid+'/a/'+id;   // Unterordner a/: CashFlow-Aufräumen listet nur die oberste Ebene (Ordner haben id:null)
const qAdd=id=>tx('q','readwrite',s=>s.put('up',id)).then(()=>docFlush()).catch(()=>{});
async function fEnc(blob){const iv=crypto.getRandomValues(new Uint8Array(12)),ct=await crypto.subtle.encrypt({name:'AES-GCM',iv},syKey,await blob.arrayBuffer()),o=new Uint8Array(12+ct.byteLength);o.set(iv);o.set(new Uint8Array(ct),12);return o}
async function fDec(buf,typ){const u=new Uint8Array(buf),pt=await crypto.subtle.decrypt({name:'AES-GCM',iv:u.slice(0,12)},syKey,u.slice(12));return new Blob([pt],{type:typ=='pdf'?'application/pdf':'image/jpeg'})}
let flushBusy=false,fErr='';
async function docFlush(){if(flushBusy||!syOn()||navigator.onLine===false||!SY.uid)return;if(!await syLoadKey())return;flushBusy=true;
  try{const ks=await tx('q','readonly',s=>s.getAllKeys());for(const id of ks){const b=await fGet(id);
      if(b){const r=await syFetch('/storage/v1/object/belege/'+fPath(id),{method:'POST',headers:{'Content-Type':'application/octet-stream','x-upsert':'true'},body:await fEnc(b)});
        if(!r.ok){const t=await r.text().catch(()=>'');fErr=/bucket not found/i.test(t)?'Der Speicher „belege“ fehlt in Supabase. In CashFlow unter Online-Sync › SQL ausführen.':'Upload fehlgeschlagen ('+r.status+').';break}}
      fErr='';await tx('q','readwrite',s=>s.delete(id))}}catch(e){}finally{flushBusy=false}}
async function fBlob(f){let b=await fGet(f.id).catch(()=>null);if(b)return b;if(!syOn()||navigator.onLine===false||!SY.uid||!await syLoadKey())return null;
  const r=await syFetch('/storage/v1/object/authenticated/belege/'+fPath(f.id),{headers:{'Content-Type':'application/octet-stream'}});if(!r.ok)return null;b=await fDec(await r.arrayBuffer(),f.typ);fPut(f.id,b).catch(()=>{});return b}
function fImg(src,max){return new Promise((res,rej)=>{const im=new Image();im.onload=()=>{const s=Math.min(1,max/Math.max(im.width,im.height)),cv=document.createElement('canvas');cv.width=Math.round(im.width*s);cv.height=Math.round(im.height*s);const x=cv.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,cv.width,cv.height);x.drawImage(im,0,0,cv.width,cv.height);res(cv)};im.onerror=()=>rej(new Error('Das Bild lässt sich nicht lesen.'));im.src=src})}
const cvBlob=(cv,q)=>new Promise(r=>cv.toBlob(r,'image/jpeg',q));
const readURL=b=>new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=()=>rej(r.error);r.readAsDataURL(b)});
/* Datei aufnehmen: Fotos auf 1600 px / JPEG 0,8, PDFs bis 10 MB. Liefert Dateieintrag + Vorschaubild */
async function fTake(file){const id=uid();
  if(file.type=='application/pdf'||/\.pdf$/i.test(file.name||'')){if(file.size>10*1048576)throw new Error('Das PDF ist größer als 10 MB.');await fPut(id,new Blob([file],{type:'application/pdf'}));qAdd(id);return{f:{id,typ:'pdf',name:String(file.name||'Dokument.pdf').slice(0,80),kb:Math.round(file.size/1024)},th:''}}
  const src=await readURL(file),b=await cvBlob(await fImg(src,1600),.8);if(!b)throw new Error('Das Bild lässt sich nicht speichern.');await fPut(id,b);qAdd(id);
  return{f:{id,typ:'jpg',name:'Foto',kb:Math.round(b.size/1024)},th:(await fImg(src,160)).toDataURL('image/jpeg',.6)}}

/* Aufräumen höchstens einmal am Tag nach erfolgreichem Sync: lokal alles ohne Dokument, online nur Unbenutztes älter als 30 Tage in uid/a/ */
async function abGC(){if(!syOn()||!SY.uid)return;let last=0;try{last=+localStorage.getItem('ab_gc')||0}catch(e){}if(Date.now()-last<864e5)return;try{localStorage.setItem('ab_gc',String(Date.now()))}catch(e){}
  const used=new Set();A.docs.forEach(d=>{if(!d.del)(d.files||[]).forEach(f=>used.add(f.id))});if(window.ED)(ED.files||[]).forEach(f=>used.add(f.id));
  try{const qq=new Set(await tx('q','readonly',s=>s.getAllKeys()));for(const k of await tx('f','readonly',s=>s.getAllKeys()))if(!used.has(k)&&!qq.has(k))await fDel(k)}catch(e){}
  try{for(let off=0;off<20000;off+=1000){const r=await syFetch('/storage/v1/object/list/belege',{method:'POST',body:JSON.stringify({prefix:SY.uid+'/a',limit:1000,offset:off})});if(!r.ok)return;const L=await r.json();
      const old=L.filter(o=>o&&o.id&&o.name&&!used.has(o.name)&&Date.now()-new Date(o.created_at||Date.now()).getTime()>30*864e5).map(o=>fPath(o.name));
      if(old.length)await syFetch('/storage/v1/object/belege',{method:'DELETE',body:JSON.stringify({prefixes:old})});if(L.length<1000)break}}catch(e){}}

/* ---------- KI-Auslesen über die vorhandene Supabase-Funktion „ai“ (op chat, strukturierte Ausgabe) ---------- */
const AIPRICE={'claude-haiku-5-5':[.10,.50],'claude-sonnet-5-5':[2,10]};
const kiUse=()=>{const ym=ymd(Date.now()).slice(0,7);if(!A.ki||A.ki.ym!=ym)A.ki={ym,usd:0,n:0};return A.ki};
const kiOn=()=>A.cfg.ki!==false&&syOn()&&navigator.onLine!==false;
const KISCH={type:'object',additionalProperties:false,
  required:['art','titel','absender','datum','betrag','brutto','jahresbrutto','monat','faellig','iban','verwendungszweck','vertragsnr','kuendigen_bis','garantie_bis','gueltig_bis','frist','anlass','kurz','tags'],
  properties:{art:{type:'string',enum:ARTEN.map(a=>a.k)},titel:{type:'string',description:'kurz, z. B. "Stromrechnung Oktober"'},absender:{type:'string'},datum:{type:'string',description:'Dokumentdatum YYYY-MM-DD oder leer'},
   betrag:{type:'number',description:'Gesamtbetrag in Euro; bei Gehaltsnachweis der Netto-Auszahlungsbetrag; 0 wenn keiner'},brutto:{type:'number',description:'nur Gehaltsnachweis: Brutto des Monats, sonst 0'},jahresbrutto:{type:'number',description:'nur Gehaltsnachweis: steuer- bzw. zusatzversorgungspflichtiges Brutto des Jahres bis dahin (Jahressumme), sonst 0'},monat:{type:'string',description:'nur Gehaltsnachweis: Abrechnungsmonat YYYY-MM, sonst leer'},faellig:{type:'string',description:'Zahlungsziel YYYY-MM-DD oder leer'},iban:{type:'string'},verwendungszweck:{type:'string'},vertragsnr:{type:'string'},
   kuendigen_bis:{type:'string',description:'letzter Kündigungstag YYYY-MM-DD oder leer'},garantie_bis:{type:'string'},gueltig_bis:{type:'string',description:'Ablauf eines Ausweises/Dokuments YYYY-MM-DD oder leer'},
   frist:{type:'string',description:'sonstige Frist (Widerspruch, Antwort) YYYY-MM-DD oder leer'},anlass:{type:'string',description:'nur bei Reisekosten'},kurz:{type:'string',description:'ein Satz Inhalt für die Suche'},tags:{type:'array',items:{type:'string'}}}};
async function kiRead(d){if(!await syLoadKey())throw new Error('Bitte erst anmelden.');const files=(d.files||[]).slice(0,3),content=[];
  for(const f of files){const b=await fBlob(f);if(!b)continue;
    if(f.typ=='pdf'){if(b.size>4.5*1048576)continue;content.push({type:'document',source:{type:'base64',media_type:'application/pdf',data:(await readURL(b)).split(',')[1]}});break}
    const cv=await fImg(URL.createObjectURL(b),1568);content.push({type:'image',source:{type:'base64',media_type:'image/jpeg',data:cv.toDataURL('image/jpeg',.8).split(',')[1]}})}
  if(!content.length)throw new Error('Keine lesbare Seite gefunden.');
  content.push({type:'text',text:'Heute ist '+ymd(Date.now())+'. Lies dieses deutsche Dokument und fülle die Felder. Art: vertrag, rechnung, brief (Bescheid/Brief), garantie (Garantie/Kaufbeleg), reise (Reisekostenabrechnung), pers (Ausweis, Urkunde, Zeugnis), gehalt (Gehalts-/Entgeltabrechnung), sonst. Unbekanntes leer bzw. 0. Daten als YYYY-MM-DD. Erfinde nichts.'});
  const model=A.cfg.model||'claude-haiku-5-5',u=kiUse();
  const r=await syFetch('/functions/v1/ai',{method:'POST',body:JSON.stringify({op:'chat',req:{model,max_tokens:1500,messages:[{role:'user',content}],output_config:{effort:'low',format:{type:'json_schema',schema:KISCH}}}})});
  let j={};try{j=await r.json()}catch(e){}
  if(!r.ok)throw new Error(r.status==404?'Die Funktion „ai“ fehlt in Supabase (Einrichtung in CashFlow).':r.status==429?(j.error||'Tageslimit erreicht.'):(j.error||'Fehler '+r.status));
  const m=j.msg;if(!m||m.stop_reason=='refusal')throw new Error('Die KI hat die Anfrage abgelehnt.');
  const p=AIPRICE[model]||AIPRICE['claude-haiku-5-5'],us=m.usage||{};u.usd+=((us.input_tokens||0)*p[0]+(us.output_tokens||0)*p[1])/1e6;u.n++;
  return JSON.parse(m.content.filter(b=>b.type=='text').map(b=>b.text).join(''))}
/* Nur leere Felder füllen; was du eingetragen hast, bleibt */
function kiApply(d,k){let n=0;const iso=s=>/^\d{4}-\d{2}-\d{2}$/.test(s||'')?s:'';
  const set=(f,v)=>{if(v==null||v===''||v===0)return;if(d[f]==null||d[f]===''||d[f]===0){d[f]=v;n++}};
  if(!d.art||(d.art=='sonst'&&k.art))d.art=k.art||d.art||'sonst';
  set('titel',k.titel);set('abs',k.absender);set('datum',iso(k.datum));set('betrag',k.betrag>0?Math.round(k.betrag*100)/100:0);set('faellig',iso(k.faellig));set('iban',(k.iban||'').replace(/\s+/g,' ').trim());
  set('vz',k.verwendungszweck);set('vnr',k.vertragsnr);if(!d.ctr)set('kfrist',iso(k.kuendigen_bis));set('gbis',iso(k.garantie_bis));set('gueltig',iso(k.gueltig_bis));set('frist',iso(k.frist));set('anlass',k.anlass);if(d.art=='gehalt'){set('brutto',k.brutto>0?Math.round(k.brutto*100)/100:0);set('monat',/^\d{4}-\d{2}$/.test(k.monat||'')?k.monat:'');if(String(d.monat||'').slice(5)=='12')set('jb',k.jahresbrutto>0?Math.round(k.jahresbrutto):0)}
  if(k.kurz)d.kurz=k.kurz;if(Array.isArray(k.tags)&&k.tags.length&&!(d.tags||[]).length){d.tags=k.tags.slice(0,6).map(s=>String(s).slice(0,30));n++}
  if((d.art=='rechnung'||d.art=='reise')&&!d.status)d.status='offen';return n}

window.addEventListener('online',()=>{docFlush();sync()});
