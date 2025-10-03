import React, { useState } from 'react';
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
  Database,
  Settings,
  Plus,
  Edit,
  Trash2,
  SlidersHorizontal,
  Download,
  Upload,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { masterDropdownServices } from '@/api/services';
import MasterValueManagementDialog from '@/components/master-dropdown/MasterValueManagementDialog';
import DataTableLayout from '@/components/common/DataTableLayout';

const MasterDropdownMaster = () => {
  // State management
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [paginationEnabled, setPaginationEnabled] = useState(true);
  const [sortField, setSortField] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);

  // Dialog states
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isValueDialogOpen, setIsValueDialogOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [selectedDropdown, setSelectedDropdown] = useState(null);
  const [editDropdown, setEditDropdown] = useState(null);

  const [formData, setFormData] = useState({
    dropdown_name: '',
    display_name: '',
    description: '',
    allow_multiple_selection: false,
    is_required: false
  });

  // Function to fetch all dropdowns when pagination is disabled
  const fetchAllDropdowns = async () => {
    try {
      let allData = [];
      let currentPage = 1;
      let hasMore = true;

      while (hasMore) {
        const response = await masterDropdownServices.getMasterDropdowns({
          page: currentPage,
          limit: 100,
          search: searchTerm,
          status: statusFilter
        });

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
          totalDropdowns: allData.length,
          activeDropdowns: allData.filter((d: any) => d.is_active).length,
          inactiveDropdowns: allData.filter((d: any) => !d.is_active).length,
        }
      };
    } catch (error) {
      throw error;
    }
  };

  const { data: dropdownsResponse, isLoading, refetch } = useQuery({
    queryKey: paginationEnabled
      ? ['master-dropdowns', page, searchTerm, statusFilter, rowsPerPage]
      : ['all-master-dropdowns', searchTerm, statusFilter],
    queryFn: async () => {
      if (!paginationEnabled) {
        return await fetchAllDropdowns();
      }

      const response = await masterDropdownServices.getMasterDropdowns({
        page: page,
        limit: rowsPerPage,
        search: searchTerm,
        status: statusFilter
      });

      return {
        data: response.data.data,
        total: response.data.pagination.total,
        stats: {
          totalDropdowns: response.data.data.length,
          activeDropdowns: response.data.data.filter((d: any) => d.is_active).length,
          inactiveDropdowns: response.data.data.filter((d: any) => !d.is_active).length,
        }
      };
    },
  });

  const dropdowns = dropdownsResponse?.data || [];
  const stats = dropdownsResponse?.stats || {};

  // Sort dropdowns when not using pagination
  const sortedDropdowns = React.useMemo(() => {
    if (!sortField) return dropdowns;

    return [...dropdowns].sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      // Handle nested properties
      if (sortField === 'values_count') {
        aValue = a.values?.length || 0;
        bValue = b.values?.length || 0;
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
  }, [dropdowns, sortField, sortOrder]);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await masterDropdownServices.createMasterDropdown(formData);
      toast.success('Master dropdown created successfully');
      setIsDialogOpen(false);
      setFormData({
        dropdown_name: '',
        display_name: '',
        description: '',
        allow_multiple_selection: false,
        is_required: false
      });
      refetch();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create master dropdown');
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      await masterDropdownServices.updateMasterDropdown(editDropdown._id, editDropdown);
      toast.success('Master dropdown updated successfully');
      setIsEditDialogOpen(false);
      setEditDropdown(null);
      refetch();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update master dropdown');
    }
  };

  const handleToggleStatus = async (dropdownId, currentStatus) => {
    try {
      await masterDropdownServices.updateMasterDropdown(dropdownId, { is_active: !currentStatus });
      toast.success('Status updated successfully');
      refetch();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const confirmDeleteDropdown = (dropdownId) => {
    setDeleteTargetId(dropdownId);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteDropdown = async () => {
    try {
      await masterDropdownServices.deleteMasterDropdown(deleteTargetId);
      toast.success('Master dropdown deleted successfully');
      refetch();
    } catch (error) {
      toast.error('Failed to delete master dropdown');
    } finally {
      setIsDeleteDialogOpen(false);
      setDeleteTargetId(null);
    }
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
  const totalDropdowns = (stats as any)?.totalDropdowns || 0;
  const activeDropdowns = (stats as any)?.activeDropdowns || 0;
  const inactiveDropdowns = (stats as any)?.inactiveDropdowns || 0;

  // Prepare stat chips
  const statChips = [
    {
      label: 'Total',
      value: totalDropdowns,
      variant: 'outline' as const,
      bgColor: 'bg-gray-100',
      textColor: 'text-gray-800',
      hoverColor: 'hover:bg-gray-100',
    },
    {
      label: 'Active',
      value: activeDropdowns,
      variant: 'default' as const,
      bgColor: 'bg-green-100',
      textColor: 'text-green-800',
      hoverColor: 'hover:bg-green-100',
    },
    {
      label: 'Inactive',
      value: inactiveDropdowns,
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
      tooltip: 'Export Dropdowns',
      onClick: handleExport,
      className: 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200',
    },
    {
      icon: <Database className="h-4 w-4" />,
      tooltip: 'Create Master Dropdown',
      onClick: () => setIsDialogOpen(true),
      className: 'bg-green-50 text-green-700 hover:bg-green-100 border-green-200',
    },
    {
      icon: <Upload className="h-4 w-4" />,
      tooltip: 'Import Dropdowns',
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
        onClick={() => handleSort('dropdown_name')}
      >
        <div className="flex items-center">
          Name
          {getSortIcon('dropdown_name')}
        </div>
      </TableHead>
      <TableHead
        className="bg-muted/50 cursor-pointer hover:bg-muted/70"
        onClick={() => handleSort('display_name')}
      >
        <div className="flex items-center">
          Display Name
          {getSortIcon('display_name')}
        </div>
      </TableHead>
      <TableHead
        className="bg-muted/50 cursor-pointer hover:bg-muted/70"
        onClick={() => handleSort('values_count')}
      >
        <div className="flex items-center">
          Values
          {getSortIcon('values_count')}
        </div>
      </TableHead>
      <TableHead className="bg-muted/50">Settings</TableHead>
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
      {sortedDropdowns.map((dropdown: any, index: number) => (
        <TableRow key={dropdown._id}>
          <TableCell>
            {paginationEnabled
              ? (page - 1) * rowsPerPage + index + 1
              : index + 1}
          </TableCell>
          <TableCell>
            <div>
              <p className="font-medium">{dropdown.dropdown_name}</p>
              <p className="text-sm text-muted-foreground">{dropdown.description}</p>
            </div>
          </TableCell>
          <TableCell>{dropdown.display_name}</TableCell>
          <TableCell>
            <div className="flex flex-wrap gap-1">
              {dropdown.values?.slice(0, 3).map((value, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {value.display_value || value.option_value}
                </Badge>
              ))}
              {dropdown.values?.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{dropdown.values.length - 3} more
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedDropdown(dropdown);
                  setIsValueDialogOpen(true);
                }}
                className="h-6 px-2"
                title="Add Value"
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </TableCell>
          <TableCell>
            <div className="flex gap-1">
              {dropdown.allow_multiple_selection && (
                <Badge variant="outline" className="text-xs">Multi</Badge>
              )}
              {dropdown.is_required && (
                <Badge variant="outline" className="text-xs">Required</Badge>
              )}
            </div>
          </TableCell>
          <TableCell>
            <div className="flex items-center space-x-2">
              <Switch
                checked={dropdown.is_active}
                onCheckedChange={() => handleToggleStatus(dropdown._id, dropdown.is_active)}
              />
              <span className="text-sm">
                {dropdown.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </TableCell>
          <TableCell>
            {new Date(dropdown.created_at).toLocaleDateString()}
          </TableCell>
          <TableCell>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedDropdown(dropdown);
                  setIsValueDialogOpen(true);
                }}
                title="Manage Values"
              >
                <Settings className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditDropdown(dropdown);
                  setIsEditDialogOpen(true);
                }}
                title="Edit Dropdown"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => confirmDeleteDropdown(dropdown._id)}
                title="Delete Dropdown"
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
        title="Master Dropdown Management"
        data={sortedDropdowns}
        isLoading={isLoading}
        totalCount={dropdownsResponse?.total || 0}
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
            <DialogTitle>Search & Filter Master Dropdowns</DialogTitle>
            <DialogDescription>
              Search and filter master dropdowns by various criteria
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="search">Search Dropdowns</Label>
              <Input
                id="search"
                placeholder="Search by dropdown name, display name, or description..."
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
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
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

      {/* Create Master Dropdown Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Master Dropdown</DialogTitle>
            <DialogDescription>
              Create a global dropdown that can be used across all companies
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="dropdown_name">Internal Name</Label>
              <Input
                id="dropdown_name"
                value={formData.dropdown_name}
                onChange={(e) => setFormData({ ...formData, dropdown_name: e.target.value })}
                placeholder="vehicle_condition"
                required
              />
              <p className="text-sm text-muted-foreground">Used internally (lowercase, no spaces)</p>
            </div>
            <div>
              <Label htmlFor="display_name">Display Name</Label>
              <Input
                id="display_name"
                value={formData.display_name}
                onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                placeholder="Vehicle Condition"
                required
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Global condition options for vehicles"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="allow_multiple"
                checked={formData.allow_multiple_selection}
                onCheckedChange={(checked) => setFormData({ ...formData, allow_multiple_selection: checked === true })}
              />
              <Label htmlFor="allow_multiple">Allow multiple selections</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_required"
                checked={formData.is_required}
                onCheckedChange={(checked) => setFormData({ ...formData, is_required: checked === true })}
              />
              <Label htmlFor="is_required">Required field</Label>
            </div>
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Create Dropdown</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Value Management Dialog */}
      <MasterValueManagementDialog
        isOpen={isValueDialogOpen}
        onClose={() => setIsValueDialogOpen(false)}
        dropdown={selectedDropdown}
        onRefetch={refetch}
      />

      {/* Edit Dropdown Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Master Dropdown</DialogTitle>
            <DialogDescription>Update details for this master dropdown</DialogDescription>
          </DialogHeader>
          {editDropdown && (
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <Label htmlFor="edit_dropdown_name">Dropdown Name</Label>
                <Input
                  id="edit_dropdown_name"
                  value={editDropdown.dropdown_name}
                  onChange={(e) =>
                    setEditDropdown({ ...editDropdown, dropdown_name: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit_display_name">Display Name</Label>
                <Input
                  id="edit_display_name"
                  value={editDropdown.display_name}
                  onChange={(e) =>
                    setEditDropdown({ ...editDropdown, display_name: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit_description">Description</Label>
                <Input
                  id="edit_description"
                  value={editDropdown.description}
                  onChange={(e) =>
                    setEditDropdown({ ...editDropdown, description: e.target.value })
                  }
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="edit_allow_multiple"
                  checked={editDropdown.allow_multiple_selection}
                  onCheckedChange={(checked) =>
                    setEditDropdown({ ...editDropdown, allow_multiple_selection: checked === true })
                  }
                />
                <Label htmlFor="edit_allow_multiple">Allow multiple selections</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="edit_is_required"
                  checked={editDropdown.is_required}
                  onCheckedChange={(checked) =>
                    setEditDropdown({ ...editDropdown, is_required: checked === true })
                  }
                />
                <Label htmlFor="edit_is_required">Required field</Label>
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Update Dropdown</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Confirmation</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this master dropdown? This action cannot be undone and will affect all companies using this dropdown.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2 mt-4">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteDropdown}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MasterDropdownMaster;