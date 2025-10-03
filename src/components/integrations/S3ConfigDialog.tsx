import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { integrationServices } from "@/api/services";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface S3ConfigDialogProps {
  isOpen: boolean;
  onClose: () => void;
  integration: any;
}

const S3ConfigDialog: React.FC<S3ConfigDialogProps> = ({ isOpen, onClose, integration }) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    bucket_name: integration?.configuration?.bucket_name || "",
    bucket_url: integration?.configuration?.bucket_url || "",
    access_key: integration?.configuration?.access_key || "",
    secret_key: integration?.configuration?.secret_key || "",
    region: integration?.configuration?.region || "",
  });

  const saveMutation = useMutation({
    mutationFn: (data: any) => {
      if (integration) {
        return integrationServices.updateIntegration(integration._id, data);
      }
      return integrationServices.createIntegration(data);
    },
    onSuccess: () => {
      toast.success("S3 configuration saved successfully");
      queryClient.invalidateQueries({ queryKey: ["integrations"] });
      onClose();
    },
    onError: () => {
      toast.error("Failed to save S3 configuration");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate({
      integration_type: "s3_config",
      display_name: "S3 Storage",
      configuration: formData,
      is_active: true,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Configure S3 Storage</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Bucket Name</Label>
            <Input value={formData.bucket_name} onChange={(e) => setFormData({ ...formData, bucket_name: e.target.value })} required />
          </div>
          <div>
            <Label>Bucket URL</Label>
            <Input value={formData.bucket_url} onChange={(e) => setFormData({ ...formData, bucket_url: e.target.value })} required />
          </div>
          <div>
            <Label>Access Key</Label>
            <Input value={formData.access_key} onChange={(e) => setFormData({ ...formData, access_key: e.target.value })} required />
          </div>
          <div>
            <Label>Secret Key</Label>
            <Input type="password" value={formData.secret_key} onChange={(e) => setFormData({ ...formData, secret_key: e.target.value })} required />
          </div>
          <div>
            <Label>Region</Label>
            <Input value={formData.region} onChange={(e) => setFormData({ ...formData, region: e.target.value })} required />
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

export default S3ConfigDialog;
