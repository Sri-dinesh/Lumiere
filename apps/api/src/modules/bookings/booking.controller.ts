import type { Request, Response } from 'express';
import { bookingService, BookingService } from './booking.service.js';
import type { ProcessPaymentInput } from './booking.schema.js';

export class BookingController {
  constructor(private readonly service: BookingService = bookingService) {}

  processPayment = async (req: Request, res: Response) => {
    const holdId = req.params.id as string;
    const userId = req.auth!.userId;
    const body = req.body as ProcessPaymentInput;

    const result = await this.service.processPayment({
      holdId,
      userId,
      outcome: body.outcome,
      paymentAction: body.paymentAction,
      paymentReference: body.paymentReference,
    });

    const statusCode =
      ('status' in result && result.status === 'FAILED') ||
      ('isIdempotentReplay' in result && result.isIdempotentReplay)
        ? 200
        : 201;

    res.status(statusCode).json({
      success: true,
      data: result,
    });
  };

  listUserBookings = async (req: Request, res: Response) => {
    const userId = req.auth!.userId;
    const bookings = await this.service.listUserBookings(userId);
    res.status(200).json({
      success: true,
      data: bookings,
    });
  };

  getBooking = async (req: Request, res: Response) => {
    const bookingId = req.params.id as string;
    const userId = req.auth!.userId;
    const isAdmin = req.auth!.role === 'ADMIN';

    const booking = await this.service.getBookingById(bookingId, userId, isAdmin);
    res.status(200).json({
      success: true,
      data: booking,
    });
  };

  cancelBooking = async (req: Request, res: Response) => {
    const bookingId = req.params.id as string;
    const userId = req.auth!.userId;
    const isAdmin = req.auth!.role === 'ADMIN';

    const result = await this.service.cancelBooking(bookingId, userId, isAdmin);
    res.status(200).json({
      success: true,
      data: result,
    });
  };
}

export const bookingController = new BookingController();
