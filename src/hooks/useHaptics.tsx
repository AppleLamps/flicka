import { useCallback } from 'react';

type HapticFeedbackType = 'light' | 'medium' | 'heavy' | 'rigid' | 'soft';
type HapticNotificationType = 'success' | 'warning' | 'error';

interface HapticAPI {
  impact: (style: HapticFeedbackType) => void;
  notification: (type: HapticNotificationType) => void;
  selection: () => void;
}

declare global {
  interface Window {
    DeviceMotionEvent?: any;
  }
}

interface NavigatorVibrate {
  vibrate?: (pattern: number | number[]) => boolean;
}

export const useHaptics = () => {
  const isSupported = useCallback(() => {
    return (
      typeof window !== 'undefined' && 
      ((window.navigator as NavigatorVibrate).vibrate || 
       (window as any).DeviceMotionEvent !== undefined)
    );
  }, []);

  const triggerHaptic = useCallback((type: HapticFeedbackType = 'light') => {
    if (!isSupported()) return;

    // Try iOS haptic feedback API first
    if ((window as any).DeviceMotionEvent && (window as any).DeviceMotionEvent.requestPermission) {
      try {
        // iOS Haptic Feedback
        const impact = new (window as any).UIImpactFeedbackGenerator();
        impact.prepare();
        
        switch (type) {
          case 'light':
            impact.impactOccurred(0);
            break;
          case 'medium':
            impact.impactOccurred(1);
            break;
          case 'heavy':
          case 'rigid':
            impact.impactOccurred(2);
            break;
          case 'soft':
            impact.impactOccurred(0);
            break;
        }
      } catch (error) {
        // Fallback to vibration API
        fallbackVibration(type);
      }
    } else {
      // Android and other devices
      fallbackVibration(type);
    }
  }, [isSupported]);

  const fallbackVibration = useCallback((type: HapticFeedbackType) => {
    const navigator = window.navigator as NavigatorVibrate;
    if (!navigator.vibrate) return;

    const patterns: Record<HapticFeedbackType, number | number[]> = {
      light: 10,
      medium: 20,
      heavy: 50,
      rigid: [10, 10, 10],
      soft: 15
    };

    navigator.vibrate(patterns[type]);
  }, []);

  const triggerNotificationHaptic = useCallback((type: HapticNotificationType) => {
    if (!isSupported()) return;

    try {
      // iOS Notification Feedback
      const notification = new (window as any).UINotificationFeedbackGenerator();
      notification.prepare();
      
      switch (type) {
        case 'success':
          notification.notificationOccurred(0);
          break;
        case 'warning':
          notification.notificationOccurred(1);
          break;
        case 'error':
          notification.notificationOccurred(2);
          break;
      }
    } catch (error) {
      // Fallback patterns for different notification types
      const patterns: Record<HapticNotificationType, number[]> = {
        success: [10, 10, 10],
        warning: [20, 10, 20],
        error: [50, 20, 50]
      };

      const navigator = window.navigator as NavigatorVibrate;
      if (navigator.vibrate) {
        navigator.vibrate(patterns[type]);
      }
    }
  }, [isSupported]);

  const triggerSelectionHaptic = useCallback(() => {
    if (!isSupported()) return;

    try {
      // iOS Selection Feedback
      const selection = new (window as any).UISelectionFeedbackGenerator();
      selection.prepare();
      selection.selectionChanged();
    } catch (error) {
      // Fallback for selection
      const navigator = window.navigator as NavigatorVibrate;
      if (navigator.vibrate) {
        navigator.vibrate(5);
      }
    }
  }, [isSupported]);

  return {
    isSupported,
    triggerHaptic,
    triggerNotificationHaptic,
    triggerSelectionHaptic,
    // Convenience methods
    light: () => triggerHaptic('light'),
    medium: () => triggerHaptic('medium'),
    heavy: () => triggerHaptic('heavy'),
    success: () => triggerNotificationHaptic('success'),
    warning: () => triggerNotificationHaptic('warning'),
    error: () => triggerNotificationHaptic('error'),
    selection: triggerSelectionHaptic
  };
};