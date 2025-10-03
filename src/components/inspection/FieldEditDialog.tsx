
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { configServices, dropdownServices } from '@/api/services';
import { toast } from 'sonner';

interface FieldEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  configId: string;
  field: any;
}

const FieldEditDialog: React.FC<FieldEditDialogProps> = ({
  isOpen,
  onClose,
  configId,
  field
}) => {
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    field_name: '',
    field_type: 'text',
    is_required: false,
    has_image: false,
    has_notes: false,
    placeholder: '',
    help_text: '',
    dropdown_config: {
      dropdown_id: '',
      allow_multiple: false
    },
  });

  // Load dropdowns for dropdown field type
  const { data: dropdowns } = useQuery({
    queryKey: ['dropdowns-for-field-edit'],
    queryFn: async () => {
      const response = await dropdownServices.getDropdowns();
      return response.data.data;
    },
    enabled: isOpen && formData.field_type === 'dropdown'
  });

  useEffect(() => {
    if (field && isOpen) {
      setFormData({
        field_name: field.field_name || '',
        field_type: field.field_type || 'text',
        is_required: field.is_required || false,
        has_image: field.has_image || false,
        has_notes: field.has_notes || false,
        placeholder: field.placeholder || '',
        help_text: field.help_text || '',
        dropdown_config: {
          dropdown_id: field.dropdown_config?.dropdown_id?.$oid || field.dropdown_config?.dropdown_id || '',
          allow_multiple: field.dropdown_config?.allow_multiple || false
        },
      });
    }
  }, [field, isOpen]);

  const updateFieldMutation = useMutation({
    mutationFn: ({ configId, fieldId, data }: { configId: string; fieldId: string; data: any }) =>
      configServices.updateInspectionField(configId, fieldId, data),
    onSuccess: () => {
      toast.success('Field updated successfully');
      onClose();
      queryClient.invalidateQueries({ queryKey: ['inspection-config-details'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update field');
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!field || !configId) return;

    const updateData = {
      field_name: formData.field_name,
      field_type: formData.field_type,
      is_required: formData.is_required,
      has_image: formData.has_image,
      has_notes: formData.has_notes,
      placeholder: formData.placeholder,
      help_text: formData.help_text,
      dropdown_config: formData.field_type === 'dropdown' ? {
        dropdown_id: formData.dropdown_config.dropdown_id,
        allow_multiple: formData.dropdown_config.allow_multiple
      } : undefined,
    };

    updateFieldMutation.mutate({
      configId,
      fieldId: field.field_id,
      data: updateData
    });
  };

  const fieldTypes = [
    { value: "text", label: "Text" },
    { value: "number", label: "Number" },
    { value: "currency", label: "Currency" },
    { value: "video", label: "Video" },
    { value: "dropdown", label: "Dropdown" },
    { value: "date", label: "Date" },
    { value: "boolean", label: "Yes/No" },
    { value: "calculation_field", label: "Calculation Field" },
    { value: "mutiplier", label: "Mutiply Field" },

  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Field</DialogTitle>
          <DialogDescription>
            Modify the field properties and configuration
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="field_name">Field Name</Label>
            <Input
              id="field_name"
              value={formData.field_name}
              onChange={(e) => setFormData({ ...formData, field_name: e.target.value })}
              placeholder="Field name"
              required
            />
          </div>
          
          <div>
            <Label htmlFor="field_type">Field Type</Label>
            <Select
              value={formData.field_type}
              onValueChange={(value) => setFormData({ 
                ...formData, 
                field_type: value,
                dropdown_config: value === 'dropdown' ? formData.dropdown_config : { dropdown_id: '', allow_multiple: false }
              })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {fieldTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Dropdown Configuration */}
          {formData.field_type === 'dropdown' && (
            <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
              <h4 className="font-medium">Dropdown Configuration</h4>
              <div>
                <Label htmlFor="dropdown_select">Select Dropdown</Label>
                <Select
                  value={formData.dropdown_config.dropdown_id}
                  onValueChange={(value) => setFormData({
                    ...formData,
                    dropdown_config: {
                      ...formData.dropdown_config,
                      dropdown_id: value
                    }
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a dropdown" />
                  </SelectTrigger>
                  <SelectContent>
                    {dropdowns?.map((dropdown: any) => (
                      <SelectItem key={dropdown._id} value={dropdown._id}>
                        {dropdown.display_name} ({dropdown.dropdown_name})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="allow_multiple"
                  checked={formData.dropdown_config.allow_multiple}
                  onCheckedChange={(checked) => setFormData({
                    ...formData,
                    dropdown_config: {
                      ...formData.dropdown_config,
                      allow_multiple: checked === true
                    }
                  })}
                />
                <Label htmlFor="allow_multiple">Allow multiple selections</Label>
              </div>
            </div>
          )}


          <div>
            <Label htmlFor="placeholder">Placeholder Text</Label>
            <Input
              id="placeholder"
              value={formData.placeholder}
              onChange={(e) => setFormData({ ...formData, placeholder: e.target.value })}
              placeholder="Enter placeholder text"
            />
          </div>

          <div>
            <Label htmlFor="help_text">Help Text</Label>
            <Input
              id="help_text"
              value={formData.help_text}
              onChange={(e) => setFormData({ ...formData, help_text: e.target.value })}
              placeholder="Enter help text"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_required"
              checked={formData.is_required}
              onCheckedChange={(checked) => setFormData({ ...formData, is_required: checked === true })}
            />
            <Label htmlFor="is_required">Required field</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="has_image"
              checked={formData.has_image}
              onCheckedChange={(checked) => setFormData({ ...formData, has_image: checked === true })}
            />
            <Label htmlFor="has_image">Include image capture</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="has_notes"
              checked={formData.has_notes}
              onCheckedChange={(checked) => setFormData({ ...formData, has_notes: checked === true })}
            />
            <Label htmlFor="has_notes">Allow To Enter Notes</Label>
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateFieldMutation.isPending}>
              {updateFieldMutation.isPending ? 'Updating...' : 'Update Field'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default FieldEditDialog;
