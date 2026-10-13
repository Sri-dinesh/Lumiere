import type { Request, Response } from 'express';
import { movieService, MovieService } from './movie.service.js';
import type { CreateMovieInput, UpdateMovieInput, ListMoviesQuery } from './movie.schema.js';

export class MovieController {
  constructor(private readonly service: MovieService = movieService) {}

  listMovies = async (req: Request, res: Response) => {
    const query = req.query as unknown as ListMoviesQuery;
    const result = await this.service.listMovies(query);
    res.status(200).json({
      success: true,
      data: result.movies,
      pagination: result.pagination,
    });
  };

  getMovieDetail = async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const detail = await this.service.getMovieDetail(id);
    res.status(200).json({
      success: true,
      data: detail,
    });
  };

  createMovie = async (req: Request, res: Response) => {
    const body = req.body as CreateMovieInput;
    const movie = await this.service.createMovie(body);
    res.status(201).json({
      success: true,
      data: movie,
    });
  };

  updateMovie = async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const body = req.body as UpdateMovieInput;
    const movie = await this.service.updateMovie(id, body);
    res.status(200).json({
      success: true,
      data: movie,
    });
  };

  deleteMovie = async (req: Request, res: Response) => {
    const id = req.params.id as string;
    await this.service.deleteMovie(id);
    res.status(204).send();
  };
}

export const movieController = new MovieController();
