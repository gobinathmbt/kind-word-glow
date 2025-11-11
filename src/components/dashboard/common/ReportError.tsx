import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ReportErrorProps {
  message?: string;
  onRetry?: () => void;
  className?: string;
  showRetry?: boolean;
}

export const ReportError: React.FC<ReportErrorProps> = ({
  message = 'Failed to load report data. Please try again.',
  onRetry,
  className,
  showRetry = true,
}) => {
  return (
    <Card className={cn('w-full', className)}>
      <CardContent className="py-12">
        <div className="flex flex-col items-center justify-center text-center space-y-4">
          <div className="rounded-full bg-destructive/10 p-4">
            <AlertCircle className="h-10 w-10 text-destructive" />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Error Loading Report</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              {message}
            </p>
          </div>

          {showRetry && onRetry && (
            <Button onClick={onRetry} variant="outline" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ReportError;
