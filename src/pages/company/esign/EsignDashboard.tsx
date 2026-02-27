import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  CheckCircle,
  Clock,
  XCircle,
  Send,
  TrendingUp,
  Users,
  Calendar,
} from "lucide-react";
import { esignServices } from "@/api/services";

const EsignDashboard = () => {
  const navigate = useNavigate();

  const { data: documentsData, isLoading } = useQuery({
    queryKey: ["esign-dashboard-documents"],
    queryFn: async () => {
      const response = await esignServices.getDocuments({ limit: 10, sort_by: "created_at", sort_order: "desc" });
      return response.data;
    },
  });

  const { data: allDocumentsData } = useQuery({
    queryKey: ["esign-dashboard-all-documents"],
    queryFn: async () => {
      const response = await esignServices.getDocuments({ limit: 1000 });
      return response.data;
    },
  });

  const documents = documentsData?.documents || [];
  const allDocuments = allDocumentsData?.documents || [];

  // Calculate statistics
  const stats = {
    total: allDocuments.length,
    completed: allDocuments.filter((d: any) => d.status === "completed").length,
    pending: allDocuments.filter((d: any) => 
      ["distributed", "opened", "partially_signed"].includes(d.status)
    ).length,
    expired: allDocuments.filter((d: any) => d.status === "expired").length,
    cancelled: allDocuments.filter((d: any) => d.status === "cancelled").length,
  };

  const completionRate = stats.total > 0 
    ? Math.round((stats.completed / stats.total) * 100) 
    : 0;

  const statCards = [
    {
      title: "Total Documents",
      value: stats.total,
      icon: FileText,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "Completed",
      value: stats.completed,
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      title: "Pending",
      value: stats.pending,
      icon: Clock,
      color: "text-yellow-600",
      bgColor: "bg-yellow-100",
    },
    {
      title: "Expired",
      value: stats.expired,
      icon: XCircle,
      color: "text-gray-600",
      bgColor: "bg-gray-100",
    },
  ];

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: any; color: string; icon: any }> = {
      completed: { variant: "default", color: "bg-green-100 text-green-800 hover:bg-green-100", icon: CheckCircle },
      distributed: { variant: "default", color: "bg-blue-100 text-blue-800 hover:bg-blue-100", icon: Send },
      partially_signed: { variant: "default", color: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100", icon: Clock },
      cancelled: { variant: "outline", color: "bg-red-100 text-red-800 hover:bg-red-100", icon: XCircle },
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">E-Sign Dashboard</h1>
          <p className="text-muted-foreground">Overview of your electronic signature documents</p>
        </div>
        <Button onClick={() => navigate("/company/esign/documents")}>
          View All Documents
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <div className={`p-2 rounded-full ${stat.bgColor}`}>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Completion Rate Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingUp className="h-5 w-5 mr-2 text-green-600" />
            Completion Rate
          </CardTitle>
          <CardDescription>Percentage of documents successfully completed</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <div className="text-4xl font-bold text-green-600">{completionRate}%</div>
            <div className="flex-1">
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div
                  className="bg-green-600 h-4 rounded-full transition-all duration-500"
                  style={{ width: `${completionRate}%` }}
                ></div>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {stats.completed} of {stats.total} documents completed
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Documents */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                Recent Documents
              </CardTitle>
              <CardDescription>Latest document activity</CardDescription>
            </div>
            <Button variant="outline" onClick={() => navigate("/company/esign/documents")}>
              View All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {documents.length > 0 ? (
              documents.map((document: any) => (
                <div
                  key={document._id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                  onClick={() => navigate(`/company/esign/documents/${document._id}`)}
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{document.template_snapshot?.name || "Unknown Template"}</span>
                    </div>
                    <div className="flex items-center space-x-4 mt-2 text-sm text-muted-foreground">
                      <div className="flex items-center space-x-1">
                        <Users className="h-3 w-3" />
                        <span>{document.recipients.length} recipients</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-3 w-3" />
                        <span>{new Date(document.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    {getStatusBadge(document.status)}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No documents yet</p>
                <p className="text-sm">Create a template and send your first document</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks and shortcuts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col items-center space-y-2"
              onClick={() => navigate("/company/esign/templates")}
            >
              <FileText className="h-6 w-6" />
              <span>Manage Templates</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col items-center space-y-2"
              onClick={() => navigate("/company/esign/documents")}
            >
              <Send className="h-6 w-6" />
              <span>View Documents</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col items-center space-y-2"
              onClick={() => navigate("/company/esign/settings")}
            >
              <Users className="h-6 w-6" />
              <span>Settings</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EsignDashboard;
