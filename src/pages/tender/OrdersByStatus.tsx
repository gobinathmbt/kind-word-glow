import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tenderDealershipAuthService } from "@/services/tenderDealershipAuthService";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableHead, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Eye,
  Car,
  User,
  Calendar,
  DollarSign,
  CheckCircle,
  Truck,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  ClipboardList,
} from "lucide-react";
import DataTableLayout from "@/components/common/DataTableLayout";
import TenderDealershipLayout from "@/components/layout/TenderDealershipLayout";
import OrderDetailsModal from "@/components/tender/OrderDetailsModal";

const OrdersByStatus = () => {
  const { status } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [dealershipUser, setDealershipUser] = useState<any>(null);
  const [dealershipInfo, setDealershipInfo] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [paginationEnabled, setPaginationEnabled] = useState(true);
  const [sortField, setSortField] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [orderDetailsOpen, setOrderDetailsOpen] = useState(false);
  const [confirmAcceptOpen, setConfirmAcceptOpen] = useState(false);
  const [confirmDeliverOpen, setConfirmDeliverOpen] = useState(false);
  const [orderToAccept, setOrderToAccept] = useState<any>(null);
  const [orderToDeliver, setOrderToDeliver] = useState<any>(null);

  useEffect(() => {
    const token = sessionStorage.getItem("tender_dealership_token");
    const user = sessionStorage.getItem("tender_dealership_user");
    const info = sessionStorage.getItem("tender_dealership_info");

    if (!token || !user) {
      navigate("/tender-dealership/login");
      return;
    }

    setDealershipUser(JSON.parse(user));
    setDealershipInfo(JSON.parse(info || "{}"));
  }, [navigate]);

  // Fetch all orders when pagination is disabled
  const fetchAllOrders = async () => {
    try {
      let allData = [];
      let currentPage = 1;
      let hasMore = true;

      while (hasMore) {
        const response = await tenderDealershipAuthService.getOrdersByStatus({
          status: status,
          page: currentPage,
          limit: 100,
          search,
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
      };
    } catch (error) {
      throw error;
    }
  };

  const {
    data: ordersData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: paginationEnabled
      ? ["dealership-orders", status, page, search, rowsPerPage]
      : ["dealership-orders-all", status, search],
    queryFn: async () => {
      if (!paginationEnabled) {
        return await fetchAllOrders();
      }

      const response = await tenderDealershipAuthService.getOrdersByStatus({
        status: status,
        page,
        limit: rowsPerPage,
        search,
      });
      return response.data;
    },
    enabled: !!status && !!dealershipUser,
    refetchOnWindowFocus: false,
    staleTime: 0,
  });

  const orders = ordersData?.data || [];

  // Sort orders when not using pagination
  const sortedOrders = React.useMemo(() => {
    if (!sortField) return orders;

    return [...orders].sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      // Handle nested properties
      if (sortField === "customer_name") {
        aValue = a.customer_info?.name || "";
        bValue = b.customer_info?.name || "";
      } else if (sortField === "vehicle") {
        aValue = `${a.basic_vehicle_info?.make} ${a.basic_vehicle_info?.model}`;
        bValue = `${b.basic_vehicle_info?.make} ${b.basic_vehicle_info?.model}`;
      } else if (sortField === "created_at") {
        aValue = new Date(a.created_at).getTime();
        bValue = new Date(b.created_at).getTime();
      } else if (sortField === "quote_price") {
        aValue = a.quote_price || 0;
        bValue = b.quote_price || 0;
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
  }, [orders, sortField, sortOrder]);

  // Accept order mutation
  const acceptOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const response = await tenderDealershipAuthService.acceptOrder(orderId);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Order accepted successfully");
      queryClient.invalidateQueries({ queryKey: ["dealership-orders"] });
      setConfirmAcceptOpen(false);
      setOrderToAccept(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to accept order");
      setConfirmAcceptOpen(false);
      setOrderToAccept(null);
    },
  });

  // Deliver order mutation
  const deliverOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const response = await tenderDealershipAuthService.deliverOrder(orderId);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Order marked as delivered successfully");
      queryClient.invalidateQueries({ queryKey: ["dealership-orders"] });
      setConfirmDeliverOpen(false);
      setOrderToDeliver(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to mark order as delivered");
      setConfirmDeliverOpen(false);
      setOrderToDeliver(null);
    },
  });

  const getStatusTitle = (status: string) => {
    const titles: Record<string, string> = {
      "Order - Approved": "Approved Orders",
      Accepted: "Accepted Orders",
      Delivered: "Delivered Orders",
      Aborted: "Aborted Orders",
    };
    return titles[status] || "Orders";
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "Order - Approved":
        return "bg-green-100 text-green-800 hover:bg-green-100";
      case "Accepted":
        return "bg-blue-100 text-blue-800 hover:bg-blue-100";
      case "Delivered":
        return "bg-purple-100 text-purple-800 hover:bg-purple-100";
      case "Aborted":
        return "bg-red-100 text-red-800 hover:bg-red-100";
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-100";
    }
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
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1" />;
    return sortOrder === "asc" ? (
      <ArrowUp className="h-3 w-3 ml-1" />
    ) : (
      <ArrowDown className="h-3 w-3 ml-1" />
    );
  };

  const handleAcceptOrder = (order: any) => {
    setOrderToAccept(order);
    setConfirmAcceptOpen(true);
  };

  const confirmAccept = () => {
    if (orderToAccept) {
      acceptOrderMutation.mutate(orderToAccept._id);
    }
  };

  const handleDeliverOrder = (order: any) => {
    setOrderToDeliver(order);
    setConfirmDeliverOpen(true);
  };

  const confirmDeliver = () => {
    if (orderToDeliver) {
      deliverOrderMutation.mutate(orderToDeliver._id);
    }
  };

  const handleViewDetails = (order: any) => {
    setSelectedOrder(order);
    setOrderDetailsOpen(true);
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
    toast.success("Data refreshed");
  };

  // Calculate stats
  const totalOrders = ordersData?.total || 0;
  const approvedCount = orders.filter(
    (o: any) => o.quote_status === "Order - Approved"
  ).length;
  const acceptedCount = orders.filter((o: any) => o.quote_status === "Accepted").length;
  const deliveredCount = orders.filter(
    (o: any) => o.quote_status === "Delivered"
  ).length;
  const abortedCount = orders.filter((o: any) => o.quote_status === "Aborted").length;

  const statChips = [
    {
      label: "Total",
      value: totalOrders,
      variant: "outline" as const,
      bgColor: "bg-gray-100",
    },
    {
      label: "Approved",
      value: approvedCount,
      variant: "default" as const,
      bgColor: "bg-green-100",
      textColor: "text-green-800",
      hoverColor: "hover:bg-green-100",
    },
    {
      label: "Accepted",
      value: acceptedCount,
      variant: "outline" as const,
      bgColor: "bg-blue-100",
      textColor: "text-blue-800",
      hoverColor: "hover:bg-blue-100",
    },
    {
      label: "Delivered",
      value: deliveredCount,
      variant: "outline" as const,
      bgColor: "bg-purple-100",
      textColor: "text-purple-800",
      hoverColor: "hover:bg-purple-100",
    },
    {
      label: "Aborted",
      value: abortedCount,
      variant: "outline" as const,
      bgColor: "bg-red-100",
      textColor: "text-red-800",
      hoverColor: "hover:bg-red-100",
    },
  ];

  const actionButtons = [
    {
      icon: <Search className="h-4 w-4" />,
      tooltip: "Search Orders",
      onClick: () => {},
      className: "bg-gray-50 text-gray-700 hover:bg-gray-100 border-gray-200",
    },
  ];

  const renderActionButtons = (order: any) => {
    return (
      <div className="flex gap-2">
        {status === "Order - Approved" && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleAcceptOrder(order)}
            disabled={acceptOrderMutation.isPending}
            className="text-xs"
          >
            <CheckCircle className="h-3 w-3 mr-1" />
            Accept
          </Button>
        )}
        {status === "Accepted" && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleDeliverOrder(order)}
            disabled={deliverOrderMutation.isPending}
            className="text-xs"
          >
            <Truck className="h-3 w-3 mr-1" />
            Mark Delivered
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleViewDetails(order)}
          className="text-xs"
        >
          <Eye className="h-3 w-3 mr-1" />
          View
        </Button>
      </div>
    );
  };

  const renderTableHeader = () => (
    <TableRow>
      <TableHead className="bg-muted/50">S.No</TableHead>
      <TableHead
        className="bg-muted/50 cursor-pointer hover:bg-muted/70"
        onClick={() => handleSort("tender_id")}
      >
        <div className="flex items-center">
          Tender ID
          {getSortIcon("tender_id")}
        </div>
      </TableHead>
      <TableHead
        className="bg-muted/50 cursor-pointer hover:bg-muted/70"
        onClick={() => handleSort("customer_name")}
      >
        <div className="flex items-center">
          Customer
          {getSortIcon("customer_name")}
        </div>
      </TableHead>
      <TableHead
        className="bg-muted/50 cursor-pointer hover:bg-muted/70"
        onClick={() => handleSort("vehicle")}
      >
        <div className="flex items-center">
          Vehicle
          {getSortIcon("vehicle")}
        </div>
      </TableHead>
      <TableHead
        className="bg-muted/50 cursor-pointer hover:bg-muted/70"
        onClick={() => handleSort("quote_price")}
      >
        <div className="flex items-center">
          Order Amount
          {getSortIcon("quote_price")}
        </div>
      </TableHead>
      <TableHead
        className="bg-muted/50 cursor-pointer hover:bg-muted/70"
        onClick={() => handleSort("created_at")}
      >
        <div className="flex items-center">
          Date
          {getSortIcon("created_at")}
        </div>
      </TableHead>
      <TableHead className="bg-muted/50">Status</TableHead>
      <TableHead className="bg-muted/50">Actions</TableHead>
    </TableRow>
  );

  const renderTableBody = () => {
    if (sortedOrders.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={8} className="text-center py-8">
            <div className="flex flex-col items-center gap-2">
              <ClipboardList className="h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">No orders found</p>
            </div>
          </TableCell>
        </TableRow>
      );
    }

    return sortedOrders.map((order: any, index: number) => (
      <TableRow key={order._id}>
        <TableCell>
          {paginationEnabled ? (page - 1) * rowsPerPage + index + 1 : index + 1}
        </TableCell>
        <TableCell className="font-medium">{order.tender_id}</TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="font-medium">{order.customer_info?.name}</p>
              <p className="text-sm text-muted-foreground">
                {order.customer_info?.email}
              </p>
            </div>
          </div>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <Car className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="font-medium">
                {order.basic_vehicle_info?.make} {order.basic_vehicle_info?.model}
              </p>
              <p className="text-sm text-muted-foreground">
                {order.basic_vehicle_info?.year} - {order.basic_vehicle_info?.variant}
              </p>
            </div>
          </div>
        </TableCell>
        <TableCell>
          {order.quote_price ? (
            <div className="flex items-center gap-1">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span>${order.quote_price.toLocaleString()}</span>
            </div>
          ) : (
            <span className="text-muted-foreground">-</span>
          )}
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            {new Date(order.created_at).toLocaleDateString()}
          </div>
        </TableCell>
        <TableCell>
          <Badge variant="secondary" className={getStatusBadgeVariant(order.quote_status)}>
            {order.quote_status}
          </Badge>
        </TableCell>
        <TableCell>{renderActionButtons(order)}</TableCell>
      </TableRow>
    ));
  };

  if (!dealershipUser || !dealershipInfo) {
    return (
      <TenderDealershipLayout title={getStatusTitle(status!)}>
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </TenderDealershipLayout>
    );
  }

  return (
    <TenderDealershipLayout title={getStatusTitle(status!)}>
      <DataTableLayout
        disableDashboardLayout={true}
        title={getStatusTitle(status!)}
        data={sortedOrders}
        isLoading={isLoading}
        totalCount={ordersData?.total || 0}
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
        cookieName={`dealership_orders_${status}_pagination`}
        cookieMaxAge={60 * 60 * 24 * 30}
      />

      {/* Modals */}
      {selectedOrder && (
        <OrderDetailsModal
          open={orderDetailsOpen}
          onOpenChange={setOrderDetailsOpen}
          order={selectedOrder}
          onClose={() => {
            setOrderDetailsOpen(false);
            setSelectedOrder(null);
            refetch();
          }}
        />
      )}

      <Dialog open={confirmAcceptOpen} onOpenChange={setConfirmAcceptOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Order Acceptance</DialogTitle>
            <DialogDescription>
              Are you sure you want to accept this order? This will confirm your commitment to
              fulfill the order.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmAcceptOpen(false)}
              disabled={acceptOrderMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmAccept}
              disabled={acceptOrderMutation.isPending}
            >
              {acceptOrderMutation.isPending ? "Accepting..." : "Yes, Accept Order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmDeliverOpen} onOpenChange={setConfirmDeliverOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Order Delivery</DialogTitle>
            <DialogDescription>
              Are you sure you want to mark this order as delivered? This will complete the
              order.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDeliverOpen(false)}
              disabled={deliverOrderMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmDeliver}
              disabled={deliverOrderMutation.isPending}
            >
              {deliverOrderMutation.isPending ? "Processing..." : "Yes, Mark as Delivered"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TenderDealershipLayout>
  );
};

export default OrdersByStatus;
