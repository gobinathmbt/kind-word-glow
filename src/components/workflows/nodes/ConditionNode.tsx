import { useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Settings, Filter, Trash2, Plus, Check, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { workflowServices } from '@/api/services';

interface FieldCondition {
  field_name: string;
  operator: string;
  value: any;
  condition: 'and' | 'or';
}

interface SchemaField {
  field_name: string;
  field_type: string;
  is_required: boolean;
  is_array: boolean;
  is_nested?: boolean;
  parent_field?: string;
  enum_values?: string[] | null;
  description?: string | null;
}

const ConditionNode = ({ data, isConnectable, id, onDataUpdate, workflowType }: any) => {
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [config, setConfig] = useState(
    data.config || {
      target_fields: [] as FieldCondition[],
    }
  );

  // Check if node is enabled based on workflow type
  const isEnabled = workflowType === 'email_trigger' 
    ? (data.isEnabled || false)
    : true; // For other workflow types, always enabled
  
  const targetSchema = data.targetSchema || '';

  // Fetch schema fields when target schema is available for email_trigger workflow
  const { data: schemaFieldsData, isLoading: isLoadingFields } = useQuery({
    queryKey: ['schema-fields', targetSchema],
    queryFn: () => workflowServices.getSchemaFields(targetSchema),
    enabled: workflowType === 'email_trigger' && !!targetSchema && isEnabled,
  });

  const schemaFields: SchemaField[] = schemaFieldsData?.data?.data?.fields || [];

  const handleConfigSave = () => {
    onDataUpdate(id, { config });
    setIsConfigOpen(false);
  };

  const addFieldCondition = () => {
    setConfig((prev: any) => ({
      ...prev,
      target_fields: [
        ...prev.target_fields,
        { field_name: '', operator: 'equals', value: '', condition: 'and' },
      ],
    }));
  };

  const updateFieldCondition = (index: number, updates: Partial<FieldCondition>) => {
    setConfig((prev: any) => ({
      ...prev,
      target_fields: prev.target_fields.map((field: FieldCondition, i: number) =>
        i === index ? { ...field, ...updates } : field
      ),
    }));
  };

  const removeFieldCondition = (index: number) => {
    setConfig((prev: any) => ({
      ...prev,
      target_fields: prev.target_fields.filter((_: any, i: number) => i !== index),
    }));
  };

  const getOperatorOptions = () => [
    { value: 'equals', label: 'Equals' },
    { value: 'not_equals', label: 'Not Equals' },
    { value: 'contains', label: 'Contains' },
    { value: 'not_contains', label: 'Does Not Contain' },
    { value: 'greater_than', label: 'Greater Than' },
    { value: 'less_than', label: 'Less Than' },
    { value: 'in', label: 'In' },
    { value: 'not_in', label: 'Not In' },
  ];

  const isConfigured = config.target_fields && config.target_fields.length > 0;

  return (
    <>
      <Card className="min-w-[280px] shadow-lg border-2 border-purple-500">
        <Handle
          type="target"
          position={Position.Left}
          isConnectable={isConnectable}
          className="w-3 h-3"
        />
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Filter className="w-4 h-4 text-purple-600" />
            {data.label}
            <Badge variant="outline" className="ml-auto bg-purple-100">
              Conditions
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-3 px-4 pb-4">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Define conditions that must be met for the notification to trigger
          </p>

          {!isEnabled && workflowType === 'email_trigger' && (
            <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded flex items-start gap-2 border border-amber-200">
              <span>⚠️ Select a target schema in Basic Info to enable this node</span>
            </div>
          )}

          {isEnabled && targetSchema && workflowType === 'email_trigger' && (
            <div className="text-xs bg-blue-50 p-2 rounded border border-blue-200">
              <span className="font-medium">Target Schema:</span> {targetSchema}
            </div>
          )}

          {isConfigured && (
            <div className="space-y-2">
              <div className="text-xs">
                <span className="font-medium">Conditions:</span>{' '}
                <Badge variant="outline" className="text-xs">
                  {config.target_fields.length} configured
                </Badge>
              </div>
              <div className="space-y-1">
                {config.target_fields.slice(0, 3).map((condition: FieldCondition, index: number) => (
                  <div key={index} className="text-xs bg-muted p-2 rounded">
                    <span className="font-medium">{condition.field_name || 'Field'}</span>{' '}
                    <span className="text-muted-foreground">{condition.operator}</span>{' '}
                    <span className="font-medium">{condition.value || 'value'}</span>
                  </div>
                ))}
                {config.target_fields.length > 3 && (
                  <div className="text-xs text-muted-foreground">
                    +{config.target_fields.length - 3} more...
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="pt-2">
            <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs h-8"
                onClick={() => setIsConfigOpen(true)}
                disabled={!isEnabled && workflowType === 'email_trigger'}
              >
                <Settings className="w-3 h-3 mr-1.5" />
                {isConfigured ? 'Edit Conditions' : 'Configure Conditions'}
              </Button>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader className="px-6 pt-6 pb-4">
                  <DialogTitle className="flex items-center gap-2">
                    <Filter className="h-5 w-5" />
                    Field Conditions
                  </DialogTitle>
                  <CardDescription>
                    Define conditions that must be met for the notification to trigger
                  </CardDescription>
                </DialogHeader>
                <ScrollArea className="flex-1 px-6">
                  <div className="space-y-4 pb-6">
                    {config.target_fields.map((condition: FieldCondition, index: number) => (
                      <div key={index} className="border rounded-lg p-4 space-y-3">
                        <div className="flex justify-between items-center">
                          <h4 className="font-medium">Condition {index + 1}</h4>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFieldCondition(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-4 gap-2">
                          <div className="space-y-2">
                            <Label>Field</Label>
                            {workflowType === 'email_trigger' && schemaFields.length > 0 ? (
                              <Select
                                value={condition.field_name}
                                onValueChange={(value) =>
                                  updateFieldCondition(index, { field_name: value })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select field" />
                                </SelectTrigger>
                                <SelectContent className="max-h-[400px]">
                                  {isLoadingFields ? (
                                    <div className="flex items-center justify-center p-4">
                                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                      <span className="text-sm text-muted-foreground">Loading fields...</span>
                                    </div>
                                  ) : (
                                    schemaFields.map((field) => {
                                      // Calculate indentation level based on nested structure
                                      const indentLevel = field.is_nested 
                                        ? (field.field_name.split('.').length - 1) 
                                        : 0;
                                      const paddingLeft = indentLevel * 16;
                                      
                                      // Check if this is an array parent field
                                      const isArrayParent = field.is_array && field.field_type === "array";
                                      
                                      // Check if this field is currently selected
                                      const isSelected = condition.field_name === field.field_name;
                                      
                                      return (
                                        <SelectItem 
                                          key={field.field_name} 
                                          value={field.field_name}
                                          style={{ paddingLeft: `${paddingLeft + 8}px` }}
                                          className={isArrayParent ? "bg-blue-50/50 font-medium" : ""}
                                        >
                                          <span className="flex items-center justify-between w-full gap-2">
                                            <span className="flex items-center gap-1.5 flex-1">
                                              {field.is_nested && !isArrayParent && (
                                                <span className="text-muted-foreground text-xs">
                                                  └─
                                                </span>
                                              )}
                                              <span className={
                                                isArrayParent 
                                                  ? "font-semibold text-blue-700" 
                                                  : field.is_nested 
                                                  ? "text-sm" 
                                                  : "font-medium"
                                              }>
                                                {field.is_nested 
                                                  ? field.field_name.split('.').pop() 
                                                  : field.field_name}
                                              </span>
                                              <span className="text-muted-foreground text-xs">
                                                ({field.field_type})
                                              </span>
                                              {isArrayParent && (
                                                <span className="text-blue-600 text-xs font-bold">[]</span>
                                              )}
                                            </span>
                                            {isSelected && (
                                              <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                                            )}
                                          </span>
                                        </SelectItem>
                                      );
                                    })
                                  )}
                                </SelectContent>
                              </Select>
                            ) : (
                              <Input
                                value={condition.field_name}
                                onChange={(e) =>
                                  updateFieldCondition(index, { field_name: e.target.value })
                                }
                                placeholder="Enter field name"
                              />
                            )}
                          </div>

                          <div className="space-y-2">
                            <Label>Operator</Label>
                            <Select
                              value={condition.operator}
                              onValueChange={(value) =>
                                updateFieldCondition(index, { operator: value })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {getOperatorOptions().map((option) => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label>Value</Label>
                            {(() => {
                              // Find the selected field to check for enum values
                              const selectedField = schemaFields.find(f => f.field_name === condition.field_name);
                              const hasEnums = selectedField?.enum_values && selectedField.enum_values.length > 0;
                              
                              if (workflowType === 'email_trigger' && hasEnums) {
                                return (
                                  <Select
                                    value={condition.value}
                                    onValueChange={(value) =>
                                      updateFieldCondition(index, { value })
                                    }
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select value" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {selectedField.enum_values!.map((enumValue) => (
                                        <SelectItem key={enumValue} value={enumValue}>
                                          {enumValue}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                );
                              }
                              
                              return (
                                <Input
                                  value={condition.value}
                                  onChange={(e) =>
                                    updateFieldCondition(index, {
                                      value: e.target.value,
                                    })
                                  }
                                  placeholder="Enter value"
                                />
                              );
                            })()}
                          </div>

                          <div className="space-y-2">
                            <Label>Logic</Label>
                            <Select
                              value={condition.condition}
                              onValueChange={(value: 'and' | 'or') =>
                                updateFieldCondition(index, { condition: value })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="and">AND</SelectItem>
                                <SelectItem value="or">OR</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    ))}

                    {config.target_fields.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <Filter className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No conditions configured</p>
                        <p className="text-xs">Click "Add Condition" to get started</p>
                      </div>
                    )}

                    <Button
                      type="button"
                      variant="outline"
                      onClick={addFieldCondition}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Condition
                    </Button>
                  </div>
                </ScrollArea>
                <div className="flex justify-end gap-2 px-6 pb-6 pt-4 border-t">
                  <Button variant="outline" onClick={() => setIsConfigOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleConfigSave}>Save Configuration</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
        <Handle
          type="source"
          position={Position.Right}
          isConnectable={isConnectable}
          className="w-3 h-3"
        />
      </Card>
    </>
  );
};

export default ConditionNode;
