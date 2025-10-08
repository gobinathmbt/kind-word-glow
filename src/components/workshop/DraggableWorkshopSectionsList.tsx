import React, { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GripVertical, ChevronDown, ChevronRight } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import DraggableWorkshopFieldsList from "@/components/workshop/DraggableWorkshopFieldsList";

interface SortableSectionProps {
  section: any;
  index: number;
  onUpdateFieldsOrder: (sectionIndex: number, fields: any[]) => void;
  getFieldBorderColor: (field: any) => string;
}

function SortableSection({
  section,
  index,
  onUpdateFieldsOrder,
  getFieldBorderColor,
}: SortableSectionProps) {
  const [isOpen, setIsOpen] = useState(false);

  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: `section-${section.section_id || index}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleFieldsOrderUpdate = (fields: any[]) => {
    onUpdateFieldsOrder(index, fields);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="border rounded-lg bg-white shadow-sm"
    >
      {section.fields && section.fields.length > 0 && (
        <>
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-3 flex-1">
              <div
                {...attributes}
                {...listeners}
                className="cursor-grab hover:cursor-grabbing"
              >
                <GripVertical className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-base">
                  {section.section_name}
                </h4>
                {section.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {section.description}
                  </p>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="outline">
                  {section.fields?.length || 0} fields
                </Badge>
              </div>
            </div>
            {section.fields && section.fields.length > 0 && (
              <Collapsible open={isOpen} onOpenChange={setIsOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm">
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
              </Collapsible>
            )}
          </div>

          {section.fields && section.fields.length > 0 && (
            <Collapsible open={isOpen} onOpenChange={setIsOpen}>
              <CollapsibleContent>
                <div className="p-4">
                  <DraggableWorkshopFieldsList
                    fields={section.fields}
                    onUpdateOrder={handleFieldsOrderUpdate}
                    getFieldBorderColor={getFieldBorderColor}
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </>
      )}
    </div>
  );
}

interface DraggableWorkshopSectionsListProps {
  sections: any[];
  onUpdateSectionsOrder: (sections: any[]) => void;
  onUpdateFieldsOrder: (sectionIndex: number, fields: any[]) => void;
  getFieldBorderColor: (field: any) => string;
}

const DraggableWorkshopSectionsList: React.FC<
  DraggableWorkshopSectionsListProps
> = ({
  sections,
  onUpdateSectionsOrder,
  onUpdateFieldsOrder,
  getFieldBorderColor,
}) => {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const activeIndex = sections.findIndex(
        (_, index) =>
          `section-${sections[index].section_id || index}` === active.id
      );
      const overIndex = sections.findIndex(
        (_, index) =>
          `section-${sections[index].section_id || index}` === over?.id
      );

      if (activeIndex !== -1 && overIndex !== -1) {
        const newSections = arrayMove(sections, activeIndex, overIndex);
        onUpdateSectionsOrder(newSections);
      }
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={sections.map(
          (_, index) => `section-${sections[index].section_id || index}`
        )}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-4">
          {sections.map((section, index) => (
            <SortableSection
              key={`section-${section.section_id || index}`}
              section={section}
              index={index}
              onUpdateFieldsOrder={onUpdateFieldsOrder}
              getFieldBorderColor={getFieldBorderColor}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
};

export default DraggableWorkshopSectionsList;
