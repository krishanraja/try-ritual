import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface MobileViewportProps {
  children: ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export const MobileViewport = ({ children, header, footer, className }: MobileViewportProps) => {
  return (
    <div className={cn("h-screen-mobile flex flex-col overflow-hidden", className)}>
      {header && <div className="flex-none">{header}</div>}
      <div className="flex-1 overflow-hidden">{children}</div>
      {footer && <div className="flex-none">{footer}</div>}
    </div>
  );
};
