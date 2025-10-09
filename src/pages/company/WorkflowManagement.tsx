import React, { useState } from 'react';
import { Plus, Play, Pause, Trash2, Edit, ArrowUpDown, ArrowUp, ArrowDown, SlidersHorizontal, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { workflowServices } from '@/api/services';
import WorkflowBuilder from '@/components/workflows/WorkflowBuilder';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import DataTableLayout from '@/components/common/DataTableLayout';
import { TableCell, TableHead, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast as sonnerToast } from 'sonner';

const WorkflowManagement = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [paginationEnabled, setPaginationEnabled] = useState(true);
  const [sortField, setSortField] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [workflowToDelete, setWorkflowToDelete] = useState<any>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const fetchAllWorkflows = async () => {
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
        if (typeFilter !== 'all') params.type = typeFilter;

        const response = await workflowServices.getWorkflows(params);
        const workflows = response.data?.data?.workflows || [];
        
        allData = [...allData, ...workflows];

        if (workflows.length < 100) {
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

  const { data: workflowsData, isLoading: workflowsLoading, refetch } = useQuery({
    queryKey: paginationEnabled
      ? ['workflows-paginated', page, searchTerm, statusFilter, typeFilter, rowsPerPage]
      : ['workflows-all', searchTerm, statusFilter, typeFilter],
    queryFn: async () => {
      if (!paginationEnabled) {
        return await fetchAllWorkflows();
      }

      const params: any = {
        page,
        limit: rowsPerPage,
      };

      if (searchTerm) params.search = searchTerm;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (typeFilter !== 'all') params.type = typeFilter;

      const response = await workflowServices.getWorkflows(params);
      return {
        data: response.data?.data?.workflows || [],
        total: response.data?.data?.total || 0,
      };
    },
    refetchOnWindowFocus: false,
    staleTime: 0,
  });

  const { data: statsData } = useQuery({
    queryKey: ['workflow-stats'],
    queryFn: () => workflowServices.getWorkflowStats(),
  });

  const deleteWorkflowMutation = useMutation({
    mutationFn: (workflowId: string) => workflowServices.deleteWorkflow(workflowId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      queryClient.invalidateQueries({ queryKey: ['workflows-paginated'] });
      queryClient.invalidateQueries({ queryKey: ['workflows-all'] });
      queryClient.invalidateQueries({ queryKey: ['workflow-stats'] });
      toast({
        title: "Success",
        description: "Workflow deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to delete workflow",
        variant: "destructive",
      });
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ workflowId, status }: { workflowId: string; status: string }) => 
      workflowServices.toggleWorkflowStatus(workflowId, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      queryClient.invalidateQueries({ queryKey: ['workflows-paginated'] });
      queryClient.invalidateQueries({ queryKey: ['workflows-all'] });
      queryClient.invalidateQueries({ queryKey: ['workflow-stats'] });
      toast({
        title: "Success", 
        description: "Workflow status updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to update workflow status",
        variant: "destructive",
      });
    },
  });

  const workflows = workflowsData?.data || [];

  const sortedWorkflows = React.useMemo(() => {
    if (!sortField) return workflows;

    return [...workflows].sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      if (sortField === 'execution_rate') {
        aValue = a.execution_stats?.total_executions || 0;
        bValue = b.execution_stats?.total_executions || 0;
      } else if (sortField === 'success_rate') {
        const aTotal = a.execution_stats?.total_executions || 0;
        const bTotal = b.execution_stats?.total_executions || 0;
        aValue = aTotal > 0 ? ((a.execution_stats?.successful_executions || 0) / aTotal) * 100 : 0;
        bValue = bTotal > 0 ? ((b.execution_stats?.successful_executions || 0) / bTotal) * 100 : 0;
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
  }, [workflows, sortField, sortOrder]);

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

  const handleCreateWorkflow = () => {
    setSelectedWorkflow(null);
    setIsBuilderOpen(true);
  };

  const handleEditWorkflow = (workflow: any) => {
    setSelectedWorkflow(workflow);
    setIsBuilderOpen(true);
  };

    const handleDeleteWorkflow = (workflowId: string, workflowName: string) => {
    setWorkflowToDelete({ id: workflowId, name: workflowName });
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (workflowToDelete) {
      deleteWorkflowMutation.mutate(workflowToDelete.id);
      setDeleteConfirmOpen(false);
      setWorkflowToDelete(null);
    }
  };

  const handleToggleStatus = (workflowId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    toggleStatusMutation.mutate({ workflowId, status: newStatus });
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'inactive':
        return 'secondary';
      case 'draft':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const getWorkflowTypeLabel = (type: string) => {
    switch (type) {
      case 'vehicle_inbound':
        return 'Vehicle Inbound';
      default:
        return type;
    }
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
    setTypeFilter('all');
    setPage(1);
    refetch();
  };

  const totalWorkflows = workflowsData?.total || 0;
  const activeCount = workflows.filter((w: any) => w.status === 'active').length;
  const inactiveCount = workflows.filter((w: any) => w.status === 'inactive').length;
  const draftCount = workflows.filter((w: any) => w.status === 'draft').length;

  const statChips = [
    {
      label: "Total",
      value: totalWorkflows,
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
      label: "Draft",
      value: draftCount,
      variant: "outline" as const,
      bgColor: "bg-yellow-100",
      textColor: "text-yellow-800",
      hoverColor: "hover:bg-yellow-100",
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
      tooltip: "Create Workflow",
      onClick: handleCreateWorkflow,
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
          Workflow Name
          {getSortIcon('name')}
        </div>
      </TableHead>
      <TableHead
        className="bg-muted/50 cursor-pointer hover:bg-muted/70"
        onClick={() => handleSort('workflow_type')}
      >
        <div className="flex items-center">
          Type
          {getSortIcon('workflow_type')}
        </div>
      </TableHead>
      <TableHead
        className="bg-muted/50 cursor-pointer hover:bg-muted/70"
        onClick={() => handleSort('status')}
      >
        <div className="flex items-center">
          Status
          {getSortIcon('status')}
        </div>
      </TableHead>
      <TableHead
        className="bg-muted/50 cursor-pointer hover:bg-muted/70"
        onClick={() => handleSort('execution_rate')}
      >
        <div className="flex items-center">
          Total Executions
          {getSortIcon('execution_rate')}
        </div>
      </TableHead>
      <TableHead
        className="bg-muted/50 cursor-pointer hover:bg-muted/70"
        onClick={() => handleSort('success_rate')}
      >
        <div className="flex items-center">
          Success Rate
          {getSortIcon('success_rate')}
        </div>
      </TableHead>
      <TableHead
        className="bg-muted/50 cursor-pointer hover:bg-muted/70"
        onClick={() => handleSort('created_at')}
      >
        <div className="flex items-center">
          Created
          {getSortIcon('created_at')}
        </div>
      </TableHead>
      <TableHead className="bg-muted/50">Actions</TableHead>
    </TableRow>
  );

  // Render table body
  const renderTableBody = () => (
    <>
      {sortedWorkflows.map((workflow: any, index: number) => (
        <TableRow key={workflow._id} className="hover:bg-muted/30 border-b">
          <TableCell>
            {paginationEnabled
              ? (page - 1) * rowsPerPage + index + 1
              : index + 1}
          </TableCell>
          <TableCell>
            <div>
              <p className="font-medium">{workflow.name}</p>
              {workflow.description && (
                <p className="text-sm text-muted-foreground truncate max-w-xs">
                  {workflow.description}
                </p>
              )}
              {workflow.custom_endpoint && (
                <p className="text-xs text-blue-600 mt-1">
                  /api/workflow-execute/{workflow.custom_endpoint}
                </p>
              )}
            </div>
          </TableCell>
          <TableCell>
            <Badge variant="outline" className="whitespace-nowrap">
              {getWorkflowTypeLabel(workflow.workflow_type)}
            </Badge>
          </TableCell>
          <TableCell>
            <Badge
              variant={getStatusBadgeVariant(workflow.status)}
              className={
                workflow.status === 'active'
                  ? "bg-green-100 text-green-800 hover:bg-green-100"
                  : workflow.status === 'inactive'
                  ? "bg-gray-100 text-gray-800 hover:bg-gray-100"
                  : "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
              }
            >
              {workflow.status}
            </Badge>
          </TableCell>
          <TableCell>
            <span className="font-medium">
              {workflow.execution_stats?.total_executions || 0}
            </span>
          </TableCell>
          <TableCell>
            <span className="font-medium">
              {workflow.execution_stats?.total_executions > 0
                ? Math.round(
                    ((workflow.execution_stats?.successful_executions || 0) /
                      workflow.execution_stats.total_executions) *
                      100
                  )
                : 0}%
            </span>
          </TableCell>
          <TableCell>
            <div>
              <p className="text-sm">
                {new Date(workflow.created_at).toLocaleDateString()}
              </p>
              <p className="text-xs text-muted-foreground">
                Updated: {new Date(workflow.updated_at).toLocaleDateString()}
              </p>
            </div>
          </TableCell>
          <TableCell>
           <div className="flex items-center gap-2">
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleEditWorkflow(workflow)}
          className="h-8 w-8 p-0"
        >
          <Edit className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Edit Workflow</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>

  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleToggleStatus(workflow._id, workflow.status)}
          disabled={toggleStatusMutation.isPending}
          className="h-8 w-8 p-0"
        >
          {workflow.status === 'active' ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{workflow.status === 'active' ? 'Pause Workflow' : 'Play Workflow'}</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>

  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleDeleteWorkflow(workflow._id, workflow.name)}
          disabled={deleteWorkflowMutation.isPending}
          className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Delete Workflow</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
</div>

          </TableCell>
        </TableRow>
      ))}
    </>
  );

  return (
    <>
      <DataTableLayout
        title="Workflow Management"
        data={sortedWorkflows}
        isLoading={workflowsLoading}
        totalCount={workflowsData?.total || 0}
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
        cookieName="workflow_pagination_enabled"
        cookieMaxAge={60 * 60 * 24 * 30}
      />

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              Delete Workflow
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <span className="font-semibold text-foreground">"{workflowToDelete?.name}"</span>?
              <br />
              <br />
              This action cannot be undone. All workflow executions and configurations will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Delete Workflow
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <Dialog open={isBuilderOpen} onOpenChange={setIsBuilderOpen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle>
              {selectedWorkflow ? 'Edit Workflow' : 'Create New Workflow'}
            </DialogTitle>
            <DialogDescription>
              Use the visual workflow builder to create and configure your automation
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            <WorkflowBuilder 
              workflow={selectedWorkflow}
              onSave={() => {
                setIsBuilderOpen(false);
                queryClient.invalidateQueries({ queryKey: ['workflows'] });
                queryClient.invalidateQueries({ queryKey: ['workflows-paginated'] });
                queryClient.invalidateQueries({ queryKey: ['workflows-all'] });
                queryClient.invalidateQueries({ queryKey: ['workflow-stats'] });
              }}
              onCancel={() => setIsBuilderOpen(false)}
            />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isFilterDialogOpen} onOpenChange={setIsFilterDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5" />
              Search & Filters
            </DialogTitle>
            <DialogDescription>
              Filter workflows by various criteria
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <Input
                placeholder="Search workflows by name or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Workflow Type</label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="vehicle_inbound">Vehicle Inbound</SelectItem>
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

export default WorkflowManagement;