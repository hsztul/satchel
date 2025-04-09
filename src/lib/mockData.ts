import { Entry } from "@/types";

// Mock data for entries
// Using a function to ensure each import gets a fresh copy of the data
export const getMockEntries = (): Entry[] => [

  {
    id: "1",
    userId: "user-1",
    type: "article",
    url: "https://example.com/article",
    processingState: "completed",
    createdAt: new Date("2025-04-01").toISOString(),
    updatedAt: new Date("2025-04-01").toISOString(),
    metadata: {
      title: "The Future of AI",
      summary: "This article discusses the future of AI technology.",
      keyPoints: ["AI is evolving rapidly", "Ethics are important"],
      author: "Jane Doe",
      publishedDate: "2025-03-15"
    }
  },
  {
    id: "2",
    userId: "user-1",
    type: "company",
    url: "https://example.com/company",
    processingState: "processing",
    processingProgress: 50,
    createdAt: new Date("2025-04-02").toISOString(),
    updatedAt: new Date("2025-04-02").toISOString(),
    metadata: {
      companyName: "Acme Corp",
      industry: "Technology",
      summary: "Acme Corp is a leading technology company."
    }
  },
  {
    id: "3",
    userId: "user-1",
    type: "note",
    processingState: "started",
    processingProgress: 10,
    createdAt: new Date("2025-04-03").toISOString(),
    updatedAt: new Date("2025-04-03").toISOString(),
    metadata: {
      title: "Ideas for new startup",
      text: "Here are some ideas for a new startup..."
    }
  },
];
