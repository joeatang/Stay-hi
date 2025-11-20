// admin-link-autoinit.js (DEPRECATED)
// Consolidated via header.js navigation & verification banner.
(function(){
  function resolve(p){ return (window.hiPaths?.resolve ? window.hiPaths.resolve(p) : p); }
  async function isAdmin(){ try { return !!(await window.AdminAccessManager?.checkAdmin())?.isAdmin; } catch { return false; } }
  function reveal(){
    document.querySelectorAll('.admin-item').forEach(a=> a.style.display='');
    // Floating button deprecated – rely on header menu.
  }
  function attachLegacyLinks(){
    document.querySelectorAll('a.nav-item.admin-item[href*="hi-mission-control.html"]').forEach(a=>{
      if(a.__adminLinkStub) return; a.__adminLinkStub=true;
      a.addEventListener('click', async e=>{ e.preventDefault(); if(await isAdmin()){ window.location.href=resolve('hi-mission-control.html'); } else { (document.getElementById('openMissionControl')||{}).click?.(); } });
    });
  }
  window.addEventListener('hi:admin-confirmed', ()=>{ try{ sessionStorage.setItem('hi_admin_access','true'); }catch{} reveal(); });
  window.addEventListener('hi:admin-state-changed', e=>{ if(e?.detail?.isAdmin){ try{ sessionStorage.setItem('hi_admin_access','true'); }catch{} reveal(); }});
  function init(){ attachLegacyLinks(); if(sessionStorage.getItem('hi_admin_access')==='true') reveal(); }
  if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded', init, { once:true }); } else { init(); }
  // Legacy globals expected by other scripts
  window.openMcAccessGateModal = function(){ (document.getElementById('openMissionControl')||{}).click?.(); };
  window.attachMissionGate = function(el){ if(!el) return; if(el.__adminLinkStub) return; el.__adminLinkStub=true; el.addEventListener('click', async e=>{ e.preventDefault(); if(await isAdmin()) window.location.href=resolve('hi-mission-control.html'); else (document.getElementById('openMissionControl')||{}).click?.(); }); };
})();
