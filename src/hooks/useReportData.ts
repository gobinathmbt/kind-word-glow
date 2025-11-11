import { useState, useEffect, useCallback, useRef } from 'react';

interface UseReportDataOptions {
  endpoint: string;
  params?: Record<string, any>;
  refreshTrigger?: number;
  enabled?: boolean;
  cacheTime?: number; // Cache duration in milliseconds
  retryCount?: number;
  retryDelay?: number;
}

interface ReportDataState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  retry: () => Promise<void>;
}

// Simple in-memory cache
const cache = new Map<string, { data: any; timestamp: number }>();

const getCacheKey = (endpoint: string, params?: Record<string, any>): string => {
  return `${endpoint}:${JSON.stringify(params || {})}`;
};

const getCachedData = (key: string, cacheTime: number) => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < cacheTime) {
    return cached.data;
  }
  return null;
};

const setCachedData = (key: string, data: any) => {
  cache.set(key, { data, timestamp: Date.now() });
};

export function useReportData<T = any>(
  options: UseReportDataOptions
): ReportDataState<T> {
  const {
    endpoint,
    params,
    refreshTrigger = 0,
    enabled = true,
    cacheTime = 5 * 60 * 1000, // Default 5 minutes
    retryCount = 3,
    retryDelay = 1000,
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [currentRetry, setCurrentRetry] = useState<number>(0);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef<boolean>(true);

  const fetchData = useCallback(async (isRetry = false) => {
    if (!enabled) return;

    // Cancel previous request if exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    // Check cache first
    const cacheKey = getCacheKey(endpoint, params);
    const cachedData = getCachedData(cacheKey, cacheTime);
    
    if (cachedData && !isRetry) {
      setData(cachedData);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    if (!isRetry) {
      setError(null);
    }

    try {
      // Build query string
      const queryParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            if (Array.isArray(value)) {
              value.forEach(v => queryParams.append(key, String(v)));
            } else {
              queryParams.append(key, String(value));
            }
          }
        });
      }

      const url = queryParams.toString() 
        ? `${endpoint}?${queryParams.toString()}`
        : endpoint;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionStorage.getItem('token')}`,
        },
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (!isMountedRef.current) return;

      // Extract data from response (handle both {data: ...} and direct response)
      const responseData = result.data || result;
      
      setData(responseData);
      setError(null);
      setCurrentRetry(0);
      
      // Cache the successful response
      setCachedData(cacheKey, responseData);
    } catch (err) {
      if (!isMountedRef.current) return;
      
      // Don't set error if request was aborted
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }

      const error = err instanceof Error ? err : new Error('Unknown error occurred');
      setError(error);
      
      // Retry logic
      if (currentRetry < retryCount) {
        setTimeout(() => {
          if (isMountedRef.current) {
            setCurrentRetry(prev => prev + 1);
            fetchData(true);
          }
        }, retryDelay * Math.pow(2, currentRetry)); // Exponential backoff
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [endpoint, params, enabled, cacheTime, retryCount, retryDelay, currentRetry]);

  const refetch = useCallback(async () => {
    setCurrentRetry(0);
    await fetchData(true); // Force refetch, bypass cache
  }, [fetchData]);

  const retry = useCallback(async () => {
    setCurrentRetry(0);
    setError(null);
    await fetchData(true);
  }, [fetchData]);

  // Fetch data on mount and when dependencies change
  useEffect(() => {
    isMountedRef.current = true;
    fetchData();

    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData]);

  // Refetch when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger > 0) {
      refetch();
    }
  }, [refreshTrigger, refetch]);

  return {
    data,
    loading,
    error,
    refetch,
    retry,
  };
}
