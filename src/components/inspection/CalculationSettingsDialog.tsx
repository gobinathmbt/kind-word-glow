import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Settings, Trash2, Calculator, Save, X } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { configServices } from "@/api/services";

interface CalculationSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  configId: string;
  categoryId: string;
  category: any;
  configType: "inspection" | "tradein";
}

const CalculationSettingsDialog: React.FC<CalculationSettingsDialogProps> = ({
  isOpen,
  onClose,
  configId,
  categoryId,
  category,
  configType,
}) => {
  const queryClient = useQueryClient();
  const [isNewCalculationDialogOpen, setIsNewCalculationDialogOpen] =
    useState(false);
  const [isFormulaDialogOpen, setIsFormulaDialogOpen] = useState(false);
  const [selectedCalculation, setSelectedCalculation] = useState<any>(null);
  const [newCalculationData, setNewCalculationData] = useState({
    display_name: "",
    internal_name: "",
  });
  const [formulaBuilder, setFormulaBuilder] = useState<any[]>([]);

  // Get all calculation fields in this category
  const getCalculationFields = () => {
    const fields: any[] = [];
    if (configType === "inspection") {
      category?.sections?.forEach((section: any) => {
        section.fields?.forEach((field: any) => {
          if (
            field.field_type === "number" ||
            field.field_type === "currency" ||
            field.field_type === "calculation_field" ||
            field.field_type === "mutiplier"
          ) {
            fields.push({
              ...field,
              section_name: section.section_name,
            });
          }
        });
      });
    } else {
      category?.sections?.forEach((section: any) => {
        section.fields?.forEach((field: any) => {
          if (
            field.field_type === "number" ||
            field.field_type === "currency" ||
            field.field_type === "calculation_field" ||
            field.field_type === "mutiplier"
          ) {
            fields.push({
              ...field,
              section_name: section.section_name,
            });
          }
        });
      });
    }
    return fields;
  };

  // Add calculation mutation
  const addCalculationMutation = useMutation({
    mutationFn: async (data: any) => {
      if (configType === "inspection") {
        return await configServices.addInspectionCalculation(
          configId,
          categoryId,
          data
        );
      } else {
        return await configServices.addTradeinCalculation(configId, data);
      }
    },
    onSuccess: () => {
      toast.success("Calculation added successfully");
      setIsNewCalculationDialogOpen(false);
      setNewCalculationData({ display_name: "", internal_name: "" });
      queryClient.invalidateQueries({
        queryKey: [`${configType}-config-details`],
      });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to add calculation");
    },
  });

  // Update formula mutation
  const updateFormulaMutation = useMutation({
    mutationFn: async ({
      calculationId,
      formula,
    }: {
      calculationId: string;
      formula: any[];
    }) => {
      if (configType === "inspection") {
        return await configServices.updateInspectionCalculationFormula(
          configId,
          categoryId,
          calculationId,
          formula
        );
      } else {
        return await configServices.updateTradeinCalculationFormula(
          configId,
          calculationId,
          formula
        );
      }
    },
    onSuccess: () => {
      toast.success("Formula updated successfully");
      setIsFormulaDialogOpen(false);
      setSelectedCalculation(null);
      setFormulaBuilder([]);
      queryClient.invalidateQueries({
        queryKey: [`${configType}-config-details`],
      });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to update formula");
    },
  });

  // Delete calculation mutation
  const deleteCalculationMutation = useMutation({
    mutationFn: async (calculationId: string) => {
      if (configType === "inspection") {
        return await configServices.deleteInspectionCalculation(
          configId,
          categoryId,
          calculationId
        );
      } else {
        return await configServices.deleteTradeinCalculation(
          configId,
          calculationId
        );
      }
    },
    onSuccess: () => {
      toast.success("Calculation deleted successfully");
      queryClient.invalidateQueries({
        queryKey: [`${configType}-config-details`],
      });
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to delete calculation"
      );
    },
  });

  // Toggle calculation status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: async ({
      calculationId,
      isActive,
    }: {
      calculationId: string;
      isActive: boolean;
    }) => {
      if (configType === "inspection") {
        return await configServices.toggleInspectionCalculationStatus(
          configId,
          categoryId,
          calculationId,
          isActive
        );
      } else {
        return await configServices.toggleTradeinCalculationStatus(
          configId,
          calculationId,
          isActive
        );
      }
    },
    onSuccess: () => {
      toast.success("Calculation status updated successfully");
      queryClient.invalidateQueries({
        queryKey: [`${configType}-config-details`],
      });
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to update calculation status"
      );
    },
  });

  const handleAddCalculation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCalculationData.display_name || !newCalculationData.internal_name) {
      toast.error("Please fill in all required fields", {
        position: "top-right",
      });
      return;
    }
    addCalculationMutation.mutate(newCalculationData);
  };

  const handleConfigureFormula = (calculation: any) => {
    setSelectedCalculation(calculation);
    setFormulaBuilder(calculation.formula || []);
    setIsFormulaDialogOpen(true);
  };

  const addFormulaElement = (type: "field" | "operation", value: string) => {
    const newElement = {
      [type === "field" ? "field_id" : "operation"]: value,
      order: formulaBuilder.length,
    };
    setFormulaBuilder([...formulaBuilder, newElement]);
  };

  const removeFormulaElement = (index: number) => {
    setFormulaBuilder(formulaBuilder.filter((_, i) => i !== index));
  };

  const handleSaveFormula = () => {
    if (!selectedCalculation) return;
    updateFormulaMutation.mutate({
      calculationId: selectedCalculation.calculation_id,
      formula: formulaBuilder,
    });
  };

  const calculations = category?.calculations || [];
  const calculationFields = getCalculationFields();

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Calculation Settings - {category?.category_name}
            </DialogTitle>
            <DialogDescription>
              Manage calculations for this{" "}
              {configType === "inspection" ? "category" : "configuration"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Header with Add Button */}
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Calculations</h3>
              <Button onClick={() => setIsNewCalculationDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Calculation
              </Button>
            </div>

            {/* Calculations List */}
            {calculations.length > 0 ? (
              <div className="space-y-4">
                {calculations.map((calculation: any) => (
                  <Card key={calculation.calculation_id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-base">
                            {calculation.display_name}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">
                            {calculation.internal_name}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={calculation.is_active}
                            onCheckedChange={(checked) =>
                              toggleStatusMutation.mutate({
                                calculationId: calculation.calculation_id,
                                isActive: checked,
                              })
                            }
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleConfigureFormula(calculation)}
                          >
                            <Settings className="h-4 w-4 mr-2" />
                            Configure
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              deleteCalculationMutation.mutate(
                                calculation.calculation_id
                              )
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm">
                        <p className="text-muted-foreground">Formula:</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {calculation.formula?.length > 0 ? (
                            calculation.formula.map(
                              (element: any, index: number) => (
                                <Badge key={index} variant="outline">
                                  {element.field_id
                                    ? calculationFields.find(
                                        (f) => f.field_id === element.field_id
                                      )?.field_name || element.field_id
                                    : element.operation}
                                </Badge>
                              )
                            )
                          ) : (
                            <span className="text-muted-foreground">
                              No formula configured
                            </span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Calculator className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  No calculations configured
                </p>
                <p className="text-sm text-muted-foreground">
                  Click "New Calculation" to get started
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* New Calculation Dialog */}
      <Dialog
        open={isNewCalculationDialogOpen}
        onOpenChange={setIsNewCalculationDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Calculation</DialogTitle>
            <DialogDescription>
              Create a new calculation for this{" "}
              {configType === "inspection" ? "category" : "configuration"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddCalculation} className="space-y-4">
            <div>
              <Label htmlFor="display_name">Display Name</Label>
              <Input
                id="display_name"
                value={newCalculationData.display_name}
                onChange={(e) => {
                  const displayName = e.target.value;
                  const internalName = displayName
                    .toLowerCase()
                    .replace(/\s+/g, "_") // Replace spaces with underscores
                    .replace(/[^a-z0-9_]/g, ""); // Remove any non-alphanumeric characters except underscores

                  setNewCalculationData({
                    ...newCalculationData,
                    display_name: displayName,
                    internal_name: internalName,
                  });
                }}
                placeholder="Total Score"
                required
              />
            </div>
            <div>
              <Label htmlFor="internal_name">Internal Name</Label>
              <Input
                id="internal_name"
                value={newCalculationData.internal_name}
                disabled // This disables the input field
                placeholder="total_score"
                required
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsNewCalculationDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={addCalculationMutation.isPending}>
                {addCalculationMutation.isPending
                  ? "Creating..."
                  : "Create Calculation"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Formula Builder Dialog */}
      <Dialog open={isFormulaDialogOpen} onOpenChange={setIsFormulaDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Configure Formula - {selectedCalculation?.display_name}
            </DialogTitle>
            <DialogDescription>
              Build a mathematical formula using available fields
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Available Fields */}
            <div>
              <h4 className="font-medium mb-3">Available Fields</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {calculationFields.map((field: any) => (
                  <Button
                    key={field.field_id}
                    variant="outline"
                    size="sm"
                    onClick={() => addFormulaElement("field", field.field_id)}
                    className="justify-start"
                  >
                    {field.field_name}
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {field.section_name}
                    </Badge>
                  </Button>
                ))}
              </div>
            </div>

            {/* Operations */}
            <div>
              <h4 className="font-medium mb-3">Operations</h4>
              <div className="flex gap-2">
                {["+", "-", "*", "/", "(", ")"].map((op) => (
                  <Button
                    key={op}
                    variant="outline"
                    size="sm"
                    onClick={() => addFormulaElement("operation", op)}
                  >
                    {op}
                  </Button>
                ))}
              </div>
            </div>

            {/* Formula Preview */}
            <div>
              <h4 className="font-medium mb-3">Formula</h4>
              <div className="min-h-[100px] p-4 border rounded-lg bg-muted/50">
                {formulaBuilder.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {formulaBuilder.map((element: any, index: number) => (
                      <div key={index} className="flex items-center gap-1">
                        <Badge variant="default" className="relative">
                          {element.field_id
                            ? calculationFields.find(
                                (f) => f.field_id === element.field_id
                              )?.field_name || element.field_id
                            : element.operation}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="absolute -top-2 -right-2 h-4 w-4 p-0 bg-destructive text-destructive-foreground rounded-full"
                            onClick={() => removeFormulaElement(index)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">
                    Click on fields and operations above to build your formula
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setIsFormulaDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveFormula}
                disabled={
                  updateFormulaMutation.isPending || formulaBuilder.length === 0
                }
              >
                <Save className="h-4 w-4 mr-2" />
                {updateFormulaMutation.isPending ? "Saving..." : "Save Formula"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CalculationSettingsDialog;
