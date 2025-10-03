import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Send } from 'lucide-react';

const WebhookNode = ({ data, isConnectable }: any) => {
  return (
    <Card className="w-64 border-2 border-orange-500 shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Send className="w-4 h-4 text-orange-600" />
          {data.label}
          <Badge variant="outline" className="ml-auto">
            Webhook
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-xs text-muted-foreground">
          {data.config?.url ? `POST ${data.config.url}` : 'Configure webhook URL'}
        </div>
        {data.config?.method && (
          <div className="mt-1 text-xs">
            <strong>Method:</strong> {data.config.method.toUpperCase()}
          </div>
        )}
        {data.config?.authentication && (
          <div className="mt-1 text-xs">
            <strong>Auth:</strong> {data.config.authentication.type}
          </div>
        )}
      </CardContent>
      
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={isConnectable}
        className="w-3 h-3 !bg-orange-500"
      />
      <Handle
        type="source"
        position={Position.Right}
        isConnectable={isConnectable}
        className="w-3 h-3 !bg-orange-500"
      />
    </Card>
  );
};

export default WebhookNode;