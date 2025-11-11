/**
 * EMERGENCY TABLE STRUCTURE AUDIT
 * Investigating database schema mismatch causing feed failures
 */

async function auditTableStructures() {
    console.log('🚨 EMERGENCY TABLE AUDIT STARTING...');
    
    // Get Supabase client
    const supabase = window.supabase || 
                   (window.HiDB && await window.HiDB.getSupabase()) ||
                   (window.createSupabaseClient && window.createSupabaseClient());
    
    if (!supabase) {
        console.error('❌ No Supabase client available for table audit');
        return;
    }
    
    console.log('✅ Supabase client found for table audit');
    
    // Check public_shares table structure
    console.log('\n🔍 AUDITING public_shares TABLE...');
    try {
        // Try to get just one record to see actual columns
        const { data: sampleData, error: sampleError } = await supabase
            .from('public_shares')
            .select('*')
            .limit(1);
            
        if (sampleError) {
            console.error('❌ Error querying public_shares:', sampleError);
        } else {
            console.log('✅ public_shares sample data:', sampleData);
            if (sampleData && sampleData.length > 0) {
                console.log('📋 Available columns in public_shares:', Object.keys(sampleData[0]));
            } else {
                console.log('⚠️ public_shares table is empty');
            }
        }
    } catch (error) {
        console.error('❌ Failed to audit public_shares:', error);
    }
    
    // Check hi_shares table structure
    console.log('\n🔍 AUDITING hi_shares TABLE...');
    try {
        const { data: hiSharesData, error: hiSharesError } = await supabase
            .from('hi_shares')
            .select('*')
            .limit(1);
            
        if (hiSharesError) {
            console.error('❌ Error querying hi_shares:', hiSharesError);
        } else {
            console.log('✅ hi_shares sample data:', hiSharesData);
            if (hiSharesData && hiSharesData.length > 0) {
                console.log('📋 Available columns in hi_shares:', Object.keys(hiSharesData[0]));
            } else {
                console.log('⚠️ hi_shares table is empty');
            }
        }
    } catch (error) {
        console.error('❌ Failed to audit hi_shares:', error);
    }
    
    // Check hi_archives table structure
    console.log('\n🔍 AUDITING hi_archives TABLE...');
    try {
        const { data: archiveData, error: archiveError } = await supabase
            .from('hi_archives')
            .select('*')
            .limit(1);
            
        if (archiveError) {
            console.error('❌ Error querying hi_archives:', archiveError);
        } else {
            console.log('✅ hi_archives sample data:', archiveData);
            if (archiveData && archiveData.length > 0) {
                console.log('📋 Available columns in hi_archives:', Object.keys(archiveData[0]));
            } else {
                console.log('⚠️ hi_archives table is empty');
            }
        }
    } catch (error) {
        console.error('❌ Failed to audit hi_archives:', error);
    }
    
    // Check hi_events table structure
    console.log('\n🔍 AUDITING hi_events TABLE...');
    try {
        const { data: eventsData, error: eventsError } = await supabase
            .from('hi_events')
            .select('*')
            .limit(1);
            
        if (eventsError) {
            console.error('❌ Error querying hi_events:', eventsError);
        } else {
            console.log('✅ hi_events sample data:', eventsData);
            if (eventsData && eventsData.length > 0) {
                console.log('📋 Available columns in hi_events:', Object.keys(eventsData[0]));
            } else {
                console.log('⚠️ hi_events table is empty');
            }
        }
    } catch (error) {
        console.error('❌ Failed to audit hi_events:', error);
    }
    
    console.log('\n🎯 TABLE AUDIT COMPLETE - Check logs above for column structures');
    
    return {
        auditComplete: true,
        timestamp: new Date().toISOString()
    };
}

// Make available globally for emergency use
window.auditTableStructures = auditTableStructures;

console.log('🚨 EMERGENCY TABLE AUDIT TOOL LOADED');
console.log('💡 Run: auditTableStructures() to check all table schemas');