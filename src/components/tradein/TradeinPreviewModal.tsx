import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Camera, Video, Calendar } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { dropdownServices } from '@/api/services';

interface TradeinPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: any;
  dropdowns?: any[];
}

export const TradeinPreviewModal: React.FC<TradeinPreviewModalProps> = ({
  isOpen,
  onClose,
  config
}) => {
  // Load dropdowns for resolving references
  const { data: allDropdowns } = useQuery({
    queryKey: ['all-dropdowns-tradein-preview'],
    queryFn: async () => {
      const response = await dropdownServices.getDropdowns();
      return response.data.data;
    },
    enabled: isOpen
  });

  const getDropdownById = (dropdownId: string) => {
    if (!allDropdowns || !dropdownId) return null;
    return allDropdowns.find((d: any) => d._id === dropdownId);
  };

  const renderField = (field: any) => {
    const fieldId = `preview-${field.field_id}`;

    switch (field.field_type) {
      case 'text':
      case 'number':
        return (
          <div className="space-y-2">
            <Label htmlFor={fieldId}>
              {field.field_name}
              {field.is_required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              id={fieldId}
              type={field.field_type === 'number' ? 'number' : 'text'}
              placeholder={field.placeholder || `Enter ${field.field_name.toLowerCase()}`}
              disabled
            />
            {field.help_text && <p className="text-xs text-muted-foreground">{field.help_text}</p>}
          </div>
        );

      case 'currency':
        return (
          <div className="space-y-2">
            <Label htmlFor={fieldId}>
              {field.field_name}
              {field.is_required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input id={fieldId} type="number" step="0.01" className="pl-8" placeholder="0.00" disabled />
            </div>
            {field.help_text && <p className="text-xs text-muted-foreground">{field.help_text}</p>}
          </div>
        );

      case 'date':
        return (
          <div className="space-y-2">
            <Label htmlFor={fieldId}>
              {field.field_name}
              {field.is_required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <div className="relative">
              <Input id={fieldId} type="date" disabled />
              <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </div>
            {field.help_text && <p className="text-xs text-muted-foreground">{field.help_text}</p>}
          </div>
        );

      case 'boolean':
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Checkbox id={fieldId} disabled />
              <Label htmlFor={fieldId}>{field.field_name}</Label>
              {field.is_required && <span className="text-red-500 ml-1">*</span>}
            </div>
            {field.help_text && <p className="text-xs text-muted-foreground ml-6">{field.help_text}</p>}
          </div>
        );

      case 'dropdown':
        const dropdown = getDropdownById(
          field.dropdown_config?.dropdown_id?.$oid || field.dropdown_config?.dropdown_id
        );
        return (
          <div className="space-y-2">
            <Label htmlFor={fieldId}>
              {field.field_name}
              {field.is_required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder={field.placeholder || `Select ${field.field_name}`} />
              </SelectTrigger>
              <SelectContent>
                {dropdown?.values?.map((opt: any) => (
                  <SelectItem key={opt._id} value={opt.option_value}>
                    {opt.option_value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {field.dropdown_config?.allow_multiple && (
              <Badge variant="outline" className="text-xs">Multiple selections allowed</Badge>
            )}
            {field.help_text && <p className="text-xs text-muted-foreground">{field.help_text}</p>}
          </div>
        );

      case 'image':
        return (
          <div className="space-y-2">
            <Label>{field.field_name}</Label>
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
              <Camera className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Click to upload image</p>
            </div>
            {field.help_text && <p className="text-xs text-muted-foreground">{field.help_text}</p>}
          </div>
        );

      case 'video':
        return (
          <div className="space-y-2">
            <Label>{field.field_name}</Label>
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
              <Video className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Click to upload video</p>
            </div>
            {field.help_text && <p className="text-xs text-muted-foreground">{field.help_text}</p>}
          </div>
        );

      default:
        return (
          <div className="space-y-2">
            <Label htmlFor={fieldId}>{field.field_name}</Label>
            <Textarea id={fieldId} placeholder={field.placeholder || `Enter ${field.field_name}`} disabled />
            {field.help_text && <p className="text-xs text-muted-foreground">{field.help_text}</p>}
          </div>
        );
    }
  };

  if (!config) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Trade-in Configuration Preview</DialogTitle>
          <DialogDescription>
            Preview of "{config.config_name}" – This is how the form will appear to users
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <Accordion type="single" collapsible className="space-y-4">
            {config.sections?.map((section: any) => (
              <AccordionItem key={section.section_id} value={section.section_id}>
                <AccordionTrigger className={section.is_collapsible ? '' : 'pointer-events-none'}>
                  <div className="text-left">
                    <h3 className="font-semibold">{section.section_name}</h3>
                    {section.description && <p className="text-sm text-muted-foreground">{section.description}</p>}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-2">
                    {section.fields?.map((field: any) => (
                      <div key={field.field_id}>
                        {renderField(field)}
                        {field.has_image && field.field_type !== 'image' && (
                          <div className="mt-2">
                            <div className="border border-dashed border-muted-foreground/25 rounded p-3 text-center">
                              <Camera className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
                              <p className="text-xs text-muted-foreground">Optional image</p>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={onClose}>Close Preview</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

