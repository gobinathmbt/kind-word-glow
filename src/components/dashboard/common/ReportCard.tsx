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
      <CardHeader className="p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0">
            {icon && (
              <div className="mt-0.5 sm:mt-1 text-muted-foreground flex-shrink-0">
                {icon}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base sm:text-lg md:text-xl truncate">{title}</CardTitle>
              {subtitle && (
                <CardDescription className="mt-1 sm:mt-1.5 text-xs sm:text-sm line-clamp-2">
                  {subtitle}
                </CardDescription>
              )}
            </div>
          </div>
          
          <div className="flex flex-col xs:flex-row items-stretch xs:items-center gap-2 sm:flex-shrink-0">
            {showViewToggle && onViewModeChange && (
              <div className="flex items-center border rounded-md w-full xs:w-auto">
                <Button
                  variant={viewMode === 'chart' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => onViewModeChange('chart')}
                  className="rounded-r-none flex-1 xs:flex-none h-9"
                >
                  <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="ml-2 text-xs sm:text-sm">Chart</span>
                </Button>
                <Button
                  variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => onViewModeChange('table')}
                  className="rounded-l-none flex-1 xs:flex-none h-9"
                >
                  <Table2 className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="ml-2 text-xs sm:text-sm">Table</span>
                </Button>
              </div>
            )}
            {actions}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-4 sm:p-6">
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
    <div className="space-y-3 sm:space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <Skeleton className="h-20 sm:h-24 w-full" />
        <Skeleton className="h-20 sm:h-24 w-full" />
        <Skeleton className="h-20 sm:h-24 w-full" />
      </div>
      <Skeleton className="h-48 sm:h-64 w-full" />
    </div>
  );
};

const ReportCardError: React.FC<{ message: string }> = ({ message }) => {
  return (
    <div className="flex flex-col items-center justify-center py-8 sm:py-12 text-center px-4">
      <AlertCircle className="h-10 w-10 sm:h-12 sm:w-12 text-destructive mb-3 sm:mb-4" />
      <p className="text-xs sm:text-sm text-muted-foreground max-w-md">
        {message}
      </p>
    </div>
  );
};

export default ReportCard;
