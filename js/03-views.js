/* Ablage – Ansichten: Liste, Fristen, Mehr, Bearbeiten, Dokumentansicht, Start */
'use strict';
let ED=null,edNew=false,edDel=false;window.ED=null;

/* ---------- Fristen (abgeleitet, nichts wird gespeichert) ---------- */
function fristen(){const L=[];
  live().forEach(d=>{const add=(dt,was,keepPast)=>{const dl=dt?daysTo(dt):null;if(dl!=null&&dl<-30&&!keepPast)return;L.push({d,dt,dl,was})};
    if(d.art=='rechnung'){const s=effStatus(d).s;if(s=='offen'||s=='strittig')add(d.faellig||null,(s=='strittig'?'Strittig':'Fällig')+(d.betrag?' · '+eur(d.betrag):''),true)}
    else if(d.art=='vertrag'){const c=d.ctr&&cfCtr(d.ctr);if(c){const x=contractNext(c);if(x.kd)add(ymd(x.kd),'Kündigen bis (aus CashFlow)')}else if(d.kfrist)add(d.kfrist,'Kündigen bis')}
    else if(d.art=='garantie'&&d.gbis)add(d.gbis,'Garantie endet');
    else if(d.art=='pers'&&d.gueltig)add(d.gueltig,'Läuft ab');
    else if(d.art=='reise'){const s=effStatus(d).s;if(s=='offen')add(null,'Noch einreichen'+(d.betrag?' · '+eur(d.betrag):''));else if(s=='eingereicht')add(null,'Erstattung offen'+(d.betrag?' · '+eur(d.betrag):'')+(d.eing?' · eingereicht '+dShort(d.eing):''))}
    else if(d.art=='gehalt'&&d.betrag&&!effStatus(d).cf)add(null,'Noch nach CashFlow übertragen · '+eur(d.betrag));
    if((d.art=='brief'||d.art=='sonst')&&d.frist)add(d.frist,'Frist')});
  return L.sort((a,b)=>(a.dt?pD(a.dt):9e15)-(b.dt?pD(b.dt):9e15))}
const amp=dl=>dl==null?'var(--muted)':dl<=7?'var(--bad)':dl<=30?'var(--warn)':'var(--ok)';
const dlTxt=dl=>dl==null?'':dl<0?'seit '+(-dl)+(dl==-1?' Tag':' Tagen')+' vorbei':dl==0?'heute':dl==1?'morgen':'in '+dl+' Tagen';

/* ---------- Zellen ---------- */
function docIcon(d){const th=(d.files||[]).find(f=>f.th);return th?`<img class="thumb" src="${th.th}" alt="">`:`<span class="ico" style="--c:var(--${d.art||'sonst'})">${I(d.art||'sonst')}</span>`}
function docBadge(d){if(d.art=='gehalt'){const e=effStatus(d);return e.cf?'<span class="badge ok">übertragen</span>':(d.betrag?'<span class="badge mute">nicht übertragen</span>':'')}
  if(d.art=='rechnung'||d.art=='reise'){const e=effStatus(d);
    if(e.s=='bezahlt'||e.s=='erstattet')return `<span class="badge ok">${e.s}</span>`;if(e.s=='strittig')return '<span class="badge warn">strittig</span>';
    if(d.art=='rechnung'&&d.faellig){const dl=daysTo(d.faellig);return `<span class="badge ${dl<=7?'bad':'warn'}">${dl<0?'überfällig':dl==0?'heute':dl+' T.'}</span>`}
    return `<span class="badge mute">${e.s}</span>`}
  if(d.art=='vertrag'&&d.ctr)return `<span class="badge mute">${I('link',12)}CashFlow</span>`;return ''}
function hlt(s){s=esc(s);if(!q)return s;q.toLowerCase().split(/\s+/).filter(Boolean).forEach(w=>{s=s.replace(new RegExp('('+w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')','ig'),'<mark>$1</mark>')});return s}
function docCell(d){const sub=[d.abs||d.anlass||d.geraet,dShort(d.datum||d.von),d.betrag?eur(d.betrag):''].filter(Boolean).join(' · ');
  return `<button class="cell" data-doc="${esc(d.id)}">${docIcon(d)}<div class="t"><div>${hlt(d.titel||ARTN[d.art]||'Dokument')}</div><div class="s">${hlt(sub||ARTN[d.art]||'')}</div></div>${docBadge(d)}<span class="chev">›</span></button>`}
