import { useState, useRef, useCallback } from "react";
import { Upload, Film, AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VideoUploadProgress } from "./VideoUploadProgress";
import { validateVideoFile, formatFileSize } from "@/lib/validation";

interface VideoUploadAreaProps {
  onFileSelected: (file: File, duration: number) => void;
  onCancel: () => void;
}

export const VideoUploadArea = ({ onFileSelected, onCancel }: VideoUploadAreaProps) => {
  const [isDragActive, setIsDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback(async (file: File) => {
    setIsValidating(true);
    setValidationError(null);

    // Basic validation
    const basicValidation = validateVideoFile(file);
    if (!basicValidation.valid) {
      setValidationError(basicValidation.error || "Invalid file");
      setIsValidating(false);
      return;
    }

    try {
      // Check duration
      const video = document.createElement('video');
      video.preload = 'metadata';
      
      const loadPromise = new Promise<number>((resolve, reject) => {
        video.onloadedmetadata = () => resolve(video.duration);
        video.onerror = () => reject(new Error('Failed to load video'));
      });

      video.src = URL.createObjectURL(file);
      const duration = await loadPromise;
      URL.revokeObjectURL(video.src);

      if (duration > 60) {
        setValidationError(`Video is ${duration.toFixed(1)}s. Maximum is 60 seconds (you can trim in editor).`);
        setIsValidating(false);
        return;
      }

      // File is valid
      setIsValidating(false);
      onFileSelected(file, duration);
    } catch (error) {
      setValidationError("Failed to process video file");
      setIsValidating(false);
    }
  }, [onFileSelected]);

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const file = files[0];
    setSelectedFile(file);
    validateFile(file);
  }, [validateFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  }, [handleFiles]);

  const handleRetry = useCallback(() => {
    if (selectedFile) {
      validateFile(selectedFile);
    }
  }, [selectedFile, validateFile]);

  const clearSelection = useCallback(() => {
    setSelectedFile(null);
    setValidationError(null);
    setIsValidating(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  return (
    <div className="relative w-full h-full flex flex-col bg-background">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/60 to-transparent z-10">
        <div className="flex items-center justify-between">
          <button onClick={onCancel} className="icon-button" aria-label="Close upload" title="Close upload">
            <X size={24} className="text-white" />
          </button>
          <h2 className="text-white font-medium">Upload Video</h2>
          <div className="w-11" /> {/* Spacer */}
        </div>
      </div>

      {/* Upload Area */}
      <div className="flex-1 flex items-center justify-center p-6 pt-20">
        <div className="w-full max-w-md">
          {!selectedFile ? (
            <div
              className={`
                border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200
                ${isDragActive 
                  ? 'border-primary bg-primary/10' 
                  : 'border-border hover:border-primary/50'
                }
              `}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                  <Upload size={24} className="text-primary" />
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Upload a video</h3>
                  <p className="text-sm text-muted-foreground">
                    Drag and drop or click to select
                  </p>
                </div>

                <div className="space-y-1 text-xs text-muted-foreground">
                  <p>• Upload up to 60s, then trim to 6s</p>
                  <p>• MP4, WebM, MOV supported</p>
                  <p>• Up to 50MB file size</p>
                </div>

                <Button 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full"
                >
                  <Film size={16} className="mr-2" />
                  Choose Video
                </Button>
              </div>
            </div>
          ) : (
            <div className="glass-card p-6 space-y-4">
              <div className="flex items-start gap-3">
                <Film size={20} className="text-primary mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{selectedFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatFileSize(selectedFile.size)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSelection}
                  aria-label="Clear selected file"
                  title="Clear selected file"
                  className="p-1"
                >
                  <X size={16} />
                </Button>
              </div>

              {isValidating && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  Validating video...
                </div>
              )}

              {validationError && (
                <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <AlertCircle size={16} className="text-destructive mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-destructive">{validationError}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRetry}
                      className="mt-2"
                    >
                      Try Again
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/webm,video/mov,video/quicktime"
        onChange={handleFileInputChange}
        className="hidden"
        aria-label="Select video file"
        title="Select video file"
      />
    </div>
  );
};