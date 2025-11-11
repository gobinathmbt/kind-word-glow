import React from 'react';
import { cn } from '@/lib/utils';

interface DashboardContainerProps {
  children: React.ReactNode;
  className?: string;
}

export const DashboardContainer: React.FC<DashboardContainerProps> = ({ children, className }) => {
  return (
    <div className={cn("space-y-8 p-6", className)}>
      {children}
    </div>
  );
};
