import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { FileCheck } from "lucide-react";
import { toast } from "sonner";
import { workshopServices } from "@/api/services";

interface ManualQuoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  field: any;
  vehicleType: string;
  vehicleStockId: string;
  onSuccess: (quote: any) => void;
}

const ManualQuoteDialog: React.FC<ManualQuoteDialogProps> = ({
  open,
  onOpenChange,
  field,
  vehicleType,
  vehicleStockId,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const [quoteAmount, setQuoteAmount] = useState("");
  const [description, setDescription] = useState("");

  const createManualQuoteMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await workshopServices.createManualQuote(data);
      return response.data;
    },
    onSuccess: (response) => {
      toast.success("Manual quote created successfully");
      handleClose();
      queryClient.invalidateQueries({ queryKey: ["workshop-vehicle-details"] });
      onSuccess(response.data);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to create manual quote");
    },
  });

  const handleProceed = () => {
    if (!quoteAmount) {
      toast.error("Please enter estimation amount");
      return;
    }

    createManualQuoteMutation.mutate({
      vehicle_type: vehicleType,
      vehicle_stock_id: vehicleStockId,
      field_id: field.field_id,
      field_name: field.field_name,
      quote_amount: parseFloat(quoteAmount),
      quote_description: description,
      images: field.images || [],
      videos: field.videos || [],
    });
  };

  const handleClose = () => {
    setQuoteAmount("");
    setDescription("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-blue-600" />
            Manual Quote Completion
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Field: {field?.field_name} • Stock ID: {vehicleStockId}
          </p>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <div className="text-sm">
                <span className="text-muted-foreground">Field:</span>
                <p className="font-medium">{field?.field_name}</p>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <div>
              <Label htmlFor="quoteAmount">Expected Estimation *</Label>
              <Input
                id="quoteAmount"
                type="number"
                step="0.01"
                value={quoteAmount}
                onChange={(e) => setQuoteAmount(e.target.value)}
                placeholder="Enter estimation amount"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Additional details"
                rows={3}
              />
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={createManualQuoteMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleProceed}
              disabled={!quoteAmount || createManualQuoteMutation.isPending}
            >
              {createManualQuoteMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating...
                </>
              ) : (
                "Proceed"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ManualQuoteDialog;
