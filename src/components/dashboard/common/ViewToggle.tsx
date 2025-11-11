import React from 'react';
import { Button } from '@/components/ui/button';
import { BarChart3, Table2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ViewMode = 'chart' | 'table';

export interface ViewToggleProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
  disabled?: boolean;
  className?: string;
}

export const ViewToggle: React.FC<ViewToggleProps> = ({
  value,
  onChange,
  disabled = false,
  className,
}) => {
  return (
    <div className={cn('inline-flex items-center border rounded-md', className)}>
      <Button
        variant={value === 'chart' ? 'secondary' : 'ghost'}
        size="sm"
        onClick={() => onChange('chart')}
        disabled={disabled}
        className="rounded-r-none"
      >
        <BarChart3 className="h-4 w-4" />
      </Button>
      <Button
        variant={value === 'table' ? 'secondary' : 'ghost'}
        size="sm"
        onClick={() => onChange('table')}
        disabled={disabled}
        className="rounded-l-none"
      >
        <Table2 className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default ViewToggle;
