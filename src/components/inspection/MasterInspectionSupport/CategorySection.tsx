import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Settings, Plus, Trash2, Edit } from "lucide-react";
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
  formWorkshopFlags?: any;
  validationErrors: any;
  uploading: any;
  onFieldChange: (fieldId: string, value: any, isRequired: boolean) => void;
  onNotesChange: (fieldId: string, notes: string) => void;
  onWorkshopFlagChange?: (fieldId: string, required: boolean) => void;
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
  onAddSection?: (categoryId: string) => void;
  onAddCategory?: () => void;
  onEditCategory?: (category: any) => void;
  onDeleteCategory?: (category: any) => void;
  onEditSection?: (section: any, categoryId: string) => void;
  onDeleteSection?: (section: any, categoryId: string) => void;
  onEditField?: (field: any, categoryId: string, sectionId: string) => void;
  onDeleteField?: (field: any, categoryId: string, sectionId: string) => void;
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
  formWorkshopFlags,
  validationErrors,
  uploading,
  onFieldChange,
  onNotesChange,
  onWorkshopFlagChange,
  onMultiSelectChange,
  onMultiplierChange,
  onFileUpload,
  onRemoveImage,
  onRemoveVideo,
  onEditWorkshopField,
  onDeleteWorkshopField,
  onInsertWorkshopField,
  onAddSection,
  onAddCategory,
  onEditCategory,
  onDeleteCategory,
  onEditSection,
  onDeleteSection,
  onEditField,
  onDeleteField,
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
        <div className="flex space-x-1 pb-2 items-center">
          {sortedCategories.map((category: any) => (
            <TabsTrigger
              key={category.category_id}
              value={category.category_id}
              className="px-4 py-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground whitespace-nowrap"
            >
              {category.category_name}
            </TabsTrigger>
          ))}
          {config._id === "template_free_mode" && isEditMode && onAddCategory && (
            <Button
              size="sm"
              variant="outline"
              onClick={onAddCategory}
              className="flex items-center gap-1 bg-purple-50 hover:bg-purple-100 text-purple-700 hover:text-purple-800 border-purple-200 ml-2"
            >
              <Plus className="h-4 w-4" />
              Add Category
            </Button>
          )}
        </div>
      </TabsList>

      {sortedCategories.map((category: any, categoryIndex: number) => (
        <TabsContent
          key={category.category_id}
          value={category.category_id}
          className="space-y-6 mt-0"
        >
          {/* Category Header with Add Section Button - Only for Template Free Mode */}
          {config._id === "template_free_mode" && (
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg mb-4">
              <div>  
                <h3 className="text-lg font-semibold">{category.category_name}</h3>
                {category.description && (
                  <p className="text-sm text-muted-foreground">
                    {category.description}
                  </p>
                )}
              </div>
              {isEditMode && (
                <div className="flex items-center gap-2">
                  {onEditCategory && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onEditCategory(category)}
                      className="flex items-center gap-1 bg-blue-50 hover:bg-blue-100 text-blue-700 hover:text-blue-800 border-blue-200"
                    >
                      <Settings className="h-4 w-4" />
                      Edit Category
                    </Button>
                  )}
                  {onDeleteCategory && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onDeleteCategory(category)}
                      className="flex items-center gap-1 bg-red-50 hover:bg-red-100 text-red-700 hover:text-red-800 border-red-200"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete Category
                    </Button>
                  )}
                  {onAddSection && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onAddSection(category.category_id)}
                      className="flex items-center gap-1 bg-green-50 hover:bg-green-100 text-green-700 hover:text-green-800 border-green-200"
                    >
                      <Plus className="h-4 w-4" />
                      Add Section
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
      

          {/* Show empty state if no sections in template free mode */}
          {config._id === "template_free_mode" && (!category.sections || category.sections.length === 0) ? (
            <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
              <p className="text-muted-foreground mb-3">No sections yet in this category.</p>
              <p className="text-sm text-muted-foreground">Click "Add Section" above to create your first section.</p>
            </div>
          ) : (
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
                    <div className="flex items-center justify-between w-full mr-4">
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
                      {config._id === "template_free_mode" && isEditMode && (
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          {onEditSection && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => onEditSection(section, category.category_id)}
                              className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                          )}
                          {onDeleteSection && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => onDeleteSection(section, category.category_id)}
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-0">
                    {/* Add Field button for template free mode */}
                    {config._id === "template_free_mode" && isEditMode && (
                      <div className="px-4 pt-4 pb-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            if (onInsertWorkshopField) {
                              onInsertWorkshopField(category.category_id);
                            }
                          }}
                          className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Field to this Section
                        </Button>
                      </div>
                    )}
                    
                    <div className="space-y-4 px-4 pb-4">
                      {section.fields && section.fields.length > 0 ? (
                        section.fields
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
                              workshopWorkRequired={formWorkshopFlags?.[field.field_id]}
                              disabled={isViewMode}
                              hasError={validationErrors[field.field_id]}
                              uploading={uploading[field.field_id]}
                              onFieldChange={onFieldChange}
                              onNotesChange={onNotesChange}
                              onWorkshopFlagChange={onWorkshopFlagChange}
                              onMultiSelectChange={onMultiSelectChange}
                              onMultiplierChange={onMultiplierChange}
                              onFileUpload={onFileUpload}
                              onRemoveImage={onRemoveImage}
                              onRemoveVideo={onRemoveVideo}
                              onEditWorkshopField={onEditWorkshopField}
                              onDeleteWorkshopField={onDeleteWorkshopField}
                              onEditField={config._id === "template_free_mode" ? () => onEditField?.(field, category.category_id, section.section_id) : undefined}
                              onDeleteField={config._id === "template_free_mode" ? () => onDeleteField?.(field, category.category_id, section.section_id) : undefined}
                              onOpenMediaViewer={onOpenMediaViewer}
                              getDropdownById={getDropdownById}
                              isViewMode={isViewMode}
                              isEditMode={isEditMode}
                              vehicleType={vehicleType}
                            />
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <p className="mb-2">No fields in this section yet.</p>
                          {config._id === "template_free_mode" && isEditMode && onInsertWorkshopField && (
                            <p className="text-sm">
                              Click "Add Field" above to add custom fields.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}

          <InspectionCalculations config={config} calculations={calculations} vehicleType={vehicleType} />
        </TabsContent>
      ))}
    </Tabs>
  );
};

export default CategorySection;
