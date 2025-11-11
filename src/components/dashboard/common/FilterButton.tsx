import React from 'react';
import { Button } from '@/components/ui/button';
import { Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export interface FilterButtonProps {
  onClick: () => void;
  activeFiltersCount?: number;
  disabled?: boolean;
  className?: string;
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export const FilterButton: React.FC<FilterButtonProps> = ({
  onClick,
  activeFiltersCount = 0,
  disabled = false,
  className,
  size = 'sm',
}) => {
  return (
    <Button
      variant="outline"
      size={size}
      onClick={onClick}
      disabled={disabled}
      className={cn('gap-2 relative', className)}
    >
      <Filter className="h-4 w-4" />
      Filters
      {activeFiltersCount > 0 && (
        <Badge
          variant="secondary"
          className="ml-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
        >
          {activeFiltersCount}
        </Badge>
      )}
    </Button>
  );
};

export default FilterButton;
