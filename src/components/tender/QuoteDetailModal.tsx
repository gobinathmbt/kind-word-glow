import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertCircle,
  Calendar,
  User,
  Car,
  DollarSign,
  FileText,
  Download,
  Send,
  X,
} from 'lucide-react';

interface QuoteDetailItem {
  _id: string;
  tender_id?: string;
  quote_status?: string;
  customer_info?: {
    name: string;
    email?: string;
    phone?: string;
  };
  basic_vehicle_info?: {
    make: string;
    model: string;
    year?: string;
    registration?: string;
  };
  price?: number;
  quotation_text?: string;
  notes?: string;
  tender_expiry_time?: string;
  created_at?: string;
  updated_at?: string;
}

interface QuoteDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  quote: QuoteDetailItem | null;
  onSubmit?: (updatedQuote: Partial<QuoteDetailItem>) => void;
  isLoading?: boolean;
}

const getStatusColor = (status?: string) => {
  switch (status) {
    case 'Open':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900';
    case 'In Progress':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900';
    case 'Submitted':
      return 'bg-green-100 text-green-800 dark:bg-green-900';
    case 'Withdrawn':
      return 'bg-red-100 text-red-800 dark:bg-red-900';
    case 'Closed':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800';
  }
};

export const QuoteDetailModal: React.FC<QuoteDetailModalProps> = ({
  isOpen,
  onClose,
  quote,
  onSubmit,
  isLoading,
}) => {
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState<Partial<QuoteDetailItem>>({});

  React.useEffect(() => {
    if (quote) {
      setFormData(quote);
      setEditMode(false);
    }
  }, [quote, isOpen]);

  const handleFieldChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = () => {
    if (onSubmit) {
      onSubmit(formData);
      setEditMode(false);
    }
  };

  if (!quote) return null;

  const isExpired =
    quote.tender_expiry_time &&
    new Date(quote.tender_expiry_time) < new Date();

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:w-[500px] lg:w-[600px] max-h-screen overflow-y-auto">
        <SheetHeader className="space-y-2">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <SheetTitle className="text-xl">
                Quote Details - {quote.tender_id}
              </SheetTitle>
              <Badge className={`mt-2 ${getStatusColor(quote.quote_status)}`}>
                {quote.quote_status}
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Critical Alert */}
          {isExpired && (
            <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-3 flex gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-900 dark:text-red-200">
                  Quote Expired
                </p>
                <p className="text-sm text-red-800 dark:text-red-300">
                  This quote expired on{' '}
                  {new Date(quote.tender_expiry_time).toLocaleDateString()}
                </p>
              </div>
            </div>
          )}

          {/* Tabs */}
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4">
              {/* Customer Info */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Customer Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Customer Name
                    </Label>
                    <p className="font-medium">
                      {quote.customer_info?.name || 'N/A'}
                    </p>
                  </div>
                  {quote.customer_info?.email && (
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        Email
                      </Label>
                      <p className="text-sm truncate">
                        {quote.customer_info.email}
                      </p>
                    </div>
                  )}
                  {quote.customer_info?.phone && (
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        Phone
                      </Label>
                      <p className="text-sm">{quote.customer_info.phone}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Vehicle Info */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Car className="h-4 w-4" />
                    Vehicle Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Vehicle
                    </Label>
                    <p className="font-medium">
                      {quote.basic_vehicle_info?.make}{' '}
                      {quote.basic_vehicle_info?.model}
                    </p>
                  </div>
                  {quote.basic_vehicle_info?.year && (
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        Year
                      </Label>
                      <p className="text-sm">
                        {quote.basic_vehicle_info.year}
                      </p>
                    </div>
                  )}
                  {quote.basic_vehicle_info?.registration && (
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        Registration
                      </Label>
                      <p className="text-sm font-mono">
                        {quote.basic_vehicle_info.registration}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Price Info */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Quotation
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Quote Amount
                    </Label>
                    <p className="text-2xl font-bold text-primary">
                      ₹{quote.price?.toLocaleString() || '0'}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Timeline */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Timeline
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Created
                    </Label>
                    <p className="text-sm">
                      {quote.created_at
                        ? new Date(quote.created_at).toLocaleString()
                        : 'N/A'}
                    </p>
                  </div>
                  {quote.tender_expiry_time && (
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        Expiry Date
                      </Label>
                      <p className={`text-sm font-medium ${isExpired ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                        {new Date(quote.tender_expiry_time).toLocaleString()}
                      </p>
                    </div>
                  )}
                  {quote.updated_at && (
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        Last Updated
                      </Label>
                      <p className="text-sm">
                        {new Date(quote.updated_at).toLocaleString()}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Details Tab */}
            <TabsContent value="details" className="space-y-4">
              {!editMode ? (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Quotation Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                      {quote.quotation_text || 'No quotation text provided'}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  <Label htmlFor="quotation">Quotation Details</Label>
                  <Textarea
                    id="quotation"
                    value={formData.quotation_text || ''}
                    onChange={(e) =>
                      handleFieldChange('quotation_text', e.target.value)
                    }
                    placeholder="Enter quotation details..."
                    className="min-h-40"
                  />
                </div>
              )}
            </TabsContent>

            {/* Notes Tab */}
            <TabsContent value="notes" className="space-y-4">
              {!editMode ? (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Internal Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {quote.notes || 'No notes yet'}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  <Label htmlFor="notes">Add Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes || ''}
                    onChange={(e) =>
                      handleFieldChange('notes', e.target.value)
                    }
                    placeholder="Add internal notes..."
                    className="min-h-32"
                  />
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Action Buttons */}
          <div className="space-y-2 pt-4 border-t">
            {!editMode ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setEditMode(true)}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Send
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  onClick={() => setEditMode(false)}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="bg-primary hover:bg-primary/90"
                >
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
