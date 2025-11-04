import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface ComparisonChartData {
  name: string;
  value: number;
  percentage?: number;
  color?: string;
}

export interface ComparisonChartProps {
  data: ComparisonChartData[];
  height?: number;
  showPercentages?: boolean;
  sortable?: boolean;
  maxItems?: number;
}

type SortOrder = 'asc' | 'desc' | 'none';

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

export const ComparisonChart: React.FC<ComparisonChartProps> = ({
  data,
  height = 300,
  showPercentages = true,
  sortable = true,
  maxItems,
}) => {
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const sortedData = useMemo(() => {
    let result = [...data];
    
    if (sortOrder === 'asc') {
      result.sort((a, b) => a.value - b.value);
    } else if (sortOrder === 'desc') {
      result.sort((a, b) => b.value - a.value);
    }

    if (maxItems && result.length > maxItems) {
      result = result.slice(0, maxItems);
    }

    return result;
  }, [data, sortOrder, maxItems]);

  const toggleSort = () => {
    setSortOrder(prev => {
      if (prev === 'none') return 'desc';
      if (prev === 'desc') return 'asc';
      return 'none';
    });
  };

  const chartConfig = sortedData.reduce((acc, item, index) => {
    acc[item.name] = {
      label: item.name,
      color: item.color || COLORS[index % COLORS.length],
    };
    return acc;
  }, {} as any);

  const CustomLabel = (props: any) => {
    const { x, y, width, value, index } = props;
    const item = sortedData[index];
    
    if (!showPercentages || !item.percentage) return null;

    return (
      <text
        x={x + width + 5}
        y={y + 10}
        fill="hsl(var(--muted-foreground))"
        fontSize={12}
        textAnchor="start"
      >
        {item.percentage.toFixed(1)}%
      </text>
    );
  };

  return (
    <div className="space-y-2">
      {sortable && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleSort}
            className="gap-2"
          >
            <ArrowUpDown className="h-4 w-4" />
            Sort: {sortOrder === 'none' ? 'Default' : sortOrder === 'asc' ? 'Ascending' : 'Descending'}
          </Button>
        </div>
      )}
      
      <ChartContainer config={chartConfig} className="w-full" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={sortedData}
            layout="vertical"
            margin={{ top: 5, right: 60, left: 5, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
            <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              width={100}
            />
            <Tooltip content={<ChartTooltipContent />} />
            <Bar
              dataKey="value"
              label={<CustomLabel />}
              animationBegin={0}
              animationDuration={800}
            >
              {sortedData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color || COLORS[index % COLORS.length]}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  );
};

export default ComparisonChart;
