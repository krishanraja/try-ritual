
-- Add unique constraint to prevent duplicate weekly cycles
ALTER TABLE weekly_cycles 
ADD CONSTRAINT unique_couple_week 
UNIQUE (couple_id, week_start_date);

-- Create index for faster incomplete cycle queries
CREATE INDEX idx_weekly_cycles_incomplete 
ON weekly_cycles (couple_id, created_at DESC) 
WHERE synthesized_output IS NULL OR agreement_reached = false;

-- Add index for high-rated memories
CREATE INDEX idx_ritual_memories_highly_rated 
ON ritual_memories (couple_id, rating DESC, completion_date DESC) 
WHERE rating >= 4;
