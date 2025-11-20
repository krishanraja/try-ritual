import { ReactNode } from 'react';

interface StrictMobileViewportProps {
  children: ReactNode;
}

export const StrictMobileViewport = ({ children }: StrictMobileViewportProps) => {
  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Content fills all available space, NO vertical scroll */}
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  );
};
