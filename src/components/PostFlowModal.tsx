import { useState } from "react";
import { X, Hash, Music, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface PostFlowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPost: (postData: {
    caption: string;
    hashtags: string[];
    audioTitle?: string;
  }) => void;
  videoDuration: number;
}

const SUGGESTED_HASHTAGS = [
  "loop", "viral", "trending", "fyp", "foryou", "creative", "art", "music", "dance", "comedy"
];

export const PostFlowModal = ({ isOpen, onClose, onPost, videoDuration }: PostFlowModalProps) => {
  const [caption, setCaption] = useState("");
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [audioTitle, setAudioTitle] = useState("");
  const [customHashtag, setCustomHashtag] = useState("");

  const handleAddHashtag = (tag: string) => {
    if (!hashtags.includes(tag) && hashtags.length < 10) {
      setHashtags(prev => [...prev, tag]);
    }
  };

  const handleRemoveHashtag = (tag: string) => {
    setHashtags(prev => prev.filter(t => t !== tag));
  };

  const handleAddCustomHashtag = () => {
    if (customHashtag.trim() && !hashtags.includes(customHashtag.trim())) {
      handleAddHashtag(customHashtag.trim());
      setCustomHashtag("");
    }
  };

  const handlePost = () => {
    onPost({
      caption: caption.trim(),
      hashtags,
      audioTitle: audioTitle.trim() || undefined
    });
    
    // Reset form
    setCaption("");
    setHashtags([]);
    setAudioTitle("");
    setCustomHashtag("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-background rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/20">
          <div>
            <h2 className="text-lg font-semibold">Share Your Loop</h2>
            <p className="text-sm text-muted-foreground">{videoDuration.toFixed(1)}s video</p>
          </div>
          <button onClick={onClose} className="icon-button" aria-label="Close post modal" title="Close">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-6">
          {/* Caption */}
          <div>
            <label className="block text-sm font-medium mb-2">Caption</label>
            <Textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="What's happening in your loop?"
              className="min-h-[80px] resize-none"
              maxLength={300}
            />
            <div className="text-xs text-muted-foreground text-right mt-1">
              {caption.length}/300
            </div>
          </div>

          {/* Audio Title */}
          <div>
            <label className="block text-sm font-medium mb-2 flex items-center gap-2">
              <Music size={16} />
              Audio Title (Optional)
            </label>
            <Input
              value={audioTitle}
              onChange={(e) => setAudioTitle(e.target.value)}
              placeholder="Original sound - Your name"
              maxLength={100}
            />
          </div>

          {/* Hashtags */}
          <div>
            <label className="block text-sm font-medium mb-2 flex items-center gap-2">
              <Hash size={16} />
              Hashtags ({hashtags.length}/10)
            </label>
            
            {/* Selected Hashtags */}
            {hashtags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {hashtags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => handleRemoveHashtag(tag)}
                    className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium hover:bg-primary/20 transition-colors"
                  >
                    #{tag} ×
                  </button>
                ))}
              </div>
            )}

            {/* Add Custom Hashtag */}
            <div className="flex gap-2 mb-3">
              <Input
                value={customHashtag}
                onChange={(e) => setCustomHashtag(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))}
                placeholder="Add custom hashtag"
                className="flex-1"
                maxLength={30}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomHashtag();
                  }
                }}
              />
              <Button 
                onClick={handleAddCustomHashtag}
                disabled={!customHashtag.trim() || hashtags.length >= 10}
                size="sm"
              >
                Add
              </Button>
            </div>

            {/* Suggested Hashtags */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">Suggested:</p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTED_HASHTAGS.filter(tag => !hashtags.includes(tag)).slice(0, 6).map((tag) => (
                  <button
                    key={tag}
                    onClick={() => handleAddHashtag(tag)}
                    disabled={hashtags.length >= 10}
                    className="bg-muted/50 text-muted-foreground px-3 py-1 rounded-full text-sm hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border/20">
          <Button 
            onClick={handlePost}
            className="w-full"
            disabled={!caption.trim()}
          >
            <Send size={16} className="mr-2" />
            Share Loop
          </Button>
        </div>
      </div>
    </div>
  );
};