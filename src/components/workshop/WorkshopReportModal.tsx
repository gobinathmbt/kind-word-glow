import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FileText,
  DollarSign,
  Timer,
  Users,
  Wrench,
  X,
  AlertCircle,
} from "lucide-react";
import { workshopServices } from "@/api/services";
import { toast } from "sonner";
import MediaViewer, { MediaItem } from "@/components/common/MediaViewer";
import WorkDetailsTab from "@/components/workshop/WorkshopReportTabs/WorkDetailsTab";
import CommunicationsTab from "@/components/workshop/WorkshopReportTabs/CommunicationsTab";
import StatisticsTab from "@/components/workshop/WorkshopReportTabs/StatisticsTab";
import AttachmentsTab from "@/components/workshop/WorkshopReportTabs/AttachmentsTab";
import QualityAssuranceTab from "@/components/workshop/WorkshopReportTabs/QualityAssuranceTab";
import SupplierPerformanceTab from "@/components/workshop/WorkshopReportTabs/SupplierPerformanceTab";

interface WorkshopReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicleId: string;
  vehicleType: "inspection" | "tradein";
  stageName?: string;
}

export interface WorkEntry {
  id: string;
  description: string;
  parts_cost: number;
  labor_cost: number;
  gst: number;
  parts_used: string;
  labor_hours: string;
  technician: string;
  completed: boolean;
  entry_date_time: string;
  estimated_time: string;
  invoices: Array<{
    url: string;
    key: string;
    description: string;
    _id: string;
  }>;
  pdfs: Array<{
    url: string;
    key: string;
    description: string;
    _id: string;
  }>;
  videos: Array<{
    url: string;
    key: string;
    description: string;
    _id: string;
  }>;
  warranties: Array<{
    part: string;
    months: string;
    supplier: string;
    document: {
      url: string;
      key: string;
      description: string;
    };
    _id: string;
  }>;
  documents: Array<{
    url: string;
    key: string;
    description: string;
    _id: string;
  }>;
  images: Array<{
    url: string;
    key: string;
    description: string;
    _id: string;
  }>;
  persons: Array<{
    name: string;
    role: string;
    contact: string;
    _id: string;
  }>;
  quality_check: {
    visual_inspection: boolean;
    functional_test: boolean;
    road_test: boolean;
    safety_check: boolean;
    notes: string;
  };
  comments: string;
  _id: string;
}

export interface WorkDetails {
  work_entries: WorkEntry[];
  warranty_months: string;
  maintenance_recommendations: string;
  next_service_due: string;
  supplier_comments: string;
  company_feedback: string;
  customer_satisfaction: string;
  technician_company_assigned: string;
  work_completion_date: string;
  total_amount: number;
  quote_difference: number;
  final_price: number;
  gst_amount: number;
  amount_spent: number;
  work_images: Array<{
    url: string;
    _id: string;
  }>;
  submitted_at: string;
}

export interface QuoteData {
  field_id: string;
  field_name: string;
  category_name?: string;
  section_name?: string;
  quote_amount: number;
  quote_description: string;
  selected_suppliers: Supplier[];
  approved_supplier: Supplier | null;
  work_details: WorkDetails;
  field_images: string[];
  field_videos: string[];
  quote_responses: QuoteResponse[];
  quote_created_at: string;
  work_started_at?: string;
  work_submitted_at?: string;
  status_history: any[];
  _id: string;
}

export interface Supplier {
  supplier_id: string;
  supplier_name: string;
  supplier_email: string;
  supplier_shop_name: string;
  approved_at?: string;
}

export interface QuoteResponse {
  supplier_id: string;
  supplier_name: string;
  estimated_cost: number;
  estimated_time: string;
  comments: string;
  status: string;
  responded_at: string;
  _id: string;
}

export interface Communication {
  conversation_id: string;
  supplier_id: string;
  field_id: string;
  field_name: string;
  total_messages: number;
  last_message_at: string;
  messages: Message[];
  _id: string;
}

export interface Message {
  sender_type: string;
  sender_name: string;
  message_type: string;
  content: string;
  file_url: string | null;
  _id: string;
}

export interface Attachment {
  type: string;
  url: string;
  key?: string;
  filename?: string;
  description?: string;
  field_id?: string;
  work_entry_id?: string;
  uploaded_at: string;
  _id: string;
}

export interface SupplierPerformance {
  supplier_id: string;
  supplier_name: string;
  jobs_completed: number;
  work_entries_completed: number;
  avg_cost: number;
  avg_time: number;
  total_earned: number;
  quality_score: number;
  _id: string;
}

export interface TechnicianPerformance {
  technician_name: string;
  work_entries_completed: number;
  avg_completion_time: number;
  quality_score: number;
  _id: string;
}

export interface WorkshopReport {
  _id: string;
  vehicle_id: string;
  company_id: string;
  vehicle_stock_id: number;
  vehicle_type: string;
  report_type: string;
  stage_name?: string;
  vehicle_details: {
    vin: string;
    plate_no: string;
    make: string;
    model: string;
    year: number;
    chassis_no: string;
    variant: string;
    hero_image: string;
    name: string;
  };
  workshop_summary: {
    total_fields: number;
    total_quotes: number;
    total_work_completed: number;
    total_work_entries: number;
    total_cost: number;
    total_gst: number;
    grand_total: number;
    parts_cost: number;
    labor_cost: number;
    start_date: string;
    completion_date: string | null;
    duration_days: number | null;
  };
  quotes_data: QuoteData[];
  communications: Communication[];
  attachments: Attachment[];
  statistics: {
    fields_by_status: {
      completed_jobs: number;
      work_review: number;
      work_in_progress: number;
      quote_approved: number;
      quote_sent: number;
      quote_request: number;
      rework: number;
    };
    work_entries_summary: {
      total_entries: number;
      completed_entries: number;
      pending_entries: number;
      total_parts_cost: number;
      total_labor_cost: number;
      total_gst: number;
    };
    quality_metrics: {
      visual_inspection_passed: number;
      functional_test_passed: number;
      road_test_passed: number;
      safety_check_passed: number;
    };
    supplier_performance: SupplierPerformance[];
    technician_performance: TechnicianPerformance[];
    cost_breakdown: {
      parts: number;
      labor: number;
      gst: number;
      other: number;
    };
    avg_completion_time: number;
  };
  created_at: string;
  updated_at: string;
}

