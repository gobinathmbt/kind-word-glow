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
import { toast } from "sonner";
import { tenderDealershipService } from "@/services/tenderDealershipService";
import { Building2, MapPin, CreditCard } from "lucide-react";

interface CreateTenderDealershipModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  dealership?: any;
}

const CreateTenderDealershipModal: React.FC<
  CreateTenderDealershipModalProps
> = ({ open, onOpenChange, onSuccess, dealership }) => {
  const isEditMode = !!dealership;

  const [formData, setFormData] = useState({
    dealership_name: "",
    email: "",
    hubRecID: "",
    abn: "",
    dp_name: "",
    brand_or_make: "",
    address: {
      street: "",
      suburb: "",
      state: "",
    },
    billing_address: {
      street: "",
      suburb: "",
      state: "",
    },
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<any>({});

  useEffect(() => {
    if (dealership) {
      setFormData({
        dealership_name: dealership.dealership_name || "",
        email: dealership.email || "",
        hubRecID: dealership.hubRecID || "",
        abn: dealership.abn || "",
        dp_name: dealership.dp_name || "",
        brand_or_make: dealership.brand_or_make || "",
        address: {
          street: dealership.address?.street || "",
          suburb: dealership.address?.suburb || "",
          state: dealership.address?.state || "",
        },
        billing_address: {
          street: dealership.billing_address?.street || "",
          suburb: dealership.billing_address?.suburb || "",
          state: dealership.billing_address?.state || "",
        },
      });
    } else {
      setFormData({
        dealership_name: "",
        email: "",
        hubRecID: "",
        abn: "",
        dp_name: "",
        brand_or_make: "",
        address: {
          street: "",
          suburb: "",
          state: "",
        },
        billing_address: {
          street: "",
          suburb: "",
          state: "",
        },
      });
    }
    setErrors({});
  }, [dealership, open]);

  const validateForm = () => {
    const newErrors: any = {};

    if (!formData.dealership_name.trim()) {
      newErrors.dealership_name = "Dealership name is required";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    section?: "address" | "billing_address"
  ) => {
    const { name, value } = e.target;

    if (section) {
      setFormData((prev) => ({
        ...prev,
        [section]: {
          ...prev[section],
          [name]: value,
        },
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }

    // Clear error for this field
    if (errors[name]) {
      setErrors((prev: any) => {
        const newErrors = { ...prev };
        delete newErrors[name];
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
      if (isEditMode) {
        await tenderDealershipService.updateTenderDealership(
          dealership._id,
          formData
        );
        toast.success("Tender dealership updated successfully");
      } else {
        await tenderDealershipService.createTenderDealership(formData);
        toast.success(
          "Tender dealership created successfully. Primary user credentials have been sent via email."
        );
      }
      onSuccess();
    } catch (error: any) {
      toast.error(
        error.response?.data?.message ||
          `Failed to ${isEditMode ? "update" : "create"} tender dealership`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyBillingAddress = () => {
    setFormData((prev) => ({
      ...prev,
      billing_address: {
        street: prev.address.street,
        suburb: prev.address.suburb,
        state: prev.address.state,
      },
    }));
    toast.success("Address copied to billing address");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Edit Tender Dealership" : "Create Tender Dealership"}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "Update the tender dealership information below."
              : "Fill in the details to create a new tender dealership. A primary user account will be created automatically."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <Building2 className="h-4 w-4" />
              <span>Basic Information</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dealership_name">
                  Dealership Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="dealership_name"
                  name="dealership_name"
                  value={formData.dealership_name}
                  onChange={handleChange}
                  placeholder="Enter dealership name"
                  className={errors.dealership_name ? "border-red-500" : ""}
                />
                {errors.dealership_name && (
                  <p className="text-sm text-red-500">
                    {errors.dealership_name}
                  </p>
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
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter email address"
                  className={errors.email ? "border-red-500" : ""}
                />
                {errors.email && (
                  <p className="text-sm text-red-500">{errors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="hubRecID">HubRecID</Label>
                <Input
                  id="hubRecID"
                  name="hubRecID"
                  value={formData.hubRecID}
                  onChange={handleChange}
                  placeholder="Enter HubRecID"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="abn">ABN</Label>
                <Input
                  id="abn"
                  name="abn"
                  value={formData.abn}
                  onChange={handleChange}
                  placeholder="Enter ABN"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dp_name">DP Name</Label>
                <Input
                  id="dp_name"
                  name="dp_name"
                  value={formData.dp_name}
                  onChange={handleChange}
                  placeholder="Enter DP name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="brand_or_make">Brand/Make</Label>
                <Input
                  id="brand_or_make"
                  name="brand_or_make"
                  value={formData.brand_or_make}
                  onChange={handleChange}
                  placeholder="Enter brand or make"
                />
              </div>
            </div>
          </div>

          {/* Address Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>Address</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="address_street">Street</Label>
                <Input
                  id="address_street"
                  name="street"
                  value={formData.address.street}
                  onChange={(e) => handleChange(e, "address")}
                  placeholder="Enter street address"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address_suburb">Suburb</Label>
                <Input
                  id="address_suburb"
                  name="suburb"
                  value={formData.address.suburb}
                  onChange={(e) => handleChange(e, "address")}
                  placeholder="Enter suburb"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address_state">State</Label>
                <Input
                  id="address_state"
                  name="state"
                  value={formData.address.state}
                  onChange={(e) => handleChange(e, "address")}
                  placeholder="Enter state"
                />
              </div>
            </div>
          </div>

          {/* Billing Address Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <CreditCard className="h-4 w-4" />
                <span>Billing Address</span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopyBillingAddress}
              >
                Copy from Address
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="billing_address_street">Street</Label>
                <Input
                  id="billing_address_street"
                  name="street"
                  value={formData.billing_address.street}
                  onChange={(e) => handleChange(e, "billing_address")}
                  placeholder="Enter street address"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="billing_address_suburb">Suburb</Label>
                <Input
                  id="billing_address_suburb"
                  name="suburb"
                  value={formData.billing_address.suburb}
                  onChange={(e) => handleChange(e, "billing_address")}
                  placeholder="Enter suburb"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="billing_address_state">State</Label>
                <Input
                  id="billing_address_state"
                  name="state"
                  value={formData.billing_address.state}
                  onChange={(e) => handleChange(e, "billing_address")}
                  placeholder="Enter state"
                />
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
                ? "Update Dealership"
                : "Create Dealership"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateTenderDealershipModal;
