import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, Edit2, GripVertical, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { companyServices } from '@/api/services';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight } from 'lucide-react';
import CurrencyManagementDialog from '@/components/cost-config/CurrencyManagementDialog';
import CostSetterDialog from '@/components/cost-config/CostSetterDialog';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface CostType {
  _id: string;
  cost_type: string;
  currency_id: any;
  default_tax_rate: string;
  default_tax_type: string;
  section_type: string;
  change_currency: boolean;
  display_order: number;
}

// Sortable Cost Type Row Component
const SortableCostTypeRow = ({ costType, index, onEdit, onDelete }: any) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: costType._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <tr ref={setNodeRef} style={style} className="border-b hover:bg-muted/50">
      <td className="p-3 text-center">{index + 1}</td>
      <td className="p-3">
        <div className="flex items-center gap-2">
          <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(costType)}
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(costType._id)}
          >
            <Trash2 className="h-4 w-4 text-red-600" />
          </Button>
        </div>
      </td>
      <td className="p-3">{costType.cost_type}</td>
      <td className="p-3">
        {costType.currency_id?.currency_name} ({costType.currency_id?.currency_code})
      </td>
      <td className="p-3">{costType.default_tax_rate || '-'}</td>
      <td className="p-3">{costType.default_tax_type || '-'}</td>
      <td className="p-3 text-sm text-muted-foreground">
        {new Date(costType.created_at).toLocaleString()}
      </td>
      <td className="p-3 text-sm text-muted-foreground">
        {new Date(costType.updated_at).toLocaleString()}
      </td>
    </tr>
  );
};

