import { Handle, Position } from "@xyflow/react";
import { Card } from "@/components/ui/card";

const EndpointNode = ({ data, isConnectable, id, onDataUpdate }: any) => {
  return (
    <>
      <Card className="w-80 border-2 border-green-500 shadow-lg bg-green-50/50">
        {/* Source handle - sends connection TO next node */}
        <Handle
          type="source"
          position={Position.Right}
          isConnectable={isConnectable}
          className="w-3 h-3 !bg-green-500"
          id="endpoint-output"
        />
      </Card>
    </>
  );
};

export default EndpointNode;
