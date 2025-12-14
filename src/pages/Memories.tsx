/**
 * Memories Page
 * 
 * A visual gallery of completed ritual memories.
 * Replaces the old History page with a more engaging, scrapbook-like experience.
 * Shows photos, ratings, traditions, and partner reactions.
 * 
 * @created 2025-12-11
 */

/**
 * Memories Page
 * 
 * A visual gallery of completed ritual memories.
 * Shows photos, ratings, traditions, and partner reactions.
 * 
 * @updated 2025-12-13 - Production audit fixes
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Camera, Flame, Heart, Star } from 'lucide-react';
import { RitualSpinner } from '@/components/RitualSpinner';
import ritualIcon from '@/assets/ritual-icon.png';
import { useCouple } from '@/contexts/CoupleContext';
import { supabase } from '@/integrations/supabase/client';
import { useSEO } from '@/hooks/useSEO';
import { MemoryCard } from '@/components/MemoryCard';
import { Button } from '@/components/ui/button';

interface Memory {
  id: string;
  ritual_title: string;
  ritual_description: string | null;
  completion_date: string;
  rating: number | null;
  notes: string | null;
  photo_url: string | null;
  is_tradition: boolean | null;
  tradition_count: number | null;
}

interface Stats {
  totalRituals: number;
  traditions: number;
  photos: number;
  currentStreak: number;
}

export default function Memories() {
  const navigate = useNavigate();
  const { user, couple, loading: coupleLoading } = useCouple();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [stats, setStats] = useState<Stats>({ totalRituals: 0, traditions: 0, photos: 0, currentStreak: 0 });
  const [loading, setLoading] = useState(true);

  useSEO({
    title: 'Our Memories',
    description: 'Browse your shared ritual memories and celebrate your journey together.',
  });

  // Redirect if not authenticated or no couple
  useEffect(() => {
    if (!coupleLoading && !user) {
      navigate('/auth');
    }
  }, [user, coupleLoading, navigate]);

  useEffect(() => {
    if (couple?.id) {
      fetchMemories();
      fetchStats();
    } else if (!coupleLoading && user && !couple) {
      // User is logged in but has no couple
      setLoading(false);
    }
  }, [couple?.id, coupleLoading, user]);

  const fetchMemories = async () => {
    try {
      const { data, error } = await supabase
        .from('ritual_memories')
        .select('*')
        .eq('couple_id', couple!.id)
        .order('completion_date', { ascending: false });

      if (error) throw error;
      setMemories(data || []);
    } catch (error) {
      console.error('[Memories] Error fetching memories:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      // Get total rituals (from memories)
      const { count: totalRituals } = await supabase
        .from('ritual_memories')
        .select('*', { count: 'exact', head: true })
        .eq('couple_id', couple!.id);

      // Get traditions count
      const { count: traditions } = await supabase
        .from('ritual_memories')
        .select('*', { count: 'exact', head: true })
        .eq('couple_id', couple!.id)
        .eq('is_tradition', true);

      // Get photos count
      const { count: photos } = await supabase
        .from('ritual_memories')
        .select('*', { count: 'exact', head: true })
        .eq('couple_id', couple!.id)
        .not('photo_url', 'is', null);

      // Get current streak
      const { data: streakData } = await supabase
        .from('ritual_streaks')
        .select('current_streak')
        .eq('couple_id', couple!.id)
        .maybeSingle();

      setStats({
        totalRituals: totalRituals || 0,
        traditions: traditions || 0,
        photos: photos || 0,
        currentStreak: streakData?.current_streak || 0,
      });
    } catch (error) {
      console.error('[Memories] Error fetching stats:', error);
    }
  };

  if (loading || coupleLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-warm">
        <RitualSpinner size="lg" showText text="Loading memories..." />
      </div>
    );
  }

  // Show prompt if user has no couple yet
  if (!couple) {
    return (
      <div className="h-full flex flex-col items-center justify-center px-4 bg-gradient-warm">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-6 max-w-sm"
        >
          <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
            <Heart className="w-10 h-10 text-primary" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold">No Memories Yet</h2>
            <p className="text-muted-foreground text-sm">
              Create a ritual space with your partner to start building memories together.
            </p>
          </div>
          <Button
            onClick={() => navigate('/')}
            className="w-full bg-gradient-ritual text-white h-12 rounded-xl"
          >
            Get Started
          </Button>
        </motion.div>
      </div>
    );
  }

  // When there are no memories, use a fixed viewport layout
  // When there are memories, allow scrolling
  const hasMemories = memories.length > 0;

  return (
    <div className={`h-full bg-gradient-warm flex flex-col ${hasMemories ? 'overflow-y-auto' : 'overflow-hidden'}`}>
      <div className={`p-4 max-w-2xl mx-auto w-full flex flex-col ${hasMemories ? 'pb-24 space-y-6' : 'flex-1 space-y-4'}`}>
        {/* Header */}
        <div className="text-center space-y-1 flex-none">
          <h1 className="text-2xl font-bold">Our Memories</h1>
          <p className="text-muted-foreground text-sm">Your shared journey together</p>
        </div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-4 gap-2 flex-none"
        >
          <StatCard icon={Heart} value={stats.totalRituals} label="Rituals" color="text-red-500" />
          <StatCard icon={Flame} value={stats.currentStreak} label="Streak" color="text-orange-500" />
          <StatCard icon={Star} value={stats.traditions} label="Traditions" color="text-amber-500" />
          <StatCard icon={Camera} value={stats.photos} label="Photos" color="text-blue-500" />
        </motion.div>

        {/* Empty state - fits within viewport without scrolling */}
        {memories.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center text-center flex-1 -mt-6"
          >
            <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-primary/15 to-purple-200/25 flex items-center justify-center mb-4">
              <img src={ritualIcon} alt="" className="w-12 h-12 object-contain" />
            </div>
            <div className="space-y-2 mb-4">
              <h2 className="text-xl font-semibold">Your memory book awaits</h2>
              <p className="text-muted-foreground text-sm max-w-xs mx-auto leading-relaxed">
                Complete your first ritual together to start building your story. Each memory becomes a page in your shared journey.
              </p>
            </div>
            <Button
              onClick={() => navigate('/input')}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-primary to-pink-500 text-white font-medium shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-shadow"
            >
              <Heart className="w-4 h-4" />
              Start Your First Ritual
            </Button>
          </motion.div>
        ) : (
          /* Memory grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {memories.map((memory, index) => (
              <MemoryCard key={memory.id} memory={memory} index={index} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Stat card component
interface StatCardProps {
  icon: React.ElementType;
  value: number;
  label: string;
  color: string;
}

function StatCard({ icon: Icon, value, label, color }: StatCardProps) {
  return (
    <div className="bg-card rounded-xl p-3 border border-border/50 text-center">
      <Icon className={`w-5 h-5 mx-auto ${color}`} />
      <div className="text-lg font-bold mt-1">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
