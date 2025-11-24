import React, { useState, useEffect } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Settings, Database, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { workflowServices } from '@/api/services';

const SchemaSelectionNode = ({ data, isConnectable, id, onDataUpdate, workflowType }: any) => {
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [config, setConfig] = useState(
    data.config || {
      schema_type: ""
    }
  );
  const { toast } = useToast();

  // Fetch available schemas
  const { data: availableSchemas, isLoading: isSchemasLoading } = useQuery({
    queryKey: ['available-schemas', workflowType],
    queryFn: () => workflowServices.getAvailableSchemas(workflowType),
  });

  // Schemas are already filtered by the backend based on workflow type
  // For Vehicle Inbound: backend returns only vehicle, master_vehicle, and advertise_vehicle
  const filteredSchemas = React.useMemo(() => {
    return availableSchemas?.data?.data?.schemas || [];
  }, [availableSchemas]);

  const handleConfigSave = () => {
    if (!config.schema_type) {
      toast({
        title: "Validation Error",
        description: "Please select a schema",
        variant: "destructive",
      });
      return;
    }

    if (onDataUpdate) {
      onDataUpdate(id, { config });
    }
    setIsConfigOpen(false);
    
    const selectedSchema = filteredSchemas.find((s: any) => s.schema_type === config.schema_type);
    
    toast({
      title: "Schema Selected",
      description: `Schema "${selectedSchema?.display_name || config.schema_type}" configured successfully`,
    });
  };

  const getSchemaLabel = () => {
    if (!config.schema_type) return 'No schema selected';
    
    const selectedSchema = filteredSchemas.find((s: any) => s.schema_type === config.schema_type);
    return selectedSchema ? selectedSchema.display_name : config.schema_type;
  };

  return (
    <>
      <Card className="w-80 border-2 border-blue-500 shadow-lg bg-blue-50/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Database className="w-4 h-4 text-blue-600" />
            {data.label}
            <Badge variant="outline" className="ml-auto bg-blue-100">
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
                <Label className="text-xs">Selected Schema</Label>
                <div className="text-xs bg-muted px-2 py-1 rounded">
                  {getSchemaLabel()}
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
            <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
              <DialogHeader>
                <DialogTitle>Schema Selection Configuration</DialogTitle>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                <div>
                  <Label>Select Target Schema</Label>
                  <Select
                    value={config.schema_type}
                    onValueChange={(value) => setConfig({ schema_type: value })}
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
                      ) : filteredSchemas && filteredSchemas.length > 0 ? (
                        filteredSchemas.map((schema: any) => (
                          <SelectItem key={schema.schema_type} value={schema.schema_type}>
                            {schema.display_name}
                          </SelectItem>
                        ))
                      ) : (
                        <div className="p-4 text-sm text-muted-foreground text-center">
                          {workflowType === 'vehicle_inbound' 
                            ? 'No vehicle schemas available (Vehicle, Master Vehicle, Advertise Vehicle)'
                            : 'No schemas available'
                          }
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    {workflowType === 'vehicle_inbound' 
                      ? 'Select the target schema where incoming data will be stored (Vehicle, Master Vehicle, or Advertise Vehicle)'
                      : 'Select the target schema where incoming data will be stored'
                    }
                  </p>
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t mt-4">
                <Button
                  onClick={handleConfigSave}
                  className="flex-1"
                  disabled={!config.schema_type}
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
          className="w-3 h-3 !bg-blue-500"
        />
        <Handle
          type="source"
          position={Position.Right}
          isConnectable={isConnectable}
          className="w-3 h-3 !bg-blue-500"
        />
      </Card>
    </>
  );
};

export default SchemaSelectionNode;
