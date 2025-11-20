import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, FileSpreadsheet, FileText, File } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ExportFormat = 'csv' | 'pdf' | 'excel';

export interface ExportButtonProps {
  onExport: (format: ExportFormat) => void | Promise<void>;
  formats?: ExportFormat[];
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

const formatIcons: Record<ExportFormat, React.ReactNode> = {
  csv: <FileText className="h-4 w-4" />,
  pdf: <File className="h-4 w-4" />,
  excel: <FileSpreadsheet className="h-4 w-4" />,
};

const formatLabels: Record<ExportFormat, string> = {
  csv: 'Export as CSV',
  pdf: 'Export as PDF',
  excel: 'Export as Excel',
};

export const ExportButton: React.FC<ExportButtonProps> = ({
  onExport,
  formats = ['csv', 'pdf', 'excel'],
  disabled = false,
  loading = false,
  className,
  size = 'sm',
}) => {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (format: ExportFormat) => {
    setIsExporting(true);
    try {
      await onExport(format);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size={size}
          disabled={disabled || loading || isExporting}
          className={cn('gap-1.5 sm:gap-2 w-full xs:w-auto h-9 text-xs sm:text-sm px-3 sm:px-4', className)}
        >
          <Download className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
          <span className="truncate">
            {(loading || isExporting) ? 'Exporting...' : 'Export'}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {formats.map((format) => (
          <DropdownMenuItem
            key={format}
            onClick={() => handleExport(format)}
            className="gap-2 text-xs sm:text-sm"
          >
            {formatIcons[format]}
            <span>{formatLabels[format]}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ExportButton;
