import { Controller, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser, CurrentUserGuard } from '@/shared/current-user';
import { TranchePayService } from '@/modules/finance/services/tranche-pay/tranche-pay.service';
import { TransactionTrancheEntity } from '@/modules/finance/entities/transaction-tranche.entity';

@Controller('tranches')
@UseGuards(CurrentUserGuard)
export class TranchePayController {
  constructor(private readonly service: TranchePayService) {}

  @Post(':id/pay')
  async exec(
    @CurrentUser() userId: string,
    @Param('id') trancheId: string,
  ): Promise<TransactionTrancheEntity> {
    return this.service.exec({ userId, trancheId });
  }
}
