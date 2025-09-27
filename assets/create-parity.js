/* Create-like interactions for static HTML: stepper, emotions, journal, check-in, streaks, 90-day grid */
(function(){
const qs = s => document.querySelector(s);
const qsa = s => Array.from(document.querySelectorAll(s));


async function api(path, payload){
const r = await fetch(path, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload||{}) });
const d = await r.json(); if(!r.ok) throw new Error(d.error||'Request failed'); return d;
}


function setProgress(i,total){ const pct = Math.round(((i+1)/total)*100); const bar=qs('.bar>i'); if(bar) bar.style.width=pct+'%'; qsa('.dot').forEach((d,idx)=>d.classList.toggle('on', idx<=i)); }
function showStep(i){ const steps=qsa('.step'); steps.forEach((el,idx)=>el.classList.toggle('on', idx===i)); setProgress(i, steps.length); setTimeout(()=>{ const t=steps[i]?.querySelector('select,textarea,button'); t&&t.focus(); },10); }


async function ensureHeader(active){
if (window.StayHi?.initHeader) return window.StayHi.initHeader({ active });
// Fallback header if app.js is missing
const h = qs('#app-header'); if(!h) return; h.innerHTML = `
<div class="header-inner">
<a class="brand" href="/">Stay Hi</a>
<nav class="nav">
<a class="nav-link ${active==='Hi Island'?'active':''}" href="/hi-island.html">Hi Island</a>
<a class="nav-link ${active==='Hi Muscle'?'active':''}" href="/hi-muscle.html">Hi Muscle</a>
<a class="nav-link" href="/profile.html">Profile</a>
</nav>
<div class="spacer"></div>
<a class="link" href="/signin.html">Sign in</a>
</div>`;
}


async function loadEmotions(){ try{ const d = await api('/api/emotions',{action:'list'}); return d; }catch{ return { now:['Okay','Tired','Worried'], next:['Calm','Grateful','Confident']}; } }
async function listEntries(){ try{ const d = await api('/api/journal',{action:'list'}); return d.entries||[]; }catch{return[]} }
async function createEntry(emotion_from, emotion_to, note){ return api('/api/journal',{action:'create', emotion_from, emotion_to, note}); }
async function doCheckIn(emotion_from, emotion_to, note){ return api('/api/check-in',{action:'create', emotion_from, emotion_to, note}); }
async function streaks(){ try{ return await api('/api/streak-data',{action:'get'}); }catch(e){ return {current:0,best:0,totalDays:0}; } }


function renderEntries(list){ const box = qs('#entries'); if(!box) return; if(!list.length){ box.innerHTML = '<div class="toast">No sessions yet.</div>'; return; } box.innerHTML = list.map(e=>`
<div class="item"><span class="pill">${e.emotion_from} → ${e.emotion_to}</span>
<span>${(e.note||'').replace(/</g,'&lt;')}</span>
<time class="time">${new Date(e.created_at).toLocaleString()}</time></div>`).join(''); }


function renderGrid90(daysSet){ const root=qs('#grid90'); if(!root) return; const cells=[]; for(let i=0;i<90;i++){ cells.push('<div class="cell"></div>'); } root.innerHTML=cells.join(''); const today=new Date(); for(let i=0;i<90;i++){ const d=new Date(today); d.setDate(d.getDate()-i); const key=d.toISOString().slice(0,10); if(daysSet.has(key)) root.children[i].classList.add('on'); }
}


async function initIsland(){ await ensureHeader('Hi Island');
// progress + steps
showStep(0);
const emo = await loadEmotions();
const nowSel = qs('#feel-now'); const nextSel = qs('#feel-next');
nowSel.innerHTML = '<option value="">Select current feeling…</option>' + emo.now.map(x=>`<option>${x}</option>`).join('');
nextSel.innerHTML = '<option value="">Select desired feeling…</option>' + emo.next.map(x=>`<option>${x}</option>`).join('');


qs('#next1').addEventListener('click', ()=>showStep(1));
qs('#next2').addEventListener('click', ()=>showStep(2));
nowSel.addEventListener('change', ()=>showStep(1));
nextSel.addEventListener('change', ()=>showStep(2));


const toast = qs('#toast');
async function save(){ toast.className='toast'; toast.textContent='Saving…';
const f = nowSel.value.trim(); const t = nextSel.value.trim(); const note = (qs('#note').value||'').trim();
if(!f||!t){ toast.textContent='Pick both feelings'; toast.classList.add('err'); return; }
try{ await createEntry(f,t,note); toast.textContent='Saved ✨'; toast.classList.add('ok'); qs('#note').value=''; showStep(0); refreshList(); }
catch(e){ toast.textContent=e.message; toast.classList.add('err'); }
}
qs('#save').addEventListener('click', save);
qs('#note').addEventListener('keydown', e=>{ if(e.metaKey && e.key.toLowerCase()==='enter'){ e.preventDefault(); save(); }});


async function refreshList(){ const list = await listEntries(); renderEntries(list); }
refreshList();
}


async function initMuscle(){ await ensureHeader('Hi Muscle');
// Current + best streak
const box = qs('#streaks'); box.textContent = 'Loading…';
const s = await streaks(); box.textContent = `Current: ${s.current} • Best: ${s.best}`;


// Build 90-day set from entries
const entries = await listEntries(); const days = new Set(entries.map(e=>String(e.created_at).slice(0,10)));
renderGrid90(days);


// Check-in button
const btn = qs('#checkin'); const toast = qs('#mtoast');
btn.addEventListener('click', async ()=>{
toast.className='toast'; toast.textContent='Checking in…';
try{ await doCheckIn('Okay','Grateful',null); const s2 = await streaks(); box.textContent = `Current: ${s2.current} • Best: ${s2.best}`; toast.textContent='Checked in ✅'; toast.classList.add('ok');
// Update day 0 cell
})();
