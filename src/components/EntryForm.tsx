"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EntryType } from "@/types";

// Define the form schema with Zod
const formSchema = z.object({
  type: z.enum(["article", "company", "note"] as const),
  url: z.string().url().optional().or(z.literal("")),
  text: z.string().optional(),
  title: z.string().optional().or(z.literal(""))
});

type FormValues = z.infer<typeof formSchema>;

interface EntryFormProps {
  initialValues?: {
    type: EntryType;
    url?: string;
    text?: string;
    title?: string;
  };
  onSubmit?: (values: FormValues) => Promise<void>;
  isEditing?: boolean;
}

export function EntryForm({ 
  initialValues, 
  onSubmit: customSubmit, 
  isEditing = false 
}: EntryFormProps = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const typeFromUrl = searchParams.get('type') as EntryType | null;
  const [showTypeSelector] = useState<boolean>(!typeFromUrl && !initialValues?.type);
  
  // Initialize the form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: initialValues?.type || "article",
      url: initialValues?.url || "",
      text: initialValues?.text || "",
      title: initialValues?.title || "",
    },
  });

  useEffect(() => {
    if (typeFromUrl) {
      form.setValue('type', typeFromUrl);
    } else if (initialValues?.type) {
      form.setValue('type', initialValues.type);
    }
  }, [form.setValue, typeFromUrl, initialValues?.type, form]);

  // Handle form submission
  const onSubmit = async (values: FormValues) => {
    try {
      if (customSubmit) {
        // Use the custom submit handler if provided
        await customSubmit(values);
      } else {
        // Default behavior - make API call to create entry
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001';
        const response = await fetch(`${baseUrl}/api/entries`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(values),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create entry');
        }
        
        const data = await response.json();
        
        // Show success message
        toast.success(isEditing ? "Entry updated successfully!" : "Entry created successfully!");
        
        // Redirect to the entry detail page to show processing status
        router.push(`/entries/${data.entry.id}`);
      }
    } catch (error) {
      console.error(isEditing ? "Error updating entry:" : "Error creating entry:", error);
      toast.error(isEditing ? "Failed to update entry. Please try again." : "Failed to create entry. Please try again.");
    }
  };

  // Handle type selection
  const handleTypeSelect = (type: EntryType) => {
    form.setValue("type", type);
    
    // Update the URL to reflect the selected type
    if (!isEditing) {
      const url = new URL(window.location.href);
      url.searchParams.set('type', type);
      router.replace(url.pathname + url.search);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {isEditing ? 'Edit Entry' : `New ${form.watch('type').charAt(0).toUpperCase() + form.watch('type').slice(1)}`}
        </CardTitle>
        <CardDescription>
          {isEditing 
            ? 'Update this entry' 
            : form.watch('type') === 'article' 
              ? 'Add an article URL to analyze and summarize' 
              : form.watch('type') === 'company' 
                ? 'Add a company URL to research and profile' 
                : 'Create a personal note or thought'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Entry type selection - only shown if not pre-selected from URL */}
            {showTypeSelector && (
              <div className="space-y-2">
                <FormLabel>Entry Type</FormLabel>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <Button
                  type="button"
                  variant={form.watch('type') === "article" ? "default" : "outline"}
                  className={`justify-start h-auto py-3 px-4 border-2 ${
                    form.watch('type') === "article" 
                      ? "border-slate-900 bg-slate-900 text-white" 
                      : "border-slate-200 hover:border-slate-900 hover:bg-slate-50"
                  }`}
                  onClick={() => handleTypeSelect("article")}
                >
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Article</span>
                    <span className={`text-xs ${form.watch('type') === "article" ? "text-slate-300" : "text-slate-500"}`}>
                      Add an article URL
                    </span>
                  </div>
                </Button>
                <Button
                  type="button"
                  variant={form.watch('type') === "company" ? "default" : "outline"}
                  className={`justify-start h-auto py-3 px-4 border-2 ${
                    form.watch('type') === "company" 
                      ? "border-slate-900 bg-slate-900 text-white" 
                      : "border-slate-200 hover:border-slate-900 hover:bg-slate-50"
                  }`}
                  onClick={() => handleTypeSelect("company")}
                >
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Company</span>
                    <span className={`text-xs ${form.watch('type') === "company" ? "text-slate-300" : "text-slate-500"}`}>
                      Add a company URL
                    </span>
                  </div>
                </Button>
                <Button
                  type="button"
                  variant={form.watch('type') === "note" ? "default" : "outline"}
                  className={`justify-start h-auto py-3 px-4 border-2 ${
                    form.watch('type') === "note" 
                      ? "border-slate-900 bg-slate-900 text-white" 
                      : "border-slate-200 hover:border-slate-900 hover:bg-slate-50"
                  }`}
                  onClick={() => handleTypeSelect("note")}
                >
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Note</span>
                    <span className={`text-xs ${form.watch('type') === "note" ? "text-slate-300" : "text-slate-500"}`}>
                      Add a personal note
                    </span>
                  </div>
                </Button>
              </div>
              </div>
            )}
            
            {/* Conditional form fields based on selected type */}
            {(
              <div className="space-y-4">
                {form.watch('type') === "article" && (
                  <FormField
                    control={form.control}
                    name="url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Article URL</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="https://example.com/interesting-article"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                        <p className="text-xs text-slate-500">
                          Enter the URL of the article you want to analyze and summarize
                        </p>
                      </FormItem>
                    )}
                  />
                )}
                
                {form.watch('type') === "company" && (
                  <FormField
                    control={form.control}
                    name="url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Website</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="https://example.com"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                        <p className="text-xs text-slate-500">
                          Enter the URL of the company website you want to research
                        </p>
                      </FormItem>
                    )}
                  />
                )}
                
                {form.watch('type') === "note" && (
                  <>
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Title (Optional)</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Give your note a title..."
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="text"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Note</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Write your thoughts here..."
                              className="min-h-32"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                          <p className="text-xs text-slate-500">
                            Your personal notes will be stored and can be searched later
                          </p>
                        </FormItem>
                      )}
                    />
                  </>
                )}
                
                <Button 
                  type="submit"
                  className="w-full bg-slate-900 hover:bg-slate-800"
                >
                  {isEditing 
                    ? 'Update Entry' 
                    : `Create ${form.watch('type').charAt(0).toUpperCase() + form.watch('type').slice(1)}`
                  }
                </Button>
              </div>
            )}
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
