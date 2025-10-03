import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Settings, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import InspectionFormField from "./InspectionFormField";
import { MediaItem } from "@/components/common/MediaViewer";
import InspectionCalculations from "./InspectionCalculations";

interface CategorySectionProps {
  config: any;
  calculations: any;
  categories: any[];
  selectedCategory: string;
  onCategoryChange: (categoryId: string) => void;
  formData: any;
  formNotes: any;
  formImages: any;
  formVideos: any;
  validationErrors: any;
  uploading: any;
  onFieldChange: (fieldId: string, value: any, isRequired: boolean) => void;
  onNotesChange: (fieldId: string, notes: string) => void;
  onMultiSelectChange: (
    fieldId: string,
    value: string,
    checked: boolean,
    isRequired: boolean
  ) => void;
  onMultiplierChange: (
    fieldId: string,
    type: "quantity" | "price",
    value: string
  ) => void;
  onFileUpload: (fieldId: string, file: File, isImage: boolean) => void;
  onRemoveImage: (fieldId: string, imageUrl: string) => void;
  onRemoveVideo: (fieldId: string, videoUrl: string) => void;
  onEditWorkshopField?: (
    field: any,
    categoryIndex?: number,
    sectionIndex?: number
  ) => void;
  onDeleteWorkshopField?: (
    field: any,
    categoryIndex?: number,
    sectionIndex?: number
  ) => void;
  onInsertWorkshopField?: (categoryId: string) => void;
  onOpenMediaViewer: (media: MediaItem[], currentMediaId?: string) => void;
  getDropdownById: (dropdownId: any) => any;
  isViewMode: boolean;
  isEditMode: boolean;
  vehicleType: string;
}

const CategorySection: React.FC<CategorySectionProps> = ({
  categories,
  config,
  calculations,
  selectedCategory,
  onCategoryChange,
  formData,
  formNotes,
  formImages,
  formVideos,
  validationErrors,
  uploading,
  onFieldChange,
  onNotesChange,
  onMultiSelectChange,
  onMultiplierChange,
  onFileUpload,
  onRemoveImage,
  onRemoveVideo,
  onEditWorkshopField,
  onDeleteWorkshopField,
  onInsertWorkshopField,
  onOpenMediaViewer,
  getDropdownById,
  isViewMode,
  isEditMode,
  vehicleType,
}) => {
  const sortedCategories = [...categories]
    .filter((cat: any) => cat.is_active)
    .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

  const isWorkshopSection = (section: any) => {
    return (
      section?.section_display_name === "at_workshop_onstaging" ||
      section?.section_id?.includes("workshop_section") ||
      section?.section_name?.includes("At Workshop") ||
      section?.section_name?.includes("Workshop")
    );
  };

  return (
    <Tabs
      value={selectedCategory}
      onValueChange={onCategoryChange}
      className="space-y-6"
    >
      <TabsList className="w-full justify-start h-auto bg-transparent p-0 overflow-x-auto">
        <div className="flex space-x-1 pb-2">
          {sortedCategories.map((category: any) => (
            <TabsTrigger
              key={category.category_id}
              value={category.category_id}
              className="px-4 py-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground whitespace-nowrap"
            >
              {category.category_name}
            </TabsTrigger>
          ))}
        </div>
      </TabsList>

      {sortedCategories.map((category: any, categoryIndex: number) => (
        <TabsContent
          key={category.category_id}
          value={category.category_id}
          className="space-y-6 mt-0"
        >
          {/* Category Header with Insert Field Button */}
          {/* <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg"> */}
          {/* do not remove, might be needed later */}
          {/* <div>  
              <h3 className="text-lg font-semibold">{category.category_name}</h3>
              {category.description && (
                <p className="text-sm text-muted-foreground">
                  {category.description}
                </p>
              )}
            </div> */}
          {/* {isEditMode && onInsertWorkshopField && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onInsertWorkshopField(category.category_id)}
                className="flex items-center gap-1"
              >
                <Plus className="h-3 w-3" />
                Insert Field
              </Button>
            )} */}
          {/* </div> */}
      

          <Accordion type="multiple" className="space-y-4">
            {category.sections
              .sort(
                (a: any, b: any) =>
                  (a.display_order || 0) - (b.display_order || 0)
              )
              .map((section: any, sectionIndex: number) => (
                <AccordionItem
                  key={section.section_id}
                  value={section.section_id}
                  className={`border rounded-lg overflow-hidden ${
                    isWorkshopSection(section)
                      ? "border-2 border-yellow-400"
                      : ""
                  }`}
                >
                  <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50 transition-colors">
                    <div className="flex items-center space-x-3">
                      {isWorkshopSection(section) && (
                        <Settings className="h-4 w-4 text-yellow-600" />
                      )}
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-medium text-primary">
                          {section.display_order + 1 || "?"}
                        </span>
                      </div>
                      <div className="text-left">
                        <h3 className="font-semibold">
                          {section.section_name}
                          {isWorkshopSection(section) && (
                            <Badge
                              variant="outline"
                              className="ml-2 bg-yellow-100 text-yellow-800"
                            >
                              Workshop
                            </Badge>
                          )}
                        </h3>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-0">
                    <div className="space-y-4 px-4 pb-4">
                      {section.fields
                        .sort(
                          (a: any, b: any) =>
                            (a.display_order || 0) - (b.display_order || 0)
                        )
                        .map((field: any) => (
                          <div key={field.field_id}>
                            <InspectionFormField
                              field={field}
                              categoryIndex={categoryIndex}
                              sectionIndex={sectionIndex}
                              section={section}
                              category={category}
                              value={formData[field.field_id] || ""}
                              notes={formNotes[field.field_id] || ""}
                              images={formImages[field.field_id] || []}
                              videos={formVideos[field.field_id] || []}
                              disabled={isViewMode}
                              hasError={validationErrors[field.field_id]}
                              uploading={uploading[field.field_id]}
                              onFieldChange={onFieldChange}
                              onNotesChange={onNotesChange}
                              onMultiSelectChange={onMultiSelectChange}
                              onMultiplierChange={onMultiplierChange}
                              onFileUpload={onFileUpload}
                              onRemoveImage={onRemoveImage}
                              onRemoveVideo={onRemoveVideo}
                              onEditWorkshopField={onEditWorkshopField}
                              onDeleteWorkshopField={onDeleteWorkshopField}
                              onOpenMediaViewer={onOpenMediaViewer}
                              getDropdownById={getDropdownById}
                              isViewMode={isViewMode}
                              isEditMode={isEditMode}
                              vehicleType={vehicleType}
                            />
                          </div>
                        ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
          </Accordion>

              <InspectionCalculations config={config} calculations={calculations} vehicleType={vehicleType} />
        </TabsContent>
      ))}
    </Tabs>
  );
};

export default CategorySection;
