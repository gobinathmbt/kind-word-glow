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
import { Shield, Settings, Key, Copy, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const AuthenticationNode = ({ data, isConnectable, id, onDataUpdate }: any) => {
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [config, setConfig] = useState(data.config || { type: 'none' });
  const { toast } = useToast();

  const generateJWTToken = () => {
    // Generate JWT header
    const header = {
      alg: 'HS256',
      typ: 'JWT'
    };

    // Generate JWT payload
    const payload = {
      sub: id,
      workflow_id: id,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60) // 1 year
    };

    // Create JWT token (base64url encoded)
    const base64Header = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const base64Payload = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    
    // Generate random signature
    const signature = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
      .substring(0, 43);

    const token = `${base64Header}.${base64Payload}.${signature}`;
    
    setConfig(prev => ({ ...prev, jwt_token: token }));
    
    toast({
      title: "JWT Token Generated",
      description: "A new JWT token has been created",
    });
  };

  const generateAPICredentials = () => {
    // Generate API Key (32 characters)
    const apiKey = 'vw_' + Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Generate API Secret (64 characters)
    const apiSecret = 'vws_' + Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    setConfig(prev => ({ 
      ...prev, 
      api_key: apiKey,
      api_secret: apiSecret
    }));

    toast({
      title: "Credentials Generated",
      description: "API Key and Secret have been created",
    });
  };

  const handleConfigSave = () => {
    if (onDataUpdate) {
      onDataUpdate(id, { config });
    }
    setIsConfigOpen(false);
    toast({
      title: "Authentication Configured",
      description: `${config.type === 'none' ? 'No authentication' : config.type === 'jwt_token' ? 'JWT Token' : config.type === 'standard' ? 'Standard Authentication' : 'Static Authentication'} has been set up`,
    });
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
  };

  const getAuthTypeLabel = () => {
    switch (config.type) {
      case 'none': return 'No Authentication';
      case 'jwt_token': return 'JWT Token';
      case 'standard': return 'Standard Authentication';
      case 'static': return 'Static Authentication';
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
              {config.jwt_token && config.type === 'jwt_token' && (
                <div>
                  <Label className="text-xs">JWT Token</Label>
                  <div className="flex items-center gap-1">
                    <code className="text-xs bg-muted px-2 py-1 rounded flex-1 truncate">
                      {config.jwt_token.substring(0, 30)}...
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(config.jwt_token, 'JWT Token')}
                      className="h-6 w-6 p-0"
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              )}
              
              {config.api_key && config.type === 'standard' && (
                <div className="space-y-2">
                  <div>
                    <Label className="text-xs">API Key</Label>
                    <div className="flex items-center gap-1">
                      <code className="text-xs bg-muted px-2 py-1 rounded flex-1 truncate">
                        {config.api_key.substring(0, 20)}...
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(config.api_key, 'API Key')}
                        className="h-6 w-6 p-0"
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">API Secret</Label>
                    <div className="flex items-center gap-1">
                      <code className="text-xs bg-muted px-2 py-1 rounded flex-1 truncate">
                        {config.api_secret?.substring(0, 20)}...
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(config.api_secret || '', 'API Secret')}
                        className="h-6 w-6 p-0"
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {config.static_token && config.type === 'static' && (
                <div>
                  <Label className="text-xs">Static Token</Label>
                  <div className="flex items-center gap-1">
                    <code className="text-xs bg-muted px-2 py-1 rounded flex-1 truncate">
                      {config.static_token.substring(0, 30)}...
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(config.static_token, 'Static Token')}
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
                      <SelectItem value="jwt_token">JWT Token</SelectItem>
                      <SelectItem value="standard">Standard Authentication</SelectItem>
                      <SelectItem value="static">Static Authentication</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {config.type === 'jwt_token' && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label>JWT Token</Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={generateJWTToken}
                        className="ml-auto"
                      >
                        <RefreshCw className="w-3 h-3 mr-1" />
                        Generate JWT
                      </Button>
                      {config.jwt_token && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(config.jwt_token, 'JWT Token')}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                    <Textarea
                      value={config.jwt_token || ''}
                      onChange={(e) => setConfig(prev => ({ ...prev, jwt_token: e.target.value }))}
                      placeholder="Click 'Generate JWT' to create a token..."
                      className="font-mono text-xs"
                      rows={4}
                    />
                    <p className="text-xs text-muted-foreground">
                      JWT tokens contain encoded header, payload, and signature
                    </p>
                  </div>
                )}

                {config.type === 'standard' && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Label>Credentials</Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={generateAPICredentials}
                        className="ml-auto"
                      >
                        <Key className="w-3 h-3 mr-1" />
                        Generate Credentials
                      </Button>
                    </div>
                    
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <Label htmlFor="api_key">API Key</Label>
                        {config.api_key && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(config.api_key, 'API Key')}
                            className="h-6"
                          >
                            <Copy className="w-3 h-3 mr-1" />
                            Copy
                          </Button>
                        )}
                      </div>
                      <Input
                        id="api_key"
                        value={config.api_key || ''}
                        onChange={(e) => setConfig(prev => ({ ...prev, api_key: e.target.value }))}
                        placeholder="Generate or enter API key..."
                        className="font-mono text-xs"
                      />
                    </div>
                    
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <Label htmlFor="api_secret">API Secret</Label>
                        {config.api_secret && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(config.api_secret, 'API Secret')}
                            className="h-6"
                          >
                            <Copy className="w-3 h-3 mr-1" />
                            Copy
                          </Button>
                        )}
                      </div>
                      <Input
                        id="api_secret"
                        type="password"
                        value={config.api_secret || ''}
                        onChange={(e) => setConfig(prev => ({ ...prev, api_secret: e.target.value }))}
                        placeholder="Generate or enter API secret..."
                        className="font-mono text-xs"
                      />
                    </div>
                    
                    <p className="text-xs text-muted-foreground">
                      API Key and Secret are used together for authentication
                    </p>
                  </div>
                )}

                {config.type === 'static' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between mb-1">
                      <Label htmlFor="static_token">Static Token</Label>
                      {config.static_token && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(config.static_token, 'Static Token')}
                          className="h-6"
                        >
                          <Copy className="w-3 h-3 mr-1" />
                          Copy
                        </Button>
                      )}
                    </div>
                    <Textarea
                      id="static_token"
                      value={config.static_token || ''}
                      onChange={(e) => setConfig(prev => ({ ...prev, static_token: e.target.value }))}
                      placeholder="Enter your static authentication token..."
                      className="font-mono text-xs"
                      rows={3}
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter a static token that will be used for all authentication requests
                    </p>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
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