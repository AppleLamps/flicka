import React, { forwardRef, useState, useCallback } from 'react';
import { Button, ButtonProps, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useHaptics } from '@/hooks/useHaptics';
import { LoadingSpinner } from '@/components/SkeletonLoader';

interface EnhancedButtonProps extends ButtonProps {
  loading?: boolean;
  haptic?: boolean;
  hapticType?: 'light' | 'medium' | 'heavy';
  ripple?: boolean;
  animation?: 'none' | 'press' | 'bounce' | 'pulse';
  loadingText?: string;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

export const EnhancedButton = forwardRef<HTMLButtonElement, EnhancedButtonProps>(
  ({ 
    className, 
    children, 
    loading = false,
    haptic = true,
    hapticType = 'light',
    ripple = true,
    animation = 'press',
    loadingText,
    icon,
    iconPosition = 'left',
    onClick,
    disabled,
    ...props 
  }, ref) => {
    const [isPressed, setIsPressed] = useState(false);
    const { triggerHaptic } = useHaptics();

    const handleClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
      if (loading || disabled) return;
      
      if (haptic) {
        triggerHaptic(hapticType);
      }
      
      onClick?.(e);
    }, [loading, disabled, haptic, hapticType, triggerHaptic, onClick]);

    const handleMouseDown = useCallback(() => {
      setIsPressed(true);
    }, []);

    const handleMouseUp = useCallback(() => {
      setIsPressed(false);
    }, []);

    const getAnimationClass = () => {
      if (animation === 'none') return '';
      if (isPressed) {
        switch (animation) {
          case 'press': return 'animate-button-press';
          case 'bounce': return 'animate-bounce-in';
          case 'pulse': return 'animate-pulse';
          default: return '';
        }
      }
      return '';
    };

    const buttonContent = (
      <>
        {loading && (
          <LoadingSpinner size="sm" className="mr-2" />
        )}
        {!loading && icon && iconPosition === 'left' && (
          <span className="mr-2">{icon}</span>
        )}
        {loading ? (loadingText || 'Loading...') : children}
        {!loading && icon && iconPosition === 'right' && (
          <span className="ml-2">{icon}</span>
        )}
      </>
    );

    return (
      <Button
        ref={ref}
        className={cn(
          // Base styles
          'relative overflow-hidden transition-all duration-200',
          // Ripple effect
          ripple && 'animate-ripple',
          // Animation class
          getAnimationClass(),
          // Focus and hover enhancements
          'focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
          'hover:shadow-soft active:shadow-none',
          // Loading state
          loading && 'pointer-events-none',
          className
        )}
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        disabled={disabled || loading}
        {...props}
      >
        {buttonContent}
      </Button>
    );
  }
);

EnhancedButton.displayName = 'EnhancedButton';