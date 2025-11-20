import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { EmotionalToken } from './EmotionalToken';
import { PartnerGhost } from './PartnerGhost';
import { useMagneticSync } from '@/hooks/useMagneticSync';
import { 
  EmotionalTokenData, 
  TokenType, 
  INITIAL_TOKENS, 
  SNAP_THRESHOLD,
  ATTRACTION_RADIUS 
} from '@/types/magneticCanvas';
import { Button } from './ui/button';
import { Sparkles, Users } from 'lucide-react';
import confetti from 'canvas-confetti';

interface MagneticCanvasProps {
  weeklyCycleId?: string;
  onComplete: (canvasState: any) => void;
  demoMode?: boolean;
  onDemoComplete?: () => void;
}

export const MagneticCanvas = ({ weeklyCycleId, onComplete, demoMode = false, onDemoComplete }: MagneticCanvasProps) => {
  const [tokens, setTokens] = useState<EmotionalTokenData[]>(INITIAL_TOKENS);
  const [activeToken, setActiveToken] = useState<TokenType | null>(null);
  const [snapCount, setSnapCount] = useState(0);
  
  // Only use sync in non-demo mode
  const syncHook = useMagneticSync(weeklyCycleId || '');
  const {
    partnerPresence,
    partnerTokens,
    isPartnerOnline,
    broadcastTokenMove,
    broadcastTokenSnap,
    broadcastCanvasComplete
  } = demoMode ? {
    partnerPresence: { position: { x: 0, y: 0 }, activeToken: null },
    partnerTokens: new Map(),
    isPartnerOnline: false,
    broadcastTokenMove: () => {},
    broadcastTokenSnap: () => {},
    broadcastCanvasComplete: async () => {}
  } : syncHook;

  const calculateDistance = (pos1: { x: number; y: number }, pos2: { x: number; y: number }) => {
    return Math.sqrt(Math.pow(pos2.x - pos1.x, 2) + Math.pow(pos2.y - pos1.y, 2));
  };

  const handleDragEnd = useCallback((tokenId: TokenType, x: number, y: number) => {
    setActiveToken(null);
    
    const partnerPos = partnerTokens.get(tokenId);
    let finalX = x;
    let finalY = y;
    let isSnapped = false;

    if (partnerPos) {
      const distance = calculateDistance({ x, y }, partnerPos);
      
      if (distance < SNAP_THRESHOLD) {
        // Snap to midpoint
        finalX = (x + partnerPos.x) / 2;
        finalY = (y + partnerPos.y) / 2;
        isSnapped = true;
        
        // Haptic feedback - confetti burst
        confetti({
          particleCount: 30,
          spread: 50,
          origin: { 
            x: (finalX + 40) / window.innerWidth,
            y: (finalY + 40) / window.innerHeight
          },
          colors: [tokens.find(t => t.id === tokenId)?.color || '#000']
        });
        
        setSnapCount(prev => prev + 1);
        broadcastTokenSnap(tokenId, { x: finalX, y: finalY });
      } else {
        broadcastTokenMove(tokenId, { x: finalX, y: finalY });
      }
    } else {
      broadcastTokenMove(tokenId, { x: finalX, y: finalY });
    }

    setTokens(prev =>
      prev.map(token =>
        token.id === tokenId
          ? { ...token, position: { x: finalX, y: finalY }, isSnapped }
          : token
      )
    );
  }, [partnerTokens, tokens, broadcastTokenMove, broadcastTokenSnap]);

  const handleComplete = async () => {
    if (demoMode && onDemoComplete) {
      onDemoComplete();
      return;
    }

    const alignments = tokens.filter(t => t.isSnapped).map(t => t.id);
    const priorities = tokens.map(token => {
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      const distance = calculateDistance(token.position, { x: centerX, y: centerY });
      const maxDistance = Math.sqrt(Math.pow(centerX, 2) + Math.pow(centerY, 2));
      const strength = Math.max(0, 100 - (distance / maxDistance) * 100);
      return { token: token.id, strength: Math.round(strength) };
    }).sort((a, b) => b.strength - a.strength);

    const canvasState = {
      tokens: tokens.map(t => ({ id: t.id, position: t.position, isSnapped: t.isSnapped })),
      alignments,
      priorities
    };

    await broadcastCanvasComplete(canvasState);
    onComplete(canvasState);
  };

  const allTokensPlaced = snapCount >= 2; // At least 2 alignments

  return (
    <div className="relative w-full h-full bg-gradient-to-br from-background via-background to-primary/5 overflow-hidden flex flex-col">
      {/* Ambient particles */}
      <div className="absolute inset-0 opacity-30">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 rounded-full bg-primary/20"
            animate={{
              x: [Math.random() * window.innerWidth, Math.random() * window.innerWidth],
              y: [Math.random() * window.innerHeight, Math.random() * window.innerHeight],
            }}
            transition={{
              duration: Math.random() * 20 + 10,
              repeat: Infinity,
              ease: 'linear'
            }}
          />
        ))}
      </div>

      {/* Header - Compact */}
      <div className="flex-none px-3 py-2 z-20">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-background/80 backdrop-blur-sm rounded-xl p-3"
        >
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-bold flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-primary" />
              Magnetic Canvas
            </h2>
            {!demoMode && (
              <div className="flex items-center gap-1.5">
                <Users className={`w-4 h-4 ${isPartnerOnline ? 'text-green-500' : 'text-muted-foreground'}`} />
                <span className="text-xs text-muted-foreground">
                  {isPartnerOnline ? 'Online' : 'Waiting'}
                </span>
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground leading-tight">
            {demoMode 
              ? "Drag tokens to explore"
              : "Drag tokens. They snap when close to your partner's"}
          </p>
          {snapCount > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-1.5 text-xs font-semibold text-primary"
            >
              ✨ {snapCount} alignment{snapCount > 1 ? 's' : ''}
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Canvas area - Fills remaining space */}
      <div className="flex-1 relative">
        <PartnerGhost tokens={partnerTokens} isOnline={isPartnerOnline} />
        
        {tokens.map(token => {
          const partnerPos = partnerTokens.get(token.id);
          const showConnection = partnerPos && activeToken === token.id;
          
          return (
            <EmotionalToken
              key={token.id}
              token={token}
              isActive={activeToken === token.id}
              onDragStart={() => setActiveToken(token.id)}
              onDragEnd={handleDragEnd}
              partnerPosition={partnerPos}
              showConnectionLine={showConnection}
            />
          );
        })}
      </div>

      {/* Complete button - Bottom fixed */}
      <AnimatePresence>
        {allTokensPlaced && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="flex-none px-3 pb-3 z-20"
          >
            <Button
              onClick={handleComplete}
              className="w-full h-12 text-sm font-semibold shadow-xl bg-gradient-ritual"
            >
              <Sparkles className="w-4 h-4 mr-1.5" />
              {demoMode ? "Sign Up to Create" : "Generate Rituals"}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
