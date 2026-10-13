import type { Request, Response } from 'express';
import { holdService, HoldService } from './hold.service.js';
import type { CreateHoldInput } from './hold.schema.js';

export class HoldController {
  constructor(private readonly service: HoldService = holdService) {}

  createHold = async (req: Request, res: Response) => {
    const showId = req.params.id as string;
    const body = req.body as CreateHoldInput;
    const userId = req.auth!.userId;
    const requestKey = req.headers['idempotency-key'] as string | undefined;

    const hold = await this.service.createHold(userId, showId, body.seatCodes, requestKey);
    res.status(201).json({
      success: true,
      data: hold,
    });
  };

  releaseHold = async (req: Request, res: Response) => {
    const holdId = req.params.id as string;
    const userId = req.auth!.userId;
    const isAdmin = req.auth!.role === 'ADMIN';

    await this.service.releaseHold(holdId, userId, isAdmin);
    res.status(204).send();
  };

  getHold = async (req: Request, res: Response) => {
    const holdId = req.params.id as string;
    const userId = req.auth!.userId;
    const isAdmin = req.auth!.role === 'ADMIN';

    const hold = await this.service.getHoldById(holdId, userId, isAdmin);
    res.status(200).json({
      success: true,
      data: hold,
    });
  };
}

export const holdController = new HoldController();
