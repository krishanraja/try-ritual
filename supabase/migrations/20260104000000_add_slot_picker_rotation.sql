-- Add slot picker rotation to couples table
-- This tracks who picked the final time slot last, so we can alternate

-- Add last_slot_picker_id to couples
ALTER TABLE couples ADD COLUMN IF NOT EXISTS last_slot_picker_id UUID REFERENCES auth.users(id);

-- Add slot_picker_id to weekly_cycles (who gets to pick this week)
ALTER TABLE weekly_cycles ADD COLUMN IF NOT EXISTS slot_picker_id UUID REFERENCES auth.users(id);
ALTER TABLE weekly_cycles ADD COLUMN IF NOT EXISTS slot_selected_at TIMESTAMPTZ;

-- Comment for documentation
COMMENT ON COLUMN couples.last_slot_picker_id IS 'User ID of the partner who picked the time slot last week. The other partner gets to pick this week.';
COMMENT ON COLUMN weekly_cycles.slot_picker_id IS 'User ID of the partner designated to pick the final time slot for this cycle.';
COMMENT ON COLUMN weekly_cycles.slot_selected_at IS 'When the time slot was selected.';
