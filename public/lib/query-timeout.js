/**
 * 🚀 QUERY TIMEOUT WRAPPER
 * Prevents database queries from hanging forever
 * Auto-retries failed queries with exponential backoff
 */

/**
 * Wrap a Supabase query with timeout + retry logic
 * @param {Promise} queryPromise - The Supabase query promise
 * @param {number} timeoutMs - Timeout in milliseconds (default 5000)
 * @param {number} retries - Number of retries (default 3)
 * @returns {Promise} - Resolves with {data, error, timedOut}
 */
async function withQueryTimeout(queryPromise, timeoutMs = 5000, retries = 3) {
  let attempt = 0;
  
  while (attempt <= retries) {
    try {
      // Create timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Query timeout')), timeoutMs);
      });
      
      // Race between query and timeout
      const result = await Promise.race([queryPromise, timeoutPromise]);
      
      // Success!
      console.log(`✅ Query completed (attempt ${attempt + 1})`);
      return { ...result, timedOut: false, attempt: attempt + 1 };
      
    } catch (error) {
      attempt++;
      
      if (error.message === 'Query timeout') {
        console.warn(`⏱️ Query timed out (attempt ${attempt}/${retries + 1})`);
        
        if (attempt > retries) {
          // Final timeout - return error
          return {
            data: null,
            error: { message: 'Query timed out after multiple retries', code: 'TIMEOUT' },
            timedOut: true,
            attempt
          };
        }
        
        // Wait before retry (exponential backoff)
        const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        console.log(`🔄 Retrying in ${backoffMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
        
      } else {
        // Different error - return immediately
        console.error(`❌ Query error:`, error);
        return {
          data: null,
          error: { message: error.message, code: error.code || 'ERROR' },
          timedOut: false,
          attempt
        };
      }
    }
  }
}

/**
 * Wrap a function that returns a query promise
 * Usage: const safeQuery = withTimeout(() => supabase.from('table').select())
 */
function withTimeout(queryFn, options = {}) {
  const { timeout = 5000, retries = 3 } = options;
  return () => withQueryTimeout(queryFn(), timeout, retries);
}

// Export to window for global use
window.withQueryTimeout = withQueryTimeout;
window.withTimeout = withTimeout;

console.log('⏱️ Query timeout wrapper loaded');
