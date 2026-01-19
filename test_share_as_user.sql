-- Test if create_public_share RPC works for authenticated user
-- Run this as HollyRae12 or ask her to check if she's authenticated

-- Check current auth session
SELECT 
  auth.uid() as my_user_id,
  auth.role() as my_role;

-- If returns NULL for my_user_id, she's not authenticated (session expired)