function hay(d){return [d.titel,d.abs,d.kurz,(d.tags||[]).join(' '),d.notiz,d.vnr,d.anlass,d.geraet,d.iban,d.vz,ARTN[d.art]].join(' ').toLowerCase()}

/* ---------- Ansichten ---------- */
function syncBtn(){const off=navigator.onLine===false;if(!syOn())return '';
  return `<button class="link" id="syB" aria-label="Synchronisieren" title="${esc(syMsg||(SY.at?'Stand '+new Date(SY.at).toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'}):''))}" style="color:${syMsg&&!off?'var(--bad)':'var(--accent)'}">${I(off?'cloudoff':'sync',24)}</button>`}
function viewDocs(){const L=live(),kb=L.reduce((s,d)=>s+(d.files||[]).reduce((t,f)=>t+(f.kb||0),0),0);
  const F=fristen(),offR=L.filter(d=>d.art=='rechnung'&&['offen','strittig'].includes(effStatus(d).s)),offE=L.filter(d=>d.art=='reise'&&['offen','eingereicht'].includes(effStatus(d).s));
  const soon=F.filter(f=>f.dl!=null&&f.dl<=30).length,hot=F.some(f=>f.dl!=null&&f.dl<=7);
  const cnt=k=>L.filter(d=>d.art==k).length;
  let R=L.filter(d=>filt=='alle'||d.art==filt||(filt=='offen'&&((d.art=='rechnung'||d.art=='reise')&&['offen','strittig','eingereicht'].includes(effStatus(d).s))));
  if(q){const W=q.toLowerCase().split(/\s+/).filter(Boolean);R=R.filter(d=>{const h=hay(d);return W.every(w=>h.includes(w))})}
  R.sort((a,b)=>(pD(b.datum||b.von)||b.c||0)-(pD(a.datum||a.von)||a.c||0)||(b.c||0)-(a.c||0));
  return `<div class="view"><div class="top"><div><h1 class="lt">Ablage</h1><div class="sub">${L.length} Dokument${L.length==1?'':'e'}${kb?' · '+mb(kb):''}</div></div>${syncBtn()}</div>
  ${!syOn()?`<div class="tip">${penny('ok',34)}<div><b>Mit CashFlow verbinden</b><br>Melde dich mit deinem CashFlow-Konto an. Dann liegen deine Dokumente verschlüsselt auf allen Geräten. <button class="link" id="goLogin">Anmelden ›</button></div></div>`:''}
  ${L.length?`<div class="kpis"><button class="kpi${offR.length?' hot':''}" data-f="offen">Offene Rechnungen<b>${eur(offR.reduce((s,d)=>s+(+d.betrag||0),0)).replace(',00','')}</b></button><button class="kpi${hot?' hot':''}" id="kpiF">Fristen 30 Tage<b>${soon}</b></button><button class="kpi" data-f="reise">Erstattung offen<b>${eur(offE.reduce((s,d)=>s+(+d.betrag||0),0)).replace(',00','')}</b></button></div>`:''}
  <div class="sec"><label class="search">${I('search',18)}<input id="q" type="search" placeholder="Suchen: Absender, Tag, Inhalt …" value="${esc(q)}" autocomplete="off"></label>
  <div class="chips">${[['alle','Alle'],['offen','Offen']].concat(ARTEN.filter(a=>cnt(a.k)).map(a=>[a.k,a.p+' '+cnt(a.k)])).map(([k,n])=>`<button class="chip${filt==k?' on':''}" data-f="${k}">${esc(n)}</button>`).join('')}</div></div>
  ${R.length?`<div class="group">${R.map(docCell).join('')}</div>`:`<div class="empty">${penny(L.length?'denkt':'ok',56)}${L.length?'Nichts gefunden.':'Noch leer. Tippe auf <b>+</b>, fotografiere ein Dokument oder wähle ein PDF.'}</div>`}
  </div>`}
