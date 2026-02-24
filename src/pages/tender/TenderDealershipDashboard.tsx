import React, { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { tenderDealershipAuthService } from "@/api/services";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileText,
  Package,
  Clock,
  CheckCircle,
  AlertCircle,
  Filter,
  RefreshCw,
  Calendar,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import TenderDealershipLayout from "@/components/layout/TenderDealershipLayout";
import { KanbanBoard, KanbanStatus } from "@/components/tender/KanbanBoard";
import TenderQuoteSideModal from "@/components/tender/TenderQuoteSideModal";
import OrderDetailsModal from "@/components/tender/OrderDetailsModal";
import { toast } from "sonner";

interface QuoteItem {
  _id: string;
  tender_id: string;
  quote_status: string;
  customer_info?: {
    name: string;
    email?: string;
    phone?: string;
  };
  basic_vehicle_info?: {
    make: string;
    model: string;
    year?: string;
    registration?: string;
  };
  price?: number;
  quotation_text?: string;
  notes?: string;
  tender_expiry_time?: string;
  created_at?: string;
  updated_at?: string;
}

interface OrderItem {
  _id: string;
  order_id: string;
  order_status: string;
  customer_info?: {
    name: string;
  };
  basic_vehicle_info?: {
    make: string;
    model: string;
  };
  price?: number;
  created_at?: string;
  updated_at?: string;
}

const TenderDealershipDashboard = () => {
  const [dealershipUser, setDealershipUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("quotes");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedItem, setSelectedItem] = useState<QuoteItem | OrderItem | null>(null);
  const [itemType, setItemType] = useState<"quote" | "order" | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = sessionStorage.getItem("tender_dealership_token");
    const user = sessionStorage.getItem("tender_dealership_user");

    if (!token || !user) {
      navigate("/login");
      return;
    }

    setDealershipUser(JSON.parse(user));

    // Set default date range (last 30 days)
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    setDateFrom(thirtyDaysAgo.toISOString().split("T")[0]);
    setDateTo(today.toISOString().split("T")[0]);
  }, [navigate]);

  // Fetch quotes by status
  const {
    data: quotesData,
    isLoading: quotesLoading,
    refetch: refetchQuotes,
  } = useQuery({
    queryKey: ["dealership-quotes", dateFrom, dateTo],
    queryFn: async () => {
      if (!dateFrom || !dateTo) return [];
      const response = await tenderDealershipAuthService.getQuotesByStatus({
        dateFrom,
        dateTo,
        limit: 10,
      });
      return response.data?.data || [];
    },
    enabled: !!dealershipUser && !!dateFrom && !!dateTo,
  });

  // Fetch orders by status
  const {
    data: ordersData,
    isLoading: ordersLoading,
    refetch: refetchOrders,
  } = useQuery({
    queryKey: ["dealership-orders", dateFrom, dateTo],
    queryFn: async () => {
      if (!dateFrom || !dateTo) return [];
      const response = await tenderDealershipAuthService.getOrdersByStatus({
        dateFrom,
        dateTo,
        limit: 10,
      });
      return response.data?.data || [];
    },
    enabled: !!dealershipUser && !!dateFrom && !!dateTo,
  });

  // Fetch expiring soon quotes
  const {
    data: expiringData,
    isLoading: expiringLoading,
    refetch: refetchExpiring,
  } = useQuery({
    queryKey: ["dealership-expiring-quotes"],
    queryFn: async () => {
      const response = await tenderDealershipAuthService.getExpiringQuotes();
      return response.data?.data || [];
    },
    enabled: !!dealershipUser,
  });

  // Get all quotes for total count
  const {
    data: allQuotesData,
    isLoading: allQuotesLoading,
  } = useQuery({
    queryKey: ["dealership-all-quotes"],
    queryFn: async () => {
      const response = await tenderDealershipAuthService.getQuotesByStatus({
        limit: 1000,
      });
      return response.data?.data || [];
    },
    enabled: !!dealershipUser,
  });

  // Get all orders for total count
  const {
    data: allOrdersData,
    isLoading: allOrdersLoading,
  } = useQuery({
    queryKey: ["dealership-all-orders"],
    queryFn: async () => {
      const response = await tenderDealershipAuthService.getOrdersByStatus({
        limit: 1000,
      });
      return response.data?.data || [];
    },
    enabled: !!dealershipUser,
  });

  // Process quotes data into Kanban statuses - must be called before any conditional returns
  const quoteStatuses: KanbanStatus[] = useMemo(() => {
    const statusMap: Record<string, KanbanStatus> = {
      Open: {
        id: "open",
        label: "Open",
        color: "blue",
        bgColor: "bg-blue-100 dark:bg-blue-950",
        items: [],
      },
      "In Progress": {
        id: "in-progress",
        label: "In Progress",
        color: "yellow",
        bgColor: "bg-amber-100 dark:bg-amber-950",
        items: [],
      },
      Submitted: {
        id: "submitted",
        label: "Submitted",
        color: "green",
        bgColor: "bg-emerald-100 dark:bg-emerald-950",
        items: [],
      },
      Withdrawn: {
        id: "withdrawn",
        label: "Withdrawn",
        color: "red",
        bgColor: "bg-red-100 dark:bg-red-950",
        items: [],
      },
      Closed: {
        id: "closed",
        label: "Closed",
        color: "gray",
        bgColor: "bg-slate-100 dark:bg-slate-800",
        items: [],
      },
    };

    if (quotesData && Array.isArray(quotesData)) {
      quotesData.forEach((quote: QuoteItem) => {
        const status = quote.quote_status || "Open";
        if (statusMap[status]) {
          statusMap[status].items.push(quote);
        }
      });
    }

    return Object.values(statusMap).sort((a, b) => {
      const order = ["open", "in-progress", "submitted", "withdrawn", "closed"];
      return order.indexOf(a.id) - order.indexOf(b.id);
    });
  }, [quotesData]);

  // Process orders data into Kanban statuses
  const orderStatuses: KanbanStatus[] = useMemo(() => {
    const statusMap: Record<string, KanbanStatus> = {
      "Order - Approved": {
        id: "approved",
        label: "Approved",
        color: "blue",
        bgColor: "bg-blue-100 dark:bg-blue-950",
        items: [],
      },
      Accepted: {
        id: "accepted",
        label: "Accepted",
        color: "green",
        bgColor: "bg-emerald-100 dark:bg-emerald-950",
        items: [],
      },
      Delivered: {
        id: "delivered",
        label: "Delivered",
        color: "purple",
        bgColor: "bg-purple-100 dark:bg-purple-950",
        items: [],
      },
      Aborted: {
        id: "aborted",
        label: "Aborted",
        color: "red",
        bgColor: "bg-red-100 dark:bg-red-950",
        items: [],
      },
    };

    if (ordersData && Array.isArray(ordersData)) {
      ordersData.forEach((order: OrderItem) => {
        const status = order.order_status || "Order - Approved";
        if (statusMap[status]) {
          statusMap[status].items.push(order);
        }
      });
    }

    return Object.values(statusMap).sort((a, b) => {
      const order = ["approved", "accepted", "delivered", "aborted"];
      return order.indexOf(a.id) - order.indexOf(b.id);
    });
  }, [ordersData]);

  // Calculate total statistics
  const totalQuotesCount = useMemo(() => {
    if (!allQuotesData) return 0;
    return Array.isArray(allQuotesData) ? allQuotesData.length : 0;
  }, [allQuotesData]);

  const totalOrdersCount = useMemo(() => {
    if (!allOrdersData) return 0;
    return Array.isArray(allOrdersData) ? allOrdersData.length : 0;
  }, [allOrdersData]);

  // Calculate quote statistics
  const quoteStats = useMemo(() => {
    if (!quotesData) return { open: 0, inProgress: 0, submitted: 0, withdrawn: 0, closed: 0 };
    return {
      open: (quotesData as QuoteItem[]).filter(q => q.quote_status === "Open").length,
      inProgress: (quotesData as QuoteItem[]).filter(q => q.quote_status === "In Progress").length,
      submitted: (quotesData as QuoteItem[]).filter(q => q.quote_status === "Submitted").length,
      withdrawn: (quotesData as QuoteItem[]).filter(q => q.quote_status === "Withdrawn").length,
      closed: (quotesData as QuoteItem[]).filter(q => q.quote_status === "Closed").length,
    };
  }, [quotesData]);

  // Calculate order statistics
  const orderStats = useMemo(() => {
    if (!ordersData) return { approved: 0, accepted: 0, delivered: 0, aborted: 0 };
    return {
      approved: (ordersData as OrderItem[]).filter(o => o.order_status === "Order - Approved").length,
      accepted: (ordersData as OrderItem[]).filter(o => o.order_status === "Accepted").length,
      delivered: (ordersData as OrderItem[]).filter(o => o.order_status === "Delivered").length,
      aborted: (ordersData as OrderItem[]).filter(o => o.order_status === "Aborted").length,
    };
  }, [ordersData]);

  const handleQuoteClick = (quote: QuoteItem) => {
    setSelectedItem(quote);
    setItemType("quote");
    setIsModalOpen(true);
  };

  const handleOrderClick = (order: OrderItem) => {
    setSelectedItem(order);
    setItemType("order");
    setIsModalOpen(true);
  };

  const handleQuoteSubmit = async (updatedQuote: Partial<QuoteItem>) => {
    try {
      toast.success("Quote updated successfully");
      setIsModalOpen(false);
      refetchQuotes();
    } catch (error) {
      toast.error("Failed to update quote");
    }
  };

  const getExpiryStatus = (expiryDate: string) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const daysLeft = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysLeft < 0) return { label: "Expired", color: "bg-red-100 text-red-800 dark:bg-red-900" };
    if (daysLeft <= 1) return { label: "Today", color: "bg-orange-100 text-orange-800 dark:bg-orange-900" };
    if (daysLeft <= 3) return { label: `${daysLeft} days left`, color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900" };
    return { label: `${daysLeft} days left`, color: "bg-green-100 text-green-800 dark:bg-green-900" };
  };

  // Show loading state while fetching dealership user
  if (!dealershipUser) {
    return (
      <TenderDealershipLayout title="Dashboard">
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </TenderDealershipLayout>
    );
  }

  return (
    <TenderDealershipLayout title="Dashboard">
      <div className="h-full overflow-auto p-4 lg:p-6">
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h2 className="text-2xl font-bold text-foreground">Dashboard</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your quotes and orders efficiently
            </p>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="quotes" className="gap-2">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Quotes</span>
                <Badge variant="secondary" className="ml-2 hidden sm:inline">
                  {totalQuotesCount}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="orders" className="gap-2">
                <Package className="h-4 w-4" />
                <span className="hidden sm:inline">Orders</span>
                <Badge variant="secondary" className="ml-2 hidden sm:inline">
                  {totalOrdersCount}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="expiring" className="gap-2">
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">Expiring Soon</span>
              </TabsTrigger>
            </TabsList>

            {/* Quotes Tab */}
            <TabsContent value="quotes" className="w-full space-y-6">
              {/* Quote Stats Cards */}
              {!quotesLoading && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  <Card className="hover:shadow-sm transition-shadow">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Open
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-xl sm:text-2xl font-bold">
                        {quoteStats.open}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="hover:shadow-sm transition-shadow">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        In Progress
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-xl sm:text-2xl font-bold">
                        {quoteStats.inProgress}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="hover:shadow-sm transition-shadow">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Submitted
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-xl sm:text-2xl font-bold">
                        {quoteStats.submitted}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="hover:shadow-sm transition-shadow">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Withdrawn
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-xl sm:text-2xl font-bold">
                        {quoteStats.withdrawn}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="hover:shadow-sm transition-shadow">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Closed
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-xl sm:text-2xl font-bold">
                        {quoteStats.closed}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Kanban Board with Filter */}
              <div className="space-y-3">
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">
                      Quote Status Board
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Total: {totalQuotesCount} quotes
                    </p>
                  </div>

                  {/* Date Range Filter */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full lg:w-auto">
                    <Filter className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5 sm:mt-0" />
                    <Input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="h-9 w-full sm:w-32"
                    />
                    <span className="hidden sm:inline text-muted-foreground text-xs">to</span>
                    <Input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="h-9 w-full sm:w-32"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        refetchQuotes();
                      }}
                      className="w-full sm:w-auto"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <Card className="w-full border">
                  <CardContent className="p-0">
                    <KanbanBoard
                      statuses={quoteStatuses}
                      onItemClick={handleQuoteClick}
                      isLoading={quotesLoading}
                      type="quotes"
                    />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Orders Tab */}
            <TabsContent value="orders" className="w-full space-y-6">
              {/* Order Stats Cards */}
              {!ordersLoading && (
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <Card className="hover:shadow-sm transition-shadow">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Approved
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-xl sm:text-2xl font-bold">
                        {orderStats.approved}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="hover:shadow-sm transition-shadow">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Accepted
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-xl sm:text-2xl font-bold">
                        {orderStats.accepted}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="hover:shadow-sm transition-shadow">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Delivered
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-xl sm:text-2xl font-bold">
                        {orderStats.delivered}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="hover:shadow-sm transition-shadow">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Aborted
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-xl sm:text-2xl font-bold">
                        {orderStats.aborted}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Kanban Board with Filter */}
              <div className="space-y-3">
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">
                      Order Status Board
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Total: {totalOrdersCount} orders
                    </p>
                  </div>

                  {/* Date Range Filter */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full lg:w-auto">
                    <Filter className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5 sm:mt-0" />
                    <Input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="h-9 w-full sm:w-32"
                    />
                    <span className="hidden sm:inline text-muted-foreground text-xs">to</span>
                    <Input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="h-9 w-full sm:w-32"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        refetchOrders();
                      }}
                      className="w-full sm:w-auto"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <Card className="w-full border">
                  <CardContent className="p-0">
                    <KanbanBoard
                      statuses={orderStatuses}
                      onItemClick={handleOrderClick}
                      isLoading={ordersLoading}
                      type="orders"
                    />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Expiring Soon Tab */}
            <TabsContent value="expiring" className="w-full space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">
                      Expiring Soon (Next 7 Days)
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Quotes expiring within the next week
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      refetchExpiring();
                    }}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>

                <Card className="w-full border">
                  <CardContent className="p-0">
                    {expiringLoading ? (
                      <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      </div>
                    ) : expiringData && expiringData.length > 0 ? (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader className="bg-muted/50">
                            <TableRow>
                              <TableHead>Tender ID</TableHead>
                              <TableHead>Customer</TableHead>
                              <TableHead>Vehicle</TableHead>
                              <TableHead>Quote Status</TableHead>
                              <TableHead>Amount</TableHead>
                              <TableHead>Expiry Date</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Action</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {expiringData.map((quote: QuoteItem) => {
                              const expiryStatus = getExpiryStatus(quote.tender_expiry_time || "");
                              return (
                                <TableRow key={quote._id}>
                                  <TableCell className="font-medium text-sm">
                                    {quote.tender_id}
                                  </TableCell>
                                  <TableCell className="text-sm">
                                    {quote.customer_info?.name || "N/A"}
                                  </TableCell>
                                  <TableCell className="text-sm">
                                    {quote.basic_vehicle_info?.make} {quote.basic_vehicle_info?.model}
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className="text-xs">
                                      {quote.quote_status}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-sm font-medium">
                                    ₹{quote.price?.toLocaleString() || "0"}
                                  </TableCell>
                                  <TableCell className="text-sm">
                                    {new Date(quote.tender_expiry_time || "").toLocaleDateString()}
                                  </TableCell>
                                  <TableCell>
                                    <Badge className={`${expiryStatus.color} text-xs`}>
                                      {expiryStatus.label}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleQuoteClick(quote)}
                                    >
                                      View
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                        <Calendar className="h-12 w-12 mb-4 opacity-50" />
                        <p className="text-center">No quotes expiring soon</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Quote Detail Modal */}
      {itemType === "quote" && selectedItem && (
        <TenderQuoteSideModal
          open={isModalOpen}
          onOpenChange={(open) => {
            setIsModalOpen(open);
            if (!open) {
              setSelectedItem(null);
              setItemType(null);
            }
          }}
          tender={selectedItem as QuoteItem}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedItem(null);
            setItemType(null);
            refetchQuotes();
          }}
        />
      )}

      {/* Order Details Modal */}
      {itemType === "order" && selectedItem && (
        <OrderDetailsModal
          open={isModalOpen}
          onOpenChange={(open) => {
            setIsModalOpen(open);
            if (!open) {
              setSelectedItem(null);
              setItemType(null);
            }
          }}
          order={selectedItem as OrderItem}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedItem(null);
            setItemType(null);
            refetchOrders();
          }}
        />
      )}
    </TenderDealershipLayout>
  );
};

export default TenderDealershipDashboard;
