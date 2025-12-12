interface AnimatedGradientBackgroundProps {
  variant?: 'warm' | 'calm' | 'ritual';
  className?: string;
  showVideoBackdrop?: boolean;
}

export function AnimatedGradientBackground({ 
  variant = 'warm',
  className = '',
  showVideoBackdrop = false
}: AnimatedGradientBackgroundProps) {
  const gradients = {
    warm: {
      blob1: 'bg-purple-light',
      blob2: 'bg-gold-light',
      blob3: 'bg-teal-light',
    },
    calm: {
      blob1: 'bg-teal-light',
      blob2: 'bg-purple-light',
      blob3: 'bg-muted',
    },
    ritual: {
      blob1: 'bg-teal',
      blob2: 'bg-purple',
      blob3: 'bg-gold',
    },
  };

  const colors = gradients[variant];

  return (
    <div className={`absolute inset-0 z-0 overflow-hidden pointer-events-none ${className}`}>
      {/* Video poster backdrop for visual continuity with splash screen */}
      {showVideoBackdrop && (
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-[0.08]"
          style={{ backgroundImage: "url('/ritual-poster.jpg')" }}
        />
      )}
      
      {/* Base gradient - matches splash overlay transition target */}
      <div className="absolute inset-0 bg-gradient-calm" />
      
      {/* Static blob 1 - top right */}
      <div
        className={`absolute -top-20 -right-20 w-80 h-80 rounded-full ${colors.blob1} opacity-40 blur-3xl`}
      />
      
      {/* Static blob 2 - bottom left */}
      <div
        className={`absolute -bottom-32 -left-32 w-96 h-96 rounded-full ${colors.blob2} opacity-30 blur-3xl`}
      />
      
      {/* Static blob 3 - center */}
      <div
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full ${colors.blob3} opacity-20 blur-3xl`}
      />
    </div>
  );
}
