import { useState, useCallback, useEffect } from 'react';

interface ErrorInfo {
  message: string;
  type: 'network' | 'video' | 'generic';
  retryAction?: () => void;
}

export const useErrorBoundary = () => {
  const [error, setError] = useState<ErrorInfo | null>(null);

  const handleError = useCallback((error: Error, type: ErrorInfo['type'], retryAction?: () => void) => {
    console.error(`[${type.toUpperCase()} ERROR]:`, error);
    
    setError({
      message: error.message,
      type,
      retryAction
    });
  }, []);

  const handleNetworkError = useCallback((error: Error, retryAction?: () => void) => {
    handleError(error, 'network', retryAction);
  }, [handleError]);

  const handleVideoError = useCallback((error: Error, retryAction?: () => void) => {
    handleError(error, 'video', retryAction);
  }, [handleError]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const retry = useCallback(() => {
    if (error?.retryAction) {
      error.retryAction();
      clearError();
    }
  }, [error, clearError]);

  return {
    error,
    handleError,
    handleNetworkError,
    handleVideoError,
    clearError,
    retry
  };
};

export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
};