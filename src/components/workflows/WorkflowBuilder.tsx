import React, { useState, useCallback } from "react";
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Background,
  Controls,
  MiniMap,
  Panel,
  ReactFlowProvider,
  Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { workflowServices } from "@/api/services";
import { Save, Play, X } from "lucide-react";

// Custom Node Components
import EndpointNode from "./nodes/EndpointNode";
import AuthenticationNode from "./nodes/AuthenticationNode";
import DataMappingNode from "./nodes/DataMappingNode";
import EnhancedConditionNode from "./nodes/EnhancedConditionNode";
import EnhancedEmailNode from "./nodes/EnhancedEmailNode";
import EndNode from "./nodes/EndNode";

const nodeTypes = {
  endpointNode: EndpointNode,
  authenticationNode: AuthenticationNode,
  dataMappingNode: DataMappingNode,
  enhancedConditionNode: EnhancedConditionNode,
  enhancedEmailNode: EnhancedEmailNode,
  endNode: EndNode,
};

const getInitialNodesForWorkflowType = (workflowType: string): Node[] => {
  if (workflowType === "vehicle_inbound") {
    return [
      {
        id: "endpoint-1",
        type: "endpointNode",
        position: { x: 100, y: 100 },
        data: {
          label: "Vehicle Inbound Endpoint",
          config: {},
        },
      },
      {
        id: "auth-1",
        type: "authenticationNode",
        position: { x: 400, y: 100 },
        data: {
          label: "Authentication",
          config: { type: "none" },
        },
      },
      {
        id: "mapping-1",
        type: "dataMappingNode",
        position: { x: 700, y: 100 },
        data: {
          label: "Data Mapping",
          config: { mappings: [], sample_json: "" },
        },
      },
      {
        id: "condition-1",
        type: "enhancedConditionNode",
        position: { x: 1000, y: 100 },
        data: {
          label: "Response Condition",
          config: {
            conditions: [
              {
                field: "response.status",
                operator: "equals",
                value: "200",
                logic: "AND",
              },
            ],
          },
        },
      },
      {
        id: "email-success-1",
        type: "enhancedEmailNode",
        position: { x: 1300, y: 50 },
        data: {
          label: "Success Email",
          config: {},
        },
      },
      {
        id: "email-error-1",
        type: "enhancedEmailNode",
        position: { x: 1300, y: 200 },
        data: {
          label: "Error Email",
          config: {},
        },
      },
      {
        id: "end-1",
        type: "endNode",
        position: { x: 1600, y: 100 },
        data: {
          label: "End Workflow",
        },
      },
    ];
  } 

};

const getInitialEdgesForWorkflowType = (workflowType: string): Edge[] => {
  if (workflowType === "vehicle_inbound") {
    return [
      { id: "e1-2", source: "endpoint-1", target: "auth-1" },
      { id: "e2-3", source: "auth-1", target: "mapping-1" },
      { id: "e3-4", source: "mapping-1", target: "condition-1" },
      {
        id: "e4-5",
        source: "condition-1",
        target: "email-success-1",
        sourceHandle: "true",
      },
      {
        id: "e4-6",
        source: "condition-1",
        target: "email-error-1",
        sourceHandle: "false",
      },
      { id: "e5-7", source: "email-success-1", target: "end-1" },
      { id: "e6-7", source: "email-error-1", target: "end-1" },
    ];
  }
  return [];
};

interface WorkflowBuilderProps {
  workflow?: any;
  onSave: () => void;
  onCancel: () => void;
}

