import { useState } from "react";
import { useNavigate } from "react-router-dom";
import DataTableLayout from "@/components/common/DataTableLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableHead, TableRow } from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Copy, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  FileText, 
  Plus, 
  Edit,
  SlidersHorizontal,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { esignServices } from "@/api/services";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";

interface Template {
  _id: string;
  name: string;
  description?: string;
  status: "draft" | "active" | "inactive";
  signature_type: string;
  created_at: string;
  updated_at: string;
  version: number;
}

const EsignTemplates = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [signatureTypeFilter, setSignatureTypeFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [paginationEnabled, setPaginationEnabled] = useState(true);
  const [sortField, setSortField] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const { data: templatesData, isLoading, refetch } = useQuery({
    queryKey: paginationEnabled
      ? ["esign-templates", page, rowsPerPage, statusFilter, signatureTypeFilter]
      : ["all-esign-templates", statusFilter, signatureTypeFilter],
    queryFn: async () => {
      const params: any = {};
      
      if (paginationEnabled) {
        params.page = page;
        params.limit = rowsPerPage;
      } else {
        params.page = 1;
        params.limit = 1000;
      }
      
      if (statusFilter !== "all") params.status = statusFilter;
      if (signatureTypeFilter !== "all") params.signature_type = signatureTypeFilter;
      
      const response = await esignServices.getTemplates(params);
      return response.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => esignServices.deleteTemplate(id),
    onSuccess: () => {
      toast.success("Template deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["esign-templates"] });
      setDeleteDialogOpen(false);
      setSelectedTemplate(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to delete template");
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => esignServices.duplicateTemplate(id),
    onSuccess: (response) => {
      toast.success("Template duplicated successfully");
      queryClient.invalidateQueries({ queryKey: ["esign-templates"] });
      navigate(`/company/esign/templates/${response.data.data._id}`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to duplicate template");
    },
  });

  const activateMutation = useMutation({
    mutationFn: (id: string) => esignServices.activateTemplate(id),
    onSuccess: () => {
      toast.success("Template activated successfully");
      queryClient.invalidateQueries({ queryKey: ["esign-templates"] });
    },
    onError: (error: any) => {
      const errors = error.response?.data?.errors;
      if (errors && Array.isArray(errors)) {
        toast.error("Validation failed", {
          description: errors.join(", "),
        });
      } else {
        toast.error(error.response?.data?.message || "Failed to activate template");
      }
    },
  });

  const handleDelete = (template: Template) => {
    setSelectedTemplate(template);
    setDeleteDialogOpen(true);
  };

  const handleDuplicate = (template: Template) => {
    duplicateMutation.mutate(template._id);
  };

  const handleActivate = (template: Template) => {
    activateMutation.mutate(template._id);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
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
    toast.success("Data refreshed");
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const getSortIcon = (field: string) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4" />;
    return sortOrder === "asc" ? (
      <ArrowUp className="h-4 w-4" />
    ) : (
      <ArrowDown className="h-4 w-4" />
    );
  };

  const handleClearFilters = () => {
    setStatusFilter("all");
    setSignatureTypeFilter("all");
    setPage(1);
    refetch();
  };

  const templates = templatesData?.data || [];
  const totalCount = templatesData?.total || 0;

  // Sort templates
  const sortedTemplates = [...templates].sort((a, b) => {
    if (!sortField) return 0;
    
    const aValue = a[sortField as keyof Template];
    const bValue = b[sortField as keyof Template];
    
    if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
    if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  // Stat chips
  const statChips = [
    {
      label: "Total",
      value: totalCount,
      variant: "outline" as const,
      bgColor: "bg-gray-100",
    },
    {
      label: "Active",
      value: templates.filter((t: Template) => t.status === "active").length,
      variant: "default" as const,
      bgColor: "bg-green-100",
      textColor: "text-green-800",
    },
    {
      label: "Draft",
      value: templates.filter((t: Template) => t.status === "draft").length,
      variant: "secondary" as const,
      bgColor: "bg-yellow-100",
      textColor: "text-yellow-800",
    },
  ];

  // Action buttons
  const actionButtons = [
    {
      icon: <SlidersHorizontal className="h-4 w-4" />,
      tooltip: "Filters",
      onClick: () => setFilterDialogOpen(true),
      variant: "outline" as const,
    },
    {
      icon: (
        <div className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          <span>Create Template</span>
        </div>
      ),
      tooltip: "Create Template",
      onClick: () => navigate("/company/esign/templates/new"),
      variant: "default" as const,
    },
  ];

  const renderTableHeader = () => (
    <>
      <TableHead>
        <Button
          variant="ghost"
          onClick={() => handleSort("name")}
          className="h-8 px-2 lg:px-3"
        >
          Template Name
          {getSortIcon("name")}
        </Button>
      </TableHead>
      <TableHead>
        <Button
          variant="ghost"
          onClick={() => handleSort("status")}
          className="h-8 px-2 lg:px-3"
        >
          Status
          {getSortIcon("status")}
        </Button>
      </TableHead>
      <TableHead>
        <Button
          variant="ghost"
          onClick={() => handleSort("signature_type")}
          className="h-8 px-2 lg:px-3"
        >
          Signature Type
          {getSortIcon("signature_type")}
        </Button>
      </TableHead>
      <TableHead>
        <Button
          variant="ghost"
          onClick={() => handleSort("version")}
          className="h-8 px-2 lg:px-3"
        >
          Version
          {getSortIcon("version")}
        </Button>
      </TableHead>
      <TableHead>
        <Button
          variant="ghost"
          onClick={() => handleSort("created_at")}
          className="h-8 px-2 lg:px-3"
        >
          Created
          {getSortIcon("created_at")}
        </Button>
      </TableHead>
      <TableHead>Actions</TableHead>
    </>
  );

  const renderTableBody = () => (
    <>
      {sortedTemplates.map((template: Template) => (
        <TableRow key={template._id}>
          <TableCell>
            <div className="flex flex-col">
              <span className="font-medium">{template.name}</span>
              {template.description && (
                <span className="text-sm text-muted-foreground">{template.description}</span>
              )}
            </div>
          </TableCell>
          <TableCell>
            <Badge
              variant={
                template.status === "active"
                  ? "default"
                  : template.status === "draft"
                  ? "secondary"
                  : "outline"
              }
              className={
                template.status === "active"
                  ? "bg-green-100 text-green-800 hover:bg-green-100"
                  : template.status === "draft"
                  ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
                  : ""
              }
            >
              {template.status === "active" && <CheckCircle className="w-3 h-3 mr-1" />}
              {template.status === "inactive" && <XCircle className="w-3 h-3 mr-1" />}
              {template.status.charAt(0).toUpperCase() + template.status.slice(1)}
            </Badge>
          </TableCell>
          <TableCell>
            {(() => {
              const type = template.signature_type;
              const typeLabels: Record<string, string> = {
                single: "Single",
                multiple: "Parallel",
                hierarchy: "Sequential",
                send_to_all: "Broadcast",
              };
              return <span>{typeLabels[type] || type}</span>;
            })()}
          </TableCell>
          <TableCell>
            <span>v{template.version}</span>
          </TableCell>
          <TableCell>
            {new Date(template.created_at).toLocaleDateString()}
          </TableCell>
          <TableCell>
            <div className="flex items-center space-x-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-100"
                      onClick={() => navigate(`/company/esign/templates/${template._id}`)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Edit Template</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-purple-600 hover:text-purple-700 hover:bg-purple-100"
                      onClick={() => handleDuplicate(template)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Duplicate Template</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {template.status === "draft" && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-green-600 hover:text-green-700 hover:bg-green-100"
                        onClick={() => handleActivate(template)}
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Activate Template</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-100"
                      onClick={() => handleDelete(template)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Delete Template</p>
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
        title="E-Sign Templates"
        data={sortedTemplates}
        isLoading={isLoading}
        totalCount={totalCount}
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
        cookieName="esign_templates_pagination_enabled"
        cookieMaxAge={60 * 60 * 24 * 30}
      />

      {/* Filter Dialog */}
      <Dialog open={filterDialogOpen} onOpenChange={setFilterDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Filters</DialogTitle>
            <DialogDescription>Filter templates by status and signature type</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="status-filter">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger id="status-filter">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="signature-type-filter">Signature Type</Label>
              <Select value={signatureTypeFilter} onValueChange={setSignatureTypeFilter}>
                <SelectTrigger id="signature-type-filter">
                  <SelectValue placeholder="Select signature type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="single">Single</SelectItem>
                  <SelectItem value="multiple">Parallel</SelectItem>
                  <SelectItem value="hierarchy">Sequential</SelectItem>
                  <SelectItem value="send_to_all">Broadcast</SelectItem>
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
                onClick={() => setFilterDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setPage(1);
                  refetch();
                  setFilterDialogOpen(false);
                }}
                disabled={isLoading}
              >
                {isLoading ? "Applying..." : "Apply Filters"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedTemplate?.name}"? This action cannot be
              undone. Templates with active documents cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedTemplate && deleteMutation.mutate(selectedTemplate._id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default EsignTemplates;
