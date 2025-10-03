import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Play } from 'lucide-react';

const TriggerNode = ({ data, isConnectable }: any) => {
  return (
    <Card className="w-64 border-2 border-green-500 shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Play className="w-4 h-4 text-green-600" />
          {data.label}
          <Badge variant="outline" className="ml-auto">
            Trigger
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-xs text-muted-foreground">
          {data.triggerType === 'vehicle_inbound' && 'Receives incoming vehicle data'}
          {data.triggerType === 'vehicle_property_trigger' && 'Triggered by property changes'}
          {data.triggerType === 'email_automation' && 'Email-based automation trigger'}
        </div>
        {data.config?.endpoint_url && (
          <div className="mt-2 text-xs">
            <strong>Endpoint:</strong> {data.config.endpoint_url}
          </div>
        )}
      </CardContent>
      
      <Handle
        type="source"
        position={Position.Right}
        isConnectable={isConnectable}
        className="w-3 h-3 !bg-green-500"
      />
    </Card>
  );
};

export default TriggerNode;