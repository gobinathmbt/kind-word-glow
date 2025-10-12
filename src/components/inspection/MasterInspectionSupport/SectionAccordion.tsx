import React from "react";
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
import InspectionCalculations from "./InspectionCalculations";
import { MediaItem } from "@/components/common/MediaViewer";

interface SectionAccordionProps {
  config: any;
  sections: any[];
  calculations: any;
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
  onInsertWorkshopField?: () => void;
  onOpenMediaViewer: (media: MediaItem[], currentMediaId?: string) => void;
  getDropdownById: (dropdownId: any) => any;
  isViewMode: boolean;
  isEditMode: boolean;
  vehicleType: string;
}

const SectionAccordion: React.FC<SectionAccordionProps> = ({
  config,
  sections,
  calculations,
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
  const sortedSections = [...sections].sort(
    (a, b) => (a.display_order || 0) - (b.display_order || 0)
  );

  const isWorkshopSection = (section: any) => {
    return (
      section?.section_display_name === "at_workshop_onstaging" ||
      section?.section_id?.includes("workshop_section") ||
      section?.section_name?.includes("At Workshop") ||
      section?.section_name?.includes("Workshop")
    );
  };

  return (
    <div className="space-y-6">
      {/* do not remove, might be needed later */}
      {/*Insert Job cards Button for non-inspection types */}
      {/* {isEditMode && onInsertWorkshopField && vehicleType !== "inspection" && (
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Sections</h3>
          <Button
            variant="default"
            onClick={onInsertWorkshopField}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
       Insert Job cards
          </Button>
        </div>
      )} */}

      {/* Sections */}
      <Accordion type="multiple" className="space-y-4">
        {sortedSections.map((section: any, sectionIndex: number) => (
          <AccordionItem
            key={section.section_id}
            value={section.section_id}
            className={`border rounded-lg overflow-hidden ${
              isWorkshopSection(section) ? "border-2 border-yellow-400" : ""
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
                        sectionIndex={sectionIndex}
                        section={section}
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
      <InspectionCalculations
        config={config}
        calculations={calculations}
        vehicleType={vehicleType}
      />
    </div>
  );
};

export default SectionAccordion;
