import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Settings, CheckCircle2, Circle } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { companyServices } from '@/api/services';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface CostSetterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CostSetterDialog: React.FC<CostSetterDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const queryClient = useQueryClient();
  const [selectedPurchaseType, setSelectedPurchaseType] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [enabledCostTypes, setEnabledCostTypes] = useState<string[]>([]);
  const [purchaseTypes, setPurchaseTypes] = useState<any[]>([]);
  const [sectionTypes, setSectionTypes] = useState<any[]>([]);

  // Fetch cost setter data
  const { data: costSetterData, isLoading } = useQuery({
    queryKey: ['cost-setter'],
    queryFn: async () => {
      const response = await companyServices.getCostSetter();
      return response.data.data;
    },
    enabled: open,
  });

  // Fetch dropdown values
  useEffect(() => {
    const loadDropdowns = async () => {
      try {
        const response = await companyServices.getCompanyMasterdropdownvalues({
          dropdown_name: ['vehicle_purchase_type', 'vehicle_cost_section_type'],
        });
        if (response.data.success) {
          const data = response.data.data.reduce((acc: any, item: any) => {
            acc[item.dropdown_name] = item.values || [];
            return acc;
          }, {});
          setPurchaseTypes(data.vehicle_purchase_type || []);
          setSectionTypes(data.vehicle_cost_section_type || []);
        }
      } catch (error) {
        console.error('Failed to load dropdowns:', error);
      }
    };
    if (open) {
      loadDropdowns();
    }
  }, [open]);

  // Update cost setter mutation
  const updateCostSetterMutation = useMutation({
    mutationFn: (data: any) => companyServices.updateCostSetter(data),
    onSuccess: () => {
      toast.success('Cost setter updated successfully');
      queryClient.invalidateQueries({ queryKey: ['cost-setter'] });
      queryClient.invalidateQueries({ queryKey: ['cost-configuration'] });
      setIsSettingsOpen(false);
      setSelectedPurchaseType(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update cost setter');
    },
  });

  const handleOpenSettings = (purchaseType: string) => {
    setSelectedPurchaseType(purchaseType);
    
    // Load existing enabled cost types for this purchase type
    const existing = costSetterData?.cost_setter?.find(
      (cs: any) => cs.vehicle_purchase_type === purchaseType
    );
    
    setEnabledCostTypes(
      existing?.enabled_cost_types?.map((ct: any) => ct.toString()) || []
    );
    setIsSettingsOpen(true);
  };

  const handleSaveSettings = () => {
    if (!selectedPurchaseType) return;

    updateCostSetterMutation.mutate({
      vehicle_purchase_type: selectedPurchaseType,
      enabled_cost_types: enabledCostTypes,
    });
  };

  const toggleCostType = (costTypeId: string) => {
    setEnabledCostTypes((prev) =>
      prev.includes(costTypeId)
        ? prev.filter((id) => id !== costTypeId)
        : [...prev, costTypeId]
    );
  };

  // Group cost types by section
  const groupedCostTypes = React.useMemo(() => {
    if (!costSetterData?.cost_types) return {};

    const grouped: Record<string, any[]> = {};
    
    costSetterData.cost_types.forEach((ct: any) => {
      const section = ct.section_type || 'Unassigned';
      if (!grouped[section]) {
        grouped[section] = [];
      }
      grouped[section].push(ct);
    });

    return grouped;
  }, [costSetterData]);

  const getEnabledCount = (purchaseType: string) => {
    const existing = costSetterData?.cost_setter?.find(
      (cs: any) => cs.vehicle_purchase_type === purchaseType
    );
    return existing?.enabled_cost_types?.length || 0;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Cost Setter Configuration</DialogTitle>
            <DialogDescription>
              Configure which cost types are available for each vehicle purchase type
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {isLoading ? (
              <div className="text-center py-8">Loading...</div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="p-3 text-left">No#</th>
                      <th className="p-3 text-left">Vehicle Purchase Type</th>
                      <th className="p-3 text-left">Enabled Cost Types</th>
                      <th className="p-3 text-left">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchaseTypes.length > 0 ? (
                      purchaseTypes.map((purchaseType: any, index: number) => (
                        <tr key={purchaseType._id} className="border-b hover:bg-muted/50">
                          <td className="p-3">{index + 1}</td>
                          <td className="p-3 font-medium">
                            {purchaseType.display_value || purchaseType.option_value}
                          </td>
                          <td className="p-3">
                            <Badge variant="outline">
                              {getEnabledCount(purchaseType.option_value)} enabled
                            </Badge>
                          </td>
                          <td className="p-3">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenSettings(purchaseType.option_value)}
                            >
                              <Settings className="h-4 w-4 mr-2" />
                              Configure
                            </Button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="text-center p-8 text-muted-foreground">
                          No vehicle purchase types found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Configure Cost Types for {selectedPurchaseType}
            </DialogTitle>
            <DialogDescription>
              Select which cost types should be available for this purchase type
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {Object.entries(groupedCostTypes).map(([section, costTypes]) => (
              <div key={section} className="border rounded-lg p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  {section}
                  <Badge variant="outline">{(costTypes as any[]).length}</Badge>
                </h3>
                <div className="space-y-2">
                  {(costTypes as any[]).map((costType: any) => (
                    <div
                      key={costType._id}
                      className="flex items-center space-x-3 p-2 hover:bg-muted/50 rounded"
                    >
                      <Checkbox
                        id={`cost-type-${costType._id}`}
                        checked={enabledCostTypes.includes(costType._id)}
                        onCheckedChange={() => toggleCostType(costType._id)}
                      />
                      <Label
                        htmlFor={`cost-type-${costType._id}`}
                        className="flex-1 cursor-pointer flex items-center gap-2"
                      >
                        {enabledCostTypes.includes(costType._id) ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <Circle className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span>{costType.cost_type}</span>
                        <span className="text-sm text-muted-foreground">
                          ({costType.currency_id?.currency_code})
                        </span>
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setIsSettingsOpen(false);
                setSelectedPurchaseType(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveSettings}
              disabled={updateCostSetterMutation.isPending}
            >
              Save Configuration
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CostSetterDialog;
