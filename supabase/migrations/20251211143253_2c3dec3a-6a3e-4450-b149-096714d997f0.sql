-- Drop the broken restrictive policy
DROP POLICY IF EXISTS "Anyone can join open couples" ON couples;

-- Recreate as PERMISSIVE (which is the default, not RESTRICTIVE)
CREATE POLICY "Anyone can join open couples" 
ON couples
FOR UPDATE
USING (partner_two IS NULL AND is_active = true AND code_expires_at > now())
WITH CHECK (partner_two = auth.uid());