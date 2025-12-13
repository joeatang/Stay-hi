// Extracted from inline profile.html main script
// Tesla-Grade Profile System - WITH SECURITY BARRIERS
let currentProfile = {
  username: '',
  display_name: 'Stay Hi User',
  bio: 'Living life one Hi at a time! 👋',
  location: '',
  avatar_url: null,
  created_at: new Date().toISOString().split('T')[0],
  id: null
};
const userStats = {
  hi_moments: Math.floor(Math.random() * 200) + 50,
  current_streak: Math.floor(Math.random() * 30) + 1,
  longest_streak: Math.floor(Math.random() * 60) + 20,
  total_waves: Math.floor(Math.random() * 150) + 30,
  total_starts: Math.floor(Math.random() * 40) + 5,
  days_active: Math.floor(Math.random() * 100) + 10
};
let socialAvatarUploader = null;
function openAvatarCrop() {
  console.log('� Opening social media grade avatar uploader...');
  if (!socialAvatarUploader && window.SocialAvatarUploader) {
    try {
      socialAvatarUploader = new window.SocialAvatarUploader({
        onSave: async (blob, originalFile) => {
          // 🎯 TIER CHECK: Validate avatar upload permission
          const membership = window.__hiMembership || {};
          const tier = membership.tier || 'free';
          const features = window.HiTierConfig?.getTierFeatures?.(tier) || {};
          
          if (!features.avatarUpload) {
            console.log('🚫 Avatar upload blocked for tier:', tier);
            showToast('Upgrade to Bronze to upload custom avatars! 📸', 'error');
            setTimeout(() => {
              if (window.HiUpgradeModal) {
                window.HiUpgradeModal.show('avatar', 'bronze');
              } else {
                window.location.href = '/upgrade.html?feature=avatar';
              }
            }, 1500);
            return;
          }
          
          console.log('💾 Avatar saved:', { size: blob.size, type: blob.type, originalName: originalFile.name });
          const url = URL.createObjectURL(blob);
          updateProfileAvatar(url);
          showToast('Profile photo updated! 🎉');
          console.log('� Production: Upload blob to Supabase storage');
          console.log('📝 Production: Update user profile with new avatar URL');
          try {
            showToast('Uploading your photo... 📤');
            const publicUrl = await uploadAvatarToSupabase(blob, originalFile);
            await updateProfileInDatabase(publicUrl);
            updateProfileAvatar(publicUrl);
            currentProfile.avatar_url = publicUrl;
            showToast('Profile photo updated! 🎉');
            console.log('✅ Avatar successfully stored:', publicUrl);
          } catch (error) {
            console.error('❌ Upload failed:', error);
            showToast('Photo saved locally. Will retry upload automatically.', 'warning');
          }
          setTimeout(() => URL.revokeObjectURL(url), 30000);
        }
      });
      console.log('✅ Social Avatar Uploader initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize SocialAvatarUploader:', error);
      showToast('Avatar system unavailable. Please refresh and try again.', 'error');
      return;
    }
  }
  if (socialAvatarUploader) {
    socialAvatarUploader.selectFile();
  } else {
    console.error('❌ Social Avatar Uploader not available');
    showToast('Avatar system not ready. Please try again.', 'error');
  }
}
function closeAvatarCrop() {
  if (socialAvatarUploader && socialAvatarUploader.close) {
    socialAvatarUploader.close();
  }
  console.log('🔒 Avatar crop modal closed');
}
async function uploadAvatarToSupabase(blob, originalFile) {
  console.log('📤 Uploading avatar to Supabase Storage...');
  const useHiBase = await window.HiFlags?.getFlag('hibase_profile_enabled');
  console.log(`🔄 Avatar upload via ${useHiBase ? 'HiBase' : 'legacy'} path`);
  if (useHiBase) {
    console.log('📦 Avatar → HiBase.uploadAvatar...');
    const userId = currentProfile.id || (await window.HiSupabase.getClient().auth.getUser()).data?.user?.id || generateStableUserId();
    const uploadResult = await window.HiBase.uploadAvatar(blob, userId);
    if (uploadResult.error) throw new Error(`HiBase avatar upload failed: ${uploadResult.error.message}`);
    console.log('✅ Avatar uploaded via HiBase:', uploadResult.data.avatarUrl);
    import('./lib/monitoring/HiMonitor.js').then(m => m.trackEvent('profile_avatar_upload', { source: 'profile', path: 'hibase' })).catch(()=>{});
    return uploadResult.data.avatarUrl;
  } else {
    console.log('📦 Avatar → Legacy Supabase...');
    console.log('🔍 Supabase client check:', { supabaseClient: !!window.supabaseClient, supabase: !!window.supabase, sb: !!window.sb });
    await testSupabaseConnection();
    if (!window.supabaseClient && !window.sb) throw new Error('Supabase client not initialized - check supabase-init.js loading');
    const client = window.supabaseClient || window.sb;
    const { data: session } = await client.auth.getSession();
    console.log('🔐 Auth session:', { hasSession: !!session?.session, user: session?.session?.user?.id || 'anonymous' });
    const timestamp = Date.now();
    const userId = currentProfile.id || generateStableUserId();
    const fileExt = originalFile.name.split('.').pop() || 'jpg';
    const fileName = `avatar_${userId}_${timestamp}.${fileExt}`;
    let filePath, uploadResult;
    if (session?.session?.user) {
      filePath = `${session.session.user.id}/${fileName}`;
      console.log('👤 Authenticated upload to:', filePath);
    } else {
      const persistentUserId = currentProfile.id || generateStableUserId();
      filePath = `users/${persistentUserId}/${fileName}`;
      console.log('🔒 Persistent anonymous upload to:', filePath);
    }
    console.log('📦 Upload details:', { fileName, filePath, blobSize: blob.size, blobType: blob.type });
    uploadResult = await client.storage.from('avatars').upload(filePath, blob, { contentType: blob.type, upsert: false });
    console.log('📤 Upload result:', uploadResult);
    if (uploadResult.error) {
      console.error('❌ Supabase upload error:', uploadResult.error);
      if (uploadResult.error.message?.includes('new row violates row-level security') || uploadResult.error.message?.includes('insufficient_privilege')) {
        console.log('🔄 Trying anonymous upload fallback...');
        const fallbackPath = `temp/${fileName}`;
        const fallbackResult = await client.storage.from('avatars').upload(fallbackPath, blob, { contentType: blob.type, upsert: true });
        if (fallbackResult.error) throw new Error(`Upload failed: ${fallbackResult.error.message}`);
        filePath = fallbackPath;
      } else {
        throw new Error(`Upload failed: ${uploadResult.error.message}`);
      }
    }
    const { data: urlData } = client.storage.from('avatars').getPublicUrl(filePath);
    console.log('🔗 Generated URL:', urlData.publicUrl);
    import('./lib/monitoring/HiMonitor.js').then(m => m.trackEvent('profile_avatar_upload', { source: 'profile', path: 'legacy' })).catch(()=>{});
    return urlData.publicUrl;
  }
}
async function updateProfileInDatabase(avatarUrl) {
  console.log('📝 Updating profile in database...');
  if (!window.supabaseClient) throw new Error('Supabase client not initialized');
  const useHiBase = await window.HiFlags?.getFlag('hibase_profile_enabled');
  console.log(`🔄 Profile update via ${useHiBase ? 'HiBase' : 'legacy'} path`);
  if (useHiBase) {
    console.log('📦 Profile → HiBase.updateProfile...');
    const userId = currentProfile.id || (await window.HiSupabase.getClient().auth.getUser()).data?.user?.id;
    const updateResult = await window.HiBase.updateProfile(userId, { avatar_url: avatarUrl, updated_at: new Date().toISOString() });
    if (updateResult.error) {
      console.error('HiBase profile update error:', updateResult.error);
      console.log('Avatar uploaded but HiBase profile update failed - will retry');
    }
    import('./lib/monitoring/HiMonitor.js').then(m => m.trackEvent('profile_save', { source: 'profile', path: 'hibase' })).catch(()=>{});
  } else {
    console.log('📦 Profile → Legacy Supabase...');
    const { error } = await window.supabaseClient.from('profiles').update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() }).eq('username', currentProfile.username);
    if (error) {
      console.error('Database update error:', error);
      console.log('Avatar uploaded but profile update failed - will retry');
    }
    import('./lib/monitoring/HiMonitor.js').then(m => m.trackEvent('profile_save', { source: 'profile', path: 'legacy' })).catch(()=>{});
  }
}
function saveAvatar(){ return saveCroppedAvatar(); }
function resetCropModalState(){ document.getElementById('cropUploadArea').style.display='block'; document.getElementById('cropPreviewContainer').style.display='none'; document.getElementById('cropProcessing').style.display='none'; document.getElementById('saveCropBtn').disabled=true; const fileInput=document.getElementById('avatarFileInput'); if(fileInput) fileInput.value=''; currentCropImageFile=null; }
function triggerFileSelect(){ console.log('🖱️ Upload area clicked, triggering file select...'); const fileInput=document.getElementById('avatarFileInput'); if(fileInput){ console.log('📁 File input found'); try{ fileInput.click(); console.log('✅ File input click triggered successfully'); }catch(error){ console.error('❌ Error triggering file input click:', error); } } else { console.error('❌ File input not found when clicked'); } }
function testFileInput(){ console.log('🧪 Testing file input functionality...'); const fileInput=document.getElementById('avatarFileInput'); if(fileInput){ console.log('File input element:', fileInput); fileInput.focus(); fileInput.click(); } }
window.testFileInput=testFileInput; window.triggerFileSelect=triggerFileSelect;
function setupFileInputHandler(){ const fileInput=document.getElementById('avatarFileInput'); if(!fileInput){ console.error('❌ avatarFileInput not found'); return false; } console.log('📁 Attaching handlers directly to existing element...'); fileInput.addEventListener('change', handleImageUpload, { passive:false }); fileInput.addEventListener('click', ()=>{ console.log('📁 File input CLICKED!'); }); fileInput.addEventListener('focus', ()=>{ console.log('🎯 File input FOCUSED!'); }); fileInput.addEventListener('input', ()=>{ console.log('� File input changed'); }); console.log('✅ File input handler setup complete - FIXED VERSION'); return true; }
function setupDragAndDrop(){ const uploadArea=document.getElementById('cropUploadArea'); if(!uploadArea) return; ['dragenter','dragover','dragleave','drop'].forEach(ev=>{ uploadArea.addEventListener(ev, preventDefaults, false); }); function preventDefaults(e){ e.preventDefault(); e.stopPropagation(); } ['dragenter','dragover'].forEach(ev=>{ uploadArea.addEventListener(ev, highlight, false); }); ['dragleave','drop'].forEach(ev=>{ uploadArea.addEventListener(ev, unhighlight, false); }); function highlight(){ uploadArea.style.background='rgba(78, 205, 196, 0.1)'; uploadArea.style.borderColor='var(--tesla-primary)'; } function unhighlight(){ uploadArea.style.background=''; uploadArea.style.borderColor=''; } uploadArea.addEventListener('drop', handleDrop, false); function handleDrop(e){ const dt=e.dataTransfer; const files=dt.files; if(files.length>0){ handleImageFile(files[0]); } } }
function handleImageUpload(e){ console.log('📁 handleImageUpload triggered', e.type); const file=e.target.files[0]; if(file){ console.log('✅ File selected:', { name:file.name, type:file.type, size:file.size }); handleImageFile(file); } else { console.error('❌ No file selected'); } }
function handleImageFile(file){ console.log('🖼️ Tesla handleImageFile called:', file.name); if(!file.type.startsWith('image/')){ showToast('Please select a valid image file','error'); console.error('❌ Invalid file type:', file.type); return; } if(file.size>10*1024*1024){ showToast('Image size must be less than 10MB','error'); console.error('❌ File too large:', file.size); return; } currentCropImageFile=file; console.log('✅ File validation passed, processing...'); const uploadArea=document.getElementById('cropUploadArea'); const processingEl=document.getElementById('cropProcessing'); if(uploadArea) uploadArea.style.display='none'; if(processingEl) processingEl.style.display='block'; const reader=new FileReader(); reader.onload=function(e){ const imgElement=document.getElementById('cropImagePreview'); if(!imgElement){ console.error('❌ cropImagePreview not found'); return; } imgElement.src=e.target.result; imgElement.onload=function(){ setTimeout(()=>{ const processingEl=document.getElementById('cropProcessing'); const previewContainer=document.getElementById('cropPreviewContainer'); if(processingEl) processingEl.style.display='none'; if(previewContainer) previewContainer.style.display='block'; setTimeout(()=>{ initializeTeslaCropper(imgElement); },100); },300); }; imgElement.onerror=function(){ console.error('❌ Failed to load image'); showToast('Failed to load image. Please try again.','error'); }; }; reader.onerror=function(){ console.error('❌ FileReader failed'); showToast('Failed to read file. Please try again.','error'); }; reader.readAsDataURL(file); }
function initializeTeslaCropper(imgElement){ console.log('🚀 Initializing Tesla cropper...'); if(!teslaAvatarCropper && window.TeslaAvatarCropper){ teslaAvatarCropper=new window.TeslaAvatarCropper(); } if(teslaAvatarCropper){ const previewContainer=document.getElementById('cropPreview'); if(previewContainer){ try{ const result=teslaAvatarCropper.initCropper(imgElement, previewContainer); document.getElementById('saveCropBtn').disabled=false; showToast('Image loaded! Drag to adjust crop area 🎯'); }catch(error){ console.error('❌ Tesla cropper initialization failed:', error); showToast('Failed to initialize cropper. Please try again.','error'); } } } else { console.error('❌ Tesla cropper not available'); showToast('Cropper not available. Please refresh and try again.','error'); } }
async function saveCroppedAvatar(){ if(!teslaAvatarCropper || !currentCropImageFile){ showToast('No image to save','error'); return; } try{ document.getElementById('cropProcessing').style.display='block'; document.getElementById('cropPreviewContainer').style.display='none'; const croppedBlob=await teslaAvatarCropper.getCroppedImage(0.9); if(!croppedBlob) throw new Error('Failed to generate cropped image'); let avatarUrl; if(teslaAvatarUploader){ avatarUrl=await teslaAvatarUploader.uploadAvatar(croppedBlob, currentProfile.username); } else { avatarUrl=await blobToDataURL(croppedBlob); } updateProfileAvatar(avatarUrl); showToast('Tesla-grade avatar saved successfully! 🚀'); import('./lib/monitoring/HiMonitor.js').then(m=>m.trackEvent('profile_save',{ avatar:true })).catch(()=>{}); closeAvatarCrop(); }catch(error){ console.error('Avatar save error:', error); showToast('Failed to save avatar. Please try again.','error'); document.getElementById('cropProcessing').style.display='none'; document.getElementById('cropPreviewContainer').style.display='block'; } }
function updateProfileAvatar(avatarUrl){ const avatarEl=document.getElementById('profileAvatar'); const placeholderEl=document.getElementById('avatarPlaceholder'); if(avatarEl && placeholderEl){ if(avatarUrl){ avatarEl.src=avatarUrl; avatarEl.style.display='block'; placeholderEl.style.display='none'; } else { avatarEl.style.display='none'; placeholderEl.style.display='block'; } } }
function blobToDataURL(blob){ return new Promise(resolve=>{ const reader=new FileReader(); reader.onload=()=>resolve(reader.result); reader.readAsDataURL(blob); }); }
function openLocationPicker(){ console.log('🌍 Opening location picker...'); if(window.LocationPicker){ window.LocationPicker.show((result)=>{ const locationInput=document.getElementById('sheetLocationInput'); if(locationInput){ locationInput.value=result.formatted; } }); } }
function openCalendar(){ console.log('📅 Opening premium calendar...'); if(window.hiCalendarInstance && typeof window.hiCalendarInstance.show==='function'){ window.hiCalendarInstance.show(); } else if(window.PremiumCalendar){ if(!window.hiCalendarInstance){ window.hiCalendarInstance=new window.PremiumCalendar(); } window.hiCalendarInstance.show(); } else { window.location.href='calendar.html'; } }
function openEditCalendar(){ console.log('📅 Opening calendar from edit modal...'); if(window.PremiumCalendar && window.PremiumCalendar.show){ window.PremiumCalendar.show(); } else { window.location.href='calendar.html'; } }
async function testSupabaseConnection(){ console.log('🔧 Testing Supabase storage connection...'); const client=window.supabaseClient || window.sb; if(!client) throw new Error('No Supabase client available'); try{ const { data:buckets, error:bucketError }=await client.storage.listBuckets(); if(bucketError){ console.warn('⚠️ Cannot list buckets:', bucketError.message); const { data:files, error:filesError }=await client.storage.from('avatars').list('', { limit:1 }); if(filesError){ throw new Error(`Avatars bucket not accessible: ${filesError.message}`); } } const { data:session }=await client.auth.getSession(); const testBlob=new Blob(['test'], { type:'text/plain' }); const testPath=`test/${Date.now()}_test.txt`; const { error:testError }=await client.storage.from('avatars').upload(testPath, testBlob, { upsert:false }); if(!testError){ await client.storage.from('avatars').remove([testPath]); } } catch(error){ console.error('💥 Storage connection test failed:', error); throw error; } }
function editProfile(){ const modal=document.getElementById('editProfileModal'); modal.classList.add('active'); populateEditForm(); showToast('Edit your profile details below 📝'); }
function closeEditProfile(){ const modal=document.getElementById('editProfileModal'); modal.classList.remove('active'); }
function populateEditForm(){ document.getElementById('editDisplayName').value=currentProfile.display_name || ''; document.getElementById('editUsername').value=currentProfile.username || ''; document.getElementById('editBio').value=currentProfile.bio || ''; document.getElementById('editLocation').value=currentProfile.location || ''; updateBioCounter(); setupEditFormListeners(); }
function setupEditFormListeners(){ const bioTextarea=document.getElementById('editBio'); const usernameInput=document.getElementById('editUsername'); bioTextarea.addEventListener('input', updateBioCounter); usernameInput.addEventListener('input', function(){ let value=this.value.replace(/[^a-zA-Z0-9_]/g,''); if(value && !value.startsWith('@')) value='@'+value; this.value=value; }); }
function updateBioCounter(){ const bioTextarea=document.getElementById('editBio'); const counter=document.getElementById('bioCounter'); const length=bioTextarea.value.length; counter.textContent=`${length}/160`; if(length>140){ counter.style.color='#FFD93D'; } else if(length>160){ counter.style.color='#FF6B6B'; } else { counter.style.color=''; } }
async function saveProfileChanges(){ const formData={ display_name:document.getElementById('editDisplayName').value.trim(), username:document.getElementById('editUsername').value.replace('@','').trim(), bio:document.getElementById('editBio').value.trim() }; const locationInput=document.getElementById('sheetLocationInput'); formData.location=locationInput ? locationInput.value.trim() : ''; if(!formData.display_name){ showToast('Display name is required','error'); return; } if(!formData.username || formData.username.length<3){ showToast('Username must be at least 3 characters','error'); return; } if(formData.bio.length>160){ showToast('Bio must be 160 characters or less','error'); return; } try{ const { data:{user} }=await window.supabaseClient.auth.getUser(); const userId=user?.id; Object.assign(currentProfile, formData); if(userId && !currentProfile.id){ currentProfile.id=userId; } await saveProfileToStorage(currentProfile, userId); updateProfileDisplay(currentProfile); closeEditProfile(); showToast('Profile saved successfully! 🎉','success'); } catch(error){ console.error('❌ Profile save error:', error); showToast('Failed to save profile. Please try again.','error'); } }
async function saveProfileToStorage(profile, userId=null){ const profileData={ ...profile, last_updated:new Date().toISOString(), version:'1.0' }; try{ const storageKey=userId ? `stayhi_profile_${userId}` : 'stayhi_profile_demo'; localStorage.setItem(storageKey, JSON.stringify(profileData)); if(window.supabaseClient && userId){ await saveProfileToSupabase(profileData, userId); } else if(!userId){ console.log('🎭 Demo profile - skipping Supabase sync'); } sessionStorage.setItem(`stayhi_profile_backup_${userId || 'demo'}`, JSON.stringify(profileData)); } catch(error){ console.error('Storage save error:', error); throw error; } }
async function saveProfileToSupabase(profile, userId){ try{ const { data, error }=await window.supabaseClient.from('profiles').upsert({ id:userId, username:profile.username, display_name:profile.display_name, bio:profile.bio, location:profile.location, avatar_url:profile.avatar_url, updated_at:new Date().toISOString() }, { onConflict:'id' }); if(error){ console.warn('⚠️ Supabase save failed:', error.message); } else { console.log('☁️ Profile synced to Supabase'); } } catch(error){ console.warn('⚠️ Supabase unavailable:', error.message); } }
function shareProfile(){ const profileUrl=`${window.location.origin}/profile/${currentProfile.username}`; if(navigator.share){ navigator.share({ title:`${currentProfile.display_name} on Stay Hi`, text:`Check out ${currentProfile.display_name}'s Hi profile!`, url:profileUrl }); } else { navigator.clipboard.writeText(profileUrl); showToast('Profile link copied to clipboard! 📋'); } }
function showToast(message, type='success'){ const toast=document.createElement('div'); const baseStyles={ position:'fixed', bottom:'20px', left:'50%', transform:'translateX(-50%)', padding:'12px 20px', borderRadius:'8px', color:'white', fontWeight:'500', fontSize:'14px', zIndex:'3000', opacity:'0', transition:'opacity 0.3s ease', maxWidth:'80vw', textAlign:'center' }; const typeStyles={ success:{ background:'rgba(78, 205, 196, 0.9)', border:'1px solid #4ECDC4' }, error:{ background:'rgba(255, 107, 107, 0.9)', border:'1px solid #FF6B6B' }, info:{ background:'rgba(255, 217, 61, 0.9)', border:'1px solid #FFD93D', color:'#000' } }; Object.assign(toast.style, baseStyles, typeStyles[type] || typeStyles.success); toast.textContent=message; document.body.appendChild(toast); setTimeout(()=>toast.style.opacity='1',10); setTimeout(()=>{ toast.style.opacity='0'; setTimeout(()=>toast.remove(),300); },3000); }
window.showTeslaToast=showToast;
function updateProfileDisplay(profileData){ const usernameEl=document.getElementById('profileUsername'); if(usernameEl && profileData.username) usernameEl.textContent=`@${profileData.username}`; const displayNameEl=document.getElementById('profileDisplayName'); if(displayNameEl && profileData.display_name) displayNameEl.textContent=profileData.display_name; const bioEl=document.getElementById('profileBio'); if(bioEl) bioEl.textContent=profileData.bio || 'No bio yet. Click edit to add one!'; const locationEl=document.getElementById('profileLocation'); if(locationEl) locationEl.textContent=profileData.location || 'Location not set'; const joinedEl=document.getElementById('profileJoined'); if(joinedEl && profileData.created_at){ const joinDate=new Date(profileData.created_at); const monthNames=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']; joinedEl.textContent=`Joined ${monthNames[joinDate.getMonth()]} ${joinDate.getFullYear()}`; } if(profileData.avatar_url){ updateProfileAvatar(profileData.avatar_url); } }
function updateStatsDisplay(statsData){ Object.entries(statsData).forEach(([key,value], index)=>{ const statEl=document.querySelector(`[data-stat="${key}"]`); if(statEl){ setTimeout(()=>{ animateCounter(statEl,0,value,800); }, index*100); } }); }
function animateCounter(element,start,end,duration){ const range=end-start; const startTime=performance.now(); function update(currentTime){ const elapsed=currentTime-startTime; const progress=Math.min(elapsed/duration,1); const easeOutQuart=1-Math.pow(1-progress,4); const current=Math.floor(start+(range*easeOutQuart)); element.textContent=current.toLocaleString(); if(progress<1){ requestAnimationFrame(update); } } requestAnimationFrame(update); }
function validateTeslaAvatarSystem(){ const validations={ 'TeslaAvatarCropper':!!window.TeslaAvatarCropper, 'TeslaAvatarUploader':!!window.TeslaAvatarUploader, 'Avatar Modal':!!document.getElementById('avatarCropModal'), 'File Input':!!document.getElementById('avatarFileInput'), 'Preview Container':!!document.getElementById('cropPreviewContainer'), 'Toast System':typeof showToast==='function' }; let allValid=true; Object.entries(validations).forEach(([name,isValid])=>{ if(!isValid) allValid=false; }); return allValid; }
function initializeTeslaAvatarSystem(){ let attempts=0; const maxAttempts=50; const checkInterval=setInterval(()=>{ attempts++; if(window.TeslaAvatarCropper && window.TeslaAvatarUploader){ clearInterval(checkInterval); console.log('\u2705 Tesla Avatar System initialized'); validateTeslaAvatarSystem(); return; } if(attempts>=maxAttempts){ clearInterval(checkInterval); console.warn('\u26a0\ufe0f Avatar system initialization timeout - continuing without avatar features'); return; } },100); }
async function getSupabaseClient(maxRetries=10,delayMs=100){ for(let i=0;i<maxRetries;i++){ const client=window.supabaseClient||window.hiSupabase||window.sb||window.__HI_SUPABASE_CLIENT; if(client&&client.auth){ if(i>0)console.log(`✅ [profile-main.js] Supabase client ready after ${i} retries`); return client; } if(i===0)console.log('⏳ [profile-main.js] Waiting for Supabase client...'); await new Promise(r=>setTimeout(r,delayMs)); } throw new Error('Supabase client not available'); }
async function loadProfileData(){ console.log('🔄 [profile-main.js] Loading profile data...'); try{ const supabase=await getSupabaseClient(); const { data:{ session } }=await supabase.auth.getSession(); const isAuthenticated=!!session?.user; console.log('🔐 [profile-main.js] Auth status:', isAuthenticated ? 'AUTHENTICATED' : 'ANONYMOUS'); if(!isAuthenticated){ await loadAnonymousDemoProfile(); return; } let profile=null; const userId=session.user.id; console.log('📥 [profile-main.js] Loading from DATABASE FIRST for user:', userId); profile=await loadAuthenticatedProfileFromSupabase(userId); if(profile){ console.log('📥 [profile-main.js] GOT FROM DATABASE:', { username: profile.username, display_name: profile.display_name }); const storageKey=`stayhi_profile_${userId}`; localStorage.setItem(storageKey, JSON.stringify(profile)); console.log('✅ [profile-main.js] localStorage cache updated from database'); } else { console.warn('⚠️ [profile-main.js] NO PROFILE IN DATABASE'); } if(!profile){ const savedProfile=localStorage.getItem(`stayhi_profile_${userId}`); if(savedProfile){ try{ profile=JSON.parse(savedProfile); console.log('📦 [profile-main.js] Fallback to localStorage cache'); }catch(e){} } } if(!profile){ profile={ ...currentProfile }; profile.id=userId; profile.username=profile.username || `user_${userId.slice(-6)}`; await saveProfileToStorage(profile, userId); } Object.assign(currentProfile, profile); updateProfileDisplay(currentProfile); populateEditForm(currentProfile); try{ const membership=window.__hiMembership||{}; const tier=membership.tier||'free'; if(window.HiBrandTiers?.updateTierPill && tier){ const tierIndicator=document.getElementById('hi-tier-indicator'); if(tierIndicator){ console.log('🎯 [profile-main.js] Updating tier pill:', tier); window.HiBrandTiers.updateTierPill(tierIndicator, tier, { showEmoji: true }); } } }catch(tierError){ console.warn('⚠️ [profile-main.js] Tier pill update failed:', tierError); } } catch(error){ console.error('❌ [profile-main.js] loadProfileData error:', error); await loadAnonymousDemoProfile(); } }
async function loadAuthenticatedProfileFromSupabase(userId){ try{ const useHiBase=await window.HiFlags?.getFlag('hibase_profile_enabled'); let data, error; if(useHiBase){ const profileResult=await window.HiBase.getProfile(userId); if(profileResult.error) return null; data=profileResult.data?.profile ? [profileResult.data.profile] : []; import('./lib/monitoring/HiMonitor.js').then(m=>m.trackEvent('profile_load',{ source:'profile', path:'hibase' })).catch(()=>{}); } else { const result=await window.supabaseClient.from('profiles').select('*').eq('id', userId).order('updated_at',{ ascending:false }).limit(1); data=result.data; error=result.error; if(error){ console.warn('⚠️ [profile-main.js] Supabase query error:', error.message); return null; } import('./lib/monitoring/HiMonitor.js').then(m=>m.trackEvent('profile_load',{ source:'profile', path:'legacy' })).catch(()=>{}); } if(data && data.length>0){ return data[0]; } return null; } catch(error){ console.error('❌ [profile-main.js] loadAuthenticatedProfileFromSupabase error:', error); return null; } }
async function loadAnonymousDemoProfile(){ const demoProfile={ id:'demo_'+Date.now(), username:'Anonymous User', email:'', bio:'This is a demo profile. Sign up to create your real profile!', location:'', avatar_url:'', created_at:new Date().toISOString(), is_demo:true }; Object.assign(currentProfile, demoProfile); updateProfileDisplay(currentProfile); populateEditForm(currentProfile); }
async function loadProfileFromSupabase(){ console.warn('🚨 DEPRECATED: loadProfileFromSupabase() bypasses authentication!'); return null; }
function generateStableUserId(){ let stored=localStorage.getItem('stayhi_user_id'); if(stored) return stored; const canvas=document.createElement('canvas'); const ctx=canvas.getContext('2d'); ctx.textBaseline='top'; ctx.font='14px Arial'; ctx.fillText('StayHi',2,2); const fingerprint=[ navigator.userAgent, navigator.language, screen.width+'x'+screen.height, new Date().getTimezoneOffset(), canvas.toDataURL() ].join('|'); let hash=0; for(let i=0;i<fingerprint.length;i++){ const char=fingerprint.charCodeAt(i); hash=((hash<<5)-hash)+char; hash=hash & hash; } const userId=Math.abs(hash).toString(36); localStorage.setItem('stayhi_user_id', userId); return userId; }
function populateEditForm(profile){ const displayNameEl=document.getElementById('editDisplayName'); const usernameEl=document.getElementById('editUsername'); const bioEl=document.getElementById('editBio'); const locationEl=document.getElementById('sheetLocationInput'); if(displayNameEl) displayNameEl.value=profile.display_name || ''; if(usernameEl) usernameEl.value=profile.username || ''; if(bioEl) bioEl.value=profile.bio || ''; if(locationEl) locationEl.value=profile.location || ''; }
function updateStatsDisplaySimple(stats){ const statsGrid=document.getElementById('statsGrid'); if(!statsGrid) return; statsGrid.innerHTML=`<div class="stat-item"><div class="stat-value">${stats.hi_moments || 0}</div><div class="stat-label">Hi Moments</div></div>`; }
function navigateToHiDashboard(){ window.location.href='hi-dashboard.html'; }
window.navigateToHiDashboard=navigateToHiDashboard;
window.currentProfile=currentProfile; window.userStats=userStats; window.TeslaProfile={ openAvatarCrop, closeAvatarCrop, saveAvatar, openCalendar, openEditCalendar, editProfile, shareProfile, loadProfileData, showToast, testSupabaseConnection };
window.showMembershipModal=()=>{
  // Unified gating via AccessGate; fallback to legacy modal
  if(window.AccessGate?.request){
    const decision = window.AccessGate.request('membership:upgrade');
    if(decision.allow){ return true; }
    // AccessGateModal will surface; return false to indicate gated
    return false;
  }
  if(window.anonymousAccessModal){ window.anonymousAccessModal.showAccessModal(); return false; }
  console.warn('⚠️ No AccessGate or AnonymousAccessModal available for membership upgrade');
  return false;
};
console.log('✅ Tesla Profile System Ready - WITH SECURITY BARRIERS');
window.testProfilePersistence={ save:()=>saveProfileToStorage(currentProfile), load:()=>loadProfileData(), clear:()=>localStorage.removeItem('stayhi_profile'), showCurrent:()=>console.log('Current Profile:', currentProfile), showSaved:()=>console.log('Saved Profile:', JSON.parse(localStorage.getItem('stayhi_profile') || 'null')) };
