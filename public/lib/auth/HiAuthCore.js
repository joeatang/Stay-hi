// HiAuthCore - Unified Auth wrapper around Supabase v3 client
// Provides a minimal, consistent API for pages and dev tools.
// Uses resilient client from HiSupabase.v3 and relies on AuthReady to broadcast hi:auth-ready once.
import { getHiSupabase } from '../HiSupabase.v3.js';
import '../AuthReady.js';

class HiAuthCore {
    constructor() {
        this.sb = getHiSupabase();
    }

    async getActiveIdentity() {
        try {
            const { data: { user }, error } = await this.sb.auth.getUser();
            if (error) return { data: { isAnon: true }, error: error.message || String(error) };
            if (!user) return { data: { isAnon: true }, error: null };
            return {
                data: {
                    isAnon: false,
                    userId: user.id,
                    email: user.email || ''
                },
                error: null
            };
        } catch (e) {
            return { data: { isAnon: true }, error: e.message || String(e) };
        }
    }

    async requireAuth() {
        const { data, error } = await this.getActiveIdentity();
        if (error) return { ok: false, error };
        return { ok: !data.isAnon, error: null };
    }

    async signIn(email, password = null, options = {}) {
        try {
            // If password provided, try password auth; else send magic link
            if (password) {
                const { data, error } = await this.sb.auth.signInWithPassword({ email, password });
                return { data, error: error ? (error.message || String(error)) : null };
            } else {
                const next = options.next || 'hi-dashboard.html';
                const redirectTo = (window.hiPostAuthPath?.getPostAuthURL
                    ? window.hiPostAuthPath.getPostAuthURL({ next })
                    : `${window.location.origin}/post-auth.html?next=${encodeURIComponent(next)}`);
                const { data, error } = await this.sb.auth.signInWithOtp({
                    email,
                    options: { emailRedirectTo: redirectTo }
                });
                return { data, error: error ? (error.message || String(error)) : null };
            }
        } catch (e) {
            return { data: null, error: e.message || String(e) };
        }
    }

    async signUp(email, password) {
        try {
            const { data, error } = await this.sb.auth.signUp({ email, password });
            return { data, error: error ? (error.message || String(error)) : null };
        } catch (e) {
            return { data: null, error: e.message || String(e) };
        }
    }

    async signOut() {
        try {
            const { error } = await this.sb.auth.signOut();
            return { data: { success: !error }, error: error ? (error.message || String(error)) : null };
        } catch (e) {
            return { data: null, error: e.message || String(e) };
        }
    }

    async refreshSession() {
        try {
            const { data, error } = await this.sb.auth.refreshSession();
            return { data, error: error ? (error.message || String(error)) : null };
        } catch (e) {
            return { data: null, error: e.message || String(e) };
        }
    }

    onAuthStateChange(callback) {
        try {
            const { data } = this.sb.auth.onAuthStateChange((event, session) => {
                try { callback?.(event, session); } catch (_) {}
            });
            return { unsubscribe: () => data?.subscription?.unsubscribe?.() };
        } catch (_) {
            return { unsubscribe: () => {} };
        }
    }
}

const hiAuthCore = new HiAuthCore();
export default hiAuthCore;
export { HiAuthCore };