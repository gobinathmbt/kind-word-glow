import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Users,
  Award,
  TrendingUp,
  Clock,
  DollarSign,
  Star,
  User,
  Briefcase,
} from "lucide-react";
import { SupplierPerformance, TechnicianPerformance } from "../WorkshopReportModal";

interface SupplierPerformanceTabProps {
  suppliers: SupplierPerformance[];
  technicians: TechnicianPerformance[];
  formatCurrency: (amount: number) => string;
}

const SupplierPerformanceTab: React.FC<SupplierPerformanceTabProps> = ({
  suppliers,
  technicians,
  formatCurrency,
}) => {
  const getPerformanceColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 75) return "text-blue-600";
    if (score >= 60) return "text-orange-600";
    return "text-red-600";
  };

  const getPerformanceBg = (score: number) => {
    if (score >= 90) return "bg-green-50";
    if (score >= 75) return "bg-blue-50";
    if (score >= 60) return "bg-orange-50";
    return "bg-red-50";
  };

  const getPerformanceBadge = (score: number) => {
    if (score >= 95) return { text: "Excellent", variant: "default" as const };
    if (score >= 85) return { text: "Good", variant: "secondary" as const };
    if (score >= 70) return { text: "Average", variant: "outline" as const };
    return { text: "Needs Improvement", variant: "destructive" as const };
  };

  const topSupplier = suppliers.reduce((prev, current) => 
    (prev.quality_score > current.quality_score) ? prev : current, suppliers[0]
  );

  const topTechnician = technicians.reduce((prev, current) => 
    (prev.quality_score > current.quality_score) ? prev : current, technicians[0]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-2">
        <Users className="h-5 w-5 text-blue-600" />
        <h2 className="text-lg font-semibold">Performance Overview</h2>
        <Badge variant="outline">
          {suppliers.length} suppliers • {technicians.length} technicians
        </Badge>
      </div>

      {/* Top Performers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {topSupplier && (
          <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center">
                <Award className="h-5 w-5 mr-2 text-gold-600" />
                Top Supplier
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg">{topSupplier.supplier_name}</h3>
                  <p className="text-sm text-muted-foreground">{topSupplier.jobs_completed} jobs completed</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-600">{topSupplier.quality_score}%</div>
                  <Badge {...getPerformanceBadge(topSupplier.quality_score)}>
                    {getPerformanceBadge(topSupplier.quality_score).text}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {topTechnician && (
          <Card className="bg-gradient-to-r from-green-50 to-teal-50 border-green-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center">
                <Star className="h-5 w-5 mr-2 text-yellow-600" />
                Top Technician
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg">{topTechnician.technician_name}</h3>
                  <p className="text-sm text-muted-foreground">{topTechnician.work_entries_completed} entries completed</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-600">{topTechnician.quality_score}%</div>
                  <Badge {...getPerformanceBadge(topTechnician.quality_score)}>
                    {getPerformanceBadge(topTechnician.quality_score).text}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Supplier Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center">
            <Briefcase className="h-4 w-4 mr-2" />
            Supplier Performance Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          {suppliers.length > 0 ? (
            <div className="space-y-4">
              {suppliers.map((supplier, index) => (
                <Card key={supplier.supplier_id} className={`${getPerformanceBg(supplier.quality_score)} border`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="font-semibold">{supplier.supplier_name}</h3>
                        <div className="flex items-center space-x-4 mt-2 text-sm text-muted-foreground">
                          <div className="flex items-center">
                            <Briefcase className="h-3 w-3 mr-1" />
                            <span>{supplier.jobs_completed} jobs</span>
                          </div>
                          <div className="flex items-center">
                            <TrendingUp className="h-3 w-3 mr-1" />
                            <span>{supplier.work_entries_completed} entries</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-xl font-bold ${getPerformanceColor(supplier.quality_score)}`}>
                          {supplier.quality_score}%
                        </div>
                        <Badge {...getPerformanceBadge(supplier.quality_score)}>
                          {getPerformanceBadge(supplier.quality_score).text}
                        </Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-3">
                      <div className="text-center p-2 bg-white rounded-lg">
                        <DollarSign className="h-4 w-4 mx-auto mb-1 text-green-600" />
                        <p className="text-xs text-muted-foreground">Avg. Cost</p>
                        <p className="text-sm font-semibold">{formatCurrency(supplier.avg_cost)}</p>
                      </div>
                      <div className="text-center p-2 bg-white rounded-lg">
                        <Clock className="h-4 w-4 mx-auto mb-1 text-blue-600" />
                        <p className="text-xs text-muted-foreground">Avg. Time</p>
                        <p className="text-sm font-semibold">{supplier.avg_time.toFixed(1)} days</p>
                      </div>
                      <div className="text-center p-2 bg-white rounded-lg">
                        <TrendingUp className="h-4 w-4 mx-auto mb-1 text-purple-600" />
                        <p className="text-xs text-muted-foreground">Total Earned</p>
                        <p className="text-sm font-semibold">{formatCurrency(supplier.total_earned)}</p>
                      </div>
                      <div className="text-center p-2 bg-white rounded-lg">
                        <Star className="h-4 w-4 mx-auto mb-1 text-yellow-600" />
                        <p className="text-xs text-muted-foreground">Quality</p>
                        <p className="text-sm font-semibold">{supplier.quality_score}%</p>
                      </div>
                    </div>

                    <Progress value={supplier.quality_score} className="h-2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-2 opacity-30" />
              <p>No supplier performance data available</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Technician Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center">
            <User className="h-4 w-4 mr-2" />
            Technician Performance Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          {technicians.length > 0 ? (
            <div className="space-y-4">
              {technicians.map((technician, index) => (
                <Card key={index} className={`${getPerformanceBg(technician.quality_score)} border`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="font-semibold">{technician.technician_name}</h3>
                        <div className="flex items-center space-x-4 mt-2 text-sm text-muted-foreground">
                          <div className="flex items-center">
                            <Briefcase className="h-3 w-3 mr-1" />
                            <span>{technician.work_entries_completed} entries</span>
                          </div>
                          <div className="flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            <span>{technician.avg_completion_time.toFixed(1)} days avg</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-xl font-bold ${getPerformanceColor(technician.quality_score)}`}>
                          {technician.quality_score}%
                        </div>
                        <Badge {...getPerformanceBadge(technician.quality_score)}>
                          {getPerformanceBadge(technician.quality_score).text}
                        </Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-3">
                      <div className="text-center p-2 bg-white rounded-lg">
                        <TrendingUp className="h-4 w-4 mx-auto mb-1 text-blue-600" />
                        <p className="text-xs text-muted-foreground">Entries</p>
                        <p className="text-sm font-semibold">{technician.work_entries_completed}</p>
                      </div>
                      <div className="text-center p-2 bg-white rounded-lg">
                        <Clock className="h-4 w-4 mx-auto mb-1 text-orange-600" />
                        <p className="text-xs text-muted-foreground">Avg. Time</p>
                        <p className="text-sm font-semibold">{technician.avg_completion_time.toFixed(1)}d</p>
                      </div>
                      <div className="text-center p-2 bg-white rounded-lg">
                        <Star className="h-4 w-4 mx-auto mb-1 text-yellow-600" />
                        <p className="text-xs text-muted-foreground">Quality</p>
                        <p className="text-sm font-semibold">{technician.quality_score}%</p>
                      </div>
                    </div>

                    <Progress value={technician.quality_score} className="h-2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <User className="h-12 w-12 mx-auto mb-2 opacity-30" />
              <p>No technician performance data available</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SupplierPerformanceTab;