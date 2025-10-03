import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2 } from 'lucide-react';

const EndNode = ({ data, isConnectable }: any) => {
  return (
    <Card className="w-64 border-2 border-gray-500 shadow-lg bg-gray-50/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-gray-600" />
          {data.label}
          <Badge variant="outline" className="ml-auto bg-gray-100">
            End
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-xs text-muted-foreground">
          Workflow execution complete
        </div>
      </CardContent>
      
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={isConnectable}
        className="w-3 h-3 !bg-gray-500"
      />
    </Card>
  );
};

export default EndNode;