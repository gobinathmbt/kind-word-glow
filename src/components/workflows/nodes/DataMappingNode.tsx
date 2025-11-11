import React, { useState, useEffect } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MapPin, Settings, Trash2, Plus, AlertTriangle, Code, Check, X, FileJson } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { workflowServices } from '@/api/services';

const DataMappingNode = ({ data, isConnectable, id, onDataUpdate, workflowType }: any) => {
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [config, setConfig] = useState(data.config || {
    mappings: [],
    sample_json: '',
    transformation_rules: []
  });
  const [sampleJson, setSampleJson] = useState('');
  const [parsedFields, setParsedFields] = useState<any[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [jsonError, setJsonError] = useState<string>('');
  const [isJsonEditing, setIsJsonEditing] = useState(false);
  const { toast } = useToast();

  // Check if schema is selected (for vehicle_outbound workflows)
  const isSchemaSelected = workflowType === 'vehicle_outbound' ? (data.isSchemaSelected || false) : true;
  const schemaType = data.schemaType || '';

  // Get vehicle schema fields
  const { data: vehicleSchemaData } = useQuery({
    queryKey: ['vehicle-schema'],
    queryFn: () => workflowServices.getVehicleSchemaFields(),
  });

  const vehicleFields = vehicleSchemaData?.data?.data?.fields || [];
  const requiredFields = vehicleFields.filter(field => field.is_required);

  useEffect(() => {
    setSampleJson(config.sample_json || '');
  }, [config.sample_json]);

  // Auto-parse JSON when it changes (with debounce to prevent lag)
  useEffect(() => {
    if (!sampleJson.trim()) {
      setParsedFields([]);
      setJsonError('');
      return;
    }

    // Debounce JSON parsing to prevent lag during typing
    const timeoutId = setTimeout(() => {
      try {
        const parsed = JSON.parse(sampleJson);
        const fields = extractFieldsFromObject(parsed, '', parsed);
        setParsedFields(fields);
        setJsonError('');

        // Auto-map fields only if we don't have mappings yet or if mappings are empty
        if (config.mappings.length === 0) {
          const autoMappings = autoMapFields(fields);
          setConfig(prev => ({
            ...prev,
            sample_json: sampleJson,
            mappings: autoMappings
          }));
          validateMappings(autoMappings);
        } else {
          // Just update the sample_json in config
          setConfig(prev => ({
            ...prev,
            sample_json: sampleJson
          }));
        }
      } catch (error) {
        setJsonError('Invalid JSON syntax. Please check your JSON format.');
        setParsedFields([]);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [sampleJson]);

  const extractFieldsFromObject = (obj: any, prefix = '', rootObj: any): any[] => {
    let fields: any[] = [];

    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        const value = obj[key];

        if (Array.isArray(value)) {
          if (value.length > 0 && typeof value[0] === 'object' && value[0] !== null) {
            fields.push({
              path: fullKey,
              type: 'array',
              isArray: true,
              sample_value: value,
              children: extractFieldsFromObject(value[0], fullKey, rootObj)
            });
          } else {
            fields.push({
              path: fullKey,
              type: typeof value[0],
              isArray: true,
              sample_value: value
            });
          }
        } else if (typeof value === 'object' && value !== null) {
          fields.push({
            path: fullKey,
            type: 'object',
            isArray: false,
            sample_value: value
          });
          fields = fields.concat(extractFieldsFromObject(value, fullKey, rootObj));
        } else {
          fields.push({
            path: fullKey,
            type: typeof value,
            isArray: false,
            sample_value: value
          });
        }
      }
    }

    return fields;
  };

  const autoMapFields = (fields: any[]) => {
    const mappings: any[] = [];
    const unmappedFields: any[] = [];

    fields.forEach(field => {
      if (field.type === 'object' && !field.isArray) {
        return;
      }

      const fieldName = field.path.split('.').pop();
      const matchingVehicleField = findMatchingField(fieldName, field, vehicleFields);

      if (matchingVehicleField) {
        // For outbound workflows, reverse the mapping direction
        // source_field should be the external field name (from JSON)
        // target_field should be the internal field name (from vehicle schema)
        if (workflowType === 'vehicle_outbound') {
          mappings.push({
            source_field: field.path, // External field name (e.g., "vehicle_id")
            target_field: matchingVehicleField.field_name, // Internal field name (e.g., "vehicle_stock_id")
            data_type: matchingVehicleField.field_type,
            is_required: matchingVehicleField.is_required || false,
            is_array: matchingVehicleField.is_array || field.isArray,
            is_custom: false,
            transformation: 'direct',
            sample_value: field.sample_value
          });
        } else {
          // For inbound workflows, keep the original mapping direction
          mappings.push({
            source_field: field.path,
            target_field: matchingVehicleField.field_name,
            data_type: matchingVehicleField.field_type,
            is_required: matchingVehicleField.is_required || false,
            is_array: matchingVehicleField.is_array || field.isArray,
            is_custom: false,
            transformation: 'direct',
            sample_value: field.sample_value
          });
        }
      } else {
        unmappedFields.push(field);
      }
    });

    unmappedFields.forEach(field => {
      mappings.push({
        source_field: field.path,
        target_field: 'custom_fields',
        data_type: field.type,
        is_required: false,
        is_array: field.isArray,
        is_custom: true,
        transformation: 'custom',
        custom_field_key: field.path.split('.').pop(),
        sample_value: field.sample_value
      });
    });

    return mappings;
  };

  const findMatchingField = (fieldName: string, sourceField: any, schemaFields: any[]) => {
    const normalizedName = fieldName?.toLowerCase();

    let match = schemaFields.find(f => f.field_name.toLowerCase() === normalizedName);
    if (match) return match;

    match = schemaFields.find(f =>
      f.field_name.toLowerCase().includes(normalizedName) ||
      normalizedName?.includes(f.field_name.toLowerCase())
    );
    if (match) return match;

    const specialMappings: any = {
      'license_plate': 'plate_no',
      'registration': 'plate_no',
      'engine_capacity': 'vehicle_eng_transmission',
      'mileage': 'vehicle_other_details',
      'odometer': 'vehicle_other_details',
      'color': 'vehicle_specifications',
      'features': 'vehicle_specifications'
    };

    if (specialMappings[normalizedName]) {
      return schemaFields.find(f => f.field_name === specialMappings[normalizedName]);
    }

    return null;
  };

  const validateMappings = (mappings: any[]) => {
    const errors: string[] = [];

    requiredFields.forEach(rf => {
      const isMapped = mappings.some(m =>
        m.target_field === rf.field_name &&
        m.source_field &&
        !m.is_custom
      );
      if (!isMapped) {
        errors.push(`Required field "${rf.field_name}" is not mapped`);
      }
    });

    const targetFields = mappings
      .filter(m => !m.is_custom)
      .map(m => m.target_field);
    const duplicates = targetFields.filter((item, index) =>
      targetFields.indexOf(item) !== index
    );
    if (duplicates.length > 0) {
      errors.push(`Duplicate mappings found: ${[...new Set(duplicates)].join(', ')}`);
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const updateMapping = (index: number, field: string, value: any) => {
    const updatedMappings = [...config.mappings];
    updatedMappings[index] = { ...updatedMappings[index], [field]: value };

    if (field === 'target_field') {
      const vehicleField = vehicleFields.find(f => f.field_name === value);
      if (vehicleField) {
        updatedMappings[index].is_custom = false;
        updatedMappings[index].data_type = vehicleField.field_type;
        updatedMappings[index].is_required = vehicleField.is_required;
      } else if (value === 'custom_fields') {
        updatedMappings[index].is_custom = true;
      }
    }

    setConfig(prev => ({ ...prev, mappings: updatedMappings }));
    validateMappings(updatedMappings);
  };

  const addMapping = () => {
    const newMapping = {
      source_field: '',
      target_field: '',
      data_type: 'string',
      is_required: false,
      is_array: false,
      is_custom: true,
      transformation: 'direct',
      custom_field_key: ''
    };
    setConfig(prev => ({
      ...prev,
      mappings: [...prev.mappings, newMapping]
    }));
  };

  const removeMapping = (index: number) => {
    const updatedMappings = config.mappings.filter((_: any, i: number) => i !== index);
    setConfig(prev => ({ ...prev, mappings: updatedMappings }));
    validateMappings(updatedMappings);
  };

  const remapFields = () => {
    if (parsedFields.length > 0) {
      const autoMappings = autoMapFields(parsedFields);
      setConfig(prev => ({
        ...prev,
        mappings: autoMappings
      }));
      validateMappings(autoMappings);
      toast({
        title: "Fields Remapped",
        description: `${autoMappings.length} fields automatically mapped`,
      });
    }
  };

  const handleConfigSave = () => {
    if (!validateMappings(config.mappings)) {
      toast({
        title: "Validation Failed",
        description: "Please fix the mapping errors before saving",
        variant: "destructive",
      });
      return;
    }

    if (onDataUpdate) {
      onDataUpdate(id, { config });
    }
    setIsConfigOpen(false);
    toast({
      title: "Mapping Configured",
      description: `${config.mappings.length} field mappings saved successfully`,
    });
  };

  const getMappingStats = () => {
    const total = config.mappings.length;
    const mapped = config.mappings.filter((m: any) =>
      m.source_field && m.target_field && !m.is_custom
    ).length;
    const custom = config.mappings.filter((m: any) => m.is_custom).length;
    const required = config.mappings.filter((m: any) => m.is_required).length;
    return { total, mapped, custom, required };
  };

  const getFieldDisplayName = (path: string) => {
    return path.split('.').pop() || path;
  };

  const stats = getMappingStats();

  return (
    <>
      <Card className="w-80 border-2 border-purple-500 shadow-lg bg-purple-50/50">
        <CardHeader className="pb-3 px-4 pt-3">
          <CardTitle className="text-sm flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <MapPin className="w-4 h-4 text-purple-600 flex-shrink-0" />
              <span className="truncate">{data.label}</span>
            </div>
            <Badge variant="outline" className="bg-purple-100 flex-shrink-0 text-xs">
              Mapping
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-3 px-4 pb-4">
          <p className="text-xs text-muted-foreground leading-relaxed">
            {workflowType === 'vehicle_outbound'
              ? 'Maps vehicle schema fields to external system field names'
              : 'Maps incoming JSON to vehicle schema with custom field support'
            }
          </p>

          {stats.total > 0 && (
            <div className="grid grid-cols-2 gap-2">
              <div className="text-center p-2 bg-white rounded border">
                <div className="font-semibold text-sm">{stats.total}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Total</div>
              </div>
              <div className="text-center p-2 bg-white rounded border">
                <div className="font-semibold text-sm text-green-600">{stats.mapped}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Mapped</div>
              </div>
              <div className="text-center p-2 bg-white rounded border">
                <div className="font-semibold text-sm text-blue-600">{stats.custom}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Custom</div>
              </div>
              <div className="text-center p-2 bg-white rounded border">
                <div className="font-semibold text-sm text-red-600">{stats.required}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Required</div>
              </div>
            </div>
          )}

          {workflowType === 'vehicle_outbound' && !isSchemaSelected && (
            <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded flex items-start gap-2 border border-amber-200">
              <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />
              <span className="leading-relaxed">
                Please select a Target Schema first before configuring data mapping
              </span>
            </div>
          )}

          {validationErrors.length > 0 && (
            <div className="text-xs text-red-600 bg-red-50 p-2 rounded flex items-start gap-2 border border-red-200">
              <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />
              <span className="leading-relaxed">
                {validationErrors.length} validation error{validationErrors.length > 1 ? 's' : ''}
              </span>
            </div>
          )}

          <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
            <DialogTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full text-xs h-8"
                disabled={workflowType === 'vehicle_outbound' && !isSchemaSelected}
              >
                <Settings className="w-3 h-3 mr-1.5" />
                Configure Mapping
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col p-0">
              <DialogHeader className="px-6 pt-6 pb-4">
                <DialogTitle>
                  {workflowType === 'vehicle_outbound' ? 'Field Mapping Configuration (Outbound)' : 'Data Mapping Configuration'}
                </DialogTitle>
              </DialogHeader>

              <Tabs defaultValue="json" className="flex-1 flex flex-col min-h-0 px-6">
                <TabsList className="grid w-full grid-cols-3 mb-4">
                  <TabsTrigger value="json" className="text-xs">Sample JSON & Fields</TabsTrigger>
                  <TabsTrigger value="mapping" className="text-xs">Field Mappings</TabsTrigger>
                  <TabsTrigger value="preview" className="text-xs">Preview</TabsTrigger>
                </TabsList>

                <TabsContent value="json" className="flex-1 min-h-0 mt-0">
                  <ScrollArea className="h-[calc(90vh-240px)]">
                    <div className="space-y-4 pr-4">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <Label htmlFor="sample_json" className="text-sm">Sample JSON Payload</Label>
                          {parsedFields.length > 0 && (
                            <Button
                              onClick={remapFields}
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs"
                            >
                              <FileJson className="w-3 h-3 mr-1.5" />
                              Re-map All Fields
                            </Button>
                          )}
                        </div>
                        <Textarea
                          id="sample_json"
                          value={sampleJson}
                          onChange={(e) => {
                            setIsJsonEditing(true);
                            setSampleJson(e.target.value);
                          }}
                          onBlur={() => setIsJsonEditing(false)}
                          placeholder='{"vehicle": {"make": "Toyota", "model": "Camry", "year": 2024}}'
                          className="font-mono text-xs h-64 resize-none"
                          spellCheck={false}
                        />
                        {jsonError && (
                          <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded flex items-start gap-2 border border-red-200">
                            <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                            <span>{jsonError}</span>
                          </div>
                        )}
                        {!jsonError && parsedFields.length > 0 && (
                          <div className="mt-2 text-xs text-green-600 bg-green-50 p-2 rounded flex items-start gap-2 border border-green-200">
                            <Check className="w-3 h-3 flex-shrink-0 mt-0.5" />
                            <span>Valid JSON - {parsedFields.length} fields detected</span>
                          </div>
                        )}
                      </div>

                      {parsedFields.length > 0 && (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <Label className="text-sm">Detected Fields ({parsedFields.length})</Label>
                            <Badge variant="outline" className="text-xs">
                              Auto-extracted
                            </Badge>
                          </div>
                          <div className="border rounded-md">
                            <ScrollArea className="h-64">
                              <div className="space-y-1 p-2">
                                {parsedFields.map((field, index) => (
                                  <div key={index} className="text-xs font-mono bg-muted px-3 py-2 rounded flex justify-between items-center gap-2 hover:bg-muted/80 transition-colors">
                                    <span className="truncate flex-1">{field.path}</span>
                                    <div className="flex gap-1 flex-shrink-0">
                                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                        {field.type}
                                      </Badge>
                                      {field.isArray && (
                                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                          array
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </ScrollArea>
                          </div>
                        </div>
                      )}

                      {!sampleJson.trim() && (
                        <div className="border border-dashed rounded-lg p-8 text-center">
                          <FileJson className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                          <p className="text-sm text-muted-foreground mb-1">No sample JSON provided</p>
                          <p className="text-xs text-muted-foreground">
                            Paste your JSON above to automatically detect and map fields
                          </p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="mapping" className="flex-1 min-h-0 mt-0">
                  <div className="flex flex-col h-[calc(90vh-240px)]">
                    <div className="flex items-center justify-between mb-4 flex-shrink-0">
                      <div>
                        <Label className="text-sm">Field Mappings ({config.mappings.length})</Label>
                        {validationErrors.length > 0 && (
                          <p className="text-xs text-red-600 mt-1">
                            {validationErrors.length} validation error(s) found
                          </p>
                        )}
                      </div>
                      <Button variant="outline" size="sm" onClick={addMapping}>
                        <Plus className="w-3 h-3 mr-1.5" />
                        Add Mapping
                      </Button>
                    </div>

                    <ScrollArea className="flex-1">
                      <div className="space-y-3 pr-4">
                        {config.mappings.length === 0 ? (
                          <div className="border border-dashed rounded-lg p-8 text-center">
                            <MapPin className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                            <p className="text-sm text-muted-foreground mb-1">No mappings configured</p>
                            <p className="text-xs text-muted-foreground mb-4">
                              Add sample JSON in the first tab to auto-generate mappings
                            </p>
                            <Button variant="outline" size="sm" onClick={addMapping}>
                              <Plus className="w-3 h-3 mr-1.5" />
                              Add Manual Mapping
                            </Button>
                          </div>
                        ) : (
                          config.mappings.map((mapping: any, index: number) => (
                            <Card key={index} className={`p-4 ${mapping.is_required && !mapping.source_field ? 'border-red-500' : ''}`}>
                              <div className="space-y-3">
                                <div className="flex items-start gap-3">
                                  <div className="flex-1 space-y-3 min-w-0">
                                    <div>
                                      <Label className="text-xs mb-1.5 block">
                                        {workflowType === 'vehicle_outbound' ? 'External Field (JSON)' : 'Source Field (JSON Path)'}
                                      </Label>
                                      <Select
                                        value={mapping.source_field}
                                        onValueChange={(value) => updateMapping(index, 'source_field', value)}
                                      >
                                        <SelectTrigger className="h-9 text-xs">
                                          <SelectValue placeholder="Select source field" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {parsedFields.length === 0 ? (
                                            <SelectItem value="__placeholder__" disabled className="text-xs text-muted-foreground">
                                              Add sample JSON to see fields
                                            </SelectItem>
                                          ) : (
                                            parsedFields.map(field => (
                                              <SelectItem key={field.path} value={field.path} className="text-xs">
                                                <div className="flex items-center gap-2">
                                                  <span className="font-mono truncate">{field.path}</span>
                                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 flex-shrink-0">
                                                    {field.type}
                                                  </Badge>
                                                </div>
                                              </SelectItem>
                                            ))
                                          )}
                                        </SelectContent>
                                      </Select>
                                    </div>

                                    <div>
                                      <Label className="text-xs mb-1.5 block">
                                        {workflowType === 'vehicle_outbound' ? 'Internal Field (Vehicle Schema)' : 'Target Field (Vehicle Schema)'}
                                      </Label>
                                      <Select
                                        value={mapping.target_field}
                                        onValueChange={(value) => updateMapping(index, 'target_field', value)}
                                      >
                                        <SelectTrigger className="h-9 text-xs">
                                          <SelectValue placeholder="Select target field" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="custom_fields" className="text-xs">
                                            <div className="flex items-center gap-2">
                                              <Code className="w-3 h-3" />
                                              <span>Custom Fields</span>
                                            </div>
                                          </SelectItem>
                                          <Separator />
                                          {vehicleFields.map(field => (
                                            <SelectItem key={field.field_name} value={field.field_name} className="text-xs">
                                              <div className="flex items-center gap-2">
                                                <span className={`truncate ${field.is_nested ? 'ml-4 text-blue-600' : ''}`}>
                                                  {field.field_name}
                                                </span>
                                                {field.is_required && (
                                                  <AlertTriangle className="w-3 h-3 text-red-500 flex-shrink-0" />
                                                )}
                                                {field.is_array && (
                                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 flex-shrink-0">[]</Badge>
                                                )}
                                                {field.is_nested && (
                                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 flex-shrink-0 bg-blue-50">nested</Badge>
                                                )}
                                              </div>
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>

                                    {mapping.target_field === 'custom_fields' && (
                                      <div className="bg-blue-50 p-3 rounded-md border border-blue-200">
                                        <Label className="text-xs mb-1.5 block font-semibold text-blue-900">Custom Field Key</Label>
                                        <Input
                                          value={mapping.custom_field_key || ''}
                                          onChange={(e) => updateMapping(index, 'custom_field_key', e.target.value)}
                                          placeholder="Enter custom field key"
                                          className="h-9 text-xs bg-white"
                                        />
                                        <p className="text-[10px] text-blue-700 mt-1.5 flex items-start gap-1">
                                          <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                                          <span>Field not found in schema — will be stored in custom_fields</span>
                                        </p>
                                      </div>
                                    )}
                                  </div>

                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeMapping(index)}
                                    className="h-9 w-9 p-0 flex-shrink-0"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </div>

                                <div className="flex gap-1.5 flex-wrap">
                                  <Badge variant={mapping.is_required ? "destructive" : "secondary"} className="text-[10px] px-2 py-0.5">
                                    {mapping.is_required ? "Required" : "Optional"}
                                  </Badge>
                                  <Badge variant="outline" className="text-[10px] px-2 py-0.5">
                                    {mapping.data_type}
                                  </Badge>
                                  {mapping.is_array && (
                                    <Badge variant="outline" className="text-[10px] px-2 py-0.5">Array</Badge>
                                  )}
                                  {mapping.is_custom && (
                                    <Badge variant="outline" className="bg-blue-50 text-[10px] px-2 py-0.5">
                                      Custom Field
                                    </Badge>
                                  )}
                                  {mapping.sample_value && (
                                    <Badge variant="outline" className="text-[10px] px-2 py-0.5 max-w-[200px]">
                                      <span className="truncate">
                                        Sample: {JSON.stringify(mapping.sample_value).slice(0, 30)}...
                                      </span>
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </Card>
                          ))
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                </TabsContent>

                <TabsContent value="preview" className="flex-1 min-h-0 mt-0">
                  <ScrollArea className="h-[calc(90vh-240px)]">
                    <div className="space-y-3 pr-4">
                      <Card className="p-4">
                        <h3 className="font-semibold text-sm mb-3">Validation Status</h3>
                        {validationErrors.length === 0 ? (
                          <div className="flex items-center gap-2 text-green-600">
                            <Check className="w-4 h-4 flex-shrink-0" />
                            <span className="text-sm">All validations passed</span>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {validationErrors.map((error, index) => (
                              <div key={index} className="flex items-start gap-2 text-red-600">
                                <X className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                <span className="text-sm break-words">{error}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </Card>

                      <Card className="p-4">
                        <h3 className="font-semibold text-sm mb-3">Schema Mappings</h3>
                        <div className="space-y-2">
                          {config.mappings.filter((m: any) => !m.is_custom).length > 0 ? (
                            config.mappings.filter((m: any) => !m.is_custom).map((mapping: any, index: number) => (
                              <div key={index} className="text-xs font-mono bg-muted p-2 rounded break-all">
                                <div className="flex items-center gap-2 flex-wrap">
                                  {workflowType === 'vehicle_outbound' ? (
                                    <>
                                      <span className="text-green-600">{mapping.target_field}</span>
                                      <span className="flex-shrink-0">→</span>
                                      <span className="text-blue-600">{mapping.source_field}</span>
                                    </>
                                  ) : (
                                    <>
                                      <span className="text-blue-600">{mapping.source_field}</span>
                                      <span className="flex-shrink-0">→</span>
                                      <span className="text-green-600">{mapping.target_field}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-xs text-muted-foreground">No schema mappings configured</p>
                          )}
                        </div>
                      </Card>

                      <Card className="p-4">
                        <h3 className="font-semibold text-sm mb-3">Custom Fields</h3>
                        <div className="space-y-2">
                          {config.mappings.filter((m: any) => m.is_custom).length > 0 ? (
                            config.mappings.filter((m: any) => m.is_custom).map((mapping: any, index: number) => (
                              <div key={index} className="text-xs font-mono bg-muted p-2 rounded break-all">
                                <div className="flex items-center gap-2 flex-wrap">
                                  {workflowType === 'vehicle_outbound' ? (
                                    <>
                                      <span className="text-purple-600">custom_fields.{mapping.custom_field_key || getFieldDisplayName(mapping.source_field)}</span>
                                      <span className="flex-shrink-0">→</span>
                                      <span className="text-blue-600">{mapping.source_field}</span>
                                    </>
                                  ) : (
                                    <>
                                      <span className="text-blue-600">{mapping.source_field}</span>
                                      <span className="flex-shrink-0">→</span>
                                      <span className="text-purple-600">custom_fields.{mapping.custom_field_key || getFieldDisplayName(mapping.source_field)}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-xs text-muted-foreground">No custom fields configured</p>
                          )}
                        </div>
                      </Card>

                      {parsedFields.length > 0 && (
                        <Card className="p-4">
                          <h3 className="font-semibold text-sm mb-3">Sample JSON Structure</h3>
                          <div className="bg-muted rounded p-3">
                            <pre className="text-xs font-mono whitespace-pre-wrap break-all">
                              {JSON.stringify(JSON.parse(sampleJson || '{}'), null, 2)}
                            </pre>
                          </div>
                        </Card>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>

              <div className="flex gap-3 px-6 py-4 border-t bg-muted/30 flex-shrink-0">
                <Button onClick={handleConfigSave} className="flex-1 text-sm h-9" disabled={validationErrors.length > 0}>
                  <Check className="w-3.5 h-3.5 mr-2" />
                  Save Mapping Configuration
                </Button>
                <Button variant="outline" onClick={() => setIsConfigOpen(false)} className="text-sm h-9">
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

export default DataMappingNode;