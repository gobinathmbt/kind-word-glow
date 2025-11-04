import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';

export interface StackedBarChartData {
  [key: string]: string | number;
}

export interface StackedBarChartProps {
  data: StackedBarChartData[];
  xAxisKey: string;
  series: Array<{
    dataKey: string;
    name: string;
    color?: string;
  }>;
  height?: number;
  showLegend?: boolean;
  showGrid?: boolean;
}

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

export const StackedBarChart: React.FC<StackedBarChartProps> = ({
  data,
  xAxisKey,
  series,
  height = 300,
  showLegend = true,
  showGrid = true,
}) => {
  const chartConfig = series.reduce((acc, item, index) => {
    acc[item.dataKey] = {
      label: item.name,
      color: item.color || COLORS[index % COLORS.length],
    };
    return acc;
  }, {} as any);

  return (
    <ChartContainer config={chartConfig} className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />}
          <XAxis
            dataKey={xAxisKey}
            tick={{ fill: 'hsl(var(--muted-foreground))' }}
            tickLine={{ stroke: 'hsl(var(--border))' }}
          />
          <YAxis
            tick={{ fill: 'hsl(var(--muted-foreground))' }}
            tickLine={{ stroke: 'hsl(var(--border))' }}
          />
          <Tooltip content={<ChartTooltipContent />} />
          {showLegend && <Legend />}
          {series.map((s, index) => (
            <Bar
              key={s.dataKey}
              dataKey={s.dataKey}
              stackId="a"
              fill={s.color || COLORS[index % COLORS.length]}
              animationBegin={0}
              animationDuration={800}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
};

export default StackedBarChart;
