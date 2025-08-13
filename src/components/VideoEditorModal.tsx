import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { X, Scissors, Image as ImageIcon, Play, Pause } from "lucide-react";

interface VideoEditorModalProps {
  isOpen: boolean;
  file: File;
  duration: number; // seconds
  maxFinalDuration?: number; // seconds, e.g. 6
  onClose: () => void;
  onApply: (result: { file: File; duration: number; coverBlob?: Blob; coverTime?: number }) => void;
}

// Trim by re-recording a playing canvas capture stream between [start,end]
const trimVideoViaCanvas = async (
  file: File,
  startTime: number,
  endTime: number,
  fps: number = 30
): Promise<Blob> => {
  return new Promise<Blob>((resolve, reject) => {
    try {
      const video = document.createElement("video");
      video.preload = "auto";
      video.muted = true;
      (video as any).playsInline = true;
      const objectUrl = URL.createObjectURL(file);
      video.src = objectUrl;

      const cleanup = () => {
        URL.revokeObjectURL(objectUrl);
      };

      const onLoaded = async () => {
        const width = video.videoWidth || 480;
        const height = video.videoHeight || 852;
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          cleanup();
          reject(new Error("Canvas context not available"));
          return;
        }

        // Prepare draw loop
        let rafId = 0;
        const draw = () => {
          try {
            ctx.drawImage(video, 0, 0, width, height);
          } catch {}
          rafId = requestAnimationFrame(draw);
        };

        // Seek then start recording
        const stream = (canvas as HTMLCanvasElement).captureStream(fps);
        const recordedChunks: BlobPart[] = [];
        const recorder = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp9,opus" });
        recorder.ondataavailable = (ev) => {
          if (ev.data && ev.data.size > 0) recordedChunks.push(ev.data);
        };
        recorder.onstop = () => {
          cancelAnimationFrame(rafId);
          cleanup();
          resolve(new Blob(recordedChunks, { type: "video/webm" }));
        };

        const handleSeeked = () => {
          draw();
          recorder.start();
          video.play().catch(() => {});
          const stopAt = endTime;
          const interval = setInterval(() => {
            if (video.currentTime >= stopAt || video.ended) {
              clearInterval(interval);
              recorder.stop();
            }
          }, 20);
        };

        video.removeEventListener("loadeddata", onLoaded);
        video.addEventListener("seeked", handleSeeked, { once: true });
        try {
          video.currentTime = Math.max(0, Math.min(startTime, (video.duration || endTime) - 0.05));
        } catch {
          // Fallback: start from beginning
          video.currentTime = 0;
        }
      };

      video.addEventListener("loadeddata", onLoaded);
      video.addEventListener("error", () => {
        cleanup();
        reject(new Error("Failed to load video for trimming"));
      }, { once: true });
    } catch (e) {
      reject(e as Error);
    }
  });
};

const extractCoverAtTime = async (file: File, time: number): Promise<Blob | null> => {
  try {
    const video = document.createElement("video");
    video.preload = "auto";
    video.muted = true;
    (video as any).playsInline = true;
    const objectUrl = URL.createObjectURL(file);
    video.src = objectUrl;

    const widthHeight = await new Promise<{ w: number; h: number }>((resolve, reject) => {
      video.onloadeddata = () => resolve({ w: video.videoWidth || 480, h: video.videoHeight || 852 });
      video.onerror = () => reject(new Error("Failed to load video for cover"));
    });

    const { w, h } = widthHeight;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    await new Promise<void>((resolve) => {
      const onSeeked = () => resolve();
      video.addEventListener("seeked", onSeeked, { once: true });
      try {
        video.currentTime = Math.max(0, time);
      } catch {
        resolve();
      }
    });

    ctx.drawImage(video, 0, 0, w, h);
    return await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => {
        URL.revokeObjectURL(objectUrl);
        resolve(b);
      }, "image/jpeg", 0.9);
    });
  } catch {
    return null;
  }
};

