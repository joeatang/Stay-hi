-- Step 5: Create trigger on profiles table (fires after handle_new_user creates profile)
CREATE TRIGGER on_new_profile_increment_stats
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION increment_total_users_on_signup();