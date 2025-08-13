import { Progress } from "@/components/ui/progress";
import { X, Upload, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface VideoUploadProgressProps {
  progress: number;
  status: 'uploading' | 'processing' | 'complete' | 'error';
  fileName?: string;
  error?: string;
  onCancel?: () => void;
  onRetry?: () => void;
  onClose?: () => void;
}

export const VideoUploadProgress = ({
  progress,
  status,
  fileName,
  error,
  onCancel,
  onRetry,
  onClose
}: VideoUploadProgressProps) => {
  const getStatusIcon = () => {
    switch (status) {
      case 'uploading':
      case 'processing':
        return <Upload className="w-5 h-5 text-primary animate-bounce" />;
      case 'complete':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-destructive" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'uploading':
        return 'Uploading video...';
      case 'processing':
        return 'Processing video...';
      case 'complete':
        return 'Upload complete!';
      case 'error':
        return 'Upload failed';
    }
  };

  const showProgress = status === 'uploading' || status === 'processing';
  const showActions = status === 'error' || status === 'complete';

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50">
      <div className="glass-card p-4 max-w-sm mx-auto">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            {getStatusIcon()}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-medium">{getStatusText()}</p>
              {(status === 'uploading' || status === 'error') && onCancel && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={status === 'error' ? onClose : onCancel}
                  className="w-6 h-6 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
              {status === 'complete' && onClose && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="w-6 h-6 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
            
            {fileName && (
              <p className="text-xs text-muted-foreground truncate mb-2">
                {fileName}
              </p>
            )}
            
            {showProgress && (
              <div className="space-y-1">
                <Progress value={progress} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {Math.round(progress)}%
                </p>
              </div>
            )}
            
            {error && (
              <p className="text-xs text-destructive mt-1">
                {error}
              </p>
            )}
          </div>
        </div>
        
        {showActions && (
          <div className="flex gap-2 mt-3">
            {status === 'error' && onRetry && (
              <Button size="sm" onClick={onRetry} className="flex-1">
                Try Again
              </Button>
            )}
            {status === 'complete' && (
              <Button size="sm" onClick={onClose} className="flex-1">
                Done
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};