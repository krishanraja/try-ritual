-- Drop the conflicting UPDATE policies
DROP POLICY IF EXISTS "Anyone can join open couples" ON couples;
DROP POLICY IF EXISTS "Partner one can update couple" ON couples;
DROP POLICY IF EXISTS "Partner two can leave couple" ON couples;

-- Create a single unified UPDATE policy that handles all cases
CREATE POLICY "Couple members can update" ON couples
FOR UPDATE USING (
  -- Case 1: Partner one can always update their couple
  (auth.uid() = partner_one AND is_active = true)
  OR
  -- Case 2: Partner two can update their couple (for leaving)
  (auth.uid() = partner_two AND is_active = true)
  OR
  -- Case 3: Anyone can join an open couple (partner_two is null)
  (partner_two IS NULL AND is_active = true AND code_expires_at > now())
)
WITH CHECK (
  -- Case 1: Partner one updates - allow any valid update
  (auth.uid() = partner_one)
  OR
  -- Case 2: Joining - partner_two must be set to current user
  (partner_two = auth.uid() AND partner_one != auth.uid())
  OR
  -- Case 3: Leaving - partner_two must become null (only if user was partner_two)
  (partner_two IS NULL)
);