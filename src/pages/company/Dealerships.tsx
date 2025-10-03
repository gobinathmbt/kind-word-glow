import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { TableCell, TableHead, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, Plus, Edit, Trash2, MapPin, Mail, User, Filter, X, ArrowUpDown, ArrowUp, ArrowDown, Download, Upload, SlidersHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { dealershipServices } from '@/api/services';
import DeleteConfirmationDialog from '@/components/dialogs/DeleteConfirmationDialog';
import DataTableLayout from '@/components/common/DataTableLayout';

const Dealerships = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
  const [paginationEnabled, setPaginationEnabled] = useState(true);
  const [sortField, setSortField] = useState('');
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [editDealership, setEditDealership] = useState(null);

  const [formData, setFormData] = useState({
    dealership_name: '',
    dealership_address: '',
    dealership_email: ''
  });

  // Function to fetch all dealerships when pagination is disabled
  const fetchAllDealerships = async () => {
    try {
      let allData = [];
      let currentPage = 1;
      let hasMore = true;

      while (hasMore) {
        const params = new URLSearchParams({
          page: currentPage.toString(),
          limit: '100',
        });

        if (searchTerm) params.append('search', searchTerm);
        if (statusFilter !== 'all') params.append('status', statusFilter);

        const response = await dealershipServices.getDealerships({
          ...Object.fromEntries(params),
        });

        allData = [...allData, ...response.data.data];

        if (response.data.data.length < 100) {
          hasMore = false;
        } else {
          currentPage++;
        }
      }

      return {
        data: allData,
        total: allData.length,
        stats: {
          totalDealerships: allData.length,
          activeDealerships: allData.filter(d => d.is_active).length,
          inactiveDealerships: allData.filter(d => !d.is_active).length,
        }
      };
    } catch (error) {
      throw error;
    }
  };

  const { data: dealershipsData, isLoading, refetch } = useQuery({
    queryKey: paginationEnabled
      ? ['dealerships', page, searchTerm, statusFilter, rowsPerPage]
      : ['all-dealerships', searchTerm, statusFilter],
    queryFn: async () => {
      if (!paginationEnabled) {
        return await fetchAllDealerships();
      }

      const response = await dealershipServices.getDealerships({
        page: page,
        limit: rowsPerPage,
        search: searchTerm,
        status: statusFilter
      });
      return response.data;
    }
  });

  const dealerships = dealershipsData?.data || [];
  const stats = dealershipsData?.stats || {};

  // Sort dealerships when not using pagination
  const sortedDealerships = React.useMemo(() => {
    if (!sortField) return dealerships;

    return [...dealerships].sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      // Handle nested properties
      if (sortField === 'created_by_name') {
        aValue = `${a.created_by?.first_name || ''} ${a.created_by?.last_name || ''}`.trim();
        bValue = `${b.created_by?.first_name || ''} ${b.created_by?.last_name || ''}`.trim();
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
  }, [dealerships, sortField, sortOrder]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const getSortIcon = (field) => {
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
      await dealershipServices.createDealership(formData);
      toast.success('Dealership created successfully');
      setIsDialogOpen(false);
      setFormData({
        dealership_name: '',
        dealership_address: '',
        dealership_email: ''
      });
      refetch();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create dealership');
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      await dealershipServices.updateDealership(editDealership._id, editDealership);
      toast.success('Dealership updated successfully');
      setIsEditDialogOpen(false);
      setEditDealership(null);
      refetch();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update dealership');
    }
  };

  const handleToggleStatus = async (dealershipId, currentStatus) => {
    try {
      await dealershipServices.toggleDealershipStatus(dealershipId, { is_active: !currentStatus });
      toast.success('Dealership status updated successfully');
      refetch();
    } catch (error) {
      toast.error('Failed to update dealership status');
    }
  };

  const confirmDeleteDealership = (dealershipId) => {
    setDeleteTargetId(dealershipId);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteDealership = async () => {
    try {
      await dealershipServices.deleteDealership(deleteTargetId);
      toast.success('Dealership deleted successfully');
      refetch();
    } catch (error) {
      toast.error('Failed to delete dealership');
    } finally {
      setIsDeleteDialogOpen(false);
      setDeleteTargetId(null);
    }
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
  };

  const handleRowsPerPageChange = (value) => {
    setRowsPerPage(Number(value));
    setPage(1);
  };

  const handlePaginationToggle = (checked) => {
    setPaginationEnabled(checked);
    setPage(1);
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setPage(1);
    refetch();
  };

  const handleFilterChange = (value) => {
    setStatusFilter(value);
    setPage(1);
    refetch();
  };

  const handleRefresh = () => {
    refetch();
    toast.success('Data refreshed');
  };

  const handleExport = () => {
    toast.success('Export started');
  };

  // Calculate counts for chips
  const totalDealerships = dealershipsData?.total || stats.totalDealerships || 0;
  const activeDealerships = stats.activeDealerships || dealerships.filter(d => d.is_active).length;
  const inactiveDealerships = stats.inactiveDealerships || dealerships.filter(d => !d.is_active).length;

  // Prepare stat chips
  const statChips = [
    {
      label: 'Total',
      value: totalDealerships,
      variant: 'outline' as const,
      bgColor: 'bg-gray-100',
    },
    {
      label: 'Active',
      value: activeDealerships,
      variant: 'default' as const,
      bgColor: 'bg-green-100',
      textColor: 'text-green-800',
      hoverColor: 'hover:bg-green-100',
    },
    {
      label: 'Inactive',
      value: inactiveDealerships,
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
      tooltip: 'Export Report',
      onClick: handleExport,
      className: 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200',
    },
    {
      icon: <Plus className="h-4 w-4" />,
      tooltip: 'Add Dealership',
      onClick: () => setIsDialogOpen(true),
      className: 'bg-green-50 text-green-700 hover:bg-green-100 border-green-200',
    },
    {
      icon: <Upload className="h-4 w-4" />,
      tooltip: 'Import Dealerships',
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
        onClick={() => handleSort('dealership_id')}
      >
        <div className="flex items-center">
          Dealership ID
          {getSortIcon('dealership_id')}
        </div>
      </TableHead>
      <TableHead
        className="bg-muted/50 cursor-pointer hover:bg-muted/70"
        onClick={() => handleSort('dealership_name')}
      >
        <div className="flex items-center">
          Name
          {getSortIcon('dealership_name')}
        </div>
      </TableHead>
      <TableHead
        className="bg-muted/50 cursor-pointer hover:bg-muted/70"
        onClick={() => handleSort('dealership_address')}
      >
        <div className="flex items-center">
          Address
          {getSortIcon('dealership_address')}
        </div>
      </TableHead>
      <TableHead className="bg-muted/50">Email</TableHead>
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
      <TableHead className="bg-muted/50">Actions</TableHead>
    </TableRow>
  );

  // Render table body
  const renderTableBody = () => (
    <>
      {sortedDealerships.map((dealership, index) => (
        <TableRow key={dealership._id}>
          <TableCell>
            {paginationEnabled
              ? (page - 1) * rowsPerPage + index + 1
              : index + 1}
          </TableCell>
          <TableCell>
            <Badge variant="outline" className="font-mono">
              {dealership.dealership_id}
            </Badge>
          </TableCell>
          <TableCell>
            <div className="flex items-center space-x-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{dealership.dealership_name}</span>
            </div>
          </TableCell>
          <TableCell>
            <div className="flex items-center space-x-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm max-w-xs truncate">{dealership.dealership_address}</span>
            </div>
          </TableCell>
          <TableCell>
            {dealership.dealership_email ? (
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{dealership.dealership_email}</span>
              </div>
            ) : (
              <span className="text-muted-foreground">-</span>
            )}
          </TableCell>
          <TableCell>
            <div className="flex items-center space-x-2">
              <Switch
                checked={dealership.is_active}
                onCheckedChange={() => handleToggleStatus(dealership._id, dealership.is_active)}
              />
              <Badge
                variant={dealership.is_active ? 'default' : 'secondary'}
                className={
                  dealership.is_active
                    ? 'bg-green-100 text-green-800 hover:bg-green-100'
                    : 'bg-red-100 text-red-800 hover:bg-red-100'
                }
              >
                {dealership.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </TableCell>
          <TableCell>
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                {dealership.created_by?.first_name} {dealership.created_by?.last_name}
              </span>
            </div>
          </TableCell>
          <TableCell>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditDealership(dealership);
                  setIsEditDialogOpen(true);
                }}
                title="Edit Dealership"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => confirmDeleteDealership(dealership._id)}
                title="Delete Dealership"
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
        title="Multi Dealership"
        data={sortedDealerships}
        isLoading={isLoading}
        totalCount={dealershipsData?.total || totalDealerships}
        statChips={statChips}
        actionButtons={actionButtons}
        page={page}
        rowsPerPage={rowsPerPage}
        paginationEnabled={paginationEnabled}
        onPageChange={handlePageChange}
        onRowsPerPageChange={handleRowsPerPageChange}
        onPaginationToggle={handlePaginationToggle}
        sortField={sortField}
        sortOrder={sortOrder}
        onSort={handleSort}
        getSortIcon={getSortIcon}
        renderTableHeader={renderTableHeader}
        renderTableBody={renderTableBody}
        onRefresh={handleRefresh}
        cookieName="dealership_pagination_enabled" // Custom cookie name
        cookieMaxAge={60 * 60 * 24 * 30} // 30 days
      />

      {/* Search & Filter Dialog */}
      <Dialog open={isFilterDialogOpen} onOpenChange={setIsFilterDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Search & Filters</DialogTitle>
            <DialogDescription>
              Search and filter dealerships by various criteria
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search Dealerships</Label>
              <div className="relative">
                <Input
                  id="search"
                  placeholder="Search by name, address, email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                />
                {searchTerm && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 h-6 w-6"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status-filter">Filter by Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger id="status-filter">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={handleClearFilters}
              disabled={isLoading}
            >
              Clear Filters
            </Button>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={() => setIsFilterDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setPage(1);
                  refetch();
                  setIsFilterDialogOpen(false);
                }}
                disabled={isLoading}
              >
                {isLoading ? 'Applying...' : 'Apply Filters'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Dealership Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Dealership</DialogTitle>
            <DialogDescription>
              Create a new dealership location for your company
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="dealership_name">Dealership Name</Label>
              <Input
                id="dealership_name"
                value={formData.dealership_name}
                onChange={(e) => setFormData({ ...formData, dealership_name: e.target.value })}
                placeholder="Downtown Auto Center"
                required
              />
            </div>
            <div>
              <Label htmlFor="dealership_address">Dealership Address</Label>
              <Input
                id="dealership_address"
                value={formData.dealership_address}
                onChange={(e) => setFormData({ ...formData, dealership_address: e.target.value })}
                placeholder="123 Main Street, City, State, ZIP"
                required
              />
            </div>
            <div>
              <Label htmlFor="dealership_email">Dealership Email (Optional)</Label>
              <Input
                id="dealership_email"
                type="email"
                value={formData.dealership_email}
                onChange={(e) => setFormData({ ...formData, dealership_email: e.target.value })}
                placeholder="dealership@company.com"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Add Dealership</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dealership Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Dealership</DialogTitle>
            <DialogDescription>Update dealership information</DialogDescription>
          </DialogHeader>
          {editDealership && (
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <Label htmlFor="edit_dealership_name">Dealership Name</Label>
                <Input
                  id="edit_dealership_name"
                  value={editDealership.dealership_name}
                  onChange={(e) =>
                    setEditDealership({ ...editDealership, dealership_name: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit_dealership_address">Dealership Address</Label>
                <Input
                  id="edit_dealership_address"
                  value={editDealership.dealership_address}
                  onChange={(e) =>
                    setEditDealership({ ...editDealership, dealership_address: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit_dealership_email">Dealership Email</Label>
                <Input
                  id="edit_dealership_email"
                  type="email"
                  value={editDealership.dealership_email || ''}
                  onChange={(e) =>
                    setEditDealership({ ...editDealership, dealership_email: e.target.value })
                  }
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Update Dealership</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setDeleteTargetId(null);
        }}
        onConfirm={handleDeleteDealership}
        title="Delete Dealership"
        description="Are you sure you want to delete this dealership? This action cannot be undone."
      />
    </>
  );
};

export default Dealerships;