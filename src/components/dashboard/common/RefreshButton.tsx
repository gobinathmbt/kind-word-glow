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
      className={cn('gap-2', className)}
    >
      <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
      {loading ? 'Refreshing...' : 'Refresh'}
    </Button>
  );
};

export default RefreshButton;
