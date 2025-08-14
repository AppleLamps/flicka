import { Search, Camera, Bell } from "lucide-react";

interface TopAppBarProps {
  hasNotifications?: boolean;
  onSearchClick?: () => void;
  onCaptureClick?: () => void;
  onNotificationsClick?: () => void;
  isScrolled?: boolean;
}

export const TopAppBar = ({ 
  hasNotifications = false, 
  onSearchClick, 
  onCaptureClick,
  onNotificationsClick,
  isScrolled = false
}: TopAppBarProps) => {
  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      isScrolled ? 'backdrop-blur-header' : 'bg-transparent'
    }`}>
      <div className={`grid grid-cols-3 items-center px-4 py-3 transition-all duration-300 ${
        isScrolled ? 'border-b border-border/20' : ''
      }`}>
        {/* Brand Mark */}
        <div className="flex items-center justify-start">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-lg">V</span>
          </div>
        </div>

        {/* App Name (centered regardless of side content widths) */}
        <div className="justify-self-center">
          <h1 className="text-xl font-bold tracking-wide text-center">VINE</h1>
        </div>

        {/* Action Icons */}
        <div className="flex items-center gap-2 justify-end">
          <button 
            onClick={onSearchClick}
            className="icon-button"
            aria-label="Search"
          >
            <Search size={20} />
          </button>
          
          <button 
            onClick={onCaptureClick}
            className="icon-button-primary"
            aria-label="Capture video"
          >
            <Camera size={20} />
          </button>

          <button 
            onClick={onNotificationsClick}
            className="icon-button relative"
            aria-label="Notifications"
          >
            <Bell size={20} />
            {hasNotifications && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full border-2 border-background"></div>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};