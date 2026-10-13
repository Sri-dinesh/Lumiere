import { Router } from 'express';
import { showController } from './show.controller.js';
import { holdController } from '../holds/hold.controller.js';
import { requireAuth } from '../../middlewares/auth.middleware.js';
import { validateBody } from '../../middlewares/validate.middleware.js';
import { createHoldSchema } from '../holds/hold.schema.js';

export const showRouter = Router();

// Public / customer show routes
showRouter.get('/:id', showController.getShow);
showRouter.get('/:id/seats', showController.getShowSeats);

// Customer hold reservation route (requires authentication & valid seat selection)
showRouter.post(
  '/:id/holds',
  requireAuth,
  validateBody(createHoldSchema),
  holdController.createHold,
);
