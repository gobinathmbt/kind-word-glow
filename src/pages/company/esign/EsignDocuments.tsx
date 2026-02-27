import { useState } from "react";
import { useNavigate } from "react-router-dom";
import DataTableLayout from "@/components/common/DataTableLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableHead, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
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
  Eye, 
  Download, 
  Ban, 
  RefreshCw, 
  Bell, 
  SlidersHorizontal,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Send
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { esignServices } from "@/api/services";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";

interface Document {
  _id: string;
  template_snapshot: {
    name: string;
  };
  status: string;
  recipients: Array<{
    email: string;
    name: string;
    status: string;
  }>;
  created_at: string;
  expires_at: string;
  completed_at?: string;
}

const EsignDocuments = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [bulkActionDialogOpen, setBulkActionDialogOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [recipientEmailFilter, setRecipientEmailFilter] = useState("");
  const [dateFromFilter, setDateFromFilter] = useState("");
  const [dateToFilter, setDateToFilter] = useState("");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [paginationEnabled, setPaginationEnabled] = useState(true);
  const [sortField, setSortField] = useState("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);

  const { data: documentsData, isLoading, refetch } = useQuery({
    queryKey: paginationEnabled
      ? ["esign-documents", page, rowsPerPage, statusFilter, recipientEmailFilter, dateFromFilter, dateToFilter, sortField, sortOrder]
      : ["all-esign-documents", statusFilter, recipientEmailFilter, dateFromFilter, dateToFilter, sortField, sortOrder],
    queryFn: async () => {
      const params: any = {
        sort_by: sortField,
        sort_order: sortOrder,
      };
      
      if (paginationEnabled) {
        params.page = page;
        params.limit = rowsPerPage;
      } else {
        params.page = 1;
        params.limit = 1000;
      }
      
      if (statusFilter !== "all") params.status = statusFilter;
      if (recipientEmailFilter) params.recipient_email = recipientEmailFilter;
      if (dateFromFilter) params.date_from = dateFromFilter;
      if (dateToFilter) params.date_to = dateToFilter;
      
      const response = await esignServices.getDocuments(params);
      return response.data;
    },
  });

  const bulkOperationMutation = useMutation({
    mutationFn: (data: { action: 'cancel' | 'download' | 'resend' | 'delete'; document_ids: string[] }) => 
      esignServices.bulkOperation(data),
    onSuccess: (response) => {
      const { succeeded, failed, errors } = response.data.results;
      if (failed > 0) {
        toast.warning(`Bulk operation completed with ${failed} failures`, {
          description: `${succeeded} succeeded, ${failed} failed`,
        });
      } else {
        toast.success(`Bulk operation completed successfully`, {
          description: `${succeeded} documents processed`,
        });
      }
      queryClient.invalidateQueries({ queryKey: ["esign-documents"] });
      setSelectedDocuments([]);
      setBulkActionDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to perform bulk operation");
    },
  });

  const handleBulkAction = (action: string) => {
    if (selectedDocuments.length === 0) {
      toast.error("No documents selected");
      return;
    }
    setSelectedAction(action);
    setBulkActionDialogOpen(true);
  };

  const confirmBulkAction = () => {
    bulkOperationMutation.mutate({
      action: selectedAction as 'cancel' | 'download' | 'resend' | 'delete',
      document_ids: selectedDocuments,
    });
  };

  const toggleDocumentSelection = (docId: string) => {
    setSelectedDocuments(prev =>
      prev.includes(docId)
        ? prev.filter(id => id !== docId)
        : [...prev, docId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedDocuments.length === documents.length) {
      setSelectedDocuments([]);
    } else {
      setSelectedDocuments(documents.map((doc: Document) => doc._id));
    }
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
    setRecipientEmailFilter("");
    setDateFromFilter("");
    setDateToFilter("");
    setPage(1);
    refetch();
  };

  const documents = documentsData?.documents || [];
  const totalCount = documentsData?.pagination?.total || 0;

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: any; color: string; icon: any }> = {
      completed: { variant: "default", color: "bg-green-100 text-green-800 hover:bg-green-100", icon: CheckCircle },
      distributed: { variant: "default", color: "bg-blue-100 text-blue-800 hover:bg-blue-100", icon: Send },
      partially_signed: { variant: "default", color: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100", icon: Clock },
      cancelled: { variant: "outline", color: "bg-red-100 text-red-800 hover:bg-red-100", icon: Ban },
      expired: { variant: "outline", color: "bg-gray-100 text-gray-800 hover:bg-gray-100", icon: Clock },
      rejected: { variant: "outline", color: "bg-red-100 text-red-800 hover:bg-red-100", icon: XCircle },
      draft_preview: { variant: "secondary", color: "bg-purple-100 text-purple-800 hover:bg-purple-100", icon: FileText },
    };

    const config = statusConfig[status] || { variant: "outline", color: "", icon: FileText };
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className={config.color}>
        <Icon className="w-3 h-3 mr-1" />
        {status.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
      </Badge>
    );
  };

  // Stat chips
  const statChips = [
    {
      label: "Total",
      value: totalCount,
      variant: "outline" as const,
      bgColor: "bg-gray-100",
    },
    {
      label: "Completed",
      value: documents.filter((d: Document) => d.status === "completed").length,
      variant: "default" as const,
      bgColor: "bg-green-100",
      textColor: "text-green-800",
    },
    {
      label: "Pending",
      value: documents.filter((d: Document) => 
        ["distributed", "opened", "partially_signed"].includes(d.status)
      ).length,
      variant: "secondary" as const,
      bgColor: "bg-blue-100",
      textColor: "text-blue-800",
    },
    {
      label: "Expired",
      value: documents.filter((d: Document) => d.status === "expired").length,
      variant: "outline" as const,
      bgColor: "bg-gray-100",
      textColor: "text-gray-800",
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
  ];

  // Bulk action buttons
  const bulkActionButtons = selectedDocuments.length > 0 ? [
    {
      icon: <RefreshCw className="h-4 w-4" />,
      label: "Resend",
      tooltip: "Resend to selected documents",
      onClick: () => handleBulkAction("resend"),
      variant: "outline" as const,
    },
    {
      icon: <Bell className="h-4 w-4" />,
      label: "Remind",
      tooltip: "Send reminder for selected documents",
      onClick: () => handleBulkAction("remind"),
      variant: "outline" as const,
    },
    {
      icon: <Ban className="h-4 w-4" />,
      label: "Cancel",
      tooltip: "Cancel selected documents",
      onClick: () => handleBulkAction("cancel"),
      variant: "outline" as const,
    },
    {
      icon: <Trash2 className="h-4 w-4" />,
      label: "Delete",
      tooltip: "Delete selected documents",
      onClick: () => handleBulkAction("delete"),
      variant: "outline" as const,
    },
  ] : [];

  const renderTableHeader = () => (
    <>
      <TableHead className="w-12">
        <Checkbox
          checked={selectedDocuments.length === documents.length && documents.length > 0}
          onCheckedChange={toggleSelectAll}
        />
      </TableHead>
      <TableHead>
        <Button
          variant="ghost"
          onClick={() => handleSort("template_snapshot.name")}
          className="h-8 px-2 lg:px-3"
        >
          Template
          {getSortIcon("template_snapshot.name")}
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
      <TableHead>Recipients</TableHead>
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
      <TableHead>
        <Button
          variant="ghost"
          onClick={() => handleSort("expires_at")}
          className="h-8 px-2 lg:px-3"
        >
          Expires
          {getSortIcon("expires_at")}
        </Button>
      </TableHead>
      <TableHead>Actions</TableHead>
    </>
  );

  const renderTableBody = () => (
    <>
      {documents.map((document: Document) => (
        <TableRow key={document._id}>
          <TableCell>
            <Checkbox
              checked={selectedDocuments.includes(document._id)}
              onCheckedChange={() => toggleDocumentSelection(document._id)}
            />
          </TableCell>
          <TableCell>
            <span className="font-medium">{document.template_snapshot?.name || "Unknown Template"}</span>
          </TableCell>
          <TableCell>
            {getStatusBadge(document.status)}
          </TableCell>
          <TableCell>
            <div className="flex flex-col">
              {document.recipients.slice(0, 2).map((recipient, idx) => (
                <span key={idx} className="text-sm">
                  {recipient.name} ({recipient.email})
                </span>
              ))}
              {document.recipients.length > 2 && (
                <span className="text-sm text-muted-foreground">
                  +{document.recipients.length - 2} more
                </span>
              )}
            </div>
          </TableCell>
          <TableCell>
            {new Date(document.created_at).toLocaleDateString()}
          </TableCell>
          <TableCell>
            {new Date(document.expires_at).toLocaleDateString()}
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
                      onClick={() => navigate(`/company/esign/documents/${document._id}`)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>View Details</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {document.status === "completed" && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-green-600 hover:text-green-700 hover:bg-green-100"
                        onClick={async () => {
                          try {
                            const response = await esignServices.downloadDocument(document._id);
                            const url = window.URL.createObjectURL(new Blob([response.data]));
                            const link = window.document.createElement('a');
                            link.href = url;
                            link.setAttribute('download', `document_${document._id}.pdf`);
                            window.document.body.appendChild(link);
                            link.click();
                            link.remove();
                            toast.success("Document downloaded");
                          } catch (error) {
                            toast.error("Failed to download document");
                          }
                        }}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Download PDF</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </TableCell>
        </TableRow>
      ))}
    </>
  );

  return (
    <>
      <DataTableLayout
        title="E-Sign Documents"
        data={documents}
        isLoading={isLoading}
        totalCount={totalCount}
        statChips={statChips}
        actionButtons={[...actionButtons, ...bulkActionButtons]}
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
        cookieName="esign_documents_pagination_enabled"
        cookieMaxAge={60 * 60 * 24 * 30}
      />

      {/* Filter Dialog */}
      <Dialog open={filterDialogOpen} onOpenChange={setFilterDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Filters</DialogTitle>
            <DialogDescription>Filter documents by status, recipient, and date range</DialogDescription>
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
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="distributed">Distributed</SelectItem>
                  <SelectItem value="partially_signed">Partially Signed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="draft_preview">Draft Preview</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="recipient-email-filter">Recipient Email</Label>
              <Input
                id="recipient-email-filter"
                placeholder="Enter recipient email"
                value={recipientEmailFilter}
                onChange={(e) => setRecipientEmailFilter(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date-from-filter">Date From</Label>
              <Input
                id="date-from-filter"
                type="date"
                value={dateFromFilter}
                onChange={(e) => setDateFromFilter(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date-to-filter">Date To</Label>
              <Input
                id="date-to-filter"
                type="date"
                value={dateToFilter}
                onChange={(e) => setDateToFilter(e.target.value)}
              />
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

      {/* Bulk Action Confirmation Dialog */}
      <AlertDialog open={bulkActionDialogOpen} onOpenChange={setBulkActionDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Bulk Action</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to {selectedAction} {selectedDocuments.length} document(s)?
              This action will be performed on all selected documents.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmBulkAction}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default EsignDocuments;
