import { Controller, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser, CurrentUserGuard } from '@/shared/current-user';
import { ConsolidatedPayUseCase } from '@/modules/finance/use-cases/consolidated-pay/consolidated-pay.use-case';
import { PaymentMethodCycleEntity } from '@/modules/finance/entities/payment-method-cycle.entity';

@Controller('consolidated')
@UseGuards(CurrentUserGuard)
export class ConsolidatedPayController {
  constructor(private readonly useCase: ConsolidatedPayUseCase) {}

  @Post(':cycleId/pay')
  async exec(
    @CurrentUser() userId: string,
    @Param('cycleId') cycleId: string,
  ): Promise<PaymentMethodCycleEntity> {
    return this.useCase.exec({ userId, cycleId });
  }
}
