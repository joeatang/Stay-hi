// Minimal Create-like interactions: stepper + save + list
(function(){
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));
  const post = (p, d) => fetch(p,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(d||{})}).then(r=>r.json());

  function header(active){
    const H = $('#app-header'); if(!H) return;
    H.innerHTML = `
      <div class="header-inner">
        <a class="brand" href="/">Stay Hi</a>
        <nav class="nav">
          <a href="/hi-island.html" class="${active==='island'?'active':''}">Hi Island</a>
          <a href="/hi-muscle.html" class="${active==='muscle'?'active':''}">Hi Muscle</a>
          <a href="/profile.html">Profile</a>
        </nav>
        <span style="margin-left:auto"></span>
        <a href="/signin.html" style="color:#7ce0c5;text-decoration:none">Sign in</a>
      </div>`;
  }

  function setProgress(i, total){
    const pct = Math.round(((i+1)/total)*100);
    const bar = $('.bar>i'); if (bar) bar.style.width = pct+'%';
    $$('.dot').forEach((d,idx)=>d.classList.toggle('on', idx<=i));
  }
  function showStep(i){
    const steps = $$('.step'); steps.forEach((s,idx)=>s.classList.toggle('on', idx===i));
    setProgress(i, steps.length);
  }

  async function initIsland(){
    header('island'); showStep(0);
    // emotions
    let now=[], next=[];
    try { const d = await post('/api/emotions',{action:'list'}); now=d.now||[]; next=d.next||[]; }
    catch { now=['Okay','Tired','Worried']; next=['Calm','Grateful','Confident']; }
    const nowSel = $('#feel-now'), nextSel = $('#feel-next');
    nowSel.innerHTML = '<option value="">Select current feeling…</option>'+now.map(x=>`<option>${x}</option>`).join('');
    nextSel.innerHTML = '<option value="">Select desired feeling…</option>'+next.map(x=>`<option>${x}</option>`).join('');

    $('#next1').onclick = ()=>showStep(1);
    $('#next2').onclick = ()=>showStep(2);
    nowSel.onchange = ()=>showStep(1);
    nextSel.onchange = ()=>showStep(2);

    const toast = $('#toast');
    async function save(){
      toast.className='toast'; toast.textContent='Saving…';
      const f = nowSel.value.trim(), t = nextSel.value.trim(), note = ($('#note').value||'').trim();
      if(!f||!t){ toast.textContent='Pick both feelings'; toast.classList.add('err'); return; }
      try{
        await post('/api/journal',{action:'create', emotion_from:f, emotion_to:t, note});
        toast.textContent='Saved ✨'; toast.classList.add('ok'); $('#note').value=''; showStep(0); refreshList();
      }catch(e){ toast.textContent=(e?.message||'Save failed'); toast.classList.add('err'); }
    }
    $('#save').onclick = save;

    async function refreshList(){
      try{
        const d = await post('/api/journal',{action:'list'});
        const box = $('#entries');
        if(!d.entries?.length){ box.innerHTML='<div class="toast">No sessions yet.</div>'; return; }
        box.innerHTML = d.entries.map(e=>`
          <div class="panel" style="padding:12px 14px;margin:0">
            <span style="background:#ffffff15;border:1px solid #242643;border-radius:999px;padding:4px 10px;margin-right:8px">
              ${e.emotion_from} → ${e.emotion_to}
            </span>
            <span>${(e.note||'').replace(/</g,'&lt;')}</span>
            <time style="float:right;color:#aeb1cc">${new Date(e.created_at).toLocaleString()}</time>
          </div>`).join('');
      }catch{ /* ignore */ }
    }
    refreshList();
  }

  async function initMuscle(){
    header('muscle');
    const box = $('#streaks'); box.textContent='Loading…';
    try{
      const s = await post('/api/streak-data',{action:'get'});
      box.textContent = (s.error?'—':`Current: ${s.current} • Best: ${s.best}`);
    }catch{ box.textContent='—'; }
    $('#checkin').onclick = async ()=>{
      const t = $('#mtoast'); t.textContent='Checking in…'; t.className='toast';
      try{ await post('/api/check-in',{action:'create'}); t.textContent='Checked in ✅'; t.classList.add('ok'); }
      catch(e){ t.textContent=e.message||'Error'; t.classList.add('err'); }
    };
  }

  window.CreateParity = { initIsland, initMuscle };
})();
