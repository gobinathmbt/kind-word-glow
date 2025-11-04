import React from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GlobalActionsProps {
  onRefresh: () => void;
  loading?: boolean;
}

export const GlobalActions: React.FC<GlobalActionsProps> = ({ onRefresh, loading = false }) => {
  return (
    <div className="flex items-center gap-2">
      <Button 
        onClick={onRefresh} 
        disabled={loading}
        variant="outline"
        size="sm"
      >
        <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
        {loading ? 'Refreshing...' : 'Refresh All'}
      </Button>
    </div>
  );
};
