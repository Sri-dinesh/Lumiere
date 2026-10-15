import { useState, useEffect, useRef } from 'react';
import type { SeatMapResponse } from './seat.types.js';

export type SSEConnectionStatus = 'connecting' | 'connected' | 'disconnected';

export interface UseSeatStreamOptions {
  onSeatMapUpdate?: (seatMap: SeatMapResponse) => void;
}

export function useSeatStream(showId: string | undefined, options?: UseSeatStreamOptions) {
  const [status, setStatus] = useState<SSEConnectionStatus>('connecting');
  const onUpdateRef = useRef(options?.onSeatMapUpdate);
  onUpdateRef.current = options?.onSeatMapUpdate;

  useEffect(() => {
    if (!showId) {
      setStatus('disconnected');
      return;
    }

    setStatus('connecting');
    const eventSource = new EventSource(`/api/v1/shows/${showId}/events`, {
      withCredentials: true,
    });

    eventSource.addEventListener('open', () => {
      setStatus('connected');
    });

    eventSource.addEventListener('seat_map_update', (event) => {
      try {
        const data = JSON.parse(event.data) as SeatMapResponse;
        if (onUpdateRef.current) {
          onUpdateRef.current(data);
        }
      } catch (err) {
        console.error('Failed to parse real-time seat update event:', err);
      }
    });

    eventSource.addEventListener('error', () => {
      setStatus('disconnected');
    });

    return () => {
      eventSource.close();
      setStatus('disconnected');
    };
  }, [showId]);

  return {
    status,
    isLive: status === 'connected',
  };
}
