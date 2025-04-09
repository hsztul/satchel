"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Button } from "./ui/button";
import { RefreshCw, Play, AlertCircle } from "lucide-react";
import { QueueItem } from "@/lib/supabase/queue";

export function QueueDashboard() {
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch queue items
  const fetchQueueItems = async () => {
    try {
      setIsRefreshing(true);
      
      // Fetch all queue items using the API
      const response = await fetch('/api/queue', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Error fetching queue items: ${response.statusText}`);
      }
      
      const data = await response.json();
      setQueueItems(data.items || []);
    } catch (error) {
      console.error('Error fetching queue items:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Process the next item in the queue
  const processNextItem = async () => {
    try {
      setIsProcessing(true);
      
      const response = await fetch('/api/queue/worker', {
        method: 'GET',
      });
      
      if (!response.ok) {
        throw new Error(`Error processing queue: ${response.statusText}`);
      }
      
      // Refresh the queue items
      await fetchQueueItems();
    } catch (error) {
      console.error('Error processing queue:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Set up real-time subscription for queue items
  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Fetch queue items initially
    fetchQueueItems();
    
    // Clean up subscription when component unmounts
    return () => {
      // No need to unsubscribe as the useEffect will clean up automatically
    };
  }, []);

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  // Get status badge color
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  // Format agent name for display
  const formatAgentName = (agentName: string) => {
    return agentName
      .replace('-agent', '')
      .replace(/-/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold">Processing Queue</h2>
          <p className="text-sm text-slate-500">
            {queueItems.filter(item => item.status === 'pending').length} pending, 
            {queueItems.filter(item => item.status === 'processing').length} processing, 
            {queueItems.filter(item => item.status === 'completed').length} completed, 
            {queueItems.filter(item => item.status === 'failed').length} failed
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchQueueItems} 
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button 
            variant="default" 
            size="sm" 
            onClick={processNextItem} 
            disabled={isProcessing || queueItems.filter(item => item.status === 'pending').length === 0}
          >
            <Play className="h-4 w-4 mr-2" />
            Process Next
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-slate-500">Loading queue items...</p>
        </div>
      ) : queueItems.length === 0 ? (
        <div className="text-center py-8 border rounded-lg bg-slate-50">
          <p className="text-slate-500">No queue items found</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Agent</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Entry ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Created</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Attempts</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {queueItems.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadgeClass(item.status)}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {formatAgentName(item.agentName)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">
                    <a 
                      href={`/entries/${item.entryId}`} 
                      className="text-blue-600 hover:underline"
                    >
                      {item.entryId.substring(0, 8)}...
                    </a>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    {formatDate(item.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                    {item.attempts}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {item.status === 'failed' && (
                      <div className="flex items-center text-red-600">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        <span className="truncate max-w-[150px]" title={item.error}>
                          {item.error}
                        </span>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
