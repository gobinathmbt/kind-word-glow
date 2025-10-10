import React, { useState, useEffect } from "react";
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
import { formatApiNames } from "@/utils/GlobalUtils";

interface CostEntryFieldProps {
  costType: any;
  availableCurrencies: any[];
  value: any;
  onChange: (value: any) => void;
}

const CostEntryField: React.FC<CostEntryFieldProps> = ({
  costType,
  availableCurrencies,
  value,
  onChange,
}) => {
  const [currencyDialogOpen, setCurrencyDialogOpen] = useState(false);
  const [localValue, setLocalValue] = useState({
    currency: costType.currency_id,
    exchange_rate: costType.currency_id?.exchange_rate || 1,
    tax_rate: costType.default_tax_rate || "0",
    tax_type: costType.default_tax_type || "exclusive",
    net_amount: "0",
    total_tax: "0",
    total_amount: "0",
  });

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
    onChange(updated);
  };

  const handleTaxRateChange = (rate: string) => {
    const calculated = calculateTax(localValue.net_amount, rate, localValue.tax_type);
    const updated = {
      ...localValue,
      tax_rate: rate,
      ...calculated,
    };
    setLocalValue(updated);
    onChange(updated);
  };

  const handleTaxTypeChange = (type: string) => {
    const calculated = calculateTax(localValue.net_amount, localValue.tax_rate, type);
    const updated = {
      ...localValue,
      tax_type: type,
      ...calculated,
    };
    setLocalValue(updated);
    onChange(updated);
  };

  const handleCurrencyChange = (currency: any) => {
    const updated = {
      ...localValue,
      currency: currency,
      exchange_rate: currency.exchange_rate,
    };
    setLocalValue(updated);
    onChange(updated);
  };

  const handleExchangeRateChange = (rate: string) => {
    const updated = {
      ...localValue,
      exchange_rate: parseFloat(rate) || 0,
    };
    setLocalValue(updated);
    onChange(updated);
  };

  return (
    <div className="space-y-3 p-4 border rounded-lg bg-card">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-sm">{formatApiNames(costType.cost_type)}</h4>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Currency</Label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-1 justify-start"
              onClick={() => costType.change_currency && setCurrencyDialogOpen(true)}
              disabled={!costType.change_currency}
            >
              {localValue.currency?.symbol} - {localValue.currency?.currency_code}
            </Button>
          </div>
        </div>

    

        <div className="space-y-1.5">
          <Label className="text-xs">Tax Rate (%)</Label>
          <Input
            type="number"
            step="0.01"
            value={localValue.tax_rate}
            onChange={(e) => handleTaxRateChange(e.target.value)}
            className="h-9"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Tax Type</Label>
          <Select value={localValue.tax_type} onValueChange={handleTaxTypeChange}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="exclusive">Exclusive</SelectItem>
              <SelectItem value="inclusive">Inclusive</SelectItem>
              <SelectItem value="zero_gst">Zero GST</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Net Amount</Label>
          <Input
            type="number"
            step="0.01"
            value={localValue.net_amount}
            onChange={(e) => handleNetAmountChange(e.target.value)}
            className="h-9"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Total Tax</Label>
          <Input
            type="number"
            value={localValue.total_tax}
            readOnly
            className="h-9 bg-muted"
          />
        </div>
      </div>

      <div className="pt-2 border-t">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Total Amount:</span>
          <span className="text-sm font-bold">
            {localValue.currency?.symbol} {localValue.total_amount}
          </span>
        </div>
      </div>
    </div>
  );
};

export default CostEntryField;
