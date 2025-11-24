import React, { useState, useEffect } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Settings, Target, Loader2, Plus, Trash2, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { workflowServices } from '@/api/services';

const DestinationSchemaNode = ({ data, isConnectable, id, onDataUpdate, workflowType }: any) => {
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [config, setConfig] = useState(
    data.config || {
      target_schemas: [], // Schemas from Target Schema (disabled)
      destination_schemas: [], // New schemas user can add
      reference_field: ""
    }
  );
  const [schemaFieldsCache, setSchemaFieldsCache] = useState<Record<string, any[]>>({});
  const [commonFields, setCommonFields] = useState<any[]>([]);
  const [isLoadingCommonFields, setIsLoadingCommonFields] = useState(false);
  const { toast } = useToast();

  // Sync target schemas from upstream Target Schema Node
  // Remove duplicates - if same schema appears multiple times, show only once
  useEffect(() => {
    if (data.targetSchemas && Array.isArray(data.targetSchemas)) {
      // Remove duplicate schemas based on schema_type
      const uniqueSchemas = data.targetSchemas.reduce((acc: any[], current: any) => {
        const exists = acc.find((item: any) => item.schema_type === current.schema_type);
        if (!exists && current.schema_type) {
          acc.push(current);
        }
        return acc;
      }, []);
      
      setConfig(prev => ({
        ...prev,
        target_schemas: uniqueSchemas
      }));
    }
  }, [data.targetSchemas]);

  // Fetch common fields when different schemas are selected
  useEffect(() => {
    const fetchCommonFields = async () => {
      const allSchemas = [
        ...config.target_schemas.map((s: any) => s.schema_type),
        ...config.destination_schemas.map((s: any) => s.schema_type)
      ].filter(Boolean);

      if (allSchemas.length < 2) {
        setCommonFields([]);
        return;
      }

      // Get unique schema types
      const uniqueSchemaTypes = Array.from(new Set(allSchemas)) as string[];

      // If all schemas are the same, no need for reference field
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
  }, [config.target_schemas, config.destination_schemas, isConfigOpen]);

  // Fetch available schemas
  const { data: availableSchemas, isLoading: isSchemasLoading } = useQuery({
    queryKey: ['available-schemas', workflowType],
    queryFn: () => workflowServices.getAvailableSchemas(workflowType),
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

  // Fetch schema fields for all schemas when dialog opens
  useEffect(() => {
    if (isConfigOpen) {
      [...config.target_schemas, ...config.destination_schemas].forEach((schema: any) => {
        if (schema.schema_type) {
          fetchSchemaFields(schema.schema_type);
        }
      });
    }
  }, [isConfigOpen, config.target_schemas, config.destination_schemas]);

  const addDestinationSchema = () => {
    const newSchema = {
      schema_type: "",
      reference_field: ""
    };
    setConfig(prev => ({
      ...prev,
      destination_schemas: [...prev.destination_schemas, newSchema]
    }));
  };

  const removeDestinationSchema = (index: number) => {
    const updatedSchemas = config.destination_schemas.filter((_: any, i: number) => i !== index);
    setConfig(prev => ({ ...prev, destination_schemas: updatedSchemas }));
  };

  const updateDestinationSchema = (index: number, field: string, value: any) => {
    const updatedSchemas = [...config.destination_schemas];

    // If changing schema type, fetch new schema fields
    if (field === 'schema_type') {
      updatedSchemas[index] = {
        ...updatedSchemas[index],
        schema_type: value,
        reference_field: ""
      };
      // Fetch schema fields if not cached
      if (value && !schemaFieldsCache[value]) {
        fetchSchemaFields(value);
      }
    } else {
      updatedSchemas[index] = { ...updatedSchemas[index], [field]: value };
    }

    setConfig(prev => ({ ...prev, destination_schemas: updatedSchemas }));
  };

  const handleConfigSave = () => {
    // Validate that reference field is selected when different schemas are used
    const allSchemas = [
      ...config.target_schemas.map((s: any) => s.schema_type),
      ...config.destination_schemas.map((s: any) => s.schema_type)
    ].filter(Boolean);

    const uniqueSchemas = new Set(allSchemas);

    // Auto-clear reference field if only one schema is present
    let finalReferenceField = config.reference_field;
    if (uniqueSchemas.size <= 1) {
      finalReferenceField = "";
    } else if (uniqueSchemas.size > 1 && !finalReferenceField) {
      toast({
        title: "Reference Field Required",
        description: "Please select a reference field when using different schemas",
        variant: "destructive",
      });
      return;
    }

    // Update config with final reference field
    const finalConfig = {
      ...config,
      reference_field: finalReferenceField
    };

    // Prepare destination schema data to pass to Export Fields and Data Mapping nodes
    const destinationSchemaData = {
      schemas: allSchemas.map(schemaType => ({
        schema_type: schemaType,
        fields: schemaFieldsCache[schemaType] || []
      })),
      reference_field: finalReferenceField
    };

    if (onDataUpdate) {
      onDataUpdate(id, { 
        config: finalConfig,
        destinationSchemaData // Pass this to downstream nodes
      });
    }
    setIsConfigOpen(false);

    const totalSchemas = config.target_schemas.length + config.destination_schemas.length;

    toast({
      title: "Destination Schema Configured",
      description: `${totalSchemas} schema(s) configured (${config.target_schemas.length} from target, ${config.destination_schemas.length} new)${finalReferenceField ? ` with reference field: ${finalReferenceField}` : ''
        }`,
    });
  };

  const getSchemaLabel = () => {
    const totalSchemas = config.target_schemas.length + config.destination_schemas.length;

    if (totalSchemas === 0) return 'No schemas configured';

    const schemas = availableSchemas?.data?.data?.schemas || [];
    const allSchemaTypes = [
      ...config.target_schemas.map((s: any) => s.schema_type),
      ...config.destination_schemas.map((s: any) => s.schema_type)
    ].filter(Boolean);

    const uniqueSchemas = new Set(allSchemaTypes);

    if (uniqueSchemas.size === 0) return 'Select Schema';
    if (uniqueSchemas.size === 1) {
      const schemaType = Array.from(uniqueSchemas)[0] as string;
      const selectedSchema = schemas.find((s: any) => s.schema_type === schemaType);
      return selectedSchema ? selectedSchema.display_name : schemaType;
    }

    return `${uniqueSchemas.size} schemas configured`;
  };

  const getSchemaSummary = () => {
    const totalSchemas = config.target_schemas.length + config.destination_schemas.length;

    if (totalSchemas === 0) {
      return 'Not configured';
    }

    return `${config.target_schemas.length} from target + ${config.destination_schemas.length} new`;
  };

  return (
    <>
      <Card className="w-80 border-2 border-indigo-500 shadow-lg bg-indigo-50/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Target className="w-4 h-4 text-indigo-600" />
            {data.label}
            <Badge variant="outline" className="ml-auto bg-indigo-100">
              Destination
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <div className="text-xs text-muted-foreground">
            {getSchemaLabel()}
          </div>

          {(config.target_schemas.length > 0 || config.destination_schemas.length > 0) && (
            <div className="space-y-2">
              <div>
                <Label className="text-xs">Schema Configuration</Label>
                <div className="text-xs bg-muted px-2 py-1 rounded">
                  {getSchemaSummary()}
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
                Configure Destination Schema
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
              <DialogHeader>
                <DialogTitle>Destination Schema Configuration</DialogTitle>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                {/* Target Schemas (Disabled - from Target Schema Node) */}
                {config.target_schemas.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Label className="text-base font-semibold">Target Schemas (From Target Schema)</Label>
                      <Badge variant="outline" className="text-xs bg-gray-100">
                        <Lock className="w-3 h-3 mr-1" />
                        Read-only
                      </Badge>
                    </div>

                    {config.target_schemas.map((schema: any, index: number) => {
                      const schemas = availableSchemas?.data?.data?.schemas || [];
                      const selectedSchema = schemas.find((s: any) => s.schema_type === schema.schema_type);

                      return (
                        <div key={index} className="border rounded-lg p-4 space-y-3 bg-gray-50/50 opacity-75">
                          <div className="flex items-center justify-between">
                            <Badge variant="outline" className="text-xs">
                              Target Schema {index + 1}
                            </Badge>
                            <Lock className="w-4 h-4 text-gray-400" />
                          </div>

                          <div>
                            <Label>Schema Type</Label>
                            <Input
                              value={selectedSchema?.display_name || schema.schema_type}
                              disabled
                              className="bg-gray-100"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Destination Schemas (Editable - New schemas) */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">Destination Schemas (New)</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addDestinationSchema}
                      disabled={isSchemasLoading}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Schema
                    </Button>
                  </div>

                  {config.destination_schemas.length === 0 && (
                    <div className="text-sm text-muted-foreground text-center py-4 border rounded-lg bg-muted/30">
                      No destination schemas added yet. Click "Add Schema" to add new schemas.
                    </div>
                  )}

                  {config.destination_schemas.map((schema: any, index: number) => {
                    return (
                      <div key={index} className="border rounded-lg p-4 space-y-3 bg-muted/30">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-xs">
                            Destination Schema {index + 1}
                          </Badge>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeDestinationSchema(index)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>

                        {/* Schema Type Selector */}
                        <div>
                          <Label>Schema Type</Label>
                          <Select
                            value={schema.schema_type}
                            onValueChange={(value) => updateDestinationSchema(index, "schema_type", value)}
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
                                availableSchemas.data.data.schemas.map((s: any) => (
                                  <SelectItem key={s.schema_type} value={s.schema_type}>
                                    {s.display_name}
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
                      </div>
                    );
                  })}
                </div>

                {/* Reference Field Section - Show at bottom when different schemas are selected */}
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
              </div>

              <div className="flex gap-2 pt-4 border-t mt-4">
                <Button
                  onClick={handleConfigSave}
                  className="flex-1"
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
          className="w-3 h-3 !bg-indigo-500"
        />
        <Handle
          type="source"
          position={Position.Right}
          isConnectable={isConnectable}
          className="w-3 h-3 !bg-indigo-500"
        />
      </Card>
    </>
  );
};

export default DestinationSchemaNode;
