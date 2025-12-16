/**
 * MemoryCard Component
 * 
 * A polaroid-style card displaying a completed ritual memory.
 * Shows photo (or gradient placeholder), title, date, rating, and reactions.
 * 
 * @created 2025-12-11
 */

import { useState, memo } from 'react';
import { motion } from 'framer-motion';
import { Heart, Star, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { MemoryReactions } from './MemoryReactions';

interface MemoryCardProps {
  memory: {
    id: string;
    ritual_title: string;
    ritual_description?: string | null;
    completion_date: string;
    rating?: number | null;
    notes?: string | null;
    photo_url?: string | null;
    is_tradition?: boolean | null;
    tradition_count?: number | null;
  };
  index: number;
}

// Gradient placeholders for memories without photos
const PLACEHOLDER_GRADIENTS = [
  'from-rose-400 to-pink-500',
  'from-violet-400 to-purple-500',
  'from-blue-400 to-indigo-500',
  'from-emerald-400 to-teal-500',
  'from-amber-400 to-orange-500',
  'from-red-400 to-rose-500',
];

export const MemoryCard = memo(function MemoryCard({ memory, index }: MemoryCardProps) {
  const [expanded, setExpanded] = useState(false);

  const gradientClass = PLACEHOLDER_GRADIENTS[index % PLACEHOLDER_GRADIENTS.length];
  const hasPhoto = memory.photo_url && memory.photo_url.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="bg-card rounded-2xl overflow-hidden shadow-md border border-border/50 hover:shadow-lg transition-shadow"
    >
      {/* Photo or gradient placeholder */}
      <div className="relative aspect-[4/3] overflow-hidden">
        {hasPhoto ? (
          <img
            src={memory.photo_url!}
            alt={memory.ritual_title}
            className="w-full h-full object-cover"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${gradientClass} flex items-center justify-center`}>
            <span className="text-4xl opacity-50">✨</span>
          </div>
        )}

        {/* Tradition badge */}
        {memory.is_tradition && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute top-2 left-2 px-2 py-1 rounded-full bg-amber-500 text-white text-xs font-bold flex items-center gap-1"
          >
            <Star className="w-3 h-3" fill="currentColor" />
            Tradition
          </motion.div>
        )}

        {/* Rating hearts */}
        {memory.rating && (
          <div className="absolute top-2 right-2 flex gap-0.5">
            {[...Array(5)].map((_, i) => (
              <Heart
                key={i}
                className={`w-4 h-4 ${
                  i < memory.rating! ? 'text-red-500 fill-red-500' : 'text-white/50'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Title and date */}
        <div>
          <h3 className="font-semibold text-foreground line-clamp-1">
            {memory.ritual_title}
          </h3>
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
            <Calendar className="w-3 h-3" />
            <span>{format(new Date(memory.completion_date), 'MMM d, yyyy')}</span>
            {memory.tradition_count && memory.tradition_count > 1 && (
              <span className="ml-2 text-primary">× {memory.tradition_count}</span>
            )}
          </div>
        </div>

        {/* Reactions and expand */}
        <div className="flex items-center justify-between">
          <MemoryReactions memoryId={memory.id} />
          
          {(memory.notes || memory.ritual_description) && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {expanded ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  Less
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  More
                </>
              )}
            </button>
          )}
        </div>

        {/* Expanded content */}
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="pt-2 border-t border-border/50 space-y-2"
          >
            {memory.ritual_description && (
              <p className="text-sm text-muted-foreground">
                {memory.ritual_description}
              </p>
            )}
            {memory.notes && (
              <div className="p-2 rounded-lg bg-secondary/50">
                <p className="text-sm italic text-foreground/80">"{memory.notes}"</p>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
});
