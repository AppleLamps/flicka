import React from "react";
import { validateVideoFile, formatFileSize } from "@/lib/validation";

interface VideoFileValidatorProps {
  file: File;
  onValidated: (isValid: boolean, error?: string, duration?: number) => void;
}

export const VideoFileValidator = ({ file, onValidated }: VideoFileValidatorProps) => {
  const validateFile = async () => {
    // Basic file validation
    const basicValidation = validateVideoFile(file);
    if (!basicValidation.valid) {
      onValidated(false, basicValidation.error);
      return;
    }

    // Check duration
    try {
      const video = document.createElement('video');
      video.preload = 'metadata';
      
      const loadPromise = new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => resolve();
        video.onerror = () => reject(new Error('Failed to load video metadata'));
      });

      video.src = URL.createObjectURL(file);
      await loadPromise;

      const duration = video.duration;
      URL.revokeObjectURL(video.src);

      if (duration > 6) {
        onValidated(false, `Video is ${duration.toFixed(1)}s long. Maximum allowed is 6 seconds.`, duration);
        return;
      }

      onValidated(true, undefined, duration);
    } catch (error) {
      onValidated(false, 'Failed to validate video file');
    }
  };

  // Auto-validate when component mounts
  React.useEffect(() => {
    validateFile();
  }, [file]);

  return null; // This is a utility component with no UI
};