import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  BarChart3,
  PieChart,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  DollarSign,
  Wrench,
  Users,
  Target,
} from "lucide-react";
import { WorkshopReport } from "../WorkshopReportModal";

interface StatisticsTabProps {
  statistics: WorkshopReport['statistics'];
  workshopSummary: WorkshopReport['workshop_summary'];
  formatCurrency: (amount: number) => string;
}

const StatisticsTab: React.FC<StatisticsTabProps> = ({
  statistics,
  workshopSummary,
  formatCurrency,
}) => {
  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "completed_jobs":
        return "default";
      case "work_in_progress":
        return "secondary";
      case "quote_approved":
        return "outline";
      case "rework":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed_jobs":
        return "bg-green-500";
      case "work_in_progress":
        return "bg-blue-500";
      case "quote_approved":
        return "bg-yellow-500";
      case "rework":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed_jobs":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "work_in_progress":
        return <Clock className="h-4 w-4 text-blue-600" />;
      case "rework":
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Target className="h-4 w-4 text-gray-600" />;
    }
  };

  const totalJobs = Object.values(statistics.fields_by_status).reduce((sum, count) => sum + count, 0);
  const completionRate = totalJobs > 0 ? (statistics.fields_by_status.completed_jobs / totalJobs) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-2">
        <BarChart3 className="h-5 w-5 text-blue-600" />
        <h2 className="text-lg font-semibold">Workshop Statistics</h2>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Completion Rate</p>
                <p className="text-lg font-semibold">{completionRate.toFixed(1)}%</p>
              </div>
            </div>
            <Progress value={completionRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Wrench className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Work Entries</p>
                <p className="text-lg font-semibold">{statistics.work_entries_summary.total_entries}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <Users className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Active Suppliers</p>
                <p className="text-lg font-semibold">{statistics.supplier_performance.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                <Clock className="h-4 w-4 text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Avg. Time</p>
                <p className="text-lg font-semibold">
                  {statistics.avg_completion_time ? `${statistics.avg_completion_time.toFixed(1)}d` : 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Job Status Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center">
              <PieChart className="h-4 w-4 mr-2" />
              Job Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(statistics.fields_by_status).map(([status, count]) => {
                const percentage = totalJobs > 0 ? (count / totalJobs) * 100 : 0;
                return (
                  <div key={status} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 flex-1">
                      {getStatusIcon(status)}
                      <span className="text-sm capitalize">
                        {status.replace(/_/g, ' ')}
                      </span>
                      <div className="flex-1 mx-3">
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${getStatusColor(status)} transition-all duration-300`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={getStatusBadgeVariant(status)} className="text-xs">
                        {count}
                      </Badge>
                      <span className="text-xs text-muted-foreground w-10 text-right">
                        {percentage.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center">
              <DollarSign className="h-4 w-4 mr-2" />
              Cost Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Parts</p>
                  <p className="text-sm font-semibold">{formatCurrency(statistics.cost_breakdown.parts)}</p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Labor</p>
                  <p className="text-sm font-semibold">{formatCurrency(statistics.cost_breakdown.labor)}</p>
                </div>
                <div className="text-center p-3 bg-orange-50 rounded-lg">
                  <p className="text-xs text-muted-foreground">GST</p>
                  <p className="text-sm font-semibold">{formatCurrency(statistics.cost_breakdown.gst)}</p>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Other</p>
                  <p className="text-sm font-semibold">{formatCurrency(statistics.cost_breakdown.other)}</p>
                </div>
              </div>
              <Separator />
              <div className="text-center p-3 bg-gray-100 rounded-lg">
                <p className="text-sm text-muted-foreground">Grand Total</p>
                <p className="text-xl font-bold">{formatCurrency(workshopSummary.grand_total)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Work Entries Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center">
            <Wrench className="h-4 w-4 mr-2" />
            Work Entries Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{statistics.work_entries_summary.total_entries}</p>
              <p className="text-xs text-muted-foreground">Total Entries</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{statistics.work_entries_summary.completed_entries}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">{statistics.work_entries_summary.pending_entries}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-blue-500">{formatCurrency(statistics.work_entries_summary.total_parts_cost)}</p>
              <p className="text-xs text-muted-foreground">Parts Cost</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-green-500">{formatCurrency(statistics.work_entries_summary.total_labor_cost)}</p>
              <p className="text-xs text-muted-foreground">Labor Cost</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-orange-500">{formatCurrency(statistics.work_entries_summary.total_gst)}</p>
              <p className="text-xs text-muted-foreground">Total GST</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quality Metrics */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center">
            <Target className="h-4 w-4 mr-2" />
            Quality Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600 mx-auto mb-1" />
              <p className="text-lg font-semibold">{statistics.quality_metrics.visual_inspection_passed}</p>
              <p className="text-xs text-muted-foreground">Visual Passed</p>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <CheckCircle className="h-6 w-6 text-blue-600 mx-auto mb-1" />
              <p className="text-lg font-semibold">{statistics.quality_metrics.functional_test_passed}</p>
              <p className="text-xs text-muted-foreground">Functional Passed</p>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <CheckCircle className="h-6 w-6 text-purple-600 mx-auto mb-1" />
              <p className="text-lg font-semibold">{statistics.quality_metrics.road_test_passed}</p>
              <p className="text-xs text-muted-foreground">Road Test Passed</p>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded-lg">
              <CheckCircle className="h-6 w-6 text-orange-600 mx-auto mb-1" />
              <p className="text-lg font-semibold">{statistics.quality_metrics.safety_check_passed}</p>
              <p className="text-xs text-muted-foreground">Safety Passed</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StatisticsTab;