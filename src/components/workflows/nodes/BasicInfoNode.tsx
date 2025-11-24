import React, { useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Settings, Info, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { workflowServices } from '@/api/services';

const BasicInfoNode = ({ data, isConnectable, id, onDataUpdate, workflowType }: any) => {
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [config, setConfig] = useState(
    data.config || {
      trigger_type: 'create',
      target_schema: '',
    }
  );

  // Fetch available schemas for email_trigger workflow type
  const { data: availableSchemas, isLoading: isSchemasLoading } = useQuery({
    queryKey: ['available-schemas', workflowType],
    queryFn: () => workflowServices.getAvailableSchemas(workflowType),
    enabled: workflowType === 'email_trigger',
  });

  const handleConfigSave = () => {
    // Pass both config and target_schema_selected flag to enable downstream nodes
    onDataUpdate(id, { 
      config,
      targetSchemaSelected: !!config.target_schema 
    });
    setIsConfigOpen(false);
  };

  const isConfigured = config.target_schema;

  return (
    <>
      <Card className="min-w-[280px] shadow-lg border-2 border-blue-500">
        <Handle
          type="target"
          position={Position.Left}
          isConnectable={isConnectable}
          className="w-3 h-3"
        />
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-600" />
            {data.label}
            <Badge variant="outline" className="ml-auto bg-blue-100">
              Config
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-3 px-4 pb-4">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Configure basic workflow information and settings
          </p>

          {isConfigured && (
            <div className="space-y-2">
              <div className="text-xs">
                <span className="font-medium">Schema:</span> {config.target_schema}
              </div>
              <div className="text-xs">
                <span className="font-medium">Trigger:</span>{' '}
                <Badge variant="outline" className="text-xs">
                  {config.trigger_type}
                </Badge>
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
              >
                <Settings className="w-3 h-3 mr-1.5" />
                {isConfigured ? 'Edit Configuration' : 'Configure'}
              </Button>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader className="px-6 pt-6 pb-4">
                  <DialogTitle>Basic Information Configuration</DialogTitle>
                </DialogHeader>
                <div className="px-6 pb-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="trigger_type">Trigger Type *</Label>
                      <Select
                        value={config.trigger_type}
                        onValueChange={(value) =>
                          setConfig((prev) => ({ ...prev, trigger_type: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="create">Create</SelectItem>
                          <SelectItem value="update">Update</SelectItem>
                          <SelectItem value="delete">Delete</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="target_schema">Target Schema *</Label>
                      {workflowType === 'email_trigger' ? (
                        <Select
                          value={config.target_schema}
                          onValueChange={(value) =>
                            setConfig((prev) => ({ ...prev, target_schema: value }))
                          }
                          disabled={isSchemasLoading}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={isSchemasLoading ? "Loading schemas..." : "Select target schema"} />
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
                      ) : (
                        <Input
                          id="target_schema"
                          value={config.target_schema}
                          onChange={(e) =>
                            setConfig((prev) => ({ ...prev, target_schema: e.target.value }))
                          }
                          placeholder="Enter target schema name"
                        />
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setIsConfigOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleConfigSave}>Save Configuration</Button>
                  </div>
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

export default BasicInfoNode;
