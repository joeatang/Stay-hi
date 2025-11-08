/**
 * HiAuthCore.js - Fallback auth stub for metrics page
 * Simplified version to prevent 404 errors while loading metrics
 */

class HiAuthCore {
    async getActiveIdentity() {
        // Return null user for anonymous metrics viewing
        return { 
            data: null, 
            error: null 
        };
    }
    
    async requireAuth() {
        // Return null - don't require auth for public metrics
        return null;
    }
    
    async signIn(email, password) {
        return { data: null, error: { message: 'Auth not implemented in stub' } };
    }
    
    async signOut() {
        return { data: null, error: null };
    }
    
    async signUp(email, password) {
        return { data: null, error: { message: 'Auth not implemented in stub' } };
    }
    
    onAuthStateChange(callback) {
        // No-op for stub
        return { unsubscribe: () => {} };
    }
}

const hiAuthCore = new HiAuthCore();
export default hiAuthCore;
export { HiAuthCore };