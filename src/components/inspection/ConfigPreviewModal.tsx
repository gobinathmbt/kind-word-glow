
import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Camera, Video, Calendar } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { dropdownServices } from '@/api/services';

interface ConfigPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  configData: any;
}

const ConfigPreviewModal: React.FC<ConfigPreviewModalProps> = ({
  isOpen,
  onClose,
  configData
}) => {
  // Load all dropdowns to resolve references
  const { data: allDropdowns } = useQuery({
    queryKey: ['all-dropdowns-for-preview'],
    queryFn: async () => {
      const response = await dropdownServices.getDropdowns();
      return response.data.data;
    },
    enabled: isOpen
  });

  // Function to get dropdown by ID
  const getDropdownById = (dropdownId: string) => {
    if (!allDropdowns || !dropdownId) return null;
    return allDropdowns.find((dropdown: any) => dropdown._id === dropdownId);
  };

  const renderField = (field: any) => {
    const fieldId = `preview-${field.field_id}`;
    
    switch (field.field_type) {
      case 'text':
        return (
          <div key={field.field_id} className="space-y-2">
            <Label htmlFor={fieldId}>
              {field.field_name}
              {field.is_required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              id={fieldId}
              placeholder={field.placeholder || `Enter ${field.field_name.toLowerCase()}`}
              disabled
            />
            {field.help_text && (
              <p className="text-xs text-muted-foreground">{field.help_text}</p>
            )}
          </div>
        );

      case 'number':
        return (
          <div key={field.field_id} className="space-y-2">
            <Label htmlFor={fieldId}>
              {field.field_name}
              {field.is_required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              id={fieldId}
              type="number"
              placeholder={field.placeholder || `Enter ${field.field_name.toLowerCase()}`}
              disabled
            />
            {field.help_text && (
              <p className="text-xs text-muted-foreground">{field.help_text}</p>
            )}
          </div>
        );

      case 'currency':
        return (
          <div key={field.field_id} className="space-y-2">
            <Label htmlFor={fieldId}>
              {field.field_name}
              {field.is_required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                id={fieldId}
                type="number"
                step="0.01"
                className="pl-8"
                placeholder={field.placeholder || "0.00"}
                disabled
              />
            </div>
            {field.help_text && (
              <p className="text-xs text-muted-foreground">{field.help_text}</p>
            )}
          </div>
        );

      case 'date':
        return (
          <div key={field.field_id} className="space-y-2">
            <Label htmlFor={fieldId}>
              {field.field_name}
              {field.is_required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <div className="relative">
              <Input
                id={fieldId}
                type="date"
                disabled
              />
              <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </div>
            {field.help_text && (
              <p className="text-xs text-muted-foreground">{field.help_text}</p>
            )}
          </div>
        );

      case 'boolean':
        return (
          <div key={field.field_id} className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox id={fieldId} disabled />
              <Label htmlFor={fieldId}>
                {field.field_name}
                {field.is_required && <span className="text-red-500 ml-1">*</span>}
              </Label>
            </div>
            {field.help_text && (
              <p className="text-xs text-muted-foreground ml-6">{field.help_text}</p>
            )}
          </div>
        );

      case 'dropdown':
        const dropdown = getDropdownById(field.dropdown_config?.dropdown_id?.$oid || field.dropdown_config?.dropdown_id);
        return (
          <div key={field.field_id} className="space-y-2">
            <Label htmlFor={fieldId}>
              {field.field_name}
              {field.is_required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Select >
              <SelectTrigger>
                <SelectValue placeholder={field.placeholder || `Select ${field.field_name.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                {dropdown?.values?.map((option: any) => (
                  <SelectItem key={option._id} value={option.option_value}>
                    {option.option_value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {field.dropdown_config?.allow_multiple && (
              <Badge variant="outline" className="text-xs">Multiple selections allowed</Badge>
            )}
            {field.help_text && (
              <p className="text-xs text-muted-foreground">{field.help_text}</p>
            )}
          </div>
        );

      case 'image':
        return (
          <div key={field.field_id} className="space-y-2">
            <Label>
              {field.field_name}
              {field.is_required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
              <Camera className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Click to capture image</p>
            </div>
            {field.help_text && (
              <p className="text-xs text-muted-foreground">{field.help_text}</p>
            )}
          </div>
        );

      case 'video':
        return (
          <div key={field.field_id} className="space-y-2">
            <Label>
              {field.field_name}
              {field.is_required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
              <Video className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Click to record video</p>
            </div>
            {field.help_text && (
              <p className="text-xs text-muted-foreground">{field.help_text}</p>
            )}
          </div>
        );

      default:
        return (
          <div key={field.field_id} className="space-y-2">
            <Label htmlFor={fieldId}>
              {field.field_name}
              {field.is_required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              id={fieldId}
              placeholder={field.placeholder || `Enter ${field.field_name.toLowerCase()}`}
              disabled
            />
            {field.help_text && (
              <p className="text-xs text-muted-foreground">{field.help_text}</p>
            )}
          </div>
        );
    }
  };

  if (!configData) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configuration Preview</DialogTitle>
          <DialogDescription>
            Preview how this configuration will appear in the mobile app
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          <Accordion type="single" collapsible className="space-y-4">
            {configData.categories?.map((category: any) => (
              <AccordionItem key={category.category_id} value={category.category_id}>
                <AccordionTrigger className="text-left">
                  <div className="flex items-center justify-between w-full mr-4">
                    <div>
                      <h3 className="font-semibold">{category.category_name}</h3>
                      <p className="text-sm text-muted-foreground">{category.description}</p>
                    </div>
                    <Badge variant="outline">
                      {category.sections?.length || 0} sections
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-6 pl-4">
                    {category.sections?.map((section: any) => (
                      <div key={section.section_id} className="border rounded-lg p-4">
                        <div className="mb-4">
                          <h4 className="font-medium">{section.section_name}</h4>
                          {section.description && (
                            <p className="text-sm text-muted-foreground">{section.description}</p>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {section.fields?.map((field: any) => (
                            <div key={field.field_id} className="space-y-2">
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

export default ConfigPreviewModal;
