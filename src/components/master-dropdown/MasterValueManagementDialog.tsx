import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Edit, Trash2, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { masterDropdownServices } from "@/api/services";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface MasterValueManagementDialogProps {
  isOpen: boolean;
  onClose: () => void;
  dropdown: any;
  onRefetch: () => void;
}

const SortableRow = ({ value, onEdit, onDelete }: any) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: value._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <TableRow ref={setNodeRef} style={style} {...attributes}>
      <TableCell>
        <div className="flex items-center space-x-2">
          <div {...listeners} className="cursor-grab hover:cursor-grabbing">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
          <span>{value.display_order}</span>
        </div>
      </TableCell>
      <TableCell className="font-medium">{value.option_value}</TableCell>
      <TableCell>{value.display_value || value.option_value}</TableCell>
      <TableCell>
        <Badge variant={value.is_active ? "default" : "secondary"}>
          {value.is_active ? "Active" : "Inactive"}
        </Badge>
      </TableCell>
      <TableCell>
        {value.is_default && <Badge variant="outline">Default</Badge>}
      </TableCell>
      <TableCell>
        <div className="flex items-center space-x-1">
          <Button variant="ghost" size="sm" onClick={() => onEdit(value)}>
            <Edit className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onDelete(value._id)}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
};

const MasterValueManagementDialog: React.FC<
  MasterValueManagementDialogProps
