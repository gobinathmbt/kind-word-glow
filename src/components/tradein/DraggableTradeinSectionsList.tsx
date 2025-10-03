
import React, { useState } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { GripVertical, Trash2, Plus } from 'lucide-react';
import { configServices } from '@/api/services';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import DraggableTradeinFieldsList from './DraggableTradeinFieldsList';
import { SectionDeleteDialog } from './SectionDeleteDialog';

interface SortableSectionProps {
  section: any;
  selectedConfig: any;
  onAddField: (section: any) => void;
  onEditField: (field: any, section: any) => void;
  onDeleteField: (fieldId: string, sectionId: string) => void;
  dropdowns?: any[];
}

function SortableSection({ section, selectedConfig, onAddField, onEditField, onDeleteField, dropdowns }: SortableSectionProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.section_id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const queryClient = useQueryClient();

  const handleDeleteSection = async () => {
    setIsDeleting(true);
    try {
      await configServices.deleteTradeinSection(selectedConfig._id, section.section_id);
      toast.success('Section deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['tradein-config-details', selectedConfig._id] });
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error('Delete section error:', error);
      toast.error('Failed to delete section');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div ref={setNodeRef} style={style}>
      <AccordionItem value={section.section_id}>
        <AccordionTrigger className="text-left hover:no-underline">
          <div className="flex items-center justify-between w-full mr-4">
            <div className="flex items-center gap-3">
              <div {...attributes} {...listeners} className="cursor-grab hover:cursor-grabbing">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold">{section.section_name}</h3>
                <p className="text-sm text-muted-foreground">{section.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{section.fields?.length || 0} fields</Badge>
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteDialogOpen(true);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </AccordionTrigger>
        <AccordionContent>
          <div className="space-y-4 pl-4">
            <div className="flex justify-between items-center">
              <h4 className="font-medium">Fields</h4>
              <Button size="sm" variant="outline" onClick={() => onAddField(section)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Field
              </Button>
            </div>

            {section.fields?.length > 0 && (
              <DraggableTradeinFieldsList
                fields={section.fields}
                sectionId={section.section_id}
                configId={selectedConfig._id}
                onEditField={(field) => onEditField(field, section)}
                onDeleteField={onDeleteField}
                dropdowns={dropdowns}
              />
            )}
          </div>
        </AccordionContent>
      </AccordionItem>
      
      <SectionDeleteDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDeleteSection}
        sectionName={section.section_name}
        isLoading={isDeleting}
      />
    </div>
  );
}

interface DraggableTradeinSectionsListProps {
  sections: any[];
  selectedConfig: any;
  onAddField: (section: any) => void;
  onEditField: (field: any, section: any) => void;
  onDeleteField: (fieldId: string, sectionId: string) => void;
  dropdowns?: any[];
}

const DraggableTradeinSectionsList: React.FC<DraggableTradeinSectionsListProps> = ({
  sections,
  selectedConfig,
  onAddField,
  onEditField,
  onDeleteField,
  dropdowns
}) => {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const queryClient = useQueryClient();

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = sections.findIndex((section) => section.section_id === active.id);
      const newIndex = sections.findIndex((section) => section.section_id === over.id);

      const newSections = arrayMove(sections, oldIndex, newIndex);
      
      // Update display_order for all sections
      const sectionsWithOrder = newSections.map((section, index) => ({
        section_id: section.section_id,
        display_order: index
      }));

      try {
        await configServices.updateTradeinSectionsOrder(selectedConfig._id, { sections: sectionsWithOrder });
        toast.success('Section order updated');
        queryClient.invalidateQueries({ queryKey: ['tradein-config-details', selectedConfig._id] });
      } catch (error) {
        console.error('Reorder sections error:', error);
        toast.error('Failed to update section order');
      }
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={sections.map(s => s.section_id)} strategy={verticalListSortingStrategy}>
        <Accordion type="single" collapsible className="space-y-4">
          {sections.map((section) => (
            <SortableSection
              key={section.section_id}
              section={section}
              selectedConfig={selectedConfig}
              onAddField={onAddField}
              onEditField={onEditField}
              onDeleteField={onDeleteField}
              dropdowns={dropdowns}
            />
          ))}
        </Accordion>
      </SortableContext>
    </DndContext>
  );
};

export default DraggableTradeinSectionsList;
