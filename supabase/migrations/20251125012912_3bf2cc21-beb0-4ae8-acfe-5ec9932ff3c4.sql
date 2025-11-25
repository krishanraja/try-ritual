-- Allow users to see their partner's profile
CREATE POLICY "Users can view their partner's profile" 
ON profiles FOR SELECT
USING (
  id IN (
    SELECT partner_one FROM couples 
    WHERE (partner_two = auth.uid() OR partner_one = auth.uid()) AND is_active = true
    UNION
    SELECT partner_two FROM couples 
    WHERE (partner_two = auth.uid() OR partner_one = auth.uid()) AND is_active = true
  )
);

-- Add nudge tracking to weekly_cycles
ALTER TABLE weekly_cycles 
ADD COLUMN IF NOT EXISTS nudged_at timestamp with time zone;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_couples_partners ON couples(partner_one, partner_two) WHERE is_active = true;