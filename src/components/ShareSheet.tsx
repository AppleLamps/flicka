import { useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";

interface ShareSheetProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  url: string;
}

export const ShareSheet = ({ open, onOpenChange, title, url }: ShareSheetProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!open) return;
    const generateQR = async () => {
      // Lightweight QR: use canvas and a tiny inline generator (avoid deps)
      const { createCanvas } = await import("./qrgen");
      const canvas = canvasRef.current!;
      createCanvas(canvas, url);
    };
    generateQR();
  }, [open, url]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {}
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Share</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="text-sm break-all">{title}</div>
          <div className="flex items-center gap-2">
            <input className="flex-1 bg-muted px-3 py-2 rounded" readOnly value={url} aria-label="Share URL" title="Share URL" />
            <Button size="sm" onClick={copy}><Copy className="w-4 h-4 mr-2" />Copy</Button>
          </div>
          <div className="flex items-center justify-center">
            <canvas ref={canvasRef} width={180} height={180} className="bg-white p-2 rounded" />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};


