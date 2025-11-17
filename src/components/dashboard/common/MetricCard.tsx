import React, { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { TrendIndicator } from './TrendIndicator';

export interface MetricCardProps {
    title: string;
    value: string | number;
    icon?: ReactNode;
    trend?: {
        value: number;
        isPositive?: boolean;
    };
    subtitle?: string;
    onClick?: () => void;
    className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
    title,
    value,
    icon,
    trend,
    subtitle,
    onClick,
    className,
}) => {
    return (
        <Card
            className={cn(
                'transition-all',
                onClick && 'cursor-pointer hover:shadow-md hover:border-primary/50',
                className
            )}
            onClick={onClick}
        >
            <CardContent className="p-6">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0 overflow-hidden">
                        <p className="text-sm font-medium text-muted-foreground mb-2">
                            {title}
                        </p>
                        <div className="flex items-baseline gap-2 flex-wrap">
                            <h3 className="text-3xl font-bold tracking-tight break-words" style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                                {value}
                            </h3>
                            {trend && (
                                <TrendIndicator
                                    value={trend.value}
                                    isPositive={trend.isPositive}
                                />
                            )}
                        </div>
                        {subtitle && (
                            <p className="text-xs text-muted-foreground mt-2">
                                {subtitle}
                            </p>
                        )}
                    </div>
                    {icon && (
                        <div className="text-muted-foreground flex-shrink-0">
                            {icon}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

export default MetricCard;
