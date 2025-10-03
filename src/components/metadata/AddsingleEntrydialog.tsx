import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select as ShadcnSelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import Select from "react-select";
import { companyServices } from "@/api/services";

interface AddsingleEntryDialogProps {
  makes: any[];
  onAddEntry: (type: string, data: any) => void;
  isLoading?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
  defaultType?: string;
  typeEditable?: boolean;
}

const AddsingleEntryDialog: React.FC<AddsingleEntryDialogProps> = ({
  makes,
  onAddEntry,
  isLoading = false,
  isOpen = false,
  onClose,
  defaultType = "make",
  typeEditable = true,
}) => {
  const [showAddDialog, setShowAddDialog] = useState(isOpen);
  const [addDialogType, setAddDialogType] = useState(defaultType);
  const [error, setError] = useState<string | null>(null);
  const [addFormData, setAddFormData] = useState({
    displayName: "",
    makeId: "",
    modelId: "",
    modelIds: [] as string[],
    variantId: "",
    year: "",
    bodyId: "",
    yearId: "",
    fuelType: "",
    transmission: "",
    engineCapacity: "",
    power: "",
    torque: "",
    seatingCapacity: "",
  });

  const [availableModels, setAvailableModels] = useState<any[]>([]);
  const [availableVariants, setAvailableVariants] = useState<any[]>([]);
  const [availableBodyTypes, setAvailableBodyTypes] = useState<any[]>([]);
  const [availableYears, setAvailableYears] = useState<any[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [isLoadingVariants, setIsLoadingVariants] = useState(false);
  const [isLoadingYears, setIsLoadingYears] = useState(false);

  // Sync with external open/close state
  useEffect(() => {
    setShowAddDialog(isOpen);
  }, [isOpen]);

  // Set default type when dialog opens
  useEffect(() => {
    if (showAddDialog) {
      setAddDialogType(defaultType);
    }
  }, [showAddDialog, defaultType]);

  const resetAddForm = () => {
    setAddFormData({
      displayName: "",
      year: "",
      makeId: "",
      modelId: "",
      modelIds: [],
      variantId: "",
      bodyId: "",
      yearId: "",
      fuelType: "",
      transmission: "",
      engineCapacity: "",
      power: "",
      torque: "",
      seatingCapacity: "",
    });
    setAvailableModels([]);
    setAvailableVariants([]);
    setAvailableBodyTypes([]);
    setAvailableYears([]);
    setError(null);
  };

  // Reset to default "make" type when dialog is closed
  const handleCloseDialog = () => {
    setShowAddDialog(false);
    if (onClose) {
      onClose();
    }
    resetAddForm();
  };

  // Clear error when form data changes
  useEffect(() => {
    if (error) {
      setError(null);
    }
  }, [addFormData, addDialogType]);

  // Fetch models when make is selected for variant or year
  useEffect(() => {
    if (
      (addDialogType === "variant" ||
        addDialogType === "year" ||
        addDialogType === "metadata") &&
      addFormData.makeId
    ) {
      setIsLoadingModels(true);
      companyServices
        .getCompanyMetaData("models", { makeId: addFormData.makeId })
        .then((response) => {
          setAvailableModels(response.data?.data || []);
          // Reset dependent fields when make changes
          if (addDialogType === "year" || addDialogType === "metadata") {
            setAddFormData((prev) => ({
              ...prev,
              modelId: "",
              variantId: "",
            }));
            setAvailableVariants([]);
            setAvailableYears([]);
          }
        })
        .catch((error) => {
          console.error("Error fetching models:", error);
          setAvailableModels([]);
        })
        .finally(() => {
          setIsLoadingModels(false);
        });
    } else {
      setAvailableModels([]);
      setAvailableVariants([]);
    }
  }, [addDialogType, addFormData.makeId]);

  // Fetch body types for metadata form
  useEffect(() => {
    if (addDialogType === "metadata") {
      companyServices
        .getCompanyMetaData("bodies")
        .then((response) => {
          setAvailableBodyTypes(response.data?.data || []);
        })
        .catch(console.error);
    }
  }, [addDialogType]);

  // Fetch years based on model and variant selection
  useEffect(() => {
    if (
      addDialogType === "metadata" &&
      (addFormData.modelId || addFormData.variantId)
    ) {
      setIsLoadingYears(true);

      const params: any = {};
      if (addFormData.modelId) params.modelId = addFormData.modelId;
      if (addFormData.variantId) params.variantId = addFormData.variantId;

      companyServices
        .getCompanyMetaData("years", params)
        .then((response) => {
          setAvailableYears(response.data?.data || []);
        })
        .catch(console.error)
        .finally(() => {
          setIsLoadingYears(false);
        });
    } else if (addDialogType === "metadata") {
      setAvailableYears([]);
    }
  }, [addDialogType, addFormData.modelId, addFormData.variantId]);

  // Automatically select the model if there's only one available
  useEffect(() => {
    if (addDialogType === "variant" && availableModels.length === 1) {
      const singleModelId = availableModels[0]._id;
      setAddFormData((prev) => ({
        ...prev,
        modelIds: [singleModelId],
      }));
    }
  }, [availableModels, addDialogType, addFormData.modelIds.length]);

  // Fetch variants when model is selected for year or metadata
  useEffect(() => {
    if (
      (addDialogType === "year" || addDialogType === "metadata") &&
      addFormData.modelId
    ) {
      setIsLoadingVariants(true);

      companyServices
        .getCompanyMetaData("variants", { modelId: addFormData.modelId })
        .then((response) => {
          setAvailableVariants(response.data?.data || []);
          // Reset variant when model changes
          setAddFormData((prev) => ({ ...prev, variantId: "" }));
          setAvailableYears([]);
        })
        .catch(console.error)
        .finally(() => {
          setIsLoadingVariants(false);
        });
    } else if (
      (addDialogType === "year" || addDialogType === "metadata") &&
      !addFormData.modelId
    ) {
      setAvailableVariants([]);
      setAddFormData((prev) => ({ ...prev, variantId: "" }));
      setAvailableYears([]);
    }
  }, [addDialogType, addFormData.modelId]);

  const handleAddEntry = async () => {
    // Clear any existing errors
    setError(null);

    // Validation
    if (addDialogType === "year" && !addFormData.year) {
      setError("Year is required");
      return;
    }

    if (
      !addFormData.displayName &&
      addDialogType !== "year" &&
      addDialogType !== "metadata"
    ) {
      setError("Display name is required");
      return;
    }

    if (addDialogType === "model" && !addFormData.makeId) {
      setError("Make is required for models");
      return;
    }

    if (
      addDialogType === "variant" &&
      (!addFormData.displayName || addFormData.modelIds.length === 0)
    ) {
      setError("Variant name and at least one model are required");
      return;
    }

    if (addDialogType === "metadata") {
      if (!addFormData.makeId) {
        setError("Make is required");
        return;
      }
      if (!addFormData.modelId) {
        setError("Model is required");
        return;
      }
      if (!addFormData.variantId) {
        setError("Variant is required");
        return;
      }
      if (!addFormData.bodyId) {
        setError("Body Type is required");
        return;
      }
      if (!addFormData.yearId) {
        setError("Year is required");
        return;
      }
    }

    if (
      addDialogType === "year" &&
      !addFormData.modelId &&
      !addFormData.variantId
    ) {
      setError("Either model or variant must be selected for the year");
      return;
    }

    let data: any = {};

    if (addDialogType === "make") {
      data = { displayName: addFormData.displayName };
    } else if (addDialogType === "model") {
      data = {
        displayName: addFormData.displayName,
        makeId: addFormData.makeId,
      };
    } else if (addDialogType === "variant") {
      data = {
        displayName: addFormData.displayName,
        models: addFormData.modelIds,
      };
    } else if (addDialogType === "body") {
      data = { displayName: addFormData.displayName };
    } else if (addDialogType === "year") {
      data = {
        year: parseInt(addFormData.year),
        displayName: addFormData.year,
      };

      // Add model if selected
      if (addFormData.modelId) {
        data.modelId = addFormData.modelId;
      }

      // Add variant if selected
      if (addFormData.variantId) {
        data.variantId = addFormData.variantId;
      }
    } else if (addDialogType === "metadata") {
      data = {
        makeId: addFormData.makeId,
        modelId: addFormData.modelId,
        variantId: addFormData.variantId,
        bodyId: addFormData.bodyId,
        yearId: addFormData.yearId,
        fuelType: addFormData.fuelType || "",
        transmission: addFormData.transmission || "",
        engineCapacity: addFormData.engineCapacity || "",
        power: addFormData.power || "",
        torque: addFormData.torque || "",
        seatingCapacity: addFormData.seatingCapacity || "",
      };
    }

    try {
      await onAddEntry(addDialogType, { ...data, isActive: true });
      // Only close dialog if successful (no error thrown)
      handleCloseDialog();
    } catch (error: any) {
      // Handle the error without closing the dialog
      const errorMessage =
        error?.response?.data?.message || error?.message || "An error occurred";

      // Check if it's a duplicate error
      if (
        errorMessage.toLowerCase().includes("duplicate") ||
        errorMessage.toLowerCase().includes("already exists") ||
        errorMessage.toLowerCase().includes("unique constraint") ||
        error?.response?.status === 409
      ) {
        setError(`Duplicate entry: ${errorMessage}`);
      } else {
        setError(errorMessage);
      }

      // Also show toast for user feedback
      toast.error(errorMessage);
    }
  };

  // Prepare options for react-select
  const modelOptions = availableModels.map((model) => ({
    value: model._id,
    label: model.displayName,
  }));

  // Handle model selection change
  const handleModelChange = (selectedOptions: any) => {
    const selectedModelIds = selectedOptions
      ? selectedOptions.map((option: any) => option.value)
      : [];
    setAddFormData({ ...addFormData, modelIds: selectedModelIds });
  };

  // Get selected values for react-select
  const selectedModels = modelOptions.filter((option) =>
    addFormData.modelIds.includes(option.value)
  );

  return (
    <Dialog
      open={showAddDialog}
      onOpenChange={(open) => {
        setShowAddDialog(open);
        if (!open) {
          handleCloseDialog();
        }
      }}
    >
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Entry</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Type Selection - Only show if type is editable */}
          {typeEditable && (
            <div className="space-y-2">
              <Label htmlFor="add-dialog-type">Type</Label>
              <ShadcnSelect
                value={addDialogType}
                onValueChange={setAddDialogType}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="make">Make</SelectItem>
                  <SelectItem value="model">Model</SelectItem>
                  <SelectItem value="variant">Variant</SelectItem>
                  <SelectItem value="body">Body Type</SelectItem>
                  <SelectItem value="year">Year</SelectItem>
                  <SelectItem value="metadata">Metadata</SelectItem>
                </SelectContent>
              </ShadcnSelect>
            </div>
          )}

          {/* Display current type if not editable */}
          {!typeEditable && (
            <div className="space-y-2">
              <Label>Type</Label>
              <Input
                value={
                  addDialogType.charAt(0).toUpperCase() + addDialogType.slice(1)
                }
                disabled
                className="bg-gray-100"
              />
            </div>
          )}

          {/* Make Selection (for model, variant, year, metadata) */}
          {(addDialogType === "model" ||
            addDialogType === "variant" ||
            addDialogType === "year" ||
            addDialogType === "metadata") && (
            <div className="space-y-2">
              <Label htmlFor="make-select" className="required">
                Make
              </Label>
              <ShadcnSelect
                value={addFormData.makeId}
                onValueChange={(value) =>
                  setAddFormData({ ...addFormData, makeId: value })
                }
              >
                <SelectTrigger id="make-select">
                  <SelectValue placeholder="Select make" />
                </SelectTrigger>
                <SelectContent>
                  {makes.map((make) => (
                    <SelectItem key={make._id} value={make._id}>
                      {make.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </ShadcnSelect>
            </div>
          )}

          {/* Model Selection (for year, metadata) */}
          {(addDialogType === "year" || addDialogType === "metadata") && (
            <div className="space-y-2">
              <Label htmlFor="model-select" className="required">
                Model
              </Label>
              <ShadcnSelect
                value={addFormData.modelId}
                onValueChange={(value) =>
                  setAddFormData({ ...addFormData, modelId: value })
                }
                disabled={!addFormData.makeId || isLoadingModels}
              >
                <SelectTrigger id="model-select">
                  <SelectValue
                    placeholder={
                      isLoadingModels ? "Loading models..." : "Select model"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {availableModels.map((model) => (
                    <SelectItem key={model._id} value={model._id}>
                      {model.displayName}
                    </SelectItem>
                  ))}
                  {availableModels.length === 0 &&
                    addFormData.makeId &&
                    !isLoadingModels && (
                      <SelectItem value="no-models" disabled>
                        No models found for this make
                      </SelectItem>
                    )}
                </SelectContent>
              </ShadcnSelect>
            </div>
          )}

          {/* Variant Selection (for year, metadata) */}
          {(addDialogType === "year" || addDialogType === "metadata") && (
            <div className="space-y-2">
              <Label htmlFor="variant-select" className="required">
                Variant
              </Label>
              <ShadcnSelect
                value={addFormData.variantId}
                onValueChange={(value) =>
                  setAddFormData({ ...addFormData, variantId: value })
                }
                disabled={!addFormData.modelId || isLoadingVariants}
              >
                <SelectTrigger id="variant-select">
                  <SelectValue
                    placeholder={
                      isLoadingVariants
                        ? "Loading variants..."
                        : "Select variant"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {availableVariants.map((variant) => (
                    <SelectItem key={variant._id} value={variant._id}>
                      {variant.displayName}
                    </SelectItem>
                  ))}
                  {availableVariants.length === 0 &&
                    addFormData.modelId &&
                    !isLoadingVariants && (
                      <SelectItem value="no-variants" disabled>
                        No variants found for this model
                      </SelectItem>
                    )}
                </SelectContent>
              </ShadcnSelect>
            </div>
          )}

          {/* Body Type Selection (for metadata) */}
          {addDialogType === "metadata" && (
            <div className="space-y-2">
              <Label htmlFor="body-select" className="required">
                Body Type
              </Label>
              <ShadcnSelect
                value={addFormData.bodyId}
                onValueChange={(value) =>
                  setAddFormData({ ...addFormData, bodyId: value })
                }
              >
                <SelectTrigger id="body-select">
                  <SelectValue placeholder="Select body type" />
                </SelectTrigger>
                <SelectContent>
                  {availableBodyTypes.map((body) => (
                    <SelectItem key={body._id} value={body._id}>
                      {body.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </ShadcnSelect>
            </div>
          )}

          {/* Year Selection (for metadata) */}
          {addDialogType === "metadata" && (
            <div className="space-y-2">
              <Label htmlFor="year-select" className="required">
                Year
              </Label>
              <ShadcnSelect
                value={addFormData.yearId}
                onValueChange={(value) =>
                  setAddFormData({ ...addFormData, yearId: value })
                }
                disabled={
                  (!addFormData.modelId && !addFormData.variantId) ||
                  isLoadingYears
                }
              >
                <SelectTrigger id="year-select">
                  <SelectValue
                    placeholder={
                      isLoadingYears ? "Loading years..." : "Select year"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.map((year) => (
                    <SelectItem key={year._id} value={year._id}>
                      {year.displayName}
                    </SelectItem>
                  ))}
                  {availableYears.length === 0 &&
                    (addFormData.modelId || addFormData.variantId) &&
                    !isLoadingYears && (
                      <SelectItem value="no-years" disabled>
                        No years found
                      </SelectItem>
                    )}
                </SelectContent>
              </ShadcnSelect>
            </div>
          )}

          {/* Display Name Input (for make, model, variant, body) */}
          {(addDialogType === "make" ||
            addDialogType === "model" ||
            addDialogType === "variant" ||
            addDialogType === "body") && (
            <div className="space-y-2">
              <Label htmlFor="display-name" className="required">
                Display Name
              </Label>
              <Input
                id="display-name"
                value={addFormData.displayName}
                onChange={(e) =>
                  setAddFormData({
                    ...addFormData,
                    displayName: e.target.value,
                  })
                }
                placeholder={`Enter ${addDialogType} name`}
              />
            </div>
          )}

          {/* Year Input (for year type) */}
          {addDialogType === "year" && (
            <div className="space-y-2">
              <Label htmlFor="year-input" className="required">
                Year
              </Label>
              <Input
                id="year-input"
                type="number"
                min="1900"
                max="2100"
                value={addFormData.year}
                onChange={(e) =>
                  setAddFormData({ ...addFormData, year: e.target.value })
                }
                placeholder="Enter year (e.g., 2024)"
              />
            </div>
          )}

          {/* Model Multi-Select (for variant type) */}
          {addDialogType === "variant" && (
            <div className="space-y-2">
              <Label className="required">Models</Label>
              <Select
                isMulti
                options={modelOptions}
                value={selectedModels}
                onChange={handleModelChange}
                placeholder={
                  isLoadingModels
                    ? "Loading models..."
                    : "Select models for this variant"
                }
                className="react-select-container"
                classNamePrefix="react-select"
                isDisabled={!addFormData.makeId || isLoadingModels}
              />
              {!addFormData.makeId && (
                <p className="text-sm text-muted-foreground">
                  Please select a make first
                </p>
              )}
              {isLoadingModels && (
                <p className="text-sm text-muted-foreground">
                  Loading models...
                </p>
              )}
            </div>
          )}

          {/* Additional Fields for Metadata */}
          {addDialogType === "metadata" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fuel-type">Fuel Type</Label>
                <Input
                  id="fuel-type"
                  value={addFormData.fuelType}
                  onChange={(e) =>
                    setAddFormData({ ...addFormData, fuelType: e.target.value })
                  }
                  placeholder="e.g., Petrol, Diesel"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="transmission">Transmission</Label>
                <Input
                  id="transmission"
                  value={addFormData.transmission}
                  onChange={(e) =>
                    setAddFormData({
                      ...addFormData,
                      transmission: e.target.value,
                    })
                  }
                  placeholder="e.g., Manual, Automatic"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="engine-capacity">Engine Capacity (cc)</Label>
                <Input
                  id="engine-capacity"
                  type="number"
                  value={addFormData.engineCapacity}
                  onChange={(e) =>
                    setAddFormData({
                      ...addFormData,
                      engineCapacity: e.target.value,
                    })
                  }
                  placeholder="e.g., 1498"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="power">Power (HP)</Label>
                <Input
                  id="power"
                  type="number"
                  value={addFormData.power}
                  onChange={(e) =>
                    setAddFormData({ ...addFormData, power: e.target.value })
                  }
                  placeholder="e.g., 120"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="torque">Torque (Nm)</Label>
                <Input
                  id="torque"
                  type="number"
                  value={addFormData.torque}
                  onChange={(e) =>
                    setAddFormData({ ...addFormData, torque: e.target.value })
                  }
                  placeholder="e.g., 200"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="seating-capacity">Seating Capacity</Label>
                <Input
                  id="seating-capacity"
                  type="number"
                  value={addFormData.seatingCapacity}
                  onChange={(e) =>
                    setAddFormData({
                      ...addFormData,
                      seatingCapacity: e.target.value,
                    })
                  }
                  placeholder="e.g., 5"
                />
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseDialog}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleAddEntry} disabled={isLoading}>
              {isLoading ? "Adding..." : "Add Entry"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddsingleEntryDialog;
