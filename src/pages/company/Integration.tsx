import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Settings,
  Plug,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Download,
  Upload,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import { companyServices, integrationServices } from "@/api/services";
import { useAuth } from "@/auth/AuthContext";
import S3ConfigDialog from "@/components/integrations/S3ConfigDialog";
import SendGridConfigDialog from "@/components/integrations/SendGridConfigDialog";
import AutoGrabConfigDialog from "@/components/integrations/AutoGrabConfigDialog";
import DataTableLayout from "@/components/common/DataTableLayout";
import { TableCell, TableHead, TableRow } from "@/components/ui/table";

interface Integration {
  _id: string;
  integration_type: string;
  display_name: string;
  is_active: boolean;
  created_at: string;
}

const Integration = () => {
  const { completeUser } = useAuth();
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [selectedIntegration, setSelectedIntegration] =
    useState<Integration | null>(null);

  // DataTable states
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [paginationEnabled, setPaginationEnabled] = useState(true);
  const [sortField, setSortField] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showAddIntegration, setShowAddIntegration] = useState(false);

  // Fetch company integration modules
  const { data: modulesData } = useQuery({
    queryKey: ["company-integration-modules"],
    queryFn: async () => {
      const response = await companyServices.getMasterdropdownvalues({
        dropdown_name: ["company_integration_modules"],
      });
      return response.data;
    },
  });

  // Fetch existing integrations
  const {
    data: integrationsData,
    refetch,
    isLoading,
  } = useQuery({
    queryKey: paginationEnabled
      ? ["integrations", page, searchTerm, statusFilter, rowsPerPage]
      : ["all-integrations", searchTerm, statusFilter],
    queryFn: async () => {
      if (!paginationEnabled) {
        // Fetch all data when pagination is disabled
        const response = await integrationServices.getIntegrations();
        return {
          data: response.data.data || [],
          total: response.data.data?.length || 0,
          pagination: { total_items: response.data.data?.length || 0 },
        };
      }

      const response = await integrationServices.getIntegrations();
      return {
        data: response.data.data || [],
        total: response.data.data?.length || 0,
        pagination: { total_items: response.data.data?.length || 0 },
      };
    },
  });

  const integrations = integrationsData?.data || [];

  // Sort integrations when not using pagination
  const sortedIntegrations = React.useMemo(() => {
    if (!sortField) return integrations;

    return [...integrations].sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

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
  }, [integrations, sortField, sortOrder]);

  // Filter available modules based on company access
  const availableModules = React.useMemo(() => {
    if (!modulesData || !completeUser?.company_id?.module_access) return [];

    const integrationModules = modulesData.data?.find(
      (dropdown: any) =>
        dropdown.dropdown_name === "company_integration_modules"
    );

    if (!integrationModules) return [];

    // Filter modules that exist in company's module_access
    return integrationModules.values.filter((module: any) =>
      completeUser.company_id.module_access.includes(module.option_value)
    );
  }, [modulesData, completeUser]);

  // Get existing integration for a module
  const getExistingIntegration = (moduleType: string) => {
    return integrationsData?.data?.find(
      (integration: Integration) => integration.integration_type === moduleType
    );
  };

  const handleConfigureModule = (moduleType: string) => {
    const existing = getExistingIntegration(moduleType);
    setSelectedIntegration(existing || null);
    setSelectedModule(moduleType);
  };

  const handleCloseDialog = () => {
    setSelectedModule(null);
    setSelectedIntegration(null);
    refetch();
  };

  const getModuleIcon = (moduleType: string) => {
    const icons: Record<string, any> = {
      s3_config: Plug,
      sendgrid: Plug,
      smtp: Plug,
      payment_gateway: Plug,
      api_integration: Plug,
    };
    const Icon = icons[moduleType] || Plug;
    return <Icon className="h-6 w-6" />;
  };

  const getModuleColor = (moduleType: string) => {
    const colors: Record<string, string> = {
      s3_config: "bg-blue-100 text-blue-800",
      sendgrid: "bg-green-100 text-green-800",
      smtp: "bg-purple-100 text-purple-800",
      payment_gateway: "bg-orange-100 text-orange-800",
      api_integration: "bg-pink-100 text-pink-800",
    };
    return colors[moduleType] || "bg-gray-100 text-gray-800";
  };

  // DataTable Layout Handlers
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

  const handleRefresh = () => {
    refetch();
    toast.success("Data refreshed");
  };

  const handleExport = () => {
    toast.success("Export started");
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

  // Calculate counts for chips
  const totalIntegrations = integrationsData?.pagination?.total_items || 0;
  const activeCount = integrations.filter((i: any) => i.is_active).length;
  const inactiveCount = integrations.filter((i: any) => !i.is_active).length;
  const configuredCount = integrations.length;

  // Prepare stat chips
  const statChips = [
    {
      label: "Total Modules",
      value: availableModules.length,
      variant: "outline" as const,
      bgColor: "bg-gray-100",
    },
    {
      label: "Configured",
      value: configuredCount,
      variant: "default" as const,
      bgColor: "bg-green-100",
      textColor: "text-green-800",
      hoverColor: "hover:bg-green-100",
    },
    {
      label: "Active",
      value: activeCount,
      variant: "default" as const,
      bgColor: "bg-blue-100",
      textColor: "text-blue-800",
      hoverColor: "hover:bg-blue-100",
    },
    {
      label: "Available",
      value: availableModules.length - configuredCount,
      variant: "secondary" as const,
      bgColor: "bg-orange-100",
      textColor: "text-orange-800",
      hoverColor: "hover:bg-orange-100",
    },
  ];

  // Prepare action buttons
  const actionButtons = [
    {
      icon: <Plus className="h-4 w-4" />,
      tooltip: "Add Integration",
      onClick: () => setShowAddIntegration(true),
      className:
        "bg-green-50 text-green-700 hover:bg-green-100 border-green-200",
    },
    {
      icon: <SlidersHorizontal className="h-4 w-4" />,
      tooltip: "Search & Filters",
      onClick: () => toast.info("Filter feature coming soon"),
      className: "bg-gray-50 text-gray-700 hover:bg-gray-100 border-gray-200",
    },
    {
      icon: <Download className="h-4 w-4" />,
      tooltip: "Export Integrations",
      onClick: handleExport,
      className: "bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200",
    },
    {
      icon: <Upload className="h-4 w-4" />,
      tooltip: "Import Integrations",
      onClick: () => toast.info("Import feature coming soon"),
      className:
        "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200",
    },
  ];

  // Render table header
  const renderTableHeader = () => (
    <TableRow>
      <TableHead className="bg-muted/50">S.No</TableHead>
      <TableHead
        className="bg-muted/50 cursor-pointer hover:bg-muted/70"
        onClick={() => handleSort("display_name")}
      >
        <div className="flex items-center">
          Integration Name
          {getSortIcon("display_name")}
        </div>
      </TableHead>
      <TableHead className="bg-muted/50">Type</TableHead>
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
      {sortedIntegrations.map((integration: any, index: number) => (
        <TableRow
          key={integration._id}
          className="cursor-pointer hover:bg-muted/50"
        >
          <TableCell>
            {paginationEnabled
              ? (page - 1) * rowsPerPage + index + 1
              : index + 1}
          </TableCell>
          <TableCell>
            <div>
              <p className="font-medium">{integration.display_name}</p>
            </div>
          </TableCell>
          <TableCell>
            <Badge variant="outline" className="capitalize">
              {integration.integration_type.replace(/_/g, " ")}
            </Badge>
          </TableCell>
          <TableCell>
            <Badge
              variant={integration.is_active ? "default" : "secondary"}
              className={
                integration.is_active
                  ? "bg-green-100 text-green-800 hover:bg-green-100"
                  : "bg-gray-100 text-gray-800 hover:bg-gray-100"
              }
            >
              {integration.is_active ? "Active" : "Inactive"}
            </Badge>
          </TableCell>
          <TableCell>
            <p className="text-sm text-muted-foreground">
              {new Date(integration.created_at).toLocaleDateString()}
            </p>
          </TableCell>
          <TableCell>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  handleConfigureModule(integration.integration_type)
                }
                className="text-blue-600 hover:text-blue-800 hover:bg-blue-100"
              >
                <Settings className="h-4 w-4 mr-1" />
                Configure
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
        title="Integrations"
        data={sortedIntegrations}
        isLoading={isLoading}
        totalCount={integrationsData?.pagination?.total_items || 0}
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
        cookieName="integration_pagination_enabled"
        cookieMaxAge={60 * 60 * 24 * 30}
      />

      {showAddIntegration && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-[400px]">
            <h2 className="text-lg font-semibold mb-4">Add Integration</h2>
            {availableModules.length > 0 ? (
              <div className="space-y-3">
                {availableModules.map((mod: any) => {
                  const existing = getExistingIntegration(mod.option_value);
                  return (
                    <Button
                      key={mod.option_value}
                      disabled={!!existing}
                      onClick={() => {
                        handleConfigureModule(mod.option_value);
                        setShowAddIntegration(false);
                      }}
                      className="w-full justify-start"
                      variant={existing ? "secondary" : "outline"}
                    >
                      {getModuleIcon(mod.option_value)}
                      <span className="ml-2">{mod.display_value}</span>
                      {existing && (
                        <Badge className="ml-auto bg-gray-100 text-gray-600">
                          Configured
                        </Badge>
                      )}
                    </Button>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No modules available for this company.
              </p>
            )}

            <div className="flex justify-end mt-4">
              <Button
                variant="secondary"
                onClick={() => setShowAddIntegration(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Configuration Dialogs - Preserved from original code */}
      {selectedModule === "s3_config" && (
        <S3ConfigDialog
          isOpen={true}
          onClose={handleCloseDialog}
          integration={selectedIntegration}
        />
      )}

      {selectedModule === "sendgrid" && (
        <SendGridConfigDialog
          isOpen={true}
          onClose={handleCloseDialog}
          integration={selectedIntegration}
        />
      )}

      {selectedModule === "autograb_vehicle_pricing_integration" && (
        <AutoGrabConfigDialog
          isOpen={true}
          onClose={handleCloseDialog}
          integration={selectedIntegration}
        />
      )}
    </>
  );
};

export default Integration;
