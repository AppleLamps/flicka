import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
  variant?: 'default' | 'circle' | 'text' | 'button';
}

export const Skeleton = ({ className, variant = 'default' }: SkeletonProps) => {
  const baseClasses = "animate-pulse bg-muted/50 rounded-md";
  
  const variantClasses = {
    default: "h-4 w-full",
    circle: "rounded-full aspect-square",
    text: "h-3",
    button: "h-10 w-24 rounded-lg"
  };

  return (
    <div 
      className={cn(baseClasses, variantClasses[variant], className)}
      aria-label="Loading content"
      role="status"
    />
  );
};

// Video Card Skeleton Component
export const VideoCardSkeleton = () => {
  return (
    <div 
      className="relative w-full h-screen bg-muted/20 flex flex-col justify-between p-4"
      aria-label="Loading video"
      role="status"
    >
      {/* Top section with user info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton variant="circle" className="w-10 h-10" />
          <div className="space-y-2">
            <Skeleton variant="text" className="w-24 h-3" />
            <Skeleton variant="text" className="w-16 h-2" />
          </div>
        </div>
        <Skeleton variant="button" className="w-20 h-8 rounded-full" />
      </div>

      {/* Video content area */}
      <div className="absolute inset-0 bg-muted/10 flex items-center justify-center">
        <div className="w-16 h-16 rounded-full border-4 border-muted/30 border-t-accent animate-spin" />
      </div>

      {/* Bottom section with caption and actions */}
      <div className="flex justify-between items-end">
        <div className="flex-1 space-y-3 mr-4">
          <div className="space-y-2">
            <Skeleton variant="text" className="w-3/4 h-3" />
            <Skeleton variant="text" className="w-1/2 h-3" />
          </div>
          <div className="flex gap-2">
            <Skeleton variant="text" className="w-16 h-3" />
            <Skeleton variant="text" className="w-20 h-3" />
            <Skeleton variant="text" className="w-12 h-3" />
          </div>
          <Skeleton variant="text" className="w-32 h-2" />
        </div>

        {/* Action buttons skeleton */}
        <div className="flex flex-col gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <Skeleton variant="circle" className="w-11 h-11" />
              <Skeleton variant="text" className="w-8 h-2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Comments Skeleton Component
export const CommentSkeleton = () => {
  return (
    <div className="flex gap-3 p-4" role="status" aria-label="Loading comment">
      <Skeleton variant="circle" className="w-8 h-8 flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton variant="text" className="w-20 h-3" />
          <Skeleton variant="text" className="w-12 h-2" />
        </div>
        <Skeleton variant="text" className="w-full h-3" />
        <Skeleton variant="text" className="w-3/4 h-3" />
        <div className="flex items-center gap-4 mt-2">
          <Skeleton variant="text" className="w-12 h-2" />
          <Skeleton variant="text" className="w-8 h-2" />
        </div>
      </div>
    </div>
  );
};

// Feed Skeleton Grid
export const FeedSkeleton = ({ count = 3 }: { count?: number }) => {
  return (
    <div className="space-y-0" role="status" aria-label="Loading feed">
      {[...Array(count)].map((_, i) => (
        <VideoCardSkeleton key={i} />
      ))}
    </div>
  );
};

// Loading Spinner Component
export const LoadingSpinner = ({ 
  size = 'default', 
  className 
}: { 
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    default: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  return (
    <div 
      className={cn(
        "rounded-full border-2 border-muted/30 border-t-accent animate-spin",
        sizeClasses[size],
        className
      )}
      role="status"
      aria-label="Loading"
    />
  );
};