function viewFristen(){const F=fristen(),grp=[['Überfällig',f=>f.dl!=null&&f.dl<0],['Nächste 30 Tage',f=>f.dl!=null&&f.dl>=0&&f.dl<=30],['Später',f=>f.dl!=null&&f.dl>30],['Offen ohne Datum',f=>f.dl==null]];
  const row=f=>`<button class="cell" data-doc="${esc(f.d.id)}"><span class="amp" style="background:${amp(f.dl)}"></span><div class="t"><div>${esc(f.d.titel||ARTN[f.d.art])}</div><div class="s">${esc(f.was)}</div></div><div class="v">${f.dt?`<div>${dShort(f.dt)}</div><div class="s">${dlTxt(f.dl)}</div>`:''}</div><span class="chev">›</span></button>`;
  return `<div class="view"><div class="top"><div><h1 class="lt">Fristen</h1><div class="sub">Fällig, kündbar, Garantie, Ausweise, Erstattungen</div></div>${syncBtn()}</div>
  ${F.length?grp.map(([h,fn])=>{const X=F.filter(fn);return X.length?`<div class="sec"><div class="sh">${h}<span>${X.length}</span></div><div class="group">${X.map(row).join('')}</div></div>`:''}).join(''):`<div class="empty">${penny('ok',56)}Keine Fristen. Alles erledigt.</div>`}
  ${CF.contracts.length?'':'<div class="note">Kündigungsfristen verknüpfter Verträge kommen aus CashFlow, sobald du angemeldet bist.</div>'}</div>`}

const ABSQL=`create table if not exists public.ablage (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data text not null,
  iv text not null,
  rev bigint not null default 1,
  updated_at timestamptz not null default now()
);
alter table public.ablage enable row level security;
drop policy if exists "nur eigene Daten" on public.ablage;
create policy "nur eigene Daten" on public.ablage
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);`;
let lgErr='';
function loginForm(){const cf=cfSync()||{},hasK=!!cf.k;
  return `<div class="sec"><div class="sh">Mit CashFlow-Konto anmelden</div><div class="group">
   <div class="cell plain"><label for="lgU">Projekt-URL</label><input id="lgU" value="${esc(SY.url||cf.url||SYDEF)}" autocapitalize="off" spellcheck="false"></div>
   <div class="cell plain"><label for="lgK">Publishable Key</label><input id="lgK" value="${esc(SY.key||cf.key||'')}" placeholder="sb_publishable_…" autocapitalize="off" spellcheck="false"></div>
   <div class="cell plain"><label for="lgE">E-Mail</label><input id="lgE" type="email" autocomplete="username" value="${esc(SY.email||cf.email||'')}"></div>
   <div class="cell plain"><label for="lgP">Passwort</label><input id="lgP" type="password" autocomplete="current-password" placeholder="wie in CashFlow"></div>
   <div class="cell plain"><label for="lgS">Sync-Passwort</label><input id="lgS" type="password" autocomplete="off" placeholder="${hasK?'aus CashFlow übernommen':'wie in CashFlow'}"></div>
   <div class="cell plain"><div class="t"><div>Auf diesem Gerät merken</div><div class="s w">Am Dienstrechner ausschalten</div></div><input id="lgR" type="checkbox" class="switch" ${cf.k||SY.keep!==false?'checked':''}></div></div>
   <div class="note">${hasK?'URL, Key, E-Mail und Schlüssel kommen aus CashFlow auf diesem Gerät. Nur das Passwort fehlt.':'Gleiches Konto und gleiches Sync-Passwort wie in CashFlow. Ein zweites Passwort gibt es nicht.'}</div>
   <button class="btn" id="lgGo">Anmelden</button>${lgErr?`<div class="note" style="color:var(--bad)">${esc(lgErr)}</div>`:''}</div>`}
