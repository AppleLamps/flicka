import { useRef, useCallback, useEffect, useState } from 'react';

interface VideoElement {
  element: HTMLVideoElement;
  id: string;
  isVisible: boolean;
  isPreloaded: boolean;
  loadPriority: 'high' | 'medium' | 'low';
  index?: number;
}

interface UseVideoManagerOptions {
  preloadDistance: number; // How many videos ahead/behind to preload
  maxActiveVideos: number; // Maximum videos to keep in memory
  networkAware: boolean; // Adjust quality based on connection
}

export const useVideoManager = (options: UseVideoManagerOptions = {
  preloadDistance: 2,
  maxActiveVideos: 5,
  networkAware: true
}) => {
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [isBuffering, setIsBuffering] = useState<Record<string, boolean>>({});
  const [networkType, setNetworkType] = useState<'slow' | 'fast'>('fast');
  const [isMuted, setIsMuted] = useState<boolean>(true);
  
  const videoElements = useRef<Map<string, VideoElement>>(new Map());
  type ListenerSet = {
    waiting: () => void;
    seeking: () => void;
    stalled: () => void;
    playing: () => void;
    canplay: () => void;
    canplaythrough: () => void;
    error: () => void;
  };
  const videoListeners = useRef<WeakMap<HTMLVideoElement, ListenerSet>>(new WeakMap());
  const observer = useRef<IntersectionObserver | null>(null);
  const visibilityTimers = useRef<Map<string, number>>(new Map());
  const memoryCleanupTimer = useRef<NodeJS.Timeout>();

  // Network detection
  useEffect(() => {
    if (options.networkAware && 'connection' in navigator) {
      const connection = (navigator as any).connection;
      const updateNetworkType = () => {
        setNetworkType(connection.effectiveType === '4g' ? 'fast' : 'slow');
      };
      
      updateNetworkType();
      connection.addEventListener('change', updateNetworkType);
      
      return () => connection.removeEventListener('change', updateNetworkType);
    }
  }, [options.networkAware]);

  // Memory cleanup
  const detachElementListeners = (element: HTMLVideoElement) => {
    const ls = videoListeners.current.get(element);
    if (ls) {
      element.removeEventListener('waiting', ls.waiting);
      element.removeEventListener('seeking', ls.seeking);
      element.removeEventListener('stalled', ls.stalled);
      element.removeEventListener('playing', ls.playing);
      element.removeEventListener('canplay', ls.canplay);
      element.removeEventListener('canplaythrough', ls.canplaythrough);
      element.removeEventListener('error', ls.error);
      videoListeners.current.delete(element);
    }
  };

  const cleanupMemory = useCallback(() => {
    const elements = Array.from(videoElements.current.values());
    const keepIds = new Set<string>();

    // Always keep currently focused and nearby items based on their index
    elements.forEach(el => {
      if (el.index !== undefined && Math.abs(el.index - currentVideoIndex) <= options.preloadDistance) {
        keepIds.add(el.id);
      }
      if (el.isVisible) {
        keepIds.add(el.id);
      }
    });

    // Limit total active videos for memory safety
    const limitedKeep = new Set<string>();
    Array.from(keepIds).slice(0, options.maxActiveVideos).forEach(id => limitedKeep.add(id));

    videoElements.current.forEach((video, id) => {
      if (!limitedKeep.has(id)) {
        detachElementListeners(video.element);
        video.element.removeAttribute('src');
        video.element.load();
        videoElements.current.delete(id);
      }
    });
  }, [currentVideoIndex, options.preloadDistance, options.maxActiveVideos]);

  // Preload videos
  const preloadVideo = useCallback((videoId: string, src: string, priority: VideoElement['loadPriority']) => {
    const existing = videoElements.current.get(videoId);
    if (existing?.isPreloaded) return;

    const video = existing?.element || document.createElement('video');
    
    // Set quality based on network and priority
    if (options.networkAware && networkType === 'slow' && priority === 'low') {
      return; // Skip low priority preloads on slow networks
    }

    video.preload = priority === 'high' ? 'auto' : 'metadata';
    video.src = src;
    video.muted = isMuted;
    video.playsInline = true;

    const handleLoadStart = () => setIsBuffering(prev => ({ ...prev, [videoId]: true }));
    const handleCanPlay = () => {
      setIsBuffering(prev => ({ ...prev, [videoId]: false }));
      const element = videoElements.current.get(videoId);
      if (element) {
        element.isPreloaded = true;
        videoElements.current.set(videoId, element);
      }
    };

    video.addEventListener('loadstart', handleLoadStart);
    video.addEventListener('canplay', handleCanPlay);

    videoElements.current.set(videoId, {
      element: video,
      id: videoId,
      isVisible: false,
      isPreloaded: false,
      loadPriority: priority
    });
  }, [networkType, options.networkAware, isMuted]);

  // Register video element
  const registerVideo = useCallback((videoId: string, element: HTMLVideoElement | null) => {
    if (element) {
      const existing = videoElements.current.get(videoId);

      // Ensure no duplicate listeners
      detachElementListeners(element);

      // Attach buffering/playing/error listeners to the actual element
      const waiting = () => setIsBuffering(prev => ({ ...prev, [videoId]: true }));
      const seeking = () => setIsBuffering(prev => ({ ...prev, [videoId]: true }));
      const stalled = () => setIsBuffering(prev => ({ ...prev, [videoId]: true }));
      const playing = () => setIsBuffering(prev => ({ ...prev, [videoId]: false }));
      const canplay = () => setIsBuffering(prev => ({ ...prev, [videoId]: false }));
      const canplaythrough = () => setIsBuffering(prev => ({ ...prev, [videoId]: false }));
      const error = () => setIsBuffering(prev => ({ ...prev, [videoId]: false }));

      element.addEventListener('waiting', waiting);
      element.addEventListener('seeking', seeking);
      element.addEventListener('stalled', stalled);
      element.addEventListener('playing', playing);
      element.addEventListener('canplay', canplay);
      element.addEventListener('canplaythrough', canplaythrough);
      element.addEventListener('error', error);
      videoListeners.current.set(element, { waiting, seeking, stalled, playing, canplay, canplaythrough, error });

      videoElements.current.set(videoId, {
        element,
        id: videoId,
        isVisible: false,
        isPreloaded: existing?.isPreloaded || false,
        loadPriority: 'high',
        index: existing?.index
      });
      element.muted = isMuted;
    } else {
      const existing = videoElements.current.get(videoId);
      if (existing?.element) {
        detachElementListeners(existing.element);
      }
      videoElements.current.delete(videoId);
    }
  }, [isMuted]);

  // Update video visibility
  const updateVideoVisibility = useCallback((videoId: string, isVisible: boolean, index: number) => {
    // Debounce rapid visibility toggles to avoid thrashing during fast scrolls
    const existingTimer = visibilityTimers.current.get(videoId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }
    const timer = window.setTimeout(() => {
      const element = videoElements.current.get(videoId);
      if (element) {
        element.isVisible = isVisible;
        element.index = index;
        videoElements.current.set(videoId, element);
        if (isVisible) {
          setCurrentVideoIndex(index);
        }
      }
    }, 120);
    visibilityTimers.current.set(videoId, timer);
  }, []);

  // Play/pause management
  const playVideo = useCallback(async (videoId: string) => {
    const element = videoElements.current.get(videoId);
    if (element?.element) {
      try {
        // Pause all other videos first
        videoElements.current.forEach((el, id) => {
          if (id !== videoId && !el.element.paused) {
            el.element.pause();
          }
        });

        element.element.muted = isMuted;
        await element.element.play();
        return true;
      } catch (error) {
        console.warn('Failed to play video:', error);
        return false;
      }
    }
    return false;
  }, [isMuted]);

  const pauseVideo = useCallback((videoId: string) => {
    const element = videoElements.current.get(videoId);
    if (element?.element && !element.element.paused) {
      element.element.pause();
    }
  }, []);

  const pauseAllVideos = useCallback(() => {
    videoElements.current.forEach(({ element }) => {
      if (!element.paused) {
        element.pause();
      }
    });
  }, []);

  const retryVideo = useCallback((videoId: string) => {
    const el = videoElements.current.get(videoId)?.element;
    if (!el) return;
    setIsBuffering(prev => ({ ...prev, [videoId]: true }));
    const curr = el.currentSrc || el.src;
    if (curr) el.src = curr;
    el.load();
    el.play().catch(() => {});
  }, []);

  const setMuted = useCallback((muted: boolean) => {
    setIsMuted(muted);
    videoElements.current.forEach(({ element }) => {
      element.muted = muted;
    });
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const next = !prev;
      videoElements.current.forEach(({ element }) => {
        element.muted = next;
      });
      return next;
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (memoryCleanupTimer.current) {
        clearTimeout(memoryCleanupTimer.current);
      }
      observer.current?.disconnect();
      // detach listeners on unmount
      videoElements.current.forEach(({ element }) => detachElementListeners(element));
      pauseAllVideos();
    };
  }, [pauseAllVideos]);

  // Memory cleanup interval
  useEffect(() => {
    memoryCleanupTimer.current = setInterval(cleanupMemory, 30000); // Clean every 30 seconds
    return () => {
      if (memoryCleanupTimer.current) {
        clearInterval(memoryCleanupTimer.current);
      }
    };
  }, [cleanupMemory]);

  return {
    registerVideo,
    updateVideoVisibility,
    playVideo,
    pauseVideo,
    pauseAllVideos,
    preloadVideo,
    retryVideo,
    setMuted,
    toggleMute,
    isBuffering,
    networkType,
    currentVideoIndex,
    isMuted
  };
};