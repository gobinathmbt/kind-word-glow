import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import apiClient from "@/api/axios";
import { Company } from "./CompanyDetailsDialog";

interface CompanyEditDialogProps {
  open: boolean;
  onClose: () => void;
  company: Company | null;
  onUpdated: () => void; // 👈 to trigger refetch after update
}

export const CompanyEditDialog: React.FC<CompanyEditDialogProps> = ({ open, onClose, company, onUpdated }) => {
  const [formData, setFormData] = useState<Partial<Company>>({});

  useEffect(() => {
    if (company) {
      setFormData(company);
    }
  }, [company]);

  const handleChange = (field: keyof Company, value: string | number | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!company?._id) return;
    try {
      await apiClient.put(`/api/master/companies/${company._id}`, formData);
      toast.success("Company updated successfully");
      onUpdated();
      onClose();
    } catch (error) {
      toast.error("Failed to update company");
    }
  };

  if (!company) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Company</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Company Name</Label>
            <Input
              value={formData.company_name || ""}
              onChange={(e) => handleChange("company_name", e.target.value)}
            />
          </div>

          <div>
            <Label>Email</Label>
            <Input
              type="email"
              value={formData.email || ""}
              onChange={(e) => handleChange("email", e.target.value)}
            />
          </div>

          <div>
            <Label>Contact Person</Label>
            <Input
              value={formData.contact_person || ""}
              onChange={(e) => handleChange("contact_person", e.target.value)}
            />
          </div>

          <div>
            <Label>Phone</Label>
            <Input
              value={formData.phone || ""}
              onChange={(e) => handleChange("phone", e.target.value)}
            />
          </div>

          <div>
            <Label>Address</Label>
            <Input
              value={formData.address || ""}
              onChange={(e) => handleChange("address", e.target.value)}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave}>Save</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
