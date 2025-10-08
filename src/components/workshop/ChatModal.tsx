import React, { useState, useEffect, useRef, useCallback } from "react";
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
  Paperclip,
  X,
  Download,
  Clock,
  CheckCheck,
  MessageSquare,
  Smile,
} from "lucide-react";
import { toast } from "sonner";
import { socketService } from "@/lib/socket";
import EmojiPicker from "emoji-picker-react";
import { formatDistanceToNow, format } from "date-fns";
import { S3Uploader } from "@/lib/s3-client";
import { companyServices, supplierDashboardServices } from "@/api/services";

interface ChatModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quote: any;
}

const ChatModal: React.FC<ChatModalProps> = ({ open, onOpenChange, quote }) => {
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
  const [isBayQuote, setIsBayQuote] = useState(false);
  const [canSendMessage, setCanSendMessage] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  const currentUser = JSON.parse(
    sessionStorage.getItem("user") ||
      sessionStorage.getItem("supplier_user") ||
      "{}"
  );
  const supplier_user = sessionStorage.getItem("supplier_user");

  const currentUserType =
    currentUser.role === "supplier"
      ? "supplier"
      : currentUser.role === "company_admin"
      ? "bay_user"
      : "company";

  const quoteType = quote?.quote_type || "supplier";
  const isQuoteBay = quoteType === "bay";

  let otherUser: any = null;
  let quoteId: string = "";
  let companyId: string = "";
  let supplierId: string = "";
  let bayUserId: string = "";

  if (isQuoteBay) {

    quoteId = quote._id;
    companyId = quote.company_id?._id || quote.company_id;
    bayUserId = quote.bay_user_id?._id || quote.bay_user_id;
    supplierId = bayUserId; 

    if (currentUser.role === "company_super_admin") {

      otherUser = {
        _id: bayUserId,
        name:
          quote.bay_user_id?.username ||
          `${quote.bay_user_id?.first_name || ""} ${
            quote.bay_user_id?.last_name || ""
          }`.trim() ||
          "Bay User",
        username: quote.bay_user_id?.username,
        first_name: quote.bay_user_id?.first_name,
        last_name: quote.bay_user_id?.last_name,
        supplier_shop_name: quote.bay_id?.bay_name || "Bay",
      };
    } else if (currentUser.role === "company_admin") {

      otherUser = {
        _id: companyId,
        name:
          quote.company_id?.company_name ||
          currentUser.company_name ||
          "Company",
        company_name:
          quote.company_id?.company_name || currentUser.company_name,
      };
    }
  } else {

    if (quote?.approved_supplier) {
      otherUser = quote.approved_supplier;
      quoteId = quote._id;
      companyId = quote.company_id._id || quote.company_id;
      supplierId = quote.approved_supplier._id;
    } else if (quote?.supplier_id) {
      otherUser = quote.supplier_id;
      quoteId = quote._id;
      companyId =
        currentUserType === "company"
          ? currentUser.company_id
          : quote.company_id;
      supplierId = quote.supplier_id._id || quote.supplier_id;
    }
  }

  useEffect(() => {
    if (isQuoteBay) {
      setIsBayQuote(true);

      if (currentUser.role === "company_admin") {

        const canSend = bayUserId === currentUser.id;
        setCanSendMessage(canSend);
        if (!canSend) {
          toast.error("You are not assigned to this bay quote");
        }
      } else if (currentUser.role === "company_super_admin") {
        setCanSendMessage(true);
      } else {
        setCanSendMessage(false);
      }
    } else {
      setIsBayQuote(false);
      setCanSendMessage(true);
    }
  }, [isQuoteBay, bayUserId, currentUser.id, currentUser.role]);


  useEffect(() => {
    const loadS3Config = async () => {
      try {
        let response: any;
        if (supplier_user) {
          response = await supplierDashboardServices.getsupplierS3Config();
        } else {
          response = await companyServices.getS3Config();
        }

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

  useEffect(() => {
    if (open && quoteId) {
      const connectSocket = async () => {
        try {
          await socketService.connect();

          socketService.off("conversation_data");
          socketService.off("new_message");
          socketService.off("user_typing");
          socketService.off("user_status_change");
          socketService.off("user_status");
          socketService.off("error");

          setLoadingConversation(true);
          socketService.getConversation(quoteId, supplierId, companyId);

          socketService.joinConversation(quoteId, supplierId, companyId);

          const statusUserType =
            isBayQuote && currentUser.role === "company_super_admin"
              ? "bay_user"
              : isBayQuote && currentUser.role === "company_admin"
              ? "company"
              : "supplier";

          socketService.getUserStatus(
            statusUserType,
            otherUser?._id || supplierId
          );

          socketService.onConversationData((data) => {
            handleConversationDataRef.current(data);
          });

          socketService.onNewMessage((data) => {
            setConversation((prev: any) => {
              if (!prev) return { messages: [data.message] };
              const messageExists = prev.messages.some(
                (msg: any) =>
                  msg._id === data.message._id ||
                  (msg.content === data.message.content &&
                    msg.sender_id === data.message.sender_id &&
                    Math.abs(
                      new Date(msg.created_at).getTime() -
                        new Date(data.message.created_at).getTime()
                    ) < 1000)
              );
              if (messageExists) {
                return prev;
              }
              return {
                ...prev,
                messages: [...prev.messages, data.message],
              };
            });
            scrollToBottom();
          });

          socketService.onUserTyping((data) => handleTypingRef.current(data));
          socketService.onUserStatusChange((data) =>
            handleUserStatusChangeRef.current(data)
          );
          socketService.onUserStatus((data) =>
            handleUserStatusRef.current(data)
          );
          socketService.onError((error) => handleSocketErrorRef.current(error));
        } catch (error) {
          console.error("Socket connection error:", error);
          toast.error("Failed to connect to chat");
          setLoadingConversation(false);
        }
      };

      connectSocket();

      return () => {
        if (quoteId) {
          socketService.off("conversation_data");
          socketService.off("new_message");
          socketService.off("user_typing");
          socketService.off("user_status_change");
          socketService.off("user_status");
          socketService.off("error");
          socketService.leaveConversation(quoteId);
        }
      };
    }
  }, [open, quoteId, companyId, supplierId, isBayQuote, currentUser.role]);

  const handleConversationData = useCallback((data: any) => {
    setConversation(data.conversation);
    setLoadingConversation(false);
    setIsBayQuote(data.is_bay_quote || false);
    scrollToBottom();
  }, []);

  const handleNewMessage = useCallback((data: any) => {
    setConversation((prev: any) => {
      if (!prev) return { messages: [data.message] };

      const messageExists = prev.messages.some(
        (msg: any) =>
          msg._id === data.message._id ||
          (msg.content === data.message.content &&
            msg.sender_id === data.message.sender_id &&
            Math.abs(
              new Date(msg.created_at).getTime() -
                new Date(data.message.created_at).getTime()
            ) < 1000)
      );

      if (messageExists) {
        return prev;
      }

      return {
        ...prev,
        messages: [...prev.messages, data.message],
      };
    });
    scrollToBottom();
  }, []);

  const handleTyping = useCallback(
    (data: any) => {
      if (data.user_id !== currentUser.id) {
        setIsTyping(data.typing);
        setTypingUser(data.user_name);
        if (data.typing) {
          setTimeout(() => setIsTyping(false), 3000);
        }
      }
    },
    [currentUser.id]
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

    if (!typing && canSendMessage) {
      socketService.startTyping(quote._id);
      setTyping(true);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      socketService.stopTyping(quote._id);
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
    if (!canSendMessage) {
      toast.error(
        "You don't have permission to send messages in this conversation"
      );
      return;
    }

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
            ? "chat-images"
            : messageType === "video"
            ? "chat-videos"
            : "chat-files"
        );

        fileData = {
          name: selectedFile.name,
          type: selectedFile.type,
          size: selectedFile.size,
          url: uploadResult.url,
          key: uploadResult.key,
        };
      }

      socketService.sendMessage(quoteId, newMessage, messageType, fileData);

      setNewMessage("");
      removeSelectedFile();
      socketService.stopTyping(quoteId);
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

  const isMessageFromCurrentUser = (message: any) => {
    const currentUserId = currentUser.id || currentUser._id;

    if (!currentUserId || !message.sender_id) return false;

    if (currentUser.role === "supplier") {
      return (
        message.sender_type === "supplier" &&
        message.sender_id === currentUserId
      );
    }

    if (isBayQuote) {
      if (currentUser.role === "company_admin") {

        return (
          message.sender_type === "supplier" &&
          message.sender_id === currentUserId
        );
      } else if (currentUser.role === "company_super_admin") {
        return (
          message.sender_type === "company" &&
          message.sender_id === currentUserId
        );
      }
    } else {

      return (
        message.sender_type === "company" && message.sender_id === currentUserId
      );
    }

    return false;
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
                    {otherUser?.name?.charAt(0) ||
                      otherUser?.username?.charAt(0) ||
                      otherUser?.company_name?.charAt(0) ||
                      "U"}
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
                    {isBayQuote
                      ? currentUser.role === "company_super_admin"
                        ? otherUser?.supplier_shop_name ||
                          otherUser?.name ||
                          "Bay User"
                        : otherUser?.company_name ||
                          otherUser?.name ||
                          "Company"
                      : otherUser?.supplier_shop_name ||
                        otherUser?.name ||
                        "Supplier"}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {userStatus?.online
                      ? "Online"
                      : `Last seen ${formatDistanceToNow(
                          userStatus?.lastSeen || new Date()
                        )} ago`}
                  </Badge>
                  {isBayQuote && (
                    <Badge variant="secondary" className="text-xs">
                      Bay Quote
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {quote?.field_name} • Vehicle #{quote?.vehicle_stock_id}
                  {isBayQuote && ` • ${quote?.bay_id?.bay_name || "Bay"}`}
                </p>
              </div>
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0">

          <ScrollArea className="flex-1 px-6 py-4">
            <div className="space-y-4">
              {loadingConversation ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : messages.length > 0 ? (
                messages.map((message: any, index: number) => {
                  const isFromCurrentUser = isMessageFromCurrentUser(message);
                  return (
                    <div
                      key={
                        message._id ||
                        `msg-${index}-${message.sender_id}-${message.created_at}`
                      }
                      className={`flex ${
                        isFromCurrentUser ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`flex items-start gap-2 max-w-[75%] ${
                          isFromCurrentUser ? "flex-row-reverse" : ""
                        }`}
                      >
                        <Avatar className="h-8 w-8 flex-shrink-0">
                          <AvatarFallback>
                            {message.sender_name?.charAt(0) || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="space-y-1">
                          <div
                            className={`rounded-2xl p-3 ${
                              isFromCurrentUser
                                ? "bg-primary text-primary-foreground ml-8"
                                : "bg-muted mr-8"
                            }`}
                          >
                            {renderMessageContent(message)}
                          </div>
                          <div
                            className={`flex items-center gap-2 text-xs ${
                              isFromCurrentUser
                                ? "justify-end"
                                : "justify-start"
                            }`}
                          >
                            <span className="text-muted-foreground">
                              {format(new Date(message.created_at), "HH:mm")}
                            </span>
                            {isFromCurrentUser && (
                              <CheckCheck
                                className={`h-3 w-3 ${
                                  message.is_read
                                    ? "text-blue-400"
                                    : "text-muted-foreground"
                                }`}
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
                    <MessageSquare className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold mb-2">No messages yet</h3>
                  <p className="text-muted-foreground text-sm">
                    Start the conversation with{" "}
                    {isBayQuote
                      ? currentUser.role === "company_super_admin"
                        ? otherUser?.supplier_shop_name || "the bay user"
                        : otherUser?.company_name || "the company"
                      : otherUser?.supplier_shop_name || "the supplier"}
                  </p>
                </div>
              )}

              {isTyping && (
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>{typingUser?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="bg-muted rounded-2xl p-3">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                      <div
                        className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      ></div>
                      <div
                        className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                        style={{ animationDelay: "0.4s" }}
                      ></div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {isBayQuote && !canSendMessage && (
            <div className="px-6 py-3 border-t bg-muted/50">
              <div className="text-sm text-muted-foreground text-center">
                <Clock className="h-4 w-4 inline-block mr-2" />
                You cannot send messages in this conversation as you are not the
                assigned bay user.
              </div>
            </div>
          )}

          {selectedFile && canSendMessage && (
            <div className="px-6 py-3 border-t">
              <Card>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {selectedFile.type.startsWith("image/") ? (
                        <Image className="h-6 w-6 text-blue-500" />
                      ) : selectedFile.type.startsWith("video/") ? (
                        <Video className="h-6 w-6 text-red-500" />
                      ) : (
                        <File className="h-6 w-6 text-gray-500" />
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
            </div>
          )}

          {canSendMessage && (
            <div className="p-6 border-t">
              <div className="flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.zip"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  <Paperclip className="h-4 w-4" />
                </Button>

                <div className="relative flex-1">
                  <Textarea
                    ref={textareaRef}
                    value={newMessage}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Type your message..."
                    className="min-h-12 resize-none pr-12"
                    disabled={uploading}
                  />
                  <div className="absolute right-2 bottom-2 flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      type="button"
                    >
                      <Smile className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <Button
                  onClick={handleSendMessage}
                  disabled={uploading || (!newMessage.trim() && !selectedFile)}
                  size="icon"
                >
                  {uploading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {showEmojiPicker && (
                <div className="absolute bottom-16 right-6 z-50">
                  <EmojiPicker
                    onEmojiClick={handleEmojiSelect}
                    width={300}
                    height={400}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ChatModal;
