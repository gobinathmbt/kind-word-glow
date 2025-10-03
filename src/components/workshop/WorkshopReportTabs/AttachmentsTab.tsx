import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  File,
  Download,
  Image as ImageIcon,
  Video,
  FileText,
  Shield,
  Wrench,
  ZoomIn,
  Play,
  Calendar,
} from "lucide-react";
import { Attachment } from "../WorkshopReportModal";

interface AttachmentsTabProps {
  attachments: Attachment[];
  onOpenMediaViewer: (mediaId: string) => void;
}

const AttachmentsTab: React.FC<AttachmentsTabProps> = ({
  attachments,
  onOpenMediaViewer,
}) => {
  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getAttachmentIcon = (type: string) => {
    if (type.includes('image')) return <ImageIcon className="h-5 w-5 text-blue-600" />;
    if (type.includes('video')) return <Video className="h-5 w-5 text-purple-600" />;
    if (type.includes('pdf') || type.includes('invoice')) return <FileText className="h-5 w-5 text-red-600" />;
    if (type.includes('warranty')) return <Shield className="h-5 w-5 text-green-600" />;
    if (type.includes('work')) return <Wrench className="h-5 w-5 text-orange-600" />;
    return <File className="h-5 w-5 text-gray-600" />;
  };

  const getAttachmentTypeBadge = (type: string) => {
    if (type.includes('image')) return { text: 'Image', variant: 'default' as const };
    if (type.includes('video')) return { text: 'Video', variant: 'secondary' as const };
    if (type.includes('invoice')) return { text: 'Invoice', variant: 'destructive' as const };
    if (type.includes('warranty')) return { text: 'Warranty', variant: 'outline' as const };
    if (type.includes('pdf')) return { text: 'PDF', variant: 'destructive' as const };
    return { text: 'Document', variant: 'secondary' as const };
  };

  const groupAttachmentsByType = (attachments: Attachment[]) => {
    const grouped: { [key: string]: Attachment[] } = {};
    
    attachments.forEach(attachment => {
      const category = attachment.type.includes('image') ? 'Images' :
                     attachment.type.includes('video') ? 'Videos' :
                     attachment.type.includes('invoice') ? 'Invoices' :
                     attachment.type.includes('warranty') ? 'Warranties' :
                     attachment.type.includes('pdf') ? 'Documents' :
                     'Other';
      
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(attachment);
    });
    
    return grouped;
  };

  const handleDownload = async (attachment: Attachment) => {
    try {
      const response = await fetch(attachment.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = attachment.filename || `attachment-${attachment._id}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const AttachmentCard = ({ attachment }: { attachment: Attachment }) => {
    const typeBadge = getAttachmentTypeBadge(attachment.type);
    const isImage = attachment.type.includes('image');
    const isVideo = attachment.type.includes('video');
    const isViewable = isImage || isVideo;

    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            {/* Thumbnail or Icon */}
            <div className="flex-shrink-0">
              {isImage ? (
                <div 
                  className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden cursor-pointer border"
                  onClick={() => isViewable && onOpenMediaViewer(`attachment-${attachment._id}`)}
                >
                  <img 
                    src={attachment.url} 
                    alt={attachment.filename || 'Attachment'}
                    className="w-full h-full object-cover hover:scale-105 transition-transform"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      (e.target as HTMLImageElement).parentElement!.innerHTML = 
                        '<div class="w-full h-full flex items-center justify-center bg-gray-200 rounded"><div class="h-6 w-6 text-gray-400">🖼️</div></div>';
                    }}
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 transition-opacity flex items-center justify-center">
                    <ZoomIn className="h-4 w-4 text-white opacity-0 hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              ) : isVideo ? (
                <div 
                  className="w-16 h-16 bg-gray-900 rounded-lg flex items-center justify-center cursor-pointer border"
                  onClick={() => isViewable && onOpenMediaViewer(`attachment-${attachment._id}`)}
                >
                  <Play className="h-8 w-8 text-white opacity-80" />
                </div>
              ) : (
                <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center border">
                  {getAttachmentIcon(attachment.type)}
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium truncate">
                  {attachment.filename || attachment.description || 'Unnamed attachment'}
                </h3>
                <Badge {...typeBadge}>
                  {typeBadge.text}
                </Badge>
              </div>

              {attachment.description && attachment.description !== attachment.filename && (
                <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                  {attachment.description}
                </p>
              )}

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-3 w-3" />
                  <span>{formatDate(attachment.uploaded_at)}</span>
                </div>
                
                <div className="flex items-center space-x-2">
                  {isViewable && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => onOpenMediaViewer(`attachment-${attachment._id}`)}
                    >
                      <ZoomIn className="h-3 w-3 mr-1" />
                      View
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => handleDownload(attachment)}
                  >
                    <Download className="h-3 w-3 mr-1" />
                    Download
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (!attachments || attachments.length === 0) {
    return (
      <div className="text-center py-12">
        <File className="h-16 w-16 mx-auto mb-4 text-gray-300" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Attachments</h3>
        <p className="text-gray-500">No attachments have been uploaded for this workshop report.</p>
      </div>
    );
  }

  const groupedAttachments = groupAttachmentsByType(attachments);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <File className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-semibold">Attachments</h2>
        </div>
        <Badge variant="outline">
          {attachments.length} file{attachments.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      {/* Attachment Categories */}
      {Object.entries(groupedAttachments).map(([category, categoryAttachments]) => (
        <div key={category} className="space-y-3">
          <div className="flex items-center space-x-2">
            <h3 className="text-base font-medium">{category}</h3>
            <Badge variant="secondary">{categoryAttachments.length}</Badge>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {categoryAttachments.map((attachment) => (
              <AttachmentCard key={attachment._id} attachment={attachment} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default AttachmentsTab;