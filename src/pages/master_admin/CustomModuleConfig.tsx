import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { TableCell, TableHead, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select as ShadcnSelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Plus,
  Settings,
  Trash2,
  Edit,
  Eye,
  Search,
  SlidersHorizontal,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  Upload,
  RefreshCw,
  Building2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customModuleServices, masterServices } from '@/api/services';
import DataTableLayout from '@/components/common/DataTableLayout';

interface CustomModule {
  module_name: string;
  module_display: string;
  is_active: boolean;
  assigned_date?: string;
}

interface CustomModuleConfig {
  _id: string;
  company_id: {
    _id: string;
    company_name: string;
    email: string;
  };
  custom_modules: CustomModule[];
  is_active: boolean;
  created_by: {
    name: string;
    email: string;
  };
  updated_by?: {
    name: string;
    email: string;
  };
  created_at: string;
  updated_at: string;
}

interface AvailableModule {
  option_value: string;
  display_value: string;
  is_active: boolean;
  _id: string;
}

const CustomModuleConfig = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [paginationEnabled, setPaginationEnabled] = useState(true);
  const [sortField, setSortField] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  
  const [selectedConfig, setSelectedConfig] = useState<CustomModuleConfig | null>(null);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedModules, setSelectedModules] = useState<CustomModule[]>([]);
  const [availableModules, setAvailableModules] = useState<AvailableModule[]>([]);

  const queryClient = useQueryClient();

  // Load available modules
  useEffect(() => {
    const loadModules = async () => {
      try {
        const response = await masterServices.getMasterdropdownvalues({
          dropdown_name: ["custom_user_modules"],
        });
        if (response.data.success) {
          const modules = response.data.data[0]?.values || [];
          setAvailableModules(modules);
        }
      } catch (error) {
        console.error('Failed to load modules:', error);
        toast.error('Failed to load available modules');
      }
    };
    loadModules();
  }, []);

  // Function to fetch all configurations when pagination is disabled
  const fetchAllConfigs = async () => {
    try {
      let allData = [];
      let currentPage = 1;
      let hasMore = true;

      while (hasMore) {
        const params = {
          page: currentPage,
          limit: 100,
          search: searchTerm,
          status: statusFilter === 'all' ? '' : statusFilter
        };

        const response = await customModuleServices.getCustomModuleConfigs(params);
        const responseData = response.data;

        allData = [...allData, ...responseData.data];

        if (responseData.data.length < 100) {
          hasMore = false;
        } else {
          currentPage++;
        }
      }

      return {
        data: allData,
        total: allData.length,
        stats: {
          totalConfigs: allData.length,
          activeConfigs: allData.filter((c: any) => c.is_active).length,
          inactiveConfigs: allData.filter((c: any) => !c.is_active).length,
        }
      };
    } catch (error) {
      throw error;
    }
  };

  // Fetch configurations
  const {
    data: configsResponse,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: paginationEnabled
      ? ['custom-module-configs', page, searchTerm, statusFilter, rowsPerPage]
      : ['all-custom-module-configs', searchTerm, statusFilter],
    queryFn: async () => {
      if (!paginationEnabled) {
        return await fetchAllConfigs();
      }

      const params = {
        page: page,
        limit: rowsPerPage,
        search: searchTerm,
        status: statusFilter === 'all' ? '' : statusFilter
      };

      const response = await customModuleServices.getCustomModuleConfigs(params);
      return {
        data: response.data.data,
        total: response.data.pagination?.total || response.data.data.length,
        stats: {
          totalConfigs: response.data.data.length,
          activeConfigs: response.data.data.filter((c: any) => c.is_active).length,
          inactiveConfigs: response.data.data.filter((c: any) => !c.is_active).length,
        }
      };
    },
  });

  // Fetch companies without configuration
  const { data: companiesData } = useQuery({
    queryKey: ['companies-without-config'],
    queryFn: () => customModuleServices.getCompaniesWithoutConfig(),
    enabled: isAddDialogOpen && !selectedConfig
  });

  // Create/Update mutation
  const createUpdateMutation = useMutation({
    mutationFn: (data: any) => 
      selectedConfig 
        ? customModuleServices.updateCustomModuleConfig(selectedConfig._id, data)
        : customModuleServices.createCustomModuleConfig(data),
    onSuccess: () => {
      toast.success(`Configuration ${selectedConfig ? 'updated' : 'created'} successfully`);
      queryClient.invalidateQueries({ queryKey: ['custom-module-configs'] });
      queryClient.invalidateQueries({ queryKey: ['companies-without-config'] });
      handleCloseAddDialog();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Operation failed');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => customModuleServices.deleteCustomModuleConfig(id),
    onSuccess: () => {
      toast.success('Configuration deleted successfully');
      refetch();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to delete configuration');
    },
  });

  // Toggle status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) => 
      customModuleServices.toggleCustomModuleConfigStatus(id, { is_active }),
    onSuccess: () => {
      toast.success('Status updated successfully');
      refetch();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to update status');
    },
  });

  const configs = configsResponse?.data || [];
  const stats = configsResponse?.stats || {};

  // Sort configurations when not using pagination
  const sortedConfigs = React.useMemo(() => {
    if (!sortField) return configs;

    return [...configs].sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      // Handle nested properties
      if (sortField === 'company_name') {
        aValue = a.company_id?.company_name;
        bValue = b.company_id?.company_name;
      } else if (sortField === 'company_email') {
        aValue = a.company_id?.email;
        bValue = b.company_id?.email;
      } else if (sortField === 'created_by_name') {
        aValue = a.created_by?.name || '';
        bValue = b.created_by?.name || '';
      } else if (sortField === 'modules_count') {
        aValue = a.custom_modules?.length || 0;
        bValue = b.custom_modules?.length || 0;
      }

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  }, [configs, sortField, sortOrder]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const getSortIcon = (field: string) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1" />;
    return sortOrder === 'asc' ? (
      <ArrowUp className="h-3 w-3 ml-1" />
    ) : (
      <ArrowDown className="h-3 w-3 ml-1" />
    );
  };

  const handleOpenAddDialog = (config?: CustomModuleConfig) => {
    setSelectedConfig(config || null);
    if (config) {
      setSelectedCompany(config.company_id._id);
      setSelectedModules(config.custom_modules);
    } else {
      setSelectedCompany('');
      setSelectedModules([]);
    }
    setIsAddDialogOpen(true);
  };

  const handleCloseAddDialog = () => {
    setIsAddDialogOpen(false);
    setSelectedConfig(null);
    setSelectedCompany('');
    setSelectedModules([]);
  };

  const handleModuleToggle = (module: AvailableModule, checked: boolean) => {
    if (checked) {
      const newModule: CustomModule = {
        module_name: module.option_value,
        module_display: module.display_value,
        is_active: true
      };
      setSelectedModules([...selectedModules, newModule]);
    } else {
      setSelectedModules(selectedModules.filter(m => m.module_name !== module.option_value));
    }
  };

  const handleModuleStatusToggle = (moduleName: string, isActive: boolean) => {
    setSelectedModules(prevModules => 
      prevModules.map(module => 
        module.module_name === moduleName 
          ? { ...module, is_active: isActive }
          : module
      )
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCompany) {
      toast.error('Please select a company');
      return;
    }

    createUpdateMutation.mutate({
      company_id: selectedCompany,
      custom_modules: selectedModules
    });
  };

  const handleDelete = (config: CustomModuleConfig) => {
    if (window.confirm(`Are you sure you want to delete the configuration for ${config.company_id.company_name}?`)) {
      deleteMutation.mutate(config._id);
    }
  };

  const handleToggleStatus = (config: CustomModuleConfig) => {
    toggleStatusMutation.mutate({
      id: config._id,
      is_active: !config.is_active
    });
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setPage(1);
    refetch();
  };

  const handleRowsPerPageChange = (value: string) => {
    setRowsPerPage(Number(value));
    setPage(1);
  };

  const handlePaginationToggle = (checked: boolean) => {
    setPaginationEnabled(checked);
    setPage(1);
  };

  const handleRefresh = () => {
    refetch();
    toast.success('Data refreshed');
  };

  const handleExport = () => {
    toast.success('Export started');
  };

  // Calculate counts for chips
  const totalConfigs = (stats as any)?.totalConfigs || 0;
  const activeConfigs = (stats as any)?.activeConfigs || 0;
  const inactiveConfigs = (stats as any)?.inactiveConfigs || 0;

  // Prepare stat chips
  const statChips = [
    {
      label: 'Total',
      value: totalConfigs,
      variant: 'outline' as const,
      bgColor: 'bg-gray-100',
      textColor: 'text-gray-800',
      hoverColor: 'hover:bg-gray-100',
    },
    {
      label: 'Active',
      value: activeConfigs,
      variant: 'default' as const,
      bgColor: 'bg-green-100',
      textColor: 'text-green-800',
      hoverColor: 'hover:bg-green-100',
    },
    {
      label: 'Inactive',
      value: inactiveConfigs,
      variant: 'secondary' as const,
      bgColor: 'bg-red-100',
      textColor: 'text-red-800',
      hoverColor: 'hover:bg-red-100',
    },
  ];

  // Prepare action buttons
  const actionButtons = [
    {
      icon: <SlidersHorizontal className="h-4 w-4" />,
      tooltip: 'Search & Filters',
      onClick: () => setIsFilterDialogOpen(true),
      className: 'bg-gray-50 text-gray-700 hover:bg-gray-100 border-gray-200',
    },
    {
      icon: <Download className="h-4 w-4" />,
      tooltip: 'Export Configurations',
      onClick: handleExport,
      className: 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200',
    },
    {
      icon: <Plus className="h-4 w-4" />,
      tooltip: 'Add Configuration',
      onClick: () => handleOpenAddDialog(),
      className: 'bg-green-50 text-green-700 hover:bg-green-100 border-green-200',
    },
    {
      icon: <Upload className="h-4 w-4" />,
      tooltip: 'Import Configurations',
      onClick: () => toast.info('Import feature coming soon'),
      className: 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200',
    },
  ];

  // Render table header
  const renderTableHeader = () => (
    <TableRow>
      <TableHead className="bg-muted/50">S.No</TableHead>
      <TableHead
        className="bg-muted/50 cursor-pointer hover:bg-muted/70"
        onClick={() => handleSort('company_name')}
      >
        <div className="flex items-center">
          Company
          {getSortIcon('company_name')}
        </div>
      </TableHead>
      <TableHead
        className="bg-muted/50 cursor-pointer hover:bg-muted/70"
        onClick={() => handleSort('modules_count')}
      >
        <div className="flex items-center">
          Custom Modules
          {getSortIcon('modules_count')}
        </div>
      </TableHead>
      <TableHead
        className="bg-muted/50 cursor-pointer hover:bg-muted/70"
        onClick={() => handleSort('is_active')}
      >
        <div className="flex items-center">
          Status
          {getSortIcon('is_active')}
        </div>
      </TableHead>
      <TableHead
        className="bg-muted/50 cursor-pointer hover:bg-muted/70"
        onClick={() => handleSort('created_by_name')}
      >
        <div className="flex items-center">
          Created By
          {getSortIcon('created_by_name')}
        </div>
      </TableHead>
      <TableHead
        className="bg-muted/50 cursor-pointer hover:bg-muted/70"
        onClick={() => handleSort('created_at')}
      >
        <div className="flex items-center">
          Created Date
          {getSortIcon('created_at')}
        </div>
      </TableHead>
      <TableHead className="bg-muted/50">Actions</TableHead>
    </TableRow>
  );

  // Render table body
  const renderTableBody = () => (
    <>
      {sortedConfigs.map((config: CustomModuleConfig, index: number) => (
        <TableRow key={config._id}>
          <TableCell>
            {paginationEnabled
              ? (page - 1) * rowsPerPage + index + 1
              : index + 1}
          </TableCell>
          <TableCell>
            <div>
              <p className="font-medium">{config.company_id.company_name}</p>
              <p className="text-sm text-muted-foreground">
                {config.company_id.email}
              </p>
            </div>
          </TableCell>
          <TableCell>
            <div className="flex flex-wrap gap-1">
              {config.custom_modules.slice(0, 3).map((module, idx) => (
                <Badge
                  key={idx}
                  variant={module.is_active ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {module.module_display}
                </Badge>
              ))}
              {config.custom_modules.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{config.custom_modules.length - 3} more
                </Badge>
              )}
            </div>
          </TableCell>
          <TableCell>
            <div className="flex items-center space-x-2">
              <Switch
                checked={config.is_active}
                onCheckedChange={() => handleToggleStatus(config)}
                disabled={toggleStatusMutation.isPending}
              />
              <span className="text-sm">
                {config.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </TableCell>
          <TableCell>
            <div className="text-sm">
              {config.created_by?.name || 'N/A'}
            </div>
          </TableCell>
          <TableCell>
            {new Date(config.created_at).toLocaleDateString()}
          </TableCell>
          <TableCell>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleOpenAddDialog(config)}
                title="Edit Configuration"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(config)}
                title="Delete Configuration"
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </TableCell>
        </TableRow>
      ))}
    </>
  );

  return (
    <>
      <DataTableLayout
        title="Custom Module Configuration"
        data={sortedConfigs}
        isLoading={isLoading}
        totalCount={configsResponse?.total || 0}
        statChips={statChips}
        actionButtons={actionButtons}
        page={page}
        rowsPerPage={rowsPerPage}
        paginationEnabled={paginationEnabled}
        onPageChange={setPage}
        onRowsPerPageChange={handleRowsPerPageChange}
        onPaginationToggle={handlePaginationToggle}
        sortField={sortField}
        sortOrder={sortOrder}
        onSort={handleSort}
        getSortIcon={getSortIcon}
        renderTableHeader={renderTableHeader}
        renderTableBody={renderTableBody}
        onRefresh={handleRefresh}
      />

      {/* Search & Filter Dialog */}
      <Dialog open={isFilterDialogOpen} onOpenChange={setIsFilterDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Search & Filter Configurations</DialogTitle>
            <DialogDescription>
              Search and filter custom module configurations by various criteria
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="search">Search Configurations</Label>
              <Input
                id="search"
                placeholder="Search by company name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="status">Status Filter</Label>
              <ShadcnSelect
                value={statusFilter}
                onValueChange={setStatusFilter}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="true">Active</SelectItem>
                  <SelectItem value="false">Inactive</SelectItem>
                </SelectContent>
              </ShadcnSelect>
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClearFilters}
              >
                Clear Filters
              </Button>
              <Button
                onClick={() => {
                  setPage(1);
                  setIsFilterDialogOpen(false);
                  refetch();
                }}
              >
                Apply Filters
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Configuration Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedConfig ? 'Edit Configuration' : 'Add Configuration'}
            </DialogTitle>
            <DialogDescription>
              {selectedConfig 
                ? `Update custom modules for ${selectedConfig.company_id.company_name}`
                : 'Select a company and assign custom modules'
              }
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!selectedConfig && (
              <div className="space-y-2">
                <Label htmlFor="company">Company</Label>
                <ShadcnSelect value={selectedCompany} onValueChange={setSelectedCompany}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select company" />
                  </SelectTrigger>
                  <SelectContent>
                    {companiesData?.data?.data?.map((company: any) => (
                      <SelectItem key={company._id} value={company._id}>
                        {company.company_name} ({company.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </ShadcnSelect>
              </div>
            )}

            <div className="space-y-3">
              <Label>Available Custom Modules</Label>
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {availableModules.map((module: AvailableModule) => {
                  const isSelected = selectedModules.some(m => m.module_name === module.option_value);
                  const selectedModule = selectedModules.find(m => m.module_name === module.option_value);
                  
                  return (
                    <div key={module._id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Checkbox
                          id={module._id}
                          checked={isSelected}
                          onCheckedChange={(checked) => handleModuleToggle(module, !!checked)}
                        />
                        <Label htmlFor={module._id} className="font-medium">
                          {module.display_value}
                        </Label>
                      </div>
                      {isSelected && selectedModule && (
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={selectedModule.is_active}
                            onCheckedChange={(checked) => {
                              handleModuleStatusToggle(module.option_value, checked);
                            }}
                          />
                          <span className="text-sm text-muted-foreground">
                            {selectedModule.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseAddDialog}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createUpdateMutation.isPending || (!selectedConfig && !selectedCompany)}
              >
                {createUpdateMutation.isPending
                  ? 'Saving...'
                  : selectedConfig
                  ? 'Update Configuration'
                  : 'Create Configuration'
                }
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CustomModuleConfig;