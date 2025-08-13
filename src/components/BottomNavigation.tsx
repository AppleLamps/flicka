import { Home, Compass, Camera, Bell, User } from "lucide-react";

interface BottomNavigationProps {
  activeTab: 'home' | 'explore' | 'capture' | 'notifications' | 'profile';
  onTabChange: (tab: 'home' | 'explore' | 'capture' | 'notifications' | 'profile') => void;
  hasNotifications?: boolean;
}

export const BottomNavigation = ({ 
  activeTab, 
  onTabChange, 
  hasNotifications = false 
}: BottomNavigationProps) => {
  const tabs = [
    { id: 'home' as const, icon: Home, label: 'Home' },
    { id: 'explore' as const, icon: Compass, label: 'Explore' },
    { id: 'capture' as const, icon: Camera, label: 'Capture', isPrimary: true },
    { id: 'notifications' as const, icon: Bell, label: 'Notifications', hasIndicator: hasNotifications },
    { id: 'profile' as const, icon: User, label: 'Profile' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 backdrop-blur-header border-t border-border/20 h-[var(--bottom-nav-height)]">
      <div className="flex items-center justify-around px-4 py-2">
        {tabs.map(({ id, icon: Icon, label, isPrimary, hasIndicator }) => (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            className={`
              relative flex flex-col items-center gap-1 px-3 py-2 min-w-[64px]
              transition-all duration-200 active:scale-95
              ${isPrimary 
                ? 'transform -translate-y-2' 
                : ''
              }
            `}
            aria-label={label}
          >
            {/* Primary Capture Button */}
            {isPrimary ? (
              <div className="relative">
                {/* Glow Effect */}
                <div className="absolute inset-0 rounded-full bg-primary opacity-30 blur-lg scale-125"></div>
                {/* Button */}
                <div className={`
                  relative w-14 h-14 rounded-full bg-primary flex items-center justify-center
                  transition-all duration-200 hover:shadow-glow
                  ${activeTab === id ? 'scale-110' : 'scale-100'}
                `}>
                  <Icon size={28} className="text-primary-foreground" />
                </div>
              </div>
            ) : (
              /* Regular Tab */
              <div className="relative">
                <div className={`
                  w-8 h-8 flex items-center justify-center
                  ${activeTab === id 
                    ? 'text-primary' 
                    : 'text-muted-foreground'
                  }
                `}>
                  <Icon size={24} />
                </div>
                
                {/* Notification Indicator */}
                {hasIndicator && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full border-2 border-background"></div>
                )}
              </div>
            )}

            {/* Tab Label */}
            {!isPrimary && (
              <span className={`
                text-xs font-medium transition-colors
                ${activeTab === id 
                  ? 'text-primary' 
                  : 'text-muted-foreground'
                }
              `}>
                {label}
              </span>
            )}
          </button>
        ))}
      </div>
    </nav>
  );
};