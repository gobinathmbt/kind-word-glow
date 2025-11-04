import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TrendIndicatorProps {
  value: number;
  isPositive?: boolean;
  showIcon?: boolean;
  className?: string;
}

export const TrendIndicator: React.FC<TrendIndicatorProps> = ({
  value,
  isPositive,
  showIcon = true,
  className,
}) => {
  const isUp = isPositive !== undefined ? isPositive : value > 0;
  const absValue = Math.abs(value);

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 text-sm font-medium',
        isUp ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400',
        className
      )}
    >
      {showIcon && (
        isUp ? (
          <TrendingUp className="h-4 w-4" />
        ) : (
          <TrendingDown className="h-4 w-4" />
        )
      )}
      <span>{absValue.toFixed(1)}%</span>
    </div>
  );
};

export default TrendIndicator;
