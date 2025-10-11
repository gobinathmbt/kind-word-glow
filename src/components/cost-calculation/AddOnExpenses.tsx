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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Edit, Trash2, FileUp, ArrowLeftRight } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import {
  supplierServices,
  dealershipServices,
  workshopServices,
} from "@/api/services";
import { formatApiNames } from "@/utils/GlobalUtils";
import CostEditDialog from "./CostEditDialog";

interface AddOnExpense {
  _id?: string;
  type: string; // reconditioning or after_sale
  date: string;
  supplier_id?: string;
  supplier_name?: string;
  reference: string;
  category: string;
  dealership_id?: string;
  dealership_name?: string;
  description: string;
  currency: any;
  exchange_rate: number;
  tax_rate: string;
  tax_type: string;
  net_amount: string;
  total_tax: string;
  total_amount: string;
  is_estimated: boolean;
}

interface AddOnExpensesProps {
  vehicleId: string;
  vehicleType: string;
  defaultDealershipId?: string;
  companyCurrency: string;
  expenses: AddOnExpense[];
  onChange: (expenses: AddOnExpense[]) => void;
  availableCurrencies: any[];
}

const AddOnExpenses: React.FC<AddOnExpensesProps> = ({
  vehicleId,
  vehicleType,
  defaultDealershipId,
  companyCurrency,
  expenses,
  onChange,
  availableCurrencies,
}) => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<AddOnExpense | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isCostEditDialogOpen, setIsCostEditDialogOpen] = useState(false);
  const [currentCostEdit, setCurrentCostEdit] = useState<any>(null);

  const [formData, setFormData] = useState<AddOnExpense>({
    type: "reconditioning",
    date: new Date().toISOString().split("T")[0],
    supplier_id: "",
    supplier_name: "",
    reference: "",
    category: "",
    dealership_id: defaultDealershipId || "",
    dealership_name: "",
    description: "",
    currency: availableCurrencies.find((c) => c.currency_code === companyCurrency),
    exchange_rate: 1,
    tax_rate: "0",
    tax_type: "exclusive",
    net_amount: "0",
    total_tax: "0",
    total_amount: "0",
    is_estimated: false,
  });

  // Fetch suppliers
  const { data: suppliersData } = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const response = await supplierServices.getSuppliers({});
      return response.data;
    },
  });

  // Fetch dealerships
  const { data: dealershipsData } = useQuery({
    queryKey: ["dealerships-dropdown"],
    queryFn: async () => {
      const response = await dealershipServices.getDealershipsDropdown();
      return response.data.data;
    },
  });

  // Fetch workshop reports
  const { data: workshopReportsData, refetch: refetchReports } = useQuery({
    queryKey: ["workshop-reports", vehicleId, vehicleType],
    queryFn: async () => {
      const response = await workshopServices.getWorkshopReports(vehicleId, vehicleType);
      return response.data.data;
    },
    enabled: false,
  });

  const suppliers = suppliersData?.data || [];
  const dealerships = dealershipsData || [];

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
    const calculated = calculateTax(amount, formData.tax_rate, formData.tax_type);
    setFormData({
      ...formData,
      net_amount: amount,
      ...calculated,
    });
  };

  const handleOpenCostEdit = () => {
    setCurrentCostEdit({
      cost_type: "Expense Amount",
      currency_id: formData.currency,
      default_tax_rate: formData.tax_rate,
      default_tax_type: formData.tax_type,
      change_currency: true,
    });
    setIsCostEditDialogOpen(true);
  };

  const handleCostEditChange = (value: any) => {
    setFormData({
      ...formData,
      currency: value.currency,
      exchange_rate: value.exchange_rate,
      tax_rate: value.tax_rate,
      tax_type: value.tax_type,
      net_amount: value.net_amount,
      total_tax: value.total_tax,
      total_amount: value.total_amount,
    });
  };

  const handleSubmitExpense = () => {
    if (!formData.type || !formData.date) {
      toast.error("Type and date are required");
      return;
    }

    const supplierName = formData.supplier_id
      ? suppliers.find((s) => s._id === formData.supplier_id)?.name || ""
      : "";

    const dealershipName = formData.dealership_id
      ? dealerships.find((d) => d._id === formData.dealership_id)?.dealership_name || ""
      : "";

    const newExpense = {
      ...formData,
      supplier_name: supplierName,
      dealership_name: dealershipName,
    };

    if (editingIndex !== null) {
      const updated = [...expenses];
      updated[editingIndex] = newExpense;
      onChange(updated);
      toast.success("Expense updated");
    } else {
      onChange([...expenses, newExpense]);
      toast.success("Expense added");
    }

    handleCloseDialog();
  };

  const handleEditExpense = (expense: AddOnExpense, index: number) => {
    setFormData(expense);
    setEditingExpense(expense);
    setEditingIndex(index);
    setIsAddDialogOpen(true);
  };

  const handleDeleteExpense = (index: number) => {
    const updated = expenses.filter((_, i) => i !== index);
    onChange(updated);
    toast.success("Expense deleted");
  };

  const handleCloseDialog = () => {
    setIsAddDialogOpen(false);
    setEditingExpense(null);
    setEditingIndex(null);
    setFormData({
      type: "reconditioning",
      date: new Date().toISOString().split("T")[0],
      supplier_id: "",
      supplier_name: "",
      reference: "",
      category: "",
      dealership_id: defaultDealershipId || "",
      dealership_name: "",
      description: "",
      currency: availableCurrencies.find((c) => c.currency_code === companyCurrency),
      exchange_rate: 1,
      tax_rate: "0",
      tax_type: "exclusive",
      net_amount: "0",
      total_tax: "0",
      total_amount: "0",
      is_estimated: false,
    });
  };

  const handleOpenImportDialog = () => {
    refetchReports();
    setIsImportDialogOpen(true);
  };

  const handleImportWorkshopEntry = (quote: any, entry: any) => {
    const supplierName = quote.approved_supplier?.supplier_name || "";
    const supplierId = quote.approved_supplier?.supplier_id || "";
    
    const totalAmount = (parseFloat(entry.parts_cost || "0") + parseFloat(entry.labor_cost || "0")).toFixed(2);
    const gst = parseFloat(entry.gst || "0").toFixed(2);

    const newExpense: AddOnExpense = {
      type: "reconditioning",
      date: entry.entry_date_time ? new Date(entry.entry_date_time).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
      supplier_id: supplierId,
      supplier_name: supplierName,
      reference: quote.field_name || "",
      category: quote.category_name || "",
      dealership_id: defaultDealershipId || "",
      dealership_name: dealerships.find((d) => d._id === defaultDealershipId)?.dealership_name || "",
      description: entry.description || "",
      currency: availableCurrencies.find((c) => c.currency_code === companyCurrency),
      exchange_rate: 1,
      tax_rate: "0",
      tax_type: "exclusive",
      net_amount: totalAmount,
      total_tax: gst,
      total_amount: (parseFloat(totalAmount) + parseFloat(gst)).toFixed(2),
      is_estimated: false,
    };

    onChange([...expenses, newExpense]);
    toast.success("Workshop entry imported");
  };

  return (
    <div className="border rounded-md bg-card shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-muted/30 border-b">
        <h4 className="font-semibold text-sm">AddOns/Expenses</h4>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleOpenImportDialog}
            className="h-8 gap-2"
          >
            <FileUp className="h-3.5 w-3.5" />
            Import
          </Button>
          <Button
            size="sm"
            onClick={() => setIsAddDialogOpen(true)}
            className="h-8 gap-2 bg-purple-600 hover:bg-purple-700"
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="text-xs">Actions</TableHead>
              <TableHead className="text-xs">Type</TableHead>
              <TableHead className="text-xs">Date</TableHead>
              <TableHead className="text-xs">Supplier</TableHead>
              <TableHead className="text-xs">Reference</TableHead>
              <TableHead className="text-xs">Category</TableHead>
              <TableHead className="text-xs">Dealership</TableHead>
              <TableHead className="text-xs">Description</TableHead>
              <TableHead className="text-xs">Purchase</TableHead>
              <TableHead className="text-xs">Base Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center text-muted-foreground text-xs py-4">
                  No expenses added yet
                </TableCell>
              </TableRow>
            ) : (
              expenses.map((expense, index) => (
                <TableRow key={index} className="hover:bg-muted/30">
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEditExpense(expense, index)}
                        className="h-7 w-7 p-0"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteExpense(index)}
                        className="h-7 w-7 p-0 text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">{formatApiNames(expense.type)}</TableCell>
                  <TableCell className="text-xs">{expense.date}</TableCell>
                  <TableCell className="text-xs">{expense.supplier_name || "-"}</TableCell>
                  <TableCell className="text-xs">{expense.reference || "-"}</TableCell>
                  <TableCell className="text-xs">{expense.category || "-"}</TableCell>
                  <TableCell className="text-xs">{expense.dealership_name || "-"}</TableCell>
                  <TableCell className="text-xs max-w-[150px] truncate">{expense.description || "-"}</TableCell>
                  <TableCell className={`text-xs ${expense.is_estimated ? 'text-amber-600' : 'text-green-600'}`}>
                    {expense.currency?.symbol} {expense.total_amount}
                    {expense.is_estimated && " (Est)"}
                  </TableCell>
                  <TableCell className={`text-xs ${expense.is_estimated ? 'text-amber-600' : 'text-green-600'}`}>
                    {companyCurrency} {(parseFloat(expense.total_amount) * expense.exchange_rate).toFixed(2)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add/Edit Expense Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingExpense ? "Edit" : "Add"} Expense</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    <SelectItem value="reconditioning">Reconditioning</SelectItem>
                    <SelectItem value="after_sale">After Sale</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Supplier</Label>
                <Select
                  value={formData.supplier_id}
                  onValueChange={(value) => setFormData({ ...formData, supplier_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select supplier" />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    {suppliers.map((supplier: any) => (
                      <SelectItem key={supplier._id} value={supplier._id}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Dealership</Label>
                <Select
                  value={formData.dealership_id}
                  onValueChange={(value) => setFormData({ ...formData, dealership_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select dealership" />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    {dealerships.map((dealership: any) => (
                      <SelectItem key={dealership._id} value={dealership._id}>
                        {formatApiNames(dealership.dealership_name)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Reference</Label>
                <Input
                  value={formData.reference}
                  onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                  placeholder="Enter reference"
                />
              </div>

              <div className="space-y-2">
                <Label>Category</Label>
                <Input
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="Enter category"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Expense Amount</Label>
              <div className="flex items-center gap-2 p-3 border rounded-lg bg-muted/30">
                <div className="flex-1">
                  <div className="text-xs font-medium">
                    {formData.currency?.symbol} {formData.total_amount}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    (GST {formData.total_tax})
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleOpenCostEdit}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <ArrowLeftRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_estimated"
                checked={formData.is_estimated}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_estimated: checked as boolean })
                }
              />
              <Label htmlFor="is_estimated" className="cursor-pointer">
                Estimated Price
              </Label>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter description"
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmitExpense}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {editingExpense ? "Update" : "Add"} Expense
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import Workshop Reports Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Import Workshop Reports</DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[70vh]">
            {workshopReportsData?.reports?.map((report: any) => (
              <div key={report._id} className="space-y-4 mb-6">
                <div className="font-semibold text-sm bg-muted/50 p-2 rounded">
                  {report.stage_name || "Workshop Report"}
                </div>
                {report.quotes_data?.map((quote: any) => (
                  <div key={quote._id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-sm">{quote.field_name}</div>
                        <div className="text-xs text-muted-foreground">
                          Supplier: {quote.approved_supplier?.supplier_name || "N/A"}
                        </div>
                      </div>
                      <div className="text-sm font-semibold">
                        Total: {companyCurrency} {quote.work_details?.total_amount?.toFixed(2) || "0.00"}
                      </div>
                    </div>
                    
                    {quote.work_details?.work_entries?.length > 0 && (
                      <div className="space-y-1">
                        {quote.work_details.work_entries.map((entry: any) => (
                          <div
                            key={entry._id}
                            className="flex items-center justify-between text-xs bg-muted/30 p-2 rounded hover:bg-muted/50"
                          >
                            <div className="flex-1">
                              <div>{entry.description}</div>
                              <div className="text-muted-foreground">
                                Parts: {entry.parts_cost} | Labor: {entry.labor_cost} | GST: {entry.gst}
                              </div>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => handleImportWorkshopEntry(quote, entry)}
                              className="h-7 bg-purple-600 hover:bg-purple-700"
                            >
                              Import
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </ScrollArea>

          <div className="flex justify-end pt-4">
            <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cost Edit Dialog */}
      {isCostEditDialogOpen && currentCostEdit && (
        <CostEditDialog
          open={isCostEditDialogOpen}
          onClose={() => setIsCostEditDialogOpen(false)}
          costType={currentCostEdit}
          value={{
            currency: formData.currency,
            exchange_rate: formData.exchange_rate,
            tax_rate: formData.tax_rate,
            tax_type: formData.tax_type,
            net_amount: formData.net_amount,
            total_tax: formData.total_tax,
            total_amount: formData.total_amount,
          }}
          onChange={(value) => {
            handleCostEditChange(value);
            setIsCostEditDialogOpen(false);
          }}
          availableCurrencies={availableCurrencies}
        />
      )}
    </div>
  );
};

export default AddOnExpenses;
