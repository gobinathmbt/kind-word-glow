import React from 'react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export interface HeatMapCell {
  x: string | number;
  y: string | number;
  value: number;
  label?: string;
}

export interface HeatMapProps {
  data: HeatMapCell[];
  xLabels: (string | number)[];
  yLabels: (string | number)[];
  minValue?: number;
  maxValue?: number;
  colorScale?: {
    low: string;
    mid: string;
    high: string;
  };
  height?: number;
  showValues?: boolean;
  onCellClick?: (cell: HeatMapCell) => void;
}

const defaultColorScale = {
  low: 'hsl(var(--chart-1))',
  mid: 'hsl(var(--chart-3))',
  high: 'hsl(var(--chart-5))',
};

export const HeatMap: React.FC<HeatMapProps> = ({
  data,
  xLabels,
  yLabels,
  minValue,
  maxValue,
  colorScale = defaultColorScale,
  height = 400,
  showValues = true,
  onCellClick,
}) => {
  const min = minValue ?? Math.min(...data.map(d => d.value));
  const max = maxValue ?? Math.max(...data.map(d => d.value));

  const getColor = (value: number): string => {
    const normalized = (value - min) / (max - min);
    
    if (normalized < 0.5) {
      const ratio = normalized * 2;
      return interpolateColor(colorScale.low, colorScale.mid, ratio);
    } else {
      const ratio = (normalized - 0.5) * 2;
      return interpolateColor(colorScale.mid, colorScale.high, ratio);
    }
  };

  const interpolateColor = (color1: string, color2: string, ratio: number): string => {
    // Simple interpolation - in production, use a proper color library
    const opacity = 0.2 + (ratio * 0.8);
    return `${color2}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`;
  };

  const getCellData = (x: string | number, y: string | number): HeatMapCell | undefined => {
    return data.find(cell => cell.x === x && cell.y === y);
  };

  return (
    <div className="w-full overflow-x-auto" style={{ height }}>
      <div className="inline-block min-w-full">
        <div className="grid gap-1" style={{ gridTemplateColumns: `auto repeat(${xLabels.length}, 1fr)` }}>
          {/* Header row */}
          <div className="p-2" />
          {xLabels.map((label, idx) => (
            <div key={idx} className="p-2 text-xs font-medium text-center text-muted-foreground">
              {label}
            </div>
          ))}

          {/* Data rows */}
          {yLabels.map((yLabel, yIdx) => (
            <React.Fragment key={yIdx}>
              <div className="p-2 text-xs font-medium text-right text-muted-foreground">
                {yLabel}
              </div>
              {xLabels.map((xLabel, xIdx) => {
                const cellData = getCellData(xLabel, yLabel);
                const value = cellData?.value ?? 0;
                const bgColor = getColor(value);

                return (
                  <TooltipProvider key={xIdx}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          className={cn(
                            'p-2 rounded text-xs font-medium text-center transition-all',
                            onCellClick && 'cursor-pointer hover:ring-2 hover:ring-primary'
                          )}
                          style={{ backgroundColor: bgColor }}
                          onClick={() => cellData && onCellClick?.(cellData)}
                        >
                          {showValues && value > 0 ? value : ''}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="text-xs">
                          <div className="font-medium">{cellData?.label || `${xLabel} × ${yLabel}`}</div>
                          <div className="text-muted-foreground">Value: {value}</div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HeatMap;
