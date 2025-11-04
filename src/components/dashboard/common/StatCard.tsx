import React from 'react';
import { cn } from '@/lib/utils';

export interface StatCardProps {
  label: string;
  value: string | number;
  className?: string;
  valueClassName?: string;
  labelClassName?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  className,
  valueClassName,
  labelClassName,
}) => {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <span className={cn('text-sm text-muted-foreground', labelClassName)}>
        {label}
      </span>
      <span className={cn('text-2xl font-semibold', valueClassName)}>
        {value}
      </span>
    </div>
  );
};

export default StatCard;
