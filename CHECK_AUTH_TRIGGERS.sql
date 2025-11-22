-- Check if there's a trigger that creates users table entries
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'auth' 
  AND event_object_table = 'users';

-- Also check if the users table even has a row for this user
SELECT * FROM users WHERE id = 'fd0a0988-5283-46c4-b61b-9f35037eb7e3';
