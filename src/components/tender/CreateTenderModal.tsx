import React, { useState, useEffect } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { tenderService } from "@/api/services";
import { User, Car, Calendar } from "lucide-react";
import VehicleMetadataSelector from "@/components/common/VehicleMetadataSelector";

interface CreateTenderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  tender?: any;
}

const CreateTenderModal: React.FC<CreateTenderModalProps> = ({
  open,
  onOpenChange,
  onSuccess,
  tender,
}) => {
  const isEditMode = !!tender;

  const [formData, setFormData] = useState({
    customer_info: {
      name: "",
      email: "",
      phone: "",
      address: "",
    },
    basic_vehicle_info: {
      make: "",
      model: "",
      year: "",
      variant: "",
      body_style: "",
      color: "",
    },
    tender_expiry_time: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<any>({});

  useEffect(() => {
    if (tender) {
      // Format the date for datetime-local input
      const expiryDate = tender.tender_expiry_time
        ? new Date(tender.tender_expiry_time).toISOString().slice(0, 16)
        : "";

      setFormData({
        customer_info: {
          name: tender.customer_info?.name || "",
          email: tender.customer_info?.email || "",
          phone: tender.customer_info?.phone || "",
          address: tender.customer_info?.address || "",
        },
        basic_vehicle_info: {
          make: tender.basic_vehicle_info?.make || "",
          model: tender.basic_vehicle_info?.model || "",
          year: tender.basic_vehicle_info?.year || "",
          variant: tender.basic_vehicle_info?.variant || "",
          body_style: tender.basic_vehicle_info?.body_style || "",
          color: tender.basic_vehicle_info?.color || "",
        },
        tender_expiry_time: expiryDate,
      });
    } else {
      setFormData({
        customer_info: {
          name: "",
          email: "",
          phone: "",
          address: "",
        },
        basic_vehicle_info: {
          make: "",
          model: "",
          year: "",
          variant: "",
          body_style: "",
          color: "",
        },
        tender_expiry_time: "",
      });
    }
    setErrors({});
  }, [tender, open]);

  const validateForm = () => {
    const newErrors: any = {};

    // Customer info validation
    if (!formData.customer_info.name.trim()) {
      newErrors.customer_name = "Customer name is required";
    }

    if (!formData.customer_info.email.trim()) {
      newErrors.customer_email = "Customer email is required";
    } else if (
      !/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(
        formData.customer_info.email
      )
    ) {
      newErrors.customer_email = "Please enter a valid email address";
    }

    // Vehicle info validation
    if (!formData.basic_vehicle_info.make.trim()) {
      newErrors.vehicle_make = "Vehicle make is required";
    }

    if (!formData.basic_vehicle_info.model.trim()) {
      newErrors.vehicle_model = "Vehicle model is required";
    }

    if (!formData.basic_vehicle_info.year.trim()) {
      newErrors.vehicle_year = "Vehicle year is required";
    }

    // Expiry time validation
    if (!formData.tender_expiry_time) {
      newErrors.tender_expiry_time = "Tender expiry time is required";
    } else {
      const expiryDate = new Date(formData.tender_expiry_time);
      const now = new Date();
      if (expiryDate <= now) {
        newErrors.tender_expiry_time =
          "Tender expiry time must be in the future";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCustomerChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      customer_info: {
        ...prev.customer_info,
        [name]: value,
      },
    }));

    // Clear error for this field
    const errorKey = `customer_${name}`;
    if (errors[errorKey]) {
      setErrors((prev: any) => {
        const newErrors = { ...prev };
        delete newErrors[errorKey];
        return newErrors;
      });
    }
  };

  const handleVehicleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      basic_vehicle_info: {
        ...prev.basic_vehicle_info,
        [name]: value,
      },
    }));
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      tender_expiry_time: e.target.value,
    }));

    // Clear error for this field
    if (errors.tender_expiry_time) {
      setErrors((prev: any) => {
        const newErrors = { ...prev };
        delete newErrors.tender_expiry_time;
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("Please fix the validation errors");
      return;
    }

    setIsSubmitting(true);

    try {
      // Convert datetime-local to ISO string
      const submitData = {
        ...formData,
        tender_expiry_time: new Date(formData.tender_expiry_time).toISOString(),
      };

      if (isEditMode) {
        await tenderService.updateTender(tender._id, submitData);
        toast.success("Tender updated successfully");
      } else {
        await tenderService.createTender(submitData);
        toast.success("Tender created successfully");
      }
      onSuccess();
    } catch (error: any) {
      toast.error(
        error.response?.data?.message ||
          `Failed to ${isEditMode ? "update" : "create"} tender`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Edit Tender" : "Create Tender"}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "Update the tender information below."
              : "Fill in the details to create a new tender request."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Customer Information */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <User className="h-4 w-4" />
              <span>Customer Information</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Customer Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.customer_info.name}
                  onChange={handleCustomerChange}
                  placeholder="Enter customer name"
                  className={errors.customer_name ? "border-red-500" : ""}
                />
                {errors.customer_name && (
                  <p className="text-sm text-red-500">{errors.customer_name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">
                  Email <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.customer_info.email}
                  onChange={handleCustomerChange}
                  placeholder="Enter email address"
                  className={errors.customer_email ? "border-red-500" : ""}
                />
                {errors.customer_email && (
                  <p className="text-sm text-red-500">{errors.customer_email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  name="phone"
                  value={formData.customer_info.phone}
                  onChange={handleCustomerChange}
                  placeholder="Enter phone number"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  name="address"
                  value={formData.customer_info.address}
                  onChange={handleCustomerChange}
                  placeholder="Enter customer address"
                  rows={2}
                />
              </div>
            </div>
          </div>

          {/* Vehicle Information */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <Car className="h-4 w-4" />
              <span>Vehicle Information</span>
            </div>

            <VehicleMetadataSelector
              selectedMake={formData.basic_vehicle_info.make}
              selectedModel={formData.basic_vehicle_info.model}
              selectedYear={formData.basic_vehicle_info.year}
              selectedVariant={formData.basic_vehicle_info.variant}
              selectedBody={formData.basic_vehicle_info.body_style}
              onMakeChange={(value) =>
                setFormData((prev) => ({
                  ...prev,
                  basic_vehicle_info: {
                    ...prev.basic_vehicle_info,
                    make: value,
                  },
                }))
              }
              onModelChange={(value) =>
                setFormData((prev) => ({
                  ...prev,
                  basic_vehicle_info: {
                    ...prev.basic_vehicle_info,
                    model: value,
                  },
                }))
              }
              onYearChange={(value) =>
                setFormData((prev) => ({
                  ...prev,
                  basic_vehicle_info: {
                    ...prev.basic_vehicle_info,
                    year: value,
                  },
                }))
              }
              onVariantChange={(value) =>
                setFormData((prev) => ({
                  ...prev,
                  basic_vehicle_info: {
                    ...prev.basic_vehicle_info,
                    variant: value,
                  },
                }))
              }
              onBodyChange={(value) =>
                setFormData((prev) => ({
                  ...prev,
                  basic_vehicle_info: {
                    ...prev.basic_vehicle_info,
                    body_style: value,
                  },
                }))
              }
              layout="grid-2"
              makeProps={{ required: true }}
              modelProps={{ required: true }}
              yearProps={{ required: true }}
              errors={{
                make: errors.vehicle_make,
                model: errors.vehicle_model,
                year: errors.vehicle_year,
              }}
              onErrorsChange={(newErrors: any) => {
                setErrors((prev: any) => ({
                  ...prev,
                  vehicle_make: newErrors.make,
                  vehicle_model: newErrors.model,
                  vehicle_year: newErrors.year,
                }));
              }}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="color">Color</Label>
                <Input
                  id="color"
                  name="color"
                  value={formData.basic_vehicle_info.color}
                  onChange={handleVehicleChange}
                  placeholder="Enter vehicle color"
                />
              </div>
            </div>
          </div>

          {/* Tender Expiry */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Tender Expiry</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tender_expiry_time">
                  Expiry Date & Time <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="tender_expiry_time"
                  name="tender_expiry_time"
                  type="datetime-local"
                  value={formData.tender_expiry_time}
                  onChange={handleExpiryChange}
                  className={errors.tender_expiry_time ? "border-red-500" : ""}
                />
                {errors.tender_expiry_time && (
                  <p className="text-sm text-red-500">
                    {errors.tender_expiry_time}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? isEditMode
                  ? "Updating..."
                  : "Creating..."
                : isEditMode
                ? "Update Tender"
                : "Create Tender"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateTenderModal;
