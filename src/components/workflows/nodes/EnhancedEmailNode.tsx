import React, { useState, useEffect } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Mail, Settings, Eye, Plus, Loader2, Copy, Search, Upload, X, File } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { workflowServices, dealershipServices, companyServices } from '@/api/services';
import { useAuth } from '@/auth/AuthContext';
import SelectComponent from 'react-select';

interface UserOption {
  value: string;
  label: string;
  email: string;
  user: any;
  role?: string;
  dealership_ids?: string[];
}

interface RoleOption {
  value: string;
  label: string;
}

interface DealershipOption {
  value: string;
  label: string;
  address?: string;
}

const EnhancedEmailNode = ({ data, isConnectable, id, onDataUpdate }: any) => {
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [config, setConfig] = useState(data.config || {
    service: 'gmail',
    from_email: '',
    from_name: '',
    to_email: '',
    to_email_type: 'all', // 'all' or 'specific_users'
    to_user_ids: [], // Array of user IDs when specific_users is selected
    cc_user_ids: [], // Array of user IDs for CC
    attachments: [], // Array of attachment objects
    subject: '',
    html_content: '',
    text_content: '',
    smtp_settings: {},
    variables: []
  });
  const [isVariablesDialogOpen, setIsVariablesDialogOpen] = useState(false);
  const [variablesDialogTarget, setVariablesDialogTarget] = useState<'subject' | 'html_content' | null>(null);
  const [schemaVariables, setSchemaVariables] = useState<any[]>([]);
  const { toast } = useToast();
  const { completeUser } = useAuth();

  // User selection states (TO)
  const [userOptions, setUserOptions] = useState<UserOption[]>([]);
  const [selectedUserOptions, setSelectedUserOptions] = useState<UserOption[]>([]);
  const [roleOptions, setRoleOptions] = useState<RoleOption[]>([]);
  const [dealershipOptions, setDealershipOptions] = useState<DealershipOption[]>([]);
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>("");
  const [selectedDealershipFilter, setSelectedDealershipFilter] = useState<string>("");
  const [filteredUserOptions, setFilteredUserOptions] = useState<UserOption[]>([]);

  // CC user selection states
  const [selectedCcUserOptions, setSelectedCcUserOptions] = useState<UserOption[]>([]);
  const [selectedCcRoleFilter, setSelectedCcRoleFilter] = useState<string>("");
  const [selectedCcDealershipFilter, setSelectedCcDealershipFilter] = useState<string>("");
  const [filteredCcUserOptions, setFilteredCcUserOptions] = useState<UserOption[]>([]);

  // Get workflow type and target schema from upstream nodes
  const workflowType = data.workflowType || '';
  const targetSchema = data.targetSchema || '';

  // Fetch users for the logged-in user's company
  const { data: usersData, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['company-users-email-workflow'],
    queryFn: () => companyServices.getUsers(),
    enabled: isConfigOpen,
  });

  // Fetch dealerships
  const { data: dealershipsData } = useQuery({
    queryKey: ['company-dealerships-email-workflow'],
    queryFn: () => dealershipServices.getDealerships(),
    enabled: isConfigOpen,
  });

  // Fetch schema fields when target schema is available for email_trigger workflow
  const { data: schemaFieldsData, isLoading: isLoadingSchemaFields } = useQuery({
    queryKey: ['schema-fields-email', targetSchema],
    queryFn: () => workflowServices.getSchemaFields(targetSchema),
    enabled: workflowType === 'email_trigger' && !!targetSchema && isVariablesDialogOpen,
  });

  // Process schema fields into variables format
  useEffect(() => {
    if (schemaFieldsData?.data?.data?.fields) {
      const fields = schemaFieldsData.data.data.fields;
      const variables = fields.map((field: any) => ({
        field_name: field.field_name,
        field_type: field.field_type,
        is_required: field.is_required,
        is_array: field.is_array,
        is_nested: field.is_nested,
        variable: `{{${field.field_name}}}`,
      }));
      setSchemaVariables(variables);
    }
  }, [schemaFieldsData]);

  // Process users data
  useEffect(() => {
    if (usersData?.data?.data) {
      const users = usersData.data.data;

      const options = users.map((user: any) => ({
        value: user._id,
        label: `${user.first_name} ${user.last_name}`,
        email: user.email,
        user: user,
        role: user.role,
        dealership_ids: user.dealerships || []
      }));
      setUserOptions(options);
      setFilteredUserOptions(options);
    }
  }, [usersData, completeUser]);

  // Prepare role options
  useEffect(() => {
    const roles = [
      { value: "company_super_admin", label: "Company Super Admin" },
      { value: "company_admin", label: "Company Admin" },
    ];
    setRoleOptions(roles);
  }, []);

  // Prepare dealership options
  useEffect(() => {
    if (dealershipsData?.data?.data) {
      const dealerships = dealershipsData.data.data;
      const options = dealerships.map((dealership: any) => ({
        value: dealership._id,
        label: dealership.dealership_name,
        address: dealership.dealership_address
      }));
      setDealershipOptions(options);
    }
  }, [dealershipsData]);

  // Update selected user options when config changes (TO)
  useEffect(() => {
    if (config.to_email_type === "specific_users" && config.to_user_ids && config.to_user_ids.length > 0) {
      const selectedOptions = userOptions.filter(option => 
        config.to_user_ids.includes(option.value)
      );
      setSelectedUserOptions(selectedOptions);
    } else {
      setSelectedUserOptions([]);
    }
  }, [config.to_user_ids, config.to_email_type, userOptions]);

  // Update selected CC user options when config changes
  useEffect(() => {
    if (config.cc_user_ids && config.cc_user_ids.length > 0) {
      const selectedOptions = userOptions.filter(option => 
        config.cc_user_ids.includes(option.value)
      );
      setSelectedCcUserOptions(selectedOptions);
    } else {
      setSelectedCcUserOptions([]);
    }
  }, [config.cc_user_ids, userOptions]);

  // Filter users based on role (TO) - Exclude users already selected in CC
  useEffect(() => {
    let filtered = userOptions;
    
    // Exclude users already selected in CC
    const ccUserIds = selectedCcUserOptions.map(u => u.value);
    if (ccUserIds.length > 0) {
      filtered = filtered.filter(user => !ccUserIds.includes(user.value));
    }
    
    // Apply role filter - only if not "all"
    if (selectedRoleFilter && selectedRoleFilter !== "all") {
      filtered = filtered.filter(user => user.role === selectedRoleFilter);
    }

    // COMMENTED OUT: Apply dealership filter - only if not "all"
    // if (selectedDealershipFilter && selectedDealershipFilter !== "all") {
    //   filtered = filtered.filter(user => 
    //     user.dealership_ids?.some((d: any) => d._id === selectedDealershipFilter)
    //   );
    // }

    setFilteredUserOptions(filtered);
  }, [userOptions, selectedRoleFilter, selectedDealershipFilter, selectedCcUserOptions]);

  // Filter users based on role (CC) - Exclude users already selected in TO
  useEffect(() => {
    let filtered = userOptions;
    
    // Exclude users already selected in TO
    const toUserIds = selectedUserOptions.map(u => u.value);
    if (toUserIds.length > 0) {
      filtered = filtered.filter(user => !toUserIds.includes(user.value));
    }
    
    // Apply role filter - only if not "all"
    if (selectedCcRoleFilter && selectedCcRoleFilter !== "all") {
      filtered = filtered.filter(user => user.role === selectedCcRoleFilter);
    }

    // COMMENTED OUT: Apply dealership filter - only if not "all"
    // if (selectedCcDealershipFilter && selectedCcDealershipFilter !== "all") {
    //   filtered = filtered.filter(user => 
    //     user.dealership_ids?.some((d: any) => d._id === selectedCcDealershipFilter)
    //   );
    // }

    setFilteredCcUserOptions(filtered);
  }, [userOptions, selectedCcRoleFilter, selectedCcDealershipFilter, selectedUserOptions]);

  const emailServices = [
    { value: 'gmail', label: 'Gmail' },
    { value: 'sendgrid', label: 'SendGrid' },
  ];

  const templateVariables = [
    { value: '{{vehicle.make}}', label: 'Vehicle Make (Single)' },
    { value: '{{vehicle.model}}', label: 'Vehicle Model (Single)' },
    { value: '{{vehicle.year}}', label: 'Vehicle Year (Single)' },
    { value: '{{vehicle.vin}}', label: 'Vehicle VIN (Single)' },
    { value: '{{vehicle.vehicle_stock_id}}', label: 'Stock ID (Single)' },
    { value: '{{vehicles_summary.total}}', label: 'Total Vehicles' },
    { value: '{{vehicles_summary.successful}}', label: 'Successful Count' },
    { value: '{{vehicles_summary.failed}}', label: 'Failed Count' },
    { value: '{{vehicles_summary.created}}', label: 'Created Count' },
    { value: '{{vehicles_summary.updated}}', label: 'Updated Count' },
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

  const handleShowVariables = (target: 'subject' | 'html_content') => {
    setVariablesDialogTarget(target);
    setIsVariablesDialogOpen(true);
  };

  const handleVariableClick = (variable: string) => {
    if (variablesDialogTarget) {
      addVariable(variable, variablesDialogTarget);
      toast({
        title: "Variable Added",
        description: `${variable} has been added to ${variablesDialogTarget === 'subject' ? 'Subject' : 'HTML Content'}`,
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Variable copied to clipboard",
    });
  };

  // Handle user selection change (TO)
  const handleUserSelectionChange = (selectedOptions: any) => {
    setSelectedUserOptions(selectedOptions || []);
    
    // Extract user IDs from selected options
    const userIds = selectedOptions ? selectedOptions.map((option: UserOption) => option.value) : [];
    
    setConfig((prev) => ({
      ...prev,
      to_user_ids: userIds,
    }));
  };

  // Handle CC user selection change
  const handleCcUserSelectionChange = (selectedOptions: any) => {
    setSelectedCcUserOptions(selectedOptions || []);
    
    // Extract user IDs from selected options
    const userIds = selectedOptions ? selectedOptions.map((option: UserOption) => option.value) : [];
    
    setConfig((prev) => ({
      ...prev,
      cc_user_ids: userIds,
    }));
  };

  // Handle file upload - Convert to base64 for storage
  const handleFileUpload = async (index: number, file: File) => {
    try {
      // Check file size (limit to 5MB for email attachments)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        toast({
          title: "File Too Large",
          description: "File size must be less than 5MB for email attachments",
          variant: "destructive",
        });
        return;
      }

      // Convert file to base64
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64Content = e.target?.result as string;
        
        // Update attachment with file info
        setConfig((prev) => ({
          ...prev,
          attachments: prev.attachments.map((att: any, i: number) => 
            i === index ? {
              ...att,
              name: file.name,
              content: base64Content, // Store base64 content
              size: file.size,
              type: file.type,
              encoding: 'base64'
            } : att
          )
        }));

        toast({
          title: "File Added",
          description: `${file.name} (${(file.size / 1024).toFixed(2)} KB) added successfully`,
        });
      };

      reader.onerror = () => {
        toast({
          title: "Upload Failed",
          description: "Failed to read file. Please try again.",
          variant: "destructive",
        });
      };

      reader.readAsDataURL(file);
    } catch (error) {
      console.error('File upload error:', error);
      toast({
        title: "Upload Failed",
        description: "Failed to process file. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle attachment addition
  const handleAddAttachment = () => {
    const newAttachment = {
      name: '',
      url: '',
      path: '',
      size: 0,
      type: ''
    };
    setConfig((prev) => ({
      ...prev,
      attachments: [...(prev.attachments || []), newAttachment]
    }));
  };

  // Handle attachment removal
  const handleRemoveAttachment = (index: number) => {
    setConfig((prev) => ({
      ...prev,
      attachments: prev.attachments.filter((_: any, i: number) => i !== index)
    }));
  };

  // Handle attachment field change
  const handleAttachmentChange = (index: number, field: string, value: string) => {
    setConfig((prev) => ({
      ...prev,
      attachments: prev.attachments.map((att: any, i: number) => 
        i === index ? { ...att, [field]: value } : att
      )
    }));
  };

  // Clear all filters (TO)
  const clearFilters = () => {
    setSelectedRoleFilter("");
    setSelectedDealershipFilter("");
  };

  // Clear all CC filters
  const clearCcFilters = () => {
    setSelectedCcRoleFilter("");
    setSelectedCcDealershipFilter("");
  };

  // Helper function to get dealership names for display
  const getDealershipNames = (dealershipIds: string[]) => {
    return dealershipIds.map(id => 
      dealershipOptions.find(d => d.value === id)?.label || id
    ).join(', ');
  };

  const handleConfigSave = () => {
    // Validate based on to_email_type
    if (config.to_email_type === 'specific_users' && (!config.to_user_ids || config.to_user_ids.length === 0)) {
      toast({
        title: "Required Fields Missing",
        description: "Please select at least one user or choose 'All Users'",
        variant: "destructive",
      });
      return;
    }

    if (!config.subject) {
      toast({
        title: "Required Fields Missing",
        description: "Please fill in Subject",
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
    let summary = '';
    
    if (config.to_email_type === 'all') {
      summary = 'To: All Users';
    } else if (config.to_email_type === 'specific_users' && config.to_user_ids && config.to_user_ids.length > 0) {
      summary = `To: ${config.to_user_ids.length} user(s)`;
    } else if (config.to_email && !config.to_email_type) {
      // Backward compatibility for old configs
      summary = `To: ${config.to_email}`;
    } else {
      summary = 'Configure email settings';
    }
    
    // Add CC info if present
    if (config.cc_user_ids && config.cc_user_ids.length > 0) {
      summary += ` | CC: ${config.cc_user_ids.length}`;
    }
    
    // Add attachments info if present
    if (config.attachments && config.attachments.length > 0) {
      summary += ` | 📎 ${config.attachments.length}`;
    }
    
    return summary;
  };

  const getDefaultTemplate = () => {
    // Template for single vehicle
    const singleVehicleHtml = '<html>\n<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">\n  <h2 style="color: #333;">Vehicle Processing Notification</h2>\n  \n  <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">\n    <h3>Vehicle Details:</h3>\n    <p><strong>Stock ID:</strong> {{vehicle.vehicle_stock_id}}</p>\n    <p><strong>Vehicle:</strong> {{vehicle.year}} {{vehicle.make}} {{vehicle.model}}</p>\n    <p><strong>VIN:</strong> {{vehicle.vin}}</p>\n  </div>\n  \n  <div style="background: {{status_color}}; padding: 15px; border-radius: 5px; margin: 15px 0;">\n    <h3>Processing Status:</h3>\n    <p><strong>Status:</strong> {{response.status}}</p>\n    <p><strong>Message:</strong> {{response.message}}</p>\n    {{error_section}}\n  </div>\n  \n  <p style="color: #666;"><small>Processed at {{timestamp}} by {{company.name}}</small></p>\n</body>\n</html>';
    
    // Template for multiple vehicles
    const multipleVehicleHtml = '<html>\n<body style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">\n  <h2 style="color: #333;">Bulk Vehicle Processing Notification</h2>\n  \n  <div style="background: {{status_color}}; padding: 15px; border-radius: 5px; margin: 15px 0;">\n    <h3>Processing Summary:</h3>\n    <p><strong>Total Vehicles:</strong> {{vehicles_summary.total}}</p>\n    <p><strong>Successful:</strong> {{vehicles_summary.successful}}</p>\n    <p><strong>Failed:</strong> {{vehicles_summary.failed}}</p>\n    <p><strong>Created:</strong> {{vehicles_summary.created}}</p>\n    <p><strong>Updated:</strong> {{vehicles_summary.updated}}</p>\n  </div>\n  \n  {{vehicles_loop_start}}\n  <div style="background: {{vehicle_status_color}}; padding: 10px; border-radius: 5px; margin: 10px 0; border-left: 4px solid {{vehicle_border_color}};">\n    <h4 style="margin: 0 0 10px 0;">{{vehicle.vehicle_stock_id}} - {{vehicle.year}} {{vehicle.make}} {{vehicle.model}}</h4>\n    <p style="margin: 5px 0;"><strong>VIN:</strong> {{vehicle.vin}}</p>\n    <p style="margin: 5px 0;"><strong>Status:</strong> {{vehicle.status}}</p>\n    <p style="margin: 5px 0;"><strong>Operation:</strong> {{vehicle.database_operation}}</p>\n    {{vehicle_error_section}}\n  </div>\n  {{vehicles_loop_end}}\n  \n  <p style="color: #666; margin-top: 20px;"><small>Processed at {{timestamp}} by {{company.name}}</small></p>\n</body>\n</html>';
    
    const singleVehicleText = 'Vehicle Processing Notification\n\n=== Vehicle Details ===\nStock ID: {{vehicle.vehicle_stock_id}}\nVehicle: {{vehicle.year}} {{vehicle.make}} {{vehicle.model}}\nVIN: {{vehicle.vin}}\n\n=== Processing Status ===\nStatus: {{response.status}}\nMessage: {{response.message}}\n{{error_text}}\n\nProcessed at {{timestamp}} by {{company.name}}';
    
    const multipleVehicleText = 'Bulk Vehicle Processing Notification\n\n=== Processing Summary ===\nTotal Vehicles: {{vehicles_summary.total}}\nSuccessful: {{vehicles_summary.successful}}\nFailed: {{vehicles_summary.failed}}\nCreated: {{vehicles_summary.created}}\nUpdated: {{vehicles_summary.updated}}\n\n=== Vehicle Details ===\n{{vehicles_loop_start}}\n- Stock ID: {{vehicle.vehicle_stock_id}} | {{vehicle.year}} {{vehicle.make}} {{vehicle.model}}\n  VIN: {{vehicle.vin}}\n  Status: {{vehicle.status}}\n  Operation: {{vehicle.database_operation}}\n  {{vehicle_error_text}}\n{{vehicles_loop_end}}\n\nProcessed at {{timestamp}} by {{company.name}}';
    
    return {
      subject: 'Vehicle Processing Status - {{vehicles_summary.successful}}/{{vehicles_summary.total}} Successful',
      html_content: multipleVehicleHtml,
      text_content: multipleVehicleText
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
            <DialogContent className="max-w-[95vw] md:max-w-4xl max-h-[90vh] flex flex-col">
              <DialogHeader className="flex-shrink-0">
                <DialogTitle>Email Configuration</DialogTitle>
                <p className="text-sm text-muted-foreground">Configure email settings, recipients, and message template</p>
              </DialogHeader>
              
              <Tabs defaultValue="settings" className="flex-1 flex flex-col min-h-0">
                <TabsList className="grid w-full grid-cols-3 flex-shrink-0">
                  <TabsTrigger value="settings">Settings</TabsTrigger>
                  <TabsTrigger value="template">Template</TabsTrigger>
                  <TabsTrigger value="preview">Preview</TabsTrigger>
                </TabsList>

                <div className="flex-1 overflow-y-auto pr-2">
                  <TabsContent value="settings" className="space-y-4 mt-4 m-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        placeholder="Uses system configured email"
                        disabled
                        className="bg-muted cursor-not-allowed"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Emails will be sent from the system's configured SMTP email address
                      </p>
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

                    <div className="col-span-2">
                      <Label htmlFor="to_email_type">To Email *</Label>
                      <Select
                        value={config.to_email_type}
                        onValueChange={(value) => setConfig(prev => ({ ...prev, to_email_type: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select recipient type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Users</SelectItem>
                          <SelectItem value="specific_users">Specific Users</SelectItem>
                        </SelectContent>
                      </Select>
                      {config.to_email_type === 'specific_users' && config.to_user_ids && config.to_user_ids.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {config.to_user_ids.length} user(s) selected
                        </p>
                      )}
                    </div>
                  </div>

                  {config.service === 'smtp' && (
                    <div className="space-y-3 p-4 border rounded">
                      <Label className="text-sm font-medium">SMTP Settings</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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

                  {/* Specific Users Selection */}
                  {config.to_email_type === 'specific_users' && (
                    <div className="space-y-4 p-4 border rounded">
                      <Label className="text-sm font-medium">Select Users</Label>
                      
                      {/* User Filters */}
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Search className="h-4 w-4" />
                            Filter Users
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="grid grid-cols-1 gap-3">
                            <div className="space-y-2">
                              <Label htmlFor="role-filter" className="text-xs">Filter by Role</Label>
                              <Select
                                value={selectedRoleFilter}
                                onValueChange={setSelectedRoleFilter}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="All roles" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">All Roles</SelectItem>
                                  {roleOptions.map((role) => (
                                    <SelectItem key={role.value} value={role.value}>
                                      {role.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            {/* COMMENTED OUT: Dealership Filter
                            <div className="space-y-2">
                              <Label htmlFor="dealership-filter" className="text-xs">Filter by Dealership</Label>
                              <Select
                                value={selectedDealershipFilter}
                                onValueChange={setSelectedDealershipFilter}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="All dealerships" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">All Dealerships</SelectItem>
                                  {dealershipOptions.map((dealership) => (
                                    <SelectItem key={dealership.value} value={dealership.value}>
                                      {dealership.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            */}
                          </div>

                          {/* Active Filters Display */}
                          {(selectedRoleFilter && selectedRoleFilter !== "all") && (
                            <div className="flex items-center justify-between pt-2">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">Active filters:</span>
                                <div className="flex flex-wrap gap-1">
                                  {selectedRoleFilter && selectedRoleFilter !== "all" && (
                                    <Badge variant="secondary" className="text-xs">
                                      Role: {roleOptions.find(r => r.value === selectedRoleFilter)?.label}
                                    </Badge>
                                  )}
                                  {/* COMMENTED OUT: Dealership filter badge
                                  {selectedDealershipFilter && selectedDealershipFilter !== "all" && (
                                    <Badge variant="secondary" className="text-xs">
                                      Dealership: {dealershipOptions.find(d => d.value === selectedDealershipFilter)?.label}
                                    </Badge>
                                  )}
                                  */}
                                </div>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={clearFilters}
                                className="h-7 text-xs"
                              >
                                Clear All
                              </Button>
                            </div>
                          )}

                          {/* Results Count */}
                          <div className="text-xs text-muted-foreground">
                            Showing {filteredUserOptions.length} of {userOptions.length} users
                          </div>
                        </CardContent>
                      </Card>

                      <div className="space-y-2">
                        <Label>Select Users</Label>
                        {isLoadingUsers ? (
                          <div className="flex items-center justify-center p-4">
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            <span className="text-sm text-muted-foreground">Loading users...</span>
                          </div>
                        ) : (
                          <SelectComponent
                            isMulti
                            options={filteredUserOptions}
                            value={selectedUserOptions}
                            onChange={handleUserSelectionChange}
                            placeholder="Search and select users..."
                            noOptionsMessage={() => "No users found matching filters"}
                            styles={{
                              control: (base: any) => ({
                                ...base,
                                border: '1px solid #d1d5db',
                                borderRadius: '0.375rem',
                                minHeight: '40px',
                                '&:hover': {
                                  borderColor: '#9ca3af',
                                },
                              }),
                              multiValue: (base: any) => ({
                                ...base,
                                backgroundColor: '#3b82f6',
                                color: 'white',
                              }),
                              multiValueLabel: (base: any) => ({
                                ...base,
                                color: 'white',
                              }),
                              multiValueRemove: (base: any) => ({
                                ...base,
                                color: 'white',
                                ':hover': {
                                  backgroundColor: '#ef4444',
                                  color: 'white',
                                },
                              }),
                            }}
                            className="react-select-container"
                            classNamePrefix="react-select"
                            formatOptionLabel={(option: UserOption, { context }) => (
                              <div className="flex flex-col">
                                <div className="flex justify-between items-start">
                                  <span className="font-medium">{option.label}</span>
                                  {option.role && (
                                    <Badge variant="outline" className="ml-2 text-xs">
                                      {option.role.replace(/_/g, ' ')}
                                    </Badge>
                                  )}
                                </div>
                                {context === 'menu' && (
                                  <div className="flex flex-col mt-1">
                                    <span className="text-sm text-muted-foreground">{option.email}</span>
                                    {option.dealership_ids && option.dealership_ids.length > 0 && (
                                      <span className="text-xs text-muted-foreground">
                                        Dealerships: {getDealershipNames(option.dealership_ids)}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          />
                        )}
                      </div>
                    </div>
                  )}

                  {/* CC Users Selection (Optional) */}
                  <div className="space-y-4 p-4 border rounded bg-blue-50/30">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      CC (Carbon Copy) - Optional
                    </Label>
                    <p className="text-xs text-muted-foreground">Select users to receive a copy of this email (users selected in TO will not appear here)</p>
                    
                    <div className="space-y-2">
                      <Label>Select CC Recipients</Label>
                      {isLoadingUsers ? (
                        <div className="flex items-center justify-center p-4">
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          <span className="text-sm text-muted-foreground">Loading users...</span>
                        </div>
                      ) : (
                        <SelectComponent
                          isMulti
                          options={filteredCcUserOptions}
                          value={selectedCcUserOptions}
                          onChange={handleCcUserSelectionChange}
                          placeholder="Search and select CC recipients..."
                          noOptionsMessage={() => "No users found matching filters"}
                          styles={{
                            control: (base: any) => ({
                              ...base,
                              border: '1px solid #d1d5db',
                              borderRadius: '0.375rem',
                              minHeight: '40px',
                              '&:hover': {
                                borderColor: '#9ca3af',
                              },
                            }),
                            multiValue: (base: any) => ({
                              ...base,
                              backgroundColor: '#3b82f6',
                              color: 'white',
                            }),
                            multiValueLabel: (base: any) => ({
                              ...base,
                              color: 'white',
                            }),
                            multiValueRemove: (base: any) => ({
                              ...base,
                              color: 'white',
                              ':hover': {
                                backgroundColor: '#ef4444',
                                color: 'white',
                              },
                            }),
                          }}
                          className="react-select-container"
                          classNamePrefix="react-select"
                          formatOptionLabel={(option: UserOption, { context }) => (
                            <div className="flex flex-col">
                              <div className="flex justify-between items-start">
                                <span className="font-medium">{option.label}</span>
                                {option.role && (
                                  <Badge variant="outline" className="ml-2 text-xs">
                                    {option.role.replace(/_/g, ' ')}
                                  </Badge>
                                )}
                              </div>
                              {context === 'menu' && (
                                <div className="flex flex-col mt-1">
                                  <span className="text-sm text-muted-foreground">{option.email}</span>
                                  {option.dealership_ids && option.dealership_ids.length > 0 && (
                                    <span className="text-xs text-muted-foreground">
                                      Dealerships: {getDealershipNames(option.dealership_ids)}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        />
                      )}
                      {selectedCcUserOptions.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {selectedCcUserOptions.length} CC recipient(s) selected
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Attachments Section (Optional) */}
                  <div className="space-y-4 p-4 border rounded bg-purple-50/30">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm font-medium flex items-center gap-2">
                          <Plus className="h-4 w-4" />
                          Attachments - Optional
                        </Label>
                        <p className="text-xs text-muted-foreground mt-1">Add file attachments to this email</p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddAttachment}
                        className="h-8"
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Add Attachment
                      </Button>
                    </div>

                    {config.attachments && config.attachments.length > 0 && (
                      <div className="space-y-3">
                        {config.attachments.map((attachment: any, index: number) => (
                          <Card key={index} className="p-3 bg-white">
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <Label className="text-xs font-semibold">Attachment {index + 1}</Label>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveAttachment(index)}
                                  className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>

                              {/* File Upload Button */}
                              <div className="flex items-center gap-2">
                                <input
                                  type="file"
                                  id={`file-upload-${index}`}
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      handleFileUpload(index, file);
                                    }
                                  }}
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => document.getElementById(`file-upload-${index}`)?.click()}
                                  className="flex-1"
                                >
                                  <Upload className="w-3 h-3 mr-2" />
                                  Choose File from Computer
                                </Button>
                              </div>

                              {/* Show uploaded file info */}
                              {attachment.name && (
                                <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded">
                                  <File className="w-4 h-4 text-green-600" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-green-900 truncate">{attachment.name}</p>
                                    {attachment.size && (
                                      <p className="text-xs text-green-600">
                                        {(attachment.size / 1024).toFixed(2)} KB
                                      </p>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Manual URL/Path input (optional) */}
                              <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground">Or enter URL/Path manually:</Label>
                                <div className="grid grid-cols-1 gap-2">
                                  <div>
                                    <Input
                                      id={`attachment-name-${index}`}
                                      value={attachment.name || ''}
                                      onChange={(e) => handleAttachmentChange(index, 'name', e.target.value)}
                                      placeholder="File name (e.g., document.pdf)"
                                      className="h-8 text-sm"
                                    />
                                  </div>
                                  <div>
                                    <Input
                                      id={`attachment-url-${index}`}
                                      value={attachment.url || attachment.path || ''}
                                      onChange={(e) => {
                                        handleAttachmentChange(index, 'url', e.target.value);
                                        handleAttachmentChange(index, 'path', e.target.value);
                                      }}
                                      placeholder="https://example.com/file.pdf or /path/to/file.pdf"
                                      className="h-8 text-sm"
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}

                    {(!config.attachments || config.attachments.length === 0) && (
                      <div className="text-center py-4 text-sm text-muted-foreground">
                        No attachments added. Click "Add Attachment" to include files.
                      </div>
                    )}
                  </div>
                  </TabsContent>

                  <TabsContent value="template" className="space-y-4 mt-4">
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
                          {workflowType === 'email_trigger' && targetSchema ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleShowVariables('subject')}
                              className="h-7 px-3 text-xs"
                            >
                              Show
                            </Button>
                          ) : (
                            templateVariables.slice(0, 5).map(variable => (
                              <Button
                                key={variable.value}
                                variant="ghost"
                                size="sm"
                                onClick={() => addVariable(variable.value, 'subject')}
                                className="h-6 px-2 text-xs"
                              >
                                {variable.label}
                              </Button>
                            ))
                          )}
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
                          {workflowType === 'email_trigger' && targetSchema ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleShowVariables('html_content')}
                              className="h-7 px-3 text-xs"
                            >
                              Show
                            </Button>
                          ) : (
                            templateVariables.slice(0, 6).map(variable => (
                              <Button
                                key={variable.value}
                                variant="ghost"
                                size="sm"
                                onClick={() => addVariable(variable.value, 'html_content')}
                                className="h-6 px-2 text-xs"
                              >
                                {variable.label}
                              </Button>
                            ))
                          )}
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

                  <TabsContent value="preview" className="space-y-4 mt-4">
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
                </div>
              </Tabs>

              <div className="flex gap-2 pt-4 border-t mt-4 flex-shrink-0">
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

      {/* Variables Dialog for Email Trigger Workflow */}
      <Dialog open={isVariablesDialogOpen} onOpenChange={setIsVariablesDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Available Variables</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Click to copy variables to clipboard, then paste them into your message template at the desired position
            </p>
          </DialogHeader>
          
          <div className="space-y-4">
            {targetSchema && (
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                <p className="text-sm font-medium text-blue-900">Schema: {targetSchema}</p>
              </div>
            )}

            {isLoadingSchemaFields ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                <span className="text-sm text-muted-foreground">Loading schema fields...</span>
              </div>
            ) : schemaVariables.length > 0 ? (
              <ScrollArea className="h-[50vh] pr-4">
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm mb-3">Schema Data</h3>
                  <div className="grid grid-cols-1 gap-2">
                    {schemaVariables.map((variable: any, index: number) => {
                      // Calculate indentation level based on nested structure
                      const indentLevel = variable.is_nested 
                        ? (variable.field_name.split('.').length - 1) 
                        : 0;
                      const paddingLeft = indentLevel * 16;
                      
                      // Check if this is an array parent field
                      const isArrayParent = variable.is_array && variable.field_type === "array";
                      
                      return (
                        <button
                          key={index}
                          onClick={() => {
                            handleVariableClick(variable.variable);
                            copyToClipboard(variable.variable);
                          }}
                          className={`flex items-center justify-between p-3 rounded-lg border transition-all hover:border-blue-400 hover:bg-blue-50 text-left ${
                            isArrayParent ? 'bg-blue-50/50 border-blue-200' : 'bg-white hover:shadow-sm'
                          }`}
                          style={{ paddingLeft: `${paddingLeft + 12}px` }}
                        >
                          <div className="flex items-center gap-2 flex-1">
                            {variable.is_nested && !isArrayParent && (
                              <span className="text-muted-foreground text-xs">└─</span>
                            )}
                            <Copy className="w-4 h-4 text-blue-600 flex-shrink-0" />
                            <span className={`font-mono text-sm ${
                              isArrayParent ? 'font-semibold text-blue-700' : 'text-blue-600'
                            }`}>
                              {variable.field_name}
                            </span>
                            {isArrayParent && (
                              <span className="text-blue-600 text-xs font-bold">[]</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {variable.field_type}
                            </Badge>
                            {variable.is_required && (
                              <Badge variant="destructive" className="text-xs">
                                Required
                              </Badge>
                            )}
                            {variable.is_nested && !isArrayParent && (
                              <Badge variant="outline" className="text-xs bg-blue-50">
                                Nested
                              </Badge>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">No schema fields available</p>
                <p className="text-xs mt-1">Please select a target schema in Basic Info configuration</p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsVariablesDialogOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EnhancedEmailNode;