import React, { useState, useCallback, useEffect } from 'react';
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
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { workflowServices } from '@/api/services';
import { Save, Play, X, Plus } from 'lucide-react';

// Custom Node Components
import TriggerNode from './nodes/TriggerNode';
import ActionNode from './nodes/ActionNode';
import ConditionNode from './nodes/ConditionNode';
import EmailNode from './nodes/EmailNode';
import WebhookNode from './nodes/WebhookNode';
import EndpointNode from './nodes/EndpointNode';
import AuthenticationNode from './nodes/AuthenticationNode';
import DataMappingNode from './nodes/DataMappingNode';
import EnhancedConditionNode from './nodes/EnhancedConditionNode';
import EnhancedEmailNode from './nodes/EnhancedEmailNode';
import EndNode from './nodes/EndNode';

const nodeTypes = {
  triggerNode: TriggerNode,
  actionNode: ActionNode,
  conditionNode: ConditionNode,
  emailNode: EmailNode,
  webhookNode: WebhookNode,
  endpointNode: EndpointNode,
  authenticationNode: AuthenticationNode,
  dataMappingNode: DataMappingNode,
  enhancedConditionNode: EnhancedConditionNode,
  enhancedEmailNode: EnhancedEmailNode,
  endNode: EndNode,
};

const getInitialNodesForWorkflowType = (workflowType: string): Node[] => {
  if (workflowType === 'vehicle_inbound') {
    return [
      {
        id: 'endpoint-1',
        type: 'endpointNode',
        position: { x: 100, y: 100 },
        data: {
          label: 'Vehicle Inbound Endpoint',
          config: {}
        }
      },
      {
        id: 'auth-1',
        type: 'authenticationNode',
        position: { x: 400, y: 100 },
        data: {
          label: 'Authentication',
          config: { type: 'none' }
        }
      },
      {
        id: 'mapping-1',
        type: 'dataMappingNode',
        position: { x: 700, y: 100 },
        data: {
          label: 'Data Mapping',
          config: { mappings: [], sample_json: '' }
        }
      },
      {
        id: 'condition-1',
        type: 'enhancedConditionNode',
        position: { x: 1000, y: 100 },
        data: {
          label: 'Response Condition',
          config: { 
            conditions: [{ 
              field: 'response.status', 
              operator: 'equals', 
              value: '200',
              logic: 'AND'
            }] 
          }
        }
      },
      {
        id: 'email-success-1',
        type: 'enhancedEmailNode',
        position: { x: 1300, y: 50 },
        data: {
          label: 'Success Email',
          config: {}
        }
      },
      {
        id: 'email-error-1',
        type: 'enhancedEmailNode',
        position: { x: 1300, y: 200 },
        data: {
          label: 'Error Email',
          config: {}
        }
      },
      {
        id: 'end-1',
        type: 'endNode',
        position: { x: 1600, y: 100 },
        data: {
          label: 'End Workflow'
        }
      }
    ];
  }
  
  // Default nodes for other workflow types
  return [
    {
      id: 'trigger-1',
      type: 'triggerNode',
      position: { x: 100, y: 100 },
      data: {
        label: 'Start Trigger',
        triggerType: workflowType,
        config: {}
      }
    }
  ];
};

const getInitialEdgesForWorkflowType = (workflowType: string): Edge[] => {
  if (workflowType === 'vehicle_inbound') {
    return [
      { id: 'e1-2', source: 'endpoint-1', target: 'auth-1' },
      { id: 'e2-3', source: 'auth-1', target: 'mapping-1' },
      { id: 'e3-4', source: 'mapping-1', target: 'condition-1' },
      { id: 'e4-5', source: 'condition-1', target: 'email-success-1', sourceHandle: 'true' },
      { id: 'e4-6', source: 'condition-1', target: 'email-error-1', sourceHandle: 'false' },
      { id: 'e5-7', source: 'email-success-1', target: 'end-1' },
      { id: 'e6-7', source: 'email-error-1', target: 'end-1' }
    ];
  }
  return [];
};

interface WorkflowBuilderProps {
  workflow?: any;
  onSave: () => void;
  onCancel: () => void;
}

const WorkflowBuilder: React.FC<WorkflowBuilderProps> = ({ workflow, onSave, onCancel }) => {
  const [workflowType, setWorkflowType] = useState(workflow?.workflow_type || 'vehicle_inbound');
  const [nodes, setNodes, onNodesChange] = useNodesState(
    workflow?.flow_data?.nodes || getInitialNodesForWorkflowType(workflowType)
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    workflow?.flow_data?.edges || getInitialEdgesForWorkflowType(workflowType)
  );
  const [workflowName, setWorkflowName] = useState(workflow?.name || '');
  const [workflowDescription, setWorkflowDescription] = useState(workflow?.description || '');
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  const { toast } = useToast();

  // Get vehicle schema fields for mapping
  const { data: vehicleFields } = useQuery({
    queryKey: ['vehicle-schema'],
    queryFn: () => workflowServices.getVehicleSchemaFields(),
  });

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

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
        description: workflow ? "Workflow updated successfully" : "Workflow created successfully",
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
    mutationFn: (data: any) => workflowServices.testWorkflow(workflow?._id, data),
    onSuccess: (data) => {
      toast({
        title: "Test Result",
        description: data.data.validation_result.valid 
          ? "Workflow configuration is valid" 
          : `Validation errors: ${data.data.validation_result.errors.join(', ')}`,
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

  const addNode = (type: string) => {
    const nodeId = `${type}-${Date.now()}`;
    let nodeData: any = {
      label: `${type.charAt(0).toUpperCase() + type.slice(1)} Node`,
      config: {}
    };

    // Set specific defaults based on node type
    if (type === 'authentication') {
      nodeData.config = { type: 'none' };
    } else if (type === 'dataMapping') {
      nodeData.config = { mappings: [], sample_json: '' };
    } else if (type === 'enhancedCondition') {
      nodeData.config = { 
        conditions: [{ 
          field: 'response.status', 
          operator: 'equals', 
          value: '200',
          logic: 'AND'
        }] 
      };
    }

    const newNode: Node = {
      id: nodeId,
      type: `${type}Node`,
      position: { x: Math.random() * 400 + 200, y: Math.random() * 400 + 100 },
      data: nodeData
    };
    setNodes((nds) => [...nds, newNode]);
  };

  const updateNodeData = (nodeId: string, newData: any) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId ? { ...node, data: { ...node.data, ...newData } } : node
      )
    );
  };

  // Handle workflow type changes
  const handleWorkflowTypeChange = (newType: string) => {
    setWorkflowType(newType);
    if (!workflow) { // Only reset nodes if creating new workflow
      setNodes(getInitialNodesForWorkflowType(newType));
      setEdges(getInitialEdgesForWorkflowType(newType));
    }
  };

  const deleteNode = (nodeId: string) => {
    setNodes((nds) => nds.filter((node) => node.id !== nodeId));
    setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
    if (selectedNode?.id === nodeId) {
      setSelectedNode(null);
    }
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
        viewport: { x: 0, y: 0, zoom: 1 }
      },
      status: workflow?.status || 'draft'
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
        year: 2023
      }
    });
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b p-4 space-y-4">
        <div className="flex justify-between items-start">
          <div className="space-y-2 flex-1 mr-4">
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
                <Select value={workflowType} onValueChange={handleWorkflowTypeChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vehicle_inbound">Vehicle Inbound</SelectItem>
                    <SelectItem value="vehicle_property_trigger">Property Trigger</SelectItem>
                    <SelectItem value="email_automation">Email Automation</SelectItem>
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

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Node Palette */}
        <div className="w-64 border-r p-4 space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Add Nodes</h3>
            {workflowType === 'vehicle_inbound' ? (
              <div className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addNode('endpoint')}
                  className="w-full justify-start"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Endpoint Node
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addNode('authentication')}
                  className="w-full justify-start"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Authentication Node
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addNode('dataMapping')}
                  className="w-full justify-start"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Data Mapping Node
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addNode('enhancedCondition')}
                  className="w-full justify-start"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Condition Node
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addNode('enhancedEmail')}
                  className="w-full justify-start"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Email Node
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addNode('end')}
                  className="w-full justify-start"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  End Node
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addNode('action')}
                  className="w-full justify-start"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Action Node
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addNode('condition')}
                  className="w-full justify-start"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Condition Node
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addNode('email')}
                  className="w-full justify-start"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Email Node
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addNode('webhook')}
                  className="w-full justify-start"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Webhook Node
                </Button>
              </div>
            )}
          </div>

          <Separator />

          {/* Node Properties */}
          {selectedNode && (
            <div>
              <h3 className="font-semibold mb-2">Node Properties</h3>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">{(selectedNode?.data as any)?.label || 'Node'}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <Label>Node ID</Label>
                    <Input value={selectedNode.id} disabled />
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteNode(selectedNode.id)}
                  >
                    Delete Node
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Flow Canvas */}
        <div className="flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            fitView
            onNodeDoubleClick={(event, node) => {
              // Handle node configuration on double click
              setSelectedNode(node);
            }}
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
    </div>
  );
};

const WorkflowBuilderWrapper: React.FC<WorkflowBuilderProps> = (props) => (
  <ReactFlowProvider>
    <WorkflowBuilder {...props} />
  </ReactFlowProvider>
);

export default WorkflowBuilderWrapper;