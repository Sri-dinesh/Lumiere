import { Router } from 'express';
import { movieController } from '../movies/movie.controller.js';
import { showController } from '../shows/show.controller.js';
import { validateBody, validateQuery } from '../../middlewares/validate.middleware.js';
import { createMovieSchema, updateMovieSchema } from '../movies/movie.schema.js';
import { createShowSchema, listShowsQuerySchema } from '../shows/show.schema.js';

export const adminRouter = Router();

adminRouter.get('/probe', (_req, res) => {
  res.json({
    data: { message: 'admin access granted' },
    meta: { requestId: _req.requestId },
  });
});

// Admin Movie routes
adminRouter.post('/movies', validateBody(createMovieSchema), movieController.createMovie);
adminRouter.put('/movies/:id', validateBody(updateMovieSchema), movieController.updateMovie);
adminRouter.delete('/movies/:id', movieController.deleteMovie);

// Admin Show routes
adminRouter.get('/shows', validateQuery(listShowsQuerySchema), showController.listAdminShows);
adminRouter.post('/shows', validateBody(createShowSchema), showController.createShow);
adminRouter.get('/shows/:id/report', showController.getShowReport);
adminRouter.delete('/shows/:id', showController.deleteShow);
