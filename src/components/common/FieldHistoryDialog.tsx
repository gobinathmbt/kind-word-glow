import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { vehicleServices } from '@/api/services';
import { toast } from 'sonner';

interface FieldHistoryItem {
  timestamp: string;
  action: string;
  user_name: string;
  user_id: string;
  field_name: string;
  raw_field_name: string;
  old_value: string | null;
  new_value: string | null;
  action_type: string;
  module_name: string;
  metadata: any;
}

interface FieldHistoryData {
  field_name: string;
  vehicle_stock_id: number;
  vehicle_type: string;
  module_name: string;
  total_changes: number;
  history: FieldHistoryItem[];
}

interface FieldHistoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  vehicleStockId: string | number;
  companyId: string;
  vehicleType: string;
  moduleName: string;
  fieldName: string;
  fieldDisplayName?: string;
}

const FieldHistoryDialog: React.FC<FieldHistoryDialogProps> = ({
  isOpen,
  onClose,
  vehicleStockId,
  companyId,
  vehicleType,
  moduleName,
  fieldName,
  fieldDisplayName,
}) => {
  const [fieldHistory, setFieldHistory] = useState<FieldHistoryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const fetchFieldHistory = async () => {
    if (!isOpen || !fieldName || !vehicleStockId || !companyId) return;
    

    
    setLoading(true);
    setError(null);
    
    try {
      const response = await vehicleServices.getFieldHistory({
        vehicle_stock_id: vehicleStockId,
        company_id: companyId,
        vehicle_type: vehicleType,
        module_name: moduleName,
        field: fieldName,
      });
      
      setFieldHistory(response.data.data);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to fetch field history';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchFieldHistory();
    } else {
      // Reset state when dialog closes
      setFieldHistory(null);
      setError(null);
      setLoading(false);
      setCurrentPage(1);
    }
  }, [isOpen, fieldName, vehicleStockId, companyId, vehicleType, moduleName]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };



  // Pagination logic
  const totalPages = fieldHistory ? Math.ceil(fieldHistory.history.length / itemsPerPage) : 0;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = fieldHistory ? fieldHistory.history.slice(startIndex, endIndex) : [];

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[85vh] border-0">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-black">
            <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center">
              <svg className="h-4 w-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            {fieldDisplayName || fieldName}
          </DialogTitle>
          <DialogDescription>
            View the complete change history for this field, including who made changes and when.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!vehicleStockId || !companyId ? (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-md">
              <p className="font-medium">Missing Required Information</p>
              <p className="text-sm mt-1">
                Vehicle stock ID or company ID is missing. Please ensure the vehicle data is properly loaded.
              </p>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              <span className="ml-3 text-muted-foreground">Loading field history...</span>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
              <p className="font-medium">Error Loading History</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          ) : fieldHistory && fieldHistory.history.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <div className="text-5xl mb-4 opacity-50">📝</div>
              <p className="text-base">No changes found for this field</p>
              <p className="text-sm mt-1">This field hasn't been modified yet.</p>
            </div>
          ) : fieldHistory && fieldHistory.history.length > 0 ? (
            <>
              {/* Modern table design adapted to current UI theme */}
              <div className="rounded-lg border border-border bg-card shadow-sm">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b bg-muted/50 hover:bg-muted/50">
                      <TableHead className="h-12 px-4 text-left align-middle font-medium text-muted-foreground w-16">
                        S.No
                      </TableHead>
                      <TableHead className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                        Date & Time
                      </TableHead>
                      <TableHead className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                        User
                      </TableHead>
                      <TableHead className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                        Section
                      </TableHead>
                      <TableHead className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                        Action
                      </TableHead>
                      <TableHead className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                        Previous Value
                      </TableHead>
                      <TableHead className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                        New Value
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentItems.map((item, index) => (
                      <TableRow 
                        key={index} 
                        className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                      >
                        <TableCell className="p-4 align-middle text-sm font-medium text-muted-foreground">
                          {startIndex + index + 1}
                        </TableCell>
                        <TableCell className="p-4 align-middle">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">
                              {new Date(item.timestamp).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(item.timestamp).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: true
                              })}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="p-4 align-middle">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium">{item.user_name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="p-4 align-middle">
                          <span className="text-sm text-muted-foreground" title={item.module_name}>
                            {item.module_name || 'N/A'}
                          </span>
                        </TableCell>
                        <TableCell className="p-4 align-middle">
                          <div className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-blue-500 text-white text-sm font-medium capitalize">
                            {item.action_type || item.action}
                          </div>
                        </TableCell>
                        <TableCell className="p-4 align-middle max-w-xs">
                          {item.old_value ? (
                            <span className="text-sm truncate text-red-600 font-medium" title={item.old_value}>
                              {item.old_value}
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="p-4 align-middle max-w-xs">
                          {item.new_value ? (
                            <span className="text-sm truncate text-green-600 font-medium" title={item.new_value}>
                              {item.new_value}
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Modern pagination design */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-2">
                  <div className="flex-1 text-sm text-muted-foreground">
                    Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                    <span className="font-medium">{Math.min(endIndex, fieldHistory.history.length)}</span> of{' '}
                    <span className="font-medium">{fieldHistory.history.length}</span> results
                  </div>
                  <div className="flex items-center space-x-6 lg:space-x-8">
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={goToPrevPage}
                        disabled={currentPage === 1}
                        className="h-8 w-8 p-0"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        <span className="sr-only">Go to previous page</span>
                      </Button>
                      <div className="flex w-[100px] items-center justify-center text-sm font-medium">
                        Page {currentPage} of {totalPages}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={goToNextPage}
                        disabled={currentPage === totalPages}
                        className="h-8 w-8 p-0"
                      >
                        <ChevronRight className="h-4 w-4" />
                        <span className="sr-only">Go to next page</span>
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FieldHistoryDialog;