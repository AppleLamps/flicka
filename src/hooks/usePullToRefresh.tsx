import { useCallback, useRef, useState, useEffect } from 'react';

interface PullToRefreshOptions {
  onRefresh: () => Promise<void> | void;
  threshold?: number;
  resistance?: number;
  refreshingDelay?: number;
}

export const usePullToRefresh = ({
  onRefresh,
  threshold = 80,
  resistance = 2.5,
  refreshingDelay = 1000
}: PullToRefreshOptions) => {
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  
  const startY = useRef<number>(0);
  const currentY = useRef<number>(0);
  const isDragging = useRef(false);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    // Only trigger if we're at the top of the page
    if (window.scrollY > 0) return;
    
    startY.current = e.touches[0].clientY;
    isDragging.current = true;
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging.current || isRefreshing) return;
    
    currentY.current = e.touches[0].clientY;
    const deltaY = currentY.current - startY.current;
    
    if (deltaY > 0 && window.scrollY === 0) {
      e.preventDefault(); // Prevent default scrolling
      
      const distance = Math.min(deltaY / resistance, threshold * 1.5);
      setPullDistance(distance);
      setIsPulling(distance > 20);
      
      // Update CSS custom property for smooth animation
      document.documentElement.style.setProperty('--pull-distance', `${distance}px`);
    }
  }, [resistance, threshold, isRefreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (!isDragging.current) return;
    
    isDragging.current = false;
    
    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      
      try {
        await onRefresh();
        
        // Minimum refresh duration for better UX
        await new Promise(resolve => setTimeout(resolve, refreshingDelay));
      } catch (error) {
        console.error('Refresh failed:', error);
      } finally {
        setIsRefreshing(false);
      }
    }
    
    // Reset state
    setIsPulling(false);
    setPullDistance(0);
    document.documentElement.style.setProperty('--pull-distance', '0px');
  }, [pullDistance, threshold, isRefreshing, onRefresh, refreshingDelay]);

  useEffect(() => {
    const element = document.documentElement;
    
    element.addEventListener('touchstart', handleTouchStart, { passive: false });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });
    
    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  const progress = Math.min(pullDistance / threshold, 1);
  const shouldRefresh = pullDistance >= threshold;

  return {
    isPulling,
    isRefreshing,
    pullDistance,
    progress,
    shouldRefresh
  };
};