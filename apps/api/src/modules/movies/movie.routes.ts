import { Router } from 'express';
import { movieController } from './movie.controller.js';
import { validateQuery } from '../../middlewares/validate.middleware.js';
import { listMoviesQuerySchema } from './movie.schema.js';

export const movieRouter = Router();

// Public catalog routes
movieRouter.get('/', validateQuery(listMoviesQuerySchema), movieController.listMovies);
movieRouter.get('/:id', movieController.getMovieDetail);
