import React, { useState, useCallback, useMemo } from "react";
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
  Position,
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
import StartNode from "./nodes/StartNode";
import AuthenticationNode from "./nodes/AuthenticationNode";
import DataMappingNode from "./nodes/DataMappingNode";
import EnhancedConditionNode from "./nodes/EnhancedConditionNode";
import EnhancedEmailNode from "./nodes/EnhancedEmailNode";
import EndNode from "./nodes/EndNode";

// Enhanced edge styles
const edgeStyles = {
  default: {
    stroke: "#3b82f6",
    strokeWidth: 3,
    strokeDasharray: "0",
  },
  conditional: {
    true: {
      stroke: "#10b981",
      strokeWidth: 3,
      strokeDasharray: "0",
    },
    false: {
      stroke: "#ef4444",
      strokeWidth: 3,
      strokeDasharray: "0",
    },
  },
};

const getInitialNodesForWorkflowType = (workflowType: string): Node[] => {
  if (workflowType === "vehicle_inbound") {
    return [
      {
        id: "start-1",
        type: "startNode",
        position: { x: 50, y: 100 },
        data: {
          label: "Start Workflow",
        },
        sourcePosition: Position.Right,
      },
      {
        id: "auth-1",
        type: "authenticationNode",
        position: { x: 300, y: 100 },
        data: {
          label: "Authentication",
          config: { type: "none" },
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      },
      {
        id: "mapping-1",
        type: "dataMappingNode",
        position: { x: 550, y: 100 },
        data: {
          label: "Data Mapping",
          config: { mappings: [], sample_json: "" },
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      },
      {
        id: "condition-1",
        type: "enhancedConditionNode",
        position: { x: 800, y: 100 },
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
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      },
      {
        id: "email-success-1",
        type: "enhancedEmailNode",
        position: { x: 1050, y: 50 },
        data: {
          label: "Success Email",
          config: {},
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      },
      {
        id: "email-error-1",
        type: "enhancedEmailNode",
        position: { x: 1050, y: 150 },
        data: {
          label: "Error Email",
          config: {},
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      },
      {
        id: "end-1",
        type: "endNode",
        position: { x: 1300, y: 100 },
        data: {
          label: "End Workflow",
        },
        targetPosition: Position.Left,
      },
    ];
  }
  return [];
};

const getInitialEdgesForWorkflowType = (workflowType: string): Edge[] => {
  if (workflowType === "vehicle_inbound") {
    return [
      { 
        id: "e1-2", 
        source: "start-1", 
        target: "auth-1",
        style: edgeStyles.default,
        type: 'smoothstep',
      },
      { 
        id: "e2-3", 
        source: "auth-1", 
        target: "mapping-1",
        style: edgeStyles.default,
        type: 'smoothstep',
      },
      { 
        id: "e3-4", 
        source: "mapping-1", 
        target: "condition-1",
        style: edgeStyles.default,
        type: 'smoothstep',
      },
      {
        id: "e4-5",
        source: "condition-1",
        target: "email-success-1",
        sourceHandle: "true",
        style: edgeStyles.conditional.true,
        type: 'smoothstep',
        label: "Success",
        labelStyle: { fill: '#10b981', fontWeight: 600 },
      },
      {
        id: "e4-6",
        source: "condition-1",
        target: "email-error-1",
        sourceHandle: "false",
        style: edgeStyles.conditional.false,
        type: 'smoothstep',
        label: "Error",
        labelStyle: { fill: '#ef4444', fontWeight: 600 },
      },
      { 
        id: "e5-7", 
        source: "email-success-1", 
        target: "end-1",
        style: edgeStyles.default,
        type: 'smoothstep',
      },
      { 
        id: "e6-7", 
        source: "email-error-1", 
        target: "end-1",
        style: edgeStyles.default,
        type: 'smoothstep',
      },
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
  
  // Use workflow nodes/edges as-is if they exist, otherwise get initial template
  const initialNodes = useMemo(() => {
    if (workflow?.flow_data?.nodes && workflow.flow_data.nodes.length > 0) {
      return workflow.flow_data.nodes;
    }
    return getInitialNodesForWorkflowType(workflowType);
  }, [workflow]);

  const initialEdges = useMemo(() => {
    if (workflow?.flow_data?.edges && workflow.flow_data.edges.length > 0) {
      return workflow.flow_data.edges;
    }
    return getInitialEdgesForWorkflowType(workflowType);
  }, [workflow]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  
  const [workflowName, setWorkflowName] = useState(workflow?.name || "");
  const [workflowDescription, setWorkflowDescription] = useState(
    workflow?.description || ""
  );

  const { toast } = useToast();

  const onConnect = useCallback(
    (params: Connection) => {
      const newEdge = {
        ...params,
        style: edgeStyles.default,
        type: 'smoothstep' as const,
      };
      setEdges((eds) => addEdge(newEdge, eds));
    },
    [setEdges]
  );

  // Handle node data updates
  const handleNodeDataUpdate = useCallback((nodeId: string, newData: any) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              ...newData,
            },
          };
        }
        return node;
      })
    );
  }, [setNodes]);

  const enhancedNodeTypes = useMemo(() => ({
    startNode: (props: any) => <StartNode {...props} onDataUpdate={handleNodeDataUpdate} />,
    authenticationNode: (props: any) => <AuthenticationNode {...props} onDataUpdate={handleNodeDataUpdate} />,
    dataMappingNode: (props: any) => <DataMappingNode {...props} onDataUpdate={handleNodeDataUpdate} />,
    enhancedConditionNode: (props: any) => <EnhancedConditionNode {...props} onDataUpdate={handleNodeDataUpdate} />,
    enhancedEmailNode: (props: any) => <EnhancedEmailNode {...props} onDataUpdate={handleNodeDataUpdate} />,
    endNode: (props: any) => <EndNode {...props} onDataUpdate={handleNodeDataUpdate} />,
  }), [handleNodeDataUpdate]);

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

  // Handle workflow type changes - only reset layout when explicitly changing type
  const handleWorkflowTypeChange = (newType: string) => {
    if (newType === workflowType) return;
    
    setWorkflowType(newType);
    const newNodes = getInitialNodesForWorkflowType(newType);
    const newEdges = getInitialEdgesForWorkflowType(newType);
    setNodes(newNodes);
    setEdges(newEdges);
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

    // Save nodes with their current positions - no reorganization
    const workflowData = {
      name: workflowName,
      description: workflowDescription,
      workflow_type: workflowType,
      flow_data: {
        nodes: nodes.map(node => ({
          ...node,
          data: {
            ...node.data,
            config: node.data?.config || {}
          }
        })),
        edges,
        viewport: { x: 0, y: 0, zoom: 1 },
      },
      status: workflow?.status || "draft",
    };

    console.log("Final workflow data:", workflowData);
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
    <div className="h-[85vh] w-full flex flex-col bg-background">
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
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={enhancedNodeTypes}
          fitView
          fitViewOptions={{
            padding: 0.2,
            includeHiddenNodes: false,
            maxZoom: 1,
          }}
          nodesDraggable={true}
          nodesConnectable={true}
          elementsSelectable={true}
          defaultEdgeOptions={{
            type: 'smoothstep',
            style: edgeStyles.default,
          }}
          minZoom={0.2}
          maxZoom={2}
          className="bg-gray-50"
        >
          <Controls />
          <MiniMap 
            nodeStrokeColor="#1e40af"
            nodeColor="#dbeafe"
            maskColor="#f8fafc"
          />
          <Background 
            gap={25} 
            size={1} 
            color="#6b7280"
          />
          <Panel position="top-right">
            <div className="bg-background border rounded p-2 shadow-sm">
              <Badge variant="outline" className="bg-blue-50">
                {nodes.length} nodes, {edges.length} connections
              </Badge>
            </div>
          </Panel>
        </ReactFlow>
      </div>
    </div>
  );
};

// Enhanced wrapper to provide node update functionality
const WorkflowBuilderWrapper: React.FC<WorkflowBuilderProps> = (props) => {
  return (
    <ReactFlowProvider>
      <WorkflowBuilder {...props} />
    </ReactFlowProvider>
  );
};

export default WorkflowBuilderWrapper;