import { useState, useEffect } from 'react';
import { RitualCard } from './RitualCard';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, CarouselApi } from '@/components/ui/carousel';

interface Ritual {
  id: string | number;
  title: string;
  description: string;
  time_estimate: string;
  budget_band: string;
  category?: string;
  is_sample?: boolean;
}

interface RitualCarouselProps {
  rituals: Ritual[];
  completions: Set<string>;
  onComplete: (ritual: Ritual) => void;
  variant?: 'full' | 'compact' | 'sample';
  isShowingSamples?: boolean;
  agreedDate?: string;
  agreedTime?: string;
}

export const RitualCarousel = ({ 
  rituals, 
  completions, 
  onComplete, 
  variant = 'full',
  isShowingSamples = false,
  agreedDate,
  agreedTime
}: RitualCarouselProps) => {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!api) return;

    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap() + 1);

    api.on('select', () => {
      setCurrent(api.selectedScrollSnap() + 1);
    });
  }, [api]);

  return (
    <div className="w-full h-full flex flex-col pb-2">
      <Carousel
        setApi={setApi}
        className="w-full flex-1 min-h-0"
        opts={{
          align: 'center',
          loop: false,
        }}
      >
        <CarouselContent className="h-full items-center">
          {rituals.map((ritual) => (
            <CarouselItem key={ritual.id} className="pl-4 basis-[85vw]">
              <div className="h-full flex items-center justify-center px-1 py-2">
              <RitualCard
                ritual={ritual}
                isComplete={completions.has(ritual.title)}
                onComplete={() => onComplete(ritual)}
                variant={variant}
                showActions={true}
                agreedDate={agreedDate}
                agreedTime={agreedTime}
              />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="left-2" />
        <CarouselNext className="right-2" />
      </Carousel>
      
      {/* Dot indicators - Compact */}
      <div className="flex-none py-2 flex items-center justify-center gap-1">
        {rituals.map((_, index) => (
          <button
            key={index}
            onClick={() => api?.scrollTo(index)}
            className={`h-1 rounded-full transition-all ${
              index === current - 1
                ? 'w-6 bg-primary'
                : 'w-1 bg-primary/30'
            }`}
            aria-label={`Go to ritual ${index + 1}`}
          />
        ))}
      </div>
      
      {/* Counter - Compact */}
      <div className="flex-none pb-1 text-center text-xs text-muted-foreground">
        {current} / {count}
      </div>
    </div>
  );
};
