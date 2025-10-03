import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mail } from 'lucide-react';

const EmailNode = ({ data, isConnectable }: any) => {
  return (
    <Card className="w-64 border-2 border-purple-500 shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Mail className="w-4 h-4 text-purple-600" />
          {data.label}
          <Badge variant="outline" className="ml-auto">
            Email
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-xs text-muted-foreground">
          {data.config?.subject ? `Subject: ${data.config.subject}` : 'Configure email template'}
        </div>
        {data.config?.to_email && (
          <div className="mt-1 text-xs">
            <strong>To:</strong> {data.config.to_email}
          </div>
        )}
        {data.config?.from_email && (
          <div className="mt-1 text-xs">
            <strong>From:</strong> {data.config.from_email}
          </div>
        )}
      </CardContent>
      
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={isConnectable}
        className="w-3 h-3 !bg-purple-500"
      />
      <Handle
        type="source"
        position={Position.Right}
        isConnectable={isConnectable}
        className="w-3 h-3 !bg-purple-500"
      />
    </Card>
  );
};

export default EmailNode;