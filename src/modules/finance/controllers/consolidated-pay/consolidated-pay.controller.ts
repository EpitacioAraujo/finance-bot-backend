import { Controller, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser, CurrentUserGuard } from '@/shared/current-user';
import { ConsolidatedPayService } from '@/modules/finance/services/consolidated-pay/consolidated-pay.service';
import { PaymentMethodCycleEntity } from '@/modules/finance/entities/payment-method-cycle.entity';

@Controller('consolidated')
@UseGuards(CurrentUserGuard)
export class ConsolidatedPayController {
  constructor(private readonly service: ConsolidatedPayService) {}

  @Post(':cycleId/pay')
  async exec(
    @CurrentUser() userId: string,
    @Param('cycleId') cycleId: string,
  ): Promise<PaymentMethodCycleEntity> {
    return this.service.exec({ userId, cycleId });
  }
}
