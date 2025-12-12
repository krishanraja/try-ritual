-- Create SECURITY DEFINER function for bulletproof partner joining
CREATE OR REPLACE FUNCTION public.join_couple_with_code(input_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_couple couples%ROWTYPE;
  current_user_id uuid;
BEGIN
  -- Get current user
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  
  -- Find and lock the couple row to prevent race conditions
  SELECT * INTO target_couple
  FROM couples
  WHERE couple_code = input_code
    AND partner_two IS NULL
    AND is_active = true
    AND code_expires_at > now()
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Code not found or expired. Check with your partner.');
  END IF;
  
  -- Check not joining own couple
  IF target_couple.partner_one = current_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'You cannot join your own couple code!');
  END IF;
  
  -- Perform the join - this bypasses RLS since we're SECURITY DEFINER
  UPDATE couples
  SET partner_two = current_user_id
  WHERE id = target_couple.id
    AND partner_two IS NULL;  -- Extra safety check
  
  -- Verify the update worked
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Join failed - someone else may have joined first');
  END IF;
  
  -- Return success with couple data
  RETURN jsonb_build_object(
    'success', true,
    'couple_id', target_couple.id,
    'partner_one', target_couple.partner_one
  );
END;
$$;

-- Clean up ALL conflicting UPDATE policies
DROP POLICY IF EXISTS "Anyone can join open couples" ON couples;
DROP POLICY IF EXISTS "Partner one can update couple" ON couples;
DROP POLICY IF EXISTS "Partner two can leave couple" ON couples;
DROP POLICY IF EXISTS "Couple members can update" ON couples;
DROP POLICY IF EXISTS "Users can update their couple" ON couples;

-- Create a single, simple UPDATE policy for existing couple members only
-- (Join is now handled by SECURITY DEFINER function, so no RLS needed for that)
CREATE POLICY "Couple members can update their couple" ON couples
FOR UPDATE USING (
  auth.uid() = partner_one OR auth.uid() = partner_two
)
WITH CHECK (
  auth.uid() = partner_one OR auth.uid() = partner_two
);