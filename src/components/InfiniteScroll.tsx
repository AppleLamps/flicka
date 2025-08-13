import { useEffect, useRef, useCallback } from 'react';

interface InfiniteScrollProps {
  hasMore: boolean;
  isLoading: boolean;
  onLoadMore: () => void;
  threshold?: number;
  children: React.ReactNode;
  className?: string;
}

export const InfiniteScroll = ({
  hasMore,
  isLoading,
  onLoadMore,
  threshold = 100,
  children,
  className = ''
}: InfiniteScrollProps) => {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadingRef = useRef<HTMLDivElement>(null);

  const handleObserver = useCallback((entries: IntersectionObserverEntry[]) => {
    const [target] = entries;
    if (target.isIntersecting && hasMore && !isLoading) {
      onLoadMore();
    }
  }, [hasMore, isLoading, onLoadMore]);

  useEffect(() => {
    const element = loadingRef.current;
    if (!element) return;

    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(handleObserver, {
      threshold: 0.1,
      rootMargin: `${threshold}px`,
    });

    observerRef.current.observe(element);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [handleObserver, threshold]);

  return (
    <div className={className}>
      {children}
      
      {/* Loading trigger element */}
      <div ref={loadingRef} className="h-20 flex items-center justify-center">
        {isLoading && hasMore && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="loading-spinner w-5 h-5 rounded-full"></div>
            <span className="text-sm">Loading more videos...</span>
          </div>
        )}
        
        {!hasMore && (
          <div className="text-center text-muted-foreground py-8">
            <p className="text-sm">You've reached the end!</p>
            <p className="text-xs mt-1">Follow more creators to see more content</p>
          </div>
        )}
      </div>
    </div>
  );
};