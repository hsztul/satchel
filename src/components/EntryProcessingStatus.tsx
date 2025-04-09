"use client";

import { useState, useEffect } from "react";
import { ProcessingStatus } from "./ProcessingStatus";
import { Entry } from "@/types";
import { QueueItem } from "@/lib/supabase/queue";

interface EntryProcessingStatusProps {
  initialEntry: Entry;
}

export function EntryProcessingStatus({ initialEntry }: EntryProcessingStatusProps) {
  const [entry, setEntry] = useState<Entry>(initialEntry);
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [isUpdating, setIsUpdating] = useState<boolean>(initialEntry.processingState !== "completed" && initialEntry.processingState !== "failed");
  const [currentAgent, setCurrentAgent] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Fetch queue items for this entry
  useEffect(() => {
    const fetchQueueItems = async () => {
      try {
        const { queueApi } = await import('@/lib/supabase/queue');
        const items = await queueApi.getQueueItemsForEntry(initialEntry.id);
        setQueueItems(items);
        
        // Find the current processing agent
        const processingItem = items.find(item => item.status === 'processing');
        if (processingItem) {
          setCurrentAgent(processingItem.agentName);
        } else {
          // If no processing item, find the most recent completed item
          const completedItems = items.filter(item => item.status === 'completed');
          if (completedItems.length > 0) {
            // Sort by completedAt in descending order
            completedItems.sort((a, b) => {
              return new Date(b.completedAt || '').getTime() - new Date(a.completedAt || '').getTime();
            });
            setCurrentAgent(completedItems[0].agentName);
          }
        }
      } catch (error) {
        console.error('Error fetching queue items:', error);
      }
    };
    
    fetchQueueItems();
  }, [initialEntry.id]);

  // Set up polling for entry updates
  useEffect(() => {
    console.log(`Entry ${entry.id} processing state: ${entry.processingState || 'unknown'}, progress: ${entry.processingProgress !== undefined ? entry.processingProgress : 'unknown'}`);
    
    // Check if we have valid processing state and progress
    if (entry.processingState === undefined) {
      console.warn(`Entry ${entry.id} has undefined processing state - this might indicate a mapping issue`);
    }

    // Only poll if the entry is still processing and not at 100%
    if (entry.processingState !== "completed" && 
        entry.processingState !== "failed" && 
        (entry.processingProgress === undefined || entry.processingProgress < 100)) {
      console.log(`Setting up polling for entry ${entry.id}`);
      
      // Poll every 1.5 seconds
      const pollInterval = setInterval(async () => {
        try {
          const { entriesApi } = await import('@/lib/supabase/client');
          const updatedEntry = await entriesApi.getEntry(entry.id);
          
          if (updatedEntry) {
            console.log(`Polled entry update:`, {
              id: updatedEntry.id,
              state: updatedEntry.processingState,
              progress: updatedEntry.processingProgress,
              title: updatedEntry.metadata?.title
            });
            
            // Verify that the processing state and progress are properly mapped
            if (updatedEntry.processingState === undefined) {
              console.error('Processing state is undefined after mapping!');
            }
            
            // Check if there's a real update to avoid unnecessary re-renders
            if (updatedEntry.processingState !== entry.processingState || 
                updatedEntry.processingProgress !== entry.processingProgress ||
                JSON.stringify(updatedEntry.metadata) !== JSON.stringify(entry.metadata)) {
              
              // Update entry state
              setEntry(updatedEntry);
              setLastRefresh(new Date());
              
              // Stop polling if processing is complete
              if (updatedEntry.processingState === "completed" || updatedEntry.processingState === "failed") {
                setIsUpdating(false);
                clearInterval(pollInterval);
                clearInterval(queuePollInterval); // Also clear queue polling
                console.log(`Polling stopped for entry ${entry.id} - processing complete`);
                
                // Force a final refresh of queue items to get the final state
                refreshQueueItems();
              }
            }
          }
        } catch (error) {
          console.error('Error polling entry:', error);
        }
      }, 1500);
      
      // Function to refresh queue items
      const refreshQueueItems = async () => {
        try {
          const { queueApi } = await import('@/lib/supabase/queue');
          const items = await queueApi.getQueueItemsForEntry(entry.id);
          
          if (items.length > 0) {
            console.log(`Refreshed queue items:`, items);
            setQueueItems(items);
            
            // Update current agent
            const processingItem = items.find(item => item.status === 'processing');
            if (processingItem) {
              setCurrentAgent(processingItem.agentName);
            } else {
              // If no processing item, find the most recent completed item
              const completedItems = items.filter(item => item.status === 'completed');
              if (completedItems.length > 0) {
                // Sort by completedAt in descending order
                completedItems.sort((a, b) => {
                  return new Date(b.completedAt || '').getTime() - new Date(a.completedAt || '').getTime();
                });
                setCurrentAgent(completedItems[0].agentName);
              }
            }
          }
        } catch (error) {
          console.error('Error refreshing queue items:', error);
        }
      };
      
      // Also poll queue items
      const queuePollInterval = setInterval(refreshQueueItems, 2000);
      
      // Initial refresh of queue items
      refreshQueueItems();
      
      // Clean up intervals when component unmounts
      return () => {
        clearInterval(pollInterval);
        clearInterval(queuePollInterval);
        console.log(`Polling cleanup for entry ${entry.id}`);
      };
    } else {
      // If the entry is already completed, just fetch queue items once
      const fetchQueueItemsOnce = async () => {
        try {
          const { queueApi } = await import('@/lib/supabase/queue');
          const items = await queueApi.getQueueItemsForEntry(entry.id);
          if (items.length > 0) {
            setQueueItems(items);
          }
        } catch (error) {
          console.error('Error fetching queue items:', error);
        }
      };
      
      fetchQueueItemsOnce();
    }
  }, [entry.id, entry.processingState, entry.processingProgress, entry.metadata]);

  useEffect(() => {
    // Logic that depends on entry.metadata and entry.processingProgress
  }, [entry.metadata, entry.processingProgress]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <ProcessingStatus 
          state={entry.processingState} 
          progress={entry.processingProgress || 0} 
        />
        {isUpdating && (
          <div className="flex items-center">
            <div className="w-2 h-2 bg-blue-500 rounded-full mr-1 animate-ping"></div>
            <span className="text-xs text-blue-500">
              Processing... {entry.processingProgress ? `${entry.processingProgress}%` : ''}
            </span>
          </div>
        )}
        
        {/* Removed duplicate processing complete message */}
      </div>
      
      {/* Show current agent if processing */}
      {currentAgent && (
        <div className="text-xs text-slate-500 mt-1">
          {isUpdating ? 'Current step: ' : 'Last step: '}
          <span className={`font-medium ${isUpdating ? 'text-blue-600' : 'text-slate-600'}`}>
            {formatAgentName(currentAgent)}
          </span>
        </div>
      )}
      
      {/* Removed duplicate processing complete message */}
      
      {/* Show queue items */}
      {queueItems.length > 0 && (
        <div className="mt-3 text-xs">
          <div className="text-slate-500 mb-1 flex items-center justify-between">
            <span>Processing steps:</span>
            <span className="text-xs text-slate-400">
              {lastRefresh && `Updated ${new Date().getTime() - lastRefresh.getTime() < 3000 ? 'just now' : 'recently'}`}
            </span>
          </div>
          <div className="space-y-1 border-l-2 border-slate-200 pl-3">
            {queueItems.map((item) => (
              <div key={item.id} className="flex items-center">
                <div className={`w-2 h-2 rounded-full mr-2 ${getStatusColor(item.status)}`} />
                <span className={item.status === 'processing' ? 'font-medium text-blue-600' : ''}>
                  {formatAgentName(item.agentName)}
                </span>
                <span className={`ml-auto ${item.status === 'processing' ? 'text-blue-500' : 'text-slate-400'}`}>
                  {getStatusText(item.status)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      
    </div>
  );
}

// Helper function to format agent names for display
function formatAgentName(agentName: string): string {
  return agentName
    .replace('-agent', '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

// Helper function to get status color
function getStatusColor(status: string): string {
  switch (status) {
    case 'completed':
      return 'bg-green-500';
    case 'processing':
      return 'bg-blue-500';
    case 'failed':
      return 'bg-red-500';
    default:
      return 'bg-slate-300';
  }
}

// Helper function to get status text
function getStatusText(status: string): string {
  switch (status) {
    case 'completed':
      return 'Done';
    case 'processing':
      return 'In progress';
    case 'failed':
      return 'Failed';
    default:
      return 'Pending';
  }
}
