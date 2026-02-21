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
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { tenderService } from "@/api/services";
import { Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import Select from "react-select";

interface SendTenderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  tender: any;
}

interface SelectOption {
  value: string;
  label: string;
  data: any;
}

const SendTenderModal: React.FC<SendTenderModalProps> = ({
  open,
  onOpenChange,
  onSuccess,
  tender,
}) => {
  const [selectedDealerships, setSelectedDealerships] = useState<SelectOption[]>([]);
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

  // Convert dealerships to select options
  const dealershipOptions: SelectOption[] = dealerships.map((dealership: any) => ({
    value: dealership.id,
    label: dealership.dealership_name,
    data: dealership,
  }));

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setSelectedDealerships([]);
      refetch();
    }
  }, [open, refetch]);

  const handleSubmit = async () => {
    if (selectedDealerships.length === 0) {
      toast.error("Please select at least one dealership");
      return;
    }

    setIsSubmitting(true);

    try {
      const dealershipIds = selectedDealerships.map(option => option.value);
      await tenderService.sendTender(tender._id, {
        dealership_ids: dealershipIds,
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

  // Custom styles for react-select to match shadcn/ui
  const customSelectStyles = {
    control: (base: any, state: any) => ({
      ...base,
      minHeight: '40px',
      borderColor: state.isFocused 
        ? 'hsl(var(--ring))' 
        : 'hsl(var(--input))',
      boxShadow: state.isFocused ? '0 0 0 2px hsl(var(--ring))' : 'none',
      '&:hover': {
        borderColor: 'hsl(var(--input))',
      },
      backgroundColor: 'transparent',
    }),
    option: (base: any, state: any) => ({
      ...base,
      backgroundColor: state.isSelected 
        ? 'hsl(var(--primary))' 
        : state.isFocused 
        ? 'hsl(var(--accent))' 
        : 'transparent',
      color: state.isSelected ? 'hsl(var(--primary-foreground))' : 'hsl(var(--foreground))',
      cursor: 'pointer',
      '&:active': {
        backgroundColor: 'hsl(var(--accent))',
      },
    }),
    multiValue: (base: any) => ({
      ...base,
      backgroundColor: 'hsl(var(--accent))',
    }),
    multiValueLabel: (base: any) => ({
      ...base,
      color: 'hsl(var(--foreground))',
    }),
    multiValueRemove: (base: any) => ({
      ...base,
      color: 'hsl(var(--foreground))',
      ':hover': {
        backgroundColor: 'hsl(var(--destructive))',
        color: 'hsl(var(--destructive-foreground))',
      },
    }),
    menu: (base: any) => ({
      ...base,
      zIndex: 50,
    }),
    placeholder: (base: any) => ({
      ...base,
      color: 'hsl(var(--muted-foreground))',
    }),
  };

  // Custom option component to show dealership details
  const formatOptionLabel = (option: SelectOption) => {
    const dealership = option.data;
    return (
      <div className="flex items-start gap-2 py-1">
        <Building2 className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">{dealership.dealership_name}</span>
            {dealership.isActive && (
              <Badge
                variant="default"
                className="bg-green-100 text-green-800 hover:bg-green-100 text-xs shrink-0"
              >
                Active
              </Badge>
            )}
          </div>
          {dealership.email && (
            <div className="text-xs text-muted-foreground truncate">{dealership.email}</div>
          )}
          {dealership.brand_or_make && (
            <div className="text-xs text-muted-foreground">Brand: {dealership.brand_or_make}</div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Send Tender to Dealerships</DialogTitle>
          <DialogDescription>
            Select dealerships to send tender {tender?.tender_id}. Only active
            dealerships that haven't received this tender are shown.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Multi-select Dropdown */}
          <div className="space-y-2">
            <Label htmlFor="dealerships">
              Select Dealerships <span className="text-red-500">*</span>
            </Label>
            {isLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Select
                id="dealerships"
                isMulti
                value={selectedDealerships}
                onChange={(selected) => setSelectedDealerships(selected as SelectOption[])}
                options={dealershipOptions}
                placeholder="Search and select dealerships..."
                styles={customSelectStyles}
                formatOptionLabel={formatOptionLabel}
                className="react-select-container"
                classNamePrefix="react-select"
                noOptionsMessage={() => "No dealerships available"}
                closeMenuOnSelect={false}
                isClearable
              />
            )}
            {selectedDealerships.length > 0 && (
              <p className="text-sm text-muted-foreground">
                {selectedDealerships.length} dealership{selectedDealerships.length !== 1 ? 's' : ''} selected
              </p>
            )}
          </div>

          {/* Info message */}
          {dealerships.length === 0 && !isLoading && (
            <div className="flex flex-col items-center justify-center py-8 text-center border rounded-lg bg-muted/50">
              <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground">
                No available dealerships to send this tender
              </p>
            </div>
          )}
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