const WorkshopReportModal: React.FC<WorkshopReportModalProps> = ({
  isOpen,
  onClose,
  vehicleId,
  vehicleType,
  stageName,
}) => {
  const [reports, setReports] = useState<WorkshopReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<WorkshopReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("work_details");
  
  // Media viewer states
  const [mediaViewerOpen, setMediaViewerOpen] = useState(false);
  const [currentMediaId, setCurrentMediaId] = useState<string>("");

  useEffect(() => {
    if (isOpen) {
      fetchReports();
    }
  }, [isOpen, vehicleId, vehicleType]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const response = await workshopServices.getWorkshopReports(vehicleId, vehicleType);
      if (response.data.success) {
        setReports(response.data.data.reports);
        
        // Auto-select report based on vehicle type and stage
        if (vehicleType === "inspection" && stageName) {
          const stageReport = response.data.data.reports.find(
            (report: WorkshopReport) => report.stage_name === stageName
          );
          if (stageReport) {
            setSelectedReport(stageReport);
          }
        } else if (vehicleType === "tradein" && response.data.data.reports.length > 0) {
          setSelectedReport(response.data.data.reports[0]);
        }
      }
    } catch (error) {
      console.error("Error fetching workshop reports:", error);
      toast.error("Failed to fetch workshop reports");
    } finally {
      setLoading(false);
    }
  };

  // Prepare media items from all sources for MediaViewer
  const prepareAllMediaItems = (): MediaItem[] => {
    if (!selectedReport) return [];

    const allMedia: MediaItem[] = [];

    // Add media from quotes data
    selectedReport.quotes_data.forEach((quote) => {
      // Field images
      quote.field_images?.forEach((url, imgIndex) => {
        allMedia.push({
          id: `field-${quote.field_id}-${imgIndex}`,
          url: url,
          type: "image",
          title: `${quote.field_name} - Field Image ${imgIndex + 1}`,
          description: `Field image for ${quote.field_name}`
        });
      });

      // Field videos
      quote.field_videos?.forEach((url, videoIndex) => {
        allMedia.push({
          id: `field-video-${quote.field_id}-${videoIndex}`,
          url: url,
          type: "video",
          title: `${quote.field_name} - Video ${videoIndex + 1}`,
          description: `Field video for ${quote.field_name}`
        });
      });

      // Work images from main work_details
      quote.work_details?.work_images?.forEach((img, imgIndex) => {
        allMedia.push({
          id: `work-main-${quote.field_id}-${img._id}`,
          url: img.url,
          type: "image",
          title: `${quote.field_name} - Work Image ${imgIndex + 1}`,
          description: `Work completed image for ${quote.field_name}`
        });
      });

      // Work entry media
      quote.work_details?.work_entries?.forEach((entry, entryIndex) => {
        // Entry images
        entry.images?.forEach((img, imgIndex) => {
          allMedia.push({
            id: `entry-img-${entry.id}-${img._id}`,
            url: img.url,
            type: "image",
            title: `${quote.field_name} - Entry ${entryIndex + 1} Image ${imgIndex + 1}`,
            description: `${entry.description} - Image`
          });
        });

        // Entry videos
        entry.videos?.forEach((video, videoIndex) => {
          allMedia.push({
            id: `entry-video-${entry.id}-${video._id}`,
            url: video.url,
            type: "video",
            title: `${quote.field_name} - Entry ${entryIndex + 1} Video ${videoIndex + 1}`,
            description: `${entry.description} - Video`
          });
        });
      });
    });

    // Add communication media
    selectedReport.communications.forEach((comm) => {
      comm.messages?.forEach((msg, msgIndex) => {
        if (msg.message_type === 'image' && msg.file_url) {
          allMedia.push({
            id: `comm-${comm.conversation_id}-${msgIndex}`,
            url: msg.file_url,
            type: "image",
            title: `${comm.field_name} - Communication Image`,
            description: `Message from ${msg.sender_name}`
          });
        }
      });
    });

    // Add attachment media
    selectedReport.attachments?.forEach((attachment, index) => {
      if (attachment.type.includes('image')) {
        allMedia.push({
          id: `attachment-${attachment._id}`,
          url: attachment.url,
          type: "image",
          title: attachment.filename || `Attachment Image ${index + 1}`,
          description: attachment.description || 'Attachment image'
        });
      } else if (attachment.type.includes('video')) {
        allMedia.push({
          id: `attachment-${attachment._id}`,
          url: attachment.url,
          type: "video",
          title: attachment.filename || `Attachment Video ${index + 1}`,
          description: attachment.description || 'Attachment video'
        });
      }
    });

    return allMedia;
  };

  // Handle opening media viewer
  const handleOpenMediaViewer = (mediaId: string) => {
    setCurrentMediaId(mediaId);
    setMediaViewerOpen(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount || 0);
  };

  if (!isOpen) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-[90vw] w-[90vw] h-[90vh] overflow-hidden p-0 gap-0">
          <DialogHeader className="p-4 sm:p-6 pb-2 sm:pb-4 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <DialogTitle className="text-lg sm:text-xl text-left">Workshop Report</DialogTitle>
                  <DialogDescription className="text-sm text-left">
                    {selectedReport?.vehicle_details.name || "Vehicle Workshop Report"}
                    {vehicleType === "inspection" && stageName && ` - ${stageName}`}
                  </DialogDescription>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={onClose} className="shrink-0">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          <div className="flex flex-col lg:flex-row h-[calc(90vh-80px)] overflow-hidden">
            {/* Report Selection Sidebar - Hidden on mobile, collapsible on tablet */}
            {vehicleType === "inspection" && reports.length > 1 && (
              <div className="hidden lg:block lg:w-64 flex-shrink-0 border-r bg-gray-50/50">
                <div className="p-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Select Stage Report</h3>
                  <ScrollArea className="h-[calc(90vh-140px)]">
                    <div className="space-y-2">
                      {reports.map((report) => (
                        <Button
                          key={report._id}
                          variant={selectedReport?._id === report._id ? "default" : "ghost"}
                          size="sm"
                          className="w-full justify-start text-left h-auto py-2 px-3"
                          onClick={() => setSelectedReport(report)}
                        >
                          <FileText className="h-4 w-4 mr-2 shrink-0" />
                          <span className="truncate">{report.stage_name}</span>
                        </Button>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            )}

            {/* Main Report Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center space-y-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="text-sm text-muted-foreground">Loading workshop report...</p>
                  </div>
                </div>
              ) : selectedReport ? (
                <div className="h-full flex flex-col">
                  {/* Summary Cards - Responsive grid */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 p-4 sm:p-6 pb-2 sm:pb-4 bg-gray-50/30">
                    <Card>
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex items-center space-x-2">
                          <Wrench className="h-4 w-4 text-blue-600 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs text-muted-foreground">Total Jobs</p>
                            <p className="text-sm sm:text-lg font-semibold truncate">
                              {selectedReport.workshop_summary.total_work_completed}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex items-center space-x-2">
                          <DollarSign className="h-4 w-4 text-green-600 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs text-muted-foreground">Grand Total</p>
                            <p className="text-sm sm:text-lg font-semibold truncate">
                              {formatCurrency(selectedReport.workshop_summary.grand_total)}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex items-center space-x-2">
                          <Timer className="h-4 w-4 text-orange-600 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs text-muted-foreground">Duration</p>
                            <p className="text-sm sm:text-lg font-semibold truncate">
                              {selectedReport.workshop_summary.duration_days ? 
                                `${selectedReport.workshop_summary.duration_days} days` : 
                                "In Progress"
                              }
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex items-center space-x-2">
                          <Users className="h-4 w-4 text-purple-600 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs text-muted-foreground">Suppliers</p>
                            <p className="text-sm sm:text-lg font-semibold truncate">
                              {selectedReport.statistics.supplier_performance.length}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Main Content Tabs */}
                  <Tabs 
                    defaultValue="work_details" 
                    className="flex-1 flex flex-col overflow-hidden px-3 sm:px-6 pb-4 sm:pb-6" 
                    value={activeTab} 
                    onValueChange={setActiveTab}
                  >
                    {/* Responsive tab list - scrollable on mobile */}
                    <div className="border-b overflow-x-auto">
                      <TabsList className="grid w-max grid-cols-6 h-auto p-0 bg-transparent">
                        <TabsTrigger value="work_details" className="text-xs sm:text-sm px-3 py-2">
                          Work Details
                        </TabsTrigger>
                        <TabsTrigger value="communications" className="text-xs sm:text-sm px-3 py-2">
                          Communications
                        </TabsTrigger>
                        <TabsTrigger value="statistics" className="text-xs sm:text-sm px-3 py-2">
                          Statistics
                        </TabsTrigger>
                        <TabsTrigger value="quality" className="text-xs sm:text-sm px-3 py-2">
                          Quality
                        </TabsTrigger>
                        <TabsTrigger value="suppliers" className="text-xs sm:text-sm px-3 py-2">
                          Suppliers
                        </TabsTrigger>
                        <TabsTrigger value="attachments" className="text-xs sm:text-sm px-3 py-2">
                          Attachments
                        </TabsTrigger>
                      </TabsList>
                    </div>
                    
                    {/* Tab content with proper scrolling */}
                    <div className="flex-1 overflow-hidden mt-4">
                      <ScrollArea className="h-full">
                        <TabsContent value="work_details" className="h-full m-0">
                          <WorkDetailsTab 
                            report={selectedReport}
                            onOpenMediaViewer={handleOpenMediaViewer}
                            formatCurrency={formatCurrency}
                          />
                        </TabsContent>
                        
                        <TabsContent value="communications" className="h-full m-0">
                          <CommunicationsTab 
                            communications={selectedReport.communications}
                            onOpenMediaViewer={handleOpenMediaViewer}
                          />
                        </TabsContent>
                        
                        <TabsContent value="statistics" className="h-full m-0">
                          <StatisticsTab 
                            statistics={selectedReport.statistics}
                            workshopSummary={selectedReport.workshop_summary}
                            formatCurrency={formatCurrency}
                          />
                        </TabsContent>

                        <TabsContent value="quality" className="h-full m-0">
                          <QualityAssuranceTab 
                            report={selectedReport}
                          />
                        </TabsContent>

                        <TabsContent value="suppliers" className="h-full m-0">
                          <SupplierPerformanceTab 
                            suppliers={selectedReport.statistics.supplier_performance}
                            technicians={selectedReport.statistics.technician_performance}
                            formatCurrency={formatCurrency}
                          />
                        </TabsContent>
                        
                        <TabsContent value="attachments" className="h-full m-0">
                          <AttachmentsTab 
                            attachments={selectedReport.attachments}
                            onOpenMediaViewer={handleOpenMediaViewer}
                          />
                        </TabsContent>
                      </ScrollArea>
                    </div>
                  </Tabs>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full p-4">
                  <div className="text-center space-y-4">
                    <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto" />
                    <p className="text-muted-foreground">No workshop report found</p>
                    <Button onClick={fetchReports}>Try Again</Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Media Viewer */}
      <MediaViewer
        media={prepareAllMediaItems()}
        currentMediaId={currentMediaId}
        isOpen={mediaViewerOpen}
        onClose={() => setMediaViewerOpen(false)}
      />
    </>
  );
};

export default WorkshopReportModal;