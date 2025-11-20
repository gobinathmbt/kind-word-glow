import React from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface RefreshButtonProps {
  onRefresh: () => void | Promise<void>;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export const RefreshButton: React.FC<RefreshButtonProps> = ({
  onRefresh,
  loading = false,
  disabled = false,
  className,
  size = 'sm',
}) => {
  return (
    <Button
      variant="outline"
      size={size}
      onClick={onRefresh}
      disabled={disabled || loading}
      className={cn('gap-1.5 sm:gap-2 w-full xs:w-auto h-9 text-xs sm:text-sm px-3 sm:px-4', className)}
    >
      <RefreshCw className={cn('h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0', loading && 'animate-spin')} />
      <span className="truncate">
        {loading ? 'Refreshing...' : 'Refresh'}
      </span>
    </Button>
  );
};

export default RefreshButton;
