import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { CurrentUser, CurrentUserGuard } from '@/shared/current-user';
import { TransactionGetService } from '@/modules/finance/services/transaction-get/transaction-get.service';
import { TransactionView } from '@/modules/finance/services/transaction-list/transaction-list.service';

@Controller('transactions')
@UseGuards(CurrentUserGuard)
export class TransactionGetController {
  constructor(private readonly service: TransactionGetService) {}

  @Get(':id')
  async exec(
    @CurrentUser() userId: string,
    @Param('id') id: string,
  ): Promise<TransactionView> {
    return this.service.exec({ userId, id });
  }
}