function viewMore(){const L=live(),files=L.reduce((s,d)=>s+(d.files||[]).length,0),kb=L.reduce((s,d)=>s+(d.files||[]).reduce((t,f)=>t+(f.kb||0),0),0),u=kiUse();
  const acc=syOn()?`<div class="sec"><div class="sh">Konto</div><div class="group">
     <div class="cell plain"><div class="t"><div>${esc(SY.email||'Angemeldet')}</div><div class="s">${syBusy?'Synchronisiere …':syMsg&&syMsg!='TABLE'?esc(syMsg):SY.at?'Stand '+new Date(SY.at).toLocaleString('de-DE',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):'Noch nicht synchronisiert'}</div></div>${I('lock',18)}</div></div>
     <button class="btn soft" id="syNow">Jetzt synchronisieren</button>
     <div class="note">Verschlüsselt auf diesem Gerät mit deinem Sync-Passwort, wie CashFlow. Online liegt nur unlesbarer Datensalat.</div></div>`:loginForm();
  return `<div class="view"><div class="top"><h1 class="lt">Mehr</h1></div>
  ${syMsg=='TABLE'?`<div class="tip">${I('alert')}<div>In Supabase fehlt die Tabelle <b>ablage</b>. Unten bei Einrichtung das SQL kopieren und im SQL Editor ausführen.</div></div>`:''}
  ${acc}
  <div class="sec"><div class="sh">KI-Auslesen</div><div class="group">
   <div class="cell plain"><div class="t"><div>Knopf „Mit KI auslesen“</div><div class="s w">Nur auf Knopfdruck. Die Seiten gehen dafür entschlüsselt an die KI.</div></div><input type="checkbox" class="switch" id="kiOn" ${A.cfg.ki!==false?'checked':''}></div>
   <div class="cell plain"><div class="t"><div>Modell</div></div><div class="seg" style="width:190px"><button data-m="claude-haiku-5-5" class="${A.cfg.model!='claude-sonnet-5-5'?'on':''}">Haiku</button><button data-m="claude-sonnet-5-5" class="${A.cfg.model=='claude-sonnet-5-5'?'on':''}">Sonnet</button></div></div>
   <div class="cell plain"><div class="t"><div>Diesen Monat</div></div><div class="v">${u.n} × · ${u.usd<.005&&u.n?'< 0,01':u.usd.toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2})} $</div></div></div>
   <div class="note">Haiku reicht für klare Rechnungen und Briefe, Sonnet liest Handschrift und schlechte Fotos besser (etwa 20-mal teurer).</div></div>
  <div class="sec"><div class="sh">Speicher</div><div class="group">
   <div class="cell plain"><div class="t">Dokumente</div><div class="v">${L.length}</div></div>
   <div class="cell plain"><div class="t">Dateien</div><div class="v">${files} · ${mb(kb)}</div></div>
   <div class="cell plain"><div class="t">Noch hochzuladen</div><div class="v" id="qN">…</div></div></div>
   ${fErr?`<div class="note" style="color:var(--bad)">${esc(fErr)}</div>`:''}<div class="note">Supabase Free bietet 1 GB für Belege aus CashFlow und Ablage zusammen.</div></div>
  <div class="sec"><div class="sh">CashFlow</div><div class="group">
   <div class="cell plain"><div class="t"><div>Verträge zum Verknüpfen</div><div class="s">${CF.at?'Stand '+new Date(CF.at).toLocaleString('de-DE',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):'Noch nicht geladen'}</div></div><div class="v">${CF.contracts.length}</div></div>
   <a class="cell" href="../cashflow-app/" style="color:var(--accent);text-decoration:none">${I('link',18)}<div class="t">CashFlow öffnen</div><span class="chev">›</span></a></div>
   <div class="note">Ablage liest aus CashFlow nur: Verträge, Kosten, Fristen und Buchungen, die auf ein Dokument verweisen.</div></div>
  <div class="sec"><div class="sh">Einrichtung (einmalig)</div><div class="group"><div class="cell col"><label>Tabelle „ablage“ in Supabase anlegen: SQL kopieren, im SQL Editor einfügen, Run.</label><button class="btn soft" id="sqlCp">SQL kopieren</button></div></div>
   <div class="note">Der Speicher „belege“ und seine Regeln stammen aus CashFlow und gelten hier mit (Ordner a/).</div></div>
  ${syOn()?`<div class="sec"><div class="sh">Abmelden</div><button class="btn soft" id="syOut">Abmelden, Daten auf diesem Gerät behalten</button><button class="btn danger" id="syWipe">Abmelden und Daten von diesem Gerät löschen</button><div class="note">Am Dienstrechner immer die zweite Variante. Online bleibt alles erhalten.</div></div>`:''}
  <div class="note" style="text-align:center">Ablage · Version ${VER}</div></div>`}

