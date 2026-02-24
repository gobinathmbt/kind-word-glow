import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, AlertCircle } from 'lucide-react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface KanbanItem {
  _id: string;
  tender_id?: string;
  order_id?: string;
  quote_status?: string;
  order_status?: string;
  customer_info?: {
    name: string;
  };
  basic_vehicle_info?: {
    make: string;
    model: string;
  };
  tender_expiry_time?: string;
  price?: number;
  created_at?: string;
  updated_at?: string;
}

export interface KanbanStatus {
  id: string;
  label: string;
  color: string;
  bgColor: string;
  items: KanbanItem[];
}

interface KanbanBoardProps {
  statuses: KanbanStatus[];
  onItemClick?: (item: KanbanItem) => void;
  isLoading?: boolean;
  type: 'quotes' | 'orders';
}

const getStatusColor = (color: string) => {
  const colors: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    green: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    red: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    purple: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    pink: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
  };
  return colors[color] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
};

const KanbanCard: React.FC<{
  item: KanbanItem;
  onView?: () => void;
  type: 'quotes' | 'orders';
}> = ({ item, onView, type }) => {
  const title = type === 'quotes' ? item.tender_id : item.order_id;
  const customer = item.customer_info?.name || 'Unknown';
  const vehicle = item.basic_vehicle_info
    ? `${item.basic_vehicle_info.make} ${item.basic_vehicle_info.model}`
    : 'N/A';

  const expiryDate = item.tender_expiry_time
    ? new Date(item.tender_expiry_time).toLocaleDateString()
    : item.created_at
    ? new Date(item.created_at).toLocaleDateString()
    : '';

  return (
    <Card className="p-3 bg-card hover:shadow-md transition-all cursor-pointer group">
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <p className="font-medium text-sm text-foreground truncate group-hover:text-primary">
              {title}
            </p>
            <p className="text-xs text-muted-foreground truncate">{customer}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={onView}
          >
            <Eye className="h-3 w-3" />
          </Button>
        </div>

        <p className="text-xs text-muted-foreground line-clamp-1">{vehicle}</p>

        <div className="flex items-center justify-between pt-1">
          {item.price && (
            <span className="text-xs font-medium text-foreground">
              ₹{item.price.toLocaleString()}
            </span>
          )}
          {expiryDate && (
            <span className="text-xs text-muted-foreground">{expiryDate}</span>
          )}
        </div>
      </div>
    </Card>
  );
};

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  statuses,
  onItemClick,
  isLoading,
  type,
}) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <ScrollArea className="w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 p-4">
        {statuses.map((status) => (
          <div key={status.id} className="flex flex-col space-y-3">
            {/* Column Header */}
            <div className="sticky top-0 bg-background z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className={`h-3 w-3 rounded-full ${status.bgColor}`}
                  ></div>
                  <h3 className="font-semibold text-sm text-foreground">
                    {status.label}
                  </h3>
                </div>
                <Badge variant="outline" className="text-xs">
                  {status.items.length}
                </Badge>
              </div>
              <div className="mt-2 h-0.5 bg-border rounded-full opacity-50"></div>
            </div>

            {/* Items */}
            <div className="space-y-2 min-h-96">
              {status.items.length > 0 ? (
                status.items.map((item) => (
                  <KanbanCard
                    key={item._id}
                    item={item}
                    onView={() => onItemClick?.(item)}
                    type={type}
                  />
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                  <AlertCircle className="h-6 w-6 mb-2 opacity-50" />
                  <p className="text-xs text-center">No items</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
};
