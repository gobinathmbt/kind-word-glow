
import React, { useState } from 'react';
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
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { GripVertical, Plus, Trash2 } from 'lucide-react';
import DraggableFieldsList from './DraggableFieldsList';
import SectionDeleteDialog from './SectionDeleteDialog';

interface SortableSectionProps {
  section: any;
  configId: string;
  onDeleteSection: (sectionId: string) => void;
  onAddField: (section: any) => void;
  onEditField: (field: any) => void;
  onDeleteField: (field: any) => void;
  onUpdateFieldsOrder: (sectionId: string, fields: any[]) => void;
  isFieldDialogOpen: boolean;
  setIsFieldDialogOpen: (open: boolean) => void;
  selectedSection: any;
  setSelectedSection: (section: any) => void;
  addFieldForm: React.ReactNode;
  isDeletingSection: boolean;
}

function SortableSection({
  section,
  configId,
  onDeleteSection,
  onAddField,
  onEditField,
  onDeleteField,
  onUpdateFieldsOrder,
  isFieldDialogOpen,
  setIsFieldDialogOpen,
  selectedSection,
  setSelectedSection,
  addFieldForm,
  isDeletingSection
}: SortableSectionProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: section.section_id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleFieldsOrderUpdate = (fields: any[]) => {
    onUpdateFieldsOrder(section.section_id, fields);
  };

  const handleDeleteClick = () => {
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    onDeleteSection(section.section_id);
    setIsDeleteDialogOpen(false);
  };

  return (
    <>
      <div ref={setNodeRef} style={style} className="border rounded-lg p-4 bg-white">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
            <div {...attributes} {...listeners} className="cursor-grab hover:cursor-grabbing">
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <h5 className="font-medium">{section.section_name}</h5>
              <p className="text-sm text-muted-foreground">{section.description}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="outline">{section.fields?.length || 0} fields</Badge>
            <Dialog open={isFieldDialogOpen} onOpenChange={setIsFieldDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedSection(section);
                    onAddField(section);
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              {selectedSection?.section_id === section.section_id && addFieldForm}
            </Dialog>
            <Button
              size="sm"
              variant="outline"
              onClick={handleDeleteClick}
              disabled={isDeletingSection}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Fields List */}
        {section.fields?.length > 0 && (
          <div className="mt-4">
            <DraggableFieldsList
              fields={section.fields.sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0))}
              onEditField={onEditField}
              onDeleteField={onDeleteField}
              onUpdateOrder={handleFieldsOrderUpdate}
            />
          </div>
        )}
      </div>

      <SectionDeleteDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        sectionName={section.section_name}
        isLoading={isDeletingSection}
      />
    </>
  );
}

interface DraggableSectionsListProps {
  sections: any[];
  configId: string;
  onDeleteSection: (sectionId: string) => void;
  onAddField: (section: any) => void;
  onEditField: (field: any) => void;
  onDeleteField: (field: any) => void;
  onUpdateSectionsOrder: (sections: any[]) => void;
  onUpdateFieldsOrder: (sectionId: string, fields: any[]) => void;
  isFieldDialogOpen: boolean;
  setIsFieldDialogOpen: (open: boolean) => void;
  selectedSection: any;
  setSelectedSection: (section: any) => void;
  addFieldForm: React.ReactNode;
  isDeletingSection: boolean;
}

const DraggableSectionsList: React.FC<DraggableSectionsListProps> = ({
  sections,
  configId,
  onDeleteSection,
  onAddField,
  onEditField,
  onDeleteField,
  onUpdateSectionsOrder,
  onUpdateFieldsOrder,
  isFieldDialogOpen,
  setIsFieldDialogOpen,
  selectedSection,
  setSelectedSection,
  addFieldForm,
  isDeletingSection
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
      const oldIndex = sections.findIndex(section => section.section_id === active.id);
      const newIndex = sections.findIndex(section => section.section_id === over?.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const newSections = arrayMove(sections, oldIndex, newIndex);
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
        items={sections.map(section => section.section_id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-4">
          {sections.map((section) => (
            <SortableSection
              key={section.section_id}
              section={section}
              configId={configId}
              onDeleteSection={onDeleteSection}
              onAddField={onAddField}
              onEditField={onEditField}
              onDeleteField={onDeleteField}
              onUpdateFieldsOrder={onUpdateFieldsOrder}
              isFieldDialogOpen={isFieldDialogOpen}
              setIsFieldDialogOpen={setIsFieldDialogOpen}
              selectedSection={selectedSection}
              setSelectedSection={setSelectedSection}
              addFieldForm={addFieldForm}
              isDeletingSection={isDeletingSection}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
};

export default DraggableSectionsList;