/* ---------- Rahmen ---------- */
function render(){const root=$('app'),y=window.scrollY;
  root.innerHTML=tab=='fristen'?viewFristen():tab=='more'?viewMore():viewDocs();
  const F=fristen(),hot=F.filter(f=>f.dl!=null&&f.dl<=7).length;
  $('tabbar').innerHTML=[['docs','folder','Ablage'],['fristen','clock','Fristen'],['more','more','Mehr']].map(([k,i,n])=>`<button class="${tab==k?'on':''}" data-tab="${k}">${I(i)}${n}${k=='fristen'&&hot?`<span class="dot">${hot}</span>`:''}</button>`).join('');
  $('fab').hidden=tab=='more';bind();window.scrollTo(0,y);
  if(tab=='more')tx('q','readonly',s=>s.count()).then(n=>{if($('qN'))$('qN').textContent=n?n+(navigator.onLine===false?' (offline)':''):'nichts'}).catch(()=>{})}
function bind(){
  document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.tab;window.scrollTo(0,0);render()});
  document.querySelectorAll('[data-doc]').forEach(b=>b.onclick=()=>openDoc(b.dataset.doc));
  document.querySelectorAll('[data-f]').forEach(b=>b.onclick=()=>{filt=filt==b.dataset.f&&b.classList.contains('kpi')?'alle':b.dataset.f;render()});
  const qi=$('q');if(qi)qi.oninput=()=>{q=qi.value;const p=qi.selectionStart;render();const n=$('q');n.focus();n.setSelectionRange(p,p)};
  const on=(id,f)=>{const e=$(id);if(e)e.onclick=f};
  on('kpiF',()=>{tab='fristen';render()});on('goLogin',()=>{tab='more';render()});on('syB',()=>{sync(true);docFlush();tell('',{m:'ok'})});
  on('syNow',()=>{syMsg='';sync(true);docFlush();render()});on('syOut',()=>syLogout(false));
  on('syWipe',()=>{const b=$('syWipe');if(!b.dataset.arm){b.dataset.arm=1;b.textContent='Wirklich? Nochmal tippen';return}syLogout(true)});
  on('sqlCp',()=>{const ok=()=>tell('');try{navigator.clipboard.writeText(ABSQL).then(ok,()=>prompt('SQL kopieren:',ABSQL))}catch(e){prompt('SQL kopieren:',ABSQL)}});
  on('lgGo',async()=>{const b=$('lgGo');b.disabled=true;b.textContent='Prüfe …';lgErr='';
    try{await syLogin({url:$('lgU').value,key:$('lgK').value,email:$('lgE').value,pw:$('lgP').value,sp:$('lgS').value,keep:$('lgR').checked});tab='docs';tell('Angemeldet. Deine Ablage ist verbunden.')}
    catch(e){lgErr=e.message||String(e)}render()});
  const k=$('kiOn');if(k)k.onchange=()=>{A.cfg.ki=k.checked;save(false)};
  document.querySelectorAll('[data-m]').forEach(b=>b.onclick=()=>{A.cfg.model=b.dataset.m;save(false);render()})}

