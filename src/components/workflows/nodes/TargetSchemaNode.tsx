import React, { useState, useEffect } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Settings, Target } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { workflowServices } from '@/api/services';

const TargetSchemaNode = ({ data, isConnectable, id, onDataUpdate }: any) => {
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [config, setConfig] = useState(
    data.config || {
      schema_type: "",
      trigger_field: "",
      trigger_operator: "",
      trigger_value: "",
      schema_fields: []
    }
  );
  const { toast } = useToast();

  // Fetch schema fields when schema type changes
  const { data: schemaFields, isLoading } = useQuery({
    queryKey: ['schema-fields', config.schema_type],
    queryFn: () => workflowServices.getSchemaFields(config.schema_type),
    enabled: !!config.schema_type,
  });

  // ✅ FIXED: Preserve trigger_field, trigger_operator, trigger_value
  // Instead of clearing them when schemaFields arrive.
  useEffect(() => {
    const fields = schemaFields?.data?.data?.fields;
    if (Array.isArray(fields)) {
      setConfig(prev => ({
        ...prev,
        schema_fields: fields,
        trigger_field: prev.trigger_field || "",
        trigger_operator: prev.trigger_operator || "",
        trigger_value: prev.trigger_value || ""
      }));
    }
  }, [schemaFields]);

  const handleConfigSave = () => {
    if (onDataUpdate) {
      onDataUpdate(id, { config });
    }
    setIsConfigOpen(false);
    toast({
      title: "Target Schema Configured",
      description: `Schema: ${config.schema_type}, Trigger: ${config.trigger_field}`,
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

  const selectedField = config.schema_fields.find((field: any) => field.field_name === config.trigger_field);
  const operatorOptions = selectedField ? getOperatorOptions(selectedField.field_type) : [];

  const getSchemaLabel = () => {
    switch (config.schema_type) {
      case 'vehicle': return 'Vehicle Schema';
      case 'master_vehicle': return 'Master Vehicle Schema';
      case 'advertise_vehicle': return 'Advertise Vehicle Schema';
      default: return 'Select Schema';
    }
  };

  const getTriggerSummary = () => {
    if (!config.schema_type || !config.trigger_field || !config.trigger_operator) {
      return 'Not configured';
    }

    const operatorLabel = operatorOptions.find(op => op.value === config.trigger_operator)?.label || config.trigger_operator;
    const valueText = shouldShowValueInput(config.trigger_operator) ? ` "${config.trigger_value}"` : '';

    return `${config.trigger_field} ${operatorLabel}${valueText}`;
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

          {config.schema_type && (
            <div className="space-y-2">
              <div>
                <Label className="text-xs">Trigger Condition</Label>
                <div className="text-xs bg-muted px-2 py-1 rounded">
                  {getTriggerSummary()}
                </div>
              </div>
            </div>
          )}

          <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="w-full">
                <Settings className="w-3 h-3 mr-1" />
                Configure Schema
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Target Schema Configuration</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {/* Schema Type Selector */}
                <div>
                  <Label htmlFor="schema_type">Schema Type</Label>
                  <Select
                    value={config.schema_type}
                    onValueChange={(value) => setConfig(prev => ({
                      ...prev,
                      schema_type: value,
                      trigger_field: "",
                      trigger_operator: "",
                      trigger_value: ""
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select schema type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vehicle">Vehicle Schema</SelectItem>
                      <SelectItem value="master_vehicle">Master Vehicle Schema</SelectItem>
                      <SelectItem value="advertise_vehicle">Advertise Vehicle Schema</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Trigger Field */}
                {config.schema_type && (
                  <>
                    <div>
                      <Label htmlFor="trigger_field">Trigger Field</Label>
                      <Select
                        value={config.trigger_field}
                        onValueChange={(value) => setConfig(prev => ({
                          ...prev,
                          trigger_field: value,
                          trigger_operator: "",
                          trigger_value: ""
                        }))}
                        disabled={isLoading}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={isLoading ? "Loading fields..." : "Select trigger field"} />
                        </SelectTrigger>
                        <SelectContent>
                          {config.schema_fields.length > 0 ? (
                            config.schema_fields.map((field: any) => (
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
                            <div className="p-2 text-xs text-muted-foreground">No fields found</div>
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Operator + Value */}
                    {config.trigger_field && selectedField && (
                      <>
                        <div>
                          <Label htmlFor="trigger_operator">Trigger Operator</Label>
                          <Select
                            value={config.trigger_operator}
                            onValueChange={(value) => setConfig(prev => ({
                              ...prev,
                              trigger_operator: value,
                              trigger_value: ""
                            }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select operator" />
                            </SelectTrigger>
                            <SelectContent>
                              {operatorOptions.map((operator) => (
                                <SelectItem key={operator.value} value={operator.value}>
                                  {operator.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {config.trigger_operator && shouldShowValueInput(config.trigger_operator) && (
                          <div>
                            <Label htmlFor="trigger_value">Trigger Value</Label>
                            {getValueInputType(selectedField.field_type) === 'select' ? (
                              <Select
                                value={config.trigger_value}
                                onValueChange={(value) => setConfig(prev => ({ ...prev, trigger_value: value }))}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select value" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="true">True</SelectItem>
                                  <SelectItem value="false">False</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : selectedField.enum_values ? (
                              <Select
                                value={config.trigger_value}
                                onValueChange={(value) => setConfig(prev => ({ ...prev, trigger_value: value }))}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select value" />
                                </SelectTrigger>
                                <SelectContent>
                                  {selectedField.enum_values.map((enumValue: string) => (
                                    <SelectItem key={enumValue} value={enumValue}>
                                      {enumValue}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <Input
                                id="trigger_value"
                                type={getValueInputType(selectedField.field_type)}
                                value={config.trigger_value || ''}
                                onChange={(e) => setConfig(prev => ({ ...prev, trigger_value: e.target.value }))}
                                placeholder={`Enter ${selectedField.field_type} value...`}
                              />
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}

                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={handleConfigSave}
                    className="flex-1"
                    disabled={!config.schema_type || !config.trigger_field || !config.trigger_operator}
                  >
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
