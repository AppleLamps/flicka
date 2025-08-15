import { useEffect, useRef, useState, RefObject } from 'react';

interface UseIntersectionObserverProps {
  threshold?: number | number[];
  root?: Element | null;
  rootMargin?: string;
  freezeOnceVisible?: boolean;
}

export const useIntersectionObserver = (
  elementRef: RefObject<Element>,
  {
    threshold = 0,
    root = null,
    rootMargin = '0%',
    freezeOnceVisible = false
  }: UseIntersectionObserverProps = {}
): IntersectionObserverEntry | undefined => {
  const [entry, setEntry] = useState<IntersectionObserverEntry>();

  const frozen = entry?.isIntersecting && freezeOnceVisible;

  const updateEntry = ([entry]: IntersectionObserverEntry[]): void => {
    setEntry(entry);
  };

  useEffect(() => {
    const node = elementRef?.current; // DOM element
    const hasIOSupport = !!window.IntersectionObserver;

    if (!hasIOSupport || frozen || !node) return;

    const observerParams = { threshold, root, rootMargin };
    const observer = new IntersectionObserver(updateEntry, observerParams);

    observer.observe(node);

    return () => observer.disconnect();
  }, [elementRef, threshold, root, rootMargin, frozen]);

  return entry;
};

// Hook for observing multiple elements
export const useIntersectionObserverMultiple = (
  elementsRef: RefObject<Element[]>,
  options: UseIntersectionObserverProps = {}
) => {
  const [entries, setEntries] = useState<Map<Element, IntersectionObserverEntry>>(new Map());

  useEffect(() => {
    const elements = elementsRef.current;
    if (!elements || !window.IntersectionObserver) return;

    const observer = new IntersectionObserver((observerEntries) => {
      setEntries(prev => {
        const newEntries = new Map(prev);
        observerEntries.forEach(entry => {
          newEntries.set(entry.target, entry);
        });
        return newEntries;
      });
    }, options);

    elements.forEach(element => {
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, [elementsRef, options]);

  return entries;
};

// Visibility hook
export const useVisibility = (
  elementRef: RefObject<Element>,
  options: UseIntersectionObserverProps = {}
) => {
  const entry = useIntersectionObserver(elementRef, options);
  return entry?.isIntersecting ?? false;
};

// Hook for lazy loading
export const useLazyLoad = (
  elementRef: RefObject<Element>,
  options: UseIntersectionObserverProps = {}
) => {
  const [hasLoaded, setHasLoaded] = useState(false);
  const isVisible = useVisibility(elementRef, {
    ...options,
    freezeOnceVisible: true
  });

  useEffect(() => {
    if (isVisible && !hasLoaded) {
      setHasLoaded(true);
    }
  }, [isVisible, hasLoaded]);

  return { isVisible, hasLoaded };
};