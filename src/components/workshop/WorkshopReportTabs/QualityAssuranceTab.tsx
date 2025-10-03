import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Shield,
  CheckCircle,
  AlertCircle,
  XCircle,
  Eye,
  Wrench,
  Car,
  AlertTriangle,
  Target,
  Award,
} from "lucide-react";
import { WorkshopReport } from "../WorkshopReportModal";

interface QualityAssuranceTabProps {
  report: WorkshopReport;
}

const QualityAssuranceTab: React.FC<QualityAssuranceTabProps> = ({ report }) => {
  // Calculate overall quality metrics
  const calculateQualityScore = () => {
    const { quality_metrics } = report.statistics;
    const totalChecks = quality_metrics.visual_inspection_passed + 
                       quality_metrics.functional_test_passed + 
                       quality_metrics.road_test_passed + 
                       quality_metrics.safety_check_passed;
    
    const maxPossibleChecks = report.statistics.work_entries_summary.total_entries * 4; // 4 types of checks
    return maxPossibleChecks > 0 ? (totalChecks / maxPossibleChecks) * 100 : 0;
  };

  const overallQualityScore = calculateQualityScore();

  // Get quality check details from work entries
  const getQualityCheckDetails = () => {
    const details: Array<{
      fieldName: string;
      entryDescription: string;
      qualityCheck: any;
      technician: string;
      completed: boolean;
    }> = [];

    report.quotes_data.forEach(quote => {
      quote.work_details?.work_entries?.forEach(entry => {
        if (entry.quality_check) {
          details.push({
            fieldName: quote.field_name,
            entryDescription: entry.description,
            qualityCheck: entry.quality_check,
            technician: entry.technician,
            completed: entry.completed
          });
        }
      });
    });

    return details;
  };

  const qualityDetails = getQualityCheckDetails();

  const getCheckIcon = (passed: boolean) => {
    return passed ? (
      <CheckCircle className="h-4 w-4 text-green-600" />
    ) : (
      <XCircle className="h-4 w-4 text-red-600" />
    );
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 75) return "text-blue-600";
    if (score >= 60) return "text-orange-600";
    return "text-red-600";
  };

  const getScoreBg = (score: number) => {
    if (score >= 90) return "bg-green-50";
    if (score >= 75) return "bg-blue-50";
    if (score >= 60) return "bg-orange-50";
    return "bg-red-50";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-2">
        <Shield className="h-5 w-5 text-green-600" />
        <h2 className="text-lg font-semibold">Quality Assurance</h2>
        <Badge variant="outline">
          {qualityDetails.length} entries checked
        </Badge>
      </div>

      {/* Overall Quality Score */}
      <Card className={`${getScoreBg(overallQualityScore)} border-l-4 ${overallQualityScore >= 90 ? 'border-l-green-500' : overallQualityScore >= 75 ? 'border-l-blue-500' : overallQualityScore >= 60 ? 'border-l-orange-500' : 'border-l-red-500'}`}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <div className="flex items-center">
              <Award className="h-5 w-5 mr-2 text-yellow-600" />
              Overall Quality Score
            </div>
            <div className={`text-2xl font-bold ${getScoreColor(overallQualityScore)}`}>
              {overallQualityScore.toFixed(1)}%
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Progress value={overallQualityScore} className="mb-3" />
          <div className="text-sm text-muted-foreground">
            Based on {qualityDetails.length} quality inspections across all work entries
          </div>
        </CardContent>
      </Card>

      {/* Quality Metrics Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <Eye className="h-6 w-6 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-blue-600">
              {report.statistics.quality_metrics.visual_inspection_passed}
            </p>
            <p className="text-xs text-muted-foreground">Visual Inspections Passed</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <Wrench className="h-6 w-6 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-green-600">
              {report.statistics.quality_metrics.functional_test_passed}
            </p>
            <p className="text-xs text-muted-foreground">Functional Tests Passed</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <Car className="h-6 w-6 text-purple-600" />
            </div>
            <p className="text-2xl font-bold text-purple-600">
              {report.statistics.quality_metrics.road_test_passed}
            </p>
            <p className="text-xs text-muted-foreground">Road Tests Passed</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <Shield className="h-6 w-6 text-orange-600" />
            </div>
            <p className="text-2xl font-bold text-orange-600">
              {report.statistics.quality_metrics.safety_check_passed}
            </p>
            <p className="text-xs text-muted-foreground">Safety Checks Passed</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Quality Checks */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center">
            <Target className="h-4 w-4 mr-2" />
            Detailed Quality Inspections
          </CardTitle>
        </CardHeader>
        <CardContent>
          {qualityDetails.length > 0 ? (
            <div className="space-y-4">
              {qualityDetails.map((detail, index) => {
                const { qualityCheck } = detail;
                const checksCount = [
                  qualityCheck.visual_inspection,
                  qualityCheck.functional_test,
                  qualityCheck.road_test,
                  qualityCheck.safety_check
                ].filter(Boolean).length;
                const scorePercentage = (checksCount / 4) * 100;
                
                return (
                  <Card key={index} className="border border-gray-200">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="text-sm font-medium">{detail.fieldName}</h4>
                          <p className="text-xs text-muted-foreground">{detail.entryDescription}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Technician: {detail.technician}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className={`text-lg font-bold ${getScoreColor(scorePercentage)}`}>
                            {scorePercentage.toFixed(0)}%
                          </div>
                          <div className="flex items-center text-xs">
                            {detail.completed ? (
                              <Badge variant="default" className="bg-green-100 text-green-800">
                                Completed
                              </Badge>
                            ) : (
                              <Badge variant="secondary">
                                In Progress
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                        <div className="flex items-center space-x-2">
                          {getCheckIcon(qualityCheck.visual_inspection)}
                          <span className="text-xs">Visual Inspection</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          {getCheckIcon(qualityCheck.functional_test)}
                          <span className="text-xs">Functional Test</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          {getCheckIcon(qualityCheck.road_test)}
                          <span className="text-xs">Road Test</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          {getCheckIcon(qualityCheck.safety_check)}
                          <span className="text-xs">Safety Check</span>
                        </div>
                      </div>

                      {qualityCheck.notes && (
                        <div className="mt-3 p-2 bg-yellow-50 rounded border-l-4 border-l-yellow-400">
                          <div className="flex items-start space-x-2">
                            <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-xs font-medium text-yellow-800">Quality Notes:</p>
                              <p className="text-xs text-yellow-700">{qualityCheck.notes}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-30" />
              <p>No quality inspection data available</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default QualityAssuranceTab;