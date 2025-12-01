import { useEffect, useState } from 'react';
import { useCouple } from '@/contexts/CoupleContext';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, DollarSign, ChevronDown, ChevronUp, Heart } from 'lucide-react';
import { format } from 'date-fns';
import { StrictMobileViewport } from '@/components/StrictMobileViewport';
import { useSEO } from '@/hooks/useSEO';

export default function History() {
  const { couple } = useCouple();
  const [pastCycles, setPastCycles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCycle, setExpandedCycle] = useState<string | null>(null);

  // SEO for history page
  useSEO({
    title: 'Ritual History',
    description: 'View your past weekly rituals and memories. Track your relationship journey and revisit meaningful moments.',
  });

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
        .or('synthesized_output.not.is.null,agreement_reached.eq.true')
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
          
          {pastCycles.map((cycle, idx) => {
            const isExpanded = expandedCycle === cycle.id;
            const hasAgreedRitual = cycle.agreement_reached && cycle.agreed_ritual;
            
            return (
              <motion.div
                key={cycle.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
              >
                <Card 
                  className="p-4 bg-white/90 backdrop-blur-sm cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setExpandedCycle(isExpanded ? null : cycle.id)}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>Week of {format(new Date(cycle.week_start_date), 'MMM d, yyyy')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {cycle.generated_at && (
                        <span className="text-xs text-green-600 font-medium">✓ Completed</span>
                      )}
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                  
                  {hasAgreedRitual && (
                    <div className="mb-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Heart className="w-4 h-4 text-primary" fill="currentColor" />
                        <span className="text-xs font-semibold text-primary">Your Chosen Ritual</span>
                      </div>
                      <h3 className="font-bold text-sm">{cycle.agreed_ritual.title}</h3>
                      <p className="text-xs text-muted-foreground mt-1">{cycle.agreed_ritual.description}</p>
                    </div>
                  )}
                  
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="space-y-2 overflow-hidden"
                      >
                        {cycle.synthesized_output && Array.isArray(cycle.synthesized_output) && (
                          <>
                            <p className="text-xs font-semibold text-muted-foreground mb-2">
                              All rituals from this week:
                            </p>
                            {cycle.synthesized_output.map((ritual: any, ritIdx: number) => (
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
                            ))}
                          </>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </StrictMobileViewport>
  );
}
