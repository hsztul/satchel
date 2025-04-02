import { prisma } from '@/lib/db';
import { ConnectionFrom, Entry } from '@prisma/client';

// Define proper return types including relations
type ConnectionWithToEntry = ConnectionFrom & {
  toEntry: Entry;
};

type ConnectionWithFromEntry = ConnectionFrom & {
  fromEntry: Entry;
};

export class ConnectionService {
  // Create a connection between two entries
  async createConnection(
    fromEntryId: string,
    toEntryId: string,
    userId: string,
    data: {
      strength?: number;
      description?: string;
      aiGenerated?: boolean;
    } = {}
  ): Promise<ConnectionFrom | null> {
    // First verify both entries exist and belong to the user
    const [fromEntry, toEntry] = await Promise.all([
      prisma.entry.findFirst({
        where: { id: fromEntryId, userId },
      }),
      prisma.entry.findFirst({
        where: { id: toEntryId, userId },
      }),
    ]);

    if (!fromEntry || !toEntry) {
      return null;
    }

    return prisma.$transaction(async (tx) => {
      // Create the "from" connection
      const connection = await tx.connectionFrom.upsert({
        where: {
          fromEntryId_toEntryId: {
            fromEntryId,
            toEntryId,
          },
        },
        update: {
          strength: data.strength ?? 1,
          description: data.description,
          aiGenerated: data.aiGenerated ?? false,
        },
        create: {
          fromEntryId,
          toEntryId,
          strength: data.strength ?? 1,
          description: data.description,
          aiGenerated: data.aiGenerated ?? false,
        },
      });

      // Create the corresponding "to" connection to maintain the bidirectional relationship
      await tx.connectionTo.upsert({
        where: {
          fromEntryId_toEntryId: {
            fromEntryId,
            toEntryId,
          },
        },
        update: {
          strength: data.strength ?? 1,
          description: data.description,
          aiGenerated: data.aiGenerated ?? false,
        },
        create: {
          fromEntryId,
          toEntryId,
          strength: data.strength ?? 1,
          description: data.description,
          aiGenerated: data.aiGenerated ?? false,
        },
      });

      return connection;
    });
  }

  // Get all connections for an entry (both incoming and outgoing)
  async getEntryConnections(entryId: string, userId: string): Promise<{
    outgoing: ConnectionWithToEntry[];
    incoming: ConnectionWithFromEntry[];
  }> {
    // Verify the entry exists and belongs to the user
    const entry = await prisma.entry.findFirst({
      where: { id: entryId, userId },
    });

    if (!entry) {
      return { outgoing: [], incoming: [] };
    }

    // Get outgoing connections (where this entry is the source)
    const outgoingConnections = await prisma.connectionFrom.findMany({
      where: { fromEntryId: entryId },
    });
    
    const outgoing = await Promise.all(
      outgoingConnections.map(async (conn) => {
        const toEntry = await prisma.entry.findUnique({
          where: { id: conn.toEntryId }
        });
        return { ...conn, toEntry } as ConnectionWithToEntry;
      })
    );

    // Get incoming connections (where this entry is the target)
    const incomingConnections = await prisma.connectionFrom.findMany({
      where: { toEntryId: entryId },
    });
    
    const incoming = await Promise.all(
      incomingConnections.map(async (conn) => {
        const fromEntry = await prisma.entry.findUnique({
          where: { id: conn.fromEntryId }
        });
        return { ...conn, fromEntry } as ConnectionWithFromEntry;
      })
    );

    return { outgoing, incoming };
  }

  // Delete a connection between two entries
  async deleteConnection(
    fromEntryId: string,
    toEntryId: string,
    userId: string
  ): Promise<boolean> {
    // First verify both entries exist and belong to the user
    const [fromEntry, toEntry] = await Promise.all([
      prisma.entry.findFirst({
        where: { id: fromEntryId, userId },
      }),
      prisma.entry.findFirst({
        where: { id: toEntryId, userId },
      }),
    ]);

    if (!fromEntry || !toEntry) {
      return false;
    }

    try {
      await prisma.$transaction([
        // Delete the "from" connection
        prisma.connectionFrom.delete({
          where: {
            fromEntryId_toEntryId: {
              fromEntryId,
              toEntryId,
            },
          },
        }),
        // Delete the corresponding "to" connection
        prisma.connectionTo.delete({
          where: {
            fromEntryId_toEntryId: {
              fromEntryId,
              toEntryId,
            },
          },
        }),
      ]);
      return true;
    } catch (error) {
      console.error('Error deleting connection:', error);
      return false;
    }
  }

  // Get related entries based on tags or other criteria
  async getSuggestedConnections(entryId: string, userId: string, limit = 10): Promise<Entry[]> {
    // Verify the entry exists and belongs to the user
    const entry = await prisma.entry.findFirst({
      where: { id: entryId, userId },
      include: {
        tags: true,
      },
    });

    if (!entry) {
      return [];
    }

    // Get tag IDs from the entry
    const tagIds = entry.tags.map((tag) => tag.id);

    if (tagIds.length === 0) {
      // If no tags, get the most recent entries by the same user
      return prisma.entry.findMany({
        where: {
          userId,
          id: { not: entryId }, // Exclude the current entry
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });
    }

    // Find entries with matching tags
    return prisma.entry.findMany({
      where: {
        userId,
        id: { not: entryId }, // Exclude the current entry
        tags: {
          some: {
            id: { in: tagIds },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
