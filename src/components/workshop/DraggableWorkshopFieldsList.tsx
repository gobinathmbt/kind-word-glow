import React from "react";
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
import { GripVertical } from "lucide-react";

interface SortableFieldProps {
  field: any;
  index: number;
  getFieldBorderColor: (field: any) => string;
}

function SortableField({
  field,
  index,
  getFieldBorderColor,
}: SortableFieldProps) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: `field-${field.field_id || index}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center justify-between p-3 bg-white rounded-md border-2 ${getFieldBorderColor(
        field
      )} shadow-sm`}
    >
      <div className="flex items-center space-x-3">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab hover:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex-1">
          <span className="font-medium text-sm">{field.field_name}</span>
          <div className="flex items-center space-x-2 mt-1">
            <Badge variant="outline" className="text-xs">
              {field.field_type}
            </Badge>
            {field.field_value && (
              <Badge variant="secondary" className="text-xs">
                Has Value
              </Badge>
            )}
            {field.images && field.images.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {field.images.length} Images
              </Badge>
            )}
            {field.quotes && field.quotes.length > 0 && (
              <Badge variant="default" className="text-xs">
                {field.quotes.length} Quotes
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface DraggableWorkshopFieldsListProps {
  fields: any[];
  onUpdateOrder: (fields: any[]) => void;
  getFieldBorderColor: (field: any) => string;
}

const DraggableWorkshopFieldsList: React.FC<
  DraggableWorkshopFieldsListProps
> = ({ fields, onUpdateOrder, getFieldBorderColor }) => {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const activeIndex = fields.findIndex(
        (_, index) => `field-${fields[index].field_id || index}` === active.id
      );
      const overIndex = fields.findIndex(
        (_, index) => `field-${fields[index].field_id || index}` === over?.id
      );

      if (activeIndex !== -1 && overIndex !== -1) {
        const newFields = arrayMove(fields, activeIndex, overIndex);
        onUpdateOrder(newFields);
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
        items={fields.map(
          (_, index) => `field-${fields[index].field_id || index}`
        )}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-2">
          {fields.map((field, index) => (
            <SortableField
              key={`field-${field.field_id || index}`}
              field={field}
              index={index}
              getFieldBorderColor={getFieldBorderColor}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
};

export default DraggableWorkshopFieldsList;
