import React, { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  supplierServices,
  workshopServices,
  companyServices,
} from "@/api/services";
import { toast } from "sonner";
import {
  DollarSign,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface QuoteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  field: any;
  onSuccess: () => void;
  existingQuote?: any;
}

interface MultiSelectDropdownProps {
  options: any[];
  selectedValues: string[];
  onSelectionChange: (values: string[]) => void;
  placeholder: string;
}

const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({
  options,
  selectedValues,
  onSelectionChange,
  placeholder,
}) => {
  const [open, setOpen] = useState(false);

  const toggleOption = (displayValue: string) => {
    const isSelected = selectedValues.includes(displayValue);
    if (isSelected) {
      onSelectionChange(selectedValues.filter((item) => item !== displayValue));
    } else {
      onSelectionChange([...selectedValues, displayValue]);
    }
  };

  const removeItem = (valueToRemove: string) => {
    onSelectionChange(selectedValues.filter((item) => item !== valueToRemove));
  };

  const clearAll = () => {
    onSelectionChange([]);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-auto min-h-10 px-3 py-2"
        >
          <div className="flex flex-wrap gap-1 flex-1">
            {selectedValues.length === 0 ? (
              <span className="text-muted-foreground">{placeholder}</span>
            ) : (
              selectedValues.map((value, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {value}
                  <X
                    className="ml-1 h-3 w-3 cursor-pointer hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeItem(value);
                    }}
                  />
                </Badge>
              ))
            )}
          </div>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="Search tags..." className="h-9" />
          <CommandEmpty>No tags found.</CommandEmpty>
          <CommandGroup>
            {selectedValues.length > 0 && (
              <CommandItem
                onSelect={clearAll}
                className="justify-center text-center cursor-pointer"
              >
                Clear all
              </CommandItem>
            )}
            {options.map((option) => {
              const isSelected = selectedValues.includes(option.display_value);
              return (
                <CommandItem
                  key={option.option_value}
                  onSelect={() => toggleOption(option.display_value)}
                  className="cursor-pointer"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      isSelected ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option.display_value}
                </CommandItem>
              );
            })}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

const QuoteModal: React.FC<QuoteModalProps> = ({
  open,
  onOpenChange,
  field,
  onSuccess,
  existingQuote,
}) => {
  const [currentStep, setCurrentStep] = useState(1); 
  const [quoteAmount, setQuoteAmount] = useState(
    existingQuote?.quote_amount?.toString() || ""
  );
  const [description, setDescription] = useState(
    existingQuote?.quote_description || ""
  );
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([]);
  const [searchTags, setSearchTags] = useState<string[]>([]);
  const [searchText, setSearchText] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  const { data: supplierTags } = useQuery({
    queryKey: ["supplier-tags"],
    queryFn: async () => {
      const response = await companyServices.getCompanyMasterdropdownvalues({
        dropdown_name: ["tradie_tags"],
      });
      return response.data?.data[0]?.values || [];
    },
  });

  const { data: suppliers, isLoading: suppliersLoading } = useQuery({
    queryKey: ["suppliers-search", searchTags, searchText],
    queryFn: async () => {
      const response = await supplierServices.searchSuppliersByTags({
        tags: searchTags,
        search: searchText,
      });

      let filteredSuppliers = response.data?.data || [];
      if (existingQuote) {
        const existingSupplierIds = existingQuote.selected_suppliers.map(
          (s) => s._id || s
        );
        filteredSuppliers = filteredSuppliers.filter(
          (supplier) => !existingSupplierIds.includes(supplier._id)
        );
      }
      return filteredSuppliers;
    },
    enabled: currentStep === 2,
  });

  const createQuoteMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await workshopServices.createQuote(data);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Quote sent to suppliers successfully");
      onSuccess();
      resetModal();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to send quote");
    },
  });

  const resetModal = () => {
    setCurrentStep(1);
    setQuoteAmount(existingQuote?.quote_amount?.toString() || "");
    setDescription(existingQuote?.quote_description || "");
    setSelectedSuppliers([]);
    setSearchTags([]);
    setSearchText("");
    setCurrentPage(1);
  };

  const handleNext = () => {
    if (!quoteAmount) {
      toast.error("Please enter estimation amount");
      return;
    }
    setCurrentStep(2);
  };

  const handleBack = () => {
    setCurrentStep(1);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedSuppliers.length === 0) {
      toast.error("Please select at least one supplier");
      return;
    }

    createQuoteMutation.mutate({
      vehicle_type: field.vehicle_type,
      vehicle_stock_id: field.vehicle_stock_id,
      field_id: field.field_id,
      field_name: field.field_name,
      quote_amount: parseFloat(quoteAmount),
      quote_description: description,
      selected_suppliers: selectedSuppliers,
      images: field.images,
      videos: field.videos,
    });
  };

  const toggleSupplierSelection = (supplierId: string) => {
    setSelectedSuppliers((prev) =>
      prev.includes(supplierId)
        ? prev.filter((id) => id !== supplierId)
        : [...prev, supplierId]
    );
  };

  const handleBulkSelect = (checked: boolean) => {
    if (checked) {
      const currentPageSuppliers = paginatedSuppliers.map(
        (supplier) => supplier._id
      );
      setSelectedSuppliers((prev) => [
        ...new Set([...prev, ...currentPageSuppliers]),
      ]);
    } else {
      const currentPageSuppliers = paginatedSuppliers.map(
        (supplier) => supplier._id
      );
      setSelectedSuppliers((prev) =>
        prev.filter((id) => !currentPageSuppliers.includes(id))
      );
    }
  };

  const totalPages = Math.ceil((suppliers?.length || 0) / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedSuppliers =
    suppliers?.slice(startIndex, startIndex + itemsPerPage) || [];

  const allCurrentPageSelected =
    paginatedSuppliers.length > 0 &&
    paginatedSuppliers.every((supplier) =>
      selectedSuppliers.includes(supplier._id)
    );

  const handleModalClose = (openState: boolean) => {
    if (!openState) {
      resetModal();
    }
    onOpenChange(openState);
  };

  return (
    <Dialog open={open} onOpenChange={handleModalClose}>
      <DialogContent className="max-w-6xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Send Quote for {field?.field_name}
            <Badge variant="outline" className="ml-2">
              Step {currentStep} of 2
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {currentStep === 1 && (
          <div className="space-y-6">

            <div className="bg-muted/50 p-4 rounded-lg">
              <h3 className="font-medium mb-2">Field Details</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Field:</span>
                  <p className="font-medium">{field?.field_name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Type:</span>
                  <p className="font-medium">{field?.field_type}</p>
                </div>
                {field?.field_value && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">
                      Current Value:
                    </span>
                    <p className="font-medium">
                      {typeof field.field_value === "object"
                        ? JSON.stringify(field.field_value)
                        : field.field_value}
                    </p>
                  </div>
                )}

                {field.images && field.images.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-medium mb-2">Field Images</h4>
                    <div className="grid grid-cols-3 gap-2">
                      {field.images.map((image: string, index: number) => (
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

                {field.videos && field.videos.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-medium mb-2">Field Videos</h4>
                    <div className="grid grid-cols-3 gap-2">
                      {field.videos.map((video: string, index: number) => (
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
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Additional details (optional)"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleModalClose(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleNext}
                disabled={!quoteAmount}
              >
                Next: Select Suppliers
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-6">

            <div className="bg-muted/50 p-3 rounded-lg">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-sm text-muted-foreground">
                    Expected Estimation:
                  </span>
                  <span className="ml-2 font-medium">${quoteAmount}</span>
                </div>
                {description && (
                  <div>
                    <span className="text-sm text-muted-foreground">
                      Description:
                    </span>
                    <span className="ml-2 text-sm">{description}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search suppliers..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div>
                <MultiSelectDropdown
                  options={supplierTags || []}
                  selectedValues={searchTags}
                  onSelectionChange={setSearchTags}
                  placeholder="Filter by Tags"
                />
              </div>

              <div className="flex items-center gap-2">
                <Label className="text-sm whitespace-nowrap">Per page:</Label>
                <Select
                  value={itemsPerPage.toString()}
                  onValueChange={(value) => {
                    setItemsPerPage(Number(value));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="15">15</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="border rounded-lg">
              {suppliersLoading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Loading suppliers...
                  </p>
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={allCurrentPageSelected}
                            onCheckedChange={handleBulkSelect}
                          />
                        </TableHead>
                        <TableHead>S.No</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Shop Name</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedSuppliers.length > 0 ? (
                        paginatedSuppliers.map((supplier, index) => (
                          <TableRow key={supplier._id}>
                            <TableCell>
                              <Checkbox
                                checked={selectedSuppliers.includes(
                                  supplier._id
                                )}
                                onCheckedChange={() =>
                                  toggleSupplierSelection(supplier._id)
                                }
                              />
                            </TableCell>
                            <TableCell>{startIndex + index + 1}</TableCell>
                            <TableCell className="font-medium">
                              {supplier.name}
                            </TableCell>
                            <TableCell>{supplier.email}</TableCell>
                            <TableCell>
                              {supplier.supplier_shop_name || "-"}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell
                            colSpan={6}
                            className="text-center py-8 text-muted-foreground"
                          >
                            No suppliers found matching the criteria
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>

                  {totalPages > 1 && (
                    <div className="flex justify-between items-center p-4 border-t">
                      <div className="text-sm text-muted-foreground">
                        Showing {startIndex + 1} to{" "}
                        {Math.min(
                          startIndex + itemsPerPage,
                          suppliers?.length || 0
                        )}{" "}
                        of {suppliers?.length || 0} entries
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setCurrentPage((prev) => Math.max(1, prev - 1))
                          }
                          disabled={currentPage === 1}
                        >
                          Previous
                        </Button>

                        <div className="flex items-center gap-1">
                          {Array.from(
                            { length: Math.min(5, totalPages) },
                            (_, i) => {
                              const pageNum = i + 1;
                              return (
                                <Button
                                  key={pageNum}
                                  variant={
                                    currentPage === pageNum
                                      ? "default"
                                      : "outline"
                                  }
                                  size="sm"
                                  onClick={() => setCurrentPage(pageNum)}
                                >
                                  {pageNum}
                                </Button>
                              );
                            }
                          )}
                          {totalPages > 5 && (
                            <>
                              <span className="px-2">...</span>
                              <Button
                                variant={
                                  currentPage === totalPages
                                    ? "default"
                                    : "outline"
                                }
                                size="sm"
                                onClick={() => setCurrentPage(totalPages)}
                              >
                                {totalPages}
                              </Button>
                            </>
                          )}
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setCurrentPage((prev) =>
                              Math.min(totalPages, prev + 1)
                            )
                          }
                          disabled={currentPage === totalPages}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {selectedSuppliers.length > 0 && (
              <div className="bg-primary/10 p-3 rounded-lg">
                <p className="text-sm font-medium">
                  {selectedSuppliers.length} supplier(s) selected for quote
                </p>
              </div>
            )}

            <div className="flex justify-between">
              <Button type="button" variant="outline" onClick={handleBack}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleModalClose(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={
                    createQuoteMutation.isPending ||
                    selectedSuppliers.length === 0
                  }
                >
                  {createQuoteMutation.isPending
                    ? existingQuote
                      ? "Updating..."
                      : "Sending..."
                    : `${existingQuote ? "Update" : "Send"} Quote to ${
                        selectedSuppliers.length
                      } Supplier(s)`}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default QuoteModal;