const WorkflowBuilder: React.FC<WorkflowBuilderProps> = ({
  workflow,
  onSave,
  onCancel,
}) => {
  const [workflowType, setWorkflowType] = useState(
    workflow?.workflow_type || "vehicle_inbound"
  );
  const [nodes, setNodes, onNodesChange] = useNodesState(
    workflow?.flow_data?.nodes || getInitialNodesForWorkflowType(workflowType)
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    workflow?.flow_data?.edges || getInitialEdgesForWorkflowType(workflowType)
  );
  const [workflowName, setWorkflowName] = useState(workflow?.name || "");
  const [workflowDescription, setWorkflowDescription] = useState(
    workflow?.description || ""
  );

  const { toast } = useToast();

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  // Save workflow mutation
  const saveWorkflowMutation = useMutation({
    mutationFn: (data: any) => {
      if (workflow?._id) {
        return workflowServices.updateWorkflow(workflow._id, data);
      } else {
        return workflowServices.createWorkflow(data);
      }
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: workflow
          ? "Workflow updated successfully"
          : "Workflow created successfully",
      });
      onSave();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to save workflow",
        variant: "destructive",
      });
    },
  });

  // Test workflow mutation
  const testWorkflowMutation = useMutation({
    mutationFn: (data: any) =>
      workflowServices.testWorkflow(workflow?._id, data),
    onSuccess: (data) => {
      toast({
        title: "Test Result",
        description: data.data.validation_result.valid
          ? "Workflow configuration is valid"
          : `Validation errors: ${data.data.validation_result.errors.join(
              ", "
            )}`,
        variant: data.data.validation_result.valid ? "default" : "destructive",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to test workflow",
        variant: "destructive",
      });
    },
  });

  // Handle workflow type changes
  const handleWorkflowTypeChange = (newType: string) => {
    setWorkflowType(newType);
    setNodes(getInitialNodesForWorkflowType(newType));
    setEdges(getInitialEdgesForWorkflowType(newType));
  };

  const handleSave = () => {
    if (!workflowName.trim()) {
      toast({
        title: "Error",
        description: "Workflow name is required",
        variant: "destructive",
      });
      return;
    }

    const workflowData = {
      name: workflowName,
      description: workflowDescription,
      workflow_type: workflowType,
      flow_data: {
        nodes,
        edges,
        viewport: { x: 0, y: 0, zoom: 1 },
      },
      status: workflow?.status || "draft",
    };

    saveWorkflowMutation.mutate(workflowData);
  };

  const handleTest = () => {
    if (!workflow?._id) {
      toast({
        title: "Error",
        description: "Please save the workflow first before testing",
        variant: "destructive",
      });
      return;
    }

    testWorkflowMutation.mutate({
      test_payload: {
        vehicle_stock_id: 12345,
        make: "Toyota",
        model: "Camry",
        year: 2023,
      },
    });
  };

  return (
    <div className="h-[80vh] w-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b p-4 flex-shrink-0">
        <div className="flex justify-between items-start">
          <div className="flex-1 mr-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="workflow-name">Workflow Name</Label>
                <Input
                  id="workflow-name"
                  value={workflowName}
                  onChange={(e) => setWorkflowName(e.target.value)}
                  placeholder="Enter workflow name..."
                />
              </div>
              <div>
                <Label htmlFor="workflow-type">Workflow Type</Label>
                <Select
                  value={workflowType}
                  onValueChange={handleWorkflowTypeChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vehicle_inbound">
                      Vehicle Inbound
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="workflow-description">Description</Label>
                <Input
                  id="workflow-description"
                  value={workflowDescription}
                  onChange={(e) => setWorkflowDescription(e.target.value)}
                  placeholder="Enter description..."
                />
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {workflow?._id && (
              <Button
                variant="outline"
                onClick={handleTest}
                disabled={testWorkflowMutation.isPending}
              >
                <Play className="w-4 h-4 mr-2" />
                Test
              </Button>
            )}
            <Button
              onClick={handleSave}
              disabled={saveWorkflowMutation.isPending}
            >
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
            <Button variant="outline" onClick={onCancel}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
          </div>
        </div>
      </div>

      {/* Flow Canvas */}
      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          nodesDraggable={true}
          nodesConnectable={true}
          elementsSelectable={true}
        >
          <Controls />
          <MiniMap />
          <Background gap={12} size={1} />
          <Panel position="top-right">
            <div className="bg-background border rounded p-2">
              <Badge variant="outline">
                {nodes.length} nodes, {edges.length} connections
              </Badge>
            </div>
          </Panel>
        </ReactFlow>
      </div>
    </div>
  );
};

const WorkflowBuilderWrapper: React.FC<WorkflowBuilderProps> = (props) => (
  <ReactFlowProvider>
    <WorkflowBuilder {...props} />
  </ReactFlowProvider>
);

export default WorkflowBuilderWrapper;
