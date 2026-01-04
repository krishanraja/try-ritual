-- Fix couples that reference missing profiles
-- This migration creates missing profiles for existing couples that have invalid foreign key references
-- This can happen if couples were created before the FK constraint was added, or if the trigger failed

DO $$
DECLARE
  couple_record RECORD;
  user_record RECORD;
  profiles_created integer := 0;
BEGIN
  -- Find couples where partner_one profile doesn't exist
  FOR couple_record IN 
    SELECT c.id, c.partner_one, c.partner_two
    FROM couples c
    WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = c.partner_one)
       OR (c.partner_two IS NOT NULL AND NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = c.partner_two))
  LOOP
    -- Create missing profile for partner_one
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = couple_record.partner_one) THEN
      SELECT * INTO user_record FROM auth.users WHERE id = couple_record.partner_one;
      IF FOUND THEN
        INSERT INTO profiles (id, name, email)
        VALUES (
          couple_record.partner_one,
          COALESCE(user_record.raw_user_meta_data->>'name', 'User'),
          user_record.email
        )
        ON CONFLICT (id) DO NOTHING;
        
        IF FOUND THEN
          profiles_created := profiles_created + 1;
          RAISE NOTICE 'Created profile for partner_one: %', couple_record.partner_one;
        END IF;
      ELSE
        RAISE WARNING 'User not found in auth.users for partner_one: %', couple_record.partner_one;
      END IF;
    END IF;
    
    -- Create missing profile for partner_two if exists
    IF couple_record.partner_two IS NOT NULL 
       AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = couple_record.partner_two) THEN
      SELECT * INTO user_record FROM auth.users WHERE id = couple_record.partner_two;
      IF FOUND THEN
        INSERT INTO profiles (id, name, email)
        VALUES (
          couple_record.partner_two,
          COALESCE(user_record.raw_user_meta_data->>'name', 'User'),
          user_record.email
        )
        ON CONFLICT (id) DO NOTHING;
        
        IF FOUND THEN
          profiles_created := profiles_created + 1;
          RAISE NOTICE 'Created profile for partner_two: %', couple_record.partner_two;
        END IF;
      ELSE
        RAISE WARNING 'User not found in auth.users for partner_two: %', couple_record.partner_two;
      END IF;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Migration complete. Created % missing profiles.', profiles_created;
END $$;



















