import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CostEditDialogProps {
  open: boolean;
  onClose: () => void;
  costType: any;
  value: any;
  onChange: (value: any) => void;
  availableCurrencies: any[];
}

const CostEditDialog: React.FC<CostEditDialogProps> = ({
  open,
  onClose,
  costType,
  value,
  onChange,
  availableCurrencies,
}) => {
  const [localValue, setLocalValue] = useState({
    currency: value?.currency || costType?.currency_id,
    exchange_rate: value?.exchange_rate || costType?.currency_id?.exchange_rate || 1,
    tax_rate: value?.tax_rate || costType?.default_tax_rate || "0",
    tax_type: value?.tax_type || costType?.default_tax_type || "exclusive",
    net_amount: value?.net_amount || (costType?.default_value ? costType.default_value.toString() : "0"),
    total_tax: value?.total_tax || "0",
    total_amount: value?.total_amount || "0",
  });

  useEffect(() => {
    if (costType?.default_value && !value?.net_amount) {
      const defaultValue = parseFloat(costType.default_value) || 0;
      const calculated = calculateTax(
        defaultValue.toString(), 
        costType.default_tax_rate || "0", 
        costType.default_tax_type || "exclusive"
      );
      
      setLocalValue(prev => ({
        ...prev,
        net_amount: defaultValue.toString(),
        tax_rate: costType.default_tax_rate || "0",
        tax_type: costType.default_tax_type || "exclusive",
        ...calculated,
      }));
    } else if (value) {
      setLocalValue(value);
    }
  }, [value, costType]);

  useEffect(() => {
    if (value) {
      setLocalValue(value);
    }
  }, [value]);

  const calculateTax = (netAmount: string, taxRate: string, taxType: string) => {
    const net = parseFloat(netAmount) || 0;
    const rate = parseFloat(taxRate) || 0;
    
    let tax = 0;
    let total = 0;

    if (taxType === "exclusive") {
      tax = (net * rate) / 100;
      total = net + tax;
    } else if (taxType === "inclusive") {
      total = net;
      tax = (net * rate) / (100 + rate);
    } else if (taxType === "zero_gst") {
      tax = 0;
      total = net;
    }

    return {
      total_tax: tax.toFixed(2),
      total_amount: total.toFixed(2),
    };
  };

  const handleNetAmountChange = (amount: string) => {
    const calculated = calculateTax(amount, localValue.tax_rate, localValue.tax_type);
    const updated = {
      ...localValue,
      net_amount: amount,
      ...calculated,
    };
    setLocalValue(updated);
  };

  const handleTaxRateChange = (rate: string) => {
    const calculated = calculateTax(localValue.net_amount, rate, localValue.tax_type);
    const updated = {
      ...localValue,
      tax_rate: rate,
      ...calculated,
    };
    setLocalValue(updated);
  };

  const handleTaxTypeChange = (type: string) => {
    const calculated = calculateTax(localValue.net_amount, localValue.tax_rate, type);
    const updated = {
      ...localValue,
      tax_type: type,
      ...calculated,
    };
    setLocalValue(updated);
  };

  const handleCurrencyChange = (currencyId: string) => {
    const currency = availableCurrencies.find((c) => c._id === currencyId);
    if (currency) {
      const updated = {
        ...localValue,
        currency: currency,
        exchange_rate: currency.exchange_rate,
      };
      setLocalValue(updated);
    }
  };

  const handleSave = () => {
    onChange(localValue);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{costType?.cost_type}</DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-4 pr-4">
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select
                value={localValue.currency?._id}
                onValueChange={handleCurrencyChange}
                disabled={!costType.change_currency}
              >
                <SelectTrigger>
                  <SelectValue>
                    {localValue.currency?.currency_name || "Select Currency"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  {availableCurrencies.map((currency) => (
                    <SelectItem key={currency._id} value={currency._id}>
                      {currency.currency_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tax Percentage</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={localValue.tax_rate}
                  onChange={(e) => handleTaxRateChange(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Tax Method</Label>
                <Select value={localValue.tax_type} onValueChange={handleTaxTypeChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    <SelectItem value="exclusive">Exclusive</SelectItem>
                    <SelectItem value="inclusive">Inclusive</SelectItem>
                    <SelectItem value="zero_gst">Zero GST</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Net Amount</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={localValue.net_amount}
                  onChange={(e) => handleNetAmountChange(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Total Tax</Label>
                <Input
                  type="number"
                  value={localValue.total_tax}
                  readOnly
                  className="bg-muted"
                />
              </div>
            </div>
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={handleSave} className="bg-purple-600 hover:bg-purple-700">
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CostEditDialog;
