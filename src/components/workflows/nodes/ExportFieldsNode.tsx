import React, { useState, useEffect } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Download, Check, X, AlertTriangle, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const ExportFieldsNode = ({ data, isConnectable, id, onDataUpdate }: any) => {
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [activeSchemaTab, setActiveSchemaTab] = useState('');
  const [config, setConfig] = useState(
    data.config || {
      selected_fields: {}, // Changed to object: { schema_type: [field_names] }
      export_format: 'json',
      include_metadata: false
    }
  );
  const { toast } = useToast();

  // Get destination schemas from Destination Schema Node (passed via data)
  const destinationSchemas = data.destinationSchemas || [];
  const referenceField = data.referenceField || '';
  const isEnabled = data.isEnabled || false;

  // Set initial active tab when destination schemas are loaded
  useEffect(() => {
    if (destinationSchemas.length > 0 && !activeSchemaTab) {
      setActiveSchemaTab(destinationSchemas[0].schema_type);
    }
  }, [destinationSchemas]);

  // Initialize and sync selected_fields structure when schemas change
  useEffect(() => {
    if (destinationSchemas.length > 0) {
      setConfig(prev => {
        const newSelectedFields: any = {};
        const currentSchemaTypes = destinationSchemas.map((s: any) => s.schema_type);
        
        // Only keep selected fields for schemas that still exist
        destinationSchemas.forEach((schema: any) => {
          const schemaType = schema.schema_type;
          // Preserve existing selections if schema still exists
          if (prev.selected_fields[schemaType]) {
            // Filter out fields that no longer exist in the schema
            const validFields = prev.selected_fields[schemaType].filter((fieldName: string) => {
              return schema.fields.some((f: any) => f.field_name === fieldName);
            });
            newSelectedFields[schemaType] = validFields;
          } else {
            // Initialize empty array for new schemas
            newSelectedFields[schemaType] = [];
          }
        });
        
        // Auto-clear reference field if only one schema
        const finalReferenceField = destinationSchemas.length === 1 ? "" : referenceField;
        
        return {
          ...prev,
          selected_fields: newSelectedFields,
          reference_field: finalReferenceField
        };
      });
    } else {
      // Clear all selections if no schemas
      setConfig(prev => ({
        ...prev,
        selected_fields: {},
        reference_field: ""
      }));
    }
  }, [destinationSchemas, referenceField]);

  const getCurrentSchemaFields = () => {
    const currentSchema = destinationSchemas.find((s: any) => s.schema_type === activeSchemaTab);
    return currentSchema?.fields || [];
  };

  const handleFieldToggle = (schemaType: string, fieldName: string, checked: boolean) => {
    setConfig(prev => {
      const newSelectedFields = { ...prev.selected_fields };
      let schemaSelectedFields = [...(newSelectedFields[schemaType] || [])];
      
      if (checked) {
        // Add the field
        if (!schemaSelectedFields.includes(fieldName)) {
          schemaSelectedFields.push(fieldName);
        }
      } else {
        // Remove the field
        schemaSelectedFields = schemaSelectedFields.filter((f: string) => f !== fieldName);
      }
      
      newSelectedFields[schemaType] = schemaSelectedFields;
      
      return {
        ...prev,
        selected_fields: newSelectedFields
      };
    });
  };

  const handleSelectAll = (schemaType: string) => {
    const schemaFields = destinationSchemas.find((s: any) => s.schema_type === schemaType)?.fields || [];
    const allFieldNames = schemaFields.map((field: any) => field.field_name);
    setConfig(prev => ({
      ...prev,
      selected_fields: {
        ...prev.selected_fields,
        [schemaType]: allFieldNames
      }
    }));
  };

  const handleSelectNone = (schemaType: string) => {
    setConfig(prev => ({
      ...prev,
      selected_fields: {
        ...prev.selected_fields,
        [schemaType]: []
      }
    }));
  };

  const handleSelectRequired = (schemaType: string) => {
    const schemaFields = destinationSchemas.find((s: any) => s.schema_type === schemaType)?.fields || [];
    const requiredFields = schemaFields
      .filter((field: any) => field.is_required)
      .map((field: any) => field.field_name);

    setConfig(prev => ({
      ...prev,
      selected_fields: {
        ...prev.selected_fields,
        [schemaType]: requiredFields
      }
    }));
  };

  const hasNestedFields = (schemaType: string, fieldName: string) => {
    const schemaFields = destinationSchemas.find((s: any) => s.schema_type === schemaType)?.fields || [];
    return schemaFields.some((f: any) => f.is_nested && f.parent_field === fieldName);
  };

  const shouldCountField = (schemaType: string, fieldName: string) => {
    const schemaFields = destinationSchemas.find((s: any) => s.schema_type === schemaType)?.fields || [];
    const field = schemaFields.find((f: any) => f.field_name === fieldName);
    
    // If it's a nested field, always count it
    if (field?.is_nested) {
      return true;
    }
    
    // If it's an array field WITHOUT nested fields, count it
    if (field?.is_array && !hasNestedFields(schemaType, fieldName)) {
      return true;
    }
    
    // If it's an array field WITH nested fields, don't count the parent
    if (field?.is_array && hasNestedFields(schemaType, fieldName)) {
      return false;
    }
    
    // For all other fields (non-array), count them
    return true;
  };

  const handleConfigSave = () => {
    // Check if at least one field is selected across all schemas
    const totalSelected = Object.values(config.selected_fields).reduce((sum: number, fields: any) => sum + fields.length, 0);
    
    if (totalSelected === 0) {
      toast({
        title: "Validation Error",
        description: "Please select at least one field to export from any schema",
        variant: "destructive",
      });
      return;
    }

    // Auto-set reference field based on number of schemas
    const finalReferenceField = destinationSchemas.length === 1 ? "" : referenceField;

    const finalConfig = {
      ...config,
      reference_field: finalReferenceField
    };

    if (onDataUpdate) {
      onDataUpdate(id, { config: finalConfig });
    }
    setIsConfigOpen(false);
    
    const schemasWithFields = Object.keys(config.selected_fields).filter(
      schemaType => config.selected_fields[schemaType].length > 0
    );
    
    toast({
      title: "Export Fields Configured",
      description: `${totalSelected} fields selected from ${schemasWithFields.length} schema(s)${finalReferenceField ? ` with reference field: ${finalReferenceField}` : ''}`,
    });
  };

  const getSchemaDisplayName = (schemaType: string) => {
    return schemaType
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getFieldTypeColor = (fieldType: string) => {
    switch (fieldType) {
      case 'string': return 'bg-blue-100 text-blue-800';
      case 'number': return 'bg-green-100 text-green-800';
      case 'boolean': return 'bg-purple-100 text-purple-800';
      case 'date': return 'bg-orange-100 text-orange-800';
      case 'array': return 'bg-pink-100 text-pink-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Calculate total selected count across all schemas
  const totalSelectedCount: number = (Object.values(config.selected_fields) as string[][]).reduce((sum: number, fields: string[]) => {
    if (!Array.isArray(fields)) return sum;
    return sum + fields.filter((fieldName: string) => {
      // Find which schema this field belongs to
      const schemaType = Object.keys(config.selected_fields).find(st => 
        Array.isArray(config.selected_fields[st]) && config.selected_fields[st].includes(fieldName)
      );
      return schemaType ? shouldCountField(schemaType, fieldName) : false;
    }).length;
  }, 0);
  
  // Calculate total fields across all schemas
  const totalFieldsCount: number = destinationSchemas.reduce((sum: number, schema: any) => {
    const fields = schema.fields.filter((field: any) => {
      if (field.is_array && hasNestedFields(schema.schema_type, field.field_name)) {
        return false;
      }
      return true;
    });
    return sum + fields.length;
  }, 0);

  return (
    <>
      <Card className={`w-80 border-2 shadow-lg ${!isEnabled ? 'border-gray-300 bg-gray-50/50 opacity-60' : 'border-green-500 bg-green-50/50'}`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            {!isEnabled && <Lock className="w-4 h-4 text-gray-400" />}
            <Download className={`w-4 h-4 ${isEnabled ? 'text-green-600' : 'text-gray-400'}`} />
            {data.label}
            <Badge variant="outline" className={`ml-auto ${isEnabled ? 'bg-green-100' : 'bg-gray-100'}`}>
              Export
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          {!isEnabled ? (
            <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded flex items-start gap-2 border border-amber-200">
              <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />
              <span>Configure Destination Schema first to enable this node</span>
            </div>
          ) : destinationSchemas.length === 0 ? (
            <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded flex items-start gap-2 border border-amber-200">
              <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />
              <span>No schemas configured in Destination Schema node</span>
            </div>
          ) : (() => {
            // Check if any previously selected schemas are no longer in destination schemas
            const currentSchemaTypes = destinationSchemas.map((s: any) => s.schema_type);
            const removedSchemas = Object.keys(config.selected_fields).filter(
              schemaType => !currentSchemaTypes.includes(schemaType) && config.selected_fields[schemaType].length > 0
            );
            
            return removedSchemas.length > 0 ? (
              <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded flex items-start gap-2 border border-blue-200">
                <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                <span>Schema configuration updated. {removedSchemas.length} schema(s) removed. Fields auto-synced.</span>
              </div>
            ) : null;
          })()}
          
          {isEnabled && destinationSchemas.length > 0 && (() => {
            return (
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">
                {destinationSchemas.length} schema(s) configured
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div className="text-center p-2 bg-white rounded border">
                  <div className="font-semibold text-sm">{totalSelectedCount}</div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Selected</div>
                </div>
                <div className="text-center p-2 bg-white rounded border">
                  <div className="font-semibold text-sm">{totalFieldsCount}</div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Total</div>
                </div>
              </div>

              {totalSelectedCount > 0 && (
                <div>
                  <Label className="text-xs">Schemas with Selected Fields</Label>
                  <div className="text-xs bg-muted px-2 py-1 rounded max-h-16 overflow-y-auto">
                    {Object.keys(config.selected_fields)
                      .filter(st => config.selected_fields[st].length > 0)
                      .map(st => getSchemaDisplayName(st))
                      .join(', ')}
                  </div>
                </div>
              )}
            </div>
            );
          })()}

          <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                disabled={!isEnabled || destinationSchemas.length === 0}
              >
                <Settings className="w-3 h-3 mr-1" />
                Configure Export Fields
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
              <DialogHeader>
                <DialogTitle>Export Fields Configuration</DialogTitle>
                <div className="text-sm text-muted-foreground">
                  Select fields from destination schemas to export
                </div>
              </DialogHeader>

              <div className="flex-1 min-h-0 space-y-4">
                {destinationSchemas.length === 0 ? (
                  <div className="text-center py-8">
                    <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground mb-1">No destination schemas configured</p>
                    <p className="text-xs text-muted-foreground">
                      Please configure the Destination Schema node first
                    </p>
                  </div>
                ) : (
                  <Tabs value={activeSchemaTab} onValueChange={setActiveSchemaTab} className="flex-1 flex flex-col">
                    <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${destinationSchemas.length}, 1fr)` }}>
                      {destinationSchemas.map((schema: any) => {
                        const schemaSelectedCount = (config.selected_fields[schema.schema_type] || []).length;
                        return (
                          <TabsTrigger key={schema.schema_type} value={schema.schema_type} className="text-xs">
                            {getSchemaDisplayName(schema.schema_type)}
                            {schemaSelectedCount > 0 && (
                              <Badge variant="secondary" className="ml-1 text-xs">
                                {schemaSelectedCount}
                              </Badge>
                            )}
                          </TabsTrigger>
                        );
                      })}
                    </TabsList>

                    {destinationSchemas.map((schema: any) => {
                      const schemaFields = schema.fields || [];
                      const schemaSelectedFields = config.selected_fields[schema.schema_type] || [];
                      const schemaRequiredCount = schemaFields.filter((f: any) => f.is_required).length;
                      const schemaTotalCount = schemaFields.filter((field: any) => {
                        if (field.is_array && hasNestedFields(schema.schema_type, field.field_name)) {
                          return false;
                        }
                        return true;
                      }).length;

                      return (
                        <TabsContent key={schema.schema_type} value={schema.schema_type} className="flex-1 flex flex-col space-y-4 mt-4">
                          {/* Selection Controls */}
                          <div className="flex gap-2 flex-wrap">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSelectAll(schema.schema_type)}
                              className="text-xs"
                            >
                              Select All ({schemaTotalCount})
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSelectRequired(schema.schema_type)}
                              className="text-xs"
                            >
                              Select Required ({schemaRequiredCount})
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSelectNone(schema.schema_type)}
                              className="text-xs"
                            >
                              Select None
                            </Button>
                          </div>

                          {/* Fields List */}
                          <div className="border rounded-md flex-1">
                            <ScrollArea className="h-96">
                              <div className="p-4 space-y-3">
                                {schemaFields.length === 0 ? (
                                  <div className="text-center py-8">
                                    <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                                    <p className="text-sm text-muted-foreground mb-1">No fields available</p>
                                  </div>
                                ) : (
                                  schemaFields.map((field: any) => {
                                    const isSelected = schemaSelectedFields.includes(field.field_name);
                                    const fieldHasNestedFields = hasNestedFields(schema.schema_type, field.field_name);
                                    const isArrayWithoutNested = field.is_array && !fieldHasNestedFields;
                                    
                                    return (
                                      <div
                                        key={field.field_name}
                                        className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${isSelected ? 'bg-green-50 border-green-200' : 'bg-white hover:bg-gray-50'
                                          } ${field.is_nested ? 'ml-6 border-l-4 border-l-blue-200' : ''}`}
                                      >
                                        <Checkbox
                                          id={`${schema.schema_type}-${field.field_name}`}
                                          checked={isSelected}
                                          onCheckedChange={(checked) =>
                                            handleFieldToggle(schema.schema_type, field.field_name, checked as boolean)
                                          }
                                          className="mt-0.5"
                                        />
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2 mb-1">
                                            <Label
                                              htmlFor={`${schema.schema_type}-${field.field_name}`}
                                              className="text-sm font-medium cursor-pointer truncate"
                                            >
                                              {field.field_name}
                                            </Label>
                                            <div className="flex gap-1 flex-shrink-0">
                                              <Badge
                                                variant="outline"
                                                className={`text-xs px-2 py-0 ${getFieldTypeColor(field.field_type)}`}
                                              >
                                                {field.field_type}
                                              </Badge>
                                              {field.is_required && (
                                                <Badge variant="destructive" className="text-xs px-2 py-0">
                                                  Required
                                                </Badge>
                                              )}
                                              {field.is_array && (
                                                <Badge variant="outline" className="text-xs px-2 py-0">
                                                  Array
                                                </Badge>
                                              )}
                                              {field.is_nested && (
                                                <Badge variant="outline" className="text-xs px-2 py-0 bg-blue-50">
                                                  Nested
                                                </Badge>
                                              )}
                                            </div>
                                          </div>
                                          {field.is_nested && field.parent_field && (
                                            <p className="text-xs text-blue-600 mb-1">
                                              ↳ Subfield of {field.parent_field}
                                            </p>
                                          )}
                                          {isArrayWithoutNested && (
                                            <p className="text-xs text-amber-600 mb-1">
                                              ⚠ Array field with no nested structure - selecting this field will include the entire array
                                            </p>
                                          )}
                                          {fieldHasNestedFields && (
                                            <p className="text-xs text-blue-600 mb-1">
                                              ℹ Array field with nested structure - nested fields shown below
                                            </p>
                                          )}
                                          {field.description && (
                                            <p className="text-xs text-muted-foreground">
                                              {field.description}
                                            </p>
                                          )}
                                          {field.enum_values && field.enum_values.length > 0 && (
                                            <div className="mt-1">
                                              <span className="text-xs text-muted-foreground">Values: </span>
                                              <span className="text-xs font-mono">
                                                {field.enum_values.slice(0, 3).join(', ')}
                                                {field.enum_values.length > 3 && ` +${field.enum_values.length - 3} more`}
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                            </ScrollArea>
                          </div>

                          {/* Summary for this schema */}
                          {schemaSelectedFields.length > 0 && (
                            <div className="bg-muted p-3 rounded-lg">
                              <div className="text-sm font-medium mb-2">Schema Export Summary</div>
                              <div className="grid grid-cols-3 gap-4 text-xs">
                                <div>
                                  <span className="text-muted-foreground">Selected:</span>
                                  <span className="ml-1 font-medium">{schemaSelectedFields.length} fields</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Total:</span>
                                  <span className="ml-1 font-medium">{schemaTotalCount} fields</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Format:</span>
                                  <span className="ml-1 font-medium">JSON</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </TabsContent>
                      );
                    })}
                  </Tabs>
                )}
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <Button
                  onClick={handleConfigSave}
                  className="flex-1"
                  disabled={totalSelectedCount === 0}
                >
                  <Check className="w-4 h-4 mr-2" />
                  Save Configuration ({totalSelectedCount} fields)
                </Button>
                <Button variant="outline" onClick={() => setIsConfigOpen(false)}>
                  <X className="w-4 h-4 mr-2" />
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
          className={`w-3 h-3 ${isEnabled ? '!bg-green-500' : '!bg-gray-400'}`}
        />
        <Handle
          type="source"
          position={Position.Right}
          isConnectable={isConnectable}
          className={`w-3 h-3 ${isEnabled ? '!bg-green-500' : '!bg-gray-400'}`}
        />
      </Card>
    </>
  );
};

export default ExportFieldsNode;