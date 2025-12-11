import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Bug, Lightbulb, Heart, Meh, Frown, Star } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useCouple } from '@/contexts/CoupleContext';

type FeedbackType = 'quick_reaction' | 'feature_request' | 'bug_report' | 'general' | 'nps_score';
type Sentiment = 'positive' | 'neutral' | 'negative';

const CONTEXT_PROMPTS: Record<string, { prompt: string; type: FeedbackType }> = {
  '/rituals': { prompt: 'How are the ritual suggestions?', type: 'quick_reaction' },
  '/picker': { prompt: 'Finding what you need?', type: 'quick_reaction' },
  '/input': { prompt: 'Was input easy?', type: 'quick_reaction' },
  '/profile': { prompt: 'Any features you\'d love?', type: 'feature_request' },
  '/home': { prompt: 'How\'s your experience?', type: 'quick_reaction' },
};

export const ContextualFeedback = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('quick_reaction');
  const [sentiment, setSentiment] = useState<Sentiment | null>(null);
  const [message, setMessage] = useState('');
  const [npsScore, setNpsScore] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasShownThisSession, setHasShownThisSession] = useState(false);
  const [showNps, setShowNps] = useState(false);
  
  const location = useLocation();
  const { toast } = useToast();
  const { user, couple } = useCouple();

  // Check if we should show NPS prompt (once per 7 days, only for active couples after 5 min)
  useEffect(() => {
    const lastNps = localStorage.getItem('last_nps_prompt');
    const daysSinceNps = lastNps ? (Date.now() - parseInt(lastNps)) / (1000 * 60 * 60 * 24) : 999;
    
    // Only show if user has a paired couple (meaningful engagement)
    const hasMeaningfulEngagement = couple?.partner_two;
    
    if (daysSinceNps > 7 && user && hasMeaningfulEngagement && !hasShownThisSession) {
      const timer = setTimeout(() => {
        setShowNps(true);
        setHasShownThisSession(true);
      }, 300000); // Show after 5 minutes, not 30 seconds
      return () => clearTimeout(timer);
    }
  }, [user, couple, hasShownThisSession]);

  const contextPrompt = CONTEXT_PROMPTS[location.pathname] || { prompt: 'Share your thoughts', type: 'general' };

  const handleSubmit = async () => {
    if (!sentiment && !message && !npsScore) {
      toast({ title: 'Please provide feedback', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      const journeyStage = couple ? (couple.partner_two ? 'paired' : 'waiting_partner') : 'solo';
      
      await supabase.from('user_feedback').insert({
        user_id: user?.id || null,
        couple_id: couple?.id || null,
        feedback_type: showNps ? 'nps_score' : feedbackType,
        sentiment,
        message: message || null,
        context: {
          url: location.pathname,
          prompt_shown: contextPrompt.prompt,
        },
        page_context: location.pathname,
        user_journey_stage: journeyStage,
        rating: npsScore,
      });

      if (showNps) {
        localStorage.setItem('last_nps_prompt', Date.now().toString());
      }

      toast({ title: 'Thanks for your feedback!' });
      setIsOpen(false);
      setShowNps(false);
      setSentiment(null);
      setMessage('');
      setNpsScore(null);
    } catch (error) {
      console.error('Feedback error:', error);
      toast({ title: 'Failed to submit feedback', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Don't show on landing or auth pages
  if (location.pathname === '/' || location.pathname === '/auth') {
    return null;
  }

  return (
    <>
      {/* Floating feedback button */}
      <motion.button
        className="fixed bottom-24 right-4 z-40 w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
      >
        <MessageCircle className="w-5 h-5" />
      </motion.button>

      {/* Feedback drawer */}
      <AnimatePresence>
        {(isOpen || showNps) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center"
            onClick={() => { setIsOpen(false); setShowNps(false); }}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25 }}
              className="w-full max-w-lg bg-card rounded-t-3xl p-6 pb-10"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-foreground">
                  {showNps ? 'Quick question' : contextPrompt.prompt}
                </h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => { setIsOpen(false); setShowNps(false); }}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {showNps ? (
                /* NPS Score UI */
                <div className="space-y-4">
                  <p className="text-muted-foreground text-sm">
                    How likely are you to recommend Ritual to a friend?
                  </p>
                  <div className="flex gap-1 justify-center">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                      <button
                        key={score}
                        onClick={() => setNpsScore(score)}
                        className={`w-8 h-8 rounded-full text-sm font-medium transition-all ${
                          npsScore === score
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                      >
                        {score}
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Not likely</span>
                    <span>Very likely</span>
                  </div>
                </div>
              ) : (
                /* Regular feedback UI */
                <div className="space-y-4">
                  {/* Quick sentiment */}
                  <div className="flex justify-center gap-4">
                    <button
                      onClick={() => setSentiment('positive')}
                      className={`p-3 rounded-full transition-all ${
                        sentiment === 'positive' ? 'bg-green-500/20 ring-2 ring-green-500' : 'bg-muted'
                      }`}
                    >
                      <Heart className={`w-6 h-6 ${sentiment === 'positive' ? 'text-green-500' : 'text-muted-foreground'}`} />
                    </button>
                    <button
                      onClick={() => setSentiment('neutral')}
                      className={`p-3 rounded-full transition-all ${
                        sentiment === 'neutral' ? 'bg-yellow-500/20 ring-2 ring-yellow-500' : 'bg-muted'
                      }`}
                    >
                      <Meh className={`w-6 h-6 ${sentiment === 'neutral' ? 'text-yellow-500' : 'text-muted-foreground'}`} />
                    </button>
                    <button
                      onClick={() => setSentiment('negative')}
                      className={`p-3 rounded-full transition-all ${
                        sentiment === 'negative' ? 'bg-red-500/20 ring-2 ring-red-500' : 'bg-muted'
                      }`}
                    >
                      <Frown className={`w-6 h-6 ${sentiment === 'negative' ? 'text-red-500' : 'text-muted-foreground'}`} />
                    </button>
                  </div>

                  {/* Feedback type tabs */}
                  <div className="flex gap-2 justify-center">
                    <button
                      onClick={() => setFeedbackType('feature_request')}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs transition-all ${
                        feedbackType === 'feature_request' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      <Lightbulb className="w-3 h-3" />
                      Idea
                    </button>
                    <button
                      onClick={() => setFeedbackType('bug_report')}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs transition-all ${
                        feedbackType === 'bug_report' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      <Bug className="w-3 h-3" />
                      Bug
                    </button>
                    <button
                      onClick={() => setFeedbackType('general')}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs transition-all ${
                        feedbackType === 'general' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      <Star className="w-3 h-3" />
                      Other
                    </button>
                  </div>

                  {/* Optional message */}
                  <Textarea
                    placeholder="Tell us more (optional)"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="min-h-[80px] bg-muted/50 border-0 resize-none"
                  />
                </div>
              )}

              <Button
                className="w-full mt-4"
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                <Send className="w-4 h-4 mr-2" />
                {isSubmitting ? 'Sending...' : 'Send Feedback'}
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