export const VideoEditorModal = ({ isOpen, file, duration, maxFinalDuration = 6, onClose, onApply }: VideoEditorModalProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [range, setRange] = useState<[number, number]>([0, Math.min(duration, maxFinalDuration)]);
  const [coverTime, setCoverTime] = useState<number>(Math.min(0.1, duration));
  const [isPlaying, setIsPlaying] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    setRange([0, Math.min(duration, maxFinalDuration)]);
    setCoverTime(Math.min(0.1, duration));
  }, [duration, maxFinalDuration]);

  const selectedLength = useMemo(() => Math.max(0, range[1] - range[0]), [range]);
  const needsTrim = selectedLength < duration || range[0] > 0 || selectedLength > maxFinalDuration;

  const handlePlayPause = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      v.pause();
      setIsPlaying(false);
    }
  }, []);

  const handleSliderChange = (vals: number[]) => {
    if (vals.length === 2) {
      const clampedEnd = Math.min(vals[0] + maxFinalDuration, vals[1]);
      const next: [number, number] = [Math.max(0, vals[0]), Math.min(duration, clampedEnd)];
      setRange(next);
      setCoverTime(Math.max(next[0], Math.min(coverTime, next[1])));
      if (videoRef.current) {
        try { videoRef.current.currentTime = next[0]; } catch {}
      }
    }
  };

  const handleScrubCover = (vals: number[]) => {
    if (vals.length) {
      const t = Math.max(range[0], Math.min(range[1], vals[0]));
      setCoverTime(t);
      if (videoRef.current) {
        try { videoRef.current.currentTime = t; } catch {}
      }
    }
  };

  const handleSetCover = async () => {
    const blob = await extractCoverAtTime(file, coverTime);
    if (blob) {
      const url = URL.createObjectURL(blob);
      if (coverPreviewUrl) URL.revokeObjectURL(coverPreviewUrl);
      setCoverPreviewUrl(url);
    }
  };

  const handleApply = async () => {
    try {
      setIsProcessing(true);
      let outputFile = file;
      let outDuration = Math.min(selectedLength, maxFinalDuration);
      if (needsTrim) {
        const blob = await trimVideoViaCanvas(file, range[0], range[0] + outDuration);
        outputFile = new File([blob], file.name.replace(/\.[^.]+$/, "") + "-trimmed.webm", { type: "video/webm" });
      } else {
        outDuration = duration;
      }
      let coverBlob: Blob | undefined;
      if (coverPreviewUrl) {
        // We only stored preview URL; regenerate from time to get the Blob
        const b = await extractCoverAtTime(outputFile, Math.min(coverTime - range[0], outDuration));
        if (b) coverBlob = b;
      }
      onApply({ file: outputFile, duration: Math.max(0.01, Math.round(outDuration * 10) / 10), coverBlob, coverTime });
      onClose();
    } catch (e) {
      // Swallow; in parent we'll show toast
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-background rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border/20">
          <h2 className="text-lg font-semibold">Edit Video</h2>
          <button onClick={onClose} className="icon-button" aria-label="Close editor" title="Close editor"><X size={20} /></button>
        </div>

        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4 flex-1 overflow-auto">
          <div className="md:col-span-2 space-y-3">
            <div className="relative aspect-[9/16] bg-black rounded-xl overflow-hidden">
              <video
                ref={videoRef}
                src={URL.createObjectURL(file)}
                className="w-full h-full object-contain bg-black"
                muted
                playsInline
                onLoadedMetadata={() => {
                  try { if (videoRef.current) videoRef.current.currentTime = range[0]; } catch {}
                }}
              />
              <button
                onClick={handlePlayPause}
                className="absolute bottom-3 right-3 bg-black/60 rounded-full p-2"
              >
                {isPlaying ? <Pause size={18} className="text-white" /> : <Play size={18} className="text-white" />}
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{range[0].toFixed(2)}s</span>
                <span>Trim</span>
                <span>{range[1].toFixed(2)}s</span>
              </div>
              <Slider
                value={[range[0], range[1]]}
                min={0}
                max={duration}
                step={0.01}
                onValueChange={handleSliderChange}
              />
              <div className="text-xs text-muted-foreground text-right">Selected: {selectedLength.toFixed(2)}s (max {maxFinalDuration}s)</div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{range[0].toFixed(2)}s</span>
                <span>Cover</span>
                <span>{range[1].toFixed(2)}s</span>
              </div>
              <Slider
                value={[coverTime]}
                min={range[0]}
                max={range[1]}
                step={0.01}
                onValueChange={handleScrubCover}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <div className="text-sm font-medium mb-2">Cover preview</div>
              <div className="aspect-[9/16] bg-muted rounded-lg overflow-hidden flex items-center justify-center">
                {coverPreviewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={coverPreviewUrl} alt="cover" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-xs text-muted-foreground">No cover selected</div>
                )}
              </div>
              <Button onClick={handleSetCover} className="w-full mt-2" variant="outline">
                <ImageIcon size={16} className="mr-2" /> Set cover from current frame
              </Button>
            </div>

            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">
                Final length will be capped to {maxFinalDuration}s.
              </div>
              <Button onClick={handleApply} className="w-full" disabled={isProcessing}>
                <Scissors size={16} className="mr-2" />
                {isProcessing ? "Processing..." : "Apply and continue"}
              </Button>
              <Button onClick={onClose} className="w-full" variant="ghost" disabled={isProcessing}>Cancel</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


