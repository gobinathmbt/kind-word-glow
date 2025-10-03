import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Save, Trash2, Users, Package, Check, Cpu, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/api/axios';
import { companyServices, masterServices } from '@/api/services';

const MasterPlans = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isModuleDialogOpen, setIsModuleDialogOpen] = useState(false);
  const [availableModules, setAvailableModules] = useState({
    superadmin: [],
    integration: []
  });
  const [planData, setPlanData] = useState({
    per_user_cost: 10,
    modules: []
  });
  const [tempSelectedModules, setTempSelectedModules] = useState([]);
  
  // Load current plan configuration
  const { data: currentPlan, isLoading, refetch } = useQuery({
    queryKey: ['pricing-config'],
    queryFn: async () => {
      const response = await apiClient.get('/api/subscription/pricing-config');
      return response.data.data;
    }
  });

  // Load available modules
  useEffect(() => {
    const loadModules = async () => {
      try {
        const response = await masterServices.getMasterdropdownvalues({
          dropdown_name: ["company_superadmin_modules", "company_integration_modules"],
        });
        if (response.data.success) {
          const data = response.data.data;
          
          // Separate superadmin and integration modules
          const superadminModule = data.find(item => item.dropdown_name === "company_superadmin_modules");
          const integrationModule = data.find(item => item.dropdown_name === "company_integration_modules");
          
          setAvailableModules({
            superadmin: superadminModule?.values || [],
            integration: integrationModule?.values || []
          });
        }
      } catch (error) {
        console.error('Failed to load modules:', error);
        toast.error('Failed to load available modules');
      }
    };
    loadModules();
  }, []);

  // Update form when current plan loads
  useEffect(() => {
    if (currentPlan) {
      setPlanData({
        per_user_cost: currentPlan.per_user_cost || 10,
        modules: currentPlan.modules || []
      });
    }
  }, [currentPlan]);

  // Initialize temp selected modules when dialog opens
  useEffect(() => {
    if (isModuleDialogOpen) {
      setTempSelectedModules([...planData.modules]);
    }
  }, [isModuleDialogOpen, planData.modules]);

  const handleModuleCostChange = (moduleName, cost, isTemp = false) => {
    if (isTemp) {
      setTempSelectedModules(prev => prev.map(module => 
        module.module_name === moduleName 
          ? { ...module, cost_per_module: parseFloat(cost) || 0 }
          : module
      ));
    } else {
      setPlanData(prev => ({
        ...prev,
        modules: prev.modules.map(module => 
          module.module_name === moduleName 
            ? { ...module, cost_per_module: parseFloat(cost) || 0 }
            : module
        )
      }));
    }
  };

  const handleModuleToggle = (module, checked, moduleType) => {
    if (checked) {
      // Add module if not already present
      if (!tempSelectedModules.find(m => m.module_name === module.option_value)) {
        setTempSelectedModules(prev => [...prev, {
          module_name: module.option_value,
          display_value: module.display_value,
          module_type: moduleType,
          cost_per_module: 0
        }]);
      }
    } else {
      // Remove module
      setTempSelectedModules(prev => 
        prev.filter(m => m.module_name !== module.option_value)
      );
    }
  };

  const removeModule = (moduleName) => {
    setPlanData(prev => ({
      ...prev,
      modules: prev.modules.filter(m => m.module_name !== moduleName)
    }));
  };

  const removeTempModule = (moduleName) => {
    setTempSelectedModules(prev => 
      prev.filter(m => m.module_name !== moduleName)
    );
  };

  const handleModuleDialogSave = () => {
    setPlanData(prev => ({
      ...prev,
      modules: [...tempSelectedModules]
    }));
    setIsModuleDialogOpen(false);
    toast.success('Modules updated successfully');
  };

  const handleSave = async () => {
    try {
      if (currentPlan) {
        await apiClient.put(`/api/master/plans/${currentPlan._id}`, planData);
      } else {
        await apiClient.post('/api/master/plans', planData);
      }
      toast.success('Plan configuration saved successfully');
      refetch();
      setIsDialogOpen(false);
    } catch (error) {
      toast.error('Failed to save plan configuration');
    }
  };

  // Filter modules by type based on available modules
  const getFilteredModules = (modules) => {
    const superadminModuleNames = availableModules.superadmin.map(m => m.option_value);
    const integrationModuleNames = availableModules.integration.map(m => m.option_value);

    return {
      superadmin: modules.filter(module => superadminModuleNames.includes(module.module_name)),
      integration: modules.filter(module => integrationModuleNames.includes(module.module_name))
    };
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Plan Configuration">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  const filteredCurrentModules = getFilteredModules(planData.modules);
  const filteredTempModules = getFilteredModules(tempSelectedModules);

  return (
    <DashboardLayout title="Plan Configuration">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Plan Configuration</h2>
            <p className="text-muted-foreground">Configure pricing for users and modules</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Configure Pricing
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
              <DialogHeader className="flex-shrink-0">
                <DialogTitle>Configure Plan Pricing</DialogTitle>
                <DialogDescription>
                  Set the cost per user and per module for subscription calculation
                </DialogDescription>
              </DialogHeader>
              
              <div className="flex-1 overflow-y-auto space-y-6 pr-2">
                {/* Per User Cost */}
                <div className="space-y-2">
                  <Label htmlFor="per_user_cost">Cost Per User (per day)</Label>
                  <div className="relative">
                    <Users className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="per_user_cost"
                      type="number"
                      min="0"
                      step="0.01"
                      value={planData.per_user_cost}
                      onChange={(e) => setPlanData(prev => ({ 
                        ...prev, 
                        per_user_cost: parseFloat(e.target.value) || 0 
                      }))}
                      className="pl-10"
                      placeholder="10.00"
                    />
                  </div>
                </div>

                {/* Module Pricing */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Label>Module Pricing (per day)</Label>
                    <Dialog open={isModuleDialogOpen} onOpenChange={setIsModuleDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Plus className="h-4 w-4 mr-2" />
                          Manage Modules
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
                        <DialogHeader className="flex-shrink-0">
                          <DialogTitle>Manage Modules</DialogTitle>
                          <DialogDescription>Select modules and set their pricing</DialogDescription>
                        </DialogHeader>
                        
                        <div className="flex-1 overflow-hidden flex gap-6">
                          {/* Available Modules */}
                          <div className="flex-1">
                            <Label className="text-sm font-medium mb-3 block">Available Modules</Label>
                            <div className="max-h-[400px] overflow-y-auto space-y-4 pr-2">
                              {/* Superadmin Modules */}
                              <div>
                                <div className="flex items-center gap-2 mb-2 p-2 bg-muted/50 rounded-lg">
                                  <Settings className="h-4 w-4" />
                                  <Label className="text-sm font-medium">Superadmin Modules</Label>
                                </div>
                                <div className="space-y-2">
                                  {availableModules.superadmin.map((module) => {
                                    const isSelected = tempSelectedModules.find(m => m.module_name === module.option_value);
                                    return (
                                      <div key={module.option_value} className="flex items-center space-x-2 p-2 border rounded-lg hover:bg-muted/50 transition-colors">
                                        <Checkbox
                                          id={module.option_value}
                                          checked={!!isSelected}
                                          onCheckedChange={(checked) => handleModuleToggle(module, checked, 'superadmin')}
                                        />
                                        <Label htmlFor={module.option_value} className="flex-1 cursor-pointer text-sm">
                                          {module.display_value}
                                        </Label>
                                        {isSelected && (
                                          <Check className="h-4 w-4 text-green-600" />
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Integration Modules */}
                              <div>
                                <div className="flex items-center gap-2 mb-2 p-2 bg-muted/50 rounded-lg">
                                  <Cpu className="h-4 w-4" />
                                  <Label className="text-sm font-medium">Integration Modules</Label>
                                </div>
                                <div className="space-y-2">
                                  {availableModules.integration.map((module) => {
                                    const isSelected = tempSelectedModules.find(m => m.module_name === module.option_value);
                                    return (
                                      <div key={module.option_value} className="flex items-center space-x-2 p-2 border rounded-lg hover:bg-muted/50 transition-colors">
                                        <Checkbox
                                          id={module.option_value}
                                          checked={!!isSelected}
                                          onCheckedChange={(checked) => handleModuleToggle(module, checked, 'integration')}
                                        />
                                        <Label htmlFor={module.option_value} className="flex-1 cursor-pointer text-sm">
                                          {module.display_value}
                                        </Label>
                                        {isSelected && (
                                          <Check className="h-4 w-4 text-green-600" />
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Selected Modules with Pricing */}
                          <div className="flex-1">
                            <Label className="text-sm font-medium mb-3 block">
                              Selected Modules ({tempSelectedModules.length})
                            </Label>
                            <div className="max-h-[400px] overflow-y-auto space-y-4 pr-2">
                              {tempSelectedModules.length > 0 ? (
                                <>
                                  {/* Superadmin Modules */}
                                  {filteredTempModules.superadmin.length > 0 && (
                                    <div>
                                      <div className="flex items-center gap-2 mb-2 p-2 bg-muted/50 rounded-lg">
                                        <Settings className="h-4 w-4" />
                                        <Label className="text-sm font-medium">Superadmin Modules</Label>
                                      </div>
                                      <div className="space-y-3">
                                        {filteredTempModules.superadmin.map((module, index) => (
                                          <div key={index} className="flex items-center space-x-3 p-3 border rounded-lg bg-muted/20">
                                            <Settings className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                            <div className="flex-1 min-w-0">
                                              <Label className="capitalize text-sm font-medium block truncate">
                                                {module.display_value}
                                              </Label>
                                            </div>
                                            <div className="flex items-center space-x-2 flex-shrink-0">
                                              <span className="text-sm">$</span>
                                              <Input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={module.cost_per_module}
                                                onChange={(e) => handleModuleCostChange(module.module_name, e.target.value, true)}
                                                className="w-20"
                                                placeholder="0.00"
                                              />
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => removeTempModule(module.module_name)}
                                              >
                                                <Trash2 className="h-4 w-4" />
                                              </Button>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Integration Modules */}
                                  {filteredTempModules.integration.length > 0 && (
                                    <div>
                                      <div className="flex items-center gap-2 mb-2 p-2 bg-muted/50 rounded-lg">
                                        <Cpu className="h-4 w-4" />
                                        <Label className="text-sm font-medium">Integration Modules</Label>
                                      </div>
                                      <div className="space-y-3">
                                        {filteredTempModules.integration.map((module, index) => (
                                          <div key={index} className="flex items-center space-x-3 p-3 border rounded-lg bg-muted/20">
                                            <Cpu className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                            <div className="flex-1 min-w-0">
                                              <Label className="capitalize text-sm font-medium block truncate">
                                                {module.display_value}
                                              </Label>
                                            </div>
                                            <div className="flex items-center space-x-2 flex-shrink-0">
                                              <span className="text-sm">$</span>
                                              <Input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={module.cost_per_module}
                                                onChange={(e) => handleModuleCostChange(module.module_name, e.target.value, true)}
                                                className="w-20"
                                                placeholder="0.00"
                                              />
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => removeTempModule(module.module_name)}
                                              >
                                                <Trash2 className="h-4 w-4" />
                                              </Button>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </>
                              ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                  <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                  <p>No modules selected</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-end space-x-2 pt-4 border-t flex-shrink-0">
                          <Button variant="outline" onClick={() => setIsModuleDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button onClick={handleModuleDialogSave}>
                            <Save className="h-4 w-4 mr-2" />
                            Apply Changes
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>

                  <div className="max-h-[300px] overflow-y-auto space-y-4 pr-2">
                    {planData.modules.length > 0 ? (
                      <>
                        {/* Superadmin Modules */}
                        {filteredCurrentModules.superadmin.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <Settings className="h-4 w-4" />
                              <Label className="text-sm font-medium">Superadmin Modules</Label>
                            </div>
                            <div className="space-y-3">
                              {filteredCurrentModules.superadmin.map((module, index) => (
                                <div key={index} className="flex items-center space-x-3 p-3 border rounded-lg">
                                  <Settings className="h-4 w-4 text-muted-foreground" />
                                  <div className="flex-1">
                                    <Label className="capitalize">{module.display_value}</Label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <span className="text-sm">$</span>
                                    <Input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      value={module.cost_per_module}
                                      onChange={(e) => handleModuleCostChange(module.module_name, e.target.value)}
                                      className="w-20"
                                      placeholder="0.00"
                                    />
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => removeModule(module.module_name)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Integration Modules */}
                        {filteredCurrentModules.integration.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <Cpu className="h-4 w-4" />
                              <Label className="text-sm font-medium">Integration Modules</Label>
                            </div>
                            <div className="space-y-3">
                              {filteredCurrentModules.integration.map((module, index) => (
                                <div key={index} className="flex items-center space-x-3 p-3 border rounded-lg">
                                  <Cpu className="h-4 w-4 text-muted-foreground" />
                                  <div className="flex-1">
                                    <Label className="capitalize">{module.display_value}</Label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <span className="text-sm">$</span>
                                    <Input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      value={module.cost_per_module}
                                      onChange={(e) => handleModuleCostChange(module.module_name, e.target.value)}
                                      className="w-20"
                                      placeholder="0.00"
                                    />
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => removeModule(module.module_name)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No modules configured</p>
                        <p className="text-sm">Click "Manage Modules" to add modules</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t flex-shrink-0">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Configuration
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Current Configuration Display */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                User Pricing
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-3xl font-bold">${currentPlan?.per_user_cost || 0}</div>
                <p className="text-muted-foreground">per user per day</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Superadmin Modules
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {filteredCurrentModules.superadmin?.length > 0 ? (
                  filteredCurrentModules.superadmin.map((module, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="capitalize text-sm">{module.display_value}</span>
                      <Badge variant="outline">${module.cost_per_module}/day</Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-center text-sm">No superadmin modules</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cpu className="h-5 w-5" />
                Integration Modules
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {filteredCurrentModules.integration?.length > 0 ? (
                  filteredCurrentModules.integration.map((module, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="capitalize text-sm">{module.display_value}</span>
                      <Badge variant="outline">${module.cost_per_module}/day</Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-center text-sm">No integration modules</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pricing Summary */}
        {currentPlan && (
          <Card>
            <CardHeader>
              <CardTitle>Pricing Summary</CardTitle>
              <CardDescription>Current pricing configuration overview</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold">${currentPlan.per_user_cost}</div>
                  <p className="text-sm text-muted-foreground">Per User Daily</p>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold">{filteredCurrentModules.superadmin?.length || 0}</div>
                  <p className="text-sm text-muted-foreground">Superadmin Modules</p>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold">{filteredCurrentModules.integration?.length || 0}</div>
                  <p className="text-sm text-muted-foreground">Integration Modules</p>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold">
                    ${(currentPlan.modules?.reduce((sum, m) => sum + m.cost_per_module, 0) || 0).toFixed(2)}
                  </div>
                  <p className="text-sm text-muted-foreground">Total Module Cost/Day</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default MasterPlans;