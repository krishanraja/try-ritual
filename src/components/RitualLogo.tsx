import ritualLogoFull from '@/assets/ritual-logo-full.png';
import ritualIcon from '@/assets/ritual-icon.png';
import { cn } from '@/lib/utils';

interface RitualLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  variant?: 'full' | 'icon';
  className?: string;
}

const sizeConfig = {
  xs: { class: 'max-h-6', width: 24, height: 24 },
  sm: { class: 'max-h-8', width: 32, height: 32 },
  md: { class: 'max-h-16', width: 64, height: 64 },
  lg: { class: 'max-h-20', width: 80, height: 80 },
  xl: { class: 'max-h-24', width: 96, height: 96 },
  '2xl': { class: 'max-h-48', width: 192, height: 192 },
};

export function RitualLogo({ size = 'md', variant = 'full', className }: RitualLogoProps) {
  const src = variant === 'full' ? ritualLogoFull : ritualIcon;
  const config = sizeConfig[size];
  
  return (
    <img
      src={src}
      alt="Ritual"
      width={config.width}
      height={config.height}
      fetchPriority="high"
      className={cn('w-auto h-auto object-contain', config.class, className)}
    />
  );
}

export function RitualIcon({ size = 'sm', className }: Omit<RitualLogoProps, 'variant'>) {
  const config = sizeConfig[size];
  
  return (
    <img
      src={ritualIcon}
      alt="Ritual"
      width={config.width}
      height={config.height}
      className={cn('w-auto h-auto object-contain', config.class, className)}
    />
  );
}
