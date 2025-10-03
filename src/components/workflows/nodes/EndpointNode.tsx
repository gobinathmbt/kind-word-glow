import React, { useState, useEffect } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Globe, Copy, Settings, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from "@/auth/AuthContext";

const EndpointNode = ({ data, isConnectable, id, onDataUpdate }: any) => {
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [config, setConfig] = useState(data.config || {});
  const { toast } = useToast();

    const { completeUser } = useAuth();

  // Generate endpoint URL based on company ID
  useEffect(() => {
    const companyId = completeUser?.company_id?._id;
    if (companyId && !config.endpoint_url) {
      const endpointId = `${companyId}_${Date.now()}`;
      setConfig(prev => ({
        ...prev,
        endpoint_url: `/api/workflow-execute/${endpointId}`,
        endpoint_id: endpointId,
        method: 'POST'
      }));
    }
  }, []);

  const handleConfigSave = () => {
    if (onDataUpdate) {
      onDataUpdate(id, { config });
    }
    setIsConfigOpen(false);
    toast({
      title: "Configuration Saved",
      description: "Endpoint configuration has been updated",
    });
  };

  const copyEndpoint = () => {
    const fullUrl = `${window.location.origin}${config.endpoint_url}`;
    navigator.clipboard.writeText(fullUrl);
    toast({
      title: "Copied!",
      description: "Endpoint URL copied to clipboard",
    });
  };

  return (
    <>
      <Card className="w-80 border-2 border-green-500 shadow-lg bg-green-50/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Globe className="w-4 h-4 text-green-600" />
            {data.label}
            <Badge variant="outline" className="ml-auto bg-green-100">
              Endpoint
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <div className="text-xs text-muted-foreground">
            Vehicle inbound webhook endpoint
          </div>
          
          {config.endpoint_url && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">POST</Badge>
                <code className="text-xs bg-muted px-2 py-1 rounded flex-1 truncate">
                  {config.endpoint_url}
                </code>
                <Button
                  variant="ghost" 
                  size="sm"
                  onClick={copyEndpoint}
                  className="h-6 w-6 p-0"
                >
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
              <div className="flex items-center gap-1 text-xs text-green-600">
                <CheckCircle2 className="w-3 h-3" />
                <span>Active endpoint ready</span>
              </div>
            </div>
          )}

          <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="w-full">
                <Settings className="w-3 h-3 mr-1" />
                Configure
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Endpoint Configuration</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="endpoint_url">Endpoint URL</Label>
                  <Input
                    id="endpoint_url"
                    value={config.endpoint_url || ''}
                    disabled
                    className="font-mono text-xs"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Auto-generated based on company ID
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={config.description || ''}
                    onChange={(e) => setConfig(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe this endpoint..."
                  />
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleConfigSave} className="flex-1">
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
          type="source"
          position={Position.Right}
          isConnectable={isConnectable}
          className="w-3 h-3 !bg-green-500"
        />
      </Card>
    </>
  );
};

export default EndpointNode;