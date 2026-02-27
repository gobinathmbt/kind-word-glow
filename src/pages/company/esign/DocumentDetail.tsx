import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  Download,
  Ban,
  RefreshCw,
  Bell,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Send,
  Package,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { esignServices } from "@/api/services";

const DocumentDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [activeTab, setActiveTab] = useState("overview");

  const { data: documentData, isLoading } = useQuery({
    queryKey: ["esign-document", id],
    queryFn: async () => {
      const response = await esignServices.getDocument(id!);
      return response.data.document;
    },
    enabled: !!id,
  });

  const { data: timelineData } = useQuery({
    queryKey: ["esign-document-timeline", id],
    queryFn: async () => {
      const response = await esignServices.getDocumentTimeline(id!);
      return response.data.timeline;
    },
    enabled: !!id && activeTab === "timeline",
  });

  const cancelMutation = useMutation({
    mutationFn: () => esignServices.cancelDocument(id!, { reason: cancelReason }),
    onSuccess: () => {
      toast.success("Document cancelled successfully");
      queryClient.invalidateQueries({ queryKey: ["esign-document", id] });
      setCancelDialogOpen(false);
      setCancelReason("");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to cancel document");
    },
  });

  const resendMutation = useMutation({
    mutationFn: (recipientId: string) => 
      esignServices.resendDocument(id!, { recipient_id: recipientId }),
    onSuccess: () => {
      toast.success("Document resent successfully");
      queryClient.invalidateQueries({ queryKey: ["esign-document", id] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to resend document");
    },
  });

  const remindMutation = useMutation({
    mutationFn: () => esignServices.remindDocument(id!),
    onSuccess: () => {
      toast.success("Reminders sent successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to send reminders");
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading document...</p>
        </div>
      </div>
    );
  }

  if (!documentData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-lg font-semibold">Document not found</p>
          <Button onClick={() => navigate("/company/esign/documents")} className="mt-4">
            Back to Documents
          </Button>
        </div>
      </div>
    );
  }

  const document = documentData;

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

  const getRecipientStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; icon: any }> = {
      signed: { color: "bg-green-100 text-green-800", icon: CheckCircle },
      active: { color: "bg-blue-100 text-blue-800", icon: Clock },
      pending: { color: "bg-gray-100 text-gray-800", icon: Clock },
      opened: { color: "bg-yellow-100 text-yellow-800", icon: FileText },
      rejected: { color: "bg-red-100 text-red-800", icon: XCircle },
    };

    const config = statusConfig[status] || { color: "bg-gray-100 text-gray-800", icon: FileText };
    const Icon = config.icon;

    return (
      <Badge variant="outline" className={config.color}>
        <Icon className="w-3 h-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const handleDownload = async () => {
    try {
      const response = await esignServices.downloadDocument(id!);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = window.document.createElement('a');
      link.href = url;
      link.setAttribute('download', `document_${id}.pdf`);
      window.document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Document downloaded");
    } catch (error) {
      toast.error("Failed to download document");
    }
  };

  const handleDownloadEvidencePackage = async () => {
    try {
      const response = await esignServices.downloadEvidencePackage(id!);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = window.document.createElement('a');
      link.href = url;
      link.setAttribute('download', `evidence_package_${id}.zip`);
      window.document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Evidence package downloaded");
    } catch (error) {
      toast.error("Failed to download evidence package");
    }
  };

  const handleVerify = async () => {
    try {
      const response = await esignServices.verifyDocument(id!);
      const verification = response.data.verification;
      if (verification.valid) {
        toast.success("Document verification successful", {
          description: "The PDF has not been tampered with",
        });
      } else {
        toast.error("Document verification failed", {
          description: "The PDF may have been tampered with",
        });
      }
    } catch (error) {
      toast.error("Failed to verify document");
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/company/esign/documents")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{document.template_snapshot?.name || "Document"}</h1>
            <p className="text-sm text-muted-foreground">Document ID: {document._id}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {getStatusBadge(document.status)}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center space-x-2">
        {document.status === "completed" && (
          <>
            <Button onClick={handleDownload} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
            <Button onClick={handleDownloadEvidencePackage} variant="outline">
              <Package className="h-4 w-4 mr-2" />
              Evidence Package
            </Button>
            <Button onClick={handleVerify} variant="outline">
              <ShieldCheck className="h-4 w-4 mr-2" />
              Verify
            </Button>
          </>
        )}
        {!["completed", "cancelled", "expired"].includes(document.status) && (
          <>
            <Button onClick={() => remindMutation.mutate()} variant="outline">
              <Bell className="h-4 w-4 mr-2" />
              Send Reminder
            </Button>
            <Button onClick={() => setCancelDialogOpen(true)} variant="outline">
              <Ban className="h-4 w-4 mr-2" />
              Cancel Document
            </Button>
          </>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="recipients">Recipients</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Document Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Template</Label>
                  <p className="text-sm">{document.template_snapshot?.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                  <div className="mt-1">{getStatusBadge(document.status)}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Created</Label>
                  <p className="text-sm">{new Date(document.created_at).toLocaleString()}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Expires</Label>
                  <p className="text-sm">{new Date(document.expires_at).toLocaleString()}</p>
                </div>
                {document.completed_at && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Completed</Label>
                    <p className="text-sm">{new Date(document.completed_at).toLocaleString()}</p>
                  </div>
                )}
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Signature Type</Label>
                  <p className="text-sm">
                    {(() => {
                      const type = document.template_snapshot?.signature_type;
                      const typeLabels: Record<string, string> = {
                        single: "Single",
                        multiple: "Parallel",
                        hierarchy: "Sequential",
                        send_to_all: "Broadcast",
                      };
                      return typeLabels[type] || type;
                    })()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recipients Tab */}
        <TabsContent value="recipients" className="space-y-4">
          {document.recipients.map((recipient: any, index: number) => (
            <Card key={index}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{recipient.name}</CardTitle>
                    <CardDescription>{recipient.email}</CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getRecipientStatusBadge(recipient.status)}
                    {["pending", "active", "opened"].includes(recipient.status) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => resendMutation.mutate(recipient._id)}
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Resend
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Signature Order</Label>
                    <p className="text-sm">{recipient.signature_order}</p>
                  </div>
                  {recipient.signed_at && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Signed At</Label>
                      <p className="text-sm">{new Date(recipient.signed_at).toLocaleString()}</p>
                    </div>
                  )}
                  {recipient.ip_address && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">IP Address</Label>
                      <p className="text-sm">{recipient.ip_address}</p>
                    </div>
                  )}
                  {recipient.geo_location && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Location</Label>
                      <p className="text-sm">
                        {[recipient.geo_location.city, recipient.geo_location.region, recipient.geo_location.country]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Timeline Tab */}
        <TabsContent value="timeline" className="space-y-4">
          {timelineData && timelineData.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Document Timeline</CardTitle>
                <CardDescription>Chronological history of all events</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {timelineData.map((event: any, index: number) => (
                    <div key={index} className="flex items-start space-x-4">
                      <div className={`w-2 h-2 mt-2 rounded-full bg-${event.color}-500`}></div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">{event.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(event.timestamp).toLocaleString()}
                          </p>
                        </div>
                        {event.metadata && Object.keys(event.metadata).length > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {JSON.stringify(event.metadata)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No timeline events available
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Cancel Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this document? This action cannot be undone.
              All pending recipients will be notified.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="cancel-reason">Reason (optional)</Label>
            <Textarea
              id="cancel-reason"
              placeholder="Enter reason for cancellation"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => cancelMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirm Cancellation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DocumentDetail;
