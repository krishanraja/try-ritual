import { useEffect, useState } from 'react';
import { Flame } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCouple } from '@/contexts/CoupleContext';
import { motion } from 'framer-motion';

export const StreakBadge = () => {
  const { couple } = useCouple();
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (couple?.id) {
      fetchStreak();
    }
  }, [couple?.id]);

  const fetchStreak = async () => {
    try {
      const { data, error } = await supabase
        .from('ritual_streaks')
        .select('current_streak')
        .eq('couple_id', couple.id)
        .maybeSingle();

      if (error) throw error;
      setStreak(data?.current_streak || 0);
    } catch (error) {
      console.error('Error fetching streak:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !couple) return null;

  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-2 rounded-full shadow-lg"
    >
      <Flame className="w-5 h-5" />
      <span className="font-bold">{streak} Week Streak</span>
    </motion.div>
  );
};