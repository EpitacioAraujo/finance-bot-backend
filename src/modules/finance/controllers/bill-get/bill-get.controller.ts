import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { CurrentUser, CurrentUserGuard } from '@/shared/current-user';
import { BillGetService } from '@/modules/finance/services/bill-get/bill-get.service';
import { BillEntity } from '@/modules/finance/entities/bill.entity';

@Controller('bills')
@UseGuards(CurrentUserGuard)
export class BillGetController {
  constructor(private readonly service: BillGetService) {}

  @Get(':id')
  async exec(
    @CurrentUser() userId: string,
    @Param('id') id: string,
  ): Promise<BillEntity> {
    return this.service.exec({ userId, id });
  }
}
