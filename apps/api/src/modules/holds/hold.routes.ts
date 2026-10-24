import { Router } from 'express';
import { holdController } from './hold.controller.js';
import { bookingController } from '../bookings/booking.controller.js';
import { requireAuth } from '../../middlewares/auth.middleware.js';
import { validateBody } from '../../middlewares/validate.middleware.js';
import { processPaymentSchema } from '../bookings/booking.schema.js';

export const holdRouter = Router();

// Customer hold management routes
holdRouter.get('/:id', requireAuth, holdController.getHold);
holdRouter.post('/:id/extend', requireAuth, holdController.extendHold);
holdRouter.delete('/:id', requireAuth, holdController.releaseHold);

// Mock payment processing and booking creation
holdRouter.post(
  '/:id/payment',
  requireAuth,
  validateBody(processPaymentSchema),
  bookingController.processPayment,
);
