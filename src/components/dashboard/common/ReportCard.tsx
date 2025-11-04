import React, { ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, BarChart3, Table2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ViewMode = 'chart' | 'table';

export interface ReportCardProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  loading?: boolean;
  error?: string | null;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
  showViewToggle?: boolean;
}

export const ReportCard: React.FC<ReportCardProps> = ({
  title,
  subtitle,
  icon,
  loading = false,
  error = null,
  actions,
  children,
  className,
  viewMode = 'chart',
  onViewModeChange,
  showViewToggle = false,
}) => {
  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            {icon && (
              <div className="mt-1 text-muted-foreground">
                {icon}
              </div>
            )}
            <div className="flex-1">
              <CardTitle className="text-xl">{title}</CardTitle>
              {subtitle && (
                <CardDescription className="mt-1.5">
                  {subtitle}
                </CardDescription>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {showViewToggle && onViewModeChange && (
              <div className="flex items-center border rounded-md">
                <Button
                  variant={viewMode === 'chart' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => onViewModeChange('chart')}
                  className="rounded-r-none"
                >
                  <BarChart3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => onViewModeChange('table')}
                  className="rounded-l-none"
                >
                  <Table2 className="h-4 w-4" />
                </Button>
              </div>
            )}
            {actions}
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {loading ? (
          <ReportCardSkeleton />
        ) : error ? (
          <ReportCardError message={error} />
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
};

const ReportCardSkeleton: React.FC = () => {
  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  );
};

const ReportCardError: React.FC<{ message: string }> = ({ message }) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <AlertCircle className="h-12 w-12 text-destructive mb-4" />
      <p className="text-sm text-muted-foreground max-w-md">
        {message}
      </p>
    </div>
  );
};

export default ReportCard;
