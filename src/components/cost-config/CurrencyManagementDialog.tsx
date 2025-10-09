import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Edit2, Trash2, Search } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { companyServices } from '@/api/services';
import { countries } from 'countries-list';

interface CurrencyManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CurrencyManagementDialog: React.FC<CurrencyManagementDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingCurrency, setEditingCurrency] = useState<any>(null);
  const [search, setSearch] = useState('');

  const [formData, setFormData] = useState({
    currency_name: '',
    currency_code: '',
    symbol: '',
    country: '',
    exchange_rate: 1,
    symbol_position: 'before',
  });

  // Get country list
  const countryList = Object.entries(countries).map(([code, data]) => ({
    code,
    name: data.name,
    currency: data.currency,
  }));

  // Fetch currencies
  const { data: currenciesData, isLoading } = useQuery({
    queryKey: ['currencies', search],
    queryFn: async () => {
      const response = await companyServices.getCurrencies({
        search,
        limit: 1000,
      });
      return response.data.data;
    },
    enabled: open,
  });

  // Create currency mutation
  const createCurrencyMutation = useMutation({
    mutationFn: (data: any) => companyServices.createCurrency(data),
    onSuccess: () => {
      toast.success('Currency added successfully');
      queryClient.invalidateQueries({ queryKey: ['currencies'] });
      setIsAddDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to add currency');
    },
  });

  // Update currency mutation
  const updateCurrencyMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      companyServices.updateCurrency(id, data),
    onSuccess: () => {
      toast.success('Currency updated successfully');
      queryClient.invalidateQueries({ queryKey: ['currencies'] });
      setIsAddDialogOpen(false);
      setEditingCurrency(null);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update currency');
    },
  });

  // Delete currency mutation
  const deleteCurrencyMutation = useMutation({
    mutationFn: (id: string) => companyServices.deleteCurrency(id),
    onSuccess: () => {
      toast.success('Currency deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['currencies'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete currency');
    },
  });

  const resetForm = () => {
    setFormData({
      currency_name: '',
      currency_code: '',
      symbol: '',
      country: '',
      exchange_rate: 1,
      symbol_position: 'before',
    });
  };

  const handleEdit = (currency: any) => {
    setEditingCurrency(currency);
    setFormData({
      currency_name: currency.currency_name,
      currency_code: currency.currency_code,
      symbol: currency.symbol,
      country: currency.country,
      exchange_rate: currency.exchange_rate,
      symbol_position: currency.symbol_position || 'before',
    });
    setIsAddDialogOpen(true);
  };

  const handleSubmit = () => {
    if (
      !formData.currency_name ||
      !formData.currency_code ||
      !formData.symbol ||
      !formData.country
    ) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (editingCurrency) {
      updateCurrencyMutation.mutate({
        id: editingCurrency._id,
        data: formData,
      });
    } else {
      createCurrencyMutation.mutate(formData);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this currency?')) {
      deleteCurrencyMutation.mutate(id);
    }
  };

  const handleCountrySelect = (countryCode: string) => {
    const country = countries[countryCode as keyof typeof countries];
    if (country) {
      setFormData({
        ...formData,
        country: country.name,
        currency_code: country.currency[0] || '',
      });
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Currency Management</DialogTitle>
            <DialogDescription>
              Manage currencies for your cost configuration
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search currencies..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button
                onClick={() => {
                  resetForm();
                  setEditingCurrency(null);
                  setIsAddDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Currency
              </Button>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="p-3 text-left">No#</th>
                    <th className="p-3 text-left">Action</th>
                    <th className="p-3 text-left">Currency Name</th>
                    <th className="p-3 text-left">Currency Code</th>
                    <th className="p-3 text-left">Symbol</th>
                    <th className="p-3 text-left">Country</th>
                    <th className="p-3 text-left">Exchange Rate</th>
                    <th className="p-3 text-left">Symbol Position</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={8} className="text-center p-8">
                        Loading...
                      </td>
                    </tr>
                  ) : currenciesData && currenciesData.length > 0 ? (
                    currenciesData.map((currency: any, index: number) => (
                      <tr key={currency._id} className="border-b hover:bg-muted/50">
                        <td className="p-3">{index + 1}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(currency)}
                            >
                              <Edit2 className="h-4 w-4 text-blue-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(currency._id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        </td>
                        <td className="p-3">{currency.currency_name}</td>
                        <td className="p-3">{currency.currency_code}</td>
                        <td className="p-3">{currency.symbol}</td>
                        <td className="p-3">{currency.country}</td>
                        <td className="p-3">{currency.exchange_rate}</td>
                        <td className="p-3">{currency.symbol_position}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="text-center p-8 text-muted-foreground">
                        No currencies found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Currency Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCurrency ? 'Edit Currency' : 'Add Currency'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currency_name">Currency Name*</Label>
              <Input
                id="currency_name"
                value={formData.currency_name}
                onChange={(e) =>
                  setFormData({ ...formData, currency_name: e.target.value })
                }
                placeholder="e.g., US Dollar"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency_code">Currency Code*</Label>
              <Input
                id="currency_code"
                value={formData.currency_code}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    currency_code: e.target.value.toUpperCase(),
                  })
                }
                placeholder="e.g., USD"
                maxLength={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="symbol">Symbol*</Label>
              <Select
                value={formData.symbol}
                onValueChange={(value) =>
                  setFormData({ ...formData, symbol: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Symbol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="$">$ - Dollar</SelectItem>
                  <SelectItem value="€">€ - Euro</SelectItem>
                  <SelectItem value="£">£ - Pound</SelectItem>
                  <SelectItem value="¥">¥ - Yen</SelectItem>
                  <SelectItem value="₹">₹ - Rupee</SelectItem>
                  <SelectItem value="₩">₩ - Won</SelectItem>
                  <SelectItem value="元">元 - Yuan</SelectItem>
                  <SelectItem value="NZ$">NZ$ - NZ Dollar</SelectItem>
                  <SelectItem value="A$">A$ - AUS Dollar</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">Country*</Label>
              <Select onValueChange={handleCountrySelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Country" />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {countryList.map((country) => (
                    <SelectItem key={country.code} value={country.code}>
                      {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formData.country && (
                <Input
                  value={formData.country}
                  onChange={(e) =>
                    setFormData({ ...formData, country: e.target.value })
                  }
                  placeholder="Country name"
                />
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="exchange_rate">Exchange Rate*</Label>
              <Input
                id="exchange_rate"
                type="number"
                step="0.01"
                value={formData.exchange_rate}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    exchange_rate: parseFloat(e.target.value) || 1,
                  })
                }
                placeholder="e.g., 1.0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="symbol_position">Symbol Position</Label>
              <Select
                value={formData.symbol_position}
                onValueChange={(value) =>
                  setFormData({ ...formData, symbol_position: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Position" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="before">Before ($ 100)</SelectItem>
                  <SelectItem value="after">After (100 $)</SelectItem>
                  <SelectItem value="first">First ($100)</SelectItem>
                  <SelectItem value="last">Last (100$)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setIsAddDialogOpen(false);
                setEditingCurrency(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                createCurrencyMutation.isPending || updateCurrencyMutation.isPending
              }
            >
              {editingCurrency ? 'Update' : 'Save'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CurrencyManagementDialog;
