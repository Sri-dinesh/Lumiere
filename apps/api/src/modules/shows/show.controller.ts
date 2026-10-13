import type { Request, Response } from 'express';
import { showService, ShowService } from './show.service.js';
import type { CreateShowInput, ListShowsQuery } from './show.schema.js';

export class ShowController {
  constructor(private readonly service: ShowService = showService) {}

  getShow = async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const show = await this.service.getShowById(id);
    res.status(200).json({
      success: true,
      data: show,
    });
  };

  getShowSeats = async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const currentUserId = req.auth?.userId;
    const seatMap = await this.service.getShowSeatMap(id, currentUserId);
    res.status(200).json({
      success: true,
      data: seatMap,
    });
  };

  listAdminShows = async (req: Request, res: Response) => {
    const query = req.query as unknown as ListShowsQuery;
    const shows = await this.service.listAdminShows(query);
    res.status(200).json({
      success: true,
      data: shows,
    });
  };

  createShow = async (req: Request, res: Response) => {
    const body = req.body as CreateShowInput;
    const show = await this.service.createShow(body);
    res.status(201).json({
      success: true,
      data: show,
    });
  };

  deleteShow = async (req: Request, res: Response) => {
    const id = req.params.id as string;
    await this.service.deleteShow(id);
    res.status(204).send();
  };

  getShowReport = async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const report = await this.service.getShowReport(id);
    res.status(200).json({
      success: true,
      data: report,
    });
  };
}

export const showController = new ShowController();
