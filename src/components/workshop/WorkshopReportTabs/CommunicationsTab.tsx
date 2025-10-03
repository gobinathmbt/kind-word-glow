import React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  MessageCircle,
  File,
  Image as ImageIcon,
  Clock,
  User,
  Building2,
} from "lucide-react";
import { Communication, Message } from "../WorkshopReportModal";

interface CommunicationsTabProps {
  communications: Communication[];
  onOpenMediaViewer: (mediaId: string) => void;
}

const CommunicationsTab: React.FC<CommunicationsTabProps> = ({
  communications,
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

  const getMessageIcon = (messageType: string) => {
    switch (messageType) {
      case 'image':
        return <ImageIcon className="h-4 w-4" />;
      case 'file':
        return <File className="h-4 w-4" />;
      default:
        return <MessageCircle className="h-4 w-4" />;
    }
  };

  const MessageBubble = ({ message, commId, msgIndex }: { 
    message: Message; 
    commId: string; 
    msgIndex: number; 
  }) => {
    const isCompany = message.sender_type === 'company';
    
    return (
      <div className={`flex ${isCompany ? 'justify-end' : 'justify-start'} mb-3`}>
        <div className={`max-w-xs sm:max-w-md lg:max-w-lg ${isCompany ? 'order-2' : 'order-1'}`}>
          <div className={`p-3 rounded-lg shadow-sm ${
            isCompany 
              ? 'bg-blue-500 text-white ml-auto' 
              : 'bg-white border border-gray-200'
          }`}>
            {/* Sender info */}
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center space-x-1">
                {isCompany ? (
                  <Building2 className="h-3 w-3 opacity-70" />
                ) : (
                  <User className="h-3 w-3 opacity-70" />
                )}
                <span className="text-xs font-medium opacity-90">
                  {message.sender_name}
                </span>
              </div>
              <div className="flex items-center space-x-1">
                {getMessageIcon(message.message_type)}
                <Clock className="h-3 w-3 opacity-70" />
              </div>
            </div>

            {/* Message content */}
            {message.message_type === 'text' ? (
              <p className="text-sm leading-relaxed">{message.content}</p>
            ) : message.message_type === 'image' && message.file_url ? (
              <div className="space-y-2">
                <p className="text-xs opacity-90">{message.content}</p>
                <div 
                  className="cursor-pointer rounded overflow-hidden hover:opacity-90 transition-opacity"
                  onClick={() => onOpenMediaViewer(`comm-${commId}-${msgIndex}`)}
                >
                  <img 
                    src={message.file_url} 
                    alt="Message attachment" 
                    className="w-full max-w-xs h-32 sm:h-40 object-cover rounded"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      (e.target as HTMLImageElement).parentElement!.innerHTML = 
                        '<div class="w-full h-32 flex items-center justify-center bg-gray-100 rounded text-gray-500 text-xs">Failed to load image</div>';
                    }}
                  />
                </div>
              </div>
            ) : message.message_type === 'file' && message.file_url ? (
              <div className="space-y-2">
                <div className={`flex items-center p-2 rounded ${
                  isCompany ? 'bg-white/10' : 'bg-gray-50'
                }`}>
                  <File className="h-4 w-4 mr-2 opacity-70" />
                  <div className="flex-1 min-w-0">
                    <a 
                      href={message.file_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className={`text-sm hover:underline truncate block ${
                        isCompany ? 'text-white' : 'text-blue-600'
                      }`}
                      title={message.content}
                    >
                      {message.content}
                    </a>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm opacity-90">{message.content}</p>
            )}

            {/* Timestamp */}
            <div className={`text-xs opacity-60 mt-1 ${isCompany ? 'text-right' : 'text-left'}`}>
              {formatDate(message.file_url ? new Date().toISOString() : new Date().toISOString())}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (!communications || communications.length === 0) {
    return (
      <div className="text-center py-12">
        <MessageCircle className="h-16 w-16 mx-auto mb-4 text-gray-300" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Communications</h3>
        <p className="text-gray-500">No communications have been recorded for this workshop report.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <MessageCircle className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-semibold">Communications</h2>
        </div>
        <Badge variant="outline">
          {communications.length} conversation{communications.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      <Accordion type="multiple" className="space-y-3">
        {communications.map((comm) => (
          <AccordionItem 
            key={comm.conversation_id} 
            value={comm.conversation_id}
            className="border rounded-lg"
          >
            <AccordionTrigger className="px-4 py-3 hover:no-underline">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <MessageCircle className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-sm font-medium">{comm.field_name}</h3>
                    <p className="text-xs text-muted-foreground">
                      Last message: {formatDate(comm.last_message_at)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary" className="text-xs">
                    {comm.total_messages} messages
                  </Badge>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <Card className="border-0 shadow-none bg-gray-50">
                <CardContent className="p-4 max-h-96 overflow-y-auto">
                  {comm.messages && comm.messages.length > 0 ? (
                    <div className="space-y-1">
                      {comm.messages.map((message, msgIndex) => (
                        <MessageBubble
                          key={msgIndex}
                          message={message}
                          commId={comm.conversation_id}
                          msgIndex={msgIndex}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No messages in this conversation</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
};

export default CommunicationsTab;