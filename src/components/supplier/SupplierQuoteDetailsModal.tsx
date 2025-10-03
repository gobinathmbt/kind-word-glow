import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supplierAuthServices } from "@/api/services";
import { DollarSign, Clock, Upload, Play, Edit, Car } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface SupplierQuoteDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quote: any;
  status: string;
  onSubmitWork: () => void;
  onStartWork: () => void;
  onEditWork: () => void;
}

const SupplierQuoteDetailsModal: React.FC<SupplierQuoteDetailsModalProps> = ({
  open,
  onOpenChange,
  quote,
  status,
  onSubmitWork,
  onStartWork,
  onEditWork,
}) => {
  const [formData, setFormData] = useState({
    estimated_cost:
      quote?.supplier_responses?.[0]?.estimated_cost?.toString() || "",
    estimated_time: quote?.supplier_responses?.[0]?.estimated_time || "",
    comments: quote?.supplier_responses?.[0]?.comments || "",
  });
  const queryClient = useQueryClient();

  const selectedDate = formData.estimated_time
    ? new Date(formData.estimated_time)
    : undefined;

  const [hour, setHour] = useState("12");
  const [minute, setMinute] = useState("00");
  const [ampm, setAmPm] = useState("AM");

  const handleDateTimeChange = (
    date?: Date,
    h = hour,
    m = minute,
    a = ampm
  ) => {
    if (!date) return;
    let updated = new Date(date);

    let hh = parseInt(h);
    if (a === "PM" && hh < 12) hh += 12;
    if (a === "AM" && hh === 12) hh = 0;

    updated.setHours(hh);
    updated.setMinutes(parseInt(m));

    setFormData((prev) => ({
      ...prev,
      estimated_time: updated.toISOString(),
    }));
  };

  // Submit quote response mutation
  const submitQuoteMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await supplierAuthServices.submitResponse(
        quote._id,
        data
      );
      return response.data;
    },
    onSuccess: () => {
      toast.success("Quote submitted successfully");
      queryClient.invalidateQueries({ queryKey: ["supplier-quotes"] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to submit quote");
    },
  });

  const handleSubmitQuote = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.estimated_cost || !formData.estimated_time) {
      toast.error("Please enter estimated cost and time");
      return;
    }

    submitQuoteMutation.mutate(formData);
  };

  const renderContent = () => {
    switch (status) {
      case "quote_request":
        return (
          <div className="space-y-6">
            {/* Quote Information */}
            <Card>
              <CardHeader>
                <CardTitle>Quote Request Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-muted-foreground">Field Name</Label>
                    <p className="font-medium">{quote?.field_name}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">
                      Quote Amount
                    </Label>
                    <p className="font-medium">${quote?.quote_amount}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">
                      Vehicle Stock ID
                    </Label>
                    <p className="font-medium">{quote?.vehicle_stock_id}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Company</Label>
                    <p className="font-medium">
                      {quote?.company_id?.company_name}
                    </p>
                  </div>
                </div>
                {quote?.quote_description && (
                  <div className="mt-4">
                    <Label className="text-muted-foreground">Description</Label>
                    <p className="text-sm bg-muted/50 p-2 rounded mt-1">
                      {quote.quote_description}
                    </p>
                  </div>
                )}

                {quote.images && quote.images.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-medium mb-2">Field Images</h4>
                    <div className="grid grid-cols-3 gap-2">
                      {quote.images.map((image: string, index: number) => (
                        <img
                          key={index}
                          src={image}
                          alt={`Field image ${index + 1}`}
                          className="w-full h-20 object-cover rounded"
                        />
                      ))}
                    </div>
                  </div>
                )}

                {quote.videos && quote.videos.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-medium mb-2">Field Videos</h4>
                    <div className="grid grid-cols-3 gap-2">
                      {quote.videos.map((video: string, index: number) => (
                        <video
                          key={index}
                          src={video}
                          controls
                          className="w-full h-20 object-cover rounded"
                        >
                          Your browser does not support the video tag.
                        </video>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Submit Quote Form */}
            <Card>
              <CardHeader>
                <CardTitle>Submit Your Quote</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmitQuote} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="estimated_cost">Estimated Cost *</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="estimated_cost"
                          type="number"
                          step="0.01"
                          value={formData.estimated_cost}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              estimated_cost: e.target.value,
                            }))
                          }
                          placeholder="Enter your cost estimate"
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="estimated_time">Estimated Time *</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !selectedDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {selectedDate
                              ? format(selectedDate, "PPP p") // e.g. Sep 24, 2025, 2:30 PM
                              : "Pick a date & time"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent
                          className="w-auto p-3 space-y-3"
                          align="start"
                        >
                          {/* Date Picker */}
                          <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={(date) => handleDateTimeChange(date)}
                            initialFocus
                          />

                          {/* Time Picker (12-hour format with AM/PM) */}
                          <div className="flex items-center space-x-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />

                            {/* Hours */}
                            <Select
                              value={hour}
                              onValueChange={(val) => {
                                setHour(val);
                                handleDateTimeChange(
                                  selectedDate,
                                  val,
                                  minute,
                                  ampm
                                );
                              }}
                            >
                              <SelectTrigger className="w-16">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Array.from({ length: 12 }, (_, i) => {
                                  const h = (i + 1).toString();
                                  return (
                                    <SelectItem key={h} value={h}>
                                      {h}
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>

                            {/* Minutes */}
                            <Select
                              value={minute}
                              onValueChange={(val) => {
                                setMinute(val);
                                handleDateTimeChange(
                                  selectedDate,
                                  hour,
                                  val,
                                  ampm
                                );
                              }}
                            >
                              <SelectTrigger className="w-16">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {["00", "15", "30", "45"].map((m) => (
                                  <SelectItem key={m} value={m}>
                                    {m}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            {/* AM/PM */}
                            <Select
                              value={ampm}
                              onValueChange={(val) => {
                                setAmPm(val);
                                handleDateTimeChange(
                                  selectedDate,
                                  hour,
                                  minute,
                                  val
                                );
                              }}
                            >
                              <SelectTrigger className="w-20">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="AM">AM</SelectItem>
                                <SelectItem value="PM">PM</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="comments">Additional Comments</Label>
                    <Textarea
                      id="comments"
                      value={formData.comments}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          comments: e.target.value,
                        }))
                      }
                      placeholder="Any additional information or notes..."
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      disabled={submitQuoteMutation.isPending}
                    >
                      {submitQuoteMutation.isPending
                        ? "Updating..."
                        : quote?.supplier_responses?.[0]
                        ? "Update Quote"
                        : "Submit Quote"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        );

      case "quote_approved":
        return (
          <div className="space-y-6">
            {/* Quote Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Quote Details</span>
                  <Badge
                    variant={
                      status === "quote_approved"
                        ? "default"
                        : status === "quote_rejected"
                        ? "destructive"
                        : "default"
                    }
                  >
                    {status.replace("_", " ").toUpperCase()}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-muted-foreground">Field Name</Label>
                    <p className="font-medium">{quote?.field_name}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">
                      Quote Amount
                    </Label>
                    <p className="font-medium">${quote?.quote_amount}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">
                      Vehicle Stock ID
                    </Label>
                    <p className="font-medium">{quote?.vehicle_stock_id}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Company</Label>
                    <p className="font-medium">
                      {quote?.company_id?.company_name}
                    </p>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={onStartWork}>
                    <Play className="h-4 w-4 mr-2" />
                    Start Work
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      case "quote_rejected":
      case "completed_jobs":
        return (
          <div className="space-y-6">
            {/* Quote Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Quote Details</span>
                  <Badge
                    variant={
                      status === "quote_rejected" ? "destructive" : "default"
                    }
                  >
                    {status.replace("_", " ").toUpperCase()}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-muted-foreground">Field Name</Label>
                    <p className="font-medium">{quote?.field_name}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">
                      Quote Amount
                    </Label>
                    <p className="font-medium">${quote?.quote_amount}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">
                      Vehicle Stock ID
                    </Label>
                    <p className="font-medium">{quote?.vehicle_stock_id}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Company</Label>
                    <p className="font-medium">
                      {quote?.company_id?.company_name}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Show submitted work for completed jobs */}
            {status === "completed_jobs" && quote?.comment_sheet && (
              <Card>
                <CardHeader>
                  <CardTitle>Completed Work</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <DollarSign className="h-6 w-6 mx-auto mb-2 text-primary" />
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">
                          Final Price
                        </p>
                        <p className="font-bold">
                          ${quote.comment_sheet.final_price}
                        </p>
                      </div>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <div className="h-6 w-6 mx-auto mb-2 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-xs font-bold">
                        GST
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">
                          GST Amount
                        </p>
                        <p className="font-bold">
                          ${quote.comment_sheet.gst_amount}
                        </p>
                      </div>
                    </div>
                    <div className="text-center p-4 bg-primary/10 rounded-lg border border-primary">
                      <div className="h-6 w-6 mx-auto mb-2 bg-primary rounded-full flex items-center justify-center">
                        <DollarSign className="h-4 w-4 text-primary-foreground" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">
                          Total Amount
                        </p>
                        <p className="font-bold text-primary">
                          ${quote.comment_sheet.total_amount}
                        </p>
                      </div>
                    </div>
                  </div>

                  {quote.comment_sheet.supplier_comments && (
                    <div className="mb-4">
                      <Label className="text-muted-foreground">
                        Work Description
                      </Label>
                      <div className="bg-muted/50 p-3 rounded-lg mt-1">
                        <p className="text-sm">
                          {quote.comment_sheet.supplier_comments}
                        </p>
                      </div>
                    </div>
                  )}

                  {quote.comment_sheet.work_images &&
                    quote.comment_sheet.work_images.length > 0 && (
                      <div>
                        <Label className="text-muted-foreground">
                          Work Images
                        </Label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                          {quote.comment_sheet.work_images.map(
                            (image: any, index: number) => (
                              <div
                                key={index}
                                className="aspect-square rounded-lg overflow-hidden border"
                              >
                                <img
                                  src={image.url}
                                  alt={`Work image ${index + 1}`}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}
                </CardContent>
              </Card>
            )}
          </div>
        );

      case "work_in_progress":
        return (
          <div className="space-y-6">
            {/* Quote Information */}
            <Card>
              <CardHeader>
                <CardTitle>Work in Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                  <div>
                    <Label className="text-muted-foreground">Field Name</Label>
                    <p className="font-medium">{quote?.field_name}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">
                      Quote Amount
                    </Label>
                    <p className="font-medium">${quote?.quote_amount}</p>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={onSubmitWork}>
                    <Upload className="h-4 w-4 mr-2" />
                    Submit Work
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case "work_review":
        return (
          <div className="space-y-6">
            {/* Quote Information */}
            <Card>
              <CardHeader>
                <CardTitle>Work Under Review</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                  <div>
                    <Label className="text-muted-foreground">Field Name</Label>
                    <p className="font-medium">{quote?.field_name}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">
                      Quote Amount
                    </Label>
                    <p className="font-medium">${quote?.quote_amount}</p>
                  </div>
                </div>

                {/* Show submitted work details */}
                {quote?.comment_sheet && (
                  <div className="space-y-4">
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <h4 className="font-medium mb-2">Your Submitted Work</h4>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">
                            Final Price:
                          </span>
                          <p className="font-medium">
                            ${quote.comment_sheet.final_price}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">GST:</span>
                          <p className="font-medium">
                            ${quote.comment_sheet.gst_amount}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Total:</span>
                          <p className="font-medium">
                            ${quote.comment_sheet.total_amount}
                          </p>
                        </div>
                      </div>
                      {quote.comment_sheet.supplier_comments && (
                        <div className="mt-2">
                          <span className="text-muted-foreground">
                            Comments:
                          </span>
                          <p className="text-sm">
                            {quote.comment_sheet.supplier_comments}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end">
                      <Button variant="outline" onClick={onEditWork}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Submission
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );

      case "rework":
        return (
          <div className="space-y-6">
            {/* Quote Information */}
            <Card>
              <CardHeader>
                <CardTitle>Rework Required</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                  <div>
                    <Label className="text-muted-foreground">Field Name</Label>
                    <p className="font-medium">{quote?.field_name}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">
                      Quote Amount
                    </Label>
                    <p className="font-medium">${quote?.quote_amount}</p>
                  </div>
                </div>

                {/* Show rework feedback if available */}
                {quote?.comment_sheet?.company_feedback && (
                  <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mb-4">
                    <h4 className="font-medium mb-2 text-yellow-800">
                      Company Feedback
                    </h4>
                    <p className="text-sm text-yellow-700">
                      {quote.comment_sheet.company_feedback}
                    </p>
                  </div>
                )}

                <div className="flex justify-end">
                  <Button onClick={onStartWork}>
                    <Play className="h-4 w-4 mr-2" />
                    Start Work
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return (
          <Card>
            <CardContent className="py-16">
              <div className="text-center">
                <p className="text-muted-foreground">
                  Quote details not available
                </p>
              </div>
            </CardContent>
          </Card>
        );
    }
  };

  if (!quote) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Quote Details - {quote?.field_name}</DialogTitle>
        </DialogHeader>

        {/* Vehicle Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Car className="h-5 w-5" />
              Vehicle Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              {quote?.vehicle?.vehicle_hero_image && (
                <img
                  src={quote.vehicle.vehicle_hero_image}
                  alt="Vehicle"
                  className="w-16 h-12 object-cover rounded border"
                />
              )}
              <div>
                <p className="font-medium">
                  {quote?.vehicle?.name ||
                    `${quote?.vehicle?.year} ${quote?.vehicle?.make} ${quote?.vehicle?.model}`}
                </p>
                <p className="text-sm text-muted-foreground">
                  Stock: {quote?.vehicle_stock_id} | Plate:{" "}
                  {quote?.vehicle?.plate_no}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {renderContent()}

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SupplierQuoteDetailsModal;
