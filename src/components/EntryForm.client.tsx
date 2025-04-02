"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

// Define the form schema with zod
const formSchema = z.object({
  type: z.enum(["article", "company", "note"], {
    required_error: "Please select an entry type.",
  }),
  title: z.string().min(2, {
    message: "Title must be at least 2 characters.",
  }),
  url: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal('')),
  content: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function EntryForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  // Initialize form with react-hook-form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: "article",
      title: "",
      url: "",
      content: "",
    },
  });

  // Handle form submission
  async function onSubmit(values: FormValues) {
    setLoading(true);
    try {
      // In a real implementation, we would call an API to save the entry
      console.log("Form values:", values);
      
      // For now, just simulate a successful save
      setTimeout(() => {
        router.push("/entries");
      }, 1000);
    } catch (error) {
      console.error("Error saving entry:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Entry Type</FormLabel>
              <div className="grid grid-cols-3 gap-3">
                {['article', 'company', 'note'].map((type) => (
                  <div
                    key={type}
                    className={`border-2 rounded-md p-3 flex flex-col items-center cursor-pointer ${
                      field.value === type 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-blue-500 hover:bg-blue-50'
                    }`}
                    onClick={() => field.onChange(type)}
                  >
                    <span className="capitalize text-sm font-medium">{type}</span>
                  </div>
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="Enter title" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {form.watch("type") !== "note" && (
          <FormField
            control={form.control}
            name="url"
            render={({ field }) => (
              <FormItem>
                <FormLabel>URL</FormLabel>
                <FormControl>
                  <Input placeholder="https://" {...field} />
                </FormControl>
                <FormDescription>
                  Enter the URL for the article or company website.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        
        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {form.watch("type") === "note" ? "Note Content" : "Description"}
              </FormLabel>
              <FormControl>
                <textarea
                  className="w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder={form.watch("type") === "note" ? "Enter your thoughts..." : "Add a description..."}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-3">
          <Button variant="outline" asChild>
            <Link href="/entries">Cancel</Link>
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Saving..." : "Save Entry"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