const CostConfiguration = () => {
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isCurrencyDialogOpen, setIsCurrencyDialogOpen] = useState(false);
  const [isCostSetterDialogOpen, setIsCostSetterDialogOpen] = useState(false);
  const [editingCostType, setEditingCostType] = useState<CostType | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['Unassigned']));
  const [dropdownData, setDropdownData] = useState<any>({});

  const [formData, setFormData] = useState({
    cost_type: '',
    currency_id: '',
    default_tax_rate: '',
    default_tax_type: '',
    section_type: '',
    change_currency: false,
  });

  // Fetch cost configuration
  const { data: costConfig, isLoading: isLoadingConfig } = useQuery({
    queryKey: ['cost-configuration'],
    queryFn: async () => {
      const response = await companyServices.getCostConfiguration();
      return response.data.data;
    },
  });

  // Fetch currencies
  const { data: currenciesData } = useQuery({
    queryKey: ['currencies'],
    queryFn: async () => {
      const response = await companyServices.getCurrencies({ limit: 1000 });
      return response.data.data;
    },
  });

  // Fetch dropdown values
  useEffect(() => {
    const loadDropdowns = async () => {
      try {
        const response = await companyServices.getCompanyMasterdropdownvalues({
          dropdown_name: ['vehicle_tax_type', 'vehicle_cost_section_type', 'vehicle_tax_rate', 'vehicle_cost_type'],
        });
        if (response.data.success) {
          const data = response.data.data.reduce((acc: any, item: any) => {
            acc[item.dropdown_name] = item.values || [];
            return acc;
          }, {});
          setDropdownData(data);
        }
      } catch (error) {
        console.error('Failed to load dropdowns:', error);
      }
    };
    loadDropdowns();
  }, []);

  // Add cost type mutation
  const addCostTypeMutation = useMutation({
    mutationFn: (data: any) => companyServices.addCostType(data),
    onSuccess: () => {
      toast.success('Cost type added successfully');
      queryClient.invalidateQueries({ queryKey: ['cost-configuration'] });
      setIsAddDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to add cost type');
    },
  });

  // Update cost type mutation
  const updateCostTypeMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      companyServices.updateCostType(id, data),
    onSuccess: () => {
      toast.success('Cost type updated successfully');
      queryClient.invalidateQueries({ queryKey: ['cost-configuration'] });
      setIsAddDialogOpen(false);
      setEditingCostType(null);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update cost type');
    },
  });

  // Delete cost type mutation
  const deleteCostTypeMutation = useMutation({
    mutationFn: (id: string) => companyServices.deleteCostType(id),
    onSuccess: () => {
      toast.success('Cost type deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['cost-configuration'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete cost type');
    },
  });

  // Reorder mutation
  const reorderMutation = useMutation({
    mutationFn: (data: any) => companyServices.reorderCostTypes(data),
    onSuccess: () => {
      toast.success('Cost types reordered successfully');
      queryClient.invalidateQueries({ queryKey: ['cost-configuration'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to reorder cost types');
    },
  });

  const resetForm = () => {
    setFormData({
      cost_type: '',
      currency_id: '',
      default_tax_rate: '',
      default_tax_type: '',
      section_type: '',
      change_currency: false,
    });
  };

  const handleEdit = (costType: CostType) => {
    setEditingCostType(costType);
    setFormData({
      cost_type: costType.cost_type,
      currency_id: costType.currency_id?._id || '',
      default_tax_rate: costType.default_tax_rate || '',
      default_tax_type: costType.default_tax_type || '',
      section_type: costType.section_type || '',
      change_currency: costType.change_currency || false,
    });
    setIsAddDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.cost_type || !formData.currency_id) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (editingCostType) {
      updateCostTypeMutation.mutate({
        id: editingCostType._id,
        data: formData,
      });
    } else {
      addCostTypeMutation.mutate(formData);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this cost type?')) {
      deleteCostTypeMutation.mutate(id);
    }
  };

  // Group cost types by section
  const groupedCostTypes = React.useMemo(() => {
    if (!costConfig?.cost_types) return {};

    const grouped: Record<string, CostType[]> = {};
    
    costConfig.cost_types.forEach((ct: CostType) => {
      const section = ct.section_type || 'Unassigned';
      if (!grouped[section]) {
        grouped[section] = [];
      }
      grouped[section].push(ct);
    });

    // Sort each section by display_order
    Object.keys(grouped).forEach(section => {
      grouped[section].sort((a, b) => a.display_order - b.display_order);
    });

    return grouped;
  }, [costConfig]);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: any, sectionType: string) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      const items = groupedCostTypes[sectionType];
      const oldIndex = items.findIndex((item: CostType) => item._id === active.id);
      const newIndex = items.findIndex((item: CostType) => item._id === over.id);

      const newItems = arrayMove(items, oldIndex, newIndex);
      const cost_type_ids = newItems.map((item: CostType) => item._id);

      reorderMutation.mutate({
        section_type: sectionType === 'Unassigned' ? '' : sectionType,
        cost_type_ids,
      });
    }
  };

  return (
    <DashboardLayout title="Cost Configuration">
      <div className="p-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="h-6 w-6" />
                <CardTitle>Cost Types</CardTitle>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsCurrencyDialogOpen(true)}
                >
                  <DollarSign className="h-4 w-4 mr-2" />
                  Manage Currencies
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsCostSetterDialogOpen(true)}
                >
                  <DollarSign className="h-4 w-4 mr-2" />
                  Cost Setter
                </Button>
                <Button onClick={() => {
                  resetForm();
                  setEditingCostType(null);
                  setIsAddDialogOpen(true);
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Cost Type
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingConfig ? (
              <div className="text-center py-8">Loading...</div>
            ) : (
              <div className="space-y-4">
                {Object.entries(groupedCostTypes).map(([section, costTypes]) => (
                  <Collapsible
                    key={section}
                    open={expandedSections.has(section)}
                    onOpenChange={() => toggleSection(section)}
                  >
                    <div className="border rounded-lg">
                      <CollapsibleTrigger asChild>
                        <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50">
                          <div className="flex items-center gap-2">
                            {expandedSections.has(section) ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                            <h3 className="font-semibold">{section}</h3>
                            <Badge variant="outline">{costTypes.length}</Badge>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                            }}
                          >
                            <GripVertical className="h-4 w-4 mr-2" />
                            Reorder
                          </Button>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead className="bg-muted/50">
                              <tr>
                                <th className="p-3 text-left">Order</th>
                                <th className="p-3 text-left">Actions</th>
                                <th className="p-3 text-left">Cost Type</th>
                                <th className="p-3 text-left">Currency</th>
                                <th className="p-3 text-left">Tax Rate</th>
                                <th className="p-3 text-left">Tax Type</th>
                                <th className="p-3 text-left">Created At</th>
                                <th className="p-3 text-left">Modified At</th>
                              </tr>
                            </thead>
                            <tbody>
                              <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragEnd={(event) => handleDragEnd(event, section)}
                              >
                                <SortableContext
                                  items={costTypes.map((ct: CostType) => ct._id)}
                                  strategy={verticalListSortingStrategy}
                                >
                                  {costTypes.map((costType: CostType, idx: number) => (
                                    <SortableCostTypeRow
                                      key={costType._id}
                                      costType={costType}
                                      index={idx}
                                      onEdit={handleEdit}
                                      onDelete={handleDelete}
                                    />
                                  ))}
                                </SortableContext>
                              </DndContext>
                            </tbody>
                          </table>
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                ))}

                {Object.keys(groupedCostTypes).length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No cost types configured yet. Click "Add Cost Type" to get started.
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Cost Type Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingCostType ? 'Edit Cost Type' : 'Add Cost Type'}
            </DialogTitle>
            <DialogDescription>
              Configure cost type details including currency and tax information
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cost_type">Cost Type*</Label>
              <Select
                value={formData.cost_type}
                onValueChange={(value) =>
                  setFormData({ ...formData, cost_type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Cost Type" />
                </SelectTrigger>
                <SelectContent>
                  {dropdownData.vehicle_cost_type?.map((item: any) => (
                    <SelectItem key={item._id} value={item.option_value}>
                      {item.display_value || item.option_value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency_id">Default Currency*</Label>
              <Select
                value={formData.currency_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, currency_id: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Currency" />
                </SelectTrigger>
                <SelectContent>
                  {currenciesData?.map((currency: any) => (
                    <SelectItem key={currency._id} value={currency._id}>
                      {currency.currency_name} ({currency.currency_code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="default_tax_rate">Default Tax Rate</Label>
              <Select
                value={formData.default_tax_rate}
                onValueChange={(value) =>
                  setFormData({ ...formData, default_tax_rate: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Tax Rate" />
                </SelectTrigger>
                <SelectContent>
                  {dropdownData.vehicle_tax_rate?.map((item: any) => (
                    <SelectItem key={item._id} value={item.option_value}>
                      {item.display_value || item.option_value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="default_tax_type">Default Tax Type</Label>
              <Select
                value={formData.default_tax_type}
                onValueChange={(value) =>
                  setFormData({ ...formData, default_tax_type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Tax Type" />
                </SelectTrigger>
                <SelectContent>
                  {dropdownData.vehicle_tax_type?.map((item: any) => (
                    <SelectItem key={item._id} value={item.option_value}>
                      {item.display_value || item.option_value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="section_type">Section Type</Label>
              <Select
                value={formData.section_type}
                onValueChange={(value) =>
                  setFormData({ ...formData, section_type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Section Type" />
                </SelectTrigger>
                <SelectContent>
                  {dropdownData.vehicle_cost_section_type?.map((item: any) => (
                    <SelectItem key={item._id} value={item.option_value}>
                      {item.display_value || item.option_value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2 pt-8">
              <Checkbox
                id="change_currency"
                checked={formData.change_currency}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, change_currency: checked as boolean })
                }
              />
              <Label htmlFor="change_currency" className="cursor-pointer">
                Change Currency
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddDialogOpen(false);
                setEditingCostType(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={addCostTypeMutation.isPending || updateCostTypeMutation.isPending}
            >
              {editingCostType ? 'Update' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Currency Management Dialog */}
      <CurrencyManagementDialog
        open={isCurrencyDialogOpen}
        onOpenChange={setIsCurrencyDialogOpen}
      />

      {/* Cost Setter Dialog */}
      <CostSetterDialog
        open={isCostSetterDialogOpen}
        onOpenChange={setIsCostSetterDialogOpen}
      />
    </DashboardLayout>
  );
};

export default CostConfiguration;
