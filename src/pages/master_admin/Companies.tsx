import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { TableCell, TableHead, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select as ShadcnSelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Building2,
  Trash2,
  Edit,
  Eye,
  Users,
  Search,
  SlidersHorizontal,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  Upload,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import apiClient from "@/api/axios";
import { ConfirmDeleteDialog } from "./ConfirmDeleteDialog";
import { CompanyDetailsDialog } from "./CompanyDetailsDialog";
import { CompanyEditDialog } from "./CompanyEditDialog";
import DataTableLayout from "@/components/common/DataTableLayout";

const MasterCompanies = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [paginationEnabled, setPaginationEnabled] = useState(true);
  const [sortField, setSortField] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
  
  const [deleteDialog, setDeleteDialog] = useState({
    isOpen: false,
    companyId: "",
    companyName: "",
  });
  
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [editCompany, setEditCompany] = useState(null);
  
  const [isDeleting, setIsDeleting] = useState(false);

  // Function to fetch all companies when pagination is disabled
  const fetchAllCompanies = async () => {
    try {
      let allData = [];
      let currentPage = 1;
      let hasMore = true;

      while (hasMore) {
        const params = new URLSearchParams({
          page: currentPage.toString(),
          limit: "100",
        });

        if (searchTerm) params.append("search", searchTerm);
        if (statusFilter !== "all") params.append("status", statusFilter);

        const response = await apiClient.get(`/api/master/companies?${params}`);
        const responseData = response.data;

        allData = [...allData, ...responseData.data.companies];

        if (responseData.data.companies.length < 100) {
          hasMore = false;
        } else {
          currentPage++;
        }
      }

      return {
        data: allData,
        total: allData.length,
        stats: {
          totalCompanies: allData.length,
          activeCompanies: allData.filter((c: any) => c.is_active).length,
          inactiveCompanies: allData.filter((c: any) => !c.is_active).length,
        }
      };
    } catch (error) {
      throw error;
    }
  };

  const {
    data: companiesResponse,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: paginationEnabled
      ? ["companies", page, searchTerm, statusFilter, rowsPerPage]
      : ["all-companies", searchTerm, statusFilter],
    queryFn: async () => {
      if (!paginationEnabled) {
        return await fetchAllCompanies();
      }

      const params = new URLSearchParams({
        page: page.toString(),
        limit: rowsPerPage.toString(),
      });

      if (searchTerm) params.append("search", searchTerm);
      if (statusFilter !== "all") params.append("status", statusFilter);

      const response = await apiClient.get(`/api/master/companies?${params}`);
      return {
        data: response.data.data.companies,
        total: response.data.data.totalCount,
        stats: {
          totalCompanies: response.data.data.companies.length,
          activeCompanies: response.data.data.companies.filter((c: any) => c.is_active).length,
          inactiveCompanies: response.data.data.companies.filter((c: any) => !c.is_active).length,
        }
      };
    },
  });

  const companies = companiesResponse?.data || [];
  const stats = companiesResponse?.stats || {};

  // Sort companies when not using pagination
  const sortedCompanies = React.useMemo(() => {
    if (!sortField) return companies;

    return [...companies].sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      // Handle nested properties
      if (sortField === "contact_person") {
        aValue = a.contact_person;
        bValue = b.contact_person;
      } else if (sortField === "user_count") {
        aValue = a.current_user_count;
        bValue = b.current_user_count;
      } else if (sortField === "plan_name") {
        aValue = a.plan_id?.display_name || "";
        bValue = b.plan_id?.display_name || "";
      }

      if (typeof aValue === "string") {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  }, [companies, sortField, sortOrder]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const getSortIcon = (field: string) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1" />;
    return sortOrder === "asc" ? (
      <ArrowUp className="h-3 w-3 ml-1" />
    ) : (
      <ArrowDown className="h-3 w-3 ml-1" />
    );
  };

  const handleDeleteCompany = async () => {
    setIsDeleting(true);
    try {
      await apiClient.delete(`/api/master/companies/${deleteDialog.companyId}`);
      toast.success("Company deleted successfully");
      setDeleteDialog({ isOpen: false, companyId: "", companyName: "" });
      refetch();
    } catch (error) {
      toast.error("Failed to delete company");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleStatus = async (companyId: string, currentStatus: boolean) => {
    try {
      await apiClient.patch(`/api/master/companies/${companyId}/status`, {
        is_active: !currentStatus,
      });
      toast.success("Company status updated successfully");
      refetch();
    } catch (error) {
      toast.error("Failed to update company status");
    }
  };

  const handleViewDetails = (company: any) => {
    setSelectedCompany(company);
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
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

  const openDeleteDialog = (companyId: string, companyName: string) => {
    setDeleteDialog({
      isOpen: true,
      companyId,
      companyName,
    });
  };

  const closeDeleteDialog = () => {
    setDeleteDialog({
      isOpen: false,
      companyId: "",
      companyName: "",
    });
  };

  const handleRefresh = () => {
    refetch();
    toast.success("Data refreshed");
  };

  const handleExport = () => {
    toast.success("Export started");
  };

// Calculate counts for chips
const totalCompanies = (stats as any)?.totalCompanies || 0;
const activeCompanies = (stats as any)?.activeCompanies || 0;
const inactiveCompanies = (stats as any)?.inactiveCompanies || 0;

  // Prepare stat chips
  const statChips = [
    {
      label: "Total",
      value: totalCompanies,
      variant: "outline" as const,
      bgColor: "bg-gray-100",
      textColor: "text-gray-800",
      hoverColor: "hover:bg-gray-100",
    },
    {
      label: "Active",
      value: activeCompanies,
      variant: "default" as const,
      bgColor: "bg-green-100",
      textColor: "text-green-800",
      hoverColor: "hover:bg-green-100",
    },
    {
      label: "Inactive",
      value: inactiveCompanies,
      variant: "secondary" as const,
      bgColor: "bg-red-100",
      textColor: "text-red-800",
      hoverColor: "hover:bg-red-100",
    },
  ];

  // Prepare action buttons
  const actionButtons = [
    {
      icon: <SlidersHorizontal className="h-4 w-4" />,
      tooltip: "Search & Filters",
      onClick: () => setIsFilterDialogOpen(true),
      className: "bg-gray-50 text-gray-700 hover:bg-gray-100 border-gray-200",
    },
    {
      icon: <Download className="h-4 w-4" />,
      tooltip: "Export Companies",
      onClick: handleExport,
      className: "bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200",
    },
    {
      icon: <Plus className="h-4 w-4" />,
      tooltip: "Add Company",
      onClick: () => toast.info("Add company feature coming soon"),
      className: "bg-green-50 text-green-700 hover:bg-green-100 border-green-200",
    },
    {
      icon: <Upload className="h-4 w-4" />,
      tooltip: "Import Companies",
      onClick: () => toast.info("Import feature coming soon"),
      className: "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200",
    },
  ];

  // Render table header
  const renderTableHeader = () => (
    <TableRow>
      <TableHead className="bg-muted/50">S.No</TableHead>
      <TableHead
        className="bg-muted/50 cursor-pointer hover:bg-muted/70"
        onClick={() => handleSort("company_name")}
      >
        <div className="flex items-center">
          Company
          {getSortIcon("company_name")}
        </div>
      </TableHead>
      <TableHead
        className="bg-muted/50 cursor-pointer hover:bg-muted/70"
        onClick={() => handleSort("email")}
      >
        <div className="flex items-center">
          Email
          {getSortIcon("email")}
        </div>
      </TableHead>
      <TableHead
        className="bg-muted/50 cursor-pointer hover:bg-muted/70"
        onClick={() => handleSort("contact_person")}
      >
        <div className="flex items-center">
          Contact Person
          {getSortIcon("contact_person")}
        </div>
      </TableHead>
      <TableHead
        className="bg-muted/50 cursor-pointer hover:bg-muted/70"
        onClick={() => handleSort("plan_name")}
      >
        <div className="flex items-center">
          Plan
          {getSortIcon("plan_name")}
        </div>
      </TableHead>
      <TableHead
        className="bg-muted/50 cursor-pointer hover:bg-muted/70"
        onClick={() => handleSort("user_count")}
      >
        <div className="flex items-center">
          Users
          {getSortIcon("user_count")}
        </div>
      </TableHead>
      <TableHead
        className="bg-muted/50 cursor-pointer hover:bg-muted/70"
        onClick={() => handleSort("is_active")}
      >
        <div className="flex items-center">
          Status
          {getSortIcon("is_active")}
        </div>
      </TableHead>
      <TableHead
        className="bg-muted/50 cursor-pointer hover:bg-muted/70"
        onClick={() => handleSort("created_at")}
      >
        <div className="flex items-center">
          Created
          {getSortIcon("created_at")}
        </div>
      </TableHead>
      <TableHead className="bg-muted/50">Actions</TableHead>
    </TableRow>
  );

  // Render table body
  const renderTableBody = () => (
    <>
      {sortedCompanies.map((company: any, index: number) => (
        <TableRow key={company._id}>
          <TableCell>
            {paginationEnabled
              ? (page - 1) * rowsPerPage + index + 1
              : index + 1}
          </TableCell>
          <TableCell>
            <div>
              <p className="font-medium">{company.company_name}</p>
              <p className="text-sm text-muted-foreground">
                {company.email}
              </p>
            </div>
          </TableCell>
          <TableCell>{company.email}</TableCell>
          <TableCell>{company.contact_person}</TableCell>
          <TableCell>
            <Badge variant="outline">
              {company.plan_id?.display_name || "No Plan"}
            </Badge>
          </TableCell>
          <TableCell>
            {company.current_user_count}/{company.user_limit}
          </TableCell>
          <TableCell>
            <div className="flex items-center space-x-2">
              <Switch
                checked={company.is_active}
                onCheckedChange={() =>
                  handleToggleStatus(company._id, company.is_active)
                }
              />
              <span className="text-sm">
                {company.is_active ? "Active" : "Inactive"}
              </span>
            </div>
          </TableCell>
          <TableCell>
            {new Date(company.created_at).toLocaleDateString()}
          </TableCell>
          <TableCell>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleViewDetails(company)}
                title="View Details"
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditCompany(company)}
                title="Edit Company"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  openDeleteDialog(company._id, company.company_name)
                }
                title="Delete Company"
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
        title="Companies Management"
        data={sortedCompanies}
        isLoading={isLoading}
        totalCount={companiesResponse?.total || 0}
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
            <DialogTitle>Search & Filter Companies</DialogTitle>
            <DialogDescription>
              Search and filter companies by various criteria
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="search">Search Companies</Label>
              <Input
                id="search"
                placeholder="Search by company name, email, or contact person..."
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

      {/* Company Details Dialog */}
      <CompanyDetailsDialog
        open={!!selectedCompany}
        onClose={() => setSelectedCompany(null)}
        company={selectedCompany}
      />

      {/* Edit Company Dialog */}
      <CompanyEditDialog
        open={!!editCompany}
        onClose={() => setEditCompany(null)}
        company={editCompany}
        onUpdated={refetch}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDeleteDialog
        open={deleteDialog.isOpen}
        onClose={closeDeleteDialog}
        onConfirm={handleDeleteCompany}
       
      />


     
    </>
  );
};

export default MasterCompanies;