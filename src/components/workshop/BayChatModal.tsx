import React, { useState, useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Send,
  Image,
  Video,
  File,
  X,
  Download,
  Smile,
} from "lucide-react";
import { toast } from "sonner";
import { bayChatService } from "@/lib/bayChat";
import EmojiPicker from "emoji-picker-react";
import { formatDistanceToNow, format } from "date-fns";
import { S3Uploader } from "@/lib/s3-client";
import { companyServices } from "@/api/services";

interface BayChatModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: any;
}

const BayChatModal: React.FC<BayChatModalProps> = ({ open, onOpenChange, booking }) => {
  const [newMessage, setNewMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [typing, setTyping] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState<string>("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [userStatus, setUserStatus] = useState<{
    online: boolean;
    lastSeen: Date;
  } | null>(null);
  const [conversation, setConversation] = useState<any>(null);
  const [loadingConversation, setLoadingConversation] = useState(true);
  const [s3Uploader, setS3Uploader] = useState<S3Uploader | null>(null);

  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  const currentUser = JSON.parse(sessionStorage.getItem("user") || "{}");
  const currentUserType = currentUser.role === "company_admin" || currentUser.role === "company_super_admin" ? "company" : "bay_user";

  const bookingId = booking?._id;
  const companyId = booking?.company_id?._id || booking?.company_id;
  const bayUserId = booking?.accepted_by?._id || booking?.accepted_by;
  
  const otherUser = currentUserType === "company" ? booking?.accepted_by : booking?.created_by;

  // Load S3 configuration
  useEffect(() => {
    const loadS3Config = async () => {
      try {
        const response = await companyServices.getS3Config();
        const config = response.data.data;

        if (config && config.bucket && config.access_key) {
          const s3Config = {
            region: config.region,
            bucket: config.bucket,
            access_key: config.access_key,
            secret_key: config.secret_key,
            url: config.url,
          };
          setS3Uploader(new S3Uploader(s3Config));
        }
      } catch (error) {
        console.error("Failed to load S3 config:", error);
      }
    };

    if (open) {
      loadS3Config();
    }
  }, [open]);

  // Socket connection and event handlers
  useEffect(() => {
    if (open && bookingId) {
      const connectSocket = async () => {
        try {
          await bayChatService.connect();

          setLoadingConversation(true);
          bayChatService.getConversation(bookingId, bayUserId, companyId);
          bayChatService.joinConversation(bookingId, bayUserId, companyId);
          bayChatService.getUserStatus("bay_user", bayUserId);

          bayChatService.onConversationData((data) =>
            handleConversationDataRef.current(data)
          );
          bayChatService.onNewMessage((data) =>
            handleNewMessageRef.current(data)
          );
          bayChatService.onUserTyping((data) => handleTypingRef.current(data));
          bayChatService.onUserStatusChange((data) =>
            handleUserStatusChangeRef.current(data)
          );
          bayChatService.onUserStatus((data) =>
            handleUserStatusRef.current(data)
          );
          bayChatService.onError((error) => handleSocketErrorRef.current(error));
        } catch (error) {
          console.error("Socket connection error:", error);
          toast.error("Failed to connect to chat");
          setLoadingConversation(false);
        }
      };

      connectSocket();

      return () => {
        if (bookingId) {
          bayChatService.off("conversation_data");
          bayChatService.off("new_message");
          bayChatService.off("user_typing");
          bayChatService.off("user_status_change");
          bayChatService.off("user_status");
          bayChatService.off("error");
          bayChatService.leaveConversation(bookingId);
        }
      };
    }
  }, [open, bookingId, companyId, bayUserId]);

  const handleConversationData = useCallback((data: any) => {
    setConversation(data.conversation);
    setLoadingConversation(false);
    scrollToBottom();
  }, []);

  const handleNewMessage = useCallback((data: any) => {
    setConversation((prev: any) => {
      if (!prev) return prev;
      return {
        ...prev,
        messages: [...prev.messages, data.message],
      };
    });
    scrollToBottom();
  }, []);

  const handleTyping = useCallback(
    (data: any) => {
      if (data.user_id !== currentUser._id) {
        setIsTyping(data.typing);
        setTypingUser(data.user_name);
        if (data.typing) {
          setTimeout(() => setIsTyping(false), 3000);
        }
      }
    },
    [currentUser._id]
  );

  const handleUserStatusChange = useCallback(
    (data: any) => {
      if (data.user_id === otherUser?._id) {
        setUserStatus({
          online: data.online,
          lastSeen: new Date(data.last_seen),
        });
      }
    },
    [otherUser?._id]
  );

  const handleUserStatus = useCallback(
    (data: any) => {
      if (data.user_id === otherUser?._id) {
        setUserStatus({
          online: data.online,
          lastSeen: new Date(data.last_seen),
        });
      }
    },
    [otherUser?._id]
  );

  const handleSocketError = useCallback((error: any) => {
    toast.error(error.message || "Socket error occurred");
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversation?.messages, isTyping]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewMessage(e.target.value);

    if (!typing) {
      bayChatService.startTyping(bookingId);
      setTyping(true);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      bayChatService.stopTyping(bookingId);
      setTyping(false);
    }, 1000);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB");
      return;
    }

    setSelectedFile(file);

    if (file.type.startsWith("image/") || file.type.startsWith("video/")) {
      const reader = new FileReader();
      reader.onload = (e) => setFilePreview(e.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleEmojiSelect = (emoji: any) => {
    setNewMessage((prev) => prev + emoji.emoji);
    setShowEmojiPicker(false);
    textareaRef.current?.focus();
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() && !selectedFile) {
      toast.error("Please enter a message or select a file");
      return;
    }

    try {
      setUploading(true);

      let messageType = "text";
      let fileData = null;

      if (selectedFile && s3Uploader) {
        if (selectedFile.type.startsWith("image/")) {
          messageType = "image";
        } else if (selectedFile.type.startsWith("video/")) {
          messageType = "video";
        } else {
          messageType = "file";
        }

        const uploadResult = await s3Uploader.uploadFile(
          selectedFile,
          messageType === "image"
            ? "bay-chat-images"
            : messageType === "video"
            ? "bay-chat-videos"
            : "bay-chat-files"
        );

        fileData = {
          name: selectedFile.name,
          type: selectedFile.type,
          size: selectedFile.size,
          url: uploadResult.url,
          key: uploadResult.key,
        };
      }

      bayChatService.sendMessage(bookingId, newMessage, messageType, fileData);

      setNewMessage("");
      removeSelectedFile();
      bayChatService.stopTyping(bookingId);
      setTyping(false);
    } catch (error) {
      toast.error("Failed to send message");
      console.error("Send message error:", error);
    } finally {
      setUploading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const downloadFile = (url: string, filename: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const renderMessageContent = (message: any) => {
    switch (message.message_type) {
      case "image":
        return (
          <div className="space-y-2">
            <img
              src={message.file_url}
              alt="Shared image"
              className="max-w-sm rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => window.open(message.file_url, "_blank")}
            />
            {message.content && <p className="text-sm">{message.content}</p>}
          </div>
        );

      case "video":
        return (
          <div className="space-y-2">
            <video
              src={message.file_url}
              controls
              className="max-w-sm rounded-lg"
            />
            {message.content && <p className="text-sm">{message.content}</p>}
          </div>
        );

      case "file":
        return (
          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
            <File className="h-6 w-6 text-blue-500" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{message.content}</p>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(message.file_size)} • {message.file_type}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => downloadFile(message.file_url, message.content)}
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        );

      default:
        return <p className="text-sm whitespace-pre-wrap">{message.content}</p>;
    }
  };

  const messages = conversation?.messages || [];

  const handleConversationDataRef = useRef(handleConversationData);
  const handleNewMessageRef = useRef(handleNewMessage);
  const handleTypingRef = useRef(handleTyping);
  const handleUserStatusChangeRef = useRef(handleUserStatusChange);
  const handleUserStatusRef = useRef(handleUserStatus);
  const handleSocketErrorRef = useRef(handleSocketError);

  useEffect(() => {
    handleConversationDataRef.current = handleConversationData;
    handleNewMessageRef.current = handleNewMessage;
    handleTypingRef.current = handleTyping;
    handleUserStatusChangeRef.current = handleUserStatusChange;
    handleUserStatusRef.current = handleUserStatus;
    handleSocketErrorRef.current = handleSocketError;
  }, [
    handleConversationData,
    handleNewMessage,
    handleTyping,
    handleUserStatusChange,
    handleUserStatus,
    handleSocketError,
  ]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-3">
              <div className="relative">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={otherUser?.avatar} />
                  <AvatarFallback>
                    {otherUser?.first_name?.charAt(0) || otherUser?.name?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <div
                  className={`absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-background ${
                    userStatus?.online ? "bg-green-500" : "bg-gray-400"
                  }`}
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">
                    {otherUser?.first_name && otherUser?.last_name
                      ? `${otherUser.first_name} ${otherUser.last_name}`
                      : otherUser?.name || "Bay User"}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {userStatus?.online
                      ? "Online"
                      : `Last seen ${formatDistanceToNow(
                          userStatus?.lastSeen || new Date()
                        )} ago`}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {booking?.field_name} • Stock #{booking?.vehicle_stock_id}
                </p>
              </div>
            </DialogTitle>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6">
          {loadingConversation ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  No messages yet. Start the conversation!
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              {messages.map((message: any, index: number) => {
                const isCurrentUser =
                  message.sender_type === currentUserType &&
                  message.sender_id === currentUser._id;

                return (
                  <div
                    key={index}
                    className={`flex ${
                      isCurrentUser ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[70%] ${
                        isCurrentUser ? "items-end" : "items-start"
                      }`}
                    >
                      <div
                        className={`rounded-lg p-3 ${
                          isCurrentUser
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        {renderMessageContent(message)}
                      </div>
                      <div className="flex items-center gap-2 mt-1 px-1">
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(message.created_at), "p")}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {isTyping && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-current rounded-full animate-bounce" />
                    <span className="w-2 h-2 bg-current rounded-full animate-bounce [animation-delay:0.2s]" />
                    <span className="w-2 h-2 bg-current rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                  <span>{typingUser} is typing...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        <div className="p-4 border-t space-y-3">
          {selectedFile && (
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {filePreview ? (
                      selectedFile.type.startsWith("image/") ? (
                        <img
                          src={filePreview}
                          alt="Preview"
                          className="h-12 w-12 object-cover rounded"
                        />
                      ) : (
                        <video
                          src={filePreview}
                          className="h-12 w-12 object-cover rounded"
                        />
                      )
                    ) : (
                      <File className="h-8 w-8 text-blue-500" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {selectedFile.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(selectedFile.size)}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={removeSelectedFile}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex items-end gap-2">
            <div className="flex-1 relative">
              <Textarea
                ref={textareaRef}
                value={newMessage}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Type your message..."
                className="resize-none pr-20"
                rows={2}
              />
              <div className="absolute bottom-2 right-2 flex gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                >
                  <Smile className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Image className="h-4 w-4" />
                </Button>
              </div>
              {showEmojiPicker && (
                <div className="absolute bottom-full right-0 mb-2 z-50">
                  <EmojiPicker onEmojiClick={handleEmojiSelect} />
                </div>
              )}
            </div>
            <Button
              onClick={handleSendMessage}
              disabled={uploading || (!newMessage.trim() && !selectedFile)}
              size="lg"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            className="hidden"
            accept="image/*,video/*,.pdf,.doc,.docx"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BayChatModal;
