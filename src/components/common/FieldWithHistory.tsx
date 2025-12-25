import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { History } from 'lucide-react';
import FieldHistoryDialog from './FieldHistoryDialog';
import { useAuth } from '@/auth/AuthContext';

interface FieldWithHistoryProps {
  children: React.ReactNode;
  fieldName: string;
  fieldDisplayName?: string;
  vehicleStockId: string | number;
  vehicleType: string;
  moduleName: string;
  label?: string;
  className?: string;
  showHistoryIcon?: boolean;
}

const FieldWithHistory: React.FC<FieldWithHistoryProps> = ({
  children,
  fieldName,
  fieldDisplayName,
  vehicleStockId,
  vehicleType,
  moduleName,
  label,
  className = '',
  showHistoryIcon = true,
}) => {
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const { user } = useAuth();

  const handleHistoryClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsHistoryDialogOpen(true);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium">{label}</Label>
          {showHistoryIcon && (
            <button
              onClick={handleHistoryClick}
              className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors"
              title={`View history for ${fieldDisplayName || fieldName}`}
            >
              <History className="h-2.5 w-2.5 text-gray-600" />
            </button>
          )}
        </div>
      )}
      
      <div className="relative">
        {children}
        {!label && showHistoryIcon && (
          <button
            onClick={handleHistoryClick}
            className="absolute right-2 top-2 inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors z-10"
            title={`View history for ${fieldDisplayName || fieldName}`}
          >
            <History className="h-2.5 w-2.5 text-gray-600" />
          </button>
        )}
      </div>

      <FieldHistoryDialog
        isOpen={isHistoryDialogOpen}
        onClose={() => setIsHistoryDialogOpen(false)}
        vehicleStockId={vehicleStockId}
        companyId={
          typeof user?.company_id === 'string' 
            ? user.company_id 
            : (user?.company_id as any)?._id || ''
        }
        vehicleType={vehicleType}
        moduleName={moduleName}
        fieldName={fieldName}
        fieldDisplayName={fieldDisplayName}
      />
    </div>
  );
};

export default FieldWithHistory;