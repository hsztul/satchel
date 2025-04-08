"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import Link from "next/link";
import { Entry, Comment } from "@/types";
import { EntryProcessingStatus } from "@/components/EntryProcessingStatus";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth, useUser } from "@clerk/nextjs";
import { UserButton } from "@clerk/nextjs";
import { Skeleton } from "@/components/ui/skeleton";

interface EntryClientPageProps {
  id: string;
  initialEntry: Entry;
}

interface CommentItemProps {
  comment: Comment;
  onDelete: (id: string) => Promise<void>;
  onUpdate: (id: string, text: string) => Promise<void>;
}

// Comment item component
function CommentItem({ comment, onDelete, onUpdate }: CommentItemProps) {
  const { user: currentUser } = useUser();
  const [userName, setUserName] = useState<string>('User');
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.text);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Safely handle potentially undefined createdAt
  const dateDisplay = comment.createdAt ? new Date(comment.createdAt).toLocaleString() : 'Unknown date';
  
  // Determine if this comment is from the current user
  const isCurrentUser = currentUser?.id === comment.userId;
  
  useEffect(() => {
    // If it's the current user, use their name
    if (isCurrentUser && currentUser) {
      const name = currentUser.firstName || currentUser.username || 'You';
      setUserName(name);
    } else if (comment.userId) {
      // For other users, we could potentially fetch their info from a users table
      // For now, just show a generic name
      setUserName('User');
    } else {
      setUserName('Anonymous');
    }
  }, [comment.userId, currentUser, isCurrentUser]);
  
  // Reset edit text when comment changes
  useEffect(() => {
    setEditText(comment.text);
  }, [comment.text]);
  
  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await onDelete(comment.id);
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast({
        title: "Error",
        description: "Failed to delete comment.",
        variant: "destructive"
      });
      setIsDeleting(false);
    }
  };
  
  const handleUpdate = async () => {
    if (!editText.trim() || editText === comment.text) {
      setIsEditing(false);
      return;
    }
    
    try {
      setIsSaving(true);
      await onUpdate(comment.id, editText);
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating comment:', error);
      toast({
        title: "Error",
        description: "Failed to update comment.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleCancel = () => {
    setEditText(comment.text);
    setIsEditing(false);
  };
  
  return (
    <div className="border-b border-slate-200 py-3 last:border-0">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          {isCurrentUser && <span className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">You</span>}
          <p className="text-sm font-medium">{userName}</p>
        </div>
        <div className="flex items-center gap-2">
          {isCurrentUser && !isEditing && (
            <div className="flex gap-2">
              <button 
                onClick={() => setIsEditing(true)} 
                className="text-xs text-slate-500 hover:text-slate-700"
                aria-label="Edit comment"
              >
                Edit
              </button>
              <button 
                onClick={handleDelete} 
                className="text-xs text-red-500 hover:text-red-700"
                disabled={isDeleting}
                aria-label="Delete comment"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          )}
          <p className="text-xs text-slate-500">{dateDisplay}</p>
        </div>
      </div>
      
      {isEditing ? (
        <div className="space-y-2">
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            className="w-full border rounded-md px-3 py-2 text-sm"
            rows={2}
            disabled={isSaving}
          />
          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleCancel}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button 
              size="sm" 
              onClick={handleUpdate}
              disabled={!editText.trim() || editText === comment.text || isSaving}
              className="bg-slate-900 hover:bg-slate-800"
            >
              {isSaving ? (
                <>
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </Button>
          </div>
        </div>
      ) : (
        <p>{comment.text}</p>
      )}
    </div>
  );
}

export function EntryClientPage({ id, initialEntry }: EntryClientPageProps) {
  const router = useRouter();
  const { userId } = useAuth();
  const [entry, setEntry] = useState<Entry>(initialEntry);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0); // Used to force refresh of child components
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  
  // Comments state
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [commentActionLoading, setCommentActionLoading] = useState(false);

  // Debug log for initial entry
  useEffect(() => {
    console.log('Initial entry:', {
      id: initialEntry.id,
      state: initialEntry.processingState,
      progress: initialEntry.processingProgress,
      metadata: initialEntry.metadata
    });
  }, [initialEntry]);
  
  // Fetch comments for the entry
  useEffect(() => {
    const fetchComments = async () => {
      try {
        const { commentsApi } = await import('@/lib/supabase/client');
        const fetchedComments = await commentsApi.getComments(id);
        setComments(fetchedComments);
      } catch (error) {
        console.error('Error fetching comments:', error);
        toast({
          title: "Error",
          description: "Failed to load comments.",
          variant: "destructive"
        });
      }
    };
    
    fetchComments();
  }, [id]);

  // Set up polling for entry updates
  useEffect(() => {
    // Always poll initially, regardless of state
    const pollEntry = async () => {
      try {
        const { entriesApi } = await import('@/lib/supabase/client');
        const updatedEntry = await entriesApi.getEntry(id);
        
        // Debug log for updated entry
        console.log('Polled entry:', {
          id: updatedEntry.id,
          state: updatedEntry.processingState,
          progress: updatedEntry.processingProgress,
          hasSummary: !!updatedEntry.metadata?.summary,
          hasKeyPoints: Array.isArray(updatedEntry.metadata?.keyPoints) && updatedEntry.metadata.keyPoints.length > 0
        });
        
        // Only update if there's a real change
        if (JSON.stringify(updatedEntry) !== JSON.stringify(entry)) {
          console.log('Entry updated - setting new state');
          setEntry(updatedEntry);
          setRefreshKey(prev => prev + 1); // Force refresh of child components
        }
      } catch (error) {
        console.error('Error polling entry:', error);
      }
    };
    
    // Poll immediately once
    pollEntry();
    
    // Continue polling if not completed
    let pollInterval: NodeJS.Timeout | null = null;
    if (entry.processingState !== "completed" && entry.processingState !== "failed") {
      pollInterval = setInterval(pollEntry, 3000);
    }

    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [entry, id]);

  // Manual refresh function
  const handleRefresh = async () => {
    try {
      setLoading(true);
      const { entriesApi } = await import('@/lib/supabase/client');
      const updatedEntry = await entriesApi.getEntry(id);
      
      console.log('Manual refresh - entry data:', {
        id: updatedEntry.id,
        state: updatedEntry.processingState,
        progress: updatedEntry.processingProgress,
        hasSummary: !!updatedEntry.metadata?.summary,
        hasKeyPoints: Array.isArray(updatedEntry.metadata?.keyPoints) && updatedEntry.metadata.keyPoints.length > 0,
        metadata: updatedEntry.metadata
      });
      
      setEntry(updatedEntry);
      setRefreshKey(prev => prev + 1);
      setLoading(false);
    } catch (error) {
      console.error('Error refreshing entry:', error);
      setLoading(false);
    }
  };

  // Add comment function
  const handleAddComment = async () => {
    if (!commentText.trim() || !userId) return;
    
    try {
      setCommentLoading(true);
      const { commentsApi } = await import('@/lib/supabase/client');
      const newComment = await commentsApi.addComment(userId, id, commentText);
      
      // Add the new comment to the state
      setComments(prev => [...prev, newComment]);
      setCommentText(''); // Clear the input
      
      toast({
        title: "Comment added",
        description: "Your comment has been added successfully.",
      });
    } catch (error) {
      console.error('Error adding comment:', error);
      toast({
        title: "Error",
        description: "Failed to add comment.",
        variant: "destructive"
      });
    } finally {
      setCommentLoading(false);
    }
  };
  
  // Delete comment function
  const handleDeleteComment = async (commentId: string) => {
    try {
      setCommentActionLoading(true);
      const { commentsApi } = await import('@/lib/supabase/client');
      await commentsApi.deleteComment(commentId);
      
      // Remove the comment from the state
      setComments(prev => prev.filter(comment => comment.id !== commentId));
      
      toast({
        title: "Comment deleted",
        description: "Your comment has been deleted successfully.",
      });
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast({
        title: "Error",
        description: "Failed to delete comment.",
        variant: "destructive"
      });
      throw error; // Re-throw to handle in the component
    } finally {
      setCommentActionLoading(false);
    }
  };
  
  // Update comment function
  const handleUpdateComment = async (commentId: string, text: string) => {
    try {
      setCommentActionLoading(true);
      const { commentsApi } = await import('@/lib/supabase/client');
      
      // First, find the comment to get its userId
      const commentToUpdate = comments.find(c => c.id === commentId);
      if (!commentToUpdate || commentToUpdate.userId !== userId) {
        throw new Error("Cannot update comment: not found or not authorized");
      }
      
      // Call the API to update the comment
      const updatedComment = await commentsApi.updateComment(commentId, text);
      
      // Update the comment in the state
      setComments(prev => prev.map(comment => 
        comment.id === commentId ? updatedComment : comment
      ));
      
      toast({
        title: "Comment updated",
        description: "Your comment has been updated successfully.",
      });
    } catch (error) {
      console.error('Error updating comment:', error);
      toast({
        title: "Error",
        description: "Failed to update comment.",
        variant: "destructive"
      });
      throw error; // Re-throw to handle in the component
    } finally {
      setCommentActionLoading(false);
    }
  };
  
  // Delete entry function
  const handleDelete = async () => {
    try {
      setDeleteLoading(true);
      const { entriesApi } = await import('@/lib/supabase/client');
      await entriesApi.deleteEntry(id);
      
      // Show success toast
      toast({
        title: "Entry deleted",
        description: "The entry has been successfully deleted.",
      });
      
      // Close dialog and redirect to entries page
      setDeleteDialogOpen(false);
      router.push('/entries');
    } catch (error) {
      console.error('Error deleting entry:', error);
      
      // Show error toast
      toast({
        title: "Error",
        description: "Failed to delete the entry. Please try again.",
        variant: "destructive",
      });
      
      setDeleteLoading(false);
      setDeleteDialogOpen(false);
    }
  };

  // Helper function to determine if content is loading
  const isLoading = entry.processingState === "processing" || entry.processingState === "started";

  // Helper function to render company section with loading state
  const renderCompanySection = (title: string, content: React.ReactNode) => (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : (
          content
        )}
      </CardContent>
    </Card>
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <Link 
            href="/entries" 
            className="text-sm text-slate-500 hover:text-slate-700 mb-2 inline-block"
          >
            ← Back to entries
          </Link>
          <h1 className="text-2xl font-bold">{entry.type === 'company' ? entry.metadata.name : (entry.metadata.title || "Untitled Entry")}</h1>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-1"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-slate-300 border-t-transparent rounded-full animate-spin mr-1"></div>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
            Refresh
          </Button>
          <Link href={`/entries/${entry.id}/edit`}>
            <Button variant="outline">Edit</Button>
          </Link>
          <Button 
            variant="outline" 
            className="text-red-500 hover:text-red-700 hover:bg-red-50"
            onClick={() => setDeleteDialogOpen(true)}
          >
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Company Information Section */}
          {entry.type === "company" && (
            <>
              {/* Main Company Info */}
              <Card>
                <CardHeader>
                  <CardTitle>{entry.metadata.industry ? "Company Details" : "Details"}</CardTitle>
                  {entry.metadata.industry && (
                    <CardDescription>{entry.metadata.industry}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  {!isLoading && entry.metadata.description && (
                    <div>
                      <h3 className="font-semibold mb-2">Description</h3>
                      <p className="text-sm text-muted-foreground">{entry.metadata.description}</p>
                    </div>
                  )}
                  {isLoading && (
                    <div className="space-y-3">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-4 w-2/3" />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Products and Competition */}
              <Card>
                <CardHeader>
                  <CardTitle>Products & Competition</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {!isLoading ? (
                    <>
                      {/* Key Products */}
                      {entry.metadata.keyProducts && entry.metadata.keyProducts.length > 0 && (
                        <div>
                          <h3 className="font-semibold mb-2">Key Products & Services</h3>
                          <ul className="list-disc pl-5 space-y-1">
                            {entry.metadata.keyProducts.map((product: string, index: number) => (
                              <li key={index} className="text-sm text-muted-foreground">{product}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Competitors */}
                      {entry.metadata.competitors && entry.metadata.competitors.length > 0 && (
                        <div>
                          <h3 className="font-semibold mb-2">Key Competitors</h3>
                          <ul className="list-disc pl-5 space-y-1">
                            {entry.metadata.competitors.map((competitor: string, index: number) => (
                              <li key={index} className="text-sm text-muted-foreground">{competitor}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Market Position */}
                      {entry.metadata.marketPosition && (
                        <div>
                          <h3 className="font-semibold mb-2">Market Position</h3>
                          <p className="text-sm text-muted-foreground">{entry.metadata.marketPosition}</p>
                        </div>
                      )}

                      {/* Market Strategy */}
                      {entry.metadata.marketStrategy && (
                        <div>
                          <h3 className="font-semibold mb-2">Market Strategy</h3>
                          <p className="text-sm text-muted-foreground">{entry.metadata.marketStrategy}</p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="space-y-3">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-4 w-2/3" />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Technology and Innovation */}
              <Card>
                <CardHeader>
                  <CardTitle>Technology & Innovation</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {!isLoading ? (
                    <>
                      {/* Core Technology */}
                      {entry.metadata.coreTechnology && (
                        <div>
                          <h3 className="font-semibold mb-2">Core Technology</h3>
                          <p className="text-sm text-muted-foreground">{entry.metadata.coreTechnology}</p>
                        </div>
                      )}

                      {/* Competitive Edge */}
                      {entry.metadata.competitiveEdge && (
                        <div>
                          <h3 className="font-semibold mb-2">Competitive Edge</h3>
                          <p className="text-sm text-muted-foreground">{entry.metadata.competitiveEdge}</p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="space-y-3">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-4 w-2/3" />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Leadership and Funding */}
              <Card>
                <CardHeader>
                  <CardTitle>Leadership & Funding</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {!isLoading ? (
                    <>
                      {/* Leadership */}
                      {entry.metadata.leadership && (
                        <div>
                          <h3 className="font-semibold mb-2">Leadership Team</h3>
                          <p className="text-sm text-muted-foreground">{entry.metadata.leadership}</p>
                        </div>
                      )}

                      {/* Funding History */}
                      {entry.metadata.fundingHistory && (
                        <div>
                          <h3 className="font-semibold mb-2">Funding History</h3>
                          <p className="text-sm text-muted-foreground">{entry.metadata.fundingHistory}</p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="space-y-3">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-4 w-2/3" />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Sources */}
              {entry.metadata.sources && entry.metadata.sources.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Sources</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="list-disc pl-5 space-y-1">
                      {entry.metadata.sources.map((source: string, index: number) => (
                        <li key={index}>
                          <a 
                            href={source} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-sm text-blue-600 hover:underline break-all"
                          >
                            {source}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {entry.type === "note" && entry.metadata?.text ? (
            <Card>
              <CardHeader>
                <CardTitle>Note</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-line">{entry.metadata.text}</p>
              </CardContent>
            </Card>
          ) : entry.type !== "company" && entry.metadata?.summary ? (
            <Card>
              <CardHeader>
                <CardTitle>Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <p>{entry.metadata.summary}</p>
              </CardContent>
            </Card>
          ) : entry.type !== "company" && (
            <Card className={`${entry.processingState === "completed" ? "border-yellow-200" : "bg-slate-50 border border-slate-200"}`}>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <span>Summary</span>
                  {entry.processingState !== "completed" && (
                    <div className="ml-2 w-4 h-4 rounded-full border-2 border-slate-300 border-t-transparent animate-spin"></div>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-20 flex items-center justify-center">
                  {entry.processingState === "completed" ? (
                    <div className="text-center">
                      <p className="text-slate-500 mb-2">No summary available.</p>
                      <button 
                        onClick={handleRefresh} 
                        className="text-blue-500 text-sm hover:underline flex items-center mx-auto"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Refresh content
                      </button>
                    </div>
                  ) : (
                    <p className="text-slate-500">Processing article content... {entry.processingProgress ? `(${entry.processingProgress}%)` : ''}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {entry.type === "article" && Array.isArray(entry.metadata?.keyPoints) && entry.metadata.keyPoints.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Key Points</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc pl-5 space-y-2">
                  {entry.metadata.keyPoints?.map((point: string, index: number) => (
                    <li key={index}>{point}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : entry.type === "article" && (
            <Card className={`${entry.processingState === "completed" ? "border-yellow-200" : "bg-slate-50 border border-slate-200"}`}>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <span>Key Points</span>
                  {entry.processingState !== "completed" && (
                    <div className="ml-2 w-4 h-4 rounded-full border-2 border-slate-300 border-t-transparent animate-spin"></div>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-16 flex items-center justify-center">
                  {entry.processingState === "completed" ? (
                    <div className="text-center">
                      <p className="text-slate-500 mb-2">No key points available.</p>
                      <button 
                        onClick={handleRefresh} 
                        className="text-blue-500 text-sm hover:underline flex items-center mx-auto"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Refresh content
                      </button>
                    </div>
                  ) : (
                    <p className="text-slate-500">Extracting key points...</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Comments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {comments.length > 0 ? (
                  <div className="space-y-1">
                    {comments.map(comment => (
                      <CommentItem 
                        key={comment.id} 
                        comment={comment} 
                        onDelete={handleDeleteComment}
                        onUpdate={handleUpdateComment}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 italic">No comments yet</p>
                )}
                
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Add a comment..." 
                    className="flex-1 border rounded-md px-3 py-2"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleAddComment();
                      }
                    }}
                    disabled={commentLoading}
                  />
                  <Button 
                    className="bg-slate-900 hover:bg-slate-800"
                    onClick={handleAddComment}
                    disabled={!commentText.trim() || commentLoading}
                  >
                    {commentLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        Adding...
                      </>
                    ) : (
                      "Add"
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-slate-500">Type</p>
                  <p className="capitalize">{entry.type}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Status</p>
                  {entry.type === "company" && (entry.processingState === "processing" || entry.processingState === "started") ? (
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <div className="w-4 h-4 border-2 border-slate-300 border-t-transparent rounded-full animate-spin"></div>
                      Processing... {entry.processingProgress ? `(${entry.processingProgress}%)` : ''}
                    </div>
                  ) : (
                    <EntryProcessingStatus key={refreshKey} initialEntry={entry} />
                  )}
                </div>
                {entry.url && (
                  <div>
                    <p className="text-sm text-slate-500">URL</p>
                    <a 
                      href={entry.url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-blue-600 hover:underline break-all"
                    >
                      {entry.url}
                    </a>
                  </div>
                )}
                <div>
                  <p className="text-sm text-slate-500">Created</p>
                  <p>{new Date(entry.createdAt).toLocaleDateString()}</p>
                </div>
                {/* Company-specific details */}
                {entry.type === "company" && (
                  <>
                    {(entry.processingState === "processing" || entry.processingState === "started") ? (
                      // Skeleton loaders for company details
                      <>
                        <div>
                          <p className="text-sm text-slate-500">Founded</p>
                          <Skeleton className="h-5 w-20 mt-1" />
                        </div>
                        <div>
                          <p className="text-sm text-slate-500">Headquarters</p>
                          <Skeleton className="h-5 w-32 mt-1" />
                        </div>
                        <div>
                          <p className="text-sm text-slate-500">Employees</p>
                          <Skeleton className="h-5 w-24 mt-1" />
                        </div>
                        <div>
                          <p className="text-sm text-slate-500">Revenue Range</p>
                          <Skeleton className="h-5 w-28 mt-1" />
                        </div>
                        <div>
                          <p className="text-sm text-slate-500">Industry</p>
                          <Skeleton className="h-5 w-36 mt-1" />
                        </div>
                      </>
                    ) : (
                      <>
                        {entry.metadata.founded && (
                          <div>
                            <p className="text-sm text-slate-500">Founded</p>
                            <p>{entry.metadata.founded}</p>
                          </div>
                        )}
                        {entry.metadata.headquarters && (
                          <div>
                            <p className="text-sm text-slate-500">Headquarters</p>
                            <p>{entry.metadata.headquarters}</p>
                          </div>
                        )}
                        {entry.metadata.employeeCount && (
                          <div>
                            <p className="text-sm text-slate-500">Employees</p>
                            <p>{entry.metadata.employeeCount}</p>
                          </div>
                        )}
                        {entry.metadata.revenueRange && (
                          <div>
                            <p className="text-sm text-slate-500">Revenue Range</p>
                            <p>{entry.metadata.revenueRange}</p>
                          </div>
                        )}
                        {entry.metadata.industry && (
                          <div>
                            <p className="text-sm text-slate-500">Industry</p>
                            <p>{entry.metadata.industry}</p>
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}
                {entry.type === "article" && entry.metadata.author && (
                  <div>
                    <p className="text-sm text-slate-500">Author</p>
                    <p>{entry.metadata.author}</p>
                  </div>
                )}
                {entry.type === "article" && entry.metadata.publishedDate && (
                  <div>
                    <p className="text-sm text-slate-500">Published</p>
                    <p>{entry.metadata.publishedDate}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Related Entries</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-500 italic">No related entries found</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Entry</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this entry? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleteLoading}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              disabled={deleteLoading}
              className="ml-2"
            >
              {deleteLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
