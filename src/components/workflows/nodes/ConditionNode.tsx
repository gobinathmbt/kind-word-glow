import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GitBranch } from 'lucide-react';

const ConditionNode = ({ data, isConnectable }: any) => {
  return (
    <Card className="w-64 border-2 border-yellow-500 shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-yellow-600" />
          {data.label}
          <Badge variant="outline" className="ml-auto">
            Condition
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-xs text-muted-foreground">
          {data.condition ? `If ${data.condition.field} ${data.condition.operator} ${data.condition.value}` : 'Configure condition'}
        </div>
        {data.config?.description && (
          <div className="mt-2 text-xs">
            <strong>Logic:</strong> {data.config.description}
          </div>
        )}
      </CardContent>
      
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={isConnectable}
        className="w-3 h-3 !bg-yellow-500"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="true"
        style={{ top: '40%' }}
        isConnectable={isConnectable}
        className="w-3 h-3 !bg-green-500"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="false"
        style={{ top: '60%' }}
        isConnectable={isConnectable}
        className="w-3 h-3 !bg-red-500"
      />
      
      {/* Labels for true/false outputs */}
      <div className="absolute -right-8 top-8 text-xs text-green-600 font-medium">TRUE</div>
      <div className="absolute -right-8 top-12 text-xs text-red-600 font-medium">FALSE</div>
    </Card>
  );
};

export default ConditionNode;