import React, { useState, useEffect } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Settings, Target, Loader2, Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { workflowServices } from '@/api/services';

const TargetSchemaNode = ({ data, isConnectable, id, onDataUpdate }: any) => {
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [config, setConfig] = useState(
    data.config || {
      triggers: [{
        schema_type: "",
        trigger_field: "",
        trigger_operator: "",
        trigger_value: "",
        logic: "AND",
        schema_fields: [],
        reference_field: ""
      }],
      reference_field: ""
    }
  );
  const [schemaFieldsCache, setSchemaFieldsCache] = useState<Record<string, any[]>>({});
  const [commonFields, setCommonFields] = useState<any[]>([]);
  const [isLoadingCommonFields, setIsLoadingCommonFields] = useState(false);
  const { toast } = useToast();

  // Initialize config with triggers array if it doesn't exist
  useEffect(() => {
    if (data.config && !data.config.triggers) {
      // Migrate old single trigger format to new triggers array format
      const oldTrigger = {
        schema_type: data.config.schema_type || "",
        trigger_field: data.config.trigger_field || "",
        trigger_operator: data.config.trigger_operator || "",
        trigger_value: data.config.trigger_value || "",
        logic: "AND",
        schema_fields: data.config.schema_fields || [],
        reference_field: ""
      };
      setConfig({ triggers: [oldTrigger], reference_field: "" });
    }
  }, [data.config]);

  // Fetch common fields when different schemas are selected
  useEffect(() => {
    const fetchCommonFields = async () => {
      if (!config.triggers || config.triggers.length < 2) {
        setCommonFields([]);
        return;
      }

      // Get unique schema types
      const uniqueSchemaTypes = Array.from(
        new Set(config.triggers.map((t: any) => t.schema_type).filter(Boolean))
      ) as string[];

      // If all triggers use the same schema, no need for reference field
      if (uniqueSchemaTypes.length <= 1) {
        setCommonFields([]);
        return;
      }

      // Fetch common fields for different schemas
      setIsLoadingCommonFields(true);
      try {
        const response = await workflowServices.getCommonFields(uniqueSchemaTypes);
        const fields = response?.data?.data?.common_fields || [];
        setCommonFields(fields);
      } catch (error) {
        console.error('Error fetching common fields:', error);
        setCommonFields([]);
      } finally {
        setIsLoadingCommonFields(false);
      }
    };

    if (isConfigOpen) {
      fetchCommonFields();
    }
  }, [config.triggers, isConfigOpen]);

  // Fetch available schemas
  const { data: availableSchemas, isLoading: isSchemasLoading } = useQuery({
    queryKey: ['available-schemas'],
    queryFn: () => workflowServices.getAvailableSchemas(),
  });

  // Function to fetch schema fields for a specific schema type
  const fetchSchemaFields = async (schemaType: string) => {
    if (!schemaType || schemaFieldsCache[schemaType]) return;
    
    try {
      const response = await workflowServices.getSchemaFields(schemaType);
      const fields = response?.data?.data?.fields;
      if (Array.isArray(fields)) {
        setSchemaFieldsCache(prev => ({
          ...prev,
          [schemaType]: fields
        }));
      }
    } catch (error) {
      console.error('Error fetching schema fields:', error);
    }
  };

  // Fetch schema fields for all triggers when dialog opens
  useEffect(() => {
    if (isConfigOpen && config.triggers) {
      config.triggers.forEach((trigger: any) => {
        if (trigger.schema_type) {
          fetchSchemaFields(trigger.schema_type);
        }
      });
    }
  }, [isConfigOpen, config.triggers]);

  const addTrigger = () => {
    const newTrigger = {
      schema_type: "",
      trigger_field: "",
      trigger_operator: "",
      trigger_value: "",
      logic: "AND",
      schema_fields: [],
      reference_field: ""
    };
    setConfig(prev => ({
      ...prev,
      triggers: [...prev.triggers, newTrigger]
    }));
  };

  const removeTrigger = (index: number) => {
    const updatedTriggers = config.triggers.filter((_: any, i: number) => i !== index);
    setConfig({ triggers: updatedTriggers });
  };

  const updateTrigger = (index: number, field: string, value: any) => {
    const updatedTriggers = [...config.triggers];
    
    // If changing schema type, reset dependent fields and fetch new schema fields
    if (field === 'schema_type') {
      updatedTriggers[index] = {
        ...updatedTriggers[index],
        schema_type: value,
        trigger_field: "",
        trigger_operator: "",
        trigger_value: "",
        schema_fields: schemaFieldsCache[value] || []
      };
      // Fetch schema fields if not cached
      if (value && !schemaFieldsCache[value]) {
        fetchSchemaFields(value);
      }
    } else {
      updatedTriggers[index] = { ...updatedTriggers[index], [field]: value };
    }
    
    setConfig({ triggers: updatedTriggers });
  };

  const handleConfigSave = () => {
    // Validate that reference field is selected when different schemas are used
    const uniqueSchemas = new Set(config.triggers.map((t: any) => t.schema_type).filter(Boolean));
    
    if (uniqueSchemas.size > 1 && !config.reference_field) {
      toast({
        title: "Reference Field Required",
        description: "Please select a reference field when using different schemas",
        variant: "destructive",
      });
      return;
    }

    if (onDataUpdate) {
      onDataUpdate(id, { config });
    }
    setIsConfigOpen(false);
    
    const schemaCount = uniqueSchemas.size;
    
    toast({
      title: "Target Schema Configured",
      description: `${config.triggers.length} trigger(s) configured across ${schemaCount} schema(s)${
        config.reference_field ? ` with reference field: ${config.reference_field}` : ''
      }`,
    });
  };

  const getOperatorOptions = (fieldType: string) => {
    const baseOperators = [
      { value: 'equals', label: 'Equals' },
      { value: 'not_equals', label: 'Not Equals' },
    ];

    if (fieldType === 'string') {
      return [
        ...baseOperators,
        { value: 'contains', label: 'Contains' },
        { value: 'starts_with', label: 'Starts With' },
        { value: 'ends_with', label: 'Ends With' },
        { value: 'is_empty', label: 'Is Empty' },
        { value: 'is_not_empty', label: 'Is Not Empty' },
      ];
    }

    if (fieldType === 'number') {
      return [
        ...baseOperators,
        { value: 'greater_than', label: 'Greater Than' },
        { value: 'less_than', label: 'Less Than' },
        { value: 'greater_than_or_equal', label: 'Greater Than or Equal' },
        { value: 'less_than_or_equal', label: 'Less Than or Equal' },
      ];
    }

    if (fieldType === 'boolean') {
      return [
        { value: 'is_true', label: 'Is True' },
        { value: 'is_false', label: 'Is False' },
      ];
    }

    if (fieldType === 'date') {
      return [
        ...baseOperators,
        { value: 'before', label: 'Before' },
        { value: 'after', label: 'After' },
        { value: 'between', label: 'Between' },
      ];
    }

    return baseOperators;
  };

  const getValueInputType = (fieldType: string) => {
    switch (fieldType) {
      case 'number': return 'number';
      case 'date': return 'date';
      case 'boolean': return 'select';
      default: return 'text';
    }
  };

  const shouldShowValueInput = (operator: string) => {
    return !['is_empty', 'is_not_empty', 'is_true', 'is_false'].includes(operator);
  };

  const getSchemaLabel = () => {
    if (!config.triggers || config.triggers.length === 0) return 'No triggers configured';
    
    const schemas = availableSchemas?.data?.data?.schemas || [];
    const uniqueSchemas = new Set(config.triggers.map((t: any) => t.schema_type).filter(Boolean));
    
    if (uniqueSchemas.size === 0) return 'Select Schema';
    if (uniqueSchemas.size === 1) {
      const schemaType = Array.from(uniqueSchemas)[0] as string;
      const selectedSchema = schemas.find((s: any) => s.schema_type === schemaType);
      return selectedSchema ? selectedSchema.display_name : schemaType;
    }
    
    return `${uniqueSchemas.size} schemas configured`;
  };

  const getTriggerSummary = () => {
    if (!config.triggers || config.triggers.length === 0) {
      return 'Not configured';
    }

    const validTriggers = config.triggers.filter((t: any) => t.schema_type && t.trigger_field && t.trigger_operator);
    
    if (validTriggers.length === 0) {
      return 'Not configured';
    }

    if (validTriggers.length === 1) {
      const trigger = validTriggers[0];
      const triggerFields = schemaFieldsCache[trigger.schema_type] || trigger.schema_fields || [];
      const field = triggerFields.find((f: any) => f.field_name === trigger.trigger_field);
      const operators = field ? getOperatorOptions(field.field_type) : [];
      const operatorLabel = operators.find(op => op.value === trigger.trigger_operator)?.label || trigger.trigger_operator;
      const valueText = shouldShowValueInput(trigger.trigger_operator) ? ` "${trigger.trigger_value}"` : '';
      return `${trigger.trigger_field} ${operatorLabel}${valueText}`;
    }

    return `${validTriggers.length} trigger conditions configured`;
  };

  return (
    <>
      <Card className="w-80 border-2 border-purple-500 shadow-lg bg-purple-50/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Target className="w-4 h-4 text-purple-600" />
            {data.label}
            <Badge variant="outline" className="ml-auto bg-purple-100">
              Schema
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <div className="text-xs text-muted-foreground">
            {getSchemaLabel()}
          </div>

          {config.triggers && config.triggers.length > 0 && (
            <div className="space-y-2">
              <div>
                <Label className="text-xs">Trigger Condition</Label>
                <div className="text-xs bg-muted px-2 py-1 rounded">
                  {getTriggerSummary()}
                </div>
              </div>
              {config.reference_field && (
                <div>
                  <Label className="text-xs">Reference Field</Label>
                  <div className="text-xs bg-blue-50 px-2 py-1 rounded border border-blue-200">
                    {config.reference_field}
                  </div>
                </div>
              )}
            </div>
          )}

          <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="w-full">
                <Settings className="w-3 h-3 mr-1" />
                Configure Schema
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
              <DialogHeader>
                <DialogTitle>Target Schema Configuration</DialogTitle>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                {/* Reference Field - Show only when different schemas are selected */}
                {commonFields.length > 0 && (
                  <div className="border rounded-lg p-4 space-y-3 bg-blue-50/50">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-blue-100">
                        Reference Field
                      </Badge>
                      {isLoadingCommonFields && (
                        <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                      )}
                    </div>
                    <div>
                      <Label>Select Reference Field (Common Field Between Schemas)</Label>
                      <Select
                        value={config.reference_field || ""}
                        onValueChange={(value) => setConfig(prev => ({ ...prev, reference_field: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select reference field..." />
                        </SelectTrigger>
                        <SelectContent>
                          {commonFields.map((field: any) => (
                            <SelectItem key={field.field_name} value={field.field_name}>
                              <div className="flex items-center gap-2">
                                <span>{field.field_name}</span>
                                <Badge variant="outline" className="text-xs">
                                  {field.field_type}
                                </Badge>
                                {field.is_required && (
                                  <Badge variant="destructive" className="text-xs">
                                    Required
                                  </Badge>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground mt-1">
                        This field will be used to link records between different schemas
                      </p>
                    </div>
                  </div>
                )}

                {/* Trigger Conditions */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">Trigger Conditions</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addTrigger}
                      disabled={isSchemasLoading}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Trigger
                    </Button>
                  </div>

                  {config.triggers.map((trigger: any, index: number) => {
                    const triggerSchemaFields = schemaFieldsCache[trigger.schema_type] || trigger.schema_fields || [];
                    const selectedTriggerField = triggerSchemaFields.find((field: any) => field.field_name === trigger.trigger_field);
                    const triggerOperatorOptions = selectedTriggerField ? getOperatorOptions(selectedTriggerField.field_type) : [];

                    return (
                      <div key={index} className="border rounded-lg p-4 space-y-3 bg-muted/30">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-xs">
                            Trigger {index + 1}
                          </Badge>
                          {config.triggers.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeTrigger(index)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          )}
                        </div>

                        {/* Logic Operator (for triggers after the first one) */}
                        {index > 0 && (
                          <div>
                            <Label>Logic Operator</Label>
                            <Select
                              value={trigger.logic || "AND"}
                              onValueChange={(value) => updateTrigger(index, "logic", value)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="AND">AND</SelectItem>
                                <SelectItem value="OR">OR</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        {/* Schema Type Selector for each trigger */}
                        <div>
                          <Label>Schema Type</Label>
                          <Select
                            value={trigger.schema_type}
                            onValueChange={(value) => updateTrigger(index, "schema_type", value)}
                            disabled={isSchemasLoading}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={isSchemasLoading ? "Loading schemas..." : "Select schema type"} />
                            </SelectTrigger>
                            <SelectContent>
                              {isSchemasLoading ? (
                                <div className="flex items-center justify-center p-4">
                                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                  <span className="text-sm text-muted-foreground">Loading schemas...</span>
                                </div>
                              ) : availableSchemas?.data?.data?.schemas && availableSchemas.data.data.schemas.length > 0 ? (
                                availableSchemas.data.data.schemas.map((schema: any) => (
                                  <SelectItem key={schema.schema_type} value={schema.schema_type}>
                                    {schema.display_name}
                                  </SelectItem>
                                ))
                              ) : (
                                <div className="p-4 text-sm text-muted-foreground text-center">
                                  No schemas available
                                </div>
                              )}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Trigger Field */}
                        {trigger.schema_type && (
                          <div>
                            <Label>Trigger Field</Label>
                            <Select
                              value={trigger.trigger_field}
                              onValueChange={(value) => updateTrigger(index, "trigger_field", value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select trigger field" />
                              </SelectTrigger>
                              <SelectContent>
                                {triggerSchemaFields.length > 0 ? (
                                  triggerSchemaFields.map((field: any) => (
                                    <SelectItem key={field.field_name} value={field.field_name}>
                                      <div className="flex items-center gap-2">
                                        <span className={field.is_nested ? 'ml-4 text-xs' : ''}>
                                          {field.field_name}
                                        </span>
                                        <Badge variant="outline" className="text-xs">
                                          {field.field_type}
                                        </Badge>
                                        {field.is_required && (
                                          <Badge variant="destructive" className="text-xs">
                                            Required
                                          </Badge>
                                        )}
                                        {field.is_nested && (
                                          <Badge variant="outline" className="text-xs bg-blue-50">
                                            Nested
                                          </Badge>
                                        )}
                                      </div>
                                    </SelectItem>
                                  ))
                                ) : (
                                  <div className="p-2 text-xs text-muted-foreground">
                                    {trigger.schema_type ? 'Loading fields...' : 'Select schema type first'}
                                  </div>
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        {/* Operator */}
                        {trigger.trigger_field && selectedTriggerField && (
                          <div>
                            <Label>Trigger Operator</Label>
                            <Select
                              value={trigger.trigger_operator}
                              onValueChange={(value) => updateTrigger(index, "trigger_operator", value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select operator" />
                              </SelectTrigger>
                              <SelectContent>
                                {triggerOperatorOptions.map((operator) => (
                                  <SelectItem key={operator.value} value={operator.value}>
                                    {operator.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        {/* Value */}
                        {trigger.trigger_field && selectedTriggerField && trigger.trigger_operator && shouldShowValueInput(trigger.trigger_operator) && (
                          <div>
                            <Label>Trigger Value</Label>
                            {getValueInputType(selectedTriggerField.field_type) === 'select' ? (
                              <Select
                                value={trigger.trigger_value}
                                onValueChange={(value) => updateTrigger(index, "trigger_value", value)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select value" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="true">True</SelectItem>
                                  <SelectItem value="false">False</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : selectedTriggerField.enum_values ? (
                              <Select
                                value={trigger.trigger_value}
                                onValueChange={(value) => updateTrigger(index, "trigger_value", value)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select value" />
                                </SelectTrigger>
                                <SelectContent>
                                  {selectedTriggerField.enum_values.map((enumValue: string) => (
                                    <SelectItem key={enumValue} value={enumValue}>
                                      {enumValue}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <Input
                                type={getValueInputType(selectedTriggerField.field_type)}
                                value={trigger.trigger_value || ''}
                                onChange={(e) => updateTrigger(index, "trigger_value", e.target.value)}
                                placeholder={`Enter ${selectedTriggerField.field_type} value...`}
                              />
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t mt-4">
                <Button
                  onClick={handleConfigSave}
                  className="flex-1"
                  disabled={config.triggers.some((t: any) => !t.schema_type || !t.trigger_field || !t.trigger_operator)}
                >
                  Save Configuration
                </Button>
                <Button variant="outline" onClick={() => setIsConfigOpen(false)}>
                  Cancel
                </Button>
              </div>
            </DialogContent>
          </Dialog>
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
    </>
  );
};

export default TargetSchemaNode;
