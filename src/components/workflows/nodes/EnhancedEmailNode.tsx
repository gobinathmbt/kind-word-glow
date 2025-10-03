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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mail, Settings, Eye, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const EnhancedEmailNode = ({ data, isConnectable, id, onDataUpdate }: any) => {
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [config, setConfig] = useState(data.config || {
    service: 'gmail',
    from_email: '',
    from_name: '',
    to_email: '',
    subject: '',
    html_content: '',
    text_content: '',
    smtp_settings: {},
    variables: []
  });
  const { toast } = useToast();

  const emailServices = [
    { value: 'gmail', label: 'Gmail' },
    { value: 'sendgrid', label: 'SendGrid' },
    { value: 'mailgun', label: 'Mailgun' },
    { value: 'smtp', label: 'Custom SMTP' }
  ];

  const templateVariables = [
    { value: '{{vehicle.make}}', label: 'Vehicle Make' },
    { value: '{{vehicle.model}}', label: 'Vehicle Model' },
    { value: '{{vehicle.year}}', label: 'Vehicle Year' },
    { value: '{{vehicle.vin}}', label: 'Vehicle VIN' },
    { value: '{{vehicle.stock_id}}', label: 'Stock ID' },
    { value: '{{response.status}}', label: 'Response Status' },
    { value: '{{response.message}}', label: 'Response Message' },
    { value: '{{error.message}}', label: 'Error Message' },
    { value: '{{company.name}}', label: 'Company Name' },
    { value: '{{timestamp}}', label: 'Timestamp' }
  ];

  const addVariable = (variable: string, target: 'subject' | 'html_content' | 'text_content') => {
    const current = config[target] || '';
    setConfig(prev => ({
      ...prev,
      [target]: current + variable
    }));
  };

  const handleConfigSave = () => {
    if (!config.from_email || !config.to_email || !config.subject) {
      toast({
        title: "Required Fields Missing",
        description: "Please fill in From Email, To Email, and Subject",
        variant: "destructive",
      });
      return;
    }

    if (onDataUpdate) {
      onDataUpdate(id, { config });
    }
    setIsConfigOpen(false);
    toast({
      title: "Email Configuration Saved",
      description: `Email template configured for ${config.service}`,
    });
  };

  const getEmailSummary = () => {
    if (!config.to_email) return 'Configure email settings';
    return `To: ${config.to_email}`;
  };

  const getDefaultTemplate = () => {
    return {
      subject: 'Vehicle Processing {{response.status === "200" ? "Successful" : "Failed"}}',
      html_content: `
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #333;">Vehicle Processing Notification</h2>
  
  <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
    <h3>Vehicle Details:</h3>
    <p><strong>Stock ID:</strong> {{vehicle.stock_id}}</p>
    <p><strong>Vehicle:</strong> {{vehicle.year}} {{vehicle.make}} {{vehicle.model}}</p>
    <p><strong>VIN:</strong> {{vehicle.vin}}</p>
  </div>
  
  <div style="background: {{response.status === "200" ? "#d4edda" : "#f8d7da"}}; padding: 15px; border-radius: 5px; margin: 15px 0;">
    <h3>Processing Status:</h3>
    <p><strong>Status:</strong> {{response.status}}</p>
    <p><strong>Message:</strong> {{response.message}}</p>
    {{#if error.message}}
    <p><strong>Error:</strong> {{error.message}}</p>
    {{/if}}
  </div>
  
  <p><small>Processed at {{timestamp}} by {{company.name}}</small></p>
</body>
</html>`,
      text_content: `Vehicle Processing Notification

Vehicle Details:
- Stock ID: {{vehicle.stock_id}}
- Vehicle: {{vehicle.year}} {{vehicle.make}} {{vehicle.model}}
- VIN: {{vehicle.vin}}

Processing Status: {{response.status}}
Message: {{response.message}}
{{#if error.message}}Error: {{error.message}}{{/if}}

Processed at {{timestamp}} by {{company.name}}`
    };
  };

  const loadDefaultTemplate = () => {
    const template = getDefaultTemplate();
    setConfig(prev => ({ ...prev, ...template }));
  };

  return (
    <>
      <Card className="w-80 border-2 border-indigo-500 shadow-lg bg-indigo-50/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Mail className="w-4 h-4 text-indigo-600" />
            {data.label}
            <Badge variant="outline" className="ml-auto bg-indigo-100">
              Email
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <div className="text-xs text-muted-foreground">
            {getEmailSummary()}
          </div>
          
          {config.service && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {emailServices.find(s => s.value === config.service)?.label}
              </Badge>
              {config.subject && (
                <Badge variant="outline" className="text-xs">
                  Template Ready
                </Badge>
              )}
            </div>
          )}

          <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="w-full">
                <Settings className="w-3 h-3 mr-1" />
                Configure Email
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh]">
              <DialogHeader>
                <DialogTitle>Email Configuration</DialogTitle>
              </DialogHeader>
              
              <Tabs defaultValue="settings" className="space-y-4">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="settings">Settings</TabsTrigger>
                  <TabsTrigger value="template">Template</TabsTrigger>
                  <TabsTrigger value="preview">Preview</TabsTrigger>
                </TabsList>

                <TabsContent value="settings" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="service">Email Service</Label>
                      <Select 
                        value={config.service}
                        onValueChange={(value) => setConfig(prev => ({ ...prev, service: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select email service" />
                        </SelectTrigger>
                        <SelectContent>
                          {emailServices.map(service => (
                            <SelectItem key={service.value} value={service.value}>
                              {service.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="from_email">From Email *</Label>
                      <Input
                        id="from_email"
                        type="email"
                        value={config.from_email}
                        onChange={(e) => setConfig(prev => ({ ...prev, from_email: e.target.value }))}
                        placeholder="sender@company.com"
                      />
                    </div>

                    <div>
                      <Label htmlFor="from_name">From Name</Label>
                      <Input
                        id="from_name"
                        value={config.from_name}
                        onChange={(e) => setConfig(prev => ({ ...prev, from_name: e.target.value }))}
                        placeholder="Company Name"
                      />
                    </div>

                    <div>
                      <Label htmlFor="to_email">To Email *</Label>
                      <Input
                        id="to_email"
                        type="email"
                        value={config.to_email}
                        onChange={(e) => setConfig(prev => ({ ...prev, to_email: e.target.value }))}
                        placeholder="recipient@example.com"
                      />
                    </div>
                  </div>

                  {config.service === 'smtp' && (
                    <div className="space-y-3 p-4 border rounded">
                      <Label className="text-sm font-medium">SMTP Settings</Label>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor="smtp_host">Host</Label>
                          <Input
                            id="smtp_host"
                            value={config.smtp_settings?.host || ''}
                            onChange={(e) => setConfig(prev => ({
                              ...prev,
                              smtp_settings: { ...prev.smtp_settings, host: e.target.value }
                            }))}
                            placeholder="smtp.example.com"
                          />
                        </div>
                        <div>
                          <Label htmlFor="smtp_port">Port</Label>
                          <Input
                            id="smtp_port"
                            type="number"
                            value={config.smtp_settings?.port || ''}
                            onChange={(e) => setConfig(prev => ({
                              ...prev,
                              smtp_settings: { ...prev.smtp_settings, port: e.target.value }
                            }))}
                            placeholder="587"
                          />
                        </div>
                        <div>
                          <Label htmlFor="smtp_username">Username</Label>
                          <Input
                            id="smtp_username"
                            value={config.smtp_settings?.username || ''}
                            onChange={(e) => setConfig(prev => ({
                              ...prev,
                              smtp_settings: { ...prev.smtp_settings, username: e.target.value }
                            }))}
                            placeholder="username"
                          />
                        </div>
                        <div>
                          <Label htmlFor="smtp_password">Password</Label>
                          <Input
                            id="smtp_password"
                            type="password"
                            value={config.smtp_settings?.password || ''}
                            onChange={(e) => setConfig(prev => ({
                              ...prev,
                              smtp_settings: { ...prev.smtp_settings, password: e.target.value }
                            }))}
                            placeholder="password"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="template" className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Label>Email Template</Label>
                    <Button variant="outline" size="sm" onClick={loadDefaultTemplate}>
                      <Plus className="w-3 h-3 mr-1" />
                      Load Default Template
                    </Button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label htmlFor="subject">Subject *</Label>
                        <div className="flex gap-1">
                          {templateVariables.slice(0, 5).map(variable => (
                            <Button
                              key={variable.value}
                              variant="ghost"
                              size="sm"
                              onClick={() => addVariable(variable.value, 'subject')}
                              className="h-6 px-2 text-xs"
                            >
                              {variable.label}
                            </Button>
                          ))}
                        </div>
                      </div>
                      <Input
                        id="subject"
                        value={config.subject}
                        onChange={(e) => setConfig(prev => ({ ...prev, subject: e.target.value }))}
                        placeholder="Email subject with {{variables}}"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label htmlFor="html_content">HTML Content</Label>
                        <div className="flex gap-1">
                          {templateVariables.slice(0, 6).map(variable => (
                            <Button
                              key={variable.value}
                              variant="ghost"
                              size="sm"
                              onClick={() => addVariable(variable.value, 'html_content')}
                              className="h-6 px-2 text-xs"
                            >
                              {variable.label}
                            </Button>
                          ))}
                        </div>
                      </div>
                      <Textarea
                        id="html_content"
                        value={config.html_content}
                        onChange={(e) => setConfig(prev => ({ ...prev, html_content: e.target.value }))}
                        placeholder="HTML email content with {{variables}}"
                        className="font-mono text-xs h-40"
                      />
                    </div>

                    <div>
                      <Label htmlFor="text_content">Text Content (Fallback)</Label>
                      <Textarea
                        id="text_content"
                        value={config.text_content}
                        onChange={(e) => setConfig(prev => ({ ...prev, text_content: e.target.value }))}
                        placeholder="Plain text version"
                        className="font-mono text-xs h-24"
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="preview" className="space-y-4">
                  <div className="p-4 border rounded bg-muted/50">
                    <h3 className="font-medium mb-2">Template Preview</h3>
                    <div className="space-y-2 text-sm">
                      <div><strong>Subject:</strong> {config.subject || 'No subject set'}</div>
                      <div><strong>From:</strong> {config.from_name ? `${config.from_name} <${config.from_email}>` : config.from_email}</div>
                      <div><strong>To:</strong> {config.to_email}</div>
                    </div>
                  </div>
                  
                  {config.html_content && (
                    <div className="p-4 border rounded">
                      <Label className="text-sm font-medium">HTML Preview</Label>
                      <div 
                        className="mt-2 p-4 bg-white border rounded text-sm"
                        dangerouslySetInnerHTML={{ 
                          __html: config.html_content.replace(/\{\{[^}]+\}\}/g, '<span class="bg-yellow-200 px-1 rounded">$&</span>') 
                        }}
                      />
                    </div>
                  )}
                </TabsContent>
              </Tabs>

              <div className="flex gap-2">
                <Button onClick={handleConfigSave} className="flex-1">
                  Save Email Configuration
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

export default EnhancedEmailNode;