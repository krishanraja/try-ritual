import { useEffect, useState } from 'react';
import { useCouple } from '@/contexts/CoupleContext';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { Calendar, Clock, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { StrictMobileViewport } from '@/components/StrictMobileViewport';

export default function History() {
  const { couple } = useCouple();
  const [pastCycles, setPastCycles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (couple?.id) {
      fetchHistory();
    }
  }, [couple?.id]);

  const fetchHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('weekly_cycles')
        .select('*')
        .eq('couple_id', couple.id)
        .not('synthesized_output', 'is', null)
        .order('week_start_date', { ascending: false });

      if (error) throw error;
      setPastCycles(data || []);
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <StrictMobileViewport>
        <div className="h-full bg-gradient-warm flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </StrictMobileViewport>
    );
  }

  if (pastCycles.length === 0) {
    return (
      <StrictMobileViewport>
        <div className="h-full bg-gradient-warm flex items-center justify-center p-4">
          <div className="text-center">
            <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <h2 className="text-lg font-bold mb-2">No History Yet</h2>
            <p className="text-sm text-muted-foreground">
              Complete your first week together to see your ritual history
            </p>
          </div>
        </div>
      </StrictMobileViewport>
    );
  }

  return (
    <StrictMobileViewport>
      <div className="h-full bg-gradient-warm overflow-y-auto">
        <div className="p-4 space-y-3">
          <h1 className="text-xl font-bold text-center mb-3">Your Ritual History</h1>
          
          {pastCycles.map((cycle, idx) => (
            <motion.div
              key={cycle.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              <Card className="p-4 bg-white/90 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>Week of {format(new Date(cycle.week_start_date), 'MMM d, yyyy')}</span>
                  </div>
                  {cycle.generated_at && (
                    <span className="text-xs text-green-600 font-medium">✓ Completed</span>
                  )}
                </div>
                
                <div className="space-y-2">
                  {cycle.synthesized_output && Array.isArray(cycle.synthesized_output) && (
                    cycle.synthesized_output.slice(0, 3).map((ritual: any, ritIdx: number) => (
                      <div key={ritIdx} className="flex items-start gap-3 p-2 rounded-lg bg-background/50">
                        <div className="flex-1">
                          <h3 className="font-semibold text-sm">{ritual.title}</h3>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {ritual.time_estimate}
                            </span>
                            <span className="flex items-center gap-1">
                              <DollarSign className="w-3 h-3" />
                              {ritual.budget_band}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </StrictMobileViewport>
  );
}
