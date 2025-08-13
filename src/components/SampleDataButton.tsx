import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const SampleDataButton = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const createSampleData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-sample-data');
      
      if (error) {
        throw error;
      }

      toast({
        title: "Success!",
        description: "Sample data has been created. You can now see demo videos and users in the app.",
      });

      // Refresh the page to show new data
      window.location.reload();
    } catch (error) {
      console.error('Error creating sample data:', error);
      toast({
        title: "Error",
        description: "Failed to create sample data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button 
      onClick={createSampleData} 
      disabled={loading}
      variant="outline"
      className="mb-4"
    >
      {loading ? "Creating..." : "Add Sample Data"}
    </Button>
  );
};