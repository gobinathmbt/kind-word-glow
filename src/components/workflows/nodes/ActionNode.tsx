import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Zap } from 'lucide-react';

const ActionNode = ({ data, isConnectable }: any) => {
  return (
    <Card className="w-64 border-2 border-blue-500 shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Zap className="w-4 h-4 text-blue-600" />
          {data.label}
          <Badge variant="outline" className="ml-auto">
            Action
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-xs text-muted-foreground">
          {data.actionType === 'create_vehicle' && 'Creates a new vehicle record'}
          {data.actionType === 'update_vehicle' && 'Updates existing vehicle'}
          {data.actionType === 'send_webhook' && 'Sends data to external webhook'}
          {!data.actionType && 'Configure action type'}
        </div>
        {data.config?.target_url && (
          <div className="mt-2 text-xs">
            <strong>Target:</strong> {data.config.target_url}
          </div>
        )}
      </CardContent>
      
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={isConnectable}
        className="w-3 h-3 !bg-blue-500"
      />
      <Handle
        type="source"
        position={Position.Right}
        isConnectable={isConnectable}
        className="w-3 h-3 !bg-blue-500"
      />
    </Card>
  );
};

export default ActionNode;