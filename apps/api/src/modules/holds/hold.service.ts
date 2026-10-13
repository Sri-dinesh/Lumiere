import { holdRepository, HoldRepository } from './hold.repository.js';
import { AppError } from '../../lib/errors.js';

export class HoldService {
  constructor(private readonly holdRepo: HoldRepository = holdRepository) {}

  async createHold(userId: string, showId: string, seatCodes: string[], requestKey?: string) {
    return this.holdRepo.createHold({
      userId,
      showId,
      seatCodes,
      requestKey,
    });
  }

  async releaseHold(holdId: string, userId: string, isAdmin: boolean) {
    await this.holdRepo.releaseHold(holdId, userId, isAdmin);
  }

  async getHoldById(holdId: string, userId: string, isAdmin: boolean) {
    const hold = await this.holdRepo.getHoldById(holdId);
    if (!hold) {
      throw AppError.notFound('Hold reservation not found');
    }

    if (!isAdmin && hold.userId !== userId) {
      throw AppError.forbidden('You are not authorized to view this hold reservation.');
    }

    return hold;
  }
}

export const holdService = new HoldService();
