import { motion } from 'framer-motion';
import { EmotionalTokenData } from '@/types/magneticCanvas';

interface EmotionalTokenProps {
  token: EmotionalTokenData;
  isActive: boolean;
  onDragStart: () => void;
  onDragEnd: (tokenId: string, x: number, y: number) => void;
  partnerPosition?: { x: number; y: number } | null;
  showConnectionLine?: boolean;
}

export const EmotionalToken = ({
  token,
  isActive,
  onDragStart,
  onDragEnd,
  partnerPosition,
  showConnectionLine
}: EmotionalTokenProps) => {
  return (
    <>
      {showConnectionLine && partnerPosition && (
        <svg
          className="absolute inset-0 pointer-events-none"
          style={{ zIndex: 0 }}
        >
          <motion.line
            x1={token.position.x + 40}
            y1={token.position.y + 40}
            x2={partnerPosition.x + 40}
            y2={partnerPosition.y + 40}
            stroke={token.color}
            strokeWidth="2"
            strokeDasharray="5,5"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.5 }}
            transition={{ duration: 0.5 }}
          />
        </svg>
      )}
      
      <motion.div
        drag
        dragMomentum={false}
        dragElastic={0.1}
        onDragStart={onDragStart}
        onDragEnd={(_, info) => onDragEnd(token.id, info.point.x, info.point.y)}
        initial={{ x: token.position.x, y: token.position.y, scale: 0 }}
        animate={{
          x: token.position.x,
          y: token.position.y,
          scale: isActive ? 1.1 : token.isSnapped ? 1.15 : 1,
        }}
        whileHover={{ scale: 1.05 }}
        className="absolute cursor-grab active:cursor-grabbing"
        style={{ touchAction: 'none' }}
      >
        <div
          className={`relative w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-br ${token.gradient} shadow-lg flex items-center justify-center transition-all duration-300 ${isActive ? 'shadow-2xl brightness-110' : ''} ${token.isSnapped ? 'ring-4 ring-white/50 shadow-2xl animate-pulse' : ''}`}
        >
          {token.isSnapped && (
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{
                background: `radial-gradient(circle, ${token.color}40 0%, transparent 70%)`
              }}
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.6, 0, 0.6]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut'
              }}
            />
          )}
          
          <span className="text-xs md:text-sm font-semibold text-white relative z-10 text-center px-2">
            {token.label}
          </span>
          
          {isActive && (
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-white"
              initial={{ scale: 1, opacity: 0 }}
              animate={{ scale: 1.3, opacity: 0 }}
              transition={{ duration: 1, repeat: Infinity }}
            />
          )}
        </div>
      </motion.div>
    </>
  );
};
