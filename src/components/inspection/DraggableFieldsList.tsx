
import React from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GripVertical, Edit, Trash2 } from 'lucide-react';

interface SortableFieldProps {
  field: any;
  onEditField: (field: any) => void;
  onDeleteField: (field: any) => void;
}

function SortableField({ field, onEditField, onDeleteField }: SortableFieldProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: field.field_id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between p-2 bg-muted/50 rounded border"
    >
      <div className="flex items-center space-x-2">
        <div {...attributes} {...listeners} className="cursor-grab hover:cursor-grabbing">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
        <span className="font-medium">{field.field_name}</span>
        <Badge variant="outline" className="text-xs">
          {field.field_type}
        </Badge>
        {field.is_required && (
          <Badge variant="outline" className="text-xs">
            Required
          </Badge>
        )}
        {field.has_image && (
          <Badge variant="outline" className="text-xs">
            Image
          </Badge>
        )}
        {field.has_notes && (
          <Badge variant="outline" className="text-xs">
            Image
          </Badge>
        )}
        {field.field_type === "dropdown" && field.dropdown_config?.dropdown_id && (
          <Badge variant="outline" className="text-xs">
            Dropdown
          </Badge>
        )}
      </div>
      <div className="flex items-center space-x-1">
        <Button 
          size="sm" 
          variant="ghost"
          onClick={() => onEditField(field)}
          className="h-8 w-8 p-0"
        >
          <Edit className="h-3 w-3" />
        </Button>
        <Button 
          size="sm" 
          variant="ghost"
          onClick={() => onDeleteField(field)}
          className="h-8 w-8 p-0"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

interface DraggableFieldsListProps {
  fields: any[];
  onEditField: (field: any) => void;
  onDeleteField: (field: any) => void;
  onUpdateOrder: (fields: any[]) => void;
}

const DraggableFieldsList: React.FC<DraggableFieldsListProps> = ({
  fields,
  onEditField,
  onDeleteField,
  onUpdateOrder
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
      const oldIndex = fields.findIndex(field => field.field_id === active.id);
      const newIndex = fields.findIndex(field => field.field_id === over?.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const newFields = arrayMove(fields, oldIndex, newIndex);
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
        items={fields.map(field => field.field_id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-2">
          {fields.map((field) => (
            <SortableField
              key={field.field_id}
              field={field}
              onEditField={onEditField}
              onDeleteField={onDeleteField}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
};

export default DraggableFieldsList;
