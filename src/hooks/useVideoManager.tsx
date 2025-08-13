import { useRef, useCallback, useEffect, useState } from 'react';

interface VideoElement {
  element: HTMLVideoElement;
  id: string;
  isVisible: boolean;
  isPreloaded: boolean;
  loadPriority: 'high' | 'medium' | 'low';
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
  
  const videoElements = useRef<Map<string, VideoElement>>(new Map());
  const observer = useRef<IntersectionObserver | null>(null);
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
  const cleanupMemory = useCallback(() => {
    const elements = Array.from(videoElements.current.values());
    const activeElements = elements
      .filter(el => el.isVisible || Math.abs(elements.indexOf(el) - currentVideoIndex) <= options.preloadDistance)
      .slice(0, options.maxActiveVideos);

    // Remove elements that are too far away
    elements.forEach(el => {
      if (!activeElements.includes(el)) {
        el.element.src = '';
        el.element.load();
        videoElements.current.delete(el.id);
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
    video.muted = true;
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
  }, [networkType, options.networkAware]);

  // Register video element
  const registerVideo = useCallback((videoId: string, element: HTMLVideoElement | null) => {
    if (element) {
      const existing = videoElements.current.get(videoId);
      videoElements.current.set(videoId, {
        element,
        id: videoId,
        isVisible: false,
        isPreloaded: existing?.isPreloaded || false,
        loadPriority: 'high'
      });
    } else {
      videoElements.current.delete(videoId);
    }
  }, []);

  // Update video visibility
  const updateVideoVisibility = useCallback((videoId: string, isVisible: boolean, index: number) => {
    const element = videoElements.current.get(videoId);
    if (element) {
      element.isVisible = isVisible;
      videoElements.current.set(videoId, element);
      
      if (isVisible) {
        setCurrentVideoIndex(index);
      }
    }
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

        await element.element.play();
        return true;
      } catch (error) {
        console.warn('Failed to play video:', error);
        return false;
      }
    }
    return false;
  }, []);

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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (memoryCleanupTimer.current) {
        clearTimeout(memoryCleanupTimer.current);
      }
      observer.current?.disconnect();
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
    isBuffering,
    networkType,
    currentVideoIndex
  };
};