// Admin Codes Module
// Tesla-grade: Code generation, loading, management
(function() {
  'use strict';

  // Get Supabase client
  function getSupabase() {
    return window.sb || window.supabaseClient;
  }

  // Generate invite code
  async function generateCode(type, options = {}) {
    try {
      console.log('[admin-codes] Generating code:', type, options);
      
      const sb = getSupabase();
      if (!sb) throw new Error('Supabase not initialized');
      if (!window.currentUser) throw new Error('User not authenticated');

      const { customCode = null, maxUses = 1, notes = '' } = options;

      // Call Supabase RPC function
      const { data: code, error } = await sb.rpc('create_invite_code', {
        p_creator_id: window.currentUser.id,
        p_code_type: type,
        p_custom_code: customCode,
        p_max_uses: maxUses
      });

      if (error) throw error;

      // Store metadata if provided
      if (notes) {
        await sb
          .from('invite_codes')
          .update({
            metadata: { notes, created_via: 'admin_panel' }
          })
          .eq('code', code);
      }

      console.log('[admin-codes] Code generated:', code);
      return { success: true, code };

    } catch (error) {
      console.error('[admin-codes] Generation failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Load all codes for current admin
  async function loadCodes() {
    try {
      const sb = getSupabase();
      if (!sb || !window.currentUser) return { success: false, codes: [] };

      const { data, error } = await sb
        .from('invite_codes')
        .select(`
          *,
          invite_code_usage (
            id,
            used_by,
            used_at
          )
        `)
        .eq('created_by', window.currentUser.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      console.log('[admin-codes] Loaded codes:', data?.length || 0);
      return { success: true, codes: data || [] };

    } catch (error) {
      console.error('[admin-codes] Load failed:', error);
      return { success: false, codes: [] };
    }
  }

  // Deactivate a code
  async function deactivateCode(codeId) {
    try {
      const sb = getSupabase();
      if (!sb) throw new Error('Supabase not initialized');

      const { error } = await sb
        .from('invite_codes')
        .update({ is_active: false })
        .eq('id', codeId);

      if (error) throw error;

      console.log('[admin-codes] Code deactivated:', codeId);
      return { success: true };

    } catch (error) {
      console.error('[admin-codes] Deactivation failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Calculate stats from codes
  function calculateStats(codes) {
    const now = new Date();
    
    const stats = {
      total: codes.length,
      active: 0,
      expired: 0,
      usedUp: 0,
      totalUses: 0
    };

    codes.forEach(code => {
      stats.totalUses += code.current_uses;
      
      const isExpired = code.expires_at && new Date(code.expires_at) < now;
      const isUsedUp = code.current_uses >= code.max_uses;
      const isActive = code.is_active && !isExpired && !isUsedUp;

      if (isActive) stats.active++;
      if (isExpired) stats.expired++;
      if (isUsedUp) stats.usedUp++;
    });

    return stats;
  }

  // Expose API
  window.AdminCodes = {
    generateCode,
    loadCodes,
    deactivateCode,
    calculateStats
  };

  console.log('[admin-codes] Module loaded');
})();
