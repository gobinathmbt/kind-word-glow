import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check } from "lucide-react";

interface CurrencySelectionDialogProps {
  open: boolean;
  onClose: () => void;
  availableCurrencies: any[];
  selectedCurrency: any;
  onSelectCurrency: (currency: any) => void;
}

const CurrencySelectionDialog: React.FC<CurrencySelectionDialogProps> = ({
  open,
  onClose,
  availableCurrencies,
  selectedCurrency,
  onSelectCurrency,
}) => {
  const [selectedCurr, setSelectedCurr] = useState(selectedCurrency);

  const handleSelect = (currency: any) => {
    setSelectedCurr(currency);
  };

  const handleConfirm = () => {
    onSelectCurrency(selectedCurr);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Select Currency</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-2">
            {availableCurrencies.map((currency) => (
              <div
                key={currency._id}
                onClick={() => handleSelect(currency)}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedCurr?._id === currency._id
                    ? "bg-primary/10 border-primary"
                    : "hover:bg-muted"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{currency.currency_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {currency.symbol} - {currency.currency_code}
                    </p>
                  </div>
                  {selectedCurr?._id === currency._id && (
                    <Check className="h-5 w-5 text-primary" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>Confirm</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CurrencySelectionDialog;
