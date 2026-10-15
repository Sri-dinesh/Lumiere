import { randomUUID } from 'crypto';
import type { Request, Response } from 'express';
import { showRepository, ShowRepository } from './show.repository.js';
import { AppError } from '../../lib/errors.js';

interface ShowEventClient {
  id: string;
  showId: string;
  userId?: string;
  res: Response;
}

export class ShowEventsManager {
  private clients = new Map<string, Set<ShowEventClient>>();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(private readonly showRepo: ShowRepository = showRepository) {
    this.startHeartbeat();
  }

  private startHeartbeat() {
    if (this.heartbeatInterval) return;
    this.heartbeatInterval = setInterval(() => {
      for (const clientSet of this.clients.values()) {
        for (const client of clientSet) {
          try {
            client.res.write(': ping\n\n');
          } catch {
            // Client closed, will be removed on close handler
          }
        }
      }
    }, 15000);

    // Prevent heartbeat from holding Node.js process open in tests
    if (this.heartbeatInterval.unref) {
      this.heartbeatInterval.unref();
    }
  }

  /**
   * Subscribe an HTTP client to Server-Sent Events for a specific show's seat map.
   */
  async subscribe(showId: string, req: Request, res: Response): Promise<void> {
    const show = await this.showRepo.getShowById(showId);
    if (!show) {
      throw AppError.notFound('Show not found');
    }

    const userId = req.auth?.userId;
    const clientId = randomUUID();

    // Set standard SSE response headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.flushHeaders?.();

    const client: ShowEventClient = {
      id: clientId,
      showId,
      userId,
      res,
    };

    if (!this.clients.has(showId)) {
      this.clients.set(showId, new Set());
    }
    this.clients.get(showId)!.add(client);

    // Send initial connection event
    res.write(
      `event: connected\ndata: ${JSON.stringify({ clientId, showId, timestamp: new Date().toISOString() })}\n\n`,
    );

    // Send immediate seat map snapshot tailored for this user/guest
    try {
      const seatMap = await this.showRepo.getShowSeatMap(showId, userId);
      if (seatMap) {
        res.write(`event: seat_map_update\ndata: ${JSON.stringify(seatMap)}\n\n`);
      }
    } catch {
      // Non-fatal if initial payload fails; client can still receive broadcasts
    }

    // Clean up when client disconnects
    const cleanup = () => {
      const showClients = this.clients.get(showId);
      if (showClients) {
        showClients.delete(client);
        if (showClients.size === 0) {
          this.clients.delete(showId);
        }
      }
    };

    req.on('close', cleanup);
    res.on('close', cleanup);
  }

  /**
   * Broadcast real-time seat map changes to all active viewers of a show.
   */
  async broadcastSeatMapUpdate(showId: string): Promise<void> {
    const showClients = this.clients.get(showId);
    if (!showClients || showClients.size === 0) {
      return;
    }

    // Collect distinct userIds (including undefined for anonymous guests)
    const distinctUserIds = new Set<string | undefined>();
    for (const client of showClients) {
      distinctUserIds.add(client.userId);
    }

    // Fetch seat map once per distinct viewer perspective
    const seatMapCache = new Map<string | undefined, any>();
    for (const uid of distinctUserIds) {
      try {
        const seatMap = await this.showRepo.getShowSeatMap(showId, uid);
        seatMapCache.set(uid, seatMap);
      } catch {
        // Log or handle database fetch error during broadcast
      }
    }

    // Write event to each connected client
    for (const client of showClients) {
      try {
        const seatMap = seatMapCache.get(client.userId);
        if (seatMap) {
          client.res.write(`event: seat_map_update\ndata: ${JSON.stringify(seatMap)}\n\n`);
        }
      } catch {
        // Socket closed
      }
    }
  }

  /**
   * Returns current active connection count for a show (useful in monitoring/testing).
   */
  getSubscriberCount(showId: string): number {
    return this.clients.get(showId)?.size ?? 0;
  }
}

export const showEventsManager = new ShowEventsManager();
