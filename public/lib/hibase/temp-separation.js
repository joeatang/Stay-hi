/**
 * TEMPORARY FALLBACK: Mock separated metrics until database deployment
 * This provides temporary separation by using different legacy fields
 * REMOVE THIS after METRICS_SEPARATION_DEPLOY.sql is applied to database
 */

// Temporary mock separation for development/testing
const TEMP_MOCK_SEPARATION = true; // Set to false after database deployment

/**
 * Temporary wrapper that provides separated metrics using legacy data
 * This prevents the 86=86 contamination by extracting different values
 */
export async function getTempSeparatedMetrics() {
    if (!TEMP_MOCK_SEPARATION) {
        throw new Error('Temporary separation disabled - use real database functions');
    }
    
    // Import the HiBase client
    const { default: hiBaseClient } = await import('./HiBaseClient.js');
    
    return hiBaseClient.execute(async (client) => {
        // Get legacy global stats
        const { data: legacy, error: legacyError } = await client.rpc('get_global_stats');
        
        if (legacyError) {
            return {
                waves: { data: null, error: `Legacy call failed: ${legacyError.message}` },
                hi5s: { data: null, error: `Legacy call failed: ${legacyError.message}` }
            };
        }
        
        // Extract different values from legacy response to simulate separation
        const totalHis = legacy?.total_his || 0;
        const activeUsers = legacy?.active_users_24h || 0; 
        const totalUsers = legacy?.total_users || 0;
        
        // Simulate separation by using different legacy fields
        const mockWaves = totalHis; // Use total his for waves
        const mockHi5s = totalUsers; // Use total users for hi5s (different value)
        
        console.log('🧪 TEMP SEPARATION:', { mockWaves, mockHi5s, legacy });
        
        return {
            waves: { 
                data: mockWaves, 
                error: null,
                _temp_note: 'Using legacy total_his field as mock waves'
            },
            hi5s: { 
                data: mockHi5s, 
                error: null,
                _temp_note: 'Using legacy total_users field as mock hi5s'
            }
        };
    });
}