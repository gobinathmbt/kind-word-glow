import React, { useState, useEffect } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Settings, Download, Check, X, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const ExportFieldsNode = ({ data, isConnectable, id, onDataUpdate }: any) => {
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [config, setConfig] = useState(
    data.config || {
      selected_fields: [],
      export_format: 'json',
      include_metadata: false
    }
  );
  const { toast } = useToast();

  // Get schema fields from the target schema node (passed via data)
  const schemaFields = data.schemaFields || [];
  const schemaType = data.schemaType || '';

  // useEffect(() => {
  //   // Update config when schema fields change
  //   if (schemaFields.length > 0 && config.selected_fields.length === 0) {
  //     // Auto-select required fields by default
  //     const requiredFields = schemaFields
  //       .filter((field: any) => field.is_required)
  //       .map((field: any) => field.field_name);

  //     setConfig(prev => ({
  //       ...prev,
  //       selected_fields: requiredFields
  //     }));
  //   }
  // }, [schemaFields]);

  const handleFieldToggle = (fieldName: string, checked: boolean) => {
    const field = schemaFields.find((f: any) => f.field_name === fieldName);
    
    // Check if this is an array field with nested fields
    const hasNestedFields = field?.is_array && schemaFields.some((f: any) => 
      f.is_nested && f.parent_field === fieldName
    );
    
    setConfig(prev => {
      let newSelectedFields = [...prev.selected_fields];
      
      if (checked) {
        // Add the field
        newSelectedFields.push(fieldName);
        
        // If this is an array field WITH nested fields being unchecked,
        // we need to remove all its nested fields from selection
        if (hasNestedFields) {
          // Remove any nested fields that were previously selected
          const nestedFieldNames = schemaFields
            .filter((f: any) => f.is_nested && f.parent_field === fieldName)
            .map((f: any) => f.field_name);
          newSelectedFields = newSelectedFields.filter(f => !nestedFieldNames.includes(f));
        }
      } else {
        // Remove the field
        newSelectedFields = newSelectedFields.filter((f: string) => f !== fieldName);
        
        // If this is an array field WITH nested fields, also remove all nested fields
        if (hasNestedFields) {
          const nestedFieldNames = schemaFields
            .filter((f: any) => f.is_nested && f.parent_field === fieldName)
            .map((f: any) => f.field_name);
          newSelectedFields = newSelectedFields.filter(f => !nestedFieldNames.includes(f));
        }
      }
      
      return {
        ...prev,
        selected_fields: newSelectedFields
      };
    });
  };

  const handleSelectAll = () => {
    const allFieldNames = schemaFields.map((field: any) => field.field_name);
    setConfig(prev => ({
      ...prev,
      selected_fields: allFieldNames
    }));
  };

  const handleSelectNone = () => {
    setConfig(prev => ({
      ...prev,
      selected_fields: []
    }));
  };

  const handleSelectRequired = () => {
    const requiredFields = schemaFields
      .filter((field: any) => field.is_required)
      .map((field: any) => field.field_name);

    setConfig(prev => ({
      ...prev,
      selected_fields: requiredFields
    }));
  };

  const isParentSelected = (parentName: string) => {
    return config.selected_fields.includes(parentName);
  };

  const hasNestedFields = (fieldName: string) => {
    return schemaFields.some((f: any) => f.is_nested && f.parent_field === fieldName);
  };

  const shouldCountField = (fieldName: string) => {
    const field = schemaFields.find((f: any) => f.field_name === fieldName);
    
    // If it's a nested field, always count it
    if (field?.is_nested) {
      return true;
    }
    
    // If it's an array field WITHOUT nested fields, count it
    if (field?.is_array && !hasNestedFields(fieldName)) {
      return true;
    }
    
    // If it's an array field WITH nested fields, don't count the parent
    if (field?.is_array && hasNestedFields(fieldName)) {
      return false;
    }
    
    // For all other fields (non-array), count them
    return true;
  };

  const handleConfigSave = () => {
    if (config.selected_fields.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please select at least one field to export",
        variant: "destructive",
      });
      return;
    }

    if (onDataUpdate) {
      onDataUpdate(id, { config });
    }
    setIsConfigOpen(false);
    toast({
      title: "Export Fields Configured",
      description: `${config.selected_fields.length} fields selected for export`,
    });
  };

  const getSchemaLabel = () => {
    switch (schemaType) {
      case 'vehicle': return 'Vehicle Schema';
      case 'master_vehicle': return 'Master Vehicle Schema';
      case 'advertise_vehicle': return 'Advertise Vehicle Schema';
      default: return 'Schema Fields';
    }
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

  // Calculate selected count - only count fields that should be counted
  const selectedCount = config.selected_fields.filter((fieldName: string) => 
    shouldCountField(fieldName)
  ).length;
  
  // Calculate total count - only count fields that should be counted
  const totalCount = schemaFields.filter((field: any) => {
    // Don't count array fields with nested fields (parent containers)
    if (field.is_array && hasNestedFields(field.field_name)) {
      return false;
    }
    return true;
  }).length;
  
  const requiredCount = schemaFields.filter((field: any) => field.is_required).length;
  const selectedRequiredCount = config.selected_fields.filter((fieldName: string) =>
    schemaFields.find((field: any) => field.field_name === fieldName)?.is_required
  ).length;

  return (
    <>
      <Card className="w-80 border-2 border-green-500 shadow-lg bg-green-50/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Download className="w-4 h-4 text-green-600" />
            {data.label}
            <Badge variant="outline" className="ml-auto bg-green-100">
              Export
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <div className="text-xs text-muted-foreground">
            {getSchemaLabel()}
          </div>

          {schemaFields.length === 0 ? (
            <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded flex items-start gap-2 border border-amber-200">
              <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />
              <span>No schema selected in Target Schema node</span>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="text-center p-2 bg-white rounded border">
                  <div className="font-semibold text-sm">{selectedCount}</div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Selected</div>
                </div>
                <div className="text-center p-2 bg-white rounded border">
                  <div className="font-semibold text-sm">{totalCount}</div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Total</div>
                </div>
              </div>

              {requiredCount > 0 && (
                <div className="text-xs">
                  <span className="text-muted-foreground">Required fields: </span>
                  <span className={selectedRequiredCount === requiredCount ? 'text-green-600' : 'text-red-600'}>
                    {selectedRequiredCount}/{requiredCount}
                  </span>
                </div>
              )}

              {selectedCount > 0 && (
                <div>
                  <Label className="text-xs">Selected Fields Preview</Label>
                  <div className="text-xs bg-muted px-2 py-1 rounded max-h-16 overflow-y-auto">
                    {config.selected_fields.slice(0, 3).join(', ')}
                    {config.selected_fields.length > 3 && ` +${config.selected_fields.length - 3} more`}
                  </div>
                </div>
              )}
            </div>
          )}

          <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                disabled={schemaFields.length === 0}
              >
                <Settings className="w-3 h-3 mr-1" />
                Configure Export Fields
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
              <DialogHeader>
                <DialogTitle>Export Fields Configuration</DialogTitle>
                <div className="text-sm text-muted-foreground">
                  Select fields from {getSchemaLabel()} to export
                </div>
              </DialogHeader>

              <div className="flex-1 min-h-0 space-y-4">
                {/* Selection Controls */}
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAll}
                    className="text-xs"
                  >
                    Select All ({totalCount})
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSelectRequired}
                    className="text-xs"
                  >
                    Select Required ({requiredCount})
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSelectNone}
                    className="text-xs"
                  >
                    Select None
                  </Button>
                </div>

                {/* Fields List */}
                <div className="border rounded-md">
                  <ScrollArea className="h-96">
                    <div className="p-4 space-y-3">
                      {schemaFields.length === 0 ? (
                        <div className="text-center py-8">
                          <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                          <p className="text-sm text-muted-foreground mb-1">No schema fields available</p>
                          <p className="text-xs text-muted-foreground">
                            Please configure the Target Schema node first
                          </p>
                        </div>
                      ) : (
                        schemaFields.filter((field: any) => {
                          // Show nested fields only if parent is selected
                          if (field.is_nested && field.parent_field) {
                            return isParentSelected(field.parent_field);
                          }
                          return true;
                        }).map((field: any) => {
                          const isSelected = config.selected_fields.includes(field.field_name);
                          const fieldHasNestedFields = hasNestedFields(field.field_name);
                          const isArrayWithoutNested = field.is_array && !fieldHasNestedFields;
                          
                          return (
                            <div
                              key={field.field_name}
                              className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${isSelected ? 'bg-green-50 border-green-200' : 'bg-white hover:bg-gray-50'
                                } ${field.is_nested ? 'ml-6 border-l-4 border-l-blue-200' : ''}`}
                            >
                              <Checkbox
                                id={field.field_name}
                                checked={isSelected}
                                onCheckedChange={(checked) =>
                                  handleFieldToggle(field.field_name, checked as boolean)
                                }
                                className="mt-0.5"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <Label
                                    htmlFor={field.field_name}
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
                                    ℹ Array field with nested structure - select this to reveal nested fields
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

                {/* Summary */}
                {selectedCount > 0 && (
                  <div className="bg-muted p-3 rounded-lg">
                    <div className="text-sm font-medium mb-2">Export Summary</div>
                    <div className="grid grid-cols-3 gap-4 text-xs">
                      <div>
                        <span className="text-muted-foreground">Selected:</span>
                        <span className="ml-1 font-medium">{selectedCount} fields</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Required:</span>
                        <span className={`ml-1 font-medium ${selectedRequiredCount === requiredCount ? 'text-green-600' : 'text-red-600'
                          }`}>
                          {selectedRequiredCount}/{requiredCount}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Format:</span>
                        <span className="ml-1 font-medium">JSON</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <Button
                  onClick={handleConfigSave}
                  className="flex-1"
                  disabled={config.selected_fields.length === 0}
                >
                  <Check className="w-4 h-4 mr-2" />
                  Save Configuration
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
          className="w-3 h-3 !bg-green-500"
        />
        <Handle
          type="source"
          position={Position.Right}
          isConnectable={isConnectable}
          className="w-3 h-3 !bg-green-500"
        />
      </Card>
    </>
  );
};

export default ExportFieldsNode;