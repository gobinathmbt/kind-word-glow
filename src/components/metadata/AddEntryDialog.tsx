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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import Select from "react-select";

interface AddEntryDialogProps {
  makes: any[];
  onAddEntry: (type: string, data: any) => void;
  isLoading?: boolean;
}

const AddEntryDialog: React.FC<AddEntryDialogProps> = ({
  makes,
  onAddEntry,
  isLoading = false,
}) => {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addDialogType, setAddDialogType] = useState("make");
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
    setAddDialogType("make"); // Reset to default type
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
      import("@/api/services").then(({ vehicleMetadataServices }) => {
        vehicleMetadataServices
          .getDropdownData("models", { makeId: addFormData.makeId })
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
          .catch(console.error);
      });
    } else {
      setAvailableModels([]);
      setAvailableVariants([]);
    }
  }, [addDialogType, addFormData.makeId]);

  // Fetch body types for metadata form
  useEffect(() => {
    if (addDialogType === "metadata") {
      import("@/api/services").then(({ vehicleMetadataServices }) => {
        vehicleMetadataServices
          .getDropdownData("bodies")
          .then((response) => {
            setAvailableBodyTypes(response.data?.data || []);
          })
          .catch(console.error);
      });
    }
  }, [addDialogType]);

  // Fetch years based on model and variant selection
  useEffect(() => {
    if (
      addDialogType === "metadata" &&
      (addFormData.modelId || addFormData.variantId)
    ) {
      const params: any = {};

      if (addFormData.modelId) {
        params.modelId = addFormData.modelId;
      }

      if (addFormData.variantId) {
        params.variantId = addFormData.variantId;
      }

      import("@/api/services").then(({ vehicleMetadataServices }) => {
        vehicleMetadataServices
          .getDropdownData("years", params)
          .then((response) => {
            setAvailableYears(response.data?.data || []);
          })
          .catch(console.error);
      });
    } else if (addDialogType === "metadata") {
      setAvailableYears([]);
    }
  }, [addDialogType, addFormData.modelId, addFormData.variantId]);

  // Automatically select the model if there's only one available
  useEffect(() => {
    if (
      addDialogType === "variant" &&
      availableModels.length === 1 &&
      addFormData.modelIds.length === 0
    ) {
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
      import("@/api/services").then(({ vehicleMetadataServices }) => {
        vehicleMetadataServices
          .getDropdownData("variants", { modelId: addFormData.modelId })
          .then((response) => {
            setAvailableVariants(response.data?.data || []);
            // Reset variant when model changes
            setAddFormData((prev) => ({ ...prev, variantId: "" }));
            setAvailableYears([]);
          })
          .catch(console.error);
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
      const errorMessage = error?.response?.data?.message || error?.message || "An error occurred";
      
      // Check if it's a duplicate error
      if (errorMessage.toLowerCase().includes('duplicate') || 
          errorMessage.toLowerCase().includes('already exists') ||
          errorMessage.toLowerCase().includes('unique constraint') ||
          error?.response?.status === 409) {
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
      <DialogTrigger asChild>
        <Button variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          Add Entry
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Entry</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div>
            <Label>Type</Label>
            <ShadcnSelect
              value={addDialogType}
              onValueChange={setAddDialogType}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="make">Make</SelectItem>
                <SelectItem value="model">Model</SelectItem>
                <SelectItem value="variant">Variant</SelectItem>
                <SelectItem value="body">Body Type</SelectItem>
                <SelectItem value="year">Variant Year</SelectItem>
                <SelectItem value="metadata">Vehicle Metadata</SelectItem>
              </SelectContent>
            </ShadcnSelect>
          </div>

          {/* Form fields based on selected type */}
          {addDialogType === "make" && (
            <div>
              <Label>Make Name</Label>
              <Input
                value={addFormData.displayName}
                onChange={(e) =>
                  setAddFormData({
                    ...addFormData,
                    displayName: e.target.value,
                  })
                }
                placeholder="e.g., Toyota"
              />
            </div>
          )}

          {addDialogType === "model" && (
            <>
              <div>
                <Label>Make</Label>
                <ShadcnSelect
                  value={addFormData.makeId}
                  onValueChange={(value) =>
                    setAddFormData({ ...addFormData, makeId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Make" />
                  </SelectTrigger>
                  <SelectContent>
                    {makes?.map((make: any) => (
                      <SelectItem key={make._id} value={make._id}>
                        {make.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </ShadcnSelect>
              </div>
              <div>
                <Label>Model Name</Label>
                <Input
                  value={addFormData.displayName}
                  onChange={(e) =>
                    setAddFormData({
                      ...addFormData,
                      displayName: e.target.value,
                    })
                  }
                  placeholder="e.g., Camry"
                />
              </div>
            </>
          )}

          {addDialogType === "variant" && (
            <>
              <div>
                <Label>Make (for filtering models)</Label>
                <ShadcnSelect
                  value={addFormData.makeId}
                  onValueChange={(value) =>
                    setAddFormData({
                      ...addFormData,
                      makeId: value,
                      modelIds: [],
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Make" />
                  </SelectTrigger>
                  <SelectContent>
                    {makes?.map((make: any) => (
                      <SelectItem key={make._id} value={make._id}>
                        {make.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </ShadcnSelect>
              </div>
              <div>
                <Label>Variant Name</Label>
                <Input
                  value={addFormData.displayName}
                  onChange={(e) =>
                    setAddFormData({
                      ...addFormData,
                      displayName: e.target.value,
                    })
                  }
                  placeholder="e.g., 1.8 G, 2.0 Turbo"
                />
              </div>
              <div>
                <Label>Select Models (Multiple)</Label>
                <Select
                  isMulti
                  options={modelOptions}
                  value={selectedModels}
                  onChange={handleModelChange}
                  className="basic-multi-select"
                  classNamePrefix="select"
                  placeholder="Select models..."
                  isDisabled={
                    !addFormData.makeId || availableModels.length === 0
                  }
                />
                {availableModels.length === 0 && addFormData.makeId && (
                  <p className="text-sm text-muted-foreground mt-1">
                    No models found for selected make
                  </p>
                )}
                {!addFormData.makeId && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Select a make first to see models
                  </p>
                )}
                {availableModels.length === 1 && (
                  <p className="text-sm text-blue-600 mt-1">
                    Only one model available - automatically selected
                  </p>
                )}
              </div>
            </>
          )}

          {addDialogType === "body" && (
            <div>
              <Label>Body Type Name</Label>
              <Input
                value={addFormData.displayName}
                onChange={(e) =>
                  setAddFormData({
                    ...addFormData,
                    displayName: e.target.value,
                  })
                }
                placeholder="e.g., Sedan"
              />
            </div>
          )}

          {addDialogType === "year" && (
            <div className="space-y-4">
              <div>
                <Label>Year *</Label>
                <Input
                  type="number"
                  value={addFormData.year}
                  onChange={(e) =>
                    setAddFormData({
                      ...addFormData,
                      year: e.target.value,
                    })
                  }
                  placeholder="e.g., 2023"
                  min="1900"
                  max={new Date().getFullYear() + 1}
                />
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label>Make (Optional - for filtering)</Label>
                  <ShadcnSelect
                    value={addFormData.makeId}
                    onValueChange={(value) =>
                      setAddFormData({ ...addFormData, makeId: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Make" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">No Make</SelectItem>
                      {makes?.map((make: any) => (
                        <SelectItem key={make._id} value={make._id}>
                          {make.displayName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </ShadcnSelect>
                </div>

                <div>
                  <Label>Model (Either model OR variant required)</Label>
                  <ShadcnSelect
                    value={addFormData.modelId}
                    onValueChange={(value) =>
                      setAddFormData({ ...addFormData, modelId: value })
                    }
                    disabled={!addFormData.makeId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Model" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">No Model</SelectItem>
                      {availableModels.map((model: any) => (
                        <SelectItem key={model._id} value={model._id}>
                          {model.displayName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </ShadcnSelect>
                  {!addFormData.makeId && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Select a make first to see models
                    </p>
                  )}
                </div>

                <div>
                  <Label>Variant (Either model OR variant required)</Label>
                  <ShadcnSelect
                    value={addFormData.variantId}
                    onValueChange={(value) =>
                      setAddFormData({ ...addFormData, variantId: value })
                    }
                    disabled={!addFormData.modelId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Variant" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">No Variant</SelectItem>
                      {availableVariants.map((variant: any) => (
                        <SelectItem key={variant._id} value={variant._id}>
                          {variant.displayName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </ShadcnSelect>
                  {!addFormData.modelId && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Select a model first to see variants
                    </p>
                  )}
                </div>
              </div>

              <div className="p-3 bg-blue-50 rounded-md">
                <p className="text-sm text-blue-700">
                  <strong>Note:</strong> You must select either a Model OR a
                  Variant (or both). This helps organize years by specific
                  vehicle configurations.
                </p>
              </div>
            </div>
          )}

          {addDialogType === "metadata" && (
            <div className="space-y-6">
              {/* Primary Vehicle Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Make *</Label>
                  <ShadcnSelect
                    value={addFormData.makeId}
                    onValueChange={(value) =>
                      setAddFormData({ ...addFormData, makeId: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Make" />
                    </SelectTrigger>
                    <SelectContent>
                      {makes?.map((make: any) => (
                        <SelectItem key={make._id} value={make._id}>
                          {make.displayName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </ShadcnSelect>
                </div>
                <div>
                  <Label>Model *</Label>
                  <ShadcnSelect
                    value={addFormData.modelId}
                    onValueChange={(value) =>
                      setAddFormData({ ...addFormData, modelId: value })
                    }
                    disabled={!addFormData.makeId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Model" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableModels.map((model: any) => (
                        <SelectItem key={model._id} value={model._id}>
                          {model.displayName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </ShadcnSelect>
                  {!addFormData.makeId && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Select a make first to see models
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Variant *</Label>
                  <ShadcnSelect
                    value={addFormData.variantId}
                    onValueChange={(value) =>
                      setAddFormData({ ...addFormData, variantId: value })
                    }
                    disabled={!addFormData.modelId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Variant" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableVariants.map((variant: any) => (
                        <SelectItem key={variant._id} value={variant._id}>
                          {variant.displayName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </ShadcnSelect>
                  {!addFormData.modelId && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Select a model first to see variants
                    </p>
                  )}
                </div>
                <div>
                  <Label>Body Type *</Label>
                  <ShadcnSelect
                    value={addFormData.bodyId}
                    onValueChange={(value) =>
                      setAddFormData({ ...addFormData, bodyId: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Body Type" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableBodyTypes.map((bodyType: any) => (
                        <SelectItem key={bodyType._id} value={bodyType._id}>
                          {bodyType.displayName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </ShadcnSelect>
                  {availableBodyTypes.length === 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      No body types available
                    </p>
                  )}
                </div>
              </div>

              <div>
                <Label>Year *</Label>
                <ShadcnSelect
                  value={addFormData.yearId}
                  onValueChange={(value) =>
                    setAddFormData({ ...addFormData, yearId: value })
                  }
                  disabled={availableYears.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableYears.map((year: any) => (
                      <SelectItem key={year._id} value={year._id}>
                        {year.year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </ShadcnSelect>
                {availableYears.length === 0 &&
                  (addFormData.modelId || addFormData.variantId) && (
                    <p className="text-xs text-muted-foreground mt-1">
                      No years found for selected model/variant
                    </p>
                  )}
                {!(addFormData.modelId || addFormData.variantId) && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Select a model or variant first to see years
                  </p>
                )}
              </div>

              <div>
                <Label>Fuel Type</Label>
                <Input
                  value={addFormData.fuelType || ""}
                  onChange={(e) =>
                    setAddFormData({
                      ...addFormData,
                      fuelType: e.target.value,
                    })
                  }
                  placeholder="e.g., Petrol, Diesel, Electric"
                />
              </div>
              <div>
                <Label>Transmission</Label>
                <Input
                  value={addFormData.transmission || ""}
                  onChange={(e) =>
                    setAddFormData({
                      ...addFormData,
                      transmission: e.target.value,
                    })
                  }
                  placeholder="e.g., Manual, Automatic, CVT"
                />
              </div>

              <div className="p-4 bg-blue-50 rounded-md">
                <p className="text-sm text-blue-700">
                  <strong>Note:</strong> All fields marked with * are required.
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button onClick={handleAddEntry} disabled={isLoading}>
              {isLoading ? "Adding..." : "Add Entry"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddEntryDialog;