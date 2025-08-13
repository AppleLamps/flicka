import { useState, useCallback, useRef } from 'react';

type FollowState = 'follow' | 'following' | 'pending' | 'unfollow-confirm';

interface FollowData {
  userId: string;
  state: FollowState;
  isLoading: boolean;
  lastUpdated: number;
}

interface UseFollowStateOptions {
  enableOptimisticUpdates: boolean;
  persistState: boolean;
  rollbackDelay: number; // ms to wait before rolling back failed updates
}

export const useFollowState = (options: UseFollowStateOptions = {
  enableOptimisticUpdates: true,
  persistState: true,
  rollbackDelay: 3000
}) => {
  const [followStates, setFollowStates] = useState<Map<string, FollowData>>(new Map());
  const rollbackTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Load persisted state on init
  useState(() => {
    if (options.persistState && typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('follow-states');
        if (saved) {
          const parsed = JSON.parse(saved);
          setFollowStates(new Map(Object.entries(parsed)));
        }
      } catch (error) {
        console.warn('Failed to load follow states from storage:', error);
      }
    }
  });

  // Persist state changes
  const persistState = useCallback((newStates: Map<string, FollowData>) => {
    if (options.persistState && typeof window !== 'undefined') {
      try {
        const stateObject = Object.fromEntries(newStates);
        localStorage.setItem('follow-states', JSON.stringify(stateObject));
      } catch (error) {
        console.warn('Failed to persist follow states:', error);
      }
    }
  }, [options.persistState]);

  // Get follow state for a user
  const getFollowState = useCallback((userId: string): FollowData => {
    return followStates.get(userId) || {
      userId,
      state: 'follow',
      isLoading: false,
      lastUpdated: Date.now()
    };
  }, [followStates]);

  // Update follow state with optimistic updates
  const updateFollowState = useCallback(async (
    userId: string, 
    newState: FollowState,
    networkCall?: () => Promise<boolean>
  ) => {
    const currentState = getFollowState(userId);
    const previousState = currentState.state;

    // Clear any existing rollback timer
    const existingTimer = rollbackTimers.current.get(userId);
    if (existingTimer) {
      clearTimeout(existingTimer);
      rollbackTimers.current.delete(userId);
    }

    // Optimistic update
    if (options.enableOptimisticUpdates) {
      setFollowStates(prev => {
        const newStates = new Map(prev);
        newStates.set(userId, {
          ...currentState,
          state: newState,
          isLoading: true,
          lastUpdated: Date.now()
        });
        persistState(newStates);
        return newStates;
      });
    }

    // Perform network call if provided
    if (networkCall) {
      try {
        const success = await networkCall();
        
        if (success) {
          // Confirm the optimistic update
          setFollowStates(prev => {
            const newStates = new Map(prev);
            newStates.set(userId, {
              ...getFollowState(userId),
              isLoading: false,
              lastUpdated: Date.now()
            });
            persistState(newStates);
            return newStates;
          });
        } else {
          throw new Error('Network call failed');
        }
      } catch (error) {
        console.warn('Follow network call failed:', error);
        
        // Rollback optimistic update
        if (options.enableOptimisticUpdates) {
          const rollbackTimer = setTimeout(() => {
            setFollowStates(prev => {
              const newStates = new Map(prev);
              newStates.set(userId, {
                ...currentState,
                state: previousState,
                isLoading: false,
                lastUpdated: Date.now()
              });
              persistState(newStates);
              return newStates;
            });
            rollbackTimers.current.delete(userId);
          }, options.rollbackDelay);

          rollbackTimers.current.set(userId, rollbackTimer);
        }
      }
    } else {
      // No network call, just update state
      setFollowStates(prev => {
        const newStates = new Map(prev);
        newStates.set(userId, {
          ...currentState,
          state: newState,
          isLoading: false,
          lastUpdated: Date.now()
        });
        persistState(newStates);
        return newStates;
      });
    }
  }, [getFollowState, options.enableOptimisticUpdates, options.rollbackDelay, persistState]);

  // Follow action with state transitions
  const handleFollow = useCallback(async (userId: string, isPrivateAccount = false) => {
    const currentState = getFollowState(userId);
    
    switch (currentState.state) {
      case 'follow':
        const newState = isPrivateAccount ? 'pending' : 'following';
        await updateFollowState(userId, newState, async () => {
          // Simulate API call
          await new Promise(resolve => setTimeout(resolve, 1000));
          return Math.random() > 0.1; // 90% success rate
        });
        break;
        
      case 'following':
        await updateFollowState(userId, 'unfollow-confirm');
        break;
        
      case 'unfollow-confirm':
        await updateFollowState(userId, 'follow', async () => {
          // Simulate unfollow API call
          await new Promise(resolve => setTimeout(resolve, 500));
          return Math.random() > 0.05; // 95% success rate
        });
        break;
        
      case 'pending':
        await updateFollowState(userId, 'follow', async () => {
          // Simulate cancel request API call
          await new Promise(resolve => setTimeout(resolve, 500));
          return Math.random() > 0.05; // 95% success rate
        });
        break;
    }
  }, [getFollowState, updateFollowState]);

  // Get display text for follow button
  const getFollowButtonText = useCallback((userId: string): string => {
    const state = getFollowState(userId);
    
    switch (state.state) {
      case 'follow': return 'Follow';
      case 'following': return 'Following';
      case 'pending': return 'Pending';
      case 'unfollow-confirm': return 'Unfollow?';
      default: return 'Follow';
    }
  }, [getFollowState]);

  // Get button variant for styling
  const getFollowButtonVariant = useCallback((userId: string): 'default' | 'secondary' | 'outline' | 'destructive' => {
    const state = getFollowState(userId);
    
    switch (state.state) {
      case 'follow': return 'default';
      case 'following': return 'secondary';
      case 'pending': return 'outline';
      case 'unfollow-confirm': return 'destructive';
      default: return 'default';
    }
  }, [getFollowState]);

  // Check if user is followed (in any positive state)
  const isUserFollowed = useCallback((userId: string): boolean => {
    const state = getFollowState(userId).state;
    return ['following', 'pending'].includes(state);
  }, [getFollowState]);

  // Cleanup timers on unmount
  useState(() => {
    return () => {
      rollbackTimers.current.forEach(timer => clearTimeout(timer));
      rollbackTimers.current.clear();
    };
  });

  return {
    getFollowState,
    handleFollow,
    getFollowButtonText,
    getFollowButtonVariant,
    isUserFollowed,
    followStates: followStates
  };
};