import React, { useState } from "react";
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
import { FileCheck, HardHat } from "lucide-react";
import { toast } from "sonner";

interface ManualCompletionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  field: any;
  vehicleType: string;
  vehicleStockId: string;
  onSuccess: () => void;
  mode: "quote" | "bay";
}

const ManualCompletionDialog: React.FC<ManualCompletionDialogProps> = ({
  open,
  onOpenChange,
  field,
  vehicleType,
  vehicleStockId,
  onSuccess,
  mode,
}) => {
  const [quoteAmount, setQuoteAmount] = useState("");
  const [description, setDescription] = useState("");

  const handleProceed = () => {
    if (!quoteAmount) {
      toast.error("Please enter estimation amount");
      return;
    }

    onSuccess();
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
            {mode === "quote" ? (
              <FileCheck className="h-5 w-5 text-blue-600" />
            ) : (
              <HardHat className="h-5 w-5 text-blue-600" />
            )}
            {mode === "quote" ? "Manual Quote Completion" : "Manual Bay Completion"}
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
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleProceed}
              disabled={!quoteAmount}
            >
              Proceed
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ManualCompletionDialog;
