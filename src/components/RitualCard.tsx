import { motion } from 'framer-motion';
import { Calendar, Share2, CheckCircle2, Clock, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { shareToWhatsApp } from '@/utils/shareUtils';
import { downloadICS } from '@/utils/calendarUtils';
import { cn } from '@/lib/utils';

interface Ritual {
  id: string | number;
  title: string;
  description: string;
  time_estimate: string;
  budget_band: string;
  category?: string;
  is_sample?: boolean;
  why?: string;
}

interface RitualCardProps {
  ritual: Ritual;
  isComplete?: boolean;
  onComplete?: () => void;
  variant?: 'full' | 'compact' | 'sample';
  showActions?: boolean;
  agreedDate?: string;
  agreedTime?: string;
}

export const RitualCard = ({ 
  ritual, 
  isComplete = false, 
  onComplete, 
  variant = 'full',
  showActions = true,
  agreedDate,
  agreedTime
}: RitualCardProps) => {
  const heights = {
    full: 'max-h-[calc(100vh-220px)] min-h-[340px]',
    compact: 'max-h-[calc(100vh-240px)] min-h-[280px]',
    sample: 'max-h-[calc(100vh-240px)] min-h-[280px]'
  };

  const getCategoryColor = (category?: string) => {
    switch (category?.toLowerCase()) {
      case 'connection': return 'bg-primary/20 text-primary-foreground border-primary/30';
      case 'adventure': return 'bg-accent/20 text-accent-foreground border-accent/30';
      case 'relaxation': return 'bg-muted/40 text-muted-foreground border-muted/50';
      case 'creativity': return 'bg-secondary/20 text-secondary-foreground border-secondary/30';
      default: return 'bg-card/50 text-card-foreground border-border';
    }
  };

  return (
    <motion.div
      className={cn(
        heights[variant],
        "w-full rounded-2xl bg-card/90 backdrop-blur-md border shadow-card",
        "flex flex-col overflow-hidden"
      )}
      whileHover={{ scale: variant === 'full' ? 1.02 : 1.0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Header */}
      <div className="p-5 pb-3 flex-none">
        <div className="flex items-start justify-between gap-3 mb-3">
          <h3 className="text-lg font-bold leading-tight flex-1">
            {ritual.title}
          </h3>
          {ritual.is_sample && (
            <Badge variant="outline" className="flex-none bg-accent/20 border-accent">
              Sample
            </Badge>
          )}
        </div>
      </div>

      {/* Description */}
      <div className="px-5 pb-4 flex-none">
        <p className="text-base leading-relaxed">
          {ritual.description}
        </p>
      </div>

      {/* Why Section - Compact */}
      {ritual.why && (
        <div className="px-5 pb-3 flex-none">
          <p className="text-xs text-muted-foreground italic">
            ✨ {ritual.why}
          </p>
        </div>
      )}

      {/* Metadata */}
      <div className="px-5 pb-3 flex-none">
        <div className="flex flex-wrap items-center gap-2">
          {ritual.category && (
            <Badge variant="outline" className={cn("text-xs", getCategoryColor(ritual.category))}>
              {ritual.category}
            </Badge>
          )}
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>{ritual.time_estimate}</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <DollarSign className="w-3 h-3" />
            <span>{ritual.budget_band}</span>
          </div>
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Actions */}
      {showActions && (
        <div className="p-4 flex-none border-t bg-card/50">
          <div className="flex flex-col gap-2">
            {!isComplete && onComplete && (
              <Button 
                onClick={onComplete}
                className="w-full h-12 bg-gradient-ritual text-primary-foreground hover:opacity-90 rounded-xl font-semibold"
              >
                <CheckCircle2 className="w-5 h-5 mr-2" />
                Mark as Done
              </Button>
            )}
            {isComplete && (
              <div className="w-full h-12 rounded-xl bg-primary/10 border-2 border-primary/20 flex items-center justify-center text-primary font-semibold">
                <CheckCircle2 className="w-5 h-5 mr-2" />
                Completed!
              </div>
            )}
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="flex-1 h-9 text-xs"
                onClick={() => shareToWhatsApp(ritual)}
              >
                <Share2 className="w-3 h-3 mr-1" />
                Share
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="flex-1 h-9 text-xs"
                onClick={() => {
                  const date = agreedDate ? new Date(agreedDate) : undefined;
                  downloadICS(ritual, date, agreedTime);
                }}
              >
                <Calendar className="w-3 h-3 mr-1" />
                Calendar
              </Button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};
