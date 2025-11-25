-- Add preferred_city to couples table for shared location
ALTER TABLE couples ADD COLUMN preferred_city text DEFAULT 'New York';

-- Migrate existing city preferences from the partner_one to couples
UPDATE couples c
SET preferred_city = p.preferred_city
FROM profiles p
WHERE c.partner_one = p.id AND p.preferred_city IS NOT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN couples.preferred_city IS 'Shared city preference for both partners in the couple';
