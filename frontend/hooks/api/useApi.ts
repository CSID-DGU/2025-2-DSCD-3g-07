import { useState, useEffect } from 'react';
import { apiService, ApiResponse, TransitRouteParams } from '../../services/api';

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useHealthCheck() {
  const [state, setState] = useState<UseApiState<{ status: string; version: string }>>({
    data: null,
    loading: false,
    error: null,
  });

  const checkHealth = async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await apiService.healthCheck();

      if (response.error) {
        setState(prev => ({ ...prev, loading: false, error: response.error || 'Unknown error' }));
      } else {
        setState(prev => ({ ...prev, loading: false, data: response.data || null }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Network error'
      }));
    }
  };

  return {
    ...state,
    checkHealth,
  };
}

export function useTransitRoute() {
  const [state, setState] = useState<UseApiState<any>>({
    data: null,
    loading: false,
    error: null,
  });

  const getRoute = async (params: TransitRouteParams) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await apiService.getTransitRoute(params);

      if (response.error) {
        setState(prev => ({ ...prev, loading: false, error: response.error || 'Unknown error' }));
      } else {
        setState(prev => ({ ...prev, loading: false, data: response.data || null }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Network error'
      }));
    }
  };

  const resetState = () => {
    setState({ data: null, loading: false, error: null });
  };

  return {
    ...state,
    getRoute,
    resetState,
  };
}