import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { integrationServices } from "@/api/services";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface SendGridConfigDialogProps {
  isOpen: boolean;
  onClose: () => void;
  integration: any;
}

const SendGridConfigDialog: React.FC<SendGridConfigDialogProps> = ({ isOpen, onClose, integration }) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    api_key: integration?.configuration?.api_key || "",
    from_email: integration?.configuration?.from_email || "",
    from_name: integration?.configuration?.from_name || "",
  });

  const saveMutation = useMutation({
    mutationFn: (data: any) => {
      if (integration) {
        return integrationServices.updateIntegration(integration._id, data);
      }
      return integrationServices.createIntegration(data);
    },
    onSuccess: () => {
      toast.success("SendGrid configuration saved successfully");
      queryClient.invalidateQueries({ queryKey: ["integrations"] });
      onClose();
    },
    onError: () => {
      toast.error("Failed to save SendGrid configuration");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate({
      integration_type: "sendgrid",
      display_name: "SendGrid Email",
      configuration: formData,
      is_active: true,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Configure SendGrid</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>API Key</Label>
            <Input type="password" value={formData.api_key} onChange={(e) => setFormData({ ...formData, api_key: e.target.value })} required />
          </div>
          <div>
            <Label>From Email</Label>
            <Input type="email" value={formData.from_email} onChange={(e) => setFormData({ ...formData, from_email: e.target.value })} required />
          </div>
          <div>
            <Label>From Name</Label>
            <Input value={formData.from_name} onChange={(e) => setFormData({ ...formData, from_name: e.target.value })} required />
          </div>
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saveMutation.isPending}>Save</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SendGridConfigDialog;
