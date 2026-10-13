import { CINEMA_SEAT_ROWS, CINEMA_SEATS_PER_ROW } from '../../config/constants.js';

export interface ShowSeatInsert {
  showId: string;
  seatCode: string;
  rowLabel: string;
  seatNumber: number;
}

/**
 * Generates the deterministic 80 seat records (A1..H10) for a given show.
 */
export function generate80SeatRecords(showId: string): ShowSeatInsert[] {
  const seats: ShowSeatInsert[] = [];

  for (const row of CINEMA_SEAT_ROWS) {
    for (let num = 1; num <= CINEMA_SEATS_PER_ROW; num++) {
      seats.push({
        showId,
        seatCode: `${row}${num}`,
        rowLabel: row,
        seatNumber: num,
      });
    }
  }

  return seats;
}