> = ({ isOpen, onClose, dropdown, onRefetch }) => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState(null);
  const [localDropdown, setLocalDropdown] = useState(dropdown);
  const [valueFormData, setValueFormData] = useState({
    option_value: "",
    display_value: "",
    display_order: 0,
    is_default: false,
    is_active: true,
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    setLocalDropdown(dropdown);
  }, [dropdown]);

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      const oldIndex = localDropdown.values.findIndex(
        (item: any) => item._id === active.id
      );
      const newIndex = localDropdown.values.findIndex(
        (item: any) => item._id === over.id
      );

      const newValues = arrayMove(localDropdown.values, oldIndex, newIndex);

      // Update display orders
      const updatedValues = newValues.map((value: any, index: number) => ({
        ...value,
        display_order: index,
      }));

      // Update local state immediately for UI responsiveness
      setLocalDropdown({ ...localDropdown, values: updatedValues });

      // Update backend
      try {
        const valueIds = updatedValues.map((value: any) => value._id);
        const response = await masterDropdownServices.reorderMasterValues(
          dropdown._id,
          { valueIds }
        );

        // Update local state with backend response to ensure consistency
        setLocalDropdown(response.data.data);

        toast.success("Values reordered successfully");
        onRefetch(); // Refresh the main dropdown list
      } catch (error) {
        toast.error("Failed to reorder values");
        // Revert local state on error
        setLocalDropdown(dropdown);
      }
    }
  };

  const handleAddValue = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await masterDropdownServices.addMasterValue(
        dropdown._id,
        valueFormData
      );
      setLocalDropdown(response.data.data);
      toast.success("Value added successfully");
      setIsAddDialogOpen(false);
      setValueFormData({
        option_value: "",
        display_value: "",
        display_order: localDropdown?.values?.length || 0, // reset properly for next add
        is_default: false,
        is_active: true,
      });
      onRefetch();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to add value");
    }
  };

  const handleEditValue = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await masterDropdownServices.updateMasterValue(
        dropdown._id,
        selectedValue._id,
        valueFormData
      );
      setLocalDropdown(response.data.data);
      toast.success("Value updated successfully");
      setIsEditDialogOpen(false);
      setSelectedValue(null);
      onRefetch();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update value");
    }
  };

  const handleDeleteValue = async (valueId: string) => {
    try {
      const response = await masterDropdownServices.deleteMasterValue(
        dropdown._id,
        valueId
      );
      setLocalDropdown(response.data.data);
      toast.success("Value deleted successfully");
      onRefetch();
    } catch (error) {
      toast.error("Failed to delete value");
    }
  };

  const openEditDialog = (value: any) => {
    setSelectedValue(value);
    setValueFormData({
      option_value: value.option_value,
      display_value: value.display_value || value.option_value,
      display_order: value.display_order,
      is_default: value.is_default,
      is_active: value.is_active,
    });
    setIsEditDialogOpen(true);
  };

  const sortedValues =
    localDropdown?.values?.sort(
      (a: any, b: any) => a.display_order - b.display_order
    ) || [];

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              Manage Master Values - {dropdown?.display_name}
            </DialogTitle>
            <DialogDescription>
              Add, edit, and manage option values for this master dropdown. Drag
              to reorder.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 space-y-4 overflow-hidden">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Option Values</h3>
              <Button
                onClick={() => {
                  const nextOrder = localDropdown?.values?.length || 0; // next available index
                  setValueFormData({
                    option_value: "",
                    display_value: "",
                    display_order: nextOrder,
                    is_default: false,
                    is_active: true,
                  });
                  setIsAddDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Value
              </Button>
            </div>

            <div className="border rounded-md">
              <ScrollArea className="h-[400px]">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <Table>
                    <TableHeader className="sticky top-0 bg-background z-10 border-b">
                      <TableRow>
                        <TableHead className="w-20">Order</TableHead>
                        <TableHead>Option Value</TableHead>
                        <TableHead>Display Value</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Default</TableHead>
                        <TableHead className="w-24">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <SortableContext
                        items={sortedValues.map((value: any) => value._id)}
                        strategy={verticalListSortingStrategy}
                      >
                        {sortedValues.map((value: any) => (
                          <SortableRow
                            key={value._id}
                            value={value}
                            onEdit={openEditDialog}
                            onDelete={handleDeleteValue}
                          />
                        ))}
                      </SortableContext>
                    </TableBody>
                  </Table>
                </DndContext>
              </ScrollArea>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Value Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Value to {dropdown?.display_name}</DialogTitle>
            <DialogDescription>
              Add a new option value to this master dropdown. Only one default
              value is allowed per dropdown.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddValue} className="space-y-4">
            <div>
              <Label htmlFor="option_value">Option Value</Label>
              <Input
                id="option_value"
                value={valueFormData.option_value}
                onChange={(e) =>
                  setValueFormData({
                    ...valueFormData,
                    option_value: e.target.value,
                  })
                }
                placeholder="excellent"
                required
              />
            </div>
            <div>
              <Label htmlFor="display_value">Display Value</Label>
              <Input
                id="display_value"
                value={valueFormData.display_value}
                onChange={(e) =>
                  setValueFormData({
                    ...valueFormData,
                    display_value: e.target.value,
                  })
                }
                placeholder="Excellent"
                required
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="is_default"
                checked={valueFormData.is_default}
                onCheckedChange={(checked) =>
                  setValueFormData({ ...valueFormData, is_default: checked })
                }
              />
              <Label htmlFor="is_default">
                Default value (will override existing default)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={valueFormData.is_active}
                onCheckedChange={(checked) =>
                  setValueFormData({ ...valueFormData, is_active: checked })
                }
              />
              <Label htmlFor="is_active">Active</Label>
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Add Value</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Value Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Value</DialogTitle>
            <DialogDescription>
              Update this option value. Only one default value is allowed per
              dropdown.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditValue} className="space-y-4">
            <div>
              <Label htmlFor="edit_option_value">Option Value</Label>
              <Input
                id="edit_option_value"
                value={valueFormData.option_value}
                onChange={(e) =>
                  setValueFormData({
                    ...valueFormData,
                    option_value: e.target.value,
                  })
                }
                placeholder="excellent"
                required
              />
            </div>
            <div>
              <Label htmlFor="edit_display_value">Display Value</Label>
              <Input
                id="edit_display_value"
                value={valueFormData.display_value}
                onChange={(e) =>
                  setValueFormData({
                    ...valueFormData,
                    display_value: e.target.value,
                  })
                }
                placeholder="Excellent"
                required
              />
            </div>
            <div>
              <Label htmlFor="edit_display_order">Display Order</Label>
              <Input
                id="edit_display_order"
                type="number"
                value={valueFormData.display_order}
                onChange={(e) =>
                  setValueFormData({
                    ...valueFormData,
                    display_order: parseInt(e.target.value),
                  })
                }
                placeholder="0"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="edit_is_default"
                checked={valueFormData.is_default}
                onCheckedChange={(checked) =>
                  setValueFormData({ ...valueFormData, is_default: checked })
                }
              />
              <Label htmlFor="edit_is_default">
                Default value (will override existing default)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="edit_is_active"
                checked={valueFormData.is_active}
                onCheckedChange={(checked) =>
                  setValueFormData({ ...valueFormData, is_active: checked })
                }
              />
              <Label htmlFor="edit_is_active">Active</Label>
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Update Value</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MasterValueManagementDialog;
