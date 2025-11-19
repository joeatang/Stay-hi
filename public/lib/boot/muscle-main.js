(async function(){
  console.log('💪 Hi-Muscle loading...');
  
  try { await hiAuth.ensureSessionMaybe?.(); } catch {}

  // 🎯 Initialize global stats variables (required for Total His tracking)
  if (window.gTotalHis === undefined) window.gTotalHis = 0;
  if (window.gWaves === undefined) window.gWaves = 0; 
  if (window.gUsers === undefined) window.gUsers = 0;
  console.log('✅ Global stats initialized:', { gTotalHis: window.gTotalHis, gWaves: window.gWaves, gUsers: window.gUsers });

  // ---------- Wait for emotions.js to load ----------
  await waitForEmotions();
  
  async function waitForEmotions() {
    let attempts = 0;
    while (!window.HI_EMOTIONS && attempts < 50) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    if (!window.HI_EMOTIONS) {
      console.warn('⚠️ emotions.js failed to load, using fallback data');
    } else {
      console.log('✅ HI_EMOTIONS loaded:', window.HI_EMOTIONS);
    }
  }

  // ---------- Emotion data adapter ----------
  function getEmotionCatalog(){
    // Accept any of these shapes:
    // 1) window.HI_EMOTIONS = { categories:[{id,items:[{name,emoji,desc}]}] }
    // 2) window.emotions or window.EMOTIONS = { hi:[], neutral:[], opportunity:[] } OR array of {name,emoji,desc,cat}
    const H = (window.HI_EMOTIONS && window.HI_EMOTIONS.categories) ? window.HI_EMOTIONS
          : null;

    if (H) return H; // already in the right shape

    const raw = window.emotions || window.EMOTIONS || {};
    const byId = { hi:[], neutral:[], opportunity:[] };

    if (Array.isArray(raw)) {
      raw.forEach(x=>{
        const cat = (x.cat||'hi').toLowerCase();
        (byId[cat] || byId.hi).push({ name:x.name, emoji:x.emoji||'✨', desc:x.desc||'' });
      });
    } else {
      ['hi','neutral','opportunity'].forEach(id=>{
        const list = raw[id] || [];
        byId[id] = list.map(x => ({ name:x.name, emoji:x.emoji||'✨', desc:x.desc||'' }));
      });
    }

    return {
      categories: [
        { id:'hi',          items: byId.hi },
        { id:'neutral',     items: byId.neutral },
        { id:'opportunity', items: byId.opportunity }
      ]
    };
  }

  const CATALOG = getEmotionCatalog();

  const state = { step:1, current:null, desired:null, cat:'hi', q:'' };

  // Els
  const grid = document.getElementById('grid');
  const search = document.getElementById('search');
  const toggleView = document.getElementById('toggleView');
  const nextBtn = document.getElementById('next');
  const backBtn = document.getElementById('back');
  const badgeCur = document.getElementById('badge-current');
  const badgeDes = document.getElementById('badge-desired');
  const journalCard = document.getElementById('journalCard');
  const journal = document.getElementById('journal');
  const count = document.getElementById('count');
  const desiredLabel = document.getElementById('desiredLabel');
  const s1 = document.getElementById('s1'), s2 = document.getElementById('s2'), s3 = document.getElementById('s3');
  const p1 = document.getElementById('p1'), p2 = document.getElementById('p2');
  const toastEl = document.getElementById('toast');

  // Sheet bits
  const sheet = document.getElementById('sheet');
  const backdrop = document.getElementById('backdrop');
  const togglePublic = document.getElementById('togglePublic');
  const toggleAnon = document.getElementById('toggleAnon');
  const locationInput = document.getElementById('locationInput');
  const cancelShare = document.getElementById('cancelShare');
  const confirmShare = document.getElementById('confirmShare');

  // Tabs
  document.querySelectorAll('.tab').forEach(t=>{
    t.addEventListener('click', ()=>{
      document.querySelectorAll('.tab').forEach(x=>x.setAttribute('aria-selected','false'));
      t.setAttribute('aria-selected','true');
      state.cat = t.dataset.cat;
      renderGrid();
    });
  });

  // Search / compact
  search.addEventListener('input', ()=>{ state.q = search.value.trim(); renderGrid(); });
  toggleView.addEventListener('click', ()=>{
    const descs = document.querySelectorAll('.desc');
    const compact = toggleView.textContent === 'Compact';
    toggleView.textContent = compact ? 'Comfort' : 'Compact';
    descs.forEach(d => d.style.display = compact ? 'none' : '');
  });

  // Nav with enhanced validation
  backBtn.addEventListener('click', ()=>{
    if (state.step === 1) { window.location.href='index.html'; return; }
    if (state.step === 2) { setStep(1); return; }
    if (state.step === 3) { setStep(2); return; }
  });
  
  nextBtn.addEventListener('click', (e)=>{
    e.preventDefault();
    console.log('Next button clicked, step:', state.step, 'current:', state.current, 'desired:', state.desired);
    
    if (state.step === 1) {
      if (!state.current) {
        toast('Please choose how you feel right now');
        return;
      }
      setStep(2);
      return;
    }
    
    if (state.step === 2) {
      if (!state.desired) {
        toast('Please choose where you want to be emotionally');
        return;
      }
      setStep(3);
      return;
    }
    
    if (state.step === 3) {
      const journalText = journal.value.trim();
      console.log('Journal text length:', journalText.length);
      if (journalText.length < 10) {
        toast('Please write at least 10 characters in your reflection');
        journal.focus();
        return;
      }
      console.log('Opening unified share sheet for Hi Muscle...');
      try {
        // 🌟 TESLA-GRADE: Use unified share sheet with Hi Muscle journal data
        const journalText = journal.value.trim();
        
        console.log('💪 [Hi-Muscle] Share button clicked!');
        // Pre-populate the share sheet with the Hi Muscle reflection
        if (window.openHiShareSheet) {
          console.log('✅ Opening Hi-Muscle share sheet with data:', { journalText, currentEmoji: state.current?.emoji, desiredEmoji: state.desired?.emoji });
          window.openHiShareSheet('hi-muscle', { 
            prefilledText: journalText,
            currentEmoji: state.current?.emoji,
            desiredEmoji: state.desired?.emoji 
          });
        } else {
          console.error('❌ CRITICAL: Unified share sheet failed to initialize. Check console for module loading errors.');
          console.log('🔍 Available globals:', Object.keys(window).filter(k => k.includes('Hi')));
          toast('Share system unavailable. Please refresh the page.', 'warning');
        }
      } catch (error) {
        console.error('Error opening share sheet:', error);
        toast('Something went wrong. Please try again.', 'warning');
      }
      return;
    }
  });

  // Switch helpers
  function setSwitch(el,on){ el.classList.toggle('on', !!on); el.setAttribute('aria-checked', on?'true':'false'); }
  function getSwitch(el){ return el.classList.contains('on'); }
  [togglePublic,toggleAnon].forEach(sw=>{
    sw.addEventListener('click', ()=> setSwitch(sw, !getSwitch(sw)));
    sw.addEventListener('keydown', (e)=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); setSwitch(sw, !getSwitch(sw)); }});
  });
  backdrop.addEventListener('click', closeSheet);
  cancelShare.addEventListener('click', closeSheet);
  
  function openSheet(){ 
    console.log('openSheet called, sheet element:', sheet, 'backdrop element:', backdrop);
    if (!sheet || !backdrop) {
      console.error('Sheet or backdrop element not found!');
      return;
    }
    sheet.classList.remove('hide'); 
    sheet.classList.add('show'); 
    sheet.setAttribute('aria-hidden','false'); 
    backdrop.style.display='block';
    console.log('Sheet opened, classes:', sheet.classList.toString());
  }
  
  function closeSheet(){ 
    console.log('closeSheet called');
    sheet.classList.remove('show'); 
    sheet.classList.add('hide'); 
    sheet.setAttribute('aria-hidden','true'); 
    setTimeout(()=>backdrop.style.display='none',180); 
  }

  // Writes
  confirmShare.addEventListener('click', async (e)=>{
    e.preventDefault();
    console.log('Share Journey button clicked');
    
    // 🚀 TESLA-GRADE: Check authentication FIRST for proper UX
    let isAuthenticated = false;
    let userId = null;
    
    try {
      // Ensure HiSupabase is available before attempting auth check
      if (window.HiSupabase && window.HiSupabase.getClient) {
        const { data: { user } } = await window.HiSupabase.getClient().auth.getUser();
        isAuthenticated = !!user;
        userId = user?.id;
      } else {
        console.log('HiSupabase not initialized, user is anonymous');
        isAuthenticated = false;
      }
    } catch (error) {
      console.log('Authentication check failed, user is anonymous:', error.message);
      isAuthenticated = false;
    }
    
    if (!isAuthenticated) {
      // Anonymous user - show upgrade prompt
      confirmShare.disabled = false;
      confirmShare.textContent = 'Share Journey';
      
      const shouldUpgrade = confirm(`🌟 Your emotional journey looks amazing!\n\nJoin Hi to:\n• Save your journey forever\n• Share with the community\n• Track your emotional growth\n• Get personalized insights\n\nWould you like to sign up or log in?`);
      
      if (shouldUpgrade) {
        window.location.href = '/signin.html?redirect=' + encodeURIComponent(window.location.pathname + '?journey=completed');
      }
      return;
    }
    
    // Authenticated user - proceed with sharing
    confirmShare.disabled = true;
    confirmShare.textContent = 'Sharing...';
    
    try {
      const text = journal.value.trim();
      const isAnon = getSwitch(toggleAnon);
      const loc = (locationInput.value||'').trim();

      console.log('Submitting Hi Gym journey:', { 
        current: state.current?.name, 
        desired: state.desired?.name, 
        textLength: text.length,
        isAnon,
        toIsland: true,  // Always share to island
        location: loc
      });

      // 🌟 TESLA-GRADE: Increment global Hi counter (same as unified share sheet)
      const LS_TOTAL = 'hi_total_count';
      const LS_GLOBAL = 'hi_global_shares';
      
      let total = parseInt(localStorage.getItem(LS_TOTAL) || '0', 10);
      let gStarts = parseInt(localStorage.getItem(LS_GLOBAL) || '0', 10);
      
      total += 1;
      gStarts += 1;
      
      localStorage.setItem(LS_TOTAL, String(total));
      localStorage.setItem(LS_GLOBAL, String(gStarts));
      
      console.log('📊 Global Hi counter incremented (hiGYM):', { total, gStarts });

      // Tesla-grade journey analytics
      const sessionData = {
        current: state.current,
        desired: state.desired,
        journal: text,
        duration: Date.now() - (state.startTime || Date.now()),
        timestamp: Date.now()
      };

      // Track emotional pattern
      const pattern = window.HiGym?.trackEmotionalPattern(sessionData);
      
      // Create celebration message
      const celebration = window.HiGym?.createJourneyCelebration(sessionData);

      // 🚀 INTEGRATION #1A: HiGYM shares via HiBase (flagged rollout)
      const useHiBase = await window.HiFlags?.getFlag('hibase_shares_enabled');
      console.log(`🔄 HiGYM submission via ${useHiBase ? 'HiBase' : 'legacy'} path`);

      if (useHiBase) {
        // 🎯 HiBase path: unified API with structured payload
        console.log('📦 HiGYM → HiBase.insertShare...');
        const shareResult = await window.HiBase.insertShare({
          type: 'HiGYM',
          text: text,
          visibility: isAnon ? 'anonymous' : 'public',
          user_id: userId, // Already retrieved above
          emotion_from: state.current?.name,
          emotion_to: state.desired?.name,
          location: loc || null,
          metadata: {
            currentEmoji: state.current.emoji,
            desiredEmoji: state.desired.emoji,
            journeyType: pattern?.journeyType || 'exploration',
            tags: ['emotional-journey', 'higym'],
            origin: 'higym'
          }
        });

        if (shareResult.error) {
          throw new Error(`HiBase insertion failed: ${shareResult.error.message}`);
        }

        // 📊 Track HiBase usage
        import('./lib/monitoring/HiMonitor.js').then(m => 
          m.trackEvent('hibase_share_success', { 
            source: 'higym', 
            path: 'hibase'
          })
        ).catch(() => {});

        // 🚀 INTEGRATION #5: HiGYM streak tracking via HiBase (flagged rollout)
        const useHiBaseStreaks = await window.HiFlags?.getFlag('hibase_streaks_enabled');
        console.log(`🔄 HiGYM streak tracking via ${useHiBaseStreaks ? 'HiBase' : 'legacy'} path`);
        
        if (useHiBaseStreaks) {
          try {
            // 🎯 HiBase streak path for HiGYM completion
            console.log('📦 HiGYM Streak → HiBase.updateStreak...');
            // Use userId from earlier authentication check
            
            if (userId && userId !== 'anonymous') {
              const streakResult = await window.HiBase.updateStreak(userId, {
                hiDate: new Date().toISOString().split('T')[0],
                type: 'HiGYM',
                emotion_from: state.current?.name,
                emotion_to: state.desired?.name
              });
              
              if (streakResult.error) {
                console.warn('⚠️ HiBase HiGYM streak update failed:', streakResult.error);
              } else {
                console.log('✅ HiGYM streak updated via HiBase:', streakResult.data.message);
                
                // Show HiGYM-specific streak celebration
                if (streakResult.data.milestone) {
                  setTimeout(() => {
                    if (window.toast) {
                      const gymMessage = `💪 HiGYM Streak: ${streakResult.data.streak?.current} days! ${streakResult.data.message}`;
                      window.toast(gymMessage, 'celebration');
                    }
                  }, 1500);
                }
              }
            }
          } catch (error) {
            console.warn('⚠️ HiBase HiGYM streak tracking failed:', error);
          }
        } else {
          // 🔄 Legacy HiGYM streak tracking
          console.log('📦 HiGYM Streak → Legacy tracking...');
          
          // Legacy streak logic for HiGYM would go here
          
          // 📊 Track legacy streak usage
          import('./lib/monitoring/HiMonitor.js').then(m => 
            m.trackEvent('streak_update', { 
              path: 'legacy', 
              type: 'HiGYM',
              source: 'higym'
            })
          ).catch(() => {});
        }
      } else {
        // 🔄 Legacy path: direct hiDB calls
        console.log('📦 HiGYM → Legacy hiDB...');
        
        // Always save to personal archive
        console.log('Saving to archive...');
        await window.hiDB.insertArchive({
          currentEmoji: state.current.emoji,
          desiredEmoji: state.desired.emoji,
          journal: text,
          text: text, // Gold standard: include text field for archive display
          location: loc,
          journeyType: pattern?.journeyType || 'exploration',
          origin: 'higym', // Gold standard: lowercase origin tag
          type: 'higym' // Gold standard: type tag for filtering
        });

        // Always share to Hi Island as part of the flow
        console.log('Sharing to Hi Island...');
        await window.hiDB.insertPublicShare({
          currentEmoji: state.current.emoji, 
          currentName: state.current.name,
          desiredEmoji: state.desired.emoji, 
          desiredName: state.desired.name,
          text, 
          isAnonymous: isAnon, 
          location: loc || null, // Clean pipe: null for no location
          isPublic: true,
          origin: 'higym', // Gold standard: lowercase origin tag
          journeyType: pattern?.journeyType || 'exploration',
          tags: ['emotional-journey', 'higym'] // Gold standard: lowercase tags
        });

        // 📊 Track legacy usage
        import('./lib/monitoring/HiMonitor.js').then(m => 
          m.trackEvent('hibase_share_success', { 
            source: 'higym', 
            path: 'legacy'
          })
        ).catch(() => {});

        // 🔄 Legacy HiGYM streak tracking (since HiBase shares are legacy too)
        const useHiBaseStreaks = await window.HiFlags?.getFlag('hibase_streaks_enabled');
        console.log(`🔄 HiGYM streak tracking via ${useHiBaseStreaks ? 'HiBase' : 'legacy'} path (in legacy share context)`);

        if (useHiBaseStreaks) {
          try {
            // Even in legacy share mode, we can still use HiBase streaks if enabled
            console.log('📦 HiGYM Streak → HiBase.updateStreak (legacy share context)...');
            // Use userId from earlier authentication check
            
            if (userId && userId !== 'anonymous') {
              const streakResult = await window.HiBase.updateStreak(userId, {
                hiDate: new Date().toISOString().split('T')[0],
                type: 'HiGYM',
                emotion_from: state.current?.name,
                emotion_to: state.desired?.name
              });

              if (streakResult.error) {
                console.warn('⚠️ HiBase HiGYM streak update failed (legacy context):', streakResult.error);
              } else {
                console.log('✅ HiGYM streak updated via HiBase (legacy context):', streakResult.data.message);
              }
            }

            // 📊 Track HiBase streak usage in legacy share context
            import('./lib/monitoring/HiMonitor.js').then(m => 
              m.trackEvent('streak_update', { 
                path: 'hibase', 
                type: 'HiGYM',
                source: 'higym',
                share_path: 'legacy',
                emotion_from: state.current?.name,
                emotion_to: state.desired?.name
              })
            ).catch(() => {});

          } catch (error) {
            console.warn('⚠️ HiBase HiGYM streak tracking failed (legacy context):', error);
          }
        } else {
          // 📊 Track legacy streak usage
          import('./lib/monitoring/HiMonitor.js').then(m => 
            m.trackEvent('streak_update', { 
              path: 'legacy', 
              type: 'HiGYM',
              source: 'higym',
              share_path: 'legacy'
            })
          ).catch(() => {});
        }
      }

      closeSheet();
      
      // 📊 Analytics: Track successful gym submission
      import('./lib/monitoring/HiMonitor.js').then(m => 
        m.trackEvent('gym_submit', { 
          moodFrom: state.current?.name,
          moodTo: state.desired?.name,
          journeyType: pattern?.journeyType || 'exploration'
        })
      ).catch(() => {}); // Silent fail
      
      // 🎉 TESLA-GRADE: Premium celebration for emotional journey completion
      const celebrationMsg = celebration?.message || '🌟 Amazing emotional journey completed!';
      toast(celebrationMsg, 'celebration');
      
      // Premium UX celebration integration
      if (window.PremiumUX) {
        // Center-screen celebration from share button
        setTimeout(() => {
          window.PremiumUX.confetti({ 
            count: 25, 
            colors: ['#4ECDC4', '#FFD93D', '#FF6B6B', '#8A2BE2'] 
          });
        }, 100);
        window.PremiumUX.triggerHapticFeedback('celebration');
      }
      
      // Add subtle background glow animation
      setTimeout(() => {
        document.body.style.background = 'radial-gradient(1200px 600px at 50% -220px, rgba(78, 205, 196, 0.25) 0%, rgba(78, 205, 196, 0) 60%), #0f1024';
        setTimeout(() => {
          document.body.style.background = 'radial-gradient(1200px 600px at 50% -220px, rgba(78, 205, 196, 0.15) 0%, rgba(78, 205, 196, 0) 60%), #0f1024';
        }, 1000);
      }, 200);
      
      // Clear draft after successful submission
      localStorage.removeItem('hi-gym-draft');
      
      // Navigate to Hi Island to see the result
      setTimeout(() => window.location.href='hi-island-NEW.html', 2500);
      
    } catch (error) {
      console.error('Hi Gym submission error:', error);
      toast('Something went wrong. Please try again.', 'warning');
      
      // Re-enable button
      confirmShare.disabled = false;
      confirmShare.textContent = 'Share Journey';
    }
  });

  // Renderers
  function currentList(){
    const cat = (CATALOG.categories||[]).find(c=>c.id===state.cat) || (CATALOG.categories||[])[0] || {items:[]};
    let list = cat.items || [];
    
    // SMART FILTERING: If step 2 and current emotion is from Hi Opportunity, don't show Hi Opportunity emotions
    if (state.step === 2 && state.current) {
      const currentCat = findEmotionCategory(state.current.name);
      if (currentCat === 'opportunity' && state.cat === 'opportunity') {
        // Force switch to Hi Energy tab
        setTimeout(() => {
          const hiTab = document.querySelector('.tab[data-cat="hi"]');
          if (hiTab && !hiTab.getAttribute('aria-selected')) {
            hiTab.click();
          }
        }, 100);
        return []; // Return empty list for opportunity emotions
      }
    }
    
    if (state.q){
      const q = state.q.toLowerCase();
      list = list.filter(x => x.name?.toLowerCase().includes(q) || (x.desc||'').toLowerCase().includes(q));
    }
    
    return list;
  }

  /* 🌟 HI ENERGY EMOTIONAL BUTTON RENDERING: Enhanced UX with Smart Interactions */
  function renderGrid(){
    const list = currentList();
    grid.innerHTML = '';
    
    if (!list.length){
      // Tesla-grade empty state design
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.style.cssText = `
        text-align: center;
        padding: 40px 20px;
        background: rgba(255,255,255,0.05);
        border: 2px dashed rgba(255,255,255,0.2);
        border-radius: 20px;
        margin: 20px 0;
        color: #cfd2ea;
      `;
      empty.innerHTML = `
        <div style="font-size: 2rem; margin-bottom: 12px;">🔍</div>
        <div style="font-weight: 600; margin-bottom: 4px;">No emotions found</div>
        <div style="font-size: 0.9rem; opacity: 0.8;">Try another category or search term</div>
      `;
      grid.appendChild(empty);
      validate(); 
      return;
    }

    // Tesla-grade staggered animation entrance
    list.forEach((item, index) => {
      const div = document.createElement('button');
      div.type = 'button';
      div.className = 'chip';
      div.title = item.desc || item.name;
      
      // Enhanced category data attribute for styling
      const category = findEmotionCategory(item.name);
      div.setAttribute('data-category', category);
      
      // Tesla-grade enhanced button structure
      div.innerHTML = `
        <span class="emo" role="img" aria-label="${item.name} emoji">${item.emoji||'✨'}</span>
        <div style="display:flex;flex-direction:column;align-items:flex-start;min-width:0;flex:1;">
          <span class="name">${item.name}</span>
          <span class="desc">${item.desc||''}</span>
        </div>
      `;
      
      // Enhanced selection state detection
      const isSelected = (state.step === 1 && state.current?.name === item.name) ||
                         (state.step === 2 && state.desired?.name === item.name);
      
      if (isSelected) {
        div.classList.add('selected');
        div.setAttribute('aria-selected', 'true');
        console.log(`🎯 [Tesla-UI] Selected: ${item.name} (Step ${state.step})`);
      } else {
        div.setAttribute('aria-selected', 'false');
      }

      // Tesla-grade staggered entrance animation
      div.style.opacity = '0';
      div.style.transform = 'translateY(20px)';
      setTimeout(() => {
        div.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
        div.style.opacity = '1';
        div.style.transform = 'translateY(0)';
      }, index * 50); // Stagger by 50ms per item

      // Enhanced click handler with haptic feedback
      div.addEventListener('click', async () => {
        // Tesla-grade haptic feedback
        if (window.PremiumUX?.triggerHapticFeedback) {
          window.PremiumUX.triggerHapticFeedback('selection');
        }
        
        // Loading state
        div.classList.add('loading');
        
        let targetEmotion = item;
        let shouldProceed = true;
        
        if (state.step === 1) {
          // Step 1: Select current emotion
          state.current = targetEmotion;
          state.desired = null; // Clear any previous desired selection
          console.log(`🌟 Current emotion selected: ${targetEmotion.name}`);
          
          setTimeout(() => {
            div.classList.remove('loading');
            setStep(2);
            renderGrid(); // Re-render with new selection
          }, 200);
          
        } else if (state.step === 2) {
          // Step 2: Select desired emotion with smart validation
          if (window.HiGym?.validateEmotionalSelection) {
            const validation = window.HiGym.validateEmotionalSelection(state.current, targetEmotion);
            if (!validation.valid) {
              div.classList.remove('loading');
              toast(validation.reason, 'warning');
              
              // Smart suggestion system
              if (validation.suggestion) {
                setTimeout(() => {
                  state.q = validation.suggestion[0];
                  search.value = state.q;
                  renderGrid();
                }, 1500);
              }
              shouldProceed = false;
            }
          }
          
          if (shouldProceed) {
            state.desired = targetEmotion;
            console.log(`🎯 Emotional journey: ${state.current.name} → ${targetEmotion.name}`);
            
            setTimeout(() => {
              div.classList.remove('loading');
              setStep(3);
              renderGrid(); // Re-render with new selection
            }, 200);
          }
          
        } else if (state.step === 3) {
          // Step 3: Allow changing current emotion (reset journey)
          state.current = targetEmotion;
          state.desired = null;
          console.log(`🔄 Journey reset with new current: ${targetEmotion.name}`);
          
          setTimeout(() => {
            div.classList.remove('loading');
            setStep(2);
            renderGrid();
          }, 200);
        }
        
        if (shouldProceed) {
          saveDraft(); // Save progress
        }
      });

      // Tesla-grade accessibility enhancements
      div.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          div.click();
        }
      });

      // Enhanced hover states for better UX feedback
      div.addEventListener('mouseenter', () => {
        if (window.PremiumUX?.triggerHapticFeedback) {
          window.PremiumUX.triggerHapticFeedback('light');
        }
      });

      grid.appendChild(div);
    });

    validate();
  }

  /* 🌟 TESLA-GRADE ENHANCED BADGES RENDERING */
  function renderBadges(){
    const badgesContainer = document.querySelector('.badges');
    
    if (state.current){
      badgeCur.style.display = '';
      badgeCur.innerHTML = `
        <span style="font-size:1.2rem;">${state.current.emoji}</span>
        <span>Current: <strong>${state.current.name}</strong></span>
      `;
      badgeCur.style.animation = 'badgeSlideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
    } else {
      badgeCur.style.display = 'none';
    }

    if (state.desired){
      badgeDes.style.display = '';
      badgeDes.innerHTML = `
        <span style="font-size:1.2rem;">${state.desired.emoji}</span>
        <span>Desired: <strong>${state.desired.name}</strong></span>
      `;
      badgeDes.style.animation = 'badgeSlideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
      badgeDes.style.animationDelay = '0.1s';
    } else {
      badgeDes.style.display = 'none';
    }
    
    // Tesla-grade journey arrow animation
    if (state.current && state.desired && badgesContainer) {
      badgesContainer.classList.add('show-arrow');
    } else if (badgesContainer) {
      badgesContainer.classList.remove('show-arrow');
    }
    
    // Add badge entrance animations
    const style = document.createElement('style');
    style.textContent = `
      @keyframes badgeSlideIn {
        0% { opacity: 0; transform: translateY(-10px) scale(0.95); }
        100% { opacity: 1; transform: translateY(0) scale(1); }
      }
    `;
    if (!document.head.querySelector('#badge-animations')) {
      style.id = 'badge-animations';
      document.head.appendChild(style);
    }
  }

  function setStep(n){
    state.step = Math.max(1, Math.min(3, n));
    
    // Update stepper dots and pipes
    s1.classList.toggle('active', state.step >= 1);
    s2.classList.toggle('active', state.step >= 2);
    s3.classList.toggle('active', state.step >= 3);
    p1.classList.toggle('filled', state.step >= 2);
    p2.classList.toggle('filled', state.step >= 3);

    // Show/hide guidance cards
    const guidanceCard = document.getElementById('guidanceCard');
    const stepGuidance = document.getElementById('stepGuidance');
    const step1Guide = document.getElementById('step1Guide');
    const step2Guide = document.getElementById('step2Guide');
    const step3Guide = document.getElementById('step3Guide');
    const desiredEmotionHint = document.getElementById('desiredEmotionHint');

    // Hide main guidance once user starts engaging
    if (state.step > 1 || state.current) {
      guidanceCard.style.display = 'none';
      stepGuidance.style.display = '';
    } else {
      guidanceCard.style.display = '';
      stepGuidance.style.display = 'none';
    }

    // Show step-specific guidance
    step1Guide.style.display = (state.step === 1) ? '' : 'none';
    step2Guide.style.display = (state.step === 2) ? '' : 'none';
    step3Guide.style.display = (state.step === 3) ? '' : 'none';

    // Smart filtering: no double-low selections
    if (state.step === 2 && state.current) {
      const currentCat = findEmotionCategory(state.current.name);
      if (currentCat === 'opportunity') {
        // Switch to Hi Energy tab if coming from opportunity emotion
        document.querySelector('.tab[data-cat="hi"]').click();
      }
    }

    // Update desired emotion hint in step 3
    if (state.step === 3 && state.desired && desiredEmotionHint) {
      desiredEmotionHint.textContent = state.desired.name.toLowerCase();
    }

    renderBadges();
    renderGrid();
    
    // Show/hide journal card
    journalCard.style.display = (state.step === 3) ? '' : 'none';
    if (state.step === 3 && state.desired) {
      desiredLabel.textContent = state.desired.name;
    }

    validate();
    saveDraft();
  }

  function findEmotionCategory(emotionName) {
    for (const cat of CATALOG.categories) {
      if (cat.items.some(item => item.name === emotionName)) {
        return cat.id;
      }
    }
    return 'hi'; // default
  }

  function validate(){
    const step = state.step;
    let canContinue = false;

    if (step === 1) {
      canContinue = !!state.current;
      nextBtn.textContent = 'Continue to Step 2';
    } else if (step === 2) {
      canContinue = !!state.current && !!state.desired;
      nextBtn.textContent = 'Continue to Reflection';
    } else if (step === 3) {
      const journalText = journal.value.trim();
      canContinue = !!state.current && !!state.desired && journalText.length >= 10;
      nextBtn.textContent = 'Share Your Journey';
    }

    nextBtn.disabled = !canContinue;
    nextBtn.style.opacity = canContinue ? '1' : '0.6';
    nextBtn.style.cursor = canContinue ? 'pointer' : 'not-allowed';
    
    backBtn.textContent = (step === 1) ? 'Exit' : 'Back';
  }

  function saveDraft(){
    try {
      localStorage.setItem('hi-gym-draft', JSON.stringify({
        step: state.step,
        current: state.current,
        desired: state.desired,
        journal: journal.value,
        timestamp: Date.now()
      }));
    } catch {}
  }

  function loadDraft(){
    try {
      const saved = localStorage.getItem('hi-gym-draft');
      if (!saved) return;
      
      const draft = JSON.parse(saved);
      const age = Date.now() - (draft.timestamp || 0);
      
      // Clear old drafts (24 hours)
      if (age > 24 * 60 * 60 * 1000) {
        localStorage.removeItem('hi-gym-draft');
        return;
      }

      state.current = draft.current;
      state.desired = draft.desired;
      journal.value = draft.journal || '';
      setStep(draft.step || 1);
      updateCharCount();
      
      // 🌟 Show discrete "Start Fresh" option when draft loaded
      console.log('💾 Draft restored. Press Ctrl+Shift+R to start fresh.');
    } catch {}
  }

  function startFresh(){
    localStorage.removeItem('hi-gym-draft');
    state.current = null;
    state.desired = null;
    state.step = 1;
    journal.value = '';
    setStep(1);
    updateCharCount();
    toast('✨ Started fresh! Ready for your new emotional journey.', 'default');
  }

  // 🌟 TESLA-GRADE: Add keyboard shortcut for hard reset
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'R') {
      e.preventDefault();
      startFresh();
    }
  });

  function updateCharCount(){
    const len = journal.value.length;
    count.textContent = `${len}/600`;
    count.style.color = len > 580 ? '#ef4444' : '';
  }

  function toast(msg, type = 'default'){
    console.log('Toast:', msg);
    toastEl.textContent = msg;
    
    // Style based on type
    if (type === 'celebration') {
      toastEl.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
      toastEl.style.boxShadow = '0 10px 30px rgba(16, 185, 129, 0.4)';
    } else if (type === 'warning') {
      toastEl.style.background = 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
      toastEl.style.boxShadow = '0 10px 30px rgba(245, 158, 11, 0.4)';
    } else {
      toastEl.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
      toastEl.style.boxShadow = '0 10px 30px rgba(16, 185, 129, 0.4)';
    }
    
    toastEl.classList.remove('hide');
    toastEl.classList.add('show');
    
    setTimeout(() => {
      toastEl.classList.remove('show');
      toastEl.classList.add('hide');
    }, type === 'celebration' ? 3000 : 2000);
  }

  // Journal character counting
  journal.addEventListener('input', () => {
    updateCharCount();
    validate();
    saveDraft();
  });

  // Enhanced profile-first location management with traveling support
  async function loadUserLocation() {
    try {
      // Safety check: ensure HiDB is available
      if (!window.hiDB || typeof window.hiDB.getUserProfile !== 'function') {
        console.warn('💾 HiDB not ready, skipping user location load');
        return;
      }
      
      const userProfile = await window.hiDB.getUserProfile();
      const locationEducation = document.getElementById('locationEducation');
      const travelingContainer = document.getElementById('travelingContainer');
      const travelingToggle = document.getElementById('travelingToggle');
      
      if (userProfile?.location) {
        // User has set location - show traveling option and auto-populate
        locationInput.value = userProfile.location;
        travelingContainer.style.display = '';
        locationEducation.innerHTML = `<strong>Great!</strong> Using your saved location: <strong>${userProfile.location}</strong>. This helps build your local Hi community.`;
        
        // Handle traveling toggle
        travelingToggle.addEventListener('change', function() {
          if (this.checked) {
            // Store original location and clear input for manual entry
            this.dataset.homeLocation = userProfile.location;
            locationInput.value = '';
            locationInput.placeholder = 'Where are you traveling? (e.g., Paris, France)';
            locationEducation.innerHTML = `✈️ <strong>Traveling mode:</strong> Will post from your travel location but keep <strong>${userProfile.location}</strong> as your home base.`;
          } else {
            // Restore home location
            locationInput.value = userProfile.location;
            locationInput.placeholder = 'e.g., Austin, TX or London, UK';
            locationEducation.innerHTML = `<strong>Great!</strong> Using your saved location: <strong>${userProfile.location}</strong>. This helps build your local Hi community.`;
          }
        });
      } else {
        // New user - hide traveling option, emphasize community benefits
        travelingContainer.style.display = 'none';
        locationEducation.innerHTML = `<strong>Optional but powerful:</strong> Adding your city/state helps you connect with others nearby and see how your community feels. Posts without location appear as "Global Community" shares.`;
      }
      
    } catch (error) {
      console.log('Could not load user location:', error);
      const locationEducation = document.getElementById('locationEducation');
      const travelingContainer = document.getElementById('travelingContainer');
      if (locationEducation) {
        locationEducation.innerHTML = `<strong>Connect locally:</strong> Add your city and state to find others nearby. Leave blank to share with the global community.`;
      }
      if (travelingContainer) {
        travelingContainer.style.display = 'none';
      }
    }
  }

  // Initialize Hi-Muscle emotional journey
  state.startTime = Date.now(); // Track session duration
  loadDraft();
  loadUserLocation();
  setStep(state.step || 1);
  validate();

  // Tesla-grade smart suggestions on load
  window.addEventListener('load', () => {
    if (state.current && !state.desired && window.HiGym) {
      const suggestions = window.HiGym.suggestOptimalEmotions(state.current);
      if (suggestions.length > 0) {
        // Subtle suggestion in search placeholder
        search.placeholder = `Try: ${suggestions.slice(0, 2).join(', ')}...`;
      }
    }
  });

  // 🎯 WOZNIAK-GRADE: Initialize HiShareSheet v2.1.0-auth (No Anonymous Sharing)
  // Load and initialize HiShareSheet with access to local variables
  import('./ui/HiShareSheet/HiShareSheet.js?v=2.1.0-auth').then(({ HiShareSheet }) => {
    // 🏆 GOLD STANDARD: Load clean tracker + Hi OS Enhancement
    import('./lib/stats/GoldStandardTracker.js').then(async ({ trackShareSubmission }) => {
      try {
        // Idempotent tracker binding (avoid overwriting enhanced version)
        if (!window.trackShareSubmission || !window.trackShareSubmission.__HI_ENHANCED__){
          if (!window.__TRACK_SHARE_INIT__){
            window.trackShareSubmission = trackShareSubmission;
            window.__TRACK_SHARE_INIT__ = 'gold';
            console.log('✅ Gold Standard tracker bound (Hi-Muscle)');
          } else {
            console.log('ℹ️ Tracker already initialized via', window.__TRACK_SHARE_INIT__);
          }
        } else {
          console.log('ℹ️ Enhanced trackShareSubmission present, skipping raw bind');
        }
        
        // 🚀 HI OS ENHANCEMENT: Load enhancement layer
        try {
          if (!window.trackShareSubmission?.__HI_ENHANCED__){
            await import('./lib/stats/HiOSEnhancementLayer.js');
            console.log('🚀 Hi OS Enhancement Layer applied (Hi-Muscle)');
          } else {
            console.log('ℹ️ Hi OS Enhancement already active');
          }
        } catch (error) {
          console.warn('⚠️ Hi OS enhancement optional - continuing without:', error);
        }
      } catch (error) {
        console.warn('⚠️ Failed to load tracker:', error);
      }
      
      const shareSheet = new HiShareSheet({ 
        origin: 'higym',
        onSuccess: (shareData) => {
          console.log('✅ HiGYM share successful!', shareData);
          
          // 🎯 GOLD STANDARD: Direct tracker call
          if (window.trackShareSubmission) {
            console.log('🎯 Using Gold Standard tracker...');
            window.trackShareSubmission('higym', {
              submissionType: shareData.visibility || 'public',
              pageOrigin: 'hi-muscle', 
              origin: 'higym',
              timestamp: Date.now()
            });
          } else {
            console.log('⚠️ Gold Standard tracker not available');
          }
          
          // Reset Hi-Muscle form after successful submission - NOW WITH PROPER SCOPE ACCESS
          console.log('🔄 Resetting Hi-Muscle form for new journey...');
          state.current = null;
          state.desired = null;
          state.step = 1;
          journal.value = '';
          localStorage.removeItem('hi-gym-draft');
          setStep(1);
          updateCharCount();
          
          // Clear any selected emotion visual states
          document.querySelectorAll('.emotion.selected').forEach(el => el.classList.remove('selected'));
          
          // Show success message
          toast('✨ Journey shared successfully! Ready for your next emotional journey.', 'success');
          
          console.log('✅ Hi-Muscle form completely reset - ready for new journey');
        }
      });
      shareSheet.init();
      
      // 🔧 WOZNIAK-GRADE: Override window.openHiShareSheet with auth check + tracking
      // MATCH EXACT PATTERN: Use same signature as original HiShareSheet.init()
      window.openHiShareSheet = (origin = 'higym', options = {}) => {
        console.log('💪 [HiGYM] Opening share sheet with tracking-enabled instance:', { origin, options });
        
        // 🔒 WOZNIAK-GRADE: Auth check for anonymous users BEFORE opening share sheet
        const canShare = window.hiAccessManager?.canAccess?.('shareCreation') || 
                        window.HiTierSystem?.hasCapability?.('drop_hi') ||
                        window.unifiedMembership?.hasAccess?.('shareCreation') ||
                        window.supabase?.auth?.getUser?.()?.data?.user; // Additional auth check
        
        if (!canShare) {
          console.log('🔒 Anonymous user trying to share journey - showing Hi Muscle auth modal');
          
          // Store journey data for post-auth continuation
          localStorage.setItem('pendingHiMuscleJourney', JSON.stringify({
            origin,
            options,
            timestamp: Date.now(),
            action: 'share-journey'
          }));
          
          // 🌟 Show beautiful Hi Muscle auth modal with fitness benefits
          if (window.showShareAuthModal) {
            window.showShareAuthModal('hi-muscle', {
              title: 'Join Hi Fitness Community',
              benefits: [
                '💪 Track your emotional fitness journey over time',
                '🎯 Share breakthrough moments with the community', 
                '🏆 Unlock wellness achievements and streaks',
                '🌟 Connect with others on similar journeys'
              ],
              onPrimary: () => {
                window.location.href = '/signin.html?redirect=' + encodeURIComponent(window.location.pathname) + '&action=journey';
              },
              onSecondary: () => {
                window.location.href = '/signup.html?redirect=' + encodeURIComponent(window.location.pathname) + '&action=journey';
              }
            });
          } else if (window.showAuthModal) {
            // Fallback to general auth modal
            window.showAuthModal('hi-muscle');
          } else {
            // Last resort
            console.warn('⚠️ No auth modals available, redirecting to auth');
            window.location.href = '/signin.html?action=journey';
          }
          return; // Stop here for anonymous users
        }
        
        // ✅ Authenticated user - proceed with share sheet
        shareSheet.origin = origin;
        shareSheet.prefilledData = options; // Store prefilled data for Hi Muscle integration
        shareSheet.open(); // Call without parameters - data comes from this.prefilledData
      };
      
      console.log('✅ Hi-Muscle HiShareSheet initialized with Total His tracking');

      // 🌟 WOZNIAK-GRADE: Handle post-auth journey continuation
      const pendingJourney = localStorage.getItem('pendingHiMuscleJourney');
      if (pendingJourney) {
        try {
          const journeyData = JSON.parse(pendingJourney);
          console.log('🔄 Processing pending Hi Muscle journey after auth:', journeyData);
          
          // Clear the pending journey
          localStorage.removeItem('pendingHiMuscleJourney');
          
          // Auto-continue the journey sharing after successful auth
          if (journeyData.action === 'share-journey') {
            setTimeout(() => {
              console.log('✅ Auto-continuing Hi Muscle journey share after auth');
              window.openHiShareSheet(journeyData.origin, journeyData.options);
            }, 1000); // Small delay to ensure everything is loaded
          }
        } catch (error) {
          console.error('❌ Failed to process pending Hi Muscle journey:', error);
          localStorage.removeItem('pendingHiMuscleJourney'); // Clean up on error
        }
      }
    });
  });

})();
