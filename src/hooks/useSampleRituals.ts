import { useState, useEffect } from 'react';
import { SAMPLE_RITUALS, getRitualsByCity } from '@/data/sampleRituals';
import { useCouple } from '@/contexts/CoupleContext';
import { supabase } from '@/integrations/supabase/client';

interface Ritual {
  id: string | number;
  title: string;
  description: string;
  time_estimate: string;
  budget_band: string;
  category?: string;
  is_sample?: boolean;
}

export function useSampleRituals() {
  const { user, couple, currentCycle } = useCouple();
  const [rituals, setRituals] = useState<Ritual[]>([]);
  const [isShowingSamples, setIsShowingSamples] = useState(false);
  const [userCity, setUserCity] = useState<string | null>(null);

  // Fetch couple's preferred city (not user's individual city)
  useEffect(() => {
    const fetchCoupleCity = async () => {
      if (!couple) {
        setUserCity(null);
        return;
      }
      
      const { data } = await supabase
        .from('couples')
        .select('preferred_city')
        .eq('id', couple.id)
        .single();
      
      setUserCity(data?.preferred_city || null);
    };

    fetchCoupleCity();
  }, [couple]);

  useEffect(() => {
    // CRITICAL: if we have synthesized_output, always show real rituals
    if (currentCycle?.synthesized_output) {
      const output = currentCycle.synthesized_output as any;
      
      // Defensive parsing: handle both { rituals: [...] } and direct [...] formats
      // Also handle edge cases like { error: "..." } or null
      let realRituals: Ritual[] = [];
      
      if (Array.isArray(output)) {
        // Direct array format (legacy or edge case)
        realRituals = output;
        console.log('[useSampleRituals] Found direct array format, rituals:', realRituals.length);
      } else if (output && Array.isArray(output.rituals)) {
        // Standard { rituals: [...] } format
        realRituals = output.rituals;
        console.log('[useSampleRituals] Found standard format, rituals:', realRituals.length);
      } else {
        // Unknown format - log for debugging
        console.warn('[useSampleRituals] Unknown synthesized_output format:', 
          typeof output, 
          output ? Object.keys(output) : 'null'
        );
      }
      
      // Only update if we actually have rituals
      if (realRituals.length > 0) {
        setRituals(realRituals);
        setIsShowingSamples(false);
        return;
      }
    }

    // Check if both partners have submitted inputs (awaiting synthesis)
    const bothSubmitted = currentCycle?.partner_one_input && currentCycle?.partner_two_input;
    
    // If couple exists and both haven't submitted yet, or no partner yet, show samples
    if (couple && !bothSubmitted) {
      const filteredRituals = userCity ? getRitualsByCity(userCity) : SAMPLE_RITUALS;
      setRituals(filteredRituals);
      setIsShowingSamples(true);
    }
    // If no couple at all, show samples
    else if (!couple) {
      const filteredRituals = userCity ? getRitualsByCity(userCity) : SAMPLE_RITUALS;
      setRituals(filteredRituals);
      setIsShowingSamples(true);
    }
    // If both submitted but no rituals yet, show empty (synthesis in progress)
    else {
      setRituals([]);
      setIsShowingSamples(false);
    }
  }, [couple, currentCycle, userCity]);

  return {
    rituals,
    isShowingSamples,
    hasSamples: rituals.length > 0,
  };
}
