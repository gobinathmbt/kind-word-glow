import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { companyServices } from "@/api/services";
import Select from "react-select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import AddsingleEntryDialog from "../metadata/AddsingleEntrydialog";
import { toast } from "sonner";

interface DropdownItem {
  _id: string;
  displayName: string;
  displayValue?: string;
  isActive?: boolean;
  year?: number;
  make?: DropdownItem;
  model?: DropdownItem;
  variant?: DropdownItem;
  models?: DropdownItem[];
}

interface SelectOption {
  value: string;
  label: string;
  data?: DropdownItem;
}

type LayoutVariant = 
  | "horizontal"
  | "stacked"
  | "grid-2"
  | "grid-3"
  | "grid-5"
  | "custom";

interface EditableFields {
  make?: boolean;
  model?: boolean;
  variant?: boolean;
  year?: boolean;
  body?: boolean;
}

interface ValidationErrors {
  make?: string;
  model?: string;
  variant?: string;
  year?: string;
  body?: string;
}

interface VehicleMetadataSelectorProps {
  // Selected values (display names)
  selectedMake?: string;
  selectedModel?: string;
  selectedVariant?: string;
  selectedYear?: string;
  selectedBody?: string;

  // Change handlers (return displayName only)
  onMakeChange: (displayName: string) => void;
  onModelChange: (displayName: string) => void;
  onVariantChange: (displayName: string) => void;
  onYearChange: (displayName: string) => void;
  onBodyChange: (displayName: string) => void;

  // Validation props
  errors?: ValidationErrors;
  onErrorsChange?: any;

  // Edit mode props
  isEdit?: boolean;
  editableFields?: EditableFields;

  // Layout customization props
  layout?: LayoutVariant;
  containerClassName?: string;
  fieldClassName?: string;
  
  // Field visibility
  showMake?: boolean;
  showModel?: boolean;
  showVariant?: boolean;
  showYear?: boolean;
  showBody?: boolean;
  
  // Plus button visibility
  showMakePlus?: boolean;
  showModelPlus?: boolean;
  showVariantPlus?: boolean;
  showYearPlus?: boolean;
  showBodyPlus?: boolean;
  
  // Field ordering
  fieldOrder?: Array<'make' | 'model' | 'variant' | 'year' | 'body'>;
  
  // Optional props
  className?: string;
  showLabels?: boolean;
  disabled?: boolean;
  
  // Individual field props
  makeProps?: {
    label?: string;
    placeholder?: string;
    required?: boolean;
  };
  modelProps?: {
    label?: string;
    placeholder?: string;
    required?: boolean;
  };
  variantProps?: {
    label?: string;
    placeholder?: string;
    required?: boolean;
  };
  yearProps?: {
    label?: string;
    placeholder?: string;
    required?: boolean;
  };
  bodyProps?: {
    label?: string;
    placeholder?: string;
    required?: boolean;
  };
}

