import React, { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { bayBookingServices } from "@/api/services";
import { format, parseISO } from "date-fns";
import { Clock, CheckCircle, XCircle, Play, Send, MessageSquare, Eye } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import BayCommentSheetModal from "@/components/workshop/BayCommentSheetModal";
import BayChatModal from "@/components/workshop/BayChatModal";

const BayBookingRequests = () => {
  const queryClient = useQueryClient();
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [commentSheetOpen, setCommentSheetOpen] = useState(false);
  const [chatModalOpen, setChatModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"bay_submit" | "company_review" | "company_view">("bay_submit");

  // Fetch calendar data for bay user
  const { data: calendarData, isLoading } = useQuery({
    queryKey: ["bay-user-bookings"],
    queryFn: async () => {
      const today = new Date();
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 3);
      
      const response = await bayBookingServices.getBayCalendar(
        format(today, "yyyy-MM-dd"),
        format(futureDate, "yyyy-MM-dd")
      );
      return response.data.data;
    },
  });

  // Accept booking mutation
  const acceptMutation = useMutation({
    mutationFn: (bookingId: string) => bayBookingServices.acceptBayBooking(bookingId),
    onSuccess: () => {
      toast.success("Booking accepted successfully");
      queryClient.invalidateQueries({ queryKey: ["bay-user-bookings"] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to accept booking");
    },
  });

  // Reject booking mutation
  const rejectMutation = useMutation({
    mutationFn: ({ bookingId, reason }: { bookingId: string; reason: string }) =>
      bayBookingServices.rejectBayBooking(bookingId, reason),
    onSuccess: () => {
      toast.success("Booking rejected");
      setRejectDialogOpen(false);
      setRejectReason("");
      setSelectedBooking(null);
      queryClient.invalidateQueries({ queryKey: ["bay-user-bookings"] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to reject booking");
    },
  });

  // Start work mutation
  const startWorkMutation = useMutation({
    mutationFn: (bookingId: string) => bayBookingServices.startWork(bookingId),
    onSuccess: () => {
      toast.success("Work started");
      queryClient.invalidateQueries({ queryKey: ["bay-user-bookings"] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to start work");
    },
  });

  const handleAccept = (booking: any) => {
    acceptMutation.mutate(booking._id);
  };

  const handleRejectClick = (booking: any) => {
    setSelectedBooking(booking);
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = () => {
    if (!rejectReason.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }
    rejectMutation.mutate({
      bookingId: selectedBooking._id,
      reason: rejectReason,
    });
  };

  const handleStartWork = (booking: any) => {
    startWorkMutation.mutate(booking._id);
  };

  const handleSubmitWork = (booking: any) => {
    setSelectedBooking(booking);
    setViewMode("bay_submit");
    setCommentSheetOpen(true);
  };

  const handleViewWork = (booking: any) => {
    setSelectedBooking(booking);
    setViewMode("company_view");
    setCommentSheetOpen(true);
  };

  const handleChat = (booking: any) => {
    setSelectedBooking(booking);
    setChatModalOpen(true);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      booking_request: "bg-yellow-100 text-yellow-800 border-yellow-200",
      booking_accepted: "bg-green-100 text-green-800 border-green-200",
      booking_rejected: "bg-red-100 text-red-800 border-red-200",
      work_in_progress: "bg-blue-100 text-blue-800 border-blue-200",
      work_review: "bg-purple-100 text-purple-800 border-purple-200",
      completed_jobs: "bg-gray-100 text-gray-800 border-gray-200",
      rework: "bg-orange-100 text-orange-800 border-orange-200",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const groupedBookings = React.useMemo(() => {
    if (!calendarData?.bookings) return {};
    
    return calendarData.bookings.reduce((acc: any, booking: any) => {
      if (!acc[booking.status]) {
        acc[booking.status] = [];
      }
      acc[booking.status].push(booking);
      return acc;
    }, {});
  }, [calendarData]);

  if (isLoading) {
    return (
      <DashboardLayout title="Bay Booking Requests">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Bay Booking Requests">
      <div className="space-y-6">
        {/* Booking Requests */}
        {groupedBookings.booking_request?.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-600" />
                Pending Requests ({groupedBookings.booking_request.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {groupedBookings.booking_request.map((booking: any) => (
                  <Card key={booking._id} className="border-yellow-200">
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{booking.field_name}</h3>
                          <p className="text-sm text-muted-foreground">
                            Stock ID: {booking.vehicle_stock_id} • {booking.vehicle_type}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-sm">
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {format(parseISO(booking.booking_date), "MMM dd, yyyy")}
                            </span>
                            <span>
                              {booking.booking_start_time} - {booking.booking_end_time}
                            </span>
                          </div>
                          {booking.booking_description && (
                            <p className="text-sm mt-2 text-muted-foreground">
                              {booking.booking_description}
                            </p>
                          )}
                        </div>
                        <Badge className={getStatusColor(booking.status)}>
                          {booking.status.replace(/_/g, " ")}
                        </Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleAccept(booking)}
                          disabled={acceptMutation.isPending}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleRejectClick(booking)}
                          disabled={rejectMutation.isPending}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Accepted Bookings */}
        {groupedBookings.booking_accepted?.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Accepted Bookings ({groupedBookings.booking_accepted.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {groupedBookings.booking_accepted.map((booking: any) => (
                  <Card key={booking._id} className="border-green-200">
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{booking.field_name}</h3>
                          <p className="text-sm text-muted-foreground">
                            Stock ID: {booking.vehicle_stock_id}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-sm">
                            <span>
                              {format(parseISO(booking.booking_date), "MMM dd, yyyy")}
                            </span>
                            <span>
                              {booking.booking_start_time} - {booking.booking_end_time}
                            </span>
                          </div>
                        </div>
                        <Badge className={getStatusColor(booking.status)}>
                          {booking.status.replace(/_/g, " ")}
                        </Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleStartWork(booking)}
                          disabled={startWorkMutation.isPending}
                        >
                          <Play className="h-4 w-4 mr-1" />
                          Start Work
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleChat(booking)}
                        >
                          <MessageSquare className="h-4 w-4 mr-1" />
                          Chat
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Work in Progress */}
        {groupedBookings.work_in_progress?.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="h-5 w-5 text-blue-600" />
                Work in Progress ({groupedBookings.work_in_progress.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {groupedBookings.work_in_progress.map((booking: any) => (
                  <Card key={booking._id} className="border-blue-200">
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{booking.field_name}</h3>
                          <p className="text-sm text-muted-foreground">
                            Stock ID: {booking.vehicle_stock_id}
                          </p>
                        </div>
                        <Badge className={getStatusColor(booking.status)}>
                          {booking.status.replace(/_/g, " ")}
                        </Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleSubmitWork(booking)}
                        >
                          <Send className="h-4 w-4 mr-1" />
                          Submit Work
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleChat(booking)}
                        >
                          <MessageSquare className="h-4 w-4 mr-1" />
                          Chat
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Work Review / Completed / Rework */}
        {(groupedBookings.work_review?.length > 0 ||
          groupedBookings.completed_jobs?.length > 0 ||
          groupedBookings.rework?.length > 0) && (
          <Card>
            <CardHeader>
              <CardTitle>Other Bookings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  ...(groupedBookings.work_review || []),
                  ...(groupedBookings.completed_jobs || []),
                  ...(groupedBookings.rework || []),
                ].map((booking: any) => (
                  <Card key={booking._id}>
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{booking.field_name}</h3>
                          <p className="text-sm text-muted-foreground">
                            Stock ID: {booking.vehicle_stock_id}
                          </p>
                        </div>
                        <Badge className={getStatusColor(booking.status)}>
                          {booking.status.replace(/_/g, " ")}
                        </Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewWork(booking)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View Work
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleChat(booking)}
                        >
                          <MessageSquare className="h-4 w-4 mr-1" />
                          Chat
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {!calendarData?.bookings || calendarData.bookings.length === 0 && (
          <Card>
            <CardContent className="py-16">
              <div className="text-center">
                <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No Booking Requests</h3>
                <p className="text-muted-foreground">
                  You don't have any booking requests at the moment.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Booking</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="reject-reason">Reason for Rejection</Label>
              <Textarea
                id="reject-reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Please provide a reason for rejecting this booking..."
                rows={4}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setRejectDialogOpen(false);
                  setRejectReason("");
                  setSelectedBooking(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleRejectConfirm}
                disabled={rejectMutation.isPending}
              >
                Reject Booking
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Comment Sheet Modal */}
      {commentSheetOpen && selectedBooking && (
        <BayCommentSheetModal
          open={commentSheetOpen}
          onOpenChange={setCommentSheetOpen}
          booking={selectedBooking}
          mode={viewMode}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["bay-user-bookings"] });
            setCommentSheetOpen(false);
          }}
        />
      )}

      {/* Bay Chat Modal */}
      {chatModalOpen && selectedBooking && (
        <BayChatModal
          open={chatModalOpen}
          onOpenChange={setChatModalOpen}
          booking={selectedBooking}
        />
      )}
    </DashboardLayout>
  );
};

export default BayBookingRequests;
