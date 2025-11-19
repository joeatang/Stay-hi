// Dashboard Classic Boot: extracted from hi-dashboard.html inline scripts (CSP externalization)
// Includes: S-DASH anchors, Premium calendar init, navigation + floating systems, QuoteCard generator
(function(){
  'use strict';

  // S-DASH Flag-Gated DOM Anchors (Hidden Placeholders)
  (async function initSDashAnchors() {
    try {
      if (window.HiFlags) {
        const flags = await Promise.all([
          window.HiFlags.getFlag('hi_dash_v3', false),
          window.HiFlags.getFlag('hi_dash_stats_row_v1', false),
          window.HiFlags.getFlag('hi_dash_medallion_cta_v1', false),
          window.HiFlags.getFlag('hi_dash_share_cta_v1', false),
          window.HiFlags.getFlag('hi_dash_global_pill_v1', false)
        ]);
        const [dashV3, statsRow, medallionCta, shareCta, globalPill] = flags;
        if (dashV3) {
          const container = document.createElement('div');
          container.id = 'sDashAnchors';
          container.style.display = 'none';
          let html = '';
          if (statsRow) {
            html += '<div id="statsRow">';
            html += '<div id="statTotal"></div>';
            html += '<div id="stat7d"></div>';
            html += '<div id="statStreak"></div>';
            if (globalPill) {
              html += '<div id="globalPill" class="hi-global-pill" aria-live="polite"></div>';
            }
            html += '</div>';
          }
          if (medallionCta) { html += '<div id="hiMedallion"></div>'; }
          if (shareCta) { html += '<button id="giveHiBtn" aria-label="Give Hi" title="Give Hi"></button>'; }
          container.innerHTML = html;
          document.body.appendChild(container);
          console.log('[S-DASH] Flag-gated anchors added:', { dashV3, statsRow, medallionCta, shareCta, globalPill });
        }
      }
    } catch (error) {
      console.warn('[S-DASH] Flag anchor setup failed:', error);
    }
  })();

  // Initialize Premium Features (Calendar + navigation helpers)
  document.addEventListener('DOMContentLoaded', () => {
    if (window.PremiumCalendar && !window.__hiCalendarInitialized) {
      window.__hiCalendarInitialized = true;
      window.hiCalendarInstance = new window.PremiumCalendar();
      console.log('[HI DEV] Calendar initialized once, stacking prevented');
      if (typeof setupCalendarIntegration === 'function') setupCalendarIntegration();
      if (typeof setupHomeNavigation === 'function') setupHomeNavigation();
    }
  });

  // Navigation system + floating refresh
  (function(){
    document.addEventListener('DOMContentLoaded', () => {
      if (window.hiNavSystem) {
        window.hiNavSystem.updateAppState('ready');
        window.hiNavSystem.trackNavigation('dashboard_load');
      }
    });

    function addFloatingRefresh() {
      if (!document.querySelector('.floating-refresh')) {
        const refreshButton = document.createElement('button');
        refreshButton.className = 'floating-refresh';
        refreshButton.innerHTML = '🔄';
        refreshButton.addEventListener('click', () => location.reload());
        document.body.appendChild(refreshButton);
      }
    }
    addFloatingRefresh();
  })();

  // Floating Hiffirmations System (class-based)
  class FloatingHiffirmations {
    constructor() {
      this.currentPage = 'dashboard';
      this.lastShown = 0;
      this.cooldownPeriod = 30000;
      this.messageHistory = [];
      this.maxHistorySize = 5;
      this.init();
    }
    init() {
      this.createFloatingButton();
      this.setupEventListeners();
      setTimeout(() => this.startActivityTriggers(), 5000);
    }
    createFloatingButton() {
      const button = document.createElement('button');
      button.className = 'floating-hiffirmations';
      button.innerHTML = '✨';
      button.setAttribute('aria-label', 'Contextual Hiffirmations');
      button.setAttribute('title', 'Get inspired');
      const popup = document.createElement('div');
      popup.className = 'hiffirmation-popup';
      popup.setAttribute('role', 'tooltip');
      popup.id = 'hiffirmationTooltip';
      popup.setAttribute('aria-label', 'Hiffirmation');
      popup.setAttribute('aria-live', 'polite');
      button.setAttribute('aria-describedby', 'hiffirmationTooltip');
      document.body.appendChild(button);
      document.body.appendChild(popup);
      this.button = button; this.popup = popup;
    }
    setupEventListeners() {
      this.button.addEventListener('click', () => this.showContextualMessage());
      document.addEventListener('click', (e) => {
        if (!this.button.contains(e.target) && !this.popup.contains(e.target)) this.hidePopup();
      });
    }
    getContextualMessages() {
      const userTier = this.getUserTier();
      const timeOfDay = this.getTimeOfDay();
      const engagementLevel = this.getEngagementLevel();
      const baseMessages = [
        "🌟 Every Hi moment counts",
        "✨ You're creating positive ripples",
        "💫 Your journey matters today",
        "🎯 Small actions, big impact",
        "💝 You're exactly where you need to be"
      ];
      const standardMessages = [
        "🚀 Your potential is unfolding beautifully",
        "🌈 Progress happens one Hi at a time",
        "⭐ You're building something meaningful",
        "🔥 Your energy lights up this space",
        "💪 Your consistency is your superpower",
        "🌅 Every day offers fresh possibilities"
      ];
      const premiumMessages = [
        "💎 Your unique light transforms everything",
        "🏔️ You're stronger than any challenge today",
        "🌺 Growth happens in your comfort with discomfort",
        "⚡ You're writing your own inspiring story",
        "🦄 Your authenticity creates lasting impact",
        "🎭 You master the art of conscious living"
      ];
      const timeContextMessages = this.getTimeContextMessages(timeOfDay, userTier);
      const engagementMessages = this.getEngagementMessages(engagementLevel, userTier);
      let messagePool = [...baseMessages];
      if (userTier === 'STANDARD' || userTier === 'PREMIUM') messagePool.push(...standardMessages);
      if (userTier === 'PREMIUM') messagePool.push(...premiumMessages);
      messagePool.push(...timeContextMessages);
      messagePool.push(...engagementMessages);
      return messagePool;
    }
    getTimeOfDay(){ const h=new Date().getHours(); if(h<12) return 'morning'; if(h<17) return 'afternoon'; return 'evening'; }
    getEngagementLevel(){ if(this.activityScore>20) return 'high'; if(this.activityScore>8) return 'medium'; return 'low'; }
    getTimeContextMessages(timeOfDay, userTier){
      const timeMessages={
        morning:{ base:["🌅 Fresh energy for a new day","☀️ Your morning intention shapes everything"], standard:["🌱 Plant seeds of positivity today","⭐ Morning momentum builds lasting change"], premium:["🎯 Your morning mindset architects your reality","🔥 You're designing today with purpose"] },
        afternoon:{ base:["⚡ Midday renewal brings clarity","🌞 Steady progress creates magic"], standard:["🎯 Afternoon focus amplifies your impact","💪 Your persistence is paying dividends"], premium:["🚀 You're in the flow of purposeful action","💎 Afternoon mastery builds lifetime habits"] },
        evening:{ base:["🌙 Evening reflection deepens wisdom","✨ Today's efforts become tomorrow's strength"], standard:["🌟 You're ending today stronger than you started","💫 Evening gratitude multiplies blessings"], premium:["🎭 Your evening presence honors the day's growth","🦋 You transform experiences into wisdom"] }
      };
      const messages=[...timeMessages[timeOfDay].base];
      if (userTier==='STANDARD' || userTier==='PREMIUM') messages.push(...timeMessages[timeOfDay].standard);
      if (userTier==='PREMIUM') messages.push(...timeMessages[timeOfDay].premium);
      return messages;
    }
    getEngagementMessages(engagementLevel, userTier){
      const engagementMessages={
        low:{ base:["🌱 Gentle steps forward count","💝 Your presence here matters"], standard:["🌊 Flow finds you when you're ready","⭐ Quiet moments build inner strength"], premium:["🧘‍♀️ Your stillness cultivates deeper wisdom","🌸 Gentle pace honors your authentic rhythm"] },
        medium:{ base:["🎯 Balanced energy serves you well","🌈 Steady progress creates lasting change"], standard:["💪 Your consistent effort compounds beautifully","🔥 Measured momentum builds sustainable success"], premium:["⚡ You master the art of intentional engagement","🎭 Your balanced approach inspires others"] },
        high:{ base:["🚀 Your energy is contagious","🔥 Channel this momentum wisely"], standard:["⭐ High energy focused creates miracles","💎 Your enthusiasm lights up everything"], premium:["🌟 You're a force of nature in conscious action","🦄 Your vibrant energy transforms environments"] }
      };
      const messages=[...engagementMessages[engagementLevel].base];
      if (userTier==='STANDARD' || userTier==='PREMIUM') messages.push(...engagementMessages[engagementLevel].standard);
      if (userTier==='PREMIUM') messages.push(...engagementMessages[engagementLevel].premium);
      return messages;
    }
    getUserTier(){ const tierEl=document.getElementById('hi-tier-indicator'); const txt=tierEl?.querySelector('.tier-text')?.textContent; if(txt==='Premium') return 'PREMIUM'; if(txt==='Standard') return 'STANDARD'; return 'ANONYMOUS'; }
    showContextualMessage(){ const now=Date.now(); if(now-this.lastShown<this.cooldownPeriod) return; const messages=this.getContextualMessages(); const available=messages.filter(m=>!this.messageHistory.includes(m)); if(!available.length){ this.messageHistory=[]; return this.showContextualMessage(); } const message=available[Math.floor(Math.random()*available.length)]; this.displayMessage(message); this.messageHistory.push(message); if(this.messageHistory.length>this.maxHistorySize) this.messageHistory.shift(); this.lastShown=now; }
    displayMessage(message,type='contextual'){
      this.popup.innerHTML = `\n          <span class="hiffirmation-text">${message}</span>\n          <button class="hiffirmation-share-mini" title="Share as quote card">📤</button>\n        `;
      this.popup.setAttribute('data-message-type', type);
      if (type==='milestone'){ this.popup.style.background='rgba(233, 30, 99, 0.1)'; this.popup.style.borderColor='rgba(233, 30, 99, 0.3)'; }
      else { this.popup.style.background='rgba(26, 32, 56, 0.95)'; this.popup.style.borderColor='rgba(255, 255, 255, 0.15)'; }
      const shareBtn=this.popup.querySelector('.hiffirmation-share-mini');
      shareBtn.addEventListener('click', async (e)=>{ e.stopPropagation(); await this.shareFloatingMessage(message); });
      this.popup.classList.add('show');
      const baseTime = type==='milestone' ? 5000 : 4000; const lengthBonus=Math.min(2000, message.length*50); const hideDelay=baseTime+lengthBonus; this.autoHideTimeout=setTimeout(()=> this.hidePopup(), hideDelay);
      this.trackMessageShown(message, type);
    }
    async shareFloatingMessage(message){ const shareBtn=this.popup.querySelector('.hiffirmation-share-mini'); const original=shareBtn.innerHTML; try{ shareBtn.innerHTML='⏳'; shareBtn.style.pointerEvents='none'; const userTier=this.getUserTier(); const dataURL=await window.HiQuoteCardGenerator.generateQuoteCard(message,{ userTier, format:'square', context:this.currentPage }); const blob=await window.HiQuoteCardGenerator.dataURLToBlob(dataURL); const file=new File([blob], `hi-${this.currentPage}-inspiration.png`, { type:'image/png' }); if (navigator.canShare && navigator.canShare({ files:[file] })){ await navigator.share({ title:'Inspiration from Stay Hi', text:`"${message}"\n\nShared from Stay Hi ✨`, files:[file] }); shareBtn.innerHTML='✅'; } else { const a=document.createElement('a'); a.href=dataURL; a.download=`hi-${this.currentPage}-inspiration.png`; a.click(); const textToCopy=`"${message}"\n\nShared from Stay Hi ✨\nstay-hi.app`; await navigator.clipboard.writeText(textToCopy); shareBtn.innerHTML='📥'; } setTimeout(()=>{ shareBtn.innerHTML=original; shareBtn.style.pointerEvents='auto'; },2000);} catch(err){ console.error('❌ Floating message sharing failed:', err); shareBtn.innerHTML='❌'; setTimeout(()=>{ shareBtn.innerHTML=original; shareBtn.style.pointerEvents='auto'; },2000);} }
    trackMessageShown(message,type){ if(!window.hiAnalytics) return; window.hiAnalytics.track('hiffirmation_shown',{ message_type:type, page_context:this.currentPage, user_tier:this.getUserTier(), activity_score:this.activityScore, session_messages:this.messageHistory.length, message_preview: message.substring(0,20)+'...' }); }
    hidePopup(){ this.popup.classList.remove('show'); if(this.autoHideTimeout){ clearTimeout(this.autoHideTimeout); } }
    startActivityTriggers(){ this.activityScore=0; this.milestoneActions=['selfHi5Enhanced','btnShare','hiffirmationsTrigger']; this.setupMilestoneTriggers(); this.setupSmartTimingAlgorithm(); this.trackUserEngagementPattern(); }
    setupMilestoneTriggers(){ this.milestoneActions.forEach(id=>{ const el=document.getElementById(id); if(el){ el.addEventListener('click', ()=>{ setTimeout(()=> this.showMilestoneMessage(id), 2000); }); } }); const medallion=document.querySelector('.medallion, [data-action="hi-wave"]'); if(medallion){ medallion.addEventListener('click', ()=> setTimeout(()=> this.showMilestoneMessage('hi-wave'), 1500)); } }
    showMilestoneMessage(actionType){ const now=Date.now(); if(now-this.lastShown<15000) return; const messages=this.getMilestoneMessages(actionType); const message=messages[Math.floor(Math.random()*messages.length)]; this.displayMessage(message,'milestone'); this.lastShown=now; }
    getMilestoneMessages(actionType){ const tier=this.getUserTier(); const map={ 'selfHi5Enhanced':{ base:["🙌 Hi love! Self-appreciation keeps you Hi!","✨ Hi supporter! You're your own Hi cheerleader!"], standard:["💝 Hi radiator! Your self-love creates Hi ripples!","🌟 Hi magnetic! Self-appreciation is Hi-ly attractive!"], premium:["👑 Hi royalty! You just modeled Hi-level self-worth!","💎 Hi inspiration! Your self-love lifts others Hi!"] }, 'hi-wave':{ base:["🌊 Hi connector! Every wave creates Hi bonds!","✨ Hi brightener! You just lifted someone Hi!"], standard:["💫 Hi contagious! Your Hi energy spreads joy!","🔥 Hi momentum! You're building Hi vibes!"], premium:["🚀 Hi catalyst! You spark Hi community joy!","⭐ Hi influencer! Your waves create Hi impact!"] }, 'btnShare':{ base:["📤 Hi sharer! Sharing multiplies Hi joy!","🌈 Hi storyteller! Your Hi story matters!"], standard:["🎯 Hi authentic! Vulnerability creates Hi connection!","💪 Hi brave! You inspire others to fly Hi!"], premium:["🌟 Hi transformer! Your Hi sharing elevates communities!","🔥 Hi leader! You're modeling Hi courage!"] } }; const set=map[actionType]||map['hi-wave']; let messages=[...set.base]; if(tier==='STANDARD'||tier==='PREMIUM') messages.push(...set.standard); if(tier==='PREMIUM') messages.push(...set.premium); return messages; }
    setupSmartTimingAlgorithm(){ let timer; let level='low'; const calc=()=>{ if(this.activityScore>20) level='high'; else if(this.activityScore>8) level='medium'; else level='low'; }; const interval=()=>{ const base={ low:300000, medium:240000, high:180000 }; const variance=Math.random()*60000; return base[level]+variance; }; const reset=()=>{ clearTimeout(timer); calc(); timer=setTimeout(()=>{ if(this.shouldShowSmartMessage()) this.showContextualMessage(); reset(); }, interval()); }; ['click','scroll','keypress','focus'].forEach(ev=>{ document.addEventListener(ev,(e)=>{ this.activityScore += this.getActivityWeight(e); setTimeout(()=>{ this.activityScore=Math.max(0,this.activityScore-1); },30000); },{passive:true}); }); reset(); }
    getActivityWeight(event){ const w={ click:3, scroll:1, keypress:2, focus:1 }; if(event.target && event.target.closest && event.target.closest('button, .medallion, [data-action]')) return (w[event.type]||1)*2; return w[event.type]||1; }
    shouldShowSmartMessage(){ const now=Date.now(); const since=now-this.lastShown; const min=45000; if(since<min) return false; const score=this.activityScore; if(score>25) return false; if(score<3 && since>180000) return true; return true; }
    trackUserEngagementPattern(){ this.engagementPattern={ sessionStart:Date.now(), totalClicks:0, milestoneActions:0, messageInteractions:0 }; this.button.addEventListener('click', ()=>{ this.engagementPattern.messageInteractions++; }); document.addEventListener('click', (e)=>{ this.engagementPattern.totalClicks++; if (e.target.closest && e.target.closest('.medallion, [data-action], button')){ this.engagementPattern.milestoneActions++; } }); }
  }
  // Start floating system
  window.addEventListener('DOMContentLoaded', () => { try { new FloatingHiffirmations(); } catch(e){ console.warn('FloatingHiffirmations init failed:', e); } });

  // Tesla-Grade Quote Card Generation System
  class HiQuoteCardGenerator {
    constructor(){ this.brandColors={ primary:'#FFD166', secondary:'#F4A261', accent:'#E76F51', background:'#0F1022', backgroundSecondary:'#1A1D3A', backgroundTertiary:'#252B52', text:'#FFFFFF', textSecondary:'rgba(255, 255, 255, 0.9)', textTertiary:'rgba(255, 255, 255, 0.6)'}; this.socialFormats={ instagram_post:{width:1080,height:1080}, instagram_story:{width:1080,height:1920}, twitter_card:{width:1200,height:675}, square:{width:1080,height:1080} }; this.logoCache=null; }
    async generateQuoteCard(message, options={}){ const { userTier='ANONYMOUS', format='square' } = options; const dims=this.socialFormats[format]; const canvas=this.createCanvas(dims.width,dims.height); const ctx=canvas.getContext('2d'); ctx.imageSmoothingEnabled=true; ctx.imageSmoothingQuality='high'; await this.drawBackground(ctx,canvas,userTier); await this.drawQuoteText(ctx,message,canvas,userTier); await this.drawBranding(ctx,canvas,userTier); return canvas.toDataURL('image/png',1.0); }
    createCanvas(w,h){ const c=document.createElement('canvas'); c.width=w; c.height=h; return c; }
    async drawBackground(ctx,canvas,userTier){ const {width,height}=canvas; const g=ctx.createLinearGradient(0,0,width,height); if(userTier==='PREMIUM'){ g.addColorStop(0,'#1A1D3A'); g.addColorStop(0.3,'#252B52'); g.addColorStop(0.6,'#2D3561'); g.addColorStop(1,'#1E2447'); } else if(userTier==='STANDARD'){ g.addColorStop(0,'#0F1022'); g.addColorStop(0.5,'#1A1D3A'); g.addColorStop(1,'#252B52'); } else { g.addColorStop(0,'#0F1022'); g.addColorStop(1,'#1A1D3A'); } ctx.fillStyle=g; ctx.fillRect(0,0,width,height); this.addGeometricPattern(ctx,canvas,userTier); if(userTier==='PREMIUM'){ this.addLightRays(ctx,canvas); } }
    addGeometricPattern(ctx,canvas,userTier){ const {width,height}=canvas; ctx.globalAlpha = userTier==='PREMIUM'?0.08:0.04; ctx.strokeStyle=this.brandColors.primary; ctx.lineWidth=1; const spacing=60; for(let i=-height;i<width+height;i+=spacing){ ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i+height,height); ctx.stroke(); } ctx.globalAlpha=1; }
    addLightRays(ctx,canvas){ const {width,height}=canvas; ctx.globalAlpha=0.05; const cx=width/2; const cy=height*0.3; for(let i=0;i<8;i++){ const angle=(Math.PI*2*i)/8; const grad=ctx.createRadialGradient(cx,cy,0,cx,cy,height*0.8); grad.addColorStop(0,this.brandColors.primary); grad.addColorStop(1,'transparent'); ctx.fillStyle=grad; ctx.save(); ctx.translate(cx,cy); ctx.rotate(angle); ctx.fillRect(-width*0.1,0,width*0.2,height); ctx.restore(); } ctx.globalAlpha=1; }
    async drawQuoteText(ctx,message,canvas,userTier){ const {width,height}=canvas; const centerX=width/2; const centerY=height/2; const fontSize=this.getFontSize(message.length,canvas); const fontWeight=userTier==='PREMIUM'?'600':'500'; const fontFamily='-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'; ctx.fillStyle=this.brandColors.text; ctx.font=`${fontWeight} ${fontSize}px ${fontFamily}`; ctx.textAlign='center'; ctx.textBaseline='middle'; const lines=this.wrapText(ctx,message,width*0.75); const lineHeight=fontSize*1.5; const totalTextHeight=lines.length*lineHeight; const startY=centerY-(totalTextHeight/2)+20; ctx.shadowColor='rgba(0, 0, 0, 0.5)'; ctx.shadowBlur=8; ctx.shadowOffsetY=3; lines.forEach((line,i)=>{ const y=startY+(i*lineHeight); ctx.fillText(line,centerX,y); }); ctx.shadowColor='transparent'; ctx.shadowBlur=0; ctx.shadowOffsetY=0; }
    getFontSize(len,canvas){ const base=canvas.width/18; if(len<30) return Math.min(base*1.3,70); if(len<60) return Math.min(base*1.1,60); if(len<100) return Math.min(base*0.95,52); return Math.min(base*0.8,44); }
    wrapText(ctx,text,maxWidth){ const words=text.split(' '); const lines=[]; let current=''; for(const w of words){ const test=current+(current?' ':'')+w; const metrics=ctx.measureText(test); if(metrics.width>maxWidth && current!==''){ lines.push(current); current=w; } else { current=test; } } if(current) lines.push(current); return lines; }
    async drawBranding(ctx,canvas,userTier){ const {width,height}=canvas; if(!this.logoCache) await this.loadLogo(); const brandingY=height-140; const logoSize=80; const logoX=width/2-(logoSize/2); if(this.logoCache){ ctx.drawImage(this.logoCache, logoX, brandingY-20, logoSize, logoSize); }
      ctx.fillStyle=this.brandColors.text; ctx.font='600 32px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'; ctx.textAlign='center'; ctx.fillText('Stay Hi', width/2, brandingY+85);
      ctx.font='500 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'; ctx.fillStyle=this.brandColors.primary; ctx.fillText('stay-hi.app', width/2, brandingY+120);
      if(userTier==='STANDARD'||userTier==='PREMIUM'){ this.drawTierBadge(ctx,canvas,userTier); }
    }
    drawTierBadge(ctx,canvas,userTier){ const {width}=canvas; const badgeY=50; const badgeW=200; const badgeH=40; const x=(width/2)-(badgeW/2); ctx.fillStyle='rgba(255, 255, 255, 0.15)'; ctx.strokeStyle='rgba(255, 255, 255, 0.3)'; ctx.lineWidth=2; this.roundRect(ctx,x,badgeY,badgeW,badgeH,20); ctx.fill(); ctx.stroke(); const txt=userTier==='PREMIUM'?'✨ Premium Member':'⭐ Standard Member'; ctx.fillStyle=this.brandColors.text; ctx.font='600 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'; ctx.textAlign='center'; ctx.fillText(txt, width/2, badgeY+25); }
    roundRect(ctx,x,y,w,h,r){ ctx.beginPath(); ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r); ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h); ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r); ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath(); }
    async loadLogo(){ return new Promise((resolve)=>{ const img=new Image(); img.crossOrigin='anonymous'; img.onload=()=>{ this.logoCache=img; resolve(); }; img.onerror=()=>{ console.warn('⚠️ Could not load logo for quote card'); resolve(); }; img.src='assets/brand/hi-logo-light.png'; }); }
    async dataURLToBlob(dataURL){ return new Promise(resolve=>{ const c=document.createElement('canvas'); const ctx=c.getContext('2d'); const img=new Image(); img.onload=()=>{ c.width=img.width; c.height=img.height; ctx.drawImage(img,0,0); c.toBlob(resolve,'image/png',1.0); }; img.src=dataURL; }); }
  }
  window.HiQuoteCardGenerator = new HiQuoteCardGenerator();
})();
