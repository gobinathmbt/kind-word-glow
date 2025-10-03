import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Bell, 
  Check, 
  CheckCheck, 
  Loader2, 
  X, 
  AlertCircle, 
  Info, 
  CheckCircle, 
  XCircle,
  Filter,
  MoreHorizontal,
  Calendar,
  ExternalLink,
  ArrowLeft
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { socketManager } from '@/lib/socketManager';

interface Notification {
  _id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  is_read: boolean;
  created_at: string;
  action_url?: string;
  source_entity?: {
    entity_type: string;
    entity_id: string;
    entity_data: any;
  };
}

interface NotificationSideModalProps {
  children: React.ReactNode;
}

const NotificationSideModal: React.FC<NotificationSideModalProps> = ({ children }) => {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterType, setFilterType] = useState('all');
  const [filterRead, setFilterRead] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [connected, setConnected] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Check notification socket connection state
  const getNotificationSocketConnection = () => {
    const notificationSocket = socketManager.getNotificationSocket();
    return notificationSocket?.isConnected() || false;
  };

  useEffect(() => {
    const checkConnection = () => {
      const isConnected = getNotificationSocketConnection();
      setConnected(isConnected);
    };
    checkConnection();
    const connectionCheckInterval = setInterval(checkConnection, 1000);
    return () => {
      clearInterval(connectionCheckInterval);
    };
  }, []);

  // Initialize notification socket connection
  useEffect(() => {
    const initNotificationSocket = async () => {
      try {
        await socketManager.connectNotificationSocket();
        const notificationSocket = socketManager.getNotificationSocket();
        
        if (notificationSocket) {
          notificationSocket.on('notification_connected', (data) => {
            console.log('Notification socket connected:', data);
            setConnected(true);
            notificationSocket.emit('get_unread_count');
          });
          notificationSocket.on('notifications_data', (data) => {
            // Sort notifications by priority and creation date
            const sortedNotifications = sortNotifications(data.notifications);
            setNotifications(sortedNotifications);
            setUnreadCount(data.unread_count);
            setTotalPages(data.pagination.total_pages);
            setLoading(false);
          });

          notificationSocket.on('new_notification', (data) => {
            // Add new notification and sort by priority
            setNotifications(prev => {
              const newNotifications = [data.notification, ...prev];
              return sortNotifications(newNotifications);
            });
            setUnreadCount(data.unread_count);
            toast({
              title: data.notification.title,
              description: data.notification.message,
              duration: 5000,
            });
          });

          notificationSocket.on('unread_count_update', (data) => {
            setUnreadCount(data.unread_count);
          });

          notificationSocket.on('notification_marked_read', (data) => {
            setNotifications(prev => {
              const updatedNotifications = prev.map(n => 
                n._id === data.notification_id ? { ...n, is_read: true } : n
              );
              return sortNotifications(updatedNotifications);
            });
            setUnreadCount(data.unread_count);
          });

          notificationSocket.on('all_notifications_marked_read', (data) => {
            setNotifications(prev => {
              const allReadNotifications = prev.map(n => ({ ...n, is_read: true }));
              return sortNotifications(allReadNotifications);
            });
            setUnreadCount(0);
            toast({
              title: 'Success',
              description: `${data.modified_count} notifications marked as read`,
            });
          });

          notificationSocket.on('notification_deleted', (data) => {
            setNotifications(prev => 
              prev.filter(n => n._id !== data.notification_id)
            );
            setUnreadCount(data.unread_count);
            toast({
              title: 'Success',
              description: 'Notification deleted',
            });
          });

          notificationSocket.on('notification_error', (error) => {
            console.error('Notification socket error:', error);
            toast({
              title: 'Error',
              description: error.message,
              variant: 'destructive',
            });
            setLoading(false);
          });

          notificationSocket.on('disconnect', () => {
            setConnected(false);
            console.log('Notification socket disconnected');
          });

          notificationSocket.on('connect', () => {
            setConnected(true);
            console.log('Notification socket reconnected');
          });
        }
      } catch (error) {
        console.error('Failed to initialize notification socket:', error);
        setConnected(false);
      }
    };

    initNotificationSocket();

    return () => {
      // Clean up event listeners
      const notificationSocket = socketManager.getNotificationSocket();
      if (notificationSocket) {
        notificationSocket.off('notification_connected');
        notificationSocket.off('notifications_data');
        notificationSocket.off('new_notification');
        notificationSocket.off('unread_count_update');
        notificationSocket.off('notification_marked_read');
        notificationSocket.off('all_notifications_marked_read');
        notificationSocket.off('notification_deleted');
        notificationSocket.off('notification_error');
        notificationSocket.off('disconnect');
        notificationSocket.off('connect');
      }
    };
  }, [toast]);

  // Sort notifications: by priority (urgent > high > medium > low), then by creation date (newest first)
  const sortNotifications = (notifications: Notification[]): Notification[] => {
    return notifications.sort((a, b) => {
      // First sort by priority: urgent > high > medium > low
      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
      const priorityA = priorityOrder[a.priority];
      const priorityB = priorityOrder[b.priority];
      
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      
      // Then sort by read status: unread first
      if (!a.is_read && b.is_read) return -1;
      if (a.is_read && !b.is_read) return 1;
      
      // Then sort by creation date: newest first
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  };

  // Fetch notifications when modal opens or filters change
  useEffect(() => {
    if (isOpen && connected) {
      fetchNotifications();
    }
  }, [isOpen, connected, currentPage, filterType, filterRead, filterPriority]);

  const fetchNotifications = () => {
    setLoading(true);
    const notificationSocket = socketManager.getNotificationSocket();
    if (notificationSocket) {
      const payload: any = {
        page: currentPage,
        limit: 20,
      };

      if (filterType !== "all") {
        payload.type = filterType;
      }
      if (filterRead !== "all") {
        payload.is_read = filterRead;
      }
      if (filterPriority !== "all") {
        payload.priority = filterPriority;
      }

      notificationSocket.emit("get_notifications", payload);
    }
  };

  const markAsRead = (notificationId: string) => {
    const notificationSocket = socketManager.getNotificationSocket();
    if (notificationSocket) {
      notificationSocket.emit('mark_notification_read', {
        notification_id: notificationId
      });
    }
  };

  const markAllAsRead = () => {
    const notificationSocket = socketManager.getNotificationSocket();
    if (notificationSocket) {
      notificationSocket.emit('mark_all_notifications_read');
    }
  };

  const deleteNotification = (notificationId: string) => {
    const notificationSocket = socketManager.getNotificationSocket();
    if (notificationSocket) {
      notificationSocket.emit('delete_notification', {
        notification_id: notificationId
      });
    }
  };

  const getNotificationIcon = (type: string, isRead: boolean) => {
    // For unread notifications, show info symbol
    if (!isRead) {
      return <Info className="h-4 w-4 text-blue-500" />;
    }
    
    // For read notifications, show check symbol based on type
    switch (type) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Check className="h-4 w-4 text-blue-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'destructive';
      case 'high':
        return 'secondary';
      case 'medium':
        return 'default';
      case 'low':
        return 'outline';
      default:
        return 'default';
    }
  };

  // Get type color for notification chips
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-100 text-green-800 border-green-200 hover:bg-green-100';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100';
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200 hover:bg-red-100';
      case 'info':
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100';
    }
  };

  // Get type icon for notifications
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'info':
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  // Get type background color for notification items
  const getTypeBackgroundColor = (type: string, isRead: boolean) => {
    if (isRead) {
      switch (type) {
        case 'success':
          return 'bg-green-50 border-green-200';
        case 'warning':
          return 'bg-yellow-50 border-yellow-200';
        case 'error':
          return 'bg-red-50 border-red-200';
        case 'info':
        default:
          return 'bg-blue-50 border-blue-200';
      }
    } else {
      switch (type) {
        case 'success':
          return 'bg-green-100 border-green-300';
        case 'warning':
          return 'bg-yellow-100 border-yellow-300';
        case 'error':
          return 'bg-red-100 border-red-300';
        case 'info':
        default:
          return 'bg-blue-100 border-blue-300';
      }
    }
  };

  // Get type border color for notification items
  const getTypeBorderColor = (type: string, isRead: boolean) => {
    if (isRead) {
      switch (type) {
        case 'success':
          return 'border-l-green-400';
        case 'warning':
          return 'border-l-yellow-400';
        case 'error':
          return 'border-l-red-400';
        case 'info':
        default:
          return 'border-l-blue-400';
      }
    } else {
      switch (type) {
        case 'success':
          return 'border-l-green-600';
        case 'warning':
          return 'border-l-yellow-600';
        case 'error':
          return 'border-l-red-600';
        case 'info':
        default:
          return 'border-l-blue-600';
      }
    }
  };

  // Get priority background color for notification items
  const getPriorityBackgroundColor = (priority: string, isRead: boolean) => {
    if (isRead) {
      switch (priority) {
        case 'urgent':
          return 'bg-red-50 border-red-200';
        case 'high':
          return 'bg-orange-50 border-orange-200';
        case 'medium':
          return 'bg-yellow-50 border-yellow-200';
        case 'low':
          return 'bg-blue-50 border-blue-200';
        default:
          return 'bg-gray-50 border-gray-200';
      }
    } else {
      switch (priority) {
        case 'urgent':
          return 'bg-red-100 border-red-300';
        case 'high':
          return 'bg-orange-100 border-orange-300';
        case 'medium':
          return 'bg-yellow-100 border-yellow-300';
        case 'low':
          return 'bg-blue-100 border-blue-300';
        default:
          return 'bg-blue-50 border-blue-200';
      }
    }
  };

  // Get priority border color for notification items
  const getPriorityBorderColor = (priority: string, isRead: boolean) => {
    if (isRead) {
      switch (priority) {
        case 'urgent':
          return 'border-l-red-400';
        case 'high':
          return 'border-l-orange-400';
        case 'medium':
          return 'border-l-yellow-400';
        case 'low':
          return 'border-l-blue-400';
        default:
          return 'border-l-gray-400';
      }
    } else {
      switch (priority) {
        case 'urgent':
          return 'border-l-red-600';
        case 'high':
          return 'border-l-orange-600';
        case 'medium':
          return 'border-l-yellow-600';
        case 'low':
          return 'border-l-blue-600';
        default:
          return 'border-l-gray-600';
      }
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markAsRead(notification._id);
    }
    
    // Show detail dialog for both mobile and desktop when clicking notification
    setSelectedNotification(notification);
    setIsDialogOpen(true);
  };

  const handleDialogAction = () => {
    if (selectedNotification?.action_url) {
      window.open(selectedNotification.action_url, '_blank');
    }
    setIsDialogOpen(false);
    setSelectedNotification(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <div className="relative">
            {children}
            {unreadCount > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs min-w-[20px]"
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            )}
          </div>
        </SheetTrigger>
        
        <SheetContent 
          side="right" 
          className="w-full sm:w-[450px] md:w-[500px] p-0 overflow-hidden min-w-[30vw]"
        >
          <div className="flex flex-col h-full">
            {/* Header */}
            <SheetHeader className="p-4 sm:p-6 pb-3 sm:pb-4 flex-shrink-0">
              <div className="flex items-center justify-between mt-4">
                <SheetTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
                  Notifications
                  {unreadCount > 0 && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {unreadCount} unread
                    </Badge>
                  )}
                </SheetTitle>
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={markAllAsRead}
                    className="text-xs h-8 px-2 sm:px-3"
                  >
                    <CheckCheck className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    <span className="hidden sm:inline">Mark all read</span>
                    <span className="sm:hidden">All read</span>
                  </Button>
                )}
              </div>
              
              {/* Connection Status */}
              <div className="flex items-center gap-2 text-xs sm:text-sm mt-2">
                <div className={`h-2 w-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-muted-foreground">
                  {connected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
            </SheetHeader>

            <Separator />

            {/* Filters */}
            <div className="p-3 sm:p-4 space-y-2 sm:space-y-3 flex-shrink-0">
              <div className="flex flex-col sm:flex-row gap-2">
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-full text-xs sm:text-sm h-9 sm:h-10">
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs sm:text-sm">All Types</SelectItem>
                    <SelectItem value="info" className="text-xs sm:text-sm">Info</SelectItem>
                    <SelectItem value="success" className="text-xs sm:text-sm">Success</SelectItem>
                    <SelectItem value="warning" className="text-xs sm:text-sm">Warning</SelectItem>
                    <SelectItem value="error" className="text-xs sm:text-sm">Error</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={filterRead} onValueChange={setFilterRead}>
                  <SelectTrigger className="w-full text-xs sm:text-sm h-9 sm:h-10">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs sm:text-sm">All</SelectItem>
                    <SelectItem value="false" className="text-xs sm:text-sm">Unread</SelectItem>
                    <SelectItem value="true" className="text-xs sm:text-sm">Read</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filterPriority} onValueChange={setFilterPriority}>
                  <SelectTrigger className="w-full text-xs sm:text-sm h-9 sm:h-10">
                    <SelectValue placeholder="Filter by priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs sm:text-sm">All Priorities</SelectItem>
                    <SelectItem value="urgent" className="text-xs sm:text-sm">Urgent</SelectItem>
                    <SelectItem value="high" className="text-xs sm:text-sm">High</SelectItem>
                    <SelectItem value="medium" className="text-xs sm:text-sm">Medium</SelectItem>
                    <SelectItem value="low" className="text-xs sm:text-sm">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            {/* Notifications List */}
            <div className="flex-1 min-h-0">
              <ScrollArea className="h-full">
                <div className="p-3 sm:p-4">
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin" />
                      <span className="ml-2 text-sm">Loading notifications...</span>
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="text-center py-8">
                      <Bell className="h-8 w-8 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-3 sm:mb-4" />
                      <p className="text-muted-foreground text-sm sm:text-base">No notifications found</p>
                    </div>
                  ) : (
                    <div className="space-y-2 sm:space-y-3">
                      {notifications.map((notification) => (
                        <div
                          key={notification._id}
                          className={`p-3 rounded-lg border transition-colors cursor-pointer hover:bg-muted/50 border-l-4 ${
                            getTypeBackgroundColor(notification.type, notification.is_read)
                          } ${getTypeBorderColor(notification.type, notification.is_read)}`}
                          onClick={() => handleNotificationClick(notification)}
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 mt-0.5">
                              {getNotificationIcon(notification.type, notification.is_read)}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-sm font-medium break-words line-clamp-1">
                                    {notification.title}
                                  </h4>
                                  <p className="text-xs sm:text-sm text-muted-foreground mt-1 break-words line-clamp-2">
                                    {(notification.message)}
                                  </p>
                                </div>
                                
                                <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                                  {/* Type Chip */}
                                  <Badge 
                                    variant="outline" 
                                    className={`text-xs capitalize ${getTypeColor(notification.type)}`}
                                  >
                                    {notification.type}
                                  </Badge>
                                  
                                  <Badge 
                                    variant={getPriorityColor(notification.priority) as any} 
                                    className="text-xs hidden xs:inline-flex"
                                  >
                                    {notification.priority}
                                  </Badge>
                                  
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="h-6 w-6 p-0"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <MoreHorizontal className="h-3 w-3 sm:h-4 sm:w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="text-xs sm:text-sm">
                                      {!notification.is_read && (
                                        <DropdownMenuItem onClick={(e) => {
                                          e.stopPropagation();
                                          markAsRead(notification._id);
                                        }}>
                                          <Check className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                                          Mark as read
                                        </DropdownMenuItem>
                                      )}
                                      <DropdownMenuItem 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          deleteNotification(notification._id);
                                        }}
                                        className="text-destructive"
                                      >
                                        <X className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                                        Delete
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </div>
                              
                              <div className="flex items-center justify-between mt-2">
                                <span className="text-xs text-muted-foreground">
                                  {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                                </span>
                                
                                {notification.source_entity && (
                                  <Badge variant="outline" className="text-xs">
                                    {notification.source_entity.entity_type}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <>
                <Separator />
                <div className="p-3 sm:p-4 flex justify-between items-center flex-shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1 || loading}
                    className="text-xs h-8 px-2 sm:px-3"
                  >
                    Previous
                  </Button>
                  
                  <span className="text-xs sm:text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </span>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages || loading}
                    className="text-xs h-8 px-2 sm:px-3"
                  >
                    Next
                  </Button>
                </div>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Notification Detail Dialog for both Mobile and Desktop */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md w-[95vw] max-w-[95vw] rounded-lg mx-2 p-0 overflow-hidden">
          {selectedNotification && (
            <>
              <DialogHeader className="p-4 pb-3 border-b">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsDialogOpen(false)}
                    className="h-8 w-8 p-0"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <DialogTitle className="text-base flex items-center gap-2">
                    {getNotificationIcon(selectedNotification.type, selectedNotification.is_read)}
                    Notification Details
                  </DialogTitle>
                </div>
              </DialogHeader>

              <ScrollArea className="max-h-[70vh]">
                <div className="p-4 space-y-4">
                  {/* Header */}
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="text-lg font-semibold break-words">
                        {selectedNotification.title}
                      </h2>
                      <div className="flex flex-col gap-1 items-end">
                        <Badge 
                          variant="outline" 
                          className={`capitalize ${getTypeColor(selectedNotification.type)}`}
                        >
                          {selectedNotification.type}
                        </Badge>
                        <Badge variant={getPriorityColor(selectedNotification.priority) as any}>
                          {selectedNotification.priority}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDate(selectedNotification.created_at)}</span>
                    </div>
                  </div>

                  {/* Message */}
                  <div className="space-y-2">
                    <h3 className="font-medium text-sm">Message</h3>
                    <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg break-words">
                      {(selectedNotification.message)}
                    </p>
                  </div>

                  {/* Metadata */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Status:</span>
                      <Badge variant={selectedNotification.is_read ? "outline" : "default"}>
                        {selectedNotification.is_read ? "Read" : "Unread"}
                      </Badge>
                    </div>

                    {selectedNotification.source_entity && (
                      <div className="space-y-2">
                        <div className="bg-muted/50 p-3 rounded-lg space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span>Entity Type:</span>
                            <span className="font-medium capitalize">
                              {selectedNotification.source_entity.entity_type}
                            </span>
                          </div>
                          {selectedNotification.source_entity.entity_data && (
                            <div className="text-xs text-muted-foreground break-all">
                              ID: {selectedNotification.source_entity.entity_id}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </ScrollArea>

              {/* Actions */}
              <div className="p-4 border-t flex flex-col sm:flex-row gap-2">
                {!selectedNotification.is_read && (
                  <Button
                    onClick={() => {
                      markAsRead(selectedNotification._id);
                      setIsDialogOpen(false);
                    }}
                    className="flex-1"
                    size="sm"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Mark as Read
                  </Button>
                )}
                
                {selectedNotification.action_url && (
                  <Button
                    onClick={handleDialogAction}
                    variant="secondary"
                    className="flex-1"
                    size="sm"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open Link
                  </Button>
                )}
                
                <Button
                  onClick={() => {
                    deleteNotification(selectedNotification._id);
                    setIsDialogOpen(false);
                  }}
                  variant="destructive"
                  className="flex-1"
                  size="sm"
                >
                  <X className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default NotificationSideModal;