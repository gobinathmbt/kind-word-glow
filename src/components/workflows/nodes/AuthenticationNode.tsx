import React, { useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Shield, Settings, Key, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const AuthenticationNode = ({ data, isConnectable, id, onDataUpdate }: any) => {
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [config, setConfig] = useState(data.config || { type: 'none' });
  const { toast } = useToast();

  const generateJWTToken = () => {
    // Generate a simple JWT-like token for demo purposes
    const payload = {
      company_id: sessionStorage.getItem('company_id'),
      workflow_id: id,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60) // 1 year
    };
    
    const token = btoa(JSON.stringify(payload));
    setConfig(prev => ({ ...prev, bearer_token: `vw_${token}` }));
  };

  const handleConfigSave = () => {
    if (onDataUpdate) {
      onDataUpdate(id, { config });
    }
    setIsConfigOpen(false);
    toast({
      title: "Authentication Configured",
      description: `${config.type === 'none' ? 'No authentication' : config.type.replace('_', ' ')} has been set up`,
    });
  };

  const copyToken = (token: string) => {
    navigator.clipboard.writeText(token);
    toast({
      title: "Copied!",
      description: "Token copied to clipboard",
    });
  };

  const getAuthTypeLabel = () => {
    switch (config.type) {
      case 'none': return 'No Authentication';
      case 'bearer_token': return 'Bearer Token';
      case 'api_key': return 'API Key';
      case 'api_secret': return 'API Secret';
      default: return 'Configure Auth';
    }
  };

  return (
    <>
      <Card className="w-80 border-2 border-blue-500 shadow-lg bg-blue-50/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-600" />
            {data.label}
            <Badge variant="outline" className="ml-auto bg-blue-100">
              Auth
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <div className="text-xs text-muted-foreground">
            {getAuthTypeLabel()}
          </div>
          
          {config.type !== 'none' && (
            <div className="space-y-2">
              {config.bearer_token && (
                <div>
                  <Label className="text-xs">Bearer Token</Label>
                  <div className="flex items-center gap-1">
                    <code className="text-xs bg-muted px-2 py-1 rounded flex-1 truncate">
                      {config.bearer_token.substring(0, 20)}...
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToken(config.bearer_token)}
                      className="h-6 w-6 p-0"
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              )}
              
              {config.api_key && (
                <div>
                  <Label className="text-xs">API Key</Label>
                  <div className="flex items-center gap-1">
                    <code className="text-xs bg-muted px-2 py-1 rounded flex-1 truncate">
                      {config.api_key}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToken(config.api_key)}
                      className="h-6 w-6 p-0"
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="w-full">
                <Settings className="w-3 h-3 mr-1" />
                Configure Auth
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Authentication Configuration</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="auth_type">Authentication Type</Label>
                  <Select 
                    value={config.type} 
                    onValueChange={(value) => setConfig(prev => ({ ...prev, type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select authentication type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Authentication</SelectItem>
                      <SelectItem value="bearer_token">Bearer Token</SelectItem>
                      <SelectItem value="api_key">API Key</SelectItem>
                      <SelectItem value="api_secret">API Secret</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {config.type === 'bearer_token' && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label>Bearer Token</Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={generateJWTToken}
                        className="ml-auto"
                      >
                        <Key className="w-3 h-3 mr-1" />
                        Generate
                      </Button>
                    </div>
                    <Textarea
                      value={config.bearer_token || ''}
                      onChange={(e) => setConfig(prev => ({ ...prev, bearer_token: e.target.value }))}
                      placeholder="Enter or generate bearer token..."
                      className="font-mono text-xs"
                    />
                  </div>
                )}

                {config.type === 'api_key' && (
                  <div>
                    <Label htmlFor="api_key">API Key</Label>
                    <Input
                      id="api_key"
                      value={config.api_key || ''}
                      onChange={(e) => setConfig(prev => ({ ...prev, api_key: e.target.value }))}
                      placeholder="Enter API key..."
                    />
                  </div>
                )}

                {config.type === 'api_secret' && (
                  <div className="space-y-2">
                    <div>
                      <Label htmlFor="api_key_secret">API Key</Label>
                      <Input
                        id="api_key_secret"
                        value={config.api_key || ''}
                        onChange={(e) => setConfig(prev => ({ ...prev, api_key: e.target.value }))}
                        placeholder="Enter API key..."
                      />
                    </div>
                    <div>
                      <Label htmlFor="api_secret">API Secret</Label>
                      <Input
                        id="api_secret"
                        type="password"
                        value={config.api_secret || ''}
                        onChange={(e) => setConfig(prev => ({ ...prev, api_secret: e.target.value }))}
                        placeholder="Enter API secret..."
                      />
                    </div>
                  </div>
                )}

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

export default AuthenticationNode;