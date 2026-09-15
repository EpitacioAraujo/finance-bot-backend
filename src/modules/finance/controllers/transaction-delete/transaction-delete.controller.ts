import { Controller, Delete, HttpCode, Param, UseGuards } from '@nestjs/common';
import { CurrentUser, CurrentUserGuard } from '@/shared/current-user';
import { TransactionDeleteService } from '@/modules/finance/services/transaction-delete/transaction-delete.service';

@Controller('transactions')
@UseGuards(CurrentUserGuard)
export class TransactionDeleteController {
  constructor(private readonly service: TransactionDeleteService) {}

  @Delete(':id')
  @HttpCode(204)
  async exec(
    @CurrentUser() userId: string,
    @Param('id') id: string,
  ): Promise<void> {
    await this.service.exec({ userId, ids: [id] });
  }
}
