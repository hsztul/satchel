"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Globe, FileText, Building, CalendarDays, MapPin, Users, DollarSign, Tag } from "lucide-react";

// Entry type definition
export type EntryType = "article" | "company" | "note";

// Base schema for all entry types
const baseSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters"),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

// Type-specific schemas
const articleSchema = baseSchema.extend({
  type: z.literal("article"),
  url: z.string().url("Please enter a valid URL"),
  author: z.string().optional(),
  publishedAt: z.string().optional(),
  content: z.string().optional(),
  imageUrl: z.string().url("Please enter a valid image URL").optional().or(z.literal("")),
});

const companySchema = baseSchema.extend({
  type: z.literal("company"),
  website: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
  industry: z.string().optional(),
  founded: z.number().int().optional(),
  location: z.string().optional(),
  employeeCount: z.number().int().optional(),
  funding: z.number().optional(),
  fundingRound: z.string().optional(),
  companyStage: z.string().optional(),
  keyPeople: z.array(z.string()).optional(),
  competitors: z.array(z.string()).optional(),
  productOffering: z.string().optional(),
});

const noteSchema = baseSchema.extend({
  type: z.literal("note"),
  content: z.string().min(5, "Note content must be at least 5 characters"),
  category: z.string().optional(),
});

// Combined schema for form validation
const formSchema = z.discriminatedUnion("type", [
  articleSchema,
  companySchema,
  noteSchema,
]);

interface EntryFormProps {
  initialType?: EntryType;
}

