import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Play } from 'lucide-react';

const StartNode = ({ data, isConnectable }: any) => {
  return (
    <Card className="w-64 border-2 border-green-500 shadow-lg bg-green-50/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Play className="w-4 h-4 text-green-600" />
          {data.label}
          <Badge variant="outline" className="ml-auto bg-green-100">
            Start
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-xs text-muted-foreground">
          Workflow trigger point
        </div>
      </CardContent>
      
      {/* Source handle - connects TO other nodes */}
      <Handle
        type="source"
        position={Position.Right}
        isConnectable={isConnectable}
        className="w-3 h-3 !bg-green-500"
        id="start-output"
      />
    </Card>
  );
};

export default StartNode;