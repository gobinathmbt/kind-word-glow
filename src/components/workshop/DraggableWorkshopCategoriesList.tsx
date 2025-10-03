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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GripVertical, ChevronDown, ChevronRight } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import DraggableWorkshopSectionsList from "./DraggableWorkshopSectionsList";

interface SortableCategoryProps {
  category: any;
  index: number;
  onUpdateSectionsOrder: (categoryIndex: number, sections: any[]) => void;
  onUpdateFieldsOrder: (
    categoryIndex: number,
    sectionIndex: number,
    fields: any[]
  ) => void;
  getFieldBorderColor: (field: any) => string;
}

function SortableCategory({
  category,
  index,
  onUpdateSectionsOrder,
  onUpdateFieldsOrder,
  getFieldBorderColor,
}: SortableCategoryProps) {
  const [isOpen, setIsOpen] = useState(false);

  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: `category-${category.category_id || index}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleSectionsOrderUpdate = (sections: any[]) => {
    onUpdateSectionsOrder(index, sections);
  };

  const handleFieldsOrderUpdate = (sectionIndex: number, fields: any[]) => {
    onUpdateFieldsOrder(index, sectionIndex, fields);
  };

  const getTotalFields = () => {
    return (
      category.sections?.reduce((total: number, section: any) => {
        return total + (section.fields?.length || 0);
      }, 0) || 0
    );
  };

  return (
    <div ref={setNodeRef} style={style}>
      {category.sections && category.sections.length > 0 && (
      <Card className="shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <div
                {...attributes}
                {...listeners}
                className="cursor-grab hover:cursor-grabbing"
              >
                <GripVertical className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-lg">
                  {category.category_name}
                </CardTitle>
                {category.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {category.description}
                  </p>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary">
                  {category.sections?.length || 0} sections
                </Badge>
                <Badge variant="outline">{getTotalFields()} fields</Badge>
              </div>
            </div>
            {category.sections && category.sections.length > 0 && (
              <Collapsible open={isOpen} onOpenChange={setIsOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm">
                    {isOpen ? (
                      <ChevronDown className="h-5 w-5" />
                    ) : (
                      <ChevronRight className="h-5 w-5" />
                    )}
                  </Button>
                </CollapsibleTrigger>
              </Collapsible>
            )}
          </div>
        </CardHeader>

        {category.sections && category.sections.length > 0 && (
          <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <DraggableWorkshopSectionsList
                  sections={category.sections}
                  onUpdateSectionsOrder={handleSectionsOrderUpdate}
                  onUpdateFieldsOrder={handleFieldsOrderUpdate}
                  getFieldBorderColor={getFieldBorderColor}
                />
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        )}
      </Card>
         )}
    </div>
  );
}

interface DraggableWorkshopCategoriesListProps {
  categories: any[];
  onUpdateCategoriesOrder: (categories: any[]) => void;
  onUpdateSectionsOrder: (categoryIndex: number, sections: any[]) => void;
  onUpdateFieldsOrder: (
    categoryIndex: number,
    sectionIndex: number,
    fields: any[]
  ) => void;
  getFieldBorderColor: (field: any) => string;
}
const DraggableWorkshopCategoriesList: React.FC<
  DraggableWorkshopCategoriesListProps
> = ({
  categories,
  onUpdateCategoriesOrder,
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
      const activeIndex = categories.findIndex(
        (_, index) =>
          `category-${categories[index].category_id || index}` === active.id
      );
      const overIndex = categories.findIndex(
        (_, index) =>
          `category-${categories[index].category_id || index}` === over?.id
      );

      if (activeIndex !== -1 && overIndex !== -1) {
        const newCategories = arrayMove(categories, activeIndex, overIndex);
        onUpdateCategoriesOrder(newCategories);
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
        items={categories.map(
          (_, index) => `category-${categories[index].category_id || index}`
        )}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-6">
          {categories.map((category, index) => (
            <SortableCategory
              key={`category-${category.category_id || index}`}
              category={category}
              index={index}
              onUpdateSectionsOrder={onUpdateSectionsOrder}
              onUpdateFieldsOrder={onUpdateFieldsOrder}
              getFieldBorderColor={getFieldBorderColor}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
};

export default DraggableWorkshopCategoriesList;
