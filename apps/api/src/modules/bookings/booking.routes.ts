import { Router } from 'express';
import { bookingController } from './booking.controller.js';
import { requireAuth } from '../../middlewares/auth.middleware.js';

export const bookingRouter = Router();

// All customer booking routes require authentication
bookingRouter.use(requireAuth);

bookingRouter.get('/', bookingController.listUserBookings);
bookingRouter.get('/me', bookingController.listUserBookings);
bookingRouter.get('/:id', bookingController.getBooking);
bookingRouter.delete('/:id', bookingController.cancelBooking);
bookingRouter.post('/:id/cancel', bookingController.cancelBooking);
