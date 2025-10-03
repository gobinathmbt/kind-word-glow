import React, { useState, useEffect, useCallback } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { dealershipServices, notificationConfigServices } from "@/api/services";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Trash2,
  Info,
  Users,
  CheckCircle,
  Copy,
  Variable,
  Filter,
  Check,
  Search,
} from "lucide-react";
import SelectComponent from 'react-select';

interface EnhancedNotificationConfigFormProps {
  schemas: Record<string, any>;
  users: any[];
  dealerships?: any[];
  editData?: any;
  onSuccess: () => void;
}

interface FieldCondition {
  field_name: string;
  operator: string;
  value: any;
  condition: "and" | "or";
}

interface TargetUsers {
  type:
    | "all"
    | "specific_users"
    | "role_based"
    | "department_based"
    | "dealership_based";
  user_ids: string[];
  roles: string[];
  departments: string[];
  dealership_ids: string[];
  exclude_user_ids: string[];
}

interface MessageTemplate {
  title: string;
  body: string;
  action_url?: string;
  variables: Array<{
    variable_name: string;
    field_path: string;
  }>;
}

interface AvailableVariable {
  name: string;
  variable: string;
  description: string;
  category: 'data' | 'user' | 'system';
}

interface UserOption {
  value: string;
  label: string;
  email: string;
  user: any;
  role?: string;
  dealership_ids?: string[]; // Changed from dealership_id to dealership_ids (array)
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

const EnhancedNotificationConfigForm: React.FC<
  EnhancedNotificationConfigFormProps
> = ({ schemas, users, dealerships = [], editData, onSuccess }) => {

  console.log("Schemas:", schemas); // Debugging line
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    trigger_type: "create",
    target_schema: "",
    target_fields: [] as FieldCondition[],
    target_users: {
      type: "all",
      user_ids: [],
      roles: [],
      departments: [],
      dealership_ids: [],
      exclude_user_ids: [],
    } as TargetUsers,
    message_template: {
      title: "",
      body: "",
      action_url: "",
      variables: [],
    } as MessageTemplate,
    notification_channels: {
      in_app: true,
    },
    priority: "medium",
    type: "info", // Added type field with default value
    is_active: true,
  });

  const [selectedSchemaFields, setSelectedSchemaFields] = useState<any[]>([]);
  const [availableVariables, setAvailableVariables] = useState<AvailableVariable[]>([]);
  const [copiedVariable, setCopiedVariable] = useState<string | null>(null);
  const [titleInputRef, setTitleInputRef] = useState<HTMLInputElement | null>(null);
  const [bodyTextareaRef, setBodyTextareaRef] = useState<HTMLTextAreaElement | null>(null);
  const [userOptions, setUserOptions] = useState<UserOption[]>([]);
  const [selectedUserOptions, setSelectedUserOptions] = useState<UserOption[]>([]);
  const [roleOptions, setRoleOptions] = useState<RoleOption[]>([]);
  const [selectedRoleOptions, setSelectedRoleOptions] = useState<RoleOption[]>([]);
  const [dealershipOptions, setDealershipOptions] = useState<DealershipOption[]>([]);
  const [selectedDealershipOptions, setSelectedDealershipOptions] = useState<DealershipOption[]>([]);
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>("");
  const [selectedDealershipFilter, setSelectedDealershipFilter] = useState<string>("");
  const [filteredUserOptions, setFilteredUserOptions] = useState<UserOption[]>([]);

  // Initialize form with edit data
  useEffect(() => {
    if (editData) {
      setFormData({
        name: editData.name || "",
        description: editData.description || "",
        trigger_type: editData.trigger_type || "create",
        target_schema: editData.target_schema || "",
        target_fields: editData.target_fields || [],
        target_users: editData.target_users || {
          type: "all",
          user_ids: [],
          roles: [],
          departments: [],
          dealership_ids: [],
          exclude_user_ids: [],
        },
        message_template: editData.message_template || {
          title: "",
          body: "",
          action_url: "",
          variables: [],
        },
        notification_channels: editData.notification_channels || {
          in_app: true,
        },
        priority: editData.priority || "medium",
        type: editData.type || "info", // Added type field initialization
        is_active: editData.is_active !== undefined ? editData.is_active : true,
      });
    }
  }, [editData]);

  // Prepare user options for react-select
  useEffect(() => {
    const options = users.map(user => ({
      value: user._id,
      label: `${user.first_name} ${user.last_name}`,
      email: user.email,
      user: user,
      role: user.role,
      dealership_ids: user.dealerships || [] // Changed to dealership_ids array
    }));
    setUserOptions(options);
    setFilteredUserOptions(options);
  }, [users]);

  // Prepare role options for react-select
  useEffect(() => {
    const roles = [
      { value: "company_super_admin", label: "Company Super Admin" },
      { value: "company_admin", label: "Company Admin" },
    ];
    setRoleOptions(roles);
  }, []);

  // Update selected user options when formData changes
  useEffect(() => {
    if (formData.target_users.type === "specific_users" && formData.target_users.user_ids.length > 0) {
      const selectedOptions = userOptions.filter(option => 
        formData.target_users.user_ids.some((selectedUser: any) => {
          if (typeof selectedUser === 'string') {
            return selectedUser === option.value;
          } else if (typeof selectedUser === 'object') {
            return selectedUser._id === option.value;
          }
          return false;
        })
      );
      setSelectedUserOptions(selectedOptions);
    } else {
      setSelectedUserOptions([]);
    }
  }, [formData.target_users.user_ids, formData.target_users.type, userOptions]);

  // Update selected role options when formData changes
  useEffect(() => {
    if (formData.target_users.type === "role_based" && formData.target_users.roles.length > 0) {
      const selectedOptions = roleOptions.filter(option => 
        formData.target_users.roles.includes(option.value)
      );
      setSelectedRoleOptions(selectedOptions);
    } else {
      setSelectedRoleOptions([]);
    }
  }, [formData.target_users.roles, formData.target_users.type, roleOptions]);

  // Update selected dealership options when formData changes
  useEffect(() => {
    if (formData.target_users.type === "dealership_based" && formData.target_users.dealership_ids.length > 0) {
      const selectedOptions = dealershipOptions.filter(option => 
        formData.target_users.dealership_ids.includes(option.value)
      );
      setSelectedDealershipOptions(selectedOptions);
    } else {
      setSelectedDealershipOptions([]);
    }
  }, [formData.target_users.dealership_ids, formData.target_users.type, dealershipOptions]);

  // Get dealerships data
  const { data: dealershipsData } = useQuery({
    queryKey: ["company-dealerships"],
    queryFn: () => dealershipServices.getDealerships(),
    enabled: !dealerships.length,
  });

  const availableDealerships =
    dealerships.length > 0 ? dealerships : dealershipsData?.data?.data || [];

  useEffect(() => {
    const options = availableDealerships.map(dealership => ({
      value: dealership._id,
      label: dealership.dealership_name,
      address: dealership.dealership_address
    }));
    setDealershipOptions(options);
  }, [availableDealerships]);

  // Filter users based on role, and dealership - UPDATED LOGIC
  useEffect(() => {
    let filtered = userOptions;
    
    // Apply role filter - only if not "all"
    if (selectedRoleFilter && selectedRoleFilter !== "all") {
      filtered = filtered.filter(user => user.role === selectedRoleFilter);
    }

    // Apply dealership filter - only if not "all"
    if (selectedDealershipFilter && selectedDealershipFilter !== "all") {
      filtered = filtered.filter(user => 
        user.user.dealership_ids?.some(d => d._id === selectedDealershipFilter)
      );
    }

    setFilteredUserOptions(filtered);
  }, [userOptions, selectedRoleFilter, selectedDealershipFilter]);

  // Update schema fields when target schema changes
  useEffect(() => {
    if (formData.target_schema && schemas[formData.target_schema]) {
      const schemaInfo = schemas[formData.target_schema];
      setSelectedSchemaFields(schemaInfo.fields || []);

      // Generate available variables for message templates
      const dataVariables: AvailableVariable[] = (schemaInfo.fields || []).map(
        (field: any) => ({
          name: field.field,
          variable: `{data.${field.field}}`,
          description: `${field.field} (${field.type})`,
          category: 'data' as const,
        })
      );

      const systemVariables: AvailableVariable[] = [
        {
          name: 'User First Name',
          variable: '{user.first_name}',
          description: 'First name of the notification recipient',
          category: 'user',
        },
        {
          name: 'User Last Name',
          variable: '{user.last_name}',
          description: 'Last name of the notification recipient',
          category: 'user',
        },
        {
          name: 'User Email',
          variable: '{user.email}',
          description: 'Email address of the notification recipient',
          category: 'user',
        },
        {
          name: 'Timestamp',
          variable: '{timestamp}',
          description: 'Current date and time when notification is sent',
          category: 'system',
        },
        {
          name: 'Date',
          variable: '{date}',
          description: 'Current date when notification is sent',
          category: 'system',
        },
        {
          name: 'Time',
          variable: '{time}',
          description: 'Current time when notification is sent',
          category: 'system',
        },
      ];

      setAvailableVariables([...dataVariables, ...systemVariables]);
    } else {
      setSelectedSchemaFields([]);
      setAvailableVariables([]);
    }
  }, [formData.target_schema, schemas]);

  // Handle user selection change
  const handleUserSelectionChange = (selectedOptions: any) => {
    setSelectedUserOptions(selectedOptions || []);
    
    // Extract user IDs from selected options
    const userIds = selectedOptions ? selectedOptions.map((option: UserOption) => option.value) : [];
    
    setFormData((prev) => ({
      ...prev,
      target_users: {
        ...prev.target_users,
        user_ids: userIds,
      },
    }));
  };

  // Handle role selection change
  const handleRoleSelectionChange = (selectedOptions: any) => {
    setSelectedRoleOptions(selectedOptions || []);
    
    // Extract role values from selected options
    const roles = selectedOptions ? selectedOptions.map((option: RoleOption) => option.value) : [];
    
    setFormData((prev) => ({
      ...prev,
      target_users: {
        ...prev.target_users,
        roles: roles,
      },
    }));
  };

  // Handle dealership selection change
  const handleDealershipSelectionChange = (selectedOptions: any) => {
    setSelectedDealershipOptions(selectedOptions || []);
    
    // Extract dealership IDs from selected options
    const dealershipIds = selectedOptions ? selectedOptions.map((option: DealershipOption) => option.value) : [];
    
    setFormData((prev) => ({
      ...prev,
      target_users: {
        ...prev.target_users,
        dealership_ids: dealershipIds,
      },
    }));
  };

  // Clear all filters
  const clearFilters = () => {
    setSelectedRoleFilter("");
    setSelectedDealershipFilter("");
  };

  // Copy to clipboard functionality
  const copyToClipboard = useCallback(async (text: string, variableName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedVariable(variableName);
      toast({
        title: "Copied!",
        description: `Variable "${text}" copied to clipboard`,
      });
      
      // Reset the copied state after 2 seconds
      setTimeout(() => {
        setCopiedVariable(null);
      }, 2000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopiedVariable(variableName);
        toast({
          title: "Copied!",
          description: `Variable "${text}" copied to clipboard`,
        });
        setTimeout(() => {
          setCopiedVariable(null);
        }, 2000);
      } catch (fallbackErr) {
        toast({
          title: "Copy failed",
          description: "Unable to copy to clipboard",
          variant: "destructive",
        });
      }
      document.body.removeChild(textArea);
    }
  }, [toast]);

  // Create/Update mutation
  const createMutation = useMutation({
    mutationFn: (data: any) => {
      if (editData) {
        return notificationConfigServices.updateNotificationConfiguration(
          editData._id,
          data
        );
      }
      return notificationConfigServices.createNotificationConfiguration(data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: `Notification configuration ${
          editData ? "updated" : "created"
        } successfully`,
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description:
          error.response?.data?.message ||
          `Failed to ${editData ? "update" : "create"} configuration`,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Name is required",
        variant: "destructive",
      });
      return;
    }

    if (!formData.target_schema) {
      toast({
        title: "Error",
        description: "Target schema is required",
        variant: "destructive",
      });
      return;
    }

    if (!formData.message_template.title.trim()) {
      toast({
        title: "Error",
        description: "Message title is required",
        variant: "destructive",
      });
      return;
    }

    if (!formData.message_template.body.trim()) {
      toast({
        title: "Error",
        description: "Message body is required",
        variant: "destructive",
      });
      return;
    }

    createMutation.mutate(formData);
  };

  const addFieldCondition = () => {
    setFormData((prev) => ({
      ...prev,
      target_fields: [
        ...prev.target_fields,
        { field_name: "", operator: "equals", value: "", condition: "and" },
      ],
    }));
  };

  const updateFieldCondition = (
    index: number,
    updates: Partial<FieldCondition>
  ) => {
    setFormData((prev) => ({
      ...prev,
      target_fields: prev.target_fields.map((field, i) =>
        i === index ? { ...field, ...updates } : field
      ),
    }));
  };

  const removeFieldCondition = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      target_fields: prev.target_fields.filter((_, i) => i !== index),
    }));
  };

  const getFieldEnumOptions = (fieldName: string) => {
    const field = selectedSchemaFields.find((f) => f.field === fieldName);
    return field?.enums || [];
  };

  const getOperatorOptions = () => [
    { value: "equals", label: "Equals" },
    { value: "not_equals", label: "Not Equals" },
    { value: "contains", label: "Contains" },
    { value: "not_contains", label: "Does Not Contain" },
    { value: "greater_than", label: "Greater Than" },
    { value: "less_than", label: "Less Than" },
    { value: "in", label: "In" },
    { value: "not_in", label: "Not In" },
  ];

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'data':
        return 'Schema Data';
      case 'user':
        return 'User Info';
      case 'system':
        return 'System';
      default:
        return 'Other';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'data':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'user':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'system':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

