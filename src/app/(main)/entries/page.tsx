"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  CalendarDays, 
  Globe, 
  Building,
  FileText, 
  Search, 
  Link as LinkIcon,
  ExternalLink,
  Tag
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";

// Define the Entry type from API
type EntryType = "article" | "company" | "note";

// API response type
interface Entry {
  id: string;
  type: string;
  title: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  article?: {
    id: string;
    url?: string;
    author?: string;
    publishedAt?: string;
    content?: string;
    imageUrl?: string;
  } | null;
  company?: {
    id: string;
    website?: string;
    industry?: string;
    founded?: number;
    location?: string;
    employeeCount?: number;
    funding?: any;
    fundingRound?: string;
    companyStage?: string;
    keyPeople?: string;
    competitors?: string;
    productOffering?: string;
  } | null;
  note?: {
    id: string;
    content?: string;
    category?: string;
  } | null;
  tags?: { id: string; name: string }[];
}

// Processed entry for the UI
interface ProcessedEntry {
  id: string;
  type: EntryType;
  title: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  url?: string;
  author?: string;
  publishedAt?: string;
  imageUrl?: string;
  content?: string;
  website?: string;
  industry?: string;
  location?: string;
  category?: string;
}

// Define a skeleton component directly rather than importing
function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`animate-pulse rounded-md bg-gray-200 ${className}`}
      {...props}
    />
  );
}

export default function EntriesPage() {
  const { user, isLoaded } = useUser();
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [entries, setEntries] = useState<ProcessedEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<ProcessedEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState("newest");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);

  // Fetch entries
  useEffect(() => {
    const fetchEntries = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/entries');
        if (!response.ok) {
          throw new Error('Failed to fetch entries');
        }
        const data = await response.json();
        
        if (!data.entries || !Array.isArray(data.entries)) {
          console.error('Invalid response format:', data);
          throw new Error('Invalid API response format');
        }
        
        // Process the entries to flatten the data structure for easier usage
        const processedEntries = data.entries.map((entry: Entry) => {
          // Extract properties from related entities
          const url = entry.article?.url;
          const author = entry.article?.author;
          const publishedAt = entry.article?.publishedAt;
          const imageUrl = entry.article?.imageUrl;
          const content = entry.article?.content || entry.note?.content;
          const website = entry.company?.website;
          const industry = entry.company?.industry;
          const location = entry.company?.location;
          const category = entry.note?.category;
          
          // Transform tags array
          const tags = entry.tags?.map((tag: { id: string; name: string }) => tag.name) || [];
          
          return {
            id: entry.id,
            type: entry.type.toLowerCase() as EntryType,
            title: entry.title,
            description: entry.description,
            createdAt: entry.createdAt,
            updatedAt: entry.updatedAt,
            tags,
            // Type-specific fields
            url,
            author,
            publishedAt,
            imageUrl,
            content,
            website,
            industry,
            location,
            category
          };
        });
        
        setEntries(processedEntries);

        // Extract all unique tags
        const tags = processedEntries.reduce((acc: string[], entry: ProcessedEntry) => {
          if (entry.tags && entry.tags.length > 0) {
            return [...acc, ...entry.tags.filter((tag: string) => !acc.includes(tag))];
          }
          return acc;
        }, []);
        setAllTags(tags);
      } catch (error) {
        console.error('Error fetching entries:', error);
        toast({
          title: "Error",
          description: "Failed to load entries. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (isLoaded && user) {
      fetchEntries();
    }
  }, [isLoaded, user]);

  // Filter and sort entries based on active tab, search query, and selected tags
  useEffect(() => {
    if (!entries.length) {
      setFilteredEntries([]);
      return;
    }

    let filtered = [...entries];
    
    // Filter by type
    if (activeTab !== "all") {
      filtered = filtered.filter((entry) => entry.type === activeTab);
    }
    
    // Filter by search query
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (entry) => 
          entry.title.toLowerCase().includes(query) || 
          (entry.description && entry.description.toLowerCase().includes(query)) ||
          (entry.content && entry.content.toLowerCase().includes(query)) ||
          (entry.author && entry.author.toLowerCase().includes(query)) ||
          (entry.industry && entry.industry.toLowerCase().includes(query)) ||
          (entry.location && entry.location.toLowerCase().includes(query)) ||
          (entry.tags && entry.tags.some(tag => tag.toLowerCase().includes(query)))
      );
    }

    // Filter by selected tags
    if (selectedTags.length > 0) {
      filtered = filtered.filter(
        (entry) => entry.tags && 
          selectedTags.some(tag => entry.tags?.includes(tag))
      );
    }
    
    // Sort entries
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "oldest":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case "updated":
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        case "alphabetical":
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });
    
    setFilteredEntries(filtered);
  }, [activeTab, searchQuery, entries, sortBy, selectedTags]);

  // Handle tag selection
  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag) 
        : [...prev, tag]
    );
  };

  if (!isLoaded) {
    return <div className="py-8 text-center">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">My Entries</h1>
        <Button asChild>
          <Link href="/entries/new">Add New Entry</Link>
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center w-full pb-4">
        <div className="relative flex-grow">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search entries..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 items-center">
          <span className="text-sm text-gray-500">Sort:</span>
          <Select
            value={sortBy}
            onValueChange={setSortBy}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="oldest">Oldest</SelectItem>
              <SelectItem value="updated">Recently Updated</SelectItem>
              <SelectItem value="alphabetical">Alphabetical</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          <span className="flex items-center text-sm text-gray-500 mr-1">
            <Tag className="h-3.5 w-3.5 mr-1" />
            Tags:
          </span>
          {allTags.map(tag => (
            <Badge 
              key={tag} 
              variant={selectedTags.includes(tag) ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => toggleTag(tag)}
            >
              {tag}
            </Badge>
          ))}
          {selectedTags.length > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setSelectedTags([])}
              className="h-6 px-2 text-xs"
            >
              Clear
            </Button>
          )}
        </div>
      )}

      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="all">All Entries</TabsTrigger>
          <TabsTrigger value="article" className="flex items-center gap-1">
            <Globe className="h-4 w-4" />
            Articles
          </TabsTrigger>
          <TabsTrigger value="company" className="flex items-center gap-1">
            <Building className="h-4 w-4" />
            Companies
          </TabsTrigger>
          <TabsTrigger value="note" className="flex items-center gap-1">
            <FileText className="h-4 w-4" />
            Notes
          </TabsTrigger>
        </TabsList>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <Card key={n} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <Skeleton className="h-6 w-24 mb-2" />
                  <Skeleton className="h-5 w-full" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-3/4" />
                </CardContent>
                <CardFooter>
                  <Skeleton className="h-4 w-32" />
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <>
            <TabsContent value="all" className="mt-0">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredEntries.map((entry) => (
                  <EntryCard key={entry.id} entry={entry} />
                ))}
              </div>
              {filteredEntries.length === 0 && (
                <div className="py-12 text-center">
                  <p className="text-gray-500 mb-4">No entries found. Try adjusting your filters or add new entries.</p>
                  <Button asChild>
                    <Link href="/entries/new">Add New Entry</Link>
                  </Button>
                </div>
              )}
            </TabsContent>
            
            {["article", "company", "note"].map((type) => (
              <TabsContent key={type} value={type} className="mt-0">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredEntries.map((entry) => (
                    <EntryCard key={entry.id} entry={entry} />
                  ))}
                </div>
                {filteredEntries.length === 0 && (
                  <div className="py-12 text-center">
                    <p className="text-gray-500 mb-4">No {type}s found. Try adjusting your search or add a new {type}.</p>
                    <Button asChild>
                      <Link href={`/entries/new?type=${type}`}>Add New {type.charAt(0).toUpperCase() + type.slice(1)}</Link>
                    </Button>
                  </div>
                )}
              </TabsContent>
            ))}
          </>
        )}
      </Tabs>
    </div>
  );
}

