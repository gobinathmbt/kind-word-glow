import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { tenderService } from "@/services/tenderService";
import { Building2, Search, CheckSquare, Square } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

interface SendTenderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  tender: any;
}

const SendTenderModal: React.FC<SendTenderModalProps> = ({
  open,
  onOpenChange,
  onSuccess,
  tender,
}) => {
  const [selectedDealerships, setSelectedDealerships] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch available dealerships
  const {
    data: dealershipsData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["available-dealerships", tender?._id],
    queryFn: async () => {
      if (!tender?._id) return { data: [] };
      const response = await tenderService.getAvailableDealerships(tender._id);
      return response.data;
    },
    enabled: open && !!tender?._id,
  });

  const dealerships = dealershipsData?.data || [];

  // Filter dealerships based on search term
  const filteredDealerships = dealerships.filter((dealership: any) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      dealership.dealership_name?.toLowerCase().includes(searchLower) ||
      dealership.email?.toLowerCase().includes(searchLower) ||
      dealership.brand_or_make?.toLowerCase().includes(searchLower)
    );
  });

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setSelectedDealerships([]);
      setSearchTerm("");
      refetch();
    }
  }, [open, refetch]);

  const handleToggleDealership = (dealershipId: string) => {
    setSelectedDealerships((prev) => {
      if (prev.includes(dealershipId)) {
        return prev.filter((id) => id !== dealershipId);
      } else {
        return [...prev, dealershipId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedDealerships.length === filteredDealerships.length) {
      setSelectedDealerships([]);
    } else {
      setSelectedDealerships(filteredDealerships.map((d: any) => d._id));
    }
  };

  const handleSubmit = async () => {
    if (selectedDealerships.length === 0) {
      toast.error("Please select at least one dealership");
      return;
    }

    setIsSubmitting(true);

    try {
      await tenderService.sendTender(tender._id, {
        dealership_ids: selectedDealerships,
      });
      toast.success(
        `Tender sent successfully to ${selectedDealerships.length} dealership(s)`
      );
      onSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to send tender");
    } finally {
      setIsSubmitting(false);
    }
  };

  const allSelected =
    filteredDealerships.length > 0 &&
    selectedDealerships.length === filteredDealerships.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Send Tender to Dealerships</DialogTitle>
          <DialogDescription>
            Select dealerships to send tender {tender?.tender_id}. Only active
            dealerships that haven't received this tender are shown.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search dealerships..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Select All */}
          <div className="flex items-center justify-between py-2 border-b">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="select-all"
                checked={allSelected}
                onCheckedChange={handleSelectAll}
                disabled={filteredDealerships.length === 0}
              />
              <Label
                htmlFor="select-all"
                className="text-sm font-medium cursor-pointer"
              >
                Select All ({selectedDealerships.length} of{" "}
                {filteredDealerships.length})
              </Label>
            </div>
            {selectedDealerships.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedDealerships([])}
              >
                Clear Selection
              </Button>
            )}
          </div>

          {/* Dealerships List */}
          <ScrollArea className="h-[400px] pr-4">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center space-x-3 p-3">
                    <Skeleton className="h-5 w-5" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredDealerships.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground">
                  {searchTerm
                    ? "No dealerships found matching your search"
                    : "No available dealerships to send this tender"}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredDealerships.map((dealership: any) => (
                  <div
                    key={dealership._id}
                    className={`flex items-start space-x-3 p-3 rounded-lg border transition-colors cursor-pointer hover:bg-accent ${
                      selectedDealerships.includes(dealership._id)
                        ? "bg-accent border-primary"
                        : "border-border"
                    }`}
                    onClick={() => handleToggleDealership(dealership._id)}
                  >
                    <Checkbox
                      id={dealership._id}
                      checked={selectedDealerships.includes(dealership._id)}
                      onCheckedChange={() =>
                        handleToggleDealership(dealership._id)
                      }
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <Label
                          htmlFor={dealership._id}
                          className="font-medium cursor-pointer"
                        >
                          {dealership.dealership_name}
                        </Label>
                        {dealership.isActive && (
                          <Badge
                            variant="default"
                            className="bg-green-100 text-green-800 hover:bg-green-100 text-xs"
                          >
                            Active
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground space-y-0.5">
                        {dealership.email && (
                          <div className="text-xs">{dealership.email}</div>
                        )}
                        {dealership.brand_or_make && (
                          <div className="text-xs">
                            Brand: {dealership.brand_or_make}
                          </div>
                        )}
                        {dealership.address && (
                          <div className="text-xs">
                            {[
                              dealership.address.street,
                              dealership.address.suburb,
                              dealership.address.state,
                            ]
                              .filter(Boolean)
                              .join(", ")}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || selectedDealerships.length === 0}
          >
            {isSubmitting
              ? "Sending..."
              : `Send to ${selectedDealerships.length} Dealership${
                  selectedDealerships.length !== 1 ? "s" : ""
                }`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SendTenderModal;
