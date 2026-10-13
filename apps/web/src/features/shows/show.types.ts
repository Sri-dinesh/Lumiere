export interface AdminShow {
  id: string;
  movieId: string;
  movieTitle: string;
  movieDurationMinutes: number;
  screenId: number;
  startsAt: string;
  endsAt: string;
  pricePaise: number;
  bookedCount: number;
  availableCount: number;
  totalSeats: number;
}

export interface ShowDetail {
  id: string;
  movieId: string;
  movieTitle: string;
  screenId: number;
  startsAt: string;
  endsAt: string;
  durationMinutesSnapshot: number;
  pricePaise: number;
  availableCount: number;
}

export interface CreateShowPayload {
  movieId: string;
  localDate: string; // YYYY-MM-DD
  localTime: string; // HH:mm
  pricePaise: number;
}

export interface ShowReportBooking {
  bookingId: string;
  customerName: string;
  customerEmail: string;
  totalPaise: number;
  bookedAt: string;
  seatCodes: string[];
}

export interface ShowReport {
  showId: string;
  movieTitle: string;
  screenId: number;
  startsAt: string;
  endsAt: string;
  pricePaise: number;
  totalSeats: number;
  bookedCount: number;
  occupancyPercent: number;
  simulatedRevenuePaise: number;
  bookings: ShowReportBooking[];
  seats: Array<{
    seatCode: string;
    row: string;
    seatNumber: number;
    status: 'AVAILABLE' | 'HELD' | 'BOOKED';
  }>;
}
