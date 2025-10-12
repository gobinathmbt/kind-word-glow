import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { dashboardReportServices } from "@/api/services";
import { Loader2, RefreshCw, TrendingUp, AlertTriangle, DollarSign, Clock, Users, CheckCircle2, BarChart3, PieChart, FileText } from "lucide-react";
import { toast } from "sonner";
import { subDays } from "date-fns";
import type { DateRange } from "react-day-picker";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import VehicleRecordsDialog from "./VehicleRecordsDialog";

interface DetailedReportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  vehicleType: string;
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

const DetailedReportDialog = ({
  isOpen,
  onClose,
  vehicleType,
}: DetailedReportDialogProps) => {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 7),
    to: new Date(),
  });

  const [vehicleRecordsDialog, setVehicleRecordsDialog] = useState({
    isOpen: false,
    filters: {},
  });

  const queryParams = {
    vehicle_type: vehicleType,
    start_date: dateRange?.from?.toISOString(),
    end_date: dateRange?.to?.toISOString(),
  };

  // 1. Vehicles by Status
  const { data: vehiclesByStatus, isLoading: loadingVehiclesByStatus, refetch: refetchVehiclesByStatus } = useQuery({
    queryKey: ["vehicles-by-status", queryParams],
    queryFn: () => dashboardReportServices.getVehiclesByStatus(queryParams),
    enabled: isOpen,
  });

  // 2. Workshop Quotes by Status
  const { data: workshopQuotesByStatus, isLoading: loadingQuotesByStatus, refetch: refetchQuotesByStatus } = useQuery({
    queryKey: ["workshop-quotes-by-status", queryParams],
    queryFn: () => dashboardReportServices.getWorkshopQuotesByStatus(queryParams),
    enabled: isOpen,
  });

  // 3. License Expiry Tracking
  const { data: licenseExpiry, isLoading: loadingLicenseExpiry, refetch: refetchLicenseExpiry } = useQuery({
    queryKey: ["license-expiry", queryParams],
    queryFn: () => dashboardReportServices.getLicenseExpiryTracking(queryParams),
    enabled: isOpen,
  });

  // 4. Report Completion
  const { data: reportCompletion, isLoading: loadingReportCompletion, refetch: refetchReportCompletion } = useQuery({
    queryKey: ["report-completion", queryParams],
    queryFn: () => dashboardReportServices.getReportCompletion(queryParams),
    enabled: isOpen,
  });

  // 5. Workshop Progress
  const { data: workshopProgress, isLoading: loadingWorkshopProgress, refetch: refetchWorkshopProgress } = useQuery({
    queryKey: ["workshop-progress", queryParams],
    queryFn: () => dashboardReportServices.getWorkshopProgress(queryParams),
    enabled: isOpen,
  });

  // 6. Cost Analysis
  const { data: costAnalysis, isLoading: loadingCostAnalysis, refetch: refetchCostAnalysis } = useQuery({
    queryKey: ["cost-analysis", queryParams],
    queryFn: () => dashboardReportServices.getCostAnalysis(queryParams),
    enabled: isOpen,
  });

  // 7. Supplier Performance
  const { data: supplierPerformance, isLoading: loadingSupplierPerformance, refetch: refetchSupplierPerformance } = useQuery({
    queryKey: ["supplier-performance", queryParams],
    queryFn: () => dashboardReportServices.getSupplierPerformance(queryParams),
    enabled: isOpen,
  });

  // 8. Timeline Analysis
  const { data: timelineAnalysis, isLoading: loadingTimelineAnalysis, refetch: refetchTimelineAnalysis } = useQuery({
    queryKey: ["timeline-analysis", queryParams],
    queryFn: () => dashboardReportServices.getTimelineAnalysis(queryParams),
    enabled: isOpen,
  });

  // 9. Quality Metrics
  const { data: qualityMetrics, isLoading: loadingQualityMetrics, refetch: refetchQualityMetrics } = useQuery({
    queryKey: ["quality-metrics", queryParams],
    queryFn: () => dashboardReportServices.getQualityMetrics(queryParams),
    enabled: isOpen,
  });

  // 10. Workload Distribution
  const { data: workloadDistribution, isLoading: loadingWorkloadDistribution, refetch: refetchWorkloadDistribution } = useQuery({
    queryKey: ["workload-distribution", queryParams],
    queryFn: () => dashboardReportServices.getWorkloadDistribution(queryParams),
    enabled: isOpen,
  });

  // 11. Completion Rate Analysis
  const { data: completionRate, isLoading: loadingCompletionRate, refetch: refetchCompletionRate } = useQuery({
    queryKey: ["completion-rate", queryParams],
    queryFn: () => dashboardReportServices.getCompletionRateAnalysis(queryParams),
    enabled: isOpen,
  });

  // 12. Workshop Reports Summary
  const { data: workshopReportsSummary, isLoading: loadingWorkshopReportsSummary, refetch: refetchWorkshopReportsSummary } = useQuery({
    queryKey: ["workshop-reports-summary", queryParams],
    queryFn: () => dashboardReportServices.getWorkshopReportsSummary(queryParams),
    enabled: isOpen,
  });

  const handleRefreshAll = () => {
    refetchVehiclesByStatus();
    refetchQuotesByStatus();
    refetchLicenseExpiry();
    refetchReportCompletion();
    refetchWorkshopProgress();
    refetchCostAnalysis();
    refetchSupplierPerformance();
    refetchTimelineAnalysis();
    refetchQualityMetrics();
    refetchWorkloadDistribution();
    refetchCompletionRate();
    refetchWorkshopReportsSummary();
    toast.success("Dashboard refreshed");
  };

  const handleOpenVehicleRecords = (filters: any) => {
    setVehicleRecordsDialog({
      isOpen: true,
      filters: {
        ...filters,
        vehicle_type: vehicleType,
        start_date: dateRange?.from?.toISOString(),
        end_date: dateRange?.to?.toISOString(),
      },
    });
  };

  const getExpiryLabel = (boundary: number) => {
    if (boundary === -Infinity) return "Expired";
    if (boundary === 0) return "0-7 Days";
    if (boundary === 7) return "7-30 Days";
    if (boundary === 30) return "30-60 Days";
    if (boundary === 60) return "60+ Days";
    return "Unknown";
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-2xl font-bold">
                Detailed Report - {vehicleType === "tradein" ? "Trade-In" : "Inspection"} Vehicles
              </DialogTitle>
              <Button
                onClick={handleRefreshAll}
                variant="outline"
                size="sm"
                className="ml-4"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh All
              </Button>
            </div>
            <div className="mt-4">
              <DateRangePicker
                value={dateRange}
                onChange={setDateRange}
                className="w-full max-w-md"
              />
            </div>
          </DialogHeader>

          <Tabs defaultValue="overview" className="mt-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="workshop">Workshop</TabsTrigger>
              <TabsTrigger value="analysis">Analysis</TabsTrigger>
              <TabsTrigger value="quality">Quality</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              {/* Vehicles by Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BarChart3 className="h-5 w-5 mr-2" />
                    Vehicles by Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingVehiclesByStatus ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={vehiclesByStatus?.data?.data || []}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="_id" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="count" fill="#3b82f6" />
                        </BarChart>
                      </ResponsiveContainer>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                        {vehiclesByStatus?.data?.data?.map((item: any, index: number) => (
                          <div
                            key={index}
                            className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                            onClick={() => handleOpenVehicleRecords({ status: item._id })}
                          >
                            <p className="text-sm text-muted-foreground capitalize">{item._id?.replace("_", " ")}</p>
                            <p className="text-2xl font-bold">{item.count}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* License Expiry Tracking */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <AlertTriangle className="h-5 w-5 mr-2" />
                    License Expiry Tracking
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingLicenseExpiry ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      {licenseExpiry?.data?.data?.map((item: any, index: number) => {
                        const label = getExpiryLabel(item._id);
                        const colorClass = 
                          item._id < 0 ? "bg-red-100 text-red-800 border-red-200" :
                          item._id < 7 ? "bg-orange-100 text-orange-800 border-orange-200" :
                          item._id < 30 ? "bg-yellow-100 text-yellow-800 border-yellow-200" :
                          "bg-green-100 text-green-800 border-green-200";
                        
                        return (
                          <div
                            key={index}
                            className={`p-4 border-2 rounded-lg hover:opacity-80 cursor-pointer transition-all ${colorClass}`}
                            onClick={() => handleOpenVehicleRecords({ license_expiry_range: item._id })}
                          >
                            <p className="text-sm font-medium">{label}</p>
                            <p className="text-3xl font-bold mt-2">{item.count}</p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Report Completion */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <FileText className="h-5 w-5 mr-2" />
                    Report Completion Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingReportCompletion ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {vehicleType === "inspection" && reportCompletion?.data?.data?.inspection_reports?.[0] && (
                        <div className="p-6 border rounded-lg bg-blue-50">
                          <h3 className="font-semibold text-lg mb-4">Inspection Reports</h3>
                          <div className="space-y-3">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Total Vehicles:</span>
                              <span className="font-bold text-xl">{reportCompletion.data.data.inspection_reports[0].total_vehicles}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Total Reports:</span>
                              <span className="font-bold text-xl">{reportCompletion.data.data.inspection_reports[0].total_reports}</span>
                            </div>
                          </div>
                        </div>
                      )}
                      {vehicleType === "tradein" && reportCompletion?.data?.data?.tradein_reports?.[0] && (
                        <div className="p-6 border rounded-lg bg-green-50">
                          <h3 className="font-semibold text-lg mb-4">Trade-In Reports</h3>
                          <div className="space-y-3">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Total Vehicles:</span>
                              <span className="font-bold text-xl">{reportCompletion.data.data.tradein_reports[0].total_vehicles}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Total Reports:</span>
                              <span className="font-bold text-xl">{reportCompletion.data.data.tradein_reports[0].total_reports}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Workshop Tab */}
            <TabsContent value="workshop" className="space-y-6">
              {/* Workshop Quotes by Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <PieChart className="h-5 w-5 mr-2" />
                    Workshop Quotes by Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingQuotesByStatus ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <ResponsiveContainer width="100%" height={300}>
                        <RechartsPieChart>
                          <Pie
                            data={workshopQuotesByStatus?.data?.data || []}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={(entry) => `${entry._id}: ${entry.count}`}
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="count"
                          >
                            {workshopQuotesByStatus?.data?.data?.map((_: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {workshopQuotesByStatus?.data?.data?.map((item: any, index: number) => (
                          <div
                            key={index}
                            className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                          >
                            <p className="text-sm text-muted-foreground capitalize">{item._id?.replace("_", " ")}</p>
                            <p className="text-2xl font-bold">{item.count}</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              ${item.total_amount?.toLocaleString() || 0}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Workshop Progress */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <TrendingUp className="h-5 w-5 mr-2" />
                    Workshop Progress
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingWorkshopProgress ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {workshopProgress?.data?.data?.map((item: any, index: number) => (
                        <div
                          key={index}
                          className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                          onClick={() => handleOpenVehicleRecords({ workshop_progress: item._id })}
                        >
                          <p className="text-sm text-muted-foreground">{String(item._id)}</p>
                          <p className="text-2xl font-bold">{item.count}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Supplier Performance */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Users className="h-5 w-5 mr-2" />
                    Supplier Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingSupplierPerformance ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-3 px-4">Supplier</th>
                            <th className="text-right py-3 px-4">Total Jobs</th>
                            <th className="text-right py-3 px-4">Completed</th>
                            <th className="text-right py-3 px-4">In Progress</th>
                            <th className="text-right py-3 px-4">Avg Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {supplierPerformance?.data?.data?.map((supplier: any, index: number) => (
                            <tr key={index} className="border-b hover:bg-muted/50">
                              <td className="py-3 px-4">{supplier.supplier_name}</td>
                              <td className="text-right py-3 px-4">{supplier.total_jobs}</td>
                              <td className="text-right py-3 px-4">{supplier.completed_jobs}</td>
                              <td className="text-right py-3 px-4">{supplier.in_progress}</td>
                              <td className="text-right py-3 px-4">${supplier.avg_amount?.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Workload Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BarChart3 className="h-5 w-5 mr-2" />
                    Workload Distribution (Last 30 Days)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingWorkloadDistribution ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={workloadDistribution?.data?.data || []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="_id" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="total_quotes" stroke="#3b82f6" />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Analysis Tab */}
            <TabsContent value="analysis" className="space-y-6">
              {/* Cost Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <DollarSign className="h-5 w-5 mr-2" />
                    Cost Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingCostAnalysis ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-4 border rounded-lg bg-blue-50">
                        <p className="text-sm text-muted-foreground">Total Quotes</p>
                        <p className="text-2xl font-bold">{costAnalysis?.data?.data?.total_quotes || 0}</p>
                      </div>
                      <div className="p-4 border rounded-lg bg-green-50">
                        <p className="text-sm text-muted-foreground">Total Quote Amount</p>
                        <p className="text-2xl font-bold">${costAnalysis?.data?.data?.total_quote_amount?.toLocaleString() || 0}</p>
                      </div>
                      <div className="p-4 border rounded-lg bg-purple-50">
                        <p className="text-sm text-muted-foreground">Avg Quote Amount</p>
                        <p className="text-2xl font-bold">${costAnalysis?.data?.data?.avg_quote_amount?.toFixed(2) || 0}</p>
                      </div>
                      <div className="p-4 border rounded-lg bg-orange-50">
                        <p className="text-sm text-muted-foreground">Quotes with Difference</p>
                        <p className="text-2xl font-bold">{costAnalysis?.data?.data?.quotes_with_difference || 0}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Timeline Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Clock className="h-5 w-5 mr-2" />
                    Timeline Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingTimelineAnalysis ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground">Avg Quote to Approval</p>
                        <p className="text-2xl font-bold">
                          {timelineAnalysis?.data?.data?.avg_quote_to_approval?.toFixed(1) || 0} days
                        </p>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground">Avg Work Duration</p>
                        <p className="text-2xl font-bold">
                          {timelineAnalysis?.data?.data?.avg_work_duration?.toFixed(1) || 0} days
                        </p>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground">Max Work Duration</p>
                        <p className="text-2xl font-bold">
                          {timelineAnalysis?.data?.data?.max_work_duration?.toFixed(1) || 0} days
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Completion Rate */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <CheckCircle2 className="h-5 w-5 mr-2" />
                    Completion Rate Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingCompletionRate ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div>
                        <h4 className="font-semibold mb-3">By Status</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {completionRate?.data?.data?.by_status?.map((item: any, index: number) => (
                            <div key={index} className="p-4 border rounded-lg">
                              <p className="text-sm text-muted-foreground capitalize">{item._id?.replace("_", " ")}</p>
                              <p className="text-2xl font-bold">{item.count}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-3">By Quote Type</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          {completionRate?.data?.data?.by_quote_type?.map((item: any, index: number) => (
                            <div key={index} className="p-4 border rounded-lg">
                              <p className="text-sm text-muted-foreground capitalize">{item._id}</p>
                              <p className="text-xl font-bold">{item.count} total</p>
                              <p className="text-sm text-green-600">{item.completed} completed</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Quality Tab */}
            <TabsContent value="quality" className="space-y-6">
              {/* Quality Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <CheckCircle2 className="h-5 w-5 mr-2" />
                    Quality Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingQualityMetrics ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-6 border rounded-lg bg-green-50">
                          <p className="text-sm text-muted-foreground">Total Jobs</p>
                          <p className="text-3xl font-bold">{qualityMetrics?.data?.data?.total_jobs || 0}</p>
                        </div>
                        <div className="p-6 border rounded-lg bg-orange-50">
                          <p className="text-sm text-muted-foreground">Rework Rate</p>
                          <p className="text-3xl font-bold">{qualityMetrics?.data?.data?.rework_rate || 0}%</p>
                        </div>
                        <div className="p-6 border rounded-lg bg-blue-50">
                          <p className="text-sm text-muted-foreground">Status Breakdown</p>
                          <p className="text-3xl font-bold">{qualityMetrics?.data?.data?.status_breakdown?.length || 0}</p>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-3">Status Breakdown</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {qualityMetrics?.data?.data?.status_breakdown?.map((item: any, index: number) => (
                            <div key={index} className="p-4 border rounded-lg">
                              <p className="text-sm text-muted-foreground capitalize">{item._id?.replace("_", " ")}</p>
                              <p className="text-2xl font-bold">{item.count}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Workshop Reports Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <FileText className="h-5 w-5 mr-2" />
                    Workshop Reports Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingWorkshopReportsSummary ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {workshopReportsSummary?.data?.data?.map((report: any, index: number) => (
                        <div key={index} className="p-6 border rounded-lg">
                          <h4 className="font-semibold text-lg mb-4 capitalize">{report._id?.replace("_", " ")}</h4>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Count:</span>
                              <span className="font-bold">{report.count}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Total Cost:</span>
                              <span className="font-bold">${report.total_cost?.toLocaleString() || 0}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Avg Cost:</span>
                              <span className="font-bold">${report.avg_cost?.toFixed(2) || 0}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Total Fields:</span>
                              <span className="font-bold">{report.total_fields}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <VehicleRecordsDialog
        isOpen={vehicleRecordsDialog.isOpen}
        onClose={() => setVehicleRecordsDialog({ isOpen: false, filters: {} })}
        filters={vehicleRecordsDialog.filters}
      />
    </>
  );
};

export default DetailedReportDialog;