function EntryCard({ entry }: { entry: ProcessedEntry }) {
  // Helper to get icon based on entry type
  const getTypeIcon = (type: EntryType) => {
    switch (type) {
      case "article":
        return <Globe className="h-4 w-4" />;
      case "company":
        return <Building className="h-4 w-4" />;
      case "note":
        return <FileText className="h-4 w-4" />;
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  };

  return (
    <Card className="overflow-hidden flex flex-col transition-all hover:shadow-md">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between mb-1.5">
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
            {getTypeIcon(entry.type)}
            <span className="capitalize">{entry.type}</span>
          </span>
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <CalendarDays className="h-3 w-3" />
            {formatDate(entry.createdAt)}
          </div>
        </div>
        <Link 
          href={`/entries/${entry.id}`} 
          className="hover:underline"
        >
          <CardTitle className="text-lg">{entry.title}</CardTitle>
        </Link>
      </CardHeader>
      <CardContent className="pb-2 flex-grow">
        {entry.description && (
          <p className="text-gray-600 text-sm line-clamp-2 mb-2">
            {entry.description}
          </p>
        )}
        {entry.tags && entry.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {entry.tags.map((tag, i) => (
              <span
                key={i}
                className="text-xs bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </CardContent>
      <CardFooter className="pt-2 text-sm flex justify-between items-center">
        <div>
          {(entry.type === "article" && entry.url) && (
            <a
              href={entry.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
            >
              <ExternalLink className="h-3 w-3" />
              View Article
            </a>
          )}
          {(entry.type === "company" && entry.website) && (
            <a
              href={entry.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
            >
              <ExternalLink className="h-3 w-3" />
              Visit Website
            </a>
          )}
        </div>
        <Link
          href={`/entries/${entry.id}`}
          className="text-gray-600 hover:text-gray-900"
        >
          Details →
        </Link>
      </CardFooter>
    </Card>
  );
}
