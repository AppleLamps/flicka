import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface PrivacySettingsProps {
  onClose?: () => void;
}

export const PrivacySettings = ({ onClose }: PrivacySettingsProps) => {
  const { profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    is_private: profile?.is_private || false,
    show_followers: profile?.show_followers || true,
    show_following: profile?.show_following || true,
  });

  const handleSave = async () => {
    if (!profile) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update(settings)
        .eq('user_id', profile.user_id);

      if (error) throw error;

      await refreshProfile();
      toast({
        title: "Privacy settings updated",
        description: "Your privacy preferences have been saved.",
      });
      onClose?.();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update privacy settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Privacy Settings</CardTitle>
        <CardDescription>
          Control who can see your profile and activities
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="private-account">Private Account</Label>
              <p className="text-sm text-muted-foreground">
                Only approved followers can see your videos
              </p>
            </div>
            <Switch
              id="private-account"
              checked={settings.is_private}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, is_private: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="show-followers">Show Followers</Label>
              <p className="text-sm text-muted-foreground">
                Let others see who follows you
              </p>
            </div>
            <Switch
              id="show-followers"
              checked={settings.show_followers}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, show_followers: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="show-following">Show Following</Label>
              <p className="text-sm text-muted-foreground">
                Let others see who you follow
              </p>
            </div>
            <Switch
              id="show-following"
              checked={settings.show_following}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, show_following: checked })
              }
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={loading} className="flex-1">
            {loading ? "Saving..." : "Save Changes"}
          </Button>
          {onClose && (
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};