export default function EntryForm({ initialType = "article" }: EntryFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<EntryType>(initialType as EntryType);
  const [tagsInput, setTagsInput] = useState("");
  
  // Form setup with default values
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: activeTab as EntryType,
      title: "",
      description: "",
      tags: [],
      url: activeTab === "article" ? "" : undefined,
      content: ""
    },
  });

  // Update form when tab/type changes
  const handleTypeChange = (value: string) => {
    const newType = value as EntryType;
    setActiveTab(newType);
    
    // Create appropriate default values based on entry type
    if (newType === "article") {
      form.reset({
        type: "article",
        title: "",
        description: "",
        tags: [],
        url: "",
        author: "",
        publishedAt: "",
        content: "",
        imageUrl: ""
      });
    } else if (newType === "company") {
      form.reset({
        type: "company",
        title: "",
        description: "",
        tags: [],
        website: "",
        industry: "",
        location: "",
        productOffering: ""
      });
    } else if (newType === "note") {
      form.reset({
        type: "note",
        title: "",
        description: "",
        tags: [],
        content: "",
        category: ""
      });
    }
  };

  // Handler for adding tags
  const handleAddTag = () => {
    if (tagsInput.trim()) {
      const currentTags = form.getValues("tags") || [];
      form.setValue("tags", [...currentTags, tagsInput.trim()]);
      setTagsInput("");
    }
  };

  // Handler for removing tags
  const handleRemoveTag = (index: number) => {
    const currentTags = form.getValues("tags") || [];
    form.setValue("tags", currentTags.filter((_, i) => i !== index));
  };

  // Handle key press in tags input
  const handleTagsKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddTag();
    }
  };

  // Form submission handler
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    
    try {
      // Send data to the API
      const response = await fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create entry");
      }

      toast({
        title: "Success",
        description: "Entry created successfully",
      });
      
      router.push("/entries");
      router.refresh();
    } catch (error) {
      console.error("Error creating entry:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create entry",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Add New Entry</h1>
        <p className="text-gray-500 mt-2">
          Create a new entry to store an article, company, or note in your Satchel.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTypeChange}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="article" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Article
          </TabsTrigger>
          <TabsTrigger value="company" className="flex items-center gap-2">
            <Building className="h-4 w-4" />
            Company
          </TabsTrigger>
          <TabsTrigger value="note" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Note
          </TabsTrigger>
        </TabsList>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 mt-6">
            {/* Common fields for all entry types */}
            <div className="space-y-4">
              {/* Title Field */}
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter a title" {...field} />
                    </FormControl>
                    <FormDescription>
                      Give your entry a descriptive title
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Description Field */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Brief description" 
                        {...field} 
                        value={field.value || ""}
                        className="min-h-[80px]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Tags Field */}
              <div className="space-y-2">
                <Label>Tags</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {form.watch("tags")?.map((tag, index) => (
                    <div key={index} className="flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm">
                      {tag}
                      <button 
                        type="button" 
                        onClick={() => handleRemoveTag(index)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input 
                    placeholder="Add tags (comma or enter to add)" 
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    onKeyDown={handleTagsKeyPress}
                  />
                  <Button type="button" size="sm" onClick={handleAddTag}>
                    Add
                  </Button>
                </div>
                <FormDescription>
                  Add tags to help categorize your entry
                </FormDescription>
              </div>
            </div>

            {/* Article-specific fields */}
            <TabsContent value="article" className="mt-0 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Article Details</CardTitle>
                  <CardDescription>
                    Add information about the article you want to save
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* URL Field */}
                  <FormField
                    control={form.control}
                    name="url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>URL</FormLabel>
                        <FormControl>
                          <Input placeholder="https://example.com/article" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Author Field */}
                    <FormField
                      control={form.control}
                      name="author"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Author</FormLabel>
                          <FormControl>
                            <Input placeholder="Article author" {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Published Date Field */}
                    <FormField
                      control={form.control}
                      name="publishedAt"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Published Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Content Field */}
                  <FormField
                    control={form.control}
                    name="content"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Content</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Article content or your notes about it" 
                            {...field} 
                            value={field.value || ""}
                            className="min-h-[200px]"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Image URL Field */}
                  <FormField
                    control={form.control}
                    name="imageUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Image URL</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="https://example.com/image.jpg" 
                            {...field} 
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Company-specific fields */}
            <TabsContent value="company" className="mt-0 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Company Details</CardTitle>
                  <CardDescription>
                    Add information about the company you want to track
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Website Field */}
                  <FormField
                    control={form.control}
                    name="website"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Website</FormLabel>
                        <FormControl>
                          <Input placeholder="https://example.com" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Industry Field */}
                    <FormField
                      control={form.control}
                      name="industry"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Industry</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Technology, Healthcare" {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Founded Field */}
                    <FormField
                      control={form.control}
                      name="founded"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Founded</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="e.g. 2020" 
                              {...field} 
                              value={field.value || ""}
                              onChange={(e) => {
                                const value = e.target.value ? parseInt(e.target.value) : undefined;
                                field.onChange(value);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Location Field */}
                    <FormField
                      control={form.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Location</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. San Francisco, CA" {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Employee Count Field */}
                    <FormField
                      control={form.control}
                      name="employeeCount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Employees</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="e.g. 50" 
                              {...field} 
                              value={field.value || ""}
                              onChange={(e) => {
                                const value = e.target.value ? parseInt(e.target.value) : undefined;
                                field.onChange(value);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Funding Field */}
                    <FormField
                      control={form.control}
                      name="funding"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Funding Amount</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="e.g. 2000000" 
                              {...field} 
                              value={field.value || ""}
                              onChange={(e) => {
                                const value = e.target.value ? parseFloat(e.target.value) : undefined;
                                field.onChange(value);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Funding Round Field */}
                    <FormField
                      control={form.control}
                      name="fundingRound"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Funding Round</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Seed, Series A" {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Company Stage Field */}
                  <FormField
                    control={form.control}
                    name="companyStage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Stage</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Startup, Growth" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Product Offering Field */}
                  <FormField
                    control={form.control}
                    name="productOffering"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Product Offering</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Description of the company's products or services" 
                            {...field} 
                            value={field.value || ""}
                            className="min-h-[100px]"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Note-specific fields */}
            <TabsContent value="note" className="mt-0 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Note Details</CardTitle>
                  <CardDescription>
                    Add your thoughts, ideas, or anything you want to remember
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Content Field */}
                  <FormField
                    control={form.control}
                    name="content"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Content</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Write your note here..." 
                            {...field} 
                            className="min-h-[300px]"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Category Field */}
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Idea, Todo, Reference" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <div className="flex justify-end gap-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => router.back()}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
              >
                {isSubmitting ? "Saving..." : "Save Entry"}
              </Button>
            </div>
          </form>
        </Form>
      </Tabs>
    </div>
  );
}
