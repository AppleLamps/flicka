import React from 'react';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PullToRefreshWrapperProps {
  onRefresh: () => Promise<void> | void;
  children: React.ReactNode;
  threshold?: number;
  className?: string;
}

export const PullToRefreshWrapper: React.FC<PullToRefreshWrapperProps> = ({
  onRefresh,
  children,
  threshold = 80,
  className
}) => {
  const {
    isPulling,
    isRefreshing,
    pullDistance,
    progress,
    shouldRefresh
  } = usePullToRefresh({ onRefresh, threshold });

  return (
    <div className={cn('relative', className)}>
      {/* Pull to refresh indicator */}
      <div 
        className={cn(
          'fixed top-0 left-0 right-0 z-50 flex items-center justify-center',
          'transform transition-transform duration-200 ease-out',
          'bg-background/80 backdrop-blur-sm border-b border-border/50',
          isPulling || isRefreshing ? 'translate-y-0' : '-translate-y-full'
        )}
        style={{
          height: `${Math.max(pullDistance, 0)}px`,
          maxHeight: '100px'
        }}
      >
        <div className="flex items-center gap-2 text-muted-foreground">
          <RefreshCw 
            className={cn(
              'w-5 h-5 transition-transform duration-200',
              isRefreshing && 'animate-spin',
              shouldRefresh && !isRefreshing && 'rotate-180'
            )}
          />
          <span className="text-sm font-medium">
            {isRefreshing 
              ? 'Refreshing...' 
              : shouldRefresh 
                ? 'Release to refresh' 
                : 'Pull to refresh'
            }
          </span>
        </div>
      </div>

      {/* Progress indicator */}
      {isPulling && !isRefreshing && (
        <div 
          className="fixed top-0 left-0 right-0 h-1 z-50 bg-accent transition-all duration-200"
          style={{ 
            transform: `scaleX(${progress})`,
            transformOrigin: 'left'
          }}
        />
      )}

      {/* Content with pull-to-refresh transform */}
      <div 
        className={cn(
          'pull-to-refresh transition-transform duration-200 ease-out',
          (isPulling || isRefreshing) && 'will-change-transform'
        )}
      >
        {children}
      </div>
    </div>
  );
};