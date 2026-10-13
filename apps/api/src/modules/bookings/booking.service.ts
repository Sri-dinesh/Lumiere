import { bookingRepository, BookingRepository } from './booking.repository.js';
import { AppError } from '../../lib/errors.js';

export class BookingService {
  constructor(private readonly bookingRepo: BookingRepository = bookingRepository) {}

  async processPayment(params: {
    holdId: string;
    userId: string;
    outcome?: 'success' | 'failure';
    paymentAction?: 'CONFIRM' | 'DECLINE';
    paymentReference?: string;
  }) {
    return this.bookingRepo.processPayment(params);
  }

  async listUserBookings(userId: string) {
    return this.bookingRepo.listUserBookings(userId);
  }

  async getBookingById(bookingId: string, userId: string, isAdmin: boolean) {
    const booking = await this.bookingRepo.getBookingById(bookingId);
    if (!booking) {
      throw AppError.notFound('Booking not found');
    }

    if (!isAdmin && booking.userId !== userId) {
      throw AppError.forbidden('You are not authorized to access this booking ticket.');
    }

    return booking;
  }

  async cancelBooking(bookingId: string, userId: string, isAdmin: boolean) {
    return this.bookingRepo.cancelBooking(bookingId, userId, isAdmin);
  }
}

export const bookingService = new BookingService();
