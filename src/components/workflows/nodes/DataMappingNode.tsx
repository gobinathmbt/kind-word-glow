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
import { MapPin, Settings, FileJson, Trash2, Plus, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { workflowServices } from '@/api/services';

const DataMappingNode = ({ data, isConnectable, id, onDataUpdate }: any) => {
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [config, setConfig] = useState(data.config || { mappings: [], sample_json: '' });
  const [sampleJson, setSampleJson] = useState('');
  const [parsedFields, setParsedFields] = useState<string[]>([]);
  const { toast } = useToast();

  // Get vehicle schema fields
  const { data: vehicleSchemaData } = useQuery({
    queryKey: ['vehicle-schema'],
    queryFn: () => workflowServices.getVehicleSchemaFields(),
  });

  const vehicleFields = vehicleSchemaData?.data?.fields || [];
  const requiredFields = vehicleFields.filter(field => field.is_required);

  useEffect(() => {
    setSampleJson(config.sample_json || '');
  }, [config.sample_json]);

  const parseSampleJSON = () => {
    try {
      const parsed = JSON.parse(sampleJson);
      const fields = extractFieldsFromObject(parsed, '');
      setParsedFields(fields);
      
      // Auto-map fields that match vehicle schema
      const autoMappings = fields.map(field => {
        const matchingVehicleField = vehicleFields.find(vf => 
          vf.field_name.toLowerCase() === field.toLowerCase() ||
          vf.field_name.toLowerCase().includes(field.toLowerCase()) ||
          field.toLowerCase().includes(vf.field_name.toLowerCase())
        );
        
        return {
          source_field: field,
          target_field: matchingVehicleField?.field_name || '',
          data_type: matchingVehicleField?.field_type || 'string',
          is_required: matchingVehicleField?.is_required || false,
          is_custom: !matchingVehicleField
        };
      });
      
      setConfig(prev => ({ 
        ...prev, 
        sample_json: sampleJson,
        mappings: autoMappings 
      }));
      
      toast({
        title: "JSON Parsed",
        description: `Found ${fields.length} fields, ${autoMappings.filter(m => m.target_field).length} auto-mapped`,
      });
    } catch (error) {
      toast({
        title: "Invalid JSON",
        description: "Please check your JSON syntax",
        variant: "destructive",
      });
    }
  };

  const extractFieldsFromObject = (obj: any, prefix = ''): string[] => {
    let fields: string[] = [];
    
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        
        if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
          fields = fields.concat(extractFieldsFromObject(obj[key], fullKey));
        } else {
          fields.push(fullKey);
        }
      }
    }
    
    return fields;
  };

  const updateMapping = (index: number, field: string, value: any) => {
    const updatedMappings = [...config.mappings];
    updatedMappings[index] = { ...updatedMappings[index], [field]: value };
    setConfig(prev => ({ ...prev, mappings: updatedMappings }));
  };

  const addMapping = () => {
    const newMapping = {
      source_field: '',
      target_field: '',
      data_type: 'string',
      is_required: false,
      is_custom: true
    };
    setConfig(prev => ({ 
      ...prev, 
      mappings: [...prev.mappings, newMapping] 
    }));
  };

  const removeMapping = (index: number) => {
    const updatedMappings = config.mappings.filter((_: any, i: number) => i !== index);
    setConfig(prev => ({ ...prev, mappings: updatedMappings }));
  };

  const handleConfigSave = () => {
    const requiredMissing = requiredFields.filter(rf => 
      !config.mappings.some((m: any) => m.target_field === rf.field_name && m.source_field)
    );
    
    if (requiredMissing.length > 0) {
      toast({
        title: "Missing Required Fields",
        description: `Please map: ${requiredMissing.map(f => f.field_name).join(', ')}`,
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
      description: `${config.mappings.length} field mappings saved`,
    });
  };

  const getMappingStats = () => {
    const total = config.mappings.length;
    const mapped = config.mappings.filter((m: any) => m.source_field && m.target_field).length;
    const custom = config.mappings.filter((m: any) => m.is_custom).length;
    return { total, mapped, custom };
  };

  const stats = getMappingStats();

  return (
    <>
      <Card className="w-80 border-2 border-purple-500 shadow-lg bg-purple-50/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <MapPin className="w-4 h-4 text-purple-600" />
            {data.label}
            <Badge variant="outline" className="ml-auto bg-purple-100">
              Mapping
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <div className="text-xs text-muted-foreground">
            Maps incoming JSON to vehicle schema
          </div>
          
          {stats.total > 0 && (
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="text-center">
                <div className="font-medium">{stats.total}</div>
                <div className="text-muted-foreground">Total</div>
              </div>
              <div className="text-center">
                <div className="font-medium text-green-600">{stats.mapped}</div>
                <div className="text-muted-foreground">Mapped</div>
              </div>
              <div className="text-center">
                <div className="font-medium text-blue-600">{stats.custom}</div>
                <div className="text-muted-foreground">Custom</div>
              </div>
            </div>
          )}

          <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="w-full">
                <Settings className="w-3 h-3 mr-1" />
                Configure Mapping
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh]">
              <DialogHeader>
                <DialogTitle>Data Mapping Configuration</DialogTitle>
              </DialogHeader>
              
              <div className="grid grid-cols-2 gap-6 h-[70vh]">
                {/* Sample JSON Input */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="sample_json">Sample JSON Payload</Label>
                    <Textarea
                      id="sample_json"
                      value={sampleJson}
                      onChange={(e) => setSampleJson(e.target.value)}
                      placeholder="Paste your sample JSON here..."
                      className="font-mono text-xs h-32"
                    />
                    <Button 
                      onClick={parseSampleJSON}
                      className="mt-2 w-full"
                      variant="outline"
                    >
                      <FileJson className="w-3 h-3 mr-1" />
                      Parse JSON & Auto-Map
                    </Button>
                  </div>

                  {parsedFields.length > 0 && (
                    <div>
                      <Label>Detected Fields ({parsedFields.length})</Label>
                      <ScrollArea className="h-40 border rounded p-2">
                        <div className="space-y-1">
                          {parsedFields.map((field, index) => (
                            <div key={index} className="text-xs font-mono bg-muted px-2 py-1 rounded">
                              {field}
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  )}
                </div>

                {/* Field Mappings */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Field Mappings</Label>
                    <Button variant="outline" size="sm" onClick={addMapping}>
                      <Plus className="w-3 h-3 mr-1" />
                      Add Mapping
                    </Button>
                  </div>

                  <ScrollArea className="h-96">
                    <div className="space-y-3">
                      {config.mappings.map((mapping: any, index: number) => (
                        <Card key={index} className="p-3">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <div className="flex-1">
                                <Label className="text-xs">Source Field</Label>
                                <Select 
                                  value={mapping.source_field}
                                  onValueChange={(value) => updateMapping(index, 'source_field', value)}
                                >
                                  <SelectTrigger className="h-8">
                                    <SelectValue placeholder="Select source field" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {parsedFields.map(field => (
                                      <SelectItem key={field} value={field}>
                                        {field}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeMapping(index)}
                                className="h-8 w-8 p-0"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>

                            <div>
                              <Label className="text-xs">Target Field (Vehicle Schema)</Label>
                              <Select 
                                value={mapping.target_field}
                                onValueChange={(value) => {
                                  const field = vehicleFields.find(f => f.field_name === value);
                                  updateMapping(index, 'target_field', value);
                                  updateMapping(index, 'data_type', field?.field_type || 'string');
                                  updateMapping(index, 'is_required', field?.is_required || false);
                                  updateMapping(index, 'is_custom', !field);
                                }}
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue placeholder="Select target field" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="custom_fields">Custom Fields</SelectItem>
                                  <Separator />
                                  {vehicleFields.map(field => (
                                    <SelectItem key={field.field_name} value={field.field_name}>
                                      <div className="flex items-center gap-2">
                                        <span>{field.field_name}</span>
                                        {field.is_required && (
                                          <AlertTriangle className="w-3 h-3 text-red-500" />
                                        )}
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="flex gap-2 text-xs">
                              <Badge variant={mapping.is_required ? "destructive" : "secondary"}>
                                {mapping.is_required ? "Required" : "Optional"}
                              </Badge>
                              <Badge variant="outline">
                                {mapping.data_type}
                              </Badge>
                              {mapping.is_custom && (
                                <Badge variant="outline" className="text-blue-600">
                                  Custom
                                </Badge>
                              )}
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleConfigSave} className="flex-1">
                  Save Mapping Configuration
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

export default DataMappingNode;