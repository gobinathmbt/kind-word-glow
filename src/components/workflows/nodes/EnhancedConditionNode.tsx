import React, { useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { GitBranch, Settings, Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const EnhancedConditionNode = ({ data, isConnectable, id, onDataUpdate }: any) => {
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [config, setConfig] = useState(data.config || { 
    conditions: [{ 
      field: 'response.status', 
      operator: 'equals', 
      value: '200',
      logic: 'AND'
    }] 
  });
  const { toast } = useToast();

  const operators = [
    { value: 'equals', label: 'Equals' },
    { value: 'not_equals', label: 'Not Equals' },
    { value: 'greater_than', label: 'Greater Than' },
    { value: 'less_than', label: 'Less Than' },
    { value: 'contains', label: 'Contains' },
    { value: 'not_contains', label: 'Does Not Contain' },
    { value: 'is_empty', label: 'Is Empty' },
    { value: 'is_not_empty', label: 'Is Not Empty' }
  ];

  const responseFields = [
    { value: 'response.status', label: 'Response Status' },
    { value: 'response.success', label: 'Response Success' },
    { value: 'response.error', label: 'Response Error' },
    { value: 'response.message', label: 'Response Message' },
    { value: 'processing.attempts', label: 'Processing Attempts' },
    { value: 'vehicle.created', label: 'Vehicle Created' },
    { value: 'custom.field', label: 'Custom Field' }
  ];

  const addCondition = () => {
    const newCondition = {
      field: 'response.status',
      operator: 'equals',
      value: '',
      logic: 'AND'
    };
    setConfig(prev => ({
      ...prev,
      conditions: [...prev.conditions, newCondition]
    }));
  };

  const removeCondition = (index: number) => {
    const updatedConditions = config.conditions.filter((_: any, i: number) => i !== index);
    setConfig(prev => ({ ...prev, conditions: updatedConditions }));
  };

  const updateCondition = (index: number, field: string, value: any) => {
    const updatedConditions = [...config.conditions];
    updatedConditions[index] = { ...updatedConditions[index], [field]: value };
    setConfig(prev => ({ ...prev, conditions: updatedConditions }));
  };

  const handleConfigSave = () => {
    if (onDataUpdate) {
      onDataUpdate(id, { config });
    }
    setIsConfigOpen(false);
    toast({
      title: "Conditions Configured",
      description: `${config.conditions.length} condition(s) saved`,
    });
  };

  const getConditionSummary = () => {
    if (config.conditions.length === 0) return 'No conditions set';
    if (config.conditions.length === 1) {
      const condition = config.conditions[0];
      return `${condition.field} ${condition.operator} ${condition.value}`;
    }
    return `${config.conditions.length} conditions configured`;
  };

  return (
    <>
      <Card className="w-80 border-2 border-yellow-500 shadow-lg bg-yellow-50/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-yellow-600" />
            {data.label}
            <Badge variant="outline" className="ml-auto bg-yellow-100">
              Condition
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <div className="text-xs text-muted-foreground">
            {getConditionSummary()}
          </div>
          
          <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="w-full">
                <Settings className="w-3 h-3 mr-1" />
                Configure Conditions
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Condition Configuration</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Conditions</Label>
                  <Button variant="outline" size="sm" onClick={addCondition}>
                    <Plus className="w-3 h-3 mr-1" />
                    Add Condition
                  </Button>
                </div>

                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {config.conditions.map((condition: any, index: number) => (
                    <Card key={index} className="p-3">
                      <div className="space-y-3">
                        {index > 0 && (
                          <div>
                            <Label className="text-xs">Logic Operator</Label>
                            <Select 
                              value={condition.logic}
                              onValueChange={(value) => updateCondition(index, 'logic', value)}
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="AND">AND</SelectItem>
                                <SelectItem value="OR">OR</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                        
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <Label className="text-xs">Field</Label>
                            <Select 
                              value={condition.field}
                              onValueChange={(value) => updateCondition(index, 'field', value)}
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {responseFields.map(field => (
                                  <SelectItem key={field.value} value={field.value}>
                                    {field.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div>
                            <Label className="text-xs">Operator</Label>
                            <Select 
                              value={condition.operator}
                              onValueChange={(value) => updateCondition(index, 'operator', value)}
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {operators.map(op => (
                                  <SelectItem key={op.value} value={op.value}>
                                    {op.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="flex gap-1">
                            <div className="flex-1">
                              <Label className="text-xs">Value</Label>
                              <Input
                                value={condition.value}
                                onChange={(e) => updateCondition(index, 'value', e.target.value)}
                                placeholder="Enter value..."
                                className="h-8"
                              />
                            </div>
                            {config.conditions.length > 1 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeCondition(index)}
                                className="h-8 w-8 p-0 mt-4"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleConfigSave} className="flex-1">
                    Save Configuration
                  </Button>
                  <Button variant="outline" onClick={() => setIsConfigOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
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
        <div className="absolute -right-12 top-8 text-xs text-green-600 font-medium">SUCCESS</div>
        <div className="absolute -right-12 top-12 text-xs text-red-600 font-medium">ERROR</div>
      </Card>
    </>
  );
};

export default EnhancedConditionNode;