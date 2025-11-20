import ritualLogo from '@/assets/ritual-logo.png';
import { cn } from '@/lib/utils';

interface RitualLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  xs: 'max-h-6',    // 24px height
  sm: 'max-h-8',    // 32px height
  md: 'max-h-16',   // 64px height
  lg: 'max-h-20',   // 80px height
  xl: 'max-h-24',   // 96px height
};

export function RitualLogo({ size = 'md', className }: RitualLogoProps) {
  return (
    <img
      src={ritualLogo}
      alt="Ritual"
      className={cn('w-auto h-auto object-contain', sizeClasses[size], className)}
    />
  );
}
