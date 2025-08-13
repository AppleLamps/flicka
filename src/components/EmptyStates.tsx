import { Search, Video, Bell, Wifi, RefreshCw, Plus, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary';
  };
  className?: string;
}

const EmptyState = ({ icon, title, description, action, className }: EmptyStateProps) => {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center p-8 min-h-[60vh]", className)}>
      <div className="w-16 h-16 rounded-full bg-muted/20 flex items-center justify-center mb-6 text-muted-foreground">
        {icon}
      </div>
      
      <h3 className="text-xl font-semibold text-foreground mb-2">
        {title}
      </h3>
      
      <p className="text-muted-foreground mb-6 max-w-sm leading-relaxed">
        {description}
      </p>
      
      {action && (
        <button
          onClick={action.onClick}
          className={cn(
            "px-6 py-3 rounded-xl font-medium transition-all duration-200 active:scale-95",
            action.variant === 'primary' 
              ? "btn-primary" 
              : "btn-secondary"
          )}
          aria-label={action.label}
        >
          {action.label}
        </button>
      )}
    </div>
  );
};

// Home Feed Empty State
export const HomeFeedEmpty = ({ onExplore, onCapture }: { 
  onExplore: () => void;
  onCapture: () => void;
}) => (
  <EmptyState
    icon={<Video className="w-8 h-8" />}
    title="No loops yet"
    description="Follow creators or explore trending content to see loops in your feed."
    action={{
      label: "Explore Trending",
      onClick: onExplore,
      variant: 'primary'
    }}
  />
);

// Explore Empty State
export const ExploreEmpty = ({ onRefresh }: { onRefresh: () => void }) => (
  <EmptyState
    icon={<Sparkles className="w-8 h-8" />}
    title="Nothing trending right now"
    description="Check back later for fresh content or pull down to refresh."
    action={{
      label: "Refresh",
      onClick: onRefresh,
      variant: 'secondary'
    }}
  />
);

// Notifications Empty State
export const NotificationsEmpty = () => (
  <EmptyState
    icon={<Bell className="w-8 h-8" />}
    title="No notifications yet"
    description="When people like your loops or follow you, you'll see notifications here."
  />
);

// Search Results Empty State
export const SearchEmpty = ({ 
  query, 
  onClearSearch 
}: { 
  query: string;
  onClearSearch: () => void;
}) => (
  <EmptyState
    icon={<Search className="w-8 h-8" />}
    title="No results found"
    description={`We couldn't find any loops for "${query}". Try searching for something else.`}
    action={{
      label: "Clear Search",
      onClick: onClearSearch,
      variant: 'secondary'
    }}
  />
);

// Network Error State
export const NetworkError = ({ onRetry }: { onRetry: () => void }) => (
  <EmptyState
    icon={<Wifi className="w-8 h-8" />}
    title="Connection lost"
    description="Check your internet connection and try again."
    action={{
      label: "Retry",
      onClick: onRetry,
      variant: 'primary'
    }}
  />
);

// Generic Error State
export const GenericError = ({ 
  title = "Something went wrong",
  description = "We're having trouble loading this content. Please try again.",
  onRetry 
}: { 
  title?: string;
  description?: string;
  onRetry: () => void;
}) => (
  <EmptyState
    icon={<RefreshCw className="w-8 h-8" />}
    title={title}
    description={description}
    action={{
      label: "Try Again",
      onClick: onRetry,
      variant: 'primary'
    }}
  />
);

// Profile Empty State (for when user has no content)
export const ProfileEmpty = ({ 
  isOwnProfile,
  onCreateLoop 
}: { 
  isOwnProfile: boolean;
  onCreateLoop?: () => void;
}) => (
  <EmptyState
    icon={<Plus className="w-8 h-8" />}
    title={isOwnProfile ? "Create your first loop" : "No loops yet"}
    description={
      isOwnProfile 
        ? "Share moments, express yourself, and connect with others through short video loops."
        : "This user hasn't posted any loops yet."
    }
    action={isOwnProfile && onCreateLoop ? {
      label: "Create Loop",
      onClick: onCreateLoop,
      variant: 'primary'
    } : undefined}
  />
);