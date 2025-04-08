"use client";

import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface RefreshButtonProps {
  className?: string;
  onClick?: () => Promise<void> | void;
}

export function RefreshButton({ className, onClick }: RefreshButtonProps) {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    
    try {
      // Call the custom onClick handler if provided
      if (onClick) {
        await onClick();
      } else {
        // Default behavior: refresh the current route
        router.refresh();
      }
    } catch (error) {
      console.error('Error refreshing:', error);
    } finally {
      // Reset the refreshing state after a short delay
      setTimeout(() => {
        setIsRefreshing(false);
      }, 1000);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className={className}
      onClick={handleRefresh}
      disabled={isRefreshing}
    >
      <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
      {isRefreshing ? "Refreshing..." : "Refresh"}
    </Button>
  );
}
