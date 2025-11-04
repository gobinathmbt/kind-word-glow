# Custom React Hooks for Dashboard Analytics

This directory contains custom React hooks designed for the Advanced Dashboard Analytics System.

## Available Hooks

### 1. useReportData

A hook for fetching report data with automatic caching, retry logic, and refresh capabilities.

**Features:**
- Automatic data fetching on mount
- Loading and error states
- Automatic refetch on refreshTrigger change
- In-memory caching with configurable cache time
- Automatic retry with exponential backoff
- Request cancellation on unmount

**Usage:**
```typescript
import { useReportData } from '@/hooks';

function MyReportComponent() {
  const { data, loading, error, refetch, retry } = useReportData({
    endpoint: '/api/company/reports/vehicle/overview-by-type',
    params: {
      dealership_ids: ['123', '456'],
      from: '2024-01-01',
      to: '2024-12-31',
    },
    refreshTrigger: refreshCounter,
    cacheTime: 5 * 60 * 1000, // 5 minutes
    retryCount: 3,
    retryDelay: 1000,
  });

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message} <button onClick={retry}>Retry</button></div>;
  
  return <div>{/* Render your data */}</div>;
}
```

### 2. useExport

A hook for exporting report data in various formats (CSV, PDF, Excel).

**Features:**
- CSV export with proper escaping
- PDF export (HTML-based, can be enhanced with jsPDF)
- Excel export (CSV-based, can be enhanced with xlsx library)
- Automatic file download
- Loading and error states
- Success/error callbacks

**Usage:**
```typescript
import { useExport } from '@/hooks';

function MyReportComponent({ data }) {
  const { exporting, error, exportCSV, exportPDF, exportExcel } = useExport({
    filename: 'vehicle-report',
    onSuccess: () => console.log('Export successful'),
    onError: (err) => console.error('Export failed:', err),
  });

  return (
    <div>
      <button onClick={() => exportCSV(data)} disabled={exporting}>
        Export CSV
      </button>
      <button onClick={() => exportPDF(data)} disabled={exporting}>
        Export PDF
      </button>
      <button onClick={() => exportExcel(data)} disabled={exporting}>
        Export Excel
      </button>
    </div>
  );
}
```

### 3. useAuthEnhanced

An enhanced version of useAuth with additional utilities for dashboard analytics.

**Features:**
- Role-based permission checks
- Dealership filtering logic
- Primary admin detection
- Company and dealership information
- Dashboard access validation

**Usage:**
```typescript
import { useAuthEnhanced } from '@/hooks';

function DashboardComponent() {
  const {
    completeUser,
    isPrimaryAdmin,
    isCompanySuperAdmin,
    dealershipIdsForFilter,
    shouldFilterByDealership,
    hasDashboardAccess,
    hasPermission,
    canAccessAllDealerships,
  } = useAuthEnhanced();

  if (!hasDashboardAccess) {
    return <div>Access Denied</div>;
  }

  // Use dealershipIdsForFilter for API calls
  const reportParams = {
    ...(shouldFilterByDealership && { dealership_ids: dealershipIdsForFilter }),
  };

  return <div>{/* Dashboard content */}</div>;
}
```

## Integration Example

Here's a complete example combining all three hooks:

```typescript
import { useReportData, useExport, useAuthEnhanced } from '@/hooks';

function VehicleReportComponent() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [dateRange, setDateRange] = useState({ from: '2024-01-01', to: '2024-12-31' });
  
  const { dealershipIdsForFilter, shouldFilterByDealership } = useAuthEnhanced();
  
  const { data, loading, error, refetch } = useReportData({
    endpoint: '/api/company/reports/vehicle/overview-by-type',
    params: {
      ...(shouldFilterByDealership && { dealership_ids: dealershipIdsForFilter }),
      ...dateRange,
    },
    refreshTrigger,
  });
  
  const { exportCSV, exporting } = useExport({
    filename: 'vehicle-overview-report',
  });

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleExport = () => {
    if (data) {
      exportCSV(data);
    }
  };

  return (
    <div>
      <button onClick={handleRefresh}>Refresh</button>
      <button onClick={handleExport} disabled={exporting || !data}>
        Export CSV
      </button>
      {loading && <div>Loading...</div>}
      {error && <div>Error: {error.message}</div>}
      {data && <div>{/* Render report */}</div>}
    </div>
  );
}
```

## Notes

- **useReportData**: Implements automatic caching to reduce API calls. Cache can be bypassed by calling `refetch()`.
- **useExport**: PDF and Excel exports use simplified formats. For production, consider integrating:
  - `jsPDF` or `pdfmake` for true PDF generation
  - `xlsx` or `exceljs` for true Excel file generation
- **useAuthEnhanced**: Automatically handles the difference between primary admins (see all dealerships) and non-primary admins (see only assigned dealerships).
