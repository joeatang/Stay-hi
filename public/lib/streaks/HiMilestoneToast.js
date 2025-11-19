(function(){
  if (window.HiMilestoneToast) return;
  const STORAGE_PREFIX = 'hi_last_streak_milestone:';

  function getUserKey(){
    try {
      const uid = window.hiAuth?.getCurrentUser?.()?.id || window.HiBase?.auth?.getCurrentUser?.()?.data?.id;
      return uid && uid !== 'anonymous' ? uid : 'anon';
    } catch { return 'anon'; }
  }

  function getStoredThreshold(){
    try { return parseInt(localStorage.getItem(STORAGE_PREFIX + getUserKey())||'0',10) || 0; } catch { return 0; }
  }
  function setStoredThreshold(th){
    try { localStorage.setItem(STORAGE_PREFIX + getUserKey(), String(th||0)); } catch {}
  }

  function ensureToastContainer(){
    let el = document.getElementById('hi-milestone-toast');
    if (el) return el;
    el = document.createElement('div');
    el.id = 'hi-milestone-toast';
    el.setAttribute('role','status');
    el.setAttribute('aria-live','polite');
    el.style.cssText = [
      'position:fixed','bottom:18px','left:50%','transform:translateX(-50%)',
      'background:rgba(26,32,56,0.92)','color:#fff','padding:10px 14px','border-radius:12px',
      'border:1px solid rgba(255,255,255,0.2)','box-shadow:0 10px 30px rgba(0,0,0,0.35)',
      'z-index:10050','font:600 13px -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif',
      'opacity:0','pointer-events:none','transition:opacity .25s ease, transform .25s ease'
    ].join(';');
    document.body.appendChild(el);
    return el;
  }

  function showToast(message){
    const el = ensureToastContainer();
    el.textContent = message;
    requestAnimationFrame(()=>{
      el.style.opacity='1';
      el.style.transform='translateX(-50%) translateY(-4px)';
      setTimeout(()=>{
        el.style.opacity='0';
        el.style.transform='translateX(-50%) translateY(0)';
      }, 2800);
    });
  }

  function maybeAnnounce(streak, opts={}){
    const s = Number(streak)||0; if (s<=0) return;
    const reg = window.HiStreakMilestones;
    if (!reg || typeof reg.describeProgress !== 'function') return;
    const { current } = reg.describeProgress(s);
    if (!current) return;
    const last = getStoredThreshold();
    if (current.threshold <= last) return; // already announced or lower
    // Announce
    const emoji = current.emoji || '🎉';
    showToast(`${emoji} ${current.name} — ${current.threshold}-day streak!`);
    setStoredThreshold(current.threshold);
    try { window.dispatchEvent(new CustomEvent('hi:milestone-announced', { detail: { threshold: current.threshold, name: current.name, source: opts.source||'unknown' } })); } catch {}
  }

  function resetForUser(){ setStoredThreshold(0); }

  window.HiMilestoneToast = { maybeAnnounce, resetForUser };
})();
