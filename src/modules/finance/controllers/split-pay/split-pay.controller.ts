import { Controller, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser, CurrentUserGuard } from '@/shared/current-user';
import { SplitPayService } from '@/modules/finance/services/split-pay/split-pay.service';
import { TransactionSplitEntity } from '@/modules/finance/entities/transaction-split.entity';

@Controller('splits')
@UseGuards(CurrentUserGuard)
export class SplitPayController {
  constructor(private readonly service: SplitPayService) {}

  @Post(':id/pay')
  async exec(
    @CurrentUser() userId: string,
    @Param('id') splitId: string,
  ): Promise<TransactionSplitEntity> {
    return this.service.exec({ userId, splitId });
  }
}
