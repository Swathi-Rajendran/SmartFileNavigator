import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { queryClient } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";
import { RefreshCcw } from "lucide-react";

export default function FixEmbeddingsButton() {
  const [isFixing, setIsFixing] = useState(false);

  const handleFixEmbeddings = async () => {
    setIsFixing(true);
    
    try {
      const response = await fetch('/api/fix-embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      const result = await response.json();
      
      toast({
        title: 'Success',
        description: result.message || 'Embeddings have been fixed successfully',
      });
      
      // Invalidate any cache that might be affected
      queryClient.invalidateQueries({ queryKey: ['/api/files/counts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/search'] });
    } catch (error) {
      console.error('Error fixing embeddings:', error);
      toast({
        title: 'Error',
        description: 'Failed to fix embeddings. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsFixing(false);
    }
  };

  return (
    <Button 
      variant="ghost" 
      size="sm" 
      onClick={handleFixEmbeddings} 
      disabled={isFixing}
      className="hover:bg-accent hover:text-accent-foreground"
    >
      <RefreshCcw className="mr-2 h-4 w-4" />
      {isFixing ? 'Fixing...' : 'Fix Embeddings'}
    </Button>
  );
}