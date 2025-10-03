import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DollarSign,
  MessageSquare,
  FileText,
  Eye,
  Settings,
  X,
  ZoomIn,
  Video,
} from "lucide-react";

interface WorkshopFieldCardProps {
  field: any;
  categoryId: string | null;
  sectionId: string;
  getStatus: (fieldId: string) => string | null;
  getQuote: (fieldId: string) => any;
  getBadgeColor: (status: string | undefined) => string;
  getFieldBorderColor: (field: any) => string;
  onSendQuote: (field: any, categoryId: string | null, sectionId: string) => void;
  onReceivedQuotes: (field: any, categoryId: string | null, sectionId: string) => void;
  onMessaging: (field: any, categoryId: string | null, sectionId: string) => void;
  onFinalWork: (field: any, categoryId: string | null, sectionId: string) => void;
  onViewWork: (field: any, categoryId: string | null, sectionId: string) => void;
  onEditField: (field: any, categoryId: string | null, sectionId: string) => void;
  onDeleteField: (field: any, categoryId: string | null, sectionId: string) => void;
  onOpenMediaViewer: (field: any, selectedMediaId: string) => void;
  isWorkshopField: boolean;
}

const WorkshopFieldCard: React.FC<WorkshopFieldCardProps> = ({
  field,
  categoryId,
  sectionId,
  getStatus,
  getQuote,
  getBadgeColor,
  getFieldBorderColor,
  onSendQuote,
  onReceivedQuotes,
  onMessaging,
  onFinalWork,
  onViewWork,
  onEditField,
  onDeleteField,
  onOpenMediaViewer,
  isWorkshopField,
}) => {
  const quote = getQuote(field.field_id);
  const hasQuote = !!quote;
  const quoteApproved = quote?.supplier_responses.some(
    (q: any) => q.status === "approved"
  );
  const hasWorkSubmitted = quote?.status === "work_review";
  const hasCompletedWork = quote?.status === "completed_jobs";

  return (
    <div className={`rounded-lg p-4 ${getFieldBorderColor(field)}`}>
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-medium">{field.field_name}</h4>
        <div className="flex items-center gap-2">
          <Badge className={getBadgeColor(getStatus(field.field_id))}>
            {getStatus(field.field_id) || "Not Progressed"}
          </Badge>

          {isWorkshopField && (
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onEditField(field, categoryId, sectionId)}
              >
                <Settings className="h-3 w-3 mr-1" />
                Edit
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => onDeleteField(field, categoryId, sectionId)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}

          {!quoteApproved && (
            <>
              <Button
                size="sm"
                onClick={() => onSendQuote(field, categoryId, sectionId)}
              >
                <DollarSign className="h-3 w-3 mr-1" />
                {hasQuote ? "Update Quote" : "Request For Quote"}
              </Button>
              <Button
                size="sm"
                onClick={() => {/* TODO: Open bay booking dialog */}}
              >
                Request For Bay
              </Button>
            </>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={() => onReceivedQuotes(field, categoryId, sectionId)}
          >
            <Eye className="h-3 w-3 mr-1" />
            Received Quotes
          </Button>

          {hasWorkSubmitted && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onViewWork(field, categoryId, sectionId)}
            >
              <FileText className="h-3 w-3 mr-1" />
              View Work
            </Button>
          )}

          {hasCompletedWork && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onFinalWork(field, categoryId, sectionId)}
            >
              <FileText className="h-3 w-3 mr-1" />
              Final Work
            </Button>
          )}

          {quoteApproved && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onMessaging(field, categoryId, sectionId)}
            >
              <MessageSquare className="h-3 w-3 mr-1" />
              Message
            </Button>
          )}
        </div>
      </div>

      {field.field_value && (
        <div className="text-sm text-muted-foreground mb-2">
          Value:{" "}
          {typeof field.field_value === "object"
            ? JSON.stringify(field.field_value)
            : field.field_value}
        </div>
      )}

      {(field.images?.length > 0 || field.videos?.length > 0) && (
        <div className="grid grid-cols-6 gap-2 mt-2">
          {field.images?.map((image: string, imgIndex: number) => {
            const mediaId = `${field.field_id}-image-${imgIndex}`;
            return (
              <div
                key={imgIndex}
                className="relative group cursor-pointer"
                onClick={() => onOpenMediaViewer(field, mediaId)}
              >
                <img
                  src={image}
                  alt={`${field.field_name} image ${imgIndex + 1}`}
                  className="w-full h-20 object-cover rounded transition-all duration-200 group-hover:opacity-80 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded transition-all duration-200 flex items-center justify-center">
                  <div className="w-8 h-8 bg-white/90 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <ZoomIn className="w-4 h-4 text-gray-700" />
                  </div>
                </div>
              </div>
            );
          })}

          {field.videos?.map((video: string, vidIndex: number) => {
            const mediaId = `${field.field_id}-video-${vidIndex}`;
            return (
              <div
                key={vidIndex}
                className="relative group cursor-pointer"
                onClick={() => onOpenMediaViewer(field, mediaId)}
              >
                <video
                  src={video}
                  className="w-full h-20 object-cover rounded transition-all duration-200 group-hover:opacity-80 group-hover:scale-105"
                >
                  Your browser does not support the video tag.
                </video>
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded transition-all duration-200 flex items-center justify-center">
                  <div className="w-8 h-8 bg-white/90 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <Video className="w-4 h-4 text-gray-700" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default WorkshopFieldCard;
