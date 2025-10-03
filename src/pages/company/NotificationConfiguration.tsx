import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationConfigServices, dealershipServices } from '@/api/services';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Users, Database, ArrowUpDown, ArrowUp, ArrowDown, SlidersHorizontal, Download, Eye, MoreHorizontal } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import DataTableLayout from '@/components/common/DataTableLayout';
import EnhancedNotificationConfigForm from '@/components/notifications/EnhancedNotificationConfigForm';
import { toast as sonnerToast } from 'sonner';
import { TableCell, TableHead, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface NotificationConfiguration {
  _id: string;
  name: string;
  description: string;
  trigger_type: 'create' | 'update' | 'delete';
  target_schema: string;
  target_fields: Array<{
    field_name: string;
    operator: string;
    value: any;
    condition: 'and' | 'or';
  }>;
  target_users: {
    type: 'all' | 'specific_users' | 'role_based' | 'department_based' | 'dealership_based';
    user_ids: string[];
    roles: string[];
    departments: string[];
    dealership_ids: string[];
    exclude_user_ids: string[];
  };
  message_template: {
    title: string;
    body: string;
    action_url?: string;
    variables: Array<{
      variable_name: string;
      field_path: string;
    }>;
  };
  notification_channels: {
    in_app: boolean;
  };
  priority: 'low' | 'medium' | 'high' | 'urgent';
  is_active: boolean;
  created_by: {
    first_name: string;
    last_name: string;
    email: string;
  };
  created_at: string;
  updated_at: string;
}

const NotificationConfiguration: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<NotificationConfiguration | null>(null);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [paginationEnabled, setPaginationEnabled] = useState(true);
  const [sortField, setSortField] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [configToDelete, setConfigToDelete] = useState<any>(null);

  const fetchAllConfigurations = async () => {
    try {
      let allData = [];
      let currentPage = 1;
      let hasMore = true;

      while (hasMore) {
        const params: any = {
          page: currentPage,
          limit: 100,
        };

        if (searchTerm) params.search = searchTerm;
        if (statusFilter !== 'all') params.status = statusFilter;

        const response = await notificationConfigServices.getNotificationConfigurations(params);
        const configurations = response.data?.data?.configurations || [];
        
        allData = [...allData, ...configurations];

        if (configurations.length < 100) {
          hasMore = false;
        } else {
          currentPage++;
        }
      }

      return {
        data: allData,
        total: allData.length,
      };
    } catch (error) {
      throw error;
    }
  };

  const { data: configurationsData, isLoading: loadingConfigurations, refetch } = useQuery({
    queryKey: paginationEnabled
      ? ['notification-configurations-paginated', page, searchTerm, statusFilter, rowsPerPage]
      : ['notification-configurations-all', searchTerm, statusFilter],
    queryFn: async () => {
      if (!paginationEnabled) {
        return await fetchAllConfigurations();
      }

      const params: any = {
        page,
        limit: rowsPerPage,
      };

      if (searchTerm) params.search = searchTerm;
      if (statusFilter !== 'all') params.status = statusFilter;

      const response = await notificationConfigServices.getNotificationConfigurations(params);
      return {
        data: response.data?.data?.configurations || [],
        total: response.data?.data?.pagination?.total_records || 0,
      };
    },
    refetchOnWindowFocus: false,
    staleTime: 0,
  });

  const { data: schemasData } = useQuery({
    queryKey: ['available-schemas'],
    queryFn: () => notificationConfigServices.getAvailableSchemas()
  });

  const { data: usersData } = useQuery({
    queryKey: ['company-users'],
    queryFn: () => notificationConfigServices.getCompanyUsers()
  });

  const { data: dealershipsData } = useQuery({
    queryKey: ['company-dealerships'],
    queryFn: () => dealershipServices.getDealerships()
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => notificationConfigServices.deleteNotificationConfiguration(id),
    onSuccess: () => {
      toast({ title: 'Success', description: 'Notification configuration deleted successfully' });
      queryClient.invalidateQueries({ queryKey: ['notification-configurations'] });
      queryClient.invalidateQueries({ queryKey: ['notification-configurations-paginated'] });
      queryClient.invalidateQueries({ queryKey: ['notification-configurations-all'] });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed to delete configuration', variant: 'destructive' });
    }
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) => 
      notificationConfigServices.toggleNotificationConfigurationStatus(id, { is_active }),
    onSuccess: () => {
      toast({ title: 'Success', description: 'Status updated successfully' });
      queryClient.invalidateQueries({ queryKey: ['notification-configurations'] });
      queryClient.invalidateQueries({ queryKey: ['notification-configurations-paginated'] });
      queryClient.invalidateQueries({ queryKey: ['notification-configurations-all'] });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed to update status', variant: 'destructive' });
    }
  });

  const configurations = configurationsData?.data || [];
  const availableSchemas = schemasData?.data?.data || {};
  const users = usersData?.data?.data || [];
  const dealerships = dealershipsData?.data?.data || [];

  const sortedConfigurations = React.useMemo(() => {
    if (!sortField) return configurations;

    return [...configurations].sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      if (sortField === 'created_by_name') {
        aValue = `${a.created_by?.first_name} ${a.created_by?.last_name}`;
        bValue = `${b.created_by?.first_name} ${b.created_by?.last_name}`;
      } else if (sortField === 'conditions_count') {
        aValue = a.target_fields?.length || 0;
        bValue = b.target_fields?.length || 0;
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
  }, [configurations, sortField, sortOrder]);

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

    const handleDelete = (configId: string, configName: string) => {
      setConfigToDelete({ id: configId, name: configName });
      setDeleteConfirmOpen(true);
    };

    const confirmDelete = () => {
      if (configToDelete) {
        deleteMutation.mutate(configToDelete.id);
        setDeleteConfirmOpen(false);
        setConfigToDelete(null);
      }
    };

  const handleToggleStatus = (config: NotificationConfiguration) => {
    toggleStatusMutation.mutate({
      id: config._id,
      is_active: !config.is_active
    });
  };

  const handleEdit = (config: NotificationConfiguration) => {
    setSelectedConfig(config);
    setIsEditDialogOpen(true);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'secondary';
      case 'medium': return 'default';
      case 'low': return 'outline';
      default: return 'default';
    }
  };

  const getSchemaIcon = (schema: string) => {
    switch (schema) {
      case 'User': return <Users className="h-4 w-4" />;
      case 'Vehicle': return <Database className="h-4 w-4" />;
      default: return <Database className="h-4 w-4" />;
    }
  };

  const handleFormSuccess = () => {
    setIsCreateDialogOpen(false);
    setIsEditDialogOpen(false);
    setSelectedConfig(null);
    queryClient.invalidateQueries({ queryKey: ['notification-configurations'] });
    queryClient.invalidateQueries({ queryKey: ['notification-configurations-paginated'] });
    queryClient.invalidateQueries({ queryKey: ['notification-configurations-all'] });
  };

  const handleRowsPerPageChange = (value: string) => {
    setRowsPerPage(Number(value));
    setPage(1);
  };

  const handlePaginationToggle = (checked: boolean) => {
    setPaginationEnabled(checked);
    setPage(1);
    setTimeout(() => {
      refetch();
    }, 100);
  };

  const handleRefresh = () => {
    refetch();
    sonnerToast.success("Data refreshed");
  };

  const handleExport = () => {
    sonnerToast.success("Export started");
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setPage(1);
    refetch();
  };

  const totalConfigurations = configurationsData?.total || 0;
  const activeCount = configurations.filter((c: NotificationConfiguration) => c.is_active).length;
  const inactiveCount = configurations.filter((c: NotificationConfiguration) => !c.is_active).length;
  const urgentCount = configurations.filter((c: NotificationConfiguration) => c.priority === 'urgent').length;

  const statChips = [
    {
      label: "Total",
      value: totalConfigurations,
      variant: "outline" as const,
      bgColor: "bg-gray-100",
    },
    {
      label: "Active",
      value: activeCount,
      variant: "default" as const,
      bgColor: "bg-green-100",
      textColor: "text-green-800",
      hoverColor: "hover:bg-green-100",
    },
    {
      label: "Inactive",
      value: inactiveCount,
      variant: "secondary" as const,
      bgColor: "bg-gray-100",
      textColor: "text-gray-800",
      hoverColor: "hover:bg-gray-100",
    },
    {
      label: "Urgent",
      value: urgentCount,
      variant: "destructive" as const,
      bgColor: "bg-red-100",
      textColor: "text-red-800",
      hoverColor: "hover:bg-red-100",
    },
  ];

  const actionButtons = [
    {
      icon: <SlidersHorizontal className="h-4 w-4" />,
      tooltip: "Search & Filters",
      onClick: () => setIsFilterDialogOpen(true),
      className: "bg-gray-50 text-gray-700 hover:bg-gray-100 border-gray-200",
    },
    {
      icon: <Download className="h-4 w-4" />,
      tooltip: "Export Report",
      onClick: handleExport,
      className: "bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200",
    },
    {
      icon: <Plus className="h-4 w-4" />,
      tooltip: "Create Configuration",
      onClick: () => setIsCreateDialogOpen(true),
      className: "bg-green-50 text-green-700 hover:bg-green-100 border-green-200",
    },
  ];

  const renderTableHeader = () => (
    <TableRow>
      <TableHead className="bg-muted/50">S.No</TableHead>
      <TableHead
        className="bg-muted/50 cursor-pointer hover:bg-muted/70"
        onClick={() => handleSort('name')}
      >
        <div className="flex items-center">
          Name
          {getSortIcon('name')}
        </div>
      </TableHead>
      <TableHead
        className="bg-muted/50 cursor-pointer hover:bg-muted/70"
        onClick={() => handleSort('target_schema')}
      >
        <div className="flex items-center">
          Schema
          {getSortIcon('target_schema')}
        </div>
      </TableHead>
      <TableHead
        className="bg-muted/50 cursor-pointer hover:bg-muted/70"
        onClick={() => handleSort('trigger_type')}
      >
        <div className="flex items-center">
          Trigger
          {getSortIcon('trigger_type')}
        </div>
      </TableHead>
      <TableHead
        className="bg-muted/50 cursor-pointer hover:bg-muted/70"
        onClick={() => handleSort('conditions_count')}
      >
        <div className="flex items-center">
          Conditions
          {getSortIcon('conditions_count')}
        </div>
      </TableHead>
      <TableHead
        className="bg-muted/50 cursor-pointer hover:bg-muted/70"
        onClick={() => handleSort('priority')}
      >
        <div className="flex items-center">
          Priority
          {getSortIcon('priority')}
        </div>
      </TableHead>
      <TableHead className="bg-muted/50">Status</TableHead>
      <TableHead
        className="bg-muted/50 cursor-pointer hover:bg-muted/70"
        onClick={() => handleSort('created_by_name')}
      >
        <div className="flex items-center">
          Created By
          {getSortIcon('created_by_name')}
        </div>
      </TableHead>
      <TableHead className="bg-muted/50">Actions</TableHead>
    </TableRow>
  );

  const renderTableBody = () => (
    <>
      {sortedConfigurations.map((config: NotificationConfiguration, index: number) => (
        <TableRow key={config._id} className="hover:bg-muted/30 border-b">
          <TableCell>
            {paginationEnabled
              ? (page - 1) * rowsPerPage + index + 1
              : index + 1}
          </TableCell>
          <TableCell>
            <div>
              <div className="font-medium">{config.name}</div>
              {config.description && (
                <div className="text-sm text-muted-foreground truncate max-w-xs">
                  {config.description}
                </div>
              )}
            </div>
          </TableCell>
          <TableCell>
            <div className="flex items-center space-x-2">
              {getSchemaIcon(config.target_schema)}
              <span>{config.target_schema}</span>
            </div>
          </TableCell>
          <TableCell>
            <Badge variant="outline" className="capitalize">
              {config.trigger_type.replace('_', ' ')}
            </Badge>
          </TableCell>
          <TableCell>
            {config.target_fields && config.target_fields.length > 0 ? (
              <Badge variant="secondary">
                {config.target_fields.length} condition{config.target_fields.length > 1 ? 's' : ''}
              </Badge>
            ) : (
              <span className="text-sm text-muted-foreground">None</span>
            )}
          </TableCell>
          <TableCell>
            <Badge 
              variant={getPriorityColor(config.priority) as any}
              className={
                config.priority === 'urgent'
                  ? "bg-red-100 text-red-800 hover:bg-red-100"
                  : config.priority === 'high'
                  ? "bg-orange-100 text-orange-800 hover:bg-orange-100"
                  : config.priority === 'medium'
                  ? "bg-blue-100 text-blue-800 hover:bg-blue-100"
                  : "bg-gray-100 text-gray-800 hover:bg-gray-100"
              }
            >
              {config.priority}
            </Badge>
          </TableCell>
          <TableCell>
            <div className="flex items-center space-x-2">
              <Switch
                checked={config.is_active}
                onCheckedChange={() => handleToggleStatus(config)}
                disabled={toggleStatusMutation.isPending}
              />
              <span className="text-sm text-muted-foreground">
                {config.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </TableCell>
          <TableCell>
            <div className="text-sm">
              {config.created_by?.first_name} {config.created_by?.last_name}
            </div>
          </TableCell>
          <TableCell>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleEdit(config)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => handleDelete(config._id, config.name)}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </TableCell>
        </TableRow>
      ))}
    </>
  );

  return (
    <>
      <DataTableLayout
        title="Notification Configuration"
        data={sortedConfigurations}
        isLoading={loadingConfigurations}
        totalCount={configurationsData?.total || 0}
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
        cookieName="notification_config_pagination_enabled"
        cookieMaxAge={60 * 60 * 24 * 30}
      />

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <EnhancedNotificationConfigForm
            schemas={availableSchemas}
            users={users}
            dealerships={dealerships}
            onSuccess={handleFormSuccess}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedConfig && (
            <EnhancedNotificationConfigForm
              schemas={availableSchemas}
              users={users}
              dealerships={dealerships}
              editData={selectedConfig}
              onSuccess={handleFormSuccess}
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              Delete Notification Configuration
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <span className="font-semibold text-foreground">"{configToDelete?.name}"</span>?
              <br />
              <br />
              This action cannot be undone. All notification rules and settings will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Delete Configuration
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isFilterDialogOpen} onOpenChange={setIsFilterDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5" />
              Search & Filters
            </DialogTitle>
            <DialogDescription>
              Filter notification configurations by various criteria
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                placeholder="Search configurations by name or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 pt-4">
              <Button 
                onClick={() => {
                  setIsFilterDialogOpen(false);
                  refetch();
                }} 
                className="flex-1"
              >
                Apply Filters
              </Button>
              <Button 
                variant="outline" 
                onClick={handleClearFilters} 
                className="flex-1"
              >
                Clear All
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default NotificationConfiguration;