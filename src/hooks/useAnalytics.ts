import { useCallback, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

// Generate a unique session ID for this browser session
const getSessionId = () => {
  let sessionId = sessionStorage.getItem('analytics_session_id');
  if (!sessionId) {
    sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('analytics_session_id', sessionId);
  }
  return sessionId;
};

interface TrackEventOptions {
  eventType: string;
  eventData?: Record<string, unknown>;
  page?: string;
}

export const useAnalytics = () => {
  const location = useLocation();
  const sessionId = useRef(getSessionId());
  const lastPageView = useRef<string | null>(null);

  // Track an event
  const trackEvent = useCallback(async ({ eventType, eventData = {}, page }: TrackEventOptions) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Get couple_id if user is logged in
      let coupleId: string | null = null;
      if (user) {
        const { data: couple } = await supabase
          .from('couples')
          .select('id')
          .or(`partner_one.eq.${user.id},partner_two.eq.${user.id}`)
          .eq('is_active', true)
          .maybeSingle();
        coupleId = couple?.id || null;
      }

      await supabase.from('user_analytics_events').insert([{
        user_id: user?.id || null,
        couple_id: coupleId,
        session_id: sessionId.current,
        event_type: eventType,
        event_data: eventData as unknown as Record<string, never>,
        page: page || location.pathname,
      }]);
    } catch (error) {
      console.error('Analytics tracking error:', error);
    }
  }, [location.pathname]);

  // Auto-track page views
  useEffect(() => {
    if (lastPageView.current !== location.pathname) {
      lastPageView.current = location.pathname;
      trackEvent({
        eventType: 'page_view',
        eventData: {
          path: location.pathname,
          search: location.search,
          referrer: document.referrer,
        },
        page: location.pathname,
      });
    }
  }, [location.pathname, location.search, trackEvent]);

  // Convenience methods for common events
  const trackClick = useCallback((elementName: string, additionalData?: Record<string, unknown>) => {
    trackEvent({
      eventType: 'button_click',
      eventData: { element: elementName, ...additionalData },
    });
  }, [trackEvent]);

  const trackFeatureUsed = useCallback((featureName: string, additionalData?: Record<string, unknown>) => {
    trackEvent({
      eventType: 'feature_used',
      eventData: { feature: featureName, ...additionalData },
    });
  }, [trackEvent]);

  const trackFormSubmit = useCallback((formName: string, additionalData?: Record<string, unknown>) => {
    trackEvent({
      eventType: 'form_submit',
      eventData: { form: formName, ...additionalData },
    });
  }, [trackEvent]);

  const trackError = useCallback((errorType: string, errorMessage: string) => {
    trackEvent({
      eventType: 'error',
      eventData: { type: errorType, message: errorMessage },
    });
  }, [trackEvent]);

  const trackConversion = useCallback((conversionType: string, additionalData?: Record<string, unknown>) => {
    trackEvent({
      eventType: 'conversion',
      eventData: { type: conversionType, ...additionalData },
    });
  }, [trackEvent]);

  return {
    trackEvent,
    trackClick,
    trackFeatureUsed,
    trackFormSubmit,
    trackError,
    trackConversion,
  };
};