/* ---------- Bearbeiten ---------- */
function openDoc(id){const d=docById(id);if(!d){tell('Dokument nicht gefunden.',{m:'denkt'});return}ED=JSON.parse(JSON.stringify(d));window.ED=ED;edNew=false;edDel=false;drawSheet()}
function newDoc(){ED={id:uid(),art:'sonst',titel:'',datum:ymd(Date.now()),files:[],tags:[],c:Date.now()};window.ED=ED;edNew=true;edDel=false;drawSheet()}
function closeSheet(){$('sheetRoot').innerHTML='';ED=null;window.ED=null;if(location.hash)history.replaceState(null,'',location.pathname+location.search)}
function fieldRow(f){const[k,lab,t,ph,only]=f;if(only&&!only(ED))return'';const v=ED[k]==null?'':ED[k];
  if(t=='date'||t=='month')return `<div class="cell plain"><label for="f_${k}">${lab}</label><input id="f_${k}" data-k="${k}" type="${t}" value="${esc(v)}"></div>`;
  if(t=='cfx'){const e=effStatus(ED);return `<div class="cell col">${e.cf?`<div class="s w">In CashFlow gebucht am ${dShort(e.cf.dt)} · ${eur(e.cf.a)}</div>`:''}<button class="btn soft" id="cfGo"${ED.betrag>0?'':' disabled'}>${I('link',18)} ${e.cf?'In CashFlow korrigieren':'Nach CashFlow übertragen'}</button><div class="s w">Netto wird dort als Gehalt gebucht (du bestätigst), Jahresbrutto auf Wunsch in die Zusatzversorgung.</div></div>`}
  if(t=='eur')return `<div class="cell plain"><label for="f_${k}">${lab}</label><input id="f_${k}" data-k="${k}" data-t="eur" inputmode="decimal" placeholder="0,00 €" value="${v?esc((+v).toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2,useGrouping:false})):''}"></div>`;
  if(t=='bool')return `<div class="cell plain"><div class="t"><div>${lab}</div><div class="s w">Erscheint in CashFlow als geplanter Betrag, nicht gebucht</div></div><input type="checkbox" class="switch" data-k="${k}" data-t="bool" ${v?'checked':''}></div>`;
  if(t=='status'){const e=effStatus(ED);return `<div class="cell plain"><div class="t">${lab}${e.cf?`<div class="s">In CashFlow gebucht am ${dShort(String(e.cf.dt).slice(0,10))}</div>`:''}</div><div class="seg">${STAT[ED.art].map(([s,n])=>`<button data-st="${s}" class="${e.s==s?'on':''}"${e.cf?' disabled':''}>${n}</button>`).join('')}</div></div>`}
  if(t=='ctr'){const C=CF.contracts.slice().sort((a,b)=>(a.state=='cancelled')-(b.state=='cancelled')||String(a.n).localeCompare(b.n,'de'));const c=ED.ctr&&cfCtr(ED.ctr);let info='';
    if(c){const x=contractNext(c);info=`<div class="cell plain"><div class="t"><div class="s w">${c.state=='cancelled'?'Gekündigt, endet '+dLong(ymd(x.d)):x.kd?'Kündigen bis '+dLong(ymd(x.kd))+' · '+dlTxt(daysTo(ymd(x.kd))):(c.auto?'Verlängert sich am ':'Endet am ')+dLong(ymd(x.d))}${c.mon?' · '+eur(c.mon)+'/Monat':''}</div></div></div>`}
    return `<div class="cell plain"><label for="f_ctr">${lab}</label><select id="f_ctr" data-k="ctr"><option value="">${C.length?'nicht verknüpft':'keine Verträge geladen'}</option>${C.map(c=>`<option value="${esc(c.id)}"${c.id==ED.ctr?' selected':''}>${esc(c.n)}${c.state=='cancelled'?' (gekündigt)':''}</option>`).join('')}</select></div>${info}`}
  return `<div class="cell plain"><label for="f_${k}">${lab}</label><input id="f_${k}" data-k="${k}" placeholder="${esc(ph||'')}" value="${esc(v)}" autocomplete="off"></div>`}