const customSelectStyles = {
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
  };

  // Helper function to get dealership names for display
  const getDealershipNames = (dealershipIds: string[]) => {
    return dealershipIds.map(id => 
      dealershipOptions.find(d => d.value === id)?.label || id
    ).join(', ');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <DialogHeader>
        <DialogTitle>
          {editData
            ? "Edit Notification Configuration"
            : "Create Notification Configuration"}
        </DialogTitle>
      </DialogHeader>

      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="conditions">Conditions</TabsTrigger>
          <TabsTrigger value="targets">Target Users</TabsTrigger>
          <TabsTrigger value="message">Message</TabsTrigger>
        </TabsList>

        {/* Basic Information Tab */}
        <TabsContent value="basic" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                Basic Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Configuration Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="Enter configuration name"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, priority: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, type: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="info">Info</SelectItem>
                      <SelectItem value="success">Success</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="error">Error</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="trigger_type">Trigger Type *</Label>
                  <Select
                    value={formData.trigger_type}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, trigger_type: value }))
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
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Describe what this notification does"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="target_schema">Target Schema *</Label>
                  <Select
                    value={formData.target_schema}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, target_schema: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select schema" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.keys(schemas).map((schemaName) => (
                        <SelectItem key={schemaName} value={schemaName}>
                          {schemaName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, is_active: checked }))
                  }
                />
                <Label htmlFor="is_active">Active</Label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Conditions Tab */}
        <TabsContent value="conditions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Field Conditions
              </CardTitle>
              <CardDescription>
                Define conditions that must be met for the notification to
                trigger
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.target_fields.map((condition, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">Condition {index + 1}</h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFieldCondition(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    <div className="space-y-2">
                      <Label>Field</Label>
                      <Select
                        value={condition.field_name}
                        onValueChange={(value) =>
                          updateFieldCondition(index, { field_name: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select field" />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedSchemaFields.map((field) => (
                            <SelectItem key={field.field} value={field.field}>
                              {field.field} ({field.type})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Operator</Label>
                      <Select
                        value={condition.operator}
                        onValueChange={(value) =>
                          updateFieldCondition(index, { operator: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {getOperatorOptions().map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Value</Label>
                      {getFieldEnumOptions(condition.field_name).length > 0 ? (
                        <Select
                          value={condition.value}
                          onValueChange={(value) =>
                            updateFieldCondition(index, { value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select value" />
                          </SelectTrigger>
                          <SelectContent>
                            {getFieldEnumOptions(condition.field_name).map(
                              (enumValue) => (
                                <SelectItem key={enumValue} value={enumValue}>
                                  {enumValue}
                                </SelectItem>
                              )
                            )}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          value={condition.value}
                          onChange={(e) =>
                            updateFieldCondition(index, {
                              value: e.target.value,
                            })
                          }
                          placeholder="Enter value"
                        />
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Condition</Label>
                      <Select
                        value={condition.condition}
                        onValueChange={(value: "and" | "or") =>
                          updateFieldCondition(index, { condition: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="and">AND</SelectItem>
                          <SelectItem value="or">OR</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                onClick={addFieldCondition}
                disabled={!formData.target_schema}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Condition
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Target Users Tab */}
        <TabsContent value="targets" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Target Users
              </CardTitle>
              {/* Show selected counts */}
              {formData.target_users.type === "specific_users" && (
                <CardDescription>
                  {formData.target_users.user_ids.length} user(s) selected
                </CardDescription>
              )}
              {formData.target_users.type === "role_based" && (
                <CardDescription>
                  {formData.target_users.roles.length} role(s) selected
                </CardDescription>
              )}
              {formData.target_users.type === "dealership_based" && (
                <CardDescription>
                  {formData.target_users.dealership_ids.length} dealership(s) selected
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Target Type</Label>
                <Select
                  value={formData.target_users.type}
                  onValueChange={(value: any) =>
                    setFormData((prev) => ({
                      ...prev,
                      target_users: { ...prev.target_users, type: value },
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    <SelectItem value="specific_users">
                      Specific Users
                    </SelectItem>
                    <SelectItem value="role_based">Role Based</SelectItem>
                    <SelectItem value="dealership_based">
                      Dealership Based
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.target_users.type === "specific_users" && (
                <div className="space-y-4">
                  {/* User Filters */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Search className="h-4 w-4" />
                        Filter Users
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
                      </div>

                      {/* Active Filters Display */}
                      {((selectedRoleFilter && selectedRoleFilter !== "all") || (selectedDealershipFilter && selectedDealershipFilter !== "all")) && (
                        <div className="flex items-center justify-between pt-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Active filters:</span>
                            <div className="flex flex-wrap gap-1">
                              {selectedRoleFilter && selectedRoleFilter !== "all" && (
                                <Badge variant="secondary" className="text-xs">
                                  Role: {roleOptions.find(r => r.value === selectedRoleFilter)?.label}
                                </Badge>
                              )}
                              {selectedDealershipFilter && selectedDealershipFilter !== "all" && (
                                <Badge variant="secondary" className="text-xs">
                                  Dealership: {dealershipOptions.find(d => d.value === selectedDealershipFilter)?.label}
                                </Badge>
                              )}
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
                    <SelectComponent
                      isMulti
                      options={filteredUserOptions}
                      value={selectedUserOptions}
                      onChange={handleUserSelectionChange}
                      placeholder="Search and select users..."
                      noOptionsMessage={() => "No users found matching filters"}
                      styles={customSelectStyles}
                      className="react-select-container"
                      classNamePrefix="react-select"
                      formatOptionLabel={(option: UserOption, { context }) => (
                        <div className="flex flex-col">
                          <div className="flex justify-between items-start">
                            <span className="font-medium">{option.label}</span>
                            {option.role && (
                              <Badge variant="outline" className="ml-2 text-xs">
                                {option.role.replace('_', ' ')}
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
                  </div>
                </div>
              )}

              {formData.target_users.type === "role_based" && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Select Roles</Label>
                    <SelectComponent
                      isMulti
                      options={roleOptions}
                      value={selectedRoleOptions}
                      onChange={handleRoleSelectionChange}
                      placeholder="Select roles..."
                      noOptionsMessage={() => "No roles found"}
                      styles={customSelectStyles}
                      className="react-select-container"
                      classNamePrefix="react-select"
                    />
                  </div>
                </div>
              )}

              {formData.target_users.type === "dealership_based" && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Select Dealerships</Label>
                    <SelectComponent
                      isMulti
                      options={dealershipOptions}
                      value={selectedDealershipOptions}
                      onChange={handleDealershipSelectionChange}
                      placeholder="Select dealerships..."
                      noOptionsMessage={() => "No dealerships found"}
                      styles={customSelectStyles}
                      className="react-select-container"
                      classNamePrefix="react-select"
                      formatOptionLabel={(option: DealershipOption, { context }) => (
                        <div className="flex flex-col">
                          <span className="font-medium">{option.label}</span>
                          {context === 'menu' && option.address && (
                            <span className="text-sm text-muted-foreground truncate">
                              {option.address}
                            </span>
                          )}
                        </div>
                      )}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Message Template Tab */}
        <TabsContent value="message" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Variable className="h-5 w-5" />
                Message Template
              </CardTitle>
              <CardDescription>
                Define the notification message and available variables
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="message_title">Title *</Label>
                <Input
                  id="message_title"
                  value={formData.message_template.title}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      message_template: {
                        ...prev.message_template,
                        title: e.target.value,
                      },
                    }))
                  }
                  placeholder="Enter notification title"
                  required
                  ref={setTitleInputRef}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message_body">Body *</Label>
                <Textarea
                  id="message_body"
                  value={formData.message_template.body}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      message_template: {
                        ...prev.message_template,
                        body: e.target.value,
                      },
                    }))
                  }
                  placeholder="Enter notification body"
                  rows={4}
                  required
                  ref={setBodyTextareaRef}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="action_url">Action URL (Optional)</Label>
                <Input
                  id="action_url"
                  value={formData.message_template.action_url || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      message_template: {
                        ...prev.message_template,
                        action_url: e.target.value,
                      },
                    }))
                  }
                  placeholder="https://example.com/action"
                />
              </div>

              {/* Available Variables */}
              {availableVariables.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Available Variables</Label>
                    <span className="text-sm text-muted-foreground">
                      Click to copy variables
                    </span>
                  </div>

                  <ScrollArea className="h-48 border rounded-lg">
                    <div className="p-4 space-y-3">
                      {['data', 'user', 'system'].map((category) => {
                        const categoryVars = availableVariables.filter(
                          (v) => v.category === category
                        );
                        if (categoryVars.length === 0) return null;

                        return (
                          <div key={category} className="space-y-2">
                            <h4 className="text-sm font-medium text-muted-foreground">
                              {getCategoryLabel(category)}
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {categoryVars.map((variable) => (
                                <div
                                  key={variable.variable}
                                  className={`flex items-center justify-between p-2 border rounded-md cursor-pointer hover:bg-accent transition-colors ${
                                    copiedVariable === variable.variable
                                      ? "bg-green-50 border-green-200"
                                      : ""
                                  }`}
                                  onClick={() =>
                                    copyToClipboard(
                                      variable.variable,
                                      variable.variable
                                    )
                                  }
                                >
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <code className="text-xs bg-primary/10 px-1.5 py-0.5 rounded">
                                        {variable.variable}
                                      </code>
                                      {copiedVariable === variable.variable && (
                                        <Check className="h-3 w-3 text-green-600" />
                                      )}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1 truncate">
                                      {variable.description}
                                    </p>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="ml-2 h-6 w-6 p-0"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      copyToClipboard(
                                        variable.variable,
                                        variable.variable
                                      );
                                    }}
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="submit" disabled={createMutation.isPending}>
          {createMutation.isPending
            ? "Saving..."
            : editData
            ? "Update Configuration"
            : "Create Configuration"}
        </Button>
      </div>
    </form>
  );
};

export default EnhancedNotificationConfigForm;