const VehicleMetadataSelector: React.FC<VehicleMetadataSelectorProps> = ({
  selectedMake,
  selectedModel,
  selectedVariant,
  selectedYear,
  selectedBody,
  onMakeChange,
  onModelChange,
  onVariantChange,
  onYearChange,
  onBodyChange,
  errors: externalErrors = {},
  onErrorsChange,
  isEdit = false,
  editableFields = {
    make: true,
    model: true,
    variant: true,
    year: true,
    body: true,
  },
  layout = "grid-5",
  containerClassName,
  fieldClassName = "",
  showMake = true,
  showModel = true,
  showVariant = true,
  showYear = true,
  showBody = true,
  showMakePlus = true,
  showModelPlus = true,
  showVariantPlus = true,
  showYearPlus = true,
  showBodyPlus = true,
  fieldOrder = ['make', 'model', 'variant', 'year', 'body'],
  className = "",
  showLabels = true,
  disabled = false,
  makeProps = {},
  modelProps = {},
  variantProps = {},
  yearProps = {},
  bodyProps = {},
}) => {
  const [apiError, setApiError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState({
    make: "",
    model: "",
    variant: "",
    year: "",
    body: "",
  });

  // Internal errors state
  const [internalErrors, setInternalErrors] = useState<ValidationErrors>({});
  
  // Use external errors if provided, otherwise use internal
  const activeErrors = Object.keys(externalErrors).length > 0 ? externalErrors : internalErrors;

  // State for AddEntryDialog
  const [showAddEntryDialog, setShowAddEntryDialog] = useState(false);
  const [addingEntry, setAddingEntry] = useState(false);
  const [defaultEntryType, setDefaultEntryType] = useState<string>("");

  // Validation function
  const validateField = (fieldName: keyof ValidationErrors, value: string | undefined, isRequired: boolean) => {
    if (isRequired && !value) {
      const fieldLabels = {
        make: makeProps.label || "Make",
        model: modelProps.label || "Model",
        variant: variantProps.label || "Variant",
        year: yearProps.label || "Year",
        body: bodyProps.label || "Body Type",
      };
      return `${fieldLabels[fieldName]} is required`;
    }
    return "";
  };

  // Clear error for a field
  const clearFieldError = (fieldName: keyof ValidationErrors) => {
    const newErrors = { ...activeErrors };
    delete newErrors[fieldName];
    
    if (onErrorsChange) {
      onErrorsChange(newErrors);
    } else {
      setInternalErrors(newErrors);
    }
  };

  // Set error for a field
  const setFieldError = (fieldName: keyof ValidationErrors, error: string) => {
    const newErrors = { ...activeErrors, [fieldName]: error };
    
    if (onErrorsChange) {
      onErrorsChange(newErrors);
    } else {
      setInternalErrors(newErrors);
    }
  };

  // Reset dependent fields when parent field changes (only in non-edit mode)
  useEffect(() => {
    if (!isEdit && !selectedMake) {
      onModelChange("");
      onVariantChange("");
      onYearChange("");
      setSelectedIds((prev) => ({
        ...prev,
        model: "",
        variant: "",
        year: "",
      }));
    }
  }, [selectedMake, onModelChange, onVariantChange, onYearChange, isEdit]);

  useEffect(() => {
    if (!isEdit && !selectedModel) {
      onVariantChange("");
      onYearChange("");
      setSelectedIds((prev) => ({ ...prev, variant: "", year: "" }));
    }
  }, [selectedModel, onVariantChange, onYearChange, isEdit]);

  useEffect(() => {
    if (!isEdit && !selectedVariant) {
      onYearChange("");
      setSelectedIds((prev) => ({ ...prev, year: "" }));
    }
  }, [selectedVariant, onYearChange, isEdit]);

  // Common query options
  const queryOptions = {
    retry: 1,
    retryDelay: 1000,
    onError: (error: any) => {
      if (error.response?.status === 403) {
        setApiError("Authentication required. Please check your credentials.");
      } else {
        setApiError("Failed to load data. Please try again later.");
      }
    },
  };

  // Fetch all makes with error handling
  const {
    data: allMakes,
    isLoading: allMakesLoading,
    error: makesError,
    refetch: refetchMakes,
  } = useQuery({
    queryKey: ["dropdown-makes-global"],
    queryFn: () => companyServices.getCompanyMetaData("makes"),
    ...queryOptions,
  });

  // Fetch models based on selected make with error handling
  const {
    data: allModels,
    isLoading: allModelsLoading,
    error: modelsError,
    refetch: refetchModels,
  } = useQuery({
    queryKey: ["dropdown-models-global", selectedIds.make],
    queryFn: () =>
      companyServices.getCompanyMetaData("models", {
        makeId: selectedIds.make || undefined,
      }),
    enabled: isEdit ? true : !!selectedIds.make,
    ...queryOptions,
  });

  // Fetch variants based on selected model with error handling
  const {
    data: allVariants,
    isLoading: allVariantsLoading,
    error: variantsError,
    refetch: refetchVariants,
  } = useQuery({
    queryKey: ["dropdown-variants-global", selectedIds.model],
    queryFn: () =>
      companyServices.getCompanyMetaData("variants", {
        modelId: selectedIds.model || undefined,
      }),
    enabled: isEdit ? true : !!selectedIds.model,
    ...queryOptions,
  });

  // Fetch years based on selected model and variant with error handling
  const {
    data: allYears,
    isLoading: allYearsLoading,
    error: yearsError,
    refetch: refetchYears,
  } = useQuery({
    queryKey: ["dropdown-years-global", selectedIds.model, selectedIds.variant],
    queryFn: () =>
      companyServices.getCompanyMetaData("years", {
        modelId: selectedIds.model || undefined,
        variantId: selectedIds.variant || undefined,
      }),
    enabled: isEdit ? true : !!(selectedIds.model || selectedIds.variant),
    ...queryOptions,
  });

  // Fetch all body types with error handling
  const {
    data: allBodies,
    isLoading: allBodiesLoading,
    error: bodiesError,
    refetch: refetchBodies,
  } = useQuery({
    queryKey: ["dropdown-bodies-global"],
    queryFn: () => companyServices.getCompanyMetaData("bodies"),
    ...queryOptions,
  });

  // Find the ID for a display name when component mounts or values change
  useEffect(() => {
    if (allMakes?.data?.data && selectedMake) {
      const make = allMakes.data.data.find(
        (item: DropdownItem) => item.displayName === selectedMake
      );
      if (make) {
        setSelectedIds((prev) => ({ ...prev, make: make._id }));
      }
    } else if (!selectedMake) {
      setSelectedIds((prev) => ({ ...prev, make: "" }));
    }
  }, [allMakes, selectedMake]);

  useEffect(() => {
    if (allModels?.data?.data && selectedModel) {
      const model = allModels.data.data.find(
        (item: DropdownItem) => item.displayName === selectedModel
      );
      if (model) {
        setSelectedIds((prev) => ({ ...prev, model: model._id }));
      }
    } else if (!selectedModel) {
      setSelectedIds((prev) => ({ ...prev, model: "" }));
    }
  }, [allModels, selectedModel]);

  useEffect(() => {
    if (allVariants?.data?.data && selectedVariant) {
      const variant = allVariants.data.data.find(
        (item: DropdownItem) => item.displayName === selectedVariant
      );
      if (variant) {
        setSelectedIds((prev) => ({ ...prev, variant: variant._id }));
      }
    } else if (!selectedVariant) {
      setSelectedIds((prev) => ({ ...prev, variant: "" }));
    }
  }, [allVariants, selectedVariant]);

  useEffect(() => {
    if (allYears?.data?.data && selectedYear) {
      const year = allYears.data.data.find(
        (item: DropdownItem) =>
          item.year?.toString() === selectedYear || item.displayName === selectedYear
      );
      if (year) {
        setSelectedIds((prev) => ({ ...prev, year: year._id }));
      }
    } else if (!selectedYear) {
      setSelectedIds((prev) => ({ ...prev, year: "" }));
    }
  }, [allYears, selectedYear]);

  useEffect(() => {
    if (allBodies?.data?.data && selectedBody) {
      const body = allBodies.data.data.find(
        (item: DropdownItem) => item.displayName === selectedBody
      );
      if (body) {
        setSelectedIds((prev) => ({ ...prev, body: body._id }));
      }
    } else if (!selectedBody) {
      setSelectedIds((prev) => ({ ...prev, body: "" }));
    }
  }, [allBodies, selectedBody]);

  // Handle plus button click with default type
  const handleMakePlusClick = () => {
    setDefaultEntryType("make");
    setShowAddEntryDialog(true);
  };

  const handleModelPlusClick = () => {
    setDefaultEntryType("model");
    setShowAddEntryDialog(true);
  };

  const handleBodyPlusClick = () => {
    setDefaultEntryType("body");
    setShowAddEntryDialog(true);
  };

  const handleYearPlusClick = () => {
    setDefaultEntryType("year");
    setShowAddEntryDialog(true);
  };

  const handleVariantPlusClick = () => {
    setDefaultEntryType("variant");
    setShowAddEntryDialog(true);
  };

  // Handle adding a new entry
  const handleAddEntry = async (type: string, data: any) => {
    setAddingEntry(true);
    try {
      let response;
      switch (type) {
        case "make":
          response = await companyServices.createMake(data);
          await refetchMakes();
          break;
        case "model":
          response = await companyServices.createModel(data);
          await refetchModels();
          break;
        case "variant":
          response = await companyServices.createVariant(data);
          await refetchVariants();
          break;
        case "body":
          response = await companyServices.createBodyType(data);
          await refetchBodies();
          break;
        case "year":
          response = await companyServices.createYear(data);
          await refetchYears();
          break;
        default:
          throw new Error(`Unknown type: ${type}`);
      }

      toast.success(`${type} added successfully`);

      // Auto-select the newly added item
      if (response?.data?.data?._id) {
        const newItem = response.data.data;
        switch (type) {
          case "make":
            onMakeChange(newItem.displayName);
            break;
          case "model":
            onModelChange(newItem.displayName);
            break;
          case "variant":
            onVariantChange(newItem.displayName);
            break;
          case "body":
            onBodyChange(newItem.displayName);
            break;
          case "year":
            onYearChange(newItem.year ? newItem.year.toString() : newItem.displayName);
            break;
        }
      }

      return response?.data?.data;
    } catch (error: any) {
      console.error(`Error adding ${type}:`, error);
      toast.error(`Failed to add ${type}: ${error.response?.data?.message || error.message}`);
      throw error;
    } finally {
      setAddingEntry(false);
    }
  };

  // Close AddEntryDialog and reset default type
  const handleCloseAddEntryDialog = () => {
    setShowAddEntryDialog(false);
    setDefaultEntryType("");
  };

  // Get container classes based on layout
  const getContainerClasses = () => {
    if (containerClassName) return containerClassName;
    
    switch (layout) {
      case "horizontal":
        return "flex flex-wrap gap-4";
      case "stacked":
        return "space-y-4";
      case "grid-2":
        return "grid grid-cols-1 md:grid-cols-2 gap-4";
      case "grid-3":
        return "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4";
      case "grid-5":
        return "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4";
      case "custom":
        return "";
      default:
        return "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4";
    }
  };

  // Convert dropdown items to react-select options
  const convertToOptions = (items: DropdownItem[] | undefined, isYear: boolean = false): SelectOption[] => {
    if (!items) return [];
    return items.map(item => ({
      value: isYear ? (item.year ? item.year.toString() : item.displayName) : item.displayName,
      label: isYear ? (item.year ? item.year.toString() : item.displayName) : item.displayName,
      data: item,
    }));
  };

  // Get selected option for react-select
  const getSelectedOption = (value: string | undefined, options: SelectOption[]): SelectOption | null => {
    if (!value) return null;
    return options.find(opt => opt.value === value) || null;
  };

  // Custom styles for react-select to match shadcn/ui
  const customSelectStyles = (hasError: boolean) => ({
    control: (base: any, state: any) => ({
      ...base,
      minHeight: '40px',
      borderColor: hasError 
        ? 'rgb(239 68 68)' 
        : state.isFocused 
        ? 'hsl(var(--ring))' 
        : 'hsl(var(--input))',
      boxShadow: state.isFocused ? '0 0 0 2px hsl(var(--ring))' : 'none',
      '&:hover': {
        borderColor: hasError ? 'rgb(239 68 68)' : 'hsl(var(--input))',
      },
      backgroundColor: state.isDisabled ? 'hsl(var(--muted))' : 'transparent',
      cursor: state.isDisabled ? 'not-allowed' : 'default',
    }),
    option: (base: any, state: any) => ({
      ...base,
      backgroundColor: state.isSelected 
        ? 'hsl(var(--primary))' 
        : state.isFocused 
        ? 'hsl(var(--accent))' 
        : 'transparent',
      color: state.isSelected ? 'hsl(var(--primary-foreground))' : 'hsl(var(--foreground))',
      cursor: 'pointer',
      '&:active': {
        backgroundColor: 'hsl(var(--accent))',
      },
    }),
    menu: (base: any) => ({
      ...base,
      zIndex: 50,
    }),
    placeholder: (base: any) => ({
      ...base,
      color: 'hsl(var(--muted-foreground))',
    }),
    singleValue: (base: any) => ({
      ...base,
      color: 'hsl(var(--foreground))',
    }),
  });

  const renderReactSelect = (
    fieldKey: keyof ValidationErrors,
    label: string,
    value: string | undefined,
    onChange: (displayName: string) => void,
    options: DropdownItem[] | undefined,
    isLoading: boolean,
    placeholder: string,
    disabledCondition: boolean = false,
    error?: any,
    fieldProps?: {
      label?: string;
      placeholder?: string;
      required?: boolean;
    },
    showPlusButton: boolean = false,
    onPlusClick?: () => void,
    isEditableField: boolean = true
  ) => {
    const finalLabel = fieldProps?.label || label;
    const finalPlaceholder = fieldProps?.placeholder || placeholder;
    const isRequired = fieldProps?.required || false;
    const isYearField = label === "Year";
    
    const selectOptions = convertToOptions(options, isYearField);
    const selectedOption = getSelectedOption(value, selectOptions);

    // In edit mode, check if field is editable
    // In create mode, always allow clearing
    const isFieldDisabled = disabled || (isEdit && !isEditableField) || (!isEdit && disabledCondition);
    const isClearable = isEdit ? isEditableField : true;

    const fieldError = activeErrors[fieldKey];
    const hasError = !!fieldError;

    const handleChange = (option: SelectOption | null) => {
      const newValue = option ? option.value : "";
      onChange(newValue);
      
      // Clear error when value changes
      if (fieldError) {
        clearFieldError(fieldKey);
      }
      
      // Validate if required
      if (isRequired) {
        const error = validateField(fieldKey, newValue, isRequired);
        if (error) {
          setFieldError(fieldKey, error);
        }
      }
    };

    return (
      <div className={`space-y-2 ${fieldClassName} ${layout === 'horizontal' ? 'flex-1 min-w-0' : ''}`}>
        {showLabels && (
          <Label htmlFor={fieldKey} className={isRequired ? "required" : ""}>
            {finalLabel}{isRequired && <span className="text-red-500"> *</span>}
          </Label>
        )}
        <div className="flex items-center gap-2">
          {isLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : error ? (
            <div className="h-10 w-full border border-red-300 rounded-md flex items-center px-3 bg-red-50">
              <span className="text-sm text-red-600">
                Error loading {label.toLowerCase()}
              </span>
            </div>
          ) : (
            <div className="w-full">
              <Select
                id={fieldKey}
                value={selectedOption}
                onChange={handleChange}
                options={selectOptions}
                isClearable={isClearable}
                isDisabled={isFieldDisabled}
                placeholder={finalPlaceholder}
                styles={customSelectStyles(hasError)}
                className="w-full react-select-container"
                classNamePrefix="react-select"
                noOptionsMessage={() => `No ${label.toLowerCase()} available`}
              />
            </div>
          )}
          {showPlusButton && onPlusClick && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-10 w-10 p-0 shrink-0"
              onClick={onPlusClick}
              disabled={disabled}
              title={`Add new ${label.toLowerCase()}`}
            >
              <Plus className="h-4 w-4" />
            </Button>
          )}
        </div>
        {hasError && (
          <p className="text-sm text-red-500">{fieldError}</p>
        )}
      </div>
    );
  };

  // Field configuration mapping
  const fieldConfigs = {
    make: {
      key: "make" as keyof ValidationErrors,
      label: "Make",
      value: selectedMake,
      onChange: (displayName: string) => {
        onMakeChange(displayName);
        if (!isEdit) {
          onModelChange("");
          onVariantChange("");
          onYearChange("");
        }
      },
      options: allMakes?.data?.data,
      isLoading: allMakesLoading,
      placeholder: "Select Make",
      disabledCondition: false,
      error: makesError,
      fieldProps: makeProps,
      show: showMake,
      showPlusButton: showMakePlus,
      onPlusClick: handleMakePlusClick,
      isEditable: editableFields.make !== false,
    },
    model: {
      key: "model" as keyof ValidationErrors,
      label: "Model",
      value: selectedModel,
      onChange: (displayName: string) => {
        onModelChange(displayName);
        if (!isEdit) {
          onVariantChange("");
          onYearChange("");
        }
      },
      options: allModels?.data?.data,
      isLoading: allModelsLoading,
      placeholder: "Select Model",
      disabledCondition: !selectedMake,
      error: modelsError,
      fieldProps: modelProps,
      show: showModel,
      showPlusButton: showModelPlus,
      onPlusClick: handleModelPlusClick,
      isEditable: editableFields.model !== false,
    },
    variant: {
      key: "variant" as keyof ValidationErrors,
      label: "Variant",
      value: selectedVariant,
      onChange: onVariantChange,
      options: allVariants?.data?.data,
      isLoading: allVariantsLoading,
      placeholder: "Select Variant",
      disabledCondition: !selectedModel,
      error: variantsError,
      fieldProps: variantProps,
      show: showVariant,
      showPlusButton: showVariantPlus,
      onPlusClick: handleVariantPlusClick,
      isEditable: editableFields.variant !== false,
    },
    year: {
      key: "year" as keyof ValidationErrors,
      label: "Year",
      value: selectedYear,
      onChange: onYearChange,
      options: allYears?.data?.data,
      isLoading: allYearsLoading,
      placeholder: "Select Year",
      disabledCondition: !(selectedModel || selectedVariant),
      error: yearsError,
      fieldProps: yearProps,
      show: showYear,
      showPlusButton: showYearPlus,
      onPlusClick: handleYearPlusClick,
      isEditable: editableFields.year !== false,
    },
    body: {
      key: "body" as keyof ValidationErrors,
      label: "Body Type",
      value: selectedBody,
      onChange: onBodyChange,
      options: allBodies?.data?.data,
      isLoading: allBodiesLoading,
      placeholder: "Select Body Type",
      disabledCondition: false,
      error: bodiesError,
      fieldProps: bodyProps,
      show: showBody,
      showPlusButton: showBodyPlus,
      onPlusClick: handleBodyPlusClick,
      isEditable: editableFields.body !== false,
    },
  };

  // Render fields in specified order
  const renderFields = () => {
    return fieldOrder
      .filter(fieldKey => fieldConfigs[fieldKey].show)
      .map(fieldKey => {
        const config = fieldConfigs[fieldKey];
        return (
          <React.Fragment key={config.key}>
            {renderReactSelect(
              config.key,
              config.label,
              config.value,
              config.onChange,
              config.options,
              config.isLoading,
              config.placeholder,
              config.disabledCondition,
              config.error,
              config.fieldProps,
              config.showPlusButton,
              config.onPlusClick,
              config.isEditable
            )}
          </React.Fragment>
        );
      });
  };

  return (
    <div className={className}>
      {apiError && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{apiError}</AlertDescription>
        </Alert>
      )}
      <div className={getContainerClasses()}>
        {renderFields()}
      </div>

      {/* AddEntryDialog with default type and uneditable */}
      <AddsingleEntryDialog
        makes={allMakes?.data?.data || []}
        onAddEntry={handleAddEntry}
        isLoading={addingEntry}
        isOpen={showAddEntryDialog}
        onClose={handleCloseAddEntryDialog}
        defaultType={defaultEntryType}
        typeEditable={false}
      />
    </div>
  );
};

export default VehicleMetadataSelector;