function drawSheet(){const d=ED,F=FIELDS[d.art]||[],canKI=(d.files||[]).length&&A.cfg.ki!==false;
  $('sheetRoot').innerHTML=`<div class="scrim" id="shX"></div><div class="sheet" role="dialog" aria-modal="true" aria-label="Dokument">
  <div class="sheet-h"><button class="link" id="shC">Abbrechen</button><b>${edNew?'Neues Dokument':esc(d.titel||ARTN[d.art])}</b><button class="link" id="shS">Sichern</button></div>
  <div class="sheet-b">
   <div class="pages">${(d.files||[]).map((f,i)=>`<button class="page" data-pg="${i}" aria-label="Seite ${i+1} ansehen">${f.typ=='pdf'?'<span class="pdf">PDF</span>':f.th?`<img src="${f.th}" alt="">`:I('file',28)}<span class="x" data-rm="${i}" role="button" aria-label="Seite entfernen">×</span></button>`).join('')}
    <button class="page add" id="pgAdd">${I('cam')}<span>${(d.files||[]).length?'Seite dazu':'Foto oder PDF'}</span></button></div>
   ${canKI?`<div class="ki"><button class="btn soft" id="kiGo"${busy.ki?' disabled':''}>${busy.ki?penny('denkt',22)+' Penny liest …':I('spark',18)+' Mit KI auslesen'}</button></div>${d.art=='pers'?'<div class="note">Persönliches Dokument: Die Seiten gehen zum Auslesen entschlüsselt an die KI. Nur nutzen, wenn du das willst.</div>':''}`:''}
   <div class="chips">${ARTEN.map(a=>`<button class="chip${d.art==a.k?' on':''}" data-art="${a.k}">${I(a.k,15)}${esc(a.n)}</button>`).join('')}</div>
   <div class="group"><div class="cell plain"><label for="f_titel">Titel</label><input id="f_titel" data-k="titel" placeholder="${esc(ARTN[d.art])}" value="${esc(d.titel||'')}" autocomplete="off"></div>
    <div class="cell plain"><label for="f_datum">Datum</label><input id="f_datum" data-k="datum" type="date" value="${esc(d.datum||'')}"></div></div>
   <div class="group">${F.map(fieldRow).join('')}</div>
   <div class="group"><div class="cell plain"><label for="f_tags">Tags</label><input id="f_tags" data-k="tags" data-t="tags" placeholder="Komma-getrennt" value="${esc((d.tags||[]).join(', '))}" autocomplete="off"></div>
    <div class="cell col"><label for="f_notiz">Notiz</label><textarea id="f_notiz" data-k="notiz" rows="3">${esc(d.notiz||'')}</textarea></div></div>
   ${d.kurz?`<div class="note">${I('spark',13)} ${esc(d.kurz)}</div>`:''}
   ${edNew?'':`<button class="btn danger" id="shD">${edDel?'Wirklich löschen? Nochmal tippen':'Dokument löschen'}</button>`}
  </div></div>`;
  const on=(id,f)=>{const e=$(id);if(e)e.onclick=f};
  on('shX',tryClose);on('shC',tryClose);on('shS',saveDoc);on('cfGo',cfGehalt);on('kiGo',kiGo);
  on('shD',()=>{if(!edDel){edDel=true;drawSheet();return}delDoc(ED.id)});
  on('pgAdd',()=>{const p=$('pick');p.value='';p.click()});
  document.querySelectorAll('[data-rm]').forEach(b=>b.onclick=e=>{e.stopPropagation();ED.files.splice(+b.dataset.rm,1);drawSheet()});
  document.querySelectorAll('[data-pg]').forEach(b=>b.onclick=()=>docView(ED,+b.dataset.pg));
  document.querySelectorAll('[data-art]').forEach(b=>b.onclick=()=>{ED.art=b.dataset.art;if((ED.art=='rechnung'||ED.art=='reise')&&!STAT[ED.art].some(s=>s[0]==ED.status))ED.status='offen';drawSheet()});
  document.querySelectorAll('[data-st]').forEach(b=>b.onclick=()=>{ED.status=b.dataset.st;drawSheet()});
  document.querySelectorAll('.sheet [data-k]').forEach(el=>{const k=el.dataset.k,t=el.dataset.t;
    const up=()=>{ED[k]=t=='bool'?el.checked:t=='eur'?pNum(el.value):t=='tags'?el.value.split(',').map(s=>s.trim()).filter(Boolean).slice(0,10):el.value.trim()};
    el.oninput=up;el.onchange=()=>{up();if(k=='ctr')drawSheet()}})}
let edBase='';
function tryClose(){closeSheet()}
function saveDoc(){const d=ED;if(!d.titel)d.titel=[ARTN[d.art],d.abs||d.anlass||d.geraet].filter(Boolean).join(' ');
  if(!(d.files||[]).length&&!d.titel){tell('Ein Titel oder eine Seite fehlt noch.',{m:'denkt'});return}
  touch(d);const i=A.docs.findIndex(x=>x.id==d.id);if(i>=0)A.docs[i]=d;else A.docs.unshift(d);
  save();closeSheet();render();tell('')}
function cfGehalt(){const d=ED;if(!(d.betrag>0))return;const dt=d.ausz||(d.monat?d.monat+'-28':d.datum)||ymd(Date.now());
  saveDoc();const o={id:d.id,netto:d.betrag,dt,arb:d.abs||'',brutto:d.brutto||0,jb:d.jb||0};
  CF.at=0;kvPut('cf',CF).catch(()=>{});location.href='../cashflow-app/#ab-gehalt='+encodeURIComponent(JSON.stringify(o))}
function delDoc(id){const d=A.docs.find(x=>x.id==id);if(!d)return;d.del=Date.now();touch(d);save();closeSheet();render();
  tell('Gelöscht: <b>'+esc(d.titel||ARTN[d.art])+'</b>',{m:'oops',undo:()=>{delete d.del;touch(d);save();render()}})}
async function kiGo(){if(busy.ki)return;if(!kiOn()){tell(syOn()?'Offline: KI-Auslesen geht nur mit Verbindung.':'Für die KI bitte erst anmelden.',{m:'denkt'});return}
  const d=ED;busy.ki=true;drawSheet();
  try{const k=await kiRead(d);if(ED!==d)return;const n=kiApply(d,k);save(false);
    tell(n?'Penny hat <b>'+n+'</b> Feld'+(n>1?'er':'')+' ausgefüllt. Bitte kurz prüfen.':'Penny hat nichts Neues gefunden.',{m:n?'ok':'denkt'})}
  catch(e){tell(esc(e.message||String(e)),{m:'oops'})}
  finally{busy.ki=false;if(ED===d)drawSheet()}}
$('pick').onchange=async e=>{const fs=[...e.target.files];if(!fs.length||!ED)return;const d=ED;
  for(const f of fs){try{const r=await fTake(f);if(r.th)r.f.th=r.th.length<12000?r.th:'';d.files.push(r.f)}catch(err){tell(esc(err.message||String(err)),{m:'oops'})}}
  if(ED===d)drawSheet()};

/* ---------- Dokumentansicht ---------- */
let docURLs=[];
async function docView(d,start){const r=$('docvRoot');const close=()=>{r.innerHTML='';docURLs.forEach(u=>URL.revokeObjectURL(u));docURLs=[]};
  const draw=(body,files)=>{const sh=files&&files.length&&navigator.canShare&&navigator.canShare({files});
    r.innerHTML=`<div class="docv" role="dialog" aria-modal="true" aria-label="Dokument"><div class="docv-bar"><button id="dvX">Fertig</button><span>${esc(d.titel||ARTN[d.art]||'Dokument')}</span>${sh?`<button id="dvS" aria-label="Teilen oder sichern">${I('share',22)}</button>`:'<span style="min-width:60px"></span>'}</div><div class="docv-b">${body}</div></div>`;
    $('dvX').onclick=close;if($('dvS'))$('dvS').onclick=()=>navigator.share({files}).catch(()=>{})};
  draw('<div class="empty">Lade …</div>');const out=[],files=[];const nm=(d.titel||'Dokument').replace(/[\\/:*?"<>|]/g,'');
  const L=(d.files||[]).slice(start||0).concat((d.files||[]).slice(0,start||0));
  for(const f of L){const b=await fBlob(f).catch(()=>null);if(!b){out.push(`<div class="empty">${navigator.onLine===false?'Offline: Diese Seite liegt noch nicht auf dem Gerät.':'Seite konnte nicht geladen werden.'}</div>`);continue}
    const u=URL.createObjectURL(b);docURLs.push(u);if(typeof File=='function')files.push(new File([b],nm+(L.length>1?' '+(files.length+1):'')+(f.typ=='pdf'?'.pdf':'.jpg'),{type:b.type}));
    out.push(f.typ=='pdf'?`<iframe src="${u}" title="PDF"></iframe>`:`<img src="${u}" alt="Seite">`)}
  draw(out.join('')||'<div class="empty">Keine Seiten.</div>',files)}

/* ---------- Start ---------- */
function route(){const m=location.hash.match(/doc=([\w-]+)/);if(m){tab='docs';render();openDoc(m[1])}}
$('fab').onclick=newDoc;
document.addEventListener('visibilitychange',()=>{if(document.visibilityState=='visible'){sync();docFlush()}});
window.addEventListener('hashchange',route);
window.addEventListener('offline',render);
(async()=>{try{const s=await kvGet('state');if(s&&s.docs)A=Object.assign(A,s);const c=await kvGet('cf');if(c)CF=c}catch(e){tell('Lokaler Speicher nicht verfügbar. Privates Fenster?',{sys:true})}
  A.cfg=Object.assign({ki:true,model:'claude-haiku-5-5'},A.cfg||{});render();route();
  if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js',{scope:'./'}).catch(()=>{});
  if(syOn()){await sync();docFlush()}})();
