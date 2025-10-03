import React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle,
  Clock,
  User,
  Wrench,
  FileText,
  Calendar,
  AlertTriangle,
  Shield,
  Video,
  File,
  ZoomIn,
  Play,
} from "lucide-react";
import { WorkshopReport, QuoteData, WorkEntry } from "../WorkshopReportModal";

interface WorkDetailsTabProps {
  report: WorkshopReport;
  onOpenMediaViewer: (mediaId: string) => void;
  formatCurrency: (amount: number) => string;
}

const WorkDetailsTab: React.FC<WorkDetailsTabProps> = ({
  report,
  onOpenMediaViewer,
  formatCurrency,
}) => {
  const formatDate = (dateString: string) => {
    if (!dateString || dateString === "Invalid Date") return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const groupQuotesBySection = (quotes: QuoteData[]) => {
    const grouped: { [key: string]: { [key: string]: QuoteData[] } } = {};
    
    quotes.forEach((quote) => {
      const category = quote.category_name || "General";
      const section = quote.section_name || "Default";
      
      if (!grouped[category]) {
        grouped[category] = {};
      }
      if (!grouped[category][section]) {
        grouped[category][section] = [];
      }
      grouped[category][section].push(quote);
    });
    
    return grouped;
  };

  const MediaGallery = ({ 
    images, 
    videos, 
    pdfs, 
    fieldId,
    workEntryId 
  }: { 
    images: Array<{ url: string; _id?: string; description?: string }>;
    videos: Array<{ url: string; _id?: string; description?: string }>;
    pdfs: Array<{ url: string; _id?: string; description?: string }>;
    fieldId: string;
    workEntryId?: string;
  }) => {
    const allMedia = [
      ...images.map((img, idx) => ({ 
        type: 'image' as const, 
        url: img.url, 
        id: workEntryId ? `${workEntryId}-img-${img._id || idx}` : `${fieldId}-img-${idx}`,
        description: img.description
      })),
      ...videos.map((vid, idx) => ({ 
        type: 'video' as const, 
        url: vid.url, 
        id: workEntryId ? `${workEntryId}-vid-${vid._id || idx}` : `${fieldId}-vid-${idx}`,
        description: vid.description
      })),
      ...pdfs.map((pdf, idx) => ({ 
        type: 'pdf' as const, 
        url: pdf.url, 
        id: workEntryId ? `${workEntryId}-pdf-${pdf._id || idx}` : `${fieldId}-pdf-${idx}`,
        description: pdf.description
      }))
    ];

    if (allMedia.length === 0) return null;

    return (
      <div className="mt-3 pt-3 border-t">
        <span className="text-muted-foreground text-sm">Media Attachments:</span>
        <div className="flex flex-wrap gap-2 mt-2">
          {allMedia.slice(0, 8).map((media, idx) => (
            <div key={idx} className="relative group">
              {media.type === 'image' && (
                <div 
                  className="w-16 h-16 bg-gray-100 rounded border cursor-pointer overflow-hidden hover:shadow-md transition-shadow"
                  onClick={() => onOpenMediaViewer(media.id)}
                >
                  <img 
                    src={media.url} 
                    alt={media.description || "Media"} 
                    className="w-full h-full object-cover rounded"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      (e.target as HTMLImageElement).parentElement!.innerHTML = 
                        '<div class="w-full h-full flex items-center justify-center bg-gray-100"><div class="h-6 w-6 text-gray-400">🖼️</div></div>';
                    }}
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity flex items-center justify-center">
                    <ZoomIn className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              )}
              {media.type === 'video' && (
                <div 
                  className="w-16 h-16 bg-gray-900 rounded border flex items-center justify-center cursor-pointer relative overflow-hidden hover:shadow-md transition-shadow"
                  onClick={() => onOpenMediaViewer(media.id)}
                >
                  <video src={media.url} className="w-full h-full object-cover" muted />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Play className="h-6 w-6 text-white opacity-80" />
                  </div>
                </div>
              )}
              {media.type === 'pdf' && (
                <a 
                  href={media.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-16 h-16 bg-red-50 rounded border flex items-center justify-center cursor-pointer hover:shadow-md transition-shadow"
                  title={media.description}
                >
                  <File className="h-6 w-6 text-red-600" />
                </a>
              )}
            </div>
          ))}
          {allMedia.length > 8 && (
            <div 
              className="w-16 h-16 bg-gray-100 rounded border flex items-center justify-center text-xs cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => {
                const firstImageId = allMedia.find(m => m.type === 'image')?.id;
                if (firstImageId) {
                  onOpenMediaViewer(firstImageId);
                }
              }}
            >
              +{allMedia.length - 8}
            </div>
          )}
        </div>
      </div>
    );
  };

  const WorkEntryCard = ({ entry, quote }: { entry: WorkEntry; quote: QuoteData }) => (
    <Card className="mb-3 border-l-4 border-l-blue-500">
      <CardHeader className="py-3">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-sm font-medium">{entry.description}</CardTitle>
            <div className="flex items-center mt-1 text-xs text-muted-foreground">
              <User className="h-3 w-3 mr-1" />
              <span>{entry.technician}</span>
              <Separator orientation="vertical" className="mx-2 h-3" />
              <Calendar className="h-3 w-3 mr-1" />
              <span>{formatDate(entry.entry_date_time)}</span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {entry.completed ? (
              <Badge variant="default" className="bg-green-100 text-green-800">
                <CheckCircle className="h-3 w-3 mr-1" />
                Completed
              </Badge>
            ) : (
              <Badge variant="secondary">
                <Clock className="h-3 w-3 mr-1" />
                Pending
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="py-3">
        {/* Cost Breakdown */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div className="text-center p-2 bg-blue-50 rounded">
            <p className="text-xs text-muted-foreground">Parts</p>
            <p className="text-sm font-semibold">{formatCurrency(entry.parts_cost)}</p>
          </div>
          <div className="text-center p-2 bg-green-50 rounded">
            <p className="text-xs text-muted-foreground">Labor</p>
            <p className="text-sm font-semibold">{formatCurrency(entry.labor_cost)}</p>
          </div>
          <div className="text-center p-2 bg-orange-50 rounded">
            <p className="text-xs text-muted-foreground">GST</p>
            <p className="text-sm font-semibold">{formatCurrency(entry.gst)}</p>
          </div>
          <div className="text-center p-2 bg-purple-50 rounded">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-sm font-semibold">{formatCurrency(entry.parts_cost + entry.labor_cost + entry.gst)}</p>
          </div>
        </div>

        {/* Quality Check */}
        {entry.quality_check && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center mb-2">
              <Shield className="h-4 w-4 text-green-600 mr-2" />
              <span className="text-sm font-medium">Quality Assurance</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className={`flex items-center ${entry.quality_check.visual_inspection ? 'text-green-600' : 'text-red-600'}`}>
                <CheckCircle className="h-3 w-3 mr-1" />
                Visual Inspection
              </div>
              <div className={`flex items-center ${entry.quality_check.functional_test ? 'text-green-600' : 'text-red-600'}`}>
                <CheckCircle className="h-3 w-3 mr-1" />
                Functional Test
              </div>
              <div className={`flex items-center ${entry.quality_check.road_test ? 'text-green-600' : 'text-red-600'}`}>
                <CheckCircle className="h-3 w-3 mr-1" />
                Road Test
              </div>
              <div className={`flex items-center ${entry.quality_check.safety_check ? 'text-green-600' : 'text-red-600'}`}>
                <CheckCircle className="h-3 w-3 mr-1" />
                Safety Check
              </div>
            </div>
            {entry.quality_check.notes && (
              <p className="text-xs text-muted-foreground mt-2">{entry.quality_check.notes}</p>
            )}
          </div>
        )}

        {/* Personnel */}
        {entry.persons && entry.persons.length > 0 && (
          <div className="mb-4">
            <span className="text-sm font-medium text-muted-foreground">Personnel:</span>
            <div className="flex flex-wrap gap-2 mt-1">
              {entry.persons.map((person, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {person.name} - {person.role}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Warranties */}
        {entry.warranties && entry.warranties.length > 0 && (
          <div className="mb-4 p-3 bg-yellow-50 rounded-lg">
            <div className="flex items-center mb-2">
              <Shield className="h-4 w-4 text-yellow-600 mr-2" />
              <span className="text-sm font-medium">Warranties</span>
            </div>
            {entry.warranties.map((warranty, idx) => (
              <div key={idx} className="text-xs mb-1">
                <strong>{warranty.part}</strong> - {warranty.months} months by {warranty.supplier}
              </div>
            ))}
          </div>
        )}

        {/* Comments */}
        {entry.comments && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center mb-1">
              <FileText className="h-4 w-4 text-blue-600 mr-2" />
              <span className="text-sm font-medium">Comments</span>
            </div>
            <p className="text-sm text-gray-700">{entry.comments}</p>
          </div>
        )}

        {/* Media Gallery */}
        <MediaGallery 
          images={[
            ...(entry.images || []),
            ...(entry.invoices || []).map(inv => ({ url: inv.url, _id: inv._id, description: inv.description }))
          ]}
          videos={entry.videos || []}
          pdfs={[
            ...(entry.pdfs || []),
            ...(entry.warranties || []).filter(w => w.document).map(w => ({ 
              url: w.document.url, 
              _id: w._id, 
              description: w.document.description 
            })),
            ...(entry.documents || [])
          ]}
          fieldId={quote.field_id}
          workEntryId={entry.id}
        />
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {Object.entries(groupQuotesBySection(report.quotes_data)).map(([category, sections]) => (
        <div key={category} className="space-y-4">
          <div className="flex items-center space-x-2">
            <Wrench className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold">{category}</h2>
            <Badge variant="outline">{Object.values(sections).flat().length} items</Badge>
          </div>
          
          {Object.entries(sections).map(([section, quotes]) => (
            <Accordion key={section} type="multiple" className="space-y-2">
              <AccordionItem value={section} className="border rounded-lg">
                <AccordionTrigger className="px-4 py-3 hover:no-underline">
                  <div className="flex items-center justify-between w-full">
                    <span className="text-sm font-medium">{section}</span>
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary">{quotes.length} items</Badge>
                      <Badge variant="outline">
                        {formatCurrency(quotes.reduce((sum, q) => sum + (q.work_details?.total_amount || q.quote_amount), 0))}
                      </Badge>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  {quotes.map((quote) => (
                    <Card key={quote.field_id} className="mb-4 bg-gray-50">
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <CardTitle className="text-base">{quote.field_name}</CardTitle>
                            <p className="text-sm text-muted-foreground mt-1">{quote.quote_description}</p>
                          </div>
                          <div className="text-right">
                            <Badge variant="outline" className="mb-2">
                              Quote: {formatCurrency(quote.quote_amount)}
                            </Badge>
                            {quote.work_details?.submitted_at && (
                              <div>
                                <Badge variant="default">
                                  Final: {formatCurrency(quote.work_details.total_amount)}
                                </Badge>
                                {quote.work_details.quote_difference !== 0 && (
                                  <p className={`text-xs mt-1 ${quote.work_details.quote_difference > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                    {quote.work_details.quote_difference > 0 ? '+' : ''}{formatCurrency(quote.work_details.quote_difference)} vs quote
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        {/* Supplier Info */}
                        <div className="flex items-center justify-between mb-4 p-3 bg-white rounded-lg border">
                          <div>
                            <p className="text-sm font-medium">{quote.approved_supplier?.supplier_name || "No supplier assigned"}</p>
                            <p className="text-xs text-muted-foreground">{quote.approved_supplier?.supplier_shop_name}</p>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center text-sm">
                              {quote.work_details?.submitted_at ? (
                                <>
                                  <CheckCircle className="h-4 w-4 text-green-600 mr-1" />
                                  <span className="text-green-600">Completed</span>
                                </>
                              ) : (
                                <>
                                  <Clock className="h-4 w-4 text-yellow-600 mr-1" />
                                  <span className="text-yellow-600">In Progress</span>
                                </>
                              )}
                            </div>
                            {quote.work_started_at && (
                              <p className="text-xs text-muted-foreground">Started: {formatDate(quote.work_started_at)}</p>
                            )}
                          </div>
                        </div>

                        {/* Work Entries */}
                        {quote.work_details?.work_entries && quote.work_details.work_entries.length > 0 && (
                          <div className="space-y-3">
                            <div className="flex items-center space-x-2">
                              <FileText className="h-4 w-4 text-gray-600" />
                              <span className="text-sm font-medium">Work Entries ({quote.work_details.work_entries.length})</span>
                            </div>
                            {quote.work_details.work_entries.map((entry) => (
                              <WorkEntryCard key={entry.id} entry={entry} quote={quote} />
                            ))}
                          </div>
                        )}

                        {/* Maintenance Recommendations */}
                        {quote.work_details?.maintenance_recommendations && (
                          <div className="mt-4 p-3 bg-yellow-50 rounded-lg border-l-4 border-l-yellow-400">
                            <div className="flex items-center mb-1">
                              <AlertTriangle className="h-4 w-4 text-yellow-600 mr-2" />
                              <span className="text-sm font-medium">Maintenance Recommendations</span>
                            </div>
                            <p className="text-sm text-gray-700">{quote.work_details.maintenance_recommendations}</p>
                            {quote.work_details.next_service_due && (
                              <p className="text-xs text-muted-foreground mt-2">
                                Next service due: {formatDate(quote.work_details.next_service_due)}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Comments */}
                        {quote.work_details?.supplier_comments && (
                          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                            <div className="flex items-center mb-1">
                              <FileText className="h-4 w-4 text-blue-600 mr-2" />
                              <span className="text-sm font-medium">Supplier Comments</span>
                            </div>
                            <p className="text-sm text-gray-700">{quote.work_details.supplier_comments}</p>
                          </div>
                        )}

                        {/* Field Images and Videos */}
                        <MediaGallery 
                          images={quote.field_images.map(url => ({ url }))}
                          videos={quote.field_videos.map(url => ({ url }))}
                          pdfs={[]}
                          fieldId={quote.field_id}
                        />
                      </CardContent>
                    </Card>
                  ))}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          ))}
        </div>
      ))}
    </div>
  );
};

export default WorkDetailsTab;