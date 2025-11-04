import { useState, useCallback } from 'react';

export type ExportFormat = 'csv' | 'pdf' | 'excel';

interface UseExportOptions {
  filename?: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

interface ExportState {
  exporting: boolean;
  error: Error | null;
}

interface UseExportReturn extends ExportState {
  exportData: (data: any[], format: ExportFormat, customFilename?: string) => Promise<void>;
  exportCSV: (data: any[], customFilename?: string) => Promise<void>;
  exportPDF: (data: any[], customFilename?: string) => Promise<void>;
  exportExcel: (data: any[], customFilename?: string) => Promise<void>;
}

/**
 * Custom hook for exporting report data in various formats
 */
export function useExport(options: UseExportOptions = {}): UseExportReturn {
  const { filename = 'report', onSuccess, onError } = options;
  
  const [exporting, setExporting] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Convert data to CSV format
   */
  const convertToCSV = useCallback((data: any[]): string => {
    if (!data || data.length === 0) {
      return '';
    }

    // Get headers from first object
    const headers = Object.keys(data[0]);
    
    // Create CSV header row
    const csvHeaders = headers.join(',');
    
    // Create CSV data rows
    const csvRows = data.map(row => {
      return headers.map(header => {
        const value = row[header];
        
        // Handle null/undefined
        if (value === null || value === undefined) {
          return '';
        }
        
        // Handle objects and arrays
        if (typeof value === 'object') {
          return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
        }
        
        // Handle strings with commas or quotes
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        
        return stringValue;
      }).join(',');
    });
    
    return [csvHeaders, ...csvRows].join('\n');
  }, []);

  /**
   * Convert data to HTML table for PDF
   */
  const convertToHTMLTable = useCallback((data: any[]): string => {
    if (!data || data.length === 0) {
      return '<p>No data available</p>';
    }

    const headers = Object.keys(data[0]);
    
    const headerRow = `<tr>${headers.map(h => `<th style="border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2;">${h}</th>`).join('')}</tr>`;
    
    const dataRows = data.map(row => {
      return `<tr>${headers.map(h => {
        const value = row[h];
        const displayValue = value === null || value === undefined ? '' : 
                           typeof value === 'object' ? JSON.stringify(value) : String(value);
        return `<td style="border: 1px solid #ddd; padding: 8px;">${displayValue}</td>`;
      }).join('')}</tr>`;
    }).join('');
    
    return `
      <table style="border-collapse: collapse; width: 100%; font-family: Arial, sans-serif;">
        <thead>${headerRow}</thead>
        <tbody>${dataRows}</tbody>
      </table>
    `;
  }, []);

  /**
   * Download file with given content
   */
  const downloadFile = useCallback((content: string | Blob, filename: string, mimeType: string) => {
    const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, []);

  /**
   * Export data as CSV
   */
  const exportCSV = useCallback(async (data: any[], customFilename?: string) => {
    setExporting(true);
    setError(null);

    try {
      const csv = convertToCSV(data);
      const finalFilename = `${customFilename || filename}_${new Date().toISOString().split('T')[0]}.csv`;
      downloadFile(csv, finalFilename, 'text/csv;charset=utf-8;');
      
      onSuccess?.();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to export CSV');
      setError(error);
      onError?.(error);
    } finally {
      setExporting(false);
    }
  }, [filename, convertToCSV, downloadFile, onSuccess, onError]);

  /**
   * Export data as PDF
   */
  const exportPDF = useCallback(async (data: any[], customFilename?: string) => {
    setExporting(true);
    setError(null);

    try {
      // Create HTML content for PDF
      const htmlTable = convertToHTMLTable(data);
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>${customFilename || filename}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              h1 { color: #333; }
              table { margin-top: 20px; }
            </style>
          </head>
          <body>
            <h1>${customFilename || filename}</h1>
            <p>Generated on: ${new Date().toLocaleString()}</p>
            ${htmlTable}
          </body>
        </html>
      `;

      // For now, we'll create a simple PDF-like HTML file
      // In production, you'd want to use a library like jsPDF or pdfmake
      const finalFilename = `${customFilename || filename}_${new Date().toISOString().split('T')[0]}.html`;
      downloadFile(htmlContent, finalFilename, 'text/html;charset=utf-8;');
      
      console.warn('PDF export is using HTML format. Consider integrating jsPDF or pdfmake for true PDF generation.');
      
      onSuccess?.();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to export PDF');
      setError(error);
      onError?.(error);
    } finally {
      setExporting(false);
    }
  }, [filename, convertToHTMLTable, downloadFile, onSuccess, onError]);

  /**
   * Export data as Excel (XLSX)
   */
  const exportExcel = useCallback(async (data: any[], customFilename?: string) => {
    setExporting(true);
    setError(null);

    try {
      // For Excel export, we'll use CSV format with .xlsx extension
      // In production, you'd want to use a library like xlsx or exceljs
      const csv = convertToCSV(data);
      
      // Convert CSV to a format that Excel can open
      // Using UTF-8 BOM for proper Excel compatibility
      const BOM = '\uFEFF';
      const excelContent = BOM + csv;
      
      const finalFilename = `${customFilename || filename}_${new Date().toISOString().split('T')[0]}.csv`;
      downloadFile(excelContent, finalFilename, 'text/csv;charset=utf-8;');
      
      console.warn('Excel export is using CSV format. Consider integrating xlsx or exceljs for true XLSX generation.');
      
      onSuccess?.();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to export Excel');
      setError(error);
      onError?.(error);
    } finally {
      setExporting(false);
    }
  }, [filename, convertToCSV, downloadFile, onSuccess, onError]);

  /**
   * Export data in specified format
   */
  const exportData = useCallback(async (
    data: any[], 
    format: ExportFormat, 
    customFilename?: string
  ) => {
    switch (format) {
      case 'csv':
        await exportCSV(data, customFilename);
        break;
      case 'pdf':
        await exportPDF(data, customFilename);
        break;
      case 'excel':
        await exportExcel(data, customFilename);
        break;
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }, [exportCSV, exportPDF, exportExcel]);

  return {
    exporting,
    error,
    exportData,
    exportCSV,
    exportPDF,
    exportExcel,
  };
}
