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
  weeklyCycleId: string;
  onComplete: (canvasState: any) => void;
}

export const MagneticCanvas = ({ weeklyCycleId, onComplete }: MagneticCanvasProps) => {
  const [tokens, setTokens] = useState<EmotionalTokenData[]>(INITIAL_TOKENS);
  const [activeToken, setActiveToken] = useState<TokenType | null>(null);
  const [snapCount, setSnapCount] = useState(0);
  
  const {
    partnerPresence,
    partnerTokens,
    isPartnerOnline,
    broadcastTokenMove,
    broadcastTokenSnap,
    broadcastCanvasComplete
  } = useMagneticSync(weeklyCycleId);

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
    <div className="relative w-full h-screen bg-gradient-to-br from-background via-background to-primary/5 overflow-hidden">
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

      {/* Header */}
      <div className="absolute top-4 left-0 right-0 z-20 px-4">
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-background/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg"
          >
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-primary" />
                Magnetic Canvas
              </h2>
              <div className="flex items-center gap-2">
                <Users className={`w-5 h-5 ${isPartnerOnline ? 'text-green-500' : 'text-muted-foreground'}`} />
                <span className="text-sm text-muted-foreground">
                  {isPartnerOnline ? 'Partner Online' : 'Waiting...'}
                </span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Drag your emotional tokens. When they're close to your partner's, they'll snap together with a burst of energy.
            </p>
            {snapCount > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-3 text-sm font-semibold text-primary"
              >
                ✨ {snapCount} alignment{snapCount > 1 ? 's' : ''} discovered!
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Canvas area */}
      <div className="absolute inset-0 pt-32 pb-24">
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

      {/* Complete button */}
      <AnimatePresence>
        {allTokensPlaced && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-8 left-0 right-0 z-20 px-4"
          >
            <div className="max-w-md mx-auto">
              <Button
                onClick={handleComplete}
                size="lg"
                className="w-full text-lg font-semibold shadow-xl"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                Generate Our Rituals
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
