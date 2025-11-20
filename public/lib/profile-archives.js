/* profile-archives.js
 * Renders functional Archives: current streak, recent check-ins, and points summaries.
 * Data sources: hi_points_daily_checkins, hi_points_ledger.
 */
(function(){
  const sb = window.supabaseClient || window.supabase;
  if(!sb){ console.warn('[Archives] Supabase client not found'); return; }

  async function getSession(){
    try { const { data } = await sb.auth.getSession(); return data?.session || null; } catch{ return null; }
  }

  function ymd(date){
    const d = new Date(date); const y=d.getUTCFullYear(); const m=String(d.getUTCMonth()+1).padStart(2,'0'); const da=String(d.getUTCDate()).padStart(2,'0');
    return `${y}-${m}-${da}`;
  }

  function computeStreak(daysSet){
    // daysSet: Set of 'YYYY-MM-DD' strings (UTC)
    let streak = 0; const today = new Date();
    for(let i=0;i<365;i++){
      const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()-i));
      const key = ymd(d);
      if(daysSet.has(key)) streak++; else break;
    }
    return streak;
  }

  function renderHeatmap(container, daysSet){
    // Render last 35 days (5 weeks) as 7x5 grid
    const wrap = document.createElement('div');
    wrap.style.display = 'grid';
    wrap.style.gridTemplateColumns = 'repeat(7, 14px)';
    wrap.style.gap = '4px';
    const today = new Date();
    for(let i=34;i>=0;i--){
      const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()-i));
      const key = ymd(d);
      const cell = document.createElement('div');
      cell.title = key;
      cell.style.width = '14px';
      cell.style.height = '14px';
      cell.style.borderRadius = '3px';
      const has = daysSet.has(key);
      cell.style.background = has ? '#36d399' : 'rgba(255,255,255,0.08)';
      cell.style.border = '1px solid rgba(255,255,255,0.1)';
      wrap.appendChild(cell);
    }
    container.innerHTML = '';
    container.appendChild(wrap);
  }

  function groupLedgerByReason(rows){
    const map = new Map();
    for(const r of rows){
      const k = r.reason || 'unknown';
      const v = Number(r.delta)||0;
      map.set(k, (map.get(k)||0) + v);
    }
    return Array.from(map.entries()).map(([reason,total])=>({reason,total})).sort((a,b)=> b.total - a.total);
  }

  async function loadArchives(){
    const session = await getSession();
    if(!session){ return; }
    const uid = session.user.id;

    // Fetch last 90 check-in days
    const { data: checkins, error: e1 } = await sb.from('hi_points_daily_checkins')
      .select('day').eq('user_id', uid).order('day', { ascending:false }).limit(90);
    if(e1){ console.warn('[Archives] checkins error', e1.message); }
    const daysSet = new Set((checkins||[]).map(r=> r.day));
    const streak = computeStreak(daysSet);

    const streakEl = document.getElementById('archivesStreakValue');
    if(streakEl){ streakEl.textContent = `${streak} day${streak===1?'':'s'}`; }
    const heatEl = document.getElementById('archivesHeatmap');
    if(heatEl){ renderHeatmap(heatEl, daysSet); }

    // Recent 14-day list
    const listEl = document.getElementById('archivesCheckinsList');
    if(listEl){
      listEl.innerHTML = '';
      const today = new Date();
      for(let i=0;i<14;i++){
        const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()-i));
        const key = ymd(d);
        const li = document.createElement('div');
        li.style.display='flex'; li.style.justifyContent='space-between'; li.style.padding='6px 0';
        li.innerHTML = `<span>${key}</span><span>${daysSet.has(key) ? '✅' : '—'}</span>`;
        listEl.appendChild(li);
      }
    }

    // Points summaries last 30 days
    const since = new Date(); since.setUTCDate(since.getUTCDate()-30);
    const { data: ledger, error: e2 } = await sb.from('hi_points_ledger')
      .select('delta, reason, ts').eq('user_id', uid)
      .gte('ts', since.toISOString())
      .order('ts', { ascending:false }).limit(200);
    if(e2){ console.warn('[Archives] ledger error', e2.message); }
    const grouped = groupLedgerByReason(ledger||[]);
    const sumEl = document.getElementById('archivesPointsSummary');
    if(sumEl){
      sumEl.innerHTML = '';
      grouped.slice(0,6).forEach(({reason,total})=>{
        const chip = document.createElement('span');
        chip.style.padding='6px 10px';
        chip.style.background='rgba(255,255,255,0.07)';
        chip.style.borderRadius='10px';
        chip.style.fontSize='12px';
        chip.textContent = `${reason}: +${total}`;
        sumEl.appendChild(chip);
        sumEl.appendChild(document.createTextNode(' '));
      });
      if(!grouped.length){ sumEl.textContent = 'No points in last 30 days yet.'; }
    }
  }

  window.addEventListener('DOMContentLoaded', loadArchives);
})();
