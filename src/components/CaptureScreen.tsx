import { useState, useRef, useEffect } from "react";
import { 
  X, 
  RotateCcw, 
  Zap, 
  Timer, 
  Gauge, 
  AlignCenter, 
  Volume2, 
  VolumeX,
  CheckCircle,
  AlertCircle,
  Captions,
  Upload,
  Camera
} from "lucide-react";
import { PostFlowModal } from "./PostFlowModal";
import { VideoEditorModal } from "./VideoEditorModal";
import { VideoUploadArea } from "./VideoUploadArea";
import { useSocialFeatures } from "@/hooks/useSocialFeatures";
import { useToast } from "@/hooks/use-toast";

interface CaptureScreenProps {
  onClose: () => void;
  onPost?: () => void;
}

interface VideoClip {
  id: string;
  duration: number;
  data: Blob;
}

export const CaptureScreen = ({ onClose, onPost }: CaptureScreenProps) => {
  const { uploadVideo, uploadThumbnail, postVideo } = useSocialFeatures();
  const { toast } = useToast();
  
  // Mode state
  const [mode, setMode] = useState('record');
  const [uploadedFile, setUploadedFile] = useState<{ file: File; duration: number } | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [coverChoice, setCoverChoice] = useState<{ blob?: Blob; time?: number } | null>(null);
  
  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [clips, setClips] = useState<VideoClip[]>([]);
  const [totalDuration, setTotalDuration] = useState(0);
  const [recordingProgress, setRecordingProgress] = useState(0);
  const [hasFlash, setHasFlash] = useState(false);
  const [hasTimer, setHasTimer] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [hasAlignment, setHasAlignment] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [hasAutoCaptions, setHasAutoCaptions] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [showPostFlow, setShowPostFlow] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const MAX_DURATION = 6; // 6 seconds max
  const SEGMENT_COUNT = 6; // Visual segments in progress bar

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: true
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
  };

  const flipCamera = async () => {
    const currentStream = streamRef.current;
    if (currentStream) {
      const videoTrack = currentStream.getVideoTracks()[0];
      const currentFacingMode = videoTrack.getSettings().facingMode;
      const newFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
      
      stopCamera();
      
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: newFacingMode },
          audio: true
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Error flipping camera:', error);
        startCamera(); // Fallback to original camera
      }
    }
  };

  const startRecording = () => {
    if (!streamRef.current) return;

    if (hasTimer && !countdown) {
      // Start countdown
      setCountdown(3);
      const countdownInterval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            actuallyStartRecording();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return;
    }

    actuallyStartRecording();
  };

  const actuallyStartRecording = () => {
    if (!streamRef.current || totalDuration >= MAX_DURATION) return;

    const mediaRecorder = new MediaRecorder(streamRef.current);
    mediaRecorderRef.current = mediaRecorder;
    
    const chunks: Blob[] = [];
    mediaRecorder.ondataavailable = (event) => {
      chunks.push(event.data);
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const duration = Math.min(recordingProgress / 100 * MAX_DURATION, MAX_DURATION - totalDuration);
      
      const newClip: VideoClip = {
        id: Date.now().toString(),
        duration,
        data: blob
      };

      setClips(prev => [...prev, newClip]);
      setTotalDuration(prev => prev + duration);
      setRecordingProgress(0);
    };

    mediaRecorder.start();
    setIsRecording(true);

    // Progress tracking
    const startTime = Date.now();
    const progressInterval = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      const remainingTime = MAX_DURATION - totalDuration;
      const progress = Math.min((elapsed / remainingTime) * 100, 100);
      
      setRecordingProgress(progress);

      if (elapsed >= remainingTime) {
        stopRecording();
        clearInterval(progressInterval);
      }
    }, 100);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const deleteLastClip = () => {
    if (clips.length > 0) {
      const lastClip = clips[clips.length - 1];
      setClips(prev => prev.slice(0, -1));
      setTotalDuration(prev => prev - lastClip.duration);
    }
  };

  const handleFileSelected = (file: File, duration: number) => {
    setUploadedFile({ file, duration });
    setTotalDuration(Math.min(duration, MAX_DURATION));
    setEditorOpen(true);
  };

  const handleShowPostFlow = () => {
    if (uploadedFile) {
      setShowPostFlow(true);
      return;
    }
    if (clips.length > 0) {
      // Build a temporary file from recorded clips and open editor
      const combinedBlob = new Blob(clips.map(c => c.data), { type: 'video/webm' });
      const tempFile = new File([combinedBlob], `video-${Date.now()}.webm`, { type: 'video/webm' });
      setUploadedFile({ file: tempFile, duration: totalDuration });
      setEditorOpen(true);
      return;
    }
  };

  const handlePost = async (postData: {
    caption: string;
    hashtags: string[];
    audioTitle?: string;
  }) => {
    try {
      let videoFile: File;

      if (uploadedFile) {
        // Use uploaded file
        videoFile = uploadedFile.file;
      } else if (clips.length > 0) {
        // Combine recorded clips
        const combinedBlob = new Blob(clips.map(clip => clip.data), { type: 'video/webm' });
        videoFile = new File([combinedBlob], `video-${Date.now()}.webm`, { type: 'video/webm' });
      } else {
        return;
      }

      toast({
        title: "Uploading video...",
        description: "Please wait while we process your video.",
      });

      // Generate a thumbnail from the first frame
      const generateThumbnailFromFile = (file: File) =>
        new Promise<Blob | null>((resolve) => {
          try {
            const video = document.createElement('video');
            video.preload = 'metadata';
            video.muted = true;
            (video as any).playsInline = true;
            const objectUrl = URL.createObjectURL(file);
            video.src = objectUrl;

            const cleanup = () => {
              URL.revokeObjectURL(objectUrl);
            };

            const capture = () => {
              try {
                const width = video.videoWidth || 480;
                const height = video.videoHeight || 852;
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                  cleanup();
                  resolve(null);
                  return;
                }
                ctx.drawImage(video, 0, 0, width, height);
                canvas.toBlob((blob) => {
                  cleanup();
                  resolve(blob);
                }, 'image/jpeg', 0.8);
              } catch (_) {
                cleanup();
                resolve(null);
              }
            };

            video.addEventListener('loadeddata', () => {
              try {
                // Nudge to a tiny offset to avoid black frames in some codecs
                video.currentTime = Math.min(0.1, (video.duration || 1) - 0.1);
              } catch (_) {
                // If seeking throws, capture immediately
                capture();
              }
            });
            video.addEventListener('seeked', capture, { once: true });
            video.addEventListener('error', () => {
              cleanup();
              resolve(null);
            }, { once: true });
          } catch (_) {
            resolve(null);
          }
        });

      const [videoUrl, generatedThumbBlob] = await Promise.all([
        uploadVideo(videoFile),
        coverChoice?.blob ? Promise.resolve(coverChoice.blob) : generateThumbnailFromFile(videoFile)
      ]);

      if (!videoUrl) {
        throw new Error('Failed to upload video');
      }

      let thumbnailUrl: string | null = null;
      if (generatedThumbBlob) {
        thumbnailUrl = await uploadThumbnail(generatedThumbBlob);
      }

      // Post video with metadata (include thumbnail if available)
      const result = await postVideo({
        title: postData.caption.substring(0, 100),
        description: postData.caption,
        video_url: videoUrl,
        thumbnail_url: thumbnailUrl || undefined,
        duration: Math.round(totalDuration),
        hashtags: postData.hashtags,
        audio_title: postData.audioTitle,
      });

      if (result) {
        toast({
          title: "Video posted successfully!",
          description: "Your loop is now live.",
        });
        
        onPost?.(); // Refresh the feed
        onClose();
      }
    } catch (error) {
      console.error('Error posting video:', error);
      toast({
        title: "Failed to post video",
        description: "Please try again later.",
        variant: "destructive",
      });
    }
  };

  const canRecord = totalDuration < MAX_DURATION;
  const progressPercentage = (totalDuration / MAX_DURATION) * 100;

  // Show upload area when in upload mode
  if (mode === 'upload') {
    return (
      <div className="fixed inset-0 z-50 bg-background">
        <VideoUploadArea 
          onFileSelected={handleFileSelected}
          onCancel={() => setMode('record')}
        />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Mode Toggle */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20">
        <div className="flex bg-black/50 rounded-full p-1 backdrop-blur-sm">
          <button
            onClick={() => setMode('record')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              mode !== 'upload'
                ? 'bg-white text-black' 
                : 'text-white hover:text-white/80'
            }`}
          >
            <Camera size={16} className="mr-2 inline" />
            Record
          </button>
          <button
            onClick={() => setMode('upload')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              mode !== 'record'
                ? 'bg-white text-black' 
                : 'text-white hover:text-white/80'
            }`}
          >
            <Upload size={16} className="mr-2 inline" />
            Upload
          </button>
        </div>
      </div>

      {/* Camera View */}
      <div className="relative w-full h-full">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover"
        />

        {/* Countdown Overlay */}
        {countdown > 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="text-white text-8xl font-bold animate-pulse">
              {countdown}
            </div>
          </div>
        )}

        {/* Alignment Grid */}
        {hasAlignment && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="w-full h-full grid grid-cols-3 grid-rows-3">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="border border-white/20"></div>
              ))}
            </div>
          </div>
        )}

        {/* Top Controls */}
        <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/60 to-transparent">
          <div className="flex items-center justify-between">
            <button
              onClick={onClose}
              className="icon-button"
              aria-label="Close"
              title="Close"
            >
              <X size={24} className="text-white" />
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setHasFlash(!hasFlash)}
                className={`icon-button ${hasFlash ? 'bg-primary' : ''}`}
                aria-label="Toggle flash"
                title="Toggle flash"
              >
                <Zap size={20} className="text-white" />
              </button>

              <button
                onClick={() => setHasTimer(!hasTimer)}
                className={`icon-button ${hasTimer ? 'bg-primary' : ''}`}
                aria-label="Toggle timer"
                title="Toggle timer"
              >
                <Timer size={20} className="text-white" />
              </button>

              <button
                onClick={() => setSpeed(speed === 1 ? 0.5 : speed === 0.5 ? 2 : 1)}
                className="icon-button"
                aria-label="Change speed"
                title="Change speed"
              >
                <Gauge size={20} className="text-white" />
                <span className="absolute -bottom-1 text-xs text-white">
                  {speed === 0.5 ? '0.5x' : speed === 2 ? '2x' : '1x'}
                </span>
              </button>

              <button
                onClick={() => setHasAlignment(!hasAlignment)}
                className={`icon-button ${hasAlignment ? 'bg-primary' : ''}`}
                aria-label="Toggle alignment grid"
                title="Toggle alignment grid"
              >
                <AlignCenter size={20} className="text-white" />
              </button>

              <button
                onClick={() => setIsMuted(!isMuted)}
                className={`icon-button ${isMuted ? 'bg-red-500' : ''}`}
                aria-label="Toggle mute"
                title="Toggle mute"
              >
                {isMuted ? <VolumeX size={20} className="text-white" /> : <Volume2 size={20} className="text-white" />}
              </button>

              <button
                onClick={() => setHasAutoCaptions(!hasAutoCaptions)}
                className={`icon-button ${hasAutoCaptions ? 'bg-primary' : ''}`}
                aria-label="Toggle auto captions"
                title="Toggle auto captions"
              >
                <Captions size={20} className="text-white" />
              </button>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="absolute top-32 left-4 right-4">
          <div className="flex gap-1">
            {Array.from({ length: SEGMENT_COUNT }).map((_, i) => {
              const segmentProgress = Math.max(0, Math.min(100, (progressPercentage - (i * (100 / SEGMENT_COUNT))) * (SEGMENT_COUNT)));
              const isRecordingSegment = isRecording && i === clips.length;
              
              return (
                <div key={i} className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
                  <div
                    aria-label={`Progress segment ${i+1}`}
                    className={`h-full transition-all duration-100 ${
                      isRecordingSegment ? 'bg-red-500' : 'bg-primary'
                    } ${`w-pct-${Math.round(segmentProgress)}`}`}
                  />
                </div>
              );
            })}
          </div>
          
          <div className="mt-2 text-center">
            <span className="text-white text-sm font-medium">
              {totalDuration.toFixed(1)}s / {MAX_DURATION}s
            </span>
          </div>
        </div>

        {/* Side Controls */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-4">
          <button
            onClick={flipCamera}
            className="icon-button"
            aria-label="Flip camera"
            title="Flip camera"
          >
            <RotateCcw size={24} className="text-white" />
          </button>
        </div>

        {/* Bottom Controls */}
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/60 to-transparent">
          <div className="flex items-center justify-between">
            {/* Delete Last Clip */}
            <button
              onClick={deleteLastClip}
              disabled={clips.length === 0}
              className="btn-ghost disabled:opacity-50"
            >
              Delete
            </button>

            {/* Record Button */}
            <button
              onMouseDown={startRecording}
              onMouseUp={stopRecording}
              onTouchStart={startRecording}
              onTouchEnd={stopRecording}
              disabled={!canRecord}
              className={`
                capture-button
                ${isRecording ? 'recording' : ''}
                ${!canRecord ? 'opacity-50' : ''}
              `}
            aria-label="Record"
            title="Record"
            >
              {countdown > 0 && (
                <div className="absolute inset-0 flex items-center justify-center text-white font-bold">
                  {countdown}
                </div>
              )}
            </button>

            {/* Post Button */}
            <button
              onClick={handleShowPostFlow}
              disabled={totalDuration === 0 && !uploadedFile}
              className="btn-primary disabled:opacity-50"
            >
              {totalDuration >= MAX_DURATION || uploadedFile ? (
                <CheckCircle size={20} className="mr-2" />
              ) : totalDuration > 0 ? (
                <AlertCircle size={20} className="mr-2" />
              ) : null}
              Next
            </button>
          </div>

          {/* Instructions */}
          <div className="mt-4 text-center">
            <p className="text-white/70 text-sm">
              {isRecording 
                ? "Recording... Release to stop" 
                : canRecord 
                  ? "Hold to record or tap Upload above" 
                  : "Ready to post"
              }
            </p>
          </div>
        </div>
      </div>

      {/* Editor Modal */}
      {uploadedFile && (
        <VideoEditorModal
          isOpen={editorOpen}
          file={uploadedFile.file}
          duration={uploadedFile.duration}
          maxFinalDuration={MAX_DURATION}
          onClose={() => setEditorOpen(false)}
          onApply={({ file, duration, coverBlob, coverTime }) => {
            setUploadedFile({ file, duration });
            setTotalDuration(duration);
            setCoverChoice({ blob: coverBlob, time: coverTime });
            setShowPostFlow(true);
          }}
        />
      )}

      {/* Post Flow Modal */}
      <PostFlowModal
        isOpen={showPostFlow}
        onClose={() => setShowPostFlow(false)}
        onPost={handlePost}
        videoDuration={totalDuration}
      />
    </div>
  );
};