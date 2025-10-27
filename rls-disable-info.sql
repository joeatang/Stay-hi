-- ⚠️ DANGEROUS: Disable RLS on storage buckets (NOT RECOMMENDED)
-- This removes security protections and allows anyone to create/modify buckets

-- To disable RLS on storage.buckets table:
ALTER TABLE storage.buckets DISABLE ROW LEVEL SECURITY;

-- To re-enable it later (RECOMMENDED):
ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;

-- BETTER APPROACH: Create a specific policy for bucket creation
-- This allows authenticated users to create buckets but keeps security
CREATE POLICY "Authenticated users can create buckets" ON storage.buckets
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Note: Even with this policy, Supabase UI is still the safest method
-- because it includes additional validation and proper setup