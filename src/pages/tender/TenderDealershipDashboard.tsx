import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { tenderDealershipAuthService } from "@/api/services";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ClipboardList,
  Calendar,
  Eye,
  Package,
  CheckCircle,
  Clock,
  TrendingUp,
  Users,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import TenderDealershipLayout from "@/components/layout/TenderDealershipLayout";

const TenderDealershipDashboard = () => {
  const [dealershipUser, setDealershipUser] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = sessionStorage.getItem("tender_dealership_token");
    const user = sessionStorage.getItem("tender_dealership_user");

    if (!token || !user) {
      navigate("/login");
      return;
    }

    setDealershipUser(JSON.parse(user));
  }, [navigate]);

  // Fetch tenders for statistics
  const { data: tendersData, isLoading: tendersLoading } = useQuery({
    queryKey: ["dealership-tenders"],
    queryFn: async () => {
      const response = await tenderDealershipAuthService.getTenders();
      return response.data?.data || [];
    },
    enabled: !!dealershipUser,
  });

  // Fetch quotes by status
  const { data: quotesData, isLoading: quotesLoading } = useQuery({
    queryKey: ["dealership-quotes"],
    queryFn: async () => {
      const response = await tenderDealershipAuthService.getQuotesByStatus();
      return response.data?.data || [];
    },
    enabled: !!dealershipUser,
  });

  // Fetch orders by status
  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ["dealership-orders"],
    queryFn: async () => {
      const response = await tenderDealershipAuthService.getOrdersByStatus();
      return response.data?.data || [];
    },
    enabled: !!dealershipUser,
  });

  if (!dealershipUser) {
    return (
      <TenderDealershipLayout title="Dashboard">
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </TenderDealershipLayout>
    );
  }

  const isLoading = tendersLoading || quotesLoading || ordersLoading;

  // Calculate statistics
  const totalTenders = tendersData?.length || 0;
  const openQuotes = quotesData?.filter((q: any) => q.quote_status === "Open")?.length || 0;
  const submittedQuotes = quotesData?.filter((q: any) => q.quote_status === "Submitted")?.length || 0;
  const totalOrders = ordersData?.length || 0;

  // Get recent tenders (last 5)
  const recentTenders = tendersData?.slice(0, 5) || [];

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "Open":
        return "default";
      case "In Progress":
        return "secondary";
      case "Submitted":
        return "outline";
      default:
        return "outline";
    }
  };

  return (
    <TenderDealershipLayout title="Dashboard">
      <div className="h-full overflow-auto p-4 lg:p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2">
            Welcome back, {dealershipUser.username}!
          </h2>
          <p className="text-muted-foreground">
            {dealershipUser.email}
          </p>
        </div>

        {/* Statistics Cards */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 mb-6">
              {/* Open Quotes */}
              <Link to="/tender-dealership/quotes/Open">
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Open Quotes
                    </CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{openQuotes}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      New tenders awaiting response
                    </p>
                  </CardContent>
                </Card>
              </Link>

              {/* Submitted Quotes */}
              <Link to="/tender-dealership/quotes/Submitted">
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Submitted Quotes
                    </CardTitle>
                    <CheckCircle className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{submittedQuotes}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Quotes under review
                    </p>
                  </CardContent>
                </Card>
              </Link>

              {/* Orders */}
              <Link to="/tender-dealership/orders/Order - Approved">
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Orders
                    </CardTitle>
                    <Package className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{totalOrders}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Approved quotes
                    </p>
                  </CardContent>
                </Card>
              </Link>
            </div>

            {/* Recent Quotes */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Recent Quotes</CardTitle>
                  <Link to="/tender-dealership/quotes/Open">
                    <Button variant="outline" size="sm">
                      View All
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {recentTenders.length > 0 ? (
                  <div className="space-y-4">
                    {recentTenders.map((tender: any) => (
                      <div
                        key={tender._id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">
                              {tender.tender_id}
                            </span>
                            <Badge variant={getStatusBadgeVariant(tender.quote_status)}>
                              {tender.quote_status}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {tender.customer_info?.name} - {tender.basic_vehicle_info?.make}{" "}
                            {tender.basic_vehicle_info?.model}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                            <Calendar className="h-3 w-3" />
                            Expires: {new Date(tender.tender_expiry_time).toLocaleDateString()}
                          </div>
                        </div>
                        <Link to={`/tender-dealership/quotes/${tender.quote_status}`}>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                        </Link>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <ClipboardList className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">
                      No Quotes Yet
                    </h3>
                    <p className="text-muted-foreground">
                      You don't have any quotes at the moment.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Link to="/tender-dealership/quotes/Open">
                    <Button variant="outline" className="w-full h-auto py-4 flex flex-col items-center gap-2">
                      <ClipboardList className="h-6 w-6" />
                      <span className="text-sm font-medium">My Quotes</span>
                    </Button>
                  </Link>
                  <Link to="/tender-dealership/orders/Order - Approved">
                    <Button variant="outline" className="w-full h-auto py-4 flex flex-col items-center gap-2">
                      <Package className="h-6 w-6" />
                      <span className="text-sm font-medium">My Orders</span>
                    </Button>
                  </Link>
                  <Link to="/tender-dealership/profile">
                    <Button variant="outline" className="w-full h-auto py-4 flex flex-col items-center gap-2">
                      <TrendingUp className="h-6 w-6" />
                      <span className="text-sm font-medium">My Profile</span>
                    </Button>
                  </Link>
                  {(dealershipUser.role === "primary_tender_dealership_user") && (
                    <Link to="/tender-dealership/users">
                      <Button variant="outline" className="w-full h-auto py-4 flex flex-col items-center gap-2">
                        <Users className="h-6 w-6" />
                        <span className="text-sm font-medium">Manage Users</span>
                      </Button>
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </TenderDealershipLayout>
  );
};

export default TenderDealershipDashboard;
