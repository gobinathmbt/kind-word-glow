import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
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
import { HardHat } from "lucide-react";
import { toast } from "sonner";
import BayBookingDialog from "@/components/workshop/BayBookingDialog";

interface ManualBayDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  field: any;
  vehicleType: string;
  vehicleStockId: string;
  onSuccess: (quote: any) => void;
}

const ManualBayDialog: React.FC<ManualBayDialogProps> = ({
  open,
  onOpenChange,
  field,
  vehicleType,
  vehicleStockId,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<"amount" | "bay">("amount");
  const [quoteAmount, setQuoteAmount] = useState("");
  const [description, setDescription] = useState("");

  const handleAmountProceed = () => {
    if (!quoteAmount) {
      toast.error("Please enter estimation amount");
      return;
    }
    setStep("bay");
  };

  const handleBaySuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["workshop-vehicle-details"] });
    const quoteData = {
      ...field,
      manual_quote_amount: parseFloat(quoteAmount),
      manual_quote_description: description,
      is_manual: true,
    };
    onSuccess(quoteData);
    handleClose();
  };

  const handleClose = () => {
    setQuoteAmount("");
    setDescription("");
    setStep("amount");
    onOpenChange(false);
  };

  if (step === "bay") {
    return (
      <BayBookingDialog
        open={open}
        onOpenChange={handleClose}
        field={{
          ...field,
          manual_quote_amount: parseFloat(quoteAmount),
          manual_quote_description: description,
          is_manual: true,
        }}
        vehicleType={vehicleType}
        vehicleStockId={vehicleStockId}
        onSuccess={handleBaySuccess}
        isManual={true}
        manualQuoteAmount={parseFloat(quoteAmount)}
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HardHat className="h-5 w-5 text-blue-600" />
            Manual Bay Completion
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Field: {field?.field_name} • Stock ID: {vehicleStockId}
          </p>
        </DialogHeader>

        <div className="space-y-6 py-4">
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
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleAmountProceed}
              disabled={!quoteAmount}
            >
              Proceed to Bay Selection
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ManualBayDialog;
