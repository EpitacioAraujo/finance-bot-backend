import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { CurrentUser, CurrentUserGuard } from '@/shared/current-user';
import {
  ConsolidatedItemView,
  ConsolidatedItemsService,
} from '@/modules/finance/services/consolidated-items/consolidated-items.service';

@Controller('consolidated')
@UseGuards(CurrentUserGuard)
export class ConsolidatedItemsController {
  constructor(private readonly service: ConsolidatedItemsService) {}

  @Get(':cycleId/items')
  async exec(
    @CurrentUser() userId: string,
    @Param('cycleId') cycleId: string,
  ): Promise<ConsolidatedItemView[]> {
    return this.service.exec({ userId, cycleId });
  